# Phase 2 — Product, Claim, and Writer-Experience Findings

**Audit date:** 2026-07-14  
**Method:** implementation-to-interface trace, canonical-document comparison,
focused async/state review, and evidence-strength review.  
**Constraint:** this file records findings; it does not treat missing P0/P1
evidence as permission to change the product or score.

## Executive finding

STORYMACHINE contains a useful, unusually inspectable deterministic analysis
substrate, but the default experience packages that substrate as a coverage
judge before the repository has established that its scalar score or verdicts
track expert judgments on real screenplays. The highest-value correction is not
another detector. It is an evidence-honest product contract: observables and
receipts first; uncertain interpretations second; authoritative score,
percentile, and verdict claims withheld until the P1 benchmark supports them.

## Product and claim findings

### PX-01 — Authoritative score language exceeds the validation evidence

- **Severity:** Critical product-trust gate
- **Evidence status:** Directly verified
- **Evidence:** `src/components/scriptide/ScriptDoctorPanel.tsx:2448-2452`
  presents “Stronger than N% of the reference set”; the coverage surface also
  presents health, grade, and Pass/Consider/Recommend as primary outputs.
  `server/nvm/analyze/calibration/corpus.ts:1-76` defines that reference as 20
  original, hand-authored, ten-scene samples constrained to roughly 300–360
  words. `server/nvm/analyze/calibration/reference.ts:4-14` explicitly states
  that it is not an industry benchmark or real/copyrighted screenplay corpus.
  `ROADMAP.md:47-48` records that the rule channel has AUC about 0.076, the
  scene-scarcity term about 0.938, and no committed/runnable real-writing
  discrimination benchmark exists.
- **Silent-success mode:** the same code and same synthetic corpus reproduce
  the same number, so determinism and verification remain green while the
  construct being reproduced remains unvalidated.
- **Disposition:** supersede the writer-facing judge contract with
  evidence/receipt-first language in the P2 surface redesign. Until P1 passes,
  label the scalar and reference comparison as experimental synthetic
  calibration or withhold them from the default workflow. Do not retune the
  score under this audit.

### PX-02 — Rule-count marketing is strategically harmful, and the canonical 8,917 history is false

- **Severity:** Major
- **Evidence status:** Directly verified
- **Evidence:** `src/components/StartScreen.tsx:498-517` displays “3,216 rules,”
  which matches the generated, staleness-tested `docs/rulebook/README.md`. The
  contrary canonical narrative in `ROADMAP.md`, `NORTH_STAR.md`, and
  `ULTRAPLAN.md` says Wave 1191 expanded 3,216 to 8,917 with 5,701 generated
  permutations. Git disproves that history: Wave 1191 commit `a68a425` added six
  named detectors in two passes (863 inserted source/test lines), while the
  8,917 narrative appeared later in documentation commit `b1546c8` without the
  alleged pass-file expansion. No current 8,917-entry generated artifact was
  found. Regardless, neither 3,216 nor any larger count proves usefulness, and
  the measured rule-channel weakness makes quantity a poor value claim.
- **Disposition:** remove the number from product marketing when P2 is
  authorized. Lead with true capabilities such as keyless analysis, cited
  locations, deterministic recomputation, and versioned receipts.

### PX-03 — The default entrance still promotes a blocked secondary product

- **Severity:** Major
- **Evidence status:** Directly verified
- **Evidence:** `src/components/StartScreen.tsx:479-493` makes “Simulate if
  needed” step three and provides “Open simulation”; additional simulation
  entry points remain in the default entrance. `ROADMAP.md` sequences surface
  collapse to Doctor + Editor as P2, after P0/P1 gates.
- **Impact:** first-use comprehension and validation data are diluted across two
  different product theses: evidence-backed revision aid and OASIS simulation.
- **Disposition:** preserve OASIS as implemented capability but place it behind
  a clearly marked Labs route in the P2 design. P0 sessions should test one
  front-door job, not ask participants to infer the product boundary.

### PX-04 — Demo outputs can be mistaken for measured user-script results

- **Severity:** Major
- **Evidence status:** Directly verified in the StartScreen implementation
- **Evidence:** the entrance renders fixed sample coverage/health/count values
  as product proof before a writer analyzes a draft. The visual distinction
  between illustrative data and measured results is not strong enough for a
  high-trust evaluation product.
- **Disposition:** label every demo card “illustrative sample — not your
  script,” keep it visually separate from a real result, and never reuse a
  Pass/Consider/Recommend visual without an adjacent validity qualifier.

## Content and state integrity findings

### PX-05 — A slow dropped-file read can resurrect files after Clear All

- **Severity:** Major reliability defect
- **Evidence status:** Code-path proof; targeted regression test absent
- **Evidence:** `src/components/startscreen/StoryConfigForm.tsx:47-60` guards
  file-input reads with a component-local generation counter, and
  `:78-81` increments it on Clear All. The drop path lives in the parent:
  `src/components/StartScreen.tsx:113-122` awaits `readUploadedFiles()` and
  appends without observing that generation. Clear All therefore cannot
  invalidate a pending parent-owned drop read.
- **Reproduction:** begin a delayed drop read, invoke Clear All before the
  promise resolves, then resolve the read; the parent functional update
  re-appends the cleared files.
- **Disposition:** when implementation is authorized, move the upload
  generation/ownership contract to `StartScreen` (or one shared upload-state
  hook), route both picker and drop through it, and add a delayed-read
  regression test covering drop → Clear All → resolution.

### PX-06 — A failed legacy theme mirror is reported as total draft-save failure

- **Severity:** Major reliability/UX defect
- **Evidence status:** Code-path proof; negative fixture absent
- **Evidence:** `src/lib/scriptide-draft-store.ts:87-95` writes the authoritative
  versioned envelope and then the legacy `theme` key through short-circuiting
  `&&`. If the first write succeeds and the second fails, the function returns
  false even though the authoritative draft was saved. Callers such as
  `src/components/StartScreen.tsx` treat false as a blocked launch/save.
- **Impact:** a writer can be told that storage failed or be prevented from
  entering the editor after the content-bearing write succeeded. The error
  contract cannot distinguish primary data loss from a compatibility-mirror
  failure.
- **Disposition:** make the legacy mirror best-effort or return an explicit
  primary/mirror result. Test first-write failure and second-write-only failure
  separately.

### PX-07 — The opt-in HTTP journey writes persistent test state into `data/`

- **Severity:** Major test isolation defect
- **Evidence status:** Executed witness and code-path proof
- **Evidence:** `tests/e2e/journeys.test.ts:81-106` spawns the real server without
  setting `SESSION_DB_DIR`; journey 4 uses session id `e2e-journey-4`
  (`:167-198`). Running `RUN_E2E=1` created SQLite files under the normal
  ignored runtime data directory. Route-test helpers already set
  `SESSION_DB_DIR=':memory:'` before importing the server.
- **Disposition:** give the journey a unique temporary directory or in-memory
  store before server import, and remove it in `after`. Keep real persistence
  semantics in a separate temp-directory integration test.

### PX-07A — Session export cannot round-trip through the current importer

- **Severity:** Critical content-integrity defect
- **Evidence status:** Executed end-to-end witness
- **Evidence:** `Stage.exportSnapshot()` emits SQLite `user_version`
  (`server/engine/Stage.ts:1338-1341`); the current migration list ends at v13
  (`:94-99`, `:250-266`). The HTTP importer hard-codes
  `CURRENT_SCHEMA = 6` (`server/routes/config.ts:318-335`). A live in-memory
  server was initialized with one valid location and agent, exported with HTTP
  200 and `schema_version: 13`, then given that exact snapshot at the HTTP
  import route. Import returned HTTP 422:
  “Snapshot schema v13 is newer than server schema v6.”
- **Impact:** the product's own backup/export artifact is not a usable backup
  through its public restore path. This invalidates any current round-trip or
  resilience claim even though Stage-level unit tests pass.
- **Disposition:** repair before representing session export as recoverable.
  Derive one exported/importable snapshot contract from a single version source,
  and add a route-level export→import round-trip test using the current schema.

### PX-07B — A malformed accepted-version import destroys the live session first

- **Severity:** Critical destructive data-loss defect
- **Evidence status:** Executed end-to-end witness
- **Evidence:** the import schema validates `agents` and `locations` only as
  arrays of `unknown` (`server/lib/validation.ts:267-275`). After shallow checks,
  the route calls `destroySession(sid)` before `stage.importSnapshot(snap)`
  (`server/routes/config.ts:318-345`). In a live in-memory reproduction, a valid
  session contained one agent and one location. An accepted `schema_version: 6`
  snapshot with non-empty but malformed arrays caused SQLite `NOT NULL` failure
  and HTTP 500; a subsequent export of the original session contained zero
  agents and zero locations.
- **Impact:** an invalid import request can erase the user's current state while
  reporting only an internal error.
- **Disposition:** validate the complete snapshot before touching the live
  session, import into an isolated temporary Stage/store, and swap only after a
  successful transaction/verification. On any failure, preserve the original
  session byte-for-byte. Add negative route tests proving preservation.

## Accessibility and interface findings

### PX-08 — Core modals lack a complete dialog/focus contract

- **Severity:** Major accessibility gap
- **Evidence status:** Directly verified
- **Evidence:** the file preview at `src/components/StartScreen.tsx:751-794`
  has an overlay and close button but no `role='dialog'`, `aria-modal`, labelled
  relationship, Escape handler, focus trap, initial focus, or focus restoration.
  `src/components/SettingsPanel.tsx:613-629` has the same structural omissions.
  Script Doctor demonstrates a partial stronger pattern at
  `src/components/scriptide/ScriptDoctorPanel.tsx:2041-2057` with Escape and
  dialog semantics, but the modal contract is not shared.
- **Disposition:** define one tested modal primitive with semantics, labelled
  title, Escape, backdrop behavior, initial focus, focus containment, and focus
  restoration. Verify keyboard and screen-reader behavior in browser tests.

### PX-09 — No browser, accessibility, or visual regression suite protects the UI

- **Severity:** Major assurance gap
- **Evidence status:** Directly verified from package scripts, dependencies,
  tests, and CI
- **Evidence:** the “E2E” suite drives HTTP endpoints, not a browser. The
  repository has no Playwright/axe-style user-journey coverage and CI runs no
  accessibility or visual assertions.
- **Disposition:** add a small browser gate around the P0/P2 critical path:
  open/import draft, analyze, inspect a cited issue, select a revision action,
  preserve/reload content, export, and complete all modal operations by
  keyboard. This is test infrastructure, not evidence that writers value the
  workflow.

## Configuration and deployment-experience findings

### PX-10 — The visible AI Settings UI cannot authenticate to a token-protected server

- **Severity:** Major deployment UX defect
- **Evidence status:** Directly verified
- **Evidence:** `server/routes/config.ts:101-133` correctly requires
  `ADMIN_TOKEN` for remote writes and for every caller when the token is set.
  `src/components/SettingsPanel.tsx:560-595` sends neither an Authorization
  header nor an admin-token input for Test or Save. Thus browser Test/Save
  returns 401 in the documented token-protected posture even though the UI
  remains visible and editable.
- **Disposition:** choose and document one operator model. Preferred: make
  runtime provider configuration an operator-only deployment concern and hide
  or read-only-disable the browser controls when writes are unavailable. If a
  browser admin path is required, design a real authenticated admin session;
  do not persist a long-lived admin bearer token in ordinary client storage.

### PX-11 — Server logs the unsanitized provider-test error

- **Severity:** Major privacy/operations risk
- **Evidence status:** Directly verified; exploitability not asserted
- **Evidence:** `server/routes/config.ts:169-175` sanitizes the client-facing
  error but logs `raw`. Upstream/provider errors can include request context or
  credentials; the code has no guarantee that they do not.
- **Disposition:** log the sanitized message plus bounded error class/status
  metadata. Never log raw headers, URLs with user-info/query secrets, request
  bodies, or provider payloads. Add a regression test with bearer- and
  `sk-`-shaped sentinel text.

## Product strengths to preserve

1. **Keyless front door:** deterministic diagnosis boots without an AI key and
   keeps generative enhancements optional.
2. **Inspectable receipts:** issue locations, before/after verification,
   content hashes, version/build identity, and server-side recomputation are a
   stronger trust substrate than opaque prose-only coverage.
3. **Server-side key boundary:** provider keys are not serialized to clients;
   public configuration exposes readiness/boolean flags.
4. **Input and resource guards:** body schemas, route limiters, upload ceilings,
   SSRF defenses, and analyzer ceilings are extensively tested.
5. **Reduced-motion accommodation:** the entrance explicitly handles initial
   and mid-session reduced-motion preference.

These strengths support a reflective “draft MRI” product better than an
authoritative automated judge: show what was observed, where, under which
version, with uncertainty and user control; reserve scalar quality claims for
evidence that warrants them.

## P0-safe and P0-held dispositions

| Item | Current disposition |
|---|---|
| Correct stale audit/canonical documentation and write remediation specs | P0-safe |
| Run/repair test isolation needed for validation sessions | Potentially P0-safe maintenance; requires scoped plan and review |
| Fix confirmed data-loss/state-integrity defect | Allowed only if classified as current-session reliability blocker; otherwise hold |
| Change score formula, thresholds, rule catalog, percentile model, or verdict | Held for P1 real-writing evidence |
| Collapse UI to Doctor + Editor / Labs | Held for sequenced P2 implementation |
| Add new product capabilities | Held; demand evidence first |
