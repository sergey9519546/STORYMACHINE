// Wave 39 — Pass 9: Pacing
// Checks scene length balance: scenes that are too long for their dramatic
// purpose, scenes that are too short to land, act-level pacing imbalance.

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';

/** Count non-empty lines in a scene block */
function sceneLineCount(fountain: string): Map<number, number> {
  const lines = fountain.split('\n');
  const counts = new Map<number, number>();
  let currentScene = -1;
  let lineCount = 0;

  for (const line of lines) {
    if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(line.trim())) {
      if (currentScene >= 0) counts.set(currentScene, lineCount);
      currentScene++;
      lineCount = 0;
    } else if (currentScene >= 0 && line.trim()) {
      lineCount++;
    }
  }
  if (currentScene >= 0) counts.set(currentScene, lineCount);
  return counts;
}

export async function pacingPass(input: PassInput): Promise<PassResult> {
  const { fountain, records, annotations, structure, approvedSpans } = input;
  const issues: RevisionIssue[] = [];

  const sceneLengths = sceneLineCount(fountain);
  if (sceneLengths.size === 0) {
    return {
      pass: 'pacing',
      issues: [],
      revisedFountain: fountain,
      changed: false,
      summary: 'Pacing pass: no scenes found',
    };
  }

  const lengths = Array.from(sceneLengths.values());
  const avgLength = lengths.reduce((s, v) => s + v, 0) / lengths.length;

  // ── Scenes that are disproportionately long ───────────────────────────────
  for (const [sceneIdx, lineCount] of sceneLengths) {
    const record = records[sceneIdx];
    const ann = annotations[sceneIdx];
    if (!record || !ann) continue;

    // Scene is >2.5x average and has low suspense delta = over-written
    if (lineCount > avgLength * 2.5 && record.suspenseDelta < 2) {
      issues.push({
        location: `Scene ${sceneIdx} (${record.slug})`,
        rule: 'OVERLONG_LOW_TENSION',
        description: `Scene ${sceneIdx} is ${lineCount} lines (${Math.round(lineCount / avgLength * 100)}% above average) but generates low tension — over-written`,
        severity: 'major',
        suggestedFix: 'Trim exposition and redundant beats; reduce to the scene\'s essential dramatic moment',
      });
    }

    // Scene is <30% of average and is a turning point — too compressed
    if (lineCount < avgLength * 0.3 && (ann.revelation || record.clockRaised)) {
      issues.push({
        location: `Scene ${sceneIdx} (${record.slug})`,
        rule: 'COMPRESSED_TURNING_POINT',
        description: `Scene ${sceneIdx} is a turning point but only ${lineCount} lines (very short) — the moment may not land`,
        severity: 'major',
        suggestedFix: 'Expand this key scene with more character reaction and consequence before moving on',
      });
    }
  }

  // ── Act-level pacing: Act 1 too long, Act 3 too short ────────────────────
  const n = records.length;
  if (n >= 6) {
    const act1End = Math.floor(n * 0.25);
    const act3Start = Math.floor(n * 0.75);

    const act1Lines = Array.from({ length: act1End }, (_, i) => sceneLengths.get(i) ?? 0).reduce((s, v) => s + v, 0);
    const act3Lines = Array.from({ length: n - act3Start }, (_, i) => sceneLengths.get(act3Start + i) ?? 0).reduce((s, v) => s + v, 0);
    const totalLines = lengths.reduce((s, v) => s + v, 0);
    if (totalLines === 0) return {
      pass: 'pacing', issues: [], revisedFountain: fountain, changed: false,
      summary: 'Pacing pass: all scenes are empty',
    };

    const act1Pct = act1Lines / totalLines;
    const act3Pct = act3Lines / totalLines;

    if (act1Pct > 0.4) {
      issues.push({
        location: 'Act 1 pacing',
        rule: 'ACT1_TOO_LONG',
        description: `Act 1 uses ${Math.round(act1Pct * 100)}% of total page count — setup dominates at the expense of conflict`,
        severity: 'major',
        suggestedFix: 'Trim Act 1 by cutting or compressing scenes that don\'t introduce conflict',
      });
    }

    if (act3Pct < 0.1 && structure.actPosition === 'act3') {
      issues.push({
        location: 'Act 3 pacing',
        rule: 'ACT3_TOO_SHORT',
        description: `Act 3 uses only ${Math.round(act3Pct * 100)}% of total page count — the resolution feels rushed`,
        severity: 'major',
        suggestedFix: 'Expand Act 3 with a proper denouement that honors the climax',
      });
    }
  }

  const { revised, usedLLM } = await rewritePass({ fountain, issues, passName: 'pacing', approvedSpans, storyContext: input.storyContext });
  const changed = revised !== fountain;

  return {
    pass: 'pacing',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? 'Pacing pass: scene lengths are balanced'
      : `Pacing pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}
