# STORYMACHINE_RESEARCH_AND_MATH

Authoritative technical + mathematical foundation for the 2026-07-11 synthesis.
Every equation carries a source ID (see SOURCE_LEDGER) and a verification label:

- **Quoted** — reproduced from the source as written.
- **Reproduced** — recomputed independently here (code run in-session). Applies to X(s) edge cases, the tier-weight float, Burrows's Delta, and the corpus-gate set arithmetic. CVaR/Priority are marked *sound by inspection* — sign/monotonicity checks, not numeric reproductions — and must not be read as empirical validation.
- **Spec-note** — an issue in source math **not yet implemented** in `server/nvm` (X(s) and the tier float are both this — pre-implementation, not running-system bugs).
- **Derived** — a StoryMachine-specific extension by the lead.
- **Unverified** — stated in a source, not independently checked.

Full verbatim interfaces/schemas live in DERIV-MATH; this doc adds *verification,
edge-case findings, and implementation implications*.

---

## Part 1 — Evidence themes (what we now know)

| Theme | Consensus across sources | Confidence | Source |
|---|---|---|---|
| Deterministic code owns canon; LLM only proposes | Unanimous (INTAKE-01/02/03/05 + CANON-NS) | **High** | all |
| Proof before prose; hard blockers assert only encoded facts | Unanimous | **High** | INTAKE-05, CANON-NS |
| Sparse, evidence-triggered specialists > permanent swarm | INTAKE-02 (#10), INTAKE-03 §10.5 | **High** | INTAKE-02/03 |
| Audit-first ("what breaks if I change this?") is the credible wedge | INTAKE-03 core thesis | **Moderate–High** (product judgment, not experiment) | INTAKE-03 |
| Compact JSON state can beat graph reasoning below a complexity threshold | INTAKE-02 insight #6 | **Low–Moderate** (unvalidated threshold) | INTAKE-02 |
| Autonomous full-script generation is the *least* credible first product | INTAKE-03 §1 | **Moderate** (market reasoning) | INTAKE-03 |
| LLM-as-judge is unfit as a scoring surface | INTAKE-02 (judges = secondary), CANON-NS (reject) | **High** | INTAKE-02, CANON-NS |

Currentness note: MAESTRO's flash-fiction results are a **testbed**, explicitly
not proof of transfer to screenplays (INTAKE-02 §1.6). Do not migrate generation
claims into product claims without separate screenplay evidence.

---

## Part 2 — Verified mathematics

### 2.1 Consistency X(s) — **defect found**
Source INTAKE-02 §5.2.4. **Quoted:**
$$X(s) = 1 - \frac{E_{\text{temporal}}+E_{\text{entity}}+E_{\text{knowledge}}+E_{\text{world}}+E_{\text{relationship}}+E_{\text{object}}}{Z}$$
where $Z$ normalizes for story length and tracked-entity count.

**Reproduced (in-session):** correct at the ends ($0$ errors $\to 1.0$; $\Sigma E = Z \to 0.0$) but **unbounded below zero** — $\Sigma E > Z$ yields negative "consistency" (e.g. $\Sigma E=15, Z=10 \to -0.5$).
**Derived fix:** clamp, $X(s)=\max\!\big(0,\ 1-\tfrac{\Sigma E}{Z}\big)$, and define $Z$ explicitly (proposal: $Z = w_1\cdot\text{scenes} + w_2\cdot\text{entities}$, weights corpus-fit). **Implication:** if used as a score input, the unclamped form can make a very broken script dominate a merely-flawed one in the wrong direction. Adopt only clamped.

### 2.2 Risk-sensitive utility (CVaR) — **sound BY INSPECTION, adopt for selection**
Source INTAKE-02 §5.5. **Quoted:**
$$U_{\text{risk}}(s) = \mathbb{E}[U(s)] - \lambda\,\operatorname{CVaR}_{\alpha}\big(L_{\text{continuity}},L_{\text{safety}},L_{\text{rights}},L_{\text{latency}}\big)$$
**Assessment:** dimensionally consistent (utility − λ·utility-loss); CVaR (expected loss in worst $\alpha$ tail) is the right tool for "rare but catastrophic canon/rights failures." **Implication:** the generate→audit→select loop should rank candidates by $U_{\text{risk}}$, not mean score — a candidate with a fatal continuity break in the tail must lose even with high average craft. **Derived:** in practice $\operatorname{CVaR}$ over a candidate pool of size $N$ = mean of the worst $\lceil \alpha N\rceil$ losses.

### 2.3 Revision-homogenization stop rule — **sound, adopt**
Source INTAKE-02 §5.6. **Quoted:** stop revising when
$$\frac{\mathbb{E}[\Delta H_r]}{\operatorname{Cost}(r)} < \tau_H \quad\text{or}\quad \mathbb{E}[\Delta N_r] < -\tau_N$$
($\Delta H_r,\Delta N_r$ = coherence/novelty deltas between revision $r{-}1$ and $r$). **Assessment:** directly encodes the measured "revision improves polish while reducing originality" risk (INTAKE-02 #7). **Implication:** the revision pipeline must retain pre-critique lineage and compute $\Delta N$ per pass — a concrete, testable gate the current pipeline lacks.

### 2.4 Change-impact propagation — **sound, multiplicative damping is the point**
Source INTAKE-03 §14.3–14.4. **Quoted:** impact set $I(C)=C\cup \text{Reach}^{+}(C,E_{\text{impact}})$;
$$\text{Impact}(v)=\text{EdgeStrength}(v)\cdot\text{NodeImportance}(v)\cdot\text{Confidence}(v)\cdot\text{ProximityDecay}(v)$$
**Reproduced:** multiplicative form means any weak factor (low confidence, high distance) damps the cascade toward 0 — so "a weak thematic association does not create a cascade equivalent to a hard causal precondition" holds mathematically. **Implication:** implement over the existing dependency edges; restrict $E_{\text{impact}}$ to invalidation-capable types (`causes/enables/requires_knowledge/requires_presence/sets_up/pays_off`). This is the highest-leverage product feature, but the current `twin/whatif` graph is over *generation* ops with inferred edges (see TARGET_SYSTEM/SOURCE_LEDGER) — for the audit product it must first be built over imported-script typed dependencies, and `Impact(v)` is unimplemented.

### 2.5 Finding priority — **sound; log-damping reproduced, monotonicity by inspection**
Source INTAKE-03 §17.1. **Quoted:**
$$\text{Priority}(f)=\alpha S_f+\beta\log(1+I_f)+\gamma C_f+\delta R_f+\epsilon A_f-\zeta U_f-\eta D_f$$
**Checked (monotonicity by inspection; log values reproduced):** monotone-increasing in severity/impact/confidence, decreasing in uncertainty/duplication; $\log(1+I)$ correctly damps impact-count inflation ($I{=}1\to0.69$, $I{=}100\to4.62$) so one high-fan-out node can't swamp the list. **Implication:** replaces ad-hoc issue ordering in the doctor; weights must be versioned + corpus-tuned.

### 2.6 Confidence-tier weighting — **defect found (float), fix specified**
Source INTAKE-05 D.3 + DERIV-PLAN. Health today: $\text{weighted}=4c+1.5m+0.5n$. Tier-aware: multiply each by tier multiplier (initial $1.0/0.7/0.4$). **Reproduced:** `19·0.5·0.4 = 3.8000000000000003 ≠ 3.8` (IEEE-754). **Implication:** keep raw float (rounding is the doctor's job) but assert with epsilon in tests; the legacy no-tier path is exact-equal and is what guarantees no calibration regression on landing. Fully specified in DERIV-PLAN.

### 2.7 Confirmation-question value — **sound, adopt for import UX**
Source INTAKE-03 §12.6. **Quoted:** $V(q)=U(q)\cdot I(q)\cdot P_{\text{answer}}(q)-C_{\text{writer}}(q)$; show only top-5 positive-value. **Assessment:** an expected-value triage that prevents interrogation fatigue; product-sound. **Implication:** the import/confirmation loop (absent today) uses this to ask only high-leverage questions; writer answers become author locks that outrank inference.

---

## Part 3 — Recovered mathematics (legacy corpus, verified in-file + reproduced)

### 3.1 Burrows's Delta (voice differentiation) — RECOVER-01, **ADOPT**
Source `_CLEVER_MOVES.md:280-287`. Method: take the $n$ most-frequent function words; z-score each character's frequency vs corpus mean/sd; distance $=$ mean absolute z-difference:
$$\Delta(A,B)=\frac{1}{n}\sum_{w} \big| z_w(A)-z_w(B)\big|,\qquad z_w(X)=\frac{f_w(X)-\mu_w}{\sigma_w}$$
**Reproduced** on a toy 3-word/2-character example → well-defined finite distance (1.318). Deterministic, ~0 cost, 1990s-proven for authorship attribution. **Implication:** a *structured* (not heuristic) voice-similarity detector — two characters with small $\Delta$ = voice-swap risk. Upgrades the current heuristic `dialogue_voice_swap_risk` from `pattern_to_watch` toward `worth_a_look`.

### 3.2 Allen Interval Algebra (temporal proof) — RECOVER-02, **ADOPT**
Source `_CLEVER_MOVES.md:61`. 13 mutually-exclusive interval relations (before/meets/overlaps/starts/during/finishes + inverses + equals). **Reproduced:** count checks out ($6\times2+1=13$); constraint propagation is path-consistency, deterministic, $O(n^3)$, sub-10ms at screenplay scale. **Implication:** the formal backbone for TRACE's temporal-consistency audit (INTAKE-03 §13.2) and FactTrack validity intervals (INTAKE-04) — replaces ad-hoc time checks with an algebra that detects transitive contradictions.

### 3.3 Dialogue information-ratio gate — RECOVER-03, **ADAPT**
Source `_CLEVER_MOVES.md:143-144`: `newInfoWordRatio(turn, state) < 0.4`. A turn whose new-information word share exceeds ~40% reads as exposition. **Assessment:** cheap, deterministic once "new info" is defined against session canon; genre-tunable (procedurals tolerate more). **Implication:** a structured anti-exposition detector feeding the dialogue pass.

### 3.4 Pixar axioms as excellence detectors — RECOVER-04, **ADAPT**
Source `pixar_cognitive_architecture_...md:20-51`: 10 axioms with self-reported confidence (Effort Supremacy 95%, Want-Need Opposition 98%, Story Spine 92%, …). **Caution:** confidence numbers are author-assigned, not measured — treat as **hypotheses**, not evidence. **Implication:** several map onto excellence detectors (want≠need opposition, effort-before-reward) — adopt the *mechanisms* as positive-signal checks, validate separation on the corpus before trusting the numbers.

---

## Part 4 — What remains uncertain / unverified

| Item | Status | Fastest validation |
|---|---|---|
| 100-Endings tension metric (RECOVER-07) | citation arXiv:2604.09854 **VERIFIED REAL** (Sui, Holtzman et al., 2026; deep-fact-check 2026-07-11) | adopt the inflection-rate metric — a second position-aware tension signal, complements emotional-arc; measure on the corpus |
| MAESTRO C2→A3→X3 staged path | scored internally, X3 self-labeled speculative | build C2 core + K1 baseline first; only test A3/X3 under matched budget |
| JSON-vs-graph complexity threshold | hypothesis (INTAKE-02 #6) | instrument both on real scripts; measure budget spent on extraction |
| Tier multipliers 1.0/0.7/0.4 | initial engineering guess | corpus sweep before switch-on (DERIV-PLAN Stage B) |
| GenRM / Bayesian reward loop (legacy) | speculative, RL harness required | DEFER until audit core is proven |

---

## Part 5 — Recommended experiments (each cheap, each falsifiable)

1. **Tier-weight corpus sweep** — does tier-aware weighting close the §5.2 composite gap without regressing 6/6 discrimination or AUC floor 0.622? Metric: composite min-gap ≥ 5.0.
2. **Burrows's Delta separation** — does $\Delta$ rank known same-voice pairs below distinct-voice pairs on corpus scripts? Metric: AUC vs a labeled voice-pair set.
3. **Allen-algebra temporal audit** — port the 13-relation propagator; assert it catches the `overdue_hard_promise`/timeline fixtures INTAKE-05 already ships.
4. **Change-impact ground truth** — on 5 corpus scripts, delete a load-bearing scene; does $I(C)$ recover the human-identified downstream breaks? Metric: recall of known breaks.
5. **X(s) clamp** — confirm clamped consistency orders the `broken/` band below `middle` below `great`.
