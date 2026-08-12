# Main Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate verified StoryMachine work onto `main`, finish the authorized Craft-v2 integration correctly, and preserve non-mergeable experiments without exposing fabricated output.

**Architecture:** The existing dirty Craft-v2 checkout remains an immutable preservation source until its uncommitted work is separately classified. A clean `main` worktree receives only reviewed commits and TDD-backed repairs. Invalid P0 harness records, unbounded/placeholder Critic routes, and CI-gate-bypassing performance branches remain quarantined rather than becoming shipping behavior.

**Tech Stack:** Git worktrees, Node.js 22+, TypeScript, Express, Vitest/node test runner, StoryMachine deterministic analysis and convergence paths.

## Global Constraints

- `ROADMAP.md` is canonical; P0 remains fielding-authorized but not passed (0 valid human sessions).
- No user-facing score, certainty, consensus, shortcut, or analysis claim may be fabricated or unsupported.
- All shipping routes use the project's validation middleware and bounded Zod schemas.
- Do not stage or count the ignored automated P0 harness records as human research evidence.
- Do not merge any branch that weakens CI/security gates or adds generated output without a provenance receipt.
- Main is user-authorized for this consolidation; preserve every excluded artifact on a named quarantine branch or exact source reference.
- Run focused tests per task; run `npm run lint`, `npm test`, `npm run build`, `npm run honesty-audit`, and `npm run check-docs` before completion.

---

### Task 1: Reconcile local `main` with the truthful upstream baseline

**Files:**
- Modify only files selected by Git's merge result.
- Verify: `ROADMAP.md`, `docs/user-validation/PHASE_TRACKER.md`, `docs/user-validation/P0_EVIDENCE_SUMMARY.md`, and `docs/user-validation/sessions/.gitignore` behavior.

- [x] Merge `origin/main` into local `main` with a non-fast-forward merge, preserving the three local P1 diagnostic commits.
- [x] Resolve any conflict by retaining the upstream P0 truth correction: fielding authorized, zero valid documented sessions, no gate verdict.
- [x] Run `npm test` and `npm run check-docs`.
- [x] Commit the merge only after both commands pass.

### Task 2: Integrate reviewed P1 diagnostic documentation

**Files:**
- Create: `docs/p1-benchmark/SUSPENSE_DELTA_DEGENERACY_2026-08-05.md`

- [x] Cherry-pick `1aa2eea` only after Task 1 is green.
- [x] Run `npm run check-docs` and `npm run check-scoring-receipt`.
- [x] Preserve the document's scope as a measurement limitation; it must not claim a solved P1 gate.

### Task 3: Complete Craft-v2 scene-routing truthfully

**Files:**
- Create: `server/nvm/generate/craft-spec.ts` from the reviewed static prompt-routing slice.
- Modify: `server/nvm/generate/proof-spec.ts` and `server/nvm/converge/loop.ts`.
- Create: `tests/nvm/generate/craft-convergence.test.ts` and frozen no-context prompt fixtures.
- Modify: `tests/nvm/generate/craft-spec.test.ts`, `tests/nvm/generate/craft-guardrails.test.ts`, `.env.example`, and `docs/PATH_TO_DONE.md`.

- [x] Selectively bring in only the static scene-aware craft prompt routing from `9331cf9` and `d7244fa`; do not import the absent craft-KB builder/data or unused voice-feedback adapter.
- [x] Write failing captured-generator tests that prove opening and climax targets, Bible-prefixing, and the server kill switch reach the actual convergence preamble; include a no-context byte-identity fixture regression.
- [x] Make the minimal normal-path repair: rebuild the preamble with `buildSystemPreamble(specConstraints, state, target)`; do not alter scoring code, client configuration, or routes.
- [x] Correct documentation to claim only scene-dependent prompt differentiation, with no claim of shipped KB retrieval, a closed voice loop, or measured output-quality improvement.
- [x] Run `craft-spec.test.ts`, `craft-convergence.test.ts`, `craft-guardrails.test.ts`, `nvm-converge-select.test.ts`, `npm run check-scoring-receipt`, `npm run lint`, `npm test`, and `npm run build`.

### Task 4: Evaluate remaining branch work without weakening main

**Files:**
- Create: `docs/audits/2026-08-08-main-consolidation.md`

- [x] Record each branch/worktree disposition: integrated, duplicate, research-only, unsafe, or deferred pending evidence.
- [x] Exclude the Reagan scoring patch until it has a new real-corpus receipt and manifest re-lock.
- [x] Exclude all performance branches that weaken dependency-review CI; do not copy their workflow changes.
- [x] Preserve the source commit/ref for every excluded item so no work is lost.

### Task 5: Quarantine the current dirty prototype without shipping false behavior

**Files:**
- Source only: the existing dirty Craft-v2 worktree and ignored P0 harness artifacts.
- Create: a named non-shipping Git branch or archive record holding the nonignored dirty prototype.

- [x] Preserve the dirty nonignored Critic/OASIS/analyzer/UI files on a clearly named quarantine branch.
- [x] Do not add ignored P0-S01 through P0-S05 harness records to Git; leave them uncounted and document why.
- [x] Do not merge placeholder Critic routes, fake Room values, unsupported labels, or unimplemented shortcut claims into `main`.
- [x] Add the source branch/ref and reasons to the consolidation audit.

### Task 6: Full gate and handoff

**Files:**
- Modify: `docs/DECISION_LOG.md` only if a durable decision is not already captured by the consolidation audit.

- [x] Run `git diff --check`, `npm run lint`, `npm test`, `npm run build`, `npm run honesty-audit`, and `npm run check-docs` on final code-bearing `main` commit `40d58949f80210e6a61143bacc51a6d088447f6c`; `npm run check-scoring-receipt`, `node scripts/smoke-p0-live-flow.mjs`, `node scripts/verify-focus-traps.mjs` (14/14), and `node scripts/verify-p2-p3-surfaces.mjs` (94/94) also passed.
- [x] Record the exact main commit, test results, integrated commits, and quarantined sources in the consolidation audit. Expected keyless-mode Gemini rewrite fallback logs appeared during tests, and Vite warned that ScriptIDE exceeds 500 kB during the build.
- [x] Leave the human-only next task explicit: conduct and document five complete P0 sessions; do not manufacture demand evidence. This is a code/repository verification gate only; it does not establish P0 demand validation, P1 score validity, user retention, release or production readiness, or a public launch.
