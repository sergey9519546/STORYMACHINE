# Independent review — timing / snapshot-modal / collinearity lane

Reviewer: did not build this change. Read-only.
Worktree: `/home/user/STORYMACHINE/.claude/worktrees/agent-a028b7b559f16a9f6`
Branch: `worktree-agent-a028b7b559f16a9f6`, 2 commits, linear on `main` (`1e170831`).
Final `git status --porcelain` in the worktree: **empty** (no probe left behind; every
probe I ran lives in the scratchpad, outside the repo).

**Verdict: REVISE** — three numbered items in §5. Everything the lane reported
reproduces; the revisions are about the part of the audited defect that is still
open in a real deployment shape, plus one guard that cannot fail.

---

## 1. Brief vs diff

Diff touches exactly 5 files (`git diff --name-only main..HEAD`):
`scripts/lib/browser-verify.mjs`, `scripts/measure-structural-signals.ts`,
`scripts/verify-focus-traps.mjs`, `src/components/scriptide/SnapshotManager.tsx`,
`tests/scripts/browser-verify-timing.test.ts`. None of the six files other lanes own.
`docs/` is untouched (`git diff --stat main..HEAD -- docs/` → empty), which brief item 3
explicitly required.

| # | Brief item | Status | Evidence |
|---|---|---|---|
| 1a | cgroup denominator `min(os.cpus().length, ceil(quota/period))`, v2 `cpu.max` + v1 `cfs_quota_us`/`cfs_period_us` | **NARROWED** (see §3.1) | `browser-verify.mjs:108-131` (`readCgroupCpuQuota`), `:195-196` (`min(physicalCpus, quota)`). Parsing is correct; the *paths* are the cgroup-hierarchy ROOT, not the process's own cgroup, so the v1 branch cannot find a quota on a non-namespaced v1 container — i.e. on this box's own cgroup layout. |
| 1b | `win32` OR (`loadavg [0,0,0]` and a 100 ms CPU sample shows the process is not alone) → log `[verify] load policy inactive on this platform (loadavg unavailable) — fixed base timeouts` | **DONE** | `browser-verify.mjs:198-215`; exact log string at `:212`. Windows short-circuits before the sampler (`!isWindows &&` at `:200`), so no 100 ms spin is paid there. |
| 1c | Expose denominator + reason on the returned object | **DONE** | `browser-verify.mjs:236-240`: `cpus`, `loadUnavailable`, `unavailableReason`, `cgroupQuotaCpus` (plus pre-existing `scale/load1/perCpu/ms`). |
| 1d | Unit-test with injected `loadavg`, `cpus`, `platform`, cgroup readers; refactor so injectable, defaults read the real ones | **DONE** | `browser-verify.mjs:181-188` (five injected readers, all defaulting to real `process`/`os`/`fs`); `tests/scripts/browser-verify-timing.test.ts`, 18 tests. Runs under `npm test` (`tests/scripts` is a collected root in `scripts/run-tests.mjs:22-34`; the subtests appear at `test.log:87497`). |
| 1e | Keep every existing caller working | **DONE** | All six call sites unchanged in the diff (`verify-e5-command-palette.mjs:47`, `verify-e4-local-safety-net.mjs:112`, `verify-ui-polish-affordances.mjs:61`, `smoke-p0-live-flow.mjs:68`, `verify-production-build.mjs:69`, `verify-p2-p3-surfaces.mjs:318`, `verify-focus-traps.mjs:173`, `verify-a11y.mjs:199`, `tests/e2e/journeys.test.ts:100`). Returned shape is additive; no caller reads any field but `.ms()` (`grep -rnE "timing\.(scale\|load1\|cpus\|perCpu\|…)" scripts/ tests/` → only a doc comment at `browser-verify.mjs:56`). |
| 2 | Save modal: `role=dialog`, `aria-modal`, accessible name via `aria-labelledby` on the existing "Save Snapshot" heading, `useModalFocusTrap`, Escape closes, focus returns, added to `verify-focus-traps.mjs`, every wait through `timing.ms()`, FAIL-then-PASS | **DONE** | `SnapshotManager.tsx:170-247` (`SaveSnapshotModal`), attrs at `:194-197`, heading id at `:216`, Escape at `:205-210`; new context `verify-focus-traps.mjs:257-292`. No bare numeric timeout in the file (`grep -nE "timeout: *[0-9]\|waitForTimeout\([0-9]"` → no hits). FAIL-first log is in the lane report and is structurally sound: `verifyDialog`'s first statement is `waitForSelector('[role="dialog"]')` (`verify-focus-traps.mjs:114`) and no other dialog is on screen in that flow. |
| rev | Sibling "Restore Snapshot?" modal fixed the same way | **DONE** | `SnapshotManager.tsx:249-311` (`RestoreSnapshotModal`), attrs at `:277-280`, heading id at `:292`; new context `verify-focus-traps.mjs:294-341`. This modal had **no** Escape handling at all on `main`; it does now. |
| rev | Run the full battery | **DONE (lane)**, spot-confirmed by me | Lane: 8/8 suites. I re-ran `verify:focus-traps` (22/22, exit 0), `verify:a11y` (69/69, exit 0), `verify:surfaces` (159/159, exit 0). |
| 3 | Add the `meanSpeakerTurns` row to the COLLINEARITY section, both figures, do not edit the doc, confirm not on the scoring path | **DONE, slightly WIDENED (benign)** | `measure-structural-signals.ts:287-302`. Widened only in that the script now also prints the blind-pairs figure (0.741) that the doc does not claim — a third table exists, so the row appears in all three; harmless and arguably better. |
| — | Accessible **name** guarded by a gate | **SILENTLY NOT COVERED** | See §3.4. The attribute is present and correct; nothing in any suite asserts it. |

Nothing in the brief was skipped. One item (1a) is narrower than its stated intent.

---

## 2. Driving it — REPRODUCED / NOT REPRODUCED

### (a) `getTiming` — REPRODUCED

**New unit test, run directly:**
```
$ node --experimental-strip-types tests/scripts/browser-verify-timing.test.ts
# tests 18 / # pass 18 / # fail 0        EXIT=0
```

**The real function on this box** (not injected):
```
$ node -e "import('./scripts/lib/browser-verify.mjs').then(m => {…})"
readCgroupCpuQuota() = null
sampleCpuContention() = false
[probe] load 2.6/4 cpus → timeout scale 1.0x
{"load1":2.61,"cpus":4,"perCpu":0.6525,"scale":1,"loadUnavailable":false,
 "unavailableReason":null,"cgroupQuotaCpus":null}
ms(5000)= 5000
```
So the line the real suites print on this box is unchanged from `main`:
`[verify] load L/4 cpus → timeout scale 1.0x` — confirmed again in the live suite runs
(`[verify] load 2.1/4 cpus → timeout scale 1.0x` at the head of the focus-traps run).
The new "policy inactive" line does **not** fire here, which is correct: this box reports
a real loadavg.

**`VERIFY_MAX_LOAD_PER_CPU` below current load → exit 3 — REPRODUCED:**
```
$ VERIFY_MAX_LOAD_PER_CPU=0.0001 node -e "import('…/browser-verify.mjs').then(m=>m.getTiming(…))"
[probe] load 1.9/4 cpus → timeout scale 1.0x
[probe] refusing to run: load 0.48/cpu exceeds VERIFY_MAX_LOAD_PER_CPU=0.0001
        (loadavg=1.91, cpus=4) — not launching Chromium or booting the server. …
EXIT=3
```

**`readCgroupCpuQuota()` against this container's actual files:**
```
$ cat /sys/fs/cgroup/cpu.max                    → No such file or directory   (no cgroup v2)
$ cat /sys/fs/cgroup/cpu/cpu.cfs_quota_us       → -1                          (cgroup v1, unlimited)
$ cat /sys/fs/cgroup/cpu/cpu.cfs_period_us      → 100000
$ nproc / os.cpus().length                      → 4 / 4
```
`readCgroupCpuQuota()` correctly returns `null` (v2 read throws ENOENT → v1 quota `-1`
is not `> 0` → `null`), so the denominator stays `os.cpus().length = 4` — matching the
audit's own note that this container is not affected. The reader is exercised for real,
and it does the right thing here. **What it does not do** is resolve the process's own
cgroup path — see §3.1; `/proc/self/cgroup` on this box shows `4:memory:/process_api/…/claude-code-bash`
alongside `1:cpu:/`, i.e. nested controller paths are live in this very environment.

**The 100 ms contention sample — decision table, reasoned from the code
(`browser-verify.mjs:141-151`, `:198-206`) and then measured:**

| platform | `loadavg` | sampler consulted? | result | log line | refusal check |
|---|---|---|---|---|---|
| `win32`, idle | `[0,0,0]` | **no** — `!isWindows &&` short-circuits (`:200`) | `loadUnavailable=true`, reason `windows-loadavg-always-zero` | "policy inactive" | skipped |
| `win32`, busy | `[0,0,0]` | **no** — same short-circuit | identical to the idle case | "policy inactive" | skipped |
| non-win32, `[0,0,0]`, genuinely idle | `[0,0,0]` | yes → `false` | `loadUnavailable=false`, `perCpu=0`, scale 1.0 | `load 0.0/N cpus → scale 1.0x` | active (never fires at 0) |
| non-win32, `[0,0,0]`, oversubscribed | `[0,0,0]` | yes → `true` | `loadUnavailable=true`, reason `loadavg-zero-under-contention` | "policy inactive" | skipped |
| any platform, non-zero loadavg | e.g. `[7,…]` | **no** — `loadIsExactlyZero` gate | ordinary scaled path, unchanged | `load 7.0/4 cpus → scale 1.8x` | active |

So an **idle Windows box can never be misclassified as contended**: on `win32` the
sampler is never called at all (it is the third term of a `&&` chain), which also means
Windows never pays the 100 ms spin. A **busy box can be misclassified as idle only in the
band where it does not matter**: the sampler detects *oversubscription* (more runnable
threads than CPUs), which is the same boundary at which `perCpu` would exceed 1.0 and the
scale would leave 1.0x. A non-Windows box at, say, 3/4 load with a broken loadavg is
reported as `load 0.0/4 → scale 1.0x`, which is a cosmetically wrong number but the
numerically correct scale (1.0x either way). Two residual biases, both benign:
`process.cpuUsage()` is process-wide, so background threads/GC inflate CPU time and bias
toward "not contended" (never a false alarm); and a container whose CFS quota is *below
one CPU* would be throttled during the spin and read as "contended" even on an idle host
— reachable only when loadavg is also exactly `[0,0,0]`.

Measured, on this box (4 CPUs), to confirm the sampler is not a no-op:
```
$ 8 × node busy-spin, then:      under load, sampleCpuContention() = true  ×3
$ after the spinners exited:     after load, sampleCpuContention() = false ×3
```
The sampler discriminates for real; it is not a constant.

### (b) The two modals — REPRODUCED

```
$ PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run verify:focus-traps
…
=== SnapshotManager Save modal (StartScreen -> Try sample coverage -> Ship -> Snapshot) ===
[PASS] SnapshotManager (Save Snapshot) :: INITIAL FOCUS … activeElement=Snapshot version name
[PASS] SnapshotManager (Save Snapshot) :: TRAP FORWARD wraps last -> first
[PASS] SnapshotManager (Save Snapshot) :: TRAP BACKWARD wraps first -> last
[PASS] SnapshotManager (Save Snapshot) :: RESTORE focus returns to the triggering control
=== SnapshotManager Restore modal (… -> Ship -> Snapshot -> Save -> Restore) ===
[PASS] SnapshotManager (Restore Snapshot) :: INITIAL FOCUS … activeElement=Cancel
[PASS] SnapshotManager (Restore Snapshot) :: TRAP FORWARD / TRAP BACKWARD / RESTORE
[verify] 22/22 assertions passed.                                        EXIT=0
```
**22/22, exit 0 — as reported.**

I then drove both modals myself with an independent Playwright probe (scratchpad
`probe-modals.mjs`, keyless server booted from this worktree):

```
[probe] SAVE getByRole(dialog,{name:/Save Snapshot/i}) count: 1
[probe] SAVE aria: {"id":"save-snapshot-modal-title","target":"Save Snapshot",
                    "dupIds":1,"ariaModal":"true","tabindex":"-1"}
[probe] SAVE after Escape: dialog present = false
[probe] SAVE after Escape: focus === trigger = true
[probe] RESTORE getByRole(dialog,{name:/Restore Snapshot\?/i}) count: 1
[probe] RESTORE aria: {"id":"restore-snapshot-modal-title","target":"Restore Snapshot?",
                       "dupIds":1,"ariaModal":"true","tabindex":"-1"}
[probe] RESTORE initial activeElement: Cancel
[probe] RESTORE focusable order: Cancel | Restore
[probe] RESTORE after Enter: clicked = ["Cancel"]
[probe] RESTORE after Enter: dialog present = false
[probe] RESTORE after Enter: focus === trigger = true
[probe] RESTORE after Escape: dialog present = false
[probe] RESTORE after Escape: focus === trigger = true
[probe] console errors: []
```

- **Accessible name**: `getByRole('dialog', { name: … })` resolves each modal by its
  heading text; `aria-labelledby` targets exist and each id occurs exactly once in the
  document (`dupIds: 1`).
- **Restore's destructive default focus is the safer choice, and it is real, not
  incidental.** `useModalFocusTrap` focuses `getFocusableElements(container)[0]`
  (`use-modal-focus-trap.ts:158-159`), and the DOM order inside the confirm modal is
  `Cancel | Restore` (`SnapshotManager.tsx:296-308`) — the non-destructive control comes
  first in source, so the safe default is a property of the markup, not luck.
- **Enter does not accidentally confirm.** With the default focus on Cancel I installed
  capture-phase click listeners on both buttons and pressed Enter: only `Cancel` fired,
  and the modal closed without restoring. (Enter activates the focused button; there is
  no form and no `type="submit"` anywhere in the modal, so no implicit submission can
  route Enter to the second button.)
- Escape closes **both** modals from anywhere inside them and focus returns to the exact
  trigger element (identity check, not text match).
- Zero browser console errors throughout.

I did not re-run a 375px pass: the rendered class strings for backdrop, panel, heading,
paragraph and both buttons are byte-identical to `main`'s inline JSX (see §3.3), so
responsive behaviour is provably unchanged by this diff. One unrelated observation from
my probe: resizing to 375px **while the Ship panel is already open** leaves the Ship
`<aside>` intercepting pointer events over the Snapshot button (`sm-panel-body … subtree
intercepts pointer events`). That is pre-existing on `main` — nothing in this diff touches
ShipPanel layout — and is out of scope here, but it is worth someone's attention.

### (c) Collinearity row — REPRODUCED

```
$ node --experimental-strip-types scripts/measure-structural-signals.ts | grep meanSpeakerTurns
| meanSpeakerTurns (dropped candidate, report aggregate) | 0.870 |
| meanSpeakerTurns (dropped candidate, report aggregate) | 0.832 |
| meanSpeakerTurns (dropped candidate, report aggregate) | 0.741 |
```
Section headers confirm the mapping the doc claims:
`COLLINEARITY … CC0 + calibration (40 scripts)` → **0.870**;
`COLLINEARITY … CC0 only (20 scripts)` → **0.832**;
`COLLINEARITY … blind pairs (12 scripts)` → 0.741 (not claimed by the doc).
This is exactly `docs/scoring/STRUCTURAL_SIGNALS_2026-09-04.md:125` ("rho **0.870** …
over 40 scripts (0.832 over the 20 CC0 fixtures alone)") and `:243`
("`meanSpeakerTurns` +0.870 / +0.832"). The audit's `grep 0.870 → (no output)` is now
answered by the script the doc names.

**The doc's numbers were NOT edited**: `git diff --stat main..HEAD -- docs/` is empty and
`docs/` does not appear in `git diff --name-only main..HEAD`.

```
$ node scripts/check-scoring-receipt.mjs main..HEAD
check-scoring-receipt: range "main..HEAD" — no scoring-path files changed. OK.   EXIT=0
```

### Gates I re-ran independently (all foreground, exit codes captured)

| gate | exit | result |
|---|---|---|
| `node --experimental-strip-types tests/scripts/browser-verify-timing.test.ts` | 0 | 18/18 |
| `npm run lint` | 0 | — |
| full `npm test` | 0 | `# tests 11873 / # pass 11781 / # fail 0 / # skipped 91 / # todo 1` — **identical to the lane's reported figures** |
| `npm run check-no-console` | 0 | — |
| `npm run check-server-reachability` | 0 | — |
| `npm run check-docs` | 0 | — |
| `npm run honesty-audit` | 0 | — |
| `npm run build` | 0 | largest chunk `vendor-codemirror` 341.14 kB — matches the report |
| `node scripts/check-scoring-receipt.mjs main..HEAD` | 0 | no scoring-path files changed |
| `PW_CHROMIUM_PATH=… npm run verify:focus-traps` | 0 | 22/22 |
| `PW_CHROMIUM_PATH=… npm run verify:a11y` | 0 | 69/69 |
| `PW_CHROMIUM_PATH=… npm run verify:surfaces` | 0 | 159/159 |

Every number in the lane's two reports that I checked reproduced exactly. Nothing in
either report is overstated.

Servers: `pgrep -af "server.ts|vite|chromium"` after my runs shows no process of mine.
Two `server.ts` processes (PIDs 29416, 31921) are alive but their `cwd` is
`/home/user/STORYMACHINE/.claude/worktrees/agent-af5e391ed56645643` — another concurrent
session's, started before I did; I left them alone.

---

## 3. Shortcut hunt

### 3.1 The cgroup reader is narrower than the defect it names — the real finding

`readCgroupCpuQuota()` (`browser-verify.mjs:108-131`) reads two **fixed, hierarchy-root**
paths: `/sys/fs/cgroup/cpu.max` and `/sys/fs/cgroup/cpu/cpu.cfs_quota_us`. Those are the
container's own limits only when the process runs in a **cgroup namespace** whose root is
the container's cgroup. When it does not — which is the default for cgroup **v1** Docker
(`--cgroupns=host`), and also for any nested/systemd-sliced layout — the process's real
quota lives at `/sys/fs/cgroup/cpu<path>/cpu.cfs_quota_us`, where `<path>` is the
controller-relative path from `/proc/self/cgroup`; the hierarchy root's
`cpu.cfs_quota_us` is `-1` **by definition** on v1, i.e. always "unlimited". So on a v1
host the new v1 branch cannot ever detect a quota, and the audit's exact bug (host core
count as denominator, silent 1.0x) survives unchanged.

This is not hypothetical here. This very container is cgroup v1, and `/proc/self/cgroup`
shows a **nested** controller path in the same layout:
```
4:memory:/process_api/01a06dee-ff3d-7062-be27-cd5470d8e90d/claude-code-bash
1:cpu:/
```
`cpu` happens to sit at `/` for this process, which is why the reader behaves correctly
here — but the layout that would defeat it is demonstrably in use on this machine.

The unit tests cannot catch this, because they inject the reader: `readCgroupCpuQuota`'s
v1 tests prove the *parsing*, never the *path resolution* (`browser-verify-timing.test.ts:57-75`).
That is the shortcut: the guard tests the half that was never in doubt.

In fairness, the brief named those two literal paths, so the lane built what it was
asked for. LANE_STANDARD §1 says a brief's premise is a hypothesis, and §2 says build the
strongest version; this one is a ~6-line delta (read `/proc/self/cgroup`, try
`/sys/fs/cgroup<path>/cpu.max` and `/sys/fs/cgroup/cpu<path>/cpu.cfs_quota_us` first, then
fall back to the roots the code already reads).

### 3.2 Host-wide numerator ÷ container-scoped denominator (undiscussed trade-off)

`os.loadavg()` reads `/proc/loadavg`, which is **not** namespaced (absent LXCFS): in a
container it reports the whole host's load. The new denominator is container-scoped. On
the audit's own example — a 4-cpu container on a 64-core host — a perfectly normal host
at load 60 (0.94/core) now yields `60/4 = 15/cpu → the 4.0x ceiling`, permanently, for a
container that is idle. Two consequences nobody wrote down: every timeout is stretched 4x
(a genuinely hung suite takes 4x longer to fail, which weakens the timing proof the policy
exists to protect), and `VERIFY_MAX_LOAD_PER_CPU`, if set, would refuse to run an idle
container outright — a new spurious exit 3 that `main` did not have. The default (unset)
keeps this to over-scaling only, so it is low severity, but the header comment presents
the new denominator as unambiguously more correct and it is not: it trades under-scaling
for over-scaling. This deserves a written caveat at the site, and ideally the
container-scoped signal instead (`cpu.stat`'s `throttled_usec`, or `cpu.pressure` PSI).

### 3.3 The extracted modals' rendered DOM — byte-equivalent apart from the added attributes

Compared `main`'s inline JSX (from the diff's removed block) against the live DOM I dumped
from the running app. Every class string is character-identical:

- backdrop `fixed inset-0 z-[200] flex items-center justify-center bg-black/60`
- panel `bg-white dark:bg-zinc-800 p-6 border-[2px] border-[var(--sm-ink)] shadow-[var(--sm-shadow)] w-80 space-y-4`
- `h3 font-bold uppercase text-xs tracking-widest`; the Restore modal's `p`; both button
  class strings including `hover:bg-[var(--sm-stamp)]`
- Framer props (`initial/animate/exit` opacity + scale) unchanged, and the settled DOM
  carries the same `style="transform: none;"` / `style="opacity: 1;"`.

Live Save-modal panel element:
```html
<div tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="save-snapshot-modal-title"
     class="bg-white dark:bg-zinc-800 p-6 border-[2px] border-[var(--sm-ink)] shadow-[var(--sm-shadow)] w-80 space-y-4"
     style="transform: none;">…</div>
```
Delta versus `main` = `{tabindex, role, aria-modal, aria-labelledby}` on the panel and
`{id}` on the `h3`. No wrapper element was added or removed; the component boundary is
invisible in the DOM. The one removed prop is the input's `autoFocus`, which React applies
imperatively and does not reflect as a DOM attribute in client rendering — and the
behaviour it provided is preserved: initial focus lands on the input
(`activeElement=Snapshot version name`), because the input is `getFocusableElements()[0]`.
Two intentional behaviour changes, both improvements, both correctly described in the
commit message: Escape moved from the input to the container (so it works from Cancel/Save
too), and it now `stopPropagation()`s (so it can no longer double-fire ScriptIDE's
document-level Escape ladder).

**Double-mount / duplicate-id check**: `SnapshotManager` has three mount sites
(`ScriptIDE.tsx:3302`, `ScriptIDE.tsx:3553`, `ShipPanel.tsx:136`), but `ScriptIDE.tsx:3546`
guards the always-on instance with
`!(toolSlot === "ship" || (toolSlot === "studio" && activeTab === "versions"))`, so exactly
one instance is live at a time. Confirmed empirically: `dupIds: 1` for both new ids, and
`getByRole('dialog')` count is 1 in both states.

### 3.4 A guard that cannot fail: the accessible name is unasserted

`verifyDialog` (`verify-focus-traps.mjs:113-168`) asserts presence of `[role="dialog"]`,
initial focus, Tab/Shift+Tab wraparound, and focus restore. It never reads
`aria-labelledby`, `aria-modal`, or the computed accessible name. Delete
`aria-labelledby="save-snapshot-modal-title"` — or just the `id` on the `h3` — and the
suite still reports 22/22, and `verify:a11y` never visits these modals (its 69 assertions
cover other surfaces; I re-ran it at 69/69 with the modals present, which confirms no
regression but also confirms no coverage). So the specific thing brief item 2 asked for —
"an `aria-labelledby` pointing at the existing heading" — is correct today and ungated
tomorrow. Per LANE_STANDARD §3 that is the "test that could not have caught the bug"
pattern, and the fix is one line in the shared helper that would strengthen all five
dialogs at once.

### 3.5 Memoization

`cachedTiming` is module-level and returns on first call (`browser-verify.mjs:190`),
exactly as on `main`. The new `resetTimingCacheForTests()` (`:156`) is used only by the
new test file (`grep` across the repo confirms no production caller), and the test file
resets in a top-level `beforeEach`, so no test depends on cross-test leakage. The one test
that *asserts* memoization (`browser-verify-timing.test.ts:199-211`) is asserting
documented behaviour, not papering over a changed reader. No caller can be surprised: the
internal `getTiming()` calls at `:277`, `:389`, `:425` pass no readers and always follow
the suite's own first call.

### 3.6 Stale copy left behind

`browser-verify.mjs:57-59` still says: *"The one log line this prints is the whole visible
contract: `[verify] load L/cpus → timeout scale Sx`."* There are now two possible lines.
The new paragraph 20 lines down corrects it, but the false sentence is the one a reader
hits first, and "copy tells the truth" (LANE_STANDARD §2) applies to a module header as
much as to UI copy.

### 3.7 Things I looked for and did NOT find

No copied implementation (the cgroup parse and the contention sample exist once each; the
modal extraction removes duplication rather than adding it). No widened tolerance. No
surface dropped — both modals, not just the briefed one. No `timing.ms` bypass: zero bare
numeric timeouts in `verify-focus-traps.mjs`. No scoring-path file touched. No `console.*`
under `server/**`. The lane's own "narrowed / left undone" section in report #1 was
honest, and the delta report closed the one item it named.

---

## 4. What a stronger version would have done

The strongest version would have made the cgroup reader answer the question the audit
actually asked — *what CPU allowance does **this process** have?* — instead of the question
the two literal file paths answer, which is *what allowance does the cgroup mount root
have?* That means parsing `/proc/self/cgroup` for the `cpu` (v1) or unified (v2)
controller path and probing `/sys/fs/cgroup/cpu<path>/cpu.cfs_quota_us` and
`/sys/fs/cgroup<path>/cpu.max` before falling back to the roots already coded — six lines,
the same injected-reader test harness, and it turns the v1 branch from decorative into
functional on the exact Docker-on-v1 layout this repo's own sandbox runs. Alongside it, the
header comment should say out loud that the numerator (`/proc/loadavg`) stays host-wide
while the denominator became container-scoped, so a quota-limited container on a busy
shared host now pins at the 4.0x ceiling and, with `VERIFY_MAX_LOAD_PER_CPU` set, can
refuse a run while genuinely idle — naming the container-scoped signal (`cpu.stat`
`throttled_usec`, or `cpu.pressure`) as the real answer if that ever bites. On the modal
half, the stronger version would have spent one line in `verifyDialog` asserting the
computed accessible name (`getByRole('dialog', { name })` resolving, or reading
`aria-labelledby`'s target text), which would have covered all five dialogs and made the
one attribute the brief singled out actually load-bearing in a gate. All three are in
scope: they are small, they live in files this lane already owns, and none of them touch
another lane's files or the scoring path.

---

## 5. Verdict — REVISE

Everything the lane claims reproduces, every gate is genuinely green, the reports contain
no overstatement, and the change is a strict improvement on `main` in every environment I
could measure. The revisions below are about reach and about one guard that cannot fail.

1. **`scripts/lib/browser-verify.mjs:108-131` (`readCgroupCpuQuota`)** — resolve the
   process's own cgroup path before falling back to the hierarchy root. Parse
   `/proc/self/cgroup` (v2: the `0::<path>` line; v1: the line whose controller list
   contains `cpu`) and try `/sys/fs/cgroup<path>/cpu.max` and
   `/sys/fs/cgroup/cpu<path>/cpu.cfs_quota_us` + `cpu.cfs_period_us` first, keeping the
   current root paths as the fallback. *Why:* as written, the v1 branch reads the v1
   hierarchy root, whose `cpu.cfs_quota_us` is `-1` by definition, so on any cgroup-v1
   container without a cgroup namespace — the Docker default on v1, and the layout this
   sandbox itself uses (`/proc/self/cgroup` shows `4:memory:/process_api/…`) — the
   audit's silent-1.0x bug is still live. Add an injected-reader test whose stub serves
   the nested path and 404s the root, so the new test proves path resolution and not only
   parsing.
2. **`scripts/verify-focus-traps.mjs`, `verifyDialog` (~line 113)** — assert the dialog's
   accessible name, e.g. `await page.getByRole('dialog', { name }).count() === 1`, or read
   `aria-labelledby`'s target text, and pass the expected name in from each of the five
   contexts. *Why:* today the `aria-labelledby`/`id` pair the brief specifically required
   can be deleted from either snapshot modal and the suite still reports 22/22; `verify:a11y`
   does not visit these modals either, so the accessible name has no gate at all. Confirm
   the new assertion FAILS with the attribute removed before re-reporting it as passing.
3. **`scripts/lib/browser-verify.mjs:57-59` and the new "THE DENOMINATOR" paragraph
   (~line 61-72)** — (a) fix the now-false sentence "The one log line this prints is the
   whole visible contract: `[verify] load L/cpus → timeout scale Sx`" (there are two lines
   now); (b) state the numerator/denominator mismatch: `os.loadavg()` reads the un-namespaced
   `/proc/loadavg` and reports the **host's** load, while the denominator is now
   **container-scoped**, so a quota-limited container on a busy shared host will pin at the
   4.0x ceiling while idle, and `VERIFY_MAX_LOAD_PER_CPU`, if set, can refuse a run that
   should have proceeded. Name `cpu.stat`'s `throttled_usec` / `cpu.pressure` as the
   container-scoped signal that would settle it, so the next reader does not have to
   rediscover the trade-off.

Items 1 and 2 change behaviour and need their FAIL-then-PASS evidence; item 3 is comment
only. After them, re-run the touched tests, `npm run lint`, full `npm test`, and
`verify:focus-traps` — nothing else in the battery is affected.

---

# Re-review (2026-09-05) — commit `cc68cf7d`

Branch now three commits on `main` (`1e170831`): `a15d7e32`, `c11dd263`, **`cc68cf7d`**.
`cc68cf7d` touches three files and no `src/` file:
`scripts/lib/browser-verify.mjs` (+159/−45 region), `scripts/verify-focus-traps.mjs`,
`tests/scripts/browser-verify-timing.test.ts`. Worktree `git status --porcelain` empty
before and after my runs. No server of mine survives (only PID 28738, cwd
`…/agent-a801916d787c42d4c`, another lane's).

**Verdict: MERGE.** All three REVISE items are done, not narrowed; both behavioural ones
are proved fail-first by me independently, not just by the lane's log. Two non-blocking
nits at the end.

## R1 — item 1: process-own cgroup path resolution — **DONE**

| claim | status | evidence |
|---|---|---|
| `parseSelfCgroupPaths()` reads `/proc/self/cgroup`, v2 = `0::<path>`, v1 = line whose controller list contains `cpu` | DONE | `browser-verify.mjs:132-158`. v2 test is `hierId === '0' && controllers === ''` (`:151`); v1 is `controllers.split(',').includes('cpu')` (`:153`) — an exact member test, not a substring. |
| nested path tried **before** the root | DONE | `:186-190` (v2 candidates) and `:203-207` (v1 candidates): `new Set([...(path ? [joinCgroupPath(root, path)] : []), root])` — process path first, mount root as fallback, `Set` collapsing them when they coincide. |
| injected test serving the nested path and ENOENTing the root | DONE | `browser-verify-timing.test.ts:82-140`, four new tests: nested v1, nested v2, process-at-root (`1:cpu:/`), and unparseable-`/proc/self/cgroup`-falls-back. |
| FAIL before / PASS after | **REPRODUCED INDEPENDENTLY** | see below |

**I re-ran the fail-first myself** rather than trusting the log: extracted `c11dd263`'s
(pre-fix, root-only) `browser-verify.mjs` into a scratch dir with its one local import,
copied **HEAD's** test file beside it with only the import path rewritten, and ran it:

```
=== HEAD's tests vs the PRE-FIX (c11dd263) readCgroupCpuQuota ===
not ok 1 - cgroup v1, nested/non-namespaced …: only the process's own subtree carries the real quota
      error: null !== 2
not ok 2 - cgroup v2, nested (e.g. under a systemd slice): resolves /sys/fs/cgroup<path>/cpu.max …
      error: null !== 3
# tests 22 / # pass 20 / # fail 2
```
Against HEAD:
```
$ node --experimental-strip-types tests/scripts/browser-verify-timing.test.ts
# tests 22 / # pass 22 / # fail 0        EXIT=0
```
**20/22 → 22/22, with exactly the two path-resolution tests flipping and the exact
`null !== 2` / `null !== 3` messages claimed.** The new tests prove path resolution, which
is precisely what the old injected tests could not.

### `readCgroupCpuQuota()` for real on this box — still `null`, and for the right reason

`/proc/self/cgroup` here carries a nested `memory` path but `cpu` at the root:
```
4:memory:/process_api/01a06dee-ff3d-7062-be27-cd5470d8e90d/claude-code-bash
1:cpu:/
0::/
```
Traced through the real filesystem (wrapping `readFileSync` to log every path):
```
readCgroupCpuQuota(realFS) = null
paths attempted:
    OK      /proc/self/cgroup
    ENOENT  /sys/fs/cgroup/cpu.max
    OK      /sys/fs/cgroup/cpu/cpu.cfs_quota_us      (-1 → unlimited)
    OK      /sys/fs/cgroup/cpu/cpu.cfs_period_us
[probe] load 6.1/4 cpus → timeout scale 1.5x
{"load1":6.14,"cpus":4,"perCpu":1.535,"scale":1.535,"cgroupQuotaCpus":null,"loadUnavailable":false}
```
Correct on both counts: the resolver returns `null` (the v1 quota really is `-1` here, so
the denominator stays `os.cpus().length = 4`), and because both process paths are `/`,
`joinCgroupPath` + the `Set` collapse the nested and root candidates into **one** — four
reads total, no duplicated I/O. The live scale line (1.5x under a genuine 6.1 load) also
confirms the ordinary path is unaffected.

### Mis-parse hunt — 15 `/proc/self/cgroup` shapes driven through the real function

Injected reader that serves the quota **only** at the nested path and ENOENTs every root,
so a `quota=2`/`3`/`5` proves the nested path was resolved and `quota=null` proves it was
not. Attempted paths logged:

| # | `/proc/self/cgroup` line | result | correct? |
|---|---|---|---|
| a | `1:cpu,cpuacct:/docker/abc123` | `2`, tried `…/cpu/docker/abc123/cfs_quota_us` | ✅ the single most common **real** v1 shape — the fix genuinely works on stock Docker v1 |
| b | `1:cpuacct,cpu:/docker/abc123` (reversed) | `2` | ✅ order-independent |
| c | `1:cpuset:/docker/abc123` | `null`, fell to root | ✅ `cpuset` is not `cpu` |
| d | `1:cpuacct:/docker/abc123` | `null`, fell to root | ✅ **substring trap avoided** (`includes` on the split list, not `indexOf` on the string) |
| e | `1:cpu:/kube:pod:xyz` (colon **in the path**) | `2`, tried `…/cpu/kube:pod:xyz/…` | ✅ `slice(secondColon + 1)` keeps the whole remainder |
| f | CRLF line endings | `2` | ✅ `line.trim()` strips `\r` |
| g | `0::/user.slice/session-3.scope` | `5`, tried `/sys/fs/cgroup/user.slice/session-3.scope/cpu.max` | ✅ |
| h | only `4:memory:/only-mem` | `null`, fell to root | ✅ |
| i | garbage, no colons | `null`, fell to root | ✅ `firstColon < 0` guard |
| j | `0::` (empty path) | `null`, tried the root **once** | ✅ falsy path → `joinCgroupPath` returns the root → `Set` dedupes |
| k | leading whitespace | `2` | ✅ |
| l | trailing slash `/docker/abc123/` | `2`, tried `…/abc123//cfs_quota_us` | ✅ double slash is POSIX-equivalent |
| m | `9:name=cpu:/docker/abc123` | `null`, fell to root | ✅ a named hierarchy is not the `cpu` controller |
| n | hybrid: `0::/` **and** `1:cpu,cpuacct:/docker/abc123` | `2` | ✅ |
| o | no `/proc/self/cgroup` at all | `null`, fell to root | ✅ unchanged pre-fix behaviour |

I could not construct a shape that mis-parses into a **wrong** quota. Every failure mode
I could reach degrades to the mount-root fallback, i.e. to the pre-fix behaviour.

## R2 — item 2: accessible-name assertion — **DONE, and provably load-bearing**

Threaded from all five contexts: `ScriptDoctorPanel` → `'Script Doctor'`
(`verify-focus-traps.mjs:223`), `WhatIfPanel` → `'What-If Lab'` and `RoomPanel` →
`"Writers' Room"` (`:255-257`, passed at `:267`), `SnapshotManager (Save Snapshot)` →
`'Save Snapshot'` (`:306`), `SnapshotManager (Restore Snapshot)` → `'Restore Snapshot?'`
(`:356`). Assertion itself at `:120-125`, run as check 0 before initial focus.

```
$ PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run verify:focus-traps
[verify] load 4.2/4 cpus → timeout scale 1.1x
[PASS] ScriptDoctorPanel :: ACCESSIBLE NAME "Script Doctor" resolves via role=dialog — count=1
[PASS] WhatIfPanel :: ACCESSIBLE NAME "What-If Lab" resolves via role=dialog — count=1
[PASS] RoomPanel :: ACCESSIBLE NAME "Writers' Room" resolves via role=dialog — count=1
[PASS] SnapshotManager (Save Snapshot) :: ACCESSIBLE NAME "Save Snapshot" resolves via role=dialog — count=1
[PASS] SnapshotManager (Restore Snapshot) :: ACCESSIBLE NAME "Restore Snapshot?" resolves via role=dialog — count=1
[verify] 27/27 assertions passed.                                        EXIT=0
```
**27/27, exit 0.** Rather than take the lane's "26/27 with the id removed" on faith — and
without editing the worktree — I broke the name pair **at runtime** in my own probe and
watched the locator, which is the thing the assertion actually calls:

```
[probe] SAVE baseline                count("Save Snapshot") = 1
[probe] SAVE with h3 id REMOVED      count("Save Snapshot") = 0  | role-only count = 1
[probe] SAVE id restored             count("Save Snapshot") = 1
[probe] SAVE aria-labelledby REMOVED count("Save Snapshot") = 0
[probe] SAVE restored                count("Save Snapshot") = 1
[probe] SAVE near-miss name          count("Save Snapshots") = 0
[probe] RESTORE baseline             count("Restore Snapshot?") = 1
[probe] RESTORE with h3 id REMOVED   count("Restore Snapshot?") = 0  | role-only count = 1
[probe] console errors: []
```
Breaking **either** half of the pair drops the count to 0 while `role="dialog"` alone
still counts 1 — the exact blind spot §3.4 named, now closed, and `exact: true` also
rejects a near-miss name. This is a real guard, not a restatement.

## R3 — item 3: header comment — **DONE**

- `browser-verify.mjs:57-60` now reads "There are now TWO possible log lines — the
  ordinary scaled one below, or 'policy inactive' … not one"; the false "one log line …
  is the whole visible contract" sentence is gone.
- `:78-98` adds **THE TRADE-OFF THIS DENOMINATOR CHANGE INTRODUCES**, which states the
  un-namespaced host-wide `/proc/loadavg` numerator against the container-scoped
  denominator, works the 60-on-64-cores example through to the pinned 4.0x ceiling, names
  both consequences (4x-slower failure of a hung suite; `VERIFY_MAX_LOAD_PER_CPU` refusing
  an idle run), says plainly that it "swaps under-scaling for over-scaling, not for
  'always correct'", and names `cpu.stat`'s `throttled_usec` and PSI `cpu.pressure` as the
  container-scoped signals that would settle it. That is the whole of what §5 item 3 asked
  for, written honestly.
- `:121-158` and `:160-182` carry the new function-level docs; the `readCgroupCpuQuota`
  comment explains *why* the root alone is insufficient, citing this box's own layout.

## Gates I re-ran on `cc68cf7d`

| gate | exit | result |
|---|---|---|
| `node --experimental-strip-types tests/scripts/browser-verify-timing.test.ts` | 0 | **22/22** (was 18/18; +4 path-resolution tests) |
| same tests vs the pre-fix module (scratch copy) | 1 | **20/22**, the two new path tests failing — fail-first confirmed |
| `npm run lint` | 0 | — |
| full `npm test` | 0 | `# tests 11877 / # pass 11785 / # fail 0 / # skipped 91 / # todo 1` (+4 vs. my last run, exactly the four new tests) |
| `PW_CHROMIUM_PATH=… npm run verify:focus-traps` | 0 | **27/27** |
| `npm run check-no-console` | 0 | — |
| `npm run check-server-reachability` | 0 | — |
| `npm run check-docs` | 0 | — |
| `npm run honesty-audit` | 0 | — |
| `node scripts/check-scoring-receipt.mjs main..HEAD` | 0 | no scoring-path files changed |

`verify:a11y` (69/69) and `verify:surfaces` (159/159) were verified on `c11dd263` and are
untouched by `cc68cf7d`, which changes no `src/` file and no surface either suite drives.

## Nits — not blocking, no re-review needed

- **`verify-focus-traps.mjs:124`** — a future context that forgets to pass
  `accessibleName` would call `getByRole('dialog', { name: undefined, exact: true })`,
  which Playwright treats as *no* name filter, so the assertion would pass vacuously. It
  is not fully silent (the recorded label would read `ACCESSIBLE NAME "undefined" …`), and
  all five current contexts pass a name, but a one-line `if (!accessibleName) throw new
  Error(...)` at the top of `verifyDialog` would make it impossible. *(Read from the code,
  not measured.)*
- **`browser-verify.mjs:186-190`** — the v2 nested path is joined under `/sys/fs/cgroup`,
  which is the v2 mount only on a pure-v2 system; on a hybrid host the v2 mount is
  `/sys/fs/cgroup/unified`. The probe simply ENOENTs there and falls through to v1, so it
  degrades to the previous behaviour and cannot report a wrong number (a v1 controller
  directory contains no `cpu.max`, so no false positive is reachable — case (n) above).
  Parsing `/proc/self/mountinfo` for the real mount points would be the complete version,
  if this ever needs to be exact on a hybrid box.

**MERGE.**
