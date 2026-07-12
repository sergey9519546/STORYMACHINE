# Research Intake 2026-07-11B — Emotional Engine / RNE / Multi-Agent / Anti-Slop

~30 new docs + Python prototypes read by 5 parallel readers. Verdict map below.
Governing test unchanged: does it survive NORTH_STAR (deterministic canon, proof
before preference, no LLM judge owns canon, no single scalar) and does it attack
a REAL measured gap (theme blind spot, INTENTION over-fire, verbosity bias +6,
act-swap AUC ≈0.48, no calibration/abstention)?

## Headline: do NOT reroute. Expand with 3 deterministic, law-compliant additions.
The strongest new idea — an **emotional-arc trajectory signal** — is exactly what
the engine is missing, and it may be the first thing to beat the act-swap
global-arc blind spot.

## ADOPT (minimal, deterministic)
1. **Emotional-arc signal channel (VAD + tension trajectory).** From
   `uvm_state_tensor.py` / `escp_protocol.py`: per-scene VAD (valence[-1,1],
   arousal[0,1], dominance[0,1]) + tension[0–100] tracked across scenes into an
   arc (Reagan et al. 2016 six shapes — verified). Tension constraints as soft
   signals: climax expects tension≥~80, resolution≤~20; flag VAD drift >0.3 with
   no causal trigger. **Why #1:** an emotional arc is inherently POSITION-AWARE,
   so it directly targets act-swap AUC ≈0.48 (ROADMAP §5.1, the top open gap) AND
   gives the theme/emotion blind spot a real deterministic signal. Prototype →
   measure act-swap + shuffle AUC on the real corpus before shipping (measure-
   before-threshold). Strip ALL the CrewAI/agent/message-bus wrapping — the core
   is ~150 lines.
2. **Anti-slop detectors + verbosity-bias FIX.** From `ai-slop-storytelling-
   research.md`: replace raw word-count density normalization (the confirmed +6
   verbosity bias, Phase-B metamorphic) with **deviation-from-corpus-mean**
   scoring; add heuristic-tier detectors for negated-statement clichés ("it's not
   X, it's Y"), generic emotional descriptors, and vocabulary-freshness. Fixes a
   proven bug + adds genericness coverage. Tier per W1 (`pattern_to_watch`).

## ADAPT (extract insight, drop the wrapper)
3. **Character interiority + abstention.** From RNE (`RNE_ISSUES_REPORT`): make
   NEED/FEAR/WOUND and emotional-climax dramatization DIAGNOSTIC signals (not
   gates). Use critic **disagreement** (the MAD "Degeneration-of-Thought"
   perplexity idea, reframed deterministically) as the trigger for the
   **abstention** outcome already in the plan. TS-SF (Green & Brock 2000,
   verified) + NVAR rubric = the **human-label rubric for Phase G** — as
   diagnostics, never a gate.

## REJECT (violate the laws)
- **RNE V8 as a reroute.** It replaces proof gates with a single scalar (TS-SF
  transportation ≥5) + LLM multi-agent DEBATE (persuasion, not proof). Violates
  "proof before preference" AND "no single scalar." Keep its character/emotion
  *insights*, drop its architecture.
- **Permanent multi-agent swarm / CrewAI / LangGraph / ESC-P bus / MAD-debate-as-
  gate.** Contradicts "sparse evidence-triggered specialists, no LLM judge,
  deterministic canon." The engine's 12 rule-based critics already fill this role.
- **TS-SF (or any scalar) as a quality GATE.**

## DEFER
- event-store/saga migration + LangGraph PostgresSaver (modest robustness; current
  SQLite + StoryCommit ledger is sufficient); MCP connectors; graph DB.

## Citation status (CORRECTED 2026-07-11 via deep-fact-check)
Prior "fabricated — impossible year" flags were MY error: arXiv IDs use `YYMM`,
so `2601`=2026-01 and `2604`=2026-04 (valid 2026 papers), and `2025-11-17` is a
PAST date (today is 2026-07). **VERIFIED REAL:** `arXiv 2601.03698` (Evaluation
Framework for AI Creativity — the NVAR rubric); `arXiv 2604.09854` (Spoiler Alert:
Narrative Forecasting / 100-Endings tension, Sui & Holtzman et al.). Both are
citable and directly relevant. **STILL UNVERIFIED (flag for check, do NOT assert
fabricated):** "Anthropic 2026: Emotion Concepts in LLMs", `arXiv 2508.02132`.
Lesson (Ernie
fabrication pattern. VERIFIED-real anchors: Reagan et al. 2016 (6 arcs), Green &
Brock 2000 (Transportation Scale). Re-ground any adopted mechanism on real sources.

## Housekeeping
`STORYMACHINE V1 REPO/stage-plans/ROADMAP.md` is STALE (302 lines, missing the
§7 research-integration decisions). The canonical `STORYMACHINE/ROADMAP.md` (now
361 lines) + `docs/research-audit/*` are the source of truth. Ignore stage-plans.

## How this feeds the scoring-kernel program (Phases A–I)
- **Emotional-arc signal** → a new dimension in the multidimensional scorecard (Phase D) AND a candidate act-swap-AUC fix (measure now).
- **Anti-slop / deviation density** → fixes the Phase-B verbosity bias; feeds Phase C scorer separation.
- **TS-SF/NVAR** → the Phase-G human-label rubric. **Disagreement→abstention** → Phase F/G.
- Nothing here changes the verdict: proceed with the kernel rebuild; do NOT adopt RNE V8.
