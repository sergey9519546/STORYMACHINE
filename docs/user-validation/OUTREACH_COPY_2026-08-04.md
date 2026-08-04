# P0 Outreach Copy — 2026-08-04 (kit-compliant)

Ready-to-send outreach for the now-GO P0 fielding decision (`PHASE_TRACKER.md`
decision log; `FIELDING_DECISION_BRIEF.md` "DECIDED — 2026-08-04: GO"). This
replaces the earlier draft filed to
`docs/filed-backlog/premature-p0-machinery/OUTREACH_DRAFTS.md`, which was
flagged as violating the operating kit (see "What the archived drafts got
wrong" below). **`P0_OPERATING_KIT.md` is the authoritative protocol; where
anything below and the kit disagree, the kit wins.**

Fill in the placeholders (`{NAME}`, `{DATE}`, etc.) with real values before
sending. Never paste a participant's real name, contact detail, or any
identifying information into this file or any other repository surface —
this file stays templated; filled-in copies live outside Git, same as
scheduling contacts (`P0_OPERATING_KIT.md` → "Contact handling").

No compensation is offered anywhere in this kit. Do not add one when
personalizing — if you want to offer compensation, `P0_OPERATING_KIT.md`
requires it be stated before consent and never conditioned on favorable
feedback or on completing the session after withdrawal; that is a protocol
decision above this file's scope.

---

## What the archived drafts got wrong (and how this copy routes around it)

`OUTREACH_DRAFTS.md` was written before `P0_OPERATING_KIT.md` existed as the
authoritative protocol and was filed to `docs/filed-backlog/` rather than
fixed in place. Comparing the two directly:

| Archived draft said | Kit rule it broke | This copy instead |
|---|---|---|
| Pitched the tool as "a screenplay analysis tool," described it as "deterministic, keyless" and explained what it reads/produces before any reaction | Kit: "Do not mention... engine internals" and the pre-session-checklist rule against explaining the engine before the participant reacts | Names only that it is a short research session about "an existing sample screenplay coverage flow" — no mechanism description |
| Offered "an early look at the tool" as informal thanks | Kit: compensation must be stated before consent and is otherwise absent from the protocol; the archived line reads as an implicit inducement | No compensation offered, informal or otherwise |
| Screening question was "currently working on a feature draft" | Kit eligibility: "have at least one real draft in hand now" (any career tier, not feature-only; draft in hand, not necessarily "currently working on") | Screening checklist below asks the kit's exact eligibility language |
| No exclusion screening at all (pressure, confidential-material dependency, expecting evaluation) | Kit: five explicit exclusion criteria, none of which the archived drafts asked about | Full 1:1 exclusion checklist below |
| No consent-before-exposure sequencing spelled out | Kit: nine numbered consent items must be read and recorded before exposure | Quickstart doc (`FIRST_SESSION_QUICKSTART.md`) sequences this explicitly |

The archived drafts did **not** use "objective," "accurate," "trusted," or
"proven" — that part was already clean. The failures above are the ones this
rewrite fixes.

---

## 1. Short DM/text invitation

Leans on the kit's neutral-invitation paragraph verbatim (`P0_OPERATING_KIT.md`
→ "Neutral invitation"), trimmed only by removing the sentences a DM's length
can't carry (those move to the email version and the live consent read,
where they're required in full).

```
Hey {NAME} — I'm running a short research session with screenwriters about
an existing sample screenplay coverage flow, and I want candid reaction,
including criticism. About 30 minutes. You'd only look at our sample —
please don't send, upload, or describe anything of your own. Participation
is voluntary and you can stop any time. Interested?
```

## 2. Email version

```
Subject: 30 min for a screenwriting research session?

Hi {NAME},

We are conducting a short research session with screenwriters about an
existing sample screenplay coverage flow. We want your candid reaction,
including criticism. You will view only our sample; please do not send,
upload, name, quote, display, or describe your own screenplay. This is
research, not an evaluation of you or your writing. Participation is
voluntary, and you may skip any question or stop at any time.

A session is about 30 minutes, over screen-share or in person if that's
easier. The one thing I need to know before scheduling is whether you
currently have a screenplay draft of your own — you won't be asked to
share, upload, name, or describe it at any point.

If that sounds okay, let me know a few times that could work and I'll send
a confirmation with what to expect.

Thanks for considering it,
{YOUR_NAME}
```

## 3. Scheduling follow-up

```
Hi {NAME} — following up on the research session we talked about. Still
interested? Happy to work around your schedule if a different day or time
is better.
```

## 4. Session-confirmation message

```
Subject: Confirmed — {DATE}, {TIME} ({TIMEZONE})

Hi {NAME},

Confirming our session:
Date: {DATE}
Time: {TIME} ({TIMEZONE})
Where: {LINK_OR_LOCATION} (screen-share, or in person — whichever we agreed)

A few things to know:
- About 30 minutes, nothing to prepare or bring.
- We'll be looking at an existing sample report, not your own script —
  please don't have it open, uploaded, or on screen during the session,
  even if you'd want to share it.
- I'll do the screen-sharing (or, in person, we'll look at one screen
  together); you react out loud as you go. There's no correct path I'm
  expecting you to find.
- With your separate okay, I may take a local recording for my own notes;
  saying no to recording doesn't change anything else about the session.

If something comes up, just let me know and we'll find another time.

Talk soon,
{YOUR_NAME}
```

## 5. Screening checklist (recruiter use — before scheduling)

Every line maps directly to a rule in `P0_OPERATING_KIT.md` → "Eligibility."
A recruiter asks these conversationally (not read verbatim as a script) and
records only yes/no against the anonymous participant ID — never the
participant's answer text if it contains identifying or creative-work detail.

### Eligibility (all must be yes)

| Ask | Kit source |
|---|---|
| Do you identify as a screenwriter? | "identify as screenwriters" |
| Do you have at least one real draft in hand right now? (Do not ask what it is, its title, or genre at this stage.) | "have at least one real draft in hand now, without providing or showing it" |
| Would you be able to view a short on-screen sample report during the session? | "can view the existing sample flow and coverage report" |
| Are you able to give informed, voluntary consent to participate? | "can give informed, voluntary consent" |

Any career tier is fine — do not screen for "working" or "professional"
status only; the kit explicitly wants variation in experience, recent
writing activity, prior coverage use, genre/format, and software comfort
(kit: "Seek variation... These are contextual dimensions, not quotas").

### Exclusion (any yes here means do not schedule)

| Ask | Kit source |
|---|---|
| Is anyone unable to consent, or under the age of consent where they live? | "cannot consent or is below the applicable age of consent" |
| Is a boss, teacher, investor, or someone in a personal relationship with them pushing them to do this? | "is being pressured by an employer, teacher, investor, or personal relationship" |
| Did they help design the sample report closely enough that they'd recognize it as an insider rather than a first-time viewer? | "helped design the current report closely enough that they cannot encounter it as a user" |
| Would participating require them to disclose confidential screenplay material? | "must disclose confidential screenplay material to participate" |
| Are they expecting this session to evaluate their screenplay or give them professional coverage? | "expects P0 to evaluate their screenplay or provide professional coverage" |

If screening surfaces any exclusion, do not schedule — do not explain the
decision in terms that reveal engine internals, rule counts, or the intended
answer; a plain "this session isn't a fit right now" is sufficient.

### What the recruiter must NOT do during screening

- Must not ask for, accept, or discuss the participant's screenplay title,
  logline, genre, or content.
- Must not describe the engine, rule count, NVM, intended answer, or P1
  plans.
- Must not use "objective," "accurate," "trusted," "industry-grade,"
  "private," or "proven" anywhere in the conversation.
- Must not offer or imply compensation.

---

## Self-audit — every kit constraint, and where this copy satisfies it

| Kit constraint (`P0_OPERATING_KIT.md`) | Where satisfied in this file |
|---|---|
| Neutral invitation language, leaning on the kit's own text | §1 and §2 both use the kit's exact neutral-invitation paragraph (or a length-trimmed excerpt of it that preserves every required clause) verbatim |
| No "objective," "accurate," "trusted," "industry-grade," "private," or "proven" | Not used anywhere in §1–§5 (verified by re-reading; also gated by `npm run honesty-audit`, though its scan roots are `src/`, `public/`, `server/` and this file is outside that scope by convention — same "same bar applies" note the archived kit carried) |
| No intended answer, rule count, engine internals, NVM, or P1 metrics mentioned | None appear anywhere in the sent-copy text; the only place "engine"/"P1"/"kit rule" language appears is this audit table and the comparison table above it, which are internal repo documentation, never sent to a participant |
| No draft-sharing requirement; screening never asks what the draft is | §5's eligibility line explicitly notes "Do not ask what it is, its title, or genre at this stage"; every message body tells the participant not to send/upload/describe their own screenplay |
| Consent rules (9 numbered items, before exposure) | Not restated here — this file is outreach/scheduling copy, not the consent script. `FIRST_SESSION_QUICKSTART.md` sequences the full consent read before exposure, citing the kit's "Consent and privacy" section directly |
| Exclusions (5 criteria) | §5's exclusion table maps each one 1:1 to its kit source line |
| No compensation, or if offered, stated before consent and not outcome-conditioned | No compensation appears anywhere in §1–§4; explicit note at the top of this file repeats the constraint |
| Contact handling — no PII/contacts in the repository | Every message is a template with `{PLACEHOLDER}` fields; the top-of-file note repeats that filled-in copies stay outside Git |
| Recruiter must not pitch, teach the right answer, or defend the report | §5's "What the recruiter must NOT do" section states this directly for the screening call; the confirmation message (§4) sets the expectation of "no correct path" for the session itself |

**Not covered by this file (by design, out of the outreach-copy lane):**
running the session, the exact core question, per-section reactions,
evidence classification, and privacy review are all `P0_OPERATING_KIT.md`
territory proper and `FIRST_SESSION_QUICKSTART.md`'s territory as a map —
this file stops at "a session is scheduled."
