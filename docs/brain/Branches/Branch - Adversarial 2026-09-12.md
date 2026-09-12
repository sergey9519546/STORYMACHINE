---
type: branch
updated: 2026-09-12
sources: [docs/audits/2026-09-12-adversarial/engine-logic.md, docs/audits/2026-09-12-adversarial/writer-loop.md]
status: ready-for-owner
---

# Branch — Adversarial 2026-09-12

**Branch:** `scoring/adversarial-2026-09-12`, created from
[[Branch - Feature-Length Defects]] (rebased onto main first). **Tip
`4cf5b2f3`, READY-FOR-OWNER** after four independent review rounds
(`docs/audits/2026-09-12-adversarial/scoring-review.md`; the lane's own
record is `scoring-lane-report.md`, rounds 1–4). Receipt: exactly one PENDING
entry over `78ec4464..HEAD`; no AUC-24 number stated, implied or projected.

**What the reviews settled:** the four public-benchmark floors that moved
DOWN are isolated to the denominator fix (the fixtures had counted their CC0
licence record as prose; reverting that change alone reproduces the
isolation table's cell exactly), so the re-lock stands. The one blocking item
was truth: the pipeline seam takes the whole normaliser
(`stripTitlePage(normalizeScreenplay(fountain))`) while three places said it
took half — kept as the stronger version and disclosed as its own cost,
because the private corpus IS the double-spaced scraped-PDF shape it reaches.
Round 2 folded Fountain's forced-element markers (`!` 32/32 → 0/32, `.`
32/32 → 0/32, `>` 5/6 → 0/6) and cue-extension spelling (12/14 → 0/14) at
the parser seam; `@` is pinned two-sided and unfixed (32/32, up to −26.8),
the subject of `scoring/forced-cue`. Rounds 3–4 made the owner's first
instruction one command, `npm run probe-corpus-shape` (corpus-gated, computes
no AUC, writes nothing, prints no screenplay text; its output is a local
artifact because the paths are the corpus's index). Output identity vs
`85273742`: 45/45 byte-identical from round 2 onward; vs main: 45 differ, by
design.

**What it is:** the scoring-path answer to the 2026-09-12 adversarial
review's engine findings ([[Audit - 2026-09-12 Adversarial Review]]):
parse and format invariance (a Fountain-legal dialogue reflow moved health
up to 11.1 points; a title page was scored as prose; curly apostrophes and
boneyard notes changed the score; a production note in a comment raised
health ~10 and flipped a verdict), the density channel's gradient
re-measured on the steepness-2 base, order invariants asserted over a seeded
permutation ensemble instead of one hand-built witness, the calibration
corpus's uncontrolled word budget disclosed as a confound with equalised
numbers, report truth at the scoring seam ("a handful of minor notes" over
342 issues; a defect concentrated in one scene absent from the triage), and
the analyzer-side cap on voice-pair work so a large ensemble gets a score.

**Why it is parked:** scoring path; receipt PENDING; the owner's
`measure-real` decides, in the order [[Owner - R5 Measurement and Merge]]
gives, after [[Branch - Feature-Length Defects]] which it stacks on.
See [[Gate - Receipt Gate]].

## Sources

- `docs/audits/2026-09-12-adversarial/engine-logic.md` — findings 1–5, 8–10, 13
- `docs/audits/2026-09-12-adversarial/writer-loop.md` — findings 1, 7, 12, 13
