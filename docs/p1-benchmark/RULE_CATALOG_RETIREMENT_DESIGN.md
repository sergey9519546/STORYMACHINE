# Rule-Catalog Retirement — Migration Design (2026-08-04)

**Status: DESIGN ONLY. Nothing is removed by this document, and nothing in it
authorizes a removal.** It is the migration plan the project has never had —
`ROADMAP.md` P1 says "removal is a separate approved migration, never implied
by 'freeze'", and until now there was no written statement of what that
migration would actually be. This is that statement, plus the evidence bar that
would have to be cleared before step 1 of it runs.

Everything numeric below was measured in this session against the current tree,
with the command that produced it stated. Nothing is quoted from memory.

---

## 1. What is actually there (measured, not quoted)

| Fact | Value | How measured |
|---|--:|---|
| Pass-scoped rule constants `(pass, RULE_NAME)` | **3,216** | count of distinct `rule: 'NAME'` literals per file over `server/nvm/revision/passes/*.ts` (excluding `types.ts`) |
| Distinct rule NAMES (ignoring which pass owns them) | **3,185** | same scan, union across files |
| Names owned by two passes | **31** | 3,216 − 3,185 |
| Pass files | **14** (+ `confidence.ts` with 0 rules, + `types.ts`, + `lib/`) | `ls server/nvm/revision/passes` |
| Total lines in those files | **97,953** | line count over the same set |
| `tests/passes/*.test.ts` | **15 files, 104,299 lines, 6,400 `it()` blocks** | line/`it(` count |

This matches `docs/rulebook/README.md`'s published total exactly, and matches
the 2026-07-14 audit's R2-C01 finding
(`docs/audits/2026-07-14-high-end-audit/PHASE_2_REPOSITORY_RECONSTRUCTION.md`)
that 3,216 is the repository truth. The older "~8,917 rules, ~5,701 from a bulk
Wave 1191" figure was **disproved** by that audit and is cited here only as the
disproven prior, never as a count. R2-C01's other correction also reproduces:
the pass files total ~98k lines, not the 47,500 the retired strategy prose
inaccurately claimed.

### Where the constants live

All of them, and only them, are in **`server/nvm/revision/passes/*.ts`**:
`belief` 228, `causality` 236, `character-arc` 225, `conflict` 234,
`dialogue` 235, `intention` 228, `originality` 229, `pacing` 229, `payoff` 230,
`relationship-arc` 226, `rhythm` 227, `structure` 238, `theme` 225, `voice` 226.
`confidence.ts` holds none.

`docs/rulebook/**` (18 files) is **generated** from those files by
`scripts/generate-rulebook.ts` (`npm run rulebook`) and is never hand-edited —
so it is downstream of a removal, not a second place to remove from.

---

## 2. Why the question is live

`server/nvm/analyze/doctor.ts` lines 1893–1899, the doctor's own recorded
measurement: on the shuffle-drop recipe the **weighted-rule channel contributes
AUC ~0.076** while **scene-count scarcity carries ~0.938**. The catalog is the
most expensive thing in the repository and, by that measurement, close to the
least load-bearing part of the score.

This session's harness (`scripts/rebuild-experiment.mjs`, results in
`docs/p1-benchmark/REBUILD_EXPERIMENT_2026-08-04.md`) adds two things the
`doctor.ts` note does not have:

1. **An exact, external way to zero the channel** without editing any scoring
   file — `computeHealthScore(zeroSeverity, …) − computeHealthScore(real, …)`,
   because `densityPenalty` is the only term reading `bySeverity`. See that
   doc's §7. **This is the measurement instrument this design depends on.**
2. **A directional in-sandbox reading (N=18, NOT a corpus measurement):** with
   the channel zeroed, pooled AUC moved 0.542 → 0.743, and the three structural
   degradations moved from *below chance* (SHUFFLE 0.306, DROP 0.444, RELOCATE
   0.417) to chance-or-better (0.500, 1.000, 0.500). On that corpus the channel
   was not merely inert; it was inverted. **This is a hypothesis for the real
   corpus, not a result. It does not clear the bar in §3.**

One more measured datum on cost-without-benefit: across the 20 in-repo CC0
scripts, **934 of 3,216 (29.0%)** pass-scoped rules ever fire at all. The rest
are maintained, tested, and silent on that material. (Coverage would be higher
on 761 feature-length scripts; that measurement is part of the bar below, not a
substitute for it.)

---

## 3. The evidence bar to proceed

**No removal step runs until every one of these is satisfied and recorded.** The
bar is deliberately harder than "the sandbox says so", because the sandbox is
18 short AI-authored scripts and the catalog is 8 years of accreted craft
judgement.

**B1 — Channel-zero AUC on the REAL corpus.**
`CORPUS_DIR=<local 761-script corpus> node scripts/rebuild-experiment.mjs --partition=trainval`,
run by the maintainer locally, reporting `baseline` and `RULE_ZERO` for all four
degradations with bootstrap CIs. **Pass condition:** `RULE_ZERO` is not worse
than `baseline` on pooled AUC, *and* its CI lower bound on DIALOGUE_FLATTEN does
not fall below the ≥0.80 gate that channel currently clears (0.990 on the test
partition, `DISCRIMINATION_BASELINE_2026-07-29.md`). Dialogue is the one channel
that passes today; a removal that costs it is a net loss regardless of what it
gains on structure.

**B2 — Held-out confirmation, once, at the end.** Per
`MEASUREMENT_RUNBOOK.md` and `PRE_REGISTRATION_PROTOCOL.md`, B1 is a
train/val exercise. The test partition is evaluated exactly once, through
`scripts/measure-auc-split.mjs` (which carries the SHA-256 hash lock), after the
migration's shape is frozen. `rebuild-experiment.mjs` refuses
`--partition=test` by design and must not be used for this.

**B3 — The AUC-24 ratchet holds.** `tests/core/real-script-corpus.test.ts`
asserts AUC-24 ≥ 0.622 (last measured 0.731) on a *different* recipe and a
*different* estimator. It must be re-run with `REAL_SCRIPT_CORPUS_DIR` set and
must not regress. This is a separate statistic from B1 and B2 and cannot be
substituted by either.

**B4 — The produced-feature floor holds.** Same test file: every produced
feature scores health ≥ 80 and verdict `RECOMMEND`. A catalog removal changes
`bySeverity` for every script in the manifest, so this will move and the
manifest will need re-locking — see §5.

**B5 — Calibration band monotonicity holds.** `server/nvm/analyze/calibration/`
depends on the rule channel through `computeRawCraftScore`. CLAUDE.md's
calibration gotcha applies: the corpus's controlled-richness design is what
makes band monotonicity meaningful, and a removal that changes issue counts
unevenly across bands can break it for a real reason.

**B6 — A receipt.** `scripts/check-scoring-receipt.mjs` runs as a blocking CI
step: any change under `server/nvm/revision/passes/**` requires a same-range,
content-bearing update to `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`. Every
removal commit is a scoring change and must carry one. CI cannot verify the
number is real; the discipline is that the human step happened.

**B7 — A named owner and a rollback point.** §6.

**If B1 fails, this design is finished and the catalog stays.** That is a real
possible outcome and the correct one if the evidence says so.

---

## 4. Mechanical steps (in order, each independently revertible)

Every step is a separate commit on a dedicated branch. No step is started until
the previous step's verification passes.

**Step 0 — Instrument, do not change.** Land a firing-frequency measurement over
the real corpus: for each of the 3,216 pass-scoped rules, how many scripts it
fires on and how much weighted severity it contributes. Record it as a committed
CSV under `scripts/output/`. This is read-only and can land before B1 completes;
it is the input that turns "remove the catalog" into "remove *these* rules".

**Step 1 — Freeze, confirmed.** Verify (do not merely assert) that no new rule
constant has been added since this document. `tests/core/rulebook.test.ts`
already fails when `docs/rulebook/README.md`'s total drifts from the live files;
that is the freeze detector and it is already in CI.

**Step 2 — Partition the catalog into three tiers**, from Step 0's data plus the
B1 ablation:

- **Tier A — load-bearing:** fires on real scripts *and* the ablation shows its
  removal costs AUC. Keep, unconditionally.
- **Tier B — silent:** never fires on any script in the real corpus. Candidate
  for removal at zero measurable score cost, by construction.
- **Tier C — firing but non-discriminating:** fires, but the ablation shows
  removal costs nothing or *helps*. The interesting and dangerous tier — these
  are the rules producing the inversion, and they are also the ones most likely
  to be carrying real craft advice that the AUC recipes simply cannot see. A
  mechanical degradation is not a reader.

**Step 3 — Remove Tier B only, one pass file per commit.** 14 commits maximum.
Per commit: delete the rule's emission site and its guard; delete its
`tests/passes/<pass>.test.ts` fire/no-fire block; run `npm run rulebook`; run
`npm run lint`, the touched test file, then the full `npm test`; record the
receipt (B6). A Tier-B rule that turns out to fire on something is a Step-0
measurement bug — stop and fix the measurement, do not adjust the tier.

**Step 4 — Re-lock the derived artifacts.** In this order:
`npm run rulebook` (regenerates all 18 `docs/rulebook/**` files) →
`tests/fixtures/real-corpus-manifest.json` health/verdict/sceneCount re-lock →
`scripts/output/real-corpus-scores.csv` → the calibration reference
distribution if B5 moved. Re-locking is a *recording* step; if a verdict flips
anywhere, that is a finding, not a number to overwrite.

**Step 5 — Re-run the full bar (B1–B5) on the post-removal tree.** Then, and
only then, consider Tier C — as a *new* proposal with its own evidence bar,
never as a continuation of this one.

---

## 5. Blast radius (measured)

How many of the 3,185 distinct rule names are referenced **by name** outside
`server/nvm/revision/passes/**`:

| Location | Names referenced | What it means for a removal |
|---|--:|---|
| `tests/passes/**` | **3,142** (98.6%) | The dominant cost. Each removed rule takes its fire/no-fire block with it. This is mechanical but large: 6,400 `it()` blocks across 104,299 lines. |
| `docs/rulebook/**` | 3,185 (100%) | Fully generated — `npm run rulebook` handles it. Zero manual work, but it must actually be run. |
| `tests/**` (outside `passes/`) | 73 | Hand-written integration expectations. Each needs individual judgement. |
| `server/**` (outside `passes/`) | 54 | **The real coupling.** Includes `analyze/cluster.ts`'s `requiredRules` co-occurrence templates (a removed rule silently disables its whole root-cause template), `analyze/doctor.ts`'s named deductions (`SCENE_CONTINUITY_COLLAPSE`, `SCENE_CONTINUITY_PERVASIVE`, `GLOBAL_ARC_INCOHERENCE` — all in Tier A by inspection), `analyze/fountain-analyzer.ts`, and `nvm/proof/lint.ts`. |
| `scripts/**` | 6 | Probe/measurement scripts. |
| `src/**` | 3 | Frontend. Smallest surface — the UI is not rule-name-coupled in any meaningful way. |

**The `cluster.ts` hazard deserves its own line.** Its root-cause templates
declare `requiredRules: ['A', 'B']` and fire only when both are present.
Removing either silently makes the template unreachable — no compile error, no
test failure unless a test exercises that template specifically. **Any removal
touching a name in `cluster.ts` must delete or re-specify the template in the
same commit.**

Reproduce these counts with a scan for each name over each root, excluding
`server/nvm/revision/passes/**`.

---

## 6. Rollback plan

- **Branch discipline.** All work on one dedicated branch, never on the
  integration branch. Per CLAUDE.md, pull and check `git log` first — parallel
  sessions ship concurrently.
- **Per-step revert.** One pass file per commit means `git revert <sha>` restores
  exactly one pass's rules plus its tests, with the rulebook regenerated by
  re-running `npm run rulebook`. No step depends on a later step's state.
- **The tripwires that catch a bad removal**, in the order they fire:
  1. `npm run lint` — a dangling reference from `cluster.ts`/`doctor.ts`.
  2. `tests/passes/<pass>.test.ts` — the removed rule's own coverage.
  3. `tests/core/rulebook.test.ts` — the published total no longer matches live.
  4. `npm test` in full — integration expectations in `tests/**`.
  5. `REAL_SCRIPT_CORPUS_DIR=… npm test` — the AUC-24 ratchet (B3) and the
     produced floor (B4). **Local only; CI cannot run these** (the corpus is
     local-only for copyright reasons and mounting it via CI secrets was
     rejected). This is the step a rollback decision actually hangs on, and it
     is a human step.
- **Point of no return: none, by construction.** Because `docs/rulebook/**` is
  generated and the manifest re-lock is a separate step, every commit up to
  Step 4 is a plain revert. Step 4's re-lock is the first commit that would need
  a deliberate re-measure to undo — so it is deliberately last, and it is
  reversible by re-running the same measurement on the reverted tree.

---

## 7. What "freeze the conceptual set" preserves — and what it does not

ROADMAP P1 says: *"Add no entries to the current 3,216 generated catalog; treat
the distinct rule concepts as the maintained conceptual set."*

**Preserved by the freeze (and by this design, which does not touch any of it):**

- **The concepts.** Every distinct craft judgement the catalog encodes stays
  legible in `docs/rulebook/**` even after a constant is deleted from the live
  pass files, because the rulebook's generated history and this repository's git
  history both retain it. Removing a *constant* is not forgetting a *concept*.
- **The 14-pass execution order.** Untouched. CLAUDE.md is explicit that the
  pipeline order is live and the wave-rotation order is retired history.
- **Every Tier-A rule and every rule `doctor.ts` names directly.** The bounded
  structural deduction path (`SCENE_CONTINUITY_COLLAPSE`/`PERVASIVE`,
  `GLOBAL_ARC_INCOHERENCE`) is exactly the mechanism CLAUDE.md requires
  feature-scale structural findings to go through. It is not a removal
  candidate under any tier.
- **The determinism claim.** Nothing here introduces an LLM or a random term
  into scoring.

**NOT preserved, and worth saying plainly:**

- **The claim that catalog size is evidence of rigour.** It never was; R2-C01
  established that the size story itself was inaccurate, and `doctor.ts`'s own
  AUC ~0.076 establishes that the channel is close to inert. A smaller,
  measured catalog is a *stronger* trust story than a large unmeasured one.
- **Byte-identical scores across the migration.** Removing any firing rule
  changes `bySeverity`, hence `densityPenalty`, hence health. Step 4 exists
  because of this. Anyone expecting an invisible migration should read §4 Step 4
  again.
- **The freeze as a synonym for removal.** They are opposite operations. The
  freeze is in force today; this removal is not approved and does not become
  approved by this document existing.

---

## 8. Open questions this design does not answer

1. **Is a mechanical degradation the right judge of a craft rule at all?** Tier C
   is defined by "removal doesn't cost AUC on SHUFFLE/DROP/RELOCATE/FLATTEN".
   A rule that catches on-the-nose dialogue is invisible to all four recipes and
   would land in Tier C while being genuinely useful to a writer. **P1's human
   benchmark — ≥3 experienced readers, blind-labelled — is the only instrument
   that can adjudicate Tier C**, and it does not exist yet. Tier C should not be
   touched before it does.
2. **Does P0 demand justify the work?** ROADMAP's first law is *demand before
   rigor*. This migration is engine work. It is gated behind P0 validation like
   everything else, and this document does not exempt it.
3. **What replaces the removed channel?** Nothing, on this evidence — the
   rebuild experiment's reading is that the score improves by *subtraction*, not
   by substitution. If a replacement is wanted, `agency-signal.ts` is the only
   unwired candidate with a mechanical reason to attack CLIMAX_RELOCATE (the
   channel sitting at chance, 0.523), and it needs its own feature-scale
   measurement first.
