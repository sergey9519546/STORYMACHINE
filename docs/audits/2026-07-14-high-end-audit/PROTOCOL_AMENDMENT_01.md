# Protocol Amendment 01 — Rule-Catalog Ground Truth

**Date:** 2026-07-14  
**Trigger:** Phase 2 repository/history reconstruction  
**Changes the research question or decision gates:** No  
**Corrects a frozen Phase 1 factual assumption:** Yes

## Prior assumption

The audit design and Phase 1 scope inherited the canonical-document statement
that the current generated rule catalog contained 8,917 entries, including a
5,701-entry Wave 1191 bulk expansion built from seven templates.

## New direct evidence

1. `docs/rulebook/README.md` is generated from live pass files and protected by
   staleness tests. It reports **3,216 distinct pass-scoped rules**.
2. Git commit `a68a425` is the actual Wave 1191 change. Its diff adds six named
   detectors to `causality.ts` and `structure.ts` plus tests; it contains 863
   inserted lines across four files, not a 5,701-entry all-pass expansion.
3. The 8,917/5,701 narrative appears in later commit `b1546c8`, whose pass-file
   changes do not contain the alleged expansion.
4. No generated 8,917-entry artifact or historical pass-file commit supporting
   that arithmetic was found in the repository evidence reviewed to date.

## Corrected audit assumption

The current, code-derived catalog count is 3,216 pass-scoped rule constants.
The exact number of genuinely distinct concepts requires a separate semantic
deduplication method and is **unknown**; the inherited estimate of about 2,300
is not treated as measured fact. The 8,917 total and 5,701 Wave 1191 expansion
are classified as **disproven repository claims** unless new primary evidence
is produced.

## Effect on the audit

- The freeze on adding catalog entries still governs because the active roadmap
  intends to stop rule growth and the measured scoring limitation is independent
  of the mistaken count.
- Product copy that leads with “3,216 rules” remains a weak and potentially
  misleading value proposition, but it is not stale relative to the live
  generated rulebook.
- Any line-count, cast-count, maintenance-cost, or concept-count conclusion will
  be recomputed from current source rather than copied from canonical prose.
- The final supersession matrix must correct `ROADMAP.md`, `NORTH_STAR.md`,
  `ULTRAPLAN.md`, the audit design's inherited count, and downstream documents
  that repeated the false history.

