# Dead weight: two removal proposals (2026-08-24)

> **Nothing in this document has been removed.** These are proposals for the
> owner to accept, reject, or split. The standing instruction is explicit:
> *"dont blindly remove files and stuf without reading-understanding-
> contemplating if we can make our app better by integrating."* Keep-as-
> reference is the default, and every recommendation below is written to be
> argued with rather than rubber-stamped. ROADMAP §4 says the same thing in
> its own words: *"nothing here is a destructive delete... Any actual
> rule/file removal requires dependency mapping, a migration plan, regression
> evidence, and explicit confirmation."*

Two independent decisions:

- **Proposal A** — the Story Vector compare surface (a specific feature).
- **Proposal B** — the unreachable server closure (78 files, 24,722 LOC).

They share no dependencies. Deciding one does not commit you to the other.

---

## Proposal A — the Story Vector compare surface

### What it is

Two API endpoints and the modules behind them:

| Path | Lines | Role |
| --- | ---: | --- |
| `server/nvm/analyze/story-vector.ts` | 629 | Vectorize a script's rule firings; similarity, alignment, k-means |
| `server/lib/corpus-loader.ts` | 376 | Load/cache the reference corpus |
| `server/nvm/analyze/structural-genome.ts` | 404 | Extract "genome" patterns (act breaks, escalation, arc shape) |
| `server/routes/nvm/analysis.ts` (compare + corpus-stats block) | ~160 | `POST /api/nvm/analyze/compare`, `GET /api/nvm/analyze/corpus-stats` |
| `docs/story-vector.md` | 516 | Documentation |
| `tests/core/story-vector.test.ts` | 736 | Unit coverage for the two analyze modules |
| `data/screenplays/*.fountain` | 20 files | CC0 reference corpus |

### State before today

Both endpoints returned HTTP 500 on every well-formed request, for two
independent reasons, on any checkout. Reproduced against a booted keyless
server:

1. `corpus-loader.ts` read `data/screenplays/manifest.json` unconditionally.
   That file is written only by `scripts/convert-screenplays.ts` from a private
   PDF source directory, and `data/` is gitignored, so no checkout has one.
   Result: `ENOENT: no such file or directory, open '.../manifest.json'`.
2. With the corpus loading, `findNearestNeighbors` threw
   `Dimension mismatch: 2 vs 185`. The route vectorizes the user's draft first
   and the corpus second, and `RULE_INDEX` grows as it goes, so the draft
   carried fewer dimensions than every corpus vector built after it. The same
   defect made `clusterCorpus` return `NaN` inertia silently, because that
   function has no length guard at all.

A third defect was not a crash. The route emitted a `structuralTemplate.genome`
object whose every field was a hardcoded literal (`actBreakPositions: []`,
`reversalCount: 0`, `'linear'`, `'linear'`, `0.5`), while `docs/story-vector.md`
advertised the same field with measured-looking values (`[28, 73]`, `4`
reversals, `'exponential'`, `'u-shape'`, `0.68`). The document's Performance
section, its two worked-example outputs, and its corpus statistics example were
likewise invented: they named films (`arrival-2016`, `toy-story-4-2019`) that
have never been in this repository.

All three are fixed as of this branch. The endpoints return 200 with real
numbers, `genome` is `null` with a stated reason, and the document now quotes
captured runs. **That fix is not a deletion and is not part of this proposal.**
It matters here only because it changes the cost side of the decision: the
surface is no longer broken, so "it does not work" is no longer an argument for
removing it.

### The case for removing it

- **No frontend consumer.** `grep -rn "analyze/compare\|corpus-stats" src/`
  returns nothing (exit 1). Nothing a user can click reaches either endpoint.
- **ROADMAP P2 is DONE and says the opposite of this.** "Collapse the surface
  to Doctor + Editor" shipped 2026-07-29. Two undocumented API-only endpoints
  are surface area a writer cannot use and a maintainer must keep working.
- **It stayed broken because nobody looked.** The three existing route tests
  covered only 400 and 422 rejections, so a completely non-functional endpoint
  sat behind a green suite. That is what unowned surface costs.
- **The signal it ranks on is the project's weakest.** A story vector is built
  *entirely* from the rule-firing channel. By the doctor's own measurement
  (`doctor.ts:1892-1898`) that channel contributes AUC ~0.076 to
  discrimination, while scene-count scarcity carries ~0.938. A similarity score
  computed over the weak channel is a confident-looking number resting on the
  part of the engine the project has the least evidence for.

### The case for keeping it

- **It works now, and it is cheap to hold.** It has unit tests, route tests
  covering the success path, and honest documentation. Keeping a working,
  tested, unadvertised endpoint costs close to nothing per month.
- **The corpus is legally distributable.** The 20 shipped scripts are CC0. P1's
  central problem is that its real corpus cannot reach CI (local-only,
  copyright). A CC0 corpus with a working comparison harness over it is the
  only piece of comparative machinery in the repo that can run anywhere,
  including CI. That is worth more than the endpoint itself.
- **Alignment is now a reusable primitive.** `alignVectors` reconciles vectors
  by rule name instead of by index position. Any future work that compares two
  scripts by rule firings needs exactly that, and it is now written and tested.
- **Removing it would not shrink the surface a user sees.** The endpoints are
  invisible. Deleting them buys clarity for maintainers, not for writers.

### Does integrating it make the product better?

This is the owner's stated test, so answering it honestly matters more than
answering it favorably.

**Not today, and the reason is measurable rather than aesthetic.** A panel that
says "your draft is 53% similar to *the-defense-rests*" is a real number, but it
ranks on the channel measured at AUC ~0.076. Showing it to a writer would attach
the product's credibility to its least-supported signal, which is the trade
`NORTH_STAR` §1's *correct before reproducible* law exists to refuse.

**There is a version that would be worth integrating**, and it is a P1 task, not
a surface task: re-base the vector on the signals that actually separate (scene
count, structural deduction, the emotional-arc channel) rather than on rule
firings, then measure whether nearest-neighbor similarity in that space predicts
anything a reader agrees with. If it does, the panel writes itself and the
existing corpus loader, cache, alignment and clustering all carry straight over.
If it does not, that is a cheap, informative negative result. Either way the
work runs against the CC0 corpus, in CI, with no copyright exposure.

### Recommendation

**Keep. Do not delete, do not surface, do not extend as-is.** Specifically:

1. Keep both endpoints as they now stand — working, honest, tested, undocumented
   in the UI.
2. Do not add a frontend consumer while the vector is built from the rule
   channel alone.
3. If anything here is picked up again, pick it up as P1 evidence work
   (re-base the vector, then measure), not as a panel.
4. If the owner prefers a smaller server surface regardless, the *minimum*
   honest removal is the two route handlers only — leave `story-vector.ts`,
   `corpus-loader.ts` and `alignVectors` in place, because that is the part with
   reuse value. Removing the routes alone would move `corpus-loader.ts` into the
   dead set tracked by Proposal B, so those two decisions interact.

**Confidence: moderate.** The measurement supporting "do not surface it" (AUC
~0.076 for the rule channel) is the doctor's own, on the real corpus, and is
about the rule channel in aggregate rather than about vector similarity
specifically. Nobody has measured whether nearest-neighbor similarity over that
channel predicts reader judgment. It might; it has not been tested. The
recommendation is "do not ship it untested", not "it is known to be worthless".

---

## Proposal B — the unreachable server closure

### The measurement, re-derived

Static BFS from `server.ts`, following relative `import` / `export ... from` /
`import('literal')` edges, over every non-test `.ts` file under `server/**`.
Same walk as `scripts/check-scoring-receipt.mjs`. Reproduce with
`npm run check-server-reachability`.

```
server/** non-test source files: 296
reachable from server.ts:        218
UNREACHABLE:                      78   (24,722 lines)
```

The audit this proposal responds to reported ~44 files / ~16,369 LOC. **My
number is larger: 78 files / 24,722 LOC.** The gap is scope, not arithmetic. If
you exclude `server/nvm/analyze/**` — the unwired-candidate zone that
`check-scoring-receipt.mjs` already documents and deliberately treats as
"excluded, not a leak" — the remainder is **51 files / 17,120 LOC**, which is
close to the audited figure. Both numbers are in the table below so the
disagreement is inspectable rather than split.

| Group | Files | Lines | Character |
| --- | ---: | ---: | --- |
| `server/nvm/quantum/**` | 8 | 3,879 | tsconfig-quarantined v5.0 experiment |
| `server/nvm/research/**` | 10 | 2,798 | tsconfig-quarantined v5.0 experiment |
| `server/planning/**` | 9 | 3,134 | tsconfig-quarantined v5.0 experiment |
| `server/nvm/infinity-gate/audience-simulation.ts` | 1 | 466 | tsconfig-quarantined v5.0 experiment |
| `server/nvm/kernel/**` (dead files only) | 13 | 5,374 | v5.0 kernel experiment |
| `server/nvm/live/v5-loop.ts` | 1 | 502 | v5.0 loop |
| `server/nvm/analyze/**` | 27 | 7,602 | unwired analyzer candidates |
| assorted elsewhere under `server/` | 9 | 967 | written, never connected |
| **total** | **78** | **24,722** | |

### The live closure that must be preserved

`server/nvm/kernel/` is **not** wholesale dead. `server/engine/Stage.ts` imports
`server/nvm/kernel/event-store.ts` and `server/nvm/kernel/adapters/commit-to-events.ts`
as live runtime values. Both are reachable from `server.ts` and are absent from
the dead set above. This has bitten the repo once already: an earlier CI
console-grep excluded the whole `kernel/` directory and hid that live closure
from a gate on shipped code (`.github/workflows/ci.yml` carries the note). Any
removal here must be per-file, never per-directory.

`server/critics/critics-engine.ts` is likewise live.

### Placeholder constants inside the dead closure

Verified by reading each site. None of these can reach a user today, because
nothing imports them from `server.ts`. They are listed because the risk is a
future wiring that ships them unnoticed.

- `server/nvm/quantum/adaptive-pruning.ts` — `computeGenreNovelty` returns
  `0.5`, `computeThematicDistance` returns `0.5`, `countGenres` returns `5`,
  each marked `// Placeholder`.
- `server/nvm/infinity-gate/audience-simulation.ts:329-332` —
  `calculateCulturalMatch` returns a literal `0.7`, and that value is weighted
  into an engagement score.
- `server/planning/index.ts:41` re-exports `OASISEmotionalValidator`, whose
  three methods in `oasis-integration.ts` (lines 404, 412, 423) all
  `throw new Error('OASIS integration not yet implemented')`.
- `server/nvm/live/v5-loop.ts:187` writes the literal string
  `'To be analyzed'` as every branch's dramatic impact.

**Standing rule worth adopting regardless of this proposal:** if any of these
is ever wired up, it owes the same treatment the compare route just got — make
it real, or make the output say what it is.

### Orphan tests

`scripts/run-tests.mjs` collects from an explicit `TEST_ROOTS` list. Ten
`*.test.ts` files sit outside it and therefore never run in CI. Every exit code
below is from running the file directly with
`node --experimental-strip-types --test <file>`.

| File | Exit | Result |
| --- | ---: | --- |
| `server/nvm/__tests__/compatibility.test.ts` | 1 | assertion failures |
| `server/nvm/__tests__/smoke.test.ts` | 1 | assertion failures |
| `server/nvm/__tests__/v5-integration.test.ts` | 1 | assertion failures |
| `server/nvm/kernel/__tests__/integration.test.ts` | 1 | assertion failures |
| `server/nvm/kernel/__tests__/trinity-gate-integration.test.ts` | 1 | `ERR_MODULE_NOT_FOUND: vitest` |
| `server/nvm/kernel/adapters/type-enrichment.test.ts` | 1 | `ERR_MODULE_NOT_FOUND: vitest` |
| `server/nvm/kernel/event-store.test.ts` | 0 | 32 tests, all pass — **covers LIVE code** |
| `tests/apdl.test.ts` | 1 | `ERR_MODULE_NOT_FOUND: @jest/globals` |
| `tests/critics/critics-engine.test.ts` | 0 | 2 tests, both pass — **covers LIVE code** |
| `tests/story-vector.test.ts` | 0 | intentionally empty pointer file; a vacuous pass |

Corrections to the audited figures: **7 of 10 fail** (not 6), and **3 fail on a
missing framework package** (not 2) — two on `vitest`, one on `@jest/globals`.
Neither package appears in `dependencies` or `devDependencies`; `grep -c
"vitest\|@jest/globals" package.json` returns 0. **7 of 10 exist for
unreachable code** (not 8); the other three are the two live-code tests and the
empty pointer.

The finding worth acting on is not the failures. It is that **34 passing
assertions over live code never run**: 32 in `event-store.test.ts` (over
`event-store.ts`, which `Stage.ts` imports) and 2 in `critics-engine.test.ts`
(over the live critics engine). That is coverage the repository already paid
for and does not collect.

### Two items outside `server/**`

**`agent-scheduler/`** — 12 tracked files (`git ls-files agent-scheduler | wc -l`
= 12): four markdown reports, `cron-config.json`, `crontab-schedule.txt`,
`package.json`, `progress-tracker.json`, and three `.js` files. It is the
harness for the rule-authoring wave program that `CLAUDE.md` opens by declaring
**RETIRED** ("Do not author a new wave"). `progress-tracker.json` still carries
`"estimated_completion_date": "2076-07-15"` at lines 10 and 141 — a schedule for
a program that was cancelled. It is imported by nothing and referenced by no npm
script.

**`test-freeride.js`** (repo root) — `node test-freeride.js` exits **1** with
`Cannot find module '.../dist/server/engine/ai.js'`. It appears in no npm
script, no CI workflow, and no file under `scripts/` (`grep -rn "test-freeride"
package.json .github/ scripts/` exits 1). Its name makes it look like a test; it
is not collected by the test runner and cannot pass without a build it does not
trigger.

### Recommendation

Do not treat this as one 24,722-line decision. It is three decisions with very
different risk.

**B1 — Do now, and it is not a removal: collect the two live-code orphan
tests.** Add `tests/critics` to `run-tests.mjs`'s `TEST_ROOTS`, and give
`server/nvm/kernel/event-store.test.ts` a collected home. That converts 34
already-written, already-passing assertions over shipped code from decorative
into enforced. Pure gain, no deletion, small diff. *Not done on this branch:*
adding roots changes the suite's shape and belongs in its own reviewed change,
not bundled with a bug fix.

**B2 — Keep as reference, cost now bounded: the v5.0 closure.** The
quarantined subsystem (quantum, research, planning, infinity-gate), the dead
kernel files, and `v5-loop.ts` — 51 files, 17,120 lines. Arguments to keep:
`tsconfig.json`'s own quarantine comment says "re-include piecemeal as each
area is finished"; the code is inert (excluded from compile, excluded from the
console-grep, unreachable at runtime); and deleting it is irreversible in
practice because nobody will reconstruct it. Argument to remove: it is the
single largest source of "what is this for?" in the repository, and it makes
every reachability, coverage and audit number harder to read.

The reason to defer rather than decide: **as of this branch, keeping it costs
strictly less than it did yesterday.** `scripts/verify-server-reachability.mjs`
(Part 3 of this session) fails CI on any *new* unreachable file under
`server/**`, with all 78 current ones allowlisted by name and by reason. The
pile can no longer grow quietly, which removes the urgency that usually forces a
premature delete.

**B3 — The two strongest genuine delete candidates, if you want any deletion at
all:** `agent-scheduler/` and `test-freeride.js`. Both are outside `server/**`,
both are tiny, both are referenced by nothing, neither carries a live closure,
and one of them is tooling for a program that has been formally retired. If the
answer to "could integrating this make the app better?" is ever cleanly *no*,
it is here: there is nothing to integrate, because `agent-scheduler/` automates
authoring more of the catalog the roadmap froze, and `test-freeride.js` does
not run. **Still not deleted on this branch** — that is the owner's call, and
this document exists to make it available, not to make it.

**Confidence: high on the inventory** (re-derived, reproducible via
`npm run check-server-reachability`, live closure confirmed by direct import
check). **Moderate on B2**, which is a judgment about future intent, not a
measurement. **High on B1 and B3.**

---

## What this session actually changed

For the record, so this document is not mistaken for a change log of removals:

- Fixed two unconditional 500s on the Story Vector compare surface, with tests
  that fail before and pass after.
- Replaced the fabricated `structuralTemplate.genome` with `null` plus a stated
  reason, and rewrote the invented sections of `docs/story-vector.md` around
  captured runs.
- Added `scripts/verify-server-reachability.mjs` and wired it into
  `npm run check-server-reachability`, `npm run validate`, and CI.
- **Deleted nothing.**
