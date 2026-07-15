# STORYMACHINE — Roadmap

Durable master plan. Any session with fresh context (no memory of prior work)
should be able to read this file top to bottom and resume exactly where the
project stands — what shipped, what's mid-flight, and what's next, in order.

**This roadmap was re-spined on 2026-07-14 around demand, not rigor.** The
prior version was organized around the wave program (3 rules/wave forever),
research-paper intake, and corpus growth. A product teardown found those were
the wrong priorities: they manufactured an inflated rule count that, by the
engine's own measurements, barely moves the score — while no real user had
ever been shown the product. The old engineering spine is preserved below as
history and as a filed backlog (§8), but it no longer drives sequencing. The
new spine is §3: validate with writers → make the score provably discriminate
→ collapse scope → ship a shareable artifact → then defensibility.

Ground yourself before touching code: `NORTH_STAR.md` (constitution),
`ULTRAPLAN.md` (short execution brief), `ARCHITECTURE.md` (system map),
`CLAUDE.md` (working constraints), and `git log --oneline -40` for the
session's commit trail. These documents were reconciled to this roadmap on
2026-07-14: the roadmap sets sequence, NORTH_STAR sets product laws,
ULTRAPLAN summarizes the active phase, and CLAUDE sets implementation
constraints.

---

## 1. Current state — the honest version (measured, 2026-07-14)

StoryMachine is a beautifully engineered answer to a question nobody has
confirmed anyone is asking. The deterministic core is real and well-built —
keyless boot, reproducible hashing, honest degradation. But the headline
pitch (8,917 deterministic rules scoring your screenplay) is inflated at the
source and, by the doctor's own measurements, the rules barely move the
score. We have zero evidence of real users, and the score has never been
validated against a human quality judgment on a real, non-synthetic
screenplay.

### What actually works
- Keyless-first boot with honest degradation — no 500s when running without an LLM key.
- `contentHash` reproducibility: identical input yields identical output, and coverage export re-runs server-side for authenticity.
- The health score (`server/nvm/analyze/doctor.ts`) is fully deterministic and LLM-free. This part of the pitch is true.
- Security/CI posture: rate limiting, server-side-only LLM calls, CI-enforced no-console and keyless test guarantees.
- The emotional-arc signal (`server/nvm/analyze/emotional-arc.ts`, 12,142-word VAD lexicon, Reagan-2016 fitting) landed cleanly as a diagnostic field.

### What's broken or overstated
- **Rule count is inflated.** The claimed 8,917 rules include ~5,701 generated in one bulk wave (Wave 1191) from just 7 template functions in `server/nvm/revision/passes/lib/checks.ts` (aftermath-void, drought-run, zone-cluster, co-occurrence, half-loaded, zone-imbalance, peak-uncaused) as field×mode×position permutations. The rulebook's own table: 6,610 "Unattributed," 9 "Founding," 22 "meaningful." Genuinely distinct hand-authored checks: ~2,300. The passes are ~47,500 lines with 1,326 `as any` casts.
- **The score doesn't discriminate — by its own numbers.** Comments in `doctor.ts:1656-1669` record: scene-count scarcity term AUC 0.938, the entire weighted-rule channel AUC 0.076, and with scene count held constant "the doctor cannot detect reordering at all (AUC ~0.48)." Scene count + raw issue density dominate; the 8,917 rules barely register.
- **Evidence base is synthetic and largely unrunnable.** Only 6 synthetic discrimination pairs (`tests/core/discrimination.test.ts`) — 2 pass by only +1.4, the composite pair FAILS the 5.0 min-gap guard (still a todo), 3 were tied until a curve was retuned. Calibration corpus = 20 synthetic samples. The "72 produced scripts" real corpus is not in the repo; `tests/core/real-script-corpus.test.ts` SKIPS every assertion without `REAL_SCRIPT_CORPUS_DIR` (0 files locally, never runs), the manifest is actually 71 RECOMMEND + 1 CONSIDER, and the check is a floor-check (health>=80), not discrimination. Degradation AUCs are near coin-flip: shuffle-drop ~0.652, act-swap 0.48→0.62.
- **Marketing number is internally inconsistent.** Landing footer says "3,216 deterministic rules," docs say 8,917, a stale plan file says 10,523.
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
  pull `main` and check `git log` for overlapping work before starting.
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

These phases are **strictly ordered**. Do not parallelize them — the ordering
*is* the strategy. Each phase ends with a hard exit gate that must be met
before the next begins, because every downstream promise (private, instant,
deterministic, reproducible coverage) rests on the score being provably real,
and by our own numbers it isn't yet. We build demand-out, not rigor-first.

### P0 — Validate with real writers (this week; blocks everything)

**Goal:** Confirm that a screenwriter, shown the existing sample coverage
report, actually wants to run their own draft.

**Why this before anything else:** Our sharpest persona is a screenwriter
seeking objective, private feedback before paying a reader. If the current
report doesn't create that pull, no amount of AUC fixes matters — we'd be
optimizing rigor in isolation from a user again, which is exactly the mistake
that got us here.

**Operational artifacts:** [P0 evidence summary](docs/user-validation/P0_EVIDENCE_SUMMARY.md) · [phase tracker](docs/user-validation/PHASE_TRACKER.md)

**Work:**
- Recruit >=5 real screenwriters (any career tier, real drafts in hand).
- Show them the existing sample coverage report; watch, don't pitch.
- Capture the single core question: *does this make you want to run your own draft — why or why not?*
- Log objections, moments of trust, and moments of disbelief verbatim.
- Write zero new product or engine code until the P0 exit gate clears. Critical security fixes are the only exception.

**Exit gate:** >=5 documented sessions with a clear signal on the core
question. If the signal is negative or ambiguous, **STOP, reframe, and repeat
P0** — do not proceed to build on a report nobody wants to run.

### P1 — Make the score provably discriminate on real writing (the One Bet)

**Goal:** A runnable test proving the score separates strong from weak *real*
writing, not synthetic pairs.

**Why this before anything else:** The screenwriter wants feedback they can
trust. Today there is no runnable discrimination test on real writing — the
72-script corpus text isn't in the repo and its test skips locally.
Rule-channel AUC is 0.076; the score currently leans on scene-count scarcity
(AUC 0.938). We must make the score real before we make it shareable.

**Work:**
- Build a legally distributable benchmark from **real drafts**: Creative-Commons/public-domain screenplay material where available, plus author-contributed drafts licensed explicitly for testing. Do not substitute newly written synthetic "bad" scripts.
- Establish the target with blinded pairwise judgments from >=3 independent experienced readers; measure inter-rater agreement and preserve disagreements rather than forcing false ground truth.
- Pre-register the benchmark split, score metrics, and gates before changing formula constants. Keep a held-out set the implementer cannot tune against; version and hash every fixture and label artifact.
- Measure each score component independently, then rebuild around the smallest set of signals that shows held-out separation. Do not assume the answer is 5–10 signals if the evidence says otherwise.
- Fold in the emotional-arc signal only if it improves held-out doctor-level discrimination (its standalone act-swap AUC is ~0.647).
- **Freeze the rule count.** Stop leading with rule count in the score narrative.

**Exit gate:** On a pre-registered held-out set large enough to report uncertainty:
point-estimate discrimination **AUC >= 0.80**, with the 95% bootstrap lower
bound reported and above **0.65**; shuffle-drop **>= 0.80**; act-swap
**>= 0.70**; composite min-gap guard passes; no benchmark leakage or material
regression on calibration, produced-floor, determinism, or keyless behavior.

### P2 — Collapse the surface to Doctor + Editor

**Goal:** Default experience = paste/open script → report → per-scene fixes →
export. Nothing else visible.

**Why this before anything else:** A screenwriter who just learned to trust
the score will bounce if greeted by ~40 panels and simulation jargon. The
surface must match the one job they came for.

**Work:**
- Gate OASIS and the ~38 research panels behind a single **"Labs"** flag.
- Make Doctor + Editor the default and only first-run surface.
- Keep StartScreen's script-first "Try the sample script" flow as the entry point.
- Strip NVM/converge/twin/simulation vocabulary from the default path.

**Exit gate:** A new user reaches their first coverage report with **zero
exposure** to NVM/converge/twin/simulation jargon; time-to-first-report is
measured.

### P3 — Ship the shareable, verifiable coverage report (the growth loop)

**Goal:** Turn a coverage run into a branded artifact a third party can
independently verify.

**Why this before anything else:** The report is the atomic growth unit — a
screenwriter shares it with a manager, contest, or peer, and reproducibility
is the hook that makes it credible. The server-side re-run and contentHash
receipts already exist; this phase productizes them.

**Work:**
- Produce a branded, presentable PDF/HTML artifact: verdict + 5 craft dimensions + top 5 fixes.
- Add a **"verify this report"** link that re-derives the score from contentHash.
- Ensure export re-runs server-side for authenticity (already does).
- Instrument sharing.

**Exit gate:** A third party can open a shared report and **independently
verify** the score; % of Doctor runs that export is measured.

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

- **Freeze rule growth.** Add no entries to the current 8,917-entry generated catalog; treat ~2,300 distinct rule concepts as the maintained conceptual set. Stop the 3-rules-per-wave cadence — it is permutation farming (field×mode×position) that the code's own comments call saturated. "Freeze" does not authorize deletion; removal requires a separately approved migration and dependency review.
- **Kill the OASIS multi-agent simulation engine from the default product.** It is roughly half the codebase with no user persona and no journey. Keep it as research behind a Labs flag; in the front door it only dilutes the wedge.
- **Hide most of the ~40 React panels behind Labs** (SelfPlay, ProjectionGallery, Converge, Twin, EpistemicMap, Room, Debugger, Regression, WhatIf, DirectorPanel, and the rest). They are demand-neutral cost and clarity-negative for a writer who just wants a trustworthy read on a draft.
- **Kill the "Program v2 wave" as a product driver.** The "add 3 rules + 6 tests per wave, forever" treadmill is exactly the machine that manufactured the inflation liability. Retire the cadence, not just this wave.
- **Kill research-paper intake as a roadmap spine.** Adopt mechanisms opportunistically, only when they serve a validated user need — never because a paper existed.
- **Remove or rewrite the "3,216 / 8,917 rules" marketing claim.** It is inconsistent across the landing page, docs, and stale plans, and it actively undermines trust because the rule channel barely moves the score (AUC 0.076 vs 0.938 for scene-count scarcity). Lead with what's true.
- **Do not launch a broad type-cleanup of the generated permutations.** Pay down the 1,326 `as any` casts only when touched by P1-validity work or when a separately approved catalog migration identifies the retained implementation. Do not spend demand-critical time hardening frozen code for its own sake.

Caution: nothing here is a destructive delete. "Kill" means gate behind Labs
or stop investing. Any actual rule/file removal requires dependency mapping,
a migration plan, regression evidence, and explicit confirmation.

---

## 5. Working principles (revised)

These replace the old rigor-first principles while keeping the engineering
constraints that genuinely carry weight. The shift is from "prove rigor in
isolation" to "prove value to a real writer, then harden it."

- **Demand before rigor.** No new engine work ships without a validated user need. This is a P0 gate, not a preference.
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
| Wave 1191 (bulk expansion) | 5,701 template-generated rules across all 14 passes (rule count 3,216 → 8,917). **Flagged 2026-07-14 as inflation** — see §1, §4; this wave is the last of the wave cadence, which is now retired. |
| Change-impact surface (commit 9f538e5) | Deterministic scene-dependency analysis surface |

---

## 7. Pre-deployment audit (2026-07-10) — open security items

Verify against current code before assuming any are stale. Two read-only
audits (ops + security) found BLOCKERS; most were closed in S-wave (see
changelog), but re-verify these specifically:

- **SEC-1**: `/api/ai-config` SSRF + unauthenticated GLOBAL provider hijack — `baseUrl` has no host/scheme allowlist; config is process-global; `/test` fires the request. (`validation.ts:143`, `ai-config.ts:55`, `openai-compat.ts:75`) — PARTIALLY ADDRESSED by PR #200's `ADMIN_TOKEN` gate on config writes; re-verify the SSRF allowlist specifically is still open.
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
