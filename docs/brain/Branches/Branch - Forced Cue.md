---
type: branch
updated: 2026-09-12
sources: [docs/audits/2026-09-12-adversarial/forcedcue-lane-report.md, docs/audits/2026-09-12-adversarial/forcedcue-review.md]
status: ready-for-owner
---

# Branch — Forced Cue

**Branch:** `scoring/forced-cue`, stacked on [[Branch - Adversarial 2026-09-12]]
at `4cf5b2f3`. **Tip `089bec91`, READY-FOR-OWNER** after one review round, its four non-blocking items built in round 2
(`docs/audits/2026-09-12-adversarial/forcedcue-review.md`). Receipt: rows 11
and 12 in the branch's single PENDING entry; no AUC-24 number stated,
implied or projected.

**What it is:** Fountain's forced character cue `@NAME` was the largest
format sensitivity left after the adversarial branch folded `!`, `.`, `>`
and cue-extension spelling — a redundant `@` on every cue moved 32 of 32
public scripts, mean −1.172, largest −26.8. The parser now types `@NAME`
as a character cue (dual dialogue via `@NAME ^`, the marker dropped from
the rendered name, the lines below typed as dialogue) and every renderer
prints it as a cue: layout, PDF, FDX (Character/Dialogue types) and DOCX
print zero `@`; the FDX importer round-trips `@田中` as itself. The
transform now reads 0 of 32; the two-sided pin the adversarial branch left
flipped to a FORMAT_TRANSFORMS row asserting 0. Output identity vs
`4cf5b2f3`: 45 of 45 byte-identical, because no committed fixture has a
line starting `@`; the public benchmark reproduces to the digit.

**The finding the change made:** the parser change opened a ninth bypass
class in [[Gate - Fountain Shape Guard]] — `isCueLikeLine`'s disjuncts all
began at a cased capital, which `@` escapes, so the cheap pre-parse cue
count read 0 against a pipeline of 12,000 character blocks and the payload
reached the expensive parse bound instead. A fourth disjunct closes it,
with ROUND 9 tests in both suites; the reviewer measured the wider
disjunct against a 1,050-line grammar product (0 base-true lines went
false) and against a realistic document (accepted, same count).

**Still open, named:** `>` forced transitions print `>` from every exporter
(the parser has no forced-transition branch); `@`-opened action lines
render the `@` literally. `npm run probe-corpus-shape` carries an `@cue`
column so the owner can see which private drafts this touches (0 of 32 on
the committed corpus).

**Why it is parked:** scoring path; measured in the order
[[Owner - R5 Measurement and Merge]] gives, after the branch it stacks on.
See [[Gate - Receipt Gate]].

## Sources

- `docs/audits/2026-09-12-adversarial/forcedcue-lane-report.md`
- `docs/audits/2026-09-12-adversarial/forcedcue-review.md`
