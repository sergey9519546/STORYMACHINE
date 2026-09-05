---
type: home
updated: 2026-09-05
sources: [CLAUDE.md, ROADMAP.md, NORTH_STAR.md, docs/UNIFIED_STATE_2026-09-02.md, docs/PATH_TO_EXCELLENCE.md]
status: active
---

# STORYMACHINE — Project Brain

This is the entry point. Open this vault in Obsidian (`docs/brain/`) and
start here; every other note is reachable from this one by wikilink, and
`npm run brain` keeps the graph (`brain.graph.json`, `GRAPH.md`) in sync
with what actually links where. If a note here disagrees with its cited
source file, the source file wins — this vault summarizes and links, it
never overrides.

## What STORYMACHINE is

A screenplay-analysis tool built around **a deterministic core inside a
generative shell**: Script Doctor's health score, verdict, and every
structural finding come from inspectable rules and formulas — no LLM, no
wall clock, no `Math.random()` on the diagnostic path — while candidate
rewrites and voices are opt-in, labeled, and (since [[Decision 3 - Demote Generative Surface to Labs]])
gated behind a Labs flag rather than shown on the default surface. The
server boots **keyless** into full analysis-only mode; a key only unlocks
generation. See `NORTH_STAR.md` §0 and [[Glossary]] ("keyless boot").

## The One Bet

The project's central, unresolved wager, per `ROADMAP.md` §3 and
`CLAUDE.md`'s standing task: **make the score provably discriminate on real
writing (P1)**, because by the doctor's own measurement
(`server/nvm/analyze/doctor.ts:2092-2093`) the entire weighted-rule channel
carries AUC ~0.076 (worse than random) while scene-count scarcity alone
carries AUC ~0.938 — more generated rules stopped adding signal a long time
ago. The rule catalog (3,217 pass-scoped constants,
`docs/rulebook/README.md`) is a maintained conceptual set, not a quality
claim; the wave program that grew it is retired and must not be resumed.
See [[Gate - AUC-24 Ratchet]] and the [[Measurements Index|measurement notes]] for
where discrimination currently stands.

## The current phase

Per `ROADMAP.md` §3 and `docs/PATH_TO_EXCELLENCE.md`: **Phase W and Phase E
are complete; Phase S's code lanes are done and a Docker image is
published; Phase P's evidence lanes have reported.** P0 (user validation)
is a recommended, actively-pursued evidence lane, not a hard gate — engine
work proceeds in parallel with it ([[Decision 2 - Retire the P0 Hard-Gate]]).
P1 is partial: dialogue discrimination is solved (test AUC 0.990);
structural discrimination is the live blocker. P2 (collapse the surface to
Doctor + Editor) and P3 (shareable coverage report) are DONE. P4
(retention) is last, not first. `main @ 939f7829` was, as of the last full
reconciliation, the whole project — see `docs/UNIFIED_STATE_2026-09-02.md`.

## Owner-only list

Nine items in this repository can only be actioned by the project
owner — a local corpus run, a GitHub Actions billing fix, a license
decision, repo visibility. Each has its own note under `Owner/`; start at
[[Owner - Index]].

## Start here, by question

- **"What did the project decide, and why?"** → `Decisions/` (one note per
  numbered entry in `docs/DECISION_LOG.md`) — start at
  [[Decision 1 - User Validation First]].
- **"What stops a bad change from merging?"** → `Gates/` — start at
  [[Gate - Receipt Gate]].
- **"What does surface X actually show, and where does the number come
  from?"** → `Surfaces/` — start at [[Surface - Script Doctor Panel]].
- **"What happened in session N?"** → `Sessions/` — start at
  [[Session - 2026-08-24 Five Landings]].
- **"What did audit N find?"** → `Audits/` — start at
  [[Audit - 2026-07-14 High-End Audit]].
- **"What does this measurement document actually show?"** →
  `Measurements/` — start at [[Measurements Index|the Measurements Index]].
- **"What can only the owner do, and why?"** → `Owner/` — start at
  [[Owner - Index]].
- **"What is the R5 / advice-rule-fixes situation?"** → `Branches/` — start
  at [[Branch - R5 Verbosity Bias]].
- **Unfamiliar term** → [[Glossary]].
- **"What keeps going wrong in this project's own reviews?"** →
  [[Patterns]].

## Sources

- `CLAUDE.md` (orientation, standing task, gotchas)
- `ROADMAP.md` §1, §3 (current state, P0–P4 sequencing)
- `NORTH_STAR.md` §0 (product claim, honest rule-count correction)
- `docs/UNIFIED_STATE_2026-09-02.md` (last full reconciliation)
- `docs/PATH_TO_EXCELLENCE.md` (lane sequence, session records)
