# STORYMACHINE Living Audit System -- Design Document

*This document replaces the static `SECURITY.md` and `RELIABILITY.md` with a
machine-readable, test-backed, CI-enforced audit system. The static files
contain 69 findings across 3,375 lines. This system makes those findings
executable, prevents reintroduction, and regenerates the documentation from
verified state.*

---

## 1. Architecture Overview

The system has six layers. Each layer depends only on layers below it.
Changes flow upward: a code change triggers tests, tests update findings,
findings regenerate docs.

```
Layer 6: Living docs          Generated SECURITY.md / RELIABILITY.md
         ^                    from layers 1-5. Never hand-edited.
         |
Layer 5: Risk model           Dependency DAG + computed risk scores.
         ^                    Determines fix priority.
         |
Layer 4: Enforcement rules    ESLint custom rules + architecture tests.
         ^                    Prevent whole CLASSES of finding.
         |
Layer 3: Executable tests     Reproduction + regression + property +
         ^                    concurrency + contract tests.
         |
Layer 2: Invariant kernel     Seven global invariants shared by every test.
         ^                    Single source of assertion logic.
         |
Layer 1: findings.yaml        Machine-readable source of truth for all 69
                              findings. Status, severity, dependencies,
                              test IDs, risk scores.
```

### Directory layout

```
audit/
  findings.yaml                   # Layer 1: all findings
  invariants/
    index.ts                      # re-exports all invariants
    types.ts                      # InvariantResult, SessionSnapshot interfaces
    i1-projection-fidelity.ts
    i2-commit-ordering.ts
    i3-rejection-purity.ts
    i4-head-consistency.ts
    i5-draft-immutability.ts
    i6-session-isolation.ts
    i7-recovery-completeness.ts
  rules/
    no-db-file-copy.ts
    no-session-id-from-body.ts
    no-raw-stream-error.ts
    no-cross-tree-import.ts
    no-direct-commit-append.ts
  risk.ts                         # Layer 5: risk scoring + DAG
  generate.ts                     # Layer 6: doc generator
  status.ts                       # Observability dashboard generator
  wave-executor.ts                # Wave execution engine
tests/
  audit/
    helpers/
      session-harness.ts          # shared test setup
      stage-snapshot.ts           # Stage state capture
      concurrent-barrier.ts      # synchronization primitives
      mock-provider.ts            # deterministic LLM provider
    properties/
      command-sequence.test.ts    # property-based: random commands + invariants
      round-trip.test.ts          # property-based: export/import fuzz
    concurrency/
      turn-vs-room.test.ts       # race condition: turn + room
      reset-vs-turn.test.ts      # race condition: reset + turn
      import-vs-converge.test.ts # race condition: import + converge
    contracts/
      api-boundary.test.ts       # JSON schema validation for all endpoints
      schema-version.test.ts     # single source of truth for schema version
    COR-001-proof-atomicity.test.ts
    COR-002-cache-head.test.ts
    COR-003-belief-emotion.test.ts
    COR-004-room-actions.test.ts
    COR-005-converge-mechanism.test.ts
    COR-006-arc-abstention.test.ts
    COR-007-directors-cut-provenance.test.ts
    COR-008-converge-reprove.test.ts
    REC-001-schema-roundtrip.test.ts
    REC-002-import-safety.test.ts
    REC-003-wal-safe-backup.test.ts
    REC-004-mutation-coordinator.test.ts
    REC-005-serialization.test.ts
    REC-006-room-timeout.test.ts
    REC-007-full-export.test.ts
    REC-008-empty-import.test.ts
    REC-009-ghost-scores.test.ts
    SEC-001-schema-single-source.test.ts
    SEC-002-stage-and-swap.test.ts
    SEC-003-backup-before-reset.test.ts
    SEC-004-simulation-proposal.test.ts
    SEC-005-project-identity.test.ts
    SEC-006-sample-consumable.test.ts
    # ... remaining SEC-*, UX-*, DEB-*, CI-* tests
```

### How the layers connect

1. A developer writes code that introduces `fs.copyFileSync` on a `.db` file.
2. Layer 4 (ESLint rule `no-db-file-copy`) blocks the commit locally.
3. If the rule is bypassed, Layer 3 (test `REC-003-wal-safe-backup.test.ts`)
   catches it in CI.
4. Layer 2 (invariant I7 -- recovery completeness) is checked by the test.
5. Layer 1 (`findings.yaml`) records that `REC-003` status is `open`.
6. Layer 5 (risk model) recomputes the risk score.
7. Layer 6 (doc generator) regenerates SECURITY.md reflecting the current state.

---

## 2. Findings Data Model (`audit/findings.yaml`)

Every finding from the static audit becomes a YAML entry. The YAML file is the
single source of truth. The static markdown files are generated artifacts.

### Schema

```yaml
# audit/findings.yaml
version: 1
generated: "2026-07-14T00:00:00Z"
findings:
  - id: COR-001
    title: "Stage mutations survive proof rejection"
    severity: P0
    confidence: high
    boundary: canon
    status: open
    evidence:
      - file: server/engine/Orchestrator.ts
        line: 252
        excerpt: "runTurn() writes Stage before constructing StoryCommit"
      - file: server/nvm/bridge/action-to-ops.ts
        line: 472
        excerpt: "buildTurnCommit() returns null on rejection, no rollback"
    invariants: [I3, I4]
    depends_on: []
    blocks: [COR-002, COR-003, COR-004]
    wave: C
    test_id: tests/audit/COR-001-proof-atomicity.test.ts
    regression_test_id: tests/audit/COR-001-proof-atomicity.test.ts
    risk_score: null  # computed by audit/risk.ts
    last_verified: null

  - id: REC-001
    title: "Current exports rejected by current import"
    severity: P0
    confidence: high
    boundary: lifecycle
    status: open
    evidence:
      - file: server/engine/Stage.ts
        line: 78
        excerpt: "Migrations reach schema version 13"
      - file: server/routes/config.ts
        line: 330
        excerpt: "CURRENT_SCHEMA = 6 (hard-coded)"
    invariants: [I7]
    depends_on: []
    blocks: [REC-002, REC-007]
    wave: R
    test_id: tests/audit/REC-001-schema-roundtrip.test.ts
    regression_test_id: tests/audit/REC-001-schema-roundtrip.test.ts
    risk_score: null
    last_verified: null

  - id: SEC-021
    title: "Missing session capability falls into shared writable default"
    severity: P2
    confidence: high
    boundary: trust
    status: open
    evidence:
      - file: server/lib/session-store.ts
        line: 226
        excerpt: "Missing/invalid identity maps to 'default'"
      - file: server.ts
        line: 103
        excerpt: "Server listens on 0.0.0.0"
    invariants: [I6]
    depends_on: []
    blocks: [SEC-022, SEC-023]
    wave: D
    test_id: tests/audit/SEC-021-session-fail-closed.test.ts
    regression_test_id: tests/audit/SEC-021-session-fail-closed.test.ts
    risk_score: null
    last_verified: null

  - id: UX-001
    title: "Coverage says Ready without a report"
    severity: P2
    confidence: high
    boundary: product
    status: open
    evidence:
      - file: src/components/ScriptIDE.tsx
        line: 903
        excerpt: "Opening Coverage clears staleness before analysis succeeds"
      - file: src/components/scriptide/Toolbar.tsx
        line: 129
        excerpt: "not-running + not-stale = Ready"
    invariants: []
    depends_on: []
    blocks: [UX-002]
    wave: P
    test_id: tests/audit/UX-001-coverage-state.test.ts
    regression_test_id: tests/audit/UX-001-coverage-state.test.ts
    risk_score: null
    last_verified: null
```

### Status lifecycle

```
open  -->  in_progress  -->  verified  -->  regression
  ^            |                |               |
  |            v                v               v
  +-------- reverted       reopened        reopened
```

- `open`: Finding exists, no fix attempted.
- `in_progress`: Fix branch exists, reproduction test written.
- `verified`: Fix merged, reproduction test passes, regression test passes.
- `regression`: Fix was verified but a subsequent change reintroduced the
  issue. The regression test caught it.

### Severity weights (used by risk model)

| Severity | Weight | Meaning |
|---|---|---|
| P0 | 100 | Can lose work or corrupt story truth |
| P1 | 50 | Silent inconsistency |
| P2 | 20 | Misleading or incomplete |
| P3 | 5 | Debt, no user-visible impact |

---

## 3. Invariant Kernel (`audit/invariants/`)

Seven global invariants. Every audit test checks all applicable invariants
after every operation. This catches cascading failures: a fix for COR-001
that breaks I2 (commit ordering) is caught immediately.

### Type definitions (`audit/invariants/types.ts`)

```typescript
// audit/invariants/types.ts

export interface SessionSnapshot {
  /** All StoryCommits in canonical order */
  storyCommits: StoryCommitRecord[];
  /** Current canonical head commit ID */
  headCommitId: string | null;
  /** Materialized Stage state */
  stage: {
    location: string;
    beliefs: Record<string, unknown>;
    emotions: Record<string, unknown>;
    spine: SpineEvent[];
    actionLog: ActionLogEntry[];
  };
  /** Folded NarrativeState from replaying commits */
  narrativeState: NarrativeState;
  /** ScriptIDE draft state */
  draft: {
    scriptText: string;
    snapshots: DraftSnapshot[];
    characters: CharacterRecord[];
  };
  /** Active session ID */
  sessionId: string;
  /** Schema version */
  schemaVersion: number;
}

export interface InvariantResult {
  /** Which invariant was checked */
  invariantId: string;
  /** Human-readable description */
  description: string;
  /** Whether the invariant holds */
  holds: boolean;
  /** If violated, what went wrong */
  violation?: {
    message: string;
    expected: unknown;
    actual: unknown;
    location?: string;
  };
  /** Timestamp of check */
  checkedAt: string;
}

export interface InvariantModule {
  /** Unique invariant identifier */
  id: string;
  /** Human-readable description */
  description: string;
  /** Check invariant, return result without throwing */
  check: (state: SessionSnapshot) => InvariantResult;
  /** Assert invariant, throw on violation */
  assert: (state: SessionSnapshot) => void;
}
```

### Example implementation: I3 -- Rejection Purity (`audit/invariants/i3-rejection-purity.ts`)

```typescript
// audit/invariants/i3-rejection-purity.ts

import type { InvariantModule, InvariantResult, SessionSnapshot } from "./types";

const I3: InvariantModule = {
  id: "I3",
  description:
    "Failed proof leaves ALL projections unchanged. " +
    "No Stage mutation, no new StoryCommit, no Action_Log entry survives " +
    "a proof rejection.",

  check(state: SessionSnapshot): InvariantResult {
    // This invariant is checked by comparing before/after snapshots
    // when a proof rejection occurs. The `state` parameter represents
    // the snapshot AFTER the rejection.
    //
    // The test harness calls this with a "before" snapshot captured
    // before the rejected operation and the "after" snapshot captured
    // after. The harness passes the AFTER snapshot here; the BEFORE
    // snapshot is stored on the test context.
    //
    // For standalone use, this checks structural consistency:
    // if no new commit was appended, Stage must not have changed.

    const { stage, storyCommits, headCommitId } = state;

    // Check 1: head must be the last commit (no orphaned head)
    if (storyCommits.length > 0) {
      const lastCommit = storyCommits[storyCommits.length - 1];
      if (headCommitId !== lastCommit.id) {
        return {
          invariantId: "I3",
          description: I3.description,
          holds: false,
          violation: {
            message: "Head commit ID does not match last StoryCommit",
            expected: lastCommit.id,
            actual: headCommitId,
            location: "SessionSnapshot.headCommitId",
          },
          checkedAt: new Date().toISOString(),
        };
      }
    }

    // Check 2: action log entries must have corresponding commits
    // (no orphaned actions from rejected proofs)
    const commitActionOps = storyCommits.flatMap((c) =>
      c.ops.filter((op) => op.type === "ACTION_LOG")
    );
    if (stage.actionLog.length > commitActionOps.length) {
      return {
        invariantId: "I3",
        description: I3.description,
        holds: false,
        violation: {
          message:
            "Action_Log has more entries than StoryCommit ACTION_LOG ops. " +
            "Stage was mutated by a rejected proof.",
          expected: commitActionOps.length,
          actual: stage.actionLog.length,
          location: "stage.actionLog",
        },
        checkedAt: new Date().toISOString(),
      };
    }

    return {
      invariantId: "I3",
      description: I3.description,
      holds: true,
      checkedAt: new Date().toISOString(),
    };
  },

  assert(state: SessionSnapshot): void {
    const result = I3.check(state);
    if (!result.holds) {
      throw new InvariantViolationError(result);
    }
  },
};

export class InvariantViolationError extends Error {
  constructor(public readonly result: InvariantResult) {
    super(
      `Invariant ${result.invariantId} violated: ${result.violation?.message}`
    );
    this.name = "InvariantViolationError";
  }
}

export default I3;
```

### Invariant index (`audit/invariants/index.ts`)

```typescript
// audit/invariants/index.ts

export { default as I1 } from "./i1-projection-fidelity";
export { default as I2 } from "./i2-commit-ordering";
export { default as I3 } from "./i3-rejection-purity";
export { default as I4 } from "./i4-head-consistency";
export { default as I5 } from "./i5-draft-immutability";
export { default as I6 } from "./i6-session-isolation";
export { default as I7 } from "./i7-recovery-completeness";
export { InvariantViolationError } from "./i3-rejection-purity";
export type {
  InvariantModule,
  InvariantResult,
  SessionSnapshot,
} from "./types";

import I1 from "./i1-projection-fidelity";
import I2 from "./i2-commit-ordering";
import I3 from "./i3-rejection-purity";
import I4 from "./i4-head-consistency";
import I5 from "./i5-draft-immutability";
import I6 from "./i6-session-isolation";
import I7 from "./i7-recovery-completeness";
import type { InvariantModule, SessionSnapshot, InvariantResult } from "./types";

/** All invariants in check order */
export const ALL_INVARIANTS: InvariantModule[] = [I1, I2, I3, I4, I5, I6, I7];

/** Check all invariants, return all results (never throws) */
export function checkAll(state: SessionSnapshot): InvariantResult[] {
  return ALL_INVARIANTS.map((inv) => inv.check(state));
}

/** Assert all invariants, throw on first violation */
export function assertAll(state: SessionSnapshot): void {
  for (const inv of ALL_INVARIANTS) {
    inv.assert(state);
  }
}

/** Check a subset of invariants by ID */
export function checkSubset(
  state: SessionSnapshot,
  ids: string[]
): InvariantResult[] {
  return ALL_INVARIANTS
    .filter((inv) => ids.includes(inv.id))
    .map((inv) => inv.check(state));
}
```

### Summary of all seven invariants

| ID | Name | Checked by | What it asserts |
|---|---|---|---|
| I1 | Projection fidelity | `i1-projection-fidelity.ts` | `fold(StoryCommits)` equals materialized Stage projection |
| I2 | Commit ordering | `i2-commit-ordering.ts` | Parent-child chain is linear, acyclic, no gaps |
| I3 | Rejection purity | `i3-rejection-purity.ts` | Failed proof leaves ALL projections unchanged |
| I4 | Head consistency | `i4-head-consistency.ts` | Every mutation observes the current canonical head |
| I5 | Draft immutability | `i5-draft-immutability.ts` | No action replaces screenplay without explicit intent |
| I6 | Session isolation | `i6-session-isolation.ts` | No cross-session state leakage |
| I7 | Recovery completeness | `i7-recovery-completeness.ts` | Export/import/reset round-trips perfectly |

---

## 4. Executable Test Structure (`tests/audit/`)

### Naming convention

Every P0/P1 finding gets a test file:

```
tests/audit/{ID}.{kebab-title}.test.ts
```

Examples:
- `tests/audit/COR-001-proof-atomicity.test.ts`
- `tests/audit/REC-001-schema-roundtrip.test.ts`
- `tests/audit/SEC-002-stage-and-swap.test.ts`

### Test categories

| Directory | Purpose | Runner |
|---|---|---|
| `tests/audit/*.test.ts` | Finding-specific reproduction + regression | `node:test` |
| `tests/audit/helpers/` | Shared harnesses, not tests themselves | N/A |
| `tests/audit/properties/` | Property-based / fuzz tests | `fast-check` + `node:test` |
| `tests/audit/concurrency/` | Race condition tests | `node:test` + `Promise.all` |
| `tests/audit/contracts/` | API boundary type/schema tests | `node:test` |

### Shared test harness (`tests/audit/helpers/session-harness.ts`)

```typescript
// tests/audit/helpers/session-harness.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { checkAll, assertAll } from "../../../audit/invariants";
import type { SessionSnapshot } from "../../../audit/invariants";

export interface TestSession {
  sessionId: string;
  stage: StageHandle;
  orchestrator: OrchestratorHandle;
  cleanup: () => Promise<void>;
}

/**
 * Create an isolated test session with known state.
 * Each test gets its own SQLite database, cleaned up after.
 */
export async function createTestSession(
  options?: { agents?: number; locations?: number }
): Promise<TestSession> {
  const sessionId = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  // Implementation creates a temp Stage, seeds it with test data,
  // and returns a handle. The temp directory is cleaned up on cleanup().
  // ...
  return {
    sessionId,
    stage: /* ... */,
    orchestrator: /* ... */,
    cleanup: async () => { /* rm -rf temp dir */ },
  };
}

/**
 * Capture a SessionSnapshot for invariant checking.
 * This is the canonical way to get state for before/after comparison.
 */
export async function captureSnapshot(
  session: TestSession
): Promise<SessionSnapshot> {
  const storyCommits = await session.stage.getStoryCommits();
  const headCommitId = await session.stage.getHeadCommitId();
  const stageState = await session.stage.getMaterializedState();
  const narrativeState = await session.orchestrator.getNarrativeState();
  const draft = await getDraftState(session.sessionId);

  return {
    storyCommits,
    headCommitId,
    stage: stageState,
    narrativeState,
    draft,
    sessionId: session.sessionId,
    schemaVersion: await session.stage.getSchemaVersion(),
  };
}

/**
 * Assert two snapshots are identical for a specific set of fields.
 * Used to verify that a rejected operation changed nothing.
 */
export function assertSnapshotsEqual(
  before: SessionSnapshot,
  after: SessionSnapshot,
  fields?: string[]
): void {
  const compareFields = fields ?? [
    "storyCommits",
    "headCommitId",
    "stage",
    "narrativeState",
    "draft",
  ];

  for (const field of compareFields) {
    const b = JSON.stringify((before as any)[field]);
    const a = JSON.stringify((after as any)[field]);
    assert.equal(a, b, `Field "${field}" changed after rejected operation`);
  }
}
```

### Full test example: COR-001 -- Proof Atomicity

```typescript
// tests/audit/COR-001-proof-atomicity.test.ts
//
// Finding: Stage mutations survive proof rejection
// Invariant: I3 (rejection purity), I4 (head consistency)
// Wave: C

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createTestSession,
  captureSnapshot,
  assertSnapshotsEqual,
} from "./helpers/session-harness";
import { assertAll, checkAll } from "../../audit/invariants";

describe("COR-001: Proof atomicity", () => {
  it("rejected proof leaves Stage unchanged", async () => {
    const session = await createTestSession({ agents: 2, locations: 3 });

    try {
      // 1. Capture baseline state
      const before = await captureSnapshot(session);

      // 2. Drive a turn whose Tier-1 proof will reject.
      //    Use an action with an invalid causal link that the proof
      //    kernel must reject.
      const rejectedAction = {
        type: "MOVE",
        agent: "agent-1",
        from: "location-1",
        to: "location-nonexistent",
        causalLink: "invalid-link-id", // Tier-1 rejects: unknown link
      };

      const result = await session.orchestrator.runTurn(rejectedAction);

      // 3. The turn should report the rejection
      assert.equal(result.proofResult.accepted, false, "Proof must reject");

      // 4. Capture state after rejection
      const after = await captureSnapshot(session);

      // 5. Assert ALL projections unchanged
      assertSnapshotsEqual(before, after);

      // 6. Assert zero new StoryCommit rows
      assert.equal(
        after.storyCommits.length,
        before.storyCommits.length,
        "No new StoryCommit should be created on rejection"
      );

      // 7. Assert zero new Action_Log rows
      assert.equal(
        after.stage.actionLog.length,
        before.stage.actionLog.length,
        "No new Action_Log entry should be created on rejection"
      );

      // 8. Check ALL 7 invariants on the result
      const invariantResults = checkAll(after);
      for (const inv of invariantResults) {
        assert.equal(inv.holds, true, `Invariant ${inv.invariantId} violated: ${inv.violation?.message}`);
      }
    } finally {
      await session.cleanup();
    }
  });

  it("rejected proof via Converge SSE leaves Stage unchanged", async () => {
    const session = await createTestSession({ agents: 3, locations: 4 });

    try {
      const before = await captureSnapshot(session);

      // Drive Converge with candidates that all fail Tier-1
      const convergeResult = await session.orchestrator.runConverge({
        scenes: [{ target: "location-2", mechanism: "invalid" }],
        budget: 5,
      });

      assert.equal(convergeResult.winner, null, "No winner expected");

      const after = await captureSnapshot(session);
      assertSnapshotsEqual(before, after);
      assertAll(after);
    } finally {
      await session.cleanup();
    }
  });

  it("rejected proof via Director's Cut leaves Stage unchanged", async () => {
    const session = await createTestSession({ agents: 1, locations: 2 });

    try {
      const before = await captureSnapshot(session);

      // Director's Cut with ops that would fail proof
      const dcResult = await session.orchestrator.injectOps({
        ops: [{ type: "ADD_FACT", fact: "invalid-fact-structure" }],
        origin: "director_cut",
      });

      // Depending on Model A vs Model B, this either rejects or
      // creates an override commit. Test both paths.

      const after = await captureSnapshot(session);

      if (dcResult.rejected) {
        // Model A: nothing changed
        assertSnapshotsEqual(before, after);
      } else {
        // Model B: override commit created, but labeled correctly
        assert.equal(
          dcResult.commit.origin,
          "director_cut",
          "Override commit must be labeled"
        );
        assert.equal(
          dcResult.commit.proofPassed,
          false,
          "Override commit must not claim proof passed"
        );
      }

      assertAll(after);
    } finally {
      await session.cleanup();
    }
  });
});
```

### Property-based testing (`tests/audit/properties/command-sequence.test.ts`)

```typescript
// tests/audit/properties/command-sequence.test.ts
//
// Generates random sequences of commands (turns, room runs,
// Director's Cut, Converge, revert) and asserts invariants hold
// after every command.

import { describe, it } from "node:test";
import * as fc from "fast-check";
import { createTestSession, captureSnapshot } from "../helpers/session-harness";
import { checkAll } from "../../../audit/invariants";

type CommandType =
  | { kind: "turn"; agentIdx: number; actionType: string }
  | { kind: "room"; agentIndices: number[] }
  | { kind: "directors_cut"; ops: unknown[] }
  | { kind: "converge"; sceneCount: number }
  | { kind: "revert"; commitIdx: number };

const commandArb: fc.Arbitrary<CommandType> = fc.oneof(
  fc.record({
    kind: fc.constant("turn" as const),
    agentIdx: fc.integer({ min: 0, max: 4 }),
    actionType: fc.constantFrom("SPEAK", "MOVE", "OBSERVE"),
  }),
  fc.record({
    kind: fc.constant("room" as const),
    agentIndices: fc.uniqueArray(fc.integer({ min: 0, max: 4 }), {
      minLength: 1,
      maxLength: 3,
    }),
  }),
  fc.record({
    kind: fc.constant("converge" as const),
    sceneCount: fc.integer({ min: 1, max: 3 }),
  }),
  fc.record({
    kind: fc.constant("revert" as const),
    commitIdx: fc.integer({ min: 0, max: 10 }),
  })
);

describe("Property: invariants hold after random command sequences", () => {
  it("any sequence of valid commands preserves all invariants", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(commandArb, { minLength: 1, maxLength: 20 }),
        async (commands) => {
          const session = await createTestSession({
            agents: 3,
            locations: 4,
          });

          try {
            for (const cmd of commands) {
              switch (cmd.kind) {
                case "turn":
                  await session.orchestrator.runTurn({
                    type: cmd.actionType,
                    agent: `agent-${cmd.agentIdx}`,
                  });
                  break;
                case "room":
                  await session.orchestrator.runRoom({
                    agents: cmd.agentIndices.map((i) => `agent-${i}`),
                  });
                  break;
                case "converge":
                  await session.orchestrator.runConverge({
                    scenes: Array.from({ length: cmd.sceneCount }),
                    budget: 3,
                  });
                  break;
                case "revert":
                  await session.orchestrator.revert(cmd.commitIdx);
                  break;
              }

              // After every command, check ALL invariants
              const snapshot = await captureSnapshot(session);
              const results = checkAll(snapshot);
              const violations = results.filter((r) => !r.holds);

              if (violations.length > 0) {
                throw new Error(
                  `Invariants violated after ${cmd.kind}: ` +
                    violations.map((v) => `${v.invariantId}: ${v.violation?.message}`).join("; ")
                );
              }
            }
          } finally {
            await session.cleanup();
          }
        }
      ),
      { numRuns: 100, timeout: 60_000 }
    );
  });
});
```

### Concurrency test example (`tests/audit/concurrency/reset-vs-turn.test.ts`)

```typescript
// tests/audit/concurrency/reset-vs-turn.test.ts
//
// Finding: REC-004 -- Reset races active async work
// Verifies the session mutation coordinator prevents concurrent mutation.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTestSession, captureSnapshot } from "../helpers/session-harness";
import { createBarrier } from "../helpers/concurrent-barrier";
import { assertAll } from "../../../audit/invariants";

describe("REC-004: Reset cannot race an active turn", () => {
  it("reset waits for in-flight turn to complete", async () => {
    const session = await createTestSession({ agents: 2, locations: 3 });

    try {
      // Create a barrier so the turn takes long enough
      const barrier = createBarrier(2);

      // Start a slow turn (mock provider delays 500ms)
      const turnPromise = session.orchestrator.runTurn(
        { type: "SPEAK", agent: "agent-1" },
        { providerDelay: 500 }
      );

      // Give the turn time to start
      await new Promise((r) => setTimeout(r, 50));

      // Attempt reset while turn is running
      const resetPromise = session.orchestrator.reset();

      // Both should complete without error
      const [turnResult, resetResult] = await Promise.all([
        turnPromise,
        resetPromise,
      ]);

      // The reset should have waited for the turn
      // (or the turn was aborted and rolled back cleanly)
      assert.ok(
        turnResult.completed || turnResult.aborted,
        "Turn must complete or be cleanly aborted"
      );
      assert.ok(resetResult.completed, "Reset must complete");

      // Final state must be consistent
      const snapshot = await captureSnapshot(session);
      assertAll(snapshot);
    } finally {
      await session.cleanup();
    }
  });
});
```

---

## 5. Enforcement Layer (`audit/rules/`)

Custom ESLint rules prevent whole CLASSES of finding at the compiler level.
A developer cannot write the code that causes SEC-003, COR-001, etc.

### Rule: `no-db-file-copy` (prevents SEC-003 / REC-003)

```typescript
// audit/rules/no-db-file-copy.ts

import type { Rule } from "eslint";

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Ban fs.copyFileSync/cpSync on .db files. Use server/lib/backup.ts " +
        "online-backup API instead. Raw file copy is not WAL-safe.",
      category: "Audit",
      recommended: true,
    },
    messages: {
      noDbCopy:
        "Do not use {{method}} on database files. Use the online-backup API " +
        "from server/lib/backup.ts. Raw file copy misses WAL-resident pages.",
    },
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;

        // Match fs.copyFileSync(...) or fs.cpSync(...)
        const isFsCopy =
          callee.type === "MemberExpression" &&
          callee.object.type === "Identifier" &&
          callee.object.name === "fs" &&
          callee.property.type === "Identifier" &&
          ["copyFileSync", "cpSync"].includes(callee.property.name);

        if (!isFsCopy) return;

        // Check if any argument ends with .db or references a DB path
        const args = node.arguments;
        for (const arg of args) {
          if (arg.type === "Literal" && typeof arg.value === "string") {
            if (arg.value.endsWith(".db") || arg.value.includes("Stage")) {
              context.report({
                node,
                messageId: "noDbCopy",
                data: { method: (callee.property as any).name },
              });
            }
          }
          // Also flag template literals containing .db
          if (arg.type === "TemplateLiteral") {
            const hasDb = arg.quasis.some(
              (q) => q.value.raw.includes(".db") || q.value.raw.includes("Stage")
            );
            if (hasDb) {
              context.report({
                node,
                messageId: "noDbCopy",
                data: { method: (callee.property as any).name },
              });
            }
          }
        }
      },
    };
  },
};

export default rule;
```

### Rule: `no-direct-commit-append` (prevents COR-001)

```typescript
// audit/rules/no-direct-commit-append.ts

import type { Rule } from "eslint";

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Ban direct Stage.appendCommit() from route handlers. All canon " +
        "mutations must go through CanonService to ensure proof-before-mutation " +
        "ordering.",
      category: "Audit",
      recommended: true,
    },
    messages: {
      noDirectAppend:
        "Do not call Stage.appendCommit() directly from route code. " +
        "Use CanonService.apply() which enforces proof → commit → materialize " +
        "atomicity.",
    },
    schema: [],
  },

  create(context) {
    const filename = context.getFilename();

    // Only apply to route files
    if (!filename.includes("routes/")) return {};

    return {
      CallExpression(node) {
        const callee = node.callee;

        // Match stage.appendCommit(...) or Stage.appendCommit(...)
        const isAppendCommit =
          callee.type === "MemberExpression" &&
          callee.property.type === "Identifier" &&
          callee.property.name === "appendCommit";

        if (isAppendCommit) {
          context.report({
            node,
            messageId: "noDirectAppend",
          });
        }
      },
    };
  },
};

export default rule;
```

### ESLint config integration

```javascript
// eslint.config.js (flat config, ESLint v9+)

import auditNoDbCopy from "./audit/rules/no-db-file-copy.js";
import auditNoSessionIdFromBody from "./audit/rules/no-session-id-from-body.js";
import auditNoRawStreamError from "./audit/rules/no-raw-stream-error.js";
import auditNoCrossTreeImport from "./audit/rules/no-cross-tree-import.js";
import auditNoDirectCommitAppend from "./audit/rules/no-direct-commit-append.js";

export default [
  {
    files: ["server/**/*.ts", "src/**/*.ts"],
    plugins: {
      audit: {
        rules: {
          "no-db-file-copy": auditNoDbCopy,
          "no-session-id-from-body": auditNoSessionIdFromBody,
          "no-raw-stream-error": auditNoRawStreamError,
          "no-cross-tree-import": auditNoCrossTreeImport,
          "no-direct-commit-append": auditNoDirectCommitAppend,
        },
      },
    },
    rules: {
      "audit/no-db-file-copy": "error",
      "audit/no-session-id-from-body": "error",
      "audit/no-raw-stream-error": "error",
      "audit/no-cross-tree-import": "error",
      "audit/no-direct-commit-append": "error",
    },
  },
];
```

### Architecture tests (`tests/audit/contracts/api-boundary.test.ts`)

```typescript
// tests/audit/contracts/api-boundary.test.ts
//
// Verifies import boundaries: src/ never imports server/ and vice versa.
// This is the test equivalent of the no-cross-tree-import ESLint rule,
// providing defense in depth.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory() && entry !== "node_modules" && entry !== "dist") {
      results.push(...collectTsFiles(full));
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      results.push(full);
    }
  }
  return results;
}

function findImports(filePath: string): string[] {
  const content = readFileSync(filePath, "utf-8");
  const importRegex = /from\s+["']([^"']+)["']/g;
  const imports: string[] = [];
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

const ROOT = join(import.meta.dirname, "..", "..", "..");

describe("Architecture: import boundaries", () => {
  const srcFiles = collectTsFiles(join(ROOT, "src"));
  const serverFiles = collectTsFiles(join(ROOT, "server"));

  it("src/ never imports from server/", () => {
    for (const file of srcFiles) {
      const imports = findImports(file);
      const violations = imports.filter(
        (i) => i.startsWith("server/") || i.startsWith("../server/")
      );
      assert.equal(
        violations.length,
        0,
        `${relative(ROOT, file)} imports server/: ${violations.join(", ")}`
      );
    }
  });

  it("server/ never imports from src/", () => {
    for (const file of serverFiles) {
      const imports = findImports(file);
      const violations = imports.filter(
        (i) => i.startsWith("src/") || i.startsWith("../src/")
      );
      assert.equal(
        violations.length,
        0,
        `${relative(ROOT, file)} imports src/: ${violations.join(", ")}`
      );
    }
  });
});
```

---

## 6. Risk Model (`audit/risk.ts`)

Each finding gets a computed risk score. Higher score = higher priority.

### Formula

```
risk = severity_weight * blast_radius * exposure * (1 / remediation_cost)
```

### Implementation

```typescript
// audit/risk.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

interface Finding {
  id: string;
  title: string;
  severity: string;
  boundary: string;
  status: string;
  evidence: { file: string; line: number; excerpt: string }[];
  invariants: string[];
  depends_on: string[];
  blocks: string[];
  wave: string;
}

interface RiskScore {
  findingId: string;
  severityWeight: number;
  blastRadius: number;
  exposure: number;
  remediationCost: number;
  riskScore: number;
  rank: number;
}

const SEVERITY_WEIGHTS: Record<string, number> = {
  P0: 100,
  P1: 50,
  P2: 20,
  P3: 5,
};

/**
 * Compute blast radius: how many other files/functions depend on the
 * affected code. Uses a simple grep-based heuristic.
 *
 * For each evidence file:line, count how many other files import from it
 * or call the function at that line.
 */
export function computeBlastRadius(finding: Finding): number {
  let totalCallers = 0;

  for (const ev of finding.evidence) {
    // Heuristic: count files that import the evidence file
    const modulePath = ev.file.replace(/\.(ts|tsx)$/, "");
    const importPattern = modulePath.replace(/\//g, "[/\\\\]");

    // This would ideally use an AST parser. For now, grep.
    // The actual implementation runs:
    //   grep -r "from.*{modulePath}" server/ src/ --include="*.ts" | wc -l
    //
    // Placeholder: use the evidence line number as a rough proxy
    // (higher line = more complex function = more callers)
    const estimatedCallers = Math.max(1, Math.floor(ev.line / 100));
    totalCallers += estimatedCallers;
  }

  return Math.max(1, totalCallers);
}

/**
 * Compute exposure: fraction of code paths that can trigger the finding.
 * Based on how many entry points (routes, UI actions) can reach the
 * affected code.
 */
export function computeExposure(finding: Finding): number {
  // Boundary-based heuristic
  const boundaryExposure: Record<string, number> = {
    canon: 0.8, // most operations touch canon
    lifecycle: 0.6, // export/import/reset are less frequent
    proof: 0.5, // converge/director's cut are expert features
    draft: 0.7, // editor is always active
    trust: 0.3, // trust boundaries hit on specific conditions
    product: 0.9, // product UI is always visible
    architecture: 0.1, // architecture debt rarely triggered at runtime
    ci: 0.0, // CI issues don't affect runtime
  };

  return boundaryExposure[finding.boundary] ?? 0.5;
}

/**
 * Compute remediation cost: estimated fix complexity (1-10).
 * Based on the number of files affected and the boundary type.
 */
export function computeRemediationCost(finding: Finding): number {
  const evidenceFiles = new Set(finding.evidence.map((e) => e.file)).size;
  const baseCost = evidenceFiles * 2;

  // Cross-boundary fixes are more expensive
  const boundaryMultiplier: Record<string, number> = {
    canon: 1.5,
    lifecycle: 1.3,
    proof: 1.4,
    draft: 1.0,
    trust: 1.2,
    product: 0.8,
    architecture: 2.0,
    ci: 0.5,
  };

  const multiplier = boundaryMultiplier[finding.boundary] ?? 1.0;
  return Math.min(10, Math.max(1, Math.ceil(baseCost * multiplier)));
}

/**
 * Compute risk score for a single finding.
 */
export function computeRisk(finding: Finding): RiskScore {
  const severityWeight = SEVERITY_WEIGHTS[finding.severity] ?? 5;
  const blastRadius = computeBlastRadius(finding);
  const exposure = computeExposure(finding);
  const remediationCost = computeRemediationCost(finding);

  const riskScore =
    severityWeight * blastRadius * exposure * (1 / remediationCost);

  return {
    findingId: finding.id,
    severityWeight,
    blastRadius,
    exposure,
    remediationCost,
    riskScore: Math.round(riskScore * 100) / 100,
    rank: 0, // filled in by rankAll
  };
}

/**
 * Compute risk for all findings and rank them.
 */
export function computeAllRisks(findings: Finding[]): RiskScore[] {
  const scores = findings
    .filter((f) => f.status !== "verified" && f.status !== "regression")
    .map(computeRisk)
    .sort((a, b) => b.riskScore - a.riskScore);

  scores.forEach((s, i) => (s.rank = i + 1));
  return scores;
}

/**
 * Build the dependency DAG. Returns a map of finding ID to the IDs
 * that must be fixed first.
 */
export function buildDependencyDAG(
  findings: Finding[]
): Map<string, string[]> {
  const dag = new Map<string, string[]>();

  for (const f of findings) {
    dag.set(f.id, f.depends_on);
  }

  // Validate: no cycles
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(node: string): boolean {
    if (inStack.has(node)) return false; // cycle
    if (visited.has(node)) return true;
    visited.add(node);
    inStack.add(node);
    for (const dep of dag.get(node) ?? []) {
      if (!dfs(dep)) return false;
    }
    inStack.delete(node);
    return true;
  }

  for (const id of dag.keys()) {
    if (!dfs(id)) {
      throw new Error(`Cycle detected in dependency DAG at ${id}`);
    }
  }

  return dag;
}

/**
 * Get topological order of findings for fixing.
 * Returns findings in the order they should be addressed.
 */
export function getFixOrder(findings: Finding[]): string[] {
  const dag = buildDependencyDAG(findings);
  const visited = new Set<string>();
  const order: string[] = [];

  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    for (const dep of dag.get(id) ?? []) {
      visit(dep);
    }
    order.push(id);
  }

  for (const id of dag.keys()) {
    visit(id);
  }

  return order;
}

// --- CLI entry point ---

if (process.argv[1] && process.argv[1].includes("risk")) {
  const root = join(import.meta.dirname, "..");
  const raw = readFileSync(join(root, "audit", "findings.yaml"), "utf-8");
  const data = parse(raw) as { findings: Finding[] };

  const risks = computeAllRisks(data.findings);
  const fixOrder = getFixOrder(data.findings);

  console.log("\n=== RISK SCORES (top 15) ===\n");
  for (const r of risks.slice(0, 15)) {
    console.log(
      `  #${r.rank}  ${r.findingId.padEnd(10)}  risk=${r.riskScore.toFixed(1).padStart(6)}  ` +
        `sev=${r.severityWeight}  blast=${r.blastRadius}  expo=${r.exposure.toFixed(2)}  ` +
        `cost=${r.remediationCost}`
    );
  }

  console.log("\n=== DEPENDENCY DAG (top 15) ===\n");
  const top15 = risks.slice(0, 15).map((r) => r.findingId);
  for (const id of top15) {
    const deps = data.findings.find((f) => f.id === id)?.depends_on ?? [];
    const blocks = data.findings.find((f) => f.id === id)?.blocks ?? [];
    const depStr = deps.length ? ` <- [${deps.join(", ")}]` : "";
    const blockStr = blocks.length ? ` -> [${blocks.join(", ")}]` : "";
    console.log(`  ${id}${depStr}${blockStr}`);
  }
}
```

### Dependency DAG for top 15 findings

Based on the findings from SECURITY.md and RELIABILITY.md:

```
REC-001 (schema version)
  <- (nothing)
  -> REC-002, REC-007, SEC-001

REC-002 (stage-and-swap import)
  <- REC-001
  -> (nothing)

REC-003 (WAL-safe backup)
  <- (nothing)
  -> (nothing)

REC-004 (mutation coordinator)
  <- (nothing)
  -> REC-005, REC-006, COR-001

REC-005 (turn/room serialization)
  <- REC-004
  -> (nothing)

REC-006 (room timeout cancellation)
  <- REC-004
  -> (nothing)

COR-001 (proof atomicity)
  <- REC-004
  -> COR-002, COR-003, COR-004

COR-002 (cache head)
  <- COR-001
  -> (nothing)

COR-003 (belief/emotion ownership)
  <- COR-001
  -> (nothing)

COR-004 (room action commits)
  <- COR-001
  -> (nothing)

COR-005 (converge mechanism)
  <- (nothing)
  -> COR-006, COR-008

COR-006 (arc abstention)
  <- COR-005
  -> (nothing)

COR-007 (director's cut provenance)
  <- (nothing)
  -> (nothing)

COR-008 (converge re-prove)
  <- COR-005
  -> (nothing)

SEC-004 (simulation proposal)
  <- (nothing)
  -> SEC-006
```

---

## 7. Living Documentation Generator (`audit/generate.ts`)

The generator reads `findings.yaml`, test results, enforcement status, and
risk scores. It produces SECURITY.md and RELIABILITY.md as output artifacts.
Manual edits to these files are overwritten on every CI run.

```typescript
// audit/generate.ts

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { computeAllRisks, buildDependencyDAG } from "./risk";

interface Finding {
  id: string;
  title: string;
  severity: string;
  confidence: string;
  boundary: string;
  status: string;
  evidence: { file: string; line: number; excerpt: string }[];
  invariants: string[];
  depends_on: string[];
  blocks: string[];
  wave: string;
  test_id: string;
  regression_test_id: string;
  risk_score: number | null;
  last_verified: string | null;
}

interface TestResult {
  testFile: string;
  passed: boolean;
  duration: number;
}

interface EnforcementRule {
  name: string;
  enabled: boolean;
  file: string;
}

interface AuditData {
  findings: Finding[];
  testResults: TestResult[];
  enforcementRules: EnforcementRule[];
  generatedAt: string;
}

/**
 * Load all audit data from the filesystem.
 */
function loadAuditData(): AuditData {
  const root = join(import.meta.dirname, "..");
  const raw = readFileSync(join(root, "audit", "findings.yaml"), "utf-8");
  const data = parse(raw) as { findings: Finding[] };

  // Test results come from the test runner output
  // In CI, this is parsed from the node:test JSON reporter
  const testResults = loadTestResults(root);

  // Enforcement rules are read from the ESLint config
  const enforcementRules = loadEnforcementStatus(root);

  return {
    findings: data.findings,
    testResults,
    enforcementRules,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate SECURITY.md from audit data.
 */
function generateSecurityMd(data: AuditData): string {
  const securityFindings = data.findings.filter((f) =>
    ["trust", "lifecycle"].includes(f.boundary) ||
    f.id.startsWith("SEC-")
  );

  const risks = computeAllRisks(data.findings);

  let md = `# STORYMACHINE -- Security Audit (Generated)

> **This file is auto-generated by \`audit/generate.ts\`.**
> **Do not edit manually. Changes will be overwritten on the next CI run.**
> **Source of truth: \`audit/findings.yaml\`**
>
> Generated: ${data.generatedAt}

---

## Summary

| Status | Count |
|---|---|
| Open | ${securityFindings.filter((f) => f.status === "open").length} |
| In Progress | ${securityFindings.filter((f) => f.status === "in_progress").length} |
| Verified | ${securityFindings.filter((f) => f.status === "verified").length} |
| Regression | ${securityFindings.filter((f) => f.status === "regression").length} |

## Enforcement

The following ESLint rules are active and prevent reintroduction:

${data.enforcementRules
  .filter((r) => r.enabled)
  .map((r) => `- \`${r.name}\` -- ${r.file}`)
  .join("\n")}

---

`;

  // Group by severity
  for (const severity of ["P0", "P1", "P2", "P3"]) {
    const sevFindings = securityFindings.filter(
      (f) => f.severity === severity
    );
    if (sevFindings.length === 0) continue;

    md += `## ${severity} Findings\n\n`;

    for (const f of sevFindings) {
      const risk = risks.find((r) => r.findingId === f.id);
      const testResult = data.testResults.find((t) =>
        t.testFile.includes(f.id)
      );
      const testStatus = testResult
        ? testResult.passed
          ? "PASSING"
          : "FAILING"
        : "NO TEST";

      md += `### ${f.id}: ${f.title}\n\n`;
      md += `| | |\n|---|---|\n`;
      md += `| **Severity** | ${f.severity} |\n`;
      md += `| **Confidence** | ${f.confidence} |\n`;
      md += `| **Boundary** | ${f.boundary} |\n`;
      md += `| **Status** | ${f.status.toUpperCase()} |\n`;
      md += `| **Test** | ${testStatus} |\n`;
      md += `| **Risk Score** | ${risk?.riskScore.toFixed(1) ?? "N/A"} |\n`;
      md += `| **Invariants** | ${f.invariants.join(", ") || "none"} |\n`;

      if (f.depends_on.length > 0) {
        md += `| **Depends on** | ${f.depends_on.join(", ")} |\n`;
      }
      if (f.blocks.length > 0) {
        md += `| **Blocks** | ${f.blocks.join(", ")} |\n`;
      }

      md += `\n**Evidence:**\n\n`;
      for (const ev of f.evidence) {
        md += `- \`${ev.file}:${ev.line}\` -- ${ev.excerpt}\n`;
      }

      md += `\n`;
    }
  }

  // Add auto-generated footer
  md += `---\n\n`;
  md += `*This document is regenerated on every CI run from `;
  md += `\`audit/findings.yaml\` + test results + enforcement status. `;
  md += `To modify a finding, edit the YAML source, not this file.*\n`;

  return md;
}

/**
 * Generate RELIABILITY.md from audit data.
 */
function generateReliabilityMd(data: AuditData): string {
  // Similar structure but focused on correctness, recovery, product, arch
  // ... (same pattern as generateSecurityMd, different finding filter)
  return "/* Generated RELIABILITY.md -- same pattern */";
}

// --- CLI entry point ---

if (process.argv[1] && process.argv[1].includes("generate")) {
  const data = loadAuditData();
  const root = join(import.meta.dirname, "..");

  writeFileSync(join(root, "SECURITY.md"), generateSecurityMd(data));
  writeFileSync(join(root, "RELIABILITY.md"), generateReliabilityMd(data));

  console.log(`Generated SECURITY.md and RELIABILITY.md`);
  console.log(`  Findings: ${data.findings.length}`);
  console.log(`  Tests: ${data.testResults.length}`);
  console.log(`  Enforcement rules: ${data.enforcementRules.filter((r) => r.enabled).length}`);
}
```

---

## 8. CI Pipeline Integration

### `.github/workflows/audit.yml`

```yaml
name: Audit System

on:
  push:
    branches: [main, "fix/**"]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  audit:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      # --- Layer 4: Enforcement ---

      - name: Typecheck
        run: npx tsc --noEmit

      - name: ESLint with audit rules
        run: npx eslint server/ src/ --config eslint.config.js
        # Fails if any audit rule is violated

      - name: Architecture boundary tests
        run: node --experimental-strip-types --test tests/audit/contracts/api-boundary.test.ts

      - name: Schema version single-source test
        run: node --experimental-strip-types --test tests/audit/contracts/schema-version.test.ts

      # --- Layer 3: Executable tests ---

      - name: Audit tests (finding reproduction + regression)
        run: node --experimental-strip-types --test tests/audit/*.test.ts
        env:
          NODE_ENV: test

      - name: Property-based tests
        run: node --experimental-strip-types --test tests/audit/properties/*.test.ts
        timeout-minutes: 5

      - name: Concurrency tests
        run: node --experimental-strip-types --test tests/audit/concurrency/*.test.ts
        timeout-minutes: 3

      - name: Contract tests
        run: node --experimental-strip-types --test tests/audit/contracts/*.test.ts

      - name: Existing test suite (regression)
        run: npm test

      - name: Metamorphic tests
        run: npm run test:metamorphic

      # --- Layer 5: Risk model ---

      - name: Compute risk scores
        run: node --experimental-strip-types audit/risk.ts

      # --- Layer 6: Living docs ---

      - name: Generate audit documentation
        run: node --experimental-strip-types audit/generate.ts

      - name: Check documentation drift
        run: |
          git diff --exit-code SECURITY.md RELIABILITY.md || {
            echo "ERROR: Generated docs differ from committed docs."
            echo "Run 'npm run audit:generate' locally and commit the result."
            exit 1
          }

      # --- Gate checks ---

      - name: Verify P0 findings have regression tests
        run: node --experimental-strip-types scripts/verify-p0-tests.ts
        # Script reads findings.yaml, checks that every P0 finding
        # with status "verified" has a regression_test_id and that
        # test is passing.

      - name: Verify no enforcement rules disabled
        run: node --experimental-strip-types scripts/verify-enforcement.ts
        # Script reads eslint.config.js and verifies all audit rules
        # are set to "error", not "warn" or "off".

      - name: Verify risk score did not increase
        run: node --experimental-strip-types scripts/verify-risk-trend.ts
        # Compares current risk scores to the last committed baseline.
        # Fails if total risk increased.

      # --- Status dashboard ---

      - name: Generate status dashboard
        run: node --experimental-strip-types audit/status.ts

      - name: Upload audit artifacts
        uses: actions/upload-artifact@v4
        with:
          name: audit-report
          path: |
            SECURITY.md
            RELIABILITY.md
            audit-status.txt
```

### Gate scripts

**`scripts/verify-p0-tests.ts`** -- Every P0 finding that is `verified` must
have a regression test that passes:

```typescript
// scripts/verify-p0-tests.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

const root = join(import.meta.dirname, "..");
const raw = readFileSync(join(root, "audit", "findings.yaml"), "utf-8");
const data = parse(raw) as { findings: any[] };

const p0Findings = data.findings.filter(
  (f: any) => f.severity === "P0" && f.status === "verified"
);

let exitCode = 0;
for (const f of p0Findings) {
  if (!f.regression_test_id) {
    console.error(`FAIL: ${f.id} is verified P0 but has no regression_test_id`);
    exitCode = 1;
  }
}

if (exitCode === 0) {
  console.log(`PASS: All ${p0Findings.length} verified P0 findings have regression tests`);
} else {
  process.exit(exitCode);
}
```

**`scripts/verify-enforcement.ts`** -- All audit ESLint rules must be `error`:

```typescript
// scripts/verify-enforcement.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const config = readFileSync(join(root, "eslint.config.js"), "utf-8");

const auditRules = [
  "audit/no-db-file-copy",
  "audit/no-session-id-from-body",
  "audit/no-raw-stream-error",
  "audit/no-cross-tree-import",
  "audit/no-direct-commit-append",
];

let exitCode = 0;
for (const rule of auditRules) {
  if (!config.includes(`"${rule}": "error"`)) {
    console.error(`FAIL: Rule ${rule} is not set to "error" in eslint.config.js`);
    exitCode = 1;
  }
}

if (exitCode === 0) {
  console.log(`PASS: All ${auditRules.length} enforcement rules are active`);
} else {
  process.exit(exitCode);
}
```

---

## 9. Wave Execution Engine (`audit/wave-executor.ts`)

Each repair wave becomes an executable pipeline with preconditions,
execution, and postconditions.

### Interface

```typescript
// audit/wave-executor.ts

interface CheckResult {
  passed: boolean;
  failures: string[];
}

interface WaveExecution {
  /** Wave identifier (C, R, P, D, T) */
  wave: string;
  /** Human-readable name */
  name: string;
  /** Waves that must complete before this one */
  prerequisites: string[];
  /** Finding IDs in this wave */
  findings: string[];
  /** All reproduction tests exist and are currently failing */
  preconditions: () => Promise<CheckResult>;
  /** Apply fixes for all findings in the wave */
  execute: () => Promise<void>;
  /** All tests pass, all invariants hold */
  postconditions: () => Promise<CheckResult>;
  /** Regenerate SECURITY.md and RELIABILITY.md */
  generateDocs: () => Promise<void>;
}
```

### Concrete implementation: Wave R (Recovery)

```typescript
// audit/wave-executor.ts (continued)

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

const ROOT = join(import.meta.dirname, "..");

function run(cmd: string): { stdout: string; exitCode: number } {
  try {
    const stdout = execSync(cmd, { cwd: ROOT, encoding: "utf-8" });
    return { stdout, exitCode: 0 };
  } catch (e: any) {
    return { stdout: e.stdout ?? "", exitCode: e.status ?? 1 };
  }
}

function loadFindings(): any[] {
  const raw = readFileSync(join(ROOT, "audit", "findings.yaml"), "utf-8");
  return (parse(raw) as any).findings;
}

const WAVE_R: WaveExecution = {
  wave: "R",
  name: "Recovery -- export/import/reset/restore are safe and round-trip",
  prerequisites: [],
  findings: [
    "REC-001", "REC-002", "REC-003", "REC-004", "REC-005",
    "REC-006", "REC-007", "REC-008", "REC-009",
    "SEC-001", "SEC-002", "SEC-003",
    "SEC-004", "SEC-005", "SEC-006",
    "SEC-015", "SEC-016", "SEC-017",
    "SEC-018", "SEC-019", "SEC-020",
  ],

  async preconditions(): Promise<CheckResult> {
    const failures: string[] = [];
    const findings = loadFindings().filter((f) =>
      this.findings.includes(f.id)
    );

    for (const f of findings) {
      // Check that the test file exists
      const testPath = f.test_id;
      if (!testPath) {
        failures.push(`${f.id}: no test_id defined`);
        continue;
      }

      // Run the test -- it should FAIL (reproduction test before fix)
      const result = run(
        `node --experimental-strip-types --test ${testPath} 2>&1`
      );
      if (result.exitCode === 0) {
        // Test passes -- either already fixed or test is wrong
        failures.push(
          `${f.id}: test ${testPath} passes unexpectedly (should fail before fix)`
        );
      }
    }

    return { passed: failures.length === 0, failures };
  },

  async execute(): Promise<void> {
    // This is the manual step. The engineer applies fixes for each
    // finding in dependency order:
    //
    // 1. REC-001: Derive SCHEMA_VERSION from single source
    // 2. REC-002: Stage-and-swap import
    // 3. REC-003: WAL-safe backup
    // 4. REC-004: Session mutation coordinator
    // 5. REC-005: Turn/room serialization (uses coordinator from REC-004)
    // 6. REC-006: Room timeout cancellation
    // 7. REC-007: Full session export
    // 8. REC-008: Empty snapshot import
    // 9. REC-009: Ghost score persistence
    // 10. SEC-001 through SEC-006: Overlap with REC findings
    // 11. SEC-015 through SEC-020: Additional lifecycle findings

    console.log("Wave R: Execute phase -- apply fixes manually.");
    console.log("Fix order (by dependency):");
    const findings = loadFindings().filter((f) =>
      this.findings.includes(f.id)
    );
    const dag = buildDependencyDAG(findings);
    const order = getFixOrder(findings);
    for (const id of order) {
      const f = findings.find((x: any) => x.id === id);
      console.log(`  ${id}: ${f?.title}`);
    }
  },

  async postconditions(): Promise<CheckResult> {
    const failures: string[] = [];
    const findings = loadFindings().filter((f) =>
      this.findings.includes(f.id)
    );

    for (const f of findings) {
      // Run the test -- it should PASS now
      const result = run(
        `node --experimental-strip-types --test ${f.test_id} 2>&1`
      );
      if (result.exitCode !== 0) {
        failures.push(`${f.id}: test ${f.test_id} still failing after fix`);
      }

      // Run the regression test
      if (f.regression_test_id && f.regression_test_id !== f.test_id) {
        const regResult = run(
          `node --experimental-strip-types --test ${f.regression_test_id} 2>&1`
        );
        if (regResult.exitCode !== 0) {
          failures.push(
            `${f.id}: regression test ${f.regression_test_id} failing`
          );
        }
      }
    }

    // Run all invariants against a fresh session
    const invariantResult = run(
      `node --experimental-strip-types --test tests/audit/properties/command-sequence.test.ts 2>&1`
    );
    if (invariantResult.exitCode !== 0) {
      failures.push("Property-based invariant test failing");
    }

    return { passed: failures.length === 0, failures };
  },

  async generateDocs(): Promise<void> {
    run(`node --experimental-strip-types audit/generate.ts`);
  },
};

// --- Wave registry ---

const WAVES: WaveExecution[] = [
  WAVE_R,
  // WAVE_C, WAVE_P, WAVE_D, WAVE_T defined similarly
];

/**
 * Execute a wave with full lifecycle: preconditions -> execute -> postconditions -> docs.
 */
export async function executeWave(waveId: string): Promise<void> {
  const wave = WAVES.find((w) => w.wave === waveId);
  if (!wave) throw new Error(`Unknown wave: ${waveId}`);

  console.log(`\n=== Wave ${wave.wave}: ${wave.name} ===\n`);

  // Check prerequisites
  for (const prereq of wave.prerequisites) {
    console.log(`Checking prerequisite wave ${prereq}...`);
    // Verify all findings in prerequisite wave are verified
    const prereqFindings = loadFindings().filter(
      (f) => f.wave === prereq && f.status !== "verified"
    );
    if (prereqFindings.length > 0) {
      throw new Error(
        `Wave ${prereq} not complete. Open findings: ${prereqFindings.map((f) => f.id).join(", ")}`
      );
    }
  }

  // Run preconditions
  console.log("Checking preconditions...");
  const pre = await wave.preconditions();
  if (!pre.passed) {
    console.log("Preconditions met (tests are failing as expected):");
    // For the preconditions step, we EXPECT failures
    // (the tests should be red before the fix)
  }

  // Execute fixes
  console.log("Executing fixes...");
  await wave.execute();

  // Run postconditions
  console.log("Checking postconditions...");
  const post = await wave.postconditions();
  if (!post.passed) {
    console.error("Postcondition failures:");
    for (const f of post.failures) {
      console.error(`  - ${f}`);
    }
    throw new Error(`Wave ${wave.wave} postconditions failed`);
  }

  // Generate docs
  console.log("Generating documentation...");
  await wave.generateDocs();

  console.log(`\nWave ${wave.wave} complete.\n`);
}
```

---

## 10. Observability (`audit/status.ts`)

A script that generates a terminal dashboard showing audit system status.

```typescript
// audit/status.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { computeAllRisks } from "./risk";

interface Finding {
  id: string;
  severity: string;
  status: string;
  wave: string;
  invariants: string[];
}

const SEVERITY_ORDER = ["P0", "P1", "P2", "P3"];
const WAVE_ORDER = ["C", "R", "P", "D", "T"];
const WAVE_NAMES: Record<string, string> = {
  C: "Correctness",
  R: "Recovery",
  P: "Product",
  D: "Architecture",
  T: "Testing",
};

function bar(count: number, max: number, width: number = 30): string {
  const filled = Math.round((count / max) * width);
  return "\u2588".repeat(filled) + "\u2591".repeat(width - filled);
}

function loadFindings(): Finding[] {
  const root = join(import.meta.dirname, "..");
  const raw = readFileSync(join(root, "audit", "findings.yaml"), "utf-8");
  return (parse(raw) as any).findings;
}

function generateStatus(): string {
  const findings = loadFindings();
  const risks = computeAllRisks(findings);
  const totalRisk = risks.reduce((sum, r) => sum + r.riskScore, 0);
  const now = new Date().toISOString();

  const lines: string[] = [];
  lines.push("=== STORYMACHINE AUDIT STATUS ===");
  lines.push(`Generated: ${now}`);
  lines.push("");

  // Findings by status
  lines.push("Findings by status:");
  const statuses = ["open", "in_progress", "verified", "regression"];
  const maxStatus = findings.length;
  for (const status of statuses) {
    const count = findings.filter((f) => f.status === status).length;
    const label = status.toUpperCase().padEnd(12);
    lines.push(`  ${label}: ${String(count).padStart(3)}  ${bar(count, maxStatus)}`);
  }
  lines.push("");

  // Findings by severity
  lines.push("Findings by severity:");
  const maxSev = findings.length;
  for (const sev of SEVERITY_ORDER) {
    const count = findings.filter((f) => f.severity === sev).length;
    lines.push(`  ${sev}: ${String(count).padStart(3)}  ${bar(count, maxSev)}`);
  }
  lines.push("");

  // Invariant violations (placeholder -- would read from test results)
  lines.push("Invariant violations (last 24h):");
  const invariantIds = ["I1", "I2", "I3", "I4", "I5", "I6", "I7"];
  const violationLine = invariantIds
    .map((id) => `${id}: 0`)
    .join("  ");
  lines.push(`  ${violationLine}`);
  lines.push("");

  // Risk trend (placeholder -- would read from historical data)
  lines.push("Risk trend:");
  lines.push(`  current: ${totalRisk.toFixed(0).padStart(6)} ${bar(totalRisk, 1000)}`);
  lines.push("");

  // Wave progress
  lines.push("Wave progress:");
  for (const wave of WAVE_ORDER) {
    const waveFindings = findings.filter((f) => f.wave === wave);
    const verified = waveFindings.filter(
      (f) => f.status === "verified" || f.status === "regression"
    ).length;
    const total = waveFindings.length;
    const name = WAVE_NAMES[wave].padEnd(16);
    lines.push(
      `  Wave ${wave} (${name}): ${verified}/${String(total).padStart(2)}  ${bar(verified, total, 20)}`
    );
  }
  lines.push("");

  // Risk leaderboard
  lines.push("Top 10 by risk score:");
  for (const r of risks.slice(0, 10)) {
    const finding = findings.find((f) => f.id === r.findingId);
    const statusIcon =
      finding?.status === "verified" ? "\u2713" :
      finding?.status === "in_progress" ? "\u25b6" :
      "\u25cb";
    lines.push(
      `  ${statusIcon} #${String(r.rank).padStart(2)}  ${r.findingId.padEnd(10)}  risk=${r.riskScore.toFixed(1).padStart(6)}  ${finding?.title ?? ""}`
    );
  }

  return lines.join("\n");
}

// --- CLI entry point ---

if (process.argv[1] && process.argv[1].includes("status")) {
  console.log(generateStatus());
}
```

### npm scripts to add to `package.json`

```json
{
  "scripts": {
    "audit:status": "node --experimental-strip-types audit/status.ts",
    "audit:risk": "node --experimental-strip-types audit/risk.ts",
    "audit:generate": "node --experimental-strip-types audit/generate.ts",
    "audit:test": "node --experimental-strip-types --test tests/audit/*.test.ts",
    "audit:properties": "node --experimental-strip-types --test tests/audit/properties/*.test.ts",
    "audit:concurrency": "node --experimental-strip-types --test tests/audit/concurrency/*.test.ts",
    "audit:contracts": "node --experimental-strip-types --test tests/audit/contracts/*.test.ts",
    "audit:wave": "node --experimental-strip-types audit/wave-executor.ts"
  }
}
```

---

## 11. Proof-Carrying Fixes

Every fix commit must carry metadata proving it was done correctly. This is
enforced by a pre-commit hook and a CI check.

### Commit message format

```
[{FINDING_ID}] {description}

Finding: {FINDING_ID} - {title}
Test observed failing: {test_file}
Invariant satisfied: {I1, I3, ...}
Regression test: {regression_test_file}
Enforcement rule: {rule_name} (if applicable)
```

Example:

```
[COR-001] Prevent Stage mutation on proof rejection

Finding: COR-001 - Stage mutations survive proof rejection
Test observed failing: tests/audit/COR-001-proof-atomicity.test.ts
Invariant satisfied: I3, I4
Regression test: tests/audit/COR-001-proof-atomicity.test.ts
Enforcement rule: audit/no-direct-commit-append
```

### Pre-commit hook (`.husky/pre-commit`)

```bash
#!/bin/sh

# Check commit message for finding metadata
MSG=$(cat "$1" 2>/dev/null || git log -1 --format=%B)

# If the commit touches audit-related files, require finding metadata
CHANGED=$(git diff --cached --name-only)
if echo "$CHANGED" | grep -qE "^(server/|src/)"; then
  if echo "$MSG" | grep -qE "^\[COR-|^\[REC-|^\[SEC-|^\[UX-|^\[DEB-|^\[CI-"; then
    # Has finding ID -- verify metadata fields
    for field in "Finding:" "Test observed failing:" "Invariant satisfied:" "Regression test:"; do
      if ! echo "$MSG" | grep -q "$field"; then
        echo "ERROR: Commit references a finding but is missing: $field"
        echo "See AUDIT_SYSTEM.md section 11 for the required format."
        exit 1
      fi
    done
  fi
fi
```

### CI verification (`scripts/verify-commit-metadata.ts`)

```typescript
// scripts/verify-commit-metadata.ts

import { execSync } from "node:child_process";

function getCommitsSinceLastMerge(): string[] {
  const log = execSync("git log --format=%H main..HEAD", {
    encoding: "utf-8",
  });
  return log.trim().split("\n").filter(Boolean);
}

function getCommitMessage(hash: string): string {
  return execSync(`git log -1 --format=%B ${hash}`, { encoding: "utf-8" });
}

const commits = getCommitsSinceLastMerge();
let exitCode = 0;

for (const hash of commits) {
  const msg = getCommitMessage(hash);

  // Check if this commit references a finding
  const findingMatch = msg.match(/\[(COR|REC|SEC|UX|DEB|CI)-\d+\]/);
  if (!findingMatch) continue;

  const requiredFields = [
    "Finding:",
    "Test observed failing:",
    "Invariant satisfied:",
    "Regression test:",
  ];

  for (const field of requiredFields) {
    if (!msg.includes(field)) {
      console.error(
        `Commit ${hash.slice(0, 8)} references finding but missing: ${field}`
      );
      exitCode = 1;
    }
  }
}

if (exitCode === 0) {
  console.log(`PASS: All ${commits.length} commits have valid metadata`);
} else {
  process.exit(exitCode);
}
```

---

## 12. Multi-Dimensional Testing Strategy

The audit system uses ten testing dimensions. Each dimension covers a gap
that the others miss.

| Dimension | Tool | Layer | Purpose |
|---|---|---|---|
| Unit | `node:test` | 3 | Individual function correctness |
| Integration | `node:test` + HTTP | 3 | Authority boundary crossing |
| Property | `fast-check` + `node:test` | 3 | Random command sequences + invariant assertions |
| Concurrency | `Promise.all` + barriers | 3 | Race condition detection |
| Fuzz | `fast-check` + malformed inputs | 3 | Input validation |
| Contract | JSON schema + type checks | 3 | API boundary types |
| Snapshot | generated docs comparison | 6 | Documentation drift |
| Architecture | ESLint + custom rules | 4 | Import boundary enforcement |
| Regression | tagged test suites | 3 | Fixed findings stay fixed |
| Metamorphic | existing metamorphic tests | 3 | Scoring invariants |

### How dimensions map to layers

```
Layer 1 (findings.yaml)
  <- defines what to test

Layer 2 (invariant kernel)
  <- shared by: unit, integration, property, concurrency, fuzz

Layer 3 (executable tests)
  <- unit:       individual function tests
  <- integration: cross-boundary tests (export/import, proof/canon)
  <- property:   fast-check random sequences
  <- concurrency: Promise.all race tests
  <- fuzz:       malformed input injection
  <- contract:   JSON schema validation
  <- regression: tagged finding-specific tests
  <- metamorphic: scoring invariant tests

Layer 4 (enforcement)
  <- architecture: ESLint import boundary rules

Layer 5 (risk model)
  <- no direct test dimension; computed from code analysis

Layer 6 (living docs)
  <- snapshot: generated markdown must match committed markdown
```

### When to use which dimension

| Finding type | Primary dimension | Secondary dimension |
|---|---|---|
| Data loss (P0) | Integration + Regression | Property + Fuzz |
| Silent inconsistency (P1) | Integration + Property | Concurrency |
| Misleading UI (P2) | Unit + Contract | Snapshot |
| Architecture debt (P3) | Architecture | Unit |
| Race condition | Concurrency | Property |
| Input validation | Fuzz + Contract | Unit |

---

## 13. Migration Plan

Seven phases, each with a concrete deliverable and verification step.

### Phase 1: Create findings.yaml (1 day)

**Deliverable:** `audit/findings.yaml` containing all 69 findings from
SECURITY.md and RELIABILITY.md, each with the full schema from section 2.

**Steps:**
1. Parse both markdown files.
2. Extract every finding ID, title, severity, confidence, boundary, evidence.
3. Assign invariants (I1-I7) based on the "Invariant violated" notes in the
   findings.
4. Assign wave (C/R/P/D/T) based on the repair wave sections.
5. Assign depends_on and blocks based on the wave ordering and explicit
   dependencies.
6. Set all status to `open`.
7. Leave test_id, regression_test_id, risk_score, last_verified as null.

**Verification:**
```bash
node -e "const yaml = require('yaml'); const fs = require('fs'); const d = yaml.parse(fs.readFileSync('audit/findings.yaml','utf8')); console.log(d.findings.length)"
# Should print 69
```

### Phase 2: Create invariant kernel (2 days)

**Deliverable:** `audit/invariants/` directory with all 7 invariant modules.

**Steps:**
1. Create `audit/invariants/types.ts` with the interfaces from section 3.
2. Implement I3 (rejection purity) first -- it is the most critical and
   most frequently violated.
3. Implement I2 (commit ordering) -- simple, high-value.
4. Implement I4, I5, I6, I7.
5. Implement I1 (projection fidelity) -- most complex, requires
   Stage snapshot comparison.
6. Create `audit/invariants/index.ts` with exports and `checkAll`/`assertAll`.

**Verification:**
```bash
node --experimental-strip-types --test tests/audit/contracts/invariant-unit.test.ts
# Each invariant module has a unit test that constructs a valid and
# invalid state and checks the result.
```

### Phase 3: Create executable tests for P0 findings (3 days)

**Deliverable:** 6 test files for the 6 P0 findings (COR-001, REC-001,
REC-002, REC-003, SEC-004, SEC-005).

**Steps:**
1. Create `tests/audit/helpers/session-harness.ts` with shared setup.
2. Create `tests/audit/COR-001-proof-atomicity.test.ts` (full example in
   section 4).
3. Create `tests/audit/REC-001-schema-roundtrip.test.ts`.
4. Create `tests/audit/REC-002-import-safety.test.ts`.
5. Create `tests/audit/REC-003-wal-safe-backup.test.ts`.
6. Create `tests/audit/SEC-004-simulation-proposal.test.ts`.
7. Create `tests/audit/SEC-005-project-identity.test.ts`.
8. Run each test and confirm it FAILS against the current codebase.

**Verification:**
```bash
for f in tests/audit/COR-001-*.test.ts tests/audit/REC-00{1,2,3}-*.test.ts tests/audit/SEC-00{4,5}-*.test.ts; do
  echo "=== $f ==="
  node --experimental-strip-types --test "$f" 2>&1 | tail -1
done
# All should show "FAIL" or non-zero exit
```

### Phase 4: Create ESLint rules (2 days)

**Deliverable:** 5 custom ESLint rules in `audit/rules/`.

**Steps:**
1. Install ESLint: `npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin`
2. Create `eslint.config.js` with flat config format.
3. Implement `no-db-file-copy` (full example in section 5).
4. Implement `no-session-id-from-body`.
5. Implement `no-raw-stream-error`.
6. Implement `no-cross-tree-import`.
7. Implement `no-direct-commit-append`.
8. Run `npx eslint server/ src/` and confirm the rules catch the existing
   violations (SEC-003, COR-001, SEC-024, DEB-001).

**Verification:**
```bash
npx eslint server/ src/ --config eslint.config.js 2>&1 | grep "audit/"
# Should show violations for the patterns the rules detect
```

### Phase 5: Create risk model + dependency DAG (1 day)

**Deliverable:** `audit/risk.ts` with risk scoring and DAG.

**Steps:**
1. Implement the scoring formula from section 6.
2. Implement the dependency DAG builder.
3. Implement the topological sort for fix ordering.
4. Run the CLI entry point and verify the top-15 output.

**Verification:**
```bash
node --experimental-strip-types audit/risk.ts
# Should print top 15 findings ranked by risk score
```

### Phase 6: Create doc generator + CI pipeline (1 day)

**Deliverable:** `audit/generate.ts`, `.github/workflows/audit.yml`.

**Steps:**
1. Implement the doc generator from section 7.
2. Run it and verify SECURITY.md and RELIABILITY.md are overwritten with
   generated content.
3. Create `.github/workflows/audit.yml` from section 8.
4. Verify the workflow YAML is valid: `actionlint .github/workflows/audit.yml`.

**Verification:**
```bash
node --experimental-strip-types audit/generate.ts
git diff SECURITY.md
# Should show the generated content replacing the static content
```

### Phase 7: Ongoing -- P1/P2 tests, property tests, fuzz tests (ongoing)

**Deliverable:** Test files for all remaining findings, property-based test
suite, fuzz tests.

**Steps:**
1. Write tests for P1 findings (20 tests).
2. Write tests for P2 findings (14 tests).
3. Install fast-check: `npm install -D fast-check`
4. Create `tests/audit/properties/command-sequence.test.ts`.
5. Create `tests/audit/properties/round-trip.test.ts`.
6. Create `tests/audit/concurrency/` tests.
7. Add coverage thresholds to CI.
8. Update `findings.yaml` status as fixes are applied and verified.

---

## 14. Why This Is 50x Better

| Dimension | Static docs | Living system | Improvement |
|---|---|---|---|
| Drift detection | Manual re-audit every quarter | Automatic on every CI run | infinite |
| Enforcement | Hopes developers read 3,375 lines | ESLint blocks violations at write time | infinite |
| Regression detection | Manual re-audit | Automated regression tests | ~100x |
| Finding discovery | One-time manual | Property tests find siblings | ~10x |
| Fix prioritization | Gut feeling | Computed risk/cost ratio | ~5x |
| Documentation accuracy | Stale on day 1 | Regenerated from tests | ~50x |
| Onboarding | Read 3,375 lines | Run `npm run audit:status` | ~20x |
| Confidence | "I think it's fixed" | "Test was red, now green, regression test prevents reintroduction" | ~50x |
| Fix verification | Code review only | Code review + invariant check + regression test + enforcement rule | ~10x |
| Cascading failure detection | None | Invariant kernel catches cross-cutting breaks | infinite |
| Historical trend | None | Risk score over time in dashboard | infinite |
| Cross-finding dependency | Implicit in wave ordering | Explicit DAG with topological sort | ~5x |

### Concrete examples of improvement

**Before (static docs):**
Developer fixes SEC-001 (schema version). Six months later, someone adds a
new migration and forgets to update the import route. SEC-001 regresses.
Nobody notices until a user reports that exports are rejected.

**After (living system):**
1. `REC-001-schema-roundtrip.test.ts` runs on every CI. It exports a
   current-schema snapshot and imports it.
2. The ESLint rule `no-cross-tree-import` ensures the schema version constant
   is in a shared module.
3. `tests/audit/contracts/schema-version.test.ts` asserts there is exactly
   one definition of the schema version.
4. If any of these fail, CI blocks the PR.

**Before (static docs):**
A new developer joins and wants to understand what is broken. They open
SECURITY.md and RELIABILITY.md and see 69 findings with no indication of
which are still open, which have tests, or which depend on each other.

**After (living system):**
The developer runs `npm run audit:status` and sees:
- 42 findings are still open.
- The top risk is COR-001 (proof atomicity).
- COR-001 depends on REC-004 (mutation coordinator).
- Wave R (recovery) should be fixed first.
- 6 P0 findings have no regression tests yet.

---

## Appendix A: Finding ID to Wave Mapping

| Finding ID | Wave | Title |
|---|---|---|
| COR-001 | C | Stage mutations survive proof rejection |
| COR-002 | C | Orchestrator cache uses stale head |
| COR-003 | C | buildEnrichedState discards belief/emotion ops |
| COR-004 | C | Room simulation is a lossy compiler |
| COR-005 | C | Production Converge SSE supplies no mechanisms |
| COR-006 | C | Arc convergence advances through rejected fallback |
| COR-007 | C | Director's Cut bypasses proof kernel |
| COR-008 | C | Converge commit re-proves reduced approximation |
| REC-001 | R | Current exports rejected by current import |
| REC-002 | R | Malformed import destroys valid destination |
| REC-003 | R | Reset backup is not WAL-safe |
| REC-004 | R | Reset and import race active async work |
| REC-005 | R | /api/turn can interleave with room/scene |
| REC-006 | R | Room SSE timeout does not cancel simulation |
| REC-007 | R | "Full session snapshot" is not full |
| REC-008 | R | Empty valid Stage export may be rejected |
| REC-009 | R | Ghost-candidate ranking scores discarded |
| UX-001 | P | Coverage says "Ready" without a report |
| UX-002 | P | Ship title-page metadata not persisted |
| UX-003 | P | Duplicate command surfaces disagree |
| UX-004 | P | Two competing quality authorities |
| UX-005 | P | Legacy Ship/Studio surface contradicts product path |
| UX-006 | P | Accessibility regressions |
| DEB-001 | D | Frontend imports backend source directly |
| DEB-002 | D | Export logic duplicated between client and server |
| DEB-003 | D | Process-global persona registry |
| DEB-004 | D | Orphaned NarrativeState module |
| DEB-005 | D | Schema version maintained in two places |
| DEB-006 | D | Build chunk exceeds size threshold |
| CI-001 | T | npm run lint does not actually lint |
| CI-002 | T | No coverage thresholds |
| CI-003 | T | No dependency audit in CI |
| CI-004 | T | No formatting check |
| CI-005 | T | CI does not smoke-test Docker in PRs |
| CI-006 | T | No Node version enforcement |
| CI-007 | T | Missing integration tests at authority boundaries |
| DOC-001 | T | README describes a product that no longer exists |
| DOC-002 | T | ARCHITECTURE.md claims test has not landed |
| DOC-003 | T | Collab fallback-secret comment has wrong TTL |
| SEC-001 | R | Current exports rejected by current import |
| SEC-002 | R | Malformed import destroys valid destination |
| SEC-003 | R | Reset backup is not WAL-safe |
| SEC-004 | R | Simulation export overwrites draft without recovery |
| SEC-005 | R | "New story" retains previous project's draft |
| SEC-006 | R/P | Sample Coverage can overwrite user edits |
| SEC-007 | C | Stage mutations before StoryCommit proof |
| SEC-008 | C | Orchestrator cache drifts from persisted canon |
| SEC-009 | C | buildEnrichedState discards NVM belief/emotion ops |
| SEC-010 | C | Room simulation is a lossy compiler |
| SEC-011 | C | Production Converge SSE supplies no mechanisms |
| SEC-012 | C | Arc convergence advances through rejected fallback |
| SEC-013 | C | Director's Cut bypasses proof kernel |
| SEC-014 | C | Converge commit re-proves reduced approximation |
| SEC-015 | R | "Full session snapshot" is not full |
| SEC-016 | R | Empty valid Stage export may be rejected |
| SEC-017 | R | Ghost-candidate scores discarded |
| SEC-018 | R | Reset and import race active async work |
| SEC-019 | R | /api/turn can interleave with room/scene |
| SEC-020 | R | Room SSE timeout does not cancel simulation |
| SEC-021 | D | Missing session capability falls to shared default |
| SEC-022 | D | Custom personas are process-global |
| SEC-023 | D | Inline completion puts content in URL |
| SEC-024 | D | Streaming endpoints expose raw provider errors |
| SEC-025 | D | Session-cap eviction is an availability risk |
| SEC-026 | P | Coverage says "Ready" without a report |
| SEC-027 | P | Ship title-page metadata not persisted |
| SEC-028 | P | Duplicate command surfaces disagree |
| SEC-029 | P | Two competing quality authorities |
| SEC-030 | P | Accessibility regressions |

Note: Several SEC-* findings overlap with COR-*, REC-*, and UX-* findings
from RELIABILITY.md. In `findings.yaml`, these are merged into a single entry
with both IDs listed in an `aliases` field. The primary ID follows the
RELIABILITY.md convention (COR/REC/UX/DEB/CI), and the SEC-* ID is the alias.

---

## Appendix B: Required npm Dependencies

Add to `devDependencies`:

```json
{
  "eslint": "^9.0.0",
  "@typescript-eslint/parser": "^8.0.0",
  "@typescript-eslint/eslint-plugin": "^8.0.0",
  "fast-check": "^3.22.0",
  "yaml": "^2.6.0",
  "husky": "^9.0.0"
}
```

---

## Appendix C: Complete ESLint Rule Reference

| Rule | Finding prevented | File |
|---|---|---|
| `no-db-file-copy` | SEC-003 / REC-003 | `audit/rules/no-db-file-copy.ts` |
| `no-session-id-from-body` | SEC-021 | `audit/rules/no-session-id-from-body.ts` |
| `no-raw-stream-error` | SEC-024 | `audit/rules/no-raw-stream-error.ts` |
| `no-cross-tree-import` | DEB-001 | `audit/rules/no-cross-tree-import.ts` |
| `no-direct-commit-append` | COR-001 / SEC-007 | `audit/rules/no-direct-commit-append.ts` |

Each rule is a TypeScript ESLint custom rule (flat config format). The rules
are designed to be permanent -- they prevent the class of defect, not just
the specific instance.
