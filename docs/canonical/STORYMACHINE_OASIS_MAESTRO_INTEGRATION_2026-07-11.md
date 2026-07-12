# What OASIS & BETTER-MAESTRO teach us — integration memo

**Seed documents (treated as material, not truth):** `OASIS Narrative Operating System Blueprint.docx` (a 60-module "narrative OS" maximal spec) and `StoryMachine_BETTER_MAESTRO_Research_Document.md` (post-2024 generation + evaluation architecture survey). Read 2026-07-11 against the running engine and the expert blueprint. Evidence labels: `[EST]` verified in-repo/source · `[INF]` inferred · `[SPEC]` speculative.

## 0. The one-line takeaway

Both documents **ratify our direction and hand us the missing organizing frame.** OASIS shows the deterministic-canon law we already hold ("the model proposes, the engine decides") scaled to a full state ontology — and its **Four-Ledger State Model is the clean frame for the ledger modules we built piecemeal**, and for the imported-script extraction that the blueprint named the gating precondition. BETTER-MAESTRO shows the evaluation field independently converging on our contrarian bet — **evidence-grounded consistency checking, not vague coherence scores, and specialized reward models, not generic LLM judges.** Neither demands a reroute; both sharpen the same path.

## 1. Map — what we already built is OASIS/MAESTRO under other names [EST]

| We built (this session + prior) | OASIS / MAESTRO name | Status |
|---|---|---|
| `epistemic-ledger` (canKnow → SupportState) | **Belief Ledger** (what each character believes) | built, unwired |
| `disclosure-ledger` (chronology vs presentation) | **Presentation Ledger** + **Player-Inference Ledger** (fair reveal) | built, unwired |
| `custody-ledger` + `assertion-containment` | **Truth Ledger** (what objectively happened / consistency) | built, unwired |
| `mystery-fairness` (core-clue, fair-play) | **Mystery/Clue Engine** (Core Clue Guarantee, Fair-Play Solver, Case Board) | built, unwired |
| `surfacing` gate (N·S·C·A·V) + W1 confidence tiers | **Canon Tiers** + **Evidence Weighting** + **Validation Order** | built, keystone |
| `genre-obligation` | **Genre Promise Engine** (numeric genre profile) | built |
| `well-made-surprise`, `pattern-establishment`, `anti-slop`, `theme-extract` | **Reversal / Irony Engine, Motif Ledger, Anti-Cliché Detector, Theme Engine** | built |
| 14 doctor passes (structure/causality/info/theme/pacing…) | **Evaluator Committee** (Storymind/Narrator/Ego/Superego/Director…) | built |
| metamorphic + discrimination + real-corpus ratchets | **Narrative Metamorphic Relations, Golden Trace Library, Statistical Reliability Targets** | built |
| **`screenplay-normalizer` + comprehension (this session)** | **Import System** — the front door that populates the ledgers | **just built** |

**Consequence [INF]:** we have been building OASIS modules ad hoc and scoring them into one saturating scalar. The two documents tell us the modules were the right modules — and that they belong to a **shared state model**, not a pile of independent detectors feeding a single number.

## 2. The five things worth actually including (ranked by leverage)

### L1 — Unify the ledgers into the Four-Ledger State Model. **[highest leverage]**
OASIS §15: **Truth / Belief / Presentation / Player-Inference**, each a typed ledger with provenance, canon-tier, evidence ids, and branch scope. Our four ledgers map onto it exactly (table above). **What to do:** define one `NarrativeState` populated from the comprehended import — Truth (custody + assertion), Belief (epistemic), Presentation (disclosure order), Player-Inference (what the audience can know) — and route the surfacing gate + findings off *it* rather than off four disconnected modules. **Why it's the leverage point:** this is precisely the "imported-script typed-dependency extraction that does not yet exist" the internal synthesis called the *gating precondition* for the audit/findings product — and this session's comprehension work is its first brick (you cannot populate a Belief ledger from a script whose characters/dialogue you could not parse). This is the concrete next architecture increment. `[EST mapping; INF that unification is the right refactor]`

### L2 — Add Scene-Contract signals: Value-Shift, "Boring-but-Correct", "Cool-but-Wrong". **[near-term, buildable now]**
OASIS §30: every scene has an `opening_value → closing_value` shift (safe→unsafe, trust→suspicion, ignorance→knowledge…). A **Boring-but-Correct** scene has *no value shift, no subtext, no pressure, no future hook, repeated beat*; a **Cool-but-Wrong** scene is *stylish but impossible/causally broken*. These are two new deterministic craft detectors that fit our exact module pattern and map to established scene theory (McKee value-charge). **Why it matters:** they attack the two failure modes our current signals miss — the *inert* scene and the *incoherent-but-flashy* scene — and both are measurable on the 72-film corpus (a produced feature should have few Boring-but-Correct scenes). Buildable this week, same fire/no-fire discipline. `[EST source; INF applicability]`

### L3 — Adopt the "specialized reward model, not generic LLM judge" as the calibration bridge. **[refines Approach B]**
BETTER-MAESTRO's central evaluation finding: the field replaced generic LLM judges with **domain-specific reward models** (LitBench, StoryReward, writing-quality models) sitting *below human review, above generic judges* — because generic judges are biased and non-reproducible (which we already documented). **What to do:** when we reach the human-anchor gate (TS-SF), do **not** reach for an LLM judge; train a small specialized, versioned, hash-pinned reward model on the TS-SF labels and use it strictly as a *selector aid / calibration reference*, never the final arbiter. This is a more defensible resolution of the reproducibility-vs-nuance dilemma than "LLM proposes annotations," because a frozen small model is far closer to reproducible than a frontier API. `[EST field trend; INF for our use]`

### L4 — Cite ATLAS / FactTrack / ConStory-Bench as external validation of findings-first. **[de-risks Approach C]**
BETTER-MAESTRO: the strongest evaluation programs do **evidence-grounded consistency checking** (ATLAS verifies scene-level world state to catch hallucination; FactTrack; ConStory-Bench) *instead of vague coherence scores*. That is independent, external convergence on exactly the blueprint's Approach C — **proof-carrying findings over a saturating scalar.** It lowers the risk that findings-first is an idiosyncratic bet; the generation-eval frontier reached the same place. **What to do:** frame our surfacing-gated findings as the screenplay analogue of ATLAS state-verification, and borrow ConStory-Bench's *consistency-suite* structure for our finding-FP budget on produced films. `[EST source; INF analogy]`

### L5 — Expand the metamorphic suite with OASIS's relations. **[cheap rigor]**
OASIS §48 lists relations we don't yet test: **rename characters → same causal structure** (we partly have), **reorder presentation → truth graph unchanged**, **remove core clue → fair-play solver fails**, **swap POV → belief boundaries remain valid**, **compress scene → value shift preserved**. Each is a new metamorphic test that hardens the engine and, notably, **each requires the Four-Ledger state to even express** (you can't test "truth graph unchanged under reordering" without a truth ledger) — so they are the natural acceptance tests for L1. `[EST source]`

## 3. What to explicitly NOT take from these docs (scope discipline) [INF]

- **OASIS is a maximalist 60-module *generation/simulation* OS** — Drama Manager, BDI agents, ABL reactive runtime, saga/CQRS layers, planner portfolio, simulated players. Most of it is for *generating and running interactive narrative worlds*, **not** for evaluating an imported screenplay. Taking the whole OS is a scope trap that would abandon the one validated wedge (a reproducible evaluator). Take the **state model (§15), the scene detectors (§30), the metamorphic relations (§48), and the evaluator-committee arbitration (§44)** — leave the world-simulation runtime for the generation side that already sits behind the engine.
- **BETTER-MAESTRO is generation architecture** (MAGNET+ATLAS world engine, LLM Review blind peer review). Its *evaluation* findings (L3, L4) are the relevant part for our evaluator; its *generation* findings apply to the converge/generation layer, not the audit product. Do not let "adopt MAGNET+ATLAS" pull the evaluator into building a generator.
- **Governance carried over:** both are AI-generated syntheses; per the standing rule, *adopt mechanisms, never citations*. OASIS cites no external sources; BETTER-MAESTRO's `citeturn…` markers are unverifiable as pasted and must be re-grounded before any external claim is repeated.

## 4. How this makes StoryMachine better — connected to what we just did

The through-line of this session was: the engine did not *comprehend* imports (fixed), its discrimination was a scene-count artifact (fixed via the arc structural deduction), and its health scalar saturates (diagnosed, decoupling proven for one axis). These two documents tell us the **next** move that compounds all of that:

> Turn the comprehension we just unlocked into a **Four-Ledger narrative state**, route **proof-carrying findings** off that state through the surfacing gate (Approach C), validate with **TS-SF humans + a small specialized reward model** (not an LLM judge), and harden with the **expanded metamorphic suite** — while adding **Value-Shift / Boring-but-Correct / Cool-but-Wrong** as the near-term craft detectors.

That sequence uses everything already built, needs no LLM in the verdict path, and directly advances the gating precondition the project's own synthesis named. It is an **increment, not a reroute** — which is exactly what every serious source (internal and now these two) keeps concluding.

## 5. Concrete additions to the roadmap

1. **Increment 3 (reframed): build the Four-Ledger `NarrativeState`** populated from the comprehended import; migrate epistemic/custody/disclosure/assertion onto it. Acceptance = OASIS §48 metamorphic relations pass. (This is the W3 gating precondition.)
2. **New detectors:** `value-shift`, `boring-but-correct`, `cool-but-wrong` — same fire/no-fire + corpus-measure discipline; zero-FP target on produced films.
3. **Findings-first report** routed off the Four-Ledger state via the surfacing + acquittal gate (Approach C) — framed as ATLAS-style state verification.
4. **Human-anchor (unchanged priority):** TS-SF on ~5 screenwriters; then a small specialized reward model as selector aid, never judge.
5. **Metamorphic expansion:** rename-invariance, presentation-reorder-truth-invariance, clue-removal-fails, POV-swap-belief-boundary, compress-preserves-value-shift.

**Source provenance:** OASIS Blueprint §§0,1,3,15,30,44,48,49,50,58,59; BETTER-MAESTRO Exec Summary + Evaluation/Alignment/Cost + Recommendation. All `[INF]/[SPEC]` and the scope-discipline calls in §3 are this memo's.

---

## 6. FactTrack — the peer-reviewed algorithm for the Truth Ledger

**Seed document:** `StoryMachine factcheck_ENGINE.pdf` = **FactTrack: Time-Aware World State Tracking in Story Outlines**, Lyu, Yang, Kong & Klein (HKU / UC Berkeley), open-source at github.com/cogito233/fact-track. Unlike OASIS/MAESTRO (AI-generated syntheses), **this is a real peer-reviewed paper with an ablation study** — so per our governance rule it is the rare source we may both *cite* and *adopt*. It is the missing algorithmic spec for the Truth Ledger that OASIS §15 only named abstractly. `[EST]`

### 6.1 What it is
A data structure + four-step pipeline for tracking **atomic facts with time-aware validity intervals** over a **relative event timeline** (event order, not wall-clock — "contextual fact verification without requiring explicit temporal annotations," which is exactly a screenplay). Each fact stores `content, t_begin, t_end`. Pipeline per event: **(1) Decompose Events** into *pre-facts* (preconditions, valid until the event), *post-facts* (effects, valid after), and *static facts* (invariants); **(2) Determine Validity Interval** for each fact against the world state; **(3) Detect Contradictions** by interval overlap; **(4) Update World State**. Events need not arrive in chronological order (handles flashbacks/outlines). `[EST]`

### 6.2 Why it matters to us — it upgrades three modules we already have
- Our **`temporal.ts` already implements Allen's interval algebra** — and FactTrack *explicitly builds its contradiction test on Allen's algebra* (`Fact1 o Fact2`, flagged only on "overlap on both checkpoints," the strictest case, deliberately to **minimize false positives**). We built the algebra; FactTrack shows the narrative operation to run on top of it. `[EST]`
- Our **`assertion-containment`** detects contradictions with a crude boolean `acknowledgedReversal`. FactTrack replaces that boolean with the *principled* mechanism: a later "contradiction" is **not** a contradiction if an intervening event legitimately updated the fact's validity interval (its canonical example: "John forgot his laptop" → "John uses his laptop" is fine because "John goes home to retrieve it" updated the world state). This is a direct precision upgrade that *removes false positives* — the single most important property for our zero-FP-on-produced-films discipline. `[EST]`
- Our **`custody-ledger`** (physical facts) becomes one fact-type inside the FactTrack world state rather than a separate silo. `[INF]`

### 6.3 The deterministic split maps exactly onto "the model proposes, the engine decides"
FactTrack is **mostly deterministic** — interval determination, overlap detection, world-state update are pure data-structure operations. Only **one step is model-dependent**: "do these two atomic facts contradict?" uses an **NLI model** (they finetuned a small NLI model on GPT-4 annotations; LLaMA2-7B FactTrack matched GPT-4 full-outline detection). For our posture: keep the **interval/world-state machinery as the deterministic engine**, and treat the contradiction score as a **proposer** that is either (a) a frozen, hash-pinned small NLI/reward model (reproducible — the "specialized model not generic judge" learning from §L3), or (b) a deterministic lexical/logical checker for the subset we can decide without a model. This is the cleanest real-world instance of our core law we've seen. `[EST source; INF for our split]`

### 6.4 Adopt: threshold asymmetry
FactTrack uses **different thresholds for "update" vs "contradiction"** because *false negatives on an update are cheap (you miss extending a fact's life) but false positives on a contradiction are expensive (you flag a good script)*. We should adopt the same asymmetry in the Truth Ledger: be liberal about updating fact validity, conservative about firing a contradiction finding. `[EST]`

### 6.5 Honest cautions before adopting
- **Validated on GENERATED story outlines** (90 premises, depth-3, ~39 events, 3–5 true contradictions each) — **not** on dense feature screenplays (hundreds of scenes). Extraction quality and scale on real scripts are unproven for us; this is a research risk, not a drop-in. `[EST/INF]`
- **The contradiction step needs a model.** A fully deterministic contradiction detector will have lower recall; the reproducibility guarantee only holds if the NLI model is frozen. Decide per finding-type which contradictions we can decide deterministically vs which we accept a pinned-model proposer for. `[INF]`
- **Evaluation used GPT-4 as the scorer** of contradiction quality — the same LLM-as-judge weakness we critique elsewhere; treat the reported scores as directional. `[EST]`

### 6.6 Net effect on the roadmap — it makes Increment 3 concrete
FactTrack **is the build spec for the Truth-Ledger half of the Four-Ledger `NarrativeState` (§L1)**:
> Extraction = pre/post/static fact decomposition per scene from the comprehended import (this session's normalizer made the scenes/dialogue readable in the first place). Storage = atomic facts with validity intervals on the scene-order timeline. Contradiction findings = Allen-overlap on both checkpoints (deterministic engine) × a frozen contradiction proposer (reproducible). Thresholds = asymmetric (liberal update, conservative flag).

This converts the abstract OASIS Truth Ledger and our scattered temporal/assertion/custody modules into **one implementable, peer-reviewed subsystem** — and it is the exact "imported-script typed-dependency extraction" the internal synthesis called the gating precondition for the findings product. **Recommended:** make "Truth Ledger = FactTrack-over-comprehended-scenes" the first concrete slice of Increment 3, with `temporal.ts` as its interval core and `assertion-containment`/`custody-ledger` folded in.

**FactTrack provenance:** paper §§3–5 + Appendices A.2–A.3, B.1, B.3–B.4; Tables 1–2 (results/ablations). Mechanisms adopted per the "mechanisms-not-citations" rule; the citation here is retained because the source is a verified peer-reviewed paper, not an AI synthesis.
