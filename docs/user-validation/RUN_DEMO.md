# Running the live demo before a P0 session

> This is the "how to stand up the live sample flow" doc that
> `docs/filed-backlog/premature-p0-machinery/OUTREACH_DRAFTS.md` references.
> It exists so a moderator can run the operating kit's pre-session
> "confirm the sample loads correctly" check (P0_OPERATING_KIT.md →
> Pre-session checklist) without improvising.
>
> **Static-only sessions don't need this.** If you are showing only
> `docs/user-validation/sample-coverage-report.html` (regenerate with
> `npm run generate-p0-sample`), no server is required — open the HTML
> file directly. This doc is for the **live, interactive** flow:
> StartScreen → "Try sample coverage" → Script Doctor report.

## What the live flow shows (and why it matters)

The static report is the finished artifact. The live flow is what a writer
would actually *do* — paste/open a script, watch the report build, scroll it.
Some P0 reactions (trust in the process, perceived speed, the "is this my
draft?" moment) only surface in the live flow. The operating kit lets you
choose, but you must **record which exposure mode** each session used
(static report vs. live flow) in the session template.

## Prerequisites

- Node matching `>=22.13.0 || >=24` (the repo's only runtime requirement).
- This repo cloned locally, with `npm install` run once (restores
  `node_modules/.bin/` so `vite`/`tsx` resolve to the project's versions,
  not a stray home-dir install — see commit `0d27c47`'s build-fix note).
- **No `GEMINI_API_KEY` set.** The product's front door is keyless,
  analysis-only mode. Setting a key is not required for the sample flow and
  is not part of P0. If a key is set in your shell, unset it for the demo so
  the banner reads "NO AI KEY · ANALYSIS OK" exactly as a first-run writer
  would see.

## Stand up the server (keyless)

From the repo root:

```bash
npm run dev          # = tsx server.ts; boots keyless, serves frontend + API
```

You should see a boot log ending in a `listening` line on its port (the
default is whatever `server.ts` binds; check the log). The banner in the UI
must read **"NO AI KEY · ANALYSIS OK"** — that confirms the keyless posture.
If you instead see a 500 or an AI-key error, the boot failed; do not proceed
(see "If something breaks" below).

## The exact flow to verify (pre-session smoke)

Do this once, yourself, **before** the participant joins — it is the
operating kit's "confirm the sample loads correctly" check. The reusable
script below automates it; you can also click it by hand.

1. Open the server's URL in a clean browser tab (not your everyday browser
   with extensions/logins).
2. StartScreen renders. Click **"Try sample coverage"**.
3. ScriptIDE + the Script Doctor panel mount; the built-in sample
   ("The Second Key") auto-loads.
4. The report renders: a **CONSIDER** stamp, health ≈ **69**, 14 scenes,
   craft dimensions (Structure & Pacing, Character, Dialogue & Voice, Plot
   Logic & Payoff, Theme & Originality), issue counts, and "What's Working".
5. Open the browser console (DevTools). The only acceptable entries are
   dev-only HMR/WebSocket noise (Vite, port 24678) — **never** present in a
   production build — and the documented keyless **503 on
   `/api/analyze-script`** (the opt-in AI Director path, off by default; the
   client swallows it). **No genuine error** (red, stack trace, crash) should
   appear on the deterministic coverage path.

If all five hold, the live flow is certified for this session. Note the commit
SHA (`git rev-parse HEAD`) and the time in the session record.

## Automated smoke check (recommended over clicking by hand)

A throwaway Playwright harness was used to certify `1a7f3b4` (see
`PHASE_TRACKER.md` → "Browser DOM smoke"). To make this repeatable, run:

```bash
node scripts/smoke-p0-live-flow.mjs
```

It boots the server keyless on an isolated port, drives the exact flow above
with headless Chromium, and exits 0 only if the report renders with the
expected verdict/health and **zero genuine console errors**. Run it before
every live session; it takes a few seconds. (If Playwright's browser binaries
aren't cached, run `npx playwright install chromium` once.)

## If something breaks

- **Server won't boot:** most common cause is a stale/corrupted
  `node_modules` (empty `.bin/`). Re-run `npm install` and retry. Do not
  "fix" boot failures by editing engine code mid-P0 — the freeze holds;
  fall back to the **static report** exposure mode instead, which needs no
  server, and record exposure as "static report, not live flow."
- **Report doesn't render / blank panel:** refresh once; if it persists, use
  the static report and log the failure generically (no console dumps in Git).
- **Console shows a real error on the coverage path:** that's a regression —
  do not field a live session on it. Use the static report, and file the
  error outside Git for a post-P0 security/fix pass.

## What NOT to do during the demo

- Don't set `GEMINI_API_KEY` to "make it work better" — keyless is the
  honest first-run posture and the one P0 validates.
- Don't pre-load the participant's own script, even if they ask — the
  operating kit forbids it; redirect to "only the sample is shown."
- Don't narrate the engine, rule count, or how it scores before the
  participant reacts. Answer factual navigation questions minimally and
  log the intervention.
