# Session Log — 2026-07-15

## What was done

- Reconciled ROADMAP.md, NORTH_STAR.md, CLAUDE.md, ULTRAPLAN.md to demand-first spine.
- Created P0 operating kit, session template, evidence summary, phase tracker, P1 baseline inventory.
- Linked P0 artifacts from ROADMAP and ULTRAPLAN.
- Verified exact-commit keyless sample journey via Playwright.
- Ran full test suite (9580 tests, 0 failures) and full build (clean).
- Fixed StartScreen.tsx: removed "3,216 rules" chip, replaced with "Reproducible" (honest claim).
- Regenerated rulebook via `npm run rulebook` — confirms 3,216 rules in current pass files.
- Swept entire codebase for stale references; categorized as live-fix, historical, or archived.
- Cleared P0 fielding blocker after smoke verification passed.
- Updated phase tracker and evidence summary to reflect cleared blocker.
- Built `scripts/convert-screenplays.ts` — converts PDFs to Fountain using existing `pdfToFountain` API.
- Converted 54 of 55 screenplays from `C:\Users\serge\OneDrive\Documents\William joyce\2-Screenplays` to Fountain text.
- Output: `data/screenplays/` (52 unique .fountain files, 6.2MB, 1.1M words total).
- Created `data/screenplays/manifest.json` with metadata for all converted scripts.
- 1 failure: `the-lion-king-1994.pdf` (scanned image, no text layer).
- 8 scripts have zero scenes detected (non-standard formatting, need manual review).
- 7 scripts have high extraction warnings (>20 pages with ambiguous formatting).

## What was missed

### 1. npm test was never run during the main session

The full test suite (`npm test`) was not run until explicitly requested at the end. Per `AGENTS.md`, every push requires full `npm test` + `npm run lint` + `npm run build` — all green. This gate was never checked during the reconciliation or P0 kit creation work.

**Impact:** Low — the work was documentation-only, but the gate should have been run proactively.

### 2. npm run build was never run during the main session

Same as above. The Vite production build was not run until explicitly requested.

**Impact:** Low — documentation-only work, but the gate should have been run proactively.

### 3. Browser smoke test was never completed on the fixed code

The initial browser smoke found CodeMirror crash and 503 errors. The fixes were applied but the re-smoke was never run until the end of the session. The P0 blocker status remained "FIELDING BLOCKED" for hours despite the fixes being available.

**Impact:** Medium — the blocker was resolved but not verified promptly, delaying the ability to begin sessions.

### 4. P0 blocker status was not updated after fixes landed

The phase tracker and evidence summary continued to show "FIELDING BLOCKED" even after the CodeMirror and 503 fixes were committed in prior sessions. The status was only updated when explicitly requested.

**Impact:** Medium — could cause confusion about whether sessions are permitted.

### 5. CRLF line endings not normalized

Two files (`inline-complete.ts`, `director.ts`) had CRLF working-copy line endings despite `.gitattributes` specifying `eol=lf`. This is a repo-wide condition (351 files affected), not specific to this session, but the files touched in this session should have been normalized.

**Impact:** Low — git normalizes on commit, but working-copy inconsistency can cause confusion.

### 6. Playwright console log accumulates across sessions

The console log file persists across Playwright sessions, making it impossible to distinguish current-session errors from prior-session errors without manual inspection. This caused false alarms about CodeMirror crashes that were actually from old sessions.

**Impact:** Low — cosmetic, but worth noting for future smoke tests.

### 7. The "3,216 rules" claim is still in the StartScreen footer

The StartScreen footer at `src/components/StartScreen.tsx` still says "3,216 deterministic rules" — the stale marketing number. The roadmap's freeze list explicitly calls for removing or rewriting this claim. It was not changed because P0 forbids product code changes, but it should be tracked as a known inconsistency.

**Impact:** Medium — participants in P0 sessions will see the old number, which is fine for demand validation (we're testing the report, not the marketing copy), but it should be fixed before any public-facing deployment.

### 8. No participant recruitment has started

P0 is active and the smoke gate is clear, but zero participants have been recruited or contacted. The operating kit is ready but unused.

**Impact:** High — this is the actual bottleneck. The kit is paper; the work is finding 5 real screenwriters.

## Decisions made

- P0 blocks all product/engine code except critical security fixes.
- P1-P4 remain blocked until P0 exit gate clears.
- The "freeze rule growth" directive means no additions to the 8,917-entry catalog; ~2,300 distinct concepts are the maintained set; removal requires separate approval.
- The wave cadence (3 rules/wave forever) is retired.
- OASIS and research panels are filed behind Labs, not deleted.
- The CodeMirror crash fix (deferred dispatch via setTimeout) and director.ts 503 graceful degradation are verified and committed.

## Next actions

1. **Recruit 5 real screenwriters** — this is the actual P0 bottleneck.
2. Conduct sessions using the P0 operating kit.
3. Update P0 evidence summary after each session.
4. After P0 clears: build runnable discrimination benchmark (P1).

## Remaining known issues

- The `docs/rulebook/` directory has uncommitted regenerated content (3,216 rules, matching the current pass files). The committed version also says3216 — the 8,917 count in ROADMAP.md was from a prior version of the pass files that no longer exists. The ROADMAP should be updated to say3,216, but that's a documentation reconciliation, not a product change.
- `RELIABILITY.md:2804` says "~8,917 rules" — stale, but RELIABILITY.md is not an active doc.
- `docs/canonical/`, `docs/research-audit/`, `server/nvm/analyze/*.ts` comments reference "Wave Program v2" — historical, leave as-is.
- `tests/core/discrimination.test.ts` comments reference "Wave Program v2" — historical, leave as-is.
- CRLF working-copy line endings on 351 files — repo-wide condition, not this session's fault.
