# SCORING_ENGINE_AUDIT — Phase A (2026-07-11)

Audit-first deliverable for the Narrative Evaluation & Selection Kernel program.
Inspect before modify; baseline before redesign. This documents the CURRENT
engine exactly; the frozen baseline is in `BASELINE_2026-07-11.md`. No redesign
here, no improvement claimed.

## 1. Current architecture — two distinct scoring surfaces

### 1a. Script Doctor (grades ONE script) — `server/nvm/analyze/doctor.ts`
Entry: `runScriptDoctor(fountain)` → `ScriptDoctorReport`.
- **Health** (`doctor.ts:416-423`): `health = round₁(clamp₀‑₁₀₀(100 − craftPenalty))`.
- **craftPenalty** (`:381-387`) = `densityPenalty + scarcityPenalty`.
- **weightedIssues** (`:341`) = `4·critical + 1.5·major + 0.5·minor`.
- **densityPenalty** (`:328-349`): if density≥1, `DENSITY_SCALE·(weightedIssues / wordCount^WORD_COUNT_EXPONENT)^DENSITY_POWER`; else a logistic. Constants: `WORD_COUNT_EXPONENT=0.7`, `DENSITY_POWER=3.75`, `DENSITY_SCALE=2.5`, sub-density `SCALE=10 / MID=0.52 / STEEP=50`.
- **scarcityPenalty** (`:355-358`) = `SCARCITY_SCALE(140) / max(sceneCount,1)`.
- **Structural deductions** (`:1615-1644`): SCENE_CONTINUITY (`rollup 14 + 2/instance, cap 20`) + GLOBAL_ARC (flat `6`), combined cap `24`; subtracted after base health.
- **Grade** (`:576-582`): 90/75/55/35 → excellent/strong/solid/uneven/troubled.
- **Verdict** (`:589-593`): `health≥85 ∧ scenes≥8 → RECOMMEND`; `health<60 → PASS`; else `CONSIDER`.
- **5 dimensions** from 14 passes (`:630-636`): structure-pacing, character, dialogue-voice, plot-logic, theme-originality. Per-dimension penalty uses a DIFFERENT curve (`DENSITY_POWER_DIM=1.5, SCALE_DIM=100`, no scarcity) (`:531-543`).
- **Percentile calibration** (`calibration/percentile.ts:40-57`, `reference.ts`): mean-rank percentile vs a reference distribution; empty→50; `MIN_CORPUS_SIZE=8`. Ranks the UNCLAMPED `computeRawCraftScore`, not the displayed health.
- **Severity → weight** is the only aggregation input. The **W1 confidence-tier×determinism contract** (`revision/passes/confidence.ts`) exists but is **INERT**: `doctor.ts` calls `weightedIssues()` without `tierAware`, so tiers do not yet affect health.

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
- Tests: 9,032 total (0 fail, 1 todo); discrimination pairs; env-gated real-corpus AUC. **No human-preference labels, no calibration tests, no pairwise/ranking tests, no metamorphic/adversarial score-movement suite.**

## 2. Failure analysis (mapped to the directive's checklist)

| # | Directive concern | Verdict in this engine | Evidence |
|---|---|---|---|
| Hard mixed with soft | **Partly.** Doctor folds structural deductions + density into ONE health scalar. Converge separates Tier-1 (gate) from composite (rank), which is cleaner. | doctor `:1641`; loop `:402` |
| Single weighted sum decides | **YES — two of them.** Health (single scalar) and `0.6·tension+0.4·quality` (single scalar) are the decision makers. Exactly the Goodhart risk the directive warns of. | loop `:336`, doctor `:416` |
| Magic weights, no derivation | **Many.** `0.6/0.4` composite, `DENSITY_POWER 3.75`, `SCARCITY_SCALE 140`, structural `14/2/6/24`, verdict `85/60/8`, grade `90/75/55/35`, tier `1.0/0.7/0.4`. Some measured (0.7 exponent), most "hand-tuned". | doctor, loop, confidence.ts |
| Duplicated / correlated criteria | **Unmeasured risk.** tension/conflict/stakes/pressure/emotional-intensity likely correlated; structure+pacing+rhythm share a dimension. No correlation map exists. | — |
| Incompatible score ranges | **YES.** health 0–100, composite 0–1, tension normalized, quality 0–100 combined without a common scale. | loop `:336` |
| Uncalibrated probabilities | **YES.** No Platt/isotonic; percentile is empirical rank; tier multipliers are guesses; "confidence" fields unused/unvalidated. | confidence.ts, percentile.ts |
| Global score ignores genre/phase/scene-function/author-intent | **CONFIRMED.** Health formula is genre-agnostic; genre only shifts rule thresholds (`genre-router.ts`), never the aggregation. No phase/scene-function/author-intent conditioning of weights. | doctor formula |
| Pointwise treated as truth | **YES.** Health & composite are point estimates presented as fact; no pairwise final comparison. | — |
| Position/verbosity/format/model bias | **CONFIRMED (verbosity).** Phase-B metamorphic suite: appending stateless filler RAISED health +6.0 (66.4→72.4) — the density penalty rewards word count. Format/rename/whitespace invariance holds. | doctor `:328-349`; `evals/scoring` |
| Scores without evidence | **Partial.** Issues carry location/rule; the aggregate health/composite carry NO evidence trace of why the number is what it is. | — |
| Scores without uncertainty | **CONFIRMED.** Point estimates only; no intervals; W1 confidence is inert; no abstention. | — |
| Judges can't abstain | **CONFIRMED.** No abstention anywhere (also found in the coverage-gap analysis). | — |
| Local optima / no long-horizon in selection | **CONFIRMED.** Converge is greedy forward argmax; twin/whatif not used for selection. | loop, twin |
| Untested score changes | **Partial.** Discrimination + AUC guard structural changes, but `0.6/0.4` and most constants have no human-label regression test (no labels exist). | tests |
| Dead / contradictory scoring code | **Minor.** Two raw-score paths (`computeRawCraftScore` vs `computeDimensionScore`) coexist for display vs calibration — documented, not contradictory. | doctor `:726-741` |

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
