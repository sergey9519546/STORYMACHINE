# Mistake search — 2026-09-05 into 2026-09-06

Three read-only hunters (server, client, docs) read everything the review
batch had merged (`1e170831..802f1c16`) and wrote `findings/` — every
finding with its reproduction command. Those findings became six build
lanes, plus the project brain the owner asked for the same day; each lane
was reviewed by an independent reviewer under `docs/LANE_STANDARD.md` §6
before merging. Each `*-review.md` is one reviewer's full record: the first
pass and every re-review appended below it. Verdict history and the merge
commit for each lane:

| lane | review rounds | merged at |
|---|---|---|
| docs parity (coverage HTML on the shared copy modules) | MERGE | c3a204d2 |
| server fixes (guard context, boneyard bound, drain, logger, URIError) | MERGE + one reviewer-specified follow-up | 5170496c, 8749d02f |
| client provenance (Draft History per-script identity) | MERGE | 08d3398b |
| project brain (`docs/brain/`) | REVISE 10 → MERGE | 4cbaf02f |
| dark mode and the a11y gate | REVISE 3 → MERGE (+5) → REVISE 1 → MERGE → MERGE | 60bce1a6 |
| layout (phone-width Full report, cold panel, bars, one-scene, Slate keys) | REVISE 7 → MERGE (+2) → MERGE (+3) → REVISE 1 | 85fca55a |
| cue-guard cost bound (server fixes 2) | REVISE 3 → 3 → 3 → 2 → 2 → 2 → MERGE (+2) | 7d97c3e5 |

Twenty-one review rounds; no lane passed on its first pass. The reviewers'
probe scripts lived in session scratch space (`<session scratch>/…` in
these files) and are described, not copied; every finding they produced is
pinned by a committed test or fixture on main. Round commits named inside
the review files are lane-worktree commits from before each lane was
rebased for its merge; the reviewed rounds are tagged locally as
`audit/2026-09-05/<lane>-roundN` and await an owner push (the sandbox's
proxy refuses tag pushes).
