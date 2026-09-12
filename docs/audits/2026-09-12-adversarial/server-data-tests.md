# Adversarial mistake hunt — server, data-path, tests (2026-09-12)

Range: `git log --oneline 9b199b72..c087a6ca` (25 commits, the producer-tier /
root-cause-pipeline / verify-report lane and its two review rounds). Read-only.
Worked from `git archive c087a6ca | tar -x` under
`<session scratch>/invC` with `node_modules` symlinked; ran a keyless server
there on `:5322` (killed when done). Nothing in
`/home/user/STORYMACHINE`'s working tree was touched except this file.

Two 2026-09-06-hunt findings were re-verified per instructions (both from
`docs/audits/2026-09-06-mistake-search/findings/A-server.md`, both already
fixed on `main` *before* this range — the fixes are pre-range, so they are not
"new" findings here, only confirmed-still-holding):

- **A1-R8** (cue-guard cost bound, `server/lib/validation.ts`). Rebuilt the
  exact repro shape (200 distinct `NAMEn (cont'd)` cues x 30 occurrences each,
  double-spaced, lowercase tail) against current `main`:
  `fountainShapeRejectionReason` now REJECTS it in 27ms
  (`must not contain more than 50 distinct all-caps character-cue-shaped
  lines that each occur more than 15 times`), where the 2026-09-06 hunt
  measured 82,401ms of accepted analysis. **CONFIRMED CLOSED.**
- **F1** (`/api/nvm/whatif/doctor` had neither a size nor a shape guard on
  the projected Fountain). Current `server/routes/nvm/twin-whatif.ts:291-313`
  now has `exceedsGuard` (`fountain.length > MAX_FOUNTAIN_CHARS ||
  fountainShapeRejectionReason(fountain) !== null`) gating every
  `scoreDraft` call, with an honest `tooLargeDraft` degradation. Re-verified
  by code inspection and arithmetic (the measured 1,246,983-char repro is
  1.39x `MAX_FOUNTAIN_CHARS` = 900,000, so the length check alone would have
  caught it) rather than a fresh live repro through the What-If session flow
  — noted so this isn't overclaimed as a rebuilt reproduction. **CONFIRMED
  CLOSED (code-level).**

## Checklist

| # | Item | CHECKED | Result |
|---|---|---|---|
| 1 | Routes added/changed in range | YES | `server/routes/export.ts`, `coverage-letter.ts`, `nvm/twin-whatif.ts`, `scriptide.ts` all keep their pre-existing `gameLimiter`/`validate(...)` unchanged — the range only swapped inline `locateIssues`/`clusterIssues` pairs for `buildRootCausePipeline`. Live-tested empty/malformed-JSON/wrong-type/non-UTF-8/CRLF/2MB-oversized bodies against `/api/export/coverage`, `/api/export/coverage-letter`, `/api/nvm/whatif/doctor`: every case returned a bounded 4xx (400/413), never 500 or a hang. All touched routes call the doctor via `runScriptDoctorForRequest`/`runScriptDoctorOffThread` (the pool), never in-process. Sent a marker string (`ZZMARKERSECRET12345`) through `/api/export/coverage`: it appears once in the returned report (the writer's own text, expected) and zero times in the server log. CLEAN. |
| 2 | verify-report CLI / verify-compare.ts forging | YES | Forged verdict stamp, health, contentHash, engineCommit all correctly caught (see Findings). **Forged sceneCount/wordCount/page-references are NOT caught in ANY artifact shape (HTML or letter/markdown)** — see BUG-1. Report-for-script-B: correctly rejected (`content_mismatch`, exit 1). Nonexistent file: exit 2. BOM-prefixed script file: content hash still matches (BOM is stripped before hashing, consistently) — CLEAN, not a bug. CRLF body on the analysis routes: handled, 200. |
| 3 | New shared modules boundary inputs | YES | `scene-ranges.ts` (`formatSceneList`): `[]` → `''`, `[0]` → `'Scene 1'`, negative/NaN indices dropped, 10,000-element array → `'Scenes 1–10000'` in-process, no throw. `reference-bounds.ts`/`percentile-copy.ts`: `percentileIsComparable` rejects non-finite/undefined scene or word counts (returns `false`, never throws). `priorities-copy.ts`: negative count clamped to 0, no throw. `page-refs.ts`: out-of-range `sceneIdx`, `-1` sentinel, and unresolved scenes all degrade to `null`/`''`, never throw. No duplicate implementation found for any of these — each is a genuine single-source consolidation (confirmed the two "twin" files `src/hooks/idempotent-state.ts` + `useIdempotentState.ts` are the documented core/wrapper split, not a duplicate). |
| 4 | Persistence/data paths (Snapshot/wordCount, drift guard, sample report) | YES | `SnapshotSchema.wordCount` (`server/lib/validation.ts:2826`) is optional/typed — a legacy snapshot with no `wordCount` resolves to `null` in `snapshotTrend()`, which `percentileIsComparable` treats as "not comparable" (never a stale band, never a crash) — by design and tested. `tests/core/p0-sample-drift.test.ts` compares the committed sample against a **live call to the generator's own `renderP0SampleReport()`**, masking only the wall clock and the engine commit (with an explicit test that the mask does NOT swallow a real content or hash change) — **the guard cannot be satisfied by a stale sample**; ran it, confirmed the mask-coverage test still fails on a forced content change. |
| 5 | Test soundness, 5 mutations on 5 new tests | YES | Applied 5 source mutations against 5 different new/changed test files (`scene-ranges.ts` MIN_RUN 3→2, `reference-bounds.ts` min↔max swap, `page-refs.ts` boundary `>=1`→`>=0`, `percentile-copy.ts` dropped the word-count half of the comparability gate, `finding-jump.ts`'s `rootCauseCountSentence` dropped the rule-count clause). **All 5 mutations were killed** (each caused 1-6 test failures in its file) — no `.only`/`.skip`/`.todo` masking a real failure in any range-touched test file (the `t.skip('worker pool unavailable...')` lines in `doctor-analysis-budget.test.ts` are pre-existing conditional environment guards, not blanket skips, and are outside the range's own new assertions). The CPU-time change to the no-fire budget table (`tests/core/doctor-analysis-budget.test.ts`) measures `process.cpuUsage()` around a direct, same-thread `runScriptDoctor()` call (not the off-thread pool) — no worker-thread CPU is hidden from the measurement, and the pre-existing wall-clock assertion against the FULL budget stays as a backstop. No hole found in that change. |
| 6 | CI/gates | YES | No `.github/**` or `package.json` changes in this range at all. `node scripts/check-scoring-receipt.mjs 9b199b72..c087a6ca` reports zero scoring-path files touched; independently confirmed with `computeReachableSet('.', ['server/nvm/analyze/doctor.ts'])` that NONE of the 17 new/changed range files (root-cause-pipeline.ts, reader-tier.ts, page-refs.ts, scene-ranges.ts, reference-bounds.ts, strengths-copy.ts, percentile-copy.ts, priorities-copy.ts, finding-jump.ts, the touched routes) is in doctor.ts's 67-file reachable set — the receipt gate is not blind to anything new here. `check-no-console.mjs`: 304 files under `server/`, 23 quarantine entries, all proven unreachable — OK, exit 0. `scripts/report-unverified-gates.mjs`: exit 0 today (2026-09-12); of the 5 unverified gates, `tests/core/auc24-table.test.ts` **expires 2026-10-01** and `tests/e2e/journeys.test.ts` **expires 2026-10-15** — both inside the requested window; `craft-kb.test.ts` expires 2026-11-01 (outside it); the two corpus-gated suites (`real-script-corpus`, `anti-slop-real-corpus`) have `expires: null` by design. |
| 7 | Docs-vs-code (5 claims) | YES | See Findings for the 2 verified-TRUE numeric claims (page-refs 231/0/79, root-cause-pipeline's `SCENE_SPAN_DRIFT_MEASUREMENT`, both re-derived live and both correct) and DOC-1 below (README.md/ARCHITECTURE.md are silent on the whole producer-tier/root-cause-pipeline surface — not false, but a coverage gap in the two top-level orientation docs for a range this large). |

## Findings, ranked

### BUG-1 (HIGH) — the offline/route verifier cannot catch a forged scene count, word count, or page reference anywhere in the report — the exact three numbers the new producer tier's whole premise rests on

`server/lib/verify-compare.ts`'s `VerifyExpected`/`compareVerifyClaims` (used
by both `POST /api/export/verify` and `scripts/verify-report.mjs`) checks only
`contentHash`, `health`, `verdict`, `totalIssues`, `healthPercentile`,
`engineCommit`, `rulebookCount`. It has **no field at all** for `sceneCount`,
`wordCount`, or a page reference — so even the route, if asked, could not
check them. `scripts/verify-report.mjs`'s HTML/markdown scrapers likewise
never look at the tier's "Length" line or any `tier-page`/page-reference text.

This matters specifically *because of this range*: `server/lib/reader-tier.ts`
and `server/lib/page-refs.ts` (both added 2026-09-11) put exactly these three
numbers on the one page a producer is told to trust —
`server/lib/page-refs.ts`'s own header says "a wrong page number sends a
producer to the wrong page, which is worse than sending them nowhere," and
the whole `npm run verify-report` pitch (printed in every exported report's
own verify block) is "anyone with the original script text can confirm it was
produced by the engine — not hand-edited." A hand edit to exactly these three
numbers is invisible to that promise.

Reproduction (server on `:5322`, keyless, from the `invC` archive tree):

```
curl -s -X POST http://localhost:5322/api/export/coverage \
  -H 'Content-Type: application/json' \
  --data @/tmp/sample.json -o /tmp/cov.html
cp /tmp/cov.html /tmp/f_length.html
# forge the tier's Length line and one finding's page reference
python3 - <<'EOF'
import re
fn='/tmp/f_length.html'
h=open(fn).read()
h=re.sub(r'(Length</span> )[^<]*',
         r'\g<1>9,999 scenes · 999,999 words · ~500 pages / ~500 min (est.)', h, count=1)
h=re.sub(r'(tier-page">)p\. \d+', r'\g<1>p. 999', h, count=1)
open(fn,'w').write(h)
EOF
node --experimental-strip-types scripts/verify-report.mjs /tmp/f_length.html \
  data/screenplays/chain-of-custody.fountain
```

Output (real): the real report is 13 scenes / 824 words / p. 2 on that
finding. The forged file claims 9,999 scenes / 999,999 words / p. 999. The
CLI's output:

```
authentic: yes  (does the provided script's sha256 match this report's claimed hash?)
  contentHash: 96f529970a75577d4431dc7aa2000d6daa6f7ec3cd5bfd364ae0495f57407fcc

reproducible under this engine:
  health: yes  (report 76.3, local 76.3, Δ 0.00)
  verdict: yes  (report CONSIDER, local CONSIDER)
  totalIssues: yes  (report 178, local 178, Δ 0.00)

VERIFIED — authentic and reproducible under this engine.
```

Exit code 0. The same forgery on the **letter** (markdown) form of the same
report reproduces identically (`**Length.** 9,999 scenes · 999,999 words` →
still `VERIFIED`, once the script text is re-supplied so the hash matches).

By contrast, forging the verdict stamp, the health number, or the content
hash IS caught (see the CLEAN items above and the round-2 fix in this same
range, `eec3c6d3`, which specifically repaired the verdict-stamp scrape after
the tag moved from `<div>` to `<span>` — proof the team is actively
maintaining this exact surface, which makes the sceneCount/wordCount/page-ref
gap look like an oversight in the same pass rather than a deliberate
non-goal: nothing in `verify-report.mjs`, `verify-compare.ts`, or either
brain Surface note documents this as an intentionally-unchecked field).

Severity: HIGH rather than CRITICAL because forging these numbers cannot move
the health/verdict/hash the report's core trust claims rest on — a forger
could not fabricate a better score this way. It is real nonetheless: a
producer could be shown a hand-edited scene count/page count/page reference
in an exported report, run `npm run verify-report` exactly as the report's
own footer instructs, and be told "VERIFIED — authentic and reproducible,"
which is the one sentence this whole surface is designed to make trustworthy.

### DOC-1 (LOW) — README.md/ARCHITECTURE.md are silent about the producer tier / root-cause pipeline

`git diff --stat 9b199b72..c087a6ca -- README.md ARCHITECTURE.md` is empty —
neither file was touched. `grep -in "producer tier|root.cause pipeline|reader
tier" README.md ARCHITECTURE.md` returns nothing. This is a ~9,800-line-added
range that added a whole new report surface (the one-page producer tier),
two new server library modules doctor.ts-adjacent renderers depend on
(`page-refs.ts`, `reference-bounds.ts`), and a consolidated pipeline
(`root-cause-pipeline.ts`) that replaced eight hand-assembled call sites.
`docs/brain/Surfaces/Surface - Producer Tier.md` and
`Surface - Root Cause Pipeline.md` both exist and are accurate (verified
live, see below) — the gap is specifically in the two top-level orientation
docs `CLAUDE.md` names first (`README.md`, `ARCHITECTURE.md`), which a reader
following `CLAUDE.md`'s own orientation order would not learn this surface
exists from. Not a false claim — an omission — hence LOW/NIT rather than
BUG.

### Verified-true doc claims (not findings, but the two-per-item-7 spot checks)

- `docs/brain/Surfaces/Surface - Producer Tier.md`: "On
  `tests/fixtures/feature-length/assembled-feature.fountain`: 231
  references, 0 unresolved, monotonic, page 1 to page 79." Re-derived live:
  `scenePageNumbers()` on that fixture → `count 231 unresolved 0 min 1 max
  79`. **TRUE.**
- `server/lib/root-cause-pipeline.ts`'s `SCENE_SPAN_DRIFT_MEASUREMENT`
  (70 vs 69 root causes, "Scenes 2–12" vs "Scenes 2–4, 6–9", "Scenes 1–58" vs
  "Scene 1") and the brain note that quotes it
  (`docs/brain/Surfaces/Surface - Root Cause Pipeline.md`): both are
  live-gated by `tests/routes/root-cause-parity.test.ts`, which re-measures
  every one of the six values against a fresh `clusterIssues`/pipeline run
  and separately asserts the brain note's prose contains the same six
  values. Ran the file: `pass 18, fail 0`. **TRUE, and self-verifying** (a
  future `cluster.ts` change that shifts any of the six numbers fails this
  test rather than leaving the comment/brain-note wrong).

## Not investigated further (budget)

- Did not spin up the full `npm test` or the 8-suite browser battery
  (out of scope per the task's budget instruction).
- Did not fuzz `page-refs.ts` against fountain inputs with duplicate or
  forced (`.`) scene headings beyond the existing test's coverage — spot
  checks (0-scene, out-of-range index, `-1` sentinel) all degraded safely.
- Did not attempt to break `computeDraftRank`'s cross-clock dedupe fallback
  (`src/lib/snapshot-trend.ts`) with adversarial clock skew — that file was
  only trivially touched in this range (the `wordCount` field) and its
  ranking logic is unchanged from the prior, already-reviewed lane.
