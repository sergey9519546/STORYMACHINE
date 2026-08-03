# P1 Benchmark — index

> **P1 is underway, not "not started."** Status per `ROADMAP.md` §3: partial
> pass. Dialogue discrimination is SOLVED (test AUC 0.990). Structural
> discrimination (SCENE_SHUFFLE, MIDPOINT_DROP, CLIMAX_RELOCATE) is the live
> blocker, well below the ≥0.80 exit gate. The human-blind-labeled benchmark
> that the exit gate actually requires — ≥3 independent readers, blinded
> pairwise judgments, a weak-craft human contrast class — has still never
> been built; every AUC number in this directory to date is measured against
> **mechanical** degradations (shuffle/drop/relocate/flatten scenes) of real
> produced screenplays, not human judgment. See §"What P1 has NOT done" below.
>
> Authority: `ROADMAP.md` §3 P1 is canonical for status and the exit gate. If
> anything here conflicts with it, the ROADMAP wins.

## Where P1 actually stands (verified against this directory's own files)

| Channel | Test AUC | Gate (≥0.80) | Source |
|---|---:|---|---|
| DIALOGUE_FLATTEN | **0.990** | ✅ PASS | `DISCRIMINATION_BASELINE_2026-07-29.md` |
| MIDPOINT_DROP | 0.766 | partial | same |
| SCENE_SHUFFLE | 0.734 | partial | same |
| CLIMAX_RELOCATE | 0.523 | FAIL (chance) | same |
| All channels pooled | 0.754 | partial | same |

Measured on 761 produced screenplays (89 original + 684 crawled from
IMSDb/DailyScript across 14 genres), split 60/20/20 train/val/test (seed 42,
hash-locked test set), 153 scripts in the test partition. Full provenance —
crawl source, format conversion pipeline, dedup, quality gate — is in
`CORPUS_EXPANSION_2026-07-29.md`.

**Why structural discrimination is stuck:** every field on
`ScreenplaySceneRecord` is computed from that scene's own text. Shuffling or
relocating scenes preserves every one of those fields, so no formula built on
them can detect the reordering — the signal has to come from a new
analyzer-layer field that reads a scene's position or content *relative to
its neighbors*, not from retuning existing constants. Diagnosed in
`STRUCTURAL_SIGNAL_DIAGNOSIS_2026-07-29.md` and confirmed a second time by
`STRUCTURAL_SIGNAL_SCREEN_2026-08-03.md`, which screened five candidate
order-sensitive signals against 26 scripts before building any of them:
four were weak, near-chance, or (candidate 4, setup-before-payoff ordering)
structurally incapable of ever firing because the seed/payoff relation is
*assigned* from scene order rather than *observed* (recorded as detector
defect D6 in `DETECTOR_DEFECTS_2026-08-03.md`). Candidate 5
(question-answer latency) is order-sensitive by construction and already
implemented, but routed through the density-normalized rule channel that
dissolves at feature scale — the next concrete structural experiment is
re-routing it into a bounded deduction, not building a new field.

## What P1 has done

- **Corpus expansion, 48 → 761 scripts**, ~92% live-action (from
  ~100% animation). `CORPUS_EXPANSION_2026-07-29.md`.
- **A discrimination-AUC harness** (`scripts/measure-auc-split.mjs`) that
  measures four mechanical degradations with 10,000×-bootstrap CIs, per
  train/val/test partition. `DISCRIMINATION_BASELINE_2026-07-29.md`.
- **Root-cause diagnosis of the structural gap** (above).
  `STRUCTURAL_SIGNAL_DIAGNOSIS_2026-07-29.md`,
  `STRUCTURAL_SIGNAL_SCREEN_2026-08-03.md`.
- **A dialogue-diversity bounded deduction** that took DIALOGUE_FLATTEN from
  chance (0.54, on the expanded live-action corpus) to 0.990 test AUC —
  the one channel that now passes the gate.
- **A truth audit of the sample coverage report** against the engine's own
  records, producing a ledger of confirmed detector (scoring-path) defects
  D1–D7 — false claims of protagonist passivity, a reversal detector blind
  to the script's own extracted revelation, a clue channel that certifies
  content-word co-occurrence as "planted clues," and others.
  `DETECTOR_DEFECTS_2026-08-03.md`. Fixing any of these still requires
  positive/negative fixtures plus corpus-measured discrimination evidence
  per the CLAUDE.md quality bar — the ledger documents what's wrong, it
  does not authorize a fix without that evidence.
- **Corpus de-identification tooling** (opaque `SM-<hash>` ids replacing
  literal screenplay titles in committed manifests/CSVs) — verified
  end-to-end against 6 CC0 reference scripts, not yet run against the real
  761-script corpus (local-only, absent from the build container).
  `CORPUS_IDENTIFICATION.md`. This is provenance hygiene only — it does
  **not** change the corpus's copyright or redistribution status.

## What P1 has NOT done

- **No human-labeled benchmark.** `PRE_REGISTRATION_PROTOCOL.md` requires
  ≥3 independent experienced readers giving blinded pairwise judgments on
  real strong-vs-weak writing, with inter-rater agreement measured. Zero
  labels exist. Every AUC figure above is against a **mechanical**
  ground truth (a script vs. a scrambled/dropped/relocated/flattened copy
  of itself), which proves the score notices damage, not that it agrees
  with a reader's taste.
- **No weak-craft human contrast class.** The 761-script corpus is all
  produced, professionally-written screenplays (the strong class only).
  `SCREENPLAY_SOURCING_TODO.md` still names sourcing a legally distributable
  weak-craft human corpus (amateur specs, contest rejects, student drafts
  with permission — never synthetic "bad" scripts) as the highest-priority
  open task.
- **Structural discrimination does not clear the gate** (see table above).

## Documents in this directory

| Document | What it is |
|---|---|
| `PRE_REGISTRATION_PROTOCOL.md` | The methodology lock: research question, hypotheses, success/failure criteria, amendments log. Predates the corpus/baseline work below; still the governing contract for split, metrics, and gates. |
| `SPLIT_STRATEGY.md` | Train/val/test split design (60/20/20), stratification, held-out protection, evaluation protocol. |
| `corpus-manifest-schema.json` | JSON Schema for the corpus manifest (provenance, splits, labeling, hashes). |
| `SCREENPLAY_SOURCES_RESEARCH.md` | Legal analysis of screenplay repositories for sourcing. |
| `SCREENPLAY_SOURCING_TODO.md` | Concrete sourcing tasks. Current top task: the missing weak-craft human contrast class (see above). |
| `ANTI_SLOP_MARKERS_VALIDATION.md` | Honest negative result on the 64-pattern `screenplayAIMarkers`: measured 3.84 marker-lines/film on 261 produced films against an asserted <0.1 target. Predates the 761-script corpus work; not yet re-measured on it. |
| `CORPUS_EXPANSION_2026-07-29.md` | Full provenance of the 48→761-script expansion: crawl source, per-format conversion pipeline, dedup, quality gate, split. |
| `DISCRIMINATION_BASELINE_2026-07-29.md` | The measured AUC results (table above) — train/val/test, per channel, with bootstrap CIs and honest limitations (mechanical ground truth, corpus skew, dialogue-flatten severity varies by genre, a 31% dialogue-flatten score-inversion pathology). |
| `STRUCTURAL_SIGNAL_DIAGNOSIS_2026-07-29.md` | Root-cause diagnosis of why structural channels are stuck (per-scene-derived fields, above). |
| `STRUCTURAL_SIGNAL_SCREEN_2026-08-03.md` | Falsification screen of five candidate order-sensitive signals against 26 scripts, before implementing any — explicitly not a P1 result (n=26, calibration/CC0 scripts, not the 761-script corpus). |
| `DETECTOR_DEFECTS_2026-08-03.md` | Adversarially-verified ledger of detector (scoring-path) defects D1–D7 found by auditing the sample coverage report against the engine's own records and the script text. |
| `CORPUS_IDENTIFICATION.md` | The `SM-<hash>` de-identification scheme for committed corpus manifests — provenance hygiene, not a copyright/redistribution fix. |
| `MEASUREMENT_RUNBOOK.md` | Reproducibility runbook for someone who has the 761-script corpus locally but hasn't read the design docs: corpus layout, commands, iteration discipline, output interpretation. |
| `READINESS_ASSESSMENT_2026-07-28.md` | Pre-dates the work above. Concluded P1 was blocked on P0 and on the missing weak-craft/human-label inputs. Its "P1 is BLOCKED" framing has been superseded by the work that followed (see "Where the P0-gate override is documented" below) — read it for the still-accurate inventory of what's pre-buildable vs. genuinely human-gated, not for current status. |
| `P1_STATUS_2026-07-29.md` | **Superseded for results** (see its own banner) — a mid-session checkpoint on a 48-script corpus, written before the held-out test partition was evaluated. Its numbers are stale; its diagnosis of the structural blindness is still current and is the same one `STRUCTURAL_SIGNAL_DIAGNOSIS_2026-07-29.md` restates. Also the only place in this directory that records the P0-gate override — see below. |

## Where the P0-gate override is documented

`ROADMAP.md` currently shows P1 partial, P2 DONE, P3 DONE, while P0 (the
phase everything else is supposed to be strictly blocked on — ROADMAP §3, "0
new product or engine code until the P0 exit gate clears") still shows 0/5
completed writer validation sessions. The human authorization to proceed past
that gate is not restated in ROADMAP or CLAUDE.md; it appears only in
`P1_STATUS_2026-07-29.md`, under "Phase-gate status":

> **P0 (demand):** not formally cleared (0/5 writer sessions). User directed
> P1 to begin; record shows this.

This entry is recorded here as a factual pointer, not relitigated. If you are
trying to reconcile "P0 blocks everything" with P1/P2/P3 work having
happened, this is the citation.

## Authorization boundary — what IS and ISN'T licensed by this directory

- Scoring changes still require the CLAUDE.md quality bar: positive/negative
  fixtures **plus** runnable discrimination evidence on the real corpus
  (`npm run measure-real` locally — see below). Synthetic fire/no-fire
  coverage alone is not enough.
- The enforced ratchet is **AUC-24 ≥ 0.622**
  (`tests/core/real-script-corpus.test.ts`, env-gated on
  `REAL_SCRIPT_CORPUS_DIR`) — a combined shuffle+drop degradation on a
  24-script subset, last measured 0.731. It must not regress.
  **This is a different statistic from the ≥0.80 gate in the table above**:
  different corpus (24 scripts vs. the 153-script test partition), different
  degradation (one combined shuffle-drop vs. separate SCENE_SHUFFLE/
  MIDPOINT_DROP/CLIMAX_RELOCATE/DIALOGUE_FLATTEN channels), different
  denominator. Do not compare the two numbers directly or "update" one using
  the other.
- **That ratchet is NOT automatically enforced.** CI sets only
  `GEMINI_API_KEY`; `REAL_SCRIPT_CORPUS_DIR` is set nowhere in `.github/`,
  `scripts/pre-commit.sh`, or `package.json`, so the assertion **skips on
  every CI run**. A change that made the doctor more structure-blind would
  merge with `npm test` reporting 0 failures. Until the corpus is wired into
  CI, running `npm run measure-real` locally before merging any scoring
  change is a human step nothing in the suite checks for you — treat it as
  part of the change, not as something CI covers.
- Nothing in this directory authorizes deleting or shrinking the 3,216-entry
  generated rule catalog, sourcing further corpus expansion, or collecting
  human labels on anyone's behalf — those remain separately scoped work
  (see `SCREENPLAY_SOURCING_TODO.md` and `PRE_REGISTRATION_PROTOCOL.md`).

## Related documents (outside this directory)

- `ROADMAP.md` §3 P1/P2/P3 — canonical plan, status, and exit gates.
- `CLAUDE.md` — the quality bar for scoring changes, and the AUC-24/AUC-0.80
  disambiguation restated above.
- `docs/user-validation/P1_BASELINE_INVENTORY.md` — inventory of repository
  assets (inventory only, authorizes nothing).
- `docs/adr/ADR-002-p1-benchmark-design.md` — design decisions and rejected
  alternatives (split strategy, labeling scale, etc.).
