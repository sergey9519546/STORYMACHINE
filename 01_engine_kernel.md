# Workstream 01 — Engine Kernel Specification (Headless Story Engine)

**Status:** Execution-ready. Implements Phase 2 of STORYMACHINE_MASTER_PLAN.md ("the engine slice, headless") on the v5 kernel laws (STORYMACHINE_VERDICT.md §5) and the settled decisions in AGENT_CONTEXT_BRIEF.md. No UI. TypeScript strict, pnpm monorepo, Zod at every boundary. No Rust/WASM, no CRDT, no differential dataflow, no speculative prefetch. Scene-hash memoization only.

**Prime laws this spec encodes:** (1) story state is derived from confirmed deltas; compiled Fountain text is canonical output, semantic structures are derived projections (dual-artifact rule). (2) AI proposes; truth requires confirmation by risk tier. (3) Epistemic model is discrete and legible. (4) The doctor is pure, versioned, golden-tested. (5) Append-only history is the dataset spine. (6) Cost is a design constraint with receipts on every AI call. (7) Official outputs carry a reconciliation stamp; high-risk operations refuse stale state.

---

## 1. Package layout, dependency graph, public APIs

Seven packages under `packages/`, published under the `@storymachine/` scope. The composition root for headless use is `createStoryEngine()` in `@storymachine/proposals`; `apps/server` and the eval harness compose the same packages. (If a facade package is ever wanted, add `@storymachine/engine` that re-exports; not required.)

```
schemas    → (zod, @noble/hashes)          # types, zod schemas, canonical JSON, hashing
receipts   → schemas                        # AI receipts, price table, cost meter
epistemic  → schemas                        # pure epistemic rules, irony, revelation paths
doctor     → schemas                        # pure rulebook + Fountain parse/serialize
state      → schemas, epistemic             # store, commit pipeline, history, snapshots, forking
proposals  → schemas, state, epistemic, receipts   # unified proposal lifecycle, tier routing, turn loop
compiler   → schemas, state, doctor, receipts      # SMUs, outline reconciliation, render, QC, artifact
```

Acyclic; verified in CI with `dependency-cruiser`. Hard rules: `schemas`, `epistemic`, `doctor` are **pure** (no IO, no `Date.now()` in any computed value — timestamps are passed in, no `Math.random`, no network). `state` does IO only through an injected `StatePersistence` adapter. `proposals`/`compiler` do LLM IO only through injected adapters; live providers (Anthropic/OpenAI) and the mock provider live in `apps/server/providers` and `packages-dev/mock-providers` respectively, so the engine itself never imports an SDK.

### 1.1 `@storymachine/schemas`

Every entity in §2 as a Zod schema + inferred type + branded ID types. Also:

```ts
export const SCHEMA_VERSION = "1.0.0";
export function canonicalJson(v: unknown): string;          // sorted keys, no whitespace, NFC strings
export function sha256Hex(s: string | Uint8Array): Sha256;  // @noble/hashes, runtime-agnostic
export function hashState(s: StoryState): Sha256;           // sha256Hex(canonicalJson(project(s)))
export function ulid(seed?: RngLike): Ulid;                 // injectable RNG for deterministic tests
export function estimateTokens(text: string): number;       // ceil(chars/4); provider tokenizers may override
```

### 1.2 `@storymachine/receipts`

```ts
export interface ReceiptSink { append(r: AIReceipt): Promise<void>; list(q: ReceiptQuery): Promise<AIReceipt[]> }
export class ReceiptLog {
  constructor(sink: ReceiptSink, prices: PriceTable, clock: () => IsoTime);
  wrap<T>(meta: ReceiptMeta, fn: (signal: AbortSignal) => Promise<ProviderResult<T>>): Promise<{ value: T; receipt: AIReceipt }>;
  sessionCost(sessionId: SessionId): Promise<CostSummary>;   // { tokensIn, tokensOut, usd, byPurpose, byBeat }
}
export class CostMeter {
  constructor(budget: CostBudget, log: ReceiptLog);
  check(est: { purpose: AiPurpose; tokensIn: number; tokensOutMax: number }): BudgetDecision; // 'ok' | 'downgrade_model' | 'refuse'
}
export const PRICE_TABLE_VERSION = "2026-08-01";  // usd per 1M tokens per model id; pinned data file
```

`wrap` times the call, hashes the prompt (`promptHash = sha256Hex(canonicalJson(promptParts))`), counts tokens from the provider response, computes USD from the pinned price table, and appends the receipt even on error (`outcome: 'error' | 'timeout' | 'schema_fail' | 'safety_block'`). **No AI call in any package may bypass `wrap`.**

### 1.3 `@storymachine/epistemic` (pure functions only)

```ts
export function deriveEpistemicOps(effect: Effect, state: StoryState, ctx: BeatCtx): EpistemicOp[];
export function applyEpistemicOp(e: EpistemicState, op: EpistemicOp): EpistemicState;
export function knowledgeOf(state: StoryState, c: CharacterId): KnowledgeSet;   // { knows: FactId[]; deceivedBy: LieId[]; suspects: {factId, level}[] }
export function hasRevelationPath(state: StoryState, c: CharacterId, f: FactId): PathResult; // { ok: true; path: BeatRef[] } | { ok: false; reason: string }
export function deriveIrony(state: StoryState): IronyEdge[];
export function suspicionSuggestions(effect: Effect, state: StoryState): Effect[]; // companion SuspectsShift proposals (never auto-committed)
export function buildEpistemicPacket(state: StoryState, sceneId: SceneId): ScenePacketEpistemics; // allowed/forbidden facts per present character
export function validateKnowledgeUse(state: StoryState, speaker: CharacterId, claims: Claim[]): Violation[];
```

### 1.4 `@storymachine/state`

```ts
export interface StatePersistence {
  appendHistory(e: HistoryEntry): Promise<void>;
  readHistory(sessionId: SessionId, fromSeq?: number, toSeq?: number): AsyncIterable<HistoryEntry>;
  putSnapshot(s: Snapshot): Promise<void>; getSnapshot(id: SnapshotId): Promise<Snapshot | null>;
  latestSnapshot(sessionId: SessionId, atOrBeforeSeq?: number): Promise<Snapshot | null>;
  putSession(s: Session): Promise<void>; getSession(id: SessionId): Promise<Session | null>;
}
export class StoryStore {
  static create(world: World, opts: CreateOpts, p: StatePersistence): Promise<StoryStore>;
  static open(sessionId: SessionId, p: StatePersistence): Promise<StoryStore>;   // snapshot + replay, verifies hash
  getState(): Readonly<StoryState>;
  head(): { seq: number; stateHash: Sha256 };
  stateAsOf(seq: number): Promise<Readonly<StoryState>>;      // snapshot + partial replay; memoized by seq
  commitDelta(d: StateDelta, ctx: CommitCtx): Promise<CommitResult>;   // §3 pipeline steps 5–9 (validation done by proposals)
  appendBeat(b: BeatInput): Promise<Beat>;
  revert(deltaId: DeltaId, ctx: CommitCtx): Promise<RevertResult>;     // snapshot + filtered replay, §3.4
  snapshot(reason: SnapshotReason): Promise<Snapshot>;
  fork(atSeq?: number): Promise<Session>;
  closeScene(sceneId: SceneId, summary: string): Promise<SceneRecord>;
  endSession(endingId: EndingId): Promise<Session>;
  verify(): Promise<{ ok: boolean; expected: Sha256; actual: Sha256 }>;
  exportDataset(opts: DatasetExportOpts): AsyncIterable<DatasetRow>;
  derived(): DerivedProjections;  // irony edges, endingReadiness, ledgers; memoized by stateHash
}
```

All mutating methods serialize through an in-process per-session async mutex (single-writer law). `packages-dev/persistence-memory` ships an in-memory adapter for tests; `apps/server` implements Postgres/Drizzle.

### 1.5 `@storymachine/proposals`

```ts
export interface IntentParserAdapter { parse(req: ParseRequest, signal: AbortSignal): Promise<ProviderResult<ParsedIntent>> }
export interface DramatizerAdapter  { dramatize(packet: ScenePacket, signal: AbortSignal): AsyncIterable<StreamChunk> } // last chunk carries usage
export interface FastGateAdapter    { extractClaims(text: string, cast: CastRef[], signal: AbortSignal): Promise<ProviderResult<Claim[]>> }

export function createStoryEngine(deps: EngineDeps): StoryEngine;
export interface EngineDeps { store: StoryStore; parser: IntentParserAdapter; dramatizer: DramatizerAdapter;
  gate: FastGateAdapter; receipts: ReceiptLog; meter: CostMeter; policy?: Partial<TierPolicy>; clock: () => IsoTime }

export interface StoryEngine {
  submitInput(input: PlayerInput): Promise<TurnResult>;       // full loop of §3.1; may return a StagedInterrupt
  confirm(proposalId: ProposalId, edits?: EffectEdit[]): Promise<CommitResult>;  // C-tier (and B in confirm mode)
  reject(proposalId: ProposalId, reason?: string): Promise<void>;
  revert(deltaId: DeltaId): Promise<RevertResult>;            // A/B revert window
  directorTick(): Promise<DirectorResult>;                    // convergence steering + ending proposals (§5)
  pending(): Proposal[];
  lens(): StoryLensView;                                      // read-only projection for the UI layer
}
export type TurnResult = { beat?: Beat; cards: DeltaCard[]; staged?: StagedInterrupt; regenerated: boolean;
  warnings: Violation[]; cost: { tokensIn: number; tokensOut: number; usd: number } };
```

### 1.6 `@storymachine/doctor` (pure, sync)

```ts
export const RULEBOOK_VERSION = "1.0.0";
export function parseFountain(text: string): ParsedScript;
export function serializeFountain(s: ParsedScript): string;
export function runDoctor(input: DoctorInput): DoctorReport;   // deterministic; stable ordering
export interface DoctorInput { script: ParsedScript; stateRef: StateReference; calibration: CalibrationManifest;
  mode: 'compile_qc' | 'benchmark' }
export function scoreBenchmark(reports: DoctorReport[], meta: RunMeta): BenchmarkScores; // contradiction, leak, payoff, deflation, voice-bleed, slop-density
```

`StateReference` carries: final `StoryState`, per-scene `asOf` knowledge sets (precomputed by caller from `stateAsOf`), ledgers, cast with death seqs, kept-line manifest. The doctor **never** touches a store.

### 1.7 `@storymachine/compiler`

```ts
export interface RenderAdapter { renderScene(req: SceneRenderRequest, signal: AbortSignal): Promise<ProviderResult<SceneRenderResult>> }
export class Compiler {
  constructor(deps: { store: StoryStore; doctor: typeof runDoctor; parse: typeof parseFountain;
    render: RenderAdapter; receipts: ReceiptLog; clock: () => IsoTime });
  reconcile(): Promise<ReconciliationStatus>;
  buildSMUs(): Promise<SceneMemoryUnit[]>;                    // deterministic; exposed for goldens
  compile(opts: CompileOptions): Promise<CompileResult>;      // { artifact: CompiledArtifact } | { error: StaleStateError | DoctorGateError }
}
export type CompileOptions = { mode: 'final' | 'preview'; targets: ('screenplay_fountain' | 'episode_json')[]; title?: string };
export class MockRenderAdapter implements RenderAdapter {}    // deterministic template renderer, ships in-package
```

---

## 2. Data model (Zod/TypeScript)

All entities carry `schemaVersion: SCHEMA_VERSION`. IDs are ULIDs branded per entity (`z.string().regex(ULID_RE).brand<'SessionId'>()` etc.). `IsoTime` = `z.string().datetime()`. `Sha256` = 64 lowercase hex. Small integers over floats everywhere (legibility law); the **only scalar in [0,1]** permitted in state is `suspects.level` and the derived readiness score. Below, schemas are shown as inferred types for brevity; each has a matching `XSchema` Zod object and is exported from `@storymachine/schemas`.

```ts
// ---- World & Session -------------------------------------------------------
interface World { id: WorldId; schemaVersion: string; title: string; logline: string; genre: string;
  toneTags: string[]; contentRating: 'teen' | 'mature'; licensing: 'original' | 'user_created';
  locations: { id: LocationId; name: string; description: string }[];
  castSeeds: CharacterSeed[];                       // becomes Characters at session create
  seedFacts: { prop: string; subjectRefs: string[]; visibility: FactVisibility; concealFromAudience?: boolean; leakPhrases: string[] }[];
  seedSecrets: SecretSeed[]; seedConflicts: ConflictSeed[];
  endings: EndingSpec[];                            // alpha: exactly 3
  targetBeats: { min: number; max: number };        // convergence band, e.g. { min: 28, max: 60 }
  exemplarRefs: ExemplarRef[];                      // licensing-clean corpus ids only; content resolved app-side
  version: string }

interface EndingSpec { id: EndingId; title: string; flavor: 'triumphant' | 'tragic' | 'bittersweet' | 'ambiguous' | 'pyrrhic';
  hardRequirements: EndingPredicate[];              // ALL must hold
  intentionallyOpenQuestionIds?: QuestionId[];      // exempt from D-08
  renderNotes: string }                             // constraints for the final beats
type EndingPredicate =
  | { kind: 'secret_revealed'; secretId: SecretId; toCharacterId?: CharacterId }
  | { kind: 'lie_exposed' | 'lie_confessed'; lieId: LieId }
  | { kind: 'character_dead' | 'character_alive'; characterId: CharacterId }
  | { kind: 'conflict_resolved'; conflictId: ConflictId }
  | { kind: 'promise_kept' | 'promise_broken'; promiseId: PromiseId }
  | { kind: 'setup_paid'; setupId: SetupId }
  | { kind: 'flag'; key: string; value: boolean };  // world-defined boolean flags via SetFlag effect

interface Session { id: SessionId; worldId: WorldId; title: string; mode: 'character' | 'director';
  playerCharacterId?: CharacterId; status: 'active' | 'ended' | 'abandoned';
  parentSessionId?: SessionId; forkedAtSeq?: number;
  headSeq: number; stateHash: Sha256; seed: string;                  // seed drives ulid()/tie-breaks in tests
  budget: CostBudget; endingId?: EndingId; createdAt: IsoTime; endedAt?: IsoTime; schemaVersion: string }

interface CostBudget { perBeat: { parseIn: 1200; parseOut: 300; dramatizeIn: 6000; dramatizeOut: 900; gateIn: 1500; gateOut: 200 };
  perSceneSummary: { in: 2000; out: 150 }; compilePerScene: { in: 4000; out: 1200 }; sessionUsdCap: number } // numbers = defaults, all overridable

// ---- Characters & relationships -------------------------------------------
interface VoiceCard { registers: string[]; rhythm: string; vocabulary: string; tics: string[];
  forbiddenMoves: string[];                          // e.g. "never apologizes directly", "no therapy-speak"
  exampleLines: string[] }                           // ≤5; serialized card must be ≤800 tokens (validated)
interface Character { id: CharacterId; sessionId: SessionId; name: string; pronouns: string;
  role: 'player' | 'lead' | 'support'; status: 'alive' | 'dead' | 'departed'; diedAtSeq?: number;
  want: string;                                      // conscious external goal
  need: string;                                      // unconscious internal requirement
  lie: string;                                       // the false self-belief driving the arc (craft "Lie"; distinct from the Lie entity = spoken deception)
  ghost: string;                                     // backstory wound feeding the lie
  voiceCard: VoiceCard; schemaVersion: string }
interface Relationship { id: RelationshipId; from: CharacterId; to: CharacterId;   // DIRECTED; trust is asymmetric
  trust: number;   // integer −3..3
  tension: number; // integer 0..3
  bond: string;    // label: "brothers", "handler/asset", …
  updatedAtSeq: number }

// ---- Truth layer -----------------------------------------------------------
type FactVisibility = 'world' | 'privileged';        // world = public once dramatized; privileged = needs a revelation path
interface Fact { id: FactId; sessionId: SessionId; prop: string;   // canonical present-tense proposition, ≤140 chars
  subjectIds: (CharacterId | ObjectId | LocationId)[]; visibility: FactVisibility;
  audienceKnown: boolean; concealFromAudience: boolean; leakPhrases: string[];  // normalized phrases for D-02
  establishedInBeat: BeatId; establishedAtSeq: number; tags: string[] }

// Discrete epistemic model (brief §4). `unaware` is the ABSENCE of a row — never materialized.
type Belief =
  | { id: BeliefId; characterId: CharacterId; kind: 'knows';          factId: FactId;                       sinceSeq: number; sourceBeatId: BeatId }
  | { id: BeliefId; characterId: CharacterId; kind: 'believes_false'; lieId: LieId;                          sinceSeq: number; sourceBeatId: BeatId }
  | { id: BeliefId; characterId: CharacterId; kind: 'suspects';       factId: FactId; level: number;         sinceSeq: number; sourceBeatId: BeatId }; // level ∈ [0,1], step 0.25
interface AudienceEntry { id: AudienceId; target: { factId: FactId } | { lieId: LieId } | { secretId: SecretId };
  sinceBeatId: BeatId; sinceSeq: number }            // audience_knows(P, since); append-only ledger

interface Secret { id: SecretId; sessionId: SessionId; factId: FactId; holderIds: CharacterId[];
  stakes: string; status: 'hidden' | 'partially_revealed' | 'revealed' | 'burned'; revealedInBeat?: BeatId }
  // NOTE: "who knows the secret" is DERIVED from Belief rows, never stored (dual-artifact rule).
interface Lie { id: LieId; sessionId: SessionId; liarId: CharacterId; targetIds: CharacterId[];
  falseProp: string; contradictsFactId: FactId; toldInBeat: BeatId;
  status: 'active' | 'believed' | 'doubted' | 'exposed' | 'confessed'; exposure?: { beatId: BeatId; byCharacterId: CharacterId } }
interface Promise { id: PromiseId; byId: CharacterId; toId: CharacterId; content: string; madeInBeat: BeatId;
  dueCondition?: string; status: 'open' | 'kept' | 'broken' | 'released'; resolvedInBeat?: BeatId }
interface Conflict { id: ConflictId; parties: CharacterId[]; axis: string; stakes: string;
  pressure: number;  // integer 0..5
  status: 'latent' | 'open' | 'peak' | 'resolved' | 'deflated'; resolution?: string;
  openedInBeat?: BeatId; resolvedInBeat?: BeatId }
interface SetupPayoff { id: SetupId; kind: 'chekhov_object' | 'information' | 'skill' | 'promise' | 'image' | 'line';
  description: string; setupBeatId: BeatId; reinforcedBeats: BeatId[]; payoffBeatId?: BeatId;
  requiredForEndings: EndingId[]; status: 'planted' | 'reinforced' | 'paid' | 'abandoned'; abandonReason?: string }
interface NarrativeQuestion { id: QuestionId; question: string; scale: 'scene' | 'arc' | 'story';
  raisedInBeat: BeatId; status: 'open' | 'intensified' | 'answered' | 'abandoned'; answeredInBeat?: BeatId;
  boundTo?: { secretId?: SecretId; lieId?: LieId; conflictId?: ConflictId } }
interface StoryObject { id: ObjectId; name: string; holder: { characterId: CharacterId } | { locationId: LocationId };
  significance: string; setupId?: SetupId }

// ---- Play layer ------------------------------------------------------------
interface SceneRecord { id: SceneId; sessionId: SessionId; index: number;
  slugline: string;                                  // "INT. HOSPITAL STAIRWELL - NIGHT"
  locationId: LocationId; timeLabel: string; presentCharacterIds: CharacterId[];
  objectives: { characterId: CharacterId; visible: string; hidden?: string }[];
  sceneQuestion: string; exitCondition: string;
  functionTags: ('reveal' | 'bond' | 'escalate' | 'setup' | 'payoff' | 'pivot' | 'connective' | 'ending')[];
  pressureStart: number; pressureEnd?: number;       // 0..5
  enteredAtSeq: number; exitedAtSeq?: number; beatIds: BeatId[];
  summary?: string }                                 // Scene Memory Unit text, ~100 tokens, written at closeScene

interface Beat { id: BeatId; sceneId: SceneId; index: number; seq: number;
  kind: 'player_action' | 'player_dialogue' | 'director_command' | 'ai_beat' | 'system';
  playerInputRaw?: { text: string; untrusted: true };            // quarantined; never interpolated unfenced
  dramatizedText: string; textHash: Sha256;                       // IMMUTABLE once committed (dual-artifact source)
  keptLineSpans: { from: number; to: number }[];                  // verbatim-preserve spans for compile (C/B moments)
  deltasApplied: DeltaId[]; receiptIds: ReceiptId[];
  cost: { tokensIn: number; tokensOut: number }; createdAt: IsoTime }

// ---- Causal action vocabulary ---------------------------------------------
type Effect =
  | { op: 'EstablishFact'; prop: string; subjectIds: string[]; visibility: FactVisibility; concealFromAudience?: boolean; leakPhrases: string[] }
  | { op: 'LieTo'; liarId: CharacterId; targetIds: CharacterId[]; falseProp: string; contradictsFactId: FactId }
  | { op: 'RevealSecret'; secretId: SecretId; toCharacterIds: CharacterId[];
      method: 'confession' | 'discovery' | 'overheard' | 'evidence' | 'deduction' }
  | { op: 'ConfessTruth'; byId: CharacterId; lieId: LieId; toIds: CharacterId[] }
  | { op: 'ExposeLie'; lieId: LieId; byId: CharacterId; toIds: CharacterId[]; evidenceFactId?: FactId }
  | { op: 'Betray'; byId: CharacterId; victimId: CharacterId; description: string; breaksPromiseId?: PromiseId; revealsSecretId?: SecretId }
  | { op: 'MakePromise'; byId: CharacterId; toId: CharacterId; content: string; dueCondition?: string }
  | { op: 'BreakPromise'; promiseId: PromiseId; byId: CharacterId }
  | { op: 'KeepPromise'; promiseId: PromiseId }
  | { op: 'Threaten'; byId: CharacterId; targetId: CharacterId; content: string; conflictId?: ConflictId }
  | { op: 'GiveObject'; objectId: ObjectId; fromId: CharacterId; toId: CharacterId }
  | { op: 'MoveObject'; objectId: ObjectId; toLocationId: LocationId }
  | { op: 'TravelTo'; characterIds: CharacterId[]; locationId: LocationId }
  | { op: 'Kill'; victimId: CharacterId; byId?: CharacterId; means?: string; witnessedBy: CharacterId[] }
  | { op: 'Depart'; characterId: CharacterId; reason: string }
  | { op: 'AdjustRelationship'; from: CharacterId; to: CharacterId; trustDelta: number; tensionDelta: number; reason: string }
  | { op: 'OpenConflict'; parties: CharacterId[]; axis: string; stakes: string; pressure: number }
  | { op: 'EscalateConflict'; conflictId: ConflictId; toPressure: number }
  | { op: 'ResolveConflict'; conflictId: ConflictId; resolution: string }
  | { op: 'PlantSetup'; kind: SetupPayoff['kind']; description: string; requiredForEndings: EndingId[] }
  | { op: 'ReinforceSetup'; setupId: SetupId }
  | { op: 'PayoffSetup'; setupId: SetupId; how: string }
  | { op: 'AbandonSetup'; setupId: SetupId; reason: string }
  | { op: 'RaiseQuestion'; question: string; scale: NarrativeQuestion['scale']; boundTo?: NarrativeQuestion['boundTo'] }
  | { op: 'AnswerQuestion'; questionId: QuestionId; answer: string }
  | { op: 'AudienceLearn'; target: AudienceEntry['target'] }
  | { op: 'SuspectsShift'; characterId: CharacterId; factId: FactId; toLevel: number }   // step 0.25, clamp [0,1]
  | { op: 'SetFlag'; key: string; value: boolean }
  | { op: 'SceneTransition'; slugline: string; locationId: LocationId; timeLabel: string; presentCharacterIds: CharacterId[] }
  | { op: 'EndingTrigger'; endingId: EndingId }
  | { op: 'NoteContinuity'; text: string };

interface StateDelta { id: DeltaId; sessionId: SessionId; beatId?: BeatId; effects: Effect[];
  tier: 'A' | 'B' | 'C';                              // max of routeTier(effect) over effects
  source: 'intent_parser' | 'director_ai' | 'player_explicit' | 'system';
  proposalId: ProposalId; createdAt: IsoTime; schemaVersion: string }

interface DeltaCard { id: CardId; deltaId: DeltaId; tier: 'A' | 'B' | 'C'; title: string; summary: string;
  effects: Effect[];                                  // denormalized for display/dataset
  status: 'pending' | 'auto_committed' | 'confirmed' | 'edited_confirmed' | 'rejected' | 'reverted' | 'expired';
  stagedPrompt?: string;                              // C-tier dramatic copy: "This can't be undone. Do it?"
  revertibleUntilSeq?: number;                        // A/B revert window (default: scene close)
  provenance: { proposalId: ProposalId; receiptId?: ReceiptId } }

// ---- Proposal (unified lifecycle for ALL AI output) ------------------------
interface Proposal { id: ProposalId; sessionId: SessionId;
  kind: 'state_delta' | 'beat_dramatization' | 'scene_summary' | 'outline_update' | 'compile_render' | 'repair';
  payload: { deltas?: StateDelta[]; text?: string; summary?: string };
  inputHash: Sha256;                                  // hash of player input / packet that produced it
  constraintsHash: Sha256;                            // hash of scene packet used (reproducibility)
  status: 'generated' | 'invalid' | 'routed' | 'presented' | 'committed' | 'rejected' | 'superseded' | 'expired';
  validation?: { schemaOk: boolean; preconditionsOk: boolean; epistemicViolations: Violation[];
    safetyOk: boolean; styleFlags: string[] };
  repairOf?: ProposalId;                              // ONE bounded regenerate: repairOf chains have length ≤ 1
  receiptId?: ReceiptId; createdAt: IsoTime; resolvedAtSeq?: number }

// ---- Assurance layer -------------------------------------------------------
interface AIReceipt { id: ReceiptId; sessionId: SessionId; beatId?: BeatId;
  purpose: 'intent_parse' | 'dramatize' | 'fast_gate' | 'scene_summary' | 'director' | 'compile_render' | 'advisory_score';
  provider: string; model: string; promptTemplateId: string; promptTemplateVersion: string; promptHash: Sha256;
  contextBreakdown: { permanentTokens: number; windowTokens: number; archiveTokens: number };
  temperature: number; topP?: number; seed?: string; maxTokens: number;
  tokensIn: number; tokensOut: number; usd: number; priceTableVersion: string; latencyMs: number;
  outcome: 'ok' | 'schema_fail' | 'safety_block' | 'timeout' | 'error'; retryOf?: ReceiptId; createdAt: IsoTime }

interface Snapshot { id: SnapshotId; sessionId: SessionId; atSeq: number; stateHash: Sha256;
  state: StoryState;                                  // full materialized state (gzip in persistence adapter)
  reason: 'pre_batch' | 'scene_close' | 'pre_compile' | 'fork' | 'interval' | 'manual'; createdAt: IsoTime }

interface HistoryEntry { id: HistoryId; sessionId: SessionId; seq: number;   // per-session, strictly monotonic
  kind: 'delta_committed' | 'delta_reverted' | 'proposal_rejected' | 'proposal_edited' | 'beat_committed'
      | 'scene_closed' | 'snapshot' | 'session_forked' | 'ending' | 'compile';
  refs: { deltaId?: DeltaId; beatId?: BeatId; proposalId?: ProposalId; snapshotId?: SnapshotId; artifactId?: ArtifactId };
  actor: 'player' | 'engine' | 'director_ai' | 'system';
  payload: unknown;                                   // denormalized copy of the committed object (self-contained export)
  stateHashAfter: Sha256; createdAt: IsoTime }

// Dataset export row (the spine's product form; JSONL)
interface DatasetRow { sessionRef: Sha256;            // salted hash of sessionId (anonymized)
  seq: number; decisionKind: 'delta_tier_A' | 'delta_tier_B' | 'delta_tier_C' | 'beat_keep' | 'revert' | 'ending';
  statePacket: ScenePacket;                           // three-tier context AT decision time (ground truth)
  candidates: { payload: unknown; chosen: boolean; editDistance?: number }[];  // accepted + rejected/superseded proposals
  tier?: 'A' | 'B' | 'C'; latencyMs?: number; cost?: { tokensIn: number; tokensOut: number };
  engineVersion: string; worldId: WorldId }

// ---- Anchors (content-addressed, quarantine — v3 §7.2 kept) ----------------
interface Anchor { id: AnchorId; kind: 'beat' | 'scene' | 'span' | 'artifact_span';
  beatId?: BeatId; sceneId?: SceneId; artifactId?: ArtifactId;
  contentHash: Sha256;                                // sha256 of normalized target text (NFC, collapse ws, casefold)
  fuzzy: { prefix: string; exact: string; suffix: string };   // text-fragment style, prefix/suffix ≤ 32 chars
  range: { from: number; to: number };
  resolution?: 'exact_hash' | 'scene_local_hash' | 'fuzzy' | 'positional' | 'quarantined';
  createdAt: IsoTime }
// Resolution ladder (resolveAnchor(anchor, doc): Resolved | Quarantined):
//   1. exact contentHash match anywhere in target doc scope
//   2. scene-local block hash match (same scene, any position)
//   3. fuzzy: locate `exact` with prefix/suffix disambiguation, Levenshtein tolerance ≤ 10% of span length
//   4. positional fallback: original range if surrounding 64 chars ≥ 0.8 token-set similarity
//   5. QUARANTINE — never silently drop; quarantined anchors are listed in the continuity report.

// ---- Compile layer ---------------------------------------------------------
type ReconciliationStatus = { status: 'reconciled' | 'partially_reconciled' | 'drift_detected';
  checkedAtSeq: number; headSeqAtCheck: number; stalenessSeqs: number;
  findings: { kind: 'hash_mismatch' | 'pending_c_tier' | 'unclosed_scene' | 'quarantined_anchor' | 'mid_session_preview';
    ref?: string; detail: string }[] };

interface CompiledArtifact { id: ArtifactId; sessionId: SessionId; atSeq: number;
  kind: 'screenplay_fountain' | 'episode_json'; title: string;
  fountainText?: string; episodeJson?: EpisodeJson; contentHash: Sha256;
  doctorReport: DoctorReport; doctorGate: 'passed' | 'passed_with_warnings' | 'failed';
  reconciliation: ReconciliationStatus;
  continuityReport: { unresolvedSetups: SetupId[]; openQuestions: QuestionId[];
    finalBeliefMap: { characterId: CharacterId; knows: FactId[]; deceivedBy: LieId[]; suspects: { factId: FactId; level: number }[] }[];
    secretsNeverFound: SecretId[]; liesNeverExposed: LieId[]; ironyUnplayed: IronyEdge[]; quarantinedAnchors: AnchorId[] };
  stats: { scenes: number; beats: number; cTierCount: number; tokensSpent: number; usd: number; estRuntimeMin: number };
  endingId?: EndingId; receiptIds: ReceiptId[]; rulebookVersion: string; engineVersion: string; createdAt: IsoTime }
```

`StoryState` is the materialized aggregate: `{ session, characters, relationships, facts, beliefs, audienceLedger, secrets, lies, promises, conflicts, setups, questions, objects, scenes, beatsIndex, flags, currentSceneId }`. It is always reconstructible from `Snapshot + HistoryEntry` replay; `hashState` covers a stable projection excluding timestamps and receipts.

---

## 3. State commit semantics

### 3.1 The turn transaction (proposal → validation → tier routing → commit → history append)

`StoryEngine.submitInput` executes, under the session mutex:

1. **Ingest.** Wrap `playerInputRaw` as untrusted. Build `ParseRequest` = input + scene packet header (present cast, live entity ids, epistemic packet, effect vocabulary JSON-schema). Call `parser.parse` via `receipts.wrap` (cheap model). Result: `ParsedIntent { deltas: StateDelta[], sceneIntent }` → `Proposal(kind:'state_delta', status:'generated')`.
2. **Schema validation.** `StateDeltaSchema.parse`. Fail → one bounded repair: re-call parser with the Zod error text appended (`repairOf` set). Second failure → `status:'invalid'`, turn returns a typed `ParseFailure` (caller re-prompts the player); history records the rejected proposal (dataset value).
3. **Precondition validation.** For each effect, pure `checkPreconditions(effect, state)` per the table in §3.2. Any violation → same single-repair path with violations serialized into the retry prompt.
4. **Epistemic validation.** For knowledge-bearing effects, `hasRevelationPath` and lie/secret integrity checks (INV-2, INV-5, INV-6). Same repair path.
5. **Tier routing.** Pure `routeTier(effect, state, policy): 'A'|'B'|'C'`; delta tier = max over effects. Defaults (world/policy may promote, never demote C):
   - **C (staged interrupt, rare by design):** `Kill`, `EndingTrigger`, `RevealSecret` of a seeded/core secret to any character, `ExposeLie`/`ConfessTruth` on a core lie, `Betray`, `LieTo` that *creates* a tracked core lie, `BreakPromise` where the promise is bound to an ending predicate.
   - **B (commit + highlight, one-tap revert):** `MakePromise`, `BreakPromise` (non-ending), `OpenConflict`, `ResolveConflict`, `PayoffSetup`, `AnswerQuestion(scale:'story')`, `Depart`, `AbandonSetup`, `AdjustRelationship` with `|trustDelta|≥2`, `SuspectsShift` crossing 0.75, `RevealSecret` of a minor secret.
   - **A (auto-commit, ticker, revertible):** everything else — `EstablishFact`, `PlantSetup`, `ReinforceSetup`, `RaiseQuestion`, `EscalateConflict` (+1), `AdjustRelationship` (±1), `GiveObject`/`MoveObject`/`TravelTo`, `SceneTransition`, `AudienceLearn`, `SetFlag`, `NoteContinuity`, small `SuspectsShift`.
6. **Commit by tier.** A and B: `store.commitDelta` immediately (`DeltaCard.status = 'auto_committed'`, B cards flagged `tier:'B'` for the UI highlight; both get `revertibleUntilSeq` = scene close). C: proposal → `status:'presented'`, a `StagedInterrupt { card, stagedPrompt }` is returned, **no state changes**, dramatization pauses at the staged moment. INV-10: at most one pending C per session; a new C while one is pending → `supersede` the older (recorded). `confirm(proposalId, edits?)` re-validates against the *current* head (state may have moved), applies edits (`edited_confirmed`), then commits; `reject` records and the engine re-plans the beat.
7. **Apply.** Inside `commitDelta`, effects apply in array order through pure reducers `applyEffect(state, effect, ctx) → state'` (immutable structural sharing). Each effect then expands via `deriveEpistemicOps` (§4) and those ops apply via `applyEpistemicOp`. The whole delta is one atomic transition: any reducer throw aborts with no partial state.
8. **History append.** One `HistoryEntry(kind:'delta_committed')` per delta with `stateHashAfter`, then `beat_committed` when the dramatized text finishes streaming (beat text immutable from that moment; `textHash` recorded). Every rejected/superseded proposal also appends (`proposal_rejected`) — the dataset needs the negatives.
9. **Post-commit derivations** (pure, memoized by `stateHash`): irony set, per-ending readiness, open ledgers, conflict pressure aggregate. These feed the next scene packet and `directorTick`.
10. **Dramatize.** Build `ScenePacket` (§4.4), stream from the strong model. **Fast post-generation gate:** `gate.extractClaims` (cheap model) → `validateKnowledgeUse` (deterministic) + phrase-level leak scan + dead-speaker scan + banned-phrase advisory. Egregious violation (leak/contradiction) → ONE bounded regenerate with the violation injected as a hard constraint; second failure → beat is rejected, a minimal safe narration fallback is emitted, and the incident is logged to the dataset (never shown as UI nagging).

### 3.2 Preconditions and invariants

Violations are typed: `{ code, effectIndex, message, evidence }`. Enforced invariants:

| ID | Invariant | Enforcement |
|---|---|---|
| INV-1 | **No dead character acts.** Any effect whose agent/target-of-knowledge has `status != 'alive'` is rejected (`Kill.victimId` must be alive; corpses may be *referenced* in props but never act, speak, or receive knowledge — dead characters' belief rows are frozen). No flashbacks in v1 (documented extension: `timeLabel: FLASHBACK` scenes pinned to `frozenAtSeq`). |
| INV-2 | **No knowledge without a revelation path.** Any op granting `knows(c,f)` must originate from: presence at a `world`-visibility establishing beat; being a target of `RevealSecret`/`ConfessTruth`/`ExposeLie`; membership in `witnessedBy`; or `method:'deduction'` citing premise facts the character already knows. Checked by `hasRevelationPath` at commit AND by the fast gate on rendered text. |
| INV-3 | **No payoff without setup.** `PayoffSetup` requires setup `planted|reinforced`; `AnswerQuestion` requires `open|intensified`; `KeepPromise`/`BreakPromise` require `open`. |
| INV-4 | **Ending requires readiness.** `EndingTrigger(e)` requires all `hardRequirements` satisfied AND `readiness(e) ≥ θ_end (0.70)`. Failure returns the missing-list (the director uses it to steer; see §5). |
| INV-5 | **Lie integrity.** `LieTo` requires `contradictsFactId` to exist and the liar to know or suspect(≥0.5) the truth (else it is an honest error → model as belief, not Lie). `ExposeLie` requires lie `active|believed|doubted` and exposer knows the contradicting fact. |
| INV-6 | **Secret integrity.** `RevealSecret` requires revealer ∈ holders or `knows(revealer, secret.factId)`; targets not already knowing. |
| INV-7 | **Monotone spine.** `seq` strictly increases; history is append-only; committed beat text and committed deltas are immutable (corrections are new entries). |
| INV-8 | **Object conservation.** `GiveObject` requires `fromId` currently holds; `MoveObject` requires object exists. |
| INV-9 | **Scene discipline.** Non-`SceneTransition` effects require an open scene; agents of dialogue/action effects must be in `presentCharacterIds` (or the effect carries an explicit `offscreen: true` marker → auto-`AudienceLearn` semantics). |
| INV-10 | **Single staged interrupt** per session at a time. |

A pure `checkInvariants(state): Violation[]` runs the full set against materialized state after every commit in dev/test builds (property tests, §8) and is sampled in production telemetry.

### 3.3 Undo / revert

Uniform mechanism — **snapshot + filtered replay** (no per-effect inverse code to maintain): `revert(deltaId)` asserts the delta is within its revert window (`revertibleUntilSeq`), loads the nearest snapshot ≤ delta.seq, replays all committed deltas except the reverted one (and except any later delta that *depends* on it — dependency = later effect referencing an entity the reverted delta created; dependents are reported and refused unless `cascade: true`), verifies invariants, swaps the materialized state, and appends `delta_reverted` (history never shrinks; the dataset keeps both branches of the decision). **C-tier deltas are never revertible after commit** — irreversibility is the product mechanic; the escape hatch is `fork` (§3.4). Cost note: at alpha scale (≤ ~300 deltas/session, snapshots every 25) a revert replays ≤ 25 deltas — microseconds.

### 3.4 Branching / forking

`fork(atSeq?)` creates a child `Session { parentSessionId, forkedAtSeq }`: nearest snapshot ≤ atSeq + replay to atSeq → child snapshot at child seq 0. Child history starts empty (parent referenced, never copied). Forks serve: pre-C-tier "what if", multiple-ending collection, and OASIS-style what-if projection later (a feature, not an engine). Replays of a world are new sessions, not forks. Ending collection across sessions/forks is aggregated app-side per (worldId, player).

Snapshots are taken: before any batch mutation (multi-delta commit from one parse, compile, fork), at every `closeScene`, every 25 deltas, and on demand. `verify()` recomputes hash from snapshot+replay; mismatch ⇒ `drift_detected` and the session is flagged (compile in final mode refuses; see §6).

---

## 4. Epistemic engine

State per brief §4, exactly: `fact(P)`, `knows(C,P)`, `believes_false(C,P,source)`, `suspects(C,P, level∈[0,1])`, `unaware(C,P)` (absence of row), `audience_knows(P)`. No Bayesian tensors; the single scalar is `suspects.level`, quantized to steps of 0.25.

### 4.1 Update rules per action type (`deriveEpistemicOps`)

| Effect | Epistemic consequence (ops) |
|---|---|
| `EstablishFact` (dramatized in beat) | `knows(c, F)` ∀ c present in scene; `audience_knows(F)` unless `concealFromAudience` |
| `EstablishFact` (`privileged`) | `knows` only for characters the effect explicitly lists via subjects present; audience per flag |
| `LieTo` | ∀ target t: if `knows(t, contradictsFact)` → `suspects(t, contradictsFact, +0.5)` and lie status `doubted` (caught-in-real-time; surfaced as a director opportunity); else `believes_false(t, L)`; `audience_knows(L is a lie)` when dramatized (default true) |
| `RevealSecret` | `knows(t, secret.factId)` ∀ targets (with path recorded); delete `believes_false` rows contradicted by the fact; contradicted lies → `doubted`; secret → `partially_revealed` or `revealed` (all living non-holder leads know); `audience_knows(secret)` |
| `ConfessTruth` / `ExposeLie` | `knows(t, lie.contradictsFactId)` ∀ targets; lie → `confessed`/`exposed` + `exposure` set; deceived rows for those targets removed. Relationship fallout is **not** automatic — the parser proposes companion `AdjustRelationship` effects (legibility law) |
| `Betray` | no intrinsic knowledge change; if `revealsSecretId` → full `RevealSecret` semantics; if `breaksPromiseId` → promise `broken` |
| `Kill` | `knows(w, "victim dead" fact)` ∀ `witnessedBy` + audience (auto-`EstablishFact` of the death, `leakPhrases: [victim name + "dead"...]`); victim's belief rows frozen (INV-1) |
| `SuspectsShift` | set `suspects(c, F, toLevel)` clamped/quantized. Level 1.0 does **not** auto-convert to `knows` — conversion requires an explicit reveal/discovery/deduction effect (truth stays human-confirmed) |
| `AudienceLearn` | append `AudienceEntry` only |
| `Threaten`, promises, objects, travel, conflicts, setups, questions | no epistemic ops (state-layer only), except that all participants of a dramatized beat trivially `knows` the *public facts of the beat itself* if it establishes any |

### 4.2 Suspicion escalation (deterministic suggestions, never silent commits)

`suspicionSuggestions(effect, state)` returns companion `SuspectsShift` effects the parser attaches to its proposal (they ride the same tier routing): witnessing an event contradicting a believed lie **+0.25**; hearsay from a character who `knows` **+0.25**; encountering physical evidence (an `EstablishFact` whose subjects include the fact under suspicion, character present) **+0.50**; direct confession → reveal, not suspicion. No decay (stories are 30–90 min). Crossing 0.75 routes as B-tier and emits the derived event `on_the_verge` for the director.

### 4.3 Dramatic irony and the audience ledger

The audience ledger (`AudienceEntry[]`, append-only, `since` provenance) is the superset camera-truth. Derived each commit:

```
irony = { (c, P) | audience_knows(P) ∧ ¬knows(c, P) ∧ alive(c) ∧ relevant(P, c) }
relevant(P,c): P.subjectIds ∋ c, or P contradicts a believes_false(c,·), or P is the fact of a secret/lie/promise touching c
IronyEdge = { characterId, factId, sinceSeq, sustainedBeats, intensity: sustainedBeats × stakesWeight(P) }
```

Irony is surfaced to the director ("play the gap") and to the compiler's story-lens glimpses; it is never auto-acted on. `ironyUnplayed` (edges never referenced in any scene where the unaware character is present) lands in the continuity report and doctor rule D-14.

### 4.4 Revelation-path validation and the leak wall

Two layers, per settled decision 3:

1. **Structural prevention (deterministic, prompt-build time).** `buildEpistemicPacket(state, sceneId)` computes, per present character: `allowedFacts` (props + ids they know), `activeDeceptions` (lies they currently believe, phrased as what they *think* is true), `suspicions` with levels, and `forbiddenFacts` — every scene-relevant fact they have no path to, rendered as explicit "MUST NOT reference or imply" lines. The dramatizer prompt is *constructed* from these; the scene packet also carries permanent card (≤800 tokens), active window (current scene beats + previous scene tail, 3–5k), and archive (scene summaries ~100 tokens/scene). Untrusted spans (`playerInputRaw`, exemplar text) are fenced in delimiter tags with a no-instruction-following rubric and the render adapters expose **no tools**.
2. **Fast post-generation gate.** Claim extraction is LLM-based (cheap model, receipted, advisory *extraction*); the *check* is deterministic: each claim `{speakerId, aboutFactId?, phrase}` runs `hasRevelationPath`; plus deterministic phrase scan (fact `leakPhrases` uttered by a non-knower), dead-speaker scan, contradiction-of-committed-delta scan. One bounded regenerate, then fallback (§3.1.10).

`hasRevelationPath` is BFS over the provenance graph: nodes are `(character, fact)` acquisition events reconstructed from belief rows' `sourceBeatId`; it returns the beat-path or a typed reason (`no_establishing_event`, `not_present`, `not_targeted`, `premises_unknown`). It is used at commit (INV-2), by the gate, and printed in C-tier cards ("How she knows: overheard in Scene 3").

---

## 5. Convergence and endings

### 5.1 Ending-readiness score (deterministic, legible)

Per ending `e`, recomputed post-commit; every component reported (no opaque scalar):

```
readiness(e) = 0.25·q_open + 0.20·s_setup + 0.20·c_pressure + 0.15·act_pos + 0.20·e_req
  q_open     = answered_or_intensified(story-scale questions) / total story-scale questions   (1 if none)
  s_setup    = (paid + abandoned setups) / total setups                                        (1 if none)
  c_pressure = max conflict pressure over last 6 beats / 5
  act_pos    = clamp((beats − targetBeats.min) / (targetBeats.max − targetBeats.min), 0, 1)
  e_req      = satisfied hardRequirements(e) / |hardRequirements(e)|
```

Weights are world-overridable; defaults above. Thresholds: `θ_soft = 0.55` — the director begins convergence steering (scene packets gain a "CONVERGENCE PRESSURE" section listing the nearest ending's missing predicates as dramatic targets); `θ_end = 0.70` — `EndingTrigger` becomes valid (INV-4) *provided all hard requirements hold* (hard requirements are always mandatory; the scalar never overrides them).

### 5.2 Ending trigger flow

1. Source: `directorTick()` proposes `EndingTrigger` when some `readiness(e) ≥ θ_end`, or the parser maps an explicitly ending-seeking player action.
2. Validation (INV-4). Failure → typed `NotReady { endingId, missing: EndingPredicate[], readinessBreakdown }`; the director converts `missing` into steering, never a nag.
3. Pass → **C-tier staged interrupt**, card `stagedPrompt`: "This ends the story. There's no going back." with the ending title (flavor withheld — no spoiler).
4. On `confirm`: commit; session enters ending phase — the engine generates the final beat(s) with `renderNotes` constraints and `functionTags: ['ending']`, `closeScene`, `endSession(endingId)` (auto-snapshot, `status:'ended'`, `endedAt`).
5. Post-ending: final-compile eligibility unlocks; remaining open items become the artifact's continuity report ("the lie you never caught", "the secret you never found", endings-not-found count).

### 5.3 Multiple endings

Worlds define ≥2 `EndingSpec`s (alpha: exactly 3). The engine exposes `endingsAvailable(state): { endingId, readiness, breakdown, missing }[]` for the director and share-page stats. Collection mechanics: each ended session records one `endingId`; `fork(atSeq)` before a divergence point supports collecting endings without full replay (product decision; engine supports it natively). An ended session is terminal — no further commits (attempts → `SessionEndedError`).

---

## 6. Compiler (lived path → artifact)

Input: an ended session (mode `final`) or a live one (mode `preview`). The lived path = immutable beat texts + confirmed deltas + scene records. Five stages; every LLM call receipted and cached by `(inputHash, promptTemplateVersion, model)` so recompiles are stable and near-free.

**Stage 0 — Freeze & reconcile.** `snapshot('pre_compile')`; `verify()`; compute `ReconciliationStatus`: `reconciled` = hash verified ∧ no pending C-tier ∧ all scenes closed ∧ zero quarantined anchors; `partially_reconciled` = preview mid-session or ≤3 quarantined anchors (each listed); `drift_detected` = hash mismatch or unmaterialized confirmed deltas. **Mode `final` refuses on `drift_detected`** (`StaleStateError`) per settled decision 9; preview proceeds but stamps the artifact.

**Stage 1 — Scene Memory Units (deterministic).** Per scene: `SceneMemoryUnit { sceneId, slugline, present, objectives, deltasInOrder (denormalized), questionActivity, pressureStart→End, keptLines: { beatId, span, text }[] (all C-tier beat kept-spans + top B-tier exchanges), summary (the ~100-token close-time summary), asOfSeq }`. Pure assembly from state + beat text; golden-tested.

**Stage 2 — Outline reconciliation (deterministic).** Build `OutlineNode[]`: act pivots at C-tier commit positions and the pressure curve's local maxima; verify ledger closure (every `paid` setup's planting scene present; every answered question's raising scene present — a missing antecedent is impossible if INV-3 held, but the check re-runs here because compilation may compress); scenes with zero deltas and zero question activity are tagged `connective` and merged into the following scene's transition. Each node gets a page budget ∝ (beat count × tier weight: C=3, B=2, A=1). Output feeds render and the doctor's scene-function rule.

**Stage 3 — Fountain render (LLM pass, dual-artifact rule).** Per scene, `SceneRenderRequest` = SMU + verbatim beat texts + voice cards + **as-of epistemic packet** (`stateAsOf(scene.exitedAtSeq)` — early scenes must not leak later knowledge) + format contract + `renderNotes` if ending scene. Contract (enforced by prompt and re-checked by the doctor): the rendered scene may trim and bridge but **must not contradict any committed delta, must include every kept-line verbatim, and must not introduce facts outside the as-of state**. Routing: `connective` scenes → cheap model; `pivot|reveal|ending` → strong model; temperature 0.4 (action-heavy) / 0.7 (dialogue-heavy), per the dynamic-temperature policy. Output stitched into one Fountain document.

*Fountain format details (target: Fountain 1.1):* title page key/value block (`Title:`, `Credit: a story lived by <player name>`, `Author: <player> × StoryMachine`, `Source: session <shortRef>`, `Draft date:`) followed by a blank line; scene headings `INT.|EXT.|INT./EXT. LOCATION - TIME` (force with leading `.` when needed); action lines ≤4 lines/paragraph; character cues UPPERCASE (force lowercase names with `@`); parentheticals `(sparing)`; dual dialogue `^` unused in v1; transitions `CUT TO:` (force with `>`); centered text `> TEXT <` for title cards; act/sequence structure as non-printing sections `# ACT ONE`; synopses `= line` carrying scene-function tags in the annotated variant only; notes `[[...]]` only in the annotated variant; boneyard `/* */` never emitted. The serializer applies forcing characters whenever content would collide with Fountain auto-detection (e.g., an action line beginning "INT" gets `!`).

*Determinism honesty:* the render pass is probabilistic — receipted, model+prompt-version pinned, cached. The canonical artifact is the resulting **text** (settled decision 1); all semantic structures (episode JSON, belief map, spans) are derived projections carrying anchors into that text.

**Stage 4 — Doctor QC gate (deterministic).** `parseFountain(rendered)` → `runDoctor({ script, stateRef, mode:'compile_qc' })`. Any `blocker` finding → targeted re-render of the offending scene with the finding's explanation injected (ONE retry per scene); still failing → `doctorGate: 'failed'` and `compile` returns the report without publishing (final artifacts require `passed | passed_with_warnings`).

**Stage 5 — Artifact assembly.** `CompiledArtifact` with fountain text, `contentHash`, doctor report, reconciliation stamp, continuity report (unresolved setups, open questions, final belief map, secrets never found, lies never exposed, irony unplayed, quarantined anchors), stats (incl. `estRuntimeMin` = pageEstimate × 1 min/page), receipts; history entry `compile`.

**Illustrated-episode JSON variant (share pages).** Derived deterministically from the same SMUs + parsed Fountain (no second LLM pass):

```ts
interface EpisodeJson { meta: { title; worldTitle; endingTitle; stats; watermark: string };
  panels: Panel[] }
type Panel =
  | { kind: 'title_card'; text: string }
  | { kind: 'scene_card'; slugline: string; illustrationPrompt: string }        // deterministic template: location + present + mood(pressure)
  | { kind: 'action'; text: string; source: ArtifactSpan }
  | { kind: 'dialogue'; speaker: string; lines: string[]; parenthetical?: string; source: ArtifactSpan }  // ≤3 lines/panel
  | { kind: 'reveal'; text: string; stateGlimpse?: { irony?: string; suspicion?: string }; source: ArtifactSpan }  // one per C-tier beat
  | { kind: 'ending_card'; endingTitle: string; stats: { secretsFound: number; secretsTotal: number; liesCaught: number; endingsFoundOfTotal: string } };
```

Every content panel carries an `ArtifactSpan` anchor into the fountain text (kind `artifact_span`), so share pages and the screenplay never diverge silently. Image generation itself is app-layer; the engine emits `illustrationPrompt` strings only.

---

## 7. Deterministic doctor v1

Pure package. Law: same `(script, stateRef, rulebookVersion, calibration)` ⇒ byte-identical `DoctorReport`. No network, no clock in computed values, no randomness, no LLM. Findings sorted `(sceneIndex, ruleId, span.from)`. Severities: `blocker` (fails compile gate) / `warning` / `info`. Every finding: `{ ruleId, ruleVersion, severity, sceneIndex?, anchors: Anchor[], explanation: { message, evidence: EvidenceRef[], suggestion? } }`.

Text normalization for all string matching: NFC, casefold, strip punctuation, collapse whitespace. "Token-set similarity" = |A∩B|/|A∪B| over normalized word sets.

| # | id (v1.0.0) | Severity | Inputs | Algorithm sketch |
|---|---|---|---|---|
| 1 | `dead-actor` | blocker | cast deathSeqs; parsed cues; scene asOfSeq | For each scene S, each dialogue cue C: if `deathSeq(C) < asOfSeq(S)` and no resurrection (none in v1) → blocker. Action-line agency ("NAME <verb>s") by dead characters → warning (corpse mentions are legal). |
| 2 | `leak-phrase` | blocker | fact `leakPhrases`; per-scene knowledge sets; dialogue lines | For each dialogue line by speaker c in S: normalized containment of any `leakPhrase(F)` where `¬knows(c,F)` at asOf(S) and `suspects(c,F) < 0.75` → blocker with the phrase span. Deterministic string check; catches phrase-level leaks only (see 7.2). |
| 3 | `leak-audience` | blocker | audience ledger seqs; narration/action lines | Narration referencing a `concealFromAudience` fact's leakPhrases before its `AudienceLearn` seq → blocker. |
| 4 | `contradiction-delta` | blocker | committed deltas; parsed scenes | Structured contradictions of committed state: object held by X per state while text has Y "hands/gives" it (object name + verb list match); character present in text (`cue` or name-as-subject) while not in `presentCharacterIds` and no transition; location/time of slugline ≠ SceneRecord slugline. Exact-match checks only. |
| 5 | `kept-line-integrity` | blocker | kept-line manifest | Every kept-line (C-tier verbatim span) must appear in its scene with token-set similarity ≥ 0.8; a vanished C-tier moment → blocker. |
| 6 | `payoff-without-setup` | blocker | setup ledger; outline order | Any `paid` setup whose payoff scene precedes its planting scene in the compiled order (compression may reorder) → blocker. Re-verifies INV-3 post-compile. |
| 7 | `orphan-setup` | warning | setup ledger | Setups `planted|reinforced` at end and not `abandoned` → warning; listed in continuity report (danglers may be sequel hooks — never a blocker). |
| 8 | `open-question` | warning | question ledger; ending spec | Story-scale questions not `answered|abandoned` and not in `intentionallyOpenQuestionIds` → warning. |
| 9 | `scene-function` | warning | outline nodes; parsed scenes | Scene tagged `reveal|pivot` whose text contains none of the corresponding delta's kept lines or leakPhrases → warning "declared function not dramatized"; `connective` scene > 1.5 pages → warning. |
| 10 | `pacing-stats` | warning/info | parsed script | Deterministic metrics (emitted in `report.metrics` for the benchmark): page estimate (55 lines/page), dialogue:action ratio/scene, scene length variance, longest action block. Findings: action paragraph > 5 lines (warning); scene > 15% of total pages (warning); ≥3 consecutive scenes with ratio within ±0.1 (info "flat rhythm"). |
| 11 | `conflict-deflation` | warning | conflict pressure trajectory | A conflict that reaches pressure ≥ 3 then `resolved` with no scene between peak and resolution containing an escalate/peak delta, or pressure dropping ≥2 without a `ResolveConflict` → warning with trajectory evidence. This is the benchmark's conflict-deflation metric. |
| 12 | `voice-bleed` | warning/info | per-character dialogue; voice cards; calibration function-word list | Stylometrics per character (≥200 words spoken): mean sentence length, type-token ratio, tic-phrase hit rate (expected > 0), forbidden-move phrase hits (expected 0), function-word frequency vector (top-50 list from calibration file). Findings: two characters with cosine ≥ 0.97 → warning "voices converge"; a character using another's tic → info; own forbiddenMove violated → warning. Proxy metric only (see 7.2). |
| 13 | `slop-advisory` | info ONLY | banned-phrase calibration file | Normalized phrase matches in dialogue/action → info flags + `slopDensity` (hits/1000 words) exported to the benchmark. Advisory by law (settled decision 5) — never blocker, never a gate. |
| 14 | `irony-unplayed` | info | irony edges; scene presence | Irony edge sustained ≥ 3 scenes where no scene both includes the unaware character and references the fact (leakPhrase by a knower or narration) → info "irony never played". |
| 15 | `format-integrity` | blocker/warning | raw text | `serializeFountain(parseFountain(text))` must equal normalized text (round-trip) → blocker on failure; malformed sluglines, orphan cues (cue with no dialogue) → blocker; unknown cue not in cast and not matching the extras pattern `/^[A-Z][A-Z0-9 #.\-']+$/` with a `NoteContinuity` → warning. |

**Versioning + goldens.** `RULEBOOK_VERSION` semver; each rule carries its own `ruleVersion`; the report embeds rulebook version, calibration file hash (`calibration/v1.json`: banned phrases, function-word list, all numeric thresholds), and `inputsHash`. Any rule/threshold change ⇒ minor bump + regenerate goldens via `pnpm doctor:golden --update` (CI fails if goldens change without a version bump). Golden suite: one clean 5-scene script (zero findings), plus per rule ≥1 positive fixture and ≥1 near-miss negative fixture; goldens store the full canonical-JSON report; CI asserts byte equality across the OS/Node matrix.

**Calibration honesty — what these rules canNOT judge:** prose quality; whether subtext exists or lands; paraphrased knowledge leaks (only phrase-level is deterministic — the LLM fast gate covers paraphrase *advisorily*); semantic contradictions in free text beyond the structured checks of rule 4; humor, tone, and whether a twist works; whether distinct voices are *good* voices. These require LLM-advisory scores (pinned model+prompt, cached, labeled `advisory` in every payload, never blended into deterministic scores) or human evaluation. The benchmark reports deterministic metrics and advisory metrics in separate, clearly labeled columns.

---

## 8. Test plan and Phase-2 exit

Tooling: Vitest + fast-check; fixtures under `tests/fixtures`, goldens under `tests/golden`; mock providers (`packages-dev/mock-providers`) are deterministic: the mock parser maps scripted inputs → scripted deltas; the mock dramatizer and `MockRenderAdapter` are template renderers seeded by `session.seed`.

**Property tests** (fast-check, 200 cases/PR, 10k nightly):
- P1 Replay determinism: for any generated commit history, `materialize(snapshot0, history).stateHash` equals the recorded head hash; `stateAsOf(k)` equals replay-to-k.
- P2 Revert soundness: commit set D, revert d ∈ D ⇒ state ≡ history-without-d applied fresh.
- P3 Invariant preservation: arbitrary effect sequences drawn from the vocabulary, pushed through the full pipeline ⇒ `checkInvariants(state)` empty after every commit (invalid effects must be *rejected*, never *applied*).
- P4 Knowledge monotonicity: once `knows(c,P)`, no op removes it while c lives; `believes_false` rows only removed by reveal/expose/confess ops; dead characters' rows frozen.
- P5 Tier totality: every `Effect` maps to exactly one tier; the C-set equals the spec list of §3.1.5 (guards against silent policy drift).
- P6 Fountain round-trip: `parse∘serialize∘parse ≡ parse` on generated valid scripts, including forcing-character edge cases.
- P7 Doctor determinism: run twice (and across CI OS/Node matrix) ⇒ byte-identical reports.
- P8 Anchor ladder: random text mutations (insert/delete/replace at random spans) ⇒ each anchor resolves at the correct ladder level or quarantines; a resolved anchor's text has similarity ≥ 0.8 to the original (no silent mis-attachment; quarantines are surfaced).

**Golden tests:** doctor suite (§7); `buildSMUs` output for the scripted scenario; full compile with `MockRenderAdapter` ⇒ byte-stable fountain + episodeJson + continuity report; scene-packet builder output (constraint text, token budgets); `exportDataset` JSONL for the scripted scenario.

**Fuzz targets** (per task spec): malformed deltas (random field drops/mutations/type swaps ⇒ Zod rejection, no uncaught throw, error receipts recorded); contradictory confirmations (confirm the same C twice; confirm a superseded/expired proposal; confirm after fork; confirm after session end ⇒ typed errors, state untouched); orphan payoffs (`PayoffSetup`/`AnswerQuestion`/`KeepPromise` against unknown, abandoned, or already-paid targets ⇒ INV-3 rejection with explanation); interleaved revert/confirm under concurrent submission (mutex serializes; final state deterministic); prompt-injection strings in `playerInputRaw` (assert quarantine fencing survives packet build and mock providers receive them only inside fences; no allowlisted-field escape); 10k-beat synthetic session (compile completes < 60 s, memory bounded); corrupted snapshots (hash mismatch ⇒ `drift_detected`, open() refuses silently proceeding).

**Phase-2 exit — acceptance criteria** (master plan Phase 2, run in CI as `pnpm harness:run --scenario mara-eli`): the checked-in scripted scenario (Mara/Eli world: 3 characters, one core secret, one core lie, one irreversible act, 3 endings, ~40 scripted player inputs with expected effect ops and scripted C-tier confirmations) must, headless:

1. **Complete end-to-end**: ≥5 scenes; ≥1 C-tier interrupt staged, confirmed, committed; `EndingTrigger` validates and commits; session ends with an `endingId`.
2. **Zero contradictions**: doctor rules 1, 4, 5, 6 report zero findings on the final compile; zero INV violations in the commit log.
3. **Zero leaks**: rule 2 and 3 zero findings; fast-gate telemetry shows zero *uncaught* leaks (injected leak fixtures in the scenario must be caught and repaired within the one-regenerate bound).
4. **Valid compile**: `mode:'final'` succeeds; fountain round-trips; `doctorGate: passed | passed_with_warnings`; `reconciliation.status: 'reconciled'`; episodeJson panels all carry resolving anchors.
5. **Measured cost per beat**: receipts complete for every AI call; the harness prints per-beat and per-session token/USD tables; with the live provider, every beat within `CostBudget` (parse ≤1.2k/300, dramatize ≤6k/900, gate ≤1.5k/200) or the run fails.
6. **Reproducible**: two mock-provider runs ⇒ identical `stateHash` sequence and byte-identical artifacts. With a live provider: the committed delta sequence must equal the scenario's expected effect-op sequence (params tolerance-matched); prose may vary — state may not, because state comes only from confirmed deltas. Receipts pin provider/model/prompt versions for the record.

CI gates: `pnpm -r test` (unit+property bounded) + golden + fuzz smoke (30 s budget) on every PR; nightly extended fuzz (10 min) + live-provider scenario behind a flag. Every deterministic rule ships with ≥1 positive and ≥1 negative unit test (inherited law from the v5 verdict).

**Integration note (non-blocking):** when the existing repo is connected, its `doctor.ts` seeds rules 10/15, `intent-parser.ts` seeds the `IntentParserAdapter` prompt, and its Fountain pipeline seeds `parseFountain` — audit against this spec's purity rules before adoption; nothing here depends on that code existing.
