# Novelty-against-prior signal — historical targeted note, not reproduced

**Status:** **HISTORICAL / UNREPRODUCIBLE AS CURRENT EVIDENCE (2026-08-08).**
The 2026-08-05 commit recorded targeted 10/11 measurements but did not commit
the inline source or a receipt containing per-script results. The sanitized
checkout also has no sanctioned produced-script corpus. The numbers below
therefore cannot be independently checked and are not current P1 evidence.
Two global probe scripts are committed, but they do not reproduce the targeted
10/11 claim.

## Historical targeted observation (unreproduced)

The prior note reported that the relocated scene's **proper-noun novelty
against its prior scenes** discriminated CLIMAX_RELOCATE in a targeted test.
Because the targeted probe source and per-script receipt are missing, this is
a historical hypothesis-generating note, not an established discriminator.

The reported method used 11 scripts: take the original last scene (the climax)
and compute
what fraction of its proper nouns (All-CAPS tokens + Capitalized words) do NOT
appear in any scene before it. Then relocate it to position 1 and recompute
against the new (near-empty) prior set.

| historical reported arrangement | mean novelty | range |
|---|---|---|
| intact (climax at end) | 0.31 | 0.12–0.55 |
| relocated (climax at idx 1) | 0.76 | 0.59–0.92 |
| **delta** | **+0.45** | +0.10 to +0.72 |

The missing inline probe was reported to show **10/11 scripts** with a rise
greater than 0.1. That count is not independently reproducible from committed
artifacts. Novelty-against-prior is order-dependent by definition because the
"prior" set follows scene position, but that property alone does not validate
the reported discrimination rate.

**Historical rationale:** `forwardEdgeRatio` derived
its edges from content-defined clue seed/payoff (tautologically forward).
Novelty-against-prior derives its "prior" set from raw array position — it
reads the actual ordering, not a content-derived proxy for it.

## The four failed attempts to globalize it

A real detector does not know which scene was relocated. Four attempts to turn
the per-scene signal into a global statistic that separates intact from
degraded without that knowledge:

| Formulation | relocate > intact | shuffle > intact | midDrop > intact (control) | Verdict |
|---|---|---|---|---|
| **Global early-third burden** (novelty in first 1/3 of scenes) | 2/10 | 1/10 | 8/10 ✗ | degenerate — first acts introduce most nouns regardless of order; midDrop control FAILS |
| **Per-scene outlier count** (scenes with novelty > 0.7) | 3/10 | 6/10 | 0/10 ✓ | inconsistent; `max` always 1.0 (scene 0 saturates) |
| **"Second cold open"** (max novelty among scenes 1..end) | 3/10 | 5/10 | 1/10 ✓ | noisy; many intact scripts have a high-novelty scene 1 legitimately |
| **Forward-reference density** (novel nouns in first quartile) | 1/11 | 1/11 | — | degenerate — proper-noun density saturated (0.56–1.00) |

The historical note reported that the MIDPOINT_DROP control stayed at ~0 for
the outlier/cold-open formulations. Those two formulations were also inline
and their source was not committed, so this table is retained as an
unreproduced observation rather than confirmation that the signal is valid.

## Why globalizing is hard (the structural reason)

The per-scene signal is strong but **local**: it lives in the one misplaced
scene. A global aggregate (mean/sum/max across all scenes) drowns that one
scene's signal in 40+ correctly-ordered scenes whose novelty is baseline.
And screening for outliers fails because legitimate screenplays have
high-novelty scenes too (new character introductions, new locations, act
breaks) — the "second cold open" pattern is normal in intact features, not
pathognomonic of reordering.

The missing piece is a way to distinguish a **legitimate** high-novelty scene
(a deliberate new-location/new-character introduction) from a **misplaced**
one (a climax scene referencing characters the audience hasn't met). The
proper-noun novelty count alone cannot tell these apart. A discriminator
likely needs either (a) the *type* of novel noun (a new character name at a
new location is expected; a cluster of already-relationship-laden names like
"her father" / "the vault" / "the plan" at position 1 is not), or (b) a
coreference layer that notices definite/anaphoric references ("the door",
"again", "this time") whose antecedents are absent — which crosses into the
NLP coreference work the engine explicitly does not have (agency-signal.ts:99
documents this gap).

## What this opens (and does not)

- **HYPOTHESIS TO RETEST:** novelty-against-prior is order-dependent by
  construction. A detector that combines it with noun *type* (proper name vs
  relational/anaphoric) or with a lightweight coreference pass could plausibly
  help with CLIMAX_RELOCATE, but the targeted effect must first be reproduced
  from committed source against the sanctioned corpus.
- **NOT OPEN / not shippable as-is:** the raw proper-noun novelty count, in
  any of the four global forms tested here, is too noisy to drive a bounded
  deduction. Do not wire any of the four formulations above.

## Reproduction

```sh
# committed global formulations only; neither reproduces the targeted 10/11 claim
node scripts/probe-forward-reference.mjs        # forward-ref density (degenerate)
node scripts/probe-novelty-global.mjs           # global early-third burden (degenerate)
```

The targeted novelty probe and the outlier/second-cold-open probes were never
committed, so no command in this repository can reproduce their tables. The
2026-08-05 note says the probes ran against `data/screenplays/` (27 eligible
`*.fountain.txt`, 10–11 with at least 3 scenes), but that sanctioned corpus is
absent from this checkout. A valid rerun requires committed executable source,
the sanctioned corpus version, per-script output, and an exact-build receipt.
