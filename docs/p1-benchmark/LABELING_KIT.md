# P1 Labeling Kit — Runbook

**Status:** machinery complete, unrun against a real labeling round.
**Scope:** `scripts/p1-labeling/**`.
**Authority:** every methodological claim in this document cites
`docs/adr/ADR-002-p1-benchmark-design.md` or
`docs/p1-benchmark/PRE_REGISTRATION_PROTOCOL.md` — this kit implements those
two documents, it does not add methodology of its own (the one exception,
the rubric's draft clarifications, is explicitly marked as a draft awaiting
approval — see §5).

---

## 0. What this kit is, in one paragraph

ADR-002 and PRE_REGISTRATION_PROTOCOL.md define P1's benchmark methodology
on paper: a 60/20/20 split, 4-tier (A/B/C/D) blind labeling by >=3
independent readers, Fleiss' kappa >= 0.60 agreement gate. What did not
exist before this kit was the MACHINERY to actually run a labeling round:
turning a corpus manifest into blind, randomized, de-identified reader
bundles; collecting and validating what readers send back; and computing
the agreement statistic against a hard gate. This kit is that machinery. It
produces zero labels itself — every rating in a real round comes from a
human reader, always.

---

## 1. Honesty boundary (read this before running anything)

This kit is de-identification and labeling-workflow tooling, nothing more.
It does not:

- **Solve corpus legality.** `docs/p1-benchmark/CORPUS_IDENTIFICATION.md`
  §0: replacing a filename with an opaque `SM-<hash>` id does not change
  the underlying screenplay's copyright status. Whatever corpus you point
  `--corpus-dir` at must already satisfy ADR-002's "legally distributable"
  requirement independently of this kit.
- **Produce labels.** Every `TIER_LETTER` this kit writes is a literal,
  obviously-unfilled placeholder token. `collect-labels.mjs` refuses to
  aggregate a form that still contains it (see §4).
- **Recruit readers, make them read, or approve the rubric.** See §7,
  "What remains irreducibly human."

---

## 2. Prerequisites

- Node matching `>=22.13.0 || >=24` (this repo's standing requirement; type-stripped `.ts`
  imports used by `lib/blind-id.mjs` and `lib/manifest.mjs` need it).
- A local corpus directory with the actual screenplay text (never
  committed — see `docs/p1-benchmark/MEASUREMENT_RUNBOOK.md` §1 for the
  expected layout).
- A manifest: `scripts/output/corpus-split.json` or
  `tests/fixtures/real-corpus-manifest.json`, in either their pre-migration
  (title-bearing `.file`) or post-migration (`.id`-bearing) form — both are
  supported natively; see `docs/p1-benchmark/CORPUS_IDENTIFICATION.md` for
  the id scheme both `scripts/migrate-corpus-ids.mjs` and this kit use.
- >=3 experienced readers lined up (ADR-002, "Why >=3 raters?").

---

## 3. Command sequence, in order

```bash
# 1. Build blind bundles — one per reader, title pages stripped, reading
#    order independently randomized and locked for later audit.
node scripts/p1-labeling/make-blind-bundles.mjs \
  --corpus-dir=/path/to/corpus \
  --manifest=scripts/output/corpus-split.json \
  --readers=R1,R2,R3 \
  --out=data/p1-labeling/bundles

# 2. Hand each data/p1-labeling/bundles/reader-<ID>/ folder to that reader.
#    They read scripts/*.fountain in filename order and fill in
#    rating-form.md, following instructions.md (rendered from rubric.md).

# 3. Once forms come back (in place, or copied to a --forms-dir):
node scripts/p1-labeling/collect-labels.mjs \
  --bundles-dir=data/p1-labeling/bundles \
  --out=data/p1-labeling/labels-aggregate.json

# 4. Compute inter-rater agreement and the ADR-002 gate:
node scripts/p1-labeling/compute-agreement.mjs \
  --labels=data/p1-labeling/labels-aggregate.json \
  --out=data/p1-labeling/agreement-report.md

# 5. (Once mechanically already true today — see §6) confirm the
#    pre-registration checklist, and once labels exist, document the
#    achieved per-partition quality distribution:
node scripts/p1-labeling/preregister-split.mjs \
  --labels=data/p1-labeling/labels-aggregate.json \
  --corpus-dir=/path/to/corpus   # only needed for a pre-migration split
```

Every command supports `--help`.

---

## 4. What goes to readers, what comes back, what the kit refuses to do

**To readers, per `reader-<ID>/`:**

- `scripts/NN-SM-<hash>.fountain` — the screenplay, title page and leading
  `//` provenance/author lines stripped (`lib/strip-preamble.mjs`), in an
  order independently randomized per reader
  (PRE_REGISTRATION_PROTOCOL.md §3, "Randomize screenplay order").
- `instructions.md` — rendered from `rubric.md`'s stable Core Rubric
  section (ADR-002 tier definitions, PRE_REGISTRATION_PROTOCOL.md §3's
  rubric table), plus the submission procedure.
- `rating-form.md` — one section per script (see §"Format choice" below),
  pre-filled with the script's blind id, and obviously-fake placeholder
  tokens (`TIER_LETTER`, `JUSTIFICATION_TEXT`) the reader replaces.

**Format choice — Markdown, not CSV:** the justification field is 1-2
sentences of free text (PRE_REGISTRATION_PROTOCOL.md §3, "Labeling
Procedure" step 4) that routinely contains commas and quotes CSV would
force into escaped cells; Markdown sections are editable correctly by a
non-technical reader in any plain text editor, without spreadsheet-quoting
mistakes, and diff cleanly for a coordinator reviewing changes. Parsing
stays fully mechanical (`collect-labels.mjs` matches a small fixed set of
`Key: value` lines per section) — see `make-blind-bundles.mjs`'s own
comment above `renderRatingForm` for the full justification.

**Back from readers:** the same `rating-form.md`, with `TIER_LETTER`
replaced by A/B/C/D/ABSTAIN and `JUSTIFICATION_TEXT` replaced by their
actual justification.

**What the kit refuses to do, and where:**

| Refusal | Where | Why |
|---|---|---|
| Run at all if the output dir is git-tracked or not gitignored | `lib/git-guard.mjs`, used by all three writing scripts | Labels and bundles must never be committed — the corpus is not distributable (§1). |
| Overwrite an in-progress bundle round | `make-blind-bundles.mjs` (needs `--force`) | Readers may already be working from it. |
| Accept an incomplete rating form | `collect-labels.mjs` (needs `--partial` to skip instead of abort) | A held-out kappa computation needs complete data; silent partial acceptance would hide that. |
| Accept a still-unfilled placeholder (`TIER_LETTER`, `JUSTIFICATION_TEXT`) | `collect-labels.mjs` | The one thing this kit must never do is manufacture or wave through a fake rating. |
| Accept a tier outside A/B/C/D/ABSTAIN | `collect-labels.mjs` | Schema discipline — see the negative test in §8. |
| Accept two files claiming the same reader, or the same script twice within one reader's form | `collect-labels.mjs` | "Refuses duplicate reader/script pairs" per this kit's own spec. |
| Compute kappa over an incomplete or ABSTAIN-containing item | `compute-agreement.mjs` (excludes it, reports why) | Fleiss' kappa requires a fixed rater count per item — silently padding it would fabricate agreement. |
| Ship the rubric's Draft Clarifications to a reader | `make-blind-bundles.mjs` (needs `--include-draft-clarifications`) | See §5 — unapproved methodology must not reach a real reader. |
| Rebalance `corpus-split.json` based on achieved label distribution | `preregister-split.mjs` (read-only reporting) | Would be p-hacking the split after seeing outcome-adjacent data. |

---

## 5. Rubric clarifications flagged for decision-owner approval

`scripts/p1-labeling/rubric.md`'s **Draft Clarifications** section proposes
answers to three questions ADR-002 and PRE_REGISTRATION_PROTOCOL.md leave
open:

1. **How to combine the four per-dimension impressions (Structure,
   Character, Dialogue, Pacing) into one Overall tier when they disagree.**
   Proposed: a weakest-link floor with one allowed one-tier exception when
   three of four dimensions agree above the floor.
2. **Tie-breaking when a reader is genuinely torn between two adjacent
   tiers.** Proposed: assign the lower tier (conservative convention).
3. **Length/genre normalization for judging Pacing.** Proposed: judge
   relative to the screenplay's own chosen scope, not a fixed page count.

**These are drafts, not decisions.** `make-blind-bundles.mjs` withholds
this section from reader-facing `instructions.md` unless
`--include-draft-clarifications` is explicitly passed — this is enforced
by the tool, not just documented, specifically so unapproved methodology
cannot reach a real reader by accident. The decision owner must either
approve this section's language as written, or write their own resolution
and update `rubric.md` directly, before the first real labeling round.
Leaving this unresolved is itself a choice (a pure holistic gestalt call,
which is what the unmodified Core Rubric implies) — the risk documented in
`rubric.md` is that leaving it unresolved makes rater disagreement more
likely for reasons that have nothing to do with genuine quality
disagreement, which directly threatens the kappa >= 0.60 gate.

---

## 6. Split pre-registration: what already exists, what this kit added

`scripts/split-corpus.mjs` (pre-existing, not owned by this change) already
satisfies the MECHANICAL half of PRE_REGISTRATION_PROTOCOL.md §4: fixed
seed (`CORPUS_SPLIT_SEED = 42`), 60/20/20 fractions, and a SHA-256 lock of
the test-set file list, published as `scripts/output/corpus-test-hash.txt`
and embedded in `scripts/output/corpus-split.json`'s `testSetHash` field.
`preregister-split.mjs` verifies this against the committed artifacts (a
checklist of 5 checks — seed, fracs, count consistency, array-length
consistency, and hash-file/split-file agreement) without duplicating
`verify-corpus-layout.mjs`'s deeper per-file content-hash check, which
needs the actual corpus text.

**The genuine gap `preregister-split.mjs` found and now documents:**
ADR-002 and `SPLIT_STRATEGY.md` both specify the split should be
**stratified by quality tier** — split each of A/B/C/D 60/20/20
independently. The committed `corpus-split.json` is a **plain random**
60/20/20 split (no tier grouping), because it was generated before any
quality labels existed — a chronological necessity `PRE_REGISTRATION_PROTOCOL.md`'s
own phase ordering (Phase 2 labeling, then Phase 3 split) anticipates but
the actual history did not follow. This is a real, previously
**undocumented** deviation from the pre-registered design.

`preregister-split.mjs` does not resolve this (rebalancing the split after
labels exist would itself be a protocol violation — tuning against
outcome-adjacent data). What it adds is the missing piece: once a labeling
round produces `labels-aggregate.json`, `--labels=<path>` reports the
**achieved** quality-tier distribution per partition (train/val always;
test only behind `--reveal-test`, matching the "test partition is
single-use" discipline in `MEASUREMENT_RUNBOOK.md` §3.3) — so the decision
owner can log this deviation in `PRE_REGISTRATION_PROTOCOL.md` §9
("Deviations & Amendments") with real numbers instead of "unknown," and
decide whether the existing hash-locked split is acceptable as-is or
whether a fresh, genuinely stratified split (forfeiting the already-locked
test set and all AUC measurements against it) is required.

---

## 7. What remains irreducibly human

This kit cannot, and does not try to:

- **Recruit >=3 experienced readers.** ADR-002's "Experience: Professional
  reader, script coverage, or 10+ years writing" requirement is a judgment
  call about real people.
- **Make the readers actually read.** No amount of tooling substitutes for
  a human reading a full screenplay.
- **Approve the rubric draft (§5).** A named decision owner must sign off,
  or write their own resolution.
- **Resolve MAJOR disagreements.** `compute-agreement.mjs` flags scripts
  where readers' tiers span >= 2 ranks (e.g. A vs. C) per
  PRE_REGISTRATION_PROTOCOL.md §3 "Conflict Resolution" — the actual
  consensus discussion between readers is a human process this kit only
  surfaces the need for.
- **Decide whether the stratification gap (§6) blocks the P1 gate.** That
  is a methodology call for the decision owner, informed by this kit's
  reporting, not made by it.
- **Interpret a passing or failing kappa as "the labeling is trustworthy."**
  A kappa >= 0.60 says readers agreed; it says nothing about whether they
  were reading carefully, and this kit cannot check that either.

---

## 8. Verification performed (what has been run, and how)

The full pipeline (`make-blind-bundles.mjs` → `collect-labels.mjs` →
`compute-agreement.mjs`) was run end-to-end against the 6 CC0 reference
screenplays in `data/screenplays/` with **fabricated reader forms that were
deleted immediately after**, specifically to prove wiring and the
never-commit-labels guarantee without producing anything that could be
mistaken for a real rating:

1. **Negative (schema-refusal) pass:** one rating form was edited with an
   out-of-schema tier token (`ZZZ-NOT-A-REAL-TIER-DO-NOT-TRUST`) and left
   otherwise unfilled. `collect-labels.mjs` correctly aborted with 35
   validation errors and wrote nothing.
2. **Positive (plumbing) pass:** all three fake readers' forms across all
   6 scripts were filled with `Tier: ABSTAIN` (a schema-valid but
   explicitly non-rating value — "I did not rate this," which can never be
   mistaken for a quality judgment) and the justification text
   `TEST-FIXTURE-ONLY -- NOT A REAL RATING, PIPELINE VERIFICATION, DELETE
   BEFORE USE`. `collect-labels.mjs` accepted and wrote
   `labels-aggregate.json`; `compute-agreement.mjs` correctly excluded all
   6 scripts (100% ABSTAIN), reported "zero scripts have a complete rating
   set," and still wrote a report documenting that. Both output files were
   confirmed outside git (`git ls-files` and `git status --porcelain`
   showed nothing under `data/p1-labeling/`) before being deleted.

The Fleiss' kappa arithmetic itself is proven separately, against public
statistical literature (not corpus data) — see
`tests/core/fleiss-kappa.test.ts`, which reproduces Fleiss (1971) Table 1's
published kappa (~0.21) and a hand-derived exact-fraction case (kappa =
1/3), plus a falsifiability check (perturbing one cell moves kappa by a
predicted amount).
