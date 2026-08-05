# Completing StoryMachine: What's Missing and How to Add It

*Third companion document. `_SENSE_OF_THE_RESEARCH.md` describes the archive. `_BEST_RESEARCH_AND_WHATS_NEXT.md` judges it. This document defines what "complete" means and specifies every upgrade, addition, and dimension expansion required to get there.*

---

## 0. What "Complete" Means

The archive is not incomplete by accident. It became incomplete because every research pass was answering a different question — "what should the architecture look like?", "what papers are relevant?", "what's wrong with the current plan?" — and no pass ever asked the question that produces a complete spec: **"what does a great screenplay actually require to exist, and is every one of those requirements covered by a named subsystem?"**

A complete StoryMachine has to satisfy four nested completeness criteria, in this order:

1. **Theoretical completeness** — every dimension of dramatic craft a competent screenwriting professor would test on has a corresponding engine, formalism, or pipeline stage.
2. **Production completeness** — every dimension of screenplay workflow a competent line producer would expect has a corresponding feature, file format, or integration.
3. **Operational completeness** — every dimension of running an LLM-backed system in production (cost, observability, failure recovery, evaluation, multi-tenant, security) has a corresponding subsystem.
4. **Ethical completeness** — every dimension of cultural responsibility, attribution honesty, sensitivity, and transparency has a corresponding policy and instrumentation.

The archive covers Theoretical completeness at maybe **70%**, Production completeness at **30%**, Operational completeness at **40%**, and Ethical completeness at **15%**. The remaining 50–85% of work is mapped below by dimension.

Some of these are extensions to existing engines (depth upgrades). Some are new engines (breadth upgrades). Some are pipeline stages and tooling (production/workflow upgrades). Some are policy and instrumentation layers (ethical upgrades). All are buildable; none require new fundamental research.

---

## 1. The Twenty-Five Dimensions Where the Engine Is Incomplete

The dimensions below are roughly ordered by impact. Each names the gap, the specific theory/research to plug it, the engine or layer it lives in, and how to measure that it's working.

### 1.1 Character Cognition — Depth Upgrades

The archive has BDI + Memory Stream + OCC + Contagion + ToM² + Persuasion + Trust + Festinger dissonance + Maslow. That covers maybe 60% of what a believable character mind needs. The missing 40%:

- **Attachment Theory (Bowlby, Ainsworth, Hazan-Shaver)** — secure / anxious / avoidant / disorganized attachment styles shape romantic, parental, and friendship behavior in ways the Big Five alone cannot. Add `AttachmentStyle` enum and rules: avoidant agents withdraw under intimacy pressure even when goals would push toward connection.
- **Trauma & Somatic Memory (van der Kolk, Levine)** — flashbacks, dissociation, body-stored memory. V4's Subconscious Layer −1 hints at this; needs a real `TraumaEvent` type with re-activation rules (sensory triggers, anniversary effects, intrusive thoughts).
- **Internal Family Systems / IFS Parts (Schwartz)** — characters have inner "Managers," "Firefighters," "Exiles," and a "Self." This is the most underused framework for inner conflict in current AI character systems. Add `IFSPart` substructure where the character's `currentTactic` is annotated with which Part is in charge.
- **Defense Mechanism Hierarchy (Vaillant)** — mature (sublimation, altruism, humor) vs neurotic (intellectualization, displacement) vs immature (acting out, projection) vs psychotic (denial, distortion). Promote your existing defense list into a hierarchy with stress-graded thresholds.
- **Somatic Markers (Damasio)** — characters have gut-level "this feels wrong" signals that bias decisions before cognition catches up. Add `SomaticMarkerCache` per character: prior emotional valences attached to people/places/objects that pre-bias their next decision.
- **Habit / Procedural Memory** — characters do things automatically, not just deliberately. Add `HabitLibrary` to each agent: rituals, tics, defaults that fire under low-cognitive-load conditions.
- **Cognitive Load Modeling** — under pressure, characters get *worse*, not just *different*. Currently the engine increases tactical intensity under pressure; it should also decrease working-memory capacity, narrow attention, and increase reliance on habits and defenses.
- **Erikson Life-Stage Identification** — a 6-year-old, 16-year-old, 36-year-old, and 66-year-old don't just *know* different things; they're solving fundamentally different developmental problems. Encode the eight stages as identity-color filters on goals.
- **Counterfactual Regret / Relief** — "what if I had..." is a powerful emotional driver. Add `CounterfactualLedger` per character: events that *could* have gone differently and the character knows it.
- **Implicit vs Explicit Beliefs** — what a character would say they believe vs what their behavior shows. The Epistemic Engine currently models only explicit beliefs. Add `implicit_belief_layer` shadowing `belief_layers` with behavioral inference.

**Measurement**: stylometric blind test — can a domain expert correctly assign character behavior to an attachment style from 5 scenes? Target: 70%+.

### 1.2 Dialogue Engine — Major Depth Expansion

V_beta's Dialogue Engine and the chat-exports' Dialogue Compiler cover idiolect + power shifts + 7 validators. Missing from any file:

- **Speech Act Theory (Austin, Searle)** — every utterance has a locutionary (what's said), illocutionary (what's done), and perlocutionary (what's caused) layer. Promote `ActionType` from a single tag to a 3-tuple: surface form, force, effect.
- **Gricean Maxims & Implicature** — the four maxims (Quantity, Quality, Relation, Manner) are constantly *flouted* in real dialogue, and flouting them is how subtext works. The flouting rule is what generates Ego's "I don't *like* food. I love it." Add maxim-flouting as a first-class subtext technique.
- **Relevance Theory (Sperber-Wilson)** — cognitive effects ÷ processing effort. Add `relevance_score` to each line: high relevance lines stay, low-relevance lines get cut.
- **Politeness Theory (Brown-Levinson)** — face-threatening acts (FTAs), positive vs negative politeness, off-record strategies. Critical for power-differential scenes (interrogations, family arguments, romantic propositions).
- **Conversation Analysis (Sacks-Schegloff-Jefferson)** — turn-taking rules, adjacency pairs, preference organization (preferred vs dispreferred responses), repair sequences. Adds rhythm and naturalism dialogue compilers miss.
- **Discourse Markers** — "well," "so," "look," "I mean," "you know," "actually" — each performs a specific discourse function (hedging, framing, repair-initiating). Add a `DiscourseMarkerStrategy` per character.
- **Disfluency Modeling** — hesitations, restarts, fillers as emotional signals. Currently dialogue is generated as fluent prose; real anxious dialogue has measurable disfluency.
- **Argumentation Schemes (Walton, Toulmin)** — claim/data/warrant/backing/qualifier/rebuttal. When characters argue, generate the underlying argument structure first, then surface utterance.
- **Rhetorical Device Library** — chiasmus, anaphora, antithesis, parallelism, irony types (verbal/situational/dramatic), hyperbole, litotes, anadiplosis. These are not decoration; they're how memorable lines get memorable.
- **Code-Switching & Register-Shifting** — characters change register based on audience. A senator talks differently to family vs press vs colleagues. Add `RegisterContext` and stylistic switches.
- **Silence & Pause Engineering** — the most powerful line is often unspoken. Add `BeatOfSilence` as a first-class line type with motivation (refusal-to-speak, processing, omission, intimidation).
- **Verbal Tic / Catchphrase Library** — what makes a Tarantino character feel Tarantino. Per-character idiosyncratic phrases that can be planted and reincorporated.
- **Cross-Cultural Speech Patterns** — high-context vs low-context cultures, directness norms. A Japanese character's "no" is rarely literal "no."
- **In-Group Language / Private Vocabularies** — shared coded phrases signal relationships. Couples have private words. Families have inside jokes. Crime crews have cant.
- **Profanity Calibration Engine** — family-animation zero, indie-drama moderate, crime-genre high, Mamet-style aggressive. A `ProfanityProfile` per character + project lets the engine modulate.

**Measurement**: Run dialogue through a stylometric classifier and check it can recover the speaker from 5 anonymous lines at 80%+ accuracy. Run the 7 dialogue validators from `storymachine_chat_responses_compiled.md` on every output.

### 1.3 Visual / Cinematic Engine — Currently Underspecified

V4 has DeepShot, Match-Cut Sequencer, and 3D Spatial LCS. V_beta has body language and proxemics. The full visual engine is missing:

- **Color Script / Color Storytelling Engine** — color as character arc. Animated films commonly map emotions to a structural palette; live-action arcs often track via costume color drift. Add `ColorScript` as a first-class artifact: per-scene primary palette + symbolic color assignments per character.
- **Light & Shadow Engine** — chiaroscuro, key-light direction, color temperature. "Cool blue interior, warm amber exterior" or "high-key bright vs low-key noir" encoded as `LightingMood` per scene.
- **Composition Grammar** — rule of thirds, leading lines, symmetry, frame-within-frame, negative space, headroom. Encode common compositions with rules: "symmetry compositions for institutional power, negative space for isolation."
- **Lens & Camera-Movement Psychology** — 24mm intimate-with-distortion, 85mm flattering, 135mm voyeuristic; dolly-in (involvement) vs pull-back (revelation) vs handheld (chaos) vs locked-off (formality). Add `LensChoice` and `CameraMovement` to each shot in the DeepShot output.
- **Production Design Semiotics** — what objects in a frame mean. Tag every prop and set element with its symbolic role (status marker, character externalization, foreshadowing object, theme echo).
- **Tableau / Stage Picture** — who stands where, with whom, at what distance, with what eye-line. Where everyone is in physical space tells the story before they speak. Promote V_beta's proxemics + V4's spatial LCS to scene-level tableau planning.
- **Costume as Character** — costume is the most legible character externalization a film offers. Add `CostumeArc` to each character: how their wardrobe changes across acts mirrors their internal change.
- **Aspect Ratio / Format Storytelling** — Wes Anderson's shifts in *Grand Budapest*, *Mad Max: Fury Road*'s wide black bars. Make aspect ratio a tunable per-scene parameter.
- **Editing Rhythm Grammar** — L-cut, J-cut, jump cut, fade, dissolve, smash cut, match cut. Each performs a specific function. Promote the Match-Cut Sequencer to a full transition library.
- **Mise-en-Scène Tracker** — every element in the frame is intentional. Audit each scene for "what does this shot say beyond the dialogue?"
- **Practical vs Digital Distinction** — tactility affects audience perception. Tag effects choices.

**Measurement**: Reverse-engineer cinematography from a known film's screenplay + DeepShot pass + ColorScript pass, and compare to actual film. Match within 70% of choices.

### 1.4 Sound Design Engine — Almost Entirely Missing

The archive has Sonic Occlusion (V4) and almost nothing else. Sound is half of cinema. Missing:

- **Score Engine** — leitmotif per character/theme, tempo mapped to tension curve, score-absent moments engineered for impact. Generate music-cue annotations alongside Fountain.
- **Diegetic vs Non-Diegetic Sound** — what does the audience hear vs the characters?
- **Foley / Texture Engine** — footstep types, breath patterns, fabric, weather, ambient texture. Add `SoundDesignNote` per scene.
- **Acoustic Space** — reverb, room tone, indoor/outdoor signaling. The DeepShot or new SoundDesign engine should specify acoustic environment.
- **Voice Performance Notes** — timbre, pace, breathing, micro-tremor, accent. Currently dialogue is generated as text only. Add `VoicePerformanceCue` to each line.
- **Sound Bridge** — dialogue from next scene starts in current, or sound from previous scene continues. A specific transition technique that should be selectable.
- **Silence-as-Climax Detection** — when should the score drop out? This is the most powerful single sound design choice and the engine should be able to identify the moment.
- **Genre Sonic Coding** — Western strings, horror dissonance, romance piano, thriller pulses. Modulate score recommendations by genre.

**Measurement**: Generate a temp-score / sound-design pass alongside every scene; compare against actual film soundtracks for known reference films.

### 1.5 Pacing & Rhythm Engine — Needs Multi-Scale Expansion

The current Pacing Controller measures sentence-length variance and action density per turn. That's micro-pacing. Missing:

- **Scene-Length Distribution Analysis** — great scripts vary scene length wildly. A 20-second scene between two 8-minute scenes can be the most important moment. Add `SceneLengthRhythm` tracker.
- **Act-Level Tempo Curves** — Act 1 establishes, Act 2 complicates, Act 3 accelerates. Tempo shifts at act breaks are detectable and prescribable.
- **Dialogue-Density Curve** — early talky, midpoint emotional, climax explosive. Per-scene dialogue-to-action ratio plotted against ideal genre curve.
- **Information-Reveal Velocity** — too fast = confusing; too slow = boring. Compute reveals-per-minute and check against genre norm.
- **Emotional Beat Frequency** — emotionally-driven feature drama lands a major emotional beat roughly every 12–15 minutes. Comedy beats every 1–2 minutes. Track emotional beat cadence.
- **Subplot Pacing Interleave** — A-plot urgent, B-plot deliberate. Currently no engine schedules subplot beats against main plot beats.
- **Time Compression / Expansion** — montage vs real-time vs ellipsis. Make this a per-scene choice with explicit ratios (90 seconds of screen time per montage minute, etc.).
- **Average Shot Length (ASL)** — measurable per-scene metric correlated with genre/era. Add to DeepShot output.
- **"Sit With It" Beat Detection** — after a revelation, the film should pause. Identify these moments and protect them from being cut.
- **Anticipation vs Surprise Allocation** — Hitchcock's bomb-under-the-table rule. The engine should be able to convert a surprise into an anticipation by inverting the reveal sequence.

**Measurement**: Plot the dialogue density / scene length / emotional beat curves of your reference-film corpus and your generated output. Curves should cluster.

### 1.6 Theme / Premise / Argument Engine — Needs Egri Depth

The Theme Engine exists in V_beta. It needs to be substantially deeper:

- **Egri Premise Machinery** — "Great love defies even death." Every Egri premise is an "X leads to Y" testable assertion that the plot must prove. Make the premise a first-class object that the entire engine validates against.
- **Counter-Premise Engine** — the antagonist embodies the counter-argument. Generate counter-premise from premise: "Selfishness leads to isolation" → counter = "Selfishness leads to power." The story tests both.
- **Thematic Variation Across Subplots** — main theme + variations. The B-plot, C-plot, and subplots should each illuminate the main theme from different angles.
- **Symbolic Density Mapping** — which objects, colors, gestures, words appear when. Track `SymbolUsageCurve` per symbol per scene.
- **Moral Argument Calibration (Truby + Walton)** — claim + support + warrant + qualifier + rebuttal. Generate the argument explicitly, then dramatize it.
- **Philosophical Position Detection** — existentialist, nihilist, absurdist, stoic, romantic, postmodern. Films have philosophical postures whether the writers intended them or not.
- **Mythic Resonance Detector** — does this story echo a known myth? Hero's Journey is the obvious one; less obvious are Persephone/Demeter, Orpheus, Job, Trickster, Prodigal Son, Lear, Faust. Match to a library.
- **Ironic Distance Calibration** — is the film *with* its characters (empathetic, sentimental, family-drama posture) or *against* them (detached, satirical, Coen-brothers-style posture)? Encode the implied authorial stance per scene.
- **Theme-Mechanism Coupling Audit** — the central law says theme → mechanism. Audit that the mechanism actually proves the theme. "Anyone can cook" → mechanism is a rat cooks → theme proven.

**Measurement**: For each generated screenplay, produce a one-sentence Egri premise and verify the plot tests it across 3 acts with measurable thematic variation.

### 1.7 Genre Engine — Needs Hybrid and Subgenre Depth

V_beta has Neale 1980 + 7 genres. Real screenwriting needs:

- **Genre Hybrid Logic** — rom-com-thriller (You've Got Mail meets North by Northwest), heist-comedy, western-sci-fi (Firefly). When genres blend, conventions clash productively or destructively. Encode the productive vs destructive hybrid patterns.
- **Subgenre Convention Maps** — cosmic horror vs gothic horror vs slasher vs found footage. Within "horror," the conventions differ wildly.
- **Era-Specific Genre Codes** — 70s thriller (paranoid, downbeat) vs 90s thriller (procedural, twist-heavy) vs 2020s elevated horror (slow-burn, trauma-coded). Per-decade convention overlays.
- **Genre Expectation Subversion** — playing against convention is how surprises happen. The engine should know what the convention is in order to subvert it.
- **Tonal Calibration per Genre** — same plot, different tonal recipe. Calibrate sentiment / humor / darkness / sentimentality budgets per genre.
- **A24-Codes / Studio Codes** — different markets reward different conventions. "An A24 movie" implies specific aesthetic and pacing choices.
- **Genre Death-Spirals** — when does a hybrid become incoherent? Detect and flag.

**Measurement**: Classify generated scripts by genre using a separate classifier; check it matches the requested genre/subgenre at 85%+ accuracy.

### 1.8 Audience Modeling Engine — Currently Single-Reader

The engine has `AudienceModel.predictNext`. It assumes a single, generic audience. Real audiences:

- **Demographic-Layered Audience Models** — same story affects 8yo vs 28yo vs 58yo differently. Per-target-demographic audience submodels.
- **Genre Sophistication Modeling** — genre-literate audiences see twists coming. Calibrate reveal probability against modeled audience genre fluency.
- **Cultural Reference Density Calibration** — too few references = bland; too many = niche. Track and tune.
- **Confusion Tolerance** — art films have higher ambiguity budgets than blockbusters.
- **Re-Watch Reward Detection** — what details only land on second viewing? Plant rewatchable layers intentionally.
- **Investment Curve Tracking** — when has the audience earned the climax? Audit before allowing reveals.
- **Forgiveness Budget** — audiences will tolerate so much protagonist failure before disengaging. Model and budget.
- **Trigger / Sensitivity Detection** — content warning prediction layer.
- **Theory-of-Mind of the Reader** — "the reader will think X, let's subvert" is a higher-order reveal pattern.
- **Cliché Detection from the Audience Side** — "I've seen this" triggers disengagement. Cross-reference TVTropes db (already proposed) with audience exposure model.

**Measurement**: Run generated scenes through 3–5 demographic audience models; verify predicted engagement diverges as expected.

### 1.9 Plot Structure Engine — Needs Non-Classical Modes

The archive assumes mostly classical 3-act / hero's journey structure. Real cinema includes:

- **Anti-Plot / Mini-Plot / Classical-Plot Selection (McKee)** — explicit mode selection at outline time. Mini-plot (Tokyo Story), anti-plot (Memento, Synecdoche), classical (Up).
- **Frame Narrative / Nested Narrative Logic** — story-within-story (Princess Bride), unreliable narrator (Rashomon, Usual Suspects).
- **Multiple Timeline Synchronization** — Pulp Fiction's chronology shuffle, Cloud Atlas's six-era weave, Inception's dream-levels. Promote V_beta's Timeline (analepsis/prolepsis/parallel/reverse/loop) into a full multi-timeline solver.
- **Branching Narrative Logic** — Sliding Doors, Run Lola Run. The engine's What-If branching is the writer-facing version; this is the published-form version.
- **Mosaic / Anthology Structure** — Magnolia, 21 Grams, Babel, Love Actually. Multiple protagonists with thematic rather than plot convergence.
- **Bottle Episode Architecture** — single location, single timeframe as constraint-driver. *12 Angry Men* is the canonical example.
- **One-er / Long-Take Storytelling** — *1917*, *Birdman*. Long takes as time-pressure devices.
- **Meta-Narrative & Self-Awareness** — *Adaptation.*, *Synecdoche New York*, *Last Action Hero*. The film is aware of being a film.
- **Inversion of Cause/Effect** — the reveal that the protagonist was the villain (*Fight Club*, *Memento*).
- **Plot Convergence Patterns** — how multiple threads land in the same scene (Robert Altman / P.T. Anderson convergence).
- **Plot Holes vs Productive Ambiguity** — distinguish intentional gaps from accidental. The engine should be able to identify both.
- **Pinch Points** — Snyder/Field structure has multiple "pinch" beats beyond just midpoint and climax. Promote pinch points to first-class beats.
- **Reincorporation Engine** — earlier elements should return transformed. Audit that every major setup pays off, and every payoff has setup.
- **Mirror Scene Detection** — parallel scenes that comment on each other (Up's first-act and last-act montages).
- **The Missing Scene** — what scene does NOT happen, and why? "Why is there no funeral?" is sometimes the answer to a story.

**Measurement**: Generate a non-classical structure on demand (e.g., reverse chronology) and verify the engine maintains coherence across the reversed dependency graph.

### 1.10 Writer Workflow / IDE — Currently Single-Mode

The Writer Cockpit has Director's Cut + Harvest + What-If. Real screenwriting workflows include:

- **Outline-First Mode** — many writers outline before drafting. Provide a structured outline builder with beat-board UI.
- **Index-Card / Beat Board View** — the corkboard. Drag-and-drop scene cards.
- **Treatment Mode** — paragraph-length prose summary, lower fidelity than script.
- **Three-Fidelity Pipeline** — Treatment → Outline → Script. Each can be edited and changes propagate forward/backward.
- **Character Bible Builder** — guided character creation wizard generating BDI + history + voice profile + relationships.
- **World Bible Builder** — same for fictional worlds.
- **Reference Management** — "this scene is inspired by *Heat* p.84" link-back. The engine maintains the influence DAG.
- **Collaboration Tools** — Final Draft has these; the archive doesn't address. Real-time co-editing, comment threads, suggested-edits mode.
- **Revision Tracking with Reasons** — every change has an attached rationale ("studio note: happier ending").
- **Audio Note Integration** — voice memos transcribed and attached to scenes.
- **Reader / Producer Comments Integration** — round-trip with stakeholders.
- **Comparison View** — draft A vs draft B side-by-side, with diff coloring at semantic-block level.
- **Read-Aloud / Table-Read Mode** — simulated table read with TTS voices per character. Highest-quality TTS only.
- **Coverage Generator** — auto-generate a coverage report (logline, synopsis, character analysis, structure analysis, marketability, recommend/consider/pass).
- **Format Switching** — screenplay ↔ stage play ↔ teleplay ↔ prose ↔ comic script ↔ game script.
- **Internationalization** — subtitles, dubbing-aware dialogue length constraints, cultural localization warnings.
- **Accessibility Modes** — dyslexic-friendly font + spacing, voice control, screen reader compatibility.
- **Mobile / Tablet Workflow** — capture inspiration on the go, sync to desktop.
- **Distraction-Free Writing** — the "iA Writer" minimalist mode.

**Measurement**: 5-screenwriter user research before Week 6. Track which modes get used.

### 1.11 Production / Pre-Production Bridge — Missing Entirely

The archive ends at Fountain export. Screenwriting bridges directly into production. Add:

- **Breakdown Sheets** — locations, props, characters, costumes per scene. Generate from the symbolic substrate (it has all this already).
- **Shot List Generation** — DeepShot exists; productionize.
- **Storyboard Integration** — text + frame per beat. Optionally generate frame sketches via image model.
- **Budget Implication Tagging** — "this scene is $50K vs $5M" based on cost-driver tags (water, fire, kids, animals, VFX, location type, day vs night, INT vs EXT, name actors required).
- **Casting Type Tags** — physical type, age range, voice quality, skill requirements per character.
- **Location Scouting Hints** — "this scene needs golden-hour exterior with cliff and ocean."
- **Production Schedule Estimator** — day-out-of-days from scene breakdown.
- **Director Note / Auteur Style Application** — apply a director's style to existing script using the `film-director-ars-research.skill`.
- **Trailer Beat Selector** — which 90 seconds of footage best sell this story?
- **Pitch Document Generation** — logline + synopsis + treatment + comparable films.
- **Three-Page Treatment Auto-Generation** — coverage-format treatment from script.
- **Festival Submission Package** — cover letter, synopsis, bio, contact, technical info.
- **Standardized Industry Format Outputs** — Final Draft FDX, Fade In, WriterDuet, Highland, Movie Magic Screenwriter compatibility.

**Measurement**: Generate a full production breakdown for a known screenplay and verify against an actual line producer's breakdown.

### 1.12 Evaluation Suite — Needs Multi-Dimensional Expansion

Current eval: ASE, ConStory-Bench 19 subtypes, structural metrics, emotional arc, MAP-Elites diversity, LLM-as-judge. Missing:

- **Inter-Rater Reliability Tracking** — multiple human raters per sample, Krippendorff's α or Cohen's κ for evaluator agreement.
- **A/B Test Infrastructure** — which scene works better with real readers?
- **Reading-Time Estimation** — minutes to read each scene, used for pacing math.
- **Comparable Film Matching** — embed the script, find nearest known films, report similarity scores.
- **Originality Score** — semantic distance from training corpus, embedding-space novelty.
- **Cliché Density Heatmap** — per-scene cliché score with line-level highlighting.
- **Reading Level / Vocabulary Complexity** — Flesch-Kincaid analogue tuned for screenplay.
- **Demographic Appeal Prediction** — model-based prediction of which audiences respond.
- **Award-Likelihood Estimation** — what awards-friendly elements (single-location, social-issue framing, character study, ambiguous ending)?
- **Critical-Reception Prediction** — model trained on critical reviews of past films.
- **Diversity / Representation Audit** — Bechdel-Wallace and family of tests applied automatically.
- **Sensitivity Reader Pass** — automated cultural sensitivity check with confidence scores and flagged concerns.
- **Legal Risk Scan** — real-person depiction, trademark, defamation, copyright concerns.
- **Genre Convention Compliance Score** — does this script deliver what its genre promises?
- **Voice-Differentiation Metric** — stylometric distance between characters; flag if too low.
- **Specificity Metric** — generic-language detection. The #1 quality killer in LLM-generated content.
- **Surprise Bandwidth Audit** — over a 30-scene run, how many surprises does the audience get, of what magnitudes?

**Measurement**: All metrics produce stable scores across rerun; LLM-as-judge correlates with human r ≥ 0.7.

### 1.13 Self-Improvement / Learning Engine — Single-Pass Today

The engine generates and exits. A complete engine learns:

- **Per-Writer Style Learning** — fine-tuned LoRA or adapter per writer capturing rejection patterns and preferred constructions.
- **Style Transfer Learning** — "write more like my last script."
- **Reject-Pattern Mining** — which suggestions does this writer reliably reject? Stop offering them.
- **Workflow Pattern Learning** — when does this writer use What-If? Surface it proactively.
- **Genre Mode Detection** — when the writer is in "comedy mode," shift defaults.
- **Time-of-Day Sensitivity** — some writers do best in morning. Adapt session quality expectations.
- **Personal Skill Library** — the writer's saved tactics, templates, motifs.
- **Director-Profile Application** — apply a saved auteur profile to existing script.
- **Failed-Generation Library** — every rejected output is training data.
- **Few-Shot Personalization** — 5–10 lines from the writer's previous scripts tune every prompt.
- **Active Learning Selection** — the engine asks the writer for ratings on its least-confident outputs.

**Measurement**: After 50 sessions with a writer, generation quality on their preferred genre/style should measurably improve.

### 1.14 Theoretical Foundations — Some Gaps Worth Closing

MIMO ScriptIDE covers 8 formal frameworks. Worth adding:

- **Description Logic / OWL** — formalize the knowledge graph properly. Reasoning becomes principled.
- **Probabilistic Programming (Pyro, NumPyro)** — model reveal probabilities, audience expectation distributions, character behavior as Bayesian programs rather than deterministic rules.
- **Linear Temporal Logic / Computation Tree Logic** — express story constraints like "eventually the protagonist learns the truth" or "X never happens before Y."
- **Deontic Logic** — modeling obligation, permission, prohibition (critical for moral/legal/institutional scenes).
- **Constraint Satisfaction Problem (CSP) Formalization** — beat sequencing is a CSP; formalize and use existing solvers.
- **Reinforcement Learning Formalization** — the writer's accept/reject signals are a reward function. Train.
- **Bayesian Inference for Reader State** — update audience belief over time given each new scene.
- **Information Geometry** — proper distance metrics over belief state spaces.
- **Topology of Story Space** — which stories are "near" which? Cluster.
- **Algorithmic Information Theory** — compressed description length as a quality signal (high entropy = generic, low entropy = idiosyncratic).
- **Vladimir Propp's Morphology** — 31 functions, 7 character archetypes. Add as a primitive layer below McKee.
- **Aarne-Thompson-Uther Index** — folktale function library.
- **Northrop Frye's Mythoi** — Spring (comedy), Summer (romance), Fall (tragedy), Winter (irony/satire). Complements the 6-arc valence types.
- **Tzvetan Todorov's Equilibrium-Disruption-Resolution** — five-stage transformation, more rigorous than 3-act.
- **Roland Barthes's Five Codes (S/Z)** — hermeneutic, proairetic, semantic, symbolic, cultural. Each line of dialogue operates on multiple codes.

**Measurement**: Document each engine choice with the theoretical framework it rests on; defensibility audit by an outside narratologist.

### 1.15 Cultural / Ethical / Safety — Major Gap

The archive has CMAG (V2.1, dropped), Representational Justice gate (V4), and Trope Penalty. That's not enough.

- **Multi-Axis Bias Auditing** — race, gender, sexuality, ability, age, class, religion, body type, neurodivergence. Per-axis audit with quantified scoring.
- **Authentic Cultural Representation Engine** — beyond avoidance, toward depth. Specialized sub-modules per culture/community, ideally co-designed with consultants.
- **Trauma-Informed Generation** — specifically for violence, abuse, mental illness, addiction. Generation rules + content warnings.
- **Mental Health Sensitivity** — depression, suicide, self-harm, eating disorders. Hard rails based on best-practice clinical guidance.
- **Cultural Appropriation Detection** — whose story is this? Provenance + perspective checking.
- **Power Dynamics Awareness Audit** — who speaks, who's spoken about, who's silent. Track screen-time, lines-per-character, agency-per-character by identity axis.
- **Stereotyping Watchdog** — more rigorous than just trope penalty. Embed-based detection of latent stereotype patterns.
- **Historical Accuracy Layer** — "this could happen in 1923 but not 1903." Time-period world model.
- **Translation / Cultural Localization Warnings** — "this joke doesn't work in Japan because pun is untranslatable."
- **Age Rating Estimation** — G/PG/PG-13/R/NC-17 likelihood per scene and overall.
- **IP / Copyright / Trademark Guardrails** — real product names, song lyrics, real-person depictions.
- **Defamation Risk Scan** — real-person depiction rules per jurisdiction.
- **Privacy / Data Protection** — the writer's creative ideas. End-to-end encryption option.
- **Content Provenance Watermarking** — which parts are AI-generated, for WGA contract compliance and disclosure.

**Measurement**: Independent third-party sensitivity reader confirms generated content meets standard guidelines at 95%+ rate.

### 1.16 AI Honesty / Transparency — Almost Entirely Missing

Critical given current WGA/SAG dynamics and public AI trust:

- **AI Disclosure Standards Compliance** — WGA contract terms, SAG/AFTRA, Anthropic AUP, OpenAI usage policies. Generate compliant attribution metadata automatically.
- **Authorship Attribution Logic** — what percentage of the script was AI-generated vs human-written vs AI-edited? Per-line provenance tracking.
- **Generation Watermarking** — invisible content provenance for downstream verification.
- **Hallucination Disclosure** — when the AI cited a fact, did it make it up? Flag low-confidence factual claims.
- **Confidence-Weighted Outputs** — every generation comes with a confidence score and the factors behind it.
- **Failure Mode Transparency** — "I don't know how to handle this" instead of silently degrading.
- **Reasoning Trace Always Available** — never a black box. The inference_trace table already exists; expose it in UI.
- **Bias Disclosure** — "this character description draws on stereotype X."
- **Training Data Acknowledgment** — clear statement of what corpora the model has seen.

**Measurement**: 100% of generated output has attached attribution metadata; provenance is verifiable post-hoc.

### 1.17 Multi-Author / Writers-Room Mode — Underspecified

V2.1 has "Multi-User Collaboration." Real writers' rooms have:

- **Writers' Room Simulation** — multiple human writers + multiple AI agents at the same table.
- **Showrunner Mode** — one human curating multiple AI agents.
- **Adaptation Workflow** — novel → screenplay with bidirectional reference. Pages of novel link to scenes of script.
- **Collaborative Outline Building** — multiple humans propose beats; system harmonizes.
- **Co-Writer Conflict Resolution** — when two writers disagree, present both with rationale.
- **Role-Based Access** — producer can comment but not rewrite.
- **Permission Granularity** — who can edit which scene.
- **Branch / Merge for Narrative** — uses StoryCommit ledger.
- **Audit Trail for Studio Accountability** — every change attributed.

**Measurement**: 3 humans + 2 AI agents can co-write a 10-page scene without conflict-state corruption.

### 1.18 Cross-Media / Adaptation Engine — V_beta Only

Add:

- **Adaptation Workflows** — novel → screenplay, screenplay → graphic novel, screenplay → game, screenplay → stage play.
- **Episode-to-Episode Continuity for TV** — season-long arcs, character beats per episode.
- **Series Bible Maintenance** — auto-updating canonical character, world, and theme docs.
- **Spin-off / Sequel Logic** — which characters return, which mechanisms continue, which themes echo.
- **Crossover Rules** — shared-universe constraints (cross-property cameos, continuity locks, fan-theory containment).
- **Worldbuilding Coherence Across Properties** — when one IP changes, what propagates?

**Measurement**: Generate a one-page treatment for a sequel to a known film and check coherence with the original.

### 1.19 Live / Interactive / Game Modes — Mostly Missing

V2.1's "Interaction / Play Mode" underspecified. Add:

- **Interactive Fiction Mode** — reader makes choices; the engine adapts.
- **Live Performance / Improv Support** — generating scene starters for human actors.
- **Video Game Narrative Mode** — branching, replay, save states, achievement-aware story.
- **TTRPG Integration** — Dungeon Master assistance.
- **Streaming / Live Generation** — audience-influenced.
- **AR/VR Story Authoring** — spatial storytelling.

**Measurement**: Generate a 5-choice interactive scene with coherence across branches.

### 1.20 Pedagogical Mode — Missing Entirely

For teaching screenwriting:

- **Story-Teaching Mode** — the engine explains *why* a scene works.
- **Annotation Layer** — shows novice writers the underlying mechanism behind a scene.
- **Compare-and-Contrast with Canonical Films** — "this scene structurally matches Up p.48–52."
- **Exercise Generator** — "rewrite this scene from the antagonist's POV."
- **Skill Tree for Writer Development** — track which dramaturgical skills the writer has demonstrated.
- **Mistake Cataloging** — common writer mistakes flagged with examples.
- **Master-Class Mode** — apply a known director/writer's process via the .skill bundles.

**Measurement**: Teaching scenarios produce measurably improved writing in users over 10 sessions.

### 1.21 Operational / Business — Largely Outside Scope but Required

- **API for Third-Party Integration** — let other tools (Final Draft, Highland, WriterDuet) integrate.
- **Plugin Architecture** — third parties can extend with custom dramaturgical theories, genre packs, voice profiles.
- **Marketplace** — director profiles, genre packs, theme libraries, voice profiles.
- **Enterprise Mode** — studio integration, security, audit, SSO.
- **Telemetry & Privacy Controls** — opt-in / opt-out granular.
- **Pricing Tiers** — subscription, per-project, educational, enterprise.
- **Localization Operational** — RTL languages, non-Latin scripts, CJK ideographs.

**Measurement**: 10 third parties build plugins within 6 months of public API release.

### 1.22 Specificity Engine — The Hidden Linchpin

The single biggest quality lever in any LLM-generated content is **specificity**. Generic dialogue, generic descriptions, generic emotions, generic settings are the #1 quality killer. The archive never names this as a first-class engine.

Add:

- **Specificity Scoring** — embedding distance from cluster centroids; flag anything too central.
- **Detail Mandate** — every scene gets 1–3 specific sensory details that ground it.
- **Brand / Object Specificity** — "she drinks coffee" → "she drinks the exact same Costa flat white she's had every morning since the divorce."
- **Location Specificity** — "a diner" → "the 24-hour diner on Sepulveda with the broken neon-S."
- **Voice Specificity** — character-specific verbal tics.
- **Gesture Specificity** — characters do *specific* things, not generic things.
- **Sensory Specificity** — sight, sound, smell, taste, touch in each scene where appropriate.

**Measurement**: Specificity scoring on a per-line basis with a fixed threshold every scene must clear.

### 1.23 Surprise Engine — Beyond Reveal Architecture

The Reveal Engine handles plot-level surprises (twists, reveals). It doesn't handle:

- **Micro-Surprise per Scene** — every scene should contain a moment of micro-surprise. Not the big reveal — the small "I didn't see that coming" beat.
- **Character-Level Surprise** — characters do unexpected (but justifiable in hindsight) things.
- **Dialogue Surprise** — the unexpected reply, the surprising metaphor.
- **Tonal Surprise** — comedy in tragedy, tragedy in comedy.
- **Subverted Trope Detection** — actively use tropes as setups for subversion.

**Measurement**: Per-scene surprise audit; target ≥1 micro-surprise per 3-page scene.

### 1.24 "Why Now? Why Here? Why Them?" Engine

The single best dramaturgical question a script editor asks: *why is this story happening on this specific day, in this specific place, to this specific person?* No engine in the archive answers it:

- **Temporal Necessity** — what makes this specific moment in the character's life *the* moment?
- **Spatial Necessity** — why this location and not any other?
- **Character Necessity** — why this protagonist and not someone else?
- **Stakes Audit** — what happens if nothing happens? Generic answer = generic story.
- **Forcing Function** — the specific event that *requires* the story to start now.

Add a `StoryNecessityAudit` that fires before any outline is accepted and flags any answer that's generic.

**Measurement**: Every generated outline has explicit, specific answers to all four "why" questions.

### 1.25 The Reincorporation Engine — The Most Underused Dramaturgical Tool

Great endings *re-use* earlier elements transformed. A keepsake from Act 1 pays off a promise made in the inciting incident. A taste, smell, or sound triggers a buried memory at the climax. An object that physically embodies a character's wound transforms in their last scene. The archive has Chekhov's Gun tracking, but Chekhov's Gun is only setup → payoff. Reincorporation is broader:

- **Setup → Payoff Auditing** — already partially present, formalize completely.
- **Symbol Reincorporation** — every visual motif should return transformed.
- **Phrase Reincorporation** — character-specific phrases that recur at meaningful intervals.
- **Location Reincorporation** — returning to a location with new meaning.
- **Object-State Reincorporation** — V_beta has ObjectStateArc; promote to acceptance test.
- **Character Reincorporation** — secondary characters who return at the climax to comment on the protagonist's growth.
- **Theme Reincorporation** — the premise re-stated and re-tested at the end.

Add a global `ReincorporationAudit` over the screenplay graph that scores how much of Act 3 is composed of *transformed* elements from Acts 1–2.

**Measurement**: Reincorporation density ≥ 70% in Act 3, calibrated against your reference-film corpus.

---

## 2. New Engines to Add (Net New, Not Just Extensions)

Beyond depth upgrades to existing engines, these are genuinely new engines the archive doesn't name:

### 2.1 The Necessity Engine
Audits every scene against the "Why now? Why here? Why them?" questions. Generic answers blocked.

### 2.2 The Reincorporation Engine
Global Act 1–2 → Act 3 audit. Scores transformed-element density.

### 2.3 The Specificity Engine
Per-line specificity score with detail mandate enforcement.

### 2.4 The Anti-Sentimentality Engine
Detects moments where the script over-sells the feeling. Cuts the unearned tears.

### 2.5 The Throughline Engine
Every scene tied to the central premise via a chain of mechanisms. Audit before allowing a scene to enter Act 3 onwards.

### 2.6 The Pinch-Point Engine
Beyond midpoint and climax, structural pressure points the engine should land specifically.

### 2.7 The Mirror Scene Engine
Parallel scenes that comment on each other. Audit for ≥1 mirror pair per script.

### 2.8 The "Why's This Scene Even Here?" Engine
McKee's orphan-scene detector promoted to acceptance test gate.

### 2.9 The Surprise Bandwidth Engine
Per-scene and per-act surprise allocation. Verify a script delivers small + medium + large surprises in roughly the proportions of high-rated films.

### 2.10 The Sound Design Engine
First-class: score notes + foley + diegetic vs non-diegetic + leitmotif + silence-as-climax.

### 2.11 The Color Script Engine
Per-scene palette + symbolic-color-per-character + color-arc-tracking.

### 2.12 The Production Bridge Engine
Breakdowns + shot list + budget tags + casting types + location scouting + standardized industry exports.

### 2.13 The Adaptation Engine
Novel ↔ screenplay ↔ stage ↔ game ↔ comic with bidirectional reference.

### 2.14 The Pedagogical / Teaching Engine
Annotation + explanation + exercise generation + skill-tree tracking.

### 2.15 The Sensitivity / Authenticity Engine
Multi-axis bias audit + sensitivity-reader pass + historical accuracy + cultural appropriation detection.

### 2.16 The Disclosure / Provenance Engine
Per-line generation provenance + WGA-compliant attribution + AI-content watermarking.

### 2.17 The Personal Learning Engine
Per-writer adaptation + style transfer + rejection-pattern mining + active learning.

### 2.18 The Live / Interactive Engine
IF mode + game-narrative branching + improv-support + audience-influenced.

### 2.19 The Multi-Author Engine
Real writers'-room simulation + role-based access + branch/merge for narrative.

### 2.20 The Industry-Format Output Engine
FDX + Fade In + Highland + WriterDuet + Final Draft + Movie Magic compatibility.

---

## 3. The Complete Engine Inventory (After Upgrades)

Collapsing all the above onto the 6-canonical-engines structure produces this complete picture:

### Layer 0 — Symbolic Foundation (formal substrate)
- Event-sourced StoryCommit Ledger (versioned, branchable)
- Temporal Fact Engine (FactTrack + Allen Interval Algebra + Event Calculus)
- World-State Engine (locations, props, environment, time-of-day, weather, season)
- Causal Graph (with full edge taxonomy)
- Spatial Engine (3D LCS, proxemics, tableau planning)

### Layer 1 — Character Substrate
- BDI Cognition Engine (DAG goals, three horizons, intent pressure)
- Memory Substrate (xMemory 4-level + EmotionalRAG + reflection)
- Personality (Big Five + Dark Triad + Attachment Style + Maslow level + Erikson stage + life history)
- Emotion Engine (OCC + EMA 6-step + Mood/PAD + contagion + somatic markers + emotional masking)
- Theory of Mind (EvolvTrip BDI triples + ToM² PAL + visibility model + TOMA chain-of-thought + bluff detection)
- Trauma & Subconscious Layer (Layer −1 from V4 + trauma reactivation rules)
- Defense Mechanism Hierarchy (Vaillant)
- Internal Family Systems Parts (Schwartz)
- Habit / Procedural Memory
- Counterfactual Ledger
- Implicit / Explicit Belief Split

### Layer 2 — Social / Relational Substrate
- Relationship Engine (Interpersonal Circumplex + Gottman + attachment-aware)
- Trust Engine (CICERO + reliability decay + commitment ledger)
- Coalition Engine (formation, alliance, betrayal)
- Power Dynamics Engine (Brown-Levinson politeness + power-shift in speech)
- Cultural Cognition Layer (Hofstede + cross-cultural patterns)

### Layer 3 — Dramaturgical Engines
- Drama Manager (monitor-decide-act + intervention vocabulary + ArcSpec + intervention budget)
- Tension Engine (5-feature with calibrated weights + Gervás expectation-violation + reader-state prediction)
- Pacing Engine (micro: sentence/action; meso: scene-length; macro: act-tempo + dialogue density + emotional beat frequency + subplot interleave)
- Reveal Engine (per-secret IllusionArc + Chekhov tracker + prestige readiness + Sternberg triad)
- Information Gap / Irony Tracker (suspense / dramatic irony / surprise)
- Necessity Engine ("why now/here/them?")
- Throughline Engine (premise-to-scene chain audit)
- Mirror Scene Engine
- Reincorporation Engine
- Surprise Bandwidth Engine
- Pinch-Point Engine
- "Sit With It" Beat Detection

### Layer 4 — Theme / Genre / Argument
- Theme Engine (Truby + Egri premise + counter-premise + symbolic density)
- Argument Engine (Walton schemes + Toulmin)
- Genre Engine (Neale + hybrid logic + subgenre conventions + era codes)
- Mythic Resonance Engine (Hero's Journey + Propp + Aarne-Thompson-Uther)
- Ironic Distance Calibrator

### Layer 5 — Scene / Mechanism Construction
- Scene Engine (purpose classifier + orphan detection + gap auditor)
- Narrative Mechanism Compiler (theme → mechanism → rule → object → cost → witness → proof → scene)
- Mechanism Library (Object-State Arcs, Ritual Protocols, Legitimacy Split, Antagonist Function Splitting, Climax Proof, Witness Conversion, etc. — the MIMOchat 45-engine inventory composed from the layers above)
- Subtext Engine (8 techniques + flouting maxims + post-render preservation validation)
- Specificity Engine (per-line scoring + detail mandate)

### Layer 6 — Dialogue & Performance
- Dialogue Engine (speech acts + Grice + relevance + politeness + conversation analysis + register/code-switching)
- Voice Engine (idiolect + StyleChat + quantitative VoiceProfile + verbal tics + catchphrases + private vocabularies)
- Subtext-Specific Dialogue Layer (paraphrasing, irony, deflection, indirect speech)
- Disfluency Modeling
- Silence Engineering
- Rhetorical Device Library
- Voice Performance Cues (timbre, pace, breathing, accent notes)

### Layer 7 — Visual / Cinematic
- DeepShot Cinematography (lens + angle + movement + shot type)
- Color Script Engine
- Lighting / Shadow Engine
- Composition Grammar Engine
- Production Design Semiotics
- Tableau / Stage Picture Engine
- Costume-as-Character Engine
- Aspect Ratio Engine
- Editing Rhythm Grammar
- Match-Cut Sequencer

### Layer 8 — Sound
- Score Engine (leitmotifs, tempo, score-absence)
- Sound Design Engine (foley, ambience, diegetic vs non-diegetic, acoustic space, sonic occlusion)
- Voice Performance Engine

### Layer 9 — Narrative Compiler / Script Bridge
- Simulate-then-Rewrite Pipeline (RewriteAgent)
- Fountain Compiler with provenance metadata
- Plug-and-Play Dramaturge (3-stage refinement)
- HAR (Hallucination-Aware Refinement, 2-iteration)
- Causal Plot Constructor (R²)
- Syuzhet Reconstructor (fabula → syuzhet)
- Editor Agent (HoLLMwood)
- Multi-Format Output (Fountain + FDX + Final Draft + Highland + comic-script + stage-play + game-script + prose)

### Layer 10 — Audience / Reader Model
- Reader State (suspense + curiosity + dramatic irony + investment + forgiveness budget + confusion tolerance)
- Demographic-Layered Audience Submodels
- Genre Sophistication Modeling
- Re-Watch Reward Detector
- Theory-of-Mind of the Reader

### Layer 11 — Plot Architecture
- Plot Mode Selector (Classical / Mini-Plot / Anti-Plot)
- Multi-Timeline Solver (analepsis / prolepsis / parallel / reverse / loop / mosaic / frame)
- Branching Narrative Engine
- Frame-Narrative Logic
- Meta-Narrative / Self-Awareness Layer

### Layer 12 — Writer Cockpit (IDE)
- Outline Mode + Beat Board / Index Cards
- Treatment Mode
- Script Mode
- Three-Fidelity Pipeline (Treatment ↔ Outline ↔ Script with bidirectional propagation)
- Character Bible Builder
- World Bible Builder
- Director's Cut Mid-Simulation Override
- Harvest Mode (browse / pin / reorder / refine / gap-fill)
- What-If Branching with MCTS
- Constella FRIENDS DISCOVERY / JOURNALS / COMMENTS
- Reference Management (link to source films / books)
- Revision Tracking with Reasons
- Audio Note Integration
- Comments / Reader Notes
- Comparison View (draft A vs B)
- Read-Aloud / Table Read Mode
- Coverage Generator
- Distraction-Free Writing Mode
- Mobile / Tablet Workflow

### Layer 13 — Production Bridge
- Breakdown Sheets
- Shot List Generation
- Storyboard Integration
- Budget Implication Tagging
- Casting Type Tags
- Location Scouting Hints
- Production Schedule Estimator
- Director-Style Application (.skill)
- Trailer Beat Selector
- Pitch Document Generation

### Layer 14 — Evaluation / CI / Diagnostics
- ConStory-Bench 19-Subtype Auditor
- LLM-as-Judge ASE Suite
- Structural Metrics (arc match, consistency, diversity, tension variance)
- Voice-Differentiation Metric
- Specificity Metric
- Surprise Bandwidth Audit
- Reincorporation Density Audit
- Inter-Rater Reliability Tracking
- A/B Test Infrastructure
- Reading-Time Estimation
- Comparable Film Matching
- Originality Score
- Cliché Density Heatmap
- Demographic Appeal Prediction
- Critical Reception Prediction
- Reference-Film Regression Suite (5-10 corpus films)

### Layer 15 — Ethics / Safety / Provenance
- Multi-Axis Bias Auditor
- Sensitivity Reader Pass
- Cultural Appropriation Detector
- Trauma-Informed Generation
- Mental Health Sensitivity
- Historical Accuracy
- IP / Copyright / Trademark Guard
- Defamation Risk
- Authorship Attribution Logic (line-level provenance)
- WGA-Compliant Disclosure
- AI Content Watermarking
- Confidence-Weighted Outputs
- Failure Transparency

### Layer 16 — Personal Learning
- Per-Writer Style Adaptation (LoRA-per-writer)
- Style Transfer ("write more like my last script")
- Reject-Pattern Mining
- Workflow Pattern Learning
- Genre Mode Detection
- Personal Skill Library
- Few-Shot Personalization
- Active Learning Selection

### Layer 17 — Multi-Author / Collaboration
- Writers' Room Simulation
- Showrunner Mode
- Role-Based Access
- Branch / Merge for Narrative
- Conflict Resolution Between Co-Writers
- Audit Trail

### Layer 18 — Cross-Media / Adaptation
- Novel ↔ Screenplay
- Screenplay ↔ Stage Play
- Screenplay ↔ Game Script
- Screenplay ↔ Comic / Graphic Novel
- Series Bible
- Spin-off / Sequel Logic
- Shared Universe Constraints

### Layer 19 — Live / Interactive
- Interactive Fiction Mode
- Live Improv Support
- Video Game Narrative
- TTRPG Integration
- Streaming Live Generation
- AR/VR Spatial Narrative

### Layer 20 — Pedagogy
- Story-Teaching Mode
- Annotation Layer
- Compare-and-Contrast with Reference Films
- Exercise Generator
- Skill-Tree Tracking
- Mistake Catalog
- Master-Class Mode (.skill application)

### Layer 21 — Operations / Business
- API for Third-Party Integration
- Plugin Architecture
- Marketplace (director profiles, genre packs, etc.)
- Enterprise Mode
- Telemetry & Privacy Controls
- Localization
- Pricing Tiers

### Layer 22 — Autonomous Optimization
- Autoresearch Loop (`narrative_score = w1·C + w2·S − w3·D`)
- Per-Project `prepare.py` immutable Story Bible
- Per-Project `train.py` mutable creative engine
- `program.md` human strategy guide
- Hard-Gate Constraints (Armenian context, Future Son twist for GOOB)
- Automated Experiment Logging

That is the complete inventory across all 22 layers. The archive covers maybe 8 of these layers in depth, mentions 5 more, and ignores 9 entirely. Filling out the missing 14 is the work between "current spec" and "complete engine."

---

## 4. The Quality Operating Principles (Cross-Cutting Upgrades)

Beyond engines, several operating principles need to be embedded across the system. These aren't subsystems; they're disciplines:

### Principle A — Show, Don't Tell, As Hard Constraint
Currently the engine generates prose. Real screenwriting is action-first. Add a hard constraint: per scene, dialogue can convey no more than 40% of the dramatic information. The rest must be in action, environment, behavior, or subtext. Audit per scene.

### Principle B — Specificity Mandate
No generic descriptions. No "she was sad." Every emotional moment grounded in a specific physical or sensory detail.

### Principle C — Mechanism over Sentiment
Drama is mechanism, not declared emotion. Audit every scene: is the feeling produced by the mechanism, or stated by the dialogue? If stated, regenerate.

### Principle D — Every Scene Earns Its Place
McKee's orphan-scene detector as a hard gate. A scene must advance plot, reveal character, build tension, provide relief, set up payoff, or establish world. Otherwise cut.

### Principle E — Subtext is the Default, Not the Decoration
What characters say and what they mean diverge under pressure. SubtextLayer runs *before* the LLM dialogue call, not after.

### Principle F — Causality Over Sequence
"And then" stories are dead. "Because" stories live. Audit causal density per act.

### Principle G — Specificity Over Universality
Universal themes need specific particulars. The more specific the detail, the more universal the resonance. Reject abstract "love wins" themes without specific particulars.

### Principle H — Asymmetric Information Is the Engine of Drama
Most drama comes from someone knowing something someone else doesn't. Audit information asymmetry density per scene.

### Principle I — The Writer Is Always the Director
Every AI decision is overridable. Every output is editable. Every reasoning is inspectable. No black boxes.

### Principle J — Transparent Confidence
Every output ships with a confidence score and the factors behind it.

### Principle K — Honest Failure
When the engine doesn't know how to handle something, it says so instead of degrading silently.

### Principle L — Provenance Always
Every line has a traceable origin. Per-line attribution. Audit-ready.

---

## 5. The Acceptance Contract (Borrowed and Expanded from Synthesis)

Make Synthesis's 3-tier proof kernel into the comprehensive acceptance test contract:

### Tier 1 — Hard Blocks (must pass or the engine refuses to ship a scene)
- TemporalProof: no temporal contradictions (Allen-checked)
- CausalProof: every event has a cause; no orphan effects
- EpistemicProof: no character references information they couldn't know
- MechanismProof: every scene operates a mechanism that advances the central law
- ContinuityProof: world state is internally consistent
- VoiceProof: each character's voice passes blind stylometric attribution
- IntentProof: every character action is traceable to a goal in their DAG

### Tier 2 — Quality Gates (must pass or the scene is flagged for human review)
- EmotionProof: emotional beats are mechanism-driven, not declared
- SubtextProof: every dialogue line passes post-render subtext-preservation validation
- GenericnessProof: TVTropes cosine distance > threshold
- CulturalCausalityProof: cultural / institutional consequences are properly modeled
- AuthorIntentProof: scene serves the declared premise
- SpecificityProof: per-line specificity score above floor
- NecessityProof: scene answers "why now / here / them?"
- ReincorporationProof: setups have payoffs; Act 3 reincorporates Acts 1–2 elements
- SurpriseProof: scene contains at least one micro-surprise
- PolarityProof: every scene has a clear value-charge flip (McKee)

### Tier 3 — Ranking Signals (used to choose among valid candidates)
- ReaderProof: predicted reader-state trajectory matches target
- VoiceConsistencyProof: voice differentiation metric high
- OriginalityProof: low semantic similarity to known films
- RewatchRewardProof: at least one detail rewards a second reading

### Tier 4 — Ethics & Disclosure (continuous monitoring)
- BiasAuditProof: multi-axis representational check
- SensitivityProof: trauma-informed generation, mental health sensitivity
- IPProof: no copyright/trademark/defamation/real-person violations
- AttributionProof: per-line provenance present and accurate
- DisclosureProof: WGA-compliant AI-content disclosure

---

## 6. The Revised Roadmap to True Completeness

The 8-week roadmap in `_BEST_RESEARCH_AND_WHATS_NEXT.md` gets you to a working v1. The path to true completeness is longer. Here it is.

### Phase 1: v1 (Weeks 0–8) — Core Functioning Engine
As documented in `_BEST_RESEARCH_AND_WHATS_NEXT.md` Section 4. End state: a screenplay-generating engine with 6 canonical engines, basic Writer Cockpit, reference-film regression suite passing, costs measured.

### Phase 2: v1.5 (Weeks 9–14) — Quality & Voice Depth
- Specificity Engine
- Voice depth (Speech Acts + Grice + Politeness + verbal tics + register-shifting)
- Dialogue Engine completeness (7 validators wired)
- Sound Design Engine v1 (score + foley + leitmotifs)
- Color Script Engine v1
- Mirror Scene + Reincorporation + Necessity engines
- Improved Specificity Mandate as hard constraint
- Operating principles A–L wired in as audits

### Phase 3: v2 (Weeks 15–22) — Multi-Mode & Production Bridge
- Outline Mode + Treatment Mode + Three-Fidelity Pipeline
- Character Bible / World Bible builders
- Coverage Generator
- Production breakdown sheets
- Shot list generation (DeepShot productionized)
- Director-style application (.skill integration)
- Pitch document generation
- Multi-format output (FDX, Highland, etc.)
- Cross-media adaptation v1 (novel ↔ screenplay)

### Phase 4: v2.5 (Weeks 23–30) — Theory Depth + Theme/Argument
- Egri premise machinery
- Argument Engine (Walton/Toulmin)
- Mythic resonance detector (Propp + ATU + Frye)
- Theme reincorporation audit
- Ironic distance calibrator
- Genre hybrid logic + subgenre conventions
- Era-specific genre overlays
- Multi-timeline solver (multiple chronology modes)
- Plot mode selector (Classical / Mini / Anti)
- Frame-narrative + meta-narrative support

### Phase 5: v3 (Weeks 31–40) — Cognition Depth + Cultural Layer
- Attachment Theory + Vaillant defenses + IFS Parts + somatic markers
- Trauma & Subconscious Layer (V4's Layer −1)
- Habit/procedural memory
- Counterfactual ledger
- Implicit vs explicit belief split
- Multi-axis bias audit
- Sensitivity reader pass
- Cultural appropriation detector
- Historical accuracy layer
- Authentic cultural representation engines

### Phase 6: v3.5 (Weeks 41–48) — Visual / Cinematic / Sound Completeness
- Full Color Script Engine + Light & Shadow + Composition Grammar
- Production Design Semiotics
- Tableau / Stage Picture Engine
- Costume as Character
- Aspect Ratio Engine
- Editing Rhythm Grammar (full)
- Complete Sound Design Engine (foley + ambience + diegetic + acoustic space + voice performance cues)
- Practical vs Digital tagging

### Phase 7: v4 (Weeks 49–56) — Audience Modeling Sophistication
- Demographic-layered audience submodels
- Genre sophistication modeling
- Cultural reference density calibration
- Confusion tolerance modeling
- Re-watch reward detector
- Theory-of-Mind of the reader
- Investment curve / forgiveness budget tracker
- Trigger / sensitivity detection
- Audience-side cliché detector
- Critical reception predictor
- Demographic appeal predictor

### Phase 8: v4.5 (Weeks 57–64) — Personal Learning + Multi-Author
- Per-writer LoRA fine-tuning
- Style transfer
- Reject-pattern mining
- Workflow pattern learning
- Personal skill library
- Active learning
- Writers' Room Simulation
- Showrunner Mode
- Branch / merge for narrative
- Role-based access
- Audit trail

### Phase 9: v5 (Weeks 65–72) — Provenance / Ethics / Transparency
- Multi-axis bias auditor (rigorous)
- Sensitivity reader pass (rigorous)
- Trauma-informed generation
- Mental health sensitivity
- IP/copyright/trademark guards
- Defamation risk scan
- Per-line authorship attribution
- WGA-compliant disclosure metadata
- AI content watermarking
- Confidence-weighted outputs
- Failure transparency
- Reasoning trace UI

### Phase 10: v5.5 (Weeks 73–80) — Interactive / Cross-Media / Pedagogy
- Interactive Fiction mode
- Game-narrative branching
- TTRPG integration
- Live improv support
- Streaming live generation
- Adaptation workflows (novel ↔ stage ↔ game ↔ comic)
- Series Bible maintenance
- Spin-off / sequel logic
- Story-Teaching Mode
- Annotation Layer
- Exercise Generator
- Master-Class Mode

### Phase 11: v6 (Weeks 81–88) — Autonomous Optimization
- Autoresearch loop wrapper around the whole engine
- Per-project `prepare.py` / `train.py` / `program.md` triad
- Composite `narrative_score` as primary metric
- Hard-gate constraint discovery
- Automated experiment logging
- Self-improving prompts

### Phase 12: v6.5+ (Ongoing) — Marketplace, Plugins, Enterprise
- Public API
- Plugin architecture
- Director profile marketplace
- Genre pack marketplace
- Voice profile marketplace
- Theme library marketplace
- Enterprise mode (SSO, audit, security)
- Localization (RTL, CJK, non-Latin)
- Mobile / tablet workflow

That's roughly 90 weeks of work from the current state to true completeness. The point isn't that it needs to be 90 weeks; the point is that the gap between what exists in the archive and what "complete" means is bigger than the archive admits. Knowing the full shape of that gap lets you make honest trade-offs about which slices to ship in which order, and lets you stop pretending v1 is the finish line.

---

## 7. The Completeness Scorecard

Use this to track progress. Score each row 0–10 on coverage; multiply by 10 for percentage.

| Dimension | Current Archive | After v1 | After v3 | After v6 |
|---|---:|---:|---:|---:|
| Character cognition depth | 6 | 7 | 9 | 10 |
| Dialogue engine | 4 | 5 | 7 | 10 |
| Visual / cinematic | 3 | 4 | 6 | 10 |
| Sound design | 1 | 2 | 4 | 10 |
| Pacing / rhythm | 5 | 6 | 8 | 10 |
| Theme / premise / argument | 5 | 6 | 9 | 10 |
| Genre | 5 | 6 | 8 | 10 |
| Audience modeling | 3 | 4 | 7 | 10 |
| Plot structure / modes | 4 | 5 | 7 | 10 |
| Writer workflow / IDE | 4 | 6 | 8 | 10 |
| Production bridge | 1 | 1 | 6 | 10 |
| Evaluation suite | 5 | 6 | 8 | 10 |
| Personal learning | 1 | 2 | 4 | 10 |
| Theoretical foundations | 7 | 7 | 9 | 10 |
| Cultural / ethical / safety | 2 | 3 | 6 | 10 |
| AI honesty / transparency | 1 | 3 | 5 | 10 |
| Multi-author / collab | 2 | 2 | 4 | 10 |
| Cross-media / adaptation | 2 | 2 | 4 | 10 |
| Live / interactive | 1 | 1 | 2 | 9 |
| Pedagogy | 0 | 0 | 2 | 8 |
| Operations / business | 1 | 2 | 4 | 9 |
| Specificity / craft principles | 3 | 6 | 8 | 10 |
| Reincorporation / mirror / surprise | 2 | 4 | 8 | 10 |
| "Why now/here/them?" necessity | 1 | 4 | 8 | 10 |
| Autonomous optimization | 1 | 1 | 2 | 10 |
| **Total / 250** | **70/250 (28%)** | **94/250 (38%)** | **152/250 (61%)** | **246/250 (98%)** |

The archive scores **28% on full completeness**. After v1 you're at 38%. After v3 (about 8 months in) you're at 61%. True completeness (98%) takes about 90 weeks.

That's the honest answer. Most software is 38% complete and ships. Some becomes 61% complete and dominates. The 98% complete version is the cinematic-OS-of-the-future version — the one no one has built and that, if built, would not have meaningful competition.

---

## 8. The Single Most Important Upgrade to Ship First

If you do nothing else from this document, do this:

**Implement the Specificity Engine in Week 0.**

It's the cheapest, smallest engine. It's the biggest quality lever. Every other engine's output is degraded by generic language. Every other engine's output is multiplied by specific language. The Specificity Engine is a per-line embedding-based audit that scores how close a line is to a generic cluster and rejects anything too close, with a mandate to regenerate with concrete detail.

Estimated build time: **4 hours.**
Estimated quality impact: **larger than any other single engine in the archive.**

Every reverse-engineering in the .docx track is, fundamentally, an analysis of *specificity*. The reason memorable films land isn't that they have a wound, false dream, companion, and reveal — most films have those. It's that the wound is a *specific* promise scribbled in a *specific* keepsake. It's that the companion is a *specific* over-eager outsider with a *specific* missing credential. It's that the reveal is *specifically* an unspoken object rather than an explanation.

The engine the archive describes will work without the Specificity Engine. It will produce mechanically-sound, structurally-correct, and emotionally generic screenplays. With the Specificity Engine, it produces screenplays that feel written by a specific person about specific people in a specific world.

Build that first.

---

## 9. The Closing Thought

The archive's defining sentence (from Sonnet, restated everywhere):

> "*A beat-sequenced, intervention-limited drama manager guiding a deception-capable multi-agent social simulation, with a provenance-rich, syuzhet-reconstructed screenplay-harvesting pipeline.*"

That sentence describes about 38% of a complete screenwriting engine. The other 62% lives in this document — depth in cognition, dialogue, visual, sound, pacing, theme, genre, audience modeling, plot modes, workflow, production bridge, evaluation, learning, foundations, ethics, collaboration, adaptation, interactivity, pedagogy, operations, specificity, reincorporation, necessity, and autonomous optimization.

Complete means a writer can use the engine to do every job they currently do across every medium they currently work in, with rigorous protection against the most common AI failure modes, with full transparency and provenance, with audit-grade ethics, with personalization that improves over time, and with a quality ceiling defined by the best human screenwriters' work rather than by the engine's architectural choices.

That's the destination. The current state is not failing — it's at 28% with a clear path to 98%. Ship v1, then start working through the layers in order, then run the autoresearch loop on the whole thing, and somewhere around month 24 you have what nobody else does.

*Read this with `_SENSE_OF_THE_RESEARCH.md` and `_BEST_RESEARCH_AND_WHATS_NEXT.md`. Together they describe what's in the archive, what's best in it, and what's needed to complete it.*
