# Research Integration — 2026-07-11 Intake

Companion to `ROADMAP.md` §7. Reads four new research artifacts against the
shipped engine and decides, per idea, **adopt / defer / reject** with a reason.
Nothing here is duplicated into `ROADMAP.md` — the roadmap carries only the
scheduled slice; this file carries the full verdict map and provenance. Verbatim formulas/algorithms/schemas from the same sources: `RESEARCH_FORMULAS_ALGORITHMS_SCHEMAS_2026-07-11.md`.

Same discipline as `MASTER_RESEARCH_AUDIT.md`: an idea is not "smart" because a
document is confident about it. It is smart only if it survives NORTH_STAR's
laws (deterministic canon, no LLM-as-judge, measure-before-threshold, honest
degradation) and moves **Audit**, **Test a Change**, or **Choose a Repair**
forward.

---

## 1. What came in

| Artifact | What it actually is | Status |
|---|---|---|
| `StoryMachine_Complete_Master_Research_Document.md` (+ `.pdf` render) | Encyclopedic research foundation + master data model. Maps ~1:1 to the shipped `server/nvm` engine. | Source of record. `.pdf` is a byte-different render of the same content — keep `.md`, the `.pdf` is redundant. |
| `MAESTRO-S_v2_...Blueprint.md` | Deep **generation** research. Forensic audit of a seed paper (RFM/MFER/MOE-MFER), formal objective definitions, 12 candidate architectures scored, picks a C2→A3→X3 staged path. | Research track (generation). Adopt the *method discipline*, gate the *architecture*. |
| `StoryMachine_Studio_..._TRACE_White_Paper.md` | The **product** pivot. Argues against the sprawling platform; narrows to an audit-first MVP for working screenwriters, mystery/thriller first. Specifies the TRACE pipeline (T0–T11). | Product track (audit). Largest strategic signal of the batch. |
| `StoryMachine factcheck_ENGINE.pdf` | Mislabeled — it is the **FactTrack** paper (Lyu, Yang, Kong, Klein): atomic facts + time-aware validity intervals. | Primary source for temporal-fact validity intervals. Keep. |
| `StoryMachine_1.1_Deliverables.zip` → `Reference Engine 0.2.0` | Clean-room **Python** proof-first engine: proof kernel, craft checks, storylets/planner, calibration corpus (real Ibsen/Chekhov/Wilde "great" vs "broken" bands), 56 passing tests, schemas. | Spec/oracle, **not** a second production engine. See §4. |

The through-line across all four: **deterministic code owns canon; the LLM only
proposes, repairs, explains, renders. Proof before prose. Sparse
evidence-triggered specialists, not a permanent swarm. Human-primary
evaluation.** That is the engine's existing NORTH_STAR — the new material
*ratifies* the direction and sharpens specific mechanisms. It does not ask for a
rewrite.

---

## 2. Smart and better — ADOPT

Ranked by leverage against the product question ("what breaks if I change this?").

### A1 — Change-Impact as the headline surface (TRACE T8) — highest leverage
The engine already has the causal/dependency graph and the proof kernel; TRACE's
contribution is *framing*: the first-class, page-linked answer to "if I change
scene 14, what downstream setups, reveals, promises, and knowledge-legality facts
break?" This is a positioning + one focused feature, not new theory. It converts
the existing dependency traversal into the thing a screenwriter will pay for.
**Cost: low. Trust: high (deterministic traversal). Do first.**

### A2 — Confidence-tier vocabulary + evidence-bounded findings
Reference engine's `CraftFinding` separates **severity** (`blocker / major /
minor / positive / info`) from **confidence tier** (`strong_evidence /
worth_a_look / pattern_to_watch`), and TRACE design-laws 2–3 make it a hard gate:
*a low-confidence extracted fact cannot support a high-certainty finding.* The
shipped engine has the blocker/soft split and contentHash receipts, but not the
explicit confidence-can't-exceed-evidence clamp. Codify it: every finding carries
provenance + a confidence tier, and the tier caps the severity a lexical/model
detector may claim until a confirmed structured extraction supplies the fact.
This is the cleanest upgrade to the "hard blockers only assert encoded facts"
law already in NORTH_STAR.

### A3 — Extraction-confirmation loop with author locks (TRACE T4)
`parser_confirmation.py` asks the writer **only high-value** confirmations
(high-impact ambiguities), records corrections as author locks, and those locks
**outrank model inference** thereafter. The engine has interview receipts but not
this import-time confirmation gate. It is the mechanism that lets soft detectors
graduate to blockers honestly (they get a confirmed fact to stand on) and it is
the trust anchor for import. Adopt as its own module.

### A4 — Repair Portfolio: three *validated* modes (TRACE T9)
Productize the existing converge/revision machinery as exactly three
meaningfully-different repair candidates — **minimal disruption / bold structural
/ production-cheap** — each **validated against current state before it is shown**
(no candidate that reintroduces a blocker reaches the writer). This is the QD
archive's real customer value without the MAP-Elites cost, and it preserves
legitimate aesthetic disagreement (writer picks).

### A5 — Abstention as a first-class output (TRACE law 10 / §17.6)
The engine may say "not enough evidence to judge this." A scored surface that
never abstains trains writers to distrust it. Small change, large trust return;
consistent with honest-degradation.

### A6 — Calibration corpus: real literary "great" band
The reference engine calibrates against real public-domain **great** samples
(Ibsen *A Doll's House*, Chekhov *The Seagull*, Wilde *Earnest*) vs **broken** vs
**middle** bands, with a `SOURCES.md`. This is a stronger ground truth than
purely synthetic degradations and complements the 72-script corpus. Port the
corpus + its `fixtures.json` gate as an additional, controlled evaluation band —
respecting the existing controlled-richness constraint (match budgets across
bands).

### A7 — MAESTRO method discipline for the generation track
Independent of *which* generator, adopt MAESTRO's scientific gates for any
generation work: **matched-budget** comparison (accelerator-seconds, not tokens),
**role-placebo / role-permutation controls** (prove a "specialist" beats a
meaningless-label agent), **revision-homogenization measurement** (retain
pre-critique lineage; measure novelty lost per repair), and explicit
**falsification conditions**. This is stronger than the current
"measure-before-threshold" and should govern the entire generative side before a
single agent is called "better."

### A8 — Maturity ladder as release gates (TRACE §20.1)
M0 extraction → M1 audit → M2 change-impact → M3 repair portfolio → M4 faithful
patch → M5 collaborative. A clean, honest gate ladder that matches the engine's
actual capability order and gives each release a falsifiable "done" bar.

---

## 3. Not smart here — DEFER or REJECT (with reasons)

### R1 — Autonomous full-script generation as the wedge — REJECT (as wedge)
TRACE's sharpest finding: "autonomous prose is the least credible first product."
The engine already contains converge/self-play generation; the decision is not to
*delete* it but to **keep it behind the engine** and never make it the front
door. The front door is audit + change-impact + repair. (Generation stays alive
as the "generate → audit → select" research track, gated by A7.)

### R2 — Permanent multi-agent writers' room — DEFER to sparse
MAESTRO insight #10 and TRACE §10.5 agree: an agent should exist because it
supplies **orthogonal** evidence, not because a diagram has a box. Convert the
always-on 12-critic room into **sparse, evidence-triggered capability calls**
(base pass always; specialist passes only when a difficulty/uncertainty probe
predicts value). Prove each specialist against a role-placebo before it stays.

### R3 — Graph database / MAP-Elites / learned routing / RL at launch — DEFER
TRACE removes all of these from MVP; MAESTRO insight #6 shows compact JSON state
can **outperform** graph reasoning below a complexity threshold because
extraction + repair eat the budget. The engine's JSON/event-sourced state is
correct for now. Revisit the graph only when a measured complexity threshold
justifies it (X3 is explicitly labeled *speculative/unproven* in MAESTRO's own
scoring).

### R4 — LLM-as-judge as a scoring surface — REJECT (already law)
MAESTRO treats automated judges as *secondary calibrated instruments* only;
NORTH_STAR rejects LLM judges outright. The new docs **confirm** the existing law
— no change, and explicitly do **not** adopt MAESTRO/other docs' five-evaluator
negotiation as a score.

### R5 — Treating MAESTRO's flash-fiction result as transfer — REJECT
MAESTRO is explicit: flash-fiction (600–1,200 words) is a *testbed*, not proof of
transfer to screenplays. Do not let generation-track wins migrate into
screenplay-product claims without separate screenplay evidence.

### R6 — Any citation from the "Ernie"/fabricated-source lineage — REJECT
Consistent with `LEARNINGS_DISTILLED_2026-07-10.md`: adopt *mechanisms*, never
*citations*, from documents in that branch. Every claim that lands in the engine
needs a real, checkable source (FactTrack, PLOTTER, ConStory-Bench, QDAIF, etc.
are real; verify before citing).

---

## 4. The one genuine duplication to resolve — TS engine vs Python reference engine

Two implementations of the same proof-first core now exist: the shipped
**TypeScript** `server/nvm` engine and the **Python** Reference Engine 0.2.0.
Maintaining both as products is the real "duplicate" in this batch.

**Decision: TypeScript is the single production engine. The Python 0.2.0 is a
conformance oracle and spec, not a second system.** Concretely:
- Do **not** port the product to Python or run two engines.
- **Do** mine 0.2.0 for the assets it does better and bring them into TS: the
  `CraftFinding` confidence-tier model (A2), the parser-confirmation contract
  (A3), the calibration corpus + `fixtures.json` gate (A6), and its JSON schemas
  (`world-ledger`, `audit-finding`, `parse-confirmation`) as validation targets.
- Treat its 56 tests as a **behavior spec** the TS engine should not contradict
  where scope overlaps.

Keeping two engines in sync by hand is how drift and silent divergence start —
name the oracle, port the assets, retire the parallel-product idea.

---

## 5. Sequenced recommendation (feeds ROADMAP §7)

1. **A1 Change-Impact surface** — highest leverage, lowest theory cost, deterministic.
2. **A2 Confidence tiers + evidence clamp** — cross-cutting; unblocks honest severity everywhere.
3. **A3 Extraction-confirmation + author locks** — import-time trust anchor.
4. **A6 Real-literary calibration band** — strengthens ground truth before more detectors.
5. **A4 Repair Portfolio (3 validated modes)** — the payoff feature after audit is trusted.
6. **A5 Abstention** — fold in alongside A2 (same finding-emit path).
7. **R2 sparse-critic conversion** + **A7 MAESTRO gates** — govern the generation track; do before any "writers' room is better" claim.
8. **A8 maturity ladder** — adopt as the release-gate framing over all of the above.

Deferred/rejected (R1, R3, R4, R5, R6) are recorded here so they are not
re-litigated each session.
