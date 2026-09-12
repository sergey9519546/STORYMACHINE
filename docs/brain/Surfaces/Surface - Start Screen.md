---
type: surface
updated: 2026-09-12
sources: [src/components/StartScreen.tsx, src/lib/sample-coverage-facts.ts, scripts/generate-p0-sample-report.ts, src/lib/feature-flags.ts, src/App.tsx, tests/core/sample-coverage-facts.test.ts, tests/core/start-screen-sample-card.test.ts, tests/core/start-screen-labs-gate.test.ts]
status: active
---

# Surface — Start Screen (the front door)

**Files:** `src/components/StartScreen.tsx`, rendered by `src/App.tsx` before
any draft exists. It is the first thing a stranger sees, and the four entry
points it offers are "Try sample coverage", "Open my script", "Start fresh" and
"Advanced: Story wizard", plus the `#verify` third-party entry
([[Surface - Coverage HTML]]'s verification pointer).

## The headline Coverage card is generated, not typed (finding #6, 2026-09-12)

The "Most important after a draft / Coverage" panel sits beside a button reading
**"See it on the sample"** and renders a report card in the product's own report
styling. Every number in it was a hardcoded literal — `VERDICT Consider ·
HEALTH 76 · NEXT Climax engagement · COUNTS 3 · 38 · 159 · LLM JUDGE None` —
and none of them was what the sample produces (**78**, **2 · 32 · 139**).
Nothing labelled the panel as illustrative. For a product whose whole pitch is
reproducible, inspectable numbers, the first four numbers on the front door were
stale fiction, and a visitor discovered that by clicking the button next to them.

`npm run generate-p0-sample` now writes a **second** artifact from the doctor run
it already performs — `src/lib/sample-coverage-facts.ts` — and the card renders
every value from it. The "Next" cell shows the top priority's own `location`
("Scene 9 (climax peak)"), not a phrase somebody summarised; "LLM judge" reads
None because `report.deepRead` is absent. The card also states whose numbers
these are. `docs/CLAIMS_REGISTER.md` row 94.

The freshness guard is `tests/core/sample-coverage-facts.test.ts` — the same
shape as [[Gate - Receipt Gate]]'s sibling drift guards
(`tests/core/rulebook.test.ts`, `tests/core/p0-sample-drift.test.ts`, which
guards the OTHER artifact this generator writes). A scoring change that moves the
sample's health now fails there, naming the command that fixes it.

## Nothing on the default screen may be permanently inert (finding #10)

Labs defaults to OFF (`src/lib/feature-flags.ts`), so `src/App.tsx` passes
`onOpenStoryMachine` as `undefined` — that prop IS the Labs gate on this surface.
"Advanced: Simulation" has always been gated on it. Two other controls called
`onOpenStoryMachine?.()`, an optional call on undefined: **"Open simulation" and
"Simulate" shipped as normal, enabled, focusable buttons that did nothing.**
Around them the default screen rendered the whole OASIS section — a full-width
dark hero ("WHEN YOU NEED PRESSURE / STORY MACHINE SIMULATE"), a four-cell
feature grid, and a numbered workflow whose steps 3 and 4 describe a Labs-only
feature as part of the product's core four-step loop — and the "Where you are"
rail's step 4 read "Export · simulate".

All three entry points now sit behind the same `{onOpenStoryMachine && (…)}`
gate, and the rail reads "Export · verify" when Labs is off — a step this
surface really does reach. **Nothing is deleted**: every byte of the section
renders unchanged the moment Labs is on, which the suite's Labs-ON context
drives. This is NORTH_STAR §1's explicit instruction ("a Labs-gated feature
degrades by not rendering at all — hide, don't disable. A permanently-inert
control … is a worse answer than its absence") and it is why a
disabled-with-a-reason control is NOT the alternative here: the reason would
have to name the simulation feature, and [[Decision 3 - Demote Generative Surface to Labs|P2's surface collapse]] is a first coverage report with zero exposure to
simulation jargon. The route back in is unchanged and asserted — Toolbar
overflow → "Labs & Settings".

**Browser suite:** `scripts/verify-p2-p3-surfaces.mjs` — the `P2-startcard`
phase floors the card's numbers on the SERVER's own answer for the sample's
exact bytes (not on the artifact, which would only prove the card agrees with its
own input), and the `P2-deadcontrols` phase enumerates every visible, enabled
button on a fresh keyless profile and clicks each on a reloaded page, requiring a
navigation or a page change (7 audited, 0 inert). That phase runs LAST in its own
context for a measured reason: inside context A its per-button reloads put ~50
requests into the same 60-second window as the feature-length doctor run, and
`gameLimiter` (120/min/IP) answered 429.

## Sources

- `src/components/StartScreen.tsx`; `src/App.tsx`; `src/lib/feature-flags.ts`
- `src/lib/sample-coverage-facts.ts` (generated);
  `scripts/generate-p0-sample-report.ts` (`buildSampleCoverageFacts`,
  `renderSampleCoverageFactsModule`)
- `tests/core/sample-coverage-facts.test.ts`,
  `tests/core/start-screen-sample-card.test.ts`,
  `tests/core/start-screen-labs-gate.test.ts`
- `docs/audits/2026-09-12-adversarial/writer-loop.md` findings 6, 10
- `docs/CLAIMS_REGISTER.md` row 94
