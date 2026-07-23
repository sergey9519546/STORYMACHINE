# Phase 2 — Quality, Recovery, Accessibility, Performance, and Operations Findings

**Audit slice:** test coverage, CI/release integrity, deployment/runtime
packaging, performance, accessibility, persistence correctness, API-contract
drift, and documentation consistency.  
**Method:** static trace of first-party sources plus bounded, non-destructive
execution against in-memory SQLite and ephemeral loopback HTTP servers. No
product code was changed. No cybersecurity probing, secret discovery, or
external exploitation was performed.  
**Evidence date:** 2026-07-14/15 working-tree snapshot.  
**Severity convention:** Critical = a current recovery path can destroy or
reject user state; Major = release/user-facing trust or production-readiness
failure; Moderate = bounded correctness/quality debt; Minor = hygiene or
portability issue.

## 1. Executive result

The source-level regression posture is unusually broad and fast, but it does
not yet justify calling the system production-recoverable or release-complete.
The most important result of this slice is not a missing test percentage: the
current session export/import contract is broken in two independent ways.

1. A snapshot produced by the current server carries schema version **13**,
   while the current import route rejects every version above **6**. A live
   export from a populated in-memory session was immediately rejected by the
   same process with HTTP 422.
2. The import validator accepts non-empty arrays of arbitrary values. The
   route deletes the existing session before `Stage.importSnapshot()` performs
   real writes. A malformed import therefore returned HTTP 500 *after* erasing
   a valid destination; the executed witness changed one agent/one location to
   zero/zero.

Those are Critical recovery blockers. They also invalidate README language
that presents `/api/session/export` as a usable full-session recovery artifact.

The remaining quality gap is a boundary problem: `npm test` exercises a great
deal of deterministic code, but the real-script corpus, HTTP child-process
journey, browser behavior, accessibility semantics, production container, and
release artifact are not all in the ordinary CI proof chain. The repository
has useful manual browser QA and robust route tests, but those controls do not
currently fail a pull request.

## 2. Executed baseline

The companion executable record at
`docs/audits/2026-07-14-high-end-audit/BASELINE_VERIFICATION.md:9-17` reports:

- `npm run lint`: pass;
- `npm run build`: pass, with a 556,213-byte minified `ScriptIDE` chunk warning;
- `npm test`: 9,507 pass, 72 skip, 1 todo, 0 fail;
- metamorphic runner: process pass, 6/7 raw cases pass;
- opt-in HTTP journey: 7/7 pass, but API-only and persistence-polluting.

Additional bounded recovery witnesses run for this slice:

| Witness | Result |
|---|---|
| Create a populated `:memory:` session -> `GET /api/session/export` -> POST that exact snapshot to `/api/session/import` | Export 200 with `schema_version` 13; import 422: `Snapshot schema v13 is newer than server schema v6` |
| Create a populated `:memory:` session -> import `{schema_version:6, locations:[{}], agents:[{}], action_log:[]}` | Import 500; destination changed from 1 agent/1 location to 0/0 |
| Inspect current production build artifacts | `ScriptIDE-*.js` 556,213 bytes; entry 194,931 bytes; Motion vendor 96,171 bytes; CSS 86,904 bytes |

These commands used ephemeral HTTP ports and `SESSION_DB_DIR=:memory:`. They
did not create or modify repository data.

## 3. What is strong

### QO-S01 — The default source-level gate is broad and intentionally keyless

- `.github/workflows/ci.yml:20-49` performs a clean install, TypeScript check,
  server-console prohibition, full test discovery, metamorphic gate, and
  production frontend build.
- `.github/workflows/ci.yml:33-40` deliberately omits an AI key from the test
  step, proving the supported analysis-only posture rather than succeeding
  through outbound-provider failures.
- `tests/routes/helpers.ts:1-36` drives the real Express application over an
  OS-assigned HTTP port and forces route-test sessions into in-memory SQLite.
- The baseline records 115/115 focused ingress, validation, and resource-bound
  tests passing
  (`docs/audits/2026-07-14-high-end-audit/BASELINE_VERIFICATION.md:15`).

### QO-S02 — Draft saves have a real optimistic-concurrency core

- `server/engine/Stage.ts:1584-1625` compares the caller's opaque server
  revision and performs the read/check/upsert in one SQLite transaction.
- `server/routes/scriptide.ts:203-227` returns a structured 409 conflict rather
  than silently overwriting a newer server draft.
- `src/components/ScriptIDE.tsx:449-518` queues a trailing save when an edit
  lands during an in-flight request and only acknowledges the generation the
  server actually saved.
- `tests/routes/scriptide.test.ts:87-130` exercises create, update, stale-save
  conflict, and preservation of the winning server state.

### QO-S03 — Several performance/resource controls are deliberate

- `server/nvm/analyze/doctor.ts:70-164` implements a bounded 64-entry LRU for
  pure doctor results.
- `server/lib/validation.ts:595-711` caps single-document and aggregate slate
  inputs.
- `tests/core/analyzer-dos.test.ts:76-90` executes a pathological screenplay
  and asserts the 1,000-scene truncation is both bounded and disclosed.
- `src/App.tsx:6-9` lazy-loads the four top-level product surfaces.

### QO-S04 — Accessibility foundations exist

- `index.html:1-6` declares a language and responsive viewport.
- `src/App.tsx:128-143` globally delegates Motion animations to the user's
  reduced-motion preference; `src/index.css:215-224` supplies a CSS fallback.
- `src/components/StartScreen.tsx:58-60` defines a consistent visible
  focus-ring token used on the redesigned entrance.
- The tracked browser harness samples three viewport classes and inspects
  overflow, control bounds, labels, console errors, and request failures
  (`output/playwright/whole_site_qa.py:14-18`, `:31-102`, `:130-254`).

### QO-S05 — The standalone backup implementation uses the correct primitive

- `server/lib/backup.ts:1-6` correctly rejects raw file copying as unsafe for
  active SQLite/WAL databases.
- `server/lib/backup.ts:43-97` uses `Database.backup()` per database, isolates
  individual failures, and supports retention.
- `tests/core/backup.test.ts:48-151` runs the utility against real temporary
  SQLite databases and cleans its temporary tree.

### QO-S06 — The container has several sound runtime basics

- `Dockerfile:16-30` separates the runner stage and embeds version/commit
  identity.
- `Dockerfile:51-74` creates the persistence directory, fixes ownership, and
  runs as the unprivileged upstream `node` user.
- `Dockerfile:78-87` provides a health probe and resolves `tsx` locally rather
  than fetching it at runtime.

## 4. Findings

### QO-01 — Current exports are rejected by current import

- **Severity:** Critical
- **Confidence:** Certain; static proof plus executed HTTP witness
- **Boundary:** Recovery / API contract / documentation

**Evidence**

- `server/engine/Stage.ts:95-99` defines schema version as the length/progress
  of the migration array; migrations continue through v13 at
  `server/engine/Stage.ts:250-276`.
- `server/engine/Stage.ts:1338-1344` serializes the live SQLite
  `user_version`; the executed empty-Stage witness returned 13.
- `server/routes/config.ts:328-335` independently hard-codes
  `CURRENT_SCHEMA = 6` and rejects a larger value.
- `tests/routes/config.test.ts:200-226` only imports a hand-authored version-6
  fixture. There is no export-current/import-current round-trip test.

**Executed witness**

A real loopback app with `SESSION_DB_DIR=:memory:` was populated via
`POST /api/init`. Its exact `GET /api/session/export` response contained one
agent, one location, and `schema_version` 13; posting that response back to
`/api/session/import` returned 422 with `Snapshot schema v13 is newer than
server schema v6. Upgrade the server first.`

**Impact**

The documented recovery path cannot restore a snapshot generated by the same
version of the application. This is a release blocker for any promise of
session portability, rollback, or disaster recovery.

**Required correction**

Make schema version a single exported authority owned by `Stage`/the migration
module. Snapshot format version and database migration version should be
separate if their compatibility rules differ. Add a hard HTTP test that
populates every exportable domain, exports from the current server, imports
into a fresh current server, and compares normalized state.

**Acceptance gate**

1. Current export imports on the same build.
2. Every supported older fixture imports through explicit migrations.
3. A genuinely newer snapshot is rejected before destination mutation.
4. No route contains a hand-maintained numeric duplicate of the authoritative
   current snapshot version.

### QO-02 — Malformed import destroys the valid destination before failing

- **Severity:** Critical
- **Confidence:** Certain; static proof plus executed HTTP witness
- **Boundary:** Recovery / data integrity

**Evidence**

- `server/lib/validation.ts:267-275` validates `agents` and `locations` only as
  arrays of `unknown`, defaults `action_log`, and passes every other field
  through without a complete snapshot schema.
- `server/routes/config.ts:318-336` checks only array presence/non-emptiness
  and the stale version ceiling.
- `server/routes/config.ts:337-345` calls `destroySession(sid)` *before*
  `stage.importSnapshot(snap)`.
- `server/engine/Stage.ts:1373-1388` performs a sequence of independent writes,
  not a validating transaction or temporary-database build.
- `server/lib/session-store.ts:160-169` shows that `destroySession` closes the
  session and unlinks its DB/WAL/SHM/journal files in persistent mode.

**Executed witness**

A valid one-agent/one-location in-memory session was created. Importing a body
that passes `ImportBodySchema` and the route's non-empty checks—version 6,
`locations:[{}]`, `agents:[{}]`, empty action log—failed on SQLite's non-null
location-name constraint. The route returned 500, and a subsequent `/api/state`
showed zero agents and zero locations. The valid destination had already been
destroyed.

**Impact**

A corrupt, partial, old, or manually edited recovery file can erase the state
it was supposed to replace. In disk mode, that destruction includes the
persisted database and its journaling sidecars.

**Required correction**

Validate the complete versioned snapshot before touching the destination.
Import into an isolated temporary `Stage`/temporary DB under one transaction,
run semantic invariants, close it, then atomically swap/rename only after full
success. Preserve the original until the replacement is durable. Return a
field-addressed 4xx for invalid snapshots.

**Acceptance gate**

- A corpus of malformed/partial/old/future snapshots never changes any byte of
  the destination DB.
- Forced failures at every import step preserve and reopen the original.
- Successful replacement is all-or-nothing across all tables.

### QO-03 — “Full session snapshot” omits current canonical and editor state

- **Severity:** Major
- **Confidence:** High; direct schema/export comparison
- **Boundary:** Recovery semantics / documentation

**Evidence**

- `server/engine/Stage.ts:153-263` creates post-v7 tables for Story Commits,
  LLM cache, ghost commits, reveal plans, drama positions, self-play corpus,
  and ScriptIDE state.
- `server/engine/Stage.ts:1338-1370` exports locations, agents, action log,
  several ledgers, illusion state, traces, edges, mutations, and stakes only.
  It does not export/import Story Commits, ghost commits, reveal plans, drama
  positions, self-play runs, LLM cache, or `ScriptIDE_State`.
- The public `StageSnapshot` type mirrors that incomplete list at
  `server/engine/types.ts:593-614`.
- README labels `GET /api/session/export` a “full session snapshot” at
  `README.md:32-41` and says a session DB contains full simulation/screenplay
  state at `README.md:158-163`.

**Impact**

Even after QO-01 is fixed, export/import cannot reproduce the active editor
draft or the newer canonical/analytical ledgers. A restore can look successful
while silently discarding precisely the state added by migrations 8–13.

**Required correction**

Either (a) define a complete, versioned portable-session schema and include
every state authority, with explicit decisions about rebuildable caches, or
(b) rename and describe the endpoint honestly as a partial simulation export.
For disaster recovery, the existing online SQLite backup is a stronger
primitive than an incomplete object projection.

### QO-04 — Reset’s “backup” bypasses the repository’s WAL-safe backup path

- **Severity:** Major
- **Confidence:** High; direct implementation comparison
- **Boundary:** Recovery before destructive reset

**Evidence**

- `server/routes/game.ts:475-486` copies only `<sid>.db` with
  `fs.copyFileSync()` while the session's `Stage` can still be open, then
  destroys the session.
- `server/lib/backup.ts:1-6` correctly documents why raw copying an active
  SQLite/WAL database is unsafe and uses the online backup API instead.
- README repeats the same correct warning at `README.md:165-173`.

**Impact**

Recent committed pages can reside in `-wal` rather than the main DB file. The
pre-reset `.bak.db` can therefore be internally consistent but stale, or fail
to represent the state immediately before reset—the exact moment the backup is
supposed to protect.

**Required correction**

Call the tested online-backup primitive (or checkpoint/close under an exclusive
session command lock) before deletion. Verify restore from the produced reset
backup in an integration test that leaves uncheckpointed WAL content before
reset.

### QO-05 — The green default suite excludes the highest-value runtime evidence

- **Severity:** Major
- **Confidence:** Certain
- **Boundary:** Test/CI claim calibration

**Evidence**

- `tests/core/real-script-corpus.test.ts:39-54`, `:114`, and `:185` skip the
  produced-script and two degradation suites without
  `REAL_SCRIPT_CORPUS_DIR`; the baseline observed 72 skips.
- `.github/workflows/ci.yml:39-49` runs `npm test`, metamorphic, and build but
  supplies neither the corpus directory nor `RUN_E2E=1`.
- `tests/e2e/journeys.test.ts:1-16` calls itself full-stack but explicitly
  skips by default; `:116-245` exercises HTTP responses, not a browser.
- `package.json:7-17` defines no browser, accessibility, visual, coverage, load,
  or container-smoke command.
- The only score-margin failure is intentionally todo; its reason still says
  “~0.0 dead tie” at `tests/core/discrimination.test.ts:283-304` while the
  surrounding measured ledger records a nonzero but sub-threshold gap at
  `:266-281`.
- The metamorphic runner intentionally excludes `empty_verbosity` from the
  process exit code (`evals/scoring/runner/run-metamorphic.ts:4-9`, `:37-76`;
  `evals/scoring/runner/metamorphic-lib.ts:18-47`). The baseline measured 6/7
  raw cases passing.

**Impact**

“9,507 pass” is strong evidence for bounded mechanics, but not evidence that a
writer can complete a browser journey, that the package boots, that recovery
works, or that real-writing assertions execute. Generated pass tests also
dominate the raw count, so the count must not be used as a coverage proxy.

**Required correction**

Publish a CI capability matrix that separates unit, route, process, browser,
container, private-corpus, and external-provider evidence. Make a small
keyless browser smoke and container boot deterministic enough to gate every
PR. Keep licensed/private corpus runs on an authorized runner, but make their
absence visible as “not evaluated,” not merely a green aggregate.

### QO-06 — The browser QA harness cannot enforce its own accessibility findings

- **Severity:** Major
- **Confidence:** High
- **Boundary:** Accessibility / visual regression

**Evidence**

- `output/playwright/whole_site_qa.py:8-18` is a standalone Python Playwright
  script with a hard-coded server URL, outside `package.json` and CI.
- `.gitignore:13-14` ignores every output except the Python script, so results
  and baselines are not committed evidence.
- `output/playwright/whole_site_qa.py:21-28` falls back to the element's tag
  name when no accessible label/text/placeholder exists. Therefore the later
  `if not label` branch at `:79-80` cannot identify an unnamed control.
- `output/playwright/whole_site_qa.py:75-80` records undersized/clipped/unnamed
  controls, but `:245-254` only writes and prints a report; it never asserts a
  threshold or exits nonzero.
- The current local report contains many controls below 44 px, demonstrating
  the recorder is finding issues, but those issues do not block anything.

**Impact**

The repository has valuable visual reconnaissance but no reproducible browser
quality gate. Its unnamed-control signal is structurally incapable of firing,
and every other recorded failure is advisory.

**Required correction**

Move a minimal browser suite into the supported Node toolchain, run it against
the production build, add keyboard/focus and axe-equivalent semantic checks,
and make named thresholds fail CI. Keep screenshots as diagnosable artifacts,
not as the sole oracle.

### QO-07 — Core dialogs and form labels lack required semantics/focus behavior

- **Severity:** Major
- **Confidence:** High; static DOM trace
- **Boundary:** Keyboard and screen-reader use

**Evidence**

- The file-preview overlay at `src/components/StartScreen.tsx:751-793` has no
  `role="dialog"`, `aria-modal`, labelled dialog container, initial focus,
  focus trap, Escape handler, or focus restoration.
- The settings overlay at `src/components/SettingsPanel.tsx:613-629` has the
  same omissions. Its tab strip at `:641-650` is a row of buttons without
  tablist/tab/selected semantics.
- The coverage drawer declares only `role="region"` at
  `src/components/scriptide/CoverageSummary.tsx:127-167`, despite behaving as a
  fixed, dismissible overlay.
- Reusable settings fields render a sibling `<label>` with no `htmlFor` and an
  input with no `id` (`src/components/SettingsPanel.tsx:72-99`); axis selectors
  repeat the pattern at `:314-337`.
- The wizard's “Narrative Theme” label is not associated with its input
  (`src/components/startscreen/StoryConfigForm.tsx:93-104`), and the manual
  context textarea has no programmatic label at `:145-153`.

**Impact**

Keyboard focus can escape behind an overlay, Escape does not close it, focus
is not restored to the trigger, and screen readers can encounter unlabeled
fields or an undifferentiated region rather than a modal dialog.

**Required correction**

Adopt one tested dialog primitive, unique control IDs with associated labels,
true tab semantics, and browser tests for Tab/Shift+Tab containment, Escape,
trigger restoration, and accessible names.

### QO-08 — Release tags are mutable and the published container is not the tested artifact

- **Severity:** Major
- **Confidence:** High
- **Boundary:** Release integrity / rollback

**Evidence**

- `.github/workflows/release.yml:18-22` accepts any `v*` tag and an unrestricted
  manual dispatch; there is no semantic-version or package-version equality
  check.
- On manual dispatch, `:69-83` derives the image version from `package.json` on
  whatever ref was selected.
- `:102-116` pushes both that version and mutable `latest`. A manual run from a
  different commit can overwrite the same version tag.
- The test job's frontend build at `:33-61` is discarded. The publish job
  separately rebuilds inside Docker at `:63-116`; it does not boot the image,
  call `/health`, exercise persistence, or compare an artifact produced by the
  test job.
- README promises “every release is a distinct, retained image tag” and
  rollback without reconstruction at `README.md:103-116`, which the workflow
  does not enforce.
- The workflow emits labels, but no SBOM, signature, digest manifest, or
  provenance attestation (`.github/workflows/release.yml:102-116`). Actions and
  Node/base images are selected by mutable major/tag references
  (`.github/workflows/ci.yml:13-16`,
  `.github/workflows/release.yml:36-39`, `:67`, `:85-103`; `Dockerfile:1`,
  `:10`, `:16`).

**Impact**

Two different commits can legitimately occupy the same supposed rollback tag.
Passing source tests does not prove the pushed image boots or preserves data.
Release reconstruction depends on external registry history rather than an
immutable, attested mapping.

**Required correction**

Require exact `vX.Y.Z`, match `package.json`, refuse an existing immutable
version tag, publish the commit-SHA and digest, boot/test the built image before
promotion, and attach machine-verifiable build metadata. Manual “republish”
should re-promote the same digest, not rebuild an arbitrary ref into an old tag.

### QO-09 — Production start depends on the entire development dependency tree

- **Severity:** Moderate
- **Confidence:** Certain
- **Boundary:** Runtime packaging / operability

**Evidence**

- `package.json:8-10` runs both development and production start through
  `tsx server.ts`.
- `tsx` is a dev dependency at `package.json:50-61`.
- `Dockerfile:1-8` intentionally installs development dependencies, and
  `Dockerfile:32-49` copies the complete resulting `node_modules` into the
  runner because there is no server compile stage.
- `Dockerfile:81-87` documents this as an explicit tradeoff.

**Impact**

A conventional production install such as `npm ci --omit=dev && npm start`
cannot start. The runtime image carries bundlers, TypeScript tooling, type
packages, and other build-only dependencies, increasing image size and the
number of components that can break a production boot.

**Required correction**

Compile/bundle the server into a runnable production artifact and install only
runtime dependencies in the final stage. Add a clean-image boot test that
proves no source compiler or network fetch is required at runtime.

### QO-10 — The health/restart story detects process death but does not recover it

- **Severity:** Moderate
- **Confidence:** High
- **Boundary:** Runtime operations

**Evidence**

- `/health` deliberately returns ok without checking storage or optional AI
  dependencies (`server/routes/config.ts:26-41`). It is correctly a liveness
  endpoint, not readiness.
- Docker uses that liveness response as its only health check
  (`Dockerfile:78-79`).
- `server.ts:63-81` intentionally exits after an uncaught exception and states
  that an orchestrator or `--restart` policy must bring up a fresh process.
- The published-image runbook uses plain `docker run` without a restart policy
  at `README.md:83-94`.

**Impact**

The documented deployment does not restart after the intentional crash-exit
path, and a bind-mounted but unusable session directory can remain “healthy”
until a writer first touches persistence. Docker health status alone does not
restart a standalone container.

**Required correction**

Document and test an orchestrated/restart-enabled topology. Keep liveness
keyless and cheap; add a separate readiness check for writable persistence and
other mandatory deployment dependencies without making an AI key mandatory.

### QO-11 — The main editor chunk exceeds the build warning with no performance budget

- **Severity:** Moderate
- **Confidence:** High; observed production build
- **Boundary:** Frontend startup/responsiveness

**Evidence**

- The current build emits `ScriptIDE-*.js` at 556,213 bytes minified, above
  Vite's 500 kB warning threshold
  (`docs/audits/2026-07-14-high-end-audit/BASELINE_VERIFICATION.md:11-13`).
- `src/components/ScriptIDE.tsx` is 2,360 lines and coordinates editor state,
  autosave, analysis, imports, conflict UI, title page, toolbar, and overlays.
- `vite.config.ts:17-37` manually separates Motion/Lucide but defines no
  `chunkSizeWarningLimit`, performance budget, or route-specific target.
- `package.json:7-17` defines no bundle-analysis or performance regression
  command.

**Impact**

The editor is lazy-loaded, so the start screen remains protected, but the first
editor entry pays a large parse/compile cost on lower-end devices. Future growth
has no regression threshold.

**Required correction**

Measure editor-entry transfer/parse/interaction on representative mobile
hardware, set explicit budgets, and split optional panels/format exporters from
the core editing path based on measured cost. Gate compressed and uncompressed
chunk deltas in CI.

### QO-12 — Authoritative local draft success is incorrectly coupled to a legacy theme mirror

- **Severity:** Moderate
- **Confidence:** High; direct control-flow proof
- **Boundary:** Local persistence / open-file flow

**Evidence**

- `src/lib/scriptide-draft-store.ts:87-95` writes the authoritative versioned
  envelope first, then returns the logical AND of that write and a separate
  legacy `theme` mirror.
- If the envelope succeeds and the mirror fails, the function reports failure
  although the draft is durably present.
- `src/components/StartScreen.tsx:161-179` treats false as a blocked-storage
  failure and refuses to enter the editor.
- `tests/core/scriptide-draft-store.test.ts:48-55` covers two successful writes;
  `:89-91` covers total failure only. It does not inject a second-write-only
  failure.

**Impact**

A partial quota/policy failure on the compatibility mirror can tell the writer
their script could not be opened even though the authoritative draft was saved.
The next attempt may then reveal a draft the UI claimed did not exist.

**Required correction**

Return separate primary/mirror outcomes or make the mirror explicitly
best-effort. Navigation should depend only on the authoritative envelope. Add a
second-write failure test and a component-level open-file transition test.

### QO-13 — “Clear All” does not cancel the parent-owned drop reader

- **Severity:** Moderate
- **Confidence:** High; async ownership trace
- **Boundary:** Wizard upload persistence

**Evidence**

- `src/components/StartScreen.tsx:113-122` owns drag/drop reads and appends the
  resolved batch unconditionally.
- The child component owns a separate generation counter for file-picker reads
  and increments it on clear
  (`src/components/startscreen/StoryConfigForm.tsx:47-60`, `:78-81`).
- Clear cannot increment or observe the parent's drop-read generation because
  the guards live in different components.

**Impact**

If a writer drops a slow file and clicks Clear All before reading completes,
the resolved drop reappears after the explicit clear. Hidden context can then
be sent even though the UI briefly showed it removed.

**Required correction**

Move generation/cancellation ownership to `StartScreen`, route both picker and
drop through one operation, and test drop -> clear -> delayed completion plus
two concurrent batches.

### QO-14 — The opt-in HTTP journey writes to the normal session directory

- **Severity:** Moderate
- **Confidence:** Certain; executed witness
- **Boundary:** Test isolation

**Evidence**

- `tests/e2e/journeys.test.ts:81-97` spawns the real server with `NODE_ENV=test`
  but does not set `SESSION_DB_DIR=:memory:` or a temporary directory.
- Default persistence is `data/sessions` at
  `server/lib/session-store.ts:102-105`.
- Journey 4 creates a fixed `e2e-journey-4` session at
  `tests/e2e/journeys.test.ts:167-198`.
- Teardown kills the process only (`tests/e2e/journeys.test.ts:109-114`); it
  does not
  remove the DB/WAL/SHM files.
- The audit execution created those files in the ignored runtime directory;
  they were removed after exact-path verification.

**Impact**

Local/CI opt-in tests mutate the same storage tree used by development and can
rehydrate stale test state on later runs. Fixed port 4577 (`:16-18`) also makes
parallel execution collide.

**Required correction**

Use an OS-assigned port and a unique temporary session directory (or memory),
close gracefully, and delete the exact temporary tree in `after`. Add this
journey to CI once isolated.

### QO-15 — AI-config POST response violates the client’s declared response shape

- **Severity:** Moderate
- **Confidence:** Certain; direct response/client trace
- **Boundary:** API contract drift

**Evidence**

- GET computes and returns `llmReady` by combining both key sources at
  `server/routes/config.ts:135-149`.
- POST returns `{config: getPublicConfig()}` without `llmReady` at
  `server/routes/config.ts:151-156`.
- The client declares `llmReady` required at
  `src/components/SettingsPanel.tsx:15-39`, casts the POST response to that
  impossible shape, and replaces state with it at `:591-603`.
- The settings status then renders undefined as “no key detected” at
  `src/components/SettingsPanel.tsx:197-198`.
- Route tests assert POST status only (`tests/routes/config.test.ts:246-254`,
  `:296-305`), not response parity with GET.

**Impact**

Immediately after a successful save, the settings panel can report no key
detected because the response dropped a required readiness field. This is a
concrete example of manually duplicated client/server types drifting despite
passing TypeScript.

**Required correction**

Share a response schema/type or parse it at runtime. Make GET and successful
POST return the same public config shape, including the two-source readiness
calculation. Add a route contract test and a UI state-transition test.

### QO-16 — API availability copy and architecture prose contain live-state drift

- **Severity:** Moderate
- **Confidence:** High
- **Boundary:** Documentation / operator and developer truth

**Evidence**

- UI 404 branches say live routes “haven't been deployed” for slate, What-If,
  PDF/deep doctor, coverage, breakdown, pitch kit, and fix
  (`src/components/SlatePanel.tsx:563`, `:592`;
  `src/components/WhatIfPanel.tsx:508-510`, `:805`;
  `src/components/scriptide/ScriptDoctorPanel.tsx:1579-1582`, `:1736`, `:1836`,
  `:1848`, `:1932`).
  All corresponding routes exist, including slate at
  `server/routes/export.ts:549-601` and What-If at
  `server/routes/nvm/twin-whatif.ts:58-99`. A 404 can therefore mean routing or
  deployment mismatch, but the copy asserts one cause.
- `ARCHITECTURE.md:276-285` says the record-parity test is not yet landed;
  `tests/core/record-parity.test.ts` is present and in default test discovery.
- `ARCHITECTURE.md:287-310` still instructs indefinite wave work even though
  `ROADMAP.md:7-15` retires that spine.
- README promises full snapshot/immutable rollback semantics that QO-01/QO-03/
  QO-08 disprove (`README.md:32-41`, `:103-116`).
- The working-tree `AGENTS.md` says `.Codex/` is ignored, while `.gitignore:1-26`
  has no `.Codex/` rule. This should be reconciled without overwriting the
  user's current uncommitted file.

**Impact**

Stale state comments send maintainers toward already-landed work, misclassify
real 404s, and overstate recovery/release guarantees. In this repo, narrative
memory changes faster than executable truth.

**Required correction**

Treat ROADMAP as sequence authority and generated/executable registries as
state authority. Replace deployment-specific 404 messages with neutral
availability errors plus trace IDs. Add documentation tests for file/route
existence and centralize version/release/snapshot claims.

### QO-17 — Quality gates measure types and tests, not source coverage or maintainability

- **Severity:** Moderate
- **Confidence:** Certain
- **Boundary:** Maintainability assurance

**Evidence**

- `package.json:12-15` maps `lint` to `tsc --noEmit` and defines no ESLint,
  formatting, or coverage command.
- `tsconfig.json:1-25` enables strict types but also `allowJs` and
  `skipLibCheck`; it does not enable unused-local/unused-parameter checks.
- `.github/workflows/ci.yml:20-49` has no coverage threshold, changed-line
  coverage, formatter, or browser/container job.
- The repository's generated pass families create thousands of assertions;
  raw test count therefore cannot reveal unexecuted orchestration, UI, import,
  or release branches. QO-01 and QO-02 both survived a 9,507-pass baseline.

**Impact**

Dead paths, stale comments/types, and uncovered boundary logic can accumulate
while every current gate remains green. The two Critical recovery bugs are the
direct counterexample to treating raw pass count as sufficient assurance.

**Required correction**

Add coverage reporting first as information, then set risk-based thresholds on
recovery, persistence, release, and UI state boundaries rather than a single
repo-wide percentage. Add a real linter/formatter only with a migration plan
that avoids massive unrelated churn.

### QO-18 — Small packaging and portability contracts are implicit

- **Severity:** Minor
- **Confidence:** High
- **Boundary:** Developer operations

**Evidence**

- README requires Node 22.6+ (`README.md:9-12`), but `package.json:1-6` has no
  `engines` field and the repo has no `.nvmrc`/`.node-version`; CI selects the
  moving Node 22 line at `.github/workflows/ci.yml:15-18`.
- `package.json:12` uses Unix `rm -rf` for `npm run clean` even though the
  documented/shared workspace is also used from Windows PowerShell.
- `.env.example:15-107` documents the substantial operator surface, while the
  README section titled “Environment Variables” lists only two variables at
  `README.md:23-30`; production-critical settings are therefore discoverable
  only by reading the example file and later deployment prose.

**Impact**

Unsupported Node versions fail late, clean is shell-dependent, and operators
can miss persistence/collaboration/administration settings.

**Required correction**

Pin the supported Node range in package metadata and CI, use a portable clean
script, and make README link to `.env.example` as the authoritative complete
operator reference.

## 5. Test-gap matrix

| Boundary | Current evidence | Missing hard gate |
|---|---|---|
| Pure analysis/revision mechanics | Thousands of default Node tests | Coverage mapping; test-count de-duplication by concept |
| HTTP routing/validation | Strong in-process real-HTTP route suite | Export-current/import-current; malformed-import preservation |
| Process lifecycle | Opt-in seven-journey child server | CI execution; temp storage; dynamic port; crash/restart path |
| Browser/editor | Manual Python Playwright reconnaissance | Supported dependency lock; assertions; keyboard/a11y; CI |
| Persistence | Draft conflict tests, eviction tests, online backup tests | Full snapshot round-trip; WAL reset restore; cross-command races |
| Real writing | Local-only 72-script manifest/harness | Authorized CI runner; visible run status; legally distributable benchmark |
| Container | Dockerfile build in release | Build/boot/health/persistence smoke before push |
| Release | Source gates repeated before publish | Immutable tag/digest, artifact promotion, provenance, rollback drill |
| Performance | Input ceilings, cache, build warning | Browser budgets, latency/load baselines, container resource envelope |
| Accessibility | Reduced-motion/focus foundations, manual bounds scan | Dialog/focus/label semantics and automated browser assertions |

## 6. Corrected quality-and-operations architecture

```text
source commit
  -> type/static gates
  -> unit + route tests
  -> recovery contract tests
       export current -> import fresh -> semantic equality
       malformed import -> original byte-identical
       WAL-active reset backup -> restorable equality
  -> production build
  -> immutable container artifact
       boot as non-root
       writable persistence readiness
       keyless browser smoke
       keyboard/accessibility smoke
  -> promote the SAME digest
       semver == package version
       commit SHA + SBOM/provenance
  -> authorized private-corpus evaluation (separate status channel)
  -> deployment + rollback drill
```

The key correction is artifact continuity: tests should progressively qualify
one build/container digest, not test source and later rebuild an untested image.
Recovery deserves its own non-compensable gate because no number of scoring or
route tests can compensate for a restore path that destroys the destination.

## 7. Prioritized correction register

| Priority | Work | Exit gate |
|---:|---|---|
| 0 | Make snapshot version authoritative and same-build round-trip | Current populated export imports with semantic equality |
| 0 | Make import validate/build/swap atomically | Every invalid/fault-injected import preserves original bytes/state |
| 0 | Decide and implement complete portable-session scope | Editor + canon included, or endpoint renamed and bounded honestly |
| 0 | Replace reset raw copy with online backup | WAL-active pre-reset backup restores exact pre-reset state |
| 1 | Isolate and gate HTTP/browser/container smokes | No repo data residue; PR fails on boot/journey/a11y regression |
| 1 | Make release versions/digests immutable | Same tested digest promoted; old semver cannot be overwritten |
| 1 | Fix dialog semantics and field labelling | Keyboard and screen-reader browser checks pass |
| 1 | Fix `llmReady` response parity | GET and successful POST conform to one parsed public-config schema |
| 2 | Unify upload cancellation and draft primary/mirror outcomes | Delayed-clear and second-write-failure tests pass |
| 2 | Compile server for production runtime | Final image contains runtime dependencies only and boots without `tsx` |
| 2 | Set editor-entry performance budgets | Representative mobile interaction and chunk budgets gate regressions |
| 3 | Reconcile architecture/README/route availability prose | Automated existence/state checks pass; no retired standing task remains |

## 8. Final quality judgment for this slice

| Dimension | Rating | Reason |
|---|---|---|
| Deterministic source regression | Strong | Broad fast suite, strict types, real route harness, explicit known failures |
| Recovery correctness | **Fail** | Same-build export/import rejection and destructive invalid import |
| Browser/accessibility assurance | Weak | Manual recorder exists; no semantic/asserting CI gate |
| Release integrity | Weak-to-moderate | Source gates repeat, but rebuilt mutable-tag artifact is not boot-tested |
| Runtime packaging | Moderate | Non-root and health probe are good; dev toolchain ships to production |
| Performance assurance | Moderate-low | Bounds/cache/lazy routes exist; editor chunk over budget and no user metric |
| API contract control | Moderate-low | Route validation is strong; response types are manually duplicated and drifted |
| Documentation truth | Moderate-low | Canonical intent is clear, but several live-state/recovery claims are stale |

**Bottom line:** software mechanics are substantially better tested than the
typical prototype, but the recovery and artifact boundaries are below the
quality of the deterministic core. Do not represent export/import as recovery,
or a version tag as an immutable rollback point, until QO-01 through QO-04 and
QO-08 have executable gates.
