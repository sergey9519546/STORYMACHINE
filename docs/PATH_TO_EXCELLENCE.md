# Path to Excellence — from working checkout to better-than-the-best

**State as of 2026-08-14, main @ 4488218.** Successor to `PATH_TO_DONE.md`'s
task framing: that file tracks ROADMAP phases; this one sequences everything
measured by the three 2026-08-14 audits (UX-in-browser, engine-truth,
ship-vehicle) into the shortest honest path to a product that is *truly
working, easily controllable, interactive, and well designed* — not finished
to be finished. `ROADMAP.md` stays canonical on phase semantics.

**The bar.** Against Final Draft / Highland / Arc Studio / WriterDuet /
coverage services, this product already has three genuine differentiators no
competitor offers: **independently re-verifiable coverage reports** (a
skeptical recipient can re-derive the numbers), **correct client-side
exports in under 500ms** (validated PDF/FDX/DOCX/Fountain), and a
**keyless-first privacy posture** (deterministic analysis with no AI key and
no script text leaving the deployment). "Better than the best" means
protecting those three while fixing what the audits measured below.

---

## Phase T — Trust repair (days; some items are the owner's clicks)

The engine's credibility mechanism was defeated this week: a fabricated
measurement receipt (nonexistent SHA, self-admitted "simulated" run) entered
main via the 2026-08-11 integration merge and laundered the GODMODE
health-formula change past the receipt guard. The correction entry is
recorded (`MEASUREMENT_RECEIPTS.md`, 2026-08-14); these discharge it:

- **T1 (owner machine).** Run `npm run discharge-obligations` (or
  `measure-real`) against the local corpus and record a REAL receipt for
  `0e148c3`'s `graphDeduction` — up to 15 points off every script's health,
  currently unvalidated. Then either restore `COMPOSITE_MIN_GAP` to 5.0 or
  receipt the 4.0 with the measured justification. If the measurement says
  the deduction hurts discrimination, unwire it — the unwired-first pattern
  exists for exactly this.
- **T2 (owner clicks).** Repository is **public** (`"private": false`,
  verified live) despite the 2026-08-03 decision to make it private — for a
  product inviting unpublished scripts, flip it. Enable branch protection on
  `main` (currently none — the fabricated receipt arrived via an unreviewed
  integration merge; protection is the structural fix). Confirm the
  Dependency-graph toggle (CI evidence says on since 08-10).
- **T3 (decision).** PR #257 (`INVERSE_CHEKHOV_GUN`, 3,216 → 3,217): merge
  with a one-line recorded freeze amendment, or close. Its receipt is the
  good pattern — the conflict is only with the freeze language. Delete the
  two stale remote branches at main's SHA.

## Phase W — Make it truly work (1–2 weeks)

Five defects an ordinary first-time user hits in their first five minutes,
all reproduced and screenshotted in the 2026-08-14 UX audit:

- **W1 (M) — DONE 2026-08-21.** `runScriptDoctor` now runs on a
  `node:worker_threads` pool (`server/nvm/analyze/doctor-pool.ts`, size 1–2,
  FIFO queue) with the LRU cache held on the coordinator, AbortSignal
  cancellation that terminates the worker outright, and a permanent
  in-process fallback if workers cannot run in the environment.
  `ANALYZER_SCENE_CEILING` lowered 1000 → 400 (honest headroom above the
  292-scene longest real feature; the existing truncation messaging already
  covers it).
- **W2 (L) — DONE 2026-08-21.** The super-quadratic cost was **not** in the
  named suspects. Profiling put 99.7% of it in one place none of them named:
  `auditTemporalConsistency`'s Allen-algebra path-consistency propagation
  (158ms / 7.5s / 43.4s at 26 / 62 / 120 scenes), where each of the O(n³)
  triples allocated three `Array.from` snapshots and a fresh `Set`. Re-expressed
  over bit-packed typed arrays with a universal-relation fast path; measured
  end-to-end doctor runtime 26→119ms, 62→206ms, 120→386ms, 244→1.2s,
  306→1.7s, 351→1.9s (was: never returned). Proven pure by
  `scripts/check-doctor-output-identity.mjs` — 45/45 fixtures byte-identical
  pre/post — plus a verbatim-oracle equivalence test over 200 seeded graphs.
  Budget-tested in CI by `tests/core/doctor-perf-budget.test.ts`.
- **W3 (M).** Fix the false "Save Conflict" dialog — deterministic 3/3 on
  paste → save → reload, single tab, blaming a tab that doesn't exist. A
  save system that cries wolf teaches writers to distrust it.
- **W4 (M).** "Full report" must receive the already-computed report —
  today it cold-remounts `ScriptDoctorPanel` and throws away the analysis
  the user just watched run (which compounds with W1/W2 on big scripts).
- **W5 (S).** Settings modal rendering: provider cards below the first
  bleed editor text through; labels collide. This is the screen where a
  user decides whether to trust you with an API key. Plus the mobile
  375px CTA badge overlap.
- **W6 (M).** The Ship tab — a primary non-Labs tab — opens the research
  console (PRODUCTION/ANALYSIS/ENGINE/CODEX chrome, truncated off-screen)
  to show a snapshots list. Give Ship a writer-facing container; research
  chrome becomes Labs-only. This is the last P2 surface leak, and it's on
  the most load-bearing tab.

**Exit gate:** re-run the audit's journey table in a real browser; zero
"failing" rows; a feature-length script analyzes with the server responsive
throughout.

## Phase E — Easily controllable and interactive (2–3 weeks)

- **E1.** Live analysis progress: stream per-pass progress with a real
  cancel (the between-turn cancellation pattern already proven in the
  engine applies here), so even long runs feel owned by the writer.
- **E2.** Finding ↔ editor round-trip as the core loop: click a finding →
  land on the exact lines → fix → one-keystroke re-run → watch the finding
  clear. The staleness banner already works; make the loop feel like a
  conversation.
- **E3.** First-run: a stranger must understand the promise in 10 seconds —
  one line of what it does, the sample CTA, and the one-sentence privacy
  claim (drafted in the ops audit) visible before any commitment.
- **E4.** Local-first safety net: IndexedDB autosave independent of the
  server, a visible "delete everything" control, and the honest privacy
  page. Server persistence (per-session SQLite) already survives restarts;
  the browser side deserves the same durability.
- **E5.** Keyboard map + command palette; a11y sweep building on the
  already-good focus rings.

**Exit gate:** a design-quality pass judged against the named competitors —
every journey "excellent," none merely "adequate."

## Phase P — Provably better (parallel track; includes the human-only work)

- **P-1.** Wire-or-retire the four unwired signals (agency-signal,
  question-latency, reversal-detection, truth-extraction) by measuring each
  against the 125-film annotated corpus — the corpus growth makes this
  newly possible; the stress-ledger calibration already proved the method.
  Each ends in a receipt: wired with evidence, or honestly retired.
- **P-2.** The rule-catalog decision: run retirement evidence bar B1–B7
  (channel-zero AUC on the real corpus). The project's own rebuild
  experiment measured the weighted-rule channel as inverted; two weeks
  later the question is still open. Settle it.
- **P-3.** The CLIMAX_RELOCATE wall: the one sanctioned next experiment is
  noun-type-aware novelty (proper vs. relational/anaphoric reference),
  reproduced from committed source against the real corpus — the prior
  result is marked unreproducible-historical and must not be cited until
  re-derived.
- **P-4 (human-only).** Five real P0 sessions via the fielding kit and
  async portal — recruitment and moderation cannot be delegated. Record
  the outcome PASS/STOP honestly, whatever it is.
- **P-5 (human-only).** ≥3 blind readers for the P1 label set.

**Exit gate:** pooled discrimination AUC ≥ 0.80 on the held-out partition
with reported uncertainty — or a recorded, reasoned amendment of the gate.
No silent drift.

## Phase S — Ship it and keep it alive (1 week)

From the ops audit — the Docker vehicle is already well-built; finish it:
scheduled backups wired into the deployment (tooling exists, cadence
doesn't); re-verify `RELIABILITY.md`'s open concurrency defects against
current main; add the missing global room cap; set
`ADMIN_TOKEN`/`TRUST_PROXY`/`METRICS_TOKEN` in the real environment;
exercise the backup → restore loop once end-to-end; one load test of N
concurrent feature-length analyses (meaningful only after W1/W2); cut the
first real tagged release through `release.yml`.

**Exit gate:** the stranger-week test — one pilot writer uses a hosted
instance for a week and loses nothing.

## Definition of 1.0

A stranger lands, understands the promise in ten seconds, pastes a
feature-length draft, watches analysis stream in seconds with a working
cancel, moves finding-by-finding through their script, exports a correct
PDF/FDX, hands the report to a skeptic who verifies it independently — and
every number in that report is backed by a receipt trail with zero
fabricated entries. The three differentiators stay true in marketing copy
because they stay true in the code.

**Sequencing note:** T and W first and in parallel (T is mostly clicks and
one measurement; W is the product), E on W's heels, P runs alongside
throughout (its human items have no code dependency), S last. Nothing in E
or S is worth doing before W1/W2 — polish on top of a server that freezes
for 22 minutes is decoration.
