# Novelty-against-prior signal — first discriminator of CLIMAX_RELOCATE (local), hard to globalize

**Status:** Mixed result, 2026-08-05. Opens a real direction (first signal to
discriminate CLIMAX_RELOCATE in any form) but does NOT yet yield a shippable
global detector. Records both the breakthrough and the four failed attempts to
globalize it, so the next session does not repeat them.

## The breakthrough (per-scene, targeted)

The relocated scene's **proper-noun novelty against its prior scenes** is the
first signal in this project's history that discriminates CLIMAX_RELOCATE.

Measured on 11 scripts: take the original last scene (the climax) and compute
what fraction of its proper nouns (All-CAPS tokens + Capitalized words) do NOT
appear in any scene before it. Then relocate it to position 1 and recompute
against the new (near-empty) prior set.

| arrangement | mean novelty | range |
|---|---|---|
| intact (climax at end) | 0.31 | 0.12–0.55 |
| relocated (climax at idx 1) | 0.76 | 0.59–0.92 |
| **delta** | **+0.45** | +0.10 to +0.72 |

**10/11 scripts** show the relocated scene's novelty rising by >0.1. This is
the opposite of every per-scene field (all invariant to reorder) and every
prior candidate locator (all degenerate or non-traveling). Novelty-against-
prior is genuinely order-dependent by construction: the "prior" set is defined
by scene position, so reordering changes it.

**Why it works where `forwardEdgeRatio` didn't:** `forwardEdgeRatio` derived
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

The control (MIDPOINT_DROP) correctly stays at ~0 for the outlier/cold-open
formulations (dropping scenes doesn't reorder, so novelty shouldn't rise) —
confirming the signal is real but the global formulations can't isolate it
from the noise of 40+ intact scenes.

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

- **OPEN:** novelty-against-prior is a real, order-dependent signal — the
  first. A detector that combines it with noun *type* (proper name vs
  relational/anaphoric) or with a lightweight coreference pass could plausibly
  close CLIMAX_RELOCATE. This is now the named next direction, replacing the
  closed `forwardEdgeRatio` / `purpose` / `suspenseDelta` candidates.
- **NOT OPEN / not shippable as-is:** the raw proper-noun novelty count, in
  any of the four global forms tested here, is too noisy to drive a bounded
  deduction. Do not wire any of the four formulations above.

## Reproduction

```sh
# the breakthrough (per-scene, targeted) — the only clean win
node --experimental-strip-types -e "<see commit for the inline probe>"
# the four global formulations:
node scripts/probe-forward-reference.mjs        # forward-ref density (degenerate)
node scripts/probe-novelty-global.mjs           # global early-third burden (degenerate)
# (outlier + second-cold-open were inline probes; reproduce from this doc's tables)
```

Run 2026-08-05 against `data/screenplays/` (27 eligible `*.fountain.txt`,
10-11 with ≥3 scenes). All probes are analyzer-only (no doctor), <2s each.
