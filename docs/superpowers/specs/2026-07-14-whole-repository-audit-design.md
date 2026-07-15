# Whole-Repository Audit and Remediation Design

**Date:** 2026-07-14
**Status:** Approved design; implementation planning pending
**Repository:** STORYMACHINE

## Purpose

Perform an evidence-driven audit of the entire first-party repository, fix every
confirmed defect that can be repaired without violating the active roadmap, and
produce an explicit disposition for every issue that cannot be fixed in this
run. The audit must be deep enough to find cross-file and runtime defects that a
commit-local diff review misses, while avoiding speculative refactors and rule
catalog growth.

The audit is a maintenance and truth-finding exercise. It does not authorize a
new feature wave, scoring retune, rule addition, broad generated-code cleanup,
or promotion of filed backlog work.

## Governing Constraints

- `ROADMAP.md` remains the sequencing authority. P0 validation blocks new
  product and engine work; critical security repairs remain allowed. Findings
  that require a product, engine, or scoring behavior change outside that
  exception receive a documented remediation and are held for explicit
  authorization.
- No entries may be added to the 8,917-entry generated rule catalog.
- Scoring findings require runnable discrimination evidence on real writing.
  Synthetic fire/no-fire coverage is not sufficient evidence for a retune.
- The server must continue to boot and provide deterministic analysis without
  an AI key.
- API keys remain server-side. AI routes use `aiLimiter`; other routes use at
  least `gameLimiter`; every request body is zod-validated.
- No new `console.*` calls may appear under `server/**`.
- Existing user changes in the worktree are preserved. Audit work does not
  rewrite, stage, or commit unrelated files.
- OneDrive-safe editing and verification practices apply.

## Scope

The audit covers all first-party source, tests, configuration, scripts,
deployment assets, and active documentation in the repository. Dependency and
generated output directories are not reviewed line by line; their manifests,
generators, security exposure, reproducibility, and runtime integration are in
scope. The generated pass catalog is reviewed through its seven template
functions, invariants, consumers, representative samples, and existing
measurement evidence rather than treating thousands of mechanical
permutations as independent designs.

Historical and filed-backlog documents are checked for dangerous active
references or contradictions but are not revived as implementation demand.

## Audit Architecture

### 1. Baseline and topology

Establish the exact branch, worktree state, recent integration history, runtime
versions, package scripts, active roadmap phase, and current test/build health.
Build a repository topology that maps entry points, trust boundaries, storage
domains, route registration, AI-provider paths, scoring flows, exports, and
high-risk asynchronous UI flows. Record skipped and environment-gated tests as
evidence gaps rather than counting them as passes.

### 2. Security and trust boundaries

Trace untrusted input from every HTTP, WebSocket, upload, environment, import,
and provider-configuration boundary to its sinks. Verify authentication,
authorization, limiter choice, zod coverage, SSRF and redirect controls,
prompt-injection boundaries, secret serialization, log hygiene, HTML/CSV
escaping, file and scene ceilings, collaboration ownership, metrics exposure,
proxy behavior, CSP, container privilege, and dependency advisories.

Security findings require a concrete attack path or a violated invariant. A
scanner warning without a reachable production path is evidence to investigate,
not automatically a defect.

### 3. Data integrity and concurrency

Audit ScriptIDE drafts, sessions, backups, uploads, imports, exports, snapshots,
optimistic concurrency, content hashes, and verification receipts. Exercise
partial storage failure, quota/private-mode behavior, slow responses, unmounts,
StrictMode remounts, concurrent tabs, edits during in-flight saves, stale
revisions, clear/remove during reads, malformed legacy state, server restarts,
and empty-but-valid values.

The primary invariant is that an acknowledged user action must not silently
lose, resurrect, mislabel, or overwrite user content.

### 4. Server and API correctness

Enumerate all registered endpoints and compare them with limiter assignments,
validation schemas, error translation, response contracts, and tests. Verify
keyless behavior, abort and timeout handling, resource ceilings, cache bounds,
session isolation, persistence semantics, and degraded provider behavior.
Live-smoke representative endpoints against a keyless server.

### 5. Frontend correctness and accessibility

Trace state ownership and asynchronous effects through the default Doctor +
Editor journey and secondary Labs surfaces. Inspect stale closures, missing
cleanup, out-of-order completions, state updates after unmount, unstable keys,
controlled-input mistakes, dead controls, focus/keyboard behavior, accessible
names, error recovery, code-split failures, and responsive overflow. Runtime
checks target concrete risks found in code; visual polish without a functional
defect is not remediation scope.

### 6. Scoring validity and deterministic analysis

Audit data provenance, split discipline, fixture licensing metadata, leakage,
skipped real-corpus gates, uncertainty reporting, formula inputs, bounded
structural deductions, calibration assumptions, shuffle-drop and act-swap
guards, deterministic output, and keyless parity. Existing claims must be
distinguished from runnable evidence. No formula or threshold changes occur
without the real-writing requirements in `ROADMAP.md` and `AGENTS.md`.

### 7. Delivery, operations, and documentation truth

Compare local scripts with CI, Docker, deployment instructions, environment
documentation, backup/restore procedures, build outputs, and release claims.
Check that active documentation describes current behavior and that stale rule
count, authentication, keyless, or validation claims cannot mislead operators
or users.

## Evidence and Severity Standard

Every finding must include:

1. The violated requirement or invariant.
2. Exact file and line evidence.
3. A reproduction, failing test, exploit path, or deterministic reasoning chain.
4. User or operational impact.
5. A concrete remediation and verification method.

Severity is impact-based:

- **Critical:** exploitable security boundary failure, likely irreversible data
  loss, secret exposure, remote code execution, authentication bypass, or a
  broken primary workflow with no safe recovery.
- **Important:** reliable correctness failure, content resurrection/overwrite,
  serious authorization or availability weakness, false product verdict, or a
  test gap masking a demonstrated defect.
- **Minor:** bounded robustness, accessibility, documentation, or maintainability
  defect that does not compromise the primary workflow.

Speculation, general cleanup opportunities, and preferences are not findings.

## Remediation Workflow

For each confirmed issue, first add the smallest failing regression test or
executable witness. Implement the narrowest fix that restores the invariant,
then run the focused test and inspect the diff. Related findings may share one
fix only when they have the same root cause and verification surface.

Critical security fixes are implemented immediately under the roadmap's stated
exception. Other product, engine, or scoring changes that conflict with the P0
freeze are recorded with their evidence and proposed patch boundary, then held
for explicit authorization. Documentation, test-truth, CI, and operational
repairs may proceed when they do not alter product or scoring behavior.

The existing reliability findings are part of the audit baseline:

- Clear All does not invalidate a pending drag-and-drop read because upload
  generation ownership is split between `StartScreen` and `StoryConfigForm`.
- The versioned draft and legacy theme mirror are two physical writes, so the
  second write can fail after the authoritative draft succeeds while callers
  report total failure.

They must be revalidated against the current branch and assigned the same
evidence, severity, roadmap disposition, and regression standard as newly found
issues.

## Verification

Verification proceeds from narrow to broad:

1. Focused tests for each changed unit and its integration boundary.
2. Route validation/limiter completeness and server console checks.
3. Keyless live smoke of affected server paths.
4. `npm run lint`.
5. Full `npm test` with zero failures; skipped/env-gated tests are reported.
6. `npm run build`.
7. Targeted browser/runtime checks for affected user journeys.
8. Dependency audit with production reachability adjudication.

No item is marked fixed solely because compilation passes or a synthetic unit
fixture fires.

## Deliverables and Exit Criteria

The run produces:

- A repository topology and audit coverage ledger.
- A severity-ranked findings report with evidence and dispositions.
- Regression tests and narrow fixes for every authorized confirmed defect.
- A deferred-findings section naming the exact roadmap or external blocker.
- Final verification output, including failures, skips, environment gates, and
  keyless smoke evidence.

The audit is complete when every first-party area has a recorded review status,
every confirmed finding has been fixed or explicitly deferred for a named
constraint, all authorized fixes pass their focused verification, and the full
lint/test/build gates are green. Audit completeness does not imply that the P0
user-validation gate or P1 real-writing evidence gate has been satisfied.
