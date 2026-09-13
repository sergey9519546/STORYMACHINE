---
type: audit
updated: 2026-09-13
sources: [docs/audits/2026-09-13-ci-green/voice-bound-lane-report.md, server/lib/validation.ts, tests/fixtures/voice-bound-derivation.json, docs/LANE_STANDARD.md, docs/audits/2026-09-13-ci-green/ci-concurrency-lane-report.md, .github/workflows/ci.yml, .github/workflows/security.yml, .github/workflows/release.yml, tests/core/ci-gates-intact.test.ts]
status: active
---

# Audit — 2026-09-13 CI Green

**Directory:** `docs/audits/2026-09-13-ci-green/` — the lane reports and
reviews for the batch that followed the first real GitHub Actions runs on
`main` since 2026-09-02, once the account block was lifted. One lane report
and one review file per lane (`*-lane-report.md`, `*-review.md`), each
review written into the repository before its verdict per
`docs/LANE_STANDARD.md` §7.

## Lane: voice-bound-ci-derivation

**What it is:** CI had not actually run for ten days. When it did, the test
job was red on exactly one subtest — the cost assertion behind
`MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT`, the DoS bound
[[Gate - Fountain Shape Guard]] tracks. The bound was derived on 2026-09-12
from `runScriptDoctor` timings, and its record named its machine only as
"this box" and "the reviewer's box". The machine that ENFORCES the
derivation is the GitHub runner, which measured the same document at
19,713 ms and 21,133 ms of CPU against a 15,000 ms target.

**What the measurement found that the brief did not expect:** the bound
could not be re-derived to hold. Lowering a scalar bound on
(cast × pooled words) until the runner clears it also rejects an ordinary
40-character feature — the regression the 2026-09-12 work existed to fix —
because the realistic and the pathological shapes weigh the same and cost
1.9x apart. The fix is a SECOND bound,
`MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT`, on the eligible cast count, which is
what `analyzeVoices`'s O(distinct²) pass actually scales with. It removes
nothing: the weight bound is untouched and evaluated first, so every pinned
rejection keeps its own message, and the new bound only turns ACCEPTs into
REJECTs.

**What it also established, and what it could not:** every timing this
repository commits for that bound now carries the machine it came from
(`scripts/lib/machine-fingerprint.ts`), the derivation runs on the runner
itself (`.github/workflows/calibrate-voice-bound.yml`), and the constant is
re-derived from the committed table on every CI run
(`tests/core/voice-bound-derivation.test.ts`) the way the public-benchmark
floors are tied to their run. What it could NOT establish is that the
half-budget CPU target is a statement about this guard at all on this
machine: a legitimate, accepted 40-character feature already spends 12,057 ms
of the 15,000 ms there. Most of that budget is the analyzer's baseline cost
on a feature-length document, which no cast bound can buy margin against.

**Related:** [[Gate - Fountain Shape Guard]],
[[Decision 7 - Per-Analysis Wall-Clock Budget]],
[[Audit - 2026-09-12 Adversarial Review]] (the round that derived the bound
this one re-derived), [[Patterns]].

## Lane: ci-concurrency

**What it is:** with Actions actually running, `docs/LANE_STANDARD.md` §7's
"push after every commit" rule collided with `.github/workflows/ci.yml`
having no `concurrency` group: three quick pushes to one lane branch started
three full CI runs in parallel (measured on `lane/voice-bound-ci-derivation`,
runs 34741882322 / 34741923678 / 34741928418, all in progress at once at
06:05-06:06 UTC for a commit range whose last two commits touched only a
report's Tip line). The fix is a `concurrency` group on `ci.yml` and
`security.yml`, keyed on `${{ github.workflow }}-${{ github.ref }}`, with
`cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}` — a later push
to the same branch cancels its own earlier in-flight run, but `main`'s runs
are never cancelled (CLAUDE.md cites main's own run record) and neither is
`release.yml`'s tag/dispatch-triggered publish (cancelling a Docker push
mid-flight is worse than a rare duplicate run — see that file's own new
comment for why it was deliberately left without a group).

**What it did not do:** it did not add a `paths-ignore` filter to skip
docs-only commits. `ci.yml`'s test job runs `check-docs`, `honesty-audit`,
`check-brain`, and the claims-register tests as part of the SAME job a
docs-only change can break (a stale brain export, a broken wikilink, an
overclaim string); skipping the job by path would skip the one job that
gates those. The comment saying so is in `ci.yml` itself, next to the
trigger block, so a future edit does not "optimize" this away.

**Proof the new test can fail:** `tests/core/ci-gates-intact.test.ts` gained
two assertions per workflow (group exists and is keyed correctly; cancel-in-
progress is the ref-conditioned expression) and both were shown red against
the unmodified `ci.yml`/`security.yml` before the fix (4 of 34 subtests
failing), then green after it (34/34) — see the lane report for the exact
counts.

**Related:** [[Patterns]] ("a gate that can be silently disabled by the thing
it gates is not a gate" — the same principle extended here to a workflow
property rather than a step), `docs/LANE_STANDARD.md` §7,
`tests/core/ci-gates-intact.test.ts`.

## Sources

- `docs/audits/2026-09-13-ci-green/voice-bound-lane-report.md`
- `server/lib/validation.ts`
- `tests/fixtures/voice-bound-derivation.json`
- `docs/LANE_STANDARD.md`
- `docs/audits/2026-09-13-ci-green/ci-concurrency-lane-report.md`
- `.github/workflows/ci.yml`
- `.github/workflows/security.yml`
- `.github/workflows/release.yml`
- `tests/core/ci-gates-intact.test.ts`
