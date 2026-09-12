---
type: surface
updated: 2026-09-12
sources: [src/lib/export-roundtrip.ts, src/lib/fdx.ts, server/lib/fdx-import.ts, src/lib/pdf.ts, server/lib/pdf-import.ts, src/lib/docx.ts, src/lib/export-title-page.ts, src/lib/fountain-title-block.ts, src/components/scriptide/ShipPanel.tsx, tests/core/export-roundtrip.test.ts]
status: active
---

# Surface — Export Round Trip

**Files:** the four writers — `src/lib/fdx.ts`, `src/lib/pdf.ts`,
`src/lib/docx.ts`, and ScriptIDE's own `exportFountain` — against the two
readers, `server/lib/fdx-import.ts` and `server/lib/pdf-import.ts`; the shared
title-page model `src/lib/export-title-page.ts` /
`src/lib/fountain-title-block.ts`; the disclosure copy
`src/lib/export-roundtrip.ts`; and the Ship panel that presses the buttons
(`src/components/scriptide/ShipPanel.tsx`, → [[Surface - Exports]] for the
server-side export routes).

**What it is:** a writer exports a draft, works on it elsewhere, and brings it
back. Everything downstream of that — the health, the verdict, the issue counts,
the `contentHash` an exported report publishes and a verifier recomputes — is a
function of the text that comes back. So the round trip is not a convenience
feature; it decides whether a report on the returned file is the report the
writer was given.

## What it used to do (2026-09-12, adversarial finding #18)

Exporting `tests/fixtures/feature-length/assembled-feature.fountain` (231
scenes, 19,293 words, health 84.4) to FDX and importing it back:

| | original | after the FDX round trip |
|---|---|---|
| health | 84.4 | 84.8 |
| wordCount | 19,293 | 17,442 |
| totalIssues | 899 | 887 |
| verdict / grade / sceneCount | CONSIDER / strong / 231 | same |

and the returned draft had no title page (`Title:` / `Credit:` / `Author:` /
`Draft date:` all gone) and `> FADE OUT.:` in place of each of the six
`FADE OUT.` transitions. Nothing anywhere in the product said any of it would
happen.

## Three bugs, all in what the code chose to throw away

1. **The title page.** `fdx-import.ts` replaced the whole `<TitlePage>` subtree
   with `''` — a one-line regex — on the reasoning that "the doctor only needs
   the script body". It is now separated rather than discarded and re-emitted as
   the Fountain title block it came from, with FDX's own title-page paragraph
   types mapped back to Fountain keys and a repeated type (Final Draft's
   multi-line Contact address, which `fdx.ts` writes one paragraph per line)
   becoming that key's indented continuation lines. The subtree still never
   reaches the BODY: a Title paragraph is not an action line.
2. **The transition terminator.** `formatTransition` appended `:` whenever the
   text did not already end in `:`, so `FADE OUT.` became `FADE OUT.:`, failed
   the auto-detect test it would otherwise have passed, and came back forced as
   `> FADE OUT.:`. A transition that already carries a terminator keeps it.
3. **The draft date.** It was not in the shared `ExportTitlePage` model at all,
   so every exporter dropped it — the ONE remaining non-boneyard line lost after
   fix 1, measured by diffing the round trip against the source. It is now
   parsed by `parseFountainTitleBlock`, carried through
   `resolveExportTitlePage`, written to FDX as a `Draft Date` paragraph, and
   printed bottom-right on the PDF and DOCX cover sheets — the corner the
   contact block does not occupy.

After: 17,450 words back instead of 17,442, with the title page, the draft date
and all six transitions intact.

## What is format, not defect — and where it is said

The residual gap is the **1,843 words of boneyard** in that fixture: Fountain's
non-printing constructs (boneyard `/* … */`, inline notes `[[ … ]]`, synopses
`= …`, section headings `# …`) have no FDX, PDF or DOCX equivalent. `.docx` has
no importer at all.

`src/lib/export-roundtrip.ts` states that per format. The Ship panel prints
`EXPORT_ROUNDTRIP_SUMMARY` as an always-visible paragraph under the export grid
and `EXPORT_ROUNDTRIP_NOTE[format]` in each button's hover title, so a reader who
never hovers still gets the fact (`docs/CLAIMS_REGISTER.md` rows 111-113).

`tests/core/export-roundtrip.test.ts` is what turns that from a hedge into a
claim: the round trip is compared against the source with exactly those four
constructs stripped, so a round trip that lost one PRINTING line fails even
though the word count would still look about right. It also pins the
`contentHash` where it should be preserved — a draft already in the importer's
canonical shape round-trips byte-identically, to the same hash and the same
report, and a second round trip changes nothing — and asserts that no
`docxToFountain` exists, so the "cannot be brought back" sentence cannot outlive
its truth.

`.fountain` is the one format that comes back byte for byte. It is not silent
either: ScriptIDE's `exportFountain` PREPENDS a title page when the draft has
none, which is an addition rather than a loss but still changes the text and
therefore the hash, and the note says so.

## Sources

- `src/lib/export-roundtrip.ts`
- `src/lib/fdx.ts`; `server/lib/fdx-import.ts`
- `src/lib/pdf.ts`; `server/lib/pdf-import.ts`; `src/lib/docx.ts`
- `src/lib/export-title-page.ts`; `src/lib/fountain-title-block.ts`
- `src/components/scriptide/ShipPanel.tsx`
- `tests/core/export-roundtrip.test.ts`; `tests/core/fdx-import.test.ts`
- `docs/audits/2026-09-12-adversarial/writer-loop.md` finding 18
- `docs/CLAIMS_REGISTER.md` rows 111-113
