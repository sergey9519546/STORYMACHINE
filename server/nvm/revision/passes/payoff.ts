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
// Wave 328 additions: payoff relationship decoupled (no payoff scene moves a bond),
// clue seed curiosity flat (clue-seeding scenes avg curiosityDelta ≤ 0), clue seed
// emotion flat (every clue planted in an emotionally neutral scene).
// Wave 342 additions: clue seed relationship decoupled (no clue-seeding scene moves a
// bond), payoff dramatic turn decoupled (no payoff scene carries a dramatic turn —
// resolutions never pivot the story), setup/payoff dead run (6+ consecutive scenes with
// no seed and no payoff in a story that otherwise uses the machine — connective tissue
// vanishes for a stretch).
// Wave 356 additions: clue seed dramatic turn decoupled (no clue-seeding scene coincides
// with a story pivot), payoff clock decoupled (≥3 payoffs and ≥2 clock scenes but no
// payoff lands under time pressure), late clue plant (a clue seeded in the final 15% —
// no room left to pay it off).
// Wave 370 additions: payoff curiosity peak decoupled (the single highest-curiosity scene
// carries no payoff while payoffs exist elsewhere), payoff Act 3 absent (no payoff lands in
// the final 25% though ≥3 resolve earlier — the finale settles nothing), clue seed midpoint
// void (no clue planted in the 40%–60% pivot while seeds exist on both sides).
// Wave 384 additions: payoff suspense peak decoupled (the single highest-suspense scene
// carries no payoff while payoffs exist elsewhere — the suspense mirror of payoff curiosity
// peak decoupled), clue seed clock decoupled (≥3 seed scenes and ≥2 clock scenes but no clue
// is planted under time pressure — the seed-side sibling of payoff clock decoupled), clue
// seed front-loaded (>60% of clues planted in the first half — the mirror of clue seed late
// majority).
// Wave 398 additions: clue seed suspense flat (all seed scenes have suspenseDelta ≤ 0 —
// evidence planted in tension-free moments; the suspense-channel complement of clue seed
// curiosity flat and clue seed emotion flat), payoff midpoint void (no payoff in the 40%–60%
// pivot zone while payoffs exist before and after — the pivot is structurally inert), clue
// seed revelation decoupled (no seed scene coincides with a revelation — planting evidence
// and making disclosures never overlap, missing the compound effect of both in one moment).
// Wave 412 additions: clue seed curiosity peak decoupled (the single highest-curiosity scene
// seeds no clue while seeds exist elsewhere — the seed-side mirror of payoff curiosity peak
// decoupled), clue seed suspense peak decoupled (the single highest-suspense scene seeds no
// clue while seeds exist elsewhere — the seed-side mirror of payoff suspense peak decoupled),
// payoff relationship peak decoupled (the single largest relational shift scene carries no
// payoff while payoffs exist elsewhere — single-peak isolation × relationship magnitude,
// distinct from the co-occurrence PAYOFF_RELATIONSHIP_DECOUPLED).
// Wave 426 additions: payoff aftermath question void (sequence/aftermath — every payoff scene is
// followed by two scenes that raise no curiosity and plant no new clue, so each resolution
// deflates the story instead of re-engaging it), payoff consecutive run (run-based — three or
// more consecutive scenes each fire a payoff, a "resolution avalanche" that dumps closures
// back-to-back with no rebuild between; distinct from CLUSTERED_PAYOFFS which counts many in ONE
// scene and THREAD_CONVERGENCE_ABSENT which is the opposite, payoffs in isolation), payoff
// relationship valence uniform (valence — when payoffs DO move bonds, every relational shift on
// a payoff scene shares one sign, so the resolution phase ruptures-only or repairs-only;
// distinct from PAYOFF_RELATIONSHIP_DECOUPLED, which fires when NO payoff moves a bond at all).
// Wave 440 additions: payoff backloaded (>70% of payoffs in the second half while ≥3 exist —
// the distribution mirror of PAYOFF_FRONT_LOADED; the first half resolves nothing while the
// second half carries all closures; distribution/timing × underweight/bloat), payoff emotional
// recoil absent (no payoff scene is followed by a negative emotional shift within 2 scenes —
// resolutions never produce grief, loss, or emotional cost downstream; sequence/aftermath ×
// negative-emotion channel, distinct from PAYOFF_AFTERMATH_QUESTION_VOID by channel and from
// PAYOFF_EMOTION_DECOUPLED which audits the payoff scene itself), payoff suspense recoil absent
// (no payoff scene is followed by a suspenseDelta > 0 within 2 scenes — resolutions never create
// new pressure downstream; sequence/aftermath × suspense channel, completing the aftermath-channel
// family alongside curiosity/seed and emotional recoil).
// Wave 454 additions: payoff causeless (backward-cause × payoff signal — no payoff scene is
// preceded in the prior 3 scenes by any narrative escalation: no revelation, no dramatic turn,
// no high-suspense push — resolutions arrive without momentum building toward them), clue seed
// causeless (backward-cause × clue-seed signal — no seed scene is preceded in the prior 2
// scenes by curiosity, emotional charge, or a revelation — evidence planted into narrative dead
// air), clue seed consecutive run (run-based × clue-seed signal — 3+ consecutive scenes each
// plant a new clue, an "evidence avalanche" that overwhelms the audience with simultaneous
// information before they can form emotional attachment to individual threads).

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

  // ── Wave 328: PAYOFF_RELATIONSHIP_DECOUPLED, CLUE_SEED_CURIOSITY_FLAT, CLUE_SEED_EMOTION_FLAT ──

  // PAYOFF_RELATIONSHIP_DECOUPLED (minor, n≥8, ≥3 payoff scenes): No scene
  // containing a payoff also carries a relationship shift. Payoffs resolve plot
  // threads but never move a bond — the setup/payoff machine runs in a lane
  // separate from the characters. The most resonant payoffs change a
  // relationship as they close a loop. Completes the payoff-channel trilogy with
  // PAYOFF_EMOTION_DECOUPLED (emotion) and PAYOFF_CURIOSITY_MISMATCH (curiosity).
  if (records.length >= 8) {
    const payoffScenes328 = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as string[]).length > 0);
    if (payoffScenes328.length >= 3) {
      const anyRelShift328 = payoffScenes328.some(r => ((r.relationshipShifts ?? []) as any[]).length > 0);
      if (!anyRelShift328) {
        issues.push({
          location: 'Payoff scenes — relational impact',
          rule: 'PAYOFF_RELATIONSHIP_DECOUPLED',
          severity: 'minor',
          description: `None of the ${payoffScenes328.length} payoff scenes also carries a relationship shift — resolutions close plot threads but never move a bond. The setup/payoff machine runs in a lane separate from the characters; the audience gets the answer to the plot question without feeling its effect on anyone. The most resonant payoffs change a relationship in the act of closing a loop.`,
          suggestedFix: 'Tie payoffs to relationships: let the resolution of a thread also shift trust, power, or intimacy between characters. The clue that exposes the traitor should also break the friendship; the secret that comes out should also heal or sever a bond. Plot resolution and relational change should arrive together.',
        });
      }
    }
  }

  // CLUE_SEED_CURIOSITY_FLAT (minor, n≥8, ≥3 seed scenes): Scenes that plant a
  // clue (seededClueIds.length > 0) have an average curiosityDelta ≤ 0. A clue
  // planted in a scene that raises no curiosity does not register as a question
  // — the audience needs to feel "what is that for?" at the moment of planting,
  // or the seed passes unnoticed and its later payoff lands without setup.
  // Distinct from the payoff-side curiosity check: this audits the seed side.
  if (records.length >= 8) {
    const seedScenes328 = (records as any[]).filter(r => ((r.seededClueIds ?? []) as string[]).length > 0);
    if (seedScenes328.length >= 3) {
      const avgSeedCur328 = seedScenes328.reduce((acc: number, r: any) => acc + (r.curiosityDelta ?? 0), 0) / seedScenes328.length;
      if (avgSeedCur328 <= 0) {
        issues.push({
          location: 'Clue-seeding scenes — curiosity register',
          rule: 'CLUE_SEED_CURIOSITY_FLAT',
          severity: 'minor',
          description: `${seedScenes328.length} clue-seeding scenes average a curiosityDelta of ${avgSeedCur328.toFixed(2)} — clues are planted in scenes that raise no curiosity. A seed only works if the audience registers it as a question ("what is that for?"); planted in a flat scene, the clue passes unnoticed, and its later payoff lands without the setup that should have charged it.`,
          suggestedFix: 'Plant clues so they prick curiosity: give the planted detail a beat of attention — a character notices it, a camera-worthy oddity, a line that half-explains and half-mystifies. The seed the audience wonders about is the seed they will remember when it pays off.',
        });
      }
    }
  }

  // CLUE_SEED_EMOTION_FLAT (minor, n≥8, ≥3 seed scenes): Every scene that plants
  // a clue is emotionally neutral. Clues attached to a charged moment lodge in
  // memory; clues dropped in affectless scenes are forgotten before they can pay
  // off. Distinct from SETUP_WITHOUT_CONSEQUENCE (repeated clues lacking any
  // downstream effect) and CLUE_SEED_CURIOSITY_FLAT (curiosity channel): this
  // audits the emotional charge of the planting scenes.
  if (records.length >= 8) {
    const seedScenes328e = (records as any[]).filter(r => ((r.seededClueIds ?? []) as string[]).length > 0);
    if (seedScenes328e.length >= 3 && seedScenes328e.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: 'Clue-seeding scenes — emotional register',
        rule: 'CLUE_SEED_EMOTION_FLAT',
        severity: 'minor',
        description: `All ${seedScenes328e.length} clue-seeding scenes are emotionally neutral — every clue is planted in an affectless scene. Memory is emotional: a clue attached to a charged moment lodges and resurfaces when it pays off, while a clue dropped in a flat scene is forgotten before it can matter. Neutral planting wastes the setup half of the setup/payoff contract.`,
        suggestedFix: 'Plant at least some clues inside emotionally charged scenes, where the audience is already leaning in: the keepsake mentioned during a goodbye, the detail glimpsed in a moment of fear. The feeling makes the fact stick, so the payoff later has something to land against.',
      });
    }
  }

  // ── Wave 342: CLUE_SEED_RELATIONSHIP_DECOUPLED, PAYOFF_DRAMATIC_TURN_DECOUPLED, SETUP_PAYOFF_DEAD_RUN ──

  // CLUE_SEED_RELATIONSHIP_DECOUPLED (minor, n≥8, ≥3 seed scenes): No scene that
  // plants a clue (seededClueIds.length > 0) also carries a relationship shift. Clues
  // are planted in a lane wholly separate from the characters' bonds — the setup
  // machinery never rides on a relational moment. Clues lodge best when planted during
  // a beat the audience is already invested in: the keepsake handed over as a friendship
  // forms, the lie told as trust frays. Completes the seed-side trilogy with
  // CLUE_SEED_CURIOSITY_FLAT (curiosity) and CLUE_SEED_EMOTION_FLAT (emotion); distinct
  // from PAYOFF_RELATIONSHIP_DECOUPLED, which audits the payoff side.
  if (records.length >= 8) {
    const seedScenes342 = (records as any[]).filter(r => ((r.seededClueIds ?? []) as string[]).length > 0);
    if (seedScenes342.length >= 3) {
      const anySeedRel342 = seedScenes342.some(r => ((r.relationshipShifts ?? []) as any[]).length > 0);
      if (!anySeedRel342) {
        issues.push({
          location: 'Clue-seeding scenes — relational impact',
          rule: 'CLUE_SEED_RELATIONSHIP_DECOUPLED',
          severity: 'minor',
          description: `None of the ${seedScenes342.length} clue-seeding scenes also carries a relationship shift — clues are planted in a lane wholly separate from the characters' bonds. The setup machinery never rides on a relational moment, so the seeds drop in scenes the audience has no emotional reason to remember. A clue lodges best when planted during a beat the audience is already invested in.`,
          suggestedFix: 'Plant some clues inside relational moments: the object passed between characters as trust forms, the detail glimpsed during an argument, the secret half-told as a bond strains. When the seed is bound to a relationship the audience cares about, the planting scene earns its place and the later payoff has something to land against.',
        });
      }
    }
  }

  // PAYOFF_DRAMATIC_TURN_DECOUPLED (minor, n≥8, ≥3 payoff scenes): No payoff scene
  // (payoffSetupIds non-empty) carries a dramatic turn (dramaticTurn !== 'nothing').
  // Resolutions close threads but never pivot the story — the setup/payoff machine
  // runs without ever producing a reversal, recognition, or twist at the moment a loop
  // closes. The most powerful payoffs ARE turns: the answer that flips the situation,
  // the revelation that recasts everything. Distinct from PAYOFF_REVELATION_DISCONNECT
  // (revelation field within a ±1 window) — this audits the dramaticTurn field on the
  // payoff scene itself — and from the emotion/curiosity/suspense/relationship payoff
  // channels.
  if (records.length >= 8) {
    const payoffScenes342 = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as string[]).length > 0);
    if (payoffScenes342.length >= 3) {
      const anyTurn342 = payoffScenes342.some(r => (r.dramaticTurn ?? 'nothing') !== 'nothing');
      if (!anyTurn342) {
        issues.push({
          location: 'Payoff scenes — dramatic pivot',
          rule: 'PAYOFF_DRAMATIC_TURN_DECOUPLED',
          severity: 'minor',
          description: `None of the ${payoffScenes342.length} payoff scenes carries a dramatic turn — resolutions close threads but never pivot the story. The setup/payoff machine runs without ever producing a reversal, recognition, or twist at the moment a loop closes, so each payoff lands as a tidy completion rather than a hinge. The most powerful payoffs are turns: the answer that flips the situation, the revelation that recasts everything that came before.`,
          suggestedFix: 'Let at least one major payoff also turn the story: design the resolution of a thread so that the answer reverses the protagonist\'s situation, exposes a deception, or reframes the goal. A payoff that doubles as a pivot pays off the planting and propels the next act in the same beat.',
        });
      }
    }
  }

  // SETUP_PAYOFF_DEAD_RUN (minor, n≥10): Six or more consecutive scenes carry no
  // seeded clue and no payoff, in a story that otherwise uses the setup/payoff machine
  // (≥3 continuity-active scenes overall). For a long stretch the plot's connective
  // tissue vanishes: nothing is planted and nothing is harvested, so the audience's
  // sense of an interlocking design goes quiet. Distinct from the zone-specific voids
  // (ACT2A_PAYOFF_VOID — payoff-only, act-bounded) and THREAD_CONVERGENCE_ABSENT
  // (isolation of payoffs): this flags a contiguous run with no continuity activity of
  // either kind.
  if (records.length >= 10) {
    const isContinuityActive342 = (r: any): boolean =>
      ((r.seededClueIds ?? []) as string[]).length > 0 || ((r.payoffSetupIds ?? []) as string[]).length > 0;
    const totalActive342 = (records as any[]).filter(isContinuityActive342).length;
    if (totalActive342 >= 3) {
      let deadRun342 = 0;
      let deadStart342 = 0;
      let maxDead342 = 0;
      let maxStart342 = 0;
      for (let i342 = 0; i342 < records.length; i342++) {
        if (!isContinuityActive342((records as any[])[i342])) {
          if (deadRun342 === 0) deadStart342 = i342;
          deadRun342++;
          if (deadRun342 > maxDead342) { maxDead342 = deadRun342; maxStart342 = deadStart342; }
        } else {
          deadRun342 = 0;
        }
      }
      if (maxDead342 >= 6) {
        const s342 = (records as any[])[maxStart342].sceneIdx;
        const e342 = (records as any[])[maxStart342 + maxDead342 - 1].sceneIdx;
        issues.push({
          location: `Scenes ${s342}–${e342} — no setup or payoff`,
          rule: 'SETUP_PAYOFF_DEAD_RUN',
          severity: 'minor',
          description: `${maxDead342} consecutive scenes (${s342}–${e342}) plant no clue and resolve no thread, in a story that otherwise uses the setup/payoff machine. For this whole stretch the plot's connective tissue vanishes — nothing is seeded and nothing harvested — so the audience's sense of an interlocking design goes quiet and the middle of the story drifts free of the structure built around it.`,
          suggestedFix: 'Thread continuity through the dead run: plant a small clue, pay off an earlier one, or fold a long fuse partway toward its resolution. The setup/payoff weave is what makes a story feel designed rather than episodic; a long stretch with neither leaves the audience watching events instead of a plot.',
        });
      }
    }
  }

  // ── Wave 356: CLUE_SEED_DRAMATIC_TURN_DECOUPLED, PAYOFF_CLOCK_DECOUPLED, LATE_CLUE_PLANT ──

  // CLUE_SEED_DRAMATIC_TURN_DECOUPLED (minor, n≥8, ≥3 seed scenes): No scene that plants
  // a clue (seededClueIds non-empty) also carries a dramatic turn. Clues are always
  // planted in still water, never in the churn of a pivot — so the seeds drop in moments
  // the audience has the least reason to attend to. A clue glimpsed during a reversal or
  // recognition rides the scene's charge into memory. Completes the seed-side channel set
  // with CLUE_SEED_CURIOSITY_FLAT, CLUE_SEED_EMOTION_FLAT, and CLUE_SEED_RELATIONSHIP_
  // DECOUPLED; distinct from PAYOFF_DRAMATIC_TURN_DECOUPLED (the payoff side).
  if (records.length >= 8) {
    const seedScenes356 = (records as any[]).filter(r => ((r.seededClueIds ?? []) as string[]).length > 0);
    if (seedScenes356.length >= 3 && !seedScenes356.some(r => (r.dramaticTurn ?? 'nothing') !== 'nothing')) {
      issues.push({
        location: 'Clue-seeding scenes — dramatic pivot',
        rule: 'CLUE_SEED_DRAMATIC_TURN_DECOUPLED',
        severity: 'minor',
        description: `None of the ${seedScenes356.length} clue-seeding scenes also carries a dramatic turn — clues are always planted in still water, never in the churn of a pivot. The seeds drop in moments the audience has the least reason to attend to, so they pass unregistered and their later payoffs land without the setup having truly taken hold. A clue glimpsed during a reversal rides the scene's charge into memory.`,
        suggestedFix: 'Plant at least some clues inside turning-point scenes: a detail noticed in the chaos of a reversal, an object that changes meaning the moment a recognition lands. The audience\'s attention is highest at a pivot — a seed dropped there is a seed they will remember when it pays off.',
      });
    }
  }

  // PAYOFF_CLOCK_DECOUPLED (minor, n≥8, ≥3 payoff scenes, ≥2 clock scenes): The story
  // raises clocks (clockRaised) and resolves planted threads (payoffSetupIds), but no
  // payoff ever lands in a clock scene — resolutions never arrive under time pressure.
  // A payoff that resolves against a ticking clock carries doubled tension: the audience
  // feels both the satisfaction of the answer and the danger of the deadline. When the
  // two systems never coincide, payoffs land in calm water and forfeit that charge.
  // Distinct from CLOCK_WITHOUT_CONFRONTATION / CONFLICT_CLOCK_DECOUPLED (conflict pass)
  // and PAYOFF_SUSPENSE_MISMATCH (suspenseDelta on payoff scenes, not clock co-occurrence).
  if (records.length >= 8) {
    const payoffScenes356 = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as string[]).length > 0);
    const clockScenes356 = (records as any[]).filter(r => r.clockRaised === true);
    if (payoffScenes356.length >= 3 && clockScenes356.length >= 2 && !payoffScenes356.some(r => r.clockRaised === true)) {
      issues.push({
        location: 'Payoff scenes — time pressure',
        rule: 'PAYOFF_CLOCK_DECOUPLED',
        severity: 'minor',
        description: `The story raises ${clockScenes356.length} clocks and lands ${payoffScenes356.length} payoffs, but no payoff arrives in a clock scene — resolutions never land under time pressure. A payoff that resolves against a ticking clock carries doubled tension: the satisfaction of the answer and the danger of the deadline at once. When the deadline machine and the payoff machine never meet, the resolutions land in calm water and forfeit that charge.`,
        suggestedFix: 'Stage at least one major payoff under a live clock: let the thread resolve at the moment the deadline bites, so the answer and the urgency hit together. The convergence of "we finally know" and "we are almost out of time" is one of the most powerful beats available — use it at least once.',
      });
    }
  }

  // LATE_CLUE_PLANT (minor, n≥10, ≥1 late seed): A clue is seeded in the final 15% of
  // the story, leaving no room to set it up properly before it would need to pay off. A
  // seed planted this late either dangles unresolved or pays off almost immediately,
  // robbing it of the delay that makes a payoff satisfying. Distinct from CLUE_SEED_LATE_
  // MAJORITY (>60% of clues in the whole second half — a proportion) and ORPHAN_CLUE /
  // DANGLING_PAYOFF (resolution-state checks): this flags the specific timing error of
  // planting in the closing stretch.
  if (records.length >= 10) {
    const lateStart356 = Math.floor(records.length * 0.85);
    const lateSeedScenes356 = (records as any[]).filter((r, i) => i >= lateStart356 && ((r.seededClueIds ?? []) as string[]).length > 0);
    if (lateSeedScenes356.length >= 1) {
      issues.push({
        location: `Final 15% (Scenes ${lateStart356}–${records.length - 1}) — late clue plant`,
        rule: 'LATE_CLUE_PLANT',
        severity: 'minor',
        description: `${lateSeedScenes356.length} clue-seeding scene(s) fall in the final 15% of the story (Scenes ${lateStart356}–${records.length - 1}) — a clue planted this late has no room to be set up before it would need to pay off. Such a seed either dangles unresolved or pays off almost immediately, robbing it of the delay between planting and harvest that makes a payoff satisfying.`,
        suggestedFix: 'Move late clue plants earlier so they have room to breathe before their payoff, or cut them if they are not paid off at all. The pleasure of a payoff is proportional to how long the seed has been quietly waiting; a clue introduced in the closing stretch cannot earn that.',
      });
    }
  }

  // ── Wave 370: PAYOFF_CURIOSITY_PEAK_DECOUPLED, PAYOFF_ACT3_ABSENT, CLUE_SEED_MIDPOINT_VOID ──

  // PAYOFF_CURIOSITY_PEAK_DECOUPLED (minor, n≥8, maxCuriosity>1, ≥2 payoff scenes):
  // The single highest-curiosityDelta scene carries no payoff, even though the story
  // resolves planted threads elsewhere. The moment the audience is most urgently
  // wondering is not where any thread snaps shut — peak intrigue and the satisfaction of
  // resolution never coincide. A payoff landing at the curiosity peak doubles its force:
  // the answer arrives exactly when the audience most wants it. Distinct from PAYOFF_
  // CURIOSITY_MISMATCH (which averages curiosityDelta across payoff scenes — this isolates
  // the single peak-curiosity scene and checks whether a payoff lands there).
  if (records.length >= 8) {
    const payoffScenes370 = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as string[]).length > 0);
    const maxCur370 = Math.max(...(records as any[]).map(r => r.curiosityDelta ?? 0));
    if (payoffScenes370.length >= 2 && maxCur370 > 1) {
      const peakCur370 = (records as any[]).find(r => (r.curiosityDelta ?? 0) === maxCur370);
      if (peakCur370 && ((peakCur370.payoffSetupIds ?? []) as string[]).length === 0) {
        issues.push({
          location: `Scene ${peakCur370.sceneIdx} — peak curiosity (${maxCur370.toFixed(2)})`,
          rule: 'PAYOFF_CURIOSITY_PEAK_DECOUPLED',
          severity: 'minor',
          description: `The story's highest-curiosityDelta scene (Scene ${peakCur370.sceneIdx}, curiosityDelta ${maxCur370.toFixed(2)}) carries no payoff, even though ${payoffScenes370.length} other scenes resolve planted threads. The moment the audience is most urgently wondering is not where anything snaps shut — peak intrigue and the satisfaction of resolution never meet, so the most charged delivery slot for a payoff is left empty.`,
          suggestedFix: 'Land a payoff at the peak-curiosity scene: when the audience is most desperate to know, that is the moment to resolve a planted thread — or to pay one off in a way that opens the next question. A payoff that arrives at the crest of curiosity hits with doubled force.',
        });
      }
    }
  }

  // PAYOFF_ACT3_ABSENT (minor, n≥10, ≥3 payoffs in Acts 1–2): No payoff lands in Act 3
  // (the final 25% of scenes), even though three or more planted threads resolve earlier.
  // Every loop the story closes is closed before the finale, so the climax and resolution
  // arrive with no payoff left to deliver — the ending has nothing to pay off because the
  // accounting was all settled in advance. Distinct from PAYOFF_BEFORE_CLIMAX (which
  // requires EVERY clue resolved before the final 20% and gates on act position) and
  // PAYOFF_FRONT_LOADED (>60% of payoffs in the first half): this fires on the binary
  // absence of any payoff in the final quarter while payoffs exist earlier.
  if (records.length >= 10) {
    const act3Start370 = Math.floor(records.length * 0.75);
    const earlyPayoffs370 = (records as any[]).filter((r, i) => i < act3Start370 && ((r.payoffSetupIds ?? []) as string[]).length > 0);
    const act3Payoffs370 = (records as any[]).filter((r, i) => i >= act3Start370 && ((r.payoffSetupIds ?? []) as string[]).length > 0);
    if (earlyPayoffs370.length >= 3 && act3Payoffs370.length === 0) {
      issues.push({
        location: `Act 3 (Scenes ${act3Start370}–${records.length - 1}) — no payoffs`,
        rule: 'PAYOFF_ACT3_ABSENT',
        severity: 'minor',
        description: `${earlyPayoffs370.length} payoffs land in Acts 1–2 but none in Act 3 (Scenes ${act3Start370}–${records.length - 1}) — every loop the story closes is closed before the finale. The climax and resolution arrive with no thread left to pay off, so the ending settles nothing the audience has been waiting for; the satisfaction of resolution is spent before the moment it should peak.`,
        suggestedFix: 'Reserve at least one significant payoff for Act 3: hold a planted thread closed until the climax or resolution so the ending delivers the click of completion at the story\'s peak. A finale with no payoffs left is a finale the audience has no structural reason to anticipate.',
      });
    }
  }

  // CLUE_SEED_MIDPOINT_VOID (minor, n≥10, ≥3 seed scenes): No clue is planted in the
  // midpoint zone (40%–60%), even though clues are seeded both before it and after it.
  // The setup engine goes quiet at the exact structural pivot — the moment a strong
  // midpoint should be planting the seeds that reframe the second half. Distinct from
  // SETUP_DESERT_ACT2B (the 50%–75% zone), SETUP_FRONT_GAP (the first 25%), and CLUE_
  // DROUGHT (a max-gap measure anywhere): this isolates the central 40%–60% window and
  // requires seeds on both sides, catching a setup gap that straddles the pivot.
  if (records.length >= 10) {
    const midStart370 = Math.floor(records.length * 0.4);
    const midEnd370 = Math.floor(records.length * 0.6);
    const seedScenes370 = (records as any[])
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => ((r.seededClueIds ?? []) as string[]).length > 0);
    if (seedScenes370.length >= 3) {
      const inMid370 = seedScenes370.some(({ i }) => i >= midStart370 && i < midEnd370);
      const beforeMid370 = seedScenes370.some(({ i }) => i < midStart370);
      const afterMid370 = seedScenes370.some(({ i }) => i >= midEnd370);
      if (!inMid370 && beforeMid370 && afterMid370) {
        issues.push({
          location: `Midpoint zone (Scenes ${midStart370}–${midEnd370 - 1}) — no clue seeded`,
          rule: 'CLUE_SEED_MIDPOINT_VOID',
          severity: 'minor',
          description: `No clue is planted in the midpoint zone (Scenes ${midStart370}–${midEnd370 - 1}), though clues are seeded both before and after it — the setup engine goes silent at the exact structural pivot. The midpoint is where a strong story plants the seeds that reframe the second half; a setup void there means the pivot reorganizes the plot without planting anything the back half can harvest.`,
          suggestedFix: 'Plant a clue at the midpoint: let the pivot that reframes the story also seed the detail its second half will pay off. The midpoint reversal is most powerful when it both turns the plot and quietly lays the groundwork for what the turn makes possible.',
        });
      }
    }
  }

  // ── Wave 384: PAYOFF_SUSPENSE_PEAK_DECOUPLED, CLUE_SEED_CLOCK_DECOUPLED, CLUE_SEED_FRONT_LOADED ──

  // PAYOFF_SUSPENSE_PEAK_DECOUPLED (minor, n≥8, maxSuspense>1, ≥2 payoff scenes): The
  // single highest-suspenseDelta scene carries no payoff, even though the story resolves
  // planted threads elsewhere. The peak-tension moment — when the audience is most gripped —
  // is not where any thread snaps shut, so the most charged delivery slot for a payoff goes
  // unused. The suspense mirror of PAYOFF_CURIOSITY_PEAK_DECOUPLED; distinct from PAYOFF_
  // SUSPENSE_MISMATCH (which averages suspenseDelta across payoff scenes — this isolates the
  // single peak-suspense scene).
  if (records.length >= 8) {
    const payoffScenes384 = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as string[]).length > 0);
    const maxSusp384 = Math.max(...(records as any[]).map(r => r.suspenseDelta ?? 0));
    if (payoffScenes384.length >= 2 && maxSusp384 > 1) {
      const peakSusp384 = (records as any[]).find(r => (r.suspenseDelta ?? 0) === maxSusp384);
      if (peakSusp384 && ((peakSusp384.payoffSetupIds ?? []) as string[]).length === 0) {
        issues.push({
          location: `Scene ${peakSusp384.sceneIdx} — peak suspense (${maxSusp384.toFixed(2)})`,
          rule: 'PAYOFF_SUSPENSE_PEAK_DECOUPLED',
          severity: 'minor',
          description: `The story's highest-suspenseDelta scene (Scene ${peakSusp384.sceneIdx}, suspenseDelta ${maxSusp384.toFixed(2)}) carries no payoff, even though ${payoffScenes384.length} other scenes resolve planted threads. The moment the audience is most gripped is not where anything snaps shut — peak tension and the satisfaction of resolution never meet, so the most charged delivery slot for a payoff is left empty.`,
          suggestedFix: 'Land a payoff at the peak-tension scene: resolving a long-planted thread at the moment of maximum suspense doubles its force — the audience gets the answer and the danger at once. The scene that grips hardest is the most powerful place to pay something off.',
        });
      }
    }
  }

  // CLUE_SEED_CLOCK_DECOUPLED (minor, n≥8, ≥3 seed scenes, ≥2 clock scenes): No scene
  // that plants a clue also raises a clock, even though the story has both. Clues are never
  // planted under time pressure, so the seed and the urgency engine never coincide — a clue
  // glimpsed in the scramble of a deadline rides the scene's tension into memory, but here
  // every seed drops in calm water. The seed-side sibling of PAYOFF_CLOCK_DECOUPLED (which
  // audits payoffs against clocks); distinct from CLUE_SEED_SUSPENSE_VOID (causality.ts, the
  // suspenseDelta channel) — this targets the clockRaised field's co-occurrence.
  if (records.length >= 8) {
    const seedScenes384 = (records as any[]).filter(r => ((r.seededClueIds ?? []) as string[]).length > 0);
    const clockScenes384 = (records as any[]).filter(r => r.clockRaised === true);
    if (seedScenes384.length >= 3 && clockScenes384.length >= 2 && !seedScenes384.some(r => r.clockRaised === true)) {
      issues.push({
        location: 'Clue-seeding scenes × clock scenes — decoupled',
        rule: 'CLUE_SEED_CLOCK_DECOUPLED',
        severity: 'minor',
        description: `The story plants clues in ${seedScenes384.length} scenes and raises clocks in ${clockScenes384.length}, but no clue is seeded in a clock scene — foreshadowing never happens under time pressure. The seed engine and the urgency engine never coincide, so the story forfeits the charge of a clue glimpsed in the scramble of a deadline, where the scene's tension would burn it into the audience's memory.`,
        suggestedFix: 'Plant at least one clue inside a clock-raising scene: a detail noticed in the rush before a deadline rides the urgency into memory and pays off harder later. The intersection of "remember this" and "we are almost out of time" makes a seed both more vivid and more ominous.',
      });
    }
  }

  // CLUE_SEED_FRONT_LOADED (minor, n≥10, clues≥4): More than 60% of planted clues are
  // seeded in the first half of the story. The setup engine front-loads its work, so the
  // back half introduces few new threads and the midpoint-onward stretch coasts on early
  // plants. The mirror of CLUE_SEED_LATE_MAJORITY (>60% in the second half); distinct from
  // CLUE_DENSITY_FRONT_COLLAPSE (ALL clues in the first 20% — a stricter, narrower window)
  // and SETUP_FRONT_GAP (no clues in the first 25%).
  if (records.length >= 10 && clueInfo.size >= 4) {
    const midpoint384 = Math.floor(records.length * 0.5);
    const earlyClues384 = [...clueInfo.values()].filter(c => c.plantedAt < midpoint384).length;
    if (earlyClues384 / clueInfo.size > 0.6) {
      issues.push({
        location: 'Setup distribution',
        rule: 'CLUE_SEED_FRONT_LOADED',
        severity: 'minor',
        description: `${earlyClues384} of ${clueInfo.size} planted clues (${Math.round(earlyClues384 / clueInfo.size * 100)}%) are seeded in the first half of the story — the setup engine front-loads its work. The back half introduces few new threads, so the midpoint-onward stretch coasts on early plants and the audience stops actively processing new setups precisely when the story should be deepening.`,
        suggestedFix: 'Move some clue plants into the second half: a new thread seeded at the midpoint or in Act 2b keeps the audience processing fresh setups and gives the climax something recently planted to pay off. A setup engine that goes quiet after the midpoint leaves the back half with nothing new to anticipate.',
      });
    }
  }

  // ── Wave 398: CLUE_SEED_SUSPENSE_FLAT, PAYOFF_MIDPOINT_VOID, CLUE_SEED_REVELATION_DECOUPLED ──

  // CLUE_SEED_SUSPENSE_FLAT (minor, n≥8, ≥3 seed scenes, overall suspense present):
  // All clue-seeding scenes have suspenseDelta ≤ 0 — the story plants its evidence only
  // in moments that generate no dramatic tension. A seed dropped into a low-stakes moment
  // risks reading as mundane set dressing; planted under pressure, the same detail reads
  // as charged and memorable. Average mode × suspense channel × seed subset. Distinct from
  // CLUE_SEED_CURIOSITY_FLAT (curiosityDelta channel), CLUE_SEED_EMOTION_FLAT (emotional-
  // shift channel), and CLUE_SEED_RELATIONSHIP_DECOUPLED (relationship channel): this
  // audits the suspense signal for the seed-scene subset.
  if (records.length >= 8) {
    const seedRecs398a = (records as any[]).filter(r => ((r.seededClueIds ?? []) as any[]).length > 0);
    if (seedRecs398a.length >= 3) {
      const anyOverallSuspense398a = (records as any[]).some(r => (r.suspenseDelta ?? 0) > 0);
      if (anyOverallSuspense398a) {
        const allSeedsSuspFlat398a = seedRecs398a.every(r => (r.suspenseDelta ?? 0) <= 0);
        if (allSeedsSuspFlat398a) {
          issues.push({
            location: 'Clue-seeding scenes — suspense decoupled',
            rule: 'CLUE_SEED_SUSPENSE_FLAT',
            severity: 'minor',
            description: `All ${seedRecs398a.length} clue-seeding scenes have suspenseDelta ≤ 0 — the story plants its evidence in moments that generate no dramatic tension. A seed dropped into a low-stakes moment risks reading as mundane set dressing; planted under pressure, the same detail reads as charged and memorable. The suspense engine and the foreshadowing engine never share a scene.`,
            suggestedFix: 'Plant at least one key clue inside a tense scene: a discovery made under threat, a clue glimpsed while something else is going wrong, or a detail revealed by a character under pressure. Suspense makes a planted seed feel dangerous and therefore worth remembering.',
          });
        }
      }
    }
  }

  // PAYOFF_MIDPOINT_VOID (minor, n≥8, ≥3 total payoffs, payoffs on both sides of zone):
  // No payoff lands in the 40%–60% pivot zone while payoffs exist both before and after it.
  // The structural midpoint is where momentum pivots; closing a loop here acknowledges the
  // turn and signals escalation for the back half. A payoff-free midzone leaves the pivot
  // narratively neutral — the story turns structurally but settles nothing. Zone presence/
  // absence mode × payoff channel × midpoint position. Distinct from PAYOFF_ACT2A_VOID
  // (25%–50% zone — broader and offset), MIDSTORY_PAYOFF_VOID (entire 25%–75% mid-half),
  // and CLUE_SEED_MIDPOINT_VOID (same zone × seed channel rather than payoff channel).
  if (records.length >= 8) {
    const payoffScenes398b = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as any[]).length > 0);
    if (payoffScenes398b.length >= 3) {
      const mid40398b = Math.floor(records.length * 0.4);
      const mid60398b = Math.ceil(records.length * 0.6);
      const midPayoffs398b = (records as any[]).slice(mid40398b, mid60398b)
        .filter(r => ((r.payoffSetupIds ?? []) as any[]).length > 0).length;
      const earlyPayoffs398b = (records as any[]).slice(0, mid40398b)
        .filter(r => ((r.payoffSetupIds ?? []) as any[]).length > 0).length;
      const latePayoffs398b = (records as any[]).slice(mid60398b)
        .filter(r => ((r.payoffSetupIds ?? []) as any[]).length > 0).length;
      if (midPayoffs398b === 0 && earlyPayoffs398b > 0 && latePayoffs398b > 0) {
        issues.push({
          location: `Payoff distribution — midpoint zone void (scenes ${mid40398b}–${mid60398b - 1})`,
          rule: 'PAYOFF_MIDPOINT_VOID',
          severity: 'minor',
          description: `No payoff lands in the 40%–60% pivot zone (scenes ${mid40398b}–${mid60398b - 1}), though payoffs exist in the first half (${earlyPayoffs398b}) and the second half (${latePayoffs398b}). The structural midpoint is where momentum pivots; closing a loop here acknowledges the turn and signals escalation ahead. A payoff-free midzone leaves the pivot narratively neutral — the story turns structurally but settles nothing in the moment.`,
          suggestedFix: 'Schedule one payoff inside the midpoint zone: a clue resolved at the pivot point gives the audience a sense of completion that resets expectations for the escalating back half. It also distinguishes Act 2a from Act 2b — one half builds, the midpoint closes, the other half escalates.',
        });
      }
    }
  }

  // CLUE_SEED_REVELATION_DECOUPLED (minor, n≥8, ≥2 seed scenes, ≥2 revelation scenes):
  // No clue-seeding scene coincides with a revelation — the story plants evidence and
  // makes disclosures in entirely separate moments. A scene where a clue is planted
  // alongside a revelation charges both: the disclosure makes the seed feel significant,
  // and the seed recontextualizes what was just revealed. Co-occurrence mode ×
  // seededClueIds × revelation channels. Distinct from CLUE_SEED_DRAMATIC_TURN_DECOUPLED
  // (dramaticTurn signal), CLUE_SEED_CLOCK_DECOUPLED (clock signal), and PAYOFF_
  // REVELATION_DISCONNECT (payoff side of revelation — this audits the seed side).
  if (records.length >= 8) {
    const seedRecs398c = (records as any[]).filter(r => ((r.seededClueIds ?? []) as any[]).length > 0);
    const revelRecs398c = (records as any[]).filter(r => r.revelation === true);
    if (seedRecs398c.length >= 2 && revelRecs398c.length >= 2) {
      const anySeedWithRevel398c = seedRecs398c.some(r => r.revelation === true);
      if (!anySeedWithRevel398c) {
        issues.push({
          location: 'Clue-seeding scenes — revelation decoupled',
          rule: 'CLUE_SEED_REVELATION_DECOUPLED',
          severity: 'minor',
          description: `The story has ${seedRecs398c.length} clue-seeding scene(s) and ${revelRecs398c.length} revelation scene(s), but none coincide — evidence is planted and disclosures are made in entirely separate moments. A clue planted alongside a revelation charges both: the disclosure makes the seed feel significant, and the seed recontextualizes what was just revealed. Keeping the two channels in separate scenes misses the compound effect of a scene that does both.`,
          suggestedFix: 'In at least one revelation scene, plant a clue within or immediately after the disclosure: as one secret is revealed, let it expose or imply another. A revelation that generates a new mystery — rather than simply closing one — keeps the audience actively processing rather than passively receiving.',
        });
      }
    }
  }

  // ── Wave 412: CLUE_SEED_CURIOSITY_PEAK_DECOUPLED, CLUE_SEED_SUSPENSE_PEAK_DECOUPLED, PAYOFF_RELATIONSHIP_PEAK_DECOUPLED ──

  // CLUE_SEED_CURIOSITY_PEAK_DECOUPLED (minor, n≥8, maxCuriosity>1, ≥2 seed scenes): The single
  // highest-curiosityDelta scene plants no clue, even though the story seeds clues elsewhere. The
  // moment the audience is most urgently wondering is not where the story plants anything to
  // wonder about later — peak intrigue and the act of foreshadowing never coincide. A clue
  // planted at the curiosity peak rides the audience's heightened attention, so the seed lands
  // when they are most likely to register and remember it. The seed-side mirror of PAYOFF_
  // CURIOSITY_PEAK_DECOUPLED; distinct from CLUE_SEED_CURIOSITY_FLAT (which averages curiosityDelta
  // across seed scenes — this isolates the single peak-curiosity scene and checks for a seed there).
  if (records.length >= 8) {
    const seedScenes412a = (records as any[]).filter(r => ((r.seededClueIds ?? []) as string[]).length > 0);
    const maxCur412a = Math.max(...(records as any[]).map(r => r.curiosityDelta ?? 0));
    if (seedScenes412a.length >= 2 && maxCur412a > 1) {
      const peakCur412a = (records as any[]).find(r => (r.curiosityDelta ?? 0) === maxCur412a);
      if (peakCur412a && ((peakCur412a.seededClueIds ?? []) as string[]).length === 0) {
        issues.push({
          location: `Scene ${peakCur412a.sceneIdx} — peak curiosity (${maxCur412a.toFixed(2)})`,
          rule: 'CLUE_SEED_CURIOSITY_PEAK_DECOUPLED',
          severity: 'minor',
          description: `The story's highest-curiosityDelta scene (Scene ${peakCur412a.sceneIdx}, curiosityDelta ${maxCur412a.toFixed(2)}) plants no clue, even though ${seedScenes412a.length} other scenes seed threads. The moment the audience is most urgently wondering is not where the story plants anything for them to wonder about later — peak intrigue and foreshadowing never coincide, so the seed that would benefit most from the audience's heightened attention is never dropped there.`,
          suggestedFix: 'Plant a clue at the peak-curiosity scene: when the audience is most alert and leaning in, slip in the detail you want them to carry. A seed dropped at the crest of curiosity is the one most likely to lodge — they are already scrutinizing the scene for answers, so the planted thread registers without being underlined.',
        });
      }
    }
  }

  // CLUE_SEED_SUSPENSE_PEAK_DECOUPLED (minor, n≥8, maxSuspense>1, ≥2 seed scenes): The single
  // highest-suspenseDelta scene plants no clue, even though the story seeds clues elsewhere. The
  // tensest moment in the story is not where any thread is planted — peak danger and foreshadowing
  // never share a scene. A clue planted under maximum tension reads as charged and dangerous, so
  // the audience remembers it as something that mattered in a moment that mattered. The seed-side
  // mirror of PAYOFF_SUSPENSE_PEAK_DECOUPLED; distinct from CLUE_SEED_SUSPENSE_FLAT (which audits
  // whether ALL seed scenes are tension-free on average — this isolates the single peak-suspense
  // scene and checks whether a seed lands there).
  if (records.length >= 8) {
    const seedScenes412b = (records as any[]).filter(r => ((r.seededClueIds ?? []) as string[]).length > 0);
    const maxSusp412b = Math.max(...(records as any[]).map(r => r.suspenseDelta ?? 0));
    if (seedScenes412b.length >= 2 && maxSusp412b > 1) {
      const peakSusp412b = (records as any[]).find(r => (r.suspenseDelta ?? 0) === maxSusp412b);
      if (peakSusp412b && ((peakSusp412b.seededClueIds ?? []) as string[]).length === 0) {
        issues.push({
          location: `Scene ${peakSusp412b.sceneIdx} — peak suspense (${maxSusp412b.toFixed(2)})`,
          rule: 'CLUE_SEED_SUSPENSE_PEAK_DECOUPLED',
          severity: 'minor',
          description: `The story's highest-suspenseDelta scene (Scene ${peakSusp412b.sceneIdx}, suspenseDelta ${maxSusp412b.toFixed(2)}) plants no clue, even though ${seedScenes412b.length} other scenes seed threads. The tensest moment in the story is not where any thread is planted — peak danger and foreshadowing never share a scene, so the seed that would feel most charged is never dropped where the pressure could brand it into the audience's memory.`,
          suggestedFix: 'Plant a clue at the peak-suspense scene: a detail glimpsed under threat, an object that matters seen in the middle of the danger. Tension makes a seed feel dangerous and therefore worth remembering — the audience encodes what they see in the scenes that frighten them most, so the highest-suspense beat is the most retentive place to foreshadow.',
        });
      }
    }
  }

  // PAYOFF_RELATIONSHIP_PEAK_DECOUPLED (minor, n≥8, ≥2 payoff scenes, peak relational shift > 0.4):
  // The scene carrying the story's single largest relational shift (the biggest rupture or repair)
  // resolves no planted setup, even though the story pays off threads elsewhere. The most
  // consequential relational moment and the satisfaction of a structural payoff never coincide:
  // the audience's biggest emotional-relational beat is not also the moment a long-running thread
  // snaps shut. A payoff that lands at the peak relational shift makes the structural and the
  // human climax the same beat. Single-peak isolation × relationship magnitude × payoff channel.
  // Distinct from PAYOFF_RELATIONSHIP_DECOUPLED (co-occurrence: NO payoff scene moves ANY bond —
  // this fires even when some payoffs move bonds, as long as the single biggest shift is not a
  // payoff) and from the curiosity/suspense peak-decoupled checks (different signal channels).
  if (records.length >= 8) {
    const payoffScenes412c = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as string[]).length > 0);
    if (payoffScenes412c.length >= 2) {
      let peakRelRec412c: any = null;
      let peakRelMag412c = 0;
      for (const r of records as any[]) {
        for (const s of (r.relationshipShifts ?? []) as Array<{ amount: number }>) {
          if (Math.abs(s.amount) > peakRelMag412c) {
            peakRelMag412c = Math.abs(s.amount);
            peakRelRec412c = r;
          }
        }
      }
      if (peakRelRec412c && peakRelMag412c > 0.4 && ((peakRelRec412c.payoffSetupIds ?? []) as string[]).length === 0) {
        issues.push({
          location: `Scene ${peakRelRec412c.sceneIdx} — peak relational shift (magnitude ${peakRelMag412c.toFixed(2)})`,
          rule: 'PAYOFF_RELATIONSHIP_PEAK_DECOUPLED',
          severity: 'minor',
          description: `The story's largest relational shift (magnitude ${peakRelMag412c.toFixed(2)} at Scene ${peakRelRec412c.sceneIdx}) carries no payoff, even though ${payoffScenes412c.length} other scenes resolve planted threads. The most consequential relational moment — the biggest rupture or repair in the story — is not also the moment a long-running thread snaps shut, so the human climax and the structural climax land in separate scenes and neither amplifies the other.`,
          suggestedFix: 'Land a payoff at the peak relational shift: arrange for the scene where a bond most decisively breaks or mends to also be the scene where a planted setup pays off. When the relational and structural climaxes coincide, the resolution of the plot thread and the resolution of the relationship reinforce each other — the audience feels both completions in a single beat.',
        });
      }
    }
  }

  // ── Wave 426: PAYOFF_AFTERMATH_QUESTION_VOID, PAYOFF_CONSECUTIVE_RUN, PAYOFF_RELATIONSHIP_VALENCE_UNIFORM ──

  // PAYOFF_AFTERMATH_QUESTION_VOID (sequence/aftermath, n≥10, ≥2 qualifying payoff scenes): Every
  // payoff scene that has at least two scenes after it is followed by two scenes that BOTH raise no
  // curiosity (curiosityDelta ≤ 0) AND plant no new clue (seededClueIds empty). A payoff closes a
  // loop, and the moment a question is answered the audience's forward pull momentarily slackens —
  // the story must immediately re-engage, opening a fresh question or planting a new thread in the
  // wake of the resolution. When every payoff is followed by a curiosity-flat, seed-empty stretch,
  // the story deflates a little with each closure and never rebuilds the pull it just spent.
  // Distinctness: this is the only sequence/aftermath check on the payoff channel. PAYOFF_CURIOSITY_
  // MISMATCH audits curiosity WITHIN payoff scenes (average), not the scenes AFTER. SETUP_PAYOFF_
  // DEAD_RUN catches a 6+ scene gap with no seed/payoff anywhere (connective tissue), not the
  // specific two-scene aftermath of each payoff. PAYOFF_FRONT_LOADED is a zone-timing measure.
  if (records.length >= 10) {
    const n426a = records.length;
    const qualifyingPayoffs426: any[] = [];
    for (let i = 0; i < n426a - 2; i++) {
      if ((((records as any[])[i].payoffSetupIds ?? []) as string[]).length > 0) {
        qualifyingPayoffs426.push(records[i]);
      }
    }
    if (qualifyingPayoffs426.length >= 2) {
      const allDeadEnded426 = qualifyingPayoffs426.every((r: any) => {
        const i = r.sceneIdx;
        // sceneIdx is the array index in these records; guard against gaps anyway.
        const a = (records as any[])[i + 1];
        const b = (records as any[])[i + 2];
        if (!a || !b) return false;
        const aFlat = (a.curiosityDelta ?? 0) <= 0 && ((a.seededClueIds ?? []) as string[]).length === 0;
        const bFlat = (b.curiosityDelta ?? 0) <= 0 && ((b.seededClueIds ?? []) as string[]).length === 0;
        return aFlat && bFlat;
      });
      if (allDeadEnded426) {
        issues.push({
          location: `${qualifyingPayoffs426.length} payoff scene(s) — aftermath`,
          rule: 'PAYOFF_AFTERMATH_QUESTION_VOID',
          severity: 'minor',
          description: `Every payoff scene with room after it (${qualifyingPayoffs426.length} in total) is followed by two scenes that raise no curiosity and plant no new clue. Each resolution closes a loop and then lets the air out: the moment a question is answered the audience's forward pull slackens, and nothing in the next two scenes re-engages it. The story deflates a little with every payoff and never rebuilds the pull it just spent.`,
          suggestedFix: 'Re-engage immediately after each payoff: in the scene that closes a thread or the one right after, open a new question, plant a fresh clue, or expose a consequence that complicates what was just resolved. A payoff should feel like one wave receding as the next rises — not the tide going out.',
        });
      }
    }
  }

  // PAYOFF_CONSECUTIVE_RUN (run-based, n≥8): Three or more consecutive scenes each fire at least
  // one payoff — a "resolution avalanche" where the story spends a back-to-back stretch closing
  // threads with no scene of rebuild or new tension between them. Payoffs land hardest when they
  // are spaced so each closure can register and the story can re-pressurize before the next; firing
  // them in an unbroken run blurs the individual satisfactions together and burns through the
  // story's stored questions all at once, leaving the remainder of the script with nothing left to
  // resolve.
  // Distinctness: CLUSTERED_PAYOFFS counts 3+ setups resolved in a SINGLE scene (intra-scene
  // density); this counts payoffs firing across 3+ CONSECUTIVE scenes (inter-scene run). THREAD_
  // CONVERGENCE_ABSENT is the opposite failure (payoffs resolving in isolation, never adjacent).
  // PAYOFF_FRONT_LOADED is a zone-proportion measure, not a local consecutive run.
  if (records.length >= 8) {
    const hasPayoff426 = (r: any) => (((r.payoffSetupIds ?? []) as string[]).length) > 0;
    let runStart426 = -1;
    let runLen426 = 0;
    let bestStart426 = -1;
    for (let i = 0; i < records.length; i++) {
      if (hasPayoff426((records as any[])[i])) {
        if (runLen426 === 0) runStart426 = i;
        runLen426++;
        if (runLen426 >= 3 && bestStart426 < 0) bestStart426 = runStart426;
      } else {
        runLen426 = 0;
      }
    }
    if (bestStart426 >= 0) {
      // Recompute the actual length of the run that triggered (for the message).
      let len426 = 0;
      for (let i = bestStart426; i < records.length && hasPayoff426((records as any[])[i]); i++) len426++;
      issues.push({
        location: `Scenes ${bestStart426}–${bestStart426 + len426 - 1} — consecutive payoffs`,
        rule: 'PAYOFF_CONSECUTIVE_RUN',
        severity: 'minor',
        description: `Scenes ${bestStart426}–${bestStart426 + len426 - 1} each fire a payoff — ${len426} consecutive scenes of resolution with no rebuild between them. A back-to-back run of closures blurs the individual satisfactions together and spends the story's stored questions all at once; payoffs land hardest when they are spaced so each can register and the story can re-pressurize before the next arrives.`,
        suggestedFix: 'Interleave the payoffs with rebuilds: between two resolutions, give the story a scene that raises a new stake, deepens a complication, or opens a fresh question. Spreading closures across the act lets each one breathe and keeps the engine from emptying its tank in a single stretch.',
      });
    }
  }

  // PAYOFF_RELATIONSHIP_VALENCE_UNIFORM (valence, n≥8, ≥3 relational-moving payoff shifts): Among
  // the payoff scenes that DO move a bond (a relationshipShift with |amount| ≥ 0.3), every such
  // shift carries the same sign — the story's resolutions are ruptures-only or repairs-only. When
  // every thread that closes also breaks a bond (and none mends one), or vice versa, the resolution
  // phase has a monotone relational color: the audience experiences the payoffs as a uniform wave of
  // loss or a uniform wave of reconciliation, with no counterpoint. A resonant payoff structure pays
  // some threads off as repairs and others as ruptures, so the ending's relational texture is mixed.
  // Distinctness: PAYOFF_RELATIONSHIP_DECOUPLED fires when NO payoff scene moves ANY bond (the
  // machine is decoupled from relationships entirely); this fires precisely when payoffs DO move
  // bonds, but all in one direction. PAYOFF_RELATIONSHIP_PEAK_DECOUPLED is a single-peak isolation
  // check (the biggest shift isn't a payoff), not a valence/direction check across all payoff shifts.
  if (records.length >= 8) {
    const payoffRelShifts426: number[] = [];
    for (const r of records as any[]) {
      if ((((r.payoffSetupIds ?? []) as string[]).length) > 0) {
        for (const s of (r.relationshipShifts ?? []) as Array<{ amount: number }>) {
          if (Math.abs(s.amount) >= 0.3) payoffRelShifts426.push(s.amount);
        }
      }
    }
    if (payoffRelShifts426.length >= 3) {
      const allPositive426 = payoffRelShifts426.every(a => a >= 0.3);
      const allNegative426 = payoffRelShifts426.every(a => a <= -0.3);
      if (allPositive426 || allNegative426) {
        const dir426 = allPositive426 ? 'repairs' : 'ruptures';
        issues.push({
          location: `${payoffRelShifts426.length} relational shifts on payoff scenes`,
          rule: 'PAYOFF_RELATIONSHIP_VALENCE_UNIFORM',
          severity: 'minor',
          description: `All ${payoffRelShifts426.length} relationship shifts that occur on payoff scenes are ${dir426} (same sign). The story's resolutions move bonds in only one direction — every thread that closes also ${allPositive426 ? 'mends' : 'breaks'} a relationship, and none does the reverse. The resolution phase reads as a monotone wave of ${allPositive426 ? 'reconciliation' : 'loss'} with no counterpoint, flattening the relational texture of the ending.`,
          suggestedFix: `Vary the relational valence of the payoffs: let at least one thread close in a way that ${allPositive426 ? 'costs a bond — a victory that estranges, a truth that wounds' : 'mends a bond — a reconciliation, a debt forgiven, an alliance sealed'}. An ending whose resolutions cut both ways feels truer than one where every closure pulls the same emotional direction.`,
        });
      }
    }
  }

  // ── Wave 440: PAYOFF_BACKLOADED, PAYOFF_EMOTIONAL_RECOIL_ABSENT, PAYOFF_SUSPENSE_RECOIL_ABSENT ──

  // PAYOFF_BACKLOADED (minor, ≥3 payoffs, n≥8, >70% in second half): More than 70% of all
  // payoffs land in the second half of the story while the first half has fewer than 30%.
  // The distribution mirror of PAYOFF_FRONT_LOADED (which fires when >60% land in the first
  // half). When almost all resolutions are withheld until the second half, the first half of
  // the story functions entirely as setup with no earned satisfaction — no thread closes, no
  // investment is returned, and the audience receives no confirmation that the payoff machine
  // is working. A story with no payoffs in the first half also denies itself the narrative
  // technique of the early payoff that reframes the setup: the mid-story twist that pays off
  // something the audience didn't know was a setup until it resolved. Distribution/timing ×
  // underweight/bloat mode. Distinct from PAYOFF_FRONT_LOADED (Wave 261: >60% in first half
  // — the opposite imbalance), PAYOFF_ACT3_ABSENT (Wave 370: zero payoffs in Act 3 final 25%
  // — a zone void, not a proportion), ACT_2A_PAYOFF_VOID (Wave 275: zero payoffs in Act 2a
  // 25–50% zone — a zone void), and UNRESOLVED_CLUE_RATIO_HIGH (Wave 317: percentage of clue
  // IDs still open at the end — a different measure of unresolved threads by identity, not
  // scene-timing distribution).
  if (payoffInfo.size >= 3 && records.length >= 8) {
    const midpoint440a = Math.floor(records.length / 2);
    const firstHalfPayoffs440a = [...payoffInfo.values()].filter(s => s < midpoint440a).length;
    const backRatio440a = 1 - firstHalfPayoffs440a / payoffInfo.size;
    if (backRatio440a > 0.70) {
      const backHalfCount440a = payoffInfo.size - firstHalfPayoffs440a;
      issues.push({
        location: `Payoff distribution (${backHalfCount440a} of ${payoffInfo.size} in second half)`,
        rule: 'PAYOFF_BACKLOADED',
        severity: 'minor',
        description: `${backHalfCount440a} of ${payoffInfo.size} payoffs (${Math.round(backRatio440a * 100)}%) land in the second half of the story — the resolution engine is severely back-loaded. The first half resolves almost nothing: the audience plants questions throughout setup with no payoffs returned until after the midpoint, receiving no confirmation that the payoff machine is working and no early reframings of threads they didn't know were setups. A first half with no payoffs treats every seed as pure promise deferred, and the second half must work through all of it.`,
        suggestedFix: 'Move at least one payoff into the first half: a minor thread that resolves early to prove the machine is running, to reward the audience\'s attention, and to set up the richer payoffs that follow. An early payoff that reframes what came before it ("that wasn\'t setup, it was this all along") is especially powerful — it rewards re-reading while keeping the first-half investment active.',
      });
    }
  }

  // PAYOFF_EMOTIONAL_RECOIL_ABSENT (minor, n≥8, ≥2 qualifying payoff scenes): No payoff scene
  // (with at least 2 scenes remaining after it) is followed by a negative emotional shift
  // (emotionalShift = 'negative') in the next two scenes. When threads close, the closures
  // should sometimes produce grief, loss, disillusionment, or emotional cost in the scenes that
  // follow: a truth revealed that wounds, a victory that costs something, a question answered
  // that opens a worse one. When every payoff's aftermath stays emotionally neutral or positive,
  // resolutions feel consequence-free — the story ties its threads and moves on without
  // emotional weight. The absence of negative emotional recoil after payoffs teaches the audience
  // that closures are clean events rather than moments of genuine reckoning. Sequence/aftermath
  // mode × negative-emotion channel. Distinct from PAYOFF_EMOTION_DECOUPLED (Wave 317: the
  // payoff SCENES themselves are all emotionally neutral — this fires even when payoff scenes
  // have positive emotion, as long as the aftermath lacks negative recoil), PAYOFF_AFTERMATH_
  // QUESTION_VOID (Wave 426: aftermath lacks curiosity or seeds — curiosity/seed channel, not
  // emotional channel), and PAYOFF_SUSPENSE_RECOIL_ABSENT (Wave 440, same wave: suspense
  // channel of the aftermath window). This is the first check to audit the negative-emotion
  // dimension of the 2-scene aftermath following payoffs.
  if (records.length >= 8) {
    const qualPayoffs440b: number[] = [];
    for (let i = 0; i < records.length - 2; i++) {
      if ((((records as any[])[i].payoffSetupIds ?? []) as string[]).length > 0) {
        qualPayoffs440b.push(i);
      }
    }
    if (qualPayoffs440b.length >= 2) {
      const anyNegRecoil440b = qualPayoffs440b.some(idx => {
        for (let off = 1; off <= 2; off++) {
          if (idx + off < records.length && (records as any[])[idx + off].emotionalShift === 'negative') return true;
        }
        return false;
      });
      if (!anyNegRecoil440b) {
        issues.push({
          location: `All ${qualPayoffs440b.length} qualifying payoff scene(s) — no negative emotional aftermath`,
          rule: 'PAYOFF_EMOTIONAL_RECOIL_ABSENT',
          severity: 'minor',
          description: `None of the story's ${qualPayoffs440b.length} payoff scenes (that have at least 2 scenes following them) is followed by a negative emotional shift within the next two scenes. When threads close, some resolutions should produce grief, loss, disillusionment, or emotional cost: a truth that wounds, a victory that costs something, an answer that opens a worse question. When every payoff's aftermath stays emotionally neutral or positive, the resolutions feel consequence-free — the story ties its bows without emotional weight, and the audience learns that closures are clean transactions rather than moments of genuine reckoning.`,
          suggestedFix: 'Let at least one payoff produce negative emotional fallout in the scene or two that follow: a revelation that changes how the protagonist sees themselves, a victory won at a cost that the audience feels, an answer that makes the problem look worse rather than better. The best payoffs earn their emotional cost — the closure that brings grief lands harder than the one that simply concludes.',
        });
      }
    }
  }

  // PAYOFF_SUSPENSE_RECOIL_ABSENT (minor, n≥8, ≥2 qualifying payoff scenes): No payoff scene
  // (with at least 2 scenes remaining after it) is followed by a positive suspenseDelta in the
  // next two scenes. When threads close, the resolution should often create new pressure:
  // completing one arc exposes a deeper problem, the answer reveals a new danger, the closed
  // loop unmasks what was hidden behind it. When every payoff's aftermath is suspense-flat, the
  // resolutions feel hermetically sealed — they close the old without creating pressure for the
  // new. The story's threads resolve but generate no forward momentum in the tension channel,
  // so payoffs feel like endpoints rather than turning points. Sequence/aftermath mode × suspense
  // channel. Distinct from PAYOFF_SUSPENSE_MISMATCH (Wave 289: the payoff scenes' own average
  // suspenseDelta ≤ 0 — the suspense IN the payoff scene, not its aftermath), PAYOFF_AFTERMATH_
  // QUESTION_VOID (Wave 426: curiosity/seed channel aftermath), PAYOFF_EMOTIONAL_RECOIL_ABSENT
  // (Wave 440, same wave: negative-emotion aftermath channel). This completes the aftermath-
  // channel family: curiosity/seed (Wave 426), negative emotion (this wave), suspense (this wave).
  if (records.length >= 8) {
    const qualPayoffs440c: number[] = [];
    for (let i = 0; i < records.length - 2; i++) {
      if ((((records as any[])[i].payoffSetupIds ?? []) as string[]).length > 0) {
        qualPayoffs440c.push(i);
      }
    }
    if (qualPayoffs440c.length >= 2) {
      const anySuspRecoil440c = qualPayoffs440c.some(idx => {
        for (let off = 1; off <= 2; off++) {
          if (idx + off < records.length && ((records as any[])[idx + off].suspenseDelta ?? 0) > 0) return true;
        }
        return false;
      });
      if (!anySuspRecoil440c) {
        issues.push({
          location: `All ${qualPayoffs440c.length} qualifying payoff scene(s) — no suspense recoil`,
          rule: 'PAYOFF_SUSPENSE_RECOIL_ABSENT',
          severity: 'minor',
          description: `None of the story's ${qualPayoffs440c.length} payoff scenes (that have at least 2 scenes following them) is followed by a positive suspenseDelta within the next two scenes — resolutions never generate new pressure downstream. When threads close, the resolution should often precipitate new tension: the answer reveals a worse problem, the closed loop exposes a deeper danger, the completed arc unmasks something lurking behind it. When every payoff's aftermath is suspense-flat, the resolutions feel like endpoints rather than turning points — they close the old without opening the new pressure that would keep the audience leaning forward.`,
          suggestedFix: 'Let at least one payoff create new pressure in the scene or two that follow: resolve one thread in a way that immediately exposes a deeper problem, use the answer to a question to reveal that the stakes were higher than the audience knew, or let the closing of one loop open a worse one. The payoff that generates suspense in its aftermath is more powerful than the one that simply concludes — it tells the audience that resolutions are not safe harbours but transitions to the next danger.',
        });
      }
    }
  }

  // ── Wave 454: PAYOFF_CAUSELESS, CLUE_SEED_CAUSELESS, CLUE_SEED_CONSECUTIVE_RUN ──

  // PAYOFF_CAUSELESS — Backward-cause × payoff signal (n≥8, ≥2 payoffs, all payoffs
  // lack an upstream trigger in the prior 3 scenes). When no payoff is preceded by a
  // revelation, a dramatic turn, or a high-suspense push in the 3 scenes before it,
  // resolutions arrive without any narrative momentum building toward them: threads
  // close because the plot requires it, not because something happened to make the
  // audience feel the resolution was earned. Backward-cause mode × payoff signal.
  // Distinct from PAYOFF_REVELATION_DISCONNECT (Wave 289: co-occurrence — payoffs fire
  // without revelations in the SAME or nearby scene; this is backward-cause checking the
  // PRIOR 3 scenes for ANY escalating trigger: revelation OR dramatic turn OR suspense peak),
  // PAYOFF_PRECEDES_SETUP (Wave 261: temporal ordering — payoff before setup causality;
  // this is about upstream momentum, not ordering), and all aftermath checks (Waves 426/440:
  // look FORWARD from payoff, not backward at what preceded it).
  if (records.length >= 8) {
    const payoffIdxs454a = (records as any[])
      .map((r, i) => (((r.payoffSetupIds ?? []) as string[]).length > 0 ? i : -1))
      .filter(i => i >= 0);
    if (payoffIdxs454a.length >= 2) {
      const hasUpstreamTrigger454a = (idx: number): boolean => {
        for (let off = 1; off <= 3; off++) {
          if (idx - off < 0) continue;
          const prev = (records as any[])[idx - off];
          if ((prev.revelation ?? null) === true) return true;
          if ((prev.dramaticTurn ?? 'nothing') !== 'nothing') return true;
          if ((prev.suspenseDelta ?? 0) > 1) return true;
        }
        return false;
      };
      const allCauseless454a = payoffIdxs454a.every(idx => !hasUpstreamTrigger454a(idx));
      if (allCauseless454a) {
        issues.push({
          location: `All ${payoffIdxs454a.length} payoff scene(s) — no upstream narrative trigger`,
          rule: 'PAYOFF_CAUSELESS',
          severity: 'minor',
          description: `None of the story's ${payoffIdxs454a.length} payoff scenes is preceded by a revelation, a dramatic turn, or a high-suspense moment (suspenseDelta > 1) in the prior three scenes — resolutions arrive without any narrative escalation building toward them. Payoffs feel earned when the three preceding scenes have been building pressure, revealing new information, or pivoting the story: the audience senses the resolution is inevitable because something caused it. When every payoff fires into narrative dead air, the thread closures feel mechanically obligatory rather than dramatically necessary — they conclude because the plot requires them to, not because the story has generated the momentum that makes their arrival feel right.`,
          suggestedFix: `Before at least one payoff scene, build upstream momentum in the prior two or three scenes: surface a revelation that makes the resolution inevitable, include a dramatic turn that recontextualizes the thread, or raise suspense so that the payoff arrives as release rather than random event. The three scenes before a payoff are the runway — give the resolution somewhere to land from.`,
        });
      }
    }
  }

  // CLUE_SEED_CAUSELESS — Backward-cause × clue-seed signal (n≥8, ≥3 seed scenes, all
  // seeds lack upstream momentum in prior 2 scenes). When no clue-seeding scene is preceded
  // by a curiosity rise, an emotional charge, or a revelation in the 2 scenes before it,
  // evidence is planted into narrative dead air: the audience has no reason to notice or
  // retain the clue because nothing has heightened their attention immediately before it.
  // Distinct from PAYOFF_CAUSELESS (Wave 454, above: backward-cause × payoff — different
  // target signal and different upstream triggers checked), CLUE_SEED_CURIOSITY_FLAT (Wave
  // 328: the seed scene's own curiosityDelta ≤ 0 — a co-occurrence check on the scene itself;
  // this is backward-cause checking the PRIOR scenes for evidence-priming momentum),
  // CLUE_SEED_REVELATION_DECOUPLED (Wave 398: co-occurrence — seed and revelation never
  // in the same scene; this checks whether upstream revelation preceded the seed by 1-2 scenes).
  if (records.length >= 8) {
    const seedIdxs454b = (records as any[])
      .map((r, i) => (((r.seededClueIds ?? []) as string[]).length > 0 ? i : -1))
      .filter(i => i >= 0);
    if (seedIdxs454b.length >= 3) {
      const hasUpstreamMomentum454b = (idx: number): boolean => {
        for (let off = 1; off <= 2; off++) {
          if (idx - off < 0) continue;
          const prev = (records as any[])[idx - off];
          if ((prev.curiosityDelta ?? 0) > 0) return true;
          if ((prev.emotionalShift ?? 'neutral') !== 'neutral') return true;
          if ((prev.revelation ?? null) === true) return true;
        }
        return false;
      };
      const allSeedCauseless454b = seedIdxs454b.every(idx => !hasUpstreamMomentum454b(idx));
      if (allSeedCauseless454b) {
        issues.push({
          location: `All ${seedIdxs454b.length} clue-seeding scene(s) — no upstream priming`,
          rule: 'CLUE_SEED_CAUSELESS',
          severity: 'minor',
          description: `None of the story's ${seedIdxs454b.length} clue-seeding scenes is preceded by a curiosity rise, an emotional shift, or a revelation in the prior two scenes — evidence is planted into narrative dead air. Clues land best when the audience is already heightened: a curiosity rise makes them lean in and notice new information, a preceding revelation primes them to receive more, an emotional charge makes them alert. When every clue is planted without any upstream priming, the audience has no reason to register the evidence at the moment of planting — the seed fails to take root because the soil has not been prepared.`,
          suggestedFix: `Before at least one clue-seeding scene, prime the audience with a curiosity rise, a revelation, or an emotional moment in the scene or two before it. When a clue is planted immediately after the audience has been made alert — a revelation that raises a new question, an emotional peak that has them leaning in — the evidence is more likely to register and be retained. Even a small curiosity push in the preceding scene can function as a priming signal that makes the clue feel significant rather than incidental.`,
        });
      }
    }
  }

  // CLUE_SEED_CONSECUTIVE_RUN — Run-based × clue-seed signal (n≥10, ≥3 seed scenes,
  // max consecutive seed run ≥ 3). Three or more consecutive scenes each planting a new
  // clue creates an "evidence avalanche" — the audience is overwhelmed with simultaneous
  // information before they can form emotional attachment to any individual thread. The most
  // memorable clues are those planted in isolation, given room to register before the next
  // one arrives. Run-based mode × clue-seed signal.
  // Distinct from PAYOFF_CONSECUTIVE_RUN (Wave 426: run-based × payoff signal — a parallel
  // check for resolution clustering on the payoff side of the machine; this checks the planting
  // side), CLUSTERED_PAYOFFS (Wave 154: many payoffs in ONE scene — single-scene bloat, not a
  // consecutive-scene run), SETUP_PAYOFF_DEAD_RUN (Wave 342: run-based × both signals absent
  // — a dead stretch with no seeds or payoffs; this fires on the opposite problem, a live stretch
  // with seeds in every consecutive scene), and LATE_MAJORITY_CLUE_SEEDING (Wave 275:
  // distribution/timing — >60% of seeds in second half, a global distribution check).
  if (records.length >= 10) {
    const isSeedScene454c = (records as any[]).map(r => (((r.seededClueIds ?? []) as string[]).length > 0));
    const totalSeeds454c = isSeedScene454c.filter(Boolean).length;
    if (totalSeeds454c >= 3) {
      let maxSeedRun454c = 0, curSeedRun454c = 0;
      let maxSeedRunStart454c = -1, curSeedRunStart454c = -1;
      for (let i = 0; i < records.length; i++) {
        if (isSeedScene454c[i]) {
          if (curSeedRun454c === 0) curSeedRunStart454c = i;
          if (++curSeedRun454c > maxSeedRun454c) {
            maxSeedRun454c = curSeedRun454c;
            maxSeedRunStart454c = curSeedRunStart454c;
          }
        } else { curSeedRun454c = 0; }
      }
      if (maxSeedRun454c >= 3) {
        issues.push({
          location: `Scenes ${maxSeedRunStart454c + 1}–${maxSeedRunStart454c + maxSeedRun454c}: consecutive clue-seeding run`,
          rule: 'CLUE_SEED_CONSECUTIVE_RUN',
          severity: 'minor',
          description: `A run of ${maxSeedRun454c} consecutive scenes each plant a new clue — an evidence avalanche that delivers multiple new threads to the audience simultaneously without space to absorb them. The most memorable clues are planted in isolation: given a scene to breathe in, allowed to register before the next mystery arrives. When three or more seeds land back-to-back, the audience's finite attention is divided across all of them simultaneously, reducing each thread's individual impact. A concentrated seed-run also signals structural front-loading — the planting machinery is overactive in one zone while other zones have nothing to wonder about.`,
          suggestedFix: `Spread the clue-seeding across the run — intersperse at least one non-seed scene between consecutive plants. Use the non-seed scene to give the most recent clue room to breathe: a character reaction, a quiet beat where the implication lands, or simply a scene that does not introduce new evidence. An isolated clue — placed alone, given space — registers more deeply and generates more sustained curiosity than a cluster of three planted in rapid succession.`,
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
