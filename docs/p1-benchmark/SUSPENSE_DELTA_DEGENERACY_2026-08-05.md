# suspenseDelta peak degeneracy — corroborating measurement

**Status:** **HISTORICAL / REQUIRES RE-MEASUREMENT (2026-08-08).** This
pre-tie-break probe used first-equal-peak selection (`>`), while live code
now uses later-equal-peak selection (`>=`). Its numeric peak-position and
closure claims remain historical only until re-run against the sanctioned
corpus with a receipt. It originally sharpened
`STRUCTURAL_SIGNAL_DIAGNOSIS_2026-07-29.md`'s general root cause
("per-scene fields are position-blind") with a specific, measured
degeneracy in the field most climax-detection code reads as a structural
locator: `suspenseDelta`.

**Not a new root cause** — the diagnosis doc already concluded
CLIMAX_RELOCATE AUC 0.490 is "a signal-layer limitation" and listed
`suspenseDelta` among the per-scene fields that cannot lift it. This
document records *why* it specifically cannot, measured on the corpus,
so the next attempt to build a climax-position rule does not start from
the disproven assumption that `max(suspenseDelta)` finds the climax.

## The measurement

Across all 27 eligible `*.fountain.txt` produced features in
`data/screenplays/`, the `suspenseDelta` peak (the `max(suspenseDelta)`
scene that `detectPurpose`, `SUSPENSE_PEAK_UNCAUSED`, `CLIMAX_*`, and
the `structuralDeduction`'s peak-finding all consume as "the climax"):

| | peak position (% of script) |
|---|---|
| min | 0% |
| 25th percentile | 0% |
| **median** | **1%** |
| 75th percentile | 1% |
| max | 19% |

- **0/27** scripts have the `suspenseDelta` peak in the final third
  (>=66%).
- **27/27** scripts have it before 60%.
- The peak value is **5 on all 27** (the clamp ceiling in
  `detectSuspenseDelta`).

## Why (source-level, `fountain-analyzer.ts:581-592`)

```js
function detectSuspenseDelta(actionLines, dialogueLines) {
  const raw = dangerHits*1 + exclamations*0.5 + emdashEllipsis*0.3
            + shortPunchy*0.4 - reliefHits*0.7;
  return clamp(Math.round(raw), -3, 5);
}
```

`suspenseDelta` is a **per-scene lexicon-density score**: danger/tension
vocabulary + exclamations + em-dashes + short punchy action lines. It
measures how "tense" a scene's *word choice* is. Produced screenplays
open with action-heavy cold opens (Toy Story's play sequence, Up's meet-
cute montage, Jaws's first attack) saturated in exactly these lexicon
hits, so scene 0-2 hits the clamp ceiling of 5 and stays there. A quiet
emotional climax at minute 110 scores 0-2. The field therefore tracks
"action vocabulary density," not "dramatic climax position."

## Consequence for any future climax-position rule

A hypothetical rule "suspense peak lands before the final third ⇒
deduction" (the obvious fix shape for CLIMAX_RELOCATE) was tested on
the corpus: it fires on **27/27 intact scripts** — i.e. it would
penalize every produced feature, not discriminate relocated from
intact. The peak is in the wrong place on real writing by construction.
No positional gate on `max(suspenseDelta)` can work until the climax
locator itself changes.

## What CAN work (directions not disproven here)

The diagnosis doc's conclusion holds: the fix is analyzer-layer,
inter-scene relationship signals, not per-scene-derived fields or any
rule weight on them. Candidates not closed by this measurement:

- A **causal-link ordering** signal (does cause precede effect across
  scenes?) — `story-graph.ts`'s `forwardEdgeRatio` is the named
  candidate; it is currently orphaned per `STORYTELLING_COVERAGE_MAP.md`.
- The **`revelation` channel** as a climax locator — revelations are
  rare, late, and content-bearing; they may localize the dramatic
  climax better than lexicon density. Untested as a locator.
- A **`purpose==='climax'`-locator** rule, IF `detectPurpose`'s climax
  tagging can be made position-aware without the current
  `positionFrac >= 0.85 && suspenseDelta === maxSuspense` path (which
  fails because `maxSuspense` is at scene 0-2, so the `===` never holds
  late). This is a `detectPurpose` change, not a scoring change.

Each of these is a separate, receipt-gated experiment requiring the
full P1 evidence protocol. This document closes the "just add a
position rule on suspenseDelta" line; it does not open any of the above.

## Reproduction

```sh
node --experimental-strip-types -e "
import { analyzeFountainText } from './server/nvm/analyze/fountain-analyzer.ts';
import { readdirSync, readFileSync } from 'fs';
for (const f of readdirSync('data/screenplays').filter(f=>f.endsWith('.fountain.txt'))) {
  const a = analyzeFountainText(readFileSync('data/screenplays/'+f,'utf8'));
  const n = a.records.length; if (n<5) continue;
  let p=-1,v=-Infinity; a.records.forEach((r,i)=>{if((r.suspenseDelta??0)>=v){v=r.suspenseDelta??0;p=i}});
  console.log(f.slice(0,30).padEnd(32), 'peak', (p/n*100).toFixed(0)+'%', 'val', v);
}"
```

Run 2026-08-05 against `data/screenplays/` (all 761 split entries
present). Full per-script table available on request.
