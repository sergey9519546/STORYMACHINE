---
type: measurement
updated: 2026-09-05
sources: [docs/scoring/IMPORT_COMPREHENSION_2026-07-11.md]
status: active
---

# Measurement — IMPORT_COMPREHENSION_2026-07-11

**Question:** why was the doctor NOT comprehending imported scripts?

**Verdict:** across the real corpus, `analyzeFountainText` reported **0
dialogue lines and 0 speaking characters** for Ratatouille, Mulan, Coco,
Frozen, Up, Zootopia, Toy Story 3, Pulp Fiction, Bee Movie — the whole
corpus. Every imported script scored as ~100% action with no dialogue, no
characters, no speaker attribution — the rich per-scene record schema
(dramaticTurn, revelation, relationshipShifts, powerHolder,
speakingCharacterCount, dialogueHighlights) was almost entirely dormant on
imports.

**Root cause:** real-world scripts (scraped PDFs, OCR) arrive
**double-spaced**, which the parser's line-spacing assumptions did not
handle — the same double-spacing defect [[Session - 2026-09-05 Review Batch]]'s
shape-guard lane later found defeating a security guard too.

## Sources

- `docs/scoring/IMPORT_COMPREHENSION_2026-07-11.md`
