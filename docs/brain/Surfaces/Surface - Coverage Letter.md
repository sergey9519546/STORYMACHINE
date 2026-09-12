---
type: surface
updated: 2026-09-12
sources: [server/lib/coverage-letter.ts, server/routes/coverage-letter.ts, server/lib/verify-compare.ts, server/lib/artifact-claims.ts, scripts/verify-report.mjs, tests/core/coverage-letter.test.ts, server/lib/reader-tier.ts, server/lib/strengths-copy.ts, server/lib/priority-selection.ts, server/lib/report-sections.ts]
status: active
---

# Surface — Coverage Letter

**Files:** `server/lib/coverage-letter.ts` (`renderCoverageLetter`,
`buildCaveats`), served from `POST /api/export/coverage-letter` in
`server/routes/coverage-letter.ts` — "the three-to-four-page connected-prose
export," distinct from [[Surface - Coverage HTML]] and `server/routes/export.ts`.

**What it shows:** a prose coverage letter whose caveats section carries
the same shared numbers as the other surfaces — the health-percentile
caveat (built from `src/lib/percentile-copy.ts`'s `ordinal()` /
`REFERENCE_SET_SIZE` / `REFERENCE_SET_LABEL`, fixing a 2026-09-05 bug where
a literal `"th"` suffix produced "82th" instead of "82nd"), the draft-rank
caveat (via `src/lib/draft-rank-copy.ts`'s `draftRankDenominatorLabel()` /
`draftRankNextOpportunityLabel()`, including the "ties for" and "N …
unranked" branches), and the shape-and-rhythm caveat (the same two
structural-signal aggregates, "descriptive only … no part of the score").

**Browser suite:** not directly a browser-battery target (a server-rendered
export); covered by `tests/routes/export-coverage-letter.test.ts` and the
fixture-based `tests/fixtures/coverage-letter/report1.expected.md`.

**Verify line, offline-first (P3, 2026-09-06):** `verifyLine` (prose, since
the letter is connected text rather than a labelled `<dl>`) now names the
offline path first — `npm run verify-report -- letter.md script.fountain`,
the script never leaves the verifier's machine — before the hosted
`#verify`/`POST /api/export/verify` path (`docs/CLAIMS_REGISTER.md` row 74;
all three committed `report*.expected.md` fixtures under
`tests/fixtures/coverage-letter/` were updated to match, byte for byte).
`hashLine` and `provenanceLine` are unchanged and, being identical strings
in both the markdown and plain-text renderers, are what
`scripts/verify-report.mjs` parses out of either a `.md` or a `.txt` export
of this letter — see [[Surface - Coverage HTML]] for the shared
`server/lib/verify-compare.ts` comparator both this route and the CLI call.

**Producer tier, and one wording for the percentile (2026-09-11).** The letter
now opens with [[Surface - Producer Tier]] — the same `ReaderTierData` the
exported HTML renders, so the two documents cannot state a different logline,
length, verdict, percentile or leading finding for one script — then a divider,
then the letter unchanged.

Three things in the letter's own prose were disagreeing with the rest of the
product for the same script, and all three now come from shared modules:

- the percentile caveat stated an ORDINAL ("ranks in the 82nd percentile against
  a fixed, 20-sample …") while the tier at the top of the same letter stated a
  BAND. It now renders the same sentence the tier does, and a test counts it:
  one wording, exactly twice, in both the markdown and the text rendering
  (`docs/CLAIMS_REGISTER.md` row 88).
- `buildRootCauses` re-sorted the findings by `severity || memberCount`, which
  drops `clusterIssues`' named-beats-generic key, so the letter's "top three"
  could be three different findings from the three the panel led with. It now
  slices the canonical order — see [[Surface - Root Cause Pipeline]].
- the strengths section is retitled and captioned from
  `server/lib/strengths-copy.ts`, shared with [[Surface - Coverage HTML]] and
  [[Surface - Script Doctor Panel]] (row 86).

**Round 2 (2026-09-11) — the how-to-read caveat parses again.** The letter appended
one fixed clause to whichever percentile reading it got:
`— not against other scripts you might send it, and not a market comparison.` That
modifies "ranks … against", which the band sentence contains and the
not-comparable sentence does not — so on the path 100% of real drafts take, the
clause dangled off a sentence with nothing to attach to, in all three committed
goldens. `src/lib/percentile-copy.ts`'s `percentileCaveatSentenceFor` now owns both
readings AND both qualifications: the in-band path keeps the original clause
verbatim, the out-of-band path says why no percentile is given
(`docs/CLAIMS_REGISTER.md` row 93). The three letter goldens were re-locked, and
the duplicated reference-bounds line in the tier went with them.

**The letter publishes a claim block too (2026-09-12).** Its footer carried the
script-text hash, the engine identity and prose — so its scene count, word count,
page estimate, priorities count, percentile reading, reference bounds, page
references and even its verdict and health readings were unverifiable, and a hand
edit to any of them printed `VERIFIED` at exit 0. The footer now lists every claim
as a `Label: value` line from the SAME table the exported HTML publishes as
`<dt>/<dd>` pairs ([[Surface - Exports]]), omitting the three the letter already
states in its own prose (the hash and the engine identity) so no fact is printed
twice. `Confirm the health, verdict, and hash above all match.` became
`Every value listed below must match.` (`docs/CLAIMS_REGISTER.md` row 95), and the
scope sentence naming what is NOT checked ships beside the rows (row 94).

**Two contradictory "3 things to fix first" in one letter (2026-09-12,
adversarial finding #8).** `src/lib/priorities-copy.ts` gave the list ONE heading
everywhere. What nobody checked was what went under it: this letter printed
`The 3 things to fix first` twice, over two lists chosen by two different
algorithms — [[Surface - Producer Tier]]'s
`suppressContradictoryFindings(topPriorities).slice(0, 3)` and this file's own
`[...anchored, ...unanchored].slice(0, 3)`. MEASURED on
`data/screenplays/runoff.fountain`, one export, one `contentHash`: page one led
with the report's only CRITICAL ("Conflict layer") and the body's three were all
MAJORs, so a writer working from the back of the letter never touched it — and
the letter disagreed with the coverage HTML of the same hash, which led with the
CRITICAL. `server/lib/priority-selection.ts` is now the one selection; the tier
renders a PREFIX of it and the body renders all of it, exactly as
[[Surface - Coverage HTML]] does. The anchored-first re-sort is deleted rather
than moved into the shared function: applying it there would demote the same
document-anchored CRITICAL on every surface instead of one, and the body now
renders the whole list, so no finding the re-sort used to lift is lost. Same
reasoning as this file's 2026-09-11 removal of its local `severityRank()`.

**A Craft Dimensions section, with the gated badges (2026-09-12, findings
#4/#14).** The letter stated dimension readings only inside its Summary
paragraph and no dimension percentile at all, while the panel showed five badges
and the exported HTML showed none. It now renders `label — 92/100 — <badge>` per
dimension plus the section caption, from
`src/lib/percentile-copy.ts`'s `dimensionPercentileBadgeFor` /
`dimensionPercentileCaptionFor` — the same helpers the other two surfaces call.
`tests/core/percentile-comparability.test.ts`'s prose count for the reference
bounds goes 2 -> 3 as a result, and gains a per-section assertion, so a section
that states the bounds twice — the defect that test exists for — still fails.

**The Root Causes heading comes from the shared table (2026-09-12, finding
#16).** Both renderers hand-typed it; two documents of one `contentHash` must not
name the same section two ways. It now renders from
`server/lib/report-sections.ts`, and so does the reference this letter makes to
the exported HTML's "Structural Signals (new, unwired diagnostics)" strip — which
had been the hand-typed string "Structural Signals" ever since that heading
gained its qualifier.

## Sources

- `server/lib/coverage-letter.ts`; `server/lib/artifact-claims.ts`
- `server/lib/verify-compare.ts`
- `scripts/verify-report.mjs`
- `tests/core/coverage-letter.test.ts`
- `tests/scripts/verify-report.test.ts`
- `server/lib/reader-tier.ts`; `server/lib/strengths-copy.ts`; `server/lib/root-cause-pipeline.ts`
- `server/lib/priority-selection.ts`; `server/lib/report-sections.ts`
- `tests/core/priority-selection-one-list.test.ts`; `tests/core/report-cross-references.test.ts`
- `tests/core/dimension-badge-export-parity.test.ts`
- `docs/CLAIMS_REGISTER.md` rows 34-35, 39, 55, 56-57, 74-75, 82, 86-92
