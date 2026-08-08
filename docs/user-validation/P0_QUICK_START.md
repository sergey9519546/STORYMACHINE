# P0 Quick-Start — one page to run a session

This is a **wayfinding index**, not new doctrine. If anything here conflicts
with `P0_OPERATING_KIT.md`, `ROADMAP.md` §3, or `ULTRAPLAN.md` §1, those win.
The operating kit is the authoritative protocol; this page only tells you which
document to open, in what order, so a cold start doesn't have to reverse-engineer
the kit.

## The one question P0 answers

> **does this make you want to run your own draft — why or why not?**

P0 is demand validation. It does **not** test whether the score is correct;
P1 has its own machine-checked evidence gates and may proceed without turning a
P0 reaction into benchmark evidence. Never relabel a P0 reaction as a
P1/benchmark/quality/ground-truth label. Fielding is GO, but P0 remains
unvalidated: 0 valid documented human sessions and no verdict. P4 retention or
lock-in work remains barred until P0 passes.

## Exit gate

**>= 5 documented, valid sessions** with a clear signal on the core question.
Negative or ambiguous → **STOP, reframe, repeat P0.** Do not add features or
rules to compensate.

## What you show them

`sample-coverage-report.html` (in this folder) — the deterministic coverage
report for the built-in sample, now **"Dead Frequency"** (see the 2026-08-04
update below; the section immediately after this one describes the retired
"The Second Key" provenance, kept for history). Regenerate any time with:

```
npm run generate-p0-sample
```

Provenance (regenerate to verify): health 68.9, verdict CONSIDER, 14 scenes,
contentHash `33dcf21462118381ae1941b79240ffd441b0469f5f12dc997110c9bf9186004f`.
**SUPERSEDED 2026-08-04 — see the update block immediately below; this
paragraph describes the retired "The Second Key" stimulus only.**

> **Update 2026-08-03:** after the 1-based scene-label migration the
> regenerated artifact is **212,708 bytes** (issue labels shifted; health /
> verdict / scene count / contentHash unchanged). References below to
> 212,723 bytes describe the pre-migration artifact. Reproducibility and the
> browser-DOM click-through were both re-certified on the migration branch
> (`scripts/smoke-p0-live-flow.mjs` PASS, zero genuine console errors).

**Fielding readiness (re-verified on HEAD `d733240`, 2026-07-28):** the
committed static stimulus is reproducible — `npm run generate-p0-sample`
reproduces health 68.9 / CONSIDER / 14 scenes / the hash above / 212723 bytes
byte-identical to the committed artifact (the only regeneration diff is the
runtime datestamp). `npm run honesty-audit` is clean. The last
*browser-DOM* click-through was certified on `1a7f3b4` (6 commits prior); the
intervening commits are docs/tests/a11y/security only and do not touch the
render path, so for **live-flow** sessions the operating kit's pre-session
"sample loads correctly" browser check still applies. See
`FIELDING_DECISION_BRIEF.md` for the go/no-go package.

> **Update 2026-08-04 — stimulus swap, "The Second Key" -> "Dead Frequency"
> (all provenance above this line describes the RETIRED sample):** the P0
> sample was upgraded from a ~47.5 words/scene skeleton to
> `data/screenplays/dead-frequency.fountain`, a corpus-density stimulus at
> ~152.6 words/scene (12 scenes, 1,831 words) — see the dated addendum in
> `FIELDING_DECISION_BRIEF.md` for the full rationale and comparison table.
> Newly measured provenance (HEAD `0cf12c9` at swap time): **health 78.3,
> verdict CONSIDER, sceneCount 12**, contentHash
> `a1b44eff859da29988dbd81354056b2574655302d63180022e679a7c942cf3ca`,
> regenerated `sample-coverage-report.html` was **193,132 bytes at the
> 2026-08-04 swap**. The old
> stimulus's fountain text is preserved verbatim at
> `docs/user-validation/ARCHIVED_SAMPLE_THE_SECOND_KEY.md`. Zero P0 sessions
> had been run against the retired stimulus, so no session comparability is
> lost by this swap. Re-verified: `npm run generate-p0-sample` reproduces the
> figures above byte-identical apart from the runtime datestamp;
> `scripts/smoke-p0-live-flow.mjs` PASS (zero genuine console errors,
> keyless); `npm run honesty-audit` clean.

> **Current artifact provenance (2026-08-08):** regenerated with
> `npm run generate-p0-sample` after the live tie-break/report fixes:
> health **78.3**, verdict **CONSIDER**, sceneCount **12**, contentHash
> `a1b44eff859da29988dbd81354056b2574655302d63180022e679a7c942cf3ca`,
> and `sample-coverage-report.html` **207,740 bytes**. This updates only the
> generated report artifact; P0 remains fielding-authorized with **zero valid
> human sessions** and **no outcome verdict**.

**Exposure caveat:** the static HTML is the *report artifact only*. If your
session shows only this file (not the live StartScreen → Doctor → export flow),
record exposure as **static report, not live flow** per the operating kit's
exposure-controls rule. Whether static-only satisfies the kit's "sample flow
and coverage report" requirement is the decision owner's call, logged per
session. See the stimulus note in `P0_EVIDENCE_SUMMARY.md`.

## Run order (cold start)

1. **Read the protocol.** `P0_OPERATING_KIT.md` — authority, consent, privacy,
   session script, stop rules, evidence classification. This is the real
   playbook; the steps below are just its table of contents.
2. **Recruit under the authorized protocol.** P0 fielding has been **GO /
   authorized since 2026-08-04**. There are still **0 valid documented human
   sessions** and no gate verdict. The earlier ready-to-send outreach/screening
   kit has been filed to
   `docs/filed-backlog/premature-p0-machinery/` (recoverable if/when P0 is
   fielded, but re-check each template against the kit). When recruiting, the
   operating kit's eligibility and neutral-invitation rules govern directly
   (do not pitch "objective/accurate/trusted"; do not lead the answer).
3. **Per session, before you start.** Copy `P0_SESSION_TEMPLATE.md` to
   `sessions/P0-S##.md` (kept anonymous). Run the operating kit's pre-session
   checklist. Assign an anonymous participant ID; keep all PII/contacts/
   scheduling **out of Git**.
4. **Run it.** Follow `P0_PROTOCOL.md` / the operating kit's session protocol:
   observe before interviewing, keep Observation / Quote / Interpretation
   separate, ask the exact core question verbatim, then the four follow-ups.
5. **After the session.** Privacy-review, classify (Positive / Qualified /
   Negative / Ambiguous / Invalid), and commit only the anonymized record.
6. **After >= 5 valid sessions.** Aggregate into `P0_EVIDENCE_SUMMARY.md`, apply
   the exit gate, record the decision, and link the artifact from `ROADMAP.md`
   §3.

## Hard don'ts (from the kit — repeated because they're easy to trip)

- Don't let the participant show, name, upload, or describe their own script.
- Don't commit PII, contacts, recordings, transcripts, or screenplay content.
- Don't pitch, teach the "right" answer, or defend the report against objections.
- Don't treat P0 evidence as P1 labels.
- Don't change the fielded stimulus mid-cohort to manufacture a better result.
  The old blanket engine/product freeze is retired; `ROADMAP.md` now uses
  machine-checked evidence gates. That does not make P0 passed or authorize
  unsupported scoring, P4 retention, or other work whose gate has not cleared.

## Current status

See `PHASE_TRACKER.md` and `P0_EVIDENCE_SUMMARY.md`. P0 fielding is authorized
(GO, 2026-08-04), with **0 valid documented human sessions** and **no verdict**.
Both static-report and live-flow sessions are unblocked. The former live-flow
boot/port symptom was diagnosed as an import-time boot crash and is resolved;
it is retained only as historical evidence in `P0_EVIDENCE_SUMMARY.md`.
