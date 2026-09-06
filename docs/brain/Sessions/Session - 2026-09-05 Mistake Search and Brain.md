---
type: session
updated: 2026-09-06
sources: [docs/PATH_TO_EXCELLENCE.md, docs/audits/2026-09-06-mistake-search/README.md, docs/LANE_STANDARD.md]
status: active
---

# Session — 2026-09-05, Day: The Mistake Search and the Project Brain

**Heading:** "2026-09-05, day — the mistake search and the project brain."
The owner asked for a search for mistakes over everything the review batch
had merged, and for a project brain. Three read-only hunters produced the
findings in [[Audit - 2026-09-06 Mistake Search]]; those became six build
lanes, plus the brain lane that built this vault. **Again none passed
review on the first pass.** Main moved `802f1c16 → 7d97c3e5`: six build
lanes plus the brain, **21** review rounds (docs parity 1, server fixes 1,
client provenance 1, dark mode 5, brain 2, layout 4, cue-guard cost bound
7), every merge behind one full suite and one battery on the rebased
branch.

**What landed (from the record):**

- Draft History gained a per-script identity; legacy rows enter no
  denominator; the sample never enters the writer's numbers
  ([[Surface - Script Doctor Panel]]).
- The theme convention (a surface is theme-invariant or fully themed,
  never mixed) is written in `src/styles/design-system.css` and enforced by
  `tests/core/theme-convention.test.ts`, which parses the TypeScript AST and
  pins the two files it cannot yet fix at 65 and 1 hits
  ([[Surface - Versions and Snapshots]], [[Surface - Slate]]);
  `verify:a11y` went from 74 to 117 assertions
  ([[Gate - Browser Battery Suites]]).
- "Full report" is reachable on a phone; the earliest tap no longer opens a
  cold panel; the Slate dedupes a double upload; the "still running"
  sentence is derived from the run's status.
- The cue guard's cost bound was rebuilt over seven review rounds — the
  round-8 bypass, a measured bound on the analyzer's quadratic voice pass,
  six more bypass classes, and finally the hand-modelled walk retired in
  favour of the real parse ([[Gate - Receipt Gate]] stayed clean throughout:
  no scoring-path file changed).
- This vault ([[00 Home]]), with `npm run brain` and
  `tests/core/brain-coverage.test.ts`; its own review found the generator's
  invocation guard silently exiting 0 on a path with a space.

**Pattern named:** the same one as the previous session — each lane fixed
the example its reviewer gave and the reviewer found the next member of the
class — with the new ending that the class is closed by construction (read
the real parse) rather than by another example. See [[Patterns]].

**Follow-ups landed the same night** (from the record): one shared
structural-signal formatter across six surfaces (c9bbc673) and the Doctor
panel's 66 mixed-theme hits fixed with the scanner made zero-tolerance
(a21fffdd) — one review round each, both MERGE with five items built
before merging. Reviews in [[Audit - 2026-09-06 Mistake Search]].

**Owner-only from this session:** push the local `audit/2026-09-05/*` tags
([[Owner - Push Release Tag]]).

## Sources

- `docs/PATH_TO_EXCELLENCE.md` — the session record (sixth record, top of the file)
- `docs/audits/2026-09-06-mistake-search/README.md` — the lane/round/merge table
