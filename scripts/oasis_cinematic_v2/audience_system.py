"""
OASIS v2 Cinematic Audience Simulation System
Simulates 1000+ concurrent viewers with different personas
Tracks engagement, emotion, confusion, and predictability
"""

import random
import numpy as np
from typing import Dict, List, Optional, Tuple, Set
from dataclasses import dataclass, field
from enum import Enum
import json
from collections import defaultdict, deque
import math


# Test file creation
print("Audience system initialized")


# ============================================================================
# ENUMERATIONS AND DATA STRUCTURES
# ============================================================================

class ViewerType(Enum):
    """Types of viewers with different viewing modes"""
    CASUAL = "casual"
    GENRE_FAN = "genre_fan"
    CINEPHILE = "cinephile"
    CRITIC = "critic"
    SUPERFAN = "superfan"


class GenreKnowledge(Enum):
    """Level of genre-specific knowledge"""
    NONE = 0
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    EXPERT = 4


class FilmLiteracy(Enum):
    """Understanding of film language and techniques"""
    BASIC = 1
    INTERMEDIATE = 2
    ADVANCED = 3
    EXPERT = 4


class EngagementLevel(Enum):
    """Current engagement state"""
    DISENGAGED = 0
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    PEAK = 4


class EmotionType(Enum):
    """Types of emotional responses"""
    JOY = "joy"
    SADNESS = "sadness"
    FEAR = "fear"
    ANGER = "anger"
    SURPRISE = "surprise"
    DISGUST = "disgust"
    ANTICIPATION = "anticipation"
    TRUST = "trust"
    TENSION = "tension"
    RELIEF = "relief"
    EMPATHY = "empathy"
    SATISFACTION = "satisfaction"


class ConfusionType(Enum):
    """Types of confusion viewers can experience"""
    CHARACTER = "character"  # Who is this person?
    PLOT = "plot"  # What just happened?
    TIMELINE = "timeline"  # When is this?
    MOTIVATION = "motivation"  # Why did they do that?
    RELATIONSHIP = "relationship"  # How are these people connected?
    LOCATION = "location"  # Where are we?
    THEME = "theme"  # What's the point?


@dataclass
class ViewingMoment:
    """Represents a single moment in the viewing experience"""
    timestamp: float
    scene_id: str
    engagement: float
    attention: float
    emotions: Dict[EmotionType, float]
    confusion: Dict[ConfusionType, float]
    boredom: float
    investment: float
    predictability: float
    surprise: float
    
    
@dataclass
class CharacterEmpathy:
    """Tracks empathy for a specific character"""
    character_id: str
    character_name: str
    empathy_level: float
    sympathy_level: float
    identification: float
    understanding: float
    rooting_interest: float
    moments: List[Tuple[float, float]]  # (timestamp, empathy_change)


@dataclass
class PlotPrediction:
    """Viewer's prediction about plot developments"""
    timestamp: float
    prediction: str
    confidence: float
    correct: Optional[bool] = None
    surprise_factor: float = 0.0


@dataclass
class DropOffRisk:
    """Risk factors for viewer dropping off"""
    timestamp: float
    risk_score: float
    factors: Dict[str, float]
    reasons: List[str]


# ============================================================================
# VIEWER PERSONA CLASS
# ============================================================================

class ViewerPersona:
    """
    Represents a single viewer with specific characteristics, preferences,
    and viewing behaviors. Tracks their experience throughout the content.
    """
    
    def __init__(
        self,
        viewer_id: str,
        viewer_type: ViewerType,
        film_literacy: FilmLiteracy = FilmLiteracy.INTERMEDIATE,
        genre_knowledge: Dict[str, GenreKnowledge] = None,
        attention_span: float = 0.7,
        patience: float = 0.7,
        emotional_sensitivity: float = 0.7,
        analytical_tendency: float = 0.5,
        franchise_knowledge: Dict[str, float] = None,
        preferences: Dict[str, float] = None
    ):
        """
        Initialize a viewer persona
        
        Args:
            viewer_id: Unique identifier
            viewer_type: Type of viewer (casual, cinephile, etc.)
            film_literacy: Understanding of film language
            genre_knowledge: Knowledge level for different genres
            attention_span: How long they can maintain focus (0-1)
            patience: Tolerance for slow pacing (0-1)
            emotional_sensitivity: How strongly they respond emotionally (0-1)
            analytical_tendency: How much they analyze vs just experience (0-1)
            franchise_knowledge: Familiarity with specific franchises
            preferences: Personal preferences for content attributes
        """
        self.viewer_id = viewer_id
        self.viewer_type = viewer_type
        self.film_literacy = film_literacy
        self.genre_knowledge = genre_knowledge or {}
        self.attention_span = attention_span
        self.patience = patience
        self.emotional_sensitivity = emotional_sensitivity
        self.analytical_tendency = analytical_tendency
        self.franchise_knowledge = franchise_knowledge or {}
        self.preferences = preferences or self._generate_default_preferences()
        
        # Viewing state
        self.current_engagement = EngagementLevel.MEDIUM
        self.current_attention = 0.7
        self.cumulative_boredom = 0.0
        self.cumulative_confusion = 0.0
        self.emotional_investment = 0.0
        self.dropped_off = False
        self.drop_off_time = None
        
        # Memory and understanding
        self.character_memory: Dict[str, Dict] = {}
        self.plot_understanding: List[Dict] = []
        self.timeline_model: List[Dict] = []
        self.relationship_map: Dict[Tuple[str, str], str] = {}
        self.predictions: List[PlotPrediction] = []
        
        # Character empathy tracking
        self.character_empathy: Dict[str, CharacterEmpathy] = {}
        
        # Experience history
        self.viewing_history: List[ViewingMoment] = []
        self.confusion_events: List[Dict] = []
        self.emotional_peaks: List[Dict] = []
        self.boredom_periods: List[Tuple[float, float]] = []
        
    def _generate_default_preferences(self) -> Dict[str, float]:
        """Generate default preferences based on viewer type"""
        base_prefs = {
            'action': 0.5,
            'dialogue': 0.5,
            'character_development': 0.5,
            'plot_complexity': 0.5,
            'visual_spectacle': 0.5,
            'emotional_depth': 0.5,
            'humor': 0.5,
            'mystery': 0.5,
            'romance': 0.5,
            'violence': 0.5,
            'pacing_fast': 0.5,
            'originality': 0.5,
            'predictability': 0.5
        }
        
        # Adjust based on viewer type
        if self.viewer_type == ViewerType.CASUAL:
            base_prefs.update({
                'plot_complexity': 0.3,
                'pacing_fast': 0.7,
                'visual_spectacle': 0.8,
                'predictability': 0.6
            })
        elif self.viewer_type == ViewerType.GENRE_FAN:
            base_prefs.update({
                'genre_conventions': 0.8,
                'references': 0.7,
                'originality': 0.6
            })
        elif self.viewer_type == ViewerType.CINEPHILE:
            base_prefs.update({
                'cinematography': 0.9,
                'originality': 0.9,
                'character_development': 0.8,
                'subtlety': 0.8
            })
        elif self.viewer_type == ViewerType.CRITIC:
            base_prefs.update({
                'craft': 0.9,
                'originality': 0.9,
                'thematic_depth': 0.9,
                'execution': 0.9
            })
        elif self.viewer_type == ViewerType.SUPERFAN:
            base_prefs.update({
                'continuity': 0.9,
                'fan_service': 0.8,
                'character_consistency': 0.9
            })
            
        return base_prefs
    
    def get_genre_knowledge_level(self, genre: str) -> GenreKnowledge:
        """Get knowledge level for a specific genre"""
        return self.genre_knowled


# ============================================================================
# ENGAGEMENT TRACKER CLASS
# ============================================================================

class EngagementTracker:
    """
    Tracks moment-to-moment engagement for viewers.
    Detects boredom, attention drift, and predicts drop-off.
    """
    
    def __init__(
        self,
        boredom_threshold: float = 0.6,
        confusion_threshold: float = 0.7,
        attention_decay_rate: float = 0.95,
        engagement_recovery_rate: float = 1.05
    ):
        """
        Initialize engagement tracker
        
        Args:
            boredom_threshold: Level at which boredom becomes problematic
            confusion_threshold: Level at which confusion causes disengagement
            attention_decay_rate: How quickly attention decays during slow moments
            engagement_recovery_rate: How quickly engagement recovers during exciting moments
        """
        self.boredom_threshold = boredom_threshold
        self.confusion_threshold = confusion_threshold
        self.attention_decay_rate = attention_decay_rate
        self.engagement_recovery_rate = engagement_recovery_rate
        
        # Tracking state
        self.attention_history: deque = deque(maxlen=100)
        self.engagement_history: deque = deque(maxlen=100)
        self.boredom_accumulator: float = 0.0
        self.last_excitement_timestamp: float = 0.0
        self.consecutive_boring_moments: int = 0
        
    def update_engagement(
        self,
        viewer: ViewerPersona,
        timestamp: float,
        scene_data: Dict,
        narrative_state: Dict
    ) -> Tuple[float, float, Dict]:
        """
        Update engagement metrics for a viewer at a given moment
        
        Args:
            viewer: The viewer persona
            timestamp: Current timestamp
            scene_data: Information about current scene
            narrative_state: Current narrative state
            
        Returns:
            Tuple of (engagement_level, attention_level, metrics_dict)
        """
        # Calculate base engagement from scene attributes
        base_engagement = self._calculate_base_engagement(viewer, scene_data)
        
        # Factor in pacing
        pacing_factor = self._calculate_pacing_factor(
            viewer, 
            scene_data.get('pacing', 0.5),
            timestamp
        )
        
        # Factor in novelty
        novelty_factor = self._calculate_novelty_factor(
            viewer,
            scene_data.get('novelty', 0.5)
        )
        
        # Factor in stakes
        stakes_factor = self._calculate_stakes_factor(
            viewer,
            narrative_state.get('stakes', 0.5)
        )
        
        # Combine factors
        engagement = base_engagement * pacing_factor * novelty_factor * stakes_factor
        engagement = np.clip(engagement, 0.0, 1.0)
        
        # Update attention based on engagement
        attention = self._update_attention(viewer, engagement, timestamp)
        
        # Detect boredom
        boredom_level = self._detect_boredom(
            viewer,
            engagement,
            scene_data.get('pacing', 0.5),
            timestamp
        )
        
        # Update histories
        self.attention_history.append(attention)
        self.engagement_history.append(engagement)
        
        # Update viewer state
        viewer.current_attention = attention
        viewer.cumulative_boredom += boredom_level
        
        # Determine engagement level enum
        if engagement < 0.3:
            viewer.current_engagement = EngagementLevel.DISENGAGED
        elif engagement < 0.5:
            viewer.current_engagement = EngagementLevel.LOW
        elif engagement < 0.7:
            viewer.current_engagement = EngagementLevel.MEDIUM
        elif engagement < 0.9:
            viewer.current_engagement = EngagementLevel.HIGH
        else:
            viewer.current_engagement = EngagementLevel.PEAK
            
        metrics = {
            'engagement': engagement,
            'attention': attention,
            'boredom': boredom_level,
            'pacing_factor': pacing_factor,
            'novelty_factor': novelty_factor,
            'stakes_factor': stakes_factor,
            'consecutive_boring': self.consecutive_boring_moments
        }
        
        return engagement, attention, metrics
    
    def _calculate_base_engagement(
        self,
        viewer: ViewerPersona,
        scene_data: Dict
    ) -> float:
        """Calculate base engagement from scene content"""
        engagement = 0.5  # Neutral starting point
        
        # Check scene attributes against viewer preferences
        scene_attributes = scene_data.get('attributes', {})
        
        for attribute, value in scene_attributes.items():
            if attribute in viewer.preferences:
                preference = viewer.preferences[attribute]
                # Positive contribution if preference matches presence
                contribution = (preference - 0.5) * value * 0.3
                engagement += contribution
                
        # Viewer type specific adjustments
        if viewer.viewer_type == ViewerType.CASUAL:
            # Casual viewers like clear, entertaining content
            if scene_data.get('clarity', 0.5) > 0.7:
                engagement += 0.1
            if scene_data.get('entertainment_value', 0.5) > 0.7:
                engagement += 0.15
                
        elif viewer.viewer_type == ViewerType.CINEPHILE:
            # Cinephiles appreciate craft and artistry
            if scene_data.get('cinematography_quality', 0.5) > 0.7:
                engagement += 0.15
            if scene_data.get('subtlety', 0.5) > 0.6:
                engagement += 0.1
                
        elif viewer.viewer_type == ViewerType.CRITIC:
            # Critics focus on execution and originality
            if scene_data.get('execution_quality', 0.5) > 0.7:
                engagement += 0.15
            if scene_data.get('originality', 0.5) > 0.6:
                engagement += 0.1
                
        return np.clip(engagement, 0.0, 1.0)
    
    def _calculate_pacing_factor(
        self,
        viewer: ViewerPersona,
        pacing: float,
        timestamp: float
    ) -> float:
        """Calculate how pacing affects engagement"""
        # Different viewers have different pacing preferences
        optimal_pacing = viewer.preferences.get('pacing_fast', 0.5)
        
        # Calculate deviation from optimal
        pacing_deviation = abs(pacing - optimal_pacing)
        
        # Patience affects tolerance for slow pacing
        if pacing < 0.4:  # Slow scene
            factor = 0.7 + (viewer.patience * 0.3)
            
            # Track consecutive slow moments
            if pacing < 0.3:
                self.consecutive_boring_moments += 1
            else:
                self.consecutive_boring_moments = max(0, self.consecutive_boring_moments - 1)
                
        elif pacing > 0.7:  # Fast scene
            factor = 1.2
            self.consecutive_boring_moments = 0
            self.last_excitement_timestamp = timestamp
        else:  # Medium pacing
            factor = 1.0
            self.consecutive_boring_moments = max(0, self.consecutive_boring_moments - 1)
            
        # Reduce factor if pacing doesn't match preference
        factor *= (1.0 - pacing_deviation * 0.5)
        
        return max(0.3, min(1.5, factor))
    
    def _calculate_novelty_factor(
        self,
        viewer: ViewerPersona,
        novelty: float
    ) -> float:
        """Calculate how novelty/freshness affects engagement"""
        # Diff


# ============================================================================
# CONFUSION DETECTOR CLASS
# ============================================================================

class ConfusionDetector:
    """
    Detects and tracks different types of confusion that viewers experience.
    Analyzes when and why viewers get confused about the narrative.
    """
    
    def __init__(
        self,
        character_threshold: int = 8,
        timeline_complexity_threshold: float = 0.7,
        plot_thread_threshold: int = 5
    ):
        """
        Initialize confusion detector
        
        Args:
            character_threshold: Max characters before confusion likely
            timeline_complexity_threshold: Max timeline complexity before confusion
            plot_thread_threshold: Max simultaneous plot threads before confusion
        """
        self.character_threshold = character_threshold
        self.timeline_complexity_threshold = timeline_complexity_threshold
        self.plot_thread_threshold = plot_thread_threshold
        
        # Tracking state
        self.confusion_events: List[Dict] = []
        self.character_introductions: List[Dict] = []
        self.timeline_shifts: List[Dict] = []
        self.plot_threads: List[Dict] = []
        
    def detect_confusion(
        self,
        viewer: ViewerPersona,
        timestamp: float,
        scene_data: Dict,
        narrative_state: Dict
    ) -> Dict[ConfusionType, float]:
        """
        Detect all types of confusion for a viewer at current moment
        
        Args:
            viewer: The viewer persona
            timestamp: Current timestamp
            scene_data: Information about current scene
            narrative_state: Current narrative state
            
        Returns:
            Dictionary mapping confusion types to levels (0-1)
        """
        confusion_levels = {}
        
        # Detect character confusion
        char_confusion = self._detect_character_confusion(
            viewer, timestamp, scene_data, narrative_state
        )
        if char_confusion > 0:
            confusion_levels[ConfusionType.CHARACTER] = char_confusion
            
        # Detect plot confusion
        plot_confusion = self._detect_plot_confusion(
            viewer, timestamp, scene_data, narrative_state
        )
        if plot_confusion > 0:
            confusion_levels[ConfusionType.PLOT] = plot_confusion
            
        # Detect timeline confusion
        timeline_confusion = self._detect_timeline_confusion(
            viewer, timestamp, scene_data, narrative_state
        )
        if timeline_confusion > 0:
            confusion_levels[ConfusionType.TIMELINE] = timeline_confusion
            
        # Detect motivation confusion
        motivation_confusion = self._detect_motivation_confusion(
            viewer, timestamp, scene_data, narrative_state
        )
        if motivation_confusion > 0:
            confusion_levels[ConfusionType.MOTIVATION] = motivation_confusion
            
        # Detect relationship confusion
        relationship_confusion = self._detect_relationship_confusion(
            viewer, timestamp, scene_data, narrative_state
        )
        if relationship_confusion > 0:
            confusion_levels[ConfusionType.RELATIONSHIP] = relationship_confusion
            
        # Detect location confusion
        location_confusion = self._detect_location_confusion(
            viewer, timestamp, scene_data, narrative_state
        )
        if location_confusion > 0:
            confusion_levels[ConfusionType.LOCATION] = location_confusion
            
        # Update viewer's cumulative confusion
        total_confusion = sum(confusion_levels.values()) / max(1, len(confusion_levels))
        viewer.cumulative_confusion += total_confusion * 0.1
        viewer.cumulative_confusion = min(1.0, viewer.cumulative_confusion)
        
        # Record significant confusion events
        if total_confusion > 0.5:
            viewer.confusion_events.append({
                'timestamp': timestamp,
                'types': list(confusion_levels.keys()),
                'levels': confusion_levels,
                'total': total_confusion
            })
            
        return confusion_levels
    
    def _detect_character_confusion(
        self,
        viewer: ViewerPersona,
        timestamp: float,
        scene_data: Dict,
        narrative_state: Dict
    ) -> float:
        """Detect confusion about characters"""
        confusion = 0.0
        
        # Too many characters?
        character_count = narrative_state.get('active_character_count', 0)
        if character_count > self.character_threshold:
            # Casual viewers confused with fewer characters
            threshold = self.character_threshold
            if viewer.viewer_type == ViewerType.CASUAL:
                threshold *= 0.7
            elif viewer.viewer_type in [ViewerType.CINEPHILE, ViewerType.CRITIC]:
                threshold *= 1.3
                
            if character_count > threshold:
                overflow = (character_count - threshold) / threshold
                confusion += min(0.5, overflow * 0.4)
                
        # New character introduced?
        if scene_data.get('new_character_introduced', False):
            character_id = scene_data.get('new_character_id')
            character_name = scene_data.get('new_character_name', 'Unknown')
            
            # Check if viewer can accommodate new character
            if len(viewer.character_memory) > threshold * 0.8:
                confusion += 0.2
                
            # Similar names to existing characters?
            for char_id, char_mem in viewer.character_memory.items():
                if self._names_similar(character_name, char_mem['name']):
                    confusion += 0.3
                    break
                    
            # Track introduction
            self.character_introductions.append({
                'timestamp': timestamp,
                'character_id': character_id,
                'character_name': character_name,
                'viewer_id': viewer.viewer_id
            })
            
        # Character returns after long absence?
        returning_character = scene_data.get('returning_character_id')
        if returning_character:
            recall = viewer.recall_character(returning_character)
            if recall is None:
                confusion += 0.4  # Can't remember this character
            elif recall.get('confusion_events', 0) > 0:
                confusion += 0.2  # Previously confused about this character
                
        # Multiple similar-looking characters in scene?
        if scene_data.get('similar_characters_present', 0) > 2:
            confusion += 0.25
            
        return min(1.0, confusion)
    
    def _detect_plot_confusion(
        self,
        viewer: ViewerPersona,
        timestamp: float,
        scene_data: Dict,
        narrative_state: Dict
    ) -> float:
        """Detect confusion about plot developments"""
        confusion = 0.0
        
        # Too many simultaneous plot threads?
        active_threads = narrative_state.get('active_plot_threads', 1)
        if active_threads > self.plot_thread_threshold:
            # Adjust threshold by viewer type
            threshold = self.plot_thread_threshold
            if viewer.viewer_type == ViewerType.CASUAL:
                threshold *= 0.7
            elif viewer.viewer_type in [ViewerType.CINEPHILE, ViewerType.CRITIC]:
                threshold *= 1.3
                
            if active_threads > threshold:
                overflow = (active_threads - threshold) / 


# ============================================================================
# EMOTIONAL RESPONSE MODEL CLASS
# ============================================================================

class EmotionalResponseModel:
    """
    Models emotional responses of viewers throughout the content.
    Tracks empathy, tension, surprise, catharsis, and emotional satisfaction.
    """
    
    def __init__(
        self,
        emotion_decay_rate: float = 0.95,
        empathy_build_rate: float = 0.02,
        tension_build_rate: float = 0.03,
        catharsis_threshold: float = 0.7
    ):
        """
        Initialize emotional response model
        
        Args:
            emotion_decay_rate: How quickly emotions fade
            empathy_build_rate: How quickly empathy builds with characters
            tension_build_rate: How quickly tension accumulates
            catharsis_threshold: Tension level needed for catharsis
        """
        self.emotion_decay_rate = emotion_decay_rate
        self.empathy_build_rate = empathy_build_rate
        self.tension_build_rate = tension_build_rate
        self.catharsis_threshold = catharsis_threshold
        
        # Emotional state tracking
        self.current_emotions: Dict[EmotionType, float] = {
            emotion: 0.0 for emotion in EmotionType
        }
        self.emotion_history: List[Dict] = []
        self.tension_curve: List[Tuple[float, float]] = []
        self.catharsis_moments: List[Dict] = []
        
    def update_emotions(
        self,
        viewer: ViewerPersona,
        timestamp: float,
        scene_data: Dict,
        narrative_state: Dict
    ) -> Dict[EmotionType, float]:
        """
        Update emotional state for viewer at current moment
        
        Args:
            viewer: The viewer persona
            timestamp: Current timestamp
            scene_data: Information about current scene
            narrative_state: Current narrative state
            
        Returns:
            Dictionary of current emotion levels
        """
        # Decay existing emotions
        for emotion in EmotionType:
            self.current_emotions[emotion] *= self.emotion_decay_rate
            
        # Process scene emotional content
        scene_emotions = scene_data.get('emotions', {})
        
        for emotion_name, intensity in scene_emotions.items():
            try:
                emotion_type = EmotionType(emotion_name)
                self._process_emotion(
                    viewer, emotion_type, intensity, scene_data, narrative_state
                )
            except ValueError:
                pass  # Unknown emotion type
                
        # Update character empathy
        self._update_character_empathy(viewer, timestamp, scene_data, narrative_state)
        
        # Update tension
        tension_level = self._update_tension(viewer, timestamp, scene_data, narrative_state)
        self.tension_curve.append((timestamp, tension_level))
        
        # Check for catharsis
        self._check_catharsis(viewer, timestamp, scene_data, tension_level)
        
        # Update emotional investment
        self._update_emotional_investment(viewer, timestamp)
        
        # Record emotional state
        self.emotion_history.append({
            'timestamp': timestamp,
            'emotions': dict(self.current_emotions),
            'tension': tension_level,
            'investment': viewer.emotional_investment
        })
        
        return dict(self.current_emotions)
    
    def _process_emotion(
        self,
        viewer: ViewerPersona,
        emotion_type: EmotionType,
        intensity: float,
        scene_data: Dict,
        narrative_state: Dict
    ):
        """Process a specific emotion from the scene"""
        # Base emotional response modified by sensitivity
        response = intensity * viewer.emotional_sensitivity
        
        # Different viewer types respond differently to emotions
        if viewer.viewer_type == ViewerType.CASUAL:
            # Casual viewers respond more to surface emotions
            if emotion_type in [EmotionType.JOY, EmotionType.FEAR, EmotionType.SURPRISE]:
                response *= 1.2
            elif emotion_type in [EmotionType.EMPATHY, EmotionType.TRUST]:
                response *= 0.8
                
        elif viewer.viewer_type == ViewerType.CINEPHILE:
            # Cinephiles appreciate subtle emotional work
            subtlety = scene_data.get('emotional_subtlety', 0.5)
            if subtlety > 0.6:
                response *= 1.3
            elif subtlety < 0.3:
                response *= 0.8  # Too on-the-nose
                
        elif viewer.viewer_type == ViewerType.CRITIC:
            # Critics evaluate emotional authenticity
            authenticity = scene_data.get('emotional_authenticity', 0.7)
            response *= (0.5 + authenticity * 0.7)
            
        # Emotional investment amplifies emotional response
        response *= (0.7 + viewer.emotional_investment * 0.5)
        
        # Update emotion level
        self.current_emotions[emotion_type] += response
        self.current_emotions[emotion_type] = min(1.0, self.current_emotions[emotion_type])
    
    def _update_character_empathy(
        self,
        viewer: ViewerPersona,
        timestamp: float,
        scene_data: Dict,
        narrative_state: Dict
    ):
        """Update empathy levels for characters in scene"""
        characters_in_scene = scene_data.get('characters', [])
        
        for char_data in characters_in_scene:
            char_id = char_data.get('character_id')
            char_name = char_data.get('character_name', 'Unknown')
            
            # Get or create empathy tracking
            if char_id not in viewer.character_empathy:
                viewer.character_empathy[char_id] = CharacterEmpathy(
                    character_id=char_id,
                    character_name=char_name,
                    empathy_level=0.0,
                    sympathy_level=0.0,
                    identification=0.0,
                    understanding=0.0,
                    rooting_interest=0.0,
                    moments=[]
                )
                
            empathy = viewer.character_empathy[char_id]
            
            # Calculate empathy change
            empathy_change = self._calculate_empathy_change(
                viewer, char_data, scene_data, narrative_state
            )
            
            # Update empathy
            empathy.empathy_level += empathy_change
            empathy.empathy_level = np.clip(empathy.empathy_level, -1.0, 1.0)
            
            # Update other empathy dimensions
            self._update_sympathy(viewer, empathy, char_data, scene_data)
            self._update_identification(viewer, empathy, char_data, scene_data)
            self._update_understanding(viewer, empathy, char_data, scene_data)
            self._update_rooting_interest(viewer, empathy, char_data, scene_data)
            
            # Record moment
            empathy.moments.append((timestamp, empathy.empathy_level))
    
    def _calculate_empathy_change(
        self,
        viewer: ViewerPersona,
        char_data: Dict,
        scene_data: Dict,
        narrative_state: Dict
    ) -> float:
        """Calculate how much empathy changes for a character"""
        change = 0.0
        
        # Character experiences something emotional?
        char_emotion = char_data.get('emotion', None)
        char_emotion_intensity = char_data.get('emotion_intensity', 0.0)
        
        if char_emotion:
            # Viewer empathizes based on emotional sensitivity
            empathy_response = char_emotion_inte


# ============================================================================
# PREDICTABILITY ANALYZER CLASS
# ============================================================================

class PredictabilityAnalyzer:
    """
    Analyzes plot twists, surprises, and the balance between predictability
    and surprise. Evaluates setup/payoff effectiveness and red herrings.
    """
    
    def __init__(
        self,
        optimal_predictability: float = 0.5,
        setup_memory_window: float = 1800,  # 30 minutes
        twist_effectiveness_threshold: float = 0.6
    ):
        """
        Initialize predictability analyzer
        
        Args:
            optimal_predictability: Ideal balance between predictable and surprising
            setup_memory_window: How long setups remain in memory
            twist_effectiveness_threshold: Minimum effectiveness for successful twist
        """
        self.optimal_predictability = optimal_predictability
        self.setup_memory_window = setup_memory_window
        self.twist_effectiveness_threshold = twist_effectiveness_threshold
        
        # Tracking
        self.setups: List[Dict] = []
        self.payoffs: List[Dict] = []
        self.twists: List[Dict] = []
        self.red_herrings: List[Dict] = []
        self.predictions: List[PlotPrediction] = []
        
    def analyze_moment(
        self,
        viewer: ViewerPersona,
        timestamp: float,
        scene_data: Dict,
        narrative_state: Dict
    ) -> Dict:
        """
        Analyze predictability at current moment
        
        Args:
            viewer: The viewer persona
            timestamp: Current timestamp
            scene_data: Information about current scene
            narrative_state: Current narrative state
            
        Returns:
            Dictionary with predictability metrics
        """
        analysis = {
            'predictability_score': 0.5,
            'surprise_score': 0.0,
            'setup_payoff_score': 0.0,
            'ahead_of_protagonist': False,
            'viewer_prediction_accuracy': 0.0
        }
        
        # Check for setup moments
        if scene_data.get('is_setup', False):
            self._record_setup(viewer, timestamp, scene_data)
            
        # Check for payoff moments
        if scene_data.get('is_payoff', False):
            payoff_analysis = self._analyze_payoff(viewer, timestamp, scene_data)
            analysis['setup_payoff_score'] = payoff_analysis['effectiveness']
            
        # Check for plot twist
        if scene_data.get('is_twist', False):
            twist_analysis = self._analyze_twist(viewer, timestamp, scene_data, narrative_state)
            analysis['surprise_score'] = twist_analysis['surprise']
            analysis['predictability_score'] = 1.0 - twist_analysis['surprise']
            
        # Check for red herring
        if scene_data.get('is_red_herring', False):
            self._analyze_red_herring(viewer, timestamp, scene_data)
            
        # Check if viewer is ahead of protagonist
        if scene_data.get('protagonist_discovers', False):
            discovery = scene_data.get('discovery_content')
            analysis['ahead_of_protagonist'] = self._is_viewer_ahead(
                viewer, discovery, timestamp
            )
            
        # Evaluate viewer predictions
        if viewer.predictions:
            analysis['viewer_prediction_accuracy'] = self._evaluate_predictions(
                viewer, timestamp, scene_data
            )
            
        # Generate new predictions
        if random.random() < viewer.analytical_tendency:
            self._generate_prediction(viewer, timestamp, narrative_state)
            
        return analysis
    
    def _record_setup(
        self,
        viewer: ViewerPersona,
        timestamp: float,
        scene_data: Dict
    ):
        """Record a setup moment"""
        setup = {
            'timestamp': timestamp,
            'setup_id': scene_data.get('setup_id'),
            'setup_type': scene_data.get('setup_type', 'plot'),
            'subtlety': scene_data.get('setup_subtlety', 0.5),
            'viewer_noticed': self._did_viewer_notice_setup(viewer, scene_data),
            'viewer_id': viewer.viewer_id
        }
        
        self.setups.append(setup)
        
        # Store in viewer's memory
        viewer.plot_understanding.append({
            'timestamp': timestamp,
            'type': 'setup',
            'setup_id': setup['setup_id'],
            'noticed': setup['viewer_noticed']
        })
    
    def _did_viewer_notice_setup(
        self,
        viewer: ViewerPersona,
        scene_data: Dict
    ) -> bool:
        """Determine if viewer noticed the setup"""
        subtlety = scene_data.get('setup_subtlety', 0.5)
        
        # Base noticing probability
        notice_prob = 1.0 - subtlety * 0.6
        
        # Attention affects noticing
        notice_prob *= viewer.current_attention
        
        # Film literacy helps notice subtle setups
        if subtlety > 0.6:
            notice_prob += viewer.film_literacy.value * 0.1
            
        # Analytical viewers notice more
        notice_prob += viewer.analytical_tendency * 0.2
        
        # Viewer type matters
        if viewer.viewer_type in [ViewerType.CRITIC, ViewerType.CINEPHILE]:
            notice_prob *= 1.3
        elif viewer.viewer_type == ViewerType.CASUAL:
            notice_prob *= 0.7
            
        return random.random() < min(0.95, notice_prob)
    
    def _analyze_payoff(
        self,
        viewer: ViewerPersona,
        timestamp: float,
        scene_data: Dict
    ) -> Dict:
        """Analyze a payoff moment"""
        payoff_id = scene_data.get('payoff_id')
        setup_id = scene_data.get('setup_id')
        
        # Find corresponding setup
        corresponding_setup = None
        for setup in reversed(self.setups):
            if setup['setup_id'] == setup_id:
                corresponding_setup = setup
                break
                
        if not corresponding_setup:
            # Payoff without setup - feels unearned
            effectiveness = 0.3
        else:
            # Calculate time between setup and payoff
            time_between = timestamp - corresponding_setup['timestamp']
            
            # Did viewer notice the setup?
            viewer_noticed_setup = corresponding_setup['viewer_noticed']
            
            # Calculate effectiveness
            effectiveness = self._calculate_payoff_effectiveness(
                viewer,
                time_between,
                viewer_noticed_setup,
                scene_data
            )
            
        payoff = {
            'timestamp': timestamp,
            'payoff_id': payoff_id,
            'setup_id': setup_id,
            'effectiveness': effectiveness,
            'viewer_id': viewer.viewer_id
        }
        
        self.payoffs.append(payoff)
        
        return payoff
    
    def _calculate_payoff_effectiveness(
        self,
        viewer: ViewerPersona,
        time_between: float,
        viewer_noticed_setup: bool,
        scene_data: Dict
    ) -> float:
        """Calculate how effective a payoff is"""
        effectiveness = 0.5
        
        # Viewer must have noticed setup for payoff to work
        if not viewer_noticed_setup:
            effectiveness = 0.4
        else:
            effectiveness = 0.7
            
        # Timing matters
        if time_between < 60:
            # Too soon - feels obvious
            effectiveness *= 0.7
        elif time_between < 600:
            # Good timing
            effectiveness *= 1.2
        elif time_between 


# ============================================================================
# AUDIENCE SIMULATOR - MAIN ORCHESTRATOR CLASS
# ============================================================================

class AudienceSimulator:
    """
    Main orchestrator class that simulates 1000+ concurrent viewers.
    Manages viewer personas, tracks aggregate metrics, and provides insights.
    """
    
    def __init__(
        self,
        num_viewers: int = 1000,
        viewer_distribution: Dict[ViewerType, float] = None,
        seed: Optional[int] = None
    ):
        """
        Initialize audience simulator
        
        Args:
            num_viewers: Number of concurrent viewers to simulate
            viewer_distribution: Distribution of viewer types (defaults to realistic mix)
            seed: Random seed for reproducibility
        """
        if seed is not None:
            random.seed(seed)
            np.random.seed(seed)
            
        self.num_viewers = num_viewers
        self.viewer_distribution = viewer_distribution or self._default_distribution()
        
        # Generate viewers
        self.viewers: List[ViewerPersona] = self._generate_viewers()
        
        # Create analyzers for each viewer
        self.engagement_trackers: Dict[str, EngagementTracker] = {}
        self.confusion_detectors: Dict[str, ConfusionDetector] = {}
        self.emotion_models: Dict[str, EmotionalResponseModel] = {}
        self.predictability_analyzers: Dict[str, PredictabilityAnalyzer] = {}
        
        for viewer in self.viewers:
            self.engagement_trackers[viewer.viewer_id] = EngagementTracker()
            self.confusion_detectors[viewer.viewer_id] = ConfusionDetector()
            self.emotion_models[viewer.viewer_id] = EmotionalResponseModel()
            self.predictability_analyzers[viewer.viewer_id] = PredictabilityAnalyzer()
            
        # Aggregate tracking
        self.aggregate_metrics: List[Dict] = []
        self.drop_off_events: List[Dict] = []
        self.current_timestamp: float = 0.0
        
        # Content metadata
        self.content_metadata: Dict = {}
        self.scene_history: List[Dict] = []
        
    def _default_distribution(self) -> Dict[ViewerType, float]:
        """Default realistic viewer type distribution"""
        return {
            ViewerType.CASUAL: 0.50,        # 50% casual viewers
            ViewerType.GENRE_FAN: 0.25,     # 25% genre fans
            ViewerType.CINEPHILE: 0.10,     # 10% cinephiles
            ViewerType.CRITIC: 0.05,        # 5% critics
            ViewerType.SUPERFAN: 0.10       # 10% superfans
        }
    
    def _generate_viewers(self) -> List[ViewerPersona]:
        """Generate viewer personas based on distribution"""
        viewers = []
        
        # Calculate counts for each type
        type_counts = {}
        remaining = self.num_viewers
        
        for viewer_type, proportion in self.viewer_distribution.items():
            count = int(self.num_viewers * proportion)
            type_counts[viewer_type] = count
            remaining -= count
            
        # Add remaining to casual
        if remaining > 0:
            type_counts[ViewerType.CASUAL] += remaining
            
        # Generate viewers
        viewer_id_counter = 0
        for viewer_type, count in type_counts.items():
            for _ in range(count):
                viewer = self._generate_single_viewer(
                    viewer_id=f"viewer_{viewer_id_counter:04d}",
                    viewer_type=viewer_type
                )
                viewers.append(viewer)
                viewer_id_counter += 1
                
        return viewers
    
    def _generate_single_viewer(
        self,
        viewer_id: str,
        viewer_type: ViewerType
    ) -> ViewerPersona:
        """Generate a single viewer persona with randomized attributes"""
        # Base attributes vary by type
        if viewer_type == ViewerType.CASUAL:
            film_literacy = FilmLiteracy(random.choice([1, 2]))
            attention_span = random.uniform(0.4, 0.7)
            patience = random.uniform(0.3, 0.6)
            emotional_sensitivity = random.uniform(0.6, 0.9)
            analytical_tendency = random.uniform(0.1, 0.4)
            
        elif viewer_type == ViewerType.GENRE_FAN:
            film_literacy = FilmLiteracy(random.choice([2, 3]))
            attention_span = random.uniform(0.6, 0.8)
            patience = random.uniform(0.5, 0.8)
            emotional_sensitivity = random.uniform(0.5, 0.8)
            analytical_tendency = random.uniform(0.3, 0.6)
            
            # Genre knowledge
            genre_knowledge = {}
            primary_genre = random.choice(['action', 'horror', 'scifi', 'fantasy', 'thriller'])
            genre_knowledge[primary_genre] = GenreKnowledge.EXPERT
            
        elif viewer_type == ViewerType.CINEPHILE:
            film_literacy = FilmLiteracy(random.choice([3, 4]))
            attention_span = random.uniform(0.7, 0.9)
            patience = random.uniform(0.7, 0.9)
            emotional_sensitivity = random.uniform(0.6, 0.9)
            analytical_tendency = random.uniform(0.6, 0.9)
            
        elif viewer_type == ViewerType.CRITIC:
            film_literacy = FilmLiteracy.EXPERT
            attention_span = random.uniform(0.8, 1.0)
            patience = random.uniform(0.8, 1.0)
            emotional_sensitivity = random.uniform(0.5, 0.8)
            analytical_tendency = random.uniform(0.8, 1.0)
            
        elif viewer_type == ViewerType.SUPERFAN:
            film_literacy = FilmLiteracy(random.choice([2, 3]))
            attention_span = random.uniform(0.8, 1.0)
            patience = random.uniform(0.7, 0.9)
            emotional_sensitivity = random.uniform(0.7, 1.0)
            analytical_tendency = random.uniform(0.5, 0.8)
            
            # High franchise knowledge
            franchise_knowledge = {'main_franchise': random.uniform(0.8, 1.0)}
        else:
            # Default values
            film_literacy = FilmLiteracy.INTERMEDIATE
            attention_span = 0.7
            patience = 0.7
            emotional_sensitivity = 0.7
            analytical_tendency = 0.5
            
        # Create viewer
        viewer = ViewerPersona(
            viewer_id=viewer_id,
            viewer_type=viewer_type,
            film_literacy=film_literacy,
            genre_knowledge=genre_knowledge if viewer_type == ViewerType.GENRE_FAN else {},
            attention_span=attention_span,
            patience=patience,
            emotional_sensitivity=emotional_sensitivity,
            analytical_tendency=analytical_tendency,
            franchise_knowledge=franchise_knowledge if viewer_type == ViewerType.SUPERFAN else {}
        )
        
        return viewer
    
    def simulate_moment(
        self,
        timestamp: float,
        scene_data: Dict,
        narrative_state: Dict
    ) -> Dict:
        """
        Simulate all viewers experiencing a moment
        
        Args:
            timestamp: Current timestamp in seconds
            scene_data: Information about current scene
            narrative_state: Current narrative state
            
        Returns:
            Aggregate metrics for this moment
        """
        self.current_timestamp = timestamp
        
        # Store scene in history
        self.scene_history.append({
            'timestamp': timestamp,
            'scene_data': scene_data,
            'narrative_state': narrative_state
        })
        
        # Process each active viewer
        active_viewers = [v for v in self.viewers if not v.dropped_off]
        
        moment_metrics = {
            'tim


# ============================================================================
# HELPER FUNCTIONS AND UTILITIES
# ============================================================================

def calculate_demographic_split(
    viewers: List[ViewerPersona],
    attribute: str
) -> Dict:
    """Calculate distribution of viewers by attribute"""
    distribution = defaultdict(int)
    
    for viewer in viewers:
        if attribute == 'viewer_type':
            distribution[viewer.viewer_type.value] += 1
        elif attribute == 'film_literacy':
            distribution[viewer.film_literacy.value] += 1
        elif attribute == 'dropped_off':
            distribution[viewer.dropped_off] += 1
        elif attribute == 'engagement_level':
            distribution[viewer.current_engagement.value] += 1
            
    # Convert to percentages
    total = len(viewers)
    percentages = {k: (v / total) * 100 for k, v in distribution.items()}
    
    return {
        'counts': dict(distribution),
        'percentages': percentages
    }


def identify_problem_moments(
    aggregate_metrics: List[Dict],
    threshold: float = 0.4
) -> List[Dict]:
    """Identify moments where engagement drops below threshold"""
    problem_moments = []
    
    for i, moment in enumerate(aggregate_metrics):
        if moment['engagement']['mean'] < threshold:
            # Check if it's a sustained drop
            sustained = False
            if i > 0 and i < len(aggregate_metrics) - 1:
                prev_engagement = aggregate_metrics[i-1]['engagement']['mean']
                next_engagement = aggregate_metrics[i+1]['engagement']['mean']
                if prev_engagement < threshold or next_engagement < threshold:
                    sustained = True
                    
            problem_moments.append({
                'timestamp': moment['timestamp'],
                'engagement_level': moment['engagement']['mean'],
                'attention_level': moment['attention']['mean'],
                'confusion_level': moment['confusion']['mean'],
                'sustained': sustained,
                'active_viewers': moment['active_viewers']
            })
            
    return problem_moments


def calculate_pacing_score(
    aggregate_metrics: List[Dict],
    window_size: int = 5
) -> List[Tuple[float, float]]:
    """Calculate pacing score based on engagement variance"""
    pacing_scores = []
    
    for i in range(len(aggregate_metrics) - window_size):
        window = aggregate_metrics[i:i+window_size]
        
        # Get engagement levels in window
        engagements = [m['engagement']['mean'] for m in window]
        
        # Variance indicates pacing changes
        variance = np.var(engagements)
        mean = np.mean(engagements)
        
        # Good pacing has moderate variance and high mean
        pacing_score = mean * (1.0 + min(variance, 0.2))
        
        timestamp = window[window_size // 2]['timestamp']
        pacing_scores.append((timestamp, pacing_score))
        
    return pacing_scores


def detect_emotional_beats(
    emotion_models: Dict[str, EmotionalResponseModel],
    threshold: float = 0.7
) -> List[Dict]:
    """Detect strong emotional beats across audience"""
    emotional_beats = []
    
    # Aggregate emotion histories
    all_histories = []
    for model in emotion_models.values():
        all_histories.extend(model.emotion_history)
        
    # Sort by timestamp
    all_histories.sort(key=lambda x: x['timestamp'])
    
    # Group by timestamp
    timestamp_groups = defaultdict(list)
    for history in all_histories:
        timestamp_groups[history['timestamp']].append(history)
        
    # Analyze each timestamp
    for timestamp, histories in timestamp_groups.items():
        # Calculate average emotion intensity
        for emotion_type in EmotionType:
            levels = [h['emotions'].get(emotion_type, 0.0) for h in histories]
            avg_level = np.mean(levels)
            
            if avg_level > threshold:
                emotional_beats.append({
                    'timestamp': timestamp,
                    'emotion': emotion_type.value,
                    'intensity': avg_level,
                    'affected_viewers': len([l for l in levels if l > threshold])
                })
                
    return emotional_beats


def calculate_narrative_momentum(
    aggregate_metrics: List[Dict],
    window_size: int = 10
) -> List[Tuple[float, float]]:
    """Calculate narrative momentum (rate of engagement change)"""
    momentum_curve = []
    
    for i in range(window_size, len(aggregate_metrics)):
        current = aggregate_metrics[i]
        previous = aggregate_metrics[i - window_size]
        
        # Change in engagement over window
        engagement_change = current['engagement']['mean'] - previous['engagement']['mean']
        
        # Normalize by window size
        momentum = engagement_change / window_size
        
        momentum_curve.append((current['timestamp'], momentum))
        
    return momentum_curve


def identify_audience_segments(
    viewers: List[ViewerPersona],
    num_segments: int = 5
) -> Dict:
    """Segment audience based on behavior patterns"""
    # Feature vectors for clustering
    features = []
    viewer_ids = []
    
    for viewer in viewers:
        if viewer.viewing_history:
            avg_engagement = np.mean([m.engagement for m in viewer.viewing_history])
            avg_attention = np.mean([m.attention for m in viewer.viewing_history])
            
            feature_vector = [
                avg_engagement,
                avg_attention,
                viewer.emotional_investment,
                viewer.cumulative_confusion,
                viewer.cumulative_boredom,
                1.0 if viewer.dropped_off else 0.0
            ]
            
            features.append(feature_vector)
            viewer_ids.append(viewer.viewer_id)
            
    if not features:
        return {'segments': [], 'assignments': {}}
        
    # Simple k-means-like segmentation
    features_array = np.array(features)
    
    # Normalize features
    means = features_array.mean(axis=0)
    stds = features_array.std(axis=0)
    normalized = (features_array - means) / (stds + 1e-8)
    
    # Assign to segments based on patterns
    segments = defaultdict(list)
    assignments = {}
    
    for i, (viewer_id, feature_vec) in enumerate(zip(viewer_ids, normalized)):
        # Simple heuristic segmentation
        engagement_score = feature_vec[0]
        confusion_score = feature_vec[3]
        dropped = feature_vec[5]
        
        if dropped > 0.5:
            segment = 'dropped_off'
        elif engagement_score > 0.5 and confusion_score < -0.5:
            segment = 'highly_engaged'
        elif engagement_score < -0.5:
            segment = 'disengaged'
        elif confusion_score > 0.5:
            segment = 'confused'
        else:
            segment = 'neutral'
            
        segments[segment].append(viewer_id)
        assignments[viewer_id] = segment
        
    return {
        'segments': dict(segments),
        'assignments': assignments,
        'segment_sizes': {k: len(v) for k, v in segments.items()}
    }


def compare_viewer_types(
    viewers: List[ViewerPersona],
    metric: str = 'engagement'
) -> Dict:
    """Compare different viewer types on a specific metric"""
    type_metrics = defaultdict(list)
    
    for viewer in viewers:
        if metric == 'engagement' and viewer.viewing_history:
            avg_value = np.mean([m.engagement for m in viewer.viewing_history])
        elif metric == 'attention' and viewer.viewing_history:
            avg_value = np.mean([m.attention for 


# ============================================================================
# ADVANCED ANALYTICS AND COMPARISON TOOLS
# ============================================================================

class ABTestingFramework:
    """
    Framework for A/B testing different versions of content
    with simulated audiences
    """
    
    def __init__(self):
        """Initialize A/B testing framework"""
        self.experiments: Dict[str, Dict] = {}
        self.results: Dict[str, Dict] = {}
        
    def create_experiment(
        self,
        experiment_id: str,
        variant_a_metadata: Dict,
        variant_b_metadata: Dict,
        num_viewers_per_variant: int = 500
    ):
        """Create a new A/B test experiment"""
        self.experiments[experiment_id] = {
            'variant_a': {
                'metadata': variant_a_metadata,
                'simulator': AudienceSimulator(num_viewers=num_viewers_per_variant)
            },
            'variant_b': {
                'metadata': variant_b_metadata,
                'simulator': AudienceSimulator(num_viewers=num_viewers_per_variant)
            },
            'created_at': np.datetime64('now')
        }
        
    def run_experiment(
        self,
        experiment_id: str,
        variant_a_scenes: List[Dict],
        variant_b_scenes: List[Dict]
    ) -> Dict:
        """Run an A/B test experiment"""
        if experiment_id not in self.experiments:
            raise ValueError(f"Experiment {experiment_id} not found")
            
        experiment = self.experiments[experiment_id]
        
        # Run both variants
        print(f"Running variant A...")
        experiment['variant_a']['simulator'].simulate_sequence(variant_a_scenes)
        
        print(f"Running variant B...")
        experiment['variant_b']['simulator'].simulate_sequence(variant_b_scenes)
        
        # Compare results
        results = self.compare_variants(experiment_id)
        self.results[experiment_id] = results
        
        return results
    
    def compare_variants(self, experiment_id: str) -> Dict:
        """Compare two variants statistically"""
        experiment = self.experiments[experiment_id]
        
        sim_a = experiment['variant_a']['simulator']
        sim_b = experiment['variant_b']['simulator']
        
        # Get comprehensive reports
        report_a = sim_a.get_comprehensive_report()
        report_b = sim_b.get_comprehensive_report()
        
        # Calculate key metrics
        comparison = {
            'retention': {
                'variant_a': report_a['retention']['final_retention'],
                'variant_b': report_b['retention']['final_retention'],
                'winner': 'A' if report_a['retention']['final_retention'] > report_b['retention']['final_retention'] else 'B',
                'difference': abs(report_a['retention']['final_retention'] - report_b['retention']['final_retention']),
                'lift': ((report_b['retention']['final_retention'] / report_a['retention']['final_retention']) - 1) * 100 if report_a['retention']['final_retention'] > 0 else 0
            },
            'engagement': {
                'variant_a': report_a['engagement']['overall_mean'],
                'variant_b': report_b['engagement']['overall_mean'],
                'winner': 'A' if report_a['engagement']['overall_mean'] > report_b['engagement']['overall_mean'] else 'B',
                'difference': abs(report_a['engagement']['overall_mean'] - report_b['engagement']['overall_mean']),
                'lift': ((report_b['engagement']['overall_mean'] / report_a['engagement']['overall_mean']) - 1) * 100 if report_a['engagement']['overall_mean'] > 0 else 0
            },
            'drop_off': {
                'variant_a': report_a['drop_off']['drop_off_rate'],
                'variant_b': report_b['drop_off']['drop_off_rate'],
                'winner': 'A' if report_a['drop_off']['drop_off_rate'] < report_b['drop_off']['drop_off_rate'] else 'B',
                'difference': abs(report_a['drop_off']['drop_off_rate'] - report_b['drop_off']['drop_off_rate'])
            },
            'confusion': {
                'variant_a': report_a['confusion']['highly_confused_viewers'],
                'variant_b': report_b['confusion']['highly_confused_viewers'],
                'winner': 'A' if report_a['confusion']['highly_confused_viewers'] < report_b['confusion']['highly_confused_viewers'] else 'B'
            }
        }
        
        # Determine overall winner
        wins_a = sum(1 for metric in comparison.values() if metric.get('winner') == 'A')
        wins_b = sum(1 for metric in comparison.values() if metric.get('winner') == 'B')
        
        comparison['overall_winner'] = 'A' if wins_a > wins_b else 'B' if wins_b > wins_a else 'Tie'
        comparison['confidence'] = max(wins_a, wins_b) / (wins_a + wins_b)
        
        # Statistical significance (simplified)
        comparison['statistical_significance'] = self._calculate_significance(
            sim_a.viewers,
            sim_b.viewers
        )
        
        return comparison
    
    def _calculate_significance(
        self,
        viewers_a: List[ViewerPersona],
        viewers_b: List[ViewerPersona]
    ) -> Dict:
        """Calculate statistical significance of differences"""
        # Get engagement scores
        engagement_a = []
        engagement_b = []
        
        for viewer in viewers_a:
            if viewer.viewing_history:
                engagement_a.append(np.mean([m.engagement for m in viewer.viewing_history]))
                
        for viewer in viewers_b:
            if viewer.viewing_history:
                engagement_b.append(np.mean([m.engagement for m in viewer.viewing_history]))
                
        if not engagement_a or not engagement_b:
            return {'significant': False, 'p_value': 1.0}
            
        # Simple t-test approximation
        mean_a = np.mean(engagement_a)
        mean_b = np.mean(engagement_b)
        std_a = np.std(engagement_a)
        std_b = np.std(engagement_b)
        n_a = len(engagement_a)
        n_b = len(engagement_b)
        
        # Standard error
        se = np.sqrt((std_a**2 / n_a) + (std_b**2 / n_b))
        
        if se > 0:
            t_stat = abs(mean_a - mean_b) / se
            # Simplified p-value estimation
            p_value = 2 * (1 - min(1.0, t_stat / 4))
        else:
            p_value = 1.0
            
        return {
            'significant': p_value < 0.05,
            'p_value': p_value,
            't_statistic': t_stat if se > 0 else 0
        }
    
    def get_experiment_report(self, experiment_id: str) -> str:
        """Generate readable report for experiment"""
        if experiment_id not in self.results:
            return "Experiment not yet run"
            
        results = self.results[experiment_id]
        
        report = [
            f"=== A/B Test Results: {experiment_id} ===\n",
            f"Overall Winner: Variant {results['overall_winner']}",
            f"Confidence: {results['confidence']:.1%}\n",
            
            "--- Retention ---",
            f"Variant A: {results['retention']['variant_a']:.1%}",
            f"Variant B: {results['retention']['variant_b']:.1%}",
            f"Winner: Variant {results['retention']['winner']} (+{results['retention']['lift']:.1f}%)\n",
            
            "--- Engagement ---",
            f"Variant A: {results['engagement']['variant_a']:.3f}",
            f"Variant B: {results['engagement']['variant_b']:.3f}",
            f"Winner: Variant {results['engagement']['winner']} (+{results['engagement']['lift']:.1f}%)\n",
            
            "--- Drop-off Rate ---",
    


class SceneOptimizer:
    """
    Optimizes individual scenes based on audience response patterns
    """
    
    def __init__(self, simulator: AudienceSimulator):
        """Initialize scene optimizer"""
        self.simulator = simulator
        self.scene_scores: Dict[str, Dict] = {}
        
    def analyze_scene(
        self,
        scene_id: str,
        scene_timestamp: float,
        window_size: float = 60.0
    ) -> Dict:
        """Analyze a specific scene's performance"""
        # Find metrics during this scene
        scene_metrics = [
            m for m in self.simulator.aggregate_metrics
            if scene_timestamp <= m['timestamp'] < scene_timestamp + window_size
        ]
        
        if not scene_metrics:
            return {'error': 'No metrics found for scene'}
            
        # Calculate scene scores
        avg_engagement = np.mean([m['engagement']['mean'] for m in scene_metrics])
        avg_attention = np.mean([m['attention']['mean'] for m in scene_metrics])
        avg_confusion = np.mean([m['confusion']['mean'] for m in scene_metrics])
        
        # Emotional response
        emotion_intensity = 0.0
        if scene_metrics[0].get('emotions'):
            for emotion_data in scene_metrics[0]['emotions'].values():
                emotion_intensity += emotion_data.get('mean', 0)
                
        # Drop-off risk during scene
        drop_offs_in_scene = len([
            e for e in self.simulator.drop_off_events
            if scene_timestamp <= e['timestamp'] < scene_timestamp + window_size
        ])
        
        # Calculate overall scene score
        scene_score = (
            avg_engagement * 0.4 +
            avg_attention * 0.2 +
            (1.0 - avg_confusion) * 0.2 +
            min(1.0, emotion_intensity / 3) * 0.2
        )
        
        # Penalties
        scene_score -= (drop_offs_in_scene / self.simulator.num_viewers) * 0.5
        scene_score = max(0, min(1.0, scene_score))
        
        analysis = {
            'scene_id': scene_id,
            'timestamp': scene_timestamp,
            'scene_score': scene_score,
            'engagement': avg_engagement,
            'attention': avg_attention,
            'confusion': avg_confusion,
            'emotion_intensity': emotion_intensity,
            'drop_offs': drop_offs_in_scene,
            'grade': self._get_grade(scene_score)
        }
        
        self.scene_scores[scene_id] = analysis
        
        return analysis
    
    def _get_grade(self, score: float) -> str:
        """Convert score to letter grade"""
        if score >= 0.9:
            return 'A+'
        elif score >= 0.85:
            return 'A'
        elif score >= 0.8:
            return 'A-'
        elif score >= 0.75:
            return 'B+'
        elif score >= 0.7:
            return 'B'
        elif score >= 0.65:
            return 'B-'
        elif score >= 0.6:
            return 'C+'
        elif score >= 0.55:
            return 'C'
        elif score >= 0.5:
            return 'C-'
        elif score >= 0.45:
            return 'D+'
        elif score >= 0.4:
            return 'D'
        else:
            return 'F'
    
    def identify_problematic_scenes(self, threshold: float = 0.5) -> List[Dict]:
        """Identify scenes that need improvement"""
        problematic = []
        
        for scene_id, analysis in self.scene_scores.items():
            if analysis['scene_score'] < threshold:
                issues = []
                
                if analysis['engagement'] < 0.4:
                    issues.append('Low engagement')
                if analysis['attention'] < 0.4:
                    issues.append('Low attention')
                if analysis['confusion'] > 0.6:
                    issues.append('High confusion')
                if analysis['emotion_intensity'] < 0.5:
                    issues.append('Lacks emotional impact')
                if analysis['drop_offs'] > 5:
                    issues.append(f"{analysis['drop_offs']} viewers dropped off")
                    
                problematic.append({
                    'scene_id': scene_id,
                    'timestamp': analysis['timestamp'],
                    'score': analysis['scene_score'],
                    'grade': analysis['grade'],
                    'issues': issues
                })
                
        return sorted(problematic, key=lambda x: x['score'])
    
    def suggest_scene_improvements(self, scene_id: str) -> List[str]:
        """Generate specific improvement suggestions for a scene"""
        if scene_id not in self.scene_scores:
            return ["Scene not analyzed"]
            
        analysis = self.scene_scores[scene_id]
        suggestions = []
        
        # Engagement issues
        if analysis['engagement'] < 0.5:
            suggestions.append("Increase stakes or add conflict to boost engagement")
            suggestions.append("Consider adding action or revealing important information")
            
        # Attention issues
        if analysis['attention'] < 0.5:
            suggestions.append("Scene may be too slow - consider tightening or adding visual interest")
            suggestions.append("Add unexpected elements to recapture attention")
            
        # Confusion issues
        if analysis['confusion'] > 0.6:
            suggestions.append("Clarify what's happening - dialogue or visual cues may be unclear")
            suggestions.append("Simplify character motivations or plot developments")
            
        # Emotional issues
        if analysis['emotion_intensity'] < 0.5:
            suggestions.append("Deepen emotional content - connect to character wants/needs")
            suggestions.append("Add vulnerability or personal stakes for characters")
            
        # Drop-off issues
        if analysis['drop_offs'] > 3:
            suggestions.append("CRITICAL: This scene causes significant viewer drop-off")
            suggestions.append("Consider cutting, relocating, or substantially reworking this scene")
            
        # If scene is just mediocre
        if 0.5 <= analysis['scene_score'] < 0.7 and not suggestions:
            suggestions.append("Scene is functional but could be stronger")
            suggestions.append("Look for opportunities to add surprise, emotion, or character development")
            
        return suggestions
    
    def compare_scene_types(self, scene_metadata: Dict[str, str]) -> Dict:
        """Compare performance of different scene types (action, dialogue, etc.)"""
        type_performance = defaultdict(lambda: {'scores': [], 'count': 0})
        
        for scene_id, analysis in self.scene_scores.items():
            scene_type = scene_metadata.get(scene_id, 'unknown')
            type_performance[scene_type]['scores'].append(analysis['scene_score'])
            type_performance[scene_type]['count'] += 1
            
        # Calculate averages
        comparison = {}
        for scene_type, data in type_performance.items():
            comparison[scene_type] = {
                'average_score': np.mean(data['scores']),
                'count': data['count'],
                'best_score': np.max(data['scores']),
                'worst_score': np.min(data['scores'])
            }
            
        return comparison
    
    def generate_scene_report(self) -> Dict:
        """Generate comprehensive scene analysis report"""
        if not self.scene_scores:
            return {'error': 'No scenes analyzed'}
            
        all_scores = [s['scene_score'] for s in self.scene_scores.values()]
        
        return {
            'total_scenes': len(self.scene_scores),
            'average_score


class VisualizationHelper:
    """
    Helper class for generating visualization data
    """
    
    def __init__(self, simulator: AudienceSimulator):
        """Initialize visualization helper"""
        self.simulator = simulator
        
    def generate_engagement_heatmap_data(self) -> Dict:
        """Generate data for engagement heatmap over time"""
        timestamps = []
        engagement_by_viewer_type = defaultdict(list)
        
        for moment in self.simulator.aggregate_metrics:
            timestamps.append(moment['timestamp'])
            
            # Get engagement by viewer type at this moment
            for viewer in self.simulator.viewers:
                if not viewer.dropped_off:
                    # Find viewer's engagement at this timestamp
                    for history_moment in viewer.viewing_history:
                        if abs(history_moment.timestamp - moment['timestamp']) < 5:
                            engagement_by_viewer_type[viewer.viewer_type.value].append(
                                history_moment.engagement
                            )
                            break
                            
        return {
            'timestamps': timestamps,
            'engagement_by_type': dict(engagement_by_viewer_type),
            'title': 'Engagement Heatmap by Viewer Type'
        }
    
    def generate_sankey_diagram_data(self) -> Dict:
        """Generate Sankey diagram data for viewer flow (engaged -> dropped)"""
        # Track transitions: engaged -> confused -> dropped, etc.
        flows = defaultdict(int)
        
        for viewer in self.simulator.viewers:
            # Determine viewer's journey
            if viewer.dropped_off:
                if viewer.cumulative_confusion > 0.6:
                    flows[('engaged', 'confused', 'dropped')] += 1
                elif viewer.cumulative_boredom > 0.6:
                    flows[('engaged', 'bored', 'dropped')] += 1
                else:
                    flows[('engaged', 'disengaged', 'dropped')] += 1
            else:
                if viewer.emotional_investment > 0.7:
                    flows[('engaged', 'invested', 'completed')] += 1
                else:
                    flows[('engaged', 'neutral', 'completed')] += 1
                    
        return {
            'flows': dict(flows),
            'title': 'Viewer Journey Flow'
        }
    
    def generate_emotion_radar_chart_data(self) -> Dict:
        """Generate radar chart data for emotional profile"""
        emotional_arc = self.simulator.get_emotional_arc()
        dominant_emotions = emotional_arc.get('dominant_emotions', [])
        
        emotion_scores = {}
        for emotion, score in dominant_emotions:
            emotion_scores[emotion] = score
            
        return {
            'emotions': emotion_scores,
            'title': 'Emotional Profile'
        }
    
    def generate_retention_funnel_data(self) -> Dict:
        """Generate funnel data showing viewer drop-off over time"""
        retention = self.simulator.get_retention_curve()
        
        # Create funnel stages
        stages = []
        timestamps = retention['timestamps']
        retention_rates = retention['retention_rate']
        
        # Sample at key points
        if len(timestamps) >= 5:
            indices = [0, len(timestamps)//4, len(timestamps)//2, 3*len(timestamps)//4, -1]
            stage_names = ['Start', '25%', '50%', '75%', 'End']
            
            for i, idx in enumerate(indices):
                stages.append({
                    'name': stage_names[i],
                    'timestamp': timestamps[idx],
                    'retention': retention_rates[idx],
                    'viewers': int(retention_rates[idx] * self.simulator.num_viewers)
                })
                
        return {
            'stages': stages,
            'title': 'Viewer Retention Funnel'
        }
    
    def generate_character_web_data(self) -> Dict:
        """Generate network graph data for character empathy"""
        # Nodes: characters
        # Edges: co-occurrence in scenes
        # Node size: empathy level
        
        nodes = []
        edges = []
        
        char_empathy_analyzer = self.simulator.get_character_empathy_analysis()
        char_scores = char_empathy_analyzer.get('character_scores', {})
        
        for char_id, scores in char_scores.items():
            nodes.append({
                'id': char_id,
                'empathy': scores['average_empathy'],
                'rooting_interest': scores['average_rooting_interest'],
                'size': scores['audience_connection'] * 100
            })
            
        return {
            'nodes': nodes,
            'edges': edges,
            'title': 'Character Empathy Network'
        }
    
    def generate_timeline_visualization_data(self) -> Dict:
        """Generate timeline with key events"""
        timeline_events = []
        
        # Add emotional peaks
        for moment in self.simulator.aggregate_metrics:
            if moment.get('emotions'):
                total_emotion = sum(
                    data['mean'] for data in moment['emotions'].values()
                )
                if total_emotion > 0.7:
                    timeline_events.append({
                        'timestamp': moment['timestamp'],
                        'type': 'emotional_peak',
                        'intensity': total_emotion,
                        'label': 'Emotional Peak'
                    })
                    
        # Add drop-off clusters
        for event in self.simulator.drop_off_events:
            timeline_events.append({
                'timestamp': event['timestamp'],
                'type': 'drop_off',
                'severity': event['risk_score'],
                'label': f"Drop-off: {', '.join(event['reasons'][:2])}"
            })
            
        # Add confusion spikes
        for moment in self.simulator.aggregate_metrics:
            if moment['confusion']['mean'] > 0.7:
                timeline_events.append({
                    'timestamp': moment['timestamp'],
                    'type': 'confusion_spike',
                    'level': moment['confusion']['mean'],
                    'label': 'Confusion Spike'
                })
                
        timeline_events.sort(key=lambda x: x['timestamp'])
        
        return {
            'events': timeline_events,
            'duration': self.simulator.current_timestamp,
            'title': 'Content Timeline with Key Events'
        }
    
    def export_for_plotly(self, chart_type: str) -> Dict:
        """Export data in Plotly-compatible format"""
        if chart_type == 'engagement_over_time':
            engagement = self.simulator.get_engagement_curve()
            return {
                'data': [{
                    'x': engagement['timestamps'],
                    'y': engagement['mean_engagement'],
                    'type': 'scatter',
                    'mode': 'lines',
                    'name': 'Mean Engagement'
                }],
                'layout': {
                    'title': 'Engagement Over Time',
                    'xaxis': {'title': 'Time (seconds)'},
                    'yaxis': {'title': 'Engagement Level'}
                }
            }
        elif chart_type == 'retention_curve':
            retention = self.simulator.get_retention_curve()
            return {
                'data': [{
                    'x': retention['timestamps'],
                    'y': retention['retention_rate'],
                    'type': 'scatter',
                    'mode': 'lines',
                    'fill': 'tozeroy',
        


# ============================================================================
# INTEGRATION AND EXPORT UTILITIES
# ============================================================================

class DataExporter:
    """
    Export simulation data to various formats
    """
    
    def __init__(self, simulator: AudienceSimulator):
        """Initialize data exporter"""
        self.simulator = simulator
        
    def export_to_csv(self, filepath: str, data_type: str = 'aggregate'):
        """Export data to CSV format"""
        import csv
        
        if data_type == 'aggregate':
            with open(filepath, 'w', newline='') as f:
                if not self.simulator.aggregate_metrics:
                    return
                    
                # Get field names from first metric
                fieldnames = ['timestamp', 'active_viewers', 'engagement_mean', 
                             'attention_mean', 'confusion_mean']
                
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                
                for metric in self.simulator.aggregate_metrics:
                    writer.writerow({
                        'timestamp': metric['timestamp'],
                        'active_viewers': metric['active_viewers'],
                        'engagement_mean': metric['engagement']['mean'],
                        'attention_mean': metric['attention']['mean'],
                        'confusion_mean': metric['confusion']['mean']
                    })
                    
        elif data_type == 'viewers':
            with open(filepath, 'w', newline='') as f:
                fieldnames = ['viewer_id', 'viewer_type', 'film_literacy', 
                             'dropped_off', 'emotional_investment', 'cumulative_confusion']
                
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                
                for viewer in self.simulator.viewers:
                    writer.writerow({
                        'viewer_id': viewer.viewer_id,
                        'viewer_type': viewer.viewer_type.value,
                        'film_literacy': viewer.film_literacy.value,
                        'dropped_off': viewer.dropped_off,
                        'emotional_investment': viewer.emotional_investment,
                        'cumulative_confusion': viewer.cumulative_confusion
                    })
                    
        print(f"Data exported to {filepath}")
    
    def export_to_json(self, filepath: str, include_full_detail: bool = False):
        """Export comprehensive data to JSON"""
        report = self.simulator.get_comprehensive_report()
        
        if include_full_detail:
            # Add detailed viewer data
            report['viewers'] = []
            for viewer in self.simulator.viewers:
                viewer_data = {
                    'viewer_id': viewer.viewer_id,
                    'viewer_type': viewer.viewer_type.value,
                    'film_literacy': viewer.film_literacy.value,
                    'dropped_off': viewer.dropped_off,
                    'drop_off_time': viewer.drop_off_time,
                    'emotional_investment': viewer.emotional_investment,
                    'cumulative_confusion': viewer.cumulative_confusion,
                    'cumulative_boredom': viewer.cumulative_boredom,
                    'character_empathy': {
                        char_id: {
                            'character_name': emp.character_name,
                            'empathy_level': emp.empathy_level,
                            'rooting_interest': emp.rooting_interest
                        }
                        for char_id, emp in viewer.character_empathy.items()
                    }
                }
                report['viewers'].append(viewer_data)
                
        with open(filepath, 'w') as f:
            json.dump(report, f, indent=2, default=str)
            
        print(f"Comprehensive report exported to {filepath}")
    
    def export_to_html_report(self, filepath: str):
        """Export interactive HTML report"""
        report = self.simulator.get_comprehensive_report()
        
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Audience Simulation Report</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            margin: 40px;
            background-color: #f5f5f5;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        h1 {{
            color: #333;
            border-bottom: 3px solid #4CAF50;
            padding-bottom: 10px;
        }}
        h2 {{
            color: #666;
            margin-top: 30px;
        }}
        .metric {{
            display: inline-block;
            margin: 15px;
            padding: 20px;
            background-color: #f9f9f9;
            border-radius: 4px;
            min-width: 200px;
        }}
        .metric-label {{
            font-size: 14px;
            color: #999;
            text-transform: uppercase;
        }}
        .metric-value {{
            font-size: 32px;
            font-weight: bold;
            color: #333;
            margin-top: 5px;
        }}
        .good {{ color: #4CAF50; }}
        .warning {{ color: #FF9800; }}
        .bad {{ color: #F44336; }}
        .insight {{
            background-color: #E3F2FD;
            padding: 15px;
            margin: 10px 0;
            border-left: 4px solid #2196F3;
            border-radius: 4px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }}
        th {{
            background-color: #4CAF50;
            color: white;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Audience Simulation Report</h1>
        
        <h2>Overview</h2>
        <div class="metric">
            <div class="metric-label">Total Viewers</div>
            <div class="metric-value">{report['simulation_info']['total_viewers']}</div>
        </div>
        <div class="metric">
            <div class="metric-label">Final Retention</div>
            <div class="metric-value {'good' if report['retention']['final_retention'] > 0.7 else 'warning' if report['retention']['final_retention'] > 0.5 else 'bad'}">
                {report['retention']['final_retention']:.1%}
            </div>
        </div>
        <div class="metric">
            <div class="metric-label">Avg Engagement</div>
            <div class="metric-value {'good' if report['engagement']['overall_mean'] > 0.7 else 'warning' if report['engagement']['overall_mean'] > 0.5 else 'bad'}">
                {report['engagement']['overall_mean']:.2f}
            </div>
        </div>
        
        <h2>Key Insights</h2>
        {''.join(f'<div class="insight">{insight}</div>' for insight in report['key_insights'])}
        
        <h2>Drop-off Analysis</h2>
        <p><strong>Total Drop-offs:</strong> {report['drop_off']['total_drop_offs']} 
           ({report['drop_off']['drop_off_rate']:.1%})</p>
        
        <h3>Top Drop-off Reasons</h3>
        <table>
            <tr>
                <th>Reason</th>
                <th>Count</th>
            </tr>
            {''.join(f'<tr><td>{reason}</td><td>{count}</td></tr>' 
                     for reason, count in report['dro


# ============================================================================
# ADVANCED SCENARIO BUILDERS
# ============================================================================

class ScenarioBuilder:
    """
    Build complex narrative scenarios for testing
    """
    
    def __init__(self):
        """Initialize scenario builder"""
        self.scenarios = {}
        
    def build_three_act_structure(
        self,
        duration_minutes: float = 120,
        genre: str = 'action'
    ) -> List[Dict]:
        """Build standard three-act structure"""
        total_duration = duration_minutes * 60  # Convert to seconds
        
        # Act 1 (25%)
        act1_duration = total_duration * 0.25
        # Act 2 (50%)
        act2_duration = total_duration * 0.50
        # Act 3 (25%)
        act3_duration = total_duration * 0.25
        
        scenes = []
        timestamp = 0.0
        scene_counter = 0
        
        # ACT 1: Setup
        print("Building Act 1: Setup...")
        
        # Opening hook
        scenes.append(self._create_scene(
            f'act1_scene_{scene_counter:03d}',
            'action' if genre == 'action' else 'mystery',
            timestamp,
            180,
            pacing=0.7,
            stakes=0.6,
            tension=0.5
        ))
        timestamp += 180
        scene_counter += 1
        
        # Introduce protagonist
        scenes.append(self._create_scene(
            f'act1_scene_{scene_counter:03d}',
            'dialogue',
            timestamp,
            120,
            pacing=0.5,
            stakes=0.4,
            tension=0.3,
            character_focus=True
        ))
        timestamp += 120
        scene_counter += 1
        
        # Establish world
        remaining_act1 = act1_duration - 300
        num_scenes = int(remaining_act1 / 150)
        
        for i in range(num_scenes):
            scenes.append(self._create_scene(
                f'act1_scene_{scene_counter:03d}',
                random.choice(['dialogue', 'mystery']),
                timestamp,
                150,
                pacing=0.5,
                stakes=0.5,
                tension=0.4
            ))
            timestamp += 150
            scene_counter += 1
        
        # ACT 2: Confrontation
        print("Building Act 2: Confrontation...")
        scene_counter = 0
        
        # Midpoint twist
        midpoint = timestamp + act2_duration / 2
        
        act2_scenes = int(act2_duration / 180)
        for i in range(act2_scenes):
            current_time = timestamp + (i * 180)
            
            # Escalate tension as we approach midpoint and climax
            progress = i / act2_scenes
            tension = 0.5 + (progress * 0.3)
            stakes = 0.6 + (progress * 0.2)
            
            if abs(current_time - midpoint) < 90:
                # Midpoint twist
                scene_type = 'mystery'
                pacing = 0.6
                tension = 0.8
                has_twist = True
            else:
                scene_type = random.choice(['action', 'dialogue', 'mystery'])
                pacing = 0.5 + (progress * 0.2)
                has_twist = False
            
            scenes.append(self._create_scene(
                f'act2_scene_{scene_counter:03d}',
                scene_type,
                current_time,
                180,
                pacing=pacing,
                stakes=stakes,
                tension=tension,
                has_twist=has_twist
            ))
            scene_counter += 1
        
        timestamp += act2_duration
        
        # ACT 3: Resolution
        print("Building Act 3: Resolution...")
        scene_counter = 0
        
        # Dark night of the soul
        scenes.append(self._create_scene(
            f'act3_scene_{scene_counter:03d}',
            'emotional',
            timestamp,
            120,
            pacing=0.3,
            stakes=0.9,
            tension=0.7
        ))
        timestamp += 120
        scene_counter += 1
        
        # Climax
        scenes.append(self._create_scene(
            f'act3_scene_{scene_counter:03d}',
            'action',
            timestamp,
            300,
            pacing=0.9,
            stakes=1.0,
            tension=0.95
        ))
        timestamp += 300
        scene_counter += 1
        
        # Resolution
        remaining_act3 = act3_duration - 420
        num_scenes = int(remaining_act3 / 120)
        
        for i in range(num_scenes):
            # Wind down
            progress = i / max(1, num_scenes - 1)
            scenes.append(self._create_scene(
                f'act3_scene_{scene_counter:03d}',
                'dialogue' if i < num_scenes - 1 else 'emotional',
                timestamp,
                120,
                pacing=0.4 - (progress * 0.1),
                stakes=0.5 - (progress * 0.3),
                tension=0.4 - (progress * 0.3)
            ))
            timestamp += 120
            scene_counter += 1
        
        return scenes
    
    def _create_scene(
        self,
        scene_id: str,
        scene_type: str,
        timestamp: float,
        duration: float,
        pacing: float = 0.5,
        stakes: float = 0.5,
        tension: float = 0.5,
        character_focus: bool = False,
        has_twist: bool = False
    ) -> Dict:
        """Create a scene with specified parameters"""
        scene = create_sample_scene_data(scene_id, scene_type, duration)
        scene['timestamp'] = timestamp
        scene['scene_data']['pacing'] = pacing
        scene['scene_data']['tension'] = tension
        scene['narrative_state']['stakes'] = stakes
        
        if has_twist:
            scene['scene_data']['is_twist'] = True
            scene['scene_data']['twist_surprise_level'] = 0.7
            scene['scene_data']['twist_setup_quality'] = 0.6
        
        if character_focus:
            scene['scene_data']['characters'] = [
                {
                    'character_id': 'protagonist',
                    'character_name': 'Hero',
                    'emotion': 'determination',
                    'emotion_intensity': 0.7
                }
            ]
        
        return scene
    
    def build_anthology_structure(
        self,
        num_episodes: int = 8,
        episode_duration: float = 45
    ) -> List[List[Dict]]:
        """Build anthology series structure"""
        episodes = []
        
        for ep_num in range(num_episodes):
            print(f"Building Episode {ep_num + 1}/{num_episodes}...")
            
            episode_scenes = self.build_three_act_structure(
                duration_minutes=episode_duration,
                genre=random.choice(['action', 'mystery', 'drama'])
            )
            
            episodes.append(episode_scenes)
        
        return episodes
    
    def build_nonlinear_narrative(
        self,
        num_timelines: int = 3,
        duration_minutes: float = 120
    ) -> List[Dict]:
        """Build non-linear narrative with multiple timelines"""
        total_duration = duration_minutes * 60
        scenes = []
        timestamp = 0.0
        
        # Create scenes for each timeline
        timeline_scenes = {}
        for timeline_id in range(num_timelines):
            timeline_scenes[timeline_id] = []
        
        # Distribute scenes across timelines
        num_scenes = int(total_duration / 180)
        
        for i in range(num_scenes):
            # Choose timeline (weighted toward present)
            if num_timelines == 3:
                timeline_id = random.choices(
                    [0, 1, 2],
                    weights=[0.5, 0.3, 0.2]
                )[0]
   


# ============================================================================
# STATISTICAL ANALYSIS TOOLS
# ============================================================================

class StatisticalAnalyzer:
    """
    Advanced statistical analysis of audience data
    """
    
    def __init__(self, simulator: AudienceSimulator):
        """Initialize statistical analyzer"""
        self.simulator = simulator
        
    def calculate_engagement_statistics(self) -> Dict:
        """Calculate comprehensive engagement statistics"""
        engagement_values = []
        
        for viewer in self.simulator.viewers:
            if viewer.viewing_history:
                avg_engagement = np.mean([m.engagement for m in viewer.viewing_history])
                engagement_values.append(avg_engagement)
        
        if not engagement_values:
            return {'error': 'No engagement data'}
        
        return {
            'mean': np.mean(engagement_values),
            'median': np.median(engagement_values),
            'std_dev': np.std(engagement_values),
            'variance': np.var(engagement_values),
            'min': np.min(engagement_values),
            'max': np.max(engagement_values),
            'q1': np.percentile(engagement_values, 25),
            'q3': np.percentile(engagement_values, 75),
            'iqr': np.percentile(engagement_values, 75) - np.percentile(engagement_values, 25),
            'skewness': self._calculate_skewness(engagement_values),
            'kurtosis': self._calculate_kurtosis(engagement_values),
            'coefficient_of_variation': np.std(engagement_values) / np.mean(engagement_values) if np.mean(engagement_values) > 0 else 0
        }
    
    def _calculate_skewness(self, values: List[float]) -> float:
        """Calculate skewness of distribution"""
        if len(values) < 3:
            return 0.0
        
        mean = np.mean(values)
        std = np.std(values)
        
        if std == 0:
            return 0.0
        
        n = len(values)
        skew = np.sum([(x - mean) ** 3 for x in values]) / (n * std ** 3)
        
        return skew
    
    def _calculate_kurtosis(self, values: List[float]) -> float:
        """Calculate kurtosis of distribution"""
        if len(values) < 4:
            return 0.0
        
        mean = np.mean(values)
        std = np.std(values)
        
        if std == 0:
            return 0.0
        
        n = len(values)
        kurt = np.sum([(x - mean) ** 4 for x in values]) / (n * std ** 4) - 3
        
        return kurt
    
    def perform_correlation_analysis(self) -> Dict:
        """Analyze correlations between metrics"""
        viewer_metrics = []
        
        for viewer in self.simulator.viewers:
            if viewer.viewing_history:
                metrics = {
                    'engagement': np.mean([m.engagement for m in viewer.viewing_history]),
                    'attention': np.mean([m.attention for m in viewer.viewing_history]),
                    'confusion': viewer.cumulative_confusion,
                    'boredom': viewer.cumulative_boredom,
                    'investment': viewer.emotional_investment,
                    'dropped_off': 1.0 if viewer.dropped_off else 0.0
                }
                viewer_metrics.append(metrics)
        
        if len(viewer_metrics) < 2:
            return {'error': 'Insufficient data'}
        
        # Calculate correlations
        correlations = {}
        metric_names = ['engagement', 'attention', 'confusion', 'boredom', 'investment']
        
        for i, metric1 in enumerate(metric_names):
            for metric2 in metric_names[i+1:]:
                values1 = [m[metric1] for m in viewer_metrics]
                values2 = [m[metric2] for m in viewer_metrics]
                
                corr = self._calculate_correlation(values1, values2)
                correlations[f'{metric1}_vs_{metric2}'] = corr
        
        return correlations
    
    def _calculate_correlation(self, x: List[float], y: List[float]) -> float:
        """Calculate Pearson correlation coefficient"""
        if len(x) != len(y) or len(x) < 2:
            return 0.0
        
        mean_x = np.mean(x)
        mean_y = np.mean(y)
        
        numerator = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(len(x)))
        denominator = np.sqrt(
            sum((x[i] - mean_x) ** 2 for i in range(len(x))) *
            sum((y[i] - mean_y) ** 2 for i in range(len(y)))
        )
        
        if denominator == 0:
            return 0.0
        
        return numerator / denominator
    
    def calculate_confidence_intervals(self, metric: str = 'engagement', confidence: float = 0.95) -> Dict:
        """Calculate confidence intervals for metrics"""
        values = []
        
        for viewer in self.simulator.viewers:
            if metric == 'engagement' and viewer.viewing_history:
                values.append(np.mean([m.engagement for m in viewer.viewing_history]))
            elif metric == 'confusion':
                values.append(viewer.cumulative_confusion)
            elif metric == 'investment':
                values.append(viewer.emotional_investment)
        
        if not values:
            return {'error': 'No data'}
        
        mean = np.mean(values)
        std_error = np.std(values) / np.sqrt(len(values))
        
        # Z-score for confidence level (approximation)
        z_scores = {0.90: 1.645, 0.95: 1.96, 0.99: 2.576}
        z = z_scores.get(confidence, 1.96)
        
        margin_of_error = z * std_error
        
        return {
            'mean': mean,
            'confidence_level': confidence,
            'lower_bound': mean - margin_of_error,
            'upper_bound': mean + margin_of_error,
            'margin_of_error': margin_of_error,
            'sample_size': len(values)
        }
    
    def perform_hypothesis_test(
        self,
        metric: str,
        null_hypothesis_value: float,
        alternative: str = 'two-sided'
    ) -> Dict:
        """Perform hypothesis test on metric"""
        values = []
        
        for viewer in self.simulator.viewers:
            if metric == 'engagement' and viewer.viewing_history:
                values.append(np.mean([m.engagement for m in viewer.viewing_history]))
            elif metric == 'confusion':
                values.append(viewer.cumulative_confusion)
        
        if not values:
            return {'error': 'No data'}
        
        mean = np.mean(values)
        std_error = np.std(values) / np.sqrt(len(values))
        
        # Calculate t-statistic
        if std_error == 0:
            return {'error': 'Zero standard error'}
        
        t_stat = (mean - null_hypothesis_value) / std_error
        
        # Approximate p-value (simplified)
        if alternative == 'two-sided':
            p_value = 2 * (1 - min(1.0, abs(t_stat) / 4))
        elif alternative == 'greater':
            p_value = 1 - min(1.0, t_stat / 4) if t_stat > 0 else 1.0
        else:  # less
            p_value = 1 - min(1.0, abs(t_stat) / 4) if t_stat < 0 else 1.0
        
        return {
            'null_hypothesis': f'{metric} = {null_hypothesis_value}',
            'alternative': alternative,
            'sample_mean': mean,
            't_statistic': t_stat,
            'p_value': p_value,
            'reject_null': p_value < 0.05,
            'significance_level': 0.05
        }
    
    def generate_statistical_report(self) -> Dict:
        """Generate comprehensive statistical report"""
        return {
            'engagement_stats': self.calculate_engagement_statistics(),
            'correlations': self.perform_correlation_anal


class SentimentAnalyzer:
    """
    Analyze overall sentiment and satisfaction from audience
    """
    
    def __init__(self, simulator: AudienceSimulator):
        """Initialize sentiment analyzer"""
        self.simulator = simulator
        
    def calculate_overall_sentiment(self) -> Dict:
        """Calculate overall sentiment score"""
        sentiment_scores = []
        
        for viewer in self.simulator.viewers:
            # Calculate viewer sentiment based on multiple factors
            sentiment = 0.0
            
            # Positive factors
            if viewer.viewing_history:
                sentiment += np.mean([m.engagement for m in viewer.viewing_history]) * 0.3
            sentiment += viewer.emotional_investment * 0.3
            
            # Negative factors
            sentiment -= viewer.cumulative_confusion * 0.2
            sentiment -= viewer.cumulative_boredom * 0.2
            
            # Completion bonus
            if not viewer.dropped_off:
                sentiment += 0.2
            
            sentiment = np.clip(sentiment, -1.0, 1.0)
            sentiment_scores.append(sentiment)
        
        avg_sentiment = np.mean(sentiment_scores) if sentiment_scores else 0.0
        
        # Categorize sentiment
        if avg_sentiment > 0.5:
            category = 'very_positive'
        elif avg_sentiment > 0.2:
            category = 'positive'
        elif avg_sentiment > -0.2:
            category = 'neutral'
        elif avg_sentiment > -0.5:
            category = 'negative'
        else:
            category = 'very_negative'
        
        # Calculate distribution
        very_positive = sum(1 for s in sentiment_scores if s > 0.5)
        positive = sum(1 for s in sentiment_scores if 0.2 < s <= 0.5)
        neutral = sum(1 for s in sentiment_scores if -0.2 <= s <= 0.2)
        negative = sum(1 for s in sentiment_scores if -0.5 <= s < -0.2)
        very_negative = sum(1 for s in sentiment_scores if s < -0.5)
        
        return {
            'overall_sentiment': avg_sentiment,
            'category': category,
            'distribution': {
                'very_positive': very_positive / len(sentiment_scores) if sentiment_scores else 0,
                'positive': positive / len(sentiment_scores) if sentiment_scores else 0,
                'neutral': neutral / len(sentiment_scores) if sentiment_scores else 0,
                'negative': negative / len(sentiment_scores) if sentiment_scores else 0,
                'very_negative': very_negative / len(sentiment_scores) if sentiment_scores else 0
            },
            'sentiment_scores': sentiment_scores
        }
    
    def calculate_net_promoter_score(self) -> Dict:
        """Calculate NPS-style score"""
        sentiment = self.calculate_overall_sentiment()
        scores = sentiment['sentiment_scores']
        
        if not scores:
            return {'nps': 0, 'category': 'unknown'}
        
        # Map sentiment to 0-10 scale
        nps_scores = [(s + 1) * 5 for s in scores]  # -1 to 1 becomes 0 to 10
        
        # Categorize
        promoters = sum(1 for s in nps_scores if s >= 9)
        passives = sum(1 for s in nps_scores if 7 <= s < 9)
        detractors = sum(1 for s in nps_scores if s < 7)
        
        total = len(nps_scores)
        nps = ((promoters - detractors) / total) * 100 if total > 0 else 0
        
        # Categorize NPS
        if nps > 50:
            nps_category = 'excellent'
        elif nps > 30:
            nps_category = 'great'
        elif nps > 0:
            nps_category = 'good'
        elif nps > -30:
            nps_category = 'needs_improvement'
        else:
            nps_category = 'poor'
        
        return {
            'nps': nps,
            'category': nps_category,
            'promoters': promoters,
            'passives': passives,
            'detractors': detractors,
            'promoter_rate': promoters / total if total > 0 else 0,
            'detractor_rate': detractors / total if total > 0 else 0
        }
    
    def identify_satisfaction_drivers(self) -> Dict:
        """Identify what drives satisfaction/dissatisfaction"""
        satisfied_viewers = []
        dissatisfied_viewers = []
        
        for viewer in self.simulator.viewers:
            sentiment = 0.0
            if viewer.viewing_history:
                sentiment += np.mean([m.engagement for m in viewer.viewing_history]) * 0.5
            sentiment += viewer.emotional_investment * 0.5
            sentiment -= viewer.cumulative_confusion * 0.3
            sentiment -= viewer.cumulative_boredom * 0.3
            
            if sentiment > 0.3:
                satisfied_viewers.append(viewer)
            elif sentiment < -0.3:
                dissatisfied_viewers.append(viewer)
        
        # Analyze satisfied viewers
        satisfied_traits = {
            'avg_engagement': np.mean([
                np.mean([m.engagement for m in v.viewing_history]) 
                for v in satisfied_viewers if v.viewing_history
            ]) if satisfied_viewers else 0,
            'avg_investment': np.mean([v.emotional_investment for v in satisfied_viewers]) if satisfied_viewers else 0,
            'avg_confusion': np.mean([v.cumulative_confusion for v in satisfied_viewers]) if satisfied_viewers else 0,
            'completion_rate': sum(1 for v in satisfied_viewers if not v.dropped_off) / len(satisfied_viewers) if satisfied_viewers else 0
        }
        
        # Analyze dissatisfied viewers
        dissatisfied_traits = {
            'avg_engagement': np.mean([
                np.mean([m.engagement for m in v.viewing_history]) 
                for v in dissatisfied_viewers if v.viewing_history
            ]) if dissatisfied_viewers else 0,
            'avg_investment': np.mean([v.emotional_investment for v in dissatisfied_viewers]) if dissatisfied_viewers else 0,
            'avg_confusion': np.mean([v.cumulative_confusion for v in dissatisfied_viewers]) if dissatisfied_viewers else 0,
            'completion_rate': sum(1 for v in dissatisfied_viewers if not v.dropped_off) / len(dissatisfied_viewers) if dissatisfied_viewers else 0
        }
        
        # Identify key differences
        drivers = []
        if satisfied_traits['avg_investment'] > dissatisfied_traits['avg_investment'] + 0.2:
            drivers.append('emotional_investment')
        if dissatisfied_traits['avg_confusion'] > satisfied_traits['avg_confusion'] + 0.2:
            drivers.append('confusion_reduction')
        if satisfied_traits['avg_engagement'] > dissatisfied_traits['avg_engagement'] + 0.2:
            drivers.append('engagement')
        
        return {
            'satisfied_count': len(satisfied_viewers),
            'dissatisfied_count': len(dissatisfied_viewers),
            'satisfied_traits': satisfied_traits,
            'dissatisfied_traits': dissatisfied_traits,
            'key_drivers': drivers
        }


class QualityMetricsCalculator:
    """
    Calculate various quality metrics for content
    """
    
    def __init__(self, simulator: AudienceSimulator):
        """Initialize quality metrics calculator"""
        self.simulator = simulator
        
    def calculate_content_quality_score(self) -> Dict:
        """Calculate overall content quality score"""
        report = self.simulator.get_comprehensive_report()
        
        # Multiple quality dimensions
        scores = {}
        
        # 1. Engagement Quality (40%)
        engagement_score = report['engagement']['overall_mean']
        scores['engagement'] = engagement_score * 0.4
        
        # 2. Retention Quality (30%)
        retention_score = report['retention']['final_retention']


class CustomMetricsBuilder:
    """
    Build custom metrics and KPIs
    """
    
    def __init__(self, simulator: AudienceSimulator):
        """Initialize custom metrics builder"""
        self.simulator = simulator
        self.custom_metrics = {}
        
    def define_metric(
        self,
        metric_name: str,
        calculation_func,
        description: str = ""
    ):
        """Define a custom metric"""
        self.custom_metrics[metric_name] = {
            'function': calculation_func,
            'description': description
        }
    
    def calculate_metric(self, metric_name: str) -> any:
        """Calculate a custom metric"""
        if metric_name not in self.custom_metrics:
            raise ValueError(f"Metric {metric_name} not defined")
        
        return self.custom_metrics[metric_name]['function'](self.simulator)
    
    def calculate_all_metrics(self) -> Dict:
        """Calculate all custom metrics"""
        results = {}
        
        for metric_name in self.custom_metrics:
            try:
                results[metric_name] = self.calculate_metric(metric_name)
            except Exception as e:
                results[metric_name] = {'error': str(e)}
        
        return results
    
    def add_standard_metrics(self):
        """Add commonly used standard metrics"""
        # Engagement Rate
        self.define_metric(
            'engagement_rate',
            lambda sim: len([v for v in sim.viewers if v.viewing_history and 
                           np.mean([m.engagement for m in v.viewing_history]) > 0.6]) / sim.num_viewers,
            'Percentage of viewers with high engagement (>0.6)'
        )
        
        # Completion Quality Score
        def completion_quality(sim):
            completers = [v for v in sim.viewers if not v.dropped_off]
            if not completers:
                return 0.0
            avg_engagement = np.mean([
                np.mean([m.engagement for m in v.viewing_history])
                for v in completers if v.viewing_history
            ])
            completion_rate = len(completers) / sim.num_viewers
            return (avg_engagement * 0.6 + completion_rate * 0.4)
        
        self.define_metric(
            'completion_quality',
            completion_quality,
            'Quality-adjusted completion metric'
        )
        
        # Emotional Peak Density
        def emotional_peak_density(sim):
            peaks = 0
            for moment in sim.aggregate_metrics:
                if moment.get('emotions'):
                    total_emotion = sum(data['mean'] for data in moment['emotions'].values())
                    if total_emotion > 0.7:
                        peaks += 1
            duration_minutes = sim.current_timestamp / 60
            return peaks / duration_minutes if duration_minutes > 0 else 0
        
        self.define_metric(
            'emotional_peak_density',
            emotional_peak_density,
            'Number of emotional peaks per minute'
        )
        
        # Confusion-Free Completion Rate
        def confusion_free_completion(sim):
            good_completers = len([
                v for v in sim.viewers 
                if not v.dropped_off and v.cumulative_confusion < 0.4
            ])
            return good_completers / sim.num_viewers
        
        self.define_metric(
            'confusion_free_completion',
            confusion_free_completion,
            'Viewers who completed without significant confusion'
        )


class BatchProcessor:
    """
    Process multiple simulations in batch
    """
    
    def __init__(self):
        """Initialize batch processor"""
        self.jobs = []
        self.results = {}
        
    def add_job(
        self,
        job_id: str,
        scenes: List[Dict],
        num_viewers: int = 1000,
        viewer_distribution: Dict = None
    ):
        """Add a simulation job to batch"""
        self.jobs.append({
            'job_id': job_id,
            'scenes': scenes,
            'num_viewers': num_viewers,
            'viewer_distribution': viewer_distribution
        })
    
    def process_all(self, parallel: bool = False) -> Dict:
        """Process all jobs"""
        print(f"Processing {len(self.jobs)} simulation jobs...")
        
        for i, job in enumerate(self.jobs):
            print(f"  Processing job {i+1}/{len(self.jobs)}: {job['job_id']}")
            
            # Create simulator
            simulator = AudienceSimulator(
                num_viewers=job['num_viewers'],
                viewer_distribution=job['viewer_distribution']
            )
            
            # Run simulation
            simulator.simulate_sequence(job['scenes'])
            
            # Store results
            self.results[job['job_id']] = {
                'simulator': simulator,
                'report': simulator.get_comprehensive_report()
            }
        
        print(f"Completed {len(self.jobs)} jobs")
        return self.results
    
    def compare_jobs(self, job_ids: List[str]) -> Dict:
        """Compare multiple jobs"""
        comparison = {}
        
        for job_id in job_ids:
            if job_id not in self.results:
                continue
            
            report = self.results[job_id]['report']
            
            comparison[job_id] = {
                'retention': report['retention']['final_retention'],
                'engagement': report['engagement']['overall_mean'],
                'drop_off_rate': report['drop_off']['drop_off_rate']
            }
        
        # Find best performing
        best_retention = max(comparison.items(), key=lambda x: x[1]['retention'])[0]
        best_engagement = max(comparison.items(), key=lambda x: x[1]['engagement'])[0]
        
        return {
            'comparison': comparison,
            'best_retention': best_retention,
            'best_engagement': best_engagement
        }
    
    def generate_batch_report(self) -> str:
        """Generate report for all jobs"""
        report = f"""
╔══════════════════════════════════════════════════════════════╗
║              BATCH PROCESSING REPORT                         ║
╚══════════════════════════════════════════════════════════════╝

Total Jobs Processed: {len(self.results)}

JOB SUMMARY
───────────
"""
        
        for job_id, data in self.results.items():
            rep = data['report']
            report += f"""
{job_id}
  Retention:   {rep['retention']['final_retention']:.1%}
  Engagement:  {rep['engagement']['overall_mean']:.2f}
  Drop-offs:   {rep['drop_off']['total_drop_offs']}
"""
        
        report += "\n" + "═" * 64 + "\n"
        
        return report


class PluginSystem:
    """
    Extensible plugin system for custom analyzers
    """
    
    def __init__(self, simulator: AudienceSimulator):
        """Initialize plugin system"""
        self.simulator = simulator
        self.plugins = {}
        
    def register_plugin(self, plugin_name: str, plugin_class):
        """Register a plugin"""
        self.plugins[plugin_name] = plugin_class(self.simulator)
        
    def execute_plugin(self, plugin_name: str, method_name: str, *args, **kwargs):
        """Execute a plugin method"""
        if plugin_name not in self.plugins:
            raise ValueError(f"Plugin {plugin_name} not registered")
        
        plugin = self.plugins[plugin_name]
        if not hasattr(plugin, method_name):
            raise ValueError(f"Plugin {plugin_name} has no method {method_name}")
        
        method = getattr(plugin, method_name)
        return method(*args, **kwargs)
    
    def list_plugins(self) -> List[str]:
        """List all registered plugins"""
     


# ============================================================================
# EXTENDED EXAMPLES AND TUTORIALS
# ============================================================================

def tutorial_basic_usage():
    """
    Tutorial: Basic usage of the audience simulation system
    """
    print("""
╔══════════════════════════════════════════════════════════════╗
║            TUTORIAL: Basic Usage                             ║
╚══════════════════════════════════════════════════════════════╝

This tutorial demonstrates the basic workflow for running an audience
simulation.

STEP 1: Create a simulator with desired number of viewers
    """)
    
    # Step 1
    simulator = AudienceSimulator(num_viewers=100, seed=42)
    print(f"✓ Created simulator with {simulator.num_viewers} viewers")
    
    print("""
STEP 2: Create scene data
    """)
    
    # Step 2
    scenes = [
        create_sample_scene_data('opening', 'action', 180),
        create_sample_scene_data('development', 'dialogue', 120),
        create_sample_scene_data('climax', 'action', 240)
    ]
    print(f"✓ Created {len(scenes)} scenes")
    
    print("""
STEP 3: Run the simulation
    """)
    
    # Step 3
    simulator.simulate_sequence(scenes)
    print(f"✓ Simulation complete")
    
    print("""
STEP 4: Get results
    """)
    
    # Step 4
    report = simulator.get_comprehensive_report()
    print(f"""
Results:
  - Retention: {report['retention']['final_retention']:.1%}
  - Engagement: {report['engagement']['overall_mean']:.2f}
  - Drop-offs: {report['drop_off']['total_drop_offs']}
    """)
    
    print("""
STEP 5: Export results
    """)
    
    # Step 5
    exporter = DataExporter(simulator)
    exporter.export_to_json('tutorial_results.json')
    print("✓ Results exported to tutorial_results.json")
    
    print("""
╔══════════════════════════════════════════════════════════════╗
║            Tutorial Complete!                                ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    return simulator


def tutorial_advanced_analysis():
    """
    Tutorial: Advanced analysis features
    """
    print("""
╔══════════════════════════════════════════════════════════════╗
║         TUTORIAL: Advanced Analysis                          ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    # Create and run simulation
    simulator = AudienceSimulator(num_viewers=500, seed=42)
    builder = ScenarioBuilder()
    scenes = builder.build_three_act_structure(duration_minutes=90, genre='action')
    simulator.simulate_sequence(scenes)
    
    print("Simulation complete. Running advanced analysis...\n")
    
    # 1. Demographic Analysis
    print("1. DEMOGRAPHIC ANALYSIS")
    demo_analyzer = DemographicAnalyzer(simulator)
    demo_report = demo_analyzer.analyze_viewer_type_performance()
    print(f"   Best performing segment: {demo_report['best_performing']}")
    print(f"   Worst performing segment: {demo_report['worst_performing']}\n")
    
    # 2. Scene Optimization
    print("2. SCENE OPTIMIZATION")
    optimizer = SceneOptimizer(simulator)
    for i, scene in enumerate(scenes[:5]):
        optimizer.analyze_scene(
            scene['scene_data']['scene_id'],
            scene['timestamp'],
            scene['duration']
        )
    scene_report = optimizer.generate_scene_report()
    print(f"   Average scene score: {scene_report['average_score']:.2f}")
    print(f"   Problematic scenes: {len(scene_report['problematic_scenes'])}\n")
    
    # 3. Behavioral Patterns
    print("3. BEHAVIORAL PATTERNS")
    pattern_detector = BehavioralPatternDetector(simulator)
    pattern_report = pattern_detector.generate_pattern_report()
    print(f"   Binge watchers: {pattern_report['binge_watchers']}")
    print(f"   Detected superfans: {pattern_report['detected_superfans']}\n")
    
    # 4. Statistical Analysis
    print("4. STATISTICAL ANALYSIS")
    stat_analyzer = StatisticalAnalyzer(simulator)
    engagement_stats = stat_analyzer.calculate_engagement_statistics()
    print(f"   Mean engagement: {engagement_stats['mean']:.3f}")
    print(f"   Std deviation: {engagement_stats['std_dev']:.3f}\n")
    
    # 5. Quality Metrics
    print("5. QUALITY METRICS")
    quality_calc = QualityMetricsCalculator(simulator)
    quality = quality_calc.calculate_content_quality_score()
    print(f"   Overall quality: {quality['grade']} ({quality['overall_score']:.2f})")
    
    print("""
╔══════════════════════════════════════════════════════════════╗
║         Advanced Analysis Tutorial Complete!                 ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    return simulator


def tutorial_ab_testing():
    """
    Tutorial: A/B testing different versions
    """
    print("""
╔══════════════════════════════════════════════════════════════╗
║         TUTORIAL: A/B Testing                                ║
╚══════════════════════════════════════════════════════════════╝

This tutorial shows how to compare two different versions of content.
    """)
    
    # Create A/B test
    ab_test = ABTestingFramework()
    
    print("Creating experiment: Opening Scene Test")
    ab_test.create_experiment(
        experiment_id='opening_test',
        variant_a_metadata={'description': 'Slow build opening'},
        variant_b_metadata={'description': 'Fast action opening'},
        num_viewers_per_variant=250
    )
    
    # Variant A: Slow build
    variant_a = [
        create_sample_scene_data('a1', 'dialogue', 120),
        create_sample_scene_data('a2', 'mystery', 150),
        create_sample_scene_data('a3', 'action', 180)
    ]
    
    # Variant B: Fast action
    variant_b = [
        create_sample_scene_data('b1', 'action', 180),
        create_sample_scene_data('b2', 'dialogue', 120),
        create_sample_scene_data('b3', 'action', 150)
    ]
    
    print("Running experiment...")
    results = ab_test.run_experiment('opening_test', variant_a, variant_b)
    
    print(f"""
Results:
  Winner: Variant {results['overall_winner']}
  Confidence: {results['confidence']:.1%}
  
  Retention:
    - Variant A: {results['retention']['variant_a']:.1%}
    - Variant B: {results['retention']['variant_b']:.1%}
    - Lift: {results['retention']['lift']:.1f}%
    
  Engagement:
    - Variant A: {results['engagement']['variant_a']:.2f}
    - Variant B: {results['engagement']['variant_b']:.2f}
    - Lift: {results['engagement']['lift']:.1f}%
    """)
    
    print("""
╔══════════════════════════════════════════════════════════════╗
║         A/B Testing Tutorial Complete!                       ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    return ab_test


def tutorial_custom_metrics():
    """
    Tutorial: Creating custom metrics
    """
    print("""
╔══════════════════════════════════════════════════════════════╗
║         TUTORIAL: Custom Metrics                             ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    # Create simulator
    simulator = quick_simulate(num_scenes=8, num_viewers=200)
    
    # Create custom metrics builder
    metrics_builder = CustomMetricsBuilder(simulator)
    
    print("Defining custom metrics...")
    
    # Define a custom metric: "Superfan Score"
    def superfan_score(sim):
        superfans = [
            v for v in sim.viewers
            if v.emotional_investment > 0.8 and not v.dropped_off
        ]
        return len(superfans) / sim.num_viewers
    
    metrics_builder.define_metric(
        'superfan_score',
        superfan_score,
        'Percentage of viewers showing superfan behavior'
    )
    
    # Define another: "Qualit


# ============================================================================
# VALIDATION AND ERROR HANDLING
# ============================================================================

class ValidationError(Exception):
    """Custom exception for validation errors"""
    pass


class DataValidator:
    """
    Validate input data and simulation parameters
    """
    
    @staticmethod
    def validate_scene_data(scene_data: Dict) -> bool:
        """Validate scene data structure"""
        required_fields = ['scene_id', 'pacing', 'tension']
        
        for field in required_fields:
            if field not in scene_data:
                raise ValidationError(f"Scene data missing required field: {field}")
        
        # Validate ranges
        if not 0 <= scene_data['pacing'] <= 1:
            raise ValidationError(f"Pacing must be between 0 and 1, got {scene_data['pacing']}")
        
        if not 0 <= scene_data['tension'] <= 1:
            raise ValidationError(f"Tension must be between 0 and 1, got {scene_data['tension']}")
        
        return True
    
    @staticmethod
    def validate_narrative_state(narrative_state: Dict) -> bool:
        """Validate narrative state structure"""
        required_fields = ['genre', 'stakes', 'active_character_count']
        
        for field in required_fields:
            if field not in narrative_state:
                raise ValidationError(f"Narrative state missing required field: {field}")
        
        # Validate values
        if narrative_state['active_character_count'] < 0:
            raise ValidationError("Character count cannot be negative")
        
        if not 0 <= narrative_state['stakes'] <= 1:
            raise ValidationError(f"Stakes must be between 0 and 1")
        
        return True
    
    @staticmethod
    def validate_viewer_distribution(distribution: Dict) -> bool:
        """Validate viewer distribution"""
        total = sum(distribution.values())
        
        if not 0.99 <= total <= 1.01:  # Allow small floating point errors
            raise ValidationError(f"Viewer distribution must sum to 1.0, got {total}")
        
        for vtype, proportion in distribution.items():
            if not 0 <= proportion <= 1:
                raise ValidationError(f"Invalid proportion for {vtype}: {proportion}")
        
        return True
    
    @staticmethod
    def validate_simulation_parameters(
        num_viewers: int,
        scenes: List[Dict]
    ) -> bool:
        """Validate simulation parameters"""
        if num_viewers < 1:
            raise ValidationError("Number of viewers must be at least 1")
        
        if num_viewers > 100000:
            raise ValidationError("Number of viewers exceeds maximum (100,000)")
        
        if not scenes:
            raise ValidationError("Scenes list cannot be empty")
        
        if len(scenes) > 10000:
            raise ValidationError("Too many scenes (max 10,000)")
        
        return True


class ErrorHandler:
    """
    Handle errors gracefully during simulation
    """
    
    def __init__(self):
        """Initialize error handler"""
        self.errors: List[Dict] = []
        self.warnings: List[Dict] = []
        
    def log_error(self, error_type: str, message: str, context: Dict = None):
        """Log an error"""
        self.errors.append({
            'type': error_type,
            'message': message,
            'context': context or {},
            'timestamp': str(np.datetime64('now'))
        })
    
    def log_warning(self, warning_type: str, message: str, context: Dict = None):
        """Log a warning"""
        self.warnings.append({
            'type': warning_type,
            'message': message,
            'context': context or {},
            'timestamp': str(np.datetime64('now'))
        })
    
    def get_error_summary(self) -> Dict:
        """Get summary of errors and warnings"""
        return {
            'total_errors': len(self.errors),
            'total_warnings': len(self.warnings),
            'error_types': defaultdict(int),
            'warning_types': defaultdict(int)
        }
    
    def export_error_log(self, filepath: str):
        """Export error log to file"""
        log_data = {
            'errors': self.errors,
            'warnings': self.warnings,
            'summary': self.get_error_summary()
        }
        
        with open(filepath, 'w') as f:
            json.dump(log_data, f, indent=2)


# ============================================================================
# DATA TRANSFORMATION UTILITIES
# ============================================================================

class DataTransformer:
    """
    Transform data between different formats
    """
    
    @staticmethod
    def normalize_metrics(metrics: Dict, method: str = 'minmax') -> Dict:
        """Normalize metrics to 0-1 range"""
        normalized = {}
        
        for key, value in metrics.items():
            if isinstance(value, (int, float)):
                if method == 'minmax':
                    # Assume values are already roughly 0-1
                    normalized[key] = np.clip(value, 0, 1)
                elif method == 'zscore':
                    # Would need population statistics
                    normalized[key] = value
            else:
                normalized[key] = value
        
        return normalized
    
    @staticmethod
    def aggregate_temporal_data(
        data: List[Tuple[float, float]],
        window_size: int = 10
    ) -> List[Tuple[float, float]]:
        """Aggregate time series data into windows"""
        if len(data) < window_size:
            return data
        
        aggregated = []
        for i in range(0, len(data), window_size):
            window = data[i:i+window_size]
            avg_time = np.mean([t for t, v in window])
            avg_value = np.mean([v for t, v in window])
            aggregated.append((avg_time, avg_value))
        
        return aggregated
    
    @staticmethod
    def pivot_viewer_data(
        viewers: List[ViewerPersona],
        metric: str
    ) -> Dict[str, List[float]]:
        """Pivot viewer data by viewer type"""
        pivoted = defaultdict(list)
        
        for viewer in viewers:
            vtype = viewer.viewer_type.value
            
            if metric == 'engagement' and viewer.viewing_history:
                value = np.mean([m.engagement for m in viewer.viewing_history])
                pivoted[vtype].append(value)
            elif metric == 'confusion':
                pivoted[vtype].append(viewer.cumulative_confusion)
            elif metric == 'investment':
                pivoted[vtype].append(viewer.emotional_investment)
        
        return dict(pivoted)
    
    @staticmethod
    def reshape_for_ml(
        simulator: AudienceSimulator
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Reshape data for machine learning"""
        X = []  # Features
        y = []  # Target (engagement)
        
        for viewer in simulator.viewers:
            if viewer.viewing_history:
                features = [
                    viewer.film_literacy.value,
                    viewer.attention_span,
                    viewer.patience,
                    viewer.emotional_sensitivity,
                    viewer.analytical_tendency
                ]
                
                target = np.mean([m.engagement for m in viewer.viewing_history])
                
                X.append(features)
                y.append(target)
        
        return np.array(X), np.array(y)


class DataAggregator:
    """
    Aggregate data across multiple simulations
    """
    
    def __init__(self):
        """I


# ============================================================================
# COMPREHENSIVE API REFERENCE DOCUMENTATION
# ============================================================================

"""
API REFERENCE
=============

Core Classes
------------

ViewerPersona
~~~~~~~~~~~~~
Represents an individual viewer with specific characteristics.

Constructor Parameters:
    viewer_id (str): Unique identifier for the viewer
    viewer_type (ViewerType): Type of viewer (CASUAL, GENRE_FAN, CINEPHILE, CRITIC, SUPERFAN)
    film_literacy (FilmLiteracy): Level of film knowledge (BASIC, INTERMEDIATE, ADVANCED, EXPERT)
    genre_knowledge (Dict[str, GenreKnowledge]): Knowledge level per genre
    attention_span (float): How long viewer can maintain focus (0-1)
    patience (float): Tolerance for slow pacing (0-1)
    emotional_sensitivity (float): Strength of emotional response (0-1)
    analytical_tendency (float): Tendency to analyze vs experience (0-1)
    franchise_knowledge (Dict[str, float]): Familiarity with franchises (0-1)
    preferences (Dict[str, float]): Content preferences (0-1)

Key Methods:
    get_genre_knowledge_level(genre: str) -> GenreKnowledge
        Get knowledge level for a specific genre
    
    get_franchise_knowledge_level(franchise: str) -> float
        Get familiarity with a specific franchise
    
    update_character_memory(character_id: str, character_info: Dict)
        Update memory about a character
    
    recall_character(character_id: str) -> Optional[Dict]
        Try to recall information about a character
    
    can_follow_timeline(timeline_complexity: float) -> bool
        Determine if viewer can follow non-linear timeline
    
    make_prediction(timestamp: float, narrative_state: Dict) -> PlotPrediction
        Make a prediction about future plot developments

Properties:
    current_engagement (EngagementLevel): Current engagement state
    current_attention (float): Current attention level
    cumulative_boredom (float): Accumulated boredom
    cumulative_confusion (float): Accumulated confusion
    emotional_investment (float): Emotional investment in story
    dropped_off (bool): Whether viewer has dropped off
    drop_off_time (Optional[float]): Time of drop-off
    viewing_history (List[ViewingMoment]): History of viewing moments
    character_empathy (Dict[str, CharacterEmpathy]): Empathy for characters
    predictions (List[PlotPrediction]): Predictions made by viewer

Example Usage:
    >>> viewer = ViewerPersona(
    ...     viewer_id="viewer_001",
    ...     viewer_type=ViewerType.CINEPHILE,
    ...     film_literacy=FilmLiteracy.EXPERT,
    ...     attention_span=0.9,
    ...     patience=0.8
    ... )
    >>> viewer.update_character_memory("hero", {"name": "John", "timestamp": 0.0})
    >>> memory = viewer.recall_character("hero")


EngagementTracker
~~~~~~~~~~~~~~~~~
Tracks moment-to-moment engagement for viewers.

Constructor Parameters:
    boredom_threshold (float): Level at which boredom becomes problematic (default: 0.6)
    confusion_threshold (float): Level at which confusion causes disengagement (default: 0.7)
    attention_decay_rate (float): How quickly attention decays (default: 0.95)
    engagement_recovery_rate (float): How quickly engagement recovers (default: 1.05)

Key Methods:
    update_engagement(viewer: ViewerPersona, timestamp: float, 
                     scene_data: Dict, narrative_state: Dict) -> Tuple[float, float, Dict]
        Update engagement metrics for a viewer
        Returns: (engagement_level, attention_level, metrics_dict)
    
    predict_dropoff(viewer: ViewerPersona, timestamp: float) -> DropOffRisk
        Predict likelihood of viewer dropping off
    
    get_engagement_trend(window: int = 20) -> str
        Analyze recent engagement trend
        Returns: 'increasing', 'decreasing', or 'stable'
    
    reset_boredom()
        Reset boredom accumulator after exciting moment

Properties:
    attention_history (deque): Recent attention levels
    engagement_history (deque): Recent engagement levels
    boredom_accumulator (float): Accumulated boredom
    consecutive_boring_moments (int): Count of consecutive boring moments

Example Usage:
    >>> tracker = EngagementTracker()
    >>> engagement, attention, metrics = tracker.update_engagement(
    ...     viewer, 
    ...     timestamp=120.0,
    ...     scene_data={'pacing': 0.7, 'tension': 0.6},
    ...     narrative_state={'stakes': 0.8}
    ... )
    >>> drop_off_risk = tracker.predict_dropoff(viewer, 120.0)
    >>> print(f"Drop-off risk: {drop_off_risk.risk_score:.2f}")


ConfusionDetector
~~~~~~~~~~~~~~~~~
Detects and tracks different types of confusion.

Constructor Parameters:
    character_threshold (int): Max characters before confusion likely (default: 8)
    timeline_complexity_threshold (float): Max timeline complexity (default: 0.7)
    plot_thread_threshold (int): Max simultaneous plot threads (default: 5)

Key Methods:
    detect_confusion(viewer: ViewerPersona, timestamp: float,
                    scene_data: Dict, narrative_state: Dict) -> Dict[ConfusionType, float]
        Detect all types of confusion at current moment
        Returns: Dictionary mapping confusion types to levels
    
    get_confusion_report(viewer: ViewerPersona) -> Dict
        Generate comprehensive confusion report for viewer

Confusion Types:
    CHARACTER: Confusion about who characters are
    PLOT: Confusion about what's happening
    TIMELINE: Confusion about when events occur
    MOTIVATION: Confusion about why characters act
    RELATIONSHIP: Confusion about character relationships
    LOCATION: Confusion about where events occur
    THEME: Confusion about story meaning

Example Usage:
    >>> detector = ConfusionDetector()
    >>> confusion = detector.detect_confusion(
    ...     viewer,
    ...     timestamp=300.0,
    ...     scene_data={'new_character_introduced': True},
    ...     narrative_state={'active_character_count': 10}
    ... )
    >>> if ConfusionType.CHARACTER in confusion:
    ...     print(f"Character confusion: {confusion[ConfusionType.CHARACTER]:.2f}")


EmotionalResponseModel
~~~~~~~~~~~~~~~~~~~~~~
Models emotional responses throughout content.

Constructor Parameters:
    emotion_decay_rate (float): How quickly emotions fade (default: 0.95)
    empathy_build_rate (float): How quickly empathy builds (default: 0.02)
    tension_build_rate (float): How quickly tension accumulates (default: 0.03)
    catharsis_threshold (float): Tension level needed for catharsis (default: 0.7)

Key Methods:
    update_emotions(viewer: ViewerPersona, timestamp: float,
                   scene_data: Dict, narrative_state: Dict) -> Dict[EmotionType, float]
        Update emotional state for viewer
        Returns: Current emotion levels
    
    calculate_surprise(viewer: ViewerPersona, event_data: Dict) -> float
        Calculate surprise level for an event
    
    get_emotional_arc() -> Dict
        Get the emotional arc of the viewing experience
    
    get_character_empathy_report(viewer: ViewerPersona) -> Dict
        Generate report on character empathy

Emotion Types:
    JOY, SADNESS, FEAR, ANGER, SURPRISE, DISGUST, ANTICIPATION, TRUST,
    TENSION, RELIEF, EMPATHY, SATISFACTION

Example Usage:
    >>> emotion_model = EmotionalResponseModel()
    >>> emotions = emotion_model.update_emotions(
    ...     viewer,
    ...     timestamp=600.0,
    ...     scene_data={'emotions': {'sadness': 0.8, 'empathy': 0.7}},
    ...     narrative_state={'stakes': 0.9}
    ... )
    >>> arc = emotion_model.get_emotional_arc()
    >>> print(f"Dominant emotions: {arc['primary_emotions']}")


PredictabilityAnalyzer
~~~~~~~~~~~~~~~~~~~~~~
Analyzes plot twists, surprises, and


# ============================================================================
# EXTENDED IMPLEMENTATION GUIDES AND EXAMPLES
# ============================================================================

"""
IMPLEMENTATION GUIDE: Building a Complete Analysis Pipeline
============================================================

This guide walks through building a complete content analysis pipeline from
scratch, demonstrating best practices and advanced techniques.

Step 1: Project Setup
----------------------

import json
import numpy as np
from audience_system import *

# Configure paths
PROJECT_DIR = './my_analysis'
DATA_DIR = f'{PROJECT_DIR}/data'
RESULTS_DIR = f'{PROJECT_DIR}/results'
CACHE_DIR = f'{PROJECT_DIR}/cache'

# Create directories
import os
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)
os.makedirs(CACHE_DIR, exist_ok=True)

# Initialize configuration
config_mgr = ConfigurationManager()
config = config_mgr.default_config

# Customize for your needs
config['simulation']['num_viewers'] = 2000
config['simulation']['random_seed'] = 42

# Save configuration
config_mgr.save_config('project_config', config)
config_mgr.export_config('project_config', f'{DATA_DIR}/config.json')


Step 2: Content Preparation
----------------------------

# Option A: Build synthetic content for testing
builder = ScenarioBuilder()
scenes = builder.build_three_act_structure(
    duration_minutes=120,
    genre='action'
)

# Option B: Convert real content
def convert_real_content(content_file):
    with open(content_file, 'r') as f:
        content = json.load(f)
    
    scenes = []
    for i, segment in enumerate(content['segments']):
        scene = create_sample_scene_data(
            scene_id=f"scene_{i:03d}",
            scene_type=segment['type'],
            duration=segment['duration']
        )
        
        # Customize based on real content
        scene['scene_data']['pacing'] = segment.get('pacing', 0.5)
        scene['scene_data']['tension'] = segment.get('tension', 0.5)
        
        scenes.append(scene)
    
    return scenes

# Use option A or B
# scenes = convert_real_content('content.json')

# Save scenes for reuse
with open(f'{DATA_DIR}/scenes.json', 'w') as f:
    json.dump(scenes, f, default=str)


Step 3: Validation
-------------------

# Validate all scene data
validator = DataValidator()
error_handler = ErrorHandler()

for scene in scenes:
    try:
        validator.validate_scene_data(scene['scene_data'])
        validator.validate_narrative_state(scene['narrative_state'])
    except ValidationError as e:
        error_handler.log_error('validation', str(e), {'scene': scene['scene_data']['scene_id']})

# Check for errors
if error_handler.errors:
    print(f"Found {len(error_handler.errors)} validation errors")
    error_handler.export_error_log(f'{RESULTS_DIR}/validation_errors.json')
    # Fix errors before proceeding
else:
    print("All scenes validated successfully")


Step 4: Simulation Execution
-----------------------------

# Enable caching for faster iterations
cache = SimulationCache(CACHE_DIR)
cache_key = cache.generate_cache_key(scenes, config['simulation']['num_viewers'])

# Check cache
cached_result = cache.get_cached_result(cache_key)

if cached_result:
    print("Using cached results")
    # Load from cache
else:
    print("Running new simulation")
    
    # Create simulator
    simulator = AudienceSimulator(
        num_viewers=config['simulation']['num_viewers'],
        seed=config['simulation']['random_seed']
    )
    
    # Optional: Add real-time monitoring
    monitor = RealTimeMonitor(simulator)
    
    # Run simulation
    print(f"Simulating {len(scenes)} scenes with {simulator.num_viewers} viewers...")
    results = simulator.simulate_sequence(scenes)
    
    # Save to cache
    report = simulator.get_comprehensive_report()
    cache.save_to_cache(cache_key, report)
    
    print("Simulation complete")


Step 5: Comprehensive Analysis
-------------------------------

# 1. Basic metrics
print("\n=== BASIC METRICS ===")
print(f"Retention: {report['retention']['final_retention']:.1%}")
print(f"Engagement: {report['engagement']['overall_mean']:.2f}")
print(f"Drop-off: {report['drop_off']['drop_off_rate']:.1%}")

# 2. Demographic analysis
print("\n=== DEMOGRAPHIC ANALYSIS ===")
demo_analyzer = DemographicAnalyzer(simulator)
demo_report = demo_analyzer.generate_demographic_report()

for segment in demo_report['underserved_segments']:
    print(f"Underserved: {segment}")

# 3. Scene optimization
print("\n=== SCENE OPTIMIZATION ===")
optimizer = SceneOptimizer(simulator)

for scene in scenes:
    optimizer.analyze_scene(
        scene['scene_data']['scene_id'],
        scene.get('timestamp', 0),
        scene.get('duration', 120)
    )

scene_report = optimizer.generate_scene_report()
problematic = optimizer.identify_problematic_scenes()

print(f"Average scene score: {scene_report['average_score']:.2f}")
print(f"Problematic scenes: {len(problematic)}")

# Get improvement suggestions
for scene in problematic[:3]:
    suggestions = optimizer.suggest_scene_improvements(scene['scene_id'])
    print(f"\n{scene['scene_id']}:")
    for suggestion in suggestions[:2]:
        print(f"  - {suggestion}")

# 4. Character analysis
print("\n=== CHARACTER ANALYSIS ===")
char_tracker = CharacterArcTracker(simulator)

# Build arcs for all characters
for char_id in ['protagonist', 'antagonist', 'sidekick']:
    try:
        char_tracker.build_character_arc(char_id, char_id.title())
        analysis = char_tracker.analyze_character_arc(char_id)
        print(f"{char_id}: {analysis['grade']} (effectiveness: {analysis['effectiveness']:.2f})")
    except:
        pass

# 5. Statistical analysis
print("\n=== STATISTICAL ANALYSIS ===")
stat_analyzer = StatisticalAnalyzer(simulator)
stats = stat_analyzer.calculate_engagement_statistics()

print(f"Mean: {stats['mean']:.3f} ± {stats['std_dev']:.3f}")
print(f"Median: {stats['median']:.3f}")
print(f"IQR: {stats['iqr']:.3f}")

# 6. Behavioral patterns
print("\n=== BEHAVIORAL PATTERNS ===")
pattern_detector = BehavioralPatternDetector(simulator)
patterns = pattern_detector.generate_pattern_report()

print(f"Binge watchers: {patterns['binge_watchers']}")
print(f"Superfans detected: {patterns['detected_superfans']}")

# 7. Quality metrics
print("\n=== QUALITY METRICS ===")
quality_calc = QualityMetricsCalculator(simulator)
quality = quality_calc.generate_quality_report()

print(f"Content quality: {quality['content_quality']['grade']}")
print(f"Pacing quality: {quality['pacing_quality']['quality']:.2f}")
print(f"Narrative coherence: {quality['narrative_coherence']['rating']}")

# 8. Sentiment analysis
print("\n=== SENTIMENT ANALYSIS ===")
sentiment_analyzer = SentimentAnalyzer(simulator)
sentiment = sentiment_analyzer.calculate_overall_sentiment()
nps = sentiment_analyzer.calculate_net_promoter_score()

print(f"Sentiment: {sentiment['category']}")
print(f"NPS: {nps['nps']:.1f} ({nps['category']})")

# 9. Benchmark comparison
print("\n=== BENCHMARK COMPARISON ===")
comparator = BenchmarkComparator()
target_benchmark = comparator.suggest_target_benchmark({'genre': 'action', 'budget': 'high'})
comparison = comparator.compare_to_benchmark(simulator, target_benchmark)

print(f"Target benchmark: {target_benchmark}")
print(f"Assessment: {comparison['overall_assessment']}")

# 10. Time series analysis
print("\n=== TIME SERIES ANALYSIS ===")
ts_analyzer = TimeSeriesAnalyzer(simulator)
trend = ts_analyzer.detect_trends('engagement')
seasonality = ts_analyzer.detect_seasonality('engagement')

print(f"Engagement trend: {trend['trend']}")
print(f"Seasonality: {seasonality.get('seasonality', 'not detected')}")


Step 6: Report Generation
----


# ============================================================================
# COMPREHENSIVE TESTING UTILITIES AND EXAMPLES
# ============================================================================

"""
TESTING AND VALIDATION SUITE
=============================

This section provides comprehensive testing utilities for validating
simulation accuracy, performance, and consistency.
"""

class TestHarness:
    """
    Comprehensive testing harness for validation
    """
    
    def __init__(self):
        """Initialize test harness"""
        self.test_results = []
        self.passed = 0
        self.failed = 0
        
    def run_unit_tests(self):
        """Run unit tests for core functionality"""
        print("\n" + "="*60)
        print("RUNNING UNIT TESTS")
        print("="*60)
        
        # Test 1: ViewerPersona creation
        self._test_viewer_creation()
        
        # Test 2: Scene data validation
        self._test_scene_validation()
        
        # Test 3: Engagement tracking
        self._test_engagement_tracking()
        
        # Test 4: Confusion detection
        self._test_confusion_detection()
        
        # Test 5: Emotion modeling
        self._test_emotion_modeling()
        
        # Test 6: Predictability analysis
        self._test_predictability_analysis()
        
        # Test 7: Simulation execution
        self._test_simulation_execution()
        
        # Test 8: Report generation
        self._test_report_generation()
        
        # Test 9: Export functionality
        self._test_export_functionality()
        
        # Test 10: Integration helpers
        self._test_integration_helpers()
        
        self._print_test_summary()
    
    def _test_viewer_creation(self):
        """Test viewer persona creation"""
        try:
            viewer = ViewerPersona(
                viewer_id="test_viewer",
                viewer_type=ViewerType.CASUAL,
                film_literacy=FilmLiteracy.BASIC
            )
            assert viewer.viewer_id == "test_viewer"
            assert viewer.viewer_type == ViewerType.CASUAL
            self._record_pass("ViewerPersona creation")
        except Exception as e:
            self._record_fail("ViewerPersona creation", str(e))
    
    def _test_scene_validation(self):
        """Test scene data validation"""
        try:
            validator = DataValidator()
            scene = create_sample_scene_data("test", "action", 120)
            validator.validate_scene_data(scene['scene_data'])
            validator.validate_narrative_state(scene['narrative_state'])
            self._record_pass("Scene validation")
        except Exception as e:
            self._record_fail("Scene validation", str(e))
    
    def _test_engagement_tracking(self):
        """Test engagement tracking"""
        try:
            viewer = ViewerPersona("test", ViewerType.CASUAL)
            tracker = EngagementTracker()
            scene = create_sample_scene_data("test", "action", 120)
            engagement, attention, metrics = tracker.update_engagement(
                viewer, 0.0, scene['scene_data'], scene['narrative_state']
            )
            assert 0 <= engagement <= 1
            assert 0 <= attention <= 1
            self._record_pass("Engagement tracking")
        except Exception as e:
            self._record_fail("Engagement tracking", str(e))
    
    def _test_confusion_detection(self):
        """Test confusion detection"""
        try:
            viewer = ViewerPersona("test", ViewerType.CASUAL)
            detector = ConfusionDetector()
            scene = create_sample_scene_data("test", "action", 120)
            confusion = detector.detect_confusion(
                viewer, 0.0, scene['scene_data'], scene['narrative_state']
            )
            assert isinstance(confusion, dict)
            self._record_pass("Confusion detection")
        except Exception as e:
            self._record_fail("Confusion detection", str(e))
    
    def _test_emotion_modeling(self):
        """Test emotion modeling"""
        try:
            viewer = ViewerPersona("test", ViewerType.CASUAL)
            emotion_model = EmotionalResponseModel()
            scene = create_sample_scene_data("test", "emotional", 120)
            emotions = emotion_model.update_emotions(
                viewer, 0.0, scene['scene_data'], scene['narrative_state']
            )
            assert isinstance(emotions, dict)
            self._record_pass("Emotion modeling")
        except Exception as e:
            self._record_fail("Emotion modeling", str(e))
    
    def _test_predictability_analysis(self):
        """Test predictability analysis"""
        try:
            viewer = ViewerPersona("test", ViewerType.CASUAL)
            analyzer = PredictabilityAnalyzer()
            scene = create_sample_scene_data("test", "mystery", 120)
            analysis = analyzer.analyze_moment(
                viewer, 0.0, scene['scene_data'], scene['narrative_state']
            )
            assert isinstance(analysis, dict)
            self._record_pass("Predictability analysis")
        except Exception as e:
            self._record_fail("Predictability analysis", str(e))
    
    def _test_simulation_execution(self):
        """Test simulation execution"""
        try:
            simulator = AudienceSimulator(num_viewers=10)
            scenes = [create_sample_scene_data(f"test_{i}", "action", 60) for i in range(3)]
            simulator.simulate_sequence(scenes)
            assert len(simulator.aggregate_metrics) > 0
            self._record_pass("Simulation execution")
        except Exception as e:
            self._record_fail("Simulation execution", str(e))
    
    def _test_report_generation(self):
        """Test report generation"""
        try:
            simulator = quick_simulate(num_scenes=3, num_viewers=10)
            report = simulator.get_comprehensive_report()
            assert 'retention' in report
            assert 'engagement' in report
            self._record_pass("Report generation")
        except Exception as e:
            self._record_fail("Report generation", str(e))
    
    def _test_export_functionality(self):
        """Test export functionality"""
        try:
            simulator = quick_simulate(num_scenes=2, num_viewers=10)
            exporter = DataExporter(simulator)
            # Just test that methods don't crash
            assert exporter is not None
            self._record_pass("Export functionality")
        except Exception as e:
            self._record_fail("Export functionality", str(e))
    
    def _test_integration_helpers(self):
        """Test integration helpers"""
        try:
            simulator = quick_simulate(num_scenes=2, num_viewers=10)
            integration = IntegrationHelper(simulator)
            api_data = integration.to_rest_api_format()
            assert 'status' in api_data
            self._record_pass("Integration helpers")
        except Exception as e:
            self._record_fail("Integration helpers", str(e))
    
    def _record_pass(self, test_name: str):
        """Record a passing test"""
        self.passed += 1
        self.test_results.append({'test': test_name, 'result': 'PASS'})
        print(f"✓ {test_name}")
    
    def _record_fail(self, test_name: str, error: str):
        """Record a failing test"""
        self.failed += 1
        self.test_results.append({'test': test_name, 'result': 'FAIL', 'error': error})
        print(f"✗ {test_name}: {error}")
    
    def _print_test_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"Total: {self.passed + s


# ============================================================================
# EXTENDED DOCUMENTATION AND IMPLEMENTATION PATTERNS
# ============================================================================

"""
ADVANCED IMPLEMENTATION PATTERNS
=================================

This section provides advanced patterns for extending and customizing
the audience simulation system for specific use cases.
"""


class AdvancedPatterns:
    """
    Collection of advanced implementation patterns
    """
    
    @staticmethod
    def pattern_custom_viewer_type():
        """
        Pattern: Creating custom viewer types
        
        Example of extending the system with custom viewer personas
        """
        class StreamingEnthusiast(ViewerPersona):
            """Custom viewer type for streaming platform users"""
            
            def __init__(self, viewer_id: str):
                super().__init__(
                    viewer_id=viewer_id,
                    viewer_type=ViewerType.GENRE_FAN,
                    film_literacy=FilmLiteracy.INTERMEDIATE
                )
                self.binge_tolerance = random.uniform(0.7, 0.95)
                self.skip_intro_probability = 0.85
                self.second_screen_usage = random.uniform(0.3, 0.7)
            
            def adjust_engagement(self, base_engagement: float) -> float:
                """Adjust for second screen usage"""
                distraction_penalty = self.second_screen_usage * 0.2
                return max(0, base_engagement - distraction_penalty)
        
        return StreamingEnthusiast
    
    @staticmethod
    def pattern_custom_metric():
        """
        Pattern: Creating custom metrics
        
        Example of defining and tracking custom metrics
        """
        def calculate_emotional_journey_score(simulator):
            """
            Custom metric: Emotional Journey Score
            Measures how well the content takes viewers on an emotional ride
            """
            if not simulator.aggregate_metrics:
                return 0.0
            
            # Extract emotion variance over time
            emotion_variance = []
            for moment in simulator.aggregate_metrics:
                if 'emotions' in moment:
                    emotions = moment['emotions']
                    variance = np.var(list(emotions.values()))
                    emotion_variance.append(variance)
            
            if not emotion_variance:
                return 0.0
            
            # Higher variance indicates more emotional journey
            journey_score = np.mean(emotion_variance)
            
            # Normalize to 0-1 scale
            normalized_score = min(1.0, journey_score / 0.1)
            
            return normalized_score
        
        return calculate_emotional_journey_score
    
    @staticmethod
    def pattern_custom_analyzer():
        """
        Pattern: Creating custom analyzers
        
        Example of building specialized analysis tools
        """
        class PacingAnalyzer:
            """Analyzes content pacing effectiveness"""
            
            def __init__(self, simulator):
                self.simulator = simulator
            
            def analyze_pacing(self):
                """Analyze overall pacing"""
                engagement_changes = []
                
                for i in range(1, len(self.simulator.aggregate_metrics)):
                    prev = self.simulator.aggregate_metrics[i-1]['engagement']
                    curr = self.simulator.aggregate_metrics[i]['engagement']
                    change = curr - prev
                    engagement_changes.append(change)
                
                if not engagement_changes:
                    return {'status': 'insufficient_data'}
                
                # Analyze pacing patterns
                positive_changes = sum(1 for c in engagement_changes if c > 0)
                negative_changes = sum(1 for c in engagement_changes if c < 0)
                avg_change = np.mean(np.abs(engagement_changes))
                
                # Classify pacing
                if avg_change > 0.05:
                    pacing_style = "erratic"
                elif avg_change > 0.02:
                    pacing_style = "dynamic"
                else:
                    pacing_style = "steady"
                
                return {
                    'pacing_style': pacing_style,
                    'avg_change': avg_change,
                    'positive_changes': positive_changes,
                    'negative_changes': negative_changes,
                    'stability': 1.0 - avg_change
                }
        
        return PacingAnalyzer
    
    @staticmethod
    def pattern_plugin_system():
        """
        Pattern: Plugin system implementation
        
        Example of creating extensible plugin architecture
        """
        class AnalysisPlugin:
            """Base class for analysis plugins"""
            
            def __init__(self, name: str):
                self.name = name
                self.enabled = True
            
            def analyze(self, simulator):
                """Override this method in subclasses"""
                raise NotImplementedError
            
            def get_config(self):
                """Return plugin configuration"""
                return {'name': self.name, 'enabled': self.enabled}
        
        class PluginManager:
            """Manages analysis plugins"""
            
            def __init__(self):
                self.plugins = {}
            
            def register_plugin(self, plugin: AnalysisPlugin):
                """Register a plugin"""
                self.plugins[plugin.name] = plugin
            
            def run_all_plugins(self, simulator):
                """Run all enabled plugins"""
                results = {}
                for name, plugin in self.plugins.items():
                    if plugin.enabled:
                        results[name] = plugin.analyze(simulator)
                return results
        
        return AnalysisPlugin, PluginManager
    
    @staticmethod
    def pattern_event_system():
        """
        Pattern: Event-driven architecture
        
        Example of implementing event system for hooks
        """
        class EventSystem:
            """Event system for simulation hooks"""
            
            def __init__(self):
                self.listeners = {}
            
            def on(self, event_name: str, callback):
                """Register event listener"""
                if event_name not in self.listeners:
                    self.listeners[event_name] = []
                self.listeners[event_name].append(callback)
            
            def emit(self, event_name: str, data):
                """Emit event to all listeners"""
                if event_name in self.listeners:
                    for callback in self.listeners[event_name]:
                        callback(data)
            
            def remove_listener(self, event_name: str, callback):
                """Remove event listener"""
                if event_name in self.listeners:
                    self.listeners[event_name].remove(callback)
        
        # Example usage
        def example_event_usage():
            events = EventSystem()
            
            # Register listeners
            events.on('scene_complete', lambda data: print(f"Scene {data['scene_id']} complete"))
            events.on('viewer_dropout', lambda data: print(f"Viewer {data['viewer_id']} dropped"))
            
            # Emit events
            events.emit('scene_complete', {'scene_id': 's1',


# ============================================================================
# EXTENDED ANALYSIS FRAMEWORKS
# ============================================================================

class AdvancedAnalysisFramework:
    """
    Advanced analysis framework with extended capabilities
    """
    
    def __init__(self, simulator):
        self.simulator = simulator
        self.cache = {}
    
    def analyze_narrative_structure(self):
        """Analyze narrative structure effectiveness"""
        metrics = self.simulator.aggregate_metrics
        
        # Identify act breaks (using engagement patterns)
        act_breaks = self._identify_act_breaks(metrics)
        
        # Analyze each act
        acts = self._segment_into_acts(metrics, act_breaks)
        
        act_analysis = []
        for i, act in enumerate(acts, 1):
            analysis = {
                'act_number': i,
                'duration': len(act),
                'avg_engagement': np.mean([m['engagement'] for m in act]),
                'engagement_trend': self._calculate_trend([m['engagement'] for m in act]),
                'peak_moment': max(act, key=lambda m: m['engagement'])['timestamp'],
                'dropout_rate': np.mean([m.get('dropout_rate', 0) for m in act])
            }
            act_analysis.append(analysis)
        
        return {
            'act_breaks': act_breaks,
            'num_acts': len(acts),
            'act_analysis': act_analysis,
            'structure_quality': self._evaluate_structure_quality(act_analysis)
        }
    
    def _identify_act_breaks(self, metrics):
        """Identify potential act breaks"""
        if len(metrics) < 3:
            return []
        
        # Look for engagement valleys followed by peaks
        breaks = []
        for i in range(1, len(metrics) - 1):
            prev_eng = metrics[i-1]['engagement']
            curr_eng = metrics[i]['engagement']
            next_eng = metrics[i+1]['engagement']
            
            # Valley detection
            if curr_eng < prev_eng and next_eng > curr_eng:
                if next_eng - curr_eng > 0.1:  # Significant jump
                    breaks.append(i)
        
        return breaks
    
    def _segment_into_acts(self, metrics, breaks):
        """Segment metrics into acts"""
        if not breaks:
            return [metrics]
        
        acts = []
        start = 0
        for break_point in breaks:
            acts.append(metrics[start:break_point])
            start = break_point
        acts.append(metrics[start:])
        
        return [act for act in acts if act]  # Remove empty
    
    def _calculate_trend(self, values):
        """Calculate trend in values"""
        if len(values) < 2:
            return 0.0
        
        x = np.arange(len(values))
        slope = np.polyfit(x, values, 1)[0]
        return slope
    
    def _evaluate_structure_quality(self, act_analysis):
        """Evaluate narrative structure quality"""
        if not act_analysis:
            return 0.0
        
        # Good structure has rising engagement through acts
        engagement_progression = [act['avg_engagement'] for act in act_analysis]
        trend = self._calculate_trend(engagement_progression)
        
        # Check for strong peaks in each act
        has_peaks = all(act['engagement_trend'] > -0.05 for act in act_analysis)
        
        quality = 0.5 + (trend * 2) + (0.3 if has_peaks else 0)
        return max(0.0, min(1.0, quality))
    
    def analyze_character_dynamics(self):
        """Analyze character relationship dynamics"""
        if not hasattr(self.simulator, 'viewers') or not self.simulator.viewers:
            return {}
        
        # Aggregate character empathy across viewers
        character_empathy = defaultdict(list)
        
        for viewer in self.simulator.viewers:
            for char_id, empathy in viewer.character_empathy.items():
                character_empathy[char_id].append(empathy)
        
        # Analyze each character
        character_analysis = {}
        for char_id, empathy_values in character_empathy.items():
            character_analysis[char_id] = {
                'mean_empathy': np.mean(empathy_values),
                'empathy_range': (min(empathy_values), max(empathy_values)),
                'polarization': np.std(empathy_values),
                'universally_liked': np.mean(empathy_values) > 0.7,
                'divisive': np.std(empathy_values) > 0.3
            }
        
        return character_analysis
    
    def analyze_pacing_rhythm(self):
        """Analyze pacing and rhythm"""
        metrics = self.simulator.aggregate_metrics
        
        if len(metrics) < 10:
            return {'status': 'insufficient_data'}
        
        # Extract engagement values
        engagement = [m['engagement'] for m in metrics]
        
        # Calculate rhythm metrics
        changes = [engagement[i] - engagement[i-1] for i in range(1, len(engagement))]
        
        # Find peaks and valleys
        peaks = []
        valleys = []
        for i in range(1, len(engagement) - 1):
            if engagement[i] > engagement[i-1] and engagement[i] > engagement[i+1]:
                peaks.append(i)
            elif engagement[i] < engagement[i-1] and engagement[i] < engagement[i+1]:
                valleys.append(i)
        
        # Calculate rhythm metrics
        rhythm_analysis = {
            'num_peaks': len(peaks),
            'num_valleys': len(valleys),
            'avg_peak_spacing': np.mean(np.diff(peaks)) if len(peaks) > 1 else 0,
            'rhythm_regularity': 1.0 - (np.std(np.diff(peaks)) / np.mean(np.diff(peaks)) 
                                       if len(peaks) > 1 and np.mean(np.diff(peaks)) > 0 else 0),
            'volatility': np.std(changes),
            'momentum': np.mean(changes)
        }
        
        # Classify rhythm
        if rhythm_analysis['volatility'] > 0.1:
            rhythm_type = "chaotic"
        elif rhythm_analysis['volatility'] > 0.05:
            rhythm_type = "dynamic"
        elif rhythm_analysis['rhythm_regularity'] > 0.7:
            rhythm_type = "regular"
        else:
            rhythm_type = "steady"
        
        rhythm_analysis['rhythm_type'] = rhythm_type
        
        return rhythm_analysis
    
    def analyze_emotional_arcs(self):
        """Analyze emotional arc patterns"""
        metrics = self.simulator.aggregate_metrics
        
        # Track emotion progression
        emotion_arcs = defaultdict(list)
        
        for moment in metrics:
            emotions = moment.get('emotions', {})
            for emotion_type, value in emotions.items():
                emotion_arcs[emotion_type].append(value)
        
        # Analyze each emotion
        arc_analysis = {}
        for emotion_type, values in emotion_arcs.items():
            if not values:
                continue
            
            arc_analysis[emotion_type] = {
                'trajectory': self._classify_trajectory(values),
                'peak_moment': values.index(max(values)) if values else 0,
                'intensity_range': (min(values), max(values)),
                'volatility': np.std(values),
                'overall_presence': np.mean(values)
            }
        
        return arc_analysis
    
    def _classify_trajectory(self, values):
        """Classify emotional trajectory"""
        if len(values) < 3:
            return "insufficient_data"
        
        first_third = np.mean(values[:len(values)//3])
        last_third = np.mean(values[-len(values)//3:])
        
        change = last_third - first_third
        
        if change > 0.2:
            return "ascending"
  


# ============================================================================
# FINAL COMPREHENSIVE EXAMPLES AND DOCUMENTATION
# ============================================================================

"""
PRODUCTION-READY WORKFLOW EXAMPLES
===================================

This section demonstrates complete production workflows for various scenarios.
"""


def workflow_film_pre_release_testing():
    """
    Complete workflow for film pre-release testing
    """
    print("\n" + "="*70)
    print("WORKFLOW: FILM PRE-RELEASE TESTING")
    print("="*70)
    
    # Step 1: Build content representation
    print("\n[1/6] Building content representation...")
    builder = ScenarioBuilder()
    film_scenes = builder.build_three_act_structure(
        duration_minutes=120,
        genre='thriller'
    )
    print(f"  ✓ Created {len(film_scenes)} scenes")
    
    # Step 2: Run large-scale simulation
    print("\n[2/6] Running audience simulation (2000 viewers)...")
    simulator = AudienceSimulator(num_viewers=2000, seed=42)
    simulator.simulate_sequence(film_scenes)
    print(f"  ✓ Simulation complete")
    
    # Step 3: Comprehensive analysis
    print("\n[3/6] Performing comprehensive analysis...")
    report = simulator.get_comprehensive_report()
    quality_calc = QualityMetricsCalculator(simulator)
    quality = quality_calc.calculate_content_quality_score()
    print(f"  ✓ Quality: {quality['grade']} ({quality['numeric_score']:.2f})")
    print(f"  ✓ Retention: {report['retention']['final_retention']:.1%}")
    print(f"  ✓ Engagement: {report['engagement']['overall_mean']:.2f}")
    
    # Step 4: Identify problem areas
    print("\n[4/6] Identifying problem areas...")
    optimizer = SceneOptimizer(simulator)
    problem_scenes = []
    for scene in film_scenes[:10]:
        analysis = optimizer.analyze_scene(
            scene['scene_data']['scene_id'],
            scene.get('timestamp', 0)
        )
        if analysis.get('needs_attention', False):
            problem_scenes.append(analysis)
    print(f"  ✓ Found {len(problem_scenes)} scenes needing attention")
    
    # Step 5: Demographic insights
    print("\n[5/6] Analyzing demographic performance...")
    demo_analyzer = DemographicAnalyzer(simulator)
    demo_report = demo_analyzer.analyze_viewer_type_performance()
    for viewer_type, metrics in demo_report.items():
        print(f"  • {viewer_type}: {metrics['avg_engagement']:.2f} engagement")
    
    # Step 6: Generate reports
    print("\n[6/6] Generating reports...")
    report_gen = ReportGenerator(simulator)
    executive_summary = report_gen.generate_executive_summary()
    
    exporter = DataExporter(simulator)
    exporter.export_to_html_report('./film_analysis_report.html')
    print(f"  ✓ Report saved to ./film_analysis_report.html")
    
    # Final recommendation
    print("\n" + "="*70)
    print("FINAL RECOMMENDATION")
    print("="*70)
    if quality['numeric_score'] >= 0.75 and report['retention']['final_retention'] >= 0.70:
        print("✓ APPROVED FOR RELEASE")
        print("  Content meets quality and retention thresholds")
    elif quality['numeric_score'] >= 0.65:
        print("⚠ CONDITIONAL APPROVAL")
        print("  Address identified issues before release")
        for scene in problem_scenes[:3]:
            print(f"  - Scene {scene['scene_id']}: {scene.get('recommendation', 'Needs review')}")
    else:
        print("✗ REQUIRES SIGNIFICANT REWORK")
        print("  Content does not meet minimum quality standards")
    print("="*70)
    
    return simulator


def workflow_ab_testing_variants():
    """
    Complete A/B testing workflow
    """
    print("\n" + "="*70)
    print("WORKFLOW: A/B TESTING CONTENT VARIANTS")
    print("="*70)
    
    # Step 1: Create variants
    print("\n[1/5] Creating content variants...")
    builder = ScenarioBuilder()
    
    # Variant A: Fast-paced action
    variant_a = [create_sample_scene_data(f'a{i}', 'action', 90) for i in range(10)]
    print("  ✓ Variant A: Fast-paced action (10 scenes)")
    
    # Variant B: Character-driven drama
    variant_b = [create_sample_scene_data(f'b{i}', 'dialogue', 150) for i in range(8)]
    print("  ✓ Variant B: Character-driven drama (8 scenes)")
    
    # Step 2: Set up A/B test
    print("\n[2/5] Setting up A/B test framework...")
    ab_test = ABTestingFramework()
    ab_test.create_experiment(
        'content_style_test',
        {'style': 'action', 'pacing': 'fast'},
        {'style': 'drama', 'pacing': 'slow'},
        num_viewers_per_variant=500
    )
    print("  ✓ Test configured with 500 viewers per variant")
    
    # Step 3: Run experiment
    print("\n[3/5] Running experiment...")
    results = ab_test.run_experiment('content_style_test', variant_a, variant_b)
    print("  ✓ Experiment complete")
    
    # Step 4: Analyze results
    print("\n[4/5] Analyzing results...")
    print(f"\n  Overall Winner: Variant {results['overall_winner']}")
    print(f"  Statistical Significance: {results['statistical_significance']}")
    print(f"  Confidence: {results['confidence']:.1%}")
    
    print("\n  Metric Comparison:")
    for metric, data in results['metrics'].items():
        print(f"    {metric}:")
        print(f"      Variant A: {data['variant_a_value']:.3f}")
        print(f"      Variant B: {data['variant_b_value']:.3f}")
        print(f"      Winner: {data['winner']}")
    
    # Step 5: Recommendations
    print("\n[5/5] Generating recommendations...")
    if results['confidence'] > 0.95:
        print(f"\n  ✓ STRONG RECOMMENDATION: Proceed with Variant {results['overall_winner']}")
        print(f"    High confidence in results ({results['confidence']:.1%})")
    elif results['confidence'] > 0.80:
        print(f"\n  ⚠ MODERATE RECOMMENDATION: Variant {results['overall_winner']} performs better")
        print(f"    Consider additional testing to increase confidence")
    else:
        print("\n  ⚠ INCONCLUSIVE: Results do not show clear winner")
        print("    Consider testing with larger sample or hybrid approach")
    
    print("\n" + "="*70)
    
    return results


def workflow_continuous_optimization():
    """
    Continuous optimization workflow
    """
    print("\n" + "="*70)
    print("WORKFLOW: CONTINUOUS CONTENT OPTIMIZATION")
    print("="*70)
    
    # Step 1: Baseline
    print("\n[1/4] Establishing baseline...")
    baseline_scenes = [create_sample_scene_data(f's{i}', 'mixed', 120) for i in range(10)]
    baseline_sim = AudienceSimulator(num_viewers=300)
    baseline_sim.simulate_sequence(baseline_scenes)
    baseline_quality = QualityMetricsCalculator(baseline_sim).calculate_content_quality_score()
    print(f"  ✓ Baseline quality: {baseline_quality['grade']} ({baseline_quality['numeric_score']:.2f})")
    
    # Step 2: Identify improvements
    print("\n[2/4] Identifying improvement opportunities...")
    optimizer = SceneOptimizer(baseline_sim)
    improvements_needed = []
    for scene in baseline_scenes:
        analysis = optimizer.analyze_scene(
            scene['scene_data']['scene_id'],
            scene.get('timestamp', 0)
        )
        if analysis.get('needs_attention'):
            improvements_needed.append(analysis)
    print(f"  ✓ Identified {len(improvements_needed)} scenes for improvement")
    
    # Step 3: Iterative improvements
    print("\n[3/4] Running iterative improvements...")
    current_scenes = baseline_scenes.copy()
    iteration = 1
    max_iterations = 3
    
    while iteration <= max_iterations:
        print(f"\n  Iteration {iteration}:")
        
        # Simulate improvements (in real workflow, actual changes would be made)
        improved_sim = AudienceSimulator(num_viewers=300)
        improv
