---
type: audit
updated: 2026-09-05
sources: [docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md, docs/audits/2026-09-02-retrospective/VACUOUS_TESTS_SWEEP.md]
status: active
---

# Audit — 2026-09-02 Retrospective

**Directory:** `docs/audits/2026-09-02-retrospective/` (`RETROSPECTIVE.md`,
`VACUOUS_TESTS_SWEEP.md`).

**What it is:** an adversarial review of the whole project at
`main @ db8b7a88`, commissioned after the phase program closed. The
reviewer was pre-briefed on already-known mistakes (browser proofs bound to
one machine, the receipt gate's historical empty range, the console gate's
basename exemptions, the scoring-thesis test blind spot, the title
injection, vacuous shape-only tests, hand-copied doc numbers) and told not
to re-report them. It classifies each new finding **MISTAKE** (wrong when
made), **WEAK ROUTE** (defensible then, worse now), or **OPEN QUESTION**
(owner decides), ranked by fix-one-thing value.

**Verdict counts:** twelve numbered findings, all dispatched in
[[Session - 2026-09-03 Retrospective Findings]]. Finding #1 (the health
score rewards padding) is a MISTAKE, dispatched to the unmerged
[[Branch - R5 Verbosity Bias]]. Finding #2 ("the AUC cannot be verified in
CI" was false all along) led directly to [[Gate - AUC-24 Ratchet]]'s
committed-table redesign. Finding #5 led to [[Gate - Pure-Core Boundary]].
Finding #8 led to [[Gate - Claims Register Lane]] and
`docs/CLAIMS_REGISTER.md`. Finding #11 (the generative surface is
unevaluated next to a measured deterministic score) led to
[[Decision 3 - Demote Generative Surface to Labs]].

**What was NOT reproduced / left open:** the retrospective is itself an
audit, not a fix — every finding's disposition (dispatched, evidence-only,
owner-decision) is recorded per-finding in `RETROSPECTIVE.md` rather than
assumed closed by this document.

## Sources

- `docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md`
