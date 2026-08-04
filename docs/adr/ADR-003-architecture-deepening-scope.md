# ADR-003: Architecture Deepening — Scope and Deferrals

**Date:** 2026-08-03

**Status:** Accepted

**Supersedes:** N/A

---

## Context

An architecture review (the `improve-codebase-architecture` deepening pass)
surfaced five duplicated/shallow surfaces. Five deepening moves shipped on the
`architecture-deepening` branch, each behaviour-preserving except two explicit
correctness fixes:

1. one `resolveEffectTargets` module replacing three hand-copied actor/target/
   both/all resolvers (`server/planning/*`);
2. a `useLatestRequest` hook + framework-agnostic core replacing per-panel
   stale-response guards (`src/hooks/*`, four panels migrated);
3. two Stage narrowing methods — `getLiveCommits()` (replaces ~21
   `.filter(!reverted)` re-derivations) and `addBeliefs()` (atomic append,
   closes a lost-update race);
4. a shared `scene-split.ts` deduping 12 byte-identical dialect-B scene
   splitters (regex UNCHANGED);
5. openai-compat now forwards the `AbortSignal` (H2 abort now holds on that
   path); the triplicated delegating-provider wrapper factored into one helper.

Three larger follow-ons were identified. This ADR records the decision **not**
to pursue them now, with the load-bearing reasons, so future reviews do not
re-suggest them without engaging these constraints.

---

## Decision

Ship the five deepening moves above. **Defer** the following three, each for a
concrete reason, not for lack of time:

### D1 — Scene-regex canonicalization stays deferred (scoring-gated)

The 12 analyze detectors and the 11 measurement probes segment scenes with
three divergent heading dialects; only `fountain-analyzer.ts` (dialect A) is
authoritative. The dedupe (#4) collapsed the 12 identical dialect-B copies to
one module **without changing the regex**, making the eventual canonicalization
a one-line change in `scene-split.ts`.

We do **not** make that one-line change now because it alters produced scene
counts on `EST.` / `I/E` / forced / space-delimited sluglines, which shifts
detector outputs and therefore scores. Per `CLAUDE.md` and ADR-002, any scoring
change requires discrimination evidence on the REAL corpus
(`npm run measure-real`, gated on `REAL_SCRIPT_CORPUS_DIR`) and re-locked
fixtures — a human measurement step CI does not enforce. The corpus is not
wired in this environment (`REAL_SCRIPT_CORPUS_DIR` unset → the harness skips),
so the change cannot be responsibly validated here. Canonicalization is a
separate, gated scoring task, not a refactor.

### D2 — Stage interface segregation scoped to the two narrowing methods

`Stage` is a deep module (real invariants, 19 tables, migration ladder) grown
too wide (~103 methods, 452 call-sites). The concrete wins — the belief
lost-update race and the 21-site reverted-commit re-derivation — are captured by
`addBeliefs()` and `getLiveCommits()` (#3). Full interface segregation into role
interfaces (`AgentStore` / `EpistemicSpine` / `CommitLedger` / `DirectorConfig`
/ `ScriptIDEStore`) would rewire hundreds of call-sites for mostly
navigational benefit and non-trivial regression risk. Not worth it as an
autonomous sweep; revisit only if a concrete need (e.g. a second Stage backend,
or test doubles for one concern) creates a real seam.

### D3 — Provider-selection unification stays deferred (boot-wiring redesign)

Two selection systems (`AIProviderManager` and `ai-config.wireProviders`) both
write the single mutable `_provider` slot. The only correctness defect this
caused — the openai-compat path dropping the `AbortSignal` — is fixed (#5), and
the triplicated wrapper is de-duplicated. Unifying the two systems into one
registry is cleanup that touches keyless-boot provider selection (a documented
must-not-break path). No remaining correctness bug justifies that risk now.

---

## Alternatives Considered

- **Force the canonicalization and re-baseline whatever breaks.** Rejected:
  re-baselining scoring fixtures without REAL-corpus discrimination evidence is
  exactly the p-hacking-adjacent move ADR-002 and the "correct before
  reproducible" principle forbid.
- **Do the full Stage segregation now.** Rejected: 452 call-sites, no CI
  coverage of the navigational benefit, regression risk outweighs value once the
  two concrete duplications are already removed.
- **Unify the provider systems now.** Rejected: risk to keyless-boot selection
  with no remaining correctness payoff.

---

## Consequences

- **Positive:** the maintainability wins (single resolver, single fetch guard,
  single scene splitter, two Stage narrowing methods, signal-safe provider) ship
  now, verified `tsc`-clean and green against the pre-existing suite baseline
  (no new failures). The deferred items are formally closed with reasons.
- **Negative / residual:** the three heading-regex dialects still diverge in
  behaviour (D1) until the gated scoring change is done; `Stage` remains one
  wide interface (D2); two provider selectors still share one slot (D3).
- **Neutral:** #4's shared module makes D1 a one-line future change; #3's
  methods make D2's `CommitLedger`/`AgentStore` extraction incremental if ever
  needed.

---

## References

- `CLAUDE.md` — scoring-change discipline; AUC floor is a human `measure-real`
  step CI does not enforce.
- ADR-002 — P1 benchmark: discrimination evidence gates scoring changes.
- Architecture review report (session artifact) — the five candidates and their
  before/after deepening diagrams.
