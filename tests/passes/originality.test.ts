// Extracted from the former monolithic test.ts (audit M2.1 — split for maintainability).
// originalityPass revision-rule tests. Shared imports/helpers below are duplicated verbatim across every split
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


  // ── Wave 149: Originality pass enhancements ───────────────────────────────
  describe('Wave 149 — originalityPass: arc telegraphed, intro clichés, sensory monotone', async () => {
    const makeRec = (idx: number): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: idx % 2 === 0 ? 'establish_world' : 'raise_stakes',
      dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
      emotionalShift: 'neutral', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [],
      seededClueIds: [], payoffSetupIds: [], visualBeats: [], relationshipShifts: [],
    });

    it('originalityPass detects ARC_TELEGRAPHED when resolution is stated in opening', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // Opening line explicitly telegraphs resolution
      const fountain = `INT. SC0 - DAY
ALICE
Everything will work out, I just know it.

INT. SC1 - DAY
Something happens.
INT. SC2 - DAY
Something happens.
INT. SC3 - DAY
Something happens.
INT. SC4 - DAY
Something happens.
`;
      const records = Array.from({ length: 5 }, (_, i) => makeRec(i));
      const result = await originalityPass({
        fountain, original: fountain,
        records: records as any, structure: {} as any, annotations: [], approvedSpans: [],
      });
      const telegraphed = result.issues.filter(i => i.rule === 'ARC_TELEGRAPHED');
      assert.ok(telegraphed.length >= 1, 'Should detect ARC_TELEGRAPHED when resolution is stated in opening act');
      assert.ok(telegraphed[0].severity === 'major');
    });

    it('originalityPass does NOT fire ARC_TELEGRAPHED when opening is ambiguous', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const fountain = Array.from({ length: 5 }, (_, i) =>
        `INT. SC${i} - DAY\nThe investigation begins.\n`,
      ).join('\n');
      const records = Array.from({ length: 5 }, (_, i) => makeRec(i));
      const result = await originalityPass({
        fountain, original: fountain,
        records: records as any, structure: {} as any, annotations: [], approvedSpans: [],
      });
      const telegraphed = result.issues.filter(i => i.rule === 'ARC_TELEGRAPHED');
      assert.ok(telegraphed.length === 0, 'Should NOT fire when opening is genuinely ambiguous');
    });

    it('originalityPass detects CHARACTER_INTRO_CLICHE for stereotyped character description', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const fountain = `INT. PRECINCT - DAY
DETECTIVE COLE (50s), world-weary, hard-boiled, a man who has seen it all.

He sits at his desk.
`;
      const records = [makeRec(0)];
      const result = await originalityPass({
        fountain, original: fountain,
        records: records as any, structure: {} as any, annotations: [], approvedSpans: [],
      });
      const introCliche = result.issues.filter(i => i.rule === 'CHARACTER_INTRO_CLICHE');
      assert.ok(introCliche.length >= 1, 'Should detect CHARACTER_INTRO_CLICHE for stock character descriptions');
      assert.ok(introCliche[0].severity === 'minor');
    });

    it('originalityPass detects SENSORY_MONOTONE for purely visual screenplay', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // 25+ action lines, none with sound or tactile words
      const actionLines = Array.from({ length: 25 }, () =>
        `A figure moves across the frame. Objects are visible. The scene continues.`,
      ).join('\n');
      const fountain = `INT. SC0 - DAY\n${actionLines}\n\nINT. SC1 - DAY\n${actionLines}\n`;
      const records = [makeRec(0), makeRec(1), makeRec(2), makeRec(3), makeRec(4)];
      const result = await originalityPass({
        fountain, original: fountain,
        records: records as any, structure: {} as any, annotations: [], approvedSpans: [],
      });
      const sensory = result.issues.filter(i => i.rule === 'SENSORY_MONOTONE');
      assert.ok(sensory.length >= 1, 'Should detect SENSORY_MONOTONE when screenplay has no sound/tactile cues');
      assert.ok(sensory[0].severity === 'minor');
    });

    it('originalityPass does NOT fire SENSORY_MONOTONE when sound/tactile cues present', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // Action lines with deliberate sound/tactile words throughout
      const actionLines = Array.from({ length: 25 }, (_, i) =>
        i % 5 === 0
          ? `The door creaks. Cold air rushes in. A distant hum.`
          : `A figure moves. Objects visible. Light changes.`,
      ).join('\n');
      const fountain = `INT. SC0 - DAY\n${actionLines}\n\nINT. SC1 - DAY\n${actionLines}\n`;
      const records = [makeRec(0), makeRec(1), makeRec(2), makeRec(3), makeRec(4)];
      const result = await originalityPass({
        fountain, original: fountain,
        records: records as any, structure: {} as any, annotations: [], approvedSpans: [],
      });
      const sensory = result.issues.filter(i => i.rule === 'SENSORY_MONOTONE');
      assert.ok(sensory.length === 0, 'Should NOT fire when sensory cues are present');
    });
  });


  describe('Wave 163 — originalityPass: act3 monotone, reaction overuse, emotional plateau', async () => {
    const makeRec = (idx: number, override: Partial<any> = {}): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: 'character_moment', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [],
      payoffSetupIds: [], visualBeats: [], relationshipShifts: [],
      ...override,
    });
    const noAnnotations = (n: number) => Array.from({ length: n }, () => ({ revelation: false } as any));

    it('originalityPass detects SCENE_PURPOSE_MONOTONE_ACT3 when all Act 3 scenes same purpose', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // 8 records: act3Start=6, scenes 6-7 both 'character_moment'
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, {
          purpose: i < 6 ? (i % 3 === 0 ? 'raise_stakes' : i % 3 === 1 ? 'dialogue' : 'character_moment') : 'character_moment',
        }),
      );
      const fountain = Array.from({ length: 8 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join('');
      const result = await originalityPass({
        fountain, original: fountain, records: records as any,
        structure: {} as any, annotations: noAnnotations(8), approvedSpans: [],
      });
      const monotone = result.issues.filter(i => i.rule === 'SCENE_PURPOSE_MONOTONE_ACT3');
      assert.ok(monotone.length >= 1, `Should detect SCENE_PURPOSE_MONOTONE_ACT3; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(monotone[0].severity === 'major');
    });

    it('originalityPass does NOT fire SCENE_PURPOSE_MONOTONE_ACT3 when Act 3 has varied purposes', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, { purpose: i === 6 ? 'climax' : i === 7 ? 'resolution' : 'character_moment' }),
      );
      const fountain = Array.from({ length: 8 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join('');
      const result = await originalityPass({
        fountain, original: fountain, records: records as any,
        structure: {} as any, annotations: noAnnotations(8), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'SCENE_PURPOSE_MONOTONE_ACT3'),
        'Should NOT fire when Act 3 has varied scene purposes',
      );
    });

    it('originalityPass detects REACTION_SHOT_OVERUSE when >30% of action lines are terse reactions', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // 10 action lines total: 4 reaction shots (40% > 30%)
      const reactionLines = ['She nods.', 'He turns.', 'She looks.', 'He sighs.'].join('\n');
      const normalLines = Array.from({ length: 6 }, (_, i) => `She crosses to the window in position ${i}.`).join('\n');
      const fountain = `INT. OFFICE - DAY\n\n${reactionLines}\n${normalLines}\n\nALICE\nHello.\n`;
      const records = [makeRec(0)];
      const result = await originalityPass({
        fountain, original: fountain, records: records as any,
        structure: {} as any, annotations: noAnnotations(1), approvedSpans: [],
      });
      const reaction = result.issues.filter(i => i.rule === 'REACTION_SHOT_OVERUSE');
      assert.ok(reaction.length >= 1, `Should detect REACTION_SHOT_OVERUSE; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(reaction[0].severity === 'minor');
    });

    it('originalityPass does NOT fire REACTION_SHOT_OVERUSE when action lines are specific', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const specificLines = Array.from({ length: 10 }, (_, i) => `She reaches into the cabinet and pulls out item ${i}.`).join('\n');
      const fountain = `INT. OFFICE - DAY\n\n${specificLines}\n\nALICE\nHello.\n`;
      const records = [makeRec(0)];
      const result = await originalityPass({
        fountain, original: fountain, records: records as any,
        structure: {} as any, annotations: noAnnotations(1), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'REACTION_SHOT_OVERUSE'),
        'Should NOT fire when action lines contain specific content',
      );
    });

    it('originalityPass detects EMOTIONAL_ARC_PLATEAU when all scenes are emotionally neutral', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const records = Array.from({ length: 7 }, (_, i) =>
        makeRec(i, { emotionalShift: 'neutral', purpose: i % 2 === 0 ? 'raise_stakes' : 'dialogue' }),
      );
      const fountain = Array.from({ length: 7 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join('');
      const result = await originalityPass({
        fountain, original: fountain, records: records as any,
        structure: {} as any, annotations: noAnnotations(7), approvedSpans: [],
      });
      const plateau = result.issues.filter(i => i.rule === 'EMOTIONAL_ARC_PLATEAU');
      assert.ok(plateau.length >= 1, `Should detect EMOTIONAL_ARC_PLATEAU; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(plateau[0].severity === 'major');
    });

    it('originalityPass does NOT fire EMOTIONAL_ARC_PLATEAU when at least one scene has emotional shift', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const records = Array.from({ length: 7 }, (_, i) =>
        makeRec(i, { emotionalShift: i === 3 ? 'positive' : 'neutral', purpose: 'dialogue' }),
      );
      const fountain = Array.from({ length: 7 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join('');
      const result = await originalityPass({
        fountain, original: fountain, records: records as any,
        structure: {} as any, annotations: noAnnotations(7), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'EMOTIONAL_ARC_PLATEAU'),
        'Should NOT fire when at least one scene has a non-neutral emotional shift',
      );
    });
  });


  describe('Wave 176 — originalityPass: conjunction openings, ellipsis overuse, caps emphasis', async () => {
    const makeRec = (idx: number, override: Partial<any> = {}): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: ['establish_world', 'introduce_conflict', 'raise_stakes', 'revelation', 'climax', 'resolution'][idx % 6],
      dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: idx % 2 === 0 ? 'positive' : 'negative', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [],
      payoffSetupIds: [], visualBeats: [], relationshipShifts: [],
      ...override,
    });
    const origInput = (fountain: string, n: number) => ({
      fountain, original: fountain,
      records: Array.from({ length: n }, (_, i) => makeRec(i)) as any,
      structure: {} as any, annotations: [], approvedSpans: [],
    });

    // ── OPENING_CONJUNCTION_OVERUSE ───────────────────────────────────────────
    it('originalityPass detects OPENING_CONJUNCTION_OVERUSE when >25% of action lines open with a conjunction', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const actions = [
        'And the door swings open.', 'But she does not move.', 'So he waits in the hall.',
        'The clock ticks on the wall.', 'A car passes outside.', 'The kettle steams.',
        'Light spills across the floor.', 'She sets down the cup.',
      ];
      const fountain = `INT. ROOM - DAY\n\n${actions.join('\n')}\n`;
      const result = await originalityPass(origInput(fountain, 2));
      const conj = result.issues.filter(i => i.rule === 'OPENING_CONJUNCTION_OVERUSE');
      assert.ok(conj.length >= 1, `Should detect OPENING_CONJUNCTION_OVERUSE; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(conj[0].severity === 'minor');
    });

    it('originalityPass does NOT fire OPENING_CONJUNCTION_OVERUSE when openings are varied', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const actions = [
        'The door swings open.', 'She does not move.', 'He waits in the hall.',
        'The clock ticks on the wall.', 'A car passes outside.', 'The kettle steams.',
        'Light spills across the floor.', 'She sets down the cup.',
      ];
      const fountain = `INT. ROOM - DAY\n\n${actions.join('\n')}\n`;
      const result = await originalityPass(origInput(fountain, 2));
      assert.ok(
        !result.issues.some(i => i.rule === 'OPENING_CONJUNCTION_OVERUSE'),
        'Should NOT fire when action lines begin with their subjects',
      );
    });

    // ── ELLIPSIS_OVERUSE ──────────────────────────────────────────────────────
    it('originalityPass detects ELLIPSIS_OVERUSE when >30% of content lines trail off', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // 10 content lines, 5 with ellipses
      const body = [
        'She steps inside...', 'He follows close behind...', 'The room is empty.',
        'Maybe it always was...', 'A light flickers.', 'She turns slowly...',
        'The floor creaks.', 'He whispers something...', 'The door clicks shut.',
        'Nothing moves at all.',
      ];
      const fountain = `INT. ROOM - DAY\n\n${body.join('\n')}\n`;
      const result = await originalityPass(origInput(fountain, 2));
      const ell = result.issues.filter(i => i.rule === 'ELLIPSIS_OVERUSE');
      assert.ok(ell.length >= 1, `Should detect ELLIPSIS_OVERUSE; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(ell[0].severity === 'minor');
    });

    it('originalityPass does NOT fire ELLIPSIS_OVERUSE when lines end on hard stops', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const body = [
        'She steps inside.', 'He follows close behind.', 'The room is empty.',
        'Maybe it always was.', 'A light flickers.', 'She turns slowly.',
        'The floor creaks.', 'He whispers something...', 'The door clicks shut.',
        'Nothing moves at all.',
      ];
      const fountain = `INT. ROOM - DAY\n\n${body.join('\n')}\n`;
      const result = await originalityPass(origInput(fountain, 2));
      assert.ok(
        !result.issues.some(i => i.rule === 'ELLIPSIS_OVERUSE'),
        'Should NOT fire when only a small fraction of lines use ellipses',
      );
    });

    // ── CAPS_EMPHASIS_OVERUSE ─────────────────────────────────────────────────
    it('originalityPass detects CAPS_EMPHASIS_OVERUSE when >20% of action lines shout a caps word', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const actions = [
        'He SLAMS the door behind him.', 'She SCREAMS into the empty hall.',
        'The lamp tips over.', 'A draft moves the curtain.',
        'He steadies the table.', 'She crosses to the desk.',
        'The clock keeps ticking.', 'Rain streaks the glass.',
      ];
      const fountain = `INT. ROOM - DAY\n\n${actions.join('\n')}\n`;
      const result = await originalityPass(origInput(fountain, 2));
      const caps = result.issues.filter(i => i.rule === 'CAPS_EMPHASIS_OVERUSE');
      assert.ok(caps.length >= 1, `Should detect CAPS_EMPHASIS_OVERUSE; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(caps[0].severity === 'minor');
    });

    it('originalityPass does NOT fire CAPS_EMPHASIS_OVERUSE when action prose is lowercase', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const actions = [
        'He slams the door behind him.', 'She cries out into the empty hall.',
        'The lamp tips over.', 'A draft moves the curtain.',
        'He steadies the table.', 'She crosses to the desk.',
        'The clock keeps ticking.', 'Rain streaks the glass.',
      ];
      const fountain = `INT. ROOM - DAY\n\n${actions.join('\n')}\n`;
      const result = await originalityPass(origInput(fountain, 2));
      assert.ok(
        !result.issues.some(i => i.rule === 'CAPS_EMPHASIS_OVERUSE'),
        'Should NOT fire when action lines use ordinary lowercase prose',
      );
    });
  });


  describe('Wave 191 — originalityPass: passive voice overload, interior monologue leak, repeated location', async () => {
    const makeRec = (idx: number, override: Partial<any> = {}): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: ['establish_world', 'introduce_conflict', 'raise_stakes', 'revelation', 'climax', 'resolution'][idx % 6],
      dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: idx % 2 === 0 ? 'positive' : 'negative', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [],
      payoffSetupIds: [], visualBeats: [], relationshipShifts: [],
      ...override,
    });
    const origInput = (fountain: string, n: number) => ({
      fountain, original: fountain,
      records: Array.from({ length: n }, (_, i) => makeRec(i)) as any,
      structure: {} as any, annotations: [], approvedSpans: [],
    });

    // ── PASSIVE_VOICE_OVERLOAD ────────────────────────────────────────────────
    it('originalityPass detects PASSIVE_VOICE_OVERLOAD when >25% of action lines are passive', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // 12 action lines, 5 passive (42% > 25%)
      const actions = [
        'The file was placed on the desk.',
        'Maria opens her laptop.',
        'The report was handed to him early.',
        'John crosses to the window.',
        'A note was dropped by the door.',
        'She pulls out a pen.',
        'The window was sealed from outside.',
        'He picks up his coffee.',
        'Papers were stacked along the wall.',
        'She straightens her jacket.',
        'He types a memo.',
        'She closes the folder.',
      ];
      const fountain = `INT. OFFICE - DAY\n\n${actions.join('\n')}\n`;
      const result = await originalityPass(origInput(fountain, 2));
      const passive = result.issues.filter(i => i.rule === 'PASSIVE_VOICE_OVERLOAD');
      assert.ok(passive.length >= 1, `Should detect PASSIVE_VOICE_OVERLOAD; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(passive[0].severity === 'minor');
    });

    it('originalityPass does NOT fire PASSIVE_VOICE_OVERLOAD when action lines are active', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const actions = [
        'Maria places the file on the desk.',
        'She opens her laptop.',
        'He delivers the report to reception.',
        'John crosses to the window.',
        'Someone drops a note by the door.',
        'She pulls out a pen.',
        'They seal the window from outside.',
        'He picks up his coffee.',
        'Papers cover the wall shelf.',
        'She straightens her jacket.',
        'He types a memo.',
        'She closes the folder.',
      ];
      const fountain = `INT. OFFICE - DAY\n\n${actions.join('\n')}\n`;
      const result = await originalityPass(origInput(fountain, 2));
      assert.ok(
        !result.issues.some(i => i.rule === 'PASSIVE_VOICE_OVERLOAD'),
        'Should NOT fire when action lines use active constructions',
      );
    });

    // ── INTERIOR_MONOLOGUE_LEAK ───────────────────────────────────────────────
    it('originalityPass detects INTERIOR_MONOLOGUE_LEAK when >15% of action lines describe thoughts', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // 10 action lines, 3 interior (30% > 15%)
      const actions = [
        'She walks along the path.',
        'He thinks about what she said.',
        'A breeze moves through the trees.',
        'She wonders if it matters.',
        'He stops near the bench.',
        'Light filters through the branches.',
        'She considers leaving for good.',
        'He looks at the water.',
        'A bird lands nearby.',
        'She picks up her bag.',
      ];
      const fountain = `INT. PARK - DAY\n\n${actions.join('\n')}\n`;
      const result = await originalityPass(origInput(fountain, 2));
      const leak = result.issues.filter(i => i.rule === 'INTERIOR_MONOLOGUE_LEAK');
      assert.ok(leak.length >= 1, `Should detect INTERIOR_MONOLOGUE_LEAK; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(leak[0].severity === 'minor');
    });

    it('originalityPass does NOT fire INTERIOR_MONOLOGUE_LEAK when lines are observable', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const actions = [
        'She walks along the path.',
        'He stops near the bench.',
        'A breeze moves through the trees.',
        'She picks up a stone.',
        'He looks at the water.',
        'Light filters through the branches.',
        'A bird lands nearby.',
        'She sets the stone back down.',
        'He turns and walks away.',
        'She follows at a distance.',
      ];
      const fountain = `INT. PARK - DAY\n\n${actions.join('\n')}\n`;
      const result = await originalityPass(origInput(fountain, 2));
      assert.ok(
        !result.issues.some(i => i.rule === 'INTERIOR_MONOLOGUE_LEAK'),
        'Should NOT fire when action lines describe only observable behavior',
      );
    });

    // ── REPEATED_LOCATION_EXCESS ──────────────────────────────────────────────
    it('originalityPass detects REPEATED_LOCATION_EXCESS when one location dominates scenes', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // 6 scenes: 3 in INT. KITCHEN (50% >= 40%), 3 varied → fires
      const fountain = [
        'INT. KITCHEN - DAY\n\nAction line one.\n',
        'INT. HALLWAY - NIGHT\n\nAction line two.\n',
        'INT. KITCHEN - NIGHT\n\nAction line three.\n',
        'EXT. GARDEN - DAY\n\nAction line four.\n',
        'INT. KITCHEN - MORNING\n\nAction line five.\n',
        'EXT. STREET - DAY\n\nAction line six.\n',
      ].join('\n');
      const result = await originalityPass(origInput(fountain, 6));
      const repeated = result.issues.filter(i => i.rule === 'REPEATED_LOCATION_EXCESS');
      assert.ok(repeated.length >= 1, `Should detect REPEATED_LOCATION_EXCESS; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(repeated[0].severity === 'minor');
    });

    it('originalityPass does NOT fire REPEATED_LOCATION_EXCESS when locations are varied', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // 6 unique locations — no location appears more than once
      const fountain = [
        'INT. KITCHEN - DAY\n\nLine one.\n',
        'INT. HALLWAY - NIGHT\n\nLine two.\n',
        'EXT. GARDEN - DAY\n\nLine three.\n',
        'INT. BEDROOM - MORNING\n\nLine four.\n',
        'EXT. STREET - NIGHT\n\nLine five.\n',
        'INT. OFFICE - DAY\n\nLine six.\n',
      ].join('\n');
      const result = await originalityPass(origInput(fountain, 6));
      assert.ok(
        !result.issues.some(i => i.rule === 'REPEATED_LOCATION_EXCESS'),
        'Should NOT fire when each scene uses a different location',
      );
    });
  });


  describe('Wave 231 — originalityPass: purpose bookend repeat, I-dominance, Act 3 action drought', async () => {
    const makeRec231 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, dialogueHighlights: [],
      revelation: null, purpose: 'development', dramaticTurn: '',
      seededClueIds: [], payoffSetupIds: [], relationshipShifts: [],
      ...overrides,
    });

    it('PURPOSE_BOOKEND_REPEAT fires when Act 1 and Act 3 share the same dominant purpose', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // 8 records: Act1 = scenes 0-1 (establish_world x2), Act3 = scenes 6-7 (establish_world x2)
      const records231a = [
        makeRec231(0, { purpose: 'establish_world' }),
        makeRec231(1, { purpose: 'establish_world' }),
        makeRec231(2, { purpose: 'raise_stakes' }),
        makeRec231(3, { purpose: 'complicate' }),
        makeRec231(4, { purpose: 'revelation' }),
        makeRec231(5, { purpose: 'climax' }),
        makeRec231(6, { purpose: 'establish_world' }),
        makeRec231(7, { purpose: 'establish_world' }),
      ];
      const fountain231a = records231a.map(r => `INT. SC${r.sceneIdx} - DAY\nAction line.\nALICE\nDialogue.\nBOB\nReply.`).join('\n');
      const result = await originalityPass({
        fountain: fountain231a, original: fountain231a,
        records: records231a,
        structure: {} as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'PURPOSE_BOOKEND_REPEAT');
      assert.ok(match.length >= 1, `Expected PURPOSE_BOOKEND_REPEAT, got: ${JSON.stringify(result.issues.map((i:any)=>i.rule))}`);
    });

    it('PURPOSE_BOOKEND_REPEAT does NOT fire when Act 1 and Act 3 have different dominant purposes', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const records231b = [
        makeRec231(0, { purpose: 'establish_world' }),
        makeRec231(1, { purpose: 'establish_world' }),
        makeRec231(2, { purpose: 'raise_stakes' }),
        makeRec231(3, { purpose: 'complicate' }),
        makeRec231(4, { purpose: 'revelation' }),
        makeRec231(5, { purpose: 'climax' }),
        makeRec231(6, { purpose: 'resolution' }),
        makeRec231(7, { purpose: 'resolution' }),
      ];
      const fountain231b = records231b.map(r => `INT. SC${r.sceneIdx} - DAY\nAction line.\nALICE\nDialogue.\nBOB\nReply.`).join('\n');
      const result = await originalityPass({
        fountain: fountain231b, original: fountain231b,
        records: records231b,
        structure: {} as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'PURPOSE_BOOKEND_REPEAT');
      assert.strictEqual(match.length, 0, 'Should NOT fire when Act 1 and Act 3 have different dominant purposes');
    });

    it('DIALOGUE_I_DOMINANCE fires when >40% of dialogue lines start with "I"', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // 12 dialogue lines: 10 start with "I" (83%)
      const fountain231c = [
        'INT. OFFICE - DAY',
        'A quiet office space.',
        'ALICE', 'I want to leave.', 'BOB', 'I think we should stay.',
        'ALICE', 'I know what you mean.', 'BOB', 'I told you already.',
        'ALICE', 'I feel like we are stuck.', 'BOB', 'I do not agree.',
        'ALICE', 'We can do this.', 'BOB', 'Let us try.',
        'ALICE', 'I believe in us.', 'BOB', 'I understand.',
        'ALICE', 'I will not give up.', 'BOB', 'I respect that.',
      ].join('\n');
      const records231c = [makeRec231(0)];
      const result = await originalityPass({
        fountain: fountain231c, original: fountain231c,
        records: records231c,
        structure: {} as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'DIALOGUE_I_DOMINANCE');
      assert.ok(match.length >= 1, `Expected DIALOGUE_I_DOMINANCE, got: ${JSON.stringify(result.issues.map((i:any)=>i.rule))}`);
    });

    it('DIALOGUE_I_DOMINANCE does NOT fire when I-starts are below 40%', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // 12 dialogue lines: only 3 start with "I" (25%)
      const fountain231d = [
        'INT. PARK - DAY',
        'Trees rustle in the wind.',
        'ALICE', 'You were there last night.',
        'BOB', 'We both know what happened.',
        'ALICE', 'Tell me what you saw.',
        'BOB', 'I heard something unusual.',
        'ALICE', 'That changes things.',
        'BOB', 'Not necessarily.',
        'ALICE', 'Think about it carefully.',
        'BOB', 'She was not alone.',
        'ALICE', 'Are you certain?',
        'BOB', 'I am.',
      ].join('\n');
      const records231d = [makeRec231(0)];
      const result = await originalityPass({
        fountain: fountain231d, original: fountain231d,
        records: records231d,
        structure: {} as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'DIALOGUE_I_DOMINANCE');
      assert.strictEqual(match.length, 0, 'Should NOT fire when I-start rate is below 40%');
    });

    it('ACT3_ACTION_DROUGHT fires when Act 3 has far fewer action lines per scene than Act 1', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // 8 scenes: Act1 (scenes 0-1) has rich action, Act3 (scenes 6-7) is dialogue-only
      const act1Scene = (i: number) => [
        `INT. WAREHOUSE SC${i} - DAY`,
        'Boxes stacked ceiling-high. Dust in shafts of amber light.',
        'A chain drags across concrete. Boots squelch through puddles.',
        'The conveyor belt grinds and stops. A mechanical hiss.',
        'ALICE', 'Are you ready?',
      ].join('\n');
      const act3Scene = (i: number) => [
        `INT. OFFICE SC${i} - DAY`,
        'ALICE', 'I see it now.', 'BOB', 'Yes.', 'ALICE', 'Everything makes sense.', 'BOB', 'Finally.',
      ].join('\n');
      const midScene = (i: number) => [
        `INT. CORRIDOR SC${i} - DAY`,
        'She walks. He follows.',
        'ALICE', 'Keep moving.',
      ].join('\n');
      const fountain231e = [
        act1Scene(0), act1Scene(1),
        midScene(2), midScene(3), midScene(4), midScene(5),
        act3Scene(6), act3Scene(7),
      ].join('\n');
      const records231e = Array.from({ length: 8 }, (_, i) =>
        makeRec231(i, { purpose: i < 2 ? 'establish_world' : i >= 6 ? 'resolution' : 'development' }),
      );
      const result = await originalityPass({
        fountain: fountain231e, original: fountain231e,
        records: records231e,
        structure: {} as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'ACT3_ACTION_DROUGHT');
      assert.ok(match.length >= 1, `Expected ACT3_ACTION_DROUGHT, got: ${JSON.stringify(result.issues.map((i:any)=>i.rule))}`);
    });

    it('ACT3_ACTION_DROUGHT does NOT fire when Act 3 has comparable action density to Act 1', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const richScene = (i: number) => [
        `INT. ROOM SC${i} - DAY`,
        'Heavy silence fills the space.', 'Shadows move across the floor.', 'A clock ticks.',
        'ALICE', 'Now.', 'BOB', 'Ready.',
      ].join('\n');
      const fountain231f = Array.from({ length: 8 }, (_, i) => richScene(i)).join('\n');
      const records231f = Array.from({ length: 8 }, (_, i) => makeRec231(i));
      const result = await originalityPass({
        fountain: fountain231f, original: fountain231f,
        records: records231f,
        structure: {} as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'ACT3_ACTION_DROUGHT');
      assert.strictEqual(match.length, 0, 'Should NOT fire when Act 3 action density is comparable to Act 1');
    });
  });


  describe('Wave 788 — originalityPass: originality suspense drought run, originality curiosity zone cluster, originality emotion zone cluster', async () => {
    // Same truncation pitfall as Waves 592/606/620/634/648/662/676/690/704/718/732/746/760/774
    // above — every fixture cycles purpose/emotion/dialogue/slug/sentence per scene to avoid
    // tripping unrelated 'major' rules that would crowd these 'minor' checks out.
    const PURPOSE_POOL_788 = ['establish_world', 'introduce_conflict', 'complicate', 'turning_point', 'climax', 'resolution', 'character_moment'];
    const EMOTION_POOL_788 = ['positive', 'negative', 'neutral'];
    const SENTENCE_POOL_788 = [
      'Alice studies the map by lamplight.', 'Bob paces the length of the corridor.',
      'Rain streaks the tall window.', 'A phone buzzes on the counter.',
      'Footsteps echo down the stairwell.', 'The kettle whistles on the stove.',
      'A drawer sticks halfway open.', 'Wind rattles the loose shutter.',
      'Dust settles on the piano keys.', 'A cat leaps onto the windowsill.',
      'The lamp flickers once and steadies.', 'Someone taps twice on the door.',
    ];
    const slugFor788 = (idx: number) => `${idx % 2 === 0 ? 'INT.' : 'EXT.'} LOCATION ${idx} - ${idx % 3 === 0 ? 'DAY' : idx % 3 === 1 ? 'NIGHT' : 'DUSK'}`;
    const makeRec788 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: slugFor788(idx),
      emotionalShift: EMOTION_POOL_788[idx % EMOTION_POOL_788.length],
      suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [],
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: PURPOSE_POOL_788[idx % PURPOSE_POOL_788.length],
      dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildFountain788 = (count: number): string =>
      Array.from({ length: count }, (_, i) => `${slugFor788(i)}\n\n${SENTENCE_POOL_788[i % SENTENCE_POOL_788.length]}`).join('\n\n');
    const runO788 = async (records: any[], fountain?: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const f = fountain ?? buildFountain788(records.length);
      return originalityPass({
        fountain: f, original: f, records,
        structure: { escalating: false, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ORIGINALITY_SUSPENSE_DROUGHT_RUN fire:
    // n=10; suspenseDelta>0 at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('ORIGINALITY_SUSPENSE_DROUGHT_RUN fires when a long run has no rising suspense', async () => {
      const recs788a = Array.from({ length: 10 }, (_, i) => makeRec788(i, {
        suspenseDelta: (i === 0 || i === 1 || i === 2) ? 2 : 0,
      }));
      const res = await runO788(recs788a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_SUSPENSE_DROUGHT_RUN'), 'ORIGINALITY_SUSPENSE_DROUGHT_RUN should fire');
    });

    it('ORIGINALITY_SUSPENSE_DROUGHT_RUN does not fire when suspense rises are evenly spread', async () => {
      const recs788an = Array.from({ length: 10 }, (_, i) => makeRec788(i, {
        suspenseDelta: (i === 0 || i === 3 || i === 6 || i === 9) ? 2 : 0,
      }));
      const res = await runO788(recs788an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_SUSPENSE_DROUGHT_RUN'), 'ORIGINALITY_SUSPENSE_DROUGHT_RUN should not fire');
    });

    // ORIGINALITY_CURIOSITY_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; curiosity-positive scenes at 0,1,2 → 100% opening third
    it('ORIGINALITY_CURIOSITY_ZONE_CLUSTER fires when >75% of curiosity-positive scenes cluster in one third', async () => {
      const recs788b = Array.from({ length: 9 }, (_, i) => makeRec788(i, {
        curiosityDelta: (i === 0 || i === 1 || i === 2) ? 2 : 0,
      }));
      const res = await runO788(recs788b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_CURIOSITY_ZONE_CLUSTER'), 'ORIGINALITY_CURIOSITY_ZONE_CLUSTER should fire');
    });

    it('ORIGINALITY_CURIOSITY_ZONE_CLUSTER does not fire when curiosity-positive scenes spread across thirds', async () => {
      const recs788bn = Array.from({ length: 9 }, (_, i) => makeRec788(i, {
        curiosityDelta: (i === 0 || i === 4 || i === 8) ? 2 : 0,
      }));
      const res = await runO788(recs788bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_CURIOSITY_ZONE_CLUSTER'), 'ORIGINALITY_CURIOSITY_ZONE_CLUSTER should not fire');
    });

    // ORIGINALITY_EMOTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; emotionally charged scenes at 0,1,2 → 100% opening third
    it('ORIGINALITY_EMOTION_ZONE_CLUSTER fires when >75% of emotionally charged scenes cluster in one third', async () => {
      const recs788c = Array.from({ length: 9 }, (_, i) => makeRec788(i, {
        emotionalShift: (i === 0 || i === 1 || i === 2) ? 'negative' : 'neutral',
      }));
      const res = await runO788(recs788c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_EMOTION_ZONE_CLUSTER'), 'ORIGINALITY_EMOTION_ZONE_CLUSTER should fire');
    });

    it('ORIGINALITY_EMOTION_ZONE_CLUSTER does not fire when emotionally charged scenes spread across thirds', async () => {
      const recs788cn = Array.from({ length: 9 }, (_, i) => makeRec788(i, {
        emotionalShift: (i === 0 || i === 4 || i === 8) ? 'negative' : 'neutral',
      }));
      const res = await runO788(recs788cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_EMOTION_ZONE_CLUSTER'), 'ORIGINALITY_EMOTION_ZONE_CLUSTER should not fire');
    });
  });


  describe('Wave 774 — originalityPass: originality clock delta peak uncaused, originality clock delta zone cluster, originality suspense zone cluster', async () => {
    // Same truncation pitfall as Waves 592/606/620/634/648/662/676/690/704/718/732/746/760 above —
    // every fixture cycles purpose/emotion/dialogue/slug/sentence per scene to avoid tripping
    // unrelated 'major' rules that would crowd these 'minor' checks out.
    const PURPOSE_POOL_774 = ['establish_world', 'introduce_conflict', 'complicate', 'turning_point', 'climax', 'resolution', 'character_moment'];
    const EMOTION_POOL_774 = ['positive', 'negative', 'neutral'];
    const SENTENCE_POOL_774 = [
      'Alice studies the map by lamplight.', 'Bob paces the length of the corridor.',
      'Rain streaks the tall window.', 'A phone buzzes on the counter.',
      'Footsteps echo down the stairwell.', 'The kettle whistles on the stove.',
      'A drawer sticks halfway open.', 'Wind rattles the loose shutter.',
      'Dust settles on the piano keys.', 'A cat leaps onto the windowsill.',
      'The lamp flickers once and steadies.', 'Someone taps twice on the door.',
    ];
    const slugFor774 = (idx: number) => `${idx % 2 === 0 ? 'INT.' : 'EXT.'} LOCATION ${idx} - ${idx % 3 === 0 ? 'DAY' : idx % 3 === 1 ? 'NIGHT' : 'DUSK'}`;
    const makeRec774 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: slugFor774(idx),
      emotionalShift: EMOTION_POOL_774[idx % EMOTION_POOL_774.length],
      suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [],
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: PURPOSE_POOL_774[idx % PURPOSE_POOL_774.length],
      dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildFountain774 = (count: number): string =>
      Array.from({ length: count }, (_, i) => `${slugFor774(i)}\n\n${SENTENCE_POOL_774[i % SENTENCE_POOL_774.length]}`).join('\n\n');
    const runO774 = async (records: any[], fountain?: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const f = fountain ?? buildFountain774(records.length);
      return originalityPass({
        fountain: f, original: f, records,
        structure: { escalating: false, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ORIGINALITY_CLOCK_DELTA_PEAK_UNCAUSED fire:
    // 8 scenes; clockDelta magnitude qualifying (!==0) at 2 and 5 (tie on |magnitude|=3, peak
    // resolves to the first occurrence — scene 2); no dramaticTurn/revelation at 2, 1, or 0.
    it('ORIGINALITY_CLOCK_DELTA_PEAK_UNCAUSED fires when the peak clock-delta scene has no preparing cause nearby', async () => {
      const recs774a = Array.from({ length: 8 }, (_, i) => makeRec774(i, {
        clockDelta: (i === 2 || i === 5) ? 3 : 0,
      }));
      const res = await runO774(recs774a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_CLOCK_DELTA_PEAK_UNCAUSED'), 'ORIGINALITY_CLOCK_DELTA_PEAK_UNCAUSED should fire');
    });

    it('ORIGINALITY_CLOCK_DELTA_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak clock-delta scene within the lookback', async () => {
      const recs774an = Array.from({ length: 8 }, (_, i) => makeRec774(i, {
        clockDelta: (i === 2 || i === 5) ? 3 : 0,
        dramaticTurn: i === 1 ? 'reversal' : 'nothing',
      }));
      const res = await runO774(recs774an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_CLOCK_DELTA_PEAK_UNCAUSED'), 'ORIGINALITY_CLOCK_DELTA_PEAK_UNCAUSED should not fire');
    });

    // ORIGINALITY_CLOCK_DELTA_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; clock-shifting scenes at 0,1,2 → 100% opening third
    it('ORIGINALITY_CLOCK_DELTA_ZONE_CLUSTER fires when >75% of clock-shifting scenes cluster in one third', async () => {
      const recs774b = Array.from({ length: 9 }, (_, i) => makeRec774(i, {
        clockDelta: (i === 0 || i === 1 || i === 2) ? 1 : 0,
      }));
      const res = await runO774(recs774b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_CLOCK_DELTA_ZONE_CLUSTER'), 'ORIGINALITY_CLOCK_DELTA_ZONE_CLUSTER should fire');
    });

    it('ORIGINALITY_CLOCK_DELTA_ZONE_CLUSTER does not fire when clock-shifting scenes spread across thirds', async () => {
      const recs774bn = Array.from({ length: 9 }, (_, i) => makeRec774(i, {
        clockDelta: (i === 0 || i === 4 || i === 8) ? 1 : 0,
      }));
      const res = await runO774(recs774bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_CLOCK_DELTA_ZONE_CLUSTER'), 'ORIGINALITY_CLOCK_DELTA_ZONE_CLUSTER should not fire');
    });

    // ORIGINALITY_SUSPENSE_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; suspense-positive scenes at 0,1,2 → 100% opening third
    it('ORIGINALITY_SUSPENSE_ZONE_CLUSTER fires when >75% of suspense-positive scenes cluster in one third', async () => {
      const recs774c = Array.from({ length: 9 }, (_, i) => makeRec774(i, {
        suspenseDelta: (i === 0 || i === 1 || i === 2) ? 2 : 0,
      }));
      const res = await runO774(recs774c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_SUSPENSE_ZONE_CLUSTER'), 'ORIGINALITY_SUSPENSE_ZONE_CLUSTER should fire');
    });

    it('ORIGINALITY_SUSPENSE_ZONE_CLUSTER does not fire when suspense-positive scenes spread across thirds', async () => {
      const recs774cn = Array.from({ length: 9 }, (_, i) => makeRec774(i, {
        suspenseDelta: (i === 0 || i === 4 || i === 8) ? 2 : 0,
      }));
      const res = await runO774(recs774cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_SUSPENSE_ZONE_CLUSTER'), 'ORIGINALITY_SUSPENSE_ZONE_CLUSTER should not fire');
    });
  });


  describe('Wave 760 — originalityPass: originality revelation peak uncaused, originality stakes drought run, originality clock delta drought run', async () => {
    // Same truncation pitfall as Waves 592/606/620/634/648/662/676/690/704/718/732/746 above —
    // every fixture cycles purpose/emotion/dialogue/slug/sentence per scene to avoid tripping
    // unrelated 'major' rules that would crowd these 'minor' checks out.
    const PURPOSE_POOL_760 = ['establish_world', 'introduce_conflict', 'complicate', 'turning_point', 'climax', 'resolution', 'character_moment'];
    const EMOTION_POOL_760 = ['positive', 'negative', 'neutral'];
    const SENTENCE_POOL_760 = [
      'Alice studies the map by lamplight.', 'Bob paces the length of the corridor.',
      'Rain streaks the tall window.', 'A phone buzzes on the counter.',
      'Footsteps echo down the stairwell.', 'The kettle whistles on the stove.',
      'A drawer sticks halfway open.', 'Wind rattles the loose shutter.',
      'Dust settles on the piano keys.', 'A cat leaps onto the windowsill.',
      'The lamp flickers once and steadies.', 'Someone taps twice on the door.',
    ];
    const slugFor760 = (idx: number) => `${idx % 2 === 0 ? 'INT.' : 'EXT.'} LOCATION ${idx} - ${idx % 3 === 0 ? 'DAY' : idx % 3 === 1 ? 'NIGHT' : 'DUSK'}`;
    const makeRec760 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: slugFor760(idx),
      emotionalShift: EMOTION_POOL_760[idx % EMOTION_POOL_760.length],
      suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [],
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: PURPOSE_POOL_760[idx % PURPOSE_POOL_760.length],
      dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildFountain760 = (count: number): string =>
      Array.from({ length: count }, (_, i) => `${slugFor760(i)}\n\n${SENTENCE_POOL_760[i % SENTENCE_POOL_760.length]}`).join('\n\n');
    const runO760 = async (records: any[], fountain?: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const f = fountain ?? buildFountain760(records.length);
      return originalityPass({
        fountain: f, original: f, records,
        structure: { escalating: false, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ORIGINALITY_REVELATION_PEAK_UNCAUSED fire:
    // 8 scenes; revelations at 2 and 5 (magnitude ties at 1, peak resolves to the first
    // occurrence — scene 2); no dramaticTurn at 2, 1, or 0.
    it('ORIGINALITY_REVELATION_PEAK_UNCAUSED fires when the peak revelation scene has no dramatic turn nearby', async () => {
      const recs760a = Array.from({ length: 8 }, (_, i) => makeRec760(i, {
        revelation: (i === 2 || i === 5) ? 'a truth surfaces' : null,
      }));
      const res = await runO760(recs760a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_REVELATION_PEAK_UNCAUSED'), 'ORIGINALITY_REVELATION_PEAK_UNCAUSED should fire');
    });

    // ORIGINALITY_REVELATION_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 1, within the peak's 2-scene lookback (2-1=1)
    it('ORIGINALITY_REVELATION_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak revelation within the lookback', async () => {
      const recs760an = Array.from({ length: 8 }, (_, i) => makeRec760(i, {
        revelation: (i === 2 || i === 5) ? 'a truth surfaces' : null,
        dramaticTurn: i === 1 ? 'reversal' : 'nothing',
      }));
      const res = await runO760(recs760an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_REVELATION_PEAK_UNCAUSED'), 'ORIGINALITY_REVELATION_PEAK_UNCAUSED should not fire');
    });

    // ORIGINALITY_STAKES_DROUGHT_RUN fire:
    // 10 scenes; stakes-raising at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('ORIGINALITY_STAKES_DROUGHT_RUN fires when the longest no-stakes-raise run is ≥6', async () => {
      const recs760b = Array.from({ length: 10 }, (_, i) => makeRec760(i, {
        purpose: (i === 0 || i === 1 || i === 2 || i === 9) ? 'raise_stakes' : PURPOSE_POOL_760[i % PURPOSE_POOL_760.length],
      }));
      const res = await runO760(recs760b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_STAKES_DROUGHT_RUN'), 'ORIGINALITY_STAKES_DROUGHT_RUN should fire');
    });

    // ORIGINALITY_STAKES_DROUGHT_RUN no-fire:
    // stakes-raising at 0, 4, 9 → longest drought run = 4 (scenes 5-8) < 6
    it('ORIGINALITY_STAKES_DROUGHT_RUN does not fire when stakes-raising scenes are distributed without a long drought', async () => {
      const recs760bn = Array.from({ length: 10 }, (_, i) => makeRec760(i, {
        purpose: (i === 0 || i === 4 || i === 9) ? 'raise_stakes' : PURPOSE_POOL_760[i % PURPOSE_POOL_760.length],
      }));
      const res = await runO760(recs760bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_STAKES_DROUGHT_RUN'), 'ORIGINALITY_STAKES_DROUGHT_RUN should not fire');
    });

    // ORIGINALITY_CLOCK_DELTA_DROUGHT_RUN fire:
    // n=10; scenes 0,1,2 shift the clock (>=3 present overall); scenes 3-9 (7 scenes) have none
    it('ORIGINALITY_CLOCK_DELTA_DROUGHT_RUN fires when the longest no-clock-movement run reaches 6', async () => {
      const recs760c = Array.from({ length: 10 }, (_, i) => makeRec760(i, {
        clockDelta: (i === 0 || i === 1 || i === 2) ? 1 : 0,
      }));
      const res = await runO760(recs760c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_CLOCK_DELTA_DROUGHT_RUN'), 'ORIGINALITY_CLOCK_DELTA_DROUGHT_RUN should fire');
    });

    // ORIGINALITY_CLOCK_DELTA_DROUGHT_RUN no-fire:
    // clock-shifting scenes spread out so no gap reaches 6 consecutive scenes
    it('ORIGINALITY_CLOCK_DELTA_DROUGHT_RUN does not fire when clock movement is spread through the story', async () => {
      const recs760cn = Array.from({ length: 10 }, (_, i) => makeRec760(i, {
        clockDelta: (i === 0 || i === 3 || i === 6 || i === 9) ? 1 : 0,
      }));
      const res = await runO760(recs760cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_CLOCK_DELTA_DROUGHT_RUN'), 'ORIGINALITY_CLOCK_DELTA_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 746 — originalityPass: originality open thread zone cluster, originality turn drought run, originality stakes zone cluster', async () => {
    // Same truncation pitfall as Waves 592/606/620/634/648/662/676/690/704/718/732 above — every
    // fixture cycles purpose/emotion/dialogue/slug/sentence per scene to avoid tripping unrelated
    // 'major' rules that would crowd these 'minor' checks out.
    const PURPOSE_POOL_746 = ['establish_world', 'introduce_conflict', 'complicate', 'raise_stakes', 'revelation', 'turning_point', 'climax', 'resolution', 'character_moment'];
    const EMOTION_POOL_746 = ['positive', 'negative', 'neutral'];
    const SENTENCE_POOL_746 = [
      'Alice studies the map by lamplight.', 'Bob paces the length of the corridor.',
      'Rain streaks the tall window.', 'A phone buzzes on the counter.',
      'Footsteps echo down the stairwell.', 'The kettle whistles on the stove.',
      'A drawer sticks halfway open.', 'Wind rattles the loose shutter.',
      'Dust settles on the piano keys.', 'A cat leaps onto the windowsill.',
      'The lamp flickers once and steadies.', 'Someone taps twice on the door.',
    ];
    const slugFor746 = (idx: number) => `${idx % 2 === 0 ? 'INT.' : 'EXT.'} LOCATION ${idx} - ${idx % 3 === 0 ? 'DAY' : idx % 3 === 1 ? 'NIGHT' : 'DUSK'}`;
    const makeRec746 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: slugFor746(idx),
      emotionalShift: EMOTION_POOL_746[idx % EMOTION_POOL_746.length],
      suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [],
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: PURPOSE_POOL_746[idx % PURPOSE_POOL_746.length],
      dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildFountain746 = (count: number): string =>
      Array.from({ length: count }, (_, i) => `${slugFor746(i)}\n\n${SENTENCE_POOL_746[i % SENTENCE_POOL_746.length]}`).join('\n\n');
    const runO746 = async (records: any[], fountain?: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const f = fountain ?? buildFountain746(records.length);
      return originalityPass({
        fountain: f, original: f, records,
        structure: { escalating: false, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ORIGINALITY_OPEN_THREAD_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; open-thread scenes at 0,1,2 → 100% opening third
    it('ORIGINALITY_OPEN_THREAD_ZONE_CLUSTER fires when >75% of open-thread scenes cluster in one third', async () => {
      const recs746a = Array.from({ length: 9 }, (_, i) => makeRec746(i, {
        unresolvedClues: (i === 0 || i === 1 || i === 2) ? ['clue-a'] : [],
      }));
      const res = await runO746(recs746a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_OPEN_THREAD_ZONE_CLUSTER'), 'ORIGINALITY_OPEN_THREAD_ZONE_CLUSTER should fire');
    });

    // ORIGINALITY_OPEN_THREAD_ZONE_CLUSTER no-fire:
    // open-thread scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('ORIGINALITY_OPEN_THREAD_ZONE_CLUSTER does not fire when open-thread scenes are distributed across thirds', async () => {
      const recs746an = Array.from({ length: 9 }, (_, i) => makeRec746(i, {
        unresolvedClues: (i === 0 || i === 4 || i === 7) ? ['clue-a'] : [],
      }));
      const res = await runO746(recs746an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_OPEN_THREAD_ZONE_CLUSTER'), 'ORIGINALITY_OPEN_THREAD_ZONE_CLUSTER should not fire');
    });

    // ORIGINALITY_TURN_DROUGHT_RUN fire:
    // 10 scenes; dramatic turns at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('ORIGINALITY_TURN_DROUGHT_RUN fires when the longest no-dramatic-turn run is ≥6', async () => {
      const recs746b = Array.from({ length: 10 }, (_, i) => makeRec746(i, {
        dramaticTurn: (i === 0 || i === 1 || i === 2 || i === 9) ? 'reversal' : 'nothing',
      }));
      const res = await runO746(recs746b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_TURN_DROUGHT_RUN'), 'ORIGINALITY_TURN_DROUGHT_RUN should fire');
    });

    // ORIGINALITY_TURN_DROUGHT_RUN no-fire:
    // dramatic turns at 0, 4, 9 → longest drought run = 4 (scenes 5-8) < 6
    it('ORIGINALITY_TURN_DROUGHT_RUN does not fire when dramatic turns are distributed without a long drought', async () => {
      const recs746bn = Array.from({ length: 10 }, (_, i) => makeRec746(i, {
        dramaticTurn: (i === 0 || i === 4 || i === 9) ? 'reversal' : 'nothing',
      }));
      const res = await runO746(recs746bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_TURN_DROUGHT_RUN'), 'ORIGINALITY_TURN_DROUGHT_RUN should not fire');
    });

    // ORIGINALITY_STAKES_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; stakes-raising scenes at 0,1,2 → 100% opening third
    it('ORIGINALITY_STAKES_ZONE_CLUSTER fires when >75% of stakes-raising scenes cluster in one third', async () => {
      const recs746c = Array.from({ length: 9 }, (_, i) => makeRec746(i, {
        purpose: (i === 0 || i === 1 || i === 2) ? 'raise_stakes' : 'complicate',
      }));
      const res = await runO746(recs746c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_STAKES_ZONE_CLUSTER'), 'ORIGINALITY_STAKES_ZONE_CLUSTER should fire');
    });

    // ORIGINALITY_STAKES_ZONE_CLUSTER no-fire:
    // stakes-raising scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('ORIGINALITY_STAKES_ZONE_CLUSTER does not fire when stakes-raising scenes are distributed across thirds', async () => {
      const recs746cn = Array.from({ length: 9 }, (_, i) => makeRec746(i, {
        purpose: (i === 0 || i === 4 || i === 7) ? 'raise_stakes' : 'complicate',
      }));
      const res = await runO746(recs746cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_STAKES_ZONE_CLUSTER'), 'ORIGINALITY_STAKES_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 732 — originalityPass: originality relationship drought run, originality revelation zone cluster, originality open thread peak uncaused', async () => {
    // Same truncation pitfall as Waves 592/606/620/634/648/662/676/690/704/718 above — every
    // fixture cycles purpose/emotion/dialogue/slug/sentence per scene to avoid tripping unrelated
    // 'major' rules that would crowd these 'minor' checks out.
    const PURPOSE_POOL_732 = ['establish_world', 'introduce_conflict', 'complicate', 'raise_stakes', 'revelation', 'turning_point', 'climax', 'resolution', 'character_moment'];
    const EMOTION_POOL_732 = ['positive', 'negative', 'neutral'];
    const SENTENCE_POOL_732 = [
      'Alice studies the map by lamplight.', 'Bob paces the length of the corridor.',
      'Rain streaks the tall window.', 'A phone buzzes on the counter.',
      'Footsteps echo down the stairwell.', 'The kettle whistles on the stove.',
      'A drawer sticks halfway open.', 'Wind rattles the loose shutter.',
      'Dust settles on the piano keys.', 'A cat leaps onto the windowsill.',
      'The lamp flickers once and steadies.', 'Someone taps twice on the door.',
    ];
    const slugFor732 = (idx: number) => `${idx % 2 === 0 ? 'INT.' : 'EXT.'} LOCATION ${idx} - ${idx % 3 === 0 ? 'DAY' : idx % 3 === 1 ? 'NIGHT' : 'DUSK'}`;
    const makeRec732 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: slugFor732(idx),
      emotionalShift: EMOTION_POOL_732[idx % EMOTION_POOL_732.length],
      suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [],
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: PURPOSE_POOL_732[idx % PURPOSE_POOL_732.length],
      dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildFountain732 = (count: number): string =>
      Array.from({ length: count }, (_, i) => `${slugFor732(i)}\n\n${SENTENCE_POOL_732[i % SENTENCE_POOL_732.length]}`).join('\n\n');
    const runO732 = async (records: any[], fountain?: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const f = fountain ?? buildFountain732(records.length);
      return originalityPass({
        fountain: f, original: f, records,
        structure: { escalating: false, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ORIGINALITY_RELATIONSHIP_DROUGHT_RUN fire:
    // 10 scenes; relationship shifts at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('ORIGINALITY_RELATIONSHIP_DROUGHT_RUN fires when the longest no-relationship-shift run is ≥6', async () => {
      const recs732a = Array.from({ length: 10 }, (_, i) => makeRec732(i, {
        relationshipShifts: (i === 0 || i === 1 || i === 2 || i === 9) ? [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] : [],
      }));
      const res = await runO732(recs732a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_RELATIONSHIP_DROUGHT_RUN'), 'ORIGINALITY_RELATIONSHIP_DROUGHT_RUN should fire');
    });

    // ORIGINALITY_RELATIONSHIP_DROUGHT_RUN no-fire:
    // relationship shifts at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('ORIGINALITY_RELATIONSHIP_DROUGHT_RUN does not fire when relationship shifts are distributed without a long drought', async () => {
      const recs732an = Array.from({ length: 10 }, (_, i) => makeRec732(i, {
        relationshipShifts: (i === 0 || i === 4 || i === 9) ? [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] : [],
      }));
      const res = await runO732(recs732an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_RELATIONSHIP_DROUGHT_RUN'), 'ORIGINALITY_RELATIONSHIP_DROUGHT_RUN should not fire');
    });

    // ORIGINALITY_REVELATION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; revelation scenes at 0,1,2 → 100% opening third
    it('ORIGINALITY_REVELATION_ZONE_CLUSTER fires when >75% of revelation scenes cluster in one third', async () => {
      const recs732b = Array.from({ length: 9 }, (_, i) => makeRec732(i, {
        revelation: (i === 0 || i === 1 || i === 2) ? 'a truth surfaces' : null,
      }));
      const res = await runO732(recs732b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_REVELATION_ZONE_CLUSTER'), 'ORIGINALITY_REVELATION_ZONE_CLUSTER should fire');
    });

    // ORIGINALITY_REVELATION_ZONE_CLUSTER no-fire:
    // revelation scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('ORIGINALITY_REVELATION_ZONE_CLUSTER does not fire when revelation scenes are distributed across thirds', async () => {
      const recs732bn = Array.from({ length: 9 }, (_, i) => makeRec732(i, {
        revelation: (i === 0 || i === 4 || i === 7) ? 'a truth surfaces' : null,
      }));
      const res = await runO732(recs732bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_REVELATION_ZONE_CLUSTER'), 'ORIGINALITY_REVELATION_ZONE_CLUSTER should not fire');
    });

    // ORIGINALITY_OPEN_THREAD_PEAK_UNCAUSED fire:
    // 8 scenes; open threads at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('ORIGINALITY_OPEN_THREAD_PEAK_UNCAUSED fires when the peak open-thread scene has no dramatic turn or revelation nearby', async () => {
      const recs732c = Array.from({ length: 8 }, (_, i) => makeRec732(i, {
        unresolvedClues: i === 2 ? ['clue-a'] : i === 6 ? ['a', 'b', 'c', 'd', 'e'] : [],
      }));
      const res = await runO732(recs732c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_OPEN_THREAD_PEAK_UNCAUSED'), 'ORIGINALITY_OPEN_THREAD_PEAK_UNCAUSED should fire');
    });

    // ORIGINALITY_OPEN_THREAD_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('ORIGINALITY_OPEN_THREAD_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs732cn = Array.from({ length: 8 }, (_, i) => makeRec732(i, {
        unresolvedClues: i === 2 ? ['clue-a'] : i === 6 ? ['a', 'b', 'c', 'd', 'e'] : [],
        dramaticTurn: i === 5 ? 'reversal' : 'nothing',
      }));
      const res = await runO732(recs732cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_OPEN_THREAD_PEAK_UNCAUSED'), 'ORIGINALITY_OPEN_THREAD_PEAK_UNCAUSED should not fire');
    });
  });

  describe('Wave 718 — originalityPass: originality seed peak uncaused, originality staging drought run, originality relationship zone cluster', async () => {
    // Same truncation pitfall as Waves 592/606/620/634/648/662/676/690/704 above — every fixture
    // cycles purpose/emotion/dialogue/slug/sentence per scene to avoid tripping unrelated 'major'
    // rules that would crowd these 'minor' checks out.
    const PURPOSE_POOL_718 = ['establish_world', 'introduce_conflict', 'complicate', 'raise_stakes', 'revelation', 'turning_point', 'climax', 'resolution', 'character_moment'];
    const EMOTION_POOL_718 = ['positive', 'negative', 'neutral'];
    const SENTENCE_POOL_718 = [
      'Alice studies the map by lamplight.', 'Bob paces the length of the corridor.',
      'Rain streaks the tall window.', 'A phone buzzes on the counter.',
      'Footsteps echo down the stairwell.', 'The kettle whistles on the stove.',
      'A drawer sticks halfway open.', 'Wind rattles the loose shutter.',
      'Dust settles on the piano keys.', 'A cat leaps onto the windowsill.',
      'The lamp flickers once and steadies.', 'Someone taps twice on the door.',
    ];
    const slugFor718 = (idx: number) => `${idx % 2 === 0 ? 'INT.' : 'EXT.'} LOCATION ${idx} - ${idx % 3 === 0 ? 'DAY' : idx % 3 === 1 ? 'NIGHT' : 'DUSK'}`;
    const makeRec718 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: slugFor718(idx),
      emotionalShift: EMOTION_POOL_718[idx % EMOTION_POOL_718.length],
      suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [],
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: PURPOSE_POOL_718[idx % PURPOSE_POOL_718.length],
      dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildFountain718 = (count: number): string =>
      Array.from({ length: count }, (_, i) => `${slugFor718(i)}\n\n${SENTENCE_POOL_718[i % SENTENCE_POOL_718.length]}`).join('\n\n');
    const runO718 = async (records: any[], fountain?: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const f = fountain ?? buildFountain718(records.length);
      return originalityPass({
        fountain: f, original: f, records,
        structure: { escalating: false, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ORIGINALITY_SEED_PEAK_UNCAUSED fire:
    // 8 scenes; seeds at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('ORIGINALITY_SEED_PEAK_UNCAUSED fires when the peak seed scene has no dramatic turn or revelation nearby', async () => {
      const recs718a = Array.from({ length: 8 }, (_, i) => makeRec718(i, {
        seededClueIds: i === 2 ? ['clue-a'] : i === 6 ? ['a', 'b', 'c', 'd', 'e'] : [],
      }));
      const res = await runO718(recs718a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_SEED_PEAK_UNCAUSED'), 'ORIGINALITY_SEED_PEAK_UNCAUSED should fire');
    });

    // ORIGINALITY_SEED_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('ORIGINALITY_SEED_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs718an = Array.from({ length: 8 }, (_, i) => makeRec718(i, {
        seededClueIds: i === 2 ? ['clue-a'] : i === 6 ? ['a', 'b', 'c', 'd', 'e'] : [],
        dramaticTurn: i === 5 ? 'reversal' : 'nothing',
      }));
      const res = await runO718(recs718an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_SEED_PEAK_UNCAUSED'), 'ORIGINALITY_SEED_PEAK_UNCAUSED should not fire');
    });

    // ORIGINALITY_STAGING_DROUGHT_RUN fire:
    // 10 scenes; visual beats at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('ORIGINALITY_STAGING_DROUGHT_RUN fires when the longest no-visual-beat run is ≥6', async () => {
      const recs718b = Array.from({ length: 10 }, (_, i) => makeRec718(i, {
        visualBeats: (i === 0 || i === 1 || i === 2 || i === 9) ? ['a beat'] : [],
      }));
      const res = await runO718(recs718b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_STAGING_DROUGHT_RUN'), 'ORIGINALITY_STAGING_DROUGHT_RUN should fire');
    });

    // ORIGINALITY_STAGING_DROUGHT_RUN no-fire:
    // visual beats at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('ORIGINALITY_STAGING_DROUGHT_RUN does not fire when visual beats are distributed without a long drought', async () => {
      const recs718bn = Array.from({ length: 10 }, (_, i) => makeRec718(i, {
        visualBeats: (i === 0 || i === 4 || i === 9) ? ['a beat'] : [],
      }));
      const res = await runO718(recs718bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_STAGING_DROUGHT_RUN'), 'ORIGINALITY_STAGING_DROUGHT_RUN should not fire');
    });

    // ORIGINALITY_RELATIONSHIP_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; relationship-shift scenes at 0,1,2 → 100% opening third
    it('ORIGINALITY_RELATIONSHIP_ZONE_CLUSTER fires when >75% of relationship-shift scenes cluster in one third', async () => {
      const recs718c = Array.from({ length: 9 }, (_, i) => makeRec718(i, {
        relationshipShifts: (i === 0 || i === 1 || i === 2) ? [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] : [],
      }));
      const res = await runO718(recs718c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_RELATIONSHIP_ZONE_CLUSTER'), 'ORIGINALITY_RELATIONSHIP_ZONE_CLUSTER should fire');
    });

    // ORIGINALITY_RELATIONSHIP_ZONE_CLUSTER no-fire:
    // relationship-shift scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('ORIGINALITY_RELATIONSHIP_ZONE_CLUSTER does not fire when relationship-shift scenes are distributed across thirds', async () => {
      const recs718cn = Array.from({ length: 9 }, (_, i) => makeRec718(i, {
        relationshipShifts: (i === 0 || i === 4 || i === 7) ? [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] : [],
      }));
      const res = await runO718(recs718cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_RELATIONSHIP_ZONE_CLUSTER'), 'ORIGINALITY_RELATIONSHIP_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 704 — originalityPass: originality highlight drought run, originality seed zone cluster, originality staging peak uncaused', async () => {
    // Same truncation pitfall as Waves 592/606/620/634/648/662/676/690 above — every fixture
    // cycles purpose/emotion/dialogue/slug/sentence per scene to avoid tripping unrelated 'major'
    // rules that would crowd these 'minor' checks out.
    const PURPOSE_POOL_704 = ['establish_world', 'introduce_conflict', 'complicate', 'raise_stakes', 'revelation', 'turning_point', 'climax', 'resolution', 'character_moment'];
    const EMOTION_POOL_704 = ['positive', 'negative', 'neutral'];
    const SENTENCE_POOL_704 = [
      'Alice studies the map by lamplight.', 'Bob paces the length of the corridor.',
      'Rain streaks the tall window.', 'A phone buzzes on the counter.',
      'Footsteps echo down the stairwell.', 'The kettle whistles on the stove.',
      'A drawer sticks halfway open.', 'Wind rattles the loose shutter.',
      'Dust settles on the piano keys.', 'A cat leaps onto the windowsill.',
      'The lamp flickers once and steadies.', 'Someone taps twice on the door.',
    ];
    const slugFor704 = (idx: number) => `${idx % 2 === 0 ? 'INT.' : 'EXT.'} LOCATION ${idx} - ${idx % 3 === 0 ? 'DAY' : idx % 3 === 1 ? 'NIGHT' : 'DUSK'}`;
    const makeRec704 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: slugFor704(idx),
      emotionalShift: EMOTION_POOL_704[idx % EMOTION_POOL_704.length],
      suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [],
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: PURPOSE_POOL_704[idx % PURPOSE_POOL_704.length],
      dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildFountain704 = (count: number): string =>
      Array.from({ length: count }, (_, i) => `${slugFor704(i)}\n\n${SENTENCE_POOL_704[i % SENTENCE_POOL_704.length]}`).join('\n\n');
    const runO704 = async (records: any[], fountain?: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const f = fountain ?? buildFountain704(records.length);
      return originalityPass({
        fountain: f, original: f, records,
        structure: { escalating: false, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ORIGINALITY_HIGHLIGHT_DROUGHT_RUN fire:
    // 10 scenes; highlights at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('ORIGINALITY_HIGHLIGHT_DROUGHT_RUN fires when the longest no-highlighted-dialogue run is ≥6', async () => {
      const recs704a = Array.from({ length: 10 }, (_, i) => makeRec704(i, {
        dialogueHighlights: (i === 0 || i === 1 || i === 2 || i === 9) ? ['line-a'] : [],
      }));
      const res = await runO704(recs704a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_HIGHLIGHT_DROUGHT_RUN'), 'ORIGINALITY_HIGHLIGHT_DROUGHT_RUN should fire');
    });

    // ORIGINALITY_HIGHLIGHT_DROUGHT_RUN no-fire:
    // highlights at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('ORIGINALITY_HIGHLIGHT_DROUGHT_RUN does not fire when highlighted dialogue is distributed without a long drought', async () => {
      const recs704an = Array.from({ length: 10 }, (_, i) => makeRec704(i, {
        dialogueHighlights: (i === 0 || i === 4 || i === 9) ? ['line-a'] : [],
      }));
      const res = await runO704(recs704an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_HIGHLIGHT_DROUGHT_RUN'), 'ORIGINALITY_HIGHLIGHT_DROUGHT_RUN should not fire');
    });

    // ORIGINALITY_SEED_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; seed scenes at 0,1,2 → 100% opening third
    it('ORIGINALITY_SEED_ZONE_CLUSTER fires when >75% of seed scenes cluster in one third', async () => {
      const recs704b = Array.from({ length: 9 }, (_, i) => makeRec704(i, {
        seededClueIds: (i === 0 || i === 1 || i === 2) ? ['clue-a'] : [],
      }));
      const res = await runO704(recs704b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_SEED_ZONE_CLUSTER'), 'ORIGINALITY_SEED_ZONE_CLUSTER should fire');
    });

    // ORIGINALITY_SEED_ZONE_CLUSTER no-fire:
    // seed scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('ORIGINALITY_SEED_ZONE_CLUSTER does not fire when seed scenes are distributed across thirds', async () => {
      const recs704bn = Array.from({ length: 9 }, (_, i) => makeRec704(i, {
        seededClueIds: (i === 0 || i === 4 || i === 7) ? ['clue-a'] : [],
      }));
      const res = await runO704(recs704bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_SEED_ZONE_CLUSTER'), 'ORIGINALITY_SEED_ZONE_CLUSTER should not fire');
    });

    // ORIGINALITY_STAGING_PEAK_UNCAUSED fire:
    // 8 scenes; visual beats at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('ORIGINALITY_STAGING_PEAK_UNCAUSED fires when the peak physical-staging scene has no dramatic turn or revelation nearby', async () => {
      const recs704c = Array.from({ length: 8 }, (_, i) => makeRec704(i, {
        visualBeats: i === 2 ? ['a beat'] : i === 6 ? ['a', 'b', 'c', 'd', 'e'] : [],
      }));
      const res = await runO704(recs704c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_STAGING_PEAK_UNCAUSED'), 'ORIGINALITY_STAGING_PEAK_UNCAUSED should fire');
    });

    // ORIGINALITY_STAGING_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('ORIGINALITY_STAGING_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs704cn = Array.from({ length: 8 }, (_, i) => makeRec704(i, {
        visualBeats: i === 2 ? ['a beat'] : i === 6 ? ['a', 'b', 'c', 'd', 'e'] : [],
        dramaticTurn: i === 5 ? 'reversal' : 'nothing',
      }));
      const res = await runO704(recs704cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_STAGING_PEAK_UNCAUSED'), 'ORIGINALITY_STAGING_PEAK_UNCAUSED should not fire');
    });
  });

  describe('Wave 690 — originalityPass: originality payoff drought run, originality clock drought run, originality highlight zone cluster', async () => {
    // Same truncation pitfall as Waves 592/606/620/634/648/662/676 above — every fixture cycles
    // purpose/emotion/dialogue/slug/sentence per scene to avoid tripping unrelated 'major'
    // rules that would crowd these 'minor' checks out.
    const PURPOSE_POOL_690 = ['establish_world', 'introduce_conflict', 'complicate', 'raise_stakes', 'revelation', 'turning_point', 'climax', 'resolution', 'character_moment'];
    const EMOTION_POOL_690 = ['positive', 'negative', 'neutral'];
    const SENTENCE_POOL_690 = [
      'Alice studies the map by lamplight.', 'Bob paces the length of the corridor.',
      'Rain streaks the tall window.', 'A phone buzzes on the counter.',
      'Footsteps echo down the stairwell.', 'The kettle whistles on the stove.',
      'A drawer sticks halfway open.', 'Wind rattles the loose shutter.',
      'Dust settles on the piano keys.', 'A cat leaps onto the windowsill.',
      'The lamp flickers once and steadies.', 'Someone taps twice on the door.',
    ];
    const slugFor690 = (idx: number) => `${idx % 2 === 0 ? 'INT.' : 'EXT.'} LOCATION ${idx} - ${idx % 3 === 0 ? 'DAY' : idx % 3 === 1 ? 'NIGHT' : 'DUSK'}`;
    const makeRec690 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: slugFor690(idx),
      emotionalShift: EMOTION_POOL_690[idx % EMOTION_POOL_690.length],
      suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [],
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: PURPOSE_POOL_690[idx % PURPOSE_POOL_690.length],
      dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildFountain690 = (count: number): string =>
      Array.from({ length: count }, (_, i) => `${slugFor690(i)}\n\n${SENTENCE_POOL_690[i % SENTENCE_POOL_690.length]}`).join('\n\n');
    const runO690 = async (records: any[], fountain?: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const f = fountain ?? buildFountain690(records.length);
      return originalityPass({
        fountain: f, original: f, records,
        structure: { escalating: false, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ORIGINALITY_PAYOFF_DROUGHT_RUN fire:
    // 10 scenes; payoffs at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('ORIGINALITY_PAYOFF_DROUGHT_RUN fires when the longest no-payoff run is ≥6', async () => {
      const recs690a = Array.from({ length: 10 }, (_, i) => makeRec690(i, {
        payoffSetupIds: (i === 0 || i === 1 || i === 2 || i === 9) ? ['thread-a'] : [],
      }));
      const res = await runO690(recs690a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_PAYOFF_DROUGHT_RUN'), 'ORIGINALITY_PAYOFF_DROUGHT_RUN should fire');
    });

    // ORIGINALITY_PAYOFF_DROUGHT_RUN no-fire:
    // payoffs at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('ORIGINALITY_PAYOFF_DROUGHT_RUN does not fire when payoffs are distributed without a long drought', async () => {
      const recs690an = Array.from({ length: 10 }, (_, i) => makeRec690(i, {
        payoffSetupIds: (i === 0 || i === 4 || i === 9) ? ['thread-a'] : [],
      }));
      const res = await runO690(recs690an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_PAYOFF_DROUGHT_RUN'), 'ORIGINALITY_PAYOFF_DROUGHT_RUN should not fire');
    });

    // ORIGINALITY_CLOCK_DROUGHT_RUN fire:
    // 10 scenes; clock raised at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('ORIGINALITY_CLOCK_DROUGHT_RUN fires when the longest no-clock run is ≥6', async () => {
      const recs690b = Array.from({ length: 10 }, (_, i) => makeRec690(i, {
        clockRaised: (i === 0 || i === 1 || i === 2 || i === 9),
      }));
      const res = await runO690(recs690b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_CLOCK_DROUGHT_RUN'), 'ORIGINALITY_CLOCK_DROUGHT_RUN should fire');
    });

    // ORIGINALITY_CLOCK_DROUGHT_RUN no-fire:
    // clock raised at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('ORIGINALITY_CLOCK_DROUGHT_RUN does not fire when clock raises are distributed without a long drought', async () => {
      const recs690bn = Array.from({ length: 10 }, (_, i) => makeRec690(i, {
        clockRaised: (i === 0 || i === 4 || i === 9),
      }));
      const res = await runO690(recs690bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_CLOCK_DROUGHT_RUN'), 'ORIGINALITY_CLOCK_DROUGHT_RUN should not fire');
    });

    // ORIGINALITY_HIGHLIGHT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; highlighted-dialogue scenes at 0,1,2 → 100% opening third
    it('ORIGINALITY_HIGHLIGHT_ZONE_CLUSTER fires when >75% of highlighted-dialogue scenes cluster in one third', async () => {
      const recs690c = Array.from({ length: 9 }, (_, i) => makeRec690(i, {
        dialogueHighlights: (i === 0 || i === 1 || i === 2) ? ['line-a'] : [],
      }));
      const res = await runO690(recs690c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_HIGHLIGHT_ZONE_CLUSTER'), 'ORIGINALITY_HIGHLIGHT_ZONE_CLUSTER should fire');
    });

    // ORIGINALITY_HIGHLIGHT_ZONE_CLUSTER no-fire:
    // highlighted-dialogue scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('ORIGINALITY_HIGHLIGHT_ZONE_CLUSTER does not fire when highlighted-dialogue scenes are distributed across thirds', async () => {
      const recs690cn = Array.from({ length: 9 }, (_, i) => makeRec690(i, {
        dialogueHighlights: (i === 0 || i === 4 || i === 7) ? ['line-a'] : [],
      }));
      const res = await runO690(recs690cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_HIGHLIGHT_ZONE_CLUSTER'), 'ORIGINALITY_HIGHLIGHT_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 676 — originalityPass: originality open thread drought run, originality staging zone cluster, originality payoff peak uncaused', async () => {
    // Same truncation pitfall as Waves 592/606/620/634/648/662 above — every fixture cycles
    // purpose/emotion/dialogue/slug/sentence per scene to avoid tripping unrelated 'major'
    // rules that would crowd these 'minor' checks out.
    const PURPOSE_POOL_676 = ['establish_world', 'introduce_conflict', 'complicate', 'raise_stakes', 'revelation', 'turning_point', 'climax', 'resolution', 'character_moment'];
    const EMOTION_POOL_676 = ['positive', 'negative', 'neutral'];
    const SENTENCE_POOL_676 = [
      'Alice studies the map by lamplight.', 'Bob paces the length of the corridor.',
      'Rain streaks the tall window.', 'A phone buzzes on the counter.',
      'Footsteps echo down the stairwell.', 'The kettle whistles on the stove.',
      'A drawer sticks halfway open.', 'Wind rattles the loose shutter.',
      'Dust settles on the piano keys.', 'A cat leaps onto the windowsill.',
      'The lamp flickers once and steadies.', 'Someone taps twice on the door.',
    ];
    const slugFor676 = (idx: number) => `${idx % 2 === 0 ? 'INT.' : 'EXT.'} LOCATION ${idx} - ${idx % 3 === 0 ? 'DAY' : idx % 3 === 1 ? 'NIGHT' : 'DUSK'}`;
    const makeRec676 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: slugFor676(idx),
      emotionalShift: EMOTION_POOL_676[idx % EMOTION_POOL_676.length],
      suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [],
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: PURPOSE_POOL_676[idx % PURPOSE_POOL_676.length],
      dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildFountain676 = (count: number): string =>
      Array.from({ length: count }, (_, i) => `${slugFor676(i)}\n\n${SENTENCE_POOL_676[i % SENTENCE_POOL_676.length]}`).join('\n\n');
    const runO676 = async (records: any[], fountain?: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const f = fountain ?? buildFountain676(records.length);
      return originalityPass({
        fountain: f, original: f, records,
        structure: { escalating: false, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ORIGINALITY_OPEN_THREAD_DROUGHT_RUN fire:
    // 10 scenes; debt at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('ORIGINALITY_OPEN_THREAD_DROUGHT_RUN fires when the longest no-debt run is ≥6', async () => {
      const recs676a = Array.from({ length: 10 }, (_, i) => makeRec676(i, {
        unresolvedClues: (i === 0 || i === 1 || i === 2 || i === 9) ? ['a'] : [],
      }));
      const res = await runO676(recs676a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_OPEN_THREAD_DROUGHT_RUN'), 'ORIGINALITY_OPEN_THREAD_DROUGHT_RUN should fire');
    });

    // ORIGINALITY_OPEN_THREAD_DROUGHT_RUN no-fire:
    // debt at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('ORIGINALITY_OPEN_THREAD_DROUGHT_RUN does not fire when debt is distributed without a long drought', async () => {
      const recs676an = Array.from({ length: 10 }, (_, i) => makeRec676(i, {
        unresolvedClues: (i === 0 || i === 4 || i === 9) ? ['a'] : [],
      }));
      const res = await runO676(recs676an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_OPEN_THREAD_DROUGHT_RUN'), 'ORIGINALITY_OPEN_THREAD_DROUGHT_RUN should not fire');
    });

    // ORIGINALITY_STAGING_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; visually dense scenes (visualBeats≥2) at 0,1,2 → 100% opening
    // third
    it('ORIGINALITY_STAGING_ZONE_CLUSTER fires when >75% of visually dense scenes cluster in one third', async () => {
      const recs676b = Array.from({ length: 9 }, (_, i) => makeRec676(i, {
        visualBeats: (i === 0 || i === 1 || i === 2) ? ['a', 'b'] : [],
      }));
      const res = await runO676(recs676b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_STAGING_ZONE_CLUSTER'), 'ORIGINALITY_STAGING_ZONE_CLUSTER should fire');
    });

    // ORIGINALITY_STAGING_ZONE_CLUSTER no-fire:
    // visually dense scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('ORIGINALITY_STAGING_ZONE_CLUSTER does not fire when visually dense scenes are distributed across thirds', async () => {
      const recs676bn = Array.from({ length: 9 }, (_, i) => makeRec676(i, {
        visualBeats: (i === 0 || i === 4 || i === 7) ? ['a', 'b'] : [],
      }));
      const res = await runO676(recs676bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_STAGING_ZONE_CLUSTER'), 'ORIGINALITY_STAGING_ZONE_CLUSTER should not fire');
    });

    // ORIGINALITY_PAYOFF_PEAK_UNCAUSED fire:
    // 8 scenes; payoffs at 2 (1 thread) and 6 (5 threads, the peak); no dramaticTurn or revelation
    // at 6, 5, or 4
    it('ORIGINALITY_PAYOFF_PEAK_UNCAUSED fires when the peak payoff scene has no dramatic turn or revelation nearby', async () => {
      const recs676c = Array.from({ length: 8 }, (_, i) => makeRec676(i, {
        payoffSetupIds: i === 2 ? ['thread-a'] : i === 6 ? ['a', 'b', 'c', 'd', 'e'] : [],
      }));
      const res = await runO676(recs676c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_PAYOFF_PEAK_UNCAUSED'), 'ORIGINALITY_PAYOFF_PEAK_UNCAUSED should fire');
    });

    // ORIGINALITY_PAYOFF_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('ORIGINALITY_PAYOFF_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs676cn = Array.from({ length: 8 }, (_, i) => makeRec676(i, {
        payoffSetupIds: i === 2 ? ['thread-a'] : i === 6 ? ['a', 'b', 'c', 'd', 'e'] : [],
        dramaticTurn: i === 5 ? 'reversal' : 'nothing',
      }));
      const res = await runO676(recs676cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_PAYOFF_PEAK_UNCAUSED'), 'ORIGINALITY_PAYOFF_PEAK_UNCAUSED should not fire');
    });
  });

  describe('Wave 662 — originalityPass: originality highlight peak uncaused, originality seed drought run, originality payoff zone cluster', async () => {
    // Same truncation pitfall as Waves 592/606/620/634/648 above — every fixture cycles
    // purpose/emotion/dialogue/slug/sentence per scene to avoid tripping unrelated 'major'
    // rules that would crowd these 'minor' checks out.
    const PURPOSE_POOL_662 = ['establish_world', 'introduce_conflict', 'complicate', 'raise_stakes', 'revelation', 'turning_point', 'climax', 'resolution', 'character_moment'];
    const EMOTION_POOL_662 = ['positive', 'negative', 'neutral'];
    const SENTENCE_POOL_662 = [
      'Alice studies the map by lamplight.', 'Bob paces the length of the corridor.',
      'Rain streaks the tall window.', 'A phone buzzes on the counter.',
      'Footsteps echo down the stairwell.', 'The kettle whistles on the stove.',
      'A drawer sticks halfway open.', 'Wind rattles the loose shutter.',
      'Dust settles on the piano keys.', 'A cat leaps onto the windowsill.',
      'The lamp flickers once and steadies.', 'Someone taps twice on the door.',
    ];
    const slugFor662 = (idx: number) => `${idx % 2 === 0 ? 'INT.' : 'EXT.'} LOCATION ${idx} - ${idx % 3 === 0 ? 'DAY' : idx % 3 === 1 ? 'NIGHT' : 'DUSK'}`;
    const makeRec662 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: slugFor662(idx),
      emotionalShift: EMOTION_POOL_662[idx % EMOTION_POOL_662.length],
      suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [],
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: PURPOSE_POOL_662[idx % PURPOSE_POOL_662.length],
      dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildFountain662 = (count: number): string =>
      Array.from({ length: count }, (_, i) => `${slugFor662(i)}\n\n${SENTENCE_POOL_662[i % SENTENCE_POOL_662.length]}`).join('\n\n');
    const runO662 = async (records: any[], fountain?: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const f = fountain ?? buildFountain662(records.length);
      return originalityPass({
        fountain: f, original: f, records,
        structure: { escalating: false, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ORIGINALITY_HIGHLIGHT_PEAK_UNCAUSED fire:
    // 8 scenes; highlights at 2 (1 line) and 6 (5 lines, the peak); no dramaticTurn or revelation
    // at 6, 5, or 4
    it('ORIGINALITY_HIGHLIGHT_PEAK_UNCAUSED fires when the peak highlighted-dialogue scene has no dramatic turn or revelation nearby', async () => {
      const recs662a = Array.from({ length: 8 }, (_, i) => makeRec662(i, {
        dialogueHighlights: i === 2 ? ['line-a'] : i === 6 ? ['a', 'b', 'c', 'd', 'e'] : [],
      }));
      const res = await runO662(recs662a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_HIGHLIGHT_PEAK_UNCAUSED'), 'ORIGINALITY_HIGHLIGHT_PEAK_UNCAUSED should fire');
    });

    // ORIGINALITY_HIGHLIGHT_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('ORIGINALITY_HIGHLIGHT_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs662an = Array.from({ length: 8 }, (_, i) => makeRec662(i, {
        dialogueHighlights: i === 2 ? ['line-a'] : i === 6 ? ['a', 'b', 'c', 'd', 'e'] : [],
        dramaticTurn: i === 5 ? 'reversal' : 'nothing',
      }));
      const res = await runO662(recs662an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_HIGHLIGHT_PEAK_UNCAUSED'), 'ORIGINALITY_HIGHLIGHT_PEAK_UNCAUSED should not fire');
    });

    // ORIGINALITY_SEED_DROUGHT_RUN fire:
    // 10 scenes; seeded at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('ORIGINALITY_SEED_DROUGHT_RUN fires when the longest no-seed run is ≥6', async () => {
      const recs662b = Array.from({ length: 10 }, (_, i) => makeRec662(i, {
        seededClueIds: (i === 0 || i === 1 || i === 2 || i === 9) ? ['clue-x'] : [],
      }));
      const res = await runO662(recs662b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_SEED_DROUGHT_RUN'), 'ORIGINALITY_SEED_DROUGHT_RUN should fire');
    });

    // ORIGINALITY_SEED_DROUGHT_RUN no-fire:
    // seeded at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('ORIGINALITY_SEED_DROUGHT_RUN does not fire when seeding is distributed without a long drought', async () => {
      const recs662bn = Array.from({ length: 10 }, (_, i) => makeRec662(i, {
        seededClueIds: (i === 0 || i === 4 || i === 9) ? ['clue-x'] : [],
      }));
      const res = await runO662(recs662bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_SEED_DROUGHT_RUN'), 'ORIGINALITY_SEED_DROUGHT_RUN should not fire');
    });

    // ORIGINALITY_PAYOFF_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; payoff scenes at 0,1,2 → 100% opening third
    it('ORIGINALITY_PAYOFF_ZONE_CLUSTER fires when >75% of payoff scenes cluster in one third', async () => {
      const recs662c = Array.from({ length: 9 }, (_, i) => makeRec662(i, {
        payoffSetupIds: (i === 0 || i === 1 || i === 2) ? ['thread-a'] : [],
      }));
      const res = await runO662(recs662c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_PAYOFF_ZONE_CLUSTER'), 'ORIGINALITY_PAYOFF_ZONE_CLUSTER should fire');
    });

    // ORIGINALITY_PAYOFF_ZONE_CLUSTER no-fire:
    // payoff scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('ORIGINALITY_PAYOFF_ZONE_CLUSTER does not fire when payoff scenes are distributed across thirds', async () => {
      const recs662cn = Array.from({ length: 9 }, (_, i) => makeRec662(i, {
        payoffSetupIds: (i === 0 || i === 4 || i === 7) ? ['thread-a'] : [],
      }));
      const res = await runO662(recs662cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_PAYOFF_ZONE_CLUSTER'), 'ORIGINALITY_PAYOFF_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 648 — originalityPass: originality relationship peak uncaused, originality revelation drought run, originality payoff curiosity decoupled', async () => {
    // Same truncation pitfall as Waves 592/606/620/634 above — every fixture cycles
    // purpose/emotion/dialogue/slug/sentence per scene to avoid tripping unrelated 'major'
    // rules that would crowd these 'minor' checks out.
    const PURPOSE_POOL_648 = ['establish_world', 'introduce_conflict', 'complicate', 'raise_stakes', 'revelation', 'turning_point', 'climax', 'resolution', 'character_moment'];
    const EMOTION_POOL_648 = ['positive', 'negative', 'neutral'];
    const SENTENCE_POOL_648 = [
      'Alice studies the map by lamplight.', 'Bob paces the length of the corridor.',
      'Rain streaks the tall window.', 'A phone buzzes on the counter.',
      'Footsteps echo down the stairwell.', 'The kettle whistles on the stove.',
      'A drawer sticks halfway open.', 'Wind rattles the loose shutter.',
      'Dust settles on the piano keys.', 'A cat leaps onto the windowsill.',
      'The lamp flickers once and steadies.', 'Someone taps twice on the door.',
    ];
    const slugFor648 = (idx: number) => `${idx % 2 === 0 ? 'INT.' : 'EXT.'} LOCATION ${idx} - ${idx % 3 === 0 ? 'DAY' : idx % 3 === 1 ? 'NIGHT' : 'DUSK'}`;
    const makeRec648 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: slugFor648(idx),
      emotionalShift: EMOTION_POOL_648[idx % EMOTION_POOL_648.length],
      suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [],
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: PURPOSE_POOL_648[idx % PURPOSE_POOL_648.length],
      dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildFountain648 = (count: number): string =>
      Array.from({ length: count }, (_, i) => `${slugFor648(i)}\n\n${SENTENCE_POOL_648[i % SENTENCE_POOL_648.length]}`).join('\n\n');
    const runO648 = async (records: any[], fountain?: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const f = fountain ?? buildFountain648(records.length);
      return originalityPass({
        fountain: f, original: f, records,
        structure: { escalating: false, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ORIGINALITY_RELATIONSHIP_PEAK_UNCAUSED fire:
    // 8 scenes; shifts at 2 (1 shift) and 6 (5 shifts, the peak); no dramaticTurn or revelation at
    // 6, 5, or 4
    it('ORIGINALITY_RELATIONSHIP_PEAK_UNCAUSED fires when the peak relationship-shift scene has no dramatic turn or revelation nearby', async () => {
      const recs648a = Array.from({ length: 8 }, (_, i) => makeRec648(i, {
        relationshipShifts: i === 2
          ? [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }]
          : i === 6
            ? [0, 1, 2, 3, 4].map(n => ({ pairKey: `a|${n}`, dimension: 'trust', amount: 0.2 }))
            : [],
      }));
      const res = await runO648(recs648a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_RELATIONSHIP_PEAK_UNCAUSED'), 'ORIGINALITY_RELATIONSHIP_PEAK_UNCAUSED should fire');
    });

    // ORIGINALITY_RELATIONSHIP_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('ORIGINALITY_RELATIONSHIP_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs648an = Array.from({ length: 8 }, (_, i) => makeRec648(i, {
        relationshipShifts: i === 2
          ? [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }]
          : i === 6
            ? [0, 1, 2, 3, 4].map(n => ({ pairKey: `a|${n}`, dimension: 'trust', amount: 0.2 }))
            : [],
        dramaticTurn: i === 5 ? 'reversal' : 'nothing',
      }));
      const res = await runO648(recs648an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_RELATIONSHIP_PEAK_UNCAUSED'), 'ORIGINALITY_RELATIONSHIP_PEAK_UNCAUSED should not fire');
    });

    // ORIGINALITY_REVELATION_DROUGHT_RUN fire:
    // 10 scenes; revelations at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('ORIGINALITY_REVELATION_DROUGHT_RUN fires when the longest no-revelation run is ≥6', async () => {
      const recs648b = Array.from({ length: 10 }, (_, i) => makeRec648(i, {
        revelation: (i === 0 || i === 1 || i === 2 || i === 9) ? 'a hidden truth surfaces' : null,
      }));
      const res = await runO648(recs648b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_REVELATION_DROUGHT_RUN'), 'ORIGINALITY_REVELATION_DROUGHT_RUN should fire');
    });

    // ORIGINALITY_REVELATION_DROUGHT_RUN no-fire:
    // revelations at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('ORIGINALITY_REVELATION_DROUGHT_RUN does not fire when revelations are distributed without a long drought', async () => {
      const recs648bn = Array.from({ length: 10 }, (_, i) => makeRec648(i, {
        revelation: (i === 0 || i === 4 || i === 9) ? 'a hidden truth surfaces' : null,
      }));
      const res = await runO648(recs648bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_REVELATION_DROUGHT_RUN'), 'ORIGINALITY_REVELATION_DROUGHT_RUN should not fire');
    });

    // ORIGINALITY_PAYOFF_CURIOSITY_DECOUPLED fire:
    // n=6; payoffs at 0,1 (no curiosity rise); curiosity rises at 4,5 (no payoff) → zero overlap
    // → fires
    it('ORIGINALITY_PAYOFF_CURIOSITY_DECOUPLED fires when payoff scenes and rising-curiosity scenes never overlap', async () => {
      const recs648c = Array.from({ length: 6 }, (_, i) => makeRec648(i, {
        payoffSetupIds: (i === 0 || i === 1) ? ['thread-a'] : [],
        curiosityDelta: (i === 4 || i === 5) ? 1 : 0,
      }));
      const res = await runO648(recs648c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_PAYOFF_CURIOSITY_DECOUPLED'), 'ORIGINALITY_PAYOFF_CURIOSITY_DECOUPLED should fire');
    });

    // ORIGINALITY_PAYOFF_CURIOSITY_DECOUPLED no-fire:
    // scene 0 carries BOTH a payoff and a curiosity rise → overlap exists
    it('ORIGINALITY_PAYOFF_CURIOSITY_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs648cn = Array.from({ length: 6 }, (_, i) => makeRec648(i, {
        payoffSetupIds: (i === 0 || i === 1) ? ['thread-a'] : [],
        curiosityDelta: (i === 0 || i === 5) ? 1 : 0,
      }));
      const res = await runO648(recs648cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_PAYOFF_CURIOSITY_DECOUPLED'), 'ORIGINALITY_PAYOFF_CURIOSITY_DECOUPLED should not fire');
    });
  });

  describe('Wave 634 — originalityPass: originality highlight staging decoupled, originality open thread highlight aftermath void, originality seed zone imbalance', async () => {
    // Same truncation pitfall as Waves 592/606/620 above — every fixture cycles
    // purpose/emotion/dialogue/slug/sentence per scene to avoid tripping unrelated 'major'
    // rules that would crowd these 'minor' checks out.
    const PURPOSE_POOL_634 = ['establish_world', 'introduce_conflict', 'complicate', 'raise_stakes', 'revelation', 'turning_point', 'climax', 'resolution', 'character_moment'];
    const EMOTION_POOL_634 = ['positive', 'negative', 'neutral'];
    const SENTENCE_POOL_634 = [
      'Alice studies the map by lamplight.', 'Bob paces the length of the corridor.',
      'Rain streaks the tall window.', 'A phone buzzes on the counter.',
      'Footsteps echo down the stairwell.', 'The kettle whistles on the stove.',
      'A drawer sticks halfway open.', 'Wind rattles the loose shutter.',
      'Dust settles on the piano keys.', 'A cat leaps onto the windowsill.',
      'The lamp flickers once and steadies.', 'Someone taps twice on the door.',
    ];
    const slugFor634 = (idx: number) => `${idx % 2 === 0 ? 'INT.' : 'EXT.'} LOCATION ${idx} - ${idx % 3 === 0 ? 'DAY' : idx % 3 === 1 ? 'NIGHT' : 'DUSK'}`;
    const makeRec634 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: slugFor634(idx),
      emotionalShift: EMOTION_POOL_634[idx % EMOTION_POOL_634.length],
      suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [],
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: PURPOSE_POOL_634[idx % PURPOSE_POOL_634.length],
      dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildFountain634 = (count: number): string =>
      Array.from({ length: count }, (_, i) => `${slugFor634(i)}\n\n${SENTENCE_POOL_634[i % SENTENCE_POOL_634.length]}`).join('\n\n');
    const runO634 = async (records: any[], fountain?: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const f = fountain ?? buildFountain634(records.length);
      return originalityPass({
        fountain: f, original: f, records,
        structure: { escalating: false, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // ORIGINALITY_HIGHLIGHT_STAGING_DECOUPLED fire:
    // n=6; highlights at 0,1 (no staging); staged at 4,5 (no highlight) → zero overlap → fires
    it('ORIGINALITY_HIGHLIGHT_STAGING_DECOUPLED fires when dialogue highlights and visually-staged scenes never overlap', async () => {
      const recs634a = Array.from({ length: 6 }, (_, i) => makeRec634(i, {
        dialogueHighlights: (i === 0 || i === 1) ? ['alice: believes X'] : [],
        visualBeats: (i === 4 || i === 5) ? ['opens the drawer', 'reads the note'] : [],
      }));
      const res = await runO634(recs634a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_HIGHLIGHT_STAGING_DECOUPLED'), 'ORIGINALITY_HIGHLIGHT_STAGING_DECOUPLED should fire');
    });

    // ORIGINALITY_HIGHLIGHT_STAGING_DECOUPLED no-fire:
    // scene 0 carries BOTH a highlight and visual staging → overlap exists
    it('ORIGINALITY_HIGHLIGHT_STAGING_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs634an = Array.from({ length: 6 }, (_, i) => makeRec634(i, {
        dialogueHighlights: (i === 0 || i === 1) ? ['alice: believes X'] : [],
        visualBeats: (i === 0 || i === 5) ? ['opens the drawer', 'reads the note'] : [],
      }));
      const res = await runO634(recs634an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_HIGHLIGHT_STAGING_DECOUPLED'), 'ORIGINALITY_HIGHLIGHT_STAGING_DECOUPLED should not fire');
    });

    // ORIGINALITY_OPEN_THREAD_HIGHLIGHT_AFTERMATH_VOID fire:
    // n=8, window=2; heavy clue-debt triggers at 0,1; their windows {1,2} and {2,3} carry no
    // dialogue highlight; highlights exist elsewhere at 5,6,7 → fires
    it('ORIGINALITY_OPEN_THREAD_HIGHLIGHT_AFTERMATH_VOID fires when heavy clue-debt scenes are never followed by a dialogue highlight', async () => {
      const recs634b = Array.from({ length: 8 }, (_, i) => makeRec634(i, {
        unresolvedClues: (i === 0 || i === 1) ? ['c1', 'c2', 'c3'] : [],
        dialogueHighlights: (i === 5 || i === 6 || i === 7) ? ['alice: believes X'] : [],
      }));
      const res = await runO634(recs634b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_OPEN_THREAD_HIGHLIGHT_AFTERMATH_VOID'), 'ORIGINALITY_OPEN_THREAD_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    // ORIGINALITY_OPEN_THREAD_HIGHLIGHT_AFTERMATH_VOID no-fire:
    // scene 3 (inside trigger 1's window {2,3}) now carries a highlight → that trigger's
    // aftermath is no longer void
    it('ORIGINALITY_OPEN_THREAD_HIGHLIGHT_AFTERMATH_VOID does not fire when a trigger window contains a dialogue highlight', async () => {
      const recs634bn = Array.from({ length: 8 }, (_, i) => makeRec634(i, {
        unresolvedClues: (i === 0 || i === 1) ? ['c1', 'c2', 'c3'] : [],
        dialogueHighlights: (i === 3 || i === 5 || i === 6 || i === 7) ? ['alice: believes X'] : [],
      }));
      const res = await runO634(recs634bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_OPEN_THREAD_HIGHLIGHT_AFTERMATH_VOID'), 'ORIGINALITY_OPEN_THREAD_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });

    // ORIGINALITY_SEED_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); seeds at 6,7,8,9; zone 2 (6-8)=3, zone 3 (9)=1, total=4;
    // zones 0,1 empty; bloatZoneIdx=zone2, 3/4=75% ≥ 50% → fires
    it('ORIGINALITY_SEED_ZONE_IMBALANCE fires when one zone is empty of seeds while another is bloated', async () => {
      const recs634c = Array.from({ length: 12 }, (_, i) => makeRec634(i, {
        seededClueIds: (i === 6 || i === 7 || i === 8 || i === 9) ? ['clue'] : [],
      }));
      const res = await runO634(recs634c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ORIGINALITY_SEED_ZONE_IMBALANCE'), 'ORIGINALITY_SEED_ZONE_IMBALANCE should fire');
    });

    // ORIGINALITY_SEED_ZONE_IMBALANCE no-fire:
    // one seed per zone (1,4,7,10) → no zone is empty
    it('ORIGINALITY_SEED_ZONE_IMBALANCE does not fire when seeds are spread across all zones', async () => {
      const recs634cn = Array.from({ length: 12 }, (_, i) => makeRec634(i, {
        seededClueIds: (i === 1 || i === 4 || i === 7 || i === 10) ? ['clue'] : [],
      }));
      const res = await runO634(recs634cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ORIGINALITY_SEED_ZONE_IMBALANCE'), 'ORIGINALITY_SEED_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 620 — originalityPass: payoff placement zone imbalance, seed turn decoupled, clock delta flatline', async () => {
    // Same truncation pitfall as Wave 606 above (originalityPass caps issues to the top 8 by
    // severity) — every fixture cycles purpose/emotion/dialogue/slug/sentence per scene to avoid
    // tripping unrelated 'major' rules that would crowd these 'minor' checks out.
    const PURPOSE_POOL_620 = ['establish_world', 'introduce_conflict', 'complicate', 'raise_stakes', 'revelation', 'turning_point', 'climax', 'resolution', 'character_moment'];
    const EMOTION_POOL_620 = ['positive', 'negative', 'neutral'];
    const SENTENCE_POOL_620 = [
      'Alice studies the map by lamplight.', 'Bob paces the length of the corridor.',
      'Rain streaks the tall window.', 'A phone buzzes on the counter.',
      'Footsteps echo down the stairwell.', 'The kettle whistles on the stove.',
      'A drawer sticks halfway open.', 'Wind rattles the loose shutter.',
      'Dust settles on the piano keys.', 'A cat leaps onto the windowsill.',
      'The lamp flickers once and steadies.', 'Someone taps twice on the door.',
    ];
    const slugFor620 = (idx: number) => `${idx % 2 === 0 ? 'INT.' : 'EXT.'} LOCATION ${idx} - ${idx % 3 === 0 ? 'DAY' : idx % 3 === 1 ? 'NIGHT' : 'DUSK'}`;
    const makeRec620 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: slugFor620(idx),
      emotionalShift: EMOTION_POOL_620[idx % EMOTION_POOL_620.length],
      suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: idx % 2 === 0 ? [`alice: believes point ${idx}`] : [],
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: PURPOSE_POOL_620[idx % PURPOSE_POOL_620.length],
      dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildFountain620 = (count: number): string =>
      Array.from({ length: count }, (_, i) => `${slugFor620(i)}\n\n${SENTENCE_POOL_620[i % SENTENCE_POOL_620.length]}`).join('\n\n');
    const runO620 = async (records: any[], fountain?: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const f = fountain ?? buildFountain620(records.length);
      return originalityPass({
        fountain: f, original: f, records,
        structure: { escalating: false, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // PAYOFF_PLACEMENT_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); payoffs at 6,7,8,9; zone 2 (6-8)=3, zone 3 (9)=1, total=4;
    // zones 0,1 empty; bloatZoneIdx=zone2, 3/4=75% ≥ 50% → fires
    it('PAYOFF_PLACEMENT_ZONE_IMBALANCE fires when one zone is empty of payoffs while another is bloated', async () => {
      const recs620a = Array.from({ length: 12 }, (_, i) => makeRec620(i, {
        payoffSetupIds: (i === 6 || i === 7 || i === 8 || i === 9) ? ['thread'] : [],
      }));
      const res = await runO620(recs620a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_PLACEMENT_ZONE_IMBALANCE'), 'PAYOFF_PLACEMENT_ZONE_IMBALANCE should fire');
    });

    // PAYOFF_PLACEMENT_ZONE_IMBALANCE no-fire:
    // one payoff per zone (1,4,7,10) → no zone is empty
    it('PAYOFF_PLACEMENT_ZONE_IMBALANCE does not fire when payoffs are spread across all zones', async () => {
      const recs620an = Array.from({ length: 12 }, (_, i) => makeRec620(i, {
        payoffSetupIds: (i === 1 || i === 4 || i === 7 || i === 10) ? ['thread'] : [],
      }));
      const res = await runO620(recs620an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_PLACEMENT_ZONE_IMBALANCE'), 'PAYOFF_PLACEMENT_ZONE_IMBALANCE should not fire');
    });

    // SEED_TURN_DECOUPLED fire:
    // n=6; seeds at 0,1 (no turn); turns at 4,5 (no seed) → zero overlap → fires
    it('SEED_TURN_DECOUPLED fires when seed scenes and dramatic-turn scenes never overlap', async () => {
      const recs620b = Array.from({ length: 6 }, (_, i) => makeRec620(i,
        i === 0 || i === 1 ? { seededClueIds: ['clue-a'] }
        : i === 4 || i === 5 ? { dramaticTurn: 'reversal' }
        : {}
      ));
      const res = await runO620(recs620b);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_TURN_DECOUPLED'), 'SEED_TURN_DECOUPLED should fire');
    });

    // SEED_TURN_DECOUPLED no-fire:
    // scene 0 carries BOTH a seed and a dramatic turn → overlap exists
    it('SEED_TURN_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs620bn = Array.from({ length: 6 }, (_, i) => makeRec620(i,
        i === 0 ? { seededClueIds: ['clue-a'], dramaticTurn: 'reversal' }
        : i === 1 ? { seededClueIds: ['clue-b'] }
        : i === 5 ? { dramaticTurn: 'revelation' }
        : {}
      ));
      const res = await runO620(recs620bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_TURN_DECOUPLED'), 'SEED_TURN_DECOUPLED should not fire');
    });

    // CLOCK_DELTA_FLATLINE fire:
    // 8 scenes, every clockDelta identical (1.0) — zero deviation from the average
    it('CLOCK_DELTA_FLATLINE fires when clockDelta barely varies across scenes', async () => {
      const recs620c = Array.from({ length: 8 }, (_, i) => makeRec620(i, { clockDelta: 1.0 }));
      const res = await runO620(recs620c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_DELTA_FLATLINE'), 'CLOCK_DELTA_FLATLINE should fire');
    });

    // CLOCK_DELTA_FLATLINE no-fire:
    // alternating 0.2/2.5 — wide deviation from the average
    it('CLOCK_DELTA_FLATLINE does not fire when clockDelta varies widely across scenes', async () => {
      const recs620cn = Array.from({ length: 8 }, (_, i) => makeRec620(i, { clockDelta: i % 2 === 0 ? 0.2 : 2.5 }));
      const res = await runO620(recs620cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_DELTA_FLATLINE'), 'CLOCK_DELTA_FLATLINE should not fire');
    });
  });

  describe('Wave 606 — originalityPass: clock raised zone cluster, open thread curiosity decoupled, scene staging zone imbalance', async () => {
    // originalityPass caps its returned issues to the top 8 by severity (critical, then major,
    // then minor) — see the truncation block at the end of the pass. All three Wave 606 checks
    // are 'minor', so every fixture below cycles purpose/emotion/dialogue/slug/sentence per scene
    // (rather than holding them constant) to avoid also tripping UNIFORM_SCENE_PURPOSES,
    // PURPOSE_CONSECUTIVE_RUN, EMOTIONAL_ARC_PLATEAU, or SCENE_SHAPE_TEMPLATING, any one of which
    // would crowd the target 'minor' rule out of the truncated result even though it fired
    // internally (the exact pitfall documented in the Wave 592 block above).
    const PURPOSE_POOL_606 = ['establish_world', 'introduce_conflict', 'complicate', 'raise_stakes', 'revelation', 'turning_point', 'climax', 'resolution', 'character_moment'];
    const EMOTION_POOL_606 = ['positive', 'negative', 'neutral'];
    const SENTENCE_POOL_606 = [
      'Alice studies the map by lamplight.', 'Bob paces the length of the corridor.',
      'Rain streaks the tall window.', 'A phone buzzes on the counter.',
      'Footsteps echo down the stairwell.', 'The kettle whistles on the stove.',
      'A drawer sticks halfway open.', 'Wind rattles the loose shutter.',
      'Dust settles on the piano keys.', 'A cat leaps onto the windowsill.',
      'The lamp flickers once and steadies.', 'Someone taps twice on the door.',
    ];
    const slugFor606 = (idx: number) => `${idx % 2 === 0 ? 'INT.' : 'EXT.'} LOCATION ${idx} - ${idx % 3 === 0 ? 'DAY' : idx % 3 === 1 ? 'NIGHT' : 'DUSK'}`;
    const makeRec606 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: slugFor606(idx),
      emotionalShift: EMOTION_POOL_606[idx % EMOTION_POOL_606.length],
      suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: idx % 2 === 0 ? [`alice: believes point ${idx}`] : [],
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: PURPOSE_POOL_606[idx % PURPOSE_POOL_606.length],
      dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildFountain606 = (count: number): string =>
      Array.from({ length: count }, (_, i) => `${slugFor606(i)}\n\n${SENTENCE_POOL_606[i % SENTENCE_POOL_606.length]}`).join('\n\n');
    const runO606 = async (records: any[], fountain?: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const f = fountain ?? buildFountain606(records.length);
      return originalityPass({
        fountain: f, original: f, records,
        structure: { escalating: false, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // CLOCK_RAISED_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; clockRaised at 0,1,2 → 100% in opening third
    it('CLOCK_RAISED_ZONE_CLUSTER fires when >75% of clockRaised scenes cluster in one third', async () => {
      const recs606a = Array.from({ length: 9 }, (_, i) => makeRec606(i, { clockRaised: i === 0 || i === 1 || i === 2 }));
      const res = await runO606(recs606a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_RAISED_ZONE_CLUSTER'), 'CLOCK_RAISED_ZONE_CLUSTER should fire');
    });

    // CLOCK_RAISED_ZONE_CLUSTER no-fire:
    // clockRaised at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('CLOCK_RAISED_ZONE_CLUSTER does not fire when clockRaised scenes are distributed across thirds', async () => {
      const recs606an = Array.from({ length: 9 }, (_, i) => makeRec606(i, { clockRaised: i === 0 || i === 4 || i === 7 }));
      const res = await runO606(recs606an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_RAISED_ZONE_CLUSTER'), 'CLOCK_RAISED_ZONE_CLUSTER should not fire');
    });

    // OPEN_THREAD_CURIOSITY_DECOUPLED fire:
    // n=8; open threads at 0,1 (no curiosity spike); curiosity spikes at 2,3 (no open thread) → zero overlap
    it('OPEN_THREAD_CURIOSITY_DECOUPLED fires when open-thread scenes and curiosity-spike scenes never overlap', async () => {
      const recs606b = Array.from({ length: 8 }, (_, i) => makeRec606(i,
        i === 0 || i === 1 ? { unresolvedClues: ['unpaid-clue'] }
        : i === 2 || i === 3 ? { curiosityDelta: 1 }
        : {}
      ));
      const res = await runO606(recs606b);
      assert.ok(res.issues.some((i: any) => i.rule === 'OPEN_THREAD_CURIOSITY_DECOUPLED'), 'OPEN_THREAD_CURIOSITY_DECOUPLED should fire');
    });

    // OPEN_THREAD_CURIOSITY_DECOUPLED no-fire:
    // scene 2 carries BOTH an open thread and a curiosity spike → overlap exists
    it('OPEN_THREAD_CURIOSITY_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs606bn = Array.from({ length: 8 }, (_, i) => makeRec606(i,
        i === 0 || i === 1 ? { unresolvedClues: ['unpaid-clue'] }
        : i === 2 ? { unresolvedClues: ['unpaid-clue'], curiosityDelta: 1 }
        : i === 3 ? { curiosityDelta: 1 }
        : {}
      ));
      const res = await runO606(recs606bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'OPEN_THREAD_CURIOSITY_DECOUPLED'), 'OPEN_THREAD_CURIOSITY_DECOUPLED should not fire');
    });

    // SCENE_STAGING_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); visually dense scenes (visualBeats≥2) at 6,9,10,11;
    // zones 0 (0-2) and 1 (3-5) are empty; zone 3 (9-11) holds 3/4 = 75% ≥ 50% → fires
    it('SCENE_STAGING_ZONE_IMBALANCE fires when one zone is empty of visually dense scenes while another is bloated', async () => {
      const recs606c = Array.from({ length: 12 }, (_, i) => makeRec606(i, {
        visualBeats: (i === 6 || i === 9 || i === 10 || i === 11) ? ['pockets the key', 'checks the hallway'] : [],
      }));
      const res = await runO606(recs606c);
      assert.ok(res.issues.some((i: any) => i.rule === 'SCENE_STAGING_ZONE_IMBALANCE'), 'SCENE_STAGING_ZONE_IMBALANCE should fire');
    });

    // SCENE_STAGING_ZONE_IMBALANCE no-fire:
    // one visually dense scene per zone (1,4,7,10) → no zone is empty
    it('SCENE_STAGING_ZONE_IMBALANCE does not fire when every zone has a visually dense scene', async () => {
      const recs606cn = Array.from({ length: 12 }, (_, i) => makeRec606(i, {
        visualBeats: (i === 1 || i === 4 || i === 7 || i === 10) ? ['pockets the key', 'checks the hallway'] : [],
      }));
      const res = await runO606(recs606cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SCENE_STAGING_ZONE_IMBALANCE'), 'SCENE_STAGING_ZONE_IMBALANCE should not fire');
    });
  });


  describe('Wave 592 — originalityPass: dramatic turn zone cluster, purpose consecutive run, scene closer ellipsis flood', async () => {
    const makeRec592 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runO592 = async (records: any[], fountain?: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const f = fountain ?? Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n');
      return originalityPass({
        fountain: f, original: f, records,
        structure: { escalating: false, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    it('DRAMATIC_TURN_ZONE_CLUSTER fires when >75% of dramatic-turn scenes cluster in one third', async () => {
      // 9 scenes; thirds=[0-2],[3-5],[6-8]; turns at 0,1,2 → 100% in opening third.
      // Purpose/emotion/slug/dialogue deliberately varied per scene so this fixture doesn't
      // also trip UNIFORM_SCENE_PURPOSES, SCENE_PURPOSE_MONOTONE_ACT3, EMOTIONAL_ARC_PLATEAU,
      // or SCENE_SHAPE_TEMPLATING — originalityPass caps its returned issues to the top 8 by
      // severity (all 'major' before any 'minor'), and those four are 'major', so a bland
      // uniform fixture crowds this 'minor' rule out of the truncated result even though it
      // legitimately fired internally.
      const purposes592a = ['establish_world', 'development', 'conflict', 'development', 'confrontation', 'development', 'climax', 'resolution', 'aftermath'];
      const emotions592a = ['neutral', 'positive', 'negative', 'positive', 'neutral', 'negative', 'positive', 'negative', 'neutral'];
      const recs592a = Array.from({ length: 9 }, (_, i) => makeRec592(i, {
        purpose: purposes592a[i], emotionalShift: emotions592a[i],
        dialogueHighlights: i % 2 === 0 ? [`alice: believes point ${i}`] : [],
      }));
      recs592a[0] = makeRec592(0, { purpose: purposes592a[0], emotionalShift: emotions592a[0], dramaticTurn: 'reversal' });
      recs592a[1] = makeRec592(1, { purpose: purposes592a[1], emotionalShift: emotions592a[1], dramaticTurn: 'reversal' });
      recs592a[2] = makeRec592(2, { purpose: purposes592a[2], emotionalShift: emotions592a[2], dramaticTurn: 'reversal' });
      const sentences592a = [
        'Alice studies the map by lamplight.', 'Bob paces the length of the corridor.',
        'Rain streaks the tall window.', 'A phone buzzes on the counter.',
        'Footsteps echo down the stairwell.', 'The kettle whistles on the stove.',
        'A drawer sticks halfway open.', 'Wind rattles the loose shutter.',
        'Dust settles on the piano keys.',
      ];
      const fountain592a = recs592a.map((_, i) =>
        `${i % 2 === 0 ? 'INT.' : 'EXT.'} LOCATION ${i} - ${i % 3 === 0 ? 'DAY' : i % 3 === 1 ? 'NIGHT' : 'DUSK'}\n\n${sentences592a[i]}`,
      ).join('\n\n');
      const res = await runO592(recs592a, fountain592a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DRAMATIC_TURN_ZONE_CLUSTER'), 'DRAMATIC_TURN_ZONE_CLUSTER should fire');
    });

    it('DRAMATIC_TURN_ZONE_CLUSTER does not fire when dramatic turns are distributed across thirds', async () => {
      // turns at 0, 4, 7 (one per third) → maxZone/total = 1/3
      const recs592a = Array.from({ length: 9 }, (_, i) => makeRec592(i));
      recs592a[0] = makeRec592(0, { dramaticTurn: 'reversal' });
      recs592a[4] = makeRec592(4, { dramaticTurn: 'revelation' });
      recs592a[7] = makeRec592(7, { dramaticTurn: 'reversal' });
      const res = await runO592(recs592a);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DRAMATIC_TURN_ZONE_CLUSTER'), 'DRAMATIC_TURN_ZONE_CLUSTER should not fire');
    });

    it('PURPOSE_CONSECUTIVE_RUN fires when ≥4 consecutive scenes share the same purpose', async () => {
      // 6 scenes; purposes: development,development,development,development,climax,confrontation
      const recs592b = [
        makeRec592(0, { purpose: 'development' }),
        makeRec592(1, { purpose: 'development' }),
        makeRec592(2, { purpose: 'development' }),
        makeRec592(3, { purpose: 'development' }),
        makeRec592(4, { purpose: 'climax' }),
        makeRec592(5, { purpose: 'confrontation' }),
      ];
      const res = await runO592(recs592b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PURPOSE_CONSECUTIVE_RUN'), 'PURPOSE_CONSECUTIVE_RUN should fire');
    });

    it('PURPOSE_CONSECUTIVE_RUN does not fire when no run of same purpose reaches 4 scenes', async () => {
      // alternating purposes — longest run is 2
      const recs592b = [
        makeRec592(0, { purpose: 'development' }),
        makeRec592(1, { purpose: 'development' }),
        makeRec592(2, { purpose: 'confrontation' }),
        makeRec592(3, { purpose: 'confrontation' }),
        makeRec592(4, { purpose: 'climax' }),
        makeRec592(5, { purpose: 'climax' }),
      ];
      const res = await runO592(recs592b);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PURPOSE_CONSECUTIVE_RUN'), 'PURPOSE_CONSECUTIVE_RUN should not fire');
    });

    it('SCENE_CLOSER_ELLIPSIS_FLOOD fires when ≥50% of scenes end their final line in an ellipsis', async () => {
      // 6 scenes; 4 end in "...", 2 do not
      const fountain592c = `INT. ONE - DAY

Alice enters the room slowly...

INT. TWO - DAY

Bob waits by the window...

INT. THREE - DAY

She finally speaks the truth.

INT. FOUR - DAY

The clock ticks toward midnight...

INT. FIVE - DAY

He slams the door shut.

INT. SIX - DAY

Nothing more needs to be said...`;
      const res = await runO592([], fountain592c);
      assert.ok(res.issues.some((i: any) => i.rule === 'SCENE_CLOSER_ELLIPSIS_FLOOD'), 'SCENE_CLOSER_ELLIPSIS_FLOOD should fire');
    });

    it('SCENE_CLOSER_ELLIPSIS_FLOOD does not fire when most scenes end without an ellipsis', async () => {
      // 6 scenes; only 1 ends in "..."
      const fountain592cnr = `INT. ONE - DAY

Alice enters the room and sits down.

INT. TWO - DAY

Bob waits by the window and watches.

INT. THREE - DAY

She finally speaks the truth.

INT. FOUR - DAY

The clock ticks toward midnight...

INT. FIVE - DAY

He slams the door shut.

INT. SIX - DAY

Nothing more needs to be said.`;
      const res = await runO592([], fountain592cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SCENE_CLOSER_ELLIPSIS_FLOOD'), 'SCENE_CLOSER_ELLIPSIS_FLOOD should not fire');
    });
  });

  describe('Wave 578 — originalityPass: slug same-location run, action present-continuous flood, dialogue backstory opener flood', async () => {
    const runO578 = async (fountain: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      return originalityPass({
        fountain, original: fountain, records: [],
        structure: { escalating: false, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    it('SLUG_SAME_LOCATION_RUN fires when ≥5 consecutive sluglines share the same base location', async () => {
      const fountain578a = `INT. LIVING ROOM - DAY

Action here.

INT. LIVING ROOM - NIGHT

Action here.

EXT. LIVING ROOM - DAY

Action here.

INT. LIVING ROOM - MORNING

Action here.

INT. LIVING ROOM - EVENING

Action here.

EXT. GARDEN - DAY

Action here.

INT. KITCHEN - DAY

Action here.

INT. BEDROOM - NIGHT

Action here.`;
      const res = await runO578(fountain578a);
      assert.ok(res.issues.some((i: any) => i.rule === 'SLUG_SAME_LOCATION_RUN'), 'SLUG_SAME_LOCATION_RUN should fire');
    });

    it('SLUG_SAME_LOCATION_RUN does not fire when no location runs ≥5 consecutive scenes', async () => {
      const fountain578anr = `INT. LIVING ROOM - DAY

Action here.

INT. KITCHEN - NIGHT

Action here.

INT. BEDROOM - DAY

Action here.

INT. OFFICE - MORNING

Action here.

INT. LIVING ROOM - NIGHT

Action here.

EXT. GARDEN - DAY

Action here.

INT. LIVING ROOM - DAY

Action here.

INT. KITCHEN - NIGHT

Action here.`;
      const res = await runO578(fountain578anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SLUG_SAME_LOCATION_RUN'), 'SLUG_SAME_LOCATION_RUN should not fire');
    });

    it('ACTION_PRESENT_CONTINUOUS_FLOOD fires when >25% of action lines use progressive aspect', async () => {
      const fountain578b = `INT. TEST - DAY

John is running across the field.
Mary is watching from above.
He is carrying the stolen goods.
She is hiding in the corner.
John stops.
He turns.
She moves.
He grabs the case.
She opens the door.
He runs.`;
      const res = await runO578(fountain578b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_PRESENT_CONTINUOUS_FLOOD'), 'ACTION_PRESENT_CONTINUOUS_FLOOD should fire');
    });

    it('ACTION_PRESENT_CONTINUOUS_FLOOD does not fire when ≤25% of action lines use progressive aspect', async () => {
      const fountain578bnr = `INT. TEST - DAY

John runs across the field.
Mary watches from above.
He is carrying the map.
She is hiding.
John stops.
He turns.
She moves.
He grabs the case.
She opens the door.
He runs.`;
      const res = await runO578(fountain578bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_PRESENT_CONTINUOUS_FLOOD'), 'ACTION_PRESENT_CONTINUOUS_FLOOD should not fire');
    });

    it('DIALOGUE_BACKSTORY_OPENER_FLOOD fires when >20% of dialogue lines open with a past-temporal anchor', async () => {
      const fountain578c = `INT. TEST - DAY

ALICE
Years ago, I made a terrible mistake.

BOB
Back then, we had nothing to lose.

ALICE
When I was young, we all believed that.

BOB
What do you mean exactly?

ALICE
You know what I mean.

BOB
No I really don't.

ALICE
Stop playing games.

BOB
I am not playing games.

ALICE
Fine. Forget it.

BOB
As you wish.`;
      const res = await runO578(fountain578c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_BACKSTORY_OPENER_FLOOD'), 'DIALOGUE_BACKSTORY_OPENER_FLOOD should fire');
    });

    it('DIALOGUE_BACKSTORY_OPENER_FLOOD does not fire when ≤20% of dialogue lines open with a past-temporal anchor', async () => {
      const fountain578cnr = `INT. TEST - DAY

ALICE
We need to talk about this now.

BOB
What do you want from me?

ALICE
Years ago, I trusted you completely.

BOB
And I proved you right.

ALICE
Not anymore.

BOB
What changed?

ALICE
You changed.

BOB
That is not fair.

ALICE
Nothing about this is fair.

BOB
Fine. Walk away then.`;
      const res = await runO578(fountain578cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_BACKSTORY_OPENER_FLOOD'), 'DIALOGUE_BACKSTORY_OPENER_FLOOD should not fire');
    });
  });


  describe('Wave 564 — originalityPass: slug INT/EXT monotone, dialogue em-dash interruption flood, action polysyndeton flood', async () => {
    const runO564 = async (fountain: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      return originalityPass({
        fountain, original: fountain, records: [],
        structure: { escalating: false, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    // SLUG_INT_EXT_MONOTONE fire: 8 slugs all INT., 0 EXT, 0 mixed → 8/8=100% > 90% → fires
    it('SLUG_INT_EXT_MONOTONE fires when >90% of classifiable slugs share one register', async () => {
      const f564a = `INT. ROOM - DAY\n\nShe enters.\n\nINT. OFFICE - NIGHT\n\nHe waits.\n\nINT. CAR - DAY\n\nThey drive.\n\nINT. KITCHEN - NIGHT\n\nShe cooks.\n\nINT. HALLWAY - DAY\n\nHe walks.\n\nINT. BEDROOM - NIGHT\n\nShe rests.\n\nINT. BASEMENT - DAY\n\nHe searches.\n\nINT. ATTIC - NIGHT\n\nShe finds it.\n\n`;
      const res = await runO564(f564a);
      assert.ok(res.issues.some((i: any) => i.rule === 'SLUG_INT_EXT_MONOTONE'), 'SLUG_INT_EXT_MONOTONE should fire');
    });

    // SLUG_INT_EXT_MONOTONE no-fire: 4 INT + 4 EXT → dominant 4/8=50% ≤ 90% → no fire
    it('SLUG_INT_EXT_MONOTONE does not fire when interior and exterior are balanced', async () => {
      const f564an = `INT. ROOM - DAY\n\nShe enters.\n\nEXT. STREET - NIGHT\n\nHe waits.\n\nINT. CAR - DAY\n\nThey drive.\n\nEXT. PARK - NIGHT\n\nShe walks.\n\nINT. HALLWAY - DAY\n\nHe walks.\n\nEXT. ROOFTOP - NIGHT\n\nShe rests.\n\nINT. BASEMENT - DAY\n\nHe searches.\n\nEXT. FIELD - NIGHT\n\nShe finds it.\n\n`;
      const res = await runO564(f564an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SLUG_INT_EXT_MONOTONE'), 'SLUG_INT_EXT_MONOTONE should not fire');
    });

    // DIALOGUE_EM_DASH_INTERRUPTION_FLOOD fire: 8 dialogue lines, 4 end with "—" (50% > 30%) → fires
    it('DIALOGUE_EM_DASH_INTERRUPTION_FLOOD fires when >30% of dialogue lines end with an interruption dash', async () => {
      const f564b = `INT. ROOM - DAY\n\nALICE\nWait, I didn't—\n\nBOB\nYou always say that—\n\nALICE\nBut you never listen to me at all.\n\nBOB\nThat's not—\n\nALICE\nI just need a moment to think.\n\nBOB\nWe don't have—\n\nALICE\nFine. Let's go now.\n\nBOB\nOkay then.\n\n`;
      const res = await runO564(f564b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_EM_DASH_INTERRUPTION_FLOOD'), 'DIALOGUE_EM_DASH_INTERRUPTION_FLOOD should fire');
    });

    // DIALOGUE_EM_DASH_INTERRUPTION_FLOOD no-fire: 8 dialogue lines, 2 end with "—" (25% ≤ 30%) → no fire
    it('DIALOGUE_EM_DASH_INTERRUPTION_FLOOD does not fire when interruption dashes are at or below 30%', async () => {
      const f564bn = `INT. ROOM - DAY\n\nALICE\nWait, I didn't—\n\nBOB\nYou always say that—\n\nALICE\nBut you never listen to me at all.\n\nBOB\nThat is not true.\n\nALICE\nI just need a moment to think.\n\nBOB\nWe do not have time.\n\nALICE\nFine. Let's go now.\n\nBOB\nOkay then.\n\n`;
      const res = await runO564(f564bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_EM_DASH_INTERRUPTION_FLOOD'), 'DIALOGUE_EM_DASH_INTERRUPTION_FLOOD should not fire');
    });

    // ACTION_POLYSYNDETON_FLOOD fire: 8 action lines, 3 contain ≥2 "and" (37.5% > 20%) → fires
    it('ACTION_POLYSYNDETON_FLOOD fires when >20% of action lines chain 3+ clauses with "and"', async () => {
      const f564c = `INT. ROOM - DAY\n\nHe grabs the bag and bolts for the door and runs.\n\nShe opens the window.\n\nHe climbs out and drops to the ground and sprints.\n\nThe car waits.\n\nShe turns the key and guns the engine and speeds off.\n\nA figure watches.\n\nThe road stretches ahead.\n\nRain falls.\n\n`;
      const res = await runO564(f564c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_POLYSYNDETON_FLOOD'), 'ACTION_POLYSYNDETON_FLOOD should fire');
    });

    // ACTION_POLYSYNDETON_FLOOD no-fire: 8 action lines, 1 contains ≥2 "and" (12.5% ≤ 20%) → no fire
    it('ACTION_POLYSYNDETON_FLOOD does not fire when "and"-chained lines are at or below 20%', async () => {
      const f564cn = `INT. ROOM - DAY\n\nHe grabs the bag and bolts for the door and runs.\n\nShe opens the window.\n\nHe climbs out.\n\nThe car waits.\n\nShe turns the key.\n\nA figure watches.\n\nThe road stretches ahead.\n\nRain falls.\n\n`;
      const res = await runO564(f564cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_POLYSYNDETON_FLOOD'), 'ACTION_POLYSYNDETON_FLOOD should not fire');
    });
  });


  describe('Wave 550 — originalityPass: parenthetical flood, dialogue long speech flood, action adverb flood', async () => {
    const runO550 = async (fountain: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      return originalityPass({
        fountain, original: fountain, records: [],
        structure: { escalating: false, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    it('PARENTHETICAL_FLOOD fires when >35% of speeches have an immediate parenthetical', async () => {
      // 8 speeches; 4 immediately followed by a parenthetical (50% > 35%)
      const f550a = `INT. ROOM - DAY\n\nALICE\n(quietly)\nI need to tell you something.\n\nBOB\nWhat is it?\n\nALICE\n(nervous)\nI saw what happened last night.\n\nBOB\nYou did?\n\nALICE\n(firmly)\nYes, I saw everything.\n\nBOB\nThen you know.\n\nALICE\n(whispering)\nI know. And I've kept quiet.\n\nBOB\nThank you for that.\n\n`;
      const res = await runO550(f550a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PARENTHETICAL_FLOOD'), 'PARENTHETICAL_FLOOD should fire');
    });

    it('PARENTHETICAL_FLOOD does not fire when parentheticals are below 35%', async () => {
      // 8 speeches; only 2 have an immediate parenthetical (25% ≤ 35%)
      const f550an = `INT. ROOM - DAY\n\nALICE\nI need to tell you something.\n\nBOB\nWhat is it?\n\nALICE\n(quietly)\nI saw what happened last night.\n\nBOB\nYou did?\n\nALICE\nYes, I saw everything.\n\nBOB\nThen you know.\n\nALICE\n(firmly)\nI do. And I've kept quiet.\n\nBOB\nThank you for that.\n\n`;
      const res = await runO550(f550an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PARENTHETICAL_FLOOD'), 'PARENTHETICAL_FLOOD should not fire');
    });

    it('DIALOGUE_LONG_SPEECH_FLOOD fires when >30% of dialogue lines have >15 words', async () => {
      // 8 dialogue lines; 3 have >15 words (37.5% > 30%)
      const f550b = `INT. ROOM - DAY\n\nALICE\nI have been thinking about this for a very long time and I believe we need to act now before it is too late for all of us.\n\nBOB\nI know.\n\nALICE\nYou have to understand that the situation has changed dramatically over the past few weeks and nothing is the same as it was.\n\nBOB\nThat's true.\n\nALICE\nThis is going to be the hardest decision I have ever made in my entire life and I need you to support me through it.\n\nBOB\nOf course.\n\nALICE\nLet's go.\n\nBOB\nYes.\n\n`;
      const res = await runO550(f550b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_LONG_SPEECH_FLOOD'), 'DIALOGUE_LONG_SPEECH_FLOOD should fire');
    });

    it('DIALOGUE_LONG_SPEECH_FLOOD does not fire when long speeches are at or below 30%', async () => {
      // 8 dialogue lines; only 2 have >15 words (25% ≤ 30%)
      const f550bn = `INT. ROOM - DAY\n\nALICE\nI need to tell you something.\n\nBOB\nWhat is it?\n\nALICE\nI saw what happened last night and I have been thinking about it ever since.\n\nBOB\nYou did.\n\nALICE\nYes.\n\nBOB\nThen you understand.\n\nALICE\nThis is something we need to consider very carefully before we decide anything at all.\n\nBOB\nFine.\n\n`;
      const res = await runO550(f550bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_LONG_SPEECH_FLOOD'), 'DIALOGUE_LONG_SPEECH_FLOOD should not fire');
    });

    it('ACTION_ADVERB_FLOOD fires when >35% of action lines contain a "-ly" adverb', async () => {
      // 8 action lines; 4 contain "-ly" adverbs (50% > 35%)
      const f550c = `INT. ROOM - DAY\n\nShe walks quickly to the window.\n\nALICE\nI see them.\n\nHe speaks quietly to himself.\n\nBOB\nWe must go.\n\nShe closes the door softly.\n\nALICE\nNow.\n\nHe turns and moves rapidly toward the exit.\n\nBOB\nLet's move.\n\nShe stands still.\n\nALICE\nWait.\n\nHe watches carefully.\n\nBOB\nReady.\n\nShe breathes.\n\nALICE\nOkay.\n\nHe nods.\n\nBOB\nGo.\n\n`;
      const res = await runO550(f550c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_ADVERB_FLOOD'), 'ACTION_ADVERB_FLOOD should fire');
    });

    it('ACTION_ADVERB_FLOOD does not fire when adverbs are at or below 35% of action lines', async () => {
      // 8 action lines; only 2 contain "-ly" adverbs (25% ≤ 35%)
      const f550cn = `INT. ROOM - DAY\n\nShe crosses to the window.\n\nALICE\nI see them.\n\nHe murmurs to himself.\n\nBOB\nWe must go.\n\nShe shuts the door.\n\nALICE\nNow.\n\nHe sprints toward the exit.\n\nBOB\nLet's move.\n\nShe pauses.\n\nALICE\nWait.\n\nHe studies the room carefully.\n\nBOB\nReady.\n\nShe exhales slowly.\n\nALICE\nOkay.\n\nHe nods.\n\nBOB\nGo.\n\n`;
      const res = await runO550(f550cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_ADVERB_FLOOD'), 'ACTION_ADVERB_FLOOD should not fire');
    });
  });


  describe('Wave 536 — originalityPass: dialogue negative imperative flood, dialogue exclamation run, dialogue short speech flood', async () => {
    const runO536 = async (fountain: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      return originalityPass({
        fountain, original: fountain, records: [],
        structure: { escalating: false, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    it('DIALOGUE_NEGATIVE_IMPERATIVE_FLOOD fires when >20% of dialogue lines open with a negative imperative', async () => {
      // 10 dialogue lines; 3 open with negative imperatives (30% > 20%)
      const f536a = `INT. ROOM - DAY\n\nALICE\nDon't go anywhere near there.\n\nBOB\nI understand your concern.\n\nALICE\nNever trust anyone in this house.\n\nBOB\nThat's a bit extreme.\n\nALICE\nYou can't leave without my permission.\n\nBOB\nThen I'll stay.\n\nALICE\nGood, sit down.\n\nBOB\nFine with me.\n\nALICE\nWe need to talk.\n\nBOB\nI'm listening.\n\n`;
      const res = await runO536(f536a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_NEGATIVE_IMPERATIVE_FLOOD'), 'DIALOGUE_NEGATIVE_IMPERATIVE_FLOOD should fire');
    });

    it('DIALOGUE_NEGATIVE_IMPERATIVE_FLOOD does not fire when negative imperatives are below threshold', async () => {
      // 10 dialogue lines; only 1 opens with a negative imperative (10% ≤ 20%)
      const f536an = `INT. ROOM - DAY\n\nALICE\nWe should leave now.\n\nBOB\nI agree with you.\n\nALICE\nDon't forget the map.\n\nBOB\nI have it right here.\n\nALICE\nGood, let's go then.\n\nBOB\nLead the way.\n\nALICE\nI'll follow your plan.\n\nBOB\nPerfect, we're ready.\n\nALICE\nOne more thing.\n\nBOB\nWhat is it?\n\n`;
      const res = await runO536(f536an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_NEGATIVE_IMPERATIVE_FLOOD'), 'DIALOGUE_NEGATIVE_IMPERATIVE_FLOOD should not fire');
    });

    it('DIALOGUE_EXCLAMATION_RUN fires when ≥4 consecutive dialogue lines end with "!"', async () => {
      // 4 consecutive dialogue lines all ending with "!"
      const f536b = `INT. ROOM - DAY\n\nALICE\nWe have to go now!\n\nBOB\nI can't believe it!\n\nALICE\nThis is incredible!\n\nBOB\nWe made it!\n\nALICE\nI'm glad that's over.\n\nBOB\nMe too.\n\n`;
      const res = await runO536(f536b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_EXCLAMATION_RUN'), 'DIALOGUE_EXCLAMATION_RUN should fire');
    });

    it('DIALOGUE_EXCLAMATION_RUN does not fire when exclamation run is < 4', async () => {
      // Only 2 consecutive exclamatory lines, then a declarative break
      const f536bn = `INT. ROOM - DAY\n\nALICE\nWe have to go now!\n\nBOB\nI can't believe it!\n\nALICE\nThis is very unexpected.\n\nBOB\nI know, right.\n\nALICE\nLet's figure this out!\n\nBOB\nYes, we should.\n\n`;
      const res = await runO536(f536bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_EXCLAMATION_RUN'), 'DIALOGUE_EXCLAMATION_RUN should not fire');
    });

    it('DIALOGUE_SHORT_SPEECH_FLOOD fires when >60% of dialogue lines have ≤3 words', async () => {
      // 10 dialogue lines; 7 have ≤3 words (70% > 60%)
      const f536c = `INT. ROOM - DAY\n\nALICE\nYes.\n\nBOB\nI know.\n\nALICE\nGet out.\n\nBOB\nFine.\n\nALICE\nLet's go.\n\nBOB\nNo way.\n\nALICE\nTrust me.\n\nBOB\nI have been waiting here for a very long time.\n\nALICE\nSorry.\n\nBOB\nOkay then.\n\n`;
      const res = await runO536(f536c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_SHORT_SPEECH_FLOOD'), 'DIALOGUE_SHORT_SPEECH_FLOOD should fire');
    });

    it('DIALOGUE_SHORT_SPEECH_FLOOD does not fire when short speeches are below 60%', async () => {
      // 10 dialogue lines; only 3 have ≤3 words (30% ≤ 60%)
      const f536cn = `INT. ROOM - DAY\n\nALICE\nI think we should reconsider the entire plan before we act.\n\nBOB\nYou might be right about that.\n\nALICE\nThe evidence suggests we need to wait.\n\nBOB\nOkay.\n\nALICE\nThere's too much at stake to rush this decision.\n\nBOB\nI understand your concern.\n\nALICE\nWe have to be absolutely sure before we move.\n\nBOB\nFine.\n\nALICE\nThank you for listening to me.\n\nBOB\nAlways.\n\n`;
      const res = await runO536(f536cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_SHORT_SPEECH_FLOOD'), 'DIALOGUE_SHORT_SPEECH_FLOOD should not fire');
    });
  });


  describe('Wave 522 — originalityPass: dialogue hedging flood, dialogue agreement run, dialogue command flood', async () => {
    const runO522 = async (fountain: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      return originalityPass({
        fountain, original: fountain, records: [],
        structure: { escalating: false, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    it('DIALOGUE_HEDGING_FLOOD fires when >25% of dialogue lines contain hedging language', async () => {
      // 10 dialogue lines; 3 with hedging words (>25%)
      const f522a = `INT. ROOM - DAY\n\nALICE\nMaybe you're right about this.\n\nBOB\nI think we should go now.\n\nALICE\nI guess that's the plan.\n\nBOB\nWe should leave.\n\nALICE\nLet's go then.\n\nBOB\nThe door is open.\n\nALICE\nI see the exit.\n\nBOB\nWe can make it.\n\nALICE\nOkay let's move.\n\nBOB\nReady to leave.\n\n`;
      const res = await runO522(f522a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_HEDGING_FLOOD'), 'DIALOGUE_HEDGING_FLOOD should fire');
    });

    it('DIALOGUE_HEDGING_FLOOD does not fire when hedging is below the threshold', async () => {
      // 10 dialogue lines; only 1 with hedging word (<= 25%)
      const f522an = `INT. ROOM - DAY\n\nALICE\nYou are wrong about this.\n\nBOB\nWe should leave now.\n\nALICE\nMaybe not.\n\nBOB\nWe can make it.\n\nALICE\nLet's go.\n\nBOB\nThe door is open.\n\nALICE\nI see the exit.\n\nBOB\nWe have to move.\n\nALICE\nRight now.\n\nBOB\nI agree.\n\n`;
      const res = await runO522(f522an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_HEDGING_FLOOD'), 'DIALOGUE_HEDGING_FLOOD should not fire');
    });

    it('DIALOGUE_AGREEMENT_RUN fires when ≥4 consecutive dialogue lines open with affirmation', async () => {
      // 4 consecutive dialogue lines each starting with an agreement word
      const f522b = `INT. ROOM - DAY\n\nALICE\nWe need to go.\n\nBOB\nYes, let's go.\n\nALICE\nRight, it's time.\n\nBOB\nOkay, I'm ready.\n\nALICE\nAbsolutely, let's move.\n\nBOB\nI disagree with that plan.\n\n`;
      const res = await runO522(f522b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_AGREEMENT_RUN'), 'DIALOGUE_AGREEMENT_RUN should fire');
    });

    it('DIALOGUE_AGREEMENT_RUN does not fire when agreement run is < 4', async () => {
      // Only 2 consecutive agreement openers, then a non-agreement line
      const f522bn = `INT. ROOM - DAY\n\nALICE\nWe should leave.\n\nBOB\nYes, agreed.\n\nALICE\nOkay then.\n\nBOB\nI'm not sure about that.\n\nALICE\nWhy not?\n\nBOB\nBecause it's risky.\n\n`;
      const res = await runO522(f522bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_AGREEMENT_RUN'), 'DIALOGUE_AGREEMENT_RUN should not fire');
    });

    it('DIALOGUE_COMMAND_FLOOD fires when >25% of dialogue lines open with a command verb', async () => {
      // 10 dialogue lines; 4 with command verb openers (>25%)
      const f522c = `INT. ROOM - DAY\n\nALICE\nGo to the door now.\n\nBOB\nStop right there.\n\nALICE\nFind the key immediately.\n\nBOB\nListen to what I'm saying.\n\nALICE\nI need to tell you something.\n\nBOB\nThat's not true.\n\nALICE\nYou have to believe me.\n\nBOB\nWhy would I?\n\nALICE\nBecause it's the truth.\n\nBOB\nI don't think so.\n\n`;
      const res = await runO522(f522c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_COMMAND_FLOOD'), 'DIALOGUE_COMMAND_FLOOD should fire');
    });

    it('DIALOGUE_COMMAND_FLOOD does not fire when commands are below the threshold', async () => {
      // 10 dialogue lines; only 1 with command verb opener
      const f522cn = `INT. ROOM - DAY\n\nALICE\nI think we should leave.\n\nBOB\nThat's not a good idea.\n\nALICE\nWhy not?\n\nBOB\nGo ahead if you want.\n\nALICE\nI'm worried about the others.\n\nBOB\nThey'll be fine.\n\nALICE\nYou don't know that.\n\nBOB\nI know more than you think.\n\nALICE\nThen tell me.\n\nBOB\nNot yet.\n\n`;
      const res = await runO522(f522cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_COMMAND_FLOOD'), 'DIALOGUE_COMMAND_FLOOD should not fire');
    });
  });


  describe('Wave 508 — originalityPass: dialogue same-speaker run, action then-opener flood, dialogue wish-statement flood', async () => {
    const runO508 = async (fountain: string, records: any[] = []) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      return originalityPass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // DIALOGUE_SAME_SPEAKER_RUN fire: 3 speakers, 12 total lines, ALICE has 5 consecutive lines → fires
    it('DIALOGUE_SAME_SPEAKER_RUN fires when one speaker dominates with 5+ consecutive speech lines', async () => {
      const fountain508a = [
        'INT. ROOM - DAY',
        '',
        'ALICE',
        'First line of dialogue.',
        'Second line of dialogue.',
        'Third line of dialogue.',
        'Fourth line of dialogue.',
        'Fifth line of dialogue.',
        '',
        'BOB',
        'Okay then.',
        '',
        'CAROL',
        'Right, sure.',
        '',
        'ALICE',
        'Something else.',
        '',
        'BOB',
        'A short reply.',
        '',
        'CAROL',
        'Final note here.',
        '',
        'ALICE',
        'And more words.',
        'Plus this too.',
      ].join('\n');
      const res = await runO508(fountain508a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_SAME_SPEAKER_RUN'), 'DIALOGUE_SAME_SPEAKER_RUN should fire');
    });

    // DIALOGUE_SAME_SPEAKER_RUN no-fire: 3 speakers, 12 total lines, max run is 4 → no fire
    it('DIALOGUE_SAME_SPEAKER_RUN does not fire when max consecutive run is 4', async () => {
      const fountain508anr = [
        'INT. ROOM - DAY',
        '',
        'ALICE',
        'First line of dialogue.',
        'Second line of dialogue.',
        'Third line of dialogue.',
        'Fourth line of dialogue.',
        '',
        'BOB',
        'Okay then.',
        '',
        'CAROL',
        'Right, sure.',
        '',
        'ALICE',
        'Something else.',
        '',
        'BOB',
        'A short reply.',
        '',
        'CAROL',
        'Final note here.',
        '',
        'ALICE',
        'And more words.',
        'Plus this too.',
        'And one final thought.',
      ].join('\n');
      const res = await runO508(fountain508anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_SAME_SPEAKER_RUN'), 'DIALOGUE_SAME_SPEAKER_RUN should not fire');
    });

    // ACTION_THEN_OPENER_FLOOD fire: 8 action lines, 3 start with "Then " → 37.5% > 25% → fires
    it('ACTION_THEN_OPENER_FLOOD fires when over 25% of action lines begin with "Then"', async () => {
      const fountain508b = [
        'INT. ROOM - DAY',
        '',
        'She walks in slowly.',
        'She looks around the room.',
        'Then she notices the open window.',
        'She crosses toward it.',
        'Then she opens the drawer beside it.',
        'She reaches inside carefully.',
        'Then she finds the key.',
        'She pockets it quickly.',
      ].join('\n');
      const res = await runO508(fountain508b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_THEN_OPENER_FLOOD'), 'ACTION_THEN_OPENER_FLOOD should fire');
    });

    // ACTION_THEN_OPENER_FLOOD no-fire: 8 action lines, 1 starts with "Then " → 12.5% ≤ 25% → no fire
    it('ACTION_THEN_OPENER_FLOOD does not fire when only 1 of 8 action lines begins with "Then"', async () => {
      const fountain508bnr = [
        'INT. ROOM - DAY',
        '',
        'She walks in slowly.',
        'She looks around the room.',
        'Then she notices the open window.',
        'She crosses toward it.',
        'She opens the drawer beside it.',
        'She reaches inside carefully.',
        'She finds the key.',
        'She pockets it quickly.',
      ].join('\n');
      const res = await runO508(fountain508bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_THEN_OPENER_FLOOD'), 'ACTION_THEN_OPENER_FLOOD should not fire');
    });

    // DIALOGUE_WISH_STATEMENT_FLOOD fire: 10 dialogue lines, 3 contain wish language → 30% > 20% → fires
    it('DIALOGUE_WISH_STATEMENT_FLOOD fires when over 20% of dialogue lines contain counterfactual language', async () => {
      const fountain508c = [
        'INT. ROOM - DAY',
        '',
        'ALICE',
        'I should have known better.',
        'But here we are now.',
        'It is what it is.',
        '',
        'BOB',
        'I could have done more.',
        'We all make mistakes.',
        'Life goes on.',
        '',
        'CAROL',
        'I wish things were different.',
        'But they are not.',
        'Forward is the only way.',
        '',
        'ALICE',
        'That is all we can do.',
      ].join('\n');
      const res = await runO508(fountain508c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_WISH_STATEMENT_FLOOD'), 'DIALOGUE_WISH_STATEMENT_FLOOD should fire');
    });

    // DIALOGUE_WISH_STATEMENT_FLOOD no-fire: 10 dialogue lines, 1 contains wish language → 10% ≤ 20% → no fire
    it('DIALOGUE_WISH_STATEMENT_FLOOD does not fire when only 1 of 10 dialogue lines contains wish language', async () => {
      const fountain508cnr = [
        'INT. ROOM - DAY',
        '',
        'ALICE',
        'I should have known better.',
        'But here we are now.',
        'It is what it is.',
        '',
        'BOB',
        'We move forward regardless.',
        'Life continues on.',
        'We keep going.',
        '',
        'CAROL',
        'That is the way things go.',
        'There is nothing else to say.',
        '',
        'ALICE',
        'Yes exactly right.',
        'We can do this.',
      ].join('\n');
      const res = await runO508(fountain508cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_WISH_STATEMENT_FLOOD'), 'DIALOGUE_WISH_STATEMENT_FLOOD should not fire');
    });
  });


  describe('Wave 494 — originalityPass: dialogue question run, dialogue short run, dialogue speaker solo', async () => {
    const runO494 = async (fountain: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      return originalityPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // DIALOGUE_QUESTION_RUN fire: 7 speeches, 4 consecutive end with "?" (speeches 1-4)
    it('DIALOGUE_QUESTION_RUN fires when 4 or more consecutive speeches end with "?"', async () => {
      const f494a = `INT. ROOM - DAY

ANNA
Are you sure?

MARK
Did you check?

ANNA
When did it happen?

MARK
Why didn't you tell me?

ANNA
I don't know.

MARK
Fine.

ANNA
Let's move on.
`;
      const res = await runO494(f494a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_QUESTION_RUN'), 'DIALOGUE_QUESTION_RUN should fire');
    });

    // DIALOGUE_QUESTION_RUN no-fire: question speeches separated by a statement
    it('DIALOGUE_QUESTION_RUN does not fire when question speeches are separated by statements', async () => {
      const f494anr = `INT. ROOM - DAY

ANNA
Are you sure?

MARK
Yes.

ANNA
When did it happen?

MARK
Yesterday.

ANNA
Where were you?

MARK
Here.
`;
      const res = await runO494(f494anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_QUESTION_RUN'), 'DIALOGUE_QUESTION_RUN should not fire');
    });

    // DIALOGUE_SHORT_RUN fire: 8 speeches, 5 consecutive each ≤3 words (speeches 2-6)
    it('DIALOGUE_SHORT_RUN fires when 5 or more consecutive speeches are ≤3 words', async () => {
      const f494b = `INT. ROOM - DAY

ANNA
I need to tell you something important about what happened last night.

MARK
Yes?

ANNA
Really?

MARK
No way.

ANNA
Go on.

MARK
Are you sure?

ANNA
Absolutely certain.

MARK
Tell me everything about this situation please.
`;
      const res = await runO494(f494b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_SHORT_RUN'), 'DIALOGUE_SHORT_RUN should fire');
    });

    // DIALOGUE_SHORT_RUN no-fire: short speeches interleaved with longer ones
    it('DIALOGUE_SHORT_RUN does not fire when short speeches are separated by longer ones', async () => {
      const f494bnr = `INT. ROOM - DAY

ANNA
Yes.

MARK
I think we need to talk about what happened yesterday.

ANNA
No.

MARK
That's not fair and you know it.

ANNA
Fine.

MARK
We should sit down and discuss this properly.

ANNA
Okay.

MARK
Good.

ANNA
Agreed then.

MARK
Thank you for listening.
`;
      const res = await runO494(f494bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_SHORT_RUN'), 'DIALOGUE_SHORT_RUN should not fire');
    });

    // DIALOGUE_SPEAKER_SOLO fire: ANNA has 8 of 10 lines (80%) with 3 speakers
    it('DIALOGUE_SPEAKER_SOLO fires when one speaker has more than 60% of all dialogue lines', async () => {
      const f494c = `INT. ROOM - DAY

ANNA
I was there and I saw everything.

ANNA
He came in through the back.

ANNA
Nobody noticed him at first.

ANNA
Then he spoke.

ANNA
He said something strange.

ANNA
I couldn't hear all of it.

ANNA
But I knew it was important.

ANNA
And then he left.

MARK
Really?

BOB
Wow.
`;
      const res = await runO494(f494c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_SPEAKER_SOLO'), 'DIALOGUE_SPEAKER_SOLO should fire');
    });

    // DIALOGUE_SPEAKER_SOLO no-fire: ANNA has 6/12 lines (50%) — under the 60% threshold
    it('DIALOGUE_SPEAKER_SOLO does not fire when no single speaker exceeds 60% of dialogue lines', async () => {
      const f494cnr = `INT. ROOM - DAY

ANNA
I was there.

ANNA
I saw him.

ANNA
He came in.

ANNA
Nobody noticed.

ANNA
Then he spoke.

ANNA
And left.

MARK
That sounds strange.

MARK
Why didn't you say anything?

MARK
We should have known.

BOB
I agree with Mark.

BOB
This is serious.

BOB
We need to act.
`;
      const res = await runO494(f494cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_SPEAKER_SOLO'), 'DIALOGUE_SPEAKER_SOLO should not fire');
    });
  });


  describe('Wave 480 — originalityPass: dialogue filler run, action average line brevity, action peak paragraph', async () => {
    const runO480 = async (fountain: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      return originalityPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('DIALOGUE_FILLER_RUN fires when 3 or more consecutive speeches open with filler words', async () => {
      // 6 speeches: first 3 open with filler (Well / Look / Listen) — run of 3 → fires
      const f480a = `INT. OFFICE - DAY

ANNA
Well, I think we should go.

MARK
Look, that's not the plan.

ANNA
Listen, I know what you want.

MARK
Let's just decide.

ANNA
Fine.

MARK
Agreed.
`;
      const res = await runO480(f480a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_FILLER_RUN'), 'DIALOGUE_FILLER_RUN should fire');
    });

    it('DIALOGUE_FILLER_RUN does not fire when filler speeches are not consecutive', async () => {
      // 6 speeches: fillers at speeches 1, 3, 5 — none consecutive → no fire
      const f480anr = `INT. OFFICE - DAY

ANNA
Well, I think we should go.

MARK
That's not the plan.

ANNA
Look, I know what you want.

MARK
Let's just decide.

ANNA
Actually, fine.

MARK
Agreed.
`;
      const res = await runO480(f480anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_FILLER_RUN'), 'DIALOGUE_FILLER_RUN should not fire');
    });

    it('ACTION_AVERAGE_LINE_BREVITY fires when action lines average 4 words or fewer', async () => {
      // 10 action lines all ≤4 words → avg ≤ 4 → fires
      const f480b = `INT. ROOM - DAY

She sits.

He waits.

Door opens.

Light shifts.

Clock ticks.

Rain starts.

Wind howls.

Floor creaks.

Glass breaks.

Steps stop.
`;
      const res = await runO480(f480b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_AVERAGE_LINE_BREVITY'), 'ACTION_AVERAGE_LINE_BREVITY should fire');
    });

    it('ACTION_AVERAGE_LINE_BREVITY does not fire when action lines average more than 4 words', async () => {
      // 8 action lines, each 7-10 words → avg > 4 → no fire
      const f480bnr = `INT. ROOM - DAY

She crosses slowly to the rain-streaked window.

He leans against the doorframe and watches her.

The clock on the wall reads half past midnight.

Papers fan across the desk in the cold breeze.

A coffee mug sits cooling beside the keyboard.

Light from the street cuts long shadows on the floor.

She picks up the phone and sets it back down.

He finally steps inside and closes the door behind him.
`;
      const res = await runO480(f480bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_AVERAGE_LINE_BREVITY'), 'ACTION_AVERAGE_LINE_BREVITY should not fire');
    });

    it('ACTION_PEAK_PARAGRAPH fires when one action paragraph is 5x the average length and 40+ words', async () => {
      // 4 action paragraphs: 3 short (3-4 words each) and 1 very long (50 words) → peak/avg >> 5 → fires
      const f480c = `INT. ROOM - DAY

She sits.

INT. OFFICE - DAY

He waits.

INT. HALLWAY - DAY

Door opens.

INT. ROOFTOP - NIGHT

The city sprawls below her in every direction — ten thousand lights blinking in the wet dark, traffic threading through canyons of glass and steel, a distant siren climbing and falling, the whole enormous machinery of the place grinding on without noticing that she is standing here at its edge, holding the envelope, trying to decide whether to open it or let the wind take it.
`;
      const res = await runO480(f480c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_PEAK_PARAGRAPH'), 'ACTION_PEAK_PARAGRAPH should fire');
    });

    it('ACTION_PEAK_PARAGRAPH does not fire when action paragraphs are similar in length', async () => {
      // 4 action paragraphs all similar length (10-15 words each) → no outlier → no fire
      const f480cnr = `INT. ROOM - DAY

She crosses to the window and looks out at the rain-wet street below.

INT. OFFICE - DAY

He leans back in his chair and stares at the ceiling tiles above him.

INT. HALLWAY - DAY

The door at the end swings open and a figure steps through the frame.

INT. ROOFTOP - NIGHT

Stars are barely visible through the low cloud cover hanging over the city tonight.
`;
      const res = await runO480(f480cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_PEAK_PARAGRAPH'), 'ACTION_PEAK_PARAGRAPH should not fire');
    });
  });


  describe('Wave 466 — originalityPass: action pronoun opener flood, dialogue question flood, ellipsis run action', async () => {
    const runO466 = async (fountain: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      return originalityPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ACTION_PRONOUN_OPENER_FLOOD fires when >50% of action blocks open with "He" or "She"', async () => {
      // 10 action blocks: 6 open with "He " or "She " = 60% > 50% → fires
      const f466a = `INT. ROOM - DAY

He enters the room.

INT. HALLWAY - DAY

She looks left.

INT. KITCHEN - DAY

He picks up the phone.

INT. GARAGE - DAY

She checks the lock.

INT. BEDROOM - DAY

He stares at the ceiling.

INT. BATHROOM - DAY

She opens the medicine cabinet.

INT. LIVING ROOM - DAY

The couch sits empty.

INT. OFFICE - DAY

Papers cover every surface.

INT. ATTIC - DAY

Boxes line the walls.

INT. BASEMENT - DAY

The light flickers.
`;
      const res = await runO466(f466a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_PRONOUN_OPENER_FLOOD'), 'ACTION_PRONOUN_OPENER_FLOOD should fire');
    });

    it('ACTION_PRONOUN_OPENER_FLOOD does not fire when action blocks use varied openers', async () => {
      // 10 action blocks: only 2 open with "He" or "She" = 20% ≤ 50% → no fire
      const f466anr = `INT. ROOM - DAY

The door swings open.

INT. HALLWAY - DAY

Shadows stretch across the floor.

INT. KITCHEN - DAY

She picks up the knife.

INT. GARAGE - DAY

An old car sits rusting.

INT. BEDROOM - DAY

Moonlight cuts through the blinds.

INT. BATHROOM - DAY

Steam fills the mirror.

INT. LIVING ROOM - DAY

He walks to the window.

INT. OFFICE - DAY

A single lamp burns.

INT. ATTIC - DAY

Dust motes drift in silence.

INT. BASEMENT - DAY

Water drips from a pipe.
`;
      const res = await runO466(f466anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_PRONOUN_OPENER_FLOOD'), 'ACTION_PRONOUN_OPENER_FLOOD should not fire');
    });

    it('DIALOGUE_QUESTION_FLOOD fires when >35% of dialogue lines end with "?"', async () => {
      // 12 dialogue lines, 5 end with "?" = 41.7% > 35% → fires
      const f466b = `INT. OFFICE - DAY

ANNA
What are you doing here?

MARK
I came to talk.

ANNA
About what exactly?

MARK
You know what about.

ANNA
Do I?

MARK
Stop playing games.

ANNA
What games?

MARK
The ones you always play.

ANNA
I'm not playing anything.

MARK
Really?

ANNA
Yes, really.

MARK
Fine.
`;
      const res = await runO466(f466b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_QUESTION_FLOOD'), 'DIALOGUE_QUESTION_FLOOD should fire');
    });

    it('DIALOGUE_QUESTION_FLOOD does not fire when question lines are a small minority', async () => {
      // 12 dialogue lines, 2 end with "?" = 16.7% ≤ 35% → no fire
      const f466bnr = `INT. OFFICE - DAY

ANNA
I came here to say goodbye.

MARK
You don't mean that.

ANNA
I do. It's over.

MARK
What happened?

MARK
I thought we had a plan.

ANNA
Plans change. I changed.

MARK
Since when?

ANNA
Since I stopped waiting.

MARK
This is not fair.

ANNA
Life isn't fair, Mark.

MARK
Don't do this.

ANNA
I already have.
`;
      const res = await runO466(f466bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_QUESTION_FLOOD'), 'DIALOGUE_QUESTION_FLOOD should not fire');
    });

    it('ELLIPSIS_RUN_ACTION fires when 3 consecutive action lines end with "..."', async () => {
      // 3 consecutive action lines ending with "..." → fires
      const f466c = `INT. ROOM - DAY

The light dims...

Something moves in the corner...

A shadow crosses the wall...

She backs toward the door.
`;
      const res = await runO466(f466c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ELLIPSIS_RUN_ACTION'), 'ELLIPSIS_RUN_ACTION should fire');
    });

    it('ELLIPSIS_RUN_ACTION does not fire when ellipsis lines are not consecutive', async () => {
      // Ellipsis lines broken up by non-ellipsis lines — no run of 3 → no fire
      const f466cnr = `INT. ROOM - DAY

The light dims...

She steps forward.

Something moves in the corner...

He stands his ground.

A faint sound...

They look at each other.
`;
      const res = await runO466(f466cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ELLIPSIS_RUN_ACTION'), 'ELLIPSIS_RUN_ACTION should not fire');
    });
  });


  describe('Wave 452 — originalityPass: dialogue ellipsis flood, slug time monotone, dialogue filler opener', async () => {
    const runO452 = async (fountain: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      return originalityPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('DIALOGUE_ELLIPSIS_FLOOD fires when >20% of dialogue lines end with "..."', async () => {
      // 10 dialogue lines, 3 end with "..." = 30% > 20% → fires
      const f452a = `INT. ROOM - DAY

ANNA
I don't know...

MARK
You have to decide.

ANNA
Maybe I can't...

MARK
Stop stalling.

ANNA
It's complicated...

MARK
Just answer.

ANNA
Fine.

MARK
Good.

ANNA
Whatever you say.

MARK
Deal.
`;
      const res = await runO452(f452a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_ELLIPSIS_FLOOD'), 'DIALOGUE_ELLIPSIS_FLOOD should fire');
    });

    it('DIALOGUE_ELLIPSIS_FLOOD does not fire when ellipsis use is rare in dialogue', async () => {
      // 10 dialogue lines, 1 ends with "..." = 10% ≤ 20% → no fire
      const f452anr = `INT. ROOM - DAY

ANNA
I don't know what to say.

MARK
You have to decide today.

ANNA
Maybe there is another way...

MARK
Stop stalling and answer me.

ANNA
Fine, I'll do it.

MARK
Good. Let's move on.

ANNA
Whatever you say, Mark.

MARK
We have a deal.

ANNA
I hope you're right.

MARK
Trust me.
`;
      const res = await runO452(f452anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_ELLIPSIS_FLOOD'), 'DIALOGUE_ELLIPSIS_FLOOD should not fire');
    });

    it('SLUG_TIME_MONOTONE fires when >80% of time-tagged sluglines share the same time', async () => {
      // 8 sluglines: 7 NIGHT, 1 DAY = 87.5% NIGHT > 80% → fires
      const f452b = `INT. OFFICE - NIGHT

She works late.

INT. HALLWAY - NIGHT

He watches from the shadows.

INT. STAIRWELL - NIGHT

The door creaks.

EXT. STREET - NIGHT

Rain hits the pavement.

INT. CAR - NIGHT

She grips the wheel.

INT. APARTMENT - NIGHT

He waits.

INT. KITCHEN - NIGHT

The phone rings.

EXT. PARK - DAY

Morning light filters through.
`;
      const res = await runO452(f452b);
      assert.ok(res.issues.some((i: any) => i.rule === 'SLUG_TIME_MONOTONE'), 'SLUG_TIME_MONOTONE should fire');
    });

    it('SLUG_TIME_MONOTONE does not fire when time-of-day is varied', async () => {
      // 8 sluglines: 5 NIGHT, 3 DAY = 62.5% NIGHT ≤ 80% → no fire
      const f452bnr = `INT. OFFICE - NIGHT

She works late.

INT. HALLWAY - NIGHT

He watches.

INT. STAIRWELL - DAY

Sunlight streams in.

EXT. STREET - DAY

Rush hour.

INT. CAR - NIGHT

Rain on glass.

INT. APARTMENT - NIGHT

He waits.

INT. KITCHEN - DAY

Morning coffee.

EXT. PARK - NIGHT

The city sleeps.
`;
      const res = await runO452(f452bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SLUG_TIME_MONOTONE'), 'SLUG_TIME_MONOTONE should not fire');
    });

    it('DIALOGUE_FILLER_OPENER fires when 4+ speeches begin with verbal filler openers', async () => {
      // 4 speeches start with Well/Look/Actually/Honestly → fires
      const f452c = `INT. ROOM - DAY

ANNA
Well, I think we should reconsider.

MARK
Look, there's no time for that.

ANNA
Actually, you might be wrong about this.

MARK
Honestly, I've thought about it a lot.

ANNA
Let's just go.
`;
      const res = await runO452(f452c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_FILLER_OPENER'), 'DIALOGUE_FILLER_OPENER should fire');
    });

    it('DIALOGUE_FILLER_OPENER does not fire when fewer than 4 speeches use filler openers', async () => {
      // Only 2 filler openers → no fire
      const f452cnr = `INT. ROOM - DAY

ANNA
We need to leave now.

MARK
Well, maybe you're right.

ANNA
The plan is simple.

MARK
I disagree with you entirely.

ANNA
Listen, just trust me on this.

MARK
Fine. Let's do it your way.
`;
      const res = await runO452(f452cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_FILLER_OPENER'), 'DIALOGUE_FILLER_OPENER should not fire');
    });
  });


  describe('Wave 438 — originalityPass: passive verb dominance, dialogue monologue drought, action question intrusion', async () => {
    const runO438 = async (fountain: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      return originalityPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('PASSIVE_VERB_DOMINANCE fires when >25% of action lines use passive construction', async () => {
      // 4 of 10 action lines are passive = 40% > 25%
      const f438p = `INT. ROOM - DAY

A gun is found on the table.
The letter is opened by Maria.
She walks toward the window.
Three shots can be heard outside.
The door is closed behind her.
He reaches for the phone.
She reads the note carefully.
The lights go out.
An envelope is left on the counter.
He checks the lock.
`;
      const res = await runO438(f438p);
      assert.ok(res.issues.some((i: any) => i.rule === 'PASSIVE_VERB_DOMINANCE'), 'PASSIVE_VERB_DOMINANCE should fire');
    });

    it('PASSIVE_VERB_DOMINANCE does not fire when passive voice is rare in action', async () => {
      // 2 of 10 action lines are passive = 20% ≤ 25%
      const f438pNF = `INT. ROOM - DAY

A gun rests on the table.
Maria opens the letter.
She walks toward the window.
Three shots ring out outside.
She closes the door behind her.
He reaches for the phone.
She reads the note carefully.
The lights go out.
A note is left on the counter.
He checks the lock.
`;
      const res = await runO438(f438pNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PASSIVE_VERB_DOMINANCE'), 'PASSIVE_VERB_DOMINANCE should not fire');
    });

    it('DIALOGUE_MONOLOGUE_DROUGHT fires when <5% of dialogue lines exceed 15 words', async () => {
      // 12 short dialogue lines, 0 long → 0% < 5% → fires
      const f438m = `INT. ROOM - DAY

Anna looks at him.

ANNA
You did it.

MARK
I didn't.

ANNA
You lied.

MARK
No.

ANNA
Then explain.

MARK
I can't.

ANNA
Try.

MARK
Not now.

ANNA
Why not?

MARK
It's complicated.

ANNA
Just say it.

MARK
Tomorrow.
`;
      const res = await runO438(f438m);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_MONOLOGUE_DROUGHT'), 'DIALOGUE_MONOLOGUE_DROUGHT should fire');
    });

    it('DIALOGUE_MONOLOGUE_DROUGHT does not fire when extended speeches exist', async () => {
      // 12 dialogue lines, 1 is >15 words (line with a long speech) → 8.3% ≥ 5% → no fire
      const f438mNF = `INT. ROOM - DAY

Anna looks at him.

ANNA
You did it.

MARK
I didn't.

ANNA
You lied.

MARK
Look, I know this looks bad, but I need you to understand what was actually at stake when I made that decision.

ANNA
Try.

MARK
Not now.

ANNA
Why not?

MARK
It's complicated.

ANNA
Just say it.

MARK
Tomorrow.
`;
      const res = await runO438(f438mNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_MONOLOGUE_DROUGHT'), 'DIALOGUE_MONOLOGUE_DROUGHT should not fire');
    });

    it('ACTION_QUESTION_INTRUSION fires when 3+ action lines contain a question mark', async () => {
      const f438q = `INT. ROOM - DAY

What does she know?
Anna picks up the envelope.
Can he trust her with this?
She sets it back down.
Where is all this headed?
He watches from the doorway.
She doesn't look up.
`;
      const res = await runO438(f438q);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_QUESTION_INTRUSION'), 'ACTION_QUESTION_INTRUSION should fire');
    });

    it('ACTION_QUESTION_INTRUSION does not fire when fewer than 3 action lines ask questions', async () => {
      const f438qNF = `INT. ROOM - DAY

What does she know?
Anna picks up the envelope.
She sets it back down.
He watches from the doorway.
She doesn't look up.
Can he trust her with this?
`;
      const res = await runO438(f438qNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_QUESTION_INTRUSION'), 'ACTION_QUESTION_INTRUSION should not fire');
    });
  });


  describe('Wave 424 — originalityPass: insert shot crutch, ellipsis action overuse, action adverb flood', async () => {
    const runO424 = async (fountain: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      return originalityPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('INSERT_SHOT_CRUTCH fires when 3+ INSERT labels appear', async () => {
      const f424i = `INT. ROOM - DAY

Anna enters and looks at the table.

INSERT: THE LETTER ON THE TABLE

She reaches for it.

INSERT: THE HANDWRITING UP CLOSE

Words written in red ink.

INSERT: A PHOTOGRAPH INSIDE THE ENVELOPE

Her own face, years younger.

She folds it and puts it in her coat.
`;
      const res = await runO424(f424i);
      assert.ok(res.issues.some((i: any) => i.rule === 'INSERT_SHOT_CRUTCH'), 'INSERT_SHOT_CRUTCH should fire');
    });

    it('INSERT_SHOT_CRUTCH does not fire with only 2 INSERT labels', async () => {
      const f424iNF = `INT. ROOM - DAY

Anna enters and looks at the table.

INSERT: THE LETTER ON THE TABLE

She reaches for it.

INSERT: THE HANDWRITING UP CLOSE

Words written in red ink.

She folds it and puts it in her coat.
`;
      const res = await runO424(f424iNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INSERT_SHOT_CRUTCH'), 'INSERT_SHOT_CRUTCH should not fire');
    });

    it('ELLIPSIS_ACTION_OVERUSE fires when >20% of action lines trail off with "..."', async () => {
      // 3 of 10 action lines have "..." = 30% > 20%
      const f424e = `INT. ROOM - DAY

She walks toward the window...
The light fades...
He turns... but says nothing.
She reaches out.
The phone rings.
He answers.
She starts to leave.
The door opens.
Rain falls outside.
The clock reads midnight.
`;
      const res = await runO424(f424e);
      assert.ok(res.issues.some((i: any) => i.rule === 'ELLIPSIS_ACTION_OVERUSE'), 'ELLIPSIS_ACTION_OVERUSE should fire');
    });

    it('ELLIPSIS_ACTION_OVERUSE does not fire when ellipsis is rare in action', async () => {
      // 1 of 10 action lines has "..." = 10% < 20%
      const f424eNF = `INT. ROOM - DAY

She walks toward the window.
The light fades.
He turns toward her.
She reaches out...
The phone rings on the table.
He answers it quickly.
She starts to leave.
The door opens from outside.
Rain falls against the glass.
The clock reads midnight.
`;
      const res = await runO424(f424eNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ELLIPSIS_ACTION_OVERUSE'), 'ELLIPSIS_ACTION_OVERUSE should not fire');
    });

    it('ACTION_ADVERB_FLOOD fires when >25% of action lines carry a manner adverb', async () => {
      // 4 of 10 action lines have adverbs = 40% > 25%
      const f424a = `INT. ROOM - DAY

She slowly closes the door behind her.
He carefully sets the glass down.
She quietly opens the drawer.
He walks to the window.
She picks up the letter.
He reads it to the end.
She crosses her arms.
He turns away.
The phone rings.
She answers it quickly.
`;
      const res = await runO424(f424a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_ADVERB_FLOOD'), 'ACTION_ADVERB_FLOOD should fire');
    });

    it('ACTION_ADVERB_FLOOD does not fire when adverbs are rare in action', async () => {
      // 1 of 10 action lines has an adverb = 10% < 25%
      const f424aNF = `INT. ROOM - DAY

She closes the door behind her.
He sets the glass down.
She opens the drawer.
He walks to the window.
She picks up the letter.
He reads it to the end.
She crosses her arms.
He turns away.
The phone rings.
She quickly answers it.
`;
      const res = await runO424(f424aNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_ADVERB_FLOOD'), 'ACTION_ADVERB_FLOOD should not fire');
    });
  });


  describe('Wave 410 — originalityPass: slow-motion crutch, freeze-frame crutch, sound-cue crutch', async () => {
    const runO410 = async (fountain: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      return originalityPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('SLOW_MOTION_CRUTCH fires when slow motion is called 2+ times', async () => {
      const f410s = `INT. ARENA - DAY

The car flips in SLOW MOTION.

EXT. STREET - NIGHT

She turns, SLO-MO, toward the blast.
`;
      const res = await runO410(f410s);
      assert.ok(res.issues.some((i: any) => i.rule === 'SLOW_MOTION_CRUTCH'), 'SLOW_MOTION_CRUTCH should fire');
    });

    it('SLOW_MOTION_CRUTCH does NOT fire with a single slow-motion call', async () => {
      const f410sNF = `INT. ARENA - DAY

The car flips in SLOW MOTION.

EXT. STREET - NIGHT

She turns toward the blast.
`;
      const res = await runO410(f410sNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SLOW_MOTION_CRUTCH'), 'SLOW_MOTION_CRUTCH should not fire');
    });

    it('FREEZE_FRAME_CRUTCH fires when freeze frame is called 2+ times', async () => {
      const f410f = `INT. HALL - DAY

FREEZE FRAME on his face.

EXT. PARK - DAY

FREEZE ON the crowd.
`;
      const res = await runO410(f410f);
      assert.ok(res.issues.some((i: any) => i.rule === 'FREEZE_FRAME_CRUTCH'), 'FREEZE_FRAME_CRUTCH should fire');
    });

    it('FREEZE_FRAME_CRUTCH does NOT fire with a single freeze-frame call', async () => {
      const f410fNF = `INT. HALL - DAY

FREEZE FRAME on his face.

EXT. PARK - DAY

The crowd scatters.
`;
      const res = await runO410(f410fNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'FREEZE_FRAME_CRUTCH'), 'FREEZE_FRAME_CRUTCH should not fire');
    });

    it('SOUND_CUE_CRUTCH fires when 3+ hard-coded sound cues appear', async () => {
      const f410c = `INT. ROOM - DAY

SFX: GLASS SHATTERS

SFX: DOOR SLAMS

SFX: PHONE RINGS
`;
      const res = await runO410(f410c);
      assert.ok(res.issues.some((i: any) => i.rule === 'SOUND_CUE_CRUTCH'), 'SOUND_CUE_CRUTCH should fire');
    });

    it('SOUND_CUE_CRUTCH does NOT fire with only two sound cues', async () => {
      const f410cNF = `INT. ROOM - DAY

SFX: GLASS SHATTERS

SFX: DOOR SLAMS
`;
      const res = await runO410(f410cNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SOUND_CUE_CRUTCH'), 'SOUND_CUE_CRUTCH should not fire');
    });
  });


  describe('Wave 396 — originalityPass: revelation purpose monotone, dialogue short-line dominance, dialogue question drought', async () => {
    const makeRec396 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: false,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const minFountain396 = `INT. SC0 - DAY\nSomething happens.\n\nINT. SC1 - DAY\nSomething else.\n`;
    const runO396 = async (fountain: string, records: any[] = []) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      return originalityPass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('REVELATION_PURPOSE_MONOTONE fires when all revelation scenes share the same purpose', async () => {
      const recs396a = [
        makeRec396(0, { revelation: true, purpose: 'exposition' }),
        makeRec396(1),
        makeRec396(2),
        makeRec396(3, { revelation: true, purpose: 'exposition' }),
        makeRec396(4),
        makeRec396(5),
        makeRec396(6, { revelation: true, purpose: 'exposition' }),
        makeRec396(7),
      ];
      const res = await runO396(minFountain396, recs396a);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_PURPOSE_MONOTONE'), 'REVELATION_PURPOSE_MONOTONE should fire');
    });

    it('REVELATION_PURPOSE_MONOTONE does not fire when revelation scenes have varied purposes', async () => {
      const recs396anr = [
        makeRec396(0, { revelation: true, purpose: 'exposition' }),
        makeRec396(1),
        makeRec396(2),
        makeRec396(3, { revelation: true, purpose: 'conflict' }),
        makeRec396(4),
        makeRec396(5),
        makeRec396(6, { revelation: true, purpose: 'development' }),
        makeRec396(7),
      ];
      const res = await runO396(minFountain396, recs396anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_PURPOSE_MONOTONE'), 'REVELATION_PURPOSE_MONOTONE should not fire');
    });

    it('DIALOGUE_SHORT_LINE_DOMINANCE fires when ≥75% of dialogue lines are ≤4 words', async () => {
      const f396b = `INT. ROOM - DAY

ALICE
Yes.
No.
Wait.
Come on.
I know.
Stop it.
Let's go.
Fine.
Sure.
Okay.
Never mind.
All right.
Do it.
Let's move.
Help me.
`;
      const res = await runO396(f396b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_SHORT_LINE_DOMINANCE'), 'DIALOGUE_SHORT_LINE_DOMINANCE should fire');
    });

    it('DIALOGUE_SHORT_LINE_DOMINANCE does not fire when dialogue has sufficient length variation', async () => {
      const f396bnr = `INT. ROOM - DAY

ALICE
Yes.
No.
Wait.
Come on.
I know.
Stop it.
Let's go.
Fine.
I really think we should take a completely different approach to this whole situation.
I'm telling you, the situation is far more complex than you might possibly realize.
We need to think carefully about all the implications before making any rash decisions.
Let me explain exactly what happened and why it matters so much to us right now.
You have to understand that everything changed the moment they arrived at the station.
It was never supposed to go this far, and now we are all stuck with the consequences.
The only way through this is if we work together and completely trust the process here.
Actually, I have been meaning to talk to you about something important for many weeks.
`;
      const res = await runO396(f396bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_SHORT_LINE_DOMINANCE'), 'DIALOGUE_SHORT_LINE_DOMINANCE should not fire');
    });

    it('DIALOGUE_QUESTION_DROUGHT fires when fewer than 5% of dialogue lines are interrogative', async () => {
      const f396c = `INT. ROOM - DAY

ALICE
I want to leave.

BOB
That's not happening.

ALICE
You don't understand.

BOB
I understand perfectly.

ALICE
This isn't right.

BOB
We had no choice.

ALICE
Something has to change.

BOB
It already has.

ALICE
I'm tired of waiting.

BOB
Everyone is tired.

ALICE
We need to act.

BOB
We will. Soon.

ALICE
I don't believe you.

BOB
That's your problem.

ALICE
You never listen.

BOB
I always listen.
`;
      const res = await runO396(f396c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_QUESTION_DROUGHT'), 'DIALOGUE_QUESTION_DROUGHT should fire');
    });

    it('DIALOGUE_QUESTION_DROUGHT does not fire when enough dialogue lines are interrogative', async () => {
      const f396cnr = `INT. ROOM - DAY

ALICE
I want to leave.

BOB
Did you hear what I said?

ALICE
You don't understand.

BOB
Why are you doing this to me?

ALICE
This isn't right.

BOB
We had no choice.

ALICE
What are you even talking about?

BOB
It already has.

ALICE
I'm tired of waiting.

BOB
Everyone is tired.

ALICE
We need to act.

BOB
We will. Soon.

ALICE
I don't believe you.

BOB
That's your problem.

ALICE
You never listen.

BOB
I always listen.
`;
      const res = await runO396(f396cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_QUESTION_DROUGHT'), 'DIALOGUE_QUESTION_DROUGHT should not fire');
    });
  });


  describe('Wave 382 — originalityPass: chapter label crutch, split-screen crutch, match-cut overuse', async () => {
    const runO382 = async (fountain: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      return originalityPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('CHAPTER_LABEL_CRUTCH fires when three or more chapter/part headings appear', async () => {
      const f382c = `CHAPTER ONE

INT. HOUSE - DAY

She opens the door.

CHAPTER TWO

INT. OFFICE - DAY

He signs the form.

PART THREE

EXT. STREET - NIGHT

They meet at last.`;
      const res = await runO382(f382c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CHAPTER_LABEL_CRUTCH'), 'CHAPTER_LABEL_CRUTCH should fire');
    });

    it('CHAPTER_LABEL_CRUTCH does not fire without chapter headings', async () => {
      const f382cn = `INT. HOUSE - DAY

She opens the door.

INT. OFFICE - DAY

He signs the form.

EXT. STREET - NIGHT

They meet at last.`;
      const res = await runO382(f382cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CHAPTER_LABEL_CRUTCH'), 'CHAPTER_LABEL_CRUTCH should not fire');
    });

    it('SPLIT_SCREEN_CRUTCH fires when two or more split-screen markers appear', async () => {
      const f382s = `INT. APARTMENT - NIGHT

SPLIT SCREEN:

She dials the phone.

INT. CAR - NIGHT

He answers, breathless.

SPLIT SCREEN:

Both check their watches at once.`;
      const res = await runO382(f382s);
      assert.ok(res.issues.some((i: any) => i.rule === 'SPLIT_SCREEN_CRUTCH'), 'SPLIT_SCREEN_CRUTCH should fire');
    });

    it('SPLIT_SCREEN_CRUTCH does not fire with at most one split-screen marker', async () => {
      const f382sn = `INT. APARTMENT - NIGHT

SPLIT SCREEN:

She dials the phone.

INT. CAR - NIGHT

He answers, breathless.

He pulls over to talk.`;
      const res = await runO382(f382sn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SPLIT_SCREEN_CRUTCH'), 'SPLIT_SCREEN_CRUTCH should not fire');
    });

    it('MATCH_CUT_OVERUSE fires when three or more match cuts appear', async () => {
      const f382m = `INT. KITCHEN - DAY

She cracks an egg.

MATCH CUT TO:

EXT. QUARRY - DAY

A boulder splits open.

MATCH CUT TO:

INT. CLINIC - DAY

A door swings wide.

MATCH CUT TO:

EXT. CANYON - DAY

The gorge yawns below.`;
      const res = await runO382(f382m);
      assert.ok(res.issues.some((i: any) => i.rule === 'MATCH_CUT_OVERUSE'), 'MATCH_CUT_OVERUSE should fire');
    });

    it('MATCH_CUT_OVERUSE does not fire with fewer than three match cuts', async () => {
      const f382mn = `INT. KITCHEN - DAY

She cracks an egg.

MATCH CUT TO:

EXT. QUARRY - DAY

A boulder splits open.

INT. CLINIC - DAY

A door swings wide.`;
      const res = await runO382(f382mn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'MATCH_CUT_OVERUSE'), 'MATCH_CUT_OVERUSE should not fire');
    });
  });


  describe('Wave 368 — originalityPass: off-screen cue overuse, continuous slug overuse, back-to-scene crutch', async () => {
    const runO368 = async (fountain: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      return originalityPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('OFF_SCREEN_CUE_OVERUSE fires when four or more (O.S.)/(O.C.) cues appear', async () => {
      const f368os = `INT. HOUSE - DAY

ANNA (O.S.)
Where did you put the keys?

MARK
On the table.

SARAH (O.S.)
I can't find them anywhere.

TOM (O.C.)
Check the drawer.

ANNA (O.S.)
Found them.`;
      const res = await runO368(f368os);
      assert.ok(res.issues.some((i: any) => i.rule === 'OFF_SCREEN_CUE_OVERUSE'), 'OFF_SCREEN_CUE_OVERUSE should fire');
    });

    it('OFF_SCREEN_CUE_OVERUSE does not fire when speakers are in the frame', async () => {
      const f368osn = `INT. HOUSE - DAY

ANNA
Where did you put the keys?

MARK
On the table.

SARAH (O.S.)
I can't find them anywhere.

TOM
Check the drawer.

ANNA
Found them.`;
      const res = await runO368(f368osn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'OFF_SCREEN_CUE_OVERUSE'), 'OFF_SCREEN_CUE_OVERUSE should not fire');
    });

    it('CONTINUOUS_SLUG_OVERUSE fires when three or more sluglines use continuity tags', async () => {
      const f368cs = `INT. KITCHEN - CONTINUOUS

She pours the coffee.

INT. HALLWAY - MOMENTS LATER

He walks past.

INT. STUDY - SAME

The phone rings.

EXT. GARDEN - LATER

The dog barks.`;
      const res = await runO368(f368cs);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONTINUOUS_SLUG_OVERUSE'), 'CONTINUOUS_SLUG_OVERUSE should fire');
    });

    it('CONTINUOUS_SLUG_OVERUSE does not fire when sluglines use real time-of-day', async () => {
      const f368csn = `INT. KITCHEN - DAY

She pours the coffee.

INT. HALLWAY - NIGHT

He walks past.

INT. STUDY - DAY

The phone rings.

EXT. GARDEN - DUSK

The dog barks.`;
      const res = await runO368(f368csn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONTINUOUS_SLUG_OVERUSE'), 'CONTINUOUS_SLUG_OVERUSE should not fire');
    });

    it('BACK_TO_SCENE_CRUTCH fires when two or more return markers appear', async () => {
      const f368bt = `INT. OFFICE - DAY

He stares at the photograph.

FLASHBACK:

EXT. BEACH - DAY

A child runs along the shore.

BACK TO SCENE:

INT. OFFICE - DAY

He sets the photo down.

FLASHBACK:

EXT. BEACH - DAY

The child laughs.

BACK TO SCENE:

INT. OFFICE - DAY

He closes the drawer.`;
      const res = await runO368(f368bt);
      assert.ok(res.issues.some((i: any) => i.rule === 'BACK_TO_SCENE_CRUTCH'), 'BACK_TO_SCENE_CRUTCH should fire');
    });

    it('BACK_TO_SCENE_CRUTCH does not fire with at most one return marker', async () => {
      const f368btn = `INT. OFFICE - DAY

He stares at the photograph.

FLASHBACK:

EXT. BEACH - DAY

A child runs along the shore.

BACK TO SCENE:

INT. OFFICE - DAY

He sets the photo down.`;
      const res = await runO368(f368btn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BACK_TO_SCENE_CRUTCH'), 'BACK_TO_SCENE_CRUTCH should not fire');
    });
  });


  describe('Wave 354 — originalityPass: fade transition overuse, dream sequence crutch, intercut overuse', async () => {
    const runO354 = async (fountain: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      return originalityPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('FADE_TRANSITION_OVERUSE fires when four or more fade/dissolve transitions appear', async () => {
      const f354f = `FADE IN:

INT. ROOM - DAY

She opens the door.

FADE OUT.

INT. HALL - NIGHT

He waits.

DISSOLVE TO:

EXT. STREET - DAY

The crowd moves.

FADE TO BLACK.

INT. CAR - NIGHT

The engine starts.`;
      const res = await runO354(f354f);
      assert.ok(res.issues.some((i: any) => i.rule === 'FADE_TRANSITION_OVERUSE'), 'FADE_TRANSITION_OVERUSE should fire');
    });

    it('FADE_TRANSITION_OVERUSE does not fire with only opening and closing fades', async () => {
      const f354fn = `FADE IN:

INT. ROOM - DAY

She opens the door.

INT. HALL - NIGHT

He waits.

EXT. STREET - DAY

The crowd moves.

FADE OUT.`;
      const res = await runO354(f354fn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'FADE_TRANSITION_OVERUSE'), 'FADE_TRANSITION_OVERUSE should not fire');
    });

    it('DREAM_SEQUENCE_CRUTCH fires when two or more dream sequences appear', async () => {
      const f354d = `INT. BEDROOM - NIGHT

She closes her eyes.

DREAM SEQUENCE:

She runs through an endless forest.

INT. BEDROOM - DAY

She wakes.

NIGHTMARE SEQUENCE:

The forest burns around her.`;
      const res = await runO354(f354d);
      assert.ok(res.issues.some((i: any) => i.rule === 'DREAM_SEQUENCE_CRUTCH'), 'DREAM_SEQUENCE_CRUTCH should fire');
    });

    it('DREAM_SEQUENCE_CRUTCH does not fire for a single dream sequence', async () => {
      const f354dn = `INT. BEDROOM - NIGHT

She closes her eyes.

DREAM SEQUENCE:

She runs through an endless forest.

INT. BEDROOM - DAY

She wakes and stares at the ceiling.`;
      const res = await runO354(f354dn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DREAM_SEQUENCE_CRUTCH'), 'DREAM_SEQUENCE_CRUTCH should not fire');
    });

    it('INTERCUT_OVERUSE fires when three or more intercut markers appear', async () => {
      const f354i = `INT. OFFICE - DAY

He dials the phone.

INTERCUT - PHONE CONVERSATION

INT. KITCHEN - DAY

She answers.

INTERCUT WITH:

EXT. ROAD - DAY

The car speeds on.

INTERCUT BETWEEN THE THREE:

They all shout at once.`;
      const res = await runO354(f354i);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTERCUT_OVERUSE'), 'INTERCUT_OVERUSE should fire');
    });

    it('INTERCUT_OVERUSE does not fire for a single intercut', async () => {
      const f354in = `INT. OFFICE - DAY

He dials the phone.

INTERCUT - PHONE CONVERSATION

INT. KITCHEN - DAY

She answers.

EXT. ROAD - DAY

The car speeds on.`;
      const res = await runO354(f354in);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTERCUT_OVERUSE'), 'INTERCUT_OVERUSE should not fire');
    });
  });


  describe('Wave 340 — originalityPass: voiceover crutch, beat direction overuse, smash cut overuse', async () => {
    const runO340 = async (fountain: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      return originalityPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('VOICEOVER_CRUTCH fires when four or more (V.O.) cues appear', async () => {
      const fountain340v = `INT. ROOM - DAY

ALICE (V.O.)
I never meant for it to end this way.

EXT. STREET - NIGHT

BOB (V.O.)
The city kept its secrets close.

INT. CAR - DAY

ALICE (V.O.)
Looking back, every choice was a mistake.

INT. OFFICE - NIGHT

BOB (V.O.)
And so the wheels were already turning.`;
      const res = await runO340(fountain340v);
      assert.ok(res.issues.some((i: any) => i.rule === 'VOICEOVER_CRUTCH'), 'VOICEOVER_CRUTCH should fire');
    });

    it('VOICEOVER_CRUTCH does not fire for a single framing voiceover', async () => {
      const fountain340vn = `INT. ROOM - DAY

ALICE (V.O.)
I never meant for it to end this way.

EXT. STREET - NIGHT

BOB
The city kept its secrets close.

INT. CAR - DAY

ALICE
Looking back, every choice mattered.`;
      const res = await runO340(fountain340vn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VOICEOVER_CRUTCH'), 'VOICEOVER_CRUTCH should not fire');
    });

    it('BEAT_DIRECTION_OVERUSE fires when four or more standalone (beat) directions appear', async () => {
      const fountain340b = `INT. ROOM - DAY

ALICE
So that's it.

(beat)

You're really leaving.

BOB
I have to.

(beat)

ALICE
After everything.

(a beat)

BOB
Don't make this harder.

(long beat)

ALICE
Then go.`;
      const res = await runO340(fountain340b);
      assert.ok(res.issues.some((i: any) => i.rule === 'BEAT_DIRECTION_OVERUSE'), 'BEAT_DIRECTION_OVERUSE should fire');
    });

    it('BEAT_DIRECTION_OVERUSE does not fire when (beat) is used sparingly', async () => {
      const fountain340bn = `INT. ROOM - DAY

ALICE
So that's it.

(beat)

You're really leaving.

BOB
I have to go now, before I change my mind about all of it.

ALICE
After everything we built together.

BOB
Don't make this harder than it already is.`;
      const res = await runO340(fountain340bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BEAT_DIRECTION_OVERUSE'), 'BEAT_DIRECTION_OVERUSE should not fire');
    });

    it('SMASH_CUT_OVERUSE fires when three or more dramatic cut transitions appear', async () => {
      const fountain340s = `INT. ROOM - DAY

She opens the door.

SMASH CUT TO:

INT. HALLWAY - NIGHT

He runs.

HARD CUT TO:

EXT. ROOF - NIGHT

The wind howls.

MATCH CUT TO:

INT. CAR - DAY

The engine roars to life.`;
      const res = await runO340(fountain340s);
      assert.ok(res.issues.some((i: any) => i.rule === 'SMASH_CUT_OVERUSE'), 'SMASH_CUT_OVERUSE should fire');
    });

    it('SMASH_CUT_OVERUSE does not fire for plain CUT TO transitions', async () => {
      const fountain340sn = `INT. ROOM - DAY

She opens the door.

CUT TO:

INT. HALLWAY - NIGHT

He runs.

CUT TO:

EXT. ROOF - NIGHT

The wind howls.

SMASH CUT TO:

INT. CAR - DAY

The engine roars to life.`;
      const res = await runO340(fountain340sn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SMASH_CUT_OVERUSE'), 'SMASH_CUT_OVERUSE should not fire');
    });
  });


  describe('Wave 326 — originalityPass: montage crutch, title card crutch, time card crutch', async () => {
    const runO326 = async (fountain: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      return originalityPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('MONTAGE_CRUTCH fires when two or more montages appear', async () => {
      const fountain326m = `INT. GYM - DAY

MONTAGE:

Rocky climbs the stairs.

INT. KITCHEN - DAY

A montage of breakfasts over the weeks.

BEGIN MONTAGE

Training reps in the dark.`;
      const res = await runO326(fountain326m);
      assert.ok(res.issues.some((i: any) => i.rule === 'MONTAGE_CRUTCH'), 'MONTAGE_CRUTCH should fire');
    });

    it('MONTAGE_CRUTCH does not fire for a single montage', async () => {
      const fountain326nm = `INT. GYM - DAY

MONTAGE:

Rocky climbs the stairs.

INT. KITCHEN - DAY

He pours a glass of juice.`;
      const res = await runO326(fountain326nm);
      assert.ok(!res.issues.some((i: any) => i.rule === 'MONTAGE_CRUTCH'), 'MONTAGE_CRUTCH should not fire');
    });

    it('TITLE_CARD_CRUTCH fires when three or more on-screen text cards appear', async () => {
      const fountain326t = `INT. OFFICE - DAY

SUPER: WASHINGTON, D.C.

The senator reads a file.

INT. HALL - NIGHT

CHYRON: SIX MONTHS AGO

A guard locks the door.

EXT. STREET - DAY

TITLE: THE RECKONING

A car pulls away.`;
      const res = await runO326(fountain326t);
      assert.ok(res.issues.some((i: any) => i.rule === 'TITLE_CARD_CRUTCH'), 'TITLE_CARD_CRUTCH should fire');
    });

    it('TITLE_CARD_CRUTCH does not fire when on-screen text is sparse', async () => {
      const fountain326nt = `INT. OFFICE - DAY

SUPER: WASHINGTON, D.C.

The senator reads a file.

INT. HALL - NIGHT

A guard locks the door.

EXT. STREET - DAY

A car pulls away.`;
      const res = await runO326(fountain326nt);
      assert.ok(!res.issues.some((i: any) => i.rule === 'TITLE_CARD_CRUTCH'), 'TITLE_CARD_CRUTCH should not fire');
    });

    it('TIME_CARD_CRUTCH fires when three or more time-jump captions appear', async () => {
      const fountain326c = `INT. ROOM - DAY

A phone rings.

THREE WEEKS LATER

The room is empty now.

MEANWHILE

A car speeds down the highway.

LATER THAT NIGHT

The lights go out.`;
      const res = await runO326(fountain326c);
      assert.ok(res.issues.some((i: any) => i.rule === 'TIME_CARD_CRUTCH'), 'TIME_CARD_CRUTCH should fire');
    });

    it('TIME_CARD_CRUTCH does not fire when time-jump captions are rare', async () => {
      const fountain326nc = `INT. ROOM - DAY

A phone rings.

THREE WEEKS LATER

The room is empty now.

INT. HIGHWAY - DAY

A car speeds down the road.

INT. HOUSE - NIGHT

The lights go out.`;
      const res = await runO326(fountain326nc);
      assert.ok(!res.issues.some((i: any) => i.rule === 'TIME_CARD_CRUTCH'), 'TIME_CARD_CRUTCH should not fire');
    });
  });


  describe('Wave 315 — originalityPass: body language cliché overuse, slug generic location, flashback crutch', async () => {
    const runO315 = async (fountain: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      return originalityPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('BODY_LANGUAGE_CLICHE_OVERUSE fires when >20% of action lines use stock gestures', async () => {
      const fountain315b = `INT. INTERROGATION ROOM - NIGHT

The detective sits across the table.

The suspect nods slowly.

Papers slide across the table.

The detective shrugs and leans back.

A clock ticks on the wall.

The suspect sighs and looks away.

Fluorescent lights buzz overhead.

The detective taps the folder.

The suspect shifts in the chair.

A door opens behind them.

The suspect grins despite themselves.

Silence fills the room.`;
      const res = await runO315(fountain315b);
      assert.ok(res.issues.some((i: any) => i.rule === 'BODY_LANGUAGE_CLICHE_OVERUSE'), 'BODY_LANGUAGE_CLICHE_OVERUSE should fire');
    });

    it('BODY_LANGUAGE_CLICHE_OVERUSE does not fire when action lines use specific physical behaviour', async () => {
      const fountain315nb = `INT. INTERROGATION ROOM - NIGHT

The detective sits across the table.

Papers slide across the table.

A clock ticks on the wall.

Fluorescent lights buzz overhead.

The detective taps the folder twice.

The suspect shifts in the chair.

A door opens behind them.

Two agents enter.

The door swings shut behind them.

Silence fills the room.

The table edge catches the light.

A photo slides to the center.`;
      const res = await runO315(fountain315nb);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BODY_LANGUAGE_CLICHE_OVERUSE'), 'BODY_LANGUAGE_CLICHE_OVERUSE should not fire');
    });

    it('SLUG_GENERIC_LOCATION fires when >60% of sluglines use placeholder names', async () => {
      const fountain315g = `INT. ROOM - DAY

The meeting begins.

INT. OFFICE - NIGHT

Papers are signed.

EXT. STREET - DAY

A car drives past.

INT. HALLWAY - NIGHT

Footsteps echo.

INT. APARTMENT - DAY

The door opens.

INT. WAREHOUSE - NIGHT

Crates line the walls.

INT. TOKYO IMPERIAL PALACE - DAY

An envoy waits.

EXT. BROOKLYN BRIDGE - NIGHT

Traffic hums below.`;
      const res = await runO315(fountain315g);
      assert.ok(res.issues.some((i: any) => i.rule === 'SLUG_GENERIC_LOCATION'), 'SLUG_GENERIC_LOCATION should fire');
    });

    it('SLUG_GENERIC_LOCATION does not fire when sluglines use specific named locations', async () => {
      const fountain315ng = `INT. MARA'S REPAIR SHOP - DAY

Tools hang from every hook.

EXT. RIVERSIDE PARK - NIGHT

Ducks float on the dark water.

INT. ROOM - DAY

A phone rings.

INT. FEDERAL COURTHOUSE - MORNING

The gallery fills quickly.

EXT. GOLDEN GATE BRIDGE - DUSK

Fog rolls in from the bay.

INT. OFFICE - NIGHT

The last light clicks off.

INT. DETECTIVE COLE'S APARTMENT - NIGHT

A map covers the wall.

EXT. BROKEN COMPASS BAR - NIGHT

Neon flickers above the door.`;
      const res = await runO315(fountain315ng);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SLUG_GENERIC_LOCATION'), 'SLUG_GENERIC_LOCATION should not fire');
    });

    it('FLASHBACK_CRUTCH fires when 4 or more flashback markers appear', async () => {
      const fountain315f = `INT. APARTMENT - DAY

Marcus stares at an old photograph.

FLASHBACK:

INT. CHILDHOOD HOME - DAY

A boy runs through the yard.

END FLASHBACK.

Marcus puts the photo down.

BACK TO:

INT. APARTMENT - NIGHT

The phone rings.

RETURN TO:

INT. APARTMENT - DAY

Marcus answers.`;
      const res = await runO315(fountain315f);
      assert.ok(res.issues.some((i: any) => i.rule === 'FLASHBACK_CRUTCH'), 'FLASHBACK_CRUTCH should fire');
    });

    it('FLASHBACK_CRUTCH does not fire when fewer than 4 flashback markers are used', async () => {
      const fountain315nf = `INT. APARTMENT - DAY

Marcus stares at an old photograph.

FLASHBACK:

INT. CHILDHOOD HOME - DAY

A boy runs through the yard.

END FLASHBACK.

Marcus puts the photo down.`;
      const res = await runO315(fountain315nf);
      assert.ok(!res.issues.some((i: any) => i.rule === 'FLASHBACK_CRUTCH'), 'FLASHBACK_CRUTCH should not fire');
    });
  });


  describe('Wave 301 — originalityPass: mirror self-gaze cliché, weather opener crutch, just-a-dream reveal', async () => {
    const runO301 = async (fountain: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      return originalityPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('MIRROR_SELF_GAZE_CLICHE fires when mirror introspection appears in 2+ scenes', async () => {
      const fountain301m = `INT. BATHROOM - DAY

Alice stares at the mirror, searching her own face.

INT. DRESSING ROOM - NIGHT

Bob looks into the mirror and straightens his collar.`;
      const res = await runO301(fountain301m);
      assert.ok(res.issues.some((i: any) => i.rule === 'MIRROR_SELF_GAZE_CLICHE'), 'MIRROR_SELF_GAZE_CLICHE should fire');
    });

    it('MIRROR_SELF_GAZE_CLICHE does not fire for a single mirror beat', async () => {
      const fountain301nm = `INT. BATHROOM - DAY

Alice stares at the mirror, searching her own face.

INT. KITCHEN - NIGHT

Bob pours two glasses of wine.`;
      const res = await runO301(fountain301nm);
      assert.ok(!res.issues.some((i: any) => i.rule === 'MIRROR_SELF_GAZE_CLICHE'), 'MIRROR_SELF_GAZE_CLICHE should not fire');
    });

    it('WEATHER_OPENER_CRUTCH fires when 3+ scenes open on a weather line', async () => {
      const fountain301w = `EXT. STREET - NIGHT

Rain hammers the empty street.

Alice hurries to the door.

EXT. FIELD - DAY

Thunder rolls across the hills.

Bob watches from the fence.

EXT. HARBOR - DUSK

Fog drifts over the water.

A ship horn sounds far away.`;
      const res = await runO301(fountain301w);
      assert.ok(res.issues.some((i: any) => i.rule === 'WEATHER_OPENER_CRUTCH'), 'WEATHER_OPENER_CRUTCH should fire');
    });

    it('WEATHER_OPENER_CRUTCH does not fire when scenes open on character action', async () => {
      const fountain301nw = `EXT. STREET - NIGHT

Alice hurries to the door through the rain.

EXT. FIELD - DAY

Bob climbs the fence and drops to the other side.

EXT. HARBOR - DUSK

A ship horn sounds far away.`;
      const res = await runO301(fountain301nw);
      assert.ok(!res.issues.some((i: any) => i.rule === 'WEATHER_OPENER_CRUTCH'), 'WEATHER_OPENER_CRUTCH should not fire');
    });

    it('JUST_A_DREAM_REVEAL fires when events are dismissed as just a dream', async () => {
      const fountain301d = `INT. WAREHOUSE - NIGHT

Alice backs away from the shadow closing in.

INT. BEDROOM - NIGHT

Alice sits up, breathing hard. It was all just a dream.`;
      const res = await runO301(fountain301d);
      assert.ok(res.issues.some((i: any) => i.rule === 'JUST_A_DREAM_REVEAL'), 'JUST_A_DREAM_REVEAL should fire');
    });

    it('JUST_A_DREAM_REVEAL does not fire when no dream fake-out occurs', async () => {
      const fountain301nd = `INT. WAREHOUSE - NIGHT

Alice backs away from the shadow closing in.

INT. BEDROOM - NIGHT

Alice sits up, breathing hard, and reaches for the phone.`;
      const res = await runO301(fountain301nd);
      assert.ok(!res.issues.some((i: any) => i.rule === 'JUST_A_DREAM_REVEAL'), 'JUST_A_DREAM_REVEAL should not fire');
    });
  });


  describe('Wave 287 — originalityPass: opening wake-up cliché, dialogue exclamation flood, slug interior dominance', async () => {
    const runO287 = async (fountain: string) => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      return originalityPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('OPENING_WAKE_UP_CLICHE fires when the first scene shows a character waking up', async () => {
      const fountain287w = `INT. BEDROOM - MORNING

The alarm clock blares. Alice's eyes snap open.

She bolts upright in bed.

INT. KITCHEN - DAY

Alice pours coffee with shaking hands.`;
      const res = await runO287(fountain287w);
      assert.ok(res.issues.some((i: any) => i.rule === 'OPENING_WAKE_UP_CLICHE'), 'OPENING_WAKE_UP_CLICHE should fire');
    });

    it('OPENING_WAKE_UP_CLICHE does not fire when waking happens in a later scene', async () => {
      const fountain287nw = `INT. WAREHOUSE - NIGHT

Alice presses her back against a crate, breathing hard.

Footsteps approach from the dark.

INT. BEDROOM - MORNING

Alice wakes up with a start, the nightmare still on her face.`;
      const res = await runO287(fountain287nw);
      assert.ok(!res.issues.some((i: any) => i.rule === 'OPENING_WAKE_UP_CLICHE'), 'OPENING_WAKE_UP_CLICHE should not fire');
    });

    it('DIALOGUE_EXCLAMATION_FLOOD fires when >25% of 10+ dialogue lines end with !', async () => {
      const fountain287ef = `INT. ROOM - DAY

ALICE
Get out!

BOB
Never!

ALICE
You have to leave now!

BOB
I won't do it!

ALICE
This is insane!

BOB
I know.

ALICE
Stop that.

BOB
Fine.

ALICE
What did you say.

BOB
You heard me.`;
      const res = await runO287(fountain287ef);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_EXCLAMATION_FLOOD'), 'DIALOGUE_EXCLAMATION_FLOOD should fire');
    });

    it('DIALOGUE_EXCLAMATION_FLOOD does not fire when exclamations are sparse', async () => {
      const fountain287nef = `INT. ROOM - DAY

ALICE
What happened here.

BOB
I came back early.

ALICE
You should have called.

BOB
I know.

ALICE
This changes things.

BOB
Does it.

ALICE
Yes it does.

BOB
I see.

ALICE
We need to talk.

BOB
Now.`;
      const res = await runO287(fountain287nef);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_EXCLAMATION_FLOOD'), 'DIALOGUE_EXCLAMATION_FLOOD should not fire');
    });

    it('SLUG_INTERIOR_DOMINANCE fires when >85% of 6+ sluglines are INT.', async () => {
      const fountain287id = `INT. OFFICE - DAY

Scene one.

INT. KITCHEN - NIGHT

Scene two.

INT. BEDROOM - DAY

Scene three.

INT. HALLWAY - NIGHT

Scene four.

INT. LIVING ROOM - DAY

Scene five.

INT. BASEMENT - NIGHT

Scene six.`;
      const res = await runO287(fountain287id);
      assert.ok(res.issues.some((i: any) => i.rule === 'SLUG_INTERIOR_DOMINANCE'), 'SLUG_INTERIOR_DOMINANCE should fire');
    });

    it('SLUG_INTERIOR_DOMINANCE does not fire when exterior scenes are present', async () => {
      const fountain287nid = `INT. OFFICE - DAY

Scene one.

INT. KITCHEN - NIGHT

Scene two.

EXT. STREET - DAY

Scene three.

INT. BEDROOM - NIGHT

Scene four.

EXT. PARK - DAY

Scene five.

INT. HALLWAY - NIGHT

Scene six.`;
      const res = await runO287(fountain287nid);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SLUG_INTERIOR_DOMINANCE'), 'SLUG_INTERIOR_DOMINANCE should not fire');
    });
  });


  describe('Wave 273 — originalityPass: exclamation in action, parenthetical flood, location repetition', async () => {
    const oInput273 = (fountain: string) => ({
      fountain, original: fountain, records: [] as any, structure: {} as any,
      annotations: [], approvedSpans: [],
    });

    it('EXCLAMATION_IN_ACTION fires when 2+ action lines end with an exclamation mark', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // 8+ action lines; 3 end with '!'
      const f273a = [
        'INT. ROOM - DAY', '',
        'She grabs the envelope!',
        'The room falls silent.',
        'He tears it open!',
        'Inside: a single photograph.',
        'His hands shake!',
        'She steps back from the table.',
        'The photograph falls to the floor.',
        'Neither of them speaks for a long moment.',
      ].join('\n');
      const result273a = await originalityPass(oInput273(f273a));
      const excl = result273a.issues.filter((i: any) => i.rule === 'EXCLAMATION_IN_ACTION');
      assert.ok(excl.length >= 1, `Should detect EXCLAMATION_IN_ACTION, got: ${JSON.stringify(result273a.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(excl[0].severity, 'minor');
    });

    it('EXCLAMATION_IN_ACTION does NOT fire when fewer than 2 action lines end with exclamation', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // 8+ action lines; only 1 ends with '!'
      const f273b = [
        'INT. ROOM - DAY', '',
        'She grabs the envelope.',
        'The room falls silent.',
        'He tears it open!',
        'Inside: a single photograph.',
        'His hands are steady.',
        'She steps back from the table.',
        'The photograph lies on the floor.',
        'Neither of them speaks for a long moment.',
      ].join('\n');
      const result273b = await originalityPass(oInput273(f273b));
      const excl = result273b.issues.filter((i: any) => i.rule === 'EXCLAMATION_IN_ACTION');
      assert.strictEqual(excl.length, 0, 'Should NOT fire when fewer than 2 action lines end with exclamation');
    });

    it('PARENTHETICAL_FLOOD fires when parentheticals exceed 30% of dialogue lines', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // 10 dialogue lines, 4 parentheticals → 40%
      const f273c = [
        'INT. ROOM - DAY', '',
        'ALICE', '(nervous)', 'I need to tell you something important.',
        'BOB', 'What is it?',
        'ALICE', '(quietly)', 'It happened two nights ago.',
        'BOB', 'Go on.',
        'ALICE', '(turning away)', 'I was there when it all fell apart.',
        'BOB', 'I had no idea you were there.',
        'ALICE', '(voice breaking)', 'I could not say anything until now.',
        'BOB', 'We need to go to the police.',
        'ALICE', 'I know.',
        'BOB', 'Tonight.',
      ].join('\n');
      const result273c = await originalityPass(oInput273(f273c));
      const pf = result273c.issues.filter((i: any) => i.rule === 'PARENTHETICAL_FLOOD');
      assert.ok(pf.length >= 1, `Should detect PARENTHETICAL_FLOOD, got: ${JSON.stringify(result273c.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(pf[0].severity, 'minor');
    });

    it('PARENTHETICAL_FLOOD does NOT fire when parentheticals are sparse', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // 10 dialogue lines, only 1 parenthetical → 10%
      const f273d = [
        'INT. ROOM - DAY', '',
        'ALICE', 'I need to tell you something important.',
        'BOB', 'What is it?',
        'ALICE', 'It happened two nights ago near the docks.',
        'BOB', 'Go on.',
        'ALICE', 'I was there when it all fell apart around us.',
        'BOB', 'I had no idea you were even in the area.',
        'ALICE', '(quietly)', 'I could not say anything until now.',
        'BOB', 'We need to go to the police about this.',
        'ALICE', 'I know what has to happen next.',
        'BOB', 'Then we go tonight and tell them everything.',
      ].join('\n');
      const result273d = await originalityPass(oInput273(f273d));
      const pf = result273d.issues.filter((i: any) => i.rule === 'PARENTHETICAL_FLOOD');
      assert.strictEqual(pf.length, 0, 'Should NOT fire when parentheticals are sparse');
    });

    it('LOCATION_REPETITION fires when more than 70% of sluglines use the same location', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // 6 sluglines; 5 are INT. KITCHEN → 83%
      const f273e = [
        'INT. KITCHEN - DAY', '',
        'She prepares breakfast in silence.',
        '', 'INT. KITCHEN - NIGHT', '',
        'The dishes pile up in the sink.',
        '', 'INT. KITCHEN - DAY', '',
        'He enters and pours coffee.',
        '', 'INT. KITCHEN - NIGHT', '',
        'They argue over the table.',
        '', 'INT. KITCHEN - MORNING', '',
        'She stares at the empty chair.',
        '', 'INT. LIVING ROOM - DAY', '',
        'The television plays to an empty room.',
      ].join('\n');
      const result273e = await originalityPass(oInput273(f273e));
      const lr = result273e.issues.filter((i: any) => i.rule === 'LOCATION_REPETITION');
      assert.ok(lr.length >= 1, `Should detect LOCATION_REPETITION, got: ${JSON.stringify(result273e.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(lr[0].severity, 'minor');
    });

    it('LOCATION_REPETITION does NOT fire when locations are varied', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // 6 sluglines with 4 different locations — no single location > 70%
      const f273f = [
        'INT. KITCHEN - DAY', '',
        'She prepares breakfast in silence.',
        '', 'INT. LIVING ROOM - NIGHT', '',
        'He watches the news without sound.',
        '', 'EXT. PARKING LOT - DAY', '',
        'She unlocks her car and sits inside.',
        '', 'INT. OFFICE - DAY', '',
        'Papers cover every surface of the desk.',
        '', 'INT. KITCHEN - NIGHT', '',
        'She stares at the phone on the counter.',
        '', 'EXT. STREET - NIGHT', '',
        'He walks slowly past the shuttered shops.',
      ].join('\n');
      const result273f = await originalityPass(oInput273(f273f));
      const lr = result273f.issues.filter((i: any) => i.rule === 'LOCATION_REPETITION');
      assert.strictEqual(lr.length, 0, 'Should NOT fire when locations are varied');
    });
  });


  describe('Wave 259 — originalityPass: copula action dominance, filtering-verb overuse, directorial intrusion', async () => {
    const oInput259 = (fountain: string) => ({ fountain, original: fountain, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });

    it('COPULA_ACTION_DOMINANCE fires when >45% of action lines lean on a copula', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // 12 action lines, 8 with copula
      const f259a = [
        'INT. ROOM - DAY', '',
        'The room is dark.',
        'There are shadows on the wall.',
        'The window is open.',
        'A chair is overturned.',
        'The floor was wet.',
        'Papers are scattered everywhere.',
        'The clock was broken.',
        'The air is cold.',
        'She crosses the room.',
        'He grabs the keys.',
        'They climb the stairs.',
        'She opens the drawer.',
      ].join('\n');
      const result259a = await originalityPass(oInput259(f259a));
      assert.ok(result259a.issues.some((i: any) => i.rule === 'COPULA_ACTION_DOMINANCE'), `Expected COPULA_ACTION_DOMINANCE, got: ${JSON.stringify(result259a.issues.map((i: any) => i.rule))}`);
    });

    it('COPULA_ACTION_DOMINANCE does NOT fire when action lines use active verbs', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const f259b = [
        'INT. ROOM - DAY', '',
        'She crosses the room.',
        'He grabs the keys.',
        'They climb the stairs.',
        'She opens the drawer.',
        'He slams the door.',
        'She pockets the note.',
        'He bolts down the hall.',
        'She kicks the chair aside.',
        'He scans the floor.',
        'She rips the page out.',
        'He hurls the cup.',
        'She vaults the railing.',
      ].join('\n');
      const result259b = await originalityPass(oInput259(f259b));
      assert.ok(!result259b.issues.some((i: any) => i.rule === 'COPULA_ACTION_DOMINANCE'), 'Should NOT fire when action lines use active verbs');
    });

    it('FILTERING_VERB_OVERUSE fires when >25% of action lines filter perception', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // 12 action lines, 5 with filtering verbs
      const f259c = [
        'INT. ROOM - DAY', '',
        'She sees the door swing open.',
        'He hears footsteps in the hall.',
        'She watches the car pull away.',
        'He feels the cold metal.',
        'She looks at the photograph.',
        'He crosses the room.',
        'She grabs the keys.',
        'They climb the stairs.',
        'He opens the drawer.',
        'She pockets the note.',
        'He slams the door.',
        'She rips the page out.',
      ].join('\n');
      const result259c = await originalityPass(oInput259(f259c));
      assert.ok(result259c.issues.some((i: any) => i.rule === 'FILTERING_VERB_OVERUSE'), `Expected FILTERING_VERB_OVERUSE, got: ${JSON.stringify(result259c.issues.map((i: any) => i.rule))}`);
    });

    it('FILTERING_VERB_OVERUSE does NOT fire when images are presented directly', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const f259d = [
        'INT. ROOM - DAY', '',
        'The door swings open.',
        'Footsteps echo in the hall.',
        'The car pulls away.',
        'Cold metal glints.',
        'The photograph lies face up.',
        'He crosses the room.',
        'She grabs the keys.',
        'They climb the stairs.',
        'He opens the drawer.',
        'She watches the road.',
        'He slams the door.',
        'She rips the page out.',
      ].join('\n');
      const result259d = await originalityPass(oInput259(f259d));
      assert.ok(!result259d.issues.some((i: any) => i.rule === 'FILTERING_VERB_OVERUSE'), 'Should NOT fire when images are presented directly');
    });

    it('DIRECTORIAL_INTRUSION fires when 3+ action lines embed camera directions', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const f259e = [
        'INT. ROOM - DAY', '',
        'ANGLE ON the hallway door.',
        'She steps forward.',
        'CLOSE ON her trembling hands.',
        'He looks up.',
        'PAN ACROSS the empty desks.',
        'The lights flicker.',
      ].join('\n');
      const result259e = await originalityPass(oInput259(f259e));
      assert.ok(result259e.issues.some((i: any) => i.rule === 'DIRECTORIAL_INTRUSION'), `Expected DIRECTORIAL_INTRUSION, got: ${JSON.stringify(result259e.issues.map((i: any) => i.rule))}`);
    });

    it('DIRECTORIAL_INTRUSION does NOT fire when prose carries the emphasis', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const f259f = [
        'INT. ROOM - DAY', '',
        'The hallway door looms.',
        'She steps forward.',
        'Her hands tremble. Just her hands.',
        'He looks up.',
        'Empty desks stretch into the dark.',
        'The lights flicker.',
      ].join('\n');
      const result259f = await originalityPass(oInput259(f259f));
      assert.ok(!result259f.issues.some((i: any) => i.rule === 'DIRECTORIAL_INTRUSION'), 'Should NOT fire when prose carries the emphasis');
    });
  });


  describe('Wave 245 — originalityPass: gerund opener dominance, scene slug time monotone, cognition in action', async () => {
    it('GERUND_OPENER_DOMINANCE fires when >45% of action lines start with a gerund', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const f245a = [
        'INT. OFFICE - DAY', '',
        'Running toward the door, she reaches the handle.',
        'Checking the window, he sees them approaching.',
        'Looking at the files, she notices the discrepancy.',
        'Crossing to the desk, Bob finds the folder.',
        'Holding the evidence, she faces him.',
        'Turning away, he considers his options.',
        'Alice walks to the exit.',
        'Bob checks the entrance.',
        'She sets the folder down.',
        'He picks up the phone.',
      ].join('\n');
      const result = await originalityPass({ fountain: f245a, original: f245a, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(result.issues.some((i: any) => i.rule === 'GERUND_OPENER_DOMINANCE'), `Expected GERUND_OPENER_DOMINANCE, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('GERUND_OPENER_DOMINANCE does NOT fire when ≤45% of action lines start with a gerund', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const f245b = [
        'INT. OFFICE - DAY', '',
        'Running toward the door, she grabs the handle.',
        'Checking the window, he pauses.',
        'Alice walks to the exit slowly.',
        'Bob checks the main entrance now.',
        'She sets the folder on the surface.',
        'He picks up the phone and dials.',
        'The clock ticks steadily on the wall.',
        'Alice crosses to the window carefully.',
        'Bob opens the door.',
        'She pauses at the threshold.',
      ].join('\n');
      const result = await originalityPass({ fountain: f245b, original: f245b, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(!result.issues.some((i: any) => i.rule === 'GERUND_OPENER_DOMINANCE'), 'Should NOT fire when ≤45% gerund openers');
    });

    it('SCENE_SLUG_TIME_MONOTONE fires when all scene sluglines use the same time indicator', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const f245c = Array.from({ length: 6 }, (_, i) => `INT. SC${i} - DAY\nAlice crosses to the window.\n`).join('\n');
      const result = await originalityPass({ fountain: f245c, original: f245c, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(result.issues.some((i: any) => i.rule === 'SCENE_SLUG_TIME_MONOTONE'), `Expected SCENE_SLUG_TIME_MONOTONE, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('SCENE_SLUG_TIME_MONOTONE does NOT fire when scene sluglines have mixed time indicators', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const times = ['DAY', 'NIGHT', 'DAY', 'NIGHT', 'DAY', 'NIGHT'];
      const f245d = times.map((t, i) => `INT. SC${i} - ${t}\nAlice crosses to the window.\n`).join('\n');
      const result = await originalityPass({ fountain: f245d, original: f245d, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(!result.issues.some((i: any) => i.rule === 'SCENE_SLUG_TIME_MONOTONE'), 'Should NOT fire when time indicators are mixed');
    });

    it('COGNITION_IN_ACTION fires when >30% of action lines use cognition verbs', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const f245e = [
        'INT. OFFICE - DAY', '',
        'She realizes the door is unlocked.',
        'He wonders where she has gone.',
        'She decides to leave immediately.',
        'He notices the files are missing.',
        'She remembers the entry code now.',
        'Alice walks toward the exit.',
        'Bob checks the window frame.',
        'She sets down her bag.',
        'He picks up the phone slowly.',
        'The door closes behind her.',
      ].join('\n');
      const result = await originalityPass({ fountain: f245e, original: f245e, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(result.issues.some((i: any) => i.rule === 'COGNITION_IN_ACTION'), `Expected COGNITION_IN_ACTION, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('COGNITION_IN_ACTION does NOT fire when ≤30% of action lines use cognition verbs', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const f245f = [
        'INT. OFFICE - DAY', '',
        'She opens the door.',
        'He crosses to the window.',
        'She picks up the folder.',
        'He dials the phone.',
        'She realizes he has left.',
        'Alice walks toward the exit.',
        'Bob checks the drawer.',
        'She sets down her bag.',
        'He closes the window slowly.',
        'The door swings shut.',
      ].join('\n');
      const result = await originalityPass({ fountain: f245f, original: f245f, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(!result.issues.some((i: any) => i.rule === 'COGNITION_IN_ACTION'), 'Should NOT fire when ≤30% cognition verbs');
    });
  });


  describe('Wave 217 — originalityPass: action opener monotony, distinctive word echo, scene shape templating (freshness physics)', async () => {
    const makeTextInput217 = (fountain: string) => ({
      fountain, original: fountain,
      records: [] as any, structure: {} as any,
      storyContext: {} as any, annotations: [] as any,
      approvedSpans: [],
    });
    const makeRec217 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeRecInput217 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: 'INT. SC - DAY\nAction line.\n',
      records: records as any, structure: {} as any,
      storyContext: {} as any, annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('ACTION_OPENER_MONOTONY fires when most action lines begin with the same word', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // 10 action lines, 5 begin with "He" → 50% > 35%
      const fountain = [
        'INT. ROOM - DAY',
        '',
        'He opens the door.',
        'He crosses to the window.',
        'He stares at the street.',
        'He lights a match.',
        'He waits for the signal.',
        'The phone rings twice.',
        'A car passes outside.',
        'Rain taps the glass.',
        'Smoke curls upward.',
        'Silence fills the room.',
      ].join('\n');
      const result = await originalityPass(makeTextInput217(fountain));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'ACTION_OPENER_MONOTONY'),
        'Should fire when one opener word exceeds 35% of action lines',
      );
    });

    it('ACTION_OPENER_MONOTONY does not fire when action openers vary', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const fountain = [
        'INT. ROOM - DAY',
        '',
        'He opens the door.',
        'She crosses the room.',
        'Rain taps the window.',
        'Smoke curls upward.',
        'Thunder rolls outside.',
        'Marcus lights a match.',
        'Nobody answers him.',
        'Footsteps echo below.',
        'The clock ticks.',
        'Wind rattles the shutters.',
      ].join('\n');
      const result = await originalityPass(makeTextInput217(fountain));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'ACTION_OPENER_MONOTONY'),
        'Should NOT fire when no single opener word dominates',
      );
    });

    it('DISTINCTIVE_WORD_ECHO fires when a distinctive word repeats in close proximity', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // "shadows" appears in 4 of 5 consecutive action lines
      const fountain = [
        'INT. ALLEY - NIGHT',
        '',
        'Shadows pool beneath the streetlamp.',
        'The shadows lengthen across the brick.',
        'He fears the shadows ahead.',
        'Deeper shadows swallow the corner.',
        'A cat darts past.',
      ].join('\n');
      const result = await originalityPass(makeTextInput217(fountain));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'DISTINCTIVE_WORD_ECHO'),
        'Should fire when a 5+ letter content word repeats 4+ times within six action lines',
      );
    });

    it('DISTINCTIVE_WORD_ECHO does not fire when distinctive words are not repeated', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      const fountain = [
        'INT. ALLEY - NIGHT',
        '',
        'Shadows pool beneath the streetlamp.',
        'The fog drifts across the brick.',
        'He fears the silence ahead.',
        'Deeper darkness swallows the corner.',
        'A cat darts past.',
      ].join('\n');
      const result = await originalityPass(makeTextInput217(fountain));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'DISTINCTIVE_WORD_ECHO'),
        'Should NOT fire when no distinctive word repeats four times in proximity',
      );
    });

    it('SCENE_SHAPE_TEMPLATING fires when most scenes share one structural signature despite varied purposes', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // 10 scenes, all neutral + dialogue + no reversal + no rel shift → identical shape,
      // but purposes vary so UNIFORM_SCENE_PURPOSES cannot catch it
      const purposes = ['dialogue', 'revelation', 'conflict', 'setup', 'climax'];
      const records = Array.from({ length: 10 }, (_, i) =>
        makeRec217(i, { purpose: purposes[i % purposes.length], dialogueHighlights: ['alice: speaks'] }),
      );
      const result = await originalityPass(makeRecInput217(records));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'SCENE_SHAPE_TEMPLATING'),
        'Should fire when 60%+ of scenes share an identical structural shape signature',
      );
    });

    it('SCENE_SHAPE_TEMPLATING does not fire when scene shapes vary structurally', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // Diversify emotion, dialogue-presence, reversals, and relationship shifts
      const records = [
        makeRec217(0, { emotionalShift: 'neutral', dialogueHighlights: ['a: x'] }),
        makeRec217(1, { emotionalShift: 'positive' }),
        makeRec217(2, { emotionalShift: 'negative', suspenseDelta: -2 }),
        makeRec217(3, { emotionalShift: 'neutral', dialogueHighlights: ['b: y'], relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: -0.4 }] }),
        makeRec217(4, { emotionalShift: 'positive', dialogueHighlights: ['c: z'] }),
        makeRec217(5, { emotionalShift: 'negative', suspenseDelta: -2 }),
        makeRec217(6, { emotionalShift: 'neutral', relationshipShifts: [{ pairKey: 'a|c', dimension: 'power', amount: 0.5 }] }),
        makeRec217(7, { emotionalShift: 'positive', dialogueHighlights: ['a: w'] }),
        makeRec217(8, { emotionalShift: 'negative', dialogueHighlights: ['b: v'] }),
        makeRec217(9, { emotionalShift: 'neutral' }),
      ];
      const result = await originalityPass(makeRecInput217(records));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'SCENE_SHAPE_TEMPLATING'),
        'Should NOT fire when scenes are built from varied structural shapes',
      );
    });
  });


  describe('Wave 201 — originalityPass: simile overload, dialogue dominance, adverb oversaturation', async () => {
    const makeRec201 = (idx: number): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: ['establish_world', 'introduce_conflict', 'raise_stakes', 'revelation', 'climax', 'resolution'][idx % 6],
      dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0,
      emotionalShift: idx % 2 === 0 ? 'positive' : 'negative', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [],
      payoffSetupIds: [], visualBeats: [], relationshipShifts: [],
    });
    const origInput201 = (fountain: string, n: number) => ({
      fountain, original: fountain,
      records: Array.from({ length: n }, (_, i) => makeRec201(i)) as any,
      structure: {} as any, annotations: [], approvedSpans: [],
    });

    // ── SIMILE_OVERLOAD ───────────────────────────────────────────────────────
    it('originalityPass detects SIMILE_OVERLOAD when >25% of action lines use simile constructions', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // 12 action lines, 4 similes (33% > 25%)
      const actions = [
        'She moved like water through the crowd.',
        'He checked the lock.',
        'The light shifted like the last hour before dusk.',
        'Maria took a step back.',
        'It glittered like broken glass on the floor.',
        'John crossed to the window.',
        'She spoke like she had nowhere else to be.',
        'He opened the drawer.',
        'Papers covered the desk.',
        'She reached for the phone.',
        'He pulled on his coat.',
        'She closed the door.',
      ];
      const fountain = `INT. OFFICE - DAY\n\n${actions.join('\n')}\n`;
      const result = await originalityPass(origInput201(fountain, 2));
      const simile = result.issues.filter(i => i.rule === 'SIMILE_OVERLOAD');
      assert.ok(simile.length >= 1, `Should detect SIMILE_OVERLOAD; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(simile[0].severity === 'minor');
    });

    it('originalityPass does NOT fire SIMILE_OVERLOAD when simile density is low', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // 12 action lines, 0 similes
      const actions = [
        'She moved through the crowd.',
        'He checked the lock.',
        'The light shifted in the room.',
        'Maria took a step back.',
        'Something glittered on the floor.',
        'John crossed to the window.',
        'She chose her words carefully.',
        'He opened the drawer.',
        'Papers covered the desk.',
        'She reached for the phone.',
        'He pulled on his coat.',
        'She closed the door.',
      ];
      const fountain = `INT. OFFICE - DAY\n\n${actions.join('\n')}\n`;
      const result = await originalityPass(origInput201(fountain, 2));
      assert.ok(
        !result.issues.some(i => i.rule === 'SIMILE_OVERLOAD'),
        'Should NOT fire when fewer than 25% of action lines use simile constructions',
      );
    });

    // ── DIALOGUE_DOMINANCE ────────────────────────────────────────────────────
    it('originalityPass detects DIALOGUE_DOMINANCE when >70% of content lines are dialogue', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // 2 action lines + 14 dialogue lines = 87% dialogue > 70%
      const fountain = [
        'INT. ROOM - DAY\n\nHe waits.\n',
        'ALICE\nWe need to figure this out.\n\nBOB\nI agree completely.\n\nALICE\nSo what do we do?\n\nBOB\nI have no idea.\n\nALICE\nThen we ask for help.\n\nBOB\nFrom whom?\n\nALICE\nAnyone who will listen.\n',
        'INT. HALLWAY - DAY\n\nShe turns.\n',
        'CAROL\nDid you hear all of that?\n\nDAN\nEvery word.\n\nCAROL\nAnd what do you think?\n\nDAN\nI think we are in trouble.\n\nCAROL\nThen we need a plan.\n\nDAN\nYes. Immediately.\n\nCAROL\nThen we start now.\n',
      ].join('\n');
      const result = await originalityPass(origInput201(fountain, 2));
      const dom = result.issues.filter(i => i.rule === 'DIALOGUE_DOMINANCE');
      assert.ok(dom.length >= 1, `Should detect DIALOGUE_DOMINANCE; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(dom[0].severity === 'major');
    });

    it('originalityPass does NOT fire DIALOGUE_DOMINANCE when action is substantial', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // 12 action lines, 0 dialogue = 0% dialogue < 70%
      const actions = [
        'She walks along the path.',
        'He stops near the bench.',
        'A breeze moves through the trees.',
        'She watches him.',
        'He checks his watch.',
        'Light filters through the leaves.',
        'She approaches slowly.',
        'He turns to face her.',
        'They stand in silence.',
        'She reaches out her hand.',
        'He takes it.',
        'They walk together.',
      ];
      const fountain = `INT. PARK - DAY\n\n${actions.join('\n')}\n`;
      const result = await originalityPass(origInput201(fountain, 2));
      assert.ok(
        !result.issues.some(i => i.rule === 'DIALOGUE_DOMINANCE'),
        'Should NOT fire when action lines form the majority of content',
      );
    });

    // ── ADVERB_OVERSATURATION ─────────────────────────────────────────────────
    it('originalityPass detects ADVERB_OVERSATURATION when >20% of action lines use -ly adverbs', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // 12 action lines, 4 with -ly adverbs (33% > 20%)
      const actions = [
        'She walked slowly toward him.',
        'He opened the door.',
        'They quietly slipped through.',
        'She watched carefully from the corner.',
        'He spoke loudly in the hall.',
        'She set down the tray.',
        'He crossed to the window.',
        'She leaned on the counter.',
        'He picked up his coat.',
        'A light flickered.',
        'She reached for the folder.',
        'He checked his phone.',
      ];
      const fountain = `INT. OFFICE - DAY\n\n${actions.join('\n')}\n`;
      const result = await originalityPass(origInput201(fountain, 2));
      const adv = result.issues.filter(i => i.rule === 'ADVERB_OVERSATURATION');
      assert.ok(adv.length >= 1, `Should detect ADVERB_OVERSATURATION; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(adv[0].severity === 'minor');
    });

    it('originalityPass does NOT fire ADVERB_OVERSATURATION when adverb density is low', async () => {
      const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
      // 12 action lines, 0 adverbs
      const actions = [
        'She moved toward him.',
        'He opened the door.',
        'They slipped through.',
        'She watched from the corner.',
        'He spoke to the room.',
        'She set down the tray.',
        'He crossed to the window.',
        'She leaned on the counter.',
        'He picked up his coat.',
        'A light flickered.',
        'She reached for the folder.',
        'He checked his phone.',
      ];
      const fountain = `INT. OFFICE - DAY\n\n${actions.join('\n')}\n`;
      const result = await originalityPass(origInput201(fountain, 2));
      assert.ok(
        !result.issues.some(i => i.rule === 'ADVERB_OVERSATURATION'),
        'Should NOT fire when fewer than 20% of action lines use -ly adverbs',
      );
    });
  });


// ── Wave 118 — genre clichés in originality pass + PolarityProof/ReincorporationProof constraints ──
{
  const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
  const { proofsToConstraints } = await import('../../server/nvm/generate/proof-spec.ts');
  const { passResult, failResult } = await import('../../server/nvm/proof/contract.ts');

  const makePassInput = (fountain: string, genre?: string): import('../../server/nvm/revision/passes/types.ts').PassInput => ({
    fountain,
    original: fountain,
    annotations: [],
    structure: { actOne: 0, actTwo: 0, actThree: 0, midpoint: 0, totalScenes: 1 } as unknown as import('../../server/nvm/screenplay/structure.ts').StructureState,
    records: [],
    approvedSpans: [],
    storyContext: genre ? { genre } : undefined,
    priorPassResults: [],
  });

  describe('Wave 118 — originality pass: genre-specific clichés', () => {
    it('originality: thriller genre + "the villain monologuing their full plan" → GENRE_CLICHE', async () => {
      const fountain = 'INT. LAIR - NIGHT\nThe villain monologuing their full plan in front of everyone.\n';
      const result = await originalityPass(makePassInput(fountain, 'thriller'));
      assert.ok(result.issues.some(i => i.rule === 'GENRE_CLICHE'), 'thriller cliché detected');
    });

    it('originality: horror genre + "a cat jumping out for a fake scare" → GENRE_CLICHE', async () => {
      const fountain = 'INT. BASEMENT - NIGHT\nA cat jumping out for a fake scare startles the hero.\n';
      const result = await originalityPass(makePassInput(fountain, 'horror'));
      assert.ok(result.issues.some(i => i.rule === 'GENRE_CLICHE'), 'horror cliché detected');
    });

    it('originality: thriller genre with clean text → no GENRE_CLICHE', async () => {
      const fountain = 'INT. OFFICE - DAY\nShe slides the envelope across the desk without breaking eye contact.\n';
      const result = await originalityPass(makePassInput(fountain, 'thriller'));
      assert.ok(!result.issues.some(i => i.rule === 'GENRE_CLICHE'), 'no genre cliché in clean text');
    });

    it('originality: no genre set → no GENRE_CLICHE check', async () => {
      const fountain = 'INT. LAIR - NIGHT\nThe villain explains everything.\n';
      const result = await originalityPass(makePassInput(fountain));
      assert.ok(!result.issues.some(i => i.rule === 'GENRE_CLICHE'), 'no genre → no genre cliché check');
    });
  });

  describe('Wave 118 — proofsToConstraints: PolarityProof + ReincorporationProof', () => {
    const makeFailedProof = (proof: import('../../server/nvm/proof/contract.ts').ProofName): import('../../server/nvm/proof/contract.ts').ProofResult =>
      failResult(proof, 'test failure', [{ proof, severity: 'flag', message: 'test message' }]);

    const makeTarget = (): import('../../server/nvm/generate/proof-spec.ts').SceneTarget => ({
      sceneIdx: 3, sceneFunction: 'advance_plot', activeMechanisms: [],
      tensionTarget: 100, qualityTarget: 60,
    });

    it('proofsToConstraints: PolarityProof failure → polarity reversal constraint', () => {
      const constraints = proofsToConstraints(emptyState(), makeTarget(), [makeFailedProof('PolarityProof')]);
      assert.ok(constraints.some(c => c.description.includes('polarity reversal')),
        'PolarityProof failure → polarity reversal constraint generated');
    });

    it('proofsToConstraints: ReincorporationProof failure → prior story material constraint', () => {
      const constraints = proofsToConstraints(emptyState(), makeTarget(), [makeFailedProof('ReincorporationProof')]);
      assert.ok(constraints.some(c => c.description.includes('prior story material')),
        'ReincorporationProof failure → prior story material constraint generated');
    });
  });
}


describe('Wave 137 — originalityPass: EMOTION_NAMING_IN_ACTION', () => {

  it('EMOTION_NAMING_IN_ACTION fires when action line names an emotion directly', async () => {
    const fountain = `INT. LIVING ROOM - NIGHT

Alice was devastated by the news.

ALICE
I can't believe it.

BOB
I'm sorry.
`;
    const result = await originalityPass(makePassInput(fountain));
    assert.ok(
      result.issues.some(i => i.rule === 'EMOTION_NAMING_IN_ACTION'),
      'EMOTION_NAMING_IN_ACTION should fire for "was devastated" in action line',
    );
  });

  it('EMOTION_NAMING_IN_ACTION does NOT fire for emotion words in dialogue', async () => {
    const fountain = `INT. OFFICE - DAY

Alice opens the window.

ALICE
I was so angry when I heard that.

BOB
I understand.
`;
    const result = await originalityPass(makePassInput(fountain));
    assert.ok(
      !result.issues.some(i => i.rule === 'EMOTION_NAMING_IN_ACTION'),
      'EMOTION_NAMING_IN_ACTION should not fire for emotion words in dialogue',
    );
  });

  it('EMOTION_NAMING_IN_ACTION does NOT fire for behavioral action descriptions', async () => {
    const fountain = `INT. KITCHEN - DAY

Alice hurls the plate against the wall.

BOB
Easy—

Alice grabs the edge of the counter, knuckles white.
`;
    const result = await originalityPass(makePassInput(fountain));
    assert.ok(
      !result.issues.some(i => i.rule === 'EMOTION_NAMING_IN_ACTION'),
      'behavioral action descriptions should not trigger emotion naming rule',
    );
  });
});