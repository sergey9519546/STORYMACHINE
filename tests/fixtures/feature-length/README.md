# Feature-length fixture

`assembled-feature.fountain` — **231 scenes, ~19,300 words, ~114 KB**. The one
input in this repository at the length the product is actually used at.

## Why it exists

Until 2026-09-06 the largest committed Fountain file anywhere under version
control was **12 scenes / 10,861 B**
(`tests/fixtures/feature-scale-discrimination/intact.fountain`).
`data/screenplays/` is twenty shorts of 9–14 scenes; the built-in P0 sample is
12 scenes; the calibration corpus is twenty short samples; every browser suite
ran on short form. Four defects that only appear at feature length shipped as a
direct result of that gap — the worst of them an infinite React render loop
that fired the moment a writer typed a new scene into a feature draft after
running coverage (reproduced 5/5 on this fixture, 0/5 on the 12-scene short;
see `tests/core/scriptide-render-loop-guard.test.ts` for the mechanism and
`docs/brain/Patterns.md` for the pattern).

## What it is — and what it is NOT

It is the bodies of **all twenty CC0 live-action screenplays** in
`data/screenplays/`, concatenated in lexicographic filename order behind one
title page and one provenance boneyard. That makes it a **deliberately
incoherent assembly**: twenty unrelated stories, no throughline, no
protagonist, no act structure, no meaning across the seams.

**Nothing may read craft meaning off it.** Its health score, grade, verdict and
issue counts are properties of a concatenation, not of writing, and must never
be quoted as a discrimination measurement — that is what
`docs/p1-benchmark/` and the real-corpus harness exist for. The legitimate
assertions over this file are structural and scale-shaped:

* scene count and document size,
* finding volume and how many findings resolve to a span,
* render, analysis and interaction behaviour at length,
* whether a surface that works at 12 scenes still works at 231.

The file says all of this in its own boneyard header, so a reader who opens it
without this README still gets the warning.

## Regenerating it

```
node scripts/build-feature-length-fixture.mjs          # rewrite the fixture
node scripts/build-feature-length-fixture.mjs --check  # verify, exit 1 on drift
```

The assembler is deterministic — lexicographic source order, verbatim bodies,
a fixed header, no clock and no randomness — and
`tests/core/feature-length-fixture.test.ts` asserts the committed bytes equal a
fresh assembly. Edit a source screenplay in `data/screenplays/` and that test
fails until the fixture is regenerated, which is the point: nothing should be
able to change what "feature length" means in every suite that loads this file
without saying so in a diff.

## Licence

Every source is dedicated to the public domain under **CC0 1.0 Universal**; see
`data/screenplays/LICENSE-live-action.md`, which is also the record of their
provenance (all originals written for this benchmark corpus, none adapted from
any produced or copyrighted screenplay). Fourteen of the twenty are
agent-authored (Claude, 2026-08-04) and are mechanism-test material, not
professionally-authored writing — this assembly inherits both the dedication
and that caveat in full.

## Is it in the output-identity fixture set?

**No, deliberately.** `scripts/check-doctor-output-identity.mjs` enumerates
`tests/fixtures/*.fountain` **non-recursively** (its `readdirSync` walk does not
descend), so a file in this subdirectory does not join the 45-fixture set
(20 screenplays + 20 calibration samples + the P0 sample + 4 synthetic
concatenations) and **no receipt needs re-locking** for it.

That is the right outcome, not an accident of placement:

* the harness ALREADY covers feature scale — it synthesises
  `synthetic/{60,120,240,300}-scenes` from the same `data/screenplays/` bodies
  for exactly this purpose, so adding a 231-scene fixture would add cost and
  no new coverage;
* a byte-level identity snapshot of a 231-scene report is large, and every
  future scoring change would have to carry it through a re-lock for a document
  whose numbers nobody is allowed to interpret anyway (see "what it is NOT");
* this fixture's job is to be *driven* — by the browser suites and by
  `tests/core/finding-jump.test.ts` — not to be a frozen byte snapshot.

If a future change genuinely needs identity coverage at this exact document,
move the file to `tests/fixtures/` (top level) and re-lock the receipts
deliberately, rather than discovering the re-lock as a surprise.

## Is there a coherent feature-length fixture too?

**No, and one cannot be made from this repository's material legally.** A
coherent feature would be the ideal control for the "length beats coherence"
finding (a 231-scene assembly of unrelated shorts currently outscores every one
of its own parts). It is not available:

* the twenty CC0 sources are twenty separate stories — any subset concatenated
  is still incoherent, in the same way and for the same reason;
* `data/screenplays/LICENSE-live-action.md` already records the search for
  legally redistributable long-form screenplay text and its outcome:
  pre-1928 public-domain scripts survive mostly as intertitle fragments, no
  CC-licensed live-action features of usable quality were found, and
  redistributing copyrighted produced screenplays is not licensed and is
  explicitly forbidden here;
* authoring 120 coherent pages inside a lane and calling the result
  "genuinely coherent" would be a claim this repository could not defend — and
  the corpus doc's own honesty note about agent-authored material already
  says why.

So the coherent counterpart is an **owner item** (commission or licence a real
feature-length draft), recorded here rather than faked.
