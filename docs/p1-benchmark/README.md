# P1 Benchmark — index

> **P1 has not started.** P0 is active and blocks P1 until the P0 exit gate
> clears (`ROADMAP.md` §3, `ULTRAPLAN.md` §1). Nothing in this directory
> authorizes corpus acquisition, labeling, implementation, scoring change,
> or evaluation. These are pre-registered *design* documents, settled before
> any data is touched — exactly what `ULTRAPLAN.md` §2 demands ("Pre-register
> the split, metrics, and gates before changing formula constants").
>
> Authority: `ROADMAP.md` §3 P1 is canonical. `docs/user-validation/
> P1_BASELINE_INVENTORY.md` is the inventory of what exists today. If anything
> here conflicts with either, the ROADMAP wins.

## What P1 is

The One Bet (`ROADMAP.md` §3): prove the doctor score discriminates strong
from weak **real** writing on a runnable, legally distributable benchmark.
The exit gate is held-out AUC ≥ 0.80 (95% bootstrap LB > 0.65), shuffle-drop
≥ 0.80, act-swap ≥ 0.70, composite min-gap ≥ 5.0.

## Documents in this directory

Read in roughly this order:

| Document | What it is | When to read |
|----------|-----------|--------------|
| `PRE_REGISTRATION_PROTOCOL.md` | The methodology lock: research question, hypotheses, success/failure criteria, amendments log. Settled before any corpus work. | First. This is the contract. |
| `SPLIT_STRATEGY.md` | Train/val/test split (60/20/20), stratification, held-out protection, evaluation protocol. | Before building the corpus. |
| `corpus-manifest-schema.json` | JSON Schema for the corpus manifest (provenance, splits, labeling, hashes). | When assembling the corpus. |
| `SCREENPLAY_SOURCES_RESEARCH.md` | Legal analysis of screenplay repositories. Conclusion: most online repos are copyright-restricted; safe sources are Project Gutenberg, Internet Archive (CC/PD-filtered), and author-contributed drafts. | Before sourcing scripts. |
| `SCREENPLAY_SOURCING_TODO.md` | Concrete research tasks for agents who can work online. The current blocker is a **weak-craft human contrast class** — strong side exists (261 produced films, local-only), weak side does not. | When recruiting sourcing help. |
| `ANTI_SLOP_MARKERS_VALIDATION.md` | **Honest negative result.** The 64-pattern `screenplayAIMarkers` shipped with an *asserted* <0.1 false-positive/film target. Measured reality on 261 produced films: **3.84 marker-lines/film**. Discrimination is NOT yet validated. | Before making any claim about anti-slop detection. |

## Current blocker (read this before adding capacity)

Per `ANTI_SLOP_MARKERS_VALIDATION.md` and `SCREENPLAY_SOURCING_TODO.md`:

- The strong-class corpus exists locally (261 produced screenplays, not
  redistributable).
- The weak-class corpus **does not exist**. Without it, no discrimination
  claim about `screenplayAIMarkers` or the doctor health score can be made —
  only that markers don't over-fire on produced films (they do: 3.84/film,
   ~38× the asserted target).
- The next concrete step toward P1 is sourcing a legally distributable
  weak-craft human contrast class. See `SCREENPLAY_SOURCING_TODO.md`.

## Related documents (outside this directory)

- `ROADMAP.md` §3 P1 — canonical plan and exit gate
- `ULTRAPLAN.md` §2 — short execution brief
- `docs/user-validation/P1_BASELINE_INVENTORY.md` — inventory of repository assets today (inventory only, authorizes nothing)
- `docs/adr/ADR-002-p1-benchmark-design.md` — design decisions and rejected alternatives (split strategy, labeling scale, etc.)
- `CLAUDE.md` quality bar — "tests must include both positive/negative fixtures and runnable discrimination evidence on real writing; synthetic fire/no-fire coverage alone is not enough." This is the bar the `screenplayAIMarkers` claim currently fails.
