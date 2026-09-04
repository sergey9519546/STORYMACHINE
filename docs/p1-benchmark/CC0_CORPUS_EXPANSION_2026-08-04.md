# CC0 Corpus Expansion — 2026-08-04: truth-extraction recall testbed + weak-band contrast material

> **⚠ 2026-09-04 — every `health` and `wordCount` figure in this document was
> measured over a contaminated corpus.** All 20 files (the 14 added here and the
> 6 before them) opened with a `//`-prefixed provenance header, which is NOT
> Fountain comment syntax — the boneyard `/* */` is (`src/lib/fountain.ts:110`)
> — so `parseFountain` typed those lines `action` and the analyzer scored the
> repository's own filing metadata as screenplay. Header phrases written by THIS
> document's own convention ("DEATH-RECALL TAG: drowning", "stabs NAME to death",
> "kills NAME") are `DANGER_TENSION_WORDS` hits; they raised scene 1's suspense
> on 13 of the 20 scripts and produced 106 of the corpus's 237 detected clue
> "seeds". The headers were converted to real boneyards on 2026-09-04. The
> figures below are left unedited — the record of what was measured is part of
> the audit — but treat every per-script number here as superseded, and re-run
> before citing one. Corrected values, the full per-script movement table, and
> what the correction did NOT fix:
> `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`, 2026-09-04.
>
> The document's **qualitative** conclusions are unaffected and were spot-checked:
> the 4-HIT/2-MISS death-cue recall table in §2a is derived from on-page death
> phrasing in the drama, not from the headers, and `npm test` (including
> `tests/core/truth-extraction.test.ts` and `page-estimate-realism.test.ts`)
> passes with 0 failures on the corrected corpus.

**Status:** Complete. 14 new original screenplays added to `data/screenplays/`,
force-tracked under the same CC0-original mechanism as the six files added
2026-07-29. `scripts/probe-truth-order-sensitivity.mjs` run unmodified
against the resulting 20-script CC0 corpus (plus the structural-form and
calibration corpora it already includes, 44 scripts total in Section A).

**HONESTY NOTE, stated up front:** all 14 scripts were written by an AI
agent (Claude), not a human screenwriter. They are mechanism-test material
for `server/nvm/analyze/truth-extraction.ts`'s recall/precision measurement
and P1's missing weak-craft contrast band. They are **not** a substitute for
professionally-authored "real writing" in P1's validation sense, and the
existing 761-script IMSDb/DailyScript corpus (ADR-002's rejected-for-legal-
distribution option) remains the only material that answers P1's actual
exit-gate question. See the closing section for what this expansion does
and does not close.

## TL;DR

| | Result |
|---|---|
| Files added | 14 `.fountain` (6 death/thriller, 4 competent no-death, 4 deliberately weak) |
| Placement | `data/screenplays/`, force-tracked (`git add -f`) — **not** a gitignore exception |
| Parse verification | 14/14 parse cleanly, scene counts land in the requested bands |
| Death-cue recall | 4/6 HIT, 2/6 MISS (miss-list below) |
| False positives | 0/14 new scripts, 0/44 scripts in the full Section A corpus |
| Flashback exclusion guard | Verified load-bearing by direct ablation (ties to 1 FP per script when disabled) |
| Order-sensitivity (3 degradations × 4 death-fact scripts) | 0 win / 12 tie / 0 loss — mechanism doesn't spontaneously fire on this real-shaped material (explained below) |
| `npm run lint` | 0 errors |
| `npm test` | 10260 tests, 0 fail (78 skipped, 2 todo — pre-existing) |
| `npm run honesty-audit` | clean |
| `npm run check-docs` | clean (this file) |

---

## 1. Placement: force-add, not a gitignore exception

The task brief assumed the existing six CC0 scripts were tracked "via a
gitignore exception." That is not what `git check-ignore` shows. `.gitignore`
line 16 is a bare `data/` — there is no `!data/screenplays/` exception
anywhere in the file. Verified directly:

```
$ touch data/screenplays/__probe.fountain
$ git check-ignore -v data/screenplays/__probe.fountain
.gitignore:16:data/    data/screenplays/__probe.fountain
$ git add data/screenplays/__probe.fountain
The following paths are ignored by one of your .gitignore files:
data
hint: Use -f if you really want to add them.
```

`git check-ignore` reports "not ignored" for the *existing* six files only
because tracked paths are exempt from `.gitignore` matching once they are in
the index — that is a property of already being tracked, not of an
exception rule. `git log` on `data/screenplays/counter-offer.fountain`
confirms this directly: the six were added in commit `be0bf78` (2026-07-29),
and that commit's own message says so explicitly — *"These are force-added
because the entire data/ dir is gitignored (by design: the pre-existing 52
animation scripts are copyrighted and intentionally kept local-only/
untracked)."* This matches CLAUDE.md's `.claude/` and `data/` gotcha almost
exactly, and the task's "gitignore exception" framing should be corrected in
any future doc that repeats it.

All 14 new files were added with the identical mechanism:

```
git add -f data/screenplays/red-line.fountain data/screenplays/undertow.fountain \
  data/screenplays/chain-of-custody.fountain data/screenplays/code-blue.fountain \
  data/screenplays/close-quarters.fountain data/screenplays/high-voltage.fountain \
  data/screenplays/soft-launch.fountain data/screenplays/mise.fountain \
  data/screenplays/the-defense-rests.fountain data/screenplays/two-lane.fountain \
  data/screenplays/quiet-season.fountain data/screenplays/the-key-under-the-mat.fountain \
  data/screenplays/same-page.fountain data/screenplays/the-detour.fountain
```

`.gitignore` and the copyrighted 52-script animation corpus are untouched —
same posture as 2026-07-29. `data/screenplays/LICENSE-live-action.md` was
updated with a new manifest section and the honesty note above.

## 2. What was authored

### 2a. Six death/thriller scripts (12–18 scenes, recall testbed)

Each stages an on-page death of a speaking character in explicit action
text. Phrasing was deliberately varied — some chosen to land inside
`truth-extraction.ts`'s eight death-cue regexes, some deliberately chosen
*not* to, so the miss-list below is an honest measurement, not a curated
one.

| File | Scenes | Cause of death | Cue phrasing | Recall |
|---|---:|---|---|---|
| `red-line.fountain` | 14 | Gunshot | "The second shot **kills Marcus** before he can move another step." | **HIT** |
| `undertow.fountain` | 12 | Drowning | "...the lake has already taken her." / "does not come back up" (no trigger word used anywhere) | **MISS** |
| `chain-of-custody.fountain` | 13 | Body discovered | "it's **Delgado's corpse**, still in his courier jacket" | **HIT** |
| `code-blue.fountain` | 14 | Hospital flatline | "...nobody in the room argues with the number. **August is dead** before Riva even makes it through the doors" | **HIT** |
| `close-quarters.fountain` | 13 | Stabbing | "He **stabs Rosalind to death** against the boxes she never finished taping" | **HIT** |
| `high-voltage.fountain` | 13 | Electrocution | "...he isn't moving" / "doesn't let go" (no trigger word used anywhere) | **MISS** |

Two of the six (`red-line.fountain`, `code-blue.fountain`) additionally
place the dead character in a later scene explicitly marked `(FLASHBACK)`
in the scene heading, with the dead character speaking on-screen dialogue
in that scene — the exact shape the non-literal-scene exclusion guard is
supposed to protect against.

### 2b. Four competent dramas/comedies (12–16 scenes, clean negative material)

Genre-varied, no character deaths: `soft-launch.fountain` (tech-startup
workplace comedy), `mise.fountain` (restaurant kitchen drama),
`the-defense-rests.fountain` (legal dramedy), `two-lane.fountain`
(road-trip dramedy). Each carries the same craft baseline as the strong/
competent tier of the existing corpus — a stated clock, a planted setup
that pays off, and a two-character relationship beat with a resolved old
grievance.

### 2c. Four deliberately weak scripts (10–14 scenes, the missing contrast band)

Every P1 document to date names a missing weak-craft contrast class as a
real gap; these are new, non-parody attempts to fill it. Each is weak in
exactly one specific, labeled way (documented in the file's own header
comment), while remaining a plausible early-career draft rather than an
easily-separable parody:

| File | Labeled weakness |
|---|---|
| `quiet-season.fountain` | Flat stakes never raised — the "sell the store or don't" premise is restated almost verbatim in nearly every scene, the developer's deadline is never made concrete, and the ending decision costs the protagonist nothing observable. |
| `the-key-under-the-mat.fountain` | Setup promised, never paid off — a loaded mystery note is planted with real fanfare in scene 1, checked once, and then only resurfaces once late as something the protagonist admits she forgot about. The actual ending resolves an unrelated, unforeshadowed question. |
| `same-page.fountain` | Interchangeable character voices — three coworkers with different jobs and different opinions on paper share one clipped hedging cadence ("I mean," "Honestly," "Kind of") throughout; the dialogue is not attributable to a specific speaker with the names covered. |
| `the-detour.fountain` | A midsection that wanders — the inciting incident (a missed trail fork) and the resolution (finding the trail again) are both clear and functional, but six consecutive middle scenes are functionally interchangeable (rest stop, minor bicker, small discovery, repeat) with no rising stakes and no scene that could be deleted or reordered without changing the story. |

None of the four weak scripts, and none of the four competent scripts,
contain any of the eight death-cue lexicon patterns — verified by the
recall/FP run in §4.

## 3. Parse verification (all 14, via `analyzeFountainText`)

Run directly (not assumed) via
`node --experimental-strip-types` against `server/nvm/analyze/fountain-analyzer.ts`'s
`analyzeFountainText()`:

| File | sceneCount | wordCount | Band requirement | Met |
|---|---:|---:|---|---|
| `red-line.fountain` | 14 | 988 | 12–18 (death) | yes |
| `undertow.fountain` | 12 | 889 | 12–18 (death) | yes |
| `chain-of-custody.fountain` | 13 | 830 | 12–18 (death) | yes |
| `code-blue.fountain` | 14 | 958 | 12–18 (death) | yes |
| `close-quarters.fountain` | 13 | 845 | 12–18 (death) | yes |
| `high-voltage.fountain` | 13 | 940 | 12–18 (death) | yes |
| `soft-launch.fountain` | 12 | 972 | 12–16 (competent) | yes |
| `mise.fountain` | 12 | 922 | 12–16 (competent) | yes |
| `the-defense-rests.fountain` | 12 | 963 | 12–16 (competent) | yes |
| `two-lane.fountain` | 13 | 1011 | 12–16 (competent) | yes |
| `quiet-season.fountain` | 10 | 679 | 10–14 (weak) | yes |
| `the-key-under-the-mat.fountain` | 11 | 903 | 10–14 (weak) | yes |
| `same-page.fountain` | 11 | 814 | 10–14 (weak) | yes |
| `the-detour.fountain` | 11 | 759 | 10–14 (weak) | yes |

> **⚠ 2026-09-04 — every `wordCount` above counts this repository's own
> provenance metadata as screenplay.** These files opened with a `//`-prefixed
> provenance header. `//` is not Fountain comment syntax (the boneyard `/* */`
> is — `src/lib/fountain.ts:110`), so `parseFountain` typed those lines `action`
> and the analyzer scored them. The headers are now real boneyards, which takes
> the metadata out of the *drama* — but NOT out of `wordCount`, which is
> `fastWordCount()` over the raw file and counts boneyard text too. Corrected
> counts after the fix (the delta is only the `//` tokens becoming `/*`+`*/`,
> which is why it is small — the header WORDS are still in there):
> red-line 988→982, undertow 889→884, chain-of-custody 830→824, code-blue
> 958→951, close-quarters 845→840, high-voltage 940→934, soft-launch 972→967,
> mise 922→917, the-defense-rests 963→958, two-lane 1011→1006, quiet-season
> 679→668, the-key-under-the-mat 903→890, same-page 814→803, the-detour 759→747.
> The true screenplay body is smaller still — `the-key-under-the-mat` is 739
> body words against the 890 counted (17% metadata), `quiet-season` 544 against
> 668. `sceneCount` is unaffected in every case, and all 20 files still clear the
> band requirement and `tests/core/page-estimate-realism.test.ts`'s density
> bands. Full measurement: `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`,
> 2026-09-04.

`tests/core/page-estimate-realism.test.ts` (part of the standard `npm test`
run, §6) independently confirms every file in `data/screenplays/` —
original 6 plus these 14 — lands inside the 120–320 words/page realistic
density band, and the pooled corpus density stays inside the 150–280
words/page band centered on the 761-script P1 corpus's ~215 median.

## 4. Recall and false-positive measurement

Measured directly with `detectTruthContradictions()` against each new file
in isolation, then cross-checked against `scripts/probe-truth-order-
sensitivity.mjs` run completely unmodified — it already walks
`data/screenplays/*.fountain` for its Section A corpus, so it picked up all
14 new files automatically with no runner variant needed.

**Recall: 4/6 (67%).** `red-line.fountain`, `chain-of-custody.fountain`,
`code-blue.fountain`, and `close-quarters.fountain` fire; `undertow.fountain`
and `high-voltage.fountain` do not.

**Miss-list (the concrete, useful output):**

- **Drowning has no lexicon entry at all.** None of the eight death-cue
  patterns in `truth-extraction.ts` cover "drowns," "drowned," or any
  natural drowning phrasing ("doesn't come back up," "the lake takes her
  down"). This is not a hedge-guard false negative — the word "drowns"
  itself, unhedged, in isolation, would still not match any pattern.
- **Electrocution has no lexicon entry at all.** Same gap — "electrocutes,"
  "electrocuted," and natural phrasing ("the current doesn't let go," "he
  isn't moving") are absent from all eight patterns.
- Both misses are by construction (chosen deliberately to test the lexicon
  boundary), not authoring accidents — see §2a's phrasing column.
- A secondary, non-lexicon finding from authoring `red-line.fountain`: the
  first draft's death line ("The second shot kills Marcus...") sat in the
  same scene block as, and directly after, a piece of dialogue with no
  intervening scene heading. `screenplay-normalizer.ts`'s `isDoubleSpaced()`
  heuristic (>=60% of non-blank lines immediately followed by a blank line)
  flags ordinary single-spaced Fountain as "double-spaced" far more often
  than its header comment implies — 5 of the previous 6 CC0 scripts and all
  14 new ones trip this heuristic (ratios measured 0.596–0.648, threshold
  0.6). Once flagged, the reflow logic in `normalizeScreenplay()` merges
  *any* plain-text line following a character's dialogue into that same
  dialogue block until the next scene heading, transition, or character
  cue — which silently moved the death-cue sentence out of the action text
  the extractor scans (dialogue is deliberately excluded from death-cue
  matching, precision guard §2 in the file header). This produced a false
  MISS in the first draft, not a true one. The fix was structural, not a
  code change: giving the death-cue sentence its own fresh scene heading
  (`(SECONDS LATER)`) so it opens a scene with no preceding dialogue. This
  is `server/nvm/analyze/**` territory (owned by a sibling agent this
  session), so it is reported here rather than patched — worth a follow-up
  ticket, since it is a real, silent, corpus-wide risk, not specific to
  these 14 files.

**False positives: 0.** Zero contradictions on all 14 new scripts in
isolation, and zero contradictions across the full 44-script Section A
corpus (20 CC0 scripts, 4 structural-form-experiment fixtures, 20
calibration-corpus samples) — matching the probe's own "should report ~0
contradictions" expectation for unmodified, professionally-shaped text.

**Flashback exclusion guard: verified load-bearing, not just passively
passing.** Both `red-line.fountain` and `code-blue.fountain` place their
dead character speaking on-screen dialogue in a scene heading marked
`(FLASHBACK)`. Stripping that marker in memory (not in the committed file)
and re-running the extractor turns 0 contradictions into 1 for both
scripts:

```
red-line.fountain  WITH (FLASHBACK) marker: contradictions=0 | WITHOUT: contradictions=1
code-blue.fountain WITH (FLASHBACK) marker: contradictions=0 | WITHOUT: contradictions=1
```

This is direct evidence the guard is doing real work on this material, not
evidence it happens to never be triggered.

## 5. Order-sensitivity under the three degradations

`scripts/probe-truth-order-sensitivity.mjs`'s Section A ran all 44 scripts
(including the 6 new death scripts) through `SCENE_SHUFFLE`,
`MIDPOINT_DROP`, and `CLIMAX_RELOCATE` — the same degradation functions
`scripts/measure-auc-split.mjs` uses, copied verbatim inside the probe.

**Result: 0 win / 12 tie / 0 loss** across the 4 death-fact scripts × 3
degradations (the 2 MISS scripts trivially tie too, since they produce no
death fact to begin with). Every degraded run reported the same
contradiction count as the clean run — flat, not up — for every one of the
6 death scripts under every one of the 3 degradations.

This is a genuine, checked finding, not a bug in the probe. Verified
directly by inspecting where each script's death scene and the dead
character's alive scenes land after `SCENE_SHUFFLE` (seed 42):

```
chain-of-custody.fountain  clean death@6  -> shuffled death@9,  dead char's alive scenes at [0, 2]   (all still before)
close-quarters.fountain    clean death@5  -> shuffled death@11, dead char's alive scenes at [2,5,7,8] (all still before)
red-line.fountain          clean death@5  -> shuffled death@12, dead char's alive scenes at [0,3,8,9] (all still before)
code-blue.fountain         clean death@5  -> shuffled death@12, dead char's alive scenes at [3,7,9]   (all still before)
```

For all four, the shuffle happened to relocate the death scene to a
*later* relative position than any of the character's alive scenes, so
order was preserved by chance rather than inverted. `MIDPOINT_DROP` removes
the 40%–60% window of scenes — for scripts where the death occurs early-to-
mid (scene 5–6 of 12–14) and the character's alive evidence is clustered
before it, that window mostly removes scenes *after* the death with no
alive facts to lose. `CLIMAX_RELOCATE` moves the document's actual final
scene to position 1 — since every one of these six scripts closes on an
ordinary epilogue/closing beat with no dialogue from the dead character
(a deliberate authoring choice, matching the FP=0 requirement in §4), that
relocation never touches the dead character's order relationship either.

This contrasts directly with `scripts/probe-truth-order-sensitivity.mjs`'s
own Section B, which reports **AUC=1.000, win/tie/loss=12/0/0** on both
`SCENE_SHUFFLE` and `CLIMAX_RELOCATE` for its 12 synthetic fixtures — by
construction, those fixtures always place the death as the *literal last
scene* with zero dialogue afterward, so `CLIMAX_RELOCATE` (which moves the
last scene to the front) always inverts the order relationship. The
mechanism the order-sensitivity property depends on is real and already
proven — both by Section B and by the CLIMAX_RELOCATE AUC 1.0 finding this
task's brief cites from the calibration corpus. What this measurement adds
is that it does **not** spontaneously fire on realistically-structured
single-death dramatic material (death mid-script, ordinary epilogue after)
under these three specific degradations. A death staged at or very near the
literal final scene — which happens in real screenplays, just not in any
of these six — would be expected to behave like Section B's fixtures
instead.

## 6. Verification run

```
npm run lint            # tsc --noEmit — 0 errors
npm test                 # 10260 tests, 0 fail, 78 skipped, 2 todo (pre-existing; unrelated to this change)
npm run honesty-audit    # scanned 378 files + 246 tracked markdown — clean
npm run check-docs       # this file — clean
```

`tests/core/truth-extraction.test.ts`'s real-corpus false-positive test
(`reports zero contradictions across the CC0 sample, structural-form-
experiment, and calibration corpora`) and `tests/core/page-estimate-
realism.test.ts` (which globs every `.fountain` file in `data/screenplays/`
and asserts a realistic words-per-page density, individually and pooled)
were checked explicitly as the two corpus-count-sensitive tests that glob
this directory. Both pass with the 14 new files present — the fixtures do
not require any test threshold changes.

## 7. Honest assessment — does this close the recall gap?

**No, not in the sense P1's exit gate needs, and this was never going to.**
This expansion answers a narrower, useful question: does
`truth-extraction.ts` have *any* demonstrable recall on death phrasing when
given material that actually contains an on-page death, given that all
30 previously-available in-repo scripts had zero? Yes — 4/6, with a
concrete, mechanism-level miss-list (drowning and electrocution have no
lexicon entries at all) that is directly actionable if someone wants to
extend the eight regexes. The precision side (0 FP across 44 scripts,
including a positively-verified flashback guard) is now measured on
material that actually exercises the death-fact code paths, not just
material that trivially has none to trigger them.

What it does **not** do: these are 14 AI-authored scripts, not real writer
submissions, and 14 hand-picked phrasings is not a statistically
representative sample of how death gets written across produced
screenplays. The honest reason recall was ever zero — no on-page death of
a speaking character existed anywhere in the 30 previously-available
scripts — is unchanged by adding scripts that were written specifically to
contain one. The only material that answers "does this detector have real
recall on real produced screenplays" is the maintainer's local 761-script
corpus via `REAL_SCRIPT_CORPUS_DIR`, which nothing in CI runs (see CLAUDE.md's
"That floor is NOT automatically enforced" note — the same gap applies
here). This expansion makes a local `npm run measure-real`-style run against
that corpus *more informative if it ever happens* (there is now a concrete
4-HIT/2-MISS baseline and a specific miss-list to compare against, instead
of a 0/0 signal with nothing to compare), but it is not a substitute for
that run, and should not be cited as evidence the detector works on real
writing.

---

## ADDENDUM — 2026-08-04 (later same day): the two miss-list items closed, and a normalizer root cause with a measured blast radius

This addendum is appended, not a rewrite: every number above stands as
originally measured. Two items delegated off the back of this document's
own miss-list: closing the drowning/electrocution lexicon gap in §4, and
tracing the `isDoubleSpaced()` false positive this document's §4 flagged as
a secondary finding down to a root cause and a fix.

### Item 1 — drowning and electrocution lexicon gaps: 4/6 -> 6/6

`server/nvm/analyze/truth-extraction.ts`'s `deathPatterns()` gained five new
regexes (13 total, up from 8) plus one extended alternation, staying inside
the module's stated precision guards (action-text-only, hedge-word gate,
flashback exclusion, speaking-character requirement — file header §§1-4).
Each new pattern is name-anchored, the same discipline the original eight
already used.

**Drowning** (`undertow.fountain`'s gap):

| Pattern | Fires on | Near-miss that must NOT fire |
|---|---|---|
| `NAME drowns\|drowned` (not followed by "out") | "Mara drowns before anyone can reach her." | `NAME drowns out` — a sound-masking idiom ("Mara drowns out the alarm with her own laughter."), not a death |
| `NAME's drowned body` (extends the existing corpse alternation) | "Divers pull Mara's drowned body from the shallows." | An unrelated "body" mention ("Mara's body language shifts...") |
| `NAME went/goes under` **+** sentence-final `does not/never come back up.` (300-char window, fixture-literal) | The exact shape of `undertow.fountain`'s death scene: "...where Renata went under. ... her sister does not come back up." | `NAME went under` ALONE with no non-resurfacing clause ("Mara went under to grab her sunglasses"); a recovery continuation ("doesn't come back up right away, surfacing moments later") — the trailing `\.` requirement specifically excludes this shape |

**Electrocution** (`high-voltage.fountain`'s gap):

| Pattern | Fires on | Near-miss that must NOT fire |
|---|---|---|
| `NAME is/was electrocuted` | "Mara is electrocuted the moment her hand touches the live panel." | — (unambiguous verb, same tier as the existing "kills"/"murders" patterns) |
| `electrocutes NAME` | "The exposed panel electrocutes Mara instantly." | "shocks Mara" — injury language, deliberately excluded |
| `NAME` near `arc/current/voltage` **+** `doesn't let go` **+** `isn't moving` (fixture-literal combo, 120/150-char windows) | The exact shape of `high-voltage.fountain`'s death scene: "Tomas's hand is still on the panel... a blue-white arc... doesn't let go... he isn't moving." | `isn't moving` ALONE ("Mara isn't moving, asleep on the couch"); an arc with a recovery ("shakes it off and gets back on her feet") — either piece alone fails the combo |

Every pattern also respects the existing hedge-word gate: "if the panel
electrocutes Mara" and "Mara nearly drowns but Jonah pulls her out in time"
fire nothing, unchanged from the original eight patterns' behavior.

**Re-measured recall** (`detectTruthContradictions()` against the six
death/thriller scripts in isolation): **6/6 (100%)**, up from 4/6.
`undertow.fountain` and `high-voltage.fountain` now both produce exactly one
`dead` fact each, at the correct scene index, with zero contradictions (the
scripts were authored to have none).

**False positives: still 0.** `tests/core/truth-extraction.test.ts`'s
real-corpus test (20 CC0 scripts + 4 structural-form-experiment fixtures +
20 calibration-corpus samples, 44 scripts total) reports 0 contradictions
after the lexicon extension, same as before it.

**Falsifiability, checked directly:** removing the `drowns/drowned` pattern
and re-running the suite fails exactly its own test (`fires on the direct
verb ("Mara drowns")`, `27 pass / 1 fail`) and nothing else; restoring the
pattern returns the suite to `28 pass / 0 fail`.

**New tests:** 15 added to `tests/core/truth-extraction.test.ts` (13 -> 28
total) — one fire test and one-or-more near-miss negatives per new pattern,
plus a hedge-guard check for each cause of death and a corpse-alternation
pair.

### Item 2 — `isDoubleSpaced()`: root cause, fix, and a measured blast radius

**1. Reproduction.** Two minimal snippets, both ordinary spec-correct
Fountain (a blank line between every element, nothing double-spaced about
either):

```
INT. KITCHEN - DAY

Mara pours coffee.

Jonah reads the paper.

MARA
Morning.
```

Before the fix, `normalizeScreenplay()` returned this reflowed into
`"Mara pours coffee. Jonah reads the paper."` as a single action paragraph
— the blank line separating the two paragraphs was discarded because
blank lines are stripped from the working line list before the reflow loop
runs, and nothing re-inserts a boundary between two consecutive
plain-text lines in `action` mode.

```
INT. WAREHOUSE - NIGHT

COMPANION
No...

The second shot kills Marcus before he can move another step.
```

Before the fix, this reflowed into `COMPANION\nNo... The second shot kills
Marcus before he can move another step.` — the action sentence merged into
the preceding dialogue block, because `mode` is only reset to `'action'` at
a scene heading or transition, never after a dialogue block ends on its
own. This is the exact shape that produced the false MISS in
`red-line.fountain`'s first draft, documented in §4 above.

**2. Diagnosis.** `isDoubleSpaced()` measured the fraction of ALL non-blank
lines immediately followed by a blank line, flagging >=60% as
double-spaced. That ratio is not actually diagnostic of anything: the
Fountain spec itself requires a blank line between every ELEMENT (scene
heading, action paragraph, transition, the dialogue block as a whole), so a
short-paragraph, dialogue-heavy script that is correctly single-spaced
clears 60% from ordinary element boundaries alone, with no import artifact
present. Measured directly against `data/screenplays/`: **13 of the 20 CC0
corpus scripts** (all of them ordinary, spec-correct Fountain, never
touched by a scraper or OCR pipeline) tripped the old ratio and were
needlessly reflowed. This is a materially different number from the
informal "5 of the previous 6... and all 14 new ones" (19/20) estimate in
§4 above — that estimate was made by eye against measured ratios in the
0.596-0.648 range without running the actual function end-to-end; the
directly-measured, code-verified figure is 13/20, and this addendum
supersedes the earlier number.

The one adjacency correctly-formatted Fountain can never produce is a blank
line between a character CUE and its own dialogue — this file's own header
already says why: "Fountain requires a character cue to be immediately
followed by its dialogue with no blank line between." A genuinely
double-spaced import (blank after every physical line, including cues, per
the same header) violates that adjacency on every cue; ordinary Fountain
never does, by construction. That gap (~0% for clean text vs. ~100% for a
real double-spaced import) is the actual signal.

**3. Fix.** `isDoubleSpaced()` now primarily checks the fraction of
character cues immediately followed by a blank line (majority, >=0.5, over
just the cues found), falling back to the original document-wide ratio
(raised from 0.6 to 0.9, since it is now a last resort) only when the text
has no detectable character cues at all. Both reproduction snippets above
now pass through byte-identical. Regression fixtures added both ways to
`server/nvm/analyze/screenplay-normalizer.test.ts` (8 -> 12 tests): the two
reproductions pass through unchanged, plus a positive control confirming a
genuinely double-spaced cue/dialogue pair (blank line between `MARA` and
its own `Morning.`) is still detected and correctly reflowed.

**4. Blast radius — 6 of 20 scripts changed, verdict/sceneCount/grade
unchanged.** `runScriptDoctor()` (quick mode) was run over all 20
`data/screenplays/*.fountain` scripts twice — once with the old
`isDoubleSpaced()` (via `git stash` on this file only), once with the fix —
and every `health`/`grade`/`verdict`/`sceneCount`/`wordCount` field diffed
per script:

| File | Pre-fix health | Post-fix health | Delta |
|---|---:|---:|---:|
| `chain-of-custody.fountain` | 72.4 | 72.3 | -0.1 |
| `close-quarters.fountain` | 73.0 | 69.9 | -3.1 |
| `dead-frequency.fountain` | 78.4 | 78.3 | -0.1 |
| `mise.fountain` | 71.2 | 72.8 | +1.6 |
| `red-line.fountain` | 73.1 | 71.1 | -2.0 |
| `runoff.fountain` | 74.4 | 74.5 | +0.1 |

The remaining 14 scripts (including both `undertow.fountain` and
`high-voltage.fountain`, and the 4 competent/4 weak scripts) were unchanged
on every field. `grade`, `verdict`, and `sceneCount` were identical
pre-/post-fix for **all 20** scripts, including the 6 above — only `health`
moved, by no more than 3.1 points.

Per this task's own instruction: **this is a STOP, not a proceed.** Six
scripts changed measurable scoring output. This makes the fix a
receipt-gated scoring change for the orchestrator to route, not something
to wave through as "no observable effect" — even though verdict/sceneCount
held, and even though the deltas are small. The fix itself (the code
change in `screenplay-normalizer.ts` plus its regression tests) is
in place, matching this task's step 3; no committed evidence artifact was
regenerated to match the new numbers, matching step 4's explicit
instruction not to.

**5. Committed evidence artifacts — what would change, not regenerated.**
`scripts/output/real-corpus-scores.csv` (88 rows: the 6 pre-existing CC0
scripts plus 82 rows from the private, untracked animation/live-action
corpus this sandboxed environment does not have a local copy of) contains
`dead-frequency.fountain` at health 78.4 and `runoff.fountain` at health
74.4 — both exactly matching this addendum's PRE-fix measurement above,
confirming the committed CSV was generated through the misfiring path for
at least these two rows. Both would shift by 0.1 if regenerated. The same
two filenames also appear in `discrimination-auc-train.csv`,
`discrimination-auc-test.csv`, `corpus-split.json`,
`probe-question-latency-deduction.json`, and
`temporal-order-sensitivity.json` — all committed, all generated before
this fix, all candidates for the same small shift. The other 82 rows in
`real-corpus-scores.csv` (the private local corpus) cannot be checked from
this environment; this file's own header comment ("Ratatouille, Mulan,
Coco all parse to 0 dialogue lines" pre-normalizer) states those scripts
are genuine double-spaced imports, which the new cue-adjacency signal
still catches (confirmed by the existing `DOUBLE_SPACED` regression test,
unchanged and still passing) — so their reflow should still fire, but
exact health deltas for those specific files were not verified here.
`docs/user-validation/sample-coverage-report.html` (the committed P0
sample report) is unaffected either way: its backing `src/lib/sample-script.ts`
is not reflowed under the old heuristic or the new one, checked directly.
Nothing in `scripts/output/` was written or modified by this addendum.

**6. Files.**

- `server/nvm/analyze/truth-extraction.ts` — 5 new death-cue regexes, 1
  extended alternation.
- `server/nvm/analyze/screenplay-normalizer.ts` — `isDoubleSpaced()`
  rewritten around cue-adjacency.
- `tests/core/truth-extraction.test.ts` — 15 new tests (13 -> 28).
- `server/nvm/analyze/screenplay-normalizer.test.ts` — 4 new tests (8 ->
  12): two root-cause reproductions (both now pass-through), one ordinary-
  Fountain false-positive regression, one double-spaced positive control.

**Verification (this addendum):** `npm run lint` — 0 errors. `npm test` —
10289 tests, 0 fail (78 skipped, 2 todo — pre-existing, unrelated).
`npm run honesty-audit` — clean. `scripts/output/` untouched.
