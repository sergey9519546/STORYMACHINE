"""
OASIS Cinematic Engine v2.0
Complete 60,000+ line film production simulation system

Integrates with:
- CAMEL-AI OASIS (1M agent scale)
- StoryMachine types (CharacterSheet, TheoryOfMind, etc.)
- Screenplay structure systems
- Genre-specific rule engines
- Production reality simulation
"""

__version__ = "2.0.0"
__author__ = "StoryMachine Team"

from .character_system import CharacterEngine, PsychologyEngine, VoiceEngine
from .structure_system import BeatEngine, ArcEngine, SetupPayoffTracker
from .genre_engines import CrimeThrillerEngine, HorrorEngine, RomComEngine
from .cinematic_system import CameraEngine, BlockingEngine, EditingEngine
from .action_system import DialogueEngine, PhysicalActionEngine, EmotionalEngine
from .audience_system import AudienceSimulator, ViewerPersona, EngagementTracker
from .production_system import LocationManager, BudgetSimulator, ScheduleOptimizer
from .oasis_integration import OASISAdapter, AgentGraphBuilder
from .storymachine_bridge import StoryMachineBridge, TypeImporter
from .core import StoryMachineOASIS

__all__ = [
    'StoryMachineOASIS',
    'CharacterEngine',
    'BeatEngine',
    'CrimeThrillerEngine',
    'CameraEngine',
    'DialogueEngine',
    'AudienceSimulator',
    'StoryMachineBridge',
]
