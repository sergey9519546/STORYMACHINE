---
type: surface
updated: 2026-09-12
sources: [server/lib/reader-tier.ts, server/lib/artifact-claims.ts, server/lib/page-refs.ts, server/lib/reference-bounds.ts, src/lib/priorities-copy.ts, scripts/measure-reader-tier-page.mjs, tests/core/reader-tier.test.ts, tests/core/page-refs.test.ts, tests/core/reference-bounds.test.ts, tests/core/artifact-claims.test.ts]
status: active
---

# Surface — Producer Tier

One printed page at the top of every exported coverage report
([[Surface - Coverage HTML]]) and every coverage letter
([[Surface - Coverage Letter]]), then a divider, then the complete report
unchanged.

**Why it exists.** The 2026-09-06 product discovery measured the shareable
report at roughly 760 KB of about 817 notes on a feature-length draft. A
producer does not read 817 notes; they read one page and decide whether to
read the script. Nothing was removed to make room — the tier is a front page.

**Files:** `server/lib/reader-tier.ts` (`buildReaderTier` builds one
`ReaderTierData`; `renderReaderTierHtml` / `renderReaderTierMarkdown` /
`renderReaderTierText` render it, so the HTML report and the letter cannot
state a different number for one script), `server/lib/page-refs.ts`
(scene → page, through the same paginator the PDF export uses),
`server/lib/reference-bounds.ts` (the confidence line, counted from the
calibration corpus), `src/lib/priorities-copy.ts`
(`prioritiesHeadingFor` — the one priorities heading, shared with
[[Surface - Script Doctor Panel]] and both exports).

**What it states:** the logline (or why none was derived —
`docs/CLAIMS_REGISTER.md` row 83), the length, the verdict stamp, the health
number, the percentile reading or "not comparable" (row 88), the reference
bounds (row 89), and the leading findings under a heading that never promises
a count it does not deliver (row 87) — each with a page reference (row 90).

**One page, measured.** `scripts/measure-reader-tier-page.mjs` renders a real
export in Chromium with `media: print` and measures the tier against the
931.2 px printable band of US Letter at the report's own 0.65 in margins.
Measured 2026-09-11: worst case `data/screenplays/runoff.fountain` at
631.8 px, 67.8% of the page, 299.4 px of headroom at 1,524 characters of tier
text. `tests/core/reader-tier.test.ts` pins the implied 2,454-character budget
that headroom buys, so CI catches growth without a browser. In print the tier
takes `break-after: page`, so the full report always starts on sheet two.

**Page numbers that match the PDF.** `server/lib/page-refs.ts` calls
`layoutScreenplay` (`src/lib/screenplay-layout.ts`) — the same function
`src/lib/pdf.ts` lays the exported PDF out with — never a second paginator.
`tests/core/page-refs.test.ts` proves the equality against the real PDF bytes:
it runs `fountainToPdf`, pulls the printed page label out of each page's
content stream, and checks the page a scene is pointed at is the page printing
that number. On `tests/fixtures/feature-length/assembled-feature.fountain`:
231 references, 0 unresolved, monotonic, page 1 to page 79. A finding with no
honest scene anchor gets no reference rather than page 1.

**No fact twice on the first page.** The report header used to carry the
logline, the scene/word/page length line and the verdict stamp, all three of
which the tier states. They moved: the header now identifies the document and
the tier states the findings. See [[Surface - Coverage HTML]] for the
dead-selector guard that came out of that move.

**Round 2 (2026-09-11) — the bounds are stated once.** The confidence line and the
not-comparable percentile sentence both carried
`20 samples / 9–10 scenes / 256–337 words`, so the producer's first page printed
the identical string twice, a centimetre apart — the render-a-fact-once rule broken
by the code that implements the confidence line, on the path every real draft takes
(MEASURED: 0 of the 20 CC0 shorts are inside the band). `buildReaderTier` now sets
`boundsLine` to null when the percentile sentence already contains it, decided by
string containment rather than by re-asking `percentileIsComparable`, so if a future
edit removes that parenthetical the line comes back by itself. The bounds are never
absent: with no percentile at all, the labelled line renders.
`tests/core/reader-tier.test.ts` asserts exactly-once in all three renderings on
both paths, and never-zero on the third.

**Round 3 (2026-09-12) — every number on this page is now a CHECKABLE claim.**
The tier's scene count, word count, page/minute estimate, per-finding page
reference, priorities count, percentile reading, reference bounds and logline
state were stated on the page a producer is told to trust and checked by nothing
— a hand edit to any of them printed `VERIFIED` at exit 0 from the verifier the
report's own footer tells that producer to run
(`docs/audits/2026-09-12-adversarial/server-data-tests.md` BUG-1; the tier's
verdict and health readings in `writer-loop.md` finding 2). `buildReaderTier` now
builds a `server/lib/artifact-claims.ts` `ArtifactClaims` and formats its own
Length line FROM it, both exporters publish it as their verify block, and both
verifiers read it back and recompute it from the script text alone — see
[[Surface - Exports]] for the claim set, the recomputation and what is
deliberately not checked.

**The logline has three states, not two (2026-09-12).** `logline: null` was
printing "no single speaker holds enough of this script's dialogue for one"
(`docs/CLAIMS_REGISTER.md` row 83) for BOTH the dialogue-share gate firing and a
caller simply not supplying a logline — a claim about the script that the second
case is no evidence for. Now: a supplied logline is believed; with the script text
but no logline the engine's own `buildLogline` is derived here, which is also what
makes the state checkable by a verifier holding only the text; with neither, the
page says `Unavailable for this report (it was rendered without the script text).`
and the block publishes no logline claim at all. Both export routes always supply
one, so the false sentence only ever reached callers inside this repository — it
was still a sentence the document could not support.

## Sources

- `server/lib/reader-tier.ts`; `server/lib/page-refs.ts`; `server/lib/reference-bounds.ts`
- `src/lib/priorities-copy.ts`; `src/lib/percentile-copy.ts`
- `scripts/measure-reader-tier-page.mjs`
- `tests/core/reader-tier.test.ts`; `tests/core/page-refs.test.ts`; `tests/core/reference-bounds.test.ts`
- `server/lib/artifact-claims.ts`; `tests/core/artifact-claims.test.ts`
- `docs/CLAIMS_REGISTER.md` rows 82-83, 87-90, 94-99
