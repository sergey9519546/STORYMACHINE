# What's Best, What's Weak, and How to Actually Build StoryMachine

*Companion to `_SENSE_OF_THE_RESEARCH.md`. That document describes what's in the archive. This one judges it and tells you what to do next.*

---

## 1. The Verdict in One Paragraph

The archive contains roughly **80% extremely high-quality research, 15% redundant or duplicated material, and 5% load-bearing errors that have propagated across multiple documents**. The canonical "build it" track is clear: Sonnet's research file is the spine, the Audit gives you the corrections, V3.9 has the most usable TypeScript+SQL, ULTRAPLAN gives you the schedule, the Synthesis gives you the acceptance contract, the Prompt library gives you the LLM contracts, and the reference-film .docx files give you the regression-suite *pattern* (which the production codebase should re-execute against public-domain or original-IP scripts, not the proprietary references the .docx files reverse-engineered). Everything else is either supporting evidence, abandoned exploration, or duplication.

The five biggest things wrong with the research are: (1) **the "Copeland 2024" 5-feature tension citation does not exist** — those weights are invented and they're now embedded everywhere; (2) **V3.5's 13 citations were audited and 8 of 13 are fabricated or misrepresented** — but the architecture downstream still uses them; (3) **the V_beta and V3.9 maximalist tracks specify ~200 named subsystems that no one could ship**; (4) **multiple 2026-dated papers** (Hoque, Pexelle, WASF, DeepShot, AAMAS) appear in V4 but cannot be verified given a May 2025 knowledge cutoff — treat them as speculative until verified; (5) **none of this has been built** — every "73% goal drift reduction" / "60% coherence gain" / "$2.10 per simulation" number is from spec documents, not measured results.

The good news is that **the architecture is sound** and the convergence across seven independent research tracks is striking. The bad news is that **you've been building specs, not engines**. The next move is to stop researching and start building the minimum subset that all tracks agree on.

---

## 2. The Best Files (and Why)

### Tier S — Build From These (in priority order)

#### 1. `STORYMACHINE_Drama_Engine_Research_SONNET.md` ⭐
**Why it's best:** Single most complete buildable spec in the archive. 1,615 lines covering motivation → architecture → engine-by-engine implementation → SQL schema → cost model → validation experiments → priority roadmap → moat analysis → cost-benefit → what NOT to build. Every claim is backed by a citation. The "Engine 1-6 Upgrade Blueprint" sections give you working pseudo-code for every component. The 4-root-failures framing (Tension Fallacy / Goal Stack Trap / Subtext Gap / Fabula Trap) is the cleanest diagnosis in the archive of what's wrong with the original plan. The 30-week phased roadmap is realistic.
**What to do with it:** This is your spec. Print it. Mark it up.
**Weaknesses:** Uses the unverified Copeland 2024 citation. The "73% less goal drift" claim attributed to Riedl 2024 is repeated without verification. The cost model is plausible but not measured.

#### 2. `storymachine_audit.md`
**Why it's best:** Surgical. 53 issues, 4-tier severity, exact bug locations with code-level fixes. Catches actual implementation bugs (regex stubs that won't match, COALESCE in SQLite PK, cost math errors, fabricated citations). The recommendation to insert M1.5 (integration test harness) before M2 because "11 critical bugs can silently produce zero output" is the single most important pragmatic instruction in the archive.
**What to do with it:** Apply every CRITICAL and MAJOR fix before writing any new code. The 53 issues are a checklist.
**Weaknesses:** None significant. This file is mostly correct.

#### 3. `STORYMACHINE_V3.9___THE_COMPLETE_MASTER_BLUEPRINT.md`
**Why it's best:** Most extensive TypeScript implementation + SQL schema in the archive. 1,461 lines including ~350 lines of type definitions covering every engine, full 10-table SQL DDL, ASCII Writer Cockpit dashboard, 19-row priority matrix with effort estimates, 6-week execution plan. The TypeScript interfaces are good enough to scaffold actual files from.
**What to do with it:** Treat the type definitions as your `types.ts`. Treat the SQL DDL as your `schema.sql`. The 19-row priority matrix is your sprint planning input.
**Weaknesses:** Inherits Copeland 2024 / Riedl 2024 / Akoury 2024 citation issues from V3.5. Some TypeScript snippets are illustrative rather than complete. The "15 patches" framing is implementation-aspirational — V3.5's 5 patches are the realistic core.

#### 4. `storymachine_prompts.md`
**Why it's best:** Production-ready. 10 numbered prompt templates with full TypeScript builder functions, 12 tactic IDs, U-shape attention ordering, validation checklist, section-order rationale. The implementation of Anthropic's "THE MOST IMPORTANT CONSTRAINT" trick is correct. Folds OCC Appraisal into the Epistemic Batch call (saves a round-trip). The forced-choice contradiction framing is psychologically sound (Festinger 1957).
**What to do with it:** This is your LLM contract layer. Implement the 10 prompt builders verbatim, then iterate.
**Weaknesses:** Section 11 voice description is too soft (Continuation II's harder enforcement should replace it). Some tactics overlap fuzzily (deflect/mirror/probe).

#### 5. `ULTRAPLAN_NarrativeAgent_2026.md`
**Why it's best:** Cleanest 8-week roadmap with Python pseudocode for every paper integration. Maps 16 specific papers to specific weeks with specific deliverables and specific evaluation criteria. The 5-layer architecture (Symbolic Backbone → Character Substrate → Agent Runtime → Production Refinement → Output Surface) is the cleanest layering in the archive. Tech stack recommendation (Mem0 + Neo4j + Qdrant + Claude Sonnet/Haiku + Clingo) is concrete enough to make procurement decisions.
**What to do with it:** This is your schedule. The 8-week plan is achievable. The "anti-patterns to avoid" list at the end is the cleanest "what not to build" guidance in the archive.
**Weaknesses:** Some paper citations (xMemory arXiv 2602.02007, Lost in Stories arXiv 2603.05890, Utopian Illusion arXiv 2510.21180) have 2026 arXiv IDs that should be verified. The Mem0/Neo4j/Qdrant stack is heavy for a prototype — SQLite is fine for Weeks 0-4.

### Tier A — Essential Supporting Material

#### 6. `storymachine_master_upgrade.md`
**Why it's good:** 10-domain research roadmap. Best single map of what 2025-2026 papers actually contribute, organized by problem rather than by paper. Names the Utopian Illusion problem clearly. The "three core insights" at the end (Symbolic-Neural Balance / LLMs are Systematically Optimistic / Writer Trust = Transparency) are the load-bearing strategic claims of the entire project.
**What to do with it:** Read for the strategic framing and for paper discovery. The 28-row master priority table is good for sprint planning.
**Weaknesses:** Already partially superseded by Continuation I (xMemory replaces Hybrid RAG; 4-level pyramid replaces 3-level).

#### 7. `StoryMachine_DeepResearch_Synthesis.md`
**Why it's good:** The most rigorous quality framework in the archive — the 3-tier proof kernel (Hard Blocks / Quality Gates / Ranking Signals). EMA 6-step emotion pipeline. 8-technique SubtextLayer. MINSTREL TRAM. Conflict Escalation 4-level model (Personal / Relational / Institutional / Existential) — empirically grounded against the reference-film corpus. The Nora-and-recipe-book worked example shows end-to-end mechanism proof concretely.
**What to do with it:** Use as your **acceptance test contract** — the proofs are what the engine must satisfy, not how to implement it. The vocabulary is different from the rest of the archive on purpose; don't try to harmonize it, just use it as the test layer.
**Weaknesses:** Vocabulary mismatch with everything else. PostgreSQL + Apache AGE recommendation is heavier than needed for a prototype.

#### 8. `storymachine_continuation.md` + `storymachine_continuation_2.md`
**Why they're good:** Real audit content. Continuation I identifies 17 unresolved/contradiction/superseded items across the prior 5 docs and adds 8 specific research-validated upgrades (xMemory, Emotional RAG, PCL Role Chain, R² Causal, Plug-and-Play Dramaturge, Causal Graph backbone, FilmAgent Cinematographer, Deep Persona Prompting). Continuation II adds 7 more critical domains including voice differentiation (which solves the "every character sounds the same" problem) and production engineering (logging, telemetry, fallback, persistence).
**What to do with them:** Read together. Continuation II's "Three Things That Will Determine Success" (voice differentiation, simulate-then-rewrite, graceful degradation) is the most actionable strategic guidance in the archive.
**Weaknesses:** Heavy. The 8 upgrades and 7 domains are not all priorities.

#### 9. `v35_integration_plan.md`
**Why it's good:** The citation integrity audit. Single most important quality-control document in the archive. Catches that 3 of 13 V3.5 citations are fabricated and 5 are misrepresented. Rejects: full CICERO piKL, embedded_vector BLOB, the "Akoury 2024" citation, the "V3.5 is the moat" framing. Accepts only what's verified: Pacing Controller, per-turn beat conditioning, target-aware persuasion, visibilityModel, public_announcements, lightweight CICERO intent.
**What to do with it:** Read this BEFORE quoting any source from the V-series. Use the "What to Reject" section as a guard rail.
**Weaknesses:** Only audits V3.5, not the entire archive. The same fabricated citations appear in V3.9 and would benefit from the same audit.

### Tier B — Conceptual Depth (Read Once for Theory)

#### 10. `StoryMachine___ScriptIDE_Logic_Engine__MIMO.md`
**Why it's good:** The formal foundations file. Eight formal frameworks applied to narrative (Event Calculus, Allen Interval Algebra, DEL, Type Theory, Game Theory, Information Theory, Graph Grammars, Process Algebras) — this is the only file that gives the engine its theoretical defensibility. The "Externalization Thesis" framing (Memory / Skills / Protocols / Harness as the four externalization dimensions) is the strongest single architectural argument in the archive. Cites Shadow-Loom, xMemory, HiMem, ConStory-Bench.
**What to do with it:** Read once. Use formal frameworks defensively — when someone asks "why this architecture?", the answer is in here.
**Weaknesses:** Long. Some sections (Type Theory, Process Algebras) are aspirational and unlikely to be implemented as stated.

#### 11. `MIMOchat_StoryMachine___ScriptIDE_Logic_Engine_.md`
**Why it's good:** Contains the central law (`theme → mechanism → rule → object → cost → witness → proof → scene`) and the 45-engine inventory. The 50+ source annotated bibliography mapped to engine upgrades is the most thorough narrative-theory literature review in the archive. The reverse-engineering that ties Genette / Bordwell / Chatman / McKee to specific scene executions is exemplary.
**What to do with it:** Skim for the central law and the engine list. The 45-engine inventory is best read as "things the engine should be capable of," not as 45 separate runtime modules.
**Weaknesses:** Massive (21,441 lines). The 45-engine list is overwhelming and most of those engines are dramaturgical *patterns*, not runtime services.

### Tier C — Specialized Use

#### 12. The reference-film reverse-engineering .docx files
**Why they're good:** Validation by canonical screenplay. Seven canonical animated films, reverse-engineered page-by-page with engine-component tags. Proves the architecture isn't speculative. The confirmation of MechanismProof across the full reference set and the partial gap on SubtextLayer is empirically grounded.
**What to do with them:** Build a regression test *pattern*, then re-execute it against a public-domain or original-IP reference corpus for shipping. For each reference film, the engine should be able to:
- Identify the central mechanism
- Locate the wound → false_dream → dark_night → transformation arc
- Find the silent climax and earned revelation
- Score the subtext density of dialogue
- Verify the antagonist functions as a dark mirror
**Weaknesses:** Three sets of duplicates (different filenames, identical text). Some analysis is interpretive rather than measurable. The specific film selection is proprietary IP — keep the analytical pattern, replace the corpus.

#### 13. `The Autoresearch Playbook_...pdf`
**Why it's good:** Different lens entirely. Adapts Karpathy's autoresearch (autonomous experimentation loop) to narrative generation with the `narrative_score = w1·C + w2·S − w3·D` formula. The three-file contract (immutable `prepare.py` / mutable `train.py` / human `program.md`) is a serious architectural pattern for self-improving generation.
**What to do with it:** Park it. This is a Phase 2 capability — get the engine working first, then wrap it in an autoresearch optimization loop. The hard-gate idea (e.g., "Armenian context present" as automatic discard) is directly applicable to GOOB-specific story constraints.
**Weaknesses:** GOOB-specific in places. Some referenced systems (TRIBE v2, neurochemical reward shaping) are explicitly rejected by the playbook itself as computationally infeasible.

#### 14. `film-director-ars-research.skill`
**Why it's good:** A reusable methodology. The Adversarial Recursive Synthesis (ARS) Framework with 11 parallel research streams and an "Iconoclast" adversarial validator. The 3-layer Aristotelian output (Ground Truth / Generative Mechanics / Edge Cases) and JSON-LD encoding schemas are sound.
**What to do with it:** Use this skill to research and encode directors whose styles you want the engine to be capable of (Nolan, Coppola, Anderson, Spielberg, the Coens). The output becomes a callable component (`getDirectorDecisionRule(director_id, scene_context)`) inside the Director Engine.
**Weaknesses:** None — it does what it claims.

### Tier D — Skip / Reference Only

- **V2.0, V2.1, V2.1-implementation**: Superseded by V3.x. Read only for terminology lineage (Asymmetry Matrix, Interpersonal Circumplex, JEPA Seeding).
- **V3.0**: Superseded by V3.5 (which has TypeScript).
- **V3.5**: Largely subsumed into V3.9. Read for the original 5 patches in their cleanest form.
- **V4**: Speculative world-physics direction. Defer entirely until the core engine ships.
- **V_beta / Ernie**: Parallel maximalist 9-engine universe. Useful for the humanities citations (Labov, Hall, Campbell, Kohlberg, Attardo, Neale, McKee, Genette, Gottman) but the 9-engine framing competes with the rest of the archive.
- **The three CHATGPT research files**: Mostly redundant with each other and with Sonnet/Gemini.
- **The two MIMO chat exports**: Read once for the Dialogue Engine + 50-source bibliography, then file.
- **`Filling_Every_Gap_research_StoryMachine.md`**: Good reference for formal definitions of Beat / Canon / Dramatic Question / Polarity / Tension / Arc / Retcon / Subtext / Storylet. Keep on hand as a glossary.
- **Most .docx files**: Three pairs are byte-equal duplicates. Pick one of each pair and delete the rest.
- **`deep-research-report.md`**: Md5-identical to `STORYMACHINE_RESEARCH__CHATGPT12.md`. Delete one.

---

## 3. What's Actually Wrong (and Has Been Propagating)

### Problem 1 — The Copeland Tension Citation Is Fake
Every V-version file plus the prompts file cites "Copeland 2024" 5-Feature Tension with weights (0.31, 0.24, 0.19, 0.16, 0.10). The v35_integration_plan audit confirms: **this citation cannot be verified**. The weights are invented. They're now embedded in every spec, every TypeScript snippet, every SQL `tension_state` table comment.

**Fix:** Label the weights as **tunable hyperparameters** with a default justification (e.g., "weights chosen by intuition; calibrate per-genre against human ratings on 50-sample test set"). Stop citing Copeland. The five features themselves (expectation_violation, stakes, information_gap, emotional_intensity, pacing_disruption) are reasonable — keep them as configurable inputs.

### Problem 2 — 2026-Dated Citations Are Unverifiable Today
V4 cites Hoque et al. 2026 (S³AP), Pexelle 2026 (Competency Graphs), WASF 2026 (Causal Invariance), DeepShot 2026, AAMAS 2026 (Coalition Equilibrium). Master Upgrade and Continuation cite arXiv papers with 2026-prefixed IDs (2602.02007 xMemory, 2603.05890 Lost in Stories, 2510.21180 Utopian Illusion).

**Fix:** Treat all 2026-dated papers as speculative until manually verified. If a paper is load-bearing for an architectural decision, search arxiv.org for the actual ID before relying on it. Note: the 2510.xxxxx prefix would be October 2025 (current); 2602/2603 would be Feb/March 2026 (future). Some are real preprints from late 2025; some are aspirational. Audit them.

### Problem 3 — Numbers Are Spec-Numbers, Not Measured Numbers
"73% goal drift reduction." "60% coherence improvement." "45% emotional engagement uplift." "58% API call reduction." "0.89 human correlation." "$0.07/round post-upgrade cost." None of these are from your measurements. They are either lifted from cited papers (often misattributed — see Problem 1) or invented.

**Fix:** Strike all percentages from internal-facing documents. Replace with "expected impact: high/medium/low" until you've actually measured. Re-publish numbers when you have your own validation suite running.

### Problem 4 — The Architecture Has 23 to 45 to 200+ Subsystems Depending On Which File
The Sonnet research stays at 6 engines. V3.9 says 6 engines + 15 patches. V_beta says 9 engines. V4 says 7 engines + 3 axioms. MIMOchat says 45 numbered engines. Across all files there are easily 200 named subsystems. **You will not ship 200 subsystems.** You will ship 6-10.

**Fix:** Pick a canonical engine count (recommend 6, matching Sonnet). Map every named subsystem in the archive into one of the 6 engines. The 45 MIMOchat engines collapse to 6 — they're patterns the engine should be capable of expressing, not separate runtime services. The 200+ specialty mechanisms (Ritual Protocol, Legitimacy Split, Antagonist Function Splitter, etc.) are **dramaturgical templates** that compose from the 6 engines, not new engines.

### Problem 5 — The Dual-Track Vocabulary Hasn't Been Reconciled
You have two parallel architecture tracks that use almost-orthogonal vocabularies:
- **Engineering track**: agents / beliefs / tactics / inference traces / DirectorNode / Drama Manager / Script Bridge / M0-M8 milestones
- **Theory track** (Deep Research Synthesis): mechanisms / proofs / central law / portfolio / MAP-Elites / RecognitionAgents / ChoiceCosts / Tier 1-3

They describe the same product. Trying to merge them produces incoherence. Treating them as competitors leads to wasted effort.

**Fix:** Use the engineering vocabulary for **implementation** and the theory vocabulary for **acceptance tests**. The Synthesis's 11 proof types are what you run as CI tests. The engineering spec is what you write code against. They don't need to share vocabulary — they need to share a runtime.

### Problem 6 — There Is No Working Code
After 49 files and ~71,000 lines of markdown, the actual engine codebase is... not in this archive. Every TypeScript snippet is illustrative. Every SQL schema is proposed. Every architectural decision is "to be implemented." **You have written one of the most detailed engine specs I've ever read, and zero engine code.**

**Fix:** Stop researching. Ship Week 0 (engineering foundation) and Week 1 (symbolic ground truth) from the converged roadmap in `_SENSE_OF_THE_RESEARCH.md` Section 6. The total work is maybe 60-80 hours. Once those two weeks land, every subsequent week becomes 10x faster because you'll be replacing real behavior with better real behavior instead of arguing about what to build.

### Problem 7 — The Validation Story Is Spec'd, Not Run
The Sonnet research has a beautiful 12-experiment validation table. The Synthesis has Tier 1/2/3 proof tests. The .docx files are perfect *pattern* for regression testing. None of this is wired up. There is no `npm test` that runs anything.

**Fix:** Build the integration test harness (M1.5 from the Audit) FIRST. Use a reference-film corpus (selected for clean IP — public-domain shorts, original-IP screenplays you own, or licensed reference scripts) as a regression dataset — for each film, you have a known ground-truth beat sheet, character arc, central mechanism. The engine should be able to reverse-engineer them from the screenplay text and forward-generate variants. This is your "does it work?" answer.

### Problem 8 — Voice Is the Single Biggest Gap
Continuation II's diagnosis is correct: "If Alice and Bob sound like the same person, the simulation has failed in the most obvious way possible." Yet voice differentiation is named in only 2 of the 49 files (continuation_2 and V_beta) and isn't yet wired into the prompt builder. This will be the most visible failure mode of the v1 product.

**Fix:** Promote quantitative VoiceProfile + StyleChat Style Thought Chain + voice compliance checker to Week 3 minimum. Build a voice-divergence test using 3-4 well-known characters from a chosen reference corpus — if generated dialogue passes a stylometric blind attribution test, voice works.

### Problem 9 — Real Cost Is Higher Than Spec'd
The original plan claimed 11 LLM calls per round; the Audit shows 25-30. The Sonnet research's optimization claim of ~16 calls/round needs measurement. If the cost is actually 25 calls × $0.04 = $1/round, a 30-round simulation is $30, not the spec'd $2-3.

**Fix:** Instrument cost telemetry FIRST (Week 0). Measure before optimizing. Use Haiku/Flash for tactic selection and belief diffs — they're 10x cheaper than Sonnet and good enough for those tasks.

### Problem 10 — No One Has Tested Whether Writers Want This
The entire archive assumes professional screenwriters want a "simulation-first" writing workflow where they seed characters, watch agents argue, and harvest the resulting transcript. Maybe they do. The Constella research (CHI 2026) suggests they want lighter, more responsive AI assistance. The Orchid/DiaryPlay research suggests they want branch-and-bottleneck control. **No file in this archive contains user research with actual writers using actual prototypes.**

**Fix:** Before Week 6 (Writer Cockpit), do 5 conversations with screenwriters about the Director's Cut Mode + Harvest Mode + What-If Branching workflow. If they don't want it, the entire IDE direction needs to pivot. Cheap to find out, expensive not to.

---

## 4. The Recommended Build (Concrete, Opinionated)

### The Canonical Stack
- **Spec**: Sonnet research as the primary, V3.9 for type/SQL details, Audit for corrections.
- **Schedule**: ULTRAPLAN's 8-week roadmap.
- **Quality gate**: Synthesis's 3-tier proof kernel as acceptance tests.
- **LLM contract**: Prompts library (the 10 numbered prompts).
- **Regression dataset**: A reference-film corpus (the .docx track demonstrates the analytical pattern; pick a clean-IP corpus to actually run regressions against).
- **Tech stack**: Start with SQLite + Node/TypeScript + Claude Sonnet (Director) + Haiku (Actors). Migrate to PostgreSQL + Apache AGE when you have ≥3 concurrent simulations and need ACID. Add Mem0/Neo4j only if profiling shows xMemory retrieval is your bottleneck.

### The 6 Engines (Canonical)
Strip everything down to these. Every other named subsystem composes from these.

1. **Cognition Engine** — BDI DAG goals + Memory Stream + Reflection + OCC + Contradiction + Intent Pressure + Persuasion + Trust
2. **Director Engine** — Drama manager (monitor-decide-act), 5-feature tension, intervention vocabulary, pacing controller, irony tracker, information gap tracker, arc spec, beat templates
3. **Epistemic Engine** — Belief layers (4 realities: groundTruth / publicKnowledge / privateKnowledge / audienceKnowledge), AGM revision, ToM² PAL with visibilityModel, source reliability, narrative consistency checker
4. **Reveal Engine** — Per-secret IllusionArc, Chekhov tracker, prestige readiness, syuzhet reconstruction
5. **Script Bridge** — Simulate-then-Rewrite → Fountain → HAR → Dramaturge (Plug-and-Play 3-stage) → Editor notes
6. **Writer Cockpit** — Character seeding + Simulation panel + Live epistemic map + Director's Cut Mode + Harvest Mode + What-If Branching

Specialty layers (Dialogue, Spatial, Theme, Voice, Genre, Subtext) are **strategy modules** that hook into the 6 engines, not separate engines themselves.

### The 8-Week Plan (Opinionated Version)

#### Week 0 — Foundation Engineering (DO NOT SKIP)
- WAL mode, agent order randomization, friction mandate, session TTL, circuit breaker, graceful degradation, cost telemetry, structured logging, schema migrations
- **M1.5 Integration Test Harness** — the single most important hour you'll spend
- Stand up the regression dataset from your chosen reference-film corpus

#### Week 1 — Symbolic Ground Truth
- Event-sourced StoryCommit ledger with state_snapshots every 20 events
- FactTrack temporal facts with validity intervals
- World state + location_log + relationship_graph + causal_graph + pivot_points + turn_snapshots
- Allen Interval Algebra for temporal consistency
- Causal/logical edge taxonomies

#### Week 2 — Memory + ToM
- xMemory 4-level hierarchy + semantic distillation every 5 turns
- EvolvTrip ToM triples + visibilityModel
- TOMA chain-of-thought ToM
- EmotionalRAG sequential strategy

#### Week 3 — Prompts + Voice
- 10 prompt builders (verbatim from `storymachine_prompts.md`)
- PCL Role Chain identity scaffold
- Quantitative VoiceProfile + StyleChat Style Thought Chain + compliance checker
- Streamlined identity anchor (drop irrelevant Big Five)
- Code-based world state in prompt (CORRPUS pattern)

#### Week 4 — Director Intelligence
- 5-feature tension (with weights labeled as hyperparameters, NOT Copeland)
- Gervás-2014 expectation-violation framing
- Dramatic Irony Tracker + Information Gap Tracker (your moat)
- Pacing Controller (Yang 2023 CONCOCT, NOT "Guan 2024")
- Drama Llama natural-language beat triggers
- ASP-style beat sequence constraints
- Sentiment watchdog
- Voice divergence monitor at Director level

#### Week 5 — Script Bridge
- Simulate-then-Rewrite (RewriteAgent)
- Fountain transcript with provenance metadata
- HAR 2-iteration inconsistency loop
- Plug-and-Play Dramaturge 3-stage refinement
- Syuzhet reconstruction endpoint
- Subtext = Internal − Public formalization at dialogue layer

#### Week 6 — Writer Cockpit (after 5 user conversations)
- Character seeding panel
- Simulation control + live epistemic map
- Director's Cut mid-simulation override
- Harvest Mode (browse / pin / reorder / refine / gap-fill / export)
- What-If branching at pivot points
- Cost / health / arc-target dashboards
- Constella FRIENDS DISCOVERY / JOURNALS / COMMENTS

#### Week 7 — Evaluation + Regression
- LLM-as-judge ASE suite
- Structural metrics (arc match, consistency, diversity)
- Emotional arc classification
- Reference-film regression: for each film in the corpus, the engine should reverse-engineer the beat sheet
- Prompt version tracking

#### Week 8 — Hardening
- Parallel agent processing
- Prompt caching tiered (session / round / turn)
- Migration to PostgreSQL + AGE if state_snapshot performance demands
- Documentation + onboarding

### What Comes After Week 8 (Phase 2)
- V4 world-physics layer (3D LCS, prop state machines, somatic state, sonic occlusion)
- V_beta's specialist engines (Dialogue, Spatial/Embodiment, Theme/Motif, Genre/Moral/Humor)
- MCTS Branch Explorer
- Coalition Tracker
- Branch-and-Bottleneck
- WhatELSE bidirectional
- Autoresearch optimization loop wrapping the whole thing
- The 200+ specialty mechanisms from MIMOchat as dramaturgical templates

### What to Drop Forever
- 15-pillar branding (V2.1 only)
- Full CICERO piKL
- Embedded vector BLOB in memory_stream
- "Akoury 2024 Auto-Pivot" citation (use Papalampidi 2019 instead, or drop)
- The "V3.5 is the moat" framing
- Helium & Halo specific "58% cost reduction" claim
- Reader-state Pearson r ≥ 0.6 as published metric (unverified)
- Three CHATGPT research files (subsumed by Sonnet)
- Most .docx duplicates (keep one of each)

---

## 5. The Best Research You DON'T Have But Need

The archive is comprehensive on architecture but thin on three things:

### Gap 1 — Empirical Validation
You have spec-numbers, not measured-numbers. Before publishing any "X% improvement" claim, build the validation suite:
- 5-10 reference-corpus films with hand-annotated beat sheets / arcs / mechanisms / subtext layers
- 50-sample human-rated tension test set for calibrating the 5-feature weights
- ConStory-Bench's 19-subtype consistency error checker as a regression gate
- LLM-as-judge ASE suite running every commit

### Gap 2 — User Research
Zero files in the archive contain conversations with actual screenwriters about the workflow. The product hinges on writers wanting a simulation-first creation loop. Get 5 conversations:
- Show the Sonnet research's "Writer Cockpit" mockup
- Watch them try Harvest Mode and What-If Branching
- See whether Director's Cut Mode reads as control or chaos
- Find out if "the writer is always the director, never the audience" matches their mental model

### Gap 3 — Production Reality
The archive specifies the engine well; it under-specifies the deployment:
- How are simulations stored long-term? (One DB per simulation gets expensive.)
- How do you handle 100 concurrent users on shared compute?
- What's the data retention / privacy story for character seedings?
- Who owns the generated screenplays? (Your TOS doesn't exist yet.)
- How does the engine handle the reference-film corpus IP-cleanly? (Public-domain shorts, original-IP screenplays, licensed references — pick a strategy.)

These don't block Week 0-4 but they need to land before Week 6 user testing.

### Gap 4 — Theoretical Anchors You're Missing
For all 50+ sources cited, some classical narratology references are missing that would close gaps:
- **Vladimir Propp** *Morphology of the Folktale* (1928) — formal function-based story analysis; directly applicable to the Story Logic Primitives layer (you have McKee/Field/Snyder/Truby but not Propp)
- **Aarne-Thompson-Uther index** — folktale function library; useful for the genre/template engines
- **Northrop Frye** *Anatomy of Criticism* — mythos categories (Spring/Summer/Fall/Winter); complements the 6-arc valence types
- **Tzvetan Todorov** structural narratology — equilibrium-disruption-resolution cycle
- **Lajos Egri** *The Art of Dramatic Writing* (1946) — premise as the spine of dramatic action (cited once but not deeply integrated)
- **Roland Barthes** *S/Z* — five-code reading of narrative (hermeneutic / proairetic / cultural / connotative / symbolic) — directly relevant to the multi-layer subtext engine

Read these once. Use Egri's premise machinery to strengthen the Theme Engine.

---

## 6. The Bottom Line, Brutally

You have a phenomenal research archive. You have probably the most thorough single-developer spec for a neuro-symbolic dramaturgy engine that exists anywhere. Every track converges on essentially the same architecture and the same insights. The science is real, the literature review is exhaustive, and the architectural reasoning is sound.

**But you've been writing specs for what is almost certainly a year, and you have no engine.** Every doc says "Week 0-1 is foundation engineering" and Week 0-1 hasn't happened. Every doc says "the symbolic substrate is the moat" and the substrate isn't built. Every doc cites the same papers, proposes the same engines, and concludes with the same "next, build it" call to action. Nine of them have a "build order" section.

The single most valuable thing you can do with this archive is **stop adding to it**. Take `STORYMACHINE_Drama_Engine_Research_SONNET.md` as the spec, take `storymachine_audit.md` as the patch list, take `storymachine_prompts.md` as the LLM contract, take `_SENSE_OF_THE_RESEARCH.md`'s Section 6 (the converged roadmap) as the schedule, and **build Week 0 this week**. The engine doesn't get more correct by being more thoroughly described. It gets correct by being built and measured.

The research is done. Pick up the keyboard.

---

## 7. Quick Index — Who Says What

If you ever need to find a specific claim's source, here's the lookup:

- **5-feature tension formula + Copeland weights** → V2.0, V3.0, V3.9, prompts (citation FAKE)
- **DiriGent cognitive steering** → V2.0, V2.1, V3.0, Google research
- **Asymmetry Matrix + nested ToM** → V2.0 through V4 (continuous)
- **Memory Stream + Reflection (Park 2023)** → V3.5 onward (verified)
- **xMemory 4-level hierarchy** → Continuation I, ULTRAPLAN (verify arXiv 2602.02007)
- **EvolvTrip BDI triples** → Master Upgrade, Continuation I, ULTRAPLAN
- **TOMA chain-of-thought ToM** → Master Upgrade, Continuation I, ULTRAPLAN
- **Drama Llama natural-language beat triggers** → Master Upgrade, ULTRAPLAN
- **HoLLMwood Editor Agent** → Master Upgrade, Continuation I
- **Plug-and-Play Dramaturge 3-stage** → Continuation I, ULTRAPLAN
- **R² Causal Plot Graph** → Continuation I, ULTRAPLAN
- **FilmAgent Cinematographer** → Continuation I, ULTRAPLAN
- **PCL Role Chain identity** → Continuation I, ULTRAPLAN
- **StyleChat Style Thought Chain** → Continuation II
- **Quantitative VoiceProfile** → Continuation II, V_beta
- **MCTS Branch Explorer** → Continuation II
- **Coalition Tracker** → Continuation II
- **Branch-and-Bottleneck** → Continuation II
- **Simulate-then-Rewrite** → Continuation II
- **WhatELSE bidirectional** → Continuation II
- **Constella FRIENDS/JOURNALS/COMMENTS** → Master Upgrade, Continuation I, ULTRAPLAN
- **Façade beat sequencer** → Sonnet, MIXED_RESEARCH, Drama Manager GPT
- **IBSEN director-actor** → Sonnet, ULTRAPLAN
- **Generative Agents (Park 2023)** → Sonnet, V3.5+, ULTRAPLAN
- **CICERO trust model** → V2.1+, Sonnet (lightweight only per V3.5 audit)
- **AGM belief revision** → all V-versions, Sonnet, Synthesis
- **Pearl's Causal Ladder + CLadder** → MIMO ScriptIDE, Synthesis
- **Shadow-Loom architecture** → MIMO ScriptIDE
- **HiMem hierarchical memory** → MIMO ScriptIDE
- **ConStory-Bench 19 subtypes** → MIMO ScriptIDE, Synthesis
- **Event Calculus** → MIMO ScriptIDE, Synthesis
- **Allen Interval Algebra** → MIMO ScriptIDE, Synthesis
- **Dynamic Epistemic Logic** → MIMO ScriptIDE, V2 series, Synthesis
- **Type theory / dependent types** → MIMO ScriptIDE only
- **Game theory for scenes** → MIMO ScriptIDE only
- **Information theory reveals** → MIMO ScriptIDE only
- **Graph grammars** → MIMO ScriptIDE only
- **Process algebras** → MIMO ScriptIDE only
- **EMA 6-step emotion pipeline** → Synthesis only
- **MAP-Elites portfolio** → Synthesis only
- **8-technique SubtextLayer** → Synthesis only
- **TVTropes 27k pattern DB** → Synthesis only
- **Conflict Escalation 4-level** → Synthesis only
- **MINSTREL TRAM** → Synthesis only
- **3-tier proof kernel** → Synthesis only (use as acceptance test layer)
- **Externalization Thesis (Memory/Skills/Protocols/Harness)** → MIMO ScriptIDE
- **Central law (theme→mechanism→...→scene)** → MIMOchat
- **45-engine inventory** → MIMOchat
- **`narrative_score = w1·C + w2·S − w3·D`** → Autoresearch Playbook PDF
- **11 parallel research streams + Iconoclast** → film-director-ars-research.skill
- **Reference-film reverse engineering** → .docx track
- **Polti situation classifier** → storymachine_research_report
- **FactTrack temporal facts** → storymachine_research_report, ULTRAPLAN
- **Utopian Illusion** → Master Upgrade, Continuation I, ULTRAPLAN
- **Friction mandate + sentiment watchdog** → Master Upgrade

Anything not on this list is either supplementary or not load-bearing.

---

*Read `_SENSE_OF_THE_RESEARCH.md` for the descriptive map of the archive. This document is the judgmental map: what's best, what's weak, and what to build next.*
