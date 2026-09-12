---
type: surface
updated: 2026-09-12
sources: [src/components/scriptide/CoverageSummary.tsx, src/components/ScriptIDE.tsx, src/lib/jump-span.ts, src/lib/finding-jump.ts, src/lib/doctor-stream.ts, server/nvm/analyze/screenplay-normalizer.ts, tests/core/coverage-rerun-one-control.test.ts, tests/core/coverage-next-fix-jump-honesty.test.ts, tests/core/coverage-format-unrecognized-card.test.ts, src/lib/voice-separation-copy.ts]
status: active
---

# Surface — Coverage Summary (the compact card)

**Files:** `src/components/scriptide/CoverageSummary.tsx`, mounted by
`src/components/ScriptIDE.tsx` on `toolSlot === "coverage"` when
`coverageFull` is false. It is the FIRST report surface a visitor sees —
"Try sample coverage" lands here, and
[[Surface - Script Doctor Panel]] is one click deeper ("Full report").

**What it shows:** verdict, rounded health, the six stat tiles
(critical/major/minor, subtext ratio, voice separation, resolved questions),
the plain summary, up to three strengths, and ONE "next fix" card built from
`report.topPriorities[0]`. Every number comes from the same
`ScriptDoctorReport` the full panel reads.

## Three defects the 2026-09-12 adversarial audit found here

**#3 — "Re-run coverage" did not re-run coverage.** `ScriptIDE.tsx`'s action
strip shows "Coverage outdated" with a "Re-run coverage" button after the draft
changes. Its handler was `handleTaskChange("coverage")` — and the banner is
reachable while the active task is ALREADY `coverage`, so the click switched
nothing, issued no `/api/scriptide/doctor/stream` request, and
`handleTaskChange` additionally cleared the stale flag. The one honest warning
that the verdict on screen described text the writer had edited was dismissed by
a click that re-ran nothing. The panel header's circular-arrow control worked:
two controls, one name, one inert.

There is now ONE `run()` — this component's — published to the host through
`onRegisterRun`, and `ScriptIDE.tsx`'s `rerunCoverage` invokes that same
function object. The stale flag is retracted ONLY by `onFreshReport`, which this
component fires solely for a response the draft has not moved past; neither
`openToolSlot` nor `handleTaskChange` clears it. See [[Patterns]], "one value
rendered by N hand-written sentences" — the same shape, applied to an ACTION
rather than a sentence.

**#5 — the "next fix" jump invented a line for a whole-draft finding.** See
[[Surface - Script Doctor Panel]] for the jump naming rule this card shares.
`computeJumpSpan` used to fall through across finding boundaries: with no span
for the top priority it returned the first ROOT CAUSE's line-anchored members'
envelope, and this card rendered it as the priority's own location. On the
231-scene fixture that produced **"JUMP TO LINE 137"** for the whole-draft
finding "Conflict layer", flashing lines 137–2709 — **87.9% of a 2,928-line
file** — where line 137 is NELL's dialogue in scene 8, a `QUESTION_DODGE`
member of an unrelated root cause. At short length the same finding correctly
showed NO LOCATION, so the affordance lied only at the one length where a writer
cannot check it by eye.

`src/lib/jump-span.ts` now has one resolver per finding —
`computeTopPriorityJumpSpan` and `computeRootCauseJumpSpan` — and every span
carries the `owner` that produced it. This card resolves the top priority's own
anchors and nothing else, so a document-tier priority renders
`NO_LOCATION_DOCUMENT_REASON`, the copy `src/lib/finding-jump.ts` already had.
The root cause's located notes are not lost: one is offered beneath the note,
attributed to that finding and labelled with its own destination, resolved
through `jumpTargetForMemberRule` so the span is a tight occurrence (measured
31 lines) rather than the envelope. `docs/CLAIMS_REGISTER.md` row 101.

**#15 — the "this isn't Fountain" card dropped half the server's answer.**
`POST /api/scriptide/doctor` answers a heading-less paste with BOTH a `reason`
and a `hint`. The full panel rendered both; this card rendered only the reason,
under the heading "Coverage failed", beside RETRY and USE SAMPLE. The highest-value
visitor — someone who pasted a draft out of Word or a PDF — was told the format
was wrong and offered a demo instead of the one sentence that would fix it. The
hint was already in this component's hands: `FormatUnrecognizedError`
(`src/lib/doctor-stream.ts`) carries it.

The card now shows the hint, calls the state "Not a screenplay" (the route
returns **200** — the request succeeded; the text is not a screenplay), and
offers a third affordance, "Paste from PDF?", which routes the draft through
the existing `normalizeScreenplay`
(`server/nvm/analyze/screenplay-normalizer.ts`, imported and unmodified —
it is on the scoring path) and re-submits it through the same `run()`, with
`onRepairDraft` installing the re-spaced draft so the editor and the report never
describe different bytes. **Its limit is written down, not discovered later:**
the route's `hasSceneHeading` tests each line trimmed and the normaliser never
invents a slugline, so from this state the repair reports that it did not help
and lands the one instruction that would fix it instead. `docs/CLAIMS_REGISTER.md` row 106.

**Browser suite:** `scripts/verify-p2-p3-surfaces.mjs` — the `P2-rerun` phase
(9-scene draft, run, edit, click the banner, assert a real doctor POST and a
verdict that moved 75 → 76), the `P2-format` phase (a title-page-only paste,
floored on the route's own answer), and the `P2-featurelen` phase's finding-#5
assertions on the compact card. `scripts/verify-ui-polish-affordances.mjs` and
`scripts/verify-a11y.mjs` also drive it.

**Voice Separation explained the wrong thing (2026-09-12, adversarial finding
#17, tooltip half).** MEASURED with a real doctor run on the committed inputs:
the channel abstains on `tests/fixtures/feature-length/assembled-feature.fountain`
(231 scenes, 81 characters) and reports on all three shorts — `runoff` 10 pairs,
`dead-frequency` 6, `chain-of-custody` 6. So on every feature-length script the
tile read **N/A** beside an `i` tooltip explaining how to read a number that was
not there, and the exported coverage report did not carry the channel at all.
`src/lib/voice-separation-copy.ts` now holds both states and the tile asks it
which sentence its current state deserves; [[Surface - Coverage HTML]] renders
the same two states in its Structural Analysis section, gated on the FIELD's
presence rather than on `scored` (an absent `voiceAnalysis` means the caller
attached none, which is a different statement from "the engine ran this and
abstained").

WHAT THE REASON MAY CLAIM is bounded by what the report carries.
`server/nvm/analyze/voice-delta.ts` has exactly two abstention branches and
records neither, and adding one is a scoring-path change. Fewer than two named
characters settles the branch and is stated specifically; otherwise the copy
names both conditions rather than guessing which fired — `report.characters`
counts every character who APPEARS, not every character who speaks, so
"81 characters" is not evidence that two of them have dialogue. The scoring half
(per-character abstention, so the channel can report at feature length) is on the
owner-gated `scoring/feature-length-defects` branch and untouched.
`tests/core/voice-separation-abstention.test.ts` re-measures the abstention
itself, so an engine change that makes the channel report at feature length fails
there rather than leaving copy asserted for a state that no longer occurs.

## Sources

- `src/components/scriptide/CoverageSummary.tsx`; `src/components/ScriptIDE.tsx`
- `src/lib/jump-span.ts`; `src/lib/finding-jump.ts`; `src/lib/doctor-stream.ts`
- `server/nvm/analyze/screenplay-normalizer.ts` (imported, never modified — scoring path)
- `tests/core/coverage-rerun-one-control.test.ts`,
  `tests/core/coverage-next-fix-jump-honesty.test.ts`,
  `tests/core/coverage-format-unrecognized-card.test.ts`,
  `tests/core/jump-span.test.ts`, `tests/core/coverage-jump-highlight.test.ts`
- `docs/audits/2026-09-12-adversarial/writer-loop.md` findings 3, 5, 15
- `src/lib/voice-separation-copy.ts`; `tests/core/voice-separation-abstention.test.ts`
- `docs/CLAIMS_REGISTER.md` rows 101, 106, 110
