# Phase 3 — Failure-Mode Register and Launch Pre-Mortem

**Audit date:** 2026-07-14  
**Basis:** frozen Phase 1 scope; completed Phase 2 repository, product/UX,
security/privacy, quality/operations, twelve-perspective, bibliography,
source-verification, and competitive-industry artifacts  
**Posture:** assume STORYMACHINE launches and later fails; work backward from
causal chains rather than forward from intended features  
**Legal boundary:** risk analysis, not legal advice

## 1. Counterfactual launch failure

Twelve months after launch, STORYMACHINE is technically alive but commercially
and reputationally impaired. A writer posts a documented case in which a
polished `RECOMMEND` report missed a structural failure that three experienced
readers immediately identified. Another writer discovers that a short, strong
sample was penalized chiefly because it had too few scenes. A third loses the
destination session while attempting to restore the application's own export.
The company can prove that the first report was calculated reproducibly, but
cannot prove that its interpretation was valid; the receipt authenticates the
wrong claim.

At the same time, provider spend spikes through simulation fan-out, a remote
builder has received a Docker context containing ignored runtime data, and a
leaked session capability gives a support contractor read/write access to an
unpublished draft. The public privacy promise cannot be reconciled quickly with
provider retention, backups, logs, and caches. A mutable release tag makes it
uncertain which image produced which report. Accessibility complaints reveal
that keyboard users could not operate the critical overlays that passed every
source-level test.

The commercial postmortem is worse than any one defect. The product entered a
commodity “instant AI coverage” market without evidence of paid demand or a
distribution advantage, then added a costly human-review layer whose raters
disagreed and whose supply economics were not controlled. Writers learned to
optimize scripts for the score, accepted model-suggested revisions more often
when they were presented confidently, and fed those choices back as if they
were independent outcome labels. The evidence flywheel became a self-confirming
loop. High repository churn and false canonical history delayed diagnosis
because teams argued from documents that no longer matched the running system.

This scenario is not a prediction. It is the strongest coherent pre-mortem
supported by current evidence. The register below identifies where to break its
chains earliest.

## 2. Method, scales, and strategic futures

### Evidence labels

- **EX — executed:** reproduced against the application or its real HTTP path.
- **DC — direct code/repository:** established by implementation, tests,
  generated artifacts, or git history.
- **XR — external research:** supported by verified academic, standards,
  regulator, or professional primary evidence. Source IDs refer to
  `PHASE_2_BIBLIOGRAPHY.md` and `SOURCE_REGISTER.md`.
- **INF — inference:** causal interpretation supported by facts but not observed
  as a production incident.
- **HYP — hypothesis:** plausible market/user outcome requiring P0/P1 or live
  operating evidence.
- **LR — legal-risk flag:** requires fact-specific qualified review; it is not a
  conclusion that a law applies or has been violated.

### Severity and detectability

- **Critical:** can invalidate a non-compensable gate—score honesty,
  content/state integrity, confidentiality, legal/data permission—or produce
  unbounded spend/irreversible public trust loss.
- **High:** can materially harm writers, block recovery or operation, corrupt
  evidence, or defeat the product/business thesis.
- **Moderate:** bounded but user-visible reliability, accessibility,
  performance, or support failure that can compound into a High/Critical event.
- **Detectability 5:** usually silent in ordinary green tests and likely found
  only through external outcomes, adversarial evaluation, or an incident.
- **Detectability 4:** silent in ordinary CI but discoverable through a missing
  boundary/contract test or operational control.
- **Detectability 3:** appears in focused integration, browser, load, or restore
  testing, but not in current default gates.
- **Detectability 2:** user-visible quickly after the trigger.
- **Detectability 1:** fails loudly at or before deployment.

### Candidate strategic futures

- **J — automated coverage judge:** score, percentile, and
  `PASS/CONSIDER/RECOMMEND` are primary product authority.
- **H — service-assisted coverage:** software evidence plus named or matched
  human review/escalation.
- **R — reflective diagnostic (“draft MRI”):** writer declares intent, inspects
  located observables and contestable perspectives, chooses an action, and
  verifies consequences; no unsupported automated greenlight authority.

“All” means the failure crosses every future, although severity can differ. J
has the largest measurement and claim exposure; H adds labor, rater, and unit-
economic exposure; R reduces authority risk but does not remove integrity,
privacy, accessibility, or adoption obligations.

## 3. Ranked register

Ranking orders non-compensable and irreversible failures first, then severity
and difficulty of early detection. It is intentionally not a pseudo-precise
risk score.

| Rank | ID | Failure | Severity | Detectability | Invisible to ordinary green tests? | Futures |
|---:|---|---|---|---:|---|---|
| 1 | FM-01 | Incorrect-but-convincing automated judgment | Critical | 5 | Yes—determinism can strengthen the illusion | J; H if used as triage; R residual |
| 2 | FM-02 | Form, completeness, and writer-intent confound | Critical | 5 | Yes—formula and fixtures behave exactly as designed | J; H triage; R if context omitted |
| 3 | FM-04 | Confidential-draft lifecycle has no enforceable product contract | Critical | 5 | Yes—code controls cannot prove notice, provider, backup, or deletion truth | All |
| 4 | FM-05 | Benchmark leakage or false validation | Critical | 5 | Yes—metrics improve while generalization worsens | J; H label system; R claims |
| 5 | FM-06 | Feedback-loop corruption and score gaming | Critical | 5 | Yes—engagement and score deltas look favorable | All; highest J |
| 6 | FM-07 | Docker build-context disclosure and cross-platform contamination | Critical | 5 | Yes—final image can look clean after context already crossed boundary | All |
| 7 | FM-09 | Provider/model drift changes deep judgments without a product release | Critical for authoritative deep scores; High otherwise | 5 | Yes—quick deterministic tests remain green | All with deep AI |
| 8 | FM-12 | Human disagreement is collapsed into false ground truth | Critical for claims; High for service | 5 | Yes—an average label and model fit can look excellent | H; J benchmark; R escalation |
| 9 | FM-14 | Rights, training, authorship, or regulatory posture changes after launch | Critical gate / High operating | 5 | Yes—software behavior can remain unchanged | All |
| 10 | FM-03 | Destructive import or over-broad simulation reset | Critical | 4 | Yes—Stage tests pass while HTTP import/reset destroys unrelated authority | All |
| 11 | FM-08 | Unbounded provider fan-out and cost/latency amplification | Critical | 4 | Yes in keyless CI; request-rate checks miss internal multiplier | All; highest J/H with AI |
| 12 | FM-10 | Bearer session leakage, shared-default access, or identity creep | Critical public-launch / High private beta | 4 | Yes—authorized route tests use possession as intended | All |
| 13 | FM-11 | Incomplete authority and backup produce a “successful” lossy recovery | Critical | 4 | Yes—partial export can serialize/import successfully | All |
| 14 | FM-13 | Automation overreliance or aversion makes human+AI worse than the better alone | High | 5 | Yes—satisfaction and usage do not measure appropriate reliance | All |
| 15 | FM-17 | Semantic prompt manipulation returns valid but biased deep-read fields | High | 5 | Yes—schema, temperature, and injection tests can all pass | All with deep AI |
| 16 | FM-18 | Trial architecture silently becomes public/team architecture | High | 5 | Yes—growth, not code, triggers the boundary failure | All |
| 17 | FM-19 | Consented product telemetry becomes biased, rights-unclear training/evaluation data | High | 5 | Yes—dataset size grows while evidentiary quality falls | All |
| 18 | FM-21 | Demand/adoption inference mistakes curiosity for committed behavior | High | 5 | Yes—sign-ups, report runs, and praise can rise without retention/payment | All |
| 19 | FM-31 | Governance drift and owner/agent dependency corrupt decision memory | High | 5 | Yes—tests do not validate strategy provenance | All |
| 20 | FM-32 | Score and opportunity incentives become an undisclosed self-serving loop | High | 5 | Yes—revenue and engagement can improve during corruption | J/H with distribution |
| 21 | FM-15 | Release tag/digest does not identify the tested, deployed artifact | High | 4 | Yes—source gates pass before a different image is built | All |
| 22 | FM-16 | Multi-instance split-brain or unsupported topology causes state divergence | High | 4 | Yes—single-process tests cannot reveal it | All |
| 23 | FM-20 | Human-review supply, quality, or unit economics collapse | High | 4 | No for turnaround; yes for bias and true margin | H |
| 24 | FM-22 | Commodity positioning and absent distribution erase pricing power | High | 4 | Yes—feature delivery can be flawless | J; H; R unless differentiated |
| 25 | FM-24 | Accessibility exclusion blocks the critical writer journey | High | 4 | Yes—no browser/assistive-technology gate | All |
| 26 | FM-23 | Dual-product breadth dilutes validation and onboarding | High | 3 | Partly—analytics can misattribute rather than fail | All, current product surface |
| 27 | FM-25 | Local/editor async and metadata state creates a haunted or lossy workflow | High | 3 | Yes—happy-path storage tests pass | All |
| 28 | FM-26 | Provider outage/fallback is presented with the wrong lineage or confidence | High | 3 | Partly—fallback returns a valid report | All with deep AI |
| 29 | FM-27 | Runtime packaging, dependency, or native-module failure appears only in production | High | 3 | Yes—the published container is not currently smoke-tested | All |
| 30 | FM-28 | Liveness is green while persistence is unusable; crash is not restarted | High | 3 | Yes—`/health` proves process life only | All |
| 31 | FM-29 | Configuration/support mismatch or raw provider errors leak secrets and disable AI | High | 3 | Partly—secure remote posture triggers the UX failure | All with AI |
| 32 | FM-30 | Performance cost pushes writers away before value is experienced | Moderate, potentially High adoption | 3 | Yes—build warning is non-blocking; no user metric exists | All |

## 4. Detailed failure modes

### FM-01 — Incorrect-but-convincing automated judgment

- **Trigger:** a real screenplay contains unconventional structure, deliberate
  ambiguity, sparse surface signals, or domain context outside the synthetic
  calibration design; or a parser/heuristic confidently misreads an ordinary
  story fact.
- **Failure chain:** deterministic signals produce a crisp health score, grade,
  percentile, and verdict → located evidence and a versioned receipt make the
  result look audited → the writer changes or submits the draft on that advice
  → an opportunity is harmed or a strong voice is normalized → the company can
  prove faithful computation but not correct interpretation → trust loss
  spreads more quickly than an ordinary software bug because the product sold
  epistemic authority.
- **Earliest signal:** poor agreement with independent experienced readers on
  the exact decision; high-confidence false positives/negatives; contestable
  findings concentrated in unusual forms/genres; writers can cite obviously
  wrong scene interpretations; simple length/scene baselines match or beat the
  full score.
- **Preventive control:** withhold authoritative percentile/verdict language
  until a rights-clean, preregistered, held-out real-draft study passes; default
  to located observables, qualifiers, disagreement, and abstention; declare the
  supported use and failure envelope next to every interpretation.
- **Detection control:** blinded multi-reader evaluation with uncertainty,
  subgroup/format slices, threshold confusion matrices, adversarial discourse
  transformations, issue localization scoring, and published failure cases;
  monitor challenges and overturned findings rather than only completed reports.
- **Recovery:** stop or relabel the affected claim, preserve and identify
  affected receipt versions, notify impacted users where a high-stakes verdict
  changed, reissue an evidence-bounded report, and provide human escalation or
  refund/redress.
- **Residual risk:** creative judgment remains plural; even strong agreement
  cannot prove a universal notion of screenplay quality or career outcome.
- **Evidence:** **DC+EX+XR+INF**—synthetic 20-sample calibration, unavailable
  real-draft CI evidence, weak reported rule-channel AUC, sub-gate composite
  discrimination, and writer-facing authority; A10–A18 and G01–G02 show why
  repeatability and fluent explanation are not validity.
- **Affected future:** **J existential**; **H High** if the score ranks or frames
  human work; **R Moderate residual** if perspectives remain contestable.
- **Ordinary-green-test status:** **invisible**. The same input producing the
  same wrong answer is a test success.

### FM-02 — Form, completeness, and writer-intent confound

- **Trigger:** the writer submits a short, pilot, teaser, cold open, excerpt,
  scene sample, early draft, or a document whose current revision question is
  not global “submission readiness.”
- **Failure chain:** the Doctor receives text/title but no form, target duration,
  completeness, draft stage, audience, or revision intent → `140/sceneCount`
  scarcity and context-free checks dominate → local craft is converted into a
  low global verdict → the writer pads the draft or fixes the wrong problem →
  benchmark performance is inflated if weaker samples are also shorter or less
  complete.
- **Earliest signal:** verdict residuals correlate with scene/page count after
  reader ratings are controlled; matched excerpts change grade when concatenated;
  short forms cannot reach the top band with zero issues; writers say the note
  is accurate but irrelevant to their current decision.
- **Preventive control:** require declared task, form, completeness, draft stage,
  target, and optional genre/theme context; separate local diagnostic evidence
  from whole-draft readiness; abstain from global judgment when the declared use
  is unsupported.
- **Detection control:** length/form-matched evaluation, grouped splits by
  underlying script, within-script excerpt/full comparisons, counterfactual
  padding tests, and utility interviews tied to the writer's stated decision.
- **Recovery:** invalidate affected global comparisons, reissue local evidence
  without a readiness claim, and reanalyze only under a validated form-specific
  instrument.
- **Residual risk:** self-reported intent can be incomplete and formats blur;
  context should qualify output rather than create false precision.
- **Evidence:** **DC+EX+XR+INF**—direct route/formula trace and `RECOMMEND`
  threshold; A02/A04 on stage-specific needs, A17–A18 on construct validity.
- **Affected future:** **J Critical**, **H High** if used for routing, **R High**
  if the reflective question is omitted.
- **Ordinary-green-test status:** **invisible**; fixtures confirm the confounded
  formula rather than challenge the construct.

### FM-03 — Destructive import or over-broad simulation reset

- **Trigger:** a writer posts any body to the current JSON import route, or
  ScriptIDE invokes `/api/reset` while starting a simulation.
- **Failure chain:** import shallow validation or a normal simulation-reset
  intent reaches `destroySession` → the whole per-session database is closed and
  deleted → `ScriptIDE_State` and unrelated project/editor authority disappear
  together with simulation state → concurrent save/room/config/turn writes race
  a turn-only queue that is not a session mutation coordinator → HTTP/UI success
  or a backup file makes the over-broad operation look controlled.
- **Earliest signal:** any POST import mutates state; a populated ScriptIDE row
  disappears after “Simulate this script”; delayed/concurrent writes cross reset;
  destination DB/hash changes after a rejected operation.
- **Preventive control:** retire POST JSON import with unconditional non-mutating
  410; disable `/api/reset` until it becomes a transactional simulation-only
  clear over a generated declared aggregate. Put separately named/confirmed
  project deletion behind its own authorization. Serialize reset/import/save/
  room/config/turn writes through one real per-session mutation coordinator.
- **Detection control:** 410 preservation fixtures; populated project plus
  simulation-reset tests; delayed/concurrent mutation tests; exact semantic and
  byte comparisons for all unrelated authorities; separately authorized project
  deletion tests.
- **Recovery:** halt import/reset exposure, preserve all surviving DB/WAL/backup
  copies, use the verified online backup where available, reconcile the most
  complete authority, and disclose unrecoverable fields honestly.
- **Residual risk:** storage/host failure remains; future project import is a
  separately gated capability with its own envelope/version/transport contract.
- **Evidence:** **EX+DC+XR**—live HTTP witnesses prove current-export rejection
  and malformed-import destruction; code trace proves ScriptIDE-triggered reset
  deletes the DB that owns `ScriptIDE_State`.
- **Affected future:** **All; Critical**.
- **Ordinary-green-test status:** **invisible** because Stage-level and v6
  hand-authored fixture tests do not traverse the current HTTP contract.

### FM-04 — Confidential-draft lifecycle has no enforceable product contract

- **Trigger:** public/private-beta upload of an unpublished screenplay,
  provider-backed deep read, support request, backup, retention cleanup, account
  deletion request, incident, or a marketing promise about privacy.
- **Failure chain:** draft is persisted locally/server-side and optionally sent
  scene-by-scene to a provider → the writer is not told the complete processor,
  retention, training, region, human-review, backup, log, deletion, or incident
  behavior → actual deployment and a generic promise diverge → informed consent
  is impossible and deletion cannot be proven end to end → trust/compliance
  exposure emerges only after an inquiry or incident.
- **Earliest signal:** no current data-flow map or product terms; deletion tests
  cannot enumerate DB, WAL, backup, cache, logs, provider copies, and derived
  datasets; UI cannot state which provider will receive which scenes and for how
  long.
- **Preventive control:** deployment-specific data inventory and minimization;
  accurate privacy/terms; explicit per-mode consent; named subprocessors and
  retention/training/human-review posture; user export/delete; encrypted and
  access-controlled persistence/backups; provider contracts matched to claims.
- **Detection control:** privacy-control matrix and periodic deletion drills;
  subprocessor/config drift review; canary records across data stores; access
  logs; incident exercises; counsel review before each new market or data use.
- **Recovery:** stop the affected processing, preserve an incident record,
  notify as legally/contractually required, fulfill deletion across controlled
  stores, seek provider confirmation, correct claims, and offer a local/keyless
  route where feasible.
- **Residual risk:** external provider and backup deletion are partly
  contractual; jurisdiction and model-provider terms change.
- **Evidence:** **DC+XR+LR+INF**—implemented persistence/provider path and absent
  product contract; G08, G11–G12 and competitor privacy observables.
- **Affected future:** **All; Critical**, with larger surface in AI-enabled J/H.
- **Ordinary-green-test status:** **invisible**; security unit tests do not prove
  lifecycle truth or informed disclosure.

### FM-05 — Benchmark leakage or false validation

- **Trigger:** thresholds/prompts/rules are repeatedly tuned on the private
  corpus; related drafts or revisions cross splits; human labels collapse
  distinct constructs; or a convenient sample encodes length/form differences.
- **Failure chain:** evaluation information leaks into development → reported AUC
  or agreement rises → public claims are upgraded → held-out/professional use
  collapses → the team mistakes benchmark overfit for product progress and
  continues optimizing the wrong instrument.
- **Earliest signal:** large development/holdout delta; performance disappears
  under grouped script-family splits; simple scene/page count wins; results are
  unstable to reader pool, prompt, seed, format, or one influential script;
  unexplained threshold changes follow private-corpus runs.
- **Preventive control:** preregister constructs, splits, metrics, exclusions,
  and stopping rules; group derivatives by underlying script; rights-clean
  locked holdout controlled by an independent custodian; retain a simple
  baseline; version every dataset, label, prompt, formula, and receipt.
- **Detection control:** third-party replication, repeated nested evaluation,
  audit trail of every holdout access, leakage scan, bootstrap uncertainty,
  subgroup/format tests, and a challenge set never used for iteration.
- **Recovery:** retract the benchmark/claim, quarantine contaminated versions,
  create a new independent holdout, rerun from the preregistered build, and
  report the failure rather than silently replacing the number.
- **Residual risk:** small rights-clean screenplay samples will retain wide
  uncertainty; benchmark success still does not establish demand or revision
  benefit.
- **Evidence:** **DC+XR+INF**—current synthetic/private-corpus limitations;
  A10–A23, G01–G02.
- **Affected future:** **J Critical**; **H Critical** when labels train/validate
  triage; **R High** for any efficacy claim.
- **Ordinary-green-test status:** **invisible**; a leaked benchmark is often
  greener than an honest one.

### FM-06 — Feedback-loop corruption and score gaming

- **Trigger:** writers optimize to the visible score/rules; generated revisions
  are evaluated by the same engine that proposed them; acceptance/click/score
  improvement is used as a training or prioritization label.
- **Failure chain:** engine recommends a change → writer accepts it because of
  presentation/effort asymmetry → the same engine awards a higher score → that
  delta is recorded as success → future logic favors similar changes → scripts
  converge toward detector-friendly length/surface signals while voice and
  human judgment stagnate or worsen. If score unlocks opportunities, the loop
  adds direct economic pressure to conform.
- **Earliest signal:** score rises without blind-reader improvement; accepted
  recommendations outperform rejected ones only on engine-native metrics;
  scene count/padding rises; vocabulary/structure diversity narrows; challenge
  rates fall as interface confidence rises.
- **Preventive control:** never use engine score as the outcome for engine-
  suggested revisions; collect writer intent and decision separately; use
  blinded paired human outcomes; preserve rejected/disputed notes; reserve a
  holdout outside the product loop; separate score governance from opportunity.
- **Detection control:** longitudinal divergence between engine delta and blind
  reader delta; causal/randomized note-exposure studies where ethical; monitor
  output homogenization, form shifts, dispute suppression, and subgroup effects.
- **Recovery:** stop learning from contaminated labels, roll back affected
  ranking/thresholds, quarantine loop-derived data, re-evaluate with independent
  outcomes, and remove opportunity consequences until governance is restored.
- **Residual risk:** every feedback product changes writer behavior; the goal is
  traceable, writer-controlled influence, not a fiction of neutrality.
- **Evidence:** **DC+XR+INF**—same-engine before/after architecture and proposed
  telemetry flywheel; A13, A17–A18, A24–A28. Production magnitude is **HYP**.
- **Affected future:** **J Critical**, **H High**, **R High** unless decisions
  and independent outcomes remain separated.
- **Ordinary-green-test status:** **invisible**; engagement and internal score
  movement can appear as success.

### FM-07 — Docker build-context disclosure and contamination

- **Trigger:** local, CI, or remote Docker build from a normal working tree with
  ignored `.env*`, `data/`, logs, attachments, `.git`, or host `node_modules`.
- **Failure chain:** Docker ignores `.gitignore` → `COPY . .` sends the whole
  context → confidential drafts/secrets cross to daemon, builder, or cache even
  though the final runner selectively copies fewer paths → remote cache access
  or retention creates disclosure; host Windows dependencies may overwrite
  Linux-native dependencies and create nondeterministic production failure.
- **Earliest signal:** `.dockerignore` absent; context inventory contains denied
  patterns; context size changes with local runtime data; Linux build behavior
  differs depending on host `node_modules`.
- **Preventive control:** deny-by-default `.dockerignore` with a minimal allow
  surface; exclude data, secrets, VCS, dependencies, logs, test/audit outputs,
  and local tools; use secret mounts for build secrets and clean isolated build
  contexts.
- **Detection control:** CI assertion over effective context, sentinel-secret
  build test, layer/cache inspection, context-size budget, and clean Windows/
  Linux reproducibility builds.
- **Recovery:** revoke any exposed credential, purge controlled remote caches,
  notify affected draft owners as required, rebuild from clean context, and
  preserve incident evidence without copying draft contents into tickets.
- **Residual risk:** builder/cache provider controls remain external; allowlists
  must be updated when required runtime assets change.
- **Evidence:** **DC+INF**—no `.dockerignore`, `COPY . .`, ignored runtime data
  present; no secret/draft contents were opened.
- **Affected future:** **All; Critical**.
- **Ordinary-green-test status:** **invisible**; the final image may omit the
  files after the confidentiality boundary has already been crossed.

### FM-08 — Unbounded provider fan-out and cost/latency amplification

- **Trigger:** AI-enabled `/api/turn`, `/api/simulate-to-fountain`, or provider
  test calls at allowed HTTP request rates; simulation with many agents/turns;
  concurrent users or retries.
- **Failure chain:** generative routes use `gameLimiter` → one accepted request
  fans out into many model calls → timeouts/retries retain resources → latency
  queues grow and spend spikes → service degradation invites more retries → a
  single-IP request budget gives false assurance about token/call/cost budget.
- **Earliest signal:** provider calls/tokens per HTTP request exceed one; p95
  workflow cost/latency grows with agent count; cancellation leaves calls in
  flight; spend changes without matching request growth.
- **Preventive control:** mechanically classified AI routes with `aiLimiter`;
  engine-level per-request/session call, token, wall-time, and dollar ceilings;
  concurrency/backpressure; cancellation; circuit breakers; idempotency and
  bounded retry policy.
- **Detection control:** metrics and alerts for calls/tokens/cost per workflow,
  queue depth, retry amplification, cancellation lag, and budget rejection;
  adversarial fan-out/load tests with fake providers.
- **Recovery:** trip provider/workflow circuit breakers, force keyless degraded
  mode, cancel queued work, cap sessions, reconcile billing, and rate-adjust
  only after the internal multiplier is bounded.
- **Residual risk:** provider pricing and tokenization can change; per-dollar
  controls require current pricing and conservative fail-closed defaults.
- **Evidence:** **DC+INF**—confirmed call paths and up-to-ten-turn/agent fan-out;
  G04–G05 on resource consumption.
- **Affected future:** **All AI-enabled; Critical**, especially simulation and
  service workflows.
- **Ordinary-green-test status:** **invisible** in the keyless suite and largely
  invisible to route-count limiter tests.

### FM-09 — Provider/model drift changes deep judgments without a product release

- **Trigger:** provider silently updates a model alias, safety policy, parser
  behavior, regional routing, latency, or pricing; prompt/model configuration
  changes; cached and fresh scenes mix; stochastic service behavior persists at
  nominal temperature zero.
- **Failure chain:** six deep-read scene fields shift → deterministic downstream
  rules faithfully aggregate different inputs → identical script/build/content
  hash receives a materially different deep verdict → verification recomputes
  quick lineage, not the historical deep measurement → users cannot reproduce
  or compare drafts and support cannot attribute the change.
- **Earliest signal:** rerun variance, field-distribution drift, fallback-scene
  rate, quick/deep disagreement, provider/model identity mismatch, or verdict
  flips without repository commit.
- **Preventive control:** pin available immutable model versions; persist
  provider/model/prompt/schema parameters and per-scene fallback lineage;
  separate quick/deep claims; require shadow evaluation and approval before
  provider/model promotion; cap authority of deep interpretation.
- **Detection control:** fixed canary corpus with repeated runs, scene-field and
  verdict drift thresholds, provider-change alerts, cache/fresh comparison, and
  cross-provider robustness tests.
- **Recovery:** freeze deep mode or revert model alias/config, label affected
  reports non-comparable, invalidate/reissue only with user consent, and retain
  prior provider/version evidence where contracts permit.
- **Residual risk:** providers may not offer true immutability or full change
  notices; on-device/self-hosted models trade drift for operational burden.
- **Evidence:** **DC+XR+INF**—deep lineage and model-derived judgment-bearing
  fields; A11/A15, G02/G05. Production drift incidence is **HYP**.
- **Affected future:** **J Critical** if deep scores are authoritative; **H/R
  High** as a named perspective.
- **Ordinary-green-test status:** **invisible**; quick/keyless tests remain green
  and deterministic downstream code has not changed.

### FM-10 — Bearer session leakage, shared-default access, or identity creep

- **Trigger:** session ID in SSE query string, copied URL, browser history,
  proxy/support log, referrer regression, shared browser profile, missing ID
  fallback, or reuse of private-beta architecture for accounts/teams.
- **Failure chain:** possession equals authorization → leakage equals full
  read/write takeover → no owner, role, rotation, revocation, or human audit
  identity exists → malicious or accidental edits look like the writer's →
  incident scope and notification are hard to determine.
- **Earliest signal:** one capability appears in multiple principals/locations;
  missing-ID traffic reaches `default`; same-origin tabs unexpectedly share a
  session; session IDs appear in URL-bearing telemetry or support material.
- **Preventive control:** keep P0 deployment private and explicitly bounded;
  fail closed on missing identity; avoid URL capabilities; add deletion and
  rotation; before public/team use, implement authenticated ownership,
  authorization, revocation, secure cookies/tokens, audit identity, and CSRF/
  session lifecycle controls.
- **Detection control:** capability-use anomaly alerts, log scanning/redaction,
  access/audit events, concurrency-owner checks, and adversarial proxy/referrer
  tests.
- **Recovery:** revoke/rotate the capability, freeze the session, restore from a
  known revision, notify the owner, investigate all accesses, and invalidate
  shared links/caches.
- **Residual risk:** account systems add their own takeover/recovery risks;
  collaborative sharing still requires explicit, revocable delegation.
- **Evidence:** **DC+INF**—documented bearer model, query-string SSE, localStorage
  sharing, and shared-default fallback.
- **Affected future:** **All; Critical public launch / High private trial**.
- **Ordinary-green-test status:** **invisible** because the test contract treats
  a possessed session ID as valid authority.

### FM-11 — Incomplete authority and “successful” lossy recovery

- **Trigger:** a schema-compatible partial import is re-enabled; simulation
  reset uses whole-session deletion; a backup runs while WAL contains recent
  pages; a future-version DB is opened by older code; a maximum export exceeds
  the importer transport; browser reload/device migration uses the wrong artifact.
- **Failure chain:** multiple authorities plus no generated field/relationship
  manifest → JSON projection drops FK parents, nullable/inactive/history fields,
  identifiers/timestamps, `ScriptIDE_State`, commits, title and collaboration →
  database and portable-envelope versions are conflated → old code may execute
  DDL before refusing a future DB → raw copy or whole-session reset appears
  recoverable → success is returned while state is missing or changed.
- **Earliest signal:** manifest/table/field/FK/hash/title/history comparison
  differs; maximum produced artifact exceeds transport; future `user_version`
  changes DB/WAL bytes; simulation reset changes any project/editor authority.
- **Preventive control:** relabel current export a non-recoverable simulation
  observation and pair it with retired import. Define separate generated
  `dbSchemaVersion` and `projectEnvelopeVersion`, generated table/field/FK/
  history/size manifest, future-version refusal before DDL/write, transactional
  simulation-only reset, per-session mutation coordinator, and verified online
  backup. A future project envelope is a separate gated design.
- **Detection control:** all-field/FK/nullable/inactive/history/Unicode/max-size
  fixtures, future-version byte identity, concurrent mutation tests, WAL-active
  restore, and clean-release semantic equality across every declared authority.
- **Recovery:** choose the most complete surviving authority, preserve all
  copies before reconciliation, replay revisions where possible, and disclose
  fields that cannot be restored.
- **Residual risk:** browser-local and in-memory collaboration state cannot be
  reconstructed unless deliberately checkpointed; restore policy must choose
  consistency over silently merging conflicts.
- **Evidence:** **DC+EX+INF**—schema/export comparison, title persistence trace,
  raw reset copy, and multiple-authority reconstruction.
- **Affected future:** **All; Critical**.
- **Ordinary-green-test status:** **invisible**; a partial artifact can be valid
  JSON and produce a successful status.

### FM-12 — Human disagreement is collapsed into false ground truth

- **Trigger:** one reader labels a script; averages merge craft quality,
  commercial taste, severity, and revision priority; reader expertise/genre fit
  is ignored; disagreement is treated as noise.
- **Failure chain:** plural professional judgments become one target → model or
  triage learns dominant-rater convention and bias → minority forms/voices are
  marked wrong → service disputes rise → published “agreement” uses an
  unsuitable coefficient or hides individual-reader uncertainty.
- **Earliest signal:** low absolute-agreement ICC/kappa, high between-reader or
  genre interaction, expert/novice divergence, frequent appeals, and model
  performance that changes materially with aggregation rule.
- **Preventive control:** define constructs separately; at least three
  independent experienced, domain-matched readers for benchmark cases; preserve
  distributions and rationales; predeclare ICC model/type; calibrate readers;
  show disagreement rather than forcing consensus.
- **Detection control:** blinded duplicate/control scripts, reader drift and
  subgroup reports, adjudication audits, reliability confidence intervals, and
  decision-level—not merely average-score—agreement.
- **Recovery:** re-read with an independent panel, replace/qualify labels,
  compensate affected service users, retrain/re-evaluate from plural labels, and
  disclose changed uncertainty.
- **Residual risk:** expert consensus can encode shared industry convention or
  bias; agreement is not complete validity.
- **Evidence:** **XR+INF**—A13–A15 and A19–A23; market evidence that high-stakes
  decisions remain human does not prove humans are interchangeable.
- **Affected future:** **H Critical**, **J Critical benchmark dependency**, **R
  High** for escalation/lens design.
- **Ordinary-green-test status:** **invisible**; clean averages and high test
  accuracy can hide rater plurality.

### FM-13 — Automation overreliance or aversion

- **Trigger:** a polished score/explanation is shown before independent thought,
  verification is effortful, or a visible model error causes total rejection.
- **Failure chain:** confidence/receipt encourages acceptance of wrong advice,
  or one error triggers blanket avoidance → human+AI performs worse than the
  better contributor alone → satisfaction can move opposite to safe behavior
  because cognitive-forcing controls add friction → the team optimizes liking
  instead of appropriate reliance.
- **Earliest signal:** users adopt wrong suggestions more often after confident
  explanations; challenge/inspection rates are low; removal of the AI answer
  improves independent decisions; churn spikes after one salient error despite
  useful remaining evidence.
- **Preventive control:** elicit writer intent/assessment before recommendations;
  show evidence and contestability before scalar authority; make challenge and
  rollback cheap; use forcing only where impact warrants friction; state failure
  limits and human escalation.
- **Detection control:** controlled P0/P1 tasks measuring decisions, reversals,
  error acceptance, and time—not stated trust alone; compare human, AI, and
  combined performance against the better-alone baseline.
- **Recovery:** remove or reorder misleading authority cues, explain the known
  failure, restore the prior draft, and let users continue with deterministic
  evidence or a human reader.
- **Residual risk:** no interface produces uniformly calibrated reliance across
  expertise, cognition, or task difficulty.
- **Evidence:** **XR+INF+HYP**—A24–A30; transfer to screenplay revision requires
  direct writer study.
- **Affected future:** **All; High**, greatest in J and AI-framed H.
- **Ordinary-green-test status:** **invisible**; it is a human-decision failure,
  not a response-shape failure.

### FM-14 — Rights, training, authorship, or regulatory posture changes

- **Trigger:** launch into a new jurisdiction; provider terms/model data use
  change; writer drafts/telemetry are reused for evaluation or training; AI
  rewrite output enters a professional submission; relevant law, union contract,
  or regulator interpretation changes.
- **Failure chain:** data/component inventory is incomplete → applicability and
  duties are assessed late → product promises, provider contracts, consent, and
  deletion cannot be reconciled → training/output/quality claims or writer-work
  handling are challenged → emergency feature withdrawal and data remediation.
- **Earliest signal:** no named owner or dated applicability memo; provider
  contract changes without product review; new use not represented in consent;
  EU/US/WGA/copyright refresh trigger passes without review; generated rewrite
  lacks a user-facing rights/authorship contract.
- **Preventive control:** AI/data inventory by purpose and actor; counsel review
  before public launch/new market/new use; change-management for provider terms;
  explicit rights, secondary-use, human-review, and rewrite disclosures;
  consent withdrawal and data lineage.
- **Detection control:** quarterly and event-driven legal/contract watch,
  provider-term diffs, data-use audits, claim substantiation file, and sampled
  output-similarity/rights incident process.
- **Recovery:** pause affected feature/data use, preserve records, isolate and
  delete data where required/possible, correct terms/notice, contact affected
  users, and obtain case-specific counsel before resumption.
- **Residual risk:** law and collective-bargaining context are jurisdictional
  and unsettled; no static checklist guarantees compliance.
- **Evidence:** **DC+XR+LR+INF**—G07–G12; EU Act general application date
  2026-08-02 is imminent at audit time, exact classification unresolved; USCO
  Part 3 was pre-publication in the frozen corpus.
- **Affected future:** **All; Critical gate / High operation**, broader for H
  human access and AI rewrite/training uses.
- **Ordinary-green-test status:** **invisible**; external rules can change while
  every build remains identical.

### FM-15 — Release identity does not identify the tested artifact

- **Trigger:** manual release from an arbitrary commit, reuse of a version tag,
  mutable action/base-image update, or separate post-test container rebuild.
- **Failure chain:** source tests pass → release builds a new, unbooted Alpine
  image → mutable semver/`latest` points to a different digest than a prior
  release → production defect occurs → rollback tag may reproduce the bad/new
  artifact and receipts cannot prove the runtime that generated a report.
- **Earliest signal:** semver tag can be overwritten; package version/tag/commit
  mismatch; no digest/SBOM/provenance; no container boot/persistence smoke; the
  artifact tested is not the artifact promoted.
- **Preventive control:** immutable exact `vX.Y.Z`, package-version match, pinned
  actions/base digests, one built artifact promoted by digest, commit/build
  identity, SBOM/signature/provenance, and release authorization.
- **Detection control:** registry immutability assertion, digest comparison
  across test/promotion/deploy, container boot/health/persistence/import smoke,
  and periodic rollback drill.
- **Recovery:** stop promotion, identify the last known-good digest, deploy by
  digest rather than tag, publish a corrected immutable version, and mark
  affected receipts/build IDs.
- **Residual risk:** registry compromise or dependency nondeterminism requires
  independent signing/verification and reproducible-build evidence.
- **Evidence:** **DC+INF**—release workflow and Docker path; no observed registry
  incident.
- **Affected future:** **All; High**.
- **Ordinary-green-test status:** **invisible** because current gates qualify
  source and Vite output, then build a different runtime artifact.

### FM-16 — Multi-instance split-brain or unsupported topology

- **Trigger:** autoscaling, rolling deployment, load balancing without sticky
  sessions, multiple containers mounting incompatible/local SQLite storage, or
  failover to a second process.
- **Failure chain:** session cache, turn queues, collaboration rooms, and deep
  cache are process-local while SQLite is local-filesystem state → requests for
  one capability land on different processes → divergent state, duplicate
  model work, lost collaboration updates, or database contention → “high
  availability” increases corruption/unavailability.
- **Earliest signal:** same session reports different revisions by instance;
  duplicate turn/action IDs; collaboration members disappear on rebalance;
  cache/fallback behavior depends on route destination.
- **Preventive control:** explicitly support and enforce single-node topology
  until redesigned; or introduce shared authority, distributed coordination,
  idempotency, ownership/leases, compatible database, and tested routing rules.
- **Detection control:** instance ID in traces, cross-instance consistency
  probes, load-balanced chaos tests, duplicate-work metrics, and deployment
  policy that rejects replicas above the supported count.
- **Recovery:** drain to one authoritative instance, freeze writes, reconcile
  from durable revisions/ledgers, invalidate duplicate jobs, and restore
  collaboration from the last acknowledged state.
- **Residual risk:** distributed migration changes consistency, cost, and
  privacy boundaries; it is not a configuration-only fix.
- **Evidence:** **DC+INF**—process-local components and filesystem SQLite; no
  documented multi-instance contract.
- **Affected future:** **All; High**.
- **Ordinary-green-test status:** **invisible** in single-process CI.

### FM-17 — Semantic prompt manipulation returns valid but biased fields

- **Trigger:** screenplay text contains instruction-like dialogue, adversarial
  content, repeated rating anchors, or ordinary prose that semantically steers
  the provider while respecting the expected JSON schema.
- **Failure chain:** hostile text is correctly delimited and output is valid,
  bounded JSON → the six permitted ratings are nonetheless manipulated →
  deterministic rules give the compromised values institutional legitimacy →
  deep report passes structural safety checks while craft judgment is biased.
- **Earliest signal:** rating/verdict changes under meaning-preserving insertion
  of instruction-like text; suspicious correlation with numeric/authority
  language; cross-provider disagreement localized to adversarial scenes.
- **Preventive control:** keep deep fields advisory and provenance-visible;
  minimize provider authority; use adversarially trained/evaluated prompts,
  semantic anomaly checks, and abstention; never let deep sensing silently
  mutate content.
- **Detection control:** adversarial screenplay challenge set, metamorphic
  insert/remove tests, cross-provider/rerun comparison, and scene-level outlier
  monitoring beyond schema validity.
- **Recovery:** fall back to quick evidence, label the deep lineage invalid,
  block the affected prompt/model version, and reissue only after adversarial
  evaluation.
- **Residual risk:** natural language cannot be perfectly separated into “data”
  and “instructions” for a general model; prompt hardening reduces but does not
  eliminate semantic influence.
- **Evidence:** **DC+XR+INF**—strong existing structural defenses plus residual
  judgment path; A15 and G05.
- **Affected future:** **All with deep AI; High**, Critical only if promoted to
  authoritative verdict.
- **Ordinary-green-test status:** **invisible** to schema and conventional
  injection tests when output remains valid.

### FM-18 — Trial architecture silently becomes public/team architecture

- **Trigger:** positive early attention leads to an internet-facing deployment,
  payment, shared projects, support access, or team use without a deliberate
  identity/privacy/operations gate.
- **Failure chain:** zero-friction bearer sessions and seven-day cleanup are
  acceptable as bounded trial assumptions → traffic and data value grow → those
  assumptions become undeclared production guarantees → first takeover,
  deletion dispute, or team conflict reveals missing ownership, roles, SLA,
  auditability, and incident processes.
- **Earliest signal:** production domain or payment before P0/P1/noncompensable
  gates; support manually handles session IDs; users ask for sharing/restore;
  multiple people access one capability; retention is changed ad hoc.
- **Preventive control:** explicit deployment maturity levels with hard gates;
  private allowlisted P0; no public/team/payment launch until identity,
  lifecycle, recovery, accessibility, and claims controls pass.
- **Detection control:** release checklist tied to exposure/config, external
  attack-surface inventory, customer-contract review, and alerts on unexpected
  concurrency/geography.
- **Recovery:** return to private access, freeze new uploads, migrate sessions to
  owned accounts only with consent, add deletion/rotation, and avoid retroactive
  promises that implementation cannot meet.
- **Residual risk:** commercial pressure can override technical gates unless a
  named owner has stop-ship authority.
- **Evidence:** **DC+INF+HYP**—documented trial auth ceiling and current missing
  public contract.
- **Affected future:** **All; High/Critical as exposure rises**.
- **Ordinary-green-test status:** **invisible**; the trigger is a change in use
  and exposure, not a code regression.

### FM-19 — Telemetry becomes biased, rights-unclear evidence

- **Trigger:** findings viewed/accepted/rejected, drafts, diffs, prompts, human
  notes, or outcomes are retained for “improvement” without purpose-specific
  consent and sampling design.
- **Failure chain:** easy-to-collect engaged-user behavior is treated as truth →
  privacy/rights and withdrawal lineage are incomplete → dissatisfied,
  inaccessible, or privacy-sensitive writers are underrepresented → model/
  product optimizes for compliant survivors → biased evidence is promoted as a
  defensible corpus.
- **Earliest signal:** dataset cannot answer consent purpose/version, script
  ownership, provider exposure, withdrawal, writer/form/genre sampling, or why
  a recommendation was accepted; acceptance is the only positive label.
- **Preventive control:** purpose-limited opt-in consent, data minimization,
  compensation and rights register, withdrawal/deletion lineage, sampling plan,
  independent outcomes, and separation of service records from research/
  training datasets.
- **Detection control:** dataset material passport, consent/rights audits,
  participation and attrition bias analysis, representativeness slices,
  provenance completeness threshold, and withheld non-user comparison samples.
- **Recovery:** stop downstream use, quarantine unverifiable records, honor
  withdrawal, retrain/re-evaluate if feasible, and disclose which conclusions
  depended on contaminated data.
- **Residual risk:** consented users are still self-selecting; longitudinal
  outcome attribution remains confounded.
- **Evidence:** **XR+INF+HYP+LR**—A13–A23, G08/G10–G12, and the proposed evidence
  flywheel. No current production corpus is alleged.
- **Affected future:** **All; High**, existential to claimed data defensibility.
- **Ordinary-green-test status:** **invisible**; dataset volume and engagement
  can grow while validity and permission worsen.

### FM-20 — Human-review supply, quality, or unit economics collapse

- **Trigger:** service-assisted launch before reader demand/supply, compensation,
  specialty matching, turnaround, QA, appeals, and acquisition economics are
  measured.
- **Failure chain:** human escalation is promised as trust layer → variable
  availability and genre fit produce slow/inconsistent notes → re-reads,
  support, refunds, and reviewer management erase margin → low compensation
  worsens quality/retention → automation is expanded to hide labor constraints,
  recreating the authority problem.
- **Earliest signal:** low reader acceptance/retention, missed SLA, high variance
  and appeal/re-read rate, concentration in one reviewer, fully loaded cost above
  price, or writers unwilling to pay the human premium.
- **Preventive control:** small paid concierge pilot; explicit note contract;
  specialty/availability matching; fair compensation; reader calibration and
  audit; limited escalation scope; separate human and compute pricing; capacity
  caps.
- **Detection control:** contribution margin by case, active reader capacity,
  turnaround distribution, rework/refund/appeal rate, agreement and writer
  usefulness by reader/genre, and reviewer wellbeing/attrition.
- **Recovery:** pause intake, honor/refund outstanding commitments, reroute only
  with consent, narrow supported genres/SLAs, and do not replace unavailable
  humans with unlabeled automation.
- **Residual risk:** high-quality creative judgment remains labor-intensive and
  demand may be too episodic for stable marketplace liquidity.
- **Evidence:** **XR+INF+HYP**—A19–A23/A26 and observed human-service market
  pricing/mechanisms; STORYMACHINE economics are unknown.
- **Affected future:** **H existential;** J/R only if escalation is promised.
- **Ordinary-green-test status:** turnaround failure is visible; selection bias,
  full cost, and epistemic variance are often **silent**.

### FM-21 — Directional sample reaction is mistaken for committed demand

- **Trigger:** no-draft sample reactions, recruitment counts, compliments,
  stated own-draft intent, waitlist signups, or a scheduled next step are
  interpreted as actual use, payment, return, retention, or selection of A/B/C.
- **Failure chain:** a polished stimulus primes the solution → directional
  pre-behavioral evidence is called committed validation → a future is selected
  or P1/P2/P4 execution accelerates without the separately gated behavior
  experiment → own-draft/payment/retention behavior never materializes → sunk
  cost drives more feature work.
- **Earliest signal:** no unaided pre-stimulus account of job/frequency/urgency/
  workaround/cost/last behavior; certification or ethics controls missing;
  sample claims mention “use/payment/return” that the lane cannot observe.
- **Preventive control:** certify first; obtain jurisdiction/institution-specific
  ethics determination, accessible consent/data controls, and run unaided need
  discovery before the sample. Label output only **directional pre-behavioral
  pull and authority-contract evidence**. It may clear a narrow interview gate
  or authorize feasibility design of a next gated experiment; it cannot select
  A/B/C, start P1 execution, or establish committed demand. Only the later
  experiment may record `TEST A`, `TEST B`, `TEST C`, `STOP`, or
  `REFRAME-REPEAT`; `TEST A` still requires exact P1 validity before a build.
- **Detection control:** separate pre-stimulus need evidence, sample
  comprehension/objection, stated intent, and scheduled next step. Only after
  the own-draft gate use a separate cohort funnel for actual workflow, evidence
  inspection/action, return, payment, and retention.
- **Recovery:** stop gated engineering, return to interviews/concierge tests,
  narrow or change thesis, and preserve reversible components instead of
  defending sunk cost.
- **Residual risk:** small P0 cohorts estimate mechanisms, not market size or
  durable retention.
- **Evidence:** **DC+XR+HYP+INF**—zero valid participant sessions at audit time
  and the Phase 1 boundary that public/repository evidence cannot prove demand.
  Supplemental S01 makes reflective support plausible in two small samples
  described by its authors as professional screenwriters but does not establish
  product use, payment, retention, or durable revision benefit.
- **Affected future:** **All; High**.
- **Ordinary-green-test status:** **invisible**; product demand is outside CI.

### FM-22 — Commodity positioning and absent distribution erase pricing power

- **Trigger:** launch positioned around instant AI coverage, long reports,
  rules/passes, score/verdict, chat, or speed without validated differentiation
  or a route to users.
- **Failure chain:** buyers compare against free peer exchange, $20 general LLMs,
  and $19–$79 automated reports → acquisition cost exceeds low one-shot margin
  → discounting reduces privacy/support/evaluation investment → standalone
  report has no switching cost or network → growth stalls even if output works.
- **Earliest signal:** conversion driven by discounts/free first run, low repeat
  draft continuity, prospects ask only about price/speed, high paid acquisition
  cost, low organic/referral use, and no willingness to pay for receipts,
  privacy, or escalation.
- **Preventive control:** test the evidence-first longitudinal workflow and
  privacy contract as the wedge; keep keyless diagnostic low-cost during
  validation; price human service separately; do not claim a distribution
  network before it exists.
- **Detection control:** channel-specific CAC, conversion, contribution margin,
  repeat-draft retention, willingness-to-pay experiments, win/loss interviews,
  and comparison with general LLM/manual alternatives.
- **Recovery:** abandon commodity claims, narrow the job, shift to service or
  reflective continuity if validated, reduce fixed surface, and avoid racing
  below the market floor without a sustainable cost model.
- **Residual risk:** trust and evidence are slow moats; they may still not create
  enough demand or distribution.
- **Evidence:** **XR+INF+HYP**—Phase 2 market price/workflow observables; vendor
  efficacy and private economics remain unknown.
- **Affected future:** **J existential**, **H/R High** unless differentiated.
- **Ordinary-green-test status:** **invisible**; perfect feature execution does
  not establish a market.

### FM-23 — Dual-product breadth dilutes validation and onboarding

- **Trigger:** StartScreen and editor continue exposing Doctor/Editor, OASIS,
  simulation, and many panels during P0 or public onboarding.
- **Failure chain:** users infer different jobs → validation sessions test
  incomparable workflows → first-use comprehension and time-to-value worsen →
  analytics blend curiosity about simulation with need for revision evidence →
  team cannot attribute demand and maintains two large products.
- **Earliest signal:** participants cannot state the primary job; navigation to
  simulation before completing diagnosis; high tab/surface exploration but low
  critical-path completion; support asks “what is this for?”
- **Preventive control:** one P0 front-door job and journey; OASIS behind a
  clearly separate Labs boundary; event taxonomy by product thesis; no forced
  deletion of option value.
- **Detection control:** moderated first-use sessions, path/funnel segmentation,
  comprehension recall, time-to-first-located-evidence, and cohort separation by
  entry intent.
- **Recovery:** simplify entrance and validation scripts, preserve OASIS behind
  Labs, restate the product contract, and discard mixed analytics as evidence of
  either thesis.
- **Residual risk:** a narrow surface can hide real secondary demand; validate
  Labs separately rather than blending tests.
- **Evidence:** **DC+INF+HYP**—declared future Labs posture versus current direct
  simulation entry points.
- **Affected future:** **All/current dual surface; High**.
- **Ordinary-green-test status:** partially invisible; navigation works, while
  causal interpretation of user behavior fails.

### FM-24 — Accessibility exclusion blocks the critical writer journey

- **Trigger:** keyboard-only, screen-reader, low-vision, motor-impaired, or
  reduced-motion user opens preview/settings/coverage overlays or unlabeled
  fields.
- **Failure chain:** focus escapes behind modal, Escape/restore fails, labels/
  roles are absent, tab semantics are wrong → user cannot inspect, close, or
  configure a critical workflow → abandonment and possible content/config
  mistakes → generic accessibility claim or public exposure creates additional
  risk.
- **Earliest signal:** keyboard focus reaches background; accessible-name query
  fails; screen reader announces region/buttons without dialog/title context;
  task completion differs sharply by input mode.
- **Preventive control:** one accessible tested modal primitive; programmatic
  labels and tabs; keyboard alternatives; visible focus; reduced-motion
  preservation; accessibility acceptance criteria in design and code review.
- **Detection control:** browser CI with keyboard/focus assertions and
  axe-equivalent rules; manual screen-reader and zoom/reflow checks; disability-
  inclusive usability sessions; published known-limitations process.
- **Recovery:** provide an accessible alternate path/export/support channel,
  prioritize blocking fixes, notify affected users, and avoid asserting broad
  conformance until scoped testing supports it.
- **Residual risk:** automated checks cover only part of usability/conformance;
  assistive-technology behavior varies.
- **Evidence:** **DC+XR+LR**—direct DOM trace, non-asserting browser harness, no
  browser gate; G06/WCAG 2.2.
- **Affected future:** **All; High**.
- **Ordinary-green-test status:** **invisible** under the current type/unit/API
  suite.

### FM-25 — Local/editor async and metadata state creates a haunted workflow

- **Trigger:** Clear All during slow dropped-file read; second localStorage
  compatibility write fails; reload after title-page editing; concurrent tabs
  share a session.
- **Failure chain:** cleared input reappears and may be analyzed → authoritative
  draft save succeeds but UI reports failure/blocks entry → next attempt reveals
  content the UI said was unsaved → title/author/contact reset to placeholders →
  users infer deeper data corruption and may accidentally send hidden context.
- **Earliest signal:** delayed drop resolves after clear; second-write-only fault
  returns false while envelope exists; reload changes title-page hash; cross-tab
  conflict appears in supposedly tab-isolated sessions.
- **Preventive control:** one parent-owned cancellable upload generation;
  separate authoritative/mirror save outcomes; persist title metadata with the
  draft; make shared-tab/session behavior explicit and conflict-safe.
- **Detection control:** fake-timer/delayed-read component tests, injected storage
  fault tests, reload/browser persistence journey, cross-tab tests, and visible
  list of content included before analysis/provider transfer.
- **Recovery:** stop pending reads, show the authoritative stored state, restore
  metadata from export/history if available, let user choose conflict version,
  and never silently append context after clear.
- **Residual risk:** browser quotas/private-mode policies and abrupt shutdown
  remain platform constraints; server persistence/exports must not overpromise.
- **Evidence:** **DC+INF**—direct async/storage/title/session traces; no current
  user incident alleged.
- **Affected future:** **All; High** because content control is part of trust.
- **Ordinary-green-test status:** **invisible** to happy-path unit tests; focused
  race/fault/browser tests are absent.

### FM-26 — Provider outage/fallback has the wrong lineage or confidence

- **Trigger:** timeout, quota, malformed response, partial scene failure, model
  safety refusal, or network/provider outage during deep analysis.
- **Failure chain:** some/all deep scenes fall back to quick signals → report is
  structurally valid and may still show a precise headline → user assumes a
  complete deep read or compares it with a prior deep report → retries amplify
  cost/load and mixed-lineage output obscures why verdict changed.
- **Earliest signal:** fallback-scene fraction, provider refusal/timeout code,
  deep request completing unusually fast, mixed cache/fresh lineage, or headline
  unchanged despite missing interpretation.
- **Preventive control:** explicit per-report and per-scene lineage/completeness;
  minimum deep-coverage threshold with abstention; clear degraded-mode copy;
  bounded retries/circuit breaker; never equate quick verification with deep
  reproduction.
- **Detection control:** forced outage/partial/malformed provider tests, chaos
  drills, fallback-rate SLO and alerts, receipt comparison, and UI tests for
  degraded disclosure.
- **Recovery:** return/show the quick report as a separately named result,
  preserve partial evidence without a full-deep claim, allow later opt-in retry,
  and refund provider-backed charges where appropriate.
- **Residual risk:** partial model service can be harder to detect than total
  outage; provider error taxonomies are not stable.
- **Evidence:** **DC+INF**—fallback design and mode non-comparability; G02/G05.
- **Affected future:** **All with deep AI; High**.
- **Ordinary-green-test status:** partly invisible because valid fallback is an
  expected software success.

### FM-27 — Runtime packaging/dependency/native-module failure

- **Trigger:** Alpine/native `better-sqlite3` mismatch, base/action/dependency
  update, production install with `--omit=dev`, `tsx` absence, non-root volume
  permissions, or host dependency contamination.
- **Failure chain:** source/type/unit/build gates pass → final image copies full
  dev tree and starts TypeScript via dev dependency → published container fails
  at boot or first persistence operation, or ships excess vulnerable surface →
  emergency rebuild changes the artifact again.
- **Earliest signal:** clean runtime-only install cannot `npm start`; container
  boot/persistence smoke fails; image inventory includes build tooling; native
  module ABI differs; vulnerability count expands in runner.
- **Preventive control:** compile/bundle server; production-only final
  dependencies; pinned bases/dependencies; clean reproducible image; non-root
  writable-volume contract; deny host modules through build context.
- **Detection control:** build/boot/health/persistence smoke on the exact image,
  SBOM/vulnerability scan, clean `npm ci --omit=dev` test, multi-platform build,
  and upgrade canaries.
- **Recovery:** deploy last known-good digest, rebuild from pinned clean context,
  avoid in-place dependency mutation, and publish a new immutable version.
- **Residual risk:** native/database dependencies require continuing platform
  testing; reducing dependencies lowers but does not remove supply-chain risk.
- **Evidence:** **DC+INF**—current `tsx`/dev-dependency runner and untested
  container path; low audit finding is not proof of future safety.
- **Affected future:** **All; High**.
- **Ordinary-green-test status:** **invisible** until exact-image testing or
  deployment.

### FM-28 — Liveness is green while persistence is unusable; crash is not restarted

- **Trigger:** unwritable/missing/corrupt session directory, disk full, SQLite
  failure, uncaught exception, or standalone `docker run` without restart policy.
- **Failure chain:** `/health` reports process liveness without storage readiness
  → traffic continues → first writer operation fails or content cannot persist
  → uncaught exception exits intentionally → documented container does not
  restart → monitoring saw green until user impact and cannot recover service.
- **Earliest signal:** readiness write probe fails; disk/permission/SQLite error;
  container exited without restart; liveness green while draft-save errors rise.
- **Preventive control:** keep cheap keyless liveness, add separate required-
  dependency readiness; documented/tested restart-enabled orchestration;
  disk/capacity thresholds; graceful shutdown and durable session recovery.
- **Detection control:** black-box draft save/read probe, readiness and disk
  alerts, crash/restart drill, and SLO based on writer journey rather than HTTP
  process response.
- **Recovery:** remove instance from traffic, restart under supported policy,
  repair/mount storage, restore verified backup, and reconcile drafts before
  reopening writes.
- **Residual risk:** readiness probes that mutate storage need isolation and can
  still miss workload-specific corruption.
- **Evidence:** **DC+INF**—liveness-only route, intentional exit, plain runbook.
- **Affected future:** **All; High**.
- **Ordinary-green-test status:** **invisible** without process/storage chaos and
  supported deployment testing.

### FM-29 — Configuration/support mismatch or raw provider error leak

- **Trigger:** remote/token-protected deployment uses visible Settings Test/Save;
  provider returns an error containing credentials, URL query data, identifiers,
  or request context.
- **Failure chain:** browser sends no admin authorization → secure server rejects
  UI operation → user/support weakens gate or shares a token → provider test logs
  raw error while client gets sanitized text → secret/draft context persists in
  operator logs; POST response may also falsely show `llmReady` absent.
- **Earliest signal:** 401s concentrated on Settings, successful save followed by
  “no key detected,” secret-shaped canary in logs, support instructions asking
  users to expose admin/provider keys.
- **Preventive control:** make config operator/deployment-owned or implement a
  real authenticated admin session; hide/read-only UI based on capability;
  return one parsed public-config schema; log only sanitized, length-bounded
  errors and controlled status/type.
- **Detection control:** remote-posture browser test, GET/POST schema-contract
  test, sentinel bearer/`sk-`/credential-URL log tests, log access/retention
  audit, and support-runbook review.
- **Recovery:** rotate exposed credentials, purge controlled logs under policy,
  disable the broken UI path, correct readiness state, and notify affected
  operators/users as appropriate.
- **Residual risk:** provider error formats change and aggressive sanitization
  can reduce diagnosability; structured allowlisted fields are safer than
  blacklist regex alone.
- **Evidence:** **DC+INF**—direct route/client/log/shape trace.
- **Affected future:** **All AI-enabled; High**.
- **Ordinary-green-test status:** partly invisible because localhost tests do
  not reproduce the secure remote posture and current tests assert status more
  than response/log contract.

### FM-30 — Performance cost blocks value before it is experienced

- **Trigger:** lower-end device, slow network, long screenplay, first editor
  entry, simultaneous analysis/autosave, or provider-backed workflow.
- **Failure chain:** large editor chunk plus parsing/rendering/provider latency →
  slow interaction or apparent hang → duplicate clicks/retries amplify server
  and provider work → autosave/conflict risk and abandonment rise → P0 concludes
  the value proposition failed when the interaction cost prevented evaluation.
- **Earliest signal:** p75/p95 time to interactive and time to first located
  evidence by device/script size; long tasks; retry/double-submit rate; editor
  chunk exceeds budget; drop-off before first result.
- **Preventive control:** measure representative devices/scripts; lazy-load
  optional panels/exporters; worker/bounded analysis where appropriate; progress
  and cancellation; idempotent UI; explicit compressed/uncompressed and
  interaction budgets.
- **Detection control:** production-build browser performance gate, real-user
  monitoring with privacy minimization, long-script/load profiles, bundle-delta
  CI, and provider-latency/cost budgets.
- **Recovery:** degrade to quick/local evidence, cancel duplicate work, restore
  draft state, temporarily disable slow optional surfaces, and communicate
  status without claiming content loss.
- **Residual risk:** screenplay size/device/network diversity produces a long
  tail; averages hide the users most likely to abandon.
- **Evidence:** **DC+INF+HYP**—556 KB minified editor chunk warning and absent
  performance budget; no measured writer impact yet.
- **Affected future:** **All; Moderate/High adoption**.
- **Ordinary-green-test status:** **invisible**; build warning does not fail and
  no user-performance metric is gated.

### FM-31 — Governance drift and owner/agent dependency corrupt decision memory

- **Trigger:** high parallel commit/agent churn, line-addressed prose, copied
  counts, contradictory active/retired instructions, or critical knowledge held
  by one owner/session.
- **Failure chain:** false 8,917/5,701 rule history becomes canonical → strategy
  and maintenance claims cite it → agents implement from contradictory
  documents → fixes target the wrong cause and evidence changes without a
  supersession record → when the key owner is unavailable, no one can
  reconstruct why a gate or threshold exists.
- **Earliest signal:** generated/executable facts differ from canonical prose;
  active and retired tasks conflict; counts/line references drift; decisions
  lack evidence owner, date, version, and supersession; parallel sessions edit
  the same authority.
- **Preventive control:** executable/generated state registries; short decision
  records with owner, evidence, version, expiry, and supersession; one canonical
  sequence; CODEOWNERS/review for claims, recovery, scoring, and release;
  dependency-aware change log; bus-factor exercises.
- **Detection control:** documentation invariant tests, claim-to-code audit,
  stale-reference checks, periodic git-history reconstruction, conflicting-
  authority lint, and review of decisions whose evidence expired.
- **Recovery:** freeze dependent decisions, reconstruct from code/tests/git and
  external primary sources, publish a supersession matrix, correct downstream
  artifacts, and avoid using the discovered falsehood to justify an unrelated
  strategy.
- **Residual risk:** generated truth covers measurable state, not product
  judgment; governance still needs accountable human interpretation.
- **Evidence:** **DC+EX+INF**—disproven Wave 1191 narrative, P0 readiness conflict,
  retired/live instruction drift, and high recent churn.
- **Affected future:** **All; High**.
- **Ordinary-green-test status:** **invisible** unless documentation/decision
  claims are themselves executable.

### FM-32 — Score and opportunity incentives become self-serving

- **Trigger:** score controls contest eligibility, producer visibility,
  marketplace rank, reviewer routing, subscription unlocks, or promotional
  claims; the same operator tunes the score and profits from retries.
- **Failure chain:** commercial opportunity increases the cost of a low score →
  writers buy reruns/revisions and conform to the engine → operator has an
  incentive to adjust thresholds/engagement loops → undisclosed purpose shift
  converts a diagnostic into a consequential ranking → appeals, fairness,
  calibration, and regulatory exposure arrive after scale.
- **Earliest signal:** repeat purchase clusters just below thresholds; score
  distribution shifts after monetization without reader-outcome improvement;
  opportunity acceptance differs by format/group; threshold changes lack an
  independent governance record.
- **Preventive control:** separate diagnostic, credential, and opportunity
  purposes; independent score governance; published thresholds/changes and
  uncertainty; appeals/human review; no pay-to-improve loop; validate each
  consequential use independently.
- **Detection control:** outcome/fairness/calibration audits by purpose, retry-
  spend analysis, threshold-change log, appeal overturn rate, conflict-of-
  interest review, and independent oversight.
- **Recovery:** suspend score-linked opportunity, preserve access through a
  non-score route, refund exploitative retries where appropriate, re-evaluate
  affected decisions, and separate the systems organizationally and technically.
- **Residual risk:** even disclosed ranking changes creative behavior and
  concentrates power; distribution may be a different product rather than an
  extension of feedback.
- **Evidence:** **XR+INF+HYP+LR**—competitor market mechanisms show the design
  possibility, not misconduct; A17–A18, G07, and Phase 2 industry analysis.
- **Affected future:** **J/H with distribution; High**. R is affected if a
  reflective signal later acquires opportunity consequences.
- **Ordinary-green-test status:** **invisible**; revenue and engagement can
  improve while governance quality deteriorates.

## 5. Failures ordinary green tests systematically miss

The current `lint`/build/9,507-pass baseline is strong evidence about bounded
software mechanics. It is structurally incapable of establishing the following:

| Green result | What can still be catastrophically wrong | Required evidence channel |
|---|---|---|
| Same input → same score/hash | The interpretation/use is invalid or form-confounded | Rights-clean, blind, held-out multi-reader validation with uncertainty |
| Thousands of detector fixtures pass | Real scripts are not discriminated; writers learn to game surface signals | Real-draft perturbation, simple-baseline, and longitudinal blind-outcome tests |
| `npm test` exits 0 with 72 skips and one todo | The private real-script/degradation evidence and the composite margin gate did not pass in that run | Separate evaluated/not-evaluated status; authorized corpus runner; resolve the margin gate |
| Metamorphic command exits 0 | One of seven invariants (`empty_verbosity`) remains a tolerated failure | Report raw invariant status and fail/waive with an owned, expiring rationale |
| Deep output passes JSON/schema tests | Permitted ratings are semantically manipulated or provider drifted | Adversarial/rerun/provider canaries and lineage monitoring |
| HTTP route returns 2xx | Restore is partial, authority is lost, or another principal possesses the session | Semantic/byte-preserving recovery and identity tests |
| Final image excludes obvious data | Sensitive build context already reached daemon/cache | Effective-context and layer/cache inspection |
| Source tests/build pass before release | Published digest never booted and mutable tag no longer identifies it | Same-artifact container qualification and provenance |
| `/health` returns `ok` | Persistence is unwritable and crash recovery absent | Readiness, black-box save/read, and restart drills |
| Users accept recommendations | Interface anchoring, effort, or score gaming—not usefulness—caused acceptance | Controlled reliance study and blinded revision outcome |
| Human labels average cleanly | Readers disagree systematically or share bias | Correctly specified reliability, distributions, adjudication, and subgroup audit |
| Signups/reports grow | Demand, repeated real-draft use, payment, and retention are absent | P0 behavior gates and longitudinal cohorts |
| Privacy/security unit tests pass | Notice, consent, provider retention, backups, logs, and deletion do not match | Deployment data map, lifecycle drills, contract/counsel review |
| Browser renders visually | Keyboard/screen-reader journey is blocked | Automated and manual assistive-technology task testing |

## 6. Second-order interaction map

The highest risks amplify one another. Controls should therefore be evaluated as
systems, not as isolated tickets.

| Interaction | Second-order failure | Earliest break point |
|---|---|---|
| FM-01 wrong judgment × deterministic receipts | Provenance makes an invalid interpretation more persuasive and easier to market | Label receipts as computation/provenance, never validity; withhold authority |
| FM-02 form confound × FM-06 feedback loop | Writers add scenes/pad structure, score rises, and the product records “successful revision” | Collect form/intent; blind outcome; never train on engine delta |
| FM-05 benchmark leakage × FM-31 governance drift | A contaminated number becomes canonical and survives after its method is forgotten | Locked holdout access log plus expiring decision record |
| FM-03 destructive import/reset × FM-11 partial recovery | Current import or simulation reset can destroy unrelated authority while the available artifact lacks the state needed to rebuild it | Retire import; disable reset until transactional simulation-only clear, coordinator, manifest, and verified WAL backup pass |
| FM-04 lifecycle gap × FM-07 Docker context | A draft is disclosed through a path absent from the product data map, defeating policy and incident scope | Deny context now; inventory build/cache as a processor |
| FM-04 lifecycle gap × FM-10 bearer identity | The service cannot say who accessed a confidential draft or revoke only that actor | Real ownership/audit identity before public/team use |
| FM-08 fan-out × FM-26 provider outage | Timeouts trigger retries and turn partial degradation into a cost storm | Engine budget, cancellation, circuit breaker, degraded contract |
| FM-09 model drift × FM-15 mutable release | A verdict changes and neither code artifact nor model version can be reconstructed | Immutable build + provider/prompt/model lineage in receipt |
| FM-12 reader variance × FM-19 telemetry bias | Dominant/available readers define “truth,” then product data reinforces their convention | Plural labels, matched readers, consented sampling, independent holdout |
| FM-13 overreliance × FM-01 crisp wrong score | The most convincing wrong case causes direct harm; a later visible error can then cause total aversion | Evidence-first ordering, challenge/rollback, high-impact abstention |
| FM-15 release gap × FM-27 runtime packaging | Source passes, native runtime fails, emergency rebuild overwrites the alleged rollback tag | Qualify and promote one immutable digest |
| FM-16 multi-instance × FM-10 bearer sessions | A valid capability reaches divergent authorities; takeover and conflict evidence become ambiguous | Single-node enforcement or designed shared authority plus audit identity |
| FM-21 weak demand × FM-23 dual surface | Exploration of Labs is mistaken for demand for the coverage product | One P0 job and segmented cohorts |
| FM-22 low margin × FM-04 privacy duties | Price competition starves the expensive controls required for confidential drafts | Validate willingness to pay for trust/continuity; do not race below commodity floor |
| FM-20 human-service cost × FM-12 disagreement | More rereads are needed to create trust, which destroys margin and throughput | Pilot capacity/cost with a bounded escalation contract |
| FM-24 accessibility × FM-19 telemetry | Excluded writers disappear from the dataset, making the product look more usable and evidence more homogeneous | Accessibility gate before interpreting behavioral telemetry |
| FM-25 haunted state × FM-04 provider transfer | A cleared file resurrects and is sent for analysis, converting a race into an unauthorized-content event | One cancellable content manifest confirmed before transfer |
| FM-31 owner dependency × FM-14 external change | Legal/provider obligations change but the only person who knows data lineage is unavailable | Named accountable owner plus maintained machine-readable inventory |
| FM-32 opportunity loop × FM-06 score gaming | Economic reward accelerates homogenization and turns score optimization into rational user behavior | Purpose separation and independent governance before opportunity linkage |

## 7. Preventive control hierarchy

The pre-mortem is most cheaply broken in this order:

1. **Stop irreversible harm now:** disable/repair destructive import; add a
   deny-by-default Docker context; align generative routes and engine call
   budgets; sanitize provider errors.
2. **Bound exposure:** keep the current auth/data model private and single-node;
   do not make public privacy, recovery, accessibility, or score claims that the
   deployment cannot enforce.
3. **Make failure honest:** separate quick/deep lineage, full/partial export,
   liveness/readiness, computation receipts/validity, and local/global craft
   interpretations; abstain when the requested use is unsupported.
4. **Separate demand from claim assurance:** directional sample-only P0 may
   authorize feasibility design only. After exposure gates, run a separately
   gated committed-behavior experiment and record `TEST A`, `TEST B`, `TEST C`,
   `STOP`, or `REFRAME-REPEAT`. Only a valid need for consequential automated
   judgment starts rights-clean P1 with grouped preregistered splits, multiple
   experienced readers, simple baselines, uncertainty, adversarial cases, and
   independent outcomes.
5. **Select the product future using non-compensable gates:** J is currently
   disqualified by score-claim honesty; all futures are blocked from public
   launch by recovery/privacy/identity/accessibility gaps; H additionally needs
   reader-quality and unit-economic proof; R remains the most reversible
   hypothesis, not proven demand.
6. **Earn scale:** qualify one immutable artifact, verify restoration, enforce
   the supported topology, measure cost/performance, and keep the data/decision
   lineage independently auditable before adding distribution or opportunity.

## 8. Residual-risk judgment by future

| Future | Dominant irreducible risk | Current gate status | Pre-mortem judgment |
|---|---|---|---|
| J — automated judge | Creative-quality construct remains plural and context-sensitive even after a strong benchmark | **Fails score-honesty gate**; public launch also fails integrity/privacy/identity/accessibility gates | Highest downside and least reversible. Do not launch as authority. |
| H — service-assisted | Human variance, supply, compensation, turnaround, bias, and margin; automation can anchor readers | **Unproven**; same technical/public gates plus service economics and rater governance | Credible evidence-building pilot, not a scalable promise yet. |
| R — reflective diagnostic | Writers may not value a deliberately non-authoritative tool; evidence/choice UI can still anchor or overload | **Most technically and epistemically eligible after gate repairs, but demand unvalidated** | Best risk-adjusted hypothesis because it preserves receipts and writer agency while limiting unsupported authority. |

The decisive conclusion is not that failure can be eliminated. It is that the
current architecture can distinguish **calculated**, **reproducible**,
**validated**, **useful**, and **commercially viable** only if those states are
kept separate. Collapsing them into one green score is the central failure mode
from which most others become harder to see.
