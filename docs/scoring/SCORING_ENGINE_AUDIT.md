# SCORING_ENGINE_AUDIT — Phase A (2026-07-11; citations re-anchored 2026-08-11)

Audit-first deliverable for the Narrative Evaluation & Selection Kernel program.
Inspect before modify; baseline before redesign. This documents the CURRENT
engine exactly; the frozen baseline is in `BASELINE_2026-07-11.md`. No redesign
here, no improvement claimed.

> **2026-08-11 correction.** Every `doctor.ts` line cite in the original
> 2026-07-11 audit had drifted ~150–200 lines after subsequent commits (the
> 2026-07-15 density-continuity fix `980e461` and the 2026-07-29 P1 dialogue
> deduction `504d4c7`); three cites pointed at the wrong function entirely.
> Citations in §1a below are re-anchored to `main` HEAD (`c93403e`). Two
> deduction channels added after the original audit (arc-incoherence,
> dialogue-degradation) are now inventoried — the health formula is no longer
> just `100 − craftPenalty`. §1b/1c citations (converge `loop.ts`) were
> re-verified line-exact and are unchanged. §2 gains a new failure-mode row
> (double-counting across the four deduction channels) and the magic-weights
> inventory is expanded.

## 1. Current architecture — two distinct scoring surfaces

### 1a. Script Doctor (grades ONE script) — `server/nvm/analyze/doctor.ts`
Entry: `runScriptDoctor(fountain)` → `ScriptDoctorReport`.
- **baseHealth** (`computeHealthScore`, `:603-610`) = `round₁(clamp₀‑₁₀₀(100 − craftPenalty))`. This is the *intermediate* per-step score — three more deductions apply after it (see **Final health** below), so it is NOT the displayed health on its own.
- **craftPenalty** (`:568-574`) = `densityPenalty + scarcityPenalty`.
- **weightedIssues** (inlined at `:367` inside `densityPenalty`, and again at `:726` inside `dimensionDensityPenalty`) = `4·critical + 1.5·major + 0.5·minor`. ⚠ The 2026-07-11 audit claimed "doctor.ts calls `weightedIssues()` without `tierAware`" — that was mechanistically wrong: doctor.ts does **not** import or call the `weightedIssues()` helper in `revision/passes/confidence.ts`; it inlines the same arithmetic. The downstream conclusion (the W1 confidence-tier system is inert w.r.t. health) is still very likely true, just via a different path — no code path feeds `tierAware` into `craftPenalty`/`densityPenalty`.
- **densityPenalty** (`:342-375`): for density<1, logistic `SUB_DENSITY_SCALE/(1+e^(−STEEP·(density−MID)))`; for density≥1 (CONTINUITY FIX `980e461`, 2026-07-15), `SUB_DENSITY_SCALE + DENSITY_SCALE·(density^POWER − 1)`. ⚠ The 2026-07-11 audit printed the pre-fix `DENSITY_SCALE·density^POWER` form; the shipped curve adds a +`SUB_DENSITY_SCALE` (+10) offset at the seam so the function is continuous and monotonic across density=1 (the pre-fix had a ~7.5-point discontinuity that could *improve* health despite more weighted issues). Constants: `WORD_COUNT_EXPONENT=0.7`, `DENSITY_POWER=3.75`, `DENSITY_SCALE=2.5`, `SUB_DENSITY_SCALE=10`, `SUB_DENSITY_MIDPOINT=0.52`, `SUB_DENSITY_STEEPNESS=50`.
- **scarcityPenalty** (`:381-384`) = `SCARCITY_SCALE(140) / max(sceneCount,1)`.
- **Final health** (`:1982`) = `max(0, round₁( baseHealth − structuralDeduction − arcIncoherenceDeduction − dialogueDeduction ))`. **Four channels** — three are subtracted from baseHealth (`:1838`) *after* the [0,100] clamp:
  1. **structuralDeduction** (`:1931-1934`): SCENE_CONTINUITY rollup (detail cap `SCC_DETAIL_CAP=12` + pervasive gate) + GLOBAL_ARC flat `6` (`:1928`), combined under `STRUCTURAL_TOTAL_DEDUCTION_CAP=24` (`:1929`). *This* is the cap the 2026-07-11 audit documented — but it bounds only this sub-stack, not the total.
  2. **arcIncoherenceDeduction** (`:1955-1962`, added 2026-07-11B): `min(ARC_DED_CAP, ARC_DED_K·max(0, ARC_DED_REF − arcHealth))`. Constants `ARC_DED_MIN_SCENES=15`, `ARC_DED_REF=1.2`, `ARC_DED_K=8`, `ARC_DED_CAP=15` (`:1951-1954`). Feature-scale only (≥15 scenes) so the calibration/discrimination fixtures score byte-identically and need no re-lock.
  3. **dialogueDeduction** (`:1979-1980` via `dialogueDegradationDeduction` at `:448-475`, added 2026-07-29 P1): three independent linear ramps on `uniqueRatio<0.5` (+8 max), `meanWords<3` (+6 max), `vocabRichness<0.25` (+4 max), summed and capped at `DIALOGUE_DED_CAP=18`; suppressed below `DIALOGUE_DED_MIN_LINES=10`. Measured sepAUC 1.00 on all three signals.
  - **Worst-case total deduction above baseHealth = 24 + 15 + 18 = 57 points** (uncapped beyond the per-channel caps). A baseHealth of 72 can be driven to a displayed 15. (A climax-zone decay deduction was also tried for the structural channels — `probe-positional-signals` showed sepAUC 1.00 across SHUFFLE/DROP/RELOCATE — but **reverted**: it over-fired on real scripts with naturally flat climaxes and created inversions that dropped SHUFFLE/DROP AUC by ~0.08 each. Logged here so the next attempt isn't a repeat.)
- **Grade** (`gradeForHealth`, `:763-769`): 90/75/55/35 → excellent/strong/solid/uneven/troubled.
- **Verdict** (`verdictFor`, `:776-780`): `health≥85 ∧ scenes≥8 → RECOMMEND`; `health<60 → PASS`; else `CONSIDER`.
- **5 dimensions** from 14 passes (`buildDimensions`, `:985`): structure-pacing, character, dialogue-voice, plot-logic, theme-originality. Per-dimension penalty uses a DIFFERENT curve (`dimensionDensityPenalty`, `:718-730`: `DENSITY_POWER_DIM=1.5`, `DENSITY_SCALE_DIM=100`, no scarcity term, no continuity offset).
- **Percentile calibration** (`server/nvm/analyze/calibration/percentile.ts` + `reference.ts:262`): mean-rank percentile vs a reference distribution; empty→50; `MIN_CORPUS_SIZE=8`. Ranks the UNCLAMPED `computeRawCraftScore` (`:587-593`), not the displayed health — so a script clamped to 0 still ranks on *how badly* it clamped.
- **Severity → weight** is the only aggregation input to baseHealth. The **W1 confidence-tier×determinism contract** (`revision/passes/confidence.ts`) exists but is **INERT** in the health path (see the weightedIssues note above).

### 1b. Converge / candidate SELECTION — `server/nvm/converge/loop.ts`
Entry: convergence loop ranks GENERATED candidates.
- **Composite** (`loop.ts:336`): `compositeScore = 0.6·tensionNorm + 0.4·qualityScore` — a single hard-coded weighted sum.
- **Selection** (`:402`): greedy argmax of composite among candidates that pass **Tier-1** proofs.
- **Tie-break** (`:420-421`): Tier-3 originality rank, then composite — but ONLY when ≥2 candidates converge in the same iteration; otherwise composite alone.
- **Gates**: Tier-1 (8 hard proofs) = block/ghost on fail; Tier-2 (6 quality gates) = flag → feed back as constraints, not scored; Tier-3 (2: genericness, originality) = ranking signal; Tier-4 (2: bias, attribution) = advisory only.
- **Writers' room** (`room/room.ts`): 12 **rule-based** critics (zero LLM). They drive **operator/mutation selection**, NOT candidate scoring; `hardObjections` are surfaced but **not enforced** as vetoes in the loop.
- **Long-horizon**: `twin/counterfactual.ts`, `whatif/explore.ts` are **diagnostic only** — never fed into selection. Selection is forward-only greedy.
- **Preference learning**: `selfplay/mine.ts` mines operator effectiveness (frequency/mean-score) to bias operator choice — NOT candidate ranking. No Bradley-Terry / pairwise / reward model anywhere.

### 1c. LLM judges / model calls in scoring
**None own a score.** Grep confirms zero `generateContent` in the ranking/selection path; all critics and gates are deterministic. NORTH_STAR "no LLM judge owns canon" is **upheld** in scoring. (LLM is used elsewhere for generation/rewrite/rendering, gated.)

### 1d. Contracts / API / tests
- Finding contract: `RevisionIssue { location, rule, description, severity, suggestedFix?, determinism?, confidenceTier? }`.
- Report: `ScriptDoctorReport { health, totalIssues, passes[], dimensions[], verdict, sceneCount, … }`.
- API: `POST /api/scriptide/doctor`, `POST /api/analyze-script`, converge routes.
- Tests: 9,903 pass / 78 skipped / 0 fail (1 discrimination `todo` annotating a known composite-gap blind spot); discrimination pairs; env-gated real-corpus AUC. **No human-preference labels, no calibration tests, no pairwise/ranking tests, no adversarial score-movement suite.** (The 2026-07-11 audit reported 9,032 tests; the metamorphic suite added since then covers identity/whitespace/rename/verbosity/scene-order *invariance*, but the directive's §14 *directional sensitivity* cases — "shuffle SHOULD drop the structure score" — are still absent. That gap is the immediate Phase-B slice to close.)

## 2. Failure analysis (mapped to the directive's checklist)

| # | Directive concern | Verdict in this engine | Evidence |
|---|---|---|---|
| Hard mixed with soft | **Partly.** Doctor folds structural deductions + density into ONE health scalar. Converge separates Tier-1 (gate) from composite (rank), which is cleaner. | doctor `:1982`; loop `:402` |
| Single weighted sum decides | **YES — two of them.** Health (single scalar) and `0.6·tension+0.4·quality` (single scalar) are the decision makers. Exactly the Goodhart risk the directive warns of. | loop `:336`, doctor `:1982`/`:603` |
| Magic weights, no derivation | **Many, and the 2026-07-11 inventory was incomplete.** Composite `0.6/0.4`; density `WORD_COUNT_EXPONENT 0.7 / DENSITY_POWER 3.75 / DENSITY_SCALE 2.5 / SUB_DENSITY_SCALE 10 / MID 0.52 / STEEP 50`; scarcity `140`; structural `SCC_DETAIL_CAP 12 / GLOBAL_ARC 6 / TOTAL_CAP 24`; **arc deduction `MIN_SCENES 15 / REF 1.2 / K 8 / CAP 15`**; **dialogue deduction `CAP 18 / MIN_LINES 10 / ramps 8/6/4`**; verdict `85/60/8`; grade `90/75/55/35`; tier `1.0/0.7/0.4`; dimension `POWER_DIM 1.5 / SCALE_DIM 100`. Some measured (0.7 exponent, the dialogue ramps' sepAUC 1.00), most hand-tuned. | doctor, loop, confidence.ts |
| Duplicated / correlated criteria | **Unmeasured risk.** tension/conflict/stakes/pressure/emotional-intensity likely correlated; structure+pacing+rhythm share a dimension. No correlation map exists. | — |
| **Criteria counted more than once (double-counting)** ⚠ NEW 2026-08-11 | **Unmeasured and now structurally worse.** The final health line (`:1982`) subtracts FOUR independent channels from baseHealth: density (which already counts every critical/major/minor structural rule), structuralDeduction (SCENE_CONTINUITY + GLOBAL_ARC), arcIncoherenceDeduction, and dialogueDeduction. A single underlying flaw — e.g. a scene-order collapse — can plausibly fire SCENE_CONTINUITY rules (→ density **and** structural), degrade arcHealth (→ arc deduction), and, if it scrambles dialogue distribution, perturb the dialogue signals — the same flaw taxed 2–4× under different names. No test asserts the channels are conditionally independent, and no fixture measures the tax paid by one realistic defect across all four. This is the most important *new* gap to close before any redesign. | doctor `:1982`, `:342-375`, `:1931-1962`, `:448-475` |
| Incompatible score ranges | **YES.** health 0–100, composite 0–1, tension normalized, quality 0–100 combined without a common scale. | loop `:336` |
| Uncalibrated probabilities | **YES.** No Platt/isotonic; percentile is empirical rank; tier multipliers are guesses; "confidence" fields unused/unvalidated. | confidence.ts, percentile.ts |
| Global score ignores genre/phase/scene-function/author-intent | **CONFIRMED.** Health formula is genre-agnostic; genre only shifts rule thresholds (`genre-router.ts`), never the aggregation. No phase/scene-function/author-intent conditioning of weights. | doctor formula |
| Pointwise treated as truth | **YES.** Health & composite are point estimates presented as fact; no pairwise final comparison. | — |
| Position/verbosity/format/model bias | **CONFIRMED (verbosity).** Phase-B metamorphic suite: the 2026-07-11 baseline rose +6.0 (66.4→72.4); the 2026-07-14 HEAD witness rises +6.5 (66.4→72.9). The density penalty rewards word count. Format/rename/whitespace invariance holds. | doctor `:342-375`; `evals/scoring` |
| Scores without evidence | **Partial.** Issues carry location/rule; the aggregate health/composite carry NO evidence trace of why the number is what it is. | — |
| Scores without uncertainty | **CONFIRMED.** Point estimates only; no intervals; W1 confidence is inert; no abstention. | — |
| Judges can't abstain | **CONFIRMED.** No abstention anywhere (also found in the coverage-gap analysis). | — |
| Local optima / no long-horizon in selection | **CONFIRMED.** Converge is greedy forward argmax; twin/whatif not used for selection. | loop, twin |
| Untested score changes | **Partial.** Discrimination + AUC guard structural changes, but `0.6/0.4` and most constants have no human-label regression test (no labels exist). | tests |
| Dead / contradictory scoring code | **Minor.** Two raw-score paths (`computeRawCraftScore` `:587-593` vs `computeDimensionRawScore` `:739-744`) coexist for display vs calibration — documented, not contradictory. | doctor |

## 3. Biggest structural gaps (feed the redesign, do not fix here)
1. **Two single-scalar decision makers** (health, `0.6·tension+0.4·quality`) — replace with hard-gate → floors → Pareto → QD-portfolio → pairwise, per directive §10.
2. **No hard/soft/author/risk/cost separation** — health blends legality-adjacent structural deductions with craft density; the score-vector redesign (`NarrativeScoreVector`) is the fix.
3. **No calibration, no uncertainty, no abstention, no evidence-on-aggregate.**
4. **No context conditioning** (genre/phase/scene-function/author-intent) in aggregation.
5. **No long-horizon in selection**; twin/whatif is diagnostic only.
6. **No human-preference labels** — nothing to calibrate against yet (Phase G blocker).
7. **Empirically over-firing heuristics** (coverage-gap analysis): INTENTION_INVISIBLE ~127×/film, a lexical/punctuation cluster on 100% of produced films, theme silent → the criteria set needs de-duplication + tiering (W1 already lays the contract).

## 4. Risk register (Phase A)
- **R1** No human labels → calibration/ranking phases (G) are blocked until labels exist. Highest risk.
- **R2** Reconstructed-Fountain baseline is imperfect; some rule fire-rates are conversion artifacts. Re-measure on the clean env-gated 72-corpus before acting on rule-level findings.
- **R3** OneDrive write hazard + `NODE_ENV=production` env (see EXECUTION_PLAN F0) — build/measure only off-OneDrive.
- **R4** Changing the health formula regresses the calibration manifest + discrimination + AUC ratchets — every change must pass those + a new frozen-baseline diff.
