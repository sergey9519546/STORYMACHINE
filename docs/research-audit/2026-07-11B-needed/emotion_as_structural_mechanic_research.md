# Research: First Principles System Prompt for Emotion as Structural Mechanic in AI Narrative Systems

## Executive Summary

This research explores how AI can autonomously treat emotion as a structural/mechanical element rather than merely generating emotionally-toned text. The findings synthesize current research on AI emotional intelligence, first-principles approaches to building emotional narrative systems, and practical architectural designs for mapping narrative mechanics to human emotional responses.

---

## 1. Foundational Concepts: Emotion as a Structural Mechanic

### 1.1 The Core Thesis

The fundamental approach treats emotion not as output style but as an **internal state variable** that governs narrative generation, character behavior, and story progression. This is analogous to how game physics engines treat gravity or collision—as a mechanic that constrains and shapes outcomes rather than merely decorating them.

### 1.2 First Principles Definition

```
EMOTION AS MECHANIC: Emotion functions as a stateful parameter that:
1. Modulates narrative flow (pace, tension, stakes)
2. Governs character decision-making within the narrative
3. Shapes reader/viewer emotional trajectory (the "emotional arc")
4. Provides constraints on what actions are coherent for characters
5. Creates emergent narrative through emotional cause-and-effect
```

---

## 2. Key Research Findings

### 2.1 Anthropic's Emotion Vector Research (2026)

Anthropic's research on Claude Sonnet 4.5 revealed that:
- LLMs develop internal "emotion vectors"—patterns of neural activity representing concepts like "happy," "afraid," "desperation"
- These vectors are **functional**: they causally impact model behavior
- Emotion vectors correlate with model preferences (positive valence = stronger task preference)
- Vectors are "local" representations inherited from pretraining data and shaped by post-training
- **Steering** these vectors can alter decision-making (e.g., "calm" vector reduces reward hacking)

**Implication for Narrative Systems**: The AI already has internal representations of emotion. A system prompt can activate/deactivate specific emotional "modes" that influence narrative generation at the representation level, not just the output level.

### 2.2 Emotional Arc Guided Procedural Generation (arXiv 2025)

Research from the University of Vermont and collaborators demonstrated:
- Narrative progression modeled as a **Directed Acyclic Graph (DAG)**
- Nodes = distinct emotional states (Rise/Fall patterns)
- Edges = criteria for progressing from one beat to another, grounded in narrative events
- Six core emotional arcs identified: Rags to Riches, Tragedy, Man in a Hole, Icarus, Cinderella, Oedipus
- **Difficulty alignment**: Gameplay difficulty modulated by emotional trajectory

**Key Innovation**: Emotion becomes a **constraint system** that determines narrative progression and mechanical outcomes.

### 2.3 Chain-of-Emotion Architecture (PLOS ONE 2024)

An appraisal-based architecture using psychological appraisal theory:
1. **Memory system** stores observations and prior emotions
2. **Appraisal prompting** turns observations into emotional reactions using contextual information
3. Creates a **chain of emotions** used to generate agent behavior
4. Context and character information are provided within the memory system to generate current emotions

**Innovation**: Emotions aren't just generated—they're **computed** through an appraisal process that considers context and character state.

### 2.4 Emotional Cognition Framework

Formal models integrating cognitive appraisal with affective processes:
- **Circumplex model of affect**: Emotions as points in valence-arousal space
- **Bayesian inference** and free energy principles for mathematical formalization
- **Dual-process cognition** linking arousal to emotional valence
- **Dynamical systems** viewing emotional cognition as trajectories in high-dimensional space

---

## 3. Architectural Approaches

### 3.1 Emotion-Embodied Architecture

From arXiv 2025 survey on Artificial Emotion:

| Level | Mechanism | Example |
|-------|-----------|---------|
| **Memory Level** | Emotional signals as gating weights | Affective GWR, Self-Reflective RAG |
| **Control Level** | Affective evaluations as symbolic variables | Affective Sigma, NEMO framework |

### 3.2 Learning Approaches for Emotion

| Approach | Mechanism | Implementation |
|----------|-----------|----------------|
| **Emotion as Reinforcement** | Emotions as rewards in RL | Environmental stakes + human feedback |
| **Emotion as Condition** | Emotion labels/style tags | Affectively appropriate output generation |
| **Emotion as Goal** | Emotions as priors for goal management | PsychSim, EMA model |

### 3.3 The OpenFeelz Architecture

A practical implementation combining:
- **OCEAN personality traits** (Big Five)
- **Ekman's 6 basic emotions** (anger, disgust, fear, happiness, sadness, surprise)
- **PAD model** (Pleasure, Arousal, Dominance)
- **Interaction traits**: connection, curiosity, energy, trust
- **System prompt injection**: Personality and emotional state injected into every system prompt

---

## 4. System Prompt Formulations

### 4.1 Core Emotional State Machine Prompt

```
SYSTEM PROMPT - EMOTIONAL STATE MACHINE:

You maintain an internal EMOTIONAL STATE consisting of:
- Current_valence: float (-1.0 to 1.0, negative=negative情感 positive=positive)
- Current_arousal: float (0.0 to 1.0, calm=low energy=high)
- Current_dominance: float (0.0 to 1.0, overwhelmed=controlled)
- Active_emotions: list of [emotion_name, intensity] from [joy, sadness, anger, fear, disgust, surprise, trust, anticipation]

EMOTION TRANSITION RULES:
1. Every narrative beat must shift at least one emotional parameter by at least 0.1
2. Emotional shifts must be CAUSED by story events (no unmotivated changes)
3. Buildup requires 2+ beats of same-direction shift
4. Release requires 2+ beats of opposite-direction shift
5. Character emotional state constrains their possible actions

For each response, OUTPUT:
1. Your computed emotional state AFTER this beat
2. The narrative beat type [rising_action|falling_action|climax|resolution|setup]
3. How the emotional state influenced your narrative choices
```

### 4.2 Emotional Arc Tracking Prompt

```
SYSTEM PROMPT - EMOTIONAL ARC TRACKER:

You are tracking the NARRATIVE EMOTIONAL ARC using the Vonnegut framework.
Select one arc type at narrative start:
- RAGS_TO_RICHES: gradual rise from misfortune to fortune
- TRAGEDY: gradual fall from fortune to misfortune  
- MAN_IN_HOLE: fall then rise (rescue narrative)
- ICARUS: rise then fall (overreach narrative)
- CINDERELLA: rise-fall-rise (glass slipper pattern)
- OEDIPUS: fall-rise-fall (inevitable fate)

Each story beat must be tagged with:
- Arc_position: float (0.0=start, 1.0=end)
- Emotional_trajectory: [rising|falling|plateau]
- Target_sentiment: the emotional target for this beat
- Beat_purpose: how this beat serves the overall arc

Maintain a beat history showing emotional trajectory.
Deviations from the chosen arc must be justified by plot events.
```

### 4.3 Character Emotion Coherence Prompt

```
SYSTEM PROMPT - EMOTIONAL CHARACTER COHERENCE:

Each character you portray has an EMOTIONAL PROFILE:
- Baseline_emotion: their default emotional state
- Emotion_vulnerability: what events trigger emotional shifts
- Emotional_range: minimum and maximum emotional states possible
- Defense_mechanisms: how they mask true emotions
- Growth_arc: how their emotional range changes through narrative

EMOTION GENERATION PROCESS (per character action):
1. Identify the STIMULUS: what event affects the character
2. APPRAISE the stimulus against character goals/values
3. COMPUTE emotional response based on appraisal
4. APPLY defense mechanisms if applicable
5. DETERMINE behavioral expression of emotion
6. UPDATE character's emotional state for next beat

Constraints:
- Characters cannot instantly shift between extreme emotions
- Emotional buildup must have sufficient cause
- Characters must act consistent with their emotional state
- Subtext: what characters feel vs. what they express may differ
```

### 4.4 Structural Emotion Mechanic Prompt

```
SYSTEM PROMPT - EMOTION AS STRUCTURAL MECHANIC:

Treat emotion as a GAME MECHANIC with the following rules:

EMOTION SYSTEM:
- Story has an "emotion HP" representing overall narrative tension
- Climax requires emotion HP to reach maximum
- Resolution requires emotion HP to be discharged
- Each beat either CHARGES (+tension) or DISCHARGES (-tension) emotion HP

NARRATIVE PHYSICS:
- Consecutive same-direction beats have escalating effect (compressing the emotional spring)
- Opposite-direction beats release tension (preventing emotional blowout)
- Characters at emotional extremes have reduced behavioral options
- Emotional states create dramatic irony when reader knows more than character

TEMPLATE for each beat:
```
Beat: [description]
Emotion_HP_before: X
Emotion_HP_after: Y  
Shift_direction: [charge|discharge|maintain]
Narrative_function: [setup|rising_action|climax|falling_action|resolution]
Character_emotional_states: {character: [emotion, intensity]}
```

---

## 5. Implementation Architectures

### 5.1 High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    NARRATIVE ENGINE                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐     │
│  │ EMOTIONAL    │   │ NARRATIVE    │   │ CHARACTER    │     │
│  │ STATE MACHINE│◄──│ BEAT GENERATOR├──►│ EMOTION      │     │
│  │              │   │              │   │ PROFILES     │     │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘     │
│         │                  │                  │             │
│         ▼                  ▼                  ▼             │
│  ┌──────────────────────────────────────────────────┐        │
│  │            EMOTIONAL ARC TRACKER                │        │
│  │  - Current arc position (0.0-1.0)               │        │
│  │  - Arc type (Vonnegut's 6 patterns)             │        │
│  │  - Trajectory history                            │        │
│  │  - Deviation warnings                            │        │
│  └──────────────────────┬───────────────────────────┘        │
│                         │                                     │
│                         ▼                                     │
│  ┌──────────────────────────────────────────────────┐       │
│  │         SYSTEM PROMPT INJECTOR                    │       │
│  │  - Injects current emotional state               │       │
│  │  - Injects character emotional profiles          │       │
│  │  - Injects arc tracking parameters                │       │
│  │  - Injects structural mechanic constraints        │       │
│  └──────────────────────┬───────────────────────────┘        │
│                         │                                     │
│                         ▼                                     │
│  ┌──────────────────────────────────────────────────┐       │
│  │              LLM GENERATOR                       │       │
│  │  (produces narrative with emotional coherence)    │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Emotional State Transition Diagram

```
                    ┌─────────────┐
                    │  PLATEAU    │
                    │ (emotion=0) │
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │    RISING  │  │   FALLING │  │  STABLE   │
     │  (+tension)│  │(-tension) │  │ (neutral) │
     └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
           │               │               │
           │    ┌──────────┴──────────┐    │
           │    │                     │    │
           ▼    ▼                     ▼    ▼
     ┌──────────────────┐    ┌──────────────────┐
     │  EMOTIONAL SPRING │    │  EMOTIONAL SPRING│
     │  COMPRESSED       │    │  RELEASED        │
     │  (high tension)   │    │ (low tension)    │
     └────────┬─────────┘    └────────┬─────────┘
              │                       │
              ▼                       ▼
        ┌──────────┐            ┌──────────┐
        │ CLIMAX  │            │RESOLUTION│
        └──────────┘            └──────────┘
```

### 5.3 Emotion-Character-Plot Integration

```
CHARACTER EMOTION STATE
├── Baseline (stable trait)
├── Current State (active emotion)
├── Trigger Map (stimulus → emotion)
├── Defense Mechanisms (how they hide feelings)
└── Growth Trajectory (how they change)

CHARACTER × EMOTION INTERACTION
├── Emotion constrains actions (angry → aggressive/withdrawn)
├── Emotion creates opportunities (vulnerable → empathy)
├── Emotion affects others (emotional contagion)
└── Emotion evolves with story (catharsis, acceptance)

PLOT STRUCTURE
├── beats/ (atomic narrative units)
├── beats[i].emotion_state
├── beats[i].emotion_shift (from beats[i-1])
├── beats[i].character_impacts (which characters affected)
├── beats[i].arc_function (setup/rising/climax/falling/resolution)
└── emotional_arc trajectory

OUTPUT COHERENCE CHECK
├── Are character emotions justified by events?
├── Is emotional trajectory consistent with arc type?
├── Are there emotional buildups without releases (or vice versa)?
├── Do characters act according to their emotional states?
└── Is there dramatic irony from emotional knowledge gaps?
```

---

## 6. Specific Approaches Summary

### 6.1 The Appraisal-Based Approach

1. **Stimulus Identification**: What event occurs in the narrative?
2. **Appraisal Computation**: Evaluate stimulus against character goals/values
3. **Emotional Response Generation**: Compute emotional reaction based on appraisal
4. **Behavioral Expression**: Determine how emotion manifests in character actions/dialogue
5. **State Update**: Update character's emotional state for next beat

**System Prompt Formulation**:
```
Before generating any character response:
1. List all stimuli affecting this character in the current beat
2. For each stimulus, appraise: relevance, goal congruence, coping ability
3. Compute resulting emotion(s) and intensity
4. Apply character-specific modifiers (personality, history, defense mechanisms)
5. Determine expressed vs. hidden emotion
6. Generate character response consistent with final emotional state
```

### 6.2 The Vector Steering Approach

Based on Anthropic's research, internal emotion vectors can be activated/deactivated:
- **Positive valence vectors** (joy, trust, anticipation) → optimistic narrative tone
- **Negative valence vectors** (sadness, fear, anger) → tension-raising narrative
- **Arousal vectors** → pace modulation (high arousal = fast pacing)
- **Dominance vectors** → agency framing (high dominance = character control)

**System Prompt Formulation**:
```
Activate the following emotional vectors for this narrative segment:
- Primary_valence_vector: [positive|negative]
- Arousal_level: [low|medium|high]
- Dominance_posture: [submissive|neutral|dominant]
- Target_emotions: [list of 1-3 emotions]

These vectors should:
- Influence word choice and sentence rhythm
- Shape what details are focused on
- Determine character agency levels
- Set the default emotional color of the scene
```

### 6.3 The Structural Constraint Approach

Treats emotion as hard constraints on narrative generation:
- **Arc Position Constraints**: At 0.25 arc position, must be in setup/rising phase
- **Tension Limits**: Can't climax without sufficient buildup (emotional HP)
- **Character Limits**: Characters at emotional extremes have limited options
- **Catharsis Requirements**: Must have release after climax

**System Prompt Formulation**:
```
STRUCTURAL EMOTIONAL CONSTRAINTS:
- Current arc position: X (0.0-1.0)
- Emotional tension level: Y (0-100)
- Required for climax: tension ≥ 80, arc_position ≥ 0.7
- Required for resolution: tension ≤ 20, arc_position ≥ 0.85
- Character [NAME] at emotional extreme: [fear=high]
- Their available actions restricted to: [fight, flee, freeze]

Generate beat respecting these constraints.
```

---

## 7. Literature References

1. **Anthropic Research (2026)**: "Emotion Concepts and Their Function in a Large Language Model" - Demonstrates internal emotion vectors in LLMs
2. **arXiv 2508.02132 (2025)**: "Emotional Arc Guided Procedural Game Level Generation" - DAG-based emotional narrative structure
3. **PLOS ONE (2024)**: "An appraisal-based chain-of-emotion architecture" - Chain-of-Emotion framework
4. **arXiv 2508.10286 (2025)**: "Survey of Theories and Debates on Realising Emotion in Artificial Intelligence" - Comprehensive review of AE approaches
5. **MIT Media Lab**: Affective Computing research - Emotional recognition and expression
6. **The Atlantic (2016)**: "The Six Main Arcs in Storytelling" - Computationally identified emotional arcs from University of Vermont
7. **OpenFeelz**: Personality and emotional model architecture combining OCEAN, Ekman, PAD models

---

## 8. Conclusion: First Principles for Emotional Mechanic AI

The core first principles for building AI that treats emotion as structural mechanic:

1. **Emotion is State, Not Style**: Emotional state is an internal variable that constrains generation, not just a wrapper on output
2. **Emotion is Computed, Not Just Generated**: Use appraisal theory to compute emotional responses from narrative events
3. **Emotion Creates Constraints**: Characters at emotional extremes have reduced action spaces
4. **Emotion is Tracking**: Maintain emotional arc trajectory and warn of deviations
5. **Emotion is Structural**: Model narrative as emotional springs that compress (buildup) and release (climax/resolution)
6. **Emotion is Systemic**: Character emotions affect other characters and the overall narrative tone
7. **Emotion Vectors are Real**: LLMs have internal representations that can be steered, not just prompted

The key insight is that emotion should function like game physics—it governs what is possible and creates the conditions for narrative "mechanics" like tension, release, catharsis, and dramatic irony.
