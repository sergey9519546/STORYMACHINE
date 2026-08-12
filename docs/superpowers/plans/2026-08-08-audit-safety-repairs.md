# Audit Safety Repairs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Repair the verified local/P0 safety defects found in the 2026-08-08 adversarial audit without expanding StoryMachine into unvalidated hosted-product work.

**Architecture:** Keep the default Doctor + Editor research surface deterministic and local. Lifecycle operations must acknowledge success only after durable, restart-verifiable state is established. Browser certification scripts must run with every provider disabled. Experimental or legacy material must not claim evidence it lacks.

**Tech Stack:** TypeScript, Express, better-sqlite3, Zod, node:test, Playwright scripts, React.

## Global Constraints

- Work in `C:\Users\serge\.codex\worktrees\storymachine-main-integration` on user-authorized `main`; it is a linked isolated worktree.
- No production code before a focused test is observed RED.
- No participant content may be sent to a provider without explicit consent; keyless certifications must force `llmReady:false`.
- Preserve local deterministic Doctor + Editor behavior; do not add accounts, hosted tenancy, or P4 retention work.
- New/repaired user-facing copy must not call the CC0 benchmark sample professional writing or call experimental heuristic ordering “best.”
- Run touched tests, `npm run lint`, `npm test`, `npm run build`, `npm run check-docs`, and `npm run honesty-audit` before final push.

---

### Task 1: Persisted session rotation is fail-closed and restart-verifiable

**Files:**
- Modify: `server/lib/session-store.ts`
- Modify: `server/routes/config.ts`
- Modify: `server/lib/validation.ts`
- Modify: `docs/AUTH.md`
- Modify: `src/components/SettingsPanel.tsx`
- Test: `tests/routes/session-identity.test.ts`
- Create: `tests/routes/session-rotation-persistence.test.ts`

**Interfaces:**
- `rotateSession(oldSessionId, requestedNewId?)` becomes `async` and resolves only after the new durable database is reopenable and the old artifacts are gone.
- On any lifecycle/publish/verification failure it throws a typed retryable error; the old id and data remain authoritative.
- A replacement id must not collide with either an in-memory session or any existing on-disk SQLite artifact.

- [ ] **Step 1: Write the failing behavior tests**

Add a file-backed child-server test that seeds ScriptIDE state under `old-session-id`, rotates to `new-session-id`, restarts the server, and asserts only the new id restores the marker. Add a failure case that injects/observes a publication failure and asserts non-2xx plus intact old state. Add a collision case for an unloaded existing target database.

- [ ] **Step 2: Run the new test to verify RED**

Run: `node --experimental-strip-types tests/routes/session-rotation-persistence.test.ts`

Expected before implementation: Windows rotation returns 200 but the restarted new id is empty, or the target collision is accepted.

- [ ] **Step 3: Implement the smallest atomic lifecycle flow**

Use the live Stage’s SQLite backup API to a same-directory temporary destination, close/verify/reopen around publication, remove the source artifacts before rekeying the map, and roll back to the old Stage/path on any failure. Mark the old session as rotating before entering its coordinator so later commands are refused rather than running on a closed Stage. Reject invalid/colliding requested ids; keep the browser’s success copy conditional on the verified 200 response.

- [ ] **Step 4: Run focused tests to verify GREEN**

Run: `node --experimental-strip-types tests/routes/session-rotation-persistence.test.ts`

Run: `node --experimental-strip-types tests/routes/session-identity.test.ts`

Expected: all tests pass; new id survives restart, old id does not restore the marker, and publication failures do not issue a success response.

- [ ] **Step 5: Commit**

Commit message: `fix(session): make persistent rotation fail closed`

### Task 2: Make P0 certification actually keyless and current

**Files:**
- Modify: `scripts/smoke-p0-live-flow.mjs`
- Modify: `scripts/verify-focus-traps.mjs`
- Modify: `scripts/verify-p2-p3-surfaces.mjs`
- Modify: `docs/user-validation/RUN_DEMO.md`
- Modify: `src/components/StartScreen.tsx`
- Modify: `src/components/WhatIfPanel.tsx`
- Test: `tests/routes/keyless-smoke.test.ts`
- Create: `tests/scripts/keyless-browser-env.test.ts`
- Modify: `scripts/honesty-audit.mjs`

**Interfaces:**
- Browser verifier server spawn environments must clear `GEMINI_API_KEY`, all `AI_*_KEY`/base URL/provider selectors, and media provider selectors; each must verify `GET /api/ai-config` reports `llmReady:false` before the UI journey.
- P0 live-demo instructions identify the current Dead Frequency sample and its current deterministic report facts.
- The default CTA says “original sample screenplay”; Labs describes heuristic ordering precisely as experimental.

- [ ] **Step 1: Write failing tests**

Create a test that inspects/executes the shared browser-spawn environment helper with populated provider variables and asserts all provider paths are disabled and `llmReady` must be false. Add honesty assertions rejecting `professional screenplay`, `ranked best-first`, and `consistency-checked alternate futures` on exposed UI surfaces.

- [ ] **Step 2: Verify RED**

Run: `node --experimental-strip-types tests/scripts/keyless-browser-env.test.ts`

Run: `node scripts/honesty-audit.mjs`

Expected before implementation: inherited OpenAI-compatible configuration remains possible and the stale exposed copy is found.

- [ ] **Step 3: Implement minimal proof/copy repairs**

Centralize the forced-keyless spawn environment in the three scripts, check `/api/ai-config` before browser actions, correct `RUN_DEMO.md` to Dead Frequency / CONSIDER / 78 / 12 scenes, and replace the unsupported UI phrases with accurate sample/experimental wording.

- [ ] **Step 4: Verify GREEN**

Run: `node --experimental-strip-types tests/scripts/keyless-browser-env.test.ts`

Run: `node scripts/honesty-audit.mjs`

Run: `node scripts/smoke-p0-live-flow.mjs`

Expected: all green, with no provider configuration surviving the verifier spawn and no silent provider traffic.

- [ ] **Step 5: Commit**

Commit message: `fix(p0): make demo certification keyless and truthful`

### Task 3: Bound PDF extraction and operator-controlled cleanup settings

**Files:**
- Create: `server/lib/fountain-limits.ts`
- Modify: `server/lib/validation.ts`
- Modify: `server/lib/pdf-import.ts`
- Modify: `server/routes/scriptide.ts`
- Modify: `server/lib/session-store.ts`
- Modify: `server/collab/yjs-server.ts`
- Test: `tests/core/pdf-import.test.ts`
- Test: `tests/routes/scriptide-doctor-pdf.test.ts`
- Test: `tests/core/session-eviction.test.ts`

**Interfaces:**
- Fountain inputs, including converted PDFs, share one maximum character ceiling.
- `pdfToFountain` rejects bounded excessive page/text work with a safe actionable error and always releases its PDF document/loading task.
- `SESSION_FILE_TTL_HOURS` and `COLLAB_MAX_ROOMS` accept only bounded positive integers and fail startup/configuration evaluation rather than silently disabling ceilings.

- [ ] **Step 1: Write failing tests**

Build a synthetic over-limit PDF and assert the importer/route rejects it without handing an oversized Fountain string to Doctor. Add environment parsing tests for nonnumeric, zero, and negative TTL/room limits.

- [ ] **Step 2: Verify RED**

Run: `node --experimental-strip-types tests/core/pdf-import.test.ts`

Run: `node --experimental-strip-types tests/routes/scriptide-doctor-pdf.test.ts`

Expected before implementation: over-limit extraction completes/analyses and invalid settings produce NaN or non-positive ceilings.

- [ ] **Step 3: Implement minimal shared limits**

Export the Doctor Fountain ceiling once, check PDF page count and accumulated extraction incrementally, enforce the final Fountain ceiling before analysis, and destroy PDF resources in `finally`. Reuse bounded integer parsing for file TTL and collaboration room capacity.

- [ ] **Step 4: Verify GREEN**

Run: `node --experimental-strip-types tests/core/pdf-import.test.ts`

Run: `node --experimental-strip-types tests/routes/scriptide-doctor-pdf.test.ts`

Run: `node --experimental-strip-types tests/core/session-eviction.test.ts`

Expected: all pass and oversize input receives an actionable 4xx response.

- [ ] **Step 5: Commit**

Commit message: `fix(boundaries): cap PDF and runtime cleanup work`

### Task 4: Reconcile active documentation truth

**Files:**
- Modify: `ULTRAPLAN.md`
- Modify: `docs/user-validation/P1_BASELINE_INVENTORY.md`
- Modify: `docs/CRITICAL_PATH_COMPLETE.md`
- Modify: `docs/PROJECT_GAP_ANALYSIS.md`
- Modify: `docs/V5.0_VICTORY.md`
- Modify: `docs/trinity-gate-integration-report.md`
- Modify: `ARCHITECTURE.md`
- Modify: `CLAUDE.md`
- Modify: `CONTRIBUTING.md`
- Test: `tests/docs/canonical-truth.test.ts`

**Interfaces:**
- Active project guidance must agree with ROADMAP: P0 GO/0 sessions/no verdict; P1 evidence work allowed in parallel; P2/P3 complete; P4 blocked until P0 PASS.
- Point-in-time historical documents must carry a first-screen historical/superseded marker and current-roadmap pointer.

- [ ] **Step 1: Write failing tests**

Add canonical-document token assertions that detect contradictory P0/P1/P2/P3/P4 status language and assert historical markers on retained point-in-time documents.

- [ ] **Step 2: Verify RED**

Run: `node --experimental-strip-types tests/docs/canonical-truth.test.ts`

Expected before implementation: active docs contradict ROADMAP or unmarked historical reports claim current production/demand status.

- [ ] **Step 3: Implement the narrow truth/sealing changes**

Make ULTRAPLAN a current concise pointer or harmonize it; mark stale root reports historical; align Node floor references.

- [ ] **Step 4: Verify GREEN**

Run: `node --experimental-strip-types tests/docs/canonical-truth.test.ts`

Run: `node scripts/check-docs-quality.ts --all`

Run: `node scripts/honesty-audit.mjs`

- [ ] **Step 5: Commit**

Commit message: `docs(truth): reconcile active project guidance`

### Task 5: Seal unsupported telemetry and inline-completion paths

**Files:**
- Modify: `server/lib/validation.ts`
- Modify: `server/routes/events.ts`
- Modify: `server/routes/scriptide.ts`
- Modify: `src/components/editor/inline-complete.ts`
- Modify: `tests/routes/route-capabilities.test.ts`
- Create: `tests/routes/events.test.ts`
- Modify: `tests/core/inline-complete-default-off.test.ts`

**Interfaces:**
- Product events use a strict per-event property allowlist and never persist a session capability. They are not presented as human-demand evidence.
- Inline completion must not invoke a provider via a GET query containing draft text or a session capability; seal the endpoint/client path until a separately consented POST fetch-streaming design is built.

- [ ] **Step 1: Write failing tests**

Add route tests proving event props reject arbitrary keys and logs omit session ids. Add a route-capability regression requiring the former completion GET to perform zero provider work and return an explicit non-success retirement response.

- [ ] **Step 2: Verify RED**

Run: `node --experimental-strip-types tests/routes/events.test.ts`

Run: `node --experimental-strip-types tests/routes/route-capabilities.test.ts`

Expected before implementation: event props accept free-form data and the completion GET remains provider-capable.

- [ ] **Step 3: Implement narrow sealing changes**

Replace event props with a strict discriminated schema and aggregate-safe logging. Tombstone inline GET and prevent the default-off client extension from creating it; update the capability inventory.

- [ ] **Step 4: Verify GREEN**

Run: `node --experimental-strip-types tests/routes/events.test.ts`

Run: `node --experimental-strip-types tests/routes/route-capabilities.test.ts`

- [ ] **Step 5: Commit**

Commit message: `fix(boundaries): seal unsupported telemetry and completion paths`

### Task 6: Whole-branch review and gate record

**Files:**
- Modify: `.superpowers/sdd/progress.md`
- Modify: `docs/audits/2026-08-08-main-consolidation.md`

- [ ] **Step 1: Review every task diff independently**

For each task, generate a review package against its recorded pre-task SHA and dispatch a fresh reviewer. Resolve all Critical/Important findings before advancing.

- [ ] **Step 2: Run the full relevant gate on one exact commit**

Run: `npm run lint`

Run: `npm test`

Run: `npm run build`

Run: `npm run check-docs`

Run: `npm run honesty-audit`

Run: `npm audit --omit=dev --audit-level=high`

- [ ] **Step 3: Record scope truth**

Add only verified results to the audit record. Keep the remaining structural hosted risks explicitly deferred: authenticated ownership/tenancy, durable idempotency receipts, and full POST fetch-streaming replacement require the later release-surface phase.

- [ ] **Step 4: Commit and push**

Commit message: `docs(audit): record safety repair verification`
