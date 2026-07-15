# Repository, Product, and Industry High-End Audit Design

**Date:** 2026-07-14
**Status:** Expanded design awaiting written-spec approval
**Repository:** STORYMACHINE

## Purpose

Reconstruct STORYMACHINE from its implementation and evidence, test whether its
central product and scoring thesis can succeed, audit every material technical
and operational boundary, research the surrounding industry and relevant
adjacent disciplines, and produce the strongest credible corrected system and
route to build it.

This is not a feature-list review or a plan assembled from existing project
language. Every consequential claim, architecture decision, metric, workflow,
and strategic assumption must earn acceptance. The audit must distinguish
genuine capability from surface complexity, find ways the product can fail
while appearing successful, preserve what is demonstrably strong, reject what
is unsupported, and turn the result into executable corrections.

The run includes remediation: confirmed defects are fixed when authorized by
the governing constraints below. Larger redesigns, evidence-gated scoring
changes, and roadmap changes receive canonical specifications and sequenced
implementation routes rather than being smuggled into the audit as unvalidated
code.

## Governing Constraints

- `ROADMAP.md` is the sequencing authority. P0 validation blocks new product
  and engine work; critical security repairs remain allowed. Findings that
  require product, engine, or scoring changes outside that exception receive a
  documented remediation and are held for explicit authorization.
- `NORTH_STAR.md` controls product principles. Demand must precede rigor, and a
  reproducible score is not valuable until it is shown correct on real writing.
- No entries may be added to the 8,917-entry generated rule catalog. Removal is
  a separately approved migration, never implied by audit criticism.
- Scoring findings require runnable discrimination evidence on real writing.
  Synthetic fire/no-fire coverage is not sufficient evidence for a retune.
- The server must continue to boot and provide deterministic analysis without
  an AI key.
- API keys remain server-side. AI routes use `aiLimiter`; other routes use at
  least `gameLimiter`; every request body is zod-validated.
- No new `console.*` calls may appear under `server/**`.
- Existing user changes in the worktree are preserved. Audit work does not
  rewrite, stage, or commit unrelated files.
- OneDrive-safe editing and verification practices apply.
- External research must use real, cited sources. Technical conclusions prefer
  primary sources, official standards, peer-reviewed research, public datasets,
  regulator guidance, and first-party product documentation. Commercial claims
  are cross-checked against independent operator or user evidence where
  possible.
- Facts, supported conclusions, inferences, assumptions, hypotheses, and
  unresolved claims must remain visibly distinct.

## Scope and Completeness

The audit covers all first-party source, tests, configurations, scripts,
deployment assets, active and historical documentation, research material,
prompts, fixtures, schemas, generated outputs, version history, and decision
records available in the repository. A coverage ledger records every repository
file and its disposition.

Third-party dependency and generated-output directories are not reviewed as if
they were independently authored source. Their manifests, provenance,
generators, vulnerabilities, licenses, reproducibility, invariants, consumers,
and runtime integration are in scope. The generated pass catalog is evaluated
through its seven template functions, catalog invariants, consumers,
representative samples, and discrimination evidence rather than pretending
that thousands of mechanical permutations are independent designs.

The audit also covers the product and business system around the repository:
target writers, jobs-to-be-done, professional coverage workflows, trust and
adoption, competing products and services, distribution, pricing and operating
burden, data/licensing constraints, privacy, applicable claims and consumer
protection concerns, and defensibility.

Retired research and filed backlog are evidence about prior decisions, not
active demand. They may be accepted, rejected, or superseded only through the
explicit classification process below.

## Audit Method

### Phase 1: Complete project reconstruction

Establish branch and worktree state, integration history, runtime versions,
package scripts, active roadmap phase, and baseline test/build health. Inventory
the repository and construct a current-state model covering:

- product objective, intended user, user problem, value proposition, and
  business assumptions;
- inputs, transformations, deterministic and generative decision logic,
  outputs, state, storage, feedback loops, and human intervention points;
- architecture, module boundaries, API and WebSocket contracts, data flow,
  dependencies, trust boundaries, failure handling, validation, and operations;
- the complete default user journey and the Labs/research surface;
- written claims versus actual implemented behavior.

The reconstruction must come from code and runnable evidence, then be compared
with documentation. Descriptions are claims, not ground truth.

### Phase 2: Claim, assumption, and decision registry

Extract every consequential proposition relied upon by the product, engine,
evaluation, security model, operations, and strategy. Record:

| Field | Required content |
|---|---|
| Proposition | Exact claim, assumption, or decision |
| Type | Fact, constraint, preference, inference, assumption, or hypothesis |
| Evidence | Repository and external support |
| Confidence | High, medium, low, or unknown |
| Dependencies | What relies on it |
| Failure impact | What breaks if it is wrong |
| Verification | Concrete confirmation method |
| Disposition | Accept, preserve, modify, reject, supersede, or unresolved |

The registry must specifically test demand, user behavior, score accuracy,
ground truth, data availability and licensing, statistical stability, cost,
performance, scalability, operational feasibility, automation reliability,
human trust, distribution, and competitive differentiation.

### Phase 3: Deep external research

Research must produce findings during this run, not a list of future searches.
It includes:

- professional screenplay coverage, development, script-analysis, revision,
  contest, studio, agency, and independent-reader workflows;
- leading direct products and services, their claims, data advantages, trust
  mechanisms, pricing, integration, complaints, likely operating burdens, and
  deliberate limits on automation;
- peer-reviewed work on narrative quality evaluation, computational
  narratology, creativity support, writing feedback, inter-rater reliability,
  rubric validity, calibration, uncertainty, human-AI decision support, and
  evaluation leakage;
- relevant standards and regulator guidance for privacy, security,
  accessibility, AI disclosure, consumer claims, copyrighted uploads, and data
  retention;
- adjacent methods from reliability engineering, safety cases, measurement
  theory, decision science, intelligence analysis, HCI, causal inference,
  information retrieval, quality assurance, and adversarial evaluation.

Each adjacent-field transfer must name the exact STORYMACHINE mechanism it
would change, expected benefit, assumptions, cost, and validation method.

### Phase 4: Independent perspective passes

Conduct separate passes before synthesis to reduce anchoring:

1. Screenwriting/domain practitioner
2. Systems architect
3. Product strategist
4. First-time and repeat end user
5. Data scientist and measurement specialist
6. Red-team/failure analyst
7. Security and privacy reviewer
8. Production operator and support owner
9. Skeptical investor or executive
10. Direct competitor
11. Legal/regulatory reviewer
12. Innovation lead

Each pass records its own findings and uncertainties. Subagent output, when
used, is evidence reviewed by the synthesis lead rather than accepted as truth.

### Phase 5: Exhaustive technical and product gap audit

The gap registry covers, at minimum:

- product thesis, demand, user journey, trust, explainability, onboarding,
  retention, business model, and defensibility;
- engine logic, hard-coded assumptions, circularity, state, constraints,
  uncertainty, false precision, counterfactuals, abstention, and human review;
- data provenance, licensing, versioning, leakage, bias, lineage, freshness,
  missing-data behavior, and ground truth;
- architecture, ownership, coupling, idempotency, retries, rollback,
  degradation, audit trails, observability, access control, caches, and
  reproducibility;
- evaluation baselines, holdouts, uncertainty, slice and temporal tests,
  adversarial tests, production feedback, and distinctions among accuracy,
  usefulness, and business value;
- UX hierarchy, next actions, error and empty states, terminology, confidence
  communication, accessibility, responsive behavior, and cognitive load;
- cost, labor, support, deployment, backup and recovery, vendor dependence,
  licensing, escalation, and quality-control ownership;
- privacy, security, consent, retention, deletion, unsupported claims, and
  jurisdictional uncertainty.

#### Security and trust boundaries

Trace untrusted input from every HTTP, WebSocket, upload, environment, import,
and provider-configuration boundary to its sinks. Verify authentication,
authorization, limiter choice, zod coverage, SSRF and redirect controls,
prompt-injection boundaries, secret serialization, log hygiene, HTML/CSV
escaping, file and scene ceilings, collaboration ownership, metrics exposure,
proxy behavior, CSP, container privilege, and dependency reachability.

#### Data integrity and concurrency

Audit ScriptIDE drafts, sessions, backups, uploads, imports, exports, snapshots,
optimistic concurrency, content hashes, and verification receipts. Exercise
partial storage failure, quota/private-mode behavior, slow responses, unmounts,
StrictMode remounts, concurrent tabs, edits during saves, stale revisions,
clear/remove during reads, malformed legacy state, server restarts, and
empty-but-valid values.

The primary invariant is that an acknowledged user action must not silently
lose, resurrect, mislabel, or overwrite user content.

#### Server and API correctness

Enumerate every registered endpoint and compare it with limiter assignments,
validation schemas, error translation, response contracts, and tests. Verify
keyless behavior, abort and timeout handling, resource ceilings, cache bounds,
session isolation, persistence semantics, and honest provider degradation.

#### Frontend correctness

Trace state ownership and asynchronous effects through Doctor, Editor, and Labs.
Inspect stale closures, cleanup, out-of-order completions, unmounted updates,
unstable keys, controlled inputs, dead controls, focus and keyboard behavior,
accessible names, error recovery, code-split failures, and overflow.

#### Scoring validity

Audit provenance, split discipline, fixture licensing, leakage, skipped
real-corpus gates, uncertainty reporting, formula inputs, bounded structural
deductions, calibration assumptions, shuffle-drop and act-swap guards,
determinism, and keyless parity. No formula or threshold changes occur without
the real-writing evidence required by the roadmap.

#### Delivery and documentation truth

Compare local scripts with CI, Docker, deployment documentation, environment
requirements, backups, build outputs, and public claims. Active documentation
must not misstate rule counts, authentication, validation, keyless behavior, or
score evidence.

### Phase 6: Failure-mode and pre-mortem analysis

Assume the project launches and fails. For each major failure mode record:

- trigger;
- failure chain and second-order consequences;
- earliest detectable signal;
- preventive control;
- detection control;
- recovery mechanism;
- residual risk.

The register must include convincing-but-wrong verdicts, user misuse, silent
score degradation, weak agreement, benchmark leakage, provider failure,
copyright/privacy incidents, security compromise, unreproducible reports,
complexity overload, misunderstood high-quality results, no distribution,
unsustainable support or inference cost, competitor response, and owner/team
dependency. It must explicitly identify failures invisible to ordinary tests.

### Phase 7: Supersession and contradiction resolution

Classify every significant component or decision as accepted, preserved,
modified, rejected, superseded, or unresolved. Maintain a change log with the
evidence, dependencies, and documents affected. Do not silently overwrite prior
work.

When sources conflict, compare authority, methodology, sample, date, context,
commercial incentives, reproducibility, and applicability before selecting the
controlling conclusion.

### Phase 8: Competing redesigns and high-end synthesis

Develop at least three coherent futures before selecting one:

1. disciplined validation-first refinement of the current Doctor + Editor;
2. service-assisted or human-in-the-loop coverage workflow;
3. a materially different product/engine thesis if the evidence rejects the
   current one.

Compare accuracy, demand evidence, trust, complexity, cost, time to proof,
operability, legal exposure, defensibility, and reversibility. The selected
design must define:

- corrected product thesis and one governing system law;
- module boundaries, state ownership, inputs/outputs, data and decision flow,
  human-review boundaries, failure behavior, auditability, observability,
  security, and versioning;
- deterministic and probabilistic logic, constraints, uncertainty,
  recommendations, abstention, escalation, explanation, feedback, and
  recalibration;
- task-first UX with progressive depth, visible assumptions, stable next
  actions, and trustworthy uncertainty;
- required data, source hierarchy, legal acquisition, lineage, quality,
  freshness, missing-data behavior, and cost controls;
- evaluation ground truth, baselines, primary and safety metrics, calibration,
  user value, slices, temporal and adversarial tests, monitoring, and launch
  gates;
- a real defensibility thesis based on evidence, workflow embedding, trust,
  distribution, learning, or proprietary feedback—not ordinary features.

The result should be simpler where complexity does not produce evidence,
utility, trust, or defensibility.

### Phase 9: Prioritization and remediation

Classify every recommendation as P0, P1, P2, P3, Research, Manual-first, or
Reject. Record expected impact, evidence strength, effort, dependencies, risk,
reversibility, and validation method. Separate what must be fixed now, designed
now but built later, researched first, kept manual initially, or never built.

For each authorized confirmed defect, first add the smallest failing regression
test or executable witness. Implement the narrowest correction, run focused
verification, and inspect the diff. Critical security fixes are implemented
under the roadmap exception. Product, engine, or scoring changes that conflict
with the P0 freeze are documented and held for explicit authorization.

The two existing reliability findings remain audit inputs and must be
revalidated on the current branch:

- Clear All does not invalidate a pending drag-and-drop read because generation
  ownership is split between `StartScreen` and `StoryConfigForm`.
- The versioned draft and legacy theme mirror are separate writes, so the
  compatibility write can fail after the authoritative draft succeeds while
  callers report total failure.

### Phase 10: Execution blueprint

Produce a demand-first route from current state to the selected design. Every
stage names its objective, exact artifacts, affected components, dependencies,
acceptance criteria, tests, risks, exit gate, documents to update, and open
decisions. The route must preserve the ROADMAP's hard phase ordering unless the
audit supplies evidence and an explicit owner decision to replace it.

## Evidence and Severity Standard

Every finding must include:

1. Violated claim, requirement, or invariant.
2. Exact repository evidence and cited external evidence where applicable.
3. Reproduction, failing test, exploit path, measurement, or deterministic
   reasoning chain.
4. User, technical, operational, legal, or commercial consequence.
5. Root cause rather than symptom only.
6. Concrete correction and transfer effects on the rest of the system.
7. Priority, confidence, dependencies, and success measure.

Severity is impact-based:

- **Critical:** exploitable security boundary failure, likely irreversible data
  loss, secret exposure, remote code execution, authentication bypass, or a
  broken primary workflow with no safe recovery.
- **Important:** reliable correctness failure, content resurrection/overwrite,
  serious authorization or availability weakness, false product verdict, or a
  test gap masking a demonstrated defect.
- **Minor:** bounded robustness, accessibility, documentation, or maintainability
  defect that does not compromise the primary workflow.

Scanner warnings, preferences, generic best practices, and speculative cleanup
are not findings until tied to a reachable path and material consequence.

## Independent Work and Synthesis

Use bounded independent review roles for repository extraction, external
research, architecture/reliability, security/red-team work, product/competitive
analysis, data/evaluation, and final quality review. Give each role a distinct
question and evidence contract. Avoid concurrent code edits and overlapping file
ownership.

The primary agent maintains the coverage ledger, independently checks material
claims, resolves contradictions, owns remediation decisions, and writes the
canonical synthesis. Consensus among reviewers is not a substitute for
evidence.

## Verification

Verification proceeds from narrow to broad:

1. Focused tests or executable witnesses for each changed unit and integration
   boundary.
2. Route validation/limiter completeness and server console checks.
3. Keyless live smoke of affected server paths.
4. `npm run lint`.
5. Full `npm test` with zero failures; skips and environment gates are reported.
6. `npm run build`.
7. Targeted browser/runtime checks for affected user journeys.
8. Dependency audit with production reachability adjudication.
9. Cross-check of claims, citations, calculations, and recommendation
   dependencies.

No item is marked fixed solely because compilation passes or a synthetic unit
fixture fires. No strategic recommendation is marked validated solely because
it appears in multiple internal documents.

## Required Final Deliverable

The final audit uses this structure:

1. Executive Verdict
2. Current-State Reconstruction
3. What Is Already Strong
4. Critical Findings
5. Complete Gap Registry
6. Research Findings with citations
7. Competitive and Industry Benchmark
8. Assumption and Truth Registry
9. Failure-Mode Register
10. Supersession Matrix
11. Corrected High-End Architecture
12. Corrected Engine and Decision Logic
13. Product and User-Experience Upgrade
14. Data and Evaluation Blueprint
15. Prioritized Upgrade Register
16. Implementation Roadmap
17. Canonical Documents to create, merge, rewrite, archive, or delete
18. Top Unresolved Questions with required resolving evidence
19. Final Quality Audit

Supporting artifacts include the file-level coverage ledger, source register,
claim registry, findings registry, change log, verification evidence, and code
fixes permitted during the run.

## Exit Criteria

The audit is complete only when:

- every repository file has a recorded coverage disposition;
- every consequential product, engine, evidence, security, and strategic claim
  is represented in the truth registry;
- actual external research and competitive evidence have been synthesized;
- all twelve independent perspectives and the invisible-failure pre-mortem are
  complete;
- every confirmed finding is fixed, rejected, or explicitly deferred for a
  named roadmap, evidence, legal, external, or owner-decision blocker;
- the corrected system and competing alternatives are compared with explicit
  tradeoffs;
- all authorized fixes pass focused and full verification;
- the final quality review finds no unsupported citations, generic
  recommendations, silent contradictions, duplicated findings, or missing
  dependencies.

Audit completeness does not imply that P0 writer validation or P1 real-writing
discrimination has passed. Those gates must be satisfied by their required
external evidence, not by the thoroughness of this review.
