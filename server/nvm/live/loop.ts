// Wave 34 — Reactive Turn Cycle
// After any commit (author OR AI), drive the existing Agent/Appraisal/Director
// machinery FROM the unified NarrativeState to produce reactive NPC StoryOps,
// committed to the same ledger.
//
// The key idea: the author's StoryOps change the world (beliefs, facts, clocks).
// NPCs react to that changed world — their reactions also become StoryCommits.
// The whole exchange forms one connected causal chain in the ledger.
//
// API:
//   reactToCommit(stage, orchestrator, commitId, opts): run N beats of NPC
//     reaction to the most-recent state produced by commitId, returning an
//     array of reaction commits.
//
// The function is intentionally NOT a server route — it's a pure async function
// called by the POST /api/nvm/live/move route (and optionally by a new
// POST /api/nvm/live/advance) to produce reaction beats.

import type { Stage } from '../../engine/Stage.ts';
import type { Orchestrator } from '../../engine/Orchestrator.ts';
import type { StoryCommit } from '../state/StoryCommit.ts';

// Options for the reactive loop
export interface ReactOptions {
  /** Max number of NPC reaction beats to run (default 2) */
  maxBeats?: number;
  /** Location ID to run reactions in (default: pick first active room) */
  locationId?: string;
}

export interface ReactResult {
  /** Commits produced by NPC reactions */
  commits: StoryCommit[];
  /** Number of agent turns actually executed */
  turnsRun: number;
  /** Reason the loop stopped */
  stoppedBecause: 'maxBeats' | 'noAgents' | 'climax' | 'error';
}

/**
 * Drive N beats of NPC reaction to the state produced by a given commit.
 *
 * Uses the Orchestrator's existing `runTurn()` method (which already calls
 * the Wave-32 bridge to commit). We just need to pick which agents react
 * and in which location.
 *
 * Returns the commits that were produced during the reaction beats.
 * Callers can surface them in the LivePlayPanel feed.
 */
export async function reactToCommit(
  stage: Stage,
  orchestrator: Orchestrator,
  _triggerCommitId: string,
  opts: ReactOptions = {},
): Promise<ReactResult> {
  const maxBeats = opts.maxBeats ?? 2;
  const beforeCount = stage.getCommits().length;

  // Pick a location to react in
  let locationId = opts.locationId;
  if (!locationId) {
    // Use the location with the most active agents
    const allAgents = stage.getAllAgents().filter(a => a.is_alive !== false);
    if (allAgents.length === 0) {
      return { commits: [], turnsRun: 0, stoppedBecause: 'noAgents' };
    }
    const locCounts = new Map<string, number>();
    for (const a of allAgents) {
      locCounts.set(a.current_location_id, (locCounts.get(a.current_location_id) ?? 0) + 1);
    }
    locationId = [...locCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  const agentsInRoom = stage.getAgentsInLocation(locationId).filter(a => a.is_alive !== false);
  if (agentsInRoom.length === 0) {
    return { commits: [], turnsRun: 0, stoppedBecause: 'noAgents' };
  }

  // Run up to maxBeats turns, one per agent, round-robin
  let turnsRun = 0;
  let stopped: ReactResult['stoppedBecause'] = 'maxBeats';

  try {
    for (let beat = 0; beat < maxBeats; beat++) {
      const agent = agentsInRoom[beat % agentsInRoom.length];
      await orchestrator.runTurn(agent.char_id);
      turnsRun++;

      // Check for climax after each beat to avoid running past the story's end
      // (Use the last known commits to detect if a revelation beat was emitted)
      const latestCommits = stage.getCommits();
      const recentOps = latestCommits.slice(-3).flatMap(c => c.ops);
      const hasClimaxSignal = recentOps.some(
        o => o.op === 'RAISE_CLOCK' &&
          (o as { op: string; clockId: string }).clockId === 'contradiction_clock' &&
          (o as { op: string; amount: number }).amount >= 3
      );
      if (hasClimaxSignal) {
        stopped = 'climax';
        break;
      }
    }
  } catch (_e) {
    stopped = 'error';
  }

  // Collect the commits that were produced during this reaction run
  const afterCount = stage.getCommits().length;
  const reactionCommits = stage.getCommits().slice(beforeCount, afterCount);

  return { commits: reactionCommits, turnsRun, stoppedBecause: stopped };
}

/**
 * Advance the world N beats from the current state.
 * Convenience wrapper over reactToCommit for the "advance world" button.
 */
export async function advanceWorld(
  stage: Stage,
  orchestrator: Orchestrator,
  beats: number = 1,
  locationId?: string,
): Promise<ReactResult> {
  const allCommits = stage.getCommits();
  const lastCommitId = allCommits.length > 0 ? allCommits[allCommits.length - 1].commitId : 'initial';
  return reactToCommit(stage, orchestrator, lastCommitId, { maxBeats: beats, locationId });
}
