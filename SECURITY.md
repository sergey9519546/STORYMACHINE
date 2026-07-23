# STORYMACHINE — Security & Reliability Audit

*Produced 2026-07-14. Branch `fix/security-reliability-wave`. Worktree state:
23 files modified, 4 untracked, verified with `lint / test / test:metamorphic /
build` all green. A concurrent process was editing the worktree during the
audit; backend paths (`config.ts`, `game.ts`, `session-store.ts`,
`Orchestrator.ts`, `converge.ts`, `commits.ts`) showed no diff, so backend
line references are stable. UI line references were revalidated against the
latest worktree after concurrent edits completed.*

---

## 0. Scope and method

Four parallel investigations ran against the current worktree:

1. **Architecture survey** — domain map, caller/callee paths, state authorities.
2. **Security/reliability audit** — trust boundaries, persistence safety,
   concurrency, error handling.
3. **UI/UX review** — recent commits, desk switching, export/import flows,
   accessibility.
4. **Verification** — `lint / test / test:metamorphic / build / git diff --check`.

Findings are classified by boundary:

| Boundary | What it governs |
|---|---|
| **Canon** | StoryCommit ↔ Stage ↔ Action_Log ↔ Orchestrator |
| **Draft** | Browser storage ↔ ScriptIDE server persistence ↔ Yjs ↔ simulation export |
| **Lifecycle** | Session creation, reset, import, export, eviction |
| **Trust** | Session identity, persona ownership, error disclosure |
| **Product** | Status labels, project identity, command availability |

---

## 1. Findings

### 1.1 P0 — Data loss

#### SEC-001: Current exports rejected by current import

| | |
|---|---|
| **Severity** | P0 |
| **Confidence** | High (code-level proof) |
| **Boundary** | Lifecycle |

Stage migrates through schema version 13 (`server/engine/Stage.ts:78`).
Export writes the live SQLite `user_version` (`Stage.ts:1322`). HTTP import
hard-codes `CURRENT_SCHEMA = 6` (`server/routes/config.ts:330`). A snapshot
exported by the current server is rejected by that same server as "too new."

Existing test hides this by manually constructing a version-6 snapshot
(`tests/routes/config.test.ts:199`).

**Action:** Derive `CURRENT_SCHEMA` from the migration source of truth.

---

#### SEC-002: Malformed import destroys valid destination

| | |
|---|---|
| **Severity** | P0 |
| **Confidence** | High |
| **Boundary** | Lifecycle |

Import validation checks only coarse top-level arrays
(`server/lib/validation.ts:267`). The existing session is destroyed before
detailed import (`server/routes/config.ts:337`). Nested array/record failures
are encountered later (`server/engine/Stage.ts:1357`). A semantically invalid
snapshot can therefore erase the valid session.

**Action:** Stage-into-temp-DB → migrate → validate deeply → atomic swap.
Never delete the live DB until temp DB is proven loadable.

---

#### SEC-003: Reset backup is not WAL-safe

| | |
|---|---|
| **Severity** | P0 |
| **Confidence** | High |
| **Boundary** | Lifecycle |

Stage enables WAL (`server/engine/Stage.ts:60`). Reset copies only the live
main `.db` file (`server/routes/game.ts:475`). A correct online-backup
implementation exists at `server/lib/backup.ts:47`. Copy exceptions are
swallowed, so reset can destroy live state without any usable backup.

**Action:** Use `backup.ts` or close/checkpoint first. Fail the reset if
backup creation fails.

---

#### SEC-004: Simulation export overwrites draft without recovery point

| | |
|---|---|
| **Severity** | P0 |
| **Confidence** | High |
| **Boundary** | Draft |

Story Machine sends generated Fountain directly to App
(`src/components/StoryMachine.tsx:550`). App closes Story Machine and forwards
the import (`src/App.tsx:86`). ScriptIDE replaces the complete script
(`src/components/ScriptIDE.tsx:554`). No confirmation, auto-snapshot, diff,
or merge option exists. The pre-simulation draft is lost.

**Action:** Story Machine returns a typed proposal. ScriptIDE presents
Replace/Append/Compare/Cancel. Before Replace: flush autosave, create named
snapshot, perform atomic replacement, keep one-action undo.

---

#### SEC-005: "New story" retains previous project's draft

| | |
|---|---|
| **Severity** | P0 |
| **Confidence** | High |
| **Boundary** | Draft |

`handleNewStory` clears only `config`, Story Machine visibility, and
`sm_app_view_v1` (`src/App.tsx:110`). ScriptIDE initializes from retained
draft, snapshots, characters, research notes, and theme on next mount
(`src/components/ScriptIDE.tsx:172`). Home and New Story invoke the same
callback (`ScriptIDE.tsx:1428`, `Toolbar.tsx:387`).

**Action:** Introduce durable `ProjectRecord` with explicit `projectId`. New
Story creates a new project with an empty draft. Home navigates without
modifying state.

---

#### SEC-006: Sample Coverage can overwrite user edits

| | |
|---|---|
| **Severity** | P0 |
| **Confidence** | High |
| **Boundary** | Draft |

Sample intent is set to `true` and survives component unmount
(`ScriptIDE.tsx:1471`). Each newly mounted `CoverageSummary` gets a fresh
`sampleFired` ref and auto-runs (`CoverageSummary.tsx:96`). Successful run
writes sample into editor (`CoverageSummary.tsx:78`). The parent flag is
cleared only on explicit Close (`ScriptIDE.tsx:2261`). Switching desks or
opening Full Report without closing Summary preserves the flag for later
remount.

**Action:** Replace persistent boolean with a consumable request ID. Consume
once before async work. Sample analysis should not mutate the active
screenplay.

---

### 1.2 P1 — Canon and proof correctness

#### SEC-007: Stage mutations before StoryCommit proof

| | |
|---|---|
| **Severity** | P1 |
| **Confidence** | High |
| **Boundary** | Canon |

OASIS turn writes Stage (location, Action_Log, Spine, beliefs, emotions,
Director) before constructing and proving the StoryCommit
(`server/engine/Orchestrator.ts:252-424`). When Tier-1 rejects the transition,
`buildTurnCommit()` returns null; prior Stage mutations remain
(`server/nvm/bridge/action-to-ops.ts:472`).

**Invariant violated:** "Proof before canon" is not true for lived OASIS
state.

**Action:** Agent output produces a transition proposal. No persistent Stage
method runs during proposal generation. `CanonService` runs proof → append →
materialize atomically.

---

#### SEC-008: Orchestrator cache drifts from persisted canon

| | |
|---|---|
| **Severity** | P1 |
| **Confidence** | High |
| **Boundary** | Canon |

`Orchestrator` initializes `_lastCommitId` and `_narrativeState` once
(`server/engine/Orchestrator.ts:181`). Only commits created by the
Orchestrator update them (`Orchestrator.ts:419`, `:694`). Director's Cut,
Converge, live-author, and OVERRULE writes do not refresh the cache
(`server/routes/nvm/commits.ts:60`, `:109`, `server/routes/nvm/live.ts:141`).

**Action:** Retire private cache or invalidate exclusively through
`CanonService`.

---

#### SEC-009: `buildEnrichedState` discards NVM belief/emotion ops

| | |
|---|---|
| **Severity** | P1 |
| **Confidence** | High |
| **Boundary** | Canon |

Replay rebuilds beliefs and emotions from StoryCommits, then overwrites them
with Stage values (`server/nvm/state/enrichedState.ts:20-46`). Converge,
Director's Cut, and live-author routes append StoryOps but do not materialize
belief/emotion changes into Stage. Those changes disappear from the next
enriched state.

Existing tests verify facts, clocks, relationships, and reverts but not
beliefs/emotions (`tests/core/core-01.test.ts:3945`).

**Action:** Folded `NarrativeState` must own beliefs/emotions. Stage
belief/emotion tables are materialized indexes only. No overwrite.

---

#### SEC-010: Room simulation is a lossy compiler

| | |
|---|---|
| **Severity** | P1 |
| **Confidence** | High (static analysis) |
| **Boundary** | Canon |

Room round may create several actions but only the last becomes the
representative commit action (`server/engine/Orchestrator.ts:662`). Successful
relocation can skip StoryCommit construction entirely
(`Orchestrator.ts:485`, `:599`).

**Action:** One commit per action, or one atomic round commit containing
ordered transitions. No implicit "representative action" model.

---

#### SEC-011: Production Converge SSE supplies no mechanisms

| | |
|---|---|
| **Severity** | P1 |
| **Confidence** | High (static analysis, not runtime-proven) |
| **Boundary** | Proof |

SSE route constructs `activeMechanisms: []` (`server/routes/nvm/converge.ts:164`).
MechanismProof rejects an empty set (`server/nvm/proof/tier1/mechanism.ts:11`).
UI does not supply a mechanism selector (`src/components/ConvergePanel.tsx:252`).
Route test explicitly supplies a mechanism, masking this (`tests/routes/nvm-converge-select.test.ts:145`).

**Action:** Write a failing test that reproduces this at runtime before
fixing.

---

#### SEC-012: Arc convergence advances through rejected fallback IRs

| | |
|---|---|
| **Severity** | P1 |
| **Confidence** | High (static analysis) |
| **Boundary** | Proof |

Budget-exhausted `convergeScene()` may return an IR while `winner` is null
(`server/nvm/converge/loop.ts:462`). Arc route applies that IR to rolling
state (`server/routes/nvm/converge.ts:303`). Later scenes evaluate against a
rejected transition.

**Action:** Failed scene must produce one of `abstained`, `budget_exhausted`,
`requires_author_decision`, `cancelled`, `provider_failed`. Rolling state
must remain unchanged.

---

#### SEC-013: Director's Cut bypasses proof kernel

| | |
|---|---|
| **Severity** | P1 |
| **Confidence** | High |
| **Boundary** | Proof |

`POST /api/nvm/inject-ops` validates StoryOp structure, applies ops, appends
commit directly (`server/routes/nvm/commits.ts:60-95`). Does not run Tier 1.
The associated test does not test proof legality (`tests/routes/nvm.test.ts:106`).

**Action:** Either run Tier-1 diagnostically and persist with explicit
`origin: author_override` plus failed checks, or require proof. Never create
an indistinguishable "proven" commit.

---

#### SEC-014: Converge commit re-proves a reduced approximation

| | |
|---|---|
| **Severity** | P1 |
| **Confidence** | High |
| **Boundary** | Proof |

Commit route reconstructs an incomplete shell IR: hard-coded `advance_plot`,
hard-coded provenance, no causal links, empty postconditions, no candidate
identity (`server/routes/nvm/commits.ts:119-151`). Selection-time proof and
commit-time proof are not proving the same transition.

**Action:** Persist complete candidate IR. Re-prove exact IR verbatim at
commit time. Causal links must be validated.

---

### 1.3 P1 — Persistence and recovery

#### SEC-015: "Full session snapshot" is not full

| | |
|---|---|
| **Severity** | P1 |
| **Confidence** | High |
| **Boundary** | Lifecycle |

Export omits: `Story_Commits`, `Ghost_Commits`, `Reveal_Plans`,
`Drama_Positions`, `Llm_Cache`, `Self_Play_Corpus`, `ScriptIDE_State`
(`server/engine/Stage.ts:1322-1354`). README claims this is a full session
(`README.md:32`).

**Action:** Include all bounded contexts or rename to "simulation snapshot."

---

#### SEC-016: Empty valid Stage export may be rejected

| | |
|---|---|
| **Severity** | P1 |
| **Confidence** | High |
| **Boundary** | Lifecycle |

Import requires non-empty agents and locations (`server/routes/config.ts:320`).
A valid empty Stage (post-clear) may fail import.

**Action:** Define explicitly whether emptiness is valid; reject based on
structural integrity, not population requirements.

---

#### SEC-017: Ghost-candidate scores discarded

| | |
|---|---|
| **Severity** | P2 |
| **Confidence** | High |
| **Boundary** | Lifecycle |

Converge computes composite, tension, quality scores for ghost candidates
(`server/routes/nvm/converge.ts:199`, `:307`). Ghost persistence discards
them (`server/engine/Stage.ts:1481`). The Cutting Room loses ranking
information.

**Action:** Persist `compositeScore`, `tensionScore`, `qualityScore` in the
ghost table. Display in UI.

---

### 1.4 P1 — Concurrency

#### SEC-018: Reset and import race active async work

| | |
|---|---|
| **Severity** | P1 |
| **Confidence** | High |
| **Boundary** | Lifecycle |

Turn uses `session._turnQueue` (`server/routes/game.ts:149`). Reset
(`game.ts:475`) and import (`server/routes/config.ts:337`) do not join that
queue. In-flight Orchestrator/provider work resumes later and writes to a
potentially closed/deleted Stage.

**Action:** Session-level mutation coordinator for all Stage-mutating
commands: turns, rooms, scenes, reset, import, restore, canon commits.

---

#### SEC-019: `/api/turn` can interleave with room/scene simulation

| | |
|---|---|
| **Severity** | P1 |
| **Confidence** | High |
| **Boundary** | Lifecycle |

Turn queue (`game.ts:149`) and `runningRooms` (`game.ts:251`, `:390`) are
separate locking mechanisms. They can mutate the same Stage and Orchestrator
concurrently.

**Action:** Session-level lock with generation tracking. Stale writes rejected.

---

#### SEC-020: Room SSE timeout does not cancel simulation

| | |
|---|---|
| **Severity** | P1 |
| **Confidence** | High |
| **Boundary** | Lifecycle |

Five-minute timer emits timeout and sets `disconnected = true`
(`server/routes/game.ts:294`). Does not abort `runRoomSimulation()`
(`game.ts:319`). Room lock retained until simulation finishes (`game.ts:357`).

**Action:** Timeout must abort provider calls and simulation via
`AbortSignal`. Release lock on abort.

---

### 1.5 P2 — Trust boundaries

#### SEC-021: Missing session capability falls into shared writable `default`

| | |
|---|---|
| **Severity** | P2 (P0 if exposed beyond loopback) |
| **Confidence** | High |
| **Boundary** | Trust |

Missing/invalid identity maps to `"default"` (`server/lib/session-store.ts:226`).
Server listens on `0.0.0.0` (`server.ts:103`). State-changing routes use this
identity without ownership authentication (`server/routes/game.ts:475`).

**Action:** Bind to loopback by default. Require valid capability. Fail
closed on absence. Add real authentication before public deployment.

---

#### SEC-022: Custom personas are process-global and can shadow built-ins

| | |
|---|---|
| **Severity** | P2 |
| **Confidence** | High |
| **Boundary** | Trust |

Custom personas in process-global Map (`server/personas/registry.ts:19`).
User entries resolve before built-ins (`registry.ts:50`). Registration permits
built-in ID such as `default` (`registry.ts:59`). Routes are not session-namespaced
(`server/routes/scriptide.ts:696`). One session can alter completions for all.

**Action:** Namespace by session. Reject built-in ID collisions. Validate
prompt size and sampling bounds.

---

#### SEC-023: Inline completion puts screenplay text and capability in URL

| | |
|---|---|
| **Severity** | P2 |
| **Confidence** | High |
| **Boundary** | Trust |

EventSource URL includes up to 4,000 prefix + 1,000 suffix characters,
character context, genre/style/persona (`src/components/editor/inline-complete.ts:50`).
Session capability added via `withSession()` (`src/lib/session.ts:61`). Visible
to browser history, proxies, access logs, tracing.

**Action:** POST-minted opaque stream token. No screenplay content or
capability in URLs.

---

#### SEC-024: Streaming endpoints expose raw provider errors

| | |
|---|---|
| **Severity** | P2 |
| **Confidence** | High |
| **Boundary** | Trust |

Raw `Error.message` sent from `server/routes/scriptide.ts:689`,
`server/routes/nvm/revision.ts:164`, `server/routes/nvm/converge.ts:243`,
`server/routes/game.ts:353`. Provider exceptions may include upstream
response bodies (`server/lib/ai-providers/openai-compat.ts:267`).

**Action:** Stable public error codes. Raw details in structured server logs
keyed by `requestId`.

---

#### SEC-025: Session-cap eviction is an availability risk

| | |
|---|---|
| **Severity** | P2 |
| **Confidence** | Medium |
| **Boundary** | Trust |

Session store evicts oldest loaded Stage on capacity reach
(`server/lib/session-store.ts:131`). Since callers choose session IDs and
missing IDs fall into shared behavior, untrusted churn can evict active
sessions.

**Action:** Eviction should not interrupt active mutations. Consider separate
eviction policy for idle vs. active sessions.

---

### 1.6 P2 — Product correctness

#### SEC-026: Coverage says "Ready" without a report

| | |
|---|---|
| **Severity** | P2 |
| **Confidence** | High |
| **Boundary** | Product |

Opening Coverage clears staleness before analysis succeeds
(`ScriptIDE.tsx:903`, `:918`). Toolbar maps not-running + not-stale to "Ready"
(`Toolbar.tsx:129`). Failures are private to CoverageSummary
(`CoverageSummary.tsx:67`). Initial blank draft shows "Ready" despite never
having a report.

**Action:** Explicit state machine: `not_run | queued | running | ready |
outdated | failed`.

---

#### SEC-027: Ship title-page metadata not persisted or exported consistently

| | |
|---|---|
| **Severity** | P2 |
| **Confidence** | High |
| **Boundary** | Product |

Title/author/contact are local component state (`ScriptIDE.tsx:224`). Absent
from versioned draft schema (`scriptide-draft-store.ts:4`). Only Fountain
export includes them (`ScriptIDE.tsx:1037`). FDX/PDF/DOCX receive raw
`scriptText` (`ScriptIDE.tsx:1066`, `:1079`, `:1094`).

**Action:** Shared `ExportDocument` model consumed by all exporters.

---

#### SEC-028: Duplicate command surfaces disagree

| | |
|---|---|
| **Severity** | P2 |
| **Confidence** | High |
| **Boundary** | Product |

Ship strip disables PDF/Fountain/Snapshot for empty draft (`ScriptIDE.tsx:1372`).
Toolbar Export menu has no empty-state disabling (`Toolbar.tsx:218`). Toolbar
Simulate is disabled only while already simulating (`Toolbar.tsx:265`).

**Action:** Single `getCommandAvailability(appState, command)` consumed by all
surfaces.

---

#### SEC-029: Two competing quality authorities

| | |
|---|---|
| **Severity** | P2 |
| **Confidence** | High |
| **Boundary** | Product |

Deterministic Doctor at `server/routes/scriptide.ts` vs. LLM analysis at
`server/routes/scriptide.ts:899`. ScriptIDE contains hard-coded qualitative
status language. North Star says no LLM-as-judge (`NORTH_STAR.md:38`).

**Action:** Remove hard-coded quality claims or label LLM feedback explicitly
as creative feedback, never audit verdict. Deterministic checks drive all
"ready/pass/fail" claims.

---

#### SEC-030: Accessibility regressions

| | |
|---|---|
| **Severity** | P2 |
| **Confidence** | High |
| **Boundary** | Product |

New Story dialog: no Escape handling in key ladder (`ScriptIDE.tsx:852`),
no initial focus, no focus trap, no restoration (`ScriptIDE.tsx:1615`).
Sidebar: `aria-selected` on ordinary buttons (`Sidebar.tsx:199`). Coverage
drawer: full-viewport region without modal semantics (`CoverageSummary.tsx:129`).

**Action:** Proper dialog semantics, focus management, tab semantics, and
keyboard regression tests.

---

## 2. Unaudited areas

These areas were identified but not fully investigated. They represent
potential risk that requires follow-up.

### Infrastructure
- Dockerfile and Compose semantics
- Reverse-proxy configuration and TLS termination
- Environment-secret lifecycle and rotation
- Production logging sinks and retention
- Database volume mount/restart behavior
- Health-check behavior under provider outage
- Release artifact contents and container user permissions
- CI does not smoke-test Docker image in PR builds (`.github/workflows/release.yml:102`)

### Supply chain
- `npm audit` not run
- Lockfile reproducibility
- Dependabot/Renovate policy
- SBOM generation
- License policy
- Container scanning
- GitHub Action SHA pinning
- Artifact provenance

### Collaboration
- Yjs persistence and recovery under disconnect
- Room cleanup and reconnection
- Concurrent offline edit handling
- Awareness/presence leakage
- Token revocation
- Interaction with ScriptIDE autosave and project identity

### Provider security
- Partial-streaming timeout behavior
- Retry safety and duplicate generation
- Idempotency keys
- Cost ceilings
- Cancellation propagation across provider adapters
- Prompt-injection resistance from imported screenplay/research content
- Model output creating unsafe structured data

### Data integrity
- Migration transactionality under interrupted shutdown
- Foreign-key enforcement consistency
- Index sufficiency as data grows
- SQLite checkpoint policy
- Windows/OneDrive synchronization with live WAL files
- Platform-specific filesystem behavior

### Performance
- Large Fountain file handling
- Large cast/research datasets
- Long Converge streams
- Large StoryCommit history replay
- Memory growth in sessions
- Editor responsiveness under load

---

## 3. Dual authority model

The most important structural observation: STORYMACHINE has two separate
authority graphs, not one.

### Narrative authority

```text
StoryCommit (canonical history)
  → NarrativeState (folded logical state)
  → Stage / Action_Log (materialized projections)
  → Orchestrator (active session cache)
```

### Screenplay authority

```text
Yjs Y.Text (collaborative source of truth when active)
  → ScriptIDE server persistence
  → Browser draft storage
  → Export pipelines (client-side and server-side)
```

These graphs must each have:
- One source of truth per mode.
- Transaction boundaries.
- Conflict detection.
- Recovery snapshots.
- Clear ownership.
- End-to-end tests.

Fixing only narrative state does not protect the screenplay. Fixing only
draft persistence does not make proof claims trustworthy.

---

## 4. Verification baseline

| Check | Result |
|---|---|
| `npm run lint` | Pass (type-check only; no ESLint) |
| `npm test` | 9,494 passed, 0 failed, 72 skipped |
| `npm run test:metamorphic` | 6/6 hard invariants pass |
| `npm run build` | Pass (ScriptIDE chunk ~550 kB exceeds 500 kB warning) |
| `git diff --check` | No whitespace errors |

### CI gaps
- `npm run lint` is misleadingly named — performs no ESLint/static analysis.
- No coverage collection or threshold.
- No dependency/security audit.
- No formatting check.
- PR CI builds frontend only; Docker smoke test at release time only.
- CI pins Node 22; local verification used Node 25. No `engines` field in `package.json`.

---

## 5. Repair waves

### Wave 0 — Freeze the evidence

**Invariant:** Every P0/P1 defect has an executable reproduction.

Deliverables:
- Baseline capture (branch, commit, node, test totals).
- Defect matrix with IDs, boundaries, severity, confidence.
- Integration test harnesses (session snapshots, table-level comparison, concurrent barriers, browser lifecycle).
- Every P0 gets a failing test before any code change.

---

### Wave 1 — Recovery must work

**Invariant:** No single action destroys irrecoverable work.

Ordered:
1. Unify snapshot schema ownership (`SEC-001`).
2. Stage-and-swap import (`SEC-002`).
3. WAL-safe verified reset backup (`SEC-003`).
4. Session-level mutation coordinator (`SEC-018`, `SEC-019`, `SEC-020`).
5. Simulation import proposal + confirmation (`SEC-004`).
6. Durable project identity (`SEC-005`).
7. Consumable sample intent (`SEC-006`).
8. Title-page persistence (`SEC-027`).

Test-first gate: all eight reproduction tests green.

---

### Wave 2 — One canonical story transaction

**Invariant:** Proof, commit, materialization, cache update, and event publish either all happen or none do.

Ordered:
1. `CanonService` with one session-scoped transaction.
2. Move all canon-entry paths onto it.
3. Belief/emotion ownership correction (`SEC-009`).
4. Orchestrator cache removal or versioning (`SEC-008`).
5. Room-action canonicalization (`SEC-010`).

---

### Wave 3 — Honest proof claims

**Invariant:** Selection-time, commit-time, and persisted transitions are structurally identical.

Ordered:
1. Runtime test for production Converge mechanism path (`SEC-011`).
2. Full IR re-proof at commit (`SEC-014`).
3. Durable commit provenance (`SEC-013`).
4. Arc abstention semantics (`SEC-012`).

---

### Wave 4 — Product truth

**Invariant:** Every visible status corresponds to actual state.

Ordered:
1. Coverage state machine (`SEC-026`).
2. Shared command availability selector (`SEC-028`).
3. Project identity semantics (`SEC-005`).
4. Accessibility repair (`SEC-030`).
5. Quality-authority separation (`SEC-029`).

---

### Wave 5 — Trust boundaries

**Invariant:** Missing identity fails closed; no content in URLs; no global session mutation.

Ordered:
1. Loopback default bind (`SEC-021`).
2. Capability-based session rejection.
3. Persona namespacing (`SEC-022`).
4. Opaque stream tokens for inline completion (`SEC-023`).
5. Error sanitization (`SEC-024`).

---

### Wave 6 — Consolidation

- Extract shared contracts (no cross-tree imports).
- Consolidate export pipelines.
- Snapshot scope correction (`SEC-015`).
- Architectural enforcement (lint rules for canon access, import boundaries).
- Add real ESLint, coverage thresholds, Docker smoke tests, dependency audit.

---

### Global gates

Every wave requires:
1. Existing `lint / test / test:metamorphic / build` stay green.
2. New tests observed **red before the fix**.
3. Integration tests at authority boundaries.
4. No swallowed exceptions.
5. Session mutation lock used for all lifecycle operations.

---

## 6. Definition of complete

1. Failed import cannot damage existing session.
2. Failed backup prevents reset.
3. Rejected proof cannot mutate any persistent state.
4. Replaying active StoryCommits reproduces every canonical value.
5. Every accepted Action_Log entry maps to canonical provenance.
6. Next turn always observes current active head.
7. New Story cannot inherit another project.
8. Generated/sample content cannot silently replace a screenplay.
9. "Coverage Ready" means a successful report for the current script hash.
10. Every export format uses same title-page data.
11. Missing session identity fails closed.
12. No screenplay content or capability in request URLs.
13. Every unproven author override is labeled as such.
14. Current snapshots round-trip through current application.
15. Every invariant above has a regression test observed failing before repair.
