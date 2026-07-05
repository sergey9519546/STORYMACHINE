// Extracted from the former monolithic test.ts (audit M2.1 — split for maintainability).
// character-arcPass revision-rule tests. Shared imports/helpers below are duplicated verbatim across every split
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


  // ── Wave 153: Character-arc pass enhancements ─────────────────────────────
  describe('Wave 153 — characterArcPass: arc monotone, late introduction, whiplash', async () => {
    const baseStructure = {
      actPosition: 'act2b' as const, completionPercent: 60, totalClockPressure: 5,
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

    it('characterArcPass detects ARC_EMOTIONAL_MONOTONE when 90%+ scenes same register', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // All 8 scenes neutral → 100% monotone
      const records = Array.from({ length: 8 }, (_, i) => makeRec(i, { emotionalShift: 'neutral' }));
      const fountain = Array.from({ length: 8 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join('');
      const result = await characterArcPass({
        fountain, original: fountain,
        records: records as any, structure: baseStructure as any, annotations: [], approvedSpans: [],
      });
      const monotone = result.issues.filter(i => i.rule === 'ARC_EMOTIONAL_MONOTONE');
      assert.ok(monotone.length >= 1, 'Should detect ARC_EMOTIONAL_MONOTONE when emotional register never varies');
      assert.ok(monotone[0].severity === 'major');
    });

    it('characterArcPass does NOT fire ARC_EMOTIONAL_MONOTONE when register varies', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      const shifts = ['positive', 'negative', 'neutral', 'positive', 'negative', 'neutral', 'positive', 'negative'];
      const records = Array.from({ length: 8 }, (_, i) => makeRec(i, { emotionalShift: shifts[i] }));
      const fountain = Array.from({ length: 8 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join('');
      const result = await characterArcPass({
        fountain, original: fountain,
        records: records as any, structure: baseStructure as any, annotations: [], approvedSpans: [],
      });
      const monotone = result.issues.filter(i => i.rule === 'ARC_EMOTIONAL_MONOTONE');
      assert.ok(monotone.length === 0, 'Should NOT fire when emotional register varies');
    });

    it('characterArcPass detects CHARACTER_LATE_INTRODUCTION for major char past midpoint', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // 10 scenes (midpoint=5). LATECOMER appears 5 times, only from Scene 6 onward.
      let fountain = '';
      for (let i = 0; i < 10; i++) {
        fountain += `INT. SC${i} - DAY\n`;
        if (i < 6) {
          fountain += `ALICE\nHello there.\n\n`;
        } else {
          fountain += `LATECOMER\nI have arrived.\n\nALICE\nWho are you.\n\n`;
        }
      }
      const records = Array.from({ length: 10 }, (_, i) => makeRec(i));
      const result = await characterArcPass({
        fountain, original: fountain,
        records: records as any, structure: baseStructure as any, annotations: [], approvedSpans: [],
      });
      const late = result.issues.filter(i => i.rule === 'CHARACTER_LATE_INTRODUCTION');
      assert.ok(late.length >= 1, 'Should detect CHARACTER_LATE_INTRODUCTION for major character introduced past midpoint');
      assert.ok(late[0].severity === 'major');
    });

    it('characterArcPass detects EMOTIONAL_WHIPLASH for rapid polarity alternation', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // pos neg pos neg pos neg → 5 alternations, fires at 3
      const shifts = ['positive', 'negative', 'positive', 'negative', 'positive', 'negative'];
      const records = Array.from({ length: 6 }, (_, i) => makeRec(i, { emotionalShift: shifts[i] }));
      const fountain = Array.from({ length: 6 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join('');
      const result = await characterArcPass({
        fountain, original: fountain,
        records: records as any, structure: baseStructure as any, annotations: [], approvedSpans: [],
      });
      const whiplash = result.issues.filter(i => i.rule === 'EMOTIONAL_WHIPLASH');
      assert.ok(whiplash.length >= 1, 'Should detect EMOTIONAL_WHIPLASH for 3+ polarity alternations');
      assert.ok(whiplash[0].severity === 'minor');
    });
  });


  // ── Wave 168: Character arc pass enhancements ──────────────────────────────
  describe('Wave 168 — characterArcPass: relational symmetry, arc resolution, secondary void', async () => {
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
      revelationCount: 1, approachingClimax: false,
    };

    // ── RELATIONAL_SYMMETRY_ABSENT ────────────────────────────────────────────
    it('characterArcPass detects RELATIONAL_SYMMETRY_ABSENT when all shifts are positive', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // All 4 relationship shifts are positive
      const records = Array.from({ length: 6 }, (_, i) =>
        makeRec(i, {
          relationshipShifts: i < 4
            ? [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.5 }]
            : [],
        }),
      );
      const result = await characterArcPass({
        fountain: blankFountain(6), original: blankFountain(6),
        records: records as any, structure: baseStructure as any,
        annotations: [], approvedSpans: [],
      });
      const sym = result.issues.filter(i => i.rule === 'RELATIONAL_SYMMETRY_ABSENT');
      assert.ok(sym.length >= 1, `Expected RELATIONAL_SYMMETRY_ABSENT; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(sym[0].severity === 'major');
    });

    it('characterArcPass does NOT fire RELATIONAL_SYMMETRY_ABSENT when shifts go both directions', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // Mix of positive and negative shifts
      const records = [
        makeRec(0, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.5 }] }),
        makeRec(1, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -0.6 }] }),
        makeRec(2, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.3 }] }),
        makeRec(3, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -0.4 }] }),
        makeRec(4), makeRec(5),
      ];
      const result = await characterArcPass({
        fountain: blankFountain(6), original: blankFountain(6),
        records: records as any, structure: baseStructure as any,
        annotations: [], approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'RELATIONAL_SYMMETRY_ABSENT'),
        'Should NOT fire when shifts include both positive and negative amounts',
      );
    });

    // ── ARC_RESOLUTION_ABSENT ────────────────────────────────────────────────
    it('characterArcPass detects ARC_RESOLUTION_ABSENT when Act 2 struggles but Act 3 has no positive', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // 8 scenes; act2=scenes 2-5; act3=scenes 6-7
      // Act 2: 2 negative shifts; Act 3: all neutral
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, {
          emotionalShift: (i === 3 || i === 4) ? 'negative' : 'neutral',
        }),
      );
      const result = await characterArcPass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any, structure: baseStructure as any,
        annotations: [], approvedSpans: [],
      });
      const resolution = result.issues.filter(i => i.rule === 'ARC_RESOLUTION_ABSENT');
      assert.ok(resolution.length >= 1, `Expected ARC_RESOLUTION_ABSENT; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(resolution[0].severity === 'major');
    });

    it('characterArcPass does NOT fire ARC_RESOLUTION_ABSENT when Act 3 has a positive shift', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, {
          emotionalShift: (i === 3 || i === 4) ? 'negative' : (i === 7 ? 'positive' : 'neutral'),
        }),
      );
      const result = await characterArcPass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any, structure: baseStructure as any,
        annotations: [], approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'ARC_RESOLUTION_ABSENT'),
        'Should NOT fire when Act 3 contains at least one positive emotional shift',
      );
    });

    // ── SECONDARY_CHARACTER_VOID ─────────────────────────────────────────────
    it('characterArcPass detects SECONDARY_CHARACTER_VOID when 2+ secondaries have no arc', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // ALICE: 6 cues (protagonist); BOB: 4 cues; CAROL: 4 cues
      // Only ALICE appears in relationship shifts — BOB and CAROL are inert secondaries
      const fountainLines: string[] = ['INT. OFFICE - DAY', ''];
      for (let i = 0; i < 6; i++) fountainLines.push('ALICE', 'Hello.', '');
      for (let i = 0; i < 4; i++) fountainLines.push('BOB', 'Hi.', '');
      for (let i = 0; i < 4; i++) fountainLines.push('CAROL', 'Yes.', '');
      const fountain = fountainLines.join('\n');
      const records = Array.from({ length: 6 }, (_, i) =>
        makeRec(i, {
          relationshipShifts: i === 2
            ? [{ pairKey: 'alice|dave', dimension: 'affinity', amount: -0.5 }]
            : [],
        }),
      );
      const result = await characterArcPass({
        fountain, original: fountain,
        records: records as any, structure: baseStructure as any,
        annotations: [], approvedSpans: [],
      });
      const void_ = result.issues.filter(i => i.rule === 'SECONDARY_CHARACTER_VOID');
      assert.ok(void_.length >= 1, `Expected SECONDARY_CHARACTER_VOID; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(void_[0].severity === 'minor');
    });

    it('characterArcPass does NOT fire SECONDARY_CHARACTER_VOID when secondaries have relationship arcs', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      const fountainLines: string[] = ['INT. OFFICE - DAY', ''];
      for (let i = 0; i < 6; i++) fountainLines.push('ALICE', 'Hello.', '');
      for (let i = 0; i < 4; i++) fountainLines.push('BOB', 'Hi.', '');
      for (let i = 0; i < 4; i++) fountainLines.push('CAROL', 'Yes.', '');
      const fountain = fountainLines.join('\n');
      // BOB now has a shift (alice|bob) → only CAROL is inert → 1 inert secondary, doesn't fire
      const records = Array.from({ length: 6 }, (_, i) =>
        makeRec(i, {
          relationshipShifts: i === 2
            ? [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -0.5 }]
            : [],
        }),
      );
      const result = await characterArcPass({
        fountain, original: fountain,
        records: records as any, structure: baseStructure as any,
        annotations: [], approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'SECONDARY_CHARACTER_VOID'),
        'Should NOT fire when fewer than 2 secondary characters lack relationship arcs',
      );
    });
  });


  describe('Wave 182 — characterArcPass: arc stall in Act 2, secondary arc mirror, climax void', async () => {
    const makeRec = (idx: number, override: Partial<any> = {}): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: 'dialogue', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [],
      payoffSetupIds: [], visualBeats: [], relationshipShifts: [],
      ...override,
    });

    // ARC_STALL_IN_ACT2 — fires
    it('ARC_STALL_IN_ACT2 fires when all Act 2 scenes (25%-75%) are emotionally neutral', async () => {
      // n=10: act2 = indices 2-6 (floor(10*0.25)=2, floor(10*0.75)=7)
      const records = Array.from({ length: 10 }, (_, i) => makeRec(i, {
        emotionalShift: (i === 0 || i === 1 || i >= 7) ? 'positive' : 'neutral',
      }));
      const original = Array.from({ length: 10 }, (_, i) => `INT. SC${i} - DAY\n\nAction.\n\n`).join('\n');
      const result = await characterArcPass({ fountain: original, records, original, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(
        result.issues.some(i => i.rule === 'ARC_STALL_IN_ACT2'),
        `Expected ARC_STALL_IN_ACT2, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // ARC_STALL_IN_ACT2 — no-fire
    it('ARC_STALL_IN_ACT2 does not fire when Act 2 has an emotional beat', async () => {
      const records = Array.from({ length: 10 }, (_, i) => makeRec(i, {
        emotionalShift: i === 4 ? 'negative' : 'neutral',
      }));
      const original = Array.from({ length: 10 }, (_, i) => `INT. SC${i} - DAY\n\nAction.\n\n`).join('\n');
      const result = await characterArcPass({ fountain: original, records, original, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(
        !result.issues.some(i => i.rule === 'ARC_STALL_IN_ACT2'),
        `Expected no ARC_STALL_IN_ACT2, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // SECONDARY_ARC_MIRROR — fires
    it('SECONDARY_ARC_MIRROR fires when two secondaries share same-direction net arc', async () => {
      // alice|bob and alice|carol both positive → alice, bob, carol all have positive nets
      // dan has most cues (4) so is the protagonist proxy
      const records = Array.from({ length: 8 }, (_, i) => makeRec(i, {
        relationshipShifts: i < 4
          ? [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.5 },
             { pairKey: 'alice|carol', dimension: 'trust', amount: 0.4 }]
          : [],
      }));
      const fountain182 = ['INT. SCENE - DAY', 'DAN', 'Hello.', 'DAN', 'Hi.', 'DAN', 'Bye.',
        'DAN', 'Okay.', 'ALICE', 'Sure.', 'BOB', 'Right.', 'CAROL', 'Yes.'].join('\n');
      const result = await characterArcPass({ fountain: fountain182, records, original: fountain182, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(
        result.issues.some(i => i.rule === 'SECONDARY_ARC_MIRROR'),
        `Expected SECONDARY_ARC_MIRROR, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // SECONDARY_ARC_MIRROR — no-fire
    it('SECONDARY_ARC_MIRROR does not fire when secondaries have opposing arc directions', async () => {
      // alice net positive, carol net negative → opposite directions, no mirror
      const records = Array.from({ length: 8 }, (_, i) => makeRec(i, {
        relationshipShifts: i < 4
          ? [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.5 },
             { pairKey: 'carol|bob', dimension: 'trust', amount: -0.5 }]
          : [],
      }));
      const fountain182 = ['INT. SCENE - DAY', 'DAN', 'Hello.', 'DAN', 'Hi.', 'DAN', 'Bye.',
        'DAN', 'Okay.', 'ALICE', 'Sure.', 'BOB', 'Right.', 'CAROL', 'Yes.'].join('\n');
      const result = await characterArcPass({ fountain: fountain182, records, original: fountain182, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(
        !result.issues.some(i => i.rule === 'SECONDARY_ARC_MIRROR'),
        `Expected no SECONDARY_ARC_MIRROR, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // ARC_CLIMAX_VOID — fires
    it('ARC_CLIMAX_VOID fires when the climax scene is emotionally hollow', async () => {
      const records = Array.from({ length: 8 }, (_, i) => makeRec(i, {
        purpose: i === 6 ? 'climax' : 'dialogue',
        emotionalShift: 'neutral',
        relationshipShifts: [],
        revelation: null,
      }));
      const original = Array.from({ length: 8 }, (_, i) => `INT. SC${i} - DAY\n\nAction.\n\n`).join('\n');
      const result = await characterArcPass({ fountain: original, records, original, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(
        result.issues.some(i => i.rule === 'ARC_CLIMAX_VOID'),
        `Expected ARC_CLIMAX_VOID, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // ARC_CLIMAX_VOID — no-fire
    it('ARC_CLIMAX_VOID does not fire when the climax scene has emotional charge', async () => {
      const records = Array.from({ length: 8 }, (_, i) => makeRec(i, {
        purpose: i === 6 ? 'climax' : 'dialogue',
        emotionalShift: i === 6 ? 'positive' : 'neutral',
        relationshipShifts: [],
        revelation: null,
      }));
      const original = Array.from({ length: 8 }, (_, i) => `INT. SC${i} - DAY\n\nAction.\n\n`).join('\n');
      const result = await characterArcPass({ fountain: original, records, original, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(
        !result.issues.some(i => i.rule === 'ARC_CLIMAX_VOID'),
        `Expected no ARC_CLIMAX_VOID, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });
  });


  describe('Wave 228 — characterArcPass: protagonist untested socially, midpoint relational void, final-act character static', async () => {
    const makeRec228 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, dialogueHighlights: [],
      revelation: null, purpose: 'development', dramaticTurn: '',
      seededClueIds: [], payoffSetupIds: [], relationshipShifts: [],
      ...overrides,
    });

    it('ARC_PROTAGONIST_UNTESTED_SOCIALLY fires when protagonist has only positive relationship shifts', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // 8 records; ALICE appears most (8 cues). All her relationship shifts are positive.
      const fountain228a = [
        'INT. SC0 - DAY', 'ALICE', 'Hello.', 'ALICE', 'Yes.',
        'INT. SC1 - DAY', 'ALICE', 'Okay.', 'BOB', 'Sure.',
        'INT. SC2 - DAY', 'ALICE', 'Fine.', 'BOB', 'Good.',
        'INT. SC3 - DAY', 'ALICE', 'Thanks.', 'BOB', 'Always.',
        'INT. SC4 - DAY', 'ALICE', 'Great.', 'BOB', 'Indeed.',
        'INT. SC5 - DAY', 'ALICE', 'Right.', 'BOB', 'Right.',
        'INT. SC6 - DAY', 'ALICE', 'Done.', 'BOB', 'Done.',
        'INT. SC7 - DAY', 'ALICE', 'Farewell.', 'BOB', 'Farewell.',
      ].join('\n');
      const records228a = [
        makeRec228(0, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.4 }] }),
        makeRec228(1),
        makeRec228(2, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.3 }] }),
        makeRec228(3),
        makeRec228(4, { emotionalShift: 'positive' }),
        makeRec228(5, { emotionalShift: 'positive' }),
        makeRec228(6, { emotionalShift: 'positive' }),
        makeRec228(7, { emotionalShift: 'positive' }),
      ];
      const result = await characterArcPass({
        fountain: fountain228a, original: fountain228a,
        records: records228a,
        structure: { revelationCount: 0, completionPercent: 90, approachingClimax: false } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'ARC_PROTAGONIST_UNTESTED_SOCIALLY');
      assert.ok(match.length >= 1, `Expected ARC_PROTAGONIST_UNTESTED_SOCIALLY, got: ${JSON.stringify(result.issues.map((i:any)=>i.rule))}`);
    });

    it('ARC_PROTAGONIST_UNTESTED_SOCIALLY does NOT fire when protagonist has a negative shift', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      const fountain228b = [
        'INT. SC0 - DAY', 'ALICE', 'We begin.', 'BOB', 'Indeed.',
        'INT. SC1 - DAY', 'ALICE', 'Progress.', 'BOB', 'Good.',
        'INT. SC2 - DAY', 'ALICE', 'Alliance.', 'BOB', 'Confirmed.',
        'INT. SC3 - DAY', 'ALICE', 'Trouble.', 'BOB', 'Betrayal.',
        'INT. SC4 - DAY', 'ALICE', 'Crisis.', 'BOB', 'Gone.',
        'INT. SC5 - DAY', 'ALICE', 'Loss.', 'BOB', 'Away.',
        'INT. SC6 - DAY', 'ALICE', 'Recovery.', 'BOB', 'Distant.',
        'INT. SC7 - DAY', 'ALICE', 'Resolution.', 'BOB', 'Resolved.',
      ].join('\n');
      const records228b = [
        makeRec228(0, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.4 }] }),
        makeRec228(1),
        makeRec228(2, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.3 }] }),
        makeRec228(3, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: -0.5 }] }),
        makeRec228(4, { emotionalShift: 'negative' }),
        makeRec228(5),
        makeRec228(6),
        makeRec228(7, { emotionalShift: 'positive' }),
      ];
      const result = await characterArcPass({
        fountain: fountain228b, original: fountain228b,
        records: records228b,
        structure: { revelationCount: 1, completionPercent: 90, approachingClimax: false } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'ARC_PROTAGONIST_UNTESTED_SOCIALLY');
      assert.strictEqual(match.length, 0, 'Should NOT fire when protagonist has a negative relationship shift');
    });

    it('ARC_MIDPOINT_RELATIONAL_VOID fires when midpoint zone has no relationship shifts or revelations', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // 10 records; scenes 4–5 (40%–60%) are empty of relational dynamics
      const fountain228c = Array.from({ length: 10 }, (_, i) =>
        `INT. SC${i} - DAY\nALICE\nLine ${i}.\nBOB\nReply ${i}.`).join('\n');
      const records228c = Array.from({ length: 10 }, (_, i) =>
        makeRec228(i, {
          // place relationship shifts ONLY outside the 40%-60% midpoint zone (scenes 4-5)
          relationshipShifts: (i < 4 || i >= 6)
            ? [{ pairKey: 'alice|bob', dimension: 'trust', amount: i < 4 ? 0.3 : -0.3 }]
            : [],
          revelation: null,
        }),
      );
      const result = await characterArcPass({
        fountain: fountain228c, original: fountain228c,
        records: records228c,
        structure: { revelationCount: 0, completionPercent: 90, approachingClimax: false } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'ARC_MIDPOINT_RELATIONAL_VOID');
      assert.ok(match.length >= 1, `Expected ARC_MIDPOINT_RELATIONAL_VOID, got: ${JSON.stringify(result.issues.map((i:any)=>i.rule))}`);
    });

    it('ARC_MIDPOINT_RELATIONAL_VOID does NOT fire when midpoint has a revelation', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      const fountain228d = Array.from({ length: 10 }, (_, i) =>
        `INT. SC${i} - DAY\nALICE\nLine ${i}.\nBOB\nReply ${i}.`).join('\n');
      const records228d = Array.from({ length: 10 }, (_, i) =>
        makeRec228(i, {
          revelation: i === 4 ? 'The truth is revealed' : null,
          emotionalShift: i % 3 === 0 ? 'positive' : i % 3 === 1 ? 'negative' : 'neutral',
        }),
      );
      const result = await characterArcPass({
        fountain: fountain228d, original: fountain228d,
        records: records228d,
        structure: { revelationCount: 1, completionPercent: 90, approachingClimax: false } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'ARC_MIDPOINT_RELATIONAL_VOID');
      assert.strictEqual(match.length, 0, 'Should NOT fire when midpoint zone contains a revelation');
    });

    it('ARC_FINAL_ACT_CHARACTER_STATIC fires when Act 3 has no relationship shifts', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // 8 records; Act 3 = scenes 6–7 (75%+), but only 2 scenes — need 8 with act3 >= 3
      // Use 12 records so act3Start=9 and act3 has scenes 9,10,11 (3 scenes)
      const fountain228e = Array.from({ length: 12 }, (_, i) =>
        `INT. SC${i} - DAY\nALICE\nLine ${i}.\nBOB\nReply ${i}.`).join('\n');
      const records228e = Array.from({ length: 12 }, (_, i) =>
        makeRec228(i, {
          // relationship shifts only in Act 1 and 2 (scenes 0–8), none in Act 3 (9–11)
          relationshipShifts: i < 9
            ? [{ pairKey: 'alice|bob', dimension: 'trust', amount: i < 5 ? 0.3 : -0.3 }]
            : [],
          emotionalShift: i < 9 ? (i % 2 === 0 ? 'positive' : 'negative') : 'neutral',
        }),
      );
      const result = await characterArcPass({
        fountain: fountain228e, original: fountain228e,
        records: records228e,
        structure: { revelationCount: 1, completionPercent: 90, approachingClimax: false } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'ARC_FINAL_ACT_CHARACTER_STATIC');
      assert.ok(match.length >= 1, `Expected ARC_FINAL_ACT_CHARACTER_STATIC, got: ${JSON.stringify(result.issues.map((i:any)=>i.rule))}`);
    });

    it('ARC_FINAL_ACT_CHARACTER_STATIC does NOT fire when Act 3 has a relationship shift', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      const fountain228f = Array.from({ length: 12 }, (_, i) =>
        `INT. SC${i} - DAY\nALICE\nLine ${i}.\nBOB\nReply ${i}.`).join('\n');
      const records228f = Array.from({ length: 12 }, (_, i) =>
        makeRec228(i, {
          relationshipShifts: i === 10
            ? [{ pairKey: 'alice|bob', dimension: 'trust', amount: -0.5 }]
            : [],
          emotionalShift: i < 9 ? (i % 2 === 0 ? 'positive' : 'negative') : 'neutral',
          revelation: i === 9 ? 'Final truth' : null,
        }),
      );
      const result = await characterArcPass({
        fountain: fountain228f, original: fountain228f,
        records: records228f,
        structure: { revelationCount: 1, completionPercent: 90, approachingClimax: false } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'ARC_FINAL_ACT_CHARACTER_STATIC');
      assert.strictEqual(match.length, 0, 'Should NOT fire when Act 3 contains a relationship shift');
    });
  });


  describe('Wave 1163 — characterArcPass: arc positive-staging aftermath void, arc positive-dialogue-highlight aftermath void, arc negative-suspense aftermath void', async () => {
    const makeRec1163 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc1163 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('ARC_POSITIVE_STAGING_AFTERMATH_VOID fires when every positive-emotion scene is followed by two scenes with no heavily-staged scene', async () => {
      const recs1163a = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1163(i, { emotionalShift: 'positive' });
        if (i === 8 || i === 9) return makeRec1163(i, { visualBeats: ['beat one', 'beat two'] });
        return makeRec1163(i);
      });
      const res = await runArc1163(recs1163a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_POSITIVE_STAGING_AFTERMATH_VOID'), 'ARC_POSITIVE_STAGING_AFTERMATH_VOID should fire');
    });

    it('ARC_POSITIVE_STAGING_AFTERMATH_VOID does not fire when a positive-emotion scene is followed by a heavily-staged scene within its window', async () => {
      const recs1163an = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1163(i, { emotionalShift: 'positive' });
        if (i === 1 || i === 9) return makeRec1163(i, { visualBeats: ['beat one', 'beat two'] });
        return makeRec1163(i);
      });
      const res = await runArc1163(recs1163an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_POSITIVE_STAGING_AFTERMATH_VOID'), 'ARC_POSITIVE_STAGING_AFTERMATH_VOID should not fire');
    });

    it('ARC_POSITIVE_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when every positive-emotion scene is followed by two scenes with no highlighted dialogue', async () => {
      const recs1163b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1163(i, { emotionalShift: 'positive' });
        if (i === 8 || i === 9) return makeRec1163(i, { dialogueHighlights: ['a memorable line'] });
        return makeRec1163(i);
      });
      const res = await runArc1163(recs1163b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_POSITIVE_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'ARC_POSITIVE_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    it('ARC_POSITIVE_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a positive-emotion scene is followed by highlighted dialogue within its window', async () => {
      const recs1163bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1163(i, { emotionalShift: 'positive' });
        if (i === 1 || i === 9) return makeRec1163(i, { dialogueHighlights: ['a memorable line'] });
        return makeRec1163(i);
      });
      const res = await runArc1163(recs1163bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_POSITIVE_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'ARC_POSITIVE_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });

    it('ARC_NEGATIVE_SUSPENSE_AFTERMATH_VOID fires when every negative-emotion scene is followed by two scenes with no suspense rise', async () => {
      const recs1163c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1163(i, { emotionalShift: 'negative' });
        if (i === 8 || i === 9) return makeRec1163(i, { suspenseDelta: 1 });
        return makeRec1163(i);
      });
      const res = await runArc1163(recs1163c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_NEGATIVE_SUSPENSE_AFTERMATH_VOID'), 'ARC_NEGATIVE_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('ARC_NEGATIVE_SUSPENSE_AFTERMATH_VOID does not fire when a negative-emotion scene is followed by a suspense rise within its window', async () => {
      const recs1163cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1163(i, { emotionalShift: 'negative' });
        if (i === 1 || i === 9) return makeRec1163(i, { suspenseDelta: 1 });
        return makeRec1163(i);
      });
      const res = await runArc1163(recs1163cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_NEGATIVE_SUSPENSE_AFTERMATH_VOID'), 'ARC_NEGATIVE_SUSPENSE_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1149 — characterArcPass: arc positive-curiosity aftermath void, arc positive-suspense aftermath void, arc negative-curiosity aftermath void', async () => {
    const makeRec1149 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc1149 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('ARC_POSITIVE_CURIOSITY_AFTERMATH_VOID fires when every positive-emotion scene is followed by two scenes with no curiosity rise', async () => {
      const recs1149a = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1149(i, { emotionalShift: 'positive' });
        if (i === 8 || i === 9) return makeRec1149(i, { curiosityDelta: 1 });
        return makeRec1149(i);
      });
      const res = await runArc1149(recs1149a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_POSITIVE_CURIOSITY_AFTERMATH_VOID'), 'ARC_POSITIVE_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('ARC_POSITIVE_CURIOSITY_AFTERMATH_VOID does not fire when a positive-emotion scene is followed by a curiosity rise within its window', async () => {
      const recs1149an = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1149(i, { emotionalShift: 'positive' });
        if (i === 1 || i === 9) return makeRec1149(i, { curiosityDelta: 1 });
        return makeRec1149(i);
      });
      const res = await runArc1149(recs1149an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_POSITIVE_CURIOSITY_AFTERMATH_VOID'), 'ARC_POSITIVE_CURIOSITY_AFTERMATH_VOID should not fire');
    });

    it('ARC_POSITIVE_SUSPENSE_AFTERMATH_VOID fires when every positive-emotion scene is followed by two scenes with no suspense rise', async () => {
      const recs1149b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1149(i, { emotionalShift: 'positive' });
        if (i === 8 || i === 9) return makeRec1149(i, { suspenseDelta: 1 });
        return makeRec1149(i);
      });
      const res = await runArc1149(recs1149b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_POSITIVE_SUSPENSE_AFTERMATH_VOID'), 'ARC_POSITIVE_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('ARC_POSITIVE_SUSPENSE_AFTERMATH_VOID does not fire when a positive-emotion scene is followed by a suspense rise within its window', async () => {
      const recs1149bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1149(i, { emotionalShift: 'positive' });
        if (i === 1 || i === 9) return makeRec1149(i, { suspenseDelta: 1 });
        return makeRec1149(i);
      });
      const res = await runArc1149(recs1149bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_POSITIVE_SUSPENSE_AFTERMATH_VOID'), 'ARC_POSITIVE_SUSPENSE_AFTERMATH_VOID should not fire');
    });

    it('ARC_NEGATIVE_CURIOSITY_AFTERMATH_VOID fires when every negative-emotion scene is followed by two scenes with no curiosity rise', async () => {
      const recs1149c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1149(i, { emotionalShift: 'negative' });
        if (i === 8 || i === 9) return makeRec1149(i, { curiosityDelta: 1 });
        return makeRec1149(i);
      });
      const res = await runArc1149(recs1149c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_NEGATIVE_CURIOSITY_AFTERMATH_VOID'), 'ARC_NEGATIVE_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('ARC_NEGATIVE_CURIOSITY_AFTERMATH_VOID does not fire when a negative-emotion scene is followed by a curiosity rise within its window', async () => {
      const recs1149cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1149(i, { emotionalShift: 'negative' });
        if (i === 1 || i === 9) return makeRec1149(i, { curiosityDelta: 1 });
        return makeRec1149(i);
      });
      const res = await runArc1149(recs1149cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_NEGATIVE_CURIOSITY_AFTERMATH_VOID'), 'ARC_NEGATIVE_CURIOSITY_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1135 — characterArcPass: arc suspense-recurrence aftermath void, arc turn-dialogue-highlight aftermath void, arc turn-staging aftermath void', async () => {
    const makeRec1135 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc1135 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('ARC_SUSPENSE_RECURRENCE_AFTERMATH_VOID fires when every suspense spike is followed by two scenes with no further suspense rise', async () => {
      const recs1135a = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1135(i, { suspenseDelta: 1 });
        if (i === 8 || i === 9) return makeRec1135(i, { suspenseDelta: 1 });
        return makeRec1135(i);
      });
      const res = await runArc1135(recs1135a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_RECURRENCE_AFTERMATH_VOID'), 'ARC_SUSPENSE_RECURRENCE_AFTERMATH_VOID should fire');
    });

    it('ARC_SUSPENSE_RECURRENCE_AFTERMATH_VOID does not fire when a suspense spike is followed by a further suspense rise within its window', async () => {
      const recs1135an = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1135(i, { suspenseDelta: 1 });
        if (i === 1 || i === 9) return makeRec1135(i, { suspenseDelta: 1 });
        return makeRec1135(i);
      });
      const res = await runArc1135(recs1135an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_RECURRENCE_AFTERMATH_VOID'), 'ARC_SUSPENSE_RECURRENCE_AFTERMATH_VOID should not fire');
    });

    it('ARC_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when every dramatic turn is followed by two scenes with no highlighted dialogue', async () => {
      const recs1135b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1135(i, { dramaticTurn: 'reversal' });
        if (i === 8 || i === 9) return makeRec1135(i, { dialogueHighlights: ['a memorable line'] });
        return makeRec1135(i);
      });
      const res = await runArc1135(recs1135b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'ARC_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    it('ARC_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a dramatic turn is followed by highlighted dialogue within its window', async () => {
      const recs1135bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1135(i, { dramaticTurn: 'reversal' });
        if (i === 1 || i === 9) return makeRec1135(i, { dialogueHighlights: ['a memorable line'] });
        return makeRec1135(i);
      });
      const res = await runArc1135(recs1135bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'ARC_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });

    it('ARC_TURN_STAGING_AFTERMATH_VOID fires when every dramatic turn is followed by two scenes with no heavily-staged scene', async () => {
      const recs1135c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1135(i, { dramaticTurn: 'reversal' });
        if (i === 8 || i === 9) return makeRec1135(i, { visualBeats: ['beat one', 'beat two'] });
        return makeRec1135(i);
      });
      const res = await runArc1135(recs1135c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_TURN_STAGING_AFTERMATH_VOID'), 'ARC_TURN_STAGING_AFTERMATH_VOID should fire');
    });

    it('ARC_TURN_STAGING_AFTERMATH_VOID does not fire when a dramatic turn is followed by a heavily-staged scene within its window', async () => {
      const recs1135cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1135(i, { dramaticTurn: 'reversal' });
        if (i === 1 || i === 9) return makeRec1135(i, { visualBeats: ['beat one', 'beat two'] });
        return makeRec1135(i);
      });
      const res = await runArc1135(recs1135cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_TURN_STAGING_AFTERMATH_VOID'), 'ARC_TURN_STAGING_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1121 — characterArcPass: arc suspense-staging aftermath void, arc turn-curiosity aftermath void, arc turn-suspense aftermath void', async () => {
    const makeRec1121 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc1121 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('ARC_SUSPENSE_STAGING_AFTERMATH_VOID fires when every suspense spike is followed by two scenes with no heavily-staged scene', async () => {
      const recs1121a = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1121(i, { suspenseDelta: 1 });
        if (i === 8 || i === 9) return makeRec1121(i, { visualBeats: ['beat one', 'beat two'] });
        return makeRec1121(i);
      });
      const res = await runArc1121(recs1121a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_STAGING_AFTERMATH_VOID'), 'ARC_SUSPENSE_STAGING_AFTERMATH_VOID should fire');
    });

    it('ARC_SUSPENSE_STAGING_AFTERMATH_VOID does not fire when a suspense spike is followed by a heavily-staged scene within its window', async () => {
      const recs1121an = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1121(i, { suspenseDelta: 1 });
        if (i === 1 || i === 9) return makeRec1121(i, { visualBeats: ['beat one', 'beat two'] });
        return makeRec1121(i);
      });
      const res = await runArc1121(recs1121an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_STAGING_AFTERMATH_VOID'), 'ARC_SUSPENSE_STAGING_AFTERMATH_VOID should not fire');
    });

    it('ARC_TURN_CURIOSITY_AFTERMATH_VOID fires when every dramatic turn is followed by two scenes with no curiosity rise', async () => {
      const recs1121b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1121(i, { dramaticTurn: 'reversal' });
        if (i === 8 || i === 9) return makeRec1121(i, { curiosityDelta: 1 });
        return makeRec1121(i);
      });
      const res = await runArc1121(recs1121b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_TURN_CURIOSITY_AFTERMATH_VOID'), 'ARC_TURN_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('ARC_TURN_CURIOSITY_AFTERMATH_VOID does not fire when a dramatic turn is followed by a curiosity rise within its window', async () => {
      const recs1121bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1121(i, { dramaticTurn: 'reversal' });
        if (i === 1 || i === 9) return makeRec1121(i, { curiosityDelta: 1 });
        return makeRec1121(i);
      });
      const res = await runArc1121(recs1121bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_TURN_CURIOSITY_AFTERMATH_VOID'), 'ARC_TURN_CURIOSITY_AFTERMATH_VOID should not fire');
    });

    it('ARC_TURN_SUSPENSE_AFTERMATH_VOID fires when every dramatic turn is followed by two scenes with no suspense rise', async () => {
      const recs1121c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1121(i, { dramaticTurn: 'reversal' });
        if (i === 8 || i === 9) return makeRec1121(i, { suspenseDelta: 1 });
        return makeRec1121(i);
      });
      const res = await runArc1121(recs1121c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_TURN_SUSPENSE_AFTERMATH_VOID'), 'ARC_TURN_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('ARC_TURN_SUSPENSE_AFTERMATH_VOID does not fire when a dramatic turn is followed by a suspense rise within its window', async () => {
      const recs1121cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1121(i, { dramaticTurn: 'reversal' });
        if (i === 1 || i === 9) return makeRec1121(i, { suspenseDelta: 1 });
        return makeRec1121(i);
      });
      const res = await runArc1121(recs1121cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_TURN_SUSPENSE_AFTERMATH_VOID'), 'ARC_TURN_SUSPENSE_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1107 — characterArcPass: arc revelation-staging aftermath void, arc seed-relational aftermath void, arc seed-staging aftermath void', async () => {
    const makeRec1107 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc1107 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('ARC_REVELATION_STAGING_AFTERMATH_VOID fires when every revelation is followed by two scenes with no heavily-staged scene', async () => {
      const recs1107a = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1107(i, { revelation: 'the truth about the letter' });
        if (i === 8 || i === 9) return makeRec1107(i, { visualBeats: ['beat one', 'beat two'] });
        return makeRec1107(i);
      });
      const res = await runArc1107(recs1107a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_REVELATION_STAGING_AFTERMATH_VOID'), 'ARC_REVELATION_STAGING_AFTERMATH_VOID should fire');
    });

    it('ARC_REVELATION_STAGING_AFTERMATH_VOID does not fire when a revelation is followed by a heavily-staged scene within its window', async () => {
      const recs1107an = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1107(i, { revelation: 'the truth about the letter' });
        if (i === 1 || i === 9) return makeRec1107(i, { visualBeats: ['beat one', 'beat two'] });
        return makeRec1107(i);
      });
      const res = await runArc1107(recs1107an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_REVELATION_STAGING_AFTERMATH_VOID'), 'ARC_REVELATION_STAGING_AFTERMATH_VOID should not fire');
    });

    it('ARC_SEED_RELATIONAL_AFTERMATH_VOID fires when every seed is followed by two scenes with no relationship shift', async () => {
      const recs1107b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1107(i, { seededClueIds: ['c1'] });
        if (i === 8 || i === 9) return makeRec1107(i, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
        return makeRec1107(i);
      });
      const res = await runArc1107(recs1107b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_SEED_RELATIONAL_AFTERMATH_VOID'), 'ARC_SEED_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('ARC_SEED_RELATIONAL_AFTERMATH_VOID does not fire when a seed is followed by a relationship shift within its window', async () => {
      const recs1107bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1107(i, { seededClueIds: ['c1'] });
        if (i === 1 || i === 9) return makeRec1107(i, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
        return makeRec1107(i);
      });
      const res = await runArc1107(recs1107bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_SEED_RELATIONAL_AFTERMATH_VOID'), 'ARC_SEED_RELATIONAL_AFTERMATH_VOID should not fire');
    });

    it('ARC_SEED_STAGING_AFTERMATH_VOID fires when every seed is followed by two scenes with no heavily-staged scene', async () => {
      const recs1107c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1107(i, { seededClueIds: ['c1'] });
        if (i === 8 || i === 9) return makeRec1107(i, { visualBeats: ['beat one', 'beat two'] });
        return makeRec1107(i);
      });
      const res = await runArc1107(recs1107c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_SEED_STAGING_AFTERMATH_VOID'), 'ARC_SEED_STAGING_AFTERMATH_VOID should fire');
    });

    it('ARC_SEED_STAGING_AFTERMATH_VOID does not fire when a seed is followed by a heavily-staged scene within its window', async () => {
      const recs1107cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1107(i, { seededClueIds: ['c1'] });
        if (i === 1 || i === 9) return makeRec1107(i, { visualBeats: ['beat one', 'beat two'] });
        return makeRec1107(i);
      });
      const res = await runArc1107(recs1107cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_SEED_STAGING_AFTERMATH_VOID'), 'ARC_SEED_STAGING_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1093 — characterArcPass: arc open-thread-relational aftermath void, arc clock-dialogue-highlight aftermath void, arc revelation-dialogue-highlight aftermath void', async () => {
    const makeRec1093 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc1093 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('ARC_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID fires when every heavy clue-debt scene is followed by two scenes with no relationship shift', async () => {
      const recs1093a = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1093(i, { unresolvedClues: ['c1', 'c2', 'c3'] });
        if (i === 8 || i === 9) return makeRec1093(i, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
        return makeRec1093(i);
      });
      const res = await runArc1093(recs1093a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID'), 'ARC_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('ARC_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID does not fire when a heavy clue-debt scene is followed by a relationship shift within its window', async () => {
      const recs1093an = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1093(i, { unresolvedClues: ['c1', 'c2', 'c3'] });
        if (i === 1 || i === 9) return makeRec1093(i, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
        return makeRec1093(i);
      });
      const res = await runArc1093(recs1093an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID'), 'ARC_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID should not fire');
    });

    it('ARC_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when every clock-raise is followed by two scenes with no highlighted dialogue', async () => {
      const recs1093b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1093(i, { clockRaised: true });
        if (i === 8 || i === 9) return makeRec1093(i, { dialogueHighlights: ['a memorable line'] });
        return makeRec1093(i);
      });
      const res = await runArc1093(recs1093b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'ARC_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    it('ARC_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a clock-raise is followed by highlighted dialogue within its window', async () => {
      const recs1093bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1093(i, { clockRaised: true });
        if (i === 1 || i === 9) return makeRec1093(i, { dialogueHighlights: ['a memorable line'] });
        return makeRec1093(i);
      });
      const res = await runArc1093(recs1093bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'ARC_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });

    it('ARC_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when every revelation is followed by two scenes with no highlighted dialogue', async () => {
      const recs1093c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1093(i, { revelation: 'the truth about the letter' });
        if (i === 8 || i === 9) return makeRec1093(i, { dialogueHighlights: ['a memorable line'] });
        return makeRec1093(i);
      });
      const res = await runArc1093(recs1093c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'ARC_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    it('ARC_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a revelation is followed by highlighted dialogue within its window', async () => {
      const recs1093cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1093(i, { revelation: 'the truth about the letter' });
        if (i === 1 || i === 9) return makeRec1093(i, { dialogueHighlights: ['a memorable line'] });
        return makeRec1093(i);
      });
      const res = await runArc1093(recs1093cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'ARC_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1079 — characterArcPass: arc stakes-staging aftermath void, arc payoff-dialogue-highlight aftermath void, arc open-thread-dialogue-highlight aftermath void', async () => {
    const makeRec1079 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc1079 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('ARC_STAKES_STAGING_AFTERMATH_VOID fires when every stakes-raise is followed by two scenes with no visually dense scene', async () => {
      const recs1079a = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1079(i, { purpose: 'raise_stakes' });
        if (i === 8 || i === 9) return makeRec1079(i, { visualBeats: ['beat one', 'beat two'] });
        return makeRec1079(i);
      });
      const res = await runArc1079(recs1079a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_STAKES_STAGING_AFTERMATH_VOID'), 'ARC_STAKES_STAGING_AFTERMATH_VOID should fire');
    });

    it('ARC_STAKES_STAGING_AFTERMATH_VOID does not fire when a stakes-raise is followed by a visually dense scene within its window', async () => {
      const recs1079an = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1079(i, { purpose: 'raise_stakes' });
        if (i === 1 || i === 9) return makeRec1079(i, { visualBeats: ['beat one', 'beat two'] });
        return makeRec1079(i);
      });
      const res = await runArc1079(recs1079an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_STAKES_STAGING_AFTERMATH_VOID'), 'ARC_STAKES_STAGING_AFTERMATH_VOID should not fire');
    });

    it('ARC_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when every payoff is followed by two scenes with no highlighted dialogue', async () => {
      const recs1079b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1079(i, { payoffSetupIds: ['p1'] });
        if (i === 8 || i === 9) return makeRec1079(i, { dialogueHighlights: ['a memorable line'] });
        return makeRec1079(i);
      });
      const res = await runArc1079(recs1079b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'ARC_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    it('ARC_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a payoff is followed by highlighted dialogue within its window', async () => {
      const recs1079bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1079(i, { payoffSetupIds: ['p1'] });
        if (i === 1 || i === 9) return makeRec1079(i, { dialogueHighlights: ['a memorable line'] });
        return makeRec1079(i);
      });
      const res = await runArc1079(recs1079bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'ARC_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });

    it('ARC_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when every heavy clue-debt scene is followed by two scenes with no highlighted dialogue', async () => {
      const recs1079c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1079(i, { unresolvedClues: ['c1', 'c2', 'c3'] });
        if (i === 8 || i === 9) return makeRec1079(i, { dialogueHighlights: ['a memorable line'] });
        return makeRec1079(i);
      });
      const res = await runArc1079(recs1079c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'ARC_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    it('ARC_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a heavy clue-debt scene is followed by highlighted dialogue within its window', async () => {
      const recs1079cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1079(i, { unresolvedClues: ['c1', 'c2', 'c3'] });
        if (i === 1 || i === 9) return makeRec1079(i, { dialogueHighlights: ['a memorable line'] });
        return makeRec1079(i);
      });
      const res = await runArc1079(recs1079cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'ARC_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1065 — characterArcPass: arc clock-suspense aftermath void, arc payoff-suspense aftermath void, arc stakes-dialogue-highlight aftermath void', async () => {
    const makeRec1065 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc1065 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('ARC_CLOCK_SUSPENSE_AFTERMATH_VOID fires when every clock-raise is followed by two scenes with no suspense rise', async () => {
      const recs1065a = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1065(i, { clockRaised: true });
        if (i === 8 || i === 9) return makeRec1065(i, { suspenseDelta: 1 });
        return makeRec1065(i);
      });
      const res = await runArc1065(recs1065a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_CLOCK_SUSPENSE_AFTERMATH_VOID'), 'ARC_CLOCK_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('ARC_CLOCK_SUSPENSE_AFTERMATH_VOID does not fire when a clock-raise is followed by a suspense rise within its window', async () => {
      const recs1065an = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1065(i, { clockRaised: true });
        if (i === 1 || i === 9) return makeRec1065(i, { suspenseDelta: 1 });
        return makeRec1065(i);
      });
      const res = await runArc1065(recs1065an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_CLOCK_SUSPENSE_AFTERMATH_VOID'), 'ARC_CLOCK_SUSPENSE_AFTERMATH_VOID should not fire');
    });

    it('ARC_PAYOFF_SUSPENSE_AFTERMATH_VOID fires when every payoff is followed by two scenes with no suspense rise', async () => {
      const recs1065b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1065(i, { payoffSetupIds: ['p1'] });
        if (i === 8 || i === 9) return makeRec1065(i, { suspenseDelta: 1 });
        return makeRec1065(i);
      });
      const res = await runArc1065(recs1065b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_PAYOFF_SUSPENSE_AFTERMATH_VOID'), 'ARC_PAYOFF_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('ARC_PAYOFF_SUSPENSE_AFTERMATH_VOID does not fire when a payoff is followed by a suspense rise within its window', async () => {
      const recs1065bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1065(i, { payoffSetupIds: ['p1'] });
        if (i === 1 || i === 9) return makeRec1065(i, { suspenseDelta: 1 });
        return makeRec1065(i);
      });
      const res = await runArc1065(recs1065bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_PAYOFF_SUSPENSE_AFTERMATH_VOID'), 'ARC_PAYOFF_SUSPENSE_AFTERMATH_VOID should not fire');
    });

    it('ARC_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when every stakes-raise is followed by two scenes with no highlighted dialogue', async () => {
      const recs1065c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1065(i, { purpose: 'raise_stakes' });
        if (i === 8 || i === 9) return makeRec1065(i, { dialogueHighlights: ['a memorable line'] });
        return makeRec1065(i);
      });
      const res = await runArc1065(recs1065c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'ARC_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    it('ARC_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a stakes-raise is followed by highlighted dialogue within its window', async () => {
      const recs1065cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1065(i, { purpose: 'raise_stakes' });
        if (i === 1 || i === 9) return makeRec1065(i, { dialogueHighlights: ['a memorable line'] });
        return makeRec1065(i);
      });
      const res = await runArc1065(recs1065cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'ARC_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1051 — characterArcPass: arc seed-suspense aftermath void, arc suspense-dialogue-highlight aftermath void, arc open-thread-suspense aftermath void', async () => {
    const makeRec1051 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc1051 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('ARC_SEED_SUSPENSE_AFTERMATH_VOID fires when every seed is followed by two scenes with no suspense rise', async () => {
      const recs1051a = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1051(i, { seededClueIds: ['c1'] });
        if (i === 8 || i === 9) return makeRec1051(i, { suspenseDelta: 1 });
        return makeRec1051(i);
      });
      const res = await runArc1051(recs1051a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_SEED_SUSPENSE_AFTERMATH_VOID'), 'ARC_SEED_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('ARC_SEED_SUSPENSE_AFTERMATH_VOID does not fire when a seed is followed by a suspense rise within its window', async () => {
      const recs1051an = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1051(i, { seededClueIds: ['c1'] });
        if (i === 1 || i === 9) return makeRec1051(i, { suspenseDelta: 1 });
        return makeRec1051(i);
      });
      const res = await runArc1051(recs1051an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_SEED_SUSPENSE_AFTERMATH_VOID'), 'ARC_SEED_SUSPENSE_AFTERMATH_VOID should not fire');
    });

    it('ARC_SUSPENSE_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when every suspense-rise is followed by two scenes with no highlighted dialogue', async () => {
      const recs1051b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1051(i, { suspenseDelta: 1 });
        if (i === 8 || i === 9) return makeRec1051(i, { dialogueHighlights: ['a memorable line'] });
        return makeRec1051(i);
      });
      const res = await runArc1051(recs1051b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'ARC_SUSPENSE_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    it('ARC_SUSPENSE_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a suspense-rise is followed by highlighted dialogue within its window', async () => {
      const recs1051bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1051(i, { suspenseDelta: 1 });
        if (i === 1 || i === 9) return makeRec1051(i, { dialogueHighlights: ['a memorable line'] });
        return makeRec1051(i);
      });
      const res = await runArc1051(recs1051bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'ARC_SUSPENSE_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });

    it('ARC_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID fires when every heavy clue-debt scene is followed by two scenes with no suspense rise', async () => {
      const recs1051c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1051(i, { unresolvedClues: ['c1', 'c2', 'c3'] });
        if (i === 8 || i === 9) return makeRec1051(i, { suspenseDelta: 1 });
        return makeRec1051(i);
      });
      const res = await runArc1051(recs1051c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID'), 'ARC_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('ARC_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID does not fire when a heavy clue-debt scene is followed by a suspense rise within its window', async () => {
      const recs1051cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1051(i, { unresolvedClues: ['c1', 'c2', 'c3'] });
        if (i === 1 || i === 9) return makeRec1051(i, { suspenseDelta: 1 });
        return makeRec1051(i);
      });
      const res = await runArc1051(recs1051cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID'), 'ARC_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1037 — characterArcPass: arc stakes-emotional aftermath void, arc revelation-suspense aftermath void, arc open-thread-curiosity aftermath void', async () => {
    const makeRec1037 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc1037 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('ARC_STAKES_EMOTIONAL_AFTERMATH_VOID fires when every stakes-raise is followed by two scenes with no emotional shift', async () => {
      const recs1037a = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1037(i, { purpose: 'raise_stakes' });
        if (i === 8 || i === 9) return makeRec1037(i, { emotionalShift: 'positive' });
        return makeRec1037(i);
      });
      const res = await runArc1037(recs1037a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_STAKES_EMOTIONAL_AFTERMATH_VOID'), 'ARC_STAKES_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('ARC_STAKES_EMOTIONAL_AFTERMATH_VOID does not fire when a stakes-raise is followed by an emotional shift within its window', async () => {
      const recs1037an = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1037(i, { purpose: 'raise_stakes' });
        if (i === 1 || i === 9) return makeRec1037(i, { emotionalShift: 'positive' });
        return makeRec1037(i);
      });
      const res = await runArc1037(recs1037an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_STAKES_EMOTIONAL_AFTERMATH_VOID'), 'ARC_STAKES_EMOTIONAL_AFTERMATH_VOID should not fire');
    });

    it('ARC_REVELATION_SUSPENSE_AFTERMATH_VOID fires when every revelation is followed by two scenes with no suspense rise', async () => {
      const recs1037b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1037(i, { revelation: 'a hidden truth' });
        if (i === 8 || i === 9) return makeRec1037(i, { suspenseDelta: 1 });
        return makeRec1037(i);
      });
      const res = await runArc1037(recs1037b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_REVELATION_SUSPENSE_AFTERMATH_VOID'), 'ARC_REVELATION_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('ARC_REVELATION_SUSPENSE_AFTERMATH_VOID does not fire when a revelation is followed by a suspense rise within its window', async () => {
      const recs1037bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1037(i, { revelation: 'a hidden truth' });
        if (i === 1 || i === 9) return makeRec1037(i, { suspenseDelta: 1 });
        return makeRec1037(i);
      });
      const res = await runArc1037(recs1037bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_REVELATION_SUSPENSE_AFTERMATH_VOID'), 'ARC_REVELATION_SUSPENSE_AFTERMATH_VOID should not fire');
    });

    it('ARC_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID fires when every heavy clue-debt scene is followed by two scenes with no curiosity rise', async () => {
      const recs1037c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1037(i, { unresolvedClues: ['c1', 'c2', 'c3'] });
        if (i === 8 || i === 9) return makeRec1037(i, { curiosityDelta: 1 });
        return makeRec1037(i);
      });
      const res = await runArc1037(recs1037c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID'), 'ARC_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('ARC_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID does not fire when a heavy clue-debt scene is followed by a curiosity rise within its window', async () => {
      const recs1037cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1037(i, { unresolvedClues: ['c1', 'c2', 'c3'] });
        if (i === 1 || i === 9) return makeRec1037(i, { curiosityDelta: 1 });
        return makeRec1037(i);
      });
      const res = await runArc1037(recs1037cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID'), 'ARC_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1023 — characterArcPass: arc stakes-suspense aftermath void, arc revelation-curiosity aftermath void, arc suspense-emotional aftermath void', async () => {
    const makeRec1023 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc1023 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('ARC_STAKES_SUSPENSE_AFTERMATH_VOID fires when every stakes-raise is followed by two scenes with no suspense rise', async () => {
      const recs1023a = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1023(i, { purpose: 'raise_stakes' });
        if (i === 8 || i === 9) return makeRec1023(i, { suspenseDelta: 1 });
        return makeRec1023(i);
      });
      const res = await runArc1023(recs1023a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_STAKES_SUSPENSE_AFTERMATH_VOID'), 'ARC_STAKES_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('ARC_STAKES_SUSPENSE_AFTERMATH_VOID does not fire when a stakes-raise is followed by a suspense rise within its window', async () => {
      const recs1023an = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1023(i, { purpose: 'raise_stakes' });
        if (i === 1 || i === 9) return makeRec1023(i, { suspenseDelta: 1 });
        return makeRec1023(i);
      });
      const res = await runArc1023(recs1023an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_STAKES_SUSPENSE_AFTERMATH_VOID'), 'ARC_STAKES_SUSPENSE_AFTERMATH_VOID should not fire');
    });

    it('ARC_REVELATION_CURIOSITY_AFTERMATH_VOID fires when every revelation is followed by two scenes with no curiosity rise', async () => {
      const recs1023b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1023(i, { revelation: 'a hidden truth' });
        if (i === 8 || i === 9) return makeRec1023(i, { curiosityDelta: 1 });
        return makeRec1023(i);
      });
      const res = await runArc1023(recs1023b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_REVELATION_CURIOSITY_AFTERMATH_VOID'), 'ARC_REVELATION_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('ARC_REVELATION_CURIOSITY_AFTERMATH_VOID does not fire when a revelation is followed by a curiosity rise within its window', async () => {
      const recs1023bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1023(i, { revelation: 'a hidden truth' });
        if (i === 1 || i === 9) return makeRec1023(i, { curiosityDelta: 1 });
        return makeRec1023(i);
      });
      const res = await runArc1023(recs1023bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_REVELATION_CURIOSITY_AFTERMATH_VOID'), 'ARC_REVELATION_CURIOSITY_AFTERMATH_VOID should not fire');
    });

    it('ARC_SUSPENSE_EMOTIONAL_AFTERMATH_VOID fires when every suspense-rise is followed by two scenes with no emotional shift', async () => {
      const recs1023c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1023(i, { suspenseDelta: 1 });
        if (i === 8 || i === 9) return makeRec1023(i, { emotionalShift: 'positive' });
        return makeRec1023(i);
      });
      const res = await runArc1023(recs1023c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_EMOTIONAL_AFTERMATH_VOID'), 'ARC_SUSPENSE_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('ARC_SUSPENSE_EMOTIONAL_AFTERMATH_VOID does not fire when a suspense-rise is followed by an emotional shift within its window', async () => {
      const recs1023cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1023(i, { suspenseDelta: 1 });
        if (i === 1 || i === 9) return makeRec1023(i, { emotionalShift: 'positive' });
        return makeRec1023(i);
      });
      const res = await runArc1023(recs1023cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_EMOTIONAL_AFTERMATH_VOID'), 'ARC_SUSPENSE_EMOTIONAL_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1009 — characterArcPass: arc clock-emotional aftermath void, arc payoff-relational aftermath void, arc seed-curiosity aftermath void', async () => {
    const makeRec1009 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc1009 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('ARC_CLOCK_EMOTIONAL_AFTERMATH_VOID fires when every clock-raise is followed by two scenes with no emotional shift', async () => {
      const recs1009a = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1009(i, { clockRaised: true });
        if (i === 8 || i === 9) return makeRec1009(i, { emotionalShift: 'positive' });
        return makeRec1009(i);
      });
      const res = await runArc1009(recs1009a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_CLOCK_EMOTIONAL_AFTERMATH_VOID'), 'ARC_CLOCK_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('ARC_CLOCK_EMOTIONAL_AFTERMATH_VOID does not fire when a clock-raise is followed by an emotional shift within its window', async () => {
      const recs1009an = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1009(i, { clockRaised: true });
        if (i === 1 || i === 9) return makeRec1009(i, { emotionalShift: 'positive' });
        return makeRec1009(i);
      });
      const res = await runArc1009(recs1009an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_CLOCK_EMOTIONAL_AFTERMATH_VOID'), 'ARC_CLOCK_EMOTIONAL_AFTERMATH_VOID should not fire');
    });

    it('ARC_PAYOFF_RELATIONAL_AFTERMATH_VOID fires when every payoff is followed by two scenes with no relationship shift', async () => {
      const recs1009b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1009(i, { payoffSetupIds: ['setup1'] });
        if (i === 8 || i === 9) return makeRec1009(i, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
        return makeRec1009(i);
      });
      const res = await runArc1009(recs1009b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_PAYOFF_RELATIONAL_AFTERMATH_VOID'), 'ARC_PAYOFF_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('ARC_PAYOFF_RELATIONAL_AFTERMATH_VOID does not fire when a payoff is followed by a relationship shift within its window', async () => {
      const recs1009bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1009(i, { payoffSetupIds: ['setup1'] });
        if (i === 1 || i === 9) return makeRec1009(i, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
        return makeRec1009(i);
      });
      const res = await runArc1009(recs1009bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_PAYOFF_RELATIONAL_AFTERMATH_VOID'), 'ARC_PAYOFF_RELATIONAL_AFTERMATH_VOID should not fire');
    });

    it('ARC_SEED_CURIOSITY_AFTERMATH_VOID fires when every seed is followed by two scenes with no new curiosity', async () => {
      const recs1009c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1009(i, { seededClueIds: ['c1'] });
        if (i === 8 || i === 9) return makeRec1009(i, { curiosityDelta: 1 });
        return makeRec1009(i);
      });
      const res = await runArc1009(recs1009c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_SEED_CURIOSITY_AFTERMATH_VOID'), 'ARC_SEED_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('ARC_SEED_CURIOSITY_AFTERMATH_VOID does not fire when a seed is followed by new curiosity within its window', async () => {
      const recs1009cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1009(i, { seededClueIds: ['c1'] });
        if (i === 1 || i === 9) return makeRec1009(i, { curiosityDelta: 1 });
        return makeRec1009(i);
      });
      const res = await runArc1009(recs1009cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_SEED_CURIOSITY_AFTERMATH_VOID'), 'ARC_SEED_CURIOSITY_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 995 — characterArcPass: arc clock zone imbalance, arc highlight zone imbalance, arc stakes-curiosity aftermath void', async () => {
    const makeRec995 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc995 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched → no-fire.
    it('ARC_CLOCK_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of clock-raising scenes', async () => {
      const recs995a = Array.from({ length: 10 }, (_, i) =>
        makeRec995(i, [0, 1, 2, 8, 9].includes(i) ? { clockRaised: true } : {}));
      const res = await runArc995(recs995a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_CLOCK_ZONE_IMBALANCE'), 'ARC_CLOCK_ZONE_IMBALANCE should fire');
    });

    it('ARC_CLOCK_ZONE_IMBALANCE does not fire when clock-raising scenes touch every zone', async () => {
      const recs995an = Array.from({ length: 10 }, (_, i) =>
        makeRec995(i, [0, 3, 5, 8].includes(i) ? { clockRaised: true } : {}));
      const res = await runArc995(recs995an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_CLOCK_ZONE_IMBALANCE'), 'ARC_CLOCK_ZONE_IMBALANCE should not fire');
    });

    it('ARC_HIGHLIGHT_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of highlighted-dialogue scenes', async () => {
      const recs995b = Array.from({ length: 10 }, (_, i) =>
        makeRec995(i, [0, 1, 2, 8, 9].includes(i) ? { dialogueHighlights: ['line'] } : {}));
      const res = await runArc995(recs995b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_HIGHLIGHT_ZONE_IMBALANCE'), 'ARC_HIGHLIGHT_ZONE_IMBALANCE should fire');
    });

    it('ARC_HIGHLIGHT_ZONE_IMBALANCE does not fire when highlighted-dialogue scenes touch every zone', async () => {
      const recs995bn = Array.from({ length: 10 }, (_, i) =>
        makeRec995(i, [0, 3, 5, 8].includes(i) ? { dialogueHighlights: ['line'] } : {}));
      const res = await runArc995(recs995bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_HIGHLIGHT_ZONE_IMBALANCE'), 'ARC_HIGHLIGHT_ZONE_IMBALANCE should not fire');
    });

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('ARC_STAKES_CURIOSITY_AFTERMATH_VOID fires when every stakes-raise is followed by two scenes with no new curiosity', async () => {
      const recs995c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec995(i, { purpose: 'raise_stakes' });
        if (i === 8 || i === 9) return makeRec995(i, { curiosityDelta: 1 });
        return makeRec995(i);
      });
      const res = await runArc995(recs995c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_STAKES_CURIOSITY_AFTERMATH_VOID'), 'ARC_STAKES_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('ARC_STAKES_CURIOSITY_AFTERMATH_VOID does not fire when a stakes-raise is followed by new curiosity within its window', async () => {
      const recs995cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec995(i, { purpose: 'raise_stakes' });
        if (i === 1 || i === 9) return makeRec995(i, { curiosityDelta: 1 });
        return makeRec995(i);
      });
      const res = await runArc995(recs995cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_STAKES_CURIOSITY_AFTERMATH_VOID'), 'ARC_STAKES_CURIOSITY_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 981 — characterArcPass: arc suspense relational aftermath void, arc clock staging aftermath void, arc payoff staging aftermath void', async () => {
    const makeRec981 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc981 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath-void geometry n=10, window=2: triggers at 0 and 3 (both have a full 2-scene lookahead).
    // FIRE: aftermath signal only at 8,9 — outside both trigger windows {1,2} and {4,5} → every trigger
    // void → fires. NO-FIRE: aftermath at 1 (inside trigger 0's window) and 9 → trigger 0 not void → no fire.
    it('ARC_SUSPENSE_RELATIONAL_AFTERMATH_VOID fires when every suspense rise has no relationship shift within 2 scenes', async () => {
      const recs981a = Array.from({ length: 10 }, (_, i) =>
        makeRec981(i, [0, 3].includes(i) ? { suspenseDelta: 1 } : ([8, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runArc981(recs981a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_RELATIONAL_AFTERMATH_VOID'), 'ARC_SUSPENSE_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('ARC_SUSPENSE_RELATIONAL_AFTERMATH_VOID does not fire when a suspense rise is followed by a relationship shift within 2 scenes', async () => {
      const recs981an = Array.from({ length: 10 }, (_, i) =>
        makeRec981(i, [0, 3].includes(i) ? { suspenseDelta: 1 } : ([1, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runArc981(recs981an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_RELATIONAL_AFTERMATH_VOID'), 'ARC_SUSPENSE_RELATIONAL_AFTERMATH_VOID should not fire');
    });

    it('ARC_CLOCK_STAGING_AFTERMATH_VOID fires when every clock has no substantial staging within 2 scenes', async () => {
      const recs981b = Array.from({ length: 10 }, (_, i) =>
        makeRec981(i, [0, 3].includes(i) ? { clockRaised: true } : ([8, 9].includes(i) ? { visualBeats: ['beat one', 'beat two'] } : {})));
      const res = await runArc981(recs981b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_CLOCK_STAGING_AFTERMATH_VOID'), 'ARC_CLOCK_STAGING_AFTERMATH_VOID should fire');
    });

    it('ARC_CLOCK_STAGING_AFTERMATH_VOID does not fire when a clock is followed by substantial staging within 2 scenes', async () => {
      const recs981bn = Array.from({ length: 10 }, (_, i) =>
        makeRec981(i, [0, 3].includes(i) ? { clockRaised: true } : ([1, 9].includes(i) ? { visualBeats: ['beat one', 'beat two'] } : {})));
      const res = await runArc981(recs981bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_CLOCK_STAGING_AFTERMATH_VOID'), 'ARC_CLOCK_STAGING_AFTERMATH_VOID should not fire');
    });

    it('ARC_PAYOFF_STAGING_AFTERMATH_VOID fires when every payoff has no substantial staging within 2 scenes', async () => {
      const recs981c = Array.from({ length: 10 }, (_, i) =>
        makeRec981(i, [0, 3].includes(i) ? { payoffSetupIds: ['s1'] } : ([8, 9].includes(i) ? { visualBeats: ['beat one', 'beat two'] } : {})));
      const res = await runArc981(recs981c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_PAYOFF_STAGING_AFTERMATH_VOID'), 'ARC_PAYOFF_STAGING_AFTERMATH_VOID should fire');
    });

    it('ARC_PAYOFF_STAGING_AFTERMATH_VOID does not fire when a payoff is followed by substantial staging within 2 scenes', async () => {
      const recs981cn = Array.from({ length: 10 }, (_, i) =>
        makeRec981(i, [0, 3].includes(i) ? { payoffSetupIds: ['s1'] } : ([1, 9].includes(i) ? { visualBeats: ['beat one', 'beat two'] } : {})));
      const res = await runArc981(recs981cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_PAYOFF_STAGING_AFTERMATH_VOID'), 'ARC_PAYOFF_STAGING_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 967 — characterArcPass: arc revelation emotional aftermath void, arc stakes relational aftermath void, arc payoff emotional aftermath void', async () => {
    const makeRec967 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc967 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath-void geometry n=10, window=2: triggers at 0 and 3 (both have a full 2-scene lookahead).
    // FIRE: aftermath signal only at 8,9 — outside both trigger windows {1,2} and {4,5} → every trigger
    // void → fires. NO-FIRE: aftermath at 1 (inside trigger 0's window) and 9 → trigger 0 not void → no fire.
    it('ARC_REVELATION_EMOTIONAL_AFTERMATH_VOID fires when every revelation has no emotional shift within 2 scenes', async () => {
      const recs967a = Array.from({ length: 10 }, (_, i) =>
        makeRec967(i, [0, 3].includes(i) ? { revelation: 'a truth surfaces' } : ([8, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runArc967(recs967a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_REVELATION_EMOTIONAL_AFTERMATH_VOID'), 'ARC_REVELATION_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('ARC_REVELATION_EMOTIONAL_AFTERMATH_VOID does not fire when a revelation is followed by an emotional shift within 2 scenes', async () => {
      const recs967an = Array.from({ length: 10 }, (_, i) =>
        makeRec967(i, [0, 3].includes(i) ? { revelation: 'a truth surfaces' } : ([1, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runArc967(recs967an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_REVELATION_EMOTIONAL_AFTERMATH_VOID'), 'ARC_REVELATION_EMOTIONAL_AFTERMATH_VOID should not fire');
    });

    it('ARC_STAKES_RELATIONAL_AFTERMATH_VOID fires when every stakes-raise has no relationship shift within 2 scenes', async () => {
      const recs967b = Array.from({ length: 10 }, (_, i) =>
        makeRec967(i, [0, 3].includes(i) ? { purpose: 'raise_stakes' } : ([8, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runArc967(recs967b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_STAKES_RELATIONAL_AFTERMATH_VOID'), 'ARC_STAKES_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('ARC_STAKES_RELATIONAL_AFTERMATH_VOID does not fire when a stakes-raise is followed by a relationship shift within 2 scenes', async () => {
      const recs967bn = Array.from({ length: 10 }, (_, i) =>
        makeRec967(i, [0, 3].includes(i) ? { purpose: 'raise_stakes' } : ([1, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runArc967(recs967bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_STAKES_RELATIONAL_AFTERMATH_VOID'), 'ARC_STAKES_RELATIONAL_AFTERMATH_VOID should not fire');
    });

    it('ARC_PAYOFF_EMOTIONAL_AFTERMATH_VOID fires when every payoff has no emotional shift within 2 scenes', async () => {
      const recs967c = Array.from({ length: 10 }, (_, i) =>
        makeRec967(i, [0, 3].includes(i) ? { payoffSetupIds: ['s1'] } : ([8, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runArc967(recs967c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_PAYOFF_EMOTIONAL_AFTERMATH_VOID'), 'ARC_PAYOFF_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('ARC_PAYOFF_EMOTIONAL_AFTERMATH_VOID does not fire when a payoff is followed by an emotional shift within 2 scenes', async () => {
      const recs967cn = Array.from({ length: 10 }, (_, i) =>
        makeRec967(i, [0, 3].includes(i) ? { payoffSetupIds: ['s1'] } : ([1, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runArc967(recs967cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_PAYOFF_EMOTIONAL_AFTERMATH_VOID'), 'ARC_PAYOFF_EMOTIONAL_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 953 — characterArcPass: arc relational zone imbalance, arc turn zone imbalance, arc revelation zone imbalance', async () => {
    const makeRec953 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc953 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched → no-fire.
    it('ARC_RELATIONAL_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of relationship-shift scenes', async () => {
      const recs953a = Array.from({ length: 10 }, (_, i) =>
        makeRec953(i, [0, 1, 2, 8, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {}));
      const res = await runArc953(recs953a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_RELATIONAL_ZONE_IMBALANCE'), 'ARC_RELATIONAL_ZONE_IMBALANCE should fire');
    });

    it('ARC_RELATIONAL_ZONE_IMBALANCE does not fire when relationship-shift scenes touch every zone', async () => {
      const recs953an = Array.from({ length: 10 }, (_, i) =>
        makeRec953(i, [0, 3, 5, 8].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {}));
      const res = await runArc953(recs953an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_RELATIONAL_ZONE_IMBALANCE'), 'ARC_RELATIONAL_ZONE_IMBALANCE should not fire');
    });

    it('ARC_TURN_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of dramatic-turn scenes', async () => {
      const recs953b = Array.from({ length: 10 }, (_, i) =>
        makeRec953(i, [0, 1, 2, 8, 9].includes(i) ? { dramaticTurn: 'reversal' } : {}));
      const res = await runArc953(recs953b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_TURN_ZONE_IMBALANCE'), 'ARC_TURN_ZONE_IMBALANCE should fire');
    });

    it('ARC_TURN_ZONE_IMBALANCE does not fire when dramatic-turn scenes touch every zone', async () => {
      const recs953bn = Array.from({ length: 10 }, (_, i) =>
        makeRec953(i, [0, 3, 5, 8].includes(i) ? { dramaticTurn: 'reversal' } : {}));
      const res = await runArc953(recs953bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_TURN_ZONE_IMBALANCE'), 'ARC_TURN_ZONE_IMBALANCE should not fire');
    });

    it('ARC_REVELATION_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of revelation scenes', async () => {
      const recs953c = Array.from({ length: 10 }, (_, i) =>
        makeRec953(i, [0, 1, 2, 8, 9].includes(i) ? { revelation: 'a hidden truth surfaces' } : {}));
      const res = await runArc953(recs953c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_REVELATION_ZONE_IMBALANCE'), 'ARC_REVELATION_ZONE_IMBALANCE should fire');
    });

    it('ARC_REVELATION_ZONE_IMBALANCE does not fire when revelation scenes touch every zone', async () => {
      const recs953cn = Array.from({ length: 10 }, (_, i) =>
        makeRec953(i, [0, 3, 5, 8].includes(i) ? { revelation: 'a hidden truth surfaces' } : {}));
      const res = await runArc953(recs953cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_REVELATION_ZONE_IMBALANCE'), 'ARC_REVELATION_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 939 — characterArcPass: arc open thread zone imbalance, arc payoff zone imbalance, arc seed zone imbalance', async () => {
    const makeRec939 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc939 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched → no-fire.
    it('ARC_OPEN_THREAD_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of open-thread scenes', async () => {
      const recs939a = Array.from({ length: 10 }, (_, i) =>
        makeRec939(i, [0, 1, 2, 8, 9].includes(i) ? { unresolvedClues: ['c'] } : {}));
      const res = await runArc939(recs939a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_OPEN_THREAD_ZONE_IMBALANCE'), 'ARC_OPEN_THREAD_ZONE_IMBALANCE should fire');
    });

    it('ARC_OPEN_THREAD_ZONE_IMBALANCE does not fire when open-thread scenes touch every zone', async () => {
      const recs939an = Array.from({ length: 10 }, (_, i) =>
        makeRec939(i, [0, 3, 5, 8].includes(i) ? { unresolvedClues: ['c'] } : {}));
      const res = await runArc939(recs939an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_OPEN_THREAD_ZONE_IMBALANCE'), 'ARC_OPEN_THREAD_ZONE_IMBALANCE should not fire');
    });

    it('ARC_PAYOFF_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of payoff scenes', async () => {
      const recs939b = Array.from({ length: 10 }, (_, i) =>
        makeRec939(i, [0, 1, 2, 8, 9].includes(i) ? { payoffSetupIds: ['s'] } : {}));
      const res = await runArc939(recs939b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_PAYOFF_ZONE_IMBALANCE'), 'ARC_PAYOFF_ZONE_IMBALANCE should fire');
    });

    it('ARC_PAYOFF_ZONE_IMBALANCE does not fire when payoff scenes touch every zone', async () => {
      const recs939bn = Array.from({ length: 10 }, (_, i) =>
        makeRec939(i, [0, 3, 5, 8].includes(i) ? { payoffSetupIds: ['s'] } : {}));
      const res = await runArc939(recs939bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_PAYOFF_ZONE_IMBALANCE'), 'ARC_PAYOFF_ZONE_IMBALANCE should not fire');
    });

    it('ARC_SEED_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of seed scenes', async () => {
      const recs939c = Array.from({ length: 10 }, (_, i) =>
        makeRec939(i, [0, 1, 2, 8, 9].includes(i) ? { seededClueIds: ['k'] } : {}));
      const res = await runArc939(recs939c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_SEED_ZONE_IMBALANCE'), 'ARC_SEED_ZONE_IMBALANCE should fire');
    });

    it('ARC_SEED_ZONE_IMBALANCE does not fire when seed scenes touch every zone', async () => {
      const recs939cn = Array.from({ length: 10 }, (_, i) =>
        makeRec939(i, [0, 3, 5, 8].includes(i) ? { seededClueIds: ['k'] } : {}));
      const res = await runArc939(recs939cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_SEED_ZONE_IMBALANCE'), 'ARC_SEED_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 925 — characterArcPass: arc suspense zone imbalance, arc curiosity zone imbalance, arc clock delta zone imbalance', async () => {
    const makeRec925 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc925 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched → no-fire.
    it('ARC_SUSPENSE_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of suspense-raising scenes', async () => {
      const recs925a = Array.from({ length: 10 }, (_, i) =>
        makeRec925(i, [0, 1, 2, 8, 9].includes(i) ? { suspenseDelta: 2 } : {}));
      const res = await runArc925(recs925a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_ZONE_IMBALANCE'), 'ARC_SUSPENSE_ZONE_IMBALANCE should fire');
    });

    it('ARC_SUSPENSE_ZONE_IMBALANCE does not fire when suspense-raising scenes touch every zone', async () => {
      const recs925an = Array.from({ length: 10 }, (_, i) =>
        makeRec925(i, [0, 3, 5, 8].includes(i) ? { suspenseDelta: 2 } : {}));
      const res = await runArc925(recs925an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_ZONE_IMBALANCE'), 'ARC_SUSPENSE_ZONE_IMBALANCE should not fire');
    });

    it('ARC_CURIOSITY_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of curiosity-raising scenes', async () => {
      const recs925b = Array.from({ length: 10 }, (_, i) =>
        makeRec925(i, [0, 1, 2, 8, 9].includes(i) ? { curiosityDelta: 2 } : {}));
      const res = await runArc925(recs925b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_CURIOSITY_ZONE_IMBALANCE'), 'ARC_CURIOSITY_ZONE_IMBALANCE should fire');
    });

    it('ARC_CURIOSITY_ZONE_IMBALANCE does not fire when curiosity-raising scenes touch every zone', async () => {
      const recs925bn = Array.from({ length: 10 }, (_, i) =>
        makeRec925(i, [0, 3, 5, 8].includes(i) ? { curiosityDelta: 2 } : {}));
      const res = await runArc925(recs925bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_CURIOSITY_ZONE_IMBALANCE'), 'ARC_CURIOSITY_ZONE_IMBALANCE should not fire');
    });

    it('ARC_CLOCK_DELTA_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of clock-advancing scenes', async () => {
      const recs925c = Array.from({ length: 10 }, (_, i) =>
        makeRec925(i, [0, 1, 2, 8, 9].includes(i) ? { clockDelta: 2 } : {}));
      const res = await runArc925(recs925c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_CLOCK_DELTA_ZONE_IMBALANCE'), 'ARC_CLOCK_DELTA_ZONE_IMBALANCE should fire');
    });

    it('ARC_CLOCK_DELTA_ZONE_IMBALANCE does not fire when clock-advancing scenes touch every zone', async () => {
      const recs925cn = Array.from({ length: 10 }, (_, i) =>
        makeRec925(i, [0, 3, 5, 8].includes(i) ? { clockDelta: 2 } : {}));
      const res = await runArc925(recs925cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_CLOCK_DELTA_ZONE_IMBALANCE'), 'ARC_CLOCK_DELTA_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 911 — characterArcPass: arc revelation purpose zone imbalance, arc positive emotion zone imbalance, arc negative emotion zone imbalance', async () => {
    const makeRec911 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc911 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched → no-fire.
    it('ARC_REVELATION_PURPOSE_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of revelation-purposed scenes', async () => {
      const recs911a = Array.from({ length: 10 }, (_, i) =>
        makeRec911(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'revelation' : 'development' }));
      const res = await runArc911(recs911a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_REVELATION_PURPOSE_ZONE_IMBALANCE'), 'ARC_REVELATION_PURPOSE_ZONE_IMBALANCE should fire');
    });

    it('ARC_REVELATION_PURPOSE_ZONE_IMBALANCE does not fire when revelation-purposed scenes touch every zone', async () => {
      const recs911an = Array.from({ length: 10 }, (_, i) =>
        makeRec911(i, { purpose: [0, 3, 5, 8].includes(i) ? 'revelation' : 'development' }));
      const res = await runArc911(recs911an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_REVELATION_PURPOSE_ZONE_IMBALANCE'), 'ARC_REVELATION_PURPOSE_ZONE_IMBALANCE should not fire');
    });

    it('ARC_POSITIVE_EMOTION_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of positive-shift scenes', async () => {
      const recs911b = Array.from({ length: 10 }, (_, i) =>
        makeRec911(i, { emotionalShift: [0, 1, 2, 8, 9].includes(i) ? 'positive' : 'neutral' }));
      const res = await runArc911(recs911b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_POSITIVE_EMOTION_ZONE_IMBALANCE'), 'ARC_POSITIVE_EMOTION_ZONE_IMBALANCE should fire');
    });

    it('ARC_POSITIVE_EMOTION_ZONE_IMBALANCE does not fire when positive-shift scenes touch every zone', async () => {
      const recs911bn = Array.from({ length: 10 }, (_, i) =>
        makeRec911(i, { emotionalShift: [0, 3, 5, 8].includes(i) ? 'positive' : 'neutral' }));
      const res = await runArc911(recs911bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_POSITIVE_EMOTION_ZONE_IMBALANCE'), 'ARC_POSITIVE_EMOTION_ZONE_IMBALANCE should not fire');
    });

    it('ARC_NEGATIVE_EMOTION_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of negative-shift scenes', async () => {
      const recs911c = Array.from({ length: 10 }, (_, i) =>
        makeRec911(i, { emotionalShift: [0, 1, 2, 8, 9].includes(i) ? 'negative' : 'neutral' }));
      const res = await runArc911(recs911c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_NEGATIVE_EMOTION_ZONE_IMBALANCE'), 'ARC_NEGATIVE_EMOTION_ZONE_IMBALANCE should fire');
    });

    it('ARC_NEGATIVE_EMOTION_ZONE_IMBALANCE does not fire when negative-shift scenes touch every zone', async () => {
      const recs911cn = Array.from({ length: 10 }, (_, i) =>
        makeRec911(i, { emotionalShift: [0, 3, 5, 8].includes(i) ? 'negative' : 'neutral' }));
      const res = await runArc911(recs911cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_NEGATIVE_EMOTION_ZONE_IMBALANCE'), 'ARC_NEGATIVE_EMOTION_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 897 — characterArcPass: arc revelation purpose zone cluster, arc revelation purpose drought run, arc stakes zone imbalance', async () => {
    const makeRec897 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc897 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ARC_REVELATION_PURPOSE_ZONE_CLUSTER fire: n=9, 3 thirds; revelation-purposed scenes at
    // 0,1,2 (all in opening third) → 3/3 = 100% > 75%.
    it('ARC_REVELATION_PURPOSE_ZONE_CLUSTER fires when >75% of revelation-purposed scenes cluster in one third', async () => {
      const recs897a = Array.from({ length: 9 }, (_, i) =>
        makeRec897(i, { purpose: [0, 1, 2].includes(i) ? 'revelation' : 'development' }),
      );
      const res = await runArc897(recs897a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_REVELATION_PURPOSE_ZONE_CLUSTER'), 'ARC_REVELATION_PURPOSE_ZONE_CLUSTER should fire');
    });

    it('ARC_REVELATION_PURPOSE_ZONE_CLUSTER does not fire when revelation-purposed scenes spread across thirds', async () => {
      const recs897an = Array.from({ length: 9 }, (_, i) =>
        makeRec897(i, { purpose: [0, 4, 8].includes(i) ? 'revelation' : 'development' }),
      );
      const res = await runArc897(recs897an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_REVELATION_PURPOSE_ZONE_CLUSTER'), 'ARC_REVELATION_PURPOSE_ZONE_CLUSTER should not fire');
    });

    // ARC_REVELATION_PURPOSE_DROUGHT_RUN fire: n=10, revelation-purposed scenes at 0, 8, 9
    // (minPresentCount 3 satisfied), leaving a 7-scene gap (indices 1-7) — run of 7 >= threshold 6.
    it('ARC_REVELATION_PURPOSE_DROUGHT_RUN fires when a long run has no revelation-purposed scene', async () => {
      const recs897b = Array.from({ length: 10 }, (_, i) =>
        makeRec897(i, { purpose: [0, 8, 9].includes(i) ? 'revelation' : 'development' }),
      );
      const res = await runArc897(recs897b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_REVELATION_PURPOSE_DROUGHT_RUN'), 'ARC_REVELATION_PURPOSE_DROUGHT_RUN should fire');
    });

    it('ARC_REVELATION_PURPOSE_DROUGHT_RUN does not fire when revelation-purposed scenes are evenly spread', async () => {
      const recs897bn = Array.from({ length: 10 }, (_, i) =>
        makeRec897(i, { purpose: [0, 3, 6, 9].includes(i) ? 'revelation' : 'development' }),
      );
      const res = await runArc897(recs897bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_REVELATION_PURPOSE_DROUGHT_RUN'), 'ARC_REVELATION_PURPOSE_DROUGHT_RUN should not fire');
    });

    // ARC_STAKES_ZONE_IMBALANCE fire: n=10, 4 zones (Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9});
    // raise_stakes at 0,1,2,8,9 → Z0 has 3/5=60% (bloat, >=50%), Z1 and Z2 are empty.
    it('ARC_STAKES_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of stakes-raising scenes', async () => {
      const recs897c = Array.from({ length: 10 }, (_, i) =>
        makeRec897(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'raise_stakes' : 'development' }),
      );
      const res = await runArc897(recs897c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_STAKES_ZONE_IMBALANCE'), 'ARC_STAKES_ZONE_IMBALANCE should fire');
    });

    it('ARC_STAKES_ZONE_IMBALANCE does not fire when stakes-raising scenes touch every zone', async () => {
      const recs897cn = Array.from({ length: 10 }, (_, i) =>
        makeRec897(i, { purpose: [0, 3, 5, 8].includes(i) ? 'raise_stakes' : 'development' }),
      );
      const res = await runArc897(recs897cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_STAKES_ZONE_IMBALANCE'), 'ARC_STAKES_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 883 — characterArcPass: arc complicate zone imbalance, arc introduce conflict zone imbalance, arc turning point zone imbalance', async () => {
    const makeRec883 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc883 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ARC_COMPLICATE_ZONE_IMBALANCE fire:
    // n=10, 4 zones (Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}); complicate at 0,1,2,8,9 →
    // Z0 has 3/5=60% (bloat, >=50%), Z1 and Z2 are empty.
    it('ARC_COMPLICATE_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of complicating scenes', async () => {
      const recs883a = Array.from({ length: 10 }, (_, i) =>
        makeRec883(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'complicate' : 'development' }),
      );
      const res = await runArc883(recs883a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_COMPLICATE_ZONE_IMBALANCE'), 'ARC_COMPLICATE_ZONE_IMBALANCE should fire');
    });

    it('ARC_COMPLICATE_ZONE_IMBALANCE does not fire when complicating scenes touch every zone', async () => {
      const recs883an = Array.from({ length: 10 }, (_, i) =>
        makeRec883(i, { purpose: [0, 3, 5, 8].includes(i) ? 'complicate' : 'development' }),
      );
      const res = await runArc883(recs883an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_COMPLICATE_ZONE_IMBALANCE'), 'ARC_COMPLICATE_ZONE_IMBALANCE should not fire');
    });

    // ARC_INTRODUCE_CONFLICT_ZONE_IMBALANCE fire: same zone geometry as above.
    it('ARC_INTRODUCE_CONFLICT_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of conflict-introducing scenes', async () => {
      const recs883b = Array.from({ length: 10 }, (_, i) =>
        makeRec883(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'introduce_conflict' : 'development' }),
      );
      const res = await runArc883(recs883b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_INTRODUCE_CONFLICT_ZONE_IMBALANCE'), 'ARC_INTRODUCE_CONFLICT_ZONE_IMBALANCE should fire');
    });

    it('ARC_INTRODUCE_CONFLICT_ZONE_IMBALANCE does not fire when conflict-introducing scenes touch every zone', async () => {
      const recs883bn = Array.from({ length: 10 }, (_, i) =>
        makeRec883(i, { purpose: [0, 3, 5, 8].includes(i) ? 'introduce_conflict' : 'development' }),
      );
      const res = await runArc883(recs883bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_INTRODUCE_CONFLICT_ZONE_IMBALANCE'), 'ARC_INTRODUCE_CONFLICT_ZONE_IMBALANCE should not fire');
    });

    // ARC_TURNING_POINT_ZONE_IMBALANCE fire: same zone geometry as above.
    it('ARC_TURNING_POINT_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of turning-point scenes', async () => {
      const recs883c = Array.from({ length: 10 }, (_, i) =>
        makeRec883(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'turning_point' : 'development' }),
      );
      const res = await runArc883(recs883c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_TURNING_POINT_ZONE_IMBALANCE'), 'ARC_TURNING_POINT_ZONE_IMBALANCE should fire');
    });

    it('ARC_TURNING_POINT_ZONE_IMBALANCE does not fire when turning-point scenes touch every zone', async () => {
      const recs883cn = Array.from({ length: 10 }, (_, i) =>
        makeRec883(i, { purpose: [0, 3, 5, 8].includes(i) ? 'turning_point' : 'development' }),
      );
      const res = await runArc883(recs883cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_TURNING_POINT_ZONE_IMBALANCE'), 'ARC_TURNING_POINT_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 869 — characterArcPass: arc climax zone imbalance, arc establish world zone imbalance, arc resolution purpose zone imbalance', async () => {
    const makeRec869 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc869 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ARC_CLIMAX_ZONE_IMBALANCE fire:
    // n=10, 4 zones (Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}); climax at 0,1,2,8,9 →
    // Z0 has 3/5=60% (bloat, >=50%), Z1 and Z2 are empty.
    it('ARC_CLIMAX_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of climax-purposed scenes', async () => {
      const recs869a = Array.from({ length: 10 }, (_, i) =>
        makeRec869(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'climax' : 'development' }),
      );
      const res = await runArc869(recs869a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_CLIMAX_ZONE_IMBALANCE'), 'ARC_CLIMAX_ZONE_IMBALANCE should fire');
    });

    it('ARC_CLIMAX_ZONE_IMBALANCE does not fire when climax-purposed scenes touch every zone', async () => {
      const recs869an = Array.from({ length: 10 }, (_, i) =>
        makeRec869(i, { purpose: [0, 3, 5, 8].includes(i) ? 'climax' : 'development' }),
      );
      const res = await runArc869(recs869an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_CLIMAX_ZONE_IMBALANCE'), 'ARC_CLIMAX_ZONE_IMBALANCE should not fire');
    });

    // ARC_ESTABLISH_WORLD_ZONE_IMBALANCE fire: same zone geometry as above.
    it('ARC_ESTABLISH_WORLD_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of world-establishing scenes', async () => {
      const recs869b = Array.from({ length: 10 }, (_, i) =>
        makeRec869(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'establish_world' : 'development' }),
      );
      const res = await runArc869(recs869b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_ESTABLISH_WORLD_ZONE_IMBALANCE'), 'ARC_ESTABLISH_WORLD_ZONE_IMBALANCE should fire');
    });

    it('ARC_ESTABLISH_WORLD_ZONE_IMBALANCE does not fire when world-establishing scenes touch every zone', async () => {
      const recs869bn = Array.from({ length: 10 }, (_, i) =>
        makeRec869(i, { purpose: [0, 3, 5, 8].includes(i) ? 'establish_world' : 'development' }),
      );
      const res = await runArc869(recs869bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_ESTABLISH_WORLD_ZONE_IMBALANCE'), 'ARC_ESTABLISH_WORLD_ZONE_IMBALANCE should not fire');
    });

    // ARC_RESOLUTION_PURPOSE_ZONE_IMBALANCE fire: same zone geometry as above.
    it('ARC_RESOLUTION_PURPOSE_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of resolution-purposed scenes', async () => {
      const recs869c = Array.from({ length: 10 }, (_, i) =>
        makeRec869(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'resolution' : 'development' }),
      );
      const res = await runArc869(recs869c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_RESOLUTION_PURPOSE_ZONE_IMBALANCE'), 'ARC_RESOLUTION_PURPOSE_ZONE_IMBALANCE should fire');
    });

    it('ARC_RESOLUTION_PURPOSE_ZONE_IMBALANCE does not fire when resolution-purposed scenes touch every zone', async () => {
      const recs869cn = Array.from({ length: 10 }, (_, i) =>
        makeRec869(i, { purpose: [0, 3, 5, 8].includes(i) ? 'resolution' : 'development' }),
      );
      const res = await runArc869(recs869cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_RESOLUTION_PURPOSE_ZONE_IMBALANCE'), 'ARC_RESOLUTION_PURPOSE_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 855 — characterArcPass: arc climax drought run, arc resolution purpose zone cluster, arc resolution purpose drought run', async () => {
    const makeRec855 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc855 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ARC_CLIMAX_DROUGHT_RUN fire:
    // n=10; climax at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('ARC_CLIMAX_DROUGHT_RUN fires when a long run has no climax-purposed scene', async () => {
      const recs855a = Array.from({ length: 10 }, (_, i) =>
        makeRec855(i, { purpose: [0, 1, 2].includes(i) ? 'climax' : 'development' }),
      );
      const res = await runArc855(recs855a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_CLIMAX_DROUGHT_RUN'), 'ARC_CLIMAX_DROUGHT_RUN should fire');
    });

    it('ARC_CLIMAX_DROUGHT_RUN does not fire when climax-purposed scenes are evenly spread', async () => {
      const recs855an = Array.from({ length: 10 }, (_, i) =>
        makeRec855(i, { purpose: [0, 3, 6, 9].includes(i) ? 'climax' : 'development' }),
      );
      const res = await runArc855(recs855an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_CLIMAX_DROUGHT_RUN'), 'ARC_CLIMAX_DROUGHT_RUN should not fire');
    });

    // ARC_RESOLUTION_PURPOSE_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; resolution scenes at 0,1,2 → 100% opening third
    it('ARC_RESOLUTION_PURPOSE_ZONE_CLUSTER fires when >75% of resolution-purposed scenes cluster in one third', async () => {
      const recs855b = Array.from({ length: 9 }, (_, i) =>
        makeRec855(i, { purpose: [0, 1, 2].includes(i) ? 'resolution' : 'development' }),
      );
      const res = await runArc855(recs855b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_RESOLUTION_PURPOSE_ZONE_CLUSTER'), 'ARC_RESOLUTION_PURPOSE_ZONE_CLUSTER should fire');
    });

    it('ARC_RESOLUTION_PURPOSE_ZONE_CLUSTER does not fire when resolution-purposed scenes spread across thirds', async () => {
      const recs855bn = Array.from({ length: 9 }, (_, i) =>
        makeRec855(i, { purpose: [0, 4, 8].includes(i) ? 'resolution' : 'development' }),
      );
      const res = await runArc855(recs855bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_RESOLUTION_PURPOSE_ZONE_CLUSTER'), 'ARC_RESOLUTION_PURPOSE_ZONE_CLUSTER should not fire');
    });

    // ARC_RESOLUTION_PURPOSE_DROUGHT_RUN fire:
    // n=10; resolution at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('ARC_RESOLUTION_PURPOSE_DROUGHT_RUN fires when a long run has no resolution-purposed scene', async () => {
      const recs855c = Array.from({ length: 10 }, (_, i) =>
        makeRec855(i, { purpose: [0, 1, 2].includes(i) ? 'resolution' : 'development' }),
      );
      const res = await runArc855(recs855c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_RESOLUTION_PURPOSE_DROUGHT_RUN'), 'ARC_RESOLUTION_PURPOSE_DROUGHT_RUN should fire');
    });

    it('ARC_RESOLUTION_PURPOSE_DROUGHT_RUN does not fire when resolution-purposed scenes are evenly spread', async () => {
      const recs855cn = Array.from({ length: 10 }, (_, i) =>
        makeRec855(i, { purpose: [0, 3, 6, 9].includes(i) ? 'resolution' : 'development' }),
      );
      const res = await runArc855(recs855cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_RESOLUTION_PURPOSE_DROUGHT_RUN'), 'ARC_RESOLUTION_PURPOSE_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 841 — characterArcPass: arc establish world drought run, arc complicate drought run, arc climax zone cluster', async () => {
    const makeRec841 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc841 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ARC_ESTABLISH_WORLD_DROUGHT_RUN fire:
    // n=10; establish_world at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('ARC_ESTABLISH_WORLD_DROUGHT_RUN fires when a long run has no world-building', async () => {
      const recs841a = Array.from({ length: 10 }, (_, i) =>
        makeRec841(i, { purpose: [0, 1, 2].includes(i) ? 'establish_world' : 'development' }),
      );
      const res = await runArc841(recs841a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_ESTABLISH_WORLD_DROUGHT_RUN'), 'ARC_ESTABLISH_WORLD_DROUGHT_RUN should fire');
    });

    it('ARC_ESTABLISH_WORLD_DROUGHT_RUN does not fire when world-establishing scenes are evenly spread', async () => {
      const recs841an = Array.from({ length: 10 }, (_, i) =>
        makeRec841(i, { purpose: [0, 3, 6, 9].includes(i) ? 'establish_world' : 'development' }),
      );
      const res = await runArc841(recs841an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_ESTABLISH_WORLD_DROUGHT_RUN'), 'ARC_ESTABLISH_WORLD_DROUGHT_RUN should not fire');
    });

    // ARC_COMPLICATE_DROUGHT_RUN fire:
    // n=10; complicate at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('ARC_COMPLICATE_DROUGHT_RUN fires when a long run has no complication', async () => {
      const recs841b = Array.from({ length: 10 }, (_, i) =>
        makeRec841(i, { purpose: [0, 1, 2].includes(i) ? 'complicate' : 'development' }),
      );
      const res = await runArc841(recs841b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_COMPLICATE_DROUGHT_RUN'), 'ARC_COMPLICATE_DROUGHT_RUN should fire');
    });

    it('ARC_COMPLICATE_DROUGHT_RUN does not fire when complicating scenes are evenly spread', async () => {
      const recs841bn = Array.from({ length: 10 }, (_, i) =>
        makeRec841(i, { purpose: [0, 3, 6, 9].includes(i) ? 'complicate' : 'development' }),
      );
      const res = await runArc841(recs841bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_COMPLICATE_DROUGHT_RUN'), 'ARC_COMPLICATE_DROUGHT_RUN should not fire');
    });

    // ARC_CLIMAX_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; climax scenes at 0,1,2 → 100% opening third
    it('ARC_CLIMAX_ZONE_CLUSTER fires when >75% of climax-purposed scenes cluster in one third', async () => {
      const recs841c = Array.from({ length: 9 }, (_, i) =>
        makeRec841(i, { purpose: [0, 1, 2].includes(i) ? 'climax' : 'development' }),
      );
      const res = await runArc841(recs841c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_CLIMAX_ZONE_CLUSTER'), 'ARC_CLIMAX_ZONE_CLUSTER should fire');
    });

    it('ARC_CLIMAX_ZONE_CLUSTER does not fire when climax-purposed scenes spread across thirds', async () => {
      const recs841cn = Array.from({ length: 9 }, (_, i) =>
        makeRec841(i, { purpose: [0, 4, 8].includes(i) ? 'climax' : 'development' }),
      );
      const res = await runArc841(recs841cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_CLIMAX_ZONE_CLUSTER'), 'ARC_CLIMAX_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 827 — characterArcPass: arc introduce conflict drought run, arc establish world zone cluster, arc complicate zone cluster', async () => {
    const makeRec827 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc827 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ARC_INTRODUCE_CONFLICT_DROUGHT_RUN fire:
    // n=10; introduce_conflict at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('ARC_INTRODUCE_CONFLICT_DROUGHT_RUN fires when a long run has no new conflict', async () => {
      const recs827a = Array.from({ length: 10 }, (_, i) =>
        makeRec827(i, { purpose: [0, 1, 2].includes(i) ? 'introduce_conflict' : 'development' }),
      );
      const res = await runArc827(recs827a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_INTRODUCE_CONFLICT_DROUGHT_RUN'), 'ARC_INTRODUCE_CONFLICT_DROUGHT_RUN should fire');
    });

    it('ARC_INTRODUCE_CONFLICT_DROUGHT_RUN does not fire when conflict-introducing scenes are evenly spread', async () => {
      const recs827an = Array.from({ length: 10 }, (_, i) =>
        makeRec827(i, { purpose: [0, 3, 6, 9].includes(i) ? 'introduce_conflict' : 'development' }),
      );
      const res = await runArc827(recs827an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_INTRODUCE_CONFLICT_DROUGHT_RUN'), 'ARC_INTRODUCE_CONFLICT_DROUGHT_RUN should not fire');
    });

    // ARC_ESTABLISH_WORLD_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; establish_world scenes at 0,1,2 → 100% opening third
    it('ARC_ESTABLISH_WORLD_ZONE_CLUSTER fires when >75% of world-establishing scenes cluster in one third', async () => {
      const recs827b = Array.from({ length: 9 }, (_, i) =>
        makeRec827(i, { purpose: [0, 1, 2].includes(i) ? 'establish_world' : 'development' }),
      );
      const res = await runArc827(recs827b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_ESTABLISH_WORLD_ZONE_CLUSTER'), 'ARC_ESTABLISH_WORLD_ZONE_CLUSTER should fire');
    });

    it('ARC_ESTABLISH_WORLD_ZONE_CLUSTER does not fire when world-establishing scenes spread across thirds', async () => {
      const recs827bn = Array.from({ length: 9 }, (_, i) =>
        makeRec827(i, { purpose: [0, 4, 8].includes(i) ? 'establish_world' : 'development' }),
      );
      const res = await runArc827(recs827bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_ESTABLISH_WORLD_ZONE_CLUSTER'), 'ARC_ESTABLISH_WORLD_ZONE_CLUSTER should not fire');
    });

    // ARC_COMPLICATE_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; complicate scenes at 0,1,2 → 100% opening third
    it('ARC_COMPLICATE_ZONE_CLUSTER fires when >75% of complicating scenes cluster in one third', async () => {
      const recs827c = Array.from({ length: 9 }, (_, i) =>
        makeRec827(i, { purpose: [0, 1, 2].includes(i) ? 'complicate' : 'development' }),
      );
      const res = await runArc827(recs827c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_COMPLICATE_ZONE_CLUSTER'), 'ARC_COMPLICATE_ZONE_CLUSTER should fire');
    });

    it('ARC_COMPLICATE_ZONE_CLUSTER does not fire when complicating scenes spread across thirds', async () => {
      const recs827cn = Array.from({ length: 9 }, (_, i) =>
        makeRec827(i, { purpose: [0, 4, 8].includes(i) ? 'complicate' : 'development' }),
      );
      const res = await runArc827(recs827cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_COMPLICATE_ZONE_CLUSTER'), 'ARC_COMPLICATE_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 813 — characterArcPass: arc positive emotion zone cluster, arc positive emotion drought run, arc introduce conflict zone cluster', async () => {
    const makeRec813 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc813 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ARC_POSITIVE_EMOTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; positive-emotion scenes at 0,1,2 → 100% opening third
    it('ARC_POSITIVE_EMOTION_ZONE_CLUSTER fires when >75% of positive-emotion scenes cluster in one third', async () => {
      const recs813a = Array.from({ length: 9 }, (_, i) =>
        makeRec813(i, { emotionalShift: [0, 1, 2].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runArc813(recs813a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_POSITIVE_EMOTION_ZONE_CLUSTER'), 'ARC_POSITIVE_EMOTION_ZONE_CLUSTER should fire');
    });

    it('ARC_POSITIVE_EMOTION_ZONE_CLUSTER does not fire when positive-emotion scenes spread across thirds', async () => {
      const recs813an = Array.from({ length: 9 }, (_, i) =>
        makeRec813(i, { emotionalShift: [0, 4, 8].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runArc813(recs813an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_POSITIVE_EMOTION_ZONE_CLUSTER'), 'ARC_POSITIVE_EMOTION_ZONE_CLUSTER should not fire');
    });

    // ARC_POSITIVE_EMOTION_DROUGHT_RUN fire:
    // n=10; positive-emotion at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('ARC_POSITIVE_EMOTION_DROUGHT_RUN fires when a long run has no positive-emotion charge', async () => {
      const recs813b = Array.from({ length: 10 }, (_, i) =>
        makeRec813(i, { emotionalShift: [0, 1, 2].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runArc813(recs813b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_POSITIVE_EMOTION_DROUGHT_RUN'), 'ARC_POSITIVE_EMOTION_DROUGHT_RUN should fire');
    });

    it('ARC_POSITIVE_EMOTION_DROUGHT_RUN does not fire when positive-emotion scenes are evenly spread', async () => {
      const recs813bn = Array.from({ length: 10 }, (_, i) =>
        makeRec813(i, { emotionalShift: [0, 3, 6, 9].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runArc813(recs813bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_POSITIVE_EMOTION_DROUGHT_RUN'), 'ARC_POSITIVE_EMOTION_DROUGHT_RUN should not fire');
    });

    // ARC_INTRODUCE_CONFLICT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; introduce_conflict scenes at 0,1,2 → 100% opening third
    it('ARC_INTRODUCE_CONFLICT_ZONE_CLUSTER fires when >75% of conflict-introducing scenes cluster in one third', async () => {
      const recs813c = Array.from({ length: 9 }, (_, i) =>
        makeRec813(i, { purpose: [0, 1, 2].includes(i) ? 'introduce_conflict' : 'development' }),
      );
      const res = await runArc813(recs813c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_INTRODUCE_CONFLICT_ZONE_CLUSTER'), 'ARC_INTRODUCE_CONFLICT_ZONE_CLUSTER should fire');
    });

    it('ARC_INTRODUCE_CONFLICT_ZONE_CLUSTER does not fire when conflict-introducing scenes spread across thirds', async () => {
      const recs813cn = Array.from({ length: 9 }, (_, i) =>
        makeRec813(i, { purpose: [0, 4, 8].includes(i) ? 'introduce_conflict' : 'development' }),
      );
      const res = await runArc813(recs813cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_INTRODUCE_CONFLICT_ZONE_CLUSTER'), 'ARC_INTRODUCE_CONFLICT_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 799 — characterArcPass: arc negative emotion drought run, arc turning point zone cluster, arc turning point drought run', async () => {
    const makeRec799 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc799 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ARC_NEGATIVE_EMOTION_DROUGHT_RUN fire:
    // n=10; negative-emotion at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('ARC_NEGATIVE_EMOTION_DROUGHT_RUN fires when a long run has no negative-emotion charge', async () => {
      const recs799a = Array.from({ length: 10 }, (_, i) =>
        makeRec799(i, { emotionalShift: [0, 1, 2].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runArc799(recs799a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_NEGATIVE_EMOTION_DROUGHT_RUN'), 'ARC_NEGATIVE_EMOTION_DROUGHT_RUN should fire');
    });

    it('ARC_NEGATIVE_EMOTION_DROUGHT_RUN does not fire when negative-emotion scenes are evenly spread', async () => {
      const recs799an = Array.from({ length: 10 }, (_, i) =>
        makeRec799(i, { emotionalShift: [0, 3, 6, 9].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runArc799(recs799an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_NEGATIVE_EMOTION_DROUGHT_RUN'), 'ARC_NEGATIVE_EMOTION_DROUGHT_RUN should not fire');
    });

    // ARC_TURNING_POINT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; turning_point scenes at 0,1,2 → 100% opening third
    it('ARC_TURNING_POINT_ZONE_CLUSTER fires when >75% of turning-point scenes cluster in one third', async () => {
      const recs799b = Array.from({ length: 9 }, (_, i) =>
        makeRec799(i, { purpose: [0, 1, 2].includes(i) ? 'turning_point' : 'development' }),
      );
      const res = await runArc799(recs799b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_TURNING_POINT_ZONE_CLUSTER'), 'ARC_TURNING_POINT_ZONE_CLUSTER should fire');
    });

    it('ARC_TURNING_POINT_ZONE_CLUSTER does not fire when turning-point scenes spread across thirds', async () => {
      const recs799bn = Array.from({ length: 9 }, (_, i) =>
        makeRec799(i, { purpose: [0, 4, 8].includes(i) ? 'turning_point' : 'development' }),
      );
      const res = await runArc799(recs799bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_TURNING_POINT_ZONE_CLUSTER'), 'ARC_TURNING_POINT_ZONE_CLUSTER should not fire');
    });

    // ARC_TURNING_POINT_DROUGHT_RUN fire:
    // n=10; turning_point at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('ARC_TURNING_POINT_DROUGHT_RUN fires when a long run has no turning point', async () => {
      const recs799c = Array.from({ length: 10 }, (_, i) =>
        makeRec799(i, { purpose: [0, 1, 2].includes(i) ? 'turning_point' : 'development' }),
      );
      const res = await runArc799(recs799c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_TURNING_POINT_DROUGHT_RUN'), 'ARC_TURNING_POINT_DROUGHT_RUN should fire');
    });

    it('ARC_TURNING_POINT_DROUGHT_RUN does not fire when turning points are evenly spread', async () => {
      const recs799cn = Array.from({ length: 10 }, (_, i) =>
        makeRec799(i, { purpose: [0, 3, 6, 9].includes(i) ? 'turning_point' : 'development' }),
      );
      const res = await runArc799(recs799cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_TURNING_POINT_DROUGHT_RUN'), 'ARC_TURNING_POINT_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 785 — characterArcPass: arc revelation drought run, arc revelation peak uncaused, arc negative emotion zone cluster', async () => {
    const makeRec785 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc785 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ARC_REVELATION_DROUGHT_RUN fire:
    // n=10; revelation present at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('ARC_REVELATION_DROUGHT_RUN fires when a long run has no revelation', async () => {
      const recs785a = Array.from({ length: 10 }, (_, i) => makeRec785(i,
        (i === 0 || i === 1 || i === 2) ? { revelation: 'truth revealed' } : {}
      ));
      const res = await runArc785(recs785a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_REVELATION_DROUGHT_RUN'), 'ARC_REVELATION_DROUGHT_RUN should fire');
    });

    it('ARC_REVELATION_DROUGHT_RUN does not fire when revelations are evenly spread', async () => {
      const recs785an = Array.from({ length: 10 }, (_, i) => makeRec785(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { revelation: 'truth revealed' } : {}
      ));
      const res = await runArc785(recs785an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_REVELATION_DROUGHT_RUN'), 'ARC_REVELATION_DROUGHT_RUN should not fire');
    });

    // ARC_REVELATION_PEAK_UNCAUSED fire:
    // 8 scenes; revelations at 2 (peak, earliest) and 5; no dramaticTurn at 0 or 1 (2-scene
    // lookback of the peak at index 2).
    it('ARC_REVELATION_PEAK_UNCAUSED fires when the peak revelation scene has no dramatic turn nearby', async () => {
      const recs785b = Array.from({ length: 8 }, (_, i) => makeRec785(i));
      recs785b[2] = makeRec785(2, { revelation: 'truth revealed' });
      recs785b[5] = makeRec785(5, { revelation: 'second truth revealed' });
      const res = await runArc785(recs785b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_REVELATION_PEAK_UNCAUSED'), 'ARC_REVELATION_PEAK_UNCAUSED should fire');
    });

    it('ARC_REVELATION_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak revelation', async () => {
      const recs785bn = Array.from({ length: 8 }, (_, i) => makeRec785(i));
      recs785bn[2] = makeRec785(2, { revelation: 'truth revealed' });
      recs785bn[5] = makeRec785(5, { revelation: 'second truth revealed' });
      recs785bn[1] = makeRec785(1, { dramaticTurn: 'reversal' });
      const res = await runArc785(recs785bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_REVELATION_PEAK_UNCAUSED'), 'ARC_REVELATION_PEAK_UNCAUSED should not fire');
    });

    // ARC_NEGATIVE_EMOTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; negative-shift scenes at 0,1,2 → 100% opening third
    it('ARC_NEGATIVE_EMOTION_ZONE_CLUSTER fires when >75% of negative-shift scenes cluster in one third', async () => {
      const recs785c = Array.from({ length: 9 }, (_, i) => makeRec785(i,
        (i === 0 || i === 1 || i === 2) ? { emotionalShift: 'negative' } : {}
      ));
      const res = await runArc785(recs785c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_NEGATIVE_EMOTION_ZONE_CLUSTER'), 'ARC_NEGATIVE_EMOTION_ZONE_CLUSTER should fire');
    });

    it('ARC_NEGATIVE_EMOTION_ZONE_CLUSTER does not fire when negative-shift scenes spread across thirds', async () => {
      const recs785cn = Array.from({ length: 9 }, (_, i) => makeRec785(i,
        (i === 0 || i === 4 || i === 8) ? { emotionalShift: 'negative' } : {}
      ));
      const res = await runArc785(recs785cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_NEGATIVE_EMOTION_ZONE_CLUSTER'), 'ARC_NEGATIVE_EMOTION_ZONE_CLUSTER should not fire');
    });
  });


  describe('Wave 771 — characterArcPass: arc suspense peak uncaused, arc stakes zone cluster, arc revelation zone cluster', async () => {
    const makeRec771 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc771 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ARC_SUSPENSE_PEAK_UNCAUSED fire:
    // 8 scenes; suspenseDelta qualifying (>0) at 2 and 5; peak resolves to the first (idx 2, tie
    // on magnitude 3); no dramaticTurn/revelation at indices 0 or 1 (2-scene lookback).
    it('ARC_SUSPENSE_PEAK_UNCAUSED fires when the peak suspense scene has no preparing cause nearby', async () => {
      const recs771a = Array.from({ length: 8 }, (_, i) => makeRec771(i));
      recs771a[2] = makeRec771(2, { suspenseDelta: 3 });
      recs771a[5] = makeRec771(5, { suspenseDelta: 3 });
      const res = await runArc771(recs771a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_PEAK_UNCAUSED'), 'ARC_SUSPENSE_PEAK_UNCAUSED should fire');
    });

    it('ARC_SUSPENSE_PEAK_UNCAUSED does not fire when a preparing cause precedes the peak suspense scene', async () => {
      const recs771an = Array.from({ length: 8 }, (_, i) => makeRec771(i));
      recs771an[2] = makeRec771(2, { suspenseDelta: 3 });
      recs771an[5] = makeRec771(5, { suspenseDelta: 3 });
      recs771an[1] = makeRec771(1, { dramaticTurn: 'reversal' });
      const res = await runArc771(recs771an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_PEAK_UNCAUSED'), 'ARC_SUSPENSE_PEAK_UNCAUSED should not fire');
    });

    // ARC_STAKES_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; stakes-raising scenes at 0,1,2 → 100% opening third
    it('ARC_STAKES_ZONE_CLUSTER fires when >75% of stakes-raising scenes cluster in one third', async () => {
      const recs771b = Array.from({ length: 9 }, (_, i) => makeRec771(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'raise_stakes' } : {}
      ));
      const res = await runArc771(recs771b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_STAKES_ZONE_CLUSTER'), 'ARC_STAKES_ZONE_CLUSTER should fire');
    });

    it('ARC_STAKES_ZONE_CLUSTER does not fire when stakes-raising scenes spread across thirds', async () => {
      const recs771bn = Array.from({ length: 9 }, (_, i) => makeRec771(i,
        (i === 0 || i === 4 || i === 8) ? { purpose: 'raise_stakes' } : {}
      ));
      const res = await runArc771(recs771bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_STAKES_ZONE_CLUSTER'), 'ARC_STAKES_ZONE_CLUSTER should not fire');
    });

    // ARC_REVELATION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; revelation scenes at 0,1,2 → 100% opening third
    it('ARC_REVELATION_ZONE_CLUSTER fires when >75% of revelation scenes cluster in one third', async () => {
      const recs771c = Array.from({ length: 9 }, (_, i) => makeRec771(i,
        (i === 0 || i === 1 || i === 2) ? { revelation: 'truth revealed' } : {}
      ));
      const res = await runArc771(recs771c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_REVELATION_ZONE_CLUSTER'), 'ARC_REVELATION_ZONE_CLUSTER should fire');
    });

    it('ARC_REVELATION_ZONE_CLUSTER does not fire when revelation scenes spread across thirds', async () => {
      const recs771cn = Array.from({ length: 9 }, (_, i) => makeRec771(i,
        (i === 0 || i === 4 || i === 8) ? { revelation: 'truth revealed' } : {}
      ));
      const res = await runArc771(recs771cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_REVELATION_ZONE_CLUSTER'), 'ARC_REVELATION_ZONE_CLUSTER should not fire');
    });
  });


  describe('Wave 757 — characterArcPass: arc suspense zone cluster, arc emotion zone cluster, arc stakes drought run', async () => {
    const makeRec757 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc757 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ARC_SUSPENSE_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; suspense-positive scenes at 0,1,2 → 100% opening third
    it('ARC_SUSPENSE_ZONE_CLUSTER fires when >75% of suspense-positive scenes cluster in one third', async () => {
      const recs757a = Array.from({ length: 9 }, (_, i) => makeRec757(i,
        (i === 0 || i === 1 || i === 2) ? { suspenseDelta: 1 } : {}
      ));
      const res = await runArc757(recs757a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_ZONE_CLUSTER'), 'ARC_SUSPENSE_ZONE_CLUSTER should fire');
    });

    // ARC_SUSPENSE_ZONE_CLUSTER no-fire:
    // suspense-positive scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('ARC_SUSPENSE_ZONE_CLUSTER does not fire when suspense-positive scenes are distributed across thirds', async () => {
      const recs757an = Array.from({ length: 9 }, (_, i) => makeRec757(i,
        (i === 0 || i === 4 || i === 7) ? { suspenseDelta: 1 } : {}
      ));
      const res = await runArc757(recs757an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_ZONE_CLUSTER'), 'ARC_SUSPENSE_ZONE_CLUSTER should not fire');
    });

    // ARC_EMOTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; emotionally-charged scenes at 0,1,2 → 100% opening third
    it('ARC_EMOTION_ZONE_CLUSTER fires when >75% of emotionally-charged scenes cluster in one third', async () => {
      const recs757b = Array.from({ length: 9 }, (_, i) => makeRec757(i,
        (i === 0 || i === 1 || i === 2) ? { emotionalShift: 'positive' } : {}
      ));
      const res = await runArc757(recs757b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_EMOTION_ZONE_CLUSTER'), 'ARC_EMOTION_ZONE_CLUSTER should fire');
    });

    // ARC_EMOTION_ZONE_CLUSTER no-fire:
    // emotionally-charged scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('ARC_EMOTION_ZONE_CLUSTER does not fire when emotionally-charged scenes are distributed across thirds', async () => {
      const recs757bn = Array.from({ length: 9 }, (_, i) => makeRec757(i,
        (i === 0 || i === 4 || i === 7) ? { emotionalShift: 'positive' } : {}
      ));
      const res = await runArc757(recs757bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_EMOTION_ZONE_CLUSTER'), 'ARC_EMOTION_ZONE_CLUSTER should not fire');
    });

    // ARC_STAKES_DROUGHT_RUN fire:
    // 10 scenes; stakes-raising at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('ARC_STAKES_DROUGHT_RUN fires when the longest no-stakes-raise run is ≥6', async () => {
      const recs757c = Array.from({ length: 10 }, (_, i) => makeRec757(i,
        (i === 0 || i === 1 || i === 2 || i === 9) ? { purpose: 'raise_stakes' } : {}
      ));
      const res = await runArc757(recs757c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_STAKES_DROUGHT_RUN'), 'ARC_STAKES_DROUGHT_RUN should fire');
    });

    // ARC_STAKES_DROUGHT_RUN no-fire:
    // stakes-raising at 0, 4, 9 → longest drought run = 4 (scenes 5-8) < 6
    it('ARC_STAKES_DROUGHT_RUN does not fire when stakes-raising scenes are distributed without a long drought', async () => {
      const recs757cn = Array.from({ length: 10 }, (_, i) => makeRec757(i,
        (i === 0 || i === 4 || i === 9) ? { purpose: 'raise_stakes' } : {}
      ));
      const res = await runArc757(recs757cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_STAKES_DROUGHT_RUN'), 'ARC_STAKES_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 743 — characterArcPass: arc character moment zone cluster, arc turn drought run, arc clock zone cluster', async () => {
    const makeRec743 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc743 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ARC_CHARACTER_MOMENT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; character-moment scenes at 0,1,2 → 100% opening third
    it('ARC_CHARACTER_MOMENT_ZONE_CLUSTER fires when >75% of character-moment scenes cluster in one third', async () => {
      const recs743a = Array.from({ length: 9 }, (_, i) => makeRec743(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'character_moment' } : {}
      ));
      const res = await runArc743(recs743a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_CHARACTER_MOMENT_ZONE_CLUSTER'), 'ARC_CHARACTER_MOMENT_ZONE_CLUSTER should fire');
    });

    // ARC_CHARACTER_MOMENT_ZONE_CLUSTER no-fire:
    // character-moment scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('ARC_CHARACTER_MOMENT_ZONE_CLUSTER does not fire when character-moment scenes are distributed across thirds', async () => {
      const recs743an = Array.from({ length: 9 }, (_, i) => makeRec743(i,
        (i === 0 || i === 4 || i === 7) ? { purpose: 'character_moment' } : {}
      ));
      const res = await runArc743(recs743an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_CHARACTER_MOMENT_ZONE_CLUSTER'), 'ARC_CHARACTER_MOMENT_ZONE_CLUSTER should not fire');
    });

    // ARC_TURN_DROUGHT_RUN fire:
    // 10 scenes; dramatic turns at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('ARC_TURN_DROUGHT_RUN fires when the longest no-dramatic-turn run is ≥6', async () => {
      const recs743b = Array.from({ length: 10 }, (_, i) => makeRec743(i,
        (i === 0 || i === 1 || i === 2 || i === 9) ? { dramaticTurn: 'reversal' } : {}
      ));
      const res = await runArc743(recs743b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_TURN_DROUGHT_RUN'), 'ARC_TURN_DROUGHT_RUN should fire');
    });

    // ARC_TURN_DROUGHT_RUN no-fire:
    // dramatic turns at 0, 4, 9 → longest drought run = 4 (scenes 5-8) < 6
    it('ARC_TURN_DROUGHT_RUN does not fire when dramatic turns are distributed without a long drought', async () => {
      const recs743bn = Array.from({ length: 10 }, (_, i) => makeRec743(i,
        (i === 0 || i === 4 || i === 9) ? { dramaticTurn: 'reversal' } : {}
      ));
      const res = await runArc743(recs743bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_TURN_DROUGHT_RUN'), 'ARC_TURN_DROUGHT_RUN should not fire');
    });

    // ARC_CLOCK_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; clockRaised scenes at 0,1,2 → 100% opening third
    it('ARC_CLOCK_ZONE_CLUSTER fires when >75% of clockRaised scenes cluster in one third', async () => {
      const recs743c = Array.from({ length: 9 }, (_, i) => makeRec743(i,
        (i === 0 || i === 1 || i === 2) ? { clockRaised: true } : {}
      ));
      const res = await runArc743(recs743c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_CLOCK_ZONE_CLUSTER'), 'ARC_CLOCK_ZONE_CLUSTER should fire');
    });

    // ARC_CLOCK_ZONE_CLUSTER no-fire:
    // clockRaised scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('ARC_CLOCK_ZONE_CLUSTER does not fire when clockRaised scenes are distributed across thirds', async () => {
      const recs743cn = Array.from({ length: 9 }, (_, i) => makeRec743(i,
        (i === 0 || i === 4 || i === 7) ? { clockRaised: true } : {}
      ));
      const res = await runArc743(recs743cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_CLOCK_ZONE_CLUSTER'), 'ARC_CLOCK_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 729 — characterArcPass: arc open thread zone cluster, arc character moment drought run, arc curiosity peak uncaused', async () => {
    const makeRec729 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc729 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ARC_OPEN_THREAD_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; open-thread scenes at 0,1,2 → 100% opening third
    it('ARC_OPEN_THREAD_ZONE_CLUSTER fires when >75% of open-thread scenes cluster in one third', async () => {
      const recs729a = Array.from({ length: 9 }, (_, i) => makeRec729(i,
        (i === 0 || i === 1 || i === 2) ? { unresolvedClues: ['clue-a'] } : {}
      ));
      const res = await runArc729(recs729a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_OPEN_THREAD_ZONE_CLUSTER'), 'ARC_OPEN_THREAD_ZONE_CLUSTER should fire');
    });

    // ARC_OPEN_THREAD_ZONE_CLUSTER no-fire:
    // open-thread scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('ARC_OPEN_THREAD_ZONE_CLUSTER does not fire when open-thread scenes are distributed across thirds', async () => {
      const recs729an = Array.from({ length: 9 }, (_, i) => makeRec729(i,
        (i === 0 || i === 4 || i === 7) ? { unresolvedClues: ['clue-a'] } : {}
      ));
      const res = await runArc729(recs729an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_OPEN_THREAD_ZONE_CLUSTER'), 'ARC_OPEN_THREAD_ZONE_CLUSTER should not fire');
    });

    // ARC_CHARACTER_MOMENT_DROUGHT_RUN fire:
    // 10 scenes; character moments at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('ARC_CHARACTER_MOMENT_DROUGHT_RUN fires when the longest no-character-moment run is ≥6', async () => {
      const recs729b = Array.from({ length: 10 }, (_, i) => makeRec729(i,
        (i === 0 || i === 1 || i === 2 || i === 9) ? { purpose: 'character_moment' } : {}
      ));
      const res = await runArc729(recs729b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_CHARACTER_MOMENT_DROUGHT_RUN'), 'ARC_CHARACTER_MOMENT_DROUGHT_RUN should fire');
    });

    // ARC_CHARACTER_MOMENT_DROUGHT_RUN no-fire:
    // character moments at 0, 4, 9 → longest drought run = 4 (scenes 5-8) < 6
    it('ARC_CHARACTER_MOMENT_DROUGHT_RUN does not fire when character moments are distributed without a long drought', async () => {
      const recs729bn = Array.from({ length: 10 }, (_, i) => makeRec729(i,
        (i === 0 || i === 4 || i === 9) ? { purpose: 'character_moment' } : {}
      ));
      const res = await runArc729(recs729bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_CHARACTER_MOMENT_DROUGHT_RUN'), 'ARC_CHARACTER_MOMENT_DROUGHT_RUN should not fire');
    });

    // ARC_CURIOSITY_PEAK_UNCAUSED fire:
    // 8 scenes; curiosity spikes at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('ARC_CURIOSITY_PEAK_UNCAUSED fires when the peak curiosity-spike scene has no dramatic turn or revelation nearby', async () => {
      const recs729c = Array.from({ length: 8 }, (_, i) => makeRec729(i,
        i === 2 ? { curiosityDelta: 1 }
        : i === 6 ? { curiosityDelta: 5 }
        : {}
      ));
      const res = await runArc729(recs729c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_CURIOSITY_PEAK_UNCAUSED'), 'ARC_CURIOSITY_PEAK_UNCAUSED should fire');
    });

    // ARC_CURIOSITY_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('ARC_CURIOSITY_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs729cn = Array.from({ length: 8 }, (_, i) => makeRec729(i,
        i === 2 ? { curiosityDelta: 1 }
        : i === 5 ? { dramaticTurn: 'reversal' }
        : i === 6 ? { curiosityDelta: 5 }
        : {}
      ));
      const res = await runArc729(recs729cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_CURIOSITY_PEAK_UNCAUSED'), 'ARC_CURIOSITY_PEAK_UNCAUSED should not fire');
    });
  });

  describe('Wave 715 — characterArcPass: arc resolution drought run, arc clock delta drought run, arc open thread peak uncaused', async () => {
    const makeRec715 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc715 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ARC_RESOLUTION_DROUGHT_RUN fire:
    // 10 scenes; payoffs at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('ARC_RESOLUTION_DROUGHT_RUN fires when the longest no-payoff run is ≥6', async () => {
      const recs715a = Array.from({ length: 10 }, (_, i) =>
        makeRec715(i, { payoffSetupIds: (i === 0 || i === 1 || i === 2 || i === 9) ? ['thread-a'] : [] })
      );
      const res = await runArc715(recs715a);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'ARC_RESOLUTION_DROUGHT_RUN'), 'ARC_RESOLUTION_DROUGHT_RUN should fire');
    });

    // ARC_RESOLUTION_DROUGHT_RUN no-fire:
    // payoffs at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('ARC_RESOLUTION_DROUGHT_RUN does not fire when payoffs are distributed without a long drought', async () => {
      const recs715an = Array.from({ length: 10 }, (_, i) =>
        makeRec715(i, { payoffSetupIds: (i === 0 || i === 4 || i === 9) ? ['thread-a'] : [] })
      );
      const res = await runArc715(recs715an);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'ARC_RESOLUTION_DROUGHT_RUN'), 'ARC_RESOLUTION_DROUGHT_RUN should not fire');
    });

    // ARC_CLOCK_DELTA_DROUGHT_RUN fire:
    // 10 scenes; clock advances at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('ARC_CLOCK_DELTA_DROUGHT_RUN fires when the longest no-clock-advance run is ≥6', async () => {
      const recs715b = Array.from({ length: 10 }, (_, i) =>
        makeRec715(i, { clockDelta: (i === 0 || i === 1 || i === 2 || i === 9) ? 1 : 0 })
      );
      const res = await runArc715(recs715b);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'ARC_CLOCK_DELTA_DROUGHT_RUN'), 'ARC_CLOCK_DELTA_DROUGHT_RUN should fire');
    });

    // ARC_CLOCK_DELTA_DROUGHT_RUN no-fire:
    // clock advances at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('ARC_CLOCK_DELTA_DROUGHT_RUN does not fire when clock advances are distributed without a long drought', async () => {
      const recs715bn = Array.from({ length: 10 }, (_, i) =>
        makeRec715(i, { clockDelta: (i === 0 || i === 4 || i === 9) ? 1 : 0 })
      );
      const res = await runArc715(recs715bn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'ARC_CLOCK_DELTA_DROUGHT_RUN'), 'ARC_CLOCK_DELTA_DROUGHT_RUN should not fire');
    });

    // ARC_OPEN_THREAD_PEAK_UNCAUSED fire:
    // 8 scenes; open threads at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('ARC_OPEN_THREAD_PEAK_UNCAUSED fires when the peak open-thread scene has no dramatic turn or revelation nearby', async () => {
      const recs715c = Array.from({ length: 8 }, (_, i) =>
        makeRec715(i, { unresolvedClues: i === 2 ? ['a'] : i === 6 ? ['a', 'b', 'c', 'd', 'e'] : [] })
      );
      const res = await runArc715(recs715c);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'ARC_OPEN_THREAD_PEAK_UNCAUSED'), 'ARC_OPEN_THREAD_PEAK_UNCAUSED should fire');
    });

    // ARC_OPEN_THREAD_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('ARC_OPEN_THREAD_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs715cn = Array.from({ length: 8 }, (_, i) =>
        makeRec715(i, {
          unresolvedClues: i === 2 ? ['a'] : i === 6 ? ['a', 'b', 'c', 'd', 'e'] : [],
          dramaticTurn: i === 5 ? 'reversal' : 'nothing',
        })
      );
      const res = await runArc715(recs715cn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'ARC_OPEN_THREAD_PEAK_UNCAUSED'), 'ARC_OPEN_THREAD_PEAK_UNCAUSED should not fire');
    });
  });

  describe('Wave 701 — characterArcPass: arc staging zone cluster, arc clock delta zone cluster, arc seed peak uncaused', async () => {
    const makeRec701 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc701 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ARC_STAGING_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; visually dense scenes at 0,1,2 → 100% opening third
    it('ARC_STAGING_ZONE_CLUSTER fires when >75% of visually dense scenes cluster in one third', async () => {
      const recs701a = Array.from({ length: 9 }, (_, i) =>
        makeRec701(i, { visualBeats: (i === 0 || i === 1 || i === 2) ? ['a', 'b'] : [] })
      );
      const res = await runArc701(recs701a);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'ARC_STAGING_ZONE_CLUSTER'), 'ARC_STAGING_ZONE_CLUSTER should fire');
    });

    // ARC_STAGING_ZONE_CLUSTER no-fire:
    // visually dense scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('ARC_STAGING_ZONE_CLUSTER does not fire when visually dense scenes are distributed across thirds', async () => {
      const recs701an = Array.from({ length: 9 }, (_, i) =>
        makeRec701(i, { visualBeats: (i === 0 || i === 4 || i === 7) ? ['a', 'b'] : [] })
      );
      const res = await runArc701(recs701an);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'ARC_STAGING_ZONE_CLUSTER'), 'ARC_STAGING_ZONE_CLUSTER should not fire');
    });

    // ARC_CLOCK_DELTA_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; clock-advancing scenes at 0,1,2 → 100% opening third
    it('ARC_CLOCK_DELTA_ZONE_CLUSTER fires when >75% of clock-advancing scenes cluster in one third', async () => {
      const recs701b = Array.from({ length: 9 }, (_, i) =>
        makeRec701(i, { clockDelta: (i === 0 || i === 1 || i === 2) ? 1 : 0 })
      );
      const res = await runArc701(recs701b);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'ARC_CLOCK_DELTA_ZONE_CLUSTER'), 'ARC_CLOCK_DELTA_ZONE_CLUSTER should fire');
    });

    // ARC_CLOCK_DELTA_ZONE_CLUSTER no-fire:
    // clock-advancing scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('ARC_CLOCK_DELTA_ZONE_CLUSTER does not fire when clock-advancing scenes are distributed across thirds', async () => {
      const recs701bn = Array.from({ length: 9 }, (_, i) =>
        makeRec701(i, { clockDelta: (i === 0 || i === 4 || i === 7) ? 1 : 0 })
      );
      const res = await runArc701(recs701bn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'ARC_CLOCK_DELTA_ZONE_CLUSTER'), 'ARC_CLOCK_DELTA_ZONE_CLUSTER should not fire');
    });

    // ARC_SEED_PEAK_UNCAUSED fire:
    // 8 scenes; seeds at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('ARC_SEED_PEAK_UNCAUSED fires when the peak seed scene has no dramatic turn or revelation nearby', async () => {
      const recs701c = Array.from({ length: 8 }, (_, i) =>
        makeRec701(i, { seededClueIds: i === 2 ? ['clue-a'] : i === 6 ? ['a', 'b', 'c', 'd', 'e'] : [] })
      );
      const res = await runArc701(recs701c);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'ARC_SEED_PEAK_UNCAUSED'), 'ARC_SEED_PEAK_UNCAUSED should fire');
    });

    // ARC_SEED_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('ARC_SEED_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs701cn = Array.from({ length: 8 }, (_, i) =>
        makeRec701(i, {
          seededClueIds: i === 2 ? ['clue-a'] : i === 6 ? ['a', 'b', 'c', 'd', 'e'] : [],
          dramaticTurn: i === 5 ? 'reversal' : 'nothing',
        })
      );
      const res = await runArc701(recs701cn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'ARC_SEED_PEAK_UNCAUSED'), 'ARC_SEED_PEAK_UNCAUSED should not fire');
    });
  });

  describe('Wave 687 — characterArcPass: arc payoff peak uncaused, arc staging drought run, arc highlight zone cluster', async () => {
    const makeRec687 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc687 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ARC_PAYOFF_PEAK_UNCAUSED fire:
    // 8 scenes; payoffs at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('ARC_PAYOFF_PEAK_UNCAUSED fires when the peak payoff scene has no dramatic turn or revelation nearby', async () => {
      const recs687a = Array.from({ length: 8 }, (_, i) =>
        makeRec687(i, { payoffSetupIds: i === 2 ? ['thread-a'] : i === 6 ? ['a', 'b', 'c', 'd', 'e'] : [] })
      );
      const res = await runArc687(recs687a);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'ARC_PAYOFF_PEAK_UNCAUSED'), 'ARC_PAYOFF_PEAK_UNCAUSED should fire');
    });

    // ARC_PAYOFF_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('ARC_PAYOFF_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs687an = Array.from({ length: 8 }, (_, i) =>
        makeRec687(i, {
          payoffSetupIds: i === 2 ? ['thread-a'] : i === 6 ? ['a', 'b', 'c', 'd', 'e'] : [],
          dramaticTurn: i === 5 ? 'reversal' : 'nothing',
        })
      );
      const res = await runArc687(recs687an);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'ARC_PAYOFF_PEAK_UNCAUSED'), 'ARC_PAYOFF_PEAK_UNCAUSED should not fire');
    });

    // ARC_STAGING_DROUGHT_RUN fire:
    // 10 scenes; visual beats at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('ARC_STAGING_DROUGHT_RUN fires when the longest no-visual-beat run is ≥6', async () => {
      const recs687b = Array.from({ length: 10 }, (_, i) =>
        makeRec687(i, { visualBeats: (i === 0 || i === 1 || i === 2 || i === 9) ? ['a beat'] : [] })
      );
      const res = await runArc687(recs687b);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'ARC_STAGING_DROUGHT_RUN'), 'ARC_STAGING_DROUGHT_RUN should fire');
    });

    // ARC_STAGING_DROUGHT_RUN no-fire:
    // visual beats at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('ARC_STAGING_DROUGHT_RUN does not fire when visual beats are distributed without a long drought', async () => {
      const recs687bn = Array.from({ length: 10 }, (_, i) =>
        makeRec687(i, { visualBeats: (i === 0 || i === 4 || i === 9) ? ['a beat'] : [] })
      );
      const res = await runArc687(recs687bn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'ARC_STAGING_DROUGHT_RUN'), 'ARC_STAGING_DROUGHT_RUN should not fire');
    });

    // ARC_HIGHLIGHT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; highlighted-dialogue scenes at 0,1,2 → 100% opening third
    it('ARC_HIGHLIGHT_ZONE_CLUSTER fires when >75% of highlighted-dialogue scenes cluster in one third', async () => {
      const recs687c = Array.from({ length: 9 }, (_, i) =>
        makeRec687(i, { dialogueHighlights: (i === 0 || i === 1 || i === 2) ? ['line-a'] : [] })
      );
      const res = await runArc687(recs687c);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'ARC_HIGHLIGHT_ZONE_CLUSTER'), 'ARC_HIGHLIGHT_ZONE_CLUSTER should fire');
    });

    // ARC_HIGHLIGHT_ZONE_CLUSTER no-fire:
    // highlighted-dialogue scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('ARC_HIGHLIGHT_ZONE_CLUSTER does not fire when highlighted-dialogue scenes are distributed across thirds', async () => {
      const recs687cn = Array.from({ length: 9 }, (_, i) =>
        makeRec687(i, { dialogueHighlights: (i === 0 || i === 4 || i === 7) ? ['line-a'] : [] })
      );
      const res = await runArc687(recs687cn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'ARC_HIGHLIGHT_ZONE_CLUSTER'), 'ARC_HIGHLIGHT_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 673 — characterArcPass: arc clock delta peak uncaused, arc highlight drought run, arc seed zone cluster', async () => {
    const makeRec673 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc673 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ARC_CLOCK_DELTA_PEAK_UNCAUSED fire:
    // 8 scenes; clockDelta at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('ARC_CLOCK_DELTA_PEAK_UNCAUSED fires when the peak clockDelta scene has no dramatic turn or revelation nearby', async () => {
      const recs673a = Array.from({ length: 8 }, (_, i) =>
        makeRec673(i, { clockDelta: i === 2 ? 1 : i === 6 ? 5 : 0 })
      );
      const res = await runArc673(recs673a);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'ARC_CLOCK_DELTA_PEAK_UNCAUSED'), 'ARC_CLOCK_DELTA_PEAK_UNCAUSED should fire');
    });

    // ARC_CLOCK_DELTA_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('ARC_CLOCK_DELTA_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs673an = Array.from({ length: 8 }, (_, i) =>
        makeRec673(i, {
          clockDelta: i === 2 ? 1 : i === 6 ? 5 : 0,
          dramaticTurn: i === 5 ? 'reversal' : 'nothing',
        })
      );
      const res = await runArc673(recs673an);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'ARC_CLOCK_DELTA_PEAK_UNCAUSED'), 'ARC_CLOCK_DELTA_PEAK_UNCAUSED should not fire');
    });

    // ARC_HIGHLIGHT_DROUGHT_RUN fire:
    // 10 scenes; highlights at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('ARC_HIGHLIGHT_DROUGHT_RUN fires when the longest no-highlighted-dialogue run is ≥6', async () => {
      const recs673b = Array.from({ length: 10 }, (_, i) =>
        makeRec673(i, { dialogueHighlights: (i === 0 || i === 1 || i === 2 || i === 9) ? ['line-x'] : [] })
      );
      const res = await runArc673(recs673b);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'ARC_HIGHLIGHT_DROUGHT_RUN'), 'ARC_HIGHLIGHT_DROUGHT_RUN should fire');
    });

    // ARC_HIGHLIGHT_DROUGHT_RUN no-fire:
    // highlights at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('ARC_HIGHLIGHT_DROUGHT_RUN does not fire when highlighted dialogue is distributed without a long drought', async () => {
      const recs673bn = Array.from({ length: 10 }, (_, i) =>
        makeRec673(i, { dialogueHighlights: (i === 0 || i === 4 || i === 9) ? ['line-x'] : [] })
      );
      const res = await runArc673(recs673bn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'ARC_HIGHLIGHT_DROUGHT_RUN'), 'ARC_HIGHLIGHT_DROUGHT_RUN should not fire');
    });

    // ARC_SEED_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; seed scenes at 0,1,2 → 100% opening third
    it('ARC_SEED_ZONE_CLUSTER fires when >75% of seed scenes cluster in one third', async () => {
      const recs673c = Array.from({ length: 9 }, (_, i) =>
        makeRec673(i, { seededClueIds: (i === 0 || i === 1 || i === 2) ? ['clue-a'] : [] })
      );
      const res = await runArc673(recs673c);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'ARC_SEED_ZONE_CLUSTER'), 'ARC_SEED_ZONE_CLUSTER should fire');
    });

    // ARC_SEED_ZONE_CLUSTER no-fire:
    // seed scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('ARC_SEED_ZONE_CLUSTER does not fire when seed scenes are distributed across thirds', async () => {
      const recs673cn = Array.from({ length: 9 }, (_, i) =>
        makeRec673(i, { seededClueIds: (i === 0 || i === 4 || i === 7) ? ['clue-a'] : [] })
      );
      const res = await runArc673(recs673cn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'ARC_SEED_ZONE_CLUSTER'), 'ARC_SEED_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 659 — characterArcPass: arc staging peak uncaused, arc open thread drought run, arc payoff zone cluster', async () => {
    const makeRec659 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc659 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ARC_STAGING_PEAK_UNCAUSED fire:
    // 8 scenes; staging at 2 (1 beat) and 6 (5 beats, the peak); no dramaticTurn or revelation at
    // 6, 5, or 4
    it('ARC_STAGING_PEAK_UNCAUSED fires when the peak physical-staging scene has no dramatic turn or revelation nearby', async () => {
      const recs659a = Array.from({ length: 8 }, (_, i) =>
        makeRec659(i, {
          visualBeats: i === 2 ? ['glances at the clock'] : i === 6 ? ['a', 'b', 'c', 'd', 'e'] : [],
        })
      );
      const res = await runArc659(recs659a);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'ARC_STAGING_PEAK_UNCAUSED'), 'ARC_STAGING_PEAK_UNCAUSED should fire');
    });

    // ARC_STAGING_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('ARC_STAGING_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs659an = Array.from({ length: 8 }, (_, i) =>
        makeRec659(i, {
          visualBeats: i === 2 ? ['glances at the clock'] : i === 6 ? ['a', 'b', 'c', 'd', 'e'] : [],
          dramaticTurn: i === 5 ? 'reversal' : 'nothing',
        })
      );
      const res = await runArc659(recs659an);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'ARC_STAGING_PEAK_UNCAUSED'), 'ARC_STAGING_PEAK_UNCAUSED should not fire');
    });

    // ARC_OPEN_THREAD_DROUGHT_RUN fire:
    // 10 scenes; debt at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('ARC_OPEN_THREAD_DROUGHT_RUN fires when the longest no-debt run is ≥6', async () => {
      const recs659b = Array.from({ length: 10 }, (_, i) =>
        makeRec659(i, { unresolvedClues: (i === 0 || i === 1 || i === 2 || i === 9) ? ['a'] : [] })
      );
      const res = await runArc659(recs659b);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'ARC_OPEN_THREAD_DROUGHT_RUN'), 'ARC_OPEN_THREAD_DROUGHT_RUN should fire');
    });

    // ARC_OPEN_THREAD_DROUGHT_RUN no-fire:
    // debt at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('ARC_OPEN_THREAD_DROUGHT_RUN does not fire when debt is distributed without a long drought', async () => {
      const recs659bn = Array.from({ length: 10 }, (_, i) =>
        makeRec659(i, { unresolvedClues: (i === 0 || i === 4 || i === 9) ? ['a'] : [] })
      );
      const res = await runArc659(recs659bn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'ARC_OPEN_THREAD_DROUGHT_RUN'), 'ARC_OPEN_THREAD_DROUGHT_RUN should not fire');
    });

    // ARC_PAYOFF_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; payoff scenes at 0,1,2 → 100% opening third
    it('ARC_PAYOFF_ZONE_CLUSTER fires when >75% of payoff scenes cluster in one third', async () => {
      const recs659c = Array.from({ length: 9 }, (_, i) =>
        makeRec659(i, { payoffSetupIds: (i === 0 || i === 1 || i === 2) ? ['thread-a'] : [] })
      );
      const res = await runArc659(recs659c);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'ARC_PAYOFF_ZONE_CLUSTER'), 'ARC_PAYOFF_ZONE_CLUSTER should fire');
    });

    // ARC_PAYOFF_ZONE_CLUSTER no-fire:
    // payoff scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('ARC_PAYOFF_ZONE_CLUSTER does not fire when payoff scenes are distributed across thirds', async () => {
      const recs659cn = Array.from({ length: 9 }, (_, i) =>
        makeRec659(i, { payoffSetupIds: (i === 0 || i === 4 || i === 7) ? ['thread-a'] : [] })
      );
      const res = await runArc659(recs659cn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'ARC_PAYOFF_ZONE_CLUSTER'), 'ARC_PAYOFF_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 645 — characterArcPass: arc highlight peak uncaused, arc seed drought run, arc open thread curiosity decoupled', async () => {
    const makeRec645 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc645 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ARC_HIGHLIGHT_PEAK_UNCAUSED fire:
    // 8 scenes; highlights at 2 (1 line) and 6 (5 lines, the peak); no dramaticTurn or revelation
    // at 6, 5, or 4
    it('ARC_HIGHLIGHT_PEAK_UNCAUSED fires when the peak highlighted-dialogue scene has no dramatic turn or revelation nearby', async () => {
      const recs645a = Array.from({ length: 8 }, (_, i) =>
        makeRec645(i, {
          dialogueHighlights: i === 2 ? ['line-a'] : i === 6 ? ['a', 'b', 'c', 'd', 'e'] : [],
        })
      );
      const res = await runArc645(recs645a);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'ARC_HIGHLIGHT_PEAK_UNCAUSED'), 'ARC_HIGHLIGHT_PEAK_UNCAUSED should fire');
    });

    // ARC_HIGHLIGHT_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('ARC_HIGHLIGHT_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs645an = Array.from({ length: 8 }, (_, i) =>
        makeRec645(i, {
          dialogueHighlights: i === 2 ? ['line-a'] : i === 6 ? ['a', 'b', 'c', 'd', 'e'] : [],
          dramaticTurn: i === 5 ? 'reversal' : 'nothing',
        })
      );
      const res = await runArc645(recs645an);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'ARC_HIGHLIGHT_PEAK_UNCAUSED'), 'ARC_HIGHLIGHT_PEAK_UNCAUSED should not fire');
    });

    // ARC_SEED_DROUGHT_RUN fire:
    // 10 scenes; seeded at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('ARC_SEED_DROUGHT_RUN fires when the longest no-seed run is ≥6', async () => {
      const recs645b = Array.from({ length: 10 }, (_, i) =>
        makeRec645(i, { seededClueIds: i === 0 || i === 1 || i === 2 || i === 9 ? ['clue-x'] : [] })
      );
      const res = await runArc645(recs645b);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'ARC_SEED_DROUGHT_RUN'), 'ARC_SEED_DROUGHT_RUN should fire');
    });

    // ARC_SEED_DROUGHT_RUN no-fire:
    // seeded at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('ARC_SEED_DROUGHT_RUN does not fire when seeding is distributed without a long drought', async () => {
      const recs645bn = Array.from({ length: 10 }, (_, i) =>
        makeRec645(i, { seededClueIds: i === 0 || i === 4 || i === 9 ? ['clue-x'] : [] })
      );
      const res = await runArc645(recs645bn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'ARC_SEED_DROUGHT_RUN'), 'ARC_SEED_DROUGHT_RUN should not fire');
    });

    // ARC_OPEN_THREAD_CURIOSITY_DECOUPLED fire:
    // n=6; open threads at 0,1 (no curiosity rise); curiosity rises at 4,5 (no open thread) →
    // zero overlap → fires
    it('ARC_OPEN_THREAD_CURIOSITY_DECOUPLED fires when open-thread scenes and rising-curiosity scenes never overlap', async () => {
      const recs645c = Array.from({ length: 6 }, (_, i) =>
        makeRec645(i, {
          unresolvedClues: i === 0 || i === 1 ? ['unpaid-clue'] : [],
          curiosityDelta: i === 4 || i === 5 ? 1 : 0,
        })
      );
      const res = await runArc645(recs645c);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'ARC_OPEN_THREAD_CURIOSITY_DECOUPLED'), 'ARC_OPEN_THREAD_CURIOSITY_DECOUPLED should fire');
    });

    // ARC_OPEN_THREAD_CURIOSITY_DECOUPLED no-fire:
    // scene 0 carries BOTH an open thread and a curiosity rise → overlap exists
    it('ARC_OPEN_THREAD_CURIOSITY_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs645cn = Array.from({ length: 6 }, (_, i) =>
        makeRec645(i, {
          unresolvedClues: i === 0 || i === 1 ? ['unpaid-clue'] : [],
          curiosityDelta: i === 0 || i === 5 ? 1 : 0,
        })
      );
      const res = await runArc645(recs645cn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'ARC_OPEN_THREAD_CURIOSITY_DECOUPLED'), 'ARC_OPEN_THREAD_CURIOSITY_DECOUPLED should not fire');
    });
  });

  describe('Wave 631 — characterArcPass: arc dialogue highlight staging decoupled, arc open thread staging aftermath void, arc dialogue highlight zone imbalance', async () => {
    const makeRec631 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc631 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ARC_DIALOGUE_HIGHLIGHT_STAGING_DECOUPLED fire:
    // n=6; highlights at 0,1 (no staging); staged at 4,5 (no highlight) → zero overlap → fires
    it('ARC_DIALOGUE_HIGHLIGHT_STAGING_DECOUPLED fires when dialogue highlights and visually-staged scenes never overlap', async () => {
      const recs631a = Array.from({ length: 6 }, (_, i) =>
        makeRec631(i, {
          dialogueHighlights: i === 0 || i === 1 ? ['a memorable line'] : [],
          visualBeats: i === 4 || i === 5 ? ['throws open the shutters', 'stares at the yard'] : [],
        })
      );
      const res = await runArc631(recs631a);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'ARC_DIALOGUE_HIGHLIGHT_STAGING_DECOUPLED'), 'ARC_DIALOGUE_HIGHLIGHT_STAGING_DECOUPLED should fire');
    });

    // ARC_DIALOGUE_HIGHLIGHT_STAGING_DECOUPLED no-fire:
    // scene 0 carries BOTH a highlight and visual staging → overlap exists
    it('ARC_DIALOGUE_HIGHLIGHT_STAGING_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs631an = Array.from({ length: 6 }, (_, i) =>
        makeRec631(i, {
          dialogueHighlights: i === 0 || i === 1 ? ['a memorable line'] : [],
          visualBeats: i === 0 || i === 5 ? ['throws open the shutters', 'stares at the yard'] : [],
        })
      );
      const res = await runArc631(recs631an);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'ARC_DIALOGUE_HIGHLIGHT_STAGING_DECOUPLED'), 'ARC_DIALOGUE_HIGHLIGHT_STAGING_DECOUPLED should not fire');
    });

    // ARC_OPEN_THREAD_STAGING_AFTERMATH_VOID fire:
    // n=8, window=2; heavy clue-debt triggers at 0,1; their windows {1,2} and {2,3} carry no
    // visually dense scene; staged scenes exist elsewhere at 5,6,7 → fires
    it('ARC_OPEN_THREAD_STAGING_AFTERMATH_VOID fires when heavy clue-debt scenes are never followed by a visually dense scene', async () => {
      const recs631b = Array.from({ length: 8 }, (_, i) =>
        makeRec631(i, {
          unresolvedClues: i === 0 || i === 1 ? ['c1', 'c2', 'c3'] : [],
          visualBeats: i === 5 || i === 6 || i === 7 ? ['throws open the shutters', 'stares at the yard'] : [],
        })
      );
      const res = await runArc631(recs631b);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'ARC_OPEN_THREAD_STAGING_AFTERMATH_VOID'), 'ARC_OPEN_THREAD_STAGING_AFTERMATH_VOID should fire');
    });

    // ARC_OPEN_THREAD_STAGING_AFTERMATH_VOID no-fire:
    // scene 3 (inside trigger 1's window {2,3}) now carries staging → that trigger's aftermath
    // is no longer void
    it('ARC_OPEN_THREAD_STAGING_AFTERMATH_VOID does not fire when a trigger window contains a visually dense scene', async () => {
      const recs631bn = Array.from({ length: 8 }, (_, i) =>
        makeRec631(i, {
          unresolvedClues: i === 0 || i === 1 ? ['c1', 'c2', 'c3'] : [],
          visualBeats: i === 3 || i === 5 || i === 6 || i === 7 ? ['throws open the shutters', 'stares at the yard'] : [],
        })
      );
      const res = await runArc631(recs631bn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'ARC_OPEN_THREAD_STAGING_AFTERMATH_VOID'), 'ARC_OPEN_THREAD_STAGING_AFTERMATH_VOID should not fire');
    });

    // ARC_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); highlights at 6,7,8,9; zone 2 (6-8)=3, zone 3 (9)=1, total=4;
    // zones 0,1 empty; bloatZoneIdx=zone2, 3/4=75% ≥ 50% → fires
    it('ARC_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE fires when one zone is empty of dialogue highlights while another is bloated', async () => {
      const recs631c = Array.from({ length: 12 }, (_, i) =>
        makeRec631(i, { dialogueHighlights: (i === 6 || i === 7 || i === 8 || i === 9) ? ['a memorable line'] : [] })
      );
      const res = await runArc631(recs631c);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'ARC_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE'), 'ARC_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE should fire');
    });

    // ARC_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE no-fire:
    // one highlight per zone (1,4,7,10) → no zone is empty
    it('ARC_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE does not fire when highlights are spread across all zones', async () => {
      const recs631cn = Array.from({ length: 12 }, (_, i) =>
        makeRec631(i, { dialogueHighlights: (i === 1 || i === 4 || i === 7 || i === 10) ? ['a memorable line'] : [] })
      );
      const res = await runArc631(recs631cn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'ARC_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE'), 'ARC_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 617 — characterArcPass: payoff visual beat decoupled, arc character moment zone imbalance, arc seed dialogue highlight aftermath void', async () => {
    const makeRec617 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc617 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // PAYOFF_VISUAL_BEAT_DECOUPLED fire:
    // n=6; payoffs at 0,1 (no staging); staged at 4,5 (no payoff) → zero overlap → fires
    it('PAYOFF_VISUAL_BEAT_DECOUPLED fires when payoff scenes and visually-staged scenes never overlap', async () => {
      const recs617a = Array.from({ length: 6 }, (_, i) =>
        makeRec617(i, {
          payoffSetupIds: i === 0 || i === 1 ? ['thread-a'] : [],
          visualBeats: i === 4 || i === 5 ? ['grips the railing', 'stares at the water'] : [],
        })
      );
      const res = await runArc617(recs617a);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'PAYOFF_VISUAL_BEAT_DECOUPLED'), 'PAYOFF_VISUAL_BEAT_DECOUPLED should fire');
    });

    // PAYOFF_VISUAL_BEAT_DECOUPLED no-fire:
    // scene 0 carries BOTH a payoff and visual staging → overlap exists
    it('PAYOFF_VISUAL_BEAT_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs617an = Array.from({ length: 6 }, (_, i) =>
        makeRec617(i, {
          payoffSetupIds: i === 0 || i === 1 ? ['thread-a'] : [],
          visualBeats: i === 0 || i === 5 ? ['grips the railing', 'stares at the water'] : [],
        })
      );
      const res = await runArc617(recs617an);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'PAYOFF_VISUAL_BEAT_DECOUPLED'), 'PAYOFF_VISUAL_BEAT_DECOUPLED should not fire');
    });

    // ARC_CHARACTER_MOMENT_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); character-moment scenes at 6,9,10,11;
    // zones 0 (0-2) and 1 (3-5) are empty; zone 3 (9-11) holds 3/4 = 75% ≥ 50% → fires
    it('ARC_CHARACTER_MOMENT_ZONE_IMBALANCE fires when one zone is empty of character-moment scenes while another is bloated', async () => {
      const recs617b = Array.from({ length: 12 }, (_, i) =>
        makeRec617(i, { purpose: (i === 6 || i === 9 || i === 10 || i === 11) ? 'character_moment' : 'complicate' })
      );
      const res = await runArc617(recs617b);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'ARC_CHARACTER_MOMENT_ZONE_IMBALANCE'), 'ARC_CHARACTER_MOMENT_ZONE_IMBALANCE should fire');
    });

    // ARC_CHARACTER_MOMENT_ZONE_IMBALANCE no-fire:
    // one character-moment scene per zone (1,4,7,10) → no zone is empty
    it('ARC_CHARACTER_MOMENT_ZONE_IMBALANCE does not fire when every zone has a character-moment scene', async () => {
      const recs617bn = Array.from({ length: 12 }, (_, i) =>
        makeRec617(i, { purpose: (i === 1 || i === 4 || i === 7 || i === 10) ? 'character_moment' : 'complicate' })
      );
      const res = await runArc617(recs617bn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'ARC_CHARACTER_MOMENT_ZONE_IMBALANCE'), 'ARC_CHARACTER_MOMENT_ZONE_IMBALANCE should not fire');
    });

    // ARC_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fire:
    // n=8, window=2; seed triggers at 0,1; their windows {1,2} and {2,3} carry no dialogue
    // highlight; highlights exist elsewhere at 5,6,7 → fires
    it('ARC_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when no seed is followed by a dialogue highlight within 2 scenes', async () => {
      const recs617c = Array.from({ length: 8 }, (_, i) =>
        makeRec617(i, {
          seededClueIds: i === 0 || i === 1 ? ['clue-a'] : [],
          dialogueHighlights: i === 5 || i === 6 || i === 7 ? ['a memorable line'] : [],
        })
      );
      const res = await runArc617(recs617c);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'ARC_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'ARC_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    // ARC_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID no-fire:
    // scene 3 (inside trigger 1's window {2,3}) now carries a highlight → that trigger's
    // aftermath is no longer void
    it('ARC_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a trigger window contains a dialogue highlight', async () => {
      const recs617cn = Array.from({ length: 8 }, (_, i) =>
        makeRec617(i, {
          seededClueIds: i === 0 || i === 1 ? ['clue-a'] : [],
          dialogueHighlights: i === 3 || i === 5 || i === 6 || i === 7 ? ['a memorable line'] : [],
        })
      );
      const res = await runArc617(recs617cn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'ARC_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'ARC_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 603 — characterArcPass: relationship shift/dialogue highlight decoupled, visual staging emotional flatness cluster, open thread emotional aftermath void', async () => {
    const makeRec603 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], dialogueHighlights: [], visualBeats: [],
      purpose: 'development',
      ...overrides,
    });
    const runArc603 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RELATIONSHIP_SHIFT_DIALOGUE_HIGHLIGHT_DECOUPLED fire:
    // n=8; rel shifts at 0,1 (no highlight); highlights at 2,3 (no rel shift) → zero overlap → fires
    it('RELATIONSHIP_SHIFT_DIALOGUE_HIGHLIGHT_DECOUPLED fires when relationship shifts and dialogue highlights never overlap', async () => {
      const recs603a = Array.from({ length: 8 }, (_, i) =>
        makeRec603(i, {
          relationshipShifts: i === 0 || i === 1 ? [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.5 }] : [],
          dialogueHighlights: i === 2 || i === 3 ? ['a memorable line'] : [],
        })
      );
      const res = await runArc603(recs603a);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'RELATIONSHIP_SHIFT_DIALOGUE_HIGHLIGHT_DECOUPLED'), 'RELATIONSHIP_SHIFT_DIALOGUE_HIGHLIGHT_DECOUPLED should fire');
    });

    // RELATIONSHIP_SHIFT_DIALOGUE_HIGHLIGHT_DECOUPLED no-fire:
    // scene 1 carries BOTH a relationship shift and a dialogue highlight → overlap exists
    it('RELATIONSHIP_SHIFT_DIALOGUE_HIGHLIGHT_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs603an = Array.from({ length: 8 }, (_, i) =>
        makeRec603(i, {
          relationshipShifts: i === 0 || i === 1 ? [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.5 }] : [],
          dialogueHighlights: i === 1 || i === 3 ? ['a memorable line'] : [],
        })
      );
      const res = await runArc603(recs603an);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'RELATIONSHIP_SHIFT_DIALOGUE_HIGHLIGHT_DECOUPLED'), 'RELATIONSHIP_SHIFT_DIALOGUE_HIGHLIGHT_DECOUPLED should not fire');
    });

    // VISUAL_STAGING_EMOTIONAL_FLATNESS_CLUSTER fire:
    // n=9 (thirds of 3); visually-staged+neutral scenes at 6,7,8 (closing third) — 3/3 = 100% ≥ 75% → fires
    it('VISUAL_STAGING_EMOTIONAL_FLATNESS_CLUSTER fires when visually-staged, emotionally flat scenes cluster in one third', async () => {
      const recs603b = Array.from({ length: 9 }, (_, i) =>
        makeRec603(i, {
          visualBeats: i === 6 || i === 7 || i === 8 ? ['examines the wreckage'] : [],
          emotionalShift: 'neutral',
        })
      );
      const res = await runArc603(recs603b);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'VISUAL_STAGING_EMOTIONAL_FLATNESS_CLUSTER'), 'VISUAL_STAGING_EMOTIONAL_FLATNESS_CLUSTER should fire');
    });

    // VISUAL_STAGING_EMOTIONAL_FLATNESS_CLUSTER no-fire:
    // one qualifying scene per third (1,4,7) → max zone ratio = 1/3 = 33% < 75%
    it('VISUAL_STAGING_EMOTIONAL_FLATNESS_CLUSTER does not fire when qualifying scenes spread evenly across thirds', async () => {
      const recs603bn = Array.from({ length: 9 }, (_, i) =>
        makeRec603(i, {
          visualBeats: i === 1 || i === 4 || i === 7 ? ['examines the wreckage'] : [],
          emotionalShift: 'neutral',
        })
      );
      const res = await runArc603(recs603bn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'VISUAL_STAGING_EMOTIONAL_FLATNESS_CLUSTER'), 'VISUAL_STAGING_EMOTIONAL_FLATNESS_CLUSTER should not fire');
    });

    // OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID fire:
    // n=8, window=2; heavy clue-debt triggers at 0,1; their windows {1,2} and {2,3} stay neutral;
    // emotional shifts exist elsewhere at 5,6,7 → fires
    it('OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID fires when heavy clue-debt scenes are never followed by an emotional shift', async () => {
      const recs603c = Array.from({ length: 8 }, (_, i) =>
        makeRec603(i, {
          unresolvedClues: i === 0 || i === 1 ? ['c1', 'c2', 'c3'] : [],
          emotionalShift: i === 5 || i === 6 || i === 7 ? 'positive' : 'neutral',
        })
      );
      const res = await runArc603(recs603c);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID'), 'OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    // OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID no-fire:
    // scene 3 (inside trigger 1's window {2,3}) now carries an emotional shift → that trigger's
    // aftermath is no longer void
    it('OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID does not fire when a trigger window contains an emotional shift', async () => {
      const recs603cn = Array.from({ length: 8 }, (_, i) =>
        makeRec603(i, {
          unresolvedClues: i === 0 || i === 1 ? ['c1', 'c2', 'c3'] : [],
          emotionalShift: i === 3 || i === 5 || i === 6 || i === 7 ? 'positive' : 'neutral',
        })
      );
      const res = await runArc603(recs603cn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID'), 'OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID should not fire');
    });
  });


  describe('Wave 589 — characterArcPass: dramatic-turn relational aftermath void, payoff curiosity aftermath void, emotional drought run', async () => {
    const makeRec589 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const runArc589 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ARC_DRAMATIC_TURN_RELATIONAL_AFTERMATH_VOID fire:
    // 10 scenes; turns at 0,3 (pos<9); rel shifts at 6,8 (not at 1,4) → fires
    it('ARC_DRAMATIC_TURN_RELATIONAL_AFTERMATH_VOID fires when no dramatic turn is followed by a relationship shift', async () => {
      const recs589a = Array.from({ length: 10 }, (_, i) =>
        makeRec589(i, {
          dramaticTurn: i === 0 || i === 3 ? 'reversal' : 'nothing',
          relationshipShifts: i === 6 || i === 8 ? [{ pairKey: 'alice|bob' }] : [],
        })
      );
      const res = await runArc589(recs589a);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'ARC_DRAMATIC_TURN_RELATIONAL_AFTERMATH_VOID'), 'ARC_DRAMATIC_TURN_RELATIONAL_AFTERMATH_VOID should fire');
    });

    // ARC_DRAMATIC_TURN_RELATIONAL_AFTERMATH_VOID no-fire:
    // rel shift at 1 (aftermath of turn at 0) → does not fire
    it('ARC_DRAMATIC_TURN_RELATIONAL_AFTERMATH_VOID does not fire when a turn is followed by a relationship shift', async () => {
      const recs589an = Array.from({ length: 10 }, (_, i) =>
        makeRec589(i, {
          dramaticTurn: i === 0 || i === 3 ? 'reversal' : 'nothing',
          relationshipShifts: i === 1 || i === 7 ? [{ pairKey: 'alice|bob' }] : [],
        })
      );
      const res = await runArc589(recs589an);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'ARC_DRAMATIC_TURN_RELATIONAL_AFTERMATH_VOID'), 'ARC_DRAMATIC_TURN_RELATIONAL_AFTERMATH_VOID should not fire');
    });

    // ARC_PAYOFF_CURIOSITY_AFTERMATH_VOID fire:
    // 10 scenes; payoffs at 0,3 (pos<9); curiosity spikes at 6,8 (not at 1,4) → fires
    it('ARC_PAYOFF_CURIOSITY_AFTERMATH_VOID fires when no payoff is followed by a curiosity spike', async () => {
      const recs589b = Array.from({ length: 10 }, (_, i) =>
        makeRec589(i, {
          payoffSetupIds: i === 0 || i === 3 ? ['thread-A'] : [],
          curiosityDelta: i === 6 || i === 8 ? 1 : 0,
        })
      );
      const res = await runArc589(recs589b);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'ARC_PAYOFF_CURIOSITY_AFTERMATH_VOID'), 'ARC_PAYOFF_CURIOSITY_AFTERMATH_VOID should fire');
    });

    // ARC_PAYOFF_CURIOSITY_AFTERMATH_VOID no-fire:
    // curiosity spike at 1 (aftermath of payoff at 0) → does not fire
    it('ARC_PAYOFF_CURIOSITY_AFTERMATH_VOID does not fire when a payoff is followed by a curiosity spike', async () => {
      const recs589bn = Array.from({ length: 10 }, (_, i) =>
        makeRec589(i, {
          payoffSetupIds: i === 0 || i === 3 ? ['thread-A'] : [],
          curiosityDelta: i === 1 || i === 7 ? 1 : 0,
        })
      );
      const res = await runArc589(recs589bn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'ARC_PAYOFF_CURIOSITY_AFTERMATH_VOID'), 'ARC_PAYOFF_CURIOSITY_AFTERMATH_VOID should not fire');
    });

    // ARC_EMOTIONAL_DROUGHT_RUN fire:
    // 12 scenes; emotional at 0,1,10,11; neutral at 2-9 → longest neutral run = 8 ≥ 7 → fires
    it('ARC_EMOTIONAL_DROUGHT_RUN fires when the longest neutral run is ≥7', async () => {
      const recs589c = Array.from({ length: 12 }, (_, i) =>
        makeRec589(i, { emotionalShift: i === 0 || i === 1 || i === 10 || i === 11 ? 'positive' : 'neutral' })
      );
      const res = await runArc589(recs589c);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'ARC_EMOTIONAL_DROUGHT_RUN'), 'ARC_EMOTIONAL_DROUGHT_RUN should fire');
    });

    // ARC_EMOTIONAL_DROUGHT_RUN no-fire:
    // 12 scenes; emotional at 0,1,2,3,9,10,11; neutral at 4-8 → longest neutral run = 5 < 7 → no fire
    it('ARC_EMOTIONAL_DROUGHT_RUN does not fire when the longest neutral run is under 7', async () => {
      const recs589cn = Array.from({ length: 12 }, (_, i) =>
        makeRec589(i, {
          emotionalShift: i <= 3 || i >= 9 ? 'positive' : 'neutral',
        })
      );
      const res = await runArc589(recs589cn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'ARC_EMOTIONAL_DROUGHT_RUN'), 'ARC_EMOTIONAL_DROUGHT_RUN should not fire');
    });
  });


  describe('Wave 575 — characterArcPass: curiosity zone cluster, clock drought run, suspense curiosity aftermath void', async () => {
    const makeRec575 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const runArc575 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records, structure: {} as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    it('ARC_CURIOSITY_ZONE_CLUSTER fires when >75% of curiosity spikes are in one structural third', async () => {
      // 9 scenes, thirds=[0-2],[3-5],[6-8]; 3 curiosity scenes all in opening (0,1,2) → 100% > 75%
      const recs575a = Array.from({ length: 9 }, (_, i) => makeRec575(i));
      recs575a[0] = makeRec575(0, { curiosityDelta: 1 });
      recs575a[1] = makeRec575(1, { curiosityDelta: 1 });
      recs575a[2] = makeRec575(2, { curiosityDelta: 1 });
      const res = await runArc575(recs575a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_CURIOSITY_ZONE_CLUSTER'), 'ARC_CURIOSITY_ZONE_CLUSTER should fire');
    });

    it('ARC_CURIOSITY_ZONE_CLUSTER does not fire when curiosity spikes are distributed across thirds', async () => {
      // one curiosity spike per third (0, 3, 7) → maxZone/total = 1/3 < 75%
      const recs575a = Array.from({ length: 9 }, (_, i) => makeRec575(i));
      recs575a[0] = makeRec575(0, { curiosityDelta: 1 });
      recs575a[3] = makeRec575(3, { curiosityDelta: 1 });
      recs575a[7] = makeRec575(7, { curiosityDelta: 1 });
      const res = await runArc575(recs575a);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_CURIOSITY_ZONE_CLUSTER'), 'ARC_CURIOSITY_ZONE_CLUSTER should not fire');
    });

    it('ARC_CLOCK_DROUGHT_RUN fires when ≥6 consecutive scenes have no raised clock', async () => {
      // 10 scenes; clocks at 0 and 7; non-clock run 1-6 = 6 consecutive → fires
      const recs575b = Array.from({ length: 10 }, (_, i) => makeRec575(i));
      recs575b[0] = makeRec575(0, { clockRaised: true });
      recs575b[7] = makeRec575(7, { clockRaised: true });
      recs575b[9] = makeRec575(9, { clockRaised: true });
      const res = await runArc575(recs575b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_CLOCK_DROUGHT_RUN'), 'ARC_CLOCK_DROUGHT_RUN should fire');
    });

    it('ARC_CLOCK_DROUGHT_RUN does not fire when clock scenes are distributed without a long drought', async () => {
      // 10 scenes; clocks at 0,3,6,9 → max non-clock run = 2 scenes < 6
      const recs575b = Array.from({ length: 10 }, (_, i) => makeRec575(i));
      recs575b[0] = makeRec575(0, { clockRaised: true });
      recs575b[3] = makeRec575(3, { clockRaised: true });
      recs575b[6] = makeRec575(6, { clockRaised: true });
      recs575b[9] = makeRec575(9, { clockRaised: true });
      const res = await runArc575(recs575b);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_CLOCK_DROUGHT_RUN'), 'ARC_CLOCK_DROUGHT_RUN should not fire');
    });

    it('ARC_SUSPENSE_CURIOSITY_AFTERMATH_VOID fires when no suspense spike is followed by curiosity within 2 scenes', async () => {
      // n=9; suspense at 1,4; curiosity at 7 (not within 2 of 1 or 4); qualifies → fires
      const recs575c = Array.from({ length: 9 }, (_, i) => makeRec575(i));
      recs575c[1] = makeRec575(1, { suspenseDelta: 1 });
      recs575c[4] = makeRec575(4, { suspenseDelta: 1 });
      recs575c[7] = makeRec575(7, { curiosityDelta: 1 });
      recs575c[8] = makeRec575(8, { curiosityDelta: 1 });
      const res = await runArc575(recs575c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_CURIOSITY_AFTERMATH_VOID'), 'ARC_SUSPENSE_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('ARC_SUSPENSE_CURIOSITY_AFTERMATH_VOID does not fire when a suspense spike is followed by curiosity within 2 scenes', async () => {
      // suspense at 1; curiosity at 2 (within 1 scene of suspense) → condition satisfied → no fire
      const recs575c = Array.from({ length: 9 }, (_, i) => makeRec575(i));
      recs575c[1] = makeRec575(1, { suspenseDelta: 1 });
      recs575c[2] = makeRec575(2, { curiosityDelta: 1 });
      recs575c[4] = makeRec575(4, { suspenseDelta: 1 });
      recs575c[7] = makeRec575(7, { curiosityDelta: 1 });
      const res = await runArc575(recs575c);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_CURIOSITY_AFTERMATH_VOID'), 'ARC_SUSPENSE_CURIOSITY_AFTERMATH_VOID should not fire');
    });
  });


  describe('Wave 561 — characterArcPass: suspense drought run, relational zone cluster, clock relational aftermath void', async () => {
    const makeRec561 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const runARC561 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // ARC_SUSPENSE_DROUGHT_RUN fire:
    // n=12; suspense-positive at i=0,1,2 (3 scenes); i=3-11 all suspenseDelta=0 → run of 9 ≥6 → fires
    it('ARC_SUSPENSE_DROUGHT_RUN fires when a run of 6+ consecutive scenes has no raised suspense', async () => {
      const recs561a = Array.from({ length: 12 }, (_, i) =>
        makeRec561(i, { suspenseDelta: [0, 1, 2].includes(i) ? 1 : 0 }),
      );
      const res = await runARC561(recs561a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_DROUGHT_RUN'), 'ARC_SUSPENSE_DROUGHT_RUN should fire');
    });

    // ARC_SUSPENSE_DROUGHT_RUN no-fire:
    // n=12; suspense at i=0,5,11 → longest non-suspense run is i=6..10 (5) < 6 → no fire
    it('ARC_SUSPENSE_DROUGHT_RUN does not fire when no non-suspense run reaches 6 scenes', async () => {
      const recs561anr = Array.from({ length: 12 }, (_, i) =>
        makeRec561(i, { suspenseDelta: [0, 5, 11].includes(i) ? 1 : 0 }),
      );
      const res = await runARC561(recs561anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_DROUGHT_RUN'), 'ARC_SUSPENSE_DROUGHT_RUN should not fire');
    });

    // ARC_RELATIONAL_ZONE_CLUSTER fire:
    // n=9; third=3; relShifts at i=3,4,5 (all middle third) → 3/3=100%>75% → fires
    it('ARC_RELATIONAL_ZONE_CLUSTER fires when >75% of relationship shifts fall in a single structural third', async () => {
      const recs561b = Array.from({ length: 9 }, (_, i) =>
        makeRec561(i, {
          relationshipShifts: [3, 4, 5].includes(i) ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.3 }] : [],
        }),
      );
      const res = await runARC561(recs561b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_RELATIONAL_ZONE_CLUSTER'), 'ARC_RELATIONAL_ZONE_CLUSTER should fire');
    });

    // ARC_RELATIONAL_ZONE_CLUSTER no-fire:
    // n=9; relShifts at i=1,4,7 → one per third, max 1/3=33%≤75% → no fire
    it('ARC_RELATIONAL_ZONE_CLUSTER does not fire when relationship shifts are spread across thirds', async () => {
      const recs561bnr = Array.from({ length: 9 }, (_, i) =>
        makeRec561(i, {
          relationshipShifts: [1, 4, 7].includes(i) ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.3 }] : [],
        }),
      );
      const res = await runARC561(recs561bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_RELATIONAL_ZONE_CLUSTER'), 'ARC_RELATIONAL_ZONE_CLUSTER should not fire');
    });

    // ARC_CLOCK_RELATIONAL_AFTERMATH_VOID fire:
    // n=8; clockRaised at i=0,1 (pos<7); relShifts at i=5,6 (not within 2 of any clock scene) → fires
    it('ARC_CLOCK_RELATIONAL_AFTERMATH_VOID fires when no clock-raised scene is followed by a relationship shift', async () => {
      const recs561c = Array.from({ length: 8 }, (_, i) =>
        makeRec561(i, {
          clockRaised: [0, 1].includes(i),
          relationshipShifts: [5, 6].includes(i) ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.3 }] : [],
        }),
      );
      const res = await runARC561(recs561c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_CLOCK_RELATIONAL_AFTERMATH_VOID'), 'ARC_CLOCK_RELATIONAL_AFTERMATH_VOID should fire');
    });

    // ARC_CLOCK_RELATIONAL_AFTERMATH_VOID no-fire:
    // n=8; clockRaised at i=0,1; relShift at i=2 (within 2 of clock at 0) and i=6 → anyClockFollowed → no fire
    it('ARC_CLOCK_RELATIONAL_AFTERMATH_VOID does not fire when a clock-raised scene is followed by a relationship shift', async () => {
      const recs561cnr = Array.from({ length: 8 }, (_, i) =>
        makeRec561(i, {
          clockRaised: [0, 1].includes(i),
          relationshipShifts: [2, 6].includes(i) ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.3 }] : [],
        }),
      );
      const res = await runARC561(recs561cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_CLOCK_RELATIONAL_AFTERMATH_VOID'), 'ARC_CLOCK_RELATIONAL_AFTERMATH_VOID should not fire');
    });
  });


  describe('Wave 547 — characterArcPass: suspense opening zone absent, negative relational aftermath void, payoff front-loaded', async () => {
    const makeRec547 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const runARC547 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // ARC_SUSPENSE_OPENING_ZONE_ABSENT fire:
    // n=9; third=3; suspense at i=4,6,8 (all≥3); opening third 0-2 has none → fires
    it('ARC_SUSPENSE_OPENING_ZONE_ABSENT fires when opening structural third has no suspense-positive scenes', async () => {
      const recs547a = Array.from({ length: 9 }, (_, i) =>
        makeRec547(i, { suspenseDelta: [4, 6, 8].includes(i) ? 1 : 0 }),
      );
      const res = await runARC547(recs547a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_OPENING_ZONE_ABSENT'), 'ARC_SUSPENSE_OPENING_ZONE_ABSENT should fire');
    });

    // ARC_SUSPENSE_OPENING_ZONE_ABSENT no-fire:
    // suspense at i=1,4,6 — i=1 is in opening third (1<3) → not empty → no fire
    it('ARC_SUSPENSE_OPENING_ZONE_ABSENT does not fire when the opening third has at least one suspense-positive scene', async () => {
      const recs547anr = Array.from({ length: 9 }, (_, i) =>
        makeRec547(i, { suspenseDelta: [1, 4, 6].includes(i) ? 1 : 0 }),
      );
      const res = await runARC547(recs547anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_OPENING_ZONE_ABSENT'), 'ARC_SUSPENSE_OPENING_ZONE_ABSENT should not fire');
    });

    // ARC_NEGATIVE_RELATIONAL_AFTERMATH_VOID fire:
    // n=10; negative scenes at i=2,5 (pos<8); relShifts at i=0,9 (not within 2 of neg scenes)
    // qualNeg=[{pos:2},{pos:5}]≥2; relShiftScenes≥2; neither neg scene followed by relShift in 2 → fires
    it('ARC_NEGATIVE_RELATIONAL_AFTERMATH_VOID fires when no negative-emotion scene is followed by a relationship shift', async () => {
      const recs547b = Array.from({ length: 10 }, (_, i) =>
        makeRec547(i, {
          emotionalShift: [2, 5].includes(i) ? 'negative' : 'neutral',
          relationshipShifts: [0, 9].includes(i) ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.3 }] : [],
        }),
      );
      const res = await runARC547(recs547b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_NEGATIVE_RELATIONAL_AFTERMATH_VOID'), 'ARC_NEGATIVE_RELATIONAL_AFTERMATH_VOID should fire');
    });

    // ARC_NEGATIVE_RELATIONAL_AFTERMATH_VOID no-fire:
    // relShift at i=4 (within 2 of neg scene at i=2? pos=2, next2=records[4] → yes) → anyFollowed=true → no fire
    it('ARC_NEGATIVE_RELATIONAL_AFTERMATH_VOID does not fire when a negative scene is followed by a relationship shift', async () => {
      const recs547bnr = Array.from({ length: 10 }, (_, i) =>
        makeRec547(i, {
          emotionalShift: [2, 5].includes(i) ? 'negative' : 'neutral',
          relationshipShifts: [0, 4].includes(i) ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.3 }] : [],
        }),
      );
      const res = await runARC547(recs547bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_NEGATIVE_RELATIONAL_AFTERMATH_VOID'), 'ARC_NEGATIVE_RELATIONAL_AFTERMATH_VOID should not fire');
    });

    // ARC_PAYOFF_FRONT_LOADED fire:
    // n=10; half=5; payoffs at i=0,1,2,3,8 (5 total); front(0-4)=4, back=1; 4/5=80%>70% → fires
    it('ARC_PAYOFF_FRONT_LOADED fires when more than 70% of payoff scenes fall in the first half', async () => {
      const recs547c = Array.from({ length: 10 }, (_, i) =>
        makeRec547(i, {
          payoffSetupIds: [0, 1, 2, 3, 8].includes(i) ? ['setup-x'] : [],
        }),
      );
      const res = await runARC547(recs547c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_PAYOFF_FRONT_LOADED'), 'ARC_PAYOFF_FRONT_LOADED should fire');
    });

    // ARC_PAYOFF_FRONT_LOADED no-fire:
    // payoffs at i=1,2,5,7 (4 total); front(0-4)=2, back=2; 2/4=50%≤70% → no fire
    it('ARC_PAYOFF_FRONT_LOADED does not fire when payoff scenes are not concentrated in the first half', async () => {
      const recs547cnr = Array.from({ length: 10 }, (_, i) =>
        makeRec547(i, {
          payoffSetupIds: [1, 2, 5, 7].includes(i) ? ['setup-x'] : [],
        }),
      );
      const res = await runARC547(recs547cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_PAYOFF_FRONT_LOADED'), 'ARC_PAYOFF_FRONT_LOADED should not fire');
    });
  });


  describe('Wave 533 — characterArcPass: curiosity peak relational void, dramatic-turn emotional aftermath void, curiosity back-loaded', async () => {
    const makeRec533 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCA533 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ARC_CURIOSITY_PEAK_RELATIONAL_VOID fires when peak curiosity scene has no relationship shift', async () => {
      // 8 scenes: curiosity peaks at pos 3 (curiosityDelta=5, no relShift);
      // relShifts at pos 1,6; another curiosity scene at pos 5 (curiosityDelta=1) → fires.
      // pairKey required by existing charsWithRelArc logic in characterArcPass.
      const recs533a = Array.from({ length: 8 }, (_, i) =>
        makeRec533(i, {
          curiosityDelta: i === 3 ? 5 : i === 5 ? 1 : 0,
          relationshipShifts: [1, 6].includes(i) ? [{ from: 'A', to: 'B', nature: 'closer', pairKey: 'A|B' }] : [],
        })
      );
      const res = await runCA533(recs533a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_CURIOSITY_PEAK_RELATIONAL_VOID'), 'ARC_CURIOSITY_PEAK_RELATIONAL_VOID should fire');
    });

    it('ARC_CURIOSITY_PEAK_RELATIONAL_VOID does not fire when peak curiosity scene has a relationship shift', async () => {
      // Same but the peak curiosity scene (pos 3) now has a relShift → no fire
      const recs533anr = Array.from({ length: 8 }, (_, i) =>
        makeRec533(i, {
          curiosityDelta: i === 3 ? 5 : i === 5 ? 1 : 0,
          relationshipShifts: [1, 3, 6].includes(i) ? [{ from: 'A', to: 'B', nature: 'closer', pairKey: 'A|B' }] : [],
        })
      );
      const res = await runCA533(recs533anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_CURIOSITY_PEAK_RELATIONAL_VOID'), 'ARC_CURIOSITY_PEAK_RELATIONAL_VOID should not fire');
    });

    it('ARC_DRAMATIC_TURN_EMOTIONAL_AFTERMATH_VOID fires when all dramatic-turn aftermaths are emotionally neutral', async () => {
      // 9 scenes: dramatic turns at pos 1,3,5 (not at last pos 8);
      // following scenes (pos 2,4,6) all have emotionalShift='neutral' → fires
      const recs533b = Array.from({ length: 9 }, (_, i) =>
        makeRec533(i, { dramaticTurn: [1, 3, 5].includes(i) ? 'reversal' : 'nothing' })
      );
      const res = await runCA533(recs533b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_DRAMATIC_TURN_EMOTIONAL_AFTERMATH_VOID'), 'ARC_DRAMATIC_TURN_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('ARC_DRAMATIC_TURN_EMOTIONAL_AFTERMATH_VOID does not fire when a dramatic-turn aftermath is emotional', async () => {
      // Same but scene 2 (after turn at 1) now has emotionalShift='negative' → anyTurnAftermathEmotional=true → no fire
      const recs533bnr = Array.from({ length: 9 }, (_, i) =>
        makeRec533(i, {
          dramaticTurn: [1, 3, 5].includes(i) ? 'reversal' : 'nothing',
          emotionalShift: i === 2 ? 'negative' : 'neutral',
        })
      );
      const res = await runCA533(recs533bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_DRAMATIC_TURN_EMOTIONAL_AFTERMATH_VOID'), 'ARC_DRAMATIC_TURN_EMOTIONAL_AFTERMATH_VOID should not fire');
    });

    it('ARC_CURIOSITY_BACK_LOADED fires when >70% of curiosity scenes are in second half', async () => {
      // 10 scenes; half=5; curiosity at pos 1,6,7,8 → frontCount=1, backCount=3; 3/4=75% > 70% → fires
      const recs533c = Array.from({ length: 10 }, (_, i) =>
        makeRec533(i, { curiosityDelta: [1, 6, 7, 8].includes(i) ? 2 : 0 })
      );
      const res = await runCA533(recs533c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_CURIOSITY_BACK_LOADED'), 'ARC_CURIOSITY_BACK_LOADED should fire');
    });

    it('ARC_CURIOSITY_BACK_LOADED does not fire when curiosity is spread across both halves', async () => {
      // 10 scenes; half=5; curiosity at pos 1,2,6,7 → frontCount=2, backCount=2; 2/4=50% ≤ 70% → no fire
      const recs533cnr = Array.from({ length: 10 }, (_, i) =>
        makeRec533(i, { curiosityDelta: [1, 2, 6, 7].includes(i) ? 2 : 0 })
      );
      const res = await runCA533(recs533cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_CURIOSITY_BACK_LOADED'), 'ARC_CURIOSITY_BACK_LOADED should not fire');
    });
  });


  describe('Wave 519 — characterArcPass: curiosity drought run, suspense front-loaded, clock opening zone absent', async () => {
    const makeRec519 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCA519 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({
        fountain: '', original: '', records,
        structure: { revelationCount: 0, completionPercent: 50, approachingClimax: false } as any,
        annotations: [], approvedSpans: [],
      });
    };

    it('ARC_CURIOSITY_DROUGHT_RUN fires when curiosity-positive scenes exist but ≥6 consecutive scenes have no curiosity rise', async () => {
      // 12 scenes: curiosity at 0 and 1, then a 6-scene drought, then curiosity at 8 — longest dry run = 6
      const recs519a = Array.from({ length: 12 }, (_, i) =>
        makeRec519(i, { curiosityDelta: [0, 1, 8].includes(i) ? 1 : 0 }),
      );
      const res = await runCA519(recs519a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_CURIOSITY_DROUGHT_RUN'), 'ARC_CURIOSITY_DROUGHT_RUN should fire');
    });

    it('ARC_CURIOSITY_DROUGHT_RUN does not fire when the longest curiosity-flat run is < 6', async () => {
      // 12 scenes: curiosity at 0, 3, 6, 9 — longest dry run = 2 scenes between each
      const recs519an = Array.from({ length: 12 }, (_, i) =>
        makeRec519(i, { curiosityDelta: i % 3 === 0 ? 1 : 0 }),
      );
      const res = await runCA519(recs519an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_CURIOSITY_DROUGHT_RUN'), 'ARC_CURIOSITY_DROUGHT_RUN should not fire');
    });

    it('ARC_SUSPENSE_FRONT_LOADED fires when >70% of suspense scenes fall in the first half', async () => {
      // 10 scenes: suspense in 0,1,2,3 (first half) and 7 (second half) — 4/5 = 80% front-loaded
      const recs519b = Array.from({ length: 10 }, (_, i) =>
        makeRec519(i, { suspenseDelta: [0, 1, 2, 3, 7].includes(i) ? 1 : 0 }),
      );
      const res = await runCA519(recs519b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_FRONT_LOADED'), 'ARC_SUSPENSE_FRONT_LOADED should fire');
    });

    it('ARC_SUSPENSE_FRONT_LOADED does not fire when suspense is evenly distributed', async () => {
      // 10 scenes: suspense in 1,2,6,7 — 2/4 = 50% front-loaded (not >70%)
      const recs519bn = Array.from({ length: 10 }, (_, i) =>
        makeRec519(i, { suspenseDelta: [1, 2, 6, 7].includes(i) ? 1 : 0 }),
      );
      const res = await runCA519(recs519bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_FRONT_LOADED'), 'ARC_SUSPENSE_FRONT_LOADED should not fire');
    });

    it('ARC_CLOCK_OPENING_ZONE_ABSENT fires when ≥3 clockRaised scenes exist but none in the opening third', async () => {
      // 9 scenes: opening third = scenes 0-2; clockRaised only in scenes 4, 6, 8
      const recs519c = Array.from({ length: 9 }, (_, i) =>
        makeRec519(i, { clockRaised: [4, 6, 8].includes(i) }),
      );
      const res = await runCA519(recs519c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_CLOCK_OPENING_ZONE_ABSENT'), 'ARC_CLOCK_OPENING_ZONE_ABSENT should fire');
    });

    it('ARC_CLOCK_OPENING_ZONE_ABSENT does not fire when a clock scene exists in the opening third', async () => {
      // 9 scenes: clockRaised in scenes 1, 4, 7 — scene 1 is in the opening third (0-2)
      const recs519cn = Array.from({ length: 9 }, (_, i) =>
        makeRec519(i, { clockRaised: [1, 4, 7].includes(i) }),
      );
      const res = await runCA519(recs519cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_CLOCK_OPENING_ZONE_ABSENT'), 'ARC_CLOCK_OPENING_ZONE_ABSENT should not fire');
    });
  });


  describe('Wave 505 — characterArcPass: seed emotional aftermath void, clock curiosity aftermath void, payoff drought run', async () => {
    const makeRec505 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runA505 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ARC_SEED_EMOTIONAL_AFTERMATH_VOID fires when all seed scenes are followed by neutral scenes', async () => {
      // n=10; seeds at pos 2,5 (not last); pos 3,6 are neutral; total ≥ 2 → all neutral aftermath → fire
      const recs505a = Array.from({ length: 10 }, (_, i) =>
        makeRec505(i, {
          seededClueIds: [2, 5].includes(i) ? ['clue-A'] : [],
          emotionalShift: [1, 7].includes(i) ? 'positive' : 'neutral',
        }),
      );
      const res = await runA505(recs505a);
      assert.ok(res.issues.some((is: any) => is.rule === 'ARC_SEED_EMOTIONAL_AFTERMATH_VOID'), 'ARC_SEED_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('ARC_SEED_EMOTIONAL_AFTERMATH_VOID does not fire when a seed is followed by a non-neutral scene', async () => {
      // n=10; seeds at pos 2,5; pos 3 is 'positive' (emotional aftermath) → not all neutral → no fire
      const recs505anr = Array.from({ length: 10 }, (_, i) =>
        makeRec505(i, {
          seededClueIds: [2, 5].includes(i) ? ['clue-B'] : [],
          emotionalShift: i === 3 ? 'positive' : 'neutral',
        }),
      );
      const res = await runA505(recs505anr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'ARC_SEED_EMOTIONAL_AFTERMATH_VOID'), 'ARC_SEED_EMOTIONAL_AFTERMATH_VOID should not fire');
    });

    it('ARC_CLOCK_CURIOSITY_AFTERMATH_VOID fires when avg post-clock curiosity is <= 0', async () => {
      // n=10; clocks raised at pos 2,5 (not last); scenes 3,6 both have curiosityDelta=0 → avg=0 ≤ 0 → fire
      const recs505b = Array.from({ length: 10 }, (_, i) =>
        makeRec505(i, {
          clockRaised: [2, 5].includes(i),
          curiosityDelta: 0,
        }),
      );
      const res = await runA505(recs505b);
      assert.ok(res.issues.some((is: any) => is.rule === 'ARC_CLOCK_CURIOSITY_AFTERMATH_VOID'), 'ARC_CLOCK_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('ARC_CLOCK_CURIOSITY_AFTERMATH_VOID does not fire when avg post-clock curiosity is > 0', async () => {
      // n=10; clocks at pos 2,5; scene 3 has curiosityDelta=3, scene 6 has 0 → avg=1.5 > 0 → no fire
      const recs505bnr = Array.from({ length: 10 }, (_, i) =>
        makeRec505(i, {
          clockRaised: [2, 5].includes(i),
          curiosityDelta: i === 3 ? 3 : 0,
        }),
      );
      const res = await runA505(recs505bnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'ARC_CLOCK_CURIOSITY_AFTERMATH_VOID'), 'ARC_CLOCK_CURIOSITY_AFTERMATH_VOID should not fire');
    });

    it('ARC_PAYOFF_DROUGHT_RUN fires when the longest payoff-free run is >= 6', async () => {
      // n=12; payoffs at pos 1 and 9 → gap of 7 between them (pos 2-8) → maxDrought=7 ≥ 6 → fire
      const recs505c = Array.from({ length: 12 }, (_, i) =>
        makeRec505(i, { payoffSetupIds: [1, 9].includes(i) ? ['setup-Y'] : [] }),
      );
      const res = await runA505(recs505c);
      assert.ok(res.issues.some((is: any) => is.rule === 'ARC_PAYOFF_DROUGHT_RUN'), 'ARC_PAYOFF_DROUGHT_RUN should fire');
    });

    it('ARC_PAYOFF_DROUGHT_RUN does not fire when no payoff-free run reaches 6', async () => {
      // n=12; payoffs at pos 1,4,8 → gaps: 2 (2-3), 3 (5-7), 3 (9-11) → maxDrought=3 < 6 → no fire
      const recs505cnr = Array.from({ length: 12 }, (_, i) =>
        makeRec505(i, { payoffSetupIds: [1, 4, 8].includes(i) ? ['setup-Z'] : [] }),
      );
      const res = await runA505(recs505cnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'ARC_PAYOFF_DROUGHT_RUN'), 'ARC_PAYOFF_DROUGHT_RUN should not fire');
    });
  });


  describe('Wave 491 — characterArcPass: clock peak emotion absent, payoff emotion decoupled, payoff aftermath emotional void', async () => {
    const makeRec491 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runA491 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ARC_CLOCK_PEAK_EMOTION_ABSENT fires when the highest-clockDelta scene is emotionally neutral', async () => {
      // n=8; clockDelta=5 at pos 3 (neutral); emotional scenes at 1 (positive) and 6 (negative)
      const recs491a = Array.from({ length: 8 }, (_, i) =>
        makeRec491(i, {
          clockDelta: i === 3 ? 5 : 0,
          emotionalShift: i === 1 ? 'positive' : i === 6 ? 'negative' : 'neutral',
        }),
      );
      const res = await runA491(recs491a);
      assert.ok(res.issues.some((is: any) => is.rule === 'ARC_CLOCK_PEAK_EMOTION_ABSENT'), 'ARC_CLOCK_PEAK_EMOTION_ABSENT should fire');
    });

    it('ARC_CLOCK_PEAK_EMOTION_ABSENT does not fire when the peak-clockDelta scene has emotion', async () => {
      // Same but scene 3 (peak clockDelta) is now 'negative' → not neutral → no fire
      const recs491anr = Array.from({ length: 8 }, (_, i) =>
        makeRec491(i, {
          clockDelta: i === 3 ? 5 : 0,
          emotionalShift: i === 1 ? 'positive' : [3, 6].includes(i) ? 'negative' : 'neutral',
        }),
      );
      const res = await runA491(recs491anr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'ARC_CLOCK_PEAK_EMOTION_ABSENT'), 'ARC_CLOCK_PEAK_EMOTION_ABSENT should not fire');
    });

    it('ARC_PAYOFF_EMOTION_DECOUPLED fires when all payoff scenes are emotionally neutral', async () => {
      // n=8; payoffs at 1,3,5 (all neutral); emotional at 0 (positive) and 6 (negative)
      const recs491b = Array.from({ length: 8 }, (_, i) =>
        makeRec491(i, {
          payoffSetupIds: [1, 3, 5].includes(i) ? ['setup-1'] : [],
          emotionalShift: i === 0 ? 'positive' : i === 6 ? 'negative' : 'neutral',
        }),
      );
      const res = await runA491(recs491b);
      assert.ok(res.issues.some((is: any) => is.rule === 'ARC_PAYOFF_EMOTION_DECOUPLED'), 'ARC_PAYOFF_EMOTION_DECOUPLED should fire');
    });

    it('ARC_PAYOFF_EMOTION_DECOUPLED does not fire when at least one payoff scene has emotion', async () => {
      // Same but scene 3 (payoff) is now 'positive' → not all neutral → no fire
      const recs491bnr = Array.from({ length: 8 }, (_, i) =>
        makeRec491(i, {
          payoffSetupIds: [1, 3, 5].includes(i) ? ['setup-1'] : [],
          emotionalShift: i === 3 ? 'positive' : i === 6 ? 'negative' : 'neutral',
        }),
      );
      const res = await runA491(recs491bnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'ARC_PAYOFF_EMOTION_DECOUPLED'), 'ARC_PAYOFF_EMOTION_DECOUPLED should not fire');
    });

    it('ARC_PAYOFF_AFTERMATH_EMOTIONAL_VOID fires when every payoff scene is followed by a neutral scene', async () => {
      // n=8; payoffs at 0,2,4 (not last); scenes 1,3,5 (aftermaths) all neutral → fire
      const recs491c = Array.from({ length: 8 }, (_, i) =>
        makeRec491(i, {
          payoffSetupIds: [0, 2, 4].includes(i) ? ['setup-1'] : [],
        }),
      );
      const res = await runA491(recs491c);
      assert.ok(res.issues.some((is: any) => is.rule === 'ARC_PAYOFF_AFTERMATH_EMOTIONAL_VOID'), 'ARC_PAYOFF_AFTERMATH_EMOTIONAL_VOID should fire');
    });

    it('ARC_PAYOFF_AFTERMATH_EMOTIONAL_VOID does not fire when a payoff aftermath has emotion', async () => {
      // Same but scene 1 (aftermath of payoff at 0) is now 'positive' → not all neutral → no fire
      const recs491cnr = Array.from({ length: 8 }, (_, i) =>
        makeRec491(i, {
          payoffSetupIds: [0, 2, 4].includes(i) ? ['setup-1'] : [],
          emotionalShift: i === 1 ? 'positive' : 'neutral',
        }),
      );
      const res = await runA491(recs491cnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'ARC_PAYOFF_AFTERMATH_EMOTIONAL_VOID'), 'ARC_PAYOFF_AFTERMATH_EMOTIONAL_VOID should not fire');
    });
  });


  describe('Wave 477 — characterArcPass: positive relational aftermath void, turn zone cluster, peak positive uncaused', async () => {
    const makeRec477 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const mkShift477 = (amount: number) => [{ pairKey: 'ALICE-BOB', dimension: 'trust', amount }];
    const runA477 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ARC_POSITIVE_RELATIONAL_AFTERMATH_VOID fires when all positive scenes are followed by 2 relational-silent scenes', async () => {
      // n=8; positive at 1,4 (not last); scenes 2,3 and 5,6 have no relationship shifts → fires
      // Non-positive scenes 0,7 also have no shifts; scene 0 carries no shift
      const recs477a = Array.from({ length: 8 }, (_, i) =>
        makeRec477(i, { emotionalShift: [1, 4].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runA477(recs477a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_POSITIVE_RELATIONAL_AFTERMATH_VOID'), 'ARC_POSITIVE_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('ARC_POSITIVE_RELATIONAL_AFTERMATH_VOID does not fire when a positive aftermath carries a shift', async () => {
      // n=8; positive at 1,4; scene 2 (aftermath of 1) has a relationship shift → not all silent
      const recs477anr = Array.from({ length: 8 }, (_, i) =>
        makeRec477(i, {
          emotionalShift: [1, 4].includes(i) ? 'positive' : 'neutral',
          relationshipShifts: i === 2 ? mkShift477(0.3) : [],
        }),
      );
      const res = await runA477(recs477anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_POSITIVE_RELATIONAL_AFTERMATH_VOID'), 'ARC_POSITIVE_RELATIONAL_AFTERMATH_VOID should not fire');
    });

    it('ARC_TURN_ZONE_CLUSTER fires when >75% of turn scenes fall in a single third', async () => {
      // n=12; turns at 0,1,2,3 (all in first third, floor(12/3)=4 → positions 0-3); 4/4=100% > 75%
      const recs477b = Array.from({ length: 12 }, (_, i) =>
        makeRec477(i, { dramaticTurn: [0, 1, 2, 3].includes(i) ? 'reversal' : 'nothing' }),
      );
      const res = await runA477(recs477b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_TURN_ZONE_CLUSTER'), 'ARC_TURN_ZONE_CLUSTER should fire');
    });

    it('ARC_TURN_ZONE_CLUSTER does not fire when turn scenes spread across thirds', async () => {
      // n=12; turns at 0,4,8,11 → first:1, mid:1, last:2 → max=2/4=50% ≤ 75%
      const recs477bnr = Array.from({ length: 12 }, (_, i) =>
        makeRec477(i, { dramaticTurn: [0, 4, 8, 11].includes(i) ? 'reversal' : 'nothing' }),
      );
      const res = await runA477(recs477bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_TURN_ZONE_CLUSTER'), 'ARC_TURN_ZONE_CLUSTER should not fire');
    });

    it('ARC_PEAK_POSITIVE_UNCAUSED fires when the last positive scene has no causal driver in prior 2 scenes', async () => {
      // n=8; positive at 5 (pos≥2); scenes 3,4 have no revelation/turn/suspenseDelta>0 → uncaused → fires
      const recs477c = Array.from({ length: 8 }, (_, i) =>
        makeRec477(i, { emotionalShift: i === 5 ? 'positive' : 'neutral' }),
      );
      const res = await runA477(recs477c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_PEAK_POSITIVE_UNCAUSED'), 'ARC_PEAK_POSITIVE_UNCAUSED should fire');
    });

    it('ARC_PEAK_POSITIVE_UNCAUSED does not fire when a prior scene carries a causal driver', async () => {
      // n=8; positive at 5; scene 4 (1 scene prior) has dramaticTurn='reversal' → has cause → no fire
      const recs477cnr = Array.from({ length: 8 }, (_, i) =>
        makeRec477(i, {
          emotionalShift: i === 5 ? 'positive' : 'neutral',
          dramaticTurn: i === 4 ? 'reversal' : 'nothing',
        }),
      );
      const res = await runA477(recs477cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_PEAK_POSITIVE_UNCAUSED'), 'ARC_PEAK_POSITIVE_UNCAUSED should not fire');
    });
  });


  describe('Wave 463 — characterArcPass: suspense relational decoupled, relational front-loaded, revelation relational aftermath void', async () => {
    const makeRec463 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const mkShift463 = (amount: number) => [{ pairKey: 'ALICE-BOB', dimension: 'trust', amount }];
    const runA463 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ARC_SUSPENSE_RELATIONAL_DECOUPLED fires when all suspense-positive scenes have no relationship shift', async () => {
      // n=8; suspense>0 at 1,3,5 (no shifts); non-suspense scene 7 has a shift → fires
      const recs463a = Array.from({ length: 8 }, (_, i) =>
        makeRec463(i, {
          suspenseDelta: [1, 3, 5].includes(i) ? 1.5 : 0,
          relationshipShifts: i === 7 ? mkShift463(0.4) : [],
        }),
      );
      const res = await runA463(recs463a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_RELATIONAL_DECOUPLED'), 'ARC_SUSPENSE_RELATIONAL_DECOUPLED should fire');
    });

    it('ARC_SUSPENSE_RELATIONAL_DECOUPLED does NOT fire when a suspense-positive scene carries a relationship shift', async () => {
      // n=8; suspense>0 at 1,3,5; scene 3 also has a shift → allSuspenseRelSilent=false → no fire
      const recs463anr = Array.from({ length: 8 }, (_, i) =>
        makeRec463(i, {
          suspenseDelta: [1, 3, 5].includes(i) ? 1.5 : 0,
          relationshipShifts: i === 3 ? mkShift463(0.4) : i === 7 ? mkShift463(0.4) : [],
        }),
      );
      const res = await runA463(recs463anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_RELATIONAL_DECOUPLED'), 'ARC_SUSPENSE_RELATIONAL_DECOUPLED should not fire');
    });

    it('ARC_RELATIONAL_FRONT_LOADED fires when >70% of shift scenes are in the first half', async () => {
      // n=10; mid=5; shifts at 0,1,2,3 (front=4) and 9 (back=1); front ratio 4/5=80% > 70%, back≥1 → fires
      const recs463b = Array.from({ length: 10 }, (_, i) =>
        makeRec463(i, { relationshipShifts: [0, 1, 2, 3, 9].includes(i) ? mkShift463(0.3) : [] }),
      );
      const res = await runA463(recs463b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_RELATIONAL_FRONT_LOADED'), 'ARC_RELATIONAL_FRONT_LOADED should fire');
    });

    it('ARC_RELATIONAL_FRONT_LOADED does NOT fire when shifts are balanced across halves', async () => {
      // n=10; mid=5; shifts at 0,1,6,7 → front=2/4=50%, not >70% → no fire
      const recs463bnr = Array.from({ length: 10 }, (_, i) =>
        makeRec463(i, { relationshipShifts: [0, 1, 6, 7].includes(i) ? mkShift463(0.3) : [] }),
      );
      const res = await runA463(recs463bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_RELATIONAL_FRONT_LOADED'), 'ARC_RELATIONAL_FRONT_LOADED should not fire');
    });

    it('ARC_REVELATION_RELATIONAL_AFTERMATH_VOID fires when every revelation has a relationally flat aftermath', async () => {
      // n=8; revelations at 1,4; aftermaths (records 2,3 and 5,6) carry no relationship shift → fires
      const recs463c = Array.from({ length: 8 }, (_, i) =>
        makeRec463(i, { revelation: [1, 4].includes(i) ? `Truth ${i}` : null }),
      );
      const res = await runA463(recs463c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_REVELATION_RELATIONAL_AFTERMATH_VOID'), 'ARC_REVELATION_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('ARC_REVELATION_RELATIONAL_AFTERMATH_VOID does NOT fire when a revelation aftermath moves a bond', async () => {
      // n=8; revelations at 1,4; scene 2 (aftermath of rev@1) has a relationship shift → no fire
      const recs463cnr = Array.from({ length: 8 }, (_, i) =>
        makeRec463(i, {
          revelation: [1, 4].includes(i) ? `Truth ${i}` : null,
          relationshipShifts: i === 2 ? mkShift463(0.4) : [],
        }),
      );
      const res = await runA463(recs463cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_REVELATION_RELATIONAL_AFTERMATH_VOID'), 'ARC_REVELATION_RELATIONAL_AFTERMATH_VOID should not fire');
    });
  });


  describe('Wave 449 — characterArcPass: relational drought run, turn emotional aftermath void, curiosity relational decoupled', async () => {
    const makeRec449 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const mkShift449 = (amount: number) => [{ pairKey: 'ALICE-BOB', dimension: 'trust', amount }];
    const runA449 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ARC_RELATIONAL_DROUGHT_RUN fires when ≥5 consecutive scenes have no relationship shift', async () => {
      // n=10; shifts at idx 0 and 9 only; scenes 1–8 are silent → run=8 ≥ 5 → fires
      const recs449a = Array.from({ length: 10 }, (_, i) =>
        makeRec449(i, { relationshipShifts: [0, 9].includes(i) ? mkShift449(0.3) : [] }),
      );
      const res = await runA449(recs449a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_RELATIONAL_DROUGHT_RUN'), 'ARC_RELATIONAL_DROUGHT_RUN should fire');
    });

    it('ARC_RELATIONAL_DROUGHT_RUN does NOT fire when shifts are spread with gaps under 5', async () => {
      // n=10; shifts at 0,3,6,9 → longest gap = 2 scenes (1,2 or 4,5 or 7,8) < 5 → no fire
      const recs449anr = Array.from({ length: 10 }, (_, i) =>
        makeRec449(i, { relationshipShifts: [0, 3, 6, 9].includes(i) ? mkShift449(0.2) : [] }),
      );
      const res = await runA449(recs449anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_RELATIONAL_DROUGHT_RUN'), 'ARC_RELATIONAL_DROUGHT_RUN should not fire');
    });

    it('ARC_TURN_EMOTIONAL_AFTERMATH_VOID fires when every turn is followed by 2 neutral scenes', async () => {
      // n=8; turns (negative-shift) at idx 1 and 4; aftermaths (records 2,3 and 5,6) all neutral → fires
      const recs449b = Array.from({ length: 8 }, (_, i) =>
        makeRec449(i, {
          dramaticTurn: i === 1 ? 'reversal' : i === 4 ? 'recognition' : 'nothing',
          emotionalShift: i === 1 ? 'negative' : i === 4 ? 'negative' : 'neutral',
        }),
      );
      const res = await runA449(recs449b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_TURN_EMOTIONAL_AFTERMATH_VOID'), 'ARC_TURN_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('ARC_TURN_EMOTIONAL_AFTERMATH_VOID does NOT fire when a turn is followed by an emotional scene', async () => {
      // n=8; turns at idx 1 and 4; scene 2 has emotionalShift='negative' → aftermath not neutral → no fire
      const recs449bnr = Array.from({ length: 8 }, (_, i) =>
        makeRec449(i, {
          dramaticTurn: i === 1 ? 'reversal' : i === 4 ? 'recognition' : 'nothing',
          emotionalShift: i === 2 ? 'negative' : 'neutral',
        }),
      );
      const res = await runA449(recs449bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_TURN_EMOTIONAL_AFTERMATH_VOID'), 'ARC_TURN_EMOTIONAL_AFTERMATH_VOID should not fire');
    });

    it('ARC_CURIOSITY_RELATIONAL_DECOUPLED fires when all curiosity-positive scenes have no relationship shift', async () => {
      // n=8; curiosity>0 at idx 1,3,5 (no shifts); non-curiosity scene 7 has a shift → fires
      const recs449c = Array.from({ length: 8 }, (_, i) =>
        makeRec449(i, {
          curiosityDelta: [1, 3, 5].includes(i) ? 1.5 : 0,
          relationshipShifts: i === 7 ? mkShift449(0.4) : [],
        }),
      );
      const res = await runA449(recs449c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_CURIOSITY_RELATIONAL_DECOUPLED'), 'ARC_CURIOSITY_RELATIONAL_DECOUPLED should fire');
    });

    it('ARC_CURIOSITY_RELATIONAL_DECOUPLED does NOT fire when a curiosity-positive scene carries a relationship shift', async () => {
      // n=8; curiosity>0 at idx 1,3,5; scene 3 has a relationship shift → allCuriosityRelSilent=false → no fire
      const recs449cnr = Array.from({ length: 8 }, (_, i) =>
        makeRec449(i, {
          curiosityDelta: [1, 3, 5].includes(i) ? 1.5 : 0,
          relationshipShifts: i === 3 ? mkShift449(0.3) : i === 7 ? mkShift449(0.4) : [],
        }),
      );
      const res = await runA449(recs449cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_CURIOSITY_RELATIONAL_DECOUPLED'), 'ARC_CURIOSITY_RELATIONAL_DECOUPLED should not fire');
    });
  });


  describe('Wave 435 — characterArcPass: emotional overload, clock emotion decoupled, peak relational uncaused', async () => {
    const mkShift435 = (amount: number) => [{ pairKey: 'ANNA-MARK', dimension: 'trust', amount }];
    const mkShifts435 = (...amounts: number[]) => amounts.map(a => ({ pairKey: 'ANNA-MARK', dimension: 'trust', amount: a }));
    const makeRec435 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runA435 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ARC_EMOTIONAL_OVERLOAD fires when ≥80% of scenes are non-neutral with both polarities', async () => {
      // n=10, 9 non-neutral (5 positive, 4 negative) → 90%, both polarities → fires
      const recs435a = Array.from({ length: 10 }, (_, i) =>
        makeRec435(i, { emotionalShift: i < 5 ? 'positive' : i < 9 ? 'negative' : 'neutral' }),
      );
      const res = await runA435(recs435a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_EMOTIONAL_OVERLOAD'), 'ARC_EMOTIONAL_OVERLOAD should fire');
    });

    it('ARC_EMOTIONAL_OVERLOAD does not fire when fewer than 80% of scenes are non-neutral', async () => {
      // n=10, 6 non-neutral (3 positive, 3 negative) → 60% → does not fire
      const recs435anr = Array.from({ length: 10 }, (_, i) =>
        makeRec435(i, { emotionalShift: i < 3 ? 'positive' : i < 6 ? 'negative' : 'neutral' }),
      );
      const res = await runA435(recs435anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_EMOTIONAL_OVERLOAD'), 'ARC_EMOTIONAL_OVERLOAD should not fire');
    });

    it('ARC_CLOCK_EMOTION_DECOUPLED fires when all clock scenes are emotionally neutral', async () => {
      // n=8, 3 clockRaised scenes all neutral; scenes 1 and 5 carry non-neutral emotion (non-clock) → fires
      const recs435b = Array.from({ length: 8 }, (_, i) => makeRec435(i));
      recs435b[1] = makeRec435(1, { emotionalShift: 'positive' });
      recs435b[3] = makeRec435(3, { clockRaised: true, emotionalShift: 'neutral' });
      recs435b[5] = makeRec435(5, { emotionalShift: 'negative' });
      recs435b[6] = makeRec435(6, { clockRaised: true, emotionalShift: 'neutral' });
      recs435b[7] = makeRec435(7, { clockRaised: true, emotionalShift: 'neutral' });
      const res = await runA435(recs435b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_CLOCK_EMOTION_DECOUPLED'), 'ARC_CLOCK_EMOTION_DECOUPLED should fire');
    });

    it('ARC_CLOCK_EMOTION_DECOUPLED does not fire when a clock scene carries emotion', async () => {
      // n=8, 3 clockRaised scenes but one is non-neutral → all-neutral condition fails → no fire
      const recs435bnr = Array.from({ length: 8 }, (_, i) => makeRec435(i));
      recs435bnr[1] = makeRec435(1, { emotionalShift: 'positive' });
      recs435bnr[3] = makeRec435(3, { clockRaised: true, emotionalShift: 'positive' }); // clock + emotion
      recs435bnr[5] = makeRec435(5, { emotionalShift: 'negative' });
      recs435bnr[6] = makeRec435(6, { clockRaised: true, emotionalShift: 'neutral' });
      recs435bnr[7] = makeRec435(7, { clockRaised: true, emotionalShift: 'neutral' });
      const res = await runA435(recs435bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_CLOCK_EMOTION_DECOUPLED'), 'ARC_CLOCK_EMOTION_DECOUPLED should not fire');
    });

    it('ARC_PEAK_RELATIONAL_UNCAUSED fires when the peak-shift-count scene has no causal setup', async () => {
      // n=10, peak is scene 6 (2 shifts); scenes 4 and 5 are both causal-driver-free → fires
      const recs435c = Array.from({ length: 10 }, (_, i) => makeRec435(i));
      recs435c[2] = makeRec435(2, { relationshipShifts: mkShift435(0.3) }); // 1 shift (not peak)
      recs435c[4] = makeRec435(4); // causal-driver-free (neutral, no revelation, no clock, no turn)
      recs435c[5] = makeRec435(5); // causal-driver-free
      recs435c[6] = makeRec435(6, { relationshipShifts: mkShifts435(0.5, -0.4) }); // peak: 2 shifts
      const res = await runA435(recs435c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_PEAK_RELATIONAL_UNCAUSED'), 'ARC_PEAK_RELATIONAL_UNCAUSED should fire');
    });

    it('ARC_PEAK_RELATIONAL_UNCAUSED does not fire when the preceding scene carries a driver', async () => {
      // Same but scene 5 (immediately before peak) has a dramatic turn → driver present → no fire
      const recs435cnr = Array.from({ length: 10 }, (_, i) => makeRec435(i));
      recs435cnr[2] = makeRec435(2, { relationshipShifts: mkShift435(0.3) });
      recs435cnr[4] = makeRec435(4); // causal-driver-free
      recs435cnr[5] = makeRec435(5, { dramaticTurn: 'reversal' }); // driver present
      recs435cnr[6] = makeRec435(6, { relationshipShifts: mkShifts435(0.5, -0.4) }); // peak: 2 shifts
      const res = await runA435(recs435cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_PEAK_RELATIONAL_UNCAUSED'), 'ARC_PEAK_RELATIONAL_UNCAUSED should not fire');
    });
  });


  describe('Wave 421 — characterArcPass: relational negative-only, peak relational emotion absent, relational midpoint void', async () => {
    const mkShift421 = (amount: number) => [{ pairKey: 'ANNA-MARK', dimension: 'trust', amount }];
    const makeRec421 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runA421 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ARC_RELATIONAL_NEGATIVE_ONLY fires when every relationship shift is negative', async () => {
      // n=8, three negative shifts, zero positive → fires
      const recs421a = Array.from({ length: 8 }, (_, i) => makeRec421(i));
      recs421a[1] = makeRec421(1, { relationshipShifts: mkShift421(-0.5) });
      recs421a[4] = makeRec421(4, { relationshipShifts: mkShift421(-0.6) });
      recs421a[6] = makeRec421(6, { relationshipShifts: mkShift421(-0.4) });
      const res = await runA421(recs421a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_RELATIONAL_NEGATIVE_ONLY'), 'ARC_RELATIONAL_NEGATIVE_ONLY should fire');
    });

    it('ARC_RELATIONAL_NEGATIVE_ONLY does not fire when a positive shift exists', async () => {
      // n=8, two negative shifts, one positive → no fire
      const recs421anr = Array.from({ length: 8 }, (_, i) => makeRec421(i));
      recs421anr[1] = makeRec421(1, { relationshipShifts: mkShift421(-0.5) });
      recs421anr[4] = makeRec421(4, { relationshipShifts: mkShift421(-0.6) });
      recs421anr[6] = makeRec421(6, { relationshipShifts: mkShift421(0.4) });
      const res = await runA421(recs421anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_RELATIONAL_NEGATIVE_ONLY'), 'ARC_RELATIONAL_NEGATIVE_ONLY should not fire');
    });

    it('ARC_PEAK_RELATIONAL_EMOTION_ABSENT fires when the peak-shift scene is emotionally neutral', async () => {
      // n=8, shifts at 2 (amount=2, neutral), 4 (amount=1, positive), 6 (amount=0.5, negative)
      // peak is scene 2 (abs=2) which is neutral; emotion exists at 4 and 6 → fires
      const recs421b = Array.from({ length: 8 }, (_, i) => makeRec421(i));
      recs421b[2] = makeRec421(2, { relationshipShifts: [{ pairKey: 'A-B', dimension: 'trust', amount: 2 }], emotionalShift: 'neutral' });
      recs421b[4] = makeRec421(4, { relationshipShifts: [{ pairKey: 'A-B', dimension: 'trust', amount: 1 }], emotionalShift: 'positive' });
      recs421b[6] = makeRec421(6, { relationshipShifts: [{ pairKey: 'A-B', dimension: 'trust', amount: 0.5 }], emotionalShift: 'negative' });
      const res = await runA421(recs421b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_PEAK_RELATIONAL_EMOTION_ABSENT'), 'ARC_PEAK_RELATIONAL_EMOTION_ABSENT should fire');
    });

    it('ARC_PEAK_RELATIONAL_EMOTION_ABSENT does not fire when the peak-shift scene carries emotion', async () => {
      // same structure but peak shift scene (scene 2) is now emotional (positive) → no fire
      const recs421bnr = Array.from({ length: 8 }, (_, i) => makeRec421(i));
      recs421bnr[2] = makeRec421(2, { relationshipShifts: [{ pairKey: 'A-B', dimension: 'trust', amount: 2 }], emotionalShift: 'positive' });
      recs421bnr[4] = makeRec421(4, { relationshipShifts: [{ pairKey: 'A-B', dimension: 'trust', amount: 1 }], emotionalShift: 'neutral' });
      recs421bnr[6] = makeRec421(6, { relationshipShifts: [{ pairKey: 'A-B', dimension: 'trust', amount: 0.5 }], emotionalShift: 'neutral' });
      const res = await runA421(recs421bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_PEAK_RELATIONAL_EMOTION_ABSENT'), 'ARC_PEAK_RELATIONAL_EMOTION_ABSENT should not fire');
    });

    it('ARC_RELATIONAL_MIDPOINT_VOID fires when no shift occurs in the 40%–60% zone', async () => {
      // n=10, midpoint=[4,5]; shifts at 1 and 8 (outside zone), none in [4,5] → fires
      const recs421c = Array.from({ length: 10 }, (_, i) => makeRec421(i));
      recs421c[1] = makeRec421(1, { relationshipShifts: mkShift421(0.5) });
      recs421c[8] = makeRec421(8, { relationshipShifts: mkShift421(-0.5) });
      const res = await runA421(recs421c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_RELATIONAL_MIDPOINT_VOID'), 'ARC_RELATIONAL_MIDPOINT_VOID should fire');
    });

    it('ARC_RELATIONAL_MIDPOINT_VOID does not fire when a shift lands in the midpoint zone', async () => {
      // n=10, midpoint=[4,5]; shift at 4 (inside zone) → no fire
      const recs421cnr = Array.from({ length: 10 }, (_, i) => makeRec421(i));
      recs421cnr[1] = makeRec421(1, { relationshipShifts: mkShift421(0.5) });
      recs421cnr[4] = makeRec421(4, { relationshipShifts: mkShift421(-0.3) });
      recs421cnr[8] = makeRec421(8, { relationshipShifts: mkShift421(-0.5) });
      const res = await runA421(recs421cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_RELATIONAL_MIDPOINT_VOID'), 'ARC_RELATIONAL_MIDPOINT_VOID should not fire');
    });
  });


  describe('Wave 407 — characterArcPass: relational positive-only, relational back-loaded, relational recovery absent', async () => {
    const mkShift407 = (amount: number) => [{ pairKey: 'ANNA-MARK', dimension: 'trust', amount }];
    const makeRec407 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runA407 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ARC_RELATIONAL_POSITIVE_ONLY fires when all relationship shifts are positive', async () => {
      const recs407p = Array.from({ length: 8 }, (_, i) => makeRec407(i));
      recs407p[2] = makeRec407(2, { relationshipShifts: mkShift407(0.5) });
      recs407p[4] = makeRec407(4, { relationshipShifts: mkShift407(0.6) });
      recs407p[6] = makeRec407(6, { relationshipShifts: mkShift407(0.4) });
      const res = await runA407(recs407p);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_RELATIONAL_POSITIVE_ONLY'), 'ARC_RELATIONAL_POSITIVE_ONLY should fire');
    });

    it('ARC_RELATIONAL_POSITIVE_ONLY does NOT fire when a negative shift exists', async () => {
      const recs407pNF = Array.from({ length: 8 }, (_, i) => makeRec407(i));
      recs407pNF[2] = makeRec407(2, { relationshipShifts: mkShift407(0.5) });
      recs407pNF[4] = makeRec407(4, { relationshipShifts: mkShift407(-0.6) });
      recs407pNF[6] = makeRec407(6, { relationshipShifts: mkShift407(0.4) });
      const res = await runA407(recs407pNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_RELATIONAL_POSITIVE_ONLY'), 'ARC_RELATIONAL_POSITIVE_ONLY should not fire');
    });

    it('ARC_RELATIONAL_BACK_LOADED fires when >70% of shift scenes fall in the second half', async () => {
      // n=10 → mid=5; shift scenes at 1 (front) and 5,6,7,8 (back) → 4/5 = 80%, front=1
      const recs407b = Array.from({ length: 10 }, (_, i) => makeRec407(i));
      [1, 5, 6, 7, 8].forEach(i => { recs407b[i] = makeRec407(i, { relationshipShifts: mkShift407(0.5) }); });
      const res = await runA407(recs407b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_RELATIONAL_BACK_LOADED'), 'ARC_RELATIONAL_BACK_LOADED should fire');
    });

    it('ARC_RELATIONAL_BACK_LOADED does NOT fire when shifts are balanced across halves', async () => {
      // n=10 → mid=5; shift scenes at 1,2 (front) and 6,7 (back) → 2/4 = 50%
      const recs407bNF = Array.from({ length: 10 }, (_, i) => makeRec407(i));
      [1, 2, 6, 7].forEach(i => { recs407bNF[i] = makeRec407(i, { relationshipShifts: mkShift407(0.5) }); });
      const res = await runA407(recs407bNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_RELATIONAL_BACK_LOADED'), 'ARC_RELATIONAL_BACK_LOADED should not fire');
    });

    it('ARC_RELATIONAL_RECOVERY_ABSENT fires when no positive shift follows the first fracture', async () => {
      const recs407r = Array.from({ length: 8 }, (_, i) => makeRec407(i));
      recs407r[1] = makeRec407(1, { relationshipShifts: mkShift407(0.5) });
      recs407r[3] = makeRec407(3, { relationshipShifts: mkShift407(-0.6) });
      recs407r[5] = makeRec407(5, { relationshipShifts: mkShift407(-0.4) });
      const res = await runA407(recs407r);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_RELATIONAL_RECOVERY_ABSENT'), 'ARC_RELATIONAL_RECOVERY_ABSENT should fire');
    });

    it('ARC_RELATIONAL_RECOVERY_ABSENT does NOT fire when a repair follows the first fracture', async () => {
      const recs407rNF = Array.from({ length: 8 }, (_, i) => makeRec407(i));
      recs407rNF[1] = makeRec407(1, { relationshipShifts: mkShift407(0.5) });
      recs407rNF[3] = makeRec407(3, { relationshipShifts: mkShift407(-0.6) });
      recs407rNF[5] = makeRec407(5, { relationshipShifts: mkShift407(-0.4) });
      recs407rNF[6] = makeRec407(6, { relationshipShifts: mkShift407(0.7) });
      const res = await runA407(recs407rNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_RELATIONAL_RECOVERY_ABSENT'), 'ARC_RELATIONAL_RECOVERY_ABSENT should not fire');
    });
  });


  describe('Wave 393 — characterArcPass: emotional back-loaded, positive emotion run, late low-point absent', async () => {
    const makeRec393 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runA393 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ARC_EMOTIONAL_BACK_LOADED fires when >70% of emotional beats fall in the second half', async () => {
      // n=10 → mid=5; charged at 1 (first) and 6,7,8 (second) → 3/4 = 75%
      const recs393bl = Array.from({ length: 10 }, (_, i) =>
        makeRec393(i, { emotionalShift: [1, 6, 7, 8].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runA393(recs393bl);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_EMOTIONAL_BACK_LOADED'), 'ARC_EMOTIONAL_BACK_LOADED should fire');
    });

    it('ARC_EMOTIONAL_BACK_LOADED does not fire when emotional beats are balanced', async () => {
      const recs393bln = Array.from({ length: 10 }, (_, i) =>
        makeRec393(i, { emotionalShift: [1, 3, 7, 8].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runA393(recs393bln);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_EMOTIONAL_BACK_LOADED'), 'ARC_EMOTIONAL_BACK_LOADED should not fire');
    });

    it('ARC_POSITIVE_EMOTION_RUN fires when 4+ consecutive scenes are positive', async () => {
      const recs393pr = Array.from({ length: 8 }, (_, i) =>
        makeRec393(i, { emotionalShift: [2, 3, 4, 5].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runA393(recs393pr);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_POSITIVE_EMOTION_RUN'), 'ARC_POSITIVE_EMOTION_RUN should fire');
    });

    it('ARC_POSITIVE_EMOTION_RUN does not fire when positive scenes are broken up', async () => {
      const recs393prn = Array.from({ length: 8 }, (_, i) =>
        makeRec393(i, { emotionalShift: [2, 3, 5, 6].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runA393(recs393prn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_POSITIVE_EMOTION_RUN'), 'ARC_POSITIVE_EMOTION_RUN should not fire');
    });

    it('ARC_LATE_LOW_POINT_ABSENT fires when all negative beats fall in the first half', async () => {
      // n=10 → mid=5; negatives at 1,3 (both first half)
      const recs393lp = Array.from({ length: 10 }, (_, i) =>
        makeRec393(i, { emotionalShift: [1, 3].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runA393(recs393lp);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_LATE_LOW_POINT_ABSENT'), 'ARC_LATE_LOW_POINT_ABSENT should fire');
    });

    it('ARC_LATE_LOW_POINT_ABSENT does not fire when a negative beat lands in the second half', async () => {
      const recs393lpn = Array.from({ length: 10 }, (_, i) =>
        makeRec393(i, { emotionalShift: [1, 7].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runA393(recs393lpn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_LATE_LOW_POINT_ABSENT'), 'ARC_LATE_LOW_POINT_ABSENT should not fire');
    });
  });


  describe('Wave 379 — characterArcPass: emotion concentration, emotional front-loaded, negative emotion run', async () => {
    const makeRec379 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runA379 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ARC_EMOTION_CONCENTRATION fires when all emotional beats burst in a ≤20% span', async () => {
      // n=10 → span budget floor(10*0.2)=2; charged at 2,3,4 (span 2), rest neutral
      const recs379ec = Array.from({ length: 10 }, (_, i) =>
        makeRec379(i, { emotionalShift: [2, 3, 4].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runA379(recs379ec);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_EMOTION_CONCENTRATION'), 'ARC_EMOTION_CONCENTRATION should fire');
    });

    it('ARC_EMOTION_CONCENTRATION does not fire when emotional beats are spread across the story', async () => {
      const recs379ecn = Array.from({ length: 10 }, (_, i) =>
        makeRec379(i, { emotionalShift: [1, 5, 9].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runA379(recs379ecn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_EMOTION_CONCENTRATION'), 'ARC_EMOTION_CONCENTRATION should not fire');
    });

    it('ARC_EMOTIONAL_FRONT_LOADED fires when >70% of emotional beats fall in the first half', async () => {
      // n=10 → mid=5; charged at 0,1,2,3 (first half) and 8 (second half) → 4/5 = 80%
      const recs379fl = Array.from({ length: 10 }, (_, i) =>
        makeRec379(i, { emotionalShift: [0, 1, 2, 3, 8].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runA379(recs379fl);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_EMOTIONAL_FRONT_LOADED'), 'ARC_EMOTIONAL_FRONT_LOADED should fire');
    });

    it('ARC_EMOTIONAL_FRONT_LOADED does not fire when emotional beats are balanced across halves', async () => {
      // charged at 1,3 (first half) and 6,8 (second half) → 2/4 = 50%
      const recs379fln = Array.from({ length: 10 }, (_, i) =>
        makeRec379(i, { emotionalShift: [1, 3, 6, 8].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runA379(recs379fln);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_EMOTIONAL_FRONT_LOADED'), 'ARC_EMOTIONAL_FRONT_LOADED should not fire');
    });

    it('ARC_NEGATIVE_EMOTION_RUN fires when 4+ consecutive scenes are negative', async () => {
      const recs379nr = Array.from({ length: 8 }, (_, i) =>
        makeRec379(i, { emotionalShift: [2, 3, 4, 5].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runA379(recs379nr);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_NEGATIVE_EMOTION_RUN'), 'ARC_NEGATIVE_EMOTION_RUN should fire');
    });

    it('ARC_NEGATIVE_EMOTION_RUN does not fire when negative scenes are broken up', async () => {
      // runs of 2 negatives each, broken by neutral
      const recs379nrn = Array.from({ length: 8 }, (_, i) =>
        makeRec379(i, { emotionalShift: [2, 3, 5, 6].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runA379(recs379nrn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_NEGATIVE_EMOTION_RUN'), 'ARC_NEGATIVE_EMOTION_RUN should not fire');
    });
  });


  describe('Wave 365 — characterArcPass: peak suspense emotion absent, peak curiosity emotion absent, relational shift emotion flat', async () => {
    const makeRec365 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runA365 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };
    const relShift365 = [{ pairKey: 'A|B', dimension: 'trust', amount: 0.5 }];

    it('ARC_PEAK_SUSPENSE_EMOTION_ABSENT fires when the highest-suspense scene is neutral while emotion exists elsewhere', async () => {
      // scene 3 has peak suspenseDelta=3 (neutral); scene 1 is emotionally charged
      const recs365ps = Array.from({ length: 8 }, (_, i) =>
        makeRec365(i, {
          suspenseDelta: i === 3 ? 3 : 0,
          emotionalShift: i === 1 ? 'positive' : 'neutral',
        }),
      );
      const res = await runA365(recs365ps);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_PEAK_SUSPENSE_EMOTION_ABSENT'), 'ARC_PEAK_SUSPENSE_EMOTION_ABSENT should fire');
    });

    it('ARC_PEAK_SUSPENSE_EMOTION_ABSENT does not fire when the peak-suspense scene carries emotion', async () => {
      const recs365psni = Array.from({ length: 8 }, (_, i) =>
        makeRec365(i, {
          suspenseDelta: i === 3 ? 3 : 0,
          emotionalShift: i === 3 ? 'negative' : i === 1 ? 'positive' : 'neutral',
        }),
      );
      const res = await runA365(recs365psni);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_PEAK_SUSPENSE_EMOTION_ABSENT'), 'ARC_PEAK_SUSPENSE_EMOTION_ABSENT should not fire');
    });

    it('ARC_PEAK_CURIOSITY_EMOTION_ABSENT fires when the highest-curiosity scene is neutral while emotion exists elsewhere', async () => {
      const recs365pc = Array.from({ length: 8 }, (_, i) =>
        makeRec365(i, {
          curiosityDelta: i === 4 ? 3 : 0,
          emotionalShift: i === 1 ? 'positive' : 'neutral',
        }),
      );
      const res = await runA365(recs365pc);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_PEAK_CURIOSITY_EMOTION_ABSENT'), 'ARC_PEAK_CURIOSITY_EMOTION_ABSENT should fire');
    });

    it('ARC_PEAK_CURIOSITY_EMOTION_ABSENT does not fire when the peak-curiosity scene carries emotion', async () => {
      const recs365pcni = Array.from({ length: 8 }, (_, i) =>
        makeRec365(i, {
          curiosityDelta: i === 4 ? 3 : 0,
          emotionalShift: i === 4 ? 'positive' : i === 1 ? 'positive' : 'neutral',
        }),
      );
      const res = await runA365(recs365pcni);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_PEAK_CURIOSITY_EMOTION_ABSENT'), 'ARC_PEAK_CURIOSITY_EMOTION_ABSENT should not fire');
    });

    it('ARC_RELATIONAL_SHIFT_EMOTION_FLAT fires when every relationship-shift scene is emotionally neutral', async () => {
      // scenes 2,4,6 carry relationship shifts, all neutral
      const recs365rs = Array.from({ length: 8 }, (_, i) =>
        makeRec365(i, {
          relationshipShifts: [2, 4, 6].includes(i) ? relShift365 : [],
        }),
      );
      const res = await runA365(recs365rs);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_RELATIONAL_SHIFT_EMOTION_FLAT'), 'ARC_RELATIONAL_SHIFT_EMOTION_FLAT should fire');
    });

    it('ARC_RELATIONAL_SHIFT_EMOTION_FLAT does not fire when a relationship-shift scene carries emotion', async () => {
      const recs365rsni = Array.from({ length: 8 }, (_, i) =>
        makeRec365(i, {
          relationshipShifts: [2, 4, 6].includes(i) ? relShift365 : [],
          emotionalShift: i === 4 ? 'positive' : 'neutral',
        }),
      );
      const res = await runA365(recs365rsni);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_RELATIONAL_SHIFT_EMOTION_FLAT'), 'ARC_RELATIONAL_SHIFT_EMOTION_FLAT should not fire');
    });
  });


  describe('Wave 351 — characterArcPass: second half emotionally flat, emotional recovery absent, relational first-half flat', async () => {
    const makeRec351 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0.5,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runA351 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };
    const relShift351 = [{ pairKey: 'A|B', dimension: 'trust', amount: 0.5 }];

    it('ARC_SECOND_HALF_EMOTIONALLY_FLAT fires when the back half is all neutral', async () => {
      // n=10 → halfIdx=5; first half has 2 charged, second half (5-9) all neutral
      const recs351sf = Array.from({ length: 10 }, (_, i) =>
        makeRec351(i, { emotionalShift: [0, 1].includes(i) ? 'negative' : 'neutral' })
      );
      const res = await runA351(recs351sf);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_SECOND_HALF_EMOTIONALLY_FLAT'), 'ARC_SECOND_HALF_EMOTIONALLY_FLAT should fire');
    });

    it('ARC_SECOND_HALF_EMOTIONALLY_FLAT does not fire when the back half carries emotion', async () => {
      const recs351sfn = Array.from({ length: 10 }, (_, i) =>
        makeRec351(i, { emotionalShift: [0, 1, 6].includes(i) ? 'negative' : 'neutral' })
      );
      const res = await runA351(recs351sfn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_SECOND_HALF_EMOTIONALLY_FLAT'), 'ARC_SECOND_HALF_EMOTIONALLY_FLAT should not fire');
    });

    it('ARC_EMOTIONAL_RECOVERY_ABSENT fires when no positive beat follows the first fall', async () => {
      // positives at 0,1 (front-loaded); negatives at 5,7; nothing positive after scene 5
      const recs351ra = Array.from({ length: 10 }, (_, i) =>
        makeRec351(i, {
          emotionalShift: [0, 1].includes(i) ? 'positive' : [5, 7].includes(i) ? 'negative' : 'neutral',
        })
      );
      const res = await runA351(recs351ra);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_EMOTIONAL_RECOVERY_ABSENT'), 'ARC_EMOTIONAL_RECOVERY_ABSENT should fire');
    });

    it('ARC_EMOTIONAL_RECOVERY_ABSENT does not fire when a positive beat follows the fall', async () => {
      const recs351ran = Array.from({ length: 10 }, (_, i) =>
        makeRec351(i, {
          emotionalShift: i === 0 ? 'positive' : [5, 7].includes(i) ? 'negative' : i === 8 ? 'positive' : 'neutral',
        })
      );
      const res = await runA351(recs351ran);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_EMOTIONAL_RECOVERY_ABSENT'), 'ARC_EMOTIONAL_RECOVERY_ABSENT should not fire');
    });

    it('ARC_RELATIONAL_FIRST_HALF_FLAT fires when no bond shifts in the front half', async () => {
      // n=10 → first half 0-4 has no shifts; second half has shifts at 6,8
      const recs351rf = Array.from({ length: 10 }, (_, i) =>
        makeRec351(i, { relationshipShifts: [6, 8].includes(i) ? relShift351 : [] })
      );
      const res = await runA351(recs351rf);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_RELATIONAL_FIRST_HALF_FLAT'), 'ARC_RELATIONAL_FIRST_HALF_FLAT should fire');
    });

    it('ARC_RELATIONAL_FIRST_HALF_FLAT does not fire when a bond shifts in the front half', async () => {
      const recs351rfn = Array.from({ length: 10 }, (_, i) =>
        makeRec351(i, { relationshipShifts: [2, 6, 8].includes(i) ? relShift351 : [] })
      );
      const res = await runA351(recs351rfn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_RELATIONAL_FIRST_HALF_FLAT'), 'ARC_RELATIONAL_FIRST_HALF_FLAT should not fire');
    });
  });


  describe('Wave 337 — characterArcPass: suspense/curiosity decoupled, revelation emotion absent, revelation curiosity decoupled', async () => {
    const makeRec337 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'negative', suspenseDelta: 0.5, curiosityDelta: 0.5,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runA337 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ARC_SUSPENSE_CURIOSITY_DECOUPLED fires when high-suspense scenes all have curiosityDelta ≤ 0', async () => {
      const recs337sc = [
        ...Array.from({ length: 5 }, (_, i) => makeRec337(i)),
        makeRec337(5, { suspenseDelta: 1.5, curiosityDelta: -0.2 }),
        makeRec337(6, { suspenseDelta: 2.0, curiosityDelta: 0 }),
        makeRec337(7, { suspenseDelta: 1.8, curiosityDelta: -0.1 }),
      ];
      const res = await runA337(recs337sc);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_CURIOSITY_DECOUPLED'), 'ARC_SUSPENSE_CURIOSITY_DECOUPLED should fire');
    });

    it('ARC_SUSPENSE_CURIOSITY_DECOUPLED does not fire when high-suspense scenes generate curiosity', async () => {
      const recs337scnw = [
        ...Array.from({ length: 5 }, (_, i) => makeRec337(i)),
        makeRec337(5, { suspenseDelta: 1.5, curiosityDelta: 1.2 }),
        makeRec337(6, { suspenseDelta: 2.0, curiosityDelta: 0.8 }),
        makeRec337(7, { suspenseDelta: 1.8, curiosityDelta: 0.5 }),
      ];
      const res = await runA337(recs337scnw);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_CURIOSITY_DECOUPLED'), 'ARC_SUSPENSE_CURIOSITY_DECOUPLED should not fire');
    });

    it('ARC_REVELATION_EMOTION_ABSENT fires when all revelation scenes are emotionally neutral', async () => {
      const recs337re = [
        ...Array.from({ length: 6 }, (_, i) => makeRec337(i)),
        makeRec337(6, { revelation: 'The killer was her father', emotionalShift: 'neutral' }),
        makeRec337(7, { revelation: 'The money is gone', emotionalShift: 'neutral' }),
      ];
      const res = await runA337(recs337re);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_REVELATION_EMOTION_ABSENT'), 'ARC_REVELATION_EMOTION_ABSENT should fire');
    });

    it('ARC_REVELATION_EMOTION_ABSENT does not fire when a revelation scene carries emotion', async () => {
      const recs337renw = [
        ...Array.from({ length: 6 }, (_, i) => makeRec337(i)),
        makeRec337(6, { revelation: 'The killer was her father', emotionalShift: 'negative' }),
        makeRec337(7, { revelation: 'The money is gone', emotionalShift: 'neutral' }),
      ];
      const res = await runA337(recs337renw);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_REVELATION_EMOTION_ABSENT'), 'ARC_REVELATION_EMOTION_ABSENT should not fire');
    });

    it('ARC_REVELATION_CURIOSITY_DECOUPLED fires when revelation scenes avg curiosityDelta ≤ 0', async () => {
      const recs337rc = [
        ...Array.from({ length: 5 }, (_, i) => makeRec337(i)),
        makeRec337(5, { revelation: 'The map was forged', curiosityDelta: -0.3 }),
        makeRec337(6, { revelation: 'He was never there', curiosityDelta: 0 }),
        makeRec337(7, { revelation: 'She knew all along', curiosityDelta: -0.1 }),
      ];
      const res = await runA337(recs337rc);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_REVELATION_CURIOSITY_DECOUPLED'), 'ARC_REVELATION_CURIOSITY_DECOUPLED should fire');
    });

    it('ARC_REVELATION_CURIOSITY_DECOUPLED does not fire when revelations spark new questions', async () => {
      const recs337rcnw = [
        ...Array.from({ length: 5 }, (_, i) => makeRec337(i)),
        makeRec337(5, { revelation: 'The map was forged', curiosityDelta: 1.0 }),
        makeRec337(6, { revelation: 'He was never there', curiosityDelta: 0.8 }),
        makeRec337(7, { revelation: 'She knew all along', curiosityDelta: 0.6 }),
      ];
      const res = await runA337(recs337rcnw);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_REVELATION_CURIOSITY_DECOUPLED'), 'ARC_REVELATION_CURIOSITY_DECOUPLED should not fire');
    });
  });


  describe('Wave 312 — characterArcPass: first half flat, turn emotion absent, curiosity/emotion decoupled', async () => {
    const makeRec312 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCA312 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ARC_FIRST_HALF_EMOTIONALLY_FLAT fires when the first half is neutral and the second half is charged', async () => {
      const recs312fh = Array.from({ length: 12 }, (_, i) =>
        makeRec312(i, { emotionalShift: i === 6 ? 'negative' : i === 7 ? 'positive' : 'neutral' })
      );
      const res = await runCA312(recs312fh);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_FIRST_HALF_EMOTIONALLY_FLAT'), 'ARC_FIRST_HALF_EMOTIONALLY_FLAT should fire');
    });

    it('ARC_FIRST_HALF_EMOTIONALLY_FLAT does not fire when the first half carries emotion', async () => {
      const recs312nfh = Array.from({ length: 12 }, (_, i) =>
        makeRec312(i, { emotionalShift: i === 2 ? 'negative' : i === 7 ? 'positive' : 'neutral' })
      );
      const res = await runCA312(recs312nfh);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_FIRST_HALF_EMOTIONALLY_FLAT'), 'ARC_FIRST_HALF_EMOTIONALLY_FLAT should not fire');
    });

    it('ARC_TURN_EMOTION_ABSENT fires when all dramatic-turn scenes are emotionally neutral', async () => {
      const recs312te = Array.from({ length: 8 }, (_, i) =>
        makeRec312(i, { dramaticTurn: [2, 4].includes(i) ? 'reversal' : 'nothing' })
      );
      const res = await runCA312(recs312te);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_TURN_EMOTION_ABSENT'), 'ARC_TURN_EMOTION_ABSENT should fire');
    });

    it('ARC_TURN_EMOTION_ABSENT does not fire when a turn carries emotional charge', async () => {
      const recs312nte = Array.from({ length: 8 }, (_, i) =>
        makeRec312(i, {
          dramaticTurn: [2, 4].includes(i) ? 'reversal' : 'nothing',
          emotionalShift: i === 2 ? 'negative' : 'neutral',
        })
      );
      const res = await runCA312(recs312nte);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_TURN_EMOTION_ABSENT'), 'ARC_TURN_EMOTION_ABSENT should not fire');
    });

    it('ARC_CURIOSITY_EMOTION_DECOUPLED fires when high-curiosity scenes are all neutral', async () => {
      const recs312ce = Array.from({ length: 8 }, (_, i) =>
        makeRec312(i, { curiosityDelta: [1, 3, 5].includes(i) ? 2 : 0 })
      );
      const res = await runCA312(recs312ce);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_CURIOSITY_EMOTION_DECOUPLED'), 'ARC_CURIOSITY_EMOTION_DECOUPLED should fire');
    });

    it('ARC_CURIOSITY_EMOTION_DECOUPLED does not fire when a high-curiosity scene moves the character', async () => {
      const recs312nce = Array.from({ length: 8 }, (_, i) =>
        makeRec312(i, {
          curiosityDelta: [1, 3, 5].includes(i) ? 2 : 0,
          emotionalShift: i === 3 ? 'negative' : 'neutral',
        })
      );
      const res = await runCA312(recs312nce);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_CURIOSITY_EMOTION_DECOUPLED'), 'ARC_CURIOSITY_EMOTION_DECOUPLED should not fire');
    });
  });


  describe('Wave 298 — characterArcPass: dramatic turn monotone, suspense/emotion decoupled, grief skipped', async () => {
    const makeRec298 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCA298 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ARC_DRAMATIC_TURN_MONOTONE fires when 3+ turns are all the same type', async () => {
      const recs298tm = Array.from({ length: 8 }, (_, i) =>
        makeRec298(i, { dramaticTurn: [1, 3, 5].includes(i) ? 'reversal' : 'nothing' })
      );
      const res = await runCA298(recs298tm);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_DRAMATIC_TURN_MONOTONE'), 'ARC_DRAMATIC_TURN_MONOTONE should fire');
    });

    it('ARC_DRAMATIC_TURN_MONOTONE does not fire when turn types are varied', async () => {
      const turns298 = ['nothing', 'reversal', 'nothing', 'revelation', 'nothing', 'reversal', 'nothing', 'nothing'];
      const recs298ntm = Array.from({ length: 8 }, (_, i) =>
        makeRec298(i, { dramaticTurn: turns298[i] })
      );
      const res = await runCA298(recs298ntm);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_DRAMATIC_TURN_MONOTONE'), 'ARC_DRAMATIC_TURN_MONOTONE should not fire');
    });

    it('ARC_SUSPENSE_EMOTION_DECOUPLED fires when 3+ high-suspense scenes are all emotionally neutral', async () => {
      const recs298sd = Array.from({ length: 8 }, (_, i) =>
        makeRec298(i, { suspenseDelta: [2, 4, 6].includes(i) ? 2 : 0.5 })
      );
      const res = await runCA298(recs298sd);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_EMOTION_DECOUPLED'), 'ARC_SUSPENSE_EMOTION_DECOUPLED should fire');
    });

    it('ARC_SUSPENSE_EMOTION_DECOUPLED does not fire when a high-suspense scene moves the character', async () => {
      const recs298nsd = Array.from({ length: 8 }, (_, i) =>
        makeRec298(i, {
          suspenseDelta: [2, 4, 6].includes(i) ? 2 : 0.5,
          emotionalShift: i === 4 ? 'negative' : 'neutral',
        })
      );
      const res = await runCA298(recs298nsd);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_SUSPENSE_EMOTION_DECOUPLED'), 'ARC_SUSPENSE_EMOTION_DECOUPLED should not fire');
    });

    it('ARC_GRIEF_SKIPPED fires when every negative shift is cancelled by the next scene', async () => {
      // negatives at 1,4,6 each immediately followed by positive at 2,5,7
      const shifts298 = ['neutral', 'negative', 'positive', 'neutral', 'negative', 'positive', 'negative', 'positive'];
      const recs298gs = Array.from({ length: 8 }, (_, i) =>
        makeRec298(i, { emotionalShift: shifts298[i] })
      );
      const res = await runCA298(recs298gs);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_GRIEF_SKIPPED'), 'ARC_GRIEF_SKIPPED should fire');
    });

    it('ARC_GRIEF_SKIPPED does not fire when at least one loss lingers', async () => {
      // negative at 1 followed by neutral at 2 — the loss gets a scene to land
      const shifts298n = ['neutral', 'negative', 'neutral', 'neutral', 'negative', 'positive', 'negative', 'positive'];
      const recs298ngs = Array.from({ length: 8 }, (_, i) =>
        makeRec298(i, { emotionalShift: shifts298n[i] })
      );
      const res = await runCA298(recs298ngs);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_GRIEF_SKIPPED'), 'ARC_GRIEF_SKIPPED should not fire');
    });
  });


  describe('Wave 284 — characterArcPass: emotional resolution absent, revelation late cluster, curiosity plateau', async () => {
    const makeRec284 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCA284 = async (records: any[]) => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      return characterArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ARC_EMOTIONAL_RESOLUTION_ABSENT fires when positive shifts exist but none in final quarter', async () => {
      const recs284er = Array.from({ length: 8 }, (_, i) =>
        makeRec284(i, { emotionalShift: i < 3 ? 'positive' : 'negative' })
      );
      const res = await runCA284(recs284er);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_EMOTIONAL_RESOLUTION_ABSENT'), 'ARC_EMOTIONAL_RESOLUTION_ABSENT should fire');
    });

    it('ARC_EMOTIONAL_RESOLUTION_ABSENT does not fire when positive shift exists in final quarter', async () => {
      const recs284ner = Array.from({ length: 8 }, (_, i) =>
        makeRec284(i, { emotionalShift: i === 0 || i === 7 ? 'positive' : 'neutral' })
      );
      const res = await runCA284(recs284ner);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_EMOTIONAL_RESOLUTION_ABSENT'), 'ARC_EMOTIONAL_RESOLUTION_ABSENT should not fire');
    });

    it('ARC_REVELATION_LATE_CLUSTER fires when >60% of revelations are in final 25%', async () => {
      // 8 scenes: final quarter starts at sceneIdx 6; revelations at 5,6,7 → 2/3 in final quarter = 67%
      const recs284rlc = Array.from({ length: 8 }, (_, i) =>
        makeRec284(i, { revelation: i >= 5 ? `reveal-${i}` : null })
      );
      const res = await runCA284(recs284rlc);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_REVELATION_LATE_CLUSTER'), 'ARC_REVELATION_LATE_CLUSTER should fire');
    });

    it('ARC_REVELATION_LATE_CLUSTER does not fire when revelations are spread across the story', async () => {
      const recs284nrlc = Array.from({ length: 8 }, (_, i) =>
        makeRec284(i, { revelation: i === 1 || i === 4 || i === 7 ? `reveal-${i}` : null })
      );
      const res = await runCA284(recs284nrlc);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_REVELATION_LATE_CLUSTER'), 'ARC_REVELATION_LATE_CLUSTER should not fire');
    });

    it('ARC_CURIOSITY_PLATEAU fires when Act 2b average curiosityDelta is ≤ 0', async () => {
      // 12 scenes: Act 2b = slice(6,9) → indices 6,7,8 (3 scenes); all -1 → avg = -1 ≤ 0
      const recs284cp = Array.from({ length: 12 }, (_, i) =>
        makeRec284(i, { curiosityDelta: i >= 6 && i < 9 ? -1 : 1 })
      );
      const res = await runCA284(recs284cp);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARC_CURIOSITY_PLATEAU'), 'ARC_CURIOSITY_PLATEAU should fire');
    });

    it('ARC_CURIOSITY_PLATEAU does not fire when Act 2b has positive curiosityDelta', async () => {
      // 12 scenes: Act 2b = slice(6,9) → indices 6,7,8; all 2 → avg = 2 > 0
      const recs284ncp = Array.from({ length: 12 }, (_, i) =>
        makeRec284(i, { curiosityDelta: i >= 6 && i < 9 ? 2 : 0 })
      );
      const res = await runCA284(recs284ncp);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARC_CURIOSITY_PLATEAU'), 'ARC_CURIOSITY_PLATEAU should not fire');
    });
  });


  describe('Wave 270 — characterArcPass: positive-only arc, shift concentration, late relational void', async () => {
    const makeRec270 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput270 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: '...',
      records: records as any, structure: {} as any,
      storyContext: {} as any, annotations: records.map(() => null) as any,
      approvedSpans: [],
    });
    const shift270 = (pairKey: string, dimension: string, amount: number) => ({ pairKey, dimension, amount });

    it('ARC_POSITIVE_ONLY fires when every non-neutral beat is positive with no negative beats', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // 8 scenes; 4 positive, 4 neutral, zero negative
      const records270a = [
        makeRec270(0, { emotionalShift: 'positive' }),
        makeRec270(1),
        makeRec270(2, { emotionalShift: 'positive' }),
        makeRec270(3),
        makeRec270(4, { emotionalShift: 'positive' }),
        makeRec270(5),
        makeRec270(6, { emotionalShift: 'positive' }),
        makeRec270(7),
      ];
      const result270a = await characterArcPass(makeInput270(records270a));
      const po = result270a.issues.filter((i: any) => i.rule === 'ARC_POSITIVE_ONLY');
      assert.ok(po.length >= 1, `Should detect ARC_POSITIVE_ONLY, got: ${JSON.stringify(result270a.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(po[0].severity, 'minor');
    });

    it('ARC_POSITIVE_ONLY does NOT fire when at least one negative beat exists', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // 8 scenes; 3 positive, 1 negative, rest neutral
      const records270b = [
        makeRec270(0, { emotionalShift: 'positive' }),
        makeRec270(1),
        makeRec270(2, { emotionalShift: 'positive' }),
        makeRec270(3, { emotionalShift: 'negative' }),
        makeRec270(4, { emotionalShift: 'positive' }),
        makeRec270(5),
        makeRec270(6),
        makeRec270(7),
      ];
      const result270b = await characterArcPass(makeInput270(records270b));
      const po = result270b.issues.filter((i: any) => i.rule === 'ARC_POSITIVE_ONLY');
      assert.strictEqual(po.length, 0, 'Should NOT fire when at least one negative beat exists');
    });

    it('ARC_SHIFT_CONCENTRATION fires when all shift scenes are within a 3-scene window', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // 8 scenes; shifts only at scenes 2, 3, 4 — span=2 → fires
      const records270c = [
        makeRec270(0), makeRec270(1),
        makeRec270(2, { relationshipShifts: [shift270('alice-bob', 'trust', 0.5)] }),
        makeRec270(3, { relationshipShifts: [shift270('alice-bob', 'power', -0.4)] }),
        makeRec270(4, { relationshipShifts: [shift270('bob-carol', 'intimacy', 0.3)] }),
        makeRec270(5), makeRec270(6), makeRec270(7),
      ];
      const result270c = await characterArcPass(makeInput270(records270c));
      const sc = result270c.issues.filter((i: any) => i.rule === 'ARC_SHIFT_CONCENTRATION');
      assert.ok(sc.length >= 1, `Should detect ARC_SHIFT_CONCENTRATION, got: ${JSON.stringify(result270c.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(sc[0].severity, 'minor');
    });

    it('ARC_SHIFT_CONCENTRATION does NOT fire when shifts are distributed across the arc', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // 8 scenes; shifts at scenes 0, 3, 7 — span=7 → no fire
      const records270d = [
        makeRec270(0, { relationshipShifts: [shift270('alice-bob', 'trust', 0.5)] }),
        makeRec270(1), makeRec270(2),
        makeRec270(3, { relationshipShifts: [shift270('alice-bob', 'power', -0.4)] }),
        makeRec270(4), makeRec270(5), makeRec270(6),
        makeRec270(7, { relationshipShifts: [shift270('bob-carol', 'intimacy', 0.3)] }),
      ];
      const result270d = await characterArcPass(makeInput270(records270d));
      const sc = result270d.issues.filter((i: any) => i.rule === 'ARC_SHIFT_CONCENTRATION');
      assert.strictEqual(sc.length, 0, 'Should NOT fire when shifts are distributed across the arc');
    });

    it('ARC_LATE_RELATIONAL_VOID fires when no shifts appear in the final quarter', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // 8 scenes; finalActStart=6; shifts at scenes 0, 2, 4 — none at 6 or 7
      const records270e = [
        makeRec270(0, { relationshipShifts: [shift270('alice-bob', 'trust', 0.5)] }),
        makeRec270(1),
        makeRec270(2, { relationshipShifts: [shift270('alice-bob', 'power', -0.4)] }),
        makeRec270(3),
        makeRec270(4, { relationshipShifts: [shift270('bob-carol', 'intimacy', 0.3)] }),
        makeRec270(5), makeRec270(6), makeRec270(7),
      ];
      const result270e = await characterArcPass(makeInput270(records270e));
      const lrv = result270e.issues.filter((i: any) => i.rule === 'ARC_LATE_RELATIONAL_VOID');
      assert.ok(lrv.length >= 1, `Should detect ARC_LATE_RELATIONAL_VOID, got: ${JSON.stringify(result270e.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(lrv[0].severity, 'minor');
    });

    it('ARC_LATE_RELATIONAL_VOID does NOT fire when a shift appears in the final quarter', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // 8 scenes; finalActStart=6; shift at scene 7 (final quarter) → no fire
      const records270f = [
        makeRec270(0, { relationshipShifts: [shift270('alice-bob', 'trust', 0.5)] }),
        makeRec270(1),
        makeRec270(2, { relationshipShifts: [shift270('alice-bob', 'power', -0.4)] }),
        makeRec270(3), makeRec270(4), makeRec270(5), makeRec270(6),
        makeRec270(7, { relationshipShifts: [shift270('bob-carol', 'intimacy', 0.3)] }),
      ];
      const result270f = await characterArcPass(makeInput270(records270f));
      const lrv = result270f.issues.filter((i: any) => i.rule === 'ARC_LATE_RELATIONAL_VOID');
      assert.strictEqual(lrv.length, 0, 'Should NOT fire when a shift appears in the final quarter');
    });
  });


  describe('Wave 256 — characterArcPass: relational dimension monotony, emotional flatline, negative-only arc', async () => {
    const makeRec256 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput256 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: '...',
      records: records as any, structure: {} as any,
      storyContext: {} as any, annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('ARC_SINGLE_DIMENSION fires when all relationship shifts use one dimension', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // 6 records; 4 shifts all on 'trust'
      const records256a = [
        makeRec256(0, { relationshipShifts: [{ pairKey: 'A|B', dimension: 'trust', amount: 0.3 }] }),
        makeRec256(1, { relationshipShifts: [{ pairKey: 'A|B', dimension: 'trust', amount: -0.2 }] }),
        makeRec256(2),
        makeRec256(3, { relationshipShifts: [{ pairKey: 'C|D', dimension: 'trust', amount: 0.4 }] }),
        makeRec256(4, { relationshipShifts: [{ pairKey: 'C|D', dimension: 'trust', amount: -0.3 }] }),
        makeRec256(5),
      ];
      const result256a = await characterArcPass(makeInput256(records256a));
      const dim = result256a.issues.filter((i: any) => i.rule === 'ARC_SINGLE_DIMENSION');
      assert.ok(dim.length >= 1, `Should detect ARC_SINGLE_DIMENSION, got: ${JSON.stringify(result256a.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(dim[0].severity, 'minor');
    });

    it('ARC_SINGLE_DIMENSION does NOT fire when shifts span multiple dimensions', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      const records256b = [
        makeRec256(0, { relationshipShifts: [{ pairKey: 'A|B', dimension: 'trust', amount: 0.3 }] }),
        makeRec256(1, { relationshipShifts: [{ pairKey: 'A|B', dimension: 'power', amount: -0.2 }] }),
        makeRec256(2),
        makeRec256(3, { relationshipShifts: [{ pairKey: 'C|D', dimension: 'intimacy', amount: 0.4 }] }),
        makeRec256(4, { relationshipShifts: [{ pairKey: 'C|D', dimension: 'trust', amount: -0.3 }] }),
        makeRec256(5),
      ];
      const result256b = await characterArcPass(makeInput256(records256b));
      const dim = result256b.issues.filter((i: any) => i.rule === 'ARC_SINGLE_DIMENSION');
      assert.strictEqual(dim.length, 0, 'Should NOT fire when shifts span multiple dimensions');
    });

    it('ARC_EMOTIONAL_FLATLINE fires when ≥80% of scenes are neutral', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // 10 records; 9 neutral, 1 positive → 90%
      const records256c = Array.from({ length: 10 }, (_, i) => makeRec256(i, {
        emotionalShift: i === 5 ? 'positive' : 'neutral',
      }));
      const result256c = await characterArcPass(makeInput256(records256c));
      const flat = result256c.issues.filter((i: any) => i.rule === 'ARC_EMOTIONAL_FLATLINE');
      assert.ok(flat.length >= 1, `Should detect ARC_EMOTIONAL_FLATLINE, got: ${JSON.stringify(result256c.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(flat[0].severity, 'major');
    });

    it('ARC_EMOTIONAL_FLATLINE does NOT fire when scenes carry varied emotion', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // 10 records; 5 neutral, alternating positive/negative → 50% neutral
      const records256d = Array.from({ length: 10 }, (_, i) => makeRec256(i, {
        emotionalShift: i % 2 === 0 ? 'neutral' : (i % 4 === 1 ? 'positive' : 'negative'),
      }));
      const result256d = await characterArcPass(makeInput256(records256d));
      const flat = result256d.issues.filter((i: any) => i.rule === 'ARC_EMOTIONAL_FLATLINE');
      assert.strictEqual(flat.length, 0, 'Should NOT fire when emotion is varied');
    });

    it('ARC_NEGATIVE_ONLY fires when all non-neutral scenes are negative', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // 8 records; 3 negative, rest neutral, no positive — but keep neutral <80% to avoid flatline
      const records256e = [
        makeRec256(0, { emotionalShift: 'negative' }),
        makeRec256(1, { emotionalShift: 'negative' }),
        makeRec256(2, { emotionalShift: 'neutral' }),
        makeRec256(3, { emotionalShift: 'negative' }),
        makeRec256(4, { emotionalShift: 'neutral' }),
        makeRec256(5, { emotionalShift: 'negative' }),
        makeRec256(6, { emotionalShift: 'neutral' }),
        makeRec256(7, { emotionalShift: 'negative' }),
      ];
      const result256e = await characterArcPass(makeInput256(records256e));
      const neg = result256e.issues.filter((i: any) => i.rule === 'ARC_NEGATIVE_ONLY');
      assert.ok(neg.length >= 1, `Should detect ARC_NEGATIVE_ONLY, got: ${JSON.stringify(result256e.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(neg[0].severity, 'minor');
    });

    it('ARC_NEGATIVE_ONLY does NOT fire when a positive beat exists', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      const records256f = [
        makeRec256(0, { emotionalShift: 'negative' }),
        makeRec256(1, { emotionalShift: 'negative' }),
        makeRec256(2, { emotionalShift: 'neutral' }),
        makeRec256(3, { emotionalShift: 'positive' }),
        makeRec256(4, { emotionalShift: 'neutral' }),
        makeRec256(5, { emotionalShift: 'negative' }),
        makeRec256(6, { emotionalShift: 'neutral' }),
        makeRec256(7, { emotionalShift: 'negative' }),
      ];
      const result256f = await characterArcPass(makeInput256(records256f));
      const neg = result256f.issues.filter((i: any) => i.rule === 'ARC_NEGATIVE_ONLY');
      assert.strictEqual(neg.length, 0, 'Should NOT fire when a positive emotional beat exists');
    });
  });


  describe('Wave 242 — characterArcPass: Act 1 relational desert, positive midpoint absent, revelation unincorporated', async () => {
    const makeRec242 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput242 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: '...',
      records: records as any, structure: {} as any,
      storyContext: {} as any,
      annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('ARC_ACT1_RELATIONAL_DESERT fires when no pair shifts in the first 25% of scenes', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // 10 records; 2 pairs; shifts only in scenes 3,4 (Act 2); Act1=scenes 0,1
      const records242a = [
        makeRec242(0), makeRec242(1),
        makeRec242(2),
        makeRec242(3, { relationshipShifts: [{ pairKey: 'ALICE|BOB', dimension: 'trust', amount: 0.3 }] }),
        makeRec242(4, { relationshipShifts: [{ pairKey: 'CAROL|DAN', dimension: 'power', amount: -0.2 }] }),
        makeRec242(5), makeRec242(6), makeRec242(7), makeRec242(8), makeRec242(9),
      ];
      const result = await characterArcPass(makeInput242(records242a));
      assert.ok(result.issues.some((i: any) => i.rule === 'ARC_ACT1_RELATIONAL_DESERT'), `Expected ARC_ACT1_RELATIONAL_DESERT, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('ARC_ACT1_RELATIONAL_DESERT does NOT fire when Act 1 has a relationship shift', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      const records242b = [
        makeRec242(0, { relationshipShifts: [{ pairKey: 'ALICE|BOB', dimension: 'trust', amount: 0.3 }] }),
        makeRec242(1),
        makeRec242(2, { relationshipShifts: [{ pairKey: 'CAROL|DAN', dimension: 'power', amount: -0.2 }] }),
        makeRec242(3), makeRec242(4), makeRec242(5), makeRec242(6), makeRec242(7), makeRec242(8), makeRec242(9),
      ];
      const result = await characterArcPass(makeInput242(records242b));
      assert.ok(!result.issues.some((i: any) => i.rule === 'ARC_ACT1_RELATIONAL_DESERT'), 'Should NOT fire when Act 1 has a relational event');
    });

    it('ARC_POSITIVE_MIDPOINT_ABSENT fires when the midpoint zone has no positive relationship shift', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // 10 records; midpoint = scenes 4-5 (floor(10*0.4)=4 to floor(10*0.6)=6); only negative shifts
      const records242c = Array.from({ length: 10 }, (_, i) => makeRec242(i, {
        relationshipShifts: (i === 4 || i === 5)
          ? [{ pairKey: 'ALICE|BOB', dimension: 'trust', amount: -0.3 }]
          : [],
      }));
      const result = await characterArcPass(makeInput242(records242c));
      assert.ok(result.issues.some((i: any) => i.rule === 'ARC_POSITIVE_MIDPOINT_ABSENT'), `Expected ARC_POSITIVE_MIDPOINT_ABSENT, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('ARC_POSITIVE_MIDPOINT_ABSENT does NOT fire when midpoint zone has a positive shift', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      const records242d = Array.from({ length: 10 }, (_, i) => makeRec242(i, {
        relationshipShifts: i === 4
          ? [{ pairKey: 'ALICE|BOB', dimension: 'trust', amount: 0.5 }]
          : [],
      }));
      const result = await characterArcPass(makeInput242(records242d));
      assert.ok(!result.issues.some((i: any) => i.rule === 'ARC_POSITIVE_MIDPOINT_ABSENT'), 'Should NOT fire when midpoint has a positive shift');
    });

    it('ARC_REVELATION_UNINCORPORATED fires when revelations are never followed by a relationship shift', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // 8 records; 2 revelations (scenes 1,4); no relationship shifts anywhere
      const records242e = Array.from({ length: 8 }, (_, i) => makeRec242(i, {
        revelation: (i === 1 || i === 4) ? 'the letter was forged' : null,
      }));
      const result = await characterArcPass(makeInput242(records242e));
      assert.ok(result.issues.some((i: any) => i.rule === 'ARC_REVELATION_UNINCORPORATED'), `Expected ARC_REVELATION_UNINCORPORATED, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('ARC_REVELATION_UNINCORPORATED does NOT fire when a revelation is followed by a relationship shift', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // Revelation at scene 1; relationship shift at scene 2 (within 2 scenes)
      const records242f = Array.from({ length: 8 }, (_, i) => makeRec242(i, {
        revelation: (i === 1 || i === 4) ? 'the letter was forged' : null,
        relationshipShifts: i === 2 ? [{ pairKey: 'ALICE|BOB', dimension: 'trust', amount: -0.4 }] : [],
      }));
      const result = await characterArcPass(makeInput242(records242f));
      assert.ok(!result.issues.some((i: any) => i.rule === 'ARC_REVELATION_UNINCORPORATED'), 'Should NOT fire when a revelation is followed by a relationship shift within 2 scenes');
    });
  });


  describe('Wave 213 — characterArcPass: uncontested ascent, unsupported late turn, midpoint inertia (multi-signal arc dynamics)', async () => {
    const makeRec213 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 1,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput213 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: 'INT. SC - DAY\nAction line.\n',
      records: records as any, structure: {} as any,
      storyContext: {} as any, annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('ARC_UNCONTESTED_ASCENT fires when positive movement is never contested on any axis', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // n=8; positives at 0,2,4,6; neutrals elsewhere; zero negative emotion, zero relational loss
      // totalTriumph=4 (≥3), triumphScenes=4 (≥3), totalAdversity=0 (<0.5) → fires
      // ARC_LATE_TURN_UNSUPPORTED: no prior adversity → won't fire
      const records = [
        makeRec213(0, { emotionalShift: 'positive' }),
        makeRec213(1),
        makeRec213(2, { emotionalShift: 'positive' }),
        makeRec213(3),
        makeRec213(4, { emotionalShift: 'positive' }),
        makeRec213(5),
        makeRec213(6, { emotionalShift: 'positive' }),
        makeRec213(7),
      ];
      const result = await characterArcPass(makeInput213(records));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'ARC_UNCONTESTED_ASCENT'),
        'Should fire when triumph accumulates with near-zero adversity across emotional and relational axes',
      );
    });

    it('ARC_UNCONTESTED_ASCENT does not fire when an emotional defeat contests the rise', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // scene4 emotional defeat → adversity=1 ≥0.5 → won't fire
      const records = [
        makeRec213(0, { emotionalShift: 'positive' }),
        makeRec213(1),
        makeRec213(2, { emotionalShift: 'positive' }),
        makeRec213(3),
        makeRec213(4, { emotionalShift: 'negative' }),
        makeRec213(5, { revelation: 'courage discovered in the face of loss here' }),
        makeRec213(6, { emotionalShift: 'positive' }),
        makeRec213(7),
      ];
      const result = await characterArcPass(makeInput213(records));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'ARC_UNCONTESTED_ASCENT'),
        'Should NOT fire when an emotional defeat registers adversity',
      );
    });

    it('ARC_UNCONTESTED_ASCENT does not fire when conflict is RELATIONAL rather than emotional (power case)', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // Every emotional beat is positive (a naive enum-only check would FALSE-FIRE here),
      // but a relationship deteriorates at scene3 (amount -0.6 → relLoss adversity 0.6 ≥0.5).
      // The multi-signal model recognises the relational cost and correctly stays silent.
      const records = [
        makeRec213(0, { emotionalShift: 'positive' }),
        makeRec213(1),
        makeRec213(2, { emotionalShift: 'positive' }),
        makeRec213(3, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: -0.6 }] }),
        makeRec213(4, { emotionalShift: 'positive' }),
        makeRec213(5),
        makeRec213(6, { emotionalShift: 'positive' }),
        makeRec213(7),
      ];
      const result = await characterArcPass(makeInput213(records));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'ARC_UNCONTESTED_ASCENT'),
        'Should NOT fire when adversity is expressed through relational deterioration, not emotion',
      );
    });

    it('ARC_LATE_TURN_UNSUPPORTED fires when a final-act swing has no causal catalyst', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // n=8; negative@0 supplies prior adversity; positive@6 (finalStart=6) swings up from a
      // trough of 0 with zero catalyst (no revelation/payoff/major rel shift/suspense resolution)
      const records = [
        makeRec213(0, { emotionalShift: 'negative' }),
        makeRec213(1),
        makeRec213(2, { emotionalShift: 'positive' }),
        makeRec213(3),
        makeRec213(4),
        makeRec213(5),
        makeRec213(6, { emotionalShift: 'positive' }),
        makeRec213(7),
      ];
      const result = await characterArcPass(makeInput213(records));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'ARC_LATE_TURN_UNSUPPORTED'),
        'Should fire when a positive swing in the final act lacks any catalyst in the support window',
      );
    });

    it('ARC_LATE_TURN_UNSUPPORTED does not fire when a revelation supports the turn', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // revelation at scene5 sits inside the support window [4,6] → catalyst present
      const records = [
        makeRec213(0, { emotionalShift: 'negative' }),
        makeRec213(1),
        makeRec213(2, { emotionalShift: 'positive' }),
        makeRec213(3),
        makeRec213(4),
        makeRec213(5, { revelation: 'the truth about the past finally surfaces here' }),
        makeRec213(6, { emotionalShift: 'positive' }),
        makeRec213(7),
      ];
      const result = await characterArcPass(makeInput213(records));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'ARC_LATE_TURN_UNSUPPORTED'),
        'Should NOT fire when a revelation in the support window motivates the turn',
      );
    });

    it('ARC_LATE_TURN_UNSUPPORTED does not fire when a major RELATIONSHIP shift supports the turn (power case)', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // No revelation anywhere — a naive revelation-only check would FALSE-FIRE. The turn is
      // instead motivated by a decisive reconciliation at scene5 (amount +0.6 ≥ 0.3 → catalyst).
      const records = [
        makeRec213(0, { emotionalShift: 'negative' }),
        makeRec213(1),
        makeRec213(2, { emotionalShift: 'positive' }),
        makeRec213(3),
        makeRec213(4),
        makeRec213(5, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.6 }] }),
        makeRec213(6, { emotionalShift: 'positive' }),
        makeRec213(7),
      ];
      const result = await characterArcPass(makeInput213(records));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'ARC_LATE_TURN_UNSUPPORTED'),
        'Should NOT fire when a major relationship shift (not a revelation) motivates the turn',
      );
    });

    it('ARC_MIDPOINT_INERT fires when emotional velocity flatlines at the structural centre', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // n=10; midZone scenes[4,5] hold a constant state (both neutral) → zero velocity;
      // act 2 carries velocity at scenes 2 and 6 on either side
      const records = [
        makeRec213(0, { emotionalShift: 'negative' }),
        makeRec213(1),
        makeRec213(2, { emotionalShift: 'positive' }),
        makeRec213(3),
        makeRec213(4),
        makeRec213(5),
        makeRec213(6, { emotionalShift: 'negative' }),
        makeRec213(7),
        makeRec213(8, { emotionalShift: 'positive', revelation: 'hard-won clarity emerges at last' }),
        makeRec213(9),
      ];
      const result = await characterArcPass(makeInput213(records));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'ARC_MIDPOINT_INERT'),
        'Should fire when midpoint emotional velocity is zero while act 2 carries velocity elsewhere',
      );
    });

    it('ARC_MIDPOINT_INERT fires on a HELD non-neutral tone at the midpoint (power case)', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // Midpoint scenes 4,5 are POSITIVE — a naive "all neutral" check would miss this entirely
      // (hasMidEmotion=true). But scenes 3,4,5 hold a constant positive state → zero velocity →
      // no turn at the structural centre → the velocity model correctly fires.
      const records = [
        makeRec213(0),
        makeRec213(1),
        makeRec213(2, { emotionalShift: 'negative' }),
        makeRec213(3, { emotionalShift: 'positive' }),
        makeRec213(4, { emotionalShift: 'positive' }),
        makeRec213(5, { emotionalShift: 'positive' }),
        makeRec213(6),
        makeRec213(7),
        makeRec213(8, { emotionalShift: 'positive', revelation: 'hard-won clarity emerges at last' }),
        makeRec213(9),
      ];
      const result = await characterArcPass(makeInput213(records));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'ARC_MIDPOINT_INERT'),
        'Should fire on a held non-neutral midpoint tone — emotion without a turn is still inert',
      );
    });

    it('ARC_MIDPOINT_INERT does not fire when the midpoint registers a genuine turn', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // scene4 turns positive against neutral neighbours → midpoint velocity > 0
      const records = [
        makeRec213(0, { emotionalShift: 'negative' }),
        makeRec213(1),
        makeRec213(2, { emotionalShift: 'positive' }),
        makeRec213(3),
        makeRec213(4, { emotionalShift: 'positive' }),
        makeRec213(5),
        makeRec213(6, { emotionalShift: 'negative' }),
        makeRec213(7),
        makeRec213(8, { emotionalShift: 'positive', revelation: 'hard-won clarity emerges at last' }),
        makeRec213(9),
      ];
      const result = await characterArcPass(makeInput213(records));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'ARC_MIDPOINT_INERT'),
        'Should NOT fire when the midpoint zone registers a genuine emotional turn',
      );
    });
  });


  describe('Wave 196 — characterArcPass: opening void, catharsis absent, bookend identical', async () => {
    const makeRec196 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      purpose: 'dialogue', dramaticTurn: 'nothing',
      ...overrides,
    });
    const baseStructure196 = {
      escalating: true, reversalDensity: 0.1, openClues: 0,
      approachingClimax: false, avgSuspensePerScene: 1,
      revelationCount: 1, completionPercent: 50,
    };
    const simpleFountain = 'INT. SC - DAY\nA.\n';
    const makeInput196 = (records: any[]) => ({
      fountain: simpleFountain, original: simpleFountain,
      records: records as any, structure: baseStructure196 as any,
      storyContext: {} as any, annotations: [], approvedSpans: [],
    });

    it('ARC_OPENING_VOID fires when the first two scenes are neutral with no revelation', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // 6 records: opening two are neutral with no revelations
      const records = [
        makeRec196(0),
        makeRec196(1),
        makeRec196(2, { emotionalShift: 'positive' }),
        makeRec196(3, { emotionalShift: 'negative' }),
        makeRec196(4, { emotionalShift: 'positive' }),
        makeRec196(5, { emotionalShift: 'negative' }),
      ];
      const result = await characterArcPass(makeInput196(records));
      assert.ok(result.issues.some((i: any) => i.rule === 'ARC_OPENING_VOID'),
        'Should fire when opening two scenes are emotionally neutral with no revelations');
    });

    it('ARC_OPENING_VOID does not fire when the first scene has an emotional shift', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // First scene has positive shift — emotional baseline established
      const records = [
        makeRec196(0, { emotionalShift: 'positive' }),
        makeRec196(1),
        makeRec196(2, { emotionalShift: 'negative' }),
        makeRec196(3),
        makeRec196(4, { emotionalShift: 'positive' }),
        makeRec196(5, { emotionalShift: 'negative' }),
      ];
      const result = await characterArcPass(makeInput196(records));
      assert.ok(!result.issues.some((i: any) => i.rule === 'ARC_OPENING_VOID'),
        'Should NOT fire when the opening scene has a distinct emotional register');
    });

    it('ARC_CATHARSIS_ABSENT fires when struggle exists but no positive revelation moment', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // 8 records: negative scenes exist but no positive+revelation pair
      const records = [
        makeRec196(0, { emotionalShift: 'positive' }),
        makeRec196(1, { emotionalShift: 'negative' }),
        makeRec196(2, { emotionalShift: 'negative' }),
        makeRec196(3),
        makeRec196(4, { emotionalShift: 'positive' }),
        makeRec196(5, { emotionalShift: 'negative' }),
        makeRec196(6),
        makeRec196(7, { emotionalShift: 'positive' }),
      ];
      const result = await characterArcPass(makeInput196(records));
      assert.ok(result.issues.some((i: any) => i.rule === 'ARC_CATHARSIS_ABSENT'),
        'Should fire when 2+ negative scenes exist but no positive-plus-revelation moment');
    });

    it('ARC_CATHARSIS_ABSENT does not fire when a positive scene includes a revelation', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // Record 4 has positive shift AND revelation — cathartic moment present
      const records = [
        makeRec196(0, { emotionalShift: 'positive' }),
        makeRec196(1, { emotionalShift: 'negative' }),
        makeRec196(2, { emotionalShift: 'negative' }),
        makeRec196(3),
        makeRec196(4, { emotionalShift: 'positive', revelation: 'the truth finally revealed' }),
        makeRec196(5, { emotionalShift: 'negative' }),
        makeRec196(6),
        makeRec196(7, { emotionalShift: 'positive' }),
      ];
      const result = await characterArcPass(makeInput196(records));
      assert.ok(!result.issues.some((i: any) => i.rule === 'ARC_CATHARSIS_ABSENT'),
        'Should NOT fire when a positive emotional scene is paired with a revelation');
    });

    it('ARC_BOOKEND_IDENTICAL fires when first and final scene share the same non-neutral tone', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // records[0] and records[5] both negative — story returns to start
      const records = [
        makeRec196(0, { emotionalShift: 'negative' }),
        makeRec196(1),
        makeRec196(2, { emotionalShift: 'positive' }),
        makeRec196(3),
        makeRec196(4, { emotionalShift: 'positive' }),
        makeRec196(5, { emotionalShift: 'negative' }),
      ];
      const result = await characterArcPass(makeInput196(records));
      assert.ok(result.issues.some((i: any) => i.rule === 'ARC_BOOKEND_IDENTICAL'),
        'Should fire when first and final scenes share the same non-neutral emotional register');
    });

    it('ARC_BOOKEND_IDENTICAL does not fire when first and final scenes differ emotionally', async () => {
      const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
      // records[0] negative, records[5] positive — clear emotional transformation
      const records = [
        makeRec196(0, { emotionalShift: 'negative' }),
        makeRec196(1),
        makeRec196(2, { emotionalShift: 'negative' }),
        makeRec196(3),
        makeRec196(4, { emotionalShift: 'positive' }),
        makeRec196(5, { emotionalShift: 'positive' }),
      ];
      const result = await characterArcPass(makeInput196(records));
      assert.ok(!result.issues.some((i: any) => i.rule === 'ARC_BOOKEND_IDENTICAL'),
        'Should NOT fire when final scene differs emotionally from the opening');
    });
  });


describe('Wave 138 — characterArcPass: relational arc tracking', () => {
  // Build a PassInput with 5 records, using makeScreenplayCommit + buildScreenplayMemory
  // so all required ScreenplaySceneRecord fields are correctly populated.
  // relShifts specifies SHIFT_RELATIONSHIP ops to include (go into commit 0 and 1).
  function makeArcInputWithRelShifts(
    fountain: string,
    relShifts: Array<{ pair: [string, string]; dimension: string; amount: number }>,
  ): Parameters<typeof characterArcPass>[0] {
    const commits = [
      makeScreenplayCommit(0, [
        { op: 'UPDATE_READER_STATE', delta: { suspense: -1 } } as StoryOp,
        ...(relShifts.slice(0, 1).map(s => ({
          op: 'SHIFT_RELATIONSHIP' as const,
          pair: s.pair,
          delta: { dimension: s.dimension, amount: s.amount, reason: 'test' },
        } as StoryOp))),
      ]),
      makeScreenplayCommit(1, [
        { op: 'UPDATE_READER_STATE', delta: { suspense: 1 } } as StoryOp,
        ...(relShifts.slice(1, 2).map(s => ({
          op: 'SHIFT_RELATIONSHIP' as const,
          pair: s.pair,
          delta: { dimension: s.dimension, amount: s.amount, reason: 'test' },
        } as StoryOp))),
      ]),
      makeScreenplayCommit(2, [
        { op: 'UPDATE_READER_STATE', delta: { suspense: 1 } } as StoryOp,
        { op: 'UPDATE_BELIEF' as const, charId: 'alice', belief: { id: 'b1', proposition: 'truth revealed', source: 'witnessed' as const, confidence: 0.9 } } as StoryOp,
      ]),
      makeScreenplayCommit(3, [{ op: 'UPDATE_READER_STATE', delta: { suspense: 2 } } as StoryOp]),
      makeScreenplayCommit(4, [{ op: 'UPDATE_READER_STATE', delta: { suspense: 0 } } as StoryOp]),
    ];
    const records = buildScreenplayMemory(commits);
    const structure = analyzeStructure(records, commits);
    return { fountain, original: fountain, annotations: [], structure, records, approvedSpans: [] };
  }

  it('CHARACTER_ARC_PROTAGONIST_PASSIVE fires when protagonist has no relationship shift', async () => {
    // ALICE appears 7 times (protagonist), BOB 4 times. Only BOB|CAROL shifts — alice has no arc.
    const fountain = [
      'INT. A - DAY\n\nScene.\n',
      'ALICE\nHello there.\n\nALICE\nHello there.\n\nALICE\nHello there.\n',
      'ALICE\nHello there.\n\nALICE\nHello there.\n\nALICE\nHello there.\n\nALICE\nHello there.\n',
      'BOB\nHi.\n\nBOB\nHi.\n\nBOB\nHi.\n\nBOB\nHi.\n',
    ].join('\n');
    const result = await characterArcPass(makeArcInputWithRelShifts(fountain, [
      { pair: ['bob', 'carol'], dimension: 'trust', amount: 0.5 },
    ]));
    assert.ok(
      result.issues.some(i => i.rule === 'CHARACTER_ARC_PROTAGONIST_PASSIVE'),
      `should detect protagonist without relational arc; got: ${result.issues.map(i => i.rule).join(', ')}`,
    );
  });

  it('CHARACTER_ARC_PROTAGONIST_PASSIVE does NOT fire when protagonist has a relationship shift', async () => {
    const fountain = [
      'INT. A - DAY\n\nScene.\n',
      'ALICE\nHello there.\n\nALICE\nHello there.\n\nALICE\nHello there.\n',
      'ALICE\nHello there.\n\nALICE\nHello there.\n\nALICE\nHello there.\n\nALICE\nHello there.\n',
      'BOB\nHi.\n\nBOB\nHi.\n\nBOB\nHi.\n\nBOB\nHi.\n',
    ].join('\n');
    const result = await characterArcPass(makeArcInputWithRelShifts(fountain, [
      { pair: ['alice', 'bob'], dimension: 'trust', amount: -0.4 },
    ]));
    assert.ok(
      !result.issues.some(i => i.rule === 'CHARACTER_ARC_PROTAGONIST_PASSIVE'),
      `protagonist with relational arc should not trigger the rule`,
    );
  });

  it('CHARACTER_ARC_RELATIONAL_STASIS fires for secondary character with no relational movement', async () => {
    // ALICE (7 cues, shifts with BOB), CAROL (4 cues, never shifts) — stasis should fire.
    const fountain = [
      'INT. A - DAY\n\nScene.\n',
      'ALICE\nHello there.\n\nALICE\nHello there.\n\nALICE\nHello there.\n',
      'ALICE\nHello there.\n\nALICE\nHello there.\n\nALICE\nHello there.\n\nALICE\nHello there.\n',
      'CAROL\nHi.\n\nCAROL\nHi.\n\nCAROL\nHi.\n\nCAROL\nHi.\n',
      'BOB\nHi.\n',
    ].join('\n');
    const result = await characterArcPass(makeArcInputWithRelShifts(fountain, [
      { pair: ['alice', 'bob'], dimension: 'trust', amount: -0.4 },
    ]));
    assert.ok(
      result.issues.some(i => i.rule === 'CHARACTER_ARC_RELATIONAL_STASIS'),
      `should detect secondary character with no relational arc; got: ${result.issues.map(i => i.rule).join(', ')}`,
    );
  });
});