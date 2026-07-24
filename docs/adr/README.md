# Architecture Decision Records

This directory preserves the *why* behind STORYMACHINE's significant
architectural choices — not just the *what* that was built. The process is
defined in `AGENTS.md` ("Architecture Decision Records"); this file is the
index and quick reference.

## When to write one

- System architecture changes (new subsystems, major refactors)
- Cross-cutting concerns (affects multiple components)
- Long-term implications (hard to reverse)
- Significant tradeoffs (performance vs maintainability)
- Pattern establishment (conventions for future code)

## Process

1. Copy `template.md` to `ADR-NNN-short-title.md` (next sequential number).
2. Fill in context, decision, alternatives considered, consequences.
3. Commit with status **Accepted** after approval.
4. Never delete an ADR — mark it **Superseded by ADR-XXX** instead.

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-001](ADR-001-anti-slop-pattern-library.md) | Anti-Slop Pattern Library Architecture | Accepted |
| [ADR-002](ADR-002-p1-benchmark-design.md) | P1 Benchmark Design | Accepted |

Keep this index current when adding or superseding ADRs.
