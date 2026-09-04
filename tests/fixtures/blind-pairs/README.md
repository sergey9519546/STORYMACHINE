# Blind matched pairs — twelve original short screenplays

Twelve original short screenplays, six matched pairs, written on 2026-09-04 as
the stimulus for one experiment: **does the score separate craft, or does it
separate the vocabulary the calibration corpus happens to be written in?**

Everything here is CC0 1.0 Universal. Each `.fountain` file declares that in a
`/* */` boneyard (Fountain's real comment syntax — see
`tests/core/fixture-provenance-comment-guard.test.ts` for why `//` is a bug,
not a style choice).

## Why the order matters more than the scripts do

The hypothesis under test is that the twenty hand-authored calibration samples
in `server/nvm/analyze/calibration/corpus.ts` separate their bands because
their author knew the rules' lexicons — that the corpus measures the engine's
ability to recognise its own vocabulary rather than its ability to recognise
craft. A test of that hypothesis is worthless if the person writing the
stimulus has the same knowledge. So the stimulus was written first, by an
author who had read none of it.

**The exact order of operations, as performed:**

1. Read `CLAUDE.md` (project memory) and
   `tests/core/fixture-provenance-comment-guard.test.ts` (to learn the
   required header syntax), plus lines 95–135 of `src/lib/fountain.ts` (the
   boneyard branch of the parser, to confirm `/* */` is honoured at the top of
   a file). Nothing else.
2. Designed six premises and one shared ten-scene skeleton per pair.
3. **Wrote all twelve screenplays.** No rule file, no lexicon, no revision
   pass, no calibration sample, no prior discrimination result, and no
   retrospective had been read at this point. Nothing in `server/nvm/` had
   been opened.
4. Mechanically matched the pairs to the pre-declared design: ten scenes each,
   per-pair word ratio ≤ 1.05 on the screenplay body (boneyard excluded). Only
   length was adjusted, and only in the intended-bad member; no craft
   judgement was revised.
5. Committed the twelve fixtures and this README, so the git history carries
   the write-first order as a fact and not as a claim.
6. **Only then** read `docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md`
   §1–2, the calibration corpus header, and the prior excellent/bad pair's
   numbers.
7. Ran the doctor on all twelve and on the calibration corpus's own samples,
   and computed identical statistics over both sets.

Step 5 is the load-bearing one. The commit that introduces these files
predates the commit that introduces the analysis, and neither the scripts nor
their headers were touched afterwards. If a future reader wants to check that,
`git log --follow` on any of the twelve is the receipt.

## The design

Six pairs. Within a pair the two scripts share a premise, a ten-scene
skeleton, a character set, and a word budget within five percent. Genre and
register vary across the six so the result does not rest on one voice:

| pair | genre / register |
| --- | --- |
| `night-shift` | thriller — night security, cold-storage warehouse |
| `low-tide` | two-hander drama — siblings clearing a dead parent's house |
| `the-deposit` | comedy — flatmates and an end-of-tenancy inspection |
| `the-ledger` | period piece — a copying clerk, Liverpool, 1893 |
| `signal-drift` | science-fiction horror — a two-person relay station |
| `fence-line` | family story — a boundary dispute that is not about the boundary |

The `-excellent` member of each pair was written to be genuinely good on the
terms a screenwriter would use: a real turn at the midpoint that changes what
the story is about; a protagonist who makes the decisive, costly, irreversible
choice; dialogue that runs on subtext; stakes that escalate because of what
the protagonist does; and a climax that pays off something planted early
(Delacroix's badge; the tide table and the falling tide; the chirping smoke
alarm; the clerk's initials in the corner of a fair copy; the two-knock
manners joke; the clothesline in four hours of sun).

The `-bad` member was written to be bad the way real weak drafts are weak, not
the way a fixture is usually made bad. Nothing is scrambled, truncated, or
degraded mechanically. The bad drafts are fluent, correctly formatted, in the
same voice, on the same subject, at the same length. They fail on craft:
dialogue that states feeling instead of playing it, a protagonist things
happen *to*, a flat middle with no turn, stakes announced in speech rather
than dramatised, backstory delivered in a block, and an ending that resolves
nothing it set up (the ashes still on the bureau; the alarm still chirping in
the drawer; the fence still standing; the entity walking out of the room).

That last property is the point. Degrading a good script mechanically is a
test of whether the engine notices damage. A pair like this is a test of
whether it notices *writing*.

## What this can and cannot show

Twelve short scripts by a single author are evidence, not a benchmark. They
are not blind-labelled by independent readers, there is no held-out split, and
one author's idea of "genuinely bad" is one author's idea. A result in either
direction is a signal about the calibration corpus, not a validation of the
score. The real test remains P1 on real writing.

See `docs/p1-benchmark/BLIND_PAIRS_2026-09-04.md` for the method, the results
for both sets, and the conclusion.
