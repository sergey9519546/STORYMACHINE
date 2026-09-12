# Bounding the voice pair grid — measurement record, and what it means for the shape guard

**Branch:** `scoring/adversarial-2026-09-12`.
**Answers:** `docs/audits/2026-09-12-adversarial/engine-logic.md` finding 10 —
the ANALYZER half. The guard constant is a sibling lane's work and is not
touched here.
**Reproduce:** `node --experimental-strip-types tests/core/voice-pair-cap.test.ts`.
No private corpus was read; no AUC-24 value appears here.

## 1. The defect

`analyzeVoices` computes a Burrows's-Delta pair grid over every eligible
speaker — O(distinct²). The repository's answer to that cost has been the shape
guard `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT`, which refuses to analyze the
document at all. Measured on `main @ 8aa1f696`, a normally-shaped 110-page
feature with Zipf-distributed dialogue totalling ~15,000 words over 120 scenes:

| cast | chars | `main` (bound 300,000) | this branch (bound 1,500,000) |
|---|---|---|---|
| 15 | 83,985 | ACCEPTED, 2,390 ms | ACCEPTED, 497 ms |
| **20** | 84,129 | **REJECTED** | ACCEPTED, 417 ms |
| 30 | 84,201 | **REJECTED** | ACCEPTED, 417 ms |
| 40 | 84,108 | **REJECTED** | ACCEPTED, 390 ms |
| 60 | 84,165 | **REJECTED** | ACCEPTED, 395 ms |

Twenty speaking characters who each say more than thirty words is an ordinary
ensemble feature — a heist, a courtroom drama, a war film, a TV pilot. On `main`
the writer gets "trim the cast or split the draft" and no analysis at all.

## 2. The fix: bound the work

`MAX_VOICE_SCORED_SPEAKERS = 40`. The grid covers the forty eligible speakers
with the most pooled dialogue; every other eligible speaker is reported by name
in a new `voiceAnalysis.notVoiceScoredCharacters`, and the document is analyzed
by every other pass either way.

Forty, because that is the cast the review names as the thing that must get a
score, and because forty speakers is 780 pairs — the grid stops growing there
whatever the document does. It is a WORK bound, not a quality threshold: nothing
about a forty-first speaker is judged, and they are named so a partial matrix is
never unexplained.

`notVoiceScoredCharacters` is deliberately a DIFFERENT field from
`excludedCharacters`, which keeps its meaning ("under the 30-word floor, no
voice to compare"). Both come back in the input's key order; the selection sorts
a copy by pooled word count and breaks ties on input order, so the report stays
byte-reproducible. Asserted in `voice-pair-cap.test.ts`.

The panel's Voice Separation tile names both lists, in two clauses, so a writer
whose cast exceeds the cap reads why rather than seeing a short matrix.

## 3. What it costs

`analyzeVoices` alone, on the review's own worst shape (`cast` speakers, 30
words each):

| cast | pairs, uncapped | ms, uncapped | pairs, capped | ms, capped |
|---|---|---|---|---|
| 20 | 190 | 4.8 | 190 | 4.8 |
| 40 | 780 | 8.7 | 780 | 7.8 |
| 100 | 4,950 | 45.3 | **780** | **9.0** |
| 223 | 24,753 | 189.7 | **780** | **9.3** |
| 500 | 124,750 | 945.6 | **780** | **11.8** |

End to end, on the sibling review's exact document shape (each cue followed by
five six-word paragraphs, 40 cues per scene — the double-spaced wrap shape, so
`normalizeScreenplay` reflows every paragraph into dialogue):

| cast | chars | `runScriptDoctor` before the cap | after |
|---|---|---|---|
| 100 | 22,352 | 121 ms | 86 ms |
| 223 | 49,967 | 300 ms | **139 ms** |
| 500 | 112,165 | 1,268 ms | **357 ms** |
| 1200 | 269,539 | 7,130 ms | **1,543 ms** |

The grid is now flat in cast size, and the residual growth is the other
thirteen passes.

## 4. THE COORDINATION POINT: the 27.3 s figure is a `main` measurement

`docs/audits/2026-09-12-adversarial/rulebook-review.md` records that
`MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT = 1,500,000` admits a 223×30 document whose
analysis costs **27.3 s** on that reviewer's box (≈36 s scaled to the lane's),
over the 30 s analysis budget. That measurement is correct and it is a
measurement of a scorer this branch has already replaced.

Measured here, same shape, same recipe:

| tree | cast 100 | cast 223 |
|---|---|---|
| `main @ 8aa1f696` | 5,919 ms | REJECTED (bound 300,000) |
| this branch, before the cap | 121 ms | **300 ms** |
| this branch, after the cap | 86 ms | **139 ms** |

`scoring/feature-length-defects` already landed the per-character abstention
rewrite (42,062 ms → 191 ms on a 200-name payload). On this base the 223×30
document is **91× cheaper end to end** than the number the bound is being
re-derived from, and with the cap it is **196× cheaper**. A 1,200-speaker
document — five times past anything the guard admits — costs 1.5 s.

**What follows, and what does not.**

* It does **not** follow that 1,500,000 is safe. The sibling lane
  (`lane/rulebook-and-guard-bound`) re-derived the bound from cost to
  **675,000**, and that derivation is the right METHOD whatever tree it is run
  on. This lane changes no constant in `server/lib/validation.ts` — two lanes
  editing one bound from two different cost models is how a bound stops meaning
  anything.
* It does follow that **the bound should be re-derived on the merged tree, not
  on `main`**, and that the analyzer cap should land first. A cost-derived bound
  measured against an O(distinct²) grid is a bound against a cost that no longer
  exists once the grid is flat.
* The combination the owner should measure is **the analyzer cap plus a
  cost-derived bound**: the cap removes the shape's superlinear term, and the
  bound then only has to cover the thirteen other passes, which are linear in
  document size. On this base that is 1.5 s at cast 1,200 and 269 KB.

## 5. Blast radius

The public benchmark is **unchanged** — 0.8438 / 0.7896, 0.5938 / 0.5234,
1.0000 / 0.9814. No fixture in the repository has a cast above forty except two
synthetic scene-count fixtures, and on those the change is confined to
`voiceAnalysis`:

| fixture | health | pairs | named as not voice-scored | everything outside `voiceAnalysis` |
|---|---|---|---|---|
| `synthetic/240-scenes` | 77.7 → **77.7** | 1,770 → 780 | 20 | byte-identical |
| `synthetic/300-scenes` | 79.5 → **79.5** | 2,145 → 780 | 26 | byte-identical |

Output identity over all 45 fixtures is `FAIL` on the raw compare and PASS
modulo two keys — `provenance.engineCommit` and the newly added
`voiceAnalysis.notVoiceScoredCharacters`, which `--require-added` confirms is
present in every AFTER report and absent from every BEFORE one — except for
those two fixtures, where `voiceAnalysis.pairs` legitimately shrinks.

## 6. The guard shown failing first

`tests/core/voice-pair-cap.test.ts` on the previous commit's tree, with the
missing constant stubbed to 40 so the file imports: **5 of 9 fail**. Here 9 of 9
pass. The four that pass on both are the 20/30/40-character ensembles and the
under-cap invariance — the ensembles pass because this branch's base already
raised the bound to 1,500,000; on `main` they are REJECTED, which is §1's table.

## 7. What the owner's run can and cannot settle

No fixture in the private corpus is likely to have a cast above forty, so AUC-24
should not move. What the owner's run **can** settle is whether any real
screenplay in that corpus does — and if one does, its voice section changes here
and nothing in this repository can predict it. What the run **cannot** settle is
the value of the guard's bound: that is a cost measurement on a chosen document
shape, and it belongs on the merged tree with this cap in place.
