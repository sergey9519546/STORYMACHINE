# STORYMACHINE_MASTER_SYNTHESIS

Authoritative overview of what the 2026-07-11 research intake means for
StoryMachine. Readable without the source files; full traceability in
STORYMACHINE_SOURCE_LEDGER. Companion docs: RESEARCH_AND_MATH (evidence + verified
math), TARGET_SYSTEM (design), EXECUTION_PLAN (roadmap).

Evidence labels: **High / Moderate / Low / Hypothesis**. Inference labels:
*supported* (from sources), *synthesis* (cross-source), *inference* (reasoned),
*proposal* (original), *speculative*.

---

## 1. Executive conclusion

The **architecture** is on the right path (deterministic canon) — *High
confidence, multi-source*. The **product direction** (audit-first as the wedge) is
a reasonable but **unvalidated bet resting on a single internal white paper
(INTAKE-03) with no user evidence** — *Moderate, hypothesis-grade*. Net: a
minor-to-moderate adjustment, not a reroute or rebuild — **but the wedge must be
user-tested before we build UX for it.**

> Confirmation-bias caveat (from adversarial review): "four internal docs plus our
> own engine all point back at our existing core" is a warning sign as much as a
> result — the authors are incentivized to conclude they were right. The only
> peer-reviewed source (INTAKE-04) validates *mechanisms*, not the architecture or
> the product. Treat §1's comfort accordingly.

The new research does not overturn the foundation — it **ratifies** it. Every
serious source (a peer-reviewed paper, a rigorous internal blueprint, a product
white paper, and a runnable reference engine) independently lands on the same
core the engine already embodies: *deterministic code owns canon; the LLM only
proposes; proof before prose; sparse evidence-triggered specialists; no
LLM-as-judge.* That convergence is the single most important result — the risk
going in was that the pile of research would demand a new architecture; it
demands the opposite.

The adjustment is twofold. **(1) Product framing:** the credible wedge is
*audit + "what breaks if I change this?"*, not autonomous prose — and the engine
already contains the machinery (dependency graph, proof kernel, what-if) but
frames itself as a research platform. **(2) A few missing contracts:** confidence
tiers, abstention, import-confirmation with author locks, and two recovered
deterministic methods (Allen temporal algebra, Burrows's Delta). All are
*additive*; none requires a rebuild.

Two math issues were found by independent reproduction — **note: in source math
not yet adopted into the codebase, not running-system bugs**: the consistency
metric X(s) is **unbounded below zero** (needs a clamp before use), and the
tier-weight math carries a **float error** (needs epsilon in tests). Both are
cheap spec-notes, now specified so they don't surface mid-build.

## 2. Current understanding of StoryMachine

A mature TypeScript engine (~20k LOC, 51 routes, 3,216 rules, a 72-script
ground-truth corpus with a 0.622 AUC floor and 6/6 discrimination). It already
has: an event-sourced proof kernel, a causal/dependency graph (`twin/`,
`whatif/`), a 14-pass revision pipeline, keyless analysis-only boot, and
generation/converge behind it. It *lacks* the finding-confidence contract,
abstention, an import-confirmation loop, and a couple of formal temporal/voice
methods. *(Supported: 4-agent code audit + direct code reads.)*

## 3. Strongest findings (Top 10, with consequence + action)

1. **All sources converge on deterministic-canon + LLM-proposes.** *(High.)* Consequence: no architectural reroute. Action: hold the line; encode it as a *type invariant* (finding contract), not convention.
2. **Audit + change-impact is a *plausible but unvalidated* wedge; autonomous prose is not.** *(Moderate; single-source INTAKE-03, no user evidence.)* Consequence: reframe is a bet. Action: **demo the already-shipped doctor/what-if to ~5 real screenwriters before building audit UX**; make `I(C)` the headline only if that + W3 pass.
3. **The change-impact graph exists only over GENERATION ops, not imported scripts.** *(Corrected after adversarial review + code read.)* `buildSCM(stage)` runs over the StoryCommit DAG with **heuristically inferred** edges ("causalLinks are not stored, so we infer"); `whatif`/`counterfactual` are BFS hop-distance over `StoryOp[]`; `Impact(v)` is **not implemented**. Consequence: for the audit product the graph must be **built from imported-script typed-dependency extraction that does not yet exist**. Action: W3 is a **gating precondition**, not a quick spike — run it first.
4. **Confidence tiers are entirely absent and are the systematic fix for an open roadmap problem (§5.2 false-positive flood).** *(High.)* Consequence: highest-ROI upgrade. Action: land the inert tier×determinism contract; measure; ship iff the gap closes.
5. **X(s) consistency is unbounded below 0.** *(High; reproduced.)* Consequence: can misorder broken vs flawed scripts. Action: clamp to [0,1], define Z.
6. **CVaR risk-sensitive selection + revision-homogenization stop rule are sound and adoptable.** *(High; dimensionally checked.)* Consequence: the generate→audit→select loop should rank by tail-risk and stop revising before it sands off originality. Action: adopt behind the door.
7. **Sparse, placebo-gated specialists beat a permanent swarm.** *(High.)* Consequence: convert the always-on 12-critic room. Action: base pass + evidence-triggered specialists, each must beat a role-placebo.
8. **Two recovered deterministic methods are real and cheap: Allen Interval Algebra + Burrows's Delta.** *(High; verified in-file + reproduced.)* Consequence: upgrade ad-hoc temporal checks and heuristic voice-similarity to structured detectors. Action: implement as P1/P2.
9. **Two proof-kernel implementations now exist (TS vs Python 0.2.0).** *(High.)* Consequence: drift risk. Action: TS is production; Python is a conformance oracle — don't run two.
10. **The fabricated-citation lineage recurs.** *(High; `【NN†L..】` markers.)* Consequence: mechanisms are usable, citations are not. Action: adopt mechanisms, re-ground before citing.

## 4. Most valuable *combined* ideas (worth more together)

- **Dependency graph + change-impact + repair portfolio** = the product: "what breaks if I change this, and here are 3 validated fixes." *(synthesis: INTAKE-03 §14–15.)*
- **Confidence tiers + abstention + evidence-bounded findings** = trustable audit: a finding never claims more certainty than its evidence, and the engine says so when it can't tell. *(synthesis: INTAKE-05 D.3 + INTAKE-03 §17.)*
- **FactTrack validity intervals + Allen algebra** = a real temporal-contradiction proof, not a heuristic. *(synthesis: INTAKE-04 + RECOVER-02.)*
- **Import confirmation + author locks + progressive enrichment** = trust at the door without a mandatory bible. *(INTAKE-03 §12.)*

## 5. Keep / change / replace / remove / defer / new (decision digest)

| Decision | Items |
|---|---|
| **KEEP** | deterministic canon, proof kernel, keyless-first, no LLM-judge, 72-corpus + AUC floor |
| **STRENGTHEN** | change-impact/what-if graph → product headline |
| **MODIFY** | always-on critic room → sparse placebo-gated; ad-hoc temporal checks → Allen algebra |
| **REPLACE** | unclamped X(s) → clamped; ad-hoc issue ordering → Priority(f) |
| **REMOVE (from product surface)** | autonomous full-script generation as the wedge |
| **DEFER** | graph DB, MAP-Elites, learned routing, RL |
| **NEW** | finding tier contract, abstention, import-confirmation + author locks, Burrows's Delta, real-literary calibration band, CVaR selection (behind door) |
| **REJECT** | LLM-as-judge scoring; fabricated citations |

## 6. What changed in our understanding

Before: an open question of whether to keep evolving the platform or reroute
toward newer research (generation, agents, graphs). After: the newest and
most rigorous evidence **points back at the existing core** and reframes the
*product*, not the architecture. The work is subtraction (hide generation,
sparsify agents) plus a few precise additions — not expansion. *(inference.)*

## 7. Key uncertainties (only those that could change the plan)

- Do tier weights actually close §5.2 on the real corpus? → measure (W2).
- Does change-impact recall real downstream breaks? → labeled test (W3).
- Where is the JSON-vs-graph complexity threshold? → instrument, don't assume.
- Is the 100-Endings tension metric real/useful? → prototype the mechanism; ignore the unverified citation.

## 8. Principal recommendations

1. Reframe the product around audit + change-impact; stop positioning on models/agents/generation.
2. Land the finding tier×determinism contract (inert), measure, ship iff it closes §5.2.
3. Surface the change-impact graph you already have.
4. Add abstention, import-confirmation, Allen temporal, Burrows's Delta — all additive.
5. Fix X(s) clamp and the tier float in the process.
6. Keep generation, sparsify it, and hold it behind the proof gate.

## 9. Immediate next actions
See EXECUTION_PLAN "Top 10". First three: **F1** EOL normalize, **F2** green
baseline, **W1** land the inert finding contract with fire/no-fire tests.
