// Wave 39 — Pass 11: Payoff/Continuity
// Checks planted clue/setup payoffs: orphan clues, setups paid off too quickly,
// payoffs that arrive before their setups.
// Wave 140 additions: setup without consequence (clues planted multiple times
// but never affecting plot/character decisions) and consequence-delayed payoff
// (payoff occurs too long after setup, breaking the audience's memory arc).
// Wave 154 additions: clustered payoffs (too many resolved in one scene),
// payoff before climax (all loops closed too early, deflating the ending), and
// setup imbalance (clue plants concentrated in one act with no early seeding).

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';

export async function payoffPass(input: PassInput): Promise<PassResult> {
  const { fountain, records, structure, approvedSpans } = input;
  const issues: RevisionIssue[] = [];

  // ── Collect all clue plant/payoff timeline ────────────────────────────────
  // Use seededClueIds / payoffSetupIds (per-scene fields) for accurate timing.
  // unresolvedClues is a global-filtered view; it can't reliably detect WHEN a payoff occurs.
  const clueInfo: Map<string, { plantedAt: number; slug: string }> = new Map();
  const payoffInfo: Map<string, number> = new Map();

  for (const r of records) {
    for (const clueId of (r.seededClueIds ?? r.unresolvedClues)) {
      if (!clueInfo.has(clueId)) {
        clueInfo.set(clueId, { plantedAt: r.sceneIdx, slug: r.slug });
      }
    }
    for (const setupId of (r.payoffSetupIds ?? [])) {
      if (!payoffInfo.has(setupId)) {
        payoffInfo.set(setupId, r.sceneIdx);
      }
    }
  }

  // ── Orphan clues (never paid off) ────────────────────────────────────────
  for (const [clueId, info] of clueInfo) {
    if (!payoffInfo.has(clueId) && (structure.actPosition === 'act3' || structure.completionPercent >= 70)) {
      issues.push({
        location: `Scene ${info.plantedAt} (${info.slug})`,
        rule: 'ORPHAN_CLUE',
        description: `Clue "${clueId}" was planted in Scene ${info.plantedAt} but never paid off — a broken promise to the audience`,
        severity: 'critical',
        suggestedFix: `Add a scene in Act 3 that reveals the significance of "${clueId}" and closes the loop`,
      });
    }
  }

  // ── Clue paid off too quickly (same scene or very next scene) ───────────
  for (const [clueId, payoffScene] of payoffInfo) {
    const info = clueInfo.get(clueId);
    if (info) {
      const gap = payoffScene - info.plantedAt;
      if (gap === 0) {
        issues.push({
          location: `Scene ${payoffScene}`,
          rule: 'PAYOFF_TOO_QUICK',
          description: `Clue "${clueId}" is planted and paid off in the same scene — the audience has no time to form a question`,
          severity: 'major',
          suggestedFix: `Move the payoff of "${clueId}" at least 3 scenes later to create a proper anticipation arc`,
        });
      } else if (gap === 1) {
        issues.push({
          location: `Scene ${payoffScene}`,
          rule: 'PAYOFF_TOO_QUICK',
          description: `Clue "${clueId}" is planted and paid off in consecutive scenes — no suspense window for the audience`,
          severity: 'minor',
          suggestedFix: `Move the payoff of "${clueId}" at least 2-3 scenes later to build anticipation`,
        });
      }
    }
  }

  // ── Dangling payoffs (PAYOFF_SETUP with no matching clue ever seeded) ────
  for (const [setupId, payoffScene] of payoffInfo) {
    if (!clueInfo.has(setupId)) {
      issues.push({
        location: `Scene ${payoffScene}`,
        rule: 'DANGLING_PAYOFF',
        description: `A payoff for "${setupId}" arrives in Scene ${payoffScene} but no matching setup was ever seeded — the audience will feel disoriented`,
        severity: 'major',
        suggestedFix: `Add a SEED_CLUE for "${setupId}" earlier in the story, or remove the payoff if it references something never established`,
      });
    }
  }

  // ── Open clue count in structure ─────────────────────────────────────────
  if (structure.openClues > 0 && structure.actPosition === 'epilogue') {
    issues.push({
      location: 'Final scenes',
      rule: 'OPEN_CLUES_AT_END',
      description: `${structure.openClues} unresolved clue(s) remain at story end — loose threads weaken the ending`,
      severity: 'major',
      suggestedFix: 'Resolve all planted clues before the final scene, or consciously mark them as thematic open questions',
    });
  }

  // ── No clues planted at all (no setup/payoff engine) ─────────────────────
  if (clueInfo.size === 0 && records.length >= 5) {
    issues.push({
      location: 'Setup/payoff layer',
      rule: 'NO_SETUPS',
      description: 'No clues or setups are planted in the story — the screenplay has no setup/payoff architecture',
      severity: 'major',
      suggestedFix: 'Plant at least one object, phrase, or secret in Act 1 that pays off in Act 3',
    });
  }

  // ── Setup without consequence (Wave 140) ──────────────────────────────────
  // Clues that appear multiple times (2+) but never cause narrative consequence:
  // no relationship shifts, no emotional peaks, no high suspense delta.
  // These are red herrings that aren't actually red herrings — they're just noise.
  const clueAppearances: Map<string, number[]> = new Map();
  for (const r of records) {
    for (const clueId of (r.seededClueIds ?? r.unresolvedClues)) {
      if (!clueAppearances.has(clueId)) {
        clueAppearances.set(clueId, []);
      }
      clueAppearances.get(clueId)!.push(r.sceneIdx);
    }
  }

  for (const [clueId, appearanceScenes] of clueAppearances) {
    // Only flag if clue appears 2+ times
    if (appearanceScenes.length >= 2) {
      // Check if any appearance scene has narrative consequence
      const hasConsequence = appearanceScenes.some(sceneIdx => {
        const r = records[sceneIdx];
        if (!r) return false;
        // Consequence = relationship shift, high suspense delta, or emotional peak
        const hasRelationshipShift = (r.relationshipShifts ?? []).length > 0;
        const hasEmotionalPeak = r.emotionalShift !== 'neutral' && r.suspenseDelta > 1.5;
        const isClimaticScene = r.purpose === 'climax' || r.suspenseDelta > 2;
        return hasRelationshipShift || hasEmotionalPeak || isClimaticScene;
      });

      if (!hasConsequence) {
        const clueInfo_obj = clueInfo.get(clueId);
        const plantLocation = clueInfo_obj ? `Scene ${clueInfo_obj.plantedAt}` : 'Act 1';
        issues.push({
          location: `Clue appearances: Scenes ${appearanceScenes.join(', ')}`,
          rule: 'SETUP_WITHOUT_CONSEQUENCE',
          description: `Clue "${clueId}" appears ${appearanceScenes.length} times (planted at ${plantLocation}) but never drives a character decision or relationship shift — it's narrative noise, not meaningful setup`,
          severity: 'major',
          suggestedFix: `Either remove recurring mentions of "${clueId}" or add a scene where it causes a character to act or react with emotional stakes`,
        });
      }
    }
  }

  // ── Consequence-delayed payoff (Wave 140) ────────────────────────────────
  // Payoff occurs too far after setup (>6 scenes), breaking the audience's
  // memory arc and reducing the dramatic impact of the payoff.
  for (const [clueId, payoffScene] of payoffInfo) {
    const info = clueInfo.get(clueId);
    if (info) {
      const gap = payoffScene - info.plantedAt;
      // 6+ scene gap means audience likely forgot the setup
      if (gap >= 6 && structure.completionPercent >= 70) {
        issues.push({
          location: `Clue payoff at Scene ${payoffScene}`,
          rule: 'PAYOFF_MEMORY_GAP',
          description: `Clue "${clueId}" planted in Scene ${info.plantedAt} is paid off ${gap} scenes later in Scene ${payoffScene} — the audience has likely forgotten the setup by the time the payoff arrives`,
          severity: 'minor',
          suggestedFix: `Add a callback or reminder of "${clueId}" 1-2 scenes before its payoff to rebuild audience memory`,
        });
      }
    }
  }

  // ── Wave 154: Clustered payoffs, premature resolution, setup imbalance ───────

  // CLUSTERED_PAYOFFS: 3+ distinct setups all paid off in a single scene. When
  // too many loops close at once, the audience can't register each resolution —
  // the payoffs blur together and individual impact is lost.
  if (payoffInfo.size >= 3) {
    const payoffsByScene = new Map<number, string[]>();
    for (const [setupId, payoffScene] of payoffInfo) {
      if (!payoffsByScene.has(payoffScene)) payoffsByScene.set(payoffScene, []);
      payoffsByScene.get(payoffScene)!.push(setupId);
    }
    for (const [scene, setupIds] of payoffsByScene) {
      if (setupIds.length >= 3) {
        issues.push({
          location: `Scene ${scene}`,
          rule: 'CLUSTERED_PAYOFFS',
          description: `${setupIds.length} separate setups (${setupIds.slice(0, 3).join(', ')}${setupIds.length > 3 ? '…' : ''}) all pay off in Scene ${scene} — resolutions blur together and lose individual impact`,
          severity: 'minor',
          suggestedFix: 'Distribute payoffs across multiple scenes so each resolution lands distinctly. A cascade of simultaneous reveals reads as contrived convenience',
        });
        break; // one flag per pass
      }
    }
  }

  // PAYOFF_BEFORE_CLIMAX: Every planted clue is resolved before the final 20% of
  // the story. When all loops close early, the climax has no open questions left
  // to drive it — the ending becomes a formality rather than a culmination.
  if (clueInfo.size >= 2 && payoffInfo.size >= clueInfo.size && records.length >= 8) {
    const climaxZoneStart = Math.floor(records.length * 0.8);
    const allResolvedEarly = [...payoffInfo.values()].every(scene => scene < climaxZoneStart);
    // Only fire if every clue was actually paid off and they all landed before the climax zone
    const allCluesResolved = [...clueInfo.keys()].every(id => payoffInfo.has(id));
    if (allResolvedEarly && allCluesResolved && (structure.actPosition === 'act3' || structure.completionPercent >= 70)) {
      const lastPayoff = Math.max(...payoffInfo.values());
      issues.push({
        location: `Last payoff at Scene ${lastPayoff} (climax zone starts Scene ${climaxZoneStart})`,
        rule: 'PAYOFF_BEFORE_CLIMAX',
        description: `All ${clueInfo.size} setups are resolved by Scene ${lastPayoff}, before the climax zone (Scene ${climaxZoneStart}+) — the climax has no unanswered questions left to drive it`,
        severity: 'major',
        suggestedFix: 'Hold at least one significant payoff for the climax itself. The biggest reveal or resolution should coincide with the story\'s peak, not precede it',
      });
    }
  }

  // SETUP_FRONT_GAP: Clues are planted but none appear in the first 25% of the
  // story. Late-seeded setups can't build the long-arc anticipation that makes
  // payoffs satisfying — the best setups are planted before the audience knows
  // they matter.
  if (clueInfo.size >= 2 && records.length >= 8) {
    const act1End = Math.floor(records.length * 0.25);
    const earliestPlant = Math.min(...[...clueInfo.values()].map(c => c.plantedAt));
    if (earliestPlant >= act1End) {
      issues.push({
        location: `Earliest clue planted at Scene ${earliestPlant} (Act 1 ends ~Scene ${act1End})`,
        rule: 'SETUP_FRONT_GAP',
        description: `No clues are planted in Act 1 (first ${act1End} scenes) — the earliest setup appears at Scene ${earliestPlant}. Late seeding can't build the long-arc anticipation that makes payoffs feel earned`,
        severity: 'minor',
        suggestedFix: 'Plant at least one clue in Act 1, ideally disguised as an incidental detail, so its later payoff rewards the attentive viewer',
      });
    }
  }

  const { revised, usedLLM } = await rewritePass({ fountain, issues, passName: 'payoff', approvedSpans, storyContext: input.storyContext, priorPassResults: input.priorPassResults });
  const changed = revised !== fountain;

  return {
    pass: 'payoff',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? 'Payoff/continuity pass: all setups are resolved'
      : `Payoff/continuity pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}
