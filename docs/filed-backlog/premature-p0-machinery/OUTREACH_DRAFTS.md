# P0 Recruitment — Ready-to-Send Outreach Kit

Ready-to-personalize copy for recruiting and running P0 sessions. Fill in the
placeholders (`{NAME}`, `{DATE}`, etc.) with real values before sending —
never leave a placeholder unfilled, and never paste real personal data into
this file itself.

## How to use this kit

1. **Read `P0_OPERATING_KIT.md` first.** It is the authoritative protocol —
   consent, privacy, eligibility, neutral-invitation rules, and the exact
   core question. Where any wording below and the kit disagree, **the kit
   wins.**
2. **`P0_QUICK_START.md`** is the one-page run order if you need to
   re-orient mid-recruitment.
3. **`P0_PROTOCOL.md`** supplies the 30-minute session shape used in the
   confirmation/logistics copy below.
4. **`P0_SESSION_TEMPLATE.md`** is the anonymous record you fill in per
   session — copy it fresh for each participant, keep it outside Git until
   privacy-reviewed.
5. **`RUN_DEMO.md`** explains how to run the keyless demo yourself before a
   session, in case you're showing the live flow instead of the static
   sample report.

**Two protocol facts baked into every template below** (don't loosen them
when personalizing):

- The session shows **only the existing sample coverage report** —
  never the participant's own screenplay. "Has a draft in hand" is an
  eligibility question, not something they bring, upload, or describe.
- No compensation is promised anywhere in the current protocol. Don't add
  one when personalizing these templates.

None of these templates say "accurate," "objective," "trusted," "proven,"
"industry-standard," name a rule count, or explain how the tool scores
things — that wording is banned by the operating kit's neutral-invitation
rule, and it's an easy thing to slip back in while personalizing. If you
want to double check any addition, run `npm run honesty-audit` — it scans
`src/`, `public/`, and `server/` for exactly these overclaim patterns (this
file itself is outside its scanned paths, but the same bar applies).

---

## 1. Short DM/text (writer friends)

```
Hey {NAME} — I'm running some short research chats for a screenplay
analysis tool I've been building. 30 min, I show you a sample report and
just want your honest reaction, nothing to prep or bring. Any interest?
```

---

## 2. Email version

```
Subject: 30 min for a screenwriting tool research session?

Hi {NAME},

I'm running short research sessions for STORYMACHINE, a screenplay analysis
tool I've been building. It's a deterministic, keyless tool — no AI account
needed to use the parts I'd be showing you — that reads a script and
produces a structural coverage report, plus a Fountain script editor.

A session is 30 minutes over screen-share (or in person if that's easier).
I'll walk you through an existing sample report and just want your candid
reaction: what makes sense, what doesn't, what you'd actually use. You
won't need to share, upload, or describe anything of your own — I only
need to know you're currently working on a feature draft, which is the one
qualifying question.

This is early-stage and unpaid — there's no compensation, just my thanks
and an early look at the tool. If that sounds interesting, let me know a
few times that could work and I'll send a confirmation.

Thanks for considering it,
{YOUR_NAME}
```

---

## 3. Community-post version (Discord/subreddit/forum)

Leads with the research ask, not the product — matches typical
no-self-promo etiquette on screenwriting communities.

```
Looking for a few screenwriters to give honest feedback on a work-in-progress
tool (research session, not a pitch)

Hi all — I'm looking for screenwriters currently working on a feature draft
who'd be willing to spend 30 minutes giving candid feedback on something
I'm building. This is a research ask, not a product launch.

What it involves:
- 30 minutes on a video call (or in person if you're local)
- I show you an existing sample report from a screenplay analysis tool
  I've built and ask what you make of it — what's useful, what's
  confusing, whether you'd want to run your own script through something
  like this
- You don't share, upload, or describe your own script at any point —
  only the sample is shown
- No compensation, no pitch, no follow-up sales — just your honest read

Who I'm looking for: any experience level, any genre, as long as you have
a feature draft you're actively working on right now.

If you're up for it, reply here or DM me and I'll send a couple of time
options. Thanks for reading — happy to answer questions in the thread
before you decide.
```

---

## 4. Follow-up/reminder nudge

```
Hi {NAME} — following up on the 30-minute research session we talked
about. Still interested? Happy to work around your schedule if a different
day/time works better.
```

---

## 5. Session-confirmation message

```
Subject: Confirmed — {DATE}, {TIME} ({TIMEZONE})

Hi {NAME},

Confirming our session:
📅 {DATE}
⏰ {TIME} ({TIMEZONE})
📍 {LINK_OR_LOCATION} (screen-share, or in person — whichever we agreed on)

Logistics:
- 30 minutes total
- Nothing to prepare or bring. We'll be looking at an existing sample
  report, not your own script — please don't have it open, uploaded, or
  on screen during the call, even if you'd like to share it. Having a
  draft you're currently working on was just the one thing I asked about
  up front.
- I'll do most of the screen-sharing (or, if in person, we'll look at one
  screen together); you just react out loud as you go — there's no wrong
  answer.
- With your separate okay, I may record locally for my own notes; saying
  no to recording doesn't affect anything else about the session, and
  it's fine either way.

If something comes up, just let me know and we'll find another time — no
problem at all.

Talk soon,
{YOUR_NAME}
```

---

## 6. Thank-you + debrief request (post-session)

```
Subject: Thanks for the session today

Hi {NAME},

Thank you for the 30 minutes today — I appreciated your honest reactions,
especially around {SPECIFIC_MOMENT}.

If anything else comes to mind after sitting with it — something that felt
off, something you'd want to see, anything at all — I'd love to hear it.
Just reply here.

If you know other screenwriters currently working on a draft who might be
up for a similar 30-minute session, I'd appreciate an introduction — still
looking for a few more.

Thanks again,
{YOUR_NAME}
```
