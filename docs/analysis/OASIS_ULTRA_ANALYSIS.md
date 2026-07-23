# OASIS ULTRA-ANALYSIS: What You Actually Need

## 🔍 Current State Assessment

### What I Built (600 lines)
- ✅ Basic vocabulary translation (posts → dialogue)
- ✅ 30 cinematic actions
- ✅ 11 film genres
- ✅ Character/Cinephile classes
- ❌ **TOO THIN** — Just a wrapper, not a system

### What's Missing (Critical Gaps)

---

## 📊 GAP ANALYSIS

### 1. **EXISTING STORYMACHINE TYPES — NOT INTEGRATED**

Your **existing** `server/engine/types.ts` has:
- `CharacterSheet` with psychology (DarkTriad, BigFive, AttachmentStyle)
- `TheoryOfMind` for belief tracking
- `Belief` system (witnessed/told/inferred)
- `GoalStack` with terminal/instrumental goals
- `Stakes` (freedom, reputation, survival, etc.)
- `DefenseMechanism` (projection, denial, etc.)
- `ActionType` (15 actions: SPEAK, LIE, HIDE, BETRAY, etc.)
- `EmotionState`, `DramaticPressure`, `BeatTrace`

**My adapter IGNORES all of this.** I created duplicate, incompatible classes.

### 2. **SCREENPLAY STRUCTURE — MISSING**

Need:
- **Beat systems**: Save the Cat (15 beats), Hero's Journey (12 stages), Blake Snyder
- **Act structure**: 3-act, 5-act, 4-act (TV)
- **Turning points**: Inciting incident, midpoint, dark night of the soul, climax
- **Setup/Payoff tracking**: Chekhov's gun, plant/payoff
- **Character arcs**: Positive change, negative change, flat arc
- **Subplot weaving**: A/B/C story threads
- **Theme threading**: How thematic arguments progress

### 3. **GENRE SYSTEMS — TOO SHALLOW**

Current: 11 enum values  
Need: **Genre rule engines** for each:

**Crime Thriller:**
- Clue placement rules
- Red herring distribution
- Reveal timing constraints
- Detective procedure authenticity
- Motive/means/opportunity triangle

**Horror:**
- Tension escalation curves
- Jump scare vs dread balance
- Survival rule logic
- Monster reveal timing
- Final girl archetype

**Romantic Comedy:**
- Meet-cute mechanics
- Misunderstanding generation
- Grand gesture timing
- Happily-ever-after requirements
- Chemistry measurement

Each genre needs **50-100 rules minimum.**

### 4. **CINEMATIC MECHANICS — ABSENT**

Need:
- **Camera language**: Shot types (close-up, wide, POV), angles, movement
- **Editing rhythm**: Cut patterns, montage, cross-cutting
- **Visual storytelling**: Show-don't-tell translation
- **Blocking**: Character positioning, movement, proxemics
- **Scene transitions**: Cut-to, dissolve, match-cut
- **Subtext**: What's unsaid, body language, micro-expressions

### 5. **CHARACTER DEPTH — INSUFFICIENT**

Current: Basic personality string  
Need:
- **Psychological models**: Full integration with existing DarkTriad, BigFive, AttachmentStyle
- **Voice distinctiveness**: Burrows Delta implementation, vocabulary profiles, speech patterns
- **Memory systems**: What character remembers scene-to-scene
- **Motivation hierarchies**: Maslow's hierarchy, goal conflicts
- **Emotional state machines**: Track emotional journey turn-by-turn
- **Relationship dynamics**: Power balance, affinity, debt, trust (already in your types!)

### 6. **DIRECTOR/PRODUCTION LAYER — MISSING**

Need:
- **Blocking and staging**: Where characters stand, move, interact physically
- **Location management**: Set pieces, props, spatial constraints
- **Casting considerations**: Character type, age, physical requirements
- **Budget simulation**: Effects complexity, location costs
- **Shooting schedule**: Scene grouping by location/time/cast

### 7. **AUDIENCE SIMULATION — TOO BASIC**

Current: One "cinephile" class  
Need:
- **Multiple personas**: Casual viewer, critic, superfan, genre devotee
- **Emotional tracking**: Moment-to-moment engagement
- **Surprise vs predictability**: Information revelation balance
- **Pacing perception**: Too fast, too slow, just right
- **Character empathy**: Who audiences root for
- **Confusion detection**: When plot becomes unclear

### 8. **INTEGRATION WITH STORYMACHINE — ZERO**

Current: Standalone Python script  
Need:
- **Hook into Doctor system**: Feed OASIS results into health scoring
- **Use existing detectors**: Temporal-consistency, anti-slop, emotional-arc
- **Feed revision pipeline**: OASIS generates → Doctor scores → Revision suggests fixes
- **Connect to NVM state**: Share character state, beliefs, goals
- **SQLite persistence**: Use existing Stage.ts database pattern

---

## 🎯 WHAT YOU ACTUALLY NEED

### **Production-Grade Film Simulation Engine**

Not a thin wrapper—a **complete cinematic world simulator** that:

1. **Uses Your Existing Types**
   - CharacterSheet, TheoryOfMind, GoalStack, Stakes
   - EmotionState, DramaticPressure
   - ActionType (your 15 actions)

2. **Implements Screenplay Structure**
   - Beat templates for 20+ structure types
   - Arc progression tracking
   - Setup/payoff validation
   - Theme threading

3. **Genre-Specific Engines**
   - 50-100 rules per genre
   - Mandatory beats
   - Tone management
   - Convention enforcement

4. **Cinematic Simulation**
   - Camera blocking
   - Visual storytelling
   - Subtext generation
   - Editing rhythm

5. **Character Psychology**
   - Full personality integration
   - Voice distinctiveness (Burrows Delta)
   - Belief/memory systems
   - Relationship evolution

6. **Production Realism**
   - Physical staging
   - Location constraints
   - Budget awareness
   - Schedule optimization

7. **Audience Modeling**
   - Multiple viewer types
   - Engagement tracking
   - Confusion detection
   - Emotional response

8. **StoryMachine Integration**
   - TypeScript bindings
   - Doctor scoring integration
   - SQLite persistence
   - Revision pipeline connection

---

## 📐 ARCHITECTURE REDESIGN

### Current (Wrong):
```
Python OASIS Wrapper (600 lines)
└─ Standalone, incompatible types
```

### Needed (Right):
```
┌─────────────────────────────────────────────────────────────┐
│  StoryMachine TypeScript Core                               │
│  ├─ server/engine/types.ts (existing!)                      │
│  ├─ server/nvm/analyze/doctor.ts (existing!)                │
│  └─ server/nvm/analyze/temporal-consistency.ts (new!)       │
└────────────────────┬────────────────────────────────────────┘
                     │ TypeScript bridge
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  OASIS Cinematic Engine (Python)                            │
│  ├─ Character System (2,000 lines)                          │
│  │   ├─ CharacterProfile (imports your types as JSON)       │
│  │   ├─ PsychologyEngine (DarkTriad, BigFive, Attachment)   │
│  │   ├─ VoiceEngine (Burrows Delta, speech patterns)        │
│  │   ├─ MemorySystem (episodic, semantic, working)          │
│  │   └─ RelationshipGraph (TheoryOfMind, trust, power)      │
│  │                                                           │
│  ├─ Structure System (5,000 lines)                          │
│  │   ├─ BeatTemplates (Save the Cat, Hero's Journey, etc.)  │
│  │   ├─ ActStructure (3-act, 5-act, TV 4-act)              │
│  │   ├─ ArcEngine (positive change, negative, flat)         │
│  │   ├─ SetupPayoffTracker (Chekhov's gun)                  │
│  │   ├─ SubplotWeaver (A/B/C stories)                       │
│  │   └─ ThemeThreader (thematic argument progression)        │
│  │                                                           │
│  ├─ Genre Engines (20,000 lines)                            │
│  │   ├─ CrimeThrillerEngine (clues, red herrings, reveals)  │
│  │   ├─ HorrorEngine (tension, scares, survival)            │
│  │   ├─ RomComEngine (meet-cute, misunderstandings)         │
│  │   ├─ SciFiEngine (worldbuilding, tech rules)             │
│  │   ├─ ... (15+ more genres)                               │
│  │   └─ GenreBlender (subgenre mixing rules)                │
│  │                                                           │
│  ├─ Cinematic System (10,000 lines)                         │
│  │   ├─ CameraEngine (shots, angles, movement)              │
│  │   ├─ BlockingEngine (staging, proxemics)                 │
│  │   ├─ EditingEngine (rhythm, transitions)                 │
│  │   ├─ VisualStorytelling (show-don't-tell)                │
│  │   └─ SubtextGenerator (implicit meaning)                 │
│  │                                                           │
│  ├─ Action System (3,000 lines)                             │
│  │   ├─ DialogueEngine (lines, subtext, interruptions)      │
│  │   ├─ PhysicalActionEngine (movement, combat, intimacy)   │
│  │   ├─ EmotionalEngine (reactions, expressions)            │
│  │   └─ SocialEngine (alliances, betrayals, confessions)    │
│  │                                                           │
│  ├─ Audience Simulation (5,000 lines)                       │
│  │   ├─ ViewerPersonas (casual, critic, superfan)           │
│  │   ├─ EngagementTracker (moment-to-moment)                │
│  │   ├─ ConfusionDetector (clarity issues)                  │
│  │   ├─ EmotionalResponseModel (empathy, tension)           │
│  │   └─ PredictabilityAnalyzer (surprise balance)           │
│  │                                                           │
│  ├─ Production System (3,000 lines)                         │
│  │   ├─ LocationManager (sets, constraints)                 │
│  │   ├─ CastingEngine (character requirements)              │
│  │   ├─ BudgetSimulator (cost estimation)                   │
│  │   └─ ScheduleOptimizer (shooting order)                  │
│  │                                                           │
│  ├─ CAMEL-AI OASIS Integration (5,000 lines)                │
│  │   ├─ AgentGraphBuilder (1M agents)                       │
│  │   ├─ EnvironmentAdapter (film worlds)                    │
│  │   ├─ ActionMapper (cinematic → OASIS)                    │
│  │   └─ ResultInterpreter (OASIS → screenplay)              │
│  │                                                           │
│  └─ Output Generators (7,000 lines)                         │
│      ├─ FountainExporter (screenplay format)                │
│      ├─ JSONStateExporter (for StoryMachine import)         │
│      ├─ AnalyticsReporter (metrics, insights)               │
│      └─ VisualizationEngine (charts, graphs, timelines)     │
└─────────────────────────────────────────────────────────────┘
                     │ JSON API / subprocess
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  CAMEL-AI OASIS Core (pip install camel-oasis)              │
│  └─ 1M agent scale, LLM behaviors, social dynamics          │
└─────────────────────────────────────────────────────────────┘
```

**Total:** ~60,000 lines (100x expansion)

---

## 🎬 EXAMPLE: What Full Integration Looks Like

### Before (My 600-line wrapper):
```python
cinema = CinematicOASIS()
cinema.add_character(ScreenplayCharacter(name="JOHN"))
result = await cinema.simulate(turns=20)
```

### After (Full 60K system):
```python
from oasis_cinematic import StoryMachineOASIS

# Import existing StoryMachine character
cinema = StoryMachineOASIS()
cinema.import_storymachine_character({
    "name": "JOHN MARLOWE",
    "darkTriad": {"machiavellianism": 75, "narcissism": 30, "psychopathy": 10},
    "bigFive": {"openness": 85, "conscientiousness": 60, ...},
    "attachmentStyle": "avoidant",
    "goals": {"terminal": "solve murder", "instrumental": ["find witness", ...]},
    "stakes": [{"category": "reputation", "magnitude": 90, ...}],
    "theoryOfMind": {...},
})

# Set structure template
cinema.use_beat_template("save_the_cat")
cinema.set_genre_engine("crime_thriller", strictness=0.8)

# Configure cinematic style
cinema.camera_style = "handheld_verité"  # vs steadicam, classical
cinema.editing_rhythm = "fast_cuts"      # vs long_takes
cinema.show_dont_tell = True             # Enforce visual storytelling

# Set scene with full context
cinema.set_scene({
    "location": "INT. INTERROGATION ROOM - NIGHT",
    "beat": "midpoint_false_victory",  # Structure-aware
    "dramatic_question": "Will suspect break?",
    "required_reveals": ["victim_identity"],
    "forbidden_reveals": ["killer_identity"],  # Too early
    "tone": "tense_claustrophobic",
    "pacing": "slow_burn_then_explosion",
})

# Add audience observers
cinema.add_audience_persona("noir_scholar", count=100)
cinema.add_audience_persona("casual_thriller_fan", count=500)

# Run simulation with full system
result = await cinema.simulate(
    turns=20,
    enable_camera_blocking=True,
    enable_subtext=True,
    enable_audience_tracking=True,
    enable_budget_constraints=True,
)

# Get rich output
screenplay = result.to_fountain()           # Fountain format
metrics = result.get_doctor_metrics()       # For StoryMachine Doctor
audience = result.get_audience_response()   # Engagement, confusion, etc.
production = result.get_production_notes()  # Blocking, camera, budget
```

---

## 🔥 PRIORITY ORDER (What to Build First)

### Phase 1: Foundation (Week 1-2)
1. **Type Bridge** — Import StoryMachine types into Python
2. **Character System** — Full psychology, voice, memory, relationships
3. **Basic Structure** — 3-act, basic beats

### Phase 2: Core Engines (Week 3-4)
4. **Action System** — Dialogue, physical, emotional, social
5. **Cinematic Basics** — Camera, blocking, visual storytelling
6. **One Genre Engine** — Crime thriller (full 100 rules)

### Phase 3: Scale (Week 5-6)
7. **CAMEL-AI Integration** — Connect to 1M agent system
8. **Audience Simulation** — Multiple personas, tracking
9. **Output Generators** — Fountain, JSON, analytics

### Phase 4: Expansion (Week 7-8)
10. **More Genres** — Horror, romcom, scifi (3-5 total)
11. **Production System** — Budget, schedule, casting
12. **Advanced Structure** — Save the Cat, Hero's Journey, etc.

### Phase 5: Integration (Week 9-10)
13. **StoryMachine Bridge** — TypeScript bindings, Doctor integration
14. **Testing** — Run against real screenplays
15. **Documentation** — Full API docs, examples

---

## 💡 KEY INSIGHT

**You don't need a thin wrapper. You need a complete cinematic world simulator that:**
1. Uses your existing types
2. Implements screenplay craft
3. Enforces genre rules
4. Simulates production realities
5. Models audience response
6. Integrates with StoryMachine's analysis engine

**Current:** 600 lines of vocabulary translation  
**Needed:** 60,000 lines of cinematic simulation infrastructure

Ready to build the real thing?
