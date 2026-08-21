# Path to Excellence — from working checkout to better-than-the-best

**State as of 2026-08-21, main @ a541460: Phases W and E are COMPLETE and
Phase S's code lanes are DONE** — all six W lanes, all five E lanes, the
judged E exit gate (met after one honest NOT-MET round), S1–S3 landed, and
the first release (`1.0.0-rc.1`, Docker image published via the Release
workflow). What remains is genuinely human-side: Phase S's owner
deployment items and stranger-week pilot, Phase P's measurement lanes, and
Phase T's owner-machine items. Successor to `PATH_TO_DONE.md`'s
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
- **W3 (M) — DONE 2026-08-21.** The false "Save Conflict" traced to the
  `visibilitychange` keepalive save: the POST persists server-side but its
  ack dies with the reloading page, so the next load sees dirty +
  revision-mismatch and blames a phantom tab. `decideScriptIDERestore` now
  compares draft content against the server copy and returns a new
  `reconciled` outcome when they match; the dialog only fires on a real
  divergence, and its copy no longer invents a second tab. Browser-repro
  suite: 3/3 pre-fix reproductions, 0 post-fix.
- **W4 (M) — DONE 2026-08-21.** `CoverageSummary` hands its computed report
  up via `onReportComputed`; "Full report" hydrates `ScriptDoctorPanel`
  through `initialReport` (instrumentation preserved) instead of
  cold-remounting. Staleness still tracks the draft generation, so a
  hydrated report that's out of date says so.
- **W5 (S) — DONE 2026-08-21.** Settings dialog wore `sm-btn` (a button
  primitive) instead of `sm-panel` — one-class fix ends the bleed-through
  and label collisions. The 375px CTA badge became a self-contained
  cream-on-stamp ribbon clear of the caption row (it had been stamp-red on
  stamp-red: invisible at every viewport).
- **W6 (M) — DONE 2026-08-21.** Ship got its own writer-facing container
  (`ShipPanel.tsx`: exports, snapshots/versions, independent-verification
  pointer) on a new `ship` tool slot; the research shell survives untouched
  but is reachable only through the Labs-gated "Open Studio" overflow entry.
  `verify-p2-p3-surfaces.mjs` grew 7 assertions pinning this (108/108), and
  the four deliberately orphaned oasis prototypes moved to an explicit
  allowlist so the dead-file tripwire stays armed for new leaks. Known
  tradeoff, recorded in `SURFACE_REVALIDATION_2026-08-04.md`'s 08-21
  addendum: the Title Page form is now Labs-only; the keyless route is
  Fountain title-page syntax at the top of the draft.

**Exit gate — MET 2026-08-21:** journey table re-run in a real browser
(W3/W4 repro suite 11/11 including pre-fix reproduction of all six original
failures; surface verification 108/108; smoke flow PASS with captured exit
codes); the 306-scene synthetic analyzes in ~1.4s end-to-end with the
server responsive throughout (worker pool + 470× curve fix, output proven
byte-identical across 45 fixtures). Landed as `a86756f` + `40ce647`
(W3–W6) and `9c0c992` + `f416336` (W1/W2 + a ceiling-tracking test
fixture). Remaining Phase W-adjacent debt is listed under Phase T, not
here: the GODMODE `graphDeduction` measurement is still owed on the owner's
machine.

## Phase E — Easily controllable and interactive (2–3 weeks)

- **E1 — DONE 2026-08-21.** `POST /api/scriptide/doctor/stream`: SSE
  sibling of `/doctor` (same schema, limiter, worker pool, report shape)
  emitting per-stage and per-pass progress frames; `ScriptDoctorPanel`
  shows "Running pass N of 14…" with a real Cancel that reaches the
  existing res-close → AbortSignal → worker-terminate path — no new
  cancellation mechanism. Progress hooks are purely observational: proven
  byte-identical across all 45 fixtures (receipt recorded in
  `MEASUREMENT_RECEIPTS.md`, independently re-verified before merge).
  Browser-proofed: cancel cleared in 118ms with the server immediately
  serving the next run. Deep-read/PDF routes deliberately kept one-shot.
- **E2 — DONE 2026-08-21.** `locatedIssues` now rides every doctor
  response (reusing the `locateIssues()` call the routes already made —
  zero new computation); finding cards get a Jump button →
  `FountainEditor.highlightRange` scrolls and paints a fading stamp-red
  wash on the exact lines; Cmd/Ctrl+Enter re-runs via the E1 streaming
  path; a session-only "N findings cleared · M new" delta line
  (identity = pass::rule::location, its line-number-drift noisiness
  documented in-code as an accepted limitation). Browser-proofed
  end-to-end on a real finding: jump → edit → re-run → cleared.
- **E3 — DONE 2026-08-21.** Entrance promise line ("Reads your screenplay
  like a studio coverage reader…"), privacy sentence ("Keyless by default —
  your script stays in this deployment unless you turn on AI features
  yourself" — worded to be true for visitors, since keys are opt-in via
  Settings, not operator-only), CTA hierarchy preserved; all three visible
  without scrolling at 1440px and 375px. Fixed a real pre-existing bug en
  route: the CTA description inherited `.sm-btn`'s `white-space: nowrap`
  and spilled past the button edge at every viewport.
- **E4 — DONE 2026-08-21.** IndexedDB draft mirror
  (`scriptide-idb-store.ts`, never-rejecting, wins on restore only when
  strictly newer than localStorage — the quota-failure recovery case,
  routed through a new `decideScriptIDELocalRestore` sibling rather than a
  change to the W3 logic); Delete Everything in Settings → Session,
  confirm-gated, wiping IndexedDB + localStorage and calling the new
  `POST /api/session/delete` (the existing `destroySession()` primitive:
  Stage eviction + SQLite file unlink, caller's own session only); the
  `#privacy` page stating what stays in the browser, what the server
  stores, what leaves (nothing by default, live-checked), and how to
  delete — every sentence code-verified. The lane's own browser proof
  caught and fixed a real bug: the wipe's reload raced the
  `visibilitychange` autosave, which silently resurrected the deleted
  draft; a synchronous suppression flag now guards every write path.
- **E5 — DONE 2026-08-21.** Command palette (Cmd/Ctrl+K, `CommandPalette.tsx`
  + `src/lib/command-palette.ts`): an ARIA combobox/listbox over a ~25-entry
  action registry, every `run:` a direct call to the SAME named callback the
  visible button already calls (`handleTaskChange`, `openToolSlot`,
  `exportPDF`, …) — verified by source assertion, not just code review. The
  keyboard-map audit (`ShortcutModal.tsx`) found three previously-documented
  bindings with zero matching keydown handler anywhere in the tree (Ctrl+S
  as "save draft," Ctrl+Shift+F "Typewriter Focus," Alt+Shift+D "Dark / CRT
  Vintage / Print Theme") — grepped, confirmed false, and per the "remove
  nothing; correct anything stale" rule, wired for real rather than deleted:
  Ctrl+S force-saves, Ctrl+Shift+F really centers the cursor's line (a
  narrower, honestly-scoped "Typewriter Focus" than the old claim — no line
  dimming), Alt+Shift+D really toggles dark/light (the CRT/print claim was
  dropped — no such themes exist in this codebase). A11y sweep added real
  `role="dialog" aria-modal="true"` + `useModalFocusTrap` to two panels that
  had neither (SettingsPanel, StartScreen's file-preview modal — the latter
  needed its own extracted component for the trap's mount-effect to line up
  correctly, same reason ScriptIDE.tsx's inline modals already work that
  way), ARIA tablist/tab/tabpanel roles on Settings' tab strip, `<label
  htmlFor>`/`useId()` association on every Settings form field (previously
  bare sibling `<label>`s with no programmatic link to their input), and
  closed a real gap the browser-proof script caught live (not from source
  review): the shortcuts panel had no Escape handling at all before this
  pass. `prefers-reduced-motion` is inherited for free from the
  `MotionConfig reducedMotion="user"` already wired at `App.tsx`'s root — the
  palette and every touched dialog use `motion.div`, so no separate
  reduced-motion path was needed. Browser-proofed end to end
  (`scripts/verify-e5-command-palette.mjs`, 17/17): Cmd+K open → type "ship"
  → Enter → the real Ship panel opens; Escape closes the palette AND
  restores focus to the editor; a 25-press Tab-cycle inside Settings never
  escapes its trap; an entrance Tab-order walk reaches 6+ visible controls
  with none stranded off-screen. `npm test` 10,769/10,769 (0 fail, up from
  10,727 with 42 new tests: 14 pure filter/scoring + 28 source-wiring
  assertions); `verify-p2-p3-surfaces.mjs` 115/115 unaffected.

**Exit gate — MET 2026-08-21, after one honest failure.** The judged pass
(eight journeys browser-walked at 1440px + 375px, ~225 screenshots,
adversarial brief) first returned **NOT MET**: five journeys excellent —
with Verify-a-Report, the privacy page's specificity, the coverage delta
banner, and the command palette judged *beyond* what Final Draft /
Highland / Arc Studio / WriterDuet ship — but three below the bar. All
three gaps were then root-caused and fixed (`0c0a80c`), each with a
browser re-proof: (1) the coverage mini-panel was a fixed overlay with no
layout participation, clipping the header's save-status chip at 1440px —
the toolbar now reserves real panel width, and an independent bug found in
the same code (save-status compared display strings against enum values,
so the status chip could never match its state) was fixed with it; (2) the
first-contact journey rode through `CoverageSummary`'s static spinner —
the E1 SSE client is now a shared module (`src/lib/doctor-stream.ts`) and
the summary card shows the live pass counter with a real Cancel; (3)
Typewriter Focus was verified genuinely broken (no `scrollPastEnd()`, so
the cursor stalled ~375px off-center near document end) and fixed to
~0.2px of center, sustained while typing past the fold. The drawer-clip
the judge also flagged was re-driven and found to be a transient
entrance-animation frame, not a static defect — recorded, not "fixed."

## Phase P — Provably better (parallel track; includes the human-only work)

- **P-1 — EVIDENCE PHASE DONE 2026-08-21** (`109318df`; full findings in
  `docs/p1-benchmark/UNWIRED_SIGNALS_EVIDENCE_2026-08-21.md`; wiring
  remains owner-gated). Two structural facts first: neither named corpus
  is reachable from a remote session (both owner-local), and three of the
  four signals (agency-signal, question-latency, truth-extraction) are
  CANNOT-MEASURE against the 125-film corpus's annotation schema even in
  principle — they read raw screenplay prose the JSON annotations never
  carry. Measured on the 44-script in-repo real-prose sample
  (`scripts/measure-unwired-signals.ts`): **reversal-detection** — 0/44
  disagreement with the legacy channel; recommend WIRE Channel 2, with one
  owner-machine 125-film run still owed (command in the doc, amplitude
  caveat flagged). **agency-signal** — the annotation-bridge measurement
  path is structurally impossible; stays unwired pending the 761-script
  corpus. **question-latency** — ungated AUC 0.53–0.57 with all 95% CIs
  straddling 0.5; retire this measurement path (consistent with the prior
  "underpowered, not refuted" verdict). **truth-extraction** — 0/44 false
  positives on real prose + synthetic mechanism AUC 1.000; the
  false-positive evidence supports a low-risk WIRE, recall unmeasurable
  in-repo. No scoring file changed; receipt guard clean by construction.
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

From the ops audit — the Docker vehicle is already well-built; finish it.
**Code lanes DONE 2026-08-21 (`5abbfef` + `a541460`):**

- **S1 ✓** Backup cadence: opt-in `BACKUP_INTERVAL_HOURS` timer in
  `server.ts` running the existing `backupSessions()`; and the restore path
  now EXISTS as code (`restoreSession()` + `npm run restore-session`),
  proven by a drill test that backs up a real session, destroys it,
  restores, and asserts the `.db` byte-identical with every field
  round-tripped — a backup that has never been restored is not a backup.
- **S2 ✓** `RELIABILITY.md` §IV-C re-verified with dated verdicts: CON-001/
  002/004 VERIFIED-FIXED; **CON-003 was still present** (Director's Cut,
  Converge-commit, and the Move Bus appended/reverted commits directly on
  Stage while the Orchestrator's cached head went stale) — fixed via
  `Orchestrator.syncFromStage()` at all three sites, regression-tested.
  Global `MAX_ROOMS` cap (env, default 50, 429 at the boundary) added.
- **S3 ✓** `scripts/load-test-doctor.mjs`: 10 concurrent feature-length
  (250-scene) doctor runs × 3 rounds on a 4-CPU container — 30/30
  succeeded, p50 4.4s / p95 7.9s, with `/health` probed every 200ms
  answering p50 2ms / max 384ms throughout. The W1/W2 work holds under
  concurrency.
- **S4 (partial) ✓** Version bumped to `1.0.0-rc.1` — deliberately a
  release candidate, not 1.0.0: the 1.0 definition below requires the
  receipt trail's open `graphDeduction` obligation and human validation
  that remain owner-side. The Release workflow ran via `workflow_dispatch`
  on `a541460` and **published the first versioned Docker image to GHCR**
  (Release run: success, 2026-08-21). The annotated `v1.0.0-rc.1` git tag
  exists locally but the session's git proxy blocks tag pushes — pushing
  it is an owner click. (A stale `v1.0.0` tag from an old commit sits on
  the remote with no release behind it; owner may want to delete it.)

**Still owner-only:** set `ADMIN_TOKEN`/`TRUST_PROXY`/`METRICS_TOKEN` in
the real environment; enable `BACKUP_INTERVAL_HOURS` (and retention) in
production; push the `v1.0.0-rc.1` tag.

**Exit gate:** the stranger-week test — one pilot writer uses a hosted
instance for a week and loses nothing. Human-only; not started.

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
