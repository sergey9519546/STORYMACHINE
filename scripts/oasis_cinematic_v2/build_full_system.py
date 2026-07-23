#!/usr/bin/env python3
"""
Comprehensive 10,000+ Line Cinematic System Generator
Builds complete production-ready cinematography system
"""

def add_lines(lines, *content):
    """Helper to add lines."""
    for item in content:
        if isinstance(item, list):
            lines.extend(item)
        else:
            lines.append(item)

def generate_lens_type_enum():
    """Generate LensType enum with full specifications."""
    return [
        "",
        "class LensType(Enum):",
        '    """Lens focal length categories."""',
        "    ",
        '    ULTRA_WIDE = "ultra_wide"  # 14-24mm',
        '    WIDE = "wide"  # 24-35mm',
        '    NORMAL = "normal"  # 35-50mm',
        '    PORTRAIT = "portrait"  # 50-85mm',
        '    TELEPHOTO = "telephoto"  # 85-200mm',
        '    SUPER_TELEPHOTO = "super_tele"  # 200mm+',
        '    FISHEYE = "fisheye"  # <14mm',
        '    MACRO = "macro"  # Close focus',
        "",
    ]

def generate_composition_enum():
    """Generate composition rules enum."""
    return [
        "",
        "class CompositionRule(Enum):",
        '    """Composition guidelines."""',
        "    ",
        '    RULE_OF_THIRDS = "rule_of_thirds"',
        '    GOLDEN_RATIO = "golden_ratio"',
        '    CENTER_FRAMING = "center_framing"',
        '    SYMMETRY = "symmetry"',
        '    LEADING_LINES = "leading_lines"',
        '    DIAGONAL = "diagonal"',
        '    FRAME_WITHIN_FRAME = "frame_within_frame"',
        '    NEGATIVE_SPACE = "negative_space"',
        '    DEPTH_LAYERING = "depth_layering"',
        '    BALANCE = "balance"',
        "",
    ]

def generate_edit_type_enum():
    """Generate editing transition types."""
    return [
        "",
        "class EditType(Enum):",
        '    """Types of editorial cuts and transitions."""',
        "    ",
        '    CUT = "cut"  # Standard instantaneous cut',
        '    DISSOLVE = "dissolve"  # Cross dissolve',
        '    FADE_OUT = "fade_out"  # Fade to black',
        '    FADE_IN = "fade_in"  # Fade from black',
        '    WIPE = "wipe"  # Geometric wipe',
        '    MATCH_CUT = "match_cut"  # Visual/graphic match',
        '    JUMP_CUT = "jump_cut"  # Temporal jump',
        '    SMASH_CUT = "smash_cut"  # Jarring transition',
        '    L_CUT = "l_cut"  # Audio leads video',
        '    J_CUT = "j_cut"  # Video leads audio',
        '    CROSS_CUT = "cross_cut"  # Parallel action',
        '    MONTAGE = "montage"  # Time compression',
        "",
    ]

def generate_proxemics_enum():
    """Generate proxemics distance categories."""
    return [
        "",
        "class ProxemicsZone(Enum):",
        '    """Edward Hall proxemics zones for character spacing."""',
        "    ",
        '    INTIMATE = "intimate"  # 0-18 inches',
        '    PERSONAL = "personal"  # 18 inches - 4 feet',
        '    SOCIAL = "social"  # 4-12 feet',
        '    PUBLIC = "public"  # 12+ feet',
        "    ",
        "    @property",
        "    def distance_range_inches(self) -> Tuple[float, float]:",
        '        """Return distance range in inches."""',
        "        ranges = {",
        '            "intimate": (0, 18),',
        '            "personal": (18, 48),',
        '            "social": (48, 144),',
        '            "public": (144, 360),',
        "        }",
        "        return ranges.get(self.value, (18, 48))",
        "    ",
        "    @property",
        "    def emotional_implication(self) -> str:",
        '        """Return emotional meaning."""',
        "        implications = {",
        '            "intimate": "Love, comfort, protection, or violence",',
        '            "personal": "Friends, close relationships, personal conversation",',
        '            "social": "Acquaintances, professional, impersonal business",',
        '            "public": "Formal, speeches, strangers, detachment",',
        "        }",
        "        return implications.get(self.value, \"\")",
        "",
    ]

def generate_dataclasses():
    """Generate dataclass definitions."""
    return [
        "",
        "# " + "="*76,
        "# DATA CLASSES - Shot Specifications",
        "# " + "="*76,
        "",
        "@dataclass",
        "class ShotSpecification:",
        '    """Complete specification for a single shot."""',
        "    ",
        "    shot_number: int",
        "    shot_type: ShotType",
        "    camera_angle: CameraAngle",
        "    camera_movement: CameraMovement",
        "    lens_type: LensType",
        "    duration_seconds: float",
        "    focal_length_mm: int",
        "    aperture: float",
        "    composition_rules: List[CompositionRule] = field(default_factory=list)",
        "    subject: Optional[str] = None",
        "    action_description: str = ''",
        "    dialogue: str = ''",
        "    sound_design: str = ''",
        "    lighting_notes: str = ''",
        "    color_palette: List[str] = field(default_factory=list)",
        "    psychological_intent: str = ''",
        "    narrative_purpose: str = ''",
        "    ",
        "    def to_dict(self) -> Dict[str, Any]:",
        '        """Convert to dictionary."""',
        "        return {",
        '            "shot_number": self.shot_number,',
        '            "shot_type": self.shot_type.value,',
        '            "camera_angle": self.camera_angle.value,',
        '            "camera_movement": self.camera_movement.value,',
        '            "lens_type": self.lens_type.value,',
        '            "duration_seconds": self.duration_seconds,',
        '            "focal_length_mm": self.focal_length_mm,',
        '            "aperture": self.aperture,',
        '            "composition_rules": [r.value for r in self.composition_rules],',
        '            "subject": self.subject,',
        '            "action_description": self.action_description,',
        '            "dialogue": self.dialogue,',
        '            "sound_design": self.sound_design,',
        '            "lighting_notes": self.lighting_notes,',
        '            "color_palette": self.color_palette,',
        '            "psychological_intent": self.psychological_intent,',
        '            "narrative_purpose": self.narrative_purpose,',
        "        }",
        "",
        "",
        "@dataclass",
        "class BlockingPosition:",
        '    """Character position and orientation in frame."""',
        "    ",
        "    character_name: str",
        "    x_position: float  # -1.0 (left) to 1.0 (right)",
        "    y_position: float  # -1.0 (bottom) to 1.0 (top)",
        "    z_position: float  # 0.0 (camera) to 1.0 (far)",
        "    facing_direction: float  # 0-360 degrees",
        "    body_angle: float  # Relative to camera",
        "    eye_line: Tuple[float, float, float]  # Looking direction",
        "    posture: str = 'neutral'",
        "    gesture: str = ''",
        "    props: List[str] = field(default_factory=list)",
        "    proxemics_zone: Optional[ProxemicsZone] = None",
        "",
        "",
        "@dataclass",
        "class CharacterMovement:",
        '    """Character movement choreography."""',
        "    ",
        "    character_name: str",
        "    start_position: BlockingPosition",
        "    end_position: BlockingPosition",
        "    duration_seconds: float",
        "    movement_type: str  # walk, run, turn, gesture, etc.",
        "    motivation: str",
        "    emotional_state: str",
        "    intention: str",
        "    obstacles: List[str] = field(default_factory=list)",
        "",
    ]

# Continue in next part...
print("Building comprehensive system...")
