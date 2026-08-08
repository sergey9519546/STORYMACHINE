# Climax-locator candidate probe — historical pre-tie-break measurement

**Status:** **SUPERSEDED AS CURRENT EVIDENCE (2026-08-08).** The 2026-08-05
probe selected the first scene at an equal `suspenseDelta` peak (`>`), whereas
the live analyzer now selects the later equal peak (`>=`). The produced-script
corpus required to remeasure was not present in this integration worktree, so
the numeric tables and closure claims below are retained only as historical
pre-tie-break observations—not current P1 evidence. Re-run
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
This document closes (b) and (c).

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

Neither alone discriminates CLIMAX_RELOCATE. A hybrid (content that both
travels AND peaks late) does not exist in the current per-scene field set.

## Historical conclusion (not a current P1 closure)

- **`purpose==='climax'` locator: CLOSED.** Position-assigned, doesn't
  travel. (This also explains why the existing `positionFrac >= 0.85`
  gate in detectPurpose never helped CLIMAX_RELOCATE AUC.)
- **`revelation`/`dramaticTurn` locator: historical, not closed.** Their
  previous non-movement figures are not current evidence and the former claim
  that they were position-re-derived through `detectPurpose` was false: both
  are independently text-extracted before purpose assignment. A sanctioned
  remeasurement is required to determine their current relocation behavior.
- **Causal-link ordering (`story-graph.ts` `forwardEdgeRatio`): CLOSED.**
  Tested 2026-08-05: `forwardEdgeRatio` is **1.000 on all 12 scripts, intact
  AND relocated, identical edge counts** — literally zero signal.
  Source-level why (story-graph.ts:247-258): "forward" is defined as
  `promise.seedIdx < promise.payoffIdx`, where seedIdx/payoffIdx come from
  the D6 content-derived clue lifecycle (introduction-evidence-based).
  Because the clue lifecycle *defines* seed-before-payoff by content
  evidence, the ratio is tautologically 1.000 — relocating scenes doesn't
  change which scene carries introduction evidence, so the indices don't
  change relative to each other. `forwardEdgeRatio` is a promise-payment
  metric, not an ordering metric; it cannot see reordering by construction.

### Historical ceiling claim (requires remeasurement)

Every field in `ScreenplaySceneRecord` is derived from each scene's own
text. Scene reordering preserves every per-scene field; therefore any
signal built only from per-scene fields (directly, or via inter-scene
relationships that derive their edges from per-scene fields — like
`forwardEdgeRatio`'s setup→payoff links) is invariant to that reordering.
This is a mathematical ceiling, not a missing rule:

| Candidate category | Signal | Result | Why |
|---|---|---|---|
| Per-scene content | `suspenseDelta` peak | degenerate (0/27 late) | lexicon density, peaks on cold opens |
| Purpose tag | `purpose` | historical pre-tie-break result | assigned after extraction with position context |
| Independent per-scene text | `revelation`/`dramaticTurn` | historical pre-tie-break result | extracted before purpose assignment; requires remeasurement |
| Inter-scene (from per-scene fields) | `forwardEdgeRatio` | tautologically 1.000 | seed-before-payoff is content-defined |

**No per-scene field, and no inter-scene relationship derived from
per-scene fields, can discriminate scene reordering.** The only thing
that can is a signal that reads the *textual coherence of adjacent
scenes* — e.g., "does scene N's pronoun/continuation references resolve
in scene N-1?" — which is a fundamentally different analyzer primitive
(this project does not currently have). That is the sole remaining
direction for closing CLIMAX_RELOCATE/SCENE_SHUFFLE to ≥0.80, and it is
new analyzer-layer engineering, not a rule or formula change.

## Reproduction

```sh
node scripts/probe-climax-locators.mjs            # position probe, ~1s
node scripts/probe-climax-relocate-discrimination.mjs  # discrimination probe, ~1s
```
