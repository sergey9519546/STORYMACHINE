// Change-Impact surface — deterministic "what breaks if I change this?" analysis.
//
// The product wedge from RESEARCH_INTEGRATION_2026-07-11.md §2 A1: when a writer
// edits scene N, they need to know which downstream scenes depend on it and what
// specific narrative threads would be affected. This is pure dependency traversal
// over the existing FountainAnalysis data — no LLM, no new heuristics, just
// structured reporting of what the engine already tracks.
//
// INPUTS: sceneIdx (which scene is being edited) + FountainAnalysis (the full
//         screenplay's dependency graph).
// OUTPUT: ChangeImpactReport — downstream scenes affected, specific dependencies
//         (clue payoffs, character threads, questions answered), and severity.
//
// DESIGN: Every dependency type flows one direction (setup → payoff, question →
//         answer, seed → reveal). Changing scene N breaks downstream scenes that
//         reference content established in N. Impact severity classifies whether
//         the dependency is critical (a payoff loses its setup) vs. potentially
//         affected (a character relationship changes).

import type { FountainAnalysis } from './types.ts';

/** A specific downstream dependency that would be affected by changing the
 *  source scene. Each type corresponds to a tracked signal in
 *  ScreenplaySceneRecord (see screenplay/memory.ts). */
export interface Dependency {
  /** Which narrative mechanism creates this dependency. */
  type: 'clue-payoff' | 'question-answer' | 'character-relationship' | 'dramatic-turn' | 'revelation';
  /** The downstream scene index that depends on the source scene. */
  downstreamSceneIdx: number;
  /** Plain-language description of what breaks, e.g. "Payoff of clue 'brass-key'
   *  in Scene 12 loses its setup from Scene 3". */
  description: string;
  /** Structural identifier for this dependency (clue id, question fingerprint,
   *  character pair key, etc.) — used for deduplication and grouping. */
  dependencyId: string;
}

/** How severely would changing the source scene affect the screenplay's
 *  structural integrity? */
export type ImpactSeverity =
  /** Breaking: downstream payoffs, answers, or reveals lose their essential
   *  setup. The screenplay's causal chain is compromised. */
  | 'breaking'
  /** Potentially affected: character relationships, ongoing threads, or
   *  thematic elements touch this scene but could survive an edit. */
  | 'potentially-affected'
  /** Isolated: no downstream dependencies detected — the scene stands alone
   *  structurally (though it may still serve narrative purposes like pacing or
   *  character moments that this analysis doesn't capture). */
  | 'isolated';

/** The structured answer to "what breaks if I change scene N?" */
export interface ChangeImpactReport {
  /** The scene being analyzed for impact. */
  sourceSceneIdx: number;
  /** Overall impact severity (worst case across all dependencies). */
  severity: ImpactSeverity;
  /** All downstream dependencies, grouped by type. */
  dependencies: Dependency[];
  /** Unique downstream scene indices affected (sorted ascending). Distinct from
   *  dependencies.length because multiple dependencies can point to the same
   *  downstream scene (e.g., scene 12 both answers a question AND pays off a
   *  clue, both seeded in scene 3). */
  affectedScenes: number[];
  /** Count by dependency type for quick scanning. */
  summary: {
    cluePayoffs: number;
    questionAnswers: number;
    characterRelationships: number;
    dramaticTurns: number;
    revelations: number;
  };
}

/** Compute change-impact for a specific scene. Pure function: same input always
 *  produces the same output, no LLM, no I/O. Guards against out-of-bounds
 *  sceneIdx by returning an isolated report rather than throwing.
 *
 *  ALGORITHM: For each tracked dependency type, scan records[sourceSceneIdx]
 *  for seeds/setups, then scan all later records for matching payoffs/resolutions.
 *  Breaking dependencies (clue payoffs, question answers, revelations that
 *  reference prior content) elevate severity to 'breaking'; non-breaking
 *  dependencies (character relationships, dramatic turns that cascade) are
 *  'potentially-affected'. No dependencies at all → 'isolated'.
 *
 *  MEASUREMENT DISCIPLINE: Before shipping, measure against the real corpus:
 *  editing an isolated scene (e.g., a breather beat with no clues/questions
 *  seeded) should report 'isolated'; editing a key setup scene (e.g., the
 *  opening of a mystery) should report multiple 'breaking' dependencies. See
 *  change-impact.test.ts for the fire/no-fire cases. */
export function analyzeChangeImpact(
  analysis: FountainAnalysis,
  sceneIdx: number,
): ChangeImpactReport {
  // Guard: out-of-bounds or degenerate input → isolated report.
  if (sceneIdx < 0 || sceneIdx >= analysis.records.length || analysis.records.length === 0) {
    return {
      sourceSceneIdx: sceneIdx,
      severity: 'isolated',
      dependencies: [],
      affectedScenes: [],
      summary: {
        cluePayoffs: 0,
        questionAnswers: 0,
        characterRelationships: 0,
        dramaticTurns: 0,
        revelations: 0,
      },
    };
  }

  const sourceScene = analysis.records[sceneIdx];
  const dependencies: Dependency[] = [];

  // ── Clue lifecycle: seededClueIds → downstream payoffSetupIds ────────────
  // BREAKING severity: a payoff that loses its setup is a narrative hole.
  const seededClues = sourceScene.seededClueIds ?? [];
  for (const clueId of seededClues) {
    // Scan downstream scenes (sceneIdx + 1 onward) for payoffs of this clue.
    for (let i = sceneIdx + 1; i < analysis.records.length; i++) {
      const downstreamScene = analysis.records[i];
      const payoffs = downstreamScene.payoffSetupIds ?? [];
      if (payoffs.includes(clueId)) {
        dependencies.push({
          type: 'clue-payoff',
          downstreamSceneIdx: i,
          description: `Payoff of clue '${clueId}' in Scene ${i + 1} (${downstreamScene.slug}) loses its setup from Scene ${sceneIdx + 1}`,
          dependencyId: `clue:${clueId}:${i}`,
        });
      }
    }
  }

  // ── Question-answer latency: questionsRaised → downstream questionsResolved ──
  // HEURISTIC: We don't have per-question IDs in the current schema (just counts),
  // so we can only detect "Scene N raises questions AND Scene M > N resolves
  // questions" as a potential dependency. This is conservative: it may
  // over-report (Scene M's answers might not be for Scene N's questions), but
  // it's honest about uncertainty. A future enhancement could track question
  // fingerprints end-to-end (see fountain-analyzer.ts's detectQuestionLatency
  // for the extraction machinery).
  //
  // POTENTIALLY-AFFECTED severity: questions can be reframed or their answers
  // can come from different sources, so this is less structurally breaking than
  // a clue payoff disappearing entirely.
  const questionsRaised = sourceScene.questionsRaised ?? 0;
  if (questionsRaised > 0) {
    for (let i = sceneIdx + 1; i < analysis.records.length; i++) {
      const downstreamScene = analysis.records[i];
      const questionsResolved = downstreamScene.questionsResolved ?? 0;
      if (questionsResolved > 0) {
        // Conservative dependency: this scene MIGHT answer questions from the
        // source scene. We flag it but don't elevate to 'breaking' severity.
        dependencies.push({
          type: 'question-answer',
          downstreamSceneIdx: i,
          description: `Scene ${i + 1} (${downstreamScene.slug}) resolves ${questionsResolved} question(s), potentially including questions raised in Scene ${sceneIdx + 1}`,
          dependencyId: `question:${sceneIdx}:${i}`,
        });
      }
    }
  }

  // ── Character relationships: relationshipShifts seeded here, referenced later ──
  // POTENTIALLY-AFFECTED severity: a relationship established/shifted in Scene N
  // informs later scenes featuring the same character pair, but those scenes
  // could survive a rewrite (the relationship is context, not a hard setup/payoff).
  const relationshipShifts = sourceScene.relationshipShifts ?? [];
  const affectedPairs = new Set<string>();
  for (const shift of relationshipShifts) {
    affectedPairs.add(shift.pairKey);
  }

  if (affectedPairs.size > 0) {
    for (let i = sceneIdx + 1; i < analysis.records.length; i++) {
      const downstreamScene = analysis.records[i];
      const downstreamShifts = downstreamScene.relationshipShifts ?? [];
      for (const downstreamShift of downstreamShifts) {
        if (affectedPairs.has(downstreamShift.pairKey)) {
          // Deduplicate: only report each (pairKey, downstreamSceneIdx) once.
          const depId = `relationship:${downstreamShift.pairKey}:${i}`;
          if (!dependencies.some(d => d.dependencyId === depId)) {
            dependencies.push({
              type: 'character-relationship',
              downstreamSceneIdx: i,
              description: `Scene ${i + 1} (${downstreamScene.slug}) continues relationship thread '${downstreamShift.pairKey}' established in Scene ${sceneIdx + 1}`,
              dependencyId: depId,
            });
          }
        }
      }
    }
  }

  // ── Dramatic turns and revelations: narrative pivots that cascade ───────────
  // POTENTIALLY-AFFECTED severity: a dramatic turn or revelation in Scene N
  // doesn't create a hard setup/payoff (those are tracked via clues), but it
  // does establish narrative facts or shifts that later scenes may reference.
  // We detect this conservatively: if Scene N has a revelation or dramatic turn,
  // flag downstream scenes that ALSO have revelations/turns as potentially
  // connected (the later beat may build on or contradict the earlier one).
  if (sourceScene.revelation !== null || sourceScene.dramaticTurn !== '') {
    for (let i = sceneIdx + 1; i < analysis.records.length; i++) {
      const downstreamScene = analysis.records[i];
      // Heuristic: downstream revelations/turns create a narrative thread.
      if (downstreamScene.revelation !== null || downstreamScene.dramaticTurn !== '') {
        // Don't duplicate if we already flagged this scene via another mechanism.
        const existingDep = dependencies.find(d => d.downstreamSceneIdx === i);
        if (!existingDep) {
          dependencies.push({
            type: sourceScene.revelation !== null ? 'revelation' : 'dramatic-turn',
            downstreamSceneIdx: i,
            description: `Scene ${i + 1} (${downstreamScene.slug}) may build on the ${sourceScene.revelation !== null ? 'revelation' : 'dramatic turn'} from Scene ${sceneIdx + 1}`,
            dependencyId: `narrative:${sceneIdx}:${i}`,
          });
        }
      }
    }
  }

  // ── Compute severity and summary ────────────────────────────────────────────
  const cluePayoffs = dependencies.filter(d => d.type === 'clue-payoff').length;
  const questionAnswers = dependencies.filter(d => d.type === 'question-answer').length;
  const characterRelationships = dependencies.filter(d => d.type === 'character-relationship').length;
  const dramaticTurns = dependencies.filter(d => d.type === 'dramatic-turn').length;
  const revelations = dependencies.filter(d => d.type === 'revelation').length;

  // Severity: 'breaking' if any clue payoffs (hard structural dependency),
  // 'potentially-affected' if any other dependencies, 'isolated' if none.
  let severity: ImpactSeverity = 'isolated';
  if (cluePayoffs > 0) {
    severity = 'breaking';
  } else if (dependencies.length > 0) {
    severity = 'potentially-affected';
  }

  // Collect unique affected scene indices.
  const affectedScenes = [...new Set(dependencies.map(d => d.downstreamSceneIdx))].sort((a, b) => a - b);

  return {
    sourceSceneIdx: sceneIdx,
    severity,
    dependencies,
    affectedScenes,
    summary: {
      cluePayoffs,
      questionAnswers,
      characterRelationships,
      dramaticTurns,
      revelations,
    },
  };
}
