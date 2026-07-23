"""
action_system_ultra.py
========================

OASIS CINEMATIC V2 — ULTRA-SCALE ACTION SYSTEM
Cinematic action generation engine for the StoryMachine narrative simulation.

This module implements four large, deeply-featured engines that convert abstract
narrative intent into cinematically viable, blocked, and choreographed action.
Every generated action is designed to be directly translatable into a screenplay
beat (Fountain-style) plus a director's blocking note.

The four engines:

    1. DialogueEngine        — speech, subtext, interruption, overlap, silence
    2. PhysicalActionEngine  — fights, intimacy, movement, objects, stunts, injury
    3. EmotionalEngine       — Plutchik state, reactions, microexpressions, catharsis
    4. SocialEngine          — alliances, betrayal, confession, lie-detection, power

Integration:
    The ActionType vocabulary mirrors server/engine/types.ts ACTION_TYPES:
        SPEAK, EXAMINE, LIE, RELOCATE, WAIT, HIDE, OBSERVE, LISTEN, SEARCH,
        REVEAL, THREATEN, BETRAY, PROTECT, FORM_ALLIANCE, FLEE
    Each engine emits CinematicAction records that carry the base ActionType plus
    an expanded cinematic payload (blocking, camera, timing, choreography).

Design principles:
    - Deterministic where possible: given the same seed + inputs, output is stable.
    - Every action carries a `blocking_note` for physical staging.
    - Every action carries a `camera_hint` for coverage.
    - Timing is expressed in beats and seconds for editorial rhythm.
    - No external dependencies beyond the Python standard library.

Author: StoryMachine Cinematic Team
"""

from __future__ import annotations

import math
import random
import hashlib
import itertools
from dataclasses import dataclass, field, asdict
from enum import Enum, auto
from typing import (
    Any,
    Callable,
    Dict,
    List,
    Optional,
    Sequence,
    Tuple,
    Union,
)

# =============================================================================
# SHARED VOCABULARY / ENUMS
# =============================================================================

# Mirror of server/engine/types.ts ACTION_TYPES (single source of truth upstream).
ACTION_TYPES: Tuple[str, ...] = (
    "SPEAK", "EXAMINE", "LIE", "RELOCATE", "WAIT",
    "HIDE", "OBSERVE", "LISTEN", "SEARCH", "REVEAL",
    "THREATEN", "BETRAY", "PROTECT", "FORM_ALLIANCE", "FLEE",
)


class ActionType(str, Enum):
    """Canonical action vocabulary, aligned with the TypeScript engine."""

    SPEAK = "SPEAK"
    EXAMINE = "EXAMINE"
    LIE = "LIE"
    RELOCATE = "RELOCATE"
    WAIT = "WAIT"
    HIDE = "HIDE"
    OBSERVE = "OBSERVE"
    LISTEN = "LISTEN"
    SEARCH = "SEARCH"
    REVEAL = "REVEAL"
    THREATEN = "THREATEN"
    BETRAY = "BETRAY"
    PROTECT = "PROTECT"
    FORM_ALLIANCE = "FORM_ALLIANCE"
    FLEE = "FLEE"

    @classmethod
    def is_audible(cls, action_type: "ActionType") -> bool:
        """Whether the action produces sound others in the room can hear."""
        return action_type in {
            cls.SPEAK, cls.LIE, cls.REVEAL, cls.THREATEN, cls.FORM_ALLIANCE,
        }


# PLACEHOLDER_SHARED_ENUMS
