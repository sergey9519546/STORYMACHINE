# Feature-length lane — independent review (reconstructed)

*The full review file (two rounds, ~34 KB) was lost in the 2026-09-07 sandbox
rebuild. What follows is the reviewer's own text, verbatim from the session
transcript: the round-1 verdict paragraph and brief-vs-diff table, and the
round-2 final message. Reviewed objects: bff55e39 (round 1), dd57251d
(round 2); base main 9b199b72. Same Opus reviewer for both rounds; reviews
ran from read-only `git archive` exports. Merged as dd57251d after the
orchestrator's own gates (npm test 12,985/0, build 0, browser battery 8/8).*

## Round 1 — verdict (verbatim)

**Verdict: REVISE — two items, both at gates, both cheap.** Every one of the four brief items
is genuinely built, the root cause is correct and I reproduced it in a 40-line component with
no CodeMirror and no feature-length document, and every number in the report reproduced on my
own measurements — 231/113,968/19,293, 899/554/70, 431/81/42/345, 605 → 615 (+328 with all 70
cards expanded), 374 no-location notes, 30 of 70 cards stating both counts, 236x/10x margins,
211/211 surfaces, 28/28 public benchmark. The two blocking items are (1) the shape-guard
threshold, which subtracts real protection from 75 pre-existing rows where a two-line tier
preserves it, and whose new constants are already known-inconsistent with the same file's own
"plausible feature" measurement; and (2) the browser step's fail-first determinism, which the
report records as intrinsically impossible ("left undone") and which I made deterministic
**3/3 unfixed / 0/3 fixed** by changing how the keystrokes are delivered, not how fast the box
is. Items 3–8 are non-blocking.

### Brief vs diff (verbatim)

| # | Brief item | Status | Evidence (file:line + what I measured) |
|---|---|---|---|
| 1 | (#6) committed feature-length fixture, ~140+ scenes, deterministic order, one title page, provenance naming every source and its CC0 licence, explicit "deliberately incoherent" note; state whether it joins the output-identity set; used by new tests and a browser step; a coherent second feature if legally possible | **DONE** | `tests/fixtures/feature-length/assembled-feature.fountain`, built by `scripts/build-feature-length-fixture.mjs`. Re-ran the assembler **twice** in the export: both writes and the committed bytes are `sha256 2126833a…13ae84`, 113,968 B / 231 scenes / 19,293 words, and `--check` exits 0 — no clock, no randomness, `readdirSync(...).sort()` (`:143`) is the only ordering input. Provenance is a Fountain boneyard (`:71-118`) naming all 20 sources with per-file scene/word counts and `CC0 1.0`; the file carries 21 `/*…*/` blocks (its own + the 20 inherited source headers) and **all 55 "CC0" mentions sit inside boneyards** — none in scored text. All 20 `data/screenplays/*.fountain` carry a CC0 header and all 20 appear as manifest rows in `data/screenplays/LICENSE-live-action.md`. Output-identity exclusion verified at the source, not asserted: `scripts/check-doctor-output-identity.mjs:155-162` is `readdirSync('tests/fixtures').filter(f => f.endsWith('.fountain'))` — a *directory* named `feature-length` cannot match, there are zero top-level `tests/fixtures/*.fountain`, and neither that script nor any of its inputs is in this diff, so 45/45 is unchanged **by construction**. Second coherent feature correctly refused with the licence evidence rather than faked. |
| 2 | (#1, BLOCKER) reproduce, root-cause the setState cycle with file:line, fix at the cause, add (a) a unit/DOM test that fails on the current tree and (b) a browser step; fail-first logs kept | **DONE, one part not as strong as reported** | Root cause verified independently. Fix: `src/hooks/idempotent-state.ts` + `src/hooks/useIdempotentState.ts`, wired at `ScriptIDE.tsx:545`. (a) `tests/core/scriptide-render-loop-guard.test.ts`: I ran it **3× on the export (exit 0, 9/9 each)** and **3× on a copy with `ScriptIDE.tsx:545` reverted to `useState` (exit 1, 7 pass / 2 fail each)** — deterministic in both directions. (b) `scripts/verify-p2-p3-surfaces.mjs` `P2-featurelen`, 17 assertions, all green here. The report calls its non-determinism intrinsic; it is not. |
| 3 | (#9) one jump affordance for every finding with a resolvable span, one shared component, keyboard-reachable, accessible name "Jump to scene N"/"Jump to line N", honest "no location" reason for the rest; `verify:surfaces` gains a count assertion ≥ located findings and one driven jump from priority #3 | **DONE** | One resolver `src/lib/finding-jump.ts`, one control `src/components/scriptide/FindingJump.tsx`, both consumed by `ScriptDoctorPanel.tsx` and `CoverageSummary.tsx`. Driven in my own probe: 605 controls in the default Full Report, **933 with all 70 root causes expanded (+328 member-row jumps)**, 374 `[data-no-location]` notes, every one `tabindex="0"` with a reason in `aria-label` and `title`. Three member-row jumps clicked, all landed correctly. The count assertion is against the server's own answer for these bytes (`>= 554`), not a literal. |
| 4 | (#10) decide issues vs rules, render both where they differ, test over the fixture that headline/chip/expander agree, register the sentence | **DONE** | `rootCauseCountSentence` / `rootCauseExpanderLabel` (`finding-jump.ts:246-273`). Measured live: **70 cards, 0 whose rendered sentence disagrees with its own `data-rootcause-issues`/`data-rootcause-rules`, 30 stating both**, and 70 expanders all reading `Show the N rules behind them` with N equal to the card's rule count. Server side: 30/70 root causes genuinely differ. Register rows 80–81. |
| — | Constraints: nothing on the scoring path; do not touch `coverage-html.ts` / `coverage-letter.ts` / `export.ts` / `logline.ts`; brain notes; trailers; no push | **HELD** | `node scripts/check-scoring-receipt.mjs 9b199b72..bff55e39` → **exit 0, "no scoring-path files changed"**. None of the four reserved files appears in the 24-file diff. `check-brain` exit 0 (95 notes / 303 links fresh), `brain-coverage` 7/7, `honesty-audit` exit 0 (451 files + 439 md + 81 register rows). Both trailers present on `bff55e39`, verbatim; worktree clean; nothing pushed. |

## Round 2 — final message (verbatim)

## Verdict: MERGE

Both blocking items are fixed at the cause. I checked all ten of my items in the failure direction first, and every guard fails when it should.

**Blocking item 1 — the browser step is genuinely fail-first.** Reproduced independently on two exports differing by one line (`ScriptIDE.tsx:562`): unfixed **exit 1, 209/211**, exactly two failures, both loop assertions, `2 loop error(s): Maximum update depth exceeded`; fixed **211/211**. The check you asked for holds: **"the edit actually landed — the scene count advanced — before=231 after=232" PASSES in the unfixed run**, along with the other fifteen `P2-featurelen` assertions — flood delivery cost no assertion. One honest caveat recorded: my *first* fixed-tree run gave 171/173 with a FATAL timeout in `P2-W6`/`P2-generative`, because I had a CPU-bound test running alongside it; idle it gives 211/211. That was my harness, not the diff, and I re-measured rather than repeating round 1's mistake.

**Blocking item 2 — two tiers, neither vacuous.** All five numbers reproduce (28,011x / 25.0x short-form; 236x / 10.0x feature; `buildPlausibleFeature()` 6.2x / 6.3x), 648/0. Failure direction: mistyping the class predicate (`feature-lenght/`) fails with *"expected at least one feature-scale fixture row — the tier below would otherwise prove nothing"*; raising the short-form floor to 30,000x fails naming the real worst row. So the split cannot be hollowed out and the restored floor is live, not inert.

**Non-blocking 1–6 all built and all fail-first where applicable**: reverting `titlePage` to `useState` fails the guard; restoring row 80's old `15 issues from 12 rules` fails the new register-parsing test; adding a 21st screenplay makes the assembler exit 1 with a named remedy. My independent tab-stop census reproduces the lane's numbers **+1 on each path** (my selector counts one element theirs does not): golden 212/94/14, fixture 1,296/374/29 — and I verified directly that all 374 and all 94 notes keep `role="note"` plus the reason in both `title` and `aria-label`, including the 345 that are no longer tab stops, so reading order really is unchanged. Fixture determinism re-verified after regeneration (sha256 `b4386189…` twice, equal to committed).

**The two judgments you asked for:**
- *Seed guard not weakened.* It still requires `initialDraft.titlePage` as the first argument. I tested the regression it exists for in the shape the new hook allows — re-hardcoding the placeholder through `useIdempotentState` — and it fails, exit 1. The hook choice moved to the render-loop guard, where reverting it fails. The pair is stronger than before.
- *Budget test load sensitivity is pre-existing.* The failing assertion builds its own 157,992-char synthetic feature, is byte-identical on `9b199b72`, and `git diff 9b199b72 dd57251d` touches neither it nor `doctor-budget.ts`. Standalone it measures 8,578 ms against a 15,000 ms margin — **1.75x headroom** — and `npm test` runs files in parallel, so a 2.16x swing needs no help from this diff. The lane's ~1,023 ms fixture row is a separate serial subtest. But that 1.75x standalone headroom is a latent flake worth an owner ticket independent of this lane.

Five observations are filed for a later lane, chiefly that `verify-p2-p3-surfaces.mjs:2237-2249` still asserts `tabindex === '0'` on only the *first* no-location note while its label claims keyboard reachability generally — the lane added `data-no-location-focusable` for exactly this and asserted nothing with it.

Read-only respected throughout: lane worktree clean at `dd57251d`, main clean, every server and probe I started is down.
