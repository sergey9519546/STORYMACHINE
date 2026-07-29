# P0 Fielding Decision Brief — for the decision owner

> **This is the actual first step of Track 1.** Per the active-work prompt and
> the freeze, recruitment, session-running, and the field-the-study decision
> are *reserved to a human owner* — an agent cannot perform them. What an
> agent *can* do is hand the owner a verified, decision-ready package so the
> one thing that actually moves the gate (the go/no-go) can be made against
> current reality, not stale SHAs. That is what this file is.

## What I need from you (the decision)

One decision, and it's yours, not mine:

1. **Do we field P0 now?** (yes / no / not yet)
2. **On what signal rule?** ROADMAP §3 is deliberately qualitative ("a clear
   signal on the core question"). The operating kit declines to set a numerical
   threshold. You must state how you'll read ≥5 sessions before any session
   runs — otherwise the gate has no consistent scorer.
3. **Who is the decision owner of record?** (named role, not PII in Git)

Nothing else in P0 can move until that decision is made. Recruitment machinery
exists but was *deliberately archived* as premature (see
`docs/filed-backlog/premature-p0-machinery/README.md`); it is not reactivated
by this brief.

## What I verified on current HEAD (2026-07-28, before you decide)

HEAD is now **`d733240`** — six commits past the last browser-DOM-certified
SHA (`1a7f3b4`/`4c131df`) recorded in `PHASE_TRACKER.md` and
`P0_EVIDENCE_SUMMARY.md`. Those six commits are docs, tests, a11y, and security
only; none touch the boot path, the Doctor, or report rendering. I re-ran the
deterministic checks on this HEAD to confirm the certified facts still hold:

| Check | Method | Result on `d733240` |
|---|---|---|
| Honesty-audit | `npm run honesty-audit` | **clean** — "scanned 362 files — clean", exit 0 |
| Deterministic pipeline | `npm run generate-p0-sample` | reproduces the committed facts exactly |
| Health | generator output | **68.9** (matches committed stimulus) |
| Verdict | generator output | **CONSIDER** (matches) |
| Scene count | generator output | **14** (matches) |
| contentHash | generator output | **`33dcf21462118381ae1941b79240ffd441b0469f5f12dc997110c9bf9186004f`** (matches) |
| Artifact size | `wc -c` | **210208 bytes** (byte-identical to committed) |

The only diff the regeneration produced against the committed
`sample-coverage-report.html` was the **datestamp** ("July 15" → "July 28" and
the generation timestamp) — a runtime field, not content. I restored the
committed artifact, so the working tree is clean. **Conclusion: the committed
static stimulus is reproducible and valid on HEAD.** The stale certified-SHA
references in the tracker/evidence summary should be refreshed to `d733240`
(equivalent facts; tracked as a follow-up, not a blocker).

> **Caveat I did NOT re-verify:** the *browser DOM click-through* (StartScreen
> → "Try sample coverage" → ScriptDoctorPanel renders with zero console
> errors). That was last certified on `1a7f3b4` and requires a display + a
> browser. The six intervening commits don't touch the render path, but if you
> plan **live-flow** (not static-report) sessions, the operating kit's
> pre-session checklist requires you to confirm the sample loads correctly in a
> browser before each session anyway. Static-report sessions need no such check
> — the artifact is already verified above.

## The state of the gate, honestly

| Counter | Current | Required |
|---|---:|---|
| Valid, fully-documented sessions | **0** | **≥5** |
| Recruited / scheduled | 0 / 0 | progress only |
| Gate decision | INCONCLUSIVE (placeholder) | PASS / STOP |

`P0_EVIDENCE_SUMMARY.md` records the constitutional guard correctly: *"Absence
of contrary evidence with zero sessions is not favorable evidence."* Zero
sessions means the gate is genuinely unmet. Nothing an agent does changes this
counter — only human recruitment + human sessions do.

## If you say GO — exactly what happens next (and who does it)

This is the path the operating kit governs. I am listing it so the decision is
concrete, not so I can execute it — every step after the decision is human
work.

1. **You** record the GO + signal rule + decision-owner role in
   `PHASE_TRACKER.md`'s decision log (it currently has zero entries).
2. **Recruiter** screens for eligibility per the kit: real screenwriters with a
   real draft in hand, can view the sample, can consent. No career-tier quota.
   Exclude anyone who can't consent, is pressured, helped design the report,
   must disclose their draft, or expects coverage of their writing.
3. **Recruiter** sends the kit's **neutral invitation verbatim** — no
   "objective/accurate/trusted/private/proven", no rule count, no engine
   internals, no intended answer. If you want ready outreach copy, the archived
   `docs/filed-backlog/premature-p0-machinery/OUTREACH_DRAFTS.md` exists but
   **must be re-checked line-by-line** against the kit (the archive note warns
   some drafts pitch the tool as "objective/accurate," offer free analysis as
   comp, or invite draft-sharing — all violations).
4. **Recruiter** assigns `P0-00N` IDs. Contacts/scheduling live **outside Git**.
   No id-to-identity crosswalk in the repo.
5. **Moderator** runs each session per the kit: neutral opening → exposure
   controls → observe-before-interview → per-section reactions → **ask the
   exact core question verbatim** → follow-ups → close. Copy
   `docs/user-validation/P0_SESSION_TEMPLATE.md` (the canonical, kit-reconciled
   one) to `sessions/P0-00N.md`.
6. **Evidence reviewer** privacy-reviews each record, classifies
   (Positive/Qualified/Negative/Ambiguous/Invalid), preserves contrary
   evidence. Commit only the anonymized record.
7. After ≥5 valid sessions, **decision owner** aggregates into
   `P0_EVIDENCE_SUMMARY.md`, applies the signal rule, records PASS/STOP/
   INCONCLUSIVE, links from ROADMAP §3.

## If you say NO or NOT YET — what's still useful

The freeze stays. The highest-leverage agent work that *doesn't* touch the gate
or the frozen score is **Track 2, Lever 2**: stand up a real-script
discrimination harness (`REAL_SCRIPT_CORPUS_DIR`, 261+ `.fountain` on this
machine) that runs the *current* Doctor over real writing and reports — without
changing the score — whether it orders strong-above-weak, by what margin, and
where it ties or inverts. That evidence sharpens whatever you show writers in
P0 and pre-arms the P1 decision. It's the active-work prompt's named
highest-value lever and is fully freeze-permitted. Say the word and I'll plan
and build it.

## What I will not do (and why these aren't mine to do)

- **Fabricate sessions or participants.** Zero sessions is the truth. Inventing
  any would be the exact fabrication the operating kit and evidence summary
  exist to prevent, and would poison the gate.
- **Recruit, outreach, or run sessions.** No human contacts, no outreach
  channel, and these are explicitly human work per the freeze.
- **Make the field-the-study decision or pick the signal rule.** Reserved to
  the owner. I will not auto-field to "make progress."
- **Touch the scoring formula, constants, rules, detectors, calibration, or
  report math.** Frozen under P0; the only exception is critical security.
