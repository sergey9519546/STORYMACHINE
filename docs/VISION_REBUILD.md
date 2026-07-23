# STORYMACHINE — Vision Rebuild: The Century's Best Story & Screenwriting Tool

*A first-principles architecture, written 2026-07-14 against the DEEP_AUDIT (69 findings) and NORTH_STAR constitution. This is not a patch on the current system. It is the answer to the question: if a writer came to me today wanting the best story tool ever built, what would I build?*

---

## 0. The Core Realization

The current STORYMACHINE has an existential bug hiding in plain sight, and the audit named it: **the score that works (scene-count scarcity, AUC 0.938) is a proxy for length, not craft, and the machinery built to measure craft (8,917 rules, AUC 0.076) doesn't measure anything.**

This is not a calibration problem. It is a category error. You cannot build a craft-quality ruler out of lexical rules that count *what words appear*, because craft lives in *relationships between elements across time* — setup and payoff, promise and fulfillment, escalation and release, a character wanting something and the story making them pay for it. Counting words in a bag will never see any of that. The act-swap AUC of ~0.48 is the smoking gun: shuffle the acts, keep the words, and the score doesn't blink. A screenplay is not a bag of words. It is a *causal-temporal graph of intentions and consequences*.

So the century's best tool is not "more rules." It is a machine that reads a screenplay the way an experienced development executive does: as a system of promises the writer makes to the audience and either keeps or breaks. Everything below flows from that.

---

## 1. First Principles: What Makes Writing Tools Transformative?

### What professional screenwriters actually do

Watch a working writer and you see a loop that has almost nothing to do with formatting:

1. **They hold a question in tension.** "What does she want, and what will it cost her?" The entire craft is managing dramatic tension across 110 pages so it never goes slack.
2. **They plant and pay off.** A gun on the mantle in act one; a wound in a flashback that explains a betrayal in act three. Screenwriting is a promise-and-payment ledger.
3. **They track a character's changing relationship to a single question.** The arc is not "sad then happy" (the VAD-lexicon fallacy the current tool fell into). It is a *belief* the character holds at the start, gets tested, and either abandons or defends at the cost of everything.
4. **They cut.** The single most common professional note is "start later, end sooner." Great writing is subtraction. No tool helps with subtraction because subtraction is invisible to a rule that counts what's present.
5. **They defend intent against notes.** A writer gets 40 notes from 5 readers, 35 of which are wrong, and the skill is knowing which 5 are the real diagnosis versus symptom.

### What writers ACTUALLY need vs. what tools assume

| Tools assume writers need | Writers actually need |
|---|---|
| Faster formatting | To know if the story *works* before they spend 6 months on draft 4 |
| A grade / score | A *diagnosis*: what specifically is broken and why |
| More features | Fewer, sharper questions |
| An AI that writes for them | An AI that reads *back to them* what they actually wrote, so they can see the gap between intent and page |
| Rules about craft | Evidence about *their* script, traceable to the page |
| Validation ("this is good!") | Honest, specific, defensible critique they can act on |

The transformative insight: **the best writing tool is a reading tool.** It does not write. It *sees* — it holds the entire 110-page structure in view at once, tracks every promise and payment, every character's want across every scene, and shows the writer the shape of their own story more clearly than they can hold it in their head. That's the thing no human reader can do at scale and no formatting tool has ever attempted.

---

## 2. The Fatal Flaw in Current Approaches

### Why most writing tools fail

- **Final Draft, Fade In, WriterDuet, Highland:** Formatting tools. They treat a screenplay as *typography*. They have no model of story at all. They are typewriters with pagination.
- **Dramatica:** Has a story model, but it's a proprietary metaphysics (the "Story Mind," 4 throughlines, 64 elements) the writer must convert their story *into* before it says anything. It imposes a theory rather than reading what's there. Writers bounce off the ontology.
- **Save the Cat / beat-sheet tools:** Impose one 15-beat template on all stories. Useful as a checklist, catastrophic as a judge — they punish every film that isn't a 2010 studio comedy.
- **Black List / ScriptReaderPro (human coverage):** Actually work, because a human reads the causal-temporal graph natively. But they are slow (14 days), expensive ($95–500), non-reproducible, and give you one person's taste on one day.
- **LLM writing tools (Sudowrite, ChatGPT):** Generate plausible prose, but as *judges* they are non-reproducible, sycophantic, and cannot be trusted or audited. Ask the same LLM twice, get two verdicts.

### What STORYMACHINE gets wrong at the foundation

The current architecture made three foundational errors, all documented in the audit:

1. **It modeled craft as lexical presence, not temporal relationship.** 8,917 rules that fire on *what words appear where* can never measure setup/payoff, escalation, or arc, because those are properties of *order and causation*, not vocabulary. The measured act-swap AUC of ~0.48 proves the model is blind to the exact thing that defines screenwriting. (DEEP_AUDIT finding #2, #9; NORTH_STAR §2 law 1.)

2. **It let determinism become the goal instead of the guarantee.** "The same input gives the same output" was pursued as if it were "the output is right." A broken ruler is perfectly reproducible. The NORTH_STAR constitution now names this exactly ("Correct before reproducible") — but the *architecture* still centers on the reproducible-rules pipeline, not on a correct model of story.

3. **It optimized rigor with no evidence anyone wanted the output.** 8,917 rules, AUC ratchets, research intake — all built before a single real writer was shown a report (DEEP_AUDIT finding #3; ROADMAP P0). The machine got very good at producing a number nobody had validated anyone wanted.

The deeper diagnosis: **the density-normalization trap.** The audit found (NORTH_STAR §2 law 2) that a rule firing 15–23 more times on a bad script collapses to a <0.05 health delta because the formula normalizes issue count by length. This is not a tuning bug — it is proof that *instance-counting is the wrong primitive entirely*. You cannot out-count your way to craft measurement. The whole channel is the wrong shape.

**What was built right and must survive the rebuild:** keyless-first boot, contentHash reproducibility, honest degradation, no-LLM-as-judge, and the emotional-arc diagnostic (the *one* signal that reads for position, act-swap AUC ~0.647). These are keepers. The rule catalog is not.

---

## 3. Architecture for the Century's Best Tool

The system is built around one primitive the current tool never had: **the Story Graph** — a typed, temporal, causal representation of the screenplay as promises, entities, and beats, extracted deterministically and read by a layered intelligence stack.

### 3.1 Core engines

**Engine 1 — The Parser (deterministic, keyless).**
Fountain/FDX/PDF in, structured screenplay out: scenes, sluglines, action blocks, dialogue, characters, transitions. This exists today and works. Keep it. It is the sensory organ.

**Engine 2 — The Story Graph Builder (deterministic + optional deep-read SENSE layer).**
This is the new heart. It converts the parsed script into a typed graph:

- **Entities:** characters, objects, locations, facts, secrets — each with a first-appearance beat and a last-appearance beat.
- **Promises (Setups):** a detected element that creates an expectation — a planted object, an unanswered question, a stated goal, an introduced threat, a withheld secret.
- **Payments (Payoffs):** the beat that resolves a promise — or the *absence* of one (an unpaid promise is the single most common structural defect in amateur scripts).
- **Wants:** per character, the objective they pursue, tracked scene by scene, with the *obstacle* and the *cost* attached.
- **Beats:** the causal unit — "X does A because of B, which causes C." Beats form a directed graph. Reordering acts *changes this graph* — which is precisely why a graph-native score will have act-swap discrimination where a lexical one cannot.
- **Tension curve:** derived from open promises × stakes × proximity-to-cost over story time. Slack tension (a flat stretch with no open promises and no rising cost) is a detectable, page-locatable defect.

The graph is built deterministically where possible (entity tracking, scene continuity, dialogue attribution) and enriched by an *optional* LLM SENSE pass that annotates beats — but per the constitution, **the LLM SENSES, it never SCORES.** It labels "this line states a goal" or "this reveals a secret"; the deterministic scorer verdicts on the labels identically whether they came from an LLM or a lexical detector. This preserves reproducibility (annotations are cached and contentHash-keyed) while giving the graph semantic richness rules never could.

**Engine 3 — The Structural Scorer (deterministic, graph-native).**
Scores computed *on the graph*, not on word counts:
- Promise-payment ratio and the list of specific unpaid promises (page-located).
- Tension continuity: longest slack stretch, tension variance, the "sagging middle" measured as a real dip in the open-promise-weighted curve.
- Arc integrity: does each principal's want-obstacle-cost chain actually resolve, and does the resolution *cost* them something (change without cost is the flat-arc defect).
- Escalation monotonicity: do stakes rise across acts? This is an *ordering* property — act-swap breaks it by construction, giving the discrimination the old model lacked.
- Causal density: fraction of beats that are caused by a prior beat vs. arbitrary. Episodic ("and then... and then...") scripts score low here; this is the "it's just stuff happening" note, made computable.

**Engine 4 — The Simulation Layer (OASIS, reborn with a job).**
The current OASIS is orphaned ("half the codebase with no defined user persona," ROADMAP §1). Give it the one job it's uniquely suited for: **counterfactual stress-testing of the graph.** Given the story graph, simulate: "If the protagonist made the opposite choice at the midpoint, does the third act still function?" This is What-If with teeth — not word-shuffling, but re-running the causal graph under a perturbed decision and reporting which promises break. This is a real, novel, defensible feature and it finally justifies the multi-agent machinery.

### 3.2 Data model

```
Screenplay
 ├─ contentHash            (reproducibility anchor — kept from current system)
 ├─ Scenes[]               (parser output)
 └─ StoryGraph
     ├─ Entities[]         { id, type, firstBeat, lastBeat, aliases }
     ├─ Promises[]         { id, kind, openedAtBeat, stakesWeight, paidAtBeat|null }
     ├─ Wants[]            { characterId, objective, obstacle, cost, perSceneStatus[] }
     ├─ Beats[]            { id, sceneRef, causes[], causedBy[], annotationSource }
     └─ TensionCurve[]     { beatIndex, openPromiseWeight, proximityToCost }

CoverageReport
 ├─ verdict                (RECOMMEND / CONSIDER / PASS — kept format, new basis)
 ├─ structuralScores       (promise-payment, tension, arc, escalation, causal-density)
 ├─ findings[]             { defect, pageLocation, graphEvidence, suggestedCut|fix }
 └─ receipt                (contentHash + engine version — external verify endpoint)
```

Every finding points to a *graph fact* (this promise, opened on page 12, is never paid) and a *page location*. No finding is "rule #4,417 fired." This is the explainability the audit says is the wedge — but grounded in story structure a writer recognizes, not rule IDs they don't.

### 3.3 Intelligence layer: deterministic / generative / hybrid

- **Deterministic (front door, keyless):** graph construction where mechanical (entity tracking, continuity, promise detection via structural signals), all scoring, all verdicts. Reproducible, inspectable, private. This is the product.
- **Generative SENSE (opt-in, labeled, degradable):** deep-read beat annotation, ambiguous promise/payoff detection, subtext reading. Feeds *labels* into the graph. Never scores. Degrades to the deterministic-only graph when keyless — a functional, honest fallback.
- **Generative SUGGEST (opt-in, labeled):** given a diagnosed defect, propose fixes ("this promise on p.12 is unpaid — here are three scenes where it could pay off"). Clearly labeled as generation, never presented as a verdict.

The firewall from the constitution holds: **SENSE and SUGGEST may use LLMs; SCORE never does.**

### 3.4 User experience model

Collapse the 40 panels (DEEP_AUDIT finding #10) to one primary surface with a single job, exactly as ROADMAP P2 demands:

1. **Read view:** the script, with the story graph rendered *in the margin* — a live tension curve down the side, promise markers where things are planted, payment markers where they resolve, and *unpaid promises glowing red* at the point they were opened.
2. **Diagnosis view:** the coverage report, every finding clickable to jump to the exact page and see the graph evidence.
3. **Cut view (the killer feature):** the tool's ranked list of *what to cut* — scenes with no open promise, no rising tension, no causal descendant. Subtraction, finally tooled.

Everything else — OASIS simulation, What-If, voices, converge — lives behind a **Labs** flag, off by default.

### 3.5 Truth / validation model

This is the crux and gets its own section (§5). The short version: the score is trusted only insofar as it is proven to separate strong from weak *real* screenplays on a runnable, held-out benchmark with human ground truth — never by fiat, never on synthetic pairs, never on a test that skips in CI.

---

## 4. Novel Capabilities That Don't Exist Anywhere

Concrete things this tool does that Final Draft, Fade In, Dramatica, Black List, and every LLM writing assistant cannot:

1. **The Unpaid Promise Report.** A page-located list of every setup the script opens and never closes — the gun on the mantle that never fires. No tool detects this because no tool builds a promise ledger. This alone is worth the product.

2. **The Cut List.** Ranked scenes to delete, each justified by graph evidence (no open promise, no rising tension, no causal child). The first tool that helps with subtraction, the most valuable and least-tooled part of the craft.

3. **Causal Counterfactuals (OASIS with a purpose).** "Flip the protagonist's midpoint choice and re-run the graph — here are the 4 downstream scenes that break." Dramatica theorizes about story; this *simulates* the writer's specific one.

4. **The Tension Cardiogram.** A live curve of dramatic tension across the whole script, with the sagging middle shown as a measurable dip, page-located — not a vibe, a number tied to open promises and proximity-to-cost.

5. **Arc-Cost Verification.** For each principal, proof that their change *cost* them something. Flat arcs (change without cost) and static characters (no want) are flagged with page evidence. This is the "the character just decides to be good" note, computed.

6. **Reproducible, verifiable coverage.** contentHash receipts let a writer hand an agent a report the agent can *independently verify* re-ran identically. No human coverage service or LLM can offer this.

7. **Order-sensitivity as a first-class citizen.** Because the scorer reads the causal graph, moving a scene *changes the score* in a way that reflects whether the move helped or hurt. Every existing tool is order-blind (the exact act-swap AUC 0.48 failure).

---

## 5. The Discrimination / Validation Breakthrough

The current score doesn't separate good from bad (rule-channel AUC 0.076; act-swap 0.48). Here is the right way to solve it — a program, not a tweak.

### 5.1 Change what is scored

Stop scoring lexical presence. Score *graph properties* (§3.3). This is the single biggest lever, because ordering-sensitive graph metrics (escalation monotonicity, causal density, promise-payment across acts) are *structurally* able to discriminate on the axes the lexical model was blind to. The old model's AUC ceiling was low because its *inputs* couldn't see structure — you cannot fix that with better weights.

### 5.2 Build a real, runnable, held-out benchmark

Per ROADMAP P1, but made concrete:
- **Corpus:** Creative-Commons / public-domain produced screenplays (available and legally distributable) + author-contributed drafts explicitly licensed for testing. Ships *in the repo* so the test actually runs in CI — the audit's #1 finding is that the current corpus skips locally and "a test that doesn't run proves nothing."
- **Ground truth:** blinded pairwise judgments ("is A or B the stronger script?") from ≥3 independent experienced readers. Pairwise, not absolute scores — humans are far more reliable at *comparison* than at assigning a number. Measure inter-rater agreement (Krippendorff's alpha, per the audit's research findings); preserve disagreements rather than forcing false consensus.
- **Split discipline:** a pre-registered held-out set the implementer *cannot* tune against, versioned and hashed. Register metrics and gates before touching a single formula constant.

### 5.3 The right metric

- **Primary:** pairwise ranking accuracy on held-out human-judged pairs — "when readers say A > B, does the score agree?" This directly measures the only thing that matters: does the score track human quality judgment.
- **Structural stress tests (necessary, not sufficient):** shuffle-drop AUC ≥ 0.80, act-swap AUC ≥ 0.70. Act-swap is the honesty check — a graph-native score *must* pass it or it's still bag-of-words in disguise.
- **Report uncertainty:** 95% bootstrap confidence bounds, not point estimates. The gate is the lower bound, not the lucky mean.

### 5.4 Build the smallest model that passes

Do not assume "5–10 signals" or "2,300 rules." Measure each graph metric's independent contribution, then compose the *smallest* set that achieves held-out separation. If three graph metrics carry it, ship three. The rule catalog's lesson (8,917 → AUC 0.076) is that more is not better; discriminating is better.

### 5.5 The honesty ratchet

Once the score passes, freeze the benchmark, hash it, and gate every future change on non-regression against the held-out set. This is where the current system's determinism infrastructure finally earns its keep: reproducibility is the *guardrail* on a validated score, not a substitute for validating it.

---

## 6. Concrete 12-Month Execution Plan

Building with the current codebase as reference but freedom to rebuild. Sequenced demand-first, per the constitution.

**Phase 0 — Validate the pull (weeks 1–3). Blocks everything.**
Show ≥5 real screenwriters the *Unpaid Promise Report* and *Cut List* mockups (not the current 40-panel product). Core question: "would this make you run your draft?" This is ROADMAP P0, but validate the *new* wedge (subtraction + promise ledger), not the old coverage score. Gate: ≥5 sessions, clear positive signal, or reframe and repeat.

**Phase 1 — Story Graph Builder v1 (months 1–3).**
Build Engine 2 deterministically: entity tracking, promise detection (structural signals: planted objects, stated goals, posed questions, introduced threats), payment matching, per-character want tracking. Keep the existing parser. Output the graph, render it in the margin of the read view. No score yet — just *show the writer their own structure*. This alone is demoable and novel.

**Phase 2 — The Benchmark (months 2–4, parallel to P1 by a disjoint owner).**
Assemble the CC/PD + licensed-draft corpus, run blinded pairwise reader judgments, establish ground truth with inter-rater agreement, pre-register the held-out split. This is the long-pole scientific work; start it early. Ship it *in-repo* so CI runs it.

**Phase 3 — Graph-Native Scorer + Discrimination (months 4–7). The One Bet.**
Build Engine 3 on the graph. Measure each metric's held-out contribution against the Phase-2 benchmark. Compose the smallest passing model. Gate (from §5.3): pairwise accuracy strong with reported CI, shuffle-drop ≥ 0.80, act-swap ≥ 0.70. If it doesn't pass, the graph model is wrong and we fix the *model*, not the weights. Fold the surviving emotional-arc signal in only if it lifts held-out separation.

**Phase 4 — Collapse the surface (months 6–8, overlapping).**
Rebuild the UX to the three views (Read / Diagnosis / Cut). Everything else behind Labs. Instrument time-to-first-report. This is ROADMAP P2, unblocked because the score is now real.

**Phase 5 — Cut List + Counterfactuals (months 8–11).**
Ship the Cut List (Engine 3 output ranked for subtraction) and OASIS-as-counterfactual-stress-test (Engine 4 with its new job). These are the differentiating features; they ship *after* the core score is trusted.

**Phase 6 — Shareable, verifiable report + light accounts (months 10–12).**
The reproducible coverage artifact a writer hands an agent, with the external verify endpoint. Minimal auth (the AUTH.md gap) only now, for multi-user sharing. ROADMAP P3/P4.

Throughout: the 69 audit defects get fixed opportunistically as their subsystems are touched (SSRF allowlist and CSV injection early as they're cheap; non-root container and CSP before any public launch).

---

## 7. What This Becomes

Not a formatter. Not a grader. Not an AI ghostwriter.

**It becomes the instrument through which a writer sees the shape of their own story** — the first tool that reads a screenplay as a causal-temporal system of promises and holds all 110 pages in view at once, showing the writer the structure they can't hold in their own head.

The evolution:

- **Year 1 — The Reading Instrument.** A private, instant, reproducible read that shows your promise ledger, your tension curve, your unpaid setups, and what to cut. The thing you run before you pay a reader or waste six months on the wrong draft.

- **Year 2 — The Development Partner.** The counterfactual engine (OASIS) lets writers stress-test structural decisions before writing them. The report becomes the shared language between writer and agent/manager/producer — reproducible, page-located, defensible. It changes how notes are given: from "the middle drags" to "these three scenes have no open promise, here they are."

- **Year 3+ — The Story Layer for the Industry.** Every screenplay carries a verifiable structural receipt. Studios triage submissions by graph health; writers rooms track promise ledgers across an entire series bible; the reproducible-report standard becomes what "coverage" means. The moat is the validated benchmark and the graph model, both of which compound: every licensed draft added, every reader judgment collected, makes the ruler more trusted and harder to replicate.

The current system tried to be the world's most rigorous ruler before checking whether it measured anything. The rebuild inverts it: **model story the way it actually works (a causal graph of promises), prove the measurement on real writing, and only then make it reproducible, private, and shareable.** Correct before reproducible. Demand before rigor. That is the constitution, finally expressed in the architecture instead of contradicted by it.
