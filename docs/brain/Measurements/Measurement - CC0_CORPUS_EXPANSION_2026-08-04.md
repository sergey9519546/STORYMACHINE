---
type: measurement
updated: 2026-09-05
sources: [docs/p1-benchmark/CC0_CORPUS_EXPANSION_2026-08-04.md]
status: active
---

# Measurement — CC0_CORPUS_EXPANSION_2026-08-04

**Question:** expand the CC0 truth-extraction recall testbed and weak-band
contrast material — originally 6 scripts, expanding to 20.

**Verdict counts:** as originally written, this document reported `health`
and `wordCount` figures across the expanded 20-script set.

**⚠ What was NOT reproduced / corrected in place (2026-09-04):** every
`health` and `wordCount` figure in this document was measured over a
**contaminated corpus** — all 20 files opened with a `//`-prefixed
provenance header, which is NOT Fountain comment syntax (the boneyard `/*
*/` is, per `src/lib/fountain.ts:110`), so `parseFountain` typed those lines
`action` and the analyzer scored the repository's own filing metadata as
screenplay. Header phrases written by this document's own convention
("DEATH-RECALL TAG: drowning," "kills NAME") are `DANGER_TENSION_WORDS`
hits, raising scene-1 suspense on 13 of 20 scripts and producing 106 of the
corpus's 237 detected clue "seeds." The headers were converted to real
boneyards on 2026-09-04; see [[Measurement - DETECTOR_DEFECTS_2026-08-03]]
and `docs/audits/2026-09-04-reverification/REVERIFICATION.md` for the full
receipt.

## Sources

- `docs/p1-benchmark/CC0_CORPUS_EXPANSION_2026-08-04.md`
