---
type: gate
updated: 2026-09-12
sources: [scripts/honesty-audit.mjs, docs/CLAIMS_REGISTER.md, tests/core/honesty-audit-claims.test.ts]
status: active
---

# Gate — Claims Register Lane

**What it checks:** FOUR invariants against `docs/CLAIMS_REGISTER.md`, three
added 2026-09-03 after retrospective finding #8 found
`scripts/honesty-audit.mjs` caught banned *words*, not empirical *claims* —
"reads your screenplay like a studio coverage reader" promised human-reader
agreement the product has never measured, and no lexical pattern fired on
it. (1) Every row marked `unsupported` or `retired` must not appear
verbatim (whitespace-normalized) anywhere in the tracked tree outside the
register itself and `docs/audits/**`. (2) Every row marked `supported` must
carry an evidence pointer that resolves to a real file on disk. (3) A
curated list of empirical-claim phrases (`CLAIM_PHRASES` — "like a studio
coverage reader," "professional reader," "human-level," "proven to," …) is
banned in `src/**` and six named orientation docs (README, ARCHITECTURE,
NORTH_STAR, ROADMAP, `docs/PATH_TO_EXCELLENCE.md`, index.html) **unless**
the exact sentence carrying the phrase is registered here as `supported` at
that same file. **(4) Every evidence pointer that names a LINE must carry a
short quoted anchor — `path:line anchor:"some text from that line"` — and that
text must occur within ±3 lines of the line it names** (added 2026-09-12,
[[Audit - 2026-09-12 Adversarial Review]] finding 11).

**Why (4) exists, and what it found on its first run.** Invariant (2) checked
only that the PATH exists — the register said so in its own words, "only the
path is checked" — so a line number pointing at the wrong code passed. Three
files cited `server/nvm/analyze/doctor.ts:1892-1898` for this project's central
negative finding about its own score (rule channel AUC ~0.076 against
scene-count scarcity ~0.938) while that comment had moved to
`doctor.ts:2092-2093`; lines 1892-1898 held unrelated scene-index parsing. A
prior audit ([[Audit - 2026-09-06 Mistake Search]]) had recorded the same anchor
"FIXED in both places", and it was — in the two places it looked at. Adding the
anchors to the eleven rows that cite a line turned up **two more** stale line
numbers nobody had reported: row 7's `ARCHITECTURE.md:267` (§8 is at :371) and
row 10's `tests/core/coverage-html.test.ts:354` (the P3 verifiability comment is
at :398). An existence check cannot see a line that moved; a content check can,
for one file read per pointer. Two design points worth keeping: a comma list
(`1133,1528`) needs one anchor PER LINE, because treating it as a span would make
the window 400 lines wide and check nothing; and the "Where it appears" column is
deliberately exempt, since several of its line numbers are historical by design
(the `retired` rows record where wording USED to be).

**Command:** `npm run honesty-audit` (same script, "Claims-register lane"
section); exercised by `tests/core/honesty-audit-claims.test.ts`.

**Where it lives:** `scripts/honesty-audit.mjs` ("Claims-register lane,
2026-09-03, retrospective finding #8"); `docs/CLAIMS_REGISTER.md` is the
hand-maintained ledger, currently 93 rows, eleven of which cite a line and so
carry anchors.

**What it cannot catch:** a claim phrased in words the curated
`CLAIM_PHRASES` list has not yet learned, or a claim registered as
`supported` whose cited evidence file exists and whose anchor still resolves but
which no longer actually proves the claim (the lane checks that the pointer
lands on the text it names, not that the text is evidence). Nor does it check the
"Where it appears" column's line numbers — see above for why that is a decision
rather than a gap.

## Sources

- `scripts/honesty-audit.mjs` — "Claims-register lane" section
- `docs/CLAIMS_REGISTER.md`
