# Structural-form bias experiment — settling D7's magnitude claim, 2026-08-03

D7 in `DETECTOR_DEFECTS_2026-08-03.md` establishes, with high confidence, a
**mechanism**: `StoryContext` (the only context the 14 scoring passes
receive) has no `structure` field, so a screenplay written to the engine's
own Kishōtenketsu preset (`server/lib/structure-presets.ts` ~356-385) is
scored against a hard-coded three-act model
(`server/nvm/screenplay/structure.ts`) with no accommodation. D7 rates its
own **magnitude** claim only "moderate confidence — no Kishōtenketsu script
has been run" and names eight rules it predicts will fire on Kishōtenketsu
material but not on a matched three-act control: `FLAT_SUSPENSE_ARC`,
`NO_REVERSALS` / `NO_REVERSALS_LONG_STORY`, `PROTAGONIST_PASSIVITY_CLIMAX` /
`PASSIVE_ACT3_INTENTION`, `WEAK_MIDPOINT`, `ACT2A_SUSPENSE_VOID`,
`ACT1_TOO_LONG`, `DARK_NIGHT_ABSENT`, `FALSE_CLIMAX` / `CLIMAX_TOO_EARLY`.

This experiment settles the magnitude question empirically. No scoring code
was changed; this is measurement only.

**Verdict up front:** at this fixture scale, **D7's magnitude prediction is
refuted**. Every one of the eight predicted rules either (a) did not fire on
any fixture, (b) fired identically on both structural forms, or (c) fired
**only on the three-act control** — the opposite of the predicted direction.
Health delta between matched pairs was 0.0 and −0.3 points (kishotenketsu
minus control) — noise, not signal. No verdict boundary was crossed by
either form. D7's mechanism claim is unaffected by this result and remains
correctly documented; it is the "and therefore Kishōtenketsu drafts get hit
hard" inference this experiment does not support at the scale tested. See
Limitations for why this cannot be extrapolated to feature length.

## Method

Two matched pairs of short screenplays were written, one Kishōtenketsu arm
and one three-act control per pair, differing **only** in which of
`structure-presets.ts`'s two beat templates they follow:

- **Pair 1** — "The Lantern Keeper" (Kishōtenketsu) vs. "The Last Watch"
  (three-act control). 12 scenes each. A retired lighthouse keeper and her
  granddaughter.
- **Pair 2** — "The Restorer's Hand" (Kishōtenketsu) vs. "Border of Lies"
  (three-act control). 16 scenes each — deliberately at/above
  `doctor.ts`'s `ARC_DED_MIN_SCENES = 15`, so this pair (unlike Pair 1)
  exercises the continuous `arcIncoherenceDeduction`, which Pair 1's 12
  scenes cannot reach at all.

Both pairs are N=1 within their arm; across the two pairs this is N=2 per
form — an existence check, not a rate or an AUC. See Limitations.

Fixtures: `tests/fixtures/structural-form-experiment/pair{1,2}-{kishotenketsu,three-act-control}.fountain`.
Probe: `docs/p1-benchmark/probe-structural-form-bias.mjs` (run with
`node --experimental-strip-types docs/p1-benchmark/probe-structural-form-bias.mjs`).

### Beat-map arithmetic used to lay out scenes

For each pair, scene boundaries were computed directly from
`structure-presets.ts`'s `pct_start`/`pct_end` values against the fixture's
scene count `n`, using the same `Math.floor(n * pct)` arithmetic the engine
itself would use, so each scene actually sits inside the beat its content is
claiming:

- Kishōtenketsu (Ki 0–25, Shō 25–50, Ten 50–75, Ketsu 75–100): n=12 → Ki
  1–3, Shō 4–6, Ten 7–9, Ketsu 10–12. n=16 → Ki 1–4, Shō 5–8, Ten 9–12,
  Ketsu 13–16.
- Three-act (Act One 0–22, Inciting 22–28, Act Two 28–72, Climax 72–86,
  Act Three 86–100): n=12 → Act One 1–2, Inciting 3, Act Two 4–8, Climax
  9–10, Act Three 11–12. n=16 → Act One 1–3, Inciting 4, Act Two 5–11,
  Climax 12–13, Act Three 14–16.

Each Kishōtenketsu scene was written to satisfy that beat's stated `goal`
and `constraint` and to respect its `avoid` line (no antagonist in Ki/Shō, no
conflict-resolution of the Ten twist, no winners/losers in Ketsu). Each
three-act scene was written the same way against its own template (a named
antagonist introduced at the Inciting Incident, escalating opposition
through Act Two, a decisive confrontation at the Climax with a clear winner
and loser, proportionate Act Three resolution).

### Matched-quality argument

The concern that invalidates this kind of experiment is writing a strong
three-act script against a deliberately weak or strawman Kishōtenketsu one
(or vice versa). Four concrete controls were used:

1. **Shared text at the point the templates agree.** In both pairs, the
   opening scene(s) are **textually identical** between the Kishōtenketsu
   and three-act arm — both templates call for pure, conflict-free
   establishment before their respective inciting/complicating beat (Ki's
   "no antagonism," three-act's own "avoid: introducing the inciting
   incident before the world and stakes are legible"). Divergence begins
   exactly at the scene where the beat maps diverge (scene 3 in Pair 1,
   scene 4 in Pair 2). This holds prose quality constant by construction
   for roughly a quarter of each script, rather than by assertion.
2. **Same protagonist, setting, and secondary cast** within each pair — Mira
   and Pearl at the same lighthouse; Yuki and Dev at the same restoration
   studio — so no pair compares different worlds or different character
   work, only different structural shapes imposed on the same people and
   place.
3. **Matched scene count exactly** (12/12, 16/16) and **matched word count
   closely**: Pair 1, 945 vs. 952 words (0.7% apart); Pair 2, 1,161 vs.
   1,073 words (7.6% apart, control shorter).
   > **⚠ 2026-09-04 — those word counts included unequal metadata.** All four
   > fixtures carried a `//`-prefixed provenance header that the parser read as
   > ACTION (`//` is not Fountain comment syntax — the boneyard `/* */` is,
   > `src/lib/fountain.ts:110`), and the two arms of each pair carried headers of
   > DIFFERENT lengths: Pair 1, 88 vs. 91 header words; Pair 2, 101 vs. 84. So 3
   > of Pair 1's disclosed 7-word gap and 17 of Pair 2's disclosed 88-word gap
   > were repository filing metadata, not screenplay — in a design whose whole
   > premise is holding everything but structural form constant. The headers are
   > now real boneyards. Post-fix counts: Pair 1, 937 vs. 943; Pair 2, 1,151 vs.
   > 1,065. (`wordCount` still counts boneyard text — see
   > `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`, 2026-09-04, for that residual —
   > so these are still not pure body counts; the *unequal* part is what the fix
   > removed.) Matched dialogue ratio by a
   simple lexical count (dialogue words / total words): Pair 1, 0.40 vs.
   0.42; Pair 2, 0.30 vs. 0.37 — the control runs a bit more dialogue-heavy
   in Pair 2, which is disclosed rather than smoothed over, since
   confrontation scenes naturally pull more dialogue than discovery scenes.
4. **Craft register held constant** by writing both arms to the same
   reference bar: specific sensory detail (a UV loupe fluorescing pale
   blue; brass gears timed against a pulse), distinct character voices
   (Mira's dry economy vs. Pearl's directness; Yuki's precision vs. Dev's
   plainer commentary), subtext-carrying dialogue rather than on-the-nose
   statement, and scene-ending beats that land on image or turn rather than
   exposition — matching the register of this repo's own "strong-band"
   calibration fixture (`data/screenplays/dead-frequency.fountain`), not
   the deliberately-weak "troubled-band" register
  (`data/screenplays/room-12.fountain`). Both arms of both pairs were
  written to this same bar; neither was written down to make a point.

The three-act controls are not strawmen: Hollis Kade and Callum Reyes are
both given working motives, and both controls resolve their conflicts
through the concrete plot mechanics (a beaten filing deadline; a UV-scanned
fingerprint) their own genre would use, not through convenient shortcuts.

Per the task's honesty requirement: **fixtures were written once to the
template and run once.** No fixture was revised after seeing its score, and
none of the four fixtures was rewritten to chase or avoid a predicted rule.

## Results

All four numbers, raw from the probe (`node --experimental-strip-types
docs/p1-benchmark/probe-structural-form-bias.mjs`):

| Pair | Form | Scenes | Words | Health | Grade | Verdict | Issues (crit/major/minor) |
|---|---|---|---|---|---|---|---|
| 1 | Kishōtenketsu ("The Lantern Keeper") | 12 | 945 | 78.3 | strong | CONSIDER | 1 / 31 / 113 (145) |
| 1 | Three-act control ("The Last Watch") | 12 | 952 | 78.3 | strong | CONSIDER | 2 / 32 / 116 (150) |
| 2 | Kishōtenketsu ("The Restorer's Hand") | 16 | 1,161 | 81.0 | strong | CONSIDER | 1 / 40 / 158 (199) |
| 2 | Three-act control ("Border of Lies") | 16 | 1,073 | 81.3 | strong | CONSIDER | 1 / 40 / 128 (169) |

> **⚠ 2026-09-04 — re-measured after the corpus-integrity correction, and the
> conclusion holds.** The four fixtures' `//` provenance headers were converted
> to real boneyards (see the note under "Matched scene count" above). The table
> was then re-run on `main` (at `fbd8ee15`, whose doctor reports are
> byte-identical to the current tip `26b828f4428fd7ee9b2431735e4ba5bef773714a`
> across all 45 in-repo fixtures) and on
> the corrected tree, same code both times:
>
> | Pair / form | health (main, contaminated) | health (corrected) | issues (main) | issues (corrected) |
> |---|---|---|---|---|
> | 1 Kishōtenketsu | 78.3 | **78.3** | 1/32/100 (133) | 1/32/100 (133) |
> | 1 three-act control | 78.3 | **78.3** | 2/32/110 (144) | 2/32/98 (132) |
> | 2 Kishōtenketsu | 81.3 | **81.3** | 1/39/119 (159) | 1/35/123 (159) |
> | 2 three-act control | 81.3 | **81.3** | 1/38/128 (167) | 1/36/127 (164) |
>
> **The health deltas are 0.0 and 0.0 after the correction** — the experiment's
> finding (no structural-form bias in health) is unaffected. Two caveats worth
> stating rather than burying. First, the issue counts moved, so any conclusion
> drawn from issue COUNTS in this doc rather than from health should be re-run.
> Second, the table above already differed from `main` BEFORE this correction —
> the doc records Pair 2 Kishōtenketsu at health 81.0 and issue totals of
> 145/150/199/169, while `main` itself now produces 81.3 and 133/144/159/167.
> That drift is from later engine changes, not from this correction, and it means
> the printed table is stale on its own terms: re-run the probe before citing any
> single number from it.

**Health delta (Kishōtenketsu − control): Pair 1 = 0.0, Pair 2 = −0.3.**
Both deltas are far inside rounding/formatting noise, not a directional
effect. In Pair 1 the Kishōtenketsu arm had *fewer* total issues (145 vs.
150) and *fewer* criticals (1 vs. 2) than its three-act control — the
opposite of what D7 predicts.

**Verdict boundaries:** none crossed. All four land in CONSIDER
(`60 <= health < 85`, or `health >= 85` with `sceneCount < 8` — not the case
here); none reached the `RECOMMEND` floor (`health >= 85 && sceneCount >=
8`) or fell to `PASS` (`health < 60`). The Kishōtenketsu/three-act split did
not push any fixture across a boundary the other side of the pair didn't
also sit near.

**arcIncoherenceDeduction** (`doctor.ts` ~1908-1921:
`min(15, 8 * max(0, 1.2 - arcHealth))`, gated on `sceneCount >=
ARC_DED_MIN_SCENES = 15`):

| Pair | Form | Scenes | Gate reached? | arcHealth | Deduction |
|---|---|---|---|---|---|
| 1 | Kishōtenketsu | 12 | No (< 15) | 1.277 | not applicable |
| 1 | Three-act control | 12 | No (< 15) | 1.762 | not applicable |
| 2 | Kishōtenketsu | 16 | **Yes** | 2.035 | **0.0** |
| 2 | Three-act control | 16 | **Yes** | 1.495 | **0.0** |

Pair 1's 12 scenes never reach the 15-scene floor, so — as flagged in the
task brief — **the arc deduction is untested by that pair**; do not read
Pair 1's equal health as evidence the deduction is unbiased, since it never
ran. Pair 2 does reach the gate and the formula did execute (both
`arcHealth` values exceed the 1.2 reference point, so `max(0, 1.2 -
arcHealth)` floors at 0 and the deduction is 0 for both forms). This is a
genuine result, not an artifact of the gate: the deduction was exercised and
produced no penalty for either form in this sample. It does not establish
the deduction is safe for Kishōtenketsu in general — arcHealth rewards
"monotonic rise, a late peak, and fit to one of six Reagan archetypes" per
D7's own note, and a different Kishōtenketsu draft with a flatter emotional
curve through Ki/Shō could still trip it. It only shows these two
particular fixtures didn't.

## Per-rule prediction: confirm or refute

| Rule (D7 prediction) | Fired on Kishōtenketsu? | Fired on control? | Verdict |
|---|---|---|---|
| `FLAT_SUSPENSE_ARC` | Pair 2 only | Pair 2 only (same pair) | **REFUTED** — fired identically on both forms in Pair 2, absent from both in Pair 1. Not discriminating by structural form. |
| `NO_REVERSALS` / `NO_REVERSALS_LONG_STORY` | Both pairs | Both pairs | **REFUTED as form-specific** (though the underlying defect is real — see below). Fired on all four fixtures, including both three-act controls, one of which stages an explicit last-second reversal (Kade's crew turned back at the gate) and the other an explicit exposure/reveal (Callum caught by his own fingerprint). `reversalCount`/`reversalDensity` (suspense-sign-dip proxy, per D3) missed both, so this rule is not a Kishōtenketsu-specific liability — it appears blind to reversals generally, in either structural form. |
| `PROTAGONIST_PASSIVITY_CLIMAX` | **No** (neither pair) | **Pair 1 only** | **REFUTED, direction reversed.** Fired on the three-act control at "Scene 10 (climax peak)" — the scene where Pearl sprints in with the stay order and Kade's crew is turned back, arguably the most decisive action beat in either script — flagged as passive because the lexicon signals (`emotionalShift`, `clockRaised`, `seededClueIds`) didn't register it. Same D1-family lexicon blindness, but it hit the Western three-act climax, not the Kishōtenketsu one. |
| `PASSIVE_ACT3_INTENTION` | No | No | **Not observed.** Did not fire on any of the four fixtures. |
| `WEAK_MIDPOINT` | **No** (neither pair) | **Pair 1 only** | **REFUTED, direction reversed.** Fired on the three-act control at "Scene 7 (midpoint)" (Pearl finding Tomas's unfinished landmark application) — a quiet discovery beat that happened to land on the mechanically-computed midpoint index, not on the Kishōtenketsu arm's own quieter Shō movement. |
| `ACT2A_SUSPENSE_VOID` | Both pairs | Both pairs | **REFUTED as form-specific.** Fired on all four fixtures equally. |
| `ACT1_TOO_LONG` | No | No | **Not observed.** Neither Ki (25% of scenes by design) nor Act One (22%) pushed page share over the rule's 40% floor in either arm. |
| `DARK_NIGHT_ABSENT` | Both pairs | Both pairs | **REFUTED as form-specific.** Fired on all four fixtures equally. |
| `FALSE_CLIMAX` | No | No | **Not observed.** Did not fire on any fixture. |
| `CLIMAX_TOO_EARLY` | **No** (neither pair) | **Pair 2 only** | **REFUTED, direction reversed.** Fired on the three-act control at "Scene 5" — an investigative scene (missing backup drive) whose suspense lexicon apparently spiked in the analyzer's terms, not on the Kishōtenketsu arm. |

**Score: 0 of 8 predictions confirmed in the predicted direction. 4 not
observed at all on these fixtures. 3 fired identically on both forms
(non-discriminating). 3 fired exclusively on the three-act control — the
reverse of D7's prediction.** (Some rules land in more than one bucket
across the two pairs, which is why the counts don't sum to 8; the per-row
table above is the authoritative record.)

## What this does and does not mean for D7

**The mechanism claim stands untouched.** `StoryContext` genuinely has no
`structure` field; the 14 passes genuinely score every submission against
`server/nvm/screenplay/structure.ts`'s hard-coded three-act zone model;
nothing in this experiment required or produced a scoring change, and
nothing here re-derives or contradicts that part of D7 — it was not what was
being tested.

**The magnitude claim is refuted at this scale.** The predicted rules are
not preferentially triggered by Kishōtenketsu structure in this sample —
several of them (`PROTAGONIST_PASSIVITY_CLIMAX`, `WEAK_MIDPOINT`,
`CLIMAX_TOO_EARLY`) fired on the three-act control instead, which is the
opposite of what a "three-act zone model penalizes non-three-act form"
story predicts. The likely reason, consistent with `CLAUDE.md`'s own
framing of the wider rule catalog: at ~750-1,200 words and 12-16 scenes,
each fixture triggers 145-199 issues total, the overwhelming majority of
them density/scarcity-driven `*_VOID`, `*_DROUGHT_RUN`, `*_ZONE_IMBALANCE`,
and `*_FLATLINE` rules that fire on **both** forms because both forms are
short and lexically thin relative to what ~150 zone rules expect — not
because of which beat template was followed. The eight rules D7 named are
real, and the ones that fired did so for the reason D7 gives (lexicon
signals blind to genuine agency/reversal), but in this sample that blindness
landed on the three-act arm about as often as the Kishōtenketsu arm, so it
is not acting as a Kishōtenketsu-specific tax here. Whether it becomes one
at feature length, where the three-act zone thresholds get many more scenes
to calibrate against and Kishōtenketsu's flatter early acts get proportionally
more scenes to be "flat" in, is exactly the question these fixtures are too
short to answer (see Limitations).

**This is a genuinely welcome result under the framing in the task brief:**
if the engine's order-blindness and density-driven noise are (at short
fixture scale, at least) swamping any structural-form-specific penalty, that
is incidental protection for non-Western form rather than a demonstrated
tax on it — worth reporting with the same weight as a confirmation would
have gotten.

## Limitations (read before extrapolating)

- **N=2 per form.** This is an existence check on two matched pairs, not a
  rate or an AUC. A refutation this clean on N=2 is informative — it rules
  out "large and obviously consistent" — but it cannot rule out a real,
  smaller effect that would show up with N=20+, nor can it rule out that a
  different pair of premises would show the predicted pattern.
- **Short fixtures, not feature-length screenplays.** 12-16 scenes and
  750-1,200 words is far below a produced feature (which the 761-script P1
  corpus and this repo's own calibration fixtures run to). Many zone rules
  (`ACT2A_SUSPENSE_VOID`, `DARK_NIGHT_ABSENT`, etc.) gate on scene count and
  fire near-universally at this scale regardless of structural form, exactly
  as observed here; the density normalizer (`craftPenalty`, `wordCount^0.7`)
  behaves very differently at feature scale. **This result may not
  extrapolate to feature length**, in either direction — a feature-length
  Kishōtenketsu script might show the predicted penalty pattern once density
  noise thins out relative to structural signal, or the refutation could
  hold just as cleanly. Neither is established here.
- **The arc-incoherence deduction is only tested by Pair 2.** Pair 1's 12
  scenes never reach `ARC_DED_MIN_SCENES = 15`, so its matched-zero health
  delta says nothing about that deduction specifically. Pair 2 does reach
  the gate and the deduction fired at 0.0 for both forms — a real result,
  but only two data points against a formula whose inputs (monotonic rise,
  late peak, six-archetype fit) are exactly the properties D7 flags as
  biased against a juxtaposition/synthesis shape. A Kishōtenketsu draft with
  a flatter Shō or a quieter Ketsu than this experiment's fixtures could
  still trip it; this experiment did not sample that region.
- **Two premises, one household of settings each.** Pair 1 (lighthouse
  legacy) and Pair 2 (map restoration) both center on a mentor/inheritance
  motif that suits Kishōtenketsu's "recontextualization" beat naturally;
  they were not chosen to be adversarial to the three-act form, but they
  also weren't chosen from a random sample of premises. A different premise
  pair could shift individual rule outcomes.
- **Author-graded matched quality.** The "matched craft" argument in this
  document rests on the same drafting process (shared opening text,
  matched scene/word counts, a stated craft reference bar) rather than a
  blind third-party craft rating. This is the honest limit of a same-session
  fixture-writing experiment; it is not adversarially validated the way the
  P1 corpus's blind-labeled real writing will be.
- **This is not a substitute for `npm run measure-real`.** No scoring code
  was touched, so nothing here needs the shuffle-drop AUC ratchet re-run;
  this experiment is orthogonal to that gate, not a replacement for it.

## Reproducing this run

```
node --experimental-strip-types docs/p1-benchmark/probe-structural-form-bias.mjs
```

Fixtures are checked in at
`tests/fixtures/structural-form-experiment/pair{1,2}-{kishotenketsu,three-act-control}.fountain`
so the run is byte-for-byte reproducible. The probe recomputes
`arcIncoherenceDeduction` from `report.emotionalArc` using the exact
constants published in `doctor.ts` (`ARC_DED_MIN_SCENES=15`,
`ARC_DED_REF=1.2`, `ARC_DED_K=8`, `ARC_DED_CAP=15`), since the deduction
itself is not a field on `ScriptDoctorReport` — only imported, never
modified.
