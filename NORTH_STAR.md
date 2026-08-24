# STORYMACHINE — North Star

*This file did not previously exist as a committed artifact — ROADMAP.md and
ULTRAPLAN.md both reference it as "the constitution" but no NORTH_STAR.md was
ever landed. This is a first cut, assembled from the claims those two files
already make about it (rejection of LLM-judge scoring, the separation-margin
metric, sources, non-goals) plus the measured numbers current as of this
wave. Treat SS0 and the two doctrine laws as the new material; the rest
reconstructs what the surrounding docs already assumed existed.*

## 0. What StoryMachine claims to be (measured, not aspirational)

A deterministic core (audit / verdicts / percentiles / counterfactuals /
critics / receipts — fully keyless) inside a generative shell (candidates /
rewrites / voices — opt-in, labeled, degradable). The product's structural
claim is not "an AI that judges scripts" — it is **a private, instant,
reproducible coverage read whose every verdict is an inspectable
deterministic rule or formula, not a black-box LLM opinion.** The score
formula and every rule are open to inspection, and the same script text
always produces the same report.

**Honest correction on the rule count (2026-07-14, reconciled 2026-07-28).** Earlier drafts of this
file led with "3,216 hand-specified rules" and later asserted the rulebook
had grown to "8,917 by generated count." An independent audit
(`docs/audits/2026-07-14-high-end-audit/PHASE_2_REPOSITORY_RECONSTRUCTION.md`
R2-C01) showed the "8,917" figure and the "~5,701 from a bulk Wave 1191"
story to be inaccurate: the generated rulebook was **3,216 distinct
pass-scoped rule constants** (machine-counted from the live pass files by
`scripts/generate-rulebook.ts`, enforced by `tests/core/rulebook.test.ts`).
*(That 3,216 was the correct live figure through 2026-08-23 and is left
here as the audit's finding. **The live count today is 3,217** — PR #257
added `INVERSE_CHEKHOV_GUN` in `33a2ee48`. `docs/rulebook/README.md` is the
machine-counted authority; noted 2026-08-24.)*
The rule channel is **inverted** in degradation experiments, not merely weak: by
the doctor's own measurements (`server/nvm/analyze/doctor.ts:1892-1898`) the
entire weighted-rule channel has AUC ~0.076 (where 0.50 is random and 1.0 is
perfect — rules fire LESS on shuffled scripts because the shuffle-drop recipe
also REMOVES about a third of the scenes, so the degraded script looks
healthier by issue count; that is what inverts the AUC) while the
scene-count scarcity term has AUC ~0.938 (measured on artificial scene-drop
degradation, NOT on natural strong-vs-weak human writing — scene count is a
suspected confound/proxy until tested on real-labeled data). **The rules do not
separate good from bad writing.** Lead with what is
true and verifiable (reproducibility, determinism, inspectability), never
with the rule count. The rule count is neither the wedge nor load-bearing.

Measured proof points (honest, as of 2026-07-14):
- **Discrimination is thin and synthetic.** 6 hand-authored paired
  good/bad scenarios; **all 6 are now hard CI assertions** (0 `todo` in the
  file) but two pass by only +1.4. No runnable discrimination test on *real*
  writing exists yet — this is the P1 gap the roadmap now treats as the One
  Bet, and it is untouched by any of the below.
  *(Corrected 2026-08-24. This bullet said the composite-reviewer-scenario
  pair "still fails its 5.0-point minimum-gap floor." That stopped being
  true on 2026-08-04, when Lane H closed the last `todo`; re-measured today
  the gap is **+8.5** — good 78.5, bad 70.0 — against the 5.0 floor at
  `tests/core/discrimination.test.ts:371-377`, with the whole file at
  14 pass / 0 fail / 0 todo. The thinness criticism is unaffected: a wider
  gap on 6 synthetic pairs is still not evidence about real writing.)*
- **Ground truth is a floor-check, not a discrimination test, and it does
  not run locally.** 72 produced scripts are manifest-locked (71 RECOMMEND
  + 1 CONSIDER), but the text lives outside the repo and
  `tests/core/real-script-corpus.test.ts` SKIPS every assertion without
  `REAL_SCRIPT_CORPUS_DIR` (0 files present here). The check asserts
  health ≥ 80 by fiat, not that the score separates strong from weak.
- **Degradation AUC is weak.** Shuffle-drop **AUC-24 last measured 0.731**
  against its 0.622 ratchet floor (`tests/core/real-script-corpus.test.ts:186`;
  the 0.672 this bullet used to quote was the *pre*-arc-incoherence-deduction
  figure the 0.622 floor was originally derived from, corrected 2026-08-24);
  AUC-71 ~0.652; act-swap 0.48→0.62. Still well short of the 0.80 the P1 exit
  gate asks for — treat these as work-in-progress baselines, not proof the
  score discriminates.
  **Do not merge these with the P1 baseline numbers.** AUC-24 is ONE combined
  degradation (shuffle scenes AND drop every third) over a 24-script subset of
  the local-only corpus. The 761-script P1 baseline
  (`docs/p1-benchmark/DISCRIMINATION_BASELINE_2026-07-29.md`) reports
  SCENE_SHUFFLE 0.734 and MIDPOINT_DROP 0.766 as SEPARATE degradations on a
  153-script hash-locked test partition. Different corpus, different
  degradation, different denominator; they have been confused before.
- **Rulebook**: **3,217** generated pass-scoped rule constants (the live
  `docs/rulebook/README.md` count, corrected 2026-08-24 — it was 3,216 until
  PR #257 added `INVERSE_CHEKHOV_GUN` in `33a2ee48`; the earlier "8,917"
  figure was shown to be inaccurate by the 2026-07-14 audit). Freeze means
  **add no entries to the current catalog** and maintain the distinct
  conceptual set — not delete generated permutations by implication. Any
  removal is a separately approved migration with dependency review.

## 1. Non-negotiables (the constitution proper)

- **Demand before rigor.** *[Amended 2026-08-11 by maintainer decision — see
  `docs/DECISION_LOG.md` Decision #2.]* Validated user need is the project's
  highest-priority signal and should be actively pursued (`ROADMAP.md` P0:
  validate with real writers). The project's historical failure mode — the one
  this constitution exists to prevent — was optimizing rigor (rule counts, AUC
  ratchets, research intake) in isolation from any evidence a real writer wants
  the output. **The prior hard-gate framing ("no new engine work ships without
  a validated user need"; "P0 is a hard gate that blocks everything
  downstream") is RETIRED.** Engine work may proceed in parallel with P0
  evidence-gathering; P0 is recommended, not a prerequisite.
- **Correct before reproducible.** Reproducibility is earned *after* the
  score is shown valid on real writing, never instead of it. A broken ruler
  is perfectly reproducible; determinism is worthless if the verdict is
  wrong. This resolves the historical confusion between "the same input
  gives the same output" and "the output is right" — they are different
  claims and only the second creates demand.
- **No LLM-as-judge.** Every verdict a user sees is a deterministic rule or
  formula, inspectable and reproducible via `contentHash`. LLMs may SENSE
  (deep-read scene annotation) but never SCORE — rules verdict on whatever
  signal they produce, generative or lexical, identically.
- **Keyless-first.** The deterministic surface (doctor, diagnose, coverage,
  what-if, room, interview receipts) is the product's front door, not a
  degraded fallback. The server must never refuse to boot without an AI key.
- **Honest degradation.** Every LLM-gated feature degrades to a labeled,
  functional fallback when keyless — never a silent quality drop, never a
  500.
- **Determinism receipts.** `contentHash`-keyed reproducibility is a
  load-bearing product claim *once the score is valid*: the same script text
  always produces the same report, and the verify endpoint lets anyone check
  that externally. This is a trust feature to surface to third parties
  (roadmap P3), not an end in itself.
- **Measure discrimination on runnable, real writing — always.** Every
  detector that skipped this died (fired on zero corpus samples) or misfired
  (inverted on well-crafted writing). Synthetic fixtures and an env-gated
  corpus that skips in CI are necessary but never sufficient: a test that
  doesn't run proves nothing. The score must separate strong from weak real
  screenplays on a set that runs — see the two hard-won laws below and the
  roadmap's P1 One Bet.

*Canonical sequencing lives in `ROADMAP.md` (the demand-driven P0→P4
phases). This constitution sets the laws; the roadmap sets the order. Where
older sequencing in `ULTRAPLAN.md` or `CLAUDE.md`'s wave program disagrees
with the roadmap, the roadmap wins — those documents have been reconciled to
it.*

## 2. Two hard-won laws (added this wave — earn their place here)

- **Lexicon signals carry content, not position.** Raw act-swap degradation
  measured ~0.48 — worse than shuffle-drop's ~0.652 — because word-and-phrase
  signals (the vast majority of the ~2,300 distinct checks) detect WHAT is
  said, and reordering large blocks preserves what's said while destroying
  when it's said. The landed emotional-arc diagnostic lifted its own
  act-swap signal to ~0.647 and the bounded deduction lifted doctor-level
  act-swap to ~0.62, but that is still weak evidence, not a solved problem.
  Global-arc-position claims (setup-before-payoff, escalation-before-climax)
  require signals that read FOR position, not just content. Any further work
  belongs to ROADMAP P1 only after P0 validates that writers want the report.
- **Density normalization absorbs rule families at feature scale.**
  A newly-added rule that fires N more times on a bad script than a good one
  does not automatically move the displayed health score at feature length —
  the opportunity-normalized formula's density term treats issue count
  relative to script length, and at typical feature scarcity terms a
  15-23-instance gap can collapse to a <0.05 health delta (measured,
  D2-wave). Document-scale findings (global arc, structural collapse) need
  the bounded structural-deduction pathway — a dedicated, capped formula
  contribution outside the density-normalized instance count — not more
  detectors hoping to out-fire the normalization.

## 3. Sources

`ROADMAP.md` (canonical P0→P4 sequencing, resume protocol, measured current
state), `ULTRAPLAN.md` (short execution brief), `ARCHITECTURE.md` (system
map), `CLAUDE.md` (working constraints), `server/nvm/analyze/doctor.ts`
(score formula and its own channel-AUC diagnostics),
`tests/core/discrimination.test.ts` and
`tests/core/real-script-corpus.test.ts` (the evidence this file cites —
always re-verify before quoting), and
`docs/research-audit/MASTER_RESEARCH_AUDIT.md` (filed research backlog, not
active sequencing). `server/nvm/revision/WAVE_QUALITY_GUARANTEE.md` is a
historical quality reference; its wave cadence is retired.

## 4. Non-goals

- Not a generic "AI writing assistant" — no unlabeled auto-rewrite, no
  silent quality substitution, no LLM opinion presented as a verdict.
- Not a multi-user SaaS product yet — session ids are unguessable
  capabilities today, not an authentication layer (`docs/AUTH.md` documents
  the gap; nothing enforces it — deployment blocker for public multi-user
  use only, not for the deterministic core's correctness).
- Not chasing corpus size for its own sake — 72 produced scripts with a
  manifest-locked, hash-verified harness beats an unverified pile of
  scraped text; corpus growth is real work (OCR, live-action sourcing) but
  never trades away verification.
- Not chasing rule COUNT for its own sake — the rule total is not the
  product claim and never was a good one. ~64% of today's count is
  mechanical field × mode × position permutation of 7 template functions
  (`passes/lib/checks.ts`), and by the doctor's own measurement the whole
  weighted-rule channel contributes AUC ~0.076 to discrimination while the
  scene-count scarcity term carries AUC ~0.938 (on artificial scene-drop, not natural strong-vs-weak human writing — suspected confound/proxy). Add no entries to the
  current 3,217-entry catalog; maintain the distinct rule concepts unless
  a separately approved migration removes generated permutations. The claim
  is now a score that demonstrably separates strong from weak real writing,
  not a big number. (See ROADMAP.md — the wave cadence that manufactured the
  permutations is retired.)
- Not adopting AI-generated "research" mechanisms on the strength of their
  citations — the fabrication-audit lesson stands (see
  `docs/audits/2026-07-14-high-end-audit/`): adopt
  mechanisms, never citations, from anything in the research archive.
