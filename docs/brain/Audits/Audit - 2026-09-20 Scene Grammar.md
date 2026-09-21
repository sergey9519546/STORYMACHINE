---
type: audit
updated: 2026-09-20
sources: [docs/audits/2026-09-20-scene-grammar/README.md, src/lib/fountain.ts, server/nvm/analyze/scene-split.ts, server/nvm/analyze/doctor.ts, server/nvm/analyze/screenplay-normalizer.ts, server/nvm/analyze/canonical-fountain.ts, server/lib/validation.ts, server/routes/scriptide.ts, src/components/editor/incremental-reparse.ts, scripts/lib/scene-segments.ts, tests/core/scene-grammar.test.ts, tests/security/fountain-shape-guard-cue-parity.test.ts, docs/p1-benchmark/MEASUREMENT_RECEIPTS.md, SESSION_REPORT_2026-09-19.md]
status: active
---

# Audit — 2026-09-20 Scene Grammar

**Directory:** `docs/audits/2026-09-20-scene-grammar/` — the lane record for
SESSION_REPORT_2026-09-19.md §4 rows 5 and 6, on `lane/scene-grammar` from
`26d930dd`.

## What it answers

The repository held **two** answers to "where does a scene start", and seven
copies of one of them.

`src/lib/fountain.ts`'s `parseFountain` — which produces `sceneCount`, the
highest-AUC term the doctor emits — recognised the full slugline vocabulary
plus any line beginning with `.`. `server/nvm/analyze/scene-split.ts`'s
`scenesFromFountain`, the splitter under `computeEmotionalArc` and nine other
signal modules, recognised `INT.` and `EXT.` and nothing else; its own header
called fixing that "a SEPARATE, scoring-gated change" and deferred it. On a
screenplay written with `EST.`, `I/E.`, `INT./EXT.` or Fountain forced
`.HEADINGS` the arc therefore saw a handful of scenes where the report said
forty, and `arcIncoherenceDeduction` — gated at `ARC_DED_MIN_SCENES` = 15, and
THE one feature-scale deduction wired into health — never fired. Not a wrong
number: no number at all. Measured on a 16-scene mixed-heading fixture, the
splitter returned **3** scenes before and **16** after.

The second defect is in the grammar both sides shared. Fountain forces a
heading with `.` + an alphanumeric; `..` and `...` are prose, which is the
point of reserving the dot. `parseFountain` tested `trimmed.startsWith('.')`,
so a `...and then nothing.` continuation inside a dialogue block became a scene
heading and tore the rest of the block off the scene it belonged to. Measured
on a five-scene script: adding that one line moved scenes 5 → 6 and health
**62 → 37.8** (verdict CONSIDER → PASS) before the fix, and nothing at all
after it. The scarcity term is `140/sceneCount`, so a phantom heading is worth
real points.

**Fix.** One predicate, `isSceneHeadingLine`, defined at the END of
`src/lib/fountain.ts` beside the parser that owns it, with
`FORCED_SCENE_HEADING_RE` = `/^\.(?=[A-Za-z0-9])/`. `parseFountain` calls it on
line 125, where it used to carry the regex inline, and so do the six former
copies (`screenplay-normalizer.ts`, `canonical-fountain.ts`, `validation.ts`'s
DoS-guard parity mirror, `routes/scriptide.ts`, `incremental-reparse.ts`, and —
through `sceneHeadingLineIndices` — `scene-split.ts`). `doctor.ts`'s inline
thirteenth copy of the old splitter now calls `scenesFromFountain`.
`scripts/lib/scene-segments.ts` held the only copy of `sceneHeadingLineIndices`
and `splitLinesKeepingEndings`; both moved verbatim into `fountain.ts` and it
re-exports them, so the measurement harnesses and the engine can no longer hold
different opinions. Five of the six copied files carried a comment asserting
they matched `parseFountain`; all six had drifted the same way, because all six
had copied the same defect.

**Line numbers were preserved on purpose.** The grammar is appended at the end
of `fountain.ts` and line 125 is replaced one-for-one, so no
`src/lib/fountain.ts:<line>` citation anywhere in the repository moved;
`validation.ts`, `scriptide.ts` and `screenplay-normalizer.ts` were balanced
the same way, and `doctor.ts`'s edit is one line for one line, so
`doctor.ts:2092-2093`, `:2104` and `:2127-2131` — cited in CLAUDE.md,
NORTH_STAR.md, ROADMAP.md and [[Gate - Claims Register Lane]]'s row 22 — still
point where they did.

## Why it is safe to have merged

Fail-first, verified live: `tests/core/scene-grammar.test.ts` and its fixtures
run against a `git archive 26d930dd` checkout are **7 pass / 6 fail**, and
**13 / 0** after — with case (c), real forced headings, and case (d), a plain
`INT.`/`EXT.` script byte-identical to a snapshot taken from the pre-change
tree, passing on BOTH trees, as a direction guard and an equivalence pin must.
One existing assertion pinned the defect — the
[[Gate - Fountain Shape Guard]] parity suite expected a bare `"."` to be a
heading — and was corrected with three added cases; it is 670 pass / 0 fail,
and stronger than before, because the guard now calls `parseFountain`'s
predicate instead of mirroring it.

[[Gate - Output-Identity Harness]] against `26d930dd` reports **all 45 reports
byte-identical**, and that is counted rather than assumed: the 41 file-backed
fixtures contain **0** non-`INT`/`EXT` headings, **0** forced `.HEADING` lines
and **0** `..`-leading lines, so the fixture set cannot see either defect.
[[Gate - Public Benchmark]] is unchanged on all six statistics and all 32
per-script rows, so no floor in `scripts/lib/auc.ts` moved, `--lock` was not
run, and neither a rise nor a fall is being reported. `npm run gates`,
`lint`, `check-no-console`, `check-docs`, `honesty-audit`,
`check-server-reachability`, `build` and `check-scoring-receipt 26d930dd..HEAD`
all exit 0, and the receipt is appended to
[[Gate - Receipt Gate]]'s ledger.

**What no gate here could show.** [[Gate - AUC-24 Ratchet]] is the measurement
that matters for this change and it cannot run in this environment: the private
corpus is local-only by copyright, `tests/core/real-script-corpus.test.ts`
skips (1 pass / 73 skipped), and **no real-corpus figure is claimed for this
range**. The owner's next `npm run measure-real` and `npm run lock-auc24` on
recipe `shuffle-drop/v3` produce the first AUC-24 value this grammar has ever
produced; `AUC24_FLOOR` is untouched at 0.622, and
`tests/fixtures/real-corpus-manifest.json` must be re-locked in the same run,
because scene counts change on exactly the corpus scripts — real screenplays,
which is where both defects bite — that the public corpus does not contain.
A one-entry memo written for the new `parseFountain` cost was removed after
measurement showed no effect (2427/2619/2339 ms before, 2514/2313/2417 with,
2466/2334/2329 without). `npm test` in full and `npm run brain` were out of
this lane's scope.

**2026-09-20 addendum (Unicode forced headings):** `FORCED_SCENE_HEADING_RE`
widened from `[A-Za-z0-9]` to `\p{L}\p{N}` (any Unicode letter or number) on
`lane/unicode-forced-heading` off this lane's `bf4f3bff` merge — the decision
this audit's §2 deferred, now made; see
`docs/audits/2026-09-20-scene-grammar/README.md`'s "§ Unicode forced
headings (decision 2026-09-20)" and the "FORCED HEADINGS IN ANY SCRIPT" entry
in `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`.

**2026-09-20 addendum (review findings 4 and 6 fixed):** `scenesFromFountain`
now normalizes `\r\n?` -> `\n` before segmenting (a bare `\r` used to read as
no line break at all), and `AUC24_DEGRADATION_ID` bumps to `shuffle-drop/v4`
to catch up with the ellipsis and Unicode grammar changes above, which had
changed the AUC-24 recipe's segmentation without a matching id bump; see
`docs/audits/2026-09-20-scene-grammar/README.md`'s "§ Review findings 4 and 6
fixed" and the matching entry in `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`.

**Related:** [[Audit - 2026-09-19 Harness Honesty]],
[[Audit - 2026-09-12 Adversarial Review]], [[Gate - AUC-24 Ratchet]],
[[Gate - Public Benchmark]], [[Gate - Output-Identity Harness]],
[[Gate - Fountain Shape Guard]], [[Gate - Receipt Gate]],
[[Measurement - PUBLIC_BENCHMARK_2026-09-06]], [[Glossary]], [[Patterns]],
`docs/audits/2026-09-20-scene-grammar/README.md`.

## Sources

- `docs/audits/2026-09-20-scene-grammar/README.md`
- `src/lib/fountain.ts`
- `server/nvm/analyze/scene-split.ts`
- `server/nvm/analyze/doctor.ts`
- `server/nvm/analyze/screenplay-normalizer.ts`
- `server/nvm/analyze/canonical-fountain.ts`
- `server/lib/validation.ts`
- `server/routes/scriptide.ts`
- `src/components/editor/incremental-reparse.ts`
- `scripts/lib/scene-segments.ts`
- `tests/core/scene-grammar.test.ts`
- `tests/security/fountain-shape-guard-cue-parity.test.ts`
- `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`
- `SESSION_REPORT_2026-09-19.md`
