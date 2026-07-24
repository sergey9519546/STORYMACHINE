# CHANGELOG

All notable changes to STORYMACHINE will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- Doctor analysis engine with ~8,917 rules
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
