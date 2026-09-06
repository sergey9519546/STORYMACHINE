# Independent review — Draft History provenance (B-3…B-7)

Reviewer: independent (did not build the change). Read-only; nothing in the worktree was edited
(final `git status --porcelain` empty), every probe lived in the scratchpad, every server I booted
was shut down (`shutdown()` on each probe; no `server.ts` process left with this worktree as cwd).

Worktree `/home/user/STORYMACHINE/.claude/worktrees/agent-a8b942a0dfd80e98c`, one commit `b903b4b0`
on `8749d02f`, 8 files, +1270/−90. Budget-limited pass as instructed: diff reading, four browser
probes, the touched unit tests, lint/honesty/no-console/receipt. No full suite, no battery.

**Verdict: MERGE.** Every numbered item of the brief is built, not narrowed, except B-7's signal row,
which the brief itself scoped to two decimals and which the report declares. Four residual limits of
the chosen key are worth writing down (§3) but none of them is a reason to hold this: each fails
strictly less often than the state on `main`, where every run of every script and the demo sat in one
bucket.

---

## 1. Brief vs diff

| # | Brief item | Status | Evidence |
|---|---|---|---|
| 1 | Per-script identity; migrate additively; scope the rank AND the list; button count and denominator must reconcile | **DONE** | New pure module `src/lib/doctor-history-identity.ts` (keys `editor` / `upload:<name>` / `sample`, `groupHistoryByScript`, `computeSampleContentHash`). Entry gains `scriptKey?` (`ScriptDoctorPanel.tsx:1234-1240`), stamped with the analyzed document's own title at `:1400-1404`; legacy entries still validate (`:1303-1308`). One memo feeds both numbers (`:2376` `historyView`), the button reads `historyView.currentCount` (`:5290`) and the list renders `historyView.groups` (`:5300-5360`). Rank scoped at `:2417-2423`, snapshots admitted only for the editor key (`:2413-2416`). |
| 1b | The brief's premise ("the per-document draft/session id the snapshots array is keyed by") | **PREMISE WAS WRONG — correctly rejected and documented** | `src/lib/scriptide-draft-store.ts` persists exactly one draft under `scriptide_draft_v1` with `snapshots` as that one document's version list; there is no per-document id to borrow. The lane says so in its report and in the module header (`doctor-history-identity.ts:17-24`), and derives identity from provenance instead. This is the right call, and it is the honest one. |
| 2 | Sample identity a property of the run; guard the fallthrough; prove empty history and ONE POST | **DONE** | `CoverageSummary.tsx:202-203` (`sampleRunRef`, `lastRunTextRef`), claimed before the request at `:236-239`, handed up at `:319`, fallthrough guarded at `:381-382`. Driven: **1** `POST /api/scriptide/doctor/stream` on the golden path (was 2), `sm_doctor_history_v1` `<empty>`. |
| 3 | `analyzedIsSample` as the first branch of `verifyBlockedReason`; assert both entry points | **DONE** | `ScriptDoctorPanel.tsx:3631-3634` — first provenance branch (after the "no text" branch, which is correct ordering, not a narrowing). Two sentences, split by whether a dismissible chip exists. Driven on the golden path: button visible, `disabled=true`, title = the threaded-path sentence. |
| 4 | Gate the rank on `!analyzedIsSample`, render an honest line, keep legacy sample rows out by contentHash | **DONE** | `:2417` (`&& !analyzedIsSample`), `DraftRankOrSampleNote` at `:409-427` rendered at both header sites (`:4543`, `:4592`), legacy-by-hash at `doctor-history-identity.ts:entryScriptKey` + `computeSampleContentHash`. Driven (below): a seeded legacy row carrying the sample's real hash lands in "Built-in sample (not your draft)" and in no denominator. |
| 5 | Receipt endpoints at the delta's precision | **DONE for health; signals left at 2 dp, declared** | `:2166-2174` (`before.health.toFixed(1)`), and `FixStructuralSignalsStrip` keeps `toFixed(2)` with a reasoned comment at `:1921-1929`. The brief itself asked for "two for signals", so this matches the instruction; the finding's arithmetic (0.0042 → 0.0254) still rounds to `0.00 → 0.03`. No delta chip sits beside that row, so nothing on screen contradicts itself — the report says exactly this. |
| — | Constraints | **HELD** | `check-scoring-receipt main..HEAD` → 0 ("no scoring-path files changed"); `SnapshotManager.tsx`, `coverage-html.ts`, `coverage-letter.ts`, `draft-rank-copy.ts` untouched (the 8 changed files do not include them); localStorage key unchanged and read forward-compatibly. |

Register rows 58/59/60 exist and are specific; row 32 records that "of this script" only became true
today. `honesty-audit` 0 (60 rows, clean).

## 2. Driven myself (Chromium, keyless server booted from this worktree, production `dist/`)

States 1–4 (probe `rank-review/prov1.mjs`, adapted from the hunter's own `p1-rank.mjs`):

| state | rank line | Draft History button | localStorage (`title@health[key]`) |
|---|---|---|---|
| 1 — sample via StartScreen → Full report | "**The sample is not ranked against your drafts** — it is a demo script, not your work." | *no Draft History section* | `<empty>` |
| 2 — upload `alpha.fountain` ("Script Alpha") | "First saved draft — rank … after your next run or save" | `1 RUN OF THIS SCRIPT` | `Script Alpha@65[upload:script alpha]` |
| 3 — upload `beta.fountain` ("Script Beta") | "First saved draft — …" (was "3rd of 3 … of this script") | `1 RUN OF THIS SCRIPT · 1 ELSEWHERE` | `…alpha…, Script Beta@62[upload:script beta]` |
| 4 — Alpha again, revised, **different filename** | "Rank among your drafts: 1st of **2** runs and saved drafts of this script (by health)" | `2 RUNS OF THIS SCRIPT · 1 ELSEWHERE` | two `upload:script alpha` rows + one beta |

Group headings in state 4: `Script Alpha (this script) 2 runs`, `Script Beta 1 run`. Zero console
errors. Every claim in the report's own table reproduces, including the titles: history rows now read
"Script Alpha"/"Script Beta", never the host project's "Dead Frequency".

**Golden-path POST trace** (same probe, network listener before the first click):
`["/api/scriptide/doctor/stream"]` — exactly **one**, against the hunter's measured two. Full POST
log for the whole session shows one stream POST per diagnosis and nothing else doctor-shaped.

**Reconciliation, every state I produced**: button `currentCount` and the rank's `of` agree wherever
both are numbers (state 4: 2 rows of this script; `of` = 1 other run + the current draft = 2), and
where they cannot agree by construction (editor draft with scored Versions, `of` adds snapshots) the
two sentences say different things in words — "N runs of this script" vs "N runs **and saved
drafts**". That is the documented three-number contract at `:2359-2372`, and it holds.

**Legacy migration + the sample** (`prov2.mjs`, seeded store: one unkeyed row carrying the sample's
real `contentHash` `09e8b038…`, two unkeyed rows, then one upload run):

```
rank line   : "First saved draft — rank among your drafts appears after your next run or save"
button      : DRAFT HISTORY | 1 RUN OF THIS SCRIPT · 3 ELSEWHERE
storage     : {"total":4,"byKey":{"NO-KEY":3,"upload:script alpha":1}}
groups      : Script Alpha (this script) 1 run | Built-in sample (not your draft) 1 run |
              Earlier drafts (recorded before runs were tracked per script) 2 runs
```

So: **the sample never enters a denominator after the migration** — including a sample row recorded
by the pre-fix build, recognized by content, not by its (wrongly stamped) title. Nothing was dropped:
4 stored rows, 4 listed, 1 counted.

**50-entry cap** (`prov2.mjs`, 50 seeded other-script rows, then one run of Alpha): store stays at 50,
Alpha's new row survives, the oldest other-script row is evicted, button reads
`1 RUN OF THIS SCRIPT · 49 ELSEWHERE`. The cap is global and unchanged by this lane; the new grouping
makes its behaviour visible rather than altering it.

**Delete Everything** (`prov3.mjs`): 1 history row before; after Settings → Session → Delete
Everything → confirm, `sm_doctor_history_v1` is gone and the only surviving keys are
`["sm_app_view_v1","sm_session_id_v1"]` (`SettingsPanel.tsx:630` — `localStorage.clear()`). No stale
script key, no orphaned history, mid-history or otherwise.

**The "pre-existing hole"** (`prov4.mjs`): clicking "Full report" at the earliest instant the button
exists in the DOM gives `dialog: true`, editor empty, panel cold — "WRITE SOME SCRIPT CONTENT, OR
UPLOAD A SCRIPT FILE ABOVE, BEFORE RUNNING A DIAGNOSIS" — and **zero** doctor POSTs, ever. The golden
path dead-ends. I accept the lane's "pre-existing, out of scope" call: the mount effect that installs
the sample (`CoverageSummary.tsx:374-380`) is untouched by this diff, and the unmount happens before
it resolves, so on `main` the fallthrough could not have rescued it either (an unmounted component
runs no effects; the second run on `main` only ever fired *after* a successful install flipped
`doctorAutoSample`). It is nonetheless a P0-golden-path defect that deserves its own lane, not just a
paragraph in a report — see note 5.

Tests and gates I re-ran here: `doctor-history-identity` 33/0, `coverage-handoff` 17/0,
`snapshot-trend` 63/0, `shape-rhythm-panel-copy` 30/0; `lint` 0; `honesty-audit` 0;
`check-no-console` 0; `check-scoring-receipt main..HEAD` 0.

## 3. Is the chosen key sound? (the shortcut hunt)

Probed the pure function directly (`analyzedScriptIdentity`), which is the honest way to answer this:

```
upload "Untitled Screenplay" as a.fountain -> upload:untitled screenplay
upload "Untitled Screenplay" as b.fountain -> upload:untitled screenplay     (MERGED)
editor draft titled "Script Alpha"         -> editor
the same text uploaded as alpha.fountain   -> upload:script alpha            (SPLIT)
editor after the writer replaces its text  -> editor                         (MERGED)
untitled upload "My Draft v2.fountain"     -> upload:my draft v2
its next revision "My Draft v3.fountain"   -> upload:my draft v3             (SPLIT)
```

Four residual limits, all of them strictly better than `main`'s single global bucket, none blocking:

1. **Two different scripts sharing a title page collide** into one key and one denominator. Narrow
   (it needs the same title, not merely the same filename) but it is the same *class* of falsehood
   B-3 is about.
2. **One script split across `editor` and `upload:`** — the writer who analyzes a file, then loads it
   into the editor (or the reverse), gets two histories for one script.
3. **The `editor` key survives a wholesale replacement of the draft**, so "of this script" can still
   be false for a writer who starts a new screenplay in the same editor. This one is a deliberate
   trade and the code half-says so: keying the editor by title would be easy (`hostTitle` is already
   passed in) but would break the snapshots↔editor association that makes `rankSnapshots`
   (`:2413`) correct. I would take the trade too; I would write it down.
4. **A titleless upload splits per revision filename** — the module header advertises the title-page
   path as the fix for exactly this, without naming the fallback's cost.

None of these is tested or named in `doctor-history-identity.ts`'s header, which is otherwise the
most careful file in the diff. Everything else I looked for is clean: `entryScriptKey` never guesses
from the title (the field that was wrong); `isCurrentDoctorHistoryEntry` rejects an empty/non-string
key while still accepting a missing one; `computeSampleContentHash` degrades to null and the entry
then stays "legacy" (out of every denominator either way); the two `DraftRankOrSampleNote` render
sites cannot disagree because they are one component; the gate's rank regexes are built from the
shared copy helpers rather than re-pinned literals; and the P3 export assertion that changed meaning
("carries the draft-rank line" → "makes no draft-rank claim on the sample") did not lose coverage —
it moved to the writer's own draft further down the same section, and the diff says so.

The two gate bugs the lane found are real and their fixes are right: the verdict wait now keys on the
summary's own "Full report" button and reads the verdict from the summary panel alone
(`verify-p2-p3-surfaces.mjs:631-651`), and the receipt regex accepts decimal endpoints (`:983`).
Finding them while driving, and saying so, is the behaviour this standard is for.

## 4. The stronger version

The strongest version would have made the *document* the unit of identity rather than the door it
came through: hash the analyzed text's title page + first scene into a script fingerprint, or give
the ScriptIDE draft a real per-document id (the store has exactly one draft today, but the id is what
lets a second one exist tomorrow), and key both history and `snapshots` off it — which is what the
brief assumed existed and what would make all four limits in §3 disappear at once rather than trading
them off. Short of that, the same diff plus a `KNOWN LIMITS` block in the module header naming the
four cases, and two tests pinning the two merges (same-title uploads; editor-replacement), would have
closed the gap between what the code does and what the header claims it does. Both are in scope for a
follow-up, not for this merge: the brief asked for a stable key and honest counts, and both are here.

## 5. Verdict — MERGE

Non-blocking follow-ups, in the order I would do them:

1. `src/lib/doctor-history-identity.ts` (header) — add the four known limits from §3 verbatim, with
   the same candour the rest of the file has. A reader currently learns what the key *is*, not what
   it cannot tell apart.
2. `tests/core/doctor-history-identity.test.ts` — two cases: two different uploads sharing a title
   page collapse to one key (asserting the current, documented behaviour), and an editor draft and an
   upload of the same text do not. Both are one-liners against the pure function, and they turn §3's
   limits into pinned facts instead of reviewer folklore.
3. Golden-path hole (out of this lane's scope, now measured): clicking "Full report" before the
   sample run starts leaves the writer on "write some script content" with **zero** analyses ever
   fired. File it as its own lane with my `prov4.mjs` trace; the fix is a real decision
   (`autoLoadSample` into `ScriptDoctorPanel` vs. holding the toolbar control until the first report),
   not a patch.
4. `docs/CLAIMS_REGISTER.md` row 32 — the "SCOPE FIX (2026-09-05): …" sentence runs on directly from
   `draft-rank-copy-consistency.test.ts` with no separator, so it reads as part of the test's name.
   One semicolon fixes it.
5. `FixStructuralSignalsStrip` — the two aggregates still round 0.0042 → 0.0254 to `0.00 → 0.03` on
   five surfaces. The lane's reasoning for not changing one of five is right; the cross-surface pass
   is worth queuing rather than leaving as a comment.
