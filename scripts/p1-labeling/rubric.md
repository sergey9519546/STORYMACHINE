# P1 Benchmark — Reader Rubric

**Source of authority:** this rubric is derived from
`docs/adr/ADR-002-p1-benchmark-design.md` ("Decision," "Why 4-point scale
(A/B/C/D)?") and `docs/p1-benchmark/PRE_REGISTRATION_PROTOCOL.md` §3
("Labeling Scale," "Rubric for raters"). Every sentence under "Core Rubric"
below is a direct restatement of language in one of those two documents; if
this file and either of them ever disagree, the ADR/protocol is correct and
this file has drifted and needs fixing.

This file is rendered into each reader's `instructions.md` by
`make-blind-bundles.mjs`. By default only the **Core Rubric** section is
included — see "Draft Clarifications" below for why the second section is
withheld unless explicitly requested.

---

## Core Rubric (from ADR-002 / PRE_REGISTRATION_PROTOCOL — stable)

### Your task

Read a screenplay in full. Assign it exactly one overall quality tier: **A**,
**B**, **C**, or **D**. Write 1-2 sentences justifying the tier.

You are reading independently. Do not discuss any screenplay, tier, or
justification with the other readers until every reader has submitted every
rating — inter-rater agreement is only meaningful if your judgment was not
influenced by anyone else's.

You do not need, and should not seek, any information about how this
tool measures scripts. Rate the writing on its own merits, the way you would
for any coverage assignment.

### The four tiers

| Tier | Meaning |
|------|---------|
| **A — Strong** | Professional quality, ready for production consideration. |
| **B — Good** | Solid craft, needs minor revision. |
| **C — Weak** | Structural issues, needs major revision. |
| **D — Poor** | Fundamental problems, not ready. |

### Rubric by dimension

| Tier | Structure | Character | Dialogue | Pacing | Overall |
|------|-----------|-----------|----------|--------|---------|
| **A** | Clear 3-act, strong turning points | Distinct voices, clear arcs | Natural, character-specific | Engaging throughout | Professional |
| **B** | Solid structure, minor gaps | Functional arcs, some blending | Mostly natural, occasional stiffness | Generally good, minor lulls | Solid |
| **C** | Structure problems, unclear beats | Weak arcs, similar voices | Often expository, on-the-nose | Uneven, drag or rush | Major issues |
| **D** | No clear structure | No arcs, interchangeable | Unnatural, info dumps | Constantly drags or rushes | Fundamental problems |

### Procedure

1. Read the screenplay you were given in the order it appears in your bundle
   (already randomized for you — do not reorder).
2. Form an impression across Structure, Character, Dialogue, and Pacing.
3. Assign ONE overall tier (A/B/C/D) to the "Tier" field in your rating form.
4. Write a 1-2 sentence justification in the "Justification" field.
5. Move to the next screenplay. Do not revise an earlier rating after
   reading a later screenplay.

### What you are NOT asked to do

- You are not asked to give a numeric score, only a tier.
- You are not asked to identify the screenplay, its author, or its source —
  title pages and identifying preamble text have already been removed. If
  you believe you recognize a screenplay anyway, rate it as you normally
  would and note the recognition in your justification field (do not skip
  it or guess at the author's intent from outside knowledge).
- You are not asked to fix, edit, or suggest revisions — coverage-style
  evaluation only.

---

## Approved Clarifications (2026-08-04)

**Status: APPROVED — 2026-08-04.** Neither ADR-002 nor
PRE_REGISTRATION_PROTOCOL.md specifies the items below; they were drafted
because leaving them unresolved risks lowering inter-rater agreement below
the 0.60 gate for reasons that have nothing to do with genuine disagreement
about script quality. All three were reviewed and approved under the
maintainer's explicit blanket delegation of open decisions (2026-08-04,
recorded in `docs/user-validation/PHASE_TRACKER.md`'s decision log). For
Draft 1 the weakest-link rule was CHOSEN over the holistic alternative:
the benchmark's validity requirement is reader-to-reader label consistency,
which an explicit combination rule serves and a gestalt call does not; the
holistic option is retained below as considered-and-not-chosen. Operators
should now pass `--include-draft-clarifications` when building real reader
bundles — the flag's accident-guard purpose is served; these clarifications
are approved methodology and readers SHOULD receive them.

### Draft 1 — combining the four dimensions into one Overall tier

The rubric table gives per-dimension impressions (Structure, Character,
Dialogue, Pacing) and a separate "Overall" column, but does not say how to
combine the first four into the fifth when they disagree — e.g. a script
with A-level structure but D-level dialogue.

**Proposed rule:** treat "Overall" as a *weakest-link floor with one
allowed exception*: the overall tier is normally the lowest of the four
per-dimension impressions, UNLESS exactly one dimension is the outlier and
the other three are at least one tier higher, in which case the overall
tier may be raised by one level from the floor (not all the way to the
three-dimension consensus). Record which dimension was the outlier in your
justification when this exception applies.

**Alternative not to dismiss:** a pure holistic gestalt call (no explicit
combination rule at all) is also defensible and is what many professional
coverage rubrics actually do — the tradeoff is lower structure/higher
reader-to-reader consistency risk. The decision owner should pick one, not
average them.

### Draft 2 — tie-breaking between adjacent tiers

No rule exists for a reader genuinely torn between two adjacent tiers (e.g.
A vs. B).

**Proposed rule:** when genuinely torn between two adjacent tiers, assign
the LOWER of the two, and say so in the justification (conservative
convention used in professional script coverage — a screenplay must clearly
earn the higher tier).

### Draft 3 — length and genre normalization

No guidance exists on judging Pacing across screenplays of very different
lengths or genres (a 60-page contained thriller and a 150-page epic drama
are being read against the same rubric row).

**Proposed rule:** judge Pacing relative to the screenplay's own chosen
scope and genre conventions, not a fixed page-count expectation. A short
piece that never lags is not automatically "A" on pacing merely for being
short; a long piece with a deliberate slow movement is not automatically
penalized if the slowness serves the piece.

---

## References

- `docs/adr/ADR-002-p1-benchmark-design.md` — tier definitions, kappa
  threshold, and the rationale for both.
- `docs/p1-benchmark/PRE_REGISTRATION_PROTOCOL.md` §3 — labeling scale,
  rubric table, labeling procedure, conflict resolution.
- `docs/p1-benchmark/LABELING_KIT.md` — the operational runbook that renders
  this file into reader bundles.
