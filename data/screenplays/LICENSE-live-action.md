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
| `dead-frequency.fountain` | Radio-noir thriller | strong | 12 | ~1830 | Clue paid off late; revelation past midpoint; clock honored in both halves; escalating danger into climax; full relationship arc (rupture → earned reconciliation). **DUAL ROLE (2026-08-04): also the built-in P0 sample stimulus** (`src/lib/sample-script.ts`, "Dead Frequency") — chosen as the closest-to-band words/scene (152.6, vs. the 761-script corpus's ~161–181 median) among corpus candidates that also clear the >=12-scene preference, replacing the prior thin sample ("The Second Key," ~47.5 words/scene). It remains a live P1 discrimination-corpus member; nothing here was removed or altered for its P0 use. See `docs/user-validation/FIELDING_DECISION_BRIEF.md`'s 2026-08-04 "RESOLVED" addendum for the full comparison table. |
| `counter-offer.fountain` | Corporate real-estate thriller | strong | 10 | ~1520 | Second-deed clue resolved at climax; deadline honored; revelation past midpoint; full relationship arc between mentor and protégée. |
| `runoff.fountain` | Environmental procedural | strong | 9 | ~1450 | Buried citizen-complaint clue paid off at the inspector confrontation; deadline honored; procedural source-finding escalation; earned reconciliation. |
| `off-season.fountain` | Coastal family drama | competent | 9 | ~760 | Real but deliberate flaws: clue pays off early (~scene 6); two flat midsection "nothing new" beats; thin Act-3 reconciliation. |
| `transfer-window.fountain` | Sports management drama | weak | 10 | ~460 | Clock stated once and never followed up; clue addressed flatly/procedurally; two scenes repeat the same beat; relationship rupture unresolved. Richness held constant per band design. |
| `room-12.fountain` | Hotel mystery | troubled | 10 | ~430 | Clock stated then flatly contradicted when deadline passes; clue seeded and genuinely orphaned; four consecutive recycled beats; no revelation; interchangeable voices; cliche lexicon. Richness held constant per band design. |

Scene and word counts above were measured by
`server/nvm/analyze/fountain-analyzer.ts`'s `analyzeFountainText()` and
confirmed to parse cleanly with `sceneCount >= 5` and no truncation.

## In-file marking

Each screenplay opens with a Fountain **boneyard** comment carrying its
provenance and license:

```
/*
Original work contributed to STORYMACHINE benchmark, CC0 (public domain dedication).
...
*/
```

`parseFountain` types every line between `/*` and `*/` as `boneyard`, and
`fountain-analyzer.ts` skips boneyard blocks, so the licence text is preserved
in the file and invisible to the analysis.

> **CORRECTED 2026-09-04.** This section previously described the marking as a
> `//`-prefixed "Fountain preamble comment" and asserted that it "is folded into
> scene 0 by the fountain parser and does not affect scene detection or
> analysis." **That was wrong, and it is the belief that caused the defect.**
> `//` is not Fountain comment syntax — the boneyard `/* */` is
> (`src/lib/fountain.ts:110`) — so `parseFountain` typed those header lines
> `action`, `segmentScenes` folded them into scene 0 *as screenplay text*, and
> they were scored. Measured consequences: 10 of these 20 headers contained
> danger-lexicon words, which raised scene 1's `suspenseDelta` on 13 of 20
> scripts and made scene 1 the sole peak-suspense scene of 9 of them; 106 of the
> corpus's 237 detected clue "seeds" (44.7%) were header tokens. The headers were
> converted to real boneyards on 2026-09-04 with the text preserved verbatim.
> Full measurement and the reports that moved:
> `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`, 2026-09-04.
> `tests/core/fixture-provenance-comment-guard.test.ts` now enforces both halves
> of the rule — no `//` line in any fixture, and the CC0 declaration still
> present inside the boneyard.
>
> The `Words` column above is unchanged and remains approximate. Note that
> `fountain-analyzer.ts`'s `wordCount` counts the RAW file, boneyard included —
> no Fountain comment syntax hides text from it — so those figures still include
> the licence text (e.g. `the-key-under-the-mat` counts 890 words against a
> 739-word screenplay). That residual is recorded as an open finding in the same
> receipt.

## 2026-08-04 expansion — truth-extraction recall testbed + weak-band contrast material

Fourteen more screenplays were added under the same CC0 dedication and the
same force-add mechanism (the entire `data/` directory is gitignored by
design; these files are `git add -f`'d individually because they are
redistributable originals, exactly like the six files above). See
`docs/p1-benchmark/CC0_CORPUS_EXPANSION_2026-08-04.md` for the full method,
per-script parse verification, and measurement results.

**HONESTY NOTE, stated plainly:** all fourteen scripts below were written by
an AI agent (Claude), not a human screenwriter. They are mechanism-test
material for `server/nvm/analyze/truth-extraction.ts`'s recall/precision
measurement and P1's missing weak-craft contrast band — they are NOT a
substitute for professionally-authored "real writing" in P1's validation
sense, and must not be cited as such. The existing six scripts above carry
the same caveat implicitly (see "author-contributed drafts" in the
Provenance section) but it is repeated here explicitly per this expansion's
task brief.

Six scripts (thriller/action) each stage an on-page death of a speaking
character in explicit action text, phrased six different ways to measure
`truth-extraction.ts`'s death-cue lexicon recall — some phrasings were
chosen to match the lexicon, some deliberately were not, to produce an
honest miss-list rather than a curated one. Two of the six additionally
place the dead character in a later, explicitly marked FLASHBACK scene,
to test whether the non-literal-scene exclusion guard actually prevents a
false contradiction (verified directly: stripping the `(FLASHBACK)` marker
from either script's heading turns 0 contradictions into 1 — see the
results doc). Four scripts are competent, genre-varied, death-free dramas
and comedies — clean negative material. Four scripts are DELIBERATELY WEAK,
each labeled with one specific craft failure in its header comment (flat
stakes never raised, a setup promised and never paid off, interchangeable
character voices, a wandering midsection) — the weak-craft contrast class
every prior P1 document names as a real gap in this corpus.

| File | Genre | Category | Scenes | Words | Notes |
|------|-------|----------|--------|-------|-------|
| `red-line.fountain` | Home-invasion thriller | death (HIT), flashback | 14 | ~990 | Gunshot, "kills NAME" cue. |
| `undertow.fountain` | Lake-house thriller | death (MISS) | 12 | ~890 | Drowning; "drowns" is not in the death-cue lexicon at all. |
| `chain-of-custody.fountain` | Courier/freight procedural | death (HIT) | 13 | ~830 | Body discovered; "NAME's corpse" cue. |
| `code-blue.fountain` | Medical/corporate thriller | death (HIT), flashback | 14 | ~960 | Hospital flatline, "NAME is dead" cue. |
| `close-quarters.fountain` | Domestic thriller | death (HIT) | 13 | ~845 | Stabbing, "stabs NAME to death" cue. |
| `high-voltage.fountain` | Industrial-sabotage thriller | death (MISS) | 13 | ~940 | Electrocution; no lexicon entry for this cause of death at all. |
| `soft-launch.fountain` | Tech-startup workplace comedy | competent, no death | 12 | ~970 | Clean negative material. |
| `mise.fountain` | Restaurant kitchen drama | competent, no death | 12 | ~920 | Clean negative material. |
| `the-defense-rests.fountain` | Legal dramedy | competent, no death | 12 | ~960 | Clean negative material. |
| `two-lane.fountain` | Road-trip dramedy | competent, no death | 13 | ~1010 | Clean negative material. |
| `quiet-season.fountain` | Small-business drama | weak — flat stakes never raised | 10 | ~680 | Labeled weakness in file header. |
| `the-key-under-the-mat.fountain` | Family inheritance drama | weak — setup never paid off | 11 | ~900 | Labeled weakness in file header. |
| `same-page.fountain` | Workplace comedy | weak — interchangeable voices | 11 | ~815 | Labeled weakness in file header. |
| `the-detour.fountain` | Outdoors/friendship drama | weak — wandering midsection | 11 | ~760 | Labeled weakness in file header. |

Scene and word counts above were measured the same way as the original six
(`analyzeFountainText()`), confirmed to parse cleanly with the intended
scene count and no truncation — see the results doc for the exact per-file
figures and the command used to reproduce them.
