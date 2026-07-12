"""
UVM State Tensor - VAD (Valence, Arousal, Dominance) and Tension state management
for the 6 UVM Emotional Arcs (Reagan et al. 2016)

Arc reference:
- Rags to Riches: Rise (steady improvement from bad to good)
- Tragedy: Fall (decline from good to bad)
- Man in Hole: Fall→Rise (fall into trouble, then rise)
- Icarus: Rise→Fall (rise to tragedy, hubris leads to fall)
- Cinderella: Rise→Fall→Rise
- Oedipus: Fall→Rise→Fall
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple
import math


class UVMArc(Enum):
    RAGS_TO_RICHES = "rags_to_riches"  # Rise
    TRAGEDY = "tragedy"                # Fall
    MAN_IN_HOLE = "man_in_hole"         # Fall→Rise
    ICARUS = "icarus"                  # Rise→Fall
    CINDERELLA = "cinderella"          # Rise→Fall→Rise
    OEDIPUS = "oedipus"                # Fall→Rise→Fall


@dataclass
class VADTensor:
    """
    Valence-Arousal-Dominance tensor for continuous emotional state.
    
    Attributes:
        valence: -1.0 (negative) to +1.0 (positive)
        arousal: 0.0 (calm) to 1.0 (excited)
        dominance: 0.0 (overwhelmed) to 1.0 (in control)
    """
    valence: float = 0.0
    arousal: float = 0.5
    dominance: float = 0.5
    
    # Valid VAD ranges
    VALENCE_MIN: float = -1.0
    VALENCE_MAX: float = 1.0
    AROUSAL_MIN: float = 0.0
    AROUSAL_MAX: float = 1.0
    DOMINANCE_MIN: float = 0.0
    DOMINANCE_MAX: float = 1.0
    
    def __post_init__(self):
        """Clamp values to valid ranges."""
        self.valence = max(self.VALENCE_MIN, min(self.VALENCE_MAX, self.valence))
        self.arousal = max(self.AROUSAL_MIN, min(self.AROUSAL_MAX, self.arousal))
        self.dominance = max(self.DOMINANCE_MIN, min(self.DOMINANCE_MAX, self.dominance))
    
    def to_vector(self) -> List[float]:
        """Return as flat vector for tensor operations."""
        return [self.valence, self.arousal, self.dominance]
    
    def clone(self) -> "VADTensor":
        """Create a copy of this tensor."""
        return VADTensor(valence=self.valence, arousal=self.arousal, dominance=self.dominance)
    
    def distance_to(self, other: "VADTensor") -> float:
        """Euclidean distance to another VADTensor."""
        dv = self.valence - other.valence
        da = self.arousal - other.arousal
        dd = self.dominance - other.dominance
        return math.sqrt(dv**2 + da**2 + dd**2)


@dataclass
class TensionState:
    """
    Narrative tension state tracker.
    
    Attributes:
        tension: 0.0 (minimum) to 100.0 (maximum)
        CLIMAX_MIN: Minimum tension required for valid climax (80.0)
        RESOLUTION_MAX: Maximum tension before resolution (20.0)
    """
    tension: float = 0.0
    
    CLIMAX_MIN: float = 80.0
    RESOLUTION_MAX: float = 20.0
    
    def __post_init__(self):
        """Clamp tension to valid range."""
        self.tension = max(0.0, min(100.0, self.tension))
    
    def at_climax(self) -> bool:
        """Check if tension has reached climax threshold."""
        return self.tension >= self.CLIMAX_MIN
    
    def ready_for_resolution(self) -> bool:
        """Check if tension has dropped below resolution threshold."""
        return self.tension <= self.RESOLUTION_MAX
    
    def clone(self) -> "TensionState":
        """Create a copy of this state."""
        return TensionState(tension=self.tension)


# Arc phase definitions for trajectory calculation
ARC_PHASES = {
    UVMArc.RAGS_TO_RICHES: {
        "phases": ["setup", "rise", "triumph"],
        "valence_trajectory": [+0.3, +0.5, +0.8],  # Steadily positive
        "arousal_trajectory": [0.3, 0.5, 0.8],    # Increasing
        "dominance_trajectory": [0.2, 0.5, 0.9], # Increasing (gain control)
    },
    UVMArc.TRAGEDY: {
        "phases": ["setup", "fall", "despair"],
        "valence_trajectory": [+0.5, -0.3, -0.8],  # Declining
        "arousal_trajectory": [0.5, 0.7, 0.3],    # Peak then drop
        "dominance_trajectory": [0.7, 0.4, 0.1],   # Losing control
    },
    UVMArc.MAN_IN_HOLE: {
        "phases": ["setup", "crisis", "resolution"],
        "valence_trajectory": [+0.2, -0.6, +0.4],  # Fall then rise
        "arousal_trajectory": [0.3, 0.9, 0.4],      # Spike then moderate
        "dominance_trajectory": [0.5, 0.1, 0.7],   # Lose then regain
    },
    UVMArc.ICARUS: {
        "phases": ["setup", "ascent", "fall"],
        "valence_trajectory": [0.0, +0.7, -0.7],   # Rise then crash
        "arousal_trajectory": [0.3, 0.8, 0.5],    # High then moderate
        "dominance_trajectory": [0.4, 0.9, 0.2],   # Overreach then collapse
    },
    UVMArc.CINDERELLA: {
        "phases": ["setup", "rise", "fall", "resolution"],
        "valence_trajectory": [+0.1, +0.6, -0.4, +0.7],  # Up-down-up
        "arousal_trajectory": [0.3, 0.6, 0.8, 0.4],       # Up-down-down
        "dominance_trajectory": [0.2, 0.5, 0.2, 0.8],   # Lose/gain/lose/gain
    },
    UVMArc.OEDIPUS: {
        "phases": ["setup", "rise", "fall"],
        "valence_trajectory": [-0.3, +0.5, -0.9],   # Rise from tragedy, then fall
        "arousal_trajectory": [0.4, 0.6, 0.7],      # Moderate to high
        "dominance_trajectory": [0.3, 0.7, 0.1],  # Gain then lose everything
    },
}


def calculate_arc_position(arc: UVMArc, token_index: int, total_tokens: int) -> float:
    """
    Calculate normalized position (0.0 to 1.0) within an arc trajectory.
    
    Different arcs have different phase structures, so we map token positions
    to arc phases appropriately.
    
    Args:
        arc: The UVM arc type
        token_index: Current token position (0-indexed)
        total_tokens: Total tokens in the narrative
        
    Returns:
        Normalized position (0.0 = start, 1.0 = end)
    """
    if total_tokens <= 0:
        return 0.0
    
    normalized = token_index / total_tokens
    
    # Remap based on arc structure
    # Each arc has different "interesting" regions
    if arc == UVMArc.RAGS_TO_RICHES:
        # Linear rise - spread evenly
        return normalized
    elif arc == UVMArc.TRAGEDY:
        # Quick start, slow end (death by a thousand cuts)
        return normalized ** 0.8
    elif arc == UVMArc.MAN_IN_HOLE:
        # Crisis in middle (35-65%)
        if normalized < 0.35:
            return normalized * 0.5 / 0.35  # Quick through setup
        elif normalized < 0.65:
            return 0.5 + (normalized - 0.35) * 1.25  # Slow through crisis
        else:
            return 0.5 + 0.375 + (normalized - 0.65) * 1.43  # Resolution
    elif arc == UVMArc.ICARUS:
        # Spends time at top before fall
        if normalized < 0.6:
            return normalized * 0.8 / 0.6  # Quick to ascent
        else:
            return 0.8 + (normalized - 0.6) * 0.5  # Slow fall
    elif arc == UVMArc.CINDERELLA:
        # Three acts: 30%, 20%, 50%
        if normalized < 0.3:
            return normalized * 0.5 / 0.3
        elif normalized < 0.5:
            return 0.5 + (normalized - 0.3) * 2.5
        else:
            return 0.5 + 0.5 + (normalized - 0.5) * 1.0
    elif arc == UVMArc.OEDIPUS:
        # Rise slow, fall fast
        if normalized < 0.4:
            return normalized * 0.7 / 0.4
        else:
            return 0.7 + (normalized - 0.4) * 0.5
    else:
        return normalized


def interpolate_trajectory(
    trajectory: List[float],
    position: float
) -> float:
    """
    Interpolate between trajectory points based on position.
    
    Args:
        trajectory: List of target values at phase endpoints
        position: Normalized position (0.0 to 1.0)
        
    Returns:
        Interpolated value
    """
    if not trajectory:
        return 0.0
    
    n = len(trajectory)
    if n == 1:
        return trajectory[0]
    
    # Map position to trajectory indices
    scaled = position * (n - 1)
    idx = int(scaled)
    frac = scaled - idx
    
    # Clamp to valid range
    idx = max(0, min(n - 2, idx))
    
    # Linear interpolation
    return trajectory[idx] * (1 - frac) + trajectory[idx + 1] * frac


def compute_vad_delta(
    current: VADTensor,
    arc: UVMArc,
    token_index: int,
    total_tokens: int,
    base_rate: float = 0.1
) -> VADTensor:
    """
    Compute the change in VAD state for the next token.
    
    Mathematical algorithm:
    1. Calculate position in arc trajectory
    2. Determine target VAD values at this position
    3. Compute delta: rate * (target - current)
    
    Args:
        current: Current VAD tensor state
        arc: The UVM arc being followed
        token_index: Current token position
        total_tokens: Total tokens in narrative
        base_rate: Learning rate for state updates (default 0.1)
        
    Returns:
        VADTensor delta (change to apply)
    """
    # Get arc trajectory definition
    arc_def = ARC_PHASES[arc]
    
    # Calculate normalized position
    position = calculate_arc_position(arc, token_index, total_tokens)
    
    # Interpolate target values
    target_valence = interpolate_trajectory(arc_def["valence_trajectory"], position)
    target_arousal = interpolate_trajectory(arc_def["arousal_trajectory"], position)
    target_dominance = interpolate_trajectory(arc_def["dominance_trajectory"], position)
    
    # Compute deltas with rate limiting
    dv = base_rate * (target_valence - current.valence)
    da = base_rate * (target_arousal - current.arousal)
    dd = base_rate * (target_dominance - current.dominance)
    
    return VADTensor(valence=dv, arousal=da, dominance=dd)


def compute_tension_delta(
    current: TensionState,
    arc: UVMArc,
    token_index: int,
    total_tokens: int,
    base_rate: float = 0.15
) -> float:
    """
    Compute the change in tension for the next token.
    
    Mathematical algorithm:
    - Tension follows arousal but with phase-specific modifiers
    - Arcs define where tension peaks and troughs occur
    
    Args:
        current: Current tension state
        arc: The UVM arc being followed  
        token_index: Current token position
        total_tokens: Total tokens in narrative
        base_rate: Learning rate for tension updates (default 0.15)
        
    Returns:
        Float delta to add to tension
    """
    position = calculate_arc_position(arc, token_index, total_tokens)
    
    # Define tension trajectory for each arc (different from VAD)
    tension_trajectories = {
        UVMArc.RAGS_TO_RICHES: [10, 40, 90],    # Build to triumph
        UVMArc.TRAGEDY: [50, 80, 30],          # High then drop
        UVMArc.MAN_IN_HOLE: [20, 95, 15],      # Spike in crisis
        UVMArc.ICARUS: [30, 85, 40],           # Hold high, then drop
        UVMArc.CINDERELLA: [20, 70, 90, 25],   # Rise, fall, rise
        UVMArc.OEDIPUS: [60, 40, 95],          # Start high, drop, peak at tragedy
    }
    
    trajectory = tension_trajectories[arc]
    target_tension = interpolate_trajectory(trajectory, position)
    
    # Compute delta
    delta = base_rate * (target_tension - current.tension)
    
    return delta


def update_vad_state(
    current: VADTensor,
    arc: UVMArc,
    token_index: int,
    total_tokens: int,
    base_rate: float = 0.1
) -> VADTensor:
    """
    Update VAD state by applying computed delta.
    
    Args:
        current: Current VAD tensor state
        arc: The UVM arc being followed
        token_index: Current token position
        total_tokens: Total tokens in narrative
        base_rate: Learning rate for state updates
        
    Returns:
        New VADTensor with updated values
    """
    delta = compute_vad_delta(current, arc, token_index, total_tokens, base_rate)
    
    return VADTensor(
        valence=current.valence + delta.valence,
        arousal=current.arousal + delta.arousal,
        dominance=current.dominance + delta.dominance
    )


def update_tension_state(
    current: TensionState,
    arc: UVMArc,
    token_index: int,
    total_tokens: int,
    base_rate: float = 0.15
) -> TensionState:
    """
    Update tension state by applying computed delta.
    
    Args:
        current: Current tension state
        arc: The UVM arc being followed
        token_index: Current token position
        total_tokens: Total tokens in narrative
        base_rate: Learning rate for tension updates
        
    Returns:
        New TensionState with updated tension
    """
    delta = compute_tension_delta(current, arc, token_index, total_tokens, base_rate)
    
    return TensionState(tension=current.tension + delta)


def validate_arc_completion(
    vad_state: VADTensor,
    tension_state: TensionState,
    arc: UVMArc
) -> Dict[str, bool]:
    """
    Validate that narrative has followed the arc correctly.
    
    Checks:
    - Tension reached climax (>=80) before climax phase
    - Tension resolved (<=20) by end
    - VAD values stayed within valid bounds
    
    Args:
        vad_state: Final VAD state
        tension_state: Final tension state
        arc: The arc that was followed
        
    Returns:
        Dictionary of validation results
    """
    results = {
        "climax_reached": tension_state.at_climax(),
        "properly_resolved": tension_state.ready_for_resolution(),
        "valid_vad_bounds": (
            VADTensor.VALENCE_MIN <= vad_state.valence <= VADTensor.VALENCE_MAX and
            VADTensor.AROUSAL_MIN <= vad_state.arousal <= VADTensor.AROUSAL_MAX and
            VADTensor.DOMINANCE_MIN <= vad_state.dominance <= VADTensor.DOMINANCE_MAX
        ),
    }
    
    # Arc-specific validations
    if arc == UVMArc.TRAGEDY:
        results["valence_declined"] = vad_state.valence < 0.0
    elif arc == UVMArc.RAGS_TO_RICHES:
        results["valence_rose"] = vad_state.valence > 0.0
    elif arc == UVMArc.ICARUS:
        results["dominance_collapsed"] = vad_state.dominance < 0.3
    
    return results


def get_initial_state(arc: UVMArc) -> Tuple[VADTensor, TensionState]:
    """
    Get appropriate initial states for starting an arc.
    
    Args:
        arc: The UVM arc to initialize
        
    Returns:
        Tuple of (initial_vad, initial_tension)
    """
    initial_states = {
        UVMArc.RAGS_TO_RICHES: (VADTensor(valence=-0.3, arousal=0.3, dominance=0.2), TensionState(tension=10)),
        UVMArc.TRAGEDY: (VADTensor(valence=0.4, arousal=0.5, dominance=0.6), TensionState(tension=40)),
        UVMArc.MAN_IN_HOLE: (VADTensor(valence=0.2, arousal=0.3, dominance=0.5), TensionState(tension=20)),
        UVMArc.ICARUS: (VADTensor(valence=0.0, arousal=0.3, dominance=0.4), TensionState(tension=25)),
        UVMArc.CINDERELLA: (VADTensor(valence=0.1, arousal=0.3, dominance=0.2), TensionState(tension=15)),
        UVMArc.OEDIPUS: (VADTensor(valence=-0.3, arousal=0.4, dominance=0.3), TensionState(tension=50)),
    }
    
    return initial_states[arc]