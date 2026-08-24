# STORYMACHINE — Roadmap

Durable master plan. Any session with fresh context (no memory of prior work)
should be able to read this file top to bottom and resume exactly where the
project stands — what shipped, what's mid-flight, and what's next, in order.

**This roadmap was re-spined on 2026-07-14 around demand, not rigor.** The
prior version was organized around the wave program (3 rules/wave forever),
research-paper intake, and corpus growth. A product teardown found those were
the wrong priorities: they manufactured an inflated rule count that, by the
engine's own measurements, is inverted in degradation experiments (AUC 0.076, worse than random's 0.50) — while no real user had
ever been shown the product. The old engineering spine is preserved below as
history and as a filed backlog (§8), but it no longer drives sequencing. The
new spine is §3: validate with writers → make the score provably discriminate
→ collapse scope → ship a shareable artifact → then defensibility.

Ground yourself before touching code: `NORTH_STAR.md` (constitution),
`docs/PATH_TO_EXCELLENCE.md` (the current execution sequence),
`ARCHITECTURE.md` (system map), `CLAUDE.md` (working constraints), and
`git log --oneline -40` for the session's commit trail. These documents were
reconciled to this roadmap on 2026-07-14: the roadmap sets sequence,
NORTH_STAR sets product laws, and CLAUDE sets implementation constraints.
`ULTRAPLAN.md` is superseded by `docs/PATH_TO_EXCELLENCE.md` and kept as a
pointer.

> **Where execution actually stands — 2026-08-21.** This file remains
> canonical on *phase semantics and sequence*. The day-to-day lane sequencing
> now lives in `docs/PATH_TO_EXCELLENCE.md`, which tracks the T/W/E/P/S lanes
> measured by the three 2026-08-14 audits. As of that document: **Phase W
> (make it truly work) and Phase E (easily controllable and interactive) are
> COMPLETE with judged exit gates; Phase S's code lanes S1–S3 are DONE; the
> first release, `1.0.0-rc.1`, is cut and its Docker image published; Phase
> P's P-1 evidence lane is done.** What remains there is owner-side: the
> stranger-week pilot, the P0 sessions, ≥3 blind readers, and the outstanding
> `graphDeduction` measurement. Nothing in that program re-sequences the P0–P4
> phases below; it is how P0–P4's remaining work is being executed.

---

## 1. Current state — the honest version (measured, 2026-07-14)

StoryMachine is a beautifully engineered answer to a question nobody has
confirmed anyone is asking. The deterministic core is real and well-built —
keyless boot, reproducible hashing, honest degradation. But the rule-count
pitch (3,217 generated pass-scoped rule constants, per `docs/rulebook/README.md`,
machine-counted from the live pass files) is a weak headline: by the doctor's
own measurements the rule channel is inverted in degradation (AUC 0.076, worse than random's 0.50). We have zero
evidence of real users, and the score has never been validated against a human
quality judgment on a real, non-synthetic screenplay.

### What actually works
- Keyless-first boot with honest degradation — no 500s when running without an LLM key.
- `contentHash` reproducibility: identical input yields identical output, and coverage export re-runs server-side for authenticity.
- The health score (`server/nvm/analyze/doctor.ts`) is fully deterministic and LLM-free. This part of the pitch is true.
- Security/CI posture: rate limiting, server-side-only LLM calls, CI-enforced no-console and keyless test guarantees.
- The emotional-arc signal (`server/nvm/analyze/emotional-arc.ts`, 12,142-word VAD lexicon, Reagan-2016 fitting) landed cleanly as a diagnostic field.

### What's broken or overstated
- **The rule count is a weak pitch, not a wedge.** The live generated rulebook is **3,217 distinct pass-scoped rule constants** (per `docs/rulebook/README.md`, machine-counted from the live pass files by `scripts/generate-rulebook.ts`; enforced by `tests/core/rulebook.test.ts`; it was 3,216 until PR #257 added INVERSE_CHEKHOV_GUN in `33a2ee48`, which is why older entries below say 3,216). Earlier prose in these docs claimed 8,917 rules — ~5,701 from a bulk "Wave 1191," ~47,500 pass lines, ~1,326 `as any` casts. An independent audit (`docs/audits/2026-07-14-high-end-audit/PHASE_2_REPOSITORY_RECONSTRUCTION.md` R2-C01) showed that bulk-wave history to be inaccurate: the catalog was always 3,216, "Wave 1191" (commit a68a425) added 6 named detectors across 2 passes, and the live totals are ~97,775 pass lines and ~1,421 `as any` occurrences. The rule-count freeze below stands — but on validity grounds (the rule channel's measured discrimination AUC is ~0.076), not on the earlier "bulk wave" history.
- **The score doesn't discriminate — by its own numbers.** Comments in `doctor.ts:1892-1898` record: scene-count scarcity term AUC 0.938 (on artificial scene-drop degradation, not natural human-labeled writing — suspected confound/proxy), the entire weighted-rule channel AUC 0.076 (inverted — worse than random's 0.50), and with scene count held constant "the doctor cannot detect reordering at all (AUC ~0.48)." Scene count + raw issue density dominate; the rule channel's ~0.076 AUC is independently re-measurable (see `docs/audits/2026-07-14-high-end-audit/`).
- **Evidence base is synthetic and largely unrunnable.** Only 6 synthetic discrimination pairs (`tests/core/discrimination.test.ts`) — 2 pass by only +1.4, the composite pair FAILS the 5.0 min-gap guard (still a todo), 3 were tied until a curve was retuned. Calibration corpus = 20 synthetic samples. The "72 produced scripts" real corpus is not in the repo; `tests/core/real-script-corpus.test.ts` SKIPS every assertion without `REAL_SCRIPT_CORPUS_DIR` (0 files locally, never runs), the manifest is actually 71 RECOMMEND + 1 CONSIDER, and the check is a floor-check (health>=80), not discrimination. Degradation AUCs are near coin-flip: shuffle-drop ~0.652, act-swap 0.48→0.62.
- **Marketing number is internally inconsistent.** Landing footer says "3,216 deterministic rules," docs say 8,917, a stale plan file says 10,523. — **Closed 2026-08-21:** no rule-count claim survives on the shipped surface (grep-verified), and `npm run honesty-audit` is a blocking CI step that fails on any `<N> rules` claim or a reappearance of the stale figures. The count is no longer part of the pitch.
- **UI sprawl:** ~40 React panels (DirectorPanel 70KB, StoryMachine 82KB, WhatIfPanel 53KB, plus SelfPlay, EpistemicMap, Converge, Twin, Room, etc.).
- **Two products, one repo.** OASIS (the multi-agent simulation engine) is ~half the codebase with no defined user persona.

### What we do NOT know
- Whether a single real user exists. There is zero validated user evidence.
- Whether screenwriters actually want a deterministic coverage score at all.
- Whether the health score tracks human quality judgment on real screenplays — every discrimination test to date is synthetic, and the one real-corpus test does not run.
- Who OASIS is for, or whether it should exist in this product.

---

## 2. Resume protocol (how any session continues)

- Work on the session-designated branch. **Never hardcode a branch name** —
  read it from the current checkout.
- **Check §3 before starting anything.** The current phase's exit gate is the
  only work that counts as progress. Work outside the active phase is filed
  backlog (§8), not the roadmap — do not pull it forward without an explicit
  decision to re-sequence.
- Per workstream: dispatch focused agents on **disjoint file sets**.
  Shared-file collisions are the project's main recurring hazard — enforce
  one owner per file per run. Parallel sessions are real (two sessions have
  independently built the same detector and merged concurrently before) —
  pull the session's own integration branch (never a hardcoded `main`) and
  check `git log` for overlapping work before starting.
- Per landing: independently re-run that workstream's own tests, review the
  diff, commit that workstream alone, push. Do not batch unrelated
  workstreams into one commit.
- Before any push that closes out a run: full `npm test` + `npm run lint`
  (`tsc --noEmit`) + `npm run build`, all green.
- Live-smoke new endpoints against `npx tsx server.ts` running keyless (no
  `GEMINI_API_KEY` set) — the product's front door is analysis-only mode,
  and every new route must degrade honestly in it, not 500.
- Check CI (GitHub Actions, `ci.yml`) after every push.
- Never commit an agent's files mid-flight — verify the diff first.
- **Measure discrimination on runnable, real writing — always.** A test that
  skips in CI proves nothing (NORTH_STAR SS1, and §1's evidence-base finding).

---

## 3. The plan — demand-driven phases

These phases are a **dependency order**, and the ordering *is* the strategy:
every downstream promise (private, instant, deterministic, reproducible
coverage) rests on the score being provably real, and by our own numbers it
isn't yet. We build demand-out, not rigor-first.

**Amended 2026-08-11** (`docs/DECISION_LOG.md` Decision #2): this is no longer
a blanket serial-work freeze. The P0 hard-gate was retired, and engine work now
proceeds in parallel with the P0 human lane under machine-checked evidence
gates (see P0's amendment below). Parallel execution does not move a phase's
exit gate: an unmet gate stays unmet, and engineering output never substitutes
for the human evidence P0 asks for. The one prohibition that survives is that
P4-class retention/lock-in work still waits.

### P0 — Validate with real writers (recommended evidence lane; P0 hard-gate RETIRED 2026-08-11 — engine work proceeds in parallel)

**Goal:** Confirm that a screenwriter, shown the existing sample coverage
report, actually wants to run their own draft.

**Why this before anything else:** Our sharpest persona is a screenwriter
seeking objective, private feedback before paying a reader. If the current
report doesn't create that pull, no amount of AUC fixes matters — we'd be
optimizing rigor in isolation from a user again, which is exactly the mistake
that got us here.

**Operational artifacts:** [quick-start](docs/user-validation/P0_QUICK_START.md) · [P0 evidence summary](docs/user-validation/P0_EVIDENCE_SUMMARY.md) · [phase tracker](docs/user-validation/PHASE_TRACKER.md) · [static stimulus report](docs/user-validation/sample-coverage-report.html) (regen: `npm run generate-p0-sample`)

**Work:**
- Recruit >=5 real screenwriters (any career tier, real drafts in hand).
- Show them the existing sample coverage report; watch, don't pitch.
- Capture the single core question: *does this make you want to run your own draft — why or why not?*
- Log objections, moments of trust, and moments of disbelief verbatim.
- ~~Write zero new product or engine code until the P0 exit gate clears. Critical security fixes are the only exception.~~
  **AMENDED 2026-08-04 (owner decision, recorded in PHASE_TRACKER's decision
  log): the blanket freeze is RETIRED and replaced by machine-checked
  evidence gates.** The freeze was written when nothing enforced anything;
  every risk it guarded against now has a tripwire that fails CI or a
  verification suite instead of a prohibition:
  1. **Scoring-path changes fail CI without a measurement receipt**
     (`scripts/check-scoring-receipt.mjs`, blocking step — reachability-
     aware, so unwired candidates stay free to build).
  2. **New signals follow build-unwired → measure → wire-with-receipt**
     (the established pattern: question-latency, reversal-detection,
     truth-extraction).
  3. **Surface changes must keep the browser verification suites green**
     (`smoke-p0-live-flow`, `verify-focus-traps`, `verify-p2-p3-surfaces`)
     plus the honesty gates (honesty-audit, check-docs, scene-label
     tripwire).
  4. **Demand evidence remains the highest-priority HUMAN lane, run in
     parallel** — P0 sessions are GO (see decision log) and nothing
     engineering does substitutes for them. The one prohibition that
     SURVIVES the amendment: P4-class retention/lock-in features still
     wait for a P0 PASS — building retention before demand is the exact
     failure this roadmap exists to prevent, and no tripwire can catch it
     mechanically.

**Exit gate:** >=5 documented sessions with a clear signal on the core
question. If the signal is negative or ambiguous, **STOP, reframe, and repeat
P0** — do not proceed to build on a report nobody wants to run.

### P1 — Make the score provably discriminate on real writing (the One Bet)

**Status (2026-07-29):** Partial pass. Dialogue channel SOLVED (test AUC
0.990). Structural channels at formula-layer ceiling (SHUFFLE 0.73, DROP 0.77,
RELOCATE 0.52). Pooled test AUC 0.754 — below the 0.80 gate. See
`docs/p1-benchmark/DISCRIMINATION_BASELINE_2026-07-29.md` for full results.

**Update (2026-08-21) — the four unwired signals were measured** (`109318df`;
findings in `docs/p1-benchmark/UNWIRED_SIGNALS_EVIDENCE_2026-08-21.md`). Two
structural facts came out of it: neither named corpus is reachable from a
remote session, and three of the four signals cannot be measured against the
125-film corpus's annotation schema even in principle, because they read raw
screenplay prose the annotations never carry. On the 44-script in-repo
real-prose sample: **reversal-detection** recommends WIRE, **truth-extraction**
recommends a low-risk WIRE, **question-latency**'s measurement path is retired
(all 95% CIs straddle 0.5), and **agency-signal** stays unwired pending the
761-script corpus. Wiring remains owner-gated; no scoring file changed. The P1
exit gate below is unaffected and still unmet.

**What's done:**
- Corpus expanded 48 → 761 scripts (89 original + 684 crawl, ~92% live-action).
  See `docs/p1-benchmark/CORPUS_EXPANSION_2026-07-29.md`.
- Pre-registered split (60/20/20, seed 42, hash-locked test set).
- Dialogue-diversity deduction added (reads uniqueDialogueRatio,
  meanDialogueWords, dialogueVocabRichness off analysis.records — measured
  sepAUC 1.00 on all three). DIALOGUE_FLATTEN AUC 0.54 → 0.990.
- Rule count frozen. No longer the score narrative.

**What remains (the structural gap):**
- SHUFFLE/DROP/RELOCATE at 0.73/0.77/0.52. Every formula-layer signal tested
  (climax zone, arc health, reagan fit, peak position, quartile intensity)
  either over-fires on real scripts, doesn't separate, or goes the wrong
  direction. 63% of SHUFFLE pairs are inversions (shuffled script scores higher).
- Requires analyzer-layer work: new fields in ScreenplaySceneRecord that
  capture inter-scene relationships (not just intra-scene content). The
  formula cannot detect reordering because every field is content-derived
  and preserved under scene reordering.
- Composite min-gap guard (tests/core/discrimination.test.ts) still at +2.9
  gap (needs ≥5.0) — a craft-quality gap at short-script scale, separate
  from the corpus AUC.

**Exit gate:** On a pre-registered held-out set large enough to report uncertainty:
point-estimate discrimination **AUC >= 0.80**, with the 95% bootstrap lower
bound reported and above **0.65**; shuffle-drop **>= 0.80**; act-swap
**>= 0.70**; composite min-gap guard passes; no benchmark leakage or material
regression on calibration, produced-floor, determinism, or keyless behavior.

**Decision: proceed to P2 while structural work continues.** The dialogue
channel is solved — that's real discrimination on real writing. The
structural gap is an analyzer-layer problem that doesn't block shipping a
product whose front door is dialogue-aware coverage. P2 (surface collapse)
can proceed in parallel.

### P2 — Collapse the surface to Doctor + Editor ✅

**Status (2026-07-29):** DONE. Default experience = paste/open script → report
→ per-scene fixes → export. OASIS + research panels gated behind Labs flag.

**What shipped:**
- `src/lib/feature-flags.ts`: `getLabsEnabled()` / `setLabsEnabled()` (localStorage
  `sm_labs_enabled`, default OFF).
- `src/App.tsx`: OASIS gated by `effectiveShowStoryMachine = labsEnabled && showStoryMachine`.
- `src/components/scriptide/Toolbar.tsx`: Studio/Director/Slate tool slots gated
  behind Labs; Settings entry added to overflow menu so Labs toggle is reachable
  from the default surface (not just from inside OASIS).
- `src/components/ScriptIDE.tsx`: SettingsPanel lazy-loaded as modal overlay,
  reachable from Toolbar overflow.

**Extended 2026-08-21 (W6 + E5):** the collapse went past gating. Ship got its
own writer-facing container (`src/components/scriptide/ShipPanel.tsx` —
exports, snapshots/versions, independent-verification pointer) on a `ship`
tool slot, so the research shell is reachable only through the Labs-gated
"Open Studio" overflow entry rather than sitting in the default path; and E5
added a Cmd/Ctrl+K command palette whose every action calls the same named
callback the visible button already calls. The surface claim is now
machine-checked: `scripts/verify-p2-p3-surfaces.mjs` asserts default-path vs.
Labs-only vs. dead-file reachability for every component, with the four
deliberately orphaned oasis prototypes on an explicit allowlist so the
dead-UI tripwire stays armed for anything new.

**Exit gate:** A new user reaches their first coverage report with **zero
exposure** to NVM/converge/twin/simulation jargon; time-to-first-report is
measured. — The gating is complete; time-to-first-report measurement landed
with P3's instrumentation (`first_report` → `avgTimeToFirstReportMs`).

### P3 — Ship the shareable, verifiable coverage report (the growth loop) ✅

**Status (2026-07-29):** DONE. Every exported report now publishes the claims
needed to re-attest it, an in-app surface verifies them, and the export-rate /
time-to-first-report metrics are instrumented.

**Goal:** Turn a coverage run into a branded artifact a third party can
independently verify.

**Why this before anything else:** The report is the atomic growth unit — a
screenwriter shares it with a manager, contest, or peer, and reproducibility
is the hook that makes it credible. The server-side re-run and contentHash
receipts already exist; this phase productizes them.

**What shipped:**
- `server/lib/coverage-html.ts`: a **verify block** in every exported report
  carrying the *full* 64-hex script-text hash (the footer's 12-char display
  prefix cannot anchor collision resistance), the health/verdict/totalIssues
  it claims, and three-step instructions pointing at `#verify`. Omitted
  entirely when a report has no `contentHash` — no hash, no invitation to
  "verify" something unverifiable. Still zero JS in the artifact.
- `src/components/VerifyReport.tsx` + `#verify` hash route (`src/App.tsx`) +
  a "Verify a report" entry on the start screen: a recipient pastes the
  original script text and the printed numbers, and the engine re-runs the
  deterministic analysis. Reachable **without creating a script** — the
  third party is the user here, so it lives on the entrance, not behind the
  editor, and outside the Labs gate.
- `server/routes/events.ts` + `EventBodySchema`: instrumentation sink over a
  **closed** event vocabulary (`doctor_run`, `export_report`, `first_report`,
  `verify_run`) with strict per-event props. Unknown fields, free text, and
  StoryMachine session capabilities are rejected. The sink keeps
  session-unlinked aggregate counters only; `GET
  /api/events/summary` reports `exportRate` and `avgTimeToFirstReportMs`,
  both `null` rather than `0` before any run.
- `src/lib/analytics.ts` + `ScriptDoctorPanel.tsx` wiring: fire-and-forget
  `trackDoctorRun` on *successful* diagnosis (classified sample/draft/upload
  so the one-click demo never inflates real-draft counts) and
  `trackEvent('export_report')` on a completed download. Also closes P2's
  deferred time-to-first-report measurement.

**Exit gate:** A third party can open a shared report and **independently
verify** the score; % of Doctor runs that export is measured. — **Met.**
`tests/routes/export-verify.test.ts` proves the loop end to end by scraping
the claims out of an exported artifact (never the in-process report object —
that HTML file is all a recipient ever has) and verifying them through the
real route, plus the two forgeries the mechanism exists to catch: an inflated
health figure on untouched text, and a genuine report paired with a different
script.

**Still true 2026-08-21.** The verify loop is re-checked end to end by
`scripts/verify-p2-p3-surfaces.mjs`, which scrapes the claims out of a real
exported artifact and drives `#verify` in a browser rather than trusting the
in-process report object. The privacy page E4 added (`#privacy`) is the other
half of the same trust story: what stays local, what the server holds, what
leaves, and how to delete it.

**Known limit:** counters are unauthenticated and client-reported, in-memory
and process-local, and reset on restart. They are not durable, not
deployment-wide, not authoritative P0 evidence, and not proof of unique users.
"Session-unlinked" describes this aggregate sink, not absolute anonymity:
normal HTTP/network metadata can still exist outside it. A durable store is
only worth adding once the rate itself is being acted on.

### P4 — Retention & defensibility (later; only after the score is trusted)

**Goal:** Make writers come back and make the product hard to leave.

**Why this before anything else:** It doesn't — it comes *last*. A retention
loop around an untrusted score just accelerates churn. Only once the score is
real, quiet, and shareable does revision history become valuable.

**Work:**
- Draft-history loop: "watch your score climb across revisions."
- Jump-to-line and one-click deterministic fixes.
- Auth + accounts (currently a deploy blocker per docs/AUTH.md, not yet a product gap).

**Exit gate:** Returning-user rate and multi-revision session rate are measured.

---

## 4. Freeze / kill list — cut cost that doesn't create demand

Everything below removes cost that never converted into user demand or trust.
The goal is a clearer front door for the screenwriter, not a bigger engine.

- **Freeze rule growth.** Add no entries to the current 3,217-entry generated catalog; treat the distinct rule concepts as the maintained conceptual set. Stop the 3-rules-per-wave cadence — it is permutation farming (field×mode×position) that the code's own comments call saturated. "Freeze" does not authorize deletion; removal requires a separately approved migration and dependency review.
- **Kill the OASIS multi-agent simulation engine from the default product.** It is roughly half the codebase with no user persona and no journey. Keep it as research behind a Labs flag; in the front door it only dilutes the wedge.
- **Hide most of the ~40 React panels behind Labs** (SelfPlay, ProjectionGallery, Converge, Twin, EpistemicMap, Room, Debugger, Regression, WhatIf, DirectorPanel, and the rest). They are demand-neutral cost and clarity-negative for a writer who just wants a trustworthy read on a draft.
- **Kill the "Program v2 wave" as a product driver.** The "add 3 rules + 6 tests per wave, forever" treadmill is exactly the machine that manufactured the inflation liability. Retire the cadence, not just this wave.
- **Kill research-paper intake as a roadmap spine.** Adopt mechanisms opportunistically, only when they serve a validated user need — never because a paper existed.
- **Remove or rewrite the rule-count marketing claim.** Earlier docs and the landing footer disagreed ("3,216" vs "8,917" vs "10,523"); the canonical, machine-counted figure is **3,217** (`docs/rulebook/README.md`; 3,216 until PR #257's `33a2ee48`). Lead with what's true — and note the rule channel is inverted in degradation (AUC 0.076, worse than random's 0.50), so the count is a weak pitch regardless.
- **Do not launch a broad type-cleanup of the generated permutations.** Pay down the `as any` casts (the 2026-07-14 audit measured ~1,421 in the pass files) only when touched by P1-validity work or when a separately approved catalog migration identifies the retained implementation. Do not spend demand-critical time hardening frozen code for its own sake.

Caution: nothing here is a destructive delete. "Kill" means gate behind Labs
or stop investing. Any actual rule/file removal requires dependency mapping,
a migration plan, regression evidence, and explicit confirmation.

---

## 5. Working principles (revised)

These replace the old rigor-first principles while keeping the engineering
constraints that genuinely carry weight. The shift is from "prove rigor in
isolation" to "prove value to a real writer, then harden it."

- **Demand before rigor.** Validated user need is the highest-priority signal. *(Amended 2026-08-11: the prior hard-gate framing — "no new engine work ships without a validated user need; this is a P0 gate, not a preference" — is RETIRED. Engine work proceeds in parallel with P0 evidence-gathering. See `docs/DECISION_LOG.md` Decision #2.)*
- **Correct before reproducible.** Reproducibility is earned *after* the score is shown valid on real writing. A broken ruler is perfectly reproducible; determinism is worthless if the verdict is wrong.
- **Measure discrimination on runnable, real writing — always.** Synthetic fixtures are necessary but never sufficient. A test that skips in CI proves nothing; the score must separate strong drafts from weak ones on actual screenplays.
- **One honest claim over a big number.** Lead with verifiable reproducibility receipts, not a rule count. A defensible small claim beats an impressive inflated one.
- **Preserve the real foundations.** Keyless-first boot, honest degradation (no 500s when keyless), contentHash reproducibility receipts, server-side-only LLM calls, CI-enforced no-console-in-server, rate limiting, and determinism in the verdict path are genuine assets. Keep every one.
- **Sharpen the wedge, don't broaden scope.** Every change must tie to the screenwriter persona and a concrete reason they'd care — private, instant, trustworthy, reproducible feedback on a draft.
- **Ship artifacts users can share, not features only the codebase appreciates.** A coverage report a writer sends to a collaborator beats an internal panel no one outside the repo will ever open.

---

## 6. Completed history (changelog)

| Run/Wave | Landed |
|---|---|
| Runs 1-7 (pre-merge, PR #173) | Script Doctor 14-pass platform: verdicts, calibration percentiles, root-cause clusters, coverage HTML export, draft-history deltas, live-editor squiggles, writer-in-the-loop converge, revision per-pass diffs + span locks, What-If Lab, character interview receipts, keyless analysis-only boot, opportunity-normalized health formula, doctor LRU memoization, parallel-safe passes, per-session identity, Wave Program v2 launch (Wave 1182), CI console/keyless enforcement |
| Run 8 — Blindspot patches | Formula-version history on stored scores, PDF-route DoS limiter, session-id log hygiene, PR body refresh |
| Run 9 — Architecture truth & structure | `ARCHITECTURE.md` rewritten around deterministic-core/generative-shell; record-parity harness (ops vs. text producers of `ScreenplaySceneRecord`); `nvm.ts` split into 8 modules; frontend code-split (`StoryMachine` chunk -81%) |
| Run 10 — Deep-read sensing layer | LLM-per-scene annotation into the same deterministic signal schema; scene-hash cache reuse; keyless fallback to lexicon signals; opt-in toggle; `aiLimiter`-gated route; prompt-injection hardening |
| Run 11 — Fix-and-verify loop | Span-scoped hardened rewrite + whole-document delta receipt (dual contentHashes); accept/discard panel |
| Run 12 — Wave cycles 1-2 (waves 1183-1190) | 24 rules/detectors, 2 signal channels (power balance, speaking-character count), 6 genre variants, 6 root-cause templates; wave-health gate established as standing practice (measure fire-rate + band separation every cycle) |
| Run 13 — Keyless deterministic simulation | Template `takeTurn` fallback (goals/pressure, no LLM), rule-based `witnessed -> belief` epistemics keyless |
| Run 14 — Producer tier | Slate triage JSON+HTML, breakdown CSV, pitch-kit SVG/HTML |
| Run 15 — Trust & publishing | Rulebook extraction (3,196 rules) + staleness test, `CALIBRATION.md`, verify endpoint |
| Run 16 — Deployment hardening | Session TTL/eviction, `TRUST_PROXY` opt-in, `docs/AUTH.md` trust model, README deployment/backup section, Dockerfile keyless-boot fix |
| Run 17 — Function-first (B/C/D; A cancelled) | All 14 StoryOp kinds render in compiler; clue-lifecycle content-word channel (11/20 corpus fires); squiggle-to-fix-with-AI bridge. Run 18 alpha/beta/gamma: dialogue blind spots, dimension-collapse fix, discrimination harness in CI |
| W-wave (deployment gate) | Health-formula sensitivity (piecewise density curve); action-verb export rendering; report duplicate-family merge + 4 doc-mode root-cause templates; 26 validation schemas |
| Sim + producer wave | Action vocabulary 5->15 (HIDE/OBSERVE/LISTEN/SEARCH/REVEAL/THREATEN/BETRAY/PROTECT/FORM_ALLIANCE/FLEE); pitch-kit + Untitled-export fix |
| D2-wave | Discrimination false-positive reduction (consequence-lands-downstream, present-but-compact != absent, subtext-aware movement guards); inversion fixed, composite gap opened from dead-tie to +2.2 |
| I-wave 1 (Standing Directive 2) | Wired all dangling consumer chains: tone persistence, cascade/trinity keyless fallback, metrics-to-report, projection targets to gallery, betrayal/power/irony record fields both paths |
| B-wave 1 | 28 genres + 16 tones + genre rules; 6 sin detectors; metrics module; 6 projection targets; 22 structures/10 curves/12 arc modes/28 styles; defense cascade + trinity |
| PRs #187-#190 (corpus/score-trust era) | 69-script ground-truth corpus landed (found + fixed ORPHAN_CLUE and TRIADIC/CONSECUTIVE flood bugs); structural-degradation AUC made executable (SCENE_CONTINUITY_COLLAPSE); bad-band AUC baseline |
| PR #193-#194 | AUC-conversion (deduction re-tune); first live-action corpus entries (Pulp Fiction, Jaws) |
| PR #195-#196 | Structure AUC gate widening with location-run corroboration axis; GLOBAL_ARC_INCOHERENCE (first act-swap-aware structural detector) |
| PR #197 | Tier-1 rule wave: COINCIDENCE_RESOLVES_PROBLEM, RELATIONSHIP_REPAIR_UNEARNED, REINCORPORATION_VOID, CLIMAX_NO_AFTERMATH |
| PR #198 | E2E keyless journey harness (7 journeys) + silent Stage.ts FK bug fix |
| PR #199 | Final Draft-style IDE typing (autocomplete, auto-uppercase, smart Enter); centered screenplay page with live formatting |
| PR #200 | Security: gate AI provider config writes behind `ADMIN_TOKEN`; IDE `exportFountain` title-page state fix; `requireString` throws `ValidationError` not a masked 500 |
| Master research audit (2026-07-10) | ~130-file research folder read cover to cover; 68 superseded files archived; 3-tier incorporation queue filed (`docs/research-audit/MASTER_RESEARCH_AUDIT.md`) |
| S-wave (2026-07-10) | Pre-deployment security audit BLOCKERS closed: SEC-1 (SSRF guard + /metrics auth), SEC-2 (O(n²) analyzer DoS via ANALYZER_SCENE_CEILING + defense-in-depth), OPS-1 (crash handlers), OPS-2 (/metrics gate). SHOULD items: CSV injection guard, non-root container, production CSP. Tests: ingress-security 28/28, analyzer-dos 11/11, hardening 16/16 |
| Engine + substrate wave (2026-07-12, commit 700fb5d) | Arc-incoherence deduction (act-swap AUC 0.48→0.62); emotional-arc + 8 diagnostic signals (anti-slop, theme, interiority, mirror-scenes, silence, bonding, cold-open, pattern-establishment); substrate spine (NarrativeState, Truth Ledger); detector modules (value-shift, story-spine, scene-economy); fountain import normalizer; paper-ink-stamp design system |
| Wave 1191 (bulk expansion) | Earlier prose claimed "5,701 template-generated rules (rule count 3,216 → 8,917)" here. **The 2026-07-14 audit (`PHASE_2_REPOSITORY_RECONSTRUCTION.md` R2-C01) showed this never happened as described**: the live catalog was always 3,216; commit a68a425 ("Wave 1191") added 6 named detectors across 2 passes, not 5,701. The wave cadence itself is retired — see §1, §4. |
| Change-impact surface (commit 9f538e5) | Deterministic scene-dependency analysis surface |
| Phase W — make it truly work (2026-08-21) | Doctor moved onto a `node:worker_threads` pool with coordinator-side LRU, abort-terminate cancellation, and an in-process fallback; `auditTemporalConsistency`'s O(n³) path-consistency re-expressed over bit-packed typed arrays (351 scenes: never-returned → ~1.9s), proven output-identical across 45 fixtures; `ANALYZER_SCENE_CEILING` 1000 → 400; false "Save Conflict" root-caused to the visibilitychange keepalive save; coverage → full-report hydration instead of cold remount; Ship given its own writer-facing panel |
| Phase E — controllable and interactive (2026-08-21) | SSE doctor stream with per-pass progress and a real Cancel; `locatedIssues` + jump-to-line + re-run + session findings delta; entrance promise/privacy/CTA hierarchy; IndexedDB draft mirror, `POST /api/session/delete`, and the `#privacy` page; Cmd/Ctrl+K command palette plus an a11y sweep (focus traps, ARIA roles, label association) |
| Phase S — ship and keep alive, code lanes (2026-08-21) | `BACKUP_INTERVAL_HOURS` in-process backup timer and a real restore path (`restoreSession()` / `npm run restore-session`) proven by a backup→destroy→restore drill; RELIABILITY §IV-C re-verified (CON-003 found still-present and fixed via `Orchestrator.syncFromStage()`); global `MAX_ROOMS` cap; concurrent doctor load test; version cut to `1.0.0-rc.1` with the first published GHCR image |
| P-1 evidence (2026-08-21) | The four unwired signals measured on the 44-script in-repo real-prose sample: reversal-detection and truth-extraction recommend WIRE, question-latency's measurement path retired, agency-signal blocked on the 761-script corpus. No scoring file changed; wiring stays owner-gated |

---

## 7. Pre-deployment audit (2026-07-10) — re-verification record

Two read-only audits (ops + security) found BLOCKERS. The following status
records the current re-verification rather than treating the original findings
as permanently open:

- **SEC-1**: **CLOSED / re-verified.** `AiConfigSchema` rejects unsafe
  `baseUrl` values at the configuration boundary; config writes are protected
  by the admin write gate; and the OpenAI-compatible fetch path re-validates
  every redirect and resolves-and-pins DNS targets before connecting. The
  route and adapter tests cover private/metadata targets, redirects, and DNS
  rebinding (`tests/routes/ai-config-live-path.test.ts`,
  `tests/core/openai-compat-redirect.test.ts`). **Separate future concern:**
  provider configuration remains process-global and is protected by the
  operator-facing admin/loopback write gate; it is not writer session state or
  a multi-tenant configuration model. Any hosted multi-tenant release needs
  authenticated, tenant-scoped provider ownership and credentials, not merely
  this SSRF control.
- **SEC-2**: O(n^2) analyzer DoS — `overlapClusters` / `detectQuestionLatency` / `computeContentWordClueClusters` unbounded; `DoctorBodySchema` caps bytes, not scene count. (`cluster.ts:591`, `fountain-analyzer.ts:1118`/`1314`) — mitigated via `ANALYZER_SCENE_CEILING` in S-wave; confirm coverage.
- **OPS-1 / OPS-2**: crash handlers + `/metrics` gate — closed in S-wave; confirm still present.

SHOULD items (verify): CSV formula injection (`breakdown.ts:644`), collab
token no room-ownership (`collab.ts:12`), run-room limiter tier mismatch
(`game.ts:245`), no prod CSP (`app.ts:97`), container runs root. NICE: 4
transitive dev-dep CVEs (`npm audit fix`). Clean at last audit: session
capability model, HTML export escaping, prompt-injection boundary, secrets
never in bundle/logs, body/rate limits.

Security work is **not** gated behind the §3 phases — a live deployment
blocker is fixed when found, regardless of the active product phase.

---

## 8. Filed backlog (NOT scheduled — do not pull forward without re-sequencing)

The prior roadmap's entire open-work spine (wave program, OWNE O1-O5, STORY
GOD SG1-SG6, MASTER_RESEARCH_AUDIT 3-tier queue, TRACE/MAESTRO-S research
intake, D/R/B-wave remnants, corpus growth to 150+, deep-read arc signals)
lives here as a filed backlog. It is real engineering, much of it good — but
it is downstream of §3. **None of it is progress until the active phase's
exit gate is met.**

Canonical sources for the filed items, unchanged:
- `docs/research-audit/MASTER_RESEARCH_AUDIT.md` — the 3-tier incorporation queue.
- `docs/research-audit/RESEARCH_INTEGRATION_2026-07-11.md` — TRACE / MAESTRO-S / ref-engine adopt/defer/reject map. **Note:** its item #1 (Change-Impact surface) and #4 (real-literary calibration band) are the two filed items most aligned with §3's P1/P3 — pull those forward first if any backlog item is scheduled.
- `docs/research-audit/RESEARCH_INTAKE_2026-07-11B_EMOTIONAL_RNE.md` — emotional-arc / anti-slop / abstention waves (EA landed; AS + ABST filed).
- `docs/owne/TRUTH_REGISTRY.md` — OWNE promise-template + STORY GOD specs.

Deferred/rejected items (do not re-litigate — reasons in the companion docs):
autonomous full-script generation as the wedge, permanent multi-agent swarm,
graph DB / MAP-Elites / RL at launch, LLM-as-judge scoring, TS-SF-as-gate,
any citation from the fabricated-source "Ernie" lineage.
