# CHANGELOG

All notable changes to STORYMACHINE will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### 2026-08-05 — Security: ip-address CVE cluster patched (rate-limiter path)

#### Fixed
- **Bumped `ip-address` 10.2.0 → 10.4.0**, closing three HIGH-severity advisories
  (`GHSA-mwp4-54f8-5fhr`, `GHSA-4xrf-jv44-h6hh`, `GHSA-22jq-vg5j-6vgg`) that
  were inside the vulnerable advisory range (`<= 10.3.0`). `ip-address` is a
  transitive runtime dependency of `express-rate-limit`, and
  express-rate-limit's default `ipKeyGenerator` feeds every rate-limited
  request through `new Address6(...)` / `Address6.to4()`, so a parser
  misclassification on the rate-limiter path could let an attacker mint
  distinct-looking keys for the same source and evade the per-IP limit
  (and, under `app.set('trust proxy')`, evade it via spoofed
  `X-Forwarded-For`). The bump is within express-rate-limit@8.5.2's declared
  `^10.2.0` range, so no upstream API change. Verified the specific primitive
  — `new Address4('010.0.0.1')` decimal-decoded `'010'` as `10` pre-fix
  (the leading-zero-octet SSRF/trust-bypass), and now throws
  "IPv4 addresses can't have leading zeroes" post-fix.
- Added `tests/routes/ip-address-cve.test.ts` as a regression guard: pins
  the version floor, asserts the leading-zero-octet primitive stays closed,
  and asserts `express-rate-limit.ipKeyGenerator` still keys legitimate
  IPv4/IPv6/IPv4-mapped addresses correctly. Observed red against the
  vulnerable `10.2.0`, green against `10.4.0`.

#### Verification
- `npm ci` reconciles on-disk `node_modules/ip-address` to 10.4.0 (the
  lockfile was updated by `npm audit fix` but `node_modules` required a
  clean reinstall to replace the files — a plain `npm audit fix` left the
  vulnerable 10.2.0 files on disk while reporting success).
- `npm test` route suite: 458/458 pass. `npm run lint` (tsc --noEmit):
  clean. `npm run test:metamorphic`: 6/6 hard invariants pass.
  Pre-existing corpus-gated failures (`truth-extraction`,
  `layoutScreenplay` density band, locked-files) are unchanged — they
  require the local 761-script `REAL_SCRIPT_CORPUS_DIR` not present in
  this environment, and fail identically on the clean tree.

### 2026-07-29 — P1 corpus expansion + discrimination baseline, P2 surface collapse, P3 shareable report

#### Added
- **P1 corpus expanded 48 → 761 produced screenplays** (89 original + 684
  crawled from IMSDb/DailyScript across 14 genres), converted to canonical
  Fountain (HTML/TXT/MD/PDF → clean Fountain via a best-of-three repair
  strategy), content-hash deduplicated (225 duplicate groups collapsed), and
  split 60/20/20 train/val/test (seed 42, hash-locked test set). See
  `docs/p1-benchmark/CORPUS_EXPANSION_2026-07-29.md`.
- **First real-writing discrimination AUC harness**
  (`scripts/measure-auc-split.mjs`), measuring four mechanical degradations
  (SCENE_SHUFFLE, MIDPOINT_DROP, CLIMAX_RELOCATE, DIALOGUE_FLATTEN) with
  10,000x-bootstrap confidence intervals per train/val/test partition. See
  `docs/p1-benchmark/DISCRIMINATION_BASELINE_2026-07-29.md`.
- **Root-cause diagnosis of the structural-discrimination gap**: every field
  in `ScreenplaySceneRecord` is derived from that scene's own text, so
  reordering scenes preserves every field and no formula on those fields can
  detect it — CLIMAX_RELOCATE AUC sits at chance (~0.48-0.54) for this
  reason. Documented in
  `docs/p1-benchmark/STRUCTURAL_SIGNAL_DIAGNOSIS_2026-07-29.md` as
  analyzer-layer work, not a formula-tuning problem.
- **Dialogue-diversity bounded deduction** in `server/nvm/analyze/doctor.ts`
  (reads `uniqueDialogueRatio`, `meanDialogueWords`, `dialogueVocabRichness`
  off `analysis.records[].dialogueHighlights`, capped at 18 points, gated to
  scenes with >=10 dialogue lines) — raised DIALOGUE_FLATTEN test AUC from
  0.54 (chance, on the expanded live-action corpus) to **0.990**, and the
  four-channel pooled test AUC from 0.627 to **0.754**. Fires 0/30 on
  unmodified real scripts.
- **P2 surface collapse**: OASIS and the research panels gated behind a
  Labs flag (`src/lib/feature-flags.ts`, localStorage `sm_labs_enabled`,
  default off). The default journey is now Doctor + Editor only —
  `Toolbar.tsx` Studio/Director/Slate tool slots gated behind Labs, with a
  Settings entry added to the overflow menu so the Labs toggle stays
  reachable from the default surface.
- **P3 shareable, verifiable coverage report**: every export now carries a
  verify block with the full 64-hex script-text hash, the claimed
  health/verdict/totalIssues, and instructions pointing at a new `#verify`
  route (`src/components/VerifyReport.tsx`) that re-derives the score from
  pasted script text — reachable from the start screen without creating a
  script. `POST /api/events` instruments a closed vocabulary
  (`doctor_run`, `export_report`, `first_report`, `verify_run`); `GET
  /api/events/summary` reports `exportRate` and `avgTimeToFirstReportMs`
  (in-memory, per-process counters, `null` before any run).

#### Changed
- Corrected the frozen rule-count figure across canonical docs from the
  disproven "8,917" to the machine-counted **3,216**, and raised the P1
  benchmark discrimination gate from AUC >= 0.70 to **>= 0.80** (with
  shuffle-drop and act-swap secondary thresholds added).

### 2026-08-02 — Fixed

- **Coverage report page estimate was 2-3x low.** It counted non-blank
  Fountain *source* lines at ~55/page, but one action paragraph or speech is
  one source line however many rendered lines it occupies. Now delegates to
  the real element-aware paginator (`src/lib/screenplay-layout.ts`) so the
  report and editor can no longer disagree about a script's length.
  Presentational only — no score, threshold, or verdict reads this value.

### 2026-08-03 — Scene-number migration, logline fix, corpus de-identification, security audit

#### Fixed
- **Off-by-one scene numbers throughout the coverage report.** Scene records
  carry a 0-based `sceneIdx`; every writer-facing "Scene N" label had been
  printing it raw, so labels pointed one scene early (proven by the shipped
  sample report contradicting its own slug). Migrated all issue-label
  emitters (dialogue, voice, originality, rhythm, structure, causality,
  payoff, pacing, relationship-arc, conflict, belief, theme, intention,
  character-arc passes — ~250+ sites total), the three consumers that decode
  "Scene N" back into an index (`locate.ts`, `doctor.ts` heatmap,
  `cluster.ts`), research-panel displays, room critiques, proof receipts,
  and project exports, all to 1-based labels end to end. Added
  `tests/core/scene-label-consistency.test.ts` as a tripwire that runs the
  real pipeline and cross-checks every emitted label against its slug's true
  1-based position.
- **Logline generator spliced raw multi-sentence dialogue** into the
  "`<protagonist> must face ___`" template when its two structured
  obstacle-tiers didn't apply, producing an ungrammatical, misattributed
  logline. The fallback tier now quotes and frames the extracted text as a
  single sentence instead of using it as-is. Presentational only — the
  sample's scoring facts (health/verdict/sceneCount/contentHash) are
  unchanged.
- CoverageSummary (the first request a new visitor's browser makes) had no
  request timeout, unlike its sibling ScriptDoctorPanel — a stalled
  connection left "Reading the draft…" showing indefinitely. Added the same
  `AbortController` watchdog, distinguishing a real timeout from a
  supersede/teardown abort.
- **Title-page data loss on reload.** `ScriptIDE.tsx` initialized
  title/author/contact to placeholders instead of reading them from the
  draft, unlike `snapshots` and `researchNotes` three lines away, so a
  writer's title-page metadata silently vanished on reload. The persistence
  effect's dependency array also omitted `titlePage`, so a title-only edit
  never triggered a save. Draft schema bumped 1→2 with a migration fixture
  covering a draft with no `titlePage` key at all.

#### Added
- **Corpus de-identification tooling**
  (`scripts/migrate-corpus-ids.mjs`, `scripts/verify-corpus-layout.mjs`,
  `scripts/deidentify-outputs.mjs`): opaque content-derived `SM-<hash>` ids
  for the private research corpus's manifests and evidence CSVs, replacing
  the literal screenplay titles/filenames the public repo had been
  enumerating (~6,000 title references found across 21 tracked files, plus
  8 probe scripts that hardcoded corpus paths). De-identification only —
  does not change the corpus's copyright or redistribution status. Verified
  end-to-end against 6 CC0 reference scripts; not yet run against the real
  761-script corpus (local-only, absent from the build container). See
  `docs/p1-benchmark/CORPUS_IDENTIFICATION.md`.
- **P1 structural-signal falsification screen**
  (`scripts/probe-interscene-candidates.mjs`): a cheap pre-implementation
  test of five candidate order-sensitive signals (scene-to-scene intensity
  delta, forward-reference density, local-context emotional shift,
  setup-before-payoff ordering, question-answer latency) against 26 scripts,
  run before building any of them so a dead-end costs an hour instead of a
  session. Verdicts recorded in
  `docs/p1-benchmark/STRUCTURAL_SIGNAL_SCREEN_2026-08-03.md`; none passed
  cleanly enough to implement.
- Adversarially-verified detector-defect ledger from a claim-by-claim truth
  audit of the sample coverage report against the script text and the
  engine's own records. See `docs/p1-benchmark/DETECTOR_DEFECTS_2026-08-03.md`.

#### Security
- **Persona registry hijack.** `userPersonas` is a process-global map and
  persona lookup resolved it before builtins, so an unauthenticated POST
  could register a persona under a builtin id — including `default`, which
  every caller gets implicitly — replacing the model's system preamble for
  every user of the deployment until restart. Builtin ids are now refused
  (409) and the registry is capped at 64 entries (the route is anonymous at
  120/min, so this was also an unbounded-memory path).
- **Two LLM fan-out routes were on the wrong rate limiter.** `/api/turn`
  (up to 4 `generateContent` calls) and `/api/simulate-to-fountain`
  (multiplies that by up to 10 turns, ~40 provider calls per request) were
  both on `gameLimiter` (120/min) while the single-call `/api/game/interview`
  was on the stricter `aiLimiter` (20/min) — the heavier routes had the
  weaker limit. Both moved to `aiLimiter`, correcting a code comment that
  had claimed a nonexistent "per-turn call budget" justified the old
  placement.
- `ai_config_test_failed` logged the **raw** upstream provider error (only
  the already-redacted copy went to the HTTP response), so a provider error
  echoing a bearer token or `sk-` key would write it verbatim into logs. CI's
  no-`console.*` grep cannot catch this — it is a logger call.
- `GET /api/ai-config` had no rate limiter — the one route in the file
  without one.
- **Request-scoped AI budget** (`server/lib/ai-budget.ts`): a per-request
  attempt ceiling plus wall-clock deadline for provider fan-out, wired into
  `/api/turn`, `/api/run-room`, `/api/run-scene`, `/api/simulate-to-fountain`,
  and `/api/game/interview`. This is the safeguard a comment in `game.ts` had
  claimed already existed ("bounded by the engine's own per-turn call
  budget") — no such budget existed anywhere in the tree, which is also why
  the two fan-out routes above ended up on the wrong rate limiter. For routes
  whose LLM calls happen deep inside `server/engine` with no injectable seam,
  `maxAttempts` is informational and the deadline is what is actually
  enforced; every limit is env-overridable so tests can drive a timeout down
  and prove the wiring cuts a slow request off.
- **Centralized error sanitization** (`server/lib/safe-error.ts`): one
  sanitizer for error text reaching either an HTTP response or the logger,
  replacing inline redaction that had been applied to one sink and forgotten
  on the other — which is how the raw-upstream-error log line above survived
  review (CI's no-`console.*` grep cannot see logger-based leaks).

#### Documentation
- Corrected three more stale/inaccurate claims found by a nine-agent,
  whole-repository audit: CLAUDE.md had called the AUC-24 >= 0.622 real-corpus
  floor "the enforced" floor when CI never sets `REAL_SCRIPT_CORPUS_DIR` (the
  assertion SKIPS on every run); AGENTS.md still said rules are "frozen at
  8,917" — the figure this project spent an earlier audit disproving,
  now corrected to 3,216, with the disproven figure kept as a labeled
  historical note rather than silently rewritten (same treatment applied to
  this changelog's own 1.0.0 entry below); NORTH_STAR.md had the inverted
  rule-channel explanation backwards (rules fire LESS, not MORE, on
  shuffle-drop-degraded scripts, because the degradation also removes about
  a third of the scenes, which makes the degraded script look healthier by
  issue count).
- Disambiguated the three non-comparable AUC statistics referenced across
  `CLAUDE.md`/`ROADMAP.md`/docs/p1-benchmark: the enforced AUC-24 >= 0.622
  ratchet (24-script subset, one combined shuffle+drop degradation), the
  761-script P1 baseline's separate SCENE_SHUFFLE/MIDPOINT_DROP figures
  (153-script hash-locked test partition, >= 0.80 gate), and
  `P1_STATUS_2026-07-29.md`'s train-only interim numbers — marked the
  latter superseded for results (its diagnosis remains current).

### Added - 2026-07-15

#### AI-Slop Detection Enhancement
- **Enhanced anti-slop.ts with 64 Tier 1 AI patterns** from avoid-ai-writing skill
  - 9 generic emotion patterns (validated baseline) → 83 total patterns
  - Pattern library organized into 8 core categories
  - Category breakdown reporting (users see "3 copula-avoidance, 2 inflated-staging" not just "5 issues")
  - Severity levels (high/medium/low) for each pattern
  - Honest validation status (`validated: false` for new patterns pending P1 corpus validation)
  - Evidence-based detection with line numbers
  - New `screenplayAIMarkers` field in `SlopReport` interface

- **Created anti-slop-ultra.ts ultra-expansion module**
  - 137 additional patterns across 10 categories
  - Foundation for expansion to 220+ patterns total
  - Extensible architecture for adding more categories
  - Separate module allows validation and promotion to core

- **Comprehensive test coverage**
  - 22 new tests for screenplay AI markers (55 total tests, all passing)
  - Positive fixtures for each of 8 categories
  - Negative fixtures (clean screenplay samples)
  - Category counting accuracy tests
  - Backward compatibility tests maintained

#### Documentation Quality Tools
- **Added check-docs-quality.ts script** for scanning markdown files
  - Detects 25 high-confidence AI writing patterns in documentation
  - Reports severity levels (high/medium/low) with replacement suggestions
  - Non-blocking by default (warnings only)
  - Strict mode available (`--strict` flag) for CI enforcement
  - Scans all .md files or specific files passed as arguments

- **Git pre-commit hooks for documentation quality**
  - Automatic scanning of staged markdown files
  - Blocks commits with high-severity AI patterns
  - Can bypass with `git commit --no-verify` when needed
  - Installation: `npm run setup-hooks` (one-time setup)

- **New npm scripts**
  - `npm run check-docs` - Scan all documentation for AI patterns
  - `npm run check-docs:strict` - Block on high-severity patterns
  - `npm run setup-hooks` - Install git pre-commit hooks
  - `npm run validate` - Run all checks (lint + check-docs + test)

#### Design & Process Improvements
- **Created storymachine-phase-design skill** for phase-gate workflow
  - Enforces design-before-implementation at P0→P1→P2→P3→P4 transitions
  - Structured design document generation
  - 2-3 alternative approach exploration
  - Explicit user approval gate before implementation begins
  - Phase-specific guidance for each STORYMACHINE phase

- **Architecture Decision Records (ADR) system**
  - ADR template (`docs/adr/template.md`)
  - ADR process documentation (`docs/adr/README.md`)
  - ADR-001: Anti-slop pattern library architecture (complete)
  - Documented in `AGENTS.md` for project workflow integration

#### P1 Benchmark Infrastructure
- **Complete P1 benchmark design documentation**
  - Train/validation/test split strategy (60/20/20)
  - Pre-registration protocol template
  - Screenplay sources research (CC/PD licensing analysis)
  - Benchmark manifest JSON schema
  - Stratification strategy for quality/genre/length
  - Held-out test set protection mechanism (SHA-256 hashing)

- **P0 User Validation Infrastructure**
  - Recruitment outreach templates (6 templates for different channels)
  - Session recording framework with consent forms
  - Recruitment tracker for managing 5+ validation sessions
  - Documentation protocol for capturing user feedback

### Changed - 2026-07-15
- **Updated README.md** with new npm scripts and tools documentation
- **Updated AGENTS.md** with ADR process and architectural decision workflow
- **Updated package.json** with new validation scripts

### Technical Details
- **Pattern Detection Performance:** ~2-5ms per script (220 regex matches on ~10k lines)
- **Test Suite:** 55/55 passing (100% success rate)
- **Files Modified:** 3 core files
- **Files Created:** 16 new files (~4,000 lines of code + documentation)
- **Backward Compatibility:** All existing tests passing, no breaking changes

### Validation Status
- ✅ Core 83 patterns: Detection working, tests passing
- ⚠️ Ultra 137 patterns: **UNVALIDATED** - marked as `validated: false`
- 📊 P1 corpus validation required: Target <0.1 false positives per film
- 🎯 Post-P1: Tune weights, remove low-signal patterns, mark validated

### Related Documentation
- `ADR-001-anti-slop-pattern-library.md` - Architecture decisions
- `docs/p1-benchmark/` - Complete P1 benchmark specifications
- `docs/user-validation/` - P0 validation infrastructure
- `.zcode/skills/storymachine-phase-design/` - Design workflow skill

---

## [1.0.0] - [Previous Release Date]

### Initial Release
- Story Machine multi-agent narrative simulation
- Script IDE with Fountain screenplay authoring
- Doctor analysis engine with a large generated rule catalog (this entry
  originally said "~8,917 rules"; that count was DISPROVEN by the 2026-07-14
  audit — the live catalog is 3,216 pass-scoped constants. Left in place as a
  historical entry with the correction attached rather than silently rewritten.)
- Deterministic coverage reports
- [Previous features documented here]

---

## Guidelines for Future Entries

### Format
```markdown
## [Version] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes to existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security updates
```

### Version Numbering
- **Major (X.0.0):** Breaking changes, major feature additions
- **Minor (x.Y.0):** New features, backward compatible
- **Patch (x.y.Z):** Bug fixes, minor improvements

### Commit Messages
Reference this changelog in commit messages:
- `feat: add anti-slop pattern detection (see CHANGELOG)`
- `docs: update README with new npm scripts (see CHANGELOG)`
- `fix: correct pattern matching in anti-slop.ts (see CHANGELOG)`
