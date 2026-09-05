---
type: gate
updated: 2026-09-05
sources: [scripts/honesty-audit.mjs, docs/CLAIMS_REGISTER.md, tests/core/honesty-audit-claims.test.ts]
status: active
---

# Gate — Claims Register Lane

**What it checks:** three invariants against `docs/CLAIMS_REGISTER.md`,
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
that same file.

**Command:** `npm run honesty-audit` (same script, "Claims-register lane"
section); exercised by `tests/core/honesty-audit-claims.test.ts`.

**Where it lives:** `scripts/honesty-audit.mjs` ("Claims-register lane,
2026-09-03, retrospective finding #8"); `docs/CLAIMS_REGISTER.md` is the
hand-maintained ledger, currently 57 rows.

**What it cannot catch:** a claim phrased in words the curated
`CLAIM_PHRASES` list has not yet learned, or a claim registered as
`supported` whose cited evidence file exists but no longer actually proves
the claim (the lane checks the pointer resolves, not that it still holds).

## Sources

- `scripts/honesty-audit.mjs` — "Claims-register lane" section
- `docs/CLAIMS_REGISTER.md`
