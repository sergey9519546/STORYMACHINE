# STORYMACHINE — Roadmap

Durable master plan. Any session with fresh context (no memory of prior work)
should be able to read this file top to bottom and resume exactly where the
project stands — what shipped, what's mid-flight, and what's next, in order.

Ground yourself before touching code: `NORTH_STAR.md` (constitution — read
first), `ULTRAPLAN.md` (current spine, supersedes stale sequencing below),
`CLAUDE.md` (conventions + Wave Program v2), `ARCHITECTURE.md` (system map),
`server/nvm/revision/WAVE_QUALITY_GUARANTEE.md` § "Program v2" (binding
quality spec for wave work), and `git log --oneline -40` for the session's
commit trail.

---

## 1. Current state (measured, 2026-07-11)

- **Discrimination**: 6/6 pairs order correctly; 5 hard in CI (+1.4 to
  +6.2 margins); composite-reviewer-scenario orders (+2.2) but the 5.0-pt
  minimum-gap guard is still `todo` — diagnosed as ~19 style-minor false
  positives flooding the good half.
- **Corpus**: 72 produced scripts (70 animation + Pulp Fiction + Jaws — the
  first live-action entries), all RECOMMEND, manifest-locked with
  content-hash verification, env-gated harness (corpus text never enters
  git).
- **Degradation AUC**: shuffle-drop AUC-24 hard floor 0.622 (measured
  0.672), AUC-71 ~0.652. Act-swap recipe ~0.48 — near coin-flip; diagnosed
  root cause is structural, not a missing detector: lexicon signals carry
  content, not position (see NORTH_STAR.md SS2). Closing this gap needs
  semantic channels that read for document POSITION.
- **Rulebook**: 3,216 rules, staleness-tested. Suite green (see CI for exact
  count — do not hardcode a stale number here across sessions).
- **E2E**: keyless journey harness landed (7 journeys), found + fixed a
  silent Stage.ts FK bug.
- **Structural deduction path** (the feature-scale answer to density
  normalization eating rule families, NORTH_STAR SS2): SCENE_CONTINUITY
  (two-tier gate + location-run corroboration axis, 2.0/instance cap 20,
  verdict cap) + GLOBAL_ARC_INCOHERENCE (weak, zero false-positive).
- **Tier-1 rules landed**: COINCIDENCE_RESOLVES_PROBLEM,
  RELATIONSHIP_REPAIR_UNEARNED, REINCORPORATION_VOID, CLIMAX_NO_AFTERMATH.
- **Filed, not built** (tracked below by reference, not duplicated): OWNE
  O1-O5 (SS4), STORY GOD SG1-SG6 (SS4), D-wave seeded divergence (SS6),
  MASTER_RESEARCH_AUDIT's 3-tier queue (SS6), deep-read arc signals (needs
  an AI key), OCR recovery (4 scans), composite min-gap guard wave (SS3),
  content-word clue channel SceneUnit.characters gap (SS4), frontend
  tests, auth implementation, Run 17b polish, B-wave 2/3 + R-wave
  remnants (SS6).

## 2. Resume protocol (how any session continues)

- Work on the session-designated branch. **Never hardcode a branch name** —
  read it from the current checkout.
- Per workstream: dispatch focused agents on **disjoint file sets**.
  Shared-file collisions are the project's main recurring hazard — enforce
  one owner per file per wave/run. Parallel sessions are real (two sessions
  have independently built the same detector and merged concurrently
  before) — pull `main` and check `git log` for overlapping work before
  starting anything.
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
- **Measure before threshold, on the real corpus, always** — every detector
  that skipped this died or misfired (NORTH_STAR SS1).

## 3. Standing principles (unchanged, from CLAUDE.md)

- **Quality bar**: build the strongest version of a change, not the
  quickest one that passes — edge cases handled, inputs guarded, fire +
  no-fire tests for every new rule, consistency with the surrounding
  file's patterns.
- **Security constraints**: API keys live only in `.env` (gitignored),
  never serialized to clients; all AI calls are server-side only; every
  route sits behind `gameLimiter` or the stricter `aiLimiter`; no new
  `console.*` under `server/**` (CI-enforced).
- **Keyless-first**: the server boots and operates in analysis-only mode
  without an AI key — this is the product's front door, not a degraded
  afterthought. Never reintroduce a fatal key check in `server.ts`.
- **Determinism receipts**: `contentHash`-keyed reproducibility is
  load-bearing — preserve it through every new feature that touches
  scoring or diagnosis.
- **Honest degradation**: every LLM-gated feature must degrade to a
  labeled, functional fallback when keyless — never a silent quality drop
  and never a 500.
- **Calibration corpus controlled-richness constraint**: the 20-sample
  corpus is a controlled experiment — all bands share scene/word budgets
  and structural-signal presence so craft is the only variable. Never
  rebalance one band's richness without matching every other band.
- **No console in server**: CI-enforced grep over `server/**`; use
  `server/lib/logger.ts` instead.

*Wave rotation order (Program v1/v2) and revision pipeline execution order
are two different 14-pass orderings — do not conflate them. See
`ARCHITECTURE.md`'s pipeline list and `CLAUDE.md`'s rotation list.*

---

## 4. Completed history (changelog)

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

---

## 5. Open work (reprioritized, filed items tracked by reference only)

### 5.1 Deep-read arc signals — THE AUC path (highest priority)

Act-swap AUC (~0.48) is the clearest open gap against NORTH_STAR's
separation-margin metric, and it's structurally diagnosed: lexicon signals
detect content, not position. Deep-read (Run 10's LLM-per-scene sensing,
already landed) is the existing mechanism to extend — it needs to emit
document-POSITION-aware signals (expected-vs-actual narrative position,
setup/payoff distance, act-boundary coherence), not just per-scene content
signals, feeding the same deterministic record-signal schema. Design-doc
first (this is an L). Needs an AI key to develop against (deep-read is
LLM-gated); keyless fallback must degrade honestly per standing principles.

### 5.2 Composite min-gap guard wave

Close the 5.0-point minimum-gap floor on `composite-reviewer-scenario`
(`tests/core/discrimination.test.ts`). ~19 style-minor false positives
flood the good half. Same length-normalization discipline as the earlier
rhythm-guard wave: measure each offending rule on the corpus first;
TALKING_HEADS (24/69) and OPENING_SCENE_UNDERWEIGHT (22/69) are the next
worst offenders after the two already fixed by D2-wave. Heavily
calibration-guarded — do not regress band monotonicity or length-invariance
while tightening this.

### 5.3 OWNE O1 typed promises + STORY GOD SG1 (converged item)

`docs/owne/` vendors a 22-entry promise-template library (PT_*). O1 adopts
the PT_* shape onto SEED_CLUE/PAYOFF_SETUP (type + hard/soft + priority +
payoff predicate class) — StoryOp contract change, sequence with
record-parity. SG1 (Well-Made Surprise Test: preTwistSatisfaction >= 0.6,
hindsightInevitability >= 0.7, >= 3 setups, misdirectionEffectiveness >=
0.5) is deterministic over the same setup/payoff ledger and converges with
O1 — do them together. Do together with the content-word clue-channel
rebuild (5.6) — same subsystem, one migration. Full spec: ROADMAP history
had this at "13d" and "13e" in prior drafts of this file; canonical
source now is `docs/owne/TRUTH_REGISTRY.md` and
`docs/research-audit/MASTER_RESEARCH_AUDIT.md`.

### 5.4 OWNE O2 — Tavern Letter golden fixture + Integrity Rate

Import the vendored Tavern Letter fixture (world fluents, STRIPS schemas,
physics invariants, golden path, negative tests) as an ops/scenario. Add
IR = (1/T)*Sum 1[event legal AND invariants hold] over sim traces; CI-assert
IR = 1.0 and Halluc = 0 on the golden path, plus its negative tests
(early-accusation gate, teleport prevention, double possession, herring
non-softlock). Proves the sim layer the way the 72-script corpus proves the
doctor. Self-contained — any session can pick this up.

### 5.5 OWNE O3 — Assertion containment on generative output

Registry law: Asserted(output) subset-of licensed facts union common
ground. Every LLM rewrite/candidate gets a deterministic post-check that
its prose asserts no unlicensed facts (entity/fact extraction vs. session
canon + input span). Generalizes the filed Semantic Firewall item to ALL
generation paths — the strongest trust upgrade on the generative side. Gate
D-wave's divergence operators (5.6) behind this once both exist.

### 5.6 MASTER_RESEARCH_AUDIT Tier 1 remnants + Tier 2 channels

Tier 1 (deterministic, wave-sized, corpus-measurable — ranked, pick next):
Dialogue-information ratio (<=40% via dialogue) + anti-sentimentality;
Burrows's-Delta voice differentiation (function-word z-scores); effort-
supremacy / first-try-success flag + want-need opposition validator +
antagonist defensibility (No Pure Evil); silence/letting-go excellence
detectors; Oxytocin window (no post-climax settling beat >= ~1 page);
dialogue attribution at scale; mirror-scene detection + Scene Transition
taxonomy. (Coincidence-direction, relationship-repair-proof, and
reincorporation-density are DONE — see the Tier-1 rules already landed in
SS1.)

Tier 2 (signal channels, Type-1 waves): ArcDebt typed object; pacing
triple (tensionVelocity/acceleration/rhythmRegularity); dramatic-irony
tracker / AudienceState; Emotional Arc DSL vs. Reagan's six shapes;
scene-state pacing model; narrative stance vector; signed
relationship-graph harmony-bias detector.

Tier 3 (architecture, design-doc-first) and the full research provenance
map: see `docs/research-audit/MASTER_RESEARCH_AUDIT.md` directly — not
duplicated here to avoid drift between the two files.

Also filed under this item, from OWNE: **O4** belief-movement surprise
channel (explicit hypothesis distribution over who/what/why, per-scene
TV-distance Surprise(e) = 1/2 * ||mu_e - mu||_1 — replaces lexicon-intensity
twist proxies with real math); **O5** mystery fairness gates (Type 3,
genre-routed: min_true_clues_before_solve >= 2, red-herring non-softlock,
solution-clue reachability before reveal). And from STORY GOD: **SG2**
Genre Obligation Engine (per-genre obligatory scenes with act deadlines);
**SG3** Cold Open Promise Tracker (opening-vs-final-image mirroring — a
shuffle-sensitive document-scale signal, candidate axis for the
degradation-AUC spine, see 5.1); **SG4** pattern-establishment rule
(minimum 3 exposures before subversion is legal); **SG5** Causality
Enforcer (coincidence allowed in Act 1 only, must gain meaning later).
Deliberately NOT adopted: Five-Evaluator LLM negotiation as a scoring
surface (NORTH_STAR rejects LLM judges outright).

### 5.7 Deployment items

E2E browser journeys (Playwright, upload->doctor->fix-verify / what-if /
interview / coverage export — nothing has been clicked end-to-end in a real
browser, only the keyless API-level harness exists); frontend component
tests (start with `ScriptDoctorPanel` formula-versioning + sample
provenance, `StartScreen` sample handoff); auth implementation
(`docs/AUTH.md` documents the trust model, nothing enforces it — blocks
public multi-user deploy only); Run 17b polish (panel consolidation from
24+ flat buttons, accessibility pass, dedupe the two hand-rolled Fountain
parsers in `src/services/director.ts` and `src/lib/fountain.ts`, `.fdx`
direct client import instead of toast-redirect).

### 5.8 Corpus growth

OCR recovery of the ~4 remaining dropped scans; the 155-screenplay sourcing
index (`Film_Script_Research_Report.docx`, 91.6% publicly available,
per-title sources — cataloged as SG6) is the acquisition map for growing
the corpus 72 -> 150+ across eras/genres. Repo-hygiene caution attached:
this work has hit OneDrive file truncation before — stage via the sandbox,
copy with byte-count verification, keep `.git` operations on the Windows
side.

### 5.9 D-wave, R-wave, and B-wave remnants (filed, not scheduled)

**D-wave** (seeded divergence operators, research-backed): stimulus module
+ Osborn-style angle operators + opt-in divergence knob on
`/api/nvm/converge`. Gate behind O3 assertion containment (5.5) once it
exists, so divergent candidates are contained from day one. **B-wave 2**
remainder: menace target-curve delta audit, contradiction families
(PHYSICAL/KNOWLEDGE/MOTIVATION/TIMELINE) over rootCauses. **B-wave 3**:
setup/payoff typing beyond O1's scope, defense-cascade arousal states +
Id/Ego/Superego arbitration, arc meter, narrator-reliability score,
cognitive-illusion ledger, retrieval scoring with recency + salience.
**R-wave** residue not covered by O4/O5: scene economy score + value-shift
contract, fair-play mystery solver, confusion-vs-mystery metric, speech-act
signal channel, epistemic contract + unreliability budget, clock
segments/threat fronts/antagonist autonomy, canon tiers + retcon
governance, evaluator hard-veto audit, benchmark scenario suite. Filed
deliberately unscheduled within R-wave: BOID obligations, factions,
spatial line-of-sight, streaming tags, TTS/storyboards.

---

## 6. Pre-deployment audit (2026-07-10) — S-wave fix plan

Two read-only audits (ops + security) found BLOCKERS still open as of this
writing — verify against current code before assuming any are stale:
- **SEC-1**: `/api/ai-config` SSRF + unauthenticated GLOBAL provider
  hijack — `baseUrl` has no host/scheme allowlist; config is
  process-global; `/test` fires the request. (`validation.ts:143`,
  `ai-config.ts:55`, `openai-compat.ts:75`) — PARTIALLY ADDRESSED by
  PR #200's `ADMIN_TOKEN` gate on config writes; re-verify the SSRF
  allowlist specifically is still open.
- **SEC-2**: O(n^2) analyzer DoS — `overlapClusters` /
  `detectQuestionLatency` / `computeContentWordClueClusters` unbounded;
  `DoctorBodySchema` caps bytes, not scene count. (`cluster.ts:591`,
  `fountain-analyzer.ts:1118`/`1314`)
- **OPS-1**: no `process.on(uncaughtException/unhandledRejection)` —
  a rejection from the sweep intervals crashes the container.
- **OPS-2**: `/metrics` fully unauth — leaks token usage, `est_cost_usd`,
  session counts (`config.ts:30`).
- **OPS-3** (wave 2): no release pipeline / tags / version / health SHA.
- **OPS-4** (wave 2): no backup job (README documents, nothing calls it).

SHOULD folded into S-wave: CSV formula injection (`breakdown.ts:644`),
collab token no room-ownership (`collab.ts:12`), run-room limiter tier
mismatch (`game.ts:245`), no prod CSP (`app.ts:97`), container runs root.
NICE: 4 transitive dev-dep CVEs (`npm audit fix`), ai-config/test error
snippet. Clean at last audit: session capability model, HTML export
escaping, prompt-injection boundary, secrets never in bundle/logs, body/
rate limits.
