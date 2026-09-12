---
type: measurement
updated: 2026-09-12
sources: [docs/p1-benchmark/DISCRIMINATION_BASELINE_2026-07-29.md, scripts/lib/rebuild-experiment-lib.mjs]
status: active
---

# Measurement — DISCRIMINATION_BASELINE_2026-07-29

**Question:** the measured P1 discrimination-AUC results — per channel,
train/val/test, with bootstrap CIs — on the 761-script corpus from
[[Measurement - CORPUS_EXPANSION_2026-07-29]].

**Verdict counts:** DIALOGUE_FLATTEN test AUC **0.990** (PASS, ≥0.80 gate) —
solved via a new bounded dialogue-diversity deduction. MIDPOINT_DROP 0.766
and SCENE_SHUFFLE 0.734 (both partial). CLIMAX_RELOCATE 0.523 (FAIL,
chance). All channels pooled: **0.754** (partial, not yet at the 0.80 gate).

**⚠ Retraction notice (in-file):** the original 2026-07-29 claim that
"dialogue discrimination is solved" (AUC 0.906) was retracted — that number
was an artifact of the animation-heavy 48-script corpus. On the expanded
live-action corpus, dialogue flattening originally scored AUC 0.54
(chance); the new deduction fixed it to 0.990.

**Not the same statistic as [[Gate - AUC-24 Ratchet]]** — different corpus
(153-script test partition vs. a 24-script subset), different degradation
(four separate channels vs. one combined shuffle+drop), different
denominator. See [[Glossary]].

**A RERUN WOULD NOT REPRODUCE THESE NUMBERS, AND NOT BECAUSE THE SCORE MOVED.**
On 2026-09-12 `degradeShuffle` and `degradeMidpointDrop` — the very recipes
behind SCENE_SHUFFLE 0.734 and MIDPOINT_DROP 0.766 — stopped using this
lineage's own scene segmenter (`INT.|EXT.|EST.|INT/EXT.` plus a leading dot,
reassembled by joining lines with `\n`) and now use the doctor's own heading
grammar, so they see `I/E.` and `INT./EXT.` headings the old split walked past
([[Audit - 2026-09-12 Adversarial Review]] finding 12). The figures above are a
DATED RECORD of what the old recipes measured and are correct as such; what is
no longer comparable to them is a fresh run of
`scripts/rebuild-experiment.mjs`. The same disclosure, for the same change, is
in [[Gate - AUC-24 Ratchet]] about AUC-24's 0.731. Nobody has rerun either.

## Sources

- `docs/p1-benchmark/DISCRIMINATION_BASELINE_2026-07-29.md`
