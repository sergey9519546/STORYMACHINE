# Human labeling task — unblock calibration (Phase G)

The #1 baseline gap: there are **zero** human-preference labels, so "agreement
with expert judgment" cannot be measured. This is the protocol to produce them.
It cannot be automated — it needs qualified readers.

## Who
Professional/near-professional screenwriters or trained story readers. Keep
professional-writer labels SEPARATE from general-reader labels (they measure
different things). The project owner may label too, tagged `owner`.

## What (blinded pairwise)
For each pair of candidate scenes/scripts A and B:
1. Identity blind: no titles, author, or model/provider shown.
2. Randomize A/B order; each pair is also shown reversed to a different labeler.
3. Length-balance or note length; do not let length decide.
4. Record per `contracts/scoring-eval-case.ts` `HumanPreferenceLabel`:
   preference (A/B/tie), confidence 0–1, and a rubric breakdown scoring EACH of:
   causal clarity, emotional truth, character specificity, subtext, genre
   satisfaction, originality, filmability, overall.
5. Notes optional but valuable (why).

## How much (starter)
500–2,000 pairs to begin (per the research pilot targets). Split:
train / calibration / dev / **held-out test** — never tune against held-out.
Split by SCRIPT / WRITER / STORY-WORLD, never random scenes from one script
across sets (that measures memorization).

## Where
`evals/scoring/human/labels/*.jsonl`, one `HumanPreferenceLabel` per line.
Keep raw candidate text out of git if rights-restricted; store candidate IDs +
a local-only content map, mirroring the corpus discipline.

## What it unlocks
Kendall/Spearman rank correlation, pairwise top-choice accuracy, Brier/ECE
calibration, position-swap + verbosity-bias measurement — i.e. the entire
"materially better agreement with expert human judgment" claim.
