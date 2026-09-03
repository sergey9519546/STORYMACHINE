# Engineering Retrospective — 2026-09-02

An adversarial review of the whole project at `main @ db8b7a88`, commissioned
after the phase program closed. The reviewer was given the list of mistakes
already known (browser proofs bound to one machine, the receipt gate's
historical empty range, the console gate's basename exemptions, the
scoring-thesis test blind spot, the title injection, vacuous shape-only tests,
docs drifting by hand-copied numbers) and told not to re-report them. What
follows is what it found beyond that list, ranked by fix-one-thing value,
with the disposition each received.

Class key — **MISTAKE**: wrong when made. **WEAK ROUTE**: defensible then,
worse now. **OPEN QUESTION**: reasonable people disagree; owner decides.

---

## 1. The health score rewards padding — and the tests protect the defect
**MISTAKE · dispatched (lane R5, unmerged branch)**

`docs/scoring/VERBOSITY_BIAS_2026-07-11.md`: appending stateless filler moves
health 66.4 → 72.9 (+6.5), across a verdict tier (`verdictFor`,
`doctor.ts:828-832`). `health = 100 − densityPenalty − scarcityPenalty` with
`density = weightedIssues / wordCount^0.7`, so issue-free words shrink the
penalty. Held seven weeks as `disposition: 'known-failing'`
(`evals/scoring/runner/metamorphic-cases.ts:34`); `ci.yml` says the witness
"does not fail this step." The stated reason for holding — a fix would break
the 20-sample calibration-band monotonicity and the 71-script produced-anchor
manifest — is the tell: **the corpus was being protected from the score
instead of the score from the corpus.**

Better route: normalize density by opportunity count (scenes, speeches,
action paragraphs), re-derive the bands and re-lock the manifest as one
migration with a receipt. Scoring-path; owes the owner's corpus run, so it
ships as a ready branch, not to main.

## 2. "The AUC cannot be verified in CI" was false all along
**MISTAKE · machinery delivered (lane R1); the table itself awaits one owner-local run — `npm run lock-auc24`, blocking from 2026-10-01**

CLAUDE.md, NORTH_STAR §0, the receipt ledger's header and the guard's own
comment all reason: corpus is copyrighted → cannot reach CI → *therefore the
AUC value cannot be verified*. The second arrow does not follow. AUC-24 is
computed (`tests/core/real-script-corpus.test.ts:160-176`) from two arrays of
numbers produced by a seeded, deterministic degradation. No text is needed to
check the arithmetic, and the project already commits exactly this shape
(`tests/fixtures/real-corpus-manifest.json`: 72 rows of hash + numbers). The
missing artifact was the sibling table of 24 degraded-variant health scores.
With it, CI recomputes AUC every run; the 2026-08-08 fabrication would have
required forging 48 individually plausible values whose Mann–Whitney
statistic lands on a claimed number, instead of typing one figure into prose.

## 3. The receipt gate did not cover the parser the score is computed from
**MISTAKE · fixed 2026-09-02**

`check-scoring-receipt.mjs:531-541` gated only `server/nvm/analyze/**` and
`server/nvm/revision/**`; the reachability walk from `doctor.ts` also finds
`src/lib/fountain.ts` (decides what is a scene heading — produces
`sceneCount`, the AUC ~0.938 term) and `src/lib/screenplay-layout.ts`, and
the prefix filter discarded both. Proven on `c9023b8f` ("multi-language scene
headings"): the gate named only `screenplay-normalizer.ts` while the commit
also changed `fountain.ts`. **Fix:** classification no longer consults
directory at all for tier 2 — every file `doctor.ts`'s import graph reaches
is scoring-path by default, gated only by a `REACHABLE_BUT_NOT_SCORING`
exclusion set that starts (and, as of this fix, remains) empty because no
file has an output-identity proof (`scripts/check-doctor-output-identity.mjs`)
that it can't move a number; `src/lib/screenplay-layout.ts` was investigated
as the leading exclusion candidate and disqualified — `doctor.ts:67` imports
`layoutScreenplay` directly and `doctor.ts:864` uses its output to compute
`pages`. Re-running the old range now names `src/lib/fountain.ts` (plus
`server/lib/validation.ts`, also newly reachable-gated); see
`scripts/check-scoring-receipt.mjs`'s header and
`tests/core/scoring-receipt-guard.test.ts`'s cross-boundary fixture.

## 4. Collab hands any anonymous caller a live copy of an unpublished draft
**MISTAKE · FIXED (lane R3)** — room ids are now server-minted 128-bit
capabilities (`server/lib/collab-rooms.ts`), `POST /api/collab/rooms` accepts
no client-chosen id, `POST /api/collab/token` refuses any id the server never
minted, the WebSocket upgrade additionally requires a live registry entry, the
typed name is a local label, and `docs/AUTH.md` has a "Collaboration rooms"
section.

`server/routes/collab.ts:24-31` mints an HMAC room token for any room name to
any caller — no session check, no ownership, no invite. The room name is free
text the writer types; join and the Y.Doc syncs. `gameLimiter` allows 120
mints/min/IP, so obvious names are enumerable. The surrounding ceremony (HMAC,
TTL, room-binding, two test files) all passes and none of it matters, because
the attacker asks for a token for the other room. `docs/AUTH.md` never
mentions collab. Fix: server-minted unguessable room ids; the typed name
becomes a local label — a share-link model matching the rest of the product.

## 5. The deterministic/generative boundary is prose, not a module boundary
**WEAK ROUTE · FIXED 2026-09-03 (lane R2)** — edges cut (LLM behind `server/lib/llm-port.ts`, `rewrite-llm.ts`, `compile-types.ts`, `from-stage.ts`, `request-logger.ts`); doctor's reachable set 85 → 63 files, 43 → 21 outside the two core directories; enforced by `tests/core/pure-core-boundary.test.ts` (fails 5 of 6 on the pre-fix tree) with all 45 doctor fixtures byte-identical.

`ARCHITECTURE.md §1` promises the core is pure and keyless. Traced:
`doctor.ts → deep-read.ts → engine/ai.ts` and
`doctor.ts → compile.ts → NarrativeState.ts → engine/Stage.ts` (better-sqlite3).
Each doctor worker loads a native DB binding and an HTTP AI stack to compute a
pure function of a string. The project mechanically enforces "no console.*"
and "no unreachable files" and enforces its most important architectural
contract with a paragraph. Fix: a tripwire over the reachable set (it fails
on day one — that is the finding), then cut the edges with an
output-identity receipt.

## 6. Test investment is anti-correlated with rule importance
**MISTAKE · dispatched (lane R4) — part (a), the untested-21 and the false coverage claim, delivered 2026-09-03: measured (0 of 3186 distinct rule constants now zero-occurrence), all 21 given real fire/no-fire tests, the generator's claim is now a live measurement with a CI tripwire (`tests/core/rule-test-coverage.test.ts`); see `docs/rulebook/COVERAGE_2026-09-03.md`. Part (b), the passes/tests line-count inversion itself, remains open.**

`revision/passes/*.ts` is 98,321 lines; `tests/passes/*.test.ts` is 104,485 —
half the repository guards the channel the doctor measures at AUC ~0.076,
inverted. And it skipped the rules a human would name: **21 of 3,187 rule
constants have zero occurrence anywhere under `tests/`** (ACT1_TOO_LONG,
FLAT_CHARACTER_ARC, TONAL_WHIPLASH, NO_DIALOGUE, …), all live. Meanwhile
`docs/rulebook/README.md` — the "machine-counted authority," in a public
repo — states every rule is "fire-tested and no-fire-tested" and governed by
a per-wave checklist that is retired. The sentence is a hardcoded string in
`scripts/generate-rulebook.ts:575`, not a measurement.

## 7. The AUC "ratchet" does not ratchet
**WEAK ROUTE · dispatched (lane R1)**

The hard floor is 0.622, derived as measured−0.05 from a 2026-07-10 figure of
0.672. Last measured is 0.731. The floor never moved, so a change can give
back 0.109 of AUC — more than every structural wave ever won — and pass. The
real target (≥ 0.9) sits in a `todo`, which never fails a build.

## 8. The honesty audit checks numbers, not claims, and exempts the docs that carry them
**WEAK ROUTE · dispatched (lane R4)**

`honesty-audit.mjs` is superlatives, one banned word, and five stale digit
strings; `docs/**` is exempt by construction. So the rulebook's false coverage
claim was out of scope by design; `MEGA_CATALOG_12700_SYSTEMS.md` — 867 lines
of the permutation reasoning NORTH_STAR calls the biggest liability — sits at
the root of a public repo with an audit pattern whose own comment explains why
it will not fire on it; and nothing lexical can catch the entrance's "reads
your screenplay like a studio coverage reader," an empirical claim with zero
human-agreement evidence. Fix: a hand-maintained claims register with CI
enforcement, and archive the catalog.

## 9. "Report unverified gates" is non-blocking by design
**WEAK ROUTE · fixed 2026-09-03 (lane R1) — gates carry an `expires` date and the CI step exits non-zero past it; only the auc24-table gate has a date so far, the other four are the owner's call**

The project's answer to an unverifiable gate was a beautiful reporter for it,
when the gate was verifiable all along (finding 2). The pattern recurs:
24,722 dead lines written up and none deleted; skipped suites named and none
blocked; a wrong score documented and not fixed. Documentation of a gap became
the deliverable. Fix: every reported gap gets an expiry after which the step
blocks.

## 10. The validation design was never power-analyzed
**OPEN QUESTION · power analysis delivered — `docs/p1-benchmark/POWER_ANALYSIS_2026-09-02.md` and `PRE_REGISTRATION_PROTOCOL.md` §12 (proposal, unsigned); owner signs**

The One Bet is 5 moderated sessions and ≥3 blind readers against a ≥0.80
pooled-AUC gate on 153 held-out scripts. Nowhere is there a κ floor, an
overlap budget so κ is computable, or a minimum-detectable-effect. Five
sessions cannot distinguish "writers want this" from "five people were
polite." The least-specified thing in the repository is the one it calls its
One Bet. The honest power analysis may say the plan is too small; that
conclusion is the deliverable.

## 11. "Keyless-first" has become a way not to evaluate the generative half
**OPEN QUESTION · owner decision**

Every LLM-adjacent test is plumbing (`ai-budget`, `ai-config-live-path`,
`llm-ready`). Not one assertion anywhere says whether a rewrite pass, a
copilot suggestion, or a deep-read annotation is *good* — or not worse than
the input. Keyless-first is a genuinely strong privacy posture and worth
keeping; it has also been load-bearing as an excuse. The decision is binary:
demote the generative surface to Labs alongside OASIS, or fund a ~30-case
golden set with a human-scored rubric and a pinned model. Neither is an
engineering call.

## 12. Three persistence layers, and one field no backup can hold
**WEAK ROUTE · dispatched (lane R6)**

Draft state lives in localStorage, an IndexedDB mirror, and server SQLite,
reconciled by two pure functions and a third comparator, each layer added to
patch the one below. It works, and the reasoning at each seam is careful —
but the seams are where W3 and E4 each found a real data-loss bug. One is
still open: `ScriptIDE_State` has no title-page column, so S1's byte-identical
restore drill faithfully restores a session that structurally cannot hold the
writer's title, author, or contact. Masked only because W6 made that form
Labs-only.

**Landed:** `ScriptIDE_State` gained a nullable `title_page_json` column (a
new v13→v14 rung on the existing migration ladder, `server/engine/Stage.ts`),
wired through the save/load routes, `ScriptideSaveBodySchema`, and the
client's local/IndexedDB envelope and server-reconcile paths; the S1 restore
drill now asserts the title page round-trips too.

---

## Well-built — no action

`scripts/run-tests.mjs`'s collected/not-run coverage model (every test file
must run or be listed with a surviving reason). `check-no-console.mjs`'s
derive-from-tsconfig-and-prove-unreachable exemption design.
Session eviction (`MAX_SESSIONS`, idle TTL, 7-day sweep, close-never-unlink
in persist mode). `Stage.ts`'s sequential `user_version` migration ladder.

---

## Verdict

**The project mistook the reproducibility of its verdict for the correctness
of it, then spent a year building infrastructure that could only ever confirm
the first.** Every headline artifact — the 3,217-rule catalog, the ~200,000
lines of passes and their tests, the 12 CI gates, the receipt ledger, the six
browser-proof scripts, the adversarial sweeps — measures whether the same
input yields the same output, or whether a process step was skipped. Not one
measures whether the output is right. The project's own instruments have said
it isn't, in writing, for weeks: the rule channel is AUC 0.076 inverted, the
scarcity term is 0.938 (the score is substantially a scene counter wearing
200k lines of costume), and padding a script with meaningless prose raises
its health across a verdict boundary. That last one has a document explaining,
rigorously, why it cannot be fixed without breaking the calibration corpus —
the precise moment the tooling stopped serving the product and the product
started serving the tooling. NORTH_STAR states the law that would have
prevented all of it ("correct before reproducible — a broken ruler is
perfectly reproducible") and the repository is a monument to having written
that law down after building the ruler. The most damning detail is the
smallest: the AUC number the whole receipt apparatus exists to protect is a
pure function of 48 floating-point numbers that could have been committed at
any point in three months and checked by CI in ten lines — and the reason
nobody did is that "the corpus can't reach CI" was a more interesting problem
to build around than to solve.

The orchestrator's own last week — hardening gates, re-verifying claims,
sweeping for rot — is part of this verdict, not exempt from it.

---

## Dispositions at a glance

| # | Finding | Class | Disposition |
|---|---|---|---|
| 1 | Verbosity bias | MISTAKE | R5 — ready branch, owner run to merge |
| 2 | AUC verifiable from committed numbers | MISTAKE | R1 — machinery landed (`scripts/lib/auc.ts`, `npm run lock-auc24`, `tests/core/auc24-table.test.ts`); table not locked yet, corpus is owner-local |
| 3 | Receipt gate misses `src/lib/fountain.ts` | MISTAKE | Fixed 2026-09-02 — reachability now ungated by directory, `REACHABLE_BUT_NOT_SCORING` starts empty |
| 4 | Collab rooms unowned | MISTAKE | R3 — delivered: server-minted room ids, share-link model, `docs/AUTH.md` §Collaboration rooms |
| 5 | Core imports AI + SQLite | WEAK ROUTE | R2 — fixed 2026-09-03: edges cut, reachable set 43 → 21 files outside the core dirs, `tests/core/pure-core-boundary.test.ts` + its allowlist enforce it |
| 6 | 21 untested rules; false coverage claim | MISTAKE | R4 — part (a) delivered 2026-09-03 (0 untested, claim now measured, CI tripwire added); part (b) (line-count inversion) open |
| 7 | Ratchet never re-ratcheted | WEAK ROUTE | R1 — floor moved to one place (`AUC24_FLOOR`) but NOT raised: the last real AUC-24 measurement is 2026-07-11, so the raise waits on the lock run |
| 8 | Audit checks numbers, not claims | WEAK ROUTE | R4 |
| 9 | Non-blocking-by-design reporter | WEAK ROUTE | R1 — landed: per-gate `expires`, reporter exits 1 past a deadline, both workflow comments corrected |
| 10 | No power analysis | OPEN | Delivered — `docs/p1-benchmark/POWER_ANALYSIS_2026-09-02.md` + protocol §12; owner signs |
| 11 | Generative half unevaluated | OPEN | owner decides |
| 12 | Title page unpersisted | WEAK ROUTE | R6 — landed: `title_page_json` column + full round trip |

Lanes R1–R6 are Opus agents in isolated worktrees, launched 2026-09-02; their
outcomes are recorded in `docs/PATH_TO_EXCELLENCE.md` as they land.
