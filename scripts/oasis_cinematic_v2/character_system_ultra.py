"""
character_system_ultra.py
===========================

StoryMachine Cinematic v2 -- Ultra-Scale Character System
----------------------------------------------------------

A production-grade, deeply-modeled character simulation subsystem for the
StoryMachine narrative engine. This module mirrors and extends the TypeScript
type substrate defined in ``server/engine/types.ts`` (DarkTriad, BigFive,
AttachmentStyle, DefenseMechanism, TheoryOfMind, EmotionState, Belief, Goal,
Stakes, and the CharacterSheet aggregate) with a far richer Python-side
psychological, stylometric, and mnemonic model.

The system is organized into FIVE CORE CLASSES plus EIGHT SUPPORTING CLASSES:

Core:
  1. CharacterProfile   -- Full identity + personality aggregate; the Python
                           mirror of TypeScript's CharacterSheet, with complete
                           JSON schema mapping (TS -> Python and back).
  2. PsychologyEngine   -- 16-dimension personality model, 20 defense
                           mechanisms, Plutchik's 8-emotion wheel, 15 cognitive
                           distortions, and trauma response patterns.
  3. VoiceEngine        -- Stylometric fingerprinting via Burrows's Delta,
                           10k-word vocabulary frequency profiling, sentence
                           structure analysis, speech tics, catchphrases and
                           dialect modeling.
  4. MemorySystem       -- Episodic / semantic / working / procedural memory
                           stores with Ebbinghaus decay curves and consolidation.
  5. RelationshipGraph  -- Nested Theory-of-Mind belief modeling, trust / power
                           / affinity axes (-100..+100), and relationship
                           trajectory + turning-point tracking.

Supporting:
  6.  EnneagramProfile        -- 9 types, wings, instincts, integration lines.
  7.  MyersBriggsProfile      -- 16 MBTI types + cognitive function stacks.
  8.  CognitiveBiasEngine     -- Catalogued cognitive biases + activation.
  9.  TraumaResponseSystem    -- Triggers, flashbacks, 4F response modeling.
  10. EmotionalIntelligence   -- EQ modeling (self/other awareness + regulation).
  11. SocialDynamics          -- Status transactions, in/out-group behavior.
  12. DecisionMakingEngine    -- Value-weighted, emotion-modulated choice.
  13. CharacterArcTracker     -- Arc mode + turning point + growth telemetry.

Design principles
------------------
* Deterministic where the engine is deterministic. Every appraisal, decay
  computation and strategy selection is reproducible from state + a seed. No
  network or LLM calls occur inside this module.
* Loss-less interchange. ``to_dict`` / ``from_dict`` round-trip every field,
  and TypeScript-facing payloads use the exact camelCase keys the engine emits.
* Additive and defensive. Unknown keys are preserved; missing optional keys
  fall back to neutral defaults so historical init payloads still load.

This file is intentionally verbose and heavily documented: it is meant to be
the canonical reference implementation of the character substrate.
"""

from __future__ import annotations

# ── Standard library imports ─────────────────────────────────────────────────
import enum
import json
import math
import random
import re
import uuid
import hashlib
import statistics
from collections import Counter, defaultdict, deque
from dataclasses import dataclass, field, asdict, replace
from datetime import datetime, timezone
from typing import (
    Any,
    Callable,
    Dict,
    Iterable,
    Iterator,
    List,
    Mapping,
    MutableMapping,
    Optional,
    Sequence,
    Set,
    Tuple,
    Union,
)

# ── Module version + schema constants ────────────────────────────────────────
__version__ = "2.0.0"
SCHEMA_VERSION = 2

# The clamp bounds the TypeScript engine uses for its 0..100 scales.
SCALE_MIN = 0.0
SCALE_MAX = 100.0

# Relationship axes in this module use a signed -100..+100 scale (the engine
# stores 0..1 affinity/trust; ``RelationshipGraph`` converts on export).
SIGNED_MIN = -100.0
SIGNED_MAX = 100.0

# Confidence values (belief strength) live on 0..1 to match ``Belief.confidence``.
CONF_MIN = 0.0
CONF_MAX = 1.0

# PLACEHOLDER_APPEND_1
