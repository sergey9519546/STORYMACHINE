// What-If Lab materialisation — DETERMINISTIC, KEYLESS.
//
// THE GAP THIS CLOSES. Until this module existed, a What-If branch was a
// `StoryOp[]` and nothing else (see ExploreBranch in ./explore.ts). StoryOp
// (server/nvm/ops/StoryOp.ts) carries no prose anywhere in its 14-kind union —
// ADD_FACT is a subject/predicate/object triple, UPDATE_BELIEF is a
// proposition string, SHIFT_RELATIONSHIP is a dimension + signed amount, and
// StoryCommit's only positional field is an integer `sceneIdx`. So a branch
// had no text, and with no text there was nothing for the Script Doctor
// (server/nvm/analyze/doctor.ts) to read: the writer could see a branch's
// tension/quality/composite numbers but never its health, verdict or grade.
//
// HOW IT IS CLOSED WITHOUT INVENTING STORY CONTENT. The repository already
// owns a deterministic StoryCommit[] -> Fountain compiler:
// server/nvm/project/index.ts's `project(canon, 'fountain')` (Holographic
// Projection, G3), whose renderFountainOp() exhaustively renders all 14 op
// kinds to craft-plausible screenplay prose and is covered by
// tests/core/projection-richness.test.ts and record-parity.test.ts. This
// module invents no phrasing of its own — it reuses that compiler verbatim
// and only decides WHICH commits to hand it:
//
//   base       = the session's live commits, exactly as they stand.
//   intervened = the same commits with the do()-intervention applied and every
//                causally downstream op cut (the SAME graph cut explore.ts
//                already performs — buildInterveneSceneOps is imported from
//                there, not re-derived, so the text a writer reads can never
//                disagree with the consequences list shown beside it).
//   variant(b) = the intervened timeline plus ONE synthetic trailing commit
//                carrying branch b's own ops, so each branch compiles to a
//                genuinely different script rather than a relabelled copy.
//
// DETERMINISM. No randomUUID, no Date.now, no network, no LLM. Every commitId
// this module mints is derived from its position/branchId, and every synthetic
// commit's `createdAt` is a literal 0 (projectFountain never reads it). The
// same {commits, intervention, branches} therefore always compiles to
// byte-identical Fountain — which is what lets the Doctor's own
// cache-by-content-hash (server/nvm/analyze/doctor-pool.ts's LRU) actually hit
// on a repeated explore of the same intervention.

import type { NarrativeState } from '../state/NarrativeState.ts';
import type { StoryCommit } from '../state/StoryCommit.ts';
import type { StoryOp } from '../ops/StoryOp.ts';
import type { StructuralCausalModel } from '../twin/scm.ts';
import type { Intervention } from '../twin/counterfactual.ts';
import { doIntervention } from '../twin/counterfactual.ts';
import { summarizeOps } from '../state/StoryCommit.ts';
import { project } from '../project/index.ts';
import { buildInterveneSceneOps, type ExploreBranch } from './explore.ts';

/** One compiled Fountain draft. */
export interface MaterializedDraft {
  /** The full Fountain text. */
  fountain: string;
  /** Scenes this draft contains. projectFountain emits exactly one scene
   *  heading per commit, so this is the commit count — and, importantly, ZERO
   *  means the text is a bare title page with no slugline anywhere. A caller
   *  must not score that: see the route's own short-circuit and
   *  server/routes/scriptide.ts's `hasSceneHeading` comment for why a
   *  scene-less document reads as a fully-analyzed health-0 PASS instead of an
   *  honestly incomplete report. */
  sceneCount: number;
}

/** One branch compiled to a Fountain draft. */
export interface MaterializedVariant extends MaterializedDraft {
  branchId: string;
}

export interface MaterializeInput {
  /** Non-reverted commits, chronological — the same set buildSCM(stage) used. */
  commits: StoryCommit[];
  /** The session's enriched NarrativeState (only passed through to project()). */
  state: NarrativeState;
  /** buildSCM(stage), built by the caller from the same commits. */
  scm: StructuralCausalModel;
  /** {opId, replacement} — identical vocabulary to POST /api/nvm/twin/do. */
  intervention: Intervention;
  /** The ranked branches exploreWhatIf() returned for this same intervention. */
  branches: ExploreBranch[];
  /** Title-page title for every projected draft. Defaults to 'Untitled'. */
  title?: string;
}

export interface MaterializeResult {
  /** The current draft as the projector renders it — the comparison baseline. */
  base: MaterializedDraft;
  /** The counterfactual timeline with no branch appended. */
  intervened: MaterializedDraft;
  /** One compiled draft per branch, in the order the branches were given. */
  variants: MaterializedVariant[];
}

/** Rebuilds `{sceneIdx, ops}[]` into StoryCommits the projector can render.
 *  Ids are positional (`whatif-scene-<i>`), never random, so the compiled text
 *  is stable across identical requests. */
function toSyntheticCommits(
  sceneOps: Array<{ sceneIdx: number; ops: StoryOp[] }>,
  idPrefix: string,
): StoryCommit[] {
  return sceneOps.map((s, i) => ({
    commitId: `${idPrefix}-${i}`,
    parentId: i === 0 ? null : `${idPrefix}-${i - 1}`,
    sceneIdx: s.sceneIdx,
    ops: s.ops,
    deltaSummary: summarizeOps(s.ops),
    reverted: false,
    createdAt: 0,
  }));
}

function projectDraft(commits: StoryCommit[], state: NarrativeState, title: string): MaterializedDraft {
  return {
    fountain: project({ commits, state, title }, 'fountain').content,
    sceneCount: commits.length,
  };
}

export function materializeWhatIf(input: MaterializeInput): MaterializeResult {
  const { commits, state, scm, intervention, branches } = input;
  const title = input.title ?? 'Untitled';

  const liveCommits = commits.filter(c => !c.reverted);
  const base = projectDraft(liveCommits, state, title);

  // The SAME graph cut explore.ts's consequences list is computed from — an op
  // whose declared cause vanished is not in this timeline, so it is not in this
  // timeline's text either.
  const report = doIntervention(scm, intervention);
  const intervenedSceneOps = buildInterveneSceneOps(commits, intervention, report);
  const intervenedCommits = toSyntheticCommits(intervenedSceneOps, 'whatif-scene');
  const intervened = projectDraft(intervenedCommits, state, title);

  // A branch is a proposed NEXT move, so its commit lands one scene after the
  // last surviving scene (state.turn when the intervention cut everything).
  const lastSceneIdx = intervenedCommits.length > 0
    ? intervenedCommits[intervenedCommits.length - 1].sceneIdx
    : state.turn - 1;

  const variants: MaterializedVariant[] = branches.map(branch => {
    const branchCommit: StoryCommit = {
      commitId: `whatif-branch-${branch.branchId}`,
      parentId: intervenedCommits[intervenedCommits.length - 1]?.commitId ?? null,
      sceneIdx: lastSceneIdx + 1,
      ops: branch.ops,
      deltaSummary: summarizeOps(branch.ops),
      reverted: false,
      createdAt: 0,
    };
    return {
      branchId: branch.branchId,
      ...projectDraft([...intervenedCommits, branchCommit], state, title),
    };
  });

  return { base, intervened, variants };
}
