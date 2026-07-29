# Real-Script Discrimination Evidence — 2026-07-28

**Lever 2 of the STORYMACHINE active-work prompt.** This document records what
the *current* Script Doctor score actually does on REAL produced screenplays,
without changing the score. It is freeze-permitted evidence: the only artifacts
this work added are the measurement script (`scripts/measure-real-script-discrimination.ts`),
this results doc, and one `package.json` script alias. No engine, scoring, rule,
detector, calibration, or renderer code was touched.

## How to reproduce

**Command:**
```
REAL_SCRIPT_CORPUS_DIR="../real-script-corpus" npm run measure-real
```

**Environment:**
- Date: 2026-07-28
- Node: >= 22.6 (run via `node --experimental-strip-types`)
- Corpus dir: `../real-script-corpus` (sibling to the repo; **local-only, copyright — never committed**)
- Corpus contents: 73 `.fountain.txt` files of PRODUCED feature films — the **STRONG class only**
- Manifest: `tests/fixtures/real-corpus-manifest.json` (72 entries, facts only: filename, contentHash, health, verdict, sceneCount)
- `REAL_SCRIPT_CORPUS_DIR` is **env-gated** — when unset, the script SKIPS cleanly with exit code 0 (same contract as `tests/core/real-script-corpus.test.ts`). It is never set as a default.
- Pipeline elapsed: 25.3s for the full 73-script produced-class pass; ~120 doctor runs total including the degradation AUCs.

**What was re-run:** `npm run measure-real` was actually executed against the real
corpus on 2026-07-28 and exited 0. The numbers below are the real captured output,
not synthesized.

---

## Honesty boundary (read first)

**This is NOT "strong-vs-weak craft" discrimination.** The corpus is the STRONG
(produced-feature) class only. There is **no weak human-written contrast class** —
`docs/p1-benchmark/SCREENPLAY_SOURCING_TODO.md` Task 1 documents this as the open
gap. Therefore nothing here proves the score ORDERS a genuinely weak human script
below a genuinely strong one. The three honest things measured here are:

1. **Produced-floor** — does the score stay sane (≥ 80) on real produced features?
2. **Distribution** — what does the score's spread look like on real writing?
3. **Degradation-discrimination** — does the score DROP when a script's structure
   is deterministically destroyed (paired test: intact vs scrambled versions of the
   *same* produced script)?

Calling produced-floor "strong-vs-weak discrimination" would be the fabrication
this project's constitution forbids.

---

## 1. Produced-class health distribution (n = 73)

| Metric | Value |
|---|---|
| Scripts measured | 73 |
| Health mean | **93.10** |
| Health median | 93.20 |
| Health min / max | **84.6 / 98.9** |
| Below floor (< 80) | **0 / 73** — floor holds on every produced feature |

**Health histogram:**

| Bucket | Count |  |
|---|---|---|
| 00–59 (PASS band) | 0 | |
| 60–69 | 0 | |
| 70–79 | 0 | |
| 80–84 | 1 | █ |
| 85–89 | 28 | ████████████████████████████████████ |
| 90–94 | 13 | █████████████████ |
| 95–100 | 31 | ████████████████████████████████████████ |

**Verdict breakdown:** RECOMMEND 72 (98.6%) · CONSIDER 1 (1.4%) · PASS 0

**Grade breakdown:** excellent 44 (60.3%) · strong 29 (39.7%) · solid/uneven/troubled 0

**Issues across corpus:** 54,800 total (critical 561 · major 9,678 · minor 44,561)

**Per-dimension score spread** (displayed `DimensionScore`, NOT overall health):

| Dimension | mean | min | max |
|---|---|---|---|
| Structure & Pacing | 96.8 | 90.7 | 99.1 |
| Character | 92.2 | 65.8 | 99.2 |
| Dialogue & Voice | 98.8 | 90.3 | 100.0 |
| Plot Logic & Payoff | 91.2 | 76.1 | 99.1 |
| Theme & Originality | 100.0 | 99.8 | 100.0 |

**Reading.** Every produced feature clears the 80 floor and 98.6% verdict
RECOMMEND. The distribution is tight (84.6–98.9, SD compressed into the top
band) — consistent with a corpus that is uniformly professional craft. The
single 80–84 outlier and the lone CONSIDER are the same script
(`A_Scanner_Darkly_Matched`, health 84.6) — it is the one CONSIDER entry in
the manifest. Note `Theme & Originality` pins at ~100 across the corpus, i.e.
that dimension carries near-zero separating signal on this class.

---

## 2. Structural-degradation AUC (first 24 manifest scripts, paired test)

Each of the first 24 manifest scripts is run intact AND as a deterministically
degraded version of itself; AUC is the pairwise fraction of (intact, degraded)
pairs where intact scores higher (ties count half). **0.5 = coin flip (score
does not notice the damage), 1.0 = perfect, < 0.5 = inverted.** These recipes
are copied verbatim from `tests/core/real-script-corpus.test.ts` so the numbers
are directly comparable to the regression harness's ratcheted floors.

### Recipe 1 — shuffle-drop
Scenes are shuffled (seeded) and every 3rd scene is dropped. Surface craft
(prose, dialogue, action lines) is byte-identical; only global structure
(scene order, continuity, density) is destroyed.

| | Value |
|---|---|
| **AUC** | **0.759** |
| Mean intact health | 92.90 |
| Mean degraded health | 87.03 |
| Mean drop | 5.87 pts |

**Interpretation:** the score DOES drop when scenes are wholesale-scrambled and
thinned. AUC 0.759 is comfortably above coin flip — the doctor notices this kind
of structural damage most of the time. This is the recipe the existing structural
detectors (`SCENE_CONTINUITY_COLLAPSE`, continuous arc-incoherence) were tuned
against, so a lift here is expected; the regression harness ratchets a floor of
0.622 against this same 24-script subset.

### Recipe 2 — act-swap
The script is cut into three contiguous thirds (by scene count) and reordered
3rd-1st-2nd. Every scene KEEPS its immediate neighbors (local adjacency,
character continuity, day/night runs all preserved within each third); only the
GLOBAL arc is destroyed (the climax now opens the document, the setup closes it).

| | Value |
|---|---|
| **AUC** | **0.609** |
| Mean intact health | 92.90 |
| Mean degraded health | 91.15 |
| Mean drop | 1.75 pts |

**Interpretation:** the score barely moves under act-swap. AUC 0.609 is only
slightly above coin flip and the mean drop is just 1.75 points — the doctor is
largely **blind to global-arc / act-order damage** when local scene continuity is
preserved. This matches the regression harness's own recorded finding (act-swap
AUC has historically sat at ~0.48–0.62 across waves; the harness carries it as a
todo-only target, not a hard floor, precisely because it has never cleared the
0.55 ratchet bar by a safe margin). The structural signal that does exist here
comes from the continuous arc-incoherence deduction reading emotional-arc
position; there is no detector that directly reads "which third of the document
this scene belongs in."

---

## 3. Manifest cross-check

`tests/fixtures/real-corpus-manifest.json` carries the locked expectations.
The cross-check rule mirrors the regression test:
- **contentHash matches** → freshly computed health/verdict/sceneCount must match the manifest **exactly** (the determinism claim on real material).
- **contentHash differs** → only the produced-floor (health ≥ 80) must hold.

| | Count |
|---|---|
| In manifest | 72 / 73 |
| &nbsp;&nbsp;hash exact match (byte-identical input) | 72 |
| &nbsp;&nbsp;floor-only (hash differs) | 0 |
| Not in manifest (computed, no locked expectation) | 1 |
| **Mismatches** | **1** |

### Mismatch (real finding — flagged, not fixed)

| File | Field | Computed | Manifest |
|---|---|---|---|
| `inside-out-screenplay.fountain.txt` | health (hash match) | **87.6** | 95.1 |

The local file's `contentHash` matches the manifest **exactly**
(`b11cb8ba18911311b0e9fc6acf0b4a7af1499df6d1391bb9e772b703f52e5398`), and
`verdict` (RECOMMEND) and `sceneCount` (387) both still match — but **health
drifted from the manifest's 95.1 to a freshly-computed 87.6** on byte-identical
input. The fresh run reports 11 critical / 472 major / 684 minor issues
(19,651 words). This is a genuine determinism discrepancy on real material: a
scoring or rule change shipped after the manifest was last regenerated moved
health on this specific input by 7.5 points without changing the hash, verdict,
or scene count.

This is exactly the class of regression the corpus harness exists to catch, and
it is reported here as a discovered discrepancy. It is **out of scope for this
freeze to fix**: the manifest is the regression harness's contract and the
scoring/rules are frozen. The parent session should decide whether to (a)
regenerate the manifest entry to lock the new value, or (b) treat the 7.5-point
drift as a regression to investigate. The single "not in manifest" file
(`inside-out-screenplay.fountain.txt` is in the manifest; the one un-manifested
file is a corpus script present on disk but absent from the 72-entry manifest —
informational only).

> Note: `tests/core/real-script-corpus.test.ts` asserts exact health on
> hash-matching input, so this same discrepancy will surface as a test failure
> when the parent runs the full suite with `REAL_SCRIPT_CORPUS_DIR` set. This
> document does not modify the manifest or the test.

---

## Honest plain-language summary

**What the current score DOES show on real writing (73 produced features):**

1. **Produced-floor holds.** Every produced feature scored health ≥ 80 (range
   84.6–98.9, mean 93.1). This is the regression the corpus was built to catch:
   the original ORPHAN_CLUE flood saturated four produced features to health 0;
   the floor guarantees that class of systemic collapse is immediately visible.
   It has not recurred.
2. **Degradation-discrimination:**
   - shuffle-drop AUC **0.759** (mean intact 92.9 → degraded 87.0, −5.9 pts).
     The score notices wholesale scene-scrambling most of the time.
   - act-swap AUC **0.609** (mean intact 92.9 → degraded 91.1, −1.8 pts). The
     score is largely blind to global-arc/act-order damage when local continuity
     is preserved.

**What the current score does NOT show (the missing piece — do not over-claim):**

This is **not** "strong-vs-weak craft" discrimination. The corpus is the STRONG
(produced-feature) class only. There is no weak human-written contrast class —
`docs/p1-benchmark/SCREENPLAY_SOURCING_TODO.md` Task 1 documents this as the
open gap. Nothing here proves the score ORDERS a genuinely weak human script
below a genuinely strong one. The degradation AUCs are a **paired
structural-damage test** (intact vs scrambled versions of the same produced
script), not a craft-quality test across different scripts. Calling
produced-floor "strong-vs-weak discrimination" would be the fabrication this
project's constitution forbids.

**One real discrepancy surfaced:** `inside-out-screenplay.fountain.txt` hash-matches
the manifest but its health drifted 95.1 → 87.6 (see §3). Reported, not fixed —
out of freeze scope.

---

## Artifacts added by this work

- `scripts/measure-real-script-discrimination.ts` — env-gated, facts-only measurement script (reuses `runScriptDoctor` + the seeded PRNG from `server/nvm/repro/seed.ts`; recipes copied verbatim from the regression harness).
- `docs/scoring/REAL_SCRIPT_DISCRIMINATION_2026-07-28.md` — this document.
- `package.json` — one line: `"measure-real": "node --experimental-strip-types scripts/measure-real-script-discrimination.ts"`.

**Freeze compliance:** no changes to `doctor.ts`, any pass file, calibration,
constants, rules, detectors, the renderer, or report math. No `console.*` added
under `server/**` (the script lives under `scripts/`, where console output is
expected). No screenplay text committed. `REAL_SCRIPT_CORPUS_DIR` stays env-gated.
No strong-vs-weak claim made.
