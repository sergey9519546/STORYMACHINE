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

## The doc-tier variant — `assembled-feature-doc-tier.fountain` (2026-09-21)

The same twenty CC0 bodies, assembled by the same builder, in a **seeded
order** instead of the lexicographic one:

```
node scripts/build-feature-length-fixture.mjs --variant=doc-tier          # write it
node scripts/build-feature-length-fixture.mjs --variant=doc-tier --check  # verify
```

`--variant=doc-tier` is shorthand for `--order=seed:6` with
`--out=tests/fixtures/feature-length/assembled-feature-doc-tier.fountain`
(`DOC_TIER_VARIANT` in the builder). The order is a mulberry32-seeded
Fisher–Yates permutation of the lexicographic list, so it is the same on every
machine; `tests/core/feature-length-fixture.test.ts` byte-checks it exactly as
it checks the primary, and asserts the default order still writes the primary
byte-for-byte.

**Why it exists.** `tests/core/coverage-next-fix-jump-honesty.test.ts`
reproduces adversarial finding #5 (2026-09-12): a top priority the server
resolves to the DOCUMENT tier, for which the "next fix" card must show an honest
"no location" note rather than borrow the first root cause's line envelope. On
the primary fixture that situation stopped existing under the feature-length
scoring candidate — the ORPHAN_CLUE name/title guard (`e5e2b534`) makes its top
priority a line-anchored `REVELATION_WITHOUT_SETUP` at Scene 15 and shrinks the
first root cause's envelope from 87.9 % of the file to 5.1 %. A bounded search
over twelve orders (reverse, then seeds 1–11; table in
`docs/audits/2026-09-20-feature-length-defects-prep/README.md` § 2026-09-21 E3)
found seed 6 as the first order under which the top priority is
`NO_REVERSALS_LONG_STORY` at "Conflict layer" (document tier) and the first
root cause's envelope covers 95.1 % of the file — every assertion of that
describe passes on it verbatim. Only that describe and the two finding-#5
assertions in `scripts/verify-p2-p3-surfaces.mjs`'s `P2-featurelen` phase read
this file; every other consumer of the primary fixture is untouched.

**What it is NOT.** Everything in "What it is — and what it is NOT" above
applies in full: it is the same deliberately incoherent assembly in another
order, and nothing may read craft meaning off it either. Its health, verdict,
grade and issue counts are properties of a shuffled concatenation. The only
things a test may assert about it are the same structural, scale-shaped
properties listed above — plus the one report shape it was selected for.

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

## Which sweeps pick this file up

The repository's tracked-file walkers find it, so committing it enrolled it in
four sweeps. All four are intended; the third and fourth are the ones whose
cost it materially changes, and they are listed here because a fixture that
quietly makes a gate slower or a bound tighter should say so.

| sweep | how it finds the file | effect |
|---|---|---|
| `tests/core/fixture-provenance-comment-guard.test.ts` | recursive walk of `tests/fixtures/` | intended — it is what caught this fixture's first draft putting "CC0" on the title page, where the parser scores it as action |
| `tests/security/fountain-shape-guard-cue-parity.test.ts` | tracked-file listing | intended — it is now the FEATURE-SCALE tier of that file's two-tier margin proof (weight 236x, frequent 10x). The 75 short-form rows keep their own, unlowered 1000x/10x floors |
| `tests/core/doctor-analysis-budget.test.ts` | tracked-file listing | intended — runs the full `runScriptDoctor` over every tracked fixture against a 15,000 ms no-fire margin. This file is the most expensive row in that sweep at ~1,058 ms, i.e. 14x headroom, and the only row that exercises the budget check at the length the budget exists for |
| `scripts/honesty-audit.mjs` | tracked-file listing | intended — the boneyard header is scanned like every other tracked file; exit 0 |

Not picked up, verified by reading each walker:
`scripts/check-doctor-output-identity.mjs` (non-recursive — see the section
below) and `server/nvm/analyze/calibration/corpus.ts` (a TypeScript array, not
a walker; `REFERENCE_CORPUS.length === 20` is still asserted in three places).

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
