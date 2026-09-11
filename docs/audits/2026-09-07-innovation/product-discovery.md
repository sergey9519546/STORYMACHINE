# Product discovery — read-only, 2026-09-06 (reconstructed)

*Read-only lane (Opus). The full report (~31 KB: twelve ranked findings each
with reproduction, screenshots `01`–`43`, section B "five things that are
excellent and must not regress", section C "contradictions with NORTH_STAR
and with the phase exit gates") was lost in the 2026-09-07 sandbox rebuild.
Its method paragraphs and the ranked headings survive verbatim from the
session transcript; each heading's disposition is added below it.*

## Method (verbatim)

Method: `npm run build` (exit 0), keyless production server from
`/home/user/STORYMACHINE` on :5199 (`llmReady:false`, no key in env),
Playwright/Chromium 1.63 at 1280×900 and 375×812, both colour schemes.
Server and browsers killed at the end (`HTTP=000` on :5199).

**Test material.** The brief asked for a draft over 90 scenes. There is none
in the repo — the largest Fountain file anywhere under version control is
10,861 B / 12 scenes (`tests/fixtures/feature-scale-discrimination/intact.fountain`);
`data/screenplays/` is 21 shorts of 9–14 scenes and 427–1,830 words. I built
`<scratch>/product-discovery/feature.fountain` — a title page plus twelve of
those shorts concatenated: **146 scenes, 13,252 words, 77 KB**. That
assembly is *deliberately incoherent* (twelve unrelated stories, no
throughline, no protagonist, no act structure), which turned out to be the
single most informative input of the session. The short was
`data/screenplays/dead-frequency.fountain` (12 scenes), the app's own P0
stimulus.

Nothing below re-lists a finding recorded fixed by
`docs/audits/2026-09-04-evening-batch`, `-reverification`,
`2026-09-05-review-batch` or `2026-09-06-mistake-search`. Two of those fixes
I re-verified as genuinely holding and they appear in section B. No
recorded-fixed item was found still broken.

*(The report's "21 shorts" was later corrected by the exports reviewer: there
are 20 CC0 shorts in `data/screenplays/`; the 21st file is the licence
manifest.)*

## A. Ranked findings (12) — headings verbatim, disposition added

1. **BROKEN · P2 — Typing a new scene after running coverage throws an infinite React render loop.** Root-caused to a same-value `setSaveStatus` with an update pending (`ScriptIDE.tsx`); fixed with `useIdempotentState` — feature-length lane, merged dd57251d.
2. **BROKEN · P3, P1 — The writer's screen and the producer's exports disagree about where the problem is, from the same `contentHash`.** `export.ts` omitted `sceneSpans`; one shared `server/lib/root-cause-pipeline.ts` — exports lane (rebuilt on `lane/exports-producer-tier`).
3. **BROKEN · P1 — The dialogue channel abstains on every feature-length script.** Per-character abstention — `scoring/feature-length-defects` 0cde0b4d, owner-gated.
4. **BROKEN · P1, P3 — The critical tier of the report is character names and the title of the script.** ORPHAN_CLUE title/name guard — `scoring/feature-length-defects` 7ac44410, owner-gated.
5. **BROKEN · P1 — Length beats coherence: twelve unrelated shorts stapled together outscore every one of them and flip CONSIDER → RECOMMEND.** The density term that paid for deletion and for length — `scoring/feature-length-defects` 583c9513 with the `stapled_shorts` metamorphic witness (08b458b9), owner-gated.
6. **MISSING · P0, P1 — There is no feature-length script anywhere in the repository, so nothing is ever exercised at the length the product is for.** `tests/fixtures/feature-length/assembled-feature.fountain`, 231 scenes, CC0, deterministic — merged dd57251d.
7. **BROKEN · P3 — The producer's report opens with a machine-mangled logline.** Honest logline gate and a "turn" that must be spoken — exports lane.
8. **HALF-BUILT · P1, P3 — The overall score and the five dimension scores contradict each other in the same paragraph.** Scoring-path seam: `scoring/feature-length-defects` efc1899d; on main the strengths block is retitled and captioned — exports lane.
9. **HALF-BUILT · P2 — One jump affordance for 747 findings.** One resolver, one control, every located finding — merged dd57251d.
10. **ROUGH · P3 — Root-cause cards contradict their own expander.** Issues-vs-rules sentence — merged dd57251d.
11. **ROUGH · P3 — The shareable coverage report is 760 KB of 817 notes with no producer tier.** `server/lib/reader-tier.ts`, `page-refs.ts` — exports lane.
12. **ROUGH · P1, P3 — The health percentile is 100 for every real draft.** "Not comparable" copy, symmetric comparability, letter through the shared sentence — exports lane.

## B and C

Section B (five things that are excellent and must not regress) and section
C (contradictions with NORTH_STAR and the phase exit gates) are lost with the
file. Two of B's items were re-verifications of earlier recorded fixes; C's
substance is carried by the phase anchors on the twelve findings above.
