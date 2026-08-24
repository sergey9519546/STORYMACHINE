# Feature-scale discrimination fixtures

Three Fountain files, consumed by `tests/core/feature-scale-discrimination.test.ts`
and `tests/core/story-graph.test.ts`.

## Why these exist

`server/nvm/analyze/doctor.ts` sums two bounded deductions into `health` that
nothing in the repository could see:

| term | gate | what it claims to catch |
| --- | --- | --- |
| `arcIncoherenceDeduction` | `sceneCount >= ARC_DED_MIN_SCENES` (15) | scene ORDER collapse at feature scale |
| `dialogueDeduction` | `>= 10` dialogue lines | dialogue-diversity collapse |

Before these fixtures, **every committed script in the repository sat below the
15-scene gate**: test fixtures topped out around 16 scenes, `data/screenplays/*.fountain`
run 9-14 scenes, and the calibration corpus is 10 scenes per sample. An auditor
forced both deductions to zero and all 10,863 tests plus `npm run test:metamorphic`
stayed green — the arc term because no fixture could reach its gate, the dialogue
term because no fixture pair differed in dialogue diversity.

These three files close that hole. They are the smallest committed input on which
both terms demonstrably move the score.

## The files

| file | scenes | words | relationship to `intact` |
| --- | --- | --- | --- |
| `intact.fountain` | 21 | 1964 | the reference draft |
| `act-swapped.fountain` | 21 | 1964 | a pure PERMUTATION — acts reordered III, I, II |
| `dialogue-flattened.fountain` | 21 | 1247 | every dialogue line replaced with `Hello.` |

`act-swapped.fountain` is byte-identical to `intact.fountain` scene for scene;
only the order of the three act blocks differs. Scene count, word count, scene
headings, action lines and dialogue are all held constant, so scarcity, density
and the whole weighted-rule channel are constant too. **Narrative order is the
only free variable**, which is what makes the health difference attributable.
The test re-derives that permutation invariant at run time before it asserts on
any score, so the pair cannot silently drift into a different degradation.

`dialogue-flattened.fountain` keeps every scene heading, every action line and
the scene order; only the dialogue collapses. Word count necessarily drops —
that is the degradation, and the P1 baseline's finding was precisely that the
density channel *absorbs* that drop (DIALOGUE_FLATTEN AUC 0.54, near chance)
unless a dedicated deduction reads dialogue diversity directly.

## Shape of the intact draft

Act I (scenes 1-7) is calm and low-arousal, Act II (8-14) is a middle band of
unease, Act III (15-21) escalates to a peak at scene 19 and resolves at 21. That
rising-then-resolving shape is deliberate: it is what the act-swap destroys, and
destroying it is the thing being measured. Measured on the intact file,
`rampCorrelation` +0.69 and `arcHealth` 2.95 (comfortably above the deduction's
`ARC_DED_REF` of 1.2); on the act-swapped file, `rampCorrelation` -0.41 and
`arcHealth` 0.71 (a 3.9-point deduction).

The `intact` draft also seeds one rare recurring object — a **locked ledger** in
scene 4 — and pays it off in scene 21 (`confess ... the ledger pages`). In the
intact order that reads as setup-then-payoff; in the act-swapped order the
resolution language lands *before* the introduction, which is the inversion
`applyClueLifecycle` represents as `payoffScene < seedScene`. That is what moves
the story-graph metrics, and it is why the act-swapped file has no paid promise.

## Regenerating the derived files

`act-swapped.fountain` and `dialogue-flattened.fountain` are mechanical
derivations of `intact.fountain`. If `intact.fountain` is ever edited, both
derived files must be regenerated; the test's permutation and flatten invariants
will fail loudly if they are not.

## Provenance

Original work, agent-authored 2026-08-24, contributed to STORYMACHINE as
committed test data under CC0 (public domain dedication). No copyrighted
material. This is synthetic prose written to exercise a scoring gate — it is
not a substitute for professionally-authored "real writing" in P1's validation
sense, and no claim about the score's validity on real drafts rests on it.

Note the fixtures carry a Fountain title page but **no `//` comment block**.
The analyzer treats pre-first-slug text as scene-0 prose: a comment header is
counted in `wordCount` and can even seed phantom clues (every
`data/screenplays/*.fountain` file currently seeds `real-writing`, `storymachine`,
`agent` and `authored` out of its own licence header). Keeping the header to the
title page is what makes `intact` and `act-swapped` word-count-identical.
