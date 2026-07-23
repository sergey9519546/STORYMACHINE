# screenplayAIMarkers — real-writing validation

Status: **false-positive floor measured; discriminator NOT yet validated.**

## The claim that was wrong

`server/nvm/analyze/anti-slop.ts` shipped 64 "Tier 1" AI-writing patterns
(`screenplayAIMarkers`) with a header target of **<0.1 false positives/film**.
That number was never measured — it was asserted. CLAUDE.md's quality bar
forbids exactly this: a scoring change needs *runnable discrimination evidence
on real writing*, not synthetic fire/no-fire fixtures.

## Measurement (negative control)

`scripts/measure-slop-discrimination.ts` runs `detectSlop()` over a directory
of real, professionally produced screenplays — the negative class, which should
score near-zero AI markers if the patterns discriminate.

Corpus: **261 produced screenplays** (`.fountain.txt`), 2026-07-22.

| metric | measured | fabricated target |
|---|---|---|
| mean marker-lines / film | **3.84** | <0.1 |
| density /1k lines — p50 / p90 / p99 | 0.55 / 1.26 / 2.01 | — |
| films with zero markers | 16 / 261 (6%) | ~all |

Per-category false-positive rate (mean/film):

| category | mean/film |
|---|---|
| generic-intensifiers | 0.84 |
| unnecessary-formality | 0.72 |
| filler-cliches | 0.66 |
| metaphorical-inflation | 0.55 |
| copula-avoidance | 0.53 |
| inflated-staging | 0.34 |
| vague-complexity | 0.17 |
| buzzwords-jargon | 0.05 |

**Conclusion:** the patterns fire on ordinary screenplay English — human
screenwriters legitimately write "robust", "commence", "in order to", "serves
as". The real false-positive rate is **~38× the claimed target**. The header,
the inline comments, and the composite-score weight comment in `anti-slop.ts`
were corrected to the measured baseline.

## What is now gated

`tests/core/anti-slop-real-corpus.test.ts` (env-gated on `REAL_SLOP_CORPUS_DIR`,
falls back to `REAL_SCRIPT_CORPUS_DIR`; skips honestly in CI where the corpus is
copyright-local) locks the measured baseline as a regression ceiling:

- mean marker-lines/film ≤ 6.1 (observed 3.84)
- p90 density/1k ≤ 2.02 (observed 1.26)
- no single category > 1.7/film (observed max 0.84)

Any future pattern edit that makes real writing fire markedly more fails here
before it can inflate `slopScore` on real drafts.

## What is still open (the real discrimination claim)

This is the **negative-control half only**. Full validation needs the positive
class: AI-generated screenplays, run through the same harness, to show markers
fire *more* on AI output than on human writing (AUC ≥ 0.7). The script already
supports it:

```
npm run measure-slop -- --corpus <real-dir> --ai <ai-generated-dir>
```

Until that separation is measured, `screenplayAIMarkers.validated` stays
`false` and the composite weight (0.35/line) stays conservative.

## Reproduce

```
npm run measure-slop -- --corpus /path/to/produced-screenplays
```
