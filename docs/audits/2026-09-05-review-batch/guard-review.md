# Independent review — fountain shape guard, cue-definition parity

**Reviewer:** independent (did not build this change)
**Lane worktree:** `/home/user/STORYMACHINE/.claude/worktrees/agent-a801916d787c42d4c`
**Branch:** `worktree-agent-a801916d787c42d4c` · one commit `38f47648`
**Diff reviewed:** `git diff main..HEAD` — 4 files, +432/−13
**Worktree state at end of review:** `git status --porcelain` empty (clean). All probes lived in
(scratch path outside the repository); nothing was written to the worktree or to `main`.
**Server started for driving:** `SESSION_DB_DIR=:memory: PORT=39121 node --experimental-strip-types server.ts`
(pid 6491) — killed; `pgrep -af server.ts` afterwards shows only four processes owned by *other*
worktrees (`agent-a25c63e9…`, `agent-a871ee9f…`, `agent-af5e391e…` ×2), none from this lane.

**Measurement caveat, stated up front:** this box has 4 CPUs and ran at load average 10.7–13.5
throughout (several parallel lane sessions). Absolute milliseconds below are inflated relative to
the audit's; the *ratios* and the pass/reject outcomes are unaffected.

**Verdict: REVISE** — one new bypass of the same class the lane was sent to close, one test that
will fail on the maintainer's repo root, and one added fuzz sweep that cannot fail. Details in §5.

---

## 1. Brief-vs-diff table

| # | Brief item | Status | Evidence |
|---|---|---|---|
| 1 | One shared definition of "what is a character cue"; if `fountain.ts` exports one, import it; confirm with `check-scoring-receipt` | **DONE** | `server/lib/validation.ts:37` imports `CUE_INITIAL_CLASS, CUE_LETTER_CLASS` from `../../src/lib/fountain.ts` (a real import, not a copied literal — I re-read both files). `src/lib/fountain.ts:73-75` are the exported class bodies; `CHARACTER_CUE_RE` at `:81-85` is composed from the same two. Precedent for the server→src edge already exists (`server/lib/breakdown.ts:37`, `server/lib/logline.ts:35`, `server/routes/export.ts:9`, `server/nvm/analyze/screenplay-normalizer.ts:25`). I re-ran `node scripts/check-scoring-receipt.mjs main..HEAD` → `no scoring-path files changed. OK.` exit 0. |
| 2 | Count computed with that shared test; threshold expressed as a cue count, not bytes; every committed fixture still passes; add a test that sweeps them | **DONE, with a defect** | `validation.ts:275-278` composes `CUE_LIKE_LINE_RE` from the imported classes; `:284-300` counts distinct trimmed matching lines against `MAX_FOUNTAIN_DISTINCT_CUE_LINES = 1_500` (`:255`) — a count, unchanged. The fixture sweep exists (`tests/security/fountain-shape-guard-cue-parity.test.ts:143-172`) and passes **in the worktree** (100/100, exit 0). It does **not** pass from the repo root — see §3(a) and revision 2. |
| 3 | Tests per bypass family, raw + .fdx, on `/api/scriptide/doctor` and `/api/export/verify`, asserting 400 in <1000 ms; extend `fuzz-routes.mjs` | **DONE (routes) / NARROWED (fuzz)** | `tests/routes/fountain-shape-guard-cue-bypass.test.ts` — 5 families × {raw, fdx} × 2 routes = 20 tests, `FAST_REJECTION_MS = 1000` (`:46`), `CUE_COUNT = 2000` (`:29`). I ran it: 20/20 pass, exit 0, 1,117 ms total. Fuzz extension at `scripts/fuzz-routes.mjs:135-145` (`CUE_NAME_GENERATORS`), `:160` (`pathologicalFdx(n, family)`), `:313-326` (the sweep). The fuzz families are `ascii/cyrillic/hash/long60` (4), not the brief's 5 — but that narrowing is exactly what the mid-lane follow-up asked for, so it is compliant, not silent. |
| 4 | Before/after measurement table in the report | **DONE (after) / RELAYED (before)** | The report's "after" column reproduces independently (§2). The "before" *route* numbers in the report's headline table are the audit's own, not the lane's; the lane did produce its own stash-based reproduction (five families, 200s at 301–5,174 ms) and labels it as such. Honest, but note the table's `before` column mixes the audit's numbers with the lane's — a reader has to read the prose to tell. Not a defect. |
| — | Follow-up: build from `CUE_INITIAL_CLASS`/`CUE_LETTER_CLASS`, over-count never under-count, drop the 40-char cap | **DONE for the alphabet / VIOLATED for "never under-count"** | Classes: yes (`:37`, `:275-278`). Cap: gone (`[...]*`, no `{1,40}`). "Never under-count": **no** — the composed class omits the dual-dialogue `^` that `CHARACTER_CUE_RE` accepts, so the guard under-counts a real cue shape. See §2 (BYPASS FOUND) and revision 1. |
| — | Follow-up: extend `pathologicalFdx` to `ascii/cyrillic/hash/long60` | **DONE** | `scripts/fuzz-routes.mjs:135-145`, `:160`. |

---

## 2. Drive it — REPRODUCED for the four named families; **BYPASS FOUND** for a fifth

### (a) The report's numbers reproduce

Keyless server booted from the worktree on port 39121; 2,000-cue payloads, `POST` with
`Content-Type: application/json`. Script: `scratchpad/reviews/probe.mjs`.

| family | raw `/doctor` | raw `/export/verify` | fdx `/doctor` | fdx `/export/verify` |
|---|---|---|---|---|
| ASCII (control) | **400** / 106 ms | 400 / 12 ms | 400 / 15 ms | 400 / 20 ms |
| Cyrillic | **400** / 23 ms | 400 / 8 ms | 400 / 14 ms | 400 / 17 ms |
| Greek | **400** / 9 ms | 400 / 7 ms | 400 / 13 ms | 400 / 16 ms |
| accented Latin | **400** / 41 ms | 400 / 5 ms | 400 / 19 ms | 400 / 10 ms |
| `#` in cue | **400** / 4 ms | 400 / 4 ms | 400 / 20 ms | 400 / 9 ms |
| 41+ char cue | **400** / 13 ms | 400 / 6 ms | 400 / 25 ms | 400 / 11 ms |

Every one carried `{"error":"fountain: must not contain more than 1500 distinct all-caps
character-cue-shaped lines"}`. The audit's four bypass families (and the two extra spellings) are
**REPRODUCED as fixed** — 400 in 4–106 ms where the audit measured 200 in 2.1–6.4 s.

Committed tests re-run by me, in the worktree:
`node --experimental-strip-types tests/security/fountain-shape-guard-cue-parity.test.ts` → 100 pass / 0 fail, exit 0.
`node --experimental-strip-types tests/routes/fountain-shape-guard-cue-bypass.test.ts` → 20 pass / 0 fail, exit 0.

### (b) Adversarial: a cue shape the analyzer accepts and the NEW guard still misses — **BYPASS FOUND**

The two regexes side by side:

```
analyzer  src/lib/fountain.ts:81   ^[\p{Lu}\p{Lt}][\p{Lu}\p{Lt}\p{M}0-9 \t'.#\-]*\s*\^?\s*(\s*\(V\.O\.\)|\s*\(O\.S\.\)|\s*\(CONT'D\))?$
guard     server/lib/validation.ts:275  ^[\p{Lu}\p{Lt}][\p{Lu}\p{Lt}\p{M}0-9 \t.,'()&/#\-]*$
                                                                                    ^^^ no `^`
```

The guard's class is wider in punctuation but **has no `\^?`**. Fountain's dual-dialogue marker is a
documented cue shape — `src/lib/fountain.ts:139` says so in its own comment ("Character names are all
caps, optionally ending with ^ for dual dialogue") and `:141-155` builds `dual_dialogue` blocks from
it. So `PERSON7^` and `PERSON7 ^` are ordinary cues to the analyzer and invisible to the guard.

Direct predicate check (`scratchpad/reviews/guardcheck.mjs`, 2,000 distinct lines per family):

```
ascii           "CHARACTER7"        CHARACTER_CUE_RE=YES  guard=REJECT       parserCueBlocks=2000
caret tight     "PERSON7^"          CHARACTER_CUE_RE=YES  guard=*** PASS *** parserCueBlocks=2000
caret spaced    "PERSON7 ^"         CHARACTER_CUE_RE=YES  guard=*** PASS *** parserCueBlocks=2000
caret + V.O.    "PERSON7 ^ (V.O.)"  CHARACTER_CUE_RE=YES  guard=*** PASS *** parserCueBlocks=2000
V.O.            "PERSON7 (V.O.)"    CHARACTER_CUE_RE=YES  guard=REJECT       parserCueBlocks=2000
CONT'D          "PERSON7 (CONT'D)"  CHARACTER_CUE_RE=YES  guard=REJECT       parserCueBlocks=2000
combining mark  "PERSÓN7"           CHARACTER_CUE_RE=YES  guard=REJECT       parserCueBlocks=2000
```

(I also probed trailing whitespace/tab/NBSP/form-feed, digits-led cues, and lowercase extensions:
all correctly handled — `trim()` on both sides, and a digits-led or lowercase-extension line is not a
cue to the analyzer either. The `^` family is the only hole I found.)

Through the live route, 2,000 distinct `PERSON<i>^` cues:

```
caret raw  /api/scriptide/doctor          status=200  ms=5161   (cold)  /  2894 (salted re-run)
caret fdx  /api/scriptide/doctor          status=200  ms=2415   (fresh, cache-cold)
caret raw  /api/export/verify             status=200  ms=32
```

and it scales exactly like the vector the audit reported (`scratchpad/reviews/caret4k.mjs`, all
cache-cold):

```
caret N=1000  chars= 16,907  status=200  ms= 1,752
caret N=2000  chars= 34,907  status=200  ms= 2,200
caret N=4000  chars= 70,907  status=200  ms=12,142     (2x input -> 5.5x time)
```

4,000 caret cues is **7.9 %** of `MAX_FOUNTAIN_CHARS`. This is the same unauthenticated, single-shot
O(n²) front-door vector the lane was sent to close, in a shape the lane's own comment
("over-count real character cues, never under-count the pathological case",
`validation.ts:261-273`) claims is impossible. **BYPASS FOUND.**

### (c) The count threshold itself

The largest payload the guard permits is **not** 1,500 cue lines — it is 1,500 *distinct* cue lines,
repeated as often as `MAX_FOUNTAIN_CHARS` allows. Measured (`scratchpad/reviews/probe2.mjs`,
`ceiling.mjs`), all `POST /api/scriptide/doctor`, all HTTP **200**:

| legal payload | chars | ms |
|---|---|---|
| 1,500 distinct ASCII cues (the audit's case) | 25,907 | **3,026** |
| 1,500 distinct cues, each ~215 chars long (no length cap any more) | 643,907 | **10,165** |
| 1,500 distinct cues × 20 repeats | 517,817 | **39,110** |
| 1,500 distinct cues × 34 repeats | 778,277 | no response; client aborted at **369 s**; a second attempt was still running after **>10 min** and I killed it |

The audit called 1,500 ASCII cues / 3.2 s "already the most expensive legal request on the route".
It is understated by more than an order of magnitude: the same guard, unchanged by this lane, admits
a 517,817-char request that burns **39 s** of server CPU, and one at 778,277 chars that does not
finish. The guard bounds *distinct cue vocabulary*; the analyzer's cost is driven by cue
occurrences × document length. This is pre-existing, not introduced here — but the lane's brief item
2 is about how the threshold is expressed, and the audit's own "most expensive legal request" line
is the number that just got falsified. Flagged as revision 5 (scope decision for the orchestrator).

For completeness, the guard's own cost is fine: on a 900,000-char near-miss input
`fountainShapeRejectionReason` runs in 203–226 ms, of which the new class contributes ~2 ms — the
rest is the pre-existing `HUGE_TOKEN_RE` scan (old class 1.3 ms vs new 3.4 ms on the same input;
1.4 ms vs 1.1 ms on 900 KB of ordinary prose). No ReDoS: the pattern is `^[X][Y]*$`, anchored, one
character class, no nesting.

---

## 3. Shortcut hunt

**(a) Legitimate scripts falsely rejected — clean on fixtures, but the sweep is host-dependent.**
The parity test passes 100/100 in the worktree. I recomputed the distinct-cue-like count under the
OLD and NEW regexes over all 54 git-tracked `*.fountain` files plus the 20 calibration
`REFERENCE_CORPUS` samples (`scratchpad/reviews/margin.mjs`): the maximum under the new regex is
**9** (`data/screenplays/code-blue.fountain`), against a budget of 1,500 — 167× headroom. The only
file whose count moved is `tests/fixtures/unicode-cues/accented-cues.fountain` (1 → 6), which is the
point of the change. No false-rejection risk on committed content.

I could not test "a real feature-length script from `data/screenplays`" as the brief asked, because
none exists: the largest tracked screenplay is 10 KB and the largest script-like file anywhere in the
tree is `docs/research-archive/MAViS_paper_extracted.txt` (78 KB, not a screenplay). The real corpus
is `REAL_SCRIPT_CORPUS_DIR`-gated and local-only. At the measured 167× headroom on 5–10 KB samples,
a 120-page feature would need ~150× the cue-like line density of the densest fixture to trip the
budget, so I judge the false-rejection risk negligible — but it is an *inference*, not a measurement,
and the lane's report should not be read as having proved it on feature-length material either.

**The defect:** `findFountainFiles` (`tests/security/fountain-shape-guard-cue-parity.test.ts:121-135`)
walks the filesystem from `REPO_ROOT` excluding only `node_modules/build/dist/coverage/.git`. It does
**not** exclude `.claude`. Run from the repo root — which is where `npm test` runs after this merges —
`.claude/worktrees/` contains full sibling checkouts. I ran the identical walk at both roots
(`scratchpad/reviews/sweep-probe.mjs`):

```
root=/home/user/STORYMACHINE                          total=511  blindPairs=96  dataScreenplays=200
root=/home/user/STORYMACHINE/.claude/worktrees/agent-a801916d787c42d4c   total=54  blindPairs=12  dataScreenplays=20
```

so `assert.equal(blindPairFiles.length, 12, …)` (`:150`) fails with `found 96`, and `:151` with
`found 200`, on the maintainer's machine any time a worktree exists. The repo already knows this:
`scripts/run-tests.mjs:90-92`'s `SWEEP_SKIP_DIRS` lists `.claude`, `data`, `output` for exactly this
reason. The lane's green `npm test` was run inside the worktree, where the hazard is invisible.

**(b) The fuzz-family narrowing — not a coverage loss, but the added cases cannot fail.**
Greek and accented Latin are the same `\p{Lu}` mechanism as Cyrillic and are covered by both
committed test files (5 families each), so dropping them from `fuzz-routes.mjs` costs nothing real —
and it is what the mid-lane follow-up asked for. What *is* a problem: `record()`
(`scripts/fuzz-routes.mjs:88-98`) flags only `err`, `status >= 500`, or `ms > SLOW_THRESHOLD_MS`
(5,000). A `200` is never flagged. So of the 16 cases added at `:313-326`, the pre-fix behaviour the
audit measured — `hash` raw 200 in 2,131 ms, and every fdx case at 43–122 ms — would have printed
`[ok]` and the run would have exited 0 with 0 flagged. Only the two ~6 s cases would have tripped
SLOW, and only on an unloaded box. Restated: **13 of the 16 added fuzz cases could not have caught
the bug they were added for.** By the lane standard's §3 ("a test that could not have caught the bug
proves nothing") these are decoration, not coverage. (The committed HTTP tests *do* assert 400 — the
property is covered; it is the fuzz lane, which the audit specifically asked to "prove the property
rather than one spelling of it", that does not.)

**(c) Is the composed regex actually built from the exported classes?** Yes. `validation.ts:37` is a
real ESM import of `CUE_INITIAL_CLASS`/`CUE_LETTER_CLASS`; `:275-278` interpolates them into
`new RegExp`. No copied literal anywhere in the diff, and `tests/core/unicode-character-cues.test.ts:332-333`
already pins the class bodies, so drift in `fountain.ts` propagates rather than diverging. This is the
right shape and matches `screenplay-normalizer.ts:44-45`'s precedent. Correct call to compose from the
classes rather than reuse `CHARACTER_CUE_RE` verbatim — `CHARACTER_CUE_RE` is *stricter* in
punctuation, so importing it directly would have narrowed the guard. (The cost of that choice is
exactly revision 1: composing by hand re-introduced the possibility of missing a piece of
`CHARACTER_CUE_RE`'s grammar, and it did.)

**(d) Output identity — verified 45/45, but it is a near-vacuous proof.**
I ran the harness myself, not the lane's numbers:

```
git archive main | tar -x -C .../baseline ; ln -s /home/user/STORYMACHINE/node_modules .../baseline/node_modules
node scripts/check-doctor-output-identity.mjs --tree .../baseline --out .../before   # exit 0, 45 snapshots
node scripts/check-doctor-output-identity.mjs --tree .          --out .../after      # exit 0, 45 snapshots
node scripts/check-doctor-output-identity.mjs --compare .../before .../after
  -> OUTPUT IDENTITY: PASS — all 45 reports are byte-identical (analyzedAt excluded).   exit 0
```

Confirmed. Worth saying plainly, though: the diff touches `validation.ts`, a fuzz script and two new
test files, none of which is reachable from `doctor.ts` — `check-scoring-receipt` says so. Byte
identity here was guaranteed by construction; it is a fine belt-and-braces check but the report leans
on it as if it were load-bearing evidence, and it is not.

**(e) Minor.** `scripts/fuzz-routes.mjs:313` is `const cueBypassCount = QUICK ? 2000 : 2000;` — a
ternary with identical branches, i.e. `--quick` is deliberately not honoured for the new sweep. That
also adds 16 two-thousand-cue payloads (4 of them ~200 KB of FDX XML) to a mode whose header
(`:14`) promises "<60s". Small, but it is the kind of thing this repo normally writes down. Also, the
report says "55 total on disk"; the tracked count is 54 (`git ls-files '*.fountain' | wc -l`) and the
test asserts `>= 45`. Harmless, but the number in the report is wrong.

**(f) Report claims I could not fault.** Gate exit codes I re-ran independently all match:
`check-scoring-receipt main..HEAD` = 0, both new test files = 0, output identity = 0. The commit
message's trailers are exactly the two required lines. Nothing was pushed. `git status` in the
worktree is clean.

---

## 4. The stronger version

The lane widened the *alphabet* and then hand-wrote the rest of the grammar again, which is the same
mistake one level up: the guard's job is "would the analyzer call this a cue?", and the only way to
answer that without a second grammar is to make the guard a **provable superset** of the analyzer's
own predicate — literally `CHARACTER_CUE_RE.test(line) || LOOSE_RE.test(line)`, or the loose class
extended with every optional tail `CHARACTER_CUE_RE` admits (`\s*\^?\s*` and the three extensions) —
backed by one implication test that enumerates the analyzer's grammar (base name × {plain, `^`,
` ^`} × {none, `(V.O.)`, `(O.S.)`, `(CONT'D)`} × {ASCII, Cyrillic, Greek, NFC/NFD accented} ×
{short, 60-char} and asserts `CHARACTER_CUE_RE ⇒ CUE_LIKE_LINE_RE` over the product. That one test
is the difference between "we widened the alphabet and hope we got the rest" and "the guard cannot
under-count", and it is ~15 lines — squarely in scope, since it is exactly the property the brief's
follow-up named. Second, the fixture sweep should enumerate `git ls-files '*.fountain'` (or at
minimum reuse `run-tests.mjs`'s `SWEEP_SKIP_DIRS`) instead of walking the filesystem, so it tests the
repo rather than the developer's disk. Third — arguably a separate lane, but it is the number that
matters — the budget should bound the analyzer's actual cost driver (total cue *occurrences*, or
cue-count × scene-count) rather than distinct-cue vocabulary, because as measured above the current
threshold leaves a 39-second legal request on the table and a 778 KB one that never returns.

---

## 5. Verdict

**REVISE.**

1. **`server/lib/validation.ts:275-278` — the guard still under-counts a real cue shape.**
   `CUE_LIKE_LINE_RE`'s continuation class omits the dual-dialogue `^` that
   `src/lib/fountain.ts:81`'s `CHARACTER_CUE_RE` accepts via `\s*\^?\s*`. 2,000 distinct `PERSON<i>^`
   cues return HTTP 200 in 2,894–5,161 ms raw and 2,415 ms via .fdx on `POST /api/scriptide/doctor`;
   4,000 (70,907 chars, 7.9 % of the ceiling) take 12,142 ms. Add `^` to the class — or, better, make
   the predicate `CHARACTER_CUE_RE.test(line) || CUE_LIKE_LINE_RE.test(line)` so it cannot under-count
   by construction — and add the grammar-product implication test from §4. Why: this is the identical
   defect class the lane was commissioned to close, it contradicts the change's own comment at
   `validation.ts:261-273`, and it leaves the audit's headline vector open.

2. **`tests/security/fountain-shape-guard-cue-parity.test.ts:121` — the fixture sweep fails from the
   repo root.** `EXCLUDED_DIR_NAMES` does not exclude `.claude`, so at
   `/home/user/STORYMACHINE` the walk returns 511 files / 96 blind-pairs / 200 screenplays and
   `assert.equal(blindPairFiles.length, 12)` (`:150`) fails. Replace the filesystem walk with
   `git ls-files '*.fountain'`, or at minimum add `.claude` and `output` to the exclusion set the way
   `scripts/run-tests.mjs:90-92` already does. Why: as committed, `npm test` on `main` goes red for
   every maintainer who has a worktree on disk — which, per CLAUDE.md's "parallel sessions ship
   concurrently", is the normal state of this repo.

3. **`scripts/fuzz-routes.mjs:313-326` — the added fuzz cases cannot fail.** `record()` (`:88-98`)
   flags only errors, 5xx, and `ms > 5000`; a `200` is `[ok]`. Against the *unfixed* guard, 13 of the
   16 added cases (every fdx case, and `hash` raw at 2.1 s) would have printed `[ok]` and the run
   would have exited 0. Give these cases an explicit expectation — e.g. a `record(..., { note })`
   variant that flags `status !== 400` for payloads the guard is supposed to reject — so the fuzz lane
   actually proves the property. Why: lane standard §3, "a test that could not have caught the bug
   proves nothing".

4. **`scripts/fuzz-routes.mjs:313` — `const cueBypassCount = QUICK ? 2000 : 2000;`.** Identical
   branches. Either honour `--quick` with a smaller count or drop the ternary and say in the comment
   why the full 2,000 is used in both modes; the file's own header (`:14`) promises `--quick` stays
   under 60 s and this adds 16 two-thousand-cue payloads to it. Also fix the report's "55 total on
   disk" (tracked count is 54).

5. **Scope decision for the orchestrator — the threshold does not bound cost.** `MAX_FOUNTAIN_DISTINCT_CUE_LINES`
   caps distinct cue *vocabulary*, not cue occurrences, so 1,500 distinct cues repeated 20× is a legal
   517,817-char request that returns 200 after **39,110 ms**, and 34× (778,277 chars) did not return
   before a 369 s client abort. That is >12× the "most expensive legal request" the audit recorded.
   Pre-existing, not caused by this lane — but it means the guard's stated purpose ("before the
   O(n²)-vulnerable analyzer ever sees the text") is still not achieved after this merge, and the
   audit's own number for it is now known to be wrong. Either fold a cost-shaped budget into this lane
   or file it as the next one; do not let it disappear because the four named families went green.

Items 1–3 are merge-blocking. Item 4 is cosmetic but cheap. Item 5 needs an explicit decision, not
silence.

---

# Re-review (2026-09-05) — commit `a0667ab3`

**Scope:** `git diff main..HEAD` is now two commits (`38f47648`, `a0667ab3`), 4 files, +762/−20.
**Worktree state at end of this pass:** `git status --porcelain` empty. Probes lived only in
(scratch path outside the repository). Server booted for driving: `SESSION_DB_DIR=:memory: PORT=39133 node
--experimental-strip-types server.ts` (pid 28738) — killed at the end; verified below.
**Load caveat again, and worse this time:** 4 CPUs, load average 12.7–16.2 for the whole pass.
Absolute ms are inflated. Every conclusion below rests on a *ratio* or a *pass/reject outcome*, not
on an absolute number.

**Verdict: REVISE.** Revisions 1–4 are genuinely fixed and I could not break any of them. Revision 5
is not fixed — the new bound is calibrated on an axis that does not carry the cost. Measured
in-process with the lane's own harness, the guard now **rejects a 31-second payload and accepts a
216-second one**. One new finding (§R4) came out of the
40-char-cap removal.

## R1. Revisions 1–4 — verified fixed

| rev | claim | my verification |
|---|---|---|
| 1 | `isCueLikeLine = CHARACTER_CUE_RE.test(line) \|\| CUE_LIKE_LINE_RE.test(line)` | `server/lib/validation.ts:346-348`, used at `:373`. Re-ran `probe.mjs` at 2,000 cues over 10 families × {raw, fdx} × {`/api/scriptide/doctor`, `/api/export/verify`} = **40/40 HTTP 400 in 4–361 ms**, caret families included (`caretTight` 4–34 ms, `caret` 4–24 ms; both were 200/2,894–5,161 ms before). |
| 1 | 120-combination grammar-product implication test; loose regex alone does *not* cover the caret | `tests/security/…-parity.test.ts:135-186`. Ran the file: **242 pass / 0 fail**, exit 0. The `assert.doesNotMatch(sample, CUE_LIKE_LINE_RE)` rows are what make the `\|\|` load-bearing, and they pass — so the disjunct is doing real work, not decoration. |
| 1 | caret family in the HTTP bypass tests | `tests/routes/…-bypass.test.ts` now **32 pass / 0 fail** (was 20), exit 0 — 8 families × 2 formats × 2 routes. |
| 2 | fixture sweep via `git ls-files` | `…-parity.test.ts:196-202` (`execFileSync('git', ['ls-files','-z','--','*.fountain'], {cwd: REPO_ROOT})`). I ran the identical command at both roots, with **9 sibling worktrees physically present** under `.claude/worktrees`: `/home/user/STORYMACHINE` → **54 / 12 / 20**; the worktree → **54 / 12 / 20**. The old filesystem walk at the same root still gives 511 / 96 / 200. Fixed, and fixed at the root cause. |
| 3 | fuzz `attack()` gains `expectStatus`, `record()` flags `UNEXPECTED-STATUS` | `scripts/fuzz-routes.mjs:88-107` (the flag ladder now tests `expectStatus` *before* the latency test, so a fast wrong-status 200 flags) and `:113-121`; all 20 cue-bypass `attack()` calls pass `400`. Reading the ladder: against the unfixed guard a 200 would now flag regardless of latency. Correctly placed. |
| 4 | `QUICK ? 1600 : 2000`; "54" corrected | `scripts/fuzz-routes.mjs:337`; the dead ternary is gone and the choice is explained. |
| — | receipt still clean | `node scripts/check-scoring-receipt.mjs main..HEAD` → "no scoring-path files changed. OK.", exit 0. |

**I could not find a remaining shape that `CHARACTER_CUE_RE` accepts and the guard misses** — which
is what the `||` guarantees by construction, and the 120-row product test now checks.

One honest qualification on the comment copy. This repo has **three** cue predicates, not one, and
the guard is a provable superset of only the one it names. Cross-checking all three
(`scratchpad/reviews/guardcheck2.mjs`):

```
shape                  guard  fountain.ts  normalizer  fountain-analyzer   2000-line guard verdict
caret tight            YES    YES          no          no                  REJECT
(cont'd) LOWERCASE     no     no           YES         YES                 *** PASS ***
(fuera de campo)       no     no           YES         YES                 *** PASS ***
(beat) lowercase       no     no           YES         YES                 *** PASS ***
```

`server/nvm/analyze/screenplay-normalizer.ts:56-79` (`isCharacterCue`) and
`server/nvm/analyze/fountain-analyzer.ts:808-812` (`CUE_LINE_RE`) both accept a lowercase
parenthetical tail — `NAME (cont'd)` is extremely common in real scripts — and the guard counts none
of them. I measured whether that is a cost vector: it is **not**. 1,000 / 2,000 / 4,000 such lines
cost 1,877 / 529 / 607 ms (flat, not quadratic), versus the caret shape's 1,752 / 2,200 / 12,142 ms.
So the doctor's O(n²) cost lives on the `src/lib/fountain.ts` `parseFountain` path the guard now
supersets, and picking `CHARACTER_CUE_RE` as the disjunct was the right choice. But
`validation.ts:311-313` says the guard "structurally cannot under-count anything the real analyzer
parses as a cue", and that sentence is broader than what was proved. Copy nit, not a defect.

## R2. Attacking the new bound — **it does not bound cost**

`MAX_FOUNTAIN_CUE_WEIGHT = 10_000_000` on `distinct × occurrences`
(`server/lib/validation.ts:319`, checked at `:379-381`). The lane's calibration grid varied
`distinct ∈ {50, 200, 800, 1500}` at `repeats ∈ {1, 5, 20}` — so the largest occurrence count it ever
sampled was 30,000, and every high-occurrence sample also had high `distinct`. The corner it never
visited is *low distinct, high occurrences*, and that is where the cost is. I walked the
weight ≈ 9.9M iso-curve (`scratchpad/reviews/weight.mjs`, `weight3.mjs`), all `POST
/api/scriptide/doctor`, all under the express 1 MB body cap, **all accepted by both bounds**:

| distinct | occurrences | weight | JSON body | status | ms |
|---|---|---|---|---|---|
| 1,500 | 6,000 (= ×4 repeats) | 9.00M | 54,689 | 200 | 1,651 |
| 1,500 | 6,600 | 9.90M | 60,053 | 200 | 1,349 |
| 1,000 | 9,900 | 9.90M | 88,757 | 200 | 1,496 |
| 600 | 16,500 | 9.90M | 197,026 | 200 | 8,670 |
| 300 | 33,000 | 9.90M | 293,057 | 200 | 7,366 |
| **400** | **24,750** | **9.90M** | **294,802** | **200** | **199,581** |
| **200** | **49,500** | **9.90M** | **585,106** | **200** | **157,181** |

Server-side confirmation, from the process's own log (not my client clock):
`{"path":"/api/scriptide/doctor","status":200,"ms":157054}` — and a second, independent
legal payload at the same 9.90M weight (distinct=400, occurrences=24,750, a 294,802-byte body) took
**199,581 ms**. Two different points on the bound, both over two and a half minutes.

Same "weight" the bound was calibrated to keep "comfortably under ~10s"
(`validation.ts:305-310` states exactly that); **157–200 seconds**, 15–20× the stated ceiling and 4× worse
than the 39 s legal request the bound was introduced to close. The audit's original finding — one
unauthenticated request burning minutes of front-door CPU — is still reproducible after this fix; it
has been moved, not closed. Two payloads with 4.5× *less* weight than the lane's own worst grid row
(45M → 32.7 s in-process) cost **5× more** wall time, which is a directional inversion that load
noise cannot explain.

**The same result in-process, with the lane's own harness** (`runScriptDoctor` called directly, no
HTTP, no worker pool — `scratchpad/reviews/inproc.mjs`), which removes every objection about my
client clock, express, or the worker pool:

| payload | weight | guard verdict | in-process ms |
|---|---|---|---|
| 1,500 distinct × 30,000 occurrences — the lane's own worst grid row | 45.0M | **REJECT** | 30,950 |
| 400 distinct × 24,750 occurrences | 9.90M | **ACCEPT** | **215,687** |
| 1,500 distinct × 6,600 occurrences | 9.90M | ACCEPT | 10,441 |

My harness reproduces the lane's own recorded number for that grid row to within 5 % (30,950 ms vs
the 32,684 ms at `validation.ts:294`), so this is not a harness artifact. The bound therefore
**rejects a 31-second payload and accepts a 216-second one**, and two payloads at the *identical*
9.90M weight differ in cost by 21× (10.4 s vs 215.7 s). `distinct × occurrences` does not determine
cost, so it cannot bound it.

The cost driver is total cue-line **occurrences** (document length in cue lines), not the product:
along a fixed 9.9M weight, dropping distinct from 1,500 to 200 while raising occurrences from 6,600
to 49,500 moved the cost by two orders of magnitude. A direct cap on occurrences would close it: my
plausible feature-length scripts (§R3) top out at **7,200** occurrences, so a bound anywhere in the
15,000–20,000 range has an order of magnitude of headroom over real writing and puts the worst legal
request back under ~10 s.

Two smaller notes from the same sweep:
* An `express.json({ limit: '1mb' })` cap (`server/app.ts`, cited at `validation.ts:1214`) fires
  before `MAX_FOUNTAIN_CHARS` on newline-dense payloads — 855,377 chars → **HTTP 413 in 29 ms**. So
  the practical ceiling on this route is ~700–800 k chars, not 900 k. Good news, and worth
  mentioning because it bounds the exploit rather than the guard doing so.
* Cost shapes with **no cue lines at all** (tens of thousands of `INT.` scene headings — which the
  guard skips outright at `validation.ts:371` — bare `(beat)` parentheticals, 600 k of lowercase
  action prose, one cue plus a 600 k-char dialogue block) were still in flight when I stopped the
  sweep to keep the box usable; the two that completed earlier in the pass were unremarkable. I am
  not claiming those are clean, only that I did not finish measuring them. That gap belongs in the
  lane's next measurement, not in mine.

## R3. A real feature-length script is not rejected — but the documented margin is ~10× optimistic

I reproduced the lane's own numbers exactly: the committed test logs
`realistic feature: distinct=80 occurrences=4000 words=29920 scenes=120 weight=320000 margin=31.3x`
and `worst committed fixture … weight=357 margin=28011x`. Both are real.

But that synthetic has **zero all-caps action lines and zero `(V.O.)`/`(CONT'D)` cue variants** —
i.e. the cleanest possible shape. I synthesized the top-of-range script the coordinator asked for,
with the furniture real specs carry (`scratchpad/reviews/feature2.mjs`):

| script | chars | words | distinct | occurrences | weight | vocab margin | cost margin | verdict |
|---|---|---|---|---|---|---|---|---|
| ideal: 80 names, 4,000 cues, no caps action, no extensions | 114,130 | 20,040 | 80 | 4,000 | 320,000 | 18.8× | 31.3× | accepted |
| plausible: 100 names, 6,000 cues, 2 caps lines/scene, extensions | 187,940 | 32,571 | 520 | 6,300 | 3,276,000 | 2.9× | **3.1×** | accepted |
| caps-rich: 6 caps lines/scene, extensions | 206,810 | 36,216 | 520 | 6,900 | 3,588,000 | 2.9× | 2.8× | accepted |
| caps-rich, 200 scenes | 220,350 | 38,888 | 520 | 7,200 | 3,744,000 | 2.9× | 2.7× | accepted |
| action spec: 60 names, 2,500 cues, 12 caps lines/scene, 200 scenes | 161,069 | 29,729 | 318 | 4,900 | 1,558,200 | 4.7× | 6.4× | accepted |

Nothing plausible is rejected — good. But the true margin on a normal feature is **~3×, not 31×**,
because `(CONT'D)`/`(V.O.)`/`(O.S.)` variants triple the distinct-line count and caps action adds
more. `validation.ts:311-317` and the test's `assert.ok(margin >= 25)` both encode the optimistic
number as if it were the general one. Copy that overclaims safety by 10× is the kind of thing lane
standard §2 ("copy tells the truth") is about.

## R4. New finding: dropping the 40-char cap created a false-rejection surface

The follow-up brief ordered the 40-char cap removed, and it was — correctly, since the analyzer has
no cap. The side effect is that **long ALL-CAPS action lines now count as cue-shaped**, and they did
not before. Measured on a caps-heavy 200-scene action feature (174,010 chars, 31,400 words, eight
long ALL-CAPS emphasis lines per scene — heavy, but a shape real action specs have;
`scratchpad/reviews/oldnew2.mjs`):

```
 OLD guard regex   : distinct=  60  occurrences=2400  weight=  144,000  -> accept
 NEW isCueLikeLine : distinct=1,660 occurrences=4000  weight=6,640,000  -> REJECT (vocabulary bound)
```

The binding constraint is the *pre-existing* 1,500-distinct bound, not the new weight bound — but the
script only reaches it because of this lane's cap removal, so the lane owns the regression. A writer
hits it at roughly ten distinct long all-caps lines per page sustained across a feature, which is
rare but not fabricated, and the 400 they get says their script "must not contain more than 1500
distinct all-caps character-cue-shaped lines" — true but incomprehensible to the person it happens
to. No committed fixture is anywhere near this (max 9 distinct), so nothing tests the boundary.

## R5. Verdict

**REVISE.** Revisions 1–4 from the first pass are closed and I could not reopen any of them; the
`||`-superset construction plus the 120-row implication test is the right fix and is exactly the
stronger version §4 asked for. What remains:

1. **`server/lib/validation.ts:319` / `:379-381` — `MAX_FOUNTAIN_CUE_WEIGHT` does not bound cost.**
   `distinct × occurrences = 9,900,000` (under the 10,000,000 bound) with distinct=200,
   occurrences=49,500, a 585,106-byte body, returns HTTP 200 after **157,181 ms** (server-logged
   `ms:157054`); a second point on the same bound (distinct=400, occurrences=24,750) took
   **199,581 ms**. In-process, with the lane's own harness, that second payload costs **215,687 ms**
   while the 45.0M-weight payload the bound REJECTS costs **30,950 ms** — the guard rejects the
   31-second request and accepts the 216-second one, and two payloads at the identical 9.90M weight
   differ by 21× (10,441 ms vs 215,687 ms). The calibration grid at `:281-296` never sampled the
   low-distinct/high-occurrence corner, so the constant was fitted where the cost is not. Add a
   direct cap on cue-line occurrences (15,000–20,000 leaves ≥2× headroom over the 7,200 my worst
   plausible feature reaches), keep the product bound if you like, and re-measure along the
   iso-weight curve — not only along `repeats`. Until this is done the comment at `:305-310` ("the
   worst LEGAL request under the new bound stays comfortably under ~10s on this box") is false by
   15×, and the audit's original finding is still live.

2. **`server/lib/validation.ts:311-317` and `tests/security/…-parity.test.ts` `margin >= 25`
   assertion — the documented margin is measured on the cleanest possible script.** A plausible
   120-page feature with `(CONT'D)`/`(V.O.)` variants and ordinary caps action has a **3.1×** cost
   margin and a 2.9× vocabulary margin, not 31.3× / 18.8×. Either synthesize the realistic shape in
   the margin proof and document *that* number, or say explicitly that 31.3× is the clean-script
   best case. Same file: the Part-3 comment says "Documented as >55,000x … (max observed weight
   around 9 distinct x ~20 occurrences = 180)" while `validation.ts` and the test's own log both say
   28,011× at weight 357 — stale comment, pick one number.

3. **New false-rejection surface from the 40-char-cap removal (no file to point at — it needs a test
   and a boundary decision).** A caps-heavy 200-scene action feature that the old guard accepted
   (60 distinct) is now rejected (1,660 distinct). Add a fixture at the boundary so the behaviour is
   pinned rather than discovered by a writer, and either raise the vocabulary bound for long lines,
   exclude lines over some word count from the *vocabulary* bound while keeping them in the cost
   bound, or state in the rejection message what shape actually tripped it.

4. **Copy nit, `server/lib/validation.ts:311-313`.** "structurally cannot under-count anything the
   real analyzer parses as a cue" — true for `src/lib/fountain.ts`'s `CHARACTER_CUE_RE`, which is
   the one that carries the cost, but `screenplay-normalizer.ts`'s `isCharacterCue` and
   `fountain-analyzer.ts`'s `CUE_LINE_RE` both accept lowercase-parenthetical cues (`NAME (cont'd)`)
   that the guard does not count. I verified those are not a cost vector (flat, 380–1,877 ms at
   1,000–4,000 lines), so this is wording, not a hole — but say "the parser's cue test", not "the
   real analyzer".

Item 1 is merge-blocking: it is the finding the round-3 work exists to close, the fix's own comment
asserts a number that is 15× off, and the exploit reproduces on the built branch. Items 2–4 are
truth-in-copy and coverage, and can ride along with the item-1 revision.

### R2b. The two payloads the first review named ARE fixed (coordinator's explicit ask)

Timed against the built branch (`scratchpad/reviews/repeats.mjs`), 1,500 distinct cues repeated:

```
1500 distinct x  4 repeats  occ= 6000 weight= 9.0M chars=103577 | guard=ACCEPT scan= 8.5ms | HTTP 200 in 7562ms
1500 distinct x 20 repeats  occ=30000 weight=45.0M chars=517817 | guard=REJECT scan=19.1ms | HTTP 400 in   28ms
1500 distinct x 34 repeats  occ=51000 weight=76.5M chars=880277 | guard=REJECT scan=24.2ms | (880k chars exceeds
                                                                  the 1MB JSON body cap; guard rejects first)
```

Both payloads the first review measured are closed: ×20 went from **39,110 ms / HTTP 200** to
**28 ms / HTTP 400**, and ×34 went from *no response at all* to a guard rejection after 24 ms of
scan — the lane's "~20 ms" claim reproduces. The incremental check at `validation.ts:379-381` does
fire long before the end of the document, exactly as its comment says.

So the round-3 fix **closes the specific payloads it was aimed at. It does not close the class** —
the neighbouring corner (fewer distinct cues, far more occurrences) is untouched and costs 216 s
in-process, as §R2 measures. That is the difference between the bound being effective and the bound
being correct, and it is why revision 1 in §R5 stands.

**Scope note for this pass (coordinator's budget change):** I did not run `npm test`, the browser
battery, or `npm run fuzz-routes` in the re-review. What I ran: the two guard test files
(242 pass / 32 pass, both exit 0), the `git ls-files` sweep from a root-shaped layout, the caret
family end-to-end, the 1,500×{4,20,34} payloads above, the adversarial legal-payload timings
(HTTP and in-process), the realistic-feature margin sweep, and `check-scoring-receipt` (exit 0).

---

# Re-review #2 (2026-09-05) — commit `cc405ccb`, rebased on `ed87d8a6`

**Scope:** three commits, 4 files, +1167/−26. Budget-limited pass: no `npm test`, no browser battery,
no `fuzz-routes`. **Worktree `git status --porcelain` empty at the end; the one server I started
(port 39161) is killed.**

**Conditions note, and this time it matters in the lane's favour and against it:** the box was
**idle** for this pass — load average **1.45–1.70** on 4 CPUs, versus 12.7–16.2 in my previous two
passes. Every number below is therefore a clean measurement, not a contended one.

**Verdict: REVISE.** The three-bound design does what the lane says it does against every
*cue-shaped* payload — the worst legal one I can build fell from **215.7 s to 12.5 s**. But the
context check added to fix my §R4 finding opened a **complete bypass of all three bounds**: a
double-spaced script makes the guard count **zero** cue lines while the analyzer scores **12,000** of
them. Measured **HTTP 200 in 90,575 ms**.

## RR1. What reproduces

Both guard test files, run by me: parity **244 pass / 0 fail**, HTTP bypass **36 pass / 0 fail**,
both exit 0. The logged margins reproduce verbatim:

```
plausible feature: distinct=520 occurrences=6332 words=48124 scenes=120 weight=3292640
                   frequentCount=8 vocabMargin=2.9x weightMargin=3.0x frequentMargin=6.3x
worst committed fixture by frequent-count: data/screenplays/two-lane.fountain frequentCount=2 margin=25x
```

The two iso-weight exploit points from Re-review #1 and the old 45M point now reject, by the bounds
the lane claims (`scratchpad/reviews/attack3.mjs`):

| payload | distinct | occ | frequent | weight | verdict |
|---|---|---|---|---|---|
| D=200 × 49,500 (my 157 s exploit) | 200 | 49,400 | 200 | 9.88M | REJECT — frequent-cue-lines |
| D=400 × 24,750 (my 216 s exploit) | 400 | 24,400 | 400 | 9.76M | REJECT — frequent-cue-lines |
| D=1,500 × 20 (the 45M point) | 1,500 | 30,000 | 1,500 | 45.0M | REJECT — weight |

The `low-tide-bad.fountain` rationale also holds: the worst committed fixture by frequent-count is
`data/screenplays/two-lane.fountain` at 2, a 25× margin. A count-of-frequent-lines bound genuinely
does not care that a two-hander's two characters each speak 25 times, which is what killed the
average-ratio version. That reasoning is sound and the fixture evidence is real.

## RR2. The context check does not under-count — verified

I checked the `nextLineIsDialogue` condition (`server/lib/validation.ts:515`) against
`parseFountain`'s own cue-block condition on six shapes (`scratchpad/reviews/ctx.mjs`):

```
shape                              guardCounted  parserCueBlocks
cue + dialogue (baseline)                 1               1
cue + parenthetical + dialogue            1               1
cue + blank + dialogue                    0               0
cue + trailing-space line                 0               0
cue at very end of file                   0               0
cue + dialogue, CRLF                      1               1
```

Exact agreement, including the two the coordinator named (parenthetical follows: still counted;
blank line follows: not counted, and the parser agrees). Relative to `CHARACTER_CUE_RE` plus the
parser's context, there is no under-count.

## RR3. The cue-shaped attack surface is genuinely bounded now

Worst-case search under the three bounds, timed in-process on the idle box
(`scratchpad/reviews/time3.mjs`) — every row **accepted** by the guard:

| shape | distinct | occ | frequent | chars | in-process ms |
|---|---|---|---|---|---|
| uniform D=400, 15 each | 400 | 6,000 | 0 | 47,477 | 1,479 |
| uniform D=816, 15 each (weight 9.99M — max under weight with 0 frequent) | 816 | 12,240 | 0 | 97,397 | 5,439 |
| two-hander D=2 × 55,000 each | 2 | 110,000 | 2 | 770,017 | 10,168 |
| 50 majors × 1,900 + 50 minors × 15 (frequent = **exactly** the bound) | 100 | 95,750 | 50 | 792,827 | **12,539** |

**The worst legal cue-shaped request I can build is ~12.5 s**, at 793 KB — down from 215.7 s in
Re-review #1. Every corner the coordinator named (many lines just under the frequency threshold, a
two-character script with huge occurrence counts, the 100–150 danger band at exactly 15 each) is
covered by one of the three bounds or is simply not expensive. That is a real, measured improvement
and the frequent-line bound deserves the credit.

## RR4. **BYPASS FOUND — the double-spaced shape defeats all three bounds**

The context check is correct with respect to the parser, and that is exactly the problem: the guard
runs on the text as POSTed, while the doctor scores the text **after
`server/nvm/analyze/screenplay-normalizer.ts`'s `normalizeScreenplay()` reflows it**. A
double-spaced import — `CUE`, blank line, dialogue, blank line — is the shape that normalizer exists
to repair, and it is invisible to `nextLineIsDialogue`.

Root cause, measured end to end (`scratchpad/reviews/why.mjs`), on a payload of 400 distinct names ×
30 repeats written as `NAME\n\nx\n\n`:

```
payload chars 94937            guard verdict: ACCEPT
parser cue blocks BEFORE normalization: 0
normalizeScreenplay() -> 82936 chars
parser cue blocks AFTER  normalization: 12000
guard verdict on the NORMALIZED text: REJECT (MAX_FOUNTAIN_FREQUENT_CUE_LINES)
```

The guard's own logic is right — applied to the string the analyzer actually scores, it rejects this
payload. It never sees that string.

Cost, on the **idle** box:

```
in-process runScriptDoctor : 92,764 ms      (chars 106,937; guard counts distinct=0 occ=0 frequent=0 weight=0)
POST /api/scriptide/doctor : HTTP 200 in 90,575 ms, full report returned
                             (jsonBytes 154,954 — 15% of the express 1MB cap; chars 106,937 — 12% of
                              MAX_FOUNTAIN_CHARS)
```

So: one unauthenticated 155 KB request, no error path, **90 seconds of CPU**, all three bounds
reading zero. This is 7× worse than the worst legal cue-shaped payload (RR3) and it uses an eighth of
the available document budget, so it is not near a ceiling — I did not measure how far it scales
because the finding is binary.

**The lane's own comment asserts this shape is safe.** `server/lib/validation.ts` (the
`nextLineIsDialogue` block) says the context check "never under-counts the actual attack surface"
because "the pathological shapes this guard targets (`CUE\nLine.\n`, **`CUE\n\nLine.\n\n`**, and
their Unicode/caret/tail variants) all have real dialogue immediately following". `CUE\n\nLine.\n\n`
has a **blank line** between the cue and the dialogue — it does not have dialogue immediately
following, it is not counted, and it is the bypass. That sentence is the justification for the
change and it is false.

This also matters beyond a synthetic attack: double-spaced text is what real PDF and FDX imports
produce (it is why `isDoubleSpaced` exists), so the shape reaches these routes through the ordinary
upload path, not only through a hand-built POST.

## RR5. Verdict

**REVISE.** One blocking item.

1. **`server/lib/validation.ts` — the guard runs on pre-normalization text while the analyzer scores
   post-normalization text, and the `nextLineIsDialogue` check turns that gap into a complete
   bypass.** A double-spaced payload (`NAME\n\nx\n\n`, 400 distinct × 30) is scored with
   **distinct=0, occurrences=0, frequent=0, weight=0** by all three bounds and returns **HTTP 200
   after 90,575 ms** (92,764 ms in-process, idle box, 106,937 chars = 12% of the ceiling). The same
   guard applied to `normalizeScreenplay()`'s output rejects it. Options, in the order I would try
   them: (a) count a cue line when the next line is non-blank **or** the next non-blank line is
   separated by exactly one blank — which re-admits the double-spaced shape without re-admitting the
   caps-heavy action lines that motivated the check, since those are followed by a blank line **and**
   another action paragraph, not by dialogue; (b) run the shape guard on the normalized text at each
   call site; (c) normalize inside the guard before counting. Whichever is chosen, pin it with a
   fixture built from the double-spaced shape and assert it is rejected — the current test suite has
   no double-spaced payload in it, which is why 244 + 36 passing tests did not catch this.
   And correct the comment: `CUE\n\nLine.\n\n` does **not** have dialogue immediately following.

2. **Non-blocking, carried from Re-review #1 §R5 and still open:** the documented plausible-feature
   margins are now honestly measured and logged (2.9× / 3.0× / 6.3×) — that is fixed. The stale
   ">55,000x" comment in the parity test's Part 3 was still present when I read it; make it agree
   with the 28,011× the same file logs.

Everything else in the lane is in good shape: the `||`-superset construction, the 120-row implication
product, the `git ls-files` sweep, `expectStatus` in the fuzz lane, the frequent-line bound's
reasoning and its `low-tide-bad.fountain` evidence, and a worst legal cue-shaped request of 12.5 s.
Fix item 1 and I expect to return MERGE.

---

# Re-review #3 (2026-09-05) — commit `9f171a5c`

Budget-limited: no `npm test`, no browser battery, no `fuzz-routes`. Box was **idle**
(load 0.25–2.04), so these are clean numbers. Worktree clean at the end; the one server I started
(port 39173) is killed.

**Verdict: REVISE.** The double-spaced fix is real and well-built — but it is scoped to **exactly one
blank line**, while the normalizer it is compensating for fires on **any number**. The identical
payload with **two** blank lines instead of one is accepted and returns **HTTP 200 in 85,388 ms**.

## RR3-1. What is genuinely fixed

`server/lib/validation.ts:524-529` now reads:

```
const immediateDialogue    = i < lines.length - 1 && lines[i + 1]!.trim() !== '';
const oneBlankThenDialogue = i < lines.length - 2
  && lines[i + 1]!.trim() === ''
  && lines[i + 2]!.trim() !== ''
  && !isCueLikeLine(lines[i + 2]!.trim());
const nextLineIsDialogue = immediateDialogue || oneBlankThenDialogue;
```

Everything the coordinator asked me to re-check passes (`scratchpad/reviews/mismatch.mjs`,
`legit.mjs`, `caps2.mjs`), each at 600 distinct × 20 = 12,000 cue occurrences:

| shape | guard | cues after `normalizeScreenplay` |
|---|---|---|
| single-spaced (control) | REJECT | 12,000 |
| **double-spaced (the RR#2 bypass)** | **REJECT** | 12,000 |
| CRLF double-spaced | REJECT | 12,000 |
| cue, blank, parenthetical, dialogue | REJECT | 12,000 |
| tab-only "blank" line | REJECT | 12,000 |
| NBSP-only "blank" line | REJECT | 12,000 |
| double-spaced with ALL-CAPS "dialogue" | ACCEPT | 1 (not a cost vector) |
| every line cue-shaped, double-spaced | ACCEPT | 1 (not a cost vector) |

The RR#2 payload rejects at the route in **99 ms** (the lane claims 63 ms; same order, idle box), and
**9 ms** measured on the guard function alone. The `!isCueLikeLine(...)` exclusion is load-bearing and
correctly aimed: the two shapes it lets through both normalize to a single cue block, so excluding
them costs nothing.

No false rejections: all **54** tracked `.fountain` fixtures pass; a legitimate double-spaced
two-hander (PAUL/JUNE × 60) is **ACCEPTED**; the caps-heavy action feature from my §R4 finding is
**ACCEPTED** with a realistic skewed cast (32 distinct, 2,400 occurrences, 32 frequent), including
the caps-heavy **and** double-spaced combination. Test files: parity **246 pass / 0 fail**, HTTP
bypass **41 pass / 0 fail**, both exit 0, and both now carry double-spaced regressions
(`ok 6` rejects the 12,000-occurrence double-spaced script, `ok 7` accepts the legitimate two-hander).
The plausible-feature margins reproduce verbatim (2.9× / 3.0× / 6.3×).

## RR3-2. **BYPASS FOUND — the fix is off by one blank line**

`normalizeScreenplay`'s trigger, `isDoubleSpaced` (`screenplay-normalizer.ts:112-123`), asks only
whether **the line after a cue is blank** — it does not care how many blanks follow. So it fires on
two, three, or five blank lines exactly as it fires on one, and reflows all of them into cue+dialogue
pairs. The guard's new clause matches only `gap === 1`.

Sweep at 600 distinct × 20 (`scratchpad/reviews/blanks.mjs`):

```
blanks between cue and dialogue | chars  | guard          | cues after normalizeScreenplay
  1 blank line                     95,297  REJECT            12,000
  2 blank lines                   119,297  *** ACCEPT ***    12,000
  3 blank lines                   143,297  *** ACCEPT ***    12,000
  4 blank lines                   167,297  *** ACCEPT ***    12,000
  5 blank lines                   191,297  *** ACCEPT ***    12,000
```

Cost, on the exact RR#2 exploit shape (400 distinct × 30 = 12,000 occurrences), idle box
(`scratchpad/reviews/time6.mjs`):

```
400x30, 2 blanks  chars=130,937  guard=ACCEPT  cuesRaw=0  cuesAfterNorm=12,000  runScriptDoctor 96,936 ms
400x30, 3 blanks  chars=154,937  guard=ACCEPT  cuesRaw=0  cuesAfterNorm=12,000  runScriptDoctor 98,295 ms
```

At the route, the two spellings side by side (`scratchpad/reviews/httpB.mjs`):

```
1 blank line : chars=106,937 jsonBytes=154,954  HTTP 400 in     99 ms
2 blank lines: chars=130,937 jsonBytes=202,954  HTTP 200 in 85,388 ms  (full report returned)
```

One unauthenticated 203 KB request — 20 % of the express 1 MB cap, 15 % of `MAX_FOUNTAIN_CHARS` —
still burns **85 seconds** of front-door CPU, with all three bounds reading zero. This is the same
finding as §RR4, displaced by one character.

*Correction to my own working:* an earlier run of this measurement used a base-36 random salt for the
cue prefix, which can start with a digit and is therefore not cue-shaped at all; that run reported
1,742 ms and was invalid. The numbers above use a guaranteed letter-leading prefix and were
re-measured.

## RR3-3. The fix that does work — verified

The obvious generalisation — advance past **all** consecutive blank lines instead of exactly one,
keeping the `!isCueLikeLine(target)` exclusion — closes it with no collateral damage. Simulated
read-only against the current rule (`scratchpad/reviews/proposed.mjs`):

| case | current rule | proposed (skip all blanks) |
|---|---|---|
| exploit, 1 blank | REJECT (frequent) | REJECT (frequent) |
| exploit, 2 blanks | **ACCEPT** | REJECT (frequent) |
| exploit, 3 blanks | **ACCEPT** | REJECT (frequent) |
| caps-heavy action feature | ACCEPT | **ACCEPT** |
| legitimate double-spaced two-hander | ACCEPT | **ACCEPT** |

and over all 54 tracked fixtures the proposed rule rejects **0**. The caps-heavy case stays safe for
the same reason it is safe today: an ALL-CAPS action line's next non-blank neighbour is *another*
cue-shaped line, so the exclusion still fires however many blanks separate them.

## RR3-4. Verdict

**REVISE.** One blocking item.

1. **`server/lib/validation.ts:525-528` — `oneBlankThenDialogue` matches a gap of exactly one blank
   line; `isDoubleSpaced`/`normalizeScreenplay` fire on any gap ≥ 1.** The RR#2 exploit written with
   two blank lines instead of one is accepted with distinct=0/occurrences=0/frequent=0 and returns
   **HTTP 200 in 85,388 ms** (96,936 ms in-process; 98,295 ms at three blanks). Replace the fixed
   `i + 1`/`i + 2` probe with a scan forward over all consecutive blank lines, keeping the
   `!isCueLikeLine(...)` exclusion — verified above to close 2 and 3 blanks, keep the caps-heavy
   feature and the legitimate double-spaced two-hander accepted, and reject none of the 54 tracked
   fixtures. Pin it with a fixture at gap = 2 (and ideally a small property test over gap ∈ 1..5),
   since the two new double-spaced regressions both use gap = 1 and therefore cannot catch this.

2. **Non-blocking, unchanged from Re-review #2:** the parity test's Part-3 ">55,000x" comment still
   contradicts the 28,011× the same file logs.

Everything else is in good shape and I have nothing further to add to it: the `||`-superset
construction, the 120-row implication product, the `git ls-files` sweep, `expectStatus`, the
frequent-cue-line bound (worst legal cue-shaped request ~12.5 s), the `!isCueLikeLine` exclusion, and
the no-false-rejection evidence. Fix item 1 — it is a few lines in one predicate — and I expect to
return MERGE.

---

# Re-review #4 (2026-09-05) — commit `5d2b2638` (five commits on `58eaafbf`)

Budget-limited: guard test files plus my own probes only. Box idle (load 0.06–1.50). Worktree clean
at the end; the one server I started (port 39185) is killed.

**Verdict: MERGE.**

## RR4-1. The gap sweep — closed at every width

`server/lib/validation.ts:539-552` now scans forward past every consecutive blank line, applying the
not-cue-shaped exclusion only on the blank-gap path and leaving the gap=0 case matching the parser's
own condition unconditionally. My RR#3 exploit (400 distinct × 30 = 12,000 occurrences)
at every gap width (`scratchpad/reviews/rr4.mjs`):

| gap | chars | guard | cues after `normalizeScreenplay` |
|---|---|---|---|
| 0 | 82,937 | REJECT | 1 |
| 1 | 106,937 | REJECT | 12,000 |
| **2** | **130,937** | **REJECT** (was ACCEPT / 96,936 ms) | 12,000 |
| **3** | **154,937** | **REJECT** (was ACCEPT / 98,295 ms) | 12,000 |
| 4 | 178,937 | REJECT | 12,000 |
| 5 | 202,937 | REJECT | 12,000 |

At the route (`scratchpad/reviews/httpC.mjs`), gaps 0–5: **HTTP 400 in 115 / 15 / 11 / 18 / 24 /
25 ms**. The lane's claimed 52/20/21 ms for gaps 1–3 reproduces.

Whitespace-only gap lines — the other half of the coordinator's ask — all reject too: a tab-only
line, an NBSP-only line, a mixed tab+NBSP line, two consecutive whitespace-only lines, and a
whitespace line followed by a real blank. All **REJECT**, all with 12,000 cues after normalization.

## RR4-2. No under-count; over-counting only where it is allowed

A cue whose next non-blank line is a heading or transition (`scratchpad/reviews/rr4.mjs` §C), guard
vs. what `parseFountain` actually calls a cue:

| shape | guard counts it | parser calls it a cue | direction |
|---|---|---|---|
| `BOB`, blank, `INT. NEXT ROOM - DAY` | no | no | agree |
| `BOB`, blank, `FADE OUT.` | no | no | agree |
| `BOB`, blank, `.BACK ALLEY` | YES | no | over-count (allowed) |
| `BOB`, blank, `CUT TO:` | YES | no | over-count (allowed) |
| `BOB`, blank, `DISSOLVE TO:` | YES | no | over-count (allowed) |
| `BOB`, blank, `he walks away.` | YES | no | over-count (allowed) |

**No under-count in any of them.** The four over-counts are the guard's stated conservative
direction, and they do not cost anything at feature scale — see the next section, where a
200-scene caps-heavy feature *with* a `CUT TO:` after every scene is still accepted.

## RR4-3. No false rejections

`scratchpad/reviews/rr4.mjs` §D–E, all **ACCEPTED**:

* caps-heavy action feature (200 scenes, 8 long ALL-CAPS emphasis lines each, realistic skewed cast)
  at gaps 0, 1 and 2 — and the same feature with a `CUT TO:` transition after every scene, at all
  three gaps;
* the legitimate double-spaced two-hander (PAUL/JUNE × 60) at gaps 0, 1 and 2;
* all **54** tracked `.fountain` fixtures — 0 rejected.

Test files: parity **257 pass / 0 fail**, HTTP bypass **53 pass / 0 fail**, both exit 0 — matching
the lane's claimed counts. `node scripts/check-scoring-receipt.mjs main..HEAD` → "no scoring-path
files changed", exit 0.

## RR4-4. One last attack — the not-cue-shaped exclusion is not exploitable

The exclusion is the only remaining way to make the guard skip a cue, so I aimed at it directly: put
a cue-shaped line where the dialogue belongs, so the real cue is suppressed, and let the normalizer
reflow it back (`scratchpad/reviews/rr4b.mjs`, `rr4c.mjs`, `rr4d.mjs`). Three shapes do get past the
guard this way and do normalize into 12,000–24,000 cue blocks across 400 distinct names — the same
counts as the RR#3 exploit — so I timed all of them against `runScriptDoctor`:

| shape | chars | guard | cue blocks / distinct after normalize | doctor ms |
|---|---|---|---|---|
| `NAME_i` / blank / `HELLO` / blank / `x` | 190,937 | ACCEPT | 12,000 / 400 | **1,902** |
| `NAME_i` / blank / `HELLO` / 2 blanks / `x` | 202,937 | ACCEPT | 12,000 / 400 | **2,290** |
| same cycle scaled to 24,000 occurrences | 381,857 | ACCEPT | 24,000 / 400 | **3,743** |
| same cycle with realistic-length dialogue | 862,937 | ACCEPT | 12,000 / 400 | **2,408** |
| `NAME_i` / blank / `.SOMEWHERE` | 214,937 | REJECT | — | — |
| `NAME_i` / blank / `CUT TO:` | 178,937 | REJECT | — | — |
| every line cue-shaped, double-spaced | 154,937 | ACCEPT | 1 | — |

Post-normalization cue count is **not** on its own the cost driver — these carry the same 400×12,000
shape that cost 96,936 ms in RR#3 and they run in 1.9–3.7 s, including one at 862,937 chars, which is
96 % of `MAX_FOUNTAIN_CHARS`. So the exclusion lets shapes through, but not expensive ones. **The
worst payload I can now build that the guard accepts is 3,743 ms.**

## RR4-5. Verdict

**MERGE.**

Every finding I raised across four passes is closed, and I verified each closure myself rather than
taking the report's word for it:

| pass | finding | state |
|---|---|---|
| §5.1 | caret / dual-dialogue bypass | closed — `isCueLikeLine` is a provable superset, checked by a 120-row grammar product |
| §5.2 | fixture sweep failed from the repo root | closed — `git ls-files`, verified 54/12/20 at a root with 9 sibling worktrees |
| §5.3 | fuzz cases could not fail | closed — `expectStatus` / `UNEXPECTED-STATUS` |
| §5.4 | dead ternary, wrong fixture count | closed |
| §R5.1 | weight bound did not bound cost (216 s legal) | closed — frequent-cue-line bound; worst legal cue-shaped request 12.5 s |
| §R5.2 | documented margins ~10× optimistic | closed — assertions are now 1.2×/1.5×/3× with a comment saying so; the stale ">55,000x" is gone |
| §RR4 | double-spaced normalization bypass (90.6 s) | closed at gap 1 |
| §RR3-2 | same bypass at gap ≥ 2 (85.4 s) | **closed at every gap width, plus whitespace-only gaps** |

The shape guard is now three bounds over a cue predicate that is a provable superset of the parser's
own test, with a context check that mirrors the parser at gap 0 and the normalizer at gap ≥ 1, and
the whole thing is pinned by 310 tests across the two files. Worst accepted payload I can construct:
**3.7 s**, down from a request that never returned when I started.

Two things I did not do, by budget instruction and worth stating plainly so the merge record is
honest: I did not run `npm test`, the browser battery, or `fuzz-routes` in passes 2–4 — the
coordinator runs those at merge — and the fuzz lane's new gap=1/gap=2 cases are therefore verified by
reading, not by execution.
