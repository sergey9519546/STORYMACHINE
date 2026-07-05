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

- [ ] **(M)** Draft-history formula versioning: `ScriptDoctorPanel`'s
  `localStorage` entries store health scores from the OLD (length-biased)
  formula. A first diagnosis under the new opportunity-normalized formula
  shows a phantom ~50-point drop. Add `formulaVersion` to stored entries
  (current = 2); cross-version comparisons must render "scoring model
  updated — not comparable" instead of a numeric delta.
- [ ] **(S)** PDF route DoS margin: `/api/scriptide/doctor/pdf` accepts up to
  15MB behind the general `gameLimiter` (120/min) — theoretical ~1.8GB/min
  per client. Add a dedicated, stricter limiter (e.g. 10/min) to this route.
- [ ] **(S)** Log hygiene: session ids ride SSE query strings. Audit
  `server/app.ts` request logging so full query strings (session ids are
  isolation capabilities, not opaque identifiers) are not written to logs.
- [ ] **(S)** PR #173 body refresh at close: update test count, session
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

- [ ] **(M)** Rewrite `ARCHITECTURE.md` around the real organizing principle:
  a **deterministic core** (audit/verdicts/percentiles/counterfactuals/
  critics/receipts — keyless) inside a **generative shell** (candidates/
  rewrites/voices — opt-in, labeled, degradable). Add `analyze/`, `whatif/`,
  and `calibration` to the subsystem table (currently missing). Correct the
  converge description — it is writer-in-the-loop (winner returned +
  `/commit` re-proves), **not** "the best candidate is committed," which is
  no longer true. Add a Program v2 pointer, the keyless boot posture, and
  session identity to the doc.
- [ ] **(L)** Record-parity harness: two producers of `ScreenplaySceneRecord`
  exist — ops-derived (`screenplay/memory.ts`) and text-derived
  (`fountain-analyzer.ts`) — and Wave 1182 added text-only optional fields to
  the latter. Build a golden-story parity test: author the same story both
  as ops and as Fountain text, assert signal agreement within tolerances, so
  the two halves can't silently drift apart. This is the trust foundation for
  any future sim-driven doctor report (see Run 9's dependency into Run 13).
- [ ] **(M)** Split `server/routes/nvm.ts` (~1,900 lines, 50+ routes) into
  cohesive modules — it was the #1 agent-collision file this entire session.
- [ ] **(S)** Frontend chunk splitting: the `ScriptIDE` chunk is >530KB;
  lazy-load its heavy panels.

### CYCLE 1 HEALTH GATE VERDICT (waves 1183-1186 — first gate run)
Zero DEAD rules of 12 (hard floor met); band separation untouched
(61.62/53.07/38.68/36.03, strictly monotonic). Pattern surfaced: leaf-level
Type-1 signal waves (1182, 1186) are corpus-INVISIBLE — the 20 samples are
short controlled fixtures without dense dyad dialogue — while Type 2/4 waves
(aggregating corpus-proven signals) land LIVE immediately; Type 3 is
structurally exempt (corpus runs genre-absent, permanently). Guards were NOT
loosened to manufacture fire (precision over vanity, per guarantee doc).
- [ ] **(S)** PREREQUISITE before cycle 2's Type-1 wave (1190): either
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

- [ ] **(L)** LLM reads each scene and emits the **same** deterministic
  record-signal schema consumed by the revision passes today. Model senses,
  rules verdict — no new judgment surface, only a richer signal source.
- [ ] **(S)** Cache by scene-content hash (the `repro/` LLM cache already
  exists — reuse it, don't build a second one).
- [ ] **(S)** Keyless fallback: when no AI key is configured, fall back to
  the existing lexicon signals untouched — Deep Read must degrade honestly,
  never 500 or silently return worse data unlabeled.
- [ ] **(S)** Opt-in "Deep read" toggle on the doctor/diagnose UI, off by
  default.
- [ ] **(S)** New `aiLimiter`-gated route variant (Deep Read fans out to an
  LLM per scene — it cannot ride `gameLimiter`).
- [ ] **(M)** Prompt-injection hardening: scene text is untrusted input into
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

- [ ] **(L)** From a root-cause finding (Run 5's cluster work, or any
  existing pass issue), let the writer request a targeted rewrite of the
  affected span(s) only — labeled generative output, `aiLimiter`-gated,
  `approvedSpans` (span-lock mechanism from this session) honored so locked
  text is never touched.
- [ ] **(M)** Doctor re-runs automatically after the rewrite lands.
- [ ] **(M)** Before/after delta proof: health score delta, issues cleared,
  issues introduced — shown to the writer, not just implied.
- [ ] **(S)** Writer accepts the diff into the editor (or rejects it — the
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

## 9. Run 13 — Keyless deterministic simulation

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

## 10. Run 14 — Producer tier (revenue features)

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

## 11. Run 15 — Trust & publishing

- [ ] **(M)** Rulebook generation: extract all ~1,300 rules (name, pass,
  description) into browsable docs. This is both a depth proof and an SEO
  asset — a claim black-box competitors structurally cannot make.
- [ ] **(S)** Calibration methodology writeup: explain the controlled-richness
  corpus design in plain language for an external audience.
- [ ] **(M)** Verify endpoint: `POST` a report's `contentHash` + the Fountain
  text; server re-runs the doctor and attests byte-equality. This is the
  determinism badge — checkable by anyone, not just internally.

---

## 12. Run 16 — Deployment hardening

- [ ] **(M)** Session TTL / eviction audit, plus `data/` disk growth caps
  (one SQLite DB per session — this grows unbounded today).
- [ ] **(M)** Real auth decision: session ids are unguessable capabilities
  today but there is no authentication layer. Decide and document the
  intended trust model before this ships wider.
- [ ] **(S)** Rate-limit keying review (currently per-process; verify it's
  correct per-session with `X-Session-Id` now in play).
- [ ] **(S)** Backup story for persisted sessions (no durability story exists
  today beyond the SQLite file on disk).
- [ ] **(S)** Residual formula bias follow-up: the opportunity-normalization
  constants in `doctor.ts` are tied to current rule density. Revisit after
  Waves 1183–1186 land, since those waves will shift rule density.

---

## 13. Run 17 — Polish

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
