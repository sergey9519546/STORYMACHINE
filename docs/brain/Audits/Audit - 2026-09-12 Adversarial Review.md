---
type: audit
updated: 2026-09-12
sources: [docs/audits/2026-09-12-adversarial/writer-loop.md, docs/audits/2026-09-12-adversarial/engine-logic.md, docs/audits/2026-09-12-adversarial/server-data-tests.md, docs/LANE_STANDARD.md]
status: active
---

# Audit — 2026-09-12 Adversarial Review

**Directory:** `docs/audits/2026-09-12-adversarial/` — three read-only
investigations of main at c087a6ca (`writer-loop.md`, `engine-logic.md`,
`server-data-tests.md`), one lane report and one review file per build
lane (`*-lane-report.md`, `*-review.md`), each review written into the
repository before its verdict per `docs/LANE_STANDARD.md` §7.

**What it is:** the owner asked for a principal-level adversarial review of
the current features and logic, orchestrated through subagents, to find
the best achievable version of THIS product and move toward it. Three
lenses — the writer's loop driven in a browser, the engine and its claims
re-derived on an independent scorer, and a mechanical server/data/test-
soundness hunt — produced forty-odd ranked findings with reproductions.

**What the reviews caught that the lanes' own gates had passed:** a
row-deletion refusal that covered five of nine claims and a tier gate keyed
on one editable heading; a gates liveness check that regex-matched text so a
suite printing the expected failure line passed; fifteen stale line
anchors in a register column a lane had exempted; a surfaces gate that
starves on the product's own rate limiter by its feature-length phase; a
"Paste from PDF?" control that rewrote the draft without saying so; and a
re-derived DoS bound bracketed between fixture weights that admitted a
27-second analysis.

**Related:** [[Branch - Adversarial 2026-09-12]] (the owner-gated scoring
half), [[Branch - Feature-Length Defects]], [[Gate - Public Benchmark]],
[[Gate - Receipt Gate]], [[Patterns]].

## Sources

- `docs/audits/2026-09-12-adversarial/writer-loop.md`
- `docs/audits/2026-09-12-adversarial/engine-logic.md`
- `docs/audits/2026-09-12-adversarial/server-data-tests.md`
- `docs/LANE_STANDARD.md` §7
