---
type: gate
updated: 2026-09-05
sources: [tests/core/pure-core-boundary.test.ts, scripts/lib/import-graph.mjs]
status: active
---

# Gate — Pure-Core Boundary

**What it checks:** that the deterministic analysis core's import graph
stays pure. Until 2026-09-03, `ARCHITECTURE.md` §1's "the analysis core is
pure and keyless" was prose, not an enforced boundary — the 2026-09-02
retrospective (finding #5) found `server/nvm/analyze/doctor.ts` reachable
from an AI transport (`engine/ai.ts` → `engine/ai-provider.ts` → an HTTP
client) and a native SQLite binding (`screenplay/compile.ts` →
`state/NarrativeState.ts` → `engine/Stage.ts`), meaning every doctor worker
thread loaded both to compute a deterministic score — and had a daily cost:
it made [[Gate - Receipt Gate]] classify a routine edit to
`server/lib/validation.ts` as scoring-path.

**Command:** `node --experimental-strip-types tests/core/pure-core-boundary.test.ts`
(part of `npm test`).

**Where it lives:** `tests/core/pure-core-boundary.test.ts`, using the same
import-graph walker (`scripts/lib/import-graph.mjs`) the receipt gate uses,
"so the two can never disagree about what 'reachable' means." It enforces
an enumerated **allowlist** (Fountain parser, layout engine, word counter,
shared type vocabulary) rather than a loose pattern, because a pattern
loose enough to admit the legitimate dependencies would also admit the next
`engine/ai.ts`. Any new import edge into the deterministic core's graph
fails this test until someone adds the entry with a written reason.

**What it cannot catch:** an import that stays outside the graph this
walker traverses (e.g. dynamic `import()` calls resolved only at runtime)
or a boundary violation introduced through a path the allowlist already
covers for an unrelated legitimate reason.

## Sources

- `tests/core/pure-core-boundary.test.ts` (full header)
- `docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md` finding #5
