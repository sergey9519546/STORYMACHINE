# Advice-rule fixes — six measured defects, 2026-09-04

**Status: NOT MERGEABLE AS-IS, on purpose.** This is a scoring change and the
real-corpus measurement it needs cannot be run from here. The ledger entry it
files (`docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`, 2026-09-04, "advice-rule
fixes") is a **PENDING OWNER MEASUREMENT** entry, and
`scripts/check-scoring-receipt.mjs` is built to REFUSE such an entry as
satisfying a range's requirement. It does refuse this one. §7 is the owner's
command sequence to finish. This is the same shape as
`claude/r5-verbosity-bias-pending-measurement`.

Source: an advice-quality audit that read fifteen doctor reports as a script
consultant would and judged 84 individual findings against the script text,
measuring a **65% false-positive rate that RISES with the quality of the
writing** — 45/54 (83%) on three well-made scripts, 6/26 (23%) on a
badly-made one. Six of its findings were mechanical enough to fix with
fixtures and evidence. This document is the before/after for those six, plus
everything they moved and everything they did not.

---

## 0. The matched pair

`tests/fixtures/advice-audit/excellent.fountain` ("The Load Path", 10 scenes)
and `bad.fountain` ("The Big Account", 10 scenes) are two scripts written for
this work and matched on scene count and length, so anything separating them
is craft rather than size. The excellent one has a real midpoint reversal, an
active protagonist, planted objects that pay off, and dialogue built on
refusal and subtext; the bad one states every feeling outright, repeats its
own second scene, and resolves offstage.

Both now live in the repository with boneyard provenance headers, and their
headers name the individual lines that are load-bearing for a specific
regression. `tests/core/advice-rule-fixes.test.ts` is the guard.

---

## 1. The headline, before and after

| | health | grade | verdict | issues | critical | strengths |
|---|---|---|---|---|---|---|
| EXCELLENT before | **76.0** | strong | CONSIDER | 158 | 1 | 0 |
| EXCELLENT after | **76.0** | strong | CONSIDER | **132** | **0** | **2** |
| BAD before | **76.0** | strong | CONSIDER | 148 | 2 | 0 |
| BAD after | **76.0** | strong | CONSIDER | **150** | **1** | 0 |

Top-ten overlap between the two, before: **7 of 10**. After: **7 of 10**.

**The health score did not move at all, and the top-ten overlap did not move
at all.** Say that plainly: the deliberately excellent and the deliberately
bad script still score identically to one decimal place, still receive the
same grade and the same verdict, and still share seven of their ten top
priorities. Six specific false claims are gone. The composite score's
inability to tell the two apart is untouched, because that inability is not
caused by any of the six.

What did move, on the same pair:

- EXCELLENT loses 26 findings (158 → 132) and its only CRITICAL, and gains
  two strengths where it had none. BAD gains two findings.
- The direction inverted: before, the well-made script was told MORE was
  wrong with it than the badly-made one (158 vs 148). After, it is told less
  (132 vs 150).
- Of the audit's `NO_REVERSALS` / `NO_REVERSALS_LONG_STORY` pair, which
  appeared in the top priorities of **16 of 16** scripts measured: now **7 of
  16**.

---

## 2. The six defects

### 2.1 — The reversal threshold was unreachable

`suspenseDelta` is `clamp(Math.round(raw), -3, 5)` — an INTEGER. Every
reversal check spelled its threshold `suspenseDelta < -1`, which on an
integer channel means `<= -2`.

**Measured over the 42 scripts the repository ships** (20 `data/screenplays`
CC0 fixtures + 20 calibration `REFERENCE_CORPUS` samples + the two matched
fixtures):

| predicate | scripts with any scene satisfying it |
|---|---|
| `suspenseDelta < -1` (the shipped one) | **0 / 42** |
| `suspenseDelta <= -1` | **24 / 42** (26/42 after the lexicon fix in §2.4) |

Zero of forty-two. `NO_REVERSALS` (major) and `NO_REVERSALS_LONG_STORY`
(**critical**, 4× weight in the health formula) were therefore constants: a
fixed penalty with zero discriminating power occupying the #1/#2 slot of
essentially every report the product prints. `causality.ts` had already been
corrected to `<= -1` (D2-a, 2026-08-03) and its comment argues the craft case
correctly — that fix landed in one file of six.

**Fixed:** a new leaf module, `server/nvm/screenplay/suspense-dip.ts`, is now
the single definition (`SUSPENSE_DIP_THRESHOLD`, `isSuspenseDip`,
`countSuspenseDips`). `reversal-detection.ts` already carried a comment
saying "there is no single source of truth for it today" and requiring three
files to change together; they now share one. **29 executable call sites**
across conflict.ts (18), structure.ts (3), theme.ts (3), causality.ts (2),
intention.ts (1), originality.ts (1), screenplay/structure.ts (1) plus
reversal-detection.ts's legacy comparison. Every site was read in context
before changing; the finding text that quoted `< -1` to the writer now quotes
`≤ -1`.

**Deliberately NOT changed:** `conflict.ts`'s `DEEP_REVERSAL_HEALS` uses
`< -1.5` (i.e. `<= -2`) and is therefore also unreachable on the current
channel. Widening it to `<= -1` would collapse it onto the ordinary reversal
predicate and make it a duplicate of the checks above rather than the "deep
spike" check it is documented to be. It is recorded here as a known-dead
predicate rather than silently retuned.

### 2.2 — The on-the-nose gate could not fire

`ON_THE_NOSE_RE` permitted only `(really|so|very|extremely|incredibly)`
between the first-person opener and the emotion word, so `"Yes, I am still
worried about the presentation."` missed on `still`; `glad` was absent from
the lexicon while its opposites were present; and the density gate required
2+ matches IN ONE SCENE, which a script written on the nose THROUGHOUT
defeats by spreading one stated feeling per scene.

Measured: the deliberately-worst-possible on-the-nose script produced
**ZERO** `ON_THE_NOSE` findings. The same whitelist blocked
`DIALOGUE_EMOTION_NAMING`.

**Fixed:** the filler slot is a lazy `(?:\w+ ){0,2}?` with a negation
lookahead (`"I'm not angry."` is subtext, not statement, and is now excluded
ON PURPOSE rather than by accident); `glad` joins the lexicon; the density
gate is script-wide `>= 3`. `DIALOGUE_EMOTION_NAMING` gets the same treatment
plus `relieved|glad`.

| | before | after |
|---|---|---|
| ON_THE_NOSE on BAD | 0 | **4**, in 3 different scenes |
| ON_THE_NOSE on EXCELLENT | 0 | **0** |
| DIALOGUE_EMOTION_NAMING on BAD | 0 | 1 |
| DIALOGUE_EMOTION_NAMING on EXCELLENT | 0 | 0 |

This reproduces the audit's own sensitivity measurement exactly. On the wider
corpus the calibration troubled band rises (`The Grift` 6 → 8, `Adrift` 4 → 5)
and `counter-offer` goes 2 → 3.

### 2.3 — Two dialogue rules inverted on good writing

`AS_YOU_KNOW_RE` carried the bare alternate `you already know`, so it fired
MAJOR on

> TESS: "You're asking me a question you already know the answer to."

— a line whose entire dramatic function is to REFUSE exposition. It fired on
the excellent script and not at all on the bad one.

**Fixed:** that alternate now requires a following proposition — a comma or a
`that`-clause — which is the shape an actually-restated fact takes ("You
already know that the plant closes Friday."). "you already know the answer"
states no proposition; it refers to knowledge without supplying any. The
other alternates (`as you know`, `as we discussed`, …) are unambiguous
openers and are unchanged. Verified in both directions with fixtures.

`AGREEMENT_RE` is `^(yes|right|…)[.,!]?$`, so `SYCOPHANTIC_AGREEMENT` fired
on

> NOOR: "Yes."

— an admission that ends her career — as "NOOR simply agrees with GIL — no
conflict or subtext."

**Measured before deciding:** across all 42 shipped scripts the ungated rule
fired **exactly once**, and that one firing is the false positive above.
Precision 0/1 over the entire corpus.

**Fixed** (and the reasoning is worth keeping, because the first option
measured badly): the brief offered a scene-terminal gate or removal. The
scene-terminal gate is the minimal condition under which the rule's own claim
is TRUE rather than merely emitted — an agreement immediately pressed or
contradicted has demonstrably produced more exchange, so "no conflict" is
falsified on the page. Gated, it fires **0/42** on the shipped corpus. That
is not obviously better than 1/42-all-wrong, so the removal option was
weighed seriously and rejected for three reasons: the gate is satisfiable by
ordinary text (a scene ending on "Absolutely." is a real habit, and the
existing positive fixture still fires), unlike §2.1's predicate which no
shipped script could reach; `DIALOGUE_AGREEMENT_CHAIN` already covers the
in-scene run case; and CLAUDE.md holds that removal from the maintained rule
set is a separate approved migration, never a side effect. **Recorded as a
residual: the gated rule contributes nothing measurable on this corpus, and a
removal migration is a defensible future disposition.**

### 2.4 — The danger lexicon read innocuous words as peril

`DANGER_TENSION_WORDS` contained `run/runs/running`, `shot/shots` and `dark`.
EXCELLENT scene 1's only two hits were "She **runs** a thumbnail along it"
and "want the drone **shot** before the light goes flat" — a thumbnail and a
CAMERA shot — which made scene 1 the peak-suspense scene of a script that
climaxes at scene 9, manufacturing six findings, three of them top-ten.

**Measured per word over the 42 shipped scripts (boneyard excluded):**

| word | hits | reading |
|---|---|---|
| `dark` | 15 — the single MOST FREQUENT danger token in the corpus | 0 of them peril: "headlights ... go dark", "a city skyline gone dark", "the lobby is dark", "glow amber in the dark", "after dark", "the phone bank is dark" |
| `run` / `runs` / `running` | 27 combined | exactly ONE reads as peril ("She's already running for the door"). The other 26: "a smuggling run", "the van runs the empty interstate", "the creek runs clear", "whoever runs this network", "records running back twenty years", "the ferry's running lights", "running the metals panel", "running a script" |
| `shot` / `shots` | 6 | 4 genuine gunshots (all in one script, all in scenes that also carry `kills`/`gunfire`), plus "a second title shot" (boxing) and "the drone shot" (a camera shot — the term of art of the medium being analysed) |

**Fixed by REMOVAL, not by gating on a co-occurring danger token.** The
justification is that removal costs coverage of no danger AXIS: pursuit is
already carried by chase/chases/chasing, flee/flees/fleeing,
pursuit/pursued; firearms by gun/guns/gunfire/shoot/shoots/rifle/pistol/
weapon; concealment and entrapment by hide/hides/hiding/trapped/cornered.
`dark` carried no axis of its own at all — it is atmosphere, not peril, and
the list's own header says it names PHYSICAL peril. A co-occurrence gate
would additionally make the lexicon non-compositional and still could not
rescue "the drone shot" if an unrelated danger word happened to sit in the
same sentence. `darkness` is RETAINED: it takes 0 hits across all 42 scripts,
so there is no measurement to act on, and unlike `dark` it cannot appear as
an adjective on hair, coffee, or humour.

Effect on the excellent fixture: scene 1's `suspenseDelta` goes 3 → 0, and
all six manufactured findings (`CLIMAX_TOO_EARLY`, `FALSE_CLIMAX`,
`TENSION_FRONTLOADED_COM`, `PACING_SUSPENSE_EARLY_PEAK`,
`PEAK_SUSPENSE_CURIOSITY_VOID`, `ENTROPY_SPIKE_MISPLACED`) disappear.

### 2.5 — Three findings printed impossible facts

1. **"KAREN appears in 21 scenes"** on a TEN-scene script.
   `character-arc.ts` interpolated a dialogue-CUE count into a sentence about
   SCENES. Fixed by tracking the true scene set alongside the cue count; the
   finding now reads "KAREN speaks in **5 scenes** across **21 dialogue
   cues**". The cue count remains the PROMINENCE gate (the `>= 4` / `>= 6`
   thresholds were calibrated against it), so no firing decision changed —
   only the prose, which now names each number as what it is.

2. **`ACTION_SHORTEST_OUTLIER @ action line 108: "No."`** — line 108 is
   NOOR's dialogue. `extractActionLines` had two defects: a dialogue BLOCK is
   every non-blank line after a cue up to the next blank line, not one line
   (a cue followed by a parenthetical spilled the actual speech into the
   action list); and a cue carrying an extension (`DAN (CONT'D)`,
   `MARIA (V.O.)`) never matched the cue test at all, because the character
   class has no parentheses in it — so the CUE ITSELF entered the action
   list. Both fixed. The BAD fixture's twin instance
   (`action line 108: "DAN (CONT'D)"`) is gone too.

3. **`COLON_IN_ACTION`** was `l.text.includes(':')` with no digit guard, so
   "Checks the time: 8:52." and "GIL ABARA, 9:40 PM" were reported as "a
   colon used as a dramatic-reveal device". Fixed with
   `/[^\d\s]\s*:(?:\s+(?!\d)|$)/` — a reveal colon is followed by PROSE, so
   requiring a non-digit after it (or end of line, for "She reads the note:")
   keeps every genuine case and drops every numeric one. The deliberate false
   negative is a reveal whose payload opens with a number; being silent about
   one is cheaper than telling a writer their timestamp is a craft decision.

**The general guard the audit asked for** is in
`tests/core/advice-rule-fixes.test.ts`: it sweeps both fixtures' entire
reports for any scene index or scene count that the report's own `sceneCount`
makes impossible, so it catches the next instance rather than only these.

### 2.6 — The score denominator counted non-screenplay text

**(a) `wordCount` counted boneyard words.** `fastWordCount(fountain)` over
the raw text. `wordCount^0.7` is the health density denominator, so every
word of repository metadata made a script look longer and therefore healthier
for the same number of issues — the verbosity bias applied to the licence
header. All 20 shipped CC0 fixtures carried one, worth 24–151 words each
(undertow 884 counted vs 826 real; room-12 427 vs 338, a 21% inflation).
Fixed: the count now sums parsed blocks, excluding `boneyard` and
`title_page`. Nothing else changed — scene headings, cues, parentheticals,
transitions, sections, synopses and notes are all still counted exactly as
before.

**(b) `parseFountain` had no title-page handling at all.** `Title:` /
`Credit:` / `Author:` / `Draft date:` lines were typed `action`, counted in
`wordCount`, scanned by every action-line lexicon, and folded into scene 1 by
the scene segmenter (which prepends everything before the first slugline onto
the opening scene). This reaches real user drafts — a title page is ordinary
in a submitted screenplay — which is why the previous correction's own note
called it out as the larger of its two residuals. Fixed: a `title_page` block
type plus `titlePageLineCount`. The key set that may OPEN a title page is
closed (the Fountain spec's own keys plus the common episodic ones), because
a general `\w+:` rule at line 1 would swallow a legitimate opening action
line carrying a colon ("Checks the time: 8:52."); once opened, any
well-formed key or indented continuation belongs to the block, matching
`fountain-title-block.ts`'s existing shape.

**(c) Found and fixed while measuring (b): the raw-line scanners were still
reading the boneyard as prose.** The 2026-09-04 contamination fix moved every
fixture's provenance header into a boneyard, and the analyzer's BLOCK-level
consumers stopped reading it — but ten of the fourteen passes scan
`fountain.split('\n')` directly and never learned. Measured across the 20
shipped CC0 fixtures plus the two advice fixtures, removing the boneyard
changed the finding count of **23 distinct rules**, concentrated entirely in
two passes: `voice` (`SENTENCE_FRAGMENT_STARVATION` on 19 of 22 scripts,
`ACTION_MOTION_VERB_MONOTONE` on 6, `ACTION_LINE_LENGTH_UNIFORMITY` on 5,
`MONOCHROME_VERBS` on 3) and `originality` (`ACTION_OPENER_MONOTONY` on 9,
`SENSORY_MONOTONE` on 8, `ACTION_PEAK_PARAGRAPH` on 3, and ten more). One
concrete instance: `ACTION_SHORTEST_OUTLIER @ action line 25: "device."` —
the script's "shortest action line" was a word inside a licence note.

Fixed with `maskNonScreenplayLines` (src/lib/fountain.ts), which blanks
title-page and boneyard lines while PRESERVING line numbers, so no finding
anchor moves. Applied at `voice.ts`'s four raw-line scanners and
`originality.ts`'s pass-entry line array; `rhythm.ts`'s
`extractActionLines` got its own boneyard state machine. The transform is
monotone by construction: a blanked line can only remove a metadata-derived
finding, never create one. **After: the boneyard changes the finding count of
zero rules on all 22 fixtures.**

The remaining raw-line scanners (character-arc, dialogue, intention, pacing,
structure, theme, causality) measured CLEAN on this corpus and were left
alone rather than changed blind. That is unfinished work, not a claim that
they are correct.

---

## 3. The false-positive figure, after

The audit judged 84 findings across five scripts and measured 55 false (65%).
Re-judging all 84 at that depth is not reproducible from here, so two
clearly-described subsets are reported instead.

### 3.1 — The audit's individually-named, evidence-quoted defects (mechanical)

Seventeen defects the audit named with a quoted line and a rule. Checked
mechanically against the before and after reports:

| | before | after |
|---|---|---|
| present | **17 / 17** | **1 / 17** |

The sixteen that are gone: `NO_REVERSALS` and `NO_REVERSALS_LONG_STORY` on
EXCELLENT; the six manufactured suspense-peak findings; `AS_YOU_KNOW_BOB` on
TESS's refusal; `SYCOPHANTIC_AGREEMENT` on NOOR's "Yes."; ON_THE_NOSE's
complete silence on BAD; "KAREN appears in 21 scenes"; both
`ACTION_SHORTEST_OUTLIER` misattributions; `COLON_IN_ACTION` on the
timestamp; and "peak suspense (3.0) occurs at Scene 1".

**The one that survives** is `GOAL_WITHOUT_OPPOSITION` still being suppressed
on BAD — see §5.1, which explains why, and reports a second false negative of
the same origin that this change CREATED.

### 3.2 — The matched pair's top ten, judged against the text

Fifty findings would be five scripts' top tens; ground truth is only certain
for the two fixtures written for this purpose, so those twenty are judged. A
finding is counted false when it asserts something the script text
contradicts.

| | before | after |
|---|---|---|
| EXCELLENT top-10 | **9 false / 10** | **9 false / 10** |
| BAD top-10 | 1 false / 10 | 1 false / 10 |

**This is the most important number in this document and it did not move.**
Every one of EXCELLENT's six removed false positives was replaced in the top
ten by another absence-shaped structural finding that is equally false
(`WEAK_MIDPOINT` on a script whose midpoint IS the reversal;
`MIDPOINT_REVERSAL_ABSENT` on the same scene; `REVELATION_DROUGHT` across
scenes 4–7, which contain three revelations; `DARK_NIGHT_ABSENT` across the
scene where Gil names what he stands to lose; `PURPOSE_CLIMAX_ABSENT` on a
script with an unmistakable scene-9 climax). The top ten is a QUEUE. Emptying
seats promotes the next-worst occupant; it does not fix the queue.

---

## 4. Everything that moved

### 4.1 — Output identity (`check-doctor-output-identity.mjs`, `main` = c21fdc5b)

`OUTPUT IDENTITY: FAIL — 45 fixture(s) differ`, which is intended. Of the 45
report fixtures: **38 moved** on health/verdict/sceneCount/issue count,
**3 changed VERDICT**, **0 changed sceneCount**.

The three verdict changes are all calibration samples rising past the
CONSIDER threshold: `Reasonable Doubt` (53.2 → 60.6), `Second Wind`
(58.2 → 63.1), `The Visit` (55.0 → 61.2) — all PASS → CONSIDER.

Largest health movements:

| fixture | health | words | why |
|---|---|---|---|
| `screenplay/room-12` | 33.5 → **0.0** | 427 → 338 | 21% of its denominator was licence text; 197 findings on 338 real words clamps the score at the 0 floor |
| `screenplay/transfer-window` | 31.9 → **15.4** | 454 → 379 | same shape, 17% metadata |
| `calibration/Adrift` | 31.8 → 44.7 | — | reversal predicate now reachable (3 dips) |
| `calibration/Merge` | 20.9 → 31.5 | — | same |
| `calibration/The Dead Drop` | 39.8 → 48.1 | — | same |
| `calibration/The Grift` | 17.6 → **12.4** | — | the only calibration sample to fall: ON_THE_NOSE now fires 8× where it fired 6× |
| `screenplay/undertow` | 77.1 → 78.3 | 884 → 826 | boneyard out of the denominator, reversal reachable |
| `p0/sample-script` | 78.3 → 78.3 | 1830 → 1806 | unchanged health |

**room-12 at 0.0 is a clamp, and it deserves the owner's eye.** Nothing about
the script changed and its finding count is identical (197 → 197); only the
denominator did. That is the verbosity-bias correction working in the honest
direction, but a floor-clamped score carries no information, and two of the
20 shipped fixtures now sit near or on it.

### 4.2 — Calibration band averages (the CLAUDE.md-named concern)

| band | before | after |
|---|---|---|
| strong | 62.4 | **65.6** |
| competent | 52.5 | **58.2** |
| weak | 42.1 | **45.5** |
| troubled | 37.1 | **40.3** |

Strict band monotonicity holds before and after, and
`tests/core/calibration.test.ts` passes unchanged. But note honestly that
every band rose 3–6 points and **the strong-to-competent gap NARROWED from
9.9 to 7.4**. The calibration corpus's separation is slightly weaker than it
was. No threshold was retuned to accommodate this.

### 4.3 — Metamorphic

`npm run test:metamorphic` — 6/7 raw, hard passes 6, one documented
known-failing witness (`empty_verbosity`, Δ=5.60, the pre-existing verbosity
bias). Unchanged from baseline. Hard invariants hold.

---

## 5. What this does NOT fix, and one thing it makes worse

### 5.1 — The relief lexicon has the same word-sense defect, and the corrected threshold makes it reachable

`RELIEF_WORDS` contains `quiet`, `calm`, `rest`, `settle`, `relieved`. It has
the same problem §2.4 fixed on the danger side: "a **quiet** gallery"
describes a LOCATION, not a de-escalation. Under `< -1` nothing noticed,
because that threshold was unreachable. Under `<= -1` a single incidental
relief word is a "reversal".

Three measured consequences, reported because they are costs of this change:

1. `tests/core/reversal-detection.test.ts`'s "linear no-twist heist" fixture
   scored a reversal on the word `quiet` in "a quiet gallery". The fixture's
   stated intent is a script with no tension movement at all, so the word was
   changed to `shuttered` — the fixture now matches its own documented
   design. The reason is recorded at the fixture.
2. **`GOAL_WITHOUT_OPPOSITION` is still suppressed on BAD**, the one audit
   defect that survives §3.1. BAD has no antagonist at all, but "Everyone is
   quiet." and "I am very relieved." produce `suspenseDelta = -1`, which the
   predicate reads as opposition.
3. **A NEW false negative this change created:** `NO_REVERSALS` and
   `NO_REVERSALS_LONG_STORY` no longer fire on BAD — a script that genuinely
   has no reversals — for exactly the same reason. Before, they fired on
   everything and were therefore right about BAD by accident. Now they are
   wrong about it for a stateable reason. That is a better failure (it can be
   diagnosed and fixed) but it is still a failure, and pretending the
   threshold fix is free would be dishonest.

Auditing `RELIEF_WORDS` the way §2.4 audited `DANGER_TENSION_WORDS` is the
obvious next lane and is separate scoring work with its own measurement.

### 5.2 — Left standing from the audit

- **R1 — four sparse binary channels.** `emotionalShift == 'neutral'` on
  92.8% of scenes, `clockRaised` on 7.4%, `revelation` on 6.9%. Every
  "X is absent" rule reads absent almost everywhere. Untouched, and it is the
  mechanism behind §3.2's unmoved number.
- **R3 — the clue/setup-payoff layer is an ALL-CAPS token detector.** Every
  "clue" the excellent script seeds is a CHARACTER NAME (`noor-hamdan`,
  `gil-abara`, `tess-okonjo`); its actual planted objects are invisible.
  Untouched.
- **R8 — contradictions inside one top ten.** Partly relieved as a side
  effect (the scene-1 peak claims are gone) but the mechanism is untouched.
- **The pass monoculture and the top-ten queue.** 122 of 150 top-priority
  slots came from one pass; ties break on pipeline execution order.
  Untouched, and §3.2 shows why that matters more than any individual rule.
- **`DEEP_REVERSAL_HEALS`** remains an unreachable predicate on purpose
  (§2.1).
- **Seven raw-line scanners** still read the fountain without masking (§2.6c).
  They measured clean on this corpus; that is not proof.

---

## 6. Everything re-locked, with its justification

Nothing was retuned to make a test pass. Each entry states why the new value
is RIGHT, not merely different.

| what | change | why the new value is right |
|---|---|---|
| `tests/passes/structure.test.ts`, `tests/passes/conflict.test.ts` — the NO_REVERSALS honesty-hedge assertions | `/suspenseDelta < -1/` → `/suspenseDelta ≤ -1/` | The assertion's subject is that the finding DISCLOSES the exact predicate it measured. The predicate changed; the disclosure must too, or the finding would be lying to the writer about its own threshold. |
| `tests/core/reversal-detection.test.ts` — D3 positive fixture | `legacyCount === 0` → the legacy channel's scene SET does not include sceneIdx 12 | D3's claim is not a cardinality. It is that the legacy suspense channel cannot see the allegiance reveal at scene 12. With the corrected threshold legacy flags sceneIdx 2 (the GATE scene) and still misses 12 — a STRONGER demonstration of the same claim, and one no future threshold change can satisfy by accident. |
| same file — `computeReversalDelta` on that fixture | `delta >= 1` → assert the channels flag DIFFERENT scenes while the delta reads 0 | Both channels now report one reversal, at two different scenes. The delta stat compares CARDINALITIES, so it reads 0 while the channels disagree completely. That is a real blind spot in the stat, asserted rather than papered over, so a future wiring decision cannot read `delta === 0` as "the channels agree". |
| same file — "linear no-twist heist" fixture | "a quiet gallery" → "a shuttered gallery" | See §5.1. The fixture's documented intent is a script with no tension movement; `quiet` is a RELIEF_WORD and made that intent quietly false. Changing the word makes the fixture match its own design. The finding it exposed is recorded, not hidden. |
| `tests/core/agency-signal.test.ts` — D1 canonical fixture | `records[12].suspenseDelta === 3` → `=== 2`, plus a new assertion that scene 12 is still the strict maximum | The fixture's peak line is "Vance steps out of the dark, gun raised." `gun` (kept) and `dark` (dropped, 0/15 peril readings) were both counting, so removing one costs exactly one point. D1's claim is about WHICH scene is the peak and whether the protagonist reads passive there; both are asserted and both unchanged. |
| same file — the 20-script locked corpus table | fully re-measured | The table is keyed on the peak-suspense scene, and the danger lexicon feeds it. Its own header requires re-measurement on drift. **The aggregate honesty assertions did not move**: `d1Disagreement` is still exactly 1 (mise), `d2Disagreement` still exactly 3 (quiet-season, the-detour, undertow) — the detector's selectivity claim has now survived two independent corrections to the signal underneath it. |
| `tests/passes/dialogue.test.ts` — three ON_THE_NOSE density fixtures | a third on-the-nose line added to each | The gate's SCOPE changed from per-scene to script-wide and its threshold from 2 to 3. Each fixture's subject (that a given word/template matches at all) is unchanged; the fixture now expresses the current contract instead of the retired one. |
| same file — SYCOPHANTIC_AGREEMENT | description assertion updated; a new NEGATIVE test added for a mid-scene agreement | The existing positive fixture is already scene-terminal and still fires, so the gate is demonstrably satisfiable. The new negative test pins the exact case the audit found. |
| `tests/core/core-02.test.ts` — `SAMPLE_FOUNTAIN` | a third on-the-nose line ("I am still ashamed about the Henderson file.") | Same reason. It also exercises the widened filler (`still`) and the new cross-scene counting. |
| `tests/core/core-03.test.ts` — print-CSS block-type coverage | `title_page` added to the not-styled set | A title page is not body prose. Every exporter ALREADY skipped these lines when building the body and rendered them separately (`export-title-page.ts`). Before this change the print path printed "Title: X" as an action line at the top of page 1; it is now dropped from the body, matching what DOCX and FDX already did. |
| `tests/core/pure-core-boundary.test.ts` — CORE_ALLOWLIST | `server/nvm/screenplay/suspense-dip.ts` added with its justification | A new leaf on the deterministic core's import graph. The allowlist is the mechanism for declaring that deliberately, and the entry names which report number it helps compute. |

---

## 7. The owner's command sequence to finish

Run on the machine that holds the private corpus.

```sh
# 1. The real-corpus measurement this branch cannot run.
REAL_SCRIPT_CORPUS_DIR=<local corpus> npm run measure-real

#    Read the AUC-24 against the ratchet in scripts/lib/auc.ts (>= 0.622,
#    last measured 0.731). This change moves health on 38 of 45 fixtures, so
#    treat a fall as a real finding about the six fixes, not as a reason to
#    move the floor.

# 2. Re-lock the CI-visible table so the floor is asserted without a corpus.
REAL_SCRIPT_CORPUS_DIR=<local corpus> npm run lock-auc24

# 3. Re-lock the real-corpus manifest — this change moves produced scripts'
#    health, so the manifest is owed one (CLAUDE.md's env-gated-harness note).
REAL_SCRIPT_CORPUS_DIR=<local corpus> node --experimental-strip-types \
  tests/core/real-script-corpus.test.ts

# 4. Append a SUPERSEDING receipt to docs/p1-benchmark/MEASUREMENT_RECEIPTS.md
#    with the real SHA, the real AUC, and a first-person attestation, pointing
#    back at the PENDING entry it discharges. Then:
node scripts/check-scoring-receipt.mjs main..HEAD    # must now exit 0

# 5. While the corpus is open, settle the question the previous correction
#    raised and this one inherits:
grep -c '^//' <local corpus>/*        # provenance headers in the real corpus?
head -3 <local corpus>/<a few files>  # plain-text headers or title pages?

# 6. Full gates, then merge.
npm run lint && npm test && npm run build && npm run test:metamorphic
```

---

## 8. Honest assessment

Six specific false claims are gone and sixteen of the audit's seventeen named
defects with them. A rule that was a constant on 42 of 42 scripts now
separates them. A rule that could not fire on a script made entirely of the
defect it targets now fires four times on it and zero times on its
well-made twin. Three findings that printed impossible facts print true ones.
The health denominator no longer counts the repository's own filing system.

And the audit's central measurement — that the tool's accuracy is inversely
proportional to draft quality — is essentially unmoved. The excellent and bad
scripts still score 76.0 and 76.0, still share 7 of 10 top priorities, and
the excellent script's top ten is still 9/10 false. These six fixes remove
false claims from the surface; they do not touch the mechanism that generates
them, which is R1 — four sparse binary channels that read "absent" on
almost every script, feeding a top-ten queue that promotes whichever
absence-shaped finding happens to be next in pipeline order. That is the
problem. This is not a fix for it.
