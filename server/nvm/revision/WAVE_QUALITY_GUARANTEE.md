# NVM Revision-Wave Quality Guarantee

**Scope:** the narrative-quality-check "wave" workflow that incrementally extends the
revision passes in `server/nvm/revision/passes/` (and their tests, one file per pass,
in `tests/passes/*.test.ts` — split from a single monolithic `test.ts` in audit M2.1).

**Status at last update:** through **Wave 590** — 14 passes, **1307** distinct rule names,
**3841** tests across `tests/passes/*.test.ts`, suite green (`npm test` ⇒ 0 failures).

> This count drifts every wave. Rather than hand-updating it each time, verify the live
> numbers with:
> `grep -h "rule: '" server/nvm/revision/passes/*.ts | grep -oP "rule: '[A-Z_]+'" | sort -u | wc -l`
> and the `# tests` / `# pass` lines from `npm test`.

---

## ⚠️ CRITICAL NOTE — read before authoring any wave

**Every wave MUST be done to the fullest capabilities of its feature and be as strong as it
can possibly be within the data the engine exposes. This is not optional and not a target to
approximate — it is the entry condition for committing a wave.**

Concretely, before a wave is committed, the author confirms — out loud, in the wave's own
rule comments — that:

1. **No stronger sibling was skipped.** For each new check, the most powerful form the
   available signals permit was chosen (e.g. if a single-peak check is sharper than an
   average check for this failure mode, the peak form is used; if both add value, both are
   added across the rotation). A weaker formulation is never shipped in place of a stronger
   one that the data supports.
2. **No adjacent empty cell was left on the table within reach.** When a one-sided check
   exists (underweight without bloat, front without back, Act 2a without Act 2b, set-average
   without single-peak), the wave is expected to close the matching cell rather than add an
   unrelated weaker check. Coverage advances; it never stalls or repeats.
3. **The guard is as tight as it can be without becoming brittle.** Thresholds and minimum
   populations are set so the check fires on every genuine instance of the failure and on no
   degenerate/noise input — the strongest precision the signal allows.
4. **The finding is maximally actionable.** The `description` interprets the harm with the
   measured numbers, and the `suggestedFix` is the most concrete, craft-grounded remedy the
   case admits — never generic filler.

If any of these cannot be honestly affirmed for a wave, the wave is not done. "Good enough"
is a failing grade here; the only passing grade is *the strongest version this feature can
support.*

---

## The Guarantee

Every wave — every one already shipped and every one still to come — is held to a single,
non-negotiable standard:

> **Each wave delivers the strongest possible version of every check it adds: maximally
> distinct, maximally guarded, maximally covered, and maximally verified — such that no
> reasonable additional capability for that check has been left on the table within the
> data the engine exposes.**

This is not a slogan. It is operationalized by the **binding acceptance checklist** below.
A wave is only "done" when it satisfies *every* item. "Best absolute version of itself with
all capabilities that could be possible for each feature" means exactly this checklist —
each item closes off a class of ways a check could otherwise be weaker, narrower, or less
correct.

---

## What "all capabilities that could be possible" means (the coverage model)

A check can only read what the engine records expose. Each `ScreenplaySceneRecord` /
fountain surface gives a fixed set of **signals** and the story gives a fixed set of
**structural positions**. "All capabilities possible" is therefore *bounded and
enumerable*: it is the full cross-product of signals × analytical modes × positions. Every
wave is required to push checks into the still-empty cells of that matrix, never to
re-cover a filled one.

**Signals (channels):** `emotionalShift`, `suspenseDelta`, `curiosityDelta`, `clockRaised`
/ `clockDelta`, `relationshipShifts`, `revelation`, `dramaticTurn`, `seededClueIds`,
`payoffSetupIds`, `purpose`, plus prose-surface signals (dialogue lines, action lines,
sluglines, transitions, punctuation).

**Analytical modes** applied to each channel:
- **Average / aggregate** — the channel is flat across a population of scenes
  (e.g. `*_DECOUPLED`, `*_FLAT`, `*_VOID`).
- **Single-peak isolation** — the one extreme scene fails its obligation
  (e.g. `*_PEAK_ABSENT`, `*_PEAK_DECOUPLED`).
- **Co-occurrence / decoupling** — two channels that should meet never share a scene
  (e.g. `*_CLOCK_DECOUPLED`, `*_PAYOFF_COINCIDENCE_ABSENT`).
- **Distribution / timing** — front-loaded, back-loaded, drought, clustering, late-first,
  per-half void (e.g. `*_BACKLOADED`, `PAIR_FIRST_HALF_VOID`, `*_DROUGHT`).
- **Zone presence/absence** — Act 1 / Act 2a / midpoint / Act 2b / Act 3 voids
  (e.g. `MIDPOINT_SUSPENSE_VOID`, `ACT2B_EMOTIONAL_FLATLINE`).
- **Underweight / bloat** — pacing weight mismatched to dramatic weight
  (e.g. `*_SCENE_UNDERWEIGHT`, `*_SCENE_BLOAT`).
- **Sequence / aftermath** — a cause with no downstream consequence
  (e.g. `*_AFTERMATH_VOID`, `*_NO_FALLOUT`).

A feature (pass) is "fully capable" when every meaningful (signal × mode × position) cell
that the data can support has a distinct, guarded, tested rule. Waves march through these
cells systematically; the per-pass rule counts (51–64 each) reflect that march.

---

## Binding per-wave acceptance checklist

Every wave **must** satisfy all of the following before it is committed. Each shipped wave
has met it; each future wave will.

1. **Exhaustive distinctness.** Before authoring, enumerate *every* existing rule in the
   target pass (and any sibling pass that touches the same signal) and confirm each new
   rule is distinct on at least one of {channel, analytical mode, structural position,
   threshold/guard}. The distinctness rationale is written into the rule's comment
   ("Distinct from X (…), Y (…)") so it is auditable forever, not just at authoring time.

2. **Complete guard conditions.** Every rule states explicit preconditions that prevent
   false positives on small or degenerate inputs: minimum scene count, minimum population
   size for the audited subset, and "the story otherwise exhibits the signal" qualifiers so
   a check never fires on a story that simply lacks the material. No rule fires on noise.

3. **Full channel/zone coverage intent.** A wave does not add three arbitrary checks; it
   advances coverage of the matrix above. When a single-peak check exists for one channel,
   the wave is expected to extend the same mode to channels still missing it, and to add
   the complementary direction (underweight ⇄ bloat, front ⇄ back, Act 2a ⇄ Act 2b) where
   a one-sided check already exists.

4. **Craft-grade authoring.** Every rule carries: a precise `location`, a calibrated
   `severity`, a `description` that explains *why the pattern harms the story* (not just
   that it occurred, with the measured numbers interpolated), and a `suggestedFix` that is
   concrete, actionable, and grounded in screenwriting craft — never generic.

5. **Symmetric test coverage.** Every rule ships with **both** a fire test (minimal input
   that triggers it) and a no-fire test (the near-miss that must *not* trigger it). Tests
   are inserted newest-first and assert the specific rule by name. The full suite must run
   green with **0 failures** before commit — never "mostly green."

6. **Determinism & isolation.** Checks are pure functions of the pass input. No I/O, no
   randomness, no time dependence; identical input ⇒ identical issues. Tests construct
   records/fountain directly and never depend on network or model calls.

7. **Security surface untouched.** The wave workflow is confined to
   `server/nvm/revision/passes/*.ts` and `tests/passes/*.test.ts`. It adds **no** routes, **no** frontend
   code, **no** `apiKey` references, and **no** new `console.*` in `server/**`. The
   project's standing security invariants are therefore preserved by construction:
   - API keys live only in `.env` (gitignored), never in tracked files;
   - all AI calls remain behind server-side Express routes, never the frontend bundle;
   - all routes stay behind `gameLimiter` (or stricter limiters);
   - no new `console.*` is introduced in `server/**`.
   *(Pre-existing `apiKey` identifiers in `src/components/SettingsPanel.tsx` are runtime
   input-field bindings, not embedded secrets, and predate — and are untouched by — this
   workflow.)*

8. **Atomic, traceable commits.** One wave = one commit naming the pass and the three new
   rules, pushed to the designated feature branch. The diff is the audit trail.

---

## Why this constitutes "the best absolute version"

- A check cannot be made **more distinct** than one verified non-duplicative against all
  ~1300 sibling rules (item 1) — see the note above for how to get the live count.
- A check cannot be made **more correct on edge inputs** than one with explicit minimum-N
  and "signal-otherwise-present" guards (item 2).
- A feature cannot be made **more capable** than one whose checks fill every supportable
  cell of the signal × mode × position matrix (item 3) — the matrix is bounded by the data,
  so completeness is reachable, not infinite.
- A finding cannot be made **more useful** than one that explains the harm and prescribes a
  concrete craft fix (item 4).
- A check cannot be **more trustworthy** than one proven to fire exactly when it should and
  not when it shouldn't, inside an all-green suite (items 5–6).

Within the information the engine exposes, these five close off every axis on which a check
could be stronger. That is the precise, defensible meaning of the guarantee.

---

## Standing process for future waves

The rotation cycles through the passes in order and repeats indefinitely:

`dialogue → character-arc → conflict → intention → originality → pacing → payoff →
relationship-arc → rhythm → structure → theme → voice → belief → causality → (repeat)`

Each wave: **+3 distinct rules** to one pass (full guards, distinctness rationale in
comments), **header comment updated**, **+6 tests** (fire + no-fire per rule, inserted
before the previous wave's describe block), **suite green**, **commit + push**. The
acceptance checklist above governs every iteration without exception.
