# Report truth at the scoring seam — measurement record

**Branch:** `scoring/adversarial-2026-09-12`.
**Answers:** `docs/audits/2026-09-12-adversarial/writer-loop.md` findings 12 and 13.
**Reproduce:** `node --experimental-strip-types tests/core/report-seam.test.ts` ·
`node scripts/check-doctor-output-identity.mjs`.
No private corpus was read; no AUC-24 value appears here.

## 1. "A handful of minor notes" over 342 issues (finding 12)

`buildDimensionSummary`'s `excellent`/`strong` branch was a fixed string with no
count in it, while the caption directly beneath it in the panel stated the real
one. The three lower branches already interpolated `dominantCount` correctly;
the top two were the exception.

| input | dimension | rendered together |
|---|---|---|
| 231-scene fixture | Character | "a handful of minor notes" · **342 issues** |
| 231-scene fixture | Plot Logic & Payoff | "a handful of minor notes" · **278 issues** |
| 231-scene fixture | Structure & Pacing | "a handful of minor notes" · **175 issues** |
| sample | Plot Logic & Payoff | "a handful of minor notes" · **58 issues** |

Every branch now states its count, and above twelve notes the sentence adds the
one clause that makes it credible rather than contradictory:

> Plot Logic & Payoff is in good shape — 169 minor note(s), mostly around
> exposition dump — the score is density-normalised, so a long draft can read
> well with many notes.

The density-normalised score legitimately reads 95/100 over 342 notes at feature
scale. Saying so is more honest than "a handful", which was the only word in the
sentence a reader could check and the only one that was false. `handful` no
longer appears in any copy `buildDimensionSummary` emits; the remaining
occurrences under `server/**` are rule descriptions about content ("circling a
handful of words"), not counts.

## 2. A defect concentrated in one scene did not reach the triage (finding 13)

Fixture: `tests/fixtures/localisation/one-bad-scene.fountain` — eleven
near-identical clean scenes plus one scene carrying fourteen exchanges of "As
you know, Boris" exposition. Committed CC0, with its reason in its own header.

**Before.** The ranked list sorted by severity, then by pass order. All ten
slots went to act-shape checks that fire on nearly every short script, and
scene 12 did not appear:

```
1  CRITICAL MISSING_INCITING_INCIDENT   Act 1 (Scenes 1–3)
2  CRITICAL PASSIVE_ACT3_INTENTION      Act 3 (Scenes 10–12)
3  CRITICAL NO_REVERSALS_LONG_STORY     Conflict layer
4  MAJOR    WEAK_MIDPOINT               Scene 7 (midpoint)
5  MAJOR    NO_REVERSALS                Overall structure
6  MAJOR    ACT1_BOUNDARY_WEAK          End of Act 1 (Scene ~4)
7  MAJOR    ACT2_BOUNDARY_WEAK          End of Act 2 (Scene ~10)
8  MAJOR    REVELATION_DROUGHT          Scenes 1–4
9  MAJOR    REVELATION_DROUGHT          Scenes 5–8
10 MAJOR    REVELATION_DROUGHT          Scenes 9–12
```

The engine **did** detect it. Five separate rules name Scene 12 by itself
(`FINAL_IMAGE_WEAK`, `DIALOGUE_VERBAL_PEAK_UNCAUSED`, `OVERLONG_LOW_TENSION`,
`PACING_SPIKE_SCENE`, `TONAL_WHIPLASH`) and the scene heatmap gives it five
issues against a median of one. The ranking had no notion of *where* a finding
is, so none of it surfaced.

**After.**

```
1  CRITICAL MISSING_INCITING_INCIDENT   Act 1 (Scenes 1–3)
2  CRITICAL PASSIVE_ACT3_INTENTION      Act 3 (Scenes 10–12)
3  CRITICAL NO_REVERSALS_LONG_STORY     Conflict layer
4  MAJOR    AS_YOU_KNOW_BOB             Line 156 (MARA)
5  MAJOR    AS_YOU_KNOW_BOB             Line 159 (BORIS)
6  MAJOR    OVERLONG_LOW_TENSION        Scene 12 (INT. BACK ROOM - NIGHT)
7  MAJOR    PACING_SPIKE_SCENE          Scene 12 (INT. BACK ROOM - NIGHT)
8  MAJOR    WEAK_MIDPOINT               Scene 7 (midpoint)
9  MAJOR    ZERO_ENTROPY_SCENE          Scene 7 (INT. LOBBY - NIGHT)
10 MAJOR    ACT1_BOUNDARY_WEAK          End of Act 1 (Scene ~4)
```

### 2.1 The rule

Severity still leads — a critical is a critical, and that is asserted. Within
one severity: a finding anchored to ONE scene outranks a narrow span, which
outranks a whole-draft check; and among single-scene findings, the ones in the
scene carrying the most findings come first. Ties fall back to pass order and
then original index, so the sort is a total order and the report stays
byte-deterministic.

The scene footprint is read with `cluster.ts`'s own `spanSceneIdxs` over
`locate.ts`'s resolved spans — the same two functions the root-cause pipeline
uses — rather than a second parse of the location grammar. That grammar has
already drifted once (a range like "Act 3 (Scenes 11–14)" carries no "Scene N"
token to parse), and a private copy here would drift again.

### 2.2 The over-correction, measured and capped

The first version of the ranking produced the mirror image of the reported
defect: **seven** of the ten slots became `AS_YOU_KNOW_BOB` at seven
consecutive line numbers. A writer learns no more from seven copies of a note
than from none of it. At most two instances of one rule are taken on the first
pass, and the cap relaxes rather than shortening the list, so output length is
unchanged for every script that never hits it.

A binary "hot scene" test was also tried and rejected by measurement: the
per-scene single-anchor counts on this fixture are
`[6, 1, 1, 2, 1, 1, 3, 1, 1, 2, 1, 34]`, and five of the twelve scenes clear
twice the median. The defect scene is not merely above a threshold, it is an
order of magnitude above every other scene, and a threshold threw that away.
The count itself is the sort key.

### 2.3 What it does NOT fix

A pass that reports its location as "Dialogue throughout" when every instance
sits in one scene is still invisible to this ranking, because the issue record
carries a location **string** and nothing else. The review's own suggestion —
resolve those to the scene span the instances occupy — needs the emitting
passes to carry a span they already know internally, which is a change across
all fourteen passes. **Open.** On this fixture the defect surfaces anyway,
through the line-anchored `AS_YOU_KNOW_BOB` instances and the four scene-anchored
pacing and voice findings; on a draft where the only evidence is a "throughout"
location, it would not.

## 3. A correction to the previous commit: blanked, not deleted

Stripping non-printing text and the title page originally **removed** those
lines from the analysis text. That shifted every issue location below them:
on this fixture, `AS_YOU_KNOW_BOB` reported line 142 where the writer's own file
has it at 156, because the fixture's 18-line provenance boneyard had been
deleted from the text `locate.ts` measures.

Both strippers now **blank** the lines instead. A blank line is already an exact
score invariant (it parses as an `empty` block, which `extractSceneContent`
skips and no rule reads), so the eleven format transforms stay at 0 of 32 — and
the line numbering the writer's editor shows is preserved. `report-seam.test.ts`
asserts that every line-anchored finding points at a line of the writer's file
that actually contains the defect.

## 4. Blast radius

The public benchmark is **unchanged** — all six AUCs, all six intervals, all
three sign-count triples: `SHUFFLE_DROP` 0.8438 / 0.7896 (27/5/0),
`CLIMAX_RELOCATE` 0.5938 / 0.5234 (18/12/2), `DIALOGUE_FLATTEN` 1.0000 / 0.9814
(32/0/0). No health, verdict, grade, scene count or severity mix moves anywhere.

Output identity against the previous commit is `PASS` modulo exactly these keys,
named rather than summarised:

| key | fixtures differing |
|---|---|
| `dimensions.*.summary` | 45 / 45 — the count copy |
| `topPriorities` | 45 / 45 — the ranking |
| `passes.*.issues` | 24 / 45 — line numbers restored by §3 |
| `antiSlop.screenplayAIMarkers.detection.lines` | 5 / 45 — same cause |
| `plainSummary` | 3 / 45 — it quotes `topPriorities[0]` |
| `strengths` | 0 / 45 |
| `antiSlop.screenplayAIMarkers.detection.count` | 0 / 45 |
| `provenance.engineCommit` | 45 / 45 — the baseline is a `git archive` tree |

Everything else in all 45 reports is byte-identical.

## 5. The guard shown failing first

`tests/core/report-seam.test.ts` copied unchanged onto the previous commit's
tree: **7 of 11 fail**. Here: 11 of 11 pass.

## 6. What the owner's run can and cannot settle

Nothing in this commit moves a scored number, so AUC-24 cannot move because of
it. What the owner's corpus **would** settle is whether the concentration
ranking helps on feature-length real drafts, where a scene is a smaller share of
the document and "the scene carrying the most findings" may be less decisive
than it is at twelve scenes. That is a question about usefulness, not
correctness, and the instrument for it is P0 — writers reading their own
reports — not an AUC.
