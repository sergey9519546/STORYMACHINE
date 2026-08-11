# Engine vs GODMODE Standard — Screenplay-Understanding Audit

**Date:** 2026-08-11. **Standard audited against:**
`docs/screenplay-understanding/GODMODE_STANDARD.md` (45 + 38 sections; 30
understanding levels + annotation layers A–Z + the 32-part artifact bundle).
**Method:** read-only code audit of `server/nvm/` against the standard; corpus
inventory of `data/`, `screenplay-training/`, `script-training/`. No engine code
was modified.

---

## Headline finding — the diagnosis that changes everything

**The engine already contains correct implementations for roughly 16 of the 30
GODMODE understanding levels. They are unwired.** Each one's own file header
says "zero production importers anywhere except its own test." The health score
reads almost entirely from the *floor* (per-scene content signals + density
math); the *ceiling* (positional, relational, graph, epistemic analytics) exists
as a research surface but is not coupled to the score, the verdict, or the
coverage report a writer sees.

This overturns the prior P1 structural diagnosis ("every field in
`ScreenplaySceneRecord` is per-scene content-derived, so reordering is
undetectable"). That diagnosis is **stale at the substrate level and true only at
the score level.** The engine has four genuinely order-sensitive mechanisms
(`temporal-consistency`, `cold-open-promise`, `well-made-surprise` /
`belief-movement` / `typed-promises` / `disclosure-ledger`, and `metrics.ts`'s
OLS/peak/aftermath computations). They just don't reach health.

**Implication:** the path to a discriminating score is not "build new signals
from scratch." It is (1) study the famous-film corpus against the GODMODE
standard to produce validated annotations, and (2) use those annotations to
wire, calibrate, and prove the modules that already exist — plus fill the three
genuinely-absent levels. The famous films are the source of truth because they
are the only material that carries the full depth the standard demands.

---

## Part 1 — the 30-level coverage map

Coverage key: **WIRED** (feeds the doctor score/report) · **BUILT-UNWIRED**
(correct implementation exists, zero production importers) · **PARTIAL** (engine
extracts something adjacent) · **ABSENT** (no extractor at all).

| # | GODMODE level | Coverage | Where | Gap |
|---|---|---|---|---|
| 1 | Script Intent Profile | **ABSENT** | — | No "what is this script trying to be" inference; `StoryContext` carries user-supplied genre/tone as input, not extracted intent |
| 2 | Premise / Story-Engine | **PARTIAL** | `logline.ts`, `story-spine.ts` (**unwired**), `cold-open-promise.ts` | Logline built for export only; story-spine (protagonist proxy + spine tokens) exists but is unwired; no "story engine" (the generative mechanism) modeled |
| 3 | World / Rules / Institutions | **ABSENT** | `truth-ledger.ts` (schema only, **unwired**) | Truth-ledger defines 8 epistemic layers + canon tiers but admits "the extraction adapter was never wired." No world-rule extractor |
| 4 | Fabula / Syuzhet | **BUILT-UNWIRED** | `disclosure-ledger.ts`, `temporal-consistency.ts` | Both define fabula-vs-syuzhet explicitly (storyTimeIndex vs discourseIndex, Allen interval algebra). disclosure-ledger is unwired AND its heuristic seed makes it order-blind in practice (D6 defect — see below) |
| 5 | Causal Architecture | **PARTIAL** | `causality.ts` (wired), `story-graph.ts` (wired diagnostic) | Causal edges are promise-id-only, not true event causality. Doctor's own header: rule-channel causal AUC ~0.076 vs shuffle |
| 6 | Protagonist Architecture | **PARTIAL** | `character-arc.ts` (wired), `interiority.ts` (wired), `agency-signal.ts` (**unwired**) | agency-signal (decisive-verb vs spectator-verb at climax/Act3) was built to fix the legacy passivity rule but was never imported. No want/need/ghost profile assembled |
| 7 | Opposition Architecture | **PARTIAL** | `conflict.ts` (wired) | No antagonist identification; conflict read off negative relationship-shift magnitudes. No foil/shadow/twin model |
| 8 | Supporting Character Function | **ABSENT** | — | Characters are a frequency-ordered name list. No mentor/ally/trickster/gatekeeper function model |
| 9 | Character Intentionality Chains | **PARTIAL** | `intention.ts` (wired), `interiority.ts` (wired), `belief-movement.ts` (**unwired**) | Goals detected lexically per scene, not chained across scenes. belief-movement (earned vs cheap belief change, from-scene→to-scene) exists but is unwired with no extractor |
| 10 | Relationship Architecture | **WIRED** | `relationship-arc.ts` (deepest pass: oscillation, midpoint void, rupture run, repair-unmotivated, dimension analysis) | Dimensions are user/ops-supplied, not text-extracted. No central-couple/triangle identification |
| 11 | Structural Architecture | **WIRED** | `structure.ts` (act position, escalation, reversals), `structure.ts` pass (~150 rules), `structural-genome.ts` (**unwired**) | Act boundaries inferred from pressure blend, not authored breaks. structural-genome (actBreakPositions, escalation pattern, arc shape) is unwired |
| 12 | Sequence Architecture | **PARTIAL** | after-math/zone rules across 14 passes, `metrics.ts` momentum | No named-sequence model (Fun & Games, Bad Guys Close In, etc.). Sequence = positional zone only |
| 13 | Subplot Architecture | **ABSENT** (self-documented) | `memory.ts` flags `'subplot_complication'` as LLM-only, never emitted | Requires knowing which thread is A-plot vs subplot; engine itself flags this as a known limitation |
| 14 | Scene Function | **PARTIAL** | `ScreenplaySceneRecord.purpose` (16-value enum), `scene-value-shift.ts` (**unwired**) | scene-value-shift (McKee value-charge top vs bottom) is unwired. 3 most useful purposes (subplot/false_victory/dark_night) unreachable deterministically |
| 15 | Beat / Tactic Chains | **BUILT-UNWIRED** | `ops/tactic-types.ts` (12-tactic vocabulary) | Tactics exist ONLY on the authoring/generation side. A pasted script's dialogue is never parsed for tactics. No beat-chain built |
| 16 | Dialogue Intelligence | **PARTIAL** | `dialogue.ts` pass (~200 rules, wired), `subtext-meter.ts` | No real subtext/hidden-intent detection. Engine itself states: "true subtext requires a per-utterance (surface-text, true-intent) pair this record shape does not carry." truth-ledger (the schema for it) is unwired |
| 17 | Action as Dialogue | **PARTIAL** | `voice.ts` pass, `silence-signal.ts` (wired), `agency-signal.ts` (**unwired**) | Action scored for prose quality, not parsed as argumentative moves |
| 18 | Voice Distinction | **BUILT-UNWIRED** | `voice.ts` pass (proxy), `voice-delta.ts` (real Burrows Delta, **unwired**) | voice-delta implements real function-word z-score distance with swapRisk at 0.15 threshold — but is unwired. Worse, the engine discards per-character dialogue to top-2-longest-line highlights, so even wiring needs an extractor change |
| 19 | Reveal / Clue Architecture | **BUILT-UNWIRED** | `payoff.ts` pass (wired, ~250 rules), `well-made-surprise.ts` (**unwired**), `mystery-fairness.ts` (**unwired**), `reversal-detection.ts` (**unwired**) | All three correct algorithms are unwired. AND the D6 defect: live seededClueIds/payoffSetupIds are assigned by scan position (occ[0]/occ[last]), so payoff-before-setup is structurally undetectable — measured 0 inversions across 26 scripts × 3 order-destroying degradations |
| 20 | Audience-State | **PARTIAL (split)** | `suspenseDelta`/`curiosityDelta` (wired scalars), `audience-simulation.ts` (**separate subsystem, unwired**) | audience-simulation (100-1000 virtual viewers, Big Five, demographics, dropoff) exists in `infinity-gate/` on a different type and is not wired into the doctor. `calculateCulturalMatch` returns hardcoded 0.7 |
| 21 | Setup / Payoff | **WIRED (with D6 defect)** | `payoff.ts` pass, `story-graph.ts` (promisePaymentRatio), `typed-promises.ts` (**unwired**) | typed-promises (chekhov_object/stated_goal/prophecy/threat/mystery_question) is unwired. Live channel has D6 by-position defect |
| 22 | Objects / Motifs | **PARTIAL** | `pattern-establishment.ts` (wired, rule-of-three), `recurringImageryIds`, `theme-extract.ts` motifWords | Lexical token matching, not object-identity tracking. No "this physical object carries dramatic weight" model |
| 23 | Theme as Argument | **PARTIAL** | `theme.ts` pass (wired, only fires if user supplies theme), `theme-extract.ts` (wired) | Bag-of-words, not argument reconstruction (claim→counter-claim→synthesis). Theme pass dormant for imported scripts with no storyContext.theme |
| 24 | Genre Intelligence | **BUILT-UNWIRED** | `genre-obligation.ts` (5-genre obligation table, **unwired**), `genre-router.ts` (47 genres), `structure-presets.ts` | genre-obligation (thriller/mystery/romance/horror/comedy completeness check) is unwired — doctor's aggregateReport has no genre value in scope. Only 5 genres modeled; 42 abstain |
| 25 | Cinematic Execution | **PARTIAL** | `originality.ts` pass (directorial-crutch detection), `silence-signal.ts` | Detects overuse of camera/lens/match-cut words. No model of blocking, mise-en-scène, shot-scale rhythm, image-system |
| 26 | Pacing / Rhythm | **WIRED (multi-layer)** | `pacing.ts`/`rhythm.ts` passes, `structure.ts` escalation, `emotional-arc.ts` (scored), `metrics.ts` suspense-entropy/momentum/pacing-fit, `scene-economy.ts` (**unwired**) | scene-economy (per-scene new-information density, bloated scenes) is unwired. pacingFit always null on doctor reports (no session emotional_arc) |
| 27 | Emotional Architecture | **WIRED (scored)** | `emotional-arc.ts` (12,142-word VAD lexicon, Reagan 2016 archetype fit, arcHealth → arcIncoherenceDeduction) | Emotion read lexically. No model of audience emotional journey distinct from character emotion. Reagan archetypes assume conflict-driven shape; juxtaposition/synthesis forms score low by construction |
| 28 | Tone Control | **PARTIAL** | `voice.ts` pass, `anti-slop.ts` (wired), `StoryContext.tone` | No extracted tone register. Tone is user-supplied modulator, not extracted signal |
| 29 | Authorial Voice | **PARTIAL** | `anti-slop.ts` (64 AI-marker patterns, wired), `voice.ts` prose-texture rules | Detects AI-generic voice (slop), not a positive model of an individual authorial voice signature |
| 30 | Ending Intelligence | **PARTIAL** | `structure.ts`/`payoff.ts`/`intention.ts`/`character-arc.ts` (negative checks), `mirror-scene.ts` (bookend) | Checked negatively (is the final image weak? climax mislocated? payoffs absent?). No positive ending-type model (resolution/twist/elegiac/open/ironic) or ending-intelligence (does it reframe the beginning?) |

### The wired/unwired inventory (the actionable list)

**Built but completely unwired** (each file header says "zero production
importers"):

| Module | GODMODE level | What it does | Why it matters |
|---|---|---|---|
| `agency-signal.ts` | 6, 17 | Decisive-verb vs spectator-verb at climax/Act3 | Fixes the legacy passivity rule that emotionalShift==='neutral' can't |
| `voice-delta.ts` | 18 | Real Burrows Delta function-word z-score between character pairs | The production voice pass uses a proxy on action lines; this is the real thing |
| `well-made-surprise.ts` | 19 | inevitable (setup-before) AND unexpected (misdirection) → wellMade | The quality measure for reveals the doctor lacks |
| `mystery-fairness.ts` | 19 | requiredClues, missingClues, lateClues, concealedCritical | Fair-play mystery check |
| `reversal-detection.ts` | 19 | Consumes revelation text + allegiance flips | Detects reversals the legacy suspense-dip count misses |
| `typed-promises.ts` | 21 | chekhov_object/stated_goal/prophecy/threat/mystery_question | Typed promise tracking the live channel lacks |
| `genre-obligation.ts` | 24 | 5-genre obligation completeness table | The only structural genre model; doctor has no genre in scope |
| `story-spine.ts` | 2 | Protagonist proxy + spine-token coverage | Coherent-spine detection |
| `scene-value-shift.ts` | 14 | McKee value-charge at scene top vs bottom | The fundamental scene-work measure |
| `disclosure-ledger.ts` | 4, 19 | Fabula/syuzhet + payoff-before-setup detection | Order-aware reveal logic (needs D6 fix) |
| `belief-movement.ts` | 9 | Earned vs cheap belief change, from-scene→to-scene | Character-intentionality chain links |
| `truth-ledger.ts` | 3, 16 | 8 epistemic layers + canon tiers + belief schema | The substrate for subtext/knowledge-legality (no extractor) |
| `structural-genome.ts` | 11 | actBreakPositions, escalation pattern, arc shape | Whole-script structural fingerprint |
| `scene-economy.ts` | 26 | Per-scene new-information density, bloated scenes | Pacing quality the doctor lacks |
| `excellence-signals.ts` | (cross) | Positive-craft signals (the "excellence lever" the composite-gap needs) | The score only penalizes; this credits |
| `question-latency-deduction.ts` | 9, 20 | Question-raised→resolved latency as a deduction | Audience-state management signal |

### The D6 defect (must be fixed before wiring Levels 4/19/21)

Documented in `docs/p1-benchmark/DETECTOR_DEFECTS_2026-08-03.md` and referenced
from `mystery-fairness.ts:13-20`, `reversal-detection.ts:13-20`,
`disclosure-ledger.ts:18-23`, `typed-promises.ts:25-35`: the **production**
setup/payoff assignment is by scan position (`seed = occ[0]`, `payoff =
occ[last]`), making payoff-before-setup **structurally undetectable**. The
unwired modules have the correct algorithms but need an evidence-based extractor
that does not exist yet.

### Levels that are genuinely ABSENT (no implementation exists at all)

- **Level 1 — Script Intent Profile.** No inference of authorial ambition, scope, register.
- **Level 3 — World / Rules / Institutions.** The schema exists (`truth-ledger`) but no extractor populates it; no world-rule or institution model.
- **Level 8 — Supporting Character Function.** Characters are a name list; no function model (mentor/ally/trickster/gatekeeper).
- **Level 13 — Subplot Architecture.** Self-documented as LLM-only; requires A-plot-vs-subplot identification the engine cannot do.

---

## Part 2 — the corpus: what exists, what's committed, what's annotated

### The famous films ARE here (local-only, 766 scripts)

| Location | Count | What | In git? |
|---|---|---|---|
| `data/screenplays/*.fountain` | 20 | CC0 **original AI-authored** craft-band samples (~430–1010 words). Not films. | yes |
| `data/screenplays/*.fountain.txt` | ~48 | **Copyrighted produced scripts** — Pulp Fiction, Jaws, Frozen, Coraline, Up, WALL-E, Toy Story 3, Who Framed Roger Rabbit, + animation features (Coco, Encanto, Inside Out, Spider-Verse, Zootopia…) | **no** (gitignored) |
| `data/screenplays/crawl/<genre>/` | ~700 | **Copyrighted produced scripts** scraped from IMSDb/SimplyScripts — Fight Club, Fargo, Shawshank, Clerks, The Avengers, Inglourious Basterds, Jurassic Park, Men in Black… | **no** (gitignored) |
| `calibration/corpus.ts` | 20 | Synthetic 10-scene skeletons, not films | yes (inline) |
| `demo/corpus/sample-script.fountain` | 1 | "Dead Frequency" (one of the 20 CC0 originals, promoted to P0 demo) | yes |

**The famous-film corpus is the high-level source of truth the user names.** It
exists on disk — 766+ produced screenplays across action, sci-fi, crime, horror,
drama, comedy, animation. It is the only material that carries the full depth the
GODMODE standard demands (real story engines, real reveal ecologies, real
character intentionality chains, real thematic arguments). The 20 CC0 originals
are craft-band test samples, not the goal.

### What annotation exists today

| Artifact | Count | Validated? | In git? |
|---|---|---|---|
| Famous-film "learning packages" (`screenplay-training/annotations/annotated/`) | 38 films, 11 sections each | **AI-generated (Claude), unvalidated** | no (gitignored) |
| Derived scene features (`script-training/annotations/scenes.jsonl`) | 4,372 scene rows | AI-extracted, no verbatim text | no (gitignored) |
| SFT/DPO training datasets (`screenplay-training/{comprehensive,apex}_output/`) | ~220MB | Derivable from above | no (gitignored) |
| Annotation taxonomy + schema + codebook (`script-training/taxonomy/`, `schemas/`) | full | — | **yes** |
| Human preference labels (`evals/scoring/human/labels/`) | **0** | — | empty |

**The annotation standard (taxonomy, schema, codebook) is committed and mature.**
The 38 AI-drafted learning packages cover real films (Inception, Chinatown,
Oppenheimer, Gladiator, Whiplash, Barbie, Interstellar, Se7en, Heat, Sicario…)
and follow an 11-section structure that maps closely to the GODMODE standard's
artifact bundle. But they are AI-generated, uncommitted, and unvalidated by any
human reader.

### What the engine extracts is ephemeral

The live engine (`fountain-analyzer.ts` → `analyzeFountainText`) computes per-
scene/per-character/per-dialogue structure **per run and discards it**. No
persistence. The only place parsed structure is materialized is the offline
Python training pipelines, which write into gitignored output dirs.

---

## Part 3 — the path forward

The famous films are the source of truth. The GODMODE standard defines what
"understanding" them means. The engine has most of the analytic modules the
standard demands but hasn't wired them. The annotation pipeline exists but
produces AI-only, unvalidated output. The connection between these three facts is
the work:

### 1. Study and annotate the famous films against the standard

The 38 existing AI-drafted learning packages are a **starting draft, not a
finished corpus.** The GODMODE standard's three-depth tiering (§37) gives the
discipline:

- **Level 1 (base, all ~766 scripts):** screenplay AST, stable IDs, scene
  segmentation, canonical entities, basic scene functions, character profiles,
  relationship map, genre/tone profile. Automatable; systematic QA.
- **Level 2 (gold, ~250–300 scripts):** full causal event graph, temporal fact
  intervals, scene-by-scene before/after state, character goal/belief timelines,
  relationship arcs, mechanism lifecycle, reveal/clue ecology, audience-state
  checkpoints, theme argument, quality rubric, hard-error audit,
  counterfactuals. Every scene human-validated.
- **Level 3 (platinum, ~75–100 scripts):** every significant beat, every
  dialogue turn (hidden intent, tactic, subtext, common ground, voice features),
  conversation threads, spatial blocking, controlled weak variants,
  chosen/rejected pairs, source-neutral synthetic equivalents.

The **existing 38 packages map to Level 2 depth** but need human validation and
the GODMODE layers they're missing (audience-state curve, counterfactuals,
controlled weak versions, preference pairs).

### 2. Wire the unwired modules, using the annotations as ground truth

The annotations are not just training data — they are the **validation evidence**
for wiring the 16 unwired modules. For each module, the path is:
1. Build a Level-2 annotation for ~20 films in that module's domain (e.g., 20
   mysteries for `mystery-fairness.ts`, 20 thrillers for `genre-obligation.ts`).
2. Fix the D6 extractor defect so setup/payoff is evidence-based, not
   scan-position-based.
3. Wire the module into the doctor as a diagnostic field (shadow).
4. Measure: does it separate the annotated good from the annotated bad?
5. If yes, couple it to the score with a measurement receipt.

This is the disciplined path the 2026-08-04 evidence-gate amendment already
permits — and it directly closes the P1 structural gap, because the unwired
modules (`agency-signal`, `disclosure-ledger`, `well-made-surprise`,
`belief-movement`, `structural-genome`) are exactly the order-sensitive signals
the score currently lacks.

### 3. Fill the three genuinely-absent levels

Levels 1 (Script Intent Profile), 3 (World/Rules), 8 (Supporting Character
Function), and 13 (Subplots) have no implementation. These need new extractors —
and the annotations are where the extraction heuristics will be developed,
because the famous films are where those structures actually exist in their
fullest form.

---

## Provenance

- Standard: `docs/screenplay-understanding/GODMODE_STANDARD.md` (45 + 38 sections)
- Engine code audited: `server/nvm/screenplay/memory.ts`, `server/nvm/analyze/`
  (doctor, story-graph, emotional-arc, metrics, fountain-analyzer, + 16 unwired
  modules), `server/nvm/revision/passes/` (14 passes), `server/nvm/ops/tactic-types.ts`
- Corpus: `data/screenplays/` (20 CC0 + ~748 copyrighted, local-only),
  `screenplay-training/annotations/annotated/` (38 AI packages),
  `script-training/` (taxonomy + 4,372 scene rows), `calibration/corpus.ts`
- Defect: `docs/p1-benchmark/DETECTOR_DEFECTS_2026-08-03.md` (D6)
- Prior diagnosis (now superseded at substrate level):
  `docs/p1-benchmark/STRUCTURAL_SIGNAL_DIAGNOSIS_2026-07-29.md`
