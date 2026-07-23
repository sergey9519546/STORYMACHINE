# STORYMACHINE: Absolute High-End Repository, Research, and Upgrade Audit

<!-- claim_intent_manifest: {"manifest_version":"1.0","manifest_id":"M-2026-07-15T08:00:00Z-report-compiler","emitted_by":"report_compiler_agent","emitted_at":"2026-07-15T08:00:00Z","claims":[{"claim_id":"C-001","claim_text":"STORYMACHINE has strong bounded software mechanics but no established real-writing validity for its headline score.","intended_evidence_kind":"repository-executed","planned_refs":["A18","G01"],"negative_constraints":[{"constraint_id":"NC-C001-1","rule":"Do not equate test count or determinism with score validity."}]},{"claim_id":"C-002","claim_text":"Current recovery, build-context, and AI-resource boundaries contain confirmed critical defects.","intended_evidence_kind":"repository-executed","planned_refs":["G02","G03","G04"]},{"claim_id":"C-003","claim_text":"No direct writer demand has been documented at the audit snapshot.","intended_evidence_kind":"repository-record","planned_refs":[],"negative_constraints":[{"constraint_id":"NC-C003-1","rule":"Do not infer demand from external studies or competitor offerings."}]},{"claim_id":"C-004","claim_text":"The receipt and located-evidence substrate is the strongest implemented product asset, while its writer value remains hypothetical.","intended_evidence_kind":"repository-inference","planned_refs":["A24","A25"]},{"claim_id":"C-005","claim_text":"The correct current strategy is critical repair plus bounded sample-only P0 followed by a next gated experiment or stop decision; that lane cannot itself select a product future.","intended_evidence_kind":"decision-analysis","planned_refs":[]},{"claim_id":"C-006","claim_text":"None of the three product futures is selected or launch eligible.","intended_evidence_kind":"decision-analysis","planned_refs":[]},{"claim_id":"C-007","claim_text":"External evidence sets design and evaluation burdens but does not establish STORYMACHINE efficacy.","intended_evidence_kind":"research-synthesis","planned_refs":["A02","A10","A18","A25","A26"]},{"claim_id":"C-008","claim_text":"Visible speed, report breadth, and scoring features are common in the reviewed market and therefore weak publicly observable differentiation.","intended_evidence_kind":"market-observation","planned_refs":["P01","P02","P03","P04","P05","P06"]}],"manifest_negative_constraints":[{"constraint_id":"MNC-1","rule":"No product efficacy, legal compliance, breach, demand, or market-commoditization claim beyond the audited evidence."},{"constraint_id":"MNC-2","rule":"No product future selected before P0 and applicable gates."},{"constraint_id":"MNC-3","rule":"No 83.0 score without adjacent owner-prior, correlated-criteria, and mixed-time caveat."}]} -->

**Audit snapshot:** 2026-07-14 through 2026-07-15

**Repository baseline:** branch `main`, audit-start state recorded in [Phase 1](./PHASE_1_SCOPE.md)

**Scope:** whole repository, executable behavior, git history, product claims, architecture, security/privacy, content integrity, data/evaluation, UX/accessibility, operations, market evidence, legal-risk signals, and strategic futures

**Decision posture:** evidence-bounded; current code and executed witnesses outrank narrative prose; noncompensable gates outrank weighted scores

**Evidence labels.** `[Fact—executed]` is a reproduced runtime or command witness. `[Fact—code]` is a direct implementation/configuration trace. `[Fact—repo]` is a repository document, generated artifact, or git-history fact. `[Fact—external]` is a bounded finding from a verified outside source. `[Inference]` connects facts without claiming direct measurement. `[Hypothesis]` requires prospective evidence. `[Gap]` identifies missing proof or capability. `[Risk]` identifies a credible failure path; it is not proof that harm or a legal violation occurred.

**Responsible use and handling.** This detailed internal audit is for defensive
remediation. It identifies live technical weakness paths that could be misused
against an exposed deployment. Until G-001, G-002, G-005, G-006, G-007, and
G-017 are fixed, disabled, or otherwise mitigated, restrict the detailed copy to
people responsible for remediation; do not expose a live instance; remove
secrets and deployment identifiers from any shared copy; coordinate external
disclosure with the owner; and preserve evidence. A public edition should state
risk and verified remediation without unnecessary reproduction detail. Do not
use this report's score or future analysis to judge writers or allocate
opportunity.

**AI, commissioning, and conflict disclosure.** OpenAI Codex, operating through
a GPT-5-based delegated-agent workflow, accessed the repository and public
sources on 2026-07-14 and 2026-07-15. Delegated AI agents performed repository
inspection, command execution/testing, web research, source screening and
verification, synthesis, drafting, adversarial review, editorial review, and
ethics review; the same workflow may recommend and implement remediation. The
product owner commissioned an audit of their own repository, set and authorized
the scope, and has a product interest. The owner did not independently validate
the commands, sources, reasoning, or conclusions. No independent human
screenwriter, lawyer, security assessor, accessibility specialist, ethics
committee, or editor validated this report. Cited sources and executable claims
were machine-checked and remain owner-reviewable. External funding and financial
relationships for this audit were not independently established. Several
academic sources involve developer-evaluators, benchmark creators, method
advocates, or institutional/industry affiliations (including A02, A05,
A10-A12, A22-A23, A30, and supplemental S01); their effects are bounded in the
source register and are not treated as misconduct or product-efficacy proof.

## 1. Executive Verdict

### Direct assessment

**[Fact—executed]** The bounded mechanical baseline is broad: 9,507 tests
passed with zero failures. Seventy-two real-corpus assertions skipped, one
discrimination test remained a todo, the metamorphic runner tolerated one
failed invariant, and the live synthetic strong-versus-weak gap was about 2.9
against a 5.0 gate ([BASELINE_VERIFICATION.md:7-60](./BASELINE_VERIFICATION.md#results)).

**[Fact—repo] [Gap]** No completed writer session establishes direct demand,
and no rights-clean, independently labeled, held-out real-writing benchmark
establishes the headline score's interpretation or use. STORYMACHINE is
therefore not demand-validated or score-valid at this snapshot.

**[Inference] [Gate judgment]** Under the declared noncompensable content,
confidentiality, identity, accessibility, evidence, and legal/data-permission
gates, the current artifact is not own-draft/private-beta ready or public-launch
ready. This is a no-ship judgment from verified failures and missing evidence,
not one executed-test result.

The central idea divides into two claims:

1. **Sound but unvalidated product hypothesis:** a writer may benefit from private, immediate, located, versioned revision evidence that can be challenged and compared across drafts. STORYMACHINE already contains meaningful parts of that substrate.
2. **Unsupported current authority claim:** Health/100, percentile, grade, and PASS/CONSIDER/RECOMMEND have not been shown to measure professional screenplay readiness on real drafts. The calibration reference contains 20 hand-authored controlled samples, not a population or industry benchmark ([PHASE_2_PRODUCT_UX_FINDINGS.md:21-42](./PHASE_2_PRODUCT_UX_FINDINGS.md#px-01--authoritative-score-language-exceeds-the-validation-evidence); `server/nvm/analyze/calibration/corpus.ts:1-76`; `server/nvm/analyze/calibration/reference.ts:4-14`).

**[Fact—executed] The most serious immediate weakness is not theoretical.** Current export emits schema 13, import refuses anything newer than schema 6, and a malformed accepted-version import was reproduced destroying valid destination state before failing. The export called a “full session snapshot” also omits major state authorities. **[Fact—code]** ScriptIDE's normal simulation-start path calls `/api/reset`, whose `destroySession` deletes the entire database that also owns `ScriptIDE_State`; its pre-delete copy also bypasses the tested WAL-safe backup ([PHASE_2_QUALITY_OPERATIONS_FINDINGS.md:134-294](./PHASE_2_QUALITY_OPERATIONS_FINDINGS.md#4-findings); `server/routes/config.ts:318-345`; `server/engine/Stage.ts:250-266,1338-1370`; `server/routes/game.ts:475-486`; `src/components/ScriptIDE.tsx:1184-1204`; `server/lib/session-store.ts:160-169`).

**[Fact—code] The most serious confidentiality and resource boundaries are also concrete.** There is no `.dockerignore` while the builder executes `COPY . .`; ignored draft databases, `.env` files, logs, VCS history, and host dependencies can enter a Docker build context. Three reachable generative routes use the ordinary limiter, provider fan-out is not bounded by request count, and raw provider-test errors can enter logs ([PHASE_2_SECURITY_PRIVACY_FINDINGS.md:21-69,128-148](./PHASE_2_SECURITY_PRIVACY_FINDINGS.md#critical-and-major-findings)). These are confirmed exposure paths and risks, not evidence that a breach or secret disclosure already occurred.

**[Fact—repo] The most serious strategic weakness is zero direct demand evidence.** No recruited, scheduled, completed, valid, documented P0 writer sessions exist at this snapshot. P1 through P4 remain blocked by the active roadmap ([PHASE_2_REPOSITORY_RECONSTRUCTION.md:120-160](./PHASE_2_REPOSITORY_RECONSTRUCTION.md#3-actual-product-objective-user-and-product-status); [ROADMAP.md](../../../ROADMAP.md)). External studies and competitor pages cannot manufacture demand for this product.

### Strongest opportunity

The strongest implemented opportunity is not the 3,216-rule count or a polished grade. It is the combination of keyless deterministic analysis, exact issue locations, content hashes, build identity, server recomputation, root-cause grouping, versioned before/after receipts, and an editor in which a writer can accept, reject, challenge, or reverse a change. **[Inference]** Those assets support multiple futures: bounded automated evidence for A, machine-prepared evidence for an accountable reader in B, or a reflective workflow in C. Whether writers value any contract is still a `[Hypothesis]`.

### Required strategic direction

The required direction is a sequence, not a product selection:

1. **Certify, then run the sample-only P0 lane** without collecting a participant draft. Obtain the applicable ethics determination; use accessible consent/stimulus/data handling; begin with unaided job, frequency, urgency, workaround, cost, and last-behavior questions; then disclose that the sample and scalar are experimental and synthetically calibrated. The lane yields only directional pre-behavioral pull and authority-contract evidence. It cannot establish committed demand, select A/B/C, or observe actual use, payment, or return.
2. **Repair or disable irreversible trust-boundary defects now.** Retire POST JSON import with unconditional non-mutating 410 and label export a non-recoverable simulation observation. Disable reset until it is a transactional simulation-only clear that preserves writer/editor/project state under one per-session mutation coordinator and verified WAL-safe backup. Add a deny-by-default Docker context, disable or budget every generative route, sanitize logging, fix false persistence outcomes, isolate validation tests, and enforce critical modal accessibility.
3. **Keep every own-draft/private-beta lane blocked** until recovery, data-flow and privacy notice, provider consent, identity/deletion/rotation, content-manifest, and critical accessibility controls pass on the exact artifact.
4. **Design the next gated experiment or stop after P0.** A negative or ambiguous result authorizes no product build. Directional evidence may justify designing a no-code C comparison, a secure manual B experiment, or a P1 feasibility plan for A, but sample-only P0 selects none of them. Each requires a later valid gate.

No future is selected. Hold/stop is the current control.

## 2. Current-State Reconstruction

### Product and user boundary

**[Fact—repo] Declared target.** The active strategy targets screenwriters who want private, immediate pre-reader feedback through Doctor + Editor. Demand has not been observed. The running product does not yet match the intended narrow boundary: the first screen exposes both ScriptIDE/Doctor and StoryMachine/OASIS, and OASIS remains reachable as a primary mode rather than a Labs-only surface (`src/App.tsx:146-166`; `src/components/StartScreen.tsx:454-542`; [reconstruction:148-175](./PHASE_2_REPOSITORY_RECONSTRUCTION.md#3-actual-product-objective-user-and-product-status)).

**[Fact—code] Implemented journeys.** The writer can import or paste screenplay material, configure story context, enter ScriptIDE, save draft state, run quick or deep Doctor analysis, inspect issues, invoke fix-and-verify/revision flows, and export outputs. A separate simulation journey creates agents, world state, turns, interviews, rooms, and generated screenplay output. These are two different product contracts sharing one application.

### Runtime topology

| Layer | Current responsibility | Current authority or boundary | Audit judgment |
|---|---|---|---|
| React/TypeScript/Vite client | Start screen, ScriptIDE, panels, local draft envelope, settings, exports | Browser `localStorage`, React component state, session capability | Broad and capable; authority is fragmented and critical browser behavior is not exercised in CI. |
| Express/TypeScript server | Validation, rate limiting, session resolution, deterministic and generative routes, metrics/admin gates | Per-request route middleware plus process-local registries | Strong guards in many routes; capability taxonomy is manual and has confirmed violations. |
| Stage/SQLite engine | Simulation agents, locations, memory, turn state, selected export/import projection | One SQLite database per session, user schema currently 13 | Durable for its declared tables; recovery projection and schema authority are broken. |
| ScriptIDE server state | Draft envelope and optimistic concurrency | `ScriptIDE_State`, separate from Stage export | Sound stale-save rejection; omitted from alleged full snapshot. |
| Collaboration | Yjs room state | Process memory, with separate persistence behavior | Useful but not included in a complete durable aggregate; multi-instance behavior is undefined. |
| NVM analysis/revision | Parser, Doctor, 14-pass revision pipeline, calibration, coverage and receipts | Quick deterministic path; deep model-assisted measurement plus deterministic aggregation | Mechanically substantial; score interpretation/use is unvalidated. |
| Provider layer | Gemini and multi-provider model calls | Server-side keys; optional deep/simulation calls | Keys stay server-side, but budget, lineage, consent, and failure semantics need stronger controls. |

The detailed module census and paths are in [PHASE_2_REPOSITORY_RECONSTRUCTION.md:241-389](./PHASE_2_REPOSITORY_RECONSTRUCTION.md#5-system-and-module-reconstruction).

### Analysis and decision flow

**Quick Doctor.** Fountain text enters a zod-validated server route, is normalized and parsed, then the deterministic Doctor computes issue findings, category summaries, health, grade, verdict, percentile reference, and receipts. Under the same normalized input, mode, context, formula/rule version, and build, the analytic result is reproducible. Serialized report bytes are not identical because timestamps are regenerated (`server/nvm/analyze/doctor.ts:1816,1897-1902,1932,1972-1977`).

**Deep Doctor.** The model supplies semantic fields that can affect later deterministic rules. The accurate contract is “model-assisted measurement followed by deterministic aggregation,” not “the model senses while rules alone judge.” Quick and deep modes therefore need separate lineage, stability, and validity evidence (`server/routes/scriptide.ts:316-383`; `server/routes/export.ts:686-759`; [reconstruction:549-551,836-843](./PHASE_2_REPOSITORY_RECONSTRUCTION.md#8-decision-and-scoring-flow)).

**Score formula.** Scene scarcity can dominate the health result. With no issues, a document below ten scenes cannot reach the 85 RECOMMEND boundary under the current formula. The request does not carry writer intent, draft stage, audience, form, target length, or note question. `[Inference]` A short, excerpt, pilot fragment, or partial draft can therefore be penalized for document form/completeness while the output reads as craft judgment ([PHASE_2_TWELVE_PERSPECTIVES.md:110-159,424-482](./PHASE_2_TWELVE_PERSPECTIVES.md#pass-a--screenplay-domain-expert); `server/nvm/analyze/doctor.ts:337-425,593-601`).

### State and recovery model

There is no single authoritative “project” aggregate. Screenplay body, title-page fields, ScriptIDE envelope, Stage simulation state, Story Commits, collaboration rooms, caches, and browser state have different owners and lifetimes. Title, author, and contact are React-only state that feed export but reset after reload. Session identifiers are bearer capabilities stored in same-origin `localStorage`; contrary to existing prose, they normally span tabs in the same browser profile. A missing ID can fall back to shared `default`. This architecture can be bounded for a private single-instance trial, but it is not a public/team identity model ([reconstruction:442-490,751-834](./PHASE_2_REPOSITORY_RECONSTRUCTION.md#7-state-persistence-and-authority)).

### Assurance and operational posture

The default CI gate runs type checking, a `server/**` console prohibition, keyless tests, metamorphic tests, and a production build. It does not run the private real-corpus suite, browser/a11y/visual tests, the opt-in HTTP journey, or a built-container boot/persistence test. Release rebuilds a separate image, can publish mutable semantic/latest tags from manual dispatch, and emits no SBOM, signature, or provenance. Production uses the full development dependency tree and `tsx`. `/health` proves process life, not writable persistence or restart recovery ([BASELINE_VERIFICATION.md:39-60](./BASELINE_VERIFICATION.md#cirelease-coverage-snapshot); [PHASE_2_QUALITY_OPERATIONS_FINDINGS.md:407-508](./PHASE_2_QUALITY_OPERATIONS_FINDINGS.md#qo-08--release-tags-are-mutable-and-the-published-container-is-not-the-tested-artifact)).

### Current state machine

| State | Evidence | Allowed action |
|---|---|---|
| Mechanical baseline | Green for many bounded deterministic paths | Preserve and extend only where a verified boundary requires it. |
| Sample-only P0 | Zero completed sessions; exact-commit readiness records conflict | Reconcile certification, disclose experimental status, collect no participant draft, then run. |
| Own-draft/private beta | Integrity, confidentiality, identity, data-lifecycle, and accessibility gates fail or are not demonstrated | Block. |
| P1 score validation | Rights-clean benchmark absent; construct unresolved | Block until P0 produces directional need for a consequential automated judgment. |
| P2 product collapse | Strategy exists; runtime remains dual product | Block until roadmap gate. |
| Public launch | Multiple noncompensable gates fail | No ship. |

## 3. What Is Already Strong

The audit does not recommend a wholesale codebase rewrite. It recommends preserving the parts that already create verifiable leverage.

1. **Keyless deterministic front door.** `[Fact—code]` The server deliberately boots without an AI key. Doctor, diagnose, coverage, what-if, room, and receipt surfaces remain usable without a provider. This is both a product and confidentiality advantage when stated accurately ([PHASE_2_REPOSITORY_RECONSTRUCTION.md:420-438](./PHASE_2_REPOSITORY_RECONSTRUCTION.md#6-inputs-outputs-and-boundaries)).
2. **Server-side secret boundary.** Provider keys are not serialized to the client. Public configuration exposes readiness/booleans, and `llmReady` correctly ORs the environment and runtime provider-key sources. This invariant should be mechanically protected (`server/lib/ai-config.ts`; [security strengths:162-177](./PHASE_2_SECURITY_PRIVACY_FINDINGS.md#strengths-that-must-not-regress)).
3. **Strong ingress discipline.** Many routes use zod schemas, body/resource bounds, SSRF revalidation, and rate limiting. Focused ingress/validation/resource tests passed 115 cases. The flaw is incomplete classification, not absence of discipline ([BASELINE_VERIFICATION.md:7-17](./BASELINE_VERIFICATION.md#results); [PHASE_2_SECURITY_PRIVACY_FINDINGS.md:162-177](./PHASE_2_SECURITY_PRIVACY_FINDINGS.md#strengths-that-must-not-regress)).
4. **Inspectable receipts.** Issues have locations; reports carry hashes/build identity; server recomputation can verify analysis; root-cause clusters and before/after revision evidence exist. These assets support contestability and third-party verification better than opaque prose ([PHASE_2_PRODUCT_UX_FINDINGS.md:237-254](./PHASE_2_PRODUCT_UX_FINDINGS.md#product-strengths-to-preserve); [PHASE_2_REPOSITORY_RECONSTRUCTION.md:404-418,553-564](./PHASE_2_REPOSITORY_RECONSTRUCTION.md#6-inputs-outputs-and-boundaries)).
5. **Optimistic draft concurrency.** The authoritative ScriptIDE save path rejects stale updates and preserves the winning state. The legacy mirror’s error coupling should be fixed without weakening this core ([PHASE_2_QUALITY_OPERATIONS_FINDINGS.md:81-91](./PHASE_2_QUALITY_OPERATIONS_FINDINGS.md#qo-s02--draft-saves-have-a-real-optimistic-concurrency-core)).
6. **Correct online-backup primitive already exists.** `server/lib/backup.ts` uses SQLite’s online backup API. Simulation reset and authorized project deletion must use the primitive under the new mutation coordinator without retaining their current over-broad scope ([PHASE_2_QUALITY_OPERATIONS_FINDINGS.md:114-130,267-294](./PHASE_2_QUALITY_OPERATIONS_FINDINGS.md#3-what-is-strong)).
7. **Resource and runtime basics.** Non-root container execution, CSP and other headers, request-size controls, graceful server patterns, and operational metrics are useful foundations ([PHASE_2_QUALITY_OPERATIONS_FINDINGS.md:93-130](./PHASE_2_QUALITY_OPERATIONS_FINDINGS.md#3-what-is-strong)).
8. **Reduced-motion and UI foundations.** The interface has useful keyboard and motion-conscious elements. The remaining modal contract is bounded and testable rather than requiring a wholesale redesign ([PHASE_2_QUALITY_OPERATIONS_FINDINGS.md:103-113,337-405](./PHASE_2_QUALITY_OPERATIONS_FINDINGS.md#3-what-is-strong)).
9. **Extensive executable discipline.** 9,507 passing tests are real engineering value. They prove many local mechanics and protect the 14-pass pipeline. They should be retained while assurance language is split into mechanical, deployment, and outcome channels ([BASELINE_VERIFICATION.md](./BASELINE_VERIFICATION.md)).
10. **Decision receipts and reversibility.** Accepted/rejected revision actions and comparisons can become longitudinal evidence without treating the engine’s own score delta as proof of better writing ([PHASE_2_REPOSITORY_RECONSTRUCTION.md:553-564](./PHASE_2_REPOSITORY_RECONSTRUCTION.md#8-decision-and-scoring-flow)).
11. **Demand-first roadmap correction.** `[Fact—repo]` The active roadmap has already retired rule-wave expansion and places real-writer learning before engine work. That strategic control is correct even though part of the historical arithmetic supporting it was false ([ROADMAP.md](../../../ROADMAP.md); [PHASE_2_REPOSITORY_RECONSTRUCTION.md:122-146](./PHASE_2_REPOSITORY_RECONSTRUCTION.md#32-current-validation-state)).
12. **Capacity to become auditable.** The repository already carries build identity, generated rulebook checks, content hashes, test fixtures, and structured outputs. A claim/evidence registry and portable aggregate can extend existing patterns rather than starting over ([PHASE_2_REPOSITORY_RECONSTRUCTION.md:404-418,553-564](./PHASE_2_REPOSITORY_RECONSTRUCTION.md#6-inputs-outputs-and-boundaries); [PHASE_2_QUALITY_OPERATIONS_FINDINGS.md:41-130](./PHASE_2_QUALITY_OPERATIONS_FINDINGS.md#3-what-is-strong)).

These strengths deserve preservation because they reduce the cost of learning and future validation. None independently proves that the score is correct, that writers want the product, or that public deployment is safe.

## 4. Critical Findings

| Rank | Finding | Evidence and consequence | Required disposition |
|---:|---|---|---|
| 1 | **Destructive import and over-broad simulation reset** | `[Fact—executed]` Export schema 13 is rejected by import max schema 6 and malformed schema-6 input erased valid state. `[Fact—code]` ScriptIDE calls `/api/reset` for simulation, but it deletes the entire DB including `ScriptIDE_State`; a WAL-safe backup alone would preserve the wrong destructive scope. | **FIX NOW:** POST import returns unconditional non-mutating 410; export is a non-recoverable simulation observation. Disable reset until a transactional simulation-only clear preserves project/editor state under one per-session mutation coordinator and verified online backup. Future project deletion and portable envelope remain separately named/gated. |
| 2 | **Headline score lacks a validity argument** | `[Fact—repo]` Synthetic 20-sample calibration, skipped real corpus, 2.9 synthetic gap below 5.0, scene-scarcity confound, no writer intent/form, no held-out multi-reader real-draft result. A reproducible wrong verdict can be more persuasive. | Label/withhold authority now; no retuning. P1 only after directional P0 and a separately gated experiment demonstrates need for consequential automated judgment, with rights-clean preregistered evidence. |
| 3 | **No direct demand evidence** | `[Fact—repo]` Zero valid P0 sessions. The no-draft sample lane can observe directional pre-behavioral reactions only, not use, payment, return, retention, or future selection. | Certify and obtain ethics/consent/data/accessibility controls, then run unaided discovery plus honestly framed sample P0. It can clear only the narrow interview gate or authorize design of the next gated experiment; branch/stop remains later. |
| 4 | **Docker context crosses the confidential-work boundary** | `[Fact—code]` No `.dockerignore`, `COPY . .`, ignored drafts/secrets/logs/VCS/host modules in normal context scope. | Deny by default and assert effective exclusions before any workspace image build. |
| 5 | **AI request rate does not bound model fan-out** | `[Fact—code]` Generative turn, simulation, and provider-test routes use `gameLimiter`; internal calls can multiply within one request. | `aiLimiter` for every model path plus call/concurrency/token/time/cancellation budgets and a route-classification test. |
| 6 | **No enforceable confidential-draft product contract** | `[Gap]` No tracked deployment-true notice covers storage, providers, human access, retention/deletion, backups, training/secondary use, subprocessors, regions, or incidents. | Keep sample P0 no-draft; block own-draft exposure until data map, notice, controls, drill, and qualified review. |
| 7 | **State authority is fragmented** | `[Fact—code]` Browser, ScriptIDE, Stage, title metadata, collaboration, caches, and commits have different lifetimes; export and backup do not cover one declared aggregate. | Define `ProjectEnvelope`, durable/rebuildable/excluded classes, ownership, version, synchronization, and recovery invariants. |
| 8 | **Writer intent and document form are absent from judgment** | `[Fact—code]` Doctor receives body/mode but not task, stage, audience, form, target length, or note question. Scene scarcity can dominate. | Declare supported domain and abstain outside it; collect intent in research; validate before formula changes. |
| 9 | **Public/team identity and deletion are absent** | `[Fact—code]` Bearer session capability, shared-default fallback, SSE query transport, no ownership/revocation/account/audit identity. | Bound to private trial; add exposure-triggered identity, rotation, revocation, least privilege, audit, and deletion before public/team use. |
| 10 | **UI assurance excludes the real critical journey** | `[Fact—code]` HTTP-only E2E; no browser, axe, focus, keyboard, visual, persistence/reload, or export gate. Core modals lack complete semantics/focus behavior. | Add a small browser gate and shared modal primitive before interpreting field behavior as representative. |
| 11 | **Canonical governance contains disproven history** | `[Fact—repo]` Live generated catalog is 3,216 pass-scoped constants; 8,917/5,701 Wave history is unsupported by the actual commit. Other prose says 12 passes, full snapshot, tab isolation, and byte reproducibility contrary to code. | Correct governing documents. Preserve rule freeze for independent score-validity reasons. |
| 12 | **Release identity does not identify the tested artifact** | `[Fact—code]` Manual release can overwrite tags from arbitrary refs; published image is separately rebuilt and not boot/persistence-tested; no provenance. | Hold public release until build-once/promote, immutable digest, container qualification, SBOM/signature/provenance. |

The full implementation register is [PHASE_3_GAP_REGISTRY.md](./PHASE_3_GAP_REGISTRY.md). The full adversarial register is [PHASE_3_FAILURE_MODE_REGISTER.md](./PHASE_3_FAILURE_MODE_REGISTER.md).

## 5. Complete Gap Registry

The table includes every gap from the 31-row
[implementation-ready gap registry](./PHASE_3_GAP_REGISTRY.md#complete-registry)
using the directive's exact eight fields. “Certain” applies to the witnessed
behavior or inspected implementation, not to unobserved harm.

| Gap | Category | Evidence | Consequence | Root cause | Correction | Priority | Confidence |
|---|---|---|---|---|---|---|---|
| **G-001: incompatible version domains** | Recovery/versioning | EX+DC; `server/engine/Stage.ts:94-99`; `server/routes/config.ts:318-335` | Current export rejects itself; old code can touch a future DB. | Hard-coded import max; DB and portable-envelope versions conflated; DDL precedes future-version refusal. | POST import returns non-mutating 410. Define `dbSchemaVersion` and `projectEnvelopeVersion`; reject future DB before DDL/write and prove unchanged bytes. | **FIX NOW** | Certain |
| **G-002: destructive JSON import** | Recovery/transactions | EX+DC; [PX:157-174](./PHASE_2_PRODUCT_UX_FINDINGS.md#px-07b--a-malformed-accepted-version-import-destroys-the-live-session-first) | Accepted malformed input erases valid state. | Shallow nested validation and delete-before-insert ordering. | Retire route with unconditional 410. Future envelope importer is separately gated for isolated validation, coordinator, atomic swap, and failure preservation. | **FIX NOW** | Certain |
| **G-003: partial export called full** | State authority/transport | DC+XR; `server/engine/Stage.ts:1338-1370`; [QO:232-265](./PHASE_2_QUALITY_OPERATIONS_FINDINGS.md#qo-03--full-session-snapshot-omits-current-canonical-and-editor-state) | A “successful” artifact omits or regenerates durable/FK/history state and can exceed import transport. | No generated aggregate/field/FK/history/size manifest or portable-project contract. | Relabel as non-recoverable simulation observation; define a separately versioned envelope and transport that accepts its maximum artifact. | **FIX NOW** | High |
| **G-004: over-broad reset, no mutation coordinator, unsafe backup** | Reset/content integrity | DC+XR; `src/components/ScriptIDE.tsx:1184-1204`; `server/routes/game.ts:475-486`; `server/lib/session-store.ts:160-169` | Normal simulation start can delete `ScriptIDE_State` and race other writes; raw backup may miss WAL. | Simulation reset calls whole-session `destroySession`; turn queue does not serialize reset/import/save/room/config/turn writes. | Disable reset; implement transactional simulation-only clear preserving project/editor state, separate confirmed project deletion, real per-session mutation coordinator, verified online backup, concurrent/failure tests. | **FIX NOW** | Certain |
| **G-005: Docker context confidentiality** | Build security | DC; Dockerfile `COPY . .`; no `.dockerignore` | Drafts, secrets, VCS, logs, host modules can cross builder/cache boundary. | Git ignore mistaken for Docker-context policy. | Deny-by-default `.dockerignore`; sentinel inspection and successful build. | **FIX NOW** | Certain |
| **G-006: unbounded generative fan-out** | AI resource control | DC; [ST:21-47](./PHASE_2_SECURITY_PRIVACY_FINDINGS.md#st-01--generative-routes-use-the-ordinary-limiter) | One request can multiply spend, latency, or denial of service. | Ordinary limiter class and no engine call/concurrency/token/time/cancel budget. | Disable affected routes until `aiLimiter`, route taxonomy, and adversarial engine-budget tests pass. | **FIX NOW** | Certain |
| **G-007: raw provider-error logging** | Logging/privacy | DC; `server/routes/config.ts:169-175` | Secret-shaped upstream data may enter logs. | Client sanitization not reused by logger. | Central safe-error logger; sentinel tests for client and captured logs. | **FIX NOW** | Certain path; harm bounded |
| **G-008: AI-config/admin contract mismatch** | Configuration/API | DC; [QO:632-663](./PHASE_2_QUALITY_OPERATIONS_FINDINGS.md#qo-15--ai-config-post-response-violates-the-clients-declared-response-shape) | UI falsely reports readiness or advertises actions guaranteed to 401 securely. | GET/POST schema drift and browser admin model does not match token-protected server. | Limit GET, shared parsed response, operator-only/read-only UI or real admin session; never weaken auth. | **FIX NOW** | Certain |
| **G-009: cleared upload resurrects** | Content intent | DC; `src/components/StartScreen.tsx:113-122` | Cleared content can reappear and later transfer. | Parent drop reader and child clear use different cancellation ownership. | One shared generation/abort owner; delayed and concurrent manifest tests. | **FIX NOW** | High |
| **G-010: authoritative save reported failed** | Draft persistence | DC; `src/lib/scriptide-draft-store.ts:87-95` | UI blocks or alarms after durable save succeeded. | Legacy mirror outcome overrides primary envelope truth. | Typed primary/mirror outcome or best-effort mirror; fault-injection caller tests. | **FIX NOW** | High |
| **G-011: title-page state volatile** | Editor persistence | DC; `src/components/ScriptIDE.tsx:228-232,306-318` | Reload/export/import loses professional metadata. | Title/author/contact live only in React state. | Version/migrate into authoritative draft/project state; Unicode conflict/reload/export tests. | **FIX NOW** | Certain |
| **G-012: E2E pollutes runtime data** | Test isolation | EX+DC; `tests/e2e/journeys.test.ts:16-18,81-114` | Tests collide with or contaminate developer/user data. | Fixed port/session and default persistence directory. | Dynamic port, unique temp store, graceful cleanup; parallel/twice no-delta test. | **FIX NOW** | Certain |
| **G-013: modal accessibility incomplete** | Accessibility | DC; `src/components/StartScreen.tsx:751-794`; `src/components/SettingsPanel.tsx:613-629` | Keyboard/screen-reader users lose context or cannot complete tasks. | No shared enforced dialog/focus contract. | Tested modal primitive; keyboard/axe and representative AT smoke. | **FIX NOW** | High |
| **G-014: no browser critical-path gate** | UI assurance | DC+XR; CI/package inventory | Green HTTP tests miss rendered upload/analyze/save/export and accessibility failures. | “E2E” is API-only. | Browser semantic journey, axe, keyboard, persistence/reload/export, targeted visual assertions. | **FIX NOW** | Certain |
| **G-015: canonical truth drift** | Governance/claims | EX+DC+XR; Amendments 01-03; [reconstruction:611-817](./PHASE_2_REPOSITORY_RECONSTRUCTION.md#10-claim-and-contradiction-registry) | Agents and users act on false history and guarantees. | Narrative memory outranks generated/executable evidence. | Stage 0 minimal supersession before code; full canonical correction after verified implementation; staleness tests. | **FIX NOW** | Certain |
| **G-016: no confidential-draft lifecycle contract** | Privacy/legal operations | DC+XR+LR; [ST:83-107](./PHASE_2_SECURITY_PRIVACY_FINDINGS.md#st-04--confidential-screenplay-handling-lacks-a-public-product-contract) | Writer cannot give informed own-draft consent. | No deployment-true data/provider/reader/backup/deletion/incident authority. | Private no-draft lane; data/subprocessor map, notice, contracts, deletion drill, qualified fact-specific review before own draft/public use. | **sample-only P0 / own-draft gate** | High gap; applicability fact-specific |
| **G-017: bearer capability is not public identity** | Identity/deployment | DC; [ST:109-126](./PHASE_2_SECURITY_PRIVACY_FINDINGS.md#st-05--session-identifiers-are-bearer-capabilities-not-user-authentication) | Leakage grants session authority; no owner/revocation/audit. | Trial capability model and shared-default fallback. | Bound private topology; authenticated ownership/rotation/revocation/least privilege before public/team exposure. | **sample-only P0 / own-draft gate** | Certain |
| **G-018: zero demand evidence** | Demand/governance/ethics | DC+XR; zero-session records; P-14/FM-21 | Product direction unselected; sample reaction can be laundered into committed demand. | Conflicting certification and solution-primed no-draft design without full ethics/data/accessibility controls. | Certify and obtain applicable ethics/consent/data/accessibility controls; unaided discovery then sample. Report directional pre-behavioral evidence only. | **sample-only P0** | Certain zero-session state |
| **G-019: unsupported scalar authority** | Score claims | DC+EX+XR+LR; synthetic corpus/reference | Writers may infer professional/population validity that does not exist. | Synthetic calibration presented as Health/grade/percentile/verdict. | Label/withhold now; claim-specific P1 with domain, uncertainty, abstention and monitoring. | **P1** | Certain gap |
| **G-020: intent/form/completeness confound** | Construct validity | DC+XR; Doctor request/formula | Document type can masquerade as craft. | Missing task/form/stage metadata plus scene-scarcity term. | Declare domain/abstain; collect intent; length/form-matched held-out evaluation before formula change. | **P1** | Certain mechanism; harm unmeasured |
| **G-021: rights-clean benchmark absent** | Data/evaluation rights | DC+XR+LR; no qualifying corpus | Automated authority cannot be audited; analytic flexibility or leakage can create false promotion. | No rights ledger, crossed reader design, preregistered endpoint/power/missingness/multiplicity/analysis-hash controls. | Rights/co-rights and reidentification controls; grouped holdout; ≥3 crossed readers; immutable analysis; all endpoints; fresh confirmation. | **P1** | Certain absence |
| **G-022: real-corpus evidence skips** | Evaluation/CI | EX+DC; [baseline:19-37](./BASELINE_VERIFICATION.md#what-the-green-suite-does-not-prove) | Green CI can be misreported as real-writing evidence. | Env-gated private corpus and positive-floor-heavy manifest. | Separate “not evaluated”; protected balanced job with zero silent skips. | **P1** | Certain |
| **G-023: deep lineage/drift unvalidated** | Model safety | DC+XR+LR; quick/deep path trace | Judgment can change without source release. | Model semantic fields affect rules without full canary/fallback/lineage evidence. | Provider/model/prompt/fallback receipts, reruns, hostile-content canaries, abstention; validate separately. | **P1** | Certain path; rates unknown |
| **G-024: self-confirming revision outcome** | Causal evaluation | XR+LR; score-loop analysis | Tool can optimize its own detector while writing worsens. | Same engine suggests and evaluates change. | Blinded paired judgment against writer goal; report nulls, reversals, harms, disagreement. | **P1** | Strong inference |
| **G-025: dual-product/demo contamination** | Product boundary | DC+XR; StartScreen/runtime | P0 attribution blurs and demo can look user-measured. | OASIS and Doctor both default; fixed values insufficiently separated. | One P0 job and illustrative labels now; any Doctor/Labs change only after valid branch. | **P2** | Certain current state |
| **G-026: count/authority positioning** | Product claims | DC+XR; PX/market benchmark | Common visible features obscure actual receipt strengths and overstate proof. | Quantity and scalar polish substitute for validated value. | Remove unsupported implication now; selected-future positioning only after evidence; claim owner/expiry. | **P2** | High |
| **G-027: mutable unqualified release** | Release integrity | DC; workflow trace | Tag can change and deployed image was not the tested artifact. | Rebuild-after-test, mutable dispatch tags, no provenance/qualification. | Build once/promote immutable digest; boot/persistence/recovery; SBOM/signature/provenance. | **HOLD** | High |
| **G-028: dev runtime/weak readiness** | Runtime operations | DC; Docker/package/runbook | Clean production can fail or stay dead/unwritable while liveness misleads. | `tsx`/dev tree, liveness-only, no restart-supported topology. | Runtime-only build, storage readiness, restart-enabled enforced single node. | **HOLD** | Certain/High |
| **G-029: unmeasured performance/maintainability** | Performance/quality | EX+DC; 556 kB chunk and gate inventory | Writers may abandon and boundary code may drift, but impact is unmeasured. | No representative task/device budget or risk-based UI coverage. | Measure first; targeted split/budgets and boundary coverage only if observed. | **HOLD** | High mechanism; impact unknown |
| **G-030: human-service system absent** | Service operations | XR+LR; B future gaps | Human wrapper can add bias, confidentiality risk, delay, and negative margin. | No reader identity/QA/disagreement/access/cost/SLA operation. | Only after gated B branch: manual secure named concierge, independent/assisted comparison, full cost. | **HOLD / Research** | Strong conditional gap |
| **G-031: market/distribution unknown** | Strategy/economics | XR; dated first-party pages | Vendor claims can become false demand/TAM/moat proxies. | Public observables lack conversion, substitution, retention, margins and causal value. | After appropriate gate: measure actual behavior/payment/retention/margin; no vendor efficacy transfer. | **HOLD / Research** | Moderate observables; outcomes unknown |

### Noncompensable gate state

| Gate | State at snapshot | Minimum evidence to clear |
|---|---|---|
| Content/state integrity | **FAIL** | G-001 to G-004 and G-009 to G-011 exit tests pass on exact release; declared durable aggregate survives failure and restore. |
| Security/privacy | **FAIL** | G-005 to G-008 plus deployment-specific data map, notice, deletion, identity, and incident controls. |
| Score honesty/validity | **FAIL for A; not demonstrated for B/C’s current UI** | Unsupported authority removed or clearly experimental; exact claim/use passes G-019 to G-024. |
| Legal/data permission | **NOT DEMONSTRATED** | Rights ledger, notices/consent, provider/reader terms, retention/deletion, and qualified fact-specific review. |
| ROADMAP P0 demand | **FAIL** | G-018 completed under predeclared gate; positive result remains directional, not PMF or score validation. |
| Accessible critical journey | **NOT DEMONSTRATED** | G-013 and G-014 automated and representative checks before general exposure or representativeness claims. |

## 6. Research Findings

### Corpus and verification strength

The research process screened 86 candidate records, deduplicated to 68, assessed 57 in detail, and retained a frozen corpus of 48: 30 peer-reviewed sources, 12 official/professional primary sources, and six vendor sources used only for market observables. All 31 DOI-bearing academic records resolved independently; Semantic Scholar corroborated 30 of 31, with the remaining record verified through Crossref, the publisher, and OpenAlex. No retained source was fabricated, retracted, or classified as predatory. One source’s evidence level was corrected downward during verification, and all vendor claims remained first-party ([PHASE_2_SOURCE_VERIFICATION.md:12-34,119-315](./PHASE_2_SOURCE_VERIFICATION.md#overall-assessment); [SOURCE_REGISTER.md](./SOURCE_REGISTER.md)).

Supplemental S01, *DuoDrama*, was found after the corpus freeze and registered transparently rather than inserted retroactively. Its authors describe nine formative and fourteen evaluative participants as professional screenwriters, but the study compares against AI-generated conditions, measures short-term self-report rather than blind artifact improvement, has no human-coverage baseline or longitudinal outcome, and carries developer-evaluator/Microsoft incentives. It supports plausibility only, not efficacy, demand, score validity, or product selection ([PROTOCOL_AMENDMENT_02.md](./PROTOCOL_AMENDMENT_02.md); [Tang et al., 2026](https://doi.org/10.1145/3772318.3790568) <!--ref:S01--><!--anchor:page:1-20-->).

### Findings that materially change the design burden

1. **Validity is about interpretation and use, not repeatability.** Messick’s validity framework makes the warrant and consequences of a score central; reliable computation alone is insufficient ([Messick, 1995](https://doi.org/10.1037/0003-066X.50.9.741) <!--ref:A18--><!--anchor:page:741-749-->). `[Inference]` STORYMACHINE must validate each intended use, form, mode, threshold, and consequence, not a single generic “accuracy” number.
2. **Automatic story evaluation is weak in ways local fixtures may miss.** The HANNA benchmark found wide disagreement and weak correlations among many automatic story metrics; OpenMEVA showed discourse/causal perturbation failures; later LLM judging improved some system-level correlations but retained prompt and explanation limitations ([Chhun et al., 2022](https://aclanthology.org/2022.coling-1.509/) <!--ref:A10--><!--anchor:page:5794-5836-->; [Guan et al., 2021](https://doi.org/10.18653/v1/2021.acl-long.500) <!--ref:A12--><!--anchor:page:6394-6407-->; [Chhun et al., 2024](https://doi.org/10.1162/tacl_a_00689) <!--ref:A11--><!--anchor:page:1122-1142-->). These are generated-story findings, not direct evidence that STORYMACHINE fails on real screenplays; they raise the required proof.
3. **Human labels are necessary but not ground truth by declaration.** Rating aggregation can reverse apparent preferences, both humans and LLMs show judgment biases, and agreement statistics must match the actual design ([Ethayarajh & Jurafsky, 2022](https://doi.org/10.18653/v1/2022.emnlp-main.406) <!--ref:A13--><!--anchor:page:6056-6070-->; [Chen et al., 2024](https://doi.org/10.18653/v1/2024.emnlp-main.474) <!--ref:A15--><!--anchor:page:8301-8327-->; [Hallgren, 2012](https://doi.org/10.20982/tqmp.08.1.p023) <!--ref:A19--><!--anchor:page:23-34-->). Expert/domain match can improve consistency, but expert distributions and rationales must remain visible ([Kaufman et al., 2008](https://doi.org/10.1080/10400410802059929) <!--ref:A22--><!--anchor:page:171-178-->; [Kaufman et al., 2009](https://doi.org/10.1002/j.2162-6057.2009.tb01316.x) <!--ref:A23--><!--anchor:page:223-233-->).
4. **Positive experience is not artifact improvement.** Machine-in-the-loop creative-writing studies show that users can value assistance without producing independently better artifacts ([Clark et al., 2018](https://doi.org/10.1145/3172944.3172983) <!--ref:A05--><!--anchor:page:329-340-->). Writer experience, revision decision, blind draft quality, repeat use, and payment must be distinct endpoints.
5. **Screenwriters describe plural roles and contextual needs.** A study whose authors report interviews with 23 screenwriters documents varied practices, attitudes, and desired AI roles; broader writing research identifies consistency, arc, reader experience, and expressive intent as support needs ([Tang et al., 2025](https://doi.org/10.1145/3706598.3714120) <!--ref:A02--><!--anchor:page:1-18-->; [Kreminski & Martens, 2022](https://doi.org/10.18653/v1/2022.in2writing-1.11) <!--ref:A04--><!--anchor:page:74-82-->). These qualitative findings support task/context capture and multiple lenses. They do not prove demand for STORYMACHINE.
6. **Appropriate reliance matters more than maximal trust.** Trust interventions are task- and friction-sensitive; cognitive forcing may reduce overreliance while lowering preference, and explanation benefit depends on verification cost and incentives ([Lee & See, 2004](https://doi.org/10.1518/hfes.46.1.50_30392) <!--ref:A24--><!--anchor:page:50-80-->; [Mehrotra et al., 2024](https://doi.org/10.1145/3696449) <!--ref:A25--><!--anchor:page:1-45-->; [Buçinca et al., 2021](https://doi.org/10.1145/3449287) <!--ref:A27--><!--anchor:page:1-21-->; [Vasconcelos et al., 2023](https://doi.org/10.1145/3579605) <!--ref:A28--><!--anchor:page:1-38-->). The UX should measure checking, challenge, override, and correction, not merely trust ratings.
7. **Human plus AI is not automatically superior.** A meta-analysis found augmentation over humans on average but no average synergy over the better member; complementarity depends on asymmetric information or capability ([Vaccaro et al., 2024](https://doi.org/10.1038/s41562-024-02024-1) <!--ref:A26--><!--anchor:page:2293-2303-->; [Hemmer et al., 2025](https://doi.org/10.1080/0960085X.2025.2475962) <!--ref:A30--><!--anchor:page:979-1002-->). Future B must compare independent human, machine-only, and assisted conditions.
8. **Trustworthiness is a lifecycle property.** NIST’s generative-AI profile frames risk identification, measurement, management, and governance across the system lifecycle ([Autio et al., 2024](https://doi.org/10.6028/NIST.AI.600-1) <!--ref:G02--><!--anchor:section:2.2-->). OWASP’s API guidance reinforces authorization, authentication, resource, configuration, inventory, and third-party consumption boundaries ([OWASP API Security Top 10, 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/) <!--ref:G04--><!--anchor:section:API%20Security%20Top%2010%202023-->). A green score cannot compensate for failed recovery or confidential-input handling.
9. **Claims and confidentiality need exact substantiation.** FTC guidance warns against unsupported AI performance claims and emphasizes honoring privacy/confidentiality commitments around uploaded data and secondary use ([FTC, 2023](https://www.ftc.gov/business-guidance/blog/2023/02/keep-your-ai-claims-check) <!--ref:G07--><!--anchor:section:Keep%20your%20AI%20claims%20in%20check-->; [FTC, 2024](https://www.ftc.gov/policy/advocacy-research/tech-at-ftc/2024/01/ai-companies-uphold-your-privacy-confidentiality-commitments) <!--ref:G08--><!--anchor:section:Privacy%20and%20confidentiality%20commitments-->). This report identifies claim and control risks, not a legal violation.
10. **Accessibility requires testable behavior.** WCAG 2.2 provides authoritative criteria for focus, dragging, targets, entry, and authentication, but technical conformance does not alone prove lived usability ([W3C, 2024](https://www.w3.org/TR/WCAG22/) <!--ref:G06--><!--anchor:section:Conformance-->). The product needs both automation and representative assistive-technology completion.

### Twelve-perspective convergence

| Perspective | Independent finding | Design implication |
|---|---|---|
| A. Screenplay-domain expert | The judge lacks writer intent and form; legitimate reader disagreement is collapsed. | Task/form first; evidence before verdict; preserve disagreement. |
| B. Systems architect | No single project aggregate or enforceable route capability taxonomy exists. | Versioned authority model, declarative route classes, atomic recovery. |
| C. Product strategist | The team is optimizing a value proposition it has not observed. | Directional P0 before feasibility design; separately gated committed behavior before product selection; learning velocity over feature velocity. |
| D. Working writer | Upload, backup, score, and complex panels ask for faith before control. | Plain-language consent, reversible actions, one next step, reliable recovery. |
| E. Measurement specialist | No complete validity argument; form is a confound; AUC alone is insufficient. | Plural constructs, baselines, uncertainty, abstention, decision outcomes. |
| F. Adversarial red team | Restore can destroy; provider calls multiply; build context crosses trust boundary. | Stop irreversible paths and test worst-case composition, not happy paths. |
| G. Security/privacy lead | Strong code controls coexist with an absent confidential-work contract. | Treat content integrity and data lifecycle as security boundaries. |
| H. Operator/SRE/support | Restore is not an operable runbook; published artifact is not the tested artifact. | Recovery drill, immutable artifact, topology/readiness/cost budgets. |
| I. Skeptical executive | Technical supply is high; demand is zero; score authority is reputational debt. | Preserve options, stop/hold, fund evidence rather than breadth. |
| J. Competitor | Instant breadth and scores are visibly common; receipts and accountability are harder to copy. | Differentiate only through proven evidence relationships and operations. |
| K. Legal-risk reviewer | Quantitative, privacy, rights, and accessibility claims need exact substantiation. | Claim inventory, data map, dated applicability review, no legal verdict. |
| L. Innovation lead | Reframe from automated judge to reflective instrument; use OASIS as a Labs sensor. | Test intent-first evidence workflow conditionally, keep experiments separated. |

### Negative evidence and rival explanations

The engine may be better than the current corpus can show; this makes P1 necessary rather than making current authority acceptable. Scene scarcity may intentionally measure whole-feature completeness; without declared form and completeness it remains an undeclared policy. Competitors may possess private validation; the audit found only a public-evidence gap. A human service may validate the human rather than the software. C may score well because the owner values honesty, agency, and reversibility rather than because writers do. Repairing all engineering debt before conversations would delay learning, so sample-only P0 proceeds in parallel. These rivals are retained in [PHASE_3_SYNTHESIS.md:464-559](./PHASE_3_SYNTHESIS.md#rival-explanations-and-stress-tests).

## 7. Competitive and Industry Benchmark

### Dated public market observables

| Alternative | Publicly observable offer at audit date | What it can credibly demonstrate publicly | What remains unknown |
|---|---|---|---|
| CoverflyX | Free reciprocal peer notes, reader ratings/strikes | Reputation-mediated human exchange and low cash price | Independent note quality, reliability, safety, writer outcomes |
| GetScriptCoverage | $19 automated report with scores and verdict | Visible low-price boundary and explicit “not a veteran reader” limit | Professional equivalence, validity, confidentiality evidence |
| ScriptCoverage.ai | $49 to $79, seven-pass report, challenge/export/delete, disclosed provider path | Strongest public operational transparency in the direct set | Independent revision benefit or pass/model-tier efficacy |
| Callaia | From $65, under-one-minute claim, processor/retention statements | Detailed current data-path and speed positioning | “Objective/leading” substantiation and independent screenplay benchmark |
| Greenlight Coverage | $75 to $345 monthly; rankings, opportunities, contest | Strong retention/distribution mechanism | Efficacy, retention causality, privacy scope, score/opportunity conflict effects |
| ScriptBook | €149 to €799; predictive/audience outputs; privacy and patents | Strongest articulated data/IP/enterprise positioning | Audit-ready independent replication, calibration, claim denominator/split |
| Named human reader | Feature coverage from $185; deeper tiers from $449 | Identifiable situated interpretation, dialogue, accountability | Inter-reader variance, outcome effect, retention, scalable unit economics |
| The Black List | Human reader qualification and a distribution/credential network | Network and explicit no-LLM reader policy | Current independently verified agreement and writer outcomes |
| General-purpose LLM | Free tiers; representative premium plans about $20/month | Horizontal access, conversational reframing, low marginal interaction cost | Screenplay-specific validity, stable rubric, accountable reader, industry distribution |

Sources and dated retrieval details appear in [PHASE_2_COMPETITIVE_INDUSTRY.md:107-372](./PHASE_2_COMPETITIVE_INDUSTRY.md#market-structure-and-price-ladder). Vendor pages are commercial first-party observables, never efficacy evidence.

### Benchmark verdict

**[Fact—external]** Speed, broad category reports, chat, scores, pass/consider/recommend, market language, and multi-pass labels are visibly common in the reviewed set. **[Inference]** They are therefore weak *publicly observable differentiation*. The audit does not establish economic commoditization, price elasticity, substitution, margins, conversion, retention, or causal value of any feature. No reviewed public source supplied an independently replicated, held-out, multi-reader real-screenplay feedback benchmark. That dated absence is not proof that the products fail.

The strongest public mechanisms are different by segment:

- human services: named accountability and contextual conversation;
- ScriptCoverage.ai: specific processing, retention, optional human-QC, deletion, and challenge disclosures;
- ScriptBook: articulated IP/data/enterprise story, albeit with vendor-only performance claims;
- Greenlight: subscription continuity plus opportunity/distribution;
- The Black List: credential and network access;
- general LLMs: distribution and low-cost conversational flexibility.

### Defensibility hypothesis, not current moat

A copyable prompt, rule count, panel list, speed claim, or report template is not a moat. The plausible stack is: licensed real drafts; multiple-reader disagreement; writer intent; versioned draft diffs; accepted/rejected/challenged findings; independent blind revision outcomes; exact receipt lineage; proven deletion/confidentiality; and, only if selected, a qualified human or distribution network. `[Hypothesis]` These assets can become defensible only if rights, repeated use, retention, imitation cost, and commercial economics are demonstrated. STORYMACHINE owns pieces of the receipt layer today, not the complete moat.

### Strategic response

Copy the strongest trust mechanisms, not competitor authority claims: exact data paths, visible deletion, challenge channels, narrow role boundaries, named accountability when human review exists, and continuity across revisions. Underprice only after fully loaded security/evaluation/support cost is known. Do not couple an unvalidated score to opportunity access. Do not answer crowded breadth with more panels or rules.

## 8. Assumption and Truth Registry

The full registry contains 83 propositions and is the controlling evidence map: [PHASE_3_TRUTH_REGISTRY.md](./PHASE_3_TRUTH_REGISTRY.md).

| Family | IDs / count | Controlling truth | Decision effect |
|---|---:|---|---|
| Foundation, demand, governance | F-01 to F-11 / 11 | Declared wedge is a hypothesis; direct demand is zero; runtime is dual product; rule history is false; freeze remains. | Run P0, correct governance, no unvalidated expansion. |
| Score, interpretation, evaluation | S-01 to S-17 / 17 | Quick mechanics are narrowly deterministic; deep is model-assisted; score validity is absent; form/intent and rater plurality matter. | Bound claims, separate modes, define constructs; run P1 only after directional P0 and a later experiment gate establishes need for consequential judgment. |
| Product, workflow, market, moat | P-01 to P-15 / 15 | Receipts are real; Draft MRI, human service, OASIS option value, demand, distribution, and defensibility are hypotheses. | Preserve assets, test choices, never promote analyst convergence to demand. |
| Content integrity, security, operations | T-01 to T-32 / 32 | Recovery, authority, build context, AI budgets, identity, privacy, accessibility, release, readiness, and UI contracts have verified gaps alongside real strengths. | Execute bounded safety/integrity fixes and hold scale work. |
| Legal, rights, public claims | L-01 to L-08 / 8 | Audit identifies risks, not violations; claim substantiation, dated applicability, rights, consent, and access controls remain necessary. | Qualified review and enforceable facts before claims or real-draft programs. |

### Controlling facts, hypotheses, and constraints

- `[Fact—repo]` Zero completed P0 sessions; all demand/product-fit conclusions are absent.
- `[Fact—executed]` Recovery is self-incompatible and destructive on an accepted malformed body.
- `[Fact—repo]` Live generated catalog is 3,216 pass-scoped constants; 8,917/5,701 history is disproven; semantic concept count is unknown.
- `[Fact—code]` Quick analytic output is deterministic only under named input/mode/context/version/build; deep mode adds model-dependent measurement.
- `[Fact—repo]` Score interpretation/use has no real-writing validity argument.
- `[Fact—code]` Receipts, locations, hashes, recomputation, editor, and stale-save protection exist.
- `[Hypothesis]` Writers will value located evidence without scalar authority.
- `[Hypothesis]` A bounded human service can create useful context at viable cost.
- `[Hypothesis]` A licensed longitudinal evidence stack can become a moat.
- `[Constraint]` Demand before engine expansion; claim honesty now; P1 before authoritative score; rights/privacy before own-draft evidence; noncompensable gates cannot be averaged away.

### Ten resolved conflicts

| Conflict | Resolution | Residual uncertainty |
|---|---|---|
| 8,917/5,701 history vs code/git | Generated extraction and commit diff control: 3,216 live; alleged bulk expansion rejected. | Semantic concept count unknown. |
| “Full snapshot” vs implementation | Executed rejection and table comparison control: current artifact is incompatible and partial. | Complete aggregate vs honestly partial portable export is an owner design decision. |
| “Same report” vs timestamps/deep mode | Narrow to same quick analytic result under named identities; exclude volatile metadata; deep lineage separate. | Long-term compatibility/version policy. |
| P0 “blocked” vs “smoke passed” | Common truth is zero sessions and unmet gate; field readiness is unresolved. | One synchronized owner/commit/time certification. |
| One product/Labs vs dual runtime | Runtime describes current state; ROADMAP describes future sequence. | Later OASIS demand. |
| 3,216 rule count vs rule-count strategy | Count is syntactically correct but non-probative of value/validity. | None until causal value is tested. |
| Determinism vs trustworthiness | Repeatability can be strong while score meaning is invalid or unknown. | P1 must test exact use. |
| Reflective convergence vs absent demand | C is a candidate hypothesis, not a winner. | Writer pull, cognitive load, retention, payment. |
| Bearer sessions: useful vs insecure | Acceptable only in bounded private capability trial; not public/team identity. | Exact trial exposure and rotation/deletion controls. |
| Human service: destination vs distraction | Retain only as a bounded attribution- and cost-controlled experiment. | Reader supply, bias, economics, software contribution. |

## 9. Failure-Mode Register

All 32 failure modes are fully specified with trigger, causal chain, leading indicators, detection, prevention, mitigation, rollback, residual risk, and ordinary-test blind spot in [PHASE_3_FAILURE_MODE_REGISTER.md](./PHASE_3_FAILURE_MODE_REGISTER.md).

| Failure cluster | IDs covered | How the system can look successful while failing | Earliest controlling break |
|---|---|---|---|
| Persuasive but invalid judgment | **FM-01, FM-02, FM-05, FM-06** | Deterministic score, benchmark metric, and score-improving revisions all rise while form confounds, leakage, or Goodhart behavior drive them. | Withhold authority; task/form metadata; locked grouped holdout; blind outcome independent of engine delta. |
| Confidentiality and permission | **FM-04, FM-07, FM-10, FM-14** | Tests and final image look clean while build context, bearer capability, provider/rights changes, or lifecycle mismatch expose the draft. | Deny context; bounded identity; data map/contracts; dated rights review. |
| Recovery and authority | **FM-03, FM-11, FM-25** | HTTP returns success or “backup” exists while retired import remains destructive, simulation reset deletes authoritative project state, fields/relationships/history are omitted, concurrent commands interleave, or cleared content resurrects. | Keep import retired and reset disabled until a manifest-complete, version-separated contract exists; simulation-only reset; distinct confirmed project deletion; WAL-safe online backup; one per-session command coordinator. |
| Provider control and lineage | **FM-08, FM-09, FM-17, FM-26** | Valid schemas and green quick tests coexist with fan-out, model drift, semantic manipulation, or misleading fallback. | Engine budgets/cancellation; complete provider/prompt/model/fallback lineage; canaries and abstention. |
| Human judgment and reliance | **FM-12, FM-13, FM-20** | Averaged labels, satisfaction, and a human signature imply quality while disagreement, anchoring, labor cost, and no synergy persist. | Plural labels; better-alone baselines; independent-first workflow; secure costed roster pilot. |
| Trial/public boundary and evidence flywheel | **FM-18, FM-19, FM-21** | Growth, telemetry, praise, and sample reaction look like committed demand while identity, rights, sampling, actual own-draft use, repeat use, and payment remain absent. | Exposure gates; consented rights ledger; label sample-only P0 directional and pre-behavioral; later behavior hierarchy behind the own-draft gate; explicit stop rule. |
| Product/market failure | **FM-22, FM-23, FM-30, FM-32** | More features, panels, subscriptions, scores, and opportunity links increase activity while clarity, pricing power, performance, and independence collapse. | One P0 job; measured task performance; purpose separation; contribution-margin and retention evidence. |
| Release and topology | **FM-15, FM-16, FM-27, FM-28, FM-29** | Source tests pass, tag exists, and `/health` is green while published image, native runtime, persistence, multi-node authority, config, or logs fail. | Build once/promote; immutable digest; single-node enforcement; readiness/restart; safe error contract. |
| Accessibility and governance | **FM-24, FM-31** | Dominant users complete the journey and tests pass while disabled writers are excluded and false strategic memory becomes canonical. | Browser/AT gate; executable truth registry; named evidence owners and expiry. |

### Second-order interactions that deserve dedicated tests

The critical risks compound. Wrong judgment plus deterministic receipts makes invalid authority more persuasive. Form confound plus score feedback teaches padding. Destructive import plus partial export creates successful-looking permanent loss. Lifecycle gap plus Docker context creates an untracked processor. Bearer identity plus missing lifecycle audit makes access unattributable. Provider outage plus retry fan-out creates a cost storm. Model drift plus mutable release makes changed verdicts unreconstructable. Reader variance plus biased telemetry turns convention into “truth.” Accessibility exclusion plus telemetry makes usability data systematically homogeneous. Async resurrection plus provider transfer can turn a UI race into unintended content transmission.

### Twenty-four-month pre-mortem

Assume a polished STORYMACHINE fails publicly by July 2028. The most plausible path is cumulative evidence substitution:

1. Five friendly conversations are called market validation.
2. A synthetic percentile remains visible because it tests well in demos.
3. The team selects C from the audit and treats that as permission to build it.
4. A leaked, narrow, or length-dominated benchmark yields a “validated” score.
5. Users optimize the score; engine deltas are reported as better writing.
6. A confidential draft is lost or crosses an undocumented build/provider/backup path.
7. A model or image changes without reconstructable lineage.
8. Accessibility and lower-end-device failures remove users from the observed cohort.
9. A distribution or contest loop ties score to opportunity, making gaming economically rational.
10. Governance prose outlives the facts and agents continue executing the retired premise.

The earliest prevention is not more model sophistication. It is honest claims, irreversible-path repair, rights and lineage, independent outcomes, and a precommitted stop decision.

## 10. Supersession Matrix

`Disposition` is restricted to the directive's six normalized values. Concrete
work belongs in `Action`, not in mixed disposition wording.

| Prior/current component or claim | Evidence verdict | Governing replacement | Disposition | Action |
|---|---|---|---|---|
| Keyless deterministic front door | Works without provider key; bounded routes/tests are green. | Preserve keyless analysis-only startup as the product's trust front door. | **Accepted** | Add a non-regression boot/route contract. |
| Server-side provider keys | Keys are not serialized; readiness uses both sources. | Keep keys server-side and public output boolean-only. | **Preserved** | Correct `llmReady` response parity and retain bundle/serialization tests. |
| Located receipts, hashes, recomputation | Implemented and inspectable. | Use as shared A/B/C/stop evidence substrate, not validity proof. | **Preserved** | Bind receipts to exact draft/task/mode/build and optional provider lineage. |
| Optimistic ScriptIDE concurrency | Stale writes are rejected and winning state preserved. | Extend the invariant through the new per-session mutation coordinator. | **Preserved** | Add reset/import/save/room/config/turn interleaving tests. |
| SQLite online-backup primitive | Correct primitive already exists; reset bypasses it. | Use verified online backup for authorized destructive transitions. | **Accepted** | Integrate only after simulation-reset scope is corrected. |
| 8,917/5,701 Wave history | Disproved by generated catalog and commits. | 3,216 live pass-scoped constants; semantic concepts unknown. | **Rejected** | Remove from governing docs; preserve Amendment 01 evidence. |
| About 2,300 concepts | No semantic-deduplication method. | Unknown until registered measurement. | **Unresolved** | Remove as fact; decide only if a future migration needs it. |
| Rule freeze | False history supported it, but demand/validity evidence independently supports it. | No growth/removal/retuning without approved post-P0/P1 migration. | **Preserved** | Replace rationale, not policy. |
| 3,216 as proof of value | Syntactic count is real; value inference absent. | Count may describe implementation only. | **Modified** | Remove from efficacy/differentiation copy. |
| “Full session snapshot” and JSON import | Partial, self-incompatible, destructive, transport/version-incomplete. | Non-recoverable simulation observation plus unconditional import 410; future project envelope separately gated. | **Superseded** | Relabel export, retire import, define separate version domains/manifests later. |
| Simulation reset equals project deletion | ScriptIDE reset deletes entire DB including editor authority. | Transactional simulation-only clear; separate confirmed project deletion. | **Rejected** | Disable until scope/coordinator/backup/concurrency exit passes. |
| Same script always gives same report | Timestamps vary; deep lineage varies. | Same quick analytic result under named identities, excluding volatile metadata. | **Modified** | Correct claims and receipts. |
| “Model senses; rules judge” | Model fields influence rules. | Model-assisted measurement plus deterministic aggregation. | **Superseded** | Separate quick/deep evidence and lineage. |
| Doctor+Editor default; OASIS Labs | Runtime exposes both. | Conditional P2 target only after a valid branch. | **Unresolved** | Describe runtime truth now; do not implement a future selection. |
| Indefinite wave cadence | Active roadmap retired it. | Demand-first P0, gated P1, then P2/P3/P4. | **Rejected** | Archive retired instruction and links. |
| Record parity “not landed” | Live and passing. | Describe current parity and remaining aggregate gaps. | **Superseded** | Correct stale status. |
| 12-pass pipeline | Live order has 14 passes. | 14-pass current pipeline. | **Superseded** | Correct docs/comments. |
| Five-minute collaboration TTL | Implementation uses 30 minutes. | State actual value and owner. | **Superseded** | Correct comment; add staleness test if contractual. |
| One session per browser tab | `localStorage` spans same-origin tabs. | Browser-profile/origin bearer capability unless separated. | **Superseded** | Correct docs/UI and test intended multi-tab behavior. |
| Real corpus “passes” in ordinary CI | 72 assertions skip. | “Not evaluated” differs from pass. | **Superseded** | Protected P1 job fails if expected corpus absent. |
| Discrimination todo tie | Live gap about 2.9, below 5.0. | Exact current synthetic witness; no real-writing inference. | **Superseded** | Correct stale text. |
| Visible features are economically “commodity” | Only prevalence in a reviewed public set was observed. | Weak publicly observable differentiation; commoditization, pricing, substitution, margins, conversion, retention unknown. | **Superseded** | Ban categorical economic wording until independent evidence. |
| Sample-only P0 proves committed demand or selects A/B/C | Lane cannot observe actual draft use/payment/return. | Directional pre-behavioral need/sample/authority-contract evidence only. | **Superseded** | Certify and run unaided-first; later gated experiment measures committed behavior. |
| Release tags/image are immutable and tested | Manual overwrite/rebuild/no boot test. | Qualified immutable digest, build once/promote. | **Rejected** | Hold external release pending artifact qualification. |
| `/health` proves deployment health | Process life only. | Separate liveness, storage readiness, restart/recovery. | **Modified** | Correct runbook and add black-box readiness tests. |
| “Private/no training” by architecture | Mode/provider/deployment facts differ; contract absent. | Deployment-true, mode/provider-specific notice and controls. | **Unresolved** | No blanket claim; map actual deployment and obtain qualified review. |
| Audit selected Future C | No future clears evidence/gates; worksheet encodes owner priors. | Shared trust repair, directional P0, then design next experiment or stop. | **Rejected** | Keep A/B/C deltas conditional and equally explicit. |

## 11. Corrected High-End Architecture

### Shared architecture now; no product future selected

The architecture authorized now is a **shared A/B/C/stop trust substrate**, not a
product thesis: exact project/simulation state boundaries, safe ingest,
deterministic provenance, evidence eligibility, route/policy enforcement,
simulation-only reset, separately authorized project deletion, bounded provider
use, recovery, and qualified operations. It remains useful if a separately
gated post-P0 experiment later produces `TEST A`, `TEST B`, `TEST C`, `STOP`,
or `REFRAME-REPEAT`.

**Conditional Future C thesis, no implementation authorization.** If a valid
later branch decision is `TEST C`, the next no-code/product hypothesis is a
private evidence-first revision instrument that maps bounded observations to
exact scenes and helps the writer run reversible experiments. This is not the
current selection. A valid `TEST A` or `TEST B` decision changes the primary
authority and operating model as specified below.

### Core system law

**No conclusion may outrun its evidence or its declared use.** Every output must identify the draft/version, task, form, mode, source, computation/model lineage, applicability boundary, uncertainty or disagreement, and reversible next action. When the system lacks support, it abstains. The writer retains decision authority unless an explicitly named, accountable human service owns a clearly bounded interpretation.

### Shared modules and responsibilities

| Module | Responsibility | Inputs | Outputs | Failure contract |
|---|---|---|---|---|
| **1. Project Authority** | Own current project state and separate simulation aggregate; define future portable envelope without enabling import | Draft body, title metadata, context, commits, versions, simulation state | Current authority, immutable draft versions, generated manifests, export/delete/backup receipts | POST JSON import remains 410; simulation reset cannot touch project/editor state; project deletion is separately named/authorized. |
| **2. Ingest and Normalization** | Parse Fountain/FDX/text; preserve source map; classify form/completeness | User file/content and declared task metadata | Canonical screenplay AST, normalized text, source locations, parse warnings, content hash | Never silently drop content; reject/abstain on material parse loss; retain original bytes where permitted. |
| **3. Observation Engine** | Compute deterministic, locally verifiable screenplay observations | AST, declared context, observation-version registry | Located observations, invariants, counterexamples, perturbation results | No quality claim; every observation carries formula/rule/build and applicability. |
| **4. Optional Perspective Boundary** | Isolate any later model or human interpretation from deterministic observation truth | Selected minimal evidence/text, current authorization, provider/person contract, question | Separately labeled perspective and complete lineage | Disabled unless the selected future and current transfer authorization permit it; no scalar promotion. |
| **5. Evidence and Validity Registry** | Decide which claims are permitted in which domain and mode | Observation/perspective type, validation artifact, expiry, use request | Claim tier, supported domain, uncertainty, abstention reason, substantiation link | Fail closed when evidence missing/expired/out of domain. |
| **6. Output Contract Router** | Emit only outputs permitted by the selected future and evidence tier | Task, observations, optional perspectives, validity decision, future flag | A judgment card, B reader packet, C evidence card, or abstention | Defaults to abstention/shared receipts; Future C Feedback Composer is not active without `TEST C`. |
| **7. Version and Decision Ledger** | Record source versions and user/reader/system decisions without asserting benefit | Draft versions, outputs, accept/reject/revert/appeal events | Immutable lineage and decision receipts | Score delta never becomes artifact-quality evidence; a C Revision Lab is conditional. |
| **8. Evaluation and Calibration** | Run P0/P1 studies, benchmarks, canaries, drift and outcome analysis | Rights-cleared data, reader labels, preregistered protocol, production lineage | Evaluation cards, uncertainty, slices, calibration, failures, model/build eligibility | Holdout isolation, no silent skips, no promotion without gate owner sign-off. |
| **9. Trust and Policy Gateway** | Reauthorize every current route, mutation, and external transfer | Principal/session, deployment, route, provider/person, data/purpose, current terms, historical receipts | Current authorization/denial, limiter/budget decision, transfer manifest, audit event | Imported/historical receipts never authorize; deny by default; no transfer outside current authorization and budget. |
| **10. Operations and Observability** | Qualify artifact, topology, persistence, cost, latency, recovery, incidents | Immutable build/provider/config identities and health signals | Readiness, lineage, cost, SLO, backup/restore, incident evidence | Liveness never substitutes for readiness; unsupported multi-node topology refuses start or traffic. |
| **11. Labs Sandbox** | Isolate OASIS, experimental panels, and research sensors | Explicit opt-in and separate experiment contract | Noncanonical experimental outputs and learning records | No default navigation, score/claim inheritance, or product evidence attribution. |

### Conditional future deltas

| Branch | Primary authority and promise | Additional modules/operations | Additional noncompensable evidence before implementation/fielding |
|---|---|---|---|
| **STOP/HOLD** | No product promise; retain only safe research/maintenance substrate | Disable generative/import/reset exposure as required; preserve evidence and portability design | None beyond safe repository operation and research-data obligations. |
| **Future A: Coverage Authority** | System owns a narrowly validated automated judgment | Validated scoring service, calibration/abstention monitor, appeal and claim-substantiation registry | A separately gated post-P0 experiment records `TEST A`; Stage 6 P1 then passes the exact claim/use on a rights-clean grouped holdout with baselines, uncertainty, slices, and monitoring. |
| **Future B: Reader Studio** | Named human owns interpretation; machine supplies bounded evidence | Reader identity/assignment, independent-first work queue, confidentiality/revocation, QA, disagreement, appeals, compensation/SLA/cost ledger | A separately gated post-P0 secure manual experiment records `TEST B` after demonstrating accountable-human need, quality, nonharmful anchoring, capacity, and unit economics. |
| **Future C: Reflective Draft Clinic** | Writer owns decision; system supplies observations and optional labeled perspectives | **Conditional** Feedback Composer, Revision Lab, evidence-card/compare UX, challenge and cognitive-load measurement | A later gated experiment supports located evidence without scalar authority; own-draft/privacy/accessibility gates pass. |

### Canonical interface contracts

```ts
type ProjectEnvelope = {
  projectEnvelopeVersion: number;
  projectId: string;
  currentDraftId: string;
  drafts: DraftVersion[];
  titlePage: { title: string; author: string; contact: string };
  storyContext: StoryContext;
  decisions: RevisionDecision[];
  policyReceipts: HistoricalPolicyReceipt[]; // evidence only, never authority
  durableManifest: ManifestEntry[];
  excludedState: ExclusionReason[];
};

type HistoricalPolicyReceipt = {
  principalId: string;
  deploymentId: string;
  providerOrPerson: string;
  dataClasses: string[];
  purpose: string;
  termsVersion: string;
  issuedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  draftHash: string;
};

type AnalysisRequest = {
  projectId: string;
  draftId: string;
  task: "diagnose" | "compare" | "verify-change" | "reader-brief";
  form: "feature" | "pilot" | "short" | "excerpt" | "partial" | "unknown";
  completeness: "complete" | "in-progress" | "unknown";
  draftStage: string;
  audience: string;
  writerQuestion: string;
  mode: "quick" | "deep";
  selectedProvider?: string;
};

type Observation = {
  id: string;
  sourceLocations: SourceLocation[];
  value: unknown;
  applicability: Applicability;
  evidenceTier: ClaimTier;
  robustnessChecks: CheckResult[];
  lineage: ComputationLineage;
};

type FeedbackCard = {
  status: "confirmed" | "contested" | "insufficient" | "out-of-domain";
  observationIds: string[];
  interpretationIds: string[];
  whyItMattersToTask: string;
  uncertainty: UncertaintyStatement;
  nextExperiment?: RevisionExperiment;
};
```

`ProjectEnvelope` is a separately gated future format; it is not the current
SQLite schema, whose independent authority is `dbSchemaVersion`. Imported
`policyReceipts` are historical provenance only. They never authorize current
processing or transfer after restore. At each transfer, the Trust and Policy
Gateway must reauthorize the current principal, deployment, provider/person,
data classes, purpose, terms/version, time/expiry/revocation, and draft hash.
`FeedbackCard` is a Future C contract only if a later `TEST C` branch is valid.

### State ownership and recovery invariant

The current Project Authority must distinguish writer/editor/project state from
the declared simulation aggregate. Derived observations, caches, indexes, and
model responses are rebuildable only when lineage and policy permit it. Process
queues and ephemeral collaboration cursors remain explicit exclusions unless a
separate persistence contract is adopted.

Recovery has only two honest modes:

1. **Immediate current contract:** POST JSON import returns unconditional,
   non-mutating 410. Current export is named a non-recoverable simulation
   observation and enumerates omissions. Simulation reset is disabled until a
   transactional generated simulation-only clear, real per-session mutation
   coordinator, and verified online backup preserve exact project/editor state.
2. **Future portable project restore, separately gated:** define generated
   field/table/FK/history/size manifest; independent `dbSchemaVersion` and
   `projectEnvelopeVersion`; reject future DB before DDL/write; deep-validate in
   isolation; verify every declared nullable/inactive/historical/Unicode/
   max-size invariant; create WAL-safe recovery point; atomically swap and
   reopen; preserve original on every failure. Transport must accept its maximum
   produced artifact.

### Decision, human, security, and observability boundaries

- Deterministic observations may be recomputed and verified. They do not become quality judgments automatically.
- Model output is an optional perspective with provider/model/prompt/fallback lineage and separate evidence eligibility.
- A human reader is named, qualified for the task, independently reads before machine anchoring where the protocol requires it, and owns only the stated interpretation.
- Every route declares capability class: public metadata, deterministic compute, confidential session read/write, generative, or administrative. The class binds body schema, limiter, engine budget, auth, audit, and response contract mechanically.
- Every external transfer emits a content manifest: what text, which version, which provider/person, purpose, retention basis, and deletion route.
- Historical/imported policy receipts never authorize a transfer; the gateway performs current reauthorization for every transfer.
- Every result receipt binds project/draft hash, normalization, task, form, mode, observation/rule/formula version, build digest, and optional provider lineage.
- Every release uses one qualified immutable digest. Readiness checks writable persistence; restore drills prove actual recovery; single-node topology is enforced until shared authority exists.

## 12. Corrected Engine and Decision Logic

### Shared engine invariants

Immediate implementation is limited to shared controls: input/state provenance,
safe parsing, deterministic observation lineage, evidence-tier enforcement,
provider isolation/budgets, version and policy boundaries, abstention, and
immutable receipts. It does not authorize Feedback Composer, Revision Lab, a
new score, reader service, or product recommendation flow.

### Conditional Future C decision flow

The following flow applies only if a valid later branch selects `TEST C`:

1. **Define the decision before analysis.** Collect writer question, form, completeness, stage, audience, and desired help. If absent, limit output to low-interpretation observations and ask for context before global advice.
2. **Normalize without erasing provenance.** Preserve original, canonical AST, source mapping, parse warnings, and content hash. Material ambiguity triggers abstention, not guessed structure.
3. **Apply the domain gate.** Compare request form/stage/mode with each measure’s validated applicability. Unsupported global score/verdict/percentile is withheld.
4. **Compute deterministic observations.** Count, locate, compare, and perturb only what can be reproducibly defined. Attach rule/formula/build lineage and negative checks.
5. **Assess evidence tier and robustness.** Determine whether the output is an observation, heuristic, experimental measure, or validated measure for this use. Run shuffle, deletion, form/length, parser, and counterexample checks where applicable.
6. **Optionally obtain perspectives.** Send the minimum disclosed evidence/text to a chosen model or reader. Preserve independent sources and disagreements. Never feed a perspective back as deterministic fact.
7. **Triangulate.** Classify each candidate finding as confirmed, contested, insufficient, or out of domain. Confirmation means independent evidence streams agree on the bounded proposition, not that taste is objective.
8. **Prioritize lexicographically.** First eliminate unsupported or unsafe claims. Then order by relevance to the writer’s stated decision, evidence strength, reversibility, expected side-effect risk, and actionability. Do not create decimal precision unsupported by data.
9. **Recommend a minimal experiment.** State what to change, what observable it targets, what could worsen, and how to reverse it. The writer chooses.
10. **Verify the transition.** Compare before/after observations and side effects. Record accept/reject/revert and the writer’s reason. Never call a higher engine score “better writing.”
11. **Escalate or abstain.** Escalate to a human only for a defined need and qualified service. Abstain on missing context, unsupported form/use, parse loss, out-of-distribution input, conflicting high-impact evidence, provider failure/drift, insufficient rights/consent, or low robustness.

### Conditional A and B decision deltas

| Branch | Decision logic delta | Required stop/abstain condition |
|---|---|---|
| **A** | A T4-eligible validated measure may produce a bounded judgment for the exact registered form/population/use; expose interval, calibration, error slice, abstention and appeal. | No P1 pass for exact use, out-of-domain input, expired/drifted evidence, material disagreement/error concentration, or missing claim substantiation. |
| **B** | A named qualified reader independently interprets the draft; machine observations remain supporting evidence; reader identity, rubric, disagreement, conflicts and appeal are explicit. | No qualified/authorized reader, confidentiality or access failure, machine anchoring protocol failure, unsupported genre/form, capacity/SLA/quality failure. |
| **C** | Writer interprets observations/perspectives and chooses a reversible experiment; no headline scalar. | Missing task/context, excessive cognitive load, unavailable evidence, unsafe transfer, or no observed value in the gated experiment. |
| **STOP/HOLD** | Emit only safe provenance/maintenance outputs; disable product recommendation paths. | Default when no branch has valid authorization. |

### Claim tiers

| Tier | Permitted statement | Required evidence | UI treatment |
|---|---|---|---|
| **T0: provenance fact** | “Version X was analyzed under build Y.” | Cryptographic/content/build identity | Quiet receipt, always available. |
| **T1: deterministic observation** | “Signal S occurs at scenes/lines L under definition V.” | Recomputable definition, source locations, negative fixtures | Evidence card; no quality language. |
| **T2: bounded heuristic** | “This pattern may create effect E for the declared task.” | Domain rationale, counterexamples, applicability and uncertainty | Labeled hypothesis, challenge action, no scalar authority. |
| **T3: experimental measure** | “On the registered synthetic/research reference, value V occurred.” | Transparent reference, protocol, limitations, no population implication | Secondary/research surface; synthetic label adjacent. |
| **T4: validated measure** | “For declared domain/use D, held-out performance was P with interval I and known failures F.” | Rights-clean preregistered real-draft study, baselines, multiple readers, uncertainty, slices, monitoring | May support bounded decision aid with abstention; never generalized beyond D. |

The current Health/100, percentile, grade, and verdict do not qualify for T4. Until P1, their safest state is T3 with explicit synthetic/experimental framing or removal from the default decision order.

### Deterministic, probabilistic, and rule logic

**Deterministic calculations** should cover parsing, counts, locations, graph/sequence properties, explicit structural transforms, content hashes, diffing, version checks, and recomputation. Constants remain versioned at their execution boundary. Tests must include positive and negative fixtures, adversarial counterexamples, and real-writing discrimination when the output is used as a score.

**Probabilistic/model calculations** should be isolated as measurements or perspectives. Record provider, model, prompt/template version, sampling parameters, request hash, safety/fallback path, latency, cost, and whether content left the deployment. Repeated canaries estimate change rate. Model output cannot silently raise the evidence tier of a deterministic rule.

**Rules** should be treated as maintained conceptual tests, not a value metric. The current freeze remains. No new rule, threshold, weight, or catalog-removal project begins until P0 establishes the job and P1 design establishes the construct. A scoring change must beat scene/page/length baselines on grouped held-out real writing and preserve perturbation performance.

### Confidence and uncertainty

Do not compress heterogeneous uncertainty into a single confidence percentage. Present four components:

- **measurement reliability:** does the observation repeat under declared conditions?
- **applicability:** is this form/stage/task inside the supported domain?
- **interpretive agreement:** do independent lenses agree, disagree, or remain absent?
- **decision risk:** what is the cost and reversibility of acting if wrong?

The feedback state is categorical. “Confirmed” requires a robust observation plus task relevance; “contested” exposes disagreement; “insufficient” identifies missing evidence; “out of domain” refuses interpretation. High-impact and irreversible recommendations require stronger evidence or human escalation than small reversible experiments.

### Scenario generation and stress tests

For each proposed revision, generate a minimal change, a no-change control, and at least one rival intervention when feasible. Stress test:

- same craft with different length/form/completeness;
- shuffled scenes, act swaps, causal breaks, duplicated text, empty verbosity, and parser ambiguity;
- prompt-like or adversarial screenplay content in deep mode;
- provider outage, timeout, partial JSON, fallback, and model version change;
- conflicting reader/model/observation evidence;
- extremely short, long, multilingual, Unicode, unusual format, and incomplete drafts;
- budget and cancellation under maximum simulation fan-out;
- failed save, upload cancellation, import, backup, and restore at every boundary.

### Feedback and recalibration

Collect only consented, purpose-limited signals: finding viewed, challenged, accepted, rejected, reverted, writer reason, revision target, later blind outcome, and deletion request. Separate product telemetry from benchmark data. Engine score delta is never a training target or success metric. Any recalibration is preregistered, versioned, evaluated on untouched grouped holdout, audited for leakage and slices, and released only with a changed claim card and rollback path.

## 13. Product and User-Experience Upgrade

### Shared UX controls authorized now

Immediate work may correct only cross-future trust substrate: accurate mode and
data-flow copy, content-manifest cancellation, truthful save/reset/import/export
state, accessible modal/form behavior, experimental sample labels, and receipt
provenance. It does not authorize a redesigned product journey or select A/B/C.

### Conditional Future C journey, no implementation authorization

If a later valid branch selects `TEST C`, the candidate journey is:

1. **Choose the task, not a product name.** Start with “Understand this draft,” “Compare versions,” “Check a revision,” or “Prepare questions for a reader.” OASIS and specialist panels remain outside the default journey.
2. **Explain the content boundary before upload.** Show quick versus deep transfer, actual storage/retention, provider/person access, deletion, and the supported private-trial limitation. Ask for consent at the moment of transfer, not in generic prose.
3. **Confirm a content manifest.** List files, screenplay body, title metadata, context attachments, mode, and recipient. Clear All invalidates every pending reader and manifest generation.
4. **Capture intent compactly.** Form, completeness, draft stage, audience, and one writer question are required for interpretation. Defaults must say “unknown,” not infer a feature draft.
5. **Lead with a concise orientation.** Show three to five located observations relevant to the task, each with status, why it matters, and one verification action. Do not lead with Health/100 or a synthetic percentile.
6. **Progressive depth.** Evidence card first; source lines and definition next; interpretation/disagreement next; formula/build/provenance last. The interface should not explain every subsystem simultaneously.
7. **Writer decision.** Each card supports confirm, challenge, not relevant, try revision, ask a reader/model, and defer. The product learns from decisions without treating acquiescence as correctness.
8. **Revision experiment.** Preview the minimal diff, expected observable change, likely side effects, and rollback. Compare versions after the writer accepts.
9. **Portable receipt.** Export a versioned, third-party-verifiable report that distinguishes observation, interpretation, experimental measure, and writer decision.

### Conditional A, B, and stop UX deltas

| Branch | Primary screen contract | Required trust surface |
|---|---|---|
| **A** | Bounded validated judgment with domain, interval, errors, abstention and appeal before any explanation | Exact P1 substantiation link, out-of-domain refusal, no market/greenlight generalization |
| **B** | Named reader identity, genre fit, independent interpretation, machine-evidence disclosure, disagreement and follow-up | Access/retention, conflicts, compensation, SLA, correction/appeal and human-accountability record |
| **C** | Writer task, located evidence, optional labeled perspectives, reversible experiment and comparison | No headline scalar; challenge, cognitive-load and writer-authority controls |
| **STOP/HOLD** | No analysis product onboarding; research/maintenance state only | Clear disabled reason and no pressure to upload a draft |

### Information hierarchy

| Level | Default content | Must not appear as default |
|---|---|---|
| 1. Current decision | Writer question, top evidence, one next reversible action | Rule count, dozens of panels, percentile, grade, market verdict |
| 2. Evidence | Exact scenes/lines, observed pattern, counterexample, applicability | Fluent unsupported certainty |
| 3. Perspectives | Separately labeled model/human/craft lenses and disagreement | Collapsed consensus or hidden model influence |
| 4. Verification | Recompute, compare, challenge, before/after and side effects | Engine score delta as quality proof |
| 5. Provenance | Draft hash, mode, build, formula/rule/model/provider versions | Generic “AI-powered” language |

### Trust mechanisms

- Use “experimental synthetic reference,” never “stronger than N%” without a real population and validity argument.
- Show quick/deep mode before action and on every receipt.
- Explain abstention as a capability boundary, not an error.
- Make disagreement visible and useful: observation, craft heuristic, model, reader, and writer intent remain separate.
- Give writers explicit delete/export, challenge/correction, and provider opt-out controls.
- Never tie score to opportunity, contest rank, or marketplace access without independent governance and validated use.
- Show data and claim evidence expiry. A provider or deployment change can invalidate a prior promise.

### Accessibility and performance

Use one modal primitive with `role="dialog"`, accessible name/description, Escape and backdrop policy, initial focus, focus trap, opener restoration, and reduced-motion behavior. Critical tasks must work by keyboard and screen reader. File inputs need labels and equivalent non-drag operation. Automated axe/keyboard tests are necessary but not sufficient; representative assistive-technology completion remains a launch requirement.

Do not speculate from bundle size alone. Measure editor entry, import, analysis display, autosave, comparison, and export on representative lower-end devices and long scripts. Then split optional panels and Labs code if observed budgets fail. The current approximately 556 kB ScriptIDE chunk is a warning and measurement trigger, not proof of user harm.

### P0 and own-draft UX separation

The sample-only P0 begins only after exact-commit certification and the applicable ethics, accessible-consent, research-data, accommodation, and compensation controls. It collects no participant draft. Before the sample, ask unaided about the last real job, frequency, urgency, workaround, time/money cost, and last behavior. Then state that the output is experimental, the percentile is synthetic rather than a population percentile, and the exercise does not validate screenplay quality. Record comprehension, objections, curiosity, stated own-draft intent, and a scheduled next step separately. These are directional pre-behavioral data; the lane cannot observe actual use, payment, return, retention, or select A/B/C. If score visibility is a research variable, use a separately consented or later comparative condition.

Any own-draft experience remains disabled until the release-specific recovery, data-flow/privacy, provider consent, identity/deletion/rotation, content-manifest, and accessibility gates pass. A participant’s stated willingness does not waive those controls.

## 14. Data and Evaluation Blueprint

### Source hierarchy and legal acquisition

| Rank | Data class | Permitted use | Required controls |
|---:|---|---|---|
| 1 | Consented writer-owned real drafts and revisions with explicit study/license terms | Separately gated post-P0 own-draft behavior experiment; P1 only if its additional need and rights gates pass | Rights ledger, purpose, compensation, withdrawal/deletion, provider/human access, grouping, expiry |
| 2 | Licensed professional/educational screenplay datasets | P1 benchmark where license permits exact processing and publication | Contract review, provenance, deduplication/entity resolution, leakage isolation |
| 3 | Independently created controlled fixtures | Unit, metamorphic, parser, causal, form, and regression tests | Synthetic label, design rationale, negative cases; never population calibration |
| 4 | Public-domain or clearly licensed scripts | Supplemental robustness and format diversity | Verify status per item/jurisdiction; document edition and contamination risk |
| 5 | Product telemetry | Decision/use research only under separate consent and minimization | No automatic training label; sampling bias, rights, retention, deletion, access audit |
| 6 | Vendor outputs/pages | Competitive observables and baseline behavior | Dated capture; no efficacy transfer or confidential uploading without permission |

Every datum needs source, rights, entity identity, draft/version lineage, collection date, allowed purposes, processors, retention/deletion, quality status, and expiry. Missing rights means no use. Missing form/stage/intent means no global interpretation. Missing reader provenance means label excluded or separately analyzed.

### Sample-only P0 protocol

P0 asks whether an honestly framed sample produces **directional
pre-behavioral pull and authority-contract evidence**. It does not validate a
score, establish committed demand, select A/B/C, or observe actual product use,
payment, return, or retention. It may clear only the repository's narrow
interview gate or authorize design of a next separately gated experiment.

- **Certify, then run.** Use one commit, instance, sample, facilitator, timestamp
  and accountable certification record. No recruitment/data collection begins
  before the required controls below.
- **Unaided first.** Before showing a solution, ask about the last real feedback/
  revision job, frequency, urgency, current workaround, time/money/professional
  cost, and last observed behavior.
- **Ethics determination.** Obtain and record the applicable jurisdiction- and
  institution-specific human-subjects/ethics determination before recruitment.
  Do not self-declare exemption. If no institutional IRB applies, obtain and
  record an independent ethics review and rationale. This report makes no IRB
  or legal conclusion.
- **Consent floor.** State purpose, procedures, captured fields, optional
  recording, foreseeable professional/privacy risks, benefits, voluntariness,
  withdrawal without penalty, compensation, contacts, retention/deletion,
  quotation policy, complaint route, and no connection between favorable views
  and payment/opportunity.
- **Research-data lifecycle.** Default to no recording; require separate consent
  for recording/screen capture. Inventory contacts, recruitment source, notes,
  recording, compensation and follow-up; pseudonymize notes; keep the identity
  key separate; restrict access; set retention/deletion dates; review quotations
  for deductive identification; report aggregates or separately consented
  excerpts; test deletion.
- **Accessible and inclusive operation.** Provide accessible consent/stimulus,
  keyboard/screen-reader compatible materials, captions/transcripts, remote
  participation, breaks, scheduling/accommodation requests, and fair
  compensation. Predeclare appropriate recruitment dimensions: experience,
  professional status, form/genre, geography, language, disability/access need,
  and economic constraint. Five purposive sessions are not representative.
- **Stimulus boundary.** Collect no participant draft. State experimental status,
  synthetic-not-population percentile, and no validated screenplay-quality
  meaning. Record comprehension, objections, curiosity, stated own-draft intent,
  and scheduled next step separately from unaided need evidence.
- **Exit.** Negative or ambiguous evidence means stop/reframe/repeat. Positive
  directional evidence authorizes only design of the next gated experiment.

### P1 rights-clean benchmark design

Sample-only P0 may authorize feasibility design only. P1 execution begins only
after P0 and a later valid, separately gated experiment establish that the
observed job requires consequential automated judgment or a validated measure
inside another future. A non-authoritative, rights-cleared own-draft behavior
experiment may precede P1 after the exposure gates; it cannot emit or promote
an authoritative score.

1. **Primary claim/use and endpoint family.** Preregister one primary claim/use,
   construct, population, form/stage/mode, primary endpoint family and promotion
   rule. Label secondary/exploratory endpoints before data access.
2. **Power/precision.** Specify minimum detectable effect or target interval
   width, sample size, reader crossing/allocation, expected missingness, and the
   interpretation if precision is not achieved.
3. **Corpus rights and small-N protection.** Acquire legally distributable real
   drafts with writer, co-writer, producer/studio/underlying-work rights checks;
   processor/reader confidentiality; small-N screenplay/reader
   re-identification controls; withdrawal consequences after aggregate/model
   use; reconciled deletion across DB/WAL/backups/logs/providers.
4. **Readers.** At least three independent crossed experienced readers matched
   to use/domain. Record author-reported/verified qualification as applicable,
   genre fit, rubric, time, compensation, conflicts, demographics only where
   lawful/necessary/consented, and adjudication. Preserve raw dissent and
   unconventional work; expert consensus is not universal creative truth.
5. **Blinding/split/code freeze.** Group by work/author/version before split.
   Pre-register development/validation/untouched holdout. Freeze and hash the
   analysis code and plan before holdout access; log access and separate it from
   rule/threshold implementers.
6. **Missingness, exclusions and multiplicity.** Predeclare data/reader/script
   exclusion, missing/undefined handling, multiplicity control, baseline
   comparison order, interim/stopping rule, subgroup minimum support and
   abstention.
7. **Baselines.** Test in declared order: scene/page/word length and
   completeness, current composite, simple rubric, general-purpose LLM,
   independent human, and assisted-human condition where relevant.
8. **Uncertainty, plurality and scope.** Use agreement statistics matching the
   crossed design; report intervals, raw disagreement, reader/form/genre/
   language/experience/geographic slices and all unsupported slices. Current
   evidence is predominantly English-language and U.S./Western-market-facing;
   do not generalize globally or across cultural/professional systems.
9. **All results and confirmation.** Report every preregistered endpoint,
   including failed, excluded, undefined and imprecise results. A failed
   holdout is not repaired through analysis changes; fresh external data can
   only confirm a newly preregistered claim after the failed result remains
   disclosed.
10. **No silent skips.** Protected evaluation reports “not evaluated” if
    rights/data are unavailable and fails if the job was expected to run.

### Two nonsequential evidence tracks

Demand before rigor governs investment sequencing; integrity and permission
remain veto gates in both tracks. The tracks are not one ladder: after the
own-draft exposure gate, a non-authoritative behavior experiment can run before
P1. Claim/outcome assurance becomes mandatory only before consequential or
authoritative judgment.

| Demand/behavior level | Outcome | Primary measures | Decision use |
|---:|---|---|---|
| D0 | Directional sample-only P0 | Unaided job/frequency/urgency/workaround/cost/last behavior; comprehension, objections, stated intent, scheduled next step | Authorize only feasibility design of a separately gated experiment, or stop/reframe/repeat. |
| D1 | Gated own-draft behavior | Actual upload/use, evidence inspection, action/revert, task completion, accessibility, support burden | Record `TEST A`, `TEST B`, `TEST C`, `STOP`, or `REFRAME-REPEAT`; never infer authority from activity alone. |
| D2 | Repeat and economic behavior | Return, payment, retention, switching, contribution margin | Establish bounded demand/business evidence for the observed population and offer. |

| Claim/outcome-assurance level | Outcome | Primary measures | Required before |
|---:|---|---|---|
| A0 | Integrity and permission | No loss, no unauthorized transfer, complete restore, deletion/access evidence | Any own-draft exposure. |
| A1 | Observation correctness | Parser/source-map accuracy, localization precision/recall, recomputation, perturbation discrimination | Grounded evidence claims. |
| A2 | Exact claim validity | Held-out discrimination, calibration, confusion matrices, intervals, abstention, slices, baseline superiority | Any consequential or authoritative automated judgment. |
| A3 | Decision usefulness and reliance | Comprehension, correct challenge/override, verification time, decision quality, cognitive load, accessibility | Bounded workflow-benefit claims. |
| A4 | Revision consequence | Blinded paired original/revision ratings against writer-stated goal, side effects, reversals, nulls | Artifact-improvement claims. |

### Evaluation matrix

- **Primary metrics:** construct-specific, preregistered held-out endpoints; no universal “accuracy.”
- **Safety metrics:** destructive mutation rate, unauthorized transfer, false high-confidence/abstention rate, provider budget breach, recovery point objective, deletion completion.
- **Calibration metrics:** reliability diagrams/interval coverage where the output is probabilistic; threshold confusion matrices and selective-risk/abstention curves.
- **User-value metrics:** task completion, concrete revision decision, challenge/correction, accepted/rejected/reverted action, repeat draft, payment, accessibility completion.
- **Slice tests:** form, completeness, length, genre, stage, language/Unicode, parser quality, writer experience, reader expertise, quick/deep/provider/model.
- **Temporal tests:** drift canaries, model/provider reruns, old receipt reconstruction, schema migrations, rights/claim expiry.
- **Adversarial tests:** prompt-like script text, padding/scene gaming, shuffled acts, causal deletion, duplicate text, malformed imports, fan-out, timeout/fallback, content resurrection.
- **Golden cases:** small versioned cases with explicit use, expected observation, counterexample, abstention, and reviewer sign-off; never substitute for real held-out evidence.
- **Production monitoring:** lineage completeness, budget/latency/error, abstention, challenge, reversals, incident/deletion/restore drills, distribution shift. Avoid collecting screenplay content by default.

### Quick/deep and human evaluation separation

Quick mode can be tested for deterministic observation and bounded measures. Deep mode needs repeated-provider/model/prompt stability, hostile-content resistance, fallback semantics, and separate validity. Human-assisted B needs independent-human, machine-only, and assisted-human arms to detect anchoring and complementarity, plus reader variance and full cost. One mode’s success cannot certify another.

### Legal and temporal controls

The EU AI Act generally applies from 2026-08-02 subject to provision-specific timing and actor/scope analysis; this audit does not classify STORYMACHINE or determine applicability ([Regulation (EU) 2024/1689](https://eur-lex.europa.eu/eli/reg/2024/1689/oj) <!--ref:G11--><!--anchor:section:Article%20113-->). WGA's official 2026 MBA FAQ describes a bounded notification and remuneration-discussion provision for company licensing of writer material to train a commercial generative-AI system; the agreement context is not universal product law or an applicability determination ([Writers Guild of America, 2026](https://www.wga.org/contracts/contracts/mba/2026-mba-contract-changes-faq) <!--ref:S02--><!--anchor:section:Artificial%20intelligence-->; [Protocol Amendment 03](./PROTOCOL_AMENDMENT_03.md)). G12 remains the separate source for 2023 MBA AI protections. The U.S. Copyright Office's Part 2 report is administrative guidance on copyrightability, not a court judgment or global rule ([USCO, 2025](https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf) <!--ref:G09--><!--anchor:page:1-52-->). Part 3 remained pre-publication at the frozen verification date and requires a refresh before use. Qualified counsel must evaluate actual geography, roles, providers, contracts, claims, human-subjects obligations, and features.

## 15. Prioritized Upgrade Register

The directive priority and ROADMAP sequence are independent axes.

| Work package | Directive priority | ROADMAP gate/disposition | Delivery mode | Impact/evidence and dependency | Owner | Exit test |
|---|---|---|---|---|---|---|
| Minimal canonical supersession | **P0** | **FIX NOW** | build now | Prevents implementation from following false history; none | Governance/Maintainers | Governing search has no unsupported active claim; staleness checks pass. |
| Retire JSON import; relabel export | **P0** | **FIX NOW** | build now | Stops reproduced loss; no portable-envelope dependency | Backend/Data Integrity | Every POST body returns 410 and preserves DB/WAL/project bytes; export says non-recoverable simulation observation. |
| Simulation-only reset, mutation coordinator, online backup | **P0** | **FIX NOW** | build now | Prevents normal action deleting writer state; depends on generated simulation aggregate | Backend/Architecture | G-004 populated/concurrent/WAL/failure/project-deletion suite passes. |
| Docker context deny policy | **P0** | **FIX NOW** | build now | Closes confirmed confidential context path | DevSecOps | Sensitive sentinels absent; image builds. |
| Disable or contain generative routes | **P0** | **FIX NOW** | build now | Bounds critical fan-out; provider-call inventory | Backend/Platform | Route classification and adversarial call/concurrency/token/time/cancel budgets pass. |
| Safe logs and AI-config truth | **P0** | **FIX NOW** | build now | Removes raw-error path/false readiness; deployment admin decision remains | Security/Backend/Frontend | Sentinel logs clean, response schemas parse, auth remains fail-closed. |
| Upload/save/title integrity | **P0** | **FIX NOW** | build now | Preserves visible writer intent/state; project-state migration dependency | Frontend/Backend | Delayed upload, mirror-fault, Unicode reload/conflict tests pass. |
| Isolated journey and modal/browser gate | **P0** | **FIX NOW** | build now | Makes validation/accessibility evidence trustworthy | QA/Accessibility/Frontend | Parallel no-data-delta run; keyboard/axe/AT critical-path exit. |
| Sample-only research controls and sessions | **Research** | **sample-only P0** | manual first | First directional evidence; certification, ethics, consent/data/accessibility prerequisite | Founder/Product Research/Ethics owner | Valid unaided-first sessions; only narrow interview-gate conclusion, explicit stop/next-experiment decision. |
| Own-draft privacy/identity/lifecycle | **P1** | **own-draft gate** | design now/build later | Required for confidential real-draft exposure; actual deployment/provider/qualified review | Privacy/Security/Product | Transfer manifest, threat model, deletion/access/backup/provider drill and participant comprehension pass. |
| Construct/rights/reader/P1 protocol | **Research** | **P1** | research first | Required for any score authority; sample P0 plus a later valid experiment gate showing need for consequential automated judgment, and licenses | Measurement/Data Steward | Preregistered primary endpoint, power/precision, rights, reader crossing, multiplicity and immutable analysis hash. |
| Held-out benchmark/deep study/outcomes | **P1** | **P1** | research first | Determines exact measure eligibility; protocol/corpus/readers | Evaluation/AI Safety | All endpoints/baselines/slices/abstention reported; fresh confirmation; no silent skips. |
| Conditional A/B/C product surface | **P2** | **P2** | design now/build later | No future selected; separately gated post-P0 experiment decision required; A also requires exact Stage 6 P1 validity | Product/Frontend/Service owner | Branch-specific comprehension, evidence and gate exits; no cross-future default. |
| Immutable artifact/runtime/readiness | **P1** | **HOLD** | design now/build later | Required before external release, not before research | Release/SRE | Same qualified digest deployed; boot/persistence/restore/readiness/provenance pass. |
| Performance optimization | **P3** | **HOLD** | research first | User impact unknown; representative task/device data required | Frontend/QA | Predeclared budget fails, then targeted change passes without regression. |
| Human marketplace/distribution network | **Research** | **HOLD** | manual first | Conditional B/distribution economics unknown | Service Ops/Strategy | Secure concierge proves quality/nonanchoring/margin before any scale design. |
| New rule waves/threshold retuning/catalog growth | **Reject** | **HOLD** | do not build | No demand/validity; Goodhart/distraction risk | Measurement owner | Revisit only by explicit post-P0/P1 approved migration; none authorized now. |
| Objective/industry/greenlight/marketability claims | **Reject** | **HOLD** | do not build | Claim-specific substantiation absent | Product/Qualified legal reviewer | No publication until exact evidence/owner/expiry and fact-specific review exist. |

### Smallest credible version

The smallest credible version is not a rebuilt clinic. It is an exactly certified sample report used in a no-draft P0 conversation, plus immediate correction or disablement of irreversible repository boundaries. P0 can authorize only feasibility design. A smallest private C prototype—one Doctor+Editor flow with task/form capture, three evidence cards, one revision experiment, one before/after receipt, and no authoritative scalar—requires the own-draft exposure gate and a later separately gated behavior experiment; product implementation requires that experiment's recorded `TEST C` decision.

## 16. Implementation Roadmap

### Stage 0: Freeze divergence and certify the learning stimulus

**Objective:** prevent false state from guiding implementation and certify the only current learning lane.

- **Exact deliverables:** minimal supersession corrections in every governing document; one audit decision record; exact commit/instance/sample/facilitator owner/time certification; experimental/synthetic disclosure; applicable ethics determination; accessible consent/data/accommodation/compensation plan; narrow stop/next-experiment rule.
- **Components affected:** ROADMAP, NORTH_STAR, ULTRAPLAN, ARCHITECTURE, README, P0 controls and sample.
- **Dependencies:** none; critical repair runs in parallel.
- **Acceptance criteria:** unsupported active claims are marked superseded; a second operator reproduces the stimulus; no draft collection; ethics/consent/data/accessibility controls approved for the actual context.
- **Tests:** canonical search/staleness; exact-commit smoke; accessible-material/keyboard check; consent/data checklist dry run.
- **Risks:** rushed prose can overstate future code; certification can be mistaken for demand or ethics clearance.
- **Exit conditions:** recruitment may begin only after all Stage 0 controls. No future/score/own-draft work authorized.
- **Documents updated:** governing documents above, claim register stub, P0 certification/consent/data plan.
- **Decisions open:** responsible ethics reviewer/route; recording default remains no; recruitment dimensions and compensation owner.

### Stage 1: Stop irreversible content and confidentiality failures

**Objective:** eliminate or disable paths that can destroy, expose, or falsely claim recovery of writer work.

- **Exact deliverables:** unconditional non-mutating 410 import; non-recoverable simulation-observation export label; disabled then transactional simulation-only reset; separately named project deletion; per-session mutation coordinator; generated simulation manifest; verified online backup; `.dockerignore`; safe logs; G-006 routes disabled until budgets pass or contained here.
- **Components affected:** config/game routes, Stage/session store/backup, ScriptIDE reset caller, save/room/config/turn writers, Docker context, provider wrapper/logger.
- **Dependencies:** generated simulation aggregate and mutation inventory; future portable envelope is not a dependency.
- **Acceptance criteria:** G-001 to G-007 exits pass; project/editor state survives reset exactly; backup failure prevents mutation; generative calls are disabled or bounded.
- **Tests:** 410 state/byte identity; populated concurrent/delayed reset/save/room/config/turn; active WAL; separately confirmed project deletion; context/log sentinels; adversarial provider fan-out.
- **Risks:** safe backup can mask over-broad reset; turn-only queue can be mistaken for coordinator; narrow fixture can hide omitted fields.
- **Exit conditions:** mergeable scoped code only, not deployment authorization; no recovery package ships until G-004 passes fully.
- **Documents updated:** aggregate/reset ADR, route capability manifest, README recovery wording, SECURITY/RELIABILITY runbooks.
- **Decisions open:** generated simulation aggregate membership; project deletion lifecycle; engine budgets. Portable envelope remains future-gated.

### Stage 2: Enforce route, state, and UI boundary contracts

**Objective:** make field and validation behavior match the writer’s visible intent.

- **Exact deliverables:** complete route classification/budget enforcement if not closed in Stage 1; AI-config parity/admin truth; upload cancellation; typed draft outcome; title persistence; isolated E2E; shared modal; browser/axe/keyboard journey.
- **Components affected:** route registration/provider wrapper, StartScreen/Form, draft store/ScriptIDE schema, Settings/modal components, test bootstrap/CI.
- **Dependencies:** Stage 1 aggregate/version choices for title/export; deployment posture for Settings.
- **Acceptance criteria:** G-006 and G-008 to G-014 pass; no stale upload; primary-save truth; metadata conflict/reload preservation; no test pollution; focus restored.
- **Tests:** route completeness/fan-out, delayed upload, storage fault injection, Unicode migration/conflict, parallel E2E, browser semantic/axe/keyboard and manual AT smoke.
- **Risks:** UI green path can hide provider/admin deployment mismatch; accessibility automation can be mistaken for lived usability.
- **Exit conditions:** mergeable validation-readiness code only; no demand or own-draft authorization.
- **Documents updated:** route manifest, accessibility matrix, draft/project schema ADR, CI capability matrix.
- **Decisions open:** operator-only versus authenticated admin; supported browser/AT/device matrix.

### Stage 3: Correct governing truth and define the own-draft gate

**Objective:** align maintainers, product claims, and a future confidential-draft contract.

- **Exact deliverables:** full current/target canonical correction after Stage 0 minimum; claim register; project/route ADRs; deployment/data/subprocessor map; provider notice; lifecycle inventory; threat/identity plan.
- **Components affected:** governing documents and operational/policy specifications.
- **Dependencies:** Stages 1 and 2 implementation truth; actual providers/deployment; qualified counsel for legal claims.
- **Acceptance criteria:** no unsupported active claim; exact deployment is described; deletion inventory/drill design reconciles stores.
- **Tests:** canonical link/search/staleness; claim-to-evidence review; data-map-to-code/config reconciliation dry run.
- **Risks:** documents can claim controls before deployment evidence; qualified review can be implied when absent.
- **Exit conditions:** current truth is coherent; own-draft remains blocked.
- **Documents updated:** all Section 17 authorities.
- **Decisions open:** actual deployment/providers/regions, identity scope, counsel/privacy/security owners.

### Stage 4: Complete sample-only P0 and design the next gate or stop

**Objective:** collect directional pre-behavioral need and authority-contract evidence.

- **Exact deliverables:** unaided pre-stimulus need records, sample comprehension/objections/stated intent/scheduled next step, recruitment provenance, disconfirming cases, pseudonymized data log, narrow gate decision.
- **Components affected:** research operations only; no product code/future surface.
- **Dependencies:** all Stage 0 certification, ethics, consent, data, accessibility, accommodation and compensation controls.
- **Acceptance criteria:** valid sessions; no draft/use/payment/return claim; no score-validity, PMF or future-selection claim.
- **Tests:** facilitator dry run, consent comprehension, data-access/deletion/quotation review, accessibility/accommodation check, protocol-deviation audit.
- **Risks:** solution priming, deductive identification, founder-adjacent sample, stated intent laundered into demand.
- **Exit conditions:** clear narrow interview gate and design next gated experiment, or stop/reframe/repeat. No A/B/C selection from this lane alone.
- **Documents updated:** P0 tracker/session evidence, ethics determination, data/quotation/deviation logs, decision record.
- **Decisions open:** next experiment design only; committed behavior remains unobserved.

### Stage 5: Clear the own-draft/private-beta gate for the approved experiment protocol

**Objective:** safely observe actual draft behavior without pretending public readiness.

- **Exact deliverables:** complete declared recovery, current transfer authorization/content manifest, provider consent, notice, identity/rotation/revocation, export/delete, lifecycle drill, accessible path, support/incident owner.
- **Components affected:** actual experiment deployment, policy gateway, identity/session, data stores/providers, UI/accessibility and support.
- **Dependencies:** Stages 1 to 4 and an approved post-P0 experiment protocol; this is not a branch selection.
- **Acceptance criteria:** exact-artifact threat/lifecycle evidence; isolation; participant comprehension/export/delete; critical accessibility completion.
- **Tests:** transfer reauthorization including imported expired/revoked receipts, deletion reconciliation, backup/log/provider drill, cross-session/SSE, browser/AT journey.
- **Risks:** historical policy receipt treated as authorization; small-N reidentification; deletion promise exceeds provider/backup facts.
- **Exit conditions:** allowlisted own-draft experiment only; no public/team expansion.
- **Documents updated:** DATA_LIFECYCLE, privacy notice/consent, SECURITY, ACCESSIBILITY, incident/runbook and experiment protocol.
- **Decisions open:** exact provider/person, retention, geography, participant population and support SLA.

### Stage 5B: Run and evaluate the separately gated behavior experiment

**Objective:** observe committed behavior safely and create the only record that can authorize a future branch.

- **Exact deliverables:** preregistered non-authoritative A/B/C comparative or single-hypothesis experiment; actual own-draft use/action/revert/return evidence as applicable; protocol deviations and nulls; signed decision record containing exactly `TEST A`, `TEST B`, `TEST C`, `STOP`, or `REFRAME-REPEAT`.
- **Components affected:** allowlisted experiment deployment and research operations only; no branch product implementation.
- **Dependencies:** Stages 1–5, including exact exposure/privacy/identity/accessibility clearance; sample-only P0 may authorize design of this experiment, never its result.
- **Acceptance criteria:** predeclared behavioral endpoint and stop rule evaluated; all null/adverse/deviation evidence retained; no authoritative score or product-future claim; decision owner records one permitted disposition.
- **Tests:** protocol dry run; transfer/deletion/accessibility checks on exact artifact; behavioral-event provenance; deviation/missingness audit; independent decision-record review.
- **Risks:** activity mistaken for benefit; stated preference replaces behavior; unsafe draft exposure; one branch framed more persuasively; founder discretion overrides the stop rule.
- **Exit conditions:** valid record of `TEST A`, `TEST B`, `TEST C`, `STOP`, or `REFRAME-REPEAT`. `TEST A` authorizes Stage 6 P1 execution only, not an A product build; `TEST B`/`TEST C` may authorize Stage 7 only after their other branch gates.
- **Documents updated:** experiment protocol/data card, deviation and adverse-event logs, claim register, ROADMAP decision record.
- **Decisions open:** experiment comparison/endpoint/population and decision owner must be frozen before exposure; branch remains open until the signed record.

### Stage 6: Run P1 only if the observed job requires validated judgment

**Objective:** determine whether any score/use deserves authority.

- **Exact deliverables:** primary claim/endpoint preregistration, power/precision/MDE or interval target, rights/co-rights corpus, crossed reader plan, missing/exclusion/multiplicity/baseline/stopping rules, immutable analysis hash, grouped holdout and all results.
- **Components affected:** evaluation protocol/data/analysis environment only until promotion.
- **Dependencies:** sample-only P0 plus a valid Stage 5B `TEST A` or other explicit Stage 5B record showing need for consequential automated judgment; rights/privacy contracts, qualified readers, and holdout governance.
- **Acceptance criteria:** all preregistered passed/failed/undefined/excluded endpoints reported; ordered baselines, intervals/slices/abstention and no leakage; fresh data confirms rather than repairs.
- **Tests:** rights/access audit, split/group leakage, analysis-hash lock, reproducibility, multiplicity/missingness, protected no-skip job, external confirmation.
- **Risks:** selective survival, expert convention, English/U.S. overgeneralization, small-N reidentification, failed holdout “repair.”
- **Exit conditions:** exact measure may become eligible only for its supported use; failure/narrow scope is a stop/abstain result.
- **Documents updated:** EVALUATION_PROTOCOL, rights/data card, claim register, model/build card, decision record.
- **Decisions open:** exact claim/use, precision budget, reader population and lawful/ethical slice collection.

### Stage 7: Implement the authorized P2 surface

**Objective:** implement only the product future authorized by evidence outside sample-only P0.

- **Exact deliverables:** branch-specific A, B, or C surface and approved claim cards; or no product surface under STOP/HOLD.
- **Components affected:** selected product UI/service only; shared substrate remains unchanged.
- **Dependencies:** a valid Stage 5B post-P0 experiment decision record; `TEST B` or `TEST C` plus branch-specific gates for B/C, or `TEST A` plus an exact passing Stage 6 P1 validity result for A. `STOP` and `REFRAME-REPEAT` prohibit branch implementation.
- **Acceptance criteria:** branch-specific comprehension/quality/gate tests; every claim live; no unselected future appears as default.
- **Tests:** branch-specific A/B/C table in Sections 11-13; browser/service protocol and claims review.
- **Risks:** C detail becomes de facto selection; A overgeneralizes P1; B scales before unit economics.
- **Exit conditions:** bounded private candidate only; external gates remain.
- **Documents updated:** ROADMAP decision, ARCHITECTURE, product/claim/help/privacy docs.
- **Decisions open:** future selection remains open until the Stage 5B decision record and all branch-specific gates; sample-only P0 alone cannot decide it.

### Stage 8: Qualify public release and earn scale

**Objective:** promote the same tested artifact under an operable, auditable topology.

- **Exact deliverables:** compiled runtime-only image, immutable digest, build-once/promote, pinned actions/images, SBOM/signature/provenance, boot/readiness/persistence/restore, restart runbook, incident/rollback, performance/cost budgets.
- **Components affected:** release workflow, image/runtime, deployment/storage/monitoring/runbooks.
- **Dependencies:** selected product and public-launch privacy/identity/accessibility/legal gates.
- **Acceptance criteria:** exact qualified digest deployed; version immutable; rollback restores; readiness fails closed; lineage reconstructable.
- **Tests:** clean-image boot, persistence/restart/restore, unwritable readiness, artifact/provenance/signature/SBOM, rollback and incident drill.
- **Risks:** source-tested artifact differs from deployment; liveness masks storage; public scope exceeds privacy/legal/accessibility evidence.
- **Exit conditions:** limited external release only if Section 19 passes all exposure-specific gates.
- **Documents updated:** RELEASE, RELIABILITY, SECURITY, DATA_LIFECYCLE, ACCESSIBILITY, README and incident record.
- **Decisions open:** hosting/region/provider, supported topology/SLO/RPO/RTO and final qualified reviews.

## 17. Canonical Documents

Audit artifacts are dated evidence snapshots. They should not silently become governing direction. The permanent system needs a small canonical hierarchy with generated/executable truth taking priority for current state.

| Document | Required action | Required content / prohibition |
|---|---|---|
| `ROADMAP.md` | **Rewrite affected claims, preserve sequence** | Remove 8,917/5,701 history; retain freeze for independent validity rationale; separate sample-only P0 from own-draft gate; name exact gate owner/evidence; retain P0→P1→P2 order and stop option. |
| `NORTH_STAR.md` | **Correct constitution** | Core law “no conclusion outruns evidence”; define claim tiers, writer authority, noncompensable gates, and narrow deterministic claim; remove false rule arithmetic. |
| `ULTRAPLAN.md` | **Replace with short active execution brief** | Current FIX NOW queue, parallel sample P0, own-draft block, owners, dependencies, exact exit tests; no retired wave language. |
| `ARCHITECTURE.md` | **Major rewrite** | Running dual-product truth vs target; project/simulation aggregates; 14-pass pipeline; quick/deep boundary; route taxonomy; state owners; single-node constraint; recovery and failure contracts; remove indefinite waves and stale parity. |
| `README.md` | **Correct operator/user promises** | Honest export/import name, backup/restore limits, browser-profile session capability, keyless/deep data flow, supported topology, readiness/restart, exact setup and AI config posture. |
| `docs/rulebook/README.md` | **Keep generated** | Do not hand-edit; generated 3,216 count remains syntactic implementation truth. Add no value/validity inference. |
| `docs/CLAIMS.md` | **Create** | Every product/marketing/technical claim, exact wording, evidence, domain, owner, expiry, prohibited inference, refresh trigger. |
| `docs/PROJECT_AGGREGATE.md` plus ADR | **Create** | Project versus simulation state; `dbSchemaVersion` versus `projectEnvelopeVersion`; generated field/FK/history/size manifest; current import 410; simulation-only reset; coordinator; future envelope gate; WAL backup; deletion. |
| `docs/DATA_LIFECYCLE.md` and deployment privacy notice | **Create** | Data classes, providers/humans, purpose, storage, encryption, retention/deletion, backups/logs, subprocessors, regions, incidents; distinguish quick/deep. Counsel review for public terms. |
| `docs/EVALUATION_PROTOCOL.md` | **Create before P1** | Constructs, rights, readers, preregistration, grouped holdout, baselines, uncertainty, slices, abstention, leakage, outcome hierarchy, promotion/rollback. |
| `docs/ROUTE_CAPABILITIES.md` plus generated manifest | **Create** | Every endpoint class, body schema, limiter, provider budget, auth, audit, data classes, response schema; CI completeness. |
| `docs/RELIABILITY.md` | **Merge into one operable runbook** | Backup/restore drill, readiness/restart, topology, RPO/RTO, provider degradation, incident and rollback. Do not leave competing untracked drafts. |
| `SECURITY.md` | **Create/merge one tracked authority** | Threat model, vulnerability reporting, supported exposure, capability-session limits, secret/log/build rules, provider boundary. Do not claim audit/certification. |
| `docs/ACCESSIBILITY.md` | **Create** | Scoped WCAG target, automated/manual matrix, supported AT/browser, known limits, remediation owner. |
| `docs/RELEASE.md` | **Create** | Version/tag/digest invariants, build-once/promote, action pinning, SBOM/signing/provenance, qualification and rollback evidence. |
| `docs/decisions/` | **Create dated ADR/decision records** | Product future, score visibility, aggregate, identity exposure, provider policy, benchmark promotion. Each includes evidence, owner, expiry, superseded-by. |
| Retired wave/research material | **Archive/index, do not delete evidence** | One explicit “retired/backlog, noncanonical” index. Preserve history; remove links that imply active work. |
| This audit directory | **Preserve immutable snapshot** | Evidence for 2026-07-14/15 only. Future changes update canonical docs and create a new dated verification record, not rewrite audit history except review corrections. |

Canonical precedence should be: generated artifacts and executable contracts for live state; dated ADRs for decisions; ROADMAP for sequence; NORTH_STAR for product law; ARCHITECTURE for target/current system; README/runbooks for operation. A prose assertion that conflicts with an executable witness is automatically disputed until reconciled.

## 18. Top Unresolved Questions

| Question | Why it matters | Evidence that resolves it |
|---|---|---|
| 1. Do target writers report a real unaided problem and directional pre-behavioral pull after an honestly framed sample? | No future has demand authorization, and the lane cannot observe committed use. | Valid unaided-first sample P0 with certification, ethics/consent/data/accessibility controls, recruitment provenance, objections, stated intent, scheduled next step, and narrow stop/next-experiment rule. |
| 2. Which writer decision is primary: consequential verdict, reflective evidence, or accountable human interpretation? | A separately gated behavior experiment records `TEST A`, `TEST C`, `TEST B`, `STOP`, or `REFRAME-REPEAT` and determines the next operating-model gate. | Run only after P0 and exposure clearance, using observed behavior rather than preference alone. |
| 3. What exactly is the portable writer-owned project aggregate? | Recovery, export, deletion, collaboration, and migration cannot be proven without it. | Owner ADR plus populated manifest and clean-release semantic round trip under failure/WAL. |
| 4. Should the current scalar be hidden, explicitly experimental, or isolated as a research variable? | Visibility can anchor P0 and contaminate demand evidence. | Predeclared comparative/consented stimulus design and comprehension/behavior results; no score validation inference. |
| 5. What construct and decision would any future score represent? | “Quality/readiness/usefulness” are plural and cannot share one label safely. | Writer/reader construct work, task/form/use definition, consequences, abstention and claims specification. |
| 6. Can a rights-clean representative real-draft benchmark be acquired? | Without rights and grouped holdout, A cannot be audited or marketed honestly. | Signed rights ledger, representative sampling plan, reader contracts, leakage governance, budget. |
| 7. What reader disagreement is acceptable for each construct? | A model cannot exceed an undefined or incoherent reference target. | At least three matched independent readers, raw distributions, chosen agreement statistic/interval, adjudication policy. |
| 8. Does located evidence improve a writer’s decision without overwhelming or anchoring them? | C can be honest yet unwanted or cognitively expensive. | Accessibility-inclusive comparison measuring comprehension, verification, challenge, decision, time, and blind outcome. |
| 9. Does machine evidence improve a human reader over the better-alone baseline? | B can add cost and anchoring without complementarity. | Independent-human, machine-only, assisted-human experiment plus reader variance and fully loaded cost. |
| 10. What deployment, providers, regions, and data lifecycle will the product actually use? | Privacy, legal, identity, deletion, and incident requirements are fact-specific. | Frozen deployment data map, contracts/terms, transfer manifests, deletion drill, qualified jurisdictional review. |
| 11. Is single-node private deployment the intended near-term product boundary? | Process-local queues, rooms, cache, and SQLite make generic scaling unsafe. | Owner decision and enforced topology, or a designed shared authority with conflict/audit tests. |
| 12. Can deep mode remain stable and reconstructable across provider changes? | A result can change without source release. | Pinned lineage, repeated canaries, provider/model comparisons, drift thresholds, fallback and abstention evidence. |
| 13. Will writers pay enough for confidentiality, continuity, receipts, or human context to fund their operating cost? | Visible market prices do not establish margins or value. | Post-P0 cohorts with actual payment, repeat use, retention, switching, support/security/evaluation cost. |
| 14. Which legal/professional duties apply to the actual entity and launch? | This audit cannot classify roles or jurisdictions. | Current fact inventory and qualified legal review, refreshed when laws/provider terms/features change. |
| 15. Who is accountable when the owner or agents are unavailable? | Current decision memory and high churn create governance risk. | Named owners/delegates, machine-readable inventories, expiry/escalation, recovery/incident exercises. |

## 19. Final Quality Audit

### Evidence and consistency audit

| Audit question | Result | Evidence of completion or remaining limit |
|---|---|---|
| Merely restated supplied material? | **No.** | Executed export/import/destructive-import, CI, build, HTTP, dependency, and source-verification witnesses materially changed the conclusions. |
| Conducted actual external research? | **Yes, bounded.** | 86 candidates to 48 frozen verified sources plus transparently supplemental S01/S02; DOI and primary-page verification; vendor efficacy excluded. |
| Identified non-obvious gaps? | **Yes.** | Over-broad simulation reset deleting editor authority, mutation-coordinator absence, complete-or-disable aggregate, separate version domains/transport manifest, form/intent confound, Docker context, fan-out, upload resurrection and mixed-time decision model. |
| Challenged the central assumptions? | **Yes.** | Automated judge authority rejected as unestablished; Draft MRI demoted to hypothesis; human service and stop option preserved; no future selected. |
| Found silent-success failures? | **Yes.** | FM-01 through FM-32 include deterministic invalidity, lossy success, green liveness, clean final image after dirty context, score gaming, telemetry bias, mutable artifacts. |
| Distinguished facts, assumptions, hypotheses, gaps, and risks? | **Yes.** | Explicit evidence labels, 83-row truth registry, claim tiers, no legal/breach/efficacy inference beyond evidence. |
| Resolved contradictions? | **Yes where evidence permits.** | Ten conflict resolutions and supersession matrix; readiness, aggregate, legal applicability, demand, and product selection remain explicitly unresolved. |
| Preserved valuable work? | **Yes.** | Keyless core, server-side keys, validation, receipts, optimistic concurrency, online backup primitive, 14-pass tests, reduced motion, observability retained. |
| Removed unnecessary complexity? | **Conditionally.** | Shared substrate is separated from equally explicit A/B/C/stop deltas; no future UI, rule wave, marketplace, distribution build or speculative performance rewrite is authorized. |
| Produced a corrected system rather than only criticism? | **Yes.** | Modules, contracts, state ownership, claim tiers, decision flow, abstention, UX, data/evaluation, owners, exits, and roadmap are specified. |
| Implementation-specific enough? | **Yes.** | G-001 to G-031 include owner/dependency/exit; stages include components, tests, risks, and acceptance. |
| Would a leading professional find the work unusually thorough? | **Likely for an AI-assisted internal audit, with material limits.** | Whole-repo execution, 12 perspectives, verified research, 31 gaps, 32 failures, adversarial/editorial/ethics review, exact contracts and exits exceed a normal review; no independent human domain/security/legal/accessibility validation or real-writer evidence exists. |
| Anything generic or unsupported? | **Known limits remain.** | No direct writer sessions, no real-draft benchmark, no human expert/editor/legal/security validation, no deployment-specific legal verdict, no private competitor outcomes. |

### Three-future sensitivity audit

The transparent owner-prior exercise rated Future A 48.8, B 71.4, and C 83.0 under evidence-first weights. **That 83.0 is not product evidence: it is adjacent to correlated honesty/agency/reversibility criteria, owner-selected weights, and mixed current/future ratings.** Under premium nuance/learning weights B leads at 85.8; under scale/defensibility weights that presuppose strong P1, A leads narrowly at 80.6; under catastrophic trust-error weights C leads at 89.6. Any actual P1 success requires scenario-consistent rerating, not only new weights. The only robust current conclusion is repair/disable, bounded directional P0, then stop/reframe or design a separately gated next experiment ([PHASE_3_COMPETING_FUTURES.md:298-449](./PHASE_3_COMPETING_FUTURES.md#5-secondary-decision-model)).

### Final ship/no-ship table

| Scope | Decision now | Why | Reconsider when |
|---|---|---|---|
| Scoped FIX NOW code | **MERGEABLE only after full verification; not deployment authorization** | Safety/integrity/truth fixes are roadmap-compatible, but exposure-specific Critical gates remain vetoes. | Focused exits plus full lint/test/build and clean review; deployment remains blocked while any applicable Critical gate is open. |
| Import/reset/recovery package | **NO SHIP** | Import must be 410 and simulation reset currently deletes project/editor authority; coordinator/manifest/WAL exits are unmet. | G-001 to G-004, especially populated concurrent/delayed simulation-reset preservation, pass on exact artifact. |
| Sample-only, no-participant-draft P0 | **GO only after certification and research controls** | It yields directional pre-behavioral evidence, not committed demand. | Exact commit/owner/time plus applicable ethics determination, consent/data lifecycle, accessible/inclusive materials/accommodations/compensation, no-draft enforcement and dry run. |
| Own-draft/private beta | **NO SHIP** | Recovery, privacy/data flow, consent, identity/deletion/rotation, content manifest, and accessibility gates fail/not demonstrated. | Stage 5 exit passes on exact artifact and deployment. |
| Current Health/100, percentile, grade, verdict as authority | **NO SHIP** | Synthetic calibration and no real-writing validity argument; form/intent confound. | Exact claim/use passes P1 with uncertainty, baselines, slices, abstention and monitoring. |
| Future C build | **HOLD** | Conditional owner-prior concept; zero writer demand; sample-only P0 cannot select it. | A later gated experiment, designed after directional P0, supports located evidence without scalar authority; own-draft gates then pass. |
| Future B service/marketplace | **HOLD** | Reader quality, anchoring, confidentiality, supply, cost and willingness unknown. | Later gated evidence supports human-context need; secure concierge proves value and margin before scale. |
| Future A automated authority | **NO SHIP / P1 option only** | Defining claim fails score-honesty gate. | P0 asks for it and P1 passes exact real-draft validity gates. |
| P2 surface collapse | **HOLD** | Strategically sensible but roadmap-gated and not evidence-selected. | A valid Stage 5B experiment decision authorizes B/C consideration; A also requires an exact passing Stage 6 P1 result. |
| Public/team launch | **NO SHIP** | Multiple noncompensable integrity, security/privacy, legal/data, identity, accessibility, demand, and release gates fail. | All exposure-specific gates and immutable artifact qualification pass. |
| Public distribution/opportunity/greenlight claims | **REJECT now** | No score validity, governance, demand, or network evidence. | Separate validated use, independent governance, claim substantiation and distribution evidence. |

### Final conclusion

STORYMACHINE is not a weak codebase. It is a technically ambitious system whose software proof has outrun its product, measurement, recovery, and confidentiality proof. The audit’s hardest conclusion is therefore also its most constructive: preserve the deterministic and provenance substrate, stop presenting it as validated screenplay authority, eliminate the irreversible trust failures, and spend the next unit of product effort on honest writer evidence rather than more engine surface.

The current strategic decision is precise: **repair or disable critical trust boundaries; certify the sample-only P0 and its ethics, consent, data and accessibility controls; then run it in parallel; use the directional result only to stop/reframe or design the next gated experiment.** Anything stronger would exceed the evidence.
