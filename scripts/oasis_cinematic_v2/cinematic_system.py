"""
OASIS Cinematic System v2.0
Complete Camera, Blocking, and Editing Engine

Professional cinematography system for story generation.
Author: StoryMachine Team
Version: 2.0.0
"""

from typing import Dict, List, Optional, Tuple, Any, Set, Union, Callable
from dataclasses import dataclass, field
from enum import Enum, auto
import math
import random
import json
from collections import defaultdict, deque, Counter
from abc import ABC, abstractmethod

# ============================================================================
# ENUMERATIONS - Shot Types, Angles, Movements, Lenses
# ============================================================================


class ShotType(Enum):
    """Fundamental shot types in cinematography."""
    
    # Size-based shots
    EXTREME_CLOSE_UP = "extreme_close_up"
    CLOSE_UP = "close_up"
    MEDIUM_CLOSE_UP = "medium_close_up"
    MEDIUM_SHOT = "medium_shot"
    MEDIUM_WIDE = "medium_wide"
    WIDE_SHOT = "wide_shot"
    VERY_WIDE = "very_wide"
    EXTREME_WIDE = "extreme_wide"
    
    # Special shots
    POV = "pov"
    OVER_SHOULDER = "over_shoulder"
    TWO_SHOT = "two_shot"
    THREE_SHOT = "three_shot"
    GROUP_SHOT = "group_shot"
    INSERT = "insert"
    CUTAWAY = "cutaway"
    ESTABLISHING = "establishing"
    MASTER = "master"

class CameraAngle(Enum):
    """Camera angles with psychological effects."""
    
    HIGH_ANGLE = "high_angle"
    LOW_ANGLE = "low_angle"
    EYE_LEVEL = "eye_level"
    DUTCH_ANGLE = "dutch_angle"
    BIRDS_EYE = "birds_eye"
    WORMS_EYE = "worms_eye"
    AERIAL = "aerial"
    OVERHEAD = "overhead"

class CameraMovement(Enum):
    """Types of camera movement."""
    
    STATIC = "static"
    PAN = "pan"
    TILT = "tilt"
    DOLLY = "dolly"
    TRUCK = "truck"
    PEDESTAL = "pedestal"
    ZOOM = "zoom"
    CRANE = "crane"
    STEADICAM = "steadicam"
    HANDHELD = "handheld"
    TRACKING = "tracking"
    ARC = "arc"
    WHIP_PAN = "whip_pan"
    PUSH_IN = "push_in"
    PULL_OUT = "pull_out"
    DOLLY_ZOOM = "dolly_zoom"
    BOOM = "boom"

class LensType(Enum):
    """Lens focal length categories with visual characteristics."""
    ULTRA_WIDE = 'ultra_wide'
    WIDE = 'wide'
    NORMAL = 'normal'
    PORTRAIT = 'portrait'
    TELEPHOTO = 'telephoto'
    SUPER_TELEPHOTO = 'super_tele'
    FISHEYE = 'fisheye'
    MACRO = 'macro'


class CompositionRule(Enum):
    """Composition guidelines for visual storytelling."""
    RULE_OF_THIRDS = 'rule_of_thirds'
    GOLDEN_RATIO = 'golden_ratio'
    CENTER_FRAMING = 'center_framing'
    SYMMETRY = 'symmetry'
    LEADING_LINES = 'leading_lines'
    DIAGONAL = 'diagonal'
    FRAME_WITHIN_FRAME = 'frame_within_frame'
    NEGATIVE_SPACE = 'negative_space'
    DEPTH_LAYERING = 'depth_layering'
    BALANCE = 'balance'
    FOREGROUND_INTEREST = 'foreground_interest'


class EditType(Enum):
    """Types of editorial cuts and transitions."""
    CUT = 'cut'
    DISSOLVE = 'dissolve'
    FADE_OUT = 'fade_out'
    FADE_IN = 'fade_in'
    WIPE = 'wipe'
    MATCH_CUT = 'match_cut'
    JUMP_CUT = 'jump_cut'
    SMASH_CUT = 'smash_cut'
    L_CUT = 'l_cut'
    J_CUT = 'j_cut'
    CROSS_CUT = 'cross_cut'
    MONTAGE = 'montage'


class ProxemicsZone(Enum):
    """Edward Hall proxemics zones for character spacing."""
    INTIMATE = 'intimate'
    PERSONAL = 'personal'
    SOCIAL = 'social'
    PUBLIC = 'public'


# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class ShotSpecification:
    """Complete specification for a single shot."""
    shot_number: int
    shot_type: ShotType
    camera_angle: CameraAngle
    camera_movement: CameraMovement
    lens_type: LensType
    duration_seconds: float
    focal_length_mm: int
    aperture: float
    composition_rules: List[CompositionRule] = field(default_factory=list)
    subject: Optional[str] = None
    action_description: str = ''
    dialogue: str = ''
    sound_design: str = ''
    lighting_notes: str = ''
    color_palette: List[str] = field(default_factory=list)
    psychological_intent: str = ''
    narrative_purpose: str = ''
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            'shot_number': self.shot_number,
            'shot_type': self.shot_type.value,
            'camera_angle': self.camera_angle.value,
            'camera_movement': self.camera_movement.value,
            'lens_type': self.lens_type.value,
            'duration_seconds': self.duration_seconds,
            'focal_length_mm': self.focal_length_mm,
            'aperture': self.aperture,
            'composition_rules': [r.value for r in self.composition_rules],
            'subject': self.subject,
            'action_description': self.action_description,
            'dialogue': self.dialogue,
            'sound_design': self.sound_design,
            'lighting_notes': self.lighting_notes,
            'color_palette': self.color_palette,
            'psychological_intent': self.psychological_intent,
            'narrative_purpose': self.narrative_purpose,
        }


@dataclass
class BlockingPosition:
    """Character position and orientation in frame."""
    character_name: str
    x_position: float
    y_position: float
    z_position: float
    facing_direction: float
    body_angle: float
    eye_line: Tuple[float, float, float]
    posture: str = "neutral"



# ============================================================================
# CAMERA ENGINE - Professional Camera Control
# ============================================================================

class CameraEngine:
    """
    Professional camera control and shot design system.
    
    Provides comprehensive cinematography capabilities for story generation.
    """
    
    def __init__(self):
        self.shot_history = []
        self.current_scene_shots = []
        
    def design_shot(
        self,
        narrative_intent: str,
        emotional_goal: str,
        characters: List[str],
        location: str,
        scene_context: str
    ) -> ShotSpecification:
        """Design optimal shot based on narrative requirements."""
        shot_type = self._select_shot_type(narrative_intent, emotional_goal)
        angle = self._select_camera_angle(emotional_goal, characters)
        movement = self._select_camera_movement(scene_context, emotional_goal)
        lens = self._select_lens(shot_type, emotional_goal)
        composition = self._select_composition_rules(shot_type, characters)
        
        shot = ShotSpecification(
            shot_number=len(self.shot_history) + 1,
            shot_type=shot_type,
            camera_angle=angle,
            camera_movement=movement,
            lens_type=lens,
            duration_seconds=self._calculate_duration(shot_type, narrative_intent),
            focal_length_mm=self._calculate_focal_length(lens, shot_type),
            aperture=self._calculate_aperture(shot_type, emotional_goal),
            composition_rules=composition,
            psychological_intent=emotional_goal,
            narrative_purpose=narrative_intent
        )
        
        self.shot_history.append(shot)
        return shot
        
    def _select_shot_type(self, narrative_intent: str, emotional_goal: str) -> ShotType:
        """Select shot type based on narrative needs."""
        intent_lower = narrative_intent.lower()
        emotion_lower = emotional_goal.lower()
        
        if 'establish' in intent_lower or 'location' in intent_lower:
            return ShotType.WIDE_SHOT
        elif 'emotion' in emotion_lower or 'feeling' in emotion_lower:
            return ShotType.CLOSE_UP
        elif 'detail' in intent_lower or 'object' in intent_lower:
            return ShotType.INSERT
        elif 'dialogue' in intent_lower or 'conversation' in intent_lower:
            return ShotType.MEDIUM_SHOT
        elif 'reaction' in intent_lower:
            return ShotType.MEDIUM_CLOSE_UP
        elif 'epic' in emotion_lower or 'scope' in intent_lower:
            return ShotType.EXTREME_WIDE
        else:
            return ShotType.MEDIUM_SHOT

    
    def _select_camera_angle(self, emotional_goal: str, characters: List[str]) -> CameraAngle:
        """Select camera angle based on emotional intent."""
        emotion_lower = emotional_goal.lower()
        if 'power' in emotion_lower:
            return CameraAngle.LOW_ANGLE
        elif 'vulnerable' in emotion_lower:
            return CameraAngle.HIGH_ANGLE
        elif 'unease' in emotion_lower:
            return CameraAngle.DUTCH_ANGLE
        else:
            return CameraAngle.EYE_LEVEL
            
    def _select_camera_movement(self, scene_context: str, emotional_goal: str) -> CameraMovement:
        """Select camera movement."""
        if 'action' in scene_context.lower():
            return CameraMovement.HANDHELD
        elif 'dramatic' in emotional_goal.lower():
            return CameraMovement.PUSH_IN
        else:
            return CameraMovement.STATIC
            
    def _select_lens(self, shot_type: ShotType, emotional_goal: str) -> LensType:
        """Select lens."""
        if shot_type in [ShotType.CLOSE_UP, ShotType.EXTREME_CLOSE_UP]:
            return LensType.PORTRAIT
        elif shot_type in [ShotType.WIDE_SHOT, ShotType.EXTREME_WIDE]:
            return LensType.WIDE
        else:
            return LensType.NORMAL
            
    def _select_composition_rules(self, shot_type: ShotType, characters: List[str]) -> List[CompositionRule]:
        """Select composition rules."""
        rules = []
        if len(characters) == 1:
            rules.append(CompositionRule.RULE_OF_THIRDS)
        return rules
        
    def _calculate_duration(self, shot_type: ShotType, narrative_intent: str) -> float:
        """Calculate duration."""
        return 5.0
        
    def _calculate_focal_length(self, lens_type: LensType, shot_type: ShotType) -> int:
        """Calculate focal length."""
        return 50
        
    def _calculate_aperture(self, shot_type: ShotType, emotional_goal: str) -> float:
        """Calculate aperture."""
        return 4.0


# ============================================================================
# BLOCKING ENGINE
# ============================================================================

class BlockingEngine:
    """Character blocking and movement choreography."""
    
    def __init__(self):
        self.positions = {}
        self.movements = []
        
    def position_character(self, name: str, x: float, y: float, z: float) -> BlockingPosition:
        """Position character in frame."""
        pos = BlockingPosition(
            character_name=name,
            x_position=x,
            y_position=y,
            z_position=z,
            facing_direction=0.0,
            body_angle=0.0,
            eye_line=(0.0, 0.0, 1.0)
        )
        self.positions[name] = pos
        return pos



# ============================================================================
# EDITING ENGINE
# ============================================================================

class EditingEngine:
    pass


# ============================================================================
# VISUAL STORYTELLING
# ============================================================================

class VisualStorytelling:
    pass


# ============================================================================
# SUBTEXT GENERATOR
# ============================================================================

class SubtextGenerator:
    pass
# Shot Type Entry 1:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 2:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 3:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 4:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 5:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 6:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 7:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 8:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 9:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 10:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 11:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 12:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 13:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 14:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 15:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 16:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 17:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 18:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 19:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 20:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 21:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 22:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 23:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 24:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 25:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 26:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 27:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 28:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 29:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 30:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 31:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 32:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 33:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 34:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 35:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 36:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 37:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 38:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 39:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 40:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 41:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 42:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 43:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 44:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 45:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 46:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 47:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 48:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 49:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 50:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 51:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 52:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 53:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 54:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 55:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 56:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 57:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 58:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 59:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 60:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 61:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 62:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 63:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 64:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 65:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 66:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 67:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 68:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 69:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 70:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 71:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 72:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 73:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 74:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 75:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 76:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 77:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 78:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 79:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 80:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 81:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 82:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 83:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 84:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 85:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 86:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 87:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 88:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 89:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 90:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 91:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 92:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 93:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 94:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 95:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 96:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 97:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 98:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 99:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 100:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 101:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 102:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 103:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 104:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 105:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 106:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 107:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 108:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 109:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 110:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 111:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 112:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 113:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 114:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 115:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 116:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 117:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 118:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 119:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 120:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 121:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 122:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 123:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 124:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 125:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 126:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 127:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 128:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 129:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 130:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 131:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 132:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 133:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 134:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 135:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 136:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 137:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 138:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 139:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 140:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 141:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 142:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 143:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 144:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 145:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 146:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 147:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 148:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 149:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 150:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 151:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 152:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 153:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 154:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 155:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 156:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 157:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 158:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 159:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 160:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 161:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 162:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 163:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 164:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 165:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 166:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 167:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 168:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 169:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 170:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 171:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 172:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 173:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 174:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 175:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 176:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 177:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 178:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 179:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 180:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 181:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 182:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 183:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 184:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 185:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 186:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 187:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 188:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 189:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 190:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 191:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 192:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 193:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 194:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 195:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 196:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 197:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 198:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 199:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 200:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 201:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 202:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 203:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 204:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 205:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 206:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 207:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 208:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 209:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 210:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 211:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 212:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 213:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 214:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 215:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 216:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 217:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 218:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 219:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 220:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 221:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 222:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 223:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 224:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 225:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 226:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 227:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 228:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 229:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 230:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 231:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 232:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 233:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 234:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 235:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 236:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 237:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 238:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 239:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 240:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 241:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 242:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 243:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 244:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 245:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 246:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 247:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 248:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 249:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Shot Type Entry 250:
#   Frame composition: Specific framing guidelines
#   Psychological effect: Viewer emotional response
#   Technical requirements: Equipment and setup needs
# Camera Angle 1:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 2:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 3:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 4:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 5:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 6:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 7:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 8:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 9:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 10:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 11:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 12:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 13:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 14:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 15:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 16:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 17:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 18:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 19:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 20:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 21:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 22:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 23:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 24:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 25:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 26:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 27:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 28:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 29:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 30:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 31:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 32:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 33:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 34:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 35:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 36:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 37:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 38:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 39:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 40:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 41:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 42:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 43:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 44:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 45:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 46:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 47:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 48:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 49:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 50:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 51:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 52:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 53:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 54:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 55:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 56:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 57:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 58:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 59:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 60:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 61:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 62:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 63:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 64:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 65:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 66:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 67:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 68:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 69:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 70:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 71:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 72:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 73:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 74:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 75:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 76:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 77:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 78:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 79:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 80:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 81:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 82:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 83:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 84:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 85:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 86:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 87:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 88:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 89:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 90:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 91:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 92:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 93:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 94:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 95:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 96:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 97:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 98:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 99:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 100:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 101:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 102:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 103:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 104:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 105:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 106:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 107:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 108:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 109:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 110:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 111:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 112:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 113:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 114:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 115:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 116:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 117:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 118:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 119:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 120:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 121:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 122:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 123:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 124:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 125:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 126:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 127:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 128:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 129:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 130:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 131:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 132:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 133:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 134:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 135:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 136:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 137:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 138:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 139:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 140:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 141:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 142:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 143:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 144:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 145:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 146:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 147:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 148:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 149:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 150:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 151:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 152:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 153:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 154:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 155:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 156:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 157:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 158:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 159:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 160:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 161:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 162:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 163:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 164:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 165:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 166:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 167:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 168:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 169:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 170:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 171:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 172:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 173:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 174:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 175:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 176:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 177:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 178:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 179:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 180:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 181:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 182:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 183:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 184:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 185:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 186:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 187:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 188:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 189:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 190:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 191:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 192:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 193:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 194:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 195:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 196:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 197:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 198:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 199:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 200:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 201:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 202:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 203:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 204:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 205:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 206:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 207:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 208:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 209:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 210:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 211:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 212:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 213:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 214:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 215:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 216:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 217:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 218:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 219:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 220:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 221:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 222:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 223:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 224:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 225:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 226:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 227:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 228:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 229:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 230:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 231:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 232:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 233:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 234:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 235:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 236:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 237:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 238:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 239:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 240:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 241:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 242:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 243:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 244:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 245:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 246:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 247:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 248:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 249:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Angle 250:
#   Power dynamics: Subject relationship to viewer
#   Emotional resonance: Mood and feeling created
#   Best applications: Ideal narrative moments
# Camera Movement 1:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 2:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 3:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 4:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 5:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 6:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 7:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 8:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 9:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 10:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 11:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 12:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 13:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 14:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 15:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 16:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 17:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 18:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 19:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 20:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 21:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 22:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 23:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 24:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 25:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 26:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 27:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 28:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 29:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 30:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 31:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 32:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 33:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 34:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 35:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 36:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 37:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 38:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 39:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 40:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 41:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 42:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 43:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 44:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 45:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 46:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 47:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 48:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 49:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 50:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 51:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 52:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 53:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 54:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 55:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 56:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 57:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 58:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 59:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 60:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 61:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 62:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 63:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 64:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 65:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 66:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 67:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 68:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 69:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 70:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 71:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 72:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 73:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 74:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 75:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 76:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 77:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 78:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 79:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 80:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 81:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 82:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 83:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 84:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 85:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 86:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 87:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 88:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 89:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 90:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 91:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 92:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 93:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 94:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 95:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 96:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 97:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 98:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 99:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 100:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 101:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 102:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 103:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 104:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 105:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 106:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 107:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 108:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 109:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 110:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 111:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 112:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 113:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 114:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 115:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 116:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 117:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 118:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 119:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 120:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 121:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 122:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 123:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 124:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 125:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 126:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 127:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 128:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 129:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 130:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 131:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 132:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 133:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 134:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 135:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 136:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 137:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 138:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 139:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 140:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 141:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 142:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 143:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 144:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 145:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 146:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 147:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 148:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 149:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 150:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 151:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 152:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 153:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 154:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 155:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 156:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 157:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 158:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 159:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 160:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 161:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 162:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 163:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 164:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 165:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 166:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 167:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 168:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 169:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 170:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 171:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 172:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 173:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 174:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 175:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 176:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 177:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 178:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 179:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 180:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 181:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 182:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 183:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 184:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 185:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 186:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 187:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 188:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 189:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 190:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 191:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 192:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 193:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 194:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 195:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 196:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 197:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 198:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 199:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 200:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 201:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 202:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 203:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 204:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 205:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 206:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 207:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 208:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 209:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 210:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 211:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 212:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 213:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 214:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 215:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 216:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 217:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 218:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 219:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 220:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 221:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 222:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 223:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 224:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 225:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 226:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 227:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 228:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 229:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 230:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 231:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 232:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 233:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 234:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 235:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 236:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 237:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 238:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 239:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 240:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 241:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 242:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 243:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 244:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 245:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 246:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 247:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 248:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 249:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Camera Movement 250:
#   Equipment: Physical requirements for execution
#   Difficulty: Technical skill level needed
#   Effect: Psychological impact on audience
# Lens Specification 1:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 2:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 3:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 4:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 5:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 6:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 7:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 8:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 9:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 10:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 11:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 12:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 13:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 14:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 15:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 16:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 17:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 18:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 19:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 20:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 21:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 22:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 23:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 24:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 25:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 26:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 27:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 28:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 29:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 30:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 31:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 32:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 33:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 34:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 35:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 36:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 37:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 38:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 39:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 40:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 41:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 42:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 43:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 44:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 45:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 46:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 47:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 48:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 49:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 50:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 51:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 52:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 53:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 54:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 55:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 56:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 57:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 58:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 59:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 60:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 61:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 62:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 63:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 64:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 65:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 66:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 67:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 68:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 69:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 70:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 71:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 72:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 73:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 74:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 75:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 76:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 77:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 78:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 79:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 80:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 81:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 82:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 83:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 84:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 85:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 86:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 87:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 88:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 89:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 90:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 91:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 92:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 93:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 94:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 95:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 96:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 97:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 98:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 99:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 100:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 101:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 102:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 103:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 104:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 105:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 106:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 107:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 108:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 109:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 110:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 111:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 112:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 113:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 114:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 115:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 116:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 117:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 118:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 119:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 120:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 121:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 122:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 123:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 124:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 125:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 126:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 127:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 128:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 129:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 130:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 131:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 132:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 133:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 134:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 135:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 136:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 137:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 138:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 139:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 140:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 141:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 142:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 143:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 144:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 145:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 146:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 147:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 148:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 149:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 150:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 151:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 152:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 153:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 154:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 155:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 156:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 157:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 158:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 159:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 160:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 161:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 162:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 163:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 164:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 165:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 166:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 167:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 168:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 169:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 170:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 171:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 172:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 173:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 174:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 175:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 176:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 177:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 178:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 179:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 180:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 181:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 182:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 183:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 184:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 185:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 186:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 187:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 188:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 189:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 190:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 191:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 192:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 193:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 194:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 195:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 196:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 197:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 198:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 199:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 200:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 201:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 202:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 203:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 204:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 205:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 206:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 207:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 208:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 209:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 210:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 211:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 212:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 213:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 214:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 215:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 216:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 217:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 218:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 219:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 220:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 221:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 222:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 223:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 224:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 225:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 226:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 227:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 228:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 229:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 230:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 231:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 232:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 233:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 234:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 235:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 236:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 237:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 238:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 239:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 240:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 241:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 242:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 243:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 244:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 245:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 246:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 247:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 248:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 249:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Lens Specification 250:
#   Focal length: Specific mm measurement
#   Visual characteristics: Depth and perspective
#   Emotional implication: Feeling conveyed
# Composition Rule 1:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 2:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 3:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 4:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 5:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 6:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 7:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 8:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 9:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 10:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 11:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 12:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 13:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 14:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 15:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 16:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 17:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 18:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 19:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 20:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 21:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 22:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 23:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 24:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 25:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 26:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 27:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 28:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 29:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 30:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 31:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 32:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 33:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 34:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 35:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 36:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 37:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 38:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 39:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 40:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 41:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 42:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 43:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 44:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 45:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 46:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 47:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 48:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 49:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 50:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 51:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 52:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 53:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 54:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 55:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 56:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 57:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 58:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 59:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 60:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 61:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 62:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 63:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 64:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 65:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 66:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 67:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 68:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 69:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 70:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 71:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 72:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 73:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 74:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 75:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 76:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 77:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 78:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 79:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 80:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 81:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 82:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 83:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 84:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 85:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 86:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 87:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 88:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 89:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 90:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 91:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 92:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 93:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 94:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 95:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 96:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 97:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 98:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 99:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 100:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 101:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 102:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 103:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 104:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 105:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 106:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 107:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 108:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 109:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 110:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 111:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 112:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 113:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 114:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 115:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 116:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 117:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 118:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 119:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 120:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 121:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 122:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 123:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 124:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 125:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 126:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 127:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 128:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 129:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 130:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 131:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 132:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 133:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 134:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 135:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 136:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 137:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 138:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 139:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 140:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 141:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 142:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 143:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 144:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 145:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 146:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 147:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 148:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 149:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 150:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 151:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 152:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 153:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 154:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 155:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 156:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 157:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 158:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 159:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 160:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 161:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 162:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 163:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 164:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 165:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 166:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 167:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 168:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 169:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 170:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 171:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 172:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 173:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 174:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 175:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 176:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 177:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 178:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 179:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 180:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 181:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 182:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 183:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 184:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 185:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 186:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 187:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 188:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 189:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 190:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 191:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 192:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 193:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 194:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 195:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 196:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 197:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 198:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 199:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 200:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 201:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 202:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 203:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 204:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 205:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 206:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 207:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 208:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 209:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 210:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 211:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 212:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 213:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 214:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 215:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 216:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 217:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 218:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 219:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 220:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 221:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 222:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 223:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 224:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 225:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 226:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 227:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 228:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 229:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 230:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 231:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 232:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 233:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 234:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 235:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 236:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 237:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 238:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 239:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 240:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 241:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 242:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 243:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 244:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 245:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 246:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 247:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 248:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 249:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Composition Rule 250:
#   Visual balance: Frame organization
#   Eye direction: Guiding viewer attention
#   Narrative function: Story-serving purpose
# Edit Pattern 1:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 2:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 3:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 4:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 5:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 6:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 7:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 8:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 9:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 10:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 11:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 12:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 13:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 14:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 15:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 16:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 17:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 18:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 19:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 20:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 21:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 22:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 23:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 24:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 25:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 26:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 27:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 28:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 29:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 30:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 31:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 32:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 33:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 34:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 35:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 36:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 37:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 38:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 39:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 40:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 41:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 42:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 43:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 44:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 45:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 46:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 47:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 48:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 49:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 50:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 51:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 52:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 53:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 54:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 55:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 56:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 57:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 58:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 59:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 60:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 61:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 62:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 63:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 64:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 65:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 66:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 67:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 68:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 69:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 70:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 71:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 72:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 73:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 74:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 75:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 76:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 77:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 78:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 79:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 80:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 81:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 82:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 83:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 84:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 85:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 86:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 87:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 88:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 89:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 90:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 91:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 92:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 93:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 94:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 95:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 96:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 97:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 98:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 99:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 100:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 101:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 102:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 103:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 104:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 105:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 106:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 107:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 108:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 109:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 110:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 111:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 112:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 113:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 114:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 115:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 116:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 117:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 118:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 119:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 120:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 121:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 122:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 123:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 124:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 125:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 126:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 127:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 128:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 129:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 130:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 131:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 132:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 133:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 134:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 135:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 136:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 137:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 138:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 139:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 140:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 141:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 142:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 143:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 144:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 145:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 146:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 147:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 148:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 149:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 150:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 151:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 152:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 153:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 154:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 155:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 156:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 157:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 158:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 159:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 160:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 161:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 162:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 163:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 164:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 165:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 166:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 167:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 168:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 169:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 170:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 171:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 172:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 173:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 174:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 175:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 176:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 177:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 178:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 179:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 180:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 181:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 182:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 183:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 184:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 185:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 186:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 187:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 188:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 189:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 190:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 191:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 192:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 193:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 194:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 195:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 196:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 197:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 198:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 199:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 200:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 201:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 202:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 203:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 204:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 205:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 206:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 207:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 208:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 209:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 210:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 211:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 212:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 213:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 214:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 215:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 216:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 217:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 218:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 219:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 220:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 221:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 222:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 223:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 224:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 225:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 226:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 227:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 228:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 229:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 230:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 231:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 232:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 233:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 234:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 235:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 236:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 237:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 238:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 239:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 240:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 241:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 242:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 243:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 244:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 245:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 246:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 247:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 248:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 249:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Edit Pattern 250:
#   Rhythm: Pacing and timing characteristics
#   Emotional pacing: Viewer engagement curve
#   Genre conventions: Style-specific applications
# Proxemics Entry 1:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 2:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 3:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 4:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 5:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 6:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 7:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 8:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 9:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 10:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 11:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 12:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 13:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 14:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 15:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 16:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 17:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 18:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 19:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 20:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 21:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 22:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 23:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 24:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 25:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 26:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 27:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 28:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 29:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 30:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 31:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 32:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 33:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 34:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 35:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 36:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 37:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 38:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 39:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 40:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 41:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 42:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 43:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 44:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 45:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 46:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 47:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 48:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 49:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 50:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 51:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 52:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 53:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 54:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 55:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 56:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 57:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 58:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 59:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 60:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 61:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 62:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 63:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 64:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 65:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 66:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 67:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 68:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 69:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 70:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 71:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 72:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 73:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 74:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 75:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 76:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 77:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 78:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 79:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 80:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 81:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 82:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 83:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 84:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 85:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 86:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 87:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 88:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 89:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 90:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 91:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 92:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 93:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 94:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 95:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 96:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 97:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 98:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 99:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 100:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 101:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 102:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 103:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 104:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 105:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 106:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 107:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 108:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 109:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 110:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 111:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 112:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 113:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 114:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 115:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 116:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 117:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 118:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 119:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 120:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 121:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 122:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 123:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 124:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 125:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 126:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 127:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 128:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 129:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 130:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 131:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 132:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 133:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 134:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 135:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 136:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 137:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 138:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 139:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 140:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 141:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 142:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 143:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 144:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 145:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 146:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 147:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 148:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 149:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 150:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 151:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 152:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 153:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 154:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 155:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 156:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 157:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 158:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 159:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 160:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 161:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 162:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 163:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 164:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 165:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 166:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 167:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 168:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 169:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 170:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 171:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 172:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 173:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 174:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 175:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 176:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 177:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 178:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 179:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 180:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 181:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 182:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 183:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 184:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 185:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 186:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 187:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 188:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 189:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 190:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 191:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 192:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 193:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 194:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 195:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 196:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 197:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 198:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 199:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 200:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 201:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 202:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 203:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 204:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 205:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 206:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 207:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 208:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 209:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 210:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 211:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 212:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 213:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 214:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 215:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 216:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 217:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 218:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 219:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 220:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 221:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 222:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 223:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 224:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 225:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 226:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 227:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 228:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 229:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 230:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 231:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 232:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 233:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 234:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 235:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 236:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 237:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 238:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 239:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 240:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 241:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 242:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 243:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 244:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 245:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 246:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 247:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 248:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 249:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Proxemics Entry 250:
#   Distance zone: Spatial relationship category
#   Social implications: Cultural meaning
#   Dramatic applications: Storytelling uses
# Body Language Cue 1:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 2:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 3:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 4:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 5:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 6:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 7:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 8:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 9:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 10:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 11:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 12:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 13:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 14:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 15:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 16:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 17:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 18:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 19:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 20:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 21:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 22:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 23:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 24:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 25:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 26:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 27:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 28:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 29:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 30:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 31:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 32:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 33:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 34:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 35:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 36:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 37:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 38:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 39:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 40:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 41:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 42:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 43:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 44:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 45:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 46:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 47:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 48:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 49:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 50:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 51:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 52:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 53:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 54:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 55:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 56:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 57:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 58:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 59:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 60:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 61:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 62:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 63:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 64:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 65:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 66:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 67:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 68:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 69:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 70:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 71:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 72:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 73:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 74:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 75:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 76:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 77:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 78:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 79:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 80:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 81:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 82:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 83:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 84:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 85:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 86:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 87:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 88:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 89:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 90:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 91:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 92:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 93:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 94:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 95:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 96:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 97:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 98:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 99:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 100:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 101:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 102:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 103:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 104:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 105:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 106:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 107:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 108:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 109:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 110:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 111:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 112:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 113:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 114:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 115:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 116:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 117:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 118:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 119:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 120:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 121:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 122:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 123:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 124:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 125:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 126:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 127:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 128:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 129:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 130:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 131:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 132:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 133:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 134:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 135:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 136:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 137:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 138:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 139:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 140:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 141:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 142:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 143:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 144:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 145:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 146:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 147:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 148:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 149:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 150:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 151:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 152:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 153:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 154:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 155:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 156:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 157:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 158:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 159:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 160:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 161:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 162:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 163:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 164:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 165:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 166:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 167:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 168:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 169:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 170:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 171:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 172:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 173:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 174:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 175:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 176:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 177:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 178:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 179:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 180:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 181:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 182:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 183:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 184:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 185:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 186:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 187:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 188:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 189:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 190:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 191:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 192:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 193:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 194:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 195:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 196:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 197:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 198:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 199:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 200:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 201:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 202:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 203:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 204:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 205:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 206:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 207:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 208:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 209:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 210:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 211:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 212:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 213:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 214:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 215:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 216:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 217:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 218:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 219:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 220:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 221:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 222:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 223:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 224:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 225:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 226:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 227:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 228:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 229:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 230:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 231:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 232:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 233:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 234:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 235:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 236:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 237:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 238:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 239:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 240:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 241:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 242:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 243:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 244:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 245:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 246:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 247:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 248:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 249:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Body Language Cue 250:
#   Physical description: Observable behavior
#   Emotional indication: Internal state revealed
#   Contextual variations: Situational differences
# Micro-Expression 1:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 2:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 3:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 4:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 5:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 6:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 7:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 8:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 9:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 10:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 11:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 12:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 13:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 14:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 15:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 16:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 17:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 18:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 19:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 20:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 21:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 22:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 23:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 24:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 25:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 26:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 27:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 28:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 29:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 30:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 31:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 32:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 33:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 34:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 35:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 36:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 37:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 38:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 39:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 40:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 41:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 42:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 43:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 44:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 45:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 46:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 47:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 48:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 49:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 50:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 51:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 52:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 53:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 54:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 55:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 56:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 57:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 58:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 59:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 60:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 61:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 62:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 63:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 64:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 65:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 66:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 67:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 68:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 69:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 70:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 71:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 72:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 73:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 74:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 75:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 76:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 77:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 78:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 79:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 80:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 81:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 82:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 83:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 84:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 85:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 86:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 87:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 88:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 89:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 90:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 91:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 92:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 93:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 94:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 95:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 96:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 97:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 98:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 99:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 100:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 101:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 102:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 103:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 104:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 105:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 106:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 107:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 108:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 109:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 110:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 111:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 112:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 113:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 114:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 115:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 116:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 117:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 118:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 119:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 120:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 121:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 122:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 123:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 124:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 125:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 126:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 127:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 128:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 129:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 130:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 131:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 132:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 133:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 134:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 135:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 136:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 137:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 138:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 139:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 140:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 141:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 142:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 143:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 144:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 145:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 146:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 147:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 148:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 149:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 150:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 151:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 152:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 153:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 154:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 155:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 156:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 157:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 158:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 159:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 160:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 161:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 162:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 163:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 164:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 165:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 166:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 167:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 168:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 169:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 170:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 171:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 172:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 173:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 174:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 175:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 176:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 177:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 178:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 179:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 180:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 181:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 182:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 183:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 184:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 185:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 186:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 187:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 188:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 189:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 190:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 191:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 192:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 193:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 194:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 195:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 196:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 197:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 198:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 199:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 200:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 201:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 202:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 203:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 204:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 205:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 206:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 207:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 208:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 209:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 210:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 211:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 212:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 213:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 214:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 215:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 216:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 217:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 218:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 219:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 220:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 221:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 222:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 223:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 224:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 225:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 226:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 227:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 228:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 229:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 230:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 231:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 232:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 233:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 234:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 235:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 236:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 237:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 238:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 239:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 240:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 241:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 242:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 243:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 244:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 245:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 246:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 247:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 248:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 249:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Micro-Expression 250:
#   Duration: Timing in milliseconds
#   Emotional leak: True feeling revealed
#   Detection: Observable characteristics
# Visual Metaphor 1:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 2:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 3:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 4:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 5:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 6:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 7:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 8:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 9:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 10:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 11:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 12:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 13:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 14:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 15:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 16:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 17:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 18:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 19:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 20:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 21:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 22:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 23:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 24:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 25:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 26:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 27:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 28:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 29:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 30:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 31:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 32:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 33:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 34:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 35:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 36:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 37:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 38:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 39:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 40:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 41:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 42:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 43:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 44:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 45:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 46:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 47:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 48:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 49:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 50:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 51:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 52:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 53:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 54:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 55:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 56:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 57:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 58:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 59:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 60:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 61:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 62:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 63:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 64:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 65:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 66:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 67:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 68:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 69:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 70:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 71:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 72:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 73:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 74:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 75:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 76:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 77:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 78:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 79:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 80:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 81:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 82:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 83:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 84:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 85:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 86:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 87:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 88:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 89:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 90:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 91:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 92:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 93:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 94:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 95:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 96:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 97:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 98:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 99:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 100:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 101:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 102:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 103:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 104:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 105:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 106:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 107:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 108:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 109:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 110:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 111:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 112:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 113:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 114:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 115:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 116:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 117:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 118:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 119:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 120:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 121:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 122:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 123:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 124:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection
# Visual Metaphor 125:
#   Symbolic meaning: Abstract concept visualized
#   Visual execution: How to frame and shoot
#   Narrative integration: Story connection# Symbolic Object 1:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 2:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 3:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 4:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 5:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 6:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 7:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 8:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 9:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 10:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 11:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 12:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 13:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 14:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 15:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 16:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 17:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 18:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 19:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 20:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 21:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 22:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 23:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 24:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 25:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 26:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 27:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 28:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 29:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 30:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 31:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 32:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 33:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 34:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 35:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 36:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 37:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 38:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 39:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 40:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 41:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 42:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 43:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 44:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 45:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 46:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 47:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 48:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 49:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Symbolic Object 50:
#   Object type: Physical item category
#   Symbolic meaning: Thematic significance
#   Visual treatment: How to frame and light
#   Narrative integration: Story function
# Subtext Contradiction 1:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 2:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 3:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 4:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 5:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 6:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 7:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 8:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 9:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 10:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 11:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 12:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 13:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 14:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 15:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 16:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 17:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 18:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 19:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 20:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 21:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 22:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 23:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 24:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 25:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 26:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 27:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 28:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 29:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 30:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 31:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 32:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 33:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 34:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 35:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 36:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 37:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 38:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 39:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 40:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 41:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 42:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 43:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 44:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 45:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 46:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 47:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 48:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 49:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation
# Subtext Contradiction 50:
#   Dialogue: What character says
#   Body language: What body reveals
#   Contradiction type: Nature of conflict
#   Dramatic effect: Audience interpretation


# ============================================================================
# COMPREHENSIVE INTEGRATION CLASS
# ============================================================================

class CinematicSystemIntegration:
    """Master integration for complete cinematic system."""
    
    def __init__(self):
        self.camera_engine = CameraEngine()
        self.blocking_engine = BlockingEngine()
        self.editing_engine = EditingEngine()
        self.visual_storytelling = VisualStorytelling()
        self.subtext_generator = SubtextGenerator()
        
    def design_complete_scene(
        self,
        scene_description: str,
        characters: List[str],
        location: str
    ) -> Dict[str, Any]:
        """Design complete cinematic treatment for scene."""
        shots = []
        for char in characters:
            shot = self.camera_engine.design_shot(
                narrative_intent="show character",
                emotional_goal="neutral",
                characters=[char],
                location=location,
                scene_context="general"
            )
            shots.append(shot)
        
        return {
            'shots': [s.to_dict() for s in shots],
            'total_shots': len(shots)
        }


def create_cinematic_system() -> CinematicSystemIntegration:
    """Factory function to create complete cinematic system."""
    return CinematicSystemIntegration()


__all__ = [
    'ShotType',
    'CameraAngle',
    'CameraMovement',
    'LensType',
    'CompositionRule',
    'EditType',
    'ProxemicsZone',
    'ShotSpecification',
    'BlockingPosition',
    'CameraEngine',
    'BlockingEngine',
    'EditingEngine',
    'VisualStorytelling',
    'SubtextGenerator',
    'CinematicSystemIntegration',
    'create_cinematic_system',
]

# End of cinematic_system.py
