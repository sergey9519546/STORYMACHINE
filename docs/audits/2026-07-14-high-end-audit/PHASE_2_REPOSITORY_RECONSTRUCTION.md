# High-End Audit — Phase 2 Repository Reconstruction

**Protocol:** PHASE_1_SCOPE.md, repository-forensic stream only  
**Snapshot:** 2026-07-14 working tree, HEAD d30c2ec on main  
**Status:** Complete for internal repository reconstruction; no external-industry synthesis in this phase  
**Evidence rule:** Running code, executable checks, generated invariants, and git objects outrank prose. Aspirational documents are reported as intent, not implementation.

## 1. Executive reconstruction

STORYMACHINE is currently a local-first, single-server web application containing two materially different products:

1. **Script IDE / Script Doctor:** a Fountain-oriented screenplay editor with local and server autosave, live deterministic diagnostics, a full 14-pass coverage report, optional LLM scene sensing and rewrites, draft history, exports, and real-time collaborative editing.
2. **OASIS / Story Machine:** a persistent multi-agent narrative simulation and narrative-state laboratory with characters, locations, beliefs, action/event ledgers, StoryOps, proofs, revisions, counterfactuals, self-play, critics, projections, and many expert panels.

The declared product decision is narrower: private, instant, trustworthy screenplay coverage for a screenwriter before paying a reader or submitting a draft, with Doctor + Editor as the wedge and OASIS filed for Labs. That is the intended future in ULTRAPLAN.md:10-13 and ROADMAP.md:146-159. It is not the present product surface. The present application still advertises and directly launches simulation from the public start screen and editor; there is no single Labs feature flag.

The strongest repository-level conclusion is not merely that documentation is stale. The current canonical strategy contains a central provenance claim that is contradicted by the live generated rulebook, its staleness test, pass source, and git history:

- The live catalog is **3,216 distinct pass-scoped rule constants**, not 8,917. The generated source-of-code rulebook says so at docs/rulebook/README.md:5 and the freshness test passes.
- The alleged 5,701-rule bulk Wave 1191 did not occur in the inspected history. Commit a68a425 is six named detectors in two pass files, with 863 inserted lines across code and tests.
- The 8,917 / 5,701 narrative was introduced in commit b1546c8 without corresponding revision-pass changes. ROADMAP.md:46 and :266, NORTH_STAR.md:22-31, and ULTRAPLAN.md:15-19 therefore do not describe the repository they govern.

This matters because those numbers currently justify the strategic freeze, the maintenance narrative, and several audit conclusions. The measured score-discrimination weakness remains real and independently visible in server/nvm/analyze/doctor.ts:1655-1669 and the executable tests. The historical explanation and catalog size used to frame that weakness are not.

The most severe implemented integrity defect is session export/import:

- A current Stage migrates to schema 13 and exports its real user_version at server/engine/Stage.ts:95-99, :250-265, and :1338-1341.
- The import route hard-codes CURRENT_SCHEMA = 6 and rejects anything newer at server/routes/config.ts:328-334.
- Therefore the current server rejects its own current exports.
- Import also rejects snapshots with empty agents or locations at server/routes/config.ts:320-326, even though a ScriptIDE-only session can validly have neither.
- After only shallow validation, import destroys the existing session before importing at server/routes/config.ts:337-341. A deeper import failure can erase the live session.
- The object called a “full session snapshot” omits multiple current tables, including ScriptIDE_State and Story_Commits.

These are reconstruction facts, not redesign recommendations. Later audit phases should treat the current product claims, operating model, and candidate futures as dependent on this corrected implementation baseline.

## 2. Scope, method, and repository coverage

### 2.1 Frozen corpus

The companion COVERAGE_LEDGER.csv contains 567 first-party rows visible at census time. It intentionally excludes itself to avoid a self-referential inventory. It includes tracked and untracked first-party material, including the working-tree AGENTS.md, SECURITY.md, RELIABILITY.md, audit scope, and 2026-07-15 session log. Ignored dependency, build, data, backup, and transient Playwright screenshot trees were not treated as first-party source.

The census was reconstructed with git ls-files plus non-ignored untracked files and then checked against the filesystem. node_modules, dist, data, backup, .git internals, and ignored runtime screenshots are external/generated runtime material, not source corpus.

### 2.2 Coverage table

| Area | Files | Lines | Disposition and inspection treatment |
|---|---:|---:|---|
| Root | 22 | 11,560 | Active constitutions, setup, package/deploy config, task/audit drafts. Read directly; git state and contradictions traced. |
| .github | 2 | 167 | CI and release workflows. Read completely. |
| .jules | 1 | 6 | Agent metadata. Read; no runtime role. |
| docs | 75 | 22,154 | Active, filed, historical, generated, and audit documents. Routed by ROADMAP authority and provenance; material claims cross-checked against code/history. |
| evals | 13 | 1,402 | Scoring contracts, rubric, human-label task, and metamorphic runner. Read and mapped to CI. |
| output | 1 | 258 | Tracked Playwright whole-site QA harness. Runtime screenshots are ignored artifacts and were not a text corpus. |
| public | 10 | 459 | One static redesign artifact plus nine WOFF2 binaries. Text inspected; binary fonts classified, not decoded as source. |
| script-training | 10 | 320 | Rights register, derived annotation sample, taxonomy, schemas, extractor. Read as filed/reference-only evaluation substrate. |
| scripts | 2 | 881 | Rulebook generator and SQLite backup tool. Read completely and traced to outputs/commands. |
| server | 253 | 157,791 | Server, engine, NVM, providers, routes, prompts, schemas. Active modules read directly; repetitive pass families inspected structurally and through generators/tests/consumers. |
| src | 79 | 30,194 | React application, editor, panels, imports/exports, persistence, styles. Entry and user journeys traced directly. |
| tests | 99 | 144,864 | Core, pass, route, evaluation, E2E, fixtures. Test families mapped; focused executable witnesses run. Mechanically repetitive pass fixtures sampled by family plus aggregate gates. |
| **Total** | **567** | **370,056** | File-level disposition is in COVERAGE_LEDGER.csv; the displayed per-area line counts are authoritative even though binary rows have no meaningful source-line semantics. |

The total line cell is deliberately not presented as an exact semantic “code size” because it combines generated docs, large repetitive tests, JSON lexicons, audit prose, and binary line counters. Summing unlike material would imply a precision the corpus does not support.

### 2.3 Explicit material dispositions

**Active first-party implementation**

- Root runtime/configuration, server.ts, server/**, src/**, evals/**, scripts/**, package manifests, CI/release, Dockerfile, and active user-validation controls.
- Directly traced across imports, routes, consumers, storage, and tests.

**Generated material**

- docs/rulebook/**: 18 files generated by scripts/generate-rulebook.ts. Audited through generator logic, live extraction, generated totals, per-pass source, consumers, and tests/core/rulebook.test.ts.
- package-lock.json: dependency lock output. Inspected for dependency graph/version posture, not treated as hand-authored design.
- Runtime dist, backup, data, ignored Playwright screenshots, and node_modules: excluded as reproducible or external runtime artifacts.

**Mechanically repetitive material**

- Fourteen revision passes total 97,775 source lines in the current tree. Their headers, rule-literal populations, execution order, shared helper shapes, generator, output rulebook, and representative early/late/current waves were inspected. The pass files were not falsely described as generator output: they are large hand-authored/repeated source files that call seven shared analytical helper shapes.
- The corresponding very large tests/passes family was inspected through suite structure, fire/no-fire conventions, Wave 1191 source tests, aggregate test counts, and focused executions. This is explicit structural sampling, not a claim that every repeated fixture line received independent semantic adjudication.

**Filed or retired evidence**

- ROADMAP.md:293-310 files the old wave program, OWNE/STORY GOD work, research intake, and related remnants behind the active P0→P4 sequence.
- docs/canonical/**, docs/owne/**, docs/research-audit/**, docs/scoring/**, script-training/**, and WAVE_QUALITY_GUARANTEE.md remain valuable historical/design evidence but are not automatically current direction.
- ARCHITECTURE.md still contains retired standing-wave instructions and must not be treated as wholly current.

**Binary**

- Nine public/fonts/*.woff2 assets. Presence and use were checked; their binary content was not reverse engineered.

**External or unavailable**

- Installed packages in node_modules are external and excluded; package.json and package-lock.json are the audited dependency evidence.
- The 72-script “real corpus” text is outside the repository and requires REAL_SCRIPT_CORPUS_DIR.
- script-training/sources/source-register.csv points to copyrighted screenplay files outside the repo; only derived scene annotations are present.
- Provider-backed behavior requiring live Gemini/OpenAI-compatible, image, TTS, or embedding credentials was not network-executed.
- Deployment runtime, GHCR publication, reverse proxy behavior, and production backup/restore were reconstructed from config and tests, not observed in a live production environment.
- E2E browser journeys are environment gated and were not used as evidence of current end-to-end success in this phase.
- P0 has zero participant sessions, so actual writer utility and demand remain unavailable by design.

### 2.4 Executable checks run for reconstruction

1. node --experimental-strip-types --test tests/core/discrimination.test.ts tests/core/real-script-corpus.test.ts
   - Process exit: 0.
   - 87 tests; 14 pass; 72 skip; 1 todo.
   - All six synthetic pairs preserve bare ordering.
   - The todo composite min-gap assertion actually fails: strong 72.9 vs weak 70.0, gap 2.9, required 5.0.
   - Every real-corpus script assertion plus shuffle and act-swap suites skip without REAL_SCRIPT_CORPUS_DIR.

2. node --experimental-strip-types --test tests/core/rulebook.test.ts tests/core/record-parity.test.ts
   - 47 tests; 47 pass; 0 skip/todo/fail.
   - Generated rulebook total matches live extraction.
   - Record-parity harness is present and executable, contrary to ARCHITECTURE.md:282-284.

No focused result is promoted into proof of human validity. These checks establish repository behavior only.

## 3. Actual product objective, user, and product status

### 3.1 Declared target

The active target user is a screenwriter who wants private, immediate feedback before paying a reader or submitting a draft. The intended default job is:

open or paste script → coverage report → per-scene fixes → export

Evidence:

- ULTRAPLAN.md:10-13 declares Doctor + Editor as the wedge.
- ROADMAP.md:97-119 defines P0 as observing whether a real writer wants to run their own draft after seeing sample coverage.
- ROADMAP.md:146-159 defines P2 as the future collapse to that one visible journey.

### 3.2 Current validation state

The product thesis is not validated in-repo:

- docs/user-validation/P0_EVIDENCE_SUMMARY.md:12-15 records 0 / 0 / 0 / 0 / 0 recruited, scheduled, completed, valid, documented sessions and gate not met.
- docs/user-validation/PHASE_TRACKER.md:11-15 marks P0 active and P1-P4 blocked.
- The 2026-07-15 session log:55-59 says no participant recruitment has started and calls it the actual bottleneck.

The control documents disagree on whether fielding itself is blocked:

- docs/user-validation/P0_EVIDENCE_SUMMARY.md:7-17 says fielding is blocked by pre-session smoke and no exact-commit instance was certified.
- docs/user-validation/PHASE_TRACKER.md:39-42 says no blocker remains and the current HEAD passed exact-commit keyless smoke.
- docs/user-validation/SESSION_LOG_2026-07-15.md:25-35 says the re-smoke eventually passed and the status was updated, yet the evidence summary still says blocked.

Therefore “P0 active, no sessions, exit gate not met” is stable. “Ready to field” is unresolved across current artifacts.

### 3.3 Actual current product

README.md:7 accurately describes the implemented system as a dual-engine tool. ULTRAPLAN.md:10-13 describes a strategic decision that has not yet been implemented.

The app router has three top-level lazy surfaces:

- StartScreen
- ScriptIDE
- StoryMachine

src/App.tsx:146-166 selects StoryMachine when showStoryMachine is true, ScriptIDE when a StoryConfig exists, otherwise StartScreen. The view and config are persisted under sm_app_view_v1 at src/App.tsx:17-44 and :75-84.

There is also a hash-only DesignPreview development surface at src/App.tsx:121-135.

## 4. User journeys as implemented

### 4.1 First entry

StartScreen establishes one visually primary path but exposes several peers:

- “Try sample coverage” is recommended and loads the editor/Doctor with no setup: src/components/StartScreen.tsx:257-276.
- “Open my script” accepts .fountain, .txt, and .fdx: :279-305.
- “Blank page” enters ScriptIDE with a default config: :289-297.
- The five-step configuration wizard still exists as an optional deeper path.

The supporting page describes the flow as Enter → Work → Decide → Ship, with “Export · simulate” at src/components/StartScreen.tsx:368-396.

The same public start page contains a full OASIS marketing section and “Open simulation” at src/components/StartScreen.tsx:454-496, plus a second “Simulate” button at :536-542. This is not Labs-gated.

### 4.2 Editor journey

ScriptIDE uses three user-facing task modes and one exclusive right-hand tool slot:

- IdeTask = write | coverage | ship.
- IdeToolSlot = none | coverage | studio | director | slate.
- Evidence: src/components/scriptide/Toolbar.tsx:18-20 and src/components/ScriptIDE.tsx:192-195.

**Write**

- CodeMirror/Fountain editing with scene/cast rail, snapshots, research notes, title page, optional live diagnostics, copilot, and collaboration.
- Empty drafts offer sample coverage or “type FADE IN:” at src/components/ScriptIDE.tsx:1495-1509.
- Edited drafts expose “Run coverage” at :1563-1570.

**Coverage**

- Summary-first CoverageSummary occupies the right slot and calls the quick Doctor.
- Full ScriptDoctorPanel is progressive depth, not the first surface.
- The exact mount/render decision is src/components/ScriptIDE.tsx:2285-2330.
- The full panel supports report history, deep-read toggle, issue jumps, fix-and-verify, and coverage export.

**Ship**

- Quick actions expose PDF, Fountain, Snapshot, and Simulate at src/components/ScriptIDE.tsx:1542-1561.
- Toolbar export additionally offers Fountain, Final Draft, PDF, and Word at src/components/scriptide/Toolbar.tsx:227-270.
- A dedicated Simulate control remains visible at src/components/scriptide/Toolbar.tsx:274-287.

**Studio/expert surface**

The editor’s “Studio” slot contains seven visible tabs:

- Production
- Analysis
- Engine
- Codex
- Research
- Title
- Versions

Evidence: src/components/ScriptIDE.tsx:1842-1888. This is a compressed expert drawer, not Labs gating.

### 4.3 Simulation journey

Entering StoryMachine initializes/fetches persistent Stage and Orchestrator state. Its main loop combines:

- scenario/init configuration,
- characters and locations,
- individual turns and multi-turn scene/room runs,
- action ledger and generated Fountain,
- illusion state, beats, pressures, beliefs, goals, persuasion, and stakes,
- export back to ScriptIDE.

The StoryMachine component exposes 28 mutually exclusive overlay panels in its overlay map at src/components/StoryMachine.tsx:219-229. Its “Inspect” menu groups tools under Decide, Understand, Explore, Revise, and Lab at :697-770. “Lab” is merely one menu group; OASIS itself and the non-Lab expert groups are still directly reachable.

### 4.4 Collaboration

The editor can join an arbitrary room name. It first obtains an HMAC room token from POST /api/collab/token, then opens /collab/<room>. Yjs document and awareness state are process memory only:

- server/collab/yjs-server.ts:29-54 caps rooms at 200 and creates in-memory Y.Doc objects.
- server/collab/yjs-server.ts:223-247 rejects invalid/missing tokens and upgrades valid rooms.
- No durable Yjs update store is implemented. Process restart loses collaboration room content unless editor/server autosave separately captured the latest text.

## 5. System and module reconstruction

### 5.1 Runtime topology

The implemented topology is:

    Browser / React 19 / CodeMirror 6
        |
        | same-origin fetch with X-Session-Id
        | EventSource with sessionId query
        | Yjs WebSocket with room token
        v
    Express 4 server on one Node 22 process
        |
        +-- stateless Script Doctor and export routes
        +-- per-session Stage + Orchestrator routes
        +-- provider-backed generative routes
        +-- in-memory Yjs collaboration rooms
        |
        v
    one better-sqlite3 database per session
    data/sessions/<sessionId>.db

src/main.tsx:7-25 monkey-patches same-origin /api fetch before React mounts to inject X-Session-Id. EventSource cannot send headers, so withSession appends the capability to the URL at src/lib/session.ts:61-69.

server/app.ts:167-172 mounts six routers: config, game, scriptide, NVM, export, and collab. There are 121 explicit router endpoint declarations:

| Router | Endpoints |
|---|---:|
| config | 20 |
| game | 22 |
| scriptide | 18 |
| export | 8 |
| collab | 1 |
| NVM analysis | 17 |
| NVM commits | 7 |
| NVM converge | 3 |
| NVM debug | 5 |
| NVM live | 4 |
| NVM revision | 4 |
| NVM selfplay | 5 |
| NVM twin/what-if | 7 |
| **Total** | **121** |

The production SPA fallback is an additional app.get('*') handler, not a domain endpoint.

### 5.2 Frontend modules

The source contains 48 TSX component files under src/components. The material surfaces are:

- Application shell: App, StartScreen, ScriptIDE, StoryMachine, ErrorBoundary.
- Writing/editing: FountainEditor, toolbar, sidebar, snapshots, research, character manager, title/export, local diagnostics, copilot, collaboration.
- Coverage: CoverageSummary and the 2,976-line ScriptDoctorPanel.
- Simulation and state: Agent, Director, LivePlay, Timeline, Epistemic, Arc, Health, Proof, Regression, Analytics, Momentum.
- Counterfactual/generative lab: WhatIf, Twin, Converge, Projection, SelfPlay, Corpus, Revision, DirectorCut, Room, Interview.
- Producer/export surfaces: Slate, Breakdown, PitchKit, Production.

The current code split lazy-loads many panels, reducing initial bundle cost but not conceptual or maintenance surface.

### 5.3 Server engine

**Stage**

Stage is the SQLite authority. It creates or migrates 21 tables:

- Locations
- Characters
- Character_State
- Knowledge_Ledger
- Action_Log
- Illusion_State
- Event_Cards
- Event_Propositions
- Belief_Edges
- Goal_Mutations
- Dramatic_Pressure
- Beat_Traces
- Persuasion_Log
- Stakes
- Story_Commits
- Llm_Cache
- Ghost_Commits
- Reveal_Plans
- Drama_Positions
- Self_Play_Corpus
- ScriptIDE_State

Creation evidence is server/engine/Stage.ts:107-255 and :283-389. Migrations advance user_version through 13 at :95-99 and :250-276.

**Orchestrator and simulation**

The Orchestrator rehydrates agents/locations from Stage and coordinates turns. Agent decision code constructs three candidate actions and selects the highest goal-alignment score, using provider generation when available and deterministic fallback paths when keyless. Actions are converted to state mutations, logged, and projected into narrative state.

**NVM**

The NVM is not one module but a broad substrate:

- StoryOp and dispatcher
- StoryCommit event ledger
- enriched narrative state
- screenplay compilation and memory records
- tiered proofs, acquittal, repair, and surfacing
- author fixed points and backchaining
- converge operators and loops
- live author loop
- what-if and structural causal twin
- branch fields, valuations, futures, two-reader analysis
- reproduction cache/manifest/ghost ledger
- self-play corpus/genome/mining
- story bible/project sidecars
- deterministic Script Doctor analysis and revision

server/routes/nvm/index.ts:13-53 documents the route-to-module map and :69-89 composes eight routers.

### 5.4 Deterministic analysis/revision subsystem

The Script Doctor takes raw screenplay text and reconstructs ScreenplaySceneRecord objects using heuristic parsing:

- normalizeScreenplay
- parseFountain
- segmentScenes
- cap analysis at 1,000 scenes
- derive scene signals, structure, annotations, characters, and counts

Evidence: server/nvm/analyze/fountain-analyzer.ts:1804-1852.

The compiled text and records then enter the 14-pass pipeline in this order:

structure → causality → intention → belief → conflict → character-arc → dialogue → rhythm → pacing → originality → payoff → voice → theme → relationship-arc

Evidence: server/nvm/revision/pipeline.ts:157-172.

In diagnose-only mode the passes run concurrently under Promise.all because rewritePass is AsyncLocalStorage-gated from LLM use and pass inputs are treated as immutable. In revision mode they run sequentially because each rewrite may feed the next pass. Evidence: ARCHITECTURE.md:150-170 and server/nvm/revision/pipeline.ts:177-203.

The report aggregates:

- health and grade
- severity counts
- all pass summaries
- scene heatmap and top priorities
- structure, characters, scene/word counts
- verdict
- five dimension scores
- earned strengths
- plain summary
- content hash and percentiles
- metrics, page/runtime estimate, emotional arc, and optional deep-read lineage

The central response type begins at server/nvm/analyze/types.ts:216.

## 6. Inputs, outputs, and boundaries

### 6.1 Screenplay inputs

| Input | Entry | Processing |
|---|---|---|
| Fountain / TXT | StartScreen file or editor text | Client read → local/server draft → normalize/parse/analyze |
| FDX | StartScreen or Doctor request | Server fdxToFountain; warnings and converted text returned |
| PDF | Full Doctor upload | Raw 15 MB route, magic-byte check, pdfjs conversion, then same Doctor |
| Built-in sample | StartScreen one-click | sessionStorage provenance flag → editor → automatic sample Doctor |
| Simulation ledger | StoryMachine export | StoryOps/action log compiled to Fountain and imported into ScriptIDE |
| Story context | genre/theme/tone/structure/arc/director | Per-session Illusion_State and selective pass thresholds/prompts |

The normal Doctor route is stateless and requires only text: server/routes/scriptide.ts:263-299. PDF is separately rate-limited and converted at :394-498.

### 6.2 Main outputs

| Output | Authority |
|---|---|
| Live located diagnostics | Deterministic quick Doctor, reduced payload |
| Full coverage JSON | Deterministic or deep-sensed Doctor lineage |
| Coverage HTML | Server re-runs quick Doctor from supplied text; client report is not trusted |
| Verification response | Re-hashes text and optionally recomputes health, verdict, issue count, percentile |
| Fountain, FDX, DOCX, print HTML/PDF | Export routes and client PDF path |
| Breakdown CSV / pitch kit / slate | Producer/export routes |
| Revision candidate + delta receipt | LLM rewrite plus deterministic before/after Doctor |
| Simulation Fountain | Stage/action ledger compiled into screenplay form |
| Session JSON snapshot | Partial StageSnapshot, despite “full” naming |

Coverage export explicitly re-runs the Doctor for authenticity at server/routes/export.ts:432-449. Verification checks the content hash first, then selected headline fields at server/routes/export.ts:686-805. It does not cryptographically sign an immutable report or verify every field in an exported document.

### 6.3 AI boundary

All provider calls are server side. The frontend calls Express routes only; no provider SDK is imported into the client.

Provider families:

- Gemini default via @google/genai.
- OpenAI-compatible text, embedding, image, and TTS providers through configurable base URLs.
- None/no-op media providers.

Provider keys are held in environment variables or private in-memory config. getPublicConfig returns booleans rather than key values at server/lib/ai-config.ts:126-137. GET /api/ai-config correctly ORs GEMINI_API_KEY and the multi-provider key into llmReady at server/routes/config.ts:136-148.

The boundary is functionally:

- **Quick Doctor / diagnose / verify / most analytical projections:** keyless deterministic.
- **Deep read:** optional LLM sensing per scene, then deterministic judging over the resulting record schema; keyless falls back to quick signals.
- **Copilot, character voices, world build, dialogue/tension/action tools, simulation turns, converge, revision, image, TTS:** generative/provider-backed with keyless error or fallback shapes.

The phrase “deterministic core” is therefore mode-sensitive. A quick Doctor score is LLM-free. A deep Doctor score can depend on LLM-derived scene signals, and the report carries deepRead lineage to say so.

## 7. State, persistence, and authority

### 7.1 Browser state

| Key / location | Content |
|---|---|
| sm_app_view_v1 | StoryConfig and whether StoryMachine is open |
| scriptide_draft_v1 | Atomic versioned draft envelope: text, snapshots, characters, research, theme, revision/conflict metadata |
| sm_session_id_v1 | Browser-origin session bearer capability |
| sm_doctor_history_v1 | Compact local coverage history |
| sm_doctor_deep_read_pref_v1 | Sticky deep-read preference |
| sm_revision_spans_v1 | Approved/locked revision spans keyed to draft hash |
| collab_username | Collaboration display name |
| live_diagnostics, typewriter_sound, copilot_persona, banner keys | Editor preferences |
| sessionStorage sm_sample_pending | One-click sample provenance |
| sessionStorage sm_fdx_import_pending | FDX handoff notice |

ScriptIDE’s atomic draft envelope is declared in src/lib/scriptide-draft-store.ts:1-47. It is updated locally after edits and saved server-side every 30 seconds with a conflict-aware expectedUpdatedAt field at src/components/ScriptIDE.tsx:332-368 and :449-518.

### 7.2 Server state

The server stores a Map of at most 100 loaded sessions by default. Each contains Stage, Orchestrator, lastAccess, and a per-turn promise queue at server/lib/session-store.ts:10-16 and :102-157.

- Idle memory eviction default: 24 hours.
- Disk orphan deletion default: 7 days.
- Disk persistence default: data/sessions/<sessionId>.db.
- Session IDs are caller-held bearer capabilities, not accounts.
- Missing or invalid header identity falls back to shared “default”; explicit malformed query/body identity is rejected.

Evidence: server/lib/session-store.ts:102-125, :172-227, and :230-284.

### 7.3 Split screenplay authority

The screenplay has multiple authorities depending on mode:

1. CodeMirror local document.
2. Yjs Y.Text when collaboration is active.
3. Atomic localStorage draft envelope.
4. Server ScriptIDE_State.
5. Simulation Action_Log / Story_Commits compiled into Fountain.
6. Exported files outside the application.

The persistence logic has conflict handling between local envelope and server ScriptIDE_State. It does not unify Yjs durability, simulation canon, editor text, and exported documents under one transaction or generation.

### 7.4 Title page gap

Title, author, and contact are React-only titlePage state initialized at src/components/ScriptIDE.tsx:228-232. The draftRef persisted locally/server-side contains only scriptText, snapshots, characters, researchNotes, and isDarkMode at :306-318. ScriptIDE_State has the same five content fields at server/engine/Stage.ts:250-262.

The fields do feed exports at src/components/ScriptIDE.tsx:1075-1082, but reloading remounts the defaults. This is an actual persistence omission.

## 8. Decision and scoring flow

### 8.1 Quick Doctor

    raw screenplay
      → normalize + parse + segment
      → ScreenplaySceneRecord[] and structure
      → compile deterministic Fountain metadata
      → runDiagnoseOnly
      → 14 pass issue sets
      → aggregate severity, dimensions, heatmap, priorities
      → bounded structural deductions
      → health, grade, verdict, percentiles, strengths
      → route-level locations and root-cause clusters

runScriptDoctor is defined at server/nvm/analyze/doctor.ts:1864-1997. Its cache key is contentHash + storyContext + quick/deep mode at :1887-1902.

### 8.2 Health formula

Base penalty:

- weightedIssues = 4 × critical + 1.5 × major + 0.5 × minor
- opportunityWords = max(wordCount, 1)^0.7
- density = weightedIssues / opportunityWords
- density below 1 uses a steep logistic scale
- density at or above 1 uses 2.5 × density^3.75
- scarcity penalty = 140 / max(sceneCount, 1)
- base health = clamp and round 100 − density penalty − scarcity penalty

Evidence: server/nvm/analyze/doctor.ts:337-395 and :417-425.

Then two document-scale channels subtract bounded deductions:

- SCENE_CONTINUITY_COLLAPSE / PERVASIVE plus GLOBAL_ARC_INCOHERENCE, capped at 24.
- Continuous emotional arc incoherence at feature scale, capped at 15.

Evidence: server/nvm/analyze/doctor.ts:1557-1684.

Verdict:

- health ≥ 85 and at least 8 scenes → RECOMMEND
- health < 60 → PASS
- otherwise → CONSIDER

Evidence: server/nvm/analyze/doctor.ts:593-601. Here PASS is the industry rejection verdict, not a successful software-test result.

### 8.3 Measured internal weakness

The code’s own current comment records:

- scene-count scarcity AUC 0.938,
- weighted-issue rule channel AUC 0.076,
- same-count act-swap AUC about 0.48 before the arc deduction,
- modeled/observed follow-on act-swap 0.48→0.62 and shuffle 0.67→0.79.

Evidence: server/nvm/analyze/doctor.ts:1655-1669.

This supports “validity unproven and structural discrimination weak.” It does not support the false historical claim that 5,701 rules were bulk-created in Wave 1191.

### 8.4 Deep Doctor

POST /api/scriptide/doctor/deep calls runScriptDoctor with deepRead: true at server/routes/scriptide.ts:352-383. The LLM senses scene meaning into the same validated record schema, after which the deterministic pass/report logic runs. The same contentHash can therefore produce a different score in quick and deep modes; the client explicitly treats those lineages as non-comparable.

### 8.5 Fix-and-verify and revision

Generative rewrites are proposals, not deterministic findings. The fix path:

- selects a located span and issue,
- requests an LLM rewrite,
- splices the candidate into the whole screenplay,
- re-runs deterministic Doctor before and after,
- returns both content hashes, resolved/persisting/introduced issues, and health/verdict changes,
- leaves accept/discard to the writer.

The 14-pass full revision pipeline can also rewrite sequentially, with approved spans protected and progress delivered by SSE.

## 9. Evidence and test architecture

### 9.1 What is strong

- High test volume and direct Node execution without a custom runner.
- Keyless full-suite posture in CI.
- Static type check before tests and build.
- Console prohibition under server/**.
- Metamorphic score runner in CI.
- Route validation schemas and parameter schemas are broadly used.
- Focused security/DoS tests, session identity/eviction, persistence conflict tests, provider redirect/SSRF tests, and record-parity tests exist.
- Generated rulebook staleness is executable.
- Diagnose-only parallel versus sequential identity is tested.

### 9.2 What is not proof

- 9,580 passing tests, as reported in the session log, do not establish writer value or score validity.
- The 20-sample calibration corpus is synthetic and deliberately controlled.
- The six discrimination pairs are synthetic.
- The real-corpus text is absent and the corresponding assertions skip in this environment.
- The real-corpus manifest is overwhelmingly positive and primarily tests produced-script floors, not good-versus-bad discrimination.
- The composite 5-point gap is todo, so its assertion can fail without failing the process.
- E2E tests are environment gated.
- No current CI step builds or boots the Docker image, runs dependency/security audit, measures code coverage, performs accessibility/visual regression, or exercises a production reverse-proxy/deployment topology.

### 9.3 CI/release

package.json:7-17 defines:

- dev/start via tsx server.ts
- build via Vite
- “lint” as tsc --noEmit only
- test as Node’s built-in test runner
- metamorphic, rulebook, and backup scripts

.github/workflows/ci.yml:20-51 runs npm ci, type check, server console grep, keyless tests, metamorphic gate, and Vite build on every branch/PR.

release.yml repeats those checks, then uses Buildx to publish version and latest GHCR tags at :102-116.

Dockerfile uses a multi-stage frontend build but copies the complete dependency tree, including devDependencies, into the runner and starts TypeScript through npx tsx at Dockerfile:1-14, :32-49, and :81-87. It runs as the non-root node user, declares /app/data as a volume, and has a /health check.

## 10. Claim and contradiction registry

Severity here is impact on reconstruction truth, content/state integrity, or enforceable project invariants. It is not a final redesign priority.

### R2-C01 — Canonical rule-count and Wave 1191 history are false

**Severity:** Critical to strategy provenance  
**Status:** Confirmed by four independent repository evidence classes

**Claim**

- ROADMAP.md:46 says 8,917 rules, 5,701 generated in one bulk Wave 1191 from seven templates, 6,610 unattributed, about 2,300 concepts, about 47,500 pass lines, and 1,326 as-any casts.
- ROADMAP.md:266 records that bulk expansion as completed history.
- NORTH_STAR.md:22-31 and ULTRAPLAN.md:15-19 repeat it.

**Repository truth**

- docs/rulebook/README.md:5 says 3,216 distinct rules.
- Its table at :13-37 says 909 unattributed, 9 founding, 2,276 Program v1, and 22 Program v2.
- scripts/generate-rulebook.ts:62 defines the literal extraction and :559-601 builds the total/table directly from the 14 live pass files.
- tests/core/rulebook.test.ts passes the published-total/live-extraction equality check.
- Current pass files total 97,775 lines and 1,421 literal “as any” occurrences, not the cited 47,500 and 1,326.
- Commit a68a425, explicitly titled Wave 1191, adds six named detectors to causality.ts and structure.ts plus tests. It does not edit all 14 passes or lib/checks.ts.
- Commit b1546c8 introduces the 8,917 narrative in strategy prose while its file stat contains no revision-pass change.
- No inspected git object supplies the alleged 5,701-rule expansion.

**Interpretation**

The score-channel weakness is independently evidenced. The catalog size, bulk-wave mechanism, and Wave 1191 causal history used to explain it are not.

### R2-C02 — Current session export cannot be imported by the current server

**Severity:** Critical content/state integrity  
**Status:** Confirmed statically; direct implication of constants

- Current Stage migrations reach schema 13: server/engine/Stage.ts:95-99 and :250-276.
- Export writes the actual user_version: server/engine/Stage.ts:1338-1341.
- Import rejects any schema above hard-coded 6: server/routes/config.ts:328-334.

Every normal current-schema export is therefore rejected as “newer than server schema.”

There is a second self-incompatibility: import requires non-empty agents and locations at server/routes/config.ts:320-326. A valid ScriptIDE-only session export can have empty arrays and is rejected.

### R2-C03 — Import can destroy valid state before the imported snapshot is proven loadable

**Severity:** Critical content/state integrity  
**Status:** Confirmed

After shallow shape/version checks, server/routes/config.ts:337-341 calls destroySession, creates a new Stage, then imports. destroySession closes the handle and deletes DB, WAL, SHM, and journal files at server/lib/session-store.ts:160-169. Stage.importSnapshot performs row operations afterward at server/engine/Stage.ts:1373-1388.

A failure during deeper import has no rollback to the original session.

### R2-C04 — “Full session snapshot” is materially partial

**Severity:** High content/state integrity and documentation  
**Status:** Confirmed

README.md:39 calls GET /api/session/export a “full session snapshot” and :40 says import restores it. README.md:158-161 also describes each database as the visitor’s full simulation/screenplay state.

StageSnapshot at server/engine/types.ts:595-614 and Stage.exportSnapshot at server/engine/Stage.ts:1338-1370 include locations, agents, action log, selected pressures/events/persuasion, selected Illusion_State, beat traces, belief edges, goal mutations, and stakes.

They omit current persisted authorities including:

- ScriptIDE_State
- Story_Commits
- Llm_Cache
- Ghost_Commits
- Reveal_Plans
- Drama_Positions
- Self_Play_Corpus
- Character_State
- Knowledge_Ledger
- Event_Cards
- other table/index state not listed in StageSnapshot

Even if schema rejection were fixed, the claimed round trip would remain lossy.

### R2-C05 — Whole-report reproducibility is overstated

**Severity:** High trust-claim precision  
**Status:** Confirmed, bounded

NORTH_STAR.md:19-20 says the same script text always produces the same report. ARCHITECTURE.md:17-22 says the trustworthy diagnostic path touches no clock. ROADMAP.md:40 describes identical input yielding identical output.

The scoring and content hash are deterministic, but the serialized report is not byte-identical:

- aggregate report stamps analyzedAt = Date.now at server/nvm/analyze/doctor.ts:1816;
- cache hits stamp a fresh analyzedAt at :1897-1902;
- empty reports stamp Date.now at :1932;
- compiled input stamps compiledAt at :1972-1977;
- revision results stamp completedAt at server/nvm/revision/pipeline.ts:150 and :268;
- live diagnose stamps another Date.now at server/routes/scriptide.ts:529-542;
- verification stamps verifiedAt at server/routes/export.ts:734-748.

server/nvm/analyze/doctor.ts’s own header qualifies “byte-for-byte” with “minus analyzedAt” at :15-22. The truthful claim is deterministic verdict/score/hash for the same normalized inputs, mode, story context, formula/rule version, and code version—not identical report bytes.

### R2-C06 — “One product by default / OASIS only Labs” is intent, not implementation

**Severity:** High product-truth gap  
**Status:** Confirmed

ULTRAPLAN.md:10-13 says one product by default and OASIS only as filed Labs work. ROADMAP.md:146-159 schedules the actual gating under future P2.

Current code:

- StartScreen publicly markets and launches simulation: src/components/StartScreen.tsx:454-496.
- A second Simulate CTA is at src/components/StartScreen.tsx:536-542.
- Ship mode exposes Simulate: src/components/ScriptIDE.tsx:1542-1561.
- Toolbar exposes Simulate: src/components/scriptide/Toolbar.tsx:274-287.
- App directly switches to StoryMachine: src/App.tsx:146-159.
- ScriptIDE exposes seven Studio tabs: src/components/ScriptIDE.tsx:1842-1888.
- StoryMachine exposes 28 expert overlays: src/components/StoryMachine.tsx:219-229.

No single Labs flag gates these routes/components. README’s dual-engine description matches current implementation more closely than the active strategic decision.

### R2-C07 — ARCHITECTURE contains an active instruction that the canonical roadmap retired

**Severity:** High agent/governance drift  
**Status:** Confirmed

ARCHITECTURE.md:287-315 says the pipeline grows indefinitely, defines a Program v2 rotation, and says the wave process continues.

ROADMAP.md:206-212 freezes rule growth and retires the cadence. ULTRAPLAN.md:157-164 marks the program retired/filed. An agent following ARCHITECTURE without the ROADMAP precedence note would receive the opposite instruction.

### R2-C08 — ARCHITECTURE says record parity is “not yet landed,” but it is live and passing

**Severity:** Medium architecture documentation  
**Status:** Confirmed

ARCHITECTURE.md:276-285 describes tests/core/record-parity.test.ts as not yet landed and being built in parallel.

The 912-line test exists. The focused run passed 44 record-parity assertions and classified 26 known ScreenplaySceneRecord fields, including documented asymmetries.

### R2-C09 — P0 field-readiness controls disagree

**Severity:** High operational governance  
**Status:** Confirmed in current working tree

- Evidence summary: fielding blocked, no certified exact-commit instance.
- Phase tracker: no blocker, current HEAD smoke verified.
- Session log: blocker eventually resolved and verified.

The gate owner and evidence artifact are not synchronized. Zero sessions and gate-not-met are consistent.

### R2-C10 — Title-page data is not persisted

**Severity:** High user-content integrity  
**Status:** Confirmed

Title, author, and contact are editable and used in export, but excluded from both local draft envelope and server ScriptIDE_State. Reload restores UNTITLED SCRIPT / AUTHOR NAME / CONTACT INFO defaults. Evidence: src/components/ScriptIDE.tsx:228-232, :306-318, :1315-1353; server/engine/Stage.ts:250-262.

### R2-C11 — “Each browser tab” session isolation is false

**Severity:** Medium identity/concurrency documentation  
**Status:** Confirmed

README.md:143-144, docs/AUTH.md:12-15, and server/lib/session-store.ts:199-204 say each browser tab gets its own session ID/Stage.

src/lib/session.ts:25 and :47-54 stores the ID in localStorage. localStorage is shared by same-origin tabs in the same browser profile. Tabs therefore normally share one capability and one server Stage; the app’s conflict logic even surfaces “This draft changed in another tab” at src/components/ScriptIDE.tsx:1408.

The implemented boundary is per browser profile/origin storage, not per tab and not per person.

### R2-C12 — Route-limiter invariant has explicit violations

**Severity:** High security/operating invariant  
**Status:** Confirmed

CLAUDE.md:40-41 requires every route to take gameLimiter, or aiLimiter if it can trigger LLM calls.

- GET /health has no limiter: server/routes/config.ts:34.
- GET /metrics has access control but no limiter: server/routes/config.ts:85.
- GET /api/ai-config has no limiter: server/routes/config.ts:136.
- POST /api/ai-config/test triggers generateContent but uses gameLimiter: server/routes/config.ts:158-166.

README intentionally documents /health as no rate limit at README.md:36, so at least that exception is deliberate but contradicts the absolute written invariant. The AI connection-test tier is a direct mismatch with the stricter LLM rule.

### R2-C13 — Pipeline documentation still says 12 passes in live code

**Severity:** Low internal documentation  
**Status:** Confirmed

server/nvm/revision/pipeline.ts correctly declares and runs 14 passes at :157-172, but:

- RevisionResult says “all 12 passes” at :49.
- Function doc says “Run all 12 revision passes” at :113.
- Empty guard says “running 12 passes” at :143-144.

### R2-C14 — Collaboration fallback-secret TTL comment is wrong

**Severity:** Low security documentation  
**Status:** Confirmed

server/lib/collab-auth.ts:12-20 sets and explains a 30-minute token TTL. The fallback-secret comment at :22-25 says restart invalidation is acceptable given a 5-minute TTL. Actual TTL is 30 minutes.

### R2-C15 — StartScreen’s “3,216 rules” is not stale relative to live code, but is stale relative to strategy

**Severity:** High claim-governance ambiguity  
**Status:** Confirmed

src/components/StartScreen.tsx:512 displays “3,216 rules.” ROADMAP.md:49 and :211 label that marketing number stale/inconsistent. The generated live catalog is exactly 3,216.

The defensible strategic objection is that rule count should not be the pitch and the rule channel has weak discrimination. The assertion that 3,216 is no longer the live count is false.

### R2-C16 — Test todo text and strategy prose understate the current composite gap

**Severity:** Low measurement documentation  
**Status:** Confirmed by executable witness

The todo label says the composite gap is approximately 0.0/dead tie. ROADMAP completed history says it opened to +2.2 at :253. The current focused run measured +2.9 (72.9 versus 70.0), still below the required 5.0.

The gate remains unmet; the explanatory numbers are stale.

### R2-C17 — Session identity is a bearer capability with a shared-default fallback

**Severity:** High public-deployment trust boundary  
**Status:** Implemented and partially documented

docs/AUTH.md accurately says possession of the session ID is authorization and there are no accounts. server/lib/session-store.ts:177-227 accepts explicit query/body IDs, then header IDs, then falls back to “default.”

Consequences in implemented behavior:

- Missing identity does not fail closed.
- SSE puts the capability in a query string.
- Anyone with an ID can read/write that session.
- There is no ownership, revocation, cross-device account, or user audit identity.
- Session files are deleted after seven orphaned days by default.

These are not hidden in docs/AUTH.md, but they constrain every claim of private, durable screenplay handling.

### R2-C18 — “Full deterministic core” has a meaningful mode boundary

**Severity:** Medium trust-claim precision  
**Status:** Confirmed

Quick Doctor is deterministic. Deep Doctor performs LLM sensing before deterministic judging at server/routes/scriptide.ts:316-349 and :381-383. Two reports with the same content hash but different modes are explicitly non-comparable at :328-331.

Any report/share/verification UI must preserve quick-versus-deep lineage. The current verification route always recomputes the quick deterministic report, not a deep-sensed report, at server/routes/export.ts:686-759.

### R2-C19 — “Full session” and draft durability are separate mechanisms

**Severity:** Medium operating clarity  
**Status:** Confirmed

README suggests session JSON export is the portable full state. In reality:

- editor text is dual-written to localStorage and ScriptIDE_State;
- session JSON export omits ScriptIDE_State;
- SQLite backup captures the database file more completely;
- Yjs collaboration state is in memory;
- title-page state is nowhere durable.

There is no single operation that currently exports every user-relevant authority.

### R2-C20 — Release gates do not test the shipped container

**Severity:** Medium delivery assurance  
**Status:** Confirmed

CI tests Node source and Vite build. Release repeats those checks, then separately builds/pushes Docker. There is no Docker build/boot/health/import/export smoke in the test job and no post-build container test before push.

The Dockerfile’s runtime-specific choices—Alpine native better-sqlite3, copied dev dependency tree, tsx/npx startup, non-root permissions, data volume, and production static serving—are therefore not exercised by the ordinary CI gate.

## 11. Written system versus running system

| Topic | Written direction/claim | Running system |
|---|---|---|
| Product | One default Doctor + Editor product; OASIS Labs | Dual product; simulation and many expert surfaces directly visible |
| Active phase | P0 only; P1-P4 blocked | Product/UI/reliability commits continued on 2026-07-14; current status docs still say code freeze |
| Rule catalog | 8,917 generated, ~2,300 conceptual | 3,216 distinct live pass-scoped rule constants |
| Wave 1191 | 5,701-rule bulk expansion | Six named detectors in two passes |
| Reproducibility | Same text always same report | Same score/hash under same mode/context/version; timestamps vary |
| Session export | Full, restorable JSON snapshot | Current export rejected by current import and omits major tables |
| Session identity | One random session per tab | One localStorage capability normally shared by same-origin tabs |
| Architecture task | Wave program grows indefinitely | Canonical roadmap says retired/frozen |
| Record parity | Not yet landed | Present and passing |
| P0 readiness | Both blocked and clear | No participant evidence; smoke status artifacts conflict |
| Labs | One future flag | No single Labs gate implemented |
| Route guard | Every route limited; LLM stricter | Three named un-limited routes; AI test on gameLimiter |
| Pipeline | 14 passes | Code runs 14; several live comments still say 12 |

## 12. Git-history reconstruction and drift

The current branch is two commits ahead of origin/main at the snapshot (79e0b64 and d30c2ec audit-design commits). The working tree contains user/parallel-session changes; this phase modified only its owned Phase 2 file.

Recent history is unusually high churn:

- 819 commits dated since 2026-07-01 in the local history.
- Across server, src, tests, and docs in that interval: 1,954 file-change records, about 272,445 additions and 8,259 deletions.
- git shortlog is dominated by automated/agent identities.

This is not, by itself, a quality defect. It explains why line-addressed comments, wave numbers, counts, and “not yet landed” statements drift rapidly and why generated/executable truth must outrank narrative memory.

The rule-count provenance failure is a concrete example:

1. Wave 1191 commit a68a425 lands six detectors.
2. Live rulebook remains a generated 3,216-rule catalog.
3. A separate branch contains 206e00c, “add audited rulebook expansion TODO,” not a merged implementation.
4. b1546c8 rewrites current strategy to say a 5,701-rule expansion already landed.
5. Subsequent roadmap/North Star edits preserve and strengthen that false history.

## 13. Stable reconstruction facts for later phases

The following facts have sufficient internal support to use as premises in external research, comparative cases, red-team review, and redesign analysis:

1. The sharpest intended user/job is a screenwriter seeking private pre-reader coverage.
2. No in-repo participant evidence validates that job or demand.
3. The implemented product remains a dual ScriptIDE + OASIS platform.
4. Quick Doctor is server-side, keyless, deterministic in score/hash logic, and inspectable at rule/formula level.
5. Deep Doctor adds optional LLM sensing and must be treated as a separate lineage.
6. The live generated rule catalog is 3,216 pass-scoped rules.
7. Rule count is not evidence of validity; internal discrimination evidence is synthetic/thin and the real-corpus tests are unavailable here.
8. The score formula is dominated by issue-density/scene-scarcity shaping plus bounded structural deductions; the code records very weak standalone weighted-rule AUC.
9. The current composite min-gap is 2.9 and remains below its 5.0 gate.
10. Current export/import is not a safe or complete round trip.
11. User content/state has multiple authorities: editor, Yjs, local envelope, ScriptIDE_State, simulation ledgers, and exported files.
12. Session privacy is bearer-capability isolation without accounts and with default retention/deletion behavior.
13. CI is strong for keyless source-level regression but not proof of container/deployment, user value, score validity, accessibility, or legal permission.
14. Active docs contain material contradictions; later analysis must cite the exact implementation or executable evidence, not merely “canonical” status.

## 14. Phase boundary

This document reconstructs the repository as implemented and records internal contradictions. It intentionally does not:

- select a final product future,
- import external screenplay-workflow, market, legal, or competitor conclusions,
- claim writer demand or score validity,
- prescribe score thresholds or rule removal,
- implement fixes,
- or convert historical research plans into active direction.

Those actions belong to later phases under the Phase 1 protocol and must begin from the corrected facts above.
