# Independent review — `lane/owner-measure` @ `f198b60e`

Reviewed object: `lane/owner-measure` @ `f198b60e`, base `main` @ `996e27a0`,
five commits. Worktree `/home/user/wt-owner`. Reviewer did not build this lane.
Procedure: `docs/LANE_STANDARD.md` §6. Round 1.

**VERDICT: REVISE** (numbered list at the end).

The command is real work, not a wrapper: the plan record and its
note-agreement test, the detached-worktree measurement, the SKIP trap, the
three-scan conversion driven by the gate's own exported functions, the
order-preserving manifest re-lock and the end-to-end public-corpus fixture all
exist and all do what the report says. Four of the five "what the brief got
wrong" corrections are load-bearing and check out. What sends it back is
smaller than any of that and worse: the numbers it prints and writes into
receipts are labelled with a recipe that did not produce them, the receipts it
writes attest to a command that did not run, and a `gate: "report"` step
silently re-locks the 72-row manifest and selects the AUC-24 lock tip with no
acceptance.

---

## 1. The brief, item by item

| # | brief item | status | evidence |
|---|---|---|---|
| 1 | plan read from a committed record; test checks it against the owner note's table; `--plan` prints and exits | **done** | `docs/p1-benchmark/owner-measurement-plan.json`; `tests/scripts/owner-measure-plan.test.ts` reads the REAL plan and the REAL note (lines 27, 67) — 30/30 pass; `--plan` exit 0, never reaches `PRE-FLIGHT` |
| 2 | pre-flight: refuse without corpus (exit 1, nothing written), `verify:corpus-layout`, clean tree, fetched origin, STOP on a moved tip | **done, one word overstated** | all five present, `preflight()` in `scripts/owner-measure.mjs`; the refusal exits 1 but the output directory IS created first — see finding 7 |
| 3 | per branch in a detached worktree; probe on branch AND base to a dir outside the repo; SKIP banner treated as failure | **done** | `addWorktree(... '--detach' ...)`, `runProbe` runs both sides, `resolveOutDir` refuses a path inside the repo, `parseMeasureReal` throws on the banner; the trap is reproduced against the real `measure-real` in the e2e suite |
| 4 | conversion by the three-scan recipe, verified with the gate's own exports and the real CLI; `--dry-run` diff; `--push` off by default | **done, with a false Command field** | verified on the real `scoring/renderer-residuals` ledger (§2); one `git push` in the lane, inside `if (ctx.push)`; the Command field it writes is not true — finding 2 |
| 5 | accept/reject gate after the first branch vs main's baseline on the same recipe; re-lock in place, order preserved, refusing a reordered array | **silently changed** | the gate exists for `gate: "accept-reject"`; a `gate: "report"` step is treated as accepted and re-locks anyway — finding 3. `assertOrderPreserved` is correct and is shown failing first (16/16) |
| 6 | last step `lock-auc24` + what to commit; the 1,500,000 / 675,000 caveat printed where it applies | **done** | `lockAuc24Step`, `printNextSteps`; the voice bound is printed in the closing block and repeated as the plan's `caveat` on the stack step that carries it |
| 7 | no-corpus end-to-end mode exercising EVERY path including refusals, SKIP-trap, stale-tip stop, conversion 0 problems, re-lock refusal — each guard shown failing first | **narrowed** | 31/31 pass and the guards listed in the report are genuinely shown failing first; but the fixture step is `probe: null` and `gate: accept-reject`, so the probe path, the reject decision, a re-lock that actually moves a field, and `gate: "report"` are never driven — which is how finding 3 survived. See §4 |
| 8 | owner notes rewritten to lead with the command; README/ARCHITECTURE paragraphs; claims rows; brain | **done** | `Owner - R5 Measurement and Merge.md` opens with `## The command`; `README.md` command list; `ARCHITECTURE.md` §4 "The owner's measurement path"; claims rows 7 and 20 re-anchored with the audit trail; `npm run check-brain` reported 0 by the lane |
| C1 | no corpus text/path/title/filename in repo, commits, receipts or stdout | **done** | §5 |
| C2 | scoring path untouched | **done** | the only change to a gate script is an export list in `scripts/check-scoring-receipt.mjs` (no behaviour); `check-scoring-receipt main..HEAD` reports "no scoring-path files changed" |
| C3 | scoring branches unmodified | **done** | every `scoring/*` local ref equals its origin ref (`4cf5b2f3`, `089bec91`, `a4df0c49`, `bcc96f85`, `efd1a463`); `main` equals `origin/main` |

## 2. Reproduced numbers, with the commands

```
$ node --experimental-strip-types tests/scripts/owner-measure-e2e.test.ts
# tests 31  # pass 31  # fail 0  # duration_ms 33903.97
```
(report: 31/31, 36 s.)

```
$ node --experimental-strip-types tests/scripts/owner-measure-plan.test.ts    # 30/30, 0 fail
$ node --experimental-strip-types tests/scripts/receipt-conversion.test.ts    # 36/36, 0 fail
$ node --experimental-strip-types tests/scripts/manifest-relock.test.ts       # 16/16, 0 fail
$ node --experimental-strip-types scripts/owner-measure.mjs --plan            # exit 0
```

**The public-fixture pipeline, driven by hand** (clone built the way the e2e
test builds one: `git clone --shared`, `origin` pointed at itself, a throwaway
`scoring/fixture-e2e` branch carrying a comment-only `doctor.ts` touch and one
PENDING ledger entry, a throwaway plan):

```
$ node --experimental-strip-types scripts/owner-measure.mjs \
    --corpus-fixture=public --plan-file=<session scratch>/e2e/clone/fixture-plan.json \
    --repo-root=<session scratch>/e2e/clone --out-dir=<session scratch>/e2e/out-dry \
    --accept-all --dry-run
EXIT=0
  measure-real    : 32 scripts · shuffle-drop AUC-24 0.6550 · act-swap 0.430
  AUC-24          : 0.6550
  vs AUC24_FLOOR  : 0.622 — clears
  vs baseline    : 0.6550 (+0.0000)
  manifest re-lock: 32 rows mapped IN PLACE, order preserved — 0 field(s) moved
```
The report's 0.6550 reproduces exactly, and so does the degeneracy it admits:
branch and baseline are the same number and no manifest field moves.

**The conversion, on the REAL `scoring/renderer-residuals` ledger**, read-only
in scratch, driven through the gate's own exports (`extractEntries`,
`validateEntry`, `pendingReason`) rather than through the lane's test:

```
entries in file: 27
pendingReason flags: 4
  - ### 2026-09-06 — P3 VERIFY-REPORT CLI: …
  - ### 2026-09-07 — FEATURE-LENGTH DEFECTS: …
  - ### 2026-09-12 — ADVERSARIAL LANE: …
  - ### 2026-09-13 — RENDERER RESIDUALS: …
converted: 1   outOfScope: 3
pendingReason after: null
validateEntry problems: []
```
The report's "4 flagged, 3 out of scope, 1 converted, 0 problems" reproduces,
with the real tip SHA `a4df0c49f24e356e45677f0550972f6bf589917a` as
`filedAtSha`. (With a synthetic SHA the gate correctly fails the entry with
"cites git object … which does not exist" — the 2026-08-08 tell, still live.)

**The refusal**, checked for the claim it makes rather than the string it
prints:

```
$ rm -rf <dir>; node --experimental-strip-types scripts/owner-measure.mjs --out-dir=<dir> --accept-all
EXIT=1
<dir>  →  DIRECTORY WAS CREATED
```

## 3. Findings

### Blocking

**F1 — every number the command reports, and every receipt it writes, is
stamped with a recipe that did not produce it.** (`scripts/owner-measure.mjs`
lines 894-896 and `printNextSteps`; `scripts/lib/receipt-conversion.mjs`
`fieldBody('Measured AUC-24')`.) `scripts/measure-real-script-discrimination.ts`
still segments scenes on `/^(?=INT\.|EXT\.)/mi` (line 271) and carries its own
`auc()`; `scripts/lock-auc24.mjs` and `tests/core/real-script-corpus.test.ts`
both import `shuffleDropDegrade` from `scripts/lib/auc.ts`, which is
`shuffle-drop/v2`. The lane names this in §1.6 and §6.1 and says the command
"prints the recipe id beside every number it reports so the two cannot be
silently conflated". It does not. It prints the id of the OTHER recipe:

```
  BOTH numbers are on recipe shuffle-drop/v2, measured in this run. The last
  recorded AUC-24 (0.731, 2026-07-11) is on the PRE-2026-09-12 segmentation and is
  not comparable to either of them.
```
and into the ledger:
```
- **Measured AUC-24:** **0.6550** — shuffle-drop over the first 24 manifest scripts,
  recipe `shuffle-drop/v2` (the scene segmentation changed on 2026-09-12, so this
  number is NOT comparable to the 0.731 recorded on 2026-07-11 …
```
Both statements are inverted. The number is on the pre-2026-09-12 segmentation,
it IS on the same recipe as 0.731, and the table `lock-auc24` writes minutes
later is the one that is not comparable to it. `AUC24_DEGRADATION_ID` exists
precisely so an old-recipe number can never be compared to a new measurement;
this is the command writing that id onto the old-recipe number, in a permanent
receipt, under an attestation. Printing no id would have been safer than this.

I agree with the lane that migrating `measure-real` is out of scope: it moves a
measured number and needs its own receipt and its own lane. Labelling the
number truthfully is not the same change, moves nothing, and was in scope.

**F2 — the Command field of every converted receipt asserts that the corpus
probe ran, whether or not it did.** `fieldBody('Command')` unconditionally
writes "which ran, in this order and in the foreground: … `npm run --silent
probe-corpus-shape -- --csv` (on this tree and on the pre-branch base)". Three
of the six committed plan steps (`stacked-r5-plus-advice`,
`r5-verbosity-bias`, `advice-rule-fixes`) have `probe: null`, and
`measureTree` prints "probe : none recorded for this step" for them.
`runProbe` can also return `skipped — …` or `unavailable (…)` on a step that
does have one, and the receipt still claims it ran. The `Runner attestation`
field directly below signs for the whole list: "I ran the command above myself
… in the foreground, and read its output." This is a fabricated command list in
a measurement receipt — the class of thing this gate exists to make expensive.
The lane's own e2e fixture uses `probe: null`, so the green suite bakes the
false claim in; it is visible verbatim in the `--dry-run` diff reproduced in
§2.

**F3 — a `gate: "report"` step re-locks the 72-row manifest and selects the
AUC-24 lock tip, with no acceptance.** In `main()`: `let decision = 'accepted'`
is the initial value; only `gate === 'accept-reject'` can change it. A report
step therefore prints "gate : this step reports; it takes no accept/reject
decision", then "decision : accepted", then sets `accepted`, then calls
`relockStep`, and its tip becomes `lockRef` for `lock-auc24`. In the committed
plan the DEFAULT happy path reaches exactly this: accept
`feature-length-defects`, and `adversarial-stack` (`gate: "report"`) runs,
re-locks the manifest a second time against a tree nobody was asked about, and
the table is locked on it. It also satisfies downstream `if-accepted:` guards.
This contradicts the lane's own §1.5 ("the re-lock happens only on
acceptance"), brief item 5, and CLAUDE.md's warning that a re-lock after an
unintended change is the one way this ratchet is silently lowered. No test
drives a report-gate step end to end.

### Major

**F4 — the converted entry passes the scanner while its first paragraph still
tells the reader the measurement did not happen.** (The lane's flag b.) On the
real `scoring/renderer-residuals` entry, after conversion, `pendingReason`
returns `null` and `validateEntry` returns `[]` — and the entry a person reads
is:

> ### … RENDERER RESIDUALS … **(MEASURED 2026-09-13 — AUC-24 0.7412 on the local real-script corpus)**
> …
> **This is a scoring-path change** — … **and its AUC-24 is not known.**
> … `node scripts/check-scoring-receipt.mjs 089bec91..HEAD` exits **1** on this
> entry, which is the intended state: the entry is an honest ledger row, not a
> receipt. **No AUC-24 number is stated, implied or projected anywhere on this
> branch.**
> - **Measured AUC-24:** **0.7412** — …

None of those three sentences is in `PENDING_PHRASES`, so scan two never sees
them, and all three are now false. Compounding it, the inserted
`- **Entry body as filed:**` bullet says "everything below this line is this
entry as it was written before the measurement" — but it is spliced after the
LAST converted field, and on this entry roughly sixty lines of as-filed prose
sit ABOVE it, including the contradicting paragraph and every "What changed" /
"Public-benchmark statistics" / "Output identity" bullet. The banner's "the
prose under them is the entry AS FILED" has the same defect.

My call on the Owner R5 rule ("do not close it by editing only a heading"):
this is NOT a mechanical evasion — real fields carrying real numbers, a
fingerprint, a named runner and a commit SHA all land, which is far more than a
heading edit, and the re-tense-rather-than-delete instinct is right. But the
result is a receipt that contradicts itself in the paragraph a reader reaches
first, which is a §2 "copy tells the truth" failure and destroys the entry's
value as a receipt. The module already has the correct instinct one level up:
a bare `PENDING` in a heading is "refused rather than guessed at, because a
heading is the one line a reader trusts". A body sentence asserting that no
measurement exists deserves the same treatment.

**F5 — `--corpus-fixture=public` is destructive to whatever repository it is
pointed at, guarded only by a printed sentence.** `main()` writes the throwaway
32-row manifest over `path.join(repoRoot, MANIFEST_PATH)` and sets
`ctx.allowDirty = true` BEFORE the pre-flight runs. The file header says it
runs "in a clone"; nothing enforces that. Run in the owner's own checkout with
the committed plan, it overwrites the committed 72-row
`tests/fixtures/real-corpus-manifest.json`, and then (`relockStep` reads the
manifest from the measured tree, which `newTree` has also replaced) would
commit a 32-row manifest onto a real `scoring/*` branch in a detached worktree
and move that branch ref. Refuse the flag unless `--repo-root` is given and
differs from the script's own repository.

### Minor

**F6 — `scripts/lib/manifest-relock.mjs` is stored in git as a BINARY file.**
`identity()` joins with a literal NUL byte (line 50,
`` `${row.id ?? ''}\0${row.file ?? ''}` `` written as a raw control character),
and `.gitattributes` sets `* text=auto`, so git classifies the file as binary:
`git diff 996e27a0..f198b60e -- scripts/lib/manifest-relock.mjs` prints
"Binary files /dev/null and b/… differ". No reviewer can read a future change
to this file as a diff, and EOL normalization does not apply to it — in a repo
whose `.gitattributes` header is about CRLF corruption from OneDrive. Write
`'\0'` as an escape; identical semantics, text file.

**F7 — "Nothing was written" is not true on the no-corpus refusal.**
`mkdirSync(ctx.outDir, { recursive: true })` runs before `preflight()`, so the
refusal creates the output directory (reproduced in §2). The e2e test asserts
only `assert.match(res.stderr, /Nothing was written/)` — it checks the string,
not the claim, so it cannot fail on this. Move the mkdir below the pre-flight
and assert the directory's absence.

**F8 — `classifyLayout`'s known-state pattern is wider than its
justification.** It continues past any failing check whose label matches
`/migrated schema/i`. Two of `verify-corpus-layout.mjs`'s checks match: line
120 (`split manifest is migrated schema`), which is the `corpus-split.json`
case the lane documents, and line 208
(`real-corpus-manifest is migrated schema (id + contentHash present)`) — which
is about the AUC-24 corpus this run measures, and which also fails today
(committed rows carry `name`/`file`/`contentHash` but no `id`), taking every
per-file check under it with it. The substitute "all 72 rows resolve" check is
the right idea; the classification should name the two checks it forgives
explicitly rather than pattern-match a phrase that will match the next one too.

**F9 — the branch-ref compare-and-swap cannot fail out loud.**
`git(ctx.repoRoot, ['update-ref', ref, newSha, step.tip], { allowFail: true })`
is followed unconditionally by `console.log(\`  branch          : refs/heads/…
-> ${newSha.slice(0,8)}\`)`. The comment above it says the old value is pinned
"so a branch that moved under us fails instead of being overwritten" — the
overwrite is prevented, but the failure is swallowed and the line then reports
a move that did not happen.

**F10 — the printed "command" is not runnable.** `measureTree` prints
`cmd.slice(1).join(' ')`, dropping `process.execPath`, so the line the receipt
points at reads `REAL_SCRIPT_CORPUS_DIR=<corpus> --experimental-strip-types
scripts/measure-real-script-discrimination.ts`.

**F11 — `redact()` masks the corpus directory, not names under it.** The lane's
own test pins this: `redact('mismatch: /corpora/real/Some Title.fountain.txt …',
'/corpora/real')` → `mismatch: <corpus>/Some Title.fountain.txt …`. The "belt
for the braces" holds today only because the two sites that echo a tool's
stderr are safe — `scripts/lib/score-corpus-rows.mjs` deliberately reports rows
by content hash, and `scoreManifestRows` echoes only its tail. `runProbe`
echoes up to three lines of a FOREIGN script's stderr, truncated to 160 chars.
Either mask basenames under the corpus dir as well, or write probe stderr to
the run log and print only its path (which the error branch already does).

## 4. On the lane's own flags

**(a) recipe split.** Answered by F1. Shipping an owner command that reports two
AUC-24 numbers on two recipes is acceptable ONLY if the command says so; it
currently says the opposite. Leaving `measure-real` unmigrated is the right
call for a tooling lane. Labelling is in scope and must be fixed here.

**(b) receipt conversion.** Answered by F4. The recipe is sound and the
`- **Entry body as filed:**` terminator is a genuinely clever solution to scan
three's window problem. It is spoiled by the two sentences the terminator's own
copy makes about where the as-filed prose is, and by the untouched assertions
above it.

**(c) degenerate e2e comparison.** Order of operations alone does not earn
"every path exercised". Four paths are never driven: the probe (fixture is
`probe: null` — and that is how F2 slipped through), a re-lock that actually
moves a field ("0 field(s) moved"), the reject decision, and `gate: "report"`
(how F3 slipped through). The fixture runs in a `--shared` clone, so a scoring
change inside it needs no receipt and costs nothing: stack a one-line constant
change onto the fixture commit and the two AUC numbers differ, manifest fields
move, and the `row NN health: X -> Y` printing path runs. Add a second fixture
step with `gate: "report"` and `probe` set. In scope and cheap.

**(d) the brief's errors.** All five corrections check out, and I verified the
load-bearing ones directly: `origin/scoring/renderer-residuals` is `a4df0c49`
(`56b96765` is not the tip); the stack is by content, not ancestry;
`scoring/forced-cue` adds no `### <date>` heading of its own, which is why the
step records two ranges; `verify:corpus-layout` cannot pass on the committed
pre-migration split, and the command CLASSIFIES and continues rather than
refusing — so the owner is not blocked on day one, which is the right answer
(see F8 for the one way the classification is too generous); the probe cannot
be copied onto two trees because the imports it needs ARE the change.
On "is `tip` the right identity": pinning the review commit means any further
review round on a scoring branch STOPS the owner's run until two documents are
hand-corrected together. That is deliberate and defensible — the record is the
authority — but the plan should ALSO record the branch's last scoring-path
commit, so a tip that moved for an audit file is distinguishable at a glance
from one that moved for code. Not blocking.

**(e) corpus hygiene — clean.** Every committed manifest row's `name` and
`file` was checked against the full `996e27a0..f198b60e` diff: zero real hits
(one two-letter false positive). The only corpus-shaped strings added are the
synthetic `/corpora/real/Some Title.fountain.txt` in the redaction test and a
synthetic `measure-real` report in the parser test. The output directory
defaults to `$XDG_STATE_HOME/storymachine/…` or `~/.storymachine/…`, is never
under the worktree, and `resolveOutDir` refuses any path inside the repo (shown
failing on `scripts/output` and on the repo root). `--push` is off by default
and the lane contains exactly one `git push`, inside `if (ctx.push)`.

## 5. What a stronger version would have done

The stronger version is not a bigger one. Three of the four blocking findings
are the same omission wearing different clothes: the command knows more about
its own run than it writes down, and where it does not know, it asserts anyway.
A run record — which recipe produced this number, which probes actually ran,
whether this step was accepted or merely reported — threaded from the run into
`facts` and into every printed line would have closed F1, F2 and F3 together,
and is perhaps eighty lines. That is in scope; it is the lane's own thesis
("this either produces a tree the real CLI exits 0 on, or it produces
nothing") applied to the sentences as well as the fields.

The second thing a stronger version would have done is refuse to be the only
reader of its own output. The three findings above are all visible in the
`--dry-run` diff and in the e2e stdout; none is caught by a test, because every
assertion is a `assert.match` on a string the code also produces. The fixture
that would have caught them is the one the lane declined to build: a fixture
branch with a real one-line scoring change, a second step with
`gate: "report"`, and a `probe` that is actually run. Also in scope, and the
report is right that a real corpus number is not.

Out of scope, and correctly left: migrating `measure-real` onto
`scripts/lib/auc.ts` (it moves a measured number), fixing `verify:corpus-layout`
(needs the owner-local corpus migration), and `--resume`.

---

## VERDICT: REVISE

1. **Stop labelling the `measure-real` number `shuffle-drop/v2`.** Plumb the id
   of the recipe that actually produced it (`measure-real`'s own pre-2026-09-12
   segmentation) through to stdout and to `fieldBody('Measured AUC-24')`, and
   state plainly, in both places, that the AUC-24 this run REPORTS and the
   table `lock-auc24` WRITES are computed by different scene segmentations and
   are not the same statistic. The receipt's "not comparable to the 0.731" must
   be corrected — that number is on the SAME recipe. Say so beside
   `vs AUC24_FLOOR` too. (F1)
2. **Make the Command field describe the run that happened.** Pass each probe's
   outcome (`ran` / `none recorded` / `skipped` / `unavailable`) into `facts`
   and write it, or refuse a step whose Command claim cannot be made true. Give
   the e2e fixture a step with a real `probe` so the claim is exercised. (F2)
3. **A `gate: "report"` step must not be treated as accepted.** It must not set
   `accepted`, must not call `relockStep`, must not become `lockRef`, and must
   not satisfy a downstream `if-accepted:`. Drive a report-gate step and a
   rejected step end to end in `tests/scripts/owner-measure-e2e.test.ts`. (F3)
4. **Do not close an entry whose body still says the measurement did not
   happen.** After conversion, scan the in-scope entry for assertions the
   rewrite table did not touch (`AUC-24 is not known`, `no AUC-24 number is
   stated`, `exits **1**`, `claims none`, `not a receipt` is enough to start),
   and refuse with those sentences printed for the owner to hand-edit — the
   same discipline `convertHeading` already applies to a heading. Separately,
   fix the `- **Entry body as filed:**` bullet and the banner: as written they
   claim all as-filed prose is below that line, and on the real
   `renderer-residuals` entry most of it is above. (F4)
5. **Refuse `--corpus-fixture=public` unless `--repo-root` is supplied and
   differs from the script's own repository.** It currently overwrites the
   committed 72-row manifest before the pre-flight and would commit a 32-row
   one onto a real `scoring/*` branch. (F5)
6. **Remove the literal NUL byte from `scripts/lib/manifest-relock.mjs`** (use
   `'\0'`), so the file stops being a binary blob in git and can be reviewed as
   a diff. (F6)
7. **Move `mkdirSync(ctx.outDir)` below the pre-flight** so "Nothing was
   written" is true, and assert the directory's absence in the refusal test
   instead of only matching the message. (F7)
8. **Name the two forgiven layout checks explicitly** instead of matching
   `/migrated schema/i`, which also forgives
   `real-corpus-manifest is migrated schema` — a failing check about the corpus
   this run measures. (F8)
9. **Check `update-ref`'s status** and refuse (or say so) instead of printing
   `branch : … -> <sha>` after a compare-and-swap that was rejected. (F9)
10. **Small ones:** print the node executable in the `command :` line (F10);
    either mask basenames under the corpus dir in `redact()` or stop echoing
    probe stderr and print the log path instead (F11); and in the e2e fixture,
    make the branch a real one-line scoring change so the AUC comparison and
    the manifest re-lock are non-degenerate (§4c).

Items 1-5 block the merge. Items 6-10 are cheap and should land in the same
round.

---

# Round 2 (`7b05a943`)

Re-checked object: `lane/owner-measure` @ `7b05a943`, round-2 diff
`f198b60e..7b05a943` (two commits: `c15ed954` the fix, `7b05a943` the report).
Warm re-check of this reviewer's ten items only, per §6 — no battery re-run.

**VERDICT: MERGE.**

All ten items are fixed, several past what was asked. The three that mattered
most are fixed at the root rather than at the symptom: the recipe id is now
DERIVED from the source that computes the number, so it corrects itself the day
`measure-real` is migrated; the probe outcome is a REQUIRED fact the converter
refuses to run without, so the Command field cannot go back to being a
template; and a `report` step now has its own decision value that no code path
treats as acceptance.

## Per item

| # | round-1 finding | verdict | how it was checked |
|---|---|---|---|
| 1 | recipe id stamped on the wrong number | **fixed** | `detectMeasureRealRecipe('/home/user/wt-owner')` → `{ id: 'shuffle-drop/legacy-int-ext-split', migrated: false, evidence: 'scripts/measure-real-script-discrimination.ts:272 still splits scenes on /^(?=INT\\.\|EXT\\.)/mi' }`; I read that line — it is the legacy split. `AUC24_DEGRADATION_ID` is `shuffle-drop/v2`. `recipeComparison` prints "THESE TWO NUMBERS ARE ON DIFFERENT RECIPES AND ARE NOT COMPARABLE TO EACH OTHER", names both ids with the evidence, and says the reported number is on the same segmentation as the 0.731. The receipt now says "**IT IS NOT THE RECIPE `lock-auc24` WRITES**" and "Floor `AUC24_FLOOR` 0.622, for reference only where the recipes differ". Deriving the id from source instead of hardcoding a second constant is stronger than the item asked for, and the e2e invariant (suite 7) pins both directions |
| 2 | Command field attests to a probe that did not run | **fixed** | `probes` is a hard `requireFacts` check (`Array.isArray`, with the review number in the message); `probeCommandLines` writes one line per side — `on the branch tree RAN (72 rows, the tree's own copy);` — and, for an empty list, "no corpus-shape probe (the measurement plan records none for this step)". Rendered on the real `scoring/renderer-residuals` entry and read. The e2e fixture now carries a probe its base tree lacks |
| 3 | `gate: "report"` silently accepted | **fixed** | `decision = 'reported'` (owner-measure.mjs:1130): no `accepted`, no `relockStep`, never `lockRef`, satisfies no `if-accepted:`, and the printed copy says all four. `--accept=<id>` is the deliberate override. The plan's `adversarial-stack` row is now `accept-reject`. Driven: the e2e adds a second `gate: 'report'` step and asserts the reported step's manifest differs from the accepted one's and that the lock tip is the accepted step; a rejected step is driven through stdin (suite 2) |
| 4 | converted entry passed the gate while its prose denied the measurement | **fixed** | Converted the REAL `scoring/renderer-residuals` ledger with the round-2 code: `pendingReason` → `null`, `validateEntry` → `[]`. Structure is now heading / banner / five fields / window-bounding bullet / `#### As filed, before this measurement (2026-09-13)` / original body. Read as a producer it tells ONE story — the fields are this run, the fenced section is the filing — and the fence's own copy says "Sentences there describe the state AT FILING and several are no longer true". The three sentences I quoted in round 1 are now unambiguously below the fence and read as history. `assertNoPendingAssertionsAbove` refuses any entry where such a sentence survives above the boundary, shown throwing and then not throwing. The wholesale move rather than per-sentence re-tensing is the right judgement and is stated as one: re-tensing "exits **1** on this entry, which is the intended state" would have required the converter to invent prose, which is exactly what it must not do |
| 5 | `--corpus-fixture=public` destructive | **fixed** | Ran two of the three: with no `--repo-root` → exit 1, naming what it would overwrite and printing the `git clone --shared` recipe; with `--repo-root=/home/user/wt-owner` → exit 1. The third is a `.owner-measure-throwaway` marker requirement |
| 6 | NUL byte made the file binary in git | **fixed** | 0 NUL bytes; `file` → "JavaScript source, Unicode text, UTF-8 text"; source reads `` `${row.id ?? ''}\0${row.file ?? ''}` ``. The round-2 diff still renders as `Bin` only because the OLD blob is binary; from here it diffs as text |
| 7 | "Nothing was written" was false | **fixed** | `mkdirSync(ctx.outDir)` is gone from before the pre-flight; the directory is created lazily by `writeArtifact` inside it. Verified: `rm -rf <dir>` then the no-corpus run → exit 1 and `<dir>` does not exist. The test now asserts `!existsSync` rather than matching the sentence |
| 8 | `/migrated schema/i` forgave a second check | **fixed** | `FORGIVEN_LAYOUT_CHECKS` is a frozen two-element list of exact labels, each with the reason it is forgiven — including the honest note that the second one is forgiven only because the per-file checks under it do not run at all, with the pre-flight's row-resolution check standing in. `classifyLayout` uses `.includes()`. Driven in e2e suite 8 |
| 9 | `update-ref` failure swallowed | **fixed** | `moveBranchRef` throws a `Refusal` naming the branch, the stale old value, and where the conversion commit is safe. Driven in e2e suite 9 against a throwaway repo |
| 10 | execPath dropped; foreign stderr echoed; degenerate fixture | **fixed** | `commandLine` carries the full argv. Probe stderr is written to `<label>.probe-<side>.error.log` and only the path printed, with the reason quoted at the site. The fixture branch is a real `SCARCITY_SCALE` 140 → 152 change (a second tree at 133), so the AUC comparison and the re-lock are no longer no-ops |

## Also found and fixed by the lane, not by this review

The probe summary carried the CSV's **absolute local path** into a committed
receipt. `receiptDetail` now carries no path at all, and the e2e asserts that
neither the commit message nor the receipt diff contains the output directory.
That is the right instinct applied unprompted, and it is the same class as F11.

## Reproduced numbers, round 2

```
$ node --experimental-strip-types tests/scripts/owner-measure-e2e.test.ts
# tests 56  # pass 56  # fail 0  # duration_ms 73180.35      (lane: 56/56, ~70 s)

$ node --experimental-strip-types tests/scripts/receipt-conversion.test.ts
# tests 43  # pass 43  # fail 0                              (lane: 43/43)

$ node --experimental-strip-types scripts/owner-measure.mjs --plan            # exit 0
$ owner-measure.mjs --corpus-fixture=public                                    # exit 1, refuses
$ owner-measure.mjs --corpus-fixture=public --repo-root=/home/user/wt-owner    # exit 1, refuses
$ (no REAL_SCRIPT_CORPUS_DIR) owner-measure.mjs --out-dir=<dir>                # exit 1, <dir> absent
```
Conversion of the real `scoring/renderer-residuals` ledger through the gate's
own exports: 27 entries, 4 flagged pending, 3 out of scope, **1 converted**,
`pendingReason` → `null`, `validateEntry` → `[]`.
Recipe detection on this tree: reported `shuffle-drop/legacy-int-ext-split`
(evidence `…measure-real-script-discrimination.ts:272`) vs locked
`shuffle-drop/v2` (`scripts/lib/auc.ts`).

## Residual nits — NOT a third round

None of these blocks the merge; fold them into whatever touches these files
next.

1. `scripts/lib/receipt-conversion.mjs:210` has a no-op ternary,
   `${i === probes.length - 1 ? '' : ''}` — both branches are empty. Dead code
   from an abandoned last-item separator; delete it.
2. `commandLine` embeds the absolute `process.execPath` and is printed to
   stdout unredacted, so an owner's console shows their node install path. It
   never reaches the receipt (checked: `commandLine` is bound to no `facts`
   key), so this is cosmetic — but `redact()` would mask it to `~/…` for free.
3. `scoreManifestRows`' failure path (owner-measure.mjs:481) still echoes a
   redacted stderr tail. It is safe because `scripts/lib/score-corpus-rows.mjs`
   deliberately reports rows by content hash and never by name; the same
   two-line comment `runProbe` now carries would make that a property a reader
   can see rather than one they have to go and check.
4. Round 1's advisory item (d) is still open by design: the plan pins `tip`
   only, so a review commit on a scoring branch stops the owner's run until two
   documents are corrected together. Recording the branch's last scoring-path
   commit beside `tip` would make "moved for code" and "moved for an audit
   file" distinguishable at a glance. Deliberate, defensible, and not this
   lane's job to change now.

**VERDICT: MERGE**
