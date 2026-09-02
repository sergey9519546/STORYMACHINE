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

`wip/phase-w-ui-checkpoint` is the only branch carrying commits absent from
main by SHA, because the work was squash-merged as `a86756f`. Checked three
ways: it introduces **zero files main lacks**; its tip predates main's by
three days; and each deliverable its commit messages claim is present in main
(`knownQuarantinedDead` allowlist, `ShipPanel.tsx`, the StartScreen ribbon,
the SettingsPanel `sm-panel` fix). Its apparent "additions" against main are
older versions of files main has since rewritten — most visibly
`temporal-consistency.ts`, where wip holds the pre-perf-fix implementation.

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

```
git push origin --delete claude/dev-environment-setup-xnijw0
git push origin --delete codex/quarantine-2026-08-08-prototypes
git push origin --delete worktree-agent-a4074ed623bfade27
git push origin --delete wip/phase-w-ui-checkpoint
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
