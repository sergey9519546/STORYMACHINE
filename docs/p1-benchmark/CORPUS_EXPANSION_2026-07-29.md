# Corpus Expansion — 2026-07-29

**Status:** Complete. The P1 corpus grew from 48 → 761 produced screenplays,
shifting from animation-only to ~92% live-action. This documents the full
provenance so the expanded corpus is auditable and reproducible.

## TL;DR

| | Before | After |
|---|---:|---:|
| Total scripts | 48 | 761 |
| Composition | 100% animation | ~92% live-action |
| Sources | Curated Pixar/DW/Sony/Laika | + IMSDb + DailyScript crawl |
| Formats | Clean `.fountain.txt` | HTML/TXT/MD/PDF → canonical Fountain |
| Split | None | 60/20/20, hash-locked |

The crawl source added 684 unique live-action screenplays. The pipeline that
converted them produces **100% clean canonical Fountain** by construction,
verified by parse-quality audit (683/684 healthy).

---

## Source

`O:\.cluster\scripts-crawl-20260713\DELIVERY\by-genre\` — 1,240 files across
14 genre folders, sourced from IMSDb (imsdb.com) and DailyScript
(dailyscript.com). The crawl's own `manifest.json` estimates 748 unique
scripts (multi-genre tagging inflates the file count).

| Format | Count | Notes |
|---|---:|---|
| HTML | 471 | 434 `<pre>`-wrapped, 25 `<p ID="slug/act/speaker/dia">`-structured, 12 other |
| PDF | 360 | 70% text-extractable (PyMuPDF), 30% scanned (skipped — needs OCR) |
| TXT | 243 | Mostly UTF-8, 23 UTF-16LE-encoded |
| MD | 166 | Markdown-extracted HTML |

## Conversion pipeline

### 1. Format extraction (`scripts/convert-crawl-scripts.mjs`)

Each format has a dedicated extractor:

- **HTML — ID-aware path** (25 files): IMSDb's structured HTML uses
  `<p ID="slug">`, `<p ID="act">`, `<p ID="speaker">`, `<p ID="dia">` tags to
  mark scene headings, action, character cues, and dialogue. The extractor
  reads these directly and emits **perfect Fountain** — heading/cue/dialogue
  each on their own line with correct blank-line separation. No runtime
  normalization needed. Example: True Romance (1028 cues, 920 dialogue).

- **HTML — `<pre>` path** (434 files): screenplay sits in a single `<pre>`
  block as preformatted text. Strip tags + decode entities → clean text.

- **TXT**: UTF-16LE BOM detection (`FF FE`) + conversion to UTF-8. 23 files
  were UTF-16LE-encoded (e.g. Silence of the Lambs).

- **MD**: strip markdown headers (`#`), links (`[text](url)`), horizontal
  rules.

- **PDF** (via `extracting-pdf-text` skill): PyMuPDF text extraction. Scanned
  PDFs (where extraction returns <500 chars but pages have images) are
  skipped — OCR is out of scope for the deterministic corpus build. 262 of
  360 PDFs extracted successfully.

### 2. Canonical Fountain formatting (`server/nvm/analyze/canonical-fountain.ts`)

Every converted file passes through `formatCanonicalFountain()`, which picks
the best-scoring of three repair strategies (never regresses — verified by
0-regression audit on all 419 files):

| Strategy | When | Files | What it does |
|---|---|---:|---|
| `clean-pass-through` | Already clean Fountain | 407 | Strip CRLF, leading whitespace, collapse blank runs |
| `normalize-double-spaced` | Every line followed by blank (≥60%) | 5 | Hand off to `normalizeScreenplay()` — reconstructs blocks |
| `repair-single-spaced` | No blank lines between blocks (≤5%) | 7 | Insert blank lines around every detected structural element |

The "best-scoring" selection uses a structural score
(`character*2 + dialogue*2 + scene_heading`) — whichever strategy produces the
most recognized cues/dialogue/scenes wins. This guarantees the formatter never
makes things worse.

### 3. Quality gate

The **real pipeline** (`analyzeFountainText`) gates every file:
`sceneCount ≥ 5 AND wordCount ≥ 500`. Files that don't parse to a real
screenplay are rejected. This replaced an earlier naive `^(INT\.|EXT\.)` regex
gate that wrongly rejected 753 real scripts whose headings were indented or
unprefixed.

**Result:** 1033 valid, 0 parse-broken.

### 4. Content-hash dedup (`scripts/dedup-corpus.mjs` + `dedup-remove.mjs`)

IMSDb tags scripts with multiple genres, so the same script appears in 2-4
genre folders. Content-hash dedup (SHA-256 of normalized first 4000 chars)
collapsed 225 duplicate groups to single canonical copies. Within each group,
non-crawl files are preferred over crawl files (the original corpus is
canonical), then larger files (more complete), then alphabetical.

**Result:** 1033 → 684 unique crawl scripts + 89 original = 773 total. 0
remaining duplicate fingerprints (verified post-dedup).

### 5. Split (`scripts/split-corpus.mjs`)

60/20/20 train/val/test, seed 42 (PRE_REGISTRATION_PROTOCOL §4). Test set
SHA-256 hash-locked at `e19e6cc2...`.

- 761 valid (12 excluded: sceneCount < 5)
- train: 456 | val: 152 | test: 153

## Parse quality verification

`scripts/probe-crawl-parse-quality.mjs` confirmed:
- 683/684 crawl files parse with proper dialogue detection
- Median dialogue/cue ratio: 1.01 (every character cue has its dialogue)
- 0 NO-DIALOGUE files (except 1: `the-red-turtle-pdf`, a genuinely silent
  animated film with no spoken dialogue by design — not a parser bug)
- 6 files flagged `needsNormalize` (runtime normalizer fires) but all have
  healthy cue/dialogue counts (648-1039 cues) — the flag is informational,
  not a defect

## Provenance artifacts

| Artifact | Purpose |
|---|---|
| `scripts/output/crawl-inventory.csv` | Full per-file inventory: format, encoding, size, headings, words, status |
| `scripts/output/crawl-conversion-report.csv` | Per-file conversion: genre, filename, sceneCount, wordCount, dialogueLines |
| `scripts/output/dedup-removal-log.csv` | Every removed duplicate: fingerprint, kept file, removed file |
| `scripts/output/corpus-split.json` | Full split: every script's partition + metadata |
| `scripts/output/corpus-test-hash.txt` | Test-set SHA-256 lock |

## What the expanded corpus revealed

The expansion shifted the corpus from animation to live-action, which
**retracted the previous baseline's headline result**. See
`DISCRIMINATION_BASELINE_2026-07-29.md` for the full discrimination
re-measurement. The short version: dialogue-channel AUC dropped from 0.906
(animation) to 0.54 (live-action) because the density-normalization
absorption that the previous baseline documented for structural channels
also applies to dialogue at feature scale.
