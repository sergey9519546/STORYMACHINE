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
