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
