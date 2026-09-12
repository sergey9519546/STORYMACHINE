---
type: surface
updated: 2026-09-12
sources: [server/routes/export.ts, server/routes/coverage-letter.ts, server/lib/verify-compare.ts, server/lib/artifact-claims.ts, server/lib/build-info.ts, scripts/verify-report.mjs, tests/routes/export-verify.test.ts, tests/core/artifact-claims.test.ts, server/lib/root-cause-pipeline.ts, server/lib/reader-tier.ts]
status: active
---

# Surface — Exports

**Files:** `server/routes/export.ts` — the export route family:
`POST /api/export/fdx`, `/docx`, `/print-html` (PDF via print), `/coverage`
(→ [[Surface - Coverage HTML]]), `/slate` (→ [[Surface - Slate]]),
`/breakdown`, `/pitchkit`, `/verify`; plus the separately-routed
`POST /api/export/coverage-letter` in `server/routes/coverage-letter.ts`
(→ [[Surface - Coverage Letter]]).

**What it shows:** `/api/export/verify` renders "Story Machine —
deterministic analysis, independently verifiable" (`docs/CLAIMS_REGISTER.md`
row 10) — a receipt a third party can check against the script text without
trusting the tool. All export routes take `gameLimiter` and
zod-validate their body (`FountainTitleBodySchema`, `CoverageBodySchema`,
`SlateBodySchema`, `DoctorBodySchema`, `VerifyBodySchema` —
`server/lib/validation.ts`), per `CLAUDE.md`'s security constraints.

**Browser suite:** the full writer journey in
`scripts/verify-production-build.mjs` ("analyze → jump to a line → export
Fountain/FDX/PDF/coverage letter → Settings → Session → Delete Everything →
reload," driven against the production server); `tests/routes/export-verify.test.ts`
and `tests/routes/export-offthread.test.ts` at the route level.

**Offline verifier (P3, 2026-09-06):** `/api/export/verify`'s comparison
logic (the 0.05 float tolerance, the field set, the engineCommit/
rulebookCount soft-mismatch carve-out) was extracted, unchanged, into
`server/lib/verify-compare.ts` (`checkContentHash`/`compareVerifyClaims`)
so `npm run verify-report -- <report> <script>` (`scripts/verify-report.mjs`)
can run the identical comparison with no server and no network — the
writer's unpublished script never has to be POSTed anywhere. See
[[Surface - Coverage HTML]] and [[Surface - Coverage Letter]] for the two
export formats it parses, and the CLI's own header for the third
(`report.json`, a raw `ScriptDoctorReport`). Outside a container,
`engineCommit` used to be the literal string `'dev'` — vacuous for the
engine comparison in `recomputed`/the CLI's `engine:` line —
`server/lib/build-info.ts` now falls back to a cached `git rev-parse HEAD`
when `GIT_SHA` is unset and a `.git` is present, so a report produced from
any checkout carries a real 40-hex commit (`tests/core/build-info.test.ts`;
`ci.yml`/`release.yml` additionally set `GIT_SHA: ${{ github.sha }}`
explicitly on their test steps, the same env-var contract the Dockerfile's
`ARG GIT_SHA` bakes).

**One pipeline behind the two coverage documents (2026-09-11).** Both
`POST /api/export/coverage` and `POST /api/export/coverage-letter` used to
hand-assemble the root-cause pipeline with `clusterIssues`' scene-spans argument
missing, so the producer's documents named different scenes, counted a different
number of findings and ordered them differently from the writer's screen for the
same `contentHash`. Both now call `buildRootCausePipeline` — see
[[Surface - Root Cause Pipeline]] for the measurement and
`tests/routes/root-cause-parity.test.ts` for the four-surface proof.

Both also now pass the exact Fountain text into the renderer, for one purpose:
resolving [[Surface - Producer Tier]]'s page references through the same
paginator the PDF export uses. Nothing is re-analyzed and no number is derived
from it there.

**The claim set an artifact carries (2026-09-12, BUG-1).** `verify-compare.ts`
checked `contentHash`/`health`/`verdict`/`totalIssues`/`healthPercentile`/
`engineCommit`/`rulebookCount` and nothing else, while
[[Surface - Producer Tier]] had just put a scene count, a word count, a
page/minute estimate, a page reference per finding, a priorities count, a
percentile reading and the reference bounds on the one page a producer is told to
trust — and `VerifyExpectedSchema` had no FIELD for any of them, so even a caller
who wanted to check one could not. Measured on
`data/screenplays/chain-of-custody.fountain` (13 scenes, 824 words, ~4 pages, one
finding at p. 2): a hand edit to `9,999 scenes · 999,999 words · ~500 pages /
~500 min (est.)`, a page reference moved to `p. 999` and a heading changed to
"The 9 things to fix first" printed `VERIFIED — authentic and reproducible under
this engine.` at exit 0 in the HTML report, the letter and the raw report JSON.
A letter whose page-one line was edited to
`**Verdict.** RECOMMEND · Health 94.6 / 100` verified too
(`docs/audits/2026-09-12-adversarial/writer-loop.md` finding 2: the tier is a
second verdict/health rendering, and the CLI's scrape looked for `**Verdict:`
with a colon and `Health 94.6/100` without spaces).

`server/lib/artifact-claims.ts` is now the ONE definition: one label table, one
encoder, one parser per rendering. `buildReaderTier` builds the claims and
formats the tier's own Length line out of them, both exporters publish
`tier.claims` through `claimRowsFor`, and both verifiers read them back through
`decodeClaimRows` — so a number cannot appear on the page without appearing in
the block. Three properties are worth knowing:

- **Recomputed, never trusted.** `recomputeArtifactClaims` calls
  `buildReaderTier` with only the script text, so page references are
  re-resolved through the paginator and the logline state re-derived; the
  verifier is deliberately never handed the value it is checking.
- **The page and the block must agree about which claims EXIST.** Deleting a
  claim row is a missing value, not a wrong one, and "only what was claimed is
  checked" would let a forger opt a number out of verification. Two independent
  conditions, the first needing no tier detection: (1) a block that publishes ANY
  tier claim must publish every required one — the unconditional ones, plus each
  conditional one (page estimate, percentile reading, logline state) whose value
  the page states; (2) a block with no tier claims left, in a document that still
  shows any of several structural tier signals (the scope sentence, the tier
  caption, the tier stylesheet rules and section classes, the labelled Length /
  Logline / Verdict lines, the spaced health reading).

  ROUND 2 (2026-09-12 review findings 1-3) corrected two overclaims here. The
  required set was a hand-written list of five of the nine tier labels, so
  deleting `Estimated pages`/`Estimated runtime (minutes)` re-enabled the brief's
  own `~500 pages / ~500 min (est.)` forgery at exit 0, and deleting
  `Health percentile reading` let a page claim `top 5%`; it is now DERIVED from
  `CLAIM_ROW_SPECS`'s `tier` column. And the detection was keyed on ONE marker
  string per shape, so `## Reader summary` → `## Reader Summary` turned off both
  the body-versus-block scrape and the refusal at once. The KNOWN LIMIT, measured rather
  than asserted (round 2 shipped a second wrong version of this sentence, and the
  review built the counterexample): N independent edits rather than one, not an
  unforgeable property. Every one of those signals is a machine-readable label — a
  class name, a heading's wording, a stylesheet selector, the scope sentence — so a
  forger who renames all of them keeps a page that still reads as a reader summary
  to a human while this tool treats it as the pre-2026-09-11 report it now
  resembles. Measured 2026-09-12: **14 mechanical edits** to an exported coverage
  HTML, **17** to a letter, after which the page states `9,999 scenes`,
  `~500 pages`, `p. 999`, `The 9 things to fix first` and
  `Health percentile: top 5%` and the verifier says VERIFIED. Both are committed
  as `tests/fixtures/verify-report/known-limit-relabelled-*`, asserted to exit 0
  and labelled as the limit — a fail-first target for the lane that closes it. A genuine summary page also states the
  reference bounds exactly once, so a tier page with no bounds text is refused on
  its own (the half of finding 2 that row-deletion does not cover).
  `tests/fixtures/verify-report/` holds byte copies of real pre-tier artifacts
  (rendered by `318493c9`) so that back-compatibility is proven against a genuine
  document rather than a simulation.
- **The gap is written down.** `VERIFY_SCOPE_SENTENCE` ships in both exported
  documents and in `--help`: wording, the logline's text, the title, the author
  and the caller-supplied draft-rank line are not checked, because re-running the
  engine cannot attest what a human supplied. A gap that is written down is a
  scope; BUG-1 was a gap nobody had written down.

Proof: `tests/core/artifact-claims.test.ts` (formatter/parser round trips, the
zod wall per field, the page-and-block-are-one-statement case),
`tests/routes/export-verify.test.ts` (the route half: every tier field checked,
each able to fail, malformed claims 400 before the comparator),
`tests/scripts/verify-report.test.ts` (eleven claims x three document shapes x
body-only and every-rendering forgeries, against artifacts a live keyless server
produced, plus CRLF/BOM variants).


## Sources

- `server/routes/export.ts`
- `server/lib/verify-compare.ts`; `server/lib/artifact-claims.ts`
- `server/lib/build-info.ts`
- `scripts/verify-report.mjs`
- `tests/routes/export-verify.test.ts`
- `tests/scripts/verify-report.test.ts`; `tests/core/artifact-claims.test.ts`
- `tests/core/build-info.test.ts`
- `server/lib/root-cause-pipeline.ts`; `server/lib/reader-tier.ts`
- `tests/routes/root-cause-parity.test.ts`
- `docs/CLAIMS_REGISTER.md` rows 10, 74-75, 82, 87-92
