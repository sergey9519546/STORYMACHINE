# Storytelling Coverage Map

**What this is:** a gap-analysis reference derived from `MEGA_CATALOG_12700_SYSTEMS.md`,
used to check the engine's coverage of real storytelling craft against what
exists in the world — for gradual, evidence-gated integration over time.

**What this is NOT:** a backlog. It is not a list of things to build, and
completing every row is not a goal. This project's documented central failure
mode is inflating counts of things it covers: it shipped 3,216 generated rule
constants whose entire weighted-issue channel measures AUC ≈ 0.076 on the
real-corpus shuffle-drop harness, while scene-count scarcity alone carries AUC
≈ 0.938 (`doctor.ts` ~line 1892, `docs/p1-benchmark/DISCRIMINATION_BASELINE_2026-07-29.md`).
A coverage map that becomes a checklist to complete recreates that exact
failure one layer up — more rows marked "done" would feel like progress while
adding nothing to what the score can actually tell a writer. So the standing
rule for this document: **coverage is not value.** Every ABSENT or PARTIAL row
below is a candidate, not a commitment, and most of them should stay ABSENT
permanently. The only thing that changes that is discrimination evidence on
real writing (`npm run measure-real`), per CLAUDE.md's standing task and
NORTH_STAR §1's "correct before reproducible."

---

## STEP 1 — The honest count, and retiring "12,700"

### Method

For each of the catalog's 13 categories, every subsection's parenthetical
system count (e.g. "Save the Cat variants (20)", "Genre Hybrids (870
systems)") was discarded as a permutation multiplier. What was kept: every
**genuinely distinct**, individually named craft/domain concept actually
present in the catalog's text — a real framework (Save the Cat, Enneagram,
Allen's Interval Algebra), a real named technique (Chekhov's gun, in medias
res, kishōtenketsu), or a real named taxonomy leaf where the leaf itself
carries distinct craft meaning (an unreliable narrator is a different tool
from a frame narrative; "Crime-Horror" is not a different tool from "Crime"
+ "Horror" + genre-blending-as-a-technique, so hybrids and period/budget
combinations were folded into the base technique they multiply, not counted
per combination).

This is a judgment call, not arithmetic — a stricter or looser granularity
choice could reasonably move any category's count by ±30%. That is disclosed,
not hidden, because the conclusion is robust to it: **no defensible counting
convention gets within two orders of magnitude of 12,700.**

### Category table

| # | Category | Catalog claim | Real distinct concepts (this audit) | In-scope for a screenplay-text analyzer? |
|---|---|---:|---:|---|
| 1 | Genre Systems | 3,000 | ~73 | Mostly yes |
| 2 | Character Systems | 2,000 | ~41 | Yes |
| 3 | Dialogue Systems | 1,200 | ~45 | Yes |
| 4 | Structure Systems | 1,500 | ~53 | Yes |
| 5 | Cinematic Systems | 1,800 | ~55 | **No** |
| 6 | Audio Systems | 800 | ~11 | **No** |
| 7 | Production Systems | 1,200 | ~13 | **No** |
| 8 | Audience Systems | 1,000 | ~6 | **No** |
| 9 | Distribution Systems | 500 | ~4 | **No** |
| 10 | Format Systems | 400 | ~7 | Mostly no (1 of 7 in-scope) |
| 11 | Cultural Systems | 800 | ~5 | **No** (two independent reasons, see below) |
| 12 | Technical Innovation Systems | 500 | ~7 | **No** |
| 13–127 | "Additional Categories" | 1,500 | ~12 | Mostly no (2 of 12 in-scope) |
| | **Total** | **12,700 (claimed)*** | **~322** | **~215 in-scope** |

\* The catalog's own "FINAL TALLY" section claims 12,700, but its own
category subtotals — the numbers in the table above's "Catalog claim" column,
copied verbatim from the catalog — sum to **16,200**, not 12,700 (3,000 +
2,000 + 1,200 + 1,500 + 1,800 + 800 + 1,200 + 1,000 + 500 + 400 + 800 + 500 +
1,500 = 16,200). The document is internally inconsistent by ~3,500 systems
(≈28%) even before any external audit touches it. Separately, "Category
13–127" — 115 of the document's own claimed 127 categories — has no content
at all: one section, a dozen bullet points, and the sentence "... (continuing
to 12,700 total)". Most of the claimed category count was never enumerated,
just asserted.

### The verdict

**12,700 should be retired.** It was never a measurement — it is 30 base
genres and a handful of real named frameworks multiplied by combinatorial
counts of hybrids, periods, budgets, and "variants (N)" placeholders, topped
off with 115 uncontented category slots to hit a round "100X" target stated
in the document's own title. The honest number, after stripping every
multiplier and keeping only individually distinct concepts, is **approximately
320 across all 13 categories, of which roughly 215 are even in-scope for a
tool that analyzes screenplay text.** That is the number this document works
from. It should not be re-inflated in either direction without the same
discard-the-multiplier method applied again.

---

## STEP 2 — Out of scope, ruled out on purpose

This project analyzes **screenplay text.** A textual analyzer cannot score
what never appears in the text, and several whole categories are out of scope
by construction — not gaps, not a to-do list, a permanent boundary. Being
ruthless here is what makes the in-scope list trustworthy.

| Category | Why it's out of scope |
|---|---|
| **5. Cinematic** (camera, lighting, color, editing, blocking, production design, VFX) | None of this is present in Fountain-format screenplay text as written by a spec/shooting-draft author. A slugline says `INT. KITCHEN - DAY`, not a lens choice or a lighting plot — scoring "3-point lighting" against text that never specifies lighting is fabrication, not analysis. |
| **6. Audio** (score, sound design, ADR, mixing) | Same reason: a screenplay may say `SFX: a gunshot` but carries no mix, no leitmotif, no diegetic/non-diegetic distinction beyond what a sound designer invents later. Not in the text. |
| **7. Production** (budgeting, scheduling, casting, crew, equipment, post workflow) | This is about *making* the film, not the draft itself. A screenplay's text doesn't carry a budget tier or a call sheet. |
| **8. Audience** (demographics, psychographics, viewing behavior, market segments) | This is about *who watches*, not what's on the page. No amount of text analysis tells you the age or platform preference of a future viewer. |
| **9. Distribution** (release strategy, marketing, territory, platform) | Business/marketing decisions made after the draft exists; the text has no bearing on release windowing. |
| **10. Format** (aspect ratio, frame rate, resolution, delivery codec, interactive/branching formats, split-screen presentation) | Entirely post-text technical/presentation choices, with one narrow exception kept in-scope: runtime/page-length convention, because page count is a property of the text itself and the engine already estimates it (`doctor.ts`'s `estimatePages`). |
| **11. Cultural** (representation, social-issue handling, political/economic/religious worldbuilding) | Out of scope for **two independent reasons**, not one: (a) historical-period and worldbuilding content is already covered as an instance of Category 1's period-genre-adaptation concept, so it isn't a new concept; and (b) authenticity-of-representation and social-issue-handling are exactly the kind of judgment a lexicon/heuristic engine should **not** attempt to automate — a false-positive or false-negative on "does this script handle race/disability/immigration responsibly" is a harm a wrong craft-density number is not. This is a deliberate refusal, not an oversight. |
| **12. Technical Innovation** (AI production tools, virtual production, LED volumes, cloud workflow, archiving, viewership analytics) | All post-text production/operations tooling; none of it is a property of a screenplay's content. |
| **10.6 Interactive/branching formats** specifically | This product analyzes linear screenplay text; branching-narrative game scripts are a different artifact shape entirely. |

**In scope, kept:** Genre (1), Character (2), Dialogue (3), Structure (4) —
because genre convention, characterization, dialogue craft, and structure are
all directly legible from screenplay text — plus two narrow carve-outs:
runtime/length convention (10.1) and symbolism/motif (13+, distinct from
theme, which is already covered — see below).

---

## STEP 3 — Coverage table

Status definitions: **COVERED** = a real detector exists, is wired into the
score or the shipped report, and does what the catalog concept describes.
**PARTIAL** = a real implementation exists but is gated off, disconnected
from the score, redundant with something else, or covers only part of the
concept. **ABSENT** = no implementation, or only a name-collision (a rule
that shares the catalog's word but not its meaning).

This table does not attempt every one of the ~215 in-scope concepts
row-by-row — several catalog leaves (e.g. each of 17 named archetype roles,
each of 7 conversation-analysis mechanisms) were confirmed absent by targeted
keyword search across `server/nvm/` and `server/lib/genre-router.ts` rather
than individually verified against a full read of all 98,000 lines across the
14 pass files; where that's the case it's marked. Rows with direct code
citation were read, not guessed from a rule name — several surprised the
author (see STEP 4).

### Category 4 — Structure (the richest, most in-scope category)

| Concept | Status | Implementing file / function | Gap description |
|---|---|---|---|
| Three-act structure, act balance | COVERED | `server/nvm/revision/passes/structure.ts` (Wave 139+; act1/act2/act3 balance, midpoint pressure, inciting incident, act symmetry) | — |
| Named beat systems (Save the Cat 15 beats, Dan Harmon Story Circle 8, Freytag's Pyramid 5, Kishōtenketsu 4, Syd Field paradigm, Truby/John Yorke, sequence approach, Hero's Journey/Campbell-Vogler 12-stage) | **PARTIAL** | `server/lib/structure-presets.ts` (`STRUCTURE_NAMES`, 21 named templates — more than the catalog itself enumerates by name, including several the catalog never mentions: Rashomon, hyperlink cinema, Fichtean curve, snowflake method, mystery box, closed-circle/locked-room, procedural case, heist/trial/survival structures) | Each template is a real, distinct expected-tension-by-position curve (`expectedTensionAt`), genuinely implemented — but it is wired only to the **generation** path (a live NVM session's configured `emotional_arc`), reached from the doctor's static-text scoring path only through `metrics.ts`'s `computePacingFit`, which `doctor.ts` (own comment, ~line 1990) confirms is **always `null`** for an uploaded/pasted script because the doctor never has a session arc to pass in. An uploaded screenplay is never fit-scored against any of these 21 templates today. |
| Hero's Journey / Campbell monomyth, Freytag's Pyramid — as standalone theory modules | **ABSENT** (orphaned) | `server/nvm/research/theories/campbell-hero-journey.ts`, `.../freytag-pyramid.ts` | Real implementations exist. `grep` confirms `server/nvm/research/*` is imported by **nothing** else in the codebase — not a route, not a pass, not `doctor.ts`. Matches ROADMAP's own framing of "research panels" as material to gate behind a Labs flag, not the product's front door. |
| Character arc (positive/negative/flat/u-shape/inverted-u shape) | **PARTIAL** | `server/nvm/analyze/structural-genome.ts`'s `detectCharacterArcShape` (flat/linear/u-shape/inverted-u, position-aware cumulative-sum heuristic); `server/nvm/revision/passes/character-arc.ts` (arc completion, relational stasis, monotone/whiplash checks) | `structural-genome.ts` is used only by `server/routes/nvm/analysis.ts`'s template-comparison endpoint — **not** the doctor path, not the health score. `character-arc.ts` is wired and scored, but reads relational/emotional presence, not the specific shape taxonomy. Two independent, unreconciled implementations of "arc shape," only one of them reachable from an uploaded script. |
| Emotional arc / Reagan et al. (2016) six archetypes (rise, fall, man-in-hole, icarus, cinderella, oedipus) | **COVERED** | `server/nvm/analyze/emotional-arc.ts` (`computeEmotionalArc`, `bestReagan`), wired into the score via `doctor.ts`'s `arcIncoherenceDeduction` (~line 1907) | This is a genuine success story worth naming as such: a real, published archetype taxonomy, position-aware (`rampCorrelation`, `peakPosition`), bounded, gated to feature scale, and actually subtracts from `health`. |
| Relationship arc | COVERED | `server/nvm/revision/passes/relationship-arc.ts` (static/monotone/no-movement pair tracking, ~40 waves of rules) | — |
| Thematic arc / theme resonance | **PARTIAL** | `server/nvm/revision/passes/theme.ts` (resonance gap, dialectic absence, front-loading, midpoint-silent, Act-3-density-drop — genuinely position-aware and sophisticated) | Only fires when `storyContext.theme` is **explicitly supplied by the caller**. A pasted/uploaded script analyzed without a theme statement (the overwhelmingly common Doctor use case) gets zero theme-resonance checking — `theme.ts`'s own header says so. `theme-extract.ts` was built to auto-infer candidate theme material ("the engine's theme pass fires 0 on all produced scripts... imported scripts have none") but its output is a separate report field, never fed back as `theme.ts`'s input — the auto-seeding gap it names is not actually closed for scoring. |
| Symbolism / motif (distinct from theme) | **ABSENT** | — | No detector distinguishes a recurring symbol/motif from theme-language recurrence (`theme.ts`) or from the unrelated clue-token-recurrence machinery (`fountain-analyzer.ts`'s `detectClueLifecycle`). Real, distinct craft concept; genuinely not built. |
| McGuffin, red herring | **ABSENT** | — | No rule or field names either concept. A generic "unresolved clue" field exists but doesn't distinguish "deliberately meaningless plot engine" (McGuffin) or "deliberately false lead" (red herring) from a dropped thread. |
| Chekhov's gun / setup-payoff | **COVERED** (lexicon layer) + **ABSENT** (typed layer, built but unwired) | `CHEKHOV_GUN_UNFIRED` in `server/nvm/revision/passes/causality.ts` (~line 936, content-word clue seeded in first half with no later payoff); separately, `server/nvm/analyze/typed-promises.ts` implements a much more rigorous **typed** ledger (`chekhov_object`/`stated_goal`/`prophecy`/`threat`/`mystery_question`, strict-later-scene-index discipline) | The lexicon rule fires and routes through the ordinary density-normalized issue channel (the one measured at AUC ≈0.076). `typed-promises.ts` is stricter and genuinely order-sensitive but is consumed only by `integrity-rate.ts`, which is itself consumed only by its own test — fully orphaned. It needs a text→typed-event extractor that doesn't exist for arbitrary scripts. |
| Deus ex machina | COVERED | `server/nvm/revision/passes/causality.ts` (`DEUS_EX_MACHINA`, late unset-up revelation closing the plot) | — |
| Plot twist / well-made surprise (setup present, but pointed elsewhere) | **PARTIAL** | `server/nvm/analyze/well-made-surprise.ts` (Aristotle/Hitchcock "unexpected but inevitable" scoring, typed `SurpriseEvent[]`) | Same orphan pattern: "this file does not extract surprises from prose... callers supply a typed, ordered list." No extractor feeds it from real text; test-only. `metrics.ts`'s `twistImpact`/`surpriseProxy` (running-distribution rarity, genuinely order-sensitive by construction) are diagnostic-only report fields, not scored. |
| Cliffhanger | **PARTIAL** | `metrics.ts`'s `cliffhangerStrength` (per-scene, diagnostic field) | Computed but not scored; not a distinct rule elsewhere. |
| Cold open, in medias res | COVERED (as report field, diagnostic) | `server/nvm/analyze/cold-open-promise.ts`, wired into `doctor.ts`'s report | Diagnostic-only (report field `coldOpenPromise`), not part of `health`. |
| Flashback, flash-forward, dream sequence, montage, parallel storyline | **PARTIAL** | Scattered lexical mentions (`originality.ts`'s `montage crutch`/`flashback crutch` cliché checks; `temporal-consistency.ts`'s `FLASHBACK` heading detection) | Cliché-density checks exist for some; genuine timeline-role classification (is this flashback consistent with the rest of the timeline?) exists only in the orphaned `temporal-consistency.ts` (see below). |
| Prologue, epilogue | **ABSENT** as distinct concepts | — | No rule distinguishes a prologue/epilogue from an ordinary opening/closing scene. |
| Circular/bookend ending | **ABSENT** | — | Not checked. |
| Scene-function taxonomy (introduce_conflict / establish_world / climax / resolution / revelation / raise_stakes / turning_point / character_moment / complicate) | COVERED | `server/nvm/analyze/fountain-analyzer.ts`'s `detectPurpose` (~line 731), feeding `ScreenplaySceneRecord.purpose` | This is the engine's own direct analogue of the catalog's "scene types" taxonomy — 9 categories, priority-ordered, position + content aware. |
| McGuffin/red herring/prologue/epilogue/circular-ending/symbolism/motif — **as a group** | ABSENT | — | Named individually above; grouped here to flag that this is the single densest cluster of clean ABSENCE in the whole audit — real, distinct, well-known craft concepts with literally nothing in the codebase, not even an orphaned attempt. |

### Category 2 — Character

| Concept | Status | Implementing file / function | Gap description |
|---|---|---|---|
| Character archetypes (hero, mentor, threshold guardian, shadow, trickster, herald, shapeshifter — Vogler's 8; innocent/sage/explorer/rebel — Jungian 12) | **ABSENT** | — | Zero hits for `threshold guardian`, `shapeshifter`, `herald` anywhere in `server/`. `archetype` appears only in `emotional-arc.ts`/`structural-genome.ts` for the unrelated Reagan *emotional*-shape archetypes (rise/fall/icarus/etc — see Structure table), not character-role archetypes. Genuine, clean absence. |
| Personality frameworks (Myers-Briggs, Enneagram, attachment theory, cognitive distortions, motivation theory) | **ABSENT** | — | Zero hits anywhere in `server/`. |
| Personality frameworks (Big Five/OCEAN, Dark Triad) | **PARTIAL, generation-side only** | `server/engine/agent/psychology.ts`, `server/nvm/infinity-gate/audience-simulation.ts` | These exist for **simulating** characters/audiences inside the live NVM story-generation engine (OASIS-adjacent), not for **scoring** an uploaded screenplay's characterization. Wrong side of the generate/analyze boundary for the Doctor's purposes. |
| Character voice distinctiveness | COVERED | `server/nvm/revision/passes/voice.ts` (`UNDIFFERENTIATED_CHARACTER_VOICES`, `VOICE_MONOTONE_CHARACTER` — simplified Burrows Delta proxy on action lines) | — |
| Register / dialect / sociolinguistic class markers | **ABSENT as the catalog means it** (false-friend) | `voice.ts`'s `TONE_REGISTER_MISMATCH`/`TONAL_REGISTER_COLLAPSE_ACT2` | This is the exact trap CLAUDE.md's task warns about: a rule using the word "register" exists, but it means **emotional tone** consistency (does the prose register match scene valence), not **sociolinguistic** register (class/education/domain-appropriate formality per speaker) or dialect. No detector reads whether a character's diction stays consistent with an established class/regional voice. |
| Relationship-category taxonomy (family, romantic, professional, friendship, antagonistic) | **PARTIAL** | `relationship-arc.ts` (pair-level trust-dimension tracking) | Tracks *movement* of any relationship pair well; does not classify *which kind* of relationship a pair has, so it can't apply category-specific expectations (e.g. a mentor relationship's expected arc differs from a romantic one). |
| Memory-as-plot-device (unreliable memory, gaslighting, generational trauma) | **ABSENT** | — | Not checked at all. |
| Power dynamics between two characters | **COVERED** | `fountain-analyzer.ts`'s `detectPowerBalance` (`powerHolder`/`powerBalance`/`powerFlipped`, per-scene, dyad-restricted), consumed by rules in `character-arc.ts` (~line 629) and `conflict.ts` (~lines 7011-7074, e.g. checking whether one character holds power throughout vs. whether control flips late) | Confirmed wired and scored, not merely computed. Routes through the ordinary density-normalized issue channel like the rest of the 3,216-rule catalog, so its marginal discrimination contribution is unmeasured, but the concept itself is genuinely covered. |

### Category 3 — Dialogue

| Concept | Status | Implementing file / function | Gap description |
|---|---|---|---|
| Subtext (implicit vs. explicit meaning) | **PARTIAL** | `server/nvm/revision/passes/dialogue.ts` Level 2 (`EMOTIONAL_SUPPRESSION`, `POWER_SILENCE`, `QUESTION_DODGE`, `DENIAL_INVERSION`) | Real subtext-adjacent detection exists and is scored. Covers 4 of the catalog's ~10 named subtext axes (emotional masking, power dynamics, evasion). Sexual tension, territorial marking, alliance signaling, threat communication, manipulation tactics are not separately modeled. |
| On-the-nose dialogue, as-you-know exposition, sycophancy, monologue | COVERED | `dialogue.ts` Level 1 | — |
| Conversation analysis (turn-taking, adjacency pairs, repair sequences) | **ABSENT** as a named framework | — | Zero hits for `turn-taking`, `adjacency pair`, `implicature`. The *content* partially exists in a different shape — `detectQuestionLatency`'s raise/resolve tracking is functionally an adjacency-pair mechanism (a question is the first pair-part, its answer the second) without being framed or extended as one. |
| Nonverbal communication (kinesics, proxemics, haptics, chronemics, paralinguistics, oculesics) | **ABSENT** | — | Zero hits for any of the six terms. Action-line body-language checks exist (`originality.ts`'s "body language cliché overuse") but only as a cliché-density check, not a communication-channel model. |
| Register systems (formal/informal/technical/legal/medical/sacred) | **ABSENT** (see Character table's register false-friend note) | — | — |
| Linguistics (sociolinguistics, pragmatics, semantics/figurative language, phonetics, morphology, historical linguistics) | **ABSENT**, except: | — | — |
| — Period-accurate / anachronistic diction | **PARTIAL** | `TURN_VERB_WORDS` etc. lexicons in `fountain-analyzer.ts` are modern-English only | No anachronism detector; a 1920s-set script using 2020s slang is not flagged. |
| Dialogue-diversity / repetitiveness | COVERED | `doctor.ts`'s `computeDialogueDiversity`/`dialogueDegradationDeduction` (unique-line ratio, mean words/line, vocab richness) | This is the P1 success story — the channel that solved dialogue discrimination to test AUC 0.990 (see STEP 4). |

### Category 1 — Genre (mostly in scope)

| Concept | Status | Implementing file / function | Gap description |
|---|---|---|---|
| Genre taxonomy (47 genres) | COVERED | `server/lib/genre-router.ts` (`GENRE_MODIFIERS`, `GenreId`) | Exceeds the catalog's own ~30-genre base list. |
| Genre structural contract (threat type, information position, required behaviors, forbidden shortcuts) | **PARTIAL** | `genre-router.ts`'s `GenreRules` (per-genre `threatType`/`informationPositionDefault`/`requiredBehaviors`/`forbiddenShortcuts`) | Fully written, richly specific prose for all 47 genres — but wired **only into generation prompts**, never checked against an uploaded draft. `server/nvm/analyze/genre-obligation.ts` is a real, separate detector built for exactly this ("does a thriller confront its threat, does a mystery reveal its answer") aligned to the same `GenreId` roster — but it is orphaned (test-only) and its own header says it covers only "a HANDFUL of core genres," not all 47. The prompt text and the detector both exist; they've never been connected to each other. |
| Tonal register (darkly comic, absurdist, surreal, satirical, deconstructionist, etc.) | COVERED | `genre-router.ts`'s `TONE_REGISTERS` (24 registers) | Generation-side (prompt composition), same caveat as above — not checked against an uploaded draft's actual tone. |
| POV / narrative-structure devices (unreliable narrator, non-linear, Rashomon, epistolary, found footage, frame narrative, reverse chronology) | **PARTIAL** | `structure-presets.ts`'s `STRUCTURE_NAMES` includes `rashomon`, `non_linear`, `circular`, `hyperlink`, `in_media_res` as expected-tension templates | Same generation-only gate as the beat-system row above. No classifier determines *which* of these an uploaded script is actually using, let alone scores it against genre-appropriate expectations. |
| National/regional cinema traditions (Giallo, Nouvelle Vague, Neorealism, Wuxia, Nordic Noir, etc.) | ABSENT | — | Not modeled; reasonable, since these are closer to genre-flavor labels than checkable craft mechanics. |
| Dramatic-irony / audience-vs-character knowledge position (`informationPositionDefault: superior/inferior/parity`) | **PARTIAL, and the closest of any gap to being cheaply actionable** | `server/nvm/analyze/epistemic-ledger.ts` (`buildEpistemicLedger`/`canKnow` — co-presence BFS over scenes) | `fountain-analyzer.ts`'s own header calls dramatic-irony gap modeling "squarely a deep-read/semantic-channel problem" the lexicon layer can't reach — but a deterministic **presence**-based approximation already exists and is fully built. It is orphaned (no consumer at all). Its producer-side data (which characters are present in which scene) is *already computed* by `fountain-analyzer.ts`'s `SceneUnit.characters` — no new extraction needed to wire the substrate. What's still missing: linking a specific dialogue line to a specific *fact* so a violation ("character references something no epistemic path yet supports") can actually be flagged — `revelation` is currently a single boolean per scene, not an identified fact. |

### Category 10 — Format (1 in-scope concept)

| Concept | Status | Implementing file / function | Gap description |
|---|---|---|---|
| Runtime / page-length convention | COVERED | `doctor.ts`'s `estimatePages` (real element-aware paginator via `src/lib/screenplay-layout.ts`) | — |

---

## STEP 4 — Ranked gaps: does this plausibly move discrimination on real writing?

Ground truth used for ranking (`docs/p1-benchmark/DISCRIMINATION_BASELINE_2026-07-29.md`,
`STRUCTURAL_SIGNAL_SCREEN_2026-08-03.md`, `DETECTOR_DEFECTS_2026-08-03.md`):
dialogue discrimination is **solved** (test AUC 0.990). The **live blocker**
is structural: SCENE_SHUFFLE 0.734, MIDPOINT_DROP 0.766, CLIMAX_RELOCATE
0.523 (chance) against a ≥0.80 gate. Diagnosed cause: every
`ScreenplaySceneRecord` field is computed from its own scene's text, so
reordering preserves it; the weighted-rule channel built on those fields
separately measures AUC ≈0.076 (well below chance, because a combined
shuffle+drop degradation *reduces scene count*, which mechanically reduces
how many multi-scene-window rules can even fire, understating the
degraded copy's issues) and pure reordering at constant scene count
measures AUC ≈0.48 (chance) for that channel.

**The order-sensitivity test, applied to every structural candidate below:**
would this measurement change if the scenes were shuffled? If a candidate's
answer is no, it cannot address the blocker no matter how craft-real it is —
that is stated explicitly per row, not left implicit.

### Tier 1 — order-sensitive by construction, plausibly moves the blocker, actionable now

1. **Wire question-answer latency into a bounded structural deduction**
   (candidate 5 in `STRUCTURAL_SIGNAL_SCREEN_2026-08-03.md`). `detectQuestionLatency`
   forward-matches each raised question only against *later* lines in
   whatever order scenes arrive — genuinely order-sensitive **by
   construction**, not merely statistically. It already feeds three rules in
   `payoff.ts` (`UNANSWERED_QUESTION_FLOOD`, `INSTANT_GRATIFICATION_PATTERN`,
   `DEAD_QUESTION_ZONE`), but they emit ordinary issues that dissolve into the
   AUC ≈0.076 density channel. **Order-sensitivity verdict: YES, mechanically.**
   No new analyzer field is required — this is a re-routing question, exactly
   as the screen's own "what to do next" section concludes, and is already
   the top-recommended next P1 experiment.

2. **Fix the clue-lifecycle D6 defect** (`fountain-analyzer.ts`'s
   `applyClueLifecycle`, ~line 838): the seed is *assigned* as an id's first
   scan-order occurrence and the payoff as its last — a payoff can never
   precede its seed by construction, measured at 0/26 inversions across every
   degradation tested. This is not a weak signal, it's a structurally
   incapable one. Fixing it (derive the lifecycle from evidence of
   introduction — a first-time noun phrase, an ALL-CAPS prop intro — rather
   than from position) is the named precondition for "setup-before-payoff
   ordering" to exist as a real signal at all. **Order-sensitivity verdict:
   currently NO (tautological); YES once fixed** — and several already-built,
   currently-orphaned consumers (`disclosure-ledger.ts`, `typed-promises.ts`)
   are waiting on exactly this fix to become useful. Already flagged P1 in
   `DETECTOR_DEFECTS_2026-08-03.md`; this audit's contribution is confirming
   it's also the actual mechanism several catalog concepts (Chekhov's gun,
   fair-play mystery, well-made surprise) are all independently blocked on.

3. **Wire `epistemic-ledger.ts`'s co-presence propagation as a continuity
   check.** Character-presence-per-scene data already exists
   (`fountain-analyzer.ts`'s `SceneUnit.characters`); the BFS propagation
   itself is inherently order-dependent — reordering scenes changes who could
   plausibly know what, entirely. **Order-sensitivity verdict: YES,
   mechanically**, and uniquely cheap among the orphaned "proof" family
   because its producer-side data needs no new extraction. Caveat, stated
   plainly: the *substrate* is free, but making it *fire* on a real violation
   still requires linking a dialogue line to a specific fact, which
   `revelation` (a scene-level boolean) doesn't yet support — this is
   "cheaper than the rest of this tier," not "free."

### Tier 2 — a genuinely order-sensitive mechanism exists, but redundant or blocked on a hard prerequisite

4. **`story-graph.ts`'s `arcCoherence`/`escalationMonotonicity`.** Explicitly
   built to solve the exact AUC 0.48 act-swap failure CLAUDE.md names — its
   own header says so — but never wired to `health` ("DIAGNOSTIC ONLY").
   **Order-sensitivity verdict: YES** (Pearson correlation of suspense
   against raw position; position-bucketed act averages) — but it is a third,
   independent reimplementation of what `emotional-arc.ts`'s
   `rampCorrelation`/`peakPosition` already does and is already wired into
   `arcIncoherenceDeduction`. Marginal value is likely low until measured.
   **A specific, non-obvious defect found during this audit:** `story-graph.ts`'s
   other flagship metric, `forwardEdgeRatio` — billed in its own header as
   "KEY for solving AUC 0.48" — depends on `promiseMap`'s `seedIdx`/`payoffIdx`,
   which are supplied by the same D6-tautological `applyClueLifecycle`. Since
   a seed is *defined* as whatever occurrence scans first, `seedIdx < payoffIdx`
   is close to a certainty by construction, largely independent of real
   ordering. This metric is very likely inert for the same root cause as D6,
   despite its documentation — worth confirming by direct measurement before
   any wiring effort, not assuming from the docstring.

5. **`structural-genome.ts`'s act-break detection / escalation-pattern
   classifier.** Order-sensitive by construction (suspense-discontinuity
   clustering, thirds-based pacing profile), but used only by a separate
   template-comparison route, never the doctor. A **fourth** independent
   reimplementation of "does tension rise across acts," alongside
   `emotional-arc.ts`, `story-graph.ts`, and (partially) `structure.ts`'s
   escalation-plateau rules. Consolidating the three-to-four existing
   order-aware arc signals into one measured, calibrated deduction is
   probably higher-value than building a fifth.

6. **`mystery-fairness.ts` / `disclosure-ledger.ts` / `typed-promises.ts`
   (the wider orphaned "proof" family; ~10 files total, all sharing the
   `SupportState` contract).** Each is genuinely order-sensitive by
   construction (clue-plant-scene vs. reveal-scene position; discourse order
   vs. story-time order; strict later-scene-index payoff checks) and each
   directly implements a real catalog concept the score currently lacks
   (fair-play mystery clue-sufficiency, disclosure-timing fairness, typed
   Chekhov's-gun discipline). **Order-sensitivity verdict: YES for all
   three, but blocked on the same missing piece** — every one of them
   explicitly documents that it performs "deterministic bookkeeping," not
   text extraction, and needs a caller to supply already-classified typed
   events. That extractor doesn't exist for arbitrary screenplay text and
   several files' own comments call the underlying problem LLM-gated/deferred.
   High craft value, not cheaply reachable.

### Tier 3 — diagnostic value only: would NOT move under shuffle, or only weakly/redundantly

State this explicitly per the task's requirement, not left implicit: **being
in this tier is not a demotion of craft merit.** It means the concept cannot
address the current measured blocker (structural discrimination) regardless
of how well it's built, because its signal is presence/frequency-based, not
order-based.

7. **Genre-obligation completeness** (`genre-obligation.ts`, wiring
   `genre-router.ts`'s already-written 47-genre `requiredBehaviors`/
   `forbiddenShortcuts` prose into an actual detector, beyond its current
   "handful of core genres"). High user-trust value — this is the single
   most concretely finish-able gap in the whole audit, since both halves
   (the genre contract text and the obligation-checking engine) already
   exist and just need connecting. **Order-sensitivity verdict: NO** — a
   thriller's "threat confronted" cue would very likely still be present
   somewhere after shuffling, just relocated. Worth doing for user-facing
   value; do not expect it to move SHUFFLE/DROP/RELOCATE AUC, and say so
   when it ships.

8. **`temporal-consistency.ts` (Allen's Interval Algebra, 13-relation
   constraint propagation)** — sophisticated, fully implemented, completely
   unused (zero consumers outside its own test, confirmed by grep). Catches
   a real and different defect class (flashback/timeline contradictions,
   impossible orderings) than the shuffle/drop/relocate discrimination
   problem. **Order-sensitivity verdict: partial/indirect** — explicit
   markers ("FLASHBACK", "MEANWHILE") carry their meaning regardless of
   where a scene moves, but the *default sequential constraints* this module
   also asserts between adjacent scenes would scramble under reordering,
   so contradictions could appear or vanish somewhat unpredictably under
   SHUFFLE — not a designed signal for the blocker, don't build it as one.

9. **`metrics.ts`'s `surpriseProxy`/`twistImpact`/`pivotStrength`/
   `cliffhangerStrength`.** `surpriseProxy` specifically is order-sensitive
   by construction (rarity vs. the *running* distribution of every earlier
   scene) — genuinely interesting — but is a diagnostic-only report field
   today, never scored, and never measured against the real corpus.
   Measure before wiring; do not assume the running-distribution mechanism
   survives contact with feature-scale density normalization any better than
   the other three channels that were assumed to work and didn't.

10. **Personality frameworks, character archetypes, sociolinguistic
    register/dialect, POV-device classification (unreliable narrator,
    non-linear timeline).** Clean, confirmed ABSENT (STEP 3). **Order-
    sensitivity verdict: largely N/A** — these are mostly global/semantic
    judgments about a whole script or a whole character, not per-scene
    positional statistics, so "would this change under shuffle" doesn't even
    apply cleanly. Named last deliberately: building lexicon rule-packs for
    Myers-Briggs/Enneagram/archetype-matching would very plausibly
    reproduce the exact failure this project already lived through — a
    channel that *looks* like coverage and contributes close to nothing.
    **This tier is where "we don't cover X" is most likely the correct
    permanent state**, not a queue.

---

## What genuinely surprised the author, doing this audit

- The single biggest finding is not in the catalog at all: an entire family
  of ~10 well-designed, deterministic, genuinely order-sensitive-by-design
  modules (`disclosure-ledger.ts`, `epistemic-ledger.ts`, `mystery-fairness.ts`,
  `typed-promises.ts`, `well-made-surprise.ts`, `causality-enforcer.ts`,
  `truth-ledger.ts`, `custody-ledger.ts`, `belief-movement.ts`,
  `assertion-containment.ts`) sharing a common `SupportState`
  (ENTAILED/CONTRADICTED/UNKNOWN) evaluation contract, fully implemented and
  fully tested, **completely disconnected from the shipped product** — no
  route, no doctor field, nothing but their own test files. They directly
  answer several concepts this audit would otherwise have called flatly
  ABSENT (fair-play mystery, typed Chekhov's-gun discipline, causal-chain
  ratio, well-made-surprise scoring). Every one of them is blocked on the
  same missing piece: a text-to-typed-event extractor that doesn't exist.
  The bottleneck for this whole cluster isn't "build a new detector," it's
  "build the one bridge that lets real text reach detectors that already
  exist."
- `story-graph.ts` was explicitly built, by its own header comment, to solve
  the exact AUC 0.48 act-swap failure this project's own docs identify as
  the central blocker — and was never wired to the health score. Worse, this
  audit's own reading suggests its flagship feature (`forwardEdgeRatio`)
  likely inherits the D6 tautology and may not even work if it were wired in.
- `structure-presets.ts` already implements 21 named structural templates —
  more, and more varied, than the catalog's own beat-system section
  enumerates — but they're reachable only from the live story-generation
  path, never from an uploaded script the Doctor is asked to score.
- The catalog's own "12,700" doesn't even add up on its own terms (category
  subtotals sum to 16,200), and 115 of its claimed 127 categories have zero
  content.

---

## How to use this document

1. **Consult it before proposing new engine work**, especially anything
   framed as "the catalog says we're missing X." Check this map first —
   several plausible-sounding gaps (Chekhov's gun, fair-play mystery,
   dramatic irony) already have a real, evaluated, orphaned implementation
   waiting on a specific, nameable missing piece, not a blank slate needing
   a new detector from scratch.
2. **Gate every integration behind discrimination evidence, not craft
   plausibility.** A concept being real, well-known, and absent is not
   sufficient reason to build it. Apply the order-sensitivity test from STEP
   4 first; if the answer is no, the concept belongs in the diagnostic-value
   tier regardless of how compelling the craft argument is, and should be
   scoped as a report-quality improvement, not a scoring change. If the
   answer is yes, it still needs `npm run measure-real` before/after,
   respecting the AUC-24 ≥0.622 floor per CLAUDE.md's standing task, before
   it ships as a scoring change.
3. **Never treat coverage completeness as a goal in itself.** This document
   will never reach "100% covered," and it shouldn't try to. Re-run STEP 1's
   method (discard multipliers, count distinct concepts) if the catalog is
   ever revised, rather than trusting a round number. Most rows marked
   ABSENT in STEP 3 — Myers-Briggs, Enneagram, kinesics/proxemics,
   McGuffin/red-herring classification, national-cinema styles — are
   reasonable candidates for **staying** absent permanently. Saying so is
   this document's job, not a gap in it.
4. **When a candidate is approved for integration**, update this map's STEP
   3 status for that row (COVERED/PARTIAL/ABSENT) and STEP 4 tier alongside
   the code change, citing the same discrimination measurement that gated
   the change — so this document stays a true snapshot of the engine, not
   aspirational.
