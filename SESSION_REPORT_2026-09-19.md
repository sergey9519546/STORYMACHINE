# Session Report — 2026-09-19 (independent orchestrator)

**What this is.** One session's read of the whole project, from evidence, by an orchestrator that wrote no code: four Haiku mappers, five investigators (unfinished work, doc-vs-reality, logic, structure, tests), an adversarial reviewer of the orchestrator's own synthesis, two execution lanes, and an independent verifier. Every claim below carries a tag: **VERIFIED** (an agent or the orchestrator ran it this session), **READ** (a document says so), **INFERRED**. The raw evidence files (`phase0-*.md`, `phase1A..E-*.md`, `phase2-adversarial.md`, probe scripts `p1.ts..p9.ts`, `a1.ts`, `a2.ts`, `a8.ts`) lived in the session scratchpad and are summarised here; the numbers quoted are theirs.

**Starting point.** `origin/main` @ `28754489` (2026-09-18), 2,459 commits, 1,735 tracked files, the tree green: 14,238 tests / 0 fail / 93 env-gated skips (VERIFIED). The sandbox had no AI key and no corpus, so nothing that generates or measures on real writing could run here.

---

## 1. The five synthesis points (final, after adversarial review)

### 1.1 What the project is for
A keyless, deterministic screenplay coverage tool whose one load-bearing claim is that its health score separates a strong draft from a weak one in a way a third party can re-derive. Since 2026-09-13 the owner added, in their own words, a second aim: generate stories people would value. The code that exists is the first product (~130k lines of doctor, ~240k lines of tests); the second is ~2.8k lines whose first two bench runs produced fragments.

### 1.2 Where it actually stands
**Works (VERIFIED):** keyless boot; production build; the full suite; CI green on main since 2026-09-13; the no-console gate with proven-unreachable exemptions; the public benchmark reproducing all six committed numbers byte-for-byte; the rulebook count (3,217) re-derived; the export→verify loop; the Labs gate; the receipt gate over a 200-commit range. The repository's honesty machinery is real and mostly says true things about itself.

**Does not hold (VERIFIED unless marked):**
- The score does not discriminate on real writing. The only CI test on independent, blind-authored real writing orders **1 of 6** pairs (mean gap −0.02), wrapped in a `knownFailing` guard. The public benchmark's four structural intervals all contain 0.5. The real-corpus AUC-24 (0.731) is asserted nowhere CI can see and was measured on a segmentation that has since changed twice. The docs say all of this honestly.
- **Five fabricated P0 writer-session records were tracked on a public repository.** `docs/user-validation/sessions/P0-S01..S05.md`: "complete", STRONG_PULL verdicts, invented quotes, moderator `research-harness-v1`, observer `automated-async-logger`, an "Application commit SHA" that is the sample report's contentHash; entered via merge `5a125054` (2026-08-12), present in neither parent, four days after a written decision not to commit them; every counter doc still said the directory was empty; nothing tested it. The repository is public (GitHub API, 2026-09-19). *Fixed this session — §3.*
- In 12 days CI goes red on every branch: `scripts/report-unverified-gates.mjs` flips to exit 1 on 2026-10-01 (demonstrated through its own exported `evaluateGates`) for `tests/fixtures/auc24-table.json`, which only the owner's corpus can produce. The gate's header sanctions a deliberate, reviewed date move.
- Nine scoring branches are parked; none merges cleanly today (`git merge-tree`), almost all on generated docs; all carry PENDING OWNER MEASUREMENT; two read 0.09 paired on the public benchmark (worse than chance).
- Two scene grammars. `src/lib/fountain.ts:125` treats any line starting with `.` as a scene heading (Fountain requires `.` + alphanumeric), so `...`-opening dialogue becomes a heading and its block vanishes; `scene-split.ts:17` recognises only `INT.`/`EXT.`, so on `EST.`/forced-heading scripts the only feature-scale deduction reads 0. Measured on the 231-scene fixture the effects are small (±0.5 and +1.5 to +5.0 health) because the scarcity term is `140/sceneCount`; zero such lines exist in any committed script; the owner's PDF-scraped corpus has no normalisation that would remove them.
- The generation track is starved by its own plumbing: `themeHint` — the whole semantic content of every beat — is declared and read by nothing; `approvedSpans` is a sentence in a prompt whose `reason` field is raw into the LLM; all 14 revision passes diagnose the pre-revision document; `/api/nvm/revise` has no server-side deadline.
- Orientation docs were stale: PATH_TO_EXCELLENCE 105 commits behind; UNIFIED_STATE missing nine branches and wrong about one; two "Decision #9"s; CLAUDE.md describing a console gate that does not exist as written. *Fixed this session — §3.*
- Process: 604 commits in 30 days, 550 by "Claude", 7 by the owner (all PR merges, seven of them on 2026-09-18); the owner's last hands-on commit was 2026-08-07. Audit prose to code is 1.9:1 (09-12) and 2.6:1 (09-18). 48% of test lines guard the rule channel the doctor measures at AUC 0.076.

**Half-built:** the generation pipeline (no premise→outline step; beats supplied then discarded); the AUC-24 CI table (never produced); the golden set (6 of ~30 cases, 1 of 2 scorers).

### 1.3 The three biggest gaps
**G1 — The evidence surface can lie in the one lane the receipt gate does not cover.** Fabricated user research sat, published, for five weeks beside counters that said zero, and 188k lines of documentation did not surface it. (The adversarial reviewer raised this above the parser defect; conceded.)

**G2 — Every decisive step routes through one person and one machine**, and the project has built four substitutes and a dated CI failure around that instead of a question. The owner is active (seven merges yesterday) and has not run the measurement in six weeks; that is a preference to ask about, not an absence to engineer around.

**G3 — The owner's named main track is ~2% of the code and the architecture is shaped against it**: the compiler writes fixed English chosen to be legible to the scorer, the proof tiers were built against stubs, the outline is discarded before the prompt, and the only available scorer rewards scene headings.

### 1.4 What previous sessions thought mattered, and whether they were right
- **Integrity machinery** (receipts, identity harness, floors, two-reviewer lanes): right that it catches real things — it caught the empty receipt range, the basename bug, a prompt injection. Wrong in emphasis: sized to the AUC-0.076 channel and calibrated on clean committed fixtures, so "byte-identical on 45 ellipsis-free fixtures" reads as "correct". It could not see the P0 records or the parser defect by construction.
- **"Still owner-only" repeated in every session record for six weeks**: wrong as a plan. Waiting became a 2026-10-01 outage.
- **The 2026-09-12 instrument lane** fixed the segmenter for `EST.`/`I/E.`/forced headings — the examples the finding named — and left `startsWith('.')` one clause away. The retrospective's own "proved on the motivating example" pattern.
- **"Measure before tune" for generation (Decision #9)**: right in principle; the bench then scored with the same doctor and did not notice the beats were being discarded, a one-grep fact.
- **"P0 fabrication fixed 2026-08-07"**: the counters were corrected; the files re-entered five days later; one instance was fixed, not the class.
- **Decision #5 (expiries on unverified gates)**: intended to end silent skipping; it scheduled a CI failure the repo cannot clear from inside.

### 1.5 What nobody wrote down
The verification apparatus proves invariance on clean, hand-formatted committed text, while the product's real inputs (PDF-scraped corpus, pasted drafts) are dirty; "unchanged on our fixtures" has been read as "correct" for two months, and the deadline machinery is about to freeze that state into a permanent floor. The reviewer's sharpening, accepted: the orchestrator's first-choice move (fix the parser with an identity receipt) was itself an instance of that disease — an identity proof vacuous by construction. And two things no document ranks: the repository is public with fabricated research in it, and `LICENSE` grants nobody any right to use the software while the README says `docker pull`.

---

## 2. Decision Record

```
DECISION: Remove the five fabricated P0 writer-session records from the public tree,
correct every document that describes that directory, and add a CI tripwire so a file
in docs/user-validation/sessions/ can never again sit uncounted as evidence.

WHY THIS, NOW: B3/A30 (VERIFIED) — harness-generated records with invented quotes tracked
on main since merge 5a125054, in neither parent, against a written decision; counters say
zero; nothing tests the directory. HIT-9 (VERIFIED by the orchestrator, GitHub API
2026-09-19) — the repository is public. NORTH_STAR §1's only thesis is honest measurement;
this is the one finding that, found by a stranger, discredits every receipt, and the one
finding that needs no owner, no corpus, no key, closes a CLASS, and is reversible.

WHAT I AM NOT DOING AND WHY:
- The scene-heading parser fix. The reviewer measured it at 0.1–0.5 health at feature
  scale, in the leniency-LOWERING direction; `.45` is spec-conformant; an identity receipt
  would be vacuous by construction; it is scoring-path by the repo's own classifier; a
  recipe-id bump would discard the owner's imminent lock. Ship it with the second grammar
  behind one predicate in all four copies, after the owner's lock, with corpus rates in the
  receipt (§4 #5–6).
- Wiring themeHint — the owner's named track and a one-grep defect; lost only because its
  effect cannot be measured here (no key) and it belongs with two sibling defects in one
  generation lane (§4 #1–3).
- Moving the 2026-10-01 expiry — the gate sanctions a reviewed date move, but it is the
  owner's gate and Decision #5 is theirs (§6 Q1).
- Rewriting the orientation docs wholesale — only the specific false present-tense
  statements were corrected (Phase 5 duty).

WHAT WOULD CHANGE MY MIND: evidence the five records are real human sessions logged
through the async portal. If so: `git checkout 5a125054 -- docs/user-validation/sessions/`
restores them and the new test then requires them to be counted.

RISK: the owner's 2026-09-04 rule "nothing half-done is removed". These are not half-done
work; they are evidence records a prior decision excluded. Restore is one command.

HUMAN CHECKPOINT: no — reversible, internal, and it enforces a decision the owner's own
commit a28436c3 and the 2026-08-08 plan already recorded.
```

The runner-up moves and the reviewer's full argument are in the adversarial review; its Q3/Q4 answers are worth the owner's two minutes: the founder's order is *delete the fabricated records → choose a licence → publish the honest near-chance number → five writers this week*; the senior engineer's is *make `docs/brain/` a build artifact so branches stop conflicting on it, delete the six noise branches, fix the two non-scoring generation defects, move the date*.

---
## 3. What was executed, with VERIFIED status per item

All verification below was run by an independent agent on the merged tree (`2212e40f`), not by the implementers; the verifier's full table is reproduced in its own words in the session scratchpad (`phase4-verification.md`).

| # | Item | Commit | Verified how | Status |
|---|---|---|---|---|
| 1 | Removed `docs/user-validation/sessions/P0-S01.md`–`P0-S05.md` | `f2d32a57` | `git ls-files` lists exactly `.gitkeep`, `P0_SESSION_TEMPLATE.md` | VERIFIED |
| 2 | Annotated every false "contains no session files" / "empty (.gitkeep only)" / "were not committed" statement with a dated correction, and added the incident as a PHASE_TRACKER decision-log row (recoverable at `5a125054:docs/user-validation/sessions/`) | `f2d32a57` | grep of each phrase shows a 2026-09-19 correction within six lines | VERIFIED |
| 3 | Added `tests/core/p0-session-records.test.ts`: rejects harness fingerprints and non-human moderator/observer cells in any session record; requires the file count to equal PHASE_TRACKER's "Fully documented sessions" counter; carries an inline fail-first fixture | `f2d32a57` | exit 0 on the tree; restoring `P0-S01.md` from `5a125054` makes it exit 1 naming the file; tree clean afterwards | VERIFIED (fail-first proven) |
| 4 | Registered the new test on the docs-only CI fast path in `ci.yml` and `release.yml` (the `docs-gating-set` tripwire from 2026-09-18 caught its absence on the first full run — the only failure that run produced) | `f2d32a57` | `docs-gating-set` 8/8, `ci-gates-intact` 64/64 | VERIFIED |
| 5 | Renumbered the second "Decision #9" (2026-09-18, lanes push at checkpoints) to Decision #10; updated the brain note (renamed), CLAUDE.md, LANE_STANDARD.md and the 2026-09-18 audit README's citations; left the 2026-09-13 entry as #9 | `6de54c17` | `^## Decision #9` = 1, `^## Decision #10` = 1; the only residual by-number reference is in a reviewer's own review text (`docs/audits/2026-09-18-ci-docs-fast-path/review.md:875`), left per the repo's convention that review text is not edited after the fact | VERIFIED |
| 6 | PATH_TO_EXCELLENCE header → "State as of 2026-09-19, main @ 28754489", plus a 20-line 2026-09-18 record summarising the four audit READMEs and PRs #261–#267, with its brain session note | `6de54c17` | line 3 checked; `brain-coverage` 8/8; `check-brain` 129 notes / 529 links fresh | VERIFIED |
| 7 | UNIFIED_STATE 2026-09-19 addendum: every remote branch with behind/ahead and `merge-tree` result; the `wip/phase-w-ui-checkpoint` "fully absorbed" claim corrected in place; the AUC-24 table absence and the 2026-10-01 expiry recorded | `6de54c17` | grep hits; numbers from commands run by the implementer | VERIFIED |
| 8 | CLAUDE.md: the CI console gate described as it is (`npm run check-no-console`, tsconfig-derived exemptions proven unreachable) | `6de54c17` | grep hit | VERIFIED |
| 9 | Whole-tree gates on the merged result | `2212e40f` | `RUN_E2E=1 npm test`: 14,345 tests, 14,251 pass, **0 fail**, 93 skipped, 1 todo, 607 s; `npm run lint` 0; `npm run build` 0; `check-brain`, `honesty-audit`, `check-docs`, `check-no-console`, `check-scoring-receipt 28754489..HEAD` ("no scoring-path files changed"), `verify-server-reachability` all 0 | VERIFIED |

Not executed, deliberately: nothing under `server/**` or `src/**` changed; no scoring-path file changed; no floor, receipt, fixture or manifest moved; nothing was pushed to any branch but this session's own.

## 4. Findings that are real and NOT addressed this session — ranked for the next session

Ranked by leverage × evidence. IDs refer to the Phase 1 reports (A = unfinished work, B = doc-vs-reality, C = logic, D = structure, E = tests) and HIT = the adversarial review.

| Rank | Finding | Evidence | Where | What to do |
|---|---|---|---|---|
| 1 | **The generator is never told what a scene is about.** `themeHint` — the entire semantic content of every beat the bench hand-authors — is declared on `SceneTarget` and read by nothing in `server/`. Every converge call in the product and the bench runs "advance_plot at tension 45" with no subject. | VERIFIED (C7; grep: one declaration site, zero reads) | `server/nvm/generate/proof-spec.ts:24`; consumer should be `buildSystemPreamble` in `server/nvm/generate/llm-generator.ts`, through `sanitizeForPrompt` | Wire it, then re-run `npm run story:bench` (needs a key — not possible in this sandbox). Not scoring-path; no receipt. This is the owner's named track and the one-grep explanation for "six captions stacked on top of each other". |
| 2 | **`approvedSpans` is a promise nothing enforces, and its `reason` is raw into the LLM prompt.** The lock is a sentence in the user turn; `evaluateRewrite` checks only finish-reason and length; `reason` is `z.unknown()` and skips `sanitizeForPrompt`; span indices go stale from pass 2. | VERIFIED (C3, probe `p9.ts`: locked text gone, `usedLLM: true`, accepted) | `server/nvm/revision/rewrite-llm.ts:42-49,115`; `rewrite.ts:61-73`; `validation.ts:2616`; `pipeline.ts:241-247` | Sanitize `reason`; validate the span schema; compare locked spans against the returned text; shift spans per pass. Labs-gated route, `aiLimiter`; not scoring-path. |
| 3 | **All 14 revision passes diagnose the pre-revision document.** `records`/`structure`/`annotations` are computed once and handed unchanged to passes 2..14 while `currentFountain` changes under them. A plausible mechanism for the invented sluglines the bench observed. | READ (C4, unconditional at the call site) | `server/nvm/revision/pipeline.ts:238-247`; `server/routes/nvm/revision.ts:106-108` | Recompute per pass, or diagnose once and rewrite once. Belongs in the same generation lane as #1 and #2. |
| 4 | **`/api/nvm/revise` has no deadline, attempt ceiling or budget context**; 14 sequential `provider.generate()` calls, no `withTimeout`/`withRetry`; the 301 s cut the bench hit was undici's client-side timeout. `/revise-stream` has no `validate()` at all. | READ (C13) | `server/routes/nvm/revision.ts:85-203` | Wrap like `/converge` does (`withCountedAttempts`, `runWithBudgetContext`, `withDeadline`). |
| 5 | **Two scene grammars, and the second one silently disables the only feature-scale deduction.** `scenesFromFountain` recognises `INT.`/`EXT.` only; on `EST.`/forced-heading scripts `arcIncoherenceDeduction`, mirror/pattern/economy/genre signals read 0, undisclosed. Reviewer measured +1.5 health at every-10th `EST.` and +5.0 all-`EST.` on the 231-scene fixture. | VERIFIED (C2 probes `p5.ts`/`p6.ts`; HIT-5 `a2.ts`) | `server/nvm/analyze/scene-split.ts:17` vs `src/lib/fountain.ts:125` | Scoring-path. Ship together with #6 behind ONE exported heading predicate used by all FOUR copies (`fountain.ts:125`, `screenplay-normalizer.ts:47`, `routes/scriptide.ts:450`, `validation.ts:1013` — the last is the DoS guard's parity mirror with its own suite). Needs a corpus receipt; do it AFTER the owner's AUC-24 lock, and put the corpus ellipsis/EST. rates in the receipt. |
| 6 | **Any line starting with `.` is a scene heading.** Fountain's forced heading is `.` + alphanumeric; `..`/`...` are not. Dialogue opening with `...` becomes a heading and its block vanishes. On a 5-scene toy: +14 health; on the 231-scene fixture: ±0.5 (the scarcity term is `140/sceneCount`, a hyperbola). Zero such lines exist in any committed script; the owner's PDF-scraped corpus has no normalisation step that would remove them. U+2026 `…` is immune. | VERIFIED (C1, probes `p1.ts`/`p7.ts`, re-run by the orchestrator; HIT-1..4 `a1.ts`, `a8.ts`) | same four copies as #5 | Guard is one character: `/^\.[^.]/`. `.45 caliber` is spec-conformant — do NOT pin it as dialogue. Ship with #5. |
| 7 | **The AUC-24 gate flips CI red on 2026-10-01 on every branch** for a file only the owner's corpus can produce. The gate's own header sanctions a deliberate, reviewed date move (option c). | VERIFIED (B2, via the script's exported `evaluateGates`) | `scripts/report-unverified-gates.mjs:52-55,120-142`; `ci.yml:435-437` | Owner decision (open question #1). If no lock run is coming, move the date in a reviewed diff before 2026-10-01. |
| 8 | **Nine scoring branches, none merges cleanly, all PENDING OWNER MEASUREMENT.** The conflicts are almost all in generated/ledger docs (`docs/brain/**`, `MEASUREMENT_RECEIPTS.md`, `CLAIMS_REGISTER.md`), not code. `r5-verbosity-bias` and the stack read 0.09 paired on the public benchmark (worse than chance). | VERIFIED (A1–A10, `git merge-tree`) | `origin/scoring/*`, `origin/claude/*-pending-measurement` | Owner decision (open question #2). Delete A9/A10 (pre-rebase twins) and the four `calibrate/*` snapshots (their finding landed as `e5458290`). Consider making `docs/brain/` a build artifact so branches stop conflicting on it. |
| 9 | **`parseOp` accepts id-less beliefs; the dispatcher then collapses them to one.** Two distinct `UPDATE_BELIEF`s for a character leave one belief; lost beliefs are lost dialogue lines. | VERIFIED (C5, `p2.ts`) | `server/nvm/generate/llm-generator.ts:73-78`; `server/nvm/ops/dispatcher.ts:34-39` | Validate `belief.id` (and `SHIFT_RELATIONSHIP.delta`, `UPDATE_READER_STATE.delta`) the way `APPRAISE_EMOTION` was fixed. |
| 10 | **`IntentionalProof` is self-grounding**: any `UPDATE_BELIEF` in the candidate under judgment grounds an invented character. The 17 v2 blocks are the cases where the model forgot to also emit a belief. | VERIFIED (C6, `p3.ts`) | `server/nvm/proof/tier1/intentional.ts:24-26` | Ground against the caller-supplied cast, not the candidate. |
| 11 | **`reassembleFountainScenes` welds two scenes when the script has no trailing newline**; the shuffle-drop harness loses an extra scene silently and climax-relocate throws. Latent on the 32 committed scripts, live on arbitrary corpus files. | VERIFIED (C8, `p4.ts`) | `scripts/lib/scene-segments.ts:126-131`; `scripts/lib/auc.ts:390-393,444-451` | Normalise a trailing newline before segmenting. Must land BEFORE the owner runs `lock-auc24`, or the lock is taken through it. Harness-only, not scoring-path. |
| 12 | **Worker load failure never trips the in-process fallback**; a worker that cannot import `doctor.ts` 500s every request forever. And once `poolDisabled` latches, the Decision #7 wall-clock budget vanishes process-wide with no signal. | READ (C9, C10) | `doctor-worker.ts:62-89`; `doctor-pool.ts:379-393,479-489,672-700,838-843` | Post a distinct `load_failed` message and treat it as the environment-detection case; log/expose the latch. |
| 13 | **Converge returns an IR its own proofs rejected, with a composite that belongs to a different IR**; `maxIterations` accepts `-1`; `SceneTarget` is `.passthrough()` with only `sceneIdx` validated. | READ (C11, C12) | `server/nvm/converge/loop.ts:470-520`; `validation.ts:2485` | Return `ir: null` when nothing passed; validate the target and budget. |
| 14 | **`stubIR` labels itself `origin: 'model_generated'`; `model: 'gemini'` is hard-coded for every parsed IR; one `null` in `causalLinks` stubs a whole scene's candidates.** | READ/INFERRED (C14) | `server/nvm/generate/llm-generator.ts:31,169-173` | Provenance fixes; guard the filter. |
| 15 | **`tests/core/story-graph-corpus-auc.test.ts` registers zero tests when its env var is unset** (early `return` in `describe`), so its three AUC assertions are invisible even to a skip count. | VERIFIED (E, ran it: `# tests 0`) | that file | Use `{ skip }` like its siblings. |
| 16 | **The blind-pair harness is the only CI test on independent real writing, and it says 1 of 6.** Not a bug to fix; the number to lead with when the discrimination claim is next rewritten. | READ/VERIFIED (E Q4a) | `tests/core/blind-pairs-discrimination.test.ts` | Publish the honest number (HIT founder answer). |
| 17 | **The receipt gate has no test for the "rewrite a PENDING entry in place" path** its own docs say the owner must take. | READ (E Q4d) | `scripts/check-scoring-receipt.mjs`, `tests/core/scoring-receipt-guard.test.ts` | Add one before the owner's conversion run. |
| 18 | Dead-weight proposal B3 (`agent-scheduler/`, `test-freeride.js`) never acted on; four never-run v5.0 test files fail 2/2/10/8 against their own quarantined code; three cannot execute (`@jest/globals`/`vitest` not installed). | VERIFIED (A25/A26, E Q3) | `docs/proposals/DEAD_WEIGHT_REMOVAL_2026-08-24.md`; `scripts/run-tests.mjs` NOT_RUN | Owner's call, recorded there. |
| 19 | ~60 `__pycache__/*.pyc` files are tracked. | VERIFIED (inventory) | `scripts/__pycache__`, `scripts/oasis_cinematic_v2/__pycache__` | gitignore + `git rm --cached`. |

## 5. Claims in existing docs found stale or false — with a recommendation

| Doc | Claim | Status | Recommendation |
|---|---|---|---|
| `docs/user-validation/PHASE_TRACKER.md:22,:214`, `P0_EVIDENCE_SUMMARY.md:223` | "contains no session files" / "empty (.gitkeep only)" | FALSE from 2026-08-12 to today | **Corrected this session** (annotated, with the incident row). |
| `docs/audits/2026-08-08-main-consolidation.md:35` | harness files "were not committed" | became FALSE on 2026-08-12 | **Annotated this session**. |
| `docs/DECISION_LOG.md:918,:1054` | two entries numbered "Decision #9" | defect | **Renumbered this session** (2026-09-18 → #10, citations updated). |
| `docs/PATH_TO_EXCELLENCE.md:3` | "State as of 2026-09-13, main @ 16b669f6" | 105 commits stale | **Header + 2026-09-18 record added this session**; the rest of the narrative is untouched. |
| `docs/UNIFIED_STATE_2026-09-02.md` | branch table; `wip/phase-w-ui-checkpoint` "fully absorbed" | 9 branches missing; the wip claim is false (3 ahead, conflicts) | **2026-09-19 addendum added this session**. |
| `CLAUDE.md` Commands | CI "runs a `console.` grep over server/**" | mechanism false (the gate is `check-no-console` with proven-unreachable exemptions); outcome true | **Corrected this session**. |
| `CLAUDE.md`, `NORTH_STAR.md`, 42 files | "3,216" | 108 stale occurrences remain (most inside dated history, some not) | Leave dated history; a future docs pass should fix undated present-tense ones. |
| GitHub repo description | "3,216 corpus-measured rules" | stale, trips two honesty-audit patterns | Owner only. Replacement string is in PATH_TO_EXCELLENCE T2. |
| `docs/superpowers/plans/2026-08-08-main-consolidation.md:74` | "[x] Do not add … harness records to Git" | checked off, then violated by merge | Leave; the tracker row now records it. |
| `docs/story-generation/STORY_BENCH_2026-09-13.md` §1 / bench lane report | "the bench's beats are hand-authored" | true, but incomplete: the beats are supplied and then discarded (C7) | Add one sentence when #1 above lands. |
| `server/nvm/analyze/scene-split.ts` header | "deliberately DEFERRED" | does not state the cost (feature-scale deduction reads 0 on EST./forced scripts) | Fix with #5. |
| `README.md` docker instructions + `LICENSE` | invites use; grants no rights (`UNLICENSED`, Decision #6 "DECISION NEEDED" since 2026-09-03) | contradiction | Owner only (open question #3). |
| Phase 0 markers report (this session, scratchpad) | "718 console.* — CI BLOCKER" | false alarm: 573+ are in the tsconfig quarantine; gate exits 0 | Not a repo doc; noted so nobody re-derives it. |

## 6. Open questions for the human (could not be resolved from the codebase)

1. **The 2026-10-01 gate.** In 12 days `npm run gates` flips to exit 1 on every branch because `tests/fixtures/auc24-table.json` has never been produced. Two honest options, both yours: run `REAL_SCRIPT_CORPUS_DIR=<corpus> npm run owner:measure` (which also converts the PENDING receipts and re-locks the manifest), or move the date in a reviewed one-line diff as the gate's header sanctions. Note two harness defects that should land first if you run the lock: #11 (trailing-newline weld) and, ideally, #5/#6 (the heading predicate), otherwise the locked table encodes them.
2. **The nine parked scoring branches.** Do you still want them measured? Two of them read worse than chance on the public benchmark; three are one deepening chain. If not, say so and they can be closed with their audits kept.
3. **Licence (Decision #6, open since 2026-09-03).** The repo is public, README documents `docker pull`, and `LICENSE` grants nobody any right to use the software. Nobody may legally use the product today.
4. **Visibility.** The 2026-08-03 decision to make the repo private is unexecuted (verified public today); the description still reads "3,216 corpus-measured rules".
5. **The generation track needs a key to be measured.** Nothing in #1–#4 of §4 can be verified end-to-end without `AI_*` in `.env`. Is the bench meant to be runnable by agents, and if so where does the key live?
6. **Were the five P0 records real?** Every signal says harness output (labels, content-hash-as-SHA, five sessions in 90 minutes, the 2026-08-08 audit's own words). If they were real, restore them with `git checkout 5a125054 -- docs/user-validation/sessions/` — the new test will then require them to be counted.

## 7. Addendum — rows of §4 closed later in this session

§4 above was written at `5ec6a1db`. Lanes that ran later in this same
session closed most of its ranked rows before the session ended. This
section maps each closed row to the commit that actually changed the code
and to its lane record, verified against `git show --stat` rather than
restated from memory. Two rows below did not match the description handed
to the verifying pass; both are corrected here and the correction is noted.

| §4 row | What closed it | Commit(s) | Lane record | Status |
|---|---|---|---|---|
| 1 | `themeHint` now reaches `buildSystemPreamble()` as a labelled "SCENE BEAT" line, sanitized through `sanitizeForPrompt` with a 300-char cap; absent/empty/whitespace-only/non-string leaves the preamble byte-identical | `5d27c7d3` | `docs/audits/2026-09-19-generation-prompt-inputs/` (corrected — the directory is `generation-prompt-inputs`, not `prompt-inputs`) | VERIFIED |
| 2 | `approvedSpanInstructions()`'s `reason` is sanitized to a single line (120 chars, `sanitizeSingleLine`) before it reaches the prompt, and `approvedSpansSurvive()` rejects a rewrite whose revised text no longer contains a locked span's original text verbatim (`reason: 'approved_span_lost'`) | `5d27c7d3` (reason sanitization), `f70ab07d` (span-survival check) | `docs/audits/2026-09-19-generation-prompt-inputs/` for the reason fix; `docs/audits/2026-09-19-locked-spans/` for the survival check (corrected — the commit handed to this pass, `31d83cb6`, is the prompt-inputs lane record, not a code commit; the code commits are `5d27c7d3` and `f70ab07d`) | VERIFIED |
| 4 | `/api/nvm/revise` and `/revise-stream` now run under `REVISE_BUDGET` (`AI_BUDGET_REVISE_TIMEOUT_MS`/`AI_BUDGET_REVISE_MAX_ATTEMPTS`), wired through `runWithBudgetContext()`/`withDeadline()` as `/converge` already was; 503 `AI_BUDGET_DEADLINE_EXCEEDED` on the POST route, a terminal `revision_error` SSE event plus prompt `ensureEnded()` on the stream route (an await-ordering bug in that ordering was found and fixed in the same commit) | `520a3891` | `docs/audits/2026-09-19-revise-deadline/` | VERIFIED |
| 9 | `parseOp` now validates every `UPDATE_BELIEF.belief` field the way `APPRAISE_EMOTION` already was, and synthesises a deterministic `belief_<8-hex sha256(charId\|proposition)>` id when the model omits one, instead of silently letting the dispatcher's id-keyed upsert collapse two distinct beliefs into one; `SHIFT_RELATIONSHIP`/`UPDATE_READER_STATE` deltas are now type-checked | `3312b2d9` | `docs/audits/2026-09-19-generator-honesty/` | VERIFIED |
| 11 | `reassembleFountainScenes` inserts the missing `\n` terminator after a relocated scene slice that lacked one, instead of welding it onto the next scene's heading; `AUC24_DEGRADATION_ID` bumped to `shuffle-drop/v3` per the repo's own bump-on-any-output-change rule; `AUC24_FLOOR` untouched (no table has ever been locked) | `d98a5b1a` | `docs/audits/2026-09-19-harness-honesty/` | VERIFIED |
| 12 | A worker whose lazy `import('./doctor.ts')` fails now posts a distinct `load_failed` message instead of a per-job error the pool never saw; the pool latches `poolDisabled` off that signal and runs the in-flight (and all later) jobs in-process; `/health` reports `doctorPool.poolDisabled` / `poolDisabledReason`; an over-budget in-process fallback is logged; output-identity harness still 45/45 byte-identical | `9c25f79a` | `docs/audits/2026-09-19-doctor-pool-fallback/` | VERIFIED |
| 13 | `SceneTargetSchema`/`ConvergeBudgetSchema` replace the `.passthrough()` object with only `sceneIdx` validated, applied to `/converge`, `/converge-arc` and converge-stream's query-parsed `sceneFunction`; `finalIR`/`finalComposite`/`finalValuation`/`finalQuality` are now all recomputed from the one `finalIR` the loop actually returns (previously `finalComposite` could describe a different IR than `finalIR` in the budget-exhausted, nothing-passed-Tier-1 branch); added explicit `tier1Passed`; `maxIterations` validated instead of accepting `-1` (off-by-one fixed: `<=` → `<`); deviation noted per the brief: `tensionTarget` is capped at 1,000,000, not 100, because a select test's `999999` fixture is a deliberate unreachable-ceiling probe | `32a2a848` | `docs/audits/2026-09-19-converge-contract/` | VERIFIED |
| 14 | `isStubIR()` is now the single place that distinguishes a stub IR from a real one; `provenance.model` carries the resolved candidate model instead of the hard-coded `'gemini'`; a `null` entry in `causalLinks` is filtered out instead of stubbing the whole scene's candidates | `3312b2d9` | `docs/audits/2026-09-19-generator-honesty/` | VERIFIED |
| 15 | `tests/core/story-graph-corpus-auc.test.ts` no longer `return`s from inside `describe()` (which registered zero tests, invisible even to the skip count) — it now registers every `it()` with node:test's `{ skip }` option naming the reason, matching `real-script-corpus.test.ts`'s own unset/broken/valid pattern | `d98a5b1a` | `docs/audits/2026-09-19-harness-honesty/` (corrected — the commit handed to this pass, `96582e9b`, is the harness-honesty lane record; the code fix is in the same commit as row 11, `d98a5b1a`) | VERIFIED |
| 17 | `extractEntries()` grouped only ADDED diff lines by a `### <date>` heading among them, so an in-place rewrite of an existing entry's fields that left the heading text untouched was invisible to it; alone this failed safe, but with a second, unrelated, well-formed entry anywhere in the same range it validated only that entry and reported the whole range `ok:true` even with a `PENDING OWNER MEASUREMENT` entry sitting in it — reproduced against the unmodified gate, then fixed by validating entries via hunk line-number overlap rather than heading detection alone; six in-place PENDING-to-measured shapes now covered | `f0985997` (fix), `67a9ca0e` (tests) | `docs/audits/2026-09-19-receipt-gate-inplace/` | VERIFIED |
| 19 | 17 tracked `.pyc` files removed under `scripts/**` (the §4 estimate of "~60" was not measured; the verified count was 17); `__pycache__/` and `*.pyc` added to `.gitignore` | `e2c636d7` | none (chore; no audit directory) | VERIFIED |

Two items outside the table, recorded here because they touch the same
window of work but are not §4 rows:

The converge-stream timeout branch had the same await-ordering defect fixed
in row 4's commit for `/revise-stream`: on timeout it awaited the abandoned
`convergeScene()` operation before returning, which is before the outer
`finally { ensureEnded(); }` could close the SSE response, so a truly hung
provider call left the connection open indefinitely after the terminal
`converge_error` event had already been written. Fixed in `3f409bd9`
(`tests/routes/nvm-converge-stream-timeout.test.ts`) by emitting the
terminal event, letting the abandoned operation settle in the background
unawaited, and calling `ensureEnded()` immediately. `converge-arc`
deliberately keeps its await, because `appendGhost` runs inside that
operation and must complete before the response ends.

The independent full-suite verification that ran after these lanes merged
caught one integration regression: the generator-honesty edit (`3312b2d9`)
added ten lines to `scripts/story-bench.mjs` above the
"THIS PACKET IS THE SEED OF THAT SET" anchor line, moving it from line 998
to line 1004 — six lines outside the honesty audit's ±3 window around the
line number recorded in `docs/CLAIMS_REGISTER.md` row 120. Fixed by
re-anchoring that row's line number to the new position, with no change to
the claim itself (`8933fb0a`).

Final verified state at `8933fb0a`: `RUN_E2E=1 npm test` — 14,469 tests, 0
failures, 98 skipped (env-gated).

Rows still open after this session, for the next one: row 3 (all 14
revision passes diagnose the pre-revision document; on the scoring path),
row 5 (two scene grammars), row 6 (a bare `.`-prefix line is read as a
forced scene heading), row 7 (the AUC-24 gate's 2026-10-01 expiry — owner
decision), row 8 (nine parked scoring branches — owner decision), row 10
(`IntentionalProof` self-grounding), row 16 (the blind-pair harness reads
1 of 6 — a number to lead with, not a fix), and row 18 (dead-weight v5.0
tests). The locked-spans lane (row 2) also documented, without fixing, that
approved-span line indices go stale from pass 2 onward in `pipeline.ts`
(scoring path); file that under row 3.

### 7.1 Later in the session: review round and row 10

1. **Row 10 closed** — `IntentionalProof` now grounds against an optional
caller-supplied `SceneTarget.cast` (`IntentionalGroundingOptions { cast?,
allowIntroduce? }` threaded through `runTier1` and cast alignment); with no
cast, behaviour is byte-identical to `1e7779de`, pinned by a committed 6-IR
x 2-state equivalence baseline; with a cast, an invented self-grounded name
is blocked and a cast member referenced before any belief passes (the
17-blocks case). `proofsToConstraints` under a cast no longer tells the
model to introduce the name; the preamble carries a sanitized single-line
CAST record. `converge-stream` does not take `cast` (query-parsed scalars
only); `allowIntroduce` is live in the API but inert in today's loop
because no constraint source emits `must_introduce_character` under a
cast. The bench now sends the premise cast, so bench runs before and
after `24476027` are not comparable. Commit `24476027`, record
`docs/audits/2026-09-19-cast-grounding/`.

2. **An adversarial read-only review of the six merged lanes** (after the
gate-runner verification) found ten findings; the four that mattered were
fixed the same session:
   - BLOCKER, a regression introduced by `f0985997`: the receipt gate's
   in-place detector counted any hunk inside any old entry as "gained a new
   entry", so a scoring change plus a typo fix in an old receipt passed the
   gate (branch PASS, `53f6e377` FAIL, confirmed by probe in both
   directions). Fixed in `96c9581c`: in-place entries validate but never
   count toward existence; two ATTACK tests plus a structural-only variant
   added. Record: `docs/audits/2026-09-19-receipt-gate-inplace/README.md`
   § "Regression found in review and fixed".
   - HIGH, pre-existing: a causal link without `causedBy` survived
   `parseIR`'s filter and threw out of `buildCausalGraph` as an HTTP 500 on
   `/api/nvm/converge`; plus `parseOp`'s inconsistent policies (an
   out-of-range relationship amount dropped the op and could stub the
   candidate; `null` optional fields were rejected). Fixed in `b12159a0`:
   `causedBy` must be a string array; amounts clamp like confidence; `null`
   is absent. Record: generator-honesty README § "Review findings fixed".
   - MEDIUM x2 in `approvedSpansSurvive`: CRLF originals with a span at EOF
   false-rejected a correct rewrite (normalize before split now); two-blank-
   line spans and out-of-range spans passed vacuously (an excerpt must
   contain non-whitespace; when every span is skipped the rewrite is
   rejected with `approved_spans_unchecked`; a one-line excerpt must keep
   its occurrence count). Fixed in `bfa8eb88`. Record: locked-spans README
   § "Review findings fixed".
   - LOW x2 in the doctor pool: the disabled reason exposed absolute paths
   on unauthenticated `/health` (now stripped to `<path>` and capped at 200
   chars); the settle order armed an idle timer on a dropped slot
   (reordered). Fixed in `7bb2a6e1`. Output identity re-verified 45/45.
   - Recorded, not fixed: `finalComposite` on the budget-exhausted path now
   describes the returned IR instead of 0, so `converge-arc`'s
   `meanComposite`/`arcScore` before and after `32a2a848` are not comparable
   (no arc number is cited anywhere as a claim); clearing the Arc Planner's
   iterations box now yields a 400 instead of a zero-iteration run;
   receipt-gate heading identity is string-exact.

3. **Process finding, twice in one session**: after every lane that edits
`scripts/story-bench.mjs` or `tests/scripts/story-bench.test.ts`, the
claims-register line anchors in `docs/CLAIMS_REGISTER.md` rows 119-120 go
stale and `tests/core/honesty-audit-claims.test.ts` fails on the full
suite; both times the failing merge had already been pushed as a
checkpoint on targeted tests. Rule for the next session: a lane that
touches a file cited by a `path:line anchor:"..."` pointer in
CLAIMS_REGISTER.md must run `tests/core/honesty-audit-claims.test.ts` in
its own gate table (cite this file's row numbers), and the orchestrator
must run it before any checkpoint push. The two fix commits are `8933fb0a`
and `0edb6df2`.

4. Final verified state after this round: `RUN_E2E=1 npm test` at head
`0edb6df2` — 14,512 tests, 0 failures, 98 skipped (env-gated), 1 todo.

## 8. 2026-09-20 — the remaining rows

The owner authorized the owner-gated rows on 2026-09-20 ("tackle it all").
Scoring-path work landed under the standing condition that no real-corpus
figure is claimed without a run, and the receipt gate accepted both
scoring-path entries on that basis.

| §4 row | What closed it | Commit | Record |
|---|---|---|---|
| 3 | revision passes now diagnose the document they are handed (re-derived via `analyzeFountainText(currentFountain)` when the text changed; on the route path this replaces ledger-derived records from pass 2 on, a documented trade); approved spans are re-located between passes by whole-line verbatim match, nearest occurrence (`server/nvm/revision/approved-spans.ts`); output identity 45/45; receipt is an output-identity entry | `e3c3b53a` | `docs/audits/2026-09-20-per-pass-diagnostics/` |
| 5 and 6 | seven drifted copies of the heading grammar replaced by one exported predicate in `src/lib/fountain.ts`; `scenesFromFountain` uses it; forced heading is `.` + alphanumeric so `..`/`...` lines are no longer headings; measured: a 16-scene mixed-heading script goes 3 → 16 scenes for the arc deduction, and one `...` line inside dialogue no longer moves health 62 → 37.8 on a 5-scene toy; output identity 45/45 because the fixture set contains no non-INT/EXT or `..` lines (counted); public benchmark unchanged, no floor moved; the receipt states no real-corpus figure is claimed and that the owner must re-lock the real-corpus manifest and run `measure-real`/`lock-auc24` on `shuffle-drop/v3`. Unicode forced headings (`.МОСКВА`) are not recognized — owner decision. Post-merge: the snapshot pin was environment-dependent on `engineCommit`, fixed separately | `77e9e0fe`; follow-up `91b55b9d` | `docs/audits/2026-09-20-scene-grammar/` |
| 7 | AUC-24 table gate deadline moved 2026-10-01 → 2026-11-01 as Decision #11 (recipe bumped to v3 on 2026-09-19, so an earlier table would be invalid); the owner must lock the table before then or the gate blocks CI by design | `2a71a035` | (Decision Log #11) |
| 8 | all 17 parked branches triaged with merge trials: 8 superseded or already merged (`lane/node-24`, `lane/healthcheck-ipv4` are ancestors; the four `calibrate/voice-bound-*` and the two `claude/*-pending-measurement` are patch-identical to landed or renamed work), `scoring/advice-rule-fixes` LANDS with docs-only conflicts after the owner's `measure-real`, five REBASE-THEN-LAND (`renderer-residuals` is the tip of a three-branch chain; `r5-verbosity-bias` and `feature-length-defects` compete for the same `densityPenalty`), `wip/phase-w-ui-checkpoint` ABANDON. Nothing deleted | `b1fe52b8` | `docs/audits/2026-09-20-parked-branches/` |
| 16 | blind pairs measured at 1 of 6 on `26d930dd` (the "four of six" in `docs/PATH_TO_EXCELLENCE.md` line ~468 describes the unmerged `scoring/feature-length-defects` branch); README, NORTH_STAR, ROADMAP and ARCHITECTURE now lead with that number, the two public-benchmark intervals containing 0.5, the positive-control caveat, and the superseded-recipe status of 0.731; five claims-register rows added with resolving anchors | `d8893a03` | (README, NORTH_STAR.md, ROADMAP.md, ARCHITECTURE.md, `docs/CLAIMS_REGISTER.md`) |
| 18 | proposal B3 acted on — `agent-scheduler/` (12 files) and `test-freeride.js` removed with a dependency map showing zero live references; Proposal A, B1, B2 (the 78-file closure) and the four never-run v5.0 test files remain proposals for the owner | `7c2d389c` | `docs/audits/2026-09-20-dead-weight-b3/` |

Follow-ups outside §4: the receipt gate's in-place detector treated a `---`
separator as part of the previous entry's span and re-validated a
historical entry on an honest append (false FAIL) — fixed in `2942fdb7`
(separator lines trimmed from spans; the 2026-09-19 existence rule
untouched); `approvedSpans` on `/api/nvm/revise` is now a typed schema
(`startLine` >= 1, `endLine` >= `startLine`, `reason` <= 500 chars, <= 200
spans) instead of `unknown[]`, with the only sender (`RevisionPanel.tsx`)
already within those bounds — `971c055d`, `docs/audits/2026-09-20-approved-spans-schema/`.

Verification: an independent verifier at `1db74c21` ran lint, the console
gate, the brain graph check, server reachability, the receipt gate on both
ranges naming six scoring-path files with two accepted entries, the
output-identity harness (45/45 against both `26d930dd` and `53f6e377`), the
public benchmark (all six numbers unchanged), the build, `npm run gates`
(the auc24-table gate now reads 2026-11-01), and attribution (26/26). The
full suite ran 14,561 tests, 0 failures, 98 skipped.

Open for the owner:

1. `REAL_SCRIPT_CORPUS_DIR=<corpus> npm run measure-real`, re-lock the
   real-corpus manifest, `npm run lock-auc24` on `shuffle-drop/v3`, and
   commit `tests/fixtures/auc24-table.json` before 2026-11-01 — the first
   real-corpus figures the unified grammar has ever produced; the AUC-24
   ratchet (0.622) is the check.
2. Land `scoring/advice-rule-fixes` per the triage runbook.
3. Decide Unicode forced headings.
4. Delete the 8 superseded branches and the stray
   `origin/lane/per-pass-diagnostics` (pushed by a lane by mistake at
   `e3c3b53a`; fully merged).
5. Proposals A/B1/B2 and the v5.0 test files.
6. `converge-stream` still has no `cast` parameter; `allowIntroduce` is
   inert in the loop.

## 9. 2026-09-20, second pass — the owner's five items

**Receipt gate follow-up, before the five items.** The owner's task named a
`---` separator being read as part of the previous receipt entry's span; that
was already fixed in `2942fdb7` (separator lines are trimmed from the span
before the in-place-rewrite check runs). The open judgment call from that
same follow-up — whether to accept a `**Commands (…):**` label as equivalent
to `**Command:**` — was decided as widen-in-lockstep: `fa293293` extends
`REQUIRED_FIELDS`'s Command pattern to match the plural, parenthetical form
three honest 2026-09-12-and-after receipt entries already use, and extends
the simulation-language scan to key on the same pattern so a widened field
name cannot become a blind spot. See
`docs/audits/2026-09-19-receipt-gate-inplace/README.md` §
"Command label widened in lockstep with the claim scan".

**Item 1, the real-corpus measurement.** Cannot run in this environment:
there is no corpus here and `REAL_SCRIPT_CORPUS_DIR` is unset. This remains
the owner's step. Exact commands, unchanged from §8: `REAL_SCRIPT_CORPUS_DIR=
<corpus> npm run measure-real`, then re-lock
`tests/fixtures/real-corpus-manifest.json`, then `npm run lock-auc24` on the
`shuffle-drop/v3` recipe to produce `tests/fixtures/auc24-table.json` for the
first time, checked against `AUC24_FLOOR = 0.622`.

**Item 3, Unicode forced scene headings — decided YES.** `5c473f68` widens
`FORCED_SCENE_HEADING_RE` from ASCII-only to `/^\.(?=[\p{L}\p{N}])/u`, on the
grounds that Fountain's own rule for a forced heading is "a period followed
by a character," not "a period followed by an ASCII character." `.МОСКВА`,
`.ԵՐԵՎԱՆ` and `.東京` are now read as scene headings. The output-identity
harness stays 45/45 (no committed fixture contains a non-ASCII forced
heading), the public benchmark is unchanged, and the fix appends its own
receipt.

**Item 5, proposals A/B1/B2 — decided.** Proposal A is kept, per its own
recommendation; no change made. Proposal B1 was already in place, since
`a2448714` (2026-08-24) — that gate-repair commit already put
`tests/critics` in `scripts/run-tests.mjs`'s `TEST_ROOTS`. This lane verified
what actually runs under B1: 34 assertions (critics-engine 2, event-store
32), and found that `server/nvm/kernel/event-store.test.ts` runs but does
not type-check (11 `tsc` errors) — its `tsconfig.json` exclusion now carries
that reason instead of standing unexplained. Proposal B2 was executed as the
v5.0 closure removal: `4fb420ba` deletes 42 source files / 16,153 lines plus
7 never-run test files and their in-tree reports, 64 files total, backed by a
resolved-import dependency map showing zero live importers (the only two
imports found were from a v5.0 benchmark file, which was removed in the same
commit). The console-gate quarantine shrank 23 → 5 files and the
reachability allowlist shrank 78 → 36 files. Recovery point (if this needs
reverting) is `bf4f3bff`. `server/nvm/benchmarks/index.ts` was edited in the
same commit to drop three catalog entries that pointed at the removed code.
Record: `docs/audits/2026-09-20-dead-weight-b1-b2/`.

**Item 2, landing `scoring/advice-rule-fixes` — done on a lane branch and
deliberately NOT merged.** The branch `origin/lane/land-advice-rule-fixes`
sits at `671b7cf2` (merge commit `089cc1b3`, receipt `3b84db66`, audit
`docs/audits/2026-09-20-advice-rule-fixes-landing/`). The landing itself is
complete and gate-clean: the conflicts were docs-only (a generated brain
file, and the receipts doc where both sides' entries were kept); the branch's
PENDING receipt was rewritten in place as a measured public-corpus entry,
with the original 2026-09-04 text archived beneath it; the blind-pair harness
held at 1 of 6 ordered (mean gap moved from −0.0167 to +0.0333, still exit 0
on the registered known-failing result); the branch's own fixture pair now
orders by issue count the right way round — excellent 132 issues vs bad 150
(before the branch's fixes it was backwards: excellent 158 vs bad 148); the
calibration suite holds; and 38 of the 45 output-identity fixtures moved (29
in health, 3 verdicts, and `screenplay/room-12` dropping 33.5 → 0.0 — traced
to the calibration reference distribution being recomputed at runtime from a
corpus that the same six fixes also raised, not to a detector regression on
that script).

But the public benchmark's PRIMARY channel fell: shuffle-drop matched-pair
went 0.5313 → 0.4375, below its prior floor of 0.5113, with 4 of 32 pairs
flipping from ordered to inverted (one flipped the other way, net 17 → 14
ordered). All-pairs fell 0.5586 → 0.5298. The DIALOGUE_FLATTEN positive
control fell too, from 1.0000 to 0.9844, on one pair that is now tied because
both sides clamp at health 0 (its mean gap actually widened, +29.30 →
+34.65, so the instrument reads more strongly there, not less).
Climax-relocate rose, 0.4063 → 0.4375. The lane re-locked all six public
floors downward to match.

CLAUDE.md's rule is that the shuffle-drop AUC must not regress below its
floor, and that re-locking after a regression silently lowers the ratchet —
so the orchestrator held the merge rather than land it. The instrument that
actually decides this is the real-corpus AUC-24 against the 0.622 ratchet,
which only the owner can run, and only on this branch. The owner has two
options, stated plainly:

(a) Run `REAL_SCRIPT_CORPUS_DIR=<corpus> npm run measure-real` on
`origin/lane/land-advice-rule-fixes`. If AUC-24 holds at ≥ 0.622, merge the
branch and accept the lowered public floors as a measured cost, with the
reasoning already written into its receipt.

(b) If AUC-24 falls below 0.622 on that branch, do not merge it. Put the six
advice-rule fixes back on the parked list with that number recorded against
them.

**Item 4, branch deletion — blocked.** This session's push credential is
scoped to its own branch; a delete attempt on another branch returns HTTP
403, and the GitHub tools available here have no delete call either. The nine
tips identified for deletion are recorded so the owner (or a session with
delete rights) can act on them directly:
`calibrate/voice-bound-2026-09-13` (`c66ca57f`), `13b` (`e4db6c77`), `13c`
(`4653a78e`), `13d` (`213795e7`), `claude/advice-rule-fixes-pending-
measurement` (`68c64eca`), `claude/r5-verbosity-bias-pending-measurement`
(`0f625c27`), `lane/healthcheck-ipv4` (`17e6bfe3`), `lane/node-24`
(`faeb759a`), `lane/per-pass-diagnostics` (`e3c3b53a`). The last three are
ancestors of HEAD; the rest are patch-identical to work that has already
landed or been renamed elsewhere. One-line delete command per tip:
`git push origin --delete <branch-name>`.

**Verification.** Final verification: see the last paragraph of this
section. _Final suite figures at the session head are recorded in §9.1 once
the verifier reports._

### 9.1 Final verification

Independent verifier at `0b7dd404` (range `1db74c21..0b7dd404`): lint, console gate (5 quarantine entries), brain (147 notes), server reachability (36 unreachable, all allowlisted), receipt gate on both ranges, doctor output identity 45 of 45 byte-identical against `53f6e377`, public benchmark unchanged (0.5313/0.5586, 0.4063/0.4443, 1.0000/0.9473; `PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR` still 0.5113), build, gates, attribution on all nine commits. Full suite: 14,577 tests, 0 failures, 98 skipped (env-gated). Verdict: safe to push.

## 10. 2026-09-20, third pass — review round two and the feature-length candidate

1. **Event-store test type-checks** (`c243c2d0`). The eleven fixture-drift
   `tsc` errors in `server/nvm/kernel/event-store.test.ts` are fixed — nine
   `AtomicFact` literals carrying a `content` field the type does not have,
   one `StoryOp` array widened to `string` for lack of a return-type
   annotation, and one read off `EmotionState.type` instead of `dominant` —
   and the file's `tsconfig.json` exclude entry is removed. Console-gate
   quarantine 5 → 4 as measured, and 4 → 3 counted with no `dist/` on disk
   (the gate's exemption matcher only lists entries that resolve to
   something on disk, so a built `dist/` adds one to both counts).

2. **Adversarial review of the 2026-09-20 code** (read-only) found 1
   BLOCKER, 2 HIGH, 3 MEDIUM, and the cases where the prose stated an
   invariant the code did not implement. Fixed the same day:
   - BLOCKER (`6061ae9d`): the per-pass re-diagnosis in `pipeline.ts`
     replaced the caller's `analyzeStructure(records, allCommits)` with
     `analyzeFountainText`'s commit-less structure, zeroing
     `totalClockPressure`, so once pass 1 changed a single byte, passes 2
     through 14 read act 1 at 0% where the ledger said act 3 at 100% — five
     passes branch on those fields. `runRevisionPipeline` now carries the
     ledger through and recomputes `analyzeStructure(rediagnosedRecords,
     commits)`. Same commit: a lost approved span is now dropped from
     enforcement and reported in `lostApprovedSpans`, never re-anchored onto
     text the author did not approve. Output identity held 45 of 45; the
     no-ledger path is pinned byte-identical by hash.
   - HIGH (`2e4d39a1`): the receipt gate's required-field presence check
     tested the joined entry body while the simulation-language scan and the
     unresolved-measurement-marker scan both tested per line, so a two-line
     `**Commands (…)**` label counted as present but was never scanned by
     the other two.
     All three now resolve a field from the same per-line matcher; a wrapped
     label is rejected with a hint instead of passing silently.
   - HIGH (`20bdf2df`): `ApprovedSpanSchema.endLine` had no upper bound —
     200 valid spans could turn a 287 KB draft into a 57 MB prompt block per
     revision pass. Spans are now bounded per span (200,000 lines), per
     request (20,000 lines total), and the assembled prompt block cannot
     exceed the draft it is built from.
   - MEDIUM ×2 (`c607f4b5`): `scenesFromFountain` now normalizes `\r\n?`
     line endings (a lone-CR paste used to read as one scene while the
     report counted three); `AUC24_DEGRADATION_ID` is bumped to
     `shuffle-drop/v4` because the forced-heading grammar change moved the
     recipe's segmentation again after the `v3` bump (a bare `...` line no
     longer reads as a forced heading, and Unicode forced headings are now
     recognized). `AUC24_FLOOR` is untouched at 0.622; no table has ever
     been locked, so nothing already committed is invalidated. The owner's
     lock must be run on `v4`.
   - Recorded, not fixed: span relocation is O(spans × lines) per pass
     (measured 2.6 s on a 10k-line / 200-span worst case); nested spans can
     relocate independently of each other; a `**Command:**` label inside a
     fenced code block still satisfies presence (pre-existing).

3. **`scoring/feature-length-defects` prepared for measurement** on
   `origin/lane/land-feature-length-defects` (tip `4029b245`: merge
   `058f48c0`, receipt `0e24a004`, measurement `6381692f`, audit
   `docs/audits/2026-09-20-feature-length-defects-prep/`). Thirteen
   conflicts resolved, six of them code. The public benchmark on the merged
   tree, no floor re-locked: shuffle-drop matched-pair 0.5313 → 0.8750
   [0.7500, 0.9688], all-pairs 0.5586 → 0.8291; climax-relocate
   matched-pair 0.4063 → 0.5938, all-pairs 0.4443 → 0.5269; control
   1.0000 / 1.0000; scripts pinned at health 76.0, 10 → 0; blind pairs 1 of
   6 → 4 of 6 (mean gap −0.0167 → +0.3833), reproducing the branch's own
   claim. Calibration is unmoved. Output identity moves on 25 of 45
   fixtures, attributed per term: `scarcityPenalty` (the four synthetic
   long fixtures lose about 9 points each), `densityPenalty` steepness 50 →
   2, and the `ORPHAN_CLUE` proper-noun guard. The feature-length fixture
   moves 84.4 → 74.4, with the voice channel now scoring 1,770 pairs
   instead of abstaining across the whole script.

   NOT merged: four tests are left failing on purpose —
   `fountain-shape-guard-cue-parity` (the committed feature fixture now
   reads at 1.52x headroom against the 675,000 voice-eligible-weight bound,
   where the branch's own margin assertion demands 3x; this blocks landing
   regardless of the AUC-24 result — the audit's §9 names three options,
   the cleanest being to land the `burrowsDelta` hoist first so both bounds
   can rise), the public-benchmark re-lock idempotence check on
   `PUBLIC_ORDER_PAIRED_FLOOR` (stale in the cautious direction — a re-lock
   would raise it, not lower it), a scene-grammar equality assertion that
   was masking a real word-count difference between its two fixtures, and a
   coverage-letter page-count promise. The decisive number is still the
   real-corpus AUC-24 on that branch.

4. **Contrast with `lane/land-advice-rule-fixes`** (`671b7cf2`, §9 above):
   that landing lowers the primary shuffle-drop floor (0.5313 → 0.4375);
   this one raises it (→ 0.8750). Both wait on the same owner-run AUC-24;
   of the two, the feature-length branch is the one with evidence in its
   favor so far.

5. **Owner list**, restated compactly:
   (a) `REAL_SCRIPT_CORPUS_DIR=<corpus> npm run measure-real` on the
   session branch and on `origin/lane/land-feature-length-defects`; re-lock
   the real-corpus manifest; `npm run lock-auc24` on recipe `v4`, table
   committed before 2026-11-01.
   (b) Settle the cue-parity headroom on the feature-length branch — land
   the `burrowsDelta` hoist first.
   (c) Decide `advice-rule-fixes` from its own AUC-24 run.
   (d) Delete the nine branches named in §9, item 4.
   (e) `converge-stream` has no `cast`; `allowIntroduce` is still inert.

### 10.1 Final verification

Independent verifier at `9f0ea060` (range `0b7dd404..9f0ea060`, 14 commits): lint, console gate (4 quarantine entries), brain (147 notes), server reachability (36 unreachable, all allowlisted), receipt gate on both ranges naming six scoring-path files with accepted entries, doctor output identity 45 of 45 byte-identical against `53f6e377`, public benchmark unchanged (0.5313/0.5586, 0.4063/0.4443, 1.0000/0.9473; `PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR` 0.5113; `AUC24_DEGRADATION_ID` `shuffle-drop/v4`), build, gates, attribution on all fourteen commits. Full suite: 14,598 tests, 0 failures, 98 skipped (env-gated). Verdict: safe to push.

## 11. 2026-09-20, fourth pass — the hoist and the candidate's second pass

1. **`burrowsDelta` hoist landed on the session branch** (`04fb13cc`; audit
   `docs/audits/2026-09-20-burrows-delta-hoist/`): the corpus statistics are
   computed once per pair instead of 130 times. Bit-identical over 3,706
   pairs (`Object.is`, `maxDeltaDiff = 0`, checked against a frozen copy of
   the pre-change code; falsified on purpose by an associativity change, to
   confirm the comparison can fail). 43x to 51x faster on the worst admitted
   shapes. The cue-parity guard's worst-case cost line went from 6,510 ms
   (43% of the 15,000 ms half-budget) to about 300 ms (2%). Output identity
   45 of 45. No constant moved. Verified at `6ca3fcd0`: full suite 14,601
   tests, 0 failures, 98 skipped, identity 45 of 45 against `53f6e377`, six
   benchmark numbers unchanged, `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT` still
   675,000.

2. **Feature-length candidate, second pass** on
   `origin/lane/land-feature-length-defects` (tip `ca5f2e85`; merge of
   `6ca3fcd0` at `4229a22a`, floors re-locked `e7b8f8a1`, scene-grammar
   guard `40994342`, coverage-letter `7d12b32d`, audit `e2e912ab`; the two
   hoists composed in `voice-delta.ts`). Three of the four failing tests
   from §10, item 3 are closed:
   - The six public floors re-locked with none falling
     (`PUBLIC_ORDER_PAIRED_FLOOR` 0.5269 → 0.5738, `PUBLIC_ORDER_FLOOR`
     0.4951 → 0.5069, the other four unchanged); manifest and split
     byte-identical; `npm run gates` exit 0 with its own mutation
     self-check.
   - The ellipsis guard re-anchored to scene count plus a 2.0-point health
     band (the pre-fix delta was 24.2).
   - The coverage-letter promise restated from a re-measurement of all 21
     screenplays (3.37 to 4.02 pages, median 3.64; gate upper bound 4.0 →
     4.1).

   Blind pairs 4 of 6, calibration 21 of 21, and the identity delta
   reproduces the first pass to the digit (25 of 45 health moves, 0
   sceneCount moves).

   The ONE remaining failure is the cue-parity headroom: the feature
   fixture weighs 443,990 against the 675,000 bound (1.52x, and the guard
   demands 3x). A re-derivation was attempted (`npm run
   measure-voice-bound`: every shape now at or below 4% of the half-budget
   even at a 1,900,000 bound; admissible window 1,331,970 to 1,919,999),
   but `tests/core/voice-bound-derivation.test.ts` binds the constant to a
   fixture that must carry a `github-actions` machine fingerprint, so the
   lock can only come from a run of `.github/workflows/calibrate-voice-bound.yml`
   on a ref carrying the candidate bound. The lane did not fabricate the
   fingerprint and did not accept the 1.52x reading in its place.

3. **Owner runbook, reduced to five steps** (from the audit's §S5):
   (i) `git fetch origin lane/land-feature-length-defects`;
   (ii) `REAL_SCRIPT_CORPUS_DIR=<corpus> npm run measure-real` on it — AUC-24
   against 0.622 is the decision;
   (iii) re-lock the 72-row real-corpus manifest;
   (iv) `npm run lock-auc24` on recipe `shuffle-drop/v4`;
   (v) push a `calibrate/**` ref (or `workflow_dispatch`) with
   `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT` set inside the admissible window so
   the runner locks the derivation fixture; then merge. The earlier items
   stand alongside this: the `advice-rule-fixes` decision, the nine-branch
   deletion, and the AUC-24 table commitment before 2026-11-01.

### 11.1 Final verification

Independent verifier at `6ca3fcd0`: full suite 14,601 tests, 0 failures, 98 skipped; identity 45 of 45; six benchmark numbers unchanged; verdict safe to push.

## 12. 2026-09-20, fifth pass — the candidate is green

SHAs verified against `origin/lane/land-feature-length-defects`:
`git log --oneline ca5f2e85..origin/lane/land-feature-length-defects` returns,
oldest first, `cfe56403`, `706adf3a`, `852354f5`, `a36ae76a` — matching what
§11, item 2 called the lane's one remaining blocker.

1. **The voice-bound derivation ran on the runner.** The candidate weight
   bound 1,500,000 was set on the branch (`cfe56403`; inside the admissible
   window 1,331,970 to 1,919,999 recorded in §11, item 2), the orchestrator
   dispatched `.github/workflows/calibrate-voice-bound.yml` by
   `workflow_dispatch` on `lane/land-feature-length-defects`, and run
   35542413222 (ubuntu-latest, AMD EPYC 7763 x4, node v24.20.0, default
   sweep, repeats 2, idle and loaded) completed in 2 minutes 15 seconds —
   the same sweep took about 11 minutes before the hoist. Every swept shape
   sits at 8% or less of the 15,000 ms half-budget under load (worst
   max-admitted N=50 at 1,210 ms; the pre-hoist table's same family read
   11,810 ms). The printed lock line was copied verbatim into
   `tests/fixtures/voice-bound-derivation.json` and re-indented by the tool
   (`706adf3a`); `machine.ci` reads `github-actions`, `runId` 35542413222.

2. **The distinct-cast bound follows the table**: `MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT`
   80 -> 100, set from the derivation test's own failure message. Stated
   honestly: 100 is the top of the swept grid, not the point where cost
   runs out — on the max-admitted shape cost now falls as the cast grows
   (1,210 ms at N=50 to 746 ms at N=100), so no sweep can bracket a cost
   ceiling any more. The test's "the sweep bracketed the boundary"
   assertion was re-anchored to split on the measurement: bracketing is
   still required whenever a swept cast above the derived one exists; when
   none does, the grid-limited case must be proved safe by the table itself
   (at least three swept casts, the derived cast at the top of the grid,
   cost non-increasing across the grid, every row at or under 25% of the
   ceiling). Both bounds are now picked for headroom and checked against
   cost, the reverse of rounds one to three.

3. **Five cue-parity tests re-anchored to the derived bounds** (`852354f5`):
   the realistic few-big shape's boundary is now cast 97/98 and the weight
   bound fires there; the document that sits exactly on the weight bound is
   the max-admitted shape at the cast bound (150 words x 100 speakers =
   1,500,000, +/-1 sensitive); uniform-min N=150 is rejected by the cast
   bound with its weight under the weight bound; N=250 violates both and
   still reports the weight bound (ordering preserved); the band loop runs
   101 to 223 and a new test proves N=224 crosses into the weight bound.
   Every pinned DoS payload still rejected, including bypass B at
   1,920,000. Headroom on the feature fixture: 3.4x.

4. **Result**: `origin/lane/land-feature-length-defects` at `a36ae76a` has
   zero failing tests among everything run — cue-parity 681/681,
   voice-bound-derivation 8/8, public-benchmark 33/33, blind pairs 4 of 6,
   calibration 21/21, `npm run gates` 0, lint, console, build, brain fresh,
   receipt gate clean on the lock range. The audit's runbook is reduced to
   four owner steps: fetch, `REAL_SCRIPT_CORPUS_DIR=<corpus> npm run
   measure-real`, manifest re-lock, `npm run lock-auc24` on v4, then the
   merge decision.

5. **One item recorded, not patched**:
   `VOICE_ELIGIBLE_WEIGHT_MEASURED_US_PER_UNIT = 0.173` is a 2026-09-05
   developer-box, pre-hoist rate; the runner measured the heaviest admitted
   shape at 0.807 µs/unit loaded (4.7x above it). The margin-proof clears
   on either number (8.3x under target at the worse rate), and re-fitting
   from a different shape's measurement is the drift the constant pair
   exists to prevent, so it needs one more runner sweep of that shape. Row
   69 and row 116 of the claims register were updated for the new bounds.

### 12.1 State of the branches

| branch | head | state |
|---|---|---|
| session branch | `3b05e696` | verified 14,601 / 0 at `6ca3fcd0` plus docs |
| `lane/land-feature-length-defects` | `a36ae76a` | green, awaiting the real-corpus run; raises the primary public floor |
| `lane/land-advice-rule-fixes` | `671b7cf2` | held; lowers it |

## 13. 2026-09-21 — what the candidate's numbers mean

This corrects the framing §11-§12 gave the 0.8750 figure: those passes
reported it as a green light — evidence in the feature-length branch's
favor, a blocker cleared, a candidate ready to merge once the owner's
real-corpus run confirms it — without saying what the number is made of or
whether it says anything about feature-length drafts at all. An
independent adversarial review of the candidate's scoring code (read-only,
both trees measured; `origin/lane/land-feature-length-defects` fetched and
verified at `a1d8dbdb`, `c41c9d4f`, `4a0ad86a`, matching this section's
brief) supplies both, and fixed three things it found along the way.

1. **The review's headline finding is not overfitting.** It checked the
   two obvious ways a benchmark move like this goes wrong and found
   neither: the pre-registered split is not gamed (holdout shuffle-drop
   matched-pair 0.4000 → 0.8000 on N=5, the friendlier half of the split),
   and `SUB_DENSITY_STEEPNESS` was not chosen to maximize AUC (`k=1` and
   the shipped `k=2` both read 0.8750; `k=2.6335` reads higher, 0.8906, so
   the shipped constant leaves measured separation on the table rather
   than chasing it). What it found instead is a composition and scope
   problem in what 0.8750 is being asked to prove.
   - **Composition.** Of the move from 0.5313 to 0.8750, 9 of the 13
     newly-ordered pairs are the twelve blind-pair fixtures (six premises
     x excellent/bad, all 10 scenes, 9 of the 12 pinned at health 76.0
     before) un-pinning as a bloc: 0.2500 → 1.0000 on that subgroup alone.
     On the 20 independent CC0 screenplays — the only scripts in the
     public benchmark not written in one sitting as a matched pair — the
     same statistic moves 0.7000 → 0.8000, a two-script change. The honest
     headline is the second number, not the blended 0.8750.
   - **Feature length.** On the 231-scene feature fixture, under the
     AUC-24 shuffle-drop recipe itself, the intact-vs-degraded gap is
     unchanged within seed noise: +15.30 on the baseline tree, +16.30 on
     the candidate at the manifest seed, ranging −0.60 to +1.00 across
     twelve seeds. Both intact and degraded health fall by roughly 10-11
     points — a rank-preserving level shift that a paired-AUC statistic
     cannot see by construction. Twenty ~135-scene stapled documents the
     reviewer built separately order 20 of 20 on both trees. The
     mechanism is a short-script phenomenon: one additional major finding
     costs 0.8135 health points on a 57-word fixture and 0.0143 points on
     the 19,293-word feature fixture — a 56.8x ratio that tracks the
     `wordCount^0.7` density normalization almost exactly.
   - **The 88.3 ceiling.** `140 / min(n, 12)` evaluates to 11.667 for
     every script of 12 or more scenes, so health is capped at 88.3 there
     regardless of quality — probed on a zero-issue document at 12, 60,
     231 and 400 scenes, all 88.3, against a baseline that climbs to
     88.3, 97.7, 99.4, 99.6. `excellent` (>= 90) is unreachable at feature
     length and `RECOMMEND` (>= 85) needs density plus deductions held to
     3.33 points combined, where the feature fixture alone carries 8.9 of
     density. This is now disclosed in four places on the branch
     (`4a0ad86a`); which of raise-thresholds, lower-the-saturation-floor,
     or accept-a-retired-top-grade to pick is the owner's decision, not
     one the review or this report makes.
   - **Blind pairs, four of six carry no weight.** All six pairs newly
     order or stay ordered, but four of the six gaps run only +0.1 to
     +1.9 on documents that were all tied at 76.0 before the fix.
   - **Attribution (leave-one-out).** The entire shuffle-drop move is the
     `SUB_DENSITY_STEEPNESS` change — without it the statistic reads
     0.5781. The saturation term contributes zero to it on this corpus by
     construction (it changes only the ceiling, not the ordering at 10
     scenes). The orphan-clue guard contributes +0.047 AUC and accounts
     for `room-12` moving from health 33.5 to 63.9 and `transfer-window`
     from 31.9 to 64.1 — correcting §8 and §10 above, which described
     `room-12` as falling to 0.0; that was a misreading of the first prep
     audit, not a measurement this report can stand behind.
2. **Fixed on the branch, `a1d8dbdb`.** The plain-language summary
   described the scene-count term as "adds N point(s) at M scene(s)" for
   a term that is a flat constant above 12 scenes — restated to state the
   floor honestly, with `summary-honesty.test.ts` now pinning both the
   under-12 and over-12 forms and their equality at exactly 12 and 231
   scenes. Output identity against `05faefcf`: 11 of 45 reports differ,
   every difference confined to `plainSummary`, no number moved; recorded
   in a standalone receipt entry.
3. **Guards strengthened, `c41c9d4f`.** The DoS margin proof now binds to
   the runner's measured worst-admitted rate (0.807 microseconds/unit,
   run 35542413222) rather than only the 2026-09-05 developer-box rate
   0.173 — 1,211 ms against the 10,000 ms target, 8.3x headroom. A
   corpus-wide property test was added for the location-word clue guard,
   alongside a `todo`-marked case that pins a known miss (a planted SAFE
   under `INT. SAFE HOUSE` is never picked up as a clue by that guard).
   The grid-limited derivation branch now checks every adjacent pair
   instead of only the endpoints, and the ellipsis test's title was
   corrected to match what it actually asserts.
4. **Disclosed in `scripts/lib/auc.ts`, `4a0ad86a`,** beside the six
   floor constants: the composition table above; the floor quantum
   (1/32 = 0.03125, larger than the 0.02 margin, so one pair flipping
   sign fails both primary floors — six of the twelve blind-pair gaps
   now sit under +1.5); that `SUB_DENSITY_STEEPNESS`'s admissible window
   was derived from the same 32 scripts the floors are measured on,
   holdout included, so the split is spent twice; and the voice-eligible
   weight-bound raise, labelled as a security decision needing its own
   sign-off separate from the merge decision (a 60-cast fully-eligible
   ensemble moves from 909,000, rejected, to 916,200, accepted). The
   `dimensionsSitAbove` plain-summary branch fires on 13 of 21 committed
   screenplays on both the baseline and candidate trees — the condition
   was already true on 13 scripts before this branch, which only changes
   which sentence that condition selects; this is recorded as the
   owner's design decision, not a regression introduced by the branch.
5. **State.** `origin/lane/land-feature-length-defects` sits at
   `4a0ad86a`, zero failing tests among everything run on this branch
   (cue-parity 681/681, public-benchmark 33/33, summary-honesty 10/10,
   `npm run gates` exit 0). The decision the owner faces is stated
   plainly by the review: the two halves are separable — a
   `scoring/feature-length-saturation-only` branch exists carrying just
   the saturation change. The steepness half carries the entire measured
   AUC move and the entire short-script sensitivity that produces it;
   the saturation half carries the 88.3 ceiling and has no measured
   benefit at feature length. A flat (non-regressing) `measure-real`
   result on the private corpus does not vindicate the saturation term —
   it only fails to indict it, since the saturation's own effect is
   invisible to a paired-AUC statistic by construction. The owner's four
   steps from §12 stand unchanged (fetch, `measure-real`, manifest
   re-lock, `lock-auc24` on recipe `v4`), with the threshold question
   from item 1 above added to them.

### 13.1 Branch heads

| branch | head | note |
|---|---|---|
| session branch | `c48ca439` (+ this commit) | this report |
| `lane/land-feature-length-defects` (candidate) | `4a0ad86a` | reviewed above; awaits the owner's decision |
| `lane/land-advice-rule-fixes` | `671b7cf2` | held, unchanged this pass |

## 14. 2026-09-21 — the saturation trade, measured

§13 disclosed the 88.3 health ceiling that `scarcityPenalty = 140 /
min(max(n, 1), 12)` puts on every script of 12 or more scenes, and left the
owner three unmeasured alternatives to the shipped `12`: raise the
saturation point, remove it, or keep it. A measurement-only lane
(`docs/audits/2026-09-20-feature-length-defects-prep/SATURATION_SWEEP.md`,
commit `798b495d` on `origin/lane/land-feature-length-defects`, verified
against this session's base `4a0ad86a` — `git log --oneline
4a0ad86a..origin/lane/land-feature-length-defects` shows exactly that one
commit) answers it. No file on the scoring path is touched: every number
comes from five scratch trees built outside the worktree by `git archive`
plus one changed line each (`SCARCITY_SATURATION_SCENES` set to 12
(shipped), 24, 60, 120, or removed to `Number.POSITIVE_INFINITY`, i.e. the
pre-branch `140/n`), run against the candidate's other changes unmodified.

### 14.1 What was measured

Seven measures per setting: the zero-issue ceiling by scene count; whether
`excellent` (>=90) and `RECOMMEND` are reachable for a clean 100-scene
feature at the repository's measured density penalty, 8.8965; the six
committed public-benchmark numbers; the blind-pair harness; the
`npm run test:metamorphic` `scene_dup_padding` and `stapled_shorts`
witnesses plus a direct duplicate-scene padding probe on `undertow`; the
231-scene feature fixture's intact health and its AUC-24 shuffle-drop gap;
`tests/core/calibration.test.ts`; and how many of 45 output-identity
fixtures move.

The table below keeps only the rows that move (health, one decimal place):

| measure | S12 (shipped) | S24 | S60 | S120 | NONE (`140/n`) |
|---|---|---|---|---|---|
| zero-issue ceiling, 300 scenes | 88.3 | 94.2 | 97.7 | 98.8 | 99.5 |
| clean 100-scene feature (density 8.8965) | 79.4 CONSIDER | 85.3 RECOMMEND | 88.8 RECOMMEND | 89.7 RECOMMEND | 89.7 RECOMMEND |
| `stapled_shorts` (best-part margin) | -1.6 PASS | +4.2 HARD FAIL | +7.7 HARD FAIL | +8.9 HARD FAIL | +9.0 HARD FAIL |
| `undertow` padded to 300 scenes | 57.9 | 63.8 | 67.3 | 68.4 | 69.1 |
| — padding gain over shipped | — | +5.9 | +9.4 | +10.5 | +11.2 |
| feature fixture (231 scenes) intact | 74.4 solid CONSIDER | 80.3 strong CONSIDER | 83.8 strong CONSIDER | 84.9 strong CONSIDER | 85.5 strong RECOMMEND |
| — its shuffle-drop gap | +16.30 | +16.30 | +16.30 | +16.30 | +16.60 |

Flat everywhere else: all three matched-pair AUCs (shuffle-drop 0.8750,
climax-relocate 0.5938, dialogue-flatten control 1.0000), blind pairs 4 of
6 (mean gap 0.3833), all 21 calibration bands, and all six committed
floors clear at every setting. Only the two secondary all-pairs statistics
move at all, and by less than the 1/32 = 0.03125 quantum one pair flip is
worth (shuffle-drop all-pairs 0.8291 at S12 vs 0.8306 at S24 and above;
climax-relocate all-pairs 0.5269 at S12 vs 0.5176 at S24 and above — S12
reads worse on one and better on the other).

### 14.2 The boundary

Three extra scratch trees, S13/S14/S15, place the boundary exactly.
`stapled_shorts` passes at 12 and 13 scenes (-1.6, -0.7 below its own best
part) and fails at 14 and 15 (+0.1, +0.7 above it); a zero-issue draft
reaches health 90.0 only once `min(n, S) >= 14` (`140/14 = 10`). The
witness passes iff `S <= 13`; the top grade is reachable iff `S >= 14`. No
value of this constant gives both.

### 14.3 What this means for the decision

The trade is one-dimensional: `140/min(n, S)` is read from two ends — the
health a long script cannot earn, and the health a padded script cannot
buy — so ceiling and padding resistance move in exact lockstep and every
other measured axis (public benchmark, blind pairs, calibration,
feature-scale separation) is flat and cannot arbitrate between settings.
And even with the saturation removed entirely, a clean 100-scene feature
carrying this repository's measured density penalty tops out at 89.7 —
this constant alone is not the lever that restores `excellent` at feature
length. The owner is choosing between padding resistance (the shipped
S12) and a reachable top grade; the honest middle paths lie outside this
constant — for instance raising the `excellent`/`RECOMMEND` thresholds'
relation to the floor, or a padding guard that is not a scene-count term.
That is stated plainly here, and nothing is recommended by adjective.

### 14.4 Branch heads

| branch | head | note |
|---|---|---|
| session branch | `75764fa6` (+ this commit) | this report |
| `lane/land-feature-length-defects` (candidate) | `798b495d` | saturation sweep; measurement only, no scoring-path change |
| `lane/land-advice-rule-fixes` | `671b7cf2` | held, unchanged this pass |

The owner's steps are unchanged from §13: fetch, `measure-real`, manifest
re-lock, `lock-auc24` on recipe `v4` — and now the saturation decision sits
alongside the merge decision, not ahead of it.


## 15. 2026-09-21 — the candidate was red in CI; what the full suite found, and what closed it

§12 called the candidate "green." That was true of every targeted suite the
lanes ran and false of CI: `.github/workflows/ci.yml` had failed on every
push of `lane/land-feature-length-defects` (runs 2711, 2716, 2718, 2719,
2721, 2722, 2724), and every lane's brief on the branch had excluded the
full `npm test`. Nobody looked at the branch's CI until 2026-09-21.

### 15.1 Reproduction

An orchestrator-run full suite at `798b495d` (the candidate's tip when §14
was written): 14,646 tests, 14,525 pass, 17 failing subtests in 9 describes
across 8 files, 98 skipped, 6 todo, 418.8 s; plus the CI `browser` job's
`verify:p0-flow` smoke ("report did not render health ~78"). None of the 8
files had been edited by the candidate:

| file | failing subtests |
|---|---|
| `tests/core/coverage-next-fix-jump-honesty.test.ts` | 3 |
| `tests/core/p0-sample-drift.test.ts` | 1 |
| `tests/core/priority-selection-one-list.test.ts` | 1 |
| `tests/core/sample-coverage-facts.test.ts` | 2 |
| `tests/core/unapplied-deduction-honesty.test.ts` | 1 |
| `tests/routes/root-cause-parity.test.ts` | 1 + 3 (two describes) |
| `tests/scripts/report-unverified-gates.test.ts` | 1 |
| `tests/scripts/verify-report.test.ts` | 4 |

### 15.2 Causes, three categories

**Moved pins.** The built-in sample (`src/lib/sample-script.ts`) scores
78.3 on the session branch and 81.8 on the candidate, so the smoke's EXPECT
(78 -> 82), the committed P0 sample report and `src/lib/sample-coverage-facts.ts`
(regenerated with `npm run generate-p0-sample`, counts 2·32·139 ->
2·32·138, contentHash unchanged), and `SCENE_SPAN_DRIFT_MEASUREMENT` in
`server/lib/root-cause-pipeline.ts` (899 -> 946 located issues, health
84.4 -> 74.4, findings with/without spans 70/69 -> 73/73; bisected commit
by commit to `e5e2b534`, the ORPHAN_CLUE guard — the formula commits move
only health) all moved. The four `tests/fixtures/verify-report/` byte-copy
fixtures no longer reproduced (pre-tier health 65.0 -> 62.8; known-limit
health 76.3 -> 77.7, total issues 178 -> 129); only those compared numeric
fields were patched, nothing re-rendered, logged in that directory's
README.

**Hard-coded value.** `report-unverified-gates.test.ts` asserted the
literal `PUBLIC_SHUFFLE_DROP_FLOOR = 0.5386`, which the branch re-locked to
0.8091; it now reads every untouched floor from `scripts/lib/auc.ts`.

**Test shortcuts exposed by the new numbers.** `priority-selection-one-list`
escaped only `&` where the renderer also escapes `'`. `unapplied-deduction-honesty`
compared values where graphDeduction 12 == sceneCount 12 collided; it now
runs a provenance check through `CLAIM_ROW_SPECS`.

**Premise moved.** The feature fixture's top priority went from
`NO_REVERSALS_LONG_STORY` at "Conflict layer" (document tier) to
`REVELATION_WITHOUT_SETUP` at Scene 15 (line-anchored, lines 201–216), so
adversarial finding #5's fixture-driven reproduction in
`coverage-next-fix-jump-honesty.test.ts` and the `P2-featurelen` phase of
`scripts/verify-p2-p3-surfaces.mjs` had nothing to reproduce.

### 15.3 The reversion probe

`root-cause-parity.test.ts`'s reversion probe asserted the with/without-spans
lists differ in COUNT; they now tie at 73/73 by composition (65 ids shared,
8 only with spans, 8 different ones only without). The probe now asserts
that set difference instead, different scene sets on 27 of 65 shared ids,
different signatures, and a different order at 24 of 73 positions, and
keeps the range and "demonstrably worse" narrowing assertions; the drift
block pins the 8. Fail-first was proven for it, for the floor check and for
the provenance check.

### 15.4 Finding #5, reproduced again on a builder-made variant

Not a hand edit: `scripts/build-feature-length-fixture.mjs` gained
`--order=lexicographic|reverse|seed:<n>` and `--variant=doc-tier`
(= `seed:6`, a mulberry32-seeded Fisher–Yates over the twenty CC0 bodies).
12 variants were searched (reverse, seeds 1–11): seeds 6, 8 and 9 give a
document-tier top priority with a first-root-cause envelope over 80 %
(95.1 / 93.3 / 93.7 %), seed 3 is document-tier at 21.9 %, the other 8 are
line-anchored. `tests/fixtures/feature-length/assembled-feature-doc-tier.fountain`
(114,279 B, 231 scenes) is committed; only the finding-#5 describe and the
P2-featurelen finding-#5 assertions point at it. The default build is
byte-identical to the primary fixture and `tests/core/feature-length-fixture.test.ts`
now asserts both. `verify:surfaces` 250/250.

### 15.5 What did not move

No scoring-path file was touched (`node scripts/check-scoring-receipt.mjs
6ca3fcd0..HEAD` OK, same five files, no receipt added); `npm run lint` 0;
`check-no-console` 0; brain fresh; claims-register line anchors updated for
`priority-selection-one-list.test.ts`.

### 15.6 Commits and independent verification

Commits on the candidate, oldest first:

| SHA | commit |
|---|---|
| `0fc52f4f` | fix(p0-sample): regenerate the committed sample at the candidate's score — 78.3 -> 81.8, and every live pin follows |
| `9c303488` | test(gates): the one-constant rewrite check reads the untouched floors from auc.ts, not from a literal |
| `31805c0f` | test(root-cause): re-measure the scene-span drift table on the candidate, and the reversion probe asserts what still differs |
| `eee69501` | test(verify-report): patch the compared numeric fields in the four byte-copy fixtures for the candidate's scoring — nothing re-rendered |
| `a2db9f65` | test(core): two assertions that failed on the test's own shortcut, not on the property — HTML escaping and a value collision |
| `8e328131` | fix(verify:surfaces): two battery steps that read a proxy — rounded health, and a hard-coded priority index |
| `2e6b8f9c` | docs(audit): § 2026-09-21 — CI was red: what the full suite found, and what changed |
| `ea27b3cc` | test(feature-length): a builder-made doc-tier variant reproduces finding #5 the primary order no longer produces |

Orchestrator-run independent full suites: at `2e6b8f9c`, 14,646 tests /
14,539 pass / 3 fail (the finding-#5 describe) / 98 skipped, 420.0 s,
matching the lane's own count; at `ea27b3cc`, 14,653 tests / 14,549 pass /
0 fail / 98 skipped / 6 todo, 409.8 s. Both fixtures were rebuilt by the
orchestrator at `ea27b3cc` with `git diff --exit-code` clean.
`origin/lane/land-feature-length-defects` is at `ea27b3cc`; CI on it had
not completed when this section was written — that is stated, not
predicted.

The lane's own record is `docs/audits/2026-09-20-feature-length-defects-prep/README.md`
§ "2026-09-21 — CI was red: what the full suite found, and what changed"
(E1–E4) on the candidate.

### 15.7 Branch heads

| branch | head | note |
|---|---|---|
| session branch | `c9df0b26` (+ this commit) | this report |
| `lane/land-feature-length-defects` (candidate) | `ea27b3cc` | CI-green locally on an independent full suite, awaiting CI on origin |
| `lane/land-advice-rule-fixes` | `671b7cf2` | held, unchanged |

The owner's steps are unchanged from §13/§14: fetch, `measure-real`,
manifest re-lock, `lock-auc24` on recipe `v4`, then the saturation decision
and the merge decision together.
