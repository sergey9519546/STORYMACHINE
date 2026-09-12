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

"Non-printing" means the constructs `src/lib/fountain.ts` **implements**, which
is narrower than the Fountain spec in two places worth knowing before reporting
one as a bug: that parser opens a boneyard only at the start of a line and
closes a note only on the line that opened it, so `/* … */` begun mid-sentence
and a `[[ … ]]` spanning two lines are ordinary ACTION here — scored as action
by the analyzer, and printed. Removing them in the exporter would hand Final
Draft a different script from the one the report describes, so they stay; the
scope is written down at the omission site and asserted in both directions.

## What the disclosure said, and what was actually happening

The 2026-09-12 review measured the FDX sentence against the code and found it
untrue in both directions at once.

Three of the four constructs it called "not carried" **were** carried — as
PRINTED TEXT. `src/lib/fdx.ts` mapped `section` and `synopsis` to FDX's `Action`
type and an inline `[[note]]` rode along inside the action line it sat in, so a
writer's `# ACT ONE` outline heading arrived in Final Draft as an action line in
the script. Promotion, not omission — a bigger change to the returned report
than dropping it would have been.

And five constructs that DO print did not survive. Measured on
`tests/fixtures/fountain-constructs/every-construct.fountain`, one round trip:

| written | came back as (before) | now |
|---|---|---|
| `DAN ^` | `DAN` — dual dialogue gone | `DAN ^` |
| `> THE END <` | `THE END` — an all-caps action line | `> THE END <` |
| `~Somewhere a radio plays` | the same line, unmarked | `~Somewhere a radio plays` |
| `===` | `==` — a synopsis marker | `===` |
| `!INT. THE MIND OF A KILLER` | a **scene heading** — the round trip invented a scene, 2 → 3 | an action line, still forced |

The repair is split the way the format splits. The three printing constructs FDX
has no ELEMENT for cross over on attributes FDX already defines —
`Alignment="Center"`, `<Text Style="Italic">`, `StartsNewPage="Yes"` — and dual
dialogue needed nothing new at all: `src/lib/fdx.ts` had always written
`<DualDialogue>`, and `server/lib/fdx-import.ts` simply never read it. The
non-printing four are now omitted from the FDX body outright, which is what "not
carried" always claimed.

**Against which base, exactly.** The exporter rewrite is byte-neutral: on all 21
committed screenplays (the 20 CC0 scripts in `data/screenplays` plus
`assembled-feature.fountain`) the exported FDX is byte-identical to the tree
before the rewrite — `sha256` of `fountainToFdx` output per script, **21 of 21**.
Against the tree before this LANE it is **20 of 21**, and the one script that
differs does so by exactly one line:

```
+ <Paragraph Type="Draft Date"><Text>2026-09-06</Text></Paragraph>     4,809 -> 4,810 lines
```

which is this lane's own intended draft-date fix, on the only committed script
carrying a `Draft date:` line. Naming the base matters because those are two
different claims and a reader checking the wrong one finds a difference and
reads it as a regression.

The `!` force marker is the one partial case, and it is disclosed as such
(`FDX_CONSTRUCT_FATE`'s `'unforced'`): it comes back where Fountain would
otherwise misread the line and not where it would not, because prefixing `!` to
text the writer never forced is a rewrite rather than a repair.

`src/lib/export-roundtrip.ts` states all of that per format. The Ship panel
prints `EXPORT_ROUNDTRIP_SUMMARY` as an always-visible paragraph under the export
grid and `EXPORT_ROUNDTRIP_NOTE[format]` in each button's hover title, so a
reader who never hovers still gets the fact (`docs/CLAIMS_REGISTER.md`
rows 111-113).

`tests/core/export-roundtrip.test.ts` is what turns that from a hedge into a
claim. `FDX_CONSTRUCT_FATE` is the disclosure as a table, and the suite asserts
it row by row on the construct fixture in BOTH directions — what must come back,
and what must not be in the exported file at all. For the three real scripts the
round trip is compared against the source with exactly the non-printing
constructs stripped, as a MULTISET of lines (so a lost duplicate is visible), and
the word gap is asserted at the measured 0 with two words of margin rather than
the 1% — 174 words — it used to allow. It also pins the `contentHash` where it
should be preserved — a draft already in the importer's canonical shape
round-trips byte-identically, to the same hash and the same report, and a second
round trip changes nothing — and asserts that no `docxToFountain` exists, so the
"cannot be brought back" sentence cannot outlive its truth.

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
- `tests/fixtures/fountain-constructs/every-construct.fountain`
- `docs/audits/2026-09-12-adversarial/writer-loop.md` finding 18
- `docs/CLAIMS_REGISTER.md` rows 111-113
