# Coverage-Gap Analysis — produced films through the full engine (2026-07-11)

Method: 45 produced animation features (reconstructed to Fountain, rights-safe)
run through the real `runScriptDoctor` — all 14 passes, 3,216 rules, proof
kernel, structural detectors. Produced films are ground-truth "good," so what
the engine flags heavily is a false-positive suspect and what it stays silent on
is missing coverage. Raw output: `outputs/gap_analysis.json`.

## The anchor holds (top-line scorer is well-calibrated)
health mean **95.1** (range 88.3–98.9), **45/45 RECOMMEND**, all ≥ the produced
floor (80). The verdict layer correctly ranks acclaimed films high. The gaps
below are in **precision** (false positives) and **coverage** (missing signals),
not in the verdict.

## What we're missing (verified, highest value first)
1. **Theme extraction is absent → theme analysis is a blind spot.** The theme
   pass has dozens of `THEME_*` rules but emitted **0 issues on all 45 films**,
   because it checks resonance against a *declared* theme and imported scripts
   have none. The theme-originality dimension is therefore vacuously **100** —
   measuring nothing. MISSING: a step that infers a theme statement from the
   script so the (already-built) theme pass can run. High value, self-contained.
2. **Character-goal / intention inference.** `INTENTION_INVISIBLE` fired
   ~127×/film (5,735 total) — every character with no tracked goal. Partly a
   real limitation (deterministic doctor can't infer goals without the deferred
   semantic layer) and partly inflated by imperfect conversion (stray caps →
   spurious "characters"). MISSING: goal/want extraction; also the rule needs a
   per-script cap so it can't flood.
3. **Heuristic-rule false-positive control — empirical proof for W1/W2.** A
   cluster of lexical rules (STACCATO_FRAGMENTATION ~45×/film, and
   EXCLAMATION/QUESTION/COLON_IN_ACTION, COMMA_SPLICE_OVERUSE,
   ACTION_* families) fires on **100% of produced films**. These are exactly the
   `heuristic → pattern_to_watch` detectors the W1 confidence-tier contract is
   built to down-weight. This is the measurement W2 needs: tag this cluster
   heuristic, then measure health/AUC with tier-aware weighting.
4. **Structural detectors that fire on every acclaimed film.** NO_REVERSALS,
   CLIMAX_TOO_EARLY, FALSE_CLIMAX, CHEKHOV_GUN_UNFIRED, DENOUEMENT_OVERLONG,
   NO_REVERSALS_LONG_STORY each fire once on all 45 films. Either near-universal
   (low discriminative value) or false positives on films that demonstrably DO
   have reversals/proper climaxes. AUDIT: if Up/Coco trip NO_REVERSALS, the
   detector is wrong. (Partly conversion-sensitive — see caveat.)
5. **The known global-arc blind spot** (act-swap AUC ≈ 0.48, ROADMAP §5.1)
   is consistent with all of the above: the engine reads content, not
   document-position — so it can't tell a produced film's structure from a
   scrambled one at the act level.

## Honest caveat
These are **reconstructed** Fountains (imperfect PDF→Fountain + one OCR). Some
over-firing — the lexical/punctuation cluster and the intention character-count —
is partly conversion noise, not pure engine error. The robust findings (least
conversion-sensitive) are the **theme-extraction gap** and the **heuristic-tier
validation**; the structural-detector audit (#4) should be re-checked on the
engine's clean 72-script corpus before acting.

## How this feeds the roadmap
- Directly supplies **W2** (tier-weight corpus sweep): the 100%-firing heuristic cluster is the down-weight target; measure the health delta.
- Adds two NEW candidate items: **theme extraction** (unlocks the dormant theme pass) and **intention/goal extraction + INTENTION_INVISIBLE cap**.
- Confirms **W1** was the right first move — the false-positive structure it addresses is real and measurable on produced films.
