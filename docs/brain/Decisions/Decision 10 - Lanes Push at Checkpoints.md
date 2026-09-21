---
type: decision
updated: 2026-09-19
sources: [docs/DECISION_LOG.md, docs/LANE_STANDARD.md, CLAUDE.md, docs/audits/2026-09-18-ci-docs-fast-path/README.md, scripts/lib/validated-base.mjs, .github/workflows/ci.yml]
status: active
---

# Decision #10 — Lanes Push at Checkpoints, Not at Every Commit (2026-09-18)

**Renumbered 2026-09-19.** This entry was originally logged as "Decision #9",
duplicating the number already used by
[[Decision 9 - Generation Quality Becomes a Measured Track]] (2026-09-13).
The docs-truth lane renumbered this, the later entry, to #10 and updated
every by-number citation of it; see `docs/DECISION_LOG.md`'s revision
history on this entry for why the earlier one was left as #9.

`docs/LANE_STANDARD.md` §7 item 1 said, since the 2026-09-07 sandbox rebuild
erased every worktree, the session's scratch directory, every local `audit/*`
tag and a reviewed-MERGE lane whose two commits had never been pushed, that a
lane pushes **after every commit**. On 2026-09-18 the maintainer objected to
that cadence directly: *"remote repositories are meant for milestone
synchronization, not real-time keystroke saving."*

**Decided:** push at **meaningful checkpoints** — a completed unit of work,
before starting a long-running operation, before handing off to a reviewer,
and always before the lane goes idle (ends its turn, waits on something, or
hands back) — and **when in doubt, push**.

**Why this and not the alternatives:** "only at the end of a lane" is the
2026-09-07 failure exactly. "After every commit" is what was objected to, and
the objection is about a real thing: a lane committing at keystroke scale
pushes at keystroke scale and the remote stops being a record of milestones.
"Always before the lane goes idle" is the load-bearing checkpoint, because
going idle is the only moment a rebuild can catch a lane having done nothing
about its exposure.

**What it gives up, stated rather than hidden:** a lane midway through one
unit of work, between checkpoints, still has everything to lose. That window
is smaller than "only at the end" and larger than "after every commit", and
"when in doubt, push" is the tiebreaker that stops *meaningful* drifting
toward *rarely*.

**Not a CI-cost decision.** Since 2026-09-13 `ci.yml` and `security.yml`
carry a `concurrency` group keyed on the ref, so several pushes in quick
succession cost one run in flight per branch, not one run per push; `main` is
isolated into its own group per commit and is never cancelled or dropped.
This is about what the remote records, not what it costs.

**Interaction with the docs-only fast path, landed the same day:**
`cancel-in-progress` plus a `github.event.before` classification could leave a
lane branch green over code no completed run ever tested, and **fewer pushes
widens that window rather than narrowing it**. The fast path therefore
classifies from the tip of the last SUCCESSFUL completed run on the ref
(`scripts/lib/validated-base.mjs`), not from `before`.

**Why this entry exists at all:** the round-1 review of
`lane/ci-docs-fast-path` approved the §7 rewrite as written and named one
gap — the verbal instruction that warranted changing a standing standard was
recorded nowhere. A standard changed on an unrecorded instruction is exactly
what this log is for.

**Related:** [[Audit - 2026-09-18 CI Docs Fast Path]],
[[Audit - 2026-09-13 CI Green]] (the concurrency-group work this decision
leans on), [[Decision 5 - Every Reported Unverified Gate Gets an Expiry]]
(the same shape: a rule whose cost was being paid in silence gets a stated
boundary instead).

## Sources

- `docs/DECISION_LOG.md` — "Decision #10"
- `docs/LANE_STANDARD.md` §7 item 1, `CLAUDE.md` (the gotcha restating it)
- `docs/audits/2026-09-18-ci-docs-fast-path/README.md`
- `scripts/lib/validated-base.mjs`, `.github/workflows/ci.yml`
