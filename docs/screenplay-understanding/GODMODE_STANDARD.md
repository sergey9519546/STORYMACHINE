GODMODE Screenplay Understanding Standard
=========================================

The previous version was strong, but it was **not yet the maximum version**. It identified the major craft dimensions, but it did not fully define:

* the hierarchy from whole script to individual line;

* the difference between hard correctness and artistic excellence;

* how genre and authorial intent change the meaning of “good”;

* how every annotation must be proven with evidence;

* how to teach deliberate rule-breaking rather than rigid formulas;

* how to convert each screenplay into critic, planner, repair, ranking, and generation data;

* the exact finished training package each screenplay should produce.

This is the complete version.

* * *

1. The fundamental objective
   ============================

The model must not merely learn:
    This is a successful screenplay.

It must learn:
    What experience was this screenplay designed to create?
    What dramatic systems create that experience?
    What decisions were made at the script, sequence, scene, beat,
    action, and dialogue levels?

    Why do those decisions work together?

    Which decisions are essential?

    Which decisions are optional?

    Which apparent “rules” are being deliberately violated?

    What would weaken or break if a decision were changed?

    How could the same dramatic function be achieved
    in a completely different original story?

The Academy Nicholl criteria provide a useful professional top-level foundation: **Story, Voice, Characters, Craft, and Meaning and Magic**. They explicitly consider premise freshness, emotional connection, distinctive voice, character change and voice, conflict, character agency, motivated action, thematic purpose, and the elusive quality that elevates a script beyond basic competence. ([Oscars](https://www.oscars.org/nicholl/about?utm_source=chatgpt.com "HOW TO APPLY | Oscars.org | Academy of Motion Picture ..."))

StoryMachine should retain those human-facing categories while adding the deeper functional categories already developed in the project:
    causal coherence
    character intentionality
    knowledge legality
    mechanism integrity
    relationship movement
    object continuity
    reveal readiness
    audience-state management
    setup/payoff integrity
    dialogue state-change power
    theme argument pressure

* * *

2. The model must learn conditional excellence—not one formula
   ==============================================================

The model should never learn:
    All good films have exactly this structure.
    All midpoint scenes happen at the same page.
    Every protagonist must behave the same way.
    Every scene must contain an obvious reversal.
    Every line must be indirect.

It must learn:
    A decision is good relative to:
    format
    genre
    subgenre
    tone
    audience
    story promise
    production scale
    character design
    authorial intention
    and intended emotional experience.

Use:
    Quality =
    quality of execution
    given the screenplay’s intended design

A quiet relationship drama should not be judged by action-thriller escalation. A surreal film should not be punished for ambiguity that would be a flaw in a procedural mystery. A comedy can use repetition as escalation; a thriller may use repetition as dread; in another script the same repetition may simply be redundant.

Every screenplay therefore begins with a **Script Intent Profile**.

* * *

3. Level 1 — Script Intent Profile
   ==================================

For every screenplay, extract:
Identity

--------

    format
    feature / pilot / episode / short / limited-series installment
    genre
    subgenre
    target audience
    rating range
    period
    setting
    production scale
    budget implications

Intended experience
-------------------

    What should the audience feel?
    What should the audience anticipate?
    What should they fear?
    What should they want to discover?
    What emotional state should the ending leave behind?

Tone contract
-------------

Examples:
    restrained
    operatic
    absurd
    naturalistic
    nightmarish
    romantic
    melancholic
    propulsive
    satirical
    sincere
    morally ambiguous
Genre contract

--------------

    What pleasures does this genre promise?
    What conventions does the script fulfill?
    What conventions does it revise?
    What conventions does it refuse?
    What kind of ending does the genre create an expectation for?

Authorial objective
-------------------

    What is this movie fundamentally trying to accomplish?
    What is it exploring beyond plot?
    What distinguishes its worldview?
    What should not be “fixed” even though it violates convention?

### Required output

    {
      "format": "feature",
      "genre": ["psychological thriller", "family mystery"],
      "tone": ["restrained", "ominous", "emotionally intimate"],
      "audience_promise": [
        "progressive discovery",
        "family conflict",
        "late emotional recontextualization"
      ],
      "ending_contract": "truth is exposed but family stability is permanently altered",
      "production_scale": "contained",
      "ambiguity_target": "medium",
      "authorial_risk": "withholds protagonist explanation for most of act two"
    }

* * *

4. Level 2 — Premise and story-engine intelligence
   ==================================================

The model must identify why the premise can sustain an entire screenplay.
Premise extraction

------------------

    protagonist
    goal or unresolved problem
    opposing force
    story world
    central complication
    stakes
    ironic contradiction

Premise quality
---------------

The model should identify:
    specificity
    novelty
    immediate conflict
    cinematic potential
    emotional potential
    escalation capacity
    choice pressure
    genre pleasure
    thematic potential
The story engine

----------------

The **story engine** is the repeating mechanism that continually generates new dramatic problems.

Examples:
    A lie must be protected while evidence accumulates.
    A forbidden talent must act through a socially acceptable proxy.
    A family ritual determines who can be remembered.
    A house functions simultaneously as grief shrine and physical burden.
    A wish-world satisfies surface desire while demanding ownership.
    A detective follows an object whose changing possession reveals a conspiracy.

The model must answer:
    What keeps generating scenes?
    What creates pressure without arbitrary invention?
    What can escalate?
    What can reverse?
    What creates costs?
    What creates choices?
    What reaches crisis form in the climax?
Mechanism lifecycle

-------------------

Annotate:
    seeded
    activated
    initially useful
    increasingly costly
    dangerous
    crisis
    transformed
    resolved

Your project already defines the correct mechanism-oriented training direction: scene → mechanism, event → state delta, object → meaning arc, reveal → clue ecology, relationship → rupture or repair, and line → tactic and hidden intent.

* * *

5. Level 3 — World, rules, institutions, and constraints
   ========================================================

The model must learn that story events occur inside a rule system.
Objective world facts

---------------------

    locations
    objects
    technology
    social structure
    history
    law
    institutions
    family rules
    rituals
    economics
    physical limits
    magic or speculative rules

Story rules
-----------

For every important rule:
    What is allowed?
    What is prohibited?
    Who enforces it?
    Who benefits from it?
    Who suffers from it?
    What happens when it is violated?
    What loopholes exist?
    Can the rule change?
Resource logic

--------------

Identify whether an important resource is:
    consumable
    transferable
    copyable
    persistent
    depleting
    accumulating
    positive-sum
    negative-sum

Examples:
    last dose of medicine → consumable
    inheritance → transferable
    knowledge of a secret → copyable
    family guilt → accumulating debt
    public trust → potentially positive-sum or destructible
    countdown → depleting
Institutional pressure

----------------------

The model should identify:
    gatekeepers
    status hierarchies
    professional language
    allowed speakers
    forbidden claims
    public versus private authority
    institutional incentives
    institutional hypocrisy
Spatial and cinematic legality

------------------------------

For important scenes:
    Who can see what?
    Who can hear what?
    Who can reach what?
    Where are objects?
    Where are exits?
    What does the camera reveal to the audience?
    What remains hidden from characters?

This prevents the model from treating story as dialogue floating in empty space.

* * *

6. Level 4 — Fabula and syuzhet
   ===============================

The model must learn the difference between:
    Fabula:
    What happened in chronological story-world order.
    Syuzhet:
    The order and method through which the audience experiences it.

For each script, construct both.
Fabula map

----------

    chronological events
    causal relationships
    character decisions
    object transfers
    knowledge acquisition
    relationship changes
    world-state changes

Syuzhet map
-----------

    opening image
    withheld events
    flashbacks
    flashforwards
    parallel actions
    delayed explanations
    reveal order
    point-of-view restrictions
    dramatic irony
    misdirection
    recontextualization

Required questions
------------------

    Why is this event shown here rather than chronologically?
    What information is being withheld?
    What expectation is created?
    What does the audience believe at this point?
    What changes when the missing information is supplied?

Graph-based planning research increasingly supports planning over explicit event and character structures rather than only sequential prose. PLOTTER, for example, uses event and character graphs in an Evaluate–Plan–Revise process to diagnose causality and structural problems before text generation. ([arXiv](https://arxiv.org/abs/2604.21253?utm_source=chatgpt.com "Planning Beyond Text: Graph-based Reasoning for Complex Narrative Generation"))

* * *

7. Level 5 — Causal architecture
   ================================

Every major event must be mapped into a causal graph.

For each major event, record:
    preconditions
    trigger
    actor
    actor’s reason
    action
    immediate effects
    delayed effects
    enabled future events
    blocked alternatives
    new risks
    new obligations
    new knowledge
Causal questions

----------------

    Why can this happen now?
    Why could it not happen earlier?
    What caused it?
    Who caused it?
    Was it intentional, accidental, forced, or emergent?
    What later event depends on it?
    What changes if it is removed?

Causal categories
-----------------

    physical
    social
    emotional
    epistemic
    institutional
    ritual
    motivational
    thematic

Coincidence analysis
--------------------

Identify:
    coincidence that initiates trouble
    coincidence that complicates trouble
    coincidence that resolves trouble

A coincidence that begins a story can be acceptable. A coincidence that resolves the central conflict often weakens character agency unless deliberately designed as thematic irony.
Causal density

--------------

Do not reward scripts merely for having many events.

The model must learn:
    A strong event frequently:
    results from prior decisions,
    changes several systems,
    and creates future obligations.

Narrative-planning research distinguishes causal plot progression from character intentionality. IPOCL specifically models both causally sound progression and character goals explaining why actions occur. ([arXiv](https://arxiv.org/abs/1401.3841?utm_source=chatgpt.com "Narrative Planning: Balancing Plot and Character"))

* * *

8. Level 6 — Protagonist architecture
   =====================================

For every protagonist, extract:
External design

---------------

    concrete goal
    why the goal matters
    deadline
    obstacles
    resources
    skills
    weaknesses
    stakes of failure

Internal design
---------------

    wound
    fear
    need
    false belief
    shame
    desire
    value system
    identity conflict
    moral boundary

Contradiction
-------------

Examples:
    wants intimacy but protects autonomy
    wants recognition but fears exposure
    wants justice but benefits from the corrupt system
    wants freedom but depends on family approval
Mask versus private reality

---------------------------

    public identity
    performed identity
    private desire
    concealed truth
    self-deception

Agency
------

For each major section:
    What does the protagonist choose?
    What does the choice cause?
    What choice is avoided?
    When does reaction become intention?
    When do their decisions begin driving the story?
Transformation

--------------

Do not reduce the arc to:
    sad → happy
    weak → strong

Extract:
    starting worldview
    defensive strategy
    evidence against worldview
    resistance
    cost of resistance
    crisis decision
    new behavior under pressure
    ending worldview
    remaining contradiction
Arc proof

---------

The final transformation should be proven through:
    irreversible choice
    sacrifice
    changed behavior
    new relationship action
    reinterpreted object
    acceptance or rejection of prior identity

* * *

9. Level 7 — Opposition architecture
   ====================================

The model must understand that opposition is not simply “the villain.”

Identify:
    person
    institution
    family system
    environment
    time
    social expectation
    internal compulsion
    mystery
    resource shortage
    world rule

For each opposing force:
    goal
    worldview
    justification
    resources
    power
    methods
    adaptability
    blind spot
    relationship to protagonist
    thematic counterclaim
Intelligent opposition

----------------------

The model should identify:
    How does opposition respond to the protagonist?
    How does it learn?
    How does it escalate?
    How does it close options?
    How does it pressure the protagonist’s specific weakness?
Thematic opposition

-------------------

The antagonist or opposing system should often embody a defensible counter-position rather than simple evil.
    Protagonist claim
    versus
    Opposing claim

A weak opposition system exists only to delay the hero. A strong one forces the hero to confront a genuine contradiction.

* * *

10. Level 8 — Supporting-character function
    ===========================================

Each supporting character should be analyzed beyond their plot role.

Extract:
    independent goal
    relationship to protagonist
    private pressure
    knowledge state
    theme position
    story function
    arc or non-arc
    power
    dependency
    secret

Possible dramatic functions:
    ally
    foil
    mirror
    temptation
    gatekeeper
    witness
    dependent
    rival
    moral critic
    false mentor
    truth carrier
    comic pressure valve
    betrayer
    institutional representative

The model must recognize when a supporting character:
    has an independent existence
    versus
    exists only to deliver exposition or solve the protagonist’s problem.

* * *

11. Level 9 — Character intentionality chains
    =============================================

For every major character action, annotate:
    perceived situation
    belief
    goal
    fear
    available alternatives
    chosen tactic
    expected outcome
    actual outcome
    resulting belief update
    next intention

Example:
    Belief:
    Leo suspects Nora is lying.
    Goal:
    Confirm the lie without revealing that he found the receipt.
    Fear:
    If he confronts her directly, she will destroy the evidence.

    Tactic:
    Ask an apparently casual question about timing.

    Expected result:
    Nora contradicts herself.

    Actual result:
    Nora recognizes the test and shifts the conversation.

    New intention:
    Leo decides to search the car.

This teaches the model to write **characters making moves**, not plot events wearing character names.

* * *

12. Level 10 — Relationship architecture
    ========================================

For every central relationship, track:
Baseline

--------

    trust
    love
    intimacy
    admiration
    resentment
    fear
    dependency
    obligation
    envy
    guilt
    power

Central dialectics
------------------

    connection versus autonomy
    openness versus secrecy
    protection versus control
    duty versus freedom
    dependence versus agency
    admiration versus envy
    loyalty versus truth

Public versus private relationship
----------------------------------

    How the relationship appears publicly
    What each person privately believes
    What is never spoken
    What shared history controls the present

Relationship events
-------------------

    bonding
    testing
    concealment
    boundary violation
    power shift
    betrayal
    rupture
    repair opportunity
    failed repair
    sacrifice
    recognition
    separation

Repair proof
------------

A major relationship repair should be analyzed through:
    harm acknowledgement
    truth disclosure
    meaningful cost
    changed behavior
    evidence visible to the harmed person
    remaining debt

The model should learn that one apology does not automatically erase major betrayal.

* * *

13. Level 11 — Structural architecture
    ======================================

Do not force every script into one formula. Instead identify the actual structural logic it uses.
Script-level structural map

---------------------------

    opening state
    inciting pressure
    first commitment
    first major threshold
    rising complications
    midpoint transformation
    second-half pressure
    crisis
    climax
    resolution
    final image or aftertaste

For every major turn
--------------------

Record:
    what changes
    who causes it
    what expectation reverses
    what becomes impossible
    what new question replaces the old one
    what cost increases
Structural movement

-------------------

Track separately:
    plot movement
    character movement
    relationship movement
    knowledge movement
    theme movement
    mechanism movement
    audience movement

A sequence can be quiet in plot while significant in relationship or audience understanding.
Structure by obligation, not page number

----------------------------------------

The model should learn:
    What work does the turning point perform?

Not only:
    On what page does it happen?

* * *

14. Level 12 — Sequence architecture
    ====================================

Sequences are often the most useful unit between whole script and scene.

For every sequence, identify:
    sequence objective
    dominant point of view
    starting state
    central question
    active opposition
    escalation pattern
    information gained
    relationship movement
    major reversal
    ending state
    future obligation created
Sequence escalation

-------------------

Determine whether the sequence escalates through:
    greater danger
    greater intimacy
    less time
    less privacy
    higher moral cost
    greater public exposure
    stronger opposition
    reduced options
    more damaging knowledge
    worsening relationship debt
Sequence independence and dependency

------------------------------------

    What previous sequence enables this one?
    What later sequence depends on it?
    Could it be removed?
    Could it be combined?
    Would combining it damage rhythm or meaning?

* * *

15. Level 13 — Subplot architecture
    ===================================

For every subplot:
    protagonist
    goal
    conflict
    relationship to main plot
    theme relationship
    entry point
    escalation
    intersection points
    payoff
    resolution

Classify the subplot as:
    mirror
    counterexample
    complication
    resource
    relationship arc
    theme counterargument
    comic contrast
    world expansion
    pressure amplifier

The model should identify:
    Does the subplot change the main plot?
    Does it deepen the protagonist?
    Does it create thematic evidence?
    Does it merely consume pages?

* * *

16. Level 14 — Scene-function intelligence
    ==========================================

Every scene should have a **Scene Function Record**.
Scene entry state

-----------------

    what characters want
    what they know
    what the audience knows
    relationship status
    object possession
    active danger
    active mechanism

Scene design
------------

    scene purpose
    dramatic question
    character objectives
    obstacle
    stakes
    tactics
    counter-tactics
    turn
    exit condition

Scene functions
---------------

A scene may:
    set up
    complicate
    reveal
    conceal
    test
    reverse
    rupture
    repair
    escalate
    reframe
    pay off
    prepare
    contrast
    release pressure
    introduce a clock
    transfer an object
    change power
Scene state change

------------------

Track whether the scene changes:
    fact
    belief
    emotion
    relationship
    power
    goal
    object state
    location
    clue
    audience knowledge
    theme argument
    mechanism pressure
    expectation

Your project already establishes the correct principle: scenes and exchanges should be evaluated by meaningful before/after deltas rather than by polish alone.

### Important qualification

Do not enforce a crude rule that every scene needs a large plot reversal.

An atmospheric, transitional, comic, ceremonial, or contemplative scene can be valid if it deliberately changes:
    tone
    audience attachment
    motif meaning
    anticipation
    emotional readiness
    world understanding

But it should know what work it is doing.

* * *

17. Level 15 — Beat and tactic chains
    =====================================

Break important scenes into beats.

For every beat:
    actor
    objective
    tactic
    target
    response
    result
    new information
    power shift
    next tactic

Typical tactics:
    deflect
    test
    accuse
    bait
    comfort
    threaten
    perform a role
    conceal
    reframe
    stall
    confess
    deny
    plead
    command
    joke
    withdraw
    misdirect
    shame
    seduce
    bargain
    provoke
Tactic progression

------------------

The model should learn:
    Characters should not repeat one tactic indefinitely.
    Resistance causes tactical adaptation.

Example:
    ask casually
    → joke
    → test
    → accuse indirectly
    → produce evidence
    → threaten withdrawal

* * *

18. Level 16 — Dialogue intelligence
    ====================================

For every important dialogue exchange, extract:
Surface layer

-------------

    literal meaning
    topic
    question or claim

Hidden layer
------------

    hidden intent
    withheld truth
    fear
    desired reaction
    social risk

Tactical layer
--------------

    what the speaker is doing to the listener

Relationship layer
------------------

    status move
    intimacy move
    boundary test
    debt creation
    power transfer

Knowledge layer
---------------

    what speaker knows
    what listener knows
    what each believes the other knows
    what cannot safely be said

Voice layer
-----------

    syntax
    sentence length
    vocabulary
    rhythm
    metaphor
    humor
    directness
    avoidance habits
    professional register
    cultural register
    emotional leakage

Result layer
------------

    belief delta
    emotion delta
    relationship delta
    power delta
    object delta
    clue delta
    audience-knowledge delta

Response chain
--------------

Every turn should be classified as:
    answer
    evade
    misunderstand
    counterattack
    joke
    silence
    topic shift
    status move
    confession
    threat
Exposition pressure

-------------------

Exposition works better when carried through:
    argument
    joke
    warning
    ritual
    expertise
    interrogation
    seduction
    public performance
    object demonstration
    confession under threat

The StoryMachine dialogue design already requires hidden intent, tactic, mechanism relevance, knowledge legality, voice specificity, subtext, and state change.

Research on subtext indicates that even frontier language models strongly favor overly literal communication and often miss nuanced common-ground constraints. Subtext therefore needs explicit training and evaluation rather than being assumed to emerge automatically. ([arXiv](https://arxiv.org/abs/2604.05273?utm_source=chatgpt.com "Beneath the Surface: Investigating LLMs' Capabilities for Communicating with Subtext"))

* * *

19. Level 17 — Action as dialogue
    =================================

The model must learn that dramatic communication is not limited to spoken lines.

Annotate:
    silence
    hesitation
    gesture
    gaze
    distance
    touch
    refusal
    exit
    object transfer
    object destruction
    physical proof
    ritual action
    failed answer
    change in blocking

For each action beat:
    What line does it replace?
    What does it answer?
    What does the audience infer?
    What state does it change?
    Why is action stronger than explanation?

Action2Dialogue supports the importance of conditioning dialogue on the scene’s action, character behavior, and accumulated narrative history rather than generating isolated utterances. ([arXiv](https://arxiv.org/abs/2505.16819?utm_source=chatgpt.com "Action2Dialogue: Generating Character-Centric Narratives from Scene-Level Prompts"))

* * *

20. Level 18 — Voice distinction
    ================================

For every important character, build a **Voice Grammar**.
    preferred sentence structures
    typical vocabulary
    rhythm
    verbosity
    directness
    metaphor source
    humor mode
    questions versus declarations
    status language
    professional language
    emotional avoidance
    favorite tactics
    speech under stress
    speech when lying
    speech when intimate

Then test:
    Can another character say this line unchanged?

If yes, determine whether:
    the line is deliberately neutral
    or
    the voices are insufficiently distinct.

Do not define voice using only catchphrases or accent. Voice is the character’s worldview operating through language.

* * *

21. Level 19 — Reveal and clue architecture
    ===========================================

For every reveal, extract:
Hidden truth

------------

    What is objectively true?
    Who already knows?
    Who suspects?
    Who misbelieves?
    What does the audience know?

Clue ecology
------------

For every clue:
    carrier
    scene
    visibility
    interpretability
    ambiguity
    memorability
    emotional charge
    true interpretation
    false interpretation
    who notices
    who ignores

Clue carriers:
    object
    line
    gesture
    location
    absence
    behavior
    camera
    sound
    contradiction
Reveal readiness

----------------

    Is there sufficient evidence?
    Has the audience remembered the evidence?
    Is there an emotional consequence?
    Does it alter a relationship?
    Does it alter a theme claim?
    Does it recontextualize prior events?

Reveal effect
-------------

    belief update
    relationship rupture
    power shift
    goal change
    new danger
    moral reclassification
    earlier-scene reinterpretation

Reveal types
------------

    mystery answer
    suspense confirmation
    dramatic-irony collision
    surprise
    recognition
    reversal
    betrayal
    false reveal

* * *

22. Level 20 — Audience-state architecture
    ==========================================

The model must treat the audience as possessing its own changing state.

Track after every major scene or sequence:
    known facts
    suspected facts
    false beliefs
    active questions
    expected outcomes
    feared outcomes
    emotional investment
    trust in narrator
    curiosity
    suspense
    confusion
    cognitive load
Audience asymmetry

------------------

    Audience knows more than character.
    Audience knows less than character.
    Audience knows the character is wrong.
    Audience misinterprets evidence.
    Audience expects one genre move and receives another.

Memory and reinforcement
------------------------

For every important setup or clue:
    first appearance
    salience
    reinforcement
    apparent meaning
    true meaning
    decay risk
    payoff

ConStory-Bench’s five-category, 19-subtype consistency taxonomy and evidence-grounded judgments demonstrate the importance of tracking facts, time, traits, and world rules across long narratives rather than relying on fluent text alone. ([arXiv](https://arxiv.org/abs/2603.05890?utm_source=chatgpt.com "Lost in Stories: Consistency Bugs in Long Story Generation by LLMs"))

* * *

23. Level 21 — Setup and payoff architecture
    ============================================

Create a complete **Setup/Payoff Ledger**.

Setup types:
    skill
    object
    relationship
    promise
    fear
    rule
    lie
    location
    phrase
    image
    sound
    behavior
    weakness
    ritual

For each setup:
    first appearance
    surface purpose
    hidden future purpose
    reinforcement
    transformation
    payoff
    payoff type
    emotional consequence

Payoff types:
    practical
    causal
    emotional
    relationship
    comic
    thematic
    reveal
    visual
    ironic
Payoff quality

--------------

The model should identify whether a payoff is:
    prepared but not obvious
    causally enabled
    character-dependent
    emotionally charged
    meaningfully transformed
Orphan detection

----------------

    setup with no payoff
    payoff with no setup
    setup repeated too heavily
    payoff delayed beyond audience memory

* * *

24. Level 22 — Object-state and motif arcs
    ==========================================

Important objects should be treated as evolving story elements.

For every significant object:
    origin
    ownership
    possession history
    access
    physical state
    story function
    emotional meaning
    symbolic meaning
    who values it
    who misunderstands it
Object meaning arc

------------------

    initial meaning
    useful meaning
    costly meaning
    dangerous meaning
    reinterpreted meaning
    final meaning

Motif systems
-------------

Track:
    images
    songs
    phrases
    colors
    locations
    sounds
    rituals
    gestures
    weather patterns

For each appearance:
    surface use
    emotional charge
    character association
    new meaning
    relationship to earlier appearance
    final payoff

A repeated motif should not merely recur. Its meaning should often accumulate, invert, or deepen.

* * *

25. Level 23 — Theme as argument
    ================================

Do not annotate theme as one slogan.

Use a **Theme Argument Graph**.
Central question

----------------

Example:
    Can talent be legitimate when it comes from an excluded body?
Competing claims

----------------

    claim
    counterclaim
    complication
    undercut
    synthesis

Advocates
---------

    protagonist
    antagonist
    mentor
    family
    institution
    object
    world rule

Evidence
--------

For every theme-related event:
    supports
    attacks
    undercuts
    complicates
    embodies
    resolves
Climax proof

------------

The climax should be analyzed as:
    What moral or thematic claim does the protagonist enact?
    What does the choice cost?
    What alternative claim is rejected?
Ending answer

-------------

    What answer does the ending provide?
    Is the answer complete, tragic, ironic, ambiguous, or provisional?

A strong theme is dramatized through consequences, not merely spoken.

* * *

26. Level 24 — Genre intelligence
    =================================

For each script, extract:
    genre promises
    mandatory pleasures
    expected scene types
    typical clocks
    expected danger
    expected emotional payoff
    expected ending contract

Then identify:
    conventions fulfilled
    conventions delayed
    conventions inverted
    conventions combined
    conventions deliberately rejected
Genre freshness

---------------

The model should distinguish:
    cliché
    archetype
    convention
    innovation
    subversion

A familiar beat can remain excellent if execution, character meaning, or context makes it specific.

* * *

27. Level 25 — Cinematic execution
    ==================================

The model must learn screenplay writing as **filmable dramatic communication**.

Analyze:
    visual causality
    blocking
    movement
    entrances and exits
    object use
    location use
    sound
    silence
    reveals through framing
    physical transformation
    visual contrast
    montage logic
Action-line intelligence

------------------------

Track:
    clarity
    economy
    specificity
    rhythm
    point of attention
    filmability
    emotional implication

The model should distinguish:
    describing what can be filmed
    versus
    explaining invisible psychology.

But it should also understand that carefully used subjective prose may support voice, tone, and reading experience even if not literally filmable.

* * *

28. Level 26 — Pacing and rhythm
    ================================

Pacing is not just scene length.

Analyze:
    rate of new information
    rate of new decisions
    tension rise
    release
    quiet preparation
    reversal density
    scene duration
    sequence duration
    dialogue/action ratio
    question-answer delay
Pacing debts

------------

Track:
    reveal delayed too long
    relationship left static
    mechanism not escalated
    too many similar scenes
    too many unresolved questions
    insufficient recovery after peak intensity
Rhythm patterns

---------------

    fast-fast-slow
    pressure-release-pressure
    public scene-private aftermath
    action-consequence
    reveal-denial-proof

The model should learn variation and purpose, not constant intensity.

* * *

29. Level 27 — Emotional architecture
    =====================================

Track the emotional arc separately from the plot.

For every major scene:
    character emotional state entering
    appraisal of events
    emotion produced
    emotion concealed
    behavioral response
    residue carried forward
Emotional causality

-------------------

Do not label only:
    angry
    sad
    afraid

Record:
    what goal was blocked
    what value was violated
    who was blamed
    what attachment was threatened
    how controllable the situation appears
Emotional progression

---------------------

    anticipation
    hope
    fear
    shame
    anger
    grief
    relief
    recognition
    acceptance

The model should learn that emotion changes because characters interpret events, not because the scene requires an emotional beat.

* * *

30. Level 28 — Tone and tonal control
    =====================================

For every sequence, annotate:
    dominant tone
    secondary tone
    tonal transition
    comic pressure
    horror pressure
    romantic pressure
    dramatic pressure

Identify:
    tonal consistency
    productive tonal contrast
    tonal rupture
    tonal release
    unintentional tonal confusion

The model should learn how different tones can coexist without neutralizing one another.

* * *

31. Level 29 — Distinctive authorial voice
    ==========================================

The model should identify what makes the screenplay feel authored rather than interchangeable.

Analyze:
    worldview
    image selection
    humor
    rhythm
    sentence architecture
    moral perspective
    degree of ambiguity
    character observation
    structural risk
    tonal confidence
    recurring dramatic interests
Voice versus imitation

----------------------

The model should learn:
    functional properties of voice

Not:
    copy this writer’s recognizable phrases.
“Meaning and magic”

-------------------

Some high-level screenplay value cannot be reduced to mechanical correctness.

Record evidence for:
    surprise of perception
    emotional residue
    unusual moral contradiction
    memorable imagery
    specific human observation
    form-content unity
    a choice that feels inevitable only in retrospect

This corresponds to the Academy’s recognition that scripts are judged not only for technical competence but also for distinctive voice, emotional force, thematic purpose, and the special quality that elevates them above the ordinary. ([Oscars](https://www.oscars.org/nicholl/about?utm_source=chatgpt.com "HOW TO APPLY | Oscars.org | Academy of Motion Picture ..."))

* * *

32. Level 30 — Ending intelligence
    ==================================

The ending must be evaluated across several independent systems.
External resolution

-------------------

    Was the external goal achieved, lost, abandoned, or transformed?

Internal resolution
-------------------

    Did the protagonist change behavior?
    Did they reject or reinforce their false belief?

Relationship resolution
-----------------------

    Which relationships survive?
    Which transform?
    Which remain wounded?
    What repair was earned?

Mechanism resolution
--------------------

    How is the story engine resolved, inverted, escaped, accepted, or transformed?

Theme resolution
----------------

    What claim does the ending enact?
    What contradiction remains?

Genre resolution
----------------

    Was the genre contract fulfilled?
    Was its violation intentional and rewarding?

Motif and object resolution
---------------------------

    What receives final meaning?

Audience aftertaste
-------------------

    relief
    triumph
    grief
    unease
    ambiguity
    wonder
    moral discomfort
    comic release

Irreversibility
---------------

A strong ending frequently makes returning to the opening state impossible.

* * *

33. Hard legality versus soft excellence
    ========================================

Do not train one undifferentiated `quality_score`.
Hard validity checks

--------------------

    temporal consistency
    factual consistency
    world-rule consistency
    object continuity
    location/access legality
    knowledge legality
    causal preconditions
    character intentionality
    setup/payoff dependency

A hard failure may invalidate an otherwise beautiful scene.
Soft excellence dimensions

--------------------------

    originality
    emotional impact
    voice
    elegance
    pacing
    tension
    subtext
    cinematic force
    theme depth
    memorability
    genre freshness

Soft dimensions should produce:
    scores
    warnings
    comparisons
    repair suggestions

They should not automatically declare one universal answer.

Your project correctly distinguishes hard validators that block illegal transitions from soft diagnostics that rank, warn, or request repair.

* * *

34. Every annotation must contain proof
    =======================================

No annotation should be accepted as:
    “The dialogue is good.”
    “The character is compelling.”
    “The midpoint works.”
    “The ending is emotional.”

Every finding needs:
    label
    evidence
    interpretation
    effect
    confidence
    alternative interpretation

Example:
    {
      "label": "relationship_power_shift",
      "scene_id": "S41",
      "evidence": [
        "Nora refuses to answer",
        "Leo produces the receipt",
        "Nora leaves without taking the family keys"
      ],
      "interpretation": "Leo gains factual leverage while Nora preserves emotional control by ending the exchange.",
      "effect": {
        "trust": -0.4,
        "public_power": "Leo",
        "private_power": "Nora",
        "future_obligation": "Leo must decide whether to expose her"
      },
      "confidence": 0.91,
      "alternative_interpretation": "Nora's exit may also indicate strategic retreat rather than loss."
    }

* * *

35. Counterfactual proof: what would break?
    ===========================================

For every significant scene, event, line, reveal, or object, ask:
    What breaks if it is removed?
    What weakens if it is moved?
    What changes if it occurs earlier?
    What changes if another character performs it?
    What if the character chooses the obvious alternative?
    What if the truth is spoken directly?
    What if the object is absent?
    What if the reveal has no emotional consequence?
Dependency classes

------------------

    causal dependency
    motivational dependency
    knowledge dependency
    relationship dependency
    theme dependency
    genre dependency
    audience-memory dependency

Essentiality rating
-------------------

    structurally essential
    emotionally essential
    thematically essential
    replaceable with equivalent function
    decorative but valuable
    redundant

This teaches the model to understand **function**, not just presence.

* * *

36. Controlled weak versions
    ============================

For each important high-quality example, create carefully degraded variants.
Premise degradation

-------------------

    remove contradiction
    make stakes generic
    remove engine
    make conflict externally imposed without character relevance

Character degradation
---------------------

    remove motive
    remove agency
    remove vulnerability
    make transformation unearned

Structure degradation
---------------------

    remove midpoint consequence
    repeat escalation
    resolve conflict through coincidence
    move reveal too early

Scene degradation
-----------------

    remove objective
    remove obstacle
    remove turn
    remove state change
    enter too early
    leave too late

Dialogue degradation
--------------------

    state subtext explicitly
    flatten voices
    repeat known information
    leak impossible knowledge
    make every turn answer directly

Reveal degradation
------------------

    remove clues
    remove recontextualization
    remove emotional consequence

Relationship degradation
------------------------

    repair without cost
    betray without prior trust
    create intimacy without vulnerability

These become:
    chosen
    versus
    rejected

Story preference research demonstrates that modeling narrative preference is difficult: StoryRMB contains 1,133 human-verified cases, and previously evaluated reward models reached only 66.3% at best. Its companion training corpus uses roughly 100,000 preference pairs, reinforcing the value of contrastive chosen/rejected examples rather than relying only on positive prose. ([arXiv](https://arxiv.org/abs/2605.04831?utm_source=chatgpt.com "StoryAlign: Evaluating and Training Reward Models for Story Generation"))

* * *

37. Deliberate rule-breaking layer
    ==================================

The model must learn **why an exception works**.

For every apparent rule violation, annotate:
    rule or convention being violated
    whether the violation is intentional
    what compensates for it
    what audience effect it creates
    what cost it introduces
    whether it succeeds

Examples:
    Passive protagonist:
    works because the story studies institutional entrapment
    and the eventual act of agency becomes the climax.
    Minimal dialogue:
    works because blocking, sound, and object behavior carry information.
    Abrupt ending:
    works because incompletion creates the intended moral aftertaste.

    Repetitive scenes:
    work because each repetition changes status and increases dread.

    Direct confession:
    works because the climax requires the character to stop hiding.

Without this layer, the model will become formulaic and “repair” the most distinctive parts of high-end scripts.

* * *

38. Cross-script comparative learning
    =====================================

After individual annotation, compare scripts within the same target lane.

The model should learn:
    Which principles recur?
    Which implementations differ?
    Which elements are genre-specific?
    Which are author-specific?
    Which are universal hard constraints?
    Which are optional craft strategies?

Build comparative records:
    {
      "shared_function": "protagonist publicly accepts forbidden identity",
      "script_A_method": "direct declaration before institution",
      "script_B_method": "physical action witnessed by family",
      "script_C_method": "refusal to continue role performance",
      "invariant": "private identity becomes irreversible public action",
      "variable_elements": [
        "dialogue amount",
        "setting",
        "witnesses",
        "genre tone"
      ]
    }

This is how the model learns reusable craft without copying plots.

* * *

39. The required artifact bundle for every screenplay
    =====================================================

Every screenplay should produce the following package:
    1. Script Intent Profile
    2. Premise and Story-Engine Report
    3. Genre Contract
    4. World and Rule Bible
    5. Fabula Event Graph
    6. Syuzhet / Reveal-Order Map
    7. Causal Dependency Graph
    8. Protagonist Architecture
    9. Opposition Architecture
    10. Supporting-Character Function Map
    11. Character Intention Chains
    12. Relationship Graph and Arc Ledger
    13. Act / Sequence Architecture
    14. Subplot Map
    15. Scene Function Ledger
    16. Beat and Tactic Records
    17. Dialogue / Action Function Corpus
    18. Character Voice Grammars
    19. Reveal and Clue Ecology
    20. Audience-State Curve
    21. Setup / Payoff Ledger
    22. Object and Motif Arcs
    23. Theme Argument Graph
    24. Emotional Arc
    25. Tone and Pacing Map
    26. Cinematic Execution Report
    27. Ending Proof
    28. Evidence-Backed Quality Report
    29. Counterfactual Dependency Tests
    30. Controlled Weak Alternatives
    31. Chosen / Rejected Preference Pairs
    32. Source-Neutral Synthetic Equivalents

* * *

40. The core screenplay annotation schema
    =========================================
    
    interface ScreenplayLearningPackage {
      scriptProfile: ScriptIntentProfile;
      premise: PremiseAnalysis;
      storyEngine: NarrativeMechanism;
      genreContract: GenreContract;
      worldRules: WorldRule[];
      fabulaGraph: EventGraph;
      syuzhetMap: SyuzhetMap;
      causalGraph: CausalGraph;
      characters: CharacterArchitecture[];
      relationships: RelationshipArc[];
      intentionChains: IntentionChain[];
      sequences: SequenceRecord[];
      scenes: SceneLearningRecord[];
      subplots: SubplotRecord[];
      dialogue: DialogueAtom[];
      voiceGrammars: CharacterVoiceGrammar[];
      reveals: RevealPlan[];
      clues: ClueRecord[];
      audienceCurve: AudienceStateSnapshot[];
      setupsPayoffs: SetupPayoffLink[];
      objectArcs: ObjectMeaningArc[];
      motifArcs: MotifMeaningArc[];
      themeGraph: ThemeArgumentGraph;
      emotionalArc: EmotionalArc;
      pacingMap: PacingMap;
      toneMap: ToneMap;
      endingProof: EndingProof;
      qualityFindings: EvidenceBackedFinding[];
      counterfactuals: CounterfactualTest[];
      preferencePairs: PreferencePair[];
      syntheticEquivalents: SyntheticEquivalent[];
    }

* * *

41. Required scene record
    =========================
    
    interface SceneLearningRecord {
      sceneId: string;
      context: {
    
        storyPhase: string;
        sequenceId: string;
        pointOfView: string;
        activeMechanisms: string[];
    
      };
      beforeState: {
    
        facts: string[];
        beliefs: Record<string, string[]>;
        goals: Record<string, string[]>;
        relationships: string[];
        objects: string[];
        audienceKnowledge: string[];
    
      };
      design: {
    
        sceneFunctions: string[];
        dramaticQuestion: string;
        objectives: Record<string, string>;
        obstacles: string[];
        stakes: string[];
        entryCondition: string;
        exitCondition: string;
    
      };
      beats: BeatRecord[];
      afterState: {
    
        factDeltas: string[];
        beliefDeltas: string[];
        emotionDeltas: string[];
        relationshipDeltas: string[];
        powerDeltas: string[];
        objectDeltas: string[];
        clueDeltas: string[];
        audienceDeltas: string[];
        mechanismDeltas: string[];
        themeDeltas: string[];
    
      };
      dependencies: {
    
        requiredPreviousEvents: string[];
        enabledFutureEvents: string[];
        setups: string[];
        payoffs: string[];
    
      };
      qualityProof: {
    
        strengths: EvidenceBackedFinding[];
        risks: EvidenceBackedFinding[];
        counterfactuals: CounterfactualTest[];
    
      };
    }

* * *

42. Required dialogue record
    ============================
    
    interface DialogueAtom {
      sceneId: string;
      speaker: string;
      listener: string[];
      surfaceFunction:
    
        | "question"
        | "answer"
        | "command"
        | "joke"
        | "threat"
        | "confession"
        | "reframe"
        | "evasion"
        | "bargain"
        | "failed_answer"
        | "status_move";
    
      literalMeaning: string;
      hiddenIntent: string;
      tactic: string;
      knowledgeState: {
    
        speakerKnows: string[];
        listenerKnows: string[];
        commonGround: string[];
        forbiddenDisclosure: string[];
    
      };
      relationshipPressure: string;
      activeMechanism: string;
      voiceFeatures: string[];
      subtextGap: string;
      responseToPriorTurn:
    
        | "answer"
        | "evade"
        | "counterattack"
        | "misunderstand"
        | "joke"
        | "silence"
        | "topic_shift"
        | "confession"
        | "threat";
    
      stateDeltas: {
    
        belief?: string;
        emotion?: string;
        relationship?: string;
        power?: string;
        object?: string;
        clue?: string;
        audienceKnowledge?: string;
    
      };
      actionAlternative?: string;
    }

* * *

43. Convert each script into multiple training tasks
    ====================================================

The final corpus should not be one task called “write screenplay.”

Every screenplay should produce:
Analysis tasks

--------------

    identify story engine
    identify scene function
    identify character objective
    identify hidden intent
    identify setup/payoff
    identify reveal mode

Extraction tasks
----------------

    screenplay → event graph
    screenplay → character state
    screenplay → relationship graph
    screenplay → audience knowledge map

Planning tasks
--------------

    before state + required after state
    → scene plan
    
    theme pressure + character goal
    → sequence plan
    
    setup + intended payoff
    → causal bridge

Ranking tasks
-------------

    compare two scenes
    compare two dialogue exchanges
    compare two climax plans
    select stronger version and explain why

Repair tasks
------------

    repair knowledge leak
    repair unearned reveal
    repair generic dialogue
    repair weak motive
    repair cost-free relationship reconciliation

Counterfactual tasks
--------------------

    remove scene
    move reveal
    change character choice
    transfer action to another character
    predict downstream consequences

Generation tasks
----------------

    validated scene plan
    → original screenplay scene

Proof tasks
-----------

    generated scene
    → before/after state proof
    → continuity violations
    → future dependencies

* * *

44. Annotation acceptance standard
    ==================================

An annotation is accepted only when it has:
    correct script context
    correct structural level
    explicit label
    source evidence
    functional explanation
    downstream effect
    confidence
    alternative interpretation where appropriate
    genre and intent conditioning

Reject annotations that are:
    unsupported opinions
    generic praise
    plot summary presented as analysis
    labels without evidence
    mechanical rule enforcement without context
    invented character psychology unsupported by the script

* * *

45. What the trained model should be able to do
    ===============================================

After learning from a screenplay, the model should be able to answer:
    What is this film promising?
    What is the engine that keeps creating dramatic material?
    Why is this protagonist the correct protagonist?

    Why does each major character act?

    What causes each major event?

    Why is the information revealed in this order?

    What does every sequence change?

    What work does every major scene perform?

    How do relationships create pressure?

    How does dialogue operate rather than merely communicate?

    What does the audience know at each point?

    How are setups transformed into payoffs?

    How do objects and motifs gain meaning?

    How is theme argued through consequences?

    What does the climax prove?

    Why does the ending feel earned?

    Which choices are essential?

    Which are replaceable by functionally equivalent choices?

    Which conventions are deliberately violated?

    What would make the screenplay weaker, generic, incoherent, or emotionally false?

    How can the same underlying craft principle be used in a completely original screenplay?

* * *

Final GODMODE training law
==========================

    Do not teach the model that a good screenplay is a collection of good lines.
    
    Teach it that a good screenplay is a coordinated system of:
    
    authorial intent
    + story promise
    + generative mechanism
    + world rules
    + character intention
    + causal consequence
    + relationship pressure
    + epistemic asymmetry
    + audience management
    + scene-level state change
    + dialogue tactics
    + cinematic behavior
    + setup and payoff
    + motif transformation
    + thematic argument
    + genre fulfillment
    + distinctive voice
    + earned ending.

And every claim about quality must be connected to:
    specific evidence
    + dramatic function
    + before/after change
    + downstream consequence
    + counterfactual proof
    + genre and authorial context.

The finished training unit is not:
    screenplay → “good”

It is:
    screenplay
    → complete dramatic model
    → evidence-backed craft explanation
    → causal and epistemic graph
    → scene and dialogue functions
    → quality dimensions
    → controlled weak alternatives
    → preference pairs
    → repair tasks
    → counterfactual tests
    → original synthetic equivalents.

================================================================
===

StoryMachine Maximal Screenplay Annotation Standard
===================================================

I reviewed the available StoryMachine project conversations, the uploaded master plans, and current screenplay/narrative research. The project’s recurring conclusion is correct:
    Do not reduce a finished screenplay to:
    screenplay text → “good”

    Convert it into:
    screenplay
    → structured narrative world
    → dramatic-function annotations
    → evidence-backed quality model
    → contrastive and counterfactual training data

The existing project documents already define the core derived datasets: mechanism-labeled scenes, dialogue functions, relationship rupture/repair, reveal/clue systems, object-state arcs, theme arguments, counterfactual branches, bad-line repair, genericness contrasts, and symbolic benchmarks.

Current research reinforces that direction:

* STAGE models each screenplay as a coherent narrative world with cleaned text, scene-level events, entities, relations, character annotations, knowledge graphs, screenplay QA, and character-consistent role-playing. ([arXiv](https://arxiv.org/html/2601.08510v1 "https://arxiv.org/html/2601.08510v1"))

* FactTrack shows that story facts should be atomic and time-bounded, so legitimate changes are not confused with contradictions. ([ACL Anthology](https://aclanthology.org/2025.naacl-long.144/ "https://aclanthology.org/2025.naacl-long.144/"))

* PLOTTER plans through event and character graphs before rendering text. ([arXiv](https://arxiv.org/html/2604.21253v1 "https://arxiv.org/html/2604.21253v1"))

* CHIRON shows that structured character sheets outperform short character summaries for character understanding. ([ACL Anthology](https://aclanthology.org/2024.findings-emnlp.499/ "https://aclanthology.org/2024.findings-emnlp.499/"))

* ConStory-Bench demonstrates that long narratives need explicit factual, temporal, character, world-rule, and style consistency annotations grounded in quoted evidence. ([arXiv](https://arxiv.org/html/2603.05890v1 "https://arxiv.org/html/2603.05890v1"))

* DramaBench separates script quality into independent dimensions rather than treating quality as one opaque score. ([arXiv](https://arxiv.org/abs/2512.19012 "https://arxiv.org/abs/2512.19012"))

* StoryAlign shows that learning human story preferences is difficult even with chosen/rejected examples, which makes carefully constructed preference data essential. ([arXiv](https://arxiv.org/abs/2605.04831 "https://arxiv.org/abs/2605.04831"))

No single published annotation standard covers everything StoryMachine needs. The strongest solution is the following synthesis.

* * *

1. The fundamental annotation law
   =================================

Every important annotation must answer six questions:
    1. What is present in the screenplay?
    2. Where is the evidence?
    3. What dramatic function does it perform?
    4. What state changes because of it?
    5. What later material depends on it?
    6. What becomes weaker or invalid if it changes?

The highest-quality training unit is therefore:
    source evidence
    + structural label
    + dramatic function
    + before/after state
    + downstream dependency
    + quality interpretation
    + confidence
    + counterfactual comparison

Your project’s dialogue standard already expresses the atomic version of this:
    line
    → tactic
    → hidden intent
    → mechanism operated
    → state delta
    → voice features
    → synthetic equivalent

* * *

2. Separate five kinds of annotation
   ====================================

Do not mix fact and interpretation in the same field.
2.1 Explicit annotations
------------------------

Directly visible in the screenplay:
    scene heading
    speaker
    spoken line
    physical action
    object possession
    location
    character entrance
    stated fact
    explicit goal
2.2 Derived structural annotations
----------------------------------

Reliably computed from explicit evidence:
    scene boundaries
    reply-to relation
    chronological event order
    object transfer
    character presence
    conversation thread
    setup/payoff link
2.3 Interpretive craft annotations
----------------------------------

Plausible dramatic interpretation:
    hidden intent
    subtext
    theme role
    character wound
    scene function
    motif meaning
    relationship pressure
2.4 Evaluative annotations
--------------------------

Judgments of execution:
    strong causal setup
    generic dialogue
    unearned repair
    effective reversal
    weak escalation
    distinctive voice
2.5 Counterfactual annotations
------------------------------

Reasoning about alternatives:
    what breaks if scene is removed
    what changes if reveal happens earlier
    what becomes generic if subtext is made explicit
    whether another character could perform the action

Every record must contain an `annotation_mode`. This prevents the model from treating an inferred wound or theme as if the script literally stated it.

* * *

3. Use one universal evidence-linked annotation object
   ======================================================

Every annotation—whether a fact, scene function, hidden intent, quality judgment, or preference—should use a common envelope.
    interface AnnotationAtom<T = unknown> {
      annotationId: string;

      scriptId: string;
      scriptVersionId: string;

      unit: {
        type:
          | "script"
          | "act"
          | "sequence"
          | "scene"
          | "beat"
          | "action_block"
          | "dialogue_exchange"
          | "dialogue_turn"
          | "line"
          | "event"
          | "character"
          | "relationship"
          | "object"
          | "motif"
          | "reveal"
          | "setup_payoff";
        id: string;
      };

      ontologyPath: string;
      value: T;

      annotationMode:
        | "explicit"
        | "derived"
        | "interpretive"
        | "evaluative"
        | "counterfactual";

      evidence: {
        sceneId?: string;
        pageStart?: number;
        pageEnd?: number;
        screenplayElementIds: string[];
        characterStart?: number;
        characterEnd?: number;
        textHash?: string;
      }[];

      explanation: string;

      confidence: number;
      alternativeInterpretations?: string[];

      provenance: {
        annotatorType: "human" | "model" | "rule" | "hybrid";
        annotatorId: string;
        modelVersion?: string;
        rubricVersion: string;
        createdAt: string;
      };

      review: {
        status:
          | "unreviewed"
          | "single_reviewed"
          | "double_reviewed"
          | "adjudicated"
          | "rejected";
        reviewerIds: string[];
        adjudicationNote?: string;
      };

      trainingUse: {
        allowed: boolean;
        taskTypes: string[];
        split: "train" | "validation" | "sealed_test";
      };
    }

This gives you:

* exact evidence;

* confidence;

* provenance;

* human-review status;

* uncertainty;

* stable training/evaluation separation.

ConStory-Checker uses a related evidence-grounded principle: each contradiction record contains reasoning, exact quoted evidence and positions, a conclusion, and structured JSON output. ([arXiv](https://arxiv.org/html/2603.05890v1 "https://arxiv.org/html/2603.05890v1")) STAGE likewise leaves fields unspecified rather than inventing unsupported participants, locations, or details. ([arXiv](https://arxiv.org/html/2601.08510v1 "https://arxiv.org/html/2601.08510v1"))

* * *

4. Layer A — Source, document, and screenplay structure
   =======================================================

Every screenplay first needs a technically exact representation.
4.1 Source identity
-------------------

Annotate:
    title
    script ID
    writer
    draft date
    draft type
    revision
    production draft/spec/shooting draft
    format
    language
    source
    rights and permitted uses
    duplicate family
    adaptation/franchise family
4.2 Screenplay abstract syntax tree
-----------------------------------

Give every element a stable ID:
    title page
    scene heading
    action block
    character cue
    parenthetical
    dialogue block
    dual dialogue
    transition
    shot
    montage
    intercut
    lyric
    note
    page break

Example:
    {
      "element_id": "SCR014_SC032_EL019",
      "type": "dialogue",
      "speaker_id": "CHAR_NORA",
      "scene_id": "SC032",
      "page": 47,
      "text": "She needed me."
    }
4.3 Stable structural IDs
-------------------------

Every downstream annotation must point to:
    script ID
    act ID
    sequence ID
    scene ID
    beat ID
    event ID
    line/turn ID
    character ID
    object ID
    relationship ID

STAGE’s pipeline relies on screenplay segmentation, canonical entities, scene-grounded events, and shared identifiers so the structured annotations remain aligned with the original text. ([arXiv](https://arxiv.org/html/2601.08510v1 "https://arxiv.org/html/2601.08510v1"))

* * *

5. Layer B — Script intent and target experience
   ================================================

Annotate the screenplay according to what it is trying to accomplish—not against one universal screenplay formula.
5.1 Script profile
------------------

    format
    genre
    subgenre
    tone
    audience
    rating
    period
    setting
    production scale
    ambiguity target
    dialogue register
    visual density

5.2 Audience promise
--------------------

Annotate:
    What experience is promised?
    What should the audience want?
    What should they fear?
    What should they laugh at?
    What should they discover?
    What emotional aftertaste is intended?
5.3 Genre contract
------------------

    genre pleasures promised
    conventions fulfilled
    conventions delayed
    conventions combined
    conventions inverted
    ending expectations
    deliberate genre violations

5.4 Authorial risk profile
--------------------------

Record unusual choices that must not be automatically “repaired”:
    passive or observational protagonist
    minimal dialogue
    delayed protagonist explanation
    abrupt ending
    episodic structure
    tonal collision
    nonlinear chronology
    intentional ambiguity

Quality must always be conditioned on:
    format
    + genre
    + tone
    + intended audience effect
    + authorial strategy

* * *

6. Layer C — Premise and story mechanism
   ========================================

6.1 Premise anatomy
-------------------

Annotate:
    protagonist
    goal/problem
    opposing force
    central complication
    stakes
    world
    ironic contradiction
    dramatic question
6.2 Premise qualities
---------------------

Score separately:
    specificity
    novelty
    cinematic potential
    conflict potential
    emotional potential
    choice pressure
    escalation capacity
    genre promise
    thematic potential
6.3 Story mechanism
-------------------

Identify the mechanism that keeps generating dramatic material.

Examples:
    object burden
    legitimacy split
    relationship externalization
    ritual law
    clue cascade
    identity performance
    canon rebellion
    predatory wish trap
    false purpose
    family law
    institutional gatekeeping
    emotion governance
    survival clock
6.4 Mechanism lifecycle
-----------------------

    seeded
    activated
    initially helpful
    increasingly costly
    dangerous
    crisis
    transformed
    resolved

6.5 Mechanism rules
-------------------

    governing rule
    carrier: object/body/ritual/institution/identity/ability
    beneficiary
    victim
    cost
    loophole
    escalation path
    climax proof
    ending proof

The StoryMachine plans already define the mechanism-oriented dataset as a core training asset rather than treating screenplay learning as next-line prediction.

* * *

7. Layer D — Narrative world model
   ==================================

7.1 Canonical entities
----------------------

Annotate:
    characters
    groups
    institutions
    locations
    objects
    documents
    vehicles
    abilities
    rituals
    world rules
    abstract concepts

For every entity:
    canonical name
    aliases
    type
    first appearance
    last appearance
    description
    source scenes
7.2 World rules
---------------

For every major rule:
    what is allowed
    what is forbidden
    who enforces it
    who benefits
    who suffers
    violation cost
    exceptions
    loopholes
    whether the rule changes
7.3 Institutions and hierarchies
--------------------------------

    institution
    roles
    status hierarchy
    gatekeepers
    allowed speakers
    forbidden claims
    public authority
    private authority
    incentives
    hypocrisies

7.4 Resources
-------------

Classify narrative resources as:
    consumable
    transferable
    copyable
    persistent
    depleting
    accumulating
    positive-sum
    negative-sum

Examples:
    last antidote → consumable
    inheritance → transferable
    secret knowledge → copyable
    countdown → depleting
    guilt or obligation → accumulating

* * *

8. Layer E — Atomic facts and temporal state
   ============================================

Every meaningful fact should have a validity interval.
    interface AtomicStoryFact {
      factId: string;
      subjectId: string;
      predicate: string;
      object: string | number | boolean;

      layer:
        | "objective_truth"
        | "character_belief"
        | "audience_belief"
        | "rumor"
        | "lie"
        | "memory"
        | "prediction"
        | "author_intent";

      validFromEventId: string;
      validUntilEventId?: string;

      sourceEventId: string;
      evidenceRefs: string[];
      confidence: number;
    }

Annotate facts concerning:
    identity
    age
    appearance
    health
    skills
    ownership
    object condition
    location
    relationships
    affiliations
    history
    knowledge
    commitments
    world rules

FactTrack’s four-stage model—atomic decomposition, validity intervals, contradiction detection, and world-state update—is directly applicable here. ([ACL Anthology](https://aclanthology.org/2025.naacl-long.144/ "https://aclanthology.org/2025.naacl-long.144/"))

Create a state checkpoint after every scene:
    objective facts
    character locations
    object locations
    object ownership
    active injuries
    active goals
    active clocks
    belief states
    relationship states
    audience knowledge
    open setups
    open questions

* * *

9. Layer F — Events, causality, fabula, and syuzhet
   ===================================================

9.1 Event frames
----------------

For every narratively significant event:
    event ID
    scene
    fabula position
    syuzhet position
    actor
    target
    participants
    witnesses
    location
    time
    preconditions
    trigger
    action
    effects
    causal parents
    causal children
    character goals served
    character goals blocked
    reader effect
9.2 Event relation types
------------------------

    causes
    enables
    prevents
    motivates
    foreshadows
    reveals
    recontextualizes
    contrasts
    mirrors
    escalates
    pays off

9.3 Causal dimensions
---------------------

    physical
    social
    emotional
    epistemic
    institutional
    ritual
    motivational
    thematic

9.4 Fabula map
--------------

Chronological world order:
    what actually happened
    when it happened
    who caused it
    what changed
9.5 Syuzhet map
---------------

Audience presentation order:
    what is shown
    what is withheld
    flashbacks
    flashforwards
    parallel action
    misdirection
    delayed explanation
    reveal order
    point-of-view restriction

PLOTTER’s event and character graphs support this approach: it explicitly refines causal structure and character relationships before textual realization. ([arXiv](https://arxiv.org/html/2604.21253v1 "https://arxiv.org/html/2604.21253v1"))

* * *

10. Layer G — Character architecture
    ====================================

Use CHIRON’s broad categories—Dialogue, Physical/Personality, Knowledge, and Goals—as a baseline, then add StoryMachine’s dramatic fields. ([arXiv](https://arxiv.org/html/2406.10190v3 "https://arxiv.org/html/2406.10190v3"))

For every principal and supporting character, annotate:
10.1 Explicit identity
----------------------

    role
    age
    occupation
    affiliation
    appearance
    physical condition
    social position

10.2 Existential design
-----------------------

    wound
    need
    desire
    fear
    shame trigger
    false belief
    value system
    moral boundary
    identity conflict

10.3 Public and private selves
------------------------------

    public mask
    performed identity
    private desire
    concealed truth
    self-deception

10.4 Goals
----------

    long-term goal
    current sequence goal
    current scene objective
    fallback objective
    escalation condition
    goal revisions
    completed goals
    abandoned goals

10.5 Abilities and limitations
------------------------------

    skills
    resources
    access
    blind spots
    dependencies
    physical limitations
    social limitations

10.6 Character arc timeline
---------------------------

At every durable change:
    goal revision
    belief revision
    status shift
    relationship shift
    moral crossing
    setback
    breakthrough
    identity change
10.7 Evidence discipline
------------------------

Each character trait must include:
    supporting scene
    supporting action or line
    whether repeated
    whether contradicted
    confidence

STAGE’s character pipeline explicitly separates observed character evidence from abstracted persona attributes and prohibits unsupported invention. ([arXiv](https://arxiv.org/html/2601.08510v1 "https://arxiv.org/html/2601.08510v1"))

* * *

11. Layer H — Character intentionality chains
    =============================================

For every important character action:
    perceived situation
    current belief
    goal
    fear
    available alternatives
    chosen tactic
    expected outcome
    actual outcome
    belief update
    next intention

Example:
    {
      "character": "Leo",
      "belief": "Nora is hiding where she went.",
      "goal": "Test her alibi without exposing the receipt.",
      "fear": "Direct confrontation will make her destroy evidence.",
      "available_moves": [
        "confront directly",
        "pretend ignorance",
        "ask about timing",
        "search the car"
      ],
      "chosen_tactic": "ask casually about timing",
      "expected_outcome": "Nora contradicts herself",
      "actual_outcome": "Nora recognizes the test and ends the exchange",
      "next_intention": "search the car"
    }

This is essential for distinguishing character-driven events from puppet-plot behavior.

* * *

12. Layer I — Beliefs, knowledge, secrets, and deception
    ========================================================

For every important proposition, annotate separately:
    objective truth
    who knows it
    who suspects it
    who misbelieves it
    who denies it
    who conceals it
    who pretends not to know it
    what the audience knows
12.1 Belief record
------------------

    interface BeliefRecord {
      holderId: string;
      propositionId: string;
    
      status:
        | "unknown"
        | "suspected"
        | "believed"
        | "known"
        | "misbelieved"
        | "denied"
        | "concealed"
        | "pretended";
    
      confidence: number;
      sourceEventId?: string;
      sourceReliability?: number;
      validFromEventId: string;
      validUntilEventId?: string;
    }

12.2 Nested beliefs
-------------------

Annotate only dramatically relevant levels:
    A believes X.
    A believes B knows X.
    A believes B falsely believes Y.

Cap routine nested-belief annotation at depth two or three.
12.3 Secret and deception threads
---------------------------------

    hidden fact
    keeper
    target of deception
    lie told
    false belief created
    maintenance actions
    exposure risk
    reveal event
    consequences

The project’s proof model explicitly separates objective truth, character belief, audience knowledge, and author intention.

* * *

13. Layer J — Emotional appraisal and arc
    =========================================

Do not annotate only emotion names.

For every major emotional change:
    perceived event
    goal affected
    value violated
    agency attributed
    attachment threat
    status threat
    identity threat
    controllability
    expectedness
    resulting emotion
    concealed emotion
    behavioral tendency
    residue carried forward

Example:
    Nora is not simply “angry.”

    She interprets Leo’s question as:
    - a threat to her concealment goal,
    - evidence that he distrusts her,
    - a challenge to her family role,
    - partly controllable through withdrawal.

    Result:
    anger + shame + strategic retreat.

Track:
    entering emotion
    peak emotion
    suppressed emotion
    expressed emotion
    leaving emotion
    emotional residue

DramaBench treats emotional depth as distinct from character consistency, logic, conflict, format, and narrative efficiency, supporting separate emotional annotations rather than one aggregate score. ([arXiv](https://arxiv.org/abs/2512.19012 "https://arxiv.org/abs/2512.19012"))

* * *

14. Layer K — Relationship architecture
    =======================================

For every important relationship:
14.1 Affect
-----------

    trust
    love
    intimacy
    admiration
    resentment
    envy
    fear
    contempt
    guilt
    obligation
    dependency

14.2 Dialectics
---------------

    connection versus autonomy
    openness versus secrecy
    protection versus control
    duty versus freedom
    dependence versus agency
    admiration versus envy
    loyalty versus truth

14.3 Power
----------

    public power
    private power
    leverage
    status
    knowledge advantage
    resource advantage
    volatility

14.4 Shared structures
----------------------

    shared history
    shared object
    shared ritual
    shared secret
    shared wound
    unresolved debt

14.5 Relationship events
------------------------

    bond
    test
    boundary violation
    concealment
    betrayal
    rupture
    failed repair
    repair opportunity
    sacrifice
    recognition
    separation

14.6 Repair proof
-----------------

A major repair record should contain:
    harm acknowledged
    truth disclosed
    cost paid
    behavior changed
    evidence visible to harmed person
    remaining debt

* * *

15. Layer L — Character voice grammar
    =====================================

For every major character:
    sentence shape
    sentence length
    vocabulary
    rhythm
    verbosity
    directness
    question/declaration ratio
    metaphor source
    humor mode
    professional register
    social register
    avoidance pattern
    favorite tactics
    speech under pressure
    speech while lying
    speech during intimacy
    emotional leakage

Add a voice-swap test:
    Could another principal character say this line unchanged?

Store:
    voice-specific
    deliberately neutral
    generic
    shared institutional register
    shared family register

Do not reduce voice to catchphrases, dialect, or accent.

* * *

16. Layer M — Structural architecture
    =====================================

16.1 Actual structure
---------------------

Annotate the structure the screenplay uses rather than forcing one formula:
    opening state
    inciting pressure
    commitment
    threshold
    major reversals
    midpoint transformation
    crisis
    climax
    resolution
    final image/aftertaste
16.2 Turning-point function
---------------------------

For every major turn:
    what changes
    who causes it
    what expectation reverses
    what becomes impossible
    what new question replaces the old
    what cost rises

TRIPOD demonstrates one useful precedent for screenplay turning-point annotation across complete films and scene structures. ([arXiv](https://arxiv.org/pdf/1908.10328 "https://arxiv.org/pdf/1908.10328"))
16.3 Plot nuclei
----------------

Mark events as:
    structurally indispensable
    character-arc indispensable
    replaceable by equivalent function
    supporting satellite
    atmospheric but valuable
    redundant
16.4 Separate movement tracks
-----------------------------

Track:
    plot movement
    character movement
    relationship movement
    knowledge movement
    mechanism movement
    theme movement
    audience movement

* * *

17. Layer N — Sequence architecture
    ===================================

For every sequence:
    sequence objective
    dominant point of view
    starting state
    central question
    active opposition
    mechanism stage
    escalation pattern
    information gained
    relationship movement
    turning point
    ending state
    future obligation created

Classify escalation:
    greater danger
    less time
    less privacy
    higher moral cost
    greater public exposure
    stronger opposition
    reduced options
    more damaging knowledge
    greater relationship debt

Annotate sequence dependencies:
    required predecessor
    future sequence enabled
    setup carried
    payoff delivered
    can be removed?
    can be combined?

* * *

18. Layer O — Subplots
    ======================

For every subplot:
    subplot protagonist
    goal
    conflict
    entry point
    escalation
    intersection with main plot
    theme relationship
    payoff
    resolution

Classify function:
    mirror
    counterexample
    complication
    relationship arc
    theme counterargument
    resource source
    comic contrast
    world expansion
    pressure amplifier

Test:
    Does it change the main plot?
    Does it deepen a character?
    Does it provide thematic evidence?
    Does it create a later payoff?
    Does it merely consume pages?

* * *

19. Layer P — Scene function and state transition
    =================================================

Every scene gets a complete record.
    interface SceneAnnotation {
      sceneId: string;

      context: {
        actId?: string;
        sequenceId: string;
        storyPhase: string;
        pointOfView?: string;
        activeMechanisms: string[];
      };

      beforeState: {
        facts: string[];
        locations: Record<string, string>;
        characterGoals: Record<string, string[]>;
        characterBeliefs: Record<string, string[]>;
        characterEmotions: Record<string, string[]>;
        relationships: string[];
        powerStates: string[];
        objectStates: string[];
        audienceKnowledge: string[];
        openQuestions: string[];
      };

      design: {
        sceneFunctions: string[];
        dramaticQuestion: string;
        objectives: Record<string, string>;
        obstacles: string[];
        stakes: string[];
        entryCondition: string;
        exitCondition: string;
        activeConflict: string;
        genrePleasure?: string;
        themeRole?: string;
      };

      beats: string[];

      afterState: {
        factDeltas: string[];
        goalDeltas: string[];
        beliefDeltas: string[];
        emotionDeltas: string[];
        relationshipDeltas: string[];
        powerDeltas: string[];
        objectDeltas: string[];
        clueDeltas: string[];
        audienceDeltas: string[];
        mechanismDeltas: string[];
        themeDeltas: string[];
      };

      dependencies: {
        requiredPreviousEvents: string[];
        enabledFutureEvents: string[];
        setups: string[];
        payoffs: string[];
      };

      quality: {
        strengths: string[];
        risks: string[];
        essentiality: string;
        counterfactuals: string[];
      };
    }
Scene-function vocabulary
-------------------------

    setup
    orientation
    preparation
    test
    complication
    escalation
    reveal
    concealment
    reversal
    rupture
    repair
    payoff
    reframing
    transition
    aftermath
    comic release
    breather
    climax proof

A scene need not always contain a large plot reversal. An atmospheric or contemplative scene can be valid when it deliberately changes:
    audience attachment
    emotional readiness
    motif meaning
    anticipation
    tone
    world understanding

But the annotation must identify that function.

* * *

20. Layer Q — Beat and tactic annotations
    =========================================

For every narratively meaningful beat:
    actor
    objective
    tactic
    target
    resistance
    response
    result
    information gained
    power movement
    next tactic
    state delta

Tactic vocabulary:
    ask
    test
    deflect
    accuse
    bait
    comfort
    threaten
    conceal
    perform role
    reframe
    stall
    confess
    deny
    plead
    command
    joke
    misdirect
    withdraw
    shame
    seduce
    bargain
    provoke
    appease
    refuse

The model must learn tactical adaptation:
    casual question
    → joke
    → indirect test
    → accusation
    → evidence reveal
    → threat of departure

* * *

21. Layer R — Dialogue and action annotations
    =============================================

Mechanical dialogue structure should be annotated for every turn. Deep interpretive annotation should cover every pivotal exchange and every turn in the Platinum subset.
21.1 Conversation structure
---------------------------

Annotate:
    speaker
    explicit addressee
    side participants
    conversation thread
    topic
    reply-to turn
    floor change
    interruption
    overlap

Dramatic Conversation Disentanglement shows that movie dialogue contains multiple interleaved conversational threads and floor/topic changes; its dataset contains 10,033 turns and 2,209 threads across 831 films. ([ACL Anthology](https://aclanthology.org/2023.findings-acl.248/ "https://aclanthology.org/2023.findings-acl.248/"))
21.2 Dialogue-turn schema
-------------------------

    interface DialogueTurnAnnotation {
      turnId: string;
      sceneId: string;
    
      speakerId: string;
      addresseeIds: string[];
      sideParticipantIds: string[];
    
      conversationThreadId: string;
      replyToTurnId?: string;
    
      surfaceFunction:
        | "question"
        | "answer"
        | "command"
        | "joke"
        | "threat"
        | "confession"
        | "reframe"
        | "evasion"
        | "bargain"
        | "status_move"
        | "failed_answer";
    
      literalMeaning: string;
      hiddenIntent?: string;
      tactic: string;
    
      commonGround: string[];
      speakerKnows: string[];
      listenerKnows: string[];
      forbiddenDisclosure: string[];
    
      subtextMeaning?: string;
      subtextGap:
        | "none"
        | "weak"
        | "moderate"
        | "strong"
        | "directness_justified";
    
      relationshipPressure: string[];
      activeMechanisms: string[];
    
      voiceFeatures: string[];
    
      responseMode:
        | "answer"
        | "evade"
        | "misunderstand"
        | "counterattack"
        | "joke"
        | "silence"
        | "topic_shift"
        | "status_move"
        | "confession"
        | "threat";
    
      expositionMode?:
        | "argument"
        | "joke"
        | "ritual"
        | "expertise"
        | "warning"
        | "interrogation"
        | "performance"
        | "object_demonstration"
        | "confession_under_pressure"
        | "naked_exposition";
    
      stateDeltas: {
        belief?: string;
        emotion?: string;
        relationship?: string;
        power?: string;
        object?: string;
        clue?: string;
        audienceKnowledge?: string;
      };
    
      actionAlternative?: string;
    }

21.3 Action as dialogue
-----------------------

Annotate:
    silence
    gesture
    gaze
    distance
    touch
    refusal
    exit
    object transfer
    object destruction
    physical proof
    ritual action
    failed answer
    blocking change

For each action:
    what line it replaces
    what prior turn it answers
    what the audience infers
    what state it changes
    why action is stronger than explanation

Action2Dialogue supports conditioning dialogue on scene setting, character behavior, and accumulated prior dialogue rather than generating isolated lines. ([arXiv](https://arxiv.org/abs/2505.16819 "https://arxiv.org/abs/2505.16819"))

The StoryMachine dialogue law remains:
    No line or action is accepted without:
    objective
    hidden intent
    tactic
    mechanism relevance
    knowledge legality
    voice specificity
    subtext evaluation
    state change

* * *

22. Layer S — Spatial and cinematic annotations
    ===============================================

For every important scene, annotate:
    location
    regions within location
    character positions
    object positions
    distance
    sightlines
    occlusions
    sound zones
    entrances
    exits
    camera-visible information
    character-visible information
    offscreen information

This supports distinctions such as:
    The audience sees the envelope.
    Nora sees the envelope.
    Leo does not see it.
    The villain hears the exchange from the hallway.

Also annotate action-line craft:
    filmability
    clarity
    economy
    visual specificity
    rhythm
    focus of attention
    emotional implication
    subjective prose

* * *

23. Layer T — Reveal, clue, and misdirection ecology
    ====================================================

For every hidden truth:
    objective truth
    who knows
    who suspects
    who misbelieves
    what audience knows
    planned reveal mode

For every clue:
    carrier
    scene
    visibility
    who notices
    who ignores
    literal meaning
    true meaning
    false interpretation
    ambiguity
    memorability
    emotional charge

Clue carriers:
    object
    line
    gesture
    absence
    behavior
    location
    camera
    sound
    contradiction

For every reveal:
    evidence fairness
    audience readiness
    character readiness
    emotional readiness
    theme relevance
    relationship cost
    earlier event recontextualized
    belief changes
    future consequences

Reveal types:
    mystery answer
    suspense confirmation
    dramatic-irony collision
    surprise
    recognition
    reversal
    betrayal
    false reveal

* * *

24. Layer U — Audience-state annotation
    =======================================

After every major scene or sequence, annotate:
    known facts
    suspected facts
    false beliefs
    active questions
    expected outcomes
    feared outcomes
    emotional investment
    trust in narrator
    curiosity
    suspense
    surprise readiness
    confusion
    cognitive load
Audience clue memory
--------------------

    first appearance
    apparent meaning
    salience
    reinforcement
    true meaning
    last reinforcement
    decay risk
    recontextualization
    payoff

The audience is an epistemic participant, not a passive quality score.

* * *

25. Layer V — Setup and payoff ledger
    =====================================

For every setup:
    type
    first appearance
    surface function
    hidden future function
    reinforcement
    transformation
    payoff

Setup types:
    skill
    object
    relationship
    promise
    fear
    rule
    lie
    location
    phrase
    image
    sound
    behavior
    weakness
    ritual

Payoff types:
    practical
    causal
    emotional
    relationship
    comic
    thematic
    reveal
    visual
    ironic

Detect:
    orphan setup
    unprepared payoff
    over-signaled setup
    forgotten setup
    payoff delayed beyond audience memory
    payoff removed by upstream revision

* * *

26. Layer W — Object and motif arcs
    ===================================

For every important object:
    origin
    physical state
    ownership
    possession history
    access
    uses
    story function
    emotional meaning
    symbolic meaning
    who values it
    who misunderstands it
    final state

Meaning lifecycle:
    initial meaning
    useful meaning
    costly meaning
    dangerous meaning
    reinterpreted meaning
    final meaning

For motifs—songs, phrases, images, colors, sounds, locations, gestures, rituals—track each appearance:
    surface use
    character association
    emotional charge
    relationship to earlier appearance
    new meaning
    final payoff

* * *

27. Layer X — Theme argument graph
    ==================================

Do not store only:
    theme = family

Store:
    central thematic question
    claim
    counterclaim
    complication
    undercut
    possible synthesis

For every thematic event:
    supports claim
    attacks claim
    undercuts claim
    complicates claim
    embodies counterclaim
    resolves contradiction

Annotate advocates:
    characters
    institutions
    relationships
    objects
    world rules

Climax and ending:
    What thematic claim is enacted?
    What does the choice cost?
    Which alternative claim is rejected?
    What contradiction remains?

* * *

28. Layer Y — Pacing, conflict, tone, and emotional curves
    ==========================================================

Track per scene or sequence:
Pacing
------

    scene length
    dialogue/action ratio
    new information rate
    decision rate
    reversal density
    question-answer delay
    tension
    release

Conflict
--------

    conflict source
    conflict type
    intensity
    escalation
    avoidance
    temporary resolution
    unresolved residue

Tone
----

    dominant tone
    secondary tone
    tonal transition
    productive contrast
    unintentional tonal break

Emotional arc
-------------

    entering emotion
    appraisal event
    peak emotion
    concealed emotion
    behavioral response
    leaving emotion
    residue

Arc debts
---------

    mechanism underfed
    relationship static too long
    reveal delayed
    theme unpressured
    object arc dormant
    too many similar scenes
    insufficient cooldown

* * *

29. Layer Z — Ending proof
    ==========================

Evaluate the ending across separate systems.
    external goal resolution
    internal transformation
    relationship resolution
    mechanism resolution
    theme resolution
    genre-contract resolution
    setup/payoff completion
    object/motif resolution
    audience aftertaste
    irreversibility

For each:
    resolved
    partially resolved
    intentionally unresolved
    accidentally abandoned

The ending annotation should explain:
    why this ending belongs to this specific screenplay
    what earlier material makes it possible
    what it proves through action
    why returning to the opening state is or is not possible

* * *

30. Hard-error annotation taxonomy
    ==================================

Use ConStory-Bench’s five categories and 19 subtypes as the baseline consistency taxonomy. ([arXiv](https://arxiv.org/html/2603.05890v1 "https://arxiv.org/html/2603.05890v1"))
Timeline and plot logic
-----------------------

    absolute-time contradiction
    duration contradiction
    simultaneity contradiction
    causeless effect
    causal logic violation
    abandoned plot element

Characterization
----------------

    memory contradiction
    knowledge contradiction
    skill fluctuation
    forgotten ability

World-building and setting
--------------------------

    core-rule violation
    social-norm violation
    geographical contradiction

Factual and detail consistency
------------------------------

    appearance mismatch
    nomenclature confusion
    quantitative mismatch

Narrative and style
-------------------

    perspective confusion
    tone inconsistency
    style shift

Add StoryMachine-specific hard or near-hard errors:
    object teleportation
    impossible sight/hearing
    unmotivated action
    cheap relationship repair
    unseeded payoff
    illegal reveal
    branch/canon conflict

Every error record must include both contradictory evidence spans.

* * *

31. Soft-quality annotation rubric
    ==================================

Do not train one unexplained `goodness_score`.

Use separate dimensions.
Professional high-level dimensions
----------------------------------

The Academy Nicholl criteria group screenplay judgment into Story, Voice, Characters, Craft, and Meaning and Magic. ([Oscars](https://www.oscars.org/nicholl/about "https://www.oscars.org/nicholl/about"))
DramaBench dimensions
---------------------

    format standards
    narrative efficiency
    character consistency
    emotional depth
    logic consistency
    conflict handling

([arXiv](https://arxiv.org/abs/2512.19012 "https://arxiv.org/abs/2512.19012"))
StoryMachine dimensions
-----------------------

    premise strength
    mechanism integrity
    causal coherence
    character intentionality
    relationship pressure
    scene function
    dialogue state-change power
    subtext
    voice distinction
    cinematic execution
    reveal fairness
    audience-state management
    setup/payoff integrity
    object/motif development
    theme argument
    genre fulfillment
    pacing/rhythm
    ending proof
    originality/genericness
    meaning and emotional residue

Score each on an anchored scale:
    0 = absent or broken
    1 = weak
    2 = functional
    3 = strong
    4 = exceptional
    N/A = dimension not applicable

Every score requires:
    evidence
    explanation
    effect
    confidence
    alternative interpretation

* * *

32. Deliberate rule-breaking annotations
    ========================================

For every apparent craft-rule violation:
    convention being violated
    whether violation appears intentional
    evidence of intention
    what compensates for it
    audience effect
    cost introduced
    whether it succeeds

Examples:
    passive protagonist
    minimal dialogue
    abrupt ending
    repeated scene structure
    direct confession
    nonlinear exposition
    unresolved thematic question

This is critical. Without an exception layer, the model will learn rigid formula and “correct” the most distinctive high-end scripts.

* * *

33. Counterfactual and essentiality annotations
    ===============================================

For every major scene, event, reveal, relationship turn, and motif:
    What breaks if removed?
    What weakens if moved?
    What changes if it happens earlier?
    What changes if it happens later?
    Could another character perform it?
    What if the obvious alternative were chosen?
    What if the truth were stated directly?

Classify dependency:
    causal
    motivational
    epistemic
    relationship
    theme
    genre
    audience memory

Classify essentiality:
    structurally essential
    emotionally essential
    thematically essential
    replaceable by equivalent function
    decorative but valuable
    redundant

This is the strongest method for teaching the model why material exists.

* * *

34. Controlled weak versions
    ============================

For important examples, create targeted degraded versions.
Premise
-------

    remove irony
    make stakes generic
    remove the story mechanism

Character
---------

    remove motive
    remove agency
    remove contradiction
    make transformation unearned

Structure
---------

    remove midpoint consequence
    repeat escalation
    resolve climax through coincidence

Scene
-----

    remove objective
    remove obstacle
    remove turn
    remove state change
    enter too early
    leave too late

Dialogue
--------

    state subtext explicitly
    flatten character voices
    repeat known information
    leak impossible knowledge
    answer every question directly

Reveal
------

    remove clue
    move clue after reveal
    remove emotional consequence
    remove recontextualization

Relationship
------------

    repair without cost
    betray without prior trust
    create intimacy without vulnerability

These should be **surgical corruptions**, with one or two controlled failures at a time. That lets the model learn the causal effect of each craft decision.

* * *

35. Preference pairs
    ====================

Each high-value original or repaired example should become chosen/rejected data.
    interface ScreenplayPreferencePair {
      context: {
        storyProfile: string;
        beforeState: string;
        sceneObligation: string;
      };

      chosen: {
        candidate: string;
        proof: string[];
      };

      rejected: {
        candidate: string;
        failureTypes: string[];
      };

      dimensionComparison: {
        causalCoherence: [number, number];
        intentionality: [number, number];
        relationshipPressure: [number, number];
        dialogueSubtext: [number, number];
        voiceSpecificity: [number, number];
        revealFairness: [number, number];
        cinematicExecution: [number, number];
      };

      reviewerRationale: string;
    }

StoryAlign’s benchmark uses a prompt, one chosen story, and three rejected stories; it reports that existing reward models struggled with the task, underscoring the need for high-quality human-verified preference examples. ([arXiv](https://arxiv.org/abs/2605.04831 "https://arxiv.org/abs/2605.04831"))

* * *

36. Source-neutral synthetic equivalents
    ========================================

For every major craft pattern:
    source dramatic function
    → abstract operation
    → new characters
    → new world
    → new genre
    → new wording

Example abstraction:
    A publicly accepted proxy admits that a socially forbidden partner
    possesses the actual talent, restoring authorship while destroying trust.

Synthetic versions:
    Fantasy:
    A court magician admits an outlawed creature cast every spell.

    Crime:
    A detective admits an informant solved the case through illegal evidence.

    Science fiction:
    A commander admits the banned ship AI made every successful decision.

    Music drama:
    A frontman admits the anonymous session musician wrote the album.

This teaches transferable craft rather than source memorization.

* * *

37. Screenplay annotation depth for 1,000 scripts
    =================================================

Annotating every script at maximum depth is not automatically best. A smaller number of accurate, human-validated deep annotations is more valuable than millions of speculative labels.

Use three levels.
Level 1 — Base annotation: all 1,000 scripts
--------------------------------------------

Every script receives:
    source metadata
    screenplay AST
    stable IDs
    scene segmentation
    canonical entities
    character aliases
    locations
    objects
    major events
    basic facts
    scene summaries
    basic scene functions
    major character profiles
    major relationship map
    major reveals
    basic setup/payoff links
    genre/tone profile

Automation can perform most of this, followed by systematic QA.
Level 2 — Gold annotation: approximately 250–300 training scripts
-----------------------------------------------------------------

Add:
    complete causal event graph
    temporal fact intervals
    scene-by-scene before/after state
    character goal and belief timelines
    relationship arcs
    mechanism lifecycle
    sequence structure
    subplots
    reveal/clue ecology
    audience-state checkpoints
    object/motif arcs
    theme argument
    pacing/emotional/tone maps
    quality rubric
    hard-error audit
    counterfactual dependency tests

Every scene in these scripts should be deeply annotated and human-validated.
Level 3 — Platinum annotation: approximately 75–100 training scripts
--------------------------------------------------------------------

Add maximum granularity:
    every significant beat
    every dialogue turn
    conversation threads
    reply-to edges
    addressees and side participants
    hidden intent
    tactics
    subtext
    common ground
    knowledge legality
    voice features
    exposition mode
    action alternatives
    spatial blocking
    sightlines and sound zones
    controlled weak variants
    chosen/rejected pairs
    repair examples
    source-neutral synthetic equivalents

These become your highest-quality critic, planner, dialogue, and reward-model data.
Sealed evaluation
-----------------

A conservative split for 1,000 scripts:
    700 training
    150 validation
    150 sealed final test

Keep together:
    alternate drafts
    same screenplay family
    adaptations
    sequels/franchises
    translations
    same-author clusters where author generalization is tested

The final test scripts can be richly annotated for scoring, but none of their annotations or text-derived training tasks may enter training.

* * *

38. Recommended annotation workflow
    ===================================

Pass 1 — Freeze source and splits
---------------------------------

    archive original
    assign checksum
    assign permanent script ID
    identify draft family
    lock train/validation/test split

Pass 2 — Parse screenplay
-------------------------

    screenplay AST
    scene headings
    characters
    dialogue/action blocks
    stable IDs
    page and span references

Pass 3 — Canonicalize entities
------------------------------

    merge aliases
    separate genuinely distinct identities
    canonicalize objects and locations
    retain unresolved mentions separately

STAGE combines normalization, similarity clustering, and adjudication to prevent over-aggressive or incorrect entity merging. ([arXiv](https://arxiv.org/html/2601.08510v1 "https://arxiv.org/html/2601.08510v1"))
Pass 4 — Extract events and facts
---------------------------------

    scene-level salient events
    atomic facts
    time validity
    object transfers
    location changes
    participants
    witnesses

Pass 5 — Build global world model
---------------------------------

    entity graph
    event graph
    causal edges
    temporal edges
    social edges
    object edges
    fabula order
    syuzhet order

Pass 6 — Character and relationship pass
----------------------------------------

    character sheets
    goal chains
    belief states
    knowledge states
    emotion/appraisal
    voice grammar
    relationship arcs

Pass 7 — Structure and mechanism pass
-------------------------------------

    premise
    story mechanism
    act/sequence map
    turning points
    plot nuclei
    subplots
    genre contract
    theme argument

Pass 8 — Scene and beat pass
----------------------------

    before state
    scene obligations
    objectives
    obstacles
    stakes
    tactics
    turns
    exit condition
    after state
    future dependencies

Pass 9 — Dialogue/action pass
-----------------------------

    threads
    reply-to
    addressees
    surface act
    hidden intent
    tactic
    subtext
    voice
    knowledge
    state delta
    action alternative

Pass 10 — Reveal and audience pass
----------------------------------

    clues
    misdirections
    audience beliefs
    active questions
    reveal readiness
    recontextualization

Pass 11 — Quality and error pass
--------------------------------

    hard consistency errors
    soft quality dimensions
    deliberate rule-breaking
    genericness
    cinematic execution
    ending proof

Pass 12 — Training derivation pass
----------------------------------

    counterfactuals
    controlled weak versions
    repair examples
    preference pairs
    synthetic equivalents
    benchmark questions

Pass 13 — Validation and adjudication
-------------------------------------

    schema checks
    evidence checks
    global consistency checks
    human review
    disagreement adjudication
    final acceptance

STAGE uses a three-stage quality-control pipeline: reflection-based acceptance with bounded retries, deterministic rule-based post-processing, and targeted human correction for low-confidence cases. ([arXiv](https://arxiv.org/html/2601.08510v1 "https://arxiv.org/html/2601.08510v1"))

* * *

39. Human-review standard
    =========================

Factual annotations
-------------------

Examples:
    speaker
    location
    object ownership
    event participants
    explicit facts

Require:
    automated extraction
    + deterministic validation
    + sampled human review
Interpretive annotations
------------------------

Examples:
    hidden intent
    theme role
    motif meaning
    character wound

Require:
    two independent reviewers for Gold/Platinum data
    + evidence
    + confidence
    + alternative interpretation
    + adjudication when materially different
Quality and preference annotations
----------------------------------

Require:
    blind candidate order
    title/status hidden where possible
    two or three readers for high-value examples
    tie option
    uncertain option
    written evidence
    adjudication

Do not force false agreement. Ambiguity is itself useful training data when clearly labeled.

* * *

40. Annotation acceptance tests
    ===============================

An annotation is accepted only when:
    the unit ID exists
    the evidence span exists
    the label belongs to the ontology
    the interpretation does not contradict explicit evidence
    the confidence is supplied
    the annotation mode is supplied
    all linked entities are canonical
    all referenced events exist
    all temporal ranges are valid
    all before/after states reconcile
    training split is correct
    review requirement is satisfied

Reject:
    generic praise
    plot summary disguised as analysis
    invented motivation
    unsupported theme claims
    labels with no evidence
    dangling event links
    contradictory state snapshots
    forced subtext where none exists
    quality judgments that ignore genre or intent

* * *

41. Final per-screenplay artifact bundle
    ========================================
    
    manifest.json
    rights_and_provenance.json
    screenplay.ast.json
    scene_index.json
    entity_registry.json
    alias_map.json
    world_rules.json
    atomic_facts.jsonl
    state_checkpoints.jsonl
    events.jsonl
    event_relations.jsonl
    fabula.json
    syuzhet.json
    characters.json
    character_timelines.jsonl
    beliefs.jsonl
    relationships.json
    relationship_events.jsonl
    emotional_arc.json
    mechanism.json
    structure.json
    sequences.jsonl
    subplots.jsonl
    scenes.jsonl
    beats.jsonl
    dialogue_turns.jsonl
    action_beats.jsonl
    spatial_state.jsonl
    reveals.json
    clues.jsonl
    audience_state.jsonl
    setups_payoffs.json
    object_arcs.json
    motif_arcs.json
    theme_graph.json
    pacing_map.json
    tone_map.json
    ending_proof.json
    quality_annotations.jsonl
    consistency_errors.jsonl
    rule_exceptions.jsonl
    counterfactuals.jsonl
    weak_variants.jsonl
    preference_pairs.jsonl
    repair_tasks.jsonl
    synthetic_equivalents.jsonl
    benchmark_questions.jsonl
    annotation_provenance.jsonl
    review_log.jsonl

* * *

42. Convert the annotations into separate training tasks
    ========================================================

Do not pour the entire package into one next-token training dataset.
Extractor training
------------------

    screenplay scene
    → entities, events, facts, state changes

Critic training
---------------

    scene/script
    → quality findings + evidence + diagnosis

Planner training
----------------

    before state + obligation
    → scene or sequence plan

Dialogue compiler training
--------------------------

    scene state + objectives + hidden intent
    → dialogue/action tactics

Renderer training
-----------------

    validated scene plan
    → clean screenplay pages

Repair training
---------------

    failed scene + diagnosis
    → corrected plan + corrected scene

Preference-model training
-------------------------

    context + chosen + rejected
    → preference and dimension scores

Counterfactual training
-----------------------

    change or remove event
    → downstream consequences

Proof training
--------------

    candidate scene
    → before/after state + legality report

The project’s proof model already separates temporal, causal, intentional, motivational, emotional, relational, epistemic, reveal, theme, mechanism, reader, spatial, dialogue, and provenance checks.

* * *

Final answer
============

The maximum-readiness screenplay is **not** a screenplay with thousands of loose tags.

It is:
    exact screenplay source
    + stable screenplay AST
    + canonical entities
    + temporal atomic facts
    + scene-grounded events
    + causal and character graphs
    + fabula and syuzhet
    + character minds
    + belief and audience states
    + relationship arcs
    + story mechanism
    + sequence and scene functions
    + beat and tactic chains
    + dialogue/action functions
    + reveal and clue ecology
    + setup/payoff ledger
    + object and motif arcs
    + theme argument
    + pacing/emotion/tone maps
    + ending proof
    + hard-error labels
    + multidimensional quality labels
    + evidence and confidence
    + counterfactual dependencies
    + controlled weak versions
    + preference pairs
    + repair tasks
    + source-neutral synthetic equivalents
    + sealed evaluation assignments.

The decisive rule is:
    Do not annotate merely what happens.

    Annotate:
    why it happens,
    why this character causes it,
    what state it changes,
    what the audience understands,
    what later material depends on it,
    why its execution is strong,
    and what breaks when it is altered.

That is the most complete and defensible annotation system for teaching Qwen3 the construction logic of high-end screenplays rather than merely teaching it screenplay-shaped language.


