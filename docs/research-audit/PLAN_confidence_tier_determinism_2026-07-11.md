# PLAN — Confidence-Tier × Determinism Finding Contract

Status: PLAN ONLY (no code committed). Prototyped once in the sandbox to
de-risk, verified, then reverted. This is the build spec for a real session to
execute against the branch it is assigned.

Companions: `RESEARCH_INTEGRATION_2026-07-11.md` (why), `ROADMAP.md` §7 (where in
sequence), `RESEARCH_FORMULAS_ALGORITHMS_SCHEMAS_2026-07-11.md` Part D.3 (the
source contract).

---

## 1. Why this is the highest-ROI upgrade (evidence, not assertion)

Verified against the actual code, not the audit summary:

- **The gap is real.** `grep` for `confidence_tier | gate_default | determinism |
  strong_evidence | worth_a_look | pattern_to_watch` across `server/` and `src/`
  returns **zero hits**. The reference engine's cleanest contract (Part D.3) is
  entirely absent from the shipped TS engine.
- **Change-impact is NOT the gap.** `twin/counterfactual.ts`, `whatif/explore.ts`,
  and the `twin-whatif.ts` route already exist — building change-impact would be
  re-work. This contract is genuinely missing; that is why it wins.
- **It maps onto an OPEN roadmap problem.** ROADMAP §5.2: "~19 style-minor false
  positives flood the good half" of `composite-reviewer-scenario`. Root cause,
  confirmed in code: the health formula in `server/nvm/analyze/doctor.ts`
  (`computeRawCraftScore`) is
  `weightedIssues = 4·critical + 1.5·major + 0.5·minor`, and the corpus emits
  **17 critical / 192 major / 3019 minor** issues. Every minor is weighted 0.5
  whether it is a deterministic structured finding or a lexical guess like
  `ACTION_ADVERB_FLOOD`. Nothing in the type system distinguishes the two, so
  heuristic floods out-vote structured signal by sheer count.
- **It encodes NORTH_STAR as a type invariant.** Today "hard blockers assert only
  encoded facts" is enforced by convention. This makes it a typed, testable rule.

## 2. What the contract adds (three orthogonal axes)

Reference engine keeps these separate; we mirror it exactly:

| Axis | Values | Meaning | Today |
|---|---|---|---|
| severity | critical / major / minor | how consequential IF true | exists on `RevisionIssue` |
| determinism | deterministic / structured_only / heuristic | HOW it was derived (epistemic basis) | **missing** |
| confidenceTier | strong_evidence / worth_a_look / pattern_to_watch | how strongly evidence supports it | **missing** |

Invariant (D.3): a `heuristic` finding may **not** be `critical` — critical is the
4× hard-block weight, reserved for findings that stand on encoded state.

## 3. Files touched (exact)

1. **NEW** `server/nvm/revision/passes/confidence.ts` — pure, zero-dependency
   module. Exports:
   - types `Determinism`, `ConfidenceTier`, `Gate`;
   - `SEVERITY_WEIGHT = {critical:4, major:1.5, minor:0.5}` (single source of
     truth, imported by doctor.ts on the tier-aware follow-up so the two paths
     provably agree);
   - `TIER_MULTIPLIER` (initial: strong 1.0 / worth 0.7 / pattern 0.4 — see §5,
     MUST be corpus-calibrated before switch-on);
   - `tierMultiplier(tier?)` → 1.0 when absent;
   - `gateForDeterminism(d)` → heuristic ⇒ soft_rank, else hard_blocker;
   - `isSeverityLegal(sev,d)` + `assertSeverityLegal(issue)` — the invariant guard;
   - `RULE_DETERMINISM` seed registry (`TALKING_HEADS`, `OPENING_SCENE_UNDERWEIGHT`
     → heuristic) + `inferDeterminism(rule)` morphology classifier for the
     `*_FLOOD / *_MONOTONE / *_DESERT / *_UNIFORMITY / *_OVERLOAD` families;
   - `defaultTierFor(d)`; `weightedIssues(issues, {tierAware?})`.
2. **EDIT** `server/nvm/revision/passes/types.ts` — add two OPTIONAL fields to
   `RevisionIssue`: `determinism?` and `confidenceTier?`. Additive: none of the
   ~3,200 existing emit sites change; absent ⇒ exact legacy behavior.
3. **NEW** `tests/passes/confidence.test.ts` — fire + no-fire (node:test,
   `assert/strict`, `.ts` imports), per the project harness convention.
4. **LATER, separate commit** `server/nvm/analyze/doctor.ts` — swap the inline
   `weightedIssues` expression in `computeRawCraftScore` for the module's
   `weightedIssues(issues, {tierAware: true})`. GATED on §5 measurement.

## 4. Staged rollout (why it cannot regress on landing)

- **Stage A — land inert (commit 1).** Module + optional type fields + tests.
  `weightedIssues()` with no options is byte-identical to the legacy sum, so the
  calibration corpus, discrimination harness, and every stored score are
  unchanged. The invariant guard only fires on issues that carry a
  `determinism`, of which there are none yet. Safe to ship immediately.
- **Stage B — classify + measure (no behavior change).** Tag the known heuristic
  rule families via `RULE_DETERMINISM` / `inferDeterminism`. Run the env-gated
  real-corpus harness (`REAL_SCRIPT_CORPUS_DIR`) and the discrimination test to
  MEASURE what tier-aware weighting would do to the 6 pairs and the §5.2
  composite gap. Tune `TIER_MULTIPLIER` on the corpus (measure-before-threshold,
  NORTH_STAR §1). Produce the before/after separation numbers.
- **Stage C — switch on (commit 2).** Only if Stage B shows the composite
  min-gap guard closes (or moves materially toward the 5.0-pt floor) WITHOUT
  regressing band monotonicity, length-invariance, the 6/6 discrimination
  ordering, or the shuffle-drop AUC hard floor (0.622). Re-lock the real-corpus
  manifest (health/verdict/sceneCount shifts expected — that is the point).

## 5. Known issue found during prototype — MUST handle

The tier multiplier introduces floating-point error: `19 · 0.5 · 0.4` evaluates
to `3.8000000000000003`, not `3.8`. The throwaway test asserting `=== 3.8`
failed (14/15 passed; this was the one). Health is `Math.round`ed downstream, so
this does not change any displayed score, but tests and any equality-sensitive
comparison must not assert exact tier-weighted floats. Resolution in the real
build:
- keep `weightedIssues` returning the raw float (rounding stays doctor.ts's job);
- in tests, assert with an epsilon (`Math.abs(x - 3.8) < 1e-9`) or round;
- document that only the LEGACY (no-tier) path is guaranteed exact-equal, which
  is the property Stage A actually depends on.

## 6. Test plan (fire + no-fire, per quality bar)

- **Legacy-exact regression (the load-bearing safety test):** `weightedIssues`
  with no options equals `4·crit + 1.5·major + 0.5·minor` exactly; tiers present
  but `tierAware` omitted ⇒ still legacy-exact. This is what proves Stage A can't
  regress calibration.
- **Invariant FIRE:** heuristic + critical ⇒ `isSeverityLegal` false;
  `assertSeverityLegal` throws.
- **Invariant NO-FIRE:** structured/deterministic + critical legal; heuristic +
  major/minor legal; issue with no determinism never guarded.
- **Classifier:** `TALKING_HEADS`/`OPENING_SCENE_UNDERWEIGHT` and the `*_FLOOD`
  family ⇒ heuristic; unknown/structural rules ⇒ structured_only (conservative
  full weight).
- **Tier down-weight (the §5.2 scenario):** 19 heuristic style-minors weigh less
  than 19 structured minors and less than their own legacy weight (with epsilon).
- **Override:** explicit `confidenceTier` beats the determinism-derived default.

Run one file fast: `node --experimental-strip-types tests/passes/confidence.test.ts`
then full `npm test` + `npm run lint` (tsc) + `npm run build` before push, per
ROADMAP §2.

## 7. Explicitly out of scope for this plan

Abstention output (Q4 also absent — smaller, do next), change-impact surface
(already exists — productize separately), and any generation-track work (MAESTRO
gates). This plan is the single tier/determinism upgrade only.

## 8. Repo-hygiene note

Repo is OneDrive-synced and currently CRLF-dirty (every file shows `M` on
whitespace only). Land the `.gitattributes` normalization (`* text=auto eol=lf`)
before or alongside commit 1 so this contract's diff is readable and not buried
in EOL churn. Prototype writes were byte-verified and reverted;
`git diff --ignore-all-space` on `types.ts` is empty.
