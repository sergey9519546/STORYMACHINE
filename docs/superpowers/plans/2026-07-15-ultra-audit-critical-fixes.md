# Ultra-Audit Critical Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the audit's roadmap-compatible FIX NOW safety, content-integrity, validation-readiness, and truth defects without changing screenplay scoring or selecting a product future.

**Architecture:** Retire the incoherent JSON recovery path, separate project authority from simulation state, and serialize mutations through a per-session coordinator before making reset safe. Enforce AI capabilities and budgets at the server boundary, make browser-visible persistence and content intent truthful, then qualify the critical path with isolated API, browser, accessibility, and container checks.

**Tech Stack:** Node.js 22.6+, TypeScript, Express, React 19, better-sqlite3, zod, Node's built-in test runner, Playwright/axe where available, Docker where available.

## Global Constraints

- `ROADMAP.md` P0 remains active. This plan does not retune a score, threshold, formula, percentile, verdict, rule, or calibration corpus.
- Do not build Future A, B, or C, collapse OASIS into Labs, add a human marketplace, implement public accounts, or make deployment/legal/privacy claims without their later gates.
- Preserve the keyless deterministic front door and the two-source `llmReady` invariant: environment `GEMINI_API_KEY` OR runtime multi-provider key.
- No `console.*` under `server/**`; use `server/lib/logger.ts`.
- Every route remains zod-validated and uses `gameLimiter`, `aiLimiter`, or a documented stricter replacement.
- JSON session import is retired with an unconditional non-mutating `410`; it is not repaired as a partial restore. JSON export is a non-recoverable simulation observation.
- Simulation reset must preserve writer/editor/project state. Project deletion is a distinct, explicitly confirmed lifecycle operation and is not introduced unless its full deletion contract is tested.
- Work in an isolated worktree outside OneDrive. Before each task, fetch/pull the integration branch, inspect `git log`, and audit overlap with concurrent user-owned changes.
- Current shared-checkout changes in `server/nvm/analyze/doctor.ts`, `server/nvm/analyze/fountain-analyzer.ts`, `server/nvm/analyze/types.ts`, `server/nvm/revision/pipeline.ts`, `src/components/StartScreen.tsx`, `src/components/scriptide/ScriptDoctorPanel.tsx`, `tests/core/script-doctor.test.ts`, and user-validation records are not ours. Never overwrite them. Rebase/cherry-pick their committed result before touching an overlapping file.
- Use strict TDD: write one failing behavior test, run it and confirm the expected failure, implement the minimum, rerun green, then refactor.
- Run touched tests first. Before each task commit, run `npm run lint` and its focused tests. At integration checkpoints and before completion, run `npm test` and `npm run build` with zero failures.
- Docker and browser checks may report `NOT EVALUATED — tool unavailable`; they must never silently pass. Source-level contracts remain mandatory even when the external runtime is absent.
- One implementer task is active at a time. Each task receives specification review, then code-quality review, before the next implementer starts.
- Selectively stage only the task's files. Never stage concurrent user work.

## File and Interface Map

- `server/engine/Stage.ts`: database schema authority, simulation observation, simulation reset, live-handle backup.
- `server/engine/types.ts`: `SimulationObservation` contract; no “lossless/full snapshot” claim.
- `server/lib/session-store.ts`: `SessionCommandCoordinator` and session lifecycle.
- `server/lib/backup.ts`: verified SQLite online backup and cleanup on failure.
- `server/routes/config.ts`: retired JSON import, observation export, AI-config safety.
- `server/routes/game.ts`: coordinated mutation routes and simulation-only reset.
- `server/lib/ai-budget.ts`: request-scoped provider-attempt/deadline budget.
- `server/engine/ai.ts`: consumes budget per provider attempt/retry.
- `src/lib/scriptide-draft-store.ts`: authoritative save result and title-page envelope.
- `src/lib/uploaded-files.ts`: shared stale-batch cancellation primitive.
- `src/components/StartScreen.tsx`: parent-owned upload generation and preview dialog.
- `src/components/SettingsPanel.tsx`: operator-managed state and accessible dialog.
- `tests/**`: real behavior contracts; mocks only at actual external/provider boundaries.

---

### Task 1: Install Minimal Canonical Supersessions Before Code Work

**Files:**
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`
- Modify: `ROADMAP.md`
- Modify: `NORTH_STAR.md`
- Modify: `ULTRAPLAN.md`
- Create: `tests/core/canonical-truth.test.ts`

**Interfaces:**
- Consumes: final audit supersession matrix and current generated `docs/rulebook/README.md`.
- Produces: active governing text that no longer tells implementers to trust the disproven 8,917/5,701 history, plus an executable staleness guard.

- [ ] **Step 1: Write the failing canonical-truth test**

```ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const root = path.resolve(import.meta.dirname, '../..');
const active = ['AGENTS.md', 'CLAUDE.md', 'ROADMAP.md', 'NORTH_STAR.md', 'ULTRAPLAN.md'];

describe('canonical project truth', () => {
  it('contains no disproven bulk-wave arithmetic or active endless-wave direction', () => {
    const text = active.map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
    assert.doesNotMatch(text, /8,917/);
    assert.doesNotMatch(text, /5,701/);
    assert.doesNotMatch(text, /3 checks \+ 6 tests per wave, forever/i);
  });

  it('states the bounded current truth without turning rule count into value', () => {
    const agents = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
    assert.match(agents, /3,216 live pass-scoped constants/);
    assert.match(agents, /semantic concept count is unknown/i);
    assert.match(agents, /rule-growth freeze remains/i);
  });
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `node --experimental-strip-types tests/core/canonical-truth.test.ts`

Expected: FAIL because active canonical files still contain `8,917`/`5,701` and the replacement truth is absent.

- [ ] **Step 3: Replace only the disproven premise and minimal sequencing language**

Use this controlling wording consistently:

```md
The generated catalog currently contains 3,216 live pass-scoped constants.
The semantic concept count is unknown. Git history does not support the later
claim that Wave 1191 added 5,701 of 8,917 rules. The rule-growth freeze remains
binding for an independent reason: rule quantity has not established real-writing
validity or writer demand. P0 remains the active product gate.
```

Do not rewrite product architecture in this task; final documentation follows verified code in Task 12.

- [ ] **Step 4: Run focused validation GREEN**

Run: `node --experimental-strip-types tests/core/canonical-truth.test.ts`

Expected: all canonical-truth tests pass.

Run: `npm run lint`

Expected: exit 0.

- [ ] **Step 5: Commit selectively**

```powershell
git add -- AGENTS.md CLAUDE.md ROADMAP.md NORTH_STAR.md ULTRAPLAN.md tests/core/canonical-truth.test.ts
git commit -m "docs: correct canonical audit premises"
```

---

### Task 2: Deny Docker Access to Confidential Workspace State

**Files:**
- Create: `.dockerignore`
- Create: `tests/core/docker-context.test.ts`
- Modify: `.github/workflows/ci.yml` only if Docker is available in CI

**Interfaces:**
- Consumes: `Dockerfile` builder inputs.
- Produces: a deny-by-default build context allowing only build/runtime source assets.

- [ ] **Step 1: Write the failing Docker-context contract**

```ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const root = path.resolve(import.meta.dirname, '../..');
const file = path.join(root, '.dockerignore');

describe('Docker build context', () => {
  it('is deny by default and explicitly excludes confidential/runtime state', () => {
    assert.ok(fs.existsSync(file), '.dockerignore must exist');
    const text = fs.readFileSync(file, 'utf8');
    assert.equal(text.split(/\r?\n/).find(line => line.trim() && !line.startsWith('#')), '**');
    for (const forbidden of ['.env', 'data', '.git', 'node_modules', '*.db', '*.db-wal', '*.log']) {
      assert.ok(text.includes(forbidden), `missing explicit exclusion evidence for ${forbidden}`);
    }
    for (const required of ['!package.json', '!package-lock.json', '!server.ts', '!server/**', '!src/**', '!public/**']) {
      assert.ok(text.includes(required), `missing required allow rule ${required}`);
    }
  });
});
```

- [ ] **Step 2: Run RED**

Run: `node --experimental-strip-types tests/core/docker-context.test.ts`

Expected: FAIL because `.dockerignore` does not exist.

- [ ] **Step 3: Add the exact deny-first context**

```dockerignore
**

!package.json
!package-lock.json
!tsconfig.json
!vite.config.ts
!index.html
!server.ts
!server/**
!src/**
!public/**

.env
.env.*
!.env.example
data
data/**
.git
.git/**
node_modules
node_modules/**
*.db
*.db-wal
*.db-shm
*.log
dist
coverage
docs
tests
```

If `.env.example` is not required by the Dockerfile, remove its negation and leave it excluded.

- [ ] **Step 4: Run GREEN and the actual image smoke when available**

Run: `node --experimental-strip-types tests/core/docker-context.test.ts`

Expected: pass.

Run: `docker version`

If available, run: `docker build --no-cache -t storymachine:audit-context .`

Expected: build exits 0. If unavailable, record `NOT EVALUATED — Docker unavailable` in the task evidence; do not describe the image as tested.

- [ ] **Step 5: Commit selectively**

```powershell
git add -- .dockerignore tests/core/docker-context.test.ts .github/workflows/ci.yml
git commit -m "security: deny confidential Docker context"
```

---

### Task 3: Make Draft Save Success Follow the Authoritative Envelope

**Files:**
- Modify: `src/lib/scriptide-draft-store.ts`
- Modify: `tests/core/scriptide-draft-store.test.ts`

**Interfaces:**
- Consumes: existing boolean save API.
- Produces: `true` when the authoritative envelope is durable even if the legacy theme mirror fails; `false` only when the authoritative write fails.

- [ ] **Step 1: Add failing fault-injection tests**

```ts
it('returns true when the envelope write succeeds and the legacy mirror fails', () => {
  const writes: string[] = [];
  const storage = {
    setItem(key: string) {
      writes.push(key);
      if (key === 'storymachine.theme') throw new Error('quota');
    },
    getItem() { return null; },
    removeItem() {},
    clear() {},
    key() { return null; },
    length: 0,
  } satisfies Storage;
  assert.equal(saveScriptIDEDraft(fixtureDraft, storage), true);
  assert.equal(writes[0], SCRIPTIDE_DRAFT_STORAGE_KEY);
});

it('returns false and skips the mirror when the authoritative write fails', () => {
  const writes: string[] = [];
  const storage = failingStorage((key) => {
    writes.push(key);
    throw new Error('quota');
  });
  assert.equal(saveScriptIDEDraft(fixtureDraft, storage), false);
  assert.deepEqual(writes, [SCRIPTIDE_DRAFT_STORAGE_KEY]);
});
```

Adapt helper names to the file's existing exports; do not add a test-only production method.

- [ ] **Step 2: Run RED**

Run: `node --experimental-strip-types tests/core/scriptide-draft-store.test.ts`

Expected: mirror-only failure returns `false` or the second write is incorrectly coupled.

- [ ] **Step 3: Implement primary-first, mirror-best-effort semantics**

```ts
export function saveScriptIDEDraft(draft: ScriptIDEDraftState, storage = window.localStorage): boolean {
  try {
    storage.setItem(SCRIPTIDE_DRAFT_STORAGE_KEY, JSON.stringify(toEnvelope(draft)));
  } catch {
    return false;
  }
  try {
    storage.setItem('storymachine.theme', draft.theme ?? '');
  } catch {
    // Compatibility mirror failure does not negate the authoritative envelope.
  }
  return true;
}
```

- [ ] **Step 4: Run GREEN and lint**

Run: `node --experimental-strip-types tests/core/scriptide-draft-store.test.ts`

Expected: all draft-store tests pass.

Run: `npm run lint`

Expected: exit 0.

- [ ] **Step 5: Commit selectively**

```powershell
git add -- src/lib/scriptide-draft-store.ts tests/core/scriptide-draft-store.test.ts
git commit -m "fix: report authoritative draft save truthfully"
```

---

### Task 4: Retire JSON Import and Establish Honest Version Boundaries

**Files:**
- Modify: `server/routes/config.ts`
- Modify: `server/engine/Stage.ts`
- Modify: `server/engine/types.ts`
- Modify: `server/lib/validation.ts`
- Modify: `tests/routes/config.test.ts`
- Modify: `tests/core/core-01.test.ts`

**Interfaces:**
- Produces: `GET /api/session/export` compatibility alias returning `SimulationObservationEnvelope` with `recoverable:false`; `POST /api/session/import` always returns 410 before session lookup/mutation.
- Produces: `STAGE_DB_SCHEMA_VERSION`; future database versions fail before DDL/write.
- Defers: `projectEnvelopeVersion` until a future portable-project ADR; it is never conflated with SQLite `user_version`.

- [ ] **Step 1: Write route-level RED tests proving non-mutation**

```ts
it('retires JSON import without touching existing session state', async () => {
  const sid = 'import-retired-preserves-state';
  await seedAgentAndDraft(server.baseUrl, sid);
  const before = await readSessionFacts(server.baseUrl, sid);
  const res = await fetch(`${server.baseUrl}/api/session/import`, {
    method: 'POST',
    headers: {'content-type': 'application/json', 'x-storymachine-session': sid},
    body: JSON.stringify({schema_version: 13, agents: [{}]}),
  });
  assert.equal(res.status, 410);
  assert.deepEqual(await readSessionFacts(server.baseUrl, sid), before);
});

it('labels export as a non-recoverable simulation observation', async () => {
  const res = await fetch(`${server.baseUrl}/api/session/export`, {headers: sessionHeaders('observation')});
  const body = await res.json();
  assert.equal(body.kind, 'storymachine.simulation-observation');
  assert.equal(body.format_version, 1);
  assert.equal(body.recoverable, false);
  assert.ok(body.included.length > 0);
  assert.ok(body.excluded.includes('ScriptIDE_State'));
});
```

- [ ] **Step 2: Write storage-version RED tests**

Create a temporary v`STAGE_DB_SCHEMA_VERSION + 1` SQLite file with a sentinel table and hash. Constructing `Stage` must throw before `initSchema()` and leave the bytes/catalog unchanged. Keep the existing older-database migration test.

- [ ] **Step 3: Run RED**

Run: `node --experimental-strip-types tests/routes/config.test.ts`

Run: `node --experimental-strip-types tests/core/core-01.test.ts`

Expected: import currently mutates/rejects by the wrong contract; export lacks the envelope; future DB is touched or not rejected early.

- [ ] **Step 4: Implement the honest contracts**

```ts
export type SimulationObservationEnvelope = {
  kind: 'storymachine.simulation-observation';
  format_version: 1;
  recoverable: false;
  database_schema_version: number;
  included: readonly string[];
  excluded: readonly string[];
  data: SimulationObservation;
};
```

In `config.ts`, place this before `getOrCreateSession` or `destroySession`:

```ts
router.post('/api/session/import', gameLimiter, validate(ImportBodySchema), (_req, res) => {
  res.status(410).json({
    code: 'SESSION_JSON_IMPORT_RETIRED',
    error: 'JSON session import is retired because the legacy projection is not a recoverable project.',
    recovery: 'Use a verified SQLite online backup.',
  });
});
```

Move migration definitions to one exported `STAGE_MIGRATIONS` list and set:

```ts
export const STAGE_DB_SCHEMA_VERSION = STAGE_MIGRATIONS.length;
```

Read `PRAGMA user_version` before calling any DDL initializer; reject values greater than the constant.

- [ ] **Step 5: Remove false lossless/import semantics**

Rename `StageSnapshot`/`exportSnapshot()` to `SimulationObservation`/`exportSimulationObservation()`. Retain deprecated read-only aliases only if generated tests require a compatibility window. Delete or make unreachable `importSnapshot()`; no route may call it.

- [ ] **Step 6: Run GREEN and regression checks**

Run the two focused files. Expected: pass.

Run: `npm run lint`

Expected: exit 0.

- [ ] **Step 7: Commit selectively**

```powershell
git add -- server/routes/config.ts server/engine/Stage.ts server/engine/types.ts server/lib/validation.ts tests/routes/config.test.ts tests/core/core-01.test.ts
git commit -m "fix: retire lossy JSON session recovery"
```

---

### Task 5: Serialize Session Mutations and Make Simulation Reset Safe

**Files:**
- Modify: `server/lib/session-store.ts`
- Modify: `server/lib/backup.ts`
- Modify: `server/engine/Stage.ts`
- Modify: `server/routes/game.ts`
- Modify: mutation routes in `server/routes/config.ts`, `server/routes/scriptide.ts`, and relevant NVM route files
- Modify: `tests/core/backup.test.ts`
- Modify: `tests/routes/game.test.ts`
- Create: `tests/core/session-command-coordinator.test.ts`

**Interfaces:**
- Produces: `SessionCommandCoordinator.run<T>(operation): Promise<T>`; rejection-safe FIFO per session, parallel across sessions.
- Produces: `Stage.backupTo(destination): Promise<void>` and `createVerifiedBackup(stage, destination)`.
- Produces: `Stage.resetSimulationState(): void`; one SQLite transaction, declared simulation tables cleared, project/editor tables preserved.

- [ ] **Step 1: Write coordinator RED tests**

```ts
it('runs one session FIFO, survives rejection, and permits another session concurrently', async () => {
  const a = new SessionCommandCoordinator();
  const b = new SessionCommandCoordinator();
  const order: string[] = [];
  const release = Promise.withResolvers<void>();
  const first = a.run(async () => { order.push('a1-start'); await release.promise; order.push('a1-end'); });
  const second = a.run(async () => { order.push('a2'); throw new Error('expected'); });
  const third = a.run(async () => { order.push('a3'); });
  await b.run(async () => { order.push('b1'); });
  release.resolve();
  await first;
  await assert.rejects(second, /expected/);
  await third;
  assert.deepEqual(order, ['a1-start', 'b1', 'a1-end', 'a2', 'a3']);
});
```

- [ ] **Step 2: Write populated reset and WAL RED tests**

Populate every declared simulation table plus `ScriptIDE_State`, `Llm_Cache`, and `Self_Play_Corpus`. Assert reset clears the declared simulation manifest, preserves the three non-simulation authorities exactly, rolls back on injected failure, and restores default Illusion state. Add a persistent temp-dir route test with active WAL proving the backup contains the last committed simulation event and editor draft. Backup failure must return 503 and preserve live state.

- [ ] **Step 3: Run RED**

Run:

```powershell
node --experimental-strip-types tests/core/session-command-coordinator.test.ts
node --experimental-strip-types tests/core/backup.test.ts
node --experimental-strip-types tests/routes/game.test.ts
```

Expected: coordinator absent; reset deletes the database/project state; raw copy does not satisfy active-WAL verification.

- [ ] **Step 4: Implement the rejection-safe coordinator**

```ts
export class SessionCommandCoordinator {
  private tail: Promise<void> = Promise.resolve();

  run<T>(operation: () => Promise<T> | T): Promise<T> {
    const result = this.tail.then(operation, operation);
    this.tail = result.then(() => undefined, () => undefined);
    return result;
  }
}
```

Replace `_turnQueue` with `commands`. Route handlers that mutate Stage state must hold the command until all asynchronous work and the final database write complete. Reads remain parallel. Keep per-room duplicate-run protection as an additional rule, not a substitute.

- [ ] **Step 5: Implement verified online backup**

`createVerifiedBackup()` must use the live Stage handle, open the completed destination read-only, require `PRAGMA quick_check = 'ok'` and matching `user_version`, remove partial output on every error, and throw. Store reset backups under a dedicated backup root, not beside live session DBs.

- [ ] **Step 6: Implement transactional simulation-only reset**

Define an exported `SIMULATION_RESET_TABLES` ordered for foreign keys. Clear simulation/event/agent/location/commit/reveal/drama tables and reset Illusion state inside one transaction. Preserve `ScriptIDE_State`, `Llm_Cache`, and `Self_Play_Corpus`. Recreate the Orchestrator from the same live Stage after commit. Do not call `destroySession()`.

- [ ] **Step 7: Coordinate all mutation entry points**

At minimum cover init, turn, room/stream/scene runs, reset, config writes, ScriptIDE save, and NVM commits/mutations. Add a route-manifest test that enumerates every mutating route and fails when it lacks the coordinator wrapper.

- [ ] **Step 8: Run GREEN, full test, and build checkpoint**

Run the three focused files, then:

```powershell
npm run lint
npm test
npm run build
```

Expected: 0 failures and build exit 0.

- [ ] **Step 9: Commit selectively**

Stage only coordinator/reset/backup routes and tests, then commit:

```powershell
git commit -m "fix: preserve project state during simulation reset"
```

---

### Task 6: Enforce AI Route Classes and Provider Budgets

**Files:**
- Create: `server/lib/ai-budget.ts`
- Modify: `server/engine/ai.ts`
- Modify: `server/routes/game.ts`
- Modify: `server/routes/config.ts`
- Modify: `tests/routes/limiters.test.ts`
- Create: `tests/core/ai-budget.test.ts`

**Interfaces:**
- Produces: `withAiBudget(limits, operation)` and `consumeAiAttempt()` using request-scoped `AsyncLocalStorage`.
- Route budgets: `/api/turn` 4 attempts/60 s; `/api/simulate-to-fountain` 24 attempts/120 s; `/api/ai-config/test` 1 attempt/10 s.

- [ ] **Step 1: Write RED budget tests**

```ts
it('counts retries, isolates concurrent contexts, and rejects before an excess provider call', async () => {
  let calls = 0;
  await withAiBudget({maxAttempts: 2, timeoutMs: 1000}, async () => {
    consumeAiAttempt(); calls++;
    consumeAiAttempt(); calls++;
    assert.throws(() => consumeAiAttempt(), /AI_BUDGET_EXHAUSTED/);
  });
  assert.equal(calls, 2);
});
```

Add a deadline test using a never-settling provider promise and fake/short real timers. Add route source/behavior assertions that the three generative endpoints use `aiLimiter` and GET config uses `gameLimiter`.

- [ ] **Step 2: Run RED**

Run the focused budget and limiter files. Expected: budget module absent and route classifications fail.

- [ ] **Step 3: Implement attempt/deadline enforcement at the real provider boundary**

`generateContent` must call `consumeAiAttempt()` for every provider attempt, including retries. Clamp provider timeout to remaining request budget. Budget exhaustion uses existing explicit fallback/error shapes; it never silently retries outside the context.

- [ ] **Step 4: Apply route budgets and limiters**

Wrap each route's whole fan-out operation, not individual top-level functions. Keep keyless fallback behavior unchanged.

- [ ] **Step 5: Run GREEN and lint**

Run focused files and `npm run lint`. Expected: pass/exit 0.

- [ ] **Step 6: Commit selectively**

```powershell
git add -- server/lib/ai-budget.ts server/engine/ai.ts server/routes/game.ts server/routes/config.ts tests/core/ai-budget.test.ts tests/routes/limiters.test.ts
git commit -m "security: bound generative route fan-out"
```

---

### Task 7: Make AI Configuration and Logging Truthful

**Files:**
- Modify: `server/routes/config.ts`
- Modify: `server/lib/ai-config.ts`
- Create: `server/lib/safe-error.ts`
- Modify: `tests/routes/config.test.ts`
- Create: `tests/core/safe-error.test.ts`

**Interfaces:**
- Produces: one public config schema with `llmReady` and `browserConfigWritable`.
- Produces: `sanitizeExternalError(error): {message:string; errorClass:string; status?:number}` with bounded redaction.

- [ ] **Step 1: Write RED response and sentinel tests**

Test environment-only Gemini readiness on GET and successful POST, no key-shaped value in either response, `browserConfigWritable=false` whenever `ADMIN_TOKEN` is set, and raw errors containing `Bearer TOPSECRET`, `sk-secret`, and `?api_key=secret` absent from captured log metadata.

- [ ] **Step 2: Run RED**

Run config and safe-error tests. Expected: POST lacks readiness/writability contract and raw log sentinel is observable.

- [ ] **Step 3: Implement one parsed public response builder**

```ts
type PublicAiConfig = ReturnType<typeof getPublicConfig> & {
  llmReady: boolean;
  browserConfigWritable: boolean;
};
```

`llmReady` must remain `Boolean(process.env.GEMINI_API_KEY) || getPublicConfig().keySet`. `browserConfigWritable` is true only when no admin token is configured and the request is loopback. POST may return `{ok:true, config}`; clients must parse `config` explicitly.

- [ ] **Step 4: Sanitize before both response and logger**

Redact bearer tokens, `sk-` values, credential query parameters, emails when not needed, control characters, and messages beyond the configured cap. The logger receives only sanitized fields.

- [ ] **Step 5: Run GREEN and lint**

Run focused files and `npm run lint`. Expected: pass.

- [ ] **Step 6: Commit selectively**

```powershell
git add -- server/routes/config.ts server/lib/ai-config.ts server/lib/safe-error.ts tests/routes/config.test.ts tests/core/safe-error.test.ts
git commit -m "fix: align AI config and safe error contracts"
```

---

### Task 8: Isolate the HTTP Journey Test

**Files:**
- Modify: `tests/e2e/journeys.test.ts`
- Modify: `server.ts` only if needed for `PORT=0` under `NODE_ENV=test`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: unique `SESSION_DB_DIR`, OS-assigned port, awaited child exit, and exact temp cleanup per run.

- [ ] **Step 1: Write/enable RED isolation assertions**

Before server launch capture root `data/sessions` names. After teardown assert the set is unchanged, the child exited, and the unique temp directory no longer exists. Add a second sequential run test; permit parallel execution without a fixed port.

- [ ] **Step 2: Run RED**

Run: `$env:RUN_E2E='1'; node --experimental-strip-types tests/e2e/journeys.test.ts`

Expected: current fixed-port/default-data implementation leaves files or fails the isolation assertion.

- [ ] **Step 3: Implement temp directory and dynamic port**

Use `fs.mkdtemp(path.join(os.tmpdir(), 'storymachine-e2e-'))`; pass it as `SESSION_DB_DIR`. Permit `PORT=0` only in test, emit the actual bound port through the existing structured logger, and parse that line. On teardown send `SIGTERM`, await the exit event, then remove only the resolved temp root after verifying it begins with `os.tmpdir()`.

- [ ] **Step 4: Run GREEN twice**

Run the journey command twice. Expected: seven journeys pass each time, no root data delta, no residual child/temp file.

- [ ] **Step 5: Add the isolated journey to CI**

Run it as its own step so process failures are visible. Do not share mutable session state with the main test job.

- [ ] **Step 6: Commit selectively**

```powershell
git add -- tests/e2e/journeys.test.ts server.ts .github/workflows/ci.yml
git commit -m "test: isolate HTTP journey state"
```

---

### Task 9: Unify Upload Cancellation Ownership

**Files:**
- Modify: `src/lib/uploaded-files.ts`
- Modify: `src/components/StartScreen.tsx`
- Modify: `src/components/startscreen/StoryConfigForm.tsx`
- Modify: `tests/core/uploaded-files.test.ts`

**Interfaces:**
- Produces: one parent-owned generation controller used by picker and drop; `clear()` invalidates every in-flight batch.

- [ ] **Step 1: Reconcile the concurrent StartScreen commit**

Fetch the latest integration commit and inspect `git diff`/`git log`. If the user change is still uncommitted in the shared checkout, do not touch `StartScreen.tsx`; continue with non-overlapping tasks and resume only after integration.

- [ ] **Step 2: Write RED race tests against the pure helper**

```ts
it('does not append a delayed batch after clear', async () => {
  const gate = createUploadBatchController();
  const read = Promise.withResolvers<UploadedFile[]>();
  const pending = gate.run(() => read.promise);
  gate.clear();
  read.resolve([fixtureUpload]);
  assert.deepEqual(await pending, []);
});
```

Also test picker/drop equivalence, two concurrent valid batches without sibling loss, and an older generation after a newer replacement.

- [ ] **Step 3: Run RED**

Run: `node --experimental-strip-types tests/core/uploaded-files.test.ts`

Expected: parent drop completion still appends after child Clear All or helper is absent.

- [ ] **Step 4: Implement one controller and parent flow**

Move generation ownership into `StartScreen`. Pass `processUploadedFiles` and `clearUploadedFiles` to `StoryConfigForm`; remove child-local generation state. Apply results with functional state updates only when the captured generation is current.

- [ ] **Step 5: Run GREEN and lint**

Run focused test and `npm run lint`. Expected: pass.

- [ ] **Step 6: Commit selectively**

```powershell
git add -- src/lib/uploaded-files.ts src/components/StartScreen.tsx src/components/startscreen/StoryConfigForm.tsx tests/core/uploaded-files.test.ts
git commit -m "fix: cancel stale screenplay uploads"
```

---

### Task 10: Make Settings Operator-Safe and Qualify Modal Accessibility

**Files:**
- Modify: `src/components/SettingsPanel.tsx`
- Modify: `src/components/StartScreen.tsx`
- Create: `src/components/ui/AccessibleDialog.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `playwright.config.ts`
- Create: `tests/browser/critical-path.spec.ts`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: named modal dialog with initial focus, Escape, Tab/Shift+Tab containment, and opener restoration.
- Produces: read-only operator state when `browserConfigWritable=false`; no browser storage of admin bearer token.

- [ ] **Step 1: Write RED browser assertions**

```ts
test('settings and preview implement the modal keyboard contract', async ({page}) => {
  await page.goto('/');
  await page.getByRole('button', {name: /settings/i}).click();
  const dialog = page.getByRole('dialog', {name: /settings/i});
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', {name: /settings/i})).toBeFocused();
});
```

Add Tab/Shift+Tab containment, named preview dialog, real tablist/tab/tabpanel semantics, read-only Test/Save state, and axe serious/critical violation assertions.

- [ ] **Step 2: Run RED**

Install the selected pinned Playwright and axe packages through npm, then run `npx playwright test tests/browser/critical-path.spec.ts`.

Expected: dialog semantics/focus/operator state assertions fail. If the browser binary cannot run in the environment, retain the failing/source-level contract and record `NOT EVALUATED`; do not claim browser qualification.

- [ ] **Step 3: Implement the shared dialog contract**

`AccessibleDialog` accepts `open`, `onClose`, `labelledBy`, `initialFocusRef`, and `returnFocusRef`. It handles Escape, cycles focusable elements on Tab/Shift+Tab, applies `role="dialog"`/`aria-modal="true"`, and restores focus on close. Keep backdrop behavior explicit and preserve reduced-motion styles.

- [ ] **Step 4: Implement operator-managed Settings**

Parse the server response. When `browserConfigWritable=false`, show provider readiness but disable/hide Test and Save with “Managed by the server operator.” Do not weaken POST auth and do not store `ADMIN_TOKEN` in the client.

- [ ] **Step 5: Run GREEN and integration checks**

Run browser test, `npm run lint`, `npm test`, and `npm run build`. Expected: 0 failures; browser evidence explicit.

- [ ] **Step 6: Commit selectively**

```powershell
git add -- src/components/SettingsPanel.tsx src/components/StartScreen.tsx src/components/ui/AccessibleDialog.tsx package.json package-lock.json playwright.config.ts tests/browser/critical-path.spec.ts .github/workflows/ci.yml
git commit -m "fix: qualify settings and modal accessibility"
```

---

### Task 11: Persist Title-Page Metadata in the Authoritative Draft Aggregate

**Files:**
- Modify: `src/lib/scriptide-draft-store.ts`
- Modify: `src/components/ScriptIDE.tsx`
- Modify: `server/engine/Stage.ts`
- Modify: `server/lib/validation.ts`
- Modify: `server/routes/scriptide.ts`
- Modify: `tests/core/scriptide-draft-store.test.ts`
- Modify: `tests/routes/scriptide.test.ts`
- Modify: `tests/routes/validation-completeness.test.ts`

**Interfaces:**
- Produces: `TitlePage = {title:string; author:string; contact:string}` inside local/server authoritative draft state and conflict response.
- Depends on: Tasks 4–5 schema/version and state-authority contracts.

- [ ] **Step 1: Write RED local migration and server round-trip tests**

Test old envelope migration without body/context loss, Unicode title/author/contact reload, save/load API round-trip, stale-save conflict returning the winning title page, and bounded validation errors for malformed/oversized fields.

- [ ] **Step 2: Run RED**

Run the three focused files. Expected: title page resets or is absent from the server aggregate.

- [ ] **Step 3: Add the exact type and migration**

```ts
export type TitlePage = { title: string; author: string; contact: string };

export type ScriptIDEDraftStateV2 = ScriptIDEDraftStateV1 & {
  titlePage: TitlePage;
};
```

Bump the local envelope version and supply empty/default title fields in the v1→v2 migration. Add one Stage migration after the schema version established by Task 4. Include title page in optimistic-concurrency equality, save/load, conflict, and export authority.

- [ ] **Step 4: Run GREEN and full checkpoint**

Run focused files, `npm run lint`, `npm test`, and `npm run build`. Expected: 0 failures.

- [ ] **Step 5: Commit selectively**

```powershell
git add -- src/lib/scriptide-draft-store.ts src/components/ScriptIDE.tsx server/engine/Stage.ts server/lib/validation.ts server/routes/scriptide.ts tests/core/scriptide-draft-store.test.ts tests/routes/scriptide.test.ts tests/routes/validation-completeness.test.ts
git commit -m "fix: persist screenplay title metadata"
```

---

### Task 12: Align Final Canonical and Operator Truth With Verified Code

**Files:**
- Modify: `ROADMAP.md`
- Modify: `NORTH_STAR.md`
- Modify: `ULTRAPLAN.md`
- Modify: `ARCHITECTURE.md`
- Modify: `README.md`
- Modify: `RELIABILITY.md`
- Modify: `SECURITY.md`
- Modify: `server/nvm/revision/pipeline.ts` only after concurrent work is integrated
- Modify: `server/lib/collab-auth.ts`
- Modify: `src/components/StartScreen.tsx` only after concurrent work is integrated
- Modify: `tests/core/canonical-truth.test.ts`
- Create: `docs/PROJECT_AGGREGATE.md`
- Create: `docs/ROUTE_CAPABILITIES.md`

**Interfaces:**
- Consumes: verified Tasks 2–11 behavior.
- Produces: current-vs-target documentation that makes no recovery, reproducibility, topology, privacy, accessibility, or release claim beyond executable evidence.

- [ ] **Step 1: Expand canonical RED tests**

Assert active docs contain no unsupported `full session snapshot`, `same script always produces the same report`, `one session per browser tab`, `immutable rollback`, `12-pass`, or five-minute collaboration-secret statement. Assert current truths: JSON observation is non-recoverable, SQLite online backup is recovery, simulation reset preserves project state, 14 passes, 30-minute fallback secret, and current dual-product runtime vs future P2 target.

- [ ] **Step 2: Run RED**

Run canonical-truth test. Expected: stale claims remain.

- [ ] **Step 3: Update documents from verified behavior only**

`docs/PROJECT_AGGREGATE.md` must list durable, rebuildable, excluded, and simulation-only state; `dbSchemaVersion` and future `projectEnvelopeVersion`; reset and deletion boundaries; import retirement; backup verification; and open decisions. `docs/ROUTE_CAPABILITIES.md` must list every endpoint's schema, limiter, AI budget, auth, mutation coordination, and data class.

Use “Versioned receipts” or “Located evidence,” not rule count or unqualified “Reproducible,” in product copy. Correct pipeline/collaboration comments only after rebasing the concurrent source changes.

- [ ] **Step 4: Run GREEN and full verification**

```powershell
node --experimental-strip-types tests/core/canonical-truth.test.ts
npm run lint
npm test
npm run build
```

Expected: 0 failures and build exit 0.

If Docker is available, rebuild and boot the final image. If Playwright is available, rerun the browser gate. Otherwise report each as `NOT EVALUATED`, never pass.

- [ ] **Step 5: Commit selectively**

Stage only the listed truth/document files plus verified comment/copy changes:

```powershell
git commit -m "docs: align canonical system truth"
```

---

## Final Branch Review and Completion Gate

- [ ] Dispatch a fresh final reviewer over the complete branch diff against this plan and the audit's G-001–G-015 exits.
- [ ] Confirm no score/rule/product-future/P2/public-auth/privacy-policy scope entered the branch.
- [ ] Run fresh `npm run lint`, `npm test`, and `npm run build`; read full output and record exact counts.
- [ ] Run `rg -n "console\." server` and require zero hits outside documented/allowed CI patterns.
- [ ] Run the isolated HTTP journey.
- [ ] Run Docker and browser qualification when available; otherwise state `NOT EVALUATED` with the unavailable command/error.
- [ ] Run `git diff --check` and audit `git status --short` for user-owned/unrelated files.
- [ ] Create `docs/audits/2026-07-14-high-end-audit/IMPLEMENTATION_RECORD.md` mapping each G-ID to commit, tests, resolution, residual risk, or gate/HOLD disposition.
- [ ] Do not push or open a PR unless the user separately requests it.

## Plan Self-Review

- **Spec coverage:** Tasks 1–12 cover G-001–G-015 and the audit's reset-scope correction. P0/P1/P2/HOLD work remains explicitly gated.
- **Placeholder scan:** no TBD/TODO/“similar to”/unspecified error-handling step is permitted. Each task names files, interfaces, failing behavior, commands, expected results, implementation contract, and commit boundary.
- **Type consistency:** `SimulationObservationEnvelope`, `STAGE_DB_SCHEMA_VERSION`, `SessionCommandCoordinator`, `withAiBudget`, `PublicAiConfig`, and `TitlePage` have one declared spelling and dependency order.
- **Execution selection:** the user selected subagent-driven development. Execute one fresh implementer per task with specification review followed by code-quality review.
