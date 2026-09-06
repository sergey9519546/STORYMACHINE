# Mistake hunt — docs/hygiene side, range `1e170831..802f1c16`

Worktree: `/home/user/STORYMACHINE/.claude/worktrees/agent-ae8eee1af4ff5743a`
(read-only; no edits/commits made here). Range verified with
`git log --oneline 1e170831..802f1c16` (22 commits, tip `802f1c16`).

Status: IN PROGRESS — appending as verified.

---

## 1. docs/PATH_TO_EXCELLENCE.md — fifth session record

### 1.1 CONFIRMED — round-count arithmetic understates the shape-guard lane (and the batch total)

The 2026-09-05 session record (line 38 onward) tallies review rounds per
lane in prose:

```
docs/PATH_TO_EXCELLENCE.md:50  Readiness and logs (three rounds)
docs/PATH_TO_EXCELLENCE.md:57  Timing and dialogs (two rounds)
docs/PATH_TO_EXCELLENCE.md:62  Cross-surface parity (two rounds)
docs/PATH_TO_EXCELLENCE.md:68  Draft rank, dark mode, the a11y gate (three rounds)
docs/PATH_TO_EXCELLENCE.md:74  Keyless Fix & verify (two rounds)
docs/PATH_TO_EXCELLENCE.md:80  The shape guard (four rounds)
docs/PATH_TO_EXCELLENCE.md:94  "Main moved from 1e170831 to 5d2b2638: 6 lanes, 15 review rounds..."
```

Command used to count actual rounds — top-level `#` headers in each review
file (one header = one review pass, i.e. one round):

```
grep -n "^# " docs/audits/2026-09-05-review-batch/guard-review.md
```

`guard-review.md` has FIVE top-level headers (initial review, "Re-review",
"Re-review #2", "Re-review #3", "Re-review #4"), with verdicts REVISE,
REVISE, REVISE, REVISE, MERGE (confirmed by reading each `## ... Verdict`
section: lines 251, 466, 670, 811, 921). The README's own table agrees this
is five passes: `docs/audits/2026-09-05-review-batch/README.md`'s row reads
`REVISE 5 → 4 → 1 → 1 → MERGE` — five arrow-separated segments. But
PATH_TO_EXCELLENCE calls this lane "four rounds" (line 80). That is off by
one against both the review file and the batch's own README table.

Re-summing the six per-lane counts from the review files themselves
(readiness=3, timing=2, xsurface=2, rank=3, fixverify=2, guard=5) gives
**17**, not the "15 review rounds" the closing line claims (line 94) and not
even 16 (naive sum of PATH's own per-lane prose, which undercounts guard by
one: 3+2+2+3+2+4=16). Every plausible total (16 from the prose as written,
17 from the actual files) disagrees with the stated "15".

**Fix:** change line 80 to "(five rounds)" and line 94 to "6 lanes, 17
review rounds" (or recount from the review files directly and use that
number — the arithmetic should be re-derived from `README.md`'s table, not
retyped).

### 1.2 CONFIRMED — three lanes' final documented "Verdict" header is REVISE, not MERGE, though the lane merged

For readiness (`readiness-review.md`, last section, line 356) and keyless
Fix & verify (`fixverify-review.md`, last section, line 378), the LAST
formal `## Verdict` heading literally reads `REVISE (1 item)` /
`REVISE (one item)` — not MERGE. The batch's own README table calls these
"REVISE 1 → MERGE" and "REVISE 1 → merge on report" respectively, and the
merge commits (`f7e5507c`, `6697e88d`) do contain the fix the last REVISE
round asked for (verified: `git show f7e5507c -- docker-compose.yml` shows
`stop_grace_period: 50s` added, matching readiness round 3's ask). So the
*outcome* is accurate, but LANE_STANDARD §6 requires the reviewer to
"return MERGE, or REVISE with a numbered list" before the orchestrator
merges — in both cases the record shows the lane merging on the strength of
a REVISE verdict plus the coordinator's own read that the one remaining item
was fixed, not a documented MERGE from the reviewer. PATH_TO_EXCELLENCE's
"None passed review on the first pass" (line 47) is still true, but it
glosses over that two of the six lanes never received a formal MERGE from
their reviewer at all — the batch shipped on "merge on report" for those two.

**Fix:** either have the reviewer re-check the specific fix and post an
explicit MERGE verdict in the review file (cheap — one item each), or add a
sentence to the PATH_TO_EXCELLENCE record and the README table noting that
readiness and keyless-verify merged on the coordinator's confirmation of the
last item rather than a reviewer-issued MERGE, since LANE_STANDARD §6 is
written as reviewer-gates-the-merge.

### 1.3 CONFIRMED — the warm-up window is cited as two different, contradictory ranges across the very files this batch touched

```
grep -n "2\.1-2\.7\|2\.1-3\.9" README.md Dockerfile docker-compose.yml server.ts server/routes/config.ts
```

Result — "~2.1-2.7s" in: `README.md:283`, `Dockerfile:83`, `Dockerfile:100`,
`docker-compose.yml:143`, `server.ts:236`; vs. "~2.1-3.9s" in:
`README.md:63`, `README.md:83`, `docker-compose.yml:158`,
`server/routes/config.ts:154`. Both ranges describe the SAME thing (the
Script Doctor pool's boot-time pre-warm window that `GET /ready` gates on).
Root cause, traced via `docs/audits/2026-09-05-review-batch/readiness-review.md:45`:
the original 2026-09-04 audit measured 2.1-2.7s on an idle box
(`docs/audits/2026-09-04-evening-batch/AUDIT.md:176,609`); the round-1
reviewer re-measured under this sandbox's actual load (loadavg 14-27) and
got 3582-3583ms and 2703ms, i.e. up to ~3.9s, and approved the 15s
`start-period` against that wider number (`readiness-review.md:27`, "15s vs
a measured 2.1–3.9 s warm window is ample"). Some but not all doc/comment
sites were updated to the wider, reviewer-verified number; the rest still
say 2.1-2.7s, so a reader hits both without knowing they're the same
measurement under different load, or which one the 15s start-period was
actually sized against.

**Fix:** pick one range (2.1-3.9s is the one the reviewer actually verified
and is comfortably inside the 15s start-period either way) and update the
five stale "2.1-2.7s" sites — `README.md:283`, `Dockerfile:83`,
`Dockerfile:100`, `docker-compose.yml:143`, `server.ts:236` — to match, or
if both numbers are meant to stay (idle-box vs. loaded-box), say so
explicitly at each site instead of stating one as if it were the only
figure.

### 1.4 Header self-reference is a day behind its own commit (LOW severity, likely unavoidable)

`docs/PATH_TO_EXCELLENCE.md:3`: "State as of 2026-09-05, main @ `5d2b2638`
(five session records below)". `5d2b2638` is the second-to-last commit in
the range (`git log --oneline 1e170831..802f1c16`); the commit that adds
this very session record is `802f1c16`, one commit later. So the header's
own SHA is stale the instant the commit that wrote it lands — a
re-verifier checking out `802f1c16` (the actual tip) and reading "main @
5d2b2638" will initially flag it NOT REPRODUCED before realizing the
sentence describes the state one commit before the one that records it.
This is close to unavoidable for a self-describing HEAD pointer (the commit
can't cite its own SHA), but it is worth a one-line disclaimer ("as of this
commit's parent") since the doc's whole premise is that every SHA is
checkable.

**Fix:** either drop the specific SHA from the header (say "main, after
this session's six-lane review batch") or add "(the parent of this commit —
see `git log -1 --format=%H docs/PATH_TO_EXCELLENCE.md`)" so a re-verifier
isn't misled for a beat.

---

## 2. docs/audits/2026-09-05-review-batch/README.md — verdict-history table vs. the six review files

### 2.1 CONFIRMED, matches — the six "merged at" SHAs are real and are ancestors of the tip

```
git merge-base --is-ancestor f7e5507c 802f1c16   # yes
git merge-base --is-ancestor 7f686808 802f1c16   # yes
git merge-base --is-ancestor 6697e88d 802f1c16   # yes
git merge-base --is-ancestor ed87d8a6 802f1c16   # yes
git merge-base --is-ancestor 58eaafbf 802f1c16   # yes
git merge-base --is-ancestor 5d2b2638 802f1c16   # yes
```
All six resolve to commits whose subject line matches the lane the table
names them for. No finding here — this column is solid.

### 2.2 CONFIRMED, HIGH severity — every intermediate round-commit SHA cited inside the six review files is a dangling object, unreachable from any branch or ref

The individual review files (not the README table) cite the specific
commit each round reviewed, e.g. `guard-review.md:301` "`commit
a0667ab3`", `readiness-review.md:1` "`commit 91b8dc73`",
`timing-review.md:432` "`commit cc68cf7d`". Checked all 13 such
intermediate SHAs across the six files:

```
git cat-file -e <sha>                       # all 13: object exists locally right now
git log --all --oneline | grep <sha>        # all 13: zero matches
git branch --all --contains <sha>           # all 13: zero branches
```

Every one of them exists as a loose commit object in this checkout today
(so `git show <sha>` currently works) but NONE is reachable from `main`,
from any `worktree-agent-*` branch, or from any other ref — `git log --all`
does not surface a single one. That means: (a) they are not part of the
repository's committed, pushable history; (b) they will not survive `git
gc --prune=now` or a fresh clone from the remote; (c) a re-verifier working
from a clean checkout (which is exactly the audit's own stated method —
"re-derives every claim from scratch" per the 2026-08-24 sweep's
precedent) will find `git show a0667ab3` fail with "fatal: bad object" and
every per-round commit citation in these six files unresolvable. This
directly undercuts LANE_STANDARD §3 ("Prove it, do not assert it" / every
number needs the command that produced it) and the review batch's own
promise (README.md: "every finding they produced is pinned by a committed
test or fixture on main") — the FINDINGS are pinned by tests on main, but
the SHA trail proving which commit each review round actually examined is
not. Only the six FINAL per-lane SHAs (§2.1, all in the README table) are
durable; every intermediate one is a squash/rebase casualty.

Full list of the 13 orphaned SHAs, by file:
- `fixverify-review.md`: `4671c543`, `321e95ba`
- `guard-review.md`: `38f47648`, `a0667ab3`, `cc405ccb`, `9f171a5c`
- `rank-review.md`: `8eef1375`, `4cf4d0b1`
- `readiness-review.md`: `91b8dc73`, `934cf84e`, `7511733f`
- `timing-review.md`: `cc68cf7d`
- `xsurface-review.md`: `aa45951e`

One of these (`cc68cf7d` in `timing-review.md:432`) is a content-identical
rebase of a commit that DID land — same author date (`Sat Sep 5 01:15:15
2026 +0000`) and identical commit message to `0da8fb05`, which IS an
ancestor of the tip — so the underlying fix is not lost, only the
citation's SHA is stale (readers should check `0da8fb05` instead). The
other 12 have no equivalent commit anywhere in `git log --all`, meaning
even the content isn't independently addressable by SHA any more; it only
survives folded into whichever final commit the README table names.

**Fix:** this is a structural gap in how the review batch is committed,
not a one-line typo. Two options: (1) before deleting/rebasing a lane's
working branch, tag each round's commit (e.g.
`git tag audit/2026-09-05/guard-round1 a0667ab3`) and push the tags, so the
review files' citations stay resolvable; or (2) accept that only the final
per-lane SHA is durable and edit each review file's round headers to say
"reviewed the diff at that point in the lane's history (folded into
`<final-sha>`)" instead of implying a permanently checkable commit. Either
way, note in `docs/audits/2026-09-05-review-batch/README.md` that
intermediate-round SHAs are not independently resolvable so a future
re-verifier doesn't waste time chasing "fatal: bad object."

### 2.3 CONFIRMED — round-count table cross-checked against the six files (see also §1.1)

Re-deriving the "rounds" column directly from each file's top-level `# `
headers and each round's own verdict:

| lane | README claims | actual (counted from file) | match? |
|---|---|---|---|
| readiness | REVISE 6 → REVISE 1 → MERGE | REVISE → REVISE(1) → REVISE(1), last round's prose says "this is a merge" but its own `## Verdict` header reads `REVISE (1 item)` (readiness-review.md:356) | rounds count matches (3); final label is a documented judgment call, not literally what the heading says — see §1.2 |
| timing | REVISE 3 → MERGE | REVISE → MERGE (timing-review.md:390, :620) | MATCH |
| keyless Fix & verify | REVISE 5 → REVISE 1 → merge on report | REVISE → REVISE(1) (fixverify-review.md:226,378); no third file section exists, consistent with "merge on report" (no re-review filed) | MATCH |
| cross-surface parity | REVISE 5 → MERGE (+2 nits) | REVISE → MERGE-with-nits (xsurface-review.md:161, and re-review's "Recorded, not blocking" section) | MATCH |
| draft rank / dark mode / a11y | REVISE 7 → MERGE → rebase REVISE 1 | REVISE(rank-review.md:185) → (round 2, implicit MERGE via "Non-blocking notes (do not hold the merge)") → rebase REVISE(1) (rank-review.md:378-401) | MATCH |
| Fountain shape guard | REVISE 5 → 4 → 1 → 1 → MERGE | REVISE → REVISE → REVISE → REVISE → MERGE (5 rounds; guard-review.md:251,466,670,811,921) | **five rounds, not the "four rounds" PATH_TO_EXCELLENCE:80 states — see §1.1** |

So the README table itself is internally accurate against the six files;
the one place the count drifts is PATH_TO_EXCELLENCE's prose summary (§1.1),
which undercounts the shape-guard lane by one round and is off in its
"15 review rounds" total either way (16 or 17 depending which count you
take — never 15).

---

## 3. docs/CLAIMS_REGISTER.md rows 32-55

`node scripts/honesty-audit.mjs` → **clean** ("scanned 443 files, plus 324
tracked markdown files for stale rule-count numbers, plus the claims
register (55 rows) — clean."). That check only verifies (a) `unsupported`/
`retired` rows don't appear verbatim outside the register, and (b)
`supported` rows' evidence *path* exists — it does not check that a
`supported` row's claim text still matches what the named file currently
renders. Doing that check by hand (grep each row's claim substrings against
its "Where it appears" file) surfaces a real, live cross-surface wording
drift that predates this range but was made worse by it:

### 3.1 CONFIRMED, HIGH severity — rows 32/33/34/35 no longer match what their own source files render; rows 50/51 match a THIRD, now-stale copy of the same line

The rank-review lane (commits `5dffc831`/`3d13383c`/`58eaafbf`, see
`docs/audits/2026-09-05-review-batch/rank-review.md:355-357`) fixed a
wording drift between the panel and the letter by routing both through two
new shared helpers in `src/lib/draft-rank-copy.ts`:

```
src/lib/draft-rank-copy.ts:60  draftRankDenominatorLabel() → 'runs and saved drafts of this script'
src/lib/draft-rank-copy.ts:67  draftRankNextOpportunityLabel() → 'your next run or save'
```

The file's own top-of-function comment says so explicitly: "the panel
called it 'your own saved drafts of this script', the panel called it
'runs and saved drafts of this script'. Same number, two different claims"
(the fix). `ScriptDoctorPanel.tsx:383-384` and
`coverage-letter.ts:270-271,284` both now call these helpers — confirmed
live:

```
grep -n "Rank among your drafts" src/components/scriptide/ScriptDoctorPanel.tsx
384:  `Rank among your drafts: ...${draftRankDenominatorLabel()} (by health)`
  → renders "... runs and saved drafts of this script (by health)"
```

But **CLAIMS_REGISTER rows 32-35 still register the OLD phrasing** as the
verbatim claim:

| row | registered text (stale) | what the named file renders now |
|---|---|---|
| 32 | "…(by health, **your own saved drafts of this script**)" | "…(by health)" — the noun phrase moved before "(by health)" and now reads "**runs and saved drafts of this script** (by health)" |
| 33 | "…appears **after your next save**." | "…appears after **your next run or save**." |
| 34 | "Among your own **saved drafts of this script**, this one ranks…" | "Among your own **runs and saved drafts of this script**, this one ranks…" |
| 35 | "…will appear **after your next save**." | "…will appear after **your next run or save**." |

None of rows 32-35's registered strings appear verbatim in
`ScriptDoctorPanel.tsx` or `coverage-letter.ts` any more — a re-verifier
grepping the register's own claim text against the cited file gets zero
hits for all four.

Meanwhile **rows 50 and 51** (explicitly filed as "second surface for row
32['s]/33's claim", `server/lib/coverage-html.ts`) DO still match verbatim:

```
grep -n "your own saved drafts of this script\|appears after your next save" server/lib/coverage-html.ts
134: 'First saved draft — rank among your drafts appears after your next save'
135: `Rank among your drafts: ... (by health, your own saved drafts of this script)`
tests/core/coverage-html.test.ts:648 pins this exact stale sentence as the expected output.
```

That is because `coverage-html.ts`'s `buildDraftRankLine` was added by the
EARLIER cross-surface-parity lane (`ed87d8a6`, when `draft-rank-copy.ts`
did not exist yet — `rank-review.md:146`: "not in `main` yet… `coverage-html.ts`
has no `draftRank`") and was never migrated to the shared helpers the
later rank-review lane introduced. So today, on the current tip:

- the in-panel `DraftRankLine` and the coverage-LETTER export both say
  "runs and saved drafts of this script" / "your next run or save";
- the coverage-**HTML** export (the literal next row in the same register,
  50/51) still says "your own saved drafts of this script" / "your next
  save" for the exact same report/session state.

This is precisely the defect class LANE_STANDARD §2 names ("Every surface
that shows a number shows the same number, from the same source") and that
this batch's own cross-surface-parity and draft-rank lanes were built to
close — it reopened between two lanes that landed on the same day, and
`tests/core/coverage-html.test.ts:648` actively pins the divergent wording
as correct, so no test will flag it.

**Fix:** two changes, small and mechanical: (1) `server/lib/coverage-html.ts`'s
`buildDraftRankLine` — replace the two hardcoded literals at lines 134-135
with `draftRankNextOpportunityLabel()`/`draftRankDenominatorLabel()` from
`src/lib/draft-rank-copy.ts`, exactly as `coverage-letter.ts` now does, and
update `tests/core/coverage-html.test.ts:648`'s expected string to match;
(2) update `CLAIMS_REGISTER.md` rows 32-35 to the current verbatim text
quoted above, and once (1) lands, rows 50/51 will match automatically
without needing their own edit.

### 3.2 Spot-checked, no finding — rows 36-49, 52-55

Verified each claim's core substrings against its named source file:
`ScriptDoctorPanel.tsx:665,738,752` (rows 36-38, apostrophe rendered as
`&rsquo;` in JSX — a representation difference, not a content mismatch),
`coverage-letter.ts` buildCaveats structural-signals branch (row 39),
`SnapshotManager.tsx`/`ScriptDoctorPanel.tsx`/`WhatIfPanel.tsx` Shape &
Rhythm strings (rows 40-42), `WhatIfPanel.tsx` branch-compile/withheld/
promote copy (rows 43-45), verify-my-rewrite copy at
`ScriptDoctorPanel.tsx:4485,2061,4507` (rows 46-48 — still present
unchanged by the fixverify lane's withholding-logic fix, which added new
copy for the withheld *reason* rather than editing this rendered receipt
text), `coverage-html.ts` health-percentile line (row 49), and the shared
`percentile-copy.ts` sentences (rows 52-55, including the `ordinal()` /
"82nd" fix `55`'s note describes — `src/lib/percentile-copy.ts`'s exported
`ordinal` is in fact what both `coverage-letter.ts` and the panel now
import, ending the literal-"th"-suffix bug the row describes). All
evidence-pointer files/tests listed for rows 36-55 exist on disk
(`tests/core/shape-rhythm-panel-copy.test.ts`,
`tests/core/coverage-letter.test.ts`, `tests/routes/nvm-whatif-doctor.test.ts`,
`tests/routes/scriptide-fix.test.ts`, `scripts/verify-p2-p3-surfaces.mjs`,
`tests/core/snapshot-trend.test.ts`, `tests/routes/export-producer.test.ts`,
`tests/core/percentile-copy-consistency.test.ts`,
`tests/fixtures/coverage-letter/report1.expected.md`). No further findings
in this sub-range beyond §3.1.

---

## 4. Env vars — README.md / .env.example / Dockerfile / docker-compose.yml

First, which of the four named vars were actually introduced in this
range (`1e170831..802f1c16`), checked with
`git log -S"<VAR>" --oneline --all`:

- `SHUTDOWN_DRAIN_MS` — introduced in this batch, at `f7e5507c`. In scope.
- `DOCTOR_POOL_PREWARM_BEFORE_LISTEN` / `DOCTOR_POOL_PREWARM_TIMEOUT_MS` —
  also introduced at `f7e5507c` in this batch (the bare `DOCTOR_POOL_PREWARM`
  flag itself predates the range). In scope.
- `VERIFY_MAX_LOAD_PER_CPU` — first appears at `13a5ee12`, which is an
  ANCESTOR of `1e170831` (the range's start), i.e. it predates this batch.
  **Not introduced in this range** — the task brief's premise that it was
  "added this batch" does not hold; treating it as pre-existing below.
- `COLLAB_MAX_FRAME_BYTES` — first appears at `3c7654d3`, also an ancestor
  of `1e170831`. **Not introduced in this range** either.

### 4.1 CONFIRMED — SHUTDOWN_DRAIN_MS and DOCTOR_POOL_PREWARM* are documented once each, consistently, with matching defaults

- `SHUTDOWN_DRAIN_MS`: README.md:64, `.env.example:145`, `docker-compose.yml:97`
  (`${SHUTDOWN_DRAIN_MS:-35000}`), code default `0`
  (`server.ts:73-76 shutdownDrainMs()`) — README and `.env.example` both
  state the code default as `0` and the docker-compose *override* as
  `35000`; consistent, not contradictory (compose deliberately overrides
  the app default).
- `DOCTOR_POOL_PREWARM_TIMEOUT_MS`: default `30000` in README:63,
  `.env.example:210`, and code
  (`server/nvm/analyze/doctor-pool.ts:532-533 prewarmDeadlineMs()`) — all
  three agree.
- `stop_grace_period: 50s` (docker-compose.yml:49) agrees with the prose
  in both README:64 and the file's own comment (35s drain + 10s hard-kill
  + 5s margin = 50s).
- `HEALTHCHECK --start-period=15s` (`Dockerfile:103`) and
  `docker-compose.yml:162 start_period: 15s` agree with each other and
  with the commit message's "start period 10s → 15s".

No inconsistency in the numbers governing SHUTDOWN_DRAIN_MS/PREWARM*
defaults themselves. The one real numeric inconsistency touching these
same files is the warm-up **measurement window**, already filed as §1.3
above (2.1-2.7s vs 2.1-3.9s cited for the same thing across README.md,
Dockerfile, docker-compose.yml, server.ts, and server/routes/config.ts) —
repeating the pointer here since it is exactly the kind of cross-file
env-var-adjacent prose drift item 4 asks about.

### 4.2 Pre-existing gap (LOW severity, out of this range) — VERIFY_MAX_LOAD_PER_CPU and COLLAB_MAX_FRAME_BYTES are documented in README/CONTRIBUTING but absent from .env.example

```
grep -n "VERIFY_MAX_LOAD_PER_CPU\|COLLAB_MAX_FRAME_BYTES" .env.example   # zero hits, both vars
grep -n "VERIFY_MAX_LOAD_PER_CPU" README.md CONTRIBUTING.md              # README:138, CONTRIBUTING.md:40
grep -n "COLLAB_MAX_FRAME_BYTES" README.md CONTRIBUTING.md               # zero hits in either
```

`VERIFY_MAX_LOAD_PER_CPU` is documented in README's browser-battery section
and in `CONTRIBUTING.md`'s timing-under-load row, but never appears in
`.env.example` at all (it's a dev/CI-only tuning knob, not a
server-runtime var, which is probably why — every other `.env.example`
entry gates server behavior). `COLLAB_MAX_FRAME_BYTES`
(`server/collab/yjs-server.ts:43`, default 2 MiB) is documented nowhere in
README or CONTRIBUTING — only in a test file's comment
(`tests/collab/websocket.test.ts:181`) and the 2026-09-04 audit doc. Both
predate `1e170831` (confirmed above), so neither is a regression this
batch introduced, but since item 4 named them specifically: if the intent
is "every operator-tunable env var appears in `.env.example`", add a
`COLLAB_MAX_FRAME_BYTES` row there (2 MiB default, WebSocket frame cap);
`VERIFY_MAX_LOAD_PER_CPU` can reasonably stay README/CONTRIBUTING-only
since it has no effect on the shipped server, only on the local test
runner.

---

## 5. ARCHITECTURE.md — surface matrix vs. code, and the fix-verify pooled/in-process sentence

Checked the "Cross-surface consistency" matrix (ARCHITECTURE.md:198-206)
field-by-field against the code:

- `draftRank` route note at line 186 ("passed through `POST
  /api/export/coverage-letter` and `POST /api/export/coverage`") lists
  BOTH routes — this was the exact staleness the xsurface reviewer flagged
  in round 1 ("still says … now also `/api/export/coverage`; stale by one
  route") and it reads as fixed on the current tip. No finding.
- Row "Exported coverage HTML" / Shape signals "yes (strip + aggregates)":
  confirmed, `server/lib/coverage-html.ts:956-962` reads
  `report.structuralSignals`.
- Row "Snapshot trend" / Shape signals "yes (2 aggregates)": confirmed,
  `server/lib/slate.ts:93-95` and `SnapshotManager.tsx` gate on
  `structuralSignals?.scored`.
- Row `POST /api/export/verify` / Shape signals "informational only, never
  part of the match/mismatch decision": confirmed verbatim against
  `server/routes/export.ts:775-789` — the block is spread in only when
  `report.structuralSignals?.scored`, `VerifyBodySchema` has no
  `expected.structuralSignals` field, and the comment there independently
  states the same "PURELY INFORMATIONAL" property, pointing at
  `tests/routes/export-verify.test.ts`'s matching test.
- Row "What-If Lab" / Health percentile "yes (2026-09-05,
  `compactPercentileNote`, gated on `draft.healthPercentile`)": confirmed,
  `src/components/WhatIfPanel.tsx:20,484-489` imports and gates exactly
  that way.
- The fix-verify pooled/in-process sentence (ARCHITECTURE.md:287-292: the
  writer-supplied path runs through the same pooled
  `runScriptDoctorForRequest` the `/doctor` route uses, while the generated
  path still analyses in-process inside `fixAndVerify`): confirmed against
  `server/routes/scriptide.ts` — writer branch calls
  `runScriptDoctorForRequest` at lines 1167 and 1179 (baseline and
  candidate), the generated branch at line 1219 imports and calls
  `fixAndVerify` from `server/nvm/analyze/fix.ts`. Matches exactly.

**No findings in ARCHITECTURE.md's surface matrix or the fix-verify
sentence** — every row checked reproduces against the current code. (The
one live cross-surface bug this range left behind — `coverage-html.ts`'s
draft-rank line using stale hardcoded copy instead of the shared
`draft-rank-copy.ts` helpers — is a wording drift the MATRIX doesn't claim
to police, since the matrix only tracks field PRESENCE, not exact copy; it
is filed under CLAIMS_REGISTER, §3.1 above, which is where the claim-text
guarantee actually lives.)

---

## 6. docs/LANE_STANDARD.md and CONTRIBUTING.md — internal consistency after the cost amendment

`686e6268` ("one full suite and one battery per merge, run by the
orchestrator") rewrote LANE_STANDARD §4 and §6 together in the same commit.
Checked for drift:

- §4 (lane gates): "the lane runs … the full `npm test` ONCE, on the final
  rebased tree … The orchestrator runs the full `npm test` and the whole
  eight-suite battery once per merge."
- §6 (review): reviewer "reproduces … one number, driven, not the whole
  battery re-run"; on REVISE, "the SAME reviewer re-checks its own items
  against the new diff" (not a fresh full run).

These two sections agree with each other — no contradiction. `grep -n
"battery\|full suite\|npm test" docs/LANE_STANDARD.md` shows no other
section still describing the pre-amendment behavior (every-round full
battery), so there's no stale echo left over from before the amendment.

`CONTRIBUTING.md:61`'s only lane-related bullet is a pure pointer — "Held to
`docs/LANE_STANDARD.md` — understand first, build the strongest version,
prove it with before/after numbers, run the gates in the foreground, and
pass an independent review before merge" — it does not restate which suite
runs how often, so it cannot drift from §4/§6's specifics. `CONTRIBUTING.md`'s
own npm-scripts table (`:37-41`) and its "Run the file(s) you touched, then
the full `npm test`, before pushing" (`:54`) describe an individual
contributor's own push, a different actor than the lane/reviewer/
orchestrator roles LANE_STANDARD assigns responsibilities to — these are
complementary, not contradictory (a plain contributor still needs the same
full-suite-before-push discipline LANE_STANDARD asks of a lane).

**No finding** — §4 and §6 agree, and CONTRIBUTING.md's bullet is a
pointer, not a duplicate description, so it cannot contradict either.

---

## 7. Hygiene sweep across `1e170831..802f1c16`

Commands run (all read-only, no edits made):

```
git diff 1e170831..802f1c16 -- 'server/**' | grep '^\+.*console\.'     → none
git diff 1e170831..802f1c16 | grep '^\+.*TODO\|^\+.*FIXME'             → none added
git diff 1e170831..802f1c16 | grep '^\+.*/tmp/'                        → none (excluding "+++" diff headers)
grep -rn "function ordinal(\|function percentileBand("  src server     → one definition each (src/lib/percentile-copy.ts)
grep -rn "function computeDraftRank"                     src server     → one definition (src/lib/snapshot-trend.ts)
grep -rn "function isCueLikeLine"                        server         → one definition (server/lib/validation.ts)
new test files: grep 'assert.ok(true)\|catch\s*{}'                     → none in any of the 8 new *.test.ts files
find changed files > 512000 bytes                                       → none
```

No leftover debug code, no new TODO/FIXME, no duplicated helper
implementations (ordinal/percentileBand/isCueLikeLine/computeDraftRank each
have exactly one implementation, and every consumer imports it — confirmed
separately in §3's cross-surface check that `coverage-html.ts` at least
imports the shared `percentile-copy.ts` module correctly even though it
missed the newer `draft-rank-copy.ts` one), no tests that cannot fail in
the newly added test files, no scratch `/tmp/` paths committed, and no
committed file over 500 KB.

One item that belongs here as much as in §1/§3: **the numeric contradiction
between "2.1-2.7s" and "2.1-3.9s"** for the doctor-pool warm-up window
across `README.md`, `Dockerfile`, `docker-compose.yml`, `server.ts`, and
`server/routes/config.ts` (full detail and fix in §1.3) is exactly the
"comment states a number the file contradicts" pattern item 7 asks about —
filed there to avoid duplicating the analysis.

No test names found that no longer describe what they assert — spot-checked
the ones reviewers themselves had flagged as suspect (the coverage-html
"byte-identical" test, `tests/core/coverage-html.test.ts:681`) and confirmed
it was fixed to compare against an independent fixture rather than a
tautological self-comparison (detail in §3.2/§1's cross-reference).

---

## 8. scripts/measure-structural-signals.ts vs. docs/scoring/STRUCTURAL_SIGNALS_2026-09-04.md

Ran the script exactly as documented:

```
node --experimental-strip-types scripts/measure-structural-signals.ts
```

**Every number the doc cites reproduces exactly**, checked table-by-table:

- §3 density table (combined/CC0-only/calibration-only, all 12 channels):
  100.0/99.5/94.4/88.1/94.4/94.4/94.4/75.2/89.5/80.6/21.5/35.6 (combined),
  100.0/100.0/89.6/90.0/89.6/89.6/89.6/74.5/86.1/64.1/27.7/64.9 (CC0-only),
  100.0/99.0/100.0/85.7/100.0/100.0/100.0/76.0/93.4/100.0/14.3/1.0
  (calibration-only) — all match the doc's table verbatim, including the
  degenerate 100.0% `openCloseModeFlip` and 1.0% `actionSentenceCv` on the
  calibration-only column the doc calls out by name.
- §3 dropped-channel row: dialogue question density 9.4%/14.7%/3.1% —
  matches; `meanSpeakerTurns` rho **0.870** (40 scripts) / **0.832** (20
  CC0) — matches exactly (this is the exact pair `981b81f3`'s commit
  message claims it added and reproduces; confirmed independently here).
- §4 separation table (all 13 channels × 3 sets, B/C/D) — every cell
  (e.g. `meanAbsDialogueShareDelta` 1.000/0.960/0.833,
  `actionSentenceCvOverall` 1.000/0.160/1.000,
  `meanSpeakersPerScene` 0.000/0.000/0.000 "0/32 pairs") matches the doc's
  table at lines 153-167 exactly.
- §4 raw-values table on set B (13 channels, excellent/bad) — matches
  lines 173-185 exactly (e.g. `dialogueShareRange` 0.8627/0.4119).
- §4 "Attacks run" collinearity summary (line 240-243:
  `meanAbsDialogueShareDelta` −0.392/−0.677/−0.643;
  `actionSentenceCvOverall` +0.085/−0.379/−0.408;
  `dialogueShareRange` −0.363/−0.539/−0.366;
  `meanSpeakerTurns` +0.870/+0.832) — matches the script's three
  collinearity tables (40-script, 20-script, 12-blind-script) exactly.
- §5's "Where it shows up" bullet naming `coverage-html.ts`'s "Structural
  Signals (new, unwired diagnostics)" section header: confirmed verbatim
  at `server/lib/coverage-html.ts:994`.

**No findings** — this doc is a model instance of the "prove it, don't
assert it" standard: every cited number reproduces, byte-for-byte, from
the named command.

---

## Summary of findings requiring action, by severity

**HIGH**
- §2.2 — all 13 intermediate review-round commit SHAs cited in the six
  `docs/audits/2026-09-05-review-batch/*.md` files are dangling objects,
  unreachable from any branch/ref; they will not survive `git gc` or a
  fresh clone, so those citations are not durably reproducible. Only the
  six final per-lane SHAs (already in the batch's own README table) are
  durable.
- §3.1 — `CLAIMS_REGISTER.md` rows 32-35 no longer match what
  `ScriptDoctorPanel.tsx`/`coverage-letter.ts` render (the rank-review lane
  changed the wording, the register wasn't updated); rows 50-51 still match
  `coverage-html.ts`'s copy, but that copy is now the ODD ONE OUT relative
  to the other two surfaces for the identical field — a live
  cross-surface-parity regression the review batch's own standard exists to
  catch, currently locked in as "correct" by `tests/core/coverage-html.test.ts:648`.

**MEDIUM**
- §1.1 / §2.3 — PATH_TO_EXCELLENCE's round-count prose undercounts the
  Fountain-shape-guard lane by one round ("four rounds" vs. the actual/
  README-confirmed five) and its "15 review rounds" total doesn't match
  any correct recount (16 from its own per-lane prose, 17 from the review
  files).
- §1.2 — two of six lanes (readiness, keyless Fix & verify) merged on a
  documented `REVISE` verdict plus the coordinator's own confirmation,
  never a reviewer-issued `MERGE`, though LANE_STANDARD §6 is written as
  reviewer-gates-the-merge; the outcome is correct but the process trail
  doesn't show what it's supposed to.
- §1.3 / §7 — the doctor-pool warm-up window is cited as two contradictory
  ranges ("2.1-2.7s" vs "2.1-3.9s") across README.md, Dockerfile,
  docker-compose.yml, server.ts, and server/routes/config.ts.

**LOW**
- §1.4 — PATH_TO_EXCELLENCE's header SHA (`5d2b2638`) is one commit behind
  the commit that records it (`802f1c16`) — likely unavoidable for a
  self-describing HEAD pointer, worth a one-line disclaimer.
- §4.2 — `VERIFY_MAX_LOAD_PER_CPU` and `COLLAB_MAX_FRAME_BYTES` (both
  predate this range) are absent from `.env.example`; low priority since
  neither is a runtime server var most operators would look for there.

**No findings**: §5 (ARCHITECTURE.md surface matrix and fix-verify
sentence — fully accurate), §6 (LANE_STANDARD/CONTRIBUTING — no
contradiction), §8 (structural-signals script/doc — every number
reproduces exactly), and the bulk of §3 (CLAIMS_REGISTER rows 36-49,
52-55 — all verbatim and evidence-backed) and §7 (no debug leftovers, no
duplicated helpers, no unfalsifiable tests, no oversized files).

---

Worktree left clean — no files were edited, staged, or committed during
this investigation. Two scratch helper scripts were written to (and stay
in) the scratchpad directory only:
`<session scratch>/{check_shas.sh,check_shas2.sh,check_sizes.sh,changed_files.txt,structural-signals-output.txt}`.
