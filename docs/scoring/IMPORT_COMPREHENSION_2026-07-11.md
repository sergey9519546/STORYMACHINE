# Imported-script comprehension — screenplay normalizer (2026-07-11B)

**Problem discovered:** the doctor was NOT comprehending imported scripts. Across
the real corpus, `analyzeFountainText` reported **0 dialogue lines and 0 speaking
characters** for Ratatouille, Mulan, Coco, Frozen, Up, Zootopia, Toy Story 3,
Pulp Fiction, Bee Movie, … — the whole corpus. Every imported script was being
scored as ~100% action with no dialogue, no characters, no speaker attribution,
and therefore no real dialogue/voice/relationship/power comprehension. The rich
per-scene record schema (dramaticTurn, revelation, relationshipShifts, powerHolder,
speakingCharacterCount, dialogueHighlights) was almost entirely dormant on imports.

**Root cause:** real-world scripts (scraped PDFs, OCR) arrive **double-spaced** (a
blank line after every line, including character cues) with **hard-wrapped**
dialogue. Fountain requires a cue to be immediately followed by its dialogue —
so `parseFountain` typed every cue as `action`, collapsing all dialogue into
action. Different scripts also use different scene-heading conventions
(INT/EXT vs `.`-forced headings), which the importer handled inconsistently.

## Phase 1 — LANDED: `server/nvm/analyze/screenplay-normalizer.ts` (8 tests)

`normalizeScreenplay(raw): string` reconstructs clean Fountain from messy input
so the engine's EXISTING deep parser comes alive — no new comprehension logic,
just correct input:
- de-double-spaces; joins hard-wrapped fragments into flowing dialogue/action.
- restores cue → dialogue adjacency so cues type as `character` and speech as
  `dialogue`.
- heading detection is **byte-compatible with parseFountain** (`/^(INT|EXT|EST|
  I\/E)[. ]/i` OR any line starting with `.`) and headings are emitted verbatim,
  so the normalizer can NEVER change scene segmentation — only reflow text
  between headings.
- idempotent; clean single-spaced Fountain passes through unchanged.

**Measured (12-script corpus sample):** scene DRIFT 0/12 (segmentation preserved
exactly, incl. WALL-E 292→292), comprehension improved 12/12 — Ratatouille
0→799 dialogue / 0→95 speakers, Frozen 0→904, Toy Story 3 0→1084, Pulp Fiction
0→1119, Bee Movie 0→1125, all with recovered character rosters. Full suite green
9,437/0-fail (module built + tested; not yet wired into scoring).

Known precision follow-up: character rosters over-count on some scripts (Mulan
150, Jaws 131) from ALL-CAPS action lines misread as cues — a `isCharacterCue`
tightening (require recurrence / substantial following dialogue), not a
correctness blocker for dialogue detection.

## Phase 2 — wiring into scoring (the big gated wave, NOT yet done)

Wire `normalizeScreenplay` into `analyzeFountainText` (line 1841, before
`parseFountain`). This makes every score reflect COMPREHENDED dialogue/characters
rather than misparsed all-action. **Measured health impact (raw → normalized):**
Ratatouille/Frozen 0.0, Zootopia −0.3, Up −0.1, Toy Story 3 +2.0, Pulp Fiction
−1.9, **Jaws −6.2 (RECOMMEND→CONSIDER)** — modest, bounded, scenes identical,
anchor holds in-sample. Verdict shifts are toward correctness (Jaws is genuinely
terse/action-dominant; its dialogue is now actually read).

Blast radius (why it's its own wave): unlike the arc re-architecture (feature-
scale, calibration-exempt), the normalizer also affects the 20 calibration
samples and 6 discrimination fixtures (all effectively double-spaced), so
landing it re-locks THREE surfaces — the 71-corpus manifest, calibration.test
expectations (must re-verify band monotonicity), and discrimination.test numbers
(must re-verify 6/6 ordering + the composite gap) — plus the AUC/anchor gate.
Execute as a dedicated wave with the full ratchet gate and a coordinated re-lock.
