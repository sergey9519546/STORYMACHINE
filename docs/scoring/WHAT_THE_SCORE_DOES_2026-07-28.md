# What the Script Doctor score does — and does not — do on real writing

> Plain-language summary, 2026-07-28. This is the active-work prompt's
> definition-of-done artifact: a non-technical statement of what the current
> score actually measures on real screenplays, and what it has never been
> shown to measure. It is written for a writer (or a decision owner) who
> needs to know what they can and cannot trust before running a draft.
>
> The numbers below are reproducible: run
> `REAL_SCRIPT_CORPUS_DIR="../real-script-corpus" npm run measure-real`
> against the local produced-feature corpus (73 scripts). Full evidence and
> method are in `REAL_SCRIPT_DISCRIMINATION_2026-07-28.md`; the claim-by-claim
> audit of every report number is in `REPORT_CLAIM_AUDIT.md`.

## The one-sentence version

The score reliably does **not collapse** on real, professionally produced
screenplays — every one of 73 produced features scores above the floor — but
it has **never been shown to separate strong writing from weak writing**,
because no weak human-written comparison class exists yet.

## What the score DOES do (measured, reproducible)

1. **It stays sane on produced work.** All 73 produced features score health
   between 84.6 and 98.9 (mean 93.1). Zero fall below the produced floor of
   80. This is a real guarantee: the corpus was built to catch a specific
   systemic failure (a bug once saturated four produced features to health
   0), and the floor makes that class of collapse immediately visible.
   `verdict` is RECOMMEND on 72/73 and CONSIDER on 1.

2. **It notices wholesale structural destruction.** When a script's scenes
   are scrambled and every third scene dropped, the score drops in 76% of
   cases (shuffle-drop AUC 0.759; mean health falls 92.9 → 87.0). So the
   score is not blind to gross structural damage.

3. **It is deterministic and reproducible.** The same script text, run
   through the same engine, produces the same health, verdict, and scene
   count every time. The report's contentHash lets a third party re-derive
   the numbers. (What re-derivation proves is reproducibility — same engine,
   same text, same output — **not** that the output is correct.)

## What the score does NOT do (the honest gap)

1. **It does not separate strong craft from weak craft on real writing.**
   This is the single most important thing to understand. Every script in
   the corpus is a *produced* feature — the strong class. There is **no
   weak human-written comparison class** (`docs/p1-benchmark/
   SCREENPLAY_SOURCING_TODO.md` Task 1 documents this as the open gap). So
   nothing measured here proves the score orders a genuinely weak human
   script below a genuinely strong one. Calling the produced floor
   "strong-vs-weak discrimination" would be fabrication.

2. **It is largely blind to global-arc reordering.** When a script is cut
   into thirds and reordered (3rd-1st-2nd), keeping every scene's immediate
   neighbors, the score barely moves — act-swap AUC 0.609 (mean health
   92.9 → 91.1, a 1.8-point drop). Local continuity is preserved, so the
   score does not register that the global arc is now broken.

3. **Its rule channel barely moves the score.** By the engine's own
   measurements (cited from in-code comments, not re-derived here), the
   weighted-rule channel contributes very little to discrimination relative
   to the scene-count term. The score currently leans heavily on
   scene-count scarcity. Whether scene count is a real craft signal or a
   length proxy is **not yet determined** — it has only been measured on
   artificial scene-drop degradation, never on natural strong-vs-weak human
   writing. That question is exactly what P1 is for, and P1 has not started.

## What this means for showing the report to writers (P0)

The report a writer sees is now worded to match what is actually measured:

- The footer says the score is **reproducible** (same text + same engine →
  same numbers), not that it is "correct."
- The hash is labeled a **script-text hash**, not a "verification" of the
  score's accuracy.
- Verdict explainers describe the engine's measurement tiers, not a
  human-reader endorsement.
- The health percentile is disclosed as relative to a **20-sample,
  hand-authored synthetic reference set**, not an industry population.
- Dimension scores are shown as whole numbers (the tenths implied a
  precision the underlying signals don't support).
- "What's Working" bullets name the actual signal each rests on.

A writer shown this report is shown something honest about what it does. What
no one yet knows — and what P0 sessions cannot establish — is whether writers
*want* that, or whether the score, once trusted, actually tracks their
judgment of craft. That is the work that remains gated behind P0.

## What would change this picture (P1, not started)

A real strong-vs-weak discrimination result requires, at minimum: a legally
distributable corpus of real weak human writing, blinded pairwise judgments
from ≥3 experienced readers, a pre-registered held-out split, and an AUC
target. None of that exists yet. Until it does, the score's discrimination
on real writing is **not established** — only its produced-floor and
structural-degradation behavior are.
