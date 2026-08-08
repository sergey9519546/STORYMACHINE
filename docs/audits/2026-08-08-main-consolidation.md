# Main consolidation audit — 2026-08-08

## Scope and verified integration state

This is a Git inventory taken before this documentation commit. The integration
head was `6d3515d40fee249b73a8731acca91c162e9c7f2f`; its upstream baseline was
`origin/main` at `a28436c36e85542179120d995fbff7ea1f945cbb`.

`main` now contains the truthful upstream P0 correction, the P1 diagnostic
documents, and the reviewed static scene-aware craft prompt-routing slice. The
consolidation range (`origin/main..main`) is:

| Commit | Integrated work |
| --- | --- |
| `2cc281991b9b5420bca1a304e6eee0c251133e2e` | P1 suspense-delta degeneracy diagnostic |
| `99be60f99963aadf25bddad45313f41ad65a2d22` | P1 climax-locator probe |
| `1c35f0c9c6061bc118225b9f5e989dbda4c0f2f5` | P1 CLIMAX_RELOCATE novelty measurement |
| `3f733565872ed604ef4e38cf8d568652620fe5ce` | reconciliation of P0 truth correction with P1 diagnostics |
| `2dd7f7e08a8940cad7e22a86402ee2b031ab4038` | validation artifact/probe provenance repair |
| `67c5f08120c38c2a49c8e194a7bdf58baf644c8a` | P1 dead-rule diagnostic document |
| `79164e9521a1f998d28c9844756930454dcbaaf3` | reviewed scene routing through convergence |
| `8b3d49221597b6cb96fa846e186a53148ae6397a` | scene-routing guardrail hardening |
| `748dc5589efe6987db1a5a62b52f47b7e556d6c9` | legacy-route allowance constraint |
| `6d3515d40fee249b73a8731acca91c162e9c7f2f` | legacy scene-context rejection test |

Deliberately excluded from `main` are: the absent craft-KB builder/data and
unused voice-feedback adapter from the Craft-v2 source; the P1 corpus and
Reagan scoring branches pending evidence; all performance branches that weaken
dependency-review CI; and the unreviewed Critic/OASIS/analyzer/UI/provenance
prototype work held in quarantine. No ignored P0 harness artifact was added.

## P0 and P1 truth

P0 fielding is authorized. There are **0 valid documented human sessions** and
there is **no P0 verdict**. Automated P0-S01 through P0-S05 harness files are
ignored, are not human-research evidence, and were not committed.

The P1 structural gate remains unmet. In particular,
`p1/reagan-fit-structural-deduction` at
`b1846fec5fff7004117b32debe8fd11fb1397a2c` cannot merge without a new
real-corpus receipt and a manifest re-lock. Neither this audit nor the
consolidation asserts that P1 is valid or complete.

## Branch disposition

The labels below are dispositions, not quality verdicts. “Legacy checkpoint
with no unique changes” means Git shows the listed ref is already an ancestor
of `main`; it adds no unintegrated commits. `origin/HEAD` is an alias for
`origin/main`, not an independent branch.

| Ref | Verified tip | Disposition | Retention / reason |
| --- | --- | --- | --- |
| `main` | `6d3515d` | integrated | Consolidation head before this audit commit. |
| `origin/main` (`origin/HEAD`) | `a28436c` | integrated | Truthful upstream P0-correction baseline, ancestor of `main`. |
| `claude/vendor-research-archive-recovery` | `3f18224` | legacy checkpoint with no unique changes | Ancestor of `main`. |
| `origin/architecture-deepening` | `2239eeb` | legacy checkpoint with no unique changes | Ancestor of `main`. |
| `origin/claude/detector-defects-audit` | `c759de0` | legacy checkpoint with no unique changes | Ancestor of `main`. |
| `origin/claude/fix-logline-splice` | `8f8a596` | legacy checkpoint with no unique changes | Ancestor of `main`. |
| `origin/claude/fix-page-estimate` | `a77dc62` | legacy checkpoint with no unique changes | Ancestor of `main`. |
| `origin/claude/fix-scene-numbering` | `eb3e50e` | legacy checkpoint with no unique changes | Ancestor of `main`. |
| `origin/claude/guard-security-workflow` | `b57c3ef` | legacy checkpoint with no unique changes | Ancestor of `main`. |
| `origin/claude/p0-browser-cert-and-golden-path-fixes` | `9977922` | legacy checkpoint with no unique changes | Ancestor of `main`. |
| `origin/claude/p0-fielding-brief-refresh` | `3995829` | legacy checkpoint with no unique changes | Ancestor of `main`. |
| `origin/claude/vendor-research-archive-recovery` | `22f71bd` | legacy checkpoint with no unique changes | Ancestor of `main`. |
| `origin/p1/bounded-deduction-and-p2-surface-collapse` | `13ec9db` | legacy checkpoint with no unique changes | Ancestor of `main`. |
| `origin/ultrareview-fixes` | `8fb20ed` | legacy checkpoint with no unique changes | Ancestor of `main`. |
| `origin/work/2026-08-05-security-and-p1-diagnostics` | `c9023b8` | legacy checkpoint with no unique changes | Ancestor of `main`. |
| `craft-knowledge/v2-scene-routing-voice-constraint` | `1aa2eea` | patch-equivalent/duplicate | The reviewed static scene-routing slice is represented by the consolidation commits; its unreviewed KB/voice portions remain excluded. |
| `origin/craft-knowledge/v2-scene-routing-voice-constraint` | `1aa2eea` | patch-equivalent/duplicate | Same source as the local Craft-v2 branch. |
| `origin/claude/pilot-report-trust-fixes` | `ba2b559` | patch-equivalent/duplicate | Functionally already represented by `ae3f04c` plus its real-corpus manifest re-lock; do not merge again. |
| `p1/corpus-expansion-and-canonical-formatter` | `1b7fe32` | research deferred | Retained pending the unmet P1 structural gate. |
| `origin/p1/corpus-expansion-and-canonical-formatter` | `1b7fe32` | research deferred | Same retained P1 corpus source. |
| `p1/reagan-fit-structural-deduction` | `b1846fe` | research deferred | Scoring patch requires a new real-corpus receipt and manifest re-lock before any merge. |
| `codex/quarantine-2026-08-08-prototypes` | `1664d08e38deaf7c4fd689f9edddd43bbd7bb62e` | quarantine-only | Exact retained prototype branch; see quarantine record below. |
| `origin/bolt-perf-fastwordcount-7837152425079017068` | `4d12357` | unsafe/rejected | Weakens dependency-review CI; optimization safety was not evaluated. |
| `origin/bolt-perf-wordcount-12519095341449748284` | `757f7ae` | unsafe/rejected | Weakens dependency-review CI; optimization safety was not evaluated. |
| `origin/bolt-performance-fountain-analyzer-1939886709057786797` | `8e5205a` | unsafe/rejected | Weakens dependency-review CI; optimization safety was not evaluated. |
| `origin/bolt-voice-word-count-optimization-9425557242248316726` | `9016d8b` | unsafe/rejected | Weakens dependency-review CI; optimization safety was not evaluated. |
| `origin/bolt/zero-allocation-word-count-2810448090285262340` | `1866fee` | unsafe/rejected | Weakens dependency-review CI; optimization safety was not evaluated. |
| `origin/bolt/zero-allocation-word-count-7210188437747066348` | `6ed1765` | unsafe/rejected | Weakens dependency-review CI; optimization safety was not evaluated. |
| `origin/jules-17482010612376859125-6c4dd79a` | `c8f0720` | unsafe/rejected | Weakens dependency-review CI; optimization safety was not evaluated. |
| `origin/jules-performance-optimization-screenplay-layout-3715782338147391263` | `c053082` | unsafe/rejected | Weakens dependency-review CI; optimization safety was not evaluated. |
| `origin/perf-fastwordcount-18147935720655657092` | `a9ec7ae` | unsafe/rejected | Weakens dependency-review CI; optimization safety was not evaluated. |
| `origin/performance-split-optimizations-6452579683296412381` | `7770b64` | unsafe/rejected | Weakens dependency-review CI; optimization safety was not evaluated. |

## Worktree disposition

| Worktree | Ref / HEAD | Disposition | Record |
| --- | --- | --- | --- |
| `C:/Users/serge/.codex/worktrees/storymachine-main-integration` | `main` at `6d3515d` | integrated | Linked main-consolidation worktree. |
| `C:/Users/serge/OneDrive/Documents/MAIN_StoryMachine_Engine_Logic/STORYMACHINE V1 REPO/STORYMACHINE` | `codex/quarantine-2026-08-08-prototypes` at `1664d08e38deaf7c4fd689f9edddd43bbd7bb62e` | quarantine-only | Holds the retained non-shipping prototype. |
| `C:/Users/serge/OneDrive/Documents/MAIN_StoryMachine_Engine_Logic/STORYMACHINE V1 REPO/STORYMACHINE/.claude/worktrees/ultra-review-e6d516` | detached `1b8ec5827cf6459a424aa064f6cf5de367b5e628` | legacy checkpoint with no unique changes | Detached historical checkpoint; the commit is already reachable from `main`. |

## Quarantine record and next task

The only retained prototype quarantine is
`codex/quarantine-2026-08-08-prototypes` at
`1664d08e38deaf7c4fd689f9edddd43bbd7bb62e`. It contains fabricated or
unvalidated Critic, OASIS, UI, and provenance work. It must not be merged
without a new scoped design and review cycle; its presence is preservation, not
approval.

The next task is human-only: conduct and document five complete P0 sessions
under the operating kit. No agent may fabricate them.

## Final code/repository verification gate

Task 6 is complete as a **code/repository verification gate**. On `main`
commit `70d55532bf5c765b28f196a1480103e412286287`, the following commands
passed:

- `git diff --check`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run honesty-audit`
- `npm run check-docs`
- `npm run check-scoring-receipt`
- `node scripts/smoke-p0-live-flow.mjs`
- `node scripts/verify-focus-traps.mjs` (14/14)
- `node scripts/verify-p2-p3-surfaces.mjs` (94/94)

The test run emitted the expected keyless-mode Gemini rewrite fallback logs.
The build emitted Vite's warning that ScriptIDE exceeds 500 kB. Neither
warning changed the passing result.

This gate does not establish P0 demand validation, P1 score validity, user
retention, release or production readiness, or a public launch. The next task
remains human-only: conduct and document five complete P0 sessions under the
operating kit.
