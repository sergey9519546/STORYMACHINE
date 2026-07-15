# P0 Evidence Summary

## Status

**PLANNED**

- Study status: **PLANNED — FIELDING BLOCKED BY PRE-SESSION SMOKE**
- Study dates: **Not started**
- Intended stimulus commit SHA: `e7b9a946510da21f2cab4b8b3eaa8621e76e9cf1`
- Certified stimulus commit SHA: **None — exact-commit keyless instance did not bind a port in this environment**
- Provisional UI inspection: an older local instance (`/health` reported `commit: dev`) reached StartScreen and rendered sample coverage, but is not an authorized study stimulus
- Recruited / scheduled / completed / valid / fully documented: **0 / 0 / 0 / 0 / 0**
- Required valid documented sessions: **>=5**
- Decision: **INCONCLUSIVE (placeholder; no sessions completed)**
- P0 gate: **NOT MET**

No participants or sessions are represented in this document yet. Recruitment and scheduling may proceed, but no validation session may begin until an exact-commit keyless instance passes the operating kit's pre-session smoke check. Current blocker evidence: supported `npm run dev`, `npx tsx server.ts`, `node --import tsx server.ts`, and absolute-entry invocations exited 0 without binding the requested isolated port; the already-running `commit: dev` instance logged a CodeMirror update crash and `503` responses from `/api/analyze-script` during provisional inspection.

## Core question and exit gate

**Core question (exact ROADMAP wording):** *does this make you want to run your own draft — why or why not?*

**Exit gate (ROADMAP):** >=5 documented sessions with a clear signal on the core question. If the signal is negative or ambiguous, **STOP, reframe, and repeat P0** — do not proceed to build on a report nobody wants to run.

## Anonymized session evidence

Use anonymous session IDs only. Do not record participant names or identifying details here.

| Anonymous session ID | Date | Writer career tier | Real draft in hand | Coverage familiarity | Valid? | Session record |
|---|---|---|---|---|---:|---|
| _No sessions documented_ | — | — | — | — | — | — |

## Session-level signal

| Session ID | Raw own-draft intent | Classification | Key trust moment | Key objection | Classification confidence | Protocol deviations |
|---|---|---|---|---|---|---|
| _No sessions documented_ | — | — | — | — | — | — |

## Observations

| Anonymous session ID | Objections (verbatim) | Moments of trust (verbatim) | Moments of disbelief (verbatim) | Observed behavior / context |
|---|---|---|---|---|
| _No sessions documented_ | — | — | — | — |

## Cross-session categories

Categories are populated only from documented session evidence; do not infer missing evidence.

| Category | Supporting session IDs | Contrary session IDs | Frequency | Notes |
|---|---|---|---:|---|
| Observed behavioral patterns | — | — | 0 | No evidence yet |
| Stated value | — | — | 0 | No evidence yet |
| Trust requirements | — | — | 0 | No evidence yet |
| Disbelief / evidence requirements | — | — | 0 | No evidence yet |
| Privacy concerns | — | — | 0 | No evidence yet |
| Actionability / intended next action | — | — | 0 | No evidence yet |
| Desire to run own draft | — | — | 0 | No evidence yet |
| Willingness to pay | — | — | 0 | No evidence yet |
| Differences by participant context | — | — | 0 | No evidence yet |

## Favorable and contrary evidence

### Favorable evidence

_None recorded._

### Contrary evidence

_None recorded._

Absence of contrary evidence with zero sessions is not favorable evidence.

## Contradictions, negative cases, and study failures

_None identifiable with zero sessions._ Preserve disagreements and conflicting observations rather than forcing consensus. When fielding begins, record behavior-versus-claim conflicts, courtesy bias, product failures, moderator interventions, invalid sessions, outliers, and unresolved ambiguity here.

## Limitations

- Zero sessions have been completed or documented.
- The eventual sample will be small and purposive, not statistically representative.
- Recruitment through founder-provided contacts may introduce relationship and channel bias.
- Reaction to the built-in sample may not predict behavior on a participant's own script.
- Researcher-moderated observation may change behavior.
- Novelty and courtesy effects may inflate stated interest.
- P0 cannot establish score validity, human agreement, retention, sharing behavior, or pricing.
- No participant evidence exists from which to assess the core question.
- Recruitment mix, career-tier coverage, and possession of real drafts are not yet known.
- No cross-session pattern can be inferred.
- This template does not itself satisfy the P0 exit gate.

## P0 decision

Final decision must be one of:

- **PASS** — >=5 documented sessions provide a clear favorable signal on the core question.
- **STOP** — the signal is negative; stop, reframe, and repeat P0.
- **INCONCLUSIVE** — the signal is ambiguous or the evidence threshold is unmet; stop, reframe, and repeat P0.

**Current decision placeholder: INCONCLUSIVE.** This is not a completed gate decision; it reflects zero sessions and an unmet evidence threshold.

| Decision field | Value |
|---|---|
| Decision owner | Not assigned |
| Decision date | Not decided |
| Rationale | No valid sessions |
| Evidence reviewed | None |
| Dissent / uncertainty | Not evaluated |

## Allowed P1 inputs only after PASS

These inputs may begin only after P0 is explicitly recorded as **PASS**:

- Legally distributable real-draft benchmark materials: Creative-Commons/public-domain screenplay material and explicitly licensed author-contributed drafts.
- Blinded pairwise judgments from >=3 independent experienced readers, including inter-rater agreement and preserved disagreements.
- A pre-registered benchmark split, score metrics, and gates.
- A held-out set unavailable for implementer tuning.
- Versioned and hashed fixture and label artifacts.

Until PASS, P1 product/engine work is blocked. Critical security fixes remain the ROADMAP's only exception to the P0 product/engine-code freeze.

## Artifact index

| Artifact | Path / reference | Status | Anonymous session IDs |
|---|---|---|---|
| Operating kit | `docs/user-validation/P0_OPERATING_KIT.md` | Ready for field use | — |
| Session template | `docs/user-validation/P0_SESSION_TEMPLATE.md` | Ready to copy as `sessions/P0-S##.md` | — |
| Session artifacts | `docs/user-validation/sessions/` | Empty; `.gitkeep` only | — |
| Evidence summary | `docs/user-validation/P0_EVIDENCE_SUMMARY.md` | PLANNED | — |
| Phase tracker | `docs/user-validation/PHASE_TRACKER.md` | P0 ACTIVE | — |
| P1 baseline inventory | `docs/user-validation/P1_BASELINE_INVENTORY.md` | Inventory only; P1 blocked | — |
| Canonical sequencing and gates | `ROADMAP.md` §3 | Canonical | — |
| Short execution brief | `ULTRAPLAN.md` §1 | Canonical summary | — |
