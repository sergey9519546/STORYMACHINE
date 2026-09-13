---
type: audit
updated: 2026-09-13
sources: [docs/audits/2026-09-13-ci-green/voice-bound-lane-report.md, server/lib/validation.ts, tests/fixtures/voice-bound-derivation.json, docs/LANE_STANDARD.md, docs/audits/2026-09-13-ci-green/ci-concurrency-lane-report.md, .github/workflows/ci.yml, .github/workflows/security.yml, .github/workflows/release.yml, tests/core/ci-gates-intact.test.ts, docs/audits/2026-09-13-ci-green/palette-race-lane-report.md]
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

**palette-race-lane-report.md** (`lane/palette-close-race`): the browser
job's `verify:command-palette` failed on three consecutive `main` runs with
exactly one assertion red, "The palette itself closes after running an
action." Verdict: a harness race, not a product regression —
`CommandPalette.tsx`'s `runAt()` calls `action.run()` then `onClose()`
synchronously in the same handler, but the component exits through
`AnimatePresence` (a 0.14s timed animation), so the `<dialog>` node stays
mounted after `onClose()` fires. The assertion sampled `.count()`
synchronously the instant an unrelated element (the Ship panel) became
visible, with no wait for the palette's own detachment. Reproduced
deterministically (14/15 fail unfixed, 15/15 pass fixed, same box, same
harness) and fixed by waiting for the dialog to detach
(`waitFor({ state: 'detached' })`) instead of sampling synchronously. Full
method, the audit of the other seven browser suites for the same shape, and
the new deny-by-default scanner (`tests/scripts/wait-for-function-options-position.test.ts`)
are in the report.

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
- `docs/audits/2026-09-13-ci-green/palette-race-lane-report.md`
