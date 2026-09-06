# Independent review — docs/cross-surface-parity lane (LANE_STANDARD §6)

**Worktree:** `/home/user/STORYMACHINE/.claude/worktrees/agent-aa9d577b7bcc17226`
**Branch:** `worktree-agent-aa9d577b7bcc17226` — `93c9b7cd`, `635784c0` on `main` @ `802f1c16`
**Reviewer posture:** read-only. Nothing edited, committed or pushed in the worktree or main;
final `git status --porcelain` in the worktree is empty. Two probe servers I booted (ports 3187,
3191) are killed; the only `server.ts` left running belongs to another lane
(`agent-ab4e991ad36c58183`, PORT 5199) and I left it alone. Mutation probes ran in a scratch copy
built with `git archive HEAD | tar -x` outside the repo.

**What the change IS (my own reading, not the report's).** `server/lib/coverage-html.ts`'s
`buildDraftRankLine` predates `src/lib/draft-rank-copy.ts` and was the one draft-rank renderer never
migrated onto it, so the exported HTML said "your own saved drafts of this script" / "your next
save" while the panel and the letter had moved to "runs and saved drafts of this script" / "your
next run or save"; its parameter type was also narrower than the wire schema
(`DraftRankSchema` has accepted `tied`/`unscored` since they were added), so a dead heat read as
clean separation and unranked drafts were dropped entirely on that surface. The lane migrated it,
widened the route's cast, pinned the result with a new cross-surface test, corrected five docs
claims, and then routed the fifth surface (SnapshotManager's per-snapshot badge) through a new
scope-aware `draftRankDenominatorLabel('saved')`. The premise in the brief is correct as written.

---

## 1. Brief item vs diff

| # | Item | State | Evidence |
|---|---|---|---|
| 1 | Migrate `coverage-html.ts` to the shared helpers; regenerate expectations; extend the surface scan; prove panel = letter = HTML for ranked/tied/unscored/first-draft | **DONE** | `server/lib/coverage-html.ts:37-49` (import), `:145-166` (`buildDraftRankLine`), `:977-986` (`CoverageHtmlOptions.draftRank` widened to `DraftRankExportPayload`), `server/routes/export.ts:324-332`; `tests/core/coverage-html.test.ts:645-679` (4 states); `tests/core/percentile-copy-consistency.test.ts:239-297` (surface scan incl. draft-rank); new `tests/core/draft-rank-copy-consistency.test.ts` (13 tests) |
| 2 | `CLAIMS_REGISTER.md` rows 32–35 / 50–51 updated verbatim, evidence pointers real, new rows for new sentences, audit clean | **DONE** | rows 32–35 `docs/CLAIMS_REGISTER.md:82-85`, rows 50–52 `:100-102`, new rows 56–57 `:105-106`. I resolved all nine cited test names — every one exists (`coverage-letter.test.ts:367` for row 34's new pointer included). `node scripts/honesty-audit.mjs` → "claims register (57 rows) — clean", exit 0 |
| 3 | Correct "four rounds" → five and "15 review rounds" → 17 with a dated recount parenthetical | **DONE (facts verified), style NARROWED** | `docs/PATH_TO_EXCELLENCE.md:80-83`, `:97-102`. I recounted independently: top-level `# ` headers per review file = readiness 3, timing 2, fixverify 2, xsurface 2, rank 3, guard 5 → **17**; `guard-review.md`'s five verdicts are REVISE/REVISE/REVISE/REVISE/**MERGE**, exactly as the parenthetical claims; the "prose sums to 16" aside also checks out (3+2+2+3+2+4). Style: the file's existing correction idiom is an italic `*(Correction, independent audit, <date>: …)*` (see `:187-192`); these two are plain inline parentheticals, and lines 82/83/96 run to 84/93/99 cols against the file's 76-col wrap |
| 4 | Reconcile the warm-up range to **one sentence** stating both conditions at **all** sites | **NARROWED — and reported as DONE** | 10 sites edited (README ×3, Dockerfile ×2, docker-compose ×2, `server.ts`, `server/routes/config.ts`, `.env.example`). **Six sites still carry a bare, single, unexplained range** — see finding R1 below. The edited sites also use four different phrasings, not one sentence |
| 5 | Review-batch README: state plainly that the intermediate round SHAs are unreachable, that only the six merge SHAs are durable, and list them per lane | **DONE, with one over-claim** | `docs/audits/2026-09-05-review-batch/README.md:22-59`. I verified live: `cc68cf7d`, `91b8dc73`, `a0667ab3` all `git cat-file -e` OK and `git branch --all --contains` empty, absent from `git log --all`; `0da8fb05` is on `main` and is a patch-id-identical, same-author-timestamp, same-message twin of `cc68cf7d` (patch-id `3574860b…` both) — every specific claim in the paragraph is true. The blanket "none is reachable" is not: see R2 |
| 6 | `.env.example`: add `VERIFY_MAX_LOAD_PER_CPU` and `COLLAB_MAX_FRAME_BYTES` with code defaults | **DONE** | `.env.example:113-116` (2097152 / bounds 1024–100 MiB / close 1009 — matches `server/collab/yjs-server.ts:43`, `:299`); `:238-246` (exit 3, no boot or Chromium launch, unset = never refuses — matches `scripts/lib/browser-verify.mjs:112-120`). The `VERIFY_MAX_LOAD_PER_CPU` block correctly says it is read only by the verify tooling, never the server |
| F-i | `verify-p2-p3-surfaces.mjs` draft-rank assertions derived from the shared helpers | **DONE** | `scripts/verify-p2-p3-surfaces.mjs:58-69` (imports + `savedScopeDraftRankNoun`), `:697-704` (regexes built with `reEscape(draftRankDenominatorLabel())` / `…NextOpportunityLabel()`), `:1111-1119` and `:1674-1677` (badge assertions derived). `reEscape` is declared once in `main()` and both uses are inside that scope; plain `node` v22.22 imports the `.ts` helper with no flag (checked) |
| F-ii | SnapshotManager badge through `draftRankDenominatorLabel('saved')` | **DONE** | `src/lib/draft-rank-copy.ts:56-77` (scope type + labeller), `src/components/scriptide/SnapshotManager.tsx:10`, `:193-200`; register row 52 updated; `percentile-copy-consistency.test.ts:280-296` and the `'saved'`-scope block in `draft-rank-copy-consistency.test.ts` pin it |

**Silently changed, not in the report:** `buildDraftRankLine` dropped `formatNumber(draftRank.of)`
for a bare `${of}` (`coverage-html.ts:160`). That is *correct* for panel parity (the panel also
interpolates raw), but it is a behaviour change nobody wrote down, and it leaves the letter
(`coverage-letter.ts:285`, still `formatNumber(of)`) as the one surface that would print "1,024"
where the other two print "1024".

---

## 2. Driven, and one number reproduced

Booted the keyless server from this worktree via `bootKeylessServer` (`scripts/lib/browser-verify.mjs`),
port 3191, `[review] load 0.3/4 cpus → timeout scale 1.0x`, then POSTed the real sample script to
`/api/export/coverage` and `/api/export/coverage-letter` for four `draftRank` states and stripped
the rendered `.health-percentile` line. All eight requests HTTP 200.

```
ranked          PANEL/HTML  Rank among your drafts: 2nd of 5 runs and saved drafts of this script (by health)            IDENTICAL
TIED            PANEL/HTML  Rank among your drafts: tied 1st of 6 runs and saved drafts of this script (by health)       IDENTICAL
mixed-unscored  PANEL/HTML  Rank among your drafts: 2nd of 5 runs and saved drafts of this script (by health) — 3 of 8
                            runs and saved drafts of this script are unranked (saved without a fresh diagnosis)          IDENTICAL
first-draft     PANEL/HTML  First saved draft — rank among your drafts appears after your next run or save               IDENTICAL
```

Letter, same inputs, same fragments in its longer prose: "Among your own runs and saved drafts of
this script, this one **ranks** 2nd of 5 …" / "**ties for** 1st of 6 …" / "… 3 of 8 runs and saved
drafts of this script are unranked (saved without a fresh diagnosis)." / "This is your first saved
draft of this script — a rank among your own drafts will appear after your next run or save."
Versions badge, from the same helper at `'saved'` scope: "Ranks 2nd of 5 by health among your saved
drafts of this script" / "Only saved draft with a health score so far".

**The report's before/after table reproduces exactly, including the two sentences that previously
could not reach this surface at all — the tied line and the unranked-drafts note are in the exported
HTML.** I drove this at the route, not in Chromium: the badge is verified by the committed
source-text assertions plus the now-derived `verify:surfaces` gate, not by a browser render (the
orchestrator's battery covers that, and a targeted Chromium flow was outside this review's budget).

Named test files, run from the worktree:

```
tests/core/draft-rank-copy-consistency.test.ts   # tests 13  # pass 13  # fail 0
tests/core/coverage-html.test.ts                 # tests 44  # pass 44  # fail 0
tests/core/percentile-copy-consistency.test.ts   # tests 28  # pass 28  # fail 0
node scripts/honesty-audit.mjs                   57 rows — clean, exit 0
node scripts/check-scoring-receipt.mjs main..HEAD  no scoring-path files changed, exit 0
```

(The report says 9/9 and 26/26 for the first and third — those counts are from before `635784c0`
and were not refreshed. Both files are larger and green now.)

Warm-up figure, reproduced from a boot of this worktree: `GET /health` →
`doctorPool: { warm: true, ms: 2234, timedOut: false }` — 2.234 s on an idle box, inside the
"~2.1–2.7 s idle" half of the reconciled sentence.

---

## 3. Shortcut hunt

**Can the consistency test fail if the HTML drifts? Yes — proven, not argued.** In a scratch copy I
rewrote `coverage-html.ts:160` back to the old shape
(`… ${ordinal(rank)} of ${of} (by health, ${draftRankDenominatorLabel()})`) and re-ran the new test:
**3 of 13 failed** (ranked, tied, ranked+unscored). The assertion is `html.includes(expectedPanelLine(…))`
where the expectation is composed only from the shared helpers, so a helper edit moves both sides
(intended) but a structural edit in either renderer fails.

**Is `draftRankDenominatorLabel('saved')` really a suffix of the union label?**
`'runs and saved drafts of this script'.endsWith('saved drafts of this script')` — yes, but it is
two independent string literals in one ternary (`draft-rank-copy.ts:75`), not one composed from the
other. The invariant is test-pinned rather than structural: I broke the union literal to
`'runs and drafts of this script'` in the scratch copy and the suffix test failed (1/13), so drift
is caught. Composing the union as `` `runs and ${SAVED}` `` would make it impossible instead of
merely detected — see §4.

**Any literal draft-rank or percentile copy left outside the two shared modules?** No. Grepping all
of `src/` and `server/` for `saved drafts of this script` / `runs and saved drafts` / `your next
save` / `your next run or save` / `among your drafts` returns only *comments* plus the two renderers
that interpolate the helpers (`ScriptDoctorPanel.tsx:383-384`, `coverage-html.ts:159-160`) and the
letter (`coverage-letter.ts:265-287`). Same for `scripts/*.mjs`: the only remaining occurrences are
comments and `record()` labels; the assertions themselves are derived.

**Register rows verbatim?** Rows 32, 33, 35, 50, 51, 52, 56 match the rendered strings character for
character against my drive output. Two hairs: row 34 writes `writer's work` with an ASCII
apostrophe while the letter renders U+2019 (`writer’s work`) — verified byte-wise with `od -c`; and
row 57 registers only the plural "… **are** unranked", while `unrankedDraftsNote` renders "**is**
unranked" for `unscored === 1`. Both are pre-existing-in-kind and non-blocking.

**Can the derived `verify:surfaces` regex still fail?** Yes for a wording change (it is
`new RegExp` over escaped helper output, so a change to the *shape* around the helper — the "(by
health)" tail, the "tied " prefix, the ordinal/`of` order — breaks it), and it now tracks the helper
instead of freezing a literal, which is the point of the follow-up. The check remains an OR
(`ranked || first-draft`), so in a run where the exported state happens to be a first draft the
ranked branch is never exercised — unchanged from before, but the gate is weaker than it reads.

**One theoretical parity gap, checked and dismissed.** `coverage-html.ts` gates the unranked note on
`of > 1`; `ScriptDoctorPanel.tsx:391` gates it only on `rank !== null`. So for the wire-legal payload
`{rank:1, of:1, unscored:3}` the panel formula appends the note and the HTML does not. That state is
unreachable from the real producer — I ran `computeDraftRank([3 unscored snapshots], [], 80)` and got
`{"rank":null,"of":0,"unscored":3}`, which `draftRankExportPayload` drops — so no writer can hit it.
It only means the test file's "every DraftRank state this schema can carry" is a slightly wider
claim than what is actually pinned.

---

## 4. What a stronger version would have done

Item 4 was the one place the lane chose breadth of *edits* over the brief's actual goal. The brief
asked for one sentence so that "a reader never meets two unexplained ranges" — the strongest version
would have written that sentence once, in the file that owns the measurement
(`server/nvm/analyze/doctor-pool.ts`, whose own header is what every other site defers to), made
every other site a short reference to it, and then swept `grep -rn '2\.1-\(2\.7\|3\.9\)'` to zero
before declaring the item done; instead the two contradicting ranges now sit 43 lines apart inside
that very file while ten downstream copies each paraphrase the reconciliation differently. The same
"make it impossible, don't just detect it" instinct applies one level down in `draft-rank-copy.ts`:
composing the union label from the saved one (`` `runs and ${SAVED}` ``) would retire the suffix test
as a *guard* and leave it as documentation, matching what the module's own header preaches about one
implementation per concept. Both are small, in scope, and would have cost less than the prose already
written about them.

---

## 5. Verdict — **REVISE** (2 items, both comment/prose-only)

1. **`server/nvm/analyze/doctor-pool.ts:481` ("~2.1-2.7s") and `:524` ("~2.1-3.9s")** — the exact
   defect item 4 exists to remove, unreconciled, in one file, and it is the file the reconciled sites
   point readers at. Also still bare and mutually contradictory:
   `tests/routes/ready.test.ts:3` ("~2.1-3.9s") against `tests/core/doctor-pool-warm-state.test.ts:3`
   and `tests/core/server-prewarm-before-listen.test.ts:3` ("~2.1-2.7s"). None of these is
   scoring-path — `doctor.ts` does not import `doctor-pool.ts` (the classifier's tier 2 is
   reachability *from* `doctor.ts`), and I confirmed `check-scoring-receipt` is green on a tree that
   already edits `server.ts` and `server/routes/config.ts`. Reconcile all five to the same sentence,
   and while there: `Dockerfile:83-85` and `server.ts:236-237` read "needs a measured ~2.1-2.7s
   (idle) to up to ~3.9s (under load) to finish…" — "to up to" is a stumble, and
   `server/routes/config.ts:154` is now a 118-column line in a 76-column comment block. Pick one
   wording and use it verbatim everywhere. *(`docs/PATH_TO_EXCELLENCE.md:189`'s "~2.1–2.7 s" sits
   inside a dated historical `*(Correction …)*` entry — leave it; that file annotates, it does not
   rewrite.)*
2. **`docs/audits/2026-09-05-review-batch/README.md:31-36`** — "none is reachable from any branch or
   ref" over-claims. Three SHAs that appear in round headers *are* durable and reachable:
   `5dffc831` and `3d13383c` (`rank-review.md:328`) and `5d2b2638` (`guard-review.md:836`). A
   re-verifier following the paragraph's own advice would run `git show 5dffc831`, get a commit, and
   distrust the rest of the note. Scope the sentence to the pre-rebase round SHAs and say that a
   lane's final round may cite the durable merge SHA itself.

Non-blocking, record only, no re-review needed: the dropped `formatNumber` in
`coverage-html.ts:160` (say so in the report, or route both surfaces through one formatter); the
report's stale 9/9 and 26/26 test counts; row 34's ASCII apostrophe vs the rendered U+2019 and row
57's plural-only phrasing; the recount parentheticals' formatting/wrap divergence from
`PATH_TO_EXCELLENCE.md`'s italic `*(Correction …)*` idiom.

Item 1 — the actual HIGH finding — is done properly: five surfaces, one implementation, driven and
byte-identical on a live server for all four states, with a test I proved can fail. The two items
above are prose fixes; re-review of them is a grep and a diff read.

---

# Re-review — `c3a204d2` (2026-09-05)

Read-only, budget-limited: diff reading, three test files, `tsc --noEmit`, two gate scripts, a
normalized grep, five `git merge-base --is-ancestor` checks, one mutation probe in a throwaway
`git archive` copy. No server booted this round; worktree `git status --porcelain` empty; scratch
copies deleted. `node scripts/check-scoring-receipt.mjs main..HEAD` → **no scoring-path files
changed, exit 0**, even though `server/nvm/analyze/doctor-pool.ts` is now edited — confirming the
reachability argument I made in R1 (`doctor.ts` does not import it).

## My R1 item 1 — warm-up sentence: **CLOSED**

The figure is now *defined* in `warmDoctorPool()`'s doc comment
(`server/nvm/analyze/doctor-pool.ts:452-461`, "THE CANONICAL WARM-UP FIGURE") and quoted elsewhere.
I did not take the claim on trust — I normalized every candidate file (strip repeated comment
prefixes, join lines, collapse whitespace) and counted exact occurrences of
`~2.1–2.7 s on an idle box, up to ~3.9 s under load (measured 2026-09-04/05)`:

```
3 server/nvm/analyze/doctor-pool.ts   1 server/routes/config.ts   1 server.ts
3 README.md   2 Dockerfile   2 docker-compose.yml   1 .env.example
1 tests/core/server-prewarm-before-listen.test.ts
1 tests/core/doctor-pool-warm-state.test.ts   1 tests/routes/ready.test.ts
TOTAL 16 exact occurrences across 10 files — zero paraphrases
```

Both files I flagged are fixed at the sites I named: `doctor-pool.ts:493-497` (was "~2.1-2.7s") and
`:539-541` (was "~2.1-3.9s") now quote the canonical sentence and point at its definition; the three
test headers (`ready.test.ts`, `doctor-pool-warm-state.test.ts`, `server-prewarm-before-listen.test.ts`)
all agree. The only surviving bare ranges are `doctor-pool.ts:453`, which quotes `"~2.1-2.7s"` and
`"~2.1-3.9s"` inside the note *explaining* the old drift (correct, it is naming the defect), and
`docs/PATH_TO_EXCELLENCE.md:189`, which I explicitly excluded as a dated historical correction. The
"to up to" stumbles in `Dockerfile` and `server.ts` are gone, and `config.ts:154-163` is rewrapped
(no line in that block now exceeds 80 columns). Cosmetic only: two wrapped lines run slightly long
(`Dockerfile:87`, `docker-compose.yml:147`). My count is 13 citing sites outside the defining file,
where the report says "12 other sites" — a counting difference, not a correctness one.

## My R1 item 2 — the reachability over-claim: **CLOSED, and better than I asked for**

`docs/audits/2026-09-05-review-batch/README.md:22-68` now says plainly that the first version was
wrong, splits the citations into 21 unreachable and 3 reachable, names the verification commands,
and explains *why* the rank lane is the exception (its rebase carried the round commits forward) and
why `5d2b2638` is a merge SHA rather than a squashed predecessor. Spot-checked with the exact
command:

```
git merge-base --is-ancestor a0667ab3 802f1c16   → not an ancestor  (as claimed)
git merge-base --is-ancestor cc68cf7d 802f1c16   → not an ancestor  (as claimed)
git merge-base --is-ancestor 91b8dc73 802f1c16   → not an ancestor  (as claimed)
git merge-base --is-ancestor 5dffc831 58eaafbf   → YES              (as claimed)
git merge-base --is-ancestor 3d13383c 58eaafbf   → YES              (as claimed)
git merge-base --is-ancestor 5d2b2638 802f1c16   → YES              (as claimed)
```

The 21-count matches my own independent enumeration of every backticked 8-hex SHA in the six files
(21 with zero containing refs, 9 reachable of which exactly 3 are round-header citations), and the
per-lane attribution spot-checks out (the three fixverify SHAs appear in `fixverify-review.md`, the
five xsurface SHAs in `xsurface-review.md`). The `cc68cf7d` ≡ `0da8fb05` twin note survived intact.
One leftover: the closing paragraph (`:87-88`) still says the batch's intermediate rounds are
"traceable only through the prose … not through `git show`", which the corrected section above it
now contradicts for the rank lane's two. Not worth another round — noting it for whoever edits that
file next.

## B-12 (folded in mid-flight) — verified, including the fail-then-pass

`draftRankSentence(draftRank, scope)` (`src/lib/draft-rank-copy.ts:129-192`) is now the one
implementation of the whole sentence, and all three compact-label surfaces call it and nothing else:
`ScriptDoctorPanel.tsx:390` (was a 6-line hand-composition), `server/lib/coverage-html.ts:165-168`
(now a one-line delegation; `ordinal` dropped from its imports), `SnapshotManager.tsx:196-199`. The
latent third bug the lane reports is real and I confirmed it in the diff: `unrankedDraftsNote` took
no scope and would have emitted the *union* noun inside a `'saved'`-scope badge; it now takes
`scope` (`:112`). `verify-p2-p3-surfaces.mjs:1111-1122` no longer asserts the untied literal that
could only ever have matched the broken rendering — it now derives
`draftRankSentence({rank:1,of:2,tied:true},'saved')`, which I evaluated directly:
`"Ranks tied 1st of 2 by health among your saved drafts of this script"` — byte-identical to the
live render quoted in the report.

**Fail-then-pass, reproduced myself.** In a scratch copy I reverted the `'saved'` branch to the
pre-B-12 hand-composition (no tied prefix, no note, bare `${of}`) and re-ran the suite:
**17 pass / 2 fail** — exactly the tied and the ranked+unscored cases — then 19/19 on the unmodified
tree. The gate could not have been green on the old behaviour.

```
tests/core/draft-rank-copy-consistency.test.ts   # tests 19  # pass 19  # fail 0
tests/core/coverage-html.test.ts                 # tests 44  # pass 44  # fail 0
tests/core/percentile-copy-consistency.test.ts   # tests 28  # pass 28  # fail 0
npx tsc --noEmit → exit 0 · honesty-audit → 57 rows, clean · check-docs → clean
```

**Can the letter drift from `draftRankSentence`?** Not on any shared word, and the boundary is now
documented rather than incidental. `coverage-letter.ts` deliberately keeps its caveat *paragraph*
and composes it from the same granular helpers; two tests tie it down —
`percentile-copy-consistency.test.ts`'s new "coverage-letter.ts imports the granular … helpers
directly" case (it must call all three and must not define a local copy of any) and
`draft-rank-copy-consistency.test.ts:216-246`, which asserts, for every wire-legal state, that the
letter contains `draftRankDenominatorLabel()` verbatim, the shared next-opportunity clause, and the
exact `unrankedDraftsNote(...)` string, plus the ordinal/`of` pair. What is *not* helper-bound is the
letter's own prose skeleton — the "Among your own …" frame and the `ranks`/`ties for` verb — which is
pinned by literals in that test, `coverage-letter.test.ts`, and the golden
`tests/fixtures/coverage-letter/report1.expected.md`. So a wording change there fails a test rather
than shipping silently; it is a caught drift, not an impossible one, which is the right trade for
prose that genuinely differs in shape.

## My four non-blocking notes

1. **`formatNumber`** — folded in properly and generalised: `draft-rank-copy.ts:26-40` defines it
   once for this module and applies it to `of`, `unscored` and the note's total, with an honest
   comment that `DraftRankSchema`'s 71/70 caps mean no separator can fire today, so this is a
   consistency guarantee rather than a visible fix. The panel now formats too, so all four surfaces
   agree.
2. **Row 34 apostrophe** — now U+2019, byte-identical to the letter's rendered string (`od -c` on
   both: `writer 342 200 231 s work`).
3. **Row 57 singular** — the row now registers the `is`/`are` branch explicitly and cites the
   `unscored: 1` case in the test.
4. **Correction idiom** — both `PATH_TO_EXCELLENCE.md` entries were rewritten into the file's own
   italic `*(Correction, independent review, 2026-09-05: …)*` form with the original text restored
   ahead of them, which is closer to that file's annotate-never-rewrite discipline than my note
   asked for.

## Verdict — **MERGE**

Both blocking items are closed with evidence I reproduced independently, the four notes are folded
in, and the mid-flight B-12 consolidation is a real reduction — four hand-compositions of one
sentence down to one function, with a fail-then-pass I ran myself and a browser gate that no longer
asserts the broken wording. Nothing left is worth another round: the two cosmetic long lines, the
"12 vs 13 sites" count, and the stale closing sentence in the audit README are all record-only.
