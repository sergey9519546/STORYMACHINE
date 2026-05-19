// Holographic Projection (G3) — one canon, every format.
// `project(canon, target)` is a pure projection of the StoryCommit DAG +
// NarrativeState into any deliverable. No format is privileged; all are
// first-class derivations of the same causal source.
//
// Targets: fountain, novel, stage, comic, interactive, pitch, bible,
//          rewatch (second-viewing annotated), cutting_room (ghost branches).

import type { NarrativeState } from '../state/NarrativeState.ts';
import type { StoryCommit } from '../state/StoryCommit.ts';

export type ProjectionTarget =
  | 'fountain'
  | 'novel'
  | 'stage'
  | 'comic'
  | 'interactive'
  | 'pitch'
  | 'bible'
  | 'rewatch'
  | 'cutting_room';

export interface Canon {
  commits: StoryCommit[];
  state: NarrativeState;
  title?: string;
  ghosts?: Array<{ ir: unknown; reason: string }>; // ghost commits for cutting_room
}

export interface Artifact {
  target: ProjectionTarget;
  content: string;
  metadata: Record<string, unknown>;
}

// Dispatch to per-target projector
export function project(canon: Canon, target: ProjectionTarget): Artifact {
  switch (target) {
    case 'fountain':     return projectFountain(canon);
    case 'novel':        return projectNovel(canon);
    case 'stage':        return projectStage(canon);
    case 'comic':        return projectComic(canon);
    case 'interactive':  return projectInteractive(canon);
    case 'pitch':        return projectPitch(canon);
    case 'bible':        return projectBible(canon);
    case 'rewatch':      return projectRewatch(canon);
    case 'cutting_room': return projectCuttingRoom(canon);
  }
}

// ── Per-target projectors ─────────────────────────────────────────────────────

function projectFountain(canon: Canon): Artifact {
  const lines: string[] = [
    `Title: ${canon.title ?? 'Untitled'}`,
    'Credit: Written by STORYMACHINE',
    '',
  ];
  for (const commit of canon.commits.filter(c => !c.reverted)) {
    lines.push(`INT. SCENE ${commit.sceneIdx} - CONTINUOUS`);
    lines.push('');
    for (const op of commit.ops) {
      if (op.op === 'UPDATE_BELIEF') {
        lines.push(`\t\t\t${op.charId.toUpperCase()}`);
        lines.push(`\t(believing) ${op.belief.proposition}`);
        lines.push('');
      } else if (op.op === 'SHIFT_RELATIONSHIP') {
        lines.push(`The dynamic between ${op.pair[0]} and ${op.pair[1]} shifts — ${op.delta.reason}.`);
        lines.push('');
      } else if (op.op === 'RECORD_VISUAL_FACT') {
        lines.push(op.fact.toUpperCase());
        lines.push('');
      }
    }
  }
  return { target: 'fountain', content: lines.join('\n'), metadata: { scenes: canon.commits.length } };
}

function projectNovel(canon: Canon): Artifact {
  const paragraphs: string[] = [
    `# ${canon.title ?? 'Untitled'}`,
    '',
  ];
  for (const commit of canon.commits.filter(c => !c.reverted)) {
    paragraphs.push(`## Scene ${commit.sceneIdx}`);
    for (const op of commit.ops) {
      if (op.op === 'UPDATE_BELIEF') {
        paragraphs.push(`${op.charId} held this thought: _${op.belief.proposition}_.`);
      } else if (op.op === 'ADD_FACT') {
        paragraphs.push(`It was a fact: ${op.fact.subject} ${op.fact.predicate} ${op.fact.object}.`);
      } else if (op.op === 'APPRAISE_EMOTION') {
        paragraphs.push(`${op.charId} felt ${op.emotion.dominant} (intensity ${op.emotion.intensity}).`);
      }
    }
    paragraphs.push('');
  }
  return { target: 'novel', content: paragraphs.join('\n'), metadata: { wordCount: paragraphs.join(' ').split(' ').length } };
}

function projectStage(canon: Canon): Artifact {
  const lines: string[] = [`PLAY: ${canon.title ?? 'Untitled'}`, ''];
  for (const commit of canon.commits.filter(c => !c.reverted)) {
    lines.push(`--- ACT ${commit.sceneIdx + 1} ---`);
    for (const op of commit.ops) {
      if (op.op === 'UPDATE_BELIEF') {
        lines.push(`${op.charId.toUpperCase()}: [aside] ${op.belief.proposition}`);
      } else if (op.op === 'SHIFT_RELATIONSHIP') {
        lines.push(`[STAGE DIRECTION] ${op.pair[0]} and ${op.pair[1]} — ${op.delta.reason}`);
      }
    }
    lines.push('');
  }
  return { target: 'stage', content: lines.join('\n'), metadata: {} };
}

function projectComic(canon: Canon): Artifact {
  const panels: Array<{ scene: number; panel: number; caption: string; visual?: string }> = [];
  let panelN = 0;
  for (const commit of canon.commits.filter(c => !c.reverted)) {
    for (const op of commit.ops) {
      panelN++;
      if (op.op === 'RECORD_VISUAL_FACT') {
        panels.push({ scene: commit.sceneIdx, panel: panelN, caption: op.fact, visual: 'FULL_BLEED' });
      } else if (op.op === 'UPDATE_BELIEF') {
        panels.push({ scene: commit.sceneIdx, panel: panelN, caption: `${op.charId} (thought): ${op.belief.proposition}` });
      } else if (op.op === 'SHIFT_RELATIONSHIP') {
        panels.push({ scene: commit.sceneIdx, panel: panelN, caption: op.delta.reason });
      }
    }
  }
  return { target: 'comic', content: JSON.stringify(panels, null, 2), metadata: { panels: panels.length } };
}

function projectInteractive(canon: Canon): Artifact {
  // The Living Story — executable JSON that can be re-loaded and replayed
  const playbook = {
    title: canon.title ?? 'Untitled',
    version: 1,
    commits: canon.commits.filter(c => !c.reverted).map(c => ({
      sceneIdx: c.sceneIdx,
      ops: c.ops,
      deltaSummary: c.deltaSummary,
    })),
    finalState: {
      objectiveReality: canon.state.objectiveReality,
      characterBeliefs: canon.state.characterBeliefs,
      audienceState: canon.state.audienceState,
    },
  };
  return {
    target: 'interactive',
    content: JSON.stringify(playbook, null, 2),
    metadata: { replayable: true, commitCount: playbook.commits.length },
  };
}

function projectPitch(canon: Canon): Artifact {
  const chars = Object.keys(canon.state.characterBeliefs);
  const facts = canon.state.objectiveReality.length;
  const ironyCount = Object.values(canon.state.characterBeliefs)
    .flatMap(b => b)
    .filter(b => b.source === 'told').length;

  const lines = [
    `# ${canon.title ?? 'Untitled'} — Pitch`,
    '',
    `**Characters:** ${chars.join(', ') || 'TBD'}`,
    `**Objective facts:** ${facts}`,
    `**Dramatic irony layers:** ${ironyCount} false beliefs held by characters`,
    `**Audience tension:** ${canon.state.audienceState.suspense}/100 suspense`,
    '',
    '## Central Dramatic Question',
    canon.state.authorIntent.theme
      ? `Theme: "${canon.state.authorIntent.theme}"`
      : '(No theme declared — set authorIntent.theme)',
    '',
    '## Story in One Line',
    `A ${facts > 0 ? 'fact-grounded' : 'character-driven'} narrative across ${canon.commits.length} scene(s)` +
    (ironyCount > 0 ? `, with ${ironyCount} layer(s) of dramatic irony.` : '.'),
  ];
  return { target: 'pitch', content: lines.join('\n'), metadata: { charCount: chars.length } };
}

function projectBible(canon: Canon): Artifact {
  const chars = Object.entries(canon.state.characterBeliefs).map(([id, beliefs]) => ({
    id,
    beliefs: beliefs.length,
    emotion: canon.state.characterEmotions[id]?.dominant ?? 'unknown',
  }));
  const sections = [
    `# ${canon.title ?? 'Untitled'} — Story Bible`,
    '',
    '## Characters',
    ...chars.map(c => `- **${c.id}**: ${c.beliefs} beliefs, dominant emotion: ${c.emotion}`),
    '',
    '## World Facts',
    ...canon.state.objectiveReality.map(f => `- ${f.subject} ${f.predicate} ${f.object}`),
    '',
    '## Audience Intelligence',
    `- Known facts: ${canon.state.audienceState.knownFacts.join(', ') || 'none'}`,
    `- Suspense: ${canon.state.audienceState.suspense}/100`,
    '',
    '## Seeded Clues',
    ...canon.state.clues.map(c => `- clue: ${c.clueId} (${c.carrier})`),
    '',
    '## Open Payoffs',
    ...canon.state.payoffs.map(p => `- setup: ${p.setupId} → payoff: ${p.payoffEventId}`),
  ];
  return { target: 'bible', content: sections.join('\n'), metadata: {} };
}

function projectRewatch(canon: Canon): Artifact {
  // Annotated for second viewing: every commit gets an irony note
  const lines: string[] = [`# ${canon.title ?? 'Untitled'} — Rewatch Guide`, ''];
  for (const commit of canon.commits.filter(c => !c.reverted)) {
    lines.push(`### Scene ${commit.sceneIdx}`);
    for (const op of commit.ops) {
      if (op.op === 'UPDATE_BELIEF' && op.belief.source === 'told') {
        lines.push(`⚠️  **Rewatch note:** ${op.charId} believes "${op.belief.proposition}" — this is a LIE planted by the narrative`);
      } else if (op.op === 'SEED_CLUE') {
        lines.push(`🔍 **Clue planted:** ${op.clueId} (${op.carrier}) — first-timers miss this`);
      }
    }
    lines.push('');
  }
  return { target: 'rewatch', content: lines.join('\n'), metadata: {} };
}

function projectCuttingRoom(canon: Canon): Artifact {
  const ghosts = canon.ghosts ?? [];
  const lines: string[] = [`# ${canon.title ?? 'Untitled'} — Cutting Room`, ''];
  if (ghosts.length === 0) {
    lines.push('(No ghost commits — nothing was rejected in this run)');
  } else {
    lines.push(`${ghosts.length} rejected candidate(s):`);
    for (const g of ghosts) {
      lines.push(`- Rejected (${g.reason}): ${JSON.stringify(g.ir).slice(0, 80)}…`);
    }
  }
  return { target: 'cutting_room', content: lines.join('\n'), metadata: { ghosts: ghosts.length } };
}
