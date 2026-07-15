# Append more content to cinematic_system.py
with open('cinematic_system.py', 'a') as f:
    f.write("""
    
    def _select_camera_angle(self, emotional_goal: str, characters: List[str]) -> CameraAngle:
        \"\"\"Select camera angle based on emotional intent.\"\"\"
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
        \"\"\"Select camera movement.\"\"\"
        if 'action' in scene_context.lower():
            return CameraMovement.HANDHELD
        elif 'dramatic' in emotional_goal.lower():
            return CameraMovement.PUSH_IN
        else:
            return CameraMovement.STATIC
            
    def _select_lens(self, shot_type: ShotType, emotional_goal: str) -> LensType:
        \"\"\"Select lens.\"\"\"
        if shot_type in [ShotType.CLOSE_UP, ShotType.EXTREME_CLOSE_UP]:
            return LensType.PORTRAIT
        elif shot_type in [ShotType.WIDE_SHOT, ShotType.EXTREME_WIDE]:
            return LensType.WIDE
        else:
            return LensType.NORMAL
            
    def _select_composition_rules(self, shot_type: ShotType, characters: List[str]) -> List[CompositionRule]:
        \"\"\"Select composition rules.\"\"\"
        rules = []
        if len(characters) == 1:
            rules.append(CompositionRule.RULE_OF_THIRDS)
        return rules
        
    def _calculate_duration(self, shot_type: ShotType, narrative_intent: str) -> float:
        \"\"\"Calculate duration.\"\"\"
        return 5.0
        
    def _calculate_focal_length(self, lens_type: LensType, shot_type: ShotType) -> int:
        \"\"\"Calculate focal length.\"\"\"
        return 50
        
    def _calculate_aperture(self, shot_type: ShotType, emotional_goal: str) -> float:
        \"\"\"Calculate aperture.\"\"\"
        return 4.0


# ============================================================================
# BLOCKING ENGINE
# ============================================================================

class BlockingEngine:
    \"\"\"Character blocking and movement choreography.\"\"\"
    
    def __init__(self):
        self.positions = {}
        self.movements = []
        
    def position_character(self, name: str, x: float, y: float, z: float) -> BlockingPosition:
        \"\"\"Position character in frame.\"\"\"
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


""")

with open('cinematic_system.py', 'r') as f:
    print(f'Total lines: {len(f.readlines())}')
