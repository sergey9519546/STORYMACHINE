---
type: branch
updated: 2026-09-07
sources: [docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md, docs/p1-benchmark/MEASUREMENT_RECEIPTS.md]
status: pending-measurement
---

# Branch — Feature-Length Defects

**Branch:** `scoring/feature-length-defects`, on `main` @ `9b199b72`.

**What it is:** the scoring lane's answer to
[[Gate - Public Benchmark]] §10 — "the density term rewards deletion" — plus
the two feature-length report defects that sit beside it. In order:

1. **Voice channel, per-character abstention.** `voice-delta.ts`'s
   `analyzeVoices` abstained for the WHOLE script if any one character had
   under 30 words, so `VOICE SEPARATION — N/A` on every real feature (every
   feature has a WAITRESS with one line). Now sparse characters are excluded
   from the pair set and the matrix is computed over the rest.
2. **`ORPHAN_CLUE` proper-noun/title guard.** A clue candidate that is the
   script's own title, a character name, or a location token out of a scene
   heading is not a clue.
3. **The length pathology.** The density and scarcity terms made jointly
   consistent so that deleting scenes cannot raise health and stapling
   scripts together cannot either.
4. **`meanAbsDialogueShareDelta`** measured as a candidate wiring.

**Why it is parked:** it is a scoring-path change, so it needs
`npm run measure-real` against the local corpus before it can be trusted and
merged — see [[Gate - Receipt Gate]] and
[[Owner - R5 Measurement and Merge]]. The running measurement table, the
candidate comparison, and every gate's exit code are in
[[Measurement - FEATURE_LENGTH_DEFECTS_2026-09-07]].

## Sources

- `docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md`
- `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` — the PENDING entry for this branch
