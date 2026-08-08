# Climax-locator candidate probe — historical pre-tie-break measurement

**Status:** **SUPERSEDED AS CURRENT EVIDENCE (2026-08-08).** The 2026-08-05
discrimination probe selected the first scene at an equal `suspenseDelta` peak
(`>`), whereas the current probe/reference structural-peak convention selects
the later equal peak (`>=`). This is a probe convention, not a claim that the
analyzer itself chooses one singular peak. The produced-script corpus required
to remeasure was not present in this integration worktree, so the numeric
tables and closure claims below are retained only as historical pre-tie-break
observations—not current P1 evidence. Re-run
`node scripts/probe-climax-locators.mjs` against the sanctioned corpus and
record a receipt before making a current discrimination conclusion.

**Source correction:** `revelation` and `dramaticTurn` are independently
extracted from each scene's ordered lines before `detectPurpose` is assigned
(`fountain-analyzer.ts` Phase 1, then Phase 3). They are not position-derived
through `detectPurpose`; only `purpose` is assigned with that later
position-aware heuristic. The prior explanation and conclusion below that
said otherwise are historical and incorrect on this provenance point.

## The question

`SUSPENSE_DELTA_DEGENERACY` showed `max(suspenseDelta)` is a degenerate
climax locator (peaks at scene 0-2 on 27/27 scripts). It named three
not-disproven candidates: (a) causal-link ordering (`forwardEdgeRatio`),
(b) the `revelation` channel, (c) a `purpose==='climax'`-based locator.
This document historically evaluated (b) and (c). Its pre-tie-break results do
not currently close either candidate; sanctioned-corpus remeasurement is
required.

## What was measured

**Locator position probe (27 scripts, ~1s):** where does each candidate
signal sit as % of script on intact produced features?

| Locator | in final third (≥66%) | min/median/max |
|---|---|---|
| suspenseDelta peak (degenerate) | 0/27 (0%) | 0% / 1% / 19% |
| last revelation | 23/27 (85%) | 50% / 93% / 99% |
| last dramaticTurn | 26/27 (96%) | 62% / 97% / 100% |
| purpose==='climax' tag | 27/27 (100%) | all late |

At first glance this looks promising: revelation, dramaticTurn, and
purpose all localize late (85-100% in final third), where climaxes
actually are. suspenseDelta does not.

**Discrimination probe (11 scripts × intact/CLIMAX_RELOCATE, ~1s):** does
relocating the last scene to position 1 move these late-localizing signals
left, in the direction a bounded deduction could catch?

| Statistic | mean Δ (relocated − intact) | scripts moving left |
|---|---|---|
| lastClimaxTagPos | **−0.8%** | 2/11 |
| lastTurnPos | **−1.2%** | 2/11 |
| climaxSpread | −1.7% | inconsistent |
| suspPeakPos (baseline) | −0.8% | (degenerate) |

**No candidate moves meaningfully.** The climax tag stays at 94–99% on
both intact and relocated for nearly every script (Anastasia 99→97,
Antz 96→98, Bee_Movie 99→99).

## Why (source-level, `detectPurpose`, fountain-analyzer.ts:732-790)

`detectPurpose` is a **hybrid content+position tagger**. Its climax path
(line 749): `positionFrac >= 0.85 && maxSuspense > 0 && suspenseDelta ===
maxSuspense → 'climax'`. Because `maxSuspense` is the degenerate scene-0-2
value, the `===` test fails there, so the climax tag goes to whatever
scene is at ≥85% with any positive suspenseDelta — i.e. **the tag is
effectively position-assigned, not content-assigned**.

The consequence: when CLIMAX_RELOCATE moves the last scene to position 1,
`detectPurpose` re-runs on the new ordering and tags whatever scene now
sits at 85% as climax. The climax *zone* (the 85-100% tail) is populated
by position, so it stays populated regardless of which physical scene
moved. The relocated scene's content travels to position 1, but no rule
reads position-1 content as "this should be a climax" — the position
itself is not flagged.

This is the **mirror image** of the suspenseDelta problem:
- `suspenseDelta` is pure content: travels with the scene, but peaks wrong
  (scene 0-2, degenerate).
- `purpose==='climax'` is effectively pure position: peaks right (85-100%),
  but doesn't travel with the relocated scene.

In the historical run, neither alone discriminated CLIMAX_RELOCATE. That run
did not identify a hybrid field whose content both traveled and peaked late;
this is an observation awaiting corrected remeasurement, not a current
exhaustiveness claim.

## Historical conclusion (not a current P1 closure)

- **`purpose==='climax'` locator: historical result, not currently closed.**
  The pre-tie-break run suggested the position-aware tag did not travel with
  relocated content. Corrected sanctioned-corpus remeasurement is required
  before using that result as current evidence.
- **`revelation`/`dramaticTurn` locator: historical, not closed.** Their
  previous non-movement figures are not current evidence and the former claim
  that they were position-re-derived through `detectPurpose` was false: both
  are independently text-extracted before purpose assignment. A sanctioned
  remeasurement is required to determine their current relocation behavior.
- **Causal-link ordering (`story-graph.ts` `forwardEdgeRatio`): historical
  result, not a current closure.** The 2026-08-05 run reported
  `forwardEdgeRatio` as **1.000 on all 12 scripts, intact and relocated, with
  identical edge counts**. Those values are retained as historical context
  until rerun on the sanctioned corpus.
  Source-level why (story-graph.ts:247-258): "forward" is defined as
  `promise.seedIdx < promise.payoffIdx`, where seedIdx/payoffIdx come from
  the D6 content-derived clue lifecycle (introduction-evidence-based).
  Because the clue lifecycle *defines* seed-before-payoff by content
  evidence, the ratio is tautologically 1.000 — relocating scenes doesn't
  change which scene carries introduction evidence, so the indices don't
  change relative to each other. `forwardEdgeRatio` is a promise-payment
  metric, not an ordering metric; it cannot see reordering by construction.

### Historical ceiling hypothesis (requires remeasurement)

The prior write-up treated per-scene fields and inter-scene relationships
derived from them as invariant under reordering. That framing was too broad:
`purpose` also uses position context, and the corrected equal-peak convention
has not been remeasured on the sanctioned corpus. The table below therefore
records historical hypotheses/results, not a proven mathematical ceiling:

| Candidate category | Signal | Result | Why |
|---|---|---|---|
| Per-scene content | `suspenseDelta` peak | degenerate (0/27 late) | lexicon density, peaks on cold opens |
| Purpose tag | `purpose` | historical pre-tie-break result | assigned after extraction with position context |
| Independent per-scene text | `revelation`/`dramaticTurn` | historical pre-tie-break result | extracted before purpose assignment; requires remeasurement |
| Inter-scene (from per-scene fields) | `forwardEdgeRatio` | tautologically 1.000 | seed-before-payoff is content-defined |

The historical analysis proposed textual coherence across adjacent scenes —
for example, whether scene N's pronoun/continuation references resolve in
scene N-1 — as one candidate direction that the analyzer did not then expose.
It is not established as the sole remaining direction. No new direction or
closure claim is authorized until the corrected probe is rerun and recorded.

## Reproduction

```sh
node scripts/probe-climax-locators.mjs            # position probe, ~1s
node scripts/probe-climax-relocate-discrimination.mjs  # discrimination probe, ~1s
```

Both commands now use the latest-equal-peak probe convention. They require the
sanctioned produced-script corpus; running them in this sanitized checkout
does not reproduce the historical tables. Record the corpus version, exact
commit, and output receipt when remeasurement becomes authorized.
