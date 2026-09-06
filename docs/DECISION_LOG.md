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

Measured A/B on one binary (`DOCTOR_QUEUE_ADMISSION=off` vs. on, two paired
runs each, same box, 60 concurrent 346 KB features then 20 more 8 s later):

| | admission off | admission on |
|---|---|---|
| first 503 of the wave landing on a saturated pool | 60,361 / 60,267 ms | **1,055 / 512 ms** |
| first 503 of the cold opening wave (timer path) | 62,625 / 63,688 ms | 62,750 / 64,058 ms |
| submissions served, out of 80 | 49 / 43 | 46 / 47 |

The served count is unchanged within run-to-run spread — which it must be,
because **an admission refusal may only fire where the timer would have fired
anyway**. Two deliberate biases toward admitting enforce that: the estimate
excludes the job's OWN execution (the queue budget bounds the wait, not
wait-plus-run), and it must exceed the budget by **1.5×** before anything is
refused — that factor is the measured ~1.45× by which this estimator
over-stated the real wait at the shed boundary, because the EWMA's early
samples carry worker cold start. The cold opening wave, where the pool has no
completed samples to learn from, is therefore untouched: admission does not
fire there at all, and the timer answers exactly as before.
`DOCTOR_QUEUE_ADMISSION=off` reverts to wait-then-shed for an operator who
prefers it.

**(b) A terminated worker is now replaced eagerly.** Terminating is this
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
