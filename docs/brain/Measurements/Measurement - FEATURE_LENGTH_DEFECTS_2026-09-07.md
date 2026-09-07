---
type: measurement
updated: 2026-09-07
sources: [docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md, evals/scoring/runner/metamorphic-cases.ts, server/nvm/analyze/doctor.ts, server/nvm/analyze/voice-delta.ts]
status: pending-measurement
---

# Measurement — FEATURE_LENGTH_DEFECTS_2026-09-07

**Question:** three defects that only show up at, or are only visible
because of, feature length — the dialogue channel abstaining for the whole
script, `ORPHAN_CLUE`'s critical tier being character names and the title,
and the health formula paying a writer both for DELETING a third of their
scenes and for STAPLING unrelated scripts together. The third is
[[Gate - Public Benchmark]]'s §10 finding and the One Bet.

**Status: PENDING OWNER MEASUREMENT.** Every number in the document comes
from committed fixtures and the public benchmark; the private 761-script
corpus was not touched and is not described. See [[Gate - Receipt Gate]] and
[[Owner - R5 Measurement and Merge]].

**The decomposition that drives everything:** under the shuffle-drop recipe
the 32-script public corpus retains 72.5% of its words but only 50.2% of its
weighted issues, so `densityPenalty` falls 7.632 while `scarcityPenalty`
rises only 5.693 — the damaged copy scores 1.9 points HIGHER on average. The
staple is the same formula's other end and a DIFFERENT term: the stapled
twelve and the best single part are 0.013 apart on density (both pinned at
the 10-point ceiling) and 10.66 apart on scarcity, so no change confined to
the density term can move that witness.

**The new instrument:** `stapled_shorts`, a metamorphic witness registered
`known-failing` beside `empty_verbosity` — twelve CC0 shorts stapled end to
end must not outscore the best of them. Measured on `main @ 9b199b72`: best
part 78.3 CONSIDER, stapled 86.5 RECOMMEND, Δ **+8.2**.

**What this fed:** the branch [[Branch - Feature-Length Defects]].

## Sources

- `docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md`
- `evals/scoring/runner/metamorphic-cases.ts` (`stapled_shorts`)
- `docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md` §10
