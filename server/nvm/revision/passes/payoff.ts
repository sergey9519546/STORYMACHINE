// Wave 39 — Pass 11: Payoff/Continuity
// Checks planted clue/setup payoffs: orphan clues, setups paid off too quickly,
// payoffs that arrive before their setups.
// Wave 140 additions: setup without consequence (clues planted multiple times
// but never affecting plot/character decisions) and consequence-delayed payoff
// (payoff occurs too long after setup, breaking the audience's memory arc).
// Wave 154 additions: clustered payoffs (too many resolved in one scene),
// payoff before climax (all loops closed too early, deflating the ending), and
// setup imbalance (clue plants concentrated in one act with no early seeding).
// Wave 261 additions: payoff precedes setup (causal inversion), payoff gap excessive
// (forgotten long fuse), and payoff front-loaded (resolutions cashed out too early).
// Wave 275 additions: Act 2a payoff void (early conflict zone never closes any loops),
// late-majority clue seeding (>60% of clues planted in second half), and
// setup/payoff act skew (planting and harvesting engines operate in separate acts).
// Wave 289 additions: payoff-revelation disconnect (payoffs fire without revelations nearby),
// clue density front-collapse (all clues in first 20%), payoff suspense mismatch
// (payoff scenes have avg suspenseDelta ≤ 0 despite 3+ payoffs).
// Wave 303 additions: clue replant (same clue ID seeded in 2+ scenes), payoff double
// fire (same setup ID resolved in 2+ scenes), thread convergence absent (4+ payoffs
// all resolving in isolation — threads never braid).
// Wave 317 additions: payoff emotion decoupled (all payoff scenes emotionally neutral),
// unresolved clue ratio high (≥40% of seeded clues still open in final scene), payoff
// curiosity mismatch (payoff scenes avg curiosityDelta ≤ 0 despite 3+ payoffs).

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

  // ── Wave 167: Payoff-before-setup, setup clustering, payoff rate decline ─────

  // PAYOFF_BEFORE_SETUP: A clue payoff occurs in an earlier scene than where the
  // clue was seeded. The audience receives the answer before the question is posed.
  for (const [clueId, payoffScene] of payoffInfo) {
    const info = clueInfo.get(clueId);
    if (info && payoffScene < info.plantedAt) {
      issues.push({
        location: `Scene ${payoffScene} (payoff) / Scene ${info.plantedAt} (setup)`,
        rule: 'PAYOFF_BEFORE_SETUP',
        description: `Clue "${clueId}" is paid off at Scene ${payoffScene} but not seeded until Scene ${info.plantedAt} — the audience receives the answer before the question is asked`,
        severity: 'critical',
        suggestedFix: `Move the seed for "${clueId}" to a scene before Scene ${payoffScene}, or move its payoff to after Scene ${info.plantedAt}`,
      });
    }
  }

  // SETUP_CLUSTERING: 70%+ of all planted clues are concentrated in a single act
  // zone (each 25% segment). Good setup/payoff architecture seeds mysteries
  // throughout the story, not in one burst that leaves other acts informationally thin.
  if (clueInfo.size >= 4 && records.length >= 8) {
    const zoneCounts = [0, 0, 0, 0]; // act1 / act2a / act2b / act3
    for (const info of clueInfo.values()) {
      const pct = info.plantedAt / records.length;
      const zone = pct < 0.25 ? 0 : pct < 0.5 ? 1 : pct < 0.75 ? 2 : 3;
      zoneCounts[zone]++;
    }
    const maxCount = Math.max(...zoneCounts);
    if (maxCount / clueInfo.size > 0.7) {
      const zoneNames = ['Act 1', 'early Act 2', 'late Act 2', 'Act 3'];
      const zoneIdx = zoneCounts.indexOf(maxCount);
      issues.push({
        location: `${zoneNames[zoneIdx]} (${Math.round(zoneIdx * 25)}%–${Math.round((zoneIdx + 1) * 25)}%)`,
        rule: 'SETUP_CLUSTERING',
        description: `${maxCount} of ${clueInfo.size} clues (${Math.round(maxCount / clueInfo.size * 100)}%) are planted in ${zoneNames[zoneIdx]} — setup is concentrated rather than distributed. The audience receives all the questions in one burst.`,
        severity: 'minor',
        suggestedFix: 'Spread clue planting across all acts. Early setups build long-arc suspense; mid-story setups raise stakes; late setups create urgency before the climax.',
      });
    }
  }

  // PAYOFF_RATE_DECLINE: Act 2 delivers 2+ payoffs but Act 3 delivers none — dramatic
  // resolutions cluster in the middle act, leaving the climax and finale informationally
  // empty. The story's biggest emotional moments should resolve its planted threads.
  if (records.length >= 8 && payoffInfo.size >= 2) {
    const act2Start = Math.floor(records.length * 0.25);
    const act3Start = Math.floor(records.length * 0.75);
    const act2Payoffs = [...payoffInfo.values()].filter(s => s >= act2Start && s < act3Start).length;
    const act3Payoffs = [...payoffInfo.values()].filter(s => s >= act3Start).length;
    const act3Scenes = records.length - act3Start;
    if (act2Payoffs >= 2 && act3Payoffs === 0 && act3Scenes >= 2) {
      issues.push({
        location: `Act 3 (Scenes ${act3Start}–${records.length - 1})`,
        rule: 'PAYOFF_RATE_DECLINE',
        description: `Act 2 delivers ${act2Payoffs} payoffs but Act 3 delivers none — dramatic resolutions cluster in the middle act, leaving the finale without any story-thread closure`,
        severity: 'major',
        suggestedFix: 'Move at least one significant payoff into Act 3. The story\'s biggest reveal should coincide with its climax, not precede it by an entire act',
      });
    }
  }

  // ── Wave 181: Flat payoffs, clue glut, scrambled setup/payoff order ──────────

  // FLAT_PAYOFF: Two or more payoff scenes land with no emotional weight —
  // neutral emotion, low suspense, no relationship shift. A loop closing should
  // carry a charge (relief, dread, vindication); a payoff that resolves
  // mechanically squanders the anticipation the setup built. Distinct from
  // SETUP_WITHOUT_CONSEQUENCE (which judges the clue's plant scenes).
  {
    const flatPayoffs: string[] = [];
    for (const [setupId, payoffScene] of payoffInfo) {
      const r = records[payoffScene];
      if (!r) continue;
      const isFlat =
        r.emotionalShift === 'neutral' &&
        r.suspenseDelta < 1.5 &&
        (r.relationshipShifts?.length ?? 0) === 0;
      if (isFlat) flatPayoffs.push(setupId);
    }
    if (flatPayoffs.length >= 2) {
      issues.push({
        location: `Payoffs: ${flatPayoffs.slice(0, 3).join(', ')}${flatPayoffs.length > 3 ? '…' : ''}`,
        rule: 'FLAT_PAYOFF',
        description: `${flatPayoffs.length} payoffs resolve with no emotional weight — neutral emotion, low suspense, no relationship shift. The loops close mechanically, squandering the anticipation their setups built.`,
        severity: 'major',
        suggestedFix: 'Stage each payoff for impact: the moment a planted thread resolves should land a charge — relief, dread, vindication, or cost. If a resolution carries no feeling, the setup wasn\'t worth planting.',
      });
    }
  }

  // CLUE_GLUT: At some point the audience is tracking five or more open clues at
  // once (planted but not yet paid off). Too many simultaneous unresolved threads
  // overload working memory — the viewer stops tracking and the mysteries blur.
  if (clueInfo.size >= 5) {
    let maxOpen = 0;
    let glutScene = -1;
    for (let s = 0; s < records.length; s++) {
      let planted = 0;
      let paid = 0;
      for (const [id, info] of clueInfo) {
        if (info.plantedAt <= s) planted++;
        const ps = payoffInfo.get(id);
        if (ps !== undefined && ps <= s) paid++;
      }
      const open = planted - paid;
      if (open > maxOpen) { maxOpen = open; glutScene = s; }
    }
    if (maxOpen >= 5) {
      issues.push({
        location: `Around Scene ${glutScene}`,
        rule: 'CLUE_GLUT',
        description: `By Scene ${glutScene} the audience is tracking ${maxOpen} open clues at once — too many simultaneous unresolved threads overload working memory, and the mysteries start to blur together.`,
        severity: 'minor',
        suggestedFix: 'Resolve or consolidate some threads before opening new ones. Pay off an early clue to free up the audience\'s attention before planting the next, so each mystery has room to register.',
      });
    }
  }

  // SETUP_PAYOFF_ORDER_SCRAMBLED: Across 3+ resolved clue→payoff pairs, the
  // order of payoffs largely reverses the order of setups — what's planted first
  // pays off last and vice versa. A heavily scrambled order is hard to track;
  // audiences follow nested or sequential setups, not a fully inverted stack.
  {
    const pairs: Array<{ plant: number; payoff: number }> = [];
    for (const [id, info] of clueInfo) {
      const ps = payoffInfo.get(id);
      if (ps !== undefined && ps >= info.plantedAt) pairs.push({ plant: info.plantedAt, payoff: ps });
    }
    if (pairs.length >= 3) {
      pairs.sort((a, b) => a.plant - b.plant);
      let inversions = 0;
      let total = 0;
      for (let i = 0; i < pairs.length; i++) {
        for (let j = i + 1; j < pairs.length; j++) {
          total++;
          if (pairs[j].payoff < pairs[i].payoff) inversions++;
        }
      }
      if (total > 0 && inversions / total > 0.5) {
        issues.push({
          location: 'Setup/payoff ordering',
          rule: 'SETUP_PAYOFF_ORDER_SCRAMBLED',
          description: `Across ${pairs.length} resolved threads, ${Math.round(inversions / total * 100)}% of setup/payoff pairs are inverted — what's planted earliest pays off latest and vice versa. The order is scrambled enough that the audience can't track which answer belongs to which question.`,
          severity: 'minor',
          suggestedFix: 'Resolve threads in an order the audience can follow — sequential (first in, first out) or cleanly nested (last in, first out). A fully inverted payoff stack reads as chaos rather than craft.',
        });
      }
    }
  }

  // ── Wave 206: Setup burst, mid-story payoff void, clue drought ──────────────

  // SETUP_BURST: A single scene plants 4+ distinct clues at once. The mirror of
  // CLUSTERED_PAYOFFS on the setup side — too many questions raised in one beat
  // overloads the audience and reads as a clumsy info-dump rather than organic
  // seeding. Good setup distributes its questions so each one registers.
  {
    for (const r of records) {
      const seeded206 = new Set((r.seededClueIds ?? r.unresolvedClues) ?? []);
      if (seeded206.size >= 4) {
        issues.push({
          location: `Scene ${r.sceneIdx} (${r.slug})`,
          rule: 'SETUP_BURST',
          severity: 'minor',
          description: `Scene ${r.sceneIdx} plants ${seeded206.size} distinct clues at once — too many questions raised in a single beat overloads the audience and reads as an info-dump rather than organic seeding.`,
          suggestedFix: 'Distribute the setups across several scenes so each planted question has room to register. A scene that seeds four mysteries simultaneously teaches the audience to stop tracking any of them.',
        });
        break; // one flag per pass
      }
    }
  }

  // MIDSTORY_PAYOFF_VOID: Payoffs land in both Act 1 (first 25%) and Act 3 (final
  // 25%) but none in the entire middle 50% — a "barbell" resolution distribution.
  // The middle act delivers no thread closure, so the long conflict zone feels
  // like dead air between the opening hook and the finale. Distinct from
  // PAYOFF_RATE_DECLINE (Act 2 has payoffs, Act 3 none). Requires 8+ scenes, 2+ payoffs.
  if (records.length >= 8 && payoffInfo.size >= 2) {
    const midStart206 = Math.floor(records.length * 0.25);
    const midEnd206 = Math.floor(records.length * 0.75);
    const payoffScenes206 = [...payoffInfo.values()];
    const inAct1_206 = payoffScenes206.some(s => s < midStart206);
    const inAct3_206 = payoffScenes206.some(s => s >= midEnd206);
    const inMiddle206 = payoffScenes206.some(s => s >= midStart206 && s < midEnd206);
    if (inAct1_206 && inAct3_206 && !inMiddle206) {
      issues.push({
        location: `Middle (Scenes ${midStart206}–${midEnd206 - 1})`,
        rule: 'MIDSTORY_PAYOFF_VOID',
        severity: 'minor',
        description: `Payoffs land in Act 1 and Act 3 but none in the entire middle 50% (Scenes ${midStart206}–${midEnd206 - 1}) — the conflict zone delivers no thread closure, leaving a long stretch of dead air between the opening hook and the finale.`,
        suggestedFix: 'Resolve at least one planted thread in the middle act. A mid-story payoff rewards the audience\'s patience, raises new questions, and keeps the long second act from feeling like stalling.',
      });
    }
  }

  // CLUE_DROUGHT: The longest interior gap between consecutive setup/payoff events
  // spans 5+ scenes (4+ scenes with no plant and no payoff between two events).
  // The setup/payoff engine goes idle for a long stretch in the middle of an
  // otherwise active mystery architecture — momentum stalls between the events
  // that bracket the gap. Requires 8+ scenes and 3+ total clue events.
  if (records.length >= 8) {
    const eventScenes206 = new Set<number>();
    for (const info of clueInfo.values()) eventScenes206.add(info.plantedAt);
    for (const s of payoffInfo.values()) eventScenes206.add(s);
    const sorted206 = [...eventScenes206].sort((a, b) => a - b);
    if (sorted206.length >= 3) {
      let maxGap206 = 0;
      let gapStart206 = -1;
      let gapEnd206 = -1;
      for (let i = 1; i < sorted206.length; i++) {
        const gap206 = sorted206[i] - sorted206[i - 1];
        if (gap206 > maxGap206) {
          maxGap206 = gap206;
          gapStart206 = sorted206[i - 1];
          gapEnd206 = sorted206[i];
        }
      }
      if (maxGap206 >= 5) {
        issues.push({
          location: `Scenes ${gapStart206}–${gapEnd206}`,
          rule: 'CLUE_DROUGHT',
          severity: 'minor',
          description: `The setup/payoff engine goes idle for ${maxGap206 - 1} consecutive scenes (between Scene ${gapStart206} and Scene ${gapEnd206}) — no clue is planted and no thread resolves across the longest interior gap. The mystery architecture stalls in the middle of an otherwise active story.`,
          suggestedFix: 'Seed a small clue or resolve a minor thread within the dead stretch. A drip of setup/payoff activity keeps the mystery engine warm so the audience stays engaged between major beats.',
        });
      }
    }
  }

  // ── Wave 219: Tension-debt physics — concurrent open threads, end-loaded resolution,
  //    anticipation-window trend. These model the setup/payoff ledger as a running debt
  //    curve rather than as isolated plant/pay events. ──

  // CONCURRENT_THREAD_OVERLOAD (major): the running count of simultaneously-open threads
  // (planted but not yet paid off) peaks above 5. Distinct from CLUE_GLUT (cumulative
  // total): a story can plant many clues safely if it closes them as it goes, but holding
  // 6+ unresolved questions open AT ONCE overloads the audience's working memory — they
  // lose track of which thread is which, and each individual payoff loses its charge.
  if (clueInfo.size >= 6 && records.length >= 8) {
    let open219 = 0, peak219 = 0, peakScene219 = 0;
    for (let s = 0; s < records.length; s++) {
      for (const info of clueInfo.values()) if (info.plantedAt === s) open219++;
      for (const ps of payoffInfo.values()) if (ps === s) open219--;
      if (open219 > peak219) { peak219 = open219; peakScene219 = s; }
    }
    if (peak219 > 5) {
      issues.push({
        location: `Scene ${peakScene219} (peak open threads)`,
        rule: 'CONCURRENT_THREAD_OVERLOAD',
        severity: 'major',
        description: `At Scene ${peakScene219} the story holds ${peak219} planted-but-unresolved threads open simultaneously — the audience is asked to track ${peak219} live questions at once. Beyond roughly five concurrent threads, individual mysteries blur together and each eventual payoff loses its charge.`,
        suggestedFix: 'Close some threads before opening new ones: pay off or fold together a few of the early clues so the concurrent open-thread count stays manageable. Suspense comes from a few sharp questions held in focus, not from a dozen blurred ones.',
      });
    }
  }

  // RESOLUTION_CRAMMED_AT_END (major): 60%+ of all payoffs land in the final 15% of the
  // story. Distinct from CLUSTERED_PAYOFFS (3+ in a single scene) and PAYOFF_RATE_DECLINE
  // (Act 3 has zero): this catches resolution that is technically distributed across the
  // last few scenes but still crammed into the ending — a story that defers nearly all its
  // bookkeeping to a closing info-dump rather than pacing reveals across the arc.
  if (payoffInfo.size >= 4 && records.length >= 8) {
    const endZoneStart219 = Math.floor(records.length * 0.85);
    const latePayoffs219 = [...payoffInfo.values()].filter(s => s >= endZoneStart219).length;
    const lateShare219 = latePayoffs219 / payoffInfo.size;
    if (lateShare219 >= 0.6) {
      issues.push({
        location: `Final 15% (Scenes ${endZoneStart219}–${records.length - 1})`,
        rule: 'RESOLUTION_CRAMMED_AT_END',
        severity: 'major',
        description: `${latePayoffs219} of ${payoffInfo.size} payoffs (${Math.round(lateShare219 * 100)}%) land in the final 15% of the story — resolution is crammed into the ending rather than paced across the arc. A closing run of back-to-back reveals reads as an info-dump and denies most payoffs the scene-space to land.`,
        suggestedFix: 'Pull several payoffs earlier so reveals are distributed: let mid-story scenes close some loops while the ending reserves only the one or two largest. A satisfying climax resolves the central thread, not the entire backlog at once.',
      });
    }
  }

  // ANTICIPATION_WINDOW_DECAY (minor): setup→payoff gaps shrink across the story — the
  // later-planted clues are paid off on far shorter fuses than the earlier ones. The story
  // gives its opening setups long, satisfying anticipation arcs but resolves its late
  // setups almost reflexively, so the back half never plants anything with room to breathe.
  {
    const resolved219 = [...clueInfo.entries()]
      .filter(([id]) => payoffInfo.has(id))
      .map(([id, info]) => ({ plant: info.plantedAt, gap: (payoffInfo.get(id) ?? info.plantedAt) - info.plantedAt }))
      .filter(x => x.gap > 0)
      .sort((a, b) => a.plant - b.plant);
    if (resolved219.length >= 4) {
      const half219 = Math.floor(resolved219.length / 2);
      const earlyHalf219 = resolved219.slice(0, half219);
      const lateHalf219 = resolved219.slice(resolved219.length - half219);
      const avgGap219 = (arr: Array<{ gap: number }>) => arr.reduce((s, x) => s + x.gap, 0) / arr.length;
      const earlyAvg219 = avgGap219(earlyHalf219);
      const lateAvg219 = avgGap219(lateHalf219);
      if (earlyAvg219 > 0 && lateAvg219 < 0.5 * earlyAvg219) {
        issues.push({
          location: 'Anticipation-window trend',
          rule: 'ANTICIPATION_WINDOW_DECAY',
          severity: 'minor',
          description: `Setup→payoff gaps shrink across the story: early clues wait ${earlyAvg219.toFixed(1)} scenes for their payoff, late clues only ${lateAvg219.toFixed(1)}. The back half resolves its setups almost reflexively, so nothing planted late gets the long fuse that makes a payoff feel earned.`,
          suggestedFix: 'Give late setups room to breathe too: plant at least one back-half clue several scenes before it pays off, rather than seeding and resolving in quick succession. A late long-fuse setup keeps the anticipation engine running into the climax.',
        });
      }
    }
  }

  // ── Wave 233: Payoff orphan rate, post-climax cluster, gap uniformity ────────

  // PAYOFF_ORPHAN_RATE (minor, clues≥4): More than 50% of planted clues are
  // never paid off — the setup engine leaks. The audience is asked to hold
  // mysteries that the story never resolves. Distinct from ORPHAN_CLUE (flags
  // each individual orphan) — this fires when the RATE of abandonment is high,
  // indicating a systemic failure of the payoff architecture.
  if (clueInfo.size >= 4) {
    const orphanCount233 = [...clueInfo.keys()].filter(id => !payoffInfo.has(id)).length;
    const orphanRate233 = orphanCount233 / clueInfo.size;
    if (orphanRate233 > 0.5) {
      issues.push({
        location: 'Setup/payoff ledger',
        rule: 'PAYOFF_ORPHAN_RATE',
        severity: 'minor',
        description: `${orphanCount233} of ${clueInfo.size} planted clues (${Math.round(orphanRate233 * 100)}%) are never paid off — the majority of the story's setup investments go unrewarded. A high orphan rate depletes the audience's trust in the setup engine.`,
        suggestedFix: 'Either pay off the orphaned clues, or fold them into a shared payoff scene that resolves multiple threads at once. The audience remembers what the story promised — they need resolution, not abandonment.',
      });
    }
  }

  // PAYOFF_POST_CLIMAX_CLUSTER (minor, payoffs≥3, n≥8): 2+ payoffs land after
  // the climax zone (final 20% of the story). Payoffs in the falling action arrive
  // after dramatic energy has already dissipated — they feel like afterthoughts
  // rather than earned revelations. Distinct from RESOLUTION_CRAMMED_AT_END (which
  // checks the final 15% for >60% of all payoffs) — this fires on any 2+ late
  // post-climax payoffs regardless of total proportion.
  if (payoffInfo.size >= 3 && records.length >= 8) {
    const postClimaxStart233 = Math.floor(records.length * 0.8);
    const postPayoffs233 = [...payoffInfo.values()].filter(s => s >= postClimaxStart233).length;
    if (postPayoffs233 >= 2) {
      issues.push({
        location: `Final 20% (Scenes ${postClimaxStart233}–${records.length - 1})`,
        rule: 'PAYOFF_POST_CLIMAX_CLUSTER',
        severity: 'minor',
        description: `${postPayoffs233} payoffs land after Scene ${postClimaxStart233} (post-climax zone) — reveals that arrive in the falling action feel like afterthoughts. The dramatic energy is already spent when these payoffs land.`,
        suggestedFix: 'Move late payoffs earlier — into the climax or its approach. Resolution in the falling action delays satisfaction without building tension; the audience needs rewards to land while they still care.',
      });
    }
  }

  // SETUP_PAYOFF_GAP_UNIFORMITY (minor, ≥4 resolved setups): All resolved
  // setup→payoff gaps are within 1 scene of each other. Every clue has the
  // same fuse — the story resolves its mysteries on a metronomic schedule.
  // The audience can predict exactly when the next reveal arrives. Some clues
  // should have short fuses (quick gratification) and others long fuses
  // (sustained anticipation). Uniform gaps make every reveal feel scheduled.
  {
    const resolvedGaps233 = [...clueInfo.entries()]
      .filter(([id]) => payoffInfo.has(id))
      .map(([id, info]) => (payoffInfo.get(id) ?? info.plantedAt) - info.plantedAt)
      .filter(g => g > 0);
    if (resolvedGaps233.length >= 4) {
      const minGap233 = Math.min(...resolvedGaps233);
      const maxGap233 = Math.max(...resolvedGaps233);
      const avgGap233 = resolvedGaps233.reduce((a, b) => a + b, 0) / resolvedGaps233.length;
      if (maxGap233 - minGap233 <= 1 && avgGap233 <= 4) {
        issues.push({
          location: 'Setup/payoff timing',
          rule: 'SETUP_PAYOFF_GAP_UNIFORMITY',
          severity: 'minor',
          description: `All ${resolvedGaps233.length} resolved setups have gap lengths within 1 scene of each other (range: ${minGap233}–${maxGap233} scenes, avg ${avgGap233.toFixed(1)}) — every clue has the same fuse. The audience can predict exactly when the next reveal arrives.`,
          suggestedFix: 'Vary the fuse lengths: give some clues a 1–2 scene payoff (quick gratification) and others a 5+ scene arc (sustained anticipation). Variety in gap length makes each payoff feel perfectly timed rather than metronomic.',
        });
      }
    }
  }
  // ── Wave 247: Setup Act 3 surge, payoff single-scene dump, setup desert Act 2b ──

  // SETUP_ACT3_SURGE (minor, clues≥3, n≥8): 40%+ of all planted clues are
  // seeded in Act 3 (last 25%). New clues planted in the climax act create
  // obligations the story can never fulfill — seeds without growing room.
  // A clue planted in Act 3 can pay off at most 1-2 scenes later; the audience
  // has no time to carry it. Distinct from LATE_CLUE_PLANTING (which fires on
  // individual clues planted late) — this fires when the PROPORTION of late
  // planting is high, indicating a systemic Act 3 exposition habit.
  if (clueInfo.size >= 3 && records.length >= 8) {
    const act3Start247 = Math.floor(records.length * 0.75);
    const act3Clues247 = [...clueInfo.values()].filter(c => c.plantedAt >= act3Start247).length;
    if (act3Clues247 / clueInfo.size >= 0.4) {
      issues.push({
        location: `Act 3 setup layer (Scenes ${act3Start247}–${records.length - 1})`,
        rule: 'SETUP_ACT3_SURGE',
        severity: 'minor',
        description: `${act3Clues247} of ${clueInfo.size} planted clues (${Math.round(act3Clues247 / clueInfo.size * 100)}%) are seeded in Act 3 — the story is planting new obligations in its climax act. Clues seeded after the 75% mark have no growing room; the audience barely has time to register them before the resolution arrives.`,
        suggestedFix: 'Move Act 3 clue plants into Act 1 or Act 2, where they have time to settle into the audience\'s memory before the payoff arrives. A well-timed clue is planted early enough to be almost forgotten — and then remembered at exactly the right moment.',
      });
    }
  }

  // PAYOFF_SINGLE_SCENE_DUMP (minor, payoffs≥4): More than 50% of all payoffs
  // land in a single scene — the story fires all its setups simultaneously.
  // One revelation per scene creates organic discovery; a simultaneous dump
  // overwhelms the audience. Each payoff dilutes all the others when they
  // arrive together; distributed revelations let each one land with full weight.
  if (payoffInfo.size >= 4) {
    const payoffByScene247 = new Map<number, number>();
    for (const sceneIdx247 of payoffInfo.values()) {
      payoffByScene247.set(sceneIdx247, (payoffByScene247.get(sceneIdx247) ?? 0) + 1);
    }
    const [maxScene247, maxCount247] = [...payoffByScene247.entries()].sort((a, b) => b[1] - a[1])[0];
    if (maxCount247 / payoffInfo.size > 0.5) {
      issues.push({
        location: `Scene ${maxScene247} (payoff dump)`,
        rule: 'PAYOFF_SINGLE_SCENE_DUMP',
        severity: 'minor',
        description: `${maxCount247} of ${payoffInfo.size} payoffs (${Math.round(maxCount247 / payoffInfo.size * 100)}%) land in a single scene (Scene ${maxScene247}) — the story fires all its setups simultaneously. Each reveal dilutes the others when they arrive together; none can land with full weight.`,
        suggestedFix: 'Distribute payoffs across 3-4 separate scenes. Give each revelation room to breathe: a scene to absorb it, a character reaction, a shift in what the audience now knows. A payoff dump feels like a delivery, not a discovery.',
      });
    }
  }

  // SETUP_DESERT_ACT2B (minor, clues≥3, n≥10): No planted clues appear in
  // the second half of Act 2 (50%–75% of the story). The run-up to the climax
  // stops seeding new threads — the story enters Act 3 without fresh lines to
  // pull. Act 2b is where the protagonist should be generating new information
  // and obligations for the climax to resolve. A clue desert here means Act 3
  // has nothing new to harvest.
  if (clueInfo.size >= 3 && records.length >= 10) {
    const act2bStart247 = Math.floor(records.length * 0.5);
    const act2bEnd247 = Math.floor(records.length * 0.75);
    const hasAct2bClue247 = [...clueInfo.values()].some(
      c => c.plantedAt >= act2bStart247 && c.plantedAt < act2bEnd247,
    );
    if (!hasAct2bClue247) {
      issues.push({
        location: `Act 2b (Scenes ${act2bStart247}–${act2bEnd247 - 1}) — setup layer`,
        rule: 'SETUP_DESERT_ACT2B',
        severity: 'minor',
        description: `No clues are planted in the second half of Act 2 (Scenes ${act2bStart247}–${act2bEnd247 - 1}). The run-up to the climax generates no new threads. Act 3 has nothing fresh to resolve — only the setups established earlier, which are already in the audience's fading memory.`,
        suggestedFix: 'Plant at least one clue in Act 2b: a detail planted close enough to the climax to feel urgent, far enough to be surprising when it pays off. The Act 2b setup is the fuel for Act 3\'s discoveries.',
      });
    }
  }
  // ── End Wave 247 ─────────────────────────────────────────────────────────────

  // ── End Wave 233 ─────────────────────────────────────────────────────────────

  // ── Wave 261: Payoff precedes setup, payoff gap excessive, payoff front-loaded ──

  // PAYOFF_PRECEDES_SETUP (major): A setup is paid off in an EARLIER scene than the
  // one where its clue is first planted — the resolution arrives before the audience
  // has been shown the thread. This is a causal/continuity inversion: the answer is
  // delivered before the question is posed. Distinct from DANGLING_PAYOFF (no setup
  // anywhere) and PAYOFF_TOO_QUICK (positive gap of 0–1); this fires on a negative
  // gap, where plant and payoff are out of order.
  {
    let precedesFired261 = false;
    for (const [setupId, payoffScene] of payoffInfo) {
      const info261 = clueInfo.get(setupId);
      if (info261 && payoffScene < info261.plantedAt) {
        issues.push({
          location: `Payoff Scene ${payoffScene} → setup Scene ${info261.plantedAt}`,
          rule: 'PAYOFF_PRECEDES_SETUP',
          severity: 'major',
          description: `The payoff for "${setupId}" lands in Scene ${payoffScene}, but its setup isn't planted until Scene ${info261.plantedAt} — the resolution arrives before the audience is shown the thread. The answer is delivered before the question is posed, inverting cause and effect.`,
          suggestedFix: `Reorder the timeline so "${setupId}" is seeded before it pays off. Either move the setup scene earlier than Scene ${payoffScene}, or move the payoff later than Scene ${info261.plantedAt}. A payoff only lands when the audience has already been holding the question.`,
        });
        precedesFired261 = true;
        break;
      }
    }
    void precedesFired261;
  }

  // PAYOFF_GAP_EXCESSIVE (minor, n≥10): A clue's plant-to-payoff gap spans 60% or
  // more of the entire story — so much time passes that the audience has likely
  // forgotten the setup by the time it pays off. A long fuse builds anticipation
  // only if the clue is occasionally reinforced; an unreinforced clue stretched
  // across most of the runtime simply fades. Distinct from SETUP_PAYOFF_GAP_
  // UNIFORMITY (metronomic gaps) and PAYOFF_TOO_QUICK (gap too small); this fires
  // on a single over-long fuse.
  if (records.length >= 10) {
    const gapThreshold261 = records.length * 0.6;
    for (const [setupId, payoffScene] of payoffInfo) {
      const info261b = clueInfo.get(setupId);
      if (info261b) {
        const gap261 = payoffScene - info261b.plantedAt;
        if (gap261 >= gapThreshold261) {
          issues.push({
            location: `Clue "${setupId}" (Scene ${info261b.plantedAt} → Scene ${payoffScene})`,
            rule: 'PAYOFF_GAP_EXCESSIVE',
            severity: 'minor',
            description: `The clue "${setupId}" is planted in Scene ${info261b.plantedAt} and not paid off until Scene ${payoffScene} — a gap of ${gap261} scenes, spanning ${Math.round(gap261 / records.length * 100)}% of the story. Across that span the audience has likely forgotten the setup, so the payoff lands without the flash of recognition that makes it satisfying.`,
            suggestedFix: `Reinforce "${setupId}" at least once in the middle stretch — a callback, a reminder, a recontextualisation — so the thread stays warm in the audience's memory. A long fuse only works if it visibly keeps burning.`,
          });
          break;
        }
      }
    }
  }

  // PAYOFF_FRONT_LOADED (minor, payoffs≥3, n≥8): More than 60% of all payoffs land
  // in the first half of the story — the resolution engine discharges early and the
  // back half has little left to pay off. The audience's investments are cashed out
  // before the climax, draining the late story of the recognition-and-reward beats
  // that make a finale satisfying. Distinct from PAYOFF_POST_CLIMAX_CLUSTER (its
  // late-skewed inverse) and PAYOFF_SINGLE_SCENE_DUMP (one-scene concentration).
  if (payoffInfo.size >= 3 && records.length >= 8) {
    const midpoint261 = Math.floor(records.length * 0.5);
    const firstHalfPayoffs261 = [...payoffInfo.values()].filter(s => s < midpoint261).length;
    const frontRatio261 = firstHalfPayoffs261 / payoffInfo.size;
    if (frontRatio261 > 0.6) {
      issues.push({
        location: 'Payoff distribution',
        rule: 'PAYOFF_FRONT_LOADED',
        severity: 'minor',
        description: `${firstHalfPayoffs261} of ${payoffInfo.size} payoffs (${Math.round(frontRatio261 * 100)}%) land in the first half of the story — the resolution engine discharges early. The audience's investments are cashed out before the climax, leaving the finale with little to reward and the back half informationally spent.`,
        suggestedFix: 'Reserve at least one or two major payoffs for the climax and its approach. The most satisfying reveals are the ones the audience has waited longest for — hold the biggest threads until the end rather than resolving them in Act 1 and Act 2a.',
      });
    }
  }

  // ── Wave 275: Act 2a payoff void, late-majority clue seeding, setup/payoff act skew ──

  // PAYOFF_ACT2A_VOID (minor, n≥10, payoffs≥3): No payoffs land in Act 2a (25%–50%
  // of the story). The early conflict zone delivers no thread closure — a long stretch
  // of pure escalation without any payoff depletes the audience's patience. At least one
  // resolution mid-first-half resets the tension baseline and proves the setup engine active.
  if (records.length >= 10 && payoffInfo.size >= 3) {
    const act2aStart275 = Math.floor(records.length * 0.25);
    const act2aEnd275 = Math.floor(records.length * 0.5);
    const hasAct2aPayoff275 = [...payoffInfo.values()].some(s => s >= act2aStart275 && s < act2aEnd275);
    if (!hasAct2aPayoff275) {
      issues.push({
        location: `Act 2a (Scenes ${act2aStart275}–${act2aEnd275 - 1})`,
        rule: 'PAYOFF_ACT2A_VOID',
        severity: 'minor',
        description: `No setups are paid off in Act 2a (Scenes ${act2aStart275}–${act2aEnd275 - 1}) — the early conflict zone delivers no thread closure. A long stretch of pure escalation without any payoff depletes the audience's patience before the midpoint.`,
        suggestedFix: 'Resolve at least one planted thread in Act 2a to reward the audience\'s investment and signal that the setup engine is active. A mid-first-half payoff resets the tension baseline and earns the right to raise it again.',
      });
    }
  }

  // CLUE_SEED_LATE_MAJORITY (minor, n≥10, clues≥4): More than 60% of planted clues
  // are seeded in the second half of the story (after the midpoint). Distinct from
  // SETUP_ACT3_SURGE (last 25% only) — this fires on any second-half majority including
  // Act 2b-heavy planting. Late-seeded clues can't build the long anticipation arcs that
  // make payoffs feel earned; the audience carries them only briefly before resolution.
  if (records.length >= 10 && clueInfo.size >= 4) {
    const midpoint275 = Math.floor(records.length * 0.5);
    const lateClues275 = [...clueInfo.values()].filter(c => c.plantedAt >= midpoint275).length;
    if (lateClues275 / clueInfo.size > 0.6) {
      issues.push({
        location: 'Setup distribution',
        rule: 'CLUE_SEED_LATE_MAJORITY',
        severity: 'minor',
        description: `${lateClues275} of ${clueInfo.size} planted clues (${Math.round(lateClues275 / clueInfo.size * 100)}%) are seeded in the second half of the story — the majority of the setup engine's work starts after the midpoint. Late-seeded clues can't build the long anticipation arcs that make payoffs feel earned.`,
        suggestedFix: 'Move at least two clue plants into the first half. Setups planted early can pay off at any point, building sustained anticipation; setups planted late arrive too close to their resolutions to create genuine surprise.',
      });
    }
  }

  // SETUP_PAYOFF_ACT_SKEW (minor, n≥8, clues≥3, payoffs≥2): The act that concentrates
  // the most setups has zero payoffs in it, AND the act that concentrates the most payoffs
  // has zero setups — the planting and harvesting engines operate in completely separate act
  // zones. A story where all setups live in one act and all payoffs in another lacks the
  // interleaved cause-and-effect texture that creates organic narrative momentum.
  if (records.length >= 8 && clueInfo.size >= 3 && payoffInfo.size >= 2) {
    const zoneSetups275 = [0, 0, 0, 0];
    const zonePayoffs275 = [0, 0, 0, 0];
    for (const info of clueInfo.values()) {
      const pct275 = info.plantedAt / records.length;
      const zone275 = pct275 < 0.25 ? 0 : pct275 < 0.5 ? 1 : pct275 < 0.75 ? 2 : 3;
      zoneSetups275[zone275]++;
    }
    for (const ps275 of payoffInfo.values()) {
      const pct275b = ps275 / records.length;
      const zone275b = pct275b < 0.25 ? 0 : pct275b < 0.5 ? 1 : pct275b < 0.75 ? 2 : 3;
      zonePayoffs275[zone275b]++;
    }
    const topSetup275 = zoneSetups275.indexOf(Math.max(...zoneSetups275));
    const topPayoff275 = zonePayoffs275.indexOf(Math.max(...zonePayoffs275));
    if (topSetup275 !== topPayoff275 && zonePayoffs275[topSetup275] === 0 && zoneSetups275[topPayoff275] === 0) {
      const zoneNames275 = ['Act 1', 'Act 2a', 'Act 2b', 'Act 3'];
      issues.push({
        location: 'Setup/payoff act distribution',
        rule: 'SETUP_PAYOFF_ACT_SKEW',
        severity: 'minor',
        description: `The act with the most setups (${zoneNames275[topSetup275]}: ${zoneSetups275[topSetup275]} setups) has zero payoffs, and the act with the most payoffs (${zoneNames275[topPayoff275]}: ${zonePayoffs275[topPayoff275]} payoffs) has zero setups — the planting and harvesting engines operate in completely separate acts. Setup and payoff divorced from each other reduce the sense of earned resolution.`,
        suggestedFix: 'Introduce at least one payoff in the act where most setups are planted, or plant at least one clue in the act where most payoffs arrive. Interleaving setups and payoffs within the same act zone creates a more organic sense of cause-and-effect progression.',
      });
    }
  }

  // ── Wave 289: PAYOFF_REVELATION_DISCONNECT ───────────────────────────────
  // Payoffs fire (payoffSetupIds non-empty) but none of the payoff scenes
  // have a revelation and none of the adjacent scenes (±1) have a revelation
  // either. Payoffs should be moments of discovery — the audience should
  // learn something when a planted thread is resolved. A payoff without a
  // revelation is a closure without insight. Requires 8+ records and 3+
  // payoff scenes.
  if (records.length >= 8 && payoffInfo.size >= 3) {
    const revelationSceneIdxs289 = new Set<number>(
      (records as any[]).filter(r => r.revelation !== null).map(r => r.sceneIdx),
    );
    const payoffSceneIdxs289 = new Set<number>([...payoffInfo.values()]);
    const anyRevealed289 = [...payoffSceneIdxs289].some(idx =>
      revelationSceneIdxs289.has(idx) ||
      revelationSceneIdxs289.has(idx - 1) ||
      revelationSceneIdxs289.has(idx + 1),
    );
    if (!anyRevealed289) {
      issues.push({
        location: 'Payoff scenes — no adjacent revelations',
        rule: 'PAYOFF_REVELATION_DISCONNECT',
        severity: 'minor',
        description: `${payoffInfo.size} payoff scene(s) fire but none of them (or their adjacent scenes) contain a revelation. Payoffs should be moments of discovery — the audience should learn or understand something new when a planted thread resolves. A payoff without insight is closure without meaning.`,
        suggestedFix: 'Tie each payoff to a revelation: the fulfilled setup reveals a character\'s true motive, confirms a fear, or recontextualizes an earlier event. Even a small revelation — "now we know why that mattered" — elevates a mechanical closure to a resonant one.',
      });
    }
  }

  // ── Wave 289: CLUE_DENSITY_FRONT_COLLAPSE ────────────────────────────────
  // All planted clues appear in the first 20% of the story. The entire
  // setup engine exhausts itself in the opening and then falls silent.
  // Audiences can only hold a limited number of active setups in memory;
  // front-loading all seeds means they fade before they can pay off.
  // Requires 8+ records and 3+ seeded clues.
  if (records.length >= 8 && clueInfo.size >= 3) {
    const cutoff289 = Math.floor(records.length * 0.20);
    const earlyClues289 = [...clueInfo.values()].filter(c => c.plantedAt <= cutoff289).length;
    if (earlyClues289 === clueInfo.size) {
      issues.push({
        location: `Opening 20% (scenes 0–${cutoff289}) — all clue plants`,
        rule: 'CLUE_DENSITY_FRONT_COLLAPSE',
        severity: 'minor',
        description: `All ${clueInfo.size} planted clues appear in the first 20% of the story (scenes 0–${cutoff289}) and no new clues are seeded after that. Front-collapsing the entire setup engine means audiences carry all threads for the rest of the story — or forget them entirely before they pay off.`,
        suggestedFix: 'Distribute clue plants across all four acts: plant 2–3 clues in Act 1, introduce new threads at the midpoint and Act 2b, and reserve one "late plant" for Act 3 that pays off in the climax. This keeps the audience actively processing setups throughout, not just in the opening.',
      });
    }
  }

  // ── Wave 289: PAYOFF_SUSPENSE_MISMATCH ───────────────────────────────────
  // Payoff scenes have an average suspenseDelta ≤ 0 despite 3+ payoffs firing.
  // Payoffs should generate suspense — the moment a planted thread resolves
  // should feel like the stakes rising, not falling. Flat or declining suspense
  // at the moment of payoff means the resolution lands without tension, and the
  // audience feels cheated rather than rewarded. Requires 8+ records and 3+
  // payoff scenes with suspenseDelta data.
  if (records.length >= 8 && payoffInfo.size >= 3) {
    const payoffSuspenseScenes289 = [...payoffInfo.values()]
      .map(idx => (records as any[]).find(r => r.sceneIdx === idx))
      .filter(Boolean);
    if (payoffSuspenseScenes289.length >= 3) {
      const avgPayoffSuspense289 = payoffSuspenseScenes289.reduce((acc: number, r: any) => acc + (r.suspenseDelta ?? 0), 0) / payoffSuspenseScenes289.length;
      if (avgPayoffSuspense289 <= 0) {
        issues.push({
          location: 'Payoff scenes — suspense mismatch',
          rule: 'PAYOFF_SUSPENSE_MISMATCH',
          severity: 'minor',
          description: `${payoffSuspenseScenes289.length} payoff scenes have an average suspenseDelta of ${avgPayoffSuspense289.toFixed(2)} — resolutions arrive without generating tension. Payoffs should be moments of heightened stakes: the audience should feel the cost of the resolution, not just the closure. Flat or declining suspense at payoff time makes the resolution feel deflating rather than cathartic.`,
          suggestedFix: 'Raise the stakes at each payoff: ensure the resolution is contested (the protagonist must work for it), costly (something is lost even in victory), or revelatory (the payoff recontextualizes what came before). A payoff that arrives without friction is a debt repaid without drama.',
        });
      }
    }
  }

  // ── Wave 303: CLUE_REPLANT ────────────────────────────────────────────────
  // The same clue ID is seeded in two or more different scenes. Planting a
  // setup the audience has already received reads as either a continuity
  // artifact or the writer not trusting the first plant — and a re-plant
  // dilutes the original's precision, since the audience can no longer
  // anchor the payoff to a single moment. (clueInfo records only the first
  // plant, so this scans the raw records.) Requires 6+ records.
  if (records.length >= 6) {
    const plantScenes303 = new Map<string, number[]>();
    for (const r of records as any[]) {
      for (const clueId of (r.seededClueIds ?? []) as string[]) {
        const arr = plantScenes303.get(clueId) ?? [];
        arr.push(r.sceneIdx);
        plantScenes303.set(clueId, arr);
      }
    }
    const replanted303 = [...plantScenes303.entries()].filter(([, scenes]) => scenes.length >= 2);
    if (replanted303.length > 0) {
      const [clueId303, scenes303] = replanted303[0];
      issues.push({
        location: `Clue "${clueId303}" planted at scenes ${scenes303.join(', ')}`,
        rule: 'CLUE_REPLANT',
        severity: 'minor',
        description: `The clue "${clueId303}" is seeded in ${scenes303.length} separate scenes (${scenes303.join(', ')})${replanted303.length > 1 ? `, and ${replanted303.length - 1} other clue(s) are also replanted` : ''}. Planting a setup the audience already holds reads as a continuity artifact or as the writer not trusting the first plant — and it blurs the payoff's anchor, since the resolution can no longer point back to a single charged moment.`,
        suggestedFix: 'Keep one plant per clue and make it count. If the audience needs a reminder of an early setup, use a glancing callback (a character touching the object, a half-reference in dialogue) rather than a full re-plant — reminders refresh memory without resetting the anticipation clock.',
      });
    }
  }

  // ── Wave 303: PAYOFF_DOUBLE_FIRE ─────────────────────────────────────────
  // The same setup ID is paid off in two or more different scenes — a thread
  // resolved twice. The second resolution is dramatically inert (the loop is
  // already closed) and signals a continuity error in the story's ledger.
  // (payoffInfo records only the first payoff, so this scans the raw
  // records.) Requires 6+ records.
  if (records.length >= 6) {
    const payoffScenes303 = new Map<string, number[]>();
    for (const r of records as any[]) {
      for (const setupId of (r.payoffSetupIds ?? []) as string[]) {
        const arr = payoffScenes303.get(setupId) ?? [];
        arr.push(r.sceneIdx);
        payoffScenes303.set(setupId, arr);
      }
    }
    const doubled303 = [...payoffScenes303.entries()].filter(([, scenes]) => scenes.length >= 2);
    if (doubled303.length > 0) {
      const [setupId303, dScenes303] = doubled303[0];
      issues.push({
        location: `Setup "${setupId303}" paid off at scenes ${dScenes303.join(', ')}`,
        rule: 'PAYOFF_DOUBLE_FIRE',
        severity: 'minor',
        description: `The setup "${setupId303}" is paid off in ${dScenes303.length} separate scenes (${dScenes303.join(', ')})${doubled303.length > 1 ? `, and ${doubled303.length - 1} other setup(s) also fire twice` : ''}. A thread can only resolve once — the second payoff arrives after the loop is closed, carries no anticipation, and reads as a continuity error in the story's setup ledger.`,
        suggestedFix: 'Give each setup exactly one payoff scene. If the resolution genuinely has two stages (a partial reveal, then the full truth), model them as two distinct setups — the partial answer becoming its own plant for the final one — so each payoff closes a live loop.',
      });
    }
  }

  // ── Wave 303: THREAD_CONVERGENCE_ABSENT ──────────────────────────────────
  // The story fires 4+ payoffs and every one resolves in isolation — no
  // scene ever pays off two threads together. Serially-resolved threads read
  // as episodic housekeeping; braided resolutions, where one scene answers
  // multiple plants at once, are what make a climax feel like everything
  // coming together. Inverse of CLUSTERED_PAYOFFS (too many in one scene).
  // Requires 8+ records and 4+ distinct payoff scenes.
  if (records.length >= 8) {
    const payoffCounts303 = (records as any[]).map(r => ((r.payoffSetupIds ?? []) as string[]).length);
    const payoffSceneCount303 = payoffCounts303.filter(c => c > 0).length;
    const totalPayoffs303 = payoffCounts303.reduce((a, b) => a + b, 0);
    if (totalPayoffs303 >= 4 && payoffSceneCount303 === totalPayoffs303) {
      issues.push({
        location: 'Payoff distribution',
        rule: 'THREAD_CONVERGENCE_ABSENT',
        severity: 'minor',
        description: `All ${totalPayoffs303} payoffs resolve one per scene — no scene ever closes two threads together. Strictly serial resolution reads as episodic housekeeping: each loop is filed away on its own, and the story never delivers the moment where separate threads turn out to be one knot. Convergence is what makes a climax feel like everything coming together.`,
        suggestedFix: 'Braid at least two threads into a single resolution scene — ideally at or near the climax, where one event answers multiple plants at once (the hidden letter that both unmasks the traitor and explains the locked door). Convergent payoffs multiply each other\'s impact; serial ones merely add.',
      });
    }
  }

  // ── Wave 317: PAYOFF_EMOTION_DECOUPLED, UNRESOLVED_CLUE_RATIO_HIGH, PAYOFF_CURIOSITY_MISMATCH ──

  // PAYOFF_EMOTION_DECOUPLED (minor, n≥8, ≥3 payoff scenes): All scenes
  // containing a payoff (payoffSetupIds.length > 0) have emotionalShift ===
  // 'neutral'. A payoff that lands in an emotionally flat scene converts the
  // plot resolution into pure information — the audience gets the answer but
  // not the feeling. Distinct from PAYOFF_SUSPENSE_MISMATCH (which checks
  // suspenseDelta); this audits the emotional register, a different signal.
  if (records.length >= 8) {
    const payoffScenes317e = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as string[]).length > 0);
    if (payoffScenes317e.length >= 3 && payoffScenes317e.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: 'Payoff scenes — emotional register',
        rule: 'PAYOFF_EMOTION_DECOUPLED',
        severity: 'minor',
        description: `All ${payoffScenes317e.length} payoff scenes are emotionally neutral — setups are resolved without an emotional response. A payoff scene is a promise redeemed; if the protagonist (and audience) feel nothing in the moment of resolution, the whole setup/payoff machine has produced information rather than experience.`,
        suggestedFix: 'Ensure each payoff lands in a scene with a genuine emotional shift: relief, grief, triumph, horror. The resolution should cost or reward something felt, not just something known. If a payoff scene is flat, the setup it closes never carried real stakes.',
      });
    }
  }

  // UNRESOLVED_CLUE_RATIO_HIGH (minor, ≥4 seeded clues, n≥8): The final
  // scene's unresolvedClues contains 40%+ of all planted clue IDs. The story
  // ends with a majority of its mystery architecture open — not a deliberate
  // single-thread mystery but unfinished structural work. Distinct from
  // OPEN_CLUES_AT_END (uses structure.openClues + actPosition === 'epilogue')
  // and ORPHAN_CLUE (per-clue, requires completionPercent ≥ 70): this uses
  // the raw records and fires at a systemic 40% threshold.
  if (clueInfo.size >= 4 && records.length >= 8) {
    const finalRec317 = (records as any[])[records.length - 1];
    const finalUnresolved317 = (finalRec317?.unresolvedClues ?? []) as string[];
    const allClueIds317 = new Set(clueInfo.keys());
    const openAtEnd317 = finalUnresolved317.filter((id: string) => allClueIds317.has(id)).length;
    if (openAtEnd317 / clueInfo.size >= 0.4) {
      issues.push({
        location: `Final scene — ${openAtEnd317} of ${clueInfo.size} clues unresolved`,
        rule: 'UNRESOLVED_CLUE_RATIO_HIGH',
        severity: 'minor',
        description: `${openAtEnd317} of ${clueInfo.size} planted clue IDs (${Math.round(openAtEnd317 / clueInfo.size * 100)}%) remain unresolved in the final scene — the story ends with most of its mystery architecture open. Unless this is a deliberate serial structure, these are obligations to the audience left unfulfilled. A well-completed story resolves its planted threads before the ending.`,
        suggestedFix: 'Audit each unresolved clue and either write its payoff scene or cut the setup if it no longer serves the story. If open threads are intentional (anthology, sequel setup), mark them as deliberate thematic questions rather than unanswered plot clues.',
      });
    }
  }

  // PAYOFF_CURIOSITY_MISMATCH (minor, n≥8, ≥3 payoff scenes): Scenes with
  // payoffs have average curiosityDelta ≤ 0. A payoff scene should sustain or
  // intensify curiosity — through partial revelation, a new question opened by
  // the answer, or dramatic irony revealed — not simply extinguish it. A payoff
  // that leaves the audience no more curious is a full stop where a pivot turn
  // should be. Distinct from PAYOFF_SUSPENSE_MISMATCH (suspenseDelta) and
  // PAYOFF_EMOTION_DECOUPLED (emotionalShift).
  if (records.length >= 8) {
    const payoffScenes317c = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as string[]).length > 0);
    if (payoffScenes317c.length >= 3) {
      const avgPayoffCuriosity317 = payoffScenes317c.reduce((acc: number, r: any) => acc + (r.curiosityDelta ?? 0), 0) / payoffScenes317c.length;
      if (avgPayoffCuriosity317 <= 0) {
        issues.push({
          location: 'Payoff scenes — curiosity register',
          rule: 'PAYOFF_CURIOSITY_MISMATCH',
          severity: 'minor',
          description: `${payoffScenes317c.length} payoff scenes average a curiosityDelta of ${avgPayoffCuriosity317.toFixed(2)} — resolutions arrive without reopening curiosity. A payoff that answers and closes without raising a new question or revealing a deeper layer kills the audience's forward hunger at exactly the moment it should pivot. The best payoffs land like a new setup.`,
          suggestedFix: 'Let each payoff open something: the answer to one question should raise another, or the resolution should make the audience wonder "what does this mean for X?" Every payoff is an opportunity to deepen the mystery even as it resolves the immediate thread.',
        });
      }
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
