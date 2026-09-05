---
type: gate
updated: 2026-09-05
sources: [scripts/verify-corpus-layout.mjs, docs/p1-benchmark/MEASUREMENT_RUNBOOK.md, package.json]
status: active
---

# Gate — Corpus Layout Verification

**What it checks:** a pre-flight check the maintainer runs before any P1
measurement against a local corpus directory (`docs/p1-benchmark/
MEASUREMENT_RUNBOOK.md` §1.3 named this script before it existed — this
script is what makes that section's promise true). Six checks in order,
each with its own PASS/FAIL line: (1) the corpus dir is set, exists, and is
a directory; (2) the split file (`scripts/output/corpus-split.json` by
default) is present and parses as the migrated (id + `contentHash`, not
title-based `file`) schema `scripts/migrate-corpus-ids.mjs` produces; (3)
every manifest entry's id resolves to a present file in the corpus dir; (4)
each present file's content hash matches its manifest entry's
`contentHash` (byte-identity to what the manifest expects); (5)
per-partition (train/val/test) counts match the manifest's own recorded
counts; (6) the test-set lock (`testSetHashRelocked` or, pre-migration,
`testSetHash`) recomputes and matches. With `--manifest-file` checking
enabled (the default), it also verifies
`tests/fixtures/real-corpus-manifest.json` the same way (id resolution +
content hash) — see [[Gate - AUC-24 Ratchet]], which locks per-script
health/verdict values from that same manifest.

**Command:** `npm run verify:corpus-layout` — wraps
`node scripts/verify-corpus-layout.mjs --corpus-dir=<path>
[--split-file=<path>] [--manifest-file=<path>] [--no-manifest-check]`.
Requires `--corpus-dir` (the local, not-committed corpus root); exits 1
and stops early with no `--corpus-dir` or a missing/pre-migration split
file, non-zero on any of the six checks failing.

**Where it lives:** `scripts/verify-corpus-layout.mjs`, a standalone script
— not composed into `verify:browser`'s battery
([[Gate - Browser Battery Suites]]), since it verifies a local corpus
directory's layout rather than driving the UI. Not wired into CI (the
corpus that this gate checks the layout of is itself local-only and
copyright — see CLAUDE.md's AUC-24 section on why the corpus cannot reach
CI); it exists for the owner to run before `npm run measure-real` or
`npm run lock-auc24`.

**What it cannot catch:** whether the corpus's content is *correct*
(rights-cleared, correctly transcribed, correctly labeled) — only that the
files present match what the split/manifest files declare; a wrong-but-
internally-consistent corpus (every file present, every hash matching a
manifest that was itself generated from bad data) passes cleanly. It also
cannot verify anything about a corpus dir it is not pointed at — a
maintainer who runs a measurement against a different, unverified
`--corpus-dir` bypasses this gate entirely since nothing forces the two to
match.

## Sources

- `scripts/verify-corpus-layout.mjs` (full header, six-check list)
- `docs/p1-benchmark/MEASUREMENT_RUNBOOK.md` §1.3
- `package.json` (`verify:corpus-layout` script entry)
