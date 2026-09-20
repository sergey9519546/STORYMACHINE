# Unified State — 2026-09-02

One reconciliation of every place work could be hiding: branches, pull
requests, worktrees, stashes, unreferenced commits, and concurrent agent
sessions. Written because the project accumulated parallel workstreams
(six merge lanes, six verification agents, three bot PR families, two
interrupted checkpoints) and nobody had ever confirmed, in one pass, that
they all landed in the same place.

**Verdict: `main` @ `939f7829` is the whole project. Nothing is lost.**
Every artifact below was traced to either a verbatim presence in main or a
verifiably superseding replacement. The audit method and its evidence are
recorded here so the claim is checkable rather than asserted.

---

## 1. The reconciliation

### Branches (6 remote, including main)

| Branch | Unmerged commits | Disposition |
|---|---|---|
| `main` @ `939f7829` | — | **the canonical state** |
| `claude/dev-environment-setup-xnijw0` | 0 | fully in main; safe to delete |
| `codex/quarantine-2026-08-08-prototypes` | 0 | fully in main; safe to delete |
| `worktree-agent-a4074ed623bfade27` | 0 | perf lane, merged as `9c0c992`; safe to delete |
| `wip/phase-w-ui-checkpoint` | 3 | **content superseded** — see below |
| `claude/inverse-chekhov-detector` | n/a | deleted by owner after PR #257 merged; `33a2ee48` confirmed an ancestor of main |

#### Addendum — 2026-09-06: three scoring branches, rebased, renamed, pushed

Nothing above is retracted; this records what happened after it. The 2026-09-02
reconciliation was taken against `main` @ `939f7829`, which is now `2bfcbf9d`,
and the branch table above did not include the two parked scoring branches
because at that time neither existed on the remote under a name this audit
tracks.

Both have now been rebased onto `main` @ `2bfcbf9d`, renamed, and pushed, and
the stacked tree the second owner measurement needs — which
`docs/p1-benchmark/BLIND_PAIRS_ON_BRANCHES_2026-09-04.md` recorded as "not
producible" — has been built:

| Branch | Tip | Commits on main | Disposition |
|---|---|---|---|
| `scoring/stacked-r5-plus-advice` | `408166ae` | 21 | **the tree to measure** — R5 with advice-rule-fixes merged in |
| `scoring/r5-verbosity-bias` | `52bf410a` | 8 | R5 alone, rebased |
| `scoring/advice-rule-fixes` | `a1cf7677` | 5 | advice-rule fixes alone, rebased |
| `claude/r5-verbosity-bias-pending-measurement` | `0f625c27` | pre-rebase | superseded by `scoring/r5-verbosity-bias`; kept, not deleted |
| `claude/advice-rule-fixes-pending-measurement` | `68c64eca` | pre-rebase | superseded by `scoring/advice-rule-fixes`; kept, not deleted |

#### Addendum — 2026-09-11: two more scoring branches, and one merged lane branch the proxy cannot delete

Taken against `main` @ `76cdc363`. The order the owner measures in CHANGED
on 2026-09-07 and is corrected in
`docs/brain/Owner/Owner - R5 Measurement and Merge.md`: the stacked tree is
no longer "the tree to measure" first.

| Branch | Tip | Commits on main | Disposition |
|---|---|---|---|
| `scoring/feature-length-defects` | `bcc96f85` | 18 | **measure this one FIRST** — three review rounds to MERGE-READY-FOR-OWNER; receipt PENDING (`docs/audits/2026-09-07-innovation/scoring-review.md`) |
| `scoring/feature-length-saturation-only` | `efd1a463` | 3 | second, only if AUC-24 rejects the first — the scarcity-saturation half alone, its own PENDING receipt |
| `scoring/stacked-r5-plus-advice` | `408166ae` | 21 | third — an ALTERNATIVE to the feature-length branch on `densityPenalty`, not a layer under it |
| `lane/exports-producer-tier` | `2deeb478` | 0 | **fully merged** (fast-forwarded into `main` on 2026-09-11); `git push origin --delete` is refused by the sandbox proxy, as tag pushes are — safe for the owner to delete |
| `claude/dev-environment-setup-xnijw0` | `76cdc363` | 0 | re-synced to `main` on 2026-09-11; still safe to delete |

Also on record: the sandbox was rebuilt on 2026-09-07 and erased every
worktree, all local `audit/*` tags and one reviewed-but-unpushed lane, which
is why `docs/LANE_STANDARD.md` §7 now requires every lane to push after
every commit and every review to be committed before its merge.

All three carry PENDING receipt entries and none may merge:
`node scripts/check-scoring-receipt.mjs main..HEAD` exits 1 on each, by
design, because it finds a PENDING entry and refuses it. Everything else is
green on all three — lint, the full `npm test`, build, `check-no-console`,
`check-docs`, `honesty-audit`, `check-server-reachability`, `check-brain`.

Closing that gate after the corpus run takes a specific edit, and it is worth
writing down here because the gate's own remedy string is misleading. Appending
a measured entry beside the PENDING ones does not clear the range:
`checkReceiptForRange` (`scripts/check-scoring-receipt.mjs:650-673`) validates
EVERY entry the range adds, so one surviving PENDING entry fails it regardless
of what sits next to it — confirmed by running the gate's exported
`extractEntries`/`validateEntry` over the stack's three entries with a
well-formed measured entry appended (4 entries, still 3 problems). Each PENDING
entry has to be rewritten IN PLACE into a measured one. `pendingReason` runs
three scans, not two: the `###` heading, the four phrases it looks for anywhere
in the entry body ("has not been run", "was not run", "not yet measured",
"pending owner measurement"), and the VALUE of every required field, where a
value runs from its own bullet to the next `- **` one and can cross a `####`
addendum heading. Measured in a throwaway clone against the real CLI: applying
the first two scans alone leaves all three branches at exit 1, every time on a
Runner-attestation field value; adding the third takes all three to exit 0. The
step-by-step is in `docs/brain/Owner/Owner - R5 Measurement and Merge.md`.

The recorded five-file conflict between the two branches
(`character-arc.ts`, `rhythm.ts`, `fountain.ts`, `agency-signal.test.ts`,
plus the receipts ledger) turned out not to be a disagreement between them at
all: R5 touches none of those four code files. The conflicts came from the
two branches' merge-bases sitting 74 commits apart, so any stacking attempt
had to replay `main`'s own history across the gap. With both rebased onto one
`main`, the merge conflicts on the receipts ledger and the regenerated brain
graph only.

Still owner-only, and unchanged in substance: `npm run measure-real` against
the local corpus. See `docs/brain/Owner/Owner - R5 Measurement and Merge.md`
for the exact sequence.

`wip/phase-w-ui-checkpoint` is the only branch carrying commits absent from
main by SHA, because the work was squash-merged as `a86756f`. Checked three
ways: it introduces **zero files main lacks**; its tip predates main's by
three days; and each deliverable its commit messages claim is present in main
(`knownQuarantinedDead` allowlist, `ShipPanel.tsx`, the StartScreen ribbon,
the SettingsPanel `sm-panel` fix). Its apparent "additions" against main are
older versions of files main has since rewritten — most visibly
`temporal-consistency.ts`, where wip holds the pre-perf-fix implementation.
*(Corrected 2026-09-19 — see the addendum below: this file-level finding
stands, but the §4 cleanup list's "fully absorbed" framing overstated it as
a branch safe to fast-forward-merge; it is not.)*

#### Addendum — 2026-09-19: branch state after Node 24, the container-path
and healthcheck fixes, and seven scoring/calibration branches the earlier
sweeps never listed

Taken against `origin/main` @ `28754489` (`git fetch --prune origin`, then
`git rev-list --left-right --count origin/main...origin/<b>` for
behind/ahead and `git merge-tree --write-tree origin/main origin/<b>` for
merge cleanliness, on every remaining `origin/*` branch except main).

**The four branches this doc and its 2026-09-11 addendum marked safe to
delete are now gone from the remote:** `claude/dev-environment-setup-xnijw0`,
`codex/quarantine-2026-08-08-prototypes`, `worktree-agent-a4074ed623bfade27`,
and `lane/exports-producer-tier` no longer appear in `git branch -r`.

**Correction, not deletion, of the 2026-09-02 "fully absorbed" claim on
`wip/phase-w-ui-checkpoint`.** §4's cleanup list below still names it
"verified fully absorbed" and offers `git push origin --delete
wip/phase-w-ui-checkpoint` as safe. The file-content finding above (zero
files main lacks) is not retracted. But the branch itself is still on the
remote, still 3 commits ahead of `origin/main` (now 604 behind, tip
`a8a7c06c`, unchanged from 2026-09-02), and `git merge-tree --write-tree
origin/main origin/wip/phase-w-ui-checkpoint` exits 1 with 10 `CONFLICT`
lines (`scripts/verify-p2-p3-surfaces.mjs`, `ScriptIDE.tsx`,
`SettingsPanel.tsx`, `CoverageSummary.tsx`, `ScriptDoctorPanel.tsx`,
`ShipPanel.tsx` (add/add), `Toolbar.tsx`, `scriptide-draft-store.ts`,
`coverage-handoff.test.ts` (add/add), `scriptide-draft-store.test.ts`) — main
has since rewritten every one of those files. "Fully absorbed" is true of
the *content*; it is not true of the *branch*, which cannot be merged
cleanly. Deleting the ref loses no content per the check above, but nobody
should read "fully absorbed" as "mergeable."

**Nine branches created after 2026-09-11 that neither this doc nor its
addenda ever listed:**

| Branch | Tip | Behind / ahead of `origin/main` | `merge-tree` | Disposition |
|---|---|---|---|---|
| `calibrate/voice-bound-2026-09-13` | `c66ca57f` | 163 / 2 | CONFLICT (4 lines) | superseded — its finding landed on main independently as `e5458290` |
| `calibrate/voice-bound-2026-09-13b` | `e4db6c77` | 163 / 3 | CONFLICT (4 lines) | superseded, same as above |
| `calibrate/voice-bound-2026-09-13c` | `4653a78e` | 163 / 4 | CONFLICT (4 lines) | superseded, same as above |
| `calibrate/voice-bound-2026-09-13d` | `213795e7` | 163 / 5 | CONFLICT (6 lines) | superseded, same as above |
| `scoring/adversarial-2026-09-12` | `4cf5b2f3` | 304 / 43 | CONFLICT (13 lines) | PENDING OWNER MEASUREMENT — first link in a single deepening chain with the two below |
| `scoring/forced-cue` | `089bec91` | 304 / 59 | CONFLICT (15 lines) | PENDING OWNER MEASUREMENT — second link, stacked on `scoring/adversarial-2026-09-12` |
| `scoring/renderer-residuals` | `a4df0c49` | 304 / 72 | CONFLICT (16 lines) | PENDING OWNER MEASUREMENT — third link, stacked on `scoring/forced-cue` |
| `lane/healthcheck-ipv4` | `17e6bfe3` | 1 / 0 | clean (exit 0) | **merged** — PR #265, `docs/audits/2026-09-18-healthcheck-ipv4/` |
| `lane/node-24` | `faeb759a` | 7 / 0 | clean (exit 0) | **merged** — PR #264, `docs/audits/2026-09-18-node-24/` |

The four `calibrate/voice-bound-2026-09-13*` branches are four attempts at
the same voice-weight-bound derivation named in the 2026-09-13 session
record (`docs/PATH_TO_EXCELLENCE.md`); none needs merging because the
derivation they were chasing landed on main independently in commit
`e5458290`. `scoring/adversarial-2026-09-12`, `scoring/forced-cue`, and
`scoring/renderer-residuals` are not three independent branches but one
chain, each stacked on the last, all three still carrying PENDING receipt
entries per `scripts/check-scoring-receipt.mjs` — none may merge until
`npm run measure-real` runs against the local corpus and the PENDING entries
are rewritten in place, per the sequence this doc's 2026-09-11 addendum
already describes. `lane/healthcheck-ipv4` and `lane/node-24` are the two
branches actually behind, not ahead: both are wholly contained in
`origin/main` (0 commits ahead, merge-tree clean) because both PRs merged.

**Also on record as of 2026-09-19:** `tests/fixtures/auc24-table.json` still
does not exist (`ls` confirms), so `tests/core/auc24-table.test.ts` still
skips on every CI run with no corpus. `scripts/report-unverified-gates.mjs`
still carries `expires: '2026-10-01'` for that gap, and its own header
sanctions a deliberate, reviewed date move as option (c) — moving the date
is not itself dishonest if it is done in a diff a reviewer can see, as
opposed to quietly, which is why this doc records the expiry rather than
either asserting it will be met or assuming it has been extended.

**2026-09-20:** Dead-weight proposal B3 acted on — `agent-scheduler/` (12
tracked files) and `test-freeride.js` deleted on `lane/dead-weight-b3`; see
`docs/proposals/DEAD_WEIGHT_REMOVAL_2026-08-24.md`'s B3 note and
`docs/audits/2026-09-20-dead-weight-b3/README.md`. Proposal A, B1, B2, and the
v5.0 test files are still awaiting the owner.

### Pull requests (15 reviewed, all states)

Zero open. Merged and present in main: **#257** (INVERSE_CHEKHOV_GUN, the
3,216 → 3,217 rule), **#249**, **#242**. Closed unmerged: **eleven** bot PRs
(`google-labs-jules[bot]`), all variations on replacing `.split(/\s+/)` with
`fastWordCount`. Their closure was re-examined on the merits rather than
inherited: `fastWordCount` is genuinely Unicode-correct (it handles high
whitespace code points explicitly), so the optimization they proposed was
already in place and the PRs were correctly declined. Several of them also
carried real damage — `continue-on-error` smuggled into `security.yml`, a
neutered `ci-gates-intact.test.ts`, and a fabricated measurement receipt —
repaired in `ad92e75` and `4488218`.

### Worktrees, stashes, and unreferenced commits

- **Worktrees: 1** (the repository itself). Every agent worktree was removed
  after its lane merged; `git worktree prune` finds nothing stale.
- **Stashes: 0** in the stash list, but two stash *commits* survive
  unreferenced (`6c60f1e0`, `dae9fb1d`, both 2026-08-16, the W3/W4 lane).
  Checked line by line: of 89 and 76 substantive added lines, **all but one
  appear verbatim in main**. The exception is
  `writeScriptIDEDraft(lsSet, draftEnvelopeRef.current)`, which E4 replaced
  with the `writeDraftBoth` IndexedDB-mirror wrapper — `ScriptIDE.tsx:338`
  documents that supersession in so many words.
- **Unreferenced commits: 20.** Eight are pre-rebase twins of merged lanes
  (identical patch-id to a commit in main). Five are throwaway probes planted
  and reverted by the verification sweep. The rest are the two stashes and
  three interrupted checkpoints. Every file any of them introduced is present
  in main — including the ones worth naming: `doctor-pool.ts`,
  `doctor-worker.ts`, `reversal-detection.ts`, `check-no-console.mjs`,
  `verify-server-reachability.mjs`, and
  `docs/proposals/DEAD_WEIGHT_REMOVAL_2026-08-24.md`.

### Sessions

No other Claude session is running on this machine, and no agent worktrees
remain. This session (`storymachine-20`) is the only writer.

---

## 2. What main actually contains

180 commits, 49 of them from the phase program that took the project from
"working checkout" to release candidate. **10,996 tests, 0 failures**, 209
test files, 12 CI gate steps, 33 npm scripts, version `1.0.0-rc.1`.

Phases **W** (make it work) and **E** (controllable and interactive) are
complete with judged exit gates; Phase **S**'s code lanes are done and the
first Docker image is published; Phase **P**'s evidence lanes have reported.
Full narrative in `docs/PATH_TO_EXCELLENCE.md`.

The findings that changed what the project believes about itself:

- **The receipt gate never inspected a push to main.** It computed its range
  as `origin/main...HEAD`, which on a push is the same commit — an empty
  range, "OK", exit 0, across ~182 runs. This was the exact mechanism by
  which the 2026-08-08 fabricated-receipt incident would recur unseen. Fixed
  and proven against the real historical laundering range.
- **The no-console gate exempted live code** — `--exclude=index.ts` matches by
  basename, hiding `server/routes/nvm/index.ts`, the live route barrel.
- **The suite could not detect deletion of the product's own thesis.** Zeroing
  both feature-scale scoring deductions left all tests green, because every
  fixture sat below the 15-scene gate those terms require.
- **A prompt-injection vulnerability**: a caller-supplied title reached the
  screenplay compiler raw, and one newline forged title-page keys and then
  body text — content interpolated into the LLM rewrite prompt, able to
  impersonate its `--- END DRAFT ---` fence on each of 14 passes.
- **The rule-catalog retirement design's core premise is false.** It calls a
  tier of rules removable "at zero measurable score cost, by construction";
  measured, removing exactly that tier costs real discrimination, and the
  retirement bar's own B5 check breaks so badly that the "weak" calibration
  band ties "strong". Nothing was retired.

---

## 3. Deliberately not unified

Kept separate, with reasons, so nobody re-opens them as oversights:

- **~24,700 lines of unreachable server code.** Written up as three decisions
  in `docs/proposals/DEAD_WEIGHT_REMOVAL_2026-08-24.md`, not deleted, under
  the standing instruction not to remove code without first considering
  whether integrating it would improve the product. A reachability tripwire
  (`npm run check-server-reachability`) now stops the pile growing.
- **The 20 unreferenced commits.** Left in place rather than garbage-collected.
  They cost nothing, are invisible in normal use, and are a recovery net; this
  document records that their content is already in main.
- **The stale `v1.0.0` remote tag**, pointing at an unrelated old commit with
  no GitHub Release behind it. Deleting a tag requires owner access.

---

## 4. What is left, and who can do it

Five items. None is blocked on engineering; all five need the owner.

1. **Make the repository private and enable branch protection.** It is still
   public (`"private": false`, verified live) despite the 2026-08-03 decision.
   A ruleset JSON with verified check names is committed and waiting.
2. **Fix the repository description.** It still reads "3,216 corpus-measured
   rules" — a stale number that also trips two `honesty-audit.mjs` patterns.
   A pre-validated replacement (0 violations across all 24 applicable
   patterns) is in `docs/PATH_TO_EXCELLENCE.md` under T2.
3. **Run the measurement once:**
   `REAL_SCRIPT_CORPUS_DIR=<corpus> npm run measure-real`. A receipt stub is
   prepared with everything except the number. The corpus is local-only for
   copyright reasons and deliberately cannot reach CI.
4. **Push the `v1.0.0-rc.1` tag** and delete the stale `v1.0.0`. The tag
   exists locally; this session's git proxy blocks tag pushes.
5. **Five writers and three blind readers.** The long pole, and the only item
   no amount of engineering substitutes for.

**Branch cleanup** (optional, safe — all four are verified fully absorbed):
*(as of the 2026-09-19 addendum in §1: the first three, plus
`lane/exports-producer-tier`, are confirmed gone from the remote already.
`wip/phase-w-ui-checkpoint` is unchanged and still on the remote — its
content is absorbed, per the file-level check above, but "fully absorbed"
should not be read as "safe to fast-forward-merge": it does not, per the
2026-09-19 `merge-tree` check. Deleting it loses no content; it just cannot
be merged as a branch.)*

```
git push origin --delete claude/dev-environment-setup-xnijw0
git push origin --delete codex/quarantine-2026-08-08-prototypes
git push origin --delete worktree-agent-a4074ed623bfade27
git push origin --delete wip/phase-w-ui-checkpoint
git push origin --delete lane/exports-producer-tier   # merged 2026-09-11 as 2deeb478
```

---

## 5. How to re-run this audit

```
git branch -r -v                                  # every branch
for b in <branches>; do git rev-list --count origin/main..origin/$b; done
comm -13 <(git ls-tree -r --name-only origin/main | sort) \
         <(git ls-tree -r --name-only origin/<branch> | sort)   # unique files
git fsck --lost-found | grep '^dangling commit'   # unreferenced work
git diff <stash>^1 <stash>                        # stashes are merges: use ^1
git worktree list && git stash list
```

The one trap worth recording: `git show` on a stash commit emits a **combined**
diff with two columns of `+`/`-` markers, so naive `^+` parsing silently
matches nothing and a stash reads as empty. Diff against `^1` instead.
