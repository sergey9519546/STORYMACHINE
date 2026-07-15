"""
OASIS Cinematic Adaptation Layer
Extends CAMEL-AI OASIS for screenplay/film simulation

Keeps OASIS core intact, adds:
- Cinematic action types (not social media actions)
- Film world environments (not Twitter/Reddit)
- Character agent profiles (not social media users)
- Screenplay output format (not posts/comments)
"""

import asyncio
from typing import List, Dict, Any, Optional
from enum import Enum

# CAMEL-AI OASIS imports
from camel.models import ModelFactory
from camel.types import ModelPlatformType, ModelType
import oasis
from oasis import ActionType as OASISActionType


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CINEMATIC ACTION TYPES (extends OASIS core)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class CinematicActionType(str, Enum):
    """
    Film-specific actions that map to OASIS primitives.
    
    These are the actions characters take in screenplays,
    not social media behaviors.
    """
    # ── Dialogue Actions ──
    SPEAK_DIALOGUE = "speak_dialogue"              # Character says a line
    INTERRUPT = "interrupt"                        # Cut someone off mid-sentence
    WHISPER = "whisper"                           # Speak quietly to specific person
    SHOUT = "shout"                               # Yell/project voice
    MONOLOGUE = "monologue"                       # Extended speech
    
    # ── Physical Actions ──
    ENTER_LOCATION = "enter_location"             # Walk into a scene
    EXIT_LOCATION = "exit_location"               # Leave a scene
    APPROACH = "approach"                         # Move toward another character
    RETREAT = "retreat"                           # Back away from character
    PHYSICAL_ACTION = "physical_action"           # Specific action (drink, sit, etc.)
    FIGHT = "fight"                               # Physical altercation
    EMBRACE = "embrace"                           # Hug, kiss, physical affection
    
    # ── Emotional/Psychological Actions ──
    REACT_EMOTIONALLY = "react_emotionally"       # Show emotion (cry, laugh, etc.)
    OBSERVE = "observe"                           # Watch silently
    CONTEMPLATE = "contemplate"                   # Internal thought (voiceover)
    REMEMBER = "remember"                         # Flashback trigger
    
    # ── Social/Relationship Actions ──
    FORM_ALLIANCE = "form_alliance"               # Team up
    BETRAY = "betray"                            # Break trust
    CONFESS = "confess"                          # Reveal secret/truth
    LIE = "lie"                                  # Deceive
    CONFRONT = "confront"                        # Challenge directly
    SUPPORT = "support"                          # Show solidarity
    
    # ── Story Mechanics ──
    REVEAL_INFORMATION = "reveal_information"     # Expose plot point
    ASK_QUESTION = "ask_question"                # Inquiry that demands answer
    MAKE_DECISION = "make_decision"              # Choose between options
    PLAN = "plan"                                # Strategize with others
    
    # ── Cinephile/Meta Actions ──
    REFERENCE_FILM = "reference_film"            # "This is like that scene in..."
    ANALYZE_SCENE = "analyze_scene"              # Cinephile commentary
    PREDICT_PLOT = "predict_plot"                # "I bet this happens next..."
    CRITIQUE = "critique"                        # Film criticism/discussion


# Map cinematic actions → OASIS core actions
CINEMATIC_TO_OASIS_MAPPING = {
    CinematicActionType.SPEAK_DIALOGUE: OASISActionType.CREATE_POST,
    CinematicActionType.INTERRUPT: OASISActionType.CREATE_COMMENT,
    CinematicActionType.WHISPER: OASISActionType.CREATE_COMMENT,
    CinematicActionType.OBSERVE: OASISActionType.SEARCH_POSTS,
    CinematicActionType.REACT_EMOTIONALLY: OASISActionType.LIKE_POST,
    CinematicActionType.FORM_ALLIANCE: OASISActionType.FOLLOW,
    CinematicActionType.BETRAY: OASISActionType.MUTE,
    CinematicActionType.CONFRONT: OASISActionType.CREATE_COMMENT,
    # ... rest are custom or composite
}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CINEMATIC ENVIRONMENTS (replaces Twitter/Reddit)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class CinematicEnvironmentType(str, Enum):
    """
    Film world types - different rules, norms, and available actions.
    """
    CRIME_THRILLER = "crime_thriller"             # Noir, detective, heist
    ROMANTIC_COMEDY = "romantic_comedy"           # Meet-cutes, misunderstandings
    SCI_FI_DYSTOPIA = "sci_fi_dystopia"          # Totalitarian future
    HORROR = "horror"                            # Survival, psychological fear
    FAMILY_DRAMA = "family_drama"                # Domestic conflicts
    ACTION_ADVENTURE = "action_adventure"         # High stakes, physical
    COURTROOM_DRAMA = "courtroom_drama"          # Legal proceedings
    WESTERN = "western"                          # Frontier justice
    WAR_FILM = "war_film"                        # Combat, military
    SUPERHERO = "superhero"                      # Powers, good vs evil
    PERIOD_PIECE = "period_piece"                # Historical setting
    
    # Meta environments
    FILM_SCREENING = "film_screening"            # Cinephiles watching/discussing
    DIRECTORS_COMMENTARY = "directors_commentary" # Meta-analysis track


class CinematicLocation:
    """
    Specific locations within a film world.
    Replaces Twitter/Reddit "platform" concept.
    """
    def __init__(
        self,
        name: str,
        location_type: str,  # INT/EXT
        time: str,           # DAY/NIGHT/DAWN/DUSK
        world_type: CinematicEnvironmentType,
        atmosphere: str,     # "tense", "romantic", "chaotic"
        available_actions: List[CinematicActionType],
        capacity: int = 10,  # Max characters in scene
    ):
        self.name = name
        self.location_type = location_type
        self.time = time
        self.world_type = world_type
        self.atmosphere = atmosphere
        self.available_actions = available_actions
        self.capacity = capacity
    
    def to_oasis_platform(self):
        """Convert to OASIS platform config"""
        return {
            "name": f"{self.location_type}. {self.name} - {self.time}",
            "type": "custom",
            "config": {
                "world": self.world_type.value,
                "atmosphere": self.atmosphere,
                "max_agents": self.capacity,
            }
        }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CHARACTER PROFILES (replaces social media user profiles)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class ScreenplayCharacter:
    """
    Film character profile for OASIS simulation.
    NOT a social media user - a screenplay character.
    """
    def __init__(
        self,
        name: str,
        archetype: str,           # "protagonist", "antagonist", "mentor", etc.
        personality: str,          # Core traits
        goals: List[str],          # What they want
        fears: List[str],          # What they avoid
        secrets: List[str],        # Hidden information
        relationships: Dict[str, str],  # name → relationship_type
        voice: Dict[str, Any],     # Speech patterns, vocabulary
        background: str,           # Backstory
        arc: str,                  # Character arc type
        dialogue_style: str = "natural",  # "terse", "verbose", "poetic", etc.
    ):
        self.name = name
        self.archetype = archetype
        self.personality = personality
        self.goals = goals
        self.fears = fears
        self.secrets = secrets
        self.relationships = relationships
        self.voice = voice
        self.background = background
        self.arc = arc
        self.dialogue_style = dialogue_style
    
    def to_oasis_profile(self) -> Dict[str, Any]:
        """
        Convert screenplay character → OASIS agent profile.
        
        Maps character psychology to social media user format
        that OASIS expects, but with cinematic context.
        """
        return {
            "user_id": self.name.lower().replace(" ", "_"),
            "name": self.name,
            "bio": f"{self.archetype}. {self.personality}. {self.background}",
            
            # Map character traits to OASIS user attributes
            "interests": self.goals,  # Goals become "interests"
            "personality_traits": {
                "archetype": self.archetype,
                "voice": self.dialogue_style,
                "emotional_range": self._compute_emotional_range(),
            },
            
            # Behavioral patterns
            "posting_frequency": self._compute_dialogue_frequency(),
            "engagement_style": self._compute_engagement_style(),
            
            # Network
            "following": list(self.relationships.keys()),
            "followers": [],  # Will be populated by simulation
            
            # Hidden state
            "secrets": self.secrets,
            "fears": self.fears,
            
            # Custom cinematic fields
            "character_arc": self.arc,
            "dramatic_function": self.archetype,
        }
    
    def _compute_emotional_range(self) -> str:
        """Infer emotional expressiveness from personality"""
        if "stoic" in self.personality.lower() or "reserved" in self.personality.lower():
            return "constrained"
        elif "volatile" in self.personality.lower() or "passionate" in self.personality.lower():
            return "wide"
        return "moderate"
    
    def _compute_dialogue_frequency(self) -> str:
        """How often character speaks"""
        if self.dialogue_style == "terse":
            return "low"
        elif self.dialogue_style == "verbose":
            return "high"
        return "medium"
    
    def _compute_engagement_style(self) -> str:
        """How character interacts with others"""
        if "aggressive" in self.personality.lower():
            return "confrontational"
        elif "withdrawn" in self.personality.lower():
            return "passive"
        return "balanced"


class CinephileAgent:
    """
    Meta-character: A film buff watching/analyzing the story.
    Provides commentary, predictions, critiques.
    """
    def __init__(
        self,
        name: str,
        expertise: str,           # "Tarantino scholar", "horror fan", "casual viewer"
        preferences: List[str],    # Genres, directors, styles they like
        critical_style: str,       # "academic", "snarky", "enthusiastic"
        reference_knowledge: int,  # 1-10 scale of film history knowledge
    ):
        self.name = name
        self.expertise = expertise
        self.preferences = preferences
        self.critical_style = critical_style
        self.reference_knowledge = reference_knowledge
    
    def to_oasis_profile(self) -> Dict[str, Any]:
        """Convert cinephile → OASIS observer agent"""
        return {
            "user_id": f"cinephile_{self.name.lower().replace(' ', '_')}",
            "name": f"🎬 {self.name}",
            "bio": f"{self.expertise}. Loves {', '.join(self.preferences)}.",
            "interests": ["film analysis", "predictions", "references"] + self.preferences,
            "personality_traits": {
                "role": "observer",
                "critical_style": self.critical_style,
                "expertise_level": self.reference_knowledge,
            },
            "posting_frequency": "medium",
            "engagement_style": "analytical",
        }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CINEMATIC OASIS ADAPTER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class CinematicOASIS:
    """
    Wrapper around CAMEL-AI OASIS that speaks screenplay language.
    
    Usage:
        cinema = CinematicOASIS()
        
        # Add characters
        cinema.add_character(ScreenplayCharacter(...))
        cinema.add_cinephile(CinephileAgent(...))
        
        # Set location
        cinema.set_location(CinematicLocation(...))
        
        # Run simulation
        result = await cinema.simulate(turns=20)
        
        # Get screenplay-formatted output
        fountain = cinema.to_fountain()
    """
    
    def __init__(self, model_type: str = "gpt-4o-mini"):
        self.model = ModelFactory.create(
            model_platform=ModelPlatformType.OPENAI,
            model_type=getattr(ModelType, model_type.upper().replace("-", "_")),
        )
        
        self.characters: List[ScreenplayCharacter] = []
        self.cinephiles: List[CinephileAgent] = []
        self.location: Optional[CinematicLocation] = None
        self.simulation_history: List[Dict] = []
        
        self.oasis_env = None
    
    def add_character(self, character: ScreenplayCharacter):
        """Add a screenplay character to the simulation"""
        self.characters.append(character)
    
    def add_cinephile(self, cinephile: CinephileAgent):
        """Add a film critic/observer agent"""
        self.cinephiles.append(cinephile)
    
    def set_location(self, location: CinematicLocation):
        """Set the scene location"""
        self.location = location
    
    async def initialize(self):
        """
        Initialize OASIS environment with cinematic adaptations.
        """
        if not self.location:
            raise ValueError("Must set location before initializing")
        
        # Convert all characters to OASIS profiles
        all_profiles = (
            [c.to_oasis_profile() for c in self.characters] +
            [c.to_oasis_profile() for c in self.cinephiles]
        )
        
        # Create OASIS agent graph
        agent_graph = await oasis.generate_custom_agent_graph(
            profiles=all_profiles,
            model=self.model,
        )
        
        # Map cinematic actions to OASIS actions
        available_oasis_actions = self._map_actions_to_oasis(
            self.location.available_actions
        )
        
        # Create environment
        self.oasis_env = oasis.make(
            agent_graph=agent_graph,
            platform=self.location.to_oasis_platform(),
            available_actions=available_oasis_actions,
            database_path=":memory:",  # In-memory for screenplay simulation
        )
        
        await self.oasis_env.reset()
    
    def _map_actions_to_oasis(
        self, 
        cinematic_actions: List[CinematicActionType]
    ) -> List[OASISActionType]:
        """Map cinematic actions to OASIS core actions"""
        oasis_actions = []
        for action in cinematic_actions:
            if action in CINEMATIC_TO_OASIS_MAPPING:
                oasis_actions.append(CINEMATIC_TO_OASIS_MAPPING[action])
        
        # Always include some core actions
        oasis_actions.extend([
            OASISActionType.DO_NOTHING,
            OASISActionType.SEARCH_POSTS,  # Observe
            OASISActionType.REFRESH,       # React to new info
        ])
        
        return list(set(oasis_actions))  # Remove duplicates
    
    async def simulate(self, turns: int = 20) -> Dict[str, Any]:
        """
        Run the scene simulation.
        
        Returns:
            Dictionary with dialogue, actions, relationship changes
        """
        if not self.oasis_env:
            await self.initialize()
        
        results = []
        for turn in range(turns):
            observations, actions_taken = await self.oasis_env.step()
            
            # Record turn
            turn_data = {
                "turn": turn,
                "location": self.location.name,
                "time": self.location.time,
                "actions": self._interpret_actions(actions_taken),
                "state": await self._capture_state(),
            }
            
            results.append(turn_data)
            self.simulation_history.append(turn_data)
        
        return {
            "turns": results,
            "dialogue": self._extract_dialogue(results),
            "beats": self._extract_story_beats(results),
            "relationships": self._extract_relationships(results),
        }
    
    def _interpret_actions(self, oasis_actions) -> List[Dict]:
        """Convert OASIS actions back to cinematic actions"""
        interpreted = []
        for action in oasis_actions:
            # Reverse-map OASIS action → cinematic action
            cinematic_type = self._reverse_map_action(action.action_type)
            
            interpreted.append({
                "character": action.agent_id,
                "action": cinematic_type,
                "content": action.content if hasattr(action, 'content') else None,
                "target": action.target_id if hasattr(action, 'target_id') else None,
            })
        
        return interpreted
    
    def _reverse_map_action(self, oasis_action: OASISActionType) -> str:
        """Reverse lookup: OASIS action → cinematic action"""
        for cinematic, oasis_equiv in CINEMATIC_TO_OASIS_MAPPING.items():
            if oasis_equiv == oasis_action:
                return cinematic.value
        return "GENERIC_ACTION"
    
    async def _capture_state(self) -> Dict:
        """Capture current simulation state"""
        return {
            "character_states": {},  # TODO: extract from OASIS
            "dramatic_tension": self._compute_tension(),
            "scene_momentum": self._compute_momentum(),
        }
    
    def _compute_tension(self) -> float:
        """Estimate dramatic tension from recent actions"""
        # TODO: analyze conflict, emotion, stakes
        return 0.5
    
    def _compute_momentum(self) -> str:
        """Estimate pacing: slow, moderate, fast"""
        # TODO: analyze action frequency, intensity
        return "moderate"
    
    def _extract_dialogue(self, results: List[Dict]) -> List[Dict]:
        """Extract fountain-formatted dialogue"""
        dialogue = []
        for turn in results:
            for action in turn["actions"]:
                if action["action"] in [
                    CinematicActionType.SPEAK_DIALOGUE.value,
                    CinematicActionType.WHISPER.value,
                    CinematicActionType.SHOUT.value,
                ]:
                    dialogue.append({
                        "character": action["character"].upper(),
                        "line": action["content"],
                        "type": action["action"],
                        "turn": turn["turn"],
                    })
        return dialogue
    
    def _extract_story_beats(self, results: List[Dict]) -> List[str]:
        """Identify emergent story beats"""
        beats = []
        # TODO: detect reveals, conflicts, resolutions
        return beats
    
    def _extract_relationships(self, results: List[Dict]) -> Dict:
        """Track relationship changes"""
        # TODO: detect alliances, betrayals, bonds
        return {}
    
    def to_fountain(self) -> str:
        """
        Convert simulation to Fountain screenplay format.
        
        Returns:
            Properly formatted Fountain text
        """
        lines = []
        
        # Scene heading
        if self.location:
            lines.append(
                f"{self.location.location_type}. {self.location.name} - {self.location.time}\n"
            )
        
        # Dialogue from simulation
        for entry in self._extract_dialogue(self.simulation_history):
            lines.append(f"\n{entry['character']}")
            
            # Add parenthetical if not standard dialogue
            if entry['type'] == CinematicActionType.WHISPER.value:
                lines.append("(whispers)")
            elif entry['type'] == CinematicActionType.SHOUT.value:
                lines.append("(shouting)")
            
            lines.append(entry['line'])
        
        return "\n".join(lines)
    
    def to_json(self) -> Dict:
        """Export full simulation state as JSON"""
        return {
            "location": self.location.to_oasis_platform() if self.location else None,
            "characters": [c.to_oasis_profile() for c in self.characters],
            "cinephiles": [c.to_oasis_profile() for c in self.cinephiles],
            "history": self.simulation_history,
        }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# EXAMPLE USAGE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def example_noir_interrogation():
    """
    Example: Film noir interrogation scene with cinephile commentary
    """
    # Create cinematic OASIS instance
    cinema = CinematicOASIS(model_type="gpt-4o-mini")
    
    # Define characters
    detective = ScreenplayCharacter(
        name="MARLOWE",
        archetype="hard-boiled detective",
        personality="cynical, observant, world-weary",
        goals=["extract confession", "solve murder"],
        fears=["being outsmarted", "losing control"],
        secrets=["knows suspect is lying"],
        relationships={"FEMME_FATALE": "suspicious_attraction"},
        voice={"style": "terse", "vocab": "street-smart"},
        background="20 years LAPD, seen it all",
        arc="redemption",
        dialogue_style="terse",
    )
    
    femme_fatale = ScreenplayCharacter(
        name="VELMA",
        archetype="femme fatale",
        personality="seductive, manipulative, intelligent",
        goals=["evade suspicion", "protect secret"],
        fears=["being caught", "losing power"],
        secrets=["murdered the victim", "has escape plan"],
        relationships={"MARLOWE": "manipulate"},
        voice={"style": "smooth", "vocab": "educated"},
        background="High society, dark past",
        arc="tragic downfall",
        dialogue_style="verbose",
    )
    
    # Add a cinephile observer
    cinephile = CinephileAgent(
        name="Roger Ebert",
        expertise="Film critic, noir scholar",
        preferences=["film noir", "character studies", "Chandler adaptations"],
        critical_style="academic",
        reference_knowledge=10,
    )
    
    # Add to simulation
    cinema.add_character(detective)
    cinema.add_character(femme_fatale)
    cinema.add_cinephile(cinephile)
    
    # Set location
    interrogation_room = CinematicLocation(
        name="POLICE STATION - INTERROGATION ROOM",
        location_type="INT",
        time="NIGHT",
        world_type=CinematicEnvironmentType.CRIME_THRILLER,
        atmosphere="tense, claustrophobic",
        available_actions=[
            CinematicActionType.SPEAK_DIALOGUE,
            CinematicActionType.ASK_QUESTION,
            CinematicActionType.LIE,
            CinematicActionType.CONFRONT,
            CinematicActionType.OBSERVE,
            CinematicActionType.REACT_EMOTIONALLY,
            CinematicActionType.REFERENCE_FILM,  # For cinephile
            CinematicActionType.ANALYZE_SCENE,   # For cinephile
        ],
        capacity=3,
    )
    
    cinema.set_location(interrogation_room)
    
    # Run simulation
    print("🎬 Simulating noir interrogation scene...")
    result = await cinema.simulate(turns=15)
    
    # Output
    print("\n" + "="*60)
    print("GENERATED SCREENPLAY (Fountain format)")
    print("="*60)
    print(cinema.to_fountain())
    
    print("\n" + "="*60)
    print("SIMULATION ANALYSIS")
    print("="*60)
    print(f"Dialogue lines: {len(result['dialogue'])}")
    print(f"Story beats: {len(result['beats'])}")
    print(f"Relationship changes: {len(result['relationships'])}")
    
    return cinema


if __name__ == "__main__":
    # Run example
    asyncio.run(example_noir_interrogation())
