// StoryCommit → NarrativeEvent adapter (V5.0 Phase 1 shadow write).
//
// PROVENANCE: see server/config/v5-flags.ts. Third of the three modules commit
// aacd715 imported but never committed. server/engine/Stage.ts calls
// commitToEvents() on the fire-and-forget shadow-write path (default OFF) to
// mirror each freshly-appended StoryCommit into the append-only EventStore, and
// estimateEventsByteSize() to record an approximate payload size in metrics.
//
// MAPPING: the EventStore is op-granular (event-store.ts header: "each StoryOp
// becomes one event"), so a commit's N ops become N NarrativeEventInputs that
// share the commit's sceneIdx and creation time. presentationIndex is assigned
// per-op in commit order; storyTime uses the commit's createdAt (a wall-clock
// proxy — the shipped verdict path does not depend on diegetic time here). The
// hash/eventId/createdAt fields are intentionally omitted: EventStore.append()
// computes them (NarrativeEventInput = Omit<NarrativeEvent, those three>).
//
// DETERMINISM/SAFETY: pure function of its input; no I/O, no randomness, no
// clock reads (times come from the commit). Never throws on shape — an empty
// ops list yields an empty array, which Stage.ts already treats as a no-op.

import type { StoryCommit } from '../../state/StoryCommit.ts';
import type { NarrativeEventInput } from '../types.ts';

/**
 * Convert a StoryCommit into one NarrativeEventInput per op, in op order.
 * Returns [] for a commit with no ops (Stage.ts skips the write in that case).
 */
export function commitToEvents(commit: StoryCommit): NarrativeEventInput[] {
  const ops = commit.ops ?? [];
  return ops.map((op, index) => ({
    // Dual temporal dimensions: story-time proxied by wall-clock createdAt,
    // presentation order by op position within the commit.
    storyTime: commit.createdAt,
    presentationIndex: index,

    // Content: the single atomic op. No fact extraction here — shadow mode
    // mirrors ops verbatim; assertions stay empty rather than guessing.
    op,
    assertions: [],

    // Provenance: the shadow write is a system-level mirror of an existing
    // commit, so it is attributed to system inference, deriving from the
    // parent commit when one exists.
    derivedFrom: commit.parentId ? [commit.parentId] : [],
    createdBy: 'system_inferred',

    // Canon layer — shadow writes mirror committed (diegetic) story state.
    realityLayer: 'diegetic',

    // Backward-compat scene grouping carries straight through.
    sceneIdx: commit.sceneIdx,

    metadata: {
      tags: ['v5-shadow', `commit:${commit.commitId}`],
    },
  }));
}

/**
 * Approximate serialized byte size of a batch of events, for metrics only.
 * Uses UTF-8 length of the JSON encoding; not a storage guarantee, just a
 * cheap gauge of shadow-write payload volume. Returns 0 for an empty batch.
 */
export function estimateEventsByteSize(events: NarrativeEventInput[]): number {
  if (events.length === 0) return 0;
  try {
    return Buffer.byteLength(JSON.stringify(events), 'utf8');
  } catch {
    // Defensive: a non-serializable payload (e.g. a cyclic op) must not break
    // the fire-and-forget path. Report 0 rather than throw.
    return 0;
  }
}
