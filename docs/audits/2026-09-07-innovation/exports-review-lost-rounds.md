# Exports lane — the two lost review rounds (reconstructed)

*The exports lane's first build (80824d48 on 9b199b72, then 0ad69536) was
reviewed twice — REVISE with eight items, then MERGE with four follow-ups —
and then lost in the 2026-09-07 sandbox rebuild before the rebase and merge:
the commits were never pushed and the worktree no longer exists, so neither
object is reachable. The lane was rebuilt from these two verdicts on
`lane/exports-producer-tier` (see `exports-review.md` for the review of the
rebuilt object). What follows is each round's final message from the same
Opus reviewer, verbatim from the session transcript.*

## Round 1 — object 80824d48 (verbatim)

## Verdict: REVISE

Read-only held: `git status --porcelain` empty in both `/home/user/STORYMACHINE` and the lane worktree. All work ran from a `git archive 80824d48` export (plus a `9b199b72` baseline and a mutated copy) under `<session scratch>/exports-review/`. No server of mine survives.

**What reproduced.** Every gate at the number reported: lint/no-console/docs/honesty/brain 0, `check-scoring-receipt 9b199b72..80824d48` → "no scoring-path files changed", build 0, `verify:surfaces` **195/195**, output-identity **45/45 byte-identical** (no `--ignore-keys`), public-benchmark **28/28**, and all seven touched suites at exactly 56/22/37/51/47/3/21.

**Parity is real and the test bites harder than claimed.** `root-cause-pipeline.ts:71-81` is the panel's four statements verbatim; **8** call sites migrated (not 2); no hand-assembly left in production. Fixed tree 7/7; with **one** site reverted 4 pass/3 fail; with both, 3/4 exactly as reported. Driving all three routes on the 141-scene fixture from one hash: identical scene ranges, cluster counts, priority order, top-three text.

**Also verified independently:** page mapping (0 unresolved, monotonic, 139/141 confirmed by a strict-equality recompute, the 2 differences being the >60-char wrapped headings the prefix rule correctly resolves); the report page number equals the number printed on the PDF page (`pdf.ts:117` uses the same paginator, title page is the unnumbered `pageNumber: 0` sentinel); 240 page refs; reference bounds 20 samples / 9–10 scenes / 256–337 words reproduced exactly; the tier fits one printed page (measured in Chromium print media: 422–502px against ~960px); all six register rows quote the shipped bytes; all four Labs-gate citations open to the lines claimed.

**One number the report understates in its own favour:** the logline gate costs **1 in 33**, not a general reduction — across all 32 distributable scripts plus the assembly, 33/33 derived before, 32/33 after, and the only loss is the assembly (8.6% vs a clean gap to 28.8%).

**Why REVISE (8 items, all with file:line and a reproduction):**

1. The stage-direction-as-"the turn" defect **still ships** — `runoff.fountain` renders `GUS must face the turn "The inspector nods, packs the binder, and leaves"`, the exact string finding #7 quotes; `runoff.fountain:146` is action. Only the highest-suspense *fallback* was removed.
2. The coverage HTML prints the logline, the length and the verdict **twice within eleven lines** on the producer's first page (header vs tier).
3. "Three things to fix first" renders **one** item on the inert draft, in both artifacts — a §2 copy violation.
4. `percentileIsComparable` is asymmetric (missing `wordCount` ≠ disqualifying, missing `sceneCount` is), so `runoff` (9 sc / 1,448 w) reads "top 30%" in Versions and "not comparable" everywhere else.
5. `coverage-letter.ts:303` is still a hand-written percentile sentence stating an **ordinal** where the tier states a **band** — both now in the same letter.
6. Item 3's STOP is right for `plainSummary` (verified: all four consumers interpolate it opaquely) but too wide for `strengths`, which is a list the renderer chooses to show; and the caveat never names the "What's Working" block sitting eleven lines below it. I also spelled out what the scoring-branch commit must satisfy.
7. The 342-char, 36-number parenthetical is redundant with the span stated twice in the same line.
8. Three factual errors: "21 CC0 shorts" (it is 20, in shipped source and register row 80), a wrong test path in `root-cause-pipeline.ts:34`, and the report's `34 → 56` logline count (baseline is 40).

The three inverted/resized expectations all **ACCEPT** — the old ones were wrong or unreachable — and the re-captured byte-identity fixture is honestly reframed; I confirmed mechanically that its diff contains only the three declared changes.

## Round 2 — object 0ad69536 (verbatim)

## Verdict: MERGE (`0ad69536`)

Read-only held (both trees `git status --porcelain` empty); all work from a `git archive 0ad69536` export plus a mutated copy; no servers left running. Checked in the failure direction first, as asked.

**All eight round-1 items hold under adversarial probing.**

- **R1** — driven across all 32 distributable scripts + the assembly with round-1's and round-2's builders over identical reports: `runoff` drops the turn clause (`GUS is the most-present speaker across 9 scenes`), `off-season` keeps its genuinely spoken turn unchanged, and **32/33 derive a logline before and after** — the gate costs *no* additional coverage. Pushed on `isSpokenInScript`: the substring hole is narrower than it looks (case-sensitive `includes` rejects `'He leaves'` against `"Well, he leaves."`), `lyrics` is a real parse type, and the header's scope claim ("what the engine can *check*") does not overclaim. One contrived hole found: the search is whole-script, so an action turn is vouched for if the identical sentence is spoken elsewhere — constructed, confirmed, non-blocking.
- **R2** — header is identification only; `class="logline-line"` occurs 0 times; logline and word count render once above the divider; remaining repeats are all below it (appendix restating its own header). 783,024 B measured. The excerpt note moved rather than vanished.
- **R3** — `THE ONE THING TO FIX FIRST` on both one-priority drafts, both artifacts; empty case makes no numeric promise.
- **R4** — symmetry table reproduced. **Backward compatibility specifically checked**: a legacy snapshot with no `wordCount` validates (`optional()`), maps to `null`, and reads "not comparable" — fail-safe, not a crash or a stale band; malformed values are rejected. Scope verified rather than assumed: `SlateEntry` already carries a required `wordCount`, so Slate keeps every true reading; only What-If narrows, as declared.
- **R5** — driven on an in-range sample (10 sc / 314 w / pct 78) so the branch is actually exercised: one wording twice, no health ordinal.
- **R6** — retitle + caption below the decline line with all entries preserved and nothing filtered; the caveat names the section by its actual title; above the line the golden's diff contains **no strengths line at all** (mechanical proof, `&rsquo;` intact). `plainSummary` correctly stays stopped.
- **R7** — 342 → 215 chars; `formatSceneList` probed at the boundaries (`[0]`→`Scene 1`, `[0,1]` spelled out, `[2,8,39]` not collapsed, order/dup-insensitive, `[]`→`''` with both call sites guarding). **Re-ran the mutation to confirm the parity test did not go soft: 4 pass / 3 fail on the `export.ts` revert.**
- **R8** — two of three fixed; **one straggler**: `logline.ts:436` still says "21 shorts".

**Gates reproduced**: receipt "no scoring-path files changed"; output identity **45/45 byte-identical** vs `9b199b72`, no `--ignore-keys`; lint / no-console / docs / honesty / brain all 0 (310 links); every touched suite at exactly the reported count (**60 / 34 / 40 / 56 / 47 / 7**, plus snapshot-trend 63); public-benchmark **28/28**. One-page fit re-measured at 582–669px on four drafts, better than round 1. I skipped `verify:surfaces` per budget but checked the direction that would break it.

**Four non-blocking follow-ups**, the first of which is my own round-1 miss surfacing: `docs/user-validation/sample-coverage-report.html` is stale (no reader tier, no divider, no comps, no percentile line, still carries the removed `logline-line`) while the generator comment this lane edited claims byte-identity with a real export — one command to regenerate, and worth a guard; then the `21`→`20` straggler, a now-dead `.logline-line` CSS rule, and scoping `isSpokenInScript` to the climax scene's span.
