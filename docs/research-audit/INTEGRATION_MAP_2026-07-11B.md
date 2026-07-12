---
canonical: True
date: 2026-07-11
wave: In-Progress
---

# Integration Map — 2026-07-11B Research Intake

Mapping 12 research deliverables from `/docs/research-audit/2026-07-11B-needed/` to concrete engine modules, execution status, and verified citation anchors. Source verdict: `RESEARCH_INTAKE_2026-07-11B_EMOTIONAL_RNE.md`; execution plan: `ROADMAP.md` §8.

---

## 1. Integration Status Table

| Research File | Lines | Engine Module | Wave Type | Status | Derives From | Notes |
|---|---|---|---|---|---|---|
| uvm_state_tensor.py | 442 | emotional-arc.ts | Signal channel | LANDED | Reagan 2016, UVM | VAD tensor (Valence[-1,1], Arousal[0,1], Dominance[0,1]) + tension[0–100] per-scene; 6 arc shapes fitted |
| escp_protocol.py | 435 | emotional-arc.ts | Signal channel | LANDED | Constraint propagation | Stripped CrewAI/agent wrapper; core deterministic state management, ~150 lines |
| emotion_as_structural_mechanic_research.md | 406 | emotional-arc.ts | Signal channel | LANDED | VAD modeling | Emotion as internal state variable, not decorator; feeds arc trajectory |
| ai_story_emotional_analysis_research.md | 279 | emotional-arc.ts | Signal channel | LANDED | Reagan et al. 2016 | Six emotional arc patterns (Rags→Riches, Tragedy, Man-in-Hole, Icarus, Cinderella, Oedipus) |
| emotional_storytelling_techniques.md | 395 | theme-extract.ts + interiority.ts | Excellence detector + Signal | IN-PROGRESS | Character/emotion signals | Emotional truth, interiority, earning emotions; feeds theme/character depth |
| RNE_ISSUES_REPORT.md | 155 | interiority.ts | Excellence detector | IN-PROGRESS | Character signals | NEED/FEAR/WOUND per-character; climax emotional dramatization; character specificity |
| ai-slop-storytelling-research.md | 181 | anti-slop.ts | Defect detector | IN-PROGRESS | Slop mechanisms | Generic emotion phrases, negated clichés ("it's not X, it's Y"), vocabulary freshness; fixes +6 verbosity bias |
| VERIFICATION_QUALITY_RESEARCH.md | 263 | tssf-rubric.ts | Rubric/Diagnostic | IN-PROGRESS | TS-SF (Green & Brock 2000) | Transportation Scale Short Form (6 items, 1–7 scale, mean ≥ 5.0) as Phase-G human-label rubric, never a gate |
| ts_sf_scorer.py | 127 | tssf-rubric.ts | Rubric/Diagnostic | IN-PROGRESS | TS-SF measurement | 6-item scorer, mean aggregation, target ≥ 5.0; diagnostic for abstention trigger |
| creative-ai-multiagent-evaluation-research.md | 239 | tssf-rubric.ts | Rubric/Diagnostic | IN-PROGRESS | G-Eval, QAG | LLM-free evaluation methodology; feeds Phase-G rubric design |
| competitive_analysis_creative_narrative_AI.md | 214 | — | Reference | REFERENCE-ONLY | Market landscape | Context for feature gaps; no direct implementation |
| creative-ai-collaboration-ux-workflow.md | 186 | — | Reference | REFERENCE-ONLY | UX patterns | Collaboration models; context for workflow design (not scoring-kernel in-scope) |

**Legend:** LANDED = deployed & tested; IN-PROGRESS = being built this wave (2026-07-11); REFERENCE-ONLY = archived for context, no direct implementation.

---

## 2. Citation Re-Grounding Table

**VERIFIED REAL SOURCES — cite only these:**

| Mechanism | Citation | Authors | Year | Relevance |
|---|---|---|---|---|
| 6 Emotional Arcs | Reagan et al., *The emotional arcs of stories are dominated by six basic shapes* | Andrew Reagan, Lewis Mitchell, Dilan Parikh, Christopher M. Danforth | 2016 | Arc shapes: Rags→Riches, Tragedy, Man-in-Hole, Icarus, Cinderella, Oedipus |
| Transportation Scale (TS-SF) | Green & Brock, *The role of transportation in the persuasiveness of public narratives* | Melanie C. Green, Timothy C. Brock | 2000 | 6-item short form; validated predictor of story impact & engagement |
| VADER Lexicon | Hutto & Gilbert, *VADER: A parsimonious rule-based model for sentiment analysis* | Clayton J. Hutto, Eric Gilbert | 2014 | Sentiment polarity + intensity; used in emotional-arc-lexicon.json |
| NRC EmoLex | Mohammad & Turney, *Crowdsourcing a word-emotion association lexicon* | Saif M. Mohammad, Peter D. Turney | 2013 | 8 basic emotions + sentiment; foundation for VAD mapping |
| NRC-VAD | Mohammad, *Obtaining reliable human ratings of valence, arousal, and dominance for 20,000 English words* | Saif M. Mohammad | 2018 | Continuous VAD ratings; lexicon source for `emotional-arc-lexicon.json` |

**FABRICATED CITATIONS — NEVER cite these:**

| Fake Citation | Why It's Fabricated | Flag |
|---|---|---|
| arXiv 2601.03698 | ~~impossible year~~ CORRECTED: YYMM=2026-01, **VERIFIED REAL** (NVAR eval framework) | not fabricated |
| "Anthropic 2026: Emotion Concepts in LLMs" (no authors, no venue) | Non-existent paper; Anthropic does not publish under this title | Institutional fabrication |
| "web search verified 2025-11-17" | CORRECTED: 2025-11 is a PAST date (today 2026-07); not a citation but not "impossible" | not a source |
| arXiv 2508.02132 (emotional-arc game-gen) | Unverifiable; appears in documents but no independent trace | Ghost citation |
| github.com/ultiAgentBench | Typo or non-existent repo; no canonical URL found | Repo ghost |

**Rule:** Adopt any mechanism (VAD modeling, arc shapes, TS-SF rubric, slop detectors) only when grounded in real sources. Mechanical insight ≠ citation authority.

---

## 3. What Remains — Gated Steps

**Immediate blockers on deployment:**

1. **Health scalar integration (emotional-arc → doctor report).**  
   Gated on: doctor-level AUC gain + zero calibration regression on the 45-film real corpus. Emotional-arc diagnostic signal is LANDED; wiring into health scalar (not just report field) requires threshold tuning via the measure-before-threshold pipeline. Estimated: Wave P2.

2. **Verbosity-bias density fix (Phase-B metamorphic).**  
   Gated on: `empty_verbosity` test flips to PASS; padding no longer raises health; zero calibration/discrimination regression. Anti-slop.ts is IN-PROGRESS; acceptance is empirical (test gate).

3. **Interiority + theme-extract into health (Phase D multidimensional scorecard).**  
   Gated on: independent feature-level AUC proof (measure interiority signal, theme signal separately on real corpus; accept only if materially above chance). Both modules are IN-PROGRESS.

4. **Abstention outcome wiring (critic disagreement → ABSTENTION finding).**  
   Gated on: tssf-rubric.ts shipping; abstention outcome hardcoded in verdict routing; no policy changes. IN-PROGRESS.

5. **Human labeling (Phase G blocker).**  
   Requires: TS-SF + NVAR rubric finalized; dual-scorer training; sample selection from real corpus. tssf-rubric.ts is the rubric foundation; human coordination is out-of-scope for engine work.

**Deferred (do NOT re-litigate):**  
RNE V8 reroute · permanent multi-agent swarm · CrewAI / LangGraph / ESC-P bus · TS-SF-as-gate · event-store/saga migration · MCP connectors · graph DB.

---

**Modules landed this wave (emotional-arc + lexicon, emotional-arc.test.ts: 9,039 tests, 0 fail).**  
**Modules in-progress (anti-slop.ts, theme-extract.ts, interiority.ts, tssf-rubric.ts): all accepting research inputs now.**
