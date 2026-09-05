---
type: glossary
updated: 2026-09-05
sources: [CLAUDE.md, ROADMAP.md, NORTH_STAR.md, docs/CLAIMS_REGISTER.md, docs/p1-benchmark/README.md, server/nvm/analyze/doctor.ts]
status: active
---

# Glossary

**Health** — the deterministic 0-100 score `server/nvm/analyze/doctor.ts`
computes for a screenplay. The base term is
`baseHealth = 100 − densityPenalty − scarcityPenalty`
(pre-[[Branch - R5 Verbosity Bias]] formula; R5 proposes a scene-opportunity
renormalization, unmerged). The **displayed, final** score subtracts three
more bounded deduction terms on top of that base:
`health = baseHealth − structuralDeduction − arcIncoherenceDeduction − dialogueDeduction`
(`doctor.ts:2144`) — `structuralDeduction` is the bounded feature-scale
structural-finding deduction (see the CLAUDE.md gotcha: structural findings
at feature scale must go through this path, never raw issue-count density);
`arcIncoherenceDeduction` fires only at feature scale (≥15 scenes,
`ARC_DED_MIN_SCENES`, `doctor.ts:2104`) off the emotional-arc trajectory;
`dialogueDeduction` is the 2026-07-29 dialogue-diversity term that took
DIALOGUE_FLATTEN from AUC 0.54 (chance) to 0.990 — see
[[Measurement - DISCRIMINATION_BASELINE_2026-07-29]]. Fully LLM-free — see
[[Surface - Script Doctor Panel]].

**Verdict band** — the tier `verdictFor()` (`doctor.ts`) maps a health value
into (e.g. "recommend," "consider," "decline"); `docs/scoring/VERBOSITY_BIAS_2026-07-11.md`
documents padding moving a script across a tier boundary without changing
its craft.

**AUC-24 vs. P1 AUC** — two different statistics, not comparable. **AUC-24**
(≥0.622, last measured 0.731) is ONE combined degradation (shuffle scenes
AND drop every third) over a 24-script subset — see
[[Gate - AUC-24 Ratchet]]. **P1 AUC** (≥0.80 gate) measures four SEPARATE
mechanical degradations (SCENE_SHUFFLE, MIDPOINT_DROP, CLIMAX_RELOCATE,
DIALOGUE_FLATTEN) on a 153-script held-out test partition of the 761-script
P1 corpus — see [[Measurement - DISCRIMINATION_BASELINE_2026-07-29]].
Different corpus, different degradation, different denominator; never
"update" one using the other.

**Receipt** — an entry in `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`
recording a real `npm run measure-real` run; required by
[[Gate - Receipt Gate]] whenever a scoring-path file changes. CI checks the
entry is well-formed, never that its number is real.

**Scoring path** — any file reachable (by the same import-graph walker
`scripts/lib/import-graph.mjs` uses) from `server/nvm/analyze/doctor.ts` or
`src/lib/fountain.ts`. Touching one requires a receipt; see
[[Gate - Pure-Core Boundary]] for how that set was shrunk from 85 to 63
files.

**Lane** — one delegated agent's isolated-worktree unit of work, held to
`docs/LANE_STANDARD.md` — understand first, build the strongest version,
prove it with before/after numbers, run gates in the foreground, pass an
independent review before merge.

**Review round** — one pass of `docs/LANE_STANDARD.md` §6's independent
review over a lane's diff, ending in MERGE or a numbered REVISE list; see
[[Session - 2026-09-05 Review Batch]] for a batch where six lanes took 17
rounds combined and none passed on the first pass.

**Structural signals** — the twelve per-scene / thirteen document-level
counting-only aggregates in `server/nvm/analyze/structural-signals.ts`
(word/line/sentence/turn/speaker counts, no lexicon). Descriptive only —
shown on every surface, wired into no score. See
[[Measurement - STRUCTURAL_SIGNALS_2026-09-04]].

**Draft rank** — "N of M runs and saved drafts of this script (by health)"
— a writer's own history, computed by `computeDraftRank` and rendered
through `src/lib/draft-rank-copy.ts`'s shared helpers on every surface that
shows it (`docs/CLAIMS_REGISTER.md` rows 32-35, 50-52, 56-57). Never a
comparison to the reference set or another writer's work.

**Percentile denominator** — the 20-sample, hand-authored **synthetic**
reference set (`server/nvm/analyze/calibration/corpus.ts`) a health
percentile is computed against — not a market comparison, not other
scripts a writer might send. `compactPercentileNote()`
(`src/lib/percentile-copy.ts`) is the one place this wording lives.

**Labs flag** — `getLabsEnabled()` (`src/lib/feature-flags.ts`), the single
flag gating the generative surface since
[[Decision 3 - Demote Generative Surface to Labs]]. With Labs off, nothing
generative is deleted — it is hidden, not shown-and-inert.

**Rulebook** — the generated, machine-counted set of pass-scoped rule
constants (`docs/rulebook/README.md`, produced by
`scripts/generate-rulebook.ts`, enforced by `tests/core/rulebook.test.ts`):
**3,217** as of PR #257 (`33a2ee48`, `INVERSE_CHEKHOV_GUN`), up from 3,216 —
not the "~8,917 rules, ~5,701 from a bulk Wave 1191" figure an earlier draft
claimed, which [[Audit - 2026-07-14 High-End Audit]]'s R2-C01 finding
showed inaccurate. A maintained conceptual set, not a quality claim — the
weighted-rule channel carries AUC ~0.076 (worse than random) in degradation
experiments. The wave program that grew it is retired; do not resume it.

**Keyless boot** — the server deliberately boots without `GEMINI_API_KEY`
into full analysis-only mode (doctor, diagnose, coverage, what-if, room,
interview receipts) — see `docs/CLAIMS_REGISTER.md` rows 5-6, 15-16, 18-19,
23-24. Never reintroduce a fatal key check in `server.ts`. See
[[Gate - LLM Provider Smoke Test]] for the maintainer check that a
configured key actually round-trips against a live provider.

## Sources

- `CLAUDE.md`; `ROADMAP.md`; `NORTH_STAR.md`; `docs/CLAIMS_REGISTER.md`
- `server/nvm/analyze/doctor.ts:2144` (final health formula), `:679-692`
  (baseHealth/craftPenalty), `:2104` (arcIncoherenceDeduction feature-scale
  gate)
