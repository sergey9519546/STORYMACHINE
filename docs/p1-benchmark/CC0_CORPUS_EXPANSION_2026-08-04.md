# CC0 Corpus Expansion — 2026-08-04: truth-extraction recall testbed + weak-band contrast material

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
