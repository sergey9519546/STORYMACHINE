# Architecture Decision Records (ADRs)

This directory holds STORYMACHINE's Architecture Decision Records — short
documents that capture *why* a significant decision was made, not just *what*
was built. Future maintainers (and future sessions) read these to understand
whether a decision still holds and what was traded away to reach it.

## When to write an ADR

Write one when a decision is:
- **Architectural** — new subsystem, major refactor, cross-cutting pattern
- **Hard to reverse** — data model, public API, deployment shape
- **Significant tradeoff** — performance vs. maintainability, rigor vs. speed
- **Phase-defining** — settles an open question for a whole ROADMAP phase

Do not write one for: bug fixes, typo corrections, routine dependency bumps,
or anything fully reversible in a single commit.

## Process

1. Copy `template.md` to `ADR-NNN-short-title.md` (next sequential number).
2. Fill in context, decision, alternatives, rationale, consequences.
3. Mark status `Proposed`. Discuss. When settled, mark `Accepted`.
4. Commit. Link the ADR from the code or doc it concerns.
5. Never delete an ADR. To replace one, write a new ADR and mark the old
   `Superseded by ADR-XXX`.

## Numbering

Sequential: `ADR-001`, `ADR-002`, `ADR-003`… Never renumber, never skip, even
for rejected ADRs — the history is the point.

## Status lifecycle

- **Proposed** — under discussion, not yet settled
- **Accepted** — decision made; implementation may be ongoing or complete
- **Superseded by ADR-XXX** — replaced by a newer decision
- **Deprecated** — no longer followed, but not formally superseded
- **Rejected** — considered and discarded; kept for the record

## Relationship to ROADMAP phases

ADRs are where phase-level design decisions land. The
`storymachine-phase-design` skill produces a design doc at each phase
transition; the architectural decisions inside that doc should be extracted
into ADRs so they survive independent of the phase.

A decision that requires engine work the ROADMAP has frozen (e.g. anything
behind the P0 gate) should be filed as `Proposed` with a note that it is
blocked until the gate clears. Do not implement it.

## Superseding

When replacing an old decision:

1. Create the new ADR with the updated decision.
2. Update the old ADR: `Status: Superseded by ADR-XXX`.
3. From the new ADR: `Supersedes: ADR-YYY`.

Never delete the old ADR. The reasoning behind a discarded choice is often
the most valuable thing in this directory.

## Further reading

- Michael Nygard, "Documenting Architecture Decisions" (2011)
- https://adr.github.io/
