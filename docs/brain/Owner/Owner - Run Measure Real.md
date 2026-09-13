---
type: owner
updated: 2026-09-13
sources: [scripts/owner-measure.mjs, docs/p1-benchmark/owner-measurement-plan.json, docs/UNIFIED_STATE_2026-09-02.md, CLAUDE.md, docs/p1-benchmark/MEASUREMENT_RECEIPTS.md]
status: active
---

# Owner Item — Run the Real-Corpus Measurement

**Why only the owner:** the produced-screenplay corpus is local-only and
copyright-restricted by design — it cannot reach CI (mounting it via CI
secrets was rejected: secrets are not a corpus transport, and uploading the
text anywhere is the exact exposure the de-identification work exists to
avoid). Only whoever holds the corpus on their own machine can run this.

## The command

```
REAL_SCRIPT_CORPUS_DIR=<corpus> npm run owner:measure
```

This is the same one command as [[Owner - R5 Measurement and Merge]] and
[[Owner - Lock AUC24 Table]] — there is one, and it does all three items. It
runs the pre-flight, measures `main` first and then each branch the record
schedules, and ends at the lock. Add `--plan` to see the order and the reason
for every step without running anything, or `--dry-run` to run it all and
write nothing.

The underlying measurement is still
`REAL_SCRIPT_CORPUS_DIR=<corpus> npm run measure-real`, and running it by hand
is still legitimate — it prints the produced-class distribution, the two
degradation AUCs and the manifest cross-check for a human to read. What the
one command adds is everything around it: the pre-flight, the detached
worktree, the receipt conversion, the manifest re-lock and the lock.

## The pre-flight, and what it can actually say

[[Gate - Corpus Layout Verification]] (`npm run verify:corpus-layout --
--corpus-dir=<corpus>`) is the check that catches a mismatched or
partially-migrated corpus before a measurement run wastes time against it, and
`owner:measure` runs it first.

**It cannot pass on this repository as committed** (measured 2026-09-13). That
script assumes the MIGRATED corpus schema, and `scripts/output/corpus-split.json`
is still the pre-migration 761-script P1 split, so its check 2 fails and it
exits 1 before reaching any check about the 72-row AUC-24 corpus at all — and
those are two different corpora sharing one `--corpus-dir`. `owner:measure`
classifies a failure whose only failing checks are the migrated-schema ones as
that KNOWN state and continues; anything else stops the run. In its place comes
the check that does speak about this corpus: every row of
`tests/fixtures/real-corpus-manifest.json` must resolve to a file in the corpus
directory, reported by content-hash prefix and never by title.

## The trap this note used to exist to warn about

`measure-real` prints `[SKIP] REAL_SCRIPT_CORPUS_DIR not set` and **exits 0**.
A mistyped or unexported variable therefore looks like a successful run and
scrolls past. `owner:measure` treats that banner as a failure whatever the exit
code says, and refuses outright — exit 1, nothing written — if the variable is
not set when it starts.

## What the run produces, and what stays on your machine

A receipt stub is already prepared in
`docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` for each branch, with everything
filled in except the number; the run converts them in place (the three-scan
recipe is explained in [[Owner - R5 Measurement and Merge]]). The measurement
log, the corpus-shape probe CSVs and the per-row scores are written to a local
directory OUTSIDE the repository — `$XDG_STATE_HOME/storymachine/owner-measure/<date>/`,
else `~/.storymachine/owner-measure/<date>/`. Those files index the corpus.
Keep them there; what travels into the repository is numbers, hashes and a
fingerprint.

## Sources

- `scripts/owner-measure.mjs` — the command
- `docs/p1-benchmark/owner-measurement-plan.json` — the order it executes
- `docs/UNIFIED_STATE_2026-09-02.md` §4, item 3
- `CLAUDE.md` "Standing task" section
