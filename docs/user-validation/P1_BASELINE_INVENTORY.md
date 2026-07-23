# P1 baseline inventory — inventory only

> **STOP: P1 HAS NOT STARTED.** P0 is active and blocks P1 until at least five documented writer sessions clear the P0 exit gate. This document authorizes **no experiment, implementation, benchmark construction, labeling run, corpus acquisition, scoring change, or metric rerun**. It is a repository inventory only. (`ULTRAPLAN.md:29-32`, `ULTRAPLAN.md:57-69`; `ROADMAP.md:97-119`)

## Scope and evidence rule

This inventory records what already exists in the repository and what prior documents report. Numeric results below are citations, **not fresh measurements**; no test, scorer, corpus runner, or analysis script was run to produce or verify them. Conflicts and stale statements are preserved as discrepancies, not resolved experimentally.

P1's eventual goal is a runnable test showing separation on strong versus weak **real** writing (`ROADMAP.md:119-128`). That goal is not satisfied by any asset inventoried below.

## Existing evidence classes

### 1. Synthetic calibration corpus

- `server/nvm/analyze/calibration/corpus.ts` contains `REFERENCE_CORPUS`: 20 original, hand-authored Fountain samples, five each in `strong`, `competent`, `weak`, and `troubled` bands. It is explicitly synthetic—not copied from or based on produced/copyrighted screenplays—and uses a matched 10-scene, approximately 300–360-word controlled-richness skeleton (`docs/CALIBRATION.md:9-16`, `docs/CALIBRATION.md:29-60`).
- Rights/runnability: its original synthetic text is committed and runnable through the real doctor. `tests/core/calibration.test.ts:130-183` checks distribution shape; `tests/core/calibration.test.ts:230-355` runs band ordering and a pinned strong/troubled percentile comparison through `runScriptDoctor`.
- Contract: percentile language is only relative to “the reference set,” never an industry population (`docs/CALIBRATION.md:180-205`). Calibration is optional/fail-open, and fewer than eight samples yields no distribution (`docs/CALIBRATION.md:216-231`).
- Caveat: controlled synthetic monotonicity is calibration/regression evidence, not human judgment or real-writing discrimination. Length behavior was measured only to roughly 890 words and remains extrapolated at feature length (`docs/CALIBRATION.md:133-140`, `docs/CALIBRATION.md:159-174`).

### 2. Synthetic discrimination pairs

- `server/nvm/analyze/calibration/discrimination-pairs.ts` holds six synthetic, matched-premise good/bad pairs. The harness requires exactly six pairs, 6–10 scenes per half, 400–800 words, and within-pair length ratio no greater than 1.2 (`tests/core/discrimination.test.ts:200-237`).
- Runnability: committed and ordinarily CI-runnable through `runScriptDoctor`; all plain `good.health > bad.health` checks are hard assertions (`tests/core/discrimination.test.ts:239-264`).
- Reported, not rerun: current comments report gaps of +6.1, +4.6, +1.4, +1.4, +2.2, and +6.2 (`tests/core/discrimination.test.ts:35-45`). The composite 5.0-point minimum-gap guard remains `todo`, with a reported +2.2 gap (`tests/core/discrimination.test.ts:266-308`).
- Caveat: these are authored synthetic discrimination fixtures. They do not establish real-writing validity, reader agreement, or a held-out benchmark. Their own ledger records prior formula/detector tuning and formerly tied pairs (`tests/core/discrimination.test.ts:22-33`, `ROADMAP.md:45-48`).

### 3. Environment-gated private real corpus

- `tests/fixtures/real-corpus-manifest.json` commits metadata only: filename, content hash, health, verdict, and scene count. The screenplay text is copyrighted, outside the repo, and supplied via `REAL_SCRIPT_CORPUS_DIR`; without it, corpus assertions skip (`tests/core/real-script-corpus.test.ts:11-16`, `tests/core/real-script-corpus.test.ts:34-45`, `tests/core/real-script-corpus.test.ts:47-71`).
- Rights/runnability: the text is local/private and not legally distributable from this repository. It is therefore not runnable in ordinary CI and cannot be the sole basis of a product claim (`ROADMAP.md:84-85`; `ULTRAPLAN.md:190-194`). `docs/scoring/BASELINE_2026-07-11.md:8-13` additionally calls a 45-film subset `rights_tier=reference_only` and says no verbatim text is stored.
- Contract: byte-identical input gets exact health/verdict/scene-count assertions; hash-mismatched extraction gets only health `>= 80` and `RECOMMEND` floor checks (`tests/core/real-script-corpus.test.ts:18-25`, `tests/core/real-script-corpus.test.ts:53-69`). This is a produced-floor/determinism harness, **not** strong-versus-weak discrimination.
- Manifest reality: the committed manifest has 72 entries, 71 `RECOMMEND` and one `CONSIDER` (`tests/fixtures/real-corpus-manifest.json:1-578`; the lone `CONSIDER` is `A_Scanner_Darkly_Matched`, lines 27–32). The roadmap explicitly records the same 71/1 discrepancy and says the corpus has zero local files / never runs in its assessed environment (`ROADMAP.md:45-48`).

### 4. Degradation fixtures and runners

These are algorithmically degraded versions of the private produced corpus, not independently authored weak real drafts and not human-labeled quality pairs.

- **Shuffle-drop:** seeded scene shuffle plus every third scene dropped; the runner uses the first 24 private manifest files and computes AUC from intact/degraded health values (`tests/core/real-script-corpus.test.ts:74-132`). It skips without `REAL_SCRIPT_CORPUS_DIR` (`tests/core/real-script-corpus.test.ts:114-115`). Reported comments conflict over the latest value: the historical block says AUC-24 `0.672` with hard floor `0.622` (`tests/core/real-script-corpus.test.ts:103-111`, `:135-140`), while the todo reason says measured `0.731` (`:142-145`). `ULTRAPLAN.md:80` instead summarizes approximately `0.652`. Inventory status: stale/discrepant; do not choose a value without a later authorized measurement.
- **Act-swap:** reorders contiguous thirds as third-first-second while preserving local adjacency within thirds (`tests/core/real-script-corpus.test.ts:148-207`). It is also env-gated. Historical comments report AUC-24 `0.477 -> 0.480` (`:161-179`), while the todo reason reports `0.615` (`:209-213`); `ULTRAPLAN.md:81` summarizes raw act-swap approximately `0.48` and doctor-level bounded deduction approximately `0.62`. Inventory status: stale/discrepant, not resolved here.
- Neither degradation runner supplies rights-safe committed text, reader labels, uncertainty intervals, or a pre-registered held-out split.

### 5. Metamorphic evaluation infrastructure

- `evals/scoring/metamorphic/base.fountain` is an original nine-scene synthetic fixture with no stated rights issue (`evals/scoring/README.md:7-12`).
- `evals/scoring/contracts/scoring-eval-case.ts:6-23` defines known-direction invariance/sensitivity cases; `evals/scoring/runner/run-metamorphic.ts:1-35` runs them through the real doctor.
- `npm run test:metamorphic` is the exposed runner (`package.json:7-17`). Hard cases fail the process; `empty_verbosity` is a known-failing, non-blocking witness (`evals/scoring/README.md:21-28`; `evals/scoring/runner/run-metamorphic.ts:37-76`).
- Caveat: metamorphic direction checks are synthetic bias/structure witnesses, not absolute score validation or human-preference evidence. Golden human pairs, calibration, and ranking remain absent pending labels (`evals/scoring/README.md:30-39`).

### 6. Human-label infrastructure (infrastructure only)

- There are **zero human-preference labels**. Human agreement, pairwise agreement, Kendall/Spearman, Brier/ECE, position bias, and verbosity bias are unmeasured (`docs/scoring/BASELINE_2026-07-11.md:50-53`; `evals/scoring/human/HUMAN_LABELING_TASK.md:1-5`). No claim of expert agreement is currently supportable.
- A protocol exists at `evals/scoring/human/HUMAN_LABELING_TASK.md`: qualified professional/near-professional writers or trained story readers; role-separated labels; blinded and randomized A/B pairwise judgments; confidence and rubric breakdown; held-out split by script/writer/story-world; rights-restricted candidate text kept out of git (`:7-32`). This is a task description, not completed collection.
- Typed contracts exist in `evals/scoring/contracts/scoring-eval-case.ts:25-36` and independently in `evals/scoring/contracts/human-label-import.ts:7-18`. The importer parses JSONL and validates required IDs, A/B/tie preference, confidence, rubric values, role, and notes (`human-label-import.ts:37-170`).
- Missing readiness pieces: no committed `evals/scoring/human/labels/*.jsonl`, no candidate corpus/content map, no recruited readers, no completed blinded assignments, no repeated overlap sufficient for agreement, no adjudication/disagreement artifact, no split/version/hash registry, and no agreement/calibration/ranking runner. The infrastructure can validate label shape; it does not calculate inter-rater agreement or establish label provenance/rights.

## Existing eval contracts and what they do not prove

| Asset | Existing contract | Runnable now? | Does not prove |
|---|---|---:|---|
| Synthetic calibration | Corpus size/spread, band monotonicity, percentile behavior | Yes | Real-writing validity or human agreement |
| Synthetic discrimination | Six matched pairs; relative good > bad; composite gap todo | Yes | Held-out real-draft discrimination |
| Private produced corpus | Exact deterministic lock by hash or produced floor | Only with private env corpus | Strong-vs-weak discrimination; CI reproducibility; distributable rights |
| Shuffle-drop / act-swap | AUC runners over private corpus transformations | Only with private env corpus | Human quality preference or naturally weak drafts |
| Metamorphic suite | Known-direction invariance/sensitivity; one known failure | Yes | Absolute validity or expert agreement |
| Human-label importer | JSONL shape/type validation and coverage summary | Parser yes; data absent | Agreement, calibration, benchmark validity, or rights clearance |

## Reported baselines and caveats (citation only)

- Rule-channel AUC approximately `0.076`; scene-count scarcity AUC approximately `0.938` (`ROADMAP.md:45-48`; `ULTRAPLAN.md:80-83`). These values show proxy dominance but are not rerun here.
- Emotional-arc standalone act-swap signal approximately `0.647` is reported in `ROADMAP.md:130-136`; `ULTRAPLAN.md:80-82` rounds it to approximately `0.647`. It is diagnostic evidence, not authorization to integrate it.
- The frozen 2026-07-11 document reports a **45-script subset** with mean health `95.1`, all 45 at/above 80, all 45 `RECOMMEND`, shuffle-drop AUC-24 `0.672`, act-swap approximately `0.48`, and composite gap `2.2` (`docs/scoring/BASELINE_2026-07-11.md:15-36`). Its rights-safe machine dump is named `outputs/gap_analysis.json` (`:3-6`), but that path is not established here as a current committed P1 benchmark.
- The same frozen baseline reports `9,032` tests, zero failures, one todo (`docs/scoring/BASELINE_2026-07-11.md:46-48`). This document does not rerun or endorse that historical suite count as current.

## Stale and baseline discrepancies — deliberately unresolved

1. **Corpus scope:** frozen baseline says 45 produced animation features (`docs/scoring/BASELINE_2026-07-11.md:8-12`); committed manifest contains 72 entries; roadmap describes “72 produced scripts” but clarifies 71 RECOMMEND + 1 CONSIDER (`ROADMAP.md:45-48`). These may represent subsets/time slices; no reconciliation is authorized.
2. **Produced-floor verdict:** the real-corpus test's hash-mismatch branch requires `RECOMMEND` (`tests/core/real-script-corpus.test.ts:65-69`), yet the byte-locked manifest includes one `CONSIDER` (`tests/fixtures/real-corpus-manifest.json:27-32`). This is contract asymmetry, not corrected here.
3. **Produced health range:** test comment says measured `88.9–98.3` (`tests/core/real-script-corpus.test.ts:40-44`), while committed manifest includes values below 88.9 and up to 98.9 (for examples, `Brave-2012` at `87.3`, lines 99–104; `Ratatouille` at `98.9`, lines 315–320). Treat the comment as stale.
4. **Shuffle-drop:** cited values include approximately `0.652`, `0.672`, and `0.731`; the executable hard floor is `0.622`. See degradation inventory above.
5. **Act-swap:** cited values include approximately `0.48`, `0.615`, and rounded doctor-level `0.62`. See degradation inventory above.
6. **Composite todo text:** surrounding comments report +2.2, but the todo reason still says approximately 0.0 (`tests/core/discrimination.test.ts:266-289`). The assertion remains todo; wording is stale.
7. **Historical program language:** discrimination comments invite a future Program v2 wave (`tests/core/discrimination.test.ts:102-110`, `:243-246`), while the current plan retires/freeze-files Program v2 and rule growth (`ULTRAPLAN.md:153-164`). Current roadmap sequencing governs; historical comments are evidence, not authorization.

## Missing prerequisites before P1 may begin

These are blockers/gaps, not an instruction to execute them now.

- P0 exit gate cleared and linked evidence from at least five documented writer sessions (`ULTRAPLAN.md:40-65`).
- P0-derived objections and trust requirements available as P1 inputs (`ULTRAPLAN.md:62-63`).
- Legally distributable real-draft benchmark material with explicit rights records (public-domain/CC status or author testing license), committed/runnable in CI (`ROADMAP.md:130-133`).
- Naturally occurring strong/weak comparison design; synthetic “bad” scripts are prohibited as a substitute (`ROADMAP.md:130-132`).
- Qualified independent reader cohort (at least three), blinded assignments, overlap design, disagreement preservation, and agreement analysis (`ROADMAP.md:131-133`).
- Pre-registration of split, metrics, gates, uncertainty procedure, and leakage controls before formula changes; held-out access controls; fixture/label versions and hashes (`ROADMAP.md:132-142`).
- Human label files and candidate-ID mapping with rights-safe storage; no such artifacts are currently present (`evals/scoring/human/HUMAN_LABELING_TASK.md:23-32`).
- Runners for real-writing discrimination, confidence intervals, inter-rater agreement, and label-based ranking/calibration. Existing runners do not provide these (`evals/scoring/README.md:36-39`).

## Frozen prohibitions while P0 is active and in this inventory task

- **No P1 execution.** No experiment, metric rerun, scorer invocation for measurement, implementation, test, script, fixture, label collection, or corpus acquisition.
- No score tuning, formula/constant change, proposed formula, proposed weights, component selection, or emotional-arc integration. P1 requires pre-registration first and held-out proof (`ROADMAP.md:132-135`).
- No benchmark construction and no synthetic “bad” material (`ROADMAP.md:130-132`).
- No new rules or catalog growth; the 8,917-entry catalog is frozen, while removal requires separate approval and dependency mapping (`ULTRAPLAN.md:105-108`).
- No attempt to close the composite fixture via a global curve tweak (`ULTRAPLAN.md:103-104`).
- No resolution of stale metrics by rerunning private or synthetic harnesses.
- No use of the env-gated private corpus as if it were CI-runnable, legally distributable, or a discrimination benchmark.
- No claim that deterministic engineering, calibration monotonicity, produced-floor checks, or metamorphic directions prove score correctness (`ULTRAPLAN.md:172-185`).
- No other file modification under this task.

## P1 entry checklist — all unchecked

Unchecked means **not established by repository evidence reviewed for this inventory**, not permission to begin work.

- [ ] P0 has cleared with at least five documented sessions and a clear positive/qualified signal.
- [ ] P0 objections and trust requirements have been incorporated into an approved P1 pre-registration.
- [ ] P1 start is explicitly authorized.
- [ ] Real-draft benchmark sources are identified and rights-cleared for redistribution and CI.
- [ ] Every fixture has a recorded license/rightsholder permission and permitted-use scope.
- [ ] Benchmark text is available to the intended CI runner without private environment gates.
- [ ] Strong/weak comparisons use real writing rather than manufactured synthetic “bad” scripts.
- [ ] Reader eligibility and independence criteria are approved.
- [ ] At least three experienced independent readers are recruited.
- [ ] Blinding, A/B randomization, overlap, and disagreement-preservation procedures are finalized.
- [ ] Label schema, candidate IDs, rights-safe content map, and storage location are finalized.
- [ ] Split is pre-registered by script/writer/story-world before scoring changes.
- [ ] Held-out set is inaccessible to the implementer for tuning.
- [ ] Metrics, gates, uncertainty method, and leakage checks are pre-registered.
- [ ] Fixture, split, and label artifacts are versioned and hashed.
- [ ] Human labels exist.
- [ ] Inter-rater agreement is measured and disagreement is preserved.
- [ ] Real-writing discrimination runner exists and is runnable in CI.
- [ ] Confidence-interval runner exists for the pre-registered statistic.
- [ ] Label-based ranking/calibration runners exist.
- [ ] Existing deterministic, keyless, calibration, produced-floor, security, type-check, and build gates are enumerated in the pre-registration.
- [ ] Baseline discrepancies above have an approved, non-leaky resolution protocol.
- [ ] Rule growth remains frozen and no score/formula tuning has occurred before pre-registration.

Until every required entry condition is independently satisfied and P0 has cleared, P1 remains **not started**.