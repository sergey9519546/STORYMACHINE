---
type: session
updated: 2026-09-05
sources: [docs/PATH_TO_EXCELLENCE.md]
status: active
---

# Session — 2026-08-24, Five Landings After the Phase Close-Out

**Heading:** "2026-08-24 session — five landings after the phase
close-out." Five commits, three of which changed what the project believes
about itself.

- `6e04740` — five recorded UX/perf leftovers closed: the PDF doctor route
  pooled off the main thread; deep-read's UI stopped implying a cancel it
  could not deliver; the coverage jump button (which did not render at all
  for the sample script — the top finding is scene-anchored, old code only
  parsed line numbers) fixed; Settings gained a real roving tabindex;
  finding-identity became scene-anchored (browser-verified: a one-line edit
  used to read "8 cleared · 8 new," now reads "no change").
- `7d398a7` — docs truth-sync: `ARCHITECTURE.md` still claimed a
  1000-scene analyzer ceiling (400 since Phase W1); README's env table was
  missing seven live variables; a documented restore `curl` command would
  have returned 400 (verified live).
- `4b03c80` — **P-2/P-3 evidence contradicts the rule-catalog retirement
  design.** See [[Measurement - RULE_CHANNEL_EVIDENCE_2026-08-24]]: 246
  rules fire only on degraded scripts, and removing exactly that tier drops
  pooled AUC 0.572 → 0.530. Retirement bar item B5 breaks. **Nothing was
  retired.**
- `5fa7282` — the live rule catalog corrected to **3,217** (not 3,216) —
  `33a2ee48` added `INVERSE_CHEKHOV_GUN`.
- `9a5783cb` — four committed probe scripts globbed `*.fountain.txt`
  against a `*.fountain` corpus, selected zero files, and exited 0. Two are
  the commands [[Measurement - NOVELTY_SIGNAL_2026-08-05]] cites as its own
  reproduction. Fixed: an empty selection now exits 1.

## Sources

- `docs/PATH_TO_EXCELLENCE.md` — "2026-08-24 session — five landings after the phase close-out"
