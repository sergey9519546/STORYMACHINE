# P0 Quick-Start — one page to run a session

This is a **wayfinding index**, not new doctrine. If anything here conflicts
with `P0_OPERATING_KIT.md`, `ROADMAP.md` §3, or `ULTRAPLAN.md` §1, those win.
The operating kit is the authoritative protocol; this page only tells you which
document to open, in what order, so a cold start doesn't have to reverse-engineer
the kit.

## The one question P0 answers

> **does this make you want to run your own draft — why or why not?**

P0 is demand validation. It does **not** test whether the score is correct
(that is P1, and P1 is frozen until P0 clears). Never relabel a P0 reaction as
a P1/benchmark/quality/ground-truth label.

## Exit gate

**>= 5 documented, valid sessions** with a clear signal on the core question.
Negative or ambiguous → **STOP, reframe, repeat P0.** Do not add features or
rules to compensate.

## What you show them

`sample-coverage-report.html` (in this folder) — the deterministic coverage
report for the built-in sample "The Second Key". Regenerate any time with:

```
npm run generate-p0-sample
```

Provenance (regenerate to verify): health 68.9, verdict CONSIDER, 14 scenes,
contentHash `33dcf21462118381ae1941b79240ffd441b0469f5f12dc997110c9bf9186004f`.

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
2. **Recruit.** `P0_RECRUITMENT.md` — outreach/screening templates. Eligibility
   and the neutral-invitation rules in the operating kit override any wording
   there (do not pitch "objective/accurate/trusted"; do not lead the answer).
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
- Don't start engine/product work to "improve" the report mid-P0 — the freeze
  holds until the gate clears (critical security fixes are the only exception).

## Current status

See `PHASE_TRACKER.md` and `P0_EVIDENCE_SUMMARY.md`. As of this writing: 0
completed sessions; the live-flow stimulus had a pre-session smoke blocker
(server port binding), which the static report above works around for the
report-reaction portion.
