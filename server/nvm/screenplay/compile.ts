// Wave 38 — Screenplay Compiler
// Wraps the holographic projection (project/index.ts → fountain) with the
// richer screenplay memory. Produces a structured Fountain draft with:
//   - Act break markers derived from structure state
//   - Per-scene purpose annotations as slugline comments
//   - Clue/payoff tracking notes
//   - Tighter prose built from the dialogue highlights and visual beats
//
// This is the compile target after the author has lived through the story.

import type { StoryCommit } from '../state/StoryCommit.ts';
import type { NarrativeState } from '../state/NarrativeState.ts';
import type { ScreenplaySceneRecord } from './memory.ts';
import type { StructureState } from './structure.ts';
import { project, type Canon } from '../project/index.ts';
import { fastWordCount } from '../../lib/string-utils.ts';

export interface CompiledScreenplay {
  /** Raw Fountain text */
  fountain: string;
  /** Per-scene structural annotations */
  annotations: SceneAnnotation[];
  /** Structure summary for the title page */
  structureSummary: string;
  /** Total word count (approximate) */
  wordCount: number;
  /** Compiled at timestamp */
  compiledAt: number;
}

export interface SceneAnnotation {
  sceneIdx: number;
  purpose: string;
  dramaticTurn: string;
  revelation: string | null;
  emotionalShift: string;
  clockRaised: boolean;
  openClues: number;
}

/**
 * Compile the lived commit path into a structured Fountain screenplay.
 *
 * @param commits    All non-reverted StoryCommits
 * @param state      Current NarrativeState
 * @param records    Screenplay memory records (from buildScreenplayMemory)
 * @param structure  Structural state (from analyzeStructure)
 * @param title      Story title (optional)
 */
export function compileScreenplay(
  commits: StoryCommit[],
  state: NarrativeState,
  records: ScreenplaySceneRecord[],
  structure: StructureState,
  title = 'UNTITLED',
): CompiledScreenplay {
  // ── Base projection ───────────────────────────────────────────────────────
  const canon: Canon = {
    commits,
    state,
    title,
  };
  const artifact = project(canon, 'fountain');
  let fountain = artifact.content;

  // ── Inject act break markers ──────────────────────────────────────────────
  fountain = injectActBreaks(fountain, records, structure);

  // ── Inject per-scene purpose comments ────────────────────────────────────
  fountain = injectPurposeComments(fountain, records);

  // ── Build structure summary ───────────────────────────────────────────────
  const structureSummary = buildStructureSummary(structure, records);

  // ── Build per-scene annotations ───────────────────────────────────────────
  const annotations: SceneAnnotation[] = records.map(r => ({
    sceneIdx: r.sceneIdx,
    purpose: r.purpose,
    dramaticTurn: r.dramaticTurn,
    revelation: r.revelation,
    emotionalShift: r.emotionalShift,
    clockRaised: r.clockRaised,
    openClues: r.unresolvedClues.length,
  }));

  // ⚡ Bolt: Zero-allocation word count replacing expensive .split(/\s+/)
  const wordCount = fastWordCount(fountain);

  return {
    fountain,
    annotations,
    structureSummary,
    wordCount,
    compiledAt: Date.now(),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function injectActBreaks(
  fountain: string,
  records: ScreenplaySceneRecord[],
  structure: StructureState,
): string {
  // Add ACT break markers at structural midpoints
  const lines = fountain.split('\n');
  const n = records.length;
  if (n < 4) return fountain; // Too short for act breaks

  const act2Start = Math.floor(n * 0.25);
  const midpoint  = Math.floor(n * 0.5);
  const act3Start = Math.floor(n * 0.75);

  const insertions: Map<number, string> = new Map([
    [act2Start, '\n> END OF ACT ONE <\n'],
    [midpoint,  '\n> MIDPOINT <\n'],
    [act3Start, '\n> END OF ACT TWO <\n'],
  ]);

  // Find INT./EXT. scene headers to insert before
  let sceneCount = 0;
  return lines.map(line => {
    if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(line)) {
      const marker = insertions.get(sceneCount);
      sceneCount++;
      return marker ? marker + line : line;
    }
    return line;
  }).join('\n');
}

function injectPurposeComments(
  fountain: string,
  records: ScreenplaySceneRecord[],
): string {
  // Minimal injection: add a note comment after each scene header
  let sceneCount = 0;
  return fountain.split('\n').map(line => {
    if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(line)) {
      const record = records[sceneCount];
      sceneCount++;
      if (!record) return line;
      const note = `/* [${record.purpose.replace(/_/g, ' ')}] ${record.emotionalShift} arc */`;
      return line + '\n' + note;
    }
    return line;
  }).join('\n');
}

function buildStructureSummary(
  structure: StructureState,
  records: ScreenplaySceneRecord[],
): string {
  const lines = [
    `Act Position: ${structure.actPosition.toUpperCase()}`,
    `Completion: ${structure.completionPercent}%`,
    `Scenes: ${records.length}`,
    `Revelations: ${structure.revelationCount}`,
    `Reversals: ${structure.reversalCount}`,
    `Open Clues: ${structure.openClues}`,
    `Escalating: ${structure.escalating ? 'YES' : 'NO'}`,
    `Approaching Climax: ${structure.approachingClimax ? 'YES' : 'NO'}`,
  ];
  return lines.join('\n');
}
