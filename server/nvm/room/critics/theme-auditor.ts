// Theme-Auditor critic — is the thematic argument moving or restating.
// Objects to a claim+move combo repeated verbatim instead of advanced
// dialectically, to a theme stated outright in a sonic beat instead of
// embodied through action, and to a declared theme that has gone completely
// unargued many scenes into the story.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { Critique } from '../room.ts';

// Deep enough into the story that "the theme has never been argued" is a real
// problem rather than a normal early-scene absence (showrunner already covers
// the per-scene-function case; this is the broader cumulative net).
const THEME_SILENCE_SCENE_THRESHOLD = 6;

export function themeAuditorCritic(ir: NarrativeTransitionIR, state: NarrativeState): Critique[] {
  const critiques: Critique[] = [];

  // Gate 1: restate, not advance — this op's claimId already has the identical
  // move on record. Repeating a "support" as "support" again isn't dialectical
  // progress; only attack/undercut/complicate/resolve move the argument.
  ir.ops.forEach((op, i) => {
    if (op.op === 'ADVANCE_THEME_ARGUMENT') {
      const repeat = state.themeArgument.some(m => m.claimId === op.claimId && m.move === op.move);
      if (repeat) {
        critiques.push({
          criticId: 'theme_auditor', severity: 35, targetOpIdx: i,
          objection: `Claim "${op.claimId}" already has a "${op.move}" move on record — this op restates the identical move instead of advancing the argument`,
          suggestedOperator: 'sharpen_theme',
          attentionBid: 40,
        });
      }
    }
  });

  // Gate 2: announced, not embodied — a sonic beat in a scene that also
  // advances the theme states the theme almost verbatim. The argument is
  // being spoken aloud rather than dramatized through what happens.
  const theme = state.authorIntent.theme?.trim();
  if (theme) {
    const themeLower = theme.toLowerCase();
    const hasThemeMove = ir.ops.some(op => op.op === 'ADVANCE_THEME_ARGUMENT');
    if (hasThemeMove) {
      ir.ops.forEach((op, i) => {
        if (op.op === 'RECORD_SONIC_FACT' && op.fact.toLowerCase().includes(themeLower)) {
          critiques.push({
            criticId: 'theme_auditor', severity: 35, targetOpIdx: i,
            objection: `Sonic fact "${op.fact}" states the theme ("${theme}") almost verbatim — the argument is being announced through dialogue, not embodied through action`,
            suggestedOperator: 'sharpen_theme',
            attentionBid: 40,
          });
        }
      });
    }
  }

  // Gate 3: theme silence — a theme is declared, we're deep into the story,
  // and it has never once been argued (no prior moves, no move this scene).
  if (theme && ir.sceneIdx >= THEME_SILENCE_SCENE_THRESHOLD) {
    const hasThemeMoveThisScene = ir.ops.some(op => op.op === 'ADVANCE_THEME_ARGUMENT');
    if (state.themeArgument.length === 0 && !hasThemeMoveThisScene) {
      critiques.push({
        criticId: 'theme_auditor', severity: 30, targetOpIdx: null,
        objection: `Scene ${ir.sceneIdx} and the theme ("${theme}") has never once been argued — ${THEME_SILENCE_SCENE_THRESHOLD}+ scenes in with no ADVANCE_THEME_ARGUMENT move of any kind`,
        suggestedOperator: 'sharpen_theme',
        attentionBid: 35,
      });
    }
  }

  return critiques;
}
