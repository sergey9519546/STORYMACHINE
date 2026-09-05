# Independent review — "Verify my rewrite" (LANE_STANDARD §6)

Reviewer: did not build this change. Read-only. Worktree
`/home/user/STORYMACHINE/.claude/worktrees/agent-a871ee9f4fbb9174c`, branch
`worktree-agent-a871ee9f4fbb9174c`, one commit `4671c543` (998 insertions,
156 deletions). Two probes were planted in `server/routes/scriptide.ts` and
reverted from a byte backup; final `git status --porcelain` in the worktree is
empty and `git log --oneline -1` is still `4671c543`. Every server and browser
I started was killed (`ps -eo pid,cmd | grep -E "server\.ts|chromium"` → none
remain).

**Verdict: REVISE.** Two of the five items are user-facing falsehoods on the
exact surface this lane exists to make reachable, and one is a registered
claim whose cited test cannot fail. The core of the change — the route, the
shared receipt builder, the keyless reachability, the Labs decision — is
sound and reproduces exactly as reported.

---

## 1. Brief vs. diff

| # | Brief item | Status | Evidence |
|---|---|---|---|
| 1 | Understand first; write the model in the report | **DONE** | The model paragraph is accurate against the code. I re-checked each claim: the four guards in `evaluateSpanRewrite` (`server/nvm/analyze/fix.ts:180-243`), the keyless `catch` → `{usedLLM:false, note}`, the whole-document multiset diff keyed on the stable issue `id`, `structuralSignals` as a separate top-level field never folded into `FixVerifyResult`, and the `labsEnabled && reportIsComplete && hasAnchor` withholding of `fixState`. The correction it adds ("unreachable *by construction* — nothing but an LLM could produce a candidate") is right and is the reason the fix is a second producer rather than a UI change. |
| 2 | Writer-supplied `candidateFountain`, `fountainField()` reuse, pooled doctor, full receipt, `usedLLM:false`, `source:'writer'`, nothing fabricated | **DONE** | `server/lib/validation.ts:927-934` (`candidateFountain: fountainField().optional()`, `span`/`issues` `.optional()` + `.refine`); `server/routes/scriptide.ts:1155-1215` (early return, `runScriptDoctorForRequest` on both documents, `buildVerifyReceipt`). Driven live (§2 below): the guard fires on the candidate with the field named, an identical candidate gives exactly zero deltas, and every number re-derives from `/doctor`. |
| 3 | Keyless UI: the affordance becomes "Verify my rewrite", sends live editor text against the report's base, shows the receipt with the same "not part of the score" labelling | **NARROWED — and wrong in one state** | Present and correct for editor and sample sources (`ScriptDoctorPanel.tsx:4326-4405`, driven in Chromium, §2). For an **FDX-sourced** report the affordance is enabled and sends the raw Final Draft XML as the candidate — see defect 1. Placement was moved from per-finding to document-level; that is the stronger choice, not a narrowing (below). |
| 4 | Decide the Labs gate honestly; record a dated amendment under Decision #3 | **DONE, with one omission** | `docs/DECISION_LOG.md:222-274`. The three passages it quotes are quoted fairly and the conclusion follows from them. It never engages the one bullet that cuts the other way — see defect 5. |
| 5 | Route tests (receipt present, `usedLLM:false`, pathological rejected, identical → zero deltas) + a browser assertion + ARCHITECTURE + CLAIMS_REGISTER | **DONE, with one test that cannot fail** | `tests/routes/scriptide-fix.test.ts` — 18/18 pass (`node --experimental-strip-types`, exit 0). `scripts/verify-p2-p3-surfaces.mjs:751-844` — I re-ran `verify:surfaces` myself: **exit 0, 166/166**, including all six new assertions. `ARCHITECTURE.md:251-267` (one sentence is false — defect 4); `docs/CLAIMS_REGISTER.md` rows 41/46/47/48, `honesty-audit` exit 0 over 48 rows. The "no model was called" assertion cannot fail — defect 3. |
| 6 | Constraints: no scoring-path files, limiter kept, no `console.*`, don't touch the other lanes' files | **DONE** | `check-scoring-receipt main..HEAD` exit 0 ("no scoring-path files changed"); `check-no-console` exit 0; the diff touches no cue regex, no `SnapshotManager.tsx`, no `coverage-html.ts`, and only the fix-route/schema/receipt/entry-point regions. |
| **F** | Follow-up: attach `structuralSignals {before, after}` whenever any candidate exists, `before` alone when none | **DONE** | `server/routes/scriptide.ts:113-152` (`fixStructuralSignals` / `baselineOnlySignals`). Measured: keyless generated fix → `{"before":{...}}` with no `after`; writer path → the pair; and the baseline equals `/doctor`'s own `structuralSignals` for the same text (`m=0, a=0.5` both sides). |
| **F** | Lift CLAIMS_REGISTER row 41's reachability qualification with keyless evidence | **DONE** | Row 41 now cites both receipts plus the keyless browser phase, and I reproduced the strip rendering on a keyless server with Labs OFF (`Talk/action swing 0.28 → 0.30 · Action-prose variation 0.64 → 0.64`). The qualification is genuinely discharged, not merely deleted. |

### Judging the eight "narrowed/changed" points the lane flagged

1. **Four-chunk `npm test`** — honest disclosure, and the right call to disclose. It also turned out to be environmental: I ran `npm test` in **one** invocation on this box — exit 0, "Running 284 test files", **11,863 tests, 0 fail, 91 skipped, 133s**. Same file count, same totals as the report. No finding.
2. **Document-level placement instead of per-finding** — **stronger**, and I would have rejected the literal reading of the brief too. The action and the receipt are whole-document; N root causes would have produced N identical buttons and one receipt, and the control would vanish on a draft with nothing to cluster. It is correctly outside the `rootCauses` conditional.
3. **"Cleared (n)/Introduced (n)" instead of "cleared · new"** — **stronger**. Reusing `FixDeltaList` means both receipts read identically; forking the wording to satisfy a brief's shorthand would have been the second implementation this standard forbids.
4. **`data-fix-receipt="writer"|"generated"`** — **stronger**. Every other suite here that matches on prose is one copy edit from a false green.
5. **Two self-caught defects (case-sensitive assertion, axe contrast)** — good; the contrast fix to `--sm-ink-mute` is the token the rest of the panel uses. I measured the shipped colour at both widths and both schemes: `rgb(107,97,82)` on `rgb(230,223,207)` ≈ 4.7:1, over AA.
6. **Copy source fix ("Revise the script and upload it again…")** — **not stronger; it replaced one false sentence with another.** See defect 2.
7. **A PDF-sourced report withholds the affordance** — correct for PDF, and the stated reason is right. The same reason applies to FDX and was not applied. See defect 1.
8. **"Nothing left undone"** — true for everything except the two states above.

---

## 2. Driving it — **REPRODUCED**

Keyless server booted through `bootKeylessServer` from the worktree,
`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`, Labs OFF
(`sm_labs_enabled=null`), sample coverage → Full report.

```
PASS :: "Verify my rewrite" present with Labs OFF, keyless
PASS :: "Fix & verify" buttons absent with Labs OFF :: count=0
PASS :: the "unchanged" caption clears after an editor edit :: captions=0
PASS :: POST /api/scriptide/fix answered 200 :: status=200 ms=327
usedLLM=false source=writer
before={"health":78.3,"verdict":"CONSIDER","contentHash":"09e8b038…7cb0"}
after ={"health":79.2,"verdict":"CONSIDER","contentHash":"3cf53493…c7bf"}
cleared=24 introduced=38
structuralSignals={"before":{"meanAbsDialogueShareDelta":0.2846,"actionSentenceCvOverall":0.6385},
                   "after" :{"meanAbsDialogueShareDelta":0.3038,"actionSentenceCvOverall":0.6393}}
```

Receipt DOM (verbatim), which matches the lane's excerpt exactly:

```
VERIFIED — YOUR REWRITE     Measured by the Script Doctor. No AI was used.
Health 78 → 79   ↑ +0.9
SHAPE & RHYTHM (DESCRIPTIVE, NOT PART OF THE SCORE)
Talk/action swing 0.28 → 0.30    Action-prose variation 0.64 → 0.64
CLEARED (24) … INTRODUCED (38) … VIEW CHANGED LINES (5)
This rewrite is your own editor text — there is nothing to apply. …  [DISMISS]
```

Network from the default surface during the whole flow:
`/api/scriptide/doctor/stream`, `/api/events`, `/api/scriptide/fix` — nothing else.

**Parity, direct to the routes** (independent server, no browser):

```
fix(before)   health 0  hash 9acca107…f4e2  verdict PASS
doctor(base)  health 0  hash 9acca107…f4e2  verdict PASS      PARITY before: true
fix(after)    health 0  hash 3963fdf9…0403  verdict PASS
doctor(cand)  health 0  hash 3963fdf9…0403  verdict PASS      PARITY after : true
```

**Identical candidate** → `cleared 0, introduced 0, healthEq true, hashEq true,
signalsEq true`.

**Pathological candidate, 2,000 distinct cues** →
`400 {"error":"candidateFountain: must not contain more than 1500 distinct all-caps character-cue-shaped lines"}` in 10 ms.
(The lane's own test only exercises the huge-token shape; the cue shape works
too — I checked because it is the shape the audit found unguarded elsewhere.)
The same shape in the `fountain` field still says `fountain: …`, so the two
fields are distinguishable in the error.

**Candidate at the char ceiling** — 899,635 chars → `200` in 3.1 s with the
honest `"Your rewrite could not be fully analyzed…"` note **plus** the
baseline-only `structuralSignals`; 900,001 chars → `400 candidateFountain: Too
big`. No 500, no fabricated numbers.

**With no LLM provider**, the generated path still answers
`200 {"usedLLM":false,"note":"No AI rewrite was produced for this span — add an
AI key in Settings…","structuralSignals":{"before":{…}}}` — the follow-up item,
working.

**Does the "throwing provider" test really prove no model call?** No — see
defect 3. Mutation-probed.

---

## 3. Shortcut hunt

**The refactor is a genuine move, not a rewrite.** I extracted the three
function bodies from `git show main:server/nvm/analyze/fix.ts` and from
`server/nvm/analyze/fix-delta.ts` and compared them character for character:
`flattenIssues` IDENTICAL, `issueKey` IDENTICAL, `multisetDiff` IDENTICAL. (The
NUL-byte story in main's comment is historical; neither file contains a NUL —
`tr -dc '\000' | wc -c` = 0 for main's `fix.ts`, HEAD's `fix.ts` and
`fix-delta.ts`.) The generated response object keeps the same key order
(`usedLLM, candidateFountain, spanReplacement, span, before, after, cleared,
introduced`), so a successful generated receipt is byte-identical to main's.
The one intended behaviour change on that path is the keyless/failed response
now carrying `structuralSignals.before`, which is the coordinator's item and is
asserted in both directions.

**No double doctor run on the base.** Measured on an 18,852-char script,
same server:

```
COLD fix  (neither cached)                 1895 ms
doctor(base) alone                          183 ms
WARM fix  (base cached by the prior /doctor) 149 ms
WARM fix  (both cached)                      12 ms
```

The coordinator-side LRU in `doctor.ts` (peeked by `doctor-pool.ts:366`) means
the baseline the panel just paid for is free here. The browser flow's 327 ms
round trip is consistent with that.

**Rate limiting.** `aiLimiter` is 20/min, `gameLimiter` 120/min
(`server/lib/session-store.ts:137-148`). A keyless writer verifying a rewrite is
therefore throttled at the LLM tier for a non-LLM action. I think this is the
**right trade and should stay**: a limiter is a property of the route, not of a
body shape; `tests/routes/route-capabilities.test.ts:165` walks Express's own
router tree and would have to be taught about branch-level limiters; 20/min is
far above any human click rate for an action that costs two full analyses; and
a second route would fork the schema, the receipt builder's call site and the
UI's fetch for no user-visible gain. The comment at
`server/routes/scriptide.ts:1128-1134` says exactly this, honestly.

**Huge editor text / stale report.** The base is `fixSourceText`
(`ScriptDoctorPanel.tsx:3176-3179`) — the exact text the *displayed* report was
computed on, with the fdx/pdf `convertedFountain` precedence — so the
comparison can never be against a stale base; if the report is stale relative
to the editor, that difference *is* the delta being measured, which is the
point. On size: the route degrades honestly at the ceiling (measured above),
and the client-side whole-document diff is safe because `diffLines`
(`src/lib/diff.ts:149-159`) falls back to a removed-block/added-block patch
above `DP_LINE_CAP` instead of running an unbounded LCS, so a feature-length
rewrite cannot freeze the tab. `VERIFY_CHANGED_LINE_CAP` then caps the DOM.
This all holds; no finding.

**Decision #3 amendment — does the argument hold, or is it motivated?** It
holds on what it quotes, and it quotes fairly: every bullet under "What
changed" *is* a producer or consumer of model output; the stated liability *is*
"shipping unevaluated output next to a score that is measured"; and "the flag
decides whether a control renders, never whether the readiness answer is
honest" does cut in the amendment's favour. A writer-supplied candidate has
nothing a graded generative benchmark could grade — that is simply true. But
the amendment is **selective**: Decision #3's second Rationale bullet says
*"With Labs off, the default surface makes no LLM-adjacent call at all — which
is what the landing page's keyless claim has always implied,"* and
`tests/core/generative-surface-labs-gate.test.ts:5` restates it as *"no
LLM-adjacent request may fire from the default Doctor + Editor surface."* After
this change the default surface POSTs to `/api/scriptide/fix`, which
`route-capabilities.test.ts:165` lists as a route that reaches the LLM. The
request provably reaches no model, so the *spirit* survives; the sentence does
not. Skipping the one line that cuts against you is the tell I look for, and it
is here. It is a documentation gap, not a bad decision.

**CLAIMS_REGISTER.** Rows 41, 46, 47, 48 exist with evidence pointers that
resolve (row 46's cited test title matches the test verbatim); `honesty-audit`
passes over 48 rows. Row 41's lift is earned. Rows 46 and 47 lean on a test
that cannot fail (defect 3).

**Gates, re-run by me, foreground, exit codes:**

| Gate | Exit |
|---|---|
| `npm run lint` | 0 |
| `npm test` — **one invocation**, 284 files, 11,863 tests, 0 fail, 91 skipped, 133 s | 0 |
| `npm run check-no-console` | 0 |
| `npm run check-server-reachability` | 0 |
| `npm run check-docs` | 0 |
| `npm run honesty-audit` (48 rows) | 0 |
| `node scripts/check-scoring-receipt.mjs main..HEAD` | 0 — "no scoring-path files changed" |
| `PW_CHROMIUM_PATH=… npm run verify:surfaces` | 0 — 166/166 |
| `node --experimental-strip-types tests/routes/scriptide-fix.test.ts` | 0 — 18/18 |

---

## 4. What a stronger version would have done

The strongest version of this change would have started from "what text does
the browser actually hold, and is it the same *representation* as the text the
report was computed on?" rather than from "is this a PDF?" — the PDF case is
one instance of that question and the FDX case is another, and answering the
general question would have produced one predicate (`the candidate must be
Fountain the client holds, matching the base's representation`), one honest
disabled-reason string, and a copy branch that could not contradict the app's
own upload behaviour; it would then have proved the no-model claim with an
invocation-counting provider spy rather than a throwing one — a spy is the same
three lines and is the difference between a test that documents an intention
and a test that could catch its violation — and it would have paid the two
sentences of documentation debt the change actually incurred (the generated
path is *not* pooled; the default surface *does* now call an LLM-capable
route). All of that is inside this lane's scope: it is the same file, the same
predicate, the same test file, and two doc lines. Out of scope, and correctly
left alone: moving `fixAndVerify` onto the pool, and splitting the writer
branch onto `gameLimiter`.

---

## 5. Verdict — **REVISE**

1. **`src/components/scriptide/ScriptDoctorPanel.tsx:3277-3280`
   (`verifyCandidateText`) — an FDX-sourced report verifies the raw Final Draft
   XML.** `activeText` (line 2440) is `uploadedFile.content` for any non-PDF
   upload, and for an `.fdx` upload that content is the XML source
   (`handleFileSelected`, lines 2508-2514, stores the file text with
   `format: "fdx"`). The base is the *converted* Fountain
   (`fixSourceText`, 3176-3179), so the two sides are different
   representations of nothing in common. Reproduced end to end in Chromium on
   the keyless server: uploaded a 12-scene `.fdx`, ran diagnosis, and the
   affordance rendered **enabled**; clicking it returned `200` with a full
   receipt and the card rendered

   ```
   VERIFIED — YOUR REWRITE   Measured by the Script Doctor. No AI was used.
   Health 22 → 0   ↓ -21.6
   CLEARED (141)   INTRODUCED (10)
   ```

   for a "rewrite" the writer never made. The route's completeness guard does
   not catch it (the XML analyses as a "complete" degenerate report,
   `health 0`). This is precisely the meaningless comparison the lane says it
   withheld the affordance for PDFs to avoid — report point 7 — with the same
   reason available and unapplied. Withhold it (with a stated reason, and
   ideally a pointer to the existing "Load converted Fountain into editor"
   path) whenever the client's active text is not Fountain in the same
   representation as `fixSourceText`, not merely when it is a PDF.

2. **`src/components/scriptide/ScriptDoctorPanel.tsx:4353-4356` — the
   upload-state lead-in promises something the app cannot do.** "Revise the
   script and upload it again, then measure it against this report" renders
   whenever a non-PDF upload is active. But `handleFileSelected` calls
   `setReport(null)` (line 2521) on every upload, and the whole Verify block is
   gated on `reportIsComplete` (line 4326) — so uploading again destroys the
   report the sentence promises to measure against and removes the control that
   said it. LANE_STANDARD §2: a sentence that promises something must be true
   in every state that renders it. If item 1 is fixed by withholding on
   uploads, this sentence disappears with it; otherwise it needs to describe
   the flow that actually exists.

3. **`tests/routes/scriptide-fix.test.ts:316-320` — the "no model was called"
   assertion cannot fail.** The throwing provider only proves the writer path
   does not *depend* on model output; it cannot see a call whose failure is
   swallowed, which is exactly the shape `fixAndVerify` itself has. Probe
   (planted and reverted): inserting, at the top of the `candidateFountain`
   branch in `server/routes/scriptide.ts:1155`, a real
   `await fixAndVerify(fountain, {startLine:1,endLine:3}, [{rule:'PROBE',…}])`
   inside a `try {} catch {}` leaves **all 18 tests passing** (a second, cruder
   probe calling `generateContent` directly does the same). CLAIMS_REGISTER
   rows 46 and 47 cite this test as behavioural evidence for "no AI, no key
   needed" and "No AI was used". Replace the throwing provider with a spy that
   counts invocations and assert the count is `0` after the writer request —
   then the guard fails on the unfixed input, as §3 requires.

4. **`ARCHITECTURE.md:259-261` — one false sentence.** "Both run the whole
   14-pass doctor on both documents through the same pooled path
   `/api/scriptide/doctor` uses" is true only of the writer path. The generated
   path calls `runScriptDoctor` in process
   (`server/nvm/analyze/fix.ts:271-272` and `:336`), which is legal there —
   `doctor-pool-call-sites.test.ts` only polices route files — but the surface
   map now asserts otherwise. Say "the writer path runs both analyses through
   the pooled path…; the generated path still analyses in process".

5. **`docs/DECISION_LOG.md` amendment + `tests/core/generative-surface-labs-gate.test.ts:5`
   — reconcile the one passage the amendment skipped.** Decision #3's Rationale
   says the default surface with Labs off "makes no LLM-adjacent call at all",
   and that test's header repeats it; the default surface now POSTs to
   `/api/scriptide/fix`, listed in `route-capabilities.test.ts:165` as reaching
   the LLM. Add a sentence to the amendment addressing it head-on (the *request
   shape* cannot reach a model, and the route is on the stricter limiter
   anyway), and correct the test header so the repository's own statement of
   the invariant stays true.

Items 1–3 block the merge. Items 4–5 are documentation corrections that should
ride with the same revision.

---

# Re-review (2026-09-05) — commit `321e95ba`

Budget-limited pass as instructed: no full `npm test`, no browser battery.
Two commits now on the branch (`ba4cf424`, `321e95ba`), rebased on `f7e5507c`.
I re-read the diff, re-planted my probe once, and drove three panel states in
Chromium on a keyless server. The probe was reverted from a byte backup;
worktree `git status --porcelain` is empty at `321e95ba`, and every server and
browser I started is killed (`ps` → 0 matches).

**Verdict: REVISE — one item, one ternary.** All five items from the first
review are genuinely done, and three of them are done better than the list
asked for. But the fix to defect 2 reintroduced the same *class* of defect one
axis over: the new withheld-reason copy is false in the panel's own sample
state, which a first-time visitor reaches from a prominent button.

## The five items, checked against the diff

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | One representation predicate; any active upload withholds with a reason naming the recovery path | **DONE, stronger than asked** | `ScriptDoctorPanel.tsx:3271-3316` — `verifyBlockedReason` is stated once and the candidate is `fountain` (the editor draft) and only ever that (`:3316`). It is a predicate about representation, not a format list; PDF, FDX and a Fountain upload all fall out of `uploadedFile ? withhold`. Driven (below): FDX → present, **disabled**, reason rendered, **zero** POSTs to `/api/scriptide/fix`. |
| 2 | The false upload lead-in is gone; the second false sentence it caught is fixed | **DONE for the upload states, NOT for the sample state** | The conditional lead-in is gone; one unconditional sentence remains (`:4383-4386`). The new reasons do name the re-diagnosis cost. But `verifyBlockedReason` branches on `uploadedFile.format` and never on `uploadedFile.provenance`, and `loadSample` (`:2822-2830`) sets `uploadedFile` with `provenance:"sample"` — see the item below. Self-catching the `clearUpload`/`setReport(null)` sentence was good work. |
| 3 | Counting provider spy, mutation-checked | **DONE** | `tests/routes/scriptide-fix.test.ts:322-350`. I re-planted my exact probe (a swallowed `await fixAndVerify(...)` at the top of the candidate branch in `server/routes/scriptide.ts`): **17 pass / 1 fail**, message verbatim *"the writer path must reach no model at all, but the provider was invoked 1 time(s)"*. Reverted → 18/18, exit 0. The spy returns successfully rather than throwing, which is the right call — a swallowed rejection is what made the old test blind. Register rows 46/47 now cite the spy and say so. |
| 4 | ARCHITECTURE corrected | **DONE** | `ARCHITECTURE.md` now says the writer path is pooled and the generated path analyses in process inside `fixAndVerify`, and says why that is legal (`doctor-pool-call-sites.test.ts` polices route files). That matches `server/nvm/analyze/fix.ts:271-272,336`, which I re-checked. |
| 5 | Decision #3 amendment quotes and corrects the skipped passage; test header corrected | **DONE** | `docs/DECISION_LOG.md:248-269` quotes the second Rationale bullet verbatim, states plainly that it "is therefore no longer literally true", and replaces it with **"the default surface makes no call that can reach a model"** — request shape, not URL — backed by the early return, the spy, and the retained `aiLimiter`. `tests/core/generative-surface-labs-gate.test.ts:5-19` carries the same correction and names the reason it is narrower than before. Read against Decision #3's own text, this is now a fair reading rather than a selective one: it engages the strongest counter-passage instead of routing around it. |
| + | New standing browser guard for the FDX state | **DONE** | `scripts/verify-p2-p3-surfaces.mjs:867-935` — asserts present-and-disabled, that the reason names the on-screen recovery control (and that the control exists), and zero POSTs. Built from an inline FDX rather than a fixture, so the suite stays self-contained. |

## Driven in Chromium (keyless, Labs OFF, `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`)

```
STATE 1  editor-sourced report (sample coverage → Full report)
         present=1  enabled=true
         "Rewrite the draft yourself in the editor, then measure it against this report.
          The Script Doctor re-reads both drafts and shows exactly what moved — no AI, no key needed."
         "Your draft is unchanged since this report — verifying now reports a zero delta."

STATE 2  .fdx upload → Run Diagnosis → complete report
         present=1  enabled=FALSE
         "This report came from an uploaded Final Draft file, and the browser holds no Fountain
          version of it to compare. Use "Load converted Fountain into editor" below, then clear
          the upload (✕ above) and run the diagnosis again."
         "Load the converted Fountain text into the script editor" control on screen = 1
         forced click → POSTs to /api/scriptide/fix during the FDX state = 0
```

The hole I reported is closed, the withheld state explains itself, the named
recovery control is genuinely on that screen, and nothing is sent. **REPRODUCED.**

## The one new finding

```
STATE 3  panel idle → "Try a sample script" (the panel's own on-ramp,
         ScriptDoctorPanel.tsx:3989-3994) → complete report
         present=1  enabled=FALSE
         "This report came from an uploaded file. Verification compares your editor draft,
          so clear the upload (✕ above) and run the diagnosis again to verify a rewrite here."
```

Nothing was uploaded. `loadSample` (`:2822-2830`) sets `uploadedFile` with
`provenance:"sample"`, and the chip a few pixels above this sentence already
says **"Sample script: …"** with a Sparkles icon and a ✕ whose accessible name
is **"Stop analyzing the sample script and go back to the editor content"**
(`:3730-3752`). So the panel disagrees with itself in one viewport, and the
sentence a first-time visitor meets on the zero-friction on-ramp is false.

Withholding the control here is *correct* — the base is the built-in sample and
the editor holds the writer's own unrelated draft, so there is no comparable
candidate — it is only the reason that is wrong. This is the same class as the
defect this commit exists to remove (LANE_STANDARD §2: a sentence must be true
in every state that renders it), one axis over: last round the missed axis was
file format, this round it is provenance. `verifyBlockedReason` already has
`uploadedFile` in scope and the codebase already branches on
`uploadedFile.provenance` twice in the chip directly above.

## Verdict — **REVISE (one item)**

1. **`src/components/scriptide/ScriptDoctorPanel.tsx:3305-3312`
   (`verifyBlockedReason`) — branch on `uploadedFile.provenance`, not only on
   `.format`.** In the `provenance === "sample"` case say what is true, e.g.
   *"This report is the built-in sample script, not your draft. Dismiss the
   sample (✕ above) and run the diagnosis again to verify a rewrite of your
   own draft."* Reached in Chromium via the panel's own "Try a sample script"
   button (`:3989`), and also by the `autoLoadSample` mount path (`:2847`).
   Worth one browser assertion beside the FDX guard, since source-level review
   missed the FDX state for the same reason it would miss this one.

Nothing else is outstanding: items 1–5 are verified done, the spy is
falsifiable, the amendment is honest, `lint`, `honesty-audit` (48 rows),
`check-docs`, `check-scoring-receipt main..HEAD` and
`tests/core/generative-surface-labs-gate.test.ts` all exit 0 on the rebased
head. If the coordinator prefers to land the branch and take the sample-state
sentence as an immediate follow-up, that is a defensible call — it is a
one-ternary copy fix with no behavioural component — but as written the panel
ships a sentence it knows to be untrue, so I cannot return MERGE on it.
