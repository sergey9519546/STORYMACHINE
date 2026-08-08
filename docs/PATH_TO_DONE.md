# Path to Done

**This document reflects state as of 2026-08-08** (measured against
docs current as of 2026-08-08 review). Re-date the header when materially
updated — a task list that quietly drifts from reality is worse than none.

**`ROADMAP.md` remains canonical on sequence.** This document expands
ROADMAP's P0→P4 phases into concrete, numbered tasks with owners and
evidence requirements. Where anything here conflicts with `ROADMAP.md`,
**ROADMAP wins** — fix this document, not the other way around.

**Purpose:** one place that lists every remaining task from today's state
through the project's actual finish line, so any session — or the
maintainer alone — can pick it up and know exactly what is next, why, and
what gates it.

---

## 1. Where the finish line actually is

One paragraph per `ROADMAP.md` §3 phase: its exit gate, verbatim-faithful,
and its true current status.

**P0 — Validate with real writers.** Exit gate: *">=5 documented sessions
with a clear signal on the core question [does this make you want to run
your own draft — why or why not?]. If the signal is negative or ambiguous,
STOP, reframe, and repeat P0."* Status: **NOT MET.** 0/5 sessions
(`docs/user-validation/P0_EVIDENCE_SUMMARY.md`, `PHASE_TRACKER.md`). The
fielding authorization is **GO** (2026-08-04, recorded in
`PHASE_TRACKER.md`'s decision log); that is not an outcome verdict. All
technical blockers to fielding are cleared, so the current work is the
human fielding itself: recruit, moderate, and document valid sessions. P0
remains a human-evidence gate; the outcome is still unassessed.

**P1 — Make the score provably discriminate on real writing (the One
Bet).** Exit gate: *"On a pre-registered held-out set large enough to
report uncertainty: point-estimate discrimination AUC >= 0.80, with the 95%
bootstrap lower bound reported and above 0.65; shuffle-drop >= 0.80;
act-swap >= 0.70; composite min-gap guard passes; no benchmark leakage or
material regression."* Status: **PARTIAL.** Dialogue channel SOLVED (test
AUC 0.990). Structural channels below gate: SCENE_SHUFFLE 0.734, MIDPOINT_DROP
0.766, CLIMAX_RELOCATE 0.523 (chance) vs >=0.80
(`docs/p1-benchmark/DISCRIMINATION_BASELINE_2026-07-29.md`). Pooled test AUC
0.754. **Separately, and more fundamentally: no human-labeled benchmark
exists at all** — every AUC above is against mechanical
shuffle/drop/relocate/flatten degradation of a script against itself, not
against >=3 independent readers' blinded judgment of real strong-vs-weak
writing, which is what the exit gate and `PRE_REGISTRATION_PROTOCOL.md`
actually require (`docs/p1-benchmark/README.md` "What P1 has NOT done"). P1
work proceeded before a P0 PASS by explicit user direction, recorded in
`docs/p1-benchmark/P1_STATUS_2026-07-29.md` ("User directed P1 to begin;
record shows this") — not re-litigated here, cited as the authorization.

**P2 — Collapse the surface to Doctor + Editor.** Exit gate: *"A new user
reaches their first coverage report with zero exposure to
NVM/converge/twin/simulation jargon; time-to-first-report is measured."*
Status: **DONE** (`ROADMAP.md` §3, 2026-07-29). OASIS and ~40 research
panels gated behind a Labs flag (default OFF); Doctor + Editor is the
default surface; time-to-first-report instrumentation landed with P3.

**P3 — Ship the shareable, verifiable coverage report.** Exit gate: *"A
third party can open a shared report and independently verify the score; %
of Doctor runs that export is measured."* Status: **DONE** (`ROADMAP.md`
§3, 2026-07-29). Every export carries a verify block with the full
64-hex contentHash; `#verify` route re-derives the score server-side;
`tests/routes/export-verify.test.ts` proves the loop end to end including
two forgery cases. Known limit: event counters are in-memory/per-process,
not durable — acceptable per ROADMAP until the rate itself is being acted
on.

**P4 — Retention & defensibility.** Exit gate: *"Returning-user rate and
multi-revision session rate are measured."* Status: **NOT STARTED, by
design** — ROADMAP explicitly sequences this last, after the score is
"real, quiet, and shareable." P4 is blocked by both an actual P0 PASS and
the P1 real-writing validity evidence; neither requirement is met.

**Craft-v2 status.** Static scene-dependent prompt differentiation is
integrated and controlled by the server-only
`STORYMACHINE_DISABLE_CRAFT_SPEC` kill switch. It has no scoring effect and
no measured output-quality claim. KB retrieval is deferred because its source
and data are absent from a clean checkout. Analyzer-to-generation voice
feedback is also deferred because the adapter has no real production data seam.

---

## 2. THE CRITICAL PATH

The ordered list of tasks that actually gate project completion. Tasks
outside this list (§3) do not move the finish line no matter how much work
they represent.

### 1. Recruit and run >=5 valid, documented P0 sessions

**WHAT:** Recruit real screenwriters with real drafts in hand, show them the
existing sample coverage report (static or live-flow, both certified ready),
ask the exact core question verbatim, document each session per
`docs/user-validation/P0_SESSION_TEMPLATE.md`.
**WHY IT GATES:** This *is* the P0 exit gate. A P0 PASS gates
demand-dependent advancement and P4 retention/lock-in work. P1 measurement and
validity work may run in parallel only within its machine-checked evidence
gates; it never substitutes for this human outcome evidence.
**OWNER:** HUMAN-ONLY. The P0 GO is already documented in
`PHASE_TRACKER.md`; recruitment, moderation, and evidence review remain human
work. Use the current operating kit and neutral invitation rules; do not
misrepresent a research session as a product result.
**EFFORT:** Human recruitment timeline — not estimable from this repo; no
invented estimate is given here per the honesty rules governing this
document.
**EVIDENCE REQUIRED:** >=5 anonymized session records in
`docs/user-validation/sessions/`, each satisfying eligibility/consent/
exposure/evidence/privacy requirements, aggregated into
`P0_EVIDENCE_SUMMARY.md`.
**STATUS:** NOT STARTED. 0/5 (`P0_EVIDENCE_SUMMARY.md`).

### 2. Record the P0 gate verdict (PASS / STOP / INCONCLUSIVE)

**WHAT:** The decision owner aggregates the >=5 session records, applies
the pre-declared signal rule, and records PASS/STOP/INCONCLUSIVE in
`P0_EVIDENCE_SUMMARY.md`, linked from `ROADMAP.md` §3.
**WHY IT GATES:** This records the P0 human-outcome boundary. A STOP or
INCONCLUSIVE sends the project back to "reframe and repeat P0." P1
measurement and validity work may remain evidence-gated in parallel, but it
cannot convert or replace the P0 outcome.
**OWNER:** HUMAN-ONLY (the decision owner recorded in the P0 GO entry).
**EFFORT:** Hours, once >=5 sessions exist.
**EVIDENCE REQUIRED:** A completed `P0_EVIDENCE_SUMMARY.md` "P0 decision"
table with owner, date, rationale, evidence reviewed.
**STATUS:** NOT DONE (placeholder INCONCLUSIVE, 0 sessions).

*(If PASS: continue below. If STOP/INCONCLUSIVE: return to task 1 with a
reframed approach — this is not a dead end, it is the loop ROADMAP §3
explicitly designs for.)*

### 3. Build the human-blind-labeled P1 benchmark

**WHAT:** A legally distributable real-draft corpus (CC0/public-domain +
explicitly licensed author-contributed drafts) scored by >=3 independent
experienced readers giving blinded pairwise judgments, with inter-rater
agreement measured and disagreements preserved, per
`docs/user-validation/P0_EVIDENCE_SUMMARY.md`'s "P1 validity inputs and
evidence gates" section and `PRE_REGISTRATION_PROTOCOL.md`.
**WHY IT GATES:** Without this, "P1 passing" only ever means "the score
notices its own mechanical damage" — never that it agrees with a reader's
taste, which is what the product actually claims. `docs/p1-benchmark/README.md`
names this explicitly as the thing P1 has NOT done. It also requires
sourcing a **weak-craft human contrast class** — the historically measured
produced-script corpus is 100% produced/professional writing, so there is no legitimate
"bad" writing to discriminate against yet (`SCREENPLAY_SOURCING_TODO.md`).
**OWNER:** HYBRID — corpus sourcing/licensing and reader recruitment are
HUMAN-ONLY (same class of work as P0 recruitment); the benchmark
infrastructure (split protocol, scoring harness, agreement statistics) is
AGENT-DOABLE once source material and labels exist.
**EFFORT:** Weeks (human sourcing/licensing/reader recruitment) — no
invented finer estimate given.
**EVIDENCE REQUIRED:** A pre-registered split, versioned/hashed label
artifacts, inter-rater agreement statistics, held-out set unavailable for
implementer tuning — all five items in `P0_EVIDENCE_SUMMARY.md`'s P1
validity-inputs section.
**STATUS:** The human-label validity study is not started and the P1 gate is
unmet. Its measurement and preparation work may proceed only under the
machine-checked evidence gates; it does not substitute for task 2's human P0
outcome evidence.

### 4. Close the structural-discrimination gap to >=0.80 on real writing

**WHAT:** Get SCENE_SHUFFLE, MIDPOINT_DROP, and CLIMAX_RELOCATE test AUC to
>=0.80 (currently 0.734/0.766/0.523) without regressing dialogue (0.990) or
the shuffle-drop floor, via analyzer-layer inter-scene relationship
signals — not formula-layer retuning, which is diagnosed as exhausted
(`STRUCTURAL_SIGNAL_DIAGNOSIS_2026-07-29.md`,
`STRUCTURAL_SIGNAL_SCREEN_2026-08-03.md`).
**WHY IT GATES:** This is the literal P1 exit-gate number. Named as the
"live blocker" in `docs/p1-benchmark/README.md`.
**OWNER:** AGENT-DOABLE (engineering + measurement), but every scoring
change requires `npm run measure-real` locally per CLAUDE.md's quality
bar — a step nothing in CI currently checks (see §4 below).
**EFFORT:** Sessions to weeks, incremental. The next concrete, already-scoped
experiment is cheap (see 5a below); closing the full gate to 0.80 is not
estimated here.
**EVIDENCE REQUIRED:** `npm run measure-real` / `measure-auc-split.mjs
--partition=test` (run once, after the pre-registered split is frozen) showing all three channels
>=0.80 with 95% CI lower bound >0.65, shuffle-drop AUC not regressed below
its current floor, composite min-gap guard passing.
**STATUS:** IN PROGRESS / BLOCKED behind task 3 for "counts as the P1
gate" purposes — but the underlying engineering is unblocked and explicitly
license-permitted to continue per `docs/p1-benchmark/README.md`'s
authorization boundary (this is P1 continuation work, already authorized
past the P0 override). Two of the five named next-experiments are one
command away:

  **4a. Historical question-latency deduction experiment on the real corpus
  (maintainer's local machine).**
  **WHAT:** `CORPUS_DIR=/path/to/corpus node scripts/measure-auc-split.mjs
  --partition=train --with-question-latency-deduction`, compared against
  the flag-off baseline. Re-routes three already-implemented,
  order-sensitive-by-construction rules (`UNANSWERED_QUESTION_FLOOD`,
  `INSTANT_GRATIFICATION_PATTERN`, `DEAD_QUESTION_ZONE`) out of the
  AUC-~0.076 density channel into a bounded deduction — the top-ranked,
  cheapest Tier-1 candidate in `STRUCTURAL_SIGNAL_SCREEN_2026-08-03.md` and
  `docs/STORYTELLING_COVERAGE_MAP.md` STEP 4.
  **WHY IT GATES:** It's the named next concrete P1 experiment; a positive
  result is the most direct path toward closing the structural gap.
  **OWNER:** HYBRID — the command is one line, but it requires the
  externally held corpus. Its screenplay text is not a capability of a clean
  checkout: the supported local interface is `REAL_SCRIPT_CORPUS_DIR` (for
  example, `REAL_SCRIPT_CORPUS_DIR=/path/to/corpus npm run measure-real`).
  AGENT-DOABLE only on a machine where that local-only corpus is deliberately
  made available.
  **EFFORT:** One command.
  **EVIDENCE REQUIRED:** Two AUC tables (flag-on vs flag-off) compared;
  written up per `MEASUREMENT_RUNBOOK.md` §5 if it moves the number.
  **STATUS:** DIAGNOSTICALLY DISCHARGED 2026-08-05 — see
  `MEASUREMENT_RECEIPTS.md`'s 2026-08-05 entry. A standalone diagnostic
  (`scripts/diagnose-detectors-standalone.mjs`, same detector functions
  as `measure-auc-split.mjs` but skipping its 5×-doctor AUC scaffolding)
  measured QL/D1/D2/D3 disagreement across all 761 scripts (train+val+test,
  ~37s total). QL fires on only ~6–10% of scripts with a mean deduction of
  0.06–0.11 health points — an order of magnitude below the ~6-point
  intact-vs-degraded gap the AUC discriminates on. **Wiring QL would not
  meaningfully move the discrimination AUC; the full on/off run is not worth
  its multi-hour cost.** D1/D2 disagree with legacy on ~0% of produced
  features (1/761); D3 is the only detector with non-negligible signal
  (~4–6%). This is a **historical measurement receipt**, not evidence that
  a clean checkout contains the source corpus. Reproducing or extending it
  requires the separately held, copyright-bound screenplay text via
  `REAL_SCRIPT_CORPUS_DIR`; no current-checkout corpus capability is claimed.

  **4b. Fix the D6 clue-lifecycle tautology, then re-test
  setup-before-payoff ordering.**
  **WHAT:** Change `applyClueLifecycle` (`fountain-analyzer.ts` ~line 838)
  to derive seed/payoff from evidence of introduction (first-time noun
  phrase, ALL-CAPS prop intro, marked reveal) rather than scan-order
  position, per the fix shape in `DETECTOR_DEFECTS_2026-08-03.md` D6 and
  `STRUCTURAL_SIGNAL_SCREEN_2026-08-03.md`.
  **WHY IT GATES:** D6 is currently structurally incapable of ever firing
  (0/26 inversions across every degradation tested) — it blocks not just
  the setup-before-payoff candidate but several already-built, currently
  orphaned consumers (`disclosure-ledger.ts`, `typed-promises.ts`,
  `story-graph.ts`'s `forwardEdgeRatio`) per
  `docs/STORYTELLING_COVERAGE_MAP.md` STEP 4 item 2 and Tier 2 item 4.
  **OWNER:** AGENT-DOABLE, with positive/negative fixtures plus
  corpus-measured before/after per the CLAUDE.md quality bar.
  **EFFORT:** Days.
  **EVIDENCE REQUIRED:** Fixtures (positive = genuine use-before-setup
  error, negative = correctly ordered plants) + `npm run measure-real`
  before/after, AUC-24 floor respected.
  **STATUS:** DONE 2026-08-04 (commit `50b8f7c`, "D4 and D6 are fixed").
  DETECTOR_DEFECTS_2026-08-03.md's D6 addendum records the fix verbatim:
  `applyClueLifecycle` (`fountain-analyzer.ts:1072`) no longer defines
  seed = `occ[0]` / payoff = `occ[last]`; the seed is placed at the
  introduction-evidence occurrence and the payoff at any later use ≥2
  scenes removed, so `payoffScene < seedScene` (use-before-introduction)
  is now representable and `payoff.ts`'s `PAYOFF_BEFORE_SETUP` rule
  (`payoff.ts:827`) is reachable from the text path. Tests:
  `tests/core/clue-information-test.test.ts` (inversion + normal-order
  cases). The "NOT STARTED" status this entry previously carried was
  stale — it predated the 2026-08-04 fix. What REMAINS open under this
  task is the **corpus-measured AUC before/after** for the now-reachable
  `PAYOFF_BEFORE_SETUP` signal (the AUC-24 floor was respected on the
  41-script blast-radius check per the D4/D6 receipt, but the full
  real-corpus AUC re-measurement obligation is recorded in
  MEASUREMENT_RECEIPTS.md and not yet discharged on the externally held
  corpus set).

### 5. Re-validate P2/P3's already-shipped surfaces against what P0/P1 learn

**WHAT:** Once P0 produces real session evidence and P1 produces a real
human-agreement number, revisit the Doctor+Editor surface (P2) and the
verify/export loop (P3) for anything those surfaces claim that the new
evidence contradicts or that writers' actual objections/trust moments
reveal as wrong (e.g., report framing, which numbers are surfaced, whether
"health score" language overclaims relative to measured discrimination).
**WHY IT GATES:** P2/P3 are marked DONE against their *original* exit
gates, but those gates were written before any real writer or real-label
evidence existed. ROADMAP does not currently require this re-validation
explicitly, but the brief that produced this document does, and it is the
honest connective step between "P0/P1 evidence exists" and "the product
still makes sense." Not doing this risks a shipped surface that quietly
outlives the assumptions it was built on.
**OWNER:** AGENT-DOABLE for the audit/proposal; product decisions from it
may need maintainer sign-off (HYBRID).
**EFFORT:** Days, once tasks 2 and 3/4 produce real evidence.
**EVIDENCE REQUIRED:** A written reconciliation of P0 session findings and
P1 discrimination results against current P2/P3 report language and UI
claims.
**STATUS:** NOT STARTED — correctly so, since it depends on evidence that
doesn't exist yet. Not a current-sprint task.

### 6. P4 — Retention & defensibility

**WHAT:** Draft-history loop ("watch your score climb across revisions"),
jump-to-line + one-click deterministic fixes, auth/accounts.
**WHY IT GATES:** Nothing upstream of it — it is intentionally last.
Building it now would be optimizing retention around a score not yet shown
valid, which ROADMAP explicitly calls the accelerant for churn, not
protection against it.
**OWNER:** AGENT-DOABLE (engineering), once unblocked.
**EFFORT:** Not estimated — far downstream, low value doing so now.
**EVIDENCE REQUIRED:** Returning-user rate and multi-revision session rate
measured (ROADMAP §3 P4 exit gate).
**STATUS:** NOT STARTED, correctly. Do not pull forward.

---

## 3. PARALLEL / NON-GATING WORK

None of the following moves the finish line in §2. It is worth doing, but
motion here is not progress on the spine — do not let it substitute for
tasks 1-6 above.

- **Detector defects D1-D5, D7 fix shapes** (`DETECTOR_DEFECTS_2026-08-03.md`).
  D1/D2 (protagonist-passivity lexicon blindness), D3 (reversal-channel blind
  to the story's own extracted revelation), D4 (content-word co-occurrence
  certified as "planted clues"), D5 (report-layer redundancy/false
  precision), D7 (structural-form bias mechanism — real, but its magnitude
  claim was tested and REFUTED at short-fixture scale in
  `STRUCTURAL_FORM_EXPERIMENT_2026-08-03.md`; treat as a design constraint
  on future structural work, not an active bug to patch). D6 is promoted to
  the critical path (task 4b) because it blocks a Tier-1 structural
  candidate; D1-D5/D7 remain here because fixing them requires the same
  fixture-plus-corpus-measurement discipline but none is currently blocking
  the P1 gate number. Each requires positive/negative fixtures + corpus
  discrimination evidence per CLAUDE.md before shipping.

- **Temporal-consistency (`temporal-consistency.ts`) integration.** CLOSED
  as a P1 structural candidate by direct measurement
  (`TEMPORAL_ORDER_SENSITIVITY_2026-08-03.md` + its addendum): order-blind
  in practice (pooled AUC 0.489→0.500 after the false-positive fix), and
  the one genuine movement found is a narrow, already-known positional edge
  case, not story-level understanding. Recommendation on record: "no
  further probing of this module without a materially different
  measurement design." Not on the critical path unless that recommendation
  is revisited with new evidence.

- **`docs/STORYTELLING_COVERAGE_MAP.md` Tier 2/3 candidates** — `story-graph.ts`
  consolidation, `structural-genome.ts` dedup, the orphaned `SupportState`
  family (`disclosure-ledger.ts`, `epistemic-ledger.ts`, `mystery-fairness.ts`,
  `typed-promises.ts`, etc.), genre-obligation completeness,
  `metrics.ts`'s diagnostic-only fields. All either redundant with wired
  signals, blocked on a missing text-to-typed-event extractor, or explicitly
  NOT order-sensitive (Tier 3) and therefore incapable of moving the P1
  gate regardless of craft merit. Candidates, not commitments — the map's
  own standing rule.

- **Dormant-code integration verdicts from `ULTRAREVIEW_FINDINGS.md`.** A
  41-agent adversarial review of 178 files / 64,971 LOC found 55 confirmed +
  2 plausible defects. The large majority sit in the OASIS multi-agent
  engine (`server/planning/`, `server/engine/CausalSpine.ts`,
  `Orchestrator.ts`, `DirectorNode.ts`, collab/yjs) — code already gated
  behind the Labs flag per ROADMAP §4's kill/freeze list, so none of these
  gate the finish line. Two findings sit closer to the live product surface
  and are worth a maintainer look independent of the critical path:
  - `server/routes/scriptide.ts:224` — script autosave silently truncates
    text over 500,000 characters with no error or truncated flag, a
    real data-loss risk on the Doctor+Editor surface itself (the P2 default
    product, not a Labs-gated panel).
  - `server/lib/validation.ts:79` — `isPrivateIPv6`'s fe80/fc00/fd00 SSRF
    guard matches on literal leading characters of a zero-trimmed hextet
    string rather than numeric value, so it can both over- and
    under-reject IPv6 literals in `baseUrl` validation; security-adjacent,
    and ROADMAP §7 states security fixes are never gated behind phase
    sequencing.
  Every other confirmed finding (planning/emotional-effects silent no-ops,
  Orchestrator round-skip data loss, collab awareness-state bugs, session-store
  NaN-disables-eviction bugs, numerous UI stale-response races) is real and
  worth fixing but lives in Labs-gated or non-Doctor-path code — filed here,
  not promoted.

- **`ULTRAREVIEW_FINDINGS.md`'s PLAUSIBLE findings** (2: a metamorphic-test
  LCG precision issue in `evals/scoring/runner/metamorphic-cases.ts`, and a
  shallow-clone aliasing bug in `server/planning/pddl-types.ts`) — both
  OASIS/eval-tooling adjacent, non-gating.

- **Repo hygiene.** `docs/rulebook/README.md`'s 3,216-rule count vs. any
  remaining stale legacy rule-count figures in older filed docs — the two
  disproven larger counts the 2026-07-14 audit retired; `npm run
  honesty-audit` now scans all tracked markdown for them by pattern (the
  landing-footer/ROADMAP/NORTH_STAR numbers are already reconciled per
  ROADMAP §4 and §6's changelog); the SHOULD-tier pre-deployment security
  items, **re-verified 2026-08-05** (see CHANGELOG 2026-08-05 entry): the
  `ip-address` HIGH CVE cluster (3 SSRF/trust-bypass advisories on the
  express-rate-limit request path) is **CLOSED** via the 10.2.0→10.4.0
  bump within express-rate-limit's declared range, with a regression
  guard at `tests/routes/ip-address-cve.test.ts` (observed red on the
  vulnerable version). Of the other five SHOULD items ROADMAP §7 flagged
  as "verify": CSV formula injection (**CLOSED** — `CSV_FORMULA_LEAD`
  guard in `server/lib/breakdown.ts`), run-room limiter tier mismatch
  (**CLOSED** — `/api/run-room`, `/api/turn`, `/api/game/interview` all
  on `aiLimiter` now), no prod CSP (**CLOSED** — CSP middleware in
  `server/app.ts`, gated to `NODE_ENV==='production'`), container runs
  root (**CLOSED** — `USER node` + chown in `Dockerfile`), collab token
  room-ownership (**DEFERRED BY DESIGN** — `server/routes/collab.ts:12`
  documents it as an intentional bearer-capability model, not a gap).
  Remaining: 1 low-severity `esbuild` advisory (dev-server-only, Windows
  dev path) — `npm audit fix` addresses it but it is not on any
  production request path.

- **Corpus de-identification migration (maintainer's local run).**
  `scripts/migrate-corpus-ids.mjs` and `scripts/verify-corpus-layout.mjs`
  are built and verified end-to-end against the 6 CC0 reference scripts
  plus synthetic fixtures, but have never touched the real 761-script or
  72-script corpora because that text isn't present in any environment
  this tooling was built in (`CORPUS_IDENTIFICATION.md` §6). This is
  provenance hygiene — it does NOT change the corpus's copyright or
  redistribution status, and does NOT unblock task 3 above (a
  de-identified private corpus is still not "legally distributable").
  **WHAT:** Run the 6-step migration procedure in `CORPUS_IDENTIFICATION.md`
  §4 on the maintainer's machine, commit only the migrated manifests, never
  the crosswalk. **OWNER:** HUMAN (requires local corpus access) with
  AGENT-DOABLE tooling already built. **EFFORT:** One command sequence.
  **STATUS:** Tooling ready; migration itself not run.

---

## 4. STANDING DECISIONS OPEN

The maintainer's queue — decisions this document cannot make.

**AUC-floor enforcement: CI secrets vs. required-human-step.** The AUC-24
>=0.622 ratchet (`tests/core/real-script-corpus.test.ts`) is currently
*not* automatically enforced: CI sets only `GEMINI_API_KEY`, never
`REAL_SCRIPT_CORPUS_DIR` (verified in this session — grepped
`.github/workflows/ci.yml`, confirmed absent), so every assertion in that
file SKIPS on every CI run and `npm test` reports 0 failures regardless of
whether the doctor became more structure-blind. Wiring the real corpus into
CI as a secret/self-hosted-runner asset would make the floor genuinely
ratcheted, at the cost of exposing copyrighted screenplay text to CI
infrastructure and its access-control surface. Leaving it as a required
human step (`npm run measure-real` before merging any scoring change,
per CLAUDE.md) keeps the corpus off CI entirely but relies entirely on
human discipline nothing currently checks. **Decision needed:** which
tradeoff the maintainer accepts, and if CI enforcement is chosen, how the
corpus reaches CI without violating its copyright/local-only status.

**Repo visibility follow-through.** Referenced in this task's brief as a
maintainer decision already made (repo-private), with the visibility change
itself still the maintainer's to click. **No committed doc in this repo
corroborates this claim** — it was not found in ROADMAP.md, NORTH_STAR.md,
CLAUDE.md, or any docs/ file searched in this session. Recorded here as an
open item per the brief, flagged as **uncorroborated by any committed
source** — the maintainer should confirm current GitHub repo visibility
state directly rather than trust this document's inherited claim.

**Dependency-graph setting.** Same status: referenced in the task brief,
not found in any committed doc in this repository during this session's
search. Flagged as **uncorroborated** — needs the maintainer's direct
confirmation of what setting is even being referred to (GitHub's dependency
graph / Dependabot feature is the most likely reading, but this document
does not assert that without a source).

**P0 outcome verdict.** Fielding GO is already recorded (2026-08-04); it is
not a remaining maintainer decision. The next human decision is made only
after valid sessions exist: apply the pre-registered signal rule to the
documented evidence and record PASS, STOP, or INCONCLUSIVE. Until then, the
active work is fielding, not another go/no-go review.

---

## 5. WHAT "DONE" MEANS

This project is done — in the sense that matters, not the sense of "no
more possible work exists" — when three things are true:

1. **A real writer wants the report.** P0 PASS: >=5 documented sessions
   show screenwriters, shown the actual coverage report, want to run their
   own draft. Not "would consider it" — a real pull.
2. **The score provably discriminates on real writing.** P1 gate cleared
   against human-blind-labeled judgment, not just mechanical
   shuffle/drop/relocate/flatten damage to a script against itself — AUC
   >=0.80 with a defensible lower bound, on a held-out set no implementer
   tuned against.
3. **The surface tells no lies.** The honesty machinery that already
   exists — the verify block, the contentHash receipts, the honest
   degradation posture, the `honesty-audit`/`check-docs` scripts, this
   document's own discipline of citing sources — keeps holding as the
   product evolves, and known detector defects (D1-D7) are either fixed
   with evidence or the report is honest about their limits rather than
   silent.

Anything past those three — retention loops, draft history, auth, more
detectors, more coverage-map rows filled in — is optional. Ranked gap
lists, dormant-code cleanup, and UI polish are not failure states to
apologize for; they are correctly non-gating. The project's own documented
central failure mode was mistaking motion (more rules, more panels, more
research intake) for progress toward these three things. Do not repeat it
while working from this document.

---

## Appendix — source conflicts noticed while writing this document

1. **`docs/p1-benchmark/README.md`'s summary table vs.
   `MEASUREMENT_RUNBOOK.md`'s §6 "Current State" table** report identical
   numbers (DIALOGUE_FLATTEN 0.990, SCENE_SHUFFLE 0.734, MIDPOINT_DROP
   0.766, CLIMAX_RELOCATE 0.523, pooled 0.754) — not a real conflict, but
   both cite `DISCRIMINATION_BASELINE_2026-07-29.md` as source without one
   pointing at the other, so a future editor who updates one number in
   isolation could easily leave the sibling table stale. Worth
   consolidating to a single source of truth if either changes.

2. **`MEASUREMENT_RUNBOOK.md` §7.3 vs. `CLAUDE.md`'s "Which floor,
   exactly."** The runbook's own inconsistencies section (written before
   CLAUDE.md's disambiguation, or not reconciled with it) *recommends*
   updating CLAUDE.md to state "shuffle-drop AUC on the 761-script test
   partition must not regress below 0.734" — collapsing the AUC-24 (0.622)
   and AUC-71/153-script-partition (0.734) statistics into one number.
   CLAUDE.md's current, more recent text explicitly warns against exactly
   this move ("Do not 'update' the 0.622 ratchet to a P1 number — different
   corpus, different degradation, different denominator"). This document
   follows CLAUDE.md (the more recent, more explicit source) and treats
   the runbook's §7.3 recommendation as superseded/incorrect, not
   actioned. Flagging so nobody executes the runbook's stale suggestion.

3. **P0's certified-SHA trail is scattered across three files with
   different "as of" commits** (`c5749b9` API-level, `1a7f3b4`/`4c131df`
   browser-DOM, `d733240` static-stimulus re-verify, then re-certified
   again on `claude/fix-scene-numbering` after the scene-label migration).
   Each individual claim is internally consistent and dated, but there is
   no single "current certified SHA" line — a reader has to reconstruct
   the trail across `PHASE_TRACKER.md`, `P0_EVIDENCE_SUMMARY.md`, and
   `FIELDING_DECISION_BRIEF.md` to know what's current. Not a factual
   conflict (the docs agree on what happened when), but a findability gap
   worth fixing if P0 fielding is imminent — the decision owner will want
   one line, not a trail.

4. **The task brief's "repo-private decision made by maintainer" and
   "Dependency-graph setting" claims** could not be corroborated against
   any committed document in this repository (see §4 above). This is not
   a conflict between two documents — it's an absence of a documentary
   source for a claim this document was asked to encode. Recorded as
   uncorroborated rather than either asserted as fact or silently dropped.
