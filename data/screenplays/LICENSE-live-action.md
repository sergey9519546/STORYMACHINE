# LICENSE — Live-Action Screenplays (STORYMACHINE benchmark corpus)

This file documents the license and provenance of every live-action screenplay
added to `data/screenplays/` in the 2026-07-28 corpus-diversity expansion.

The pre-existing 52-script corpus in this directory is animation-only. The
files listed below are **original, author-contributed live-action screenplays**
added to give P1's discrimination benchmark genre diversity beyond animation.

## License: CC0 1.0 Universal (Public Domain Dedication)

Every file listed in this manifest is dedicated to the public domain under the
terms of CC0 1.0 Universal:

> https://creativecommons.org/publicdomain/zero/1.0/legalcode

To the greatest extent possible under law, the author(s) have waived all
copyright and related or neighboring rights to these works. You may copy,
modify, distribute, and perform the works, even for commercial purposes,
all without asking permission.

## Provenance

Each screenplay below is an **ORIGINAL work** written in 2026 specifically for
the STORYMACHINE benchmark corpus. None is copied from, adapted from, or based
on any real, produced, copyrighted, or publicly-distributed screenplay. Every
premise, character name, location, and line of dialogue was authored for this
corpus. This is the same provenance model the engine's calibration corpus at
`server/nvm/analyze/calibration/corpus.ts` (20 original hand-authored samples)
already uses.

## Why original CC0 contributions instead of public-domain or scraped scripts

The task explicitly considered three legal sources: (1) pre-1928 public-domain
silent-era screenplays, (2) Creative-Commons-licensed scripts, and (3)
author-contributed drafts. Pre-1928 silent-era scripts largely exist only as
intertitle fragments or archival reconstructions, not clean parseable Fountain;
no CC-licensed live-action feature screenplays of usable quality were
available; and redistributing copyrighted produced screenplays (even those
widely hosted on IMSDB/SimplyScripts) is NOT licensed and was explicitly
forbidden. Original CC0 author-contributed drafts are the most reliable
source: the license is fully controlled and the format is clean.

## Controlled-richness design (read before judging a band)

These scripts follow the calibration corpus's controlled-richness experimental
design: every sample carries dialogue, action, at least one clock/deadline
mention, at least one planted setup (a quoted clue or note), and a
two-character relationship beat (an old grievance surfacing). The bands differ
ONLY in how well those elements are executed. This is so the corpus tests
**craft discrimination**, not richness discrimination. A barren script missing
the clock/clue/relationship beat is not a legitimate weak/troubled sample under
this design — it reintroduces a richness confound.

## File manifest

| File | Genre | Quality band | Scenes | Words | Craft notes |
|------|-------|--------------|--------|-------|-------------|
| `dead-frequency.fountain` | Radio-noir thriller | strong | 12 | ~1830 | Clue paid off late; revelation past midpoint; clock honored in both halves; escalating danger into climax; full relationship arc (rupture → earned reconciliation). |
| `counter-offer.fountain` | Corporate real-estate thriller | strong | 10 | ~1520 | Second-deed clue resolved at climax; deadline honored; revelation past midpoint; full relationship arc between mentor and protégée. |
| `runoff.fountain` | Environmental procedural | strong | 9 | ~1450 | Buried citizen-complaint clue paid off at the inspector confrontation; deadline honored; procedural source-finding escalation; earned reconciliation. |
| `off-season.fountain` | Coastal family drama | competent | 9 | ~760 | Real but deliberate flaws: clue pays off early (~scene 6); two flat midsection "nothing new" beats; thin Act-3 reconciliation. |
| `transfer-window.fountain` | Sports management drama | weak | 10 | ~460 | Clock stated once and never followed up; clue addressed flatly/procedurally; two scenes repeat the same beat; relationship rupture unresolved. Richness held constant per band design. |
| `room-12.fountain` | Hotel mystery | troubled | 10 | ~430 | Clock stated then flatly contradicted when deadline passes; clue seeded and genuinely orphaned; four consecutive recycled beats; no revelation; interchangeable voices; cliche lexicon. Richness held constant per band design. |

Scene and word counts above were measured by
`server/nvm/analyze/fountain-analyzer.ts`'s `analyzeFountainText()` and
confirmed to parse cleanly with `sceneCount >= 5` and no truncation.

## In-file marking

Each screenplay's first line is a Fountain preamble comment marking its
provenance and license, e.g.:

```
// Original work contributed to STORYMACHINE benchmark, CC0 (public domain dedication).
```

This preamble is folded into scene 0 by the fountain parser and does not affect
scene detection or analysis.
