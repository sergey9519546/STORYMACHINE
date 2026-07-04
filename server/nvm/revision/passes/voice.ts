// Wave 138 — Pass 12: Tone/Voice
// Checks voice consistency: tonal shifts without justification, register
// mismatches, generic vs. authored prose texture.
// Wave 138 additions: character voice distinctiveness (UNDIFFERENTIATED_CHARACTER_VOICES,
// VOICE_MONOTONE_CHARACTER) — detects when characters sound identical to each other.
// Uses a simplified Burrows Delta proxy on action lines.
// Wave 146 additions: dialogue clarity (DIALOGUE_ATTRIBUTION_CONFUSION when chars speak
// without action breaks), cliché density, and subtext absence checks.
// Wave 160 additions: passive action voice (action lines use passive constructions),
// interior monologue leak (action lines describe character thoughts instead of behavior),
// qualifier overload (excessive hedging words drain cinematic declarative authority).
// Wave 266 additions: stative verb overload (>35% action lines open with state verb),
// dialogue hedging opener (>25% of dialogue lines begin with a hedging phrase),
// abstract subject opening (>30% of action lines begin with an abstract noun subject).
// Wave 280 additions: intensifier adverb flood in dialogue (>30% of lines contain an
// intensifier), monochrome verb vocabulary in action lines (single common verb in >25%
// of lines, ≥12 lines), scene heading repetition (>60% of scenes share the same
// location, ≥8 records).
// Wave 294 additions: dialogue interrogative saturation (>30% of dialogue lines end with ?),
// action line adverb flood (>25% of action lines contain an adverb before the verb),
// character name monotony in action (single character name in >50% of action lines).
// Wave 308 additions: dialogue length uniformity (>70% of dialogue lines within a tight
// word-count band — every speech the same size), em-dash dialogue flood (>30% of dialogue
// lines contain an interruption dash), ALL-CAPS shout in dialogue (≥3 dialogue lines with
// a shouted ALL-CAPS word).
// Wave 322 additions: trailing ellipsis flood (>25% of dialogue lines trail off with "..."),
// repeated opener word (a single word begins >40% of dialogue lines), conjunction opener
// (>30% of dialogue lines begin with And/But/So/Because — speech reads as one run-on).
// Wave 333 additions: name opener flood (>30% of dialogue lines begin with direct
// character address like "John, I..."), retrospective narrator opener (≥4 lines opening
// with "I remember"/"Back when" etc.), word stutter (≥3 lines with immediate word repeat).
// Wave 347 additions: discourse-marker opener (>25% of lines begin with "Okay,"/"Alright,"/
// "Anyway,"), vocative address flood (>25% of lines carry a comma-set-off vocative like
// "honey"/"buddy"/"sir"), greeting filler flood (≥3 lines are hellos/goodbyes/pleasantries).
// Wave 361 additions: dialogue conditional flood (>30% of dialogue lines begin with a
// conditional opener — "If", "Unless", "What if" — characters default to hypotheticals),
// dialogue apology overuse (≥3 lines are apologies — no dramatic agency), dialogue
// hesitation flood (>25% of lines contain hesitation sounds — "um", "uh", "er", "hmm").
// Wave 375 additions: dialogue ellipsis-opener flood (>20% of lines begin with "..." —
// every line trails in from an unspoken thought), dialogue triadic flood (≥3 lines use a
// "X, Y, and Z" rule-of-three — rhetorical cadence as a tic), dialogue emphatic-punctuation
// flood (>20% of lines carry doubled marks like "!!"/"?!" — manufactured intensity).
// Wave 389 additions: action expletive opener (>25% of action lines begin with a dummy-
// subject "There is"/"It was" construction — agency drained from the action), dialogue
// interrogative-opener flood (>30% of dialogue lines begin with a wh-question word — every
// exchange reads as interrogation), dialogue comparative flood (>25% of dialogue lines carry
// a "more/-er than" or "as...as" comparison — speech locked in relative ranking).
// Wave 403 additions: dialogue passive flood (>25% of dialogue lines use passive constructions
// — agent erased from speech, evasive bureaucratic register), dialogue imperative flood (>30%
// of dialogue lines are commands — characters default to directing behavior rather than
// expressing feeling), action motion verb monotone (>50% of action lines use generic
// displacement verbs — script describes choreography rather than dramatic action).
// Wave 417 additions: action line length uniformity (action-line word counts cluster so
// tightly — coefficient of variation < 0.30 — that the prose has a flat, metronomic cadence
// with no rhythmic texture; distribution/variance mode), dialogue monosyllabic flood (>35% of
// dialogue lines are ≤2 words — speech never develops past terse fragments; underweight/brevity
// mode), dialogue negation flood (>40% of dialogue lines carry a negation — characters defined
// by refusal and denial rather than desire and assertion; valence mode).
// Wave 431 additions: dialogue I-opener run (≥4 consecutive dialogue lines each begin with the
// first-person "I" — a stretch where conversation collapses into back-to-back self-reference;
// run-based mode, the first run-based check in this pass), dialogue length outlier (one dialogue
// line towers over the rest — ≥30 words and ≥4× the mean line length — an unmotivated monologue
// dump amid otherwise terse speech; single-peak isolation mode), dialogue hedged-question flood
// (>20% of dialogue lines simultaneously hedge AND end in a question mark — doubly-tentative
// speech that neither the hedging-opener nor the interrogative-saturation rate check would catch
// alone; co-occurrence mode on the conjunction of two tics).
// Wave 445 additions: dialogue question run (run-based — ≥4 consecutive dialogue lines all end
// with "?", a sustained interrogation chain where no one answers; the first run-based check on
// the question-mark channel, distinct from DIALOGUE_INTERROGATIVE_SATURATION's global proportion
// and from DIALOGUE_I_OPENER_RUN's opener channel), action scene intro heavy (average/aggregate
// × positional — the first action line per scene averages ≥2× the word count of all subsequent
// action lines in those scenes; the first positional-average check in this pass, comparing line
// position within scenes rather than the global corpus), dialogue declarative aftermath question
// (sequence/aftermath — every declarative dialogue line that is not the last is immediately
// followed by a question, so every statement triggers an interrogation; distinct from
// DIALOGUE_QUESTION_RUN which catches local consecutive question clusters).
// Wave 459 additions: dialogue assertion run (run-based — 5+ consecutive dialogue lines all end
// declaratively without "?" or "!"; a sustained assertion avalanche where nobody asks or exclaims;
// the declarative-polarity mirror of DIALOGUE_QUESTION_RUN, completing the end-punctuation run
// family), dialogue single char domination (underweight/bloat — one character delivers >70% of all
// dialogue lines while ≥3 characters speak; the voice engine silences supporting characters
// systematically; distinct from UNDIFFERENTIATED_CHARACTER_VOICES which audits similarity not
// quantity), dialogue monologue unprompted (backward-cause — no long speech ≥10 words is preceded
// within 2 dialogue lines by a question; every extended statement arrives causeless, without the
// inquiry that would naturally provoke expansion; first backward-cause check in this pass).
// Wave 473 additions: dialogue question zone cluster (distribution/timing — >75% of question-ending
// dialogue lines fall within a single third of the dialogue; interrogation is ghettoized into one
// zone rather than arising organically from dramatic pressure throughout; first distribution/timing
// check on the temporal position of a dialogue signal), dialogue opening zone long absent
// (zone presence/absence — zero long speeches ≥10 words in the first 25% of dialogue while ≥3
// appear in the remaining 75%; the opening register misrepresents character verbosity; first
// zone-presence/absence check on speech length), dialogue per-character length skew
// (average/aggregate × per-character — max per-character average speech length ≥3× the min across
// ≥3 chars with ≥3 lines each; one character has verbal architecture, another is a fragment-prop;
// first per-character average-aggregate check in this pass).
// Wave 487 additions: dialogue monologue aftermath terse (sequence/aftermath × long speech → terse
// response — n≥8 dialogue lines, ≥2 long speeches ≥10 words not at last position, all followed by
// ≤2-word responses; distinct from DIALOGUE_MONOLOGUE_UNPROMPTED which checks backward-cause before
// the monologue, and from DIALOGUE_MONOSYLLABIC_FLOOD which is a global proportion check),
// dialogue exclamation zone cluster (distribution/timing × exclamation mark × thirds — ≥12 dialogue
// lines, ≥4 !-ending lines, >75% in one third; the exclamation-channel complement of DIALOGUE_
// QUESTION_ZONE_CLUSTER, completing the punctuation zone distribution pair), dialogue closing zone
// question absent (zone presence/absence × closing zone × question absence — ≥12 dialogue lines,
// ≥3 questions in the corpus, zero in the final 25%; the closing-zone complement of DIALOGUE_OPENING_
// ZONE_LONG_ABSENT, filling the closing-zone × question-absence cell).
// Wave 501 additions: dialogue question aftermath terse (sequence/aftermath × question → response
// brevity — ≥8 dialogue lines, ≥2 question-ending lines not at last position, ALL followed by ≤2-word
// responses; questions never earn substantive engagement; the question-trigger sibling of DIALOGUE_
// MONOLOGUE_AFTERMATH_TERSE and distinct from DIALOGUE_DECLARATIVE_AFTERMATH_QUESTION which checks
// the opposite temporal direction), dialogue opening zone exclamation absent (zone presence/absence
// × opening 25% × ! absent — ≥12 dialogue lines, ≥4 !-ending lines globally, none in the first 25%;
// the opening-zone × ! cell, completing the zone-presence/absence × punctuation matrix alongside
// DIALOGUE_CLOSING_ZONE_QUESTION_ABSENT and DIALOGUE_OPENING_ZONE_LONG_ABSENT), dialogue peak long
// early (single-peak isolation × speech length × opening zone — ≥8 dialogue lines, the single
// longest speech ≥10 words is in the first 25%, ≥3 long speeches exist in the rest; the inverse of
// DIALOGUE_OPENING_ZONE_LONG_ABSENT and distinct from DIALOGUE_LENGTH_OUTLIER which checks ratio to
// mean rather than zonal position; first single-peak isolation check using positional zone).
// Wave 543 additions: action passive run (run-based × passive construction × action lines —
// ≥10 action lines, ≥3 passive globally, maxRun ≥4; first run-based check on the action-line
// corpus in this pass; distinct from PASSIVE_ACTION_VOICE which fires on global proportion ≥15%
// and cannot detect a local passive streak while the overall rate stays below threshold), dialogue
// affirmation flood (valence × affirmation content × dialogue — ≥10 dialogue lines, >30% contain
// explicit affirmative assent: yes/yeah/right/exactly/absolutely/of course/agreed/definitely etc.;
// positive-valence complement of DIALOGUE_NEGATION_FLOOD completing the valence polarity pair),
// dialogue exclamation backward causeless (backward-cause × exclamation channel × dialogue —
// ≥8 dialogue lines, ≥2 qualifiable !-ending lines [i>0], ALL preceded by a line ending in
// neither "?" nor "!" in the immediately prior dialogue line; all emotional intensity is
// self-generated rather than provoked; first backward-cause check on the exclamation channel).
// Wave 585 additions: dialogue affirmation zone cluster (distribution/timing × affirmation ×
// thirds — ≥12 dialogue lines, ≥3 affirmation lines, >75% in one third; the positive-assent
// register ghettoized into one structural zone; the affirmation-channel sibling of DIALOGUE_
// NEGATION_ZONE_CLUSTER and DIALOGUE_QUESTION/EXCLAMATION/LONG_SPEECH_ZONE_CLUSTER; distinct
// from DIALOGUE_AFFIRMATION_FLOOD [global rate]), dialogue exclamation aftermath terse (sequence/
// aftermath × exclamation trigger × ≤2-word response — ≥8 dialogue lines, ≥2 qualifying
// !-ending lines, all followed by ≤2-word responses; outbursts earn no engagement; the
// exclamation-trigger sibling of DIALOGUE_QUESTION_AFTERMATH_TERSE and DIALOGUE_MONOLOGUE_
// AFTERMATH_TERSE; distinct from DIALOGUE_EXCLAMATION_BACKWARD_CAUSELESS [backward-cause mode]),
// dialogue hedged exclamation flood (co-occurrence × hesitation sound × "!" ending — ≥10 lines,
// >15% contain BOTH hesitation sound [um/uh/er/hmm] AND end in "!"; the "uncertain outburst";
// completes the hedged-X family alongside HEDGED_QUESTION/AFFIRMATION/NEGATION_FLOOD; distinct
// from DIALOGUE_EXCLAMATION_BACKWARD_CAUSELESS [backward-cause], DIALOGUE_HESITATION_FLOOD
// [hesitation alone], and DIALOGUE_EXCLAMATION_RUN [run-based]).
// Wave 571 additions: dialogue negation zone cluster (distribution/timing × negation × thirds —
// ≥12 dialogue lines, ≥3 negation lines, >75% in one third; refusal ghettoized into one zone; the
// negation member of the zone-cluster family alongside DIALOGUE_QUESTION/EXCLAMATION/LONG_SPEECH_
// ZONE_CLUSTER, distinct from DIALOGUE_NEGATION_FLOOD [global rate], DIALOGUE_NEGATION_RUN
// [consecutive], and DIALOGUE_NEGATION_SELF_FEEDING [backward-cause]), dialogue hedged negation flood
// (co-occurrence × hesitation sound × negation word — ≥10 dialogue lines, >15% contain BOTH a
// hesitation sound AND a negation word; the "uncertain no" tic where characters refuse while visibly
// unsure, draining oppositions of friction; the negation member of the hedged-X family alongside
// DIALOGUE_HEDGED_AFFIRMATION_FLOOD [the "uncertain yes"] and DIALOGUE_HEDGED_QUESTION_FLOOD),
// dialogue opening zone question absent (zone presence/absence × question mark × opening 25% — ≥12
// dialogue lines, ≥4 questions globally, zero in the opening quarter while ≥2 exist later; the setup
// withholds the interrogative hook; completes the opening/middle/closing question zone-absence triptych
// alongside DIALOGUE_QUESTION_ZONE_MIDDLE_ABSENT and DIALOGUE_CLOSING_ZONE_QUESTION_ABSENT).
// Wave 557 additions: dialogue hedged affirmation flood (co-occurrence × hesitation sound ×
// affirmation word — ≥10 dialogue lines, >15% contain BOTH a hesitation sound [um/uh/er/hmm]
// AND an explicit affirmation word in the same line; the "uncertain yes" tic where characters
// agree while visibly unsure, draining agreements of dramatic conviction; distinct from
// DIALOGUE_HEDGED_QUESTION_FLOOD which is co-occurrence × hedging opener × ? rather than
// hesitation sound × affirmation word, DIALOGUE_AFFIRMATION_FLOOD valence on affirmation alone,
// and DIALOGUE_HESITATION_FLOOD on hesitation alone), dialogue long speech zone cluster
// (distribution/timing × speech length ≥10 words × thirds — ≥12 dialogue lines, ≥3 long
// speeches, >75% in one third; monologue energy is structurally ghettoized into one zone;
// distinct from DIALOGUE_QUESTION_ZONE_CLUSTER [? channel] and DIALOGUE_EXCLAMATION_ZONE_CLUSTER
// [! channel] which are the same mode on different channels, DIALOGUE_PEAK_LONG_EARLY which is
// single-peak isolation × opening zone not distribution clustering, and DIALOGUE_OPENING/CLOSING_
// ZONE_LONG_ABSENT which are zone presence/absence not distribution/timing), dialogue negation
// self-feeding (backward-cause × negation × prior negation — ≥8 dialogue lines, ≥3 negation
// lines at i>0, ALL preceded by another negation-containing line; refusal feeds only from prior
// refusal, never from an affirmative catalyst; distinct from DIALOGUE_NEGATION_FLOOD [valence ×
// global rate], DIALOGUE_NEGATION_RUN [run-based × consecutive], and DIALOGUE_EXCLAMATION_
// BACKWARD_CAUSELESS [backward-cause × ! channel]).
// Wave 529 additions: dialogue question zone middle absent (zone presence/absence × question mark ×
// middle 50% — ≥12 dialogue lines, ≥4 questions globally, zero in middle 50% while ≥2 exist in outer
// zones; fills the middle-zone cell in the zone × question-absence grid alongside OPENING_ZONE_... and
// CLOSING_ZONE_QUESTION_ABSENT), dialogue hesitation run (run-based × hesitation content — ≥8 dialogue
// lines, ≥3 hesitation lines globally, maxRun ≥4; the first run check on the hesitation channel,
// distinct from DIALOGUE_HESITATION_FLOOD which is a global proportion check), dialogue question
// aftermath long (sequence/aftermath × question → long response ≥10 words — ≥8 dialogue lines, ≥2
// qualifying questions, ALL followed by ≥10-word responses; every question earns a monologue; the
// long-response inverse of DIALOGUE_QUESTION_AFTERMATH_TERSE completing the question-aftermath pair).
// Wave 515 additions: dialogue exclamation run (run-based × exclamation mark — ≥10 dialogue lines,
// ≥3 !-ending lines globally, maxExclRun ≥4; the "!"-channel complement of DIALOGUE_QUESTION_RUN
// and DIALOGUE_ASSERTION_RUN, completing the end-punctuation run triptych; distinct from DIALOGUE_
// EXCLAMATION_ZONE_CLUSTER which checks third-level distribution, not consecutive adjacency),
// dialogue closing zone long absent (zone presence/absence × closing 25% × long speech absent —
// ≥12 dialogue lines, ≥3 long speeches ≥10 words globally, none in the closing 25%; fills the
// closing-zone × speech-length cell alongside DIALOGUE_CLOSING_ZONE_QUESTION_ABSENT; distinct from
// DIALOGUE_OPENING_ZONE_LONG_ABSENT which checks the opening zone and DIALOGUE_PEAK_LONG_EARLY
// which finds the single peak in the opening zone), dialogue negation run (run-based × negation
// content — ≥8 dialogue lines, ≥3 negation-containing lines globally, maxNegRun ≥4; the first
// run-based check on the negation content channel rather than end-punctuation; distinct from
// DIALOGUE_NEGATION_FLOOD which is a global proportion check that cannot detect concentrated
// local runs while the overall proportion stays below threshold).
// Wave 599 additions: dialogue highlight revelation decoupled (co-occurrence/decoupling ×
// dialogueHighlights-presence × revelation-presence — n≥6, ≥2 scenes with a tracked belief
// statement, ≥2 revelation scenes, zero overlap; a character voicing a conviction and the story
// disclosing a hidden truth never share a moment — the two per-scene fields this pass has used
// least, dialogueHighlights [one prior use, as a text-scanning array] and revelation [never
// accessed as a field before — the word only ever appeared inside prose suggestion text], paired
// with each other for the first time here), unresolved clue drought run (run-based ×
// unresolvedClues-absence, built on checkDroughtRun from the shared checks library — audit M2.2 —
// n≥10, ≥3 debt-carrying scenes, longest consecutive run with no outstanding clue-debt ≥6; first
// use of unresolvedClues in this 101-rule file), revelation zone imbalance (underweight/bloat ×
// revelation-presence × four structural zones, built on checkZoneImbalance — one zone with no
// revelations while another holds ≥50%; first use of the revelation field as a per-scene signal
// in this file at all, and the first application of checkZoneImbalance to the revelation channel
// across every pass this session).
// Wave 613 additions (built on the shared checks library, audit M2.2): DRAMATIC_TURN_DIALOGUE_
// HIGHLIGHT_DECOUPLED (co-occurrence/decoupling × dramaticTurn × dialogueHighlights — first use
// of dramaticTurn anywhere in this 104-rule pass), VOICE_STAGING_ZONE_IMBALANCE
// (underweight/bloat × visualBeats × four structural zones — first use of visualBeats anywhere
// in this pass), CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (sequence/aftermath × clockRaised
// trigger → dialogueHighlights absence — first use of clockRaised anywhere in this pass).
// Wave 627 additions (built on the shared checks library, audit M2.2): VOICE_PAYOFF_STAGING_
// DECOUPLED (co-occurrence/decoupling × payoffSetupIds × visualBeats — first use of payoffSetupIds
// anywhere in this 107-rule pass), VOICE_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID
// (sequence/aftermath × seededClueIds trigger → dialogueHighlights absence — first use of
// seededClueIds in this pass), VOICE_RELATIONSHIP_SHIFT_ZONE_IMBALANCE (underweight/bloat ×
// relationshipShifts × four structural zones — first use of relationshipShifts in this pass).
// Wave 641 additions: VOICE_SUSPENSE_FLATLINE (average/aggregate × suspenseDelta variety — first
// use of suspenseDelta anywhere in this 110-rule pass), VOICE_CURIOSITY_ZONE_IMBALANCE
// (underweight/bloat × curiosityDelta × four structural zones — first use of curiosityDelta in
// this pass), VOICE_CLOCK_DELTA_PEAK_UNCAUSED (backward-cause × clockDelta-magnitude peak ×
// dramaticTurn/revelation cause — first use of clockDelta and the backward-cause mode here).
// Wave 655 additions: VOICE_CHARACTER_MOMENT_ZONE_CLUSTER (distribution/timing × purpose ===
// 'character_moment' × structural thirds — first checkZoneCluster use in this 113-rule pass, and
// the first genuine use of the `purpose` field, which had zero prior accesses despite being a
// real ScenePurpose enum), VOICE_STAGING_PEAK_UNCAUSED (single-peak isolation/backward-cause ×
// visualBeats magnitude — Wave 641 applied the peak-uncaused mode to clockDelta; visualBeats
// itself has never been peak-audited here), VOICE_SEED_DROUGHT_RUN (run-based × seededClueIds
// absence — this pass already has UNRESOLVED_CLUE_DROUGHT_RUN on the unresolvedClues channel;
// seededClueIds itself has never been drought-audited here).
// Wave 669 additions: VOICE_HIGHLIGHT_PEAK_UNCAUSED (single-peak isolation/backward-cause ×
// dialogueHighlights magnitude — dialogueHighlights already anchors two decoupled checks and two
// aftermath-void checks in this pass, but has never been backward-cause peak-audited; the scene
// with the most highlighted lines has no dramatic turn or revelation in itself or the two scenes
// before it), VOICE_PAYOFF_DROUGHT_RUN (run-based × payoffSetupIds absence — payoffSetupIds has
// only ever anchored a single co-occurrence/decoupling check here; the drought-run mode applied
// to this channel for the first time), VOICE_RELATIONSHIP_ZONE_CLUSTER (distribution/timing ×
// relationshipShifts × structural thirds — relationshipShifts has only been zone-IMBALANCE-
// audited [four-zone bloat/empty]; this is the first application of the thirds-based
// zone-cluster mode to the relational channel).
// Wave 683 additions: VOICE_OPEN_THREAD_PEAK_UNCAUSED (single-peak isolation/backward-cause ×
// unresolvedClues magnitude — Wave 599's UNRESOLVED_CLUE_DROUGHT_RUN already drought-audits this
// channel's absence, but the scene where open threads pile up densest has never been checked for
// backward causation; fires when neither that scene nor either of the two before it has a
// dramatic turn or revelation), VOICE_CURIOSITY_DROUGHT_RUN (run-based × curiosityDelta>0 absence
// — Wave 641's VOICE_CURIOSITY_ZONE_IMBALANCE already four-zone-audits this channel's bloat/empty
// distribution, but a long unbroken run with no new curiosity spike at all has never been
// drought-audited), VOICE_SUSPENSE_ZONE_CLUSTER (distribution/timing × suspenseDelta>0 ×
// structural thirds — Wave 641's VOICE_SUSPENSE_FLATLINE checks average/aggregate variety across
// the whole story; this instead asks where positive suspense spikes concentrate structurally,
// the first zone-cluster application to this channel).
// Wave 697 additions: VOICE_SEED_ZONE_CLUSTER (distribution/timing × seededClueIds × structural
// thirds — Wave 655's VOICE_SEED_DROUGHT_RUN applied the drought-run mode to seededClueIds; the
// zone-cluster mode has never been applied to this channel), VOICE_PAYOFF_PEAK_UNCAUSED
// (single-peak isolation/backward-cause × payoffSetupIds magnitude — Wave 669's VOICE_PAYOFF_
// DROUGHT_RUN applied the drought-run mode to payoffSetupIds; the backward-cause peak mode has
// never been applied to this channel), VOICE_STAGING_DROUGHT_RUN (run-based × visualBeats absence
// — Wave 655's VOICE_STAGING_PEAK_UNCAUSED applied the backward-cause peak mode to visualBeats;
// the drought-run mode has never been applied to this channel).
// Wave 711 additions: VOICE_STAGING_ZONE_CLUSTER (distribution/timing × visualBeats × structural
// thirds — Waves 655/697 applied the backward-cause peak and drought-run modes to visualBeats;
// the zone-cluster mode has never been applied to it, completing the trio), VOICE_SEED_PEAK_
// UNCAUSED (single-peak isolation/backward-cause × seededClueIds magnitude — Waves 655/697
// applied the drought-run and zone-cluster modes to seededClueIds; the backward-cause peak mode
// has never been applied to it, completing the trio), VOICE_PAYOFF_ZONE_CLUSTER (distribution/
// timing × payoffSetupIds × structural thirds — Waves 669/697 applied the drought-run and
// backward-cause peak modes to payoffSetupIds; the zone-cluster mode has never been applied to
// it, completing the trio).
// Wave 725 additions: VOICE_HIGHLIGHT_DROUGHT_RUN (run-based × dialogueHighlights absence — Wave
// 669 applied the backward-cause peak mode to dialogueHighlights; the drought-run mode has never
// been applied to it), VOICE_RELATIONSHIP_PEAK_UNCAUSED (single-peak isolation/backward-cause ×
// relationshipShifts magnitude — Wave 669 applied the zone-cluster mode to relationshipShifts;
// the backward-cause peak mode has never been applied to it), VOICE_OPEN_THREAD_DROUGHT_RUN
// (run-based × unresolvedClues absence — Wave 683 applied the backward-cause peak mode to
// unresolvedClues; the drought-run mode has never been applied to it).
// Wave 739 additions: VOICE_OPEN_THREAD_ZONE_CLUSTER (distribution/timing × unresolvedClues ×
// structural thirds — Waves 599/683 applied the run-based drought and backward-cause peak modes
// to unresolvedClues; the zone-cluster mode has never been applied to it, completing the trio),
// VOICE_HIGHLIGHT_ZONE_CLUSTER (distribution/timing × dialogueHighlights × structural thirds —
// Waves 669/725 applied the backward-cause peak and run-based drought modes to
// dialogueHighlights; the zone-cluster mode has never been applied to it, completing the trio),
// VOICE_RELATIONSHIP_DROUGHT_RUN (run-based × relationshipShifts absence — Waves 669/725 applied
// the zone-cluster and backward-cause peak modes to relationshipShifts; the drought-run mode has
// never been applied to it, completing the trio).
// Wave 753 additions: VOICE_CLOCK_DELTA_DROUGHT_RUN (run-based × clockDelta≠0 absence — Wave 641
// applied the backward-cause peak mode to clockDelta; the drought-run mode has never been applied
// to it), VOICE_CHARACTER_MOMENT_DROUGHT_RUN (run-based × purpose === 'character_moment' absence
// — Wave 655 applied the zone-cluster mode to this signal; the drought-run mode has never been
// applied to it), VOICE_CURIOSITY_ZONE_CLUSTER (distribution/timing × curiosityDelta>0 presence ×
// structural thirds — Wave 683 applied the run-based drought mode to curiosityDelta; the
// zone-cluster mode has never been applied to it).
// Wave 767 additions: VOICE_CLOCK_DELTA_ZONE_CLUSTER (distribution/timing × clockDelta≠0
// presence × structural thirds — Waves 641/753 applied the backward-cause peak and run-based
// drought modes to clockDelta; the zone-cluster mode has never been applied to it, completing the
// trio), VOICE_CURIOSITY_PEAK_UNCAUSED (backward-cause × curiosityDelta-as-magnitude × 2-scene
// lookback — Waves 683/739 applied the run-based drought and zone-cluster modes to curiosityDelta;
// the backward-cause peak mode has never been applied to it, completing the trio),
// VOICE_SUSPENSE_DROUGHT_RUN (run-based × suspenseDelta>0 absence — Wave 683 applied the
// zone-cluster mode to suspenseDelta [VOICE_SUSPENSE_ZONE_CLUSTER]; the drought-run mode has never
// been applied to it, completing the trio).
// Wave 781 additions: VOICE_TURN_DROUGHT_RUN (run-based × dramaticTurn !== 'nothing' absence —
// dramaticTurn as a primary signal has only ever anchored a co-occurrence-decoupling check
// [DRAMATIC_TURN_DIALOGUE_HIGHLIGHT_DECOUPLED] in this pass; none of the three shared-library
// trio modes has ever been applied to it), VOICE_EMOTION_ZONE_CLUSTER (distribution/timing ×
// emotionalShift !== 'neutral' presence × structural thirds — emotionalShift has only ever
// anchored an average-toneset check in this pass; none of the three shared-library trio modes has
// ever been applied to it), VOICE_SUSPENSE_PEAK_UNCAUSED (backward-cause ×
// suspenseDelta-as-magnitude × 2-scene lookback — Waves 683/753 applied the zone-cluster and
// run-based drought modes to suspenseDelta; the backward-cause peak mode has never been applied
// to it, completing the trio).
// Wave 795 additions: VOICE_TURN_ZONE_CLUSTER (distribution/timing × dramaticTurn !== 'nothing'
// presence × structural thirds — Wave 781 applied the run-based drought mode to dramaticTurn; the
// zone-cluster mode has never been applied to it, completing the trio for a categorical field
// where the peak mode is conventionally skipped), VOICE_EMOTION_DROUGHT_RUN (run-based ×
// emotionalShift !== 'neutral' absence — Wave 781 applied the zone-cluster mode to
// emotionalShift; the drought-run mode has never been applied to it, completing the trio for a
// categorical field where the peak mode is conventionally skipped), VOICE_REVELATION_ZONE_CLUSTER
// (distribution/timing × revelation × structural thirds — the existing REVELATION_ZONE_IMBALANCE
// uses checkZoneImbalance, a different shared-library helper testing deficit-vs-surplus across
// zones, not the general thirds-based >75%-concentration test that checkZoneCluster performs;
// none of the three trio modes has ever been applied to revelation as the primary signal).
// Wave 809 additions: VOICE_REVELATION_DROUGHT_RUN (run-based × revelation absence — completing
// 2 of 3 slots for revelation alongside the zone-cluster mode added in Wave 795),
// VOICE_REVELATION_PEAK_UNCAUSED (backward-cause × revelation-as-magnitude [0/1] × 2-scene
// lookback, anchored on the FIRST revelation scene — completes the trio for revelation; hasCause
// deliberately omits revelation to avoid circularity), VOICE_NEGATIVE_EMOTION_ZONE_CLUSTER
// (distribution/timing × emotionalShift === 'negative' × structural thirds — negative-specific
// emotionalShift has only ever appeared inside a combined co-occurrence check [elevated-tone-vs-
// negative-shift]; none of the three shared-library trio modes has ever isolated this valence on
// its own).
//
// Wave 823 additions: VOICE_NEGATIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift === 'negative'
// absence — completes 2 of 3 slots for this valence alongside the zone-cluster mode added in Wave
// 809; peak mode conventionally skipped for this categorical field), VOICE_TURNING_POINT_ZONE_
// CLUSTER (distribution/timing × purpose === 'turning_point' × structural thirds — this purpose
// value has never appeared anywhere in this file; distinct from VOICE_TURN_ZONE_CLUSTER [Wave 795],
// which audits the dramaticTurn free-text field, not this purpose enum value), VOICE_INTRODUCE_
// CONFLICT_ZONE_CLUSTER (distribution/timing × purpose === 'introduce_conflict' × structural
// thirds — likewise a virgin field, never referenced in this file before).
//
// Wave 837 additions: VOICE_TURNING_POINT_DROUGHT_RUN (run-based × purpose === 'turning_point'
// absence — completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added
// in Wave 823; peak mode conventionally skipped for this categorical field), VOICE_INTRODUCE_
// CONFLICT_DROUGHT_RUN (run-based × purpose === 'introduce_conflict' absence — completes 2 of 3
// slots for this purpose value alongside the zone-cluster mode added in Wave 823; peak mode
// conventionally skipped for this categorical field), VOICE_STAKES_ZONE_CLUSTER (distribution/
// timing × purpose === 'raise_stakes' × structural thirds — this purpose value has never been
// referenced anywhere in this file; a virgin field).
//
// Wave 851 additions: VOICE_STAKES_DROUGHT_RUN (run-based × purpose === 'raise_stakes' absence —
// completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave
// 837; peak mode conventionally skipped for this categorical field), VOICE_POSITIVE_EMOTION_ZONE_
// CLUSTER (distribution/timing × emotionalShift === 'positive' × structural thirds — mirrors the
// completed negative-valence trio; the positive valence has never been isolated by any of the
// three shared-library trio modes in this file), VOICE_ESTABLISH_WORLD_ZONE_CLUSTER
// (distribution/timing × purpose === 'establish_world' × structural thirds — this purpose value
// has never been referenced anywhere in this file; a virgin field).
//
// Wave 865 additions: VOICE_ESTABLISH_WORLD_DROUGHT_RUN (run-based x purpose ===
// 'establish_world' absence -- completes 2 of 3 slots for this purpose value alongside the
// zone-cluster mode added in Wave 851; peak mode conventionally skipped for this categorical
// field), VOICE_CLIMAX_ZONE_CLUSTER (distribution/timing x purpose === 'climax' x structural
// thirds -- this purpose value has never been referenced anywhere in this file; a virgin
// field), VOICE_RESOLUTION_ZONE_CLUSTER (distribution/timing x purpose === 'resolution' x
// structural thirds -- likewise a virgin field, never referenced in this file before).
//
// Wave 879 additions: VOICE_CLIMAX_DROUGHT_RUN (run-based x purpose === 'climax' absence --
// completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave
// 865; peak mode conventionally skipped for this categorical field), VOICE_RESOLUTION_
// DROUGHT_RUN (run-based x purpose === 'resolution' absence -- completes 2 of 3 slots for this
// purpose value alongside the zone-cluster mode added in Wave 865; peak mode conventionally
// skipped for this categorical field), VOICE_COMPLICATE_ZONE_CLUSTER (distribution/timing x
// purpose === 'complicate' x structural thirds -- this purpose value has never been referenced
// anywhere in this file; a virgin field).
//
// Wave 893 additions: VOICE_COMPLICATE_DROUGHT_RUN (run-based x purpose === 'complicate'
// absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode
// added in Wave 879; peak mode conventionally skipped for this categorical field). Also, no
// purpose value had ever been audited by the distinct 4-zone checkZoneImbalance mode in this
// file (only revelation, visualBeats, relationshipShifts, and curiosityDelta had); this wave
// applies it to two purpose values with complete 3-zone/run-based trios: VOICE_CLIMAX_
// ZONE_IMBALANCE (purpose === 'climax') and VOICE_ESTABLISH_WORLD_ZONE_IMBALANCE (purpose ===
// 'establish_world').
//
// Wave 907 additions: continuing the checkZoneImbalance rollout begun in Wave 893, this wave
// applies the 4-zone bloat+empty-zone mode to three more purpose values that each already have a
// complete 3-zone/run-based trio (checkZoneCluster + checkDroughtRun) but have never been audited
// by it: VOICE_RESOLUTION_ZONE_IMBALANCE (purpose === 'resolution'),
// VOICE_TURNING_POINT_ZONE_IMBALANCE (purpose === 'turning_point'), and
// VOICE_COMPLICATE_ZONE_IMBALANCE (purpose === 'complicate').
//
// Wave 921 additions: continuing the checkZoneImbalance rollout begun in Wave 893, this wave
// applies the 4-zone bloat+empty-zone mode to the three remaining purpose values with complete
// 3-zone/run-based trios that had never been audited by it: VOICE_INTRODUCE_CONFLICT_ZONE_IMBALANCE
// (purpose === 'introduce_conflict'), VOICE_CHARACTER_MOMENT_ZONE_IMBALANCE (purpose ===
// 'character_moment'), and VOICE_STAKES_ZONE_IMBALANCE (purpose === 'raise_stakes').
//
// Wave 935 additions: purpose === 'revelation' has never been referenced anywhere in this pass
// (the pre-existing VOICE_REVELATION_ZONE_CLUSTER/DROUGHT_RUN audit the separate revelation
// string|null field, not this purpose enum value) -- a genuinely virgin field. This wave adds
// VOICE_REVELATION_PURPOSE_ZONE_CLUSTER and VOICE_REVELATION_PURPOSE_DROUGHT_RUN (peak mode
// conventionally skipped for this categorical field), plus VOICE_NEGATIVE_EMOTION_ZONE_IMBALANCE,
// extending the 4-zone checkZoneImbalance mode to the emotionalShift valence signal (emotionalShift
// === 'negative' has a complete 3-zone/run trio but has never been audited by it).
// Wave 949 additions: extending the checkZoneImbalance rollout to three more trio-complete signals
// spanning three distinct signal classes: VOICE_REVELATION_PURPOSE_ZONE_IMBALANCE (purpose ===
// 'revelation', trio completed Wave 935), VOICE_SUSPENSE_ZONE_IMBALANCE (suspenseDelta > 0 — tension-
// delta magnitude), and VOICE_PAYOFF_ZONE_IMBALANCE (payoffSetupIds.length > 0 — a payoffSetupIds
// array field distinct from the already-audited visualBeats/relationshipShifts imbalances).
// Wave 963 additions: auditing three more trio-complete signals on genuinely uncovered fields (the
// revelation string field is already covered by REVELATION_ZONE_IMBALANCE), spanning three distinct
// classes: VOICE_TURN_ZONE_IMBALANCE (dramaticTurn !== 'nothing' — categorical), VOICE_OPEN_THREAD_
// ZONE_IMBALANCE (unresolvedClues.length > 0 — an array distinct from the audited seed/payoff/
// relationship/visual arrays), and VOICE_CLOCK_DELTA_ZONE_IMBALANCE (clockDelta !== 0 — a delta
// distinct from the audited suspense/curiosity deltas).
// Wave 977 additions: auditing three more trio-complete signals on genuinely uncovered fields (the
// revelation-purpose and relationshipShifts fields are already covered by VOICE_REVELATION_PURPOSE_
// ZONE_IMBALANCE / REVELATION_ZONE_IMBALANCE and VOICE_RELATIONSHIP_SHIFT_ZONE_IMBALANCE
// respectively), spanning three distinct classes: VOICE_EMOTION_ZONE_IMBALANCE (emotionalShift !==
// 'neutral' — the any-direction valence signal), VOICE_HIGHLIGHT_ZONE_IMBALANCE (dialogueHighlights
// array), and VOICE_SEED_ZONE_IMBALANCE (seededClueIds array, distinct from the audited payoff array).
// Wave 991 additions: zone-imbalance is now fully exhausted in this pass — the only remaining
// cluster+drought pair, VOICE_REVELATION (revelation != null) and VOICE_RELATIONSHIP
// (relationshipShifts.length > 0), both duplicate signals already audited by REVELATION_ZONE_
// IMBALANCE and VOICE_RELATIONSHIP_SHIFT_ZONE_IMBALANCE respectively (confirmed again this wave;
// same finding as Wave 977). This wave pivots entirely to the sequence/aftermath mode with three
// fresh trigger/aftermath pairings, none reusing the CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID or
// VOICE_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID combinations: VOICE_STAKES_CURIOSITY_AFTERMATH_VOID
// (raise_stakes → curiosityDelta), VOICE_TURN_SUSPENSE_AFTERMATH_VOID (dramatic turn → suspense),
// and VOICE_PAYOFF_RELATIONSHIP_AFTERMATH_VOID (payoffSetupIds → relationshipShifts).
// Wave 1005 additions: zone-imbalance remains exhausted (VOICE_REVELATION/VOICE_RELATIONSHIP still
// duplicates of already-audited signals). This wave gives three existing aftermath-void triggers a
// fresh consequence channel: VOICE_CLOCK_CURIOSITY_AFTERMATH_VOID (clockRaised, previously only
// paired with dialogueHighlights, now paired with curiosityDelta), VOICE_SEED_EMOTIONAL_AFTERMATH_
// VOID (seededClueIds, previously only paired with dialogueHighlights, now paired with
// emotionalShift), and VOICE_TURN_RELATIONAL_AFTERMATH_VOID (dramaticTurn, previously only paired
// with suspenseDelta, now paired with relationshipShifts).
// Wave 1019 additions: two more existing triggers get a fresh channel — VOICE_STAKES_SUSPENSE_
// AFTERMATH_VOID (raise_stakes, previously only paired with curiosityDelta, now paired with
// suspenseDelta) and VOICE_PAYOFF_CURIOSITY_AFTERMATH_VOID (payoffSetupIds, previously only paired
// with relationshipShifts, now paired with curiosityDelta) — plus one genuinely fresh pairing never
// used in this pass before: VOICE_OPEN_THREAD_STAGING_AFTERMATH_VOID (unresolvedClues.length >= 3,
// a trigger never used for aftermath-void in this file, paired with visualBeats, a channel never
// used as an aftermath consequence in this file).
// Wave 1033 additions: three more triggers get a fresh channel — VOICE_STAKES_EMOTIONAL_
// AFTERMATH_VOID (raise_stakes, previously paired with curiosityDelta/suspenseDelta, now paired
// with emotionalShift for a third channel), VOICE_CLOCK_RELATIONAL_AFTERMATH_VOID (clockRaised,
// previously paired with dialogueHighlights/curiosityDelta, now paired with relationshipShifts for
// a third channel), and VOICE_TURN_CURIOSITY_AFTERMATH_VOID (dramaticTurn, previously paired with
// suspenseDelta/relationshipShifts, now paired with curiosityDelta for a third channel).
// Wave 1047 additions: VOICE_SEED_CURIOSITY_AFTERMATH_VOID gives seededClueIds a third channel
// (previously paired with dialogueHighlights/emotionalShift, now paired with curiosityDelta),
// VOICE_PAYOFF_EMOTIONAL_AFTERMATH_VOID gives payoffSetupIds a third channel (previously paired
// with relationshipShifts/curiosityDelta, now paired with emotionalShift), and VOICE_CLOCK_
// SUSPENSE_AFTERMATH_VOID gives clockRaised a fourth channel (previously paired with
// dialogueHighlights/curiosityDelta/relationshipShifts, now paired with suspenseDelta).
// Wave 1061 additions: VOICE_CLOCK_EMOTIONAL_AFTERMATH_VOID gives clockRaised a fifth channel
// (previously paired with dialogueHighlights/curiosityDelta/relationshipShifts/suspenseDelta, now
// also paired with emotionalShift). VOICE_SEED_SUSPENSE_AFTERMATH_VOID gives seededClueIds a
// fourth channel (previously paired with dialogueHighlights/emotionalShift/curiosityDelta, now
// also paired with suspenseDelta). VOICE_STAKES_RELATIONAL_AFTERMATH_VOID gives raise_stakes a
// fourth channel (previously paired with curiosityDelta/suspenseDelta/emotionalShift, now also
// paired with relationshipShifts).

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';
import { checkCoOccurrenceDecoupled, checkDroughtRun, checkZoneImbalance, checkAftermathVoid, checkPeakUncaused, checkZoneCluster, FOUR_ZONE_NAMES } from './lib/checks.ts';

/** Extract action line word frequency per scene */
function sceneWordFrequencies(fountain: string): Map<number, Map<string, number>> {
  const lines = fountain.split('\n');
  const sceneFreqs = new Map<number, Map<string, number>>();
  let sceneIdx = -1;
  let isDialogue = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(trimmed)) {
      sceneIdx++;
      sceneFreqs.set(sceneIdx, new Map());
      isDialogue = false;
      continue;
    }
    if (/^[A-Z][A-Z0-9\s\-'\.]{2,}$/.test(trimmed)) { isDialogue = true; continue; }
    if (!trimmed) { isDialogue = false; continue; }
    if (isDialogue) continue; // skip dialogue
    if (sceneIdx < 0) continue;

    // Count words in action line (skip functional stopwords — preserve content words
    // like 'room', 'door', 'hand' which carry voice in screenplay action)
    const freqs = sceneFreqs.get(sceneIdx)!;
    const voiceStopwords = new Set(['that', 'this', 'with', 'from', 'have', 'into', 'they', 'them', 'then', 'were', 'been', 'than', 'when', 'also', 'just', 'here', 'there', 'over', 'back', 'down', 'away', 'through', 'very', 'would', 'could', 'should', 'might', 'their', 'about', 'what', 'which', 'some', 'each', 'will']);
    const words = trimmed.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !voiceStopwords.has(w));
    for (const w of words) freqs.set(w, (freqs.get(w) ?? 0) + 1);
  }
  return sceneFreqs;
}

// ── Character voice distinctiveness ──────────────────────────────────────────
// These characters/cues are narrator/annotation tokens, not speaking characters.
const NON_SPEAKING_CUES = new Set(['NARRATOR', 'V.O.', 'O.S.', 'VOICE', 'INTERCOM', 'ANNOUNCER', 'TITLE']);

const DIALOGUE_STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'that', 'this', 'it',
  'in', 'on', 'at', 'to', 'of', 'and', 'or', 'but', 'not', 'with', 'by',
  'for', 'from', 'as', 'into', 'all', 'any', 'very', 'just', 'then', 'when',
  'who', 'what', 'where', 'how', 'if', 'so', 'its', 'their', 'them', 'they',
  'we', 'you', 'he', 'she', 'his', 'her', 'our', 'your', 'me', 'my', 'him',
  'us', 'no', 'yes', 'yeah', 'okay', 'sure', 'well',
]);

interface CharacterVoiceProfile {
  vocab: Set<string>;
  lineCount: number;
  wordCountsPerLine: number[];
}

/** Build per-character dialogue vocabulary profiles from fountain text. */
function buildCharacterVoiceProfiles(fountain: string): Map<string, CharacterVoiceProfile> {
  const lines = fountain.split('\n');
  const profiles = new Map<string, CharacterVoiceProfile>();
  let currentChar: string | null = null;
  let inDialogue = false;

  for (const line of lines) {
    const t = line.trim();

    if (!t) { currentChar = null; inDialogue = false; continue; }

    if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) {
      currentChar = null; inDialogue = false; continue;
    }

    // Parenthetical — skip but don't reset character context
    if (t.startsWith('(') && t.endsWith(')')) continue;

    // Character cue: ALL-CAPS, 3+ chars (strips extensions like "(V.O.)")
    if (/^[A-Z][A-Z0-9\s\-'\.]{2,}$/.test(t)) {
      const charName = t.replace(/\s*\(.*?\)\s*$/, '').trim();
      if (NON_SPEAKING_CUES.has(charName)) {
        currentChar = null; inDialogue = false;
      } else {
        currentChar = charName;
        inDialogue = true;
      }
      continue;
    }

    // Dialogue line (follows character cue or prior dialogue)
    if (inDialogue && currentChar) {
      let profile = profiles.get(currentChar);
      if (!profile) {
        profile = { vocab: new Set(), lineCount: 0, wordCountsPerLine: [] };
        profiles.set(currentChar, profile);
      }
      const words = t.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !DIALOGUE_STOPWORDS.has(w));
      for (const w of words) profile.vocab.add(w);
      profile.lineCount++;
      profile.wordCountsPerLine.push(t.split(/\s+/).filter(w => w.length > 0).length);
    } else {
      // Action line: reset dialogue context
      currentChar = null;
      inDialogue = false;
    }
  }

  return profiles;
}

/** Jaccard distance between two vocabulary sets (presence/absence). */
function vocabJaccardDist(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 1.0;
  const intersection = [...a].filter(w => b.has(w)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : 1 - intersection / union;
}

/** Population standard deviation of an array of numbers. */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** Jaccard distance between two frequency maps (as presence/absence) */
function jaccardDistance(a: Map<string, number>, b: Map<string, number>): number {
  // Dialogue-only scenes have no action vocabulary — return neutral 0.5 rather than 0
  // to avoid biasing the comparison toward "identical voice" when we have no data.
  if (a.size === 0 || b.size === 0) return 0.5;
  const setA = new Set(a.keys());
  const setB = new Set(b.keys());
  const intersection = [...setA].filter(w => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : 1 - intersection / union;
}

export async function voicePass(input: PassInput): Promise<PassResult> {
  const { fountain, records, approvedSpans } = input;
  const issues: RevisionIssue[] = [];

  const sceneFreqs = sceneWordFrequencies(fountain);
  const freqList = Array.from(sceneFreqs.entries());

  // ── Scene-level analysis (requires ≥3 scenes for meaningful comparison) ───
  if (freqList.length >= 3) {
    // Compute pairwise Jaccard distances for adjacent scenes
    const distances: number[] = [];
    for (let i = 1; i < freqList.length; i++) {
      const d = jaccardDistance(freqList[i - 1][1], freqList[i][1]);
      distances.push(d);
    }

    const avgDist = distances.reduce((s, v) => s + v, 0) / distances.length;

    // Large tonal jump between adjacent scenes
    for (let i = 0; i < distances.length; i++) {
      if (distances[i] > avgDist + 0.3 && distances[i] > 0.7) {
        const sceneNum = freqList[i + 1][0];
        const record = records[sceneNum];
        issues.push({
          location: `Scene ${sceneNum}${record ? ` (${record.slug})` : ''}`,
          rule: 'TONAL_WHIPLASH',
          description: `Scene ${sceneNum} has a very high lexical distance from Scene ${sceneNum - 1} (${Math.round(distances[i] * 100)}% divergence) — abrupt tonal shift`,
          severity: 'minor',
          suggestedFix: 'Add transitional language or bridging action to ease the shift between tones',
        });
      }
    }

    // All scenes have very similar vocabulary (no range)
    if (avgDist < 0.15 && freqList.length >= 5) {
      issues.push({
        location: 'Voice throughout',
        rule: 'VOICE_TOO_UNIFORM',
        description: `Lexical distance between all scenes is very low (avg ${Math.round(avgDist * 100)}%) — the voice is monotonous across all contexts`,
        severity: 'minor',
        suggestedFix: 'Vary the register between intimate scenes (simple vocabulary) and high-drama scenes (heightened language)',
      });
    }

    // Tonal consistency: prose register vs emotional valence (bidirectional)
    const elevatedWords = new Set(['beautiful', 'gorgeous', 'stunning', 'elegant', 'sublime', 'majestic', 'radiant', 'glorious', 'magnificent', 'serene', 'perfect', 'wonderful']);
    const grimWords = new Set(['dark', 'dead', 'death', 'blood', 'bleed', 'pain', 'suffer', 'wound', 'broken', 'shattered', 'destroyed', 'horrible', 'awful', 'dreadful', 'grim', 'bleak', 'gloomy', 'sinister', 'brutal', 'savage', 'violent', 'murder', 'corpse', 'dying', 'agony']);
    for (let i = 0; i < records.length && i < freqList.length; i++) {
      const record = records[i];
      const sceneFreq = freqList[i][1];
      const elevatedCount = [...elevatedWords].reduce((s, w) => s + (sceneFreq.get(w) ?? 0), 0);
      const grimCount = [...grimWords].reduce((s, w) => s + (sceneFreq.get(w) ?? 0), 0);
      if (record.emotionalShift === 'negative' && elevatedCount > 2) {
        issues.push({
          location: `Scene ${i} (${record.slug})`,
          rule: 'TONE_REGISTER_MISMATCH',
          description: `Scene ${i} has a negative emotional shift but the prose uses elevated/positive language (${elevatedCount} elevated words) — tone and affect are misaligned`,
          severity: 'minor',
          suggestedFix: 'Align the prose register with the scene\'s emotional valence',
        });
      } else if (record.emotionalShift === 'positive' && grimCount > 2) {
        issues.push({
          location: `Scene ${i} (${record.slug})`,
          rule: 'TONE_REGISTER_MISMATCH',
          description: `Scene ${i} has a positive emotional shift but the prose uses grim/dark language (${grimCount} grim words) — tone and affect are misaligned`,
          severity: 'minor',
          suggestedFix: 'Align the prose register with the scene\'s emotional valence',
        });
      }
    }
  }

  // ── Character voice distinctiveness ────────────────────────────────────────
  // UNDIFFERENTIATED_CHARACTER_VOICES: two major characters share too much vocabulary,
  // meaning they sound interchangeable. VOICE_MONOTONE_CHARACTER: a character's line
  // lengths never vary — robotic, template-like dialogue generation.
  const charProfiles = buildCharacterVoiceProfiles(fountain);
  // Only consider "major" characters with enough dialogue to compute a meaningful profile
  const majorChars = [...charProfiles.entries()].filter(
    ([, p]) => p.lineCount >= 5 && p.vocab.size >= 10,
  );

  if (majorChars.length >= 2 && issues.length < 6) {
    // Find the most similar pair of major characters
    let worstDist = 1.0;
    let worstPair: [string, string] | null = null;
    for (let i = 0; i < majorChars.length; i++) {
      for (let j = i + 1; j < majorChars.length; j++) {
        const [nameA, profA] = majorChars[i];
        const [nameB, profB] = majorChars[j];
        const dist = vocabJaccardDist(profA.vocab, profB.vocab);
        if (dist < worstDist) { worstDist = dist; worstPair = [nameA, nameB]; }
      }
    }
    if (worstPair && worstDist < 0.25) {
      const [nameA, nameB] = worstPair;
      issues.push({
        location: `${nameA} ↔ ${nameB}`,
        rule: 'UNDIFFERENTIATED_CHARACTER_VOICES',
        description:
          `${nameA} and ${nameB} share ${Math.round((1 - worstDist) * 100)}% vocabulary overlap ` +
          `(Jaccard distance ${worstDist.toFixed(2)}) — their voices are indistinguishable on the page`,
        severity: 'major',
        suggestedFix:
          `Give ${nameA} and ${nameB} distinct linguistic fingerprints: ` +
          `vary sentence length, cadence, and vocabulary register. ` +
          `One speaks in short declaratives; the other in longer, more conditional phrasing.`,
      });
    }
  }

  for (const [charName, profile] of majorChars) {
    if (profile.lineCount >= 10 && profile.wordCountsPerLine.length >= 10 && issues.length < 6) {
      const mean = profile.wordCountsPerLine.reduce((s, v) => s + v, 0) / profile.wordCountsPerLine.length;
      if (mean >= 5) {
        const cv = stdDev(profile.wordCountsPerLine) / mean;
        if (cv < 0.25) {
          issues.push({
            location: `Character: ${charName}`,
            rule: 'VOICE_MONOTONE_CHARACTER',
            description:
              `${charName} speaks in uniformly-sized lines (coefficient of variation ${cv.toFixed(2)}, ` +
              `avg ${mean.toFixed(1)} words) across ${profile.lineCount} lines — dialogue lacks rhythmic variety`,
            severity: 'minor',
            suggestedFix:
              `Give ${charName} more rhythmic range: very short reactions alongside longer speeches. ` +
              `Sentence length IS characterization — uniform length makes a character feel manufactured.`,
          });
          break; // one character per pass
        }
      }
    }
  }

  // ── Wave 146: Cliché density & subtext absence ──────────────────────────────

  // CLICHE_DENSITY: Overuse of generic/clichéd phrasing that dilutes authored voice.
  // Check for common screenplay clichés across the entire fountain text.
  const clichePhrases = new Map<string, number>([
    ['the room falls silent', 1], ['awkward silence', 1], ['they stare at each other', 1],
    ['long pause', 1], ['a beat', 1], ['moment passes', 1], ['tense moment', 1],
    ['no one moves', 1], ['suddenly', 0.5], ['all of a sudden', 0.5], ['just then', 0.5],
    ['she smiles', 0.5], ['he nods', 0.5], ['looks around', 0.5], ['glances around', 0.5],
    ['fade to black', 0.5], ['cut to', 0.5], ['dissolve to', 0.5],
  ]);

  const fountainLower = fountain.toLowerCase();
  let clicheCount = 0;
  for (const [phrase, weight] of clichePhrases) {
    const matches = (fountainLower.match(new RegExp(phrase, 'g')) || []).length;
    clicheCount += matches * weight;
  }

  const totalWords = fountain.split(/\s+/).length;
  const clicheRatio = clicheCount / Math.max(totalWords / 100, 1); // normalize by 100 words

  if (clicheRatio >= 3 && records.length >= 5) {
    issues.push({
      location: 'Screenplay voice',
      rule: 'CLICHE_DENSITY',
      description: `The screenplay contains ${Math.round(clicheCount)} clichéd phrases (${Math.round(clicheRatio * 10) / 10} per 100 words) — overuse of stock phrases dilutes authored voice`,
      severity: 'minor',
      suggestedFix: 'Replace generic descriptions with specific, original action that reveals character and world. Show silence through character reaction, not the phrase "awkward silence".',
    });
  }

  // SUBTEXT_ABSENCE: Characters state their intentions or emotions directly in
  // dialogue with no indirection or subtext. "I'm angry" instead of showing anger
  // through what they DON'T say.
  const directEmotionPhrases = new Set([
    'i\'m angry', 'i\'m sad', 'i\'m happy', 'i\'m afraid', 'i\'m scared',
    'i\'m in love', 'i hate', 'i love', 'i want', 'i need', 'i remember',
    'i think', 'i believe', 'i know', 'i feel', 'i\'m feeling', 'i\'m thinking',
    'you\'re right', 'you\'re wrong', 'we have a problem', 'this is important',
  ]);

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const dialogueLines = record.dialogueHighlights;
    if (dialogueLines.length < 3) continue; // skip if not enough dialogue

    let directCount = 0;
    for (const dialogue of dialogueLines) {
      const lower = dialogue.toLowerCase();
      for (const phrase of directEmotionPhrases) {
        if (lower.includes(phrase)) directCount++;
      }
    }

    if (directCount >= 3 && records.length >= 8) {
      issues.push({
        location: `Scene ${i} (${record.slug})`,
        rule: 'SUBTEXT_ABSENCE',
        description: `Scene ${i} has ${directCount} instances of direct emotional exposition (characters literally stating feelings/intentions) in ${dialogueLines.length} dialogue lines — lacks subtext and implication`,
        severity: 'major',
        suggestedFix: 'Rewrite dialogue to show emotions through indirection, humor, denial, or what\'s unsaid rather than explicit emotional statements',
      });
    }
  }

  // ── Wave 160: Passive voice, interior leak, qualifier overload ──────────────

  // Scan action lines from the fountain (separate from dialogue).
  const allLines = fountain.split('\n');
  const actionOnlyLines: string[] = [];
  let inDialogueBlock = false;
  for (const line of allLines) {
    const t = line.trim();
    if (!t) { inDialogueBlock = false; continue; }
    if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDialogueBlock = false; continue; }
    if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDialogueBlock = true; continue; }
    if (/^\(/.test(t)) continue; // parenthetical — stay in dialogue
    if (inDialogueBlock) continue; // dialogue line
    actionOnlyLines.push(t);
  }

  // PASSIVE_ACTION_VOICE: Action lines use passive voice constructions ("is heard",
  // "can be seen", "appears to be found") — passive voice drains the visual, declarative
  // energy that makes screenplay action come alive. Requires 10+ action lines and >15% rate.
  if (actionOnlyLines.length >= 10) {
    const passivePatterns = [
      /\bis heard\b/i, /\bcan be seen\b/i, /\bcan be heard\b/i, /\bwas seen\b/i,
      /\bwas heard\b/i, /\bare seen\b/i, /\bare heard\b/i, /\bis seen\b/i,
      /\bis found\b/i, /\bwas found\b/i, /\bwere found\b/i, /\bis felt\b/i,
      /\bcan be felt\b/i, /\bseems to be\b/i, /\bappears to be\b/i,
    ];
    const passiveLineCount = actionOnlyLines.filter(line =>
      passivePatterns.some(p => p.test(line)),
    ).length;
    const passiveRate = passiveLineCount / actionOnlyLines.length;
    if (passiveRate > 0.15) {
      issues.push({
        location: 'Action line prose',
        rule: 'PASSIVE_ACTION_VOICE',
        description: `${passiveLineCount} of ${actionOnlyLines.length} action lines (${Math.round(passiveRate * 100)}%) use passive constructions ("is heard", "can be seen", "appears to be") — passive voice drains cinematic energy and weakens directorial authority`,
        severity: 'major',
        suggestedFix: 'Rewrite passive constructions into active visual verbs: "A sound drifts in from the hallway" instead of "A sound is heard". Each action line should declare what the camera records.',
      });
    }
  }

  // INTERIOR_MONOLOGUE_LEAK: Action lines describe character psychology ("she wonders",
  // "he thinks about", "she realizes", "he remembers") — inner thought that the camera
  // cannot record. Screenplays must externalize psychology through action and behavior.
  // Requires 3+ thought-description action lines.
  if (actionOnlyLines.length >= 5) {
    const thoughtPatterns = [
      /\b(she|he|they)\s+wonders?\b/i, /\b(she|he|they)\s+thinks?\s+about\b/i,
      /\b(she|he|they)\s+realizes?\b/i, /\b(she|he|they)\s+remembers?\b/i,
      /\b(she|he|they)\s+feels?\s+(that|like|as if)\b/i,
      /\b(she|he|they)\s+knows?\s+(that|this|it|the)\b/i,
      /\b(she|he|they)\s+imagines?\b/i, /\b(she|he|they)\s+hopes?\s+(that|for|to)\b/i,
      /\b(she|he|they)\s+wishes?\b/i, /\b(she|he|they)\s+senses?\s+that\b/i,
    ];
    const leakLines = actionOnlyLines.filter(line =>
      thoughtPatterns.some(p => p.test(line)),
    );
    if (leakLines.length >= 3) {
      issues.push({
        location: 'Action line interiority',
        rule: 'INTERIOR_MONOLOGUE_LEAK',
        description: `${leakLines.length} action lines describe character psychology ("wonders", "realizes", "remembers") — the camera cannot record thought. These lines tell the reader about inner states instead of showing externalized behavior.`,
        severity: 'major',
        suggestedFix: 'Convert interior description to visible action: instead of "she realizes she\'s alone", write "She looks left, right. Nothing. She\'s alone." Let behavior carry the psychology.',
      });
    }
  }

  // QUALIFIER_OVERLOAD: Action lines overuse hedging qualifiers ("seems", "perhaps",
  // "maybe", "slightly", "somewhat", "sort of", "kind of") that drain declarative
  // cinematic authority. Screenplay action should assert, not hedge. If > 25% of
  // action lines contain qualifiers, the voice sounds uncertain. Requires 8+ action lines.
  if (actionOnlyLines.length >= 8) {
    const qualifierPattern = /\b(seems?|appears?|perhaps|maybe|possibly|slightly|somewhat|rather|quite|sort of|kind of|a bit|almost|nearly|barely|roughly|apparently|presumably)\b/i;
    const qualifierLineCount = actionOnlyLines.filter(l => qualifierPattern.test(l)).length;
    const qualifierRate = qualifierLineCount / actionOnlyLines.length;
    if (qualifierRate > 0.25) {
      issues.push({
        location: 'Action line authority',
        rule: 'QUALIFIER_OVERLOAD',
        description: `${qualifierLineCount} of ${actionOnlyLines.length} action lines (${Math.round(qualifierRate * 100)}%) use hedging qualifiers ("seems", "perhaps", "maybe", "sort of") — the prose sounds uncertain rather than visually declarative`,
        severity: 'minor',
        suggestedFix: 'Remove qualifiers from action lines: "He seems nervous" → "He tugs at his collar". Commit to what the camera sees — qualifiers are for uncertain narrators, not screenwriters.',
      });
    }
  }

  // ── Wave 173: Adverb crutch, filter words, exclamation overuse ──────────────

  // ADVERB_CRUTCH: Action lines lean on -ly manner adverbs ("walks slowly",
  // "turns quickly", "speaks softly") instead of strong, specific verbs. Adverbs
  // patch a weak verb rather than choosing a precise one. Distinct from
  // QUALIFIER_OVERLOAD (hedging words). Requires 8+ action lines and >30% rate.
  if (actionOnlyLines.length >= 8) {
    // -ly words that are not manner adverbs (nouns/adjectives ending in "ly")
    const adverbExclude = new Set([
      'only', 'family', 'early', 'ugly', 'holy', 'reply', 'supply', 'apply',
      'imply', 'rely', 'ally', 'rally', 'jelly', 'belly', 'silly', 'lonely',
      'lovely', 'likely', 'daily', 'weekly', 'monthly', 'yearly', 'friendly',
      'lively', 'elderly', 'orderly', 'homely', 'costly', 'curly', 'burly',
      'surly', 'july', 'assembly', 'anomaly', 'italy', 'comply', 'multiply',
    ]);
    const adverbLineCount = actionOnlyLines.filter(line => {
      const matches = line.toLowerCase().match(/\b[a-z]{3,}ly\b/g) || [];
      return matches.some(w => !adverbExclude.has(w));
    }).length;
    const adverbRate = adverbLineCount / actionOnlyLines.length;
    if (adverbRate > 0.3) {
      issues.push({
        location: 'Action line verbs',
        rule: 'ADVERB_CRUTCH',
        description: `${adverbLineCount} of ${actionOnlyLines.length} action lines (${Math.round(adverbRate * 100)}%) lean on -ly adverbs ("walks slowly", "speaks softly") — adverbs patch a weak verb instead of choosing a precise one`,
        severity: 'minor',
        suggestedFix: 'Replace verb+adverb pairs with one strong verb: "walks slowly" → "shuffles"; "speaks softly" → "murmurs". A specific verb does the work the adverb is apologizing for.',
      });
    }
  }

  // FILTER_WORD_OVERLOAD: Action lines route the image through a perceiving
  // character ("she sees the door open", "he watches her leave", "they notice
  // the smoke") instead of presenting the image directly. Filter words add a
  // layer of distance between the audience and the action. Distinct from
  // PASSIVE_ACTION_VOICE (passive constructions) and INTERIOR_MONOLOGUE_LEAK
  // (psychology). Requires 10+ action lines and >25% rate.
  if (actionOnlyLines.length >= 10) {
    const filterPattern = /\b(she|he|they|we|i)\s+(sees?|saw|watch(es|ed)?|look(s|ed)?\s+at|hears?|heard|notices?|noticed|observ(es|ed)|spots?|spotted|glimps(es|ed)|gazes?|stares?\s+at)\b/i;
    const filterLineCount = actionOnlyLines.filter(l => filterPattern.test(l)).length;
    const filterRate = filterLineCount / actionOnlyLines.length;
    if (filterRate > 0.25) {
      issues.push({
        location: 'Action line perspective',
        rule: 'FILTER_WORD_OVERLOAD',
        description: `${filterLineCount} of ${actionOnlyLines.length} action lines (${Math.round(filterRate * 100)}%) route the image through a character's perception ("she sees", "he watches", "they notice") — filter words distance the audience from the action`,
        severity: 'minor',
        suggestedFix: 'Cut the filter and show the image directly: "She sees the door swing open" → "The door swings open." The camera already implies whose POV it is; let the action land unmediated.',
      });
    }
  }

  // EXCLAMATION_OVERUSE: Dialogue leans on exclamation marks to manufacture
  // intensity. When too many lines shout, nothing reads as loud — the emotional
  // dynamic range flattens. Requires 10+ dialogue lines and >35% with "!".
  {
    const dialogueLines: string[] = [];
    let inDlg = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg = true; continue; }
      if (/^\(/.test(t)) continue; // parenthetical
      if (inDlg) dialogueLines.push(t);
    }
    if (dialogueLines.length >= 10) {
      const exclaimCount = dialogueLines.filter(l => l.includes('!')).length;
      const exclaimRate = exclaimCount / dialogueLines.length;
      if (exclaimRate > 0.35) {
        issues.push({
          location: 'Dialogue intensity',
          rule: 'EXCLAMATION_OVERUSE',
          description: `${exclaimCount} of ${dialogueLines.length} dialogue lines (${Math.round(exclaimRate * 100)}%) end on an exclamation — when most lines shout, none of them land. The emotional dynamic range collapses.`,
          severity: 'minor',
          suggestedFix: 'Reserve exclamation marks for genuine peaks. Let intensity come from word choice and context, not punctuation: a flat "Get out." can read louder than "Get out!"',
        });
      }
    }
  }

  // ── Wave 193: Pronoun opener excess, Act 2 tonal collapse, parenthetical excess ─

  // PRONOUN_OPENER_EXCESS: More than 40% of action lines begin with a third-person
  // pronoun (He, She, They, It). Pronoun-led sentences create referential ambiguity
  // (who is "he"?) and a mechanically uniform rhythm — the prose drums the same
  // subject-verb beat without relief. Requires 10+ action lines.
  if (actionOnlyLines.length >= 10) {
    const pronounStartRe = /^(he|she|they|it)\b/i;
    const pronounCount = actionOnlyLines.filter(l => pronounStartRe.test(l)).length;
    if (pronounCount / actionOnlyLines.length > 0.4) {
      issues.push({
        location: 'Action line openings',
        rule: 'PRONOUN_OPENER_EXCESS',
        severity: 'minor',
        description: `${pronounCount} of ${actionOnlyLines.length} action lines (${Math.round(pronounCount / actionOnlyLines.length * 100)}%) begin with a third-person pronoun ("He", "She", "They", "It") — referential ambiguity and rhythmic monotony result from pronoun-heavy openers.`,
        suggestedFix: 'Vary sentence openings: start some lines with the character name, some with the object or environment, some with a verb phrase. Let the camera choose the subject by varying what the line opens with.',
      });
    }
  }

  // TONAL_REGISTER_COLLAPSE_ACT2: All Act 2 scenes (25–75% of story) share the
  // same emotional register. The mid-story has no tonal variation between Act 2a
  // and Act 2b — characters exist in the same affective state for the entire
  // second act with no modulation. Distinct from VOICE_TOO_UNIFORM (whole story);
  // this catches a sag specifically in the middle. Requires 8+ records and 4+
  // Act 2 scenes.
  if (records.length >= 8) {
    const act2ToneStart = Math.floor(records.length * 0.25);
    const act2ToneEnd = Math.floor(records.length * 0.75);
    const act2Recs = records.slice(act2ToneStart, act2ToneEnd);
    if (act2Recs.length >= 4) {
      const act2Tones = new Set(act2Recs.map(r => r.emotionalShift));
      if (act2Tones.size === 1) {
        const [tone] = act2Tones;
        issues.push({
          location: `Act 2 (Scenes ${act2ToneStart}–${act2ToneEnd - 1})`,
          rule: 'TONAL_REGISTER_COLLAPSE_ACT2',
          severity: 'minor',
          description: `All ${act2Recs.length} Act 2 scenes carry the same emotional register ("${tone}") — the middle of the story has no tonal modulation. Act 2a and Act 2b blur into a single undifferentiated stretch.`,
          suggestedFix: 'Give Act 2 tonal shape: a moment of false hope or dark comedy in Act 2a, a turn toward crisis in Act 2b. The midpoint should feel like a register shift, not just a midpoint.',
        });
      }
    }
  }

  // PARENTHETICAL_EXCESS: More than 30% of dialogue character cues are immediately
  // followed by a parenthetical direction. Parentheticals over-direct actors —
  // they signal that the screenwriter doesn't trust their own dialogue to carry
  // tone. Requires 8+ character cues.
  {
    let charCueCount = 0;
    let parentheticalCount = 0;
    let awaitParenthetical = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { awaitParenthetical = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { awaitParenthetical = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) {
        charCueCount++;
        awaitParenthetical = true;
        continue;
      }
      if (awaitParenthetical && /^\(/.test(t)) {
        parentheticalCount++;
        awaitParenthetical = false;
        continue;
      }
      awaitParenthetical = false;
    }
    if (charCueCount >= 8 && parentheticalCount / charCueCount > 0.3) {
      issues.push({
        location: 'Dialogue parentheticals',
        rule: 'PARENTHETICAL_EXCESS',
        severity: 'minor',
        description: `${parentheticalCount} of ${charCueCount} dialogue cues (${Math.round(parentheticalCount / charCueCount * 100)}%) are followed by a parenthetical — over-directing actors signals the dialogue alone cannot carry its intended tone.`,
        suggestedFix: 'Remove parentheticals and rewrite the dialogue so the tone is evident from the words. Reserve parentheticals for genuine tonal ambiguity that the text alone cannot resolve.',
      });
    }
  }

  // ── Wave 202: Question overload, speech tag inflation, mono-speaker dominance ─

  // QUESTION_MARK_OVERLOAD: More than 35% of dialogue lines end with a question
  // mark. Characters that ask more than they declare stall the story in
  // interrogative mode — dramatic tension comes from assertion and commitment,
  // not circles of inquiry. Requires 10+ dialogue lines.
  {
    const qmDlgLines: string[] = [];
    let qmInDlg = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { qmInDlg = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { qmInDlg = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { qmInDlg = true; continue; }
      if (/^\(/.test(t)) continue;
      if (qmInDlg) { qmDlgLines.push(t); } else { qmInDlg = false; }
    }
    if (qmDlgLines.length >= 10) {
      const qCount = qmDlgLines.filter(l => l.endsWith('?')).length;
      if (qCount / qmDlgLines.length > 0.35) {
        issues.push({
          location: 'Dialogue',
          rule: 'QUESTION_MARK_OVERLOAD',
          severity: 'minor',
          description: `${qCount} of ${qmDlgLines.length} dialogue lines (${Math.round(qCount / qmDlgLines.length * 100)}%) end with a question — the script stalls in interrogative mode. Dramatic tension comes from assertion and commitment, not from circles of inquiry.`,
          suggestedFix: 'Convert most questions into declarative statements or provocative assertions. Characters who commit to positions create dramatic forward motion; characters who only ask stall it.',
        });
      }
    }
  }

  // SPEECH_TAG_INFLATION: More than 20% of action lines contain a speech-quality
  // verb ("whispered", "growled", "hissed", "shouted"). In screenplay, the
  // character cue + dialogue carries delivery — tagging the speech in action
  // smuggles a stage direction and wastes a line on an acting note rather than
  // a filmable image. Requires 8+ action lines.
  if (actionOnlyLines.length >= 8) {
    const speechTagRe = /\b(whispered?|growled?|hissed?|shouted?|barked?|snapped?|muttered?|bellowed?|scoffed?|sneered?|snarled?|yelped?|shrieked?|screeched?|drawled?|croaked?|stammered?)\b/i;
    const speechTagCount = actionOnlyLines.filter(l => speechTagRe.test(l)).length;
    if (speechTagCount / actionOnlyLines.length > 0.2) {
      issues.push({
        location: 'Action line speech tags',
        rule: 'SPEECH_TAG_INFLATION',
        severity: 'minor',
        description: `${speechTagCount} of ${actionOnlyLines.length} action lines (${Math.round(speechTagCount / actionOnlyLines.length * 100)}%) contain a speech-quality verb ("whispered", "growled", "hissed") — novel-habit direction that acts as an acting note instead of showing a filmable image.`,
        suggestedFix: 'Remove speech-quality tags from action lines. Let the dialogue do its work, or add a parenthetical if tone is genuinely ambiguous. Use the saved line for something the camera can record.',
      });
    }
  }

  // MONO_SPEAKER_DOMINANCE: A single character delivers more than 50% of all
  // dialogue lines when 3+ speaking characters are present. When one voice
  // monopolizes the script, all others become reactive instruments rather than
  // agents — the story collapses into a monologue with commentary.
  // Requires 15+ dialogue lines and 3+ characters.
  {
    const speakerCounts = new Map<string, number>();
    let msdInDlg = false;
    let msdChar = '';
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { msdInDlg = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { msdInDlg = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) {
        msdChar = t.replace(/\s*\(.*?\)\s*$/, '').trim();
        msdInDlg = true;
        continue;
      }
      if (/^\(/.test(t)) continue;
      if (msdInDlg && msdChar) {
        speakerCounts.set(msdChar, (speakerCounts.get(msdChar) ?? 0) + 1);
      } else { msdInDlg = false; }
    }
    const msdTotal = [...speakerCounts.values()].reduce((s, v) => s + v, 0);
    if (msdTotal >= 15 && speakerCounts.size >= 3) {
      for (const [char, count] of speakerCounts) {
        if (count / msdTotal > 0.5) {
          issues.push({
            location: `Character: ${char}`,
            rule: 'MONO_SPEAKER_DOMINANCE',
            severity: 'minor',
            description: `${char} delivers ${count} of ${msdTotal} dialogue lines (${Math.round(count / msdTotal * 100)}%) — one voice monopolizes the script with ${speakerCounts.size - 1} other character(s) reduced to reactive instruments.`,
            suggestedFix: `Redistribute dialogue so each major character has agency and a distinct function. ${char}'s dominance suggests others exist only to prompt ${char}'s speeches.`,
          });
          break;
        }
      }
    }
  }

  // ── Wave 224: SENTENCE_FRAGMENT_STARVATION ────────────────────────────────
  // Great screenplay action uses fragments — "The door. Open." — for rhythm and
  // urgency. If fewer than 4% of action lines are short declarative fragments
  // (≤ 4 words), the prose is verbose and non-cinematic: every sentence is a
  // complete clause, denying the reader the staccato rhythm that drives visual
  // energy. Requires 10+ action lines.
  if (actionOnlyLines.length >= 10) {
    const fragmentLines224 = actionOnlyLines.filter(l => {
      const words = l.trim().split(/\s+/).filter(w => w.length > 0);
      return words.length >= 1 && words.length <= 4 && !l.trim().endsWith('?');
    });
    const fragmentRate224 = fragmentLines224.length / actionOnlyLines.length;
    if (fragmentRate224 < 0.04) {
      issues.push({
        location: 'Action line rhythm',
        rule: 'SENTENCE_FRAGMENT_STARVATION',
        severity: 'minor',
        description: `Only ${fragmentLines224.length} of ${actionOnlyLines.length} action lines (${Math.round(fragmentRate224 * 100)}%) are short declarative fragments (≤ 4 words) — the prose has no staccato rhythm. Every sentence is a full clause; the urgency of fragment shots ("The door. Open. Silence.") is entirely absent.`,
        suggestedFix: `Introduce short declarative fragments at moments of tension, revelation, or visual punctuation. A two-word action line can carry more weight than a sentence: "Nothing moves." reads louder than "Nobody in the room is moving at all."`,
      });
    }
  }

  // ── Wave 224: SCENE_OPENER_CADENCE_LOCK ───────────────────────────────────
  // Every scene should announce itself differently. When more than 60% of scenes
  // open their first action line with the same syntactic type — all articles
  // ("The...", "A...") or all pronouns ("He...", "She...") — the script enters
  // each scene identically. This robs individual scenes of their own momentum
  // and makes the read feel mechanically assembled. Requires 8+ scenes.
  if (records.length >= 8) {
    const openerLines224: string[] = [];
    const fountainLines224 = fountain.split('\n');
    let inSceneOpener224 = false;
    for (const line of fountainLines224) {
      const t224 = line.trim();
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t224)) { inSceneOpener224 = true; continue; }
      if (!t224) continue;
      if (inSceneOpener224) {
        if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t224)) { inSceneOpener224 = false; continue; }
        openerLines224.push(t224);
        inSceneOpener224 = false;
      }
    }
    if (openerLines224.length >= 6) {
      const articleRe224 = /^(the|a|an)\b/i;
      const pronounRe224 = /^(he|she|they|it)\b/i;
      const articleCount224 = openerLines224.filter(l => articleRe224.test(l)).length;
      const pronounCount224 = openerLines224.filter(l => pronounRe224.test(l)).length;
      const articleRate224 = articleCount224 / openerLines224.length;
      const pronounRate224 = pronounCount224 / openerLines224.length;
      if (articleRate224 > 0.6 || pronounRate224 > 0.6) {
        const dominantType224 = articleRate224 >= pronounRate224
          ? 'article ("The...", "A...")'
          : 'pronoun ("He...", "She...", "They...")';
        const dominantCount224 = articleRate224 >= pronounRate224 ? articleCount224 : pronounCount224;
        issues.push({
          location: 'Scene openings',
          rule: 'SCENE_OPENER_CADENCE_LOCK',
          severity: 'minor',
          description: `${dominantCount224} of ${openerLines224.length} scene-opening action lines begin with an ${dominantType224} — every scene enters with the same syntactic cadence. The camera arrives identically each time, stripping each scene of its own momentum and urgency.`,
          suggestedFix: `Vary how scenes announce themselves: start some with an action verb ("Rain hammers the window."), some with an environment detail, some with a character name. The opening line of an action block is the scene's handshake with the reader — make each one distinct.`,
        });
      }
    }
  }

  // ── Wave 224: DIALOGUE_CADENCE_MONOCULTURE ────────────────────────────────
  // Voice is not just vocabulary — it is cadence. A character who speaks in
  // 3-word sentences sounds completely different from one who speaks in 15-word
  // ones. When all major characters converge on the same mean line-length, they
  // become indistinguishable by rhythm alone, even if their vocabulary differs.
  // Requires 3+ major characters (≥5 lines, ≥10 vocab words); fires when all
  // character means fall within a ±2.5-word band centered between 5–14 words.
  if (majorChars.length >= 3) {
    const means224 = majorChars.map(([name, p]) => {
      const mean = p.wordCountsPerLine.reduce((s, v) => s + v, 0) / Math.max(p.wordCountsPerLine.length, 1);
      return { name, mean };
    });
    const minMean224 = Math.min(...means224.map(m => m.mean));
    const maxMean224 = Math.max(...means224.map(m => m.mean));
    const bandCenter224 = (minMean224 + maxMean224) / 2;
    if (maxMean224 - minMean224 <= 2.5 && bandCenter224 >= 5 && bandCenter224 <= 14) {
      const summary224 = means224.map(m => `${m.name} (${m.mean.toFixed(1)} wpl)`).join(', ');
      issues.push({
        location: 'Character dialogue cadences',
        rule: 'DIALOGUE_CADENCE_MONOCULTURE',
        severity: 'minor',
        description: `All ${majorChars.length} major characters speak in nearly identical line-length cadences (${summary224}; spread: ${(maxMean224 - minMean224).toFixed(1)} words). No character is rhythmically short and punchy; none is long and ruminative — every voice occupies the same comfortable middle register.`,
        suggestedFix: `Give characters distinct speech rhythms: let one speak in short staccato bursts (3–5 words), another in longer sweeping sentences (10–15 words). Cadence is characterization — the tempo of how a person speaks is as distinctive as what they say.`,
      });
    }
  }

  // ── Wave 238: Negation saturation, conditional overload, dialogue flat punctuation ──

  // NEGATION_SATURATION (minor, ≥10 dialogue lines): More than 40% of dialogue
  // lines contain a negation word (no, not, never, can't, won't, don't, isn't,
  // aren't, etc.). Dialogue dominated by negation is dialogue dominated by refusal
  // — characters say no more than they say yes, orbiting around what they will
  // not do rather than what they want. Drama requires forward-reaching desire;
  // negation saturation creates a texture of blocked energy rather than driven
  // intent. Distinct from QUESTION_MARK_OVERLOAD (inquiry without commitment).
  {
    const negDlgLines238: string[] = [];
    let negInDlg238 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { negInDlg238 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { negInDlg238 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { negInDlg238 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (negInDlg238) negDlgLines238.push(t);
      else negInDlg238 = false;
    }
    if (negDlgLines238.length >= 10) {
      const negRe238 = /\b(no\b|not\b|never\b|can't|won't|don't|isn't|aren't|wasn't|weren't|couldn't|wouldn't|shouldn't|shan't|mustn't|nothing|nobody|nowhere|neither|nor)\b/i;
      const negCount238 = negDlgLines238.filter(l => negRe238.test(l)).length;
      if (negCount238 / negDlgLines238.length > 0.4) {
        issues.push({
          location: 'Dialogue negation density',
          rule: 'NEGATION_SATURATION',
          severity: 'minor',
          description: `${negCount238} of ${negDlgLines238.length} dialogue lines (${Math.round(negCount238 / negDlgLines238.length * 100)}%) contain a negation word ("no", "not", "never", "can't", "won't", etc.) — the dialogue is dominated by refusal. Characters spend more time denying than reaching toward desire. Drama requires forward-directed want, not denial orbits.`,
          suggestedFix: "Rebalance by converting negation lines to active desire: 'I won't go back' → 'I'm moving forward no matter what.' Refusal is dramatic only when it costs something; negation as default register is avoidance, not conflict.",
        });
      }
    }
  }

  // CONDITIONAL_OVERLOAD (minor, ≥8 action lines): More than 30% of action lines
  // contain a conditional construction ("if ", "unless ", "in case", "as long as",
  // "assuming"). Conditional action prose speculates instead of asserting — the
  // camera cannot film a hypothetical. Every "if" in an action line introduces a
  // subjunctive that undermines the declarative, present-tense certainty of
  // cinematic prose. Distinct from QUALIFIER_OVERLOAD (hedging adverbs) and
  // DECLARATIVE_PILE (absence of subordinating clauses in rhythm pass): this fires
  // when action lines are conditional hypotheticals rather than visual assertions.
  if (actionOnlyLines.length >= 8) {
    const conditionalRe238 = /\bif\s|\bunless\s|\bin case\b|\bas long as\b|\bassuming\b/i;
    const condCount238 = actionOnlyLines.filter(l => conditionalRe238.test(l)).length;
    if (condCount238 / actionOnlyLines.length > 0.3) {
      issues.push({
        location: 'Action line conditionality',
        rule: 'CONDITIONAL_OVERLOAD',
        severity: 'minor',
        description: `${condCount238} of ${actionOnlyLines.length} action lines (${Math.round(condCount238 / actionOnlyLines.length * 100)}%) contain a conditional construction ("if", "unless", "in case") — the camera cannot film hypotheticals. Conditional action lines introduce speculation where the prose should assert the visual present tense.`,
        suggestedFix: "Rewrite conditional action lines into declarations: 'If she moves, he'll know' → 'She freezes. He watches.' Commit to what is happening in the scene, not what might happen under conditions. Conditionals belong in dialogue, not action prose.",
      });
    }
  }

  // DIALOGUE_FLAT_PUNCTUATION (minor, ≥10 dialogue lines): More than 85% of
  // dialogue lines end with a period, while fewer than 5% end with ? and fewer
  // than 5% end with !. Uniformly period-terminated dialogue has no punctuation-
  // based tonal texture — all exchanges are flat declaratives with no questions
  // or exclamatory beats to vary the emotional pitch. Real conversation has
  // punctuation variety; bloodless prose uses periods by default.
  {
    const flatDlg238: string[] = [];
    let fpInDlg238 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { fpInDlg238 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { fpInDlg238 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { fpInDlg238 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (fpInDlg238) flatDlg238.push(t);
      else fpInDlg238 = false;
    }
    if (flatDlg238.length >= 10) {
      const periodCount238 = flatDlg238.filter(l => l.endsWith('.')).length;
      const questionCount238 = flatDlg238.filter(l => l.endsWith('?')).length;
      const exclaimCount238 = flatDlg238.filter(l => l.endsWith('!')).length;
      const periodRate238 = periodCount238 / flatDlg238.length;
      if (periodRate238 > 0.85 && questionCount238 / flatDlg238.length < 0.05 && exclaimCount238 / flatDlg238.length < 0.05) {
        issues.push({
          location: 'Dialogue punctuation texture',
          rule: 'DIALOGUE_FLAT_PUNCTUATION',
          severity: 'minor',
          description: `${periodCount238} of ${flatDlg238.length} dialogue lines (${Math.round(periodRate238 * 100)}%) end with a period, with only ${questionCount238} questions and ${exclaimCount238} exclamations — the dialogue is punctuationally flat. Uniformly period-terminated dialogue reads as scripted and bloodless; real conversation has tonal pitch variation.`,
          suggestedFix: `Introduce punctuation variety: convert some declarative responses to genuine questions, add exclamatory beats at moments of shock or urgency. Punctuation is the cadence of breath — uniform periods strip dialogue of its pulse. Even two or three questions per page change the register dramatically.`,
        });
      }
    }
  }

  // ── Wave 252: Present progressive overuse, action pronoun flood, monosyllable dominance ──

  // PRESENT_PROGRESSIVE_OVERUSE (minor, ≥8 action lines): More than 40% of action
  // lines use a present progressive construction ("is/are/was/were + -ing" verb).
  // "She is walking to the door." "He is looking out the window." The progressive
  // implies ongoing duration rather than decisive action — screenwriting prefers
  // "She walks to the door" for its directness and authority. Present progressive
  // in action is a prose-novel habit; it makes the screenplay feel like a long
  // description of a dream rather than a present-tense event unfolding.
  if (actionOnlyLines.length >= 8) {
    const progressiveRe252 = /\b(is|are|was|were|am)\s+\w+ing\b/i;
    const progCount252 = actionOnlyLines.filter(l => progressiveRe252.test(l)).length;
    if (progCount252 / actionOnlyLines.length > 0.4) {
      issues.push({
        location: 'Action line verb tense',
        rule: 'PRESENT_PROGRESSIVE_OVERUSE',
        severity: 'minor',
        description: `${progCount252} of ${actionOnlyLines.length} action lines (${Math.round(progCount252 / actionOnlyLines.length * 100)}%) use a present progressive construction ("is/are/was + -ing") — "She is walking" instead of "She walks." Progressive constructions imply ongoing duration; direct present tense asserts cinematic now.`,
        suggestedFix: 'Convert progressive to simple present: "He is running" → "He runs." "She is watching" → "She watches." The simple present is the natural verb form of screenplay action; it places the reader inside the scene happening, not observing it from a distance.',
      });
    }
  }

  // ACTION_PRONOUN_FLOOD (minor, ≥8 action lines): More than 55% of action lines
  // begin with a pronoun (he/she/they/it/we/you). OPENING_WORD_REPETITION in
  // rhythm.ts fires when >40% start with the SAME word — this fires when
  // a MIX of pronouns (he/she alternating) collectively dominates, still creating
  // a "pronoun parade" where characters are never named or described, just tracked
  // by gender marker. Names and physical descriptors carry more cinematic presence
  // than pronoun referents; pronoun-flooding makes the action feel anonymous.
  {
    const pronounStartRe252 = /^(he|she|they|it|we|you|him|her|them|his|their)\b/i;
    const pronounStartCount252 = actionOnlyLines.filter(l => pronounStartRe252.test(l)).length;
    if (actionOnlyLines.length >= 8 && pronounStartCount252 / actionOnlyLines.length > 0.55) {
      issues.push({
        location: 'Action line openings',
        rule: 'ACTION_PRONOUN_FLOOD',
        severity: 'minor',
        description: `${pronounStartCount252} of ${actionOnlyLines.length} action lines (${Math.round(pronounStartCount252 / actionOnlyLines.length * 100)}%) begin with a pronoun — the action is a pronoun parade ("he..., she..., they...") where characters are tracked by reference marker rather than presence. Pronoun-dominant action makes characters feel anonymous and interchangeable.`,
        suggestedFix: "Vary action openers: use character names, physical descriptors, or object-first sentences. \"He closes the door\" → \"MARTINEZ closes the door.\" or \"The door closes behind him.\" Names command attention; pronouns are invisible.",
      });
    }
  }

  // DIALOGUE_MONOSYLLABLE_DOMINANCE (minor, ≥10 dialogue lines): More than 65%
  // of all words across all dialogue lines are monosyllabic (1-3 letters). When
  // nearly every word has only one syllable, the dialogue register is tonally flat —
  // no polysyllabic words means no variety in verbal weight or register. Characters
  // all speak in short, punchy monosyllables; the dialogue loses the verbal texture
  // of varied word weight. Distinct from DIALOGUE_STACCATO_OVERUSE (which checks
  // line LENGTH) — this checks WORD-LEVEL syllable distribution.
  {
    const monoAllWords252: string[] = [];
    let monoInDlg252 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { monoInDlg252 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { monoInDlg252 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { monoInDlg252 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (monoInDlg252) {
        monoAllWords252.push(...t.split(/\s+/).filter(w => w.length > 0));
      } else {
        monoInDlg252 = false;
      }
    }
    const dlgLineCount252 = (() => {
      let count = 0; let inD = false;
      for (const line of allLines) {
        const t = line.trim();
        if (!t) { inD = false; continue; }
        if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inD = false; continue; }
        if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inD = true; continue; }
        if (/^\(/.test(t)) continue;
        if (inD) count++;
        else inD = false;
      }
      return count;
    })();
    if (dlgLineCount252 >= 10 && monoAllWords252.length >= 20) {
      const monoCount252 = monoAllWords252.filter(w => w.replace(/[^a-zA-Z]/g, '').length <= 3).length;
      if (monoCount252 / monoAllWords252.length > 0.65) {
        issues.push({
          location: 'Dialogue word-level texture',
          rule: 'DIALOGUE_MONOSYLLABLE_DOMINANCE',
          severity: 'minor',
          description: `${monoCount252} of ${monoAllWords252.length} dialogue words (${Math.round(monoCount252 / monoAllWords252.length * 100)}%) are monosyllabic — the dialogue's verbal texture is tonally flat. When almost every word has one syllable, conversation loses the weight variation that distinguishes heightened speech from casual talk.`,
          suggestedFix: "Introduce some polysyllabic vocabulary at key moments: a character who speaks with unexpected precision, a term that shows education or context. Even one or two longer words per exchange changes the verbal texture: 'That's bad' vs 'That's catastrophic.' Weight matters.",
        });
      }
    }
  }

  // ── Wave 266: Stative verb overload, dialogue hedging opener, abstract subject opening ──

  // STATIVE_VERB_OVERLOAD (minor, ≥8 action lines): More than 35% of action lines
  // begin with a stative verb ("is", "are", "was", "were", "stands", "sits", "lies",
  // "remains", "appears"). Stative-opening lines describe states rather than events —
  // "Stands at the window." vs "Crosses to the window." A stative-heavy pattern turns
  // action prose into tableau descriptions rather than present-tense unfolding. Distinct
  // from PASSIVE_ACTION_VOICE (passive constructions anywhere in the line) and
  // DECLARATIVE_PILE (grammatical structure).
  if (actionOnlyLines.length >= 8) {
    const stativeStartRe266 = /^(is|are|was|were|stands?|sits?|lies?|lays?|remains?|appears?|exists?|contains?|holds?|rests?|hangs?|leans?)\s/i;
    const stativeCount266 = actionOnlyLines.filter(l => stativeStartRe266.test(l.trim())).length;
    if (stativeCount266 / actionOnlyLines.length > 0.35) {
      issues.push({
        location: 'Action line openings',
        rule: 'STATIVE_VERB_OVERLOAD',
        severity: 'minor',
        description: `${stativeCount266} of ${actionOnlyLines.length} action lines (${Math.round(stativeCount266 / actionOnlyLines.length * 100)}%) open with a stative verb ("is", "was", "stands", "remains", etc.) — the action prose describes a series of states rather than events. Stative-opening lines produce tableau prose; screenplay action should show present-tense events unfolding.`,
        suggestedFix: "Convert stative openers to active events: 'Stands at the window' → 'Crosses to the window.' 'Was found in the alley' → 'The body lies in the alley, arms spread.' Replace state-descriptions with the action or image that carries the same information.",
      });
    }
  }

  // DIALOGUE_HEDGING_OPENER (minor, ≥10 dialogue lines): More than 25% of dialogue
  // lines begin with a hedging opener ("Well,", "I mean,", "Look,", "Listen,",
  // "Actually,", "Honestly,", "Basically,", "I guess,", "I suppose,"). Dialogue
  // that consistently opens with hedges pre-apologizes for its content before
  // delivering it — every utterance softens before it lands. Distinct from
  // NEGATION_SATURATION (refusal) and QUALIFIER_OVERLOAD (in action lines).
  {
    const hedgeDlgLines266: string[] = [];
    let hedgeDlgIn266 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { hedgeDlgIn266 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { hedgeDlgIn266 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { hedgeDlgIn266 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (hedgeDlgIn266) hedgeDlgLines266.push(t);
      else hedgeDlgIn266 = false;
    }
    if (hedgeDlgLines266.length >= 10) {
      const hedgeRe266 = /^(well[,\s]|i mean[,\s]|look[,\s]|listen[,\s]|actually[,\s]|honestly[,\s]|basically[,\s]|you know[,\s]|the thing is[,\s]|i just[,\s]|i guess[,\s]|i suppose[,\s])/i;
      const hedgeCount266 = hedgeDlgLines266.filter(l => hedgeRe266.test(l)).length;
      if (hedgeCount266 / hedgeDlgLines266.length > 0.25) {
        issues.push({
          location: 'Dialogue openers',
          rule: 'DIALOGUE_HEDGING_OPENER',
          severity: 'minor',
          description: `${hedgeCount266} of ${hedgeDlgLines266.length} dialogue lines (${Math.round(hedgeCount266 / hedgeDlgLines266.length * 100)}%) begin with a hedging opener ("Well,", "Actually,", "I mean,", "Look,", "I guess,") — every utterance is pre-apologized before it lands. Characters who habitually hedge lack the declarative force of committed speech; their words slide past the audience rather than landing.`,
          suggestedFix: "Cut the hedges and begin dialogue at its point: 'Well, I think maybe you should go' → 'Leave.' Hedging openers are filler — they signal a character apologizing for their content before delivering it. Committed characters begin with their position, not their hesitation.",
        });
      }
    }
  }

  // ABSTRACT_SUBJECT_OPENING (minor, ≥8 action lines): More than 30% of action
  // lines open with an abstract noun as subject ("Silence fills the room.",
  // "Fear grips them.", "Tension builds.", "Time passes."). Abstract subjects
  // weaken cinematic prose — the camera captures objects and actions, not named
  // states or emotions. Distinct from INTERIOR_MONOLOGUE_LEAK (character
  // psychology) and the rhythm pass's ABSTRACT_NOUN_OVERLOAD (anywhere in line).
  if (actionOnlyLines.length >= 8) {
    const abstractSubjectRe266 = /^(silence|tension|fear|time|anxiety|grief|sadness|darkness|chaos|love|hate|anger|despair|hope|joy|doubt|confusion|emotion|mood|sorrow|longing|memory|guilt|shame|dread|bitterness|wonder|regret|peace|calm)\b/i;
    const abstractSubjectCount266 = actionOnlyLines.filter(l => abstractSubjectRe266.test(l.trim())).length;
    if (abstractSubjectCount266 / actionOnlyLines.length > 0.3) {
      issues.push({
        location: 'Action line subjects',
        rule: 'ABSTRACT_SUBJECT_OPENING',
        severity: 'minor',
        description: `${abstractSubjectCount266} of ${actionOnlyLines.length} action lines (${Math.round(abstractSubjectCount266 / actionOnlyLines.length * 100)}%) open with an abstract noun subject ("Silence fills...", "Fear grips...", "Tension builds...") — the screenplay names emotional and temporal states instead of showing what creates them. The camera cannot record silence or tension directly; it can only record what silence and tension look like.`,
        suggestedFix: "Replace abstract subjects with concrete ones: 'Silence fills the room' → 'Nobody speaks. Nobody moves.' 'Tension builds' → 'ALICE grips the table edge.' Give the camera a person, an object, or an action — not a named state.",
      });
    }
  }

  // ── Wave 280: Intensifier flood, monochrome verbs, scene heading repetition ──

  // INTENSIFIER_FLOOD (minor, ≥8 dialogue lines): More than 30% of dialogue lines
  // contain an intensifier adverb ("really", "very", "totally", "absolutely",
  // "literally", "extremely", "incredibly", etc.). Dialogue loaded with intensifiers
  // performs emotion through amplification rather than precise word choice — the adverb
  // signals that the noun or adjective it modifies is not the right word. Characters who
  // say "really angry" instead of "furious" are telling the audience how to feel rather
  // than choosing language precise enough to generate that feeling independently.
  {
    const intensDlgLines280: string[] = [];
    let intensInDlg280 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { intensInDlg280 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { intensInDlg280 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { intensInDlg280 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (intensInDlg280) intensDlgLines280.push(t);
      else intensInDlg280 = false;
    }
    if (intensDlgLines280.length >= 8) {
      const intensRe280 = /\b(really|very|totally|absolutely|literally|extremely|incredibly|terribly|awfully|insanely|ridiculously)\b/i;
      const intensCount280 = intensDlgLines280.filter(l => intensRe280.test(l)).length;
      if (intensCount280 / intensDlgLines280.length > 0.3) {
        issues.push({
          location: 'Dialogue',
          rule: 'INTENSIFIER_FLOOD',
          severity: 'minor',
          description: `${intensCount280} of ${intensDlgLines280.length} dialogue lines (${Math.round(intensCount280 / intensDlgLines280.length * 100)}%) contain an intensifier adverb ("really", "very", "absolutely", "literally", "extremely") — the dialogue performs emotion through amplification rather than specific, charged language. An intensifier always signals that the word it modifies is not precise enough.`,
          suggestedFix: `Remove intensifiers and find the precise word: "really angry" → "furious"; "very scared" → "terrified"; "absolutely certain" → "certain." The right noun or adjective never needs reinforcement; when you reach for an intensifier, reach for a better word instead.`,
        });
      }
    }
  }

  // MONOCHROME_VERBS (minor, ≥12 action lines): A single common action verb appears
  // in more than 25% of all action lines. When one verb dominates the action prose
  // ("walks", "moves", "looks", "turns"), every action reads identically — the screenplay
  // loses the specificity that makes individual movements cinematic and characterizing.
  // Distinct from ADVERB_CRUTCH (adverbs patching weak verbs) and VOICE_TOO_UNIFORM
  // (scene-level lexical similarity): this fires on verb-level repetition across the
  // whole script.
  if (actionOnlyLines.length >= 12) {
    const commonVerbList280 = ['walk', 'move', 'look', 'turn', 'run', 'cross', 'open', 'close', 'reach', 'pull', 'grab', 'take', 'get', 'go', 'come', 'sit', 'stand', 'enter', 'leave', 'pick'];
    const verbLineCounts280 = new Map<string, number>();
    for (const verb280 of commonVerbList280) {
      const verbRe280 = new RegExp(`\\b${verb280}s?\\b`, 'i');
      const cnt280 = actionOnlyLines.filter(l => verbRe280.test(l)).length;
      if (cnt280 > 0) verbLineCounts280.set(verb280, cnt280);
    }
    if (verbLineCounts280.size > 0) {
      const maxVerbCount280 = Math.max(...verbLineCounts280.values());
      if (maxVerbCount280 / actionOnlyLines.length > 0.25) {
        const topVerb280 = [...verbLineCounts280.entries()].sort((a, b) => b[1] - a[1])[0][0];
        issues.push({
          location: 'Action line verbs',
          rule: 'MONOCHROME_VERBS',
          severity: 'minor',
          description: `The verb "${topVerb280}" (and its inflected forms) appears in ${maxVerbCount280} of ${actionOnlyLines.length} action lines (${Math.round(maxVerbCount280 / actionOnlyLines.length * 100)}%) — the screenplay's action vocabulary is impoverished. When a single verb dominates, every movement reads identically; the prose loses the specificity that makes individual actions cinematic and characterizing.`,
          suggestedFix: `Replace repetitions of "${topVerb280}" with precise, varied verbs suited to each character and moment: "walks" could be "saunters", "marches", "shuffles", "strides", or "trudges" depending on emotional state. Each action verb is a miniature characterization; when all actions share the same word, all characters move as one.`,
        });
      }
    }
  }

  // SCENE_HEADING_REPETITION (minor, ≥8 records): More than 60% of scene headings
  // reference the same location. When a single location dominates the scene headings,
  // the screenplay's visual universe is restricted — the story never leaves the same
  // room. Cinema uses spatial variety to modulate pace, atmosphere, and power dynamics;
  // a screenplay confined to one location signals a limited visual imagination or a
  // stage play adapted without cinematographic thinking. Distinct from TONAL_WHIPLASH
  // (too much variety) and VOICE_TOO_UNIFORM (lexical sameness): this tracks physical
  // location variety as a dimension of cinematic voice.
  if (records.length >= 8) {
    const locationCounts280 = new Map<string, number>();
    for (const r of records) {
      const locMatch280 = r.slug.match(/^(?:INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s+([^-]+)/i);
      if (locMatch280) {
        const loc280 = locMatch280[1].trim().toUpperCase();
        locationCounts280.set(loc280, (locationCounts280.get(loc280) ?? 0) + 1);
      }
    }
    if (locationCounts280.size > 0) {
      const maxLocCount280 = Math.max(...locationCounts280.values());
      if (maxLocCount280 / records.length > 0.6) {
        const topLoc280 = [...locationCounts280.entries()].sort((a, b) => b[1] - a[1])[0][0];
        issues.push({
          location: 'Scene headings',
          rule: 'SCENE_HEADING_REPETITION',
          severity: 'minor',
          description: `${maxLocCount280} of ${records.length} scenes (${Math.round(maxLocCount280 / records.length * 100)}%) are set in "${topLoc280}" — the screenplay's visual universe is restricted to a single dominant location. Cinema uses spatial variety to modulate pace, atmosphere, and the physical expression of power; a story that never leaves one room forfeits these tools.`,
          suggestedFix: `Introduce more physical locations or significantly differentiate revisits to "${topLoc280}" through time-of-day, staging, or set condition. Even minor spatial changes (INT. OFFICE vs INT. HALLWAY OUTSIDE OFFICE) expand the visual vocabulary. If the single-location constraint is intentional (bottle episode), ensure the staging varies enough to create spatial rhythm.`,
        });
      }
    }
  }

  // ── Wave 294: DIALOGUE_INTERROGATIVE_SATURATION ──────────────────────────
  // More than 30% of dialogue lines end with a question mark. When characters
  // ask questions constantly, the story's dialogue becomes a cross-examination
  // rather than a confrontation or declaration. Questions are dramatically
  // passive — they defer to the other character. A dialogue dominated by
  // questions has no one taking a stand. Requires 10+ dialogue lines.
  {
    const intDlgLines294: string[] = [];
    let intInDlg294 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { intInDlg294 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { intInDlg294 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { intInDlg294 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (intInDlg294) intDlgLines294.push(t);
      else intInDlg294 = false;
    }
    if (intDlgLines294.length >= 10) {
      const qCount294 = intDlgLines294.filter(l => l.trim().endsWith('?')).length;
      if (qCount294 / intDlgLines294.length > 0.30) {
        issues.push({
          location: 'Dialogue interrogatives',
          rule: 'DIALOGUE_INTERROGATIVE_SATURATION',
          severity: 'minor',
          description: `${qCount294} of ${intDlgLines294.length} dialogue lines (${Math.round(qCount294 / intDlgLines294.length * 100)}%) end with a question mark — the dialogue is dominated by interrogation. Characters who only ask questions never take positions; dialogue without declarations, demands, or confrontations reads as evasive and passive.`,
          suggestedFix: 'Replace questions with declarations, demands, or challenges: "What are you doing here?" → "You shouldn\'t be here." Questions are postponements; statements are stakes. Reserve questions for moments of genuine vulnerability — a character who only questions never reveals what they want.',
        });
      }
    }
  }

  // ── Wave 294: ACTION_ADVERB_FLOOD ────────────────────────────────────────
  // More than 25% of action lines contain an adverb immediately before or
  // after the main verb ("slowly walks", "quickly turns", "silently crosses").
  // Action adverbs patch weak verbs: "slowly walks" is "shuffles";
  // "quickly turns" is "spins". A flood of action adverbs indicates a verb
  // vocabulary problem — the writer is modifying common verbs rather than
  // selecting precise ones. Requires 8+ action lines.
  if (actionOnlyLines.length >= 8) {
    const actionAdverbRe294 = /\b(slowly|quickly|quietly|silently|suddenly|carefully|gently|roughly|softly|harshly|briefly|sharply|firmly|nervously|anxiously|angrily|calmly|rapidly|heavily|lightly)\b/i;
    const actionAdverbCount294 = actionOnlyLines.filter(l => actionAdverbRe294.test(l)).length;
    if (actionAdverbCount294 / actionOnlyLines.length > 0.25) {
      issues.push({
        location: 'Action line adverbs',
        rule: 'ACTION_ADVERB_FLOOD',
        severity: 'minor',
        description: `${actionAdverbCount294} of ${actionOnlyLines.length} action lines (${Math.round(actionAdverbCount294 / actionOnlyLines.length * 100)}%) contain manner adverbs ("slowly", "quietly", "suddenly", "carefully"). Adverbs patch imprecise verbs — "walks slowly" should be "shuffles"; "turns quickly" should be "spins". An adverb flood signals weak verb vocabulary.`,
        suggestedFix: 'For each adverb-modified verb pair, find the single precise verb: "silently crosses" → "slips", "roughly grabs" → "seizes", "carefully opens" → "eases open". The right verb never needs an adverb. When you reach for a manner adverb, you have not yet found the right verb.',
      });
    }
  }

  // ── Wave 294: CHARACTER_NAME_MONOTONY ────────────────────────────────────
  // A single character name appears in more than 50% of all action lines.
  // The screenplay is written from the perspective of one character who
  // physically dominates every action beat — other characters become props
  // in their own scenes. Even in a single-protagonist story, not every action
  // line needs to name the protagonist. Action without a named subject creates
  // cinematic space and lets the environment become a character. Requires 12+
  // action lines.
  if (actionOnlyLines.length >= 12) {
    const nameLineMap294 = new Map<string, number>();
    for (const l of actionOnlyLines) {
      const words294 = l.trim().split(/\s+/);
      const firstWord294 = words294[0]?.replace(/[^a-zA-Z]/g, '');
      if (firstWord294 && firstWord294.length > 1 && /^[A-Z]/.test(firstWord294)) {
        nameLineMap294.set(firstWord294, (nameLineMap294.get(firstWord294) ?? 0) + 1);
      }
    }
    if (nameLineMap294.size > 0) {
      const maxNameCount294 = Math.max(...nameLineMap294.values());
      if (maxNameCount294 / actionOnlyLines.length > 0.50) {
        const topName294 = [...nameLineMap294.entries()].sort((a, b) => b[1] - a[1])[0][0];
        issues.push({
          location: 'Action line subjects',
          rule: 'CHARACTER_NAME_MONOTONY',
          severity: 'minor',
          description: `"${topName294}" opens ${maxNameCount294} of ${actionOnlyLines.length} action lines (${Math.round(maxNameCount294 / actionOnlyLines.length * 100)}%) — one character name dominates the action prose. When every action begins with the same name, supporting characters become props and the physical world disappears. A screenplay is a camera, not a POV diary.`,
          suggestedFix: `Vary action subjects: use the environment, objects, and other characters as the grammatical subjects of action lines. "The door opens" instead of "${topName294} opens the door"; "Silence fills the room" instead of "${topName294} stands in silence". Distributing action subjects creates spatial depth and cinematic rhythm.`,
        });
      }
    }
  }

  // ── Wave 308: dialogue length uniformity, dash interruption flood, shout caps ──
  {
    const dlg308: string[] = [];
    let inDlg308 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg308 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg308 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg308 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg308) dlg308.push(t);
      else inDlg308 = false;
    }

    // DIALOGUE_LENGTH_UNIFORMITY (minor, ≥12 dialogue lines): More than 70% of
    // dialogue lines fall within a 3-word band (±1 word of a common length) —
    // every speech is essentially the same size. Distinct from DIALOGUE_CADENCE_
    // MONOCULTURE (per-character mean convergence): this audits the line-level
    // length distribution across the whole script, and fires even in a
    // single-character piece. Speech-length variation is a primary tool of
    // rhythm and characterization; its absence flattens every exchange.
    if (dlg308.length >= 12) {
      const wc308 = dlg308.map(l => l.split(/\s+/).filter(Boolean).length);
      let bestBand308 = 0;
      for (const c of new Set(wc308)) {
        const inBand = wc308.filter(w => Math.abs(w - c) <= 1).length;
        if (inBand > bestBand308) bestBand308 = inBand;
      }
      if (bestBand308 / dlg308.length > 0.7) {
        issues.push({
          location: 'Dialogue line lengths',
          rule: 'DIALOGUE_LENGTH_UNIFORMITY',
          severity: 'minor',
          description: `${bestBand308} of ${dlg308.length} dialogue lines (${Math.round(bestBand308 / dlg308.length * 100)}%) fall within a 3-word length band — nearly every speech is the same size. Speech-length variation is a primary tool of rhythm and characterization; when every line runs the same length, the dialogue acquires a metronomic sameness and no character's verbal tempo stands out.`,
          suggestedFix: 'Vary speech lengths deliberately: let a clipped one-word retort sit against a character\'s rambling justification, or break a long speech with a terse interruption. The contrast between a long line and a short one is where rhythm — and character — lives.',
        });
      }
    }

    // DIALOGUE_DASH_INTERRUPTION_FLOOD (minor, ≥10 dialogue lines): More than 30%
    // of dialogue lines contain an em-dash (or double hyphen) — the characters
    // constantly interrupt themselves or each other. One dash sharpens a beat;
    // a flood of them turns every exchange into a pile-up of broken sentences and
    // signals the writer reaching for the same interruption device repeatedly.
    // Distinct from rhythm's DASH_CHAIN (action lines ending on a dash).
    if (dlg308.length >= 10) {
      const dashCount308 = dlg308.filter(l => /(—|--)/.test(l)).length;
      if (dashCount308 / dlg308.length > 0.3) {
        issues.push({
          location: 'Dialogue interruption dashes',
          rule: 'DIALOGUE_DASH_INTERRUPTION_FLOOD',
          severity: 'minor',
          description: `${dashCount308} of ${dlg308.length} dialogue lines (${Math.round(dashCount308 / dlg308.length * 100)}%) contain an interruption dash. One dash sharpens a moment of cut-off or self-correction; a flood of them turns every exchange into a pile-up of broken sentences, and the device stops signaling anything because it never stops happening.`,
          suggestedFix: 'Reserve the interruption dash for genuine overlaps and cut-offs that the drama requires, and let most lines complete. If characters are meant to talk over each other constantly, find other ways to show it — overlapping content, non-answers — so the dash regains its force when it does appear.',
        });
      }
    }

    // DIALOGUE_SHOUT_CAPS (minor, ≥3 shout lines): Three or more dialogue lines
    // contain a shouted ALL-CAPS word ("Get OUT of here"). Caps-shouting is a
    // blunt substitute for dialogue that conveys intensity through word choice and
    // context; recurring caps in speech reads as the script yelling at the reader.
    // Distinct from originality's CAPS_EMPHASIS_OVERUSE (caps in action lines).
    {
      const shoutLines308 = dlg308.filter(l => /\b[A-Z]{3,}\b/.test(l));
      if (shoutLines308.length >= 3) {
        issues.push({
          location: 'Dialogue ALL-CAPS shouting',
          rule: 'DIALOGUE_SHOUT_CAPS',
          severity: 'minor',
          description: `${shoutLines308.length} dialogue lines contain a shouted ALL-CAPS word. Caps-shouting is a blunt substitute for intensity that the words and context should carry on their own; recurring caps in speech reads as the script yelling at the reader rather than trusting the scene to land its own force.`,
          suggestedFix: 'Strip the caps and build intensity through the line itself — sharper word choice, a harder beat, an action line that shows the volume ("Her voice cracks the room"). If emphasis is essential, italics on a single word do the job once; caps used repeatedly just flatten into noise.',
        });
      }
    }
  }

  // ── Wave 322: trailing ellipsis flood, repeated opener word, conjunction opener ──
  {
    const dlg322: string[] = [];
    let inDlg322 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg322 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg322 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg322 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg322) dlg322.push(t);
      else inDlg322 = false;
    }

    // DIALOGUE_TRAILING_ELLIPSIS_FLOOD (minor, ≥10 dialogue lines): More than 25%
    // of dialogue lines trail off with an ellipsis ("I don't know...", "Maybe
    // we should..."). One trailing ellipsis lands a moment of hesitation or a
    // thought left hanging; a flood of them makes every character perpetually
    // unable to finish a sentence, draining dialogue of declarative force.
    // Distinct from DIALOGUE_DASH_INTERRUPTION_FLOOD (em-dash cut-offs — an
    // external interruption) and the rhythm/originality ellipsis checks (action
    // lines): this audits dialogue lines that trail off into silence.
    if (dlg322.length >= 10) {
      const ellipsisCount322 = dlg322.filter(l => /(\.\.\.|…)\s*$/.test(l.trim())).length;
      if (ellipsisCount322 / dlg322.length > 0.25) {
        issues.push({
          location: 'Dialogue trailing ellipses',
          rule: 'DIALOGUE_TRAILING_ELLIPSIS_FLOOD',
          severity: 'minor',
          description: `${ellipsisCount322} of ${dlg322.length} dialogue lines (${Math.round(ellipsisCount322 / dlg322.length * 100)}%) trail off with an ellipsis. One trailing ellipsis lands a hesitation or a thought left hanging; a flood of them makes every character perpetually unable to finish a sentence. The device stops signaling uncertainty because it never stops appearing, and the dialogue loses all declarative force.`,
          suggestedFix: 'Let most lines land their full stop. Reserve the trailing ellipsis for the rare moment a character genuinely cannot or will not finish — and convey hesitation elsewhere through content (a non-answer, a deflection, a subject change) so the silence carries weight when it does come.',
        });
      }
    }

    // DIALOGUE_REPEATED_OPENER_WORD (minor, ≥12 dialogue lines): A single word
    // begins more than 40% of all dialogue lines — every other line opens the
    // same way. Distinct from DIALOGUE_HEDGING_OPENER (a category of hedging
    // phrases) and the action-line opener checks: this is the dialogue analogue
    // of repeated sentence openings, catching a verbal tic ("You... You...
    // You...") that flattens the rhythm of every exchange regardless of which
    // word it is.
    if (dlg322.length >= 12) {
      const firstWords322 = new Map<string, number>();
      for (const l of dlg322) {
        const w = (l.trim().split(/\s+/)[0] ?? '').toLowerCase().replace(/[^a-z']/g, '');
        if (w) firstWords322.set(w, (firstWords322.get(w) ?? 0) + 1);
      }
      const [topWord322, topCount322] = [...firstWords322.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['', 0];
      if (topCount322 / dlg322.length > 0.4) {
        issues.push({
          location: 'Dialogue line openers',
          rule: 'DIALOGUE_REPEATED_OPENER_WORD',
          severity: 'minor',
          description: `${topCount322} of ${dlg322.length} dialogue lines (${Math.round(topCount322 / dlg322.length * 100)}%) begin with "${topWord322}" — nearly every other line opens the same way. A single dominant opener word gives the dialogue a metronomic sameness; the audience starts hearing the pattern instead of the meaning, and no character's verbal entry point stands out from another's.`,
          suggestedFix: `Vary how lines begin: a question, a name, an objection, a concrete noun. When most lines start with "${topWord322}", characters all share one verbal reflex — break it so each speaker can enter a line from their own angle.`,
        });
      }
    }

    // DIALOGUE_CONJUNCTION_OPENER (minor, ≥10 dialogue lines): More than 30% of
    // dialogue lines begin with a coordinating conjunction ("And...", "But...",
    // "So...", "Or...", "Because..."). Conjunction openers chain speech to what
    // came before; in excess they make every line a continuation, so dialogue
    // reads as one unbroken run-on rather than distinct, weighed statements.
    // Distinct from DIALOGUE_HEDGING_OPENER (hedging phrases) and the action-line
    // conjunction checks in rhythm/originality: this audits dialogue specifically.
    if (dlg322.length >= 10) {
      const conjRe322 = /^(and|but|so|or|because|yet|nor)\b/i;
      const conjCount322 = dlg322.filter(l => conjRe322.test(l.trim())).length;
      if (conjCount322 / dlg322.length > 0.3) {
        issues.push({
          location: 'Dialogue conjunction openers',
          rule: 'DIALOGUE_CONJUNCTION_OPENER',
          severity: 'minor',
          description: `${conjCount322} of ${dlg322.length} dialogue lines (${Math.round(conjCount322 / dlg322.length * 100)}%) begin with a coordinating conjunction ("And", "But", "So", "Because"). Conjunction openers chain each line to the last; in excess they make every utterance a continuation rather than a distinct statement, and the dialogue reads as one unbroken run-on instead of weighed, separable beats.`,
          suggestedFix: 'Let most lines stand on their own. A conjunction opener can carry momentum at a key moment, but when most lines begin with one, the speech never lands a clean declarative beat. Start more lines with their actual subject so each statement carries its own weight.',
        });
      }
    }
  }

  // ── Wave 333: DIALOGUE_NAME_OPENER_FLOOD, DIALOGUE_RETROSPECTIVE_OPENER, DIALOGUE_WORD_STUTTER ──
  {
    const dlg333: string[] = [];
    let inDlg333 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg333 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg333 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg333 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg333) dlg333.push(t);
      else inDlg333 = false;
    }

    // DIALOGUE_NAME_OPENER_FLOOD (minor, ≥10 dialogue lines): More than 30% of
    // dialogue lines begin with direct address — a capitalized word followed by a
    // comma that is not a common conjunction, adverb, or article (e.g., "John, I",
    // "Mary, please", "Frank, you need to"). TV-habit overuse of direct address in
    // dialogue reads as expository; when most lines open by naming the person being
    // addressed, the script is manufacturing artificial intimacy. Distinct from
    // DIALOGUE_REPEATED_OPENER_WORD (one specific word >40%) and DIALOGUE_HEDGING_OPENER
    // (hedging phrases, not proper-name address).
    if (dlg333.length >= 10) {
      const NON_NAME_WORDS333 = new Set([
        'i','he','she','we','they','it','you','and','but','or','so','yet','nor',
        'the','a','an','in','on','at','to','for','with','by','from','of','about',
        'well','actually','honestly','basically','never','always','sometimes','maybe',
        'look','listen','wait','yes','no','please','sure','right','okay','fine','now',
        'what','where','when','who','why','how','which','if','that','this','these',
        'yesterday','today','tomorrow','then','before','after','anyway','still','just',
        'here','there','until','while','once','then','meanwhile','sorry','thanks',
      ]);
      const nameRe333 = /^([A-Z][a-z]{0,14}),\s/;
      const nameCount333 = dlg333.filter(l => {
        const m = nameRe333.exec(l.trim());
        return m !== null && !NON_NAME_WORDS333.has(m[1].toLowerCase());
      }).length;
      if (nameCount333 / dlg333.length > 0.30) {
        issues.push({
          location: 'Dialogue direct-address openers',
          rule: 'DIALOGUE_NAME_OPENER_FLOOD',
          severity: 'minor',
          description: `${nameCount333} of ${dlg333.length} dialogue lines (${Math.round(nameCount333 / dlg333.length * 100)}%) begin with direct character address ("John, I...", "Mary, you..."). Overuse of name-first address makes dialogue feel artificially intimate and expository — real conversational speech rarely prefaces statements with the listener's name. When most lines open this way, the dialogue loses natural rhythm and reads as theatrical narration.`,
          suggestedFix: 'Remove the direct address from most lines and let the character speak directly to their point. Reserve name-first address for moments of genuine urgency, confrontation, or intimacy — where naming someone is a deliberate dramatic act, not a speech habit.',
        });
      }
    }

    // DIALOGUE_RETROSPECTIVE_OPENER (minor, ≥10 dialogue lines, ≥4 matches):
    // At least 4 dialogue lines open with explicit retrospective indicators
    // ("I remember", "Back when", "Do you remember", "I used to", "Years ago",
    // "Before you", "That was when", "In those days"). When many dialogue lines
    // open in retrospective mode, characters are narrating the past rather than
    // confronting each other in the present. Backstory delivered in retrospective
    // openers pauses dramatic time. Distinct from DIALOGUE_HEDGING_OPENER (hedging
    // phrases not temporal retrospection) and DIALOGUE_CONJUNCTION_OPENER (additive
    // chain openers not retrospective openers).
    if (dlg333.length >= 10) {
      const retroRe333 = /^(I remember|Do you remember|Back when|Years ago|Before you|Before I|When I was|That was when|I used to|You used to|We used to|In those days|Back then|Once I|Once you|Once we|Last time I)/i;
      const retroCount333 = dlg333.filter(l => retroRe333.test(l.trim())).length;
      if (retroCount333 >= 4 && retroCount333 / dlg333.length > 0.25) {
        issues.push({
          location: 'Dialogue retrospective openers',
          rule: 'DIALOGUE_RETROSPECTIVE_OPENER',
          severity: 'minor',
          description: `${retroCount333} of ${dlg333.length} dialogue lines (${Math.round(retroCount333 / dlg333.length * 100)}%) open with retrospective narration ("I remember", "Back when", "Years ago", "I used to"). When characters consistently open in the past tense, they are narrating backstory rather than confronting each other in the present — dramatic time is paused while characters deliver exposition in the guise of conversation.`,
          suggestedFix: 'Move backstory from retrospective dialogue to present-tense consequence: instead of "I remember when you left me," let the action show what that departure cost. When characters must reference the past, root it in a present emotion — "You left. I never recovered." rather than "I remember when you left."',
        });
      }
    }

    // DIALOGUE_WORD_STUTTER (minor, ≥10 dialogue lines, ≥3 matches): At least 3
    // dialogue lines contain an immediate word repetition — the same word appearing
    // twice in succession ("no no", "please please", "I I can't", "why why"). A
    // single stutter marks genuine emotional overwhelm; a pattern of stutters across
    // multiple lines becomes a verbal tic that the audience discounts. Distinct from
    // NEAR_WORD_REPEAT in rhythm.ts (which checks for the same word in a 5-line
    // window of action prose; this checks for same-word adjacency within a single
    // dialogue line across multiple lines).
    if (dlg333.length >= 10) {
      const stutterRe333 = /\b(\w{2,})\s+\1\b/i;
      const stutterCount333 = dlg333.filter(l => stutterRe333.test(l)).length;
      if (stutterCount333 >= 3) {
        issues.push({
          location: 'Dialogue word repetition',
          rule: 'DIALOGUE_WORD_STUTTER',
          severity: 'minor',
          description: `${stutterCount333} dialogue lines contain immediate word repetition ("no no", "please please", "I I") — a stutter pattern that appears across multiple exchanges. A single stutter marks genuine emotional overwhelm; when the device recurs across ${stutterCount333} lines, it becomes a verbal tic the audience stops registering. The emergency of the stutter is normalised by repetition.`,
          suggestedFix: 'Reserve the stutter for one moment of genuine breakdown. If a character repeats a word once in the script ("no no"), it lands hard; if they do it repeatedly, it becomes their voice pattern and loses impact. Find other ways to signal overwhelm: silence, a subject change, a line that contradicts the previous one.',
        });
      }
    }
  }

  // ── Wave 347: DIALOGUE_DISCOURSE_MARKER_OPENER, DIALOGUE_VOCATIVE_ADDRESS_FLOOD, DIALOGUE_GREETING_FILLER_FLOOD ──
  {
    const dlg347: string[] = [];
    let inDlg347 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg347 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg347 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg347 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg347) dlg347.push(t);
      else inDlg347 = false;
    }

    // DIALOGUE_DISCOURSE_MARKER_OPENER (minor, ≥10 dialogue lines, >25%): More than
    // 25% of dialogue lines begin with a discourse/attention marker ("Okay,",
    // "Alright,", "Right,", "Anyway,", "Anyhow,"). These are conversational throat-
    // clearings that delay the actual line; sprinkled occasionally they sound natural,
    // but when a quarter of all lines open this way the dialogue acquires a verbal tic
    // and never lands a clean opening beat. Distinct from DIALOGUE_HEDGING_OPENER
    // (epistemic softeners — "Well,", "Look,", "I mean,") and DIALOGUE_CONJUNCTION_
    // OPENER (coordinators — "And", "But", "So"): these are managerial discourse markers.
    if (dlg347.length >= 10) {
      const markerRe347 = /^(okay[,\s]|ok[,\s]|alright[,\s]|all right[,\s]|anyway[,\s]|anyhow[,\s]|right[,\s])/i;
      const markerCount347 = dlg347.filter(l => markerRe347.test(l.trim())).length;
      if (markerCount347 / dlg347.length > 0.25) {
        issues.push({
          location: 'Dialogue discourse-marker openers',
          rule: 'DIALOGUE_DISCOURSE_MARKER_OPENER',
          severity: 'minor',
          description: `${markerCount347} of ${dlg347.length} dialogue lines (${Math.round(markerCount347 / dlg347.length * 100)}%) begin with a discourse marker ("Okay,", "Alright,", "Right,", "Anyway,"). These conversational throat-clearings delay the actual line; an occasional one sounds natural, but when a quarter of all dialogue opens this way the speech acquires a verbal tic and never lands a clean opening beat — every line warms up before it says anything.`,
          suggestedFix: 'Cut most discourse-marker openers and let each line begin on its point. Reserve "Okay," or "Anyway," for the rare moment a character genuinely shifts gears or regroups; as a default opener it adds nothing but throat-clearing.',
        });
      }
    }

    // DIALOGUE_VOCATIVE_ADDRESS_FLOOD (minor, ≥10 dialogue lines, >25%): More than
    // 25% of dialogue lines contain a comma-set-off vocative address term ("honey",
    // "buddy", "sir", "man", "kid"). A vocative now and then grounds a relationship,
    // but pervasive use is a writer's crutch for signalling familiarity or attitude
    // the dialogue should convey on its own — and it bloats lines with words actors
    // rarely need. Distinct from DIALOGUE_NAME_OPENER_FLOOD (proper names at the very
    // start of a line): this catches common-noun address terms anywhere in the line.
    if (dlg347.length >= 10) {
      const vocativeRe347 = /,\s*(honey|babe|baby|sweetheart|sweetie|darling|dear|sir|ma'?am|madam|buddy|pal|dude|bro|man|kid|son|boss|chief|champ|mister|miss)\b[.!?,\s]/i;
      const vocativeEndRe347 = /,\s*(honey|babe|baby|sweetheart|sweetie|darling|dear|sir|ma'?am|madam|buddy|pal|dude|bro|man|kid|son|boss|chief|champ|mister|miss)\s*[.!?]?$/i;
      const vocativeCount347 = dlg347.filter(l => {
        const t = l.trim();
        return vocativeRe347.test(t) || vocativeEndRe347.test(t);
      }).length;
      if (vocativeCount347 / dlg347.length > 0.25) {
        issues.push({
          location: 'Dialogue vocative address',
          rule: 'DIALOGUE_VOCATIVE_ADDRESS_FLOOD',
          severity: 'minor',
          description: `${vocativeCount347} of ${dlg347.length} dialogue lines (${Math.round(vocativeCount347 / dlg347.length * 100)}%) contain a comma-set-off vocative address term ("honey", "buddy", "sir", "man"). An occasional vocative grounds a relationship, but pervasive use is a crutch for signalling familiarity or attitude the dialogue should carry on its own, and it pads lines with words actors rarely need.`,
          suggestedFix: 'Strip most vocatives and let the relationship register through what is said and how. Reserve a "honey" or a "sir" for the moment the term itself carries weight — a sudden tenderness, a pointed formality — rather than sprinkling it as conversational texture.',
        });
      }
    }

    // DIALOGUE_GREETING_FILLER_FLOOD (minor, ≥8 dialogue lines, ≥3 matches): Three or
    // more dialogue lines are greetings or farewells ("Hello", "Hi", "Goodbye", "Good
    // morning", "See you", "Take care"). Social pleasantries are almost always cuttable:
    // scenes should start as late as possible and end as early as possible, skipping the
    // hellos and goodbyes that real life requires but drama does not. A script that keeps
    // staging the small talk wastes its openings and closings. Distinct from DIALOGUE_
    // DISCOURSE_MARKER_OPENER (mid-conversation throat-clearing) and the opener checks.
    if (dlg347.length >= 8) {
      const greetingRe347 = /^(hello\b|hi\b|good morning\b|good evening\b|good afternoon\b|good night\b|goodbye\b|good-bye\b|bye\b|farewell\b|see you\b|see ya\b|take care\b|so long\b|how do you do\b|nice to meet you\b)/i;
      const greetingCount347 = dlg347.filter(l => greetingRe347.test(l.trim())).length;
      if (greetingCount347 >= 3) {
        issues.push({
          location: 'Dialogue greetings and farewells',
          rule: 'DIALOGUE_GREETING_FILLER_FLOOD',
          severity: 'minor',
          description: `${greetingCount347} dialogue lines are greetings or farewells ("Hello", "Goodbye", "Good morning", "See you"). Social pleasantries are almost always cuttable — a scene should begin as late as possible and end as early as possible, skipping the hellos and goodbyes that real life requires but drama does not. Repeatedly staging the small talk wastes the script's openings and closings on words that carry no story.`,
          suggestedFix: 'Cut the greetings and farewells and enter each scene mid-moment, already in motion. If a hello or goodbye must stay, make it do double duty — a greeting that lands as a threat, a farewell that reveals a secret — so the pleasantry carries dramatic freight rather than just marking arrival and departure.',
        });
      }
    }
  }

  // ── Wave 361: DIALOGUE_CONDITIONAL_FLOOD, DIALOGUE_APOLOGY_OVERUSE, DIALOGUE_HESITATION_FLOOD ──
  {
    const dlg361: string[] = [];
    let inDlg361 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg361 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg361 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg361 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg361) dlg361.push(t);
    }

    // DIALOGUE_CONDITIONAL_FLOOD (minor, ≥10 lines, >30%): More than 30% of
    // dialogue lines begin with a conditional opener ("If ", "Unless ", "Whether ",
    // "Suppose ", "What if ", "Assuming "). Characters who default to hypothetical
    // speech rather than declarative action lack dramatic agency — they negotiate
    // possibility instead of confronting reality. Conditional-heavy dialogue is also
    // hard to play: actors can't commit to a line that hasn't committed to its premise.
    // Distinct from DIALOGUE_HEDGING_OPENER (hedging qualifiers like "I think",
    // "maybe" — not conditional clause openers) and DIALOGUE_INTERROGATIVE_SATURATION
    // (questions, not conditionals).
    if (dlg361.length >= 10) {
      const conditionalRe361 = /^(if\s+|unless\s+|whether\s+|suppose\s+|what\s+if\s+|assuming\s+|provided\s+that\s+|in\s+case\s+)/i;
      const conditionalCount361 = dlg361.filter(l => conditionalRe361.test(l.trim())).length;
      if (conditionalCount361 / dlg361.length > 0.30) {
        issues.push({
          location: 'Dialogue throughout',
          rule: 'DIALOGUE_CONDITIONAL_FLOOD',
          severity: 'minor',
          description: `${conditionalCount361} of ${dlg361.length} dialogue lines (${Math.round(conditionalCount361 / dlg361.length * 100)}%) begin with a conditional opener ("If", "Unless", "What if", "Suppose"). Characters who default to hypothetical speech lack dramatic agency — they negotiate possibility instead of confronting reality. Conditional-heavy dialogue is also hard to play: an actor can't fully commit to a line that hasn't committed to its own premise.`,
          suggestedFix: 'Convert conditional speech into declarative speech: "If you leave, I\'ll be alone" → "Don\'t leave me." Characters should confront rather than speculate. Conditionals can be tools for evasion, threat, or bargaining — use them purposefully rather than as a default register.',
        });
      }
    }

    // DIALOGUE_APOLOGY_OVERUSE (minor, ≥8 lines, ≥3 apology lines): Three or
    // more dialogue lines are apologies ("I'm sorry", "I apologize", "forgive me",
    // "excuse me", "I didn't mean to", "my mistake", "pardon"). Characters who
    // constantly apologize have no dramatic agency — they respond to tension by
    // retreating rather than by asserting, choosing, or confronting. A single
    // apology can carry enormous dramatic weight; three or more signals that the
    // writer is using apology as a default reaction to conflict. Distinct from
    // DIALOGUE_HEDGING_OPENER (qualifying phrases, not full apologies) and
    // DIALOGUE_GREETING_FILLER_FLOOD (greetings/farewells, not apologies).
    if (dlg361.length >= 8) {
      const apologyRe361 = /\b(i'?m\s+sorry\b|i\s+apologize\b|forgive\s+me\b|excuse\s+me\b|pardon\s+(me\b)?|my\s+mistake\b|my\s+apolog(y|ies)\b|i\s+didn'?t\s+mean\s+to\b|i\s+shouldn'?t\s+have\b)/i;
      const apologyCount361 = dlg361.filter(l => apologyRe361.test(l)).length;
      if (apologyCount361 >= 3) {
        issues.push({
          location: 'Dialogue apologies',
          rule: 'DIALOGUE_APOLOGY_OVERUSE',
          severity: 'minor',
          description: `${apologyCount361} dialogue lines are apologies ("I'm sorry", "I apologize", "forgive me", "excuse me"). Characters who constantly apologize have no dramatic agency — they respond to tension by retreating rather than asserting, choosing, or confronting. A single apology can be a devastating dramatic beat; ${apologyCount361} apologies signals a story where characters default to contrition instead of conflict.`,
          suggestedFix: "Reserve apology for its maximum impact: one well-placed 'I'm sorry' that costs a character something. Replace the others with more active responses to conflict — a counter-attack, a deflection, a revelation, or a choice. Apology forecloses drama; active response generates it.",
        });
      }
    }

    // DIALOGUE_HESITATION_FLOOD (minor, ≥10 lines, >25%): More than 25% of
    // dialogue lines contain a hesitation sound or filler word ("um", "uh", "er",
    // "hmm", "ahh"). Written hesitation is a device for characterizing uncertainty
    // or nervousness, but in density it makes every character sound uncertain and
    // the script feel unconfident. Unlike real speech, written dialogue carries only
    // the hesitations the writer deliberately included; when a quarter of all lines
    // stutter, the script hasn't chosen nervousness as a character choice — it has
    // adopted it as a default voice. Distinct from DIALOGUE_DISCOURSE_MARKER_OPENER
    // ("Okay,", "Alright,") and DIALOGUE_HEDGING_OPENER (hedging qualifiers).
    if (dlg361.length >= 10) {
      const hesitationRe361 = /\b(um+|uh+|er+|hmm+|ahh?)\b/i;
      const hesitationCount361 = dlg361.filter(l => hesitationRe361.test(l)).length;
      if (hesitationCount361 / dlg361.length > 0.25) {
        issues.push({
          location: 'Dialogue throughout',
          rule: 'DIALOGUE_HESITATION_FLOOD',
          severity: 'minor',
          description: `${hesitationCount361} of ${dlg361.length} dialogue lines (${Math.round(hesitationCount361 / dlg361.length * 100)}%) contain a hesitation sound ("um", "uh", "er", "hmm"). Written hesitation signals a specific character choice — nervousness, uncertainty, evasion. In density it ceases to be characterization and becomes the script's default voice, making every character sound equivocal and the writing itself tentative.`,
          suggestedFix: "Reserve hesitation sounds for specific characterization: one character who stutters under pressure, one scene where uncertainty is the dramatic point. Remove the others and trust the character's position to speak for itself — a line that says what it means, without hedging, almost always lands harder.",
        });
      }
    }
  }

  // ── Wave 375: DIALOGUE_ELLIPSIS_OPENER_FLOOD, DIALOGUE_TRIADIC_FLOOD, DIALOGUE_EMPHATIC_PUNCTUATION_FLOOD ──
  {
    const dlg375: string[] = [];
    let inDlg375 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg375 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg375 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg375 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg375) dlg375.push(t);
    }

    // DIALOGUE_ELLIPSIS_OPENER_FLOOD (minor, ≥10 lines, >20%): More than 20% of
    // dialogue lines begin with an ellipsis ("...you knew?"). A line that opens mid-
    // trail signals the speaker is picking up an interrupted or unspoken thought; used
    // occasionally it suggests hesitation or continuation, but when a fifth of all lines
    // open this way every character sounds tentative and adrift, as if no one can begin a
    // thought cleanly. Distinct from DIALOGUE_TRAILING_ELLIPSIS_FLOOD (lines that END with
    // "..." — trailing off) and DIALOGUE_HESITATION_FLOOD (vocalized "um"/"uh" sounds).
    if (dlg375.length >= 10) {
      const ellipsisOpenerRe375 = /^(\.\.\.|…)/;
      const ellipsisCount375 = dlg375.filter(l => ellipsisOpenerRe375.test(l.trim())).length;
      if (ellipsisCount375 / dlg375.length > 0.20) {
        issues.push({
          location: 'Dialogue throughout',
          rule: 'DIALOGUE_ELLIPSIS_OPENER_FLOOD',
          severity: 'minor',
          description: `${ellipsisCount375} of ${dlg375.length} dialogue lines (${Math.round(ellipsisCount375 / dlg375.length * 100)}%) begin with an ellipsis ("...you knew?"). A line that opens mid-trail signals a speaker picking up an interrupted or unspoken thought; an occasional one reads as hesitation, but when a fifth of all lines open this way every character sounds tentative and adrift, as if no one can begin a thought cleanly.`,
          suggestedFix: 'Let most lines begin on a clean first word and reserve the opening ellipsis for the rare beat where a character is genuinely picking up a dropped thread. A character who can start a sentence reads as present and decisive; one who always trails in reads as perpetually unsure.',
        });
      }
    }

    // DIALOGUE_TRIADIC_FLOOD (minor, ≥10 lines, ≥3 lines): Three or more dialogue lines
    // use a "X, Y, and Z" rule-of-three enumeration ("I'm tired, I'm broke, and I'm done."").
    // The triad is a potent rhetorical figure, but recurring across dialogue it becomes a
    // verbal tic that makes every character orate in the same balanced cadence — speech
    // acquires a written, speechy quality rather than the irregularity of how people talk.
    // Distinct from rhythm.ts TRIADIC_LIST_OVERLOAD (which audits ACTION lines): this
    // targets the dialogue channel.
    if (dlg375.length >= 10) {
      const triadRe375 = /[^,]+,\s+[^,]+,?\s+(and|or)\s+\w+/i;
      const triadCount375 = dlg375.filter(l => triadRe375.test(l)).length;
      if (triadCount375 >= 3) {
        issues.push({
          location: 'Dialogue throughout',
          rule: 'DIALOGUE_TRIADIC_FLOOD',
          severity: 'minor',
          description: `${triadCount375} dialogue lines use a "X, Y, and Z" rule-of-three enumeration. The triad is a potent rhetorical figure, but recurring across dialogue it becomes a verbal tic — every character orates in the same balanced three-part cadence, and the speech acquires a written, speechy quality rather than the irregularity of how people actually talk under pressure.`,
          suggestedFix: 'Break up the triads: let characters trail off after one item, pile up four without the tidy "and", or interrupt themselves. Reserve the rule-of-three for the one speech where its rhetorical polish is the point — a toast, a manipulation, a closing argument.',
        });
      }
    }

    // DIALOGUE_EMPHATIC_PUNCTUATION_FLOOD (minor, ≥10 lines, >20%): More than 20% of
    // dialogue lines carry a doubled or mixed emphatic punctuation mark ("!!", "?!", "!?",
    // "?!?"). Stacked marks try to manufacture intensity on the page that the words and
    // performance should carry; when a fifth of lines shout in punctuation, the dialogue
    // reads as hysterical and the marks lose all force through repetition. Distinct from
    // EXCLAMATION_OVERUSE (single "!") and QUESTION_MARK_OVERLOAD (single "?"): this targets
    // stacked/mixed terminal marks specifically.
    if (dlg375.length >= 10) {
      const emphaticRe375 = /[!?][!?]+/;
      const emphaticCount375 = dlg375.filter(l => emphaticRe375.test(l)).length;
      if (emphaticCount375 / dlg375.length > 0.20) {
        issues.push({
          location: 'Dialogue throughout',
          rule: 'DIALOGUE_EMPHATIC_PUNCTUATION_FLOOD',
          severity: 'minor',
          description: `${emphaticCount375} of ${dlg375.length} dialogue lines (${Math.round(emphaticCount375 / dlg375.length * 100)}%) carry a doubled or mixed emphatic mark ("!!", "?!", "!?"). Stacked punctuation tries to manufacture on the page the intensity that the words and the performance should carry; when this many lines shout in punctuation, the dialogue reads as hysterical and the marks lose all force through repetition.`,
          suggestedFix: 'Strip the stacked marks back to single terminal punctuation and let the word choice and context supply the heat. If a line only feels intense with "?!", the line itself is doing too little — sharpen what is said so the emphasis is in the meaning, not the typography.',
        });
      }
    }
  }

  // ── Wave 389: ACTION_EXPLETIVE_OPENER, DIALOGUE_INTERROGATIVE_OPENER_FLOOD, DIALOGUE_COMPARATIVE_FLOOD ──

  // ACTION_EXPLETIVE_OPENER (minor, ≥10 action lines, >25%): More than 25% of action
  // lines begin with an expletive dummy-subject construction ("There is", "There are",
  // "It is", "It was"). These constructions bury the real subject behind a placeholder and
  // a copula, draining the kinetic, agent-first energy screen action depends on — "There is
  // a man at the door" instead of "A man waits at the door." Distinct from ABSTRACT_SUBJECT_
  // OPENING (an abstract NOUN subject), STATIVE_VERB_OVERLOAD (state verbs anywhere), and
  // PASSIVE_ACTION_VOICE (agentless passives): this targets the expletive-opener pattern.
  if (actionOnlyLines.length >= 10) {
    const expletiveRe389 = /^(there\s+(is|are|was|were)\b|there's\b|there're\b|it\s+(is|was)\b|it's\b)/i;
    const expletiveCount389 = actionOnlyLines.filter(l => expletiveRe389.test(l.trim())).length;
    if (expletiveCount389 / actionOnlyLines.length > 0.25) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'ACTION_EXPLETIVE_OPENER',
        severity: 'minor',
        description: `${expletiveCount389} of ${actionOnlyLines.length} action lines (${Math.round(expletiveCount389 / actionOnlyLines.length * 100)}%) begin with an expletive dummy-subject construction ("There is", "It was"). These bury the real subject behind a placeholder and a copula, draining the kinetic, agent-first energy screen action depends on — "There is a man at the door" sits flat where "A man waits at the door" moves.`,
        suggestedFix: 'Recast expletive openers around the real subject and an active verb: "There is a shadow on the wall" → "A shadow stretches across the wall." Leading with the agent and what it does restores the forward, visual drive that "There is / It was" constructions sap.',
      });
    }
  }

  // ── Wave 389: dialogue-side checks ──
  {
    const dlg389: string[] = [];
    let inDlg389 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg389 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg389 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg389 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg389) dlg389.push(t);
    }

    // DIALOGUE_INTERROGATIVE_OPENER_FLOOD (minor, ≥10 lines, >30%): More than 30% of
    // dialogue lines begin with a wh-question word ("What", "Why", "How", "Where", "When",
    // "Who", "Which"). When most lines open by interrogating, every exchange reads as a
    // cross-examination and the characters pump each other for information rather than
    // asserting, deflecting, or revealing. Distinct from DIALOGUE_INTERROGATIVE_SATURATION
    // (lines that END with "?" — this is opener-based and catches the interrogating cadence
    // even in lines not punctuated as questions) and QUESTION_MARK_OVERLOAD.
    if (dlg389.length >= 10) {
      const whOpenerRe389 = /^(what|why|how|where|when|who|whose|whom|which)\b/i;
      const whCount389 = dlg389.filter(l => whOpenerRe389.test(l.trim())).length;
      if (whCount389 / dlg389.length > 0.30) {
        issues.push({
          location: 'Dialogue throughout',
          rule: 'DIALOGUE_INTERROGATIVE_OPENER_FLOOD',
          severity: 'minor',
          description: `${whCount389} of ${dlg389.length} dialogue lines (${Math.round(whCount389 / dlg389.length * 100)}%) begin with a wh-question word ("What", "Why", "How", "Where"). When most lines open by interrogating, every exchange reads as a cross-examination — characters pump each other for information rather than asserting, deflecting, or revealing, and the scene acquires the rhythm of a deposition.`,
          suggestedFix: 'Convert many questions into statements, accusations, or evasions and let the other character supply what the question was fishing for: "Why did you do it?" can become "You did it on purpose." A scene of relentless questions has no one taking a position — give the characters claims to defend, not just queries to fire.',
        });
      }
    }

    // DIALOGUE_COMPARATIVE_FLOOD (minor, ≥10 lines, >25%): More than 25% of dialogue
    // lines carry a comparative construction ("more X than", "better than", "as X as").
    // Constant comparison locks characters into relative ranking — nothing is simply itself,
    // it is always more or less than something else — which makes the dialogue feel
    // argumentative and evaluative rather than felt. Distinct from DIALOGUE_SUPERLATIVE_FLOOD
    // (best/worst/most absolutes): comparatives rank two things against each other rather
    // than pushing one to an extreme.
    if (dlg389.length >= 10) {
      const comparativeRe389 = /\b(more|less|better|worse|bigger|smaller|stronger|weaker|harder|easier|faster|slower|older|younger|richer|poorer|closer|further|farther|greater|higher|lower|smarter|safer)\s+than\b|\bas\s+\w+\s+as\b/i;
      const comparativeCount389 = dlg389.filter(l => comparativeRe389.test(l)).length;
      if (comparativeCount389 / dlg389.length > 0.25) {
        issues.push({
          location: 'Dialogue throughout',
          rule: 'DIALOGUE_COMPARATIVE_FLOOD',
          severity: 'minor',
          description: `${comparativeCount389} of ${dlg389.length} dialogue lines (${Math.round(comparativeCount389 / dlg389.length * 100)}%) carry a comparative construction ("more X than", "better than", "as X as"). Constant comparison locks characters into relative ranking — nothing is simply itself, it is always measured against something else — which makes the dialogue feel evaluative and argumentative rather than emotionally direct.`,
          suggestedFix: 'Let characters speak in direct, absolute terms where the feeling is the point: "I trust you more than I trusted him" can become "I trust you." Reserve comparison for the beat where weighing two things against each other is the dramatic move; as a default register it keeps the dialogue at arm\'s length.',
        });
      }
    }
  }

  // ── Wave 403: DIALOGUE_PASSIVE_FLOOD, DIALOGUE_IMPERATIVE_FLOOD, ACTION_MOTION_VERB_MONOTONE ──

  // DIALOGUE_PASSIVE_FLOOD (minor, ≥15 dialogue lines, >25%): More than 25% of dialogue
  // lines contain a passive-voice construction ("was told", "were found", "has been done",
  // "got fired"). Passive voice in dialogue removes the agent — characters describe what
  // happened without naming who performed the action, creating an evasive, bureaucratic, or
  // distanced register. A character who says "He was fired" instead of "They fired him" is
  // either hiding who did it or deflecting accountability. Distinct from PASSIVE_ACTION_VOICE
  // (action lines only) and ACTION_EXPLETIVE_OPENER (dummy-subject openers in action):
  // this fires on the passive register of speech itself, not of narration.
  {
    const dlg403a: string[] = [];
    let inDlg403a = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg403a = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg403a = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg403a = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg403a) dlg403a.push(t);
    }
    if (dlg403a.length >= 15) {
      const passiveRe403a = /\b(was|were)\s+\w+ed\b|\bhas\s+been\b|\bhave\s+been\b|\bhad\s+been\b|\bgot\s+\w+ed\b|\bget\s+\w+ed\b/i;
      const passiveCount403a = dlg403a.filter(l => passiveRe403a.test(l)).length;
      if (passiveCount403a / dlg403a.length > 0.25) {
        issues.push({
          location: 'Dialogue throughout',
          rule: 'DIALOGUE_PASSIVE_FLOOD',
          severity: 'minor',
          description: `${passiveCount403a} of ${dlg403a.length} dialogue lines (${Math.round(passiveCount403a / dlg403a.length * 100)}%) use passive constructions ("was told", "were found", "has been done"). Passive voice in dialogue removes the agent — characters describe what happened without naming who did it, producing an evasive or bureaucratic register. "He was fired" conceals who fired him; "It was decided" hides who decided. A script dense with passive dialogue has characters who systematically avoid assigning responsibility.`,
          suggestedFix: 'Convert passive dialogue into active speech that names the agent: "He was told to leave" → "She told him to leave." When a character deliberately omits the agent — to protect someone, to deflect blame — make that evasion itself a dramatic choice, not the default register. Active speech has characters owning, attributing, and confronting action directly.',
        });
      }
    }
  }

  // DIALOGUE_IMPERATIVE_FLOOD (minor, ≥15 dialogue lines, >30%): More than 30% of dialogue
  // lines are imperative commands beginning with a base-form verb directing another character's
  // behavior ("Go.", "Tell me.", "Stop.", "Get out."). Characters who default to commands
  // have no emotional interior that surfaces in dialogue — they only manage others. When
  // imperatives dominate, the script reads as a sequence of orders rather than a collision of
  // needs and desires; characters are behavioral managers, not people. Distinct from
  // DIALOGUE_INTERROGATIVE_SATURATION (question-mark lines), DIALOGUE_CONDITIONAL_FLOOD
  // (if/unless openers), DIALOGUE_CONJUNCTION_OPENER (And/But/So starters), and
  // EXCLAMATION_OVERUSE (punctuation): this targets grammatical mood — the imperative verb form.
  {
    const dlg403b: string[] = [];
    let inDlg403b = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg403b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg403b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg403b = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg403b) dlg403b.push(t);
    }
    if (dlg403b.length >= 15) {
      const IMPERATIVE_VERBS403b = new Set([
        'go', 'get', 'come', 'stop', 'tell', 'show', 'give', 'take', 'make', 'let',
        'stay', 'look', 'listen', 'wait', 'run', 'leave', 'help', 'move', 'find', 'keep',
        'hold', 'put', 'sit', 'stand', 'turn', 'watch', 'follow', 'call', 'say', 'speak',
        'walk', 'open', 'close', 'bring', 'forget', 'remember', 'think', 'check', 'read',
        'drink', 'eat', 'sleep', 'wake', 'send', 'write', 'be', 'die', 'live', 'pull',
        'push', 'pick', 'drop', 'grab', 'touch', 'hit', 'kill', 'save', 'ask', 'answer',
        'play', 'use', 'try', 'choose', 'pass', 'drive', 'hide', 'pray', 'trust', 'believe',
        'promise', 'swear', 'calm', 'breathe', 'do', 'start', 'finish', 'end', 'fly', 'jump',
        'climb', 'fight',
      ]);
      const imperativeCount403b = dlg403b.filter(l => {
        const first = l.trim().split(/[\s,!.?]+/)[0]?.toLowerCase();
        return first !== undefined && IMPERATIVE_VERBS403b.has(first);
      }).length;
      if (imperativeCount403b / dlg403b.length > 0.30) {
        issues.push({
          location: 'Dialogue throughout',
          rule: 'DIALOGUE_IMPERATIVE_FLOOD',
          severity: 'minor',
          description: `${imperativeCount403b} of ${dlg403b.length} dialogue lines (${Math.round(imperativeCount403b / dlg403b.length * 100)}%) begin with an imperative command ("Go", "Tell me", "Stop", "Get out"). When commands dominate dialogue, characters default to directing each other's behavior rather than expressing, feeling, or connecting — they manage one another instead of engaging. A script dense with imperative dialogue has characters who are behavioral managers, not people in emotional relation.`,
          suggestedFix: 'Convert some commands into the need that motivates them: "Go now" can become "I can\'t do this with you here." The command tells the other character what to do; the need tells the audience what it costs. Characters who express the desire behind their demands are more revealing than characters who only issue orders.',
        });
      }
    }
  }

  // ACTION_MOTION_VERB_MONOTONE (minor, ≥10 action lines, >50%): More than 50% of action
  // lines use a generic motion or displacement verb as their primary verb ("walks", "moves",
  // "enters", "exits", "turns", "crosses", "heads", "approaches", "reaches", "comes", "goes",
  // "runs", "steps", "leaves", "arrives", "stands", "sits", "rises", "falls"). When motion
  // verbs dominate the action, the script describes choreography — who moved where — rather
  // than what characters are doing in any dramatically meaningful sense. The physical world
  // is reduced to traffic management. Distinct from MONOCHROME_VERBS (a single specific verb
  // repeated, threshold 25%) and ACTION_ADVERB_FLOOD (adverbs modifying weak verbs): this
  // fires when the whole category of generic displacement verbs dominates, revealing
  // verb-level under-description of attitude, intention, and behavior.
  if (actionOnlyLines.length >= 10) {
    const motionVerbRe403c = /\b(walks?|walked|moves?|moved|enters?|entered|exits?|exited|turns?|turned|crosses?|crossed|heads?|headed|approaches?|approached|arrives?|arrived|comes|came|goes|went|runs?|ran|steps?|stepped|leaves|left|reaches?|reached|stands?|stood|sits?|sat|rises?|rose|falls?|fell|climbs?|climbed)\b/i;
    const motionCount403c = actionOnlyLines.filter(l => motionVerbRe403c.test(l)).length;
    if (motionCount403c / actionOnlyLines.length > 0.50) {
      issues.push({
        location: 'Action lines throughout',
        rule: 'ACTION_MOTION_VERB_MONOTONE',
        severity: 'minor',
        description: `${motionCount403c} of ${actionOnlyLines.length} action lines (${Math.round(motionCount403c / actionOnlyLines.length * 100)}%) use a generic motion or displacement verb ("walks", "enters", "moves", "crosses", "turns", "heads"). When displacement verbs dominate the action, the script describes choreography — who moved where — rather than what characters are doing in any dramatically meaningful sense. Action prose reduced to traffic management under-describes the physical world and the psychological stakes behind movement.`,
        suggestedFix: 'Replace generic motion verbs with specific verbs that carry attitude and intent: "walks toward" → "advances", "strides", "creeps"; "enters" → "bursts in", "slips in", "crashes through." Movement is always motivated — the verb should carry that motivation. When a character walks, how and why they walk is the character.',
      });
    }
  }

  // ── Wave 417: ACTION_LINE_LENGTH_UNIFORMITY, DIALOGUE_MONOSYLLABIC_FLOOD, DIALOGUE_NEGATION_FLOOD ──

  // ACTION_LINE_LENGTH_UNIFORMITY (minor, ≥12 action lines, mean ≥6 words, CV < 0.30):
  // The word counts of the action lines cluster so tightly around their mean — coefficient
  // of variation (stddev / mean) below 0.30 — that the prose has a flat, metronomic cadence.
  // Screen action lives on rhythmic contrast: a long descriptive build resolved by a curt
  // two-word punch ("She runs. Glass everywhere. The room empties. Silence."). When every
  // action line is the same length, the prose loses its visual music and reads like a list of
  // equally weighted facts; the eye and ear find no emphasis. The mean ≥6 guard restricts this
  // to substantive prose (a script of pure fragments is a different defect). This is a pure
  // distribution/variance measure over the whole action corpus. Distinct from
  // FRAGMENT_RHYTHM_ABSENCE (Wave 224 — fires on the *absence* of short ≤4-word fragments,
  // i.e. an absolute floor) and DIALOGUE_LENGTH_UNIFORMITY (Wave 308 — dialogue, tight band):
  // this fires on low *relative spread* of action-line lengths regardless of their absolute size,
  // catching prose where every line is, say, a uniform 12 words.
  if (actionOnlyLines.length >= 12) {
    const wordCounts417a = actionOnlyLines.map(l => l.split(/\s+/).filter(Boolean).length);
    const mean417a = wordCounts417a.reduce((s, v) => s + v, 0) / wordCounts417a.length;
    if (mean417a >= 6) {
      const variance417a = wordCounts417a.reduce((s, v) => s + (v - mean417a) ** 2, 0) / wordCounts417a.length;
      const cv417a = Math.sqrt(variance417a) / mean417a;
      if (cv417a < 0.30) {
        issues.push({
          location: 'Action line prose',
          rule: 'ACTION_LINE_LENGTH_UNIFORMITY',
          severity: 'minor',
          description: `Across ${actionOnlyLines.length} action lines, the word counts cluster tightly around a mean of ${mean417a.toFixed(1)} words (coefficient of variation ${cv417a.toFixed(2)}, below the 0.30 rhythm threshold) — every action line is nearly the same length. Screen action lives on rhythmic contrast: a long descriptive build resolved by a curt punch. When all lines are equal length, the prose reads as a flat list of equally weighted facts and the eye finds no emphasis or pace.`,
          suggestedFix: 'Vary action-line length deliberately. Let a long, detailed line set up a moment and a two- or three-word fragment land the beat: "She crosses the dark hall, one hand trailing the wall, breath held against the silence. Then — a sound." Contrast in length creates the staccato-and-legato rhythm that makes action prose cinematic rather than uniform.',
        });
      }
    }
  }

  // DIALOGUE_MONOSYLLABIC_FLOOD (minor, ≥12 dialogue lines, >35% are ≤2 words): More than
  // 35% of dialogue lines are two words or fewer ("Yes." / "No way." / "Why?" / "Stop it.").
  // Dialogue that never develops past terse fragments gives characters no room to reveal
  // interiority, rhetoric, or relation — every exchange is a clipped transaction. A scene of
  // pure monosyllables can be a powerful choice for tension, but as a pervasive default it
  // signals dialogue that withholds the texture of how a character actually thinks and speaks.
  // Underweight/brevity mode on the dialogue channel. Distinct from DIALOGUE_LENGTH_UNIFORMITY
  // (Wave 308 — fires when lines cluster in a tight band at *any* size, including uniformly
  // long): this fires specifically on a brevity floor — a large share of lines being barely
  // verbal — and is the brevity counterpart to the action-side length checks.
  {
    const dlg417b: string[] = [];
    let inDlg417b = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg417b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg417b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg417b = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg417b) dlg417b.push(t);
    }
    if (dlg417b.length >= 12) {
      const monoCount417b = dlg417b.filter(l => l.split(/\s+/).filter(Boolean).length <= 2).length;
      if (monoCount417b / dlg417b.length > 0.35) {
        issues.push({
          location: 'Dialogue throughout',
          rule: 'DIALOGUE_MONOSYLLABIC_FLOOD',
          severity: 'minor',
          description: `${monoCount417b} of ${dlg417b.length} dialogue lines (${Math.round(monoCount417b / dlg417b.length * 100)}%) are two words or fewer ("Yes." / "No way." / "Why?"). Dialogue that never develops past terse fragments gives characters no room to reveal interiority, rhetoric, or relation — every exchange becomes a clipped transaction. Sustained monosyllabic speech withholds the texture of how a character actually thinks, deflects, persuades, or breaks down.`,
          suggestedFix: 'Let at least some exchanges breathe past the one-word reflex. A clipped line lands hardest when it interrupts developed speech — reserve "No." for the moment it means something, and elsewhere let characters argue, evade, or confess in full sentences. The contrast between terse and expansive is where dialogue rhythm and character voice emerge.',
        });
      }
    }
  }

  // DIALOGUE_NEGATION_FLOOD (minor, ≥12 dialogue lines, >40% carry a negation): More than
  // 40% of dialogue lines contain a negation construction ("not", "no", "never", "nothing",
  // "nobody", a contracted "-n't", etc.). Characters whose speech is dominated by negation are
  // defined by what they refuse, deny, or lack rather than by what they want, assert, or
  // pursue. A script saturated with denial reads as relentlessly defensive — every line pushes
  // away rather than reaches toward, and the cumulative effect is airless and reactive.
  // Valence mode on the dialogue channel — the only rule that audits the semantic polarity of
  // speech rather than its punctuation (EXCLAMATION_OVERUSE / DIALOGUE_INTERROGATIVE_*),
  // grammatical mood (DIALOGUE_IMPERATIVE_FLOOD), opener token (conjunction / conditional /
  // wh-question openers), or register (DIALOGUE_PASSIVE_FLOOD). A character can negate in any
  // mood — a question, a command, a declaration — so this cuts orthogonally across them all.
  {
    const dlg417c: string[] = [];
    let inDlg417c = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg417c = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg417c = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg417c = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg417c) dlg417c.push(t);
    }
    if (dlg417c.length >= 12) {
      const negationRe417c = /\b(no|not|never|nothing|none|nobody|nowhere|neither|nor)\b|n['']t\b/i;
      const negCount417c = dlg417c.filter(l => negationRe417c.test(l)).length;
      if (negCount417c / dlg417c.length > 0.40) {
        issues.push({
          location: 'Dialogue throughout',
          rule: 'DIALOGUE_NEGATION_FLOOD',
          severity: 'minor',
          description: `${negCount417c} of ${dlg417c.length} dialogue lines (${Math.round(negCount417c / dlg417c.length * 100)}%) are built on negation ("not", "no", "never", "nothing", "can't", "won't"). Characters whose speech is dominated by negation are defined by what they refuse, deny, or lack rather than by what they want or pursue. Relentless denial reads as defensive and reactive — every line pushes away rather than reaches toward, and the scene loses the forward pull of active desire.`,
          suggestedFix: 'Recast some negations as the positive want underneath them: "I don\'t want to be here" carries less than "I want to be anywhere but here," and "It\'s not your fault" lands harder as "You did everything you could." Negation has power as a sharp exception, not as the default grammar of every line. Let characters assert and pursue, so the refusals stand out when they come.',
        });
      }
    }
  }

  // ── Wave 431: DIALOGUE_I_OPENER_RUN, DIALOGUE_LENGTH_OUTLIER, DIALOGUE_HEDGED_QUESTION_FLOOD ──
  // All three share a single ordered collection of dialogue lines (speech lines in
  // script order, parentheticals and cues excluded), built once here.
  {
    const dlg431: string[] = [];
    let inDlg431 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg431 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg431 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg431 = true; continue; }
      if (/^\(/.test(t)) continue; // parenthetical
      if (inDlg431) dlg431.push(t);
    }

    // DIALOGUE_I_OPENER_RUN (minor, ≥8 dialogue lines, run ≥4): Four or more
    // consecutive dialogue lines each begin with the first-person pronoun "I"
    // ("I want…", "I'm not…", "I'll go…", "I never…"). A sustained run of
    // self-referential openers is the texture of characters talking AT each other
    // rather than WITH each other — each line launches from the speaker's own ego
    // instead of responding to what was just said, so the exchange reads as parallel
    // monologues. The "I" opener is detected with a lookahead so genuine pronoun
    // openers ("I'm") match while words that merely start with the letter i ("It",
    // "Is", "If") do not. Run-based mode — the FIRST run-based check in this pass:
    // distinct from DIALOGUE_REPEATED_OPENER_WORD (Wave 322 — a single word begins
    // >40% of ALL lines, a global rate regardless of adjacency) and
    // DIALOGUE_CONJUNCTION_OPENER (Wave 322 — And/But/So rate). This fires on local
    // CONSECUTIVENESS of "I", which a whole-corpus rate can entirely miss.
    if (dlg431.length >= 8) {
      const iOpenerRe431 = /^i(?=$|[\s,.!?;:'’])/i;
      let curRun431 = 0;
      let maxRun431 = 0;
      let maxRunEnd431 = -1;
      for (let i = 0; i < dlg431.length; i++) {
        if (iOpenerRe431.test(dlg431[i])) {
          curRun431++;
          if (curRun431 > maxRun431) { maxRun431 = curRun431; maxRunEnd431 = i; }
        } else {
          curRun431 = 0;
        }
      }
      if (maxRun431 >= 4) {
        const runStart431 = maxRunEnd431 - maxRun431 + 1;
        issues.push({
          location: 'Dialogue exchange',
          rule: 'DIALOGUE_I_OPENER_RUN',
          severity: 'minor',
          description: `${maxRun431} consecutive dialogue lines each begin with "I" (lines ${runStart431 + 1}–${maxRunEnd431 + 1} of the spoken corpus) — a sustained run of first-person openers. When every line in a stretch launches from the speaker's own ego ("I want…", "I'm not…", "I never…"), characters are talking AT each other rather than responding to one another; the exchange reads as parallel monologues of self-assertion rather than a live conversation.`,
          suggestedFix: 'Break the run by having a line begin with a response to what was just said — the other character\'s name, a "You…", a reaction to their words, or a question that engages their point. Dialogue is a volley: let some lines open by reaching toward the other person instead of restating the self.',
        });
      }
    }

    // DIALOGUE_LENGTH_OUTLIER (minor, ≥12 dialogue lines, max ≥30 words AND ≥4× mean):
    // A single dialogue line towers over every other — at least 30 words long and at
    // least four times the mean line length. One unmotivated monologue dump amid
    // otherwise terse speech reads as the writer breaking character to deliver
    // exposition or a thesis: the rhythm of exchange stops dead while one speaker
    // holds the floor for a paragraph. A long speech can be a deliberate aria, but a
    // lone extreme outlier against an otherwise clipped corpus signals an undigested
    // info-dump rather than an earned set-piece. Single-peak ISOLATION mode — the
    // first such check in this pass. Distinct from DIALOGUE_LENGTH_UNIFORMITY (Wave
    // 308 — fires when lengths cluster in a TIGHT band, the opposite condition) and
    // DIALOGUE_MONOSYLLABIC_FLOOD (Wave 417 — a brevity FLOOR measured as a rate):
    // this isolates the single longest line as an outlier against the distribution.
    if (dlg431.length >= 12) {
      const wc431 = dlg431.map(l => l.split(/\s+/).filter(Boolean).length);
      const mean431 = wc431.reduce((s, v) => s + v, 0) / wc431.length;
      const max431 = Math.max(...wc431);
      if (max431 >= 30 && mean431 > 0 && max431 >= mean431 * 4) {
        issues.push({
          location: 'Dialogue length distribution',
          rule: 'DIALOGUE_LENGTH_OUTLIER',
          severity: 'minor',
          description: `A single dialogue line runs ${max431} words — ${(max431 / mean431).toFixed(1)}× the ${mean431.toFixed(1)}-word mean of the other ${dlg431.length - 1} lines. One monologue towering over otherwise terse speech stops the rhythm of exchange dead: while one speaker holds the floor for a full paragraph, the scene's volley collapses. A lone extreme outlier against a clipped corpus usually signals an undigested exposition or thesis dump rather than an earned aria.`,
          suggestedFix: 'Break the giant speech into a real exchange: let the other character interrupt, react, or push back so the information surfaces through conflict rather than a monologue. If the long speech is a deliberate set-piece, earn it — build the rhythm up toward it and give the surrounding scene room to register its weight, rather than dropping a paragraph into a corpus of one-liners.',
        });
      }
    }

    // DIALOGUE_HEDGED_QUESTION_FLOOD (minor, ≥12 dialogue lines, >20% hedge AND
    // question simultaneously): More than a fifth of dialogue lines are BOTH hedged
    // ("maybe", "perhaps", "I think", "kind of", "sort of", "probably", "I guess")
    // AND end in a question mark — the doubly-tentative line ("Maybe we should… go?",
    // "I think it's the right one?"). Characters who default to the hedged question
    // can neither assert nor commit to asking; every line is qualified twice over,
    // draining the scene of conviction and forward pressure. Co-occurrence mode —
    // it fires on the CONJUNCTION of two tics, each of which has its own single-
    // feature rule (DIALOGUE_HEDGING_OPENER, Wave 266, opener-position hedges;
    // DIALOGUE_INTERROGATIVE_SATURATION, Wave 294, lines ending in "?"). Neither of
    // those rate checks need cross its own threshold for the joint pattern to
    // dominate a scene, so the conjunction is genuinely orthogonal: a line can hedge
    // mid-sentence (missed by the opener check) and a question can be confident
    // (counted, but harmless, by the saturation check) — only their overlap is the
    // specific weakness this rule isolates.
    if (dlg431.length >= 12) {
      const hedgeRe431 = /\b(maybe|perhaps|probably|possibly|i think|i guess|i suppose|kind of|sort of|i mean|or something|i dunno|i don['’]t know)\b/i;
      const hedgedQ431 = dlg431.filter(l => l.trimEnd().endsWith('?') && hedgeRe431.test(l)).length;
      if (hedgedQ431 / dlg431.length > 0.20) {
        issues.push({
          location: 'Dialogue throughout',
          rule: 'DIALOGUE_HEDGED_QUESTION_FLOOD',
          severity: 'minor',
          description: `${hedgedQ431} of ${dlg431.length} dialogue lines (${Math.round(hedgedQ431 / dlg431.length * 100)}%) are both hedged AND phrased as questions ("Maybe we should… go?", "I think it's the right one?"). The doubly-tentative line qualifies itself twice over — it neither asserts nor commits to asking — so characters who default to it can never apply pressure. The cumulative effect is a scene that perpetually defers: no one states, no one demands, every beat dissolves into a softened query.`,
          suggestedFix: 'Pick one register per line and commit to it. Turn a hedged question into a clean assertion ("Maybe we should go?" → "We\'re going.") or a direct question ("Is this the right one?"), reserving the tentative-query form for the rare moment a character is genuinely both unsure and probing. Conviction — even wrong conviction — gives a scene the forward pressure that perpetual hedging drains.',
        });
      }
    }
  }

  // ── Wave 445: DIALOGUE_QUESTION_RUN, ACTION_SCENE_INTRO_HEAVY, DIALOGUE_DECLARATIVE_AFTERMATH_QUESTION ──
  {
    const dlg445: string[] = [];
    let inDlg445 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg445 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg445 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg445 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg445) dlg445.push(t);
    }

    // DIALOGUE_QUESTION_RUN (run-based, ≥10 dialogue lines, maxRun≥4): Four or more consecutive
    // dialogue lines each end with "?" — nobody in the exchange answers anything across the run.
    // Questions beget questions without resolution, assertion, or commitment, draining the scene
    // of forward direction. A run of 4+ consecutive question-ending lines is a local accumulation
    // pattern that a global proportion check can entirely miss.
    // Distinctness: DIALOGUE_INTERROGATIVE_SATURATION (Wave 294) fires when >30% of ALL lines
    // end with "?" — a global rate. DIALOGUE_HEDGED_QUESTION_FLOOD (Wave 431) is a co-occurrence
    // mode (hedge + question simultaneously). DIALOGUE_I_OPENER_RUN (Wave 431) is run-based but
    // on "I" openers, not "?"-closers. This is the FIRST run-based check on the question-mark
    // channel: a global rate of 29% would miss 4 consecutive questions at the start of a scene.
    if (dlg445.length >= 10) {
      let curQ445a = 0, maxQ445a = 0;
      for (const line of dlg445) {
        if (line.trimEnd().endsWith('?')) {
          if (++curQ445a > maxQ445a) maxQ445a = curQ445a;
        } else {
          curQ445a = 0;
        }
      }
      if (maxQ445a >= 4) {
        issues.push({
          location: 'Dialogue exchange',
          rule: 'DIALOGUE_QUESTION_RUN',
          severity: 'minor',
          description: `${maxQ445a} consecutive dialogue lines each end with a question mark — nobody answers anything across the run. When questions beget questions in an unbroken chain, the scene never moves forward: each line defers dramatic pressure back to the other speaker, creating a conversational loop with no resolution, assertion, or commitment. The exchange reads as mutual interrogation rather than dramatic encounter.`,
          suggestedFix: `Break the question chain by having at least one line assert, state, or commit rather than ask. The strongest dramatic move after a question is often a statement — not necessarily an answer, but an unexpected declaration that reframes the inquiry. Even "I don't care" or "That's not what matters" advances the scene more than another question.`,
        });
      }
    }

    // ACTION_SCENE_INTRO_HEAVY (average/aggregate × positional, ≥6 qualifying scenes, avgIntro >10w,
    // avgIntro > avgBody × 2.0): The first action line in each scene (when it precedes any dialogue)
    // averages ≥2× the word count of all subsequent action lines in those same scenes. Scene
    // introductions are systematically over-verbose: the establishing description is bloated relative
    // to the scene's ongoing prose. A well-paced screenplay enters scenes already in motion and trusts
    // the drama to fill the space. When scene openings are consistently heavier than the rest, the
    // writer front-loads each scene with an exhaustive establishing shot rather than a lean entry.
    // Distinctness: No existing check compares word count of the FIRST action line per scene to
    // the REST of that scene's action lines. All existing length checks audit the GLOBAL action-line
    // corpus without distinguishing line position within the scene. This is the first positional/
    // average check in voice.ts: comparing the establishing vs. body action lines.
    {
      const siIntros445: number[] = [];
      const siBodys445: number[] = [];
      let siInScene445 = false;
      let siFirstActSeen445 = false;
      let siDlgBeforeAct445 = false;
      let siInDlg445 = false;
      for (const line of allLines) {
        const t = line.trim();
        if (!t) { siInDlg445 = false; continue; }
        if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) {
          siInScene445 = true;
          siFirstActSeen445 = false;
          siDlgBeforeAct445 = false;
          siInDlg445 = false;
          continue;
        }
        if (!siInScene445) continue;
        if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) {
          siInDlg445 = true;
          if (!siFirstActSeen445) siDlgBeforeAct445 = true;
          continue;
        }
        if (/^\(/.test(t)) continue;
        if (siInDlg445) continue;
        // Action line
        const wc445 = t.split(/\s+/).filter(Boolean).length;
        if (!siFirstActSeen445 && !siDlgBeforeAct445) {
          siIntros445.push(wc445);
          siFirstActSeen445 = true;
        } else {
          siBodys445.push(wc445);
          if (!siFirstActSeen445) siFirstActSeen445 = true;
        }
      }
      const qualCount445 = Math.min(siIntros445.length, siIntros445.length); // = siIntros445.length
      if (qualCount445 >= 6 && siBodys445.length >= 6) {
        const avgIntro445 = siIntros445.reduce((s, v) => s + v, 0) / siIntros445.length;
        const avgBody445 = siBodys445.reduce((s, v) => s + v, 0) / siBodys445.length;
        if (avgIntro445 > 10 && avgBody445 > 0 && avgIntro445 > avgBody445 * 2.0) {
          issues.push({
            location: `Scene-opening action lines (${qualCount445} scenes checked)`,
            rule: 'ACTION_SCENE_INTRO_HEAVY',
            severity: 'minor',
            description: `Across ${qualCount445} scenes, the first action line averages ${avgIntro445.toFixed(1)} words — ${(avgIntro445 / avgBody445).toFixed(1)}× the ${avgBody445.toFixed(1)}-word average of subsequent action lines in those scenes. Scene introductions are systematically heavier than the rest of the prose. A well-paced screenplay enters scenes in motion: the establishing description should be lean, trusting the drama to fill the space. When every scene-opening line is a verbose inventory, the script habitually front-loads with an exhaustive interior shot rather than an efficient point-of-entry.`,
            suggestedFix: 'Trim the opening action line of each scene to its single most important visual detail. Cut to the establishing fact and let the scene begin — the audience infers the rest of the room from what is dramatic rather than what is listed. Reserve long establishing description for the story\'s opening scene; for subsequent scenes, enter mid-motion.',
          });
        }
      }
    }

    // DIALOGUE_DECLARATIVE_AFTERMATH_QUESTION (sequence/aftermath, ≥10 dialogue lines, ≥3 qualifying
    // declarative lines): Every declarative dialogue line (not ending in "?" or "!") that is not the
    // last dialogue line is immediately followed by a question-ending line. When every statement
    // automatically triggers an interrogation, dialogue collapses into an interrogation loop: nothing
    // a character asserts is allowed to land — it is always met with another question rather than a
    // response that advances the scene or accepts the assertion.
    // Distinctness: DIALOGUE_QUESTION_RUN (this wave) fires when ≥4 CONSECUTIVE question-ending lines
    // cluster locally. DIALOGUE_DECLARATIVE_AFTERMATH_QUESTION is orthogonal: it can fire with only
    // alternating declarative/question pairs (maxRun=1, never triggering QUESTION_RUN), as long as
    // EVERY declarative is followed by a question. No existing check tracks what follows a statement;
    // this is the first aftermath check that pivots on the declarative line rather than the question.
    if (dlg445.length >= 10) {
      const qualDecl445c: number[] = [];
      for (let i = 0; i < dlg445.length - 1; i++) {
        const t = dlg445[i].trimEnd();
        if (!t.endsWith('?') && !t.endsWith('!')) qualDecl445c.push(i);
      }
      if (qualDecl445c.length >= 3 && qualDecl445c.every(qi => dlg445[qi + 1].trimEnd().endsWith('?'))) {
        issues.push({
          location: `Dialogue — declarative aftermath (${qualDecl445c.length} statements, each immediately followed by a question)`,
          rule: 'DIALOGUE_DECLARATIVE_AFTERMATH_QUESTION',
          severity: 'minor',
          description: `Every declarative dialogue line (${qualDecl445c.length} lines not ending in "?" or "!") is immediately followed by a question — no statement is ever allowed to land without triggering an interrogation. When every assertion is met with a question rather than a response that engages, accepts, or redirects it, dialogue becomes a loop: the script converts every moment of commitment into another round of inquiry, draining the cumulative forward pressure that declarations build.`,
          suggestedFix: `Let some declarations be met with responses that engage rather than interrogate: an agreement, a counter-statement, a silence-then-action. Not every assertion needs to provoke a question; some of the most dramatically charged moments occur when a character's statement is simply received — acknowledged, deflected, or ignored — rather than immediately questioned. Reserve the declarative-triggers-question pattern for interrogation scenes where the power dynamic demands it.`,
        });
      }
    }
  }

  // ── Wave 459: DIALOGUE_ASSERTION_RUN, DIALOGUE_SINGLE_CHAR_DOMINATION, DIALOGUE_MONOLOGUE_UNPROMPTED ──
  {
    const dlg459: string[] = [];
    let inDlg459 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg459 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg459 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg459 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg459) dlg459.push(t);
    }

    // DIALOGUE_ASSERTION_RUN — Run-based × declarative dialogue (≥10 total dialogue lines,
    // max run of ≥5 consecutive lines each ending without "?" or "!"). A sustained stretch where
    // nobody questions, exclaims, or challenges anything — the conversation becomes a monotone
    // assertion avalanche with no interrogation and no intensity. While individual declarative
    // lines are the backbone of dialogue, five or more in unbroken succession signal that the
    // exchange has collapsed into a single-register flow: all statement, no probe.
    // Distinct from DIALOGUE_QUESTION_RUN (Wave 445: run of ≥4 consecutive questions — the
    // interrogative-polarity mirror; this checks declarative-polarity runs), DIALOGUE_INTERROGATIVE_
    // SATURATION (Wave 294: global proportion >30% ending in '?' — this measures a local run of
    // declarations, not global question density), and DIALOGUE_DECLARATIVE_AFTERMATH_QUESTION
    // (Wave 445: aftermath pattern — every declaration followed by a question; this fires when
    // declarations run WITHOUT questions following them).
    if (dlg459.length >= 10) {
      let maxAssertRun459a = 0, curAssertRun459a = 0;
      let maxAssertStart459a = -1, curAssertStart459a = -1;
      for (let i = 0; i < dlg459.length; i++) {
        const t = dlg459[i].trimEnd();
        if (!t.endsWith('?') && !t.endsWith('!')) {
          if (curAssertRun459a === 0) curAssertStart459a = i;
          if (++curAssertRun459a > maxAssertRun459a) {
            maxAssertRun459a = curAssertRun459a;
            maxAssertStart459a = curAssertStart459a;
          }
        } else { curAssertRun459a = 0; }
      }
      if (maxAssertRun459a >= 5) {
        issues.push({
          location: `Dialogue lines ${maxAssertStart459a + 1}–${maxAssertStart459a + maxAssertRun459a} — assertion run (${maxAssertRun459a} consecutive declarative lines)`,
          rule: 'DIALOGUE_ASSERTION_RUN',
          severity: 'minor',
          description: `${maxAssertRun459a} consecutive dialogue lines each end declaratively — no question, no exclamation — creating a sustained assertion avalanche where nobody probes, nobody challenges, and nobody expresses intensity. While declarative dialogue is the backbone of conversation, a run of ${maxAssertRun459a} statements without any interrogation or charged speech signals that the exchange has collapsed into a single emotional register: all assertion, no inquiry. Real conversation — even in conflict — involves the occasional question (however rhetorical) that breaks the monotony of uninterrupted statement and invites the audience to shift their reading from "listening to claims" to "wondering what comes next."`,
          suggestedFix: `Break the declaration run near dialogue line ${maxAssertStart459a + 1} by inserting at least one line that ends in "?" or "!" within the stretch of ${maxAssertRun459a} statements. Even a rhetorical question ("And you think that matters?") or a charged exclamation changes the register enough to prevent the exchange from feeling like a debate transcript. The variation of end-punctuation creates rhythmic micro-contrast in how the audience reads each line.`,
        });
      }
    }

    // DIALOGUE_SINGLE_CHAR_DOMINATION — Underweight/bloat × dialogue character distribution (≥3
    // speaking characters, ≥10 total dialogue lines, dominant speaker has >70% of all lines). One
    // character monopolizes the conversation while the others serve as mere audience — essentially
    // delivering a solo performance in multi-character scenes. A story that uses 3+ speaking
    // characters but routes 70%+ of all dialogue through one of them suggests that the other
    // characters exist primarily as reactive props rather than as independent voices with their
    // own dramatic weight.
    // Distinct from UNDIFFERENTIATED_CHARACTER_VOICES (Wave 138: characters sound alike stylistically
    // — similarity of vocabulary; this checks quantity of lines, not voice distinctiveness), and from
    // CHARACTER_NAME_MONOTONY_IN_ACTION (Wave 294: one name in >50% of action lines — action staging,
    // not dialogue quantity).
    {
      const charLineCounts459b = new Map<string, number>();
      let curChar459b: string | null = null;
      for (const line of allLines) {
        const t = line.trim();
        if (!t) { curChar459b = null; continue; }
        if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { curChar459b = null; continue; }
        if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) {
          curChar459b = t.replace(/\s*\(.*\)$/, '').trim();
          continue;
        }
        if (/^\(/.test(t)) continue;
        if (curChar459b) {
          charLineCounts459b.set(curChar459b, (charLineCounts459b.get(curChar459b) ?? 0) + 1);
        }
      }
      const totalDlgLines459b = [...charLineCounts459b.values()].reduce((s, v) => s + v, 0);
      if (charLineCounts459b.size >= 3 && totalDlgLines459b >= 10) {
        const dominantEntry459b = [...charLineCounts459b.entries()].sort((a, b) => b[1] - a[1])[0];
        if (dominantEntry459b && dominantEntry459b[1] / totalDlgLines459b > 0.70) {
          const pct459b = (dominantEntry459b[1] / totalDlgLines459b * 100).toFixed(0);
          issues.push({
            location: `${dominantEntry459b[0]} — ${pct459b}% of all dialogue (${dominantEntry459b[1]}/${totalDlgLines459b} lines across ${charLineCounts459b.size} speakers)`,
            rule: 'DIALOGUE_SINGLE_CHAR_DOMINATION',
            severity: 'minor',
            description: `${dominantEntry459b[0]} delivers ${dominantEntry459b[1]} of ${totalDlgLines459b} total dialogue lines (${pct459b}%) — more than 70% of all speech across ${charLineCounts459b.size} speaking characters. The other characters function primarily as reactive props rather than as independent voices. A story with ${charLineCounts459b.size} speaking characters but with 70%+ of dialogue concentrated in one suggests a fundamentally solo performance: the other characters exist to give ${dominantEntry459b[0]} reasons to speak rather than having their own dramatic weight, goals, or verbal personality.`,
            suggestedFix: `Redistribute dialogue across the ${charLineCounts459b.size} speaking characters: give each supporting character at least one scene where they drive the exchange rather than responding. A character who only reacts never develops an independent voice — and the audience never learns to read them as a distinct personality. Even two or three additional lines per character, placed at key moments, can shift a reactive role into a participant.`,
          });
        }
      }
    }

    // DIALOGUE_MONOLOGUE_UNPROMPTED — Backward-cause × long speech (≥8 total dialogue lines,
    // ≥3 long speeches ≥10 words, none preceded within 2 dialogue lines by a question). Every
    // extended declaration arrives without any prior inquiry to provoke it — the characters expand
    // spontaneously without being asked. A long speech is dramatically stronger when it is prompted:
    // a question that forces the answer, a challenge that demands a response, an accusation that
    // must be refuted. When every long speech arrives causeless (no prior question), the characters
    // appear to be delivering pre-planned arguments rather than responding to each other in the
    // moment. Backward-cause mode × long speech length. First backward-cause check in this pass.
    // Distinct from DIALOGUE_LENGTH_OUTLIER (Wave 431: single-peak × word count — one towering
    // monologue; this checks ALL long speeches for their upstream cause, not just the peak),
    // DIALOGUE_QUESTION_RUN (run-based × question channel — a different trigger), and DIALOGUE_
    // DECLARATIVE_AFTERMATH_QUESTION (Wave 445: sequence/aftermath — what follows declarations;
    // this is backward-cause checking what PRECEDES long speeches).
    if (dlg459.length >= 8) {
      const longSpeeches459c = dlg459
        .map((t, i) => ({ t, i, wc: t.split(/\s+/).filter(Boolean).length }))
        .filter(x => x.wc >= 10);
      if (longSpeeches459c.length >= 3) {
        const anyPrecededByQuestion459c = longSpeeches459c.some(({ i }) => {
          for (let off = 1; off <= 2; off++) {
            const prevIdx = i - off;
            if (prevIdx >= 0 && dlg459[prevIdx].trimEnd().endsWith('?')) return true;
          }
          return false;
        });
        if (!anyPrecededByQuestion459c) {
          issues.push({
            location: `${longSpeeches459c.length} long speech(es) ≥10 words — no prior question found within 2 lines`,
            rule: 'DIALOGUE_MONOLOGUE_UNPROMPTED',
            severity: 'minor',
            description: `None of the script's ${longSpeeches459c.length} long dialogue speeches (≥10 words) is preceded within the prior 2 dialogue lines by a question — every extended declaration arrives spontaneously, without inquiry to provoke it. Long speeches are dramatically strongest when they are caused: a question that demands an answer, a challenge that forces a response, an accusation that requires refutation. When every extended statement arrives without prior prompting, the characters appear to be delivering pre-planned arguments rather than responding to each other in the moment — the dialogue becomes a series of parallel monologues rather than an exchange. Even a rhetorical question ("So what was I supposed to do?") functions as a cause that makes the following expansion feel earned.`,
            suggestedFix: `Before at least one long speech, add a question that provokes it: the preceding character's line can be a challenge, an open question, or even a demand for justification. The question-then-long-response pattern is the most natural dialogue unit for exposition, argument, and revelation — the question gives the audience permission to receive a longer speech because it signals that the speaker was asked, not that they chose to lecture. Even a one-word prompt ("Why?") preceding a multi-sentence response changes the register from monologue to dialogue.`,
          });
        }
      }
    }
  }

  // ── Wave 473: DIALOGUE_QUESTION_ZONE_CLUSTER, DIALOGUE_OPENING_ZONE_LONG_ABSENT, DIALOGUE_PER_CHARACTER_LENGTH_SKEW ──
  {
    // DIALOGUE_QUESTION_ZONE_CLUSTER — Distribution/timing × interrogative channel (≥12
    // dialogue lines, ≥4 question-ending lines, >75% of questions fall within a single
    // third of the dialogue script). When interrogatives cluster into one positional zone
    // instead of arising organically from dramatic pressure throughout, the script signals
    // that interrogation is a phase rather than a naturally distributed mode: other zones
    // feel like assertion territory where nobody asks anything, while the cluster zone
    // reads as an interrogation chamber.
    // Distinct from: DIALOGUE_INTERROGATIVE_SATURATION (Wave 294: global proportion >30% —
    // measures rate, not when questions appear), DIALOGUE_QUESTION_RUN (Wave 445: ≥4
    // consecutive questions — local cluster within adjacent lines, not zonal distribution),
    // DIALOGUE_HEDGED_QUESTION_FLOOD (Wave 431: co-occurrence of hedge+question — a different
    // signal pair), DIALOGUE_DECLARATIVE_AFTERMATH_QUESTION (Wave 445: sequence/aftermath —
    // what follows a declaration, not where in the script questions appear).
    const allDlg473a: string[] = [];
    let inDlg473a = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg473a = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg473a = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg473a = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg473a) allDlg473a.push(t);
    }
    if (allDlg473a.length >= 12) {
      const questionIdxs473a = allDlg473a
        .map((t, i) => ({ t, i }))
        .filter(x => x.t.trimEnd().endsWith('?'))
        .map(x => x.i);
      if (questionIdxs473a.length >= 4) {
        const third473a = Math.floor(allDlg473a.length / 3);
        const firstZone473a = questionIdxs473a.filter(i => i < third473a).length;
        const midZone473a = questionIdxs473a.filter(i => i >= third473a && i < 2 * third473a).length;
        const lastZone473a = questionIdxs473a.filter(i => i >= 2 * third473a).length;
        const maxZone473a = Math.max(firstZone473a, midZone473a, lastZone473a);
        if (maxZone473a / questionIdxs473a.length > 0.75) {
          const zone473aName = firstZone473a === maxZone473a ? 'opening' : midZone473a === maxZone473a ? 'middle' : 'closing';
          issues.push({
            location: `Dialogue — ${maxZone473a}/${questionIdxs473a.length} questions in the ${zone473aName} third`,
            rule: 'DIALOGUE_QUESTION_ZONE_CLUSTER',
            severity: 'minor',
            description: `${maxZone473a} of ${questionIdxs473a.length} question-ending dialogue lines (${(maxZone473a / questionIdxs473a.length * 100).toFixed(0)}%) fall within the ${zone473aName} third of the dialogue — interrogatives cluster in one positional zone instead of arising organically throughout. When questions are ghettoized into one segment, the script signals that interrogation is a phase rather than a natural mode that responds to dramatic pressure: the other zones feel like assertion territory where nobody asks anything, while the question-cluster zone reads as an interrogation chamber. Dynamic dialogue distributes inquiry according to dramatic need, not position.`,
            suggestedFix: `Redistribute questions through the script: move at least one or two questions from the ${zone473aName} cluster to zones where they are currently absent. The goal is organic distribution — questions should arise wherever characters genuinely need to know something, not clump together as if interrogation is its own scene type. Consider where in the other zones a character would realistically be uncertain, challenged, or curious, and plant questions there.`,
          });
        }
      }
    }

    // DIALOGUE_OPENING_ZONE_LONG_ABSENT — Zone presence/absence × length × opening zone (≥12
    // dialogue lines, zero long speeches ≥10 words in the first 25% of dialogue, while ≥3 long
    // speeches ≥10 words appear in the remaining 75%). The opening dialogue zone establishes
    // the register for how characters use language: if the entire opening contains only terse
    // fragments while the rest of the script features extended speeches, the register shift is
    // misleading — the audience reads the opening as establishing that characters are guarded or
    // economical, then encounters an entirely different verbal mode later without dramatic
    // justification for the transition.
    // Distinct from: DIALOGUE_LENGTH_OUTLIER (Wave 431: single-peak isolation — one towering
    // speech vs. corpus mean; doesn't check zone distribution of length), DIALOGUE_MONOLOGUE_
    // UNPROMPTED (Wave 459: backward-cause — whether long speeches have a prior question; doesn't
    // check WHICH zone they occupy), DIALOGUE_MONOSYLLABIC_FLOOD (Wave 417: global proportion ≤2w
    // across all dialogue — brevity rate, not zone-specific absence of long speeches).
    const allDlg473b: string[] = [];
    let inDlg473b = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg473b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg473b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg473b = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg473b) allDlg473b.push(t);
    }
    if (allDlg473b.length >= 12) {
      const openEndIdx473b = Math.floor(allDlg473b.length * 0.25);
      const wordCounts473b = allDlg473b.map(t => t.split(/\s+/).filter(Boolean).length);
      const openingLong473b = wordCounts473b.slice(0, openEndIdx473b).filter(wc => wc >= 10).length;
      const restLong473b = wordCounts473b.slice(openEndIdx473b).filter(wc => wc >= 10).length;
      if (openingLong473b === 0 && restLong473b >= 3) {
        issues.push({
          location: `Dialogue — first ${openEndIdx473b} lines have no speeches ≥10 words; ${restLong473b} appear in the remaining ${allDlg473b.length - openEndIdx473b} lines`,
          rule: 'DIALOGUE_OPENING_ZONE_LONG_ABSENT',
          severity: 'minor',
          description: `The first 25% of dialogue lines (${openEndIdx473b} lines) contain no speech of 10 or more words, while ${restLong473b} long speeches (≥10 words) appear in the remaining 75%. The opening dialogue register establishes how characters use language: when the opening is entirely terse fragments and later dialogue shifts to extended speeches, the audience is given a false impression of the characters' verbal register — they appear guarded or economical, then suddenly expansive without a dramatic catalyst that would justify the shift. Either the opening misrepresents the characters, or the later speeches arrive without earned context.`,
          suggestedFix: `Either move one or two long speeches earlier — to the first 25% of dialogue — to establish that extended speech is part of these characters' register from the start, or add a clear dramatic trigger (a revelation, confrontation, or emotional rupture) that explicitly motivates the transition from terse opening to extended later speeches. The audience should understand WHY the characters suddenly speak at length after a terse opening.`,
        });
      }
    }

    // DIALOGUE_PER_CHARACTER_LENGTH_SKEW — Average/aggregate × per-character statistics (≥3
    // characters with ≥3 dialogue lines each, max per-character average speech length ≥3× the
    // min per-character average speech length). One character consistently speaks in extended
    // passages while another speaks only in fragments — not as a deliberate characterization
    // choice but as a structural void where the writing gave one character verbal architecture
    // and left another without it. In a genuine dramatic exchange, characters may be terse or
    // expansive by design, but a 3× gap in average speech length across all their lines signals
    // that one character exists primarily as a conversational prompt for another's speeches.
    // Distinct from: DIALOGUE_LENGTH_OUTLIER (Wave 431: single-peak isolation — one towering
    // speech vs. corpus mean; aggregate check, not per-character), DIALOGUE_SINGLE_CHAR_
    // DOMINATION (Wave 459: underweight/bloat × line count — one speaker has >70% of LINES;
    // this checks average WORD COUNT per speech per character, not line quantity), DIALOGUE_
    // MONOSYLLABIC_FLOOD (Wave 417: global proportion ≤2w — rate across all dialogue, not a
    // per-character average-length comparison between the longest and shortest speakers).
    {
      const eligChars473c = [...charProfiles.entries()].filter(([, p]) => p.lineCount >= 3);
      if (eligChars473c.length >= 3) {
        const charAvgLens473c = eligChars473c.map(([name, p]) => {
          const avg = p.wordCountsPerLine.reduce((s, v) => s + v, 0) / p.wordCountsPerLine.length;
          return { name, avg };
        });
        const maxAvg473c = Math.max(...charAvgLens473c.map(x => x.avg));
        const minAvg473c = Math.min(...charAvgLens473c.map(x => x.avg));
        if (minAvg473c > 0 && maxAvg473c / minAvg473c >= 3.0) {
          const maxChar473c = charAvgLens473c.find(x => x.avg === maxAvg473c)!;
          const minChar473c = charAvgLens473c.find(x => x.avg === minAvg473c)!;
          issues.push({
            location: `${maxChar473c.name} (avg ${maxAvg473c.toFixed(1)} words/speech) vs. ${minChar473c.name} (avg ${minAvg473c.toFixed(1)} words/speech)`,
            rule: 'DIALOGUE_PER_CHARACTER_LENGTH_SKEW',
            severity: 'minor',
            description: `${maxChar473c.name}'s dialogue averages ${maxAvg473c.toFixed(1)} words per speech — ${(maxAvg473c / minAvg473c).toFixed(1)}× the length of ${minChar473c.name}'s average of ${minAvg473c.toFixed(1)} words. When one character consistently speaks in extended passages while another consistently speaks in fragments, the imbalance suggests that the shorter-speaking character exists primarily as a prompt — an interlocutor whose verbal register was never developed. In a genuine dramatic exchange, characters may be terse or expansive by design, but a 3× gap in average speech length (computed across all their lines, not just one outlier) signals a structural void rather than a characterization choice.`,
            suggestedFix: `Give ${minChar473c.name} at least two or three more substantial speeches — moments where they develop a thought, articulate a position, or expand an idea — to establish that they are capable of extended expression when the scene demands it. Conversely, if ${maxChar473c.name} is deliberately written as a monologist and ${minChar473c.name} as terse, make that contrast explicitly motivated: a scene where the terse character is forced to expand reveals character through violation of their habitual register and shows that both voices have dramatic capacity.`,
          });
        }
      }
    }
  }

  // ── Wave 487: DIALOGUE_MONOLOGUE_AFTERMATH_TERSE, DIALOGUE_EXCLAMATION_ZONE_CLUSTER, DIALOGUE_CLOSING_ZONE_QUESTION_ABSENT ──
  {
    // DIALOGUE_MONOLOGUE_AFTERMATH_TERSE — sequence/aftermath × long speech → response brevity.
    // ≥8 dialogue lines, ≥2 long speeches (≥10 words) not at the last position. For each long
    // speech, check if the immediately following dialogue line is ≤2 words. If EVERY long speech
    // is followed by a ≤2-word response, expansion never earns a substantive reply — the script
    // always compresses immediately after a monologue, leaving the extended thought unanswered.
    // Distinct from: DIALOGUE_MONOLOGUE_UNPROMPTED (Wave 459: backward-cause — whether the long
    // speech was preceded by a question; this checks what follows it), DIALOGUE_MONOSYLLABIC_FLOOD
    // (Wave 417: global proportion of ≤2-word lines regardless of what precedes them; this fires
    // only when brevity specifically follows a long speech), DIALOGUE_DECLARATIVE_AFTERMATH_QUESTION
    // (Wave 445: what kind of line follows a declarative; this checks length of response after a
    // long speech), DIALOGUE_LENGTH_OUTLIER (Wave 431: single-peak on word count, not aftermath).
    const allDlg487a: string[] = [];
    let inDlg487a = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg487a = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg487a = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg487a = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg487a) allDlg487a.push(t);
    }
    if (allDlg487a.length >= 8) {
      const wc487a = allDlg487a.map(t => t.split(/\s+/).filter(Boolean).length);
      const longIdxs487a = wc487a
        .map((wc, i) => ({ wc, i }))
        .filter(({ wc, i }) => wc >= 10 && i < allDlg487a.length - 1)
        .map(({ i }) => i);
      if (longIdxs487a.length >= 2) {
        const allTerse487a = longIdxs487a.every(i => wc487a[i + 1] <= 2);
        if (allTerse487a) {
          issues.push({
            location: `Dialogue — ${longIdxs487a.length} long speeches (≥10 words) all followed by ≤2-word responses`,
            rule: 'DIALOGUE_MONOLOGUE_AFTERMATH_TERSE',
            severity: 'minor',
            description: `Every long speech (≥10 words) in the script is immediately followed by a response of ≤2 words — ${longIdxs487a.length} instances. When every extended expression earns only a grunt or a fragment in reply, the story signals that monologues are announcements, not invitations: the character speaks at length, and the world shrugs. Dramatic expansion should sometimes provoke substantive engagement — a counter-argument, a question, an emotional response of comparable weight. A pattern of terse-aftermath-always collapses the conversational register into a formulaic loop of monologue and dismissal.`,
            suggestedFix: `After at least one extended speech, give the responding character a substantive reply: a counter-argument, a question, or an emotional reaction of ≥6 words. The response doesn't need to match the monologue's length, but it should signal that the content of the long speech was heard and engaged with rather than absorbed in silence or shrugged off.`,
          });
        }
      }
    }

    // DIALOGUE_EXCLAMATION_ZONE_CLUSTER — Distribution/timing × exclamation-mark channel × thirds.
    // ≥12 dialogue lines, ≥4 !-ending dialogue lines. Divide dialogue into three equal thirds.
    // If >75% of exclamation-ending lines fall in a single third → fire. Exclamation marks signal
    // heightened intensity: declarations, commands, and outbursts. When exclamatory energy clusters
    // in one positional zone, the script maps emotional intensity onto a single structural segment
    // instead of distributing it according to dramatic pressure.
    // Distinct from: DIALOGUE_QUESTION_ZONE_CLUSTER (Wave 473: same analytical mode on the ? channel;
    // this covers the ! channel, completing the punctuation zone distribution pair), ALL-CAPS_SHOUT
    // (Wave 308: ≥3 lines with an all-caps word — visual typography signal, not end-punctuation),
    // EM_DASH_DIALOGUE_FLOOD (Wave 308: global proportion of interruption dashes — different signal
    // and no zone dimension), DIALOGUE_EMPHATIC_PUNCTUATION_FLOOD (Wave 375: >20% of lines carry !!
    // or ?! — doubled marks, not single !, and a proportion check not a zone check).
    const allDlg487b: string[] = [];
    let inDlg487b = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg487b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg487b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg487b = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg487b) allDlg487b.push(t);
    }
    if (allDlg487b.length >= 12) {
      const exclIdxs487b = allDlg487b
        .map((t, i) => ({ t, i }))
        .filter(({ t }) => t.trimEnd().endsWith('!'))
        .map(({ i }) => i);
      if (exclIdxs487b.length >= 4) {
        const third487b = Math.floor(allDlg487b.length / 3);
        const zone1487b = exclIdxs487b.filter(i => i < third487b).length;
        const zone2487b = exclIdxs487b.filter(i => i >= third487b && i < 2 * third487b).length;
        const zone3487b = exclIdxs487b.filter(i => i >= 2 * third487b).length;
        const maxZone487b = Math.max(zone1487b, zone2487b, zone3487b);
        if (maxZone487b / exclIdxs487b.length > 0.75) {
          const zoneName487b = zone1487b === maxZone487b ? 'opening' : zone2487b === maxZone487b ? 'middle' : 'closing';
          issues.push({
            location: `Dialogue — ${maxZone487b}/${exclIdxs487b.length} exclamation lines in the ${zoneName487b} third`,
            rule: 'DIALOGUE_EXCLAMATION_ZONE_CLUSTER',
            severity: 'minor',
            description: `${maxZone487b} of ${exclIdxs487b.length} exclamation-ending dialogue lines (${Math.round(maxZone487b / exclIdxs487b.length * 100)}%) fall within the ${zoneName487b} third of the dialogue. Emotional intensity — declarations, outbursts, commands — is concentrated in one structural zone rather than distributed by dramatic pressure. The other two zones run flat, and then the ${zoneName487b} third erupts with heightened exclamatory energy. When exclamatory speech is zonal rather than organic, the script treats intensity as a phase rather than a dramatic response.`,
            suggestedFix: `Move at least one or two exclamatory lines from the ${zoneName487b} cluster into the zones where exclamation is currently absent. Heightened intensity should arise wherever the drama demands it — wherever a character is genuinely moved, angered, or relieved — not be reserved for a single segment of the script.`,
          });
        }
      }
    }

    // DIALOGUE_CLOSING_ZONE_QUESTION_ABSENT — Zone presence/absence × closing zone × question absence.
    // ≥12 dialogue lines total, ≥3 question-ending lines exist in the corpus, but NONE appear in
    // the final 25% of dialogue lines. The script uses interrogatives throughout but goes entirely
    // question-free in the closing stretch — the dialogue's final quarter contains no uncertainty,
    // no inquiry, no dramatic neediness. This is the closing-zone complement of DIALOGUE_OPENING_
    // ZONE_LONG_ABSENT and the zone-absence mirror of DIALOGUE_QUESTION_ZONE_CLUSTER.
    // Distinct from: DIALOGUE_QUESTION_ZONE_CLUSTER (Wave 473: fires when questions cluster in ONE
    // zone; this fires when questions are ABSENT from a specific zone — zero occurrence, not
    // clustering); DIALOGUE_OPENING_ZONE_LONG_ABSENT (Wave 473: different zone, different signal —
    // opening, long speeches); DIALOGUE_INTERROGATIVE_SATURATION (Wave 294: global proportion >30%
    // — measures rate, not zonal distribution); DIALOGUE_QUESTION_RUN (Wave 445: consecutive local
    // cluster, not zone-based).
    const allDlg487c: string[] = [];
    let inDlg487c = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg487c = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg487c = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg487c = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg487c) allDlg487c.push(t);
    }
    if (allDlg487c.length >= 12) {
      const closingStart487c = Math.floor(allDlg487c.length * 0.75);
      const totalQuestions487c = allDlg487c.filter(t => t.trimEnd().endsWith('?')).length;
      const closingQuestions487c = allDlg487c.slice(closingStart487c).filter(t => t.trimEnd().endsWith('?')).length;
      if (totalQuestions487c >= 3 && closingQuestions487c === 0) {
        issues.push({
          location: `Dialogue — ${totalQuestions487c} questions exist but none in the final 25% (${allDlg487c.length - closingStart487c} lines)`,
          rule: 'DIALOGUE_CLOSING_ZONE_QUESTION_ABSENT',
          severity: 'minor',
          description: `The script contains ${totalQuestions487c} question-ending dialogue lines, but none appear in the final 25% of dialogue (the last ${allDlg487c.length - closingStart487c} lines). The closing stretch of dialogue is entirely question-free — there is no uncertainty, inquiry, or dramatic neediness in the final register. When the closing zone goes interrogative-silent while the rest of the script uses questions freely, the dialogue closes in a posture of pure assertion: characters stop asking and start declaring. If this is a deliberate choice (earned resolution), make it visible with a scene where a character explicitly stops asking. If not, the closing is tonally flat.`,
          suggestedFix: `Add at least one question in the final 25% of dialogue lines — a character asking for confirmation, expressing residual uncertainty, or posing the final question that the story answers (or leaves open). Closing questions are among the most resonant in a script because they land last; a story that closes on assertion alone can feel sealed rather than expansive.`,
        });
      }
    }
  }

  // ── Wave 501: DIALOGUE_QUESTION_AFTERMATH_TERSE, DIALOGUE_OPENING_ZONE_EXCLAMATION_ABSENT,
  //              DIALOGUE_PEAK_LONG_EARLY ────────────────────────────────────────────────────
  {
    // DIALOGUE_QUESTION_AFTERMATH_TERSE (sequence/aftermath × question → response brevity, ≥8
    // dialogue lines, ≥2 question-ending lines not at last position, ALL followed by ≤2-word
    // responses): Every interrogative line earns only a grunt or a fragment in return — questions
    // never provoke substantive engagement. Where DIALOGUE_MONOLOGUE_AFTERMATH_TERSE (Wave 487)
    // fires when long speeches are dismissed by terse replies, this fires when QUESTIONS are
    // consistently dismissed. A question is an invitation to the scene partner; when every invitation
    // receives a monosyllabic deflection, the dialogue signals that inquiry is futile — nobody truly
    // wants to know anything. Sequence/aftermath mode × question trigger × response brevity. Distinct
    // from DIALOGUE_MONOLOGUE_AFTERMATH_TERSE (Wave 487: long speech trigger, not question), DIALOGUE_
    // DECLARATIVE_AFTERMATH_QUESTION (Wave 445: declarative → question direction — opposite temporal
    // trigger), DIALOGUE_QUESTION_RUN (Wave 445: consecutive questions, not aftermath of a question),
    // DIALOGUE_INTERROGATIVE_SATURATION (Wave 294: global proportion of ?, not aftermath check).
    const allDlg501a: string[] = [];
    let inDlg501a = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg501a = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg501a = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg501a = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg501a) allDlg501a.push(t);
    }
    if (allDlg501a.length >= 8) {
      const wc501a = allDlg501a.map(t => t.split(/\s+/).filter(Boolean).length);
      const qIdxs501a = allDlg501a
        .map((t, i) => ({ t, i }))
        .filter(({ t, i }) => t.trimEnd().endsWith('?') && i < allDlg501a.length - 1)
        .map(({ i }) => i);
      if (qIdxs501a.length >= 2) {
        const allTerse501a = qIdxs501a.every(i => wc501a[i + 1] <= 2);
        if (allTerse501a) {
          issues.push({
            location: `Dialogue — ${qIdxs501a.length} question lines all followed by ≤2-word responses`,
            rule: 'DIALOGUE_QUESTION_AFTERMATH_TERSE',
            severity: 'minor',
            description: `Every question-ending dialogue line (${qIdxs501a.length} instances) is immediately followed by a response of ≤2 words. Questions are invitations to the scene partner — a request for information, opinion, or feeling. When every inquiry earns only a grunt, a monosyllable, or a fragment, the dialogue signals that asking is futile: nobody truly wants to know anything, and nobody is compelled to answer. A pattern of perpetually deflected questions collapses the conversational energy into a one-directional interrogation where the asker gets nothing back.`,
            suggestedFix: `After at least one question, give the responding character a substantive reply of ≥4 words — an answer, a counter-question, an evasion that takes a full clause to execute, or an emotional response. Even evasion can be extended: "I really don't want to talk about that right now." is three times longer than "No." and carries more dramatic information about what the character doesn't want to face.`,
          });
        }
      }
    }

    // DIALOGUE_OPENING_ZONE_EXCLAMATION_ABSENT (zone presence/absence × opening 25% × ! absent,
    // ≥12 dialogue lines, ≥4 exclamation-ending lines globally, none in first 25%): The opening
    // quarter of dialogue contains no exclamatory speech while intensity is present in the rest —
    // the script opens in a uniformly subdued register, then exclaims only once it has settled in.
    // Exclamation marks signal heightened intensity: genuine declarations, commands, and outbursts.
    // When the opening zone is exclamation-free while ≥4 exclamations appear later, the dialogue
    // begins in an artificially calm register disconnected from the emotional arc. Zone presence/
    // absence mode × opening 25% × exclamation. Distinct from DIALOGUE_EXCLAMATION_ZONE_CLUSTER
    // (Wave 487: distribution/timing × thirds — >75% of exclamations in one zone; this fires when
    // ZERO exclamations exist in the opening zone), DIALOGUE_CLOSING_ZONE_QUESTION_ABSENT (Wave 487:
    // same mode, different zone+signal: closing zone × ? absent), DIALOGUE_OPENING_ZONE_LONG_ABSENT
    // (Wave 473: same zone, different signal: speech length, not punctuation). Fills the opening-zone
    // × ! cell in the zone-presence/absence × punctuation matrix.
    const allDlg501b: string[] = [];
    let inDlg501b = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg501b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg501b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg501b = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg501b) allDlg501b.push(t);
    }
    if (allDlg501b.length >= 12) {
      const openEnd501b = Math.floor(allDlg501b.length * 0.25);
      const exclIdxs501b = allDlg501b
        .map((t, i) => ({ t, i }))
        .filter(({ t }) => t.trimEnd().endsWith('!'))
        .map(({ i }) => i);
      if (exclIdxs501b.length >= 4) {
        const openingExcl501b = exclIdxs501b.filter(i => i < openEnd501b).length;
        if (openingExcl501b === 0) {
          issues.push({
            location: `Dialogue — ${exclIdxs501b.length} exclamation lines, none in the opening 25% (${openEnd501b} lines)`,
            rule: 'DIALOGUE_OPENING_ZONE_EXCLAMATION_ABSENT',
            severity: 'minor',
            description: `The script has ${exclIdxs501b.length} exclamation-ending dialogue lines, but none appear in the opening 25% of dialogue (the first ${openEnd501b} lines). The opening zone is uniformly subdued — there is no heightened intensity, declaration, or outburst — while exclamatory speech appears freely in the rest. When the opening register is exclamation-free while the remainder of the script uses emotional punctuation, the dialogue opens in an artificially calm mode that misrepresents how intensely the scene will eventually play.`,
            suggestedFix: `Add at least one exclamation-ending line in the first ${openEnd501b} dialogue lines — a moment of genuine intensity, declaration, or feeling that establishes the register the scene can play in. The opening lines of dialogue set the audience's expectation for the scene's emotional range; if the opening is all plain statements, the later exclamations can feel unearned or disproportionate.`,
          });
        }
      }
    }

    // DIALOGUE_PEAK_LONG_EARLY (single-peak isolation × speech length × opening zone, ≥8 dialogue
    // lines, the script's longest dialogue speech ≥10 words is in the first 25%, ≥3 long speeches
    // ≥10 words exist in the remaining 75%): The most verbally elaborate speech is front-loaded in
    // the opening zone while long speeches continue throughout — the maximum verbosity arrives before
    // the scene has fully developed the dramatic stakes that would justify it. A long speech earns
    // its length by arriving under pressure: the audience must already care about what the character
    // is saying. When the longest speech comes in the first 25% of dialogue, it arrives before the
    // scene has had time to generate investment, making the elaboration feel like exposition rather
    // than dramatic expression. Single-peak isolation mode × speech length × positional zone. Distinct
    // from DIALOGUE_OPENING_ZONE_LONG_ABSENT (Wave 473: fires when ZERO long speeches exist in the
    // opening zone — the opposite failure mode), DIALOGUE_LENGTH_OUTLIER (Wave 431: checks ratio to
    // mean, position-agnostic), ACTION_DENSITY_PEAK_LATE (rhythm.ts: action lines, not dialogue).
    // First single-peak isolation check using positional zone in this pass.
    const allDlg501c: string[] = [];
    let inDlg501c = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg501c = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg501c = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg501c = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg501c) allDlg501c.push(t);
    }
    if (allDlg501c.length >= 8) {
      const wc501c = allDlg501c.map(t => t.split(/\s+/).filter(Boolean).length);
      const peakWC501c = Math.max(...wc501c);
      const peakPos501c = wc501c.indexOf(peakWC501c);
      const openEnd501c = Math.floor(allDlg501c.length * 0.25);
      const restLong501c = wc501c.slice(openEnd501c).filter(w => w >= 10).length;
      if (peakWC501c >= 10 && peakPos501c < openEnd501c && restLong501c >= 3) {
        issues.push({
          location: `Dialogue — longest speech (${peakWC501c} words) at line ${peakPos501c + 1} of ${allDlg501c.length} (opening 25%)`,
          rule: 'DIALOGUE_PEAK_LONG_EARLY',
          severity: 'minor',
          description: `The script's longest dialogue speech (${peakWC501c} words, dialogue line ${peakPos501c + 1}) falls in the opening 25% of dialogue, while ${restLong501c} other long speeches (≥10 words) appear in the remaining 75%. The maximum verbal elaboration arrives before the scene has developed the dramatic stakes that would justify it. A long speech earns its length by arriving under pressure — when the audience already cares about what the character is saying. Front-loading the peak length makes the opening's elaboration feel like exposition rather than expression, and makes the later long speeches feel like diminished repetitions of an early extravagance.`,
          suggestedFix: `Move the most elaborate speech later in the scene, or trim the opening speech to match the register of the opening zone and save the maximum verbal elaboration for a later moment when dramatic pressure has had time to build. A long speech delivered under developing pressure lands with more weight than the same speech delivered when the audience is still orienting to the scene.`,
        });
      }
    }
  }

  // ── Wave 515: DIALOGUE_EXCLAMATION_RUN, DIALOGUE_CLOSING_ZONE_LONG_ABSENT,
  //              DIALOGUE_NEGATION_RUN ──────────────────────────────────────────────────────────
  {
    const dlg515: string[] = [];
    let inDlg515 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg515 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg515 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg515 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg515) dlg515.push(t);
    }

    // DIALOGUE_EXCLAMATION_RUN (run-based × exclamation mark, ≥10 dialogue lines, ≥3 !-ending
    // lines globally, maxExclRun ≥4): Four or more consecutive dialogue lines each end with "!".
    // A sustained run of exclamations collapses emotional intensity into a monotone outcry where
    // every line peaks at the same register, draining force from each individual exclamation.
    // Intensification only works when it rises from a baseline; when the baseline IS the peak,
    // the register is uniformly heightened and the audience stops reading the exclamation as
    // emphasis. Distinctness: DIALOGUE_EXCLAMATION_ZONE_CLUSTER (Wave 487: distribution/timing
    // × thirds — fires when >75% of !-ending lines cluster in one structural third of the script;
    // does not detect local consecutive runs within a narrow span). DIALOGUE_OPENING_ZONE_
    // EXCLAMATION_ABSENT (Wave 501: zone presence/absence × opening zone — zero !-lines in the
    // first 25%). DIALOGUE_QUESTION_RUN (Wave 445: run-based × "?" channel) and DIALOGUE_
    // ASSERTION_RUN (Wave 459: run-based × plain declarative) are the two existing run-based
    // end-punctuation checks; this adds the "!" member to complete the triptych. No existing
    // check catches ≥4 consecutive !-ending lines regardless of their total proportion.
    if (dlg515.length >= 10) {
      const exclTotal515a = dlg515.filter(t => t.trimEnd().endsWith('!')).length;
      if (exclTotal515a >= 3) {
        let curExcl515a = 0, maxExcl515a = 0;
        for (const line of dlg515) {
          if (line.trimEnd().endsWith('!')) {
            if (++curExcl515a > maxExcl515a) maxExcl515a = curExcl515a;
          } else {
            curExcl515a = 0;
          }
        }
        if (maxExcl515a >= 4) {
          issues.push({
            location: 'Dialogue exchange',
            rule: 'DIALOGUE_EXCLAMATION_RUN',
            severity: 'minor',
            description: `${maxExcl515a} consecutive dialogue lines each end with an exclamation mark — every line in the run peaks at the same register of intensity, draining force from each individual exclamation. Intensification requires a baseline to rise from; when every line is already at maximum punctuated emphasis, there is no arc — only sustained outcry. A run of ${maxExcl515a} consecutive exclamations signals that the scene is locked in a single emotional register rather than moving through one.`,
            suggestedFix: `Break the exclamation chain by inserting at least one plain declarative or questioning line in the run — a moment where the register drops or pivots before the next emotional spike. Exclamation marks land hardest when they arrive after a breath of less heightened speech; without the contrast, they become ambient noise rather than dramatic emphasis.`,
          });
        }
      }
    }

    // DIALOGUE_CLOSING_ZONE_LONG_ABSENT (zone presence/absence × closing 25% × long speech
    // absent, ≥12 dialogue lines, ≥3 long speeches ≥10 words globally, none in closing 25%):
    // The scene's verbal elaboration is front-heavy — characters speak at length in the opening
    // and middle but reduce to brief fragments as the scene resolves. When the closing zone
    // contains no long speeches while ≥3 exist globally, the dialogue loses expressive range at
    // the moment when the scene should be crystallizing its meaning most fully. Zone presence/
    // absence mode × closing 25% × long speech. Distinctness: DIALOGUE_OPENING_ZONE_LONG_ABSENT
    // (Wave 473: opening zone × long speech absent — the inverse failure, where the opening is
    // terse while the rest elaborates). DIALOGUE_PEAK_LONG_EARLY (Wave 501: single-peak isolation
    // × opening zone — the SINGLE longest speech is in the first 25%; this fires when ZERO long
    // speeches exist in the CLOSING 25% while ≥3 appear globally — a different failure mode).
    // DIALOGUE_LENGTH_OUTLIER (Wave 431: ratio to mean, position-agnostic). Fills the closing-zone
    // × long-speech cell alongside DIALOGUE_CLOSING_ZONE_QUESTION_ABSENT (Wave 487: closing-zone
    // × question absent — same zone, different signal).
    if (dlg515.length >= 12) {
      const closeStart515b = Math.floor(dlg515.length * 0.75);
      const wc515b = dlg515.map(t => t.split(/\s+/).filter(Boolean).length);
      const globalLong515b = wc515b.filter(w => w >= 10).length;
      if (globalLong515b >= 3) {
        const closingLong515b = wc515b.slice(closeStart515b).filter(w => w >= 10).length;
        if (closingLong515b === 0) {
          issues.push({
            location: `Dialogue — ${globalLong515b} long speeches globally, none in closing 25% (last ${dlg515.length - closeStart515b} lines)`,
            rule: 'DIALOGUE_CLOSING_ZONE_LONG_ABSENT',
            severity: 'minor',
            description: `The script has ${globalLong515b} long dialogue speeches (≥10 words) but none fall in the closing 25% of dialogue (the last ${dlg515.length - closeStart515b} lines). The scene's verbal elaboration is front-heavy: characters speak at length in the opening and middle, then reduce to brief fragments as the scene resolves. A closing zone without any substantive speeches signals that the dialogue surrenders its expressive range at the moment when the scene should be crystallizing its meaning most fully — the final beats default to terseness rather than culmination.`,
            suggestedFix: `Add at least one substantive speech (≥10 words) in the closing 25% of dialogue — a moment of full verbal commitment near the scene's resolution. The final zone is where meaning is most under pressure; terse fragments can land powerfully only when they follow a longer statement that the terseness then condenses. Brief closings feel earned only when they arrive after elaboration, not as a default silence.`,
          });
        }
      }
    }

    // DIALOGUE_NEGATION_RUN (run-based × negation content, ≥8 dialogue lines, ≥3 negation-
    // containing lines globally, maxNegRun ≥4): Four or more consecutive dialogue lines each
    // contain a negation word. A sustained run of denials and refusals collapses dialogue into
    // a wall of rejection — no one asserts, moves, or commits to anything affirmative across
    // the stretch. While individual negations are dramatically essential (refusal, denial,
    // resistance), four consecutive lines of negation signal that the scene is stuck in a mode
    // of mutual obstruction with no forward motion. Distinctness: DIALOGUE_NEGATION_FLOOD (Wave
    // 417: global proportion >40% containing negation — a script-wide rate that cannot detect
    // a concentrated local run while overall proportion stays below threshold). DIALOGUE_QUESTION_
    // RUN (Wave 445: run-based × "?" channel), DIALOGUE_ASSERTION_RUN (Wave 459: run-based ×
    // plain declarative), and DIALOGUE_EXCLAMATION_RUN (this wave: run-based × "!" channel) are
    // the end-punctuation run family; this is the first run-based check on the negation CONTENT
    // channel rather than end-punctuation marks — a distinct signal dimension.
    if (dlg515.length >= 8) {
      const NEG_PAT515c = /\b(no|not|never|nothing|nobody|none|nor|neither|without|can't|won't|don't|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|couldn't|wouldn't|shouldn't|doesn't|didn't|cannot|no one)\b/i;
      const negTotal515c = dlg515.filter(t => NEG_PAT515c.test(t)).length;
      if (negTotal515c >= 3) {
        let curNeg515c = 0, maxNeg515c = 0;
        for (const line of dlg515) {
          if (NEG_PAT515c.test(line)) {
            if (++curNeg515c > maxNeg515c) maxNeg515c = curNeg515c;
          } else {
            curNeg515c = 0;
          }
        }
        if (maxNeg515c >= 4) {
          issues.push({
            location: 'Dialogue exchange',
            rule: 'DIALOGUE_NEGATION_RUN',
            severity: 'minor',
            description: `${maxNeg515c} consecutive dialogue lines each contain a negation (no, not, never, nothing, nobody, etc.) — the dialogue sustains an unbroken wall of refusal and denial with no forward motion across the run. When consecutive lines all reject, deny, or negate without any affirmation or assertion breaking the chain, the scene signals that no one is moving toward anything: the characters are talking around a void rather than toward each other. Negation is dramatically essential — refusal and resistance drive conflict — but a run of ${maxNeg515c} consecutive negations collapses into mutual obstruction without the positive desire that gives refusal its tension.`,
            suggestedFix: `Break the negation run with at least one line that asserts, desires, or commits to something affirmative — even a small forward motion: a want, a declaration, a question that reaches toward rather than refuses. The most powerful dramatic denials land when they arrive after an assertion: "I do want this. But I can't accept those terms." is more potent than four consecutive refusals, because the refusal has something to deny.`,
          });
        }
      }
    }
  }

  // ── Wave 529: DIALOGUE_QUESTION_ZONE_MIDDLE_ABSENT, DIALOGUE_HESITATION_RUN,
  //              DIALOGUE_QUESTION_AFTERMATH_LONG ──────────────────────────────────────────────────
  {
    const dlg529: string[] = [];
    let inDlg529 = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg529 = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg529 = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg529 = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg529) dlg529.push(t);
    }

    // DIALOGUE_QUESTION_ZONE_MIDDLE_ABSENT (zone presence/absence × question mark × middle 50%,
    // ≥12 dialogue lines, ≥4 question-ending lines globally, zero questions in middle 50% while ≥2
    // exist in the outer zones combined): The dialogue's middle half contains no question-ending
    // line while questions appear in the opening and closing zones. The interrogative register —
    // which generates uncertainty, invites response, and signals unresolved tension — is absent from
    // the script's longest sustained zone. When no character asks a question in the middle half of the
    // dialogue, the central section operates in a mode of pure assertion or declaration, lacking the
    // question-and-response structure that drives natural speech. Zone presence/absence mode ×
    // question-mark channel × middle zone. Distinct from DIALOGUE_CLOSING_ZONE_QUESTION_ABSENT
    // (Wave 487: closing 25% — same channel, different zone), DIALOGUE_QUESTION_ZONE_CLUSTER
    // (Wave 473: distribution/timing × thirds — fires when >75% of questions concentrate in one
    // third; this fires when the middle 50% is completely question-free), DIALOGUE_INTERROGATIVE_
    // SATURATION (Wave 294: global proportion of ? — no zone sensitivity).
    if (dlg529.length >= 12) {
      const qTotal529a = dlg529.filter(t => t.trimEnd().endsWith('?')).length;
      if (qTotal529a >= 4) {
        const midStart529a = Math.floor(dlg529.length * 0.25);
        const midEnd529a = Math.floor(dlg529.length * 0.75);
        const midQCount529a = dlg529.slice(midStart529a, midEnd529a).filter(t => t.trimEnd().endsWith('?')).length;
        const outerQCount529a =
          dlg529.slice(0, midStart529a).filter(t => t.trimEnd().endsWith('?')).length +
          dlg529.slice(midEnd529a).filter(t => t.trimEnd().endsWith('?')).length;
        if (midQCount529a === 0 && outerQCount529a >= 2) {
          issues.push({
            location: `Middle dialogue (lines ${midStart529a + 1}–${midEnd529a}) — no question-ending line`,
            rule: 'DIALOGUE_QUESTION_ZONE_MIDDLE_ABSENT',
            severity: 'minor',
            description: `The middle 50% of dialogue (lines ${midStart529a + 1}–${midEnd529a}) contains no question-ending line, while ${outerQCount529a} questions appear in the outer zones — the script's longest sustained dialogue section is written without any interrogative moment. Questions are the mechanism by which characters express uncertainty, invite response, and signal unresolved tension. When the entire middle of the dialogue operates in pure assertion without any question-driven exchange, the central section loses the conversational dynamism that makes dialogue feel like a live negotiation rather than a sequence of declarations. The absence is most noticeable because questions exist both before and after — the middle zone has excised the interrogative register entirely.`,
            suggestedFix: `Add at least one question-ending line in the middle zone (dialogue lines ${midStart529a + 1}–${midEnd529a}) — a character asking for information, challenging an assertion, expressing doubt, or reaching toward the other person. Even a single question in the middle of a scene changes its dynamic: the scene is no longer a succession of mutual declarations but an exchange where one character's certainty creates a gap that another has to fill.`,
          });
        }
      }
    }

    // DIALOGUE_HESITATION_RUN (run-based × hesitation content, ≥8 dialogue lines, ≥3 hesitation-
    // containing lines globally, maxHesRun ≥4): Four or more consecutive dialogue lines each contain
    // a hesitation sound (um, uh, er, hmm, hm). A run of four hesitations collapses the dialogue into
    // a sustained stammer where no character finds their words across the entire stretch. Individual
    // hesitations carry dramatic information — the character is uncertain, buying time, suppressing
    // a response — but a run of four or more consecutive hesitations signals that the scene has
    // descended into inarticulate floundering without any moment of verbal commitment. Run-based mode
    // × hesitation-content channel. Distinct from DIALOGUE_HESITATION_FLOOD (Wave 361: global
    // proportion >25% — a script-wide rate that cannot detect a local run while the overall proportion
    // stays below threshold), all run-based end-punctuation checks (QUESTION_RUN, ASSERTION_RUN,
    // EXCLAMATION_RUN, NEGATION_RUN — different signal channel: this is the first run check on the
    // hesitation CONTENT channel vs end-mark or negation channels).
    if (dlg529.length >= 8) {
      const HES_PAT529b = /\b(um|uh|er|hmm|hm)\b/i;
      const hesTotalCount529b = dlg529.filter(t => HES_PAT529b.test(t)).length;
      if (hesTotalCount529b >= 3) {
        let curHes529b = 0, maxHes529b = 0;
        for (const line of dlg529) {
          if (HES_PAT529b.test(line)) {
            if (++curHes529b > maxHes529b) maxHes529b = curHes529b;
          } else {
            curHes529b = 0;
          }
        }
        if (maxHes529b >= 4) {
          issues.push({
            location: 'Dialogue exchange',
            rule: 'DIALOGUE_HESITATION_RUN',
            severity: 'minor',
            description: `${maxHes529b} consecutive dialogue lines each contain a hesitation sound (um, uh, er, hmm, hm) — the dialogue sustains an unbroken run of verbal uncertainty without any moment of commitment or clarity. Individual hesitations carry dramatic information: a character buying time, suppressing a response, or signaling that they haven't decided what to say yet. At ${maxHes529b} consecutive lines, the sustained stammer signals that the scene has descended into inarticulate floundering — no character finds their words across the entire stretch, and the dialogue loses the verbal agency that makes speech feel dramatic rather than documentary. A scene where everyone is perpetually uncertain has no one willing to commit to anything, and without commitment there is no conflict.`,
            suggestedFix: `Break the hesitation run with at least one line that commits: a direct assertion, a question without stalling, a response that doesn't buy time before delivering its content. The hesitation before a line is dramatically useful only when the line itself eventually arrives at something definite. Four consecutive lines of "um" and "uh" signal that the scene is stalling the scene rather than using stalling as a technique within it.`,
          });
        }
      }
    }

    // DIALOGUE_QUESTION_AFTERMATH_LONG (sequence/aftermath × question → extended response ≥10 words,
    // ≥8 dialogue lines, ≥2 question-ending lines not at last position, ALL followed by ≥10-word
    // responses): Every question earns a monologue dump in return — interrogation always provokes
    // extended elaboration rather than the crisp exchange of natural conversation. Where DIALOGUE_
    // QUESTION_AFTERMATH_TERSE (Wave 501) fires when every question earns a ≤2-word deflection,
    // this fires at the opposite extreme: every question triggers an extended monologue. When
    // questions always get long answers, dialogue collapses into a Q&A format where interrogatives
    // function as setup lines for extended speeches rather than as genuine conversational moves.
    // The scene loses the conversational ping-pong that makes exchange dynamic. Sequence/aftermath
    // mode × question trigger × extended response. Distinct from DIALOGUE_QUESTION_AFTERMATH_TERSE
    // (Wave 501: ≤2-word response — the short-response inverse of this check), DIALOGUE_MONOLOGUE_
    // UNPROMPTED (Wave 459: backward-cause × long speech, no question before it — long speeches that
    // aren't question-triggered; this fires when long speeches ARE question-triggered, every time),
    // DIALOGUE_LENGTH_OUTLIER (Wave 431: single-peak isolation — one speech dominates by ratio).
    if (dlg529.length >= 8) {
      const wc529c = dlg529.map(t => t.split(/\s+/).filter(Boolean).length);
      const qAfterIdxs529c = dlg529
        .map((t, i) => ({ t, i }))
        .filter(({ t, i }) => t.trimEnd().endsWith('?') && i < dlg529.length - 1)
        .map(({ i }) => i);
      if (qAfterIdxs529c.length >= 2) {
        const allLong529c = qAfterIdxs529c.every(i => wc529c[i + 1] >= 10);
        if (allLong529c) {
          issues.push({
            location: `Dialogue — ${qAfterIdxs529c.length} question lines all followed by ≥10-word responses`,
            rule: 'DIALOGUE_QUESTION_AFTERMATH_LONG',
            severity: 'minor',
            description: `Every question-ending dialogue line (${qAfterIdxs529c.length} instances) is immediately followed by a response of ≥10 words. Questions are invitations — brief, pointed, forward-facing moves. When every question earns a monologue in return, dialogue loses the conversational ping-pong that makes exchange dynamic. The scene collapses into a Q&A format where the interrogative functions purely as a prompt for extended elaboration: asking becomes a way to cue a speech rather than to receive information. Natural conversation mixes long and short responses depending on what the question demands; a uniform policy of extended answers signals that the dialogue is structured as interview rather than negotiation.`,
            suggestedFix: `After at least one question, give a short response — an answer that answers, a deflection that deflects in one clause, a counter-question. Not every question needs an aria in response. A well-placed single sentence after a question gives the asker their due and moves the exchange forward; the monologue can then come after a moment of silence or a second, more specific question has established the invitation for it.`,
          });
        }
      }
    }
  }

  // ── Wave 543: ACTION_PASSIVE_RUN, DIALOGUE_AFFIRMATION_FLOOD,
  //              DIALOGUE_EXCLAMATION_BACKWARD_CAUSELESS ──────────────────────────────────────────
  {
    // ACTION_PASSIVE_RUN (run-based × passive construction × action lines, ≥10 action lines,
    // ≥3 passive lines globally, maxPassRun ≥4): Four or more consecutive action lines each use
    // a passive construction ("is heard", "can be seen", "is found", etc.), creating an unbroken
    // stretch where the prose never names an acting subject. Individual passive lines carry specific
    // information — offscreen sounds, observer-perspective description — but a run of four or more
    // passive lines signals that the writer has lost the habit of assigning agency: the camera drifts
    // through a sequence of things-being-done without anyone doing them. Passive action drains the
    // visual authority that makes screenplay prose cinematic. Run-based mode × passive-construction
    // channel × action lines. First run-based check on the action-line corpus in this pass (all prior
    // run checks operate on dialogue lines). Distinct from PASSIVE_ACTION_VOICE (Wave 160: global
    // proportion >15% — a script-wide rate that cannot detect a local passive streak while the overall
    // rate stays below threshold; this catches local passive runs even when the global rate is low).
    if (actionOnlyLines.length >= 10) {
      const PASS_PATS543a = [
        /\bis heard\b/i, /\bcan be seen\b/i, /\bcan be heard\b/i, /\bwas seen\b/i,
        /\bwas heard\b/i, /\bare seen\b/i, /\bare heard\b/i, /\bis seen\b/i,
        /\bis found\b/i, /\bwas found\b/i, /\bwere found\b/i, /\bis felt\b/i,
        /\bcan be felt\b/i, /\bseems to be\b/i, /\bappears to be\b/i,
        /\bis placed\b/i, /\bwas placed\b/i, /\bis left\b/i, /\bwas left\b/i,
        /\bis taken\b/i, /\bwas taken\b/i,
      ];
      const passiveTotal543a = actionOnlyLines.filter(l => PASS_PATS543a.some(p => p.test(l))).length;
      if (passiveTotal543a >= 3) {
        let curPass543a = 0, maxPass543a = 0;
        for (const line of actionOnlyLines) {
          if (PASS_PATS543a.some(p => p.test(line))) {
            if (++curPass543a > maxPass543a) maxPass543a = curPass543a;
          } else {
            curPass543a = 0;
          }
        }
        if (maxPass543a >= 4) {
          issues.push({
            location: 'Action prose',
            rule: 'ACTION_PASSIVE_RUN',
            severity: 'minor',
            description: `${maxPass543a} consecutive action lines each use a passive construction ("is heard", "can be seen", "is found", etc.) — the prose refuses to name any acting subject across an unbroken stretch of ${maxPass543a} lines. Individual passive lines carry specific information (offscreen sounds, observer-perspective description) but a run of ${maxPass543a} passive lines signals that the script has lost the habit of assigning agency: the camera drifts through a sequence of things-being-done without anyone doing them. Passive action drains the visual authority that makes screenplay prose cinematic — the camera needs a subject to follow, and a sustained passive run leaves it without one.`,
            suggestedFix: `Rewrite at least two of the passive lines in the run with active constructions that name a subject: "A sound is heard" → "Footsteps echo from the hall." or assign the action to a character. The passive register is useful when the agent is genuinely unknown or irrelevant, but ${maxPass543a} consecutive passive lines signal that the script is describing ambient states rather than a sequence of caused events with agents.`,
          });
        }
      }
    }

    // DIALOGUE_AFFIRMATION_FLOOD (valence × affirmation content × dialogue, ≥10 dialogue lines,
    // >30% contain explicit affirmative assent — "yes", "yeah", "right", "exactly", "of course",
    // "sure", "agreed", "absolutely", "definitely", "certainly", "indeed", "correct", "precisely"):
    // When more than 30% of dialogue lines carry explicit affirmation, characters spend most of
    // their speech validating each other — no conflict, no resistance, no dramatic friction.
    // Heavy-affirmation dialogue has no dramatic engine: the scene becomes a mutual confirmation
    // society where no force opposes any desire. Valence mode × affirmation content. Positive-valence
    // complement of DIALOGUE_NEGATION_FLOOD (Wave 417: >40% negation). The pair jointly audit the
    // valence polarity of the dialogue corpus. Distinct from DIALOGUE_NEGATION_FLOOD (opposite
    // valence), all syntactic proportion checks (hedging-opener, conditional-flood, etc. — those
    // fire on grammatical form, not semantic affirmation content).
    const dlg543b: string[] = [];
    let inDlg543b = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg543b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg543b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg543b = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg543b) dlg543b.push(t);
    }
    if (dlg543b.length >= 10) {
      const AFF_PAT543b = /\b(yes|yeah|yep|right|exactly|of course|agreed|absolutely|definitely|certainly|indeed|correct|precisely|affirmative)\b/i;
      const affCount543b = dlg543b.filter(t => AFF_PAT543b.test(t)).length;
      if (affCount543b / dlg543b.length > 0.30) {
        issues.push({
          location: `Dialogue — ${affCount543b} of ${dlg543b.length} lines contain explicit affirmation`,
          rule: 'DIALOGUE_AFFIRMATION_FLOOD',
          severity: 'minor',
          description: `${affCount543b} of ${dlg543b.length} dialogue lines (${Math.round(affCount543b / dlg543b.length * 100)}%) contain explicit affirmative assent — "yes", "right", "exactly", "absolutely", "of course", or similar. When more than 30% of dialogue is occupied by characters agreeing, validating, and confirming each other, the scene operates as a mutual-affirmation society: no force opposes any desire, no resistance tests any proposal, no character pushes back against what another has said. Drama depends on competing forces; a dialogue where characters mostly agree strips the scene of the conflict that makes engagement possible. Heavy affirmation also signals that lines are filling space rather than doing dramatic work: "Yes, exactly, right" confirms what has already been established without moving anything forward.`,
          suggestedFix: `Replace at least ${Math.ceil(affCount543b * 0.4)} of the affirmative lines with resistance, qualification, or complication: a yes-but that moves the scene forward, a concern that hasn't been addressed, a counter-position that forces renegotiation. Characters who agree effortlessly have nothing at stake; characters who must earn agreement through argument and revelation generate scenes.`,
        });
      }
    }

    // DIALOGUE_EXCLAMATION_BACKWARD_CAUSELESS (backward-cause × exclamation channel × dialogue,
    // ≥8 dialogue lines, ≥2 qualifiable !-ending lines [position > 0], ALL preceded by a line
    // ending in neither "?" nor "!" in the immediately prior dialogue line): Every exclamation in
    // the dialogue arrives without a provoking question or prior escalation — all emotional intensity
    // is self-generated rather than triggered by the exchange. The natural mechanism of dramatic
    // intensity is provocation: a question that challenges, threatens, or reveals, generating a
    // heightened response; or a prior exclamation that escalates further. When all exclamations
    // arrive without that upstream trigger, the script is manufacturing emotion top-down — inserting
    // intensity from outside the dramatic logic rather than letting intensity be generated by what
    // came just before. Backward-cause mode × exclamation channel. Distinct from DIALOGUE_MONOLOGUE_
    // UNPROMPTED (Wave 459: backward-cause × long speech ≥10 words → no prior question in 2 lines —
    // different trigger [length not !], window [2 lines not 1], pattern [positive length check]),
    // DIALOGUE_EXCLAMATION_RUN (Wave 515: run-based × consecutive !-ending lines), DIALOGUE_
    // EXCLAMATION_ZONE_CLUSTER (Wave 487: distribution/timing × thirds), ALL_CAPS_SHOUT (Wave 308:
    // caps-word content, not ! punctuation), zone-presence/absence checks (DIALOGUE_OPENING_ZONE_
    // EXCLAMATION_ABSENT, DIALOGUE_CLOSING_ZONE_...).
    if (dlg543b.length >= 8) {
      const qualExcl543c = dlg543b
        .map((t, i) => ({ t, i }))
        .filter(({ t, i }) => t.trimEnd().endsWith('!') && i > 0);
      if (qualExcl543c.length >= 2) {
        const allCauseless543c = qualExcl543c.every(({ i }) => {
          const prev = dlg543b[i - 1];
          return !prev.trimEnd().endsWith('?') && !prev.trimEnd().endsWith('!');
        });
        if (allCauseless543c) {
          issues.push({
            location: `Dialogue — ${qualExcl543c.length} exclamation line(s), none preceded by "?" or "!"`,
            rule: 'DIALOGUE_EXCLAMATION_BACKWARD_CAUSELESS',
            severity: 'minor',
            description: `Every exclamation-ending dialogue line (${qualExcl543c.length} instance(s)) is immediately preceded by a line that ends in neither "?" nor "!" — all emotional intensity arrives without a triggering question or prior escalation in the exchange. The natural mechanism of dramatic intensity is provocation: a pointed question that challenges or reveals, or a prior exclamation that escalates, generating a heightened response. When all exclamations arrive without that upstream trigger, the script is inserting emotional intensity from outside the dramatic logic of the scene rather than letting intensity be generated by what the character heard immediately before. The audience feels the exclamation landing without the momentum that would justify its force — the intensity seems authored rather than provoked.`,
            suggestedFix: `Before at least one exclamation-ending line, convert the immediately preceding dialogue line from a statement into a "?" — a pointed question, challenge, or revelation that the exclamation is then responding to. An exclamation that answers a question is dramatically earned; an exclamation that answers a mild statement arrives as manufactured intensity. The simplest fix is to end one of the setup lines with "?" so that the emotional escalation is the character responding to something, not generating intensity from nowhere.`,
          });
        }
      }
    }
  }

  // ── Wave 557: DIALOGUE_HEDGED_AFFIRMATION_FLOOD, DIALOGUE_LONG_SPEECH_ZONE_CLUSTER,
  //              DIALOGUE_NEGATION_SELF_FEEDING ──────────────────────────────────────────────
  {
    // DIALOGUE_HEDGED_AFFIRMATION_FLOOD (co-occurrence × hesitation sound × affirmation word,
    // ≥10 dialogue lines, >15% contain BOTH a hesitation sound ["um", "uh", "er", "hmm"] AND
    // an explicit affirmation word in the same line): The "uncertain yes" tic — characters
    // simultaneously hedge and validate, producing a register of performative capitulation where
    // agreement signals discomfort rather than conviction. When more than 15% of dialogue lines
    // combine hesitation uncertainty with explicit affirmation, the dramatic weight of consent
    // collapses: the audience cannot tell whether characters mean what they affirm. Co-occurrence
    // mode: fires on the joint presence of two content signals in the same line. Distinct from
    // DIALOGUE_HEDGED_QUESTION_FLOOD (Wave 431: co-occurrence × hedging opener at line START ×
    // "?" end-punctuation — different signal pair: opener-based hedging and question mark rather
    // than hesitation sound anywhere in line and affirmation word), DIALOGUE_AFFIRMATION_FLOOD
    // (Wave 543: valence × affirmation alone — global proportion of lines carrying affirmation,
    // not the co-occurrence of affirmation with hesitation), DIALOGUE_HESITATION_FLOOD (Wave 361:
    // hesitation alone — global proportion of lines carrying hesitation sounds, not the
    // co-occurrence of hesitation with affirmation). First co-occurrence check pairing a
    // paralinguistic signal (hesitation sound) with a semantic-register signal (affirmation word).
    const dlg557a: string[] = [];
    let inDlg557a = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg557a = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg557a = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg557a = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg557a) dlg557a.push(t);
    }
    if (dlg557a.length >= 10) {
      const HES_PAT557a = /\b(um|uh|er|hmm|hm)\b/i;
      const AFF_PAT557a = /\b(yes|yeah|yep|right|exactly|of course|agreed|absolutely|definitely|certainly|indeed|correct|precisely|affirmative)\b/i;
      const hedgedAffCount557a = dlg557a.filter(t => HES_PAT557a.test(t) && AFF_PAT557a.test(t)).length;
      if (hedgedAffCount557a / dlg557a.length > 0.15) {
        issues.push({
          location: `Dialogue — ${hedgedAffCount557a} of ${dlg557a.length} lines contain both hesitation and affirmation`,
          rule: 'DIALOGUE_HEDGED_AFFIRMATION_FLOOD',
          severity: 'minor',
          description: `${hedgedAffCount557a} of ${dlg557a.length} dialogue lines (${Math.round(hedgedAffCount557a / dlg557a.length * 100)}%) contain both a hesitation sound ("um", "uh", "er", "hmm") and an affirmative word ("yes", "right", "exactly", "absolutely") in the same line — the "uncertain yes" tic. Characters agree while visibly unsure, producing a register of performative capitulation: validation that signals discomfort rather than conviction. When more than 15% of dialogue lines combine hedging uncertainty with explicit affirmation, the dramatic weight of consent collapses — the audience cannot tell whether a character means what they affirm, draining agreements of their dramatic significance.`,
          suggestedFix: `Replace hedged affirmations with either genuine agreement (no hesitation: "Yes, that's right.") or genuine resistance (no affirmation: "I mean... I'm not sure about that."). A character who says "Um, yeah, exactly" is neither committed nor resistant — split the line into one clear dramatic position. Reserve the uncertain yes for one or two moments of maximum pressure where capitulation under duress is the explicit dramatic point.`,
        });
      }
    }

    // DIALOGUE_LONG_SPEECH_ZONE_CLUSTER (distribution/timing × speech length ≥10 words × thirds,
    // ≥12 dialogue lines, ≥3 long speeches ≥10 words, >75% in one third): Monologue energy is
    // structurally ghettoized into a single positional zone rather than arising from dramatic
    // pressure throughout. When extended verbal elaboration clusters in one third, the other
    // zones are verbally thin — neither register variation is motivated by the action. Distribution/
    // timing mode × speech length channel. Parallel to DIALOGUE_QUESTION_ZONE_CLUSTER (Wave 473:
    // same mode × ? channel) and DIALOGUE_EXCLAMATION_ZONE_CLUSTER (Wave 487: same mode × !
    // channel), completing the distribution/timing × end-signal triptych with a length-based
    // channel. Distinct from those two, from DIALOGUE_PEAK_LONG_EARLY (Wave 501: single-peak
    // isolation × opening zone — the single LONGEST speech is in the first 25%, not a cluster of
    // multiple long speeches; single-peak isolation not distribution/timing), DIALOGUE_OPENING_
    // ZONE_LONG_ABSENT and DIALOGUE_CLOSING_ZONE_LONG_ABSENT (zone presence/absence × long
    // speech × specific zone — fires on zero occurrence in a zone, not on cluster concentration),
    // DIALOGUE_LENGTH_OUTLIER (Wave 431: ratio to mean, position-agnostic).
    const dlg557b: string[] = [];
    let inDlg557b = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg557b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg557b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg557b = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg557b) dlg557b.push(t);
    }
    if (dlg557b.length >= 12) {
      const wc557b = dlg557b.map(t => t.split(/\s+/).filter(Boolean).length);
      const longIdxs557b = wc557b.map((w, i) => ({ w, i })).filter(x => x.w >= 10).map(x => x.i);
      if (longIdxs557b.length >= 3) {
        const third557b = Math.floor(dlg557b.length / 3);
        const firstZone557b = longIdxs557b.filter(i => i < third557b).length;
        const midZone557b = longIdxs557b.filter(i => i >= third557b && i < 2 * third557b).length;
        const lastZone557b = longIdxs557b.filter(i => i >= 2 * third557b).length;
        const maxZone557b = Math.max(firstZone557b, midZone557b, lastZone557b);
        if (maxZone557b / longIdxs557b.length > 0.75) {
          const zoneName557b = firstZone557b === maxZone557b ? 'opening' : midZone557b === maxZone557b ? 'middle' : 'closing';
          issues.push({
            location: `Dialogue — ${maxZone557b}/${longIdxs557b.length} long speeches in the ${zoneName557b} third`,
            rule: 'DIALOGUE_LONG_SPEECH_ZONE_CLUSTER',
            severity: 'minor',
            description: `${maxZone557b} of ${longIdxs557b.length} long speeches (≥10 words) are concentrated in the ${zoneName557b} third of the dialogue — monologue energy is structurally ghettoized into a single zone. When extended verbal elaboration clusters in one structural position, the other zones are verbally thin: in those zones, characters never speak at length even when the dramatic pressure would call for it. The distribution of long speeches should map to dramatic urgency — characters elaborate when they have the most at stake, not because elaboration is a phase-behavior of the scene. In the non-cluster zones, the script reads as curt; in the ${zoneName557b} third it reads as verbose. Neither variation is motivated by what is happening dramatically.`,
            suggestedFix: `Redistribute at least one long speech from the ${zoneName557b} cluster into one of the other thirds, at a point of genuine dramatic pressure. A long speech should arrive when a character has something urgent and complex to say — not when the script has entered its designated elaboration phase. Find the equivalent emotional peak in the under-elaborated zones and let it similarly produce verbal length.`,
          });
        }
      }
    }

    // DIALOGUE_NEGATION_SELF_FEEDING (backward-cause × negation channel, ≥8 dialogue lines,
    // ≥3 negation-containing lines at position i>0, ALL immediately preceded by another
    // negation-containing line): Refusal feeds only from prior refusal with no affirmative
    // catalyst in between. The natural dramatic texture of negation is resistance — a character
    // wanting something, another blocking that want, generating tension from friction between
    // desire and denial. When all negation lines grow from prior negation rather than from an
    // affirmative statement they're pushing against, the refusal is self-generating rather than
    // adversarial: a static field of denial, not a dynamic exchange of competing intents. No
    // character is ever in a state of wanting something when a "no" arrives. Backward-cause
    // mode × negation channel. Distinct from DIALOGUE_NEGATION_FLOOD (Wave 417: valence ×
    // global rate >40% — a proportion check that cannot distinguish self-feeding negation from
    // negation provoked by affirmative statements), DIALOGUE_NEGATION_RUN (Wave 515: run-based
    // × consecutive negation lines — fires on adjacency/concentration of negation lines without
    // requiring that each be preceded by negation; self-feeding can occur even when negation
    // lines are non-consecutive as long as each has a negation predecessor), DIALOGUE_EXCLAMATION_
    // BACKWARD_CAUSELESS (Wave 543: backward-cause × ! channel — different signal channel,
    // single-line look-back window, and fires when NO preceding "?" or "!" rather than when
    // ALL exclamations are preceded by prior negation).
    const dlg557c: string[] = [];
    let inDlg557c = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg557c = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg557c = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg557c = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg557c) dlg557c.push(t);
    }
    if (dlg557c.length >= 8) {
      const NEG_RE557c = /\b(no\b|not\b|never\b|can't|won't|don't|isn't|aren't|wasn't|weren't|couldn't|wouldn't|shouldn't|nothing|nobody|nowhere|neither|nor)\b/i;
      const negIdxs557c = dlg557c
        .map((t, i) => ({ t, i }))
        .filter(({ t, i }) => NEG_RE557c.test(t) && i > 0)
        .map(({ i }) => i);
      if (negIdxs557c.length >= 3) {
        const allNegPreceded557c = negIdxs557c.every(i => NEG_RE557c.test(dlg557c[i - 1]));
        if (allNegPreceded557c) {
          issues.push({
            location: `Dialogue — ${negIdxs557c.length} negation line(s), all preceded by negation`,
            rule: 'DIALOGUE_NEGATION_SELF_FEEDING',
            severity: 'minor',
            description: `Every negation-containing dialogue line (${negIdxs557c.length} instances, excluding the opening line) is immediately preceded by another negation-containing line — refusal feeds only from prior refusal with no affirmative catalyst between them. The natural dramatic texture of negation is resistance: a character wanting something, another character blocking that want, generating tension from the friction between desire and denial. When all negation lines grow from prior negation rather than from an affirmative statement they're pushing against, the refusal is self-generating rather than adversarial — a static field of denial rather than a dynamic exchange of competing intents. No character is ever in a state of wanting something when a "no" arrives.`,
            suggestedFix: `Before at least one negation line, place an affirmative or desire-expressing line that the negation is genuinely resisting: a request that gets denied, a proposal that gets rejected, an assertion that gets contradicted. "I need this." / "No, you don't." generates tension; "I don't know." / "Me neither." is merely shared uncertainty. Negation is dramatically powerful when it opposes something; when it only follows more negation, it reinforces stasis rather than creating conflict.`,
          });
        }
      }
    }
  }

  // ── Wave 571: DIALOGUE_NEGATION_ZONE_CLUSTER, DIALOGUE_HEDGED_NEGATION_FLOOD,
  //              DIALOGUE_OPENING_ZONE_QUESTION_ABSENT ─────────────────────────────────────────────
  {
    // DIALOGUE_NEGATION_ZONE_CLUSTER (distribution/timing × negation × thirds, ≥12 dialogue lines,
    // ≥3 negation-containing lines, >75% in one structural third): Refusal and denial are
    // structurally ghettoized into a single positional zone rather than arising from dramatic
    // pressure throughout. When negation clusters in one third, the other zones are conflict-thin —
    // characters never push back in those zones even when the action would warrant resistance.
    // Negation should map to where the protagonist meets opposition, not to a phase-behavior of the
    // script. In the non-cluster zones the dialogue reads as frictionless agreement; in the cluster
    // zone it reads as relentless denial. Distribution/timing mode × negation channel × thirds.
    // Parallel to DIALOGUE_QUESTION_ZONE_CLUSTER (Wave 473: ? channel), DIALOGUE_EXCLAMATION_ZONE_
    // CLUSTER (Wave 487: ! channel), and DIALOGUE_LONG_SPEECH_ZONE_CLUSTER (Wave 557: length
    // channel) — this adds the negation channel to the zone-cluster family. Distinct from DIALOGUE_
    // NEGATION_FLOOD (Wave 417: global rate, position-agnostic), DIALOGUE_NEGATION_RUN (Wave 515:
    // consecutive-adjacency, not thirds concentration), DIALOGUE_NEGATION_SELF_FEEDING (Wave 557:
    // backward-cause, each negation preceded by negation — a causal-chain check, not a zone count).
    const dlg571a: string[] = [];
    let inDlg571a = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg571a = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg571a = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg571a = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg571a) dlg571a.push(t);
    }
    if (dlg571a.length >= 12) {
      const NEG_RE571a = /\b(no\b|not\b|never\b|can't|won't|don't|isn't|aren't|wasn't|weren't|couldn't|wouldn't|shouldn't|nothing|nobody|nowhere|neither|nor)\b/i;
      const negIdxs571a = dlg571a.map((t, i) => ({ t, i })).filter(x => NEG_RE571a.test(x.t)).map(x => x.i);
      if (negIdxs571a.length >= 3) {
        const third571a = Math.floor(dlg571a.length / 3);
        const firstZone571a = negIdxs571a.filter(i => i < third571a).length;
        const midZone571a = negIdxs571a.filter(i => i >= third571a && i < 2 * third571a).length;
        const lastZone571a = negIdxs571a.filter(i => i >= 2 * third571a).length;
        const maxZone571a = Math.max(firstZone571a, midZone571a, lastZone571a);
        if (maxZone571a / negIdxs571a.length > 0.75) {
          const zoneName571a = firstZone571a === maxZone571a ? 'opening' : midZone571a === maxZone571a ? 'middle' : 'closing';
          issues.push({
            location: `Dialogue — ${maxZone571a}/${negIdxs571a.length} negation lines in the ${zoneName571a} third`,
            rule: 'DIALOGUE_NEGATION_ZONE_CLUSTER',
            severity: 'minor',
            description: `${maxZone571a} of ${negIdxs571a.length} negation-containing dialogue lines are concentrated in the ${zoneName571a} third of the dialogue — refusal and denial are structurally ghettoized into a single zone. When pushback clusters in one third, the other zones read as frictionless: characters never resist, contradict, or refuse there even when the dramatic situation would call for it, and the ${zoneName571a} third reads as relentless denial. Negation should map to where the protagonist meets opposition — to the beats where wants collide — not to a designated phase of the script. The clustering makes resistance feel like a property of one structural position rather than a response to what is happening dramatically.`,
            suggestedFix: `Redistribute at least one negation beat from the ${zoneName571a} cluster into a different third, at a point where a character genuinely has something to push back against. A "no" lands hardest when it opposes an active want; seed resistance into the conflict-thin zones by finding the moment in each where a character's desire meets a denial, rather than letting all the refusal accumulate in one stretch.`,
          });
        }
      }
    }

    // DIALOGUE_HEDGED_NEGATION_FLOOD (co-occurrence × hesitation sound × negation word, ≥10 dialogue
    // lines, >15% contain BOTH a hesitation sound ["um","uh","er","hmm"] AND a negation word in the
    // same line): The "uncertain no" tic — characters refuse while visibly unsure, producing a
    // register of apologetic resistance where denial signals discomfort rather than conviction. When
    // more than 15% of dialogue lines combine hesitation with negation, the dramatic weight of refusal
    // collapses: a "no" delivered through hedging cannot generate the friction that opposition needs,
    // because the audience reads it as reluctance rather than a firm stance. Co-occurrence mode:
    // joint presence of a paralinguistic signal (hesitation) and a semantic-register signal
    // (negation). Distinct from DIALOGUE_HEDGED_AFFIRMATION_FLOOD (Wave 557: hesitation + AFFIRMATION
    // — the opposite semantic pole, the "uncertain yes"), DIALOGUE_HEDGED_QUESTION_FLOOD (Wave 431:
    // hedging opener + "?" — different signals), DIALOGUE_NEGATION_FLOOD (Wave 417: negation alone),
    // DIALOGUE_HESITATION_FLOOD (Wave 361: hesitation alone). The negation member of the hedged-X
    // co-occurrence family alongside hedged affirmation and hedged question.
    const dlg571b: string[] = [];
    let inDlg571b = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg571b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg571b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg571b = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg571b) dlg571b.push(t);
    }
    if (dlg571b.length >= 10) {
      const HES_PAT571b = /\b(um|uh|er|hmm|hm)\b/i;
      const NEG_PAT571b = /\b(no\b|not\b|never\b|can't|won't|don't|isn't|aren't|wasn't|weren't|couldn't|wouldn't|shouldn't|nothing|nobody|nowhere|neither|nor)\b/i;
      const hedgedNegCount571b = dlg571b.filter(t => HES_PAT571b.test(t) && NEG_PAT571b.test(t)).length;
      if (hedgedNegCount571b / dlg571b.length > 0.15) {
        issues.push({
          location: `Dialogue — ${hedgedNegCount571b} of ${dlg571b.length} lines contain both hesitation and negation`,
          rule: 'DIALOGUE_HEDGED_NEGATION_FLOOD',
          severity: 'minor',
          description: `${hedgedNegCount571b} of ${dlg571b.length} dialogue lines (${Math.round(hedgedNegCount571b / dlg571b.length * 100)}%) contain both a hesitation sound ("um", "uh", "er", "hmm") and a negation word ("no", "not", "never", "can't") in the same line — the "uncertain no" tic. Characters refuse while visibly unsure, producing a register of apologetic resistance: denial that signals discomfort rather than conviction. When more than 15% of dialogue lines combine hedging with negation, the dramatic weight of refusal collapses — a "no" delivered through hesitation cannot generate the friction that opposition needs, because the audience reads it as reluctance rather than a firm stance. Conflict requires characters who can refuse cleanly; perpetual hedged refusal makes every opposition feel negotiable and drains scenes of their stakes.`,
          suggestedFix: `Replace hedged refusals with either firm resistance (no hesitation: "No. That's not happening.") or genuine wavering that is dramatized as a choice rather than a verbal tic. A character who says "Um, no, I don't think so" is neither committed to refusing nor genuinely torn — decide which the moment calls for and write it cleanly. Reserve the uncertain no for the one or two beats where reluctant refusal under pressure is the explicit dramatic point.`,
        });
      }
    }

    // DIALOGUE_OPENING_ZONE_QUESTION_ABSENT (zone presence/absence × question mark × opening 25%,
    // ≥12 dialogue lines, ≥4 question-ending lines globally, zero questions in the opening 25% while
    // ≥2 exist in the rest): The dialogue's opening quarter contains no question-ending line while
    // questions appear later. The interrogative register — which generates uncertainty, invites
    // response, and signals the unresolved tension that pulls an audience in — is absent from the
    // dialogue's establishing zone. When no character asks a question in the opening quarter, the
    // setup operates in pure assertion: characters declare and state rather than probe and wonder,
    // so the dialogue introduces its world without the question-and-response dynamism that signals
    // a live negotiation. The opening is precisely where an unanswered question best hooks the
    // audience. Zone presence/absence mode × question-mark channel × opening zone. Distinct from
    // DIALOGUE_QUESTION_ZONE_MIDDLE_ABSENT (Wave 529: middle 50%) and DIALOGUE_CLOSING_ZONE_QUESTION_
    // ABSENT (Wave 487: closing 25%) — this completes the opening/middle/closing question zone-absence
    // triptych. Distinct from DIALOGUE_QUESTION_ZONE_CLUSTER (Wave 473: over-concentration, not
    // absence) and DIALOGUE_INTERROGATIVE_SATURATION (Wave 294: global proportion, no zone sensitivity).
    const dlg571c: string[] = [];
    let inDlg571c = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg571c = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg571c = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg571c = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg571c) dlg571c.push(t);
    }
    if (dlg571c.length >= 12) {
      const qTotal571c = dlg571c.filter(t => t.trimEnd().endsWith('?')).length;
      if (qTotal571c >= 4) {
        const openEnd571c = Math.floor(dlg571c.length * 0.25);
        const openQCount571c = dlg571c.slice(0, openEnd571c).filter(t => t.trimEnd().endsWith('?')).length;
        const restQCount571c = dlg571c.slice(openEnd571c).filter(t => t.trimEnd().endsWith('?')).length;
        if (openQCount571c === 0 && restQCount571c >= 2) {
          issues.push({
            location: `Opening dialogue (lines 1–${openEnd571c}) — no question-ending line`,
            rule: 'DIALOGUE_OPENING_ZONE_QUESTION_ABSENT',
            severity: 'minor',
            description: `The opening 25% of dialogue (lines 1–${openEnd571c}) contains no question-ending line, while ${restQCount571c} questions appear later — the dialogue's establishing zone is written without any interrogative moment. Questions are how characters express uncertainty, invite response, and signal unresolved tension; an unanswered question in the opening is one of the most reliable hooks for pulling an audience into a scene. When the entire opening quarter operates in pure assertion — characters declaring and stating rather than probing and wondering — the setup lacks the question-and-response dynamism that makes early dialogue feel like a live negotiation rather than a sequence of announcements. The absence is most telling because questions do arrive later: the interrogative register exists in the script but is withheld from the moment it would do the most work.`,
            suggestedFix: `Add at least one question-ending line in the opening quarter (dialogue lines 1–${openEnd571c}) — a character asking for information, voicing a doubt, or reaching toward another. An early question seeds the uncertainty that an audience leans into: it tells them there is something not yet known, someone who wants an answer, a tension that the scene will have to resolve. Opening on assertion alone asks the audience to invest before the dialogue has posed anything for them to wonder about.`,
          });
        }
      }
    }
  }

  // ── Wave 585: DIALOGUE_AFFIRMATION_ZONE_CLUSTER, DIALOGUE_EXCLAMATION_AFTERMATH_TERSE,
  //              DIALOGUE_HEDGED_EXCLAMATION_FLOOD ──────────────────────────────────────────────
  {
    // DIALOGUE_AFFIRMATION_ZONE_CLUSTER — distribution/timing × affirmation × thirds.
    // ≥12 dialogue lines, ≥3 affirmation-containing lines, >75% of those in one structural third
    // → fire. The positive-assent register — where characters validate, agree, and confirm —
    // is ghettoized into a single zone of the dialogue rather than arising organically from the
    // drama throughout. Agreement has a dramatic function: it relieves tension, signals capitulation,
    // or marks a turning point. When it clusters structurally it implies the script has a zone of
    // forced resolution or a passage of deliberately conflict-free agreement that crowds out the
    // interrogative and resistant registers that balance a scene's energy.
    // Distinct from: DIALOGUE_AFFIRMATION_FLOOD (Wave 543: global proportion >30%, no zone
    // sensitivity — a script can pass this check but still cluster its affirmations into one zone),
    // DIALOGUE_NEGATION_ZONE_CLUSTER (Wave 571: negation channel — this is the affirmation sibling,
    // completing the valence pair in the zone-cluster family), DIALOGUE_QUESTION_ZONE_CLUSTER (Wave
    // 473: ? channel), DIALOGUE_EXCLAMATION_ZONE_CLUSTER (Wave 487: ! channel), DIALOGUE_LONG_SPEECH_
    // ZONE_CLUSTER (Wave 557: speech length ≥10w channel). The affirmation member of the zone-cluster
    // family, completing the zone-cluster audit alongside negation, question, exclamation, and long-speech.
    const dlg585a: string[] = [];
    let inDlg585a = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg585a = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg585a = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg585a = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg585a) dlg585a.push(t);
    }
    if (dlg585a.length >= 12) {
      const AFF_PAT585a = /\b(yes|yeah|yep|right|exactly|of course|agreed|absolutely|definitely|certainly|indeed|correct|precisely|affirmative)\b/i;
      const affPositions585a = dlg585a.map((t, i) => ({ i, match: AFF_PAT585a.test(t) })).filter(x => x.match).map(x => x.i);
      if (affPositions585a.length >= 3) {
        const third585a = Math.floor(dlg585a.length / 3);
        const first585a = affPositions585a.filter(p => p < third585a).length;
        const last585a = affPositions585a.filter(p => p >= 2 * third585a).length;
        const mid585a = affPositions585a.length - first585a - last585a;
        const max585a = Math.max(first585a, mid585a, last585a);
        if (max585a / affPositions585a.length > 0.75) {
          const zone585a = max585a === first585a ? 'opening' : max585a === last585a ? 'closing' : 'middle';
          issues.push({
            location: `Affirmation lines: ${first585a} opening / ${mid585a} middle / ${last585a} closing third — ${Math.round((max585a / affPositions585a.length) * 100)}% in the ${zone585a} third`,
            rule: 'DIALOGUE_AFFIRMATION_ZONE_CLUSTER',
            severity: 'minor',
            description: `${Math.round((max585a / affPositions585a.length) * 100)}% of the dialogue's ${affPositions585a.length} affirmation-containing lines (yes, right, exactly, of course, etc.) are concentrated in the ${zone585a} structural third. Affirmation has a dramatic function: it relieves tension, signals capitulation, marks consensus reached. When it clusters structurally, the script has a zone of concentrated agreement while the other two-thirds of the dialogue are operating without any positive-assent register — either in sustained conflict or in neutral exchange. The clustering implies a structural resolution pocket or an artificially smooth passage rather than organic agreement arising from earned dramatic beats distributed across the scene.`,
            suggestedFix: `Redistribute some affirmation lines from the ${zone585a} third into the other zones — let at least one confirming moment land in each structural section. Agreement should arise from dramatic necessity, not zone. A midpoint concession, an opening yes that sets a false baseline, and a closing confirmation of what was earned are all more dramatically purposeful than a cluster of assent in one stretch.`,
          });
        }
      }
    }
  }

  {
    // DIALOGUE_EXCLAMATION_AFTERMATH_TERSE — sequence/aftermath × exclamation trigger × terse response.
    // ≥8 dialogue lines, ≥2 !-ending lines not at the last position, ALL followed immediately by a
    // ≤2-word response → fire. An exclamation outburst — emotional intensity raised to its maximum
    // punctuation — earns only a clipped, minimal reply. The emotional voltage goes unengaged: the
    // other character answers in monosyllables or a short phrase rather than meeting the intensity or
    // being provoked into a fuller response. This drains exclamations of their dramatic consequence —
    // they become atmospheric noise that the other character absorbs without registering.
    // Distinct from: DIALOGUE_QUESTION_AFTERMATH_TERSE (Wave 501: question trigger — this is the
    // exclamation-trigger sibling), DIALOGUE_MONOLOGUE_AFTERMATH_TERSE (Wave 487: long-speech ≥10w
    // trigger), DIALOGUE_EXCLAMATION_BACKWARD_CAUSELESS (Wave 543: backward-cause mode — checks what
    // PRECEDES the exclamation, not what FOLLOWS it), DIALOGUE_EXCLAMATION_RUN (Wave 515: run-based —
    // consecutive exclamation lines, no aftermath direction), DIALOGUE_ASSERTION_RUN (Wave 459:
    // declarative run, not aftermath). First aftermath check using the exclamation trigger.
    const dlg585b: string[] = [];
    let inDlg585b = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg585b = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg585b = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg585b = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg585b) dlg585b.push(t);
    }
    if (dlg585b.length >= 8) {
      const qualExclLines585b = dlg585b
        .map((t, i) => ({ t, i }))
        .filter(({ t, i }) => t.trimEnd().endsWith('!') && i < dlg585b.length - 1);
      if (qualExclLines585b.length >= 2) {
        const countWords585b = (s: string) => s.split(/\s+/).filter(w => w.length > 0).length;
        const allTerse585b = qualExclLines585b.every(({ i }) => countWords585b(dlg585b[i + 1]) <= 2);
        if (allTerse585b) {
          issues.push({
            location: `Dialogue — ${qualExclLines585b.length} exclamation line(s) all followed by ≤2-word responses`,
            rule: 'DIALOGUE_EXCLAMATION_AFTERMATH_TERSE',
            severity: 'minor',
            description: `Every exclamation-ending dialogue line (${qualExclLines585b.length} instance(s)) is immediately followed by a response of two words or fewer — emotional outbursts earn only clipped, minimal replies. An exclamation raises the scene's emotional voltage to its maximum punctuation; when the reply is a monosyllable or a short phrase, the intensity goes unengaged. The other character absorbs the outburst without meeting it, being provoked by it, or registering it with more than a token response. This drains exclamations of dramatic consequence — they become intensity spikes that the scene immediately deflates rather than amplifies or answers.`,
            suggestedFix: `After at least one exclamation, give the other character a fuller response — a counter-reaction, a question provoked by the outburst, or an escalation that matches the emotional charge. An exclamation that earns only "Yeah" or "Okay" was not worth the exclamation mark. The follow-on should show that the emotional intensity registered and produced a dramatic response rather than an ambient deflation.`,
          });
        }
      }
    }
  }

  {
    // DIALOGUE_HEDGED_EXCLAMATION_FLOOD — co-occurrence × hesitation sound × "!" ending.
    // ≥10 dialogue lines, >15% contain BOTH a hesitation sound (um/uh/er/hmm) AND end in "!"
    // → fire. The "uncertain outburst" — characters simultaneously stammer and exclaim, producing
    // an incoherent register where hesitation (which signals tentativeness) and exclamation (which
    // signals certainty or strong emotion) contradict each other. A hesitation sound implies the
    // speaker is groping for words; an exclamation implies they have arrived at a feeling with
    // maximum force. Lines carrying both signals undercut themselves: the hedge reads as authorial
    // uncertainty about whether to commit to the emotional register, and the "!" reads as an
    // editorial boost applied to what is already a tentative line.
    // Distinct from: DIALOGUE_HEDGED_AFFIRMATION_FLOOD (Wave 557: hesitation + affirmation word —
    // different second signal), DIALOGUE_HEDGED_NEGATION_FLOOD (Wave 571: hesitation + negation —
    // different second signal), DIALOGUE_HEDGED_QUESTION_FLOOD (Wave 431: hedging-opener + "?" —
    // different hesitation type and punctuation), DIALOGUE_EXCLAMATION_BACKWARD_CAUSELESS (Wave 543:
    // backward-cause mode, not co-occurrence), DIALOGUE_HESITATION_FLOOD (Wave 361: hesitation alone),
    // DIALOGUE_EXCLAMATION_RUN (Wave 515: run-based consecutive "!" lines). Completes the hedged-X
    // co-occurrence family with the "!" channel alongside hedged question/affirmation/negation.
    const dlg585c: string[] = [];
    let inDlg585c = false;
    for (const line of allLines) {
      const t = line.trim();
      if (!t) { inDlg585c = false; continue; }
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) { inDlg585c = false; continue; }
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}(\s*\(.*\))?$/.test(t)) { inDlg585c = true; continue; }
      if (/^\(/.test(t)) continue;
      if (inDlg585c) dlg585c.push(t);
    }
    if (dlg585c.length >= 10) {
      const HES_PAT585c = /\b(um|uh|er|hmm|hm)\b/i;
      const hedgedExclCount585c = dlg585c.filter(t => HES_PAT585c.test(t) && t.trimEnd().endsWith('!')).length;
      if (hedgedExclCount585c / dlg585c.length > 0.15) {
        issues.push({
          location: `Dialogue — ${hedgedExclCount585c} of ${dlg585c.length} lines contain both hesitation and "!"`,
          rule: 'DIALOGUE_HEDGED_EXCLAMATION_FLOOD',
          severity: 'minor',
          description: `${hedgedExclCount585c} of ${dlg585c.length} dialogue lines (${Math.round(hedgedExclCount585c / dlg585c.length * 100)}%) contain both a hesitation sound ("um", "uh", "er", "hmm") and end in "!" — the "uncertain outburst." Hesitation signals that a speaker is groping for words, uncertain of their footing; an exclamation signals that a feeling or assertion has arrived with maximum force. Lines combining both signals contradict themselves: the stammer reads as authorial tentativeness about the emotional register, and the "!" reads as a boost applied editorially to a line that hasn't committed to the intensity. When more than 15% of dialogue lines carry both, the script is routinely hedging and exclaiming at the same time, producing a voice that is simultaneously unsure and emphatic — a register that reads as anxious rather than emotionally precise.`,
          suggestedFix: `Choose one register per line: either the character is uncertain (keep the hesitation, drop the "!") or they are committed to an outburst (drop the hesitation, keep the "!"). A character can waver first and then exclaim, but in adjacent lines — not in the same line. The "Um... I can't believe this!" moment works as two beats: the stammer is followed by the clean exclamation. Don't stack the hedging inside the exclamation.`,
        });
      }
    }
  }

  // ── Wave 599: DIALOGUE_HIGHLIGHT_REVELATION_DECOUPLED, UNRESOLVED_CLUE_DROUGHT_RUN,
  //              REVELATION_ZONE_IMBALANCE ──────────────────────────────────────────────────

  // DIALOGUE_HIGHLIGHT_REVELATION_DECOUPLED — Co-occurrence/decoupling × dialogueHighlights ×
  // revelation. Built on checkCoOccurrenceDecoupled from the shared checks library. n≥6, ≥2
  // scenes carrying a tracked belief statement (dialogueHighlights non-empty), ≥2 revelation
  // scenes. Zero overlap → fire. A character voicing a conviction and the story disclosing a
  // hidden truth never share a scene — the moment a hidden truth surfaces is a natural occasion
  // for a character's voice to register it (through belief, denial, or a stated reaction), yet
  // the two channels run on separate tracks.
  // Distinct from: every other check in this pass, none of which pair dialogueHighlights with
  // revelation — dialogueHighlights had exactly one prior use (SUBTEXT_ABSENCE, a pure text-scan
  // for direct-emotion phrases) and revelation had none (the word only ever appeared inside prose
  // suggestion text, never as an accessed field).
  {
    const r599a = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: r => (r.dialogueHighlights ?? []).length > 0,
      isB: r => r.revelation !== null && r.revelation !== '' && r.revelation !== undefined,
    });
    if (r599a.fires) {
      issues.push({
        location: `${r599a.aCount} dialogue-highlight scene(s) and ${r599a.bCount} revelation scene(s) — zero overlap`,
        rule: 'DIALOGUE_HIGHLIGHT_REVELATION_DECOUPLED',
        severity: 'minor',
        description: `The script has ${r599a.aCount} scene(s) where a character voices a tracked belief and ${r599a.bCount} revelation scene(s), but the two never coincide. A hidden truth coming to light is exactly the moment a character's own conviction is tested — do they believe it, deny it, or does it confirm something they already suspected. When disclosure and voiced belief never share a scene, revelations land as plot information rather than moments the characters are heard reacting to.`,
        suggestedFix: `Let at least one revelation scene also carry a character stating what they now believe — a line of denial, confirmation, or reinterpretation spoken in reaction to the disclosed truth. The revelation lands harder when the audience hears a character's voice process it, not just the fact of the reveal.`,
      });
    }
  }

  // UNRESOLVED_CLUE_DROUGHT_RUN — Run-based × unresolvedClues absence. Built on checkDroughtRun
  // from the shared checks library. n≥10, ≥3 scenes carrying outstanding clue-debt, longest
  // consecutive run of scenes with NO outstanding debt ≥6 → fire. First use of the unresolvedClues
  // signal in this 101-rule file — an extended stretch where no mystery is left open at all, even
  // though the story does carry unresolved threads elsewhere, means the story's sense of active
  // unanswered questions goes fully dark for a long run.
  {
    const r599b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r599b.fires) {
      issues.push({
        location: `longest stretch with no outstanding clue-debt: ${r599b.longestRun} consecutive scenes`,
        rule: 'UNRESOLVED_CLUE_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r599b.longestRun} consecutive scenes with no outstanding clue-debt at all — no lingering unanswered thread — even though ${r599b.presentCount} scenes elsewhere do carry open mysteries. A long stretch where nothing is left unresolved means the story's sense of active, unanswered questions goes fully dark for an extended run, even if the surrounding scenes are otherwise eventful.`,
        suggestedFix: `Seed a new thread somewhere within the ${r599b.longestRun}-scene stretch so the story maintains some outstanding mystery throughout — a question doesn't need to be answered soon, it only needs to exist, keeping the audience's sense of active curiosity alive across the run.`,
      });
    }
  }

  // REVELATION_ZONE_IMBALANCE — Underweight/bloat × revelation × four structural zones. Built
  // on checkZoneImbalance from the shared checks library. n≥10, ≥4 revelation scenes total,
  // divided across four equal structural zones. Fires only when one zone has zero revelations
  // while another holds ≥50% of the total — the first use of the revelation field as a per-scene
  // signal in this file at all, and the first application of checkZoneImbalance to the revelation
  // channel across every pass touched this session.
  {
    const r599c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.revelation !== null && r.revelation !== '' && r.revelation !== undefined,
    });
    if (r599c.fires) {
      const emptyNames599c = r599c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName599c = FOUR_ZONE_NAMES[r599c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames599c} empty; ${bloatName599c} has ${r599c.counts[r599c.bloatZoneIdx]}/${r599c.totalCount} revelations`,
        rule: 'REVELATION_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r599c.totalCount} revelations are unevenly distributed across its four structural zones: ${bloatName599c} contains ${r599c.counts[r599c.bloatZoneIdx]} of them (${Math.round((r599c.counts[r599c.bloatZoneIdx] / r599c.totalCount) * 100)}%) while ${emptyNames599c} contains none. Disclosure bloats in one structural quarter and vanishes from another, giving the audience's sense of ongoing discovery an uneven rhythm across the story.`,
        suggestedFix: `Redistribute disclosures: move at least one revelation from ${bloatName599c} into the empty zone(s) — ${emptyNames599c} — so every structural quarter carries some new information coming to light.`,
      });
    }
  }

  // ── Wave 613: DRAMATIC_TURN_DIALOGUE_HIGHLIGHT_DECOUPLED, VOICE_STAGING_ZONE_IMBALANCE,
  //              CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID ────────────────────────────────────

  // DRAMATIC_TURN_DIALOGUE_HIGHLIGHT_DECOUPLED — Co-occurrence/decoupling × dramaticTurn ×
  // dialogueHighlights. Built on checkCoOccurrenceDecoupled from the shared checks library. n≥6,
  // ≥2 dramatic-turn scenes, ≥2 scenes carrying a curated dialogue highlight. Zero overlap →
  // fire. The story's structural pivots never coincide with a line the story itself judged worth
  // highlighting — every reversal, revelation, or turning point lands in a scene with no standout
  // dialogue, and every memorable line lands while nothing pivots. First use of the dramaticTurn
  // field anywhere in this 104-rule pass. Distinct from DIALOGUE_HIGHLIGHT_REVELATION_DECOUPLED
  // (Wave 599: pairs dialogueHighlights with revelation specifically — a narrower disclosure
  // event — not the broader dramaticTurn channel, which also covers reversals and other pivots).
  {
    const r613a = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
      isB: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r613a.fires) {
      issues.push({
        location: `${r613a.aCount} dramatic-turn scene(s), ${r613a.bCount} dialogue-highlight scene(s) — zero overlap`,
        rule: 'DRAMATIC_TURN_DIALOGUE_HIGHLIGHT_DECOUPLED',
        severity: 'minor',
        description: `The ${r613a.aCount} scenes carrying a dramatic turn never coincide with the ${r613a.bCount} scenes flagged as containing a standout line of dialogue — the story's structural pivots and its most memorable dialogue run on entirely separate tracks. A reversal or turning point often lands hardest through the line that names what just changed; when the two channels never touch, the story's pivots happen in verbal silence while its memorable lines carry no structural weight.`,
        suggestedFix: `Let at least one dramatic turn land in a scene that also carries a line worth remembering — a character naming what the reversal costs, or a piece of dialogue whose weight comes precisely from the pivot happening. Tying the story's most memorable lines to its structural turns gives each pivot a voice.`,
      });
    }
  }

  // VOICE_STAGING_ZONE_IMBALANCE — Underweight/bloat × visualBeats × four structural zones.
  // Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes with substantial
  // physical staging (visualBeats.length≥2), divided into four equal structural zones. Fires only
  // when one zone has zero visually dense scenes while another holds ≥50% of the total. First use
  // of the visualBeats field anywhere in this pass — every existing check here is either a pure
  // text-scan over dialogue/action lines or (since Wave 599) a check on dialogueHighlights/
  // revelation/unresolvedClues; this is the first to audit how physical staging — as opposed to
  // spoken voice — is spread across the four structural quarters.
  {
    const r613b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r613b.fires) {
      const emptyNames613b = r613b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName613b = FOUR_ZONE_NAMES[r613b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames613b} empty; ${bloatName613b} has ${r613b.counts[r613b.bloatZoneIdx]}/${r613b.totalCount} visually dense scenes`,
        rule: 'VOICE_STAGING_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r613b.totalCount} physically staged scenes are unevenly distributed across its four structural zones: ${bloatName613b} contains ${r613b.counts[r613b.bloatZoneIdx]} of them (${Math.round((r613b.counts[r613b.bloatZoneIdx] / r613b.totalCount) * 100)}%) while ${emptyNames613b} contains none. Physical staging bloats in one structural quarter and vanishes from another, giving the story's balance between staged and spoken scenes an uneven rhythm across its four quarters.`,
        suggestedFix: `Redistribute physical staging: bring at least one heavily staged scene into ${emptyNames613b}, or thin out ${bloatName613b}'s concentration by letting one of its visually dense scenes lean more on dialogue instead. A more even spread keeps physical presence active alongside the story's spoken voice throughout.`,
      });
    }
  }

  // CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID — Sequence/aftermath × clockRaised trigger →
  // dialogueHighlights absence. Built on checkAftermathVoid from the shared checks library. n≥8,
  // ≥2 qualifying clockRaised scenes (pos<n-2), ≥3 scenes anywhere with a dialogue highlight, a
  // 2-scene lookahead window. Fires when every clock-raising scene's two-scene aftermath contains
  // no highlighted dialogue, while highlighted dialogue does occur elsewhere in the story. First
  // use of the clockRaised field anywhere in this pass. Every deadline-raising beat passes into an
  // aftermath with no memorable verbal moment — the mounting time pressure never gets a voice.
  // Distinct from DIALOGUE_HIGHLIGHT_REVELATION_DECOUPLED (Wave 599: same-scene co-occurrence
  // with the revelation channel, not a windowed check on the clock channel).
  {
    const r613c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 3, window: 2,
      isTrigger: r => r.clockRaised === true,
      isAftermath: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r613c.fires) {
      issues.push({
        location: `${r613c.triggerCount} clock-raising scene(s) — no highlighted dialogue within 2 scenes of any`,
        rule: 'CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r613c.triggerCount} clock-raising scenes is followed by two scenes with no highlighted dialogue, even though ${r613c.aftermathCount} such scenes exist elsewhere in the script. Time pressure that mounts without a nearby memorable line means the deadline's weight is tracked mechanically but never voiced — no character's speech registers the tightening clock in a way the story itself flags as worth remembering.`,
        suggestedFix: `After at least one clock-raising scene, let one of the following two scenes carry a line worth remembering — a character naming what the shrinking time means or what it will cost. Give the mounting deadline pressure a voice, not just a structural countdown.`,
      });
    }
  }

  // ── Wave 627: VOICE_PAYOFF_STAGING_DECOUPLED, VOICE_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID,
  //              VOICE_RELATIONSHIP_SHIFT_ZONE_IMBALANCE ───────────────────────────────────

  // VOICE_PAYOFF_STAGING_DECOUPLED — Co-occurrence/decoupling × payoffSetupIds × visualBeats.
  // Built on checkCoOccurrenceDecoupled from the shared checks library. n≥6, ≥2 payoff scenes, ≥2
  // visually-staged scenes (visualBeats.length≥2). Zero overlap → fire. First use of the
  // payoffSetupIds field anywhere in this 107-rule pass. A resolution and a scene rich in physical
  // staging never happen together — every payoff lands through spoken dialogue alone, with no
  // physical beat carrying the resolution's weight.
  {
    const r627a = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: r => (r.payoffSetupIds ?? []).length > 0,
      isB: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r627a.fires) {
      issues.push({
        location: `${r627a.aCount} payoff scene(s), ${r627a.bCount} visually-staged scene(s) — zero overlap`,
        rule: 'VOICE_PAYOFF_STAGING_DECOUPLED',
        severity: 'minor',
        description: `The ${r627a.aCount} scenes where a planted thread resolves never coincide with the ${r627a.bCount} scenes leaning heavily on physical staging — resolution and physical presence run on separate tracks. A payoff often lands with more force when a character's physical action embodies what the resolution means, rather than the moment being carried entirely through spoken dialogue.`,
        suggestedFix: `Let at least one payoff scene also lean on physical staging — an action or object a character handles that embodies what just resolved, alongside whatever voice carries the scene.`,
      });
    }
  }

  // VOICE_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID — Sequence/aftermath × seededClueIds trigger →
  // dialogueHighlights absence. Built on checkAftermathVoid from the shared checks library. n≥8,
  // ≥2 qualifying seed scenes (pos<n-2), ≥3 scenes anywhere with a dialogue highlight, a 2-scene
  // lookahead window. Fires when every seed's two-scene aftermath contains no highlighted
  // dialogue, while highlighted dialogue does occur elsewhere. First use of the seededClueIds
  // field anywhere in this pass — every planted clue passes into an aftermath with no memorable
  // verbal moment giving the material texture.
  {
    const r627b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 3, window: 2,
      isTrigger: r => (r.seededClueIds ?? []).length > 0,
      isAftermath: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r627b.fires) {
      issues.push({
        location: `${r627b.triggerCount} seed scene(s) — no highlighted dialogue within 2 scenes of any`,
        rule: 'VOICE_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r627b.triggerCount} clue-planting scenes is followed by two scenes with no highlighted dialogue, even though ${r627b.aftermathCount} such scenes exist elsewhere in the script. Seeds gain voice when a nearby line gives them verbal texture, but that opportunity consistently passes unremarked in the scenes immediately following every seed.`,
        suggestedFix: `After at least one seed, let one of the following two scenes carry a line worth remembering — a character circling the planted material, giving it verbal presence before its eventual payoff.`,
      });
    }
  }

  // VOICE_RELATIONSHIP_SHIFT_ZONE_IMBALANCE — Underweight/bloat × relationshipShifts × four
  // structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes
  // carrying a relationship shift, divided across four equal structural zones. Fires only when
  // one zone has zero shifts while another holds ≥50% of the total. First use of the
  // relationshipShifts field anywhere in this 107-rule pass — every existing check here operates
  // on lexical/textual dialogue patterns or the clock/turn/revelation/dialogueHighlights record
  // channels, never the relational-movement signal.
  {
    const r627c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r627c.fires) {
      const emptyNames627c = r627c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName627c = FOUR_ZONE_NAMES[r627c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames627c} empty; ${bloatName627c} has ${r627c.counts[r627c.bloatZoneIdx]}/${r627c.totalCount} relationship-shift scenes`,
        rule: 'VOICE_RELATIONSHIP_SHIFT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r627c.totalCount} relationship-shift scenes are unevenly distributed across its four structural zones: ${bloatName627c} contains ${r627c.counts[r627c.bloatZoneIdx]} of them (${Math.round((r627c.counts[r627c.bloatZoneIdx] / r627c.totalCount) * 100)}%) while ${emptyNames627c} contains none. Relational movement bloats in one structural quarter and vanishes from another, giving the story's verbal-relational rhythm an uneven pulse across its four quarters.`,
        suggestedFix: `Redistribute relationship shifts: bring at least one bond change into ${emptyNames627c}, so every structural quarter carries some relational movement rather than only the quarter currently carrying most of them.`,
      });
    }
  }

  // ── Wave 641: VOICE_SUSPENSE_FLATLINE, VOICE_CURIOSITY_ZONE_IMBALANCE,
  //              VOICE_CLOCK_DELTA_PEAK_UNCAUSED ────────────────────────────────────────────

  // VOICE_SUSPENSE_FLATLINE — Average/aggregate × suspenseDelta variety. n≥8. Fewer than 20% of
  // scenes deviate from the average suspenseDelta by more than 30% of that average → fire. First
  // use of the suspenseDelta field anywhere in this 110-rule pass. A story's tension signal that
  // barely moves scene to scene is a structural-signal flatline distinct from every text-level
  // rhythm check this pass already runs.
  if (records.length >= 8) {
    const suspenseVals641a = records.map(r => r.suspenseDelta ?? 0);
    const avgSusp641a = suspenseVals641a.reduce((s, v) => s + v, 0) / suspenseVals641a.length;
    if (Math.abs(avgSusp641a) > 1e-9) {
      const variedSusp641a = suspenseVals641a.filter(v => Math.abs(v - avgSusp641a) > Math.abs(avgSusp641a) * 0.3).length;
      if (variedSusp641a < suspenseVals641a.length * 0.2) {
        issues.push({
          location: 'suspenseDelta throughout',
          rule: 'VOICE_SUSPENSE_FLATLINE',
          severity: 'minor',
          description: `Fewer than 20% of the story's ${records.length} scenes deviate from the average suspenseDelta (${avgSusp641a.toFixed(2)}) by more than 30% — the tension signal barely moves from scene to scene. A story's suspense should have its own rhythm of rises and lulls; when it sits close to its own average almost everywhere, the tension track reads as a flat hum regardless of how varied the dialogue is scene to scene.`,
          suggestedFix: `Introduce at least a few scenes with a suspenseDelta clearly above or below the story's average — a sharp escalation or a deliberate lull — so the tension signal has peaks and valleys the audience can feel.`,
        });
      }
    }
  }

  // VOICE_CURIOSITY_ZONE_IMBALANCE — Underweight/bloat × curiosityDelta × four structural zones.
  // Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 curiosity-positive
  // scenes total, divided across four equal structural zones. Fires only when one zone has zero
  // such scenes while another holds ≥50% of the total. First use of the curiosityDelta field
  // anywhere in this pass.
  {
    const r641b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r641b.fires) {
      const emptyNames641b = r641b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName641b = FOUR_ZONE_NAMES[r641b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames641b} empty; ${bloatName641b} has ${r641b.counts[r641b.bloatZoneIdx]}/${r641b.totalCount} curiosity-spike scenes`,
        rule: 'VOICE_CURIOSITY_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r641b.totalCount} curiosity-spike scenes are unevenly distributed across its four structural zones: ${bloatName641b} contains ${r641b.counts[r641b.bloatZoneIdx]} of them (${Math.round((r641b.counts[r641b.bloatZoneIdx] / r641b.totalCount) * 100)}%) while ${emptyNames641b} contains none. New questions bloat in one structural quarter and vanish from another, giving the audience's sense of active wondering an uneven structural rhythm.`,
        suggestedFix: `Redistribute curiosity spikes: move at least one moment that raises a new question into the empty zone(s) — ${emptyNames641b} — so every structural quarter keeps the audience actively wondering about something.`,
      });
    }
  }

  // VOICE_CLOCK_DELTA_PEAK_UNCAUSED — Backward-cause × clockDelta-magnitude peak × dramaticTurn/
  // revelation cause. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes
  // with clockDelta>0, a 2-scene lookback. Finds the single scene with the highest clockDelta and
  // fires when neither that scene nor either of the 2 scenes before it contains a dramatic turn or
  // a revelation. First use of the clockDelta field and the backward-cause mode in this pass.
  {
    const r641c = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => r.clockDelta ?? 0,
      hasCause: r => (r.dramaticTurn ?? 'nothing') !== 'nothing' || r.revelation != null,
    });
    if (r641c.fires) {
      issues.push({
        location: `Scene at position ${r641c.peakIdx + 1} — peak clockDelta (${r641c.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'VOICE_CLOCK_DELTA_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The scene with the story's single highest clockDelta (${r641c.peakMagnitude}, out of ${r641c.qualifyingCount} scenes that raise the clock at all) has no dramatic turn and no revelation in itself or in either of the 2 scenes before it. The moment time pressure compresses most sharply arrives with no pivot or disclosure explaining why.`,
        suggestedFix: `Add a dramatic turn or a revelation in the scene that raises the clock most sharply, or in one of the two scenes before it, so the audience understands why the deadline suddenly tightens this hard.`,
      });
    }
  }

  // ── Wave 655: VOICE_CHARACTER_MOMENT_ZONE_CLUSTER, VOICE_STAGING_PEAK_UNCAUSED,
  //              VOICE_SEED_DROUGHT_RUN ─────────────────────────────────────────────────────

  // VOICE_CHARACTER_MOMENT_ZONE_CLUSTER — Distribution/timing × purpose === 'character_moment' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // character-moment scenes, fires when >75% of them fall in a single structural third. First
  // checkZoneCluster use in this pass, and the first genuine use of the `purpose` field, which had
  // zero prior accesses in this 113-rule pass despite being a real ScenePurpose enum. A voice pass
  // whose character-defining beats concentrate almost entirely in one third leaves the rest of the
  // script with no dedicated space for personal voice to surface.
  {
    const r655a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'character_moment',
    });
    if (r655a.fires) {
      const zoneName655a = r655a.zoneNames[r655a.maxZoneIdx];
      issues.push({
        location: `${zoneName655a} third — ${r655a.maxZoneCount}/${r655a.count} character-moment scenes`,
        rule: 'VOICE_CHARACTER_MOMENT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r655a.maxZoneCount} of the story's ${r655a.count} scenes purposed as character moments (${Math.round((r655a.maxZoneCount / r655a.count) * 100)}%) cluster in the ${zoneName655a} third. Dedicated space for personal voice concentrates almost exclusively in that stretch of the story rather than surfacing throughout, leaving other structural thirds with no scene purposed to let a character's individual voice lead.`,
        suggestedFix: `Give at least one scene outside the ${zoneName655a} third a character-moment purpose — spreading dedicated voice beats across the story lets every structural third carry some space for a character's individual perspective.`,
      });
    }
  }

  // VOICE_STAGING_PEAK_UNCAUSED — Single-peak isolation/backward-cause × visualBeats magnitude.
  // Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 visually-staged scenes, a
  // 2-scene lookback. Finds the single scene with the densest physical staging; fires when
  // neither that scene nor either of the two before it contains a dramatic turn or revelation.
  // Wave 641 applied the peak-uncaused mode to clockDelta; visualBeats itself has never been
  // peak-audited here.
  {
    const r655b = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.visualBeats ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r655b.fires) {
      issues.push({
        location: `scene ${r655b.peakIdx + 1} — peak physical-staging density (${r655b.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'VOICE_STAGING_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for physical staging (scene ${r655b.peakIdx + 1}, with ${r655b.peakMagnitude} staged beats) has no dramatic turn or revelation in itself or the two scenes before it. The moment where physical action concentrates most heavily arrives without any structural pivot or disclosure driving it — the peak of staged action carries no causal weight behind it.`,
        suggestedFix: `Give scene ${r655b.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most physically active moment is earned by a shift in the plot rather than arriving in a causal vacuum.`,
      });
    }
  }

  // VOICE_SEED_DROUGHT_RUN — Run-based × seededClueIds absence. Built on checkDroughtRun from the
  // shared checks library. n≥10, ≥3 seed scenes overall, fires when the longest consecutive run of
  // scenes with zero clue seeded reaches 6. This pass already has UNRESOLVED_CLUE_DROUGHT_RUN on
  // the unresolvedClues channel; seededClueIds itself has never been drought-audited here.
  {
    const r655c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.seededClueIds ?? []).length > 0,
    });
    if (r655c.fires) {
      issues.push({
        location: `longest stretch with no clue seeded: ${r655c.longestRun} consecutive scenes`,
        rule: 'VOICE_SEED_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r655c.longestRun} consecutive scenes with no clue seeded at all, even though ${r655c.presentCount} scenes elsewhere do plant new material. A long unbroken stretch where nothing new is planted leaves the story's voice coasting on prior setups with nothing fresh to draw on.`,
        suggestedFix: `Seed a new clue or thread somewhere within the ${r655c.longestRun}-scene stretch so the story keeps planting forward momentum throughout, not only in isolated bursts.`,
      });
    }
  }

  // ── Wave 669: VOICE_HIGHLIGHT_PEAK_UNCAUSED, VOICE_PAYOFF_DROUGHT_RUN,
  //              VOICE_RELATIONSHIP_ZONE_CLUSTER ───────────────────────────────────────────────

  // VOICE_HIGHLIGHT_PEAK_UNCAUSED — Single-peak isolation/backward-cause × dialogueHighlights
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes carrying
  // a dialogue highlight, a 2-scene lookback. Finds the single scene with the most highlighted
  // lines; fires when neither that scene nor either of the two before it contains a dramatic turn
  // or revelation. dialogueHighlights already anchors two decoupled checks and two aftermath-void
  // checks here, but has never been backward-cause peak-audited.
  {
    const r669a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.dialogueHighlights ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r669a.fires) {
      issues.push({
        location: `scene ${r669a.peakIdx + 1} — peak highlighted-dialogue density (${r669a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'VOICE_HIGHLIGHT_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for highlighted dialogue (scene ${r669a.peakIdx + 1}, with ${r669a.peakMagnitude} standout lines) has no dramatic turn or revelation in itself or the two scenes before it. The moment where the script's most memorable dialogue concentrates arrives without any structural pivot or disclosure driving it — the peak of verbal craft carries no causal weight behind it.`,
        suggestedFix: `Give scene ${r669a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most quotable moment is earned by a shift in the plot rather than arriving in a causal vacuum.`,
      });
    }
  }

  // VOICE_PAYOFF_DROUGHT_RUN — Run-based × payoffSetupIds absence. Built on checkDroughtRun from
  // the shared checks library. n≥10, ≥3 payoff scenes overall, fires when the longest consecutive
  // run of scenes with zero thread resolution reaches 6. payoffSetupIds has only ever anchored a
  // single co-occurrence/decoupling check here; the drought-run mode applied to this channel for
  // the first time.
  {
    const r669b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.payoffSetupIds ?? []).length > 0,
    });
    if (r669b.fires) {
      issues.push({
        location: `longest stretch with no payoff: ${r669b.longestRun} consecutive scenes`,
        rule: 'VOICE_PAYOFF_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r669b.longestRun} consecutive scenes with no thread resolving at all, even though ${r669b.presentCount} scenes elsewhere do pay off a setup. A long stretch where nothing resolves leaves the story's voice running on unresolved momentum for an extended run.`,
        suggestedFix: `Resolve at least one thread somewhere within the ${r669b.longestRun}-scene stretch so the voice's sense of accumulating satisfaction keeps building throughout that stretch.`,
      });
    }
  }

  // VOICE_RELATIONSHIP_ZONE_CLUSTER — Distribution/timing × relationshipShifts × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 relationship-shift
  // scenes, fires when >75% of them fall in a single structural third. relationshipShifts has
  // only been zone-IMBALANCE-audited (four-zone bloat/empty); this is the first application of
  // the thirds-based zone-cluster mode to the relational channel.
  {
    const r669c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r669c.fires) {
      const zoneName669c = r669c.zoneNames[r669c.maxZoneIdx];
      issues.push({
        location: `${zoneName669c} third — ${r669c.maxZoneCount}/${r669c.count} relationship-shift scenes`,
        rule: 'VOICE_RELATIONSHIP_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r669c.maxZoneCount} of the story's ${r669c.count} relationship-shift scenes (${Math.round((r669c.maxZoneCount / r669c.count) * 100)}%) cluster in the ${zoneName669c} third. Bond changes concentrate almost exclusively in that stretch rather than surfacing throughout, leaving other structural thirds with no relational movement carrying the voice.`,
        suggestedFix: `Let a bond shift in at least one scene outside the ${zoneName669c} third — spreading relational movement across the story lets each structural third carry its own sense of changing dynamics.`,
      });
    }
  }

  // ── Wave 683: VOICE_OPEN_THREAD_PEAK_UNCAUSED, VOICE_CURIOSITY_DROUGHT_RUN,
  //              VOICE_SUSPENSE_ZONE_CLUSTER ───────────────────────────────────────────────────

  // VOICE_OPEN_THREAD_PEAK_UNCAUSED — Single-peak isolation/backward-cause × unresolvedClues
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes carrying
  // an open thread, a 2-scene lookback. Finds the single scene with the densest open-thread count;
  // fires when neither that scene nor either of the two before it contains a dramatic turn or
  // revelation. Distinct from Wave 599's UNRESOLVED_CLUE_DROUGHT_RUN, which measures the longest
  // absence of open threads rather than whether the peak concentration is backward-caused.
  {
    const r683a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.unresolvedClues ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r683a.fires) {
      issues.push({
        location: `scene ${r683a.peakIdx + 1} — peak open-thread density (${r683a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'VOICE_OPEN_THREAD_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for outstanding open threads (scene ${r683a.peakIdx + 1}, with ${r683a.peakMagnitude} unresolved clues) has no dramatic turn or revelation in itself or the two scenes before it. The moment where accumulated mystery concentrates most heavily arrives without any structural pivot or disclosure driving it — a spike in unanswered questions with no causal weight behind it.`,
        suggestedFix: `Give scene ${r683a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most thread-dense moment is earned by a shift in the plot rather than arriving in a causal vacuum.`,
      });
    }
  }

  // VOICE_CURIOSITY_DROUGHT_RUN — Run-based × curiosityDelta>0 absence. Built on checkDroughtRun
  // from the shared checks library. n≥10, ≥3 curiosity-spike scenes overall, fires when the
  // longest consecutive run of scenes with no new curiosity spike reaches 6. Wave 641's VOICE_
  // CURIOSITY_ZONE_IMBALANCE already four-zone-audits this channel's bloat/empty distribution;
  // curiosityDelta itself has never been drought-audited here.
  {
    const r683b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r683b.fires) {
      issues.push({
        location: `longest stretch with no new curiosity spike: ${r683b.longestRun} consecutive scenes`,
        rule: 'VOICE_CURIOSITY_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r683b.longestRun} consecutive scenes with no new curiosity spike at all, even though ${r683b.presentCount} scenes elsewhere raise a fresh question. A long unbroken stretch with nothing new to wonder about leaves the audience's active curiosity dormant for an extended run.`,
        suggestedFix: `Raise a new question or unknown somewhere within the ${r683b.longestRun}-scene stretch so the audience's sense of active curiosity keeps building throughout that stretch.`,
      });
    }
  }

  // VOICE_SUSPENSE_ZONE_CLUSTER — Distribution/timing × suspenseDelta>0 × structural thirds. Built
  // on checkZoneCluster from the shared checks library. n≥9, ≥3 scenes with a positive suspense
  // delta, fires when >75% of them fall in a single structural third. Distinct from Wave 641's
  // VOICE_SUSPENSE_FLATLINE, which checks average/aggregate variety of suspenseDelta across the
  // whole story rather than where positive spikes concentrate structurally.
  {
    const r683c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r683c.fires) {
      const zoneName683c = r683c.zoneNames[r683c.maxZoneIdx];
      issues.push({
        location: `${zoneName683c} third — ${r683c.maxZoneCount}/${r683c.count} rising-suspense scenes`,
        rule: 'VOICE_SUSPENSE_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r683c.maxZoneCount} of the story's ${r683c.count} rising-suspense scenes (${Math.round((r683c.maxZoneCount / r683c.count) * 100)}%) cluster in the ${zoneName683c} third. Tension spikes concentrate almost exclusively in that stretch rather than surfacing throughout, leaving other structural thirds with no rising dread to carry the voice.`,
        suggestedFix: `Let suspense rise in at least one scene outside the ${zoneName683c} third — spreading tension spikes across the story lets each structural third carry its own sense of mounting dread.`,
      });
    }
  }

  // ── Wave 697: VOICE_SEED_ZONE_CLUSTER, VOICE_PAYOFF_PEAK_UNCAUSED, VOICE_STAGING_DROUGHT_RUN ──

  // VOICE_SEED_ZONE_CLUSTER — Distribution/timing × seededClueIds × structural thirds. Built on
  // checkZoneCluster from the shared checks library. n≥9, ≥3 seed scenes, fires when >75% of them
  // fall in a single structural third. Wave 655's VOICE_SEED_DROUGHT_RUN applied the drought-run
  // mode to seededClueIds; the zone-cluster mode has never been applied to this channel.
  {
    const r697a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.seededClueIds ?? []).length > 0,
    });
    if (r697a.fires) {
      const zoneName697a = r697a.zoneNames[r697a.maxZoneIdx];
      issues.push({
        location: `${zoneName697a} third — ${r697a.maxZoneCount}/${r697a.count} seed scenes`,
        rule: 'VOICE_SEED_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r697a.maxZoneCount} of the story's ${r697a.count} clue-planting scenes (${Math.round((r697a.maxZoneCount / r697a.count) * 100)}%) cluster in the ${zoneName697a} third. Foreshadowing concentrates almost exclusively in that stretch of the story rather than surfacing throughout, giving the story's voice an uneven structural rhythm of promises made.`,
        suggestedFix: `Plant at least one clue outside the ${zoneName697a} third — spreading foreshadowing across the story lets the voice's sense of accumulating mystery build gradually instead of arriving all at once.`,
      });
    }
  }

  // VOICE_PAYOFF_PEAK_UNCAUSED — Single-peak isolation/backward-cause × payoffSetupIds magnitude.
  // Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 payoff scenes, a 2-scene
  // lookback. Finds the single scene with the most simultaneous thread resolutions; fires when
  // neither that scene nor either of the two before it contains a dramatic turn or revelation.
  // Wave 669's VOICE_PAYOFF_DROUGHT_RUN applied the drought-run mode to payoffSetupIds; the
  // backward-cause peak mode has never been applied to this channel.
  {
    const r697b = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.payoffSetupIds ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r697b.fires) {
      issues.push({
        location: `scene ${r697b.peakIdx + 1} — peak payoff density (${r697b.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'VOICE_PAYOFF_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for thread resolution (scene ${r697b.peakIdx + 1}, with ${r697b.peakMagnitude} payoffs resolving at once) has no dramatic turn or revelation in itself or the two scenes before it. The moment where the most convergent resolution lands arrives without any structural pivot or disclosure driving it — the peak of narrative payoff carries no causal weight behind it.`,
        suggestedFix: `Give scene ${r697b.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most convergent resolution is earned by a shift in the plot rather than arriving in a causal vacuum.`,
      });
    }
  }

  // VOICE_STAGING_DROUGHT_RUN — Run-based × visualBeats absence. Built on checkDroughtRun from the
  // shared checks library. n≥10, ≥3 physically-staged scenes overall, fires when the longest
  // consecutive run of scenes with zero visual beats reaches 6. Wave 655's VOICE_STAGING_PEAK_
  // UNCAUSED applied the backward-cause peak mode to visualBeats; the drought-run mode has never
  // been applied to this channel.
  {
    const r697c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.visualBeats ?? []).length > 0,
    });
    if (r697c.fires) {
      issues.push({
        location: `longest stretch with zero visual staging: ${r697c.longestRun} consecutive scenes`,
        rule: 'VOICE_STAGING_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r697c.longestRun} consecutive scenes with no visual staging beats at all, even though ${r697c.presentCount} scenes elsewhere do carry physical staging. A long unbroken stretch of pure dialogue or exposition with nothing physically shown leaves the story's voice without any staged action to anchor it.`,
        suggestedFix: `Add a physical staging beat somewhere within the ${r697c.longestRun}-scene stretch — a gesture, an object, a piece of blocking — so the story's voice stays visually grounded throughout.`,
      });
    }
  }

  // ── Wave 711: VOICE_STAGING_ZONE_CLUSTER, VOICE_SEED_PEAK_UNCAUSED, VOICE_PAYOFF_ZONE_CLUSTER ──

  // VOICE_STAGING_ZONE_CLUSTER — Distribution/timing × visualBeats × structural thirds. Built on
  // checkZoneCluster from the shared checks library. n≥9, ≥3 physically-staged scenes, fires when
  // >75% of them fall in a single structural third. Waves 655/697 applied the backward-cause peak
  // and drought-run modes to visualBeats; the zone-cluster mode has never been applied to it,
  // completing the trio.
  {
    const r711a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r711a.fires) {
      const zoneName711a = r711a.zoneNames[r711a.maxZoneIdx];
      issues.push({
        location: `${zoneName711a} third — ${r711a.maxZoneCount}/${r711a.count} visually dense scenes`,
        rule: 'VOICE_STAGING_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r711a.maxZoneCount} of the story's ${r711a.count} visually dense scenes (${Math.round((r711a.maxZoneCount / r711a.count) * 100)}%) cluster in the ${zoneName711a} third. Physical staging concentrates almost exclusively in that stretch of the story rather than surfacing throughout, leaving other structural thirds with no physically embodied voice.`,
        suggestedFix: `Give at least one scene outside the ${zoneName711a} third substantial physical staging — spreading embodied presence across the story lets each structural third carry some physical sense of the story's voice.`,
      });
    }
  }

  // VOICE_SEED_PEAK_UNCAUSED — Single-peak isolation/backward-cause × seededClueIds magnitude.
  // Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 seed scenes, a 2-scene
  // lookback. Finds the single scene with the most simultaneous clues planted; fires when neither
  // that scene nor either of the two before it contains a dramatic turn or revelation. Waves
  // 655/697 applied the drought-run and zone-cluster modes to seededClueIds; the backward-cause
  // peak mode has never been applied to it, completing the trio.
  {
    const r711b = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.seededClueIds ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r711b.fires) {
      issues.push({
        location: `scene ${r711b.peakIdx + 1} — peak seed density (${r711b.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'VOICE_SEED_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for planting new clues (scene ${r711b.peakIdx + 1}, with ${r711b.peakMagnitude} clues seeded at once) has no dramatic turn or revelation in itself or the two scenes before it. The moment where foreshadowing concentrates most heavily arrives without any structural pivot or disclosure driving it — an uncaused spike that undercuts the sense that the story's voice is causally connected.`,
        suggestedFix: `Give scene ${r711b.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most seed-dense moment is earned by a shift in circumstance rather than arriving in a causal vacuum.`,
      });
    }
  }

  // VOICE_PAYOFF_ZONE_CLUSTER — Distribution/timing × payoffSetupIds × structural thirds. Built on
  // checkZoneCluster from the shared checks library. n≥9, ≥3 payoff scenes, fires when >75% of
  // them fall in a single structural third. Waves 669/697 applied the drought-run and backward-
  // cause peak modes to payoffSetupIds; the zone-cluster mode has never been applied to it,
  // completing the trio.
  {
    const r711c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.payoffSetupIds ?? []).length > 0,
    });
    if (r711c.fires) {
      const zoneName711c = r711c.zoneNames[r711c.maxZoneIdx];
      issues.push({
        location: `${zoneName711c} third — ${r711c.maxZoneCount}/${r711c.count} payoff scenes`,
        rule: 'VOICE_PAYOFF_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r711c.maxZoneCount} of the story's ${r711c.count} thread-resolution scenes (${Math.round((r711c.maxZoneCount / r711c.count) * 100)}%) cluster in the ${zoneName711c} third. Resolution concentrates almost exclusively in that stretch of the story rather than landing throughout, leaving other structural thirds with no sense of the voice's resolutions paying off.`,
        suggestedFix: `Let at least one thread resolve outside the ${zoneName711c} third — spreading resolutions across the story lets the story's voice pay off gradually instead of arriving all at once.`,
      });
    }
  }

  // ── Wave 725: VOICE_HIGHLIGHT_DROUGHT_RUN, VOICE_RELATIONSHIP_PEAK_UNCAUSED,
  //              VOICE_OPEN_THREAD_DROUGHT_RUN ────────────────────────────────────────────────

  // VOICE_HIGHLIGHT_DROUGHT_RUN — Run-based × dialogueHighlights absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 highlighted-dialogue scenes overall,
  // fires when the longest consecutive run of scenes with no highlighted dialogue reaches 6.
  // Wave 669 applied the backward-cause peak mode to dialogueHighlights; the drought-run mode has
  // never been applied to it.
  {
    const r725a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r725a.fires) {
      issues.push({
        location: `longest stretch with no highlighted dialogue: ${r725a.longestRun} consecutive scenes`,
        rule: 'VOICE_HIGHLIGHT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r725a.longestRun} consecutive scenes with no highlighted dialogue at all, even though ${r725a.presentCount} scenes elsewhere carry a standout line. A long unbroken stretch with nothing verbally memorable leaves the story's voice running on unremarkable dialogue for an extended run.`,
        suggestedFix: `Give at least one scene within the ${r725a.longestRun}-scene stretch a standout line of dialogue — keeping the story's voice alive throughout that stretch.`,
      });
    }
  }

  // VOICE_RELATIONSHIP_PEAK_UNCAUSED — Single-peak isolation/backward-cause × relationshipShifts
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes carrying
  // a relationship shift, a 2-scene lookback. Finds the single scene with the most simultaneous
  // bond changes; fires when neither that scene nor either of the two before it contains a
  // dramatic turn or revelation. Wave 669 applied the zone-cluster mode to relationshipShifts;
  // the backward-cause peak mode has never been applied to it.
  {
    const r725b = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.relationshipShifts ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r725b.fires) {
      issues.push({
        location: `scene ${r725b.peakIdx + 1} — peak relationship-shift density (${r725b.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'VOICE_RELATIONSHIP_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for relationship shifts (scene ${r725b.peakIdx + 1}, with ${r725b.peakMagnitude} simultaneous bond changes) has no dramatic turn or revelation in itself or the two scenes before it. The moment where relational upheaval concentrates most heavily arrives without any structural pivot or disclosure driving it — an uncaused spike that undercuts the sense that the story's voice is causally connected.`,
        suggestedFix: `Give scene ${r725b.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most relationally dense moment is earned by a shift in circumstance rather than arriving in a causal vacuum.`,
      });
    }
  }

  // VOICE_OPEN_THREAD_DROUGHT_RUN — Run-based × unresolvedClues absence. Built on checkDroughtRun
  // from the shared checks library. n≥10, ≥3 open-thread scenes overall, fires when the longest
  // consecutive run of scenes with zero outstanding clue-debt reaches 6. Wave 683 applied the
  // backward-cause peak mode to unresolvedClues; the drought-run mode has never been applied to
  // it.
  {
    const r725c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r725c.fires) {
      issues.push({
        location: `longest stretch with no outstanding clue-debt: ${r725c.longestRun} consecutive scenes`,
        rule: 'VOICE_OPEN_THREAD_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r725c.longestRun} consecutive scenes with no outstanding clue-debt at all, even though ${r725c.presentCount} scenes elsewhere do carry open mysteries. A long stretch where nothing is left unresolved leaves the story's voice without any unanswered question to press against for an extended run.`,
        suggestedFix: `Seed a new thread somewhere within the ${r725c.longestRun}-scene stretch so the story's voice keeps some outstanding mystery to work against throughout that stretch.`,
      });
    }
  }

  // ── Wave 739: VOICE_OPEN_THREAD_ZONE_CLUSTER, VOICE_HIGHLIGHT_ZONE_CLUSTER,
  //              VOICE_RELATIONSHIP_DROUGHT_RUN ─────────────────────────────────────────────

  // VOICE_OPEN_THREAD_ZONE_CLUSTER — Distribution/timing × unresolvedClues × structural thirds.
  // Built on checkZoneCluster from the shared checks library. n≥9, ≥3 open-thread scenes, fires
  // when more than 75% of those scenes cluster in a single third. Waves 599/683 applied the
  // run-based drought and backward-cause peak modes to unresolvedClues; the zone-cluster mode has
  // never been applied to it, completing the trio.
  {
    const r739a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r739a.fires) {
      issues.push({
        location: `${r739a.zoneNames[r739a.maxZoneIdx]} third — ${r739a.maxZoneCount} of ${r739a.count} open-thread scenes`,
        rule: 'VOICE_OPEN_THREAD_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r739a.maxZoneCount / r739a.count) * 100)}% of the scenes carrying outstanding clue-debt cluster in the story's ${r739a.zoneNames[r739a.maxZoneIdx]} third. When every open question is left dangling in the same structural window, the story's voice has no unresolved mystery pressing on it anywhere else.`,
        suggestedFix: `Seed or carry forward at least one open thread outside the ${r739a.zoneNames[r739a.maxZoneIdx]} third so unresolved mystery keeps pressing on the story's voice throughout.`,
      });
    }
  }

  // VOICE_HIGHLIGHT_ZONE_CLUSTER — Distribution/timing × dialogueHighlights × structural thirds.
  // Built on checkZoneCluster from the shared checks library. n≥9, ≥3 highlighted-dialogue
  // scenes, fires when more than 75% of those scenes cluster in a single third. Waves 669/725
  // applied the backward-cause peak and run-based drought modes to dialogueHighlights; the
  // zone-cluster mode has never been applied to it, completing the trio.
  {
    const r739b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r739b.fires) {
      issues.push({
        location: `${r739b.zoneNames[r739b.maxZoneIdx]} third — ${r739b.maxZoneCount} of ${r739b.count} highlighted-dialogue scenes`,
        rule: 'VOICE_HIGHLIGHT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r739b.maxZoneCount / r739b.count) * 100)}% of the story's standout dialogue clusters in the ${r739b.zoneNames[r739b.maxZoneIdx]} third. When every memorable line lands in the same structural window, the story's voice goes quiet for the rest of the story.`,
        suggestedFix: `Give at least one scene outside the ${r739b.zoneNames[r739b.maxZoneIdx]} third a standout line of dialogue so the story's voice stays alive more evenly across the story.`,
      });
    }
  }

  // VOICE_RELATIONSHIP_DROUGHT_RUN — Run-based × relationshipShifts absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 relationship-shift scenes overall,
  // fires when the longest consecutive run of scenes with no bond change reaches 6. Waves 669/725
  // applied the zone-cluster and backward-cause peak modes to relationshipShifts; the drought-run
  // mode has never been applied to it, completing the trio.
  {
    const r739c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r739c.fires) {
      issues.push({
        location: `longest stretch with no relationship shift: ${r739c.longestRun} consecutive scenes`,
        rule: 'VOICE_RELATIONSHIP_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r739c.longestRun} consecutive scenes with no relationship shift at all, even though ${r739c.presentCount} scenes elsewhere do move a bond. A long unbroken stretch where nothing changes between characters leaves the story's voice with no relational movement to speak through for an extended run.`,
        suggestedFix: `Shift at least one relationship — however slightly — within the ${r739c.longestRun}-scene stretch so the story's voice keeps something relational to speak through throughout that stretch.`,
      });
    }
  }

  // ── Wave 753: VOICE_CLOCK_DELTA_DROUGHT_RUN, VOICE_CHARACTER_MOMENT_DROUGHT_RUN,
  //              VOICE_CURIOSITY_ZONE_CLUSTER ──────────────────────────────────────────────

  // VOICE_CLOCK_DELTA_DROUGHT_RUN — Run-based × clockDelta≠0 absence. Built on checkDroughtRun
  // from the shared checks library. n≥10, ≥3 clock-shifting scenes overall, fires when the
  // longest consecutive run of scenes with zero clock movement reaches 6. Wave 641 applied the
  // backward-cause peak mode to clockDelta; the drought-run mode has never been applied to it.
  {
    const r753a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.clockDelta ?? 0) !== 0,
    });
    if (r753a.fires) {
      issues.push({
        location: `longest stretch with no clock movement: ${r753a.longestRun} consecutive scenes`,
        rule: 'VOICE_CLOCK_DELTA_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r753a.longestRun} consecutive scenes with zero movement on the ticking clock at all, even though ${r753a.presentCount} scenes elsewhere do shift it. A long unbroken stretch where nothing tightens or loosens the deadline leaves the story's voice without any mechanical pressure to speak against for an extended run.`,
        suggestedFix: `Move the clock — tighten or ease the deadline — somewhere within the ${r753a.longestRun}-scene stretch so the story's voice keeps a mechanical pressure to speak against throughout that stretch.`,
      });
    }
  }

  // VOICE_CHARACTER_MOMENT_DROUGHT_RUN — Run-based × purpose === 'character_moment' absence.
  // Built on checkDroughtRun from the shared checks library. n≥10, ≥3 character-moment scenes
  // overall, fires when the longest consecutive run of scenes purposed otherwise reaches 6. Wave
  // 655 applied the zone-cluster mode to this signal; the drought-run mode has never been applied
  // to it.
  {
    const r753b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'character_moment',
    });
    if (r753b.fires) {
      issues.push({
        location: `longest stretch with no character-moment scene: ${r753b.longestRun} consecutive scenes`,
        rule: 'VOICE_CHARACTER_MOMENT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r753b.longestRun} consecutive scenes purposed otherwise than a character moment, even though ${r753b.presentCount} scenes elsewhere are dedicated to the protagonist's inner life. A long unbroken stretch with nothing but plot-forward scenes leaves the story's voice with no interior beat to speak through for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r753b.longestRun}-scene stretch as a character moment so the story's voice keeps a beat of interior reflection to speak through throughout that stretch.`,
      });
    }
  }

  // VOICE_CURIOSITY_ZONE_CLUSTER — Distribution/timing × curiosityDelta>0 presence × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 curiosity-positive
  // scenes, fires when more than 75% of those scenes cluster in a single third. Wave 683 applied
  // the run-based drought mode to curiosityDelta; the zone-cluster mode has never been applied to
  // it.
  {
    const r753c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r753c.fires) {
      issues.push({
        location: `${r753c.zoneNames[r753c.maxZoneIdx]} third — ${r753c.maxZoneCount} of ${r753c.count} curiosity-positive scenes`,
        rule: 'VOICE_CURIOSITY_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r753c.maxZoneCount / r753c.count) * 100)}% of the scenes where curiosity rises cluster in the ${r753c.zoneNames[r753c.maxZoneIdx]} third. When every spike in audience wonder lands in the same structural window, the story's voice goes quiet on fresh questions for the rest of the story.`,
        suggestedFix: `Raise curiosity in at least one scene outside the ${r753c.zoneNames[r753c.maxZoneIdx]} third so the story's voice keeps generating fresh questions more evenly across the story.`,
      });
    }
  }

  // ── Wave 767: VOICE_CLOCK_DELTA_ZONE_CLUSTER, VOICE_CURIOSITY_PEAK_UNCAUSED,
  //              VOICE_SUSPENSE_DROUGHT_RUN ──────────────────────────────────────

  // VOICE_CLOCK_DELTA_ZONE_CLUSTER — Distribution/timing × clockDelta≠0 presence × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 clock-shifting
  // scenes, fires when more than 75% of those scenes cluster in a single third. Waves 641/753
  // applied the backward-cause peak and run-based drought modes to clockDelta; the zone-cluster
  // mode has never been applied to it, completing the trio.
  {
    const r767a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.clockDelta ?? 0) !== 0,
    });
    if (r767a.fires) {
      issues.push({
        location: `${r767a.zoneNames[r767a.maxZoneIdx]} third — ${r767a.maxZoneCount} of ${r767a.count} clock-shifting scenes`,
        rule: 'VOICE_CLOCK_DELTA_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r767a.maxZoneCount / r767a.count) * 100)}% of the scenes where the clock shifts cluster in the ${r767a.zoneNames[r767a.maxZoneIdx]} third. When every deadline pressure shift lands in the same structural window, the story's voice has no urgency pressing on it anywhere else across the story.`,
        suggestedFix: `Shift the clock in at least one scene outside the ${r767a.zoneNames[r767a.maxZoneIdx]} third so urgency keeps pressing on the story's voice more evenly across the story.`,
      });
    }
  }

  // VOICE_CURIOSITY_PEAK_UNCAUSED — Backward-cause × curiosityDelta-as-magnitude × 2-scene
  // lookback. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 curiosity-
  // positive scenes, fires when the peak curiosity scene has no dramatic turn or revelation in the
  // 2 scenes preceding it. Waves 683/739 applied the run-based drought and zone-cluster modes to
  // curiosityDelta; the backward-cause peak mode has never been applied to it, completing the
  // trio.
  {
    const r767b = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => r.curiosityDelta ?? 0,
      hasCause: r => (r.dramaticTurn ?? 'nothing') !== 'nothing' || r.revelation != null,
    });
    if (r767b.fires) {
      issues.push({
        location: `scene ${r767b.peakIdx} (peak curiosityDelta ${r767b.peakMagnitude}) — no preparing cause nearby`,
        rule: 'VOICE_CURIOSITY_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single highest-curiosity scene (Scene ${r767b.peakIdx}, curiosityDelta ${r767b.peakMagnitude}) arrives with no dramatic turn or revelation in the 2 scenes leading into it, even though ${r767b.qualifyingCount} scenes elsewhere spark wonder. The moment the audience is most gripped by an open question lands out of nowhere — the story's voice hasn't built toward the mystery it's about to pose.`,
        suggestedFix: `Add a dramatic turn or revelation in one of the 2 scenes before scene ${r767b.peakIdx} so the story's voice earns its peak curiosity instead of springing it without preparation.`,
      });
    }
  }

  // VOICE_SUSPENSE_DROUGHT_RUN — Run-based × suspenseDelta>0 absence. Built on checkDroughtRun
  // from the shared checks library. n≥10, ≥3 suspense-positive scenes overall, fires when the
  // longest consecutive run of scenes with no suspense rise reaches 6. Wave 683 applied the
  // zone-cluster mode to suspenseDelta; the drought-run mode has never been applied to it,
  // completing the trio.
  {
    const r767c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r767c.fires) {
      issues.push({
        location: `longest stretch with no rising tension: ${r767c.longestRun} consecutive scenes`,
        rule: 'VOICE_SUSPENSE_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r767c.longestRun} consecutive scenes with no rise in suspense at all, even though ${r767c.presentCount} scenes elsewhere do raise tension. A long unbroken stretch with nothing tightening the screws leaves the story's voice flat for an extended run.`,
        suggestedFix: `Raise suspense somewhere within the ${r767c.longestRun}-scene stretch so the story's voice keeps a live thread of tension running through that stretch.`,
      });
    }
  }

  // ── Wave 781: VOICE_TURN_DROUGHT_RUN, VOICE_EMOTION_ZONE_CLUSTER,
  //              VOICE_SUSPENSE_PEAK_UNCAUSED ──────────────────────────────────────

  // VOICE_TURN_DROUGHT_RUN — Run-based × dramaticTurn !== 'nothing' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 turn scenes overall, fires when the
  // longest consecutive run of scenes with no dramatic turn reaches 6. dramaticTurn as a primary
  // signal has only ever anchored a co-occurrence-decoupling check in this pass; none of the three
  // shared-library trio modes has ever been applied to it.
  {
    const r781a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
    });
    if (r781a.fires) {
      issues.push({
        location: `longest stretch with no dramatic turn: ${r781a.longestRun} consecutive scenes`,
        rule: 'VOICE_TURN_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r781a.longestRun} consecutive scenes with no dramatic turn at all, even though ${r781a.presentCount} scenes elsewhere do pivot. A long unbroken stretch with nothing reversing or complicating the situation leaves the story's voice with no pivot to react to for an extended run.`,
        suggestedFix: `Introduce a dramatic turn somewhere within the ${r781a.longestRun}-scene stretch so the story's voice keeps a pivot to react to throughout that stretch.`,
      });
    }
  }

  // VOICE_EMOTION_ZONE_CLUSTER — Distribution/timing × emotionalShift !== 'neutral' presence ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // emotionally charged scenes, fires when more than 75% of those scenes cluster in a single
  // third. emotionalShift has only ever anchored an average-toneset check in this pass; none of
  // the three shared-library trio modes has ever been applied to it.
  {
    const r781b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r781b.fires) {
      issues.push({
        location: `${r781b.zoneNames[r781b.maxZoneIdx]} third — ${r781b.maxZoneCount} of ${r781b.count} emotionally charged scenes`,
        rule: 'VOICE_EMOTION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r781b.maxZoneCount / r781b.count) * 100)}% of the story's emotionally charged scenes cluster in the ${r781b.zoneNames[r781b.maxZoneIdx]} third. When every emotional shift lands in the same structural window, the story's voice has no felt stakes registering anywhere else in the story.`,
        suggestedFix: `Give at least one scene outside the ${r781b.zoneNames[r781b.maxZoneIdx]} third an emotional charge so the story's voice keeps registering felt experience more evenly across the story.`,
      });
    }
  }

  // VOICE_SUSPENSE_PEAK_UNCAUSED — Backward-cause × suspenseDelta-as-magnitude × 2-scene
  // lookback. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 suspense-
  // positive scenes, fires when the peak suspense scene has no dramatic turn or revelation in the
  // 2 scenes preceding it. Waves 683/753 applied the zone-cluster and run-based drought modes to
  // suspenseDelta; the backward-cause peak mode has never been applied to it, completing the
  // trio.
  {
    const r781c = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => Math.max(0, r.suspenseDelta ?? 0),
      hasCause: r => (r.dramaticTurn ?? 'nothing') !== 'nothing' || r.revelation != null,
    });
    if (r781c.fires) {
      issues.push({
        location: `scene ${r781c.peakIdx} (peak suspenseDelta ${r781c.peakMagnitude}) — no preparing cause nearby`,
        rule: 'VOICE_SUSPENSE_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single highest-suspense scene (Scene ${r781c.peakIdx}, suspenseDelta ${r781c.peakMagnitude}) arrives with no dramatic turn or revelation in the 2 scenes leading into it, even though ${r781c.qualifyingCount} scenes elsewhere carry tension. The moment characters are most gripped lands out of nowhere — the story's voice has nothing building toward the peak to react against.`,
        suggestedFix: `Add a dramatic turn or revelation in one of the 2 scenes before scene ${r781c.peakIdx} so the story's voice has something building toward the peak to react against instead of springing without preparation.`,
      });
    }
  }

  // ── Wave 795: VOICE_TURN_ZONE_CLUSTER, VOICE_EMOTION_DROUGHT_RUN, VOICE_REVELATION_ZONE_CLUSTER ──

  // VOICE_TURN_ZONE_CLUSTER — Distribution/timing × dramaticTurn !== 'nothing' presence ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 turn
  // scenes, fires when more than 75% of those scenes cluster in a single third. Wave 781 applied
  // the run-based drought mode to dramaticTurn; the zone-cluster mode has never been applied to
  // it, completing the trio for this categorical field (peak mode conventionally skipped).
  {
    const r795a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
    });
    if (r795a.fires) {
      issues.push({
        location: `${r795a.zoneNames[r795a.maxZoneIdx]} third — ${r795a.maxZoneCount} of ${r795a.count} turn scenes`,
        rule: 'VOICE_TURN_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r795a.maxZoneCount / r795a.count) * 100)}% of the story's dramatic turns cluster in the ${r795a.zoneNames[r795a.maxZoneIdx]} third. When every pivot lands in the same structural window, the story's voice has nothing to react against anywhere else across the story.`,
        suggestedFix: `Introduce a dramatic turn outside the ${r795a.zoneNames[r795a.maxZoneIdx]} third so the story's voice keeps reacting to pivots more evenly across the story.`,
      });
    }
  }

  // VOICE_EMOTION_DROUGHT_RUN — Run-based × emotionalShift !== 'neutral' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 emotionally charged scenes overall,
  // fires when the longest consecutive run of emotionally neutral scenes reaches 6. Wave 781
  // applied the zone-cluster mode to emotionalShift; the drought-run mode has never been applied
  // to it, completing the trio for this categorical field (peak mode conventionally skipped).
  {
    const r795b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r795b.fires) {
      issues.push({
        location: `longest stretch with no emotional charge: ${r795b.longestRun} consecutive scenes`,
        rule: 'VOICE_EMOTION_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r795b.longestRun} consecutive emotionally neutral scenes, even though ${r795b.presentCount} scenes elsewhere register a felt shift. A long unbroken stretch with no emotional charge leaves the story's voice flat, with nothing to register against for an extended run.`,
        suggestedFix: `Give at least one scene within the ${r795b.longestRun}-scene stretch a positive or negative emotional charge so the story's voice keeps registering felt experience throughout that stretch.`,
      });
    }
  }

  // VOICE_REVELATION_ZONE_CLUSTER — Distribution/timing × revelation × structural thirds. Built
  // on checkZoneCluster from the shared checks library. n≥9, ≥3 revelation scenes, fires when
  // more than 75% of them fall in a single structural third. Distinct from the existing
  // REVELATION_ZONE_IMBALANCE (Wave 599), which uses checkZoneImbalance — a different
  // shared-library helper testing deficit-vs-surplus of revelation across the four named acts —
  // not the general thirds-based >75%-concentration test that checkZoneCluster performs; none of
  // the three trio modes has ever been applied to revelation as the primary signal.
  {
    const r795c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.revelation != null,
    });
    if (r795c.fires) {
      issues.push({
        location: `${r795c.zoneNames[r795c.maxZoneIdx]} third — ${r795c.maxZoneCount} of ${r795c.count} revelation scenes`,
        rule: 'VOICE_REVELATION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r795c.maxZoneCount / r795c.count) * 100)}% of the story's revelation scenes cluster in the ${r795c.zoneNames[r795c.maxZoneIdx]} third. When every disclosure lands in the same structural window, the story's voice has no fresh truth to react to anywhere else across the story.`,
        suggestedFix: `Move at least one revelation outside the ${r795c.zoneNames[r795c.maxZoneIdx]} third so the story's voice keeps reacting to new disclosures more evenly across the story.`,
      });
    }
  }

  // ── Wave 809: VOICE_REVELATION_DROUGHT_RUN, VOICE_REVELATION_PEAK_UNCAUSED,
  //              VOICE_NEGATIVE_EMOTION_ZONE_CLUSTER ──────────────────────────────────────

  // VOICE_REVELATION_DROUGHT_RUN — Run-based × revelation absence. Built on checkDroughtRun from
  // the shared checks library. n≥10, ≥3 revelation scenes overall, fires when the longest
  // consecutive run of scenes with no revelation reaches 6. Completing 2 of 3 slots for
  // revelation alongside the zone-cluster mode added in Wave 795.
  {
    const r809a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.revelation != null,
    });
    if (r809a.fires) {
      issues.push({
        location: `longest stretch with no revelation: ${r809a.longestRun} consecutive scenes`,
        rule: 'VOICE_REVELATION_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r809a.longestRun} consecutive scenes with no revelation at all, even though ${r809a.presentCount} scenes elsewhere disclose a truth. A long unbroken stretch with nothing new coming to light leaves the story's voice with no fresh disclosure to react to for an extended run.`,
        suggestedFix: `Let a truth surface somewhere within the ${r809a.longestRun}-scene stretch so the story's voice keeps reacting to new disclosures throughout that stretch.`,
      });
    }
  }

  // VOICE_REVELATION_PEAK_UNCAUSED — Backward-cause × revelation-as-magnitude (0/1) × 2-scene
  // lookback. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 revelation
  // scenes, fires when the (first) revelation scene has no dramatic turn in itself or the 2
  // scenes preceding it. Completes the trio for revelation. hasCause deliberately omits
  // revelation to avoid circularity.
  {
    const r809b = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.revelation != null ? 1 : 0),
      hasCause: r => r.dramaticTurn !== 'nothing',
    });
    if (r809b.fires) {
      issues.push({
        location: `scene ${r809b.peakIdx + 1} — revelation with no dramatic turn nearby`,
        rule: 'VOICE_REVELATION_PEAK_UNCAUSED',
        severity: 'minor',
        description: `Scene ${r809b.peakIdx + 1} discloses a revelation with no dramatic turn in itself or the two scenes before it, even though ${r809b.qualifyingCount} scenes elsewhere disclose a truth. A revelation that lands without any preceding pivot reads as a coincidence rather than something the story's own turns forced into the open.`,
        suggestedFix: `Add a dramatic turn in scene ${r809b.peakIdx + 1} or one of the two scenes before it so the revelation reads as a consequence of the story's own turning points rather than arriving unprepared.`,
      });
    }
  }

  // VOICE_NEGATIVE_EMOTION_ZONE_CLUSTER — Distribution/timing × emotionalShift === 'negative' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // negative-emotion scenes, fires when more than 75% of them fall in a single structural third.
  // Negative-specific emotionalShift has only ever appeared inside a combined co-occurrence check
  // (elevated-tone-vs-negative-shift); none of the three shared-library trio modes has ever
  // isolated this valence on its own.
  {
    const r809c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.emotionalShift === 'negative',
    });
    if (r809c.fires) {
      issues.push({
        location: `${r809c.zoneNames[r809c.maxZoneIdx]} third — ${r809c.maxZoneCount} of ${r809c.count} negative-emotion scenes`,
        rule: 'VOICE_NEGATIVE_EMOTION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r809c.maxZoneCount / r809c.count) * 100)}% of the story's negative-emotion scenes cluster in the ${r809c.zoneNames[r809c.maxZoneIdx]} third. When all the darkness concentrates in one structural window, the story's voice carries its emotional cost in only one part of the story instead of throughout its full length.`,
        suggestedFix: `Introduce a negative-emotion scene outside the ${r809c.zoneNames[r809c.maxZoneIdx]} third so the story's voice registers its emotional cost more evenly across the story.`,
      });
    }
  }

  // ── Wave 823: VOICE_NEGATIVE_EMOTION_DROUGHT_RUN, VOICE_TURNING_POINT_ZONE_CLUSTER,
  //              VOICE_INTRODUCE_CONFLICT_ZONE_CLUSTER ──────────────────────────────────────

  // VOICE_NEGATIVE_EMOTION_DROUGHT_RUN — Run-based × emotionalShift === 'negative' absence. Built
  // on checkDroughtRun from the shared checks library. n≥10, ≥3 negative-emotion scenes overall,
  // fires when the longest consecutive run of scenes with no negative-emotion charge reaches 6.
  // Completing 2 of 3 slots for this valence alongside the zone-cluster mode added in Wave 809
  // (peak mode conventionally skipped for this categorical field).
  {
    const r823a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.emotionalShift === 'negative',
    });
    if (r823a.fires) {
      issues.push({
        location: `longest stretch with no negative-emotion charge: ${r823a.longestRun} consecutive scenes`,
        rule: 'VOICE_NEGATIVE_EMOTION_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r823a.longestRun} consecutive scenes with no negative-emotion charge at all, even though ${r823a.presentCount} scenes elsewhere carry one. A long unbroken stretch with no darkness leaves the story's voice with no emotional cost to speak through for an extended run.`,
        suggestedFix: `Give the story a setback within the ${r823a.longestRun}-scene stretch so the story's voice keeps an emotional cost to speak through throughout that stretch.`,
      });
    }
  }

  // VOICE_TURNING_POINT_ZONE_CLUSTER — Distribution/timing × purpose === 'turning_point' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // turning-point scenes, fires when more than 75% of them fall in a single structural third.
  // This purpose value has never appeared anywhere in this file — a virgin field for all three
  // shared-library trio modes, distinct from VOICE_TURN_ZONE_CLUSTER (Wave 795), which audits the
  // dramaticTurn free-text field, not this purpose enum value.
  {
    const r823b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'turning_point',
    });
    if (r823b.fires) {
      issues.push({
        location: `${r823b.zoneNames[r823b.maxZoneIdx]} third — ${r823b.maxZoneCount} of ${r823b.count} turning-point scenes`,
        rule: 'VOICE_TURNING_POINT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r823b.maxZoneCount / r823b.count) * 100)}% of the story's turning-point scenes cluster in the ${r823b.zoneNames[r823b.maxZoneIdx]} third. When every scene purposed as a turning point lands in the same structural window, the story's voice has no redirection to speak through anywhere else across the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r823b.zoneNames[r823b.maxZoneIdx]} third as a turning point so the story's voice keeps a redirection to speak through more evenly across the story.`,
      });
    }
  }

  // VOICE_INTRODUCE_CONFLICT_ZONE_CLUSTER — Distribution/timing × purpose ===
  // 'introduce_conflict' × structural thirds. Built on checkZoneCluster from the shared checks
  // library. n≥9, ≥3 conflict-introducing scenes, fires when more than 75% of them fall in a
  // single structural third. Also a virgin field — 'introduce_conflict' has never appeared
  // anywhere in this file before this wave.
  {
    const r823c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'introduce_conflict',
    });
    if (r823c.fires) {
      issues.push({
        location: `${r823c.zoneNames[r823c.maxZoneIdx]} third — ${r823c.maxZoneCount} of ${r823c.count} conflict-introducing scenes`,
        rule: 'VOICE_INTRODUCE_CONFLICT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r823c.maxZoneCount / r823c.count) * 100)}% of the scenes purposed to introduce conflict cluster in the ${r823c.zoneNames[r823c.maxZoneIdx]} third. When every new conflict lands in the same structural window, the story's voice has no fresh friction to speak through anywhere else across the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r823c.zoneNames[r823c.maxZoneIdx]} third to introduce conflict so the story's voice keeps fresh friction to speak through more evenly across the story.`,
      });
    }
  }

  // ── Wave 837: VOICE_TURNING_POINT_DROUGHT_RUN, VOICE_INTRODUCE_CONFLICT_DROUGHT_RUN,
  //              VOICE_STAKES_ZONE_CLUSTER ──────────────────────────────────────

  // VOICE_TURNING_POINT_DROUGHT_RUN — Run-based × purpose === 'turning_point' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 turning-point scenes overall, fires
  // when the longest consecutive run of scenes with no turning-point purpose reaches 6.
  // Completing 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave
  // 823 (peak mode conventionally skipped for this categorical field).
  {
    const r837a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'turning_point',
    });
    if (r837a.fires) {
      issues.push({
        location: `longest stretch with no turning point: ${r837a.longestRun} consecutive scenes`,
        rule: 'VOICE_TURNING_POINT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r837a.longestRun} consecutive scenes with no turning-point purpose at all, even though ${r837a.presentCount} scenes elsewhere redirect events. A long unbroken stretch with no redirection leaves the story's voice with no pivot to speak through for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r837a.longestRun}-scene stretch as a turning point so the story's voice keeps a pivot to speak through throughout that stretch.`,
      });
    }
  }

  // VOICE_INTRODUCE_CONFLICT_DROUGHT_RUN — Run-based × purpose === 'introduce_conflict' absence.
  // Built on checkDroughtRun from the shared checks library. n≥10, ≥3 conflict-introducing scenes
  // overall, fires when the longest consecutive run of scenes with no conflict-introducing
  // purpose reaches 6. Completing 2 of 3 slots for this purpose value alongside the zone-cluster
  // mode added in Wave 823 (peak mode conventionally skipped for this categorical field).
  {
    const r837b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'introduce_conflict',
    });
    if (r837b.fires) {
      issues.push({
        location: `longest stretch with no new conflict: ${r837b.longestRun} consecutive scenes`,
        rule: 'VOICE_INTRODUCE_CONFLICT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r837b.longestRun} consecutive scenes with no conflict-introducing purpose at all, even though ${r837b.presentCount} scenes elsewhere open a new front. A long unbroken stretch with no fresh friction leaves the story's voice with nothing new to speak through for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r837b.longestRun}-scene stretch to introduce conflict so the story's voice keeps fresh friction to speak through throughout that stretch.`,
      });
    }
  }

  // VOICE_STAKES_ZONE_CLUSTER — Distribution/timing × purpose === 'raise_stakes' × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 stakes-raising
  // scenes, fires when more than 75% of them fall in a single structural third. This purpose
  // value has never been referenced anywhere in this file — a virgin field for all three
  // shared-library trio modes.
  {
    const r837c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'raise_stakes',
    });
    if (r837c.fires) {
      issues.push({
        location: `${r837c.zoneNames[r837c.maxZoneIdx]} third — ${r837c.maxZoneCount} of ${r837c.count} stakes-raising scenes`,
        rule: 'VOICE_STAKES_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r837c.maxZoneCount / r837c.count) * 100)}% of the scenes purposed to raise stakes cluster in the ${r837c.zoneNames[r837c.maxZoneIdx]} third. When every escalation lands in the same structural window, the story's voice has no mounting pressure to speak through anywhere else across the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r837c.zoneNames[r837c.maxZoneIdx]} third to raise stakes so the story's voice keeps mounting pressure to speak through more evenly across the story.`,
      });
    }
  }

  // ── Wave 851: VOICE_STAKES_DROUGHT_RUN, VOICE_POSITIVE_EMOTION_ZONE_CLUSTER,
  //              VOICE_ESTABLISH_WORLD_ZONE_CLUSTER ──────────────────────────────────────

  // VOICE_STAKES_DROUGHT_RUN — Run-based × purpose === 'raise_stakes' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 stakes-raising scenes overall, fires
  // when the longest consecutive run of scenes with no stakes-raising purpose reaches 6.
  // Completing 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave
  // 837 (peak mode conventionally skipped for this categorical field).
  {
    const r851a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'raise_stakes',
    });
    if (r851a.fires) {
      issues.push({
        location: `longest stretch with no stakes-raising: ${r851a.longestRun} consecutive scenes`,
        rule: 'VOICE_STAKES_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r851a.longestRun} consecutive scenes with no stakes-raising purpose at all, even though ${r851a.presentCount} scenes elsewhere escalate. A long unbroken stretch with no mounting pressure leaves the story's voice with nothing new to speak through for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r851a.longestRun}-scene stretch to raise stakes so the story's voice keeps mounting pressure to speak through throughout that stretch.`,
      });
    }
  }

  // VOICE_POSITIVE_EMOTION_ZONE_CLUSTER — Distribution/timing × emotionalShift === 'positive' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // positive-emotion scenes, fires when more than 75% of them fall in a single structural third.
  // Mirrors the completed negative-valence trio; the positive valence has never been isolated by
  // any of the three shared-library trio modes in this file.
  {
    const r851b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.emotionalShift === 'positive',
    });
    if (r851b.fires) {
      issues.push({
        location: `${r851b.zoneNames[r851b.maxZoneIdx]} third — ${r851b.maxZoneCount} of ${r851b.count} positive-emotion scenes`,
        rule: 'VOICE_POSITIVE_EMOTION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r851b.maxZoneCount / r851b.count) * 100)}% of the story's positive-emotion scenes cluster in the ${r851b.zoneNames[r851b.maxZoneIdx]} third. When all the relief concentrates in one structural window, the story's voice carries its emotional reward in only one part of the story instead of throughout its full length.`,
        suggestedFix: `Introduce a positive-emotion scene outside the ${r851b.zoneNames[r851b.maxZoneIdx]} third so the story's voice registers its emotional reward more evenly across the story.`,
      });
    }
  }

  // VOICE_ESTABLISH_WORLD_ZONE_CLUSTER — Distribution/timing × purpose === 'establish_world' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // world-establishing scenes, fires when more than 75% of them fall in a single structural
  // third. This purpose value has never been referenced anywhere in this file — a virgin field
  // for all three shared-library trio modes.
  {
    const r851c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'establish_world',
    });
    if (r851c.fires) {
      issues.push({
        location: `${r851c.zoneNames[r851c.maxZoneIdx]} third — ${r851c.maxZoneCount} of ${r851c.count} world-establishing scenes`,
        rule: 'VOICE_ESTABLISH_WORLD_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r851c.maxZoneCount / r851c.count) * 100)}% of the scenes purposed to establish the world cluster in the ${r851c.zoneNames[r851c.maxZoneIdx]} third. When every act of world-building concentrates in one structural window, the story's voice has no fresh ground to speak through anywhere else across the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r851c.zoneNames[r851c.maxZoneIdx]} third to establish the world so the story's voice keeps fresh ground to speak through more evenly across the story.`,
      });
    }
  }

  // ── Wave 865: VOICE_ESTABLISH_WORLD_DROUGHT_RUN, VOICE_CLIMAX_ZONE_CLUSTER,
  //              VOICE_RESOLUTION_ZONE_CLUSTER ──────────────────────────────────────

  // VOICE_ESTABLISH_WORLD_DROUGHT_RUN — Run-based × purpose === 'establish_world' absence.
  // Built on checkDroughtRun from the shared checks library. n≥10, ≥3 world-establishing
  // scenes overall, fires when the longest consecutive run of scenes with no world-establishing
  // purpose reaches 6. Completes 2 of 3 slots for this purpose value alongside the zone-cluster
  // mode added in Wave 851 (peak mode conventionally skipped for this categorical field).
  {
    const r865a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'establish_world',
    });
    if (r865a.fires) {
      issues.push({
        location: `longest stretch with no world-establishing scene: ${r865a.longestRun} consecutive scenes`,
        rule: 'VOICE_ESTABLISH_WORLD_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r865a.longestRun} consecutive scenes with no scene purposed to establish the world, even though ${r865a.presentCount} scenes elsewhere are. A long unbroken stretch without new world-building leaves the story's voice with no fresh ground to speak through for an extended run.`,
        suggestedFix: `Purpose a scene within the ${r865a.longestRun}-scene stretch to establish the world, so the voice has fresh ground to speak through throughout the story rather than in one isolated pocket.`,
      });
    }
  }

  // VOICE_CLIMAX_ZONE_CLUSTER — Distribution/timing × purpose === 'climax' × structural thirds.
  // Built on checkZoneCluster from the shared checks library. n≥9, ≥3 climax-purposed scenes,
  // fires when more than 75% of them fall in a single structural third. This purpose value has
  // never been referenced anywhere in this file — a virgin field for all three shared-library
  // trio modes.
  {
    const r865b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'climax',
    });
    if (r865b.fires) {
      issues.push({
        location: `${r865b.zoneNames[r865b.maxZoneIdx]} third — ${r865b.maxZoneCount} of ${r865b.count} climax-purposed scenes`,
        rule: 'VOICE_CLIMAX_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r865b.maxZoneCount / r865b.count) * 100)}% of the scenes purposed as the climax cluster in the ${r865b.zoneNames[r865b.maxZoneIdx]} third. When every peak moment concentrates in one structural window, the story's voice raises its register in only one part of the story instead of throughout its full length.`,
        suggestedFix: `Reconsider whether every climax-purposed scene belongs in the ${r865b.zoneNames[r865b.maxZoneIdx]} third so the story's voice raises its register more evenly across the story.`,
      });
    }
  }

  // VOICE_RESOLUTION_ZONE_CLUSTER — Distribution/timing × purpose === 'resolution' × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 resolution-
  // purposed scenes, fires when more than 75% of them fall in a single structural third. This
  // purpose value has never been referenced anywhere in this file — a virgin field for all
  // three shared-library trio modes.
  {
    const r865c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'resolution',
    });
    if (r865c.fires) {
      issues.push({
        location: `${r865c.zoneNames[r865c.maxZoneIdx]} third — ${r865c.maxZoneCount} of ${r865c.count} resolution-purposed scenes`,
        rule: 'VOICE_RESOLUTION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r865c.maxZoneCount / r865c.count) * 100)}% of the scenes purposed as resolution cluster in the ${r865c.zoneNames[r865c.maxZoneIdx]} third. When every settling beat concentrates in one structural window, the story's voice has no room to soften gradually before the ending absorbs it all at once.`,
        suggestedFix: `Purpose at least one resolution scene outside the ${r865c.zoneNames[r865c.maxZoneIdx]} third so the voice's wind-down is distributed across the story rather than concentrated in a single structural window.`,
      });
    }
  }

  // ── Wave 879: VOICE_CLIMAX_DROUGHT_RUN, VOICE_RESOLUTION_DROUGHT_RUN,
  //              VOICE_COMPLICATE_ZONE_CLUSTER ──────────────────────────────────────

  // VOICE_CLIMAX_DROUGHT_RUN — Run-based × purpose === 'climax' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 climax-purposed scenes overall,
  // fires when the longest consecutive run of scenes with no climax purpose reaches 6.
  // Completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in
  // Wave 865 (peak mode conventionally skipped for this categorical field).
  {
    const r879a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'climax',
    });
    if (r879a.fires) {
      issues.push({
        location: `longest stretch with no climax-purposed scene: ${r879a.longestRun} consecutive scenes`,
        rule: 'VOICE_CLIMAX_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r879a.longestRun} consecutive scenes with no scene purposed as the climax, even though ${r879a.presentCount} scenes elsewhere are. A long unbroken stretch between peak moments leaves the story's voice without a structural high point to raise its register toward for an extended run.`,
        suggestedFix: `Purpose a scene within the ${r879a.longestRun}-scene stretch as the climax, or restructure so the voice's peak moments recur rather than clustering into a single distant point.`,
      });
    }
  }

  // VOICE_RESOLUTION_DROUGHT_RUN — Run-based × purpose === 'resolution' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 resolution-purposed scenes overall,
  // fires when the longest consecutive run of scenes with no resolution purpose reaches 6.
  // Completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in
  // Wave 865 (peak mode conventionally skipped for this categorical field).
  {
    const r879b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'resolution',
    });
    if (r879b.fires) {
      issues.push({
        location: `longest stretch with no resolution-purposed scene: ${r879b.longestRun} consecutive scenes`,
        rule: 'VOICE_RESOLUTION_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r879b.longestRun} consecutive scenes with no scene purposed to resolve the story, even though ${r879b.presentCount} scenes elsewhere are. A long unbroken stretch with nothing settled leaves the story's voice with no wind-down beat for an extended run.`,
        suggestedFix: `Purpose a scene within the ${r879b.longestRun}-scene stretch to resolve part of the story, so the voice keeps softening throughout the story rather than only at its very end.`,
      });
    }
  }

  // VOICE_COMPLICATE_ZONE_CLUSTER — Distribution/timing × purpose === 'complicate' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // complicating scenes, fires when more than 75% of them fall in a single structural third.
  // This purpose value has never been referenced anywhere in this file — a virgin field for
  // all three shared-library trio modes.
  {
    const r879c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'complicate',
    });
    if (r879c.fires) {
      issues.push({
        location: `${r879c.zoneNames[r879c.maxZoneIdx]} third — ${r879c.maxZoneCount} of ${r879c.count} complicating scenes`,
        rule: 'VOICE_COMPLICATE_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r879c.maxZoneCount / r879c.count) * 100)}% of the scenes purposed to complicate the story cluster in the ${r879c.zoneNames[r879c.maxZoneIdx]} third. When every complication lands in the same structural window, the story's voice stops reacting to fresh trouble anywhere else across the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r879c.zoneNames[r879c.maxZoneIdx]} third to complicate the story so the voice keeps reacting to fresh trouble more evenly across the story.`,
      });
    }
  }

  // ── Wave 893: VOICE_COMPLICATE_DROUGHT_RUN, VOICE_CLIMAX_ZONE_IMBALANCE,
  //              VOICE_ESTABLISH_WORLD_ZONE_IMBALANCE ──────────────────────────────────────

  // VOICE_COMPLICATE_DROUGHT_RUN — Run-based × purpose === 'complicate' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 complicating scenes overall, fires
  // when the longest consecutive run of scenes with no complicating purpose reaches 6.
  // Completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in
  // Wave 879 (peak mode conventionally skipped for this categorical field).
  {
    const r893a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'complicate',
    });
    if (r893a.fires) {
      issues.push({
        location: `longest stretch with no complication: ${r893a.longestRun} consecutive scenes`,
        rule: 'VOICE_COMPLICATE_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r893a.longestRun} consecutive scenes with no complicating purpose at all, even though ${r893a.presentCount} scenes elsewhere deepen the trouble. A long unbroken stretch with nothing new complicating the situation leaves the story's voice with no fresh trouble to react to for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r893a.longestRun}-scene stretch to complicate the story so the voice keeps reacting to fresh trouble throughout that stretch.`,
      });
    }
  }

  // VOICE_CLIMAX_ZONE_IMBALANCE — Underweight/bloat × purpose === 'climax' × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 climax-purposed
  // scenes total, divided across four equal structural zones. Fires only when one zone has zero
  // such scenes while another holds ≥50% of the total. Distinct from the existing 3-zone
  // VOICE_CLIMAX_ZONE_CLUSTER and run-based VOICE_CLIMAX_DROUGHT_RUN — the first application of
  // the 4-zone bloat+empty-zone mode to this purpose value.
  {
    const r893b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'climax',
    });
    if (r893b.fires) {
      const emptyNames893b = r893b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName893b = FOUR_ZONE_NAMES[r893b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames893b} empty; ${bloatName893b} has ${r893b.counts[r893b.bloatZoneIdx]}/${r893b.totalCount} climax-purposed scenes`,
        rule: 'VOICE_CLIMAX_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r893b.totalCount} climax-purposed scenes are unevenly distributed across its four structural zones: ${bloatName893b} contains ${r893b.counts[r893b.bloatZoneIdx]} of them (${Math.round((r893b.counts[r893b.bloatZoneIdx] / r893b.totalCount) * 100)}%) while ${emptyNames893b} contains none. Peak moments bloat in one structural quarter and vanish from another, giving the story's voice an uneven register-raising rhythm.`,
        suggestedFix: `Redistribute peak moments: move at least one climax-purposed scene into the empty zone(s) — ${emptyNames893b} — so the voice raises its register more evenly across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // VOICE_ESTABLISH_WORLD_ZONE_IMBALANCE — Underweight/bloat × purpose === 'establish_world' ×
  // four structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4
  // world-establishing scenes total, divided across four equal structural zones. Fires only
  // when one zone has zero such scenes while another holds ≥50% of the total. Distinct from the
  // existing 3-zone VOICE_ESTABLISH_WORLD_ZONE_CLUSTER and run-based VOICE_ESTABLISH_WORLD_
  // DROUGHT_RUN — the first application of the 4-zone bloat+empty-zone mode to this purpose
  // value.
  {
    const r893c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'establish_world',
    });
    if (r893c.fires) {
      const emptyNames893c = r893c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName893c = FOUR_ZONE_NAMES[r893c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames893c} empty; ${bloatName893c} has ${r893c.counts[r893c.bloatZoneIdx]}/${r893c.totalCount} world-establishing scenes`,
        rule: 'VOICE_ESTABLISH_WORLD_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r893c.totalCount} world-establishing scenes are unevenly distributed across its four structural zones: ${bloatName893c} contains ${r893c.counts[r893c.bloatZoneIdx]} of them (${Math.round((r893c.counts[r893c.bloatZoneIdx] / r893c.totalCount) * 100)}%) while ${emptyNames893c} contains none. World-building bloats in one structural quarter and vanishes from another, giving the voice's ground to speak through an uneven structural rhythm.`,
        suggestedFix: `Redistribute world-building beats: move at least one establish_world-purposed scene into the empty zone(s) — ${emptyNames893c} — so the voice keeps fresh ground to speak through more evenly across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // VOICE_RESOLUTION_ZONE_IMBALANCE — Underweight/bloat × purpose === 'resolution' × four
  // structural zones. Built on checkZoneImbalance from the shared checks library, continuing the
  // rollout begun in Wave 893. n≥10, ≥4 resolution-purposed scenes total, divided across four
  // equal structural zones. Fires only when one zone has zero such scenes while another holds ≥50%
  // of the total. Distinct from the existing 3-zone VOICE_RESOLUTION_ZONE_CLUSTER and run-based
  // VOICE_RESOLUTION_DROUGHT_RUN — the first application of the 4-zone bloat+empty-zone mode to
  // this purpose value.
  {
    const r907a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'resolution',
    });
    if (r907a.fires) {
      const emptyNames907a = r907a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName907a = FOUR_ZONE_NAMES[r907a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames907a} empty; ${bloatName907a} has ${r907a.counts[r907a.bloatZoneIdx]}/${r907a.totalCount} resolution-purposed scenes`,
        rule: 'VOICE_RESOLUTION_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r907a.totalCount} resolution-purposed scenes are unevenly distributed across its four structural zones: ${bloatName907a} contains ${r907a.counts[r907a.bloatZoneIdx]} of them (${Math.round((r907a.counts[r907a.bloatZoneIdx] / r907a.totalCount) * 100)}%) while ${emptyNames907a} contains none. Settling beats bloat in one structural quarter and vanish from another, giving the voice's tone of closure an uneven structural rhythm.`,
        suggestedFix: `Redistribute settling beats: move at least one resolution-purposed scene into the empty zone(s) — ${emptyNames907a} — so the voice modulates toward closure more evenly across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // VOICE_TURNING_POINT_ZONE_IMBALANCE — Underweight/bloat × purpose === 'turning_point' × four
  // structural zones. Built on checkZoneImbalance from the shared checks library, continuing the
  // rollout begun in Wave 893. n≥10, ≥4 turning-point scenes total, divided across four equal
  // structural zones. Fires only when one zone has zero such scenes while another holds ≥50% of
  // the total. Distinct from the existing 3-zone VOICE_TURNING_POINT_ZONE_CLUSTER and run-based
  // VOICE_TURNING_POINT_DROUGHT_RUN — the first application of the 4-zone bloat+empty-zone mode
  // to this purpose value.
  {
    const r907b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'turning_point',
    });
    if (r907b.fires) {
      const emptyNames907b = r907b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName907b = FOUR_ZONE_NAMES[r907b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames907b} empty; ${bloatName907b} has ${r907b.counts[r907b.bloatZoneIdx]}/${r907b.totalCount} turning-point scenes`,
        rule: 'VOICE_TURNING_POINT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r907b.totalCount} turning-point scenes are unevenly distributed across its four structural zones: ${bloatName907b} contains ${r907b.counts[r907b.bloatZoneIdx]} of them (${Math.round((r907b.counts[r907b.bloatZoneIdx] / r907b.totalCount) * 100)}%) while ${emptyNames907b} contains none. Pivots bloat in one structural quarter and vanish from another, giving the voice's shifts of register an uneven structural rhythm.`,
        suggestedFix: `Redistribute turning points: move at least one turning_point-purposed scene into the empty zone(s) — ${emptyNames907b} — so the voice shifts register more evenly across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // VOICE_COMPLICATE_ZONE_IMBALANCE — Underweight/bloat × purpose === 'complicate' × four
  // structural zones. Built on checkZoneImbalance from the shared checks library, continuing the
  // rollout begun in Wave 893. n≥10, ≥4 complicating scenes total, divided across four equal
  // structural zones. Fires only when one zone has zero such scenes while another holds ≥50% of
  // the total. Distinct from the existing 3-zone VOICE_COMPLICATE_ZONE_CLUSTER and run-based
  // VOICE_COMPLICATE_DROUGHT_RUN — the first application of the 4-zone bloat+empty-zone mode to
  // this purpose value.
  {
    const r907c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'complicate',
    });
    if (r907c.fires) {
      const emptyNames907c = r907c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName907c = FOUR_ZONE_NAMES[r907c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames907c} empty; ${bloatName907c} has ${r907c.counts[r907c.bloatZoneIdx]}/${r907c.totalCount} complicating scenes`,
        rule: 'VOICE_COMPLICATE_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r907c.totalCount} complicating scenes are unevenly distributed across its four structural zones: ${bloatName907c} contains ${r907c.counts[r907c.bloatZoneIdx]} of them (${Math.round((r907c.counts[r907c.bloatZoneIdx] / r907c.totalCount) * 100)}%) while ${emptyNames907c} contains none. Complications bloat in one structural quarter and vanish from another, giving the voice's tension an uneven structural rhythm.`,
        suggestedFix: `Redistribute complications: move at least one complicate-purposed scene into the empty zone(s) — ${emptyNames907c} — so the voice sustains tension more evenly across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // VOICE_INTRODUCE_CONFLICT_ZONE_IMBALANCE — Underweight/bloat × purpose === 'introduce_conflict'
  // × four structural zones. Built on checkZoneImbalance from the shared checks library, continuing
  // the rollout begun in Wave 893. n≥10, ≥4 conflict-introducing scenes total, divided across four
  // equal structural zones. Fires only when one zone has zero such scenes while another holds ≥50%
  // of the total. Distinct from the existing 3-zone VOICE_INTRODUCE_CONFLICT_ZONE_CLUSTER and
  // run-based VOICE_INTRODUCE_CONFLICT_DROUGHT_RUN — the first application of the 4-zone
  // bloat+empty-zone mode to this purpose value.
  {
    const r921a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'introduce_conflict',
    });
    if (r921a.fires) {
      const emptyNames921a = r921a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName921a = FOUR_ZONE_NAMES[r921a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames921a} empty; ${bloatName921a} has ${r921a.counts[r921a.bloatZoneIdx]}/${r921a.totalCount} conflict-introducing scenes`,
        rule: 'VOICE_INTRODUCE_CONFLICT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r921a.totalCount} conflict-introducing scenes are unevenly distributed across its four structural zones: ${bloatName921a} contains ${r921a.counts[r921a.bloatZoneIdx]} of them (${Math.round((r921a.counts[r921a.bloatZoneIdx] / r921a.totalCount) * 100)}%) while ${emptyNames921a} contains none. New conflicts bloat in one structural quarter and vanish from another, giving the voice's charge of fresh opposition an uneven structural rhythm.`,
        suggestedFix: `Redistribute new conflicts: move at least one introduce_conflict-purposed scene into the empty zone(s) — ${emptyNames921a} — so the voice meets fresh opposition more evenly across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // VOICE_CHARACTER_MOMENT_ZONE_IMBALANCE — Underweight/bloat × purpose === 'character_moment' ×
  // four structural zones. Built on checkZoneImbalance from the shared checks library, continuing
  // the rollout begun in Wave 893. n≥10, ≥4 character-moment scenes total, divided across four
  // equal structural zones. Fires only when one zone has zero such scenes while another holds ≥50%
  // of the total. Distinct from the existing 3-zone VOICE_CHARACTER_MOMENT_ZONE_CLUSTER and
  // run-based VOICE_CHARACTER_MOMENT_DROUGHT_RUN — the first application of the 4-zone
  // bloat+empty-zone mode to this purpose value.
  {
    const r921b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'character_moment',
    });
    if (r921b.fires) {
      const emptyNames921b = r921b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName921b = FOUR_ZONE_NAMES[r921b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames921b} empty; ${bloatName921b} has ${r921b.counts[r921b.bloatZoneIdx]}/${r921b.totalCount} character-moment scenes`,
        rule: 'VOICE_CHARACTER_MOMENT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r921b.totalCount} character-moment scenes are unevenly distributed across its four structural zones: ${bloatName921b} contains ${r921b.counts[r921b.bloatZoneIdx]} of them (${Math.round((r921b.counts[r921b.bloatZoneIdx] / r921b.totalCount) * 100)}%) while ${emptyNames921b} contains none. Quiet character beats bloat in one structural quarter and vanish from another, giving the voice's intimate register an uneven structural rhythm.`,
        suggestedFix: `Redistribute character beats: move at least one character_moment-purposed scene into the empty zone(s) — ${emptyNames921b} — so the voice's intimate register recurs more evenly across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // VOICE_STAKES_ZONE_IMBALANCE — Underweight/bloat × purpose === 'raise_stakes' × four structural
  // zones. Built on checkZoneImbalance from the shared checks library, continuing the rollout begun
  // in Wave 893. n≥10, ≥4 stakes-raising scenes total, divided across four equal structural zones.
  // Fires only when one zone has zero such scenes while another holds ≥50% of the total. Distinct
  // from the existing 3-zone VOICE_STAKES_ZONE_CLUSTER and run-based VOICE_STAKES_DROUGHT_RUN — the
  // first application of the 4-zone bloat+empty-zone mode to this purpose value.
  {
    const r921c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'raise_stakes',
    });
    if (r921c.fires) {
      const emptyNames921c = r921c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName921c = FOUR_ZONE_NAMES[r921c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames921c} empty; ${bloatName921c} has ${r921c.counts[r921c.bloatZoneIdx]}/${r921c.totalCount} stakes-raising scenes`,
        rule: 'VOICE_STAKES_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r921c.totalCount} stakes-raising scenes are unevenly distributed across its four structural zones: ${bloatName921c} contains ${r921c.counts[r921c.bloatZoneIdx]} of them (${Math.round((r921c.counts[r921c.bloatZoneIdx] / r921c.totalCount) * 100)}%) while ${emptyNames921c} contains none. Stakes bloat upward in one structural quarter and never rise at all in another, giving the voice's urgency an uneven structural rhythm.`,
        suggestedFix: `Redistribute stakes-raising beats: move at least one raise_stakes-purposed scene into the empty zone(s) — ${emptyNames921c} — so the voice's urgency rises more evenly across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // VOICE_REVELATION_PURPOSE_ZONE_CLUSTER — Distribution/timing × purpose === 'revelation' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 scenes
  // purposed as a revelation, fires when more than 75% of them fall in a single structural third.
  // Named distinctly from VOICE_REVELATION_ZONE_CLUSTER, which audits the separate revelation
  // string|null field, not this purpose enum value — purpose === 'revelation' has never been
  // referenced anywhere in this pass; a virgin field for all three trio modes.
  {
    const r935a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'revelation',
    });
    if (r935a.fires) {
      issues.push({
        location: `${r935a.zoneNames[r935a.maxZoneIdx]} third — ${r935a.maxZoneCount} of ${r935a.count} revelation-purposed scenes`,
        rule: 'VOICE_REVELATION_PURPOSE_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r935a.maxZoneCount / r935a.count) * 100)}% of the scenes purposed as a revelation cluster in the ${r935a.zoneNames[r935a.maxZoneIdx]} third. When every purpose-built disclosure lands in the same structural window, the voice shifts to its knowing register in one part of the story and stays flat elsewhere.`,
        suggestedFix: `Purpose at least one scene outside the ${r935a.zoneNames[r935a.maxZoneIdx]} third as a revelation so the voice keeps modulating with new knowledge more evenly across the story.`,
      });
    }
  }

  // VOICE_REVELATION_PURPOSE_DROUGHT_RUN — Run-based × purpose === 'revelation' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 revelation-purposed scenes overall,
  // fires when the longest consecutive run of scenes purposed otherwise reaches 6. Completes 2 of
  // 3 slots for this purpose value alongside the zone-cluster mode added in this same wave (peak
  // mode conventionally skipped for this categorical field).
  {
    const r935b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'revelation',
    });
    if (r935b.fires) {
      issues.push({
        location: `longest stretch with no revelation-purposed scene: ${r935b.longestRun} consecutive scenes`,
        rule: 'VOICE_REVELATION_PURPOSE_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r935b.longestRun} consecutive scenes with no scene purposed as a revelation, even though ${r935b.presentCount} scenes elsewhere disclose information by purpose. A long unbroken stretch with no turns of new knowledge leaves the voice's register unchanged for an extended run.`,
        suggestedFix: `Purpose a scene within the ${r935b.longestRun}-scene stretch as a revelation so the voice keeps modulating with new knowledge throughout that stretch.`,
      });
    }
  }

  // VOICE_NEGATIVE_EMOTION_ZONE_IMBALANCE — Underweight/bloat × emotionalShift === 'negative' ×
  // four structural zones. Built on checkZoneImbalance from the shared checks library, extending
  // the 4-zone mode to the emotionalShift valence signal. n≥10, ≥4 negative-shift scenes total,
  // divided across four equal structural zones. Fires only when one zone has zero such scenes while
  // another holds ≥50% of the total. Distinct from the existing 3-zone VOICE_NEGATIVE_EMOTION_
  // ZONE_CLUSTER and run-based VOICE_NEGATIVE_EMOTION_DROUGHT_RUN — the first application of the
  // 4-zone bloat+empty-zone mode to this valence signal.
  {
    const r935c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.emotionalShift === 'negative',
    });
    if (r935c.fires) {
      const emptyNames935c = r935c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName935c = FOUR_ZONE_NAMES[r935c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames935c} empty; ${bloatName935c} has ${r935c.counts[r935c.bloatZoneIdx]}/${r935c.totalCount} negative-shift scenes`,
        rule: 'VOICE_NEGATIVE_EMOTION_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r935c.totalCount} scenes with a negative emotional shift are unevenly distributed across its four structural zones: ${bloatName935c} contains ${r935c.counts[r935c.bloatZoneIdx]} of them (${Math.round((r935c.counts[r935c.bloatZoneIdx] / r935c.totalCount) * 100)}%) while ${emptyNames935c} contains none. Downturns bloat in one structural quarter and vanish from another, giving the voice's darker register an uneven structural rhythm.`,
        suggestedFix: `Redistribute downturns: place a negative emotional beat in at least one scene inside the empty zone(s) — ${emptyNames935c} — so the voice's darker register recurs across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // VOICE_REVELATION_PURPOSE_ZONE_IMBALANCE — Underweight/bloat × purpose === 'revelation' × four
  // structural zones. Built on checkZoneImbalance from the shared checks library, closing the 4-zone
  // gap for this purpose value (its 3-zone/run trio was completed in Wave 935). n≥10, ≥4 revelation-
  // purposed scenes total, divided across four equal structural zones. Fires only when one zone has
  // zero such scenes while another holds ≥50% of the total. Distinct from VOICE_REVELATION_PURPOSE_
  // ZONE_CLUSTER/DROUGHT_RUN (Wave 935) — the first application of the 4-zone bloat+empty-zone mode
  // to this purpose value, and distinct from the separate revelation-FIELD rules (VOICE_REVELATION_
  // ZONE_CLUSTER/DROUGHT_RUN audit the revelation string, not the purpose enum).
  {
    const r949a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'revelation',
    });
    if (r949a.fires) {
      const emptyNames949a = r949a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName949a = FOUR_ZONE_NAMES[r949a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames949a} empty; ${bloatName949a} has ${r949a.counts[r949a.bloatZoneIdx]}/${r949a.totalCount} revelation-purposed scenes`,
        rule: 'VOICE_REVELATION_PURPOSE_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r949a.totalCount} revelation-purposed scenes are unevenly distributed across its four structural zones: ${bloatName949a} contains ${r949a.counts[r949a.bloatZoneIdx]} of them (${Math.round((r949a.counts[r949a.bloatZoneIdx] / r949a.totalCount) * 100)}%) while ${emptyNames949a} contains none. Disclosure scenes bloat in one structural quarter and vanish from another, giving the voice's register of revelation an uneven structural rhythm.`,
        suggestedFix: `Redistribute disclosures: purpose at least one scene inside the empty zone(s) — ${emptyNames949a} — as a revelation so the voice's register of disclosure recurs across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // VOICE_SUSPENSE_ZONE_IMBALANCE — Underweight/bloat × (suspenseDelta > 0) × four structural zones.
  // Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 suspense-raising scenes
  // total, divided across four equal structural zones. Fires only when one zone has zero such scenes
  // while another holds ≥50% of the total. Distinct from the existing 3-zone VOICE_SUSPENSE_ZONE_
  // CLUSTER and run-based VOICE_SUSPENSE_DROUGHT_RUN — the first application of the 4-zone bloat+
  // empty-zone mode to the suspense-delta magnitude signal in this pass, keying on tension change
  // rather than categorical purpose or emotional valence.
  {
    const r949b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r949b.fires) {
      const emptyNames949b = r949b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName949b = FOUR_ZONE_NAMES[r949b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames949b} empty; ${bloatName949b} has ${r949b.counts[r949b.bloatZoneIdx]}/${r949b.totalCount} suspense-raising scenes`,
        rule: 'VOICE_SUSPENSE_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r949b.totalCount} suspense-raising scenes are unevenly distributed across its four structural zones: ${bloatName949b} contains ${r949b.counts[r949b.bloatZoneIdx]} of them (${Math.round((r949b.counts[r949b.bloatZoneIdx] / r949b.totalCount) * 100)}%) while ${emptyNames949b} contains none. Tension bloats in one structural quarter and flatlines in another, giving the voice's taut register an uneven structural rhythm.`,
        suggestedFix: `Redistribute suspense: move or add a scene that raises suspense (suspenseDelta > 0) into the empty zone(s) — ${emptyNames949b} — so the voice's taut register recurs across every structural quarter, not only the quarter currently carrying most of it.`,
      });
    }
  }

  // VOICE_PAYOFF_ZONE_IMBALANCE — Underweight/bloat × (payoffSetupIds.length > 0) × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 payoff scenes total,
  // divided across four equal structural zones. Fires only when one zone has zero such scenes while
  // another holds ≥50% of the total. Distinct from the existing 3-zone VOICE_PAYOFF_ZONE_CLUSTER and
  // run-based VOICE_PAYOFF_DROUGHT_RUN, and distinct from the already-audited array-field imbalances
  // VOICE_STAGING_ZONE_IMBALANCE (visualBeats) and VOICE_RELATIONSHIP_SHIFT_ZONE_IMBALANCE
  // (relationshipShifts) — this keys on the payoffSetupIds array, a genuinely different field.
  {
    const r949c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.payoffSetupIds ?? []).length > 0,
    });
    if (r949c.fires) {
      const emptyNames949c = r949c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName949c = FOUR_ZONE_NAMES[r949c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames949c} empty; ${bloatName949c} has ${r949c.counts[r949c.bloatZoneIdx]}/${r949c.totalCount} payoff scenes`,
        rule: 'VOICE_PAYOFF_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r949c.totalCount} payoff scenes are unevenly distributed across its four structural zones: ${bloatName949c} contains ${r949c.counts[r949c.bloatZoneIdx]} of them (${Math.round((r949c.counts[r949c.bloatZoneIdx] / r949c.totalCount) * 100)}%) while ${emptyNames949c} contains none. Payoff scenes bloat in one structural quarter and never occur in another, giving the voice's register of return and callback an uneven structural rhythm.`,
        suggestedFix: `Redistribute payoffs: move at least one scene that pays off an earlier setup (non-empty payoffSetupIds) into the empty zone(s) — ${emptyNames949c} — so the voice's register of callback recurs across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // VOICE_TURN_ZONE_IMBALANCE — Underweight/bloat × (dramaticTurn !== 'nothing') × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes with a
  // dramatic turn total, divided across four equal structural zones. Fires only when one zone has
  // zero such scenes while another holds ≥50% of the total. Uses the same dramaticTurn !== 'nothing'
  // predicate as the existing 3-zone VOICE_TURN_ZONE_CLUSTER and run-based VOICE_TURN_DROUGHT_RUN —
  // the first application of the 4-zone bloat+empty-zone mode to the dramatic-turn categorical signal.
  {
    const r963a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
    });
    if (r963a.fires) {
      const emptyNames963a = r963a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName963a = FOUR_ZONE_NAMES[r963a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames963a} empty; ${bloatName963a} has ${r963a.counts[r963a.bloatZoneIdx]}/${r963a.totalCount} dramatic-turn scenes`,
        rule: 'VOICE_TURN_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r963a.totalCount} scenes with a dramatic turn are unevenly distributed across its four structural zones: ${bloatName963a} contains ${r963a.counts[r963a.bloatZoneIdx]} of them (${Math.round((r963a.counts[r963a.bloatZoneIdx] / r963a.totalCount) * 100)}%) while ${emptyNames963a} contains none. Turns bloat in one structural quarter and never fire in another, giving the voice's register of reversal an uneven structural rhythm.`,
        suggestedFix: `Redistribute turns: give at least one scene inside the empty zone(s) — ${emptyNames963a} — a dramatic turn so the voice's register of reversal recurs across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // VOICE_OPEN_THREAD_ZONE_IMBALANCE — Underweight/bloat × (unresolvedClues.length > 0) × four
  // structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes
  // leaving an open thread total, divided across four equal structural zones. Fires only when one
  // zone has zero such scenes while another holds ≥50% of the total. Distinct from the existing
  // 3-zone VOICE_OPEN_THREAD_ZONE_CLUSTER and run-based VOICE_OPEN_THREAD_DROUGHT_RUN — the first
  // application of the 4-zone bloat+empty-zone mode to the unresolvedClues array field, distinct from
  // the already-audited seededClueIds/payoffSetupIds/relationshipShifts/visualBeats array imbalances.
  {
    const r963b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r963b.fires) {
      const emptyNames963b = r963b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName963b = FOUR_ZONE_NAMES[r963b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames963b} empty; ${bloatName963b} has ${r963b.counts[r963b.bloatZoneIdx]}/${r963b.totalCount} open-thread scenes`,
        rule: 'VOICE_OPEN_THREAD_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r963b.totalCount} scenes leaving an open thread are unevenly distributed across its four structural zones: ${bloatName963b} contains ${r963b.counts[r963b.bloatZoneIdx]} of them (${Math.round((r963b.counts[r963b.bloatZoneIdx] / r963b.totalCount) * 100)}%) while ${emptyNames963b} contains none. Unanswered questions bloat in one structural quarter and never open in another, giving the voice's register of withheld information an uneven structural rhythm.`,
        suggestedFix: `Redistribute open threads: leave an unresolved question (non-empty unresolvedClues) in at least one scene inside the empty zone(s) — ${emptyNames963b} — so the voice's register of withholding recurs across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // VOICE_CLOCK_DELTA_ZONE_IMBALANCE — Underweight/bloat × (clockDelta !== 0) × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 clock-moving scenes
  // total, divided across four equal structural zones. Fires only when one zone has zero such scenes
  // while another holds ≥50% of the total. Uses the same clockDelta !== 0 predicate as the existing
  // 3-zone VOICE_CLOCK_DELTA_ZONE_CLUSTER and run-based VOICE_CLOCK_DELTA_DROUGHT_RUN — the first
  // application of the 4-zone bloat+empty-zone mode to this delta signal, distinct from the suspense
  // and curiosity deltas already audited in this pass.
  {
    const r963c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.clockDelta ?? 0) !== 0,
    });
    if (r963c.fires) {
      const emptyNames963c = r963c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName963c = FOUR_ZONE_NAMES[r963c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames963c} empty; ${bloatName963c} has ${r963c.counts[r963c.bloatZoneIdx]}/${r963c.totalCount} clock-moving scenes`,
        rule: 'VOICE_CLOCK_DELTA_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r963c.totalCount} clock-moving scenes are unevenly distributed across its four structural zones: ${bloatName963c} contains ${r963c.counts[r963c.bloatZoneIdx]} of them (${Math.round((r963c.counts[r963c.bloatZoneIdx] / r963c.totalCount) * 100)}%) while ${emptyNames963c} contains none. Ticking-clock beats bloat in one structural quarter and never move in another, giving the voice's register of urgency an uneven structural rhythm.`,
        suggestedFix: `Redistribute clock movement: move or add a scene that changes the clock (clockDelta ≠ 0) into the empty zone(s) — ${emptyNames963c} — so the voice's register of urgency recurs across every structural quarter, not only the quarter currently carrying most of it.`,
      });
    }
  }

  // VOICE_EMOTION_ZONE_IMBALANCE — Underweight/bloat × (emotionalShift !== 'neutral') × four
  // structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4
  // emotionally charged scenes total (positive or negative), divided across four equal structural
  // zones. Fires only when one zone has zero such scenes while another holds ≥50% of the total.
  // Uses the same emotionalShift !== 'neutral' predicate as the existing 3-zone VOICE_EMOTION_ZONE_
  // CLUSTER and run-based VOICE_EMOTION_DROUGHT_RUN — the any-direction valence signal, distinct
  // from the separate VOICE_POSITIVE_EMOTION and VOICE_NEGATIVE_EMOTION zone-imbalance rules already
  // covering each direction.
  {
    const r977a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r977a.fires) {
      const emptyNames977a = r977a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName977a = FOUR_ZONE_NAMES[r977a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames977a} empty; ${bloatName977a} has ${r977a.counts[r977a.bloatZoneIdx]}/${r977a.totalCount} emotionally-charged scenes`,
        rule: 'VOICE_EMOTION_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r977a.totalCount} emotionally-charged scenes are unevenly distributed across its four structural zones: ${bloatName977a} contains ${r977a.counts[r977a.bloatZoneIdx]} of them (${Math.round((r977a.counts[r977a.bloatZoneIdx] / r977a.totalCount) * 100)}%) while ${emptyNames977a} contains none. Feeling bloats in one structural quarter and never registers in another, giving the voice's felt register an uneven structural rhythm.`,
        suggestedFix: `Redistribute feeling: give at least one scene inside the empty zone(s) — ${emptyNames977a} — an emotional shift (positive or negative) so the voice's felt register recurs across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // VOICE_HIGHLIGHT_ZONE_IMBALANCE — Underweight/bloat × (dialogueHighlights.length > 0) × four
  // structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes
  // with a dialogue highlight total, divided across four equal structural zones. Fires only when one
  // zone has zero such scenes while another holds ≥50% of the total. Distinct from the existing
  // 3-zone VOICE_HIGHLIGHT_ZONE_CLUSTER and run-based VOICE_HIGHLIGHT_DROUGHT_RUN — the first
  // application of the 4-zone bloat+empty-zone mode to the dialogueHighlights array field.
  {
    const r977b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r977b.fires) {
      const emptyNames977b = r977b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName977b = FOUR_ZONE_NAMES[r977b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames977b} empty; ${bloatName977b} has ${r977b.counts[r977b.bloatZoneIdx]}/${r977b.totalCount} dialogue-highlight scenes`,
        rule: 'VOICE_HIGHLIGHT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r977b.totalCount} scenes with a dialogue highlight are unevenly distributed across its four structural zones: ${bloatName977b} contains ${r977b.counts[r977b.bloatZoneIdx]} of them (${Math.round((r977b.counts[r977b.bloatZoneIdx] / r977b.totalCount) * 100)}%) while ${emptyNames977b} contains none. Memorable lines bloat in one structural quarter and never land in another, giving the voice's quotable register an uneven structural rhythm.`,
        suggestedFix: `Redistribute highlights: give at least one scene inside the empty zone(s) — ${emptyNames977b} — a dialogue highlight so the voice's quotable register recurs across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // VOICE_SEED_ZONE_IMBALANCE — Underweight/bloat × (seededClueIds.length > 0) × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 seeding scenes
  // total, divided across four equal structural zones. Fires only when one zone has zero such
  // scenes while another holds ≥50% of the total. Distinct from the existing 3-zone VOICE_SEED_
  // ZONE_CLUSTER and run-based VOICE_SEED_DROUGHT_RUN — the first application of the 4-zone
  // bloat+empty-zone mode to the seededClueIds array field, distinct from the dialogueHighlights
  // and payoffSetupIds arrays already audited in this pass.
  {
    const r977c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.seededClueIds ?? []).length > 0,
    });
    if (r977c.fires) {
      const emptyNames977c = r977c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName977c = FOUR_ZONE_NAMES[r977c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames977c} empty; ${bloatName977c} has ${r977c.counts[r977c.bloatZoneIdx]}/${r977c.totalCount} seeding scenes`,
        rule: 'VOICE_SEED_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r977c.totalCount} clue-seeding scenes are unevenly distributed across its four structural zones: ${bloatName977c} contains ${r977c.counts[r977c.bloatZoneIdx]} of them (${Math.round((r977c.counts[r977c.bloatZoneIdx] / r977c.totalCount) * 100)}%) while ${emptyNames977c} contains none. Setups bloat in one structural quarter and never get planted in another, giving the voice's register of foreshadowing an uneven structural rhythm.`,
        suggestedFix: `Redistribute seeds: plant a clue (non-empty seededClueIds) in at least one scene inside the empty zone(s) — ${emptyNames977c} — so the voice's register of foreshadowing recurs across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // VOICE_STAKES_CURIOSITY_AFTERMATH_VOID — with zone-imbalance now fully exhausted in this pass
  // (the only remaining cluster+drought pair, VOICE_REVELATION/VOICE_RELATIONSHIP, both duplicate
  // signals already audited under different rule names), this wave pivots entirely to the
  // sequence/aftermath mode. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying stakes-raise scenes (purpose === 'raise_stakes', pos<n-2), ≥2 curiosity-raising
  // scenes anywhere, 2-scene lookahead. Fires when every stakes-raise's two-scene aftermath opens
  // no new curiosity, while curiosity does occur elsewhere. First use of raise_stakes as an
  // aftermath-void trigger in this pass — distinct from the clock/seed triggers already paired
  // with dialogueHighlights.
  {
    const r991a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r991a.fires) {
      issues.push({
        location: `${r991a.triggerCount} stakes-raise aftermath(s) — no curiosity raised within 2 scenes`,
        rule: 'VOICE_STAKES_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every stakes-raising scene (${r991a.triggerCount} escalations) is followed by two scenes that raise no new curiosity, even though ${r991a.aftermathCount} scenes elsewhere do open fresh questions. Escalating danger that never provokes a new uncertainty about what comes next leaves the voice's register of tension without a corresponding register of wonder in the beats right after.`,
        suggestedFix: `In the two scenes following at least one stakes-raise, plant a new open question so escalation feeds a voice of curiosity rather than sitting in a learnable void.`,
      });
    }
  }

  // VOICE_TURN_SUSPENSE_AFTERMATH_VOID — Sequence/aftermath × dramaticTurn trigger → suspenseDelta
  // absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2 qualifying
  // dramatic-turn scenes (pos<n-2), ≥2 tension-raising scenes anywhere, 2-scene lookahead. Fires
  // when every turn's two-scene aftermath raises no tension, while tension does rise elsewhere.
  // First pairing of dramaticTurn with suspenseDelta as an aftermath-void combination in this pass
  // — a pivot that fires without a rise in tension reads as a reversal the voice treats as inert
  // rather than consequential.
  {
    const r991b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
      isAftermath: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r991b.fires) {
      issues.push({
        location: `${r991b.triggerCount} dramatic-turn aftermath(s) — no suspense raised within 2 scenes`,
        rule: 'VOICE_TURN_SUSPENSE_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every dramatic-turn scene in the story (${r991b.triggerCount} pivots) is followed by two scenes with no rise in tension, even though ${r991b.aftermathCount} such rises occur elsewhere. A pivot that never tightens tension in the scenes right after it lands as a plot beat the voice registers flatly rather than a turn that reshapes what the audience fears or hopes for next.`,
        suggestedFix: `In the two scenes following at least one dramatic turn, raise the tension — a ticking complication or a near-miss — so the voice registers the pivot's consequence rather than moving past it inertly.`,
      });
    }
  }

  // VOICE_PAYOFF_RELATIONSHIP_AFTERMATH_VOID — Sequence/aftermath × payoffSetupIds trigger →
  // relationshipShifts absence. Built on checkAftermathVoid from the shared checks library. n≥8,
  // ≥2 qualifying payoff scenes (pos<n-2), ≥2 relationship-shift scenes anywhere, 2-scene
  // lookahead. Fires when every payoff's two-scene aftermath carries no relationship shift, while
  // such shifts occur elsewhere. First use of payoffSetupIds as an aftermath-void trigger in this
  // pass, and the first pairing of any trigger with relationshipShifts as the aftermath signal —
  // a callback that never bears on how characters treat each other nearby is a payoff the voice
  // leaves interpersonally silent.
  {
    const r991c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.payoffSetupIds ?? []).length > 0,
      isAftermath: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r991c.fires) {
      issues.push({
        location: `${r991c.triggerCount} payoff aftermath(s) — no relationship shift within 2 scenes`,
        rule: 'VOICE_PAYOFF_RELATIONSHIP_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every payoff scene in the story (${r991c.triggerCount} callbacks) is followed by two scenes with no shift in any relationship, even though ${r991c.aftermathCount} such shifts occur elsewhere. A callback that never bears on how characters treat each other in the scenes right after it lands as information completing without interpersonal consequence.`,
        suggestedFix: `In the two scenes following at least one payoff, let the collected setup strain or shift a relationship so the callback pays off interpersonally, not only structurally.`,
      });
    }
  }

  // VOICE_CLOCK_CURIOSITY_AFTERMATH_VOID — Sequence/aftermath × clockRaised trigger →
  // curiosityDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying clock-raising scenes (pos<n-2), ≥2 curiosity-raising scenes anywhere, 2-scene
  // lookahead. Fires when every clock-raising scene's two-scene aftermath opens no new curiosity,
  // while curiosity does occur elsewhere. Distinct from CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID
  // (same trigger paired with dialogueHighlights) — this pairs clockRaised with curiosityDelta for
  // the first time in this pass.
  {
    const r1005a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.clockRaised === true,
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r1005a.fires) {
      issues.push({
        location: `${r1005a.triggerCount} clock-raise aftermath(s) — no curiosity raised within 2 scenes`,
        rule: 'VOICE_CLOCK_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene that raises a ticking clock (${r1005a.triggerCount} instances) is followed by two scenes that raise no new curiosity, even though ${r1005a.aftermathCount} scenes elsewhere do open fresh questions. A deadline should usually provoke a new question — will it be met, what happens if it isn't; when every clock-raise's aftermath opens no curiosity, the voice's register of urgency has no corresponding register of wonder in the beats right after.`,
        suggestedFix: `In the two scenes following at least one clock-raising moment, plant a new open question tied to the deadline so time pressure feeds a voice of curiosity rather than sitting in a learnable void.`,
      });
    }
  }

  // VOICE_SEED_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × seededClueIds trigger →
  // emotionalShift absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying seed scenes (pos<n-2), ≥2 emotionally-charged scenes anywhere, 2-scene lookahead.
  // Fires when every seed's two-scene aftermath is emotionally flat, while charged scenes occur
  // elsewhere. Distinct from VOICE_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (same trigger paired
  // with dialogueHighlights) — this pairs seededClueIds with emotionalShift for the first time in
  // this pass.
  {
    const r1005b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.seededClueIds ?? []).length > 0,
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r1005b.fires) {
      issues.push({
        location: `${r1005b.triggerCount} seed aftermath(s) — no emotional shift within 2 scenes`,
        rule: 'VOICE_SEED_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every clue-seeding scene (${r1005b.triggerCount} plants) is followed by two emotionally neutral scenes, even though ${r1005b.aftermathCount} emotionally-charged scenes exist elsewhere. Planting a clue usually carries some charge — unease, curiosity's cousin dread, quiet hope; when every seed's aftermath is affectively flat, the voice's groundwork lands as pure information with no felt weight.`,
        suggestedFix: `Let at least one seed carry feeling in its aftermath: in the scene or two after a clue is planted, show someone reacting to it — a beat of unease, a private hope, a flicker of dread.`,
      });
    }
  }

  // VOICE_TURN_RELATIONAL_AFTERMATH_VOID — Sequence/aftermath × dramaticTurn trigger →
  // relationshipShifts absence. Built on checkAftermathVoid from the shared checks library. n≥8,
  // ≥2 qualifying dramatic-turn scenes (pos<n-2), ≥2 relationship-shift scenes anywhere, 2-scene
  // lookahead. Fires when every turn's two-scene aftermath carries no relationship shift, while
  // such shifts occur elsewhere. Distinct from VOICE_TURN_SUSPENSE_AFTERMATH_VOID (same trigger
  // paired with suspenseDelta) — this pairs dramaticTurn with relationshipShifts for the first
  // time in this pass.
  {
    const r1005c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
      isAftermath: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r1005c.fires) {
      issues.push({
        location: `${r1005c.triggerCount} dramatic-turn aftermath(s) — no relationship shift within 2 scenes`,
        rule: 'VOICE_TURN_RELATIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every dramatic-turn scene in the story (${r1005c.triggerCount} pivots) is followed by two scenes with no shift in any relationship, even though ${r1005c.aftermathCount} such shifts occur elsewhere. A pivot that never bears on how characters treat each other in the scenes right after it lands as a plot beat the voice registers structurally rather than interpersonally.`,
        suggestedFix: `In the two scenes following at least one dramatic turn, let the pivot strain or shift a relationship so the voice registers the turn's interpersonal consequence, not only its plot mechanics.`,
      });
    }
  }

  // VOICE_STAKES_SUSPENSE_AFTERMATH_VOID — Sequence/aftermath × raise_stakes trigger → suspenseDelta
  // absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2 qualifying
  // raise_stakes scenes (pos<n-2), ≥2 suspense-rising scenes anywhere, 2-scene lookahead. Fires
  // when every stakes-raise's two-scene aftermath carries no suspense rise, while such rises occur
  // elsewhere. Distinct from VOICE_STAKES_CURIOSITY_AFTERMATH_VOID (Wave 991: same trigger paired
  // with curiosityDelta) — this pairs raise_stakes with suspenseDelta for the first time in this pass.
  {
    const r1019a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r1019a.fires) {
      issues.push({
        location: `${r1019a.triggerCount} raise-stakes aftermath(s) — no suspense rise within 2 scenes`,
        rule: 'VOICE_STAKES_SUSPENSE_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every stakes-raising scene in the story (${r1019a.triggerCount} of them) is followed by two scenes with no rise in suspense at all, even though ${r1019a.aftermathCount} such rises occur elsewhere. Raising the stakes without the tension actually climbing in its immediate aftermath leaves the voice announcing danger it doesn't yet make felt.`,
        suggestedFix: `In the two scenes following at least one stakes-raise, let the tension visibly climb so the voice's declared danger is matched by rising suspense.`,
      });
    }
  }

  // VOICE_PAYOFF_CURIOSITY_AFTERMATH_VOID — Sequence/aftermath × payoffSetupIds trigger →
  // curiosityDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying payoff-setup scenes (pos<n-2), ≥2 curiosity-rising scenes anywhere, 2-scene
  // lookahead. Fires when every setup's two-scene aftermath carries no curiosity rise, while such
  // rises occur elsewhere. Distinct from VOICE_PAYOFF_RELATIONSHIP_AFTERMATH_VOID (Wave 991: same
  // trigger paired with relationshipShifts) — this pairs payoffSetupIds with curiosityDelta for the
  // first time in this pass.
  {
    const r1019b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.payoffSetupIds ?? []).length > 0,
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r1019b.fires) {
      issues.push({
        location: `${r1019b.triggerCount} payoff-setup aftermath(s) — no curiosity rise within 2 scenes`,
        rule: 'VOICE_PAYOFF_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every payoff-setup scene in the story (${r1019b.triggerCount} plants) is followed by two scenes with no rise in curiosity, even though ${r1019b.aftermathCount} such rises occur elsewhere. Planting a setup without the audience's curiosity visibly sharpening right after it lets the voice bury its own groundwork.`,
        suggestedFix: `In the two scenes following at least one payoff setup, let curiosity visibly sharpen so the voice's groundwork registers as something the audience is now wondering about.`,
      });
    }
  }

  // VOICE_OPEN_THREAD_STAGING_AFTERMATH_VOID — Sequence/aftermath × unresolvedClues trigger →
  // visualBeats absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying scenes with 3+ open threads (pos<n-2), ≥2 visually-staged scenes anywhere, 2-scene
  // lookahead. Fires when every such heavily-unresolved scene's two-scene aftermath carries no
  // staged visual beat, while staged beats occur elsewhere. Distinctness: unresolvedClues has never
  // been used as an aftermath-void trigger in this pass (only as a zone/drought-run presence
  // signal via UNRESOLVED_CLUE_DROUGHT_RUN and VOICE_OPEN_THREAD_ZONE_CLUSTER/DROUGHT_RUN/
  // ZONE_IMBALANCE), and visualBeats has never been used as an aftermath-void consequence channel
  // in this pass (only as its own trigger/presence signal via VOICE_STAGING_* and VOICE_STAGING_
  // PEAK_UNCAUSED) — both halves of this pairing are genuinely new territory for the sequence/
  // aftermath mode in this file.
  {
    const r1019c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.unresolvedClues ?? []).length >= 3,
      isAftermath: r => (r.visualBeats ?? []).length > 0,
    });
    if (r1019c.fires) {
      issues.push({
        location: `${r1019c.triggerCount} heavily-unresolved aftermath(s) — no staged visual beat within 2 scenes`,
        rule: 'VOICE_OPEN_THREAD_STAGING_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene carrying three or more unresolved threads (${r1019c.triggerCount} of them) is followed by two scenes with no staged visual beat, even though ${r1019c.aftermathCount} such beats occur elsewhere. A pile-up of open questions that never earns a visually staged moment right after it leaves the voice's mounting uncertainty unseen rather than embodied.`,
        suggestedFix: `In the two scenes following a heavily-unresolved scene, stage at least one deliberate visual beat so the voice's accumulating open threads become something the audience can actually see, not just track.`,
      });
    }
  }

  // VOICE_STAKES_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × raise_stakes trigger →
  // emotionalShift absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying raise_stakes scenes (pos<n-2), ≥2 emotionally-charged scenes anywhere, 2-scene
  // lookahead. Fires when every stakes-raise's two-scene aftermath carries no emotional shift,
  // while such shifts occur elsewhere. Distinct from VOICE_STAKES_CURIOSITY_AFTERMATH_VOID (Wave
  // 991) and VOICE_STAKES_SUSPENSE_AFTERMATH_VOID (Wave 1019, same trigger paired with
  // curiosityDelta and suspenseDelta respectively) — this is the third consequence channel for
  // this trigger in this pass.
  {
    const r1033a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r1033a.fires) {
      issues.push({
        location: `${r1033a.triggerCount} raise-stakes aftermath(s) — no emotional shift within 2 scenes`,
        rule: 'VOICE_STAKES_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every stakes-raising scene in the story (${r1033a.triggerCount} of them) is followed by two emotionally neutral scenes, even though ${r1033a.aftermathCount} emotionally-charged scenes exist elsewhere. A stakes-raise that isn't matched by any feeling in the scenes right after it leaves the voice's escalation registering as a declared beat rather than something anyone visibly feels the weight of.`,
        suggestedFix: `In the two scenes following at least one stakes-raise, let someone's feelings visibly register the new danger so escalating pressure lands emotionally, giving the voice a felt beat alongside its declared one.`,
      });
    }
  }

  // VOICE_CLOCK_RELATIONAL_AFTERMATH_VOID — Sequence/aftermath × clockRaised trigger →
  // relationshipShifts absence. Built on checkAftermathVoid from the shared checks library. n≥8,
  // ≥2 qualifying clock-raise scenes (pos<n-2), ≥2 relationship-shift scenes anywhere, 2-scene
  // lookahead. Fires when every clock-raise's two-scene aftermath carries no bond change, while
  // such changes occur elsewhere. Distinct from the original clockRaised → dialogueHighlights rule
  // and VOICE_CLOCK_CURIOSITY_AFTERMATH_VOID (Wave 1005, same trigger paired with dialogueHighlights
  // and curiosityDelta respectively) — this is the third consequence channel for this trigger.
  {
    const r1033b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.clockRaised === true,
      isAftermath: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r1033b.fires) {
      issues.push({
        location: `${r1033b.triggerCount} clock-raise aftermath(s) — no relationship shift within 2 scenes`,
        rule: 'VOICE_CLOCK_RELATIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every clock-raise scene in the story (${r1033b.triggerCount} of them) is followed by two scenes with no shift in any relationship, even though ${r1033b.aftermathCount} such shifts occur elsewhere. A ticking deadline that never bears on how characters treat each other in the scenes right after it leaves the voice's urgency purely external, disconnected from the relationships it should be pressuring.`,
        suggestedFix: `In the two scenes following at least one clock-raise, let the ticking deadline strain or shift a relationship so the voice's urgency registers interpersonally, not only as ambient pressure.`,
      });
    }
  }

  // VOICE_TURN_CURIOSITY_AFTERMATH_VOID — Sequence/aftermath × dramaticTurn trigger →
  // curiosityDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying dramatic-turn scenes (pos<n-2), ≥2 curiosity-rising scenes anywhere, 2-scene
  // lookahead. Fires when every turn's two-scene aftermath carries no curiosity rise, while such
  // rises occur elsewhere. Distinct from VOICE_TURN_SUSPENSE_AFTERMATH_VOID (Wave 991) and
  // VOICE_TURN_RELATIONAL_AFTERMATH_VOID (Wave 1005, same trigger paired with suspenseDelta and
  // relationshipShifts respectively) — this is the third consequence channel for this trigger.
  {
    const r1033c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r1033c.fires) {
      issues.push({
        location: `${r1033c.triggerCount} dramatic-turn aftermath(s) — no curiosity rise within 2 scenes`,
        rule: 'VOICE_TURN_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every dramatic-turn scene in the story (${r1033c.triggerCount} pivots) is followed by two scenes with no rise in curiosity, even though ${r1033c.aftermathCount} such rises occur elsewhere. A pivot that never opens a fresh question in the scenes right after it leaves the voice's turns registering as closed events rather than developments that deepen the audience's engagement.`,
        suggestedFix: `In the two scenes following at least one dramatic turn, let a new question arise from the pivot so the voice's turns keep generating curiosity, not just resolving the immediate moment.`,
      });
    }
  }

  // VOICE_SEED_CURIOSITY_AFTERMATH_VOID — Sequence/aftermath × seededClueIds trigger →
  // curiosityDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying seed scenes (pos<n-2), ≥2 curiosity-rising scenes anywhere, 2-scene lookahead.
  // Fires when every seed's two-scene aftermath carries no curiosity rise, while such rises occur
  // elsewhere. Distinct from the original seededClueIds → dialogueHighlights rule and VOICE_SEED_
  // EMOTIONAL_AFTERMATH_VOID (same trigger paired with dialogueHighlights and emotionalShift
  // respectively) — this is the third consequence channel for this trigger.
  {
    const r1047a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.seededClueIds ?? []).length > 0,
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r1047a.fires) {
      issues.push({
        location: `${r1047a.triggerCount} seed aftermath(s) — no curiosity rise within 2 scenes`,
        rule: 'VOICE_SEED_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every clue-seeding scene in the story (${r1047a.triggerCount} plants) is followed by two scenes with no rise in curiosity, even though ${r1047a.aftermathCount} such rises occur elsewhere. A planted clue that never sharpens into a fresh question right after it leaves the voice's groundwork buried rather than voiced as a live question the audience carries forward.`,
        suggestedFix: `In the two scenes following at least one clue-seeding moment, let curiosity visibly sharpen so the seed's groundwork registers as something the voice keeps returning to.`,
      });
    }
  }

  // VOICE_PAYOFF_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × payoffSetupIds trigger →
  // emotionalShift absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying payoff scenes (pos<n-2), ≥2 emotionally-charged scenes anywhere, 2-scene lookahead.
  // Fires when every payoff's two-scene aftermath carries no emotional shift, while such shifts
  // occur elsewhere. Distinct from VOICE_PAYOFF_RELATIONSHIP_AFTERMATH_VOID and VOICE_PAYOFF_
  // CURIOSITY_AFTERMATH_VOID (same trigger paired with relationshipShifts and curiosityDelta
  // respectively) — this is the third consequence channel for this trigger.
  {
    const r1047b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.payoffSetupIds ?? []).length > 0,
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r1047b.fires) {
      issues.push({
        location: `${r1047b.triggerCount} payoff aftermath(s) — no emotional shift within 2 scenes`,
        rule: 'VOICE_PAYOFF_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every payoff scene in the story (${r1047b.triggerCount} cashed-in setups) is followed by two emotionally neutral scenes, even though ${r1047b.aftermathCount} emotionally-charged scenes exist elsewhere. A callback that closes cleanly without anyone visibly feeling anything about it leaves the voice's resolutions registering as pure mechanics rather than moments that land.`,
        suggestedFix: `In the two scenes following at least one payoff, let someone's feelings register the resolution — relief, grief, triumph — so the voice's callbacks carry emotional weight, not just narrative closure.`,
      });
    }
  }

  // VOICE_CLOCK_SUSPENSE_AFTERMATH_VOID — Sequence/aftermath × clockRaised trigger →
  // suspenseDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying clock-raise scenes (pos<n-2), ≥2 suspense-rising scenes anywhere, 2-scene
  // lookahead. Fires when every clock-raise's two-scene aftermath carries no suspense rise, while
  // such rises occur elsewhere. Distinct from the original clockRaised → dialogueHighlights rule,
  // VOICE_CLOCK_CURIOSITY_AFTERMATH_VOID, and VOICE_CLOCK_RELATIONAL_AFTERMATH_VOID (same trigger
  // paired with dialogueHighlights/curiosityDelta/relationshipShifts respectively) — this is the
  // fourth consequence channel for this trigger.
  {
    const r1047c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.clockRaised === true,
      isAftermath: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r1047c.fires) {
      issues.push({
        location: `${r1047c.triggerCount} clock-raise aftermath(s) — no suspense rise within 2 scenes`,
        rule: 'VOICE_CLOCK_SUSPENSE_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every clock-raise scene in the story (${r1047c.triggerCount} of them) is followed by two scenes with no rise in suspense, even though ${r1047c.aftermathCount} such rises occur elsewhere. A ticking deadline that doesn't tighten the felt sense of urgency right after it leaves the voice's pressure registering as a stated fact rather than something anyone visibly feels bearing down.`,
        suggestedFix: `In the two scenes following at least one clock-raise, let the tension visibly climb so the ticking deadline presses on the voice, not just the plot.`,
      });
    }
  }

  // VOICE_CLOCK_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × clockRaised trigger →
  // emotionalShift absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying clock-raise scenes (pos<n-2), ≥2 emotionally-charged scenes anywhere, 2-scene
  // lookahead. Fires when every clock-raise's two-scene aftermath carries no emotional shift,
  // while such shifts occur elsewhere. Distinct from the original clockRaised → dialogueHighlights
  // rule, VOICE_CLOCK_CURIOSITY_AFTERMATH_VOID, VOICE_CLOCK_RELATIONAL_AFTERMATH_VOID, and
  // VOICE_CLOCK_SUSPENSE_AFTERMATH_VOID (same trigger paired with dialogueHighlights/
  // curiosityDelta/relationshipShifts/suspenseDelta respectively) — this is the fifth consequence
  // channel for this trigger.
  {
    const r1061a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.clockRaised === true,
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r1061a.fires) {
      issues.push({
        location: `${r1061a.triggerCount} clock-raise aftermath(s) — no emotional shift within 2 scenes`,
        rule: 'VOICE_CLOCK_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every clock-raise scene in the story (${r1061a.triggerCount} of them) is followed by two scenes registering no emotional shift, even though ${r1061a.aftermathCount} such shifts occur elsewhere. A deadline that never lands emotionally right after it's introduced reads as a mechanical constraint the voice states but never feels.`,
        suggestedFix: `In the two scenes following at least one clock-raise, register an emotional shift so the deadline's pressure is felt in someone's voice, not just ticking in the background.`,
      });
    }
  }

  // VOICE_SEED_SUSPENSE_AFTERMATH_VOID — Sequence/aftermath × seededClueIds trigger →
  // suspenseDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying seed scenes (pos<n-2), ≥2 suspense-rising scenes anywhere, 2-scene lookahead. Fires
  // when every seed's two-scene aftermath carries no rise in suspense, while such rises occur
  // elsewhere. Distinct from VOICE_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID, VOICE_SEED_EMOTIONAL_
  // AFTERMATH_VOID, and VOICE_SEED_CURIOSITY_AFTERMATH_VOID (same trigger paired with
  // dialogueHighlights/emotionalShift/curiosityDelta respectively) — this is the fourth
  // consequence channel for this trigger.
  {
    const r1061b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.seededClueIds ?? []).length > 0,
      isAftermath: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r1061b.fires) {
      issues.push({
        location: `${r1061b.triggerCount} seed scene(s) — no suspense rise within 2 scenes of any`,
        rule: 'VOICE_SEED_SUSPENSE_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1061b.triggerCount} clue-planting scenes is followed by two scenes with no rise in suspense, even though ${r1061b.aftermathCount} such rises occur elsewhere. A planted clue that never tightens tension right after it lands registers as inert setup rather than a thread the voice is actively watching.`,
        suggestedFix: `In the two scenes following at least one clue-seeding moment, let suspense tighten so the seed feels actively watched by the story's voice, not just planted and forgotten.`,
      });
    }
  }

  // VOICE_STAKES_RELATIONAL_AFTERMATH_VOID — Sequence/aftermath × raise_stakes trigger →
  // relationshipShifts absence. Built on checkAftermathVoid from the shared checks library. n≥8,
  // ≥2 qualifying stakes-raising scenes (pos<n-2), ≥2 relationship-shifting scenes anywhere,
  // 2-scene lookahead. Fires when every stakes-raise's two-scene aftermath carries no relationship
  // shift, while such shifts occur elsewhere. Distinct from VOICE_STAKES_CURIOSITY_AFTERMATH_VOID,
  // VOICE_STAKES_SUSPENSE_AFTERMATH_VOID, and VOICE_STAKES_EMOTIONAL_AFTERMATH_VOID (same trigger
  // paired with curiosityDelta/suspenseDelta/emotionalShift respectively) — this is the fourth
  // consequence channel for this trigger.
  {
    const r1061c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r1061c.fires) {
      issues.push({
        location: `${r1061c.triggerCount} stakes-raising scene(s) — no relationship shift within 2 scenes of any`,
        rule: 'VOICE_STAKES_RELATIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1061c.triggerCount} stakes-raising scenes is followed by two scenes with no shift in any relationship, even though ${r1061c.aftermathCount} such shifts occur elsewhere. Raised stakes that never bear on how characters treat each other right after they land leave the voice's mounting cost registering as an isolated plot fact.`,
        suggestedFix: `In the two scenes following at least one stakes-raise, let a relationship shift so the raised cost registers interpersonally in the voice, not just as a plot escalation.`,
      });
    }
  }

  const { revised, usedLLM } = await rewritePass({ fountain, issues, passName: 'voice', approvedSpans, storyContext: input.storyContext, priorPassResults: input.priorPassResults });
  const changed = revised !== fountain;

  return {
    pass: 'voice',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? 'Voice/tone pass: consistent voice throughout'
      : `Voice/tone pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}
