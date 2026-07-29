# P1 Discrimination Baseline — 2026-07-29 (UPDATED: corpus expansion)

**Status:** Re-measured on the expanded corpus (761 scripts, mostly live-action).
The previous baseline's headline result (dialogue AUC 0.906) was an artifact
of the animation-heavy 48-script corpus. This update replaces it.

> ⚠️ **Retraction notice:** The 2026-07-29 baseline's claim that "dialogue
> discrimination is solved" (AUC 0.906) is **retracted**. That number was
> measured on 48 animation features where dialogue is dense and character-
> count drives the score hard. On the expanded live-action corpus, dialogue
> flattening barely moves health (mean delta +0.13, AUC 0.54). See §"What
> changed and why" below.

---

## TL;DR

On 761 real produced screenplays (456 train / 152 val / 153 test, seed 42,
hash-locked test set), the doctor health score's discrimination is:

| Degradation | Train AUC | Val AUC | Gate (≥0.80) |
|---|---:|---:|---|
| SCENE_SHUFFLE | 0.727 | 0.725 | partial |
| MIDPOINT_DROP | 0.735 | 0.675 | partial/weak |
| CLIMAX_RELOCATE | 0.481 | 0.540 | **FAIL** (chance) |
| DIALOGUE_FLATTEN | 0.567 | 0.543 | **FAIL** (near-chance) |
| **ALL POOLED** | **0.627** | **0.621** | **FAIL** |

No channel clears the 0.80 gate on the expanded corpus. The pooled AUC is
~0.62 — above chance (0.50) but well below the gate. This is a **more honest
and more defensible** baseline than the previous one because it tests on a
representative live-action corpus, not an animation-only subset.

---

## What changed and why

### The corpus grew 5.2× and shifted from animation to live-action

| | Previous baseline | This update |
|---|---:|---:|
| Total scripts | 48 | 761 |
| Composition | 100% animation features | ~92% live-action, ~8% animation |
| Source | Curated Pixar/DreamWorks/Sony/Laika | 89 original + 684 crawl (IMSDb/DailyScript) |
| Formats | Clean `.fountain.txt` | HTML / TXT / MD / PDF → canonical Fountain |
| Split | None (all scored) | 60/20/20 train/val/test, hash-locked |

The crawl corpus (`O:\.cluster\scripts-crawl-20260713\DELIVERY\`) added 684
unique produced live-action screenplays across 14 genres. See
`docs/p1-benchmark/CORPUS_EXPANSION_2026-07-29.md` for the full provenance,
conversion pipeline, and dedup methodology.

### The dialogue channel collapsed — and that's the correct result

The single biggest change: **DIALOGUE_FLATTEN AUC dropped from 0.906 → 0.54.**
This is not a bug, a regression, or a methodology error. It was verified three
ways (`scripts/probe-dialogue-delta.mjs`, `scripts/probe-animation-vs-live.mjs`):

| Corpus slice | n | Mean dialogue-flatten delta | Approx AUC |
|---|---:|---:|---:|
| Original animation corpus (root-level) | 46 | **+7.42** | **0.88** |
| Crawl live-action corpus (`crawl/`) | 410 | **+0.13** | **0.53** |

**Why animation discriminates and live-action doesn't:**

1. **Dialogue density.** Animation scripts have proportionally far more
   dialogue (many short scenes, many speaking characters). Flattening all
   dialogue to "Hello." removes a large fraction of the script's content,
   which the density-normalized craft penalty catches.

2. **Action dominance at feature scale.** Live-action features are
   action-heavy. Flattening dialogue removes a small fraction of total
   content. At 100-400 scenes, the density normalization **absorbs** the
   change — the same absorption mechanism the previous baseline documented
   for structural channels (MIDPOINT_DROP, SCENE_SHUFFLE) now also applies
   to dialogue.

3. **31% of live-action scripts show inversions** — flattening dialogue
   actually *improves* the health score on 129/410 scripts. This happens
   because removing dialogue also removes dialogue-tagged issues (short
   lines, repetitive cues) that the craft penalty counts.

**Bottom line:** The 0.906 was real *for animation*. It is not real *for
live-action features*, which are the corpus's target domain. The honest
baseline number is ~0.54.

### The structural channels are unchanged (still failing)

SCENE_SHUFFLE (0.73), MIDPOINT_DROP (0.69-0.74), and CLIMAX_RELOCATE (0.48-0.54)
are consistent with the previous baseline's structural findings. The
climax-ordering channel remains at chance — this is the NORTH_STAR §2 law #1
finding (position-blindness) confirmed on the larger corpus.

---

## Methodology

### Corpus build pipeline (new)

```
O:\ crawl (1,240 files: 471 HTML, 360 PDF, 243 TXT, 166 MD)
    │
    ▼
[convert-crawl-scripts.mjs]
    ├── HTML: ID-aware extraction (<p ID="slug/act/speaker/dia">) OR <pre> strip
    ├── TXT:  UTF-16LE/UTF-8 detection + decode
    ├── MD:   markdown header/link strip
    └── PDF:  PyMuPDF text extraction (extracting-pdf-text skill), skip scanned
    │
    ▼
[canonical-fountain.ts]  ← 100% clean Fountain from any input shape
    ├── clean-pass-through (407/419 files: already clean)
    ├── normalize-double-spaced (5 files: normalizeScreenplay repair)
    └── repair-single-spaced (7 files: insert blank lines around structural elements)
    │
    ▼
Quality gate: analyzeFountainText (the REAL pipeline) → sceneCount ≥ 5, words ≥ 500
    │
    ▼
[dedup-corpus.mjs + dedup-remove.mjs]  ← content-hash dedup
    225 duplicate groups → 349 removed → 0 remaining duplicates
    │
    ▼
[split-corpus.mjs]  ← 60/20/20, seed 42, test-set SHA-256 hash-locked
    761 valid → train 456 / val 152 / test 153
    test hash: e19e6cc2ab492b55107ae0721ae985c9779a4723f0288555ac2d86970744edeb
```

### Measurement

**Script:** `scripts/measure-auc-split.mjs --partition=train|val|test`
**Output:** `scripts/output/discrimination-auc-{partition}.csv`

Pairwise AUC with 10,000× bootstrap CI (seeded PRNG, percentile bounds), per
PRE_REGISTRATION_PROTOCOL §4. Four mechanical degradations:
SCENE_SHUFFLE, MIDPOINT_DROP, CLIMAX_RELOCATE, DIALOGUE_FLATTEN.

Tuning discipline: train = development, val = checkpoint, test = single
final evaluation (not yet run — locked until a formula change is committed).

### Parse quality verification

`scripts/probe-crawl-parse-quality.mjs` confirmed 683/684 crawl files parse
cleanly with proper dialogue detection (median dialogue/cue ratio 1.01). The
one exception (`the-red-turtle-pdf`) is a genuinely silent animated film with
no spoken dialogue by design. The corpus files are correct by construction
(canonical Fountain), not by runtime normalization rescue.

---

## Results — train partition (456 scripts)

| Degradation | Pairs | AUC | 95% CI | Gate |
|---|---:|---:|---|---|
| SCENE_SHUFFLE | 455 | 0.727 | [0.690, 0.765] | partial |
| MIDPOINT_DROP | 454 | 0.735 | [0.695, 0.774] | partial |
| CLIMAX_RELOCATE | 455 | 0.481 | [0.446, 0.516] | **FAIL** |
| DIALOGUE_FLATTEN | 456 | 0.567 | [0.529, 0.605] | **FAIL** |
| **ALL POOLED** | 1820 | **0.627** | [0.608, 0.647] | **FAIL** |

## Results — val partition (152 scripts, checkpoint)

| Degradation | Pairs | AUC | 95% CI | Gate |
|---|---:|---:|---|---|
| SCENE_SHUFFLE | 151 | 0.725 | [0.662, 0.785] | partial |
| MIDPOINT_DROP | 151 | 0.675 | [0.603, 0.748] | weak |
| CLIMAX_RELOCATE | 151 | 0.540 | [0.480, 0.599] | **FAIL** |
| DIALOGUE_FLATTEN | 152 | 0.543 | [0.474, 0.609] | **FAIL** |
| **ALL POOLED** | 605 | **0.621** | [0.588, 0.655] | **FAIL** |

Train and val agree within noise on every channel. The results are stable.

---

## What this means for P1

### The honest starting point

The doctor health score discriminates **above chance but below the gate** on
real produced live-action screenplays. Pooled AUC ~0.62. No individual channel
clears 0.80. This is a harder, truer baseline than the previous one.

### Why this is better news than it looks

The previous baseline's 0.906 dialogue number was **misleading optimism**.
It suggested the dialogue channel was solved and only structural work
remained. The expanded corpus shows **both** dialogue and structural channels
need work at feature scale. Knowing the true starting point is strictly better
than believing a false win.

### The density-normalization absorption is the central problem

Three of four channels (DIALOGUE_FLATTEN, MIDPOINT_DROP, SCENE_SHUFFLE) fail
for the **same root cause**: at feature scale (100-400 scenes), the density
normalization absorbs content changes. Removing dialogue, deleting scenes, or
reordering scenes changes the numerator and denominator of the density
penalty in ways that nearly cancel. This is NORTH_STAR §2 law #2, now
confirmed across all content channels, not just structural ones.

The fix is the same one the previous baseline named: a **bounded deduction
pathway** — capped formula contributions outside the density-normalized
instance count — but it must now cover dialogue degradation too, not just
structural degradation.

### CLIMAX_RELOCATE remains the hardest channel

AUC 0.48-0.54 across both partitions. This is the position-blindness problem
(NORTH_STAR §2 law #1): every field in ScreenplaySceneRecord is derived from
per-scene text content, preserved under scene reordering. No formula on these
fields can detect reordering. This requires analyzer-layer work (new fields
that read relative position between scenes), not formula-layer tuning.

---

## Limitations (honest)

1. **Mechanical ground truth, not human judgment.** Degraded twins are
   unambiguously worse by construction, but human-labeled strong-vs-weak
   pairs would test whether the score tracks *taste*. The human benchmark
   remains the P1 exit requirement.

2. **Corpus is now ~92% live-action but still IMSDb/DailyScript-sourced.**
   These are shooting/spec drafts scraped from public databases, not a
   curated quality-graded set. Genre balance is skewed (Sci-Fi 324, Action
   182, Crime 169 vs Western 3, Thriller 4).

3. **DIALOGUE_FLATTEN severity varies.** On animation scripts it removes
   ~40% of content; on action-heavy live-action it removes ~15%. The AUCs
   are not directly comparable across genres — but the gate pass/fail
   against 0.80 is the honest bar, and the live-action result fails it.

4. **31% dialogue-flatten inversions are a real score pathology.** The
   score sometimes *rewards* removing dialogue because dialogue-tagged
   issues (short lines, repetitive cues) are subtracted. This is a formula
   design flaw worth investigating independently.

---

## Reproducibility

```bash
# Rebuild corpus from O:\ crawl
node scripts/convert-crawl-scripts.mjs    # HTML/TXT/MD/PDF → canonical Fountain
node scripts/dedup-remove.mjs             # content-hash dedup
node scripts/split-corpus.mjs             # 60/20/20, seed 42, hash-locked

# Measure
node scripts/measure-auc-split.mjs --partition=train
node scripts/measure-auc-split.mjs --partition=val
# node scripts/measure-auc-split.mjs --partition=test   # ONCE, at the end

# Verify parse quality
node scripts/probe-crawl-parse-quality.mjs
```

Deterministic (seeded PRNG for shuffle and bootstrap). Test set is hash-locked
at `e19e6cc2...`; any future test-set change is detectable.

## Provenance

- Corpus: `data/screenplays/` — 761 produced screenplays (89 original +
  684 crawl), content-hash deduplicated, 60/20/20 split, test-locked.
- Crawl source: `O:\.cluster\scripts-crawl-20260713\DELIVERY\` (IMSDb +
  DailyScript, 1,240 files across 14 genres).
- Engine: HEAD of `main`. No engine files modified for this measurement.
- Skills integrated: `extracting-pdf-text` (PyMuPDF PDF extraction),
  `regex-vs-llm-structured-text` (parse-confidence-clean architecture
  pattern applied in canonical-fountain.ts).
- P1 gate: `ROADMAP.md` §3 P1 + `PRE_REGISTRATION_PROTOCOL.md` §11.
