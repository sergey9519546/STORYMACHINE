---
type: decision
updated: 2026-09-05
sources: [docs/DECISION_LOG.md, tests/core/generative-surface-labs-gate.test.ts]
status: active
---

# Decision #3 — Demote the Generative Surface to Labs (2026-09-03)

The 2026-09-02 retrospective (`docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md`
§11) found every LLM-adjacent test in the repository is plumbing — nothing
asserts whether a rewrite, a copilot suggestion, or a deep-read annotation
is actually *good*, while the deterministic half is measured hard (AUC
ratchets, receipts, a 761-script benchmark, 135 browser assertions). The
choice was demote the generative surface to Labs, fund a ~30-case graded
set with human scorers, or ship unevaluated generation next to a measured
score indefinitely. **Decision: demote to Labs** — one flag
(`getLabsEnabled()` in `src/lib/feature-flags.ts`), no deletion.

With Labs off: "Fix with AI" and its keybinding, the deep-read toggle and
"Fix & verify" buttons, the auto-analysis toggle, the live-intent copilot,
and the five AI-provider Settings tabs are all hidden (not shown-and-inert).
Nothing generative is deleted — every module, route, and plumbing test
stays; with Labs ON the surface behaves exactly as before. The server and
its routes/limiters/schemas are untouched. See
`tests/core/generative-surface-labs-gate.test.ts` (31 assertions, both flag
states) and the `P2-generative` phase of `scripts/verify-p2-p3-surfaces.mjs`.

**Amendment (2026-09-04) — the gate covers generation, not verification.**
A concrete case (a writer-supplied rewrite candidate) tested this decision's
scope and found it did not reach verification: the decision names controls
that *produce* model output; a writer-supplied candidate produces no output
to evaluate, so [[Surface - Fix and Verify]]'s "Verify my rewrite" ships on
the default surface with Labs off and no key, while "Fix & verify"
(generation) stays gated. The precise corrected claim: **the default
surface makes no call that can reach a model** — a property of the request
shape (`candidateFountain` short-circuits before `fix.ts` is imported), not
of the route URL.

## Sources

- `docs/DECISION_LOG.md` — "Decision #3" and its 2026-09-04 amendment
- `tests/core/generative-surface-labs-gate.test.ts`
- `tests/routes/scriptide-fix.test.ts`
