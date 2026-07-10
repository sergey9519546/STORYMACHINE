# STORYMACHINE — Roadmap

Durable master plan. Any session with fresh context (no memory of prior work)
should be able to read this file top to bottom and resume exactly where the
project stands — what shipped, what's mid-flight, and what's next, in order.

Ground yourself before touching code: `CLAUDE.md` (conventions + Wave Program
v2), `server/nvm/revision/WAVE_QUALITY_GUARANTEE.md` § "Program v2" (binding
quality spec for wave work), `ARCHITECTURE.md` (system map — **stale**, its
refresh is Run 9 below), and `git log --oneline -40` for the session's commit
trail.

---

## 1. Current state (snapshot)

**PR #173 MERGED to `main`** (merge f122bff — the eight-run Script Doctor
platform). Working branch `claude/storymachine-claude-md-audit-nird9w` was
reset from the merged main and now carries Run 9's commits; any future PR is
a NEW PR. Shipped through the merge:

- **Script Doctor**: 14-pass diagnose-only coverage pipeline. Verdicts
  RECOMMEND/CONSIDER/PASS across 5 dimensions, percentiles vs. a 20-sample
  controlled-richness calibration corpus, root-cause clusters, a heatmap, and
  `contentHash` receipts for reproducibility. Imports Fountain/FDX/PDF.
- **Coverage HTML export**: server re-runs the doctor at export time so the
  exported report is authentic, not a stale client-side snapshot.
- **Draft-history deltas**: draft-over-draft health comparison persisted in
  `localStorage`.
- **Live Notes editor squiggles**: `POST /api/scriptide/diagnose`, 4-tier
  anchoring (scene/lines/character/document) for in-editor severity markers.
- **Writer-in-the-loop converge**: candidates + room transcript returned to
  the writer for selection; `POST /api/nvm/converge/commit` re-proves the
  chosen candidate before committing. (The old "best candidate auto-commits"
  behavior is gone — `ARCHITECTURE.md` still describes it; see Run 9.)
- **Revision per-pass diffs** + span locks (protect writer-approved spans
  from future rewrite passes).
- **What-If Lab**: `POST /api/nvm/whatif/explore`, deterministic counterfactual
  exploration; on-demand Writers'-Room critics.
- **Character interview** with psychology receipts: `POST /api/game/interview`,
  keyless.
- **First-hour fixes**: skippable onboarding wizard, view persistence,
  `llmReady` banners so users know when they're in analysis-only mode.
- **Keyless analysis-only boot**: server no longer exits fatally without an
  AI key; the deterministic surface is the front door.
- **Opportunity-normalized health formula**: length-invariant scoring,
  regression-tested against the old length-biased formula.
- **Doctor LRU memoization**: keyed on `contentHash` + `storyContext`
  (verified non-inert — originality's genre-cliché check and theme's whole
  pass read `storyContext` diagnostically).
- **Diagnose-only passes run parallel-safe** (`Promise.all`, sequential
  dependency severed and verified safe).
- **Per-user session identity** via `X-Session-Id` header (charset guard is
  path-safety, not authentication).
- **Wave Program v2 launched**; **Wave 1182 shipped** (Type 1 — signal
  channel: question-answer latency → 3 new `payoff.ts` checks).
- **CI** enforces no-`console.*`-in-`server/**` and a keyless test posture
  (no fake `GEMINI_API_KEY` masking real degradation paths).

Suite: **7,749 tests, 0 failures** (as of Run 9 close).

---

## 2. Resume protocol (how any session continues)

- Work on the session-designated branch. **Never hardcode a branch name** —
  read it from the current checkout.
- Per workstream: dispatch focused agents on **disjoint file sets**. Shared-file
  collisions were this project's main hazard this session — enforce one
  owner per file per wave/run.
- Per landing: independently re-run that workstream's own tests, review the
  diff, commit that workstream alone, push. Do not batch unrelated
  workstreams into one commit.
- Before any push that closes out a run: full `npm test` + `npm run lint`
  (`tsc --noEmit`) + `npm run build`, all green.
- Live-smoke new endpoints against `npx tsx server.ts` running keyless (no
  `GEMINI_API_KEY` set) — the product's front door is analysis-only mode, and
  every new route must degrade honestly in it, not 500.
- Check CI (GitHub Actions, `ci.yml`) after every push.
- Never commit an agent's files mid-flight — verify the diff first.
- PR watch: track PR #173 until it merges or closes; see Run 4's last item
  for the body refresh that needs to happen at close.

---

## 3. In-flight (integrate first)

Two workstreams have uncommitted or partially-landed changes on disk right
now. Integrate and verify both before starting any new run below.

**(a) OASIS bridge completion — SHIPPED** (commit "Complete the
simulation-to-canon bridge; honor configured psychology"; verified via
interview receipts + keyless run-scene smoke). Details for reference:
- Wire `SHIFT_RELATIONSHIP` / `APPRAISE_EMOTION` ops from ToM (theory-of-mind)
  and appraisal deltas in `server/nvm/bridge/action-to-ops.ts` and its
  Orchestrator call sites (`server/engine/Orchestrator.ts`).
- `/api/init` and `simulate-to-fountain` must accept `darkTriad`, `bigFive`,
  `attachmentStyle`, `defenseMechanisms`, `goalStack` — these were being
  silently dropped, making ScenarioBuilder-authored psychology inert at
  simulation time.
- Surface `droppedCommits` in turn / run-room responses (currently swallowed).
- `POST /api/run-scene` exposes `Orchestrator.runFullScene`.
- **Verify**: interview receipts (`/api/game/interview`) reflect the
  psychology actually configured on the character, end to end.

**(b) Editor→simulation seeding — SHIPPED** (commit "Simulate this script:
editor-to-simulation seeding completes the loop"): `scenario-from-script.ts`
mapping (ghost → knowledge, lie → `public_mask`, want → `hidden_motive`,
need → `goalStack`; sluglines → locations with consecutive-scene adjacency),
"Simulate" button in the IDE, 6 unit tests. Nothing left in flight here.

**Integration owner**: verify (a) independently on landing, commit it as its
own workstream, then live-smoke the `/api/init` psychology round-trip and
`run-scene` keyless before starting Run 8. Note: the psychology fields the
seeding flow already sends (`goalStack`) only take effect once (a) lands —
until then the server strips them harmlessly.

---

## 4. Run 8 — Blindspot patches — ✅ COMPLETE
(formula-version history + sample script; heavyBodyLimiter; log-hygiene
tripwire; PR body refreshed before merge. Checklist below retained for the
record.)

Already done: `types.ts` formula comment, README keyless truth, CI keyless
test posture (see Run 1 commit log — these landed as "Blindspot batch 1").

Remaining:

- [x] **(M)** Draft-history formula versioning: `ScriptDoctorPanel`'s
  `localStorage` entries store health scores from the OLD (length-biased)
  formula. A first diagnosis under the new opportunity-normalized formula
  shows a phantom ~50-point drop. Add `formulaVersion` to stored entries
  (current = 2); cross-version comparisons must render "scoring model
  updated — not comparable" instead of a numeric delta.
- [x] **(S)** PDF route DoS margin: `/api/scriptide/doctor/pdf` accepts up to
  15MB behind the general `gameLimiter` (120/min) — theoretical ~1.8GB/min
  per client. Add a dedicated, stricter limiter (e.g. 10/min) to this route.
- [x] **(S)** Log hygiene: session ids ride SSE query strings. Audit
  `server/app.ts` request logging so full query strings (session ids are
  isolation capabilities, not opaque identifiers) are not written to logs.
- [x] **(S)** PR #173 body refresh at close: update test count, session
  identity note, Wave 1182 mention; verify the formula-version fix above
  landed before closing the description says it did.

---

## 5. Run 9 — Architecture truth & structure — ✅ COMPLETE
(ARCHITECTURE.md rewritten grep-verified; record-parity harness landed with
30 tests + 5 product findings — follow-ups below; nvm.ts split into 8
modules behavior-identical; frontend code-split, StoryMachine chunk −81%,
500KB warning gone. Checklist retained for the record. NEXT RUN: Run 10.)

`ARCHITECTURE.md` is stale and actively misleading in places (see below) —
fix it before it misleads another session further.

- [x] **(M)** Rewrite `ARCHITECTURE.md` around the real organizing principle:
  a **deterministic core** (audit/verdicts/percentiles/counterfactuals/
  critics/receipts — keyless) inside a **generative shell** (candidates/
  rewrites/voices — opt-in, labeled, degradable). Add `analyze/`, `whatif/`,
  and `calibration` to the subsystem table (currently missing). Correct the
  converge description — it is writer-in-the-loop (winner returned +
  `/commit` re-proves), **not** "the best candidate is committed," which is
  no longer true. Add a Program v2 pointer, the keyless boot posture, and
  session identity to the doc.
- [x] **(L)** Record-parity harness: two producers of `ScreenplaySceneRecord`
  exist — ops-derived (`screenplay/memory.ts`) and text-derived
  (`fountain-analyzer.ts`) — and Wave 1182 added text-only optional fields to
  the latter. Build a golden-story parity test: author the same story both
  as ops and as Fountain text, assert signal agreement within tolerances, so
  the two halves can't silently drift apart. This is the trust foundation for
  any future sim-driven doctor report (see Run 9's dependency into Run 13).
- [x] **(M)** Split `server/routes/nvm.ts` (~1,900 lines, 50+ routes) into
  cohesive modules — it was the #1 agent-collision file this entire session.
- [x] **(S)** Frontend chunk splitting: the `ScriptIDE` chunk is >530KB;
  lazy-load its heavy panels.

### CYCLE 1 HEALTH GATE VERDICT (waves 1183-1186 — first gate run)
Zero DEAD rules of 12 (hard floor met); band separation untouched
(61.62/53.07/38.68/36.03, strictly monotonic). Pattern surfaced: leaf-level
Type-1 signal waves (1182, 1186) are corpus-INVISIBLE — the 20 samples are
short controlled fixtures without dense dyad dialogue — while Type 2/4 waves
(aggregating corpus-proven signals) land LIVE immediately; Type 3 is
structurally exempt (corpus runs genre-absent, permanently). Guards were NOT
loosened to manufacture fire (precision over vanity, per guarantee doc).
- [x] **(S)** PREREQUISITE before cycle 2's Type-1 wave (1190): either
  measure the target signal's corpus density BEFORE committing thresholds,
  or enrich the corpus with 1-2 denser two-hander samples (richness-matched
  across all bands per the controlled-design constraint!).
- Cycle 2 = 1187 (Type 2) → 1188 (Type 3) → 1189 (Type 4) → 1190 (Type 1),
  gate re-runs at 1190.

### Wave 1183 finding (analyzer weakness, schedule as a Type 1 wave)
- [ ] **(M)** detectClueLifecycle's payoff detection requires the seeded
  phrase to recur VERBATIM (quoted) — it fires on zero of 20 corpus samples
  because real dialogue restates clues unquoted. A content-word-overlap
  payoff matcher (like the question-resolution linkage from Wave 1182) would
  make clue-lifecycle signals real on actual scripts. Until then,
  payoff-latency excellence detection is impossible (measured, Wave 1183).

### Parity-harness findings (discovered at Run 9 close — schedule in Run 10+)
- [ ] **(S)** Unify scene slugs across producers: `memory.ts` deriveSlug and
  `compile.ts` projectFountain hardcode DIFFERENT slug templates (idx vs
  idx+1, different punctuation) — have projectFountain render the record's
  own slug. Contracted as STRUCTURAL_DIVERGENT in record-parity.test.ts;
  flip that assertion to exact-match when fixed.
- [ ] **(S)** Title-page boundary: projectFountain's Title:/Credit: lines
  fold into scene 0 on the text path, producing spurious clue tokens.
  Emit a proper Fountain title page (blank line before first slugline).
- [ ] **(M)** Compiler richness: only 3 of 14 StoryOp kinds render any text
  (clocks, clues, reader-state render nothing) — richer op rendering would
  strengthen both the parity contract and compiled-screenplay quality.

---

## 6. Run 10 — Deep-read sensing layer — ✅ COMPLETE
(Sensing core with injection-hardened per-scene annotation, six-signal merge
boundary, scene-hash cache, bounded spend; /doctor/deep route + labeled panel
toggle with full lineage discipline. NEXT RUN: Run 11 — fix-and-verify.) (biggest product lever)

**Why**: today's signals are lexicon/structure-derived; an LLM reading each
scene for subtext, motivation, irony, and stakes can sense far more than
string-matching ever will — while rules keep doing the judging, so the
product's determinism claim is undisturbed.

- [x] **(L)** LLM reads each scene and emits the **same** deterministic
  record-signal schema consumed by the revision passes today. Model senses,
  rules verdict — no new judgment surface, only a richer signal source.
- [x] **(S)** Cache by scene-content hash (the `repro/` LLM cache already
  exists — reuse it, don't build a second one).
- [x] **(S)** Keyless fallback: when no AI key is configured, fall back to
  the existing lexicon signals untouched — Deep Read must degrade honestly,
  never 500 or silently return worse data unlabeled.
- [x] **(S)** Opt-in "Deep read" toggle on the doctor/diagnose UI, off by
  default.
- [x] **(S)** New `aiLimiter`-gated route variant (Deep Read fans out to an
  LLM per scene — it cannot ride `gameLimiter`).
- [x] **(M)** Prompt-injection hardening: scene text is untrusted input into
  the prompt. Schema-constrained outputs only; treat this the same as any
  other untrusted-input-into-LLM surface in the codebase.

---

## 7. Run 11 — Fix-and-verify loop — ✅ COMPLETE
(Span-scoped hardened rewrite + deterministic whole-document delta receipt
with equal-prominence regressions and dual contentHashes; panel receipt card
with accept/discard. NEXT RUN: Run 12 — wave cycles 1183-1190 under the
health gate; cursor: 1183 = Type 2, excellence detectors.)

**Why**: every revision tool in the product suggests; none proves the
suggestion actually worked. This closes that loop and becomes the product's
strongest trust claim.

- [x] **(L)** From a root-cause finding (Run 5's cluster work, or any
  existing pass issue), let the writer request a targeted rewrite of the
  affected span(s) only — labeled generative output, `aiLimiter`-gated,
  `approvedSpans` (span-lock mechanism from this session) honored so locked
  text is never touched.
- [x] **(M)** Doctor re-runs automatically after the rewrite lands.
- [x] **(M)** Before/after delta proof: health score delta, issues cleared,
  issues introduced — shown to the writer, not just implied.
- [x] **(S)** Writer accepts the diff into the editor (or rejects it — the
  original stays authoritative until accepted).

---

## 8. Run 12 — ✅ COMPLETE (both cycles, gates green)
Cycle 1 (1183-1186) + cycle 2 (1187-1190) shipped: 24 rules/detectors,
2 new signal channels (power balance, speaking-character count), 6 genre
variants (7 of 8 genres covered; noir needs a valence-variance signal),
6 root-cause templates. CYCLE-2 GATE: 8 LIVE / 4 FIXTURE-ONLY / 0 DEAD;
band separation improved (weak/troubled dropped — new LIVE rules fire
only there: 61.62/53.07/37.28/34.43). The density prerequisite WORKED
(cycle-2 Type-1: 2/3 LIVE vs cycle-1: 0/3) — measure-before-threshold is
now STANDING PRACTICE for all future Type-1 waves. Per wave economics:
wave grinding pauses here; resume cycles post-deep-read-enrichment or as
scheduled. NEXT RUN: Run 13 (keyless deterministic simulation, design
doc first). — Waves 1183–1186 (one full v2 rotation)

**Why**: prove out all four Program v2 wave types end to end before trusting
the rotation to run unattended for hundreds of future waves.

**Rotation cursor: Wave 1182 was Type 1 (signal channel) — next up is Type 2.**

- [ ] **(M)** Wave 1183 — **Type 2, excellence detectors.** 3 rules that
  detect what a script does WELL, feeding `buildStrengths`. Never-padded is
  the prime directive: no firing on mediocre input; no-fire fixture must be
  competent-but-unremarkable, not broken.
- [ ] **(M)** Wave 1184 — **Type 3, genre-conditioned variants.** Measure
  which generic rules fire most across the calibration corpus FIRST
  (evidence, not intuition), then give the top ones genre-aware thresholds
  via `server/lib/genre-router.ts`. Genre-absent behavior must stay
  byte-identical to today's generic rule.
- [ ] **(M)** Wave 1185 — **Type 4, root-cause templates.** New
  co-occurrence clusters in `server/nvm/analyze/cluster.ts`; each template
  must subsume ≥2 real rules shown to co-fire.
- [ ] **(M)** Wave 1186 — **Type 1, signal channel #2.** Candidates:
  dramatic-irony gap (audience-knows vs. character-knows), power-balance
  shifts within a scene, motif recurrence shape.

Record each wave's type in its own commit message so the rotation cursor
stays legible to the next session without re-deriving it from history.

### Wave economics — how many waves, and when to stop grinding

The value-maximizing schedule, decided after Wave 1182's warning sign (its 3
new checks fire on ZERO corpus samples — a rule that never fires is
inventory, not capability; v1 died of exactly this at scale):

- [ ] **(M)** Extend Run 12 to TWO full cycles: waves 1183–1190 (the four
  types twice). ~24 new checks and, more importantly, two passes of the
  health gate below.
- [ ] **(S)** **Wave-health gate — run at the end of EVERY cycle, forever:**
  (a) corpus band separation must hold or improve (calibration tests +
  band-average deltas reported in the cycle's last commit message);
  (b) fire-rate audit: fraction of the cycle's new rules that have ever
  fired on any corpus sample or realistic fixture — zero-fire rules get
  their guards re-examined or the corpus enriched (e.g. 1182's silence
  means either conservative thresholds or a corpus without question-dense
  dialogue — measure, don't assume). This gate is what keeps v2 from
  silently becoming v1.
- **STOP grinding after cycle 2** (~wave 1190): pre-deep-read lexical
  extraction supports only ~8–12 more genuinely new signals total. Do
  Run 10 (deep-read sensing) NEXT — it reopens the signal axis with
  semantic channels (irony, subtext, motivation coherence), making each
  post-deep-read wave worth several of today's. Then resume sustained
  cycles indefinitely under the gate.
- **Horizon estimate for "absolute best outcome": ~40–50 v2 waves
  (~120–150 checks) across this roadmap — 8 before deep-read, the rest
  after — with the per-cycle gate as the real stopping rule, not a count.**

---

## 9. Run 13 — Keyless deterministic simulation — ✅ COMPLETE
(Identical-shape fallbacks, shared downstream code, real ops keyless —
live-smoked. Flag not persisted to Action_Log schema: follow-up if wanted.)

**Why**: a scouting pass this session found the keyless simulation is
hollow — structure advances turn to turn, but beliefs, relationships, and
dialogue are frozen because they're entirely LLM-gated. That breaks the
product's own "keyless-first, honest degradation" principle at the
simulation layer specifically.

- [ ] **(L)** Design doc first — this is sized L, do not start coding before
  the design is written and reviewed.
- [ ] **(M)** Template `takeTurn` fallback driven by goals/pressure (no LLM)
  when running keyless.
- [ ] **(M)** `witnessed → belief` and suspicion heuristics in
  `updateEpistemics` — rule-based, not generative — so the sim runs
  coherently without a key, matching the interview route's receipts
  philosophy (Run 1's `/api/game/interview` keyless receipts are the model
  to follow).
- [ ] Depends on Run 9's record-parity harness landing first if this touches
  `screenplay/memory.ts` signal production — check before starting.

---

## 10. Run 14 — Producer tier — ✅ COMPLETE
(Slate triage JSON+HTML, breakdown CSV, pitch-kit SVG HTML, SlatePanel +
doctor-panel buttons. NEXT RUN: Run 15 — trust & publishing.)

- [ ] **(M)** Batch slate triage: upload N scripts, get a ranked comparative
  table — deterministic doctor run per script, percentile-ranked against the
  same calibration corpus.
- [ ] **(M)** Pitch-kit visuals: tension curve + character-relationship web
  as exportable SVG / print-HTML, built from data the doctor already
  produces (no new analysis, just a new rendering target).
- [ ] **(M)** Breakdown export: scenes / cast / locations to CSV (and
  FDX-compatible export where the target tooling supports it) for
  pre-production handoff.

---

## 11. Run 15 — Trust & publishing — ✅ COMPLETE
(Rulebook: 3,196 rules extracted + staleness test; CALIBRATION.md; verify
endpoint. NEXT RUN: Run 16 — deployment hardening.)

- [ ] **(M)** Rulebook generation: extract all ~1,300 rules (name, pass,
  description) into browsable docs. This is both a depth proof and an SEO
  asset — a claim black-box competitors structurally cannot make.
- [ ] **(S)** Calibration methodology writeup: explain the controlled-richness
  corpus design in plain language for an external audience.
- [ ] **(M)** Verify endpoint: `POST` a report's `contentHash` + the Fountain
  text; server re-runs the doctor and attests byte-equality. This is the
  determinism badge — checkable by anyone, not just internally.

---

## 12. Run 16 — Deployment hardening — ✅ COMPLETE
(Session idle-TTL env-tunable + eviction tests; TRUST_PROXY opt-in;
docs/AUTH.md trust-model doc; README deployment/backup section; formula
drift re-measured — zero drift vs post-1190 numbers. Companion fix:
Dockerfile runner stage was BROKEN — missing src/lib and data/sessions
mkdir — fixed and boot-proofed keyless; .env.example now exhaustive.
NEXT RUN: Run 17 — function-first (see §13).)

- [x] **(M)** Session TTL / eviction audit, plus `data/` disk growth caps
  (one SQLite DB per session — this grows unbounded today).
- [x] **(M)** Real auth decision: session ids are unguessable capabilities
  today but there is no authentication layer. Decide and document the
  intended trust model before this ships wider. → `docs/AUTH.md`
- [x] **(S)** Rate-limit keying review (currently per-process; verify it's
  correct per-session with `X-Session-Id` now in play). → TRUST_PROXY
- [x] **(S)** Backup story for persisted sessions (no durability story exists
  today beyond the SQLite file on disk). → README Deployment section
- [x] **(S)** Residual formula bias follow-up: the opportunity-normalization
  constants in `doctor.ts` are tied to current rule density. Revisit after
  Waves 1183–1186 land, since those waves will shift rule density.
  → re-measured post-1190: strong 61.62 / competent 53.07 / weak 37.28 /
  troubled 34.43 — no drift, no retune needed.

---

## 13. Run 17 — Function-first — ✅ COMPLETE (B/C/D; A cancelled)
(B: all 14 op kinds render, parity re-measured. C: clue lifecycle
11/20 corpus fires via content-word channel, calibration fixture
reconciled. D: squiggle→Fix-with-AI bridge with receipts + honest
keyless degradation. A (E2E browser) cancelled by user directive — no
browser/deploy checking; its last output reported all 5 journeys
passing before the kill. Run 18 α/β/γ also COMPLETE: dialogue blind
spots fixed, dimension collapse fixed, discrimination harness in CI —
2 hard pairs, 4 named-blind-spot todos ranked told-exposition >
subtext = passivity.)

- [ ] **(L)** E2E browser verification of the core journeys (upload→doctor→
  fix-verify; what-if; interview; coverage export) via preinstalled
  Chromium + Playwright — nothing has ever been clicked end-to-end.
  Fix whatever it finds.
- [ ] **(M)** Compiler richness: `projectFountain`
  (`server/nvm/project/index.ts:57`) renders only 3 of 14 StoryOp kinds
  (UPDATE_BELIEF, SHIFT_RELATIONSHIP, RECORD_VISUAL_FACT) — SEED_CLUE,
  RAISE_CLOCK, APPRAISE_EMOTION, RECORD_SONIC_FACT, ADD_FACT, etc. vanish
  silently from compiled screenplays.
- [ ] **(M)** Clue-payoff content-word matcher: `detectClueLifecycle`
  (`fountain-analyzer.ts:602`) is exact-token only — verbatim-quote
  matching makes clue signals mostly dead on real scripts.
- [ ] **(M)** Squiggle→fix bridge: `src/components/editor/diagnostics.ts`
  shows `suggestedFix` as tooltip text only — no path from an editor
  squiggle to the fix-and-verify endpoint.

### Ultrareview verdict (4-agent audit, 2026-07-05) — shapes Runs 18–31

Surface map: ~18 routes with no UI caller (each claim needs verification —
one false negative already caught: doctor/deep IS called), ~38 routes with
inline-only or missing zod validation (drift from CLAUDE.md's "every route
zod-validates" claim), AIPanel orphaned. Test audit: 52 untested server
modules (room critics, proof tiers 1–2, agent decision logic), ZERO frontend
component tests, 100% fixture-only rule tests, no real-script regression
corpus. Docs audit: 95% aligned, clue lifecycle fires 0/20 corpus samples.
Product critic (ran the live server, A/B tested own scripts): **HEADLINE —
a deliberately bad script scored 78.7 while a well-crafted subtextual one
scored 72.** Reversal/relationship detectors are keyed to blunt explicit
signals; NON_RESPONSIVE_EXCHANGE punishes professional elliptical dialogue
(literal word-overlap test); ON_THE_NOSE regex missed pure feeling-narration
("stressed"/"worried" not in word list, template too rigid); dimension
scores collapse to five identical values on short scripts (scarcity term
dominates); ~131 issues with 4× near-duplicate families; exports render
"Untitled" despite a Fountain title page (title-page block never parsed);
no page-count/runtime units anywhere; pitch kit has no pitch content;
room critique leaks proof-kernel jargon; buildStrengths is
absence-of-negative only. Praise: error handling bulletproof, keyless
degradation honest, root-cause clustering "the best feature in the
product", exposition detection real, ~15ms doctor runs.

## 13a. Runs 18–31 — The next fifteen (synthesis of the ultrareview)

- [ ] **Run 18 — Score trust (THE premise fix).** Subtext-aware
  reversal/relationship-shift sensing; fix or retire
  NON_RESPONSIVE_EXCHANGE's literal-overlap test; broaden ON_THE_NOSE
  beyond the "I feel X" template + fixed word list; fix short-script
  dimension collapse (scarcity term swamps density) or suppress false
  precision; NEW TEST CLASS — discrimination harness: paired good/bad
  scripts where good MUST outscore bad, in CI forever.
- [ ] **Run 19 — Report quality.** Cross-pass dedup of near-identical
  issue families (the *_SEED_*_EMOTION family) before user display;
  page-count/runtime estimate in every report and export; Fountain
  title-page parsing as default title everywhere; "reads like an excerpt"
  confidence caveat for few-scene inputs.
- [ ] **Run 20 — Excellence sprint.** Accelerated Type-2 waves: positive
  craft detectors (clean reversal, tight subtext, executed escalation)
  feeding buildStrengths — the critic ranked this above further defect
  rules given the A/B inversion.
- [ ] **Run 21 — Producer surfaces.** Pitch kit gets pitch content
  (deterministic logline from protagonist/goal/obstacle signals, genre,
  synopsis, comps slot); coverage title fix; page metrics in exports.
- [ ] **Run 22 — Validation completeness.** Zod schemas for every route
  in the ~38 gap list (restores the CLAUDE.md security claim); room
  critique translation layer (no proof-kernel jargon reaches writers).
- [ ] **Run 23 — Dead-surface reconciliation.** Verify each "no UI
  caller" route; EXPOSE the valuable ones (session export/import,
  export/verify determinism badge, run-scene) — only expand, don't
  reduce; mark genuinely deprecated code as such.
- [ ] **Run 24 — Test depth.** Real-script regression corpus
  (public-domain screenplays end-to-end through all 14 passes); tests for
  the 52 untested modules (room critics, proof tiers, agent decision);
  first frontend component tests.
- [ ] **Run 25 — Onboarding.** First-run experience: sample content
  reachable in one click from every entry surface; blank-editor bounce
  fix.
- [ ] **Runs 26–31 — Depth cycles.** Wave cycles 3–5 (1191+, cursor
  Type 2) under the discrimination harness as an additional gate;
  genre-conditioned variants; deep-read on the PDF path; slate fdx/pdf;
  R13 flag persistence; real-key LLM quality eval (needs user key);
  then 17b polish items.

## W-wave — ✅ COMPLETE (deployment-gate wave)

- **W1 — health-formula sensitivity**: piecewise density curve (>=1
  branch byte-identical; sub-1 logistic tuned by parameter search).
  5 of 6 discrimination pairs are now HARD CI assertions with real
  margins (+1.4 to +6.1); calibration/length-invariance fully held.
  active-protagonist stays todo with a precise diagnosis: residual
  false positives on the active half (ACTION_WITHOUT_CONSEQUENCE,
  GOAL_WITHOUT_OPPOSITION, RUN_ON_ACTION 2v0 each) + missing passivity
  true-positives — the next detector wave's target, cleanly scoped.
- **W2 — action verbs in export/display**: all 10 new verbs render as
  real screenplay in transcriptToFountain + covert/threat visual
  treatment in the Script Ledger.
- **W3 — report quality**: duplicate-family merge layer (incl. three
  rules independently implemented twice under identical names) + 4
  document-mode root-cause templates (static-spine, promises-unkept,
  unearned-change, talk-over-action).
- **W4 — validation completeness**: 26 new schemas + validateParams;
  every JSON body and identifier param validated; honest exceptions
  enumerated; six 500s fixed to 400s.

DEPLOYMENT GATE at this point: suite 8822/0 (2 scoped todos), lint
clean, build clean, console-grep 0, CI green, Docker boot-proofed
keyless, .env.example exhaustive, session TTL/backup/auth documented.

## Sim + producer wave — ✅ COMPLETE

- **X1 — action vocabulary 5→15**: HIDE/OBSERVE/LISTEN/SEARCH/REVEAL/
  THREATEN/BETRAY/PROTECT/FORM_ALLIANCE/FLEE, each with a real mechanic
  + full wiring (Orchestrator/CausalSpine/Stage/bridge/personality/
  cascade). FLEE dominates at cascade flight, THREATEN at fight; THREATEN/
  BETRAY land DramaticPressure the target's next cascade reads. 5 actions
  honestly excluded (no inventory/evidence/async/combat model). 30
  new tests. Follow-ups FILED: (a) fountain.ts export switch has no
  cases for the 10 new verbs — they render as nothing in exported
  screenplays (degrade gracefully); (b) StoryMachine.tsx action-display
  logic has no bespoke treatment for new verbs. Both non-crashing.
- **X2 — pitch kit + Untitled fix**: deterministic logline/synopsis/
  comps-slot + title-page parser feeding pitchkit + coverage; cast
  table with role hints. The producer critic's two findings resolved.

## D2-wave — ✅ COMPLETE (inversion fixed) + next-step finding

RESULT (measured after a+b+c landed): every pair's GOOD half rose to
79.8 (false positives removed); NO pair inverts anymore (good ≥ bad
everywhere — the reviewer's actual bug, good scoring LOWER, is gone).
3 pairs strictly pass (escalation +0.7, setup-payoff +0.3, composite
+0.3 — the reconstructed reviewer scenario flipped from a dead tie to
passing). 3 pairs now EXACTLY TIED at 79.8 (subtext, active-protagonist,
dramatized-exposition) — up from inverted, not yet strict good>bad.

ROOT CAUSE of the residual tie (diagnosed, not guessed): the bad halves
DO fire far more true-positive issues (subtext-bad fires 23 rules good
doesn't — EXPOSITION_DUMP, DIALOGUE_DOMINANCE, on-the-nose floods;
dramatized-told-bad fires AS_YOU_KNOW_BOB, REVELATION_UNEARNED). The
discrimination signal is fully present in ISSUE COUNTS. But the health
formula's density penalty (steep ^3.75 curve) crushes sub-1.0 densities
toward zero at short-script issue densities, and the identical
scarcity term (140/sceneCount) dominates — so a 15-23 rule-instance
gap yields a <0.05 health delta. Same short-script compression 18-β
fixed for DIMENSIONS, now at the OVERALL health level.

NEXT STEP (high-risk, dedicated, heavily calibration-guarded — NOT more
detectors): a health-formula-sensitivity wave to make the density term
responsive at short lengths without breaking band monotonicity,
no-saturation, or length-invariance (±7 at 1x/2x/3x). Alternative:
longer discrimination fixtures where density has room. Filed. The 3
tied pairs stay non-failing todos until then; their comments should be
updated from "inverted" to "tied at short-script health ceiling."

## D2-wave — Discrimination false-positive reduction (landed)

Diagnosed the 4 inverted discrimination pairs (I ran the doctor on each
half and diffed which rules fire). ROOT CAUSE: not missing detectors —
FALSE POSITIVES on the well-crafted halves. Dramatized/active/subtextual
writing trips "absence-of-craft" rules that flat/told/passive writing
avoids. Biggest lever: ACTION_WITHOUT_CONSEQUENCE (causality.ts) fires
10-vs-2 weighted on dramatized-exposition's GOOD half — it reads
dramatized action as consequence-free when the consequence lands in the
following reaction. Cluster:
- causality.ts: ACTION_WITHOUT_CONSEQUENCE, GOAL_WITHOUT_OPPOSITION (D2-a)
- intention.ts: ZERO_ENTROPY_SCENE, AGENCY_WITHOUT_CONSEQUENCE,
  GOAL_INVERSION_ABSENT, PASSIVE_ESCALATION, ENTROPY_CLUSTER (D2-b)
- character-arc.ts ARC_EMOTIONAL_MONOTONE / originality.ts
  EMOTIONAL_ARC_PLATEAU / relationship-arc.ts NO_RELATIONSHIP_MOVEMENT —
  subtext registers as monotone because on-the-nose emotion-naming
  inflates the movement signal (D2-c).
Fix = principled guards (consequence-lands-downstream; present-but-
compact ≠ absent; subtext-aware movement), NOT fixture overfitting.
Each measured against pair fixtures + calibration monotonicity. On
landing: integrate, run the harness, flip todos that now pass to hard
assertions. The honest fix the reviewer's A/B inversion demanded.

## STANDING DIRECTIVE 2 — Integration over accumulation (user, 2026-07-05)

Nothing ships as a separate feature of its own. Every axis entry and
module must CONNECT: a defined consumer chain from signal → rule/critic
→ report/export/UI or generation prompt. Landing review includes an
integration check ("who consumes this?"); dangling ends are wired in an
integration wave BEFORE further expansion of that axis. Known dangling
ends to wire (I-wave 1): genrePromiseBlock → prompt assembly;
story_tone → real IllusionState persistence + composeThresholds
actually consumed by revision passes (they read GENRE_RULE_MODIFIERS
directly today); defense cascade/trinity → deterministic.ts keyless
fallback; metrics module → ScriptDoctorReport + doctor panel (text
path, not just /api/nvm/metrics ops path); new projection targets →
ProjectionGalleryPanel; CHARACTER_ARC_MODES → config route + prompt
consumption; discrimination-harness todos → drive the next detector
wave (told-exposition inversion first).

**I-wave 1 — ✅ COMPLETE.** All wired: I1-a (tone persistence +
composeThresholds live in pacing/structure/belief passes +
character-arc-mode route + genrePromiseBlock in prompts), I1-b (cascade
+ trinity in keyless deterministic fallback, byte-stable at baseline),
I1-c (metrics in ScriptDoctorReport + panel Story Metrics section on
the text path), I1-d (6 projection targets in gallery + Story tab with
all axes + DirectorPanel de-hardcoded via story-axes), I1-e (Wave 1192:
betrayal/power/irony record fields both paths + 3 checks, parity matrix
→29, calibration/discrimination held). Suite 8628/0, rulebook 3204.
Remaining discrimination-harness todos (told-exposition inversion #1)
are the next detector wave's target — still open.

## STANDING DIRECTIVE — Exhaustive coverage (user, 2026-07-05)

Every configurable/enumerable axis in the product must be pushed to
exhaustive coverage: all genres, all sin-check detectors, all tension
measures, all defense-cascade states, all narrative metrics, all story
structures, all emotional arcs, all character-arc modes, all director
styles — and beyond those, EVERY axis found by audit (scene-purpose
enums, emotion taxonomies, relationship stances, clue carrier types,
payoff types, root-cause templates, lexicons, projection targets,
export formats). Procedure after each build wave: inventory what was
built, enumerate each axis's current vs possible option space, and
dispatch expansion agents for every gap. Padding is still forbidden —
exhaustive means every REAL option, each with genuine craft content.
Next exhaustiveness sweep: after B-wave 1 + Runs 17-C/18-β/γ land.

## 13b. Blueprint integration (OASIS architecture docs, 2026-07-05)

User supplied a 53-page architecture blueprint + research memo. Two mapping
sweeps verified: strongest concepts already exist (Fabula/Syuzhet ≈ state +
projections + two-reader; setup/payoff ops; 5 room critics; proof kernel;
ghost-commit branching; 6 Vonnegut tension curves w/ interpolation; 10
projection targets; 8-genre router w/ rule-threshold modifiers). Genuinely
missing or thin, ranked by product value:

- [x] **B-wave 1 — ✅ COMPLETE** (a=28 genres+16 tones+genreRules+
  /api/story-tone; b=6 sin detectors, Wave 1191; c=metrics module +
  /api/nvm/metrics; d=6 projection targets; e=22 structures/10 curves/
  12 arc modes/28 styles; f=defense cascade+trinity. Follow-ups filed:
  genre completion to 40+ incl. cosmic_horror/slasher/k_drama/
  spy/gangster/political+psychological thriller etc. + 8 more tones
  [B1-a declined mid-flight scope change on injection caution — fresh
  brief needed]; genrePromiseBlock wiring into prompt assembly;
  story_tone proper session persistence; deterministic.ts cascade
  consumption; FALSE_CLUE needs an analyzer truth-value signal.)
  Original dispatch scope: (a) Genre engine expansion — 8 → 20+
  genres, TONE as a separate composable axis (bleak/cozy/paranoid/...),
  per-genre required-behaviors/forbidden-shortcuts/info-position defaults,
  noir rule-modifiers (currently none); (b) Sin-check detector pack —
  PLOT_ARMOR, IDIOT_PLOT, COINCIDENCE_RESOLUTION + unseeded-twist
  hardening (deus-ex-machina exists at causality.ts:155); (c) Narrative
  metrics module — cliffhangerStrength, pivotStrength, twistImpact,
  suspense-entropy as deterministic formulas over scene records, new
  /api/nvm/metrics; (d) Projection targets — treatment, outline/beat-sheet,
  dialogue_only, epistolary, simulation_log, director_commentary, comic →
  true panel-by-panel script.
- [ ] **B-wave 2 (after Run 17/18 files free up):** Semantic Firewall —
  knowledge-boundary check on AUTHORED text (character acts on facts they
  couldn't know — killer doctor feature, only enforced on sim path today);
  menace target-curve delta audit (expectedTensionAt exists, nothing
  compares measured scene tension against it); contradiction families
  (PHYSICAL/KNOWLEDGE/MOTIVATION/TIMELINE) layered over rootCauses.
- [ ] **R-wave (70-point research memo, 2026-07-05):** (1) Scene economy
  score + value-shift contract — objective/conflict/turn/value-shift per
  scene, scenes scored by jobs done (plot/character/relationship/tension/
  setup/theme/information); deterministic doctor checks. (2) Fair-play
  mystery solver — genre-conditioned: all clues needed for the solution
  seeded before the reveal, red herrings factually-true-but-misleading,
  no late culprit. (3) Confusion-vs-mystery metric — confusion penalty
  (unclear speaker/cause/timeline, unresolved-name pileup) distinct from
  suspense. (4) Speech-act signal channel — per-line accuse/deny/
  threaten/confess/deflect/bargain classification in fountain-analyzer
  (Type-1 wave material). (5) Epistemic contract + unreliability budget
  + 10 narrator types (enriches B-wave-3 narrator item). (6) Clock
  segments + threat fronts + antagonist autonomy (sim depth). (7) Canon
  tiers (hard/soft/provisional) + retcon governance over the commit
  ledger. (8) Evaluator hard-veto audit — Fabula-violation vetoes must
  beat score averaging in room critique. (9) Benchmark scenario suite —
  locked-room / betrayal-dinner / missing-person golden scenarios with
  expected truth/belief/clue/payoff outputs, extending the
  discrimination harness. Filed-not-scheduled: BOID obligations,
  factions, spatial line-of-sight, streaming tags, TTS/storyboards.
- [ ] **B-wave 3:** Setup/payoff TYPING (plot/character/emotional/mystery/
  visual/irony/thematic + visibility + required window on SEED_CLUE/
  PAYOFF_SETUP — StoryOp contract change, sequence with parity);
  defense-cascade states (arousal→freeze→flight→fight→fawn→collapse) +
  Id/Ego/Superego arbitration in agent decisions; arc meter (Ghost/Lie/
  Want/Need + lie-belief/need-awareness/internal-conflict 0-100);
  narrator-reliability score + dissonance types; cognitive-illusion
  ledger (decoy focus, weaponized assumptions — IllusionState has
  setup/turn/prestige already); retrieval scoring w/ recency + emotional
  salience (embeddings.ts is semantic-only).

## 13c. D-wave — Seeded divergence operators (filed 2026-07-10)

Source: "Enhancing AI Creativity: A Multi-Agent Approach to Flash Fiction
Generation" (Stanford CS224N student paper, user-supplied). Mapping sweep
verdict: their MFER pipeline is a weaker converge loop (LLM role-play judge
vs. our proof kernel + room critics + writer-in-the-loop), their RFM
one-metric-per-pass finding is our 14-pass architecture, their eval is
LLM-as-judge (rejected by NORTH_STAR.md). ONE transferable insight, backed
by their ablation: a deliberate DIVERGENCE phase before convergence —
random-stimulus injection + Osborn-checklist "expert angle" prompts —
measurably raised creativity. Our generative shell has no such phase: the
candidate generator samples near the probability mass and the proof kernel
prunes; nothing ever forces the sampler AWAY from the mass first. We built
the strongest editor in the market; this files the brainstormer.

- [ ] **(S)** Stimulus module: curated lexicon pools (objects, reversals,
  tonal injections) + SEEDED selection via repro/seed.ts's PRNG so a run
  manifest reproduces the exact stimulus — determinism receipts survive.
- [ ] **(M)** Angle operators: 8-10 Osborn-style progression angles
  (romantic shift, betrayal, secret revelation, humorous misunderstanding,
  social reflection, internal-vs-external conflict...) expressed as
  prompt-spec variants over the EXISTING drama//mechanisms vocabulary —
  no new judgment surface; model diverges, rules still verdict.
- [ ] **(M)** Wire into makeLLMCandidateGenerator prompt assembly as an
  opt-in divergence knob on /api/nvm/converge (zod-validated body field,
  aiLimiter unchanged). Rejected wild candidates persist to the ghost
  ledger as always.
- [ ] **(S)** Keyless: no-op passthrough (divergence only shapes LLM
  prompts) — honest-degradation principle holds byte-identically.
- [ ] **(S)** Eval: A/B candidate-set diversity via room critics' existing
  scoring, before/after divergence, reported in the landing commit. 6 tests
  (fire + no-fire: seeded reproducibility, keyless no-op, validation).

Integration check (Standing Directive 2): consumer chain = stimulus →
prompt-spec → converge candidates → proof/valuation/room → writer commit.
No dangling ends; UI knob rides the existing ConvergePanel.

## 13d. OWNE integration (truth registry + design library, filed 2026-07-10)

User supplied an audited "truth registry" + full response corpus for an
Open-World Narrative Engine (OWNE v1.1) — fact-checked formula spine, an
explicit rejection list (BK-inequality runtime filtering, CFTP story
sampling, Shannon-Hartley reader bandwidth, JSD-to-point twist metrics —
all rejected with reasons), and MACHINE-READABLE design assets now vendored
under `docs/owne/`: a 22-entry promise-template library (PT_* with
setup_class / machine-checkable payoff_pred / hard-soft flag / priority),
48 parameterized micro-mystery templates (M01-M48 with hypothesis spaces,
true-clue vs red-herring taxonomies, fairness gates), and the complete
Tavern Letter golden fixture (world fluents, STRIPS schemas, physics
invariants, likelihood tables, golden path, negative tests, CI gates).
Registry hygiene note: everything under docs/owne/ is SOURCE DESIGN DATA,
not verified universal fact — see TRUTH_REGISTRY.md §6.

Ranked by product value; each is guarantee-doc-scoped wave work:

- [ ] **O1 — Typed promises (supersedes/implements B-wave 3's setup-payoff
  typing).** Adopt the PT_* template shape onto SEED_CLUE/PAYOFF_SETUP:
  type + hard/soft + priority + payoff predicate class. Consumers: payoff
  pass (ORPHAN_CLUE severity becomes principled — hard promise unpaid =
  critical, soft = minor, priority-weighted), pitch kit, root causes.
  StoryOp contract change: sequence with record-parity.
- [ ] **O2 — Tavern Letter as OASIS golden fixture + Integrity Rate.**
  Import the fixture as ops/scenario; add IR = (1/T)·Σ 1[event legal ∧
  invariants hold] over sim traces; CI-assert IR = 1.0 and Halluc = 0 on
  the golden path, plus its negative tests (early-accusation gate,
  teleport prevention, double possession, herring non-softlock). Proves
  the sim layer the way the 69-script corpus proves the doctor.
- [ ] **O3 — Assertion containment on generative output.** Registry law:
  Asserted(output) ⊆ licensed facts ∪ common ground. Every LLM rewrite/
  candidate gets a deterministic post-check that its prose asserts no
  unlicensed facts (entity/fact extraction vs session canon + input span).
  Generalizes B-wave 2's Semantic Firewall to ALL generation paths.
- [ ] **O4 — Belief-movement surprise channel (Type 1 wave).** Explicit
  hypothesis distribution μ over who/what/why + per-scene TV-distance
  Surprise(e) = ½·||μ_e − μ||₁ — deterministic twist metric with real
  math, replacing lexicon-intensity proxies. Feeds twist/reveal rules and
  the metrics module.
- [ ] **O5 — Mystery fairness gates (Type 3, genre-routed).** Doctor
  checks for mystery-genre scripts: min_true_clues_before_solve (>= 2),
  red-herring non-softlock, reachability of solution clues before the
  reveal. Discourse-class/meso-chain taxonomy (Myst_Hook → ... →
  Aftermath) as ScenePurpose extensions for the mystery genre router.

## 13e. STORY GOD v3.5 integration (own prior-gen design, cataloged 2026-07-10)

Research-folder audit (subagent full read of all 13 files; 7 superseded
files archived to _superseded_2026-07-10/): the canonical assets are the
STORY GOD v3.5 spec (60pp, the project's own prior-generation design) and
its Advanced Architectures blueprint, both in
`William joyce/story_machine_research_files_references/`. Mechanisms with
QUANTIFIED thresholds not yet in this engine, ranked; each converges with
an existing filed item where noted:

- [ ] **SG1 — Well-Made Surprise Test** (twist-quality check): passes when
  preTwistSatisfaction >= 0.6, hindsightInevitability >= 0.7, >= 3 setups
  for the twist, misdirectionEffectiveness >= 0.5. Deterministic
  formulation over the setup/payoff ledger → pairs with O1 typed promises.
- [ ] **SG2 — Genre Obligation Engine** (Type 3 wave): per-genre obligatory
  scenes with act deadlines (psych-thriller: discovery_of_wrongness by
  Act 2, trust_betrayal by Act 2). Defect rule (missing obligation) +
  excellence twin (obligation delivered WITH variation). Extends
  genre-router; converges with O5 mystery fairness gates.
- [ ] **SG3 — Cold Open Promise Tracker** (Type 1 signal channel): opening
  promise + typed echoes (reinforcement/variation/subversion/inversion) +
  finalImageMirrorsColdOpen — opening-vs-final-image mirroring is also a
  SHUFFLE-SENSITIVE document-scale signal → candidate axis for the
  degradation-AUC spine (§ULTRAPLAN 1.2).
- [ ] **SG4 — Pattern-establishment rule**: "you cannot subvert a pattern
  until it is established (minimum 3 exposures)" — countable motif/behavior
  exposure tracking; flags premature subversion; feeds dramatic-irony
  accounting with the sim layer.
- [ ] **SG5 — Causality Enforcer**: coincidence allowed in Act 1 only, and
  must gain meaning later — crisp act-positioned defect rule for
  causality.ts.
- [ ] **SG6 — Corpus expansion via Film_Script_Research_Report.docx**: the
  155-screenplay sourcing index (91.6% publicly available, per-title
  sources) is the acquisition map for growing the corpus 69 → 150+ across
  eras/genres; first LIVE-ACTION entries available today: Pulp Fiction
  (_PULP FICTION_ copy — trim trailing web-capture junk) and Jaws
  (jaws-1975.pdf, clean); Godfather needs OCR.

Deliberately NOT adopted: the Five-Evaluator LLM negotiation system as a
scoring surface (NORTH_STAR rejects LLM judges; its act-weighted arbitration
MATRIX is salvageable as deterministic position weights for findings), and
Suspense = Threat x Anticipation as a display metric only until a threat
signal exists.

### Run 17b — Polish (retained, after function work)

- [ ] **(M)** Panel consolidation: 24+ flat buttons in the UI → grouped nav
  with progressive disclosure.
- [ ] **(M)** Accessibility pass across the panel set.
- [ ] **(S)** Dedupe hand-rolled Fountain parsing between
  `src/services/director.ts` and `src/lib/fountain.ts` — two parsers doing
  overlapping work.
- [ ] **(S)** `.fdx` direct client import path: currently toast-redirects the
  user to the Doctor upload flow instead of importing in place.

---

## 14. Standing principles (unchanged, from CLAUDE.md)

These hold across every run above without exception:

- **Quality bar**: build the strongest version of a change, not the quickest
  one that passes — edge cases handled, inputs guarded, fire + no-fire tests
  for every new rule, consistency with the surrounding file's patterns.
- **Security constraints**: API keys live only in `.env` (gitignored), never
  serialized to clients; all AI calls are server-side only; every route sits
  behind `gameLimiter` or the stricter `aiLimiter`; no new `console.*` under
  `server/**` (CI-enforced).
- **Keyless-first**: the server boots and operates in analysis-only mode
  without an AI key — this is the product's front door, not a degraded
  afterthought. Never reintroduce a fatal key check in `server.ts`.
- **Determinism receipts**: `contentHash`-keyed reproducibility is a load-
  bearing product claim, not an implementation detail — preserve it through
  every new feature that touches scoring or diagnosis.
- **Honest degradation**: every LLM-gated feature must degrade to a labeled,
  functional fallback when keyless — never a silent quality drop and never
  a 500.
- **Calibration corpus controlled-richness constraint**: the 20-sample
  corpus is a controlled experiment — all bands share scene/word budgets and
  structural-signal presence so craft is the only variable. Never rebalance
  one band's richness without matching every other band.
- **No console in server**: CI-enforced grep over `server/**`; use
  `server/lib/logger.ts` instead.

---

*Wave rotation order (Program v1, closed at Wave 1181) and revision pipeline
execution order are two different 14-pass orderings — do not conflate them.
See `ARCHITECTURE.md`'s pipeline list and `CLAUDE.md`'s rotation list for the
(different) sequences.*

## Pre-deployment audit (2026-07-10) — S-wave fix plan

Two read-only audits (ops + security). BLOCKERS:
- SEC-1: /api/ai-config SSRF + unauthenticated GLOBAL provider hijack —
  baseUrl has no host/scheme allowlist; config is process-global; /test
  fires the request. Anon visitor can hit cloud metadata AND redirect
  every session's AI traffic. (validation.ts:143, ai-config.ts:55,
  openai-compat.ts:75)
- SEC-2: O(n^2) analyzer DoS — overlapClusters/detectQuestionLatency/
  computeContentWordClueClusters unbounded; DoctorBodySchema caps bytes
  not scene count. Crafted many-scene script freezes the shared event
  loop. (cluster.ts:591, fountain-analyzer.ts:1118/1314)
- OPS-1: no process.on(uncaughtException/unhandledRejection) — a
  rejection from the sweep intervals crashes the container, nothing
  restarts a bare docker run.
- OPS-2: /metrics fully unauth — leaks token usage, est_cost_usd,
  session counts (config.ts:30).
- OPS-3 (wave 2): no release pipeline / tags / version / health SHA.
- OPS-4 (wave 2): no backup job (README documents, nothing calls it).
SHOULD folded into S-wave: CSV formula injection (breakdown.ts:644),
collab token no room-ownership (collab.ts:12), run-room limiter tier
mismatch (game.ts:245), no prod CSP (app.ts:97), container runs root.
NICE: 4 transitive dev-dep CVEs (npm audit fix), ai-config/test error
snippet. Clean: session capability model, HTML export escaping, prompt-
injection boundary, secrets never in bundle/logs, body/rate limits.
