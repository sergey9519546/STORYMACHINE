# STORYMACHINE — Decision Log

**Purpose**: Audit trail of major strategic decisions that changed project direction.

**Canonical source**: `ROADMAP.md` is the single source of truth for project
direction, phases, and sequencing. This log is a narrative audit trail, not the
authoritative record. Phase-defining architectural decisions are recorded in the
ADR system at `docs/adr/` (see `docs/adr/README.md`; e.g. `ADR-001` and
`ADR-002`) — that is the authoritative record for *why* a phase-defining
decision holds. New phase-defining decisions should land as a new ADR there.

**Note (2026-07-28):** The `MASTER_ROADMAP.md` referenced in earlier entries
below has been archived to `docs/filed-backlog/2026-07-15-session/`. Its shifted
phase numbering ("Phase 0 = documentation", "Phase 2 = P0 validation") does not
match ROADMAP.md, where **P0 = user validation**. Read any phase references below
through ROADMAP.md's numbering, not MASTER_ROADMAP's.

---

## Decision #1: User Validation First (2026-07-15)

**Context**: 10+ planning documents gave contradictory guidance:
- ROADMAP.md (2026-07-14): "P0 user validation blocks all new engine work"
- V5.0_ULTIMATE_ROADMAP.md (2026-07-15): "Ship V5.0 Complete, build 4 new layers over 6-12 months"
- SESSION_EPIC_COMPLETE.md (2026-07-15): "10,922 LOC deployed, ready to merge to main"

**The Question**: Should we activate V5.0 systems now or validate user demand first?

**Options Considered**:
1. **User Validation First** — Follow ROADMAP P0 stance, recruit 5+ writers, prove demand before building
2. **Technical Integration First** — Wire V5 systems into production, validate later
3. **Hybrid** — Parallel tracks (validate + integrate simultaneously)
4. **Just Fix Broken** — Make existing code work, decide after

**Decision**: **User Validation First** (Option 1)

**Rationale**:
- NORTH_STAR.md constitutional law: "Demand before rigor"
- Project's central failure mode was "optimizing rigor without validated user need"
- V5 systems are 5,000+ LOC built without a single user interview
- Story Graph Phase 1-2 ready to show users — validate before building Phase 3-4
- Risk mitigation: Learn cheaply (2-3 weeks) before investing heavily (2-3 months)

**Implications** *(as originally recorded 2026-07-15; the hard-gate items
below were SUPERSEDED by Decision #2 on 2026-08-11 — see that entry)*:
- ~~P0 is a **hard gate** — no new engine work until it clears~~ *(SUPERSEDED)*
- ~~V5 systems remain in **shadow mode** (OFF by default) until P0 GREEN~~ *(SUPERSEDED)*
- ~~Story Graph Phase 3-4 blocked on P0 GREEN + P1 validation~~ *(SUPERSEDED)*
- Infinity Gate Layer 4-7 moved to filed backlog
- Wave program stays RETIRED, rule count frozen at 3,216

**Expected Outcomes**:
- **GREEN (4+ strong pull)**: Proceed to activate V5 + build P1 benchmark corpus
- **YELLOW (2-3 strong pull)**: Fix objections, iterate P0, re-test
- **RED (<2 strong pull)**: Archive V5, stop P1, pivot or graceful exit

**Documents Reconciled**:
- Created MASTER_ROADMAP.md as single source of truth *(now superseded —
  `MASTER_ROADMAP.md` was archived to `docs/filed-backlog/2026-07-15-session/`
  on 2026-07-28; `ROADMAP.md` is the canonical source of truth)*
- Archived contradictory docs to `filed-backlog/2026-07-15-session/`:
  - V5.0_ULTIMATE_ROADMAP.md
  - SESSION_EPIC_COMPLETE.md
  - ULTRAPROMPT_BLUEPRINT_*.md
  - UX_OVERHAUL_COMPLETE_*.md
  - STORY_GRAPH_*.md (11 files)
  - V5.0_RELEASE.md

**Status**: **SUPERSEDED by Decision #2 (2026-08-11).** Decision #1's
hard-gate framing ("P0 blocks all new engine work until its exit gate
clears") is retired. P0 remains a recommended evidence lane per its
original rationale, but engine work no longer waits on it.

**Cross-reference**: The phase-defining nature of this decision belongs in the
ADR system at `docs/adr/` (see `ADR-001`, `ADR-002`, and `docs/adr/README.md`),
which is the authoritative record for *why* phase-defining decisions hold.

**Revision History**: This decision can be revisited if P0 GREEN validates demand for V5 capabilities

---

## Decision #2: Retire the P0 Hard-Gate (2026-08-11)

**Context**: Decision #1 (2026-07-15) established P0 (user validation) as a
hard gate: "no new engine work until P0 clears." As of 2026-08-11, P0 has
zero documented valid sessions (the "GREEN" state that briefly appeared on
the `codex/quarantine-2026-08-08-prototypes` branch was a fabrication,
reverted by the maintainer in commit `a28436c`). The hard-gate therefore
left the project in a state where no engine work could proceed, indefinitely,
pending human recruitment that had not occurred.

**The Question**: Should the P0 hard-gate remain in force, blocking all
engine work, or should engine work proceed in parallel with P0
evidence-gathering?

**Decision**: **Retire the P0 hard-gate.** Engine work proceeds in parallel
with P0. P0 remains a recommended, actively-pursued evidence lane — it is
no longer a prerequisite for engine work.

**Rationale**:
- Maintainer decision (the project owner has the authority to amend
  self-imposed governance constraints).
- The hard-gate created an indefinite, human-recruitment-dependent freeze
  with no defined path to clearing from within the codebase.
- The 2026-08-04 amendment had already partially relaxed this (replacing the
  blanket code freeze with machine-checked evidence gates); this decision
  completes that relaxation for the demand-gate specifically.
- P0's original rationale (validate demand before over-investing) still
  holds as guidance; it no longer holds as a blocking constraint.

**What changed**:
- `NORTH_STAR.md` §1 law "Demand before rigor" amended: gate → principle.
- `AGENTS.md` "What's Gated" → "Standing constraints"; P0-dependent gates
  removed.
- `CLAUDE.md` P0 item and law reference reframed.
- `ROADMAP.md` P0 section header and §-law restatement amended.
- Decision #1 implications struck through where superseded.

**What did NOT change**:
- P0 is still recommended and worth pursuing — the demand signal matters.
- The rule-count freeze (3,216 constants) and wave-program retirement are
  unrelated to P0 and remain in force.
- The 2026-08-04 machine-checked evidence gates (measurement receipts, AUC
  ratchet) for scoring-path changes remain in force.

**Status**: Active.

---

## Decision #3: Demote the Generative Surface to Labs (2026-09-03)

**Context**: The 2026-09-02 retrospective
(`docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md` §11) found that every
LLM-adjacent test in the repository is plumbing — `ai-budget`,
`ai-config-live-path`, `llm-ready`, the route contracts. Not one assertion
anywhere says whether a rewrite pass, a copilot suggestion, or a deep-read
annotation is *good*, or even not worse than its input. Meanwhile the
deterministic half is measured hard (AUC ratchets, measurement receipts, a
761-script benchmark, 135 browser surface assertions). "Keyless-first" is a
genuinely strong privacy posture and worth keeping; it had also become
load-bearing as an excuse for never evaluating the other half.

**The Question**: The retrospective framed it as binary. Either (a) demote the
generative surface to Labs alongside OASIS, or (b) fund a ~30-case golden set
with a human-scored rubric and a pinned model so the generative half gets a
real quality gate. Shipping unevaluated generation on the default surface
indefinitely was not one of the options.

**Options Considered**:
1. **Demote to Labs** — one flag, no deletion, the default surface becomes
   fully deterministic and fully measured.
2. **Fund the golden set** — ~30 cases, >=2 scorers, a pinned model, and a
   recurring cost every time the model changes.
3. **Leave it as is** — keep unevaluated generation on the default surface and
   keep describing keyless-first as a feature.

**Decision**: **Demote to Labs** (Option 1).

**Rationale**:
- It is what ROADMAP P2 already says: collapse the surface to Doctor +
  Editor, everything else behind a Labs flag. The generative half was simply
  never counted as "everything else" when P2 shipped.
- It makes keyless-first the product's front door rather than its excuse. With
  Labs off, the default surface makes no LLM-adjacent call at all — which is
  what the landing page's keyless claim has always implied.
- A graded set has neither budget nor readers today. Option 2 is the right
  thing to do *before re-promoting*, not a thing to block on now.
- The alternative to gating is not "evaluate it soon"; it is shipping
  unevaluated output next to a score that is measured. That contrast is the
  liability.

**What changed** (all in `src/`; the single existing flag,
`src/lib/feature-flags.ts`'s `getLabsEnabled()`, gates all of it):
- Editor: "Fix with AI" (and its `Mod-Shift-f` binding) — the whole
  `fixAction()` extension is omitted from Live Notes when Labs is off, so the
  editor makes no `/api/ai-config` probe either. The deterministic squiggles
  and hover text are untouched.
- Script Doctor: the "Deep read" toggle and every "Fix & verify" button. The
  stored deep-read preference is AND'd with the flag, so a preference saved
  under Labs cannot keep firing after Labs is turned off.
- Toolbar + command palette: the auto-analysis toggle (POST
  `/api/analyze-script`), which now sits in the palette's Labs group.
  `scheduleAutoAnalysis` is AND'd with the flag for the same
  stale-preference reason.
- The live-intent copilot (POST `/api/live/intent`), which had no UI control
  at all and fired on every typing pause.
- Settings: the five AI-provider tabs (Providers, Text LLM, Image, TTS,
  Embeddings) are hidden, not shown-and-inert — an API-key form on the
  keyless front door invites a writer to paste a secret into a deployment
  that will not use it. Session (Delete Everything) and Labs stay in the
  strip; the default strip goes 8 tabs -> 3.
- The "No AI key · analysis ok" banner, which with Labs off answers a
  question the writer was never asked.

**What this does NOT decide**:
- **Nothing is deleted.** Every generative module, route, and plumbing test
  stays and still runs. With Labs ON the whole surface behaves exactly as it
  did before this decision — the browser suite asserts both directions.
- The server is untouched: `/api/ai-config`'s `llmReady`, the routes, their
  limiters and schemas are all unchanged. The flag decides whether a
  *control* renders, never whether the readiness answer is honest.
- It does not close Option 2. Re-promotion is explicitly available once a
  graded set exists (~30 cases, a rubric, >=2 scorers, a pinned model, run in
  CI) — that is the bar this decision defers, not abandons.
- It does not touch the deterministic surface, the AUC ratchet, the rule-count
  freeze, or P0/P1.

**Expected Outcomes**: A first-time writer reaches a verdict, a craft score,
and their next fix without ever meeting an unevaluated generative control; the
keyless claim on the landing page becomes literally true on the default path
rather than nearly true.

**Evidence**: `tests/core/generative-surface-labs-gate.test.ts` (31
assertions, both flag states) and the `P2-generative` phase of
`scripts/verify-p2-p3-surfaces.mjs` (21 live-browser assertions, Labs OFF and
Labs ON from the same starting points), both in CI.

**Decided by**: maintainer delegate (owner instruction: decide and move on).

**Status**: Active.

**Amendment (2026-09-04) — the gate covers GENERATION, not verification.**
This decision's scope was tested by a concrete case and found not to reach it,
so the deterministic half of fix-and-verify ships on the default surface. The
reasoning, from this decision's own wording:

- What it names is the generative surface. Every bullet under "What changed"
  is a control that produces or consumes MODEL OUTPUT — "Fix with AI", the
  deep-read toggle, the auto-analysis POST, the live-intent copilot, the
  AI-provider tabs. The Script Doctor bullet gates *"every 'Fix & verify'
  button"* because that button POSTs a span to `/api/scriptide/fix` and gets
  an LLM rewrite back, which is exactly the thing being deferred.
- What it gives as the reason is that *"shipping unevaluated generation on the
  default surface"* was not an option, and that the liability is *"shipping
  unevaluated output next to a score that is measured."* A writer-supplied
  candidate produces no output to evaluate. The writer wrote the text; the
  server runs the same deterministic 14-pass doctor the report above it
  already is, and every number in the receipt — health, verdict,
  cleared/introduced, the descriptive aggregates — is that measured half.
  There is nothing here that a graded generative benchmark could ever grade.
- What it says it does not decide is also on point: *"the flag decides whether
  a control renders, never whether the readiness answer is honest,"* and
  *"nothing is deleted."* Hiding a deterministic control because a generative
  sibling is hidden would be the flag deciding something else — and it would
  hide the measured half of a feature on the grounds that the unmeasured half
  is gated.

The one passage that cuts the other way, addressed rather than skipped: this
decision's second Rationale bullet says *"with Labs off, the default surface
makes no LLM-adjacent call at all — which is what the landing page's keyless
claim has always implied,"* and
`tests/core/generative-surface-labs-gate.test.ts`'s header restated it as "no
LLM-adjacent request may fire from the default Doctor + Editor surface". After
this change the default surface does POST to `/api/scriptide/fix`, which
`tests/routes/route-capabilities.test.ts` lists among the routes that can reach
an LLM. That sentence is therefore no longer literally true and is corrected
here and in that test's header, in this precise form: **the default surface
makes no call that can reach a model.** The distinction is the REQUEST SHAPE,
not the route — a body carrying `candidateFountain` returns from the route's
own early branch before `fix.ts` is even imported, so there is no code path
from it to `generateContent`, and a counting provider spy in
`tests/routes/scriptide-fix.test.ts` asserts the invocation count is zero (the
guard fails when a model call is planted into that branch). The route also
keeps the stricter `aiLimiter` rather than being relaxed to `gameLimiter`, so
nothing about its budget posture loosened. What the landing page's keyless
claim implies — that the default surface sends nothing to a model — is exactly
as true as it was; what changed is that "reaches no model" is now a property of
the request rather than of the URL, and the repository says so.

So: **"Verify my rewrite" renders on the default surface, with Labs off and no
key.** "Fix & verify" (generation) stays behind the flag exactly as decided,
with the same hide-don't-disable behaviour and the same browser assertions in
both flag states. `POST /api/scriptide/fix` gains a `candidateFountain` body
shape that skips generation entirely; the route, its limiter and its schema are
otherwise unchanged, consistent with this decision's "the server is untouched".

Why it needed saying at all: the 2026-09-04 adversarial audit found the fix
receipt's whole render path unreachable on a keyless deploy — the route
answered `{usedLLM:false, note}` with no candidate, so the card, its unit tests
and its route test all existed and could never be seen by a writer on the
deploy this project calls its front door. The gate was one of two reasons; the
missing keyless path was the other. Both are addressed rather than documented.

Evidence for the amendment: `tests/routes/scriptide-fix.test.ts` (the
writer-supplied-candidate block: receipt present with `usedLLM:false`, receipt
field-for-field identical to the generated path's for the same candidate,
identical candidate yields zero deltas, pathological candidate rejected 400)
and the `P2-generative` phase of `scripts/verify-p2-p3-surfaces.mjs`, which now
also drives the whole flow with Labs OFF on a keyless server: edit the draft in
the editor, click "Verify my rewrite", assert the receipt renders with a
measured health delta.

**Revision History**: Amended 2026-09-04 (scope clarification above; no
decision reversed, no new decision number). Revisit when a graded generative
benchmark exists; that is the condition for re-promoting any of the GENERATIVE
surface to the default surface.

---

## Decision #4: Adopt the Power-Analysis Proposals (2026-09-03)

**Context**: `docs/p1-benchmark/POWER_ANALYSIS_2026-09-02.md` and
`docs/p1-benchmark/PRE_REGISTRATION_PROTOCOL.md` §12 (added 2026-09-02,
marked PROPOSAL/unsigned) computed, for the first time, whether the
project's existing evidence-gathering sample sizes were actually large
enough to answer the questions they're asked to answer: a kappa floor with a
stated confidence-interval requirement, an overlap budget (43-49
triple-rated scripts) for computing that kappa precisely, the minimum
detectable AUC difference at the existing n=153 test partition, and the P0
session count (n=17) needed to bound "would use again" to +/-20 points —
against the 5 sessions and >=3 readers with no overlap budget that were
previously written into the plan as unexamined defaults.

**The Question**: Should the project adopt the power-analysis proposals as
governing targets, or leave them as an unsigned proposal indefinitely?

**Decision**: **Adopt the power-analysis proposals as written.** Maintainer
delegate, acting on owner instruction ("decide for me and move on"):
- `PRE_REGISTRATION_PROTOCOL.md` §12 status: PROPOSAL -> **ADOPTED
  2026-09-03**. §12.1-12.3's numbers are unchanged from the proposal;
  §12.4 is signed. Sections 1-11 (the locked pre-registration content) are
  untouched.
- P0 target: **17 moderated sessions**, with the existing 5 kept as the
  first checkpoint, not the finish line.
- P1 human-labeled benchmark (when it starts): keeps the existing >=0.60
  Fleiss' kappa floor and adds a 95% CI half-width <= 0.10 requirement, plus
  a >=49-script all-three-reader overlap budget to estimate that kappa
  precisely.
- `ROADMAP.md` P0 and P1 sections, `docs/user-validation/P0_QUICK_START.md`
  (the P0 wayfinding index) updated to state both the checkpoint and the
  target. `NORTH_STAR.md` was checked and does not state the old sizes as
  the plan (no session-count or reader-count target appears there), so it
  was left unchanged.

**Rationale**:
- The numbers are arithmetic (Hanley-McNeil AUC standard error, Fleiss'
  kappa large-sample variance, Clopper-Pearson exact binomial CIs), not
  opinion — see the derivation script `docs/p1-benchmark/power-analysis.mjs`
  cited in full in the power-analysis doc's Appendix.
- The old sizes (5 sessions, >=3 readers, no overlap budget) were never
  chosen for statistical adequacy; they were defaults nobody power-analyzed
  before writing them into the pre-registration protocol.
- Adopting the new numbers changes what counts as sufficient evidence going
  forward. It does not change what the engine does, and it does not
  fabricate evidence that doesn't exist.

**What this does NOT decide**:
- It does not claim any P0 session or P1 label exists. Zero sessions and
  zero labels means zero — this decision records a design target, not
  results. `docs/user-validation/PHASE_TRACKER.md`'s counters (0 of N)
  are unaffected by this entry.
- It does not raise the P1 AUC gate above its existing 0.80 point-estimate
  target. §12.1's proposal only asks that the CI be reported alongside the
  point estimate; the gate's bright line is unchanged.
- It does not shorten or lengthen the reader-labor timeline gap already
  flagged in §12.2 (100-200 scripts at full overlap vs. a 2-week Phase 2
  window) — that remains an open decision for whoever runs the labeling
  round.

**Links**: `docs/p1-benchmark/POWER_ANALYSIS_2026-09-02.md`;
`docs/p1-benchmark/PRE_REGISTRATION_PROTOCOL.md` §12;
`docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md` §10 (the finding
that prompted the power analysis); `ROADMAP.md` P0 and P1 sections;
`docs/user-validation/P0_QUICK_START.md`.

**Status**: Active.

---

## Decision #5: Every Reported Unverified Gate Gets an Expiry (2026-09-03)

**Context**: `scripts/report-unverified-gates.mjs` gained a per-gate
`expires` field on 2026-09-02; as of this entry only the `auc24-table` gate
had one set (2026-10-01). The other CI-skipped/env-gated gates — the E2E
journeys suite, the craft-KB generation test, and the two local-corpus
discrimination suites — had no stated deadline, so a reported gap could sit
open indefinitely with no forcing function.

**The Question**: Should every entry in the unverified-gates reporter carry
an explicit expiry, and what should each one be?

**Decision**: Set expiries for every gate the reporter tracks:
- `tests/e2e/journeys.test.ts` (env `RUN_E2E`) -> **2026-10-15**.
- `tests/nvm/generate/craft-kb.test.ts` (file `data/craft/craft-kb.json`) ->
  **2026-11-01**, with a note that closing it requires deciding whether to
  commit the generated KB itself or a derived hash of it — that decision is
  what the expiry forces, not a specific answer to it.
- `tests/core/real-script-corpus.test.ts` (env `REAL_SCRIPT_CORPUS_DIR`) and
  `tests/core/anti-slop-real-corpus.test.ts` (env `REAL_SLOP_CORPUS_DIR`) ->
  **`expires: null`** (no expiry), with a one-line reason recorded in the
  config: the corpus cannot reach CI by design (local-only, copyright — see
  `CLAUDE.md`'s AUC-24 gotcha), and the closable half of that gap is already
  covered by the committed `auc24-table` gate, which does have a deadline.
- The reporter's own test suite
  (`tests/scripts/report-unverified-gates.test.ts`) now covers a
  `null`-expiry gate as "never blocks" so that case has explicit coverage,
  not just an absence of an assertion.

**Rationale**: A reported gap with no deadline is easy to treat as
permanently acceptable. An expiry forces a revisit — either the gate closes
(the table gets committed, the corpus-adjacent test gets wired) or someone
consciously extends the deadline with a reason. The two corpus-gated tests
are the deliberate exception: they cannot close by design (see Decision #2's
and CLAUDE.md's standing rationale for why the corpus itself can never reach
CI), so giving them a false deadline would just manufacture a recurring,
unfixable red flag; `expires: null` says that honestly instead.

**What this does NOT decide**: It does not change any gate's pass/fail
criteria, the AUC-24 floor, or which gates are blocking vs. advisory beyond
what `scripts/report-unverified-gates.mjs` already encoded before this
entry (the auc24-table gate blocking from 2026-10-01 is unchanged).

**Links**: `scripts/report-unverified-gates.mjs`;
`tests/scripts/report-unverified-gates.test.ts`.

**Status**: Active.

---

## Decision #6: License the Repository (2026-09-03) — DECISION NEEDED

**Context**: `LICENSE` grants no license, right, or permission to any person
or entity to use, copy, modify, or distribute this software without the
copyright holder's prior written permission, and `package.json` sets
`"license": "UNLICENSED"`. Read literally, that makes the software
proprietary and all-rights-reserved. Yet `README.md` gives complete
self-hosting instructions (`docker pull` / `docker run`, a full local dev
setup) and `CONTRIBUTING.md` opens with "Thanks for helping" and a PR
workflow, and until this entry neither file said a word about licensing
terms. A stranger deciding whether to self-host, and a contributor about to
send a PR, had no statement anywhere in the onboarding docs of what they
were actually agreeing to. README.md and CONTRIBUTING.md now both carry a
short "Licensing" section stating the contradiction plainly and pointing
here — that is documentation of the current state, not a resolution of it.

**The Question**: Should the project's actual license change, and to what?
This is the owner's decision — this entry states the options and what each
one unblocks; it does not choose one.

**Options** (not exhaustive, not ranked):

1. **Keep it proprietary and say so everywhere.** Change nothing about the
   grant of rights; instead make the "no rights without written permission"
   posture visible and consistent — README/CONTRIBUTING stop reading as an
   open invitation, the self-host instructions get a permission-required
   notice, and (if contributions are still wanted) a contributor license
   agreement or explicit written grant covers PRs before they're merged.
   Unblocks: no change to the owner's control over the code or any future
   commercial path. Costs: self-hosting and outside contribution stay
   effectively closed to anyone the owner hasn't personally cleared, which
   is in tension with the README/CONTRIBUTING tone as written today.

2. **Adopt a permissive open-source license** (e.g. MIT, Apache-2.0). Grants
   broad rights to use, modify, and redistribute, including commercially,
   with minimal conditions (typically attribution). Unblocks: the
   self-hosting instructions and contribution invitation become literally
   true for anyone, external contributors can rely on a stable grant instead
   of ad hoc permission, and the project can appear in package registries
   / be forked / be bundled by others without a support ticket. Costs: gives
   up the ability to restrict commercial reuse of the code itself (a
   competing hosted offering built on this codebase would be permitted); no
   revocation once released under such a license for a given version.

3. **Adopt a source-available / "fair-source" license** (e.g. a
   Business Source License, a non-compete-clause license, or similar).
   Grants read/self-host/contribute rights (often with a time-delayed
   conversion to a permissive license) while restricting specific uses —
   most commonly, offering the software as a competing paid service.
   Unblocks: honest self-hosting and contribution today, closer to what the
   docs already describe, while preserving a commercial moat the owner may
   want. Costs: more legal nuance to get right than picking an OSI-approved
   license off the shelf (the restricted-use clause has to be drafted or
   selected carefully), and it does not carry the same "open source"
   branding/eligibility for some ecosystems (e.g. some Linux distro
   repositories, some "open source only" review policies) that option 2
   does.

**Decision**: Not made. This entry exists to make the contradiction visible
and enumerate the realistic paths, per the owner's request — no license
change is implied or authorized by this entry, and `LICENSE` is unchanged.

**What this does NOT decide**: Which option (if any) the project adopts,
any timeline, or whether existing contributions/forks need to be
retroactively addressed under a new license. `LICENSE` and `package.json`'s
`"license"` field remain the actual terms in force until the owner acts.

**Status**: **DECISION NEEDED** — open, addressed to the owner.

---

## Decision #7: Bound One Analysis by Wall Clock, Not by Shape (2026-09-06)

**Context**: Eight review rounds against `server/lib/validation.ts`'s Fountain
shape guard (`docs/audits/2026-09-06-mistake-search/serverfix2-review.md`)
closed every payload family where the guard's model of the analyzer disagreed
with the analyzer itself — the series began at an accepted `POST
/api/scriptide/doctor` that ran for **343,598 ms** and ended with the last
four rounds' bypasses at 42–51 s each. What round 7 left behind (§7.7) is a
different animal: a document where the guard and the analyzer **agree**. A
draft sitting at the analyzer's own 400-scene ceiling with a large cast and
one short-spoken character makes `analyzeVoices` correctly abstain, and the
other thirteen passes then do ordinary, correct work for **~12–14 s** (the
reviewer measured 12,340 ms and 13,566 ms on a box at load 1.9–3.0; this
lane re-measured the most expensive corner of the accepted envelope — 800
distinct cues × 15 occurrences, 632,427 chars, 389 scenes — at **13,765 ms**).
The reviewer's own words: *"Bounding it would mean rejecting documents at the
ceiling the analyzer itself advertises, which is a request-timeout/pool
question, not a validation-guard one."* It was recorded for the orchestrator
to rule on. This entry is that ruling.

**The Question**: Should the ~12–14 s accepted worst case be pushed back into
the shape guard (rejecting large-but-legitimate drafts before analysis), left
unbounded, or bounded where it actually lives — in the worker pool that
executes the analysis?

**Options Considered**:

1. **Tighten the shape guard until nothing over ~10 s is accepted.** The
   literal reading of the standing "any accepted `/doctor` over 10 s" review
   criterion. Rejected: the only lever the guard has is document shape, and
   the documents in question are shaped like real screenplays at the ceiling
   the analyzer itself advertises (400 scenes). Every threshold tight enough
   to catch them also rejects a legitimate large ensemble feature, and the
   guard would be answering a cost question with a formatting verdict — the
   error message would have to say something untrue about the draft.
2. **Leave it unbounded.** ~14 s is survivable and the pool already keeps it
   off the main thread. Rejected: "the current worst case is acceptable" is
   not a bound. It is exactly the state the 2026-08-14 audit found (a
   ~350-scene script holding the server for 22+ minutes), and the property
   that made that possible — no analysis has a ceiling — is untouched by any
   amount of guard work. The next slow pass, a wedged worker, or the next
   shape nobody has found yet reopens it silently.
3. **Bound the wall clock of one analysis in the worker pool** (chosen).

**Decision**: **Adopt a configurable per-analysis wall-clock budget**,
`DOCTOR_ANALYSIS_BUDGET_MS`, defaulting to **30,000 ms**, enforced in
`server/nvm/analyze/doctor-pool.ts` using the same primitive Cancel already
uses (terminate the worker). Crossing it stops the analysis, and the writer
is told so in one registered sentence.

**How the default was derived** (stated so it can be re-derived, not
re-guessed):

- Accepted worst case measured on this lane's box: **13,765 ms**; the round-7
  reviewer measured the same family at 12,340–13,566 ms and called its own
  absolute numbers "~10–20% pessimistic" under load. Call the accepted
  ceiling **~14 s**.
- **2× headroom** over that ceiling = ~28 s, rounded to **30 s**. The headroom
  is the whole point: the same draft that finishes in 14 s on an idle box can
  take materially longer on a contended one, and a wall-clock bound that
  fires on legitimate work is worse than no bound at all.
- 30,000 is also `DOCTOR_POOL_PREWARM_TIMEOUT_MS`'s existing default, so an
  operator reading the env table meets **one** number for "how long the doctor
  is allowed to take", not two.
- It must stay **below the client's own 120 s diagnosis watchdog**
  (`src/components/scriptide/ScriptDoctorPanel.tsx`), or the writer would meet
  the generic "Diagnosis timed out (120s)" copy and never see the honest
  sentence. 30 s is well inside it, and a test asserts that relationship.

**What the writer sees**: one sentence, registered in
`docs/CLAIMS_REGISTER.md` (row 72) and rendered by the panel's existing error
state beside its existing Retry — *"This draft took longer to analyze than
this server's per-analysis budget (30s), so the run was stopped and nothing
was scored. Try again, or split the draft into shorter files and analyze them
separately."* It deliberately does not promise that a retry will succeed (on
the same draft and the same server it usually will not) and does not blame the
draft (a contended box can cross the budget on a draft that is fine). The JSON
routes answer **400 `{ error: <that sentence> }`** — the same status and body
shape the shape guard's own analysis-cost rejection
(`MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT`, which says in its own message that it
is "a cast-size and analysis-cost limit, not a formatting error") already
uses; a 5xx was considered and rejected because it invites a blind retry of
what is, for the same draft on the same server, a deterministic outcome. The
SSE route (`POST /api/scriptide/doctor/stream`) has already flushed its
headers by then and cannot send a status, so it sends the identical sentence
in the `doctor_error` frame the client already renders verbatim.

**Rationale**:

- It bounds the failure MODE rather than today's instance of it. The value of
  this mechanism is not that it rejects the ~14 s document — at 30 s it does
  not, and is designed not to. It is that after this entry, no submission can
  occupy a worker unboundedly, for any reason, ever again.
- It puts the bound where the cost is. The guard can only see shape; the pool
  can see elapsed time, which is the thing actually being protected.
- It reuses machinery that already exists and is already trusted: the pool's
  own cancellation primitive, the routes' existing error shapes, the panel's
  existing error state. Nothing new renders; nothing new is invented.

**What this does NOT decide**:

- It does not change the shape guard, any of its bounds, or a single accept /
  reject decision it makes. `node scripts/check-scoring-receipt.mjs` reports no
  scoring-path files changed, and the doctor's output-identity harness is
  byte-identical over all 45 fixtures.
- It does not bound the IN-PROCESS path — deep read, `DOCTOR_WORKER_POOL=off`,
  or a host that cannot spawn a worker. `runScriptDoctor` is a synchronous CPU
  loop with no await point, so on the main thread there is nothing to
  terminate; a budget there would stop the WAIT without stopping the WORK,
  which is worse than the wait. This is the same carve-out Cancel already has,
  for the same reason, and it is written down at the mechanism rather than
  left to be discovered.
- It does not re-open pool SIZING. `DOCTOR_WORKER_POOL_SIZE` is unchanged; the
  budget is armed at SUBMISSION rather than at dispatch precisely because the
  time a job spends queued behind another is the writer's wall clock too, and
  that half of the problem is a sizing question this entry does not answer.
- It does not claim CI verifies the ~14 s figure. The measurements above are
  this lane's and the round-7 reviewer's, on named payloads, reproducible from
  the report. What CI asserts is the other direction — that the budget does
  NOT fire on the 54 tracked `.fountain` fixtures (the 20 CC0 reference
  screenplays included), the 20 calibration samples, the P0 sample, or a
  realistic 150-name / 3,000-block feature, each measured individually against
  half the default (`tests/core/doctor-analysis-budget.test.ts`; slowest
  legitimate item 6,935 ms, a 4.3× margin).

**Expected Outcomes**: A writer who submits a draft the server cannot analyse
in time gets an honest sentence and a working Retry in under a minute instead
of an indefinite spinner; an operator gets one env var and one measured
default; and the "one submission occupies a worker forever" failure mode is
closed by construction rather than by the absence of a known payload that
triggers it.

**Evidence**: `tests/core/doctor-analysis-budget.test.ts` (configuration,
the sentence, both fire states — running and queued — and the no-fire table);
`tests/routes/doctor-analysis-budget.test.ts` (the 400 body shape and the SSE
frame carry the same sentence); `scripts/smoke-p0-live-flow.mjs` step 3e (a
second keyless server booted with `DOCTOR_ANALYSIS_BUDGET_MS=1`: the panel
renders the sentence, offers an enabled Retry, and the same browser then gets
a real report from a server with the shipped budget). All three were confirmed
to FAIL with the mechanism disarmed before being confirmed to pass with it.

**Decided by**: maintainer delegate, ruling on the item round 7 explicitly
referred to the orchestrator (§7.7, "I record it so the orchestrator can
overrule me if it wants the literal criterion applied").

**Status**: Active.

**Amendment (2026-09-06) — the budget is TWO budgets, because the wait has two
halves and only one of them is the draft's fault.** This decision as first
written armed ONE timer at submission, covering queue wait and execution
together, and answered both with the same error, the same sentence and the
same 400. The independent review of that build produced the state where that
is untrue and measured it: **60 concurrent distinct 346 KB features** (each
~2–3 s solo, half of `gameLimiter`'s own per-IP allowance, nothing oversized
anywhere) against a default 2-worker pool. The reviewer's box shed 6 of 60 at
~34,455 ms; re-run on this lane's box, **40 of 60** were rejected at ~34,800 ms
reading *"This draft took longer to analyze than this server's per-analysis
budget (30s) … split the draft into shorter files."* For those requests every
clause of it is false: the draft never ran, it is not slow, and splitting it
addresses nothing. `NORTH_STAR`-adjacent but decisive here is LANE_STANDARD §2
— *a sentence that promises something must be true in every state that renders
it* — and this is a **registered** claim, so the ledger the honesty audit
exists to protect was carrying a falsehood.

**What changes**:

- **`DOCTOR_ANALYSIS_BUDGET_MS` (30,000 ms) now bounds EXECUTION only**, armed
  at dispatch. Everything this entry says above about its derivation, its
  status (**400**) and its sentence (row 72) is unchanged and now applies to
  exactly the state it was reasoned about: an analysis actually occupying a
  worker. The rejection of a 5xx for this half — *"it invites a blind retry of
  what is, for the same draft on the same server, a deterministic outcome"* —
  stands.
- **`DOCTOR_QUEUE_BUDGET_MS` (60,000 ms) is new** and bounds the WAIT for a
  free worker, armed at submission and disarmed at dispatch. It answers
  **503** with a `Retry-After` header and **its own registered sentence**
  (row 73), which names the server, states plainly that nothing is wrong with
  the draft, gives no "split the draft" advice, and says when to come back.
  503 is right here for the reasons 400 is right there, inverted: a queued
  rejection is **not** deterministic, retrying later is exactly the correct
  client behaviour, and a 4xx additionally files server contention inside
  client-error metrics where no operator would look for it. The `Retry-After`
  number is derived from what the pool is actually carrying — (queued jobs +
  busy workers) ÷ pool size × an EWMA of recent job durations — floored at 1 s
  and capped at 120 s, past which it stops being advice anyone can act on. The
  SSE route cannot send a header after its stream opens, so the queued
  sentence carries that same estimate **in words**; the panel's Retry stays
  enabled either way.

**Should the queued half have its own, larger budget at all?** Yes — this is
the substantive design call in the amendment, and it is set by arithmetic with
a measurement as the check, not the other way round.

- **Ceiling (binding):** the two budgets COMPOSE — a job admitted at 59.9 s
  still gets its full 30 s — so `queue + running` must stay under the panel's
  own 120 s diagnosis watchdog, or a contended writer meets the generic
  "Diagnosis timed out (120s)" copy instead of a registered sentence.
  60 + 30 = 90 s leaves 30 s of margin, and a test asserts that sum.
- **Floor (measured):** re-running the same 60-concurrent burst on the same
  box with only this changed — round 1's single 30 s budget vs. a 60 s queue
  budget — **20 of 60 scored / 40 rejected (all 40 with the false sentence)**
  became **34 of 60 scored / 26 rejected with an honest 503 and `Retry-After`
  5–66 s**. Fourteen requests that were being shed are now served, and the
  rest are labelled truthfully.
- **What is deliberately NOT claimed:** that 60 s admits any burst. It does
  not, and no value under the 120 s watchdog could — 60 feature-length
  submissions at ~2–3 s each on 2 workers need well over 100 s to drain, past
  the point where the writer's own client has already given up. Sixty
  concurrent feature-length analyses against a 2-worker pool is genuinely past
  capacity, and shedding the overflow with 503 + `Retry-After` is the correct
  answer rather than a shortfall of this number. The remedy for a deployment
  that meets these 503s under ordinary load is `DOCTOR_WORKER_POOL_SIZE`, and
  README's env table says so at the row.

Note that occupancy is bounded **tighter** by this split, not looser: 30 s now
measures execution alone rather than execution plus however long the queue
happened to be.

**What the amendment does NOT change**: the derivation of the 30 s number, the
no-fire table, the worker-path-only carve-out, the "nothing is deleted"
posture, or anything on the scoring path (`check-scoring-receipt` still
reports no scoring-path files changed; output identity is still 45/45
byte-identical).

**Evidence for the amendment**: `tests/core/doctor-analysis-budget.test.ts`
(the queued case gets state `queued`/503/`Retry-After` and never row 72's
sentence; the two sentences are asserted to be different strings; the
budget sum is asserted against the client watchdog) and
`tests/routes/doctor-analysis-budget.test.ts` (a burst behind one busy worker
is shed 503 with the header and the sentence agreeing on the same number, on
both the JSON and the SSE route). Both were confirmed to FAIL against the
round-1 behaviour before passing against this one.

**Second amendment (2026-09-06) — don't make a writer wait a minute to be told
to come back, and don't leave the pool cold after a kill.** The review of the
first amendment recorded two consequences of it as out of scope. Both are
built here rather than left for someone to rediscover.

**(a) Admission control — the queue budget is now enforced at SUBMISSION as
well as by the timer.** The first amendment was pure wait-then-shed: a
submission the pool could never have served in time still sat in the FIFO for
the whole 60 s before being refused, and was then told "try again in about 25
seconds" — a minute of a writer's time spent delivering advice the pool could
have given at once (measured by the reviewer at 62.9 s; re-measured here at
60,361 ms for the first 503 of a wave landing on a saturated pool). The same
estimator that produces `Retry-After` is now consulted before a job is
queued: if the wait this submission would face already exceeds the queue
budget by a margin, it is refused immediately, never enqueued, with the same
503, the same `Retry-After` and the same registered sentence (row 73) — it is
the same state, so it gets the same answer, just sooner. A job that IS
admitted keeps its timer, which still catches the case where the queue grew
behind it after admission.

Measured A/B on one binary (`DOCTOR_QUEUE_ADMISSION=off` vs. on, **four runs
per arm**, same box, 60 concurrent 346 KB features then 20 more 8 s later).
Ranges, not single runs — the first draft of this entry quoted one pair, and
the round-3 review showed that a single pair of a noisy box could be read
either way:

| | admission off (4 runs) | admission on (4 runs) |
|---|---|---|
| first 503 of the wave landing on a saturated pool | **60,296–60,474 ms** | **853–959 ms in 3 of 4 runs; 60,342 ms in the fourth** |
| first 503 of the cold opening wave (timer path) | 62,275–62,603 ms | 62,801–62,930 ms |
| submissions served, out of 80 | **50–52** (median 51) | **50–54** (median 51) |

**Served count: no measurable difference** — the two ranges overlap and the
medians match. That is the property that matters, because **an admission
refusal may only fire where the timer would have fired anyway**. Two
deliberate biases toward admitting enforce it: the estimate excludes the job's
OWN execution (the queue budget bounds the wait, not wait-plus-run), and it
must exceed the budget by **1.5×** before anything is refused — the measured
~1.45× by which this estimator over-stated the real wait at the shed boundary,
because the EWMA's early samples carry worker cold start.

**Latency: the win is real but not universal, and the entry says which.** The
mechanism needs the EWMA to have learned the real per-job cost; on a pool with
no completed samples it correctly admits everything. In 3 of 4 runs the second
wave's first refusal arrived in under a second; in the fourth the EWMA had not
moved far enough by the 8 s mark and the timer answered at 60.3 s, exactly as
it did before this change. Across all eight ON runs measured in this lane and
its reviews (including the reviewer's own, which fired the second wave at 3 s
rather than 8 s), seven answered between 0.13 s and 3.7 s and one at 60.3 s.
The cold opening wave is untouched in every run. `DOCTOR_QUEUE_ADMISSION=off`
reverts to wait-then-shed for an operator who prefers it.

**Caveat on the box, stated rather than implied**: none of these runs were on
a quiet machine — other lanes were building and testing throughout, which is
why the served counts are quoted as ranges and why the 1.5× margin (whose
headroom over the measured worst-case over-statement is only ~3%) is the
number to re-measure on a quiet box before anyone raises it or lowers the
queue budget.

**(b) A terminated worker is now replaced eagerly — and the replacement can
never outlive a shutdown.** Terminating is this
pool's only honest cancellation, and every user of it — Cancel, the running
budget's kill, and the "delete everything" purge — left the pool one warm
worker short, with the slot refilled only on the next submission. That made
an unrelated writer pay the worker cold start the boot pre-warm exists to
avoid (the reviewer measured `workers: 0` after ten forced kills and 9,513 ms
for the next ordinary submission, ~2–3 s of it spawning a thread and loading
the analyzer inside it). A deliberate terminate now schedules a replacement
through the same one-throwaway-analysis path boot uses, never awaited, never
past `DOCTOR_WORKER_POOL_SIZE`, never during shutdown, and off under
`NODE_ENV=test` and `DOCTOR_POOL_PREWARM=0` for the same reasons the boot
pre-warm is. **This is the documentation of Cancel's behaviour that was
missing too**: cancelling an analysis has always terminated the worker, and
until now that cost was silently transferred to the next writer.
Warming a replacement after a purge cannot undo the deletion — the
replacement is a fresh thread that has never seen a report, which is the whole
mechanism a purge relies on.

The first build of this got the shutdown ordering wrong, and the round-3
review caught it: the `shuttingDown` flag was checked BEFORE the awaits that
actually spawn the worker, while `shutdownDoctorPool()` clears that flag in
its own `finally` — so a respawn scheduled just before a shutdown spawned its
replacement AFTER the shutdown had resolved, with nothing left to terminate
it. Reproduced on the pre-fix tree: the process **hung** (`exit 124`) holding
a worker `MessagePort` with `workers === 1` two seconds after
`shutdownDoctorPool()` returned. In production that is `server.ts`'s 10 s
hard-kill turning a clean SIGTERM redeploy into **exit 1, ten seconds late**,
any time a Cancel, a budget kill or a purge lands shortly before the signal.
Three things close it, all three needed because the spawn happens inside an
async call the respawn does not control: a shutdown **generation** captured
before the await and re-checked after it; `shutdownDoctorPool()` **draining**
in-flight respawns (bounded at 3 s, far short of that 10 s hard-kill) before
its own splice; and a `finally` that terminates anything that landed anyway.
Same probe after the fix: **exit 0**, `workers === 0`, no `MessagePort` on the
loop.

**Evidence for the second amendment**: `tests/core/doctor-analysis-budget.test.ts`
(a hopeless submission refused in under 50 ms with the row-73 sentence and
never enqueued; an idle pool and a boundary submission both admitted; the
pool restored to its configured size after a purge; shutdown winning against
the respawn; the enable/disable matrix for both switches) and
`tests/routes/doctor-analysis-budget.test.ts` (the same refusal over HTTP,
with the `Retry-After` header, arriving in under 2 s against a 60 s budget,
while the admitted submission is still served). Both were confirmed to FAIL
with each mechanism disarmed before passing with it.

---

## Decision #8: A Necessity Certificate is Form-Checked, Never Judged (2026-09-13)

**Context**: `docs/research-archive/_CLEVER_MOVES.md` §10 designed the
Necessity Certificate — four questions (why now, why here, why these
characters, what makes the scene unavoidable) answered at outline time, so
that generation is given the four anchors it currently invents. It was never
built. Building it forces a question the archive answered in one sentence and
that this repository has to answer as a standing rule, because the same
question will be asked of every future quality feature: what does the engine
do with the answers?

**The Question**: Does the engine check that the four questions were
ANSWERED, or does it also assess whether an answer is a GOOD reason?

**Options Considered**:

1. **Form only.** Deterministic rules over the TEXT — present, non-empty,
   long enough, enough different words, not only placeholder tokens, not a
   copy of a sibling answer — and no opinion whatsoever about the content.
2. **Form plus an LLM quality pass.** Ask a model whether "because the
   protagonist needs a win" is a real reason, and surface that as a warning.
3. **Form plus a deterministic "quality" heuristic.** No model, but rules
   that reach for meaning — require a time expression in `whyNow`, a
   location noun in `whyHere`, and so on (which is what the archive's own
   field COMMENTS promise, though its code never implements them).

**Decision**: **Form only** (Option 1), as a standing constraint on this
feature and on anything built on top of it.

**Rationale**:

- Option 2 is `NORTH_STAR.md` §1's *no LLM-as-judge* verbatim: every verdict
  a user sees is a deterministic rule, inspectable and reproducible; LLMs may
  SENSE but never SCORE. A model grading a stated reason is a verdict a user
  sees. There is no version of it that is not the banned thing.
- Option 3 fails for a subtler reason and is the tempting one. A rule that
  demands a time expression in `whyNow` is not a form check with extra care;
  it is a *bad* judge — it passes "at some point soon" and fails "the vault
  opens once and it is opening" for having no clock noun. It would ship the
  judgement of Option 2 with none of its ability, while looking deterministic
  enough to trust. The archive's own comments describe Option 3; its code
  implements Option 1. The code was right.
- The measured failure mode is the SKIPPED question, not the weak answer. The
  archive states this plainly ("the engine's job is to enforce that *some*
  answer exists, which is enough to catch the 90% case"). The engine has no
  standing to do more: it cannot tell a true reason from a plausible one, and
  a feature that pretends otherwise is a trust liability of the kind
  `docs/CLAIMS_REGISTER.md` exists to police.
- What Option 1 gives up is real and worth naming: a writer who fills all
  four boxes with fluent nonsense passes. That is the archive's 10% case, and
  optimizing for it is precisely how the check becomes a judge.

**Implications**:

- `checkNecessity()` (`server/lib/necessity-certificate.ts`) makes no model
  call, reads no corpus, and returns the same result for the same input
  forever. `tests/nvm/generate/craft-guardrails.test.ts`'s sibling assertions
  and this lane's own tests pin that shape.
- Every surface that shows a necessity verdict must also show what the check
  does not do. The sentence is a single exported constant
  (`NECESSITY_CHECK_DISCLAIMER`), returned with every route response and
  registered in `docs/CLAIMS_REGISTER.md` (row 117), so a surface cannot
  render the verdict without the limit on it.
- The thresholds are floors on EFFORT, not on quality. A shallow but
  well-formed answer passes, and a test asserts it, so a future change that
  starts failing weak answers fails a test that says why.
- Raising a threshold is allowed; adding a rule that reads for MEANING is
  this decision being revisited, not an implementation detail.

**Expected Outcomes**: scenes generated from a beat with a certificate carry
four author-stated anchors instead of four the model invented; no quality
verdict anywhere in the feature; and the next proposal to "just have the
model check whether the reason is any good" has a decision to argue with.

**Status**: Active

**Revision History**: 2026-09-13 — created with the feature
(`lane/necessity-certificate`). Amended the same day at review round 2: the
round-1 build carried an eighth rule (`restates_context`) that compared an
answer against the beat's own text and rejected real answers, and the
`non_answer` bound required four surviving words, which rejected 3 of 10
realistic writer answers. Both are corrected — a form check that rejects a
real answer is worse than one that accepts a lazy one, which is this
decision's own logic applied to its own thresholds. See
`docs/story-generation/NECESSITY_CERTIFICATE.md` and
`docs/audits/2026-09-13-necessity/necessity-lane-report.md`.
## Decision #9: Generation Quality Becomes a Measured Track, and the Bench Is Built Before Anything Is Tuned (2026-09-13)

**Context**: On 2026-09-13 the owner gave a direction in their own words:
work mainly on "the storymachine ability to actually generate good and quality
stories that people will value and be entertained by." The project's own
record answers that with a problem rather than a plan. Decision #3 (2026-09-03)
demoted the entire generative surface to Labs on the finding that *"every
LLM-adjacent test in the repository is plumbing … Not one assertion anywhere
says whether a rewrite pass, a copilot suggestion, or a deep-read annotation is
good, or even not worse than its input."* Ten days later that was still true.
There was no number to improve, no artifact to read, and no way to tell a
tuning change that helped from one that did nothing.

Building the bench first also turned up why the question had stayed open. On an
OpenAI-compatible deployment the generative half could not run at all: both
generative call sites reached for the exported `geminiProvider` CONSTANT
instead of the provider seam, so every candidate generation and all fourteen
revision passes threw `Gemini provider not available` and took their documented
fallback. A run looked like fourteen clean passes over a compiled script with a
health score, and not one word of it had been written by a model.

**The Question**: Should the first move on the owner's direction be to improve
generation, or to measure it?

**Options Considered**:
1. **Tune first** — change prompts, craft-spec directives, pass ordering, the
   convergence budget, and judge by reading the output.
2. **Measure first** — build a bench that drives the existing pipeline end to
   end, records what every call did, scores the result with the deterministic
   doctor, and puts the scripts in front of a human reader with a rubric.
3. **Add an LLM judge** — have a model score generated scenes, and optimize
   that score.

**Decision**: **Measure first** (Option 2), and build the bench as an internal
research instrument that makes no quality claim.

**Rationale**:
- Option 1 is the failure mode this project already has a constitution about.
  `NORTH_STAR.md` §1's *measure discrimination on runnable, real writing —
  always* exists because every detector that skipped measurement died or
  inverted. A tuning pass with no instrument would have produced a changelog,
  not a change.
- Option 3 is forbidden as a product mechanism (*No LLM-as-judge*: every
  verdict a user sees is a deterministic rule or formula) and is a bad research
  instrument here besides — it would optimize for a model's taste at the exact
  moment the open question is a human's. The bench may carry an optional,
  clearly labelled research-signal column; it feeds no user-visible number.
- Decision #3 already named the shape of the answer: a roughly 30-case,
  human-scored golden set with a rubric, at least two scorers and a pinned
  model, running in CI. Nothing had started on it. A packet of six scored
  scripts is the first six cases of that set.
- Measuring first is also what surfaced the dead provider seam. A tuning lane
  would have spent its whole budget changing prompts that were never sent.

**What changed**:
- `scripts/story-bench.mjs` + `npm run story:bench`, over six committed
  premises (`tests/fixtures/story-bench-premises.json`) of six different
  shapes. It records every LLM call's model, latency and tokens, every
  fallback, the compiled Fountain, the final Fountain and the doctor's score,
  under `data/story-bench/<date>/` (gitignored).
- `--check` probes `/models` for reachability before spending a generation;
  `--packet` assembles the six scripts into one Fountain file and one PDF with
  the five-question rubric and a blank score grid.
- `server/lib/ai-providers/openai-compat.ts`: four guards, each reproduced
  live against the configured endpoint first and each shown failing on the
  unfixed adapter — `content:null` as an empty completion with a structured
  log line, a named non-retryable error for an unavailable model,
  `maxOutputTokens` forwarded as `max_tokens`, and the `@google/genai`
  response shape emitted alongside `.text`.
- `server/engine/ai.ts`: `getGenerativeProvider()` — NOT `getLLMProvider()`;
  the distinction was review round 1's item 6 and is deliberate. It honours an
  explicitly configured provider always and refuses an AUTO-SELECTED FreeRide
  for the two generative surfaces, falling back to `geminiProvider`. And
  `withRetry` honours a `nonRetryable` error.
- `server/nvm/revision/rewrite-llm.ts` and
  `server/nvm/generate/llm-generator.ts` call the seam instead of the Gemini
  constant.
- `server/nvm/generate/llm-generator.ts`'s `IR_SCHEMA`: all 14 `StoryOp` kinds
  declared as an `anyOf`, one branch per kind, each mirroring `parseOp`. Before
  this, `ops.items` declared one property — `op`, no payload — so a structured
  decoder returned bare discriminators, `parseOp` nulled every one and `parseIR`
  fell back to `stubIR`: **74 of 74 returned candidates stubbed and zero
  model-authored ops committed over the first 83-call run.** The ContinuityProof
  collisions that run reported were `stubIR`'s own facts, not the model's.
  `server/lib/ai-providers/schema.ts` was taught `anyOf`/`oneOf`,
  `additionalProperties`, explicit type arrays and (round 3) `minItems`/
  `maxItems`, all of which it had been dropping on the way to the wire. Round 3
  also closed the two remaining branch defects: `SHIFT_RELATIONSHIP` promised a
  `pair` shorter than `parseOp` accepts, and `EMOTION` admitted a partial
  `EmotionState` that made `server/nvm/quality/index.ts:495` compare `NaN > 100`
  and fail open in silence. `tests/core/llm-generator-schema.test.ts` now
  synthesises each branch's own minimum payload and requires `parseOp` to accept
  it.
- **The re-run on the corrected seam (v2):** `llm_generator_partial_parse`
  74 -> 4, committed scenes 6/45 -> 16/45, model-authored ops committed 0 -> 74,
  and the blocking Tier 1 proof moved from ContinuityProof (33 -> 0) to
  IntentionalProof (17), because the model invents characters rather than using
  the cast it is given. This is a measurement becoming real, not a quality
  claim: per the doctor's own AUC figures, health and verdict largely restate
  scenes-committed. Both tables are in
  `docs/story-generation/STORY_BENCH_2026-09-13.md` §4 and §4b.
- `ROADMAP.md`: amendments under P2 and P4 recording the direction and where
  the track sits in the sequence.

**What this does NOT decide**:
- **The Labs gate does not move.** Decision #3 stands exactly as written, and
  its condition for re-promotion is unchanged and unmet. Six scripts is not
  thirty; one scorer is not two; nothing here runs in CI.
- **No quality claim is made anywhere.** The doctor's health on a generated
  script is a real measurement of that script's STRUCTURE. It cannot see
  whether a story is interesting, whether a line sounds like a person, or
  whether a scene ends on a turn.
- **Nothing is tuned.** No prompt, craft-spec directive, pass order or
  convergence budget was changed to make a number better. That is the next
  lane's job, and it now has a before.
- **No scoring floor moves.** `node scripts/check-scoring-receipt.mjs
  main..HEAD` reports no scoring-path file changed.

**Expected Outcomes**: The next person who asks "is the generated output any
good?" has a command that answers "here is what it produced, here is what each
call cost, here is where it fell back", plus a packet a human can score. The
tuning lane that follows has a before to beat.

**Evidence**: `docs/story-generation/STORY_BENCH_2026-09-13.md` (method, the
first run's table, two honest readings, and what the doctor cannot see);
`docs/audits/2026-09-13-story/story-bench-lane-report.md` (the lane record,
including each guard's recorded pre-fix failure);
`tests/core/openai-compat-generation-guards.test.ts` and
`tests/scripts/story-bench.test.ts`.

**Decided by**: maintainer delegate, on the owner's 2026-09-13 direction.

**Status**: Active.

---

## Decision #10: Lanes Push at Checkpoints, Not at Every Commit (2026-09-18)

**Context**: `docs/LANE_STANDARD.md` §7 item 1 has said, since the 2026-09-07
sandbox rebuild that erased every worktree, the session's scratch directory,
every local `audit/*` tag and a reviewed-MERGE lane whose two commits had
never been pushed, that a lane "runs `git push -u origin lane/<name>` after
EVERY commit." `CLAUDE.md` restated the same rule. On 2026-09-18 the
maintainer objected to the cadence directly: **"remote repositories are meant
for milestone synchronization, not real-time keystroke saving."** A standing
standard was changed on that instruction, and an instruction that changes a
standing standard belongs here rather than only in the diff that acted on it —
the round-1 review of `lane/ci-docs-fast-path` named its absence as the gap
(review item 12).

**The Question**: Does the durability rule that came out of the 2026-09-07
rebuild stay as "push after every commit", or does it become a judgment call
about when a push is warranted — and if the latter, what stops the property
it protects from being lost along with the cadence?

**Options Considered**:

1. **Keep "after every commit".** Maximum durability: the worst case is one
   commit's work. It is also what the maintainer objected to, and the
   objection is about a real thing — a lane that commits at keystroke scale
   pushes at keystroke scale, and the remote stops being a record of
   milestones.
2. **Push only at the end of a lane.** The 2026-09-07 failure exactly: two
   reviewed commits existed only in a worktree when the rebuild came.
3. **Push at meaningful checkpoints, with the exposure stated and a
   tiebreaker.** A completed unit of work, before starting a long-running
   operation, before handing off to a reviewer, and always before the lane
   goes idle — where "idle" means ends its turn, waits on something, or hands
   back. Chosen.
4. Rely on the sandbox not being rebuilt. Not a real option; it is rebuilt
   without warning, and CLAUDE.md says so.

**Decision**: Option 3. §7 item 1 now reads "at meaningful checkpoints",
enumerates the four, and says **when in doubt, push**. The rule's
justification is unchanged and still stated in full: the property is not
relaxed, only re-timed.

**Rationale**: The four checkpoints cover every boundary at which work can be
lost to a rebuild the lane cannot see coming. "Always before the lane goes
idle" is the load-bearing one — it forces a push before any point at which
the lane stops running, which is the only moment a rebuild can catch it
having done nothing about its exposure. What the change genuinely gives up is
stated rather than hidden: **a lane midway through one unit of work, between
checkpoints, still has everything to lose.** That is a smaller window than
"only at the end of a lane" and a larger one than "after every commit", and
"when in doubt, push" is the tiebreaker that keeps the judgment honest rather
than letting "meaningful" drift toward "rarely".

Concurrency made the old cadence cheaper than it looks, which is why this is
about the record rather than about CI cost: since 2026-09-13 `ci.yml` and
`security.yml` carry a `concurrency` group keyed on the ref, so several
pushes in quick succession cost one CI run in flight per branch, not one run
per push. `main` is isolated into its own group per commit and is never
cancelled or dropped.

**Implications**:

- A lane that ends its turn with unpushed commits is out of standard, and
  that is the one hard line left in the rule.
- A report citing its own branch's CI run id must cite the run for the LAST
  push; an earlier push's run on the same branch is exactly the one the next
  push's run cancels.
- The cadence change interacts with the docs-only fast path landed the same
  day. `cancel-in-progress` plus a `before..head` classification could leave
  a lane branch green over code no completed run ever tested; fewer pushes
  makes that window wider, not narrower. The fast path therefore classifies
  from the last SUCCESSFUL completed run on the ref rather than from
  `github.event.before` — see `scripts/lib/validated-base.mjs` and
  `docs/audits/2026-09-18-ci-docs-fast-path/README.md`.
- `CLAUDE.md` and `docs/LANE_STANDARD.md` state the same rule and must stay
  in agreement; both now point here.

**Expected Outcomes**: no lane reports work that exists only in a worktree;
the remote's branch history reads as units of work rather than saves; and the
next proposal to change a durability rule on a verbal instruction has a
decision to argue with instead of a sentence in a §7 someone rewrote.

**Status**: Active

**Revision History**: 2026-09-18 — created in round 2 of
`lane/ci-docs-fast-path`, recording the instruction that round 1 acted on and
did not log. The round-1 review approved the §7 rewrite as written and asked
only for this entry and for `CLAUDE.md` to lead with the durability reason
rather than the objection; both are done in the same change. **Renumbered
2026-09-19** from "Decision #9" to "Decision #10" — this entry and Decision
#9 ("Generation Quality Becomes a Measured Track…", 2026-09-13, above) had
been given the same number when this entry was created; the docs-truth lane
renumbered the later (2026-09-18) entry and updated every by-number citation
of it (`CLAUDE.md`, `docs/LANE_STANDARD.md` §7, `docs/brain/**`) rather than
the earlier one, since the earlier entry is cited by number from
`docs/story-generation/STORY_BENCH_2026-09-13.md` and
`docs/CLAIMS_REGISTER.md` row 119 and renumbering it would have required
touching files outside that lane's scope.

## Decision #11: Move the AUC-24 Table Deadline to 2026-11-01 (2026-09-20)

**Context**: `scripts/report-unverified-gates.mjs`'s `auc24-table` gate
(protecting `tests/core/auc24-table.test.ts`, which recomputes the AUC-24
floor in CI from a committed table of numbers rather than corpus text) has
carried `expires: '2026-10-01'` since Decision #5 (2026-09-03). That table,
`tests/fixtures/auc24-table.json`, has never been committed — it can only be
produced by `npm run lock-auc24` running against the private, copyright-
restricted real-script corpus on the owner's machine, which cannot reach CI.
With the date unmoved, the gate would flip `report-unverified-gates.mjs` to
exit 1 on every branch from 2026-10-01, per the gate's own design (this
reporter's expiry mechanism exists precisely to block once a reported gap
sits open past its deadline; see the "EXPIRY" section at the top of that
script). Substantively, the deadline could not have been met even if the
owner had run the lock before 2026-10-01: `AUC24_DEGRADATION_ID` was bumped
to `shuffle-drop/v3` on 2026-09-19 (a reassembly fix so a degradation no
longer welds two scenes together on a script with no trailing newline), so
any table locked on the prior recipe would already be invalid and refused by
`tests/core/auc24-table.test.ts`. The first table this recipe can ever
produce can only be locked from 2026-09-19 onward.

**The Question**: Does the `auc24-table` gate's expiry move, and if so, to
what date and on what authority?

**Options Considered**:

1. **Leave it at 2026-10-01.** CI goes red on every branch on that date for a
   gap the owner could not have closed in time even with the corpus in hand,
   since the valid recipe did not exist until 2026-09-19. A gate is supposed
   to force a real decision, not manufacture an unmeetable one.
2. **Delete the gate.** Rejected: the gate protects a real, closable gap (one
   local command, `npm run lock-auc24`, on the owner's machine) and deleting
   it would remove the only forcing function that keeps that gap from
   staying open indefinitely — exactly the failure mode Decision #5 and the
   2026-09-02 retrospective both exist to prevent.
3. **Move the date deliberately, in a reviewed diff.** The gate's own header
   sanctions exactly this as one of three acceptable responses to an expiry
   arriving ("move the date deliberately — in a diff a reviewer sees and can
   refuse"). Chosen.

**Decision**: Move `scripts/report-unverified-gates.mjs`'s `auc24-table`
gate's `expires` from `2026-10-01` to `2026-11-01`, aligned with the latest
existing gate deadline already in that file (the `craft-kb` gate,
`data/craft/craft-kb.json`, also `2026-11-01`, set by Decision #5). Nothing
else in the reporter's gate list changes: `AUC24_FLOOR` (0.622) and
`AUC24_DEGRADATION_ID` (`shuffle-drop/v3`) are untouched — this is a
deadline move, not a measurement or a floor change, and moving a floor is
a measurement's job, not this decision's.

**Rationale**: The reason is substantive, not merely administrative: the
recipe the table must be locked on did not exist as a stable target until
2026-09-19, so 2026-10-01 was never a date the owner could realistically
meet with a *valid* table — locking earlier would have produced a table on
`shuffle-drop/v2` or older, which the test's own recipe-ID check refuses.
The corpus cannot reach CI by design (local-only, copyright; mounting it via
secrets was rejected, since secrets are not a corpus transport and
uploading the text anywhere is the exact exposure the de-identification work
exists to avoid), so the owner-local step remains the only path to close
this gate, unchanged by this decision. Aligning the new date with the
`craft-kb` gate's existing 2026-11-01 rather than inventing a third date
keeps the reporter's deadlines to the minimum distinct set this file's
gates actually need.

**Implications**:

- Before 2026-11-01 the owner must run `npm run measure-real` (a fresh
  measurement on the current recipe) and `npm run lock-auc24` against the
  real corpus, then commit the resulting `tests/fixtures/auc24-table.json`.
  `npm run owner:measure` runs both in sequence and stages the file.
- If the table is not committed by 2026-11-01, `scripts/
  report-unverified-gates.mjs` exits 1 and `npm run gates` fails on every
  branch, by design — the same blocking behavior the unmoved date would have
  produced on 2026-10-01, now aligned with a date the recipe could actually
  be met by.
- `CLAUDE.md`'s "(blocking from 2026-10-01)" gotcha, `scripts/
  owner-measure.mjs`'s deadline comments, `docs/p1-benchmark/
  MEASUREMENT_RUNBOOK.md`, and the `docs/brain/Gates/Gate - AUC-24 Ratchet.md`
  and `docs/brain/Owner/Owner - Lock AUC24 Table.md` notes are updated to
  2026-11-01 in the same change as this entry; dated session records, audit
  directories and the P1/public-benchmark baseline docs that cited
  2026-10-01 as a fact observed at their own time of writing are left as
  written, per this project's standing convention for dated records.
- `tests/scripts/report-unverified-gates.test.ts`'s assertion against the
  real gate list's rendered `expires:` line is updated to 2026-11-01 in the
  same change; its unrelated unit tests that use an arbitrary example date
  of 2026-10-01 to exercise `isExpired`/`evaluateGates` in general are
  untouched, since they test the mechanism, not this gate.

**Expected Outcomes**: `npm run gates` and `node scripts/
report-unverified-gates.mjs` continue to report the `auc24-table` gate as
SKIPPED (not EXPIRED) through 2026-10-31, giving the owner a deadline the
current recipe can actually be met by; from 2026-11-01, the gate blocks
exactly as it would have on the old date if the table is still uncommitted.

**Status**: Active

**Revision History**: 2026-09-20 — created in `lane/gate-expiry` to move the
`auc24-table` gate's expiry from 2026-10-01 to 2026-11-01 ahead of that
deadline, per the finding recorded in `SESSION_REPORT_2026-09-19.md` §4 row
7 and the `AUC24_DEGRADATION_ID` bump to `shuffle-drop/v3` recorded in
`CLAUDE.md` on 2026-09-19.

---

## Decision Template (for future entries)

**Context**: What situation prompted this decision?

**The Question**: What was being decided?

**Options Considered**: What alternatives were evaluated?

**Decision**: What was chosen?

**Rationale**: Why was this the best choice?

**Implications**: What does this commit the project to?

**Expected Outcomes**: What are the success criteria?

**Status**: Active / Superseded / Revisited

**Revision History**: When and why this was updated

---

**End of DECISION_LOG.md**
