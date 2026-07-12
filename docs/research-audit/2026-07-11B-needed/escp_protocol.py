"""
ESCP - Emotional Story Constraint Propagation Protocol
Classes for constraint propagation from First Principles engine to subagents
Reference: HYBRID_EMOTIONAL_STORYTELLING_ARCHITECTURE.md lines 90-130
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import Enum
import json
import time


class ESCPMessageType(Enum):
    CONSTRAINT_UPDATE = "CONSTRAINT_UPDATE"
    EMOTION_STATE_UPDATE = "EMOTION_STATE_UPDATE"
    COHERENCE_CHECK_REQUEST = "COHERENCE_CHECK_REQUEST"
    EMOTION_CONFLICT_ALERT = "EMOTION_CONFLICT_ALERT"
    STATE_ACK = "STATE_ACK"


class ESCPSource(Enum):
    FIRST_PRINCIPLES_ENGINE = "FIRST_PRINCIPLES_ENGINE"
    SUBAGENT = "SUBAGENT"
    ECA = "ECA"  # Emotional Coherence Agent
    RESOLVER = "RESOLVER"


class StoryPhase(Enum):
    EXPOSITION = "EXPOSITION"
    RISING_ACTION = "RISING_ACTION"
    COMPLICATION = "COMPLICATION"
    CLIMAX = "CLIMAX"
    Falling_ACTION = "FALLING_ACTION"
    RESOLUTION = "RESOLUTION"


class ArousalLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass
class TensionConstraint:
    current: float = 0.0
    min_for_climax: float = 80.0
    max_for_resolution: float = 20.0
    phase: StoryPhase = StoryPhase.EXPOSITION

    def validate(self) -> bool:
        if self.phase == StoryPhase.CLIMAX:
            return self.current >= self.min_for_climax
        if self.phase == StoryPhase.RESOLUTION:
            return self.current <= self.max_for_resolution
        return True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "current": self.current,
            "min_for_climax": self.min_for_climax,
            "max_for_resolution": self.max_for_resolution,
            "phase": self.phase.value
        }


@dataclass
class ValenceConstraint:
    current: float = 0.0
    arc_type: str = "RAGS_TO_RICHES"
    expected_at_current_position: float = 0.0

    def validate(self) -> bool:
        return -1.0 <= self.current <= 1.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "current": self.current,
            "arc_type": self.arc_type,
            "expected_at_current_position": self.expected_at_current_position
        }


@dataclass
class ArousalConstraint:
    current: float = 0.0
    phase_requirement: ArousalLevel = ArousalLevel.MEDIUM

    def validate(self) -> bool:
        return 0.0 <= self.current <= 1.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "current": self.current,
            "phase_requirement": self.phase_requirement.value
        }


@dataclass
class ArcPositionConstraint:
    current: float = 0.0
    phase: StoryPhase = StoryPhase.EXPOSITION
    phase_window: tuple = (0.0, 0.2)

    def validate(self) -> bool:
        return self.phase_window[0] <= self.current <= self.phase_window[1]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "current": self.current,
            "phase": self.phase.value,
            "phase_window": list(self.phase_window)
        }


@dataclass
class CharacterConstraint:
    character_id: str
    base_valence: float = 0.0
    current_valence: float = 0.0
    emotional_momentum: float = 0.0
    defense_mechanisms: List[str] = field(default_factory=list)
    max_shift_per_beat: float = 0.3

    def validate(self) -> bool:
        if abs(self.current_valence - self.base_valence) > self.max_shift_per_beat:
            return False
        return True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "character_id": self.character_id,
            "base_valence": self.base_valence,
            "current_valence": self.current_valence,
            "emotional_momentum": self.emotional_momentum,
            "defense_mechanisms": self.defense_mechanisms,
            "max_shift_per_beat": self.max_shift_per_beat
        }


@dataclass
class ESCPConstraint:
    """
    Container for all constraint parameters pushed from First Principles engine
    to subagents via ESC-P protocol
    """
    tension: TensionConstraint = field(default_factory=TensionConstraint)
    valence: ValenceConstraint = field(default_factory=ValenceConstraint)
    arousal: ArousalConstraint = field(default_factory=ArousalConstraint)
    arc_position: ArcPositionConstraint = field(default_factory=ArcPositionConstraint)
    character_constraints: Dict[str, CharacterConstraint] = field(default_factory=dict)
    forbidden_states: List[str] = field(default_factory=list)
    required_patterns: List[str] = field(default_factory=list)

    def validate_all(self) -> Dict[str, bool]:
        results = {
            "tension": self.tension.validate(),
            "valence": self.valence.validate(),
            "arousal": self.arousal.validate(),
            "arc_position": self.arc_position.validate(),
        }
        for char_id, char_constraint in self.character_constraints.items():
            results[f"character_{char_id}"] = char_constraint.validate()
        return results

    def to_dict(self) -> Dict[str, Any]:
        return {
            "tension": self.tension.to_dict(),
            "valence": self.valence.to_dict(),
            "arousal": self.arousal.to_dict(),
            "arc_position": self.arc_position.to_dict(),
            "character_constraints": {
                k: v.to_dict() for k, v in self.character_constraints.items()
            }
        }

    def is_phase_forbidden(self, phase: StoryPhase, tension_value: float) -> bool:
        forbidden = f"CLIMAX_at_tension_below_{int(self.tension.min_for_climax)}"
        if forbidden in self.forbidden_states and phase == StoryPhase.CLIMAX:
            return tension_value < self.tension.min_for_climax
        forbidden = f"RESOLUTION_at_tension_above_{int(self.tension.max_for_resolution)}"
        if forbidden in self.forbidden_states and phase == StoryPhase.RESOLUTION:
            return tension_value > self.tension.max_for_resolution
        return False


@dataclass
class ESCPMessage:
    """
    Protocol message format for ESC-P communication
    """
    message_id: str = ""
    message_type: ESCPMessageType = ESCPMessageType.CONSTRAINT_UPDATE
    source: ESCPSource = ESCPSource.FIRST_PRINCIPLES_ENGINE
    target_agents: List[str] = field(default_factory=list)
    timestamp: float = field(default_factory=time.time)
    payload: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        if not self.message_id:
            self.message_id = f"{self.message_type.value}_{self.timestamp}"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "message_id": self.message_id,
            "message_type": self.message_type.value,
            "source": self.source.value,
            "target_agents": self.target_agents,
            "timestamp": self.timestamp,
            "payload": self.payload
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ESCPMessage":
        return cls(
            message_id=data.get("message_id", ""),
            message_type=ESCPMessageType(data.get("message_type", "CONSTRAINT_UPDATE")),
            source=ESCPSource(data.get("source", "FIRST_PRINCIPLES_ENGINE")),
            target_agents=data.get("target_agents", []),
            timestamp=data.get("timestamp", time.time()),
            payload=data.get("payload", {})
        )


class ESCPProtocol:
    """
    ESC-P Protocol handler for constraint propagation
    Manages message bus for First Principles → Subagents communication
    """

    def __init__(self):
        self.subscribers: Dict[str, List[callable]] = {}
        self.message_history: List[ESCPMessage] = []
        self.current_constraints: Optional[ESCPConstraint] = None

    def subscribe(self, agent_id: str, callback: callable) -> None:
        """Register an agent to receive constraint updates"""
        if agent_id not in self.subscribers:
            self.subscribers[agent_id] = []
        self.subscribers[agent_id].append(callback)

    def unsubscribe(self, agent_id: str) -> None:
        """Remove agent from subscription"""
        if agent_id in self.subscribers:
            del self.subscribers[agent_id]

    def broadcast_constraint_update(self, constraints: ESCPConstraint) -> List[ESCPMessage]:
        """Push constraint update from First Principles to all subagents"""
        self.current_constraints = constraints
        target_agents = list(self.subscribers.keys())
        
        message = ESCPMessage(
            message_type=ESCPMessageType.CONSTRAINT_UPDATE,
            source=ESCPSource.FIRST_PRINCIPLES_ENGINE,
            target_agents=target_agents,
            payload={"constraints": constraints.to_dict()}
        )
        
        self.message_history.append(message)
        
        delivered = []
        for agent_id in target_agents:
            if agent_id in self.subscribers:
                for callback in self.subscribers[agent_id]:
                    try:
                        callback(message)
                        delivered.append(agent_id)
                    except Exception as e:
                        pass
        
        return delivered

    def send_emotion_state_update(self, agent_id: str, state: Dict[str, Any]) -> ESCPMessage:
        """Subagent publishes emotion state update to ECA"""
        message = ESCPMessage(
            message_type=ESCPMessageType.EMOTION_STATE_UPDATE,
            source=ESCPSource.SUBAGENT,
            target_agents=["ECA"],
            payload={
                "agent_id": agent_id,
                "state": state
            }
        )
        
        self.message_history.append(message)
        self._deliver_to_subscribers(["ECA"], message)
        
        return message

    def request_coherence_check(self, agent_id: str) -> ESCPMessage:
        """Subagent requests coherence check from ECA"""
        message = ESCPMessage(
            message_type=ESCPMessageType.COHERENCE_CHECK_REQUEST,
            source=ESCPSource.SUBAGENT,
            target_agents=["ECA"],
            payload={"agent_id": agent_id}
        )
        
        self.message_history.append(message)
        self._deliver_to_subscribers(["ECA"], message)
        
        return message

    def send_conflict_alert(self, conflict_data: Dict[str, Any]) -> ESCPMessage:
        """ECA sends conflict alert to Resolver"""
        message = ESCPMessage(
            message_type=ESCPMessageType.EMOTION_CONFLICT_ALERT,
            source=ESCPSource.ECA,
            target_agents=["RESOLVER"],
            payload=conflict_data
        )
        
        self.message_history.append(message)
        self._deliver_to_subscribers(["RESOLVER"], message)
        
        return message

    def _deliver_to_subscribers(self, target_agents: List[str], message: ESCPMessage) -> None:
        for agent_id in target_agents:
            if agent_id in self.subscribers:
                for callback in self.subscribers[agent_id]:
                    try:
                        callback(message)
                    except Exception as e:
                        pass

    def get_current_constraints(self) -> Optional[ESCPConstraint]:
        """Get current active constraints"""
        return self.current_constraints

    def get_message_history(self, message_type: Optional[ESCPMessageType] = None) -> List[ESCPMessage]:
        """Retrieve message history, optionally filtered by type"""
        if message_type is None:
            return self.message_history
        return [m for m in self.message_history if m.message_type == message_type]

    def clear_history(self) -> None:
        """Clear message history"""
        self.message_history = []


def create_constraint_from_dict(data: Dict[str, Any]) -> ESCPConstraint:
    """Factory function to create ESCPConstraint from dictionary"""
    
    tension_data = data.get("tension", {})
    tension = TensionConstraint(
        current=tension_data.get("current", 0.0),
        min_for_climax=tension_data.get("min_for_climax", 80.0),
        max_for_resolution=tension_data.get("max_for_resolution", 20.0),
        phase=StoryPhase(tension_data.get("phase", "EXPOSITION"))
    )
    
    valence_data = data.get("valence", {})
    valence = ValenceConstraint(
        current=valence_data.get("current", 0.0),
        arc_type=valence_data.get("arc_type", "RAGS_TO_RICHES"),
        expected_at_current_position=valence_data.get("expected_at_current_position", 0.0)
    )
    
    arousal_data = data.get("arousal", {})
    arousal = ArousalConstraint(
        current=arousal_data.get("current", 0.0),
        phase_requirement=ArousalLevel(arousal_data.get("phase_requirement", "medium"))
    )
    
    arc_data = data.get("arc_position", {})
    arc_position = ArcPositionConstraint(
        current=arc_data.get("current", 0.0),
        phase=StoryPhase(arc_data.get("phase", "EXPOSITION")),
        phase_window=tuple(arc_data.get("phase_window", [0.0, 0.2]))
    )
    
    char_constraints = {}
    for char_id, char_data in data.get("character_constraints", {}).items():
        char_constraints[char_id] = CharacterConstraint(
            character_id=char_id,
            base_valence=char_data.get("base_valence", 0.0),
            current_valence=char_data.get("current_valence", 0.0),
            emotional_momentum=char_data.get("emotional_momentum", 0.0),
            defense_mechanisms=char_data.get("defense_mechanisms", []),
            max_shift_per_beat=char_data.get("max_shift_per_beat", 0.3)
        )
    
    return ESCPConstraint(
        tension=tension,
        valence=valence,
        arousal=arousal,
        arc_position=arc_position,
        character_constraints=char_constraints,
        forbidden_states=data.get("forbidden_states", []),
        required_patterns=data.get("required_patterns", [])
    )


if __name__ == "__main__":
    protocol = ESCPProtocol()
    
    def test_callback(message):
        print(f"Received: {message.message_type.value}")
    
    protocol.subscribe("CharacterEmotionTracker", test_callback)
    protocol.subscribe("SceneToneDesigner", test_callback)
    protocol.subscribe("PlotRhythmMapper", test_callback)
    protocol.subscribe("DialogueVoice", test_callback)
    
    constraints = ESCPConstraint(
        tension=TensionConstraint(current=45.0, phase=StoryPhase.RISING_ACTION),
        valence=ValenceConstraint(current=0.3, arc_type="RAGS_TO_RICHES"),
        arousal=ArousalConstraint(current=0.6, phase_requirement=ArousalLevel.HIGH),
        arc_position=ArcPositionConstraint(current=0.42, phase=StoryPhase.COMPLICATION, phase_window=(0.35, 0.50)),
        character_constraints={
            "protagonist": CharacterConstraint(
                character_id="protagonist",
                base_valence=0.1,
                current_valence=-0.2,
                emotional_momentum=0.7,
                defense_mechanisms=["intellectualization"],
                max_shift_per_beat=0.3
            )
        },
        forbidden_states=[
            "CLIMAX_at_tension_below_80",
            "RESOLUTION_at_tension_above_20",
            "VALENCE_crossing_zero_without_event"
        ],
        required_patterns=[
            "one_subtext_moment_per_scene",
            "one_sensory_detail_per_beat"
        ]
    )
    
    delivered = protocol.broadcast_constraint_update(constraints)
    print(f"Delivered to {len(delivered)} agents")
    
    validation = constraints.validate_all()
    print(f"Validation results: {validation}")