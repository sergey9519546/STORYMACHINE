// Wave 137 — Pass 10: Originality
// Checks for clichés, generic scene descriptions, and predictable outcomes.
// Wave 137 additions: emotion-naming in action lines (show-don't-tell violation).
// Wave 149 additions: arc predictability (resolution telegraphed too early),
// character introduction clichés, and sensory monotone (scenes lacking
// concrete sensory grounding).
// Wave 163 additions: scene purpose monotone in Act 3 (no functional variety in
// the final act), reaction shot overuse (>30% of action lines are terse reactions),
// and emotional arc plateau (all scenes neutral — no emotional peaks or valleys).
// Wave 259 additions: copula action dominance (linking-verb staging), filtering-
// verb overuse (perception framing), and directorial intrusion (camera/shot calls).
// Wave 273 additions: exclamation in action (editorial excitement in stage directions),
// parenthetical flood (>30% of dialogue lines are acting wrench directions),
// location repetition (>70% of sluglines use the same location).
// Wave 287 additions: opening wake-up cliché (first scene shows a character waking up),
// dialogue exclamation flood (>25% of dialogue lines end with !),
// slug interior dominance (>85% of sluglines are INT. — no exterior world).
// Wave 301 additions: mirror self-gaze cliché (mirror introspection in 2+ scenes),
// weather opener crutch (3+ scenes open on weather as mood shorthand),
// just-a-dream reveal (events dismissed as "only a dream").
// Wave 315 additions: body language cliché overuse (>20% of action lines use stock
// gestures like nods/shrugs/sighs/grins), slug generic location (>60% of sluglines
// use placeholder names like ROOM/OFFICE/STREET), flashback crutch (≥4 explicit
// flashback transition markers).
// Wave 326 additions: montage crutch (≥2 montage markers — dramatized struggle skipped),
// title card crutch (≥3 SUPER:/TITLE:/CHYRON: on-screen text cards), time card crutch
// (≥3 standalone time-jump captions like "THREE WEEKS LATER"/"MEANWHILE").
// Wave 340 additions: voiceover crutch (≥4 (V.O.) cues — story narrated rather than
// dramatized), beat direction overuse (≥4 standalone "(beat)" parentheticals — the
// single most overused stage direction), smash cut overuse (≥3 dramatic cut transitions
// like "SMASH CUT TO:"/"HARD CUT TO:" — directorial punctuation leaned on for impact).
// Wave 354 additions: fade transition overuse (≥4 FADE/DISSOLVE soft transitions),
// dream sequence crutch (≥2 labeled dream/fantasy sequences), intercut overuse (≥3
// "INTERCUT" markers — cross-cutting to manufacture momentum scenes lack).
// Wave 368 additions: off-screen cue overuse (≥4 (O.S.)/(O.C.) cues — voices from
// off-frame leaned on instead of staging the speaker), continuous slug overuse (≥3
// sluglines ending in CONTINUOUS/MOMENTS LATER/SAME/LATER — one scene chopped into
// fragments), back-to-scene crutch (≥2 "BACK TO SCENE"/"RESUME SCENE" return markers —
// the script keeps stepping out of its own timeline).
// Wave 382 additions: chapter label crutch (≥3 "CHAPTER ONE"/"PART TWO" segment headings —
// novelistic structure imposed on film), split-screen crutch (≥2 "SPLIT SCREEN" markers —
// a gimmick leaned on for parallelism), match-cut overuse (≥3 "MATCH CUT TO" transitions —
// directorial editing punctuation the writer should not be calling).
// Wave 396 additions: revelation purpose monotone (≥3 revelation scenes all sharing the same
// dramatic purpose — formulaic deployment of disclosure), dialogue short-line dominance
// (≥75% of dialogue lines are ≤4 words — uniformly telegraphic register with no length
// variation), dialogue question drought (<5% of dialogue lines are interrogative — characters
// never ask each other anything, flattening dramatic pressure).
// Wave 410 additions: slow-motion crutch (≥2 "SLOW MOTION"/"SLO-MO" markers — gravity
// outsourced to a speed effect the staging should earn), freeze-frame crutch (≥2 "FREEZE
// FRAME"/"FREEZE ON" markers — a held image leaned on for emphasis), sound-cue crutch (≥3
// hard-coded "SFX:"/"SOUND:" labels — the writer scoring the sound design instead of letting
// the prose imply it). Each is a distinct device crutch not covered by SMASH_CUT_OVERUSE
// (hard/jump/match cuts), DIRECTORIAL_INTRUSION (camera/lens calls, "WE HEAR"), or the card
// crutches (on-screen text/time captions).
// Wave 424 additions: insert shot crutch (≥3 "INSERT:" label lines — directorial close-up
// call left in the action prose rather than folded into the narrative; distinct from
// DIRECTORIAL_INTRUSION which targets camera/lens calls inside action blocks), ellipsis
// action overuse (>20% of action lines contain "..." — stage directions that trail off
// instead of completing the image; underweight/bloat mode), action adverb flood (>25% of
// action lines carry a manner adverb like "slowly"/"quietly"/"suddenly" — substituting
// description for specific concrete action; distinct from body language clichés and reaction
// shot overuse which target specific gesture patterns).
// Wave 452 additions: dialogue ellipsis flood (>20% of dialogue lines end with "..." —
// characters trail off instead of completing thoughts; underweight/bloat × dialogue ×
// trailing-off punctuation, distinct from ELLIPSIS_ACTION_OVERUSE which audits action),
// slug time monotone (>80% of time-tagged sluglines use the same time-of-day label —
// story plays out in one lighting condition; underweight/bloat × slugline × time-of-day),
// dialogue filler opener (≥4 speeches begin with "Well,", "Look,", "Listen,", "Actually,"
// etc. — verbal hedges that delay the first direct word; count threshold × dialogue ×
// opening word, first check targeting the opening word of each character speech).
// Wave 438 additions: passive verb dominance (>25% of action lines use passive construction
// like "is seen"/"are found"/"can be heard" — passive voice removes agency from the visual
// description and distances the reader; underweight/bloat × action prose × verb form, distinct
// from COPULA_ACTION_DOMINANCE which targets linking-verb state predicates, not passive voice),
// dialogue monologue drought (<5% of dialogue lines are >15 words while ≥12 dialogue lines
// exist — no extended speeches or full arguments, the register is uniformly telegraphic;
// underweight/bloat × dialogue × length distribution, distinct from DIALOGUE_SHORT_LINE_
// DOMINANCE which measures what percent are ≤4 words, not whether any are long), action
// question intrusion (≥3 action lines contain a question mark — the writer inserts authorial
// questions into stage directions instead of presenting images; count threshold × action layer
// × discourse mode, distinct from DIALOGUE_QUESTION_DROUGHT which audits the dialogue layer).
// Wave 466 additions: action pronoun opener flood (>50% of ≥8 action paragraphs open with "He"
// or "She" — monotone visual grammar where every block begins with the character agent rather
// than image, object, or environment; distribution/timing × action prose × paragraph opener,
// first check on block-opening distribution), dialogue question flood (>35% of ≥10 dialogue
// lines end with "?" — characters never assert, only ask; underweight/bloat × dialogue ×
// interrogative register, opposite pole of DIALOGUE_QUESTION_DROUGHT), ellipsis run action
// (≥3 consecutive action lines ending with "..." — a run of trailing-off stage directions;
// run-based × action prose × ellipsis, distinct from ELLIPSIS_ACTION_OVERUSE which measures
// proportion not consecutive run length).
// Wave 480 additions: dialogue filler run (≥3 consecutive dialogue speeches each opening with
// a verbal hedge like "Well," or "Look," — filler bunched into an unbroken sequence rather
// than scattered; run-based × dialogue × filler opener, consecutive-run variant of
// DIALOGUE_FILLER_OPENER which counts total not runs), action average line brevity (≥8 action
// lines averaging ≤4 words each — the prose layer is collectively telegraphic shorthand with
// no image construction; average/aggregate × action prose × word length, first average/aggregate
// check in originality.ts), action peak paragraph (≥4 action paragraphs, peak ≥5× average and
// ≥40 words — one sprawling over-written set piece surrounded by sparse prose; single-peak
// isolation × action prose × paragraph length, first single-peak isolation check in
// originality.ts).
// Wave 494 additions: dialogue question run (≥4 consecutive dialogue speeches each ending with
// "?" — a rapid-fire exchange where nobody answers anything; run-based × dialogue × question
// punctuation, distinct from DIALOGUE_QUESTION_FLOOD which audits proportion and DIALOGUE_
// FILLER_RUN which audits opener word), dialogue short run (≥5 consecutive dialogue speeches
// each ≤3 words total — staccato burst of pure one-liners draining character voice; run-based ×
// dialogue × speech brevity, distinct from DIALOGUE_SHORT_LINE_DOMINANCE which uses global
// proportion), dialogue speaker solo (one character delivers >60% of all dialogue lines while
// ≥3 speakers and ≥10 dialogue lines exist — monologue dominance; underweight/bloat × dialogue
// × speaker distribution, first per-speaker distribution check in originality.ts).
// Wave 508 additions: dialogue same-speaker run (run-based × dialogue × speaker alternation —
// ≥5 consecutive speeches by the same speaker while ≥3 speakers and ≥12 total lines exist; a
// local monologue within an apparently multi-character exchange; distinct from DIALOGUE_SPEAKER_
// SOLO which measures global share and DIALOGUE_SHORT_RUN/FILLER_RUN which measure content not
// speaker identity), action then-opener flood (underweight/bloat × action prose × temporal
// sequential opener — >25% of ≥8 action lines begin with "Then "; the writer narrates a
// sequence instead of presenting images; distinct from ACTION_PRONOUN_OPENER_FLOOD, GERUND_
// OPENER_DOMINANCE, and all other opener-pattern checks), dialogue wish statement flood
// (underweight/bloat × dialogue × counterfactual/regret register — >20% of ≥8 dialogue lines
// contain wish/if-only/should-have counterfactual language; characters speak in backward-looking
// regret rather than present-tense confrontation; distinct from PRESENT_PERFECT_FLOOD which
// measures past tense broadly and FUTURE_TENSE_FLOOD which measures forward projection).
// Wave 550 additions: parenthetical flood (underweight/bloat × parenthetical × per-speech density —
// >35% of ≥8 character speeches are followed immediately by a parenthetical direction; the script
// over-directs every performance beat, removing interpretive space from the actor and reader;
// distinct from all existing dialogue content checks which target the spoken text itself and from
// all action-line checks; first check in this pass targeting parenthetical lines), dialogue long
// speech flood (underweight/bloat × dialogue × speech length — >30% of ≥8 dialogue lines contain
// >15 words; the dialogue is verbose and monologue-heavy, the opposite extreme from DIALOGUE_SHORT_
// SPEECH_FLOOD; first check targeting excessive dialogue line length in this pass), action adverb
// flood (underweight/bloat × action × adverb density — >35% of ≥8 action lines contain at least
// one "-ly" adverb; over-modified action prose where the writer tells rather than shows through
// the adverb; distinct from PASSIVE_VERB_DOMINANCE [passive verb construction] and ACTION_PRONOUN_
// OPENER_FLOOD [opener position]; first adverb-density check on action lines).
// Wave 536 additions: dialogue negative imperative flood (underweight/bloat × dialogue × negative
// command register — >20% of ≥8 dialogue lines open with a prohibition or negative imperative:
// "don't," "never," "stop," "can't you," "won't you," "you can't," "you don't," "do not," "no
// more"; characters communicate through refusal and denial at the expense of assertive, relational,
// or exploratory registers; distinct from DIALOGUE_COMMAND_FLOOD which targets positive imperatives
// and from DIALOGUE_HEDGING_FLOOD which targets uncertainty vocabulary), dialogue exclamation run
// (run-based × dialogue × exclamation endings — ≥4 consecutive dialogue lines each ending with
// "!"; a sustained exclamatory streak that drains emphasis; distinct from DIALOGUE_QUESTION_RUN
// [question endings], DIALOGUE_AGREEMENT_RUN [agreement openers], DIALOGUE_FILLER_RUN [filler
// openers], and DIALOGUE_SAME_SPEAKER_RUN [speaker repetition]), dialogue short speech flood
// (underweight/bloat × dialogue × speech length — >60% of ≥8 dialogue lines contain ≤3 words;
// characters communicate in fragments — one-word, two-word, or three-word utterances — without
// substantive expression; distinct from ONE_WORD_LINE_DOMINANCE in dialogue.ts which uses a 35%
// threshold for single-word lines, since this extends the threshold to ≤3 words at a 60% rate).
// Wave 578 additions: slug same-location run (run-based × slug × consecutive same base location —
// ≥8 sluglines, max consecutive identical base location run ≥5; distinct from LOCATION_REPETITION
// [global proportion] and SLUG_INT_EXT_MONOTONE [interior/exterior register axis]), action present-
// continuous flood (underweight/bloat × action prose × continuous-progressive aspect — ≥8 action
// lines, >25% use "is/are/was/were + gerund"; distinct from PASSIVE_VERB_DOMINANCE [passive voice]
// and COPULA_ACTION_DOMINANCE [linking-verb state predicates]), dialogue backstory opener flood
// (underweight/bloat × dialogue × past-temporal exposition openers — ≥8 dialogue lines, >20%
// open with "years ago"/"back then"/"when I was"/etc.; distinct from DIALOGUE_WISH_STATEMENT_FLOOD
// [regret-counterfactual register] and DIALOGUE_FILLER_OPENER [non-temporal hedges]).
// Wave 564 additions: slug INT/EXT monotone (distribution/monotony × scene heading × interior/
// exterior register — ≥8 classifiable slugs, zero mixed INT/EXT slugs, dominant register >90%; the
// story unfolds in one spatial mode; distinct from SCENE_SLUG_TIME_MONOTONE [time-of-day axis],
// LOCATION_REPETITION [named place], and CONTINUOUS_SLUG_OVERUSE [CONTINUOUS tag]), dialogue em-dash
// interruption flood (underweight/bloat × dialogue × trailing interruption dash — ≥8 dialogue lines,
// >30% end with "—" or "--"; interruption becomes a tic that makes every exchange frantic; distinct
// from DIALOGUE_ELLIPSIS_FLOOD [trailing "..." — soft trail-off vs hard cut-off], DIALOGUE_
// EXCLAMATION_FLOOD [trailing "!"], and all opener-position dialogue checks), action polysyndeton
// flood (underweight/bloat × action × internal "and"-clause chaining — ≥8 action lines, >20% contain
// ≥2 standalone "and" conjunctions; run-on action with no internal hierarchy; distinct from OPENING_
// CONJUNCTION_OVERUSE and ACTION_THEN_OPENER_FLOOD [opener-position single conjunctions] and ACTION_
// OPENER_MONOTONY [repeated first word], targeting INTERNAL coordination density instead).
// Wave 522 additions: dialogue hedging flood (underweight/bloat × dialogue × uncertainty register —
// >25% of ≥8 dialogue lines contain hedging/uncertainty vocabulary: "maybe," "perhaps," "I think,"
// "I guess," "probably," "possibly," "sort of," "kind of," "apparently," "might be," "seem to";
// characters never commit to a position; distinct from DIALOGUE_WISH_STATEMENT_FLOOD which targets
// backward regret, DIALOGUE_FILLER_OPENER which targets non-committal openers, and DIALOGUE_I_
// DOMINANCE which targets personal pronoun count), dialogue agreement run (run-based × dialogue ×
// affirmation openers — ≥4 consecutive dialogue lines opening with agreement words "yes," "right,"
// "okay," "sure," "of course," "absolutely," "exactly," "fine," "i agree," "i know"; characters
// only affirm each other without conflict; distinct from DIALOGUE_FILLER_RUN, DIALOGUE_QUESTION_RUN,
// and DIALOGUE_SAME_SPEAKER_RUN which target different patterns), dialogue command flood
// (underweight/bloat × dialogue × imperative register — >25% of ≥8 dialogue lines begin with a
// strong command verb "go," "stop," "come," "get," "take," "give," "look," "leave," "run," "find,"
// "listen," "turn," "move," "wait," "stay," "tell," "show," "put," "open," "close," "help,"
// "bring," "hold," "let's"; characters only issue orders, no emotional or exploratory register;
// distinct from DIALOGUE_HEDGING_FLOOD which targets uncertainty, DIALOGUE_QUESTION_FLOOD which
// targets questions, and all action-line opener checks which target non-dialogue text).
// Wave 592 additions: dramatic turn zone cluster (distribution/timing × dramaticTurn presence ×
// structural thirds — n≥9, ≥3 dramatic-turn scenes [dramaticTurn !== 'nothing'], >75% in a single
// third; the story's pivots are predictably ghettoized into one zone rather than spread across the
// structure — the audience learns which third to expect a turn in; first check in this pass to
// touch the dramaticTurn signal at all, distinct from every other zone-cluster-style check in this
// file which operates on lexical/textual signals rather than per-scene structural records), purpose
// consecutive run (run-based × purpose — ≥4 consecutive scenes share the identical purpose value;
// a local, position-independent repetition distinct from UNIFORM_SCENE_PURPOSES [global aggregate:
// ≤2 distinct purposes across the whole script] and PURPOSE_BOOKEND_REPEAT [compares Act 1's vs
// Act 3's dominant purpose] and REVELATION_PURPOSE_MONOTONE [filters to revelation scenes only];
// first run-based check on the purpose channel in this pass), scene closer ellipsis flood
// (positional/distribution × the last line of each scene — ≥50% of scenes [n≥6] end their final
// non-blank line in an ellipsis; every scene trails off the same way, so the audience learns to
// expect the same rhythmic exit beat before it arrives; distinct from ELLIPSIS_OVERUSE [any-position
// frequency across all action lines] and DIALOGUE_ELLIPSIS_FLOOD [any-position frequency across all
// dialogue lines] — this is the first check in this pass to isolate a fixed STRUCTURAL POSITION
// within each scene, the closer, mirroring the extensive existing opener-position coverage but for
// the opposite end of the scene).
// Wave 606 additions (built on the shared checks library, audit M2.2): CLOCK_RAISED_ZONE_CLUSTER
// (distribution/timing × clockRaised × structural thirds — first use of clockRaised anywhere in
// this 105-rule pass), OPEN_THREAD_CURIOSITY_DECOUPLED (co-occurrence/decoupling ×
// unresolvedClues × curiosityDelta — first use of either field in this pass), SCENE_STAGING_
// ZONE_IMBALANCE (underweight/bloat × visualBeats × four structural zones — first use of
// visualBeats anywhere in this pass).
// Wave 620 additions (built on the shared checks library, audit M2.2, plus one hand-rolled
// average/aggregate check): PAYOFF_PLACEMENT_ZONE_IMBALANCE (underweight/bloat × payoffSetupIds ×
// four structural zones — first use of payoffSetupIds anywhere in this 108-rule pass),
// SEED_TURN_DECOUPLED (co-occurrence/decoupling × seededClueIds × dramaticTurn — first use of
// seededClueIds anywhere in this pass), CLOCK_DELTA_FLATLINE (average/aggregate × clockDelta
// variety — first use of clockDelta anywhere in this pass).
// Wave 634 additions (built on the shared checks library, audit M2.2): ORIGINALITY_HIGHLIGHT_
// STAGING_DECOUPLED (co-occurrence/decoupling × dialogueHighlights × visualBeats — first pairing
// of these two fields in this 111-rule pass), ORIGINALITY_OPEN_THREAD_HIGHLIGHT_AFTERMATH_VOID
// (sequence/aftermath × heavy unresolvedClues debt trigger → dialogueHighlights absence — first
// pairing of these two fields), ORIGINALITY_SEED_ZONE_IMBALANCE (underweight/bloat ×
// seededClueIds × four structural zones — Wave 606/620 applied this template to visualBeats and
// payoffSetupIds; seededClueIds itself has never been zone-audited here).
// Wave 648 additions (built on the shared checks library, audit M2.2): ORIGINALITY_RELATIONSHIP_
// PEAK_UNCAUSED (single-peak isolation/backward-cause × relationshipShifts-count magnitude —
// first checkPeakUncaused use in this 114-rule pass; relationshipShifts had only ever appeared
// inside a debug reporting string [Wave 260-era], never as a per-scene signal — the scene with the
// most simultaneous bond changes has no dramatic turn or revelation in itself or the two scenes
// before it, so the story's densest relational moment arrives as a learnable, uncaused spike),
// ORIGINALITY_REVELATION_DROUGHT_RUN (run-based × revelation presence — first checkDroughtRun use
// in this pass; a 6+ consecutive-scene stretch with no revelation at all while revelations occur
// ≥3 times elsewhere — distinct from the pre-existing Wave 396 revelation filter, which compares
// `r.revelation === true` against a string|null field and therefore never actually matches; this
// is the pass's first functioning revelation-presence check), ORIGINALITY_PAYOFF_CURIOSITY_
// DECOUPLED (co-occurrence/decoupling × payoffSetupIds × curiosityDelta>0 — zero overlap between
// thread-resolution scenes and scenes where curiosity is actively rising; payoffSetupIds had only
// been zone- and co-occurrence-audited against dramaticTurn, never against the curiosity channel —
// a resolution scene that also reopens curiosity would itself be a less-predictable beat).
// Wave 662 additions (built on the shared checks library, audit M2.2): ORIGINALITY_HIGHLIGHT_PEAK_
// UNCAUSED (single-peak isolation/backward-cause × dialogueHighlights magnitude — the scene with
// the single densest count of highlighted lines has no dramatic turn or revelation in itself or
// the two scenes before it; first application of the peak-uncaused mode to the dialogueHighlights
// channel in this 117-rule pass), ORIGINALITY_SEED_DROUGHT_RUN (run-based × seededClueIds absence
// — a 6+ consecutive-scene stretch with no clue seeded at all while seeding occurs ≥3 times
// elsewhere; PURPOSE_CONSECUTIVE_RUN is this pass's only prior run-based check and tracks a
// different field entirely via hand-rolled logic, not the shared checkDroughtRun helper),
// ORIGINALITY_PAYOFF_ZONE_CLUSTER (distribution/timing × payoffSetupIds × structural thirds —
// this pass already applies the zone-cluster template to dramaticTurn and clockRaised;
// payoffSetupIds itself has never been cluster-audited here — a predictable, front- or
// back-loaded resolution rhythm is itself a learnable pattern).
// Wave 676 additions (built on the shared checks library, audit M2.2): ORIGINALITY_OPEN_THREAD_
// DROUGHT_RUN (run-based × unresolvedClues absence — unresolvedClues has only ever anchored
// OPEN_THREAD_CURIOSITY_DECOUPLED; the drought-run mode applied to this channel for the first
// time — a long, predictable stretch where no mystery is ever left dangling), ORIGINALITY_
// STAGING_ZONE_CLUSTER (distribution/timing × visualBeats × structural thirds — Wave 606's
// SCENE_STAGING_ZONE_IMBALANCE uses the four-zone bloat/empty template; this is a three-zone
// concentration measure on the same field, catching skew even when no zone is empty),
// ORIGINALITY_PAYOFF_PEAK_UNCAUSED (single-peak isolation/backward-cause × payoffSetupIds
// magnitude — Wave 662 applied the zone-cluster mode to payoffSetupIds; this applies the
// backward-cause peak mode to the same channel, a genuinely different question).
// Wave 690 additions (built on the shared checks library): ORIGINALITY_PAYOFF_DROUGHT_RUN
// (run-based × payoffSetupIds absence — Waves 648/662/676 applied co-occurrence-decoupling,
// zone-cluster, and backward-cause peak modes to payoffSetupIds; the run-based drought mode has
// never been applied to it, completing the field's coverage), ORIGINALITY_CLOCK_DROUGHT_RUN
// (run-based × clockRaised absence — Wave 606's CLOCK_RAISED_ZONE_CLUSTER applied the
// distribution/timing mode to this channel; the run-based drought mode has never been applied to
// it), ORIGINALITY_HIGHLIGHT_ZONE_CLUSTER (distribution/timing × dialogueHighlights × structural
// thirds — Wave 662 applied the backward-cause peak mode to dialogueHighlights; the zone-cluster
// mode has never been applied to this channel — a predictable, front- or back-loaded distribution
// of the story's most memorable dialogue is itself a learnable pattern).
// Wave 704 additions (built on the shared checks library): ORIGINALITY_HIGHLIGHT_DROUGHT_RUN
// (run-based × dialogueHighlights absence — Wave 662 applied the backward-cause peak mode and
// Wave 690 applied the zone-cluster mode to this channel; the drought-run mode has never been
// applied to it, completing the field's coverage), ORIGINALITY_SEED_ZONE_CLUSTER (distribution/
// timing × seededClueIds × structural thirds — Wave 662 applied the drought-run mode to
// seededClueIds; the zone-cluster mode has never been applied to this channel — a predictable,
// front- or back-loaded distribution of foreshadowing is itself a learnable pattern),
// ORIGINALITY_STAGING_PEAK_UNCAUSED (single-peak isolation/backward-cause × visualBeats magnitude
// — Wave 676 applied the zone-cluster mode to visualBeats; the backward-cause peak mode has never
// been applied to it — a learnable, causally unmotivated spike in the story's most heavily staged
// scene is itself a predictable pattern).
// Wave 718 additions (built on the shared checks library): ORIGINALITY_SEED_PEAK_UNCAUSED
// (single-peak isolation/backward-cause × seededClueIds magnitude — Waves 662/704 applied the
// drought-run and zone-cluster modes to seededClueIds; the backward-cause peak mode has never
// been applied to it, completing the trio), ORIGINALITY_STAGING_DROUGHT_RUN (run-based ×
// visualBeats absence — Waves 676/704 applied the zone-cluster and backward-cause peak modes to
// visualBeats; the drought-run mode has never been applied to it, completing the trio — a
// learnable stretch where nothing is ever physically staged is itself a predictable pattern),
// ORIGINALITY_RELATIONSHIP_ZONE_CLUSTER (distribution/timing × relationshipShifts × structural
// thirds — Wave 648 applied the backward-cause peak mode to relationshipShifts; the zone-cluster
// mode has never been applied to it — a predictable, front- or back-loaded distribution of
// relational movement is itself a learnable pattern).
// Wave 732 additions: ORIGINALITY_RELATIONSHIP_DROUGHT_RUN (run-based × relationshipShifts
// absence — Waves 648/718 applied the backward-cause peak and zone-cluster modes to
// relationshipShifts; the drought-run mode has never been applied to it, completing the trio — a
// long unbroken stretch where bonds never move is itself a predictable, learnable pattern),
// ORIGINALITY_REVELATION_ZONE_CLUSTER (distribution/timing × revelation × structural thirds —
// Wave 648 applied the run-based drought mode to revelation != null; the zone-cluster mode has
// never been applied to it — a predictable, front- or back-loaded distribution of disclosures is
// itself a learnable pattern), ORIGINALITY_OPEN_THREAD_PEAK_UNCAUSED (single-peak
// isolation/backward-cause × unresolvedClues magnitude — Wave 676 applied the run-based drought
// mode to unresolvedClues; the backward-cause peak mode has never been applied to it — an
// uncaused spike in accumulated open-thread debt is itself a predictable pattern).
// Wave 746 additions: ORIGINALITY_OPEN_THREAD_ZONE_CLUSTER (distribution/timing ×
// unresolvedClues × structural thirds — Waves 676/732 applied the run-based drought and
// backward-cause peak modes to unresolvedClues; the zone-cluster mode has never been applied to
// it, completing the trio — a predictable, front- or back-loaded distribution of open-thread
// debt is itself a learnable pattern), ORIGINALITY_TURN_DROUGHT_RUN (run-based × dramaticTurn
// !== 'nothing' absence — dramaticTurn has only ever anchored a co-occurrence/decoupling check
// and served as a hasCause predicate elsewhere in this pass; the run-based drought mode has never
// been applied to it as a primary signal — a long unbroken stretch with no dramatic turn at all
// is itself a predictable pattern the audience can anticipate), ORIGINALITY_STAKES_ZONE_CLUSTER
// (distribution/timing × purpose === 'raise_stakes' × structural thirds — purpose has never
// anchored any of the three shared-library modes in this pass; a predictable, front- or
// back-loaded distribution of stakes-raising scenes is itself a learnable pattern).
// Wave 760 additions: ORIGINALITY_REVELATION_PEAK_UNCAUSED (single-peak isolation/backward-cause
// × revelation magnitude — ORIGINALITY_REVELATION_DROUGHT_RUN and ORIGINALITY_REVELATION_ZONE_
// CLUSTER applied the run-based drought and zone-cluster modes to revelation != null; the
// backward-cause peak mode has never been applied to it, completing the trio — this check's
// hasCause deliberately references only dramaticTurn, not revelation itself, to avoid a circular
// audit of the revelation channel; an uncaused disclosure is itself a predictable pattern),
// ORIGINALITY_STAKES_DROUGHT_RUN (run-based × purpose === 'raise_stakes' absence — Wave 746
// applied the zone-cluster mode to this signal; the drought-run mode has never been applied to it
// — a long unbroken stretch with the stakes never rising is itself a predictable pattern),
// ORIGINALITY_CLOCK_DELTA_DROUGHT_RUN (run-based × clockDelta≠0 absence — clockDelta has only
// ever anchored an average/aggregate variety check [CLOCK_DELTA_FLATLINE]; the run-based drought
// mode has never been applied to it — a long unbroken stretch with the clock never moving is
// itself a predictable pattern).
// Wave 774 additions: ORIGINALITY_CLOCK_DELTA_PEAK_UNCAUSED (backward-cause ×
// clockDelta-as-magnitude × 2-scene lookback — Wave 760 applied the run-based drought mode to
// clockDelta; the backward-cause peak mode has never been applied to it — a clock's single
// sharpest tightening arriving with no dramatic turn or revelation preparing it is itself a
// predictable, uncaused pattern), ORIGINALITY_CLOCK_DELTA_ZONE_CLUSTER (distribution/timing ×
// clockDelta≠0 presence × structural thirds — completing the trio started by CLOCK_DELTA_FLATLINE
// [average/aggregate] and ORIGINALITY_CLOCK_DELTA_DROUGHT_RUN [Wave 760, run-based]; the
// zone-cluster mode has never been applied to it — every clock movement concentrated in one
// structural third is itself a predictable pattern), ORIGINALITY_SUSPENSE_ZONE_CLUSTER
// (distribution/timing × suspenseDelta>0 presence × structural thirds — suspenseDelta has only
// ever served as one component of the SCENE_SHAPE_TEMPLATING structural-signature check and as a
// secondary "isB" in co-occurrence-decoupling checks in this pass; none of the three
// shared-library trio modes has ever been applied to it as a primary signal — every suspense
// spike concentrated in one structural third is itself a predictable pattern).
// Wave 788 additions: ORIGINALITY_SUSPENSE_DROUGHT_RUN (run-based × suspenseDelta>0 absence — Wave
// 774 applied the zone-cluster mode to suspenseDelta; the run-based drought mode has never been
// applied to it — a long unbroken stretch of flatlined tension is itself a predictable pattern),
// ORIGINALITY_CURIOSITY_ZONE_CLUSTER (distribution/timing × curiosityDelta>0 presence ×
// structural thirds — curiosityDelta has only ever anchored aftermath/decoupling checks in this
// pass; none of the three shared-library trio modes has ever been applied to it — every curiosity
// spike concentrated in one structural third is itself a predictable pattern),
// ORIGINALITY_EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift !== 'neutral' presence ×
// structural thirds — emotionalShift has only ever anchored an average/aggregate tonal check in
// this pass; none of the three shared-library trio modes has ever been applied to it — every
// emotional beat concentrated in one structural third is itself a predictable pattern).
// Wave 802 additions: ORIGINALITY_SUSPENSE_PEAK_UNCAUSED (backward-cause × suspenseDelta-as-
// magnitude × 2-scene lookback — completes the trio for suspenseDelta alongside the zone-cluster
// mode (Wave 774) and the run-based drought mode (Wave 788); a suspense peak with no preparing
// cause is itself a predictable, learnable pattern), ORIGINALITY_CURIOSITY_DROUGHT_RUN
// (run-based × curiosityDelta>0 absence — Wave 788 applied the zone-cluster mode to
// curiosityDelta; the run-based drought mode has never been applied to it — a long unbroken
// stretch with no fresh question is itself a predictable pattern), ORIGINALITY_EMOTION_
// DROUGHT_RUN (run-based × emotionalShift !== 'neutral' absence — Wave 788 applied the
// zone-cluster mode to emotionalShift; the drought-run mode has never been applied to it,
// completing 2 of 3 slots for this categorical field — a long emotionally flat stretch is itself
// a predictable pattern). Reconnaissance for this wave also confirmed the pre-existing
// DRAMATIC_TURN_ZONE_CLUSTER (Wave 592, hand-rolled) already completes the dramaticTurn trio
// alongside ORIGINALITY_TURN_DROUGHT_RUN, so dramaticTurn was correctly skipped as a non-distinct
// candidate.

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';
import { checkZoneCluster, checkCoOccurrenceDecoupled, checkZoneImbalance, checkAftermathVoid, checkPeakUncaused, checkDroughtRun, FOUR_ZONE_NAMES } from './lib/checks.ts';
import { GENRE_MODIFIERS } from '../../../lib/genre-router.ts';
import type { StoryGenre } from '../../../engine/types.ts';

// ── Cliché phrase library ─────────────────────────────────────────────────────
const CLICHE_PHRASES = [
  // Dialogue clichés
  'we need to talk', 'it\'s not what it looks like', 'i can explain',
  'you don\'t understand', 'we\'re not so different', 'i had no choice',
  'you were always the strong one', 'i never meant to hurt you',
  'this changes everything', 'over my dead body',
  'we can get through this', 'it was never meant to be',
  'i was just doing my job', 'you have no idea what i\'ve been through',
  'trust me on this', 'i\'m not who you think i am',
  'you lied to me', 'just let it go', 'this isn\'t over',
  'things will never be the same', 'you complete me',
  // Action clichés
  'looks around nervously', 'takes a deep breath', 'fights back tears',
  'runs a hand through', 'stares into the distance', 'jaw drops',
  'eyes go wide', 'heart sinks', 'blood runs cold',
  'a single tear', 'laughs to himself', 'swallows hard',
  'shifts uncomfortably', 'bites his lip', 'bites her lip',
  'forces a smile', 'lets out a long breath',
  // Scene clichés
  'begins to rain', 'phone rings', 'alarm goes off',
  'the screen goes black', 'camera pulls back',
  'nothing but silence', 'time seems to stop', 'the world falls away',
];

// ── Generic scene descriptor patterns ────────────────────────────────────────
const GENERIC_PATTERNS = [
  /\b(beautiful|gorgeous|stunning|amazing|incredible)\s+(sunset|sunrise|view|landscape)\b/i,
  /\b(dark and stormy|cold and dark|bright and sunny)\b/i,
  /\bmeanwhile\b/i,
  /\blater that (day|night|evening)\b/i,
  /\bthe next (day|morning|night)\b/i,
  /\bsuddenly\b/i,
  /\bfor what seems like (an eternity|forever|hours)\b/i,
  /\bthe air (is|was) thick\b/i,
  /\b(time|world) (seems|seemed) to (stop|freeze|stand still)\b/i,
  /\bnothing would ever be the same\b/i,
  /\bwithout another word\b/i,
];

// ── Emotion-naming in action lines (show-don't-tell violation) ────────────────
// Matches: "John was angry", "She looked scared", "He seemed relieved"
// Action lines must SHOW behavior — not NAME internal states.
const ACTION_EMOTION_NAMING_RE = /\b(is|are|was|were|feel|feels|looks?|seems?|appears?)\s+(?:so\s+|very\s+|clearly\s+|obviously\s+)?(angry|furious|sad|depressed|scared|terrified|happy|elated|nervous|anxious|afraid|relieved|devastated|upset|worried|tense|confused|shocked|excited|frustrated|embarrassed|ashamed|guilty|jealous|hopeless|miserable|disgusted|irritated|annoyed|delighted|horrified|alarmed|bitter|resentful)\b/i;

export async function originalityPass(input: PassInput): Promise<PassResult> {
  const { fountain, records, approvedSpans } = input;
  const issues: RevisionIssue[] = [];

  const lines = fountain.split('\n');

  // ── Cliché phrases ────────────────────────────────────────────────────────
  const foundCliches = new Set<string>();
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    for (const cliche of CLICHE_PHRASES) {
      if (lower.includes(cliche) && !foundCliches.has(cliche)) {
        foundCliches.add(cliche);
        issues.push({
          location: `Line ${i + 1}`,
          rule: 'CLICHE_PHRASE',
          description: `Cliché phrase detected: "${cliche}"`,
          severity: 'minor',
          suggestedFix: 'Replace with a specific, unexpected formulation unique to this character and moment',
        });
      }
    }
  }

  // ── Generic patterns ──────────────────────────────────────────────────────
  for (let i = 0; i < lines.length; i++) {
    for (const pattern of GENERIC_PATTERNS) {
      if (pattern.test(lines[i])) {
        const match = lines[i].match(pattern)?.[0] ?? '';
        issues.push({
          location: `Line ${i + 1}`,
          rule: 'GENERIC_DESCRIPTOR',
          description: `Generic scene descriptor: "${match}" — adds no specific sensory information`,
          severity: 'minor',
          suggestedFix: 'Replace with a concrete, specific detail that only THIS story could have',
        });
        break; // one issue per line max
      }
    }
  }

  // ── Genre-specific forbidden clichés ─────────────────────────────────────
  // When the story has a genre set, check each line against the genre's
  // specific forbidden cliché list (from GENRE_MODIFIERS.forbiddenCliches).
  if (input.storyContext?.genre) {
    const genreMod = GENRE_MODIFIERS[input.storyContext.genre as StoryGenre];
    if (genreMod) {
      for (let i = 0; i < lines.length; i++) {
        const lower = lines[i].toLowerCase();
        for (const cliche of genreMod.forbiddenCliches) {
          // Strip surrounding quotes from the cliché definition before matching
          const clicheNorm = cliche.replace(/^["']|["']$/g, '').toLowerCase();
          if (clicheNorm.length > 3 && lower.includes(clicheNorm)) {
            issues.push({
              location: `Line ${i + 1}`,
              rule: 'GENRE_CLICHE',
              description: `${input.storyContext.genre.toUpperCase()} cliché: "${cliche}" — a genre trope this story should subvert or avoid`,
              severity: 'minor',
              suggestedFix: `This is a known ${input.storyContext.genre} genre trap. Find a specific expression unique to this story's characters and world`,
            });
            break; // at most one genre cliché flagged per line
          }
        }
      }
    }
  }

  // ── Scene purpose variety: fully uniform or critically low variety ────────
  const purposes = records.map(r => r.purpose);
  const purposeSet = new Set(purposes);
  if (purposeSet.size === 1 && records.length >= 4) {
    issues.push({
      location: 'Overall scene variety',
      rule: 'UNIFORM_SCENE_PURPOSES',
      description: `All ${records.length} scenes share the same purpose (${purposes[0]}) — the screenplay lacks tonal/functional variety`,
      severity: 'major',
      suggestedFix: 'Vary scene functions: mix setup, conflict, revelation, character moment, and comedic relief',
    });
  } else if (purposeSet.size <= 2 && records.length >= 8) {
    // Low variety: only 2 distinct purposes across 8+ scenes means structural monotony
    const topTwo = [...purposeSet].join(' and ');
    issues.push({
      location: 'Overall scene variety',
      rule: 'LOW_SCENE_VARIETY',
      description: `${records.length} scenes use only ${purposeSet.size} distinct purpose(s) (${topTwo}) — insufficient structural variety for a story this long`,
      severity: 'minor',
      suggestedFix: 'Introduce revelation, raising-stakes, and relief scenes to create a fuller dramatic arc',
    });
  }

  // ── Emotion-naming in action lines (show-don't-tell) ─────────────────────
  // Flag up to 2 instances per pass to keep output focused. Only fires on
  // non-dialogue, non-slug lines so stage direction isn't treated as action.
  let emotionNamingCount = 0;
  {
    let inDialogue = false;
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (!t) { inDialogue = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDialogue = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}$/.test(t)) { inDialogue = true; continue; }
      if (inDialogue) continue; // skip dialogue lines
      if (t.startsWith('(') && t.endsWith(')')) continue; // parenthetical

      const match = t.match(ACTION_EMOTION_NAMING_RE);
      if (match && emotionNamingCount < 2) {
        emotionNamingCount++;
        issues.push({
          location: `Line ${i + 1}`,
          rule: 'EMOTION_NAMING_IN_ACTION',
          description: `Action line names an emotion directly: "${t.slice(0, 70)}${t.length > 70 ? '...' : ''}"`,
          severity: 'major',
          suggestedFix: `Show the emotional state through a specific physical behavior or concrete action instead of naming it (e.g., replace "${match[0]}" with what the character does)`,
        });
      }
    }
  }

  // ── Wave 149: Arc predictability, intro clichés, sensory monotone ───────────

  // ARC_TELEGRAPHED: The resolution of the central conflict is telegraphed in
  // the opening third through dialogue that names the ending explicitly.
  // We detect phrases that describe the protagonist's final state too early.
  const telegraphPhrases = [
    'everything will work out', 'it\'ll all be okay', 'i know we\'ll make it',
    'we\'re going to be fine', 'this will all be worth it', 'you\'ll see',
    'i promise it gets better', 'we always figure it out', 'love conquers all',
    'good always wins', 'justice will prevail', 'the truth always comes out',
    'you can\'t fight fate', 'destiny will find a way',
  ];
  if (records.length >= 5) {
    const openingThirdEnd = Math.floor(records.length / 3);
    // Only scan fountain lines corresponding to the opening act
    // Approximate by taking the first 40% of fountain lines
    const fountainLines40pct = Math.floor(lines.length * 0.40);
    let telegraphCount = 0;
    for (let i = 0; i < fountainLines40pct; i++) {
      const lower = lines[i].toLowerCase();
      for (const phrase of telegraphPhrases) {
        if (lower.includes(phrase)) {
          telegraphCount++;
          if (telegraphCount === 1) {
            issues.push({
              location: `Line ${i + 1} (opening act)`,
              rule: 'ARC_TELEGRAPHED',
              description: `Opening act contains a phrase that telegraphs the resolution: "${phrase}" — the audience knows where this ends before the conflict begins`,
              severity: 'major',
              suggestedFix: 'Remove or complicate early declarations of how things will end. Let the resolution remain genuinely uncertain until the climax earns it',
            });
          }
          break;
        }
      }
      if (telegraphCount >= 2) break;
    }
    void openingThirdEnd; // used for guard
  }

  // CHARACTER_INTRO_CLICHE: A character's first appearance uses stock shorthand
  // instead of a specific, world-revealing detail. These introductions describe
  // people via their social role or appearance stereotype rather than a singular action.
  const introCliches = [
    /\b(in his|in her|in their)\s+(mid|late|early)[\s-]*(twenties|thirties|forties|fifties)\b/i,
    /\bstrikingly (beautiful|handsome|attractive)\b/i,
    /\b(no-nonsense|take-charge|straight-laced)\b/i,
    /\bhard-boiled\b/i,
    /\bworld-weary\b/i,
    /\bby-the-book\b/i,
    /\bunassuming (young|old)?\s*(man|woman|person)\b/i,
    /\ba man who has seen (it all|too much|better days)\b/i,
    /\bwho doesn't take (no|any) (shit|nonsense|guff)\b/i,
  ];
  let introClicheCount = 0;
  for (let i = 0; i < lines.length && introClicheCount < 2; i++) {
    for (const re of introCliches) {
      if (re.test(lines[i])) {
        introClicheCount++;
        issues.push({
          location: `Line ${i + 1}`,
          rule: 'CHARACTER_INTRO_CLICHE',
          description: `Character introduced with stock description: "${lines[i].trim().slice(0, 70)}" — a generic label instead of a specific, character-revealing moment`,
          severity: 'minor',
          suggestedFix: 'Introduce characters through a specific action, object, or sensory detail that only they could have. What is the single image that defines them?',
        });
        break;
      }
    }
  }

  // SENSORY_MONOTONE: The screenplay relies almost entirely on visual description
  // with no sound, smell, texture, or temperature. Scenes that omit non-visual
  // sensory cues feel flat and disembodied.
  // We detect this by checking action lines: if the script has many action lines
  // but none reference sound/smell/touch/temperature words, it's visually-only.
  if (records.length >= 5) {
    const soundWords = /\b(sound|noise|silence|quiet|loud|ring|crack|thud|rumble|whisper|echo|hum|scrape|clatter|hiss|creak|bang|snap|roar|murmur|buzz|drip|splash|footstep|heartbeat)\b/i;
    const tactileWords = /\b(cold|warm|hot|rough|smooth|wet|dry|sharp|soft|hard|heavy|light|sticky|slippery|tight|loose|texture|grip|pressure|pain|sting|itch|numb)\b/i;

    let actionLineCount = 0;
    let sensoryCueCount = 0;
    let inDialogue2 = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDialogue2 = false; continue; }
      if (/^(INT\.|EXT\.)/i.test(t)) { inDialogue2 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}$/.test(t)) { inDialogue2 = true; continue; }
      if (inDialogue2) continue;
      if (t.startsWith('(') && t.endsWith(')')) continue;
      actionLineCount++;
      if (soundWords.test(t) || tactileWords.test(t)) sensoryCueCount++;
    }

    const sensoryRatio = actionLineCount > 0 ? sensoryCueCount / actionLineCount : 1;
    if (actionLineCount >= 20 && sensoryRatio < 0.05) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'SENSORY_MONOTONE',
        description: `Only ${Math.round(sensoryRatio * 100)}% of action lines (${sensoryCueCount}/${actionLineCount}) contain sound or tactile cues — the screenplay is purely visual, missing the texture that makes scenes physically felt`,
        severity: 'minor',
        suggestedFix: 'Add at least one non-visual sensory detail per scene: a sound, a temperature, a texture. What does this world feel like, not just look like?',
      });
    }
  }

  // ── Wave 163: Act 3 purpose monotone, reaction shot overuse, emotional plateau ──

  // SCENE_PURPOSE_MONOTONE_ACT3: All Act 3 scenes (last 25%) share the same purpose.
  // The final act lacks the functional variety of climax, crisis, resolution, and
  // falling action — it's structurally monotone at the moment that should feel most
  // dynamic. Requires 8+ records and Act 3 must have at least 2 scenes.
  if (records.length >= 8) {
    const act3StartIdx = Math.floor(records.length * 0.75);
    const act3Records = records.slice(act3StartIdx);
    if (act3Records.length >= 2) {
      const act3PurposeSet = new Set(act3Records.map(r => r.purpose));
      if (act3PurposeSet.size === 1) {
        const [onlyPurpose] = act3PurposeSet;
        issues.push({
          location: `Act 3 (Scenes ${act3StartIdx}–${records.length - 1})`,
          rule: 'SCENE_PURPOSE_MONOTONE_ACT3',
          description: `All ${act3Records.length} Act 3 scenes use the same purpose ("${onlyPurpose}") — the final act lacks the functional variety of climax, crisis, resolution, and falling action`,
          severity: 'major',
          suggestedFix: `Vary Act 3 scene functions: include at least one climax scene, one turning point, and one resolution scene so the ending has a shape rather than just repeating the same narrative beat`,
        });
      }
    }
  }

  // REACTION_SHOT_OVERUSE: More than 30% of action lines are single-beat reaction
  // shots — a character plus one reaction verb and nothing else. These terse lines
  // ("She nods.", "He turns.", "She looks.") are stock filler that substitutes for
  // real physical specificity. Requires 8+ action lines.
  const reactionShotPattern = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(looks?|turns?|nods?|sighs?|pauses?|smiles?|laughs?|frowns?|grimaces?|glances?|stares?|stiffens?|freezes?|shrugs?)\s*\.?$/;
  {
    let totalActionLines2 = 0;
    let reactionShotCount = 0;
    let inDialogue3 = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDialogue3 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDialogue3 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDialogue3 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDialogue3) continue;
      totalActionLines2++;
      if (reactionShotPattern.test(t)) reactionShotCount++;
    }
    if (totalActionLines2 >= 8 && reactionShotCount / totalActionLines2 > 0.30) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'REACTION_SHOT_OVERUSE',
        description: `${reactionShotCount} of ${totalActionLines2} action lines (${Math.round(reactionShotCount / totalActionLines2 * 100)}%) are single-beat reaction shots ("She nods.", "He turns.") — stock filler that replaces specific physical action`,
        severity: 'minor',
        suggestedFix: 'Replace terse reaction shots with specific, concrete actions that reveal character: what does she do that no other character would do in this moment?',
      });
    }
  }

  // EMOTIONAL_ARC_PLATEAU: All scenes have neutral emotional shifts — the story
  // has no emotional peaks or valleys at all. Every scene leaves characters and
  // audience in exactly the same affective state. Requires 6+ records.
  if (records.length >= 6) {
    const allNeutral = records.every(r => r.emotionalShift === 'neutral');
    if (allNeutral) {
      issues.push({
        location: 'Emotional arc throughout',
        rule: 'EMOTIONAL_ARC_PLATEAU',
        description: `All ${records.length} scenes have neutral emotional shifts — the story has no emotional peaks or valleys. Every scene leaves characters and audience in exactly the same affective state.`,
        severity: 'major',
        suggestedFix: 'Give the story emotional shape: at least one scene should end on a positive note (relief, hope, connection) and one on a negative (loss, betrayal, setback). An emotionally flat story is not drama.',
      });
    }
  }

  // ── Wave 176: Conjunction openings, ellipsis overuse, caps emphasis ─────────

  // OPENING_CONJUNCTION_OVERUSE: More than 25% of action lines open with a
  // coordinating conjunction ("And", "But", "So", "Then", "Yet"). An occasional
  // conjunction-led line is a deliberate rhythmic choice; a quarter of all lines
  // doing it is a verbal tic that makes the prose feel breathless and run-on.
  // Requires 8+ action lines.
  {
    const conjRe = /^(and|but|so|then|yet|or)\b/i;
    let actionN = 0;
    let conjN = 0;
    let inDlg = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg) continue;
      actionN++;
      if (conjRe.test(t)) conjN++;
    }
    if (actionN >= 8 && conjN / actionN > 0.25) {
      issues.push({
        location: 'Action line openings',
        rule: 'OPENING_CONJUNCTION_OVERUSE',
        description: `${conjN} of ${actionN} action lines (${Math.round(conjN / actionN * 100)}%) open with a conjunction ("And", "But", "Then") — a tic that strings the prose into a breathless run-on instead of standing each image on its own.`,
        severity: 'minor',
        suggestedFix: 'Cut the leading conjunctions. Let action lines begin with the subject performing the action; reserve a sentence-opening "But" for the rare beat where the reversal genuinely needs the hinge.',
      });
    }
  }

  // ELLIPSIS_OVERUSE: More than 30% of content lines (dialogue and action) trail
  // off into an ellipsis. Ellipses signal hesitation or incompletion; when nearly
  // every line uses one, the whole script reads as tentative and unresolved, and
  // genuine trailing-off loses its weight. Requires 10+ content lines.
  {
    let contentN = 0;
    let ellipsisN = 0;
    let inDlg = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg = true; continue; }
      if (/^\(/.test(t)) continue;
      contentN++;
      if (t.includes('...') || t.includes('…')) ellipsisN++;
    }
    if (contentN >= 10 && ellipsisN / contentN > 0.3) {
      issues.push({
        location: 'Dialogue and action lines',
        rule: 'ELLIPSIS_OVERUSE',
        description: `${ellipsisN} of ${contentN} content lines (${Math.round(ellipsisN / contentN * 100)}%) trail off into an ellipsis — when nearly every line hesitates, the whole script reads as tentative and the genuine trailing-off beats lose their weight.`,
        severity: 'minor',
        suggestedFix: 'Reserve ellipses for true hesitation or interruption. Let most lines land on a hard period; a definite stop reads as confidence, and makes the rare ellipsis actually mean something.',
      });
    }
  }

  // CAPS_EMPHASIS_OVERUSE: Action lines overuse ALL-CAPS words mid-sentence for
  // emphasis ("He SLAMS the door", "She SCREAMS"). Screenplays reserve caps for
  // character cues, sounds, and the first appearance of a character or key prop;
  // sprinkling them through action for emphasis is amateur shouting on the page.
  // Requires 8+ action lines and >20% with a mid-line caps word.
  {
    let actionN = 0;
    let capsN = 0;
    let inDlg = false;
    const capsWordRe = /\b[A-Z]{3,}\b/;
    const hasLowerRe = /[a-z]/;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg) continue;
      actionN++;
      // Only count lines that are prose (contain lowercase) yet shout a caps word
      if (hasLowerRe.test(t) && capsWordRe.test(t)) capsN++;
    }
    if (actionN >= 8 && capsN / actionN > 0.2) {
      issues.push({
        location: 'Action line emphasis',
        rule: 'CAPS_EMPHASIS_OVERUSE',
        description: `${capsN} of ${actionN} action lines (${Math.round(capsN / actionN * 100)}%) shout an ALL-CAPS word mid-sentence for emphasis ("He SLAMS the door") — caps belong to cues, sounds, and first appearances, not to punching up ordinary action.`,
        severity: 'minor',
        suggestedFix: 'Strip the emphasis caps and let a stronger verb carry the force: "He SLAMS the door" → "He slams the door" reads no weaker, and "He kicks it shut" reads stronger. Save caps for the page\'s rare true accents.',
      });
    }
  }

  // ── Wave 191: Passive voice overload, interior monologue leak, repeated location ─

  // PASSIVE_VOICE_OVERLOAD: More than 25% of action lines use passive-voice
  // constructions ("was placed", "were told", "was sealed"). Passive prose drains
  // kinetic energy — the subject should perform the action, not receive it.
  // Requires 10+ action lines.
  {
    const passiveRe = /(was|were)\s+[a-z]{2,}ed\b/i;
    let pvActionN = 0;
    let pvPassiveN = 0;
    let pvInDlg = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { pvInDlg = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { pvInDlg = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { pvInDlg = true; continue; }
      if (/^\(/.test(t)) continue;
      if (pvInDlg) continue;
      pvActionN++;
      if (passiveRe.test(t)) pvPassiveN++;
    }
    if (pvActionN >= 10 && pvPassiveN / pvActionN > 0.25) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'PASSIVE_VOICE_OVERLOAD',
        severity: 'minor',
        description: `${pvPassiveN} of ${pvActionN} action lines (${Math.round(pvPassiveN / pvActionN * 100)}%) use passive construction ("was placed", "were told") — passive prose distances the audience from the action and drains its kinetic force.`,
        suggestedFix: 'Rewrite passive lines as active: "The door was closed by Maria" → "Maria closes the door." The subject should perform the verb, not receive it.',
      });
    }
  }

  // INTERIOR_MONOLOGUE_LEAK: More than 15% of action lines describe invisible
  // internal states — thoughts, imaginings, recollections. Screenplay action lines
  // must describe only what the camera can capture; thought-describing directions
  // give the director nothing to shoot and put the author's interiority on screen
  // rather than the character's behavior. Requires 8+ action lines.
  {
    const interiorRe = /\b(thinks?\s+(?:about|of|that|over)|wonders?\s+(?:if|whether|about)|considers?\s+(?:this|that|the|a|an|\w+ing)\b|imagines?\b|ponders?\b|recalls?\s+(?:when|that|the|a|her|his|their)|remembers?\s+(?:when|that|the|a|her|his|their))\b/i;
    let imActionN = 0;
    let imInteriorN = 0;
    let imInDlg = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { imInDlg = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { imInDlg = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { imInDlg = true; continue; }
      if (/^\(/.test(t)) continue;
      if (imInDlg) continue;
      imActionN++;
      if (interiorRe.test(t)) imInteriorN++;
    }
    if (imActionN >= 8 && imInteriorN / imActionN > 0.15) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'INTERIOR_MONOLOGUE_LEAK',
        severity: 'minor',
        description: `${imInteriorN} of ${imActionN} action lines (${Math.round(imInteriorN / imActionN * 100)}%) describe invisible internal states — thoughts, wonderings, recollections. The camera cannot render what a character thinks.`,
        suggestedFix: 'Externalize the interiority: find a physical action, gesture, or prop interaction that makes the internal state filmable. Show the thought through behavior, not narration.',
      });
    }
  }

  // REPEATED_LOCATION_EXCESS: A single normalized location appears in 3 or more
  // scenes and constitutes 40%+ of all scene headings. The story returns
  // obsessively to one space without spatial or visual variety.
  // Requires 6+ records.
  if (records.length >= 6) {
    const slugCounts = new Map<string, number>();
    const slugLinesList = lines.filter(l => /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(l.trim()));
    for (const slug of slugLinesList) {
      const normalized = slug.trim().toLowerCase()
        .replace(/\s*-\s*(day|night|continuous|later|dawn|dusk|morning|evening|afternoon|sunset|sunrise)\s*$/i, '')
        .trim();
      slugCounts.set(normalized, (slugCounts.get(normalized) ?? 0) + 1);
    }
    const totalSlugsCount = slugLinesList.length;
    if (totalSlugsCount > 0) {
      for (const [loc, count] of slugCounts) {
        if (count >= 3 && count / totalSlugsCount >= 0.4) {
          issues.push({
            location: `Setting: ${loc}`,
            rule: 'REPEATED_LOCATION_EXCESS',
            severity: 'minor',
            description: `The location "${loc}" appears in ${count} of ${totalSlugsCount} scenes (${Math.round(count / totalSlugsCount * 100)}%) — the story returns to one space with no visual or spatial variety.`,
            suggestedFix: 'Vary the settings. Even small location shifts signal narrative movement and give the director different visual vocabulary for the same dramatic tension.',
          });
          break;
        }
      }
    }
  }

  // ── Wave 201: Simile overload, dialogue dominance, adverb oversaturation ────

  // SIMILE_OVERLOAD: More than 25% of action lines contain a simile construction
  // ("like X", "as though", "as if"). Simile-heavy prose signals a writer who
  // lacks confidence in direct statement — reaching for comparison instead of
  // finding the precise image. Requires 10+ action lines.
  {
    const simileRe = /\b(like\s+[a-z]|as\s+though\b|as\s+if\b)/i;
    let slActionN = 0;
    let slSimileN = 0;
    let slInDlg = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { slInDlg = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { slInDlg = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { slInDlg = true; continue; }
      if (/^\(/.test(t)) continue;
      if (slInDlg) continue;
      slActionN++;
      if (simileRe.test(t)) slSimileN++;
    }
    if (slActionN >= 10 && slSimileN / slActionN > 0.25) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'SIMILE_OVERLOAD',
        severity: 'minor',
        description: `${slSimileN} of ${slActionN} action lines (${Math.round(slSimileN / slActionN * 100)}%) use a simile ("like X", "as if", "as though") — florid, over-written prose that signals a lack of confidence in direct statement.`,
        suggestedFix: 'Find the precise verb or image that makes the simile unnecessary. "She moved like water" → "She flowed." Direct, specific language is stronger than comparison.',
      });
    }
  }

  // DIALOGUE_DOMINANCE: Dialogue lines constitute more than 70% of all content
  // lines (dialogue + action). A screenplay heavy with talk and light on action
  // is telling where it should show — characters explain what should be
  // dramatized through behavior and staging. Requires 15+ content lines.
  {
    let ddDialogueN = 0;
    let ddActionN = 0;
    let ddInDlg = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { ddInDlg = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { ddInDlg = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { ddInDlg = true; continue; }
      if (/^\(/.test(t)) continue;
      if (ddInDlg) { ddDialogueN++; } else { ddActionN++; }
    }
    const ddTotal = ddDialogueN + ddActionN;
    if (ddTotal >= 15 && ddDialogueN / ddTotal > 0.7) {
      issues.push({
        location: 'Script dialogue/action balance',
        rule: 'DIALOGUE_DOMINANCE',
        severity: 'major',
        description: `${ddDialogueN} of ${ddTotal} content lines (${Math.round(ddDialogueN / ddTotal * 100)}%) are dialogue — the script tells where it should show. Heavy dialogue substitutes explanation for dramatized action.`,
        suggestedFix: 'Convert at least a third of expository dialogue into physical action, environmental detail, or visual behavior. What do these characters do that makes the same point without saying it?',
      });
    }
  }

  // ADVERB_OVERSATURATION: More than 20% of action lines contain an adverb
  // ending in "-ly". Adverbs in action indicate weak verbs — the writer reaches
  // for a modifier rather than finding the precise, energetic verb.
  // Requires 10+ action lines.
  {
    const adverbRe = /\b[a-z]{4,}ly\b/i;
    let aoActionN = 0;
    let aoAdverbN = 0;
    let aoInDlg = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { aoInDlg = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { aoInDlg = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { aoInDlg = true; continue; }
      if (/^\(/.test(t)) continue;
      if (aoInDlg) continue;
      aoActionN++;
      if (adverbRe.test(t)) aoAdverbN++;
    }
    if (aoActionN >= 10 && aoAdverbN / aoActionN > 0.2) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'ADVERB_OVERSATURATION',
        severity: 'minor',
        description: `${aoAdverbN} of ${aoActionN} action lines (${Math.round(aoAdverbN / aoActionN * 100)}%) contain an "-ly" adverb — a signal of weak verbs. The writer is reaching for modifiers rather than finding the precise verb.`,
        suggestedFix: 'Find the stronger verb that makes the adverb unnecessary: "walks quickly" → "strides"; "speaks quietly" → "murmurs". Precise verbs are sharper than verb+adverb.',
      });
    }
  }

  // ── Wave 217: Freshness physics — opener entropy, local lexical echo, scene-shape
  //    templating. Three higher-order measures of prose/structural sameness that the
  //    per-feature ratio checks above cannot see. ──

  // Classify action lines once (non-slug, non-cue, non-parenthetical, outside dialogue).
  const actionLines217: string[] = [];
  {
    let inDlg217 = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg217 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg217 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg217 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg217) continue;
      actionLines217.push(t);
    }
  }

  // ACTION_OPENER_MONOTONY (minor): more than 35% of action lines begin with the same
  // word. Distinct from OPENING_CONJUNCTION_OVERUSE (conjunctions only) — this catches
  // subject-pronoun anaphora ("He… He… He…"), the most common signature of unrevised
  // prose, where every line marches out of the same grammatical gate.
  if (actionLines217.length >= 10) {
    const openerCounts217 = new Map<string, number>();
    for (const t of actionLines217) {
      const first217 = t.replace(/^[^a-zA-Z]+/, '').split(/\s+/)[0]?.toLowerCase() ?? '';
      if (first217) openerCounts217.set(first217, (openerCounts217.get(first217) ?? 0) + 1);
    }
    if (openerCounts217.size > 0) {
      const [topOpener217, topCount217] = [...openerCounts217.entries()].sort((a, b) => b[1] - a[1])[0];
      const share217 = topCount217 / actionLines217.length;
      if (share217 > 0.35) {
        issues.push({
          location: 'Action lines throughout',
          rule: 'ACTION_OPENER_MONOTONY',
          severity: 'minor',
          description: `${topCount217} of ${actionLines217.length} action lines (${Math.round(share217 * 100)}%) begin with the same word ("${topOpener217}") — the prose marches out of the same grammatical gate line after line. Repeated openers flatten rhythm and betray unrevised description.`,
          suggestedFix: 'Vary how action lines begin: lead with the object, an adverbial phrase, a sound, or a dependent clause. When every line opens on the same subject pronoun, the description reads as a list rather than a scene.',
        });
      }
    }
  }

  // DISTINCTIVE_WORD_ECHO (minor): a distinctive content word (5+ letters, not a function
  // word) appears 4+ times within a window of 6 consecutive action lines — a conspicuous
  // local echo. Unlike the global cliché list, this catches a writer's own unintentional
  // word-repetition tic ("shadows" in four straight paragraphs) that no fixed dictionary
  // could anticipate.
  if (actionLines217.length >= 5) {
    const ECHO_STOP217 = new Set([
      'there','their','about','would','could','should','these','those','where','which',
      'while','after','before','again','still','being','because','through','around',
      'every','other','another','really','almost','against','toward','behind',
    ]);
    const wordPositions217 = new Map<string, number[]>();
    for (let li = 0; li < actionLines217.length; li++) {
      const seen217 = new Set<string>();
      for (const w of actionLines217[li].toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)) {
        if (w.length >= 5 && !ECHO_STOP217.has(w) && !seen217.has(w)) {
          // count once per line so a single line repeating a word isn't an "echo"
          seen217.add(w);
          if (!wordPositions217.has(w)) wordPositions217.set(w, []);
          wordPositions217.get(w)!.push(li);
        }
      }
    }
    let echoWord217 = '';
    let echoCount217 = 0;
    for (const [w, positions] of wordPositions217) {
      if (positions.length < 4) continue;
      // sliding window: 4 occurrences spanning ≤5 action lines (a 6-line window)
      for (let k = 0; k + 3 < positions.length; k++) {
        if (positions[k + 3] - positions[k] <= 5) {
          const localCount217 = positions.filter(p => p >= positions[k] && p <= positions[k] + 5).length;
          if (localCount217 > echoCount217) { echoCount217 = localCount217; echoWord217 = w; }
          break;
        }
      }
    }
    if (echoWord217) {
      issues.push({
        location: 'Action description',
        rule: 'DISTINCTIVE_WORD_ECHO',
        severity: 'minor',
        description: `The word "${echoWord217}" appears ${echoCount217} times within a span of six action lines — a conspicuous local echo. Repeating a distinctive word in close proximity makes the prose feel unrevised and draws the eye to the repetition rather than the image.`,
        suggestedFix: `Replace all but one instance of "${echoWord217}" with a specific synonym or a different concrete image. A distinctive word should land once; its power dissolves on the third and fourth repetition.`,
      });
    }
  }

  // SCENE_SHAPE_TEMPLATING (major): 60%+ of scenes share an identical structural shape
  // signature — same emotional register, same dialogue-presence, same reversal-presence,
  // same relationship-movement. Distinct from UNIFORM_SCENE_PURPOSES (purpose label only):
  // scenes can carry varied purpose tags yet still be built from the same beat machine.
  // This catches formulaic construction that purpose-variety alone conceals.
  if (records.length >= 8) {
    const shapeCounts217 = new Map<string, number>();
    for (const r of records) {
      const sig217 = [
        r.emotionalShift ?? 'neutral',
        (r.dialogueHighlights?.length ?? 0) > 0 ? 'D' : '-',
        r.suspenseDelta < -1 ? 'R' : '-',
        (r.relationshipShifts?.length ?? 0) > 0 ? 'S' : '-',
      ].join('|');
      shapeCounts217.set(sig217, (shapeCounts217.get(sig217) ?? 0) + 1);
    }
    const [domSig217, domCount217] = [...shapeCounts217.entries()].sort((a, b) => b[1] - a[1])[0];
    const domShare217 = domCount217 / records.length;
    if (domShare217 > 0.6 && shapeCounts217.size >= 1) {
      issues.push({
        location: 'Scene construction',
        rule: 'SCENE_SHAPE_TEMPLATING',
        severity: 'major',
        description: `${domCount217} of ${records.length} scenes (${Math.round(domShare217 * 100)}%) share an identical structural shape (${domSig217}: emotion·dialogue·reversal·relationship) — the scenes are stamped from one template. Even where purpose labels vary, the underlying beat machine repeats, and the story acquires a mechanical sameness.`,
        suggestedFix: 'Vary the architecture of scenes, not just their labels: alternate dialogue-driven beats with silent action, pair some scenes with a reversal and others with a relationship shift, and let the emotional register move. Structural variety is what keeps a story from feeling assembly-lined.',
      });
    }
  }

  // ── Wave 231: Purpose bookend repeat, I-dominance in dialogue, Act 3 action drought ──

  // PURPOSE_BOOKEND_REPEAT (minor, n≥8): The dominant purpose in Act 1 (first 25%)
  // matches the dominant purpose in Act 3 (last 25%). The story's functional register
  // at the start mirrors the end rather than contrasting — the opening setup and the
  // resolution wear the same structural label. Distinct from ARC_BOOKEND_IDENTICAL
  // (character-arc pass, emotional register) — this flags functional identity.
  if (records.length >= 8) {
    const act1EndBk231 = Math.floor(records.length * 0.25);
    const act3StartBk231 = Math.floor(records.length * 0.75);
    const countPurposes231 = (recs: typeof records) => {
      const map = new Map<string, number>();
      for (const r of recs) map.set(r.purpose, (map.get(r.purpose) ?? 0) + 1);
      return [...map.entries()].sort((a, b) => b[1] - a[1]);
    };
    const act1Purposes231 = countPurposes231(records.slice(0, act1EndBk231));
    const act3Purposes231 = countPurposes231(records.slice(act3StartBk231));
    if (act1Purposes231.length > 0 && act3Purposes231.length > 0) {
      const [act1DomPurpose231, act1DomCount231] = act1Purposes231[0];
      const [act3DomPurpose231, act3DomCount231] = act3Purposes231[0];
      if (act1DomPurpose231 === act3DomPurpose231 && act1DomCount231 >= 2 && act3DomCount231 >= 2) {
        issues.push({
          location: 'Act 1 / Act 3 structure',
          rule: 'PURPOSE_BOOKEND_REPEAT',
          severity: 'minor',
          description: `Act 1 and Act 3 share the same dominant scene purpose ("${act1DomPurpose231}") — the story's opening functional register mirrors its closing rather than contrasting with it. The resolution wears the same structural label as the setup.`,
          suggestedFix: 'Vary the dominant purpose between the first and final acts: if Act 1 establishes the world, Act 3 should resolve, transform, or transcend it — not recapitulate the same function. The ending should feel structurally distinct from the beginning.',
        });
      }
    }
  }

  // DIALOGUE_I_DOMINANCE (minor, ≥12 dialogue lines): More than 40% of all dialogue
  // lines across every character begin with "I" (as a word). When nearly half of
  // every spoken line is self-referential, the dialogue register collapses into a
  // monotone of interior report — characters constantly state their own feelings,
  // wants, and histories rather than engaging with the world or each other.
  {
    let totalDlgLines231 = 0;
    let iDomCount231 = 0;
    let inDlg231 = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg231 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg231 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg231 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg231) {
        totalDlgLines231++;
        if (/^I\b/i.test(t)) iDomCount231++;
      }
    }
    if (totalDlgLines231 >= 12 && iDomCount231 / totalDlgLines231 > 0.4) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_I_DOMINANCE',
        severity: 'minor',
        description: `${iDomCount231} of ${totalDlgLines231} dialogue lines (${Math.round(iDomCount231 / totalDlgLines231 * 100)}%) begin with "I" — the dialogue is overwhelmingly self-referential. Characters constantly report their own feelings and history rather than engaging with each other or reacting to the world.`,
        suggestedFix: 'Vary dialogue openings: begin lines with "You", "We", a question, a command, or an observation. When every line starts with "I", characters are monologuing rather than conversing — each line becomes a personal statement delivered to the air.',
      });
    }
  }

  // ACT3_ACTION_DROUGHT (minor, n≥8): Act 3 (last 25%) has significantly fewer action
  // lines per scene than Act 1 (first 25%). The resolution rushes past in dialogue
  // while the setup was visually rich — the ending under-delivers on physical specificity
  // at the moment when the visual register should be at its most concentrated.
  if (records.length >= 8) {
    const act1EndAct231 = Math.floor(records.length * 0.25);
    const act3StartAct231 = Math.floor(records.length * 0.75);
    // build a lineToScene map using slug headings
    const lineToScene231: number[] = [];
    let sceneIdx231 = -1;
    for (const line of lines) {
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(line.trim())) sceneIdx231++;
      lineToScene231.push(sceneIdx231);
    }
    const actionLinesPerScene231 = new Map<number, number>();
    let inDlg231b = false;
    for (let li = 0; li < lines.length; li++) {
      const t = lines[li].trim();
      if (!t) { inDlg231b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg231b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg231b = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg231b) continue;
      const si231 = lineToScene231[li] ?? -1;
      if (si231 >= 0) {
        actionLinesPerScene231.set(si231, (actionLinesPerScene231.get(si231) ?? 0) + 1);
      }
    }
    const avgAct231 = (startIdx: number, endIdx: number): number => {
      let total = 0; let count = 0;
      for (let s = startIdx; s < endIdx; s++) {
        total += actionLinesPerScene231.get(s) ?? 0;
        count++;
      }
      return count > 0 ? total / count : 0;
    };
    const act1AvgAction231 = avgAct231(0, act1EndAct231);
    const act3AvgAction231 = avgAct231(act3StartAct231, records.length);
    if (act1AvgAction231 >= 3 && act3AvgAction231 < act1AvgAction231 * 0.5) {
      issues.push({
        location: `Act 3 (Scenes ${act3StartAct231}–${records.length - 1})`,
        rule: 'ACT3_ACTION_DROUGHT',
        severity: 'minor',
        description: `Act 3 averages ${act3AvgAction231.toFixed(1)} action lines per scene while Act 1 averaged ${act1AvgAction231.toFixed(1)} — the resolution rushes past in dialogue with half the visual specificity of the setup. The ending under-delivers physically at the moment the visual register should be most concentrated.`,
        suggestedFix: 'Add physical specificity to Act 3 scenes: concrete actions, specific objects, stage pictures that show the story\'s resolution rather than telling it. The climax and denouement should be as visually specific as the world-building, not thinner.',
      });
    }
  }
  // ── End Wave 231 ─────────────────────────────────────────────────────────────

  // ── Wave 245: Gerund opener dominance, scene slug time monotone, cognition in action ──

  // GERUND_OPENER_DOMINANCE (minor, ≥10 action lines): More than 45% of action
  // lines start with a gerund (present participle: -ing form). "Running through
  // the hall...", "Checking the locks...", "Staring at the screen..." —
  // participial-dominant action prose lacks the subject-verb authority of
  // "She runs the hall" or "He checks every lock." Gerund openers float;
  // declarative subjects with active verbs drive. This is complementary to
  // CONJUNCTION_OPENER_EXCESS (rhythm.ts, which checks for "and/but/so" openers)
  // and distinct from GERUND_FRAGMENT (rhythm.ts, which checks for verb-phrase
  // fragments following a comma).
  {
    let actionLinesOrig245 = 0;
    let gerundOpeners245 = 0;
    let inDlgOrig245 = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlgOrig245 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlgOrig245 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlgOrig245 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlgOrig245) continue;
      actionLinesOrig245++;
      if (/^[A-Z]?[a-z]*ing\s/i.test(t) || /^[A-Z][a-z]+ing\s/.test(t)) gerundOpeners245++;
    }
    if (actionLinesOrig245 >= 10 && gerundOpeners245 / actionLinesOrig245 > 0.45) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'GERUND_OPENER_DOMINANCE',
        severity: 'minor',
        description: `${gerundOpeners245} of ${actionLinesOrig245} action lines (${Math.round(gerundOpeners245 / actionLinesOrig245 * 100)}%) start with a gerund (-ing form) — the action prose is participial-dominant. "Running to the door" floats; "She runs to the door" drives. Gerund-heavy action loses the subject-verb authority that makes description feel commanded rather than observed.`,
        suggestedFix: 'Replace at least half the gerund openers with subject-first, active-verb sentences. Lead with the agent: "She grabs the report" not "Grabbing the report, she..." Reserve gerund openers for background action and simultaneous events, not the primary verb of each line.',
      });
    }
  }

  // SCENE_SLUG_TIME_MONOTONE (minor, ≥6 scenes): All scene sluglines with an
  // explicit time indicator use the same one (all "DAY" or all "NIGHT" or all
  // "CONTINUOUS"). A story that never changes its visual time register has no
  // cinematographic variety — there is no chiaroscuro between golden-hour
  // warmth and 3 AM fluorescence, no circadian rhythm to the drama. Requires
  // both that time indicators are present AND that they are all the same.
  {
    const timeRe245 = /\b(DAY|NIGHT|DAWN|DUSK|MORNING|EVENING|AFTERNOON|CONTINUOUS|LATER|MOMENTS LATER)\b/;
    const timeValues245 = new Set<string>();
    let slugCount245 = 0;
    for (const line of lines) {
      const t = line.trim();
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) {
        slugCount245++;
        const match245 = t.match(timeRe245);
        if (match245) timeValues245.add(match245[1].toUpperCase());
      }
    }
    if (slugCount245 >= 6 && timeValues245.size === 1) {
      const [onlyTime245] = timeValues245;
      issues.push({
        location: 'Scene slugline register',
        rule: 'SCENE_SLUG_TIME_MONOTONE',
        severity: 'minor',
        description: `All ${slugCount245} scene sluglines use the same time indicator ("${onlyTime245}") — the story exists in one unbroken visual register. No shift from DAY to NIGHT, no circadian rhythm to the drama. Light is character; a story that never changes time of day is shot entirely under one flat lighting condition.`,
        suggestedFix: `Vary the time register: let scenes take place at different times of day, with each shift earning its new visual quality. A DAY scene and a NIGHT scene of the same location carry different emotional charge — use that charge deliberately.`,
      });
    }
  }

  // COGNITION_IN_ACTION (minor, ≥10 action lines): More than 30% of action lines
  // contain cognition verbs (realizes, remembers, wonders, decides, thinks,
  // notices, understands, imagines, considers, reflects). A camera cannot capture
  // what a character thinks; action lines must describe observable behaviour.
  // Cognition verbs are prose-novel habits imported into screenplay format —
  // they tell the reader what's happening inside a character's head in a form
  // that would require narration or internal monologue to reach the screen.
  // Distinct from ACTION_EMOTION_NAMING_RE (which checks "is/was + emotion adj"):
  // this fires on cognition verbs regardless of adjacent emotion adjectives.
  {
    let actionLinesCog245 = 0;
    let cogCount245 = 0;
    let inDlgCog245 = false;
    const cogRe245 = /\b(realizes?|remembers?|wonders?|decides?|thinks?|notices?|understands?|imagines?|considers?|reflects?|recognizes?|comprehends?|perceives?|contemplates?|deliberates?)\b/i;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlgCog245 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlgCog245 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlgCog245 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlgCog245) continue;
      actionLinesCog245++;
      if (cogRe245.test(t)) cogCount245++;
    }
    if (actionLinesCog245 >= 10 && cogCount245 / actionLinesCog245 > 0.3) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'COGNITION_IN_ACTION',
        severity: 'minor',
        description: `${cogCount245} of ${actionLinesCog245} action lines (${Math.round(cogCount245 / actionLinesCog245 * 100)}%) use cognition verbs (realizes, remembers, wonders, decides, etc.) — the screenplay describes interior thought states that a camera cannot photograph. Action lines must describe observable behaviour, not mental events.`,
        suggestedFix: "Translate cognition into behaviour: instead of \"She realizes he lied\", write \"She stops. Looks at the receipt again. Sets it down slowly.\" The physical action encodes the realisation. Let the audience do the cognitive work from what they see.",
      });
    }
  }

  // ── End Wave 245 ─────────────────────────────────────────────────────────────

  // ── Wave 259: Copula action dominance, filtering-verb overuse, directorial intrusion ──

  // COPULA_ACTION_DOMINANCE (minor, ≥10 action lines): More than 45% of action
  // lines lean on a copula ("is/are/was/were") as their spine instead of an active
  // verb. Screenplay action is present-tense and kinetic — "She slams the door",
  // not "The door is slammed" or "There is a door". Copula-driven description
  // stages a static tableau; active verbs make the page move. Distinct from
  // GERUND_OPENER_DOMINANCE (participial openers) and COGNITION_IN_ACTION (mental
  // verbs); this targets the inert linking-verb habit.
  {
    let actionLines259 = 0;
    let copulaLines259 = 0;
    let inDlg259 = false;
    const copulaRe259 = /\b(is|are|was|were|isn'?t|aren'?t|wasn'?t|weren'?t)\b/i;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg259 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg259 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg259 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg259) continue;
      actionLines259++;
      if (copulaRe259.test(t)) copulaLines259++;
    }
    if (actionLines259 >= 10 && copulaLines259 / actionLines259 > 0.45) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'COPULA_ACTION_DOMINANCE',
        severity: 'minor',
        description: `${copulaLines259} of ${actionLines259} action lines (${Math.round(copulaLines259 / actionLines259 * 100)}%) lean on a linking verb ("is/are/was/were") rather than an active verb — the action prose stages a static tableau. "There is a man at the window" describes a photograph; "A man watches from the window" describes a scene in motion.`,
        suggestedFix: 'Recast copula sentences around active verbs. Cut expletive openers ("There is", "It was") and let the subject act: not "The room is dark and cold" but "Cold seeps through the dark room." Active verbs give the page forward momentum.',
      });
    }
  }

  // FILTERING_VERB_OVERUSE (minor, ≥10 action lines): More than 25% of action
  // lines filter the image through a character's perception ("she sees", "he
  // hears", "she watches", "he feels") instead of presenting it directly. Filtering
  // puts a pane of glass between the audience and the event — "She sees the car
  // explode" is weaker than "The car explodes." Distinct from COGNITION_IN_ACTION
  // (interior thought verbs); this targets sensory-perception framing.
  {
    let actionLinesFilt259 = 0;
    let filterLines259 = 0;
    let inDlgFilt259 = false;
    const filterRe259 = /\b(sees?|saw|hears?|heard|watches?|watched|feels?|felt|looks? at|listens?|listened|observes?|observed)\b/i;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlgFilt259 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlgFilt259 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlgFilt259 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlgFilt259) continue;
      actionLinesFilt259++;
      if (filterRe259.test(t)) filterLines259++;
    }
    if (actionLinesFilt259 >= 10 && filterLines259 / actionLinesFilt259 > 0.25) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'FILTERING_VERB_OVERUSE',
        severity: 'minor',
        description: `${filterLines259} of ${actionLinesFilt259} action lines (${Math.round(filterLines259 / actionLinesFilt259 * 100)}%) filter the image through a character's perception ("she sees", "he hears", "she watches") rather than presenting it directly. Filtering verbs put a pane of glass between the audience and the event — the camera already shows what the character sees; saying so twice weakens the image.`,
        suggestedFix: 'Cut the perception verb and show the thing itself: not "She sees the door creak open" but "The door creaks open." Reserve "she sees" for the rare beat where the act of watching — not the thing watched — is the point.',
      });
    }
  }

  // DIRECTORIAL_INTRUSION (minor, ≥3 occurrences): Action lines embed explicit
  // camera and editing directions ("ANGLE ON", "CLOSE ON", "WE SEE", "PAN",
  // "ZOOM", "DOLLY", "TRACKING", "CAMERA"). A spec script directs the reader's
  // eye through prose, not through shot calls — naming the lens is the director's
  // job, and overt camera direction dates the page and breaks immersion. Counts
  // occurrences across action lines (sluglines and transitions excluded).
  {
    let directorialCount259 = 0;
    let firstDirLine259 = -1;
    let inDlgDir259 = false;
    const directorialRe259 = /\b(ANGLE ON|CLOSE ON|CLOSE-?UP|WIDE ON|WE SEE|WE HEAR|PAN (TO|ACROSS|UP|DOWN|LEFT|RIGHT)|ZOOM (IN|OUT)|DOLLY|TRACKING SHOT|CRANE SHOT|THE CAMERA|PUSH IN|RACK FOCUS)\b/;
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (!t) { inDlgDir259 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlgDir259 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlgDir259 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlgDir259) continue;
      if (directorialRe259.test(t)) {
        directorialCount259++;
        if (firstDirLine259 < 0) firstDirLine259 = i + 1;
      }
    }
    if (directorialCount259 >= 3) {
      issues.push({
        location: `Action lines (first at line ${firstDirLine259})`,
        rule: 'DIRECTORIAL_INTRUSION',
        severity: 'minor',
        description: `${directorialCount259} action lines embed explicit camera or editing directions ("ANGLE ON", "WE SEE", "PAN", "ZOOM", "CLOSE ON"). A spec script directs the reader's eye through prose, not shot calls — naming the lens is the director's job. Overt camera direction dates the page and pulls the reader out of the story.`,
        suggestedFix: 'Translate camera direction into prose emphasis. Instead of "CLOSE ON the trembling hand", write a line that isolates it: "Her hand trembles. Just her hand." White space and sentence focus do the camera\'s work without claiming the director\'s chair.',
      });
    }
  }

  // ── Wave 273: EXCLAMATION_IN_ACTION ───────────────────────────────────────
  // Two or more action lines end with an exclamation mark. Exclamation marks in
  // stage directions are editorial intrusion — the writer is performing excitement
  // rather than writing it into the scene. Action prose should present events and
  // let them speak; an '!' in description tells the reader how to feel rather than
  // giving them something to feel. A single '!' might be a deliberate stylistic
  // accent; two or more signals a habit. Requires 8+ action lines.
  if (actionLines217.length >= 8) {
    const exclamActionCount273 = actionLines217.filter(t => t.endsWith('!')).length;
    if (exclamActionCount273 >= 2) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'EXCLAMATION_IN_ACTION',
        severity: 'minor',
        description: `${exclamActionCount273} action lines end with "!" — the writer is using exclamation marks in stage directions, editorializing rather than writing. Stage direction should present events; an exclamation mark tells the reader how to feel instead of giving them a scene to react to. When description shouts, it stops trusting the event.`,
        suggestedFix: 'Remove exclamation marks from action lines. If the scene needs to feel urgent or explosive, write the urgency into the verbs and imagery, not the punctuation. "The car explodes." is stronger than "The car explodes!". The event carries its own charge.',
      });
    }
  }

  // ── Wave 273: PARENTHETICAL_FLOOD ─────────────────────────────────────────
  // More than 30% of dialogue lines are parenthetical acting wrench directions
  // ("(beat)", "(laughs)", "(angrily)"). Parentheticals should be rare, used only
  // when the delivery is genuinely non-obvious from context; overusing them means
  // the writer does not trust the dialogue or the actor. A page heavy with wrench
  // directions reads as novice — experienced writers say it once in the words
  // and let the reading do the rest. Requires 10+ dialogue lines.
  {
    let parentheticalCount273 = 0;
    let dlgLineCount273 = 0;
    let inDlg273 = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg273 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg273 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg273 = true; continue; }
      if (!inDlg273) continue;
      if (/^\(/.test(t)) parentheticalCount273++;
      else dlgLineCount273++;
    }
    if (dlgLineCount273 >= 10 && parentheticalCount273 / dlgLineCount273 > 0.30) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'PARENTHETICAL_FLOOD',
        severity: 'minor',
        description: `${parentheticalCount273} parenthetical acting directions appear alongside ${dlgLineCount273} dialogue lines (${Math.round(parentheticalCount273 / dlgLineCount273 * 100)}%) — the writer is over-directing the actors. Parentheticals should be reserved for genuinely non-obvious delivery beats; this density signals a distrust of the dialogue and the cast.`,
        suggestedFix: 'Strip most parentheticals and let the words carry the delivery. If a line only lands with a specific tone, rewrite the line until it does the work itself. Reserve parentheticals for the rare beats where the written context could genuinely mislead a reader about how the line should land.',
      });
    }
  }

  // ── Wave 273: LOCATION_REPETITION ─────────────────────────────────────────
  // More than 70% of scene sluglines use the same location name. A story that
  // returns to one location for most of its scenes has no visual or spatial
  // variety — the screenplay becomes a stage play in disguise. Distinct from
  // SCENE_SLUG_TIME_MONOTONE (which tracks time-of-day); this tracks the
  // spatial world. Location repetition also often signals that the writer is
  // avoiding the work of staging new environments. Requires 6+ sluglines.
  {
    const locationCounts273 = new Map<string, number>();
    let totalSlugs273 = 0;
    for (const line of lines) {
      const t = line.trim();
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) {
        totalSlugs273++;
        const locStr273 = t
          .replace(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s*/i, '')
          .replace(/\s*[-–]\s*(DAY|NIGHT|DAWN|DUSK|MORNING|EVENING|AFTERNOON|CONTINUOUS|LATER|MOMENTS LATER).*$/i, '')
          .trim()
          .toLowerCase();
        if (locStr273) locationCounts273.set(locStr273, (locationCounts273.get(locStr273) ?? 0) + 1);
      }
    }
    if (totalSlugs273 >= 6 && locationCounts273.size > 0) {
      const sorted273 = [...locationCounts273.entries()].sort((a, b) => b[1] - a[1]);
      const topLoc273 = sorted273[0];
      if (topLoc273[1] / totalSlugs273 > 0.70) {
        issues.push({
          location: 'Scene slugline variety',
          rule: 'LOCATION_REPETITION',
          severity: 'minor',
          description: `${topLoc273[1]} of ${totalSlugs273} scenes (${Math.round(topLoc273[1] / totalSlugs273 * 100)}%) use the same location ("${topLoc273[0]}") — the story barely leaves one space. Without spatial variety the screenplay becomes a stage play: the same visual world, the same physical context, the same geography of tension. Distinct locations create distinct emotional registers.`,
          suggestedFix: 'Move at least a third of the scenes to different locations. Each new space carries its own lighting, sound, scale, and emotional charge — a kitchen confession feels different from a parking-lot confrontation, even with the same dialogue. Let the physical world diversify the story\'s emotional register.',
        });
      }
    }
  }

  // ── Wave 287: OPENING_WAKE_UP_CLICHE ─────────────────────────────────────
  // The first scene shows a character waking up — alarm clock, eyes opening,
  // bolting upright in bed. This is the most notorious opening cliché in
  // screenwriting: it starts the story at the character's lowest-information,
  // lowest-stakes moment and signals to readers that the writer began at the
  // literal beginning of a day rather than the dramatic beginning of a story.
  // Distinct from the cliché-phrase density check (which counts stock phrases
  // across the whole script): this is a structural check that fires on a
  // single occurrence confined to the opening scene. Requires 2+ scenes so a
  // deliberate single-scene vignette is not penalized.
  {
    const slugIdxs287: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(lines[i].trim())) slugIdxs287.push(i);
    }
    if (slugIdxs287.length >= 2) {
      const firstSceneText287 = lines.slice(slugIdxs287[0], slugIdxs287[1]).join('\n');
      const wakeUpRe287 = /\b(wakes? up|wakes with|waking up|alarm (clock|blares|buzzes|rings|goes off)|eyes (open|flutter open|snap open|blink open)|bolts upright|stirs awake|jolts awake)\b/i;
      if (wakeUpRe287.test(firstSceneText287)) {
        issues.push({
          location: 'Opening scene',
          rule: 'OPENING_WAKE_UP_CLICHE',
          severity: 'minor',
          description: 'The story opens with a character waking up — the most common opening cliché in screenwriting. A wake-up opening starts at the character\'s lowest-stakes, lowest-information moment and tells the reader the writer began at the literal start of a day rather than the dramatic start of a story.',
          suggestedFix: 'Open the story at the latest possible moment before the inciting incident: mid-action, mid-conversation, or mid-problem. If the waking moment is genuinely essential (a nightmare that matters, an unfamiliar room), make the disorientation the point — otherwise cut to the first scene where something is already at stake.',
        });
      }
    }
  }

  // ── Wave 287: DIALOGUE_EXCLAMATION_FLOOD ─────────────────────────────────
  // More than 25% of dialogue lines end with an exclamation mark. When
  // every emotion is shouted at the reader, nothing is shouted — the
  // exclamation mark loses all meaning and the script reads as uniformly
  // heightened. Real dramatic intensity is built through restraint; a single
  // exclamation mark in a quiet script lands harder than ten in a loud one.
  // Requires 10+ dialogue lines.
  {
    const dlgLines287: string[] = [];
    let inDialogue287 = false;
    for (const line of lines) {
      const t = line.trim();
      if (/^[A-Z][A-Z\s]{1,30}$/.test(t) && !/^(INT\.|EXT\.|FADE|CUT|DISSOLVE)/.test(t)) {
        inDialogue287 = true;
      } else if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) {
        inDialogue287 = false;
      } else if (inDialogue287 && t.length > 0 && !/^\(/.test(t)) {
        dlgLines287.push(t);
      }
    }
    if (dlgLines287.length >= 10) {
      const exclCount287 = dlgLines287.filter(l => l.endsWith('!')).length;
      if (exclCount287 / dlgLines287.length > 0.25) {
        issues.push({
          location: 'Dialogue exclamation marks',
          rule: 'DIALOGUE_EXCLAMATION_FLOOD',
          severity: 'minor',
          description: `${exclCount287} of ${dlgLines287.length} dialogue lines (${Math.round(exclCount287 / dlgLines287.length * 100)}%) end with an exclamation mark. When every line shouts, no line stands out — the reader becomes numb to the heightened register. Dramatic intensity is achieved through contrast, not volume.`,
          suggestedFix: 'Reserve exclamation marks for genuine outbursts — a sudden revelation, a direct threat, a moment of pure joy or terror. Remove the mark from lines that are merely emphatic; let the word choice and context carry the weight. Fewer exclamations mean each one lands.',
        });
      }
    }
  }

  // ── Wave 287: SLUG_INTERIOR_DOMINANCE ────────────────────────────────────
  // More than 85% of scene sluglines are INT. (interior) — no exterior world.
  // A screenplay that never ventures outside risks visual monotony: the same
  // walls, the same lighting conditions, the same sense of confinement. Even
  // stories that are thematically interior benefit from at least occasional
  // exterior breaks to signal the world beyond the characters' immediate
  // environment. Requires 6+ sluglines.
  {
    let totalSlugs287 = 0;
    let intSlugs287 = 0;
    for (const line of lines) {
      const t = line.trim();
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) {
        totalSlugs287++;
        if (/^INT\./i.test(t)) intSlugs287++;
      }
    }
    if (totalSlugs287 >= 6 && intSlugs287 / totalSlugs287 > 0.85) {
      issues.push({
        location: 'Scene slugline INT/EXT balance',
        rule: 'SLUG_INTERIOR_DOMINANCE',
        severity: 'minor',
        description: `${intSlugs287} of ${totalSlugs287} scenes (${Math.round(intSlugs287 / totalSlugs287 * 100)}%) are interior (INT.) — the story never escapes its walls. Without exterior scenes, the visual world is homogeneous: same lighting conditions, same spatial scale, same sensory palette. Even a single exterior scene resets the audience's spatial awareness.`,
        suggestedFix: 'Move at least one or two scenes outdoors: a confrontation in a parking lot, a phone call on a fire escape, a revelation at dawn. Exterior locations carry different light, sound, and scale — they signal that the story inhabits a world rather than a stage set.',
      });
    }
  }

  // ── Wave 301: MIRROR_SELF_GAZE_CLICHE ────────────────────────────────────
  // A character studies themselves in a mirror in two or more scenes. The
  // mirror gaze is screenwriting's stock shorthand for introspection and
  // identity crisis — used once it can work; recurring, it signals the writer
  // has no other tool for externalizing a character's inner state. Counts
  // scenes (not lines) containing a mirror-gaze beat.
  {
    const mirrorRe301 = /\b(in|into|at) the mirror\b|\bmirror reflects\b|\bstudies (his|her|their) reflection\b|\bstares at (his|her|their) reflection\b/i;
    let mirrorScenes301 = 0;
    let inScene301 = false;
    let sceneHasMirror301 = false;
    for (const line of lines) {
      const t = line.trim();
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) {
        if (inScene301 && sceneHasMirror301) mirrorScenes301++;
        inScene301 = true;
        sceneHasMirror301 = false;
      } else if (inScene301 && mirrorRe301.test(t)) {
        sceneHasMirror301 = true;
      }
    }
    if (inScene301 && sceneHasMirror301) mirrorScenes301++;
    if (mirrorScenes301 >= 2) {
      issues.push({
        location: 'Mirror beats across scenes',
        rule: 'MIRROR_SELF_GAZE_CLICHE',
        severity: 'minor',
        description: `${mirrorScenes301} scenes contain a character gazing at themselves in a mirror — screenwriting's stock shorthand for introspection. One mirror beat can land; recurring mirror-gazes signal that the script has a single tool for externalizing inner conflict, and the audience registers the device instead of the emotion.`,
        suggestedFix: 'Keep at most one mirror beat (or cut them all) and externalize self-confrontation through behavior instead: a character rehearsing what they\'ll say, avoiding a photograph, putting on or stripping off a uniform. Identity crisis shows best in what a character does to be seen — or not seen — by others.',
      });
    }
  }

  // ── Wave 301: WEATHER_OPENER_CRUTCH ──────────────────────────────────────
  // Three or more scenes open with a weather or atmosphere line ("Rain
  // hammers the windows.", "Thunder rolls in the distance."). Weather as a
  // recurring scene-opener is pathetic-fallacy shorthand — mood assigned by
  // forecast rather than dramatized through character and action. Checks the
  // first non-empty line after each slugline.
  {
    const weatherRe301 = /\b(rain|rains|raining|thunder|lightning|snow|snows|snowing|fog|mist|wind|winds|storm|drizzle|downpour|clouds?|overcast|sleet|hail)\b/i;
    let weatherOpeners301 = 0;
    for (let i = 0; i < lines.length; i++) {
      if (!/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(lines[i].trim())) continue;
      for (let j = i + 1; j < lines.length; j++) {
        const t = lines[j].trim();
        if (!t) continue;
        if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) break;
        if (weatherRe301.test(t)) weatherOpeners301++;
        break;
      }
    }
    if (weatherOpeners301 >= 3) {
      issues.push({
        location: 'Scene openings',
        rule: 'WEATHER_OPENER_CRUTCH',
        severity: 'minor',
        description: `${weatherOpeners301} scenes open with a weather or atmosphere line — mood is being assigned by forecast. Recurring weather openers are pathetic-fallacy shorthand: rain for sadness, thunder for dread. The audience reads the device, and the scenes' actual emotional content gets outsourced to the sky.`,
        suggestedFix: 'Open scenes on character and action; let weather appear only when it materially affects the scene (a storm that strands someone, heat that frays tempers). If atmosphere matters, embed it in behavior — a character shaking out an umbrella says rain and tells us something about them in the same beat.',
      });
    }
  }

  // ── Wave 301: JUST_A_DREAM_REVEAL ────────────────────────────────────────
  // The script dismisses dramatized events as "just a dream" — the oldest
  // fake-out in the book. Retroactively cancelling scenes the audience
  // invested in teaches them not to trust anything they see; the device
  // spends narrative credibility for one jolt. Fires on a single occurrence
  // because one is already one too many in most scripts.
  {
    const dreamRe301 = /\b(it was (all )?(just |only )?a dream|only a dream|just a dream|wakes? (up )?(gasping|screaming|with a start)[^.]*\.? ?(it was|just) a (dream|nightmare))\b/i;
    const dreamLine301 = lines.findIndex(l => dreamRe301.test(l));
    if (dreamLine301 !== -1) {
      issues.push({
        location: `Line ${dreamLine301 + 1}`,
        rule: 'JUST_A_DREAM_REVEAL',
        severity: 'minor',
        description: 'The script dismisses dramatized events as "just a dream" — a fake-out that retroactively cancels scenes the audience invested in. Once a story plays this card, viewers learn to withhold belief from everything that follows; the single jolt costs the script its standing credibility.',
        suggestedFix: 'If the dream content matters, present it honestly as a dream or vision from the start and let its meaning — not its reveal — carry the scene. If it exists only to fake out the audience, cut it and dramatize the fear it represented in the waking story, where consequences are real.',
      });
    }
  }

  // ── Wave 315: BODY_LANGUAGE_CLICHE_OVERUSE, SLUG_GENERIC_LOCATION, FLASHBACK_CRUTCH ──

  // BODY_LANGUAGE_CLICHE_OVERUSE (minor, ≥10 action lines): More than 20% of
  // action lines use stock body language (nods, shrugs, sighs, smiles, grins,
  // chuckles, snorts, blinks, rolls eyes, raises eyebrows). These default
  // gestures are the physical equivalent of emotion-naming — any character in
  // any story could nod or shrug; the gesture carries no individual texture.
  // Distinct from REACTION_SHOT_OVERUSE (terse full-line reactions),
  // EMOTION_NAMING_IN_ACTION (naming emotional states), COGNITION_IN_ACTION
  // (mental verbs).
  {
    let actionLines315b = 0;
    let bodyClicheCount315 = 0;
    let inDlg315b = false;
    const bodyClicheRe315 = /\b(?:nods?|shrugs?|sighs?|smiles?|grins?|chuckles?|snorts?|blinks?|rolls? (?:his|her|their) eyes?|raises? (?:his|her|their|an?) eyebrows?)\b/i;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg315b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg315b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg315b = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg315b) continue;
      actionLines315b++;
      if (bodyClicheRe315.test(t)) bodyClicheCount315++;
    }
    if (actionLines315b >= 10 && bodyClicheCount315 / actionLines315b > 0.2) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'BODY_LANGUAGE_CLICHE_OVERUSE',
        severity: 'minor',
        description: `${bodyClicheCount315} of ${actionLines315b} action lines (${Math.round(bodyClicheCount315 / actionLines315b * 100)}%) use stock body language (nods, shrugs, sighs, smiles, rolls eyes, etc.) — the physical vocabulary of a generic screenplay. These default gestures carry no individual texture: any character in any situation could nod or shrug. Physical specificity is character.`,
        suggestedFix: "Replace stock gestures with specific physical behaviour: instead of \"He nods\", write \"He runs his thumb along the edge of the table, once.\" The idiosyncratic gesture reveals character; the stock gesture merely confirms that an emotion occurred.",
      });
    }
  }

  // SLUG_GENERIC_LOCATION (minor, ≥6 sluglines, >60% generic): More than 60%
  // of scene sluglines use entirely generic location labels (ROOM, OFFICE,
  // CAR, HOUSE, BUILDING, STREET, ALLEY, CORRIDOR, HALLWAY, LOBBY, APARTMENT,
  // BEDROOM, KITCHEN, WAREHOUSE, BASEMENT, ATTIC, ROOFTOP, GARAGE). Generic
  // labels are placeholders, not places — they give the reader nothing to
  // inhabit. Distinct from LOCATION_REPETITION and REPEATED_LOCATION_EXCESS
  // (those fire when the same specific place recurs); this fires when locations
  // are unnamed and interchangeable as a class.
  {
    const slugs315g: string[] = [];
    const genericLocRe315 = /^(?:INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s+(?:A |THE |AN )?(?:SMALL |LARGE |DARK |EMPTY |OLD |NEW |ABANDONED )?(ROOM|OFFICE|CAR|HOUSE|BUILDING|STREET|ALLEY|CORRIDOR|HALLWAY|LOBBY|APARTMENT|BEDROOM|KITCHEN|WAREHOUSE|BASEMENT|ATTIC|ROOFTOP|GARAGE)\s*[-–]/i;
    for (const line of lines) {
      const t = line.trim();
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) slugs315g.push(t);
    }
    if (slugs315g.length >= 6) {
      const genericCount315 = slugs315g.filter(s => genericLocRe315.test(s)).length;
      if (genericCount315 / slugs315g.length > 0.6) {
        issues.push({
          location: 'Scene sluglines',
          rule: 'SLUG_GENERIC_LOCATION',
          severity: 'minor',
          description: `${genericCount315} of ${slugs315g.length} scene sluglines (${Math.round(genericCount315 / slugs315g.length * 100)}%) use generic location labels (ROOM, OFFICE, BUILDING, STREET, etc.) — placeholders rather than places. A screenplay grounds the audience in specific geography: "INT. MARA\'S CLUTTERED REPAIR SHOP - NIGHT" anchors the scene; "INT. ROOM - NIGHT" gives them a void.`,
          suggestedFix: "Give every location a specific name that carries information: the name of an establishment, a character, or a defining feature. Even a modest space earns texture when named — \"INT. THE BROKEN COMPASS BAR - NIGHT\" is a setting; \"INT. BAR - NIGHT\" is an empty stage.",
        });
      }
    }
  }

  // FLASHBACK_CRUTCH (minor, ≥4 markers): Four or more explicit flashback
  // transition markers (FLASHBACK:, BEGIN FLASHBACK:, END FLASHBACK:, BACK TO:,
  // RETURN TO:) signal a script structured around fragmented memory rather than
  // present-tense causality. Flashbacks in bulk replace forward-moving story
  // with accumulated explanation; the audience inhabits the past instead of the
  // present and forward momentum evaporates. Distinct from JUST_A_DREAM_REVEAL
  // (fake-out reveals) and OPENING_WAKE_UP_CLICHE (first-scene awakening).
  {
    const flashbackRe315 = /^(FLASHBACK[:\.]?|BEGIN FLASHBACK[:\.]?|START FLASHBACK[:\.]?|END FLASHBACK[:\.]?|BACK TO[:\.]?|RETURN TO[:\.]?|FLASH BACK[:\.]?|FLASHBACK TO[:\.]?)/i;
    const fbCount315 = lines.filter(l => flashbackRe315.test(l.trim())).length;
    if (fbCount315 >= 4) {
      issues.push({
        location: `${fbCount315} flashback markers throughout`,
        rule: 'FLASHBACK_CRUTCH',
        severity: 'minor',
        description: `${fbCount315} explicit flashback transitions (FLASHBACK:, END FLASHBACK, BACK TO:, etc.) signal a script structured around fragmented memory. Flashbacks in bulk replace forward-moving causality with accumulated explanation — the audience experiences events after the fact rather than in the present tense. Sustained use trains the audience that the current scene is provisional.`,
        suggestedFix: 'Flatten the temporal structure: dramatize as much as possible in present-tense sequence, where actions have immediate consequences. When the past matters, let characters carry it in behaviour rather than revisiting it directly — the scar is more powerful than the wound.',
      });
    }
  }

  // ── Wave 326: MONTAGE_CRUTCH ─────────────────────────────────────────────
  // Two or more montage markers ("MONTAGE:", "BEGIN MONTAGE", "montage of …").
  // A montage compresses effort, training, or the passage of time into a
  // sequence of glimpses — useful once, but leaned on repeatedly it skips
  // exactly the dramatized struggle that earns a story's turns. Distinct from
  // FLASHBACK_CRUTCH (temporal flashback markers) and TIME_CARD_CRUTCH (caption
  // jumps): this fires on montage devices specifically.
  {
    const montageRe326 = /^(MONTAGE\b|BEGIN MONTAGE\b|END MONTAGE\b|MONTAGE:|A MONTAGE\b)|\bmontage of\b/i;
    const montageCount326 = lines.filter(l => montageRe326.test(l.trim())).length;
    if (montageCount326 >= 2) {
      issues.push({
        location: `${montageCount326} montage markers`,
        rule: 'MONTAGE_CRUTCH',
        severity: 'minor',
        description: `${montageCount326} montage sequences appear in the script. A montage compresses effort, training, or elapsed time into a string of glimpses — it works once as a deliberate device, but leaned on repeatedly it skips the dramatized struggle that earns a story's turns. Each montage is a stretch the audience watches summarized rather than experienced.`,
        suggestedFix: 'Keep at most one montage and dramatize the rest: pick the single most important beat inside each montage and play it as a full scene with stakes and consequence. The work a character does is more compelling shown in one hard scene than glimpsed across a dozen quick cuts.',
      });
    }
  }

  // ── Wave 326: TITLE_CARD_CRUTCH ──────────────────────────────────────────
  // Three or more on-screen text cards ("SUPER:", "TITLE:", "CHYRON:",
  // "SUBTITLE:", "TEXT ON SCREEN"). Printed text that delivers information the
  // story should dramatize is a crutch — it tells the audience facts (dates,
  // places, stakes) the scenes ought to convey. Distinct from FLASHBACK_CRUTCH
  // and MONTAGE_CRUTCH: this fires on superimposed-text devices.
  {
    const titleCardRe326 = /^(SUPER:|SUPERIMPOSE:|TITLE:|TITLE CARD:|CHYRON:|SUBTITLE:|CAPTION:|TEXT ON SCREEN|ON SCREEN TEXT|INTERTITLE:)/i;
    const titleCardCount326 = lines.filter(l => titleCardRe326.test(l.trim())).length;
    if (titleCardCount326 >= 3) {
      issues.push({
        location: `${titleCardCount326} on-screen text cards`,
        rule: 'TITLE_CARD_CRUTCH',
        severity: 'minor',
        description: `${titleCardCount326} on-screen text cards (SUPER:, TITLE:, CHYRON:, etc.) appear in the script. Printed text delivering dates, places, or stakes is a crutch: it hands the audience facts the scenes themselves should convey. A story that repeatedly superimposes its information has stopped trusting its own images to carry meaning.`,
        suggestedFix: 'Convert most text cards into dramatized information: establish a location through a recognizable detail in the frame, a time jump through changed circumstances, a stakes update through a character\'s reaction. Reserve on-screen text for the rare fact no scene can naturally show.',
      });
    }
  }

  // ── Wave 326: TIME_CARD_CRUTCH ───────────────────────────────────────────
  // Three or more standalone temporal-jump captions ("THREE WEEKS LATER",
  // "MEANWHILE", "TWO YEARS EARLIER", "DAYS LATER", "ELSEWHERE", "LATER THAT
  // NIGHT"). Frequent jump captions manage time and space by announcement
  // rather than by storytelling — the script narrates its own structure
  // instead of letting transitions read from the scenes. Distinct from
  // TITLE_CARD_CRUTCH (superimposed exposition text) and MONTAGE_CRUTCH.
  {
    const timeCardRe326 = /^((MOMENTS|HOURS|DAYS|WEEKS|MONTHS|YEARS|SECONDS|MINUTES) LATER|(THREE|TWO|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|A FEW|SEVERAL|MANY) (DAYS|WEEKS|MONTHS|YEARS|HOURS|MINUTES) (LATER|EARLIER|AGO)|MEANWHILE|ELSEWHERE|LATER THAT (NIGHT|DAY|EVENING|MORNING|AFTERNOON)|EARLIER THAT (NIGHT|DAY|EVENING|MORNING)|THE NEXT (DAY|MORNING|NIGHT|WEEK|YEAR)|SOME TIME LATER|YEARS EARLIER|YEARS LATER)\.?$/i;
    const timeCardCount326 = lines.filter(l => timeCardRe326.test(l.trim())).length;
    if (timeCardCount326 >= 3) {
      issues.push({
        location: `${timeCardCount326} time-jump captions`,
        rule: 'TIME_CARD_CRUTCH',
        severity: 'minor',
        description: `${timeCardCount326} standalone time-jump captions ("THREE WEEKS LATER", "MEANWHILE", "LATER THAT NIGHT") appear in the script. Frequent jump captions manage time and space by announcement rather than by storytelling — the script narrates its own structure instead of letting the transitions read from the scenes themselves. Each caption is a seam the audience is told about rather than carried across.`,
        suggestedFix: 'Let most transitions read from the scenes: a change of season in the frame, a healed wound, a different set of clothes, a line of dialogue that anchors the new moment. Reserve explicit time captions for jumps so large or specific that no visual cue could convey them.',
      });
    }
  }

  // ── Wave 340: VOICEOVER_CRUTCH ───────────────────────────────────────────
  // Four or more (V.O.) voiceover cues. A character speaking in voiceover narrates
  // what the scene should dramatize — leaned on, it becomes the writer telling the
  // story aloud instead of staging it. One framing voiceover can work; four or more
  // signals a script that explains itself rather than trusting its images and action.
  // Distinct from INTERIOR_MONOLOGUE_LEAK (interior thought described in action lines,
  // not a spoken-narration cue) and DIRECTORIAL_INTRUSION (camera/shot calls).
  {
    const voRe340 = /\(\s*V\.?\s*O\.?\s*\)/i;
    const voCount340 = lines.filter(l => voRe340.test(l.trim())).length;
    if (voCount340 >= 4) {
      issues.push({
        location: `${voCount340} voiceover cues`,
        rule: 'VOICEOVER_CRUTCH',
        severity: 'minor',
        description: `${voCount340} (V.O.) voiceover cues appear in the script. Voiceover narration delivers in words what the scene should deliver in image and action — used heavily, it becomes the writer telling the story aloud rather than staging it, so the audience is informed of events instead of experiencing them. A single framing voiceover can serve a story; a script that returns to narration repeatedly has stopped trusting its own scenes to carry meaning.`,
        suggestedFix: 'Dramatize what the voiceover narrates: convert the spoken summary into an action the audience watches, a line of in-scene dialogue, or a visual detail that makes the point without comment. Reserve voiceover for the rare interior truth no scene could externalize, and let the images carry the rest.',
      });
    }
  }

  // ── Wave 340: BEAT_DIRECTION_OVERUSE ─────────────────────────────────────
  // Four or more standalone "(beat)" parentheticals. "(beat)" is the single most
  // overused stage direction — a generic pause inserted to manufacture rhythm the
  // dialogue should create on its own. Even when overall parenthetical density is
  // within range (so PARENTHETICAL_FLOOD does not fire), a script that reaches for
  // "(beat)" again and again is papering over flat exchanges with typographic pauses.
  // Distinct from PARENTHETICAL_FLOOD (a ratio of ALL parentheticals to dialogue
  // lines): this fires on the specific "(beat)" tic regardless of overall density.
  {
    const beatRe340 = /^\(\s*(a\s+|another\s+|long\s+|short\s+|brief\s+|small\s+)?beat\s*\.?\s*\)$/i;
    const beatCount340 = lines.filter(l => beatRe340.test(l.trim())).length;
    if (beatCount340 >= 4) {
      issues.push({
        location: `${beatCount340} "(beat)" directions`,
        rule: 'BEAT_DIRECTION_OVERUSE',
        severity: 'minor',
        description: `${beatCount340} standalone "(beat)" parentheticals appear in the script. "(beat)" is screenwriting's most overused stage direction — a generic pause dropped in to manufacture rhythm the dialogue should create on its own. Reaching for it repeatedly papers over flat exchanges with typographic silence: the pause is asserted on the page rather than earned by what the characters say and withhold.`,
        suggestedFix: 'Cut most "(beat)" directions and build the pause into the writing instead: a short reply against a long one, a question left unanswered, a physical action that interrupts the rhythm. When a silence genuinely matters, dramatize what fills it — a look, a turn away — rather than labeling the gap.',
      });
    }
  }

  // ── Wave 340: SMASH_CUT_OVERUSE ──────────────────────────────────────────
  // Three or more dramatic cut transitions ("SMASH CUT TO:", "HARD CUT TO:",
  // "QUICK CUT TO:", "MATCH CUT TO:", "JUMP CUT TO:", "SHOCK CUT TO:"). A plain
  // "CUT TO:" is invisible standard formatting; the emphatic variants are editorial
  // punctuation meant to jolt. Sprinkled throughout, they stop jolting and start
  // reading as the writer shouting for impact the scenes should generate themselves.
  // Distinct from DIRECTORIAL_INTRUSION (camera/shot calls inside action lines) and
  // from TITLE_CARD_CRUTCH / TIME_CARD_CRUTCH (on-screen text and time captions).
  {
    const smashRe340 = /^(SMASH|HARD|QUICK|MATCH|JUMP|SHOCK)\s+CUT\s+(TO|IN|BACK)\s*:?\.?$/i;
    const smashCount340 = lines.filter(l => smashRe340.test(l.trim())).length;
    if (smashCount340 >= 3) {
      issues.push({
        location: `${smashCount340} dramatic cut transitions`,
        rule: 'SMASH_CUT_OVERUSE',
        severity: 'minor',
        description: `${smashCount340} emphatic cut transitions ("SMASH CUT TO:", "HARD CUT TO:", "MATCH CUT TO:") appear in the script. A plain "CUT TO:" is invisible standard formatting; the emphatic variants are editorial punctuation meant to jolt the reader. Sprinkled throughout, they stop jolting and start reading as the writer shouting for an impact the scenes should generate on their own — the transition is asked to carry a charge the cut-from and cut-to images have not built.`,
        suggestedFix: 'Reserve a SMASH CUT for the one or two transitions whose collision genuinely lands a shock, and let the rest be ordinary cuts. Impact comes from the contrast between what precedes and follows the cut, not from the capitalized label; build the jolt into the juxtaposition of images and the transition will feel hard without being announced.',
      });
    }
  }

  // ── Wave 354: FADE_TRANSITION_OVERUSE ────────────────────────────────────
  // Four or more soft-transition markers ("FADE IN", "FADE OUT", "FADE TO BLACK",
  // "DISSOLVE TO", "CROSS DISSOLVE"). A FADE IN to open and a FADE OUT to close are
  // standard; beyond that, fades and dissolves are the writer punctuating their own
  // structure — each soft transition tells the reader "time passes / mood shifts" rather
  // than letting the scenes imply it. A script full of fades reads as a string of vignettes
  // smeared together. Distinct from SMASH_CUT_OVERUSE (hard cuts), TIME_CARD_CRUTCH
  // (caption text), and MONTAGE_CRUTCH.
  {
    const fadeRe354 = /^(FADE IN|FADE OUT|FADE TO( BLACK| WHITE)?|FADE UP|DISSOLVE TO|CROSS ?DISSOLVE( TO)?)\s*:?\.?$/i;
    const fadeCount354 = lines.filter(l => fadeRe354.test(l.trim())).length;
    if (fadeCount354 >= 4) {
      issues.push({
        location: `${fadeCount354} fade/dissolve transitions`,
        rule: 'FADE_TRANSITION_OVERUSE',
        severity: 'minor',
        description: `${fadeCount354} soft-transition markers ("FADE IN", "FADE OUT", "DISSOLVE TO") appear in the script. A FADE IN to open and a FADE OUT to close are standard; beyond that, fades and dissolves are the writer punctuating their own structure, each one telling the reader "time passes" or "mood shifts" rather than letting the scenes imply it. A script full of fades reads as a string of vignettes smeared together instead of a continuous drama.`,
        suggestedFix: 'Keep the opening FADE IN and closing FADE OUT and cut the rest. Let scenes hard-cut into one another and trust the change of location, time-of-day, or circumstance to signal the transition; reserve a dissolve for the rare moment the soft blur itself carries meaning.',
      });
    }
  }

  // ── Wave 354: DREAM_SEQUENCE_CRUTCH ──────────────────────────────────────
  // Two or more explicit dream/fantasy/nightmare sequence markers. A labeled unreality
  // sequence is a device for externalizing interior states; used more than once it becomes
  // a crutch for delivering symbolism or backstory the waking story should dramatize, and
  // it repeatedly suspends the stakes (nothing in a dream is real). Distinct from JUST_A_
  // DREAM_REVEAL (events retroactively dismissed as a dream) and FLASHBACK_CRUTCH (past-
  // event inserts): this fires on explicitly labeled dream/fantasy sequences.
  {
    const dreamRe354 = /\b(dream sequence|fantasy sequence|nightmare sequence|begin dream|end dream)\b/i;
    const dreamCount354 = lines.filter(l => dreamRe354.test(l.trim())).length;
    if (dreamCount354 >= 2) {
      issues.push({
        location: `${dreamCount354} dream/fantasy sequence markers`,
        rule: 'DREAM_SEQUENCE_CRUTCH',
        severity: 'minor',
        description: `${dreamCount354} explicit dream, fantasy, or nightmare sequence markers appear in the script. A labeled unreality sequence externalizes interior states, but leaned on repeatedly it becomes a crutch for delivering symbolism or backstory the waking story should dramatize — and each one suspends the stakes, since nothing inside a dream is real. The audience learns to discount whatever happens once the label appears.`,
        suggestedFix: 'Keep at most one dream/fantasy sequence and externalize the rest through waking behavior: the fear a nightmare would show can surface as a waking flinch, an avoided room, a compulsive habit. Interior life reads strongest when it leaks into real action with real consequences, not when it is quarantined in a sequence the audience knows does not count.',
      });
    }
  }

  // ── Wave 354: INTERCUT_OVERUSE ───────────────────────────────────────────
  // Three or more "INTERCUT" markers. Intercutting is a powerful tool for parallel
  // action (a phone call, a race against a clock), but heavy reliance on it is a tell that
  // scenes cannot stand on their own — the writer keeps cross-cutting to manufacture
  // momentum that individual scenes lack, and the audience is shuttled between locations
  // rather than allowed to settle into any of them. Distinct from MONTAGE_CRUTCH (compressed
  // time) and SMASH_CUT_OVERUSE (single hard transitions).
  {
    const intercutRe354 = /\bintercut\b/i;
    const intercutCount354 = lines.filter(l => intercutRe354.test(l.trim())).length;
    if (intercutCount354 >= 3) {
      issues.push({
        location: `${intercutCount354} intercut markers`,
        rule: 'INTERCUT_OVERUSE',
        severity: 'minor',
        description: `${intercutCount354} "INTERCUT" markers appear in the script. Intercutting is powerful for genuine parallel action, but heavy reliance on it signals that scenes cannot stand on their own — the writer keeps cross-cutting to manufacture momentum the individual scenes lack, shuttling the audience between locations rather than letting them settle into any one. Pervasive intercutting fragments attention instead of building tension.`,
        suggestedFix: 'Reserve intercutting for the one or two sequences where the parallel timelines genuinely collide or race each other. Elsewhere, let each scene play to its own end and trust ordinary sequencing; if a scene needs an intercut to stay alive, the scene itself likely needs strengthening.',
      });
    }
  }

  // ── Wave 368: OFF_SCREEN_CUE_OVERUSE ─────────────────────────────────────
  // Four or more (O.S.) or (O.C.) off-screen / off-camera dialogue cues. A voice
  // from off-frame is a legitimate tool — a call from the next room, an unseen
  // speaker — but leaned on repeatedly it signals the writer keeps placing speakers
  // outside the frame rather than staging them in it, so the scene's geography goes
  // soft and characters become disembodied voices. Distinct from VOICEOVER_CRUTCH
  // ((V.O.) narration laid over the image — this is in-scene off-frame speech).
  {
    const offScreenRe368 = /\((O\.?S\.?|O\.?C\.?)\)/i;
    const offScreenCount368 = lines.filter(l => offScreenRe368.test(l.trim())).length;
    if (offScreenCount368 >= 4) {
      issues.push({
        location: `${offScreenCount368} off-screen (O.S./O.C.) cues`,
        rule: 'OFF_SCREEN_CUE_OVERUSE',
        severity: 'minor',
        description: `${offScreenCount368} dialogue cues are marked off-screen or off-camera ((O.S.)/(O.C.)). A voice from off-frame is a fine occasional tool, but leaned on this heavily it signals the writer keeps placing speakers outside the frame rather than staging them within it — the scene's geography softens and characters dissolve into disembodied voices the audience can't locate.`,
        suggestedFix: 'Bring most speakers into the frame: stage the confrontation in one room where both characters are visible, so the scene plays as embodied action rather than a voice answering from elsewhere. Reserve (O.S.) for the moments where the speaker\'s unseen position is itself dramatic — the threat in the dark, the voice behind the door.',
      });
    }
  }

  // ── Wave 368: CONTINUOUS_SLUG_OVERUSE ────────────────────────────────────
  // Three or more sluglines whose time-of-day field is a continuity tag
  // ("CONTINUOUS", "MOMENTS LATER", "SAME", "LATER", "CONT'D"). These tags mark a
  // scene that is really a continuation of the previous one — used heavily, they
  // reveal a sequence that has been chopped into fragments by location changes
  // rather than genuinely distinct scenes, so the scene count inflates without the
  // story actually moving. Distinct from SCENE_SLUG_TIME_MONOTONE (DAY/NIGHT
  // monotony) and LOCATION_REPETITION (repeated location names).
  {
    const continuousSlugRe368 = /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.).*[-—]\s*(CONTINUOUS|MOMENTS LATER|SAME(?: TIME)?|LATER|CONT'?D)\s*$/i;
    const continuousCount368 = lines.filter(l => continuousSlugRe368.test(l.trim())).length;
    if (continuousCount368 >= 3) {
      issues.push({
        location: `${continuousCount368} continuity-tagged sluglines`,
        rule: 'CONTINUOUS_SLUG_OVERUSE',
        severity: 'minor',
        description: `${continuousCount368} sluglines use a continuity tag ("CONTINUOUS", "MOMENTS LATER", "SAME", "LATER") as their time field. Each tag marks a scene that is really a continuation of the one before it; used this often, they reveal a single sequence chopped into fragments by location changes rather than a series of genuinely distinct scenes. The scene count inflates while the story stays in place.`,
        suggestedFix: 'Consolidate continuity-tagged fragments into their parent scenes, or give each a real time jump and dramatic purpose. If three scenes are all "CONTINUOUS", they are one scene playing across rooms — write them as one continuous beat, and reserve a new slugline for a genuine shift in time, place, or intent.',
      });
    }
  }

  // ── Wave 368: BACK_TO_SCENE_CRUTCH ───────────────────────────────────────
  // Two or more "BACK TO SCENE" / "RESUME SCENE" / "BACK TO PRESENT" return
  // markers. These mark the return from a flashback, dream, or intercut — and their
  // proliferation reveals a script that keeps stepping out of its own present-tense
  // timeline and having to climb back in. Each departure-and-return interrupts the
  // forward drive of the main scene. Distinct from FLASHBACK_CRUTCH (the transition
  // INTO the past) and INTERCUT_OVERUSE (the cross-cut markers): this counts the
  // return-to-the-main-line markers specifically.
  {
    const backToRe368 = /^(BACK TO SCENE|BACK TO PRESENT|BACK TO REALITY|RESUME SCENE|RESUME ON|RETURN TO SCENE|PRESENT DAY)\s*:?\.?$/i;
    const backToCount368 = lines.filter(l => backToRe368.test(l.trim())).length;
    if (backToCount368 >= 2) {
      issues.push({
        location: `${backToCount368} back-to-scene return markers`,
        rule: 'BACK_TO_SCENE_CRUTCH',
        severity: 'minor',
        description: `${backToCount368} "BACK TO SCENE" / "RESUME SCENE" return markers appear in the script. Each one marks a return from a flashback, dream, or aside back into the present-tense timeline — their proliferation reveals a story that keeps stepping out of its own main line and having to climb back in. Every departure-and-return interrupts the forward drive of the scene the audience is actually invested in.`,
        suggestedFix: 'Reduce the number of departures from the present timeline: fold the information delivered in the inserts into present-tense action and dialogue. A story that has to keep announcing "BACK TO SCENE" is spending too much time away from the scene; the fewer round-trips out of the now, the stronger the through-line.',
      });
    }
  }

  // ── Wave 382: CHAPTER_LABEL_CRUTCH ───────────────────────────────────────
  // Three or more standalone chapter/part/book segment headings ("CHAPTER ONE",
  // "PART TWO", "BOOK III"). Segmenting a film into titled chapters is a novelistic
  // device — a handful of directors wield it as style, but as a default it imposes
  // literary structure on a medium that flows continuously, and it lets the writer
  // announce act breaks the drama should make the audience feel. Distinct from TITLE_
  // CARD_CRUTCH (SUPER:/TITLE:/CHYRON: on-screen text) and TIME_CARD_CRUTCH (time-jump
  // captions): this targets enumerated segment headings.
  {
    const chapterRe382 = /^(chapter|part|book)\s+([0-9]+|[ivxlcdm]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/i;
    const chapterCount382 = lines.filter(l => chapterRe382.test(l.trim())).length;
    if (chapterCount382 >= 3) {
      issues.push({
        location: `${chapterCount382} chapter/part segment headings`,
        rule: 'CHAPTER_LABEL_CRUTCH',
        severity: 'minor',
        description: `${chapterCount382} standalone chapter/part headings ("CHAPTER ONE", "PART TWO") segment the script. Titling a film into chapters is a novelistic device — a few directors wield it as deliberate style, but as a default it imposes literary structure on a continuously flowing medium and lets the writer announce act breaks the drama should make the audience feel rather than read.`,
        suggestedFix: 'Cut the chapter headings and let the act structure emerge from the story\'s turns: a strong inciting incident, midpoint, and climax mark the movements without labels. Reserve titled chapters for the rare case where the segmentation is itself a thematic statement, not a substitute for dramatic shaping.',
      });
    }
  }

  // ── Wave 382: SPLIT_SCREEN_CRUTCH ────────────────────────────────────────
  // Two or more "SPLIT SCREEN" markers. Split screen is a striking device for
  // genuine simultaneity (two ends of a phone call, a race converging), but reached
  // for repeatedly it becomes a gimmick that manufactures parallelism the writing
  // could achieve through cutting, and it signals scenes that cannot generate their
  // own momentum. Distinct from INTERCUT_OVERUSE (cross-cutting between full scenes)
  // and MONTAGE_CRUTCH (compressed time).
  {
    const splitScreenRe382 = /\bsplit[\s-]?screen\b/i;
    const splitCount382 = lines.filter(l => splitScreenRe382.test(l.trim())).length;
    if (splitCount382 >= 2) {
      issues.push({
        location: `${splitCount382} split-screen markers`,
        rule: 'SPLIT_SCREEN_CRUTCH',
        severity: 'minor',
        description: `${splitCount382} "SPLIT SCREEN" markers appear in the script. Split screen is striking for genuine simultaneity — two ends of a call, converging races — but reached for repeatedly it becomes a gimmick that manufactures parallelism ordinary cutting would achieve, and it signals scenes leaning on a visual trick rather than their own momentum. Pervasive split-screen also pre-empts the director's staging choices.`,
        suggestedFix: 'Reserve split screen for the one or two moments where seeing both frames at once is the dramatic point. Elsewhere, trust intercutting or sequencing to carry the parallel action; if a beat needs split screen to work, the underlying scenes likely need strengthening.',
      });
    }
  }

  // ── Wave 382: MATCH_CUT_OVERUSE ──────────────────────────────────────────
  // Three or more "MATCH CUT TO" transitions. A match cut is a precise editing
  // figure — a graphic or thematic rhyme across a cut — and a spec script directs
  // the reader through prose, not editing calls. Used heavily it both claims the
  // editor's chair and dilutes the device, since a match cut lands only when it is
  // rare. Distinct from SMASH_CUT_OVERUSE (a hard, jarring cut for impact) and FADE_
  // TRANSITION_OVERUSE (soft fades/dissolves).
  {
    const matchCutRe382 = /\bmatch cut\b/i;
    const matchCutCount382 = lines.filter(l => matchCutRe382.test(l.trim())).length;
    if (matchCutCount382 >= 3) {
      issues.push({
        location: `${matchCutCount382} match-cut transitions`,
        rule: 'MATCH_CUT_OVERUSE',
        severity: 'minor',
        description: `${matchCutCount382} "MATCH CUT TO" transitions appear in the script. A match cut is a precise editing figure — a graphic or thematic rhyme bridging a cut — and a spec script directs the reader through prose, not editing calls. Used heavily it both claims the editor's chair and dilutes the device itself, since a match cut lands only when it is rare and surprising.`,
        suggestedFix: 'Keep at most one match cut, for the moment the visual rhyme genuinely carries meaning, and let the rest of the transitions be ordinary cuts the prose implies. Calling for repeated match cuts on the page reads as a writer art-directing the edit rather than telling the story.',
      });
    }
  }

  // ── Wave 396: REVELATION_PURPOSE_MONOTONE, DIALOGUE_SHORT_LINE_DOMINANCE, DIALOGUE_QUESTION_DROUGHT ──

  // REVELATION_PURPOSE_MONOTONE (minor, n≥8, ≥3 revelation scenes all same purpose):
  // All revelation scenes serve an identical structural function — the story deploys
  // disclosure formulaically, as if reveals belong only in one type of moment.
  // Co-occurrence mode × revelation channel × purpose channel. Distinct from
  // UNIFORM_SCENE_PURPOSES (all scenes unfiltered, no revelation filter applied),
  // PURPOSE_BOOKEND_REPEAT (bookend comparison Act 1 vs Act 3 dominant purpose),
  // and SCENE_PURPOSE_MONOTONE_ACT3 (Act 3 zone × action-scene functional label).
  if (records.length >= 8) {
    const revelRecs396a = (records as any[]).filter(r => r.revelation === true);
    if (revelRecs396a.length >= 3) {
      const firstPurp396a = revelRecs396a[0].purpose as string;
      const allSamePurp396a = revelRecs396a.every(r => r.purpose === firstPurp396a);
      if (allSamePurp396a) {
        issues.push({
          location: 'Revelation scenes — purpose monotone',
          rule: 'REVELATION_PURPOSE_MONOTONE',
          severity: 'minor',
          description: `All ${revelRecs396a.length} revelation scenes share the same dramatic purpose ("${firstPurp396a}"). When every disclosure serves the same structural function, reveals feel formulaic — each one lands in the same type of moment, carrying the same dramatic weight, with no register shift between them. Variety in how revelations are deployed is what makes each feel inevitable in retrospect yet surprising in the moment.`,
          suggestedFix: 'Let revelations land in scenes with different dramatic purposes — some during conflict, some in quieter development moments, some at turning points. A disclosure during a casual exchange hits differently than one mid-confrontation; varying the structural context multiplies the impact of each reveal.',
        });
      }
    }
  }

  // DIALOGUE_SHORT_LINE_DOMINANCE (minor, ≥15 dialogue lines, ≥75% are ≤4 words):
  // Nearly all spoken lines are ultra-short — the dialogue register is uniformly
  // telegraphic with no variation between clipped reaction and developed speech.
  // Distribution mode × dialogue length channel. Distinct from DIALOGUE_I_DOMINANCE
  // (first-word opener pattern, not line length), DIALOGUE_EXCLAMATION_FLOOD
  // (punctuation density, not length distribution), and DIALOGUE_DOMINANCE
  // (action-vs-dialogue ratio, not within-dialogue length variety).
  {
    let totalDlg396b = 0;
    let shortCount396b = 0;
    let inDlg396b = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg396b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg396b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg396b = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg396b) {
        totalDlg396b++;
        if (t.split(/\s+/).filter(Boolean).length <= 4) shortCount396b++;
      }
    }
    if (totalDlg396b >= 15 && shortCount396b / totalDlg396b >= 0.75) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_SHORT_LINE_DOMINANCE',
        severity: 'minor',
        description: `${shortCount396b} of ${totalDlg396b} dialogue lines (${Math.round(shortCount396b / totalDlg396b * 100)}%) are four words or fewer — the dialogue is uniformly telegraphic. When nearly every line is a clipped fragment, the script loses the textural contrast that distinguishes characters and the rhythmic variation between short reactions and developed speech. Sustained brevity reads as staccato monotone.`,
        suggestedFix: 'Vary dialogue length: let characters finish a thought, build an argument, or tell a brief story. Short lines carry weight when they follow longer ones — a one-word reply lands harder after a paragraph of explanation. Uniform brevity flattens what should be a dynamic rhythm of exchange.',
      });
    }
  }

  // DIALOGUE_QUESTION_DROUGHT (minor, ≥15 dialogue lines, <5% end with "?"):
  // Characters almost never ask each other anything — all dialogue is assertion
  // or declaration. Interrogative lines are a fundamental dramatic tool: they create
  // pressure, expose what a character needs to know, and force the other person to
  // respond rather than merely react. Distribution mode × dialogue register channel.
  // Distinct from DIALOGUE_EXCLAMATION_FLOOD (exclamation excess — opposite register
  // and surplus direction), DIALOGUE_I_DOMINANCE (first-word opener pattern, not
  // sentence-form type), and ADVERB_OVERSATURATION (word-class density, not
  // sentence-form distribution).
  {
    let totalDlg396c = 0;
    let qCount396c = 0;
    let inDlg396c = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg396c = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg396c = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg396c = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg396c) {
        totalDlg396c++;
        if (t.endsWith('?')) qCount396c++;
      }
    }
    const qShare396c = totalDlg396c > 0 ? qCount396c / totalDlg396c : 0;
    if (totalDlg396c >= 15 && qShare396c < 0.05) {
      issues.push({
        location: 'Dialogue throughout',
        rule: 'DIALOGUE_QUESTION_DROUGHT',
        severity: 'minor',
        description: `Only ${qCount396c} of ${totalDlg396c} dialogue lines (${Math.round(qShare396c * 100)}%) are interrogative. Characters almost never ask each other anything — all spoken lines are declarations, assertions, or commands. Questions create dramatic pressure, reveal what a character needs to know and fears to hear, and force other characters to respond rather than react. A script where no one ever asks anything collapses into a series of parallel monologues.`,
        suggestedFix: 'Introduce interrogative dialogue at key pressure points: a question reveals vulnerability and shifts power between speakers. "Do you trust me?" or "What did you see?" carries more dramatic weight than three lines of statement. Characters should want information from each other — let that need show in the language.',
      });
    }
  }

  // ── Wave 410: SLOW_MOTION_CRUTCH, FREEZE_FRAME_CRUTCH, SOUND_CUE_CRUTCH ──

  // SLOW_MOTION_CRUTCH (minor, ≥2 markers): Two or more lines call for slow motion
  // ("SLOW MOTION", "SLO-MO", "IN SLOW MOTION"). Slow motion is a director's tool for
  // stretching a single charged beat; when a script reaches for it repeatedly, it is
  // outsourcing gravity to a speed effect that the staging, stakes, and imagery should
  // earn on their own. Every slowed moment announces "this matters" rather than building
  // the moment so the audience feels it matters. Distinct from SMASH_CUT_OVERUSE (hard/jump
  // cut transitions), DIRECTORIAL_INTRUSION (camera/lens calls), and FADE_TRANSITION_OVERUSE
  // (soft transitions): this targets the slow-motion speed effect specifically.
  {
    const slowMoRe410 = /\b(SLOW\s+MOTION|SLO-?\s?MO|SLOMO)\b/i;
    const slowMoCount410 = lines.filter(l => slowMoRe410.test(l.trim())).length;
    if (slowMoCount410 >= 2) {
      issues.push({
        location: `${slowMoCount410} slow-motion call(s)`,
        rule: 'SLOW_MOTION_CRUTCH',
        severity: 'minor',
        description: `${slowMoCount410} lines call for slow motion ("SLOW MOTION", "SLO-MO"). Slow motion is a director's tool for stretching a single charged beat; reached for repeatedly, it outsources gravity to a speed effect the staging and stakes should earn. Each slowed moment announces "this matters" instead of building the beat so the audience feels it matters — and when many moments are slowed, none of them reads as special.`,
        suggestedFix: 'Reserve slow motion for at most one beat whose weight is already fully earned by the scene around it, and let the rest play at speed. If a moment needs slow motion to register, the fix is usually in the setup — raise the stakes, isolate the image, or hold on the consequence — not in dictating the frame rate.',
      });
    }
  }

  // FREEZE_FRAME_CRUTCH (minor, ≥2 markers): Two or more lines call for a freeze frame
  // ("FREEZE FRAME", "FREEZE ON", "FREEZE-FRAME"). A freeze frame stops time to underline
  // an image; leaned on more than once, it becomes a tic that punctuates the script with
  // manufactured significance rather than letting the moment land in motion. The held image
  // is asked to carry an emphasis the writing has not built. Distinct from SLOW_MOTION_CRUTCH
  // (a speed effect, not a stop), TITLE_CARD_CRUTCH (on-screen text), and DIRECTORIAL_INTRUSION
  // (camera framing): this targets the freeze-frame device specifically.
  {
    const freezeRe410 = /\bFREEZE[\s\-]?(FRAME|ON)\b|\bFREEZE-FRAME\b|\bFREEZEFRAME\b/i;
    const freezeCount410 = lines.filter(l => freezeRe410.test(l.trim())).length;
    if (freezeCount410 >= 2) {
      issues.push({
        location: `${freezeCount410} freeze-frame call(s)`,
        rule: 'FREEZE_FRAME_CRUTCH',
        severity: 'minor',
        description: `${freezeCount410} lines call for a freeze frame ("FREEZE FRAME", "FREEZE ON"). A freeze frame stops time to underline an image; used more than once it becomes a tic that punctuates the script with manufactured significance instead of letting the moment land in motion. The held image is asked to carry an emphasis the surrounding writing has not built, and repetition drains it of the very surprise that makes a freeze land.`,
        suggestedFix: 'Keep at most one freeze frame, for a single image whose meaning the story has fully loaded, and stage the other emphatic beats in motion. Emphasis in film comes from what the audience has been led to feel about an image, not from literally stopping on it — build the charge into the scene and the moment will hold without being frozen.',
      });
    }
  }

  // SOUND_CUE_CRUTCH (minor, ≥3 markers): Three or more lines hard-code a sound effect with
  // an explicit label ("SFX:", "SOUND:", "SOUND CUE:", "SOUND FX:"). Spelling out the sound
  // design in labelled cues is the sound editor's job, not the writer's; on the page it reads
  // as a spreadsheet of effects rather than prose that makes the reader hear the world. A
  // script that lists its sounds is telling the reader what to hear instead of writing the
  // action so the sound is implied. Distinct from DIRECTORIAL_INTRUSION ("WE HEAR" and
  // camera/lens calls inside action) and from VOICEOVER_CRUTCH / OFF_SCREEN_CUE_OVERUSE
  // (spoken-voice cues): this targets the labelled sound-effect cue specifically.
  {
    const soundCueRe410 = /^\(?\s*(SFX|SOUND|SOUND\s+CUE|SOUND\s+FX|SOUND\s+EFFECT|SOUND\s+EFFECTS)\s*:/i;
    const soundCueCount410 = lines.filter(l => soundCueRe410.test(l.trim())).length;
    if (soundCueCount410 >= 3) {
      issues.push({
        location: `${soundCueCount410} hard-coded sound cue(s)`,
        rule: 'SOUND_CUE_CRUTCH',
        severity: 'minor',
        description: `${soundCueCount410} lines hard-code a sound effect with an explicit label ("SFX:", "SOUND:"). Spelling out the sound design in labelled cues is the sound editor's job; on the page it reads as a spreadsheet of effects rather than prose that makes the reader hear the world. A script that lists its sounds tells the reader what to hear instead of writing the action so the sound is felt — the cue substitutes for the craft of evocation.`,
        suggestedFix: 'Fold essential sounds into the action prose so the reader hears them through the writing: instead of "SFX: GLASS SHATTERS", write "The glass shatters against the wall." Reserve a labelled cue only for a sound that is genuinely off-screen and plot-critical and cannot be implied by what is on the page.',
      });
    }
  }

  // ── Wave 424: INSERT_SHOT_CRUTCH, ELLIPSIS_ACTION_OVERUSE, ACTION_ADVERB_FLOOD ──

  // INSERT_SHOT_CRUTCH (minor, ≥3 "INSERT:" lines): Three or more lines hard-code an
  // insert shot with an explicit "INSERT:" or "INSERT -" label. Insert shots are a
  // director's decision — the choice to isolate an object in a close-up belongs to
  // the edit, not the script. When a writer labels three or more inserts, they are
  // building the shot list rather than writing the scene: the detail that warrants an
  // insert should be integrated into the action prose through a character's attention
  // rather than called by a slug-like directive. Distinct from DIRECTORIAL_INTRUSION
  // (Wave 259: camera/lens calls like "CLOSE ON"/"TIGHT ON"/"WE SEE" inside action prose —
  // this targets the "INSERT:" heading format specifically, which is a slug-level directive
  // rather than an action-line instruction) and from TITLE_CARD_CRUTCH / TIME_CARD_CRUTCH
  // (on-screen text / time captions — content cards, not image-composition directives).
  {
    const insertRe424a = /^INSERT[\s:\-]/i;
    const insertCount424a = lines.filter(l => insertRe424a.test(l.trim())).length;
    if (insertCount424a >= 3) {
      issues.push({
        location: `${insertCount424a} INSERT shot label(s)`,
        rule: 'INSERT_SHOT_CRUTCH',
        severity: 'minor',
        description: `${insertCount424a} lines hard-code an INSERT shot with an explicit label ("INSERT:", "INSERT -"). Calling inserts by name is a directorial choice that belongs to the edit; on the page it lifts the reader out of the prose world and into a production checklist. The insert-worthy detail should appear as a natural beat in the action prose — seen through a character's attention or through the scene's natural visual logic — rather than as a labeled shot directive.`,
        suggestedFix: 'Fold the inserted image into the action prose: instead of "INSERT: THE CLOCK — 3:47 AM", write "She glances at the clock. 3:47 AM." The detail lands harder when the audience receives it through a character\'s attention rather than through a director\'s annotated frame. Remove the INSERT labels and let the prose\'s own focus imply the close-up.',
      });
    }
  }

  // ELLIPSIS_ACTION_OVERUSE (minor, ≥10 action lines, >20%): More than 20% of action lines
  // contain an ellipsis ("..."). In stage directions, an ellipsis signals either prose that
  // avoids completing its own thought — the description trails off rather than landing on a
  // specific image — or an artsy stylistic affectation. Both are problems: the first indicates
  // incomplete writing, the second a self-conscious manner that makes every third action line
  // feel like it knows it is being read rather than serving the scene. When more than a fifth
  // of all action lines use "...", the screenplay's prose voice has a tic that reads as
  // unfinished regardless of authorial intent. Distinct from dialogue ELLIPSIS_OVERUSE
  // (Wave 255: the "..." register in dialogue — the trailing-off speech pattern; this targets
  // "..." specifically in the action/description layer), REACTION_SHOT_OVERUSE (terse lines,
  // not incomplete-thought lines), and FILTERING_VERB_OVERUSE (perceptual framing, not
  // trailing-off incompleteness). Underweight/bloat mode.
  {
    let actionTotal424b = 0;
    let ellipsisCount424b = 0;
    let inDlg424b = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg424b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg424b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg424b = true; continue; }
      if (t.startsWith('(')) continue;
      if (inDlg424b) continue;
      actionTotal424b++;
      if (/\.{3}/.test(t)) ellipsisCount424b++;
    }
    if (actionTotal424b >= 10 && ellipsisCount424b / actionTotal424b > 0.20) {
      issues.push({
        location: `${ellipsisCount424b} of ${actionTotal424b} action lines contain "..."`,
        rule: 'ELLIPSIS_ACTION_OVERUSE',
        severity: 'minor',
        description: `${ellipsisCount424b} of ${actionTotal424b} action lines (${Math.round(ellipsisCount424b / actionTotal424b * 100)}%) trail off with an ellipsis. In stage directions, "..." signals either prose that avoids completing its own image — the description trails off rather than landing on a specific visual — or a self-conscious stylistic affectation. When more than a fifth of all action lines use the device, the screenplay's prose has a tic that reads as unfinished: the writer keeps declining to say the thing, and the reader keeps stopping where the image should land.`,
        suggestedFix: 'Complete each action line — say what is on screen, fully and specifically, rather than trailing it into suggestion. Ellipsis in action belongs in rare beats where incompleteness IS the effect: the thing can\'t quite be named, the image is deliberately withheld. For everything else, write the image. The reader experiences what is described, not what is gestured at.',
      });
    }
  }

  // ACTION_ADVERB_FLOOD (minor, ≥10 action lines, >25%): More than 25% of action lines
  // carry a common manner adverb — "slowly", "carefully", "quietly", "quickly", "gently",
  // "suddenly", "softly", "nervously", "anxiously", "angrily", "urgently", "deliberately",
  // "cautiously", "silently", "frantically". Adverbs in action lines substitute for specific
  // physical description: "she closes the door quietly" tells the reader the manner without
  // showing a concrete image that implies it. When more than a quarter of all action lines
  // lean on adverb qualification, the prose is consistently describing HOW actions feel
  // rather than WHAT actions look like — trading the visual specificity film needs for
  // abstract instruction that neither the reader nor the director can picture. Distinct from
  // BODY_LANGUAGE_CLICHÉ_OVERUSE (Wave 315: specific stock gesture nouns — nods/shrugs/sighs;
  // this targets the adverb + any-verb construction, not named gestures), REACTION_SHOT_
  // OVERUSE (terse single-beat lines, not qualified lines), and FILTERING_VERB_OVERUSE
  // (perception verbs like "sees"/"notices" — the source of the filtering, not the manner).
  {
    const adverbRe424c = /\b(slowly|carefully|quietly|quickly|gently|suddenly|softly|nervously|anxiously|angrily|urgently|deliberately|cautiously|silently|frantically|hastily|weakly|firmly|coldly|calmly|tensely)\b/i;
    let actionTotal424c = 0;
    let adverbCount424c = 0;
    let inDlg424c = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg424c = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg424c = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg424c = true; continue; }
      if (t.startsWith('(')) continue;
      if (inDlg424c) continue;
      actionTotal424c++;
      if (adverbRe424c.test(t)) adverbCount424c++;
    }
    if (actionTotal424c >= 10 && adverbCount424c / actionTotal424c > 0.25) {
      issues.push({
        location: `${adverbCount424c} of ${actionTotal424c} action lines carry a manner adverb`,
        rule: 'ACTION_ADVERB_FLOOD',
        severity: 'minor',
        description: `${adverbCount424c} of ${actionTotal424c} action lines (${Math.round(adverbCount424c / actionTotal424c * 100)}%) carry a manner adverb ("slowly", "carefully", "quietly", "suddenly", "gently"). Adverbs in action lines substitute for specific physical description: they tell the manner rather than showing the concrete image that would imply it. When more than a quarter of all action uses adverb qualification, the prose consistently describes HOW actions feel rather than WHAT they look like — trading visual specificity for abstract instruction.`,
        suggestedFix: 'Replace manner adverbs with the specific action that implies the manner: "She closes the door quietly" → "She eases the door shut, her fingertips pressing the latch back until it clicks." The concrete image makes the reader feel the quality; the adverb only names it. Reserve a manner adverb for the rare line where the manner genuinely cannot be inferred from the physical action being described.',
      });
    }
  }

  // ── Wave 438: PASSIVE_VERB_DOMINANCE, DIALOGUE_MONOLOGUE_DROUGHT, ACTION_QUESTION_INTRUSION ──

  // PASSIVE_VERB_DOMINANCE (minor, ≥10 action lines, >25%): More than 25% of action lines
  // use passive construction ("is seen", "are found", "can be heard", "was revealed",
  // "has been taken"). Passive voice in action lines removes agency from the visual
  // description: the world is observed being acted upon rather than shown acting. "A gun
  // is found on the table" gives less visual authority than "A gun sits on the table" —
  // the passive construction puts the reader at a remove from the image, processing what was
  // done to things rather than watching things exist and move. When more than a quarter of
  // all action lines are passive, the screenplay's prose has a systemic distancing quality
  // that accumulates across reading. Underweight/bloat mode × action prose × verb form.
  // Distinct from COPULA_ACTION_DOMINANCE (Wave 259: linking-verb state predicates — "the room
  // is dark", "he is afraid" — being-verb as main predicate, not passive voice), FILTERING_VERB_
  // OVERUSE (Wave 259: "she sees"/"he notices" — POV attribution verbs, not passive constructions),
  // and ACTION_ADVERB_FLOOD (Wave 424: manner adverbs qualifying verbs, not verb form itself).
  {
    // Covers regular past participles (-ed, -en) plus common irregular past participles
    // used in passive constructions in screenplay action lines.
    const passiveRe438a = /\b(is|are|was|were|can be|could be|will be|has been|have been)\s+(?:[a-z]+(?:ed|en)|found|heard|left|shown|known|built|held|kept|sent|told|made|done|brought|caught|hit|set|put|lost|shut|cut|let|won|worn|drawn|thrown|grown|shot|sold|paid|felt|met|thought|bought|laid|spread|split|spent|bent|swept|wept|crept)\b/i;
    let actionTotal438a = 0;
    let passiveCount438a = 0;
    let inDlg438a = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg438a = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg438a = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg438a = true; continue; }
      if (t.startsWith('(')) continue;
      if (inDlg438a) continue;
      actionTotal438a++;
      if (passiveRe438a.test(t)) passiveCount438a++;
    }
    if (actionTotal438a >= 10 && passiveCount438a / actionTotal438a > 0.25) {
      issues.push({
        location: `${passiveCount438a} of ${actionTotal438a} action lines use passive construction`,
        rule: 'PASSIVE_VERB_DOMINANCE',
        severity: 'minor',
        description: `${passiveCount438a} of ${actionTotal438a} action lines (${Math.round(passiveCount438a / actionTotal438a * 100)}%) use passive voice — "is seen", "are found", "can be heard", "was revealed". Passive construction removes agency from the visual surface: the world is observed being acted upon rather than shown acting. The reader processes what was done to things rather than watching things exist and move, which creates a subtle but cumulative distance from the visual world. More than a quarter of action lines in this passive register gives the screenplay's prose a distancing quality that makes the imagery feel reported rather than witnessed.`,
        suggestedFix: 'Convert passive constructions to active ones by giving the subject visual agency: "A gun is found on the table" → "A gun rests on the table" or "Detective Chen finds a gun on the table." Let objects exist actively or give a character the verb. Reserve passive construction for the rare case where grammatical agency genuinely belongs to the acted-upon thing.',
      });
    }
  }

  // DIALOGUE_MONOLOGUE_DROUGHT (minor, ≥12 dialogue lines, <5% long): Fewer than 5% of
  // dialogue lines are extended (>15 words) while the screenplay has ≥12 dialogue lines.
  // Extended dialogue lines — speeches, monologues, extended arguments — are how characters
  // develop position, reveal interiority, and sustain rhetorical pressure on each other.
  // When almost no dialogue line crosses 15 words, the screenplay operates entirely in
  // shorthand: every exchange is either rapid-fire repartee or terse surface reading with
  // nothing sustained. The register is uniformly telegraphic — characters never hold the
  // floor long enough to say something complex. A screenplay with no monologues, no
  // extended speeches, no arguments that develop across multiple sentences, denies characters
  // the tools to articulate their inner worlds beyond reaction. Underweight/bloat mode ×
  // dialogue × length distribution. Distinct from DIALOGUE_SHORT_LINE_DOMINANCE (Wave 396:
  // measures whether ≥75% of lines are ≤4 words — a different threshold at a different end
  // of the distribution; DIALOGUE_SHORT_LINE_DOMINANCE can fire without DIALOGUE_MONOLOGUE_
  // DROUGHT when dialogue averages 5-14 words per line with no long speeches), PARENTHETICAL_
  // FLOOD (Wave 273: acting wrench directions — direction-layer density, not speech length),
  // and DIALOGUE_QUESTION_DROUGHT (Wave 396: dialogue interrogativeness — a register quality,
  // not a length distribution). This is the first check auditing the upper tail of dialogue
  // line length.
  {
    let dlgTotal438b = 0;
    let longDlgCount438b = 0;
    let inDlg438b = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg438b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg438b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg438b = true; continue; }
      if (t.startsWith('(')) continue;
      if (!inDlg438b) continue;
      dlgTotal438b++;
      if (t.split(/\s+/).filter(Boolean).length > 15) longDlgCount438b++;
    }
    if (dlgTotal438b >= 12 && longDlgCount438b / dlgTotal438b < 0.05) {
      issues.push({
        location: `${longDlgCount438b} of ${dlgTotal438b} dialogue lines exceed 15 words`,
        rule: 'DIALOGUE_MONOLOGUE_DROUGHT',
        severity: 'minor',
        description: `Only ${longDlgCount438b} of ${dlgTotal438b} dialogue lines (${Math.round(longDlgCount438b / dlgTotal438b * 100)}%) exceed 15 words — the screenplay has almost no extended speeches. Every exchange is rapid-fire shorthand; characters never sustain a position, develop an argument, or reveal interiority over more than a single clipped line. Extended dialogue is how characters occupy rhetorical space: a monologue reveals how someone thinks, a sustained argument shows how relationships process pressure, a speech places the audience inside a character's world view. When no character ever holds the floor across more than 15 words, the dialogue register is uniformly telegraphic — characters react but never truly speak.`,
        suggestedFix: 'Give at least one character at least one extended speech or sustained argument somewhere in the screenplay. An extended exchange doesn\'t mean a lecture — it means a character develops a thought across three or four sentences, with subclause, contradiction, and arrival. The goal is at least one beat where a character is allowed to be complex in speech rather than punchy in reaction.',
      });
    }
  }

  // ACTION_QUESTION_INTRUSION (minor, ≥3 action lines with "?"): Three or more action lines
  // (non-dialogue stage directions) contain a question mark — the writer inserts rhetorical
  // or authorial questions into the visual prose. Action lines exist to present what the camera
  // records: the images, movements, and objects that make up the scene. A question mark in
  // action prose is a discourse-mode switch from showing to editorializing: "What does he know?
  // Can she trust him? Where is this headed?" — these are the writer's commentary about the
  // scene, not the scene itself. The audience cannot see a question; they can only see its
  // answer. Three or more such intrusions signal a screenplay that repeatedly breaks the visual
  // contract to address the reader directly, a habit that distances the prose from the images
  // it is meant to conjure. Count threshold × action layer × discourse mode. Distinct from
  // DIALOGUE_QUESTION_DROUGHT (Wave 396: questions in the dialogue layer — a character asking
  // another character something — a dramatic tool), DIRECTORIAL_INTRUSION (Wave 259: camera/
  // lens calls and "WE HEAR" — structural labels, not rhetorical questions), and EXCLAMATION_
  // IN_ACTION (Wave 273: exclamatory punctuation in action — the analogous over-excitement
  // mode, not questioning). This is the first check to audit the question-mark in action prose.
  {
    let questionCount438c = 0;
    let inDlg438c = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg438c = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg438c = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg438c = true; continue; }
      if (t.startsWith('(')) continue;
      if (inDlg438c) continue;
      if (/\?/.test(t)) questionCount438c++;
    }
    if (questionCount438c >= 3) {
      issues.push({
        location: `${questionCount438c} action line(s) contain a question mark`,
        rule: 'ACTION_QUESTION_INTRUSION',
        severity: 'minor',
        description: `${questionCount438c} action lines contain a question mark — the writer is inserting authorial questions into the stage directions. Action prose exists to present what the camera records: images, movements, objects. A question mark in an action line is a discourse-mode switch from showing to editorializing — "What does he know? Can she trust him?" — the writer's commentary about the scene rather than the scene itself. The audience cannot see a question; they can only see what follows from its answer being visible on screen. Repeated question-mark intrusions break the screenplay's visual contract, stepping outside the scene to address the reader directly.`,
        suggestedFix: 'Remove the question marks from action lines and replace with the visual image that answers the question: instead of "What is she thinking?" write what she does — the gesture, the look, the action that externalises the thought. If the question is genuinely unanswerable (the scene is meant to be ambiguous), write the unresolved image directly. The authorial question belongs in a note to yourself or a director\'s treatment, not in the script\'s action prose.',
      });
    }
  }

  // ── Wave 452: DIALOGUE_ELLIPSIS_FLOOD, SLUG_TIME_MONOTONE, DIALOGUE_FILLER_OPENER ──

  // DIALOGUE_ELLIPSIS_FLOOD (minor, ≥10 dialogue lines, >20%): More than 20% of dialogue
  // lines end with an ellipsis ("...") — characters trail off instead of completing thoughts.
  // Ellipsis dialogue used occasionally communicates hesitation, suppressed knowledge, or
  // interrupted intent. Used as the default register for more than a fifth of all spoken lines,
  // it signals a screenplay where nobody ever finishes a sentence — a world of perpetual
  // half-speech where characters gesture at meaning rather than landing it. The audience stops
  // reading trailing dialogue as dramatic reticence and starts reading it as the writer avoiding
  // the decisive word. Underweight/bloat mode × dialogue layer × trailing-off punctuation.
  // Distinct from ELLIPSIS_ACTION_OVERUSE (Wave 424: the same pattern in the action layer —
  // this audits the dialogue layer), DIALOGUE_MONOLOGUE_DROUGHT (Wave 438: no extended speeches
  // — too short, not too incomplete), and ACTION_QUESTION_INTRUSION (Wave 438: action layer):
  // this is the first check to audit ellipsis use in the dialogue layer specifically.
  {
    let dlgTotal452a = 0;
    let ellipsisCount452a = 0;
    let inDlg452a = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg452a = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg452a = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg452a = true; continue; }
      if (t.startsWith('(')) continue;
      if (!inDlg452a) continue;
      dlgTotal452a++;
      if (t.endsWith('...')) ellipsisCount452a++;
    }
    if (dlgTotal452a >= 10 && ellipsisCount452a / dlgTotal452a > 0.2) {
      issues.push({
        location: `${ellipsisCount452a} of ${dlgTotal452a} dialogue lines end with "..."`,
        rule: 'DIALOGUE_ELLIPSIS_FLOOD',
        severity: 'minor',
        description: `${ellipsisCount452a} of ${dlgTotal452a} dialogue lines (${Math.round(ellipsisCount452a / dlgTotal452a * 100)}%) end with an ellipsis — more than a fifth of all spoken lines trail off without completing their thought. Ellipsis dialogue used occasionally communicates hesitation, suppressed knowledge, or interrupted intent; used as the default register, it signals a screenplay where nobody ever finishes a sentence. The audience stops reading trailing dialogue as dramatic reticence and starts reading it as the writer avoiding the decisive word the character should say.`,
        suggestedFix: "Let characters finish their sentences. Reserve ellipsis dialogue for the specific moments when hesitation or incompletion is dramatically meaningful: a confession that can't be made, a threat half-spoken. The rest of the time, make characters say what they mean — complete statements land harder than dangling implications. More than one in five trailing-off lines is a register, not a choice; replace the ellipsis with the word the character is too afraid to say, or cut the trailing hesitation entirely.",
      });
    }
  }

  // SLUG_TIME_MONOTONE (minor, ≥6 time-tagged sluglines, >80% same time): More than 80%
  // of sluglines that specify a time of day all use the same time label — the story plays
  // out almost entirely in one lighting condition. Whether all DAY or all NIGHT, a story that
  // never shifts its visual hour forfeits one of screenplay's native expressive tools: morning
  // has urgency and possibility, afternoon has heat and diminishing returns, night has intimacy
  // and concealment — these distinctions carry tone for free when the hour changes. A story
  // that never changes the light is tonally uniform in a way the audience senses without naming.
  // Underweight/bloat mode × slugline layer × time-of-day distribution. Distinct from SLUG_
  // INTERIOR_DOMINANCE (Wave 287: INT./EXT. ratio — location type, not time), LOCATION_
  // REPETITION (Wave 273: same place — not hour), SLUG_GENERIC_LOCATION (Wave 315: placeholder
  // names): this is the first check to audit time-of-day distribution across sluglines.
  {
    const timeCounts452b = new Map<string, number>();
    let timeTaggedSlugs452b = 0;
    for (const line of lines) {
      const t = line.trim();
      if (!/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) continue;
      const m = t.toUpperCase().match(/\b(DAY|NIGHT|DAWN|DUSK|MORNING|AFTERNOON|EVENING|SUNSET|SUNRISE|NOON)\b/);
      if (!m) continue;
      timeTaggedSlugs452b++;
      timeCounts452b.set(m[1], (timeCounts452b.get(m[1]) ?? 0) + 1);
    }
    if (timeTaggedSlugs452b >= 6) {
      const dominantEntry452b = [...timeCounts452b.entries()].sort((a, b) => b[1] - a[1])[0];
      if (dominantEntry452b && dominantEntry452b[1] / timeTaggedSlugs452b > 0.8) {
        issues.push({
          location: `${dominantEntry452b[1]} of ${timeTaggedSlugs452b} time-tagged sluglines specify "${dominantEntry452b[0]}"`,
          rule: 'SLUG_TIME_MONOTONE',
          severity: 'minor',
          description: `${dominantEntry452b[1]} of ${timeTaggedSlugs452b} sluglines (${Math.round(dominantEntry452b[1] / timeTaggedSlugs452b * 100)}%) that specify a time of day all use "${dominantEntry452b[0]}" — the story plays out almost entirely in one lighting condition. A screenplay that never changes its hour forfeits the expressive range of light: morning urgency, afternoon heat, nighttime concealment are tonally distinct. A story lived entirely in one hour is visually monotone in a way the audience senses without naming — every scene in the same light creates a world without temporal rhythm or contrast.`,
          suggestedFix: `Introduce at least one or two scenes in a different time of day. The hour of a scene is part of its character: early morning has a quality that night lacks; twilight implies transition; full noon has a different pressure from midnight. Even if the story's actual timeline is tight, giving scenes a varied time label signals visual awareness that the hour matters. Move at least one "${dominantEntry452b[0]}" scene to a different time to restore the palette.`,
        });
      }
    }
  }

  // DIALOGUE_FILLER_OPENER (minor, ≥4 speeches begin with filler): Four or more dialogue
  // speeches begin with a verbal filler opener — "Well,", "Look,", "Listen,", "Actually,",
  // "Honestly,", "Basically,", "I mean,", "You know," — a hedge or redirect that delays the
  // character's first direct word. These openers are the spoken equivalent of a throat-clear:
  // they are how writers get a character speaking when the inciting impulse for the speech is
  // unclear. A first word that commits immediately to the character's desire, position, or
  // action is four or five times stronger than a hedge. Four or more such openings signal a
  // dialogue register that structurally avoids the direct word. Count threshold × dialogue ×
  // first-word pattern. Distinct from CLICHÉ_DIALOGUE (Wave 137: specific clichéd phrases —
  // whole-line content, not opening word), DIALOGUE_SHORT_LINE_DOMINANCE (Wave 396: word
  // count — length distribution), DIALOGUE_QUESTION_DROUGHT (Wave 396: interrogativeness —
  // register quality, not first word), PARENTHETICAL_FLOOD (Wave 273: acting directions —
  // direction layer): this is the first check targeting the opening word of each speech.
  {
    const fillerRe452c = /^(well[,\s]|look[,\s!]|listen[,\s]|actually[,\s]|honestly[,\s]|basically[,\s]|i mean[,\s]|you know[,\s]|anyway[,\s]|whatever[,\s]|seriously[,\s])/i;
    let fillerOpenerCount452c = 0;
    let inDlg452c = false;
    let isFirstDlgLine452c = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg452c = false; isFirstDlgLine452c = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg452c = false; isFirstDlgLine452c = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg452c = true; isFirstDlgLine452c = true; continue; }
      if (t.startsWith('(')) continue;
      if (!inDlg452c) continue;
      if (isFirstDlgLine452c) {
        if (fillerRe452c.test(t)) fillerOpenerCount452c++;
        isFirstDlgLine452c = false;
      }
    }
    if (fillerOpenerCount452c >= 4) {
      issues.push({
        location: `${fillerOpenerCount452c} dialogue speech(es) begin with a verbal filler opener`,
        rule: 'DIALOGUE_FILLER_OPENER',
        severity: 'minor',
        description: `${fillerOpenerCount452c} dialogue speeches open with a verbal filler — "Well,", "Look,", "Listen,", "Actually,", "Honestly,", "Basically,", "I mean,", or similar — a hedge that delays the character's first direct word. These openers are the spoken equivalent of a writer clearing their throat before they know what to say: they are how speeches begin when the impulse for the speech is unclear. A first word that commits immediately to the character's desire, position, or action is far stronger. Four or more such openings across the screenplay signals a dialogue register that structurally avoids the direct first word.`,
        suggestedFix: "Trim the opening filler: \"Well, I don't think that's right\" becomes \"That's wrong.\" \"Look, we need to talk about this\" becomes \"We need to talk.\" Start each speech on the word that carries the character's first real meaning — not the word that marks time before meaning arrives. If a character genuinely can't bring themselves to start directly, that hesitation belongs in a parenthetical note or a stage direction, not in the speech opener itself.",
      });
    }
  }

  // ── Wave 466: ACTION_PRONOUN_OPENER_FLOOD, DIALOGUE_QUESTION_FLOOD, ELLIPSIS_RUN_ACTION ──

  // ACTION_PRONOUN_OPENER_FLOOD (minor, ≥8 action paragraphs, >50% open with "He " or "She "):
  // More than half of all action paragraphs begin with a character pronoun opener — the writer's
  // default visual grammar is to name the agent before the act, every time. Varied action openers
  // — an object noticed, a sound heard, a location detail foregrounded — orient the reader to the
  // world before the character, creating a cinematic perspective and varying the prose rhythm. A
  // script where every action block opens with "He " or "She " reads like prose fiction with
  // sluglines added rather than a visually constructed screenplay. Distribution/timing mode ×
  // action prose layer × paragraph-level opener. Distinct from COPULA_ACTION_DOMINANCE (linking
  // verbs — predicate form, not opener distribution), FILTERING_VERB_OVERUSE (perception verbs),
  // PASSIVE_VERB_DOMINANCE (passive construction), and ACTION_ADVERB_FLOOD (adverbs): this is the
  // first check to audit the distribution of how action paragraphs begin.
  {
    let actionBlockCount466a = 0;
    let pronounOpenerCount466a = 0;
    let prevWasBlank466a = true;
    let inDlg466a = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { prevWasBlank466a = true; inDlg466a = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { prevWasBlank466a = false; inDlg466a = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg466a = true; prevWasBlank466a = false; continue; }
      if (t.startsWith('(')) { prevWasBlank466a = false; continue; }
      if (inDlg466a) { prevWasBlank466a = false; continue; }
      // Action line
      if (prevWasBlank466a) {
        actionBlockCount466a++;
        if (/^(He|She)\s/.test(t)) pronounOpenerCount466a++;
      }
      prevWasBlank466a = false;
    }
    if (actionBlockCount466a >= 8 && pronounOpenerCount466a / actionBlockCount466a > 0.5) {
      issues.push({
        location: `${pronounOpenerCount466a} of ${actionBlockCount466a} action block(s) open with "He" or "She"`,
        rule: 'ACTION_PRONOUN_OPENER_FLOOD',
        severity: 'minor',
        description: `${pronounOpenerCount466a} of ${actionBlockCount466a} action paragraphs (${Math.round(pronounOpenerCount466a / actionBlockCount466a * 100)}%) open with "He" or "She" — more than half begin by naming the character's pronoun rather than the image they produce, the object they encounter, or the world around them. A screenplay's visual grammar is shaped by where each block of description starts: varied openers — an object, a location detail, a sound, an effect — give the prose cinematic range. A writer who habitually opens every action with the agent before the act creates prose that reads like a novel with stage directions rather than a script constructed from images.`,
        suggestedFix: 'Vary action block openers: instead of "He crosses to the window", try "The window frames the city below." Instead of "She opens the drawer", try "The drawer slides open." Lead at least half of action paragraphs with something other than a character pronoun — an object the camera would land on first, a detail of the environment, the result of an action before its cause. This is one of the simplest ways to shift action prose from literary to cinematic.',
      });
    }
  }

  // DIALOGUE_QUESTION_FLOOD (minor, ≥10 dialogue lines, >35% end with "?"): More than a third
  // of all dialogue lines are questions — characters perpetually interrogate rather than declare,
  // act, or assert. When more than a third of all spoken lines are questions, the screenplay has
  // a dialogue register problem at the opposite pole from DIALOGUE_QUESTION_DROUGHT (<5%): instead
  // of nobody asking anything, everyone is always asking something. A world where every character
  // is perpetually interrogating produces dialogue that feels like an interview rather than a scene
  // — characters never commit to a position, never accuse, never declare. Drama requires assertion:
  // characters must claim things, do things, refuse things. Questions without assertions are a
  // holding pattern. Underweight/bloat mode × dialogue layer × interrogative register. Distinct
  // from DIALOGUE_QUESTION_DROUGHT (Wave 396: <5% interrogative — the opposite failure),
  // DIALOGUE_EXCLAMATION_FLOOD (Wave 287: >25% exclamation — different punctuation signal), and
  // DIALOGUE_ELLIPSIS_FLOOD (Wave 452: >20% trailing off — different punctuation signal): this
  // is the first check targeting overuse of the interrogative register in dialogue.
  {
    let dlgTotal466b = 0;
    let questionCount466b = 0;
    let inDlg466b = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg466b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg466b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg466b = true; continue; }
      if (t.startsWith('(')) continue;
      if (!inDlg466b) continue;
      dlgTotal466b++;
      if (t.endsWith('?')) questionCount466b++;
    }
    if (dlgTotal466b >= 10 && questionCount466b / dlgTotal466b > 0.35) {
      issues.push({
        location: `${questionCount466b} of ${dlgTotal466b} dialogue lines end with "?"`,
        rule: 'DIALOGUE_QUESTION_FLOOD',
        severity: 'minor',
        description: `${questionCount466b} of ${dlgTotal466b} dialogue lines (${Math.round(questionCount466b / dlgTotal466b * 100)}%) end with a question mark — more than a third of all spoken dialogue is interrogative. When characters are perpetually asking rather than asserting, the dialogue register lacks declarative commitment: nobody claims anything, nobody accuses, nobody refuses. Drama requires assertion — a character who commits to a position, makes an accusation, or flatly states what they want is more dramatically alive than one who only asks. A dialogue layer dominated by questions reads as a world of perpetual holding patterns where the next answer is always deferred to the next question.`,
        suggestedFix: 'Convert at least half of the unnecessary questions into assertions: instead of "Don\'t you think this is wrong?" try "This is wrong." Instead of "Aren\'t you listening?" try "You\'re not listening." Questions have maximum impact when they are rare and pointed; when more than a third of dialogue asks rather than declares, the asking loses its edge. Reserve questions for genuinely unanswerable moments or for characters weaponizing uncertainty — everywhere else, commit to the declarative.',
      });
    }
  }

  // ELLIPSIS_RUN_ACTION (minor, ≥5 action lines, maxConsecutiveRun≥3): Three or more consecutive
  // action lines each ending with "..." — a run of stage directions that trail off without
  // completing the image. One ellipsis in action signals deliberate incompletion: a detail
  // withheld, a mystery gestured at. Three or more consecutive action lines all trailing off is
  // a different signal: the writer cannot commit to the image, and the action prose fragments into
  // a series of incomplete gestures. The audience/reader is left with impressions rather than
  // scenes — the camera cannot cut to an ellipsis. Run-based mode × action prose layer ×
  // trailing-off punctuation. Distinct from ELLIPSIS_ACTION_OVERUSE (Wave 424: >20% of all
  // action lines contain "..." — a proportional threshold check across the whole script; this
  // checks for consecutive runs of ≥3, which fires even when the total percentage is low if the
  // ellipses are concentrated in a burst): the consecutive-run check catches bursty incompletion
  // that the proportion check misses.
  {
    let actionTotal466c = 0;
    let maxEllipsisRun466c = 0;
    let curEllipsisRun466c = 0;
    let inDlg466c = false;
    for (const line of lines) {
      const t = line.trim();
      // Blank lines don't break the ellipsis run — they separate paragraphs but the run
      // continues across inter-paragraph gaps (each action line is one potential run member).
      if (!t) { inDlg466c = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg466c = false; curEllipsisRun466c = 0; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg466c = true; curEllipsisRun466c = 0; continue; }
      if (t.startsWith('(')) { curEllipsisRun466c = 0; continue; }
      if (inDlg466c) { curEllipsisRun466c = 0; continue; }
      // Action line
      actionTotal466c++;
      if (t.endsWith('...')) {
        if (++curEllipsisRun466c > maxEllipsisRun466c) maxEllipsisRun466c = curEllipsisRun466c;
      } else {
        curEllipsisRun466c = 0;
      }
    }
    if (actionTotal466c >= 4 && maxEllipsisRun466c >= 3) {
      issues.push({
        location: `${maxEllipsisRun466c} consecutive action line(s) end with "..."`,
        rule: 'ELLIPSIS_RUN_ACTION',
        severity: 'minor',
        description: `A run of ${maxEllipsisRun466c} consecutive action lines each end with "..." — stage directions that trail off without completing the image, in an unbroken sequence. A single ellipsis in action prose can signal a withheld detail or a deliberate mystery; a run of three or more consecutive incomplete lines signals the writer cannot commit to the image, and the action prose fragments into a series of impressions. The screenplay camera cannot cut to a trailing off — it records specific things in specific arrangements. Consecutive incomplete action lines produce a reading experience of mood without substance: the scene gestures but never arrives.`,
        suggestedFix: 'Complete the trailing action lines: decide what the camera actually shows — the specific object, the precise expression, the exact movement — and write that instead of the ellipsis. If the incompletion is intentional (a deliberately withheld image), use one ellipsis where the mystery is greatest and complete the rest. Three or more consecutive trailing-off action lines in a row indicates that the scene has not yet been written — only its outline, written in gestures.',
      });
    }
  }

  // ── Wave 480: DIALOGUE_FILLER_RUN, ACTION_AVERAGE_LINE_BREVITY, ACTION_PEAK_PARAGRAPH ──

  // DIALOGUE_FILLER_RUN (run-based × dialogue × filler opener, ≥5 dialogue speeches,
  // maxConsecutiveRun ≥ 3): Three or more consecutive dialogue speeches each open with a verbal
  // hedge — "Well,", "Look,", "Listen,", "Actually,", etc. — creating an unbroken chain of
  // throat-clearing before meaning arrives. Where DIALOGUE_FILLER_OPENER (Wave 452) detects
  // four or more filler-openers anywhere across the script, this run check fires even when
  // the total count is low if the fillers are bunched: three hedges in a row have a much
  // stronger rhythmic numbing effect than three spread across eighty pages. A run of filler
  // openers in consecutive speeches signals a scene or exchange where characters are
  // perpetually stalling — each speech begins by signaling uncertainty rather than charging
  // in. Run-based mode × dialogue layer × filler-opener pattern. Distinct from DIALOGUE_
  // FILLER_OPENER (Wave 452: total count ≥ 4, not consecutive), DIALOGUE_ELLIPSIS_FLOOD
  // (Wave 452: trailing-off punctuation, not opening word), ELLIPSIS_RUN_ACTION (Wave 466:
  // run of action ellipses, not dialogue openers).
  {
    const fillerRe480a = /^(well[,\s]|look[,\s!]|listen[,\s]|actually[,\s]|honestly[,\s]|basically[,\s]|i mean[,\s]|you know[,\s]|anyway[,\s]|whatever[,\s]|seriously[,\s])/i;
    let inDlg480a = false;
    let isFirstDlgLine480a = false;
    let totalSpeeches480a = 0;
    let curFillerRun480a = 0;
    let maxFillerRun480a = 0;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg480a = false; isFirstDlgLine480a = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg480a = false; isFirstDlgLine480a = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) {
        inDlg480a = true; isFirstDlgLine480a = true; totalSpeeches480a++;
        continue;
      }
      if (t.startsWith('(')) continue;
      if (!inDlg480a) continue;
      if (isFirstDlgLine480a) {
        if (fillerRe480a.test(t)) {
          curFillerRun480a++;
          if (curFillerRun480a > maxFillerRun480a) maxFillerRun480a = curFillerRun480a;
        } else {
          curFillerRun480a = 0;
        }
        isFirstDlgLine480a = false;
      }
    }
    if (totalSpeeches480a >= 5 && maxFillerRun480a >= 3) {
      issues.push({
        location: `${maxFillerRun480a} consecutive speech(es) open with a verbal filler`,
        rule: 'DIALOGUE_FILLER_RUN',
        severity: 'minor',
        description: `${maxFillerRun480a} consecutive dialogue speeches each open with a verbal hedge — "Well,", "Look,", "Listen,", "Actually,", or similar — stacking hesitation into an unbroken chain. Where one or two scattered filler openers read as character voice, a run of three or more in succession creates a rhythm of perpetual stalling: each speech signals uncertainty before it delivers meaning, and the cumulative effect is an exchange where no character begins with conviction. Readers feel the momentum drain from the scene with each new hedge, before a single word of actual content has been spoken.`,
        suggestedFix: 'Break the run by having at least one speaker in the sequence lead with their actual first meaningful word: "Well, I think we should leave" becomes "We should leave." A character who charges in without a hedge contrasts sharply with one who hedges, so breaking even one link in the chain varies the rhythm and restores dramatic momentum to the exchange.',
      });
    }
  }

  // ACTION_AVERAGE_LINE_BREVITY (average/aggregate × action prose × word count, ≥8 action
  // lines, avg ≤ 4 words per line): The action prose layer is collectively telegraphic — the
  // average action line is four words or fewer. A screenplay's action prose is the visual
  // fabric of the film: specific objects in specific arrangements, movements through describable
  // space, physical details that make a director's and actor's imagination land on the same
  // concrete image. When action lines average four words or fewer across the whole script, the
  // prose has reduced to shorthand notation rather than image construction — the direction is
  // present but the scene is not. An average of ≤4 words signals that the visual layer has not
  // been written, only gestured at. Average/aggregate mode × action prose layer × word-count
  // dimension. Distinct from REACTION_SHOT_OVERUSE (Wave 163: proportion of ≤5-word terse
  // reaction shots — a subset of short lines, not the global average), ELLIPSIS_ACTION_OVERUSE
  // (Wave 424: proportion of trailing-off lines — punctuation mark, not length), ACTION_PRONOUN_
  // OPENER_FLOOD (Wave 466: how paragraphs begin, not their length): this is the first check
  // on the aggregate word-count density of the action prose layer.
  {
    let actionLineCount480b = 0;
    let actionWordTotal480b = 0;
    let inDlg480b = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg480b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg480b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg480b = true; continue; }
      if (t.startsWith('(')) continue;
      if (inDlg480b) continue;
      actionLineCount480b++;
      actionWordTotal480b += t.split(/\s+/).filter(Boolean).length;
    }
    if (actionLineCount480b >= 8) {
      const avgActionWords480b = actionWordTotal480b / actionLineCount480b;
      if (avgActionWords480b <= 4) {
        issues.push({
          location: `Action prose — avg ${avgActionWords480b.toFixed(1)} words/line across ${actionLineCount480b} lines`,
          rule: 'ACTION_AVERAGE_LINE_BREVITY',
          severity: 'minor',
          description: `The ${actionLineCount480b} action lines average ${avgActionWords480b.toFixed(1)} words each — the visual prose layer has been reduced to telegraphic shorthand. A screenplay's action description is the only place where the visual world is actually constructed: specific objects in specific arrangements, physical details that make a director's imagination land on the same concrete image as the writer's. At four words per line or fewer, the action layer is present only as notation — "She sits.", "He runs.", "Door closes." — not as scene. An audience's imagination cannot populate blank space; the director cannot construct what has not been written.`,
          suggestedFix: 'Expand at least a third of the action lines to full sentences that complete the image: instead of "She sits." try "She drops into the chair as if her legs gave out." The additional words should not be adverbs — they should be specific physical or environmental details that tell the camera where to look and the actor what their body is doing. A line that averages five or more words signals that the writer has chosen to write scenes, not just outline them.',
        });
      }
    }
  }

  // ACTION_PEAK_PARAGRAPH (single-peak isolation × action prose × paragraph length, ≥4 action
  // paragraphs, peak word count ≥ 5× average and ≥ 40 words): One action paragraph is
  // dramatically longer than all the others — a single sprawling over-written set piece
  // surrounded by otherwise sparse prose. When one paragraph dwarfs the rest by a factor of
  // five or more, the script's visual register is wildly inconsistent: the reader speeds
  // through quick cuts and notation, then encounters a wall of prose — a tonal jolt that reads
  // as either a showpiece the writer loved and couldn't cut, or a passage written at a different
  // time in a different style. The single long paragraph also suffers from being read at a
  // different pace than the story warrants, since the script's default reading rhythm is the
  // short block. Single-peak isolation mode × action prose layer × paragraph word-count
  // magnitude. Distinct from ACTION_AVERAGE_LINE_BREVITY (Wave 480a: overall brevity — this
  // checks for an isolated outlier peak, not global average), ELLIPSIS_ACTION_OVERUSE (Wave 424:
  // trailing punctuation, not length), REACTION_SHOT_OVERUSE (Wave 163: terse-shot proportion):
  // this is the first single-peak isolation check in originality.ts.
  {
    const paragraphWords480c: number[] = [];
    let curParaWords480c = 0;
    let prevWasBlank480c = true;
    let inDlg480c = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) {
        if (curParaWords480c > 0) { paragraphWords480c.push(curParaWords480c); curParaWords480c = 0; }
        prevWasBlank480c = true; inDlg480c = false; continue;
      }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) {
        if (curParaWords480c > 0) { paragraphWords480c.push(curParaWords480c); curParaWords480c = 0; }
        prevWasBlank480c = false; inDlg480c = false; continue;
      }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) {
        if (curParaWords480c > 0) { paragraphWords480c.push(curParaWords480c); curParaWords480c = 0; }
        inDlg480c = true; prevWasBlank480c = false; continue;
      }
      if (t.startsWith('(')) { prevWasBlank480c = false; continue; }
      if (inDlg480c) { prevWasBlank480c = false; continue; }
      curParaWords480c += t.split(/\s+/).filter(Boolean).length;
      prevWasBlank480c = false;
    }
    if (curParaWords480c > 0) paragraphWords480c.push(curParaWords480c);
    if (paragraphWords480c.length >= 4) {
      const peakWords480c = Math.max(...paragraphWords480c);
      // Compare peak against the average of all OTHER paragraphs (excluding the peak itself)
      // so the outlier doesn't inflate the baseline it is measured against.
      const othersSum480c = paragraphWords480c.reduce((s, n) => s + n, 0) - peakWords480c;
      const othersAvg480c = othersSum480c / (paragraphWords480c.length - 1);
      if (peakWords480c >= 40 && othersAvg480c > 0 && peakWords480c / othersAvg480c >= 5) {
        issues.push({
          location: `Action paragraphs — peak ${peakWords480c} words vs rest avg ${othersAvg480c.toFixed(1)} words (${(peakWords480c / othersAvg480c).toFixed(1)}× outlier)`,
          rule: 'ACTION_PEAK_PARAGRAPH',
          severity: 'minor',
          description: `One action paragraph runs to ${peakWords480c} words — ${(peakWords480c / othersAvg480c).toFixed(1)}× the average of ${othersAvg480c.toFixed(1)} words for all other action paragraphs. The prose layer's visual register is wildly inconsistent: the reader speeds through notation and brief cuts, then encounters a single sprawling description that reads at a different tempo and in a different register from the surrounding pages. A single outlier this large signals either a showpiece the writer couldn't trim or a passage written at a different time in a different mode — neither serves the unified reading experience a produced script requires.`,
          suggestedFix: 'Break the long paragraph into smaller beats with visual cuts between them, or trim back to the three or four essential images and trust the director to fill the rest. A paragraph should rarely exceed 50 words in a produced screenplay; six to twelve words per line, with a blank line between beats, matches the reading rhythm the rest of the script has established. If the passage is a showpiece chase or action set piece, apply the same economy — specific images in short blocks — rather than novelistic prose.',
        });
      }
    }
  }

  // ── Wave 494: DIALOGUE_QUESTION_RUN, DIALOGUE_SHORT_RUN, DIALOGUE_SPEAKER_SOLO ──

  // DIALOGUE_QUESTION_RUN (run-based × dialogue × question punctuation, ≥6 total speeches,
  // maxConsecutiveRun ≥ 4): Four or more consecutive dialogue speeches each end with "?" —
  // a pure interrogative exchange where nobody answers anything. Characters volley question
  // after question without ever staking a claim, asserting a fact, or making a demand.
  // A question-only run signals that the writer is building suspense by withholding rather
  // than building suspense by confrontation: the characters are circling without landing.
  // Distinctness: DIALOGUE_QUESTION_FLOOD (Wave 466) fires when >35% of all dialogue lines
  // end with "?" — a global proportion; this fires when a LOCAL run reaches ≥4 consecutive
  // speeches ending with "?", which can fire in a question-dense script that isn't globally
  // dominated by questions. DIALOGUE_FILLER_RUN (Wave 480) checks the opening word, not
  // the closing punctuation. DIALOGUE_QUESTION_DROUGHT (Wave 396) checks the opposite extreme.
  {
    let inDlg494a = false;
    let curSpeechText494a = '';
    let curQRun494a = 0;
    let maxQRun494a = 0;
    let totalSpeeches494a = 0;
    const flushSpeech494a = () => {
      if (!inDlg494a || !curSpeechText494a.trim()) return;
      totalSpeeches494a++;
      if (curSpeechText494a.trim().endsWith('?')) {
        curQRun494a++;
        if (curQRun494a > maxQRun494a) maxQRun494a = curQRun494a;
      } else {
        curQRun494a = 0;
      }
      curSpeechText494a = '';
    };
    for (const line of lines) {
      const t = line.trim();
      if (!t) { flushSpeech494a(); inDlg494a = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { flushSpeech494a(); inDlg494a = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { flushSpeech494a(); inDlg494a = true; continue; }
      if (t.startsWith('(')) continue;
      if (!inDlg494a) continue;
      curSpeechText494a += ' ' + t;
    }
    flushSpeech494a();
    if (totalSpeeches494a >= 6 && maxQRun494a >= 4) {
      issues.push({
        location: `${maxQRun494a} consecutive speech(es) ending with "?"`,
        rule: 'DIALOGUE_QUESTION_RUN',
        severity: 'minor',
        description: `${maxQRun494a} consecutive dialogue speeches each end with a question mark — a sustained interrogative exchange where no character answers anything. Characters volley questions without asserting, demanding, or staking a claim; the exchange builds suspense by withholding rather than by confrontation. A run of four or more questions in a row signals that the scene is generating pressure through information-deficit alone, without the friction of competing assertions. Interrogative exchanges work when one character's question challenges another's certainty — the question opens a wound the second speaker then has to navigate; when questions just follow questions, no pressure accumulates.`,
        suggestedFix: `Break the question run by having at least one speaker in the sequence answer, assert, or deflect rather than ask. A statement in the middle of a question string — even a refusal to answer — changes the dynamics: "What do you want?" / "I want you to stop." / "Stop what?" creates tension because the one assertion lands in the middle of the interrogative current. The question before and after the assertion hit harder because something was at stake between them.`,
      });
    }
  }

  // DIALOGUE_SHORT_RUN (run-based × dialogue × speech brevity, ≥8 total speeches,
  // maxConsecutiveRun ≥ 5 each ≤3 words total): Five or more consecutive dialogue speeches
  // each contain three words or fewer — a staccato burst of pure one-liners that drains
  // character voice to its most telegraphic. Individual short speeches are powerful and efficient;
  // a run of five or more in succession signals that the scene has gone into pure terse exchange
  // mode, with no character having enough space to reveal intention, backstory, or complication.
  // Character voice requires enough words to carry rhythm, register, and specificity; a run of
  // three-word-and-under speeches reduces every speaker to the same register of clipped urgency.
  // Distinctness: DIALOGUE_SHORT_LINE_DOMINANCE (Wave 396) fires when >75% of ALL dialogue lines
  // across the script are ≤4 words — a global proportion; this fires when a local burst reaches
  // ≥5 consecutive speeches of ≤3 words, which can fire in a script not globally dominated by
  // short lines. DIALOGUE_FILLER_RUN (Wave 480) checks opener word, not word count.
  // DIALOGUE_QUESTION_RUN (Wave 494a) checks closing punctuation, not speech length.
  {
    let inDlg494b = false;
    let curSpeechWords494b = 0;
    let hasDlgLine494b = false;
    let curShortRun494b = 0;
    let maxShortRun494b = 0;
    let totalSpeeches494b = 0;
    const flushSpeech494b = () => {
      if (!inDlg494b || !hasDlgLine494b) return;
      totalSpeeches494b++;
      if (curSpeechWords494b <= 3) {
        curShortRun494b++;
        if (curShortRun494b > maxShortRun494b) maxShortRun494b = curShortRun494b;
      } else {
        curShortRun494b = 0;
      }
      curSpeechWords494b = 0;
      hasDlgLine494b = false;
    };
    for (const line of lines) {
      const t = line.trim();
      if (!t) { flushSpeech494b(); inDlg494b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { flushSpeech494b(); inDlg494b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { flushSpeech494b(); inDlg494b = true; continue; }
      if (t.startsWith('(')) continue;
      if (!inDlg494b) continue;
      curSpeechWords494b += t.split(/\s+/).filter(Boolean).length;
      hasDlgLine494b = true;
    }
    flushSpeech494b();
    if (totalSpeeches494b >= 8 && maxShortRun494b >= 5) {
      issues.push({
        location: `${maxShortRun494b} consecutive speech(es) of ≤3 words`,
        rule: 'DIALOGUE_SHORT_RUN',
        severity: 'minor',
        description: `${maxShortRun494b} consecutive dialogue speeches each contain three words or fewer — a staccato burst that compresses character voice into pure telegraphy. Individual short speeches are powerful; five or more in a row signal that the scene has entered a mode where no character has room to reveal intention, register, or complication. When every speech in a run is this compressed, all speakers collapse into the same clipped register: the distinct rhythms, vocabulary levels, and emotional textures that differentiate characters on the page become impossible to maintain in three words or fewer. A sustained staccato run also removes breathing room for subtext, since subtext requires the space between a speech's apparent surface and its implied meaning — which three words rarely contain.`,
        suggestedFix: `Break the short-speech run by letting at least one speaker in the sequence expand into four or more words: enough space to let register, diction, and character specificity emerge. A longer speech in the middle of a terse exchange creates rhythm contrast — the expansion lands harder for the compression around it — and gives the actor and director a moment of character interiority amid the staccato exchange.`,
      });
    }
  }

  // DIALOGUE_SPEAKER_SOLO (underweight/bloat × dialogue × speaker distribution, ≥3 speakers,
  // ≥10 dialogue lines, dominant speaker >60% of total lines): One character delivers more than
  // 60% of all dialogue lines while at least two other speakers exist. The script's conversation
  // is a monologue disguised as dialogue — one voice carries the dramatic material while the
  // others function as reactive sounding boards or prompts. When one speaker dominates to this
  // degree, the story's dramatic material flows entirely through one perspective, the other
  // characters' interiority is underdeveloped, and the audience hears one consciousness
  // interpreting events rather than multiple consciousnesses in conflict. Underweight/bloat
  // mode × dialogue layer × speaker distribution. Distinctness: DIALOGUE_SHORT_LINE_DOMINANCE
  // (Wave 396) checks line length, not speaker; DIALOGUE_MONOLOGUE_DROUGHT (Wave 438) checks
  // whether any single speech is >15 words, not who speaks how often; no existing check in this
  // pass audits per-speaker share of the dialogue budget.
  {
    const speakerLines494c = new Map<string, number>();
    let currentSpeaker494c: string | null = null;
    let totalDlgLines494c = 0;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { currentSpeaker494c = null; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { currentSpeaker494c = null; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) {
        currentSpeaker494c = t.replace(/\s*\(.*\)\s*$/, '').trim();
        continue;
      }
      if (t.startsWith('(')) continue;
      if (!currentSpeaker494c) continue;
      speakerLines494c.set(currentSpeaker494c, (speakerLines494c.get(currentSpeaker494c) ?? 0) + 1);
      totalDlgLines494c++;
    }
    if (speakerLines494c.size >= 3 && totalDlgLines494c >= 10) {
      const maxLines494c = Math.max(...speakerLines494c.values());
      if (maxLines494c / totalDlgLines494c > 0.6) {
        const dominantSpeaker494c =
          [...speakerLines494c.entries()].find(([, v]) => v === maxLines494c)![0];
        issues.push({
          location: `${dominantSpeaker494c} — ${maxLines494c}/${totalDlgLines494c} dialogue lines (${(maxLines494c / totalDlgLines494c * 100).toFixed(0)}%)`,
          rule: 'DIALOGUE_SPEAKER_SOLO',
          severity: 'minor',
          description: `${dominantSpeaker494c} delivers ${maxLines494c} of ${totalDlgLines494c} dialogue lines (${(maxLines494c / totalDlgLines494c * 100).toFixed(0)}%) — more than 60% of the script's entire conversation — while ${speakerLines494c.size - 1} other speaking character(s) share the remainder. The script's dramatic material flows almost entirely through one voice; the other characters function as prompts and reactive sounding boards rather than as independent consciousnesses. When one speaker dominates to this degree, the audience hears one perspective interpreting events, the other characters' inner lives remain underdeveloped, and the story's conflicts feel like internal debates rather than genuine clashes between distinct wills.`,
          suggestedFix: `Redistribute the dramatic weight: let other characters carry scenes, lead confrontations, or disclose information independently of the dominant speaker. A character who has been a reactive prompt can be elevated by giving them a scene they initiate, information only they hold, or an emotional position that directly challenges the dominant speaker's assumptions. The goal is not equal distribution — the protagonist may naturally carry more — but the non-dominant speakers should each have at least one scene where their interiority lands on the audience without the dominant voice framing it.`,
        });
      }
    }
  }

  // ── Wave 508 checks ──────────────────────────────────────────────────────────

  // DIALOGUE_SAME_SPEAKER_RUN — Run-based × dialogue × speaker alternation void.
  // ≥5 consecutive dialogue speeches by the same speaker while ≥3 total speakers and
  // ≥12 total dialogue lines exist → fire. A run of five or more speeches by the same
  // character within an apparently multi-speaker script is a local monologue: it freezes
  // out the other characters for long enough that the exchange loses its dialogic quality
  // entirely. The other characters are present but voiceless; the scene converts from
  // confrontation to lecture. Even a genuinely one-sided exchange — an interrogation, a
  // command — needs interjections, interruptions, or brief responses to keep the sense
  // that other characters have wills of their own.
  // Distinct from: DIALOGUE_SPEAKER_SOLO (Wave 494: global share >60% across the entire
  // script — a different mode measuring the cumulative dominance of one voice; this fires
  // on any single LOCAL run regardless of global balance), DIALOGUE_MONOLOGUE_DROUGHT (Wave
  // 438: absence of long individual speeches — opposite problem), DIALOGUE_SHORT_RUN (Wave
  // 494: brevity × speech length, not speaker identity), DIALOGUE_QUESTION_RUN (Wave 494:
  // punctuation, not speaker identity), DIALOGUE_FILLER_RUN (Wave 480: opener word, not
  // speaker identity). First run-based check on speaker-identity continuity.
  {
    const speakerCuePat508a = /^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/;
    let currentSpeaker508a: string | null = null;
    let prevSpeaker508a: string | null = null;
    let curSpeakerRun508a = 0;
    let maxSpeakerRun508a = 0;
    let maxSpeakerName508a = '';
    const speakerSet508a = new Set<string>();
    let totalSpeechLines508a = 0;
    let inDlg508a = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg508a = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg508a = false; continue; }
      if (speakerCuePat508a.test(t)) {
        const spk508a = t.replace(/\s*\(.*\)\s*$/, '').trim();
        speakerSet508a.add(spk508a);
        if (spk508a !== prevSpeaker508a) {
          if (prevSpeaker508a !== null && curSpeakerRun508a > maxSpeakerRun508a) {
            maxSpeakerRun508a = curSpeakerRun508a;
            maxSpeakerName508a = prevSpeaker508a;
          }
          prevSpeaker508a = spk508a;
          curSpeakerRun508a = 0;
        }
        currentSpeaker508a = spk508a;
        inDlg508a = true;
        continue;
      }
      if (t.startsWith('(')) continue;
      if (!inDlg508a || !currentSpeaker508a) continue;
      curSpeakerRun508a++;
      totalSpeechLines508a++;
    }
    if (prevSpeaker508a !== null && curSpeakerRun508a > maxSpeakerRun508a) {
      maxSpeakerRun508a = curSpeakerRun508a;
      maxSpeakerName508a = prevSpeaker508a;
    }
    if (speakerSet508a.size >= 3 && totalSpeechLines508a >= 12 && maxSpeakerRun508a >= 5) {
      issues.push({
        location: `${maxSpeakerName508a} — ${maxSpeakerRun508a} consecutive dialogue line(s)`,
        rule: 'DIALOGUE_SAME_SPEAKER_RUN',
        severity: 'minor',
        description: `${maxSpeakerName508a} delivers ${maxSpeakerRun508a} consecutive dialogue lines without any other character speaking — a local monologue within a multi-speaker script. A run of five or more lines by one character freezes out all other voices: the scene converts from exchange to lecture, and the other characters become silent props rather than wills in opposition. Even a genuinely one-sided exchange — an interrogation, a confession, a command — benefits from interjections, interruptions, or brief reactions to maintain the sense that the listener has a will of their own.`,
        suggestedFix: `Break the ${maxSpeakerName508a} monologue with at least one interjection, interruption, or brief response from another character. It need not be substantial: a deflection, a half-sentence, an objection, or even a "(CONT'D)" acknowledgement of a listener's reaction. The goal is to preserve the felt sense of an exchange — two or more wills present — rather than one consciousness speaking into silence.`,
      });
    }
  }

  // ACTION_THEN_OPENER_FLOOD — Underweight/bloat × action prose × "Then" sequential openers.
  // >25% of ≥8 action lines begin with "Then " → fire. The word "Then" at the start of an
  // action line signals that the writer is narrating a sequence of events rather than presenting
  // images. "Then she opens the door." "Then the lights go out." These lines impose a past-tense
  // chronological-narrative register onto what should be the unfolding cinematic present: the
  // reader is told WHEN things happen (after the previous thing) instead of being SHOWN what is
  // happening now. "Then" starters drain visual immediacy from the action prose.
  // Distinct from: ACTION_PRONOUN_OPENER_FLOOD (Wave 466: "He"/"She" — subject-first grammar,
  // not temporal sequencing), GERUND_OPENER_DOMINANCE (Wave 259: "-ing" participial phrases,
  // not temporal connectors), COPULA_ACTION_DOMINANCE (Wave 259: linking verbs — predicate form),
  // PASSIVE_VERB_DOMINANCE (Wave 438: passive construction — verb form), FILTERING_VERB_OVERUSE
  // (Wave 259: perception verbs — entirely different pattern). First check in this pass auditing
  // temporal-connector starters in action prose.
  {
    const thenOpenerRe508b = /^Then\b/i;
    let actionTotal508b = 0;
    let thenCount508b = 0;
    let inDlg508b = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg508b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg508b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg508b = true; continue; }
      if (t.startsWith('(')) continue;
      if (inDlg508b) continue;
      actionTotal508b++;
      if (thenOpenerRe508b.test(t)) thenCount508b++;
    }
    if (actionTotal508b >= 8 && thenCount508b / actionTotal508b > 0.25) {
      issues.push({
        location: `${thenCount508b} of ${actionTotal508b} action lines begin with "Then"`,
        rule: 'ACTION_THEN_OPENER_FLOOD',
        severity: 'minor',
        description: `${thenCount508b} of ${actionTotal508b} action lines (${Math.round(thenCount508b / actionTotal508b * 100)}%) begin with "Then" — the writer is narrating a chronological sequence rather than presenting images. "Then she opens the door" imposes a past-tense storytelling register onto what should be the kinetic cinematic present: the reader is told WHEN each action follows the last rather than being dropped into the immediate moment of it happening. Sustained use of "Then" as an action-line starter drains visual immediacy and signals that the screenplay's prose layer is thinking like prose fiction rather than like visual staging.`,
        suggestedFix: `Cut the leading "Then" and start the action with its subject or verb: "Then she opens the door" → "She opens the door" or "The door swings open." If temporal sequence needs marking, use a physical cause instead of a temporal connector: "Startled by the knock, she opens the door" places the action in the present without narrating its order in the sequence.`,
      });
    }
  }

  // DIALOGUE_WISH_STATEMENT_FLOOD — Underweight/bloat × dialogue × counterfactual/regret register.
  // >20% of ≥8 dialogue lines contain counterfactual/wish language ("wish," "if only," "should
  // have," "could have," "would have," "used to," "wanted to") → fire. Characters speak
  // predominantly in backward-looking regret rather than in present-tense confrontation. When
  // more than a fifth of all dialogue is counterfactual — mourning what was or imagining what
  // might have been — the scene loses the kinetic quality of present-tense dramatic confrontation
  // and becomes therapy rather than action. Characters process the past instead of fighting for
  // the present.
  // Distinct from: PRESENT_PERFECT_FLOOD (Wave 364: >25% of lines use "have"/"had" — broader
  // past-tense orientation, not specifically counterfactual regret constructions), FUTURE_TENSE_
  // FLOOD (Wave 283: >35% of lines in future tense — forward projection, not backward longing),
  // REPORTED_SPEECH_FLOOD (Wave 406: recounting what others said — different form of past-
  // orientation). First check in this pass targeting the counterfactual/wish register specifically.
  {
    const wishRe508c = /\b(wish|if only|should have|could have|would have|used to|wanted to|meant to|tried to|supposed to)\b/i;
    let dlgTotal508c = 0;
    let wishCount508c = 0;
    let inDlg508c = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg508c = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg508c = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg508c = true; continue; }
      if (t.startsWith('(')) continue;
      if (!inDlg508c) continue;
      dlgTotal508c++;
      if (wishRe508c.test(t)) wishCount508c++;
    }
    if (dlgTotal508c >= 8 && wishCount508c / dlgTotal508c > 0.20) {
      issues.push({
        location: `${wishCount508c} of ${dlgTotal508c} dialogue lines carry counterfactual/wish language`,
        rule: 'DIALOGUE_WISH_STATEMENT_FLOOD',
        severity: 'minor',
        description: `${wishCount508c} of ${dlgTotal508c} dialogue lines (${Math.round(wishCount508c / dlgTotal508c * 100)}%) contain counterfactual or regret language — "wish," "if only," "should have," "could have," "would have," "used to," "wanted to." Characters speak predominantly in backward-looking regret rather than in present-tense confrontation. When more than a fifth of all dialogue is counterfactual, scenes lose the kinetic quality of characters fighting for the present and become therapy sessions: people processing the past together rather than clashing over what is happening now. Drama lives in the present tense — in what characters need, want, and fear RIGHT NOW, not in their longing for what was or was not.`,
        suggestedFix: `Recast counterfactual statements as present-tense stakes or present-tense conflict: "I wish you had stayed" → "Why are you leaving?" or "I need you to stay." Move the character's backward-looking regret into a forward-looking demand, question, or claim. Counterfactual dialogue is most powerful when it is isolated — one character's "if only" lands harder when surrounded by characters who are fighting for the now rather than mourning what's past.`,
      });
    }
  }

  // ── Wave 522 checks ──────────────────────────────────────────────────────

  // DIALOGUE_HEDGING_FLOOD — underweight/bloat × dialogue × uncertainty register.
  // >25% of ≥8 dialogue lines contain hedging/uncertainty vocabulary. Characters who
  // perpetually hedge never commit to a position — every declaration is qualified,
  // every confrontation softened, every desire wrapped in doubt. Sustained hedging
  // drains the dramatic confrontation from dialogue and replaces it with equivocation.
  // Distinct from: DIALOGUE_WISH_STATEMENT_FLOOD (Wave 508: backward regret/counterfactual
  // — "I wish/should have" — different register, past not present uncertainty), DIALOGUE_
  // FILLER_OPENER (non-committal openers like "well/um/uh" — opener pattern not content),
  // DIALOGUE_I_DOMINANCE (personal pronoun count). First check on uncertainty/hedging register.
  {
    const hedgeRe522a = /\b(maybe|perhaps|sort of|kind of|i guess|i suppose|i think|probably|possibly|might be|seem to|apparently|not sure|don't know|i'm not sure)\b/i;
    let dlgTotal522a = 0;
    let hedgeCount522a = 0;
    let inDlg522a = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg522a = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg522a = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg522a = true; continue; }
      if (t.startsWith('(')) continue;
      if (!inDlg522a) continue;
      dlgTotal522a++;
      if (hedgeRe522a.test(t)) hedgeCount522a++;
    }
    if (dlgTotal522a >= 8 && hedgeCount522a / dlgTotal522a > 0.25) {
      issues.push({
        location: `${hedgeCount522a} of ${dlgTotal522a} dialogue lines carry hedging/uncertainty language`,
        rule: 'DIALOGUE_HEDGING_FLOOD',
        severity: 'minor',
        description: `${hedgeCount522a} of ${dlgTotal522a} dialogue lines (${Math.round(hedgeCount522a / dlgTotal522a * 100)}%) contain hedging or uncertainty language — "maybe," "perhaps," "I think," "I guess," "probably," "possibly," "sort of," "kind of," "apparently," "seem to," "not sure." When more than a quarter of all dialogue is hedged, characters never commit to a position: every statement is qualified, every confrontation softened, every desire wrapped in doubt. Drama requires characters who want things urgently and say so — equivocation at this scale drains the dialogue of the directness that makes confrontation feel real. Sustained hedging teaches the audience that these characters do not fully believe what they say.`,
        suggestedFix: `Replace hedged statements with committed ones: "Maybe you're right" → "You're right" or "You're wrong." Let characters take positions even when uncertain — it is more dramatic to be wrong with conviction than to be perpetually noncommittal. Reserve hedging for a character whose specific trait is passivity or uncertainty, and let that trait have contrast against the rest of the dialogue.`,
      });
    }
  }

  // DIALOGUE_AGREEMENT_RUN — run-based × dialogue × affirmation openers.
  // ≥4 consecutive dialogue lines opening with affirmation/agreement words. Characters
  // who only affirm each other create a scene with no friction: the scene becomes a
  // confirmation chamber rather than a dramatic space where something is at stake.
  // Distinct from: DIALOGUE_FILLER_RUN (Wave 480: "well/uh/yeah" non-committal openers —
  // fillers, not explicit agreement), DIALOGUE_QUESTION_RUN (Wave 494: "?" ending —
  // different pattern and ending not opener), DIALOGUE_SAME_SPEAKER_RUN (Wave 508: speaker
  // identity — who speaks, not content), all other run checks. First run check on affirmation
  // opener pattern.
  {
    const agreeRe522b = /^(yes[,!\.]|right[,!\.]|okay[,!\.]|ok[,!\.]|sure[,!\.]|of course|absolutely|exactly[,!\.]|fine[,!\.]|i agree|i know[,!\.]|agreed[,!]|certainly|definitely|indeed)/i;
    let maxAgreeRun522b = 0;
    let curAgreeRun522b = 0;
    let inDlg522b = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg522b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg522b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg522b = true; continue; }
      if (t.startsWith('(')) continue;
      if (!inDlg522b) { curAgreeRun522b = 0; continue; }
      if (agreeRe522b.test(t)) {
        curAgreeRun522b++;
        if (curAgreeRun522b > maxAgreeRun522b) maxAgreeRun522b = curAgreeRun522b;
      } else {
        curAgreeRun522b = 0;
      }
    }
    if (maxAgreeRun522b >= 4) {
      issues.push({
        location: `longest agreement run: ${maxAgreeRun522b} consecutive dialogue lines`,
        rule: 'DIALOGUE_AGREEMENT_RUN',
        severity: 'minor',
        description: `The script contains a run of ${maxAgreeRun522b} consecutive dialogue lines each opening with an affirmation or agreement ("yes," "right," "okay," "sure," "of course," "absolutely," "exactly," "of course," "agreed," etc.). An extended agreement run means characters are only confirming each other rather than clashing, negotiating, or competing — the scene becomes a confirmation chamber with no friction. Drama is built on want, resistance, and transaction; when characters only agree, none of those engines is running. A run of ${maxAgreeRun522b} affirmations suggests a scene that is narrating consensus rather than staging conflict.`,
        suggestedFix: `Break the agreement run with at least one line of pushback, qualification, or condition: instead of "Yes, right, of course, absolutely," give a character a "yes, but..." or a "right, except..." that introduces friction. Agreement can be the destination of a scene, but it should be achieved against resistance, not simply stated as the starting position of every speaker.`,
      });
    }
  }

  // DIALOGUE_COMMAND_FLOOD — underweight/bloat × dialogue × imperative/command register.
  // >25% of ≥8 dialogue lines open with a strong command verb. Characters who communicate
  // exclusively through imperatives — issuing orders at every turn — flatten the dialogue's
  // emotional and exploratory range. Command-dominant dialogue removes interiority: there
  // is no uncertainty, no desire expressed as longing, no question genuinely asked — only
  // directives. Distinct from: DIALOGUE_HEDGING_FLOOD (uncertainty register, opposite of
  // command), DIALOGUE_QUESTION_FLOOD (questions are requesting, not commanding), ACTION_
  // PRONOUN_OPENER_FLOOD (action lines not dialogue). First check on the imperative register.
  {
    const cmdRe522c = /^(go |stop |come |get |take |give |look |leave |run |find |listen |turn |move |wait |stay |tell |show |put |open |close |help |bring |hold |let's |let me |don't |do |check |watch |read |write |call |pick |pull |push |jump |sit |stand )/i;
    let dlgTotal522c = 0;
    let cmdCount522c = 0;
    let inDlg522c = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg522c = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg522c = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg522c = true; continue; }
      if (t.startsWith('(')) continue;
      if (!inDlg522c) continue;
      dlgTotal522c++;
      if (cmdRe522c.test(t)) cmdCount522c++;
    }
    if (dlgTotal522c >= 8 && cmdCount522c / dlgTotal522c > 0.25) {
      issues.push({
        location: `${cmdCount522c} of ${dlgTotal522c} dialogue lines open with a command verb`,
        rule: 'DIALOGUE_COMMAND_FLOOD',
        severity: 'minor',
        description: `${cmdCount522c} of ${dlgTotal522c} dialogue lines (${Math.round(cmdCount522c / dlgTotal522c * 100)}%) open with an imperative command verb — "go," "stop," "come," "get," "find," "listen," "turn," etc. Characters who communicate predominantly through directives flatten the dialogue's emotional range: there is no interiority, no desire expressed as longing, no question genuinely asked — only orders. Command-dominant dialogue removes the exploratory, relational, and emotional registers that reveal character. It is also dramatically limiting: when characters only issue directives, scenes feel like logistics rather than confrontation between people who want different things.`,
        suggestedFix: `Redistribute the dialogue register by introducing lines that express desire, uncertainty, or observation rather than pure command: "I need you to go" instead of "Go"; "Why won't you listen?" instead of "Listen." Imperatives are most powerful when they are isolated against a background of more varied expression — the command that comes after genuine emotional engagement lands with far more weight than the twelfth imperative in a row.`,
      });
    }
  }

  // ── Wave 536: DIALOGUE_NEGATIVE_IMPERATIVE_FLOOD, DIALOGUE_EXCLAMATION_RUN,
  //              DIALOGUE_SHORT_SPEECH_FLOOD ──────────────────────────────────────────────────────────

  // DIALOGUE_NEGATIVE_IMPERATIVE_FLOOD — Underweight/bloat × dialogue × negative command register.
  // >20% of ≥8 dialogue lines open with a prohibition or negative imperative — "don't," "never,"
  // "stop," "can't you," "won't you," "you can't," "you don't," "do not," "no more." Characters
  // whose communication is dominated by prohibition and refusal flatten the dialogue's emotional
  // and exploratory range: there is no desire expressed as longing, no question genuinely asked,
  // no assertion made positively — only the denial of action and the refusal of engagement.
  // Distinct from: DIALOGUE_COMMAND_FLOOD (Wave 522: positive imperative openers — "go," "get,"
  // "find"; this is the negative-polarity complement), DIALOGUE_HEDGING_FLOOD (Wave 522: uncertainty
  // vocabulary — "maybe," "I think"; different register, permission-seeking vs. prohibition).
  {
    const negImpRe536a = /^(don't|never |stop |can't you|won't you|you can't|you don't|do not |no more|please don't|i won't|i can't|i don't)/i;
    let dlgTotal536a = 0;
    let negImpCount536a = 0;
    let inDlg536a = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg536a = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg536a = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg536a = true; continue; }
      if (t.startsWith('(')) continue;
      if (!inDlg536a) continue;
      dlgTotal536a++;
      if (negImpRe536a.test(t)) negImpCount536a++;
    }
    if (dlgTotal536a >= 8 && negImpCount536a / dlgTotal536a > 0.20) {
      issues.push({
        location: `${negImpCount536a} of ${dlgTotal536a} dialogue lines open with a negative imperative or prohibition`,
        rule: 'DIALOGUE_NEGATIVE_IMPERATIVE_FLOOD',
        severity: 'minor',
        description: `${negImpCount536a} of ${dlgTotal536a} dialogue lines (${Math.round(negImpCount536a / dlgTotal536a * 100)}%) open with a prohibition or negative imperative — "don't," "never," "stop," "you can't," "I won't," etc. Characters who communicate predominantly through refusal and denial flatten the dialogue's emotional register: there is no desire expressed as longing, no genuine curiosity, no positive assertion — only the prohibition of action and the refusal of engagement. Prohibition-dominant dialogue is also dramatically limiting: when characters only say what they will not do, the scene lacks the positive wanting that drives dramatic transaction. Dramatic conflict requires characters who want specific things and act on those wants — not just characters who refuse each other's wants.`,
        suggestedFix: `Redistribute the dialogue register: for every prohibition, introduce a desire expressed positively — "I want you to stay" instead of "Don't go," "I need this to work" instead of "You can't stop me." The most effective negative imperatives are isolated against a background of positive assertion, where the prohibition arrives as a revelation of what was silently wanted rather than as the default register of speech.`,
      });
    }
  }

  // DIALOGUE_EXCLAMATION_RUN — Run-based × dialogue × exclamation endings.
  // ≥4 consecutive dialogue lines each ending with "!" — a sustained exclamatory streak that drains
  // emphasis through repetition. A single exclamation has force; four or more in a row normalize
  // exclamation as the baseline register, so no individual line retains its urgency or emotional
  // weight. The audience becomes habituated to the exclamation as a verbal tic rather than as a
  // genuine signal of elevated emotion.
  // Distinct from: DIALOGUE_QUESTION_RUN (Wave 494: question endings — different punctuation),
  // DIALOGUE_AGREEMENT_RUN (Wave 522: agreement openers — different position and content),
  // DIALOGUE_FILLER_RUN (Wave 480: filler openers — opener not ending), DIALOGUE_SAME_SPEAKER_RUN
  // (Wave 508: speaker repetition — different signal). First run-based check on exclamation endings.
  {
    let maxExclRun536b = 0;
    let curExclRun536b = 0;
    let inDlg536b = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg536b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg536b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg536b = true; continue; }
      if (t.startsWith('(')) continue;
      if (!inDlg536b) continue;
      if (t.endsWith('!')) {
        curExclRun536b++;
        if (curExclRun536b > maxExclRun536b) maxExclRun536b = curExclRun536b;
      } else {
        curExclRun536b = 0;
      }
    }
    if (maxExclRun536b >= 4) {
      issues.push({
        location: `longest exclamation run: ${maxExclRun536b} consecutive exclamatory dialogue lines`,
        rule: 'DIALOGUE_EXCLAMATION_RUN',
        severity: 'minor',
        description: `The script contains a run of ${maxExclRun536b} consecutive dialogue lines each ending with an exclamation mark. A sustained exclamatory streak drains the punctuation of its meaning: when every line exclaims, no individual line retains the urgency or emotional weight that a single "!" is supposed to signal. The audience becomes habituated to exclamation as the baseline register of speech — a verbal tic rather than a genuine marker of elevated emotion, urgency, or surprise. The most powerful use of exclamation in dialogue is isolated: the single "!" that arrives after several declarative lines commands attention precisely because it breaks the pattern.`,
        suggestedFix: `Break the exclamation run by varying the punctuation of adjacent lines — allow some to conclude with a period (declarative), a question mark (genuine inquiry), or no terminal punctuation (trailing thought). A run of ${maxExclRun536b} exclamations can be reduced by replacing at least half with declarative or questioning statements; the exclamations that remain will immediately recover their force.`,
      });
    }
  }

  // DIALOGUE_SHORT_SPEECH_FLOOD — Underweight/bloat × dialogue × speech brevity.
  // >60% of ≥8 dialogue lines contain ≤3 words — characters communicate in fragments without
  // substantive expression. Dialogue that consists overwhelmingly of one-, two-, or three-word
  // utterances ("Yes." / "I know." / "Get out.") evacuates the spoken language of specificity,
  // nuance, and character voice. Short speeches can be powerful in isolation; when they dominate
  // a screenplay at >60%, the verbal texture of the story is reduced to the barest transactional
  // minimum — characters gesture at communication rather than enacting it.
  // Distinct from: ONE_WORD_LINE_DOMINANCE in dialogue.ts (Wave 311: ≤1 word at >35% rate — this
  // extends the brevity threshold to ≤3 words at a >60% rate, catching telegraphic micro-speeches
  // not captured by the single-word check), DIALOGUE_COMMAND_FLOOD (opener pattern not length).
  {
    let dlgTotal536c = 0;
    let shortCount536c = 0;
    let inDlg536c = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg536c = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg536c = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg536c = true; continue; }
      if (t.startsWith('(')) continue;
      if (!inDlg536c) continue;
      dlgTotal536c++;
      const wordCount536c = t.split(/\s+/).filter((w: string) => w.length > 0).length;
      if (wordCount536c <= 3) shortCount536c++;
    }
    if (dlgTotal536c >= 8 && shortCount536c / dlgTotal536c > 0.60) {
      issues.push({
        location: `${shortCount536c} of ${dlgTotal536c} dialogue lines contain ≤3 words`,
        rule: 'DIALOGUE_SHORT_SPEECH_FLOOD',
        severity: 'minor',
        description: `${shortCount536c} of ${dlgTotal536c} dialogue lines (${Math.round(shortCount536c / dlgTotal536c * 100)}%) contain three words or fewer. Dialogue dominated by micro-speeches — "Yes." / "I know." / "Fine." / "Get out." — evacuates the spoken language of specificity, nuance, and individual character voice. Very short speeches are powerful in isolation, as the punctuation of an otherwise richer exchange; when they constitute the overwhelming majority of the dialogue, the verbal texture of the story is reduced to the barest transactional minimum. Characters who communicate almost exclusively in fragments cannot reveal the complexity of what they want or who they are — the most specific character voices require at least some speeches of sufficient length to carry a full thought.`,
        suggestedFix: `Expand at least half of the three-word-or-under lines into fuller speeches that reveal what is behind the brevity: what the character is refusing to say fully, what they want and cannot ask for directly, or what they observe that opens a new angle on the scene. Short speeches can be an effective rhetorical device — a sudden burst of brevity after longer exchanges — but they need a context of richer verbal expression to carry their weight.`,
      });
    }
  }

  // ── Wave 550: PARENTHETICAL_FLOOD, DIALOGUE_LONG_SPEECH_FLOOD, ACTION_ADVERB_FLOOD ──────────────

  // PARENTHETICAL_FLOOD — underweight/bloat × parenthetical × per-speech density.
  // >35% of ≥8 character speeches are immediately followed by a parenthetical direction.
  // A parenthetical ("(sighs)", "(beat)", "(angry)") is an over-direction: it instructs
  // the actor exactly how to deliver the line, removing the interpretive space that makes
  // performances nuanced and memorable. Professional screenwriting convention reserves
  // parentheticals for cases where the intended meaning cannot be inferred from context
  // or where a specific direction is necessary to prevent misreading. When >35% of all
  // speeches are immediately prefaced with a parenthetical, the writer is doing the actor's
  // job — pre-interpreting every beat before the line is read. A script crowded with
  // parentheticals signals over-control and reads as amateur or stage-direction prose.
  // Distinct from: all dialogue content checks (HEDGING_FLOOD, COMMAND_FLOOD, AGREEMENT_RUN,
  // etc. — those target the spoken text itself, not the parenthetical instructions preceding
  // it), all action-line checks (PASSIVE_VERB_DOMINANCE, PRONOUN_OPENER_FLOOD — those target
  // action not parenthetical lines). First check in this pass targeting parenthetical density.
  {
    let speechCount550a = 0;
    let parentheticalCount550a = 0;
    let lastWasCharCue550a = false;
    let lastWasParen550a = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { lastWasCharCue550a = false; lastWasParen550a = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { lastWasCharCue550a = false; lastWasParen550a = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) {
        speechCount550a++;
        lastWasCharCue550a = true;
        lastWasParen550a = false;
        continue;
      }
      if (t.startsWith('(') && lastWasCharCue550a && !lastWasParen550a) {
        parentheticalCount550a++;
        lastWasParen550a = true;
        lastWasCharCue550a = false;
        continue;
      }
      lastWasCharCue550a = false;
    }
    if (speechCount550a >= 8 && parentheticalCount550a / speechCount550a > 0.35) {
      issues.push({
        location: `${parentheticalCount550a} of ${speechCount550a} dialogue speeches preceded by a parenthetical direction`,
        rule: 'PARENTHETICAL_FLOOD',
        severity: 'minor',
        description: `${parentheticalCount550a} of ${speechCount550a} dialogue speeches (${Math.round(parentheticalCount550a / speechCount550a * 100)}%) are immediately preceded by a parenthetical direction — "(sighs)," "(beat)," "(angry)," "(quietly)," etc. Professional screenwriting convention reserves parentheticals for cases where the intended reading cannot be inferred from context or where a specific direction prevents critical misreading. When more than a third of all speeches are parenthetically directed, the writer is pre-interpreting every performance beat, removing the interpretive space that makes an actor's delivery nuanced and personal. A script dense with parentheticals reads as over-controlled and signals a writer who does not trust the dialogue, the actor, or the director to find the intended meaning. The best lines need no parenthetical — they contain the emotional direction in the word choices themselves.`,
        suggestedFix: `Delete parentheticals wherever the dialogue's content, rhythm, or context makes the delivery self-evident. Reserve parentheticals for genuinely ambiguous cases — where the same line could be read as sarcasm or sincerity, where a character's physical action must be described mid-speech, or where a change in address must be marked. After deleting obvious parentheticals, review whether the remaining dialogue carries its intended emotional charge without additional direction; if it does not, revise the words rather than adding instructions.`,
      });
    }
  }

  // DIALOGUE_LONG_SPEECH_FLOOD — underweight/bloat × dialogue × speech length (excessive).
  // >30% of ≥8 dialogue lines contain >15 words. Dialogue dominated by long, expository speeches
  // burdens the scene with monologue-like density: characters make formal arguments, deliver
  // explanations, or narrate their interior states at a length that theatre can support but
  // that cinema and television resist. Long speeches occupy screen time without physical action,
  // reduce scene dynamics (one character talks while others listen), and signal that the writer
  // is relying on dialogue to convey information the camera should be showing. They also work
  // against the verbal rhythm patterns that distinguish cinematic dialogue — the staccato
  // exchange, the interrupted line, the reaction shot between short beats.
  // Distinct from: DIALOGUE_SHORT_SPEECH_FLOOD (Wave 536: ≤3 word speeches — the opposite
  // extreme; this targets excessive length, that targets excessive brevity), DIALOGUE_COMMAND_FLOOD
  // (opener pattern not length), DIALOGUE_HEDGING_FLOOD (register content not length). First check
  // on excessive dialogue line length in this pass.
  {
    let dlgTotal550b = 0;
    let longCount550b = 0;
    let inDlg550b = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg550b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg550b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg550b = true; continue; }
      if (t.startsWith('(')) continue;
      if (!inDlg550b) continue;
      dlgTotal550b++;
      const wordCount550b = t.split(/\s+/).filter((w: string) => w.length > 0).length;
      if (wordCount550b > 15) longCount550b++;
    }
    if (dlgTotal550b >= 8 && longCount550b / dlgTotal550b > 0.30) {
      issues.push({
        location: `${longCount550b} of ${dlgTotal550b} dialogue lines contain >15 words`,
        rule: 'DIALOGUE_LONG_SPEECH_FLOOD',
        severity: 'minor',
        description: `${longCount550b} of ${dlgTotal550b} dialogue lines (${Math.round(longCount550b / dlgTotal550b * 100)}%) contain more than 15 words. Dialogue dominated by lengthy, expository speeches creates a monologue texture that cinema resists: long unbroken speeches occupy screen time without physical action, reduce scene dynamics to one character talking while others listen, and signal that the writer is using dialogue to convey information that should be visible. Cinematic dialogue is characteristically brief, interrupted, subtext-laden, and shaped around reaction shots — patterns that long speeches preclude. At >30%, the script has more in common with theatrical or literary prose than with screenwriting, where the image and the cut — not the speech — are the primary storytelling tools.`,
        suggestedFix: `Break long speeches into shorter exchanges: interrupt the speaker with a reaction, a physical action, or another character's line. Cut any sentence from a long speech that conveys information the audience already has or that can be shown rather than stated. The target should be no single speech longer than 3–4 lines of dialogue — speeches that extend beyond that are monologues, and monologues should be used sparingly and purposefully, not as the default mode of conversation.`,
      });
    }
  }

  // ACTION_ADVERB_FLOOD — underweight/bloat × action × adverb density.
  // >35% of ≥8 action lines contain at least one adverb ending in "-ly". Over-modified action prose
  // signals a writer who tells rather than shows through word choice: "she walks quickly" instead of
  // "she sprints," "he speaks quietly" instead of "he murmurs." An adverb applied to a verb is a
  // symptom of an imprecise verb: the specific verb already contains the manner the adverb is
  // attempting to add. When adverbs dominate action prose at this rate, the writing is doing double
  // work (verb + modifier) instead of the single, more precise verb that screenwriting favors. Action
  // lines are the closest the screenplay has to cinematography — the camera sees specific action, not
  // general action with a manner qualifier. Imprecise action prose is the opposite of cinematic prose.
  // Distinct from: PASSIVE_VERB_DOMINANCE (Wave 438: passive verb construction — different grammatical
  // phenomenon, passivity vs. adverb modification), ACTION_PRONOUN_OPENER_FLOOD (Wave 466: opener
  // position × pronoun — different target, opener character not adverb content), all dialogue checks
  // (those target spoken text not action lines). First adverb-density check on action lines in this pass.
  {
    const advRe550c = /\b\w+ly\b/i;
    let actionTotal550c = 0;
    let advCount550c = 0;
    let inDlg550c = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg550c = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg550c = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg550c = true; continue; }
      if (t.startsWith('(')) continue;
      if (inDlg550c) continue;
      // This is an action line
      actionTotal550c++;
      if (advRe550c.test(t)) advCount550c++;
    }
    if (actionTotal550c >= 8 && advCount550c / actionTotal550c > 0.35) {
      issues.push({
        location: `${advCount550c} of ${actionTotal550c} action lines contain an adverb ending in "-ly"`,
        rule: 'ACTION_ADVERB_FLOOD',
        severity: 'minor',
        description: `${advCount550c} of ${actionTotal550c} action lines (${Math.round(advCount550c / actionTotal550c * 100)}%) contain at least one adverb ending in "-ly." Adverb-saturated action prose is a hallmark of telling rather than showing: "she walks quickly" is a less vivid choice than "she sprints," and "he speaks quietly" is weaker than "he murmurs." When more than a third of action lines rely on an adverb to supply the manner of an action, the verbs are not doing their job: each adverb signals an imprecise verb that needed modification. Cinematic action prose favors specific, manner-bearing verbs ("slams," "creeps," "collapses") over general verbs with modifying adverbs ("closes forcefully," "moves slowly," "falls down dramatically"). The camera sees what characters do, not how they do it in the abstract — only specific verbs produce specific images.`,
        suggestedFix: `Replace each adverb-modified verb pair with a single, specific verb that contains the manner: "walks quickly" → "strides," "moves slowly" → "creeps," "looks carefully" → "studies," "speaks quietly" → "murmurs," "runs fast" → "sprints." Read each adverb as a diagnostic: it indicates that a more precise verb exists and is not being used. After replacement, the action lines will be shorter, more visual, and more specific — the three qualities that distinguish cinematic prose from general narrative prose.`,
      });
    }
  }

  // ── Wave 564: SLUG_INT_EXT_MONOTONE, DIALOGUE_EM_DASH_INTERRUPTION_FLOOD,
  //              ACTION_THE_OPENER_FLOOD ──────────────────────────────────────────────────────────

  // SLUG_INT_EXT_MONOTONE — distribution/monotony × scene heading × interior/exterior register.
  // ≥8 classifiable scene sluglines (each clearly INT. or EXT.), zero mixed (INT/EXT., I/E.) slugs,
  // and the dominant register accounts for >90% of them → fire. The story unfolds in one spatial
  // register: every scene is an interior, or every scene is an exterior. Interior and exterior carry
  // distinct cinematic grammar — interiors are enclosed, controlled, intimate, claustrophobic;
  // exteriors are open, exposed, weather-bound, expansive. A screenplay that never crosses between
  // them flattens its visual world to a single spatial mode, forfeiting the contrast that makes a
  // cut from a cramped room to an open horizon (or vice versa) carry meaning. The interior/exterior
  // alternation is one of the most basic tools for giving a film visual rhythm and for using space
  // to externalize a character's psychological state.
  // Distinct from: SCENE_SLUG_TIME_MONOTONE (Wave 245: monotony on the TIME-of-day indicator —
  // DAY/NIGHT/etc.; this audits the INT/EXT prefix, an orthogonal axis of the slugline), LOCATION_
  // REPETITION / REPEATED_LOCATION_EXCESS (Wave 273: same NAMED location overused — a different
  // slugline field, the place name not the interior/exterior register), CONTINUOUS_SLUG_OVERUSE
  // (Wave 368: the CONTINUOUS time tag). First check on the interior/exterior register of sluglines.
  {
    let intCount564a = 0;
    let extCount564a = 0;
    let mixedCount564a = 0;
    for (const line of lines) {
      const t = line.trim();
      if (/^(INT\/EXT\.|I\/E\.)/i.test(t)) { mixedCount564a++; continue; }
      if (/^INT\./i.test(t)) { intCount564a++; continue; }
      if (/^EXT\./i.test(t)) { extCount564a++; continue; }
    }
    const classifiable564a = intCount564a + extCount564a;
    if (classifiable564a >= 8 && mixedCount564a === 0) {
      const dominant564a = Math.max(intCount564a, extCount564a);
      if (dominant564a / classifiable564a > 0.9) {
        const register564a = intCount564a >= extCount564a ? 'interior (INT.)' : 'exterior (EXT.)';
        issues.push({
          location: `${dominant564a} of ${classifiable564a} scene sluglines are ${register564a}`,
          rule: 'SLUG_INT_EXT_MONOTONE',
          severity: 'minor',
          description: `${dominant564a} of ${classifiable564a} scene sluglines (${Math.round(dominant564a / classifiable564a * 100)}%) are ${register564a} — the story unfolds in essentially one spatial register. Interior and exterior carry distinct cinematic grammar: interiors are enclosed, controlled, intimate, often claustrophobic; exteriors are open, exposed, weather-bound, expansive. A screenplay that never crosses between them flattens its visual world to a single spatial mode and forfeits the contrast that makes a cut from a cramped room to an open horizon (or the reverse) carry meaning. The interior/exterior alternation is a basic tool for giving a film visual rhythm and for using physical space to externalize a character's psychological state — a tool this script leaves almost entirely unused.`,
          suggestedFix: `Move at least some scenes into the opposite register: if the story is interior-bound, find the scenes that could play outdoors — a confrontation that spills into the street, a private moment on a rooftop, a journey between locations. The shift need not be arbitrary; let the change of space mean something — a character who finally steps outside after being trapped indoors, or one who retreats inside after exposure. Spatial contrast is one of the cheapest and most powerful sources of cinematic variety.`,
        });
      }
    }
  }

  // DIALOGUE_EM_DASH_INTERRUPTION_FLOOD — underweight/bloat × dialogue × trailing interruption dash.
  // ≥8 dialogue lines, >30% end with an em-dash ("—") or a double-hyphen ("--") → fire. The trailing
  // dash is the screenplay convention for an interrupted or cut-off line: the character is stopped
  // mid-thought by another speaker, an event, or their own hesitation. Used sparingly, interruption
  // creates urgency and overlap that makes dialogue feel alive. Used on more than a third of all
  // lines, it becomes a verbal tic that makes every exchange feel frantic and unfinished — no one
  // ever completes a thought, every beat is a collision, and the device loses all impact through
  // repetition. A script where interruption is the default rhythm reads as mannered and exhausting:
  // the technique that should mark the story's most charged confrontations is spent on ordinary
  // conversation.
  // Distinct from: DIALOGUE_ELLIPSIS_FLOOD (Wave 452: trailing "..." — the trailing-OFF / fading
  // device, a different punctuation mark and a different effect; the dash is a hard cut-off, the
  // ellipsis a soft trail), DIALOGUE_EXCLAMATION_FLOOD (Wave 536: trailing "!" — emphatic not
  // interruptive), DIALOGUE_QUESTION_FLOOD (trailing "?"), DIALOGUE_FILLER_OPENER / _RUN (opener
  // position not line ending). First check targeting the trailing interruption dash in dialogue.
  {
    let dlgTotal564b = 0;
    let dashCount564b = 0;
    let inDlg564b = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg564b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg564b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg564b = true; continue; }
      if (t.startsWith('(')) continue;
      if (!inDlg564b) continue;
      dlgTotal564b++;
      if (/(—|--)$/.test(t)) dashCount564b++;
    }
    if (dlgTotal564b >= 8 && dashCount564b / dlgTotal564b > 0.30) {
      issues.push({
        location: `${dashCount564b} of ${dlgTotal564b} dialogue lines end with an interruption dash`,
        rule: 'DIALOGUE_EM_DASH_INTERRUPTION_FLOOD',
        severity: 'minor',
        description: `${dashCount564b} of ${dlgTotal564b} dialogue lines (${Math.round(dashCount564b / dlgTotal564b * 100)}%) end with an em-dash or double-hyphen — the convention for an interrupted or cut-off line. Used sparingly, interruption creates urgency and overlap that makes dialogue feel alive and reactive. Used on more than a third of all lines, it becomes a verbal tic: every exchange feels frantic and unfinished, no character ever completes a thought, and the device loses all impact through sheer repetition. A script where interruption is the default rhythm reads as mannered and exhausting — the technique that should be reserved for the story's most charged collisions is spent on ordinary conversation, leaving nothing in reserve for the moments that should genuinely cut a character off.`,
        suggestedFix: `Let most lines complete. Reserve the interruption dash for the moments where being cut off matters — a confession stopped before it lands, an argument where speakers genuinely talk over each other, a warning that arrives too late. Replace the bulk of the trailing dashes with completed lines or with periods; the contrast will make the remaining interruptions land hard. If two characters genuinely overlap throughout a scene, that frantic rhythm should be a deliberate, isolated choice — not the texture of the entire script.`,
      });
    }
  }

  // ACTION_POLYSYNDETON_FLOOD — underweight/bloat × action prose × internal "and"-clause chaining.
  // ≥8 action lines, >20% of them contain two or more standalone "and" conjunctions → fire. A line
  // with multiple "and"s strings actions into an undifferentiated chain: "He grabs the bag and bolts
  // for the door and throws it open and runs." Polysyndeton has legitimate uses — it can create
  // breathless momentum in a single charged beat — but when more than a fifth of all action lines
  // chain three-plus clauses with "and," the device stops being a choice and becomes the writer's
  // default sentence-assembly method. The result is action prose with no internal hierarchy: every
  // beat carries equal weight because nothing is subordinated, broken out, or given its own line.
  // On screen, each of those chained actions is a separate shot or moment; collapsing them into one
  // run-on sentence flattens the editing rhythm the prose should imply and buries the one action in
  // the chain that actually matters.
  // Distinct from: OPENING_CONJUNCTION_OVERUSE (Wave: action lines that OPEN with And/But/So — opener
  // position, a single leading conjunction; this audits INTERNAL "and" density, two-plus per line),
  // ACTION_THEN_OPENER_FLOOD (Wave 466: "Then" sequential openers — opener position, different word),
  // COPULA_ACTION_DOMINANCE (is/are/was constructions — a different grammatical phenomenon), ACTION_
  // OPENER_MONOTONY (repeated first word — opener-position monotony, not internal coordination). First
  // check on internal clause-chaining density in action prose.
  {
    let actionTotal564c = 0;
    let polysyndetonCount564c = 0;
    let inDlg564c = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg564c = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg564c = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg564c = true; continue; }
      if (t.startsWith('(')) continue;
      if (inDlg564c) continue;
      // This is an action line — count standalone "and" conjunctions (word-boundaried, so "band",
      // "hand", "Andrew" do not match). Two or more signals a chained, run-on construction.
      actionTotal564c++;
      const andMatches564c = t.match(/\band\b/gi);
      if (andMatches564c && andMatches564c.length >= 2) polysyndetonCount564c++;
    }
    if (actionTotal564c >= 8 && polysyndetonCount564c / actionTotal564c > 0.20) {
      issues.push({
        location: `${polysyndetonCount564c} of ${actionTotal564c} action lines chain 3+ clauses with "and"`,
        rule: 'ACTION_POLYSYNDETON_FLOOD',
        severity: 'minor',
        description: `${polysyndetonCount564c} of ${actionTotal564c} action lines (${Math.round(polysyndetonCount564c / actionTotal564c * 100)}%) contain two or more standalone "and" conjunctions — stringing three or more actions into a single undifferentiated chain ("He grabs the bag and bolts for the door and throws it open"). Polysyndeton can create breathless momentum in a single charged beat, but when more than a fifth of all action lines chain clauses this way, it has stopped being a deliberate device and become the default sentence-assembly method. The result is action prose with no internal hierarchy: every beat carries equal weight because nothing is subordinated or broken out onto its own line. On screen each chained action is a separate shot or moment; collapsing them into one run-on sentence flattens the editing rhythm the prose should imply and buries the single action in the chain that actually matters.`,
        suggestedFix: `Break the chained lines apart. Give the action that matters its own sentence — often its own line — and cut or subordinate the connective tissue around it. "He grabs the bag and bolts for the door and throws it open and runs" becomes "He grabs the bag. Bolts for the door, throws it open — and runs." Reserve polysyndeton for the rare beat where the unbroken rush is the point. Varying clause length and structure restores the internal hierarchy that tells the reader (and the editor) which action is the beat and which are merely the lead-up.`,
      });
    }
  }

  // ── Wave 578: ─────────────────────────────────────────────────────────────

  // SLUG_SAME_LOCATION_RUN — run-based × slug × consecutive same-location sequence.
  // ≥8 total sluglines; extract base location (strip INT./EXT./INT\/EXT./I\/E. prefix and
  // trailing time-of-day label separated by a dash: DAY, NIGHT, MORNING, EVENING, DUSK,
  // DAWN, LATER, CONTINUOUS, SAME, etc.); track the longest consecutive run of the identical
  // base location; fire if run ≥5.
  // Cinema depends on spatial movement: each location transition is a cut in the story's
  // geography. An unbroken stretch of five or more scenes in the same base arena — even across
  // INT./EXT. variations or time-of-day changes — signals the story has stalled in one place,
  // draining the feeling of journey and progress.
  // Distinct from: LOCATION_REPETITION (Wave 273: counts total sluglines where one named location
  // makes up >70% of all sluglines — global proportion across the whole script, not consecutive
  // adjacency), SLUG_INT_EXT_MONOTONE (Wave 564: interior/exterior register axis, not the location
  // name), CONTINUOUS_SLUG_OVERUSE (Wave 368: the CONTINUOUS time tag, not the location itself).
  // First run-based check on consecutive same-location sequences in sluglines.
  {
    const slugLines578a: string[] = [];
    for (const line of lines) {
      const t = line.trim();
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) slugLines578a.push(t);
    }
    if (slugLines578a.length >= 8) {
      const baseLoc578a = (slug: string) => slug
        .replace(/^(INT\.\/EXT\.|I\/E\.|INT\.|EXT\.)\s*/i, '')
        .replace(/\s*-+\s*(DAY|NIGHT|MORNING|EVENING|DUSK|DAWN|LATER|CONTINUOUS|SAME|MOMENTS LATER|DAY\/NIGHT|NIGHT\/DAY|EARLY MORNING|LATE NIGHT)\s*$/i, '')
        .trim().toLowerCase();
      let maxRun578a = 0;
      let curRun578a = 0;
      let prevLoc578a = '';
      for (const slug of slugLines578a) {
        const loc = baseLoc578a(slug);
        if (loc === prevLoc578a) { curRun578a++; } else { curRun578a = 1; prevLoc578a = loc; }
        if (curRun578a > maxRun578a) maxRun578a = curRun578a;
      }
      if (maxRun578a >= 5) {
        issues.push({
          location: `${maxRun578a} consecutive sluglines share the same base location`,
          rule: 'SLUG_SAME_LOCATION_RUN',
          severity: 'minor',
          description: `The script runs ${maxRun578a} or more consecutive scene headings in the same base location — a stretch of action that never leaves one physical space, regardless of INT./EXT. variations or time-of-day changes. Cinematic grammar relies on location contrast: each location transition is a cut in the story's spatial map, a shift in atmosphere and possibility. An unbroken run of five-plus scenes in the same arena collapses that geography into a single static stage, making the film feel spatially locked-in. Even when dramatic intensity is high, the absence of spatial change dulls the sense of journey and removes one of cinema's most basic tools for marking progression — the cut to somewhere new.`,
          suggestedFix: `Break the run by relocating at least one scene in the stretch to a different physical space — a corridor, a car, an exterior, a neighboring room. The new location need not be exotic; even a brief scene in a distinct space restores the sense of movement and gives the editor a spatial cut to work with. If the story genuinely demands an extended single-location stretch (a siege, a courtroom drama, a party), make that confinement intentional and visible: the claustrophobia itself should be a dramatic choice, not an artifact of staging convenience.`,
        });
      }
    }
  }

  // ACTION_PRESENT_CONTINUOUS_FLOOD — underweight/bloat × action prose × continuous-progressive
  // aspect. ≥8 action lines; >25% of them contain a continuous-progressive construction: a
  // form of "be" (is, are, was, were) followed immediately by a gerund (word ending in -ing).
  // The continuous progressive describes an ongoing background state rather than a completed,
  // decisive action. In screenplay action prose, this aspect is the signature of mood-painting
  // ("she is staring at the floor", "the crowd is moving in") versus event-snapping ("she stares",
  // "the crowd moves"). When more than a quarter of all action lines default to the progressive,
  // the prose reads as a diffuse ambient atmosphere rather than a sequence of discrete events.
  // Distinct from: PASSIVE_VERB_DOMINANCE (Wave 438: "is seen"/"are found"/"can be heard" —
  // passive voice; the grammatical subject is acted upon, agent absent or demoted; continuous
  // progressive keeps the actor as subject and describes their ongoing action), COPULA_ACTION_
  // DOMINANCE (Wave 259: "is"/"are"/"was"/"were" as linking verbs before adjective or noun
  // predicates — "he is alone", "the room is dark"; predicate is a state description, not a
  // gerund action), ACTION_ADVERB_FLOOD (Wave 424/550: manner adverbs — a different phenomenon).
  // First check targeting continuous-progressive aspect in action prose.
  {
    let actionTotal578b = 0;
    let progCount578b = 0;
    let inDlg578b = false;
    const PROG_PAT578b = /\b(is|are|was|were)\s+[a-z]+ing\b/i;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg578b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg578b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg578b = true; continue; }
      if (t.startsWith('(')) continue;
      if (inDlg578b) continue;
      actionTotal578b++;
      if (PROG_PAT578b.test(t)) progCount578b++;
    }
    if (actionTotal578b >= 8 && progCount578b / actionTotal578b > 0.25) {
      issues.push({
        location: `${progCount578b} of ${actionTotal578b} action lines use continuous-progressive aspect`,
        rule: 'ACTION_PRESENT_CONTINUOUS_FLOOD',
        severity: 'minor',
        description: `${progCount578b} of ${actionTotal578b} action lines (${Math.round(progCount578b / actionTotal578b * 100)}%) use a continuous-progressive construction — "is running," "are watching," "was climbing," "were waiting." The continuous progressive implies an ongoing background state rather than a completed, directed action. In screenplay action prose, simple present tense is the standard because it is instantaneous and decisive: "runs," "watches," "climbs." The progressive form describes what a character is doing as a condition rather than an event — mood-painting instead of event-sequencing. When more than a quarter of all action lines default to this aspect, the prose reads as a series of ambient states rather than a driven sequence: the story is something that is happening diffusely, not something that cuts into frame as purposeful action.`,
        suggestedFix: `Replace progressive constructions with simple present tense: "is running" → "runs," "are watching" → "watch," "was climbing" → "climbed." Simple present is the screenplay convention for precisely this reason — it is immediate, decisive, and on-screen. Reserve the progressive for the rare lines where the ongoing-state reading genuinely serves the moment ("she is still sitting there when he finally arrives"), and let the rest snap into present tense. The rewrite typically also shortens lines and tightens visual rhythm.`,
      });
    }
  }

  // DIALOGUE_BACKSTORY_OPENER_FLOOD — underweight/bloat × dialogue × past-temporal exposition
  // openers. ≥8 dialogue lines; >20% of them open with a past-temporal backstory anchor phrase:
  // "Years ago,", "Back then,", "Before you", "When I was", "Back when", "In those days", etc.
  // These openers are the grammatical signature of delivered backstory — a character pauses the
  // present drama to report an event from the past. Used occasionally they are legitimate
  // exposition; when more than a fifth of all dialogue lines open this way, the script runs its
  // emotional work through retrospective narration rather than present conflict.
  // Distinct from: DIALOGUE_WISH_STATEMENT_FLOOD (Wave 508: "used to / I wish / if only / should
  // have" — backward-looking regret and counterfactual register; the orientation is wishing and
  // mourning loss, not reporting events; backstory openers report events factually by anchoring
  // them at a specific past time), PRESENT_PERFECT_FLOOD (past-tense verbs broadly across any
  // sentence position — not tied to line-opening temporal anchors that explicitly mark a jump to
  // the past), DIALOGUE_FILLER_OPENER (Wave 452: "Well,/Look,/Listen," — non-temporal hedges that
  // stall the start of a line but carry no time-placement content). First check targeting past-
  // temporal backstory openers at the start of dialogue lines.
  {
    let dlgTotal578c = 0;
    let backstoryCount578c = 0;
    let inDlg578c = false;
    const BACKSTORY_PAT578c = /^(years?\s+ago\b|back\s+(then|when)\b|before\s+(you|we|i|he|she|they|the|all)\b|when\s+(i|you|he|she|we|they|it)\s+(was|were|had|could|would)\b|in\s+those\s+days\b|back\s+in\s+those\b|once\s+upon\s+a\b|a\s+long\s+time\s+ago\b|those\s+days\b|those\s+were\b)/i;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inDlg578c = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg578c = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg578c = true; continue; }
      if (t.startsWith('(')) continue;
      if (!inDlg578c) continue;
      dlgTotal578c++;
      if (BACKSTORY_PAT578c.test(t)) backstoryCount578c++;
    }
    if (dlgTotal578c >= 8 && backstoryCount578c / dlgTotal578c > 0.20) {
      issues.push({
        location: `${backstoryCount578c} of ${dlgTotal578c} dialogue lines open with a past-temporal backstory anchor`,
        rule: 'DIALOGUE_BACKSTORY_OPENER_FLOOD',
        severity: 'minor',
        description: `${backstoryCount578c} of ${dlgTotal578c} dialogue lines (${Math.round(backstoryCount578c / dlgTotal578c * 100)}%) open with a past-temporal backstory anchor — "Years ago," "Back then," "Before you," "When I was," and similar phrases that pause the present drama to deliver a report from the past. Used occasionally, these openers legitimately ground a character's behavior in their history. When more than a fifth of all dialogue lines begin this way, the script has organized its emotional work around retrospective narration rather than present conflict: characters speak in the past tense about events the audience cannot see, while the drama actually happening in the scene plays out in summary. The audience watches characters recall rather than act.`,
        suggestedFix: `Find the backstory moments that are doing the most dramatic work and dramatize them as scenes: show the event rather than having a character report it. For remaining backstory dialogue, test whether the temporal anchor is necessary — often "Years ago, I made a mistake" can be trimmed to "I made a mistake" because the past-ness is understood. Reserve explicit temporal backstory openers for the single defining formative moment that must be named aloud, then trust the present conflict to carry the drama. What characters do now, in front of the audience, is always more dramatic than what they remember.`,
      });
    }
  }

  // ── Wave 592: DRAMATIC_TURN_ZONE_CLUSTER, PURPOSE_CONSECUTIVE_RUN,
  //              SCENE_CLOSER_ELLIPSIS_FLOOD ─────────────────────────────────────────────────

  // DRAMATIC_TURN_ZONE_CLUSTER — Distribution/timing × dramaticTurn presence × structural thirds.
  // n≥9, ≥3 scenes with a dramatic turn (dramaticTurn !== 'nothing'). Divides the story into
  // thirds; if >75% of turn-bearing scenes fall in a single third → fire. The story's structural
  // pivots are ghettoized into one zone rather than spread across the arc — once the audience
  // notices which third of the screenplay carries the turns, they learn where (and when) to expect
  // the next pivot, which is precisely the kind of learned predictability this pass exists to catch.
  // First check in this pass to use the dramaticTurn signal at all; every other zone/cluster-style
  // check in this file operates on lexical/textual patterns (openers, punctuation, clichés) rather
  // than per-scene structural records.
  if (records.length >= 9) {
    const turnRecs592a = (records as any[]).filter(r => (r.dramaticTurn ?? 'nothing') !== 'nothing');
    if (turnRecs592a.length >= 3) {
      const n592a = records.length;
      const thirdCounts592a = [0, 0, 0];
      for (const r of turnRecs592a) {
        const idx = (records as any[]).indexOf(r);
        const zoneIdx = Math.min(2, Math.floor((idx / n592a) * 3));
        thirdCounts592a[zoneIdx]++;
      }
      const maxCount592a = Math.max(...thirdCounts592a);
      if (maxCount592a / turnRecs592a.length > 0.75) {
        const zoneNames592a = ['opening', 'middle', 'closing'];
        const zoneIdx592a = thirdCounts592a.indexOf(maxCount592a);
        issues.push({
          location: `${maxCount592a}/${turnRecs592a.length} dramatic-turn scene(s) in the ${zoneNames592a[zoneIdx592a]} third`,
          rule: 'DRAMATIC_TURN_ZONE_CLUSTER',
          severity: 'minor',
          description: `${Math.round((maxCount592a / turnRecs592a.length) * 100)}% of the story's ${turnRecs592a.length} dramatic-turn scenes (${maxCount592a} of them) cluster in the ${zoneNames592a[zoneIdx592a]} third of the screenplay. When pivots concentrate this heavily in one structural zone, the audience learns — consciously or not — which part of the story carries the surprises, and stops expecting a turn anywhere else. A truly unpredictable structure keeps pivots capable of arriving in any third.`,
          suggestedFix: `Relocate or add at least one dramatic turn outside the ${zoneNames592a[zoneIdx592a]} third. A pivot that can land anywhere in the structure — early, at the midpoint, or late — keeps the audience from mapping "when the surprises happen" onto a fixed zone of the script.`,
        });
      }
    }
  }

  // PURPOSE_CONSECUTIVE_RUN — Run-based × purpose (local consecutive repetition).
  // ≥4 consecutive scenes share the identical `purpose` value → fire. This is a LOCAL,
  // position-independent run check, distinct from UNIFORM_SCENE_PURPOSES (a GLOBAL aggregate:
  // ≤2 distinct purposes across the whole script, which can fire even when the repeats are spread
  // out and never touch), PURPOSE_BOOKEND_REPEAT (compares Act 1's dominant purpose against Act
  // 3's — a two-point structural comparison, not a run), and REVELATION_PURPOSE_MONOTONE (filters
  // to revelation scenes specifically). A run of 4+ consecutive same-purpose scenes means the
  // audience experiences the same FUNCTIONAL BEAT four times in a row regardless of surface
  // content — four consecutive "development" scenes, or four consecutive "establish_world" scenes
  // — which reads as structurally repetitive even if the dialogue and description vary. First
  // run-based check on the purpose channel in this pass.
  if (records.length >= 4) {
    let longestRun592b = 1;
    let longestPurpose592b = (records as any[])[0]?.purpose;
    let longestStart592b = 0;
    let curRun592b = 1;
    let curStart592b = 0;
    for (let i = 1; i < records.length; i++) {
      if ((records as any[])[i].purpose === (records as any[])[i - 1].purpose) {
        curRun592b++;
      } else {
        curRun592b = 1;
        curStart592b = i;
      }
      if (curRun592b > longestRun592b) {
        longestRun592b = curRun592b;
        longestPurpose592b = (records as any[])[i].purpose;
        longestStart592b = curStart592b;
      }
    }
    if (longestRun592b >= 4) {
      issues.push({
        location: `Scenes ${longestStart592b}–${longestStart592b + longestRun592b - 1} — ${longestRun592b} consecutive "${longestPurpose592b}" scenes`,
        rule: 'PURPOSE_CONSECUTIVE_RUN',
        severity: 'minor',
        description: `Scenes ${longestStart592b} through ${longestStart592b + longestRun592b - 1} (${longestRun592b} in a row) all share the identical scene purpose "${longestPurpose592b}". Even when the surface content — dialogue, setting, characters — varies from scene to scene, four or more consecutive scenes performing the same functional job reads as structurally repetitive: the audience settles into a rhythm of "another one of these" rather than feeling the story's gears shift.`,
        suggestedFix: `Break up the run by inserting a scene with a different functional purpose somewhere in the middle of the streak — a confrontation, a revelation, or a decision point that performs a different structural job than the surrounding scenes. Varying the FUNCTION of consecutive scenes, not just their content, keeps the story's rhythm from flattening.`,
      });
    }
  }

  // SCENE_CLOSER_ELLIPSIS_FLOOD — Positional/distribution × the final line of each scene.
  // n≥6 scenes (sluglines). For each scene segment (bounded by scene-heading lines using the same
  // slugline regex as SLUG_INTERIOR_DOMINANCE), find its last non-blank line; if ≥50% of scenes end
  // that final line in an ellipsis ("..." or "…") → fire. This is the first check in this pass to
  // isolate a fixed STRUCTURAL POSITION within each scene — the closer — mirroring the file's
  // extensive existing opener-position coverage (ACTION_OPENER_MONOTONY, GERUND_OPENER_DOMINANCE,
  // DIALOGUE_FILLER_OPENER, and others) but for the opposite end of the scene. Distinct from
  // ELLIPSIS_OVERUSE (any-position frequency of ellipses across all action lines, regardless of
  // where in the scene they fall) and DIALOGUE_ELLIPSIS_FLOOD (same, but scoped to dialogue lines) —
  // both are global frequency counts; this one is anchored to a specific position, the last line of
  // each scene, so it can fire even when the OVERALL ellipsis frequency is unremarkable, as long as
  // scenes are trailing off on the same rhythmic beat every time.
  {
    const sceneClosers592c: string[] = [];
    let currentScene592c: string[] = [];
    const flushScene592c = () => {
      for (let k = currentScene592c.length - 1; k >= 0; k--) {
        const t = currentScene592c[k].trim();
        if (t.length > 0) { sceneClosers592c.push(t); break; }
      }
      currentScene592c = [];
    };
    for (const line of lines) {
      const t = line.trim();
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) {
        if (currentScene592c.length > 0) flushScene592c();
      }
      currentScene592c.push(line);
    }
    if (currentScene592c.length > 0) flushScene592c();

    if (sceneClosers592c.length >= 6) {
      const ellipsisClosers592c = sceneClosers592c.filter(t => /(\.\.\.|…)\s*$/.test(t)).length;
      if (ellipsisClosers592c / sceneClosers592c.length >= 0.5) {
        issues.push({
          location: `${ellipsisClosers592c} of ${sceneClosers592c.length} scenes end their final line in an ellipsis`,
          rule: 'SCENE_CLOSER_ELLIPSIS_FLOOD',
          severity: 'minor',
          description: `${ellipsisClosers592c} of the screenplay's ${sceneClosers592c.length} scenes (${Math.round((ellipsisClosers592c / sceneClosers592c.length) * 100)}%) end their final line trailing off in an ellipsis. Used occasionally, a trailing ellipsis signals suspended thought or unresolved tension; used as the default exit for most scenes, it becomes a rhythmic tic — every scene fades the same way, and the audience learns to anticipate the exact shape of each transition before it arrives.`,
          suggestedFix: `Vary how scenes end: let some close on a hard action, a declarative line, an interruption, or a sound cue instead of a trailing ellipsis. Reserve the ellipsis exit for the scenes where suspended thought is specifically the point — its impact depends on it being the exception, not the rule.`,
        });
      }
    }
  }

  // ── Wave 606: CLOCK_RAISED_ZONE_CLUSTER, OPEN_THREAD_CURIOSITY_DECOUPLED,
  //              SCENE_STAGING_ZONE_IMBALANCE ────────────────────────────────────────────────

  // CLOCK_RAISED_ZONE_CLUSTER — Distribution/timing × clockRaised × structural thirds. Built on
  // checkZoneCluster from the shared checks library. n≥9, ≥3 clockRaised scenes, more than 75%
  // falling in a single structural third → fire. First use of the clockRaised field anywhere in
  // this 105-rule pass — every existing check here operates on lexical/textual signals (dialogue
  // and action-line patterns) or the purpose/dramaticTurn record channels; this is the first to
  // audit where the deadline-pressure device sits structurally. When the story's clock is raised
  // almost exclusively in one third, the audience learns which stretch of the script to expect
  // urgency in and which stretches are exempt from it — a predictable placement of a genre device,
  // the same kind of learned-rhythm problem this pass exists to catch in dialogue and action text.
  // Distinct from DRAMATIC_TURN_ZONE_CLUSTER (Wave 592: dramaticTurn channel, not clockRaised).
  {
    const r606a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.clockRaised === true,
    });
    if (r606a.fires) {
      const zoneName606a = r606a.zoneNames[r606a.maxZoneIdx];
      issues.push({
        location: `${zoneName606a} third — ${r606a.maxZoneCount}/${r606a.count} clock-raising scenes`,
        rule: 'CLOCK_RAISED_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r606a.maxZoneCount} of the story's ${r606a.count} clock-raising scenes (${Math.round((r606a.maxZoneCount / r606a.count) * 100)}%) cluster in the ${zoneName606a} third. Deadline pressure is introduced almost exclusively in that stretch of the story — once the audience notices the pattern, they learn which third to expect urgency in and read every scene outside it as exempt from time pressure by default.`,
        suggestedFix: `Raise or reinforce the clock in at least one scene outside the ${zoneName606a} third — even a brief reminder of the deadline in an underused zone keeps time pressure structurally unpredictable rather than confined to a single learned stretch.`,
      });
    }
  }

  // OPEN_THREAD_CURIOSITY_DECOUPLED — Co-occurrence/decoupling × unresolvedClues ×
  // curiosityDelta. Built on checkCoOccurrenceDecoupled from the shared checks library. n≥8,
  // ≥2 scenes carrying outstanding clue-debt, ≥2 scenes with a curiosity spike. Zero overlap →
  // fire. First use of both the unresolvedClues and curiosityDelta fields together anywhere in
  // this pass. When the scenes that carry open, unpaid questions never coincide with the scenes
  // that spike the audience's curiosity, the mystery engine and the debt it should be running on
  // are disconnected — curiosity spikes arrive divorced from what's actually still unresolved, a
  // formulaic pattern where the two signals that should reinforce each other instead run on
  // predictable, separate schedules.
  {
    const r606b = checkCoOccurrenceDecoupled({
      records, minRecords: 8, minACount: 2, minBCount: 2,
      isA: r => (r.unresolvedClues ?? []).length > 0,
      isB: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r606b.fires) {
      issues.push({
        location: `${r606b.aCount} open-thread scene(s), ${r606b.bCount} curiosity-spike scene(s) — zero overlap`,
        rule: 'OPEN_THREAD_CURIOSITY_DECOUPLED',
        severity: 'minor',
        description: `The ${r606b.aCount} scenes carrying outstanding, unpaid clue-debt never coincide with the ${r606b.bCount} scenes where curiosity spikes — the mystery engine and the debt it should be drawing on run on entirely separate tracks. Curiosity spikes that never intersect with what's actually left unresolved read as manufactured rather than earned, since the audience's wondering isn't visibly tied to the specific questions the story is holding open.`,
        suggestedFix: `Let at least one curiosity spike land in a scene that is also carrying open clue-debt — the audience's heightened wondering should visibly connect to a specific unresolved thread rather than arriving on its own unconnected schedule.`,
      });
    }
  }

  // SCENE_STAGING_ZONE_IMBALANCE — Underweight/bloat × visualBeats × four structural zones.
  // Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes with substantial
  // physical staging (visualBeats.length≥2), divided into four equal structural zones. Fires only
  // when one zone has zero visually dense scenes while another holds ≥50% of the total. First use
  // of the visualBeats field anywhere in this pass. A story whose physical staging clusters in one
  // act and vanishes from another has a learnable structural rhythm — the audience comes to expect
  // physically staged scenes only in certain stretches, the same predictability problem this pass
  // tracks in dialogue and action-line templating, applied here to the distribution of staged
  // physical description itself.
  {
    const r606c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r606c.fires) {
      const emptyNames606c = r606c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName606c = FOUR_ZONE_NAMES[r606c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames606c} empty; ${bloatName606c} has ${r606c.counts[r606c.bloatZoneIdx]}/${r606c.totalCount} visually dense scenes`,
        rule: 'SCENE_STAGING_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r606c.totalCount} physically staged scenes are unevenly distributed across its four structural zones: ${bloatName606c} contains ${r606c.counts[r606c.bloatZoneIdx]} of them (${Math.round((r606c.counts[r606c.bloatZoneIdx] / r606c.totalCount) * 100)}%) while ${emptyNames606c} contains none. Physical staging bloats in one structural quarter and vanishes from another, creating a learnable rhythm where staged scenes only ever appear in certain stretches of the script.`,
        suggestedFix: `Redistribute physical staging: bring at least one heavily staged scene into ${emptyNames606c}, or thin out ${bloatName606c}'s concentration so staged and unstaged scenes both recur unpredictably throughout the story rather than segregating by act.`,
      });
    }
  }

  // ── Wave 620: PAYOFF_PLACEMENT_ZONE_IMBALANCE, SEED_TURN_DECOUPLED, CLOCK_DELTA_FLATLINE ──

  // PAYOFF_PLACEMENT_ZONE_IMBALANCE — Underweight/bloat × payoffSetupIds × four structural zones.
  // Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 payoff scenes total,
  // divided across four equal structural zones. Fires only when one zone has zero payoffs while
  // another holds ≥50% of the total. First use of the payoffSetupIds field anywhere in this
  // 108-rule pass. When thread resolutions cluster entirely in one structural quarter, the
  // audience learns which stretch of the script to expect answers in — a predictable placement of
  // payoff density, the same kind of learned-rhythm problem this pass exists to catch elsewhere.
  {
    const r620a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.payoffSetupIds ?? []).length > 0,
    });
    if (r620a.fires) {
      const emptyNames620a = r620a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName620a = FOUR_ZONE_NAMES[r620a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames620a} empty; ${bloatName620a} has ${r620a.counts[r620a.bloatZoneIdx]}/${r620a.totalCount} payoff scenes`,
        rule: 'PAYOFF_PLACEMENT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r620a.totalCount} thread-resolution scenes are unevenly distributed across its four structural zones: ${bloatName620a} contains ${r620a.counts[r620a.bloatZoneIdx]} of them (${Math.round((r620a.counts[r620a.bloatZoneIdx] / r620a.totalCount) * 100)}%) while ${emptyNames620a} contains none. Resolutions bloat in one structural quarter and vanish from another, giving the audience a learnable window for when answers arrive rather than a genuinely unpredictable rhythm.`,
        suggestedFix: `Redistribute resolutions: move at least one payoff from ${bloatName620a} into the empty zone(s) — ${emptyNames620a} — so answers can land unpredictably throughout the story rather than only in one learnable stretch.`,
      });
    }
  }

  // SEED_TURN_DECOUPLED — Co-occurrence/decoupling × seededClueIds × dramaticTurn. Built on
  // checkCoOccurrenceDecoupled from the shared checks library. n≥6, ≥2 seed scenes, ≥2
  // dramatic-turn scenes. Zero overlap → fire. First use of the seededClueIds field anywhere in
  // this pass. When clue-planting and structural pivots never coincide, the story telegraphs its
  // two kinds of "something is happening" moments as mutually exclusive categories — the audience
  // can learn that a pivot scene will never also be where a clue gets planted, and vice versa,
  // making each type of beat more predictable in isolation.
  {
    const r620b = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: r => (r.seededClueIds ?? []).length > 0,
      isB: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
    });
    if (r620b.fires) {
      issues.push({
        location: `${r620b.aCount} seed scene(s), ${r620b.bCount} dramatic-turn scene(s) — zero overlap`,
        rule: 'SEED_TURN_DECOUPLED',
        severity: 'minor',
        description: `The ${r620b.aCount} scenes where a clue is planted never coincide with the ${r620b.bCount} scenes carrying a dramatic turn — the story keeps its foreshadowing beats and its structural pivots in strictly separate categories. Once the audience notices the pattern, a pivot scene reads as guaranteed clue-free and a seed scene as guaranteed pivot-free, each becoming easier to anticipate in isolation.`,
        suggestedFix: `Let at least one dramatic turn also plant a clue — a reversal that quietly seeds a detail which pays off later, blending the two categories so neither becomes a predictable, mutually exclusive slot.`,
      });
    }
  }

  // CLOCK_DELTA_FLATLINE — Average/aggregate × clockDelta variety. n≥8. Fewer than 20% of
  // scenes deviate from the average clockDelta by more than 30% of that average → fire. First use
  // of the clockDelta field anywhere in this pass. A story's deadline pressure that moves in a
  // single, unvarying increment scene after scene is itself a predictable pattern — the audience
  // can learn the "shape" of the countdown and stops registering each tick as a distinct event,
  // the same learned-rhythm problem this pass tracks in dialogue and action-line templating,
  // applied here to the pacing of the ticking clock itself.
  if (records.length >= 8) {
    const clockVals620c = records.map(r => r.clockDelta ?? 0);
    const avgClock620c = clockVals620c.reduce((s, v) => s + v, 0) / clockVals620c.length;
    if (Math.abs(avgClock620c) > 1e-9) {
      const variedClock620c = clockVals620c.filter(v => Math.abs(v - avgClock620c) > Math.abs(avgClock620c) * 0.3).length;
      if (variedClock620c < clockVals620c.length * 0.2) {
        issues.push({
          location: 'clockDelta throughout',
          rule: 'CLOCK_DELTA_FLATLINE',
          severity: 'minor',
          description: `Fewer than 20% of the story's ${records.length} scenes deviate from the average clockDelta (${avgClock620c.toFixed(2)}) by more than 30% — the deadline-pressure signal moves in the same increment almost every time it moves at all. A ticking clock that advances in a single predictable unit scene after scene becomes a learnable pattern rather than a felt escalation: the audience stops registering each tick as urgent once its size is always the same.`,
          suggestedFix: `Vary how sharply the clock advances — let some scenes compress time only slightly while others compress it sharply, so the deadline's rhythm feels earned rather than metronomic.`,
        });
      }
    }
  }

  // ── Wave 634: ORIGINALITY_HIGHLIGHT_STAGING_DECOUPLED, ORIGINALITY_OPEN_THREAD_HIGHLIGHT_
  //              AFTERMATH_VOID, ORIGINALITY_SEED_ZONE_IMBALANCE ─────────────────────────────

  // ORIGINALITY_HIGHLIGHT_STAGING_DECOUPLED — Co-occurrence/decoupling × dialogueHighlights ×
  // visualBeats. Built on checkCoOccurrenceDecoupled from the shared checks library. n≥6, ≥2
  // scenes carrying a dialogue highlight, ≥2 visually-staged scenes (visualBeats.length≥2). Zero
  // overlap → fire. First pairing of these two fields in this 111-rule pass. When the story's
  // verbal high points and its most physically staged moments never share a scene, each register
  // develops on a predictable, mutually exclusive schedule — the audience learns which scenes to
  // expect a memorable line in and which to expect only staged action.
  {
    const r634a = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: r => (r.dialogueHighlights ?? []).length > 0,
      isB: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r634a.fires) {
      issues.push({
        location: `${r634a.aCount} dialogue-highlight scene(s), ${r634a.bCount} visually-staged scene(s) — zero overlap`,
        rule: 'ORIGINALITY_HIGHLIGHT_STAGING_DECOUPLED',
        severity: 'minor',
        description: `The ${r634a.aCount} scenes flagged as containing a standout line of dialogue never coincide with the ${r634a.bCount} scenes leaning heavily on physical staging — the story's verbal and physical high points run on entirely separate tracks. Once the audience notices the pattern, memorable dialogue reads as guaranteed to arrive in unstaged scenes and vice versa, each becoming easier to predict in isolation.`,
        suggestedFix: `Let at least one heavily staged scene also carry a line worth remembering — pairing physical presence with verbal weight in the same beat so the two registers occasionally converge rather than always alternating predictably.`,
      });
    }
  }

  // ORIGINALITY_OPEN_THREAD_HIGHLIGHT_AFTERMATH_VOID — Sequence/aftermath × heavy unresolved-
  // clue-debt trigger → dialogueHighlights absence. Built on checkAftermathVoid from the shared
  // checks library. n≥8, ≥2 qualifying heavy-debt scenes (unresolvedClues.length≥3, pos<n-2), ≥3
  // scenes anywhere with a dialogue highlight, a 2-scene lookahead window. Fires when every
  // heavy-debt scene's two-scene aftermath contains no highlighted dialogue, while such scenes do
  // occur elsewhere. First pairing of these two fields in this pass. A predictable pattern where
  // accumulated mystery never earns a memorable line nearby is itself a learnable absence.
  {
    const r634b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 3, window: 2,
      isTrigger: r => (r.unresolvedClues ?? []).length >= 3,
      isAftermath: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r634b.fires) {
      issues.push({
        location: `${r634b.triggerCount} heavy clue-debt scene(s) — no highlighted dialogue within 2 scenes of any`,
        rule: 'ORIGINALITY_OPEN_THREAD_HIGHLIGHT_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene carrying heavy unresolved clue-debt (${r634b.triggerCount} instances) is followed by two full scenes with no highlighted dialogue, even though ${r634b.aftermathCount} such scenes occur elsewhere in the story. Once the audience notices the pattern, they learn that accumulated mystery never earns a memorable line nearby — a predictable, avoidable absence.`,
        suggestedFix: `In the two scenes following at least one heavy clue-debt moment, give a character a line worth remembering — voicing frustration at what's unresolved or pressing on the stakes of not knowing, breaking the learnable silence.`,
      });
    }
  }

  // ORIGINALITY_SEED_ZONE_IMBALANCE — Underweight/bloat × seededClueIds × four structural zones.
  // Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 seed scenes total,
  // divided across four equal structural zones. Fires only when one zone has zero seeds while
  // another holds ≥50% of the total. Waves 606 and 620 applied this template to visualBeats and
  // payoffSetupIds respectively; seededClueIds itself has never been zone-audited in this file,
  // despite already being used in a co-occurrence check (Wave 620's SEED_TURN_DECOUPLED). Clue-
  // planting clustered entirely in one structural quarter is a learnable placement pattern.
  {
    const r634c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.seededClueIds ?? []).length > 0,
    });
    if (r634c.fires) {
      const emptyNames634c = r634c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName634c = FOUR_ZONE_NAMES[r634c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames634c} empty; ${bloatName634c} has ${r634c.counts[r634c.bloatZoneIdx]}/${r634c.totalCount} seed scenes`,
        rule: 'ORIGINALITY_SEED_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r634c.totalCount} clue-planting scenes are unevenly distributed across its four structural zones: ${bloatName634c} contains ${r634c.counts[r634c.bloatZoneIdx]} of them (${Math.round((r634c.counts[r634c.bloatZoneIdx] / r634c.totalCount) * 100)}%) while ${emptyNames634c} contains none. Foreshadowing bloats in one structural quarter and vanishes from another, giving the audience a learnable window for when new clues arrive rather than a genuinely unpredictable rhythm.`,
        suggestedFix: `Redistribute clue-planting: move at least one seed from ${bloatName634c} into the empty zone(s) — ${emptyNames634c} — so foreshadowing can arrive unpredictably throughout the story rather than only in one learnable stretch.`,
      });
    }
  }

  // ── Wave 648: ORIGINALITY_RELATIONSHIP_PEAK_UNCAUSED, ORIGINALITY_REVELATION_DROUGHT_RUN,
  //              ORIGINALITY_PAYOFF_CURIOSITY_DECOUPLED ────────────────────────────────────────

  // ORIGINALITY_RELATIONSHIP_PEAK_UNCAUSED — Single-peak isolation/backward-cause ×
  // relationshipShifts-count magnitude. Built on checkPeakUncaused from the shared checks
  // library. n≥8, ≥2 scenes carrying a relationship shift, a 2-scene lookback. Finds the single
  // scene with the most simultaneous bond changes; fires when neither that scene nor either of
  // the two before it contains a dramatic turn or revelation. First checkPeakUncaused use in this
  // pass — relationshipShifts had only ever appeared inside a debug reporting string, never as a
  // per-scene signal. A learnable, uncaused spike in relational upheaval is itself a predictable
  // pattern the audience can anticipate.
  {
    const r648a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.relationshipShifts ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r648a.fires) {
      issues.push({
        location: `scene ${r648a.peakIdx + 1} — peak relationship-shift density (${r648a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'ORIGINALITY_RELATIONSHIP_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for relationship shifts (scene ${r648a.peakIdx + 1}, with ${r648a.peakMagnitude} simultaneous bond changes) has no dramatic turn or revelation in itself or the two scenes before it. The moment where relational upheaval concentrates most heavily arrives without any structural pivot or disclosure driving it — an uncaused spike that reads as a predictable convenience rather than an earned collision.`,
        suggestedFix: `Give scene ${r648a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most relationally dense moment is earned by a shift in circumstance rather than arriving as an unmotivated cluster.`,
      });
    }
  }

  // ORIGINALITY_REVELATION_DROUGHT_RUN — Run-based × revelation presence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 revelation scenes overall, fires
  // when the longest consecutive run of scenes with no revelation reaches 6. First checkDroughtRun
  // use in this pass, and — because the pre-existing Wave 396 filter compares `r.revelation ===
  // true` against a field typed string|null and therefore never matches anything — this is the
  // pass's first functioning revelation-presence check. A long unbroken stretch with nothing
  // disclosed leaves the story's information rhythm flat and its "next surprise" position fully
  // predictable.
  {
    const r648b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.revelation != null,
    });
    if (r648b.fires) {
      issues.push({
        location: `longest stretch with no revelation: ${r648b.longestRun} consecutive scenes`,
        rule: 'ORIGINALITY_REVELATION_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r648b.longestRun} consecutive scenes with no revelation at all, even though ${r648b.presentCount} scenes elsewhere do disclose something new. A long unbroken stretch with nothing revealed leaves the story's information rhythm flat and predictable — the audience learns that surprises won't arrive for an extended stretch, and stops watching for them.`,
        suggestedFix: `Disclose something new somewhere within the ${r648b.longestRun}-scene stretch — even a small revelation keeps the story's information rhythm unpredictable rather than settling into a learnable lull.`,
      });
    }
  }

  // ORIGINALITY_PAYOFF_CURIOSITY_DECOUPLED — Co-occurrence/decoupling × payoffSetupIds ×
  // curiosityDelta>0. Built on checkCoOccurrenceDecoupled from the shared checks library. n≥6,
  // ≥2 payoff scenes, ≥2 scenes where curiosity is actively rising, zero overlap → fire.
  // payoffSetupIds had only been zone- and co-occurrence-audited against dramaticTurn (Wave 620's
  // SEED_TURN_DECOUPLED pairs it with seededClueIds instead) — never against the curiosity
  // channel. When every resolution closes a question without ever opening a new one, the
  // audience learns that payoff scenes are always purely closing beats, a predictable category.
  {
    const r648c = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: r => (r.payoffSetupIds ?? []).length > 0,
      isB: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r648c.fires) {
      issues.push({
        location: `${r648c.aCount} payoff scene(s), ${r648c.bCount} rising-curiosity scene(s) — zero overlap`,
        rule: 'ORIGINALITY_PAYOFF_CURIOSITY_DECOUPLED',
        severity: 'minor',
        description: `The ${r648c.aCount} scenes where a planted thread resolves never coincide with the ${r648c.bCount} scenes where curiosity is actively rising — resolution and rising intrigue run on separate tracks. Once the audience notices the pattern, every payoff scene reads as guaranteed to only close a question, never to open one, making the story's resolutions more predictable in isolation.`,
        suggestedFix: `Let at least one payoff scene also raise a new question as it resolves the old one — closing one thread while cracking open another keeps resolution beats from becoming a purely predictable category.`,
      });
    }
  }

  // ── Wave 662: ORIGINALITY_HIGHLIGHT_PEAK_UNCAUSED, ORIGINALITY_SEED_DROUGHT_RUN,
  //              ORIGINALITY_PAYOFF_ZONE_CLUSTER ─────────────────────────────────────────────

  // ORIGINALITY_HIGHLIGHT_PEAK_UNCAUSED — Single-peak isolation/backward-cause ×
  // dialogueHighlights magnitude. Built on checkPeakUncaused from the shared checks library.
  // n≥8, ≥2 scenes carrying a dialogue highlight, a 2-scene lookback. Finds the single scene with
  // the most highlighted lines; fires when neither that scene nor either of the two before it
  // contains a dramatic turn or revelation. First application of the peak-uncaused mode to the
  // dialogueHighlights channel in this pass. A learnable, causally unmotivated spike in the
  // story's most memorable dialogue is itself a predictable pattern.
  {
    const r662a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.dialogueHighlights ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r662a.fires) {
      issues.push({
        location: `scene ${r662a.peakIdx + 1} — peak highlighted-dialogue density (${r662a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'ORIGINALITY_HIGHLIGHT_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for highlighted dialogue (scene ${r662a.peakIdx + 1}, with ${r662a.peakMagnitude} standout lines) has no dramatic turn or revelation in itself or the two scenes before it. The moment where the script's most memorable dialogue concentrates arrives without any structural pivot or disclosure driving it — a learnable, causally unmotivated spike that reads as a convenient peak rather than an earned one.`,
        suggestedFix: `Give scene ${r662a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most quotable moment is earned by a structural shift rather than arriving in a causal vacuum.`,
      });
    }
  }

  // ORIGINALITY_SEED_DROUGHT_RUN — Run-based × seededClueIds absence. Built on checkDroughtRun
  // from the shared checks library. n≥10, ≥3 seed scenes overall, fires when the longest
  // consecutive run of scenes with zero clue seeded reaches 6. PURPOSE_CONSECUTIVE_RUN is this
  // pass's only prior run-based check and tracks a different field entirely via hand-rolled logic,
  // not the shared checkDroughtRun helper — seededClueIds itself has never been drought-audited.
  {
    const r662b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.seededClueIds ?? []).length > 0,
    });
    if (r662b.fires) {
      issues.push({
        location: `longest stretch with no clue seeded: ${r662b.longestRun} consecutive scenes`,
        rule: 'ORIGINALITY_SEED_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r662b.longestRun} consecutive scenes with no clue seeded at all, even though ${r662b.presentCount} scenes elsewhere do plant new material. A long unbroken stretch where nothing new is planted leaves the audience with a learnable lull in foreshadowing — they can predict that no new thread will open for an extended stretch.`,
        suggestedFix: `Seed a new clue or thread somewhere within the ${r662b.longestRun}-scene stretch so foreshadowing arrives unpredictably throughout the story rather than settling into a learnable gap.`,
      });
    }
  }

  // ORIGINALITY_PAYOFF_ZONE_CLUSTER — Distribution/timing × payoffSetupIds × structural thirds.
  // Built on checkZoneCluster from the shared checks library. n≥9, ≥3 payoff scenes, fires when
  // >75% of them fall in a single structural third. This pass already applies the zone-cluster
  // template to dramaticTurn and clockRaised; payoffSetupIds itself has never been cluster-audited
  // here — a predictable, front- or back-loaded resolution rhythm is itself a learnable pattern.
  {
    const r662c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.payoffSetupIds ?? []).length > 0,
    });
    if (r662c.fires) {
      const zoneName662c = r662c.zoneNames[r662c.maxZoneIdx];
      issues.push({
        location: `${zoneName662c} third — ${r662c.maxZoneCount}/${r662c.count} payoff scenes`,
        rule: 'ORIGINALITY_PAYOFF_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r662c.maxZoneCount} of the story's ${r662c.count} thread-resolution scenes (${Math.round((r662c.maxZoneCount / r662c.count) * 100)}%) cluster in the ${zoneName662c} third. Resolution concentrates almost exclusively in that stretch of the story rather than landing throughout — once the audience notices the pattern, they learn which third to expect answers in rather than experiencing a genuinely unpredictable rhythm.`,
        suggestedFix: `Resolve at least one thread outside the ${zoneName662c} third — spreading payoffs across the story keeps the timing of resolutions unpredictable rather than confined to a single learnable stretch.`,
      });
    }
  }

  // ── Wave 676: ORIGINALITY_OPEN_THREAD_DROUGHT_RUN, ORIGINALITY_STAGING_ZONE_CLUSTER,
  //              ORIGINALITY_PAYOFF_PEAK_UNCAUSED ───────────────────────────────────────────

  // ORIGINALITY_OPEN_THREAD_DROUGHT_RUN — Run-based × unresolvedClues absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 open-thread scenes overall, fires
  // when the longest consecutive run of scenes with zero outstanding clue-debt reaches 6.
  // unresolvedClues has only ever anchored OPEN_THREAD_CURIOSITY_DECOUPLED; the drought-run mode
  // applied to this channel for the first time — a long, predictable stretch where no mystery is
  // ever left dangling is itself a learnable rhythm.
  {
    const r676a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r676a.fires) {
      issues.push({
        location: `longest stretch with no outstanding clue-debt: ${r676a.longestRun} consecutive scenes`,
        rule: 'ORIGINALITY_OPEN_THREAD_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r676a.longestRun} consecutive scenes with no outstanding clue-debt at all, even though ${r676a.presentCount} scenes elsewhere do carry open mysteries. A long stretch where nothing is left unresolved is itself a learnable pattern — the audience can predict that no lingering question will surface for an extended stretch.`,
        suggestedFix: `Seed a new thread somewhere within the ${r676a.longestRun}-scene stretch so the audience can't predict a long, mystery-free lull.`,
      });
    }
  }

  // ORIGINALITY_STAGING_ZONE_CLUSTER — Distribution/timing × visualBeats × structural thirds.
  // Built on checkZoneCluster from the shared checks library. n≥9, ≥3 visually-staged scenes,
  // fires when >75% of them fall in a single structural third. Wave 606's SCENE_STAGING_ZONE_
  // IMBALANCE uses the four-zone bloat/empty template; this is a three-zone concentration measure
  // on the same field, catching skew even when no zone is empty.
  {
    const r676b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r676b.fires) {
      const zoneName676b = r676b.zoneNames[r676b.maxZoneIdx];
      issues.push({
        location: `${zoneName676b} third — ${r676b.maxZoneCount}/${r676b.count} visually dense scenes`,
        rule: 'ORIGINALITY_STAGING_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r676b.maxZoneCount} of the story's ${r676b.count} visually dense scenes (${Math.round((r676b.maxZoneCount / r676b.count) * 100)}%) cluster in the ${zoneName676b} third. Physical staging concentrates almost exclusively in that stretch rather than surfacing throughout, creating a learnable rhythm where staged scenes only ever appear in one predictable stretch of the script.`,
        suggestedFix: `Give at least one scene outside the ${zoneName676b} third substantial physical staging — spreading staged action across the story keeps its placement genuinely unpredictable.`,
      });
    }
  }

  // ORIGINALITY_PAYOFF_PEAK_UNCAUSED — Single-peak isolation/backward-cause × payoffSetupIds
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 payoff scenes,
  // a 2-scene lookback. Finds the single scene with the most simultaneous thread resolutions;
  // fires when neither that scene nor either of the two before it contains a dramatic turn or
  // revelation. Wave 662 applied the zone-cluster mode to payoffSetupIds; this applies the
  // backward-cause peak mode to the same channel, a genuinely different question.
  {
    const r676c = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.payoffSetupIds ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r676c.fires) {
      issues.push({
        location: `scene ${r676c.peakIdx + 1} — peak payoff density (${r676c.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'ORIGINALITY_PAYOFF_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for thread resolution (scene ${r676c.peakIdx + 1}, with ${r676c.peakMagnitude} payoffs resolving at once) has no dramatic turn or revelation in itself or the two scenes before it. The moment where the most convergent resolution lands arrives without any structural pivot or disclosure driving it — a learnable, causally unmotivated convenience rather than an earned convergence.`,
        suggestedFix: `Give scene ${r676c.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most convergent resolution is earned by a structural shift rather than arriving in a causal vacuum.`,
      });
    }
  }

  // ── Wave 690: ORIGINALITY_PAYOFF_DROUGHT_RUN, ORIGINALITY_CLOCK_DROUGHT_RUN,
  //              ORIGINALITY_HIGHLIGHT_ZONE_CLUSTER ────────────────────────────────────────────

  // ORIGINALITY_PAYOFF_DROUGHT_RUN — Run-based × payoffSetupIds absence. Built on checkDroughtRun
  // from the shared checks library. n≥10, ≥3 payoff scenes overall, fires when the longest
  // consecutive run of scenes with zero thread resolution reaches 6. Waves 648/662/676 applied
  // co-occurrence-decoupling, zone-cluster, and backward-cause peak modes to payoffSetupIds; the
  // run-based drought mode has never been applied to it. A long, predictable stretch where nothing
  // ever resolves is itself a learnable rhythm.
  {
    const r690a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.payoffSetupIds ?? []).length > 0,
    });
    if (r690a.fires) {
      issues.push({
        location: `longest stretch with no payoff: ${r690a.longestRun} consecutive scenes`,
        rule: 'ORIGINALITY_PAYOFF_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r690a.longestRun} consecutive scenes with no thread resolving at all, even though ${r690a.presentCount} scenes elsewhere do pay off a setup. A long stretch where nothing resolves is itself a learnable pattern — the audience can predict that no answer will arrive for an extended stretch.`,
        suggestedFix: `Resolve at least one thread somewhere within the ${r690a.longestRun}-scene stretch so the audience can't predict a long, answer-free lull.`,
      });
    }
  }

  // ORIGINALITY_CLOCK_DROUGHT_RUN — Run-based × clockRaised absence. Built on checkDroughtRun from
  // the shared checks library. n≥10, ≥3 clock-raised scenes overall, fires when the longest
  // consecutive run of scenes with no clock raised reaches 6. Wave 606's CLOCK_RAISED_ZONE_CLUSTER
  // applied the distribution/timing mode to this channel; the run-based drought mode has never
  // been applied to it.
  {
    const r690b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.clockRaised === true,
    });
    if (r690b.fires) {
      issues.push({
        location: `longest stretch with no clock raised: ${r690b.longestRun} consecutive scenes`,
        rule: 'ORIGINALITY_CLOCK_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r690b.longestRun} consecutive scenes with no clock raised at all, even though ${r690b.presentCount} scenes elsewhere do establish time pressure. A long unbroken stretch with no deadline in play is itself a learnable rhythm — the audience can predict that urgency won't reappear for an extended stretch.`,
        suggestedFix: `Raise a clock somewhere within the ${r690b.longestRun}-scene stretch — a deadline, a closing window, a ticking consequence — so time pressure resurfaces unpredictably throughout the story.`,
      });
    }
  }

  // ORIGINALITY_HIGHLIGHT_ZONE_CLUSTER — Distribution/timing × dialogueHighlights × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 highlighted-
  // dialogue scenes, fires when >75% of them fall in a single structural third. Wave 662 applied
  // the backward-cause peak mode to dialogueHighlights; the zone-cluster mode has never been
  // applied to this channel — a predictable, front- or back-loaded distribution of the story's
  // most memorable dialogue is itself a learnable pattern.
  {
    const r690c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r690c.fires) {
      const zoneName690c = r690c.zoneNames[r690c.maxZoneIdx];
      issues.push({
        location: `${zoneName690c} third — ${r690c.maxZoneCount}/${r690c.count} highlighted-dialogue scenes`,
        rule: 'ORIGINALITY_HIGHLIGHT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r690c.maxZoneCount} of the story's ${r690c.count} scenes carrying a standout line of dialogue (${Math.round((r690c.maxZoneCount / r690c.count) * 100)}%) cluster in the ${zoneName690c} third. Memorable dialogue concentrates almost exclusively in that stretch rather than landing throughout — once the audience notices the pattern, they learn which third to expect a quotable line in rather than experiencing genuinely unpredictable placement.`,
        suggestedFix: `Give at least one scene outside the ${zoneName690c} third a standout line of dialogue — spreading memorable dialogue across the story keeps its placement genuinely unpredictable.`,
      });
    }
  }

  // ── Wave 704: ORIGINALITY_HIGHLIGHT_DROUGHT_RUN, ORIGINALITY_SEED_ZONE_CLUSTER,
  //              ORIGINALITY_STAGING_PEAK_UNCAUSED ─────────────────────────────────────────────

  // ORIGINALITY_HIGHLIGHT_DROUGHT_RUN — Run-based × dialogueHighlights absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 highlighted-dialogue scenes overall,
  // fires when the longest consecutive run of scenes with no highlighted dialogue reaches 6.
  // Wave 662 applied the backward-cause peak mode and Wave 690 applied the zone-cluster mode to
  // this channel; the drought-run mode has never been applied to it.
  {
    const r704a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r704a.fires) {
      issues.push({
        location: `longest stretch with no highlighted dialogue: ${r704a.longestRun} consecutive scenes`,
        rule: 'ORIGINALITY_HIGHLIGHT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r704a.longestRun} consecutive scenes with no highlighted dialogue at all, even though ${r704a.presentCount} scenes elsewhere carry a standout line. A long unbroken stretch with nothing verbally memorable is itself a learnable pattern — the audience can predict that no quotable line will arrive for an extended stretch.`,
        suggestedFix: `Give at least one scene within the ${r704a.longestRun}-scene stretch a standout line of dialogue so the audience can't predict a long, unremarkable lull.`,
      });
    }
  }

  // ORIGINALITY_SEED_ZONE_CLUSTER — Distribution/timing × seededClueIds × structural thirds.
  // Built on checkZoneCluster from the shared checks library. n≥9, ≥3 seed scenes, fires when
  // >75% of them fall in a single structural third. Wave 662 applied the drought-run mode to
  // seededClueIds; the zone-cluster mode has never been applied to this channel.
  {
    const r704b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.seededClueIds ?? []).length > 0,
    });
    if (r704b.fires) {
      const zoneName704b = r704b.zoneNames[r704b.maxZoneIdx];
      issues.push({
        location: `${zoneName704b} third — ${r704b.maxZoneCount}/${r704b.count} seed scenes`,
        rule: 'ORIGINALITY_SEED_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r704b.maxZoneCount} of the story's ${r704b.count} clue-planting scenes (${Math.round((r704b.maxZoneCount / r704b.count) * 100)}%) cluster in the ${zoneName704b} third. Foreshadowing concentrates almost exclusively in that stretch — once the audience notices the pattern, they learn which third to expect new clues in rather than experiencing a genuinely unpredictable rhythm.`,
        suggestedFix: `Plant at least one clue outside the ${zoneName704b} third — spreading foreshadowing across the story keeps its placement genuinely unpredictable.`,
      });
    }
  }

  // ORIGINALITY_STAGING_PEAK_UNCAUSED — Single-peak isolation/backward-cause × visualBeats
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 visually-staged
  // scenes, a 2-scene lookback. Finds the single scene with the densest physical staging; fires
  // when neither that scene nor either of the two before it contains a dramatic turn or
  // revelation. Wave 676 applied the zone-cluster mode to visualBeats; the backward-cause peak
  // mode has never been applied to it.
  {
    const r704c = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.visualBeats ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r704c.fires) {
      issues.push({
        location: `scene ${r704c.peakIdx + 1} — peak physical-staging density (${r704c.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'ORIGINALITY_STAGING_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for physical staging (scene ${r704c.peakIdx + 1}, with ${r704c.peakMagnitude} staged beats) has no dramatic turn or revelation in itself or the two scenes before it. The moment where physical action concentrates most heavily arrives without any structural pivot or disclosure driving it — a learnable, causally unmotivated spike that reads as a convenient peak rather than an earned one.`,
        suggestedFix: `Give scene ${r704c.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most physically active moment is earned by a structural shift rather than arriving in a causal vacuum.`,
      });
    }
  }

  // ── Wave 718: ORIGINALITY_SEED_PEAK_UNCAUSED, ORIGINALITY_STAGING_DROUGHT_RUN,
  //              ORIGINALITY_RELATIONSHIP_ZONE_CLUSTER ─────────────────────────────────────────

  // ORIGINALITY_SEED_PEAK_UNCAUSED — Single-peak isolation/backward-cause × seededClueIds
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 seed scenes,
  // a 2-scene lookback. Finds the single scene with the most simultaneous clues planted; fires
  // when neither that scene nor either of the two before it contains a dramatic turn or
  // revelation. Waves 662/704 applied the drought-run and zone-cluster modes to seededClueIds;
  // the backward-cause peak mode has never been applied to it, completing the trio.
  {
    const r718a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.seededClueIds ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r718a.fires) {
      issues.push({
        location: `scene ${r718a.peakIdx + 1} — peak seed density (${r718a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'ORIGINALITY_SEED_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for planting new clues (scene ${r718a.peakIdx + 1}, with ${r718a.peakMagnitude} clues seeded at once) has no dramatic turn or revelation in itself or the two scenes before it. The moment where foreshadowing concentrates most heavily arrives without any structural pivot or disclosure driving it — a learnable, causally unmotivated spike that reads as a convenient peak rather than an earned one.`,
        suggestedFix: `Give scene ${r718a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most seed-dense moment is earned by a structural shift rather than arriving in a causal vacuum.`,
      });
    }
  }

  // ORIGINALITY_STAGING_DROUGHT_RUN — Run-based × visualBeats absence. Built on checkDroughtRun
  // from the shared checks library. n≥10, ≥3 physically-staged scenes overall, fires when the
  // longest consecutive run of scenes with zero visual beats reaches 6. Waves 676/704 applied the
  // zone-cluster and backward-cause peak modes to visualBeats; the drought-run mode has never
  // been applied to it, completing the trio.
  {
    const r718b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.visualBeats ?? []).length > 0,
    });
    if (r718b.fires) {
      issues.push({
        location: `longest stretch with no visual staging: ${r718b.longestRun} consecutive scenes`,
        rule: 'ORIGINALITY_STAGING_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r718b.longestRun} consecutive scenes with no visual staging beats at all, even though ${r718b.presentCount} scenes elsewhere do carry physical staging. A long unbroken stretch with nothing physically shown is itself a learnable pattern — the audience can predict that no staged image will arrive for an extended stretch.`,
        suggestedFix: `Add a physical staging beat somewhere within the ${r718b.longestRun}-scene stretch so the audience can't predict a long, visually inert lull.`,
      });
    }
  }

  // ORIGINALITY_RELATIONSHIP_ZONE_CLUSTER — Distribution/timing × relationshipShifts × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 relationship-shift
  // scenes, fires when >75% of them fall in a single structural third. Wave 648 applied the
  // backward-cause peak mode to relationshipShifts; the zone-cluster mode has never been applied
  // to it — a predictable, front- or back-loaded distribution of relational movement is itself a
  // learnable pattern.
  {
    const r718c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r718c.fires) {
      const zoneName718c = r718c.zoneNames[r718c.maxZoneIdx];
      issues.push({
        location: `${zoneName718c} third — ${r718c.maxZoneCount}/${r718c.count} relationship-shift scenes`,
        rule: 'ORIGINALITY_RELATIONSHIP_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r718c.maxZoneCount} of the story's ${r718c.count} relationship-shift scenes (${Math.round((r718c.maxZoneCount / r718c.count) * 100)}%) cluster in the ${zoneName718c} third. Bond changes concentrate almost exclusively in that stretch — once the audience notices the pattern, they learn which third to expect relational movement in rather than experiencing a genuinely unpredictable rhythm.`,
        suggestedFix: `Let a bond shift in at least one scene outside the ${zoneName718c} third — spreading relational movement across the story keeps its timing genuinely unpredictable.`,
      });
    }
  }

  // ── Wave 732: ORIGINALITY_RELATIONSHIP_DROUGHT_RUN, ORIGINALITY_REVELATION_ZONE_CLUSTER,
  //              ORIGINALITY_OPEN_THREAD_PEAK_UNCAUSED ──────────────────────────────────────

  // ORIGINALITY_RELATIONSHIP_DROUGHT_RUN — Run-based × relationshipShifts absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 relationship-shift scenes overall,
  // fires when the longest consecutive run of scenes with no bond change reaches 6. Waves 648/718
  // applied the backward-cause peak and zone-cluster modes to relationshipShifts; the drought-run
  // mode has never been applied to it, completing the trio — a long unbroken stretch where bonds
  // never move is itself a predictable, learnable pattern.
  {
    const r732a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r732a.fires) {
      issues.push({
        location: `longest stretch with no relationship shift: ${r732a.longestRun} consecutive scenes`,
        rule: 'ORIGINALITY_RELATIONSHIP_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r732a.longestRun} consecutive scenes with no relationship shift at all, even though ${r732a.presentCount} scenes elsewhere do move a bond. A long unbroken stretch where nothing changes between characters is itself a learnable pattern — the audience can predict that no relational movement will arrive for an extended stretch.`,
        suggestedFix: `Shift at least one relationship — however slightly — within the ${r732a.longestRun}-scene stretch so the audience can't predict a long, relationally inert lull.`,
      });
    }
  }

  // ORIGINALITY_REVELATION_ZONE_CLUSTER — Distribution/timing × revelation × structural thirds.
  // Built on checkZoneCluster from the shared checks library. n≥9, ≥3 revelation scenes, fires
  // when more than 75% of them fall in a single structural third. Wave 648 applied the run-based
  // drought mode to revelation != null; the zone-cluster mode has never been applied to it — a
  // predictable, front- or back-loaded distribution of disclosures is itself a learnable pattern.
  {
    const r732b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.revelation != null,
    });
    if (r732b.fires) {
      const zoneName732b = r732b.zoneNames[r732b.maxZoneIdx];
      issues.push({
        location: `${zoneName732b} third — ${r732b.maxZoneCount}/${r732b.count} revelation scenes`,
        rule: 'ORIGINALITY_REVELATION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r732b.maxZoneCount} of the story's ${r732b.count} revelation scenes (${Math.round((r732b.maxZoneCount / r732b.count) * 100)}%) cluster in the ${zoneName732b} third. Disclosures concentrate almost exclusively in that stretch — once the audience notices the pattern, they learn which third to expect a revelation in rather than experiencing genuinely unpredictable timing.`,
        suggestedFix: `Let a revelation land in at least one scene outside the ${zoneName732b} third — spreading disclosures across the story keeps their timing genuinely unpredictable.`,
      });
    }
  }

  // ORIGINALITY_OPEN_THREAD_PEAK_UNCAUSED — Single-peak isolation/backward-cause ×
  // unresolvedClues magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2
  // scenes carrying outstanding clue-debt, a 2-scene lookback. Finds the single scene with the
  // most simultaneous open threads; fires when neither that scene nor either of the two before it
  // contains a dramatic turn or revelation. Wave 676 applied the run-based drought mode to
  // unresolvedClues; the backward-cause peak mode has never been applied to it — an uncaused
  // spike in accumulated open-thread debt is itself a predictable pattern, since the audience
  // learns that the story's mystery load peaks arbitrarily rather than in response to events.
  {
    const r732c = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.unresolvedClues ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r732c.fires) {
      issues.push({
        location: `scene ${r732c.peakIdx + 1} — peak open-thread density (${r732c.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'ORIGINALITY_OPEN_THREAD_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for outstanding clue-debt (scene ${r732c.peakIdx + 1}, with ${r732c.peakMagnitude} open threads) has no dramatic turn or revelation in itself or the two scenes before it. An unmotivated spike in accumulated mystery is itself a learnable pattern — the audience senses the story's open-thread load rising and falling on its own schedule rather than in response to what happens.`,
        suggestedFix: `Give scene ${r732c.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's peak of accumulated mystery is earned by an event rather than arriving as an arbitrary, learnable spike.`,
      });
    }
  }

  // ── Wave 746: ORIGINALITY_OPEN_THREAD_ZONE_CLUSTER, ORIGINALITY_TURN_DROUGHT_RUN,
  //              ORIGINALITY_STAKES_ZONE_CLUSTER ─────────────────────────────────────────

  // ORIGINALITY_OPEN_THREAD_ZONE_CLUSTER — Distribution/timing × unresolvedClues × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 open-thread
  // scenes, fires when more than 75% of those scenes cluster in a single third. Waves 676/732
  // applied the run-based drought and backward-cause peak modes to unresolvedClues; the
  // zone-cluster mode has never been applied to it, completing the trio — a predictable, front-
  // or back-loaded distribution of open-thread debt is itself a learnable pattern.
  {
    const r746a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r746a.fires) {
      const zoneName746a = r746a.zoneNames[r746a.maxZoneIdx];
      issues.push({
        location: `${zoneName746a} third — ${r746a.maxZoneCount}/${r746a.count} open-thread scenes`,
        rule: 'ORIGINALITY_OPEN_THREAD_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r746a.maxZoneCount} of the story's ${r746a.count} open-thread scenes (${Math.round((r746a.maxZoneCount / r746a.count) * 100)}%) cluster in the ${zoneName746a} third. Outstanding clue-debt concentrates almost exclusively in that stretch — once the audience notices the pattern, they learn which third to expect unresolved mystery in rather than experiencing genuinely unpredictable tension.`,
        suggestedFix: `Carry an open thread into at least one scene outside the ${zoneName746a} third — spreading unresolved clue-debt across the story keeps its timing genuinely unpredictable.`,
      });
    }
  }

  // ORIGINALITY_TURN_DROUGHT_RUN — Run-based × dramaticTurn !== 'nothing' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 turn scenes overall, fires when the
  // longest consecutive run of scenes with no dramatic turn reaches 6. dramaticTurn has only ever
  // anchored a co-occurrence/decoupling check and served as a hasCause predicate elsewhere in
  // this pass; the run-based drought mode has never been applied to it as a primary signal — a
  // long unbroken stretch with no dramatic turn at all is itself a predictable pattern the
  // audience can anticipate.
  {
    const r746b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
    });
    if (r746b.fires) {
      issues.push({
        location: `longest stretch with no dramatic turn: ${r746b.longestRun} consecutive scenes`,
        rule: 'ORIGINALITY_TURN_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r746b.longestRun} consecutive scenes with no dramatic turn at all, even though ${r746b.presentCount} scenes elsewhere do pivot. A long unbroken stretch with nothing reversing or complicating the situation is itself a learnable pattern — the audience can predict that no pivot will arrive for an extended stretch.`,
        suggestedFix: `Introduce a dramatic turn somewhere within the ${r746b.longestRun}-scene stretch so the audience can't predict a long, structurally inert lull.`,
      });
    }
  }

  // ORIGINALITY_STAKES_ZONE_CLUSTER — Distribution/timing × purpose === 'raise_stakes' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // stakes-raising scenes, fires when more than 75% of those scenes cluster in a single third.
  // purpose has never anchored any of the three shared-library modes in this pass; a
  // predictable, front- or back-loaded distribution of stakes-raising scenes is itself a
  // learnable pattern.
  {
    const r746c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'raise_stakes',
    });
    if (r746c.fires) {
      const zoneName746c = r746c.zoneNames[r746c.maxZoneIdx];
      issues.push({
        location: `${zoneName746c} third — ${r746c.maxZoneCount}/${r746c.count} stakes-raising scenes`,
        rule: 'ORIGINALITY_STAKES_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r746c.maxZoneCount} of the story's ${r746c.count} scenes purposed to raise stakes (${Math.round((r746c.maxZoneCount / r746c.count) * 100)}%) cluster in the ${zoneName746c} third. Escalation concentrates almost exclusively in that stretch — once the audience notices the pattern, they learn which third to expect the stakes to rise in rather than experiencing genuinely unpredictable pressure.`,
        suggestedFix: `Raise the stakes in at least one scene outside the ${zoneName746c} third — spreading escalation across the story keeps its timing genuinely unpredictable.`,
      });
    }
  }

  // ── Wave 760: ORIGINALITY_REVELATION_PEAK_UNCAUSED, ORIGINALITY_STAKES_DROUGHT_RUN,
  //              ORIGINALITY_CLOCK_DELTA_DROUGHT_RUN ────────────────────────────────────

  // ORIGINALITY_REVELATION_PEAK_UNCAUSED — Single-peak isolation/backward-cause × revelation
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 revelation
  // scenes, a 2-scene lookback. Finds the single scene carrying a revelation (magnitude 1 vs 0
  // elsewhere); fires when neither that scene nor either of the two before it contains a
  // dramatic turn. ORIGINALITY_REVELATION_DROUGHT_RUN and ORIGINALITY_REVELATION_ZONE_CLUSTER
  // applied the run-based drought and zone-cluster modes to revelation != null; the
  // backward-cause peak mode has never been applied to it, completing the trio — this check's
  // hasCause deliberately references only dramaticTurn, not revelation itself, to avoid a
  // circular audit of the revelation channel; an uncaused disclosure is itself a predictable
  // pattern.
  {
    const r760a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.revelation != null ? 1 : 0),
      hasCause: r => r.dramaticTurn !== 'nothing',
    });
    if (r760a.fires) {
      issues.push({
        location: `scene ${r760a.peakIdx + 1} — revelation with no dramatic turn nearby`,
        rule: 'ORIGINALITY_REVELATION_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's revelation at scene ${r760a.peakIdx + 1} arrives with no dramatic turn in itself or the two scenes before it. A disclosure that lands without a structural pivot preparing it is itself a learnable pattern — the audience senses the story's revelations arriving on their own schedule rather than in response to events.`,
        suggestedFix: `Give scene ${r760a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn, so the revelation is earned by an event rather than arriving as an arbitrary, learnable disclosure.`,
      });
    }
  }

  // ORIGINALITY_STAKES_DROUGHT_RUN — Run-based × purpose === 'raise_stakes' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 stakes-raising scenes overall, fires
  // when the longest consecutive run of scenes purposed otherwise reaches 6. Wave 746 applied the
  // zone-cluster mode to this signal; the drought-run mode has never been applied to it — a long
  // unbroken stretch with the stakes never rising is itself a predictable pattern.
  {
    const r760b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'raise_stakes',
    });
    if (r760b.fires) {
      issues.push({
        location: `longest stretch with no scene raising stakes: ${r760b.longestRun} consecutive scenes`,
        rule: 'ORIGINALITY_STAKES_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r760b.longestRun} consecutive scenes with no scene purposed to raise stakes, even though ${r760b.presentCount} scenes elsewhere do escalate. A long unbroken stretch with nothing pushing the stakes higher is itself a learnable pattern — the audience can predict that no escalation will arrive for an extended stretch.`,
        suggestedFix: `Purpose at least one scene within the ${r760b.longestRun}-scene stretch to raise stakes so the audience can't predict a long, pressure-free lull.`,
      });
    }
  }

  // ORIGINALITY_CLOCK_DELTA_DROUGHT_RUN — Run-based × clockDelta≠0 absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 clock-shifting scenes overall,
  // fires when the longest consecutive run of scenes with zero clock movement reaches 6.
  // clockDelta has only ever anchored an average/aggregate variety check
  // (CLOCK_DELTA_FLATLINE); the run-based drought mode has never been applied to it — a long
  // unbroken stretch with the clock never moving is itself a predictable pattern.
  {
    const r760c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.clockDelta ?? 0) !== 0,
    });
    if (r760c.fires) {
      issues.push({
        location: `longest stretch with no clock movement: ${r760c.longestRun} consecutive scenes`,
        rule: 'ORIGINALITY_CLOCK_DELTA_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r760c.longestRun} consecutive scenes with zero movement on the ticking clock at all, even though ${r760c.presentCount} scenes elsewhere do shift it. A long unbroken stretch where nothing tightens or loosens the deadline is itself a learnable pattern — the audience can predict that no clock movement will arrive for an extended stretch.`,
        suggestedFix: `Move the clock — tighten or ease the deadline — somewhere within the ${r760c.longestRun}-scene stretch so the audience can't predict a long, deadline-frozen lull.`,
      });
    }
  }

  // ── Wave 774: ORIGINALITY_CLOCK_DELTA_PEAK_UNCAUSED, ORIGINALITY_CLOCK_DELTA_ZONE_CLUSTER,
  //              ORIGINALITY_SUSPENSE_ZONE_CLUSTER ──────────────────────────────────────

  // ORIGINALITY_CLOCK_DELTA_PEAK_UNCAUSED — Backward-cause × clockDelta-as-magnitude × 2-scene
  // lookback. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 clock-shifting
  // scenes, fires when the peak clock-delta magnitude scene has no dramatic turn or revelation in
  // the 2 scenes preceding it. Wave 760 applied the run-based drought mode to clockDelta; the
  // backward-cause peak mode has never been applied to it — a clock's single sharpest tightening
  // arriving with no dramatic turn or revelation preparing it is itself a predictable, uncaused
  // pattern.
  {
    const r774a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => Math.abs(r.clockDelta ?? 0),
      hasCause: r => (r.dramaticTurn ?? 'nothing') !== 'nothing' || r.revelation != null,
    });
    if (r774a.fires) {
      issues.push({
        location: `scene ${r774a.peakIdx} (peak clockDelta magnitude ${r774a.peakMagnitude}) — no preparing cause nearby`,
        rule: 'ORIGINALITY_CLOCK_DELTA_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single sharpest clock movement (Scene ${r774a.peakIdx}, |clockDelta| ${r774a.peakMagnitude}) arrives with no dramatic turn or revelation in the 2 scenes leading into it, even though ${r774a.qualifyingCount} scenes elsewhere shift the clock. An uncaused tightening of the deadline is itself a predictable pattern — the audience learns the clock moves for no dramatized reason.`,
        suggestedFix: `Add a dramatic turn or revelation in one of the 2 scenes before scene ${r774a.peakIdx} so the story's sharpest clock movement reads as earned rather than arbitrary.`,
      });
    }
  }

  // ORIGINALITY_CLOCK_DELTA_ZONE_CLUSTER — Distribution/timing × clockDelta≠0 presence ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // clock-shifting scenes, fires when more than 75% of those scenes cluster in a single third.
  // Completing the trio started by CLOCK_DELTA_FLATLINE (average/aggregate) and
  // ORIGINALITY_CLOCK_DELTA_DROUGHT_RUN (Wave 760, run-based); the zone-cluster mode has never
  // been applied to it — every clock movement concentrated in one structural third is itself a
  // predictable pattern.
  {
    const r774b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.clockDelta ?? 0) !== 0,
    });
    if (r774b.fires) {
      issues.push({
        location: `${r774b.zoneNames[r774b.maxZoneIdx]} third — ${r774b.maxZoneCount} of ${r774b.count} clock-shifting scenes`,
        rule: 'ORIGINALITY_CLOCK_DELTA_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r774b.maxZoneCount / r774b.count) * 100)}% of the scenes where the clock shifts cluster in the ${r774b.zoneNames[r774b.maxZoneIdx]} third — a predictable concentration the audience can learn to anticipate rather than a deadline that keeps tightening its grip throughout the story.`,
        suggestedFix: `Shift the clock in at least one scene outside the ${r774b.zoneNames[r774b.maxZoneIdx]} third so its movement stays unpredictable across the whole story rather than confined to one learnable window.`,
      });
    }
  }

  // ORIGINALITY_SUSPENSE_ZONE_CLUSTER — Distribution/timing × suspenseDelta>0 presence ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // suspense-positive scenes, fires when more than 75% of those scenes cluster in a single third.
  // suspenseDelta has only ever served as one component of the SCENE_SHAPE_TEMPLATING structural-
  // signature check and as a secondary "isB" in co-occurrence-decoupling checks in this pass;
  // none of the three shared-library trio modes has ever been applied to it as a primary signal —
  // every suspense spike concentrated in one structural third is itself a predictable pattern.
  {
    const r774c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r774c.fires) {
      issues.push({
        location: `${r774c.zoneNames[r774c.maxZoneIdx]} third — ${r774c.maxZoneCount} of ${r774c.count} suspense-positive scenes`,
        rule: 'ORIGINALITY_SUSPENSE_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r774c.maxZoneCount / r774c.count) * 100)}% of the scenes where tension rises cluster in the ${r774c.zoneNames[r774c.maxZoneIdx]} third — a predictable concentration the audience can learn to anticipate rather than tension that keeps testing the story unevenly across its full length.`,
        suggestedFix: `Raise suspense in at least one scene outside the ${r774c.zoneNames[r774c.maxZoneIdx]} third so tension stays unpredictable across the whole story rather than confined to one learnable window.`,
      });
    }
  }

  // ── Wave 788: ORIGINALITY_SUSPENSE_DROUGHT_RUN, ORIGINALITY_CURIOSITY_ZONE_CLUSTER,
  //              ORIGINALITY_EMOTION_ZONE_CLUSTER ──────────────────────────────────────

  // ORIGINALITY_SUSPENSE_DROUGHT_RUN — Run-based × suspenseDelta>0 absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 suspense-positive scenes overall,
  // fires when the longest consecutive run of scenes with no rising tension reaches 6. Wave 774
  // applied the zone-cluster mode to suspenseDelta; the run-based drought mode has never been
  // applied to it — a long unbroken stretch of flatlined tension is itself a predictable pattern.
  {
    const r788a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r788a.fires) {
      issues.push({
        location: `longest stretch with no rising suspense: ${r788a.longestRun} consecutive scenes`,
        rule: 'ORIGINALITY_SUSPENSE_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r788a.longestRun} consecutive scenes with no rise in suspense at all, even though ${r788a.presentCount} scenes elsewhere do spike — a predictable stretch of flatlined tension the audience can learn to expect rather than a story that keeps testing them unevenly throughout.`,
        suggestedFix: `Raise suspense somewhere within the ${r788a.longestRun}-scene stretch so tension stays unpredictable rather than settling into a learnable lull.`,
      });
    }
  }

  // ORIGINALITY_CURIOSITY_ZONE_CLUSTER — Distribution/timing × curiosityDelta>0 presence ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // curiosity-positive scenes, fires when more than 75% of those scenes cluster in a single
  // third. curiosityDelta has only ever anchored aftermath/decoupling checks in this pass; none
  // of the three shared-library trio modes has ever been applied to it — every curiosity spike
  // concentrated in one structural third is itself a predictable pattern.
  {
    const r788b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r788b.fires) {
      issues.push({
        location: `${r788b.zoneNames[r788b.maxZoneIdx]} third — ${r788b.maxZoneCount} of ${r788b.count} curiosity-positive scenes`,
        rule: 'ORIGINALITY_CURIOSITY_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r788b.maxZoneCount / r788b.count) * 100)}% of the scenes where curiosity rises cluster in the ${r788b.zoneNames[r788b.maxZoneIdx]} third — a predictable concentration the audience can learn to anticipate rather than fresh questions distributed unevenly across the whole story.`,
        suggestedFix: `Raise curiosity in at least one scene outside the ${r788b.zoneNames[r788b.maxZoneIdx]} third so wonder stays unpredictable across the whole story rather than confined to one learnable window.`,
      });
    }
  }

  // ORIGINALITY_EMOTION_ZONE_CLUSTER — Distribution/timing × emotionalShift !== 'neutral'
  // presence × structural thirds. Built on checkZoneCluster from the shared checks library. n≥9,
  // ≥3 emotionally charged scenes, fires when more than 75% of those scenes cluster in a single
  // third. emotionalShift has only ever anchored an average/aggregate tonal check in this pass;
  // none of the three shared-library trio modes has ever been applied to it — every emotional
  // beat concentrated in one structural third is itself a predictable pattern.
  {
    const r788c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r788c.fires) {
      issues.push({
        location: `${r788c.zoneNames[r788c.maxZoneIdx]} third — ${r788c.maxZoneCount} of ${r788c.count} emotionally charged scenes`,
        rule: 'ORIGINALITY_EMOTION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r788c.maxZoneCount / r788c.count) * 100)}% of the story's emotionally charged scenes cluster in the ${r788c.zoneNames[r788c.maxZoneIdx]} third — a predictable concentration the audience can learn to anticipate rather than felt experience distributed unevenly across the whole story.`,
        suggestedFix: `Give at least one scene outside the ${r788c.zoneNames[r788c.maxZoneIdx]} third an emotional charge so felt experience stays unpredictable across the whole story rather than confined to one learnable window.`,
      });
    }
  }

  // ── Wave 802: ORIGINALITY_SUSPENSE_PEAK_UNCAUSED, ORIGINALITY_CURIOSITY_DROUGHT_RUN,
  //              ORIGINALITY_EMOTION_DROUGHT_RUN ──────────────────────────────────────

  // ORIGINALITY_SUSPENSE_PEAK_UNCAUSED — Backward-cause × suspenseDelta-as-magnitude × 2-scene
  // lookback. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 suspense-
  // positive scenes, fires when the peak suspense scene has no dramatic turn or revelation in the
  // 2 scenes preceding it. Completes the trio for suspenseDelta alongside the zone-cluster mode
  // (Wave 774) and the run-based drought mode (Wave 788) — a suspense peak with no preparing
  // cause is itself a predictable, learnable pattern.
  {
    const r802a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => Math.max(0, r.suspenseDelta ?? 0),
      hasCause: r => (r.dramaticTurn ?? 'nothing') !== 'nothing' || r.revelation != null,
    });
    if (r802a.fires) {
      issues.push({
        location: `scene ${r802a.peakIdx} (peak suspenseDelta ${r802a.peakMagnitude}) — no preparing cause nearby`,
        rule: 'ORIGINALITY_SUSPENSE_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single highest-suspense scene (Scene ${r802a.peakIdx}, suspenseDelta ${r802a.peakMagnitude}) arrives with no dramatic turn or revelation in the 2 scenes leading into it, even though ${r802a.qualifyingCount} scenes elsewhere carry tension — an uncaused spike is itself a learnable pattern the audience can come to expect.`,
        suggestedFix: `Add a dramatic turn or revelation in one of the 2 scenes before scene ${r802a.peakIdx} so the peak tension reads as earned rather than a predictable, uncaused spike.`,
      });
    }
  }

  // ORIGINALITY_CURIOSITY_DROUGHT_RUN — Run-based × curiosityDelta>0 absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 curiosity-positive scenes overall,
  // fires when the longest consecutive run of scenes with no curiosity rise reaches 6. Wave 788
  // applied the zone-cluster mode to curiosityDelta; the run-based drought mode has never been
  // applied to it — a long unbroken stretch with no fresh question is itself a predictable
  // pattern.
  {
    const r802b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r802b.fires) {
      issues.push({
        location: `longest stretch with no rising curiosity: ${r802b.longestRun} consecutive scenes`,
        rule: 'ORIGINALITY_CURIOSITY_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r802b.longestRun} consecutive scenes with no rise in curiosity at all, even though ${r802b.presentCount} scenes elsewhere spark wonder — a predictable stretch of question-free flatline the audience can learn to expect rather than a story that keeps generating fresh questions unevenly throughout.`,
        suggestedFix: `Raise curiosity somewhere within the ${r802b.longestRun}-scene stretch so wonder stays unpredictable rather than settling into a learnable lull.`,
      });
    }
  }

  // ORIGINALITY_EMOTION_DROUGHT_RUN — Run-based × emotionalShift !== 'neutral' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 emotionally charged scenes overall,
  // fires when the longest consecutive run of scenes with no emotional charge reaches 6. Wave 788
  // applied the zone-cluster mode to emotionalShift; the drought-run mode has never been applied
  // to it, completing 2 of 3 slots for this categorical field — a long emotionally flat stretch
  // is itself a predictable pattern.
  {
    const r802c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r802c.fires) {
      issues.push({
        location: `longest stretch with no emotional charge: ${r802c.longestRun} consecutive scenes`,
        rule: 'ORIGINALITY_EMOTION_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r802c.longestRun} consecutive scenes with no emotional charge at all, even though ${r802c.presentCount} scenes elsewhere carry one — a predictable emotionally-flat stretch the audience can learn to expect rather than felt experience distributed unevenly throughout.`,
        suggestedFix: `Give at least one scene within the ${r802c.longestRun}-scene stretch an emotional charge so felt experience stays unpredictable rather than settling into a learnable lull.`,
      });
    }
  }

  // ── Limit total issues to avoid overwhelming output ───────────────────────
  // Clichés (minor) are pushed first and would crowd out the higher-severity
  // structural findings (UNIFORM_SCENE_PURPOSES is major) under a naive slice.
  // Sort by severity so the most important issues always survive truncation.
  const severityRank: Record<string, number> = { critical: 0, major: 1, minor: 2 };
  const prioritized = [...issues].sort(
    (a, b) => (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3),
  );
  const dedupedIssues = prioritized.slice(0, 8);

  const { revised, usedLLM } = await rewritePass({ fountain, issues: dedupedIssues, passName: 'originality', approvedSpans, storyContext: input.storyContext, priorPassResults: input.priorPassResults });
  const changed = revised !== fountain;

  return {
    pass: 'originality',
    issues: dedupedIssues,
    revisedFountain: revised,
    changed,
    summary: dedupedIssues.length === 0
      ? 'Originality pass: no clichés detected'
      : `Originality pass: ${dedupedIssues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}
