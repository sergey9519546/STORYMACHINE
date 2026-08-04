# First Session Quickstart — from a willing screenwriter to documented `P0-001`

A ~30-minute path, written as a **map, not a fork**: every step cites the
kit file that actually governs it. `P0_OPERATING_KIT.md` is authoritative;
if anything here conflicts with it, `ROADMAP.md`, or `ULTRAPLAN.md`, those
win. This assumes you already have a willing, screened participant (see
`OUTREACH_COPY_2026-08-04.md` §5 for screening) and a confirmed time.

The P0 gate is GO (`PHASE_TRACKER.md` decision log; `FIELDING_DECISION_BRIEF.md`
"DECIDED — 2026-08-04: GO") and 0 of >=5 sessions are documented. This is the
first one.

---

## Before the session (do this once, ahead of time)

### 1. Pick your exposure mode and verify it loads

Two supported modes — record which one you use (`P0_OPERATING_KIT.md` →
"Exposure controls": "device/session mode... starting point").

- **Static report only** (no server, fastest to set up): open
  `docs/user-validation/sample-coverage-report.html` directly in a browser.
  Regenerate first if you have any doubt it's current:
  ```
  npm run generate-p0-sample
  ```
  See `P0_QUICK_START.md` for current provenance (verdict/health/scene count
  — "Dead Frequency," swapped 2026-08-04).

- **Live flow** (StartScreen -> "Try sample coverage" -> report): follow
  `RUN_DEMO.md` in full. Its pre-session smoke check is mandatory before a
  live-flow session — either run it by hand (`RUN_DEMO.md` → "The exact flow
  to verify") or automated:
  ```
  PW_CHROMIUM_PATH=<path-to-chromium> node scripts/smoke-p0-live-flow.mjs
  ```
  Omit `PW_CHROMIUM_PATH` if Playwright's own bundled Chromium is installed
  (`npx playwright install chromium`). Exit 0 = certified for this session;
  exit 1 = fall back to the static report (`RUN_DEMO.md` → "If something
  breaks") and record exposure as "static report, not live flow."

Either mode satisfies `P0_OPERATING_KIT.md`'s pre-session checklist item
"Confirm the sample and the existing flow load correctly" — the live-flow
smoke script is what makes that check repeatable rather than ad hoc
(`RUN_DEMO.md`'s own stated purpose).

### 2. Prepare the session record

- Copy `P0_SESSION_TEMPLATE.md` to a **scratch location outside Git** for
  live note-taking during the session (`P0_OPERATING_KIT.md` → "Pre-session
  checklist": "create a fresh copy of `P0_SESSION_TEMPLATE.md` outside Git
  for live notes if necessary"). Do not create or edit anything under
  `docs/user-validation/sessions/` yet — see step 7 below for why the
  timing matters here.
- Assign the anonymous participant ID `P0-001` (`P0_OPERATING_KIT.md` →
  "Recruitment" → "Contact handling": "The recruiter assigns an ID such as
  `P0-001`; research records use only that ID").
- Decide and write down, before the session, which optional report sections
  you'll expose (`P0_OPERATING_KIT.md` → "Pre-session checklist": "Decide
  which optional sections will be exposed. Record exposure; do not silently
  vary it").

### 3. Rehearse and set up the room

Run through `P0_OPERATING_KIT.md`'s full checklist once: disable automated
transcription/meeting-summary tools, close unrelated windows/notifications,
have a visible clock ready, and rehearse the neutral opening, task prompt,
exact core question, and follow-ups (`P0_OPERATING_KIT.md` → "Pre-session
checklist," items 5–7).

---

## During the session (the kit's session protocol, mapped)

Everything below is `P0_OPERATING_KIT.md` → "Session protocol," in order.
Read that section in full before your first live session — this is a
pointer to each step, not a substitute for it.

| Step | What happens | Kit section |
|---|---|---|
| 1. Neutral opening | Read the opening substantially verbatim; confirm consent (all 9 items in "Consent and privacy" must be affirmative before you proceed); start the elapsed-time clock | "1. Opening"; "Consent and privacy" |
| 2. Exposure | Show only the existing sample flow/report; record device/mode, starting point, sections shown, and any moderator intervention. Do not explain the engine, rule count, NVM, intended answer, or score validity before the participant reacts | "2. Exposure controls" |
| 3. Observe before interviewing | Let the participant explore; log Observation / Quote / Interpretation as three separate fields in the timestamp table, never merging them | "3. Observe before interviewing" |
| 4. Per-section reactions | For every section actually exposed, ask "What, if anything, did you take from **[exact section name]**?" using the product's current names (Verdict, plain-language summary, Root Causes, Craft Dimensions, What's Working, Scene Heatmap, Top Priorities, Per-Pass Breakdown). Mark unexposed sections "Not exposed," never "No reaction" | "4. Per-report-section reactions" |
| 5. Exact core question | Ask, without prefacing or softening: **"does this make you want to run your own draft — why or why not?"** Record the verbatim answer before probing further, then ask the four canonical follow-ups | "5. Ask the exact core question" |
| 6. Close | Ask if anything important was missed; remind them not to send their draft; explain withdrawal via their anonymous ID; thank them. Promise nothing about features, timelines, or score accuracy | "6. Close" |

Stop immediately, per `P0_OPERATING_KIT.md` → "Stop and escalation rules,"
if the participant withdraws, discloses PII or screenplay content, asks you
to evaluate their writing, or a technical failure blocks meaningful
exposure.

---

## After the session — from raw notes to `P0-001`

This is `P0_OPERATING_KIT.md` → "Post-session handling and quality review,"
in order:

1. **Redact and verify privacy** — replace any accidental identifier with
   broad non-identifying context (or remove it), and confirm no PII,
   contacts, recordings, screenplay titles/text, or unique creative details
   remain anywhere in the notes.
2. **Preserve exact quotes** — don't polish grammar or merge separate
   statements; keep Observation, Quote, and Interpretation in their own
   fields with timestamps.
3. **Complete the record** — every exposed section has a reaction entry,
   unexposed sections say "Not exposed," the exact core question's verbatim
   first response is captured, all follow-ups are answered (or a reason is
   documented for any skipped), and "Did" vs. "Said" are recorded
   separately.
4. **Classify** — pick one of Positive / Qualified / Negative / Ambiguous /
   Invalid-excluded (`P0_OPERATING_KIT.md` → "Evidence classification"),
   cite the evidence, and note any conditions attached to a Qualified
   classification separately from a plain Positive.
5. **Privacy review** — a reviewer who is, where possible, not the
   moderator (`P0_OPERATING_KIT.md` → "Roles and separation") walks every
   box in the session template's §12 checklist. If any box fails, **do not
   commit** — fix or exclude first.
6. **Completeness review** — walk the template's §13 checklist. Only a
   session that passes every applicable item counts toward the >=5-session
   P0 exit gate (`P0_OPERATING_KIT.md` → "P0 goal and exit gate").
7. **File the record** — only after privacy review passes, copy the
   completed, redacted template to
   `docs/user-validation/sessions/P0-001.md`.

### Commit rules — read this before running `git add`

- **Contacts, scheduling details, and any name/handle stay outside Git,
  always** (`P0_OPERATING_KIT.md` → "Contact handling" and "Repository
  privacy rule"). Only the anonymous ID (`P0-001`) goes in the committed
  record.
- **Never build or store a participant-ID-to-identity crosswalk anywhere in
  the repository** — the session template's own privacy-review checklist
  (§12) requires confirming this explicitly before commit.
- **`docs/user-validation/sessions/` is currently listed in `.gitignore`**
  (repo root `.gitignore`, line 15: `docs/user-validation/sessions/`) —
  everything under that path is excluded from Git by default right now,
  the same way `.claude/` and `data/` are (per `CLAUDE.md`: "nothing placed
  there is shared via git unless `.gitignore` changes first"). `P0_EVIDENCE_SUMMARY.md`
  and `PHASE_TRACKER.md` both already describe this directory as "empty;
  `.gitkeep` only" — as of this writing there is no `.gitkeep`, and no
  session file will actually reach `git status` as stageable until that
  `.gitignore` entry is deliberately narrowed (e.g., to allow tracked
  `.md` files while still excluding any accidental raw export). **That
  `.gitignore` change is outside this document's lane — a maintainer with
  the authority to edit `.gitignore` must make and review that change
  before `P0-001.md`'s privacy-reviewed record can actually be committed.**
  Do not work around this by force-adding (`git add -f`) without that
  review — the ignore entry may exist precisely to catch an accidental raw
  export landing in the same directory.
- Only commit the **anonymized, privacy-reviewed** record or an aggregate
  artifact — never raw notes, and never before the §12 privacy-review
  checklist passes (`P0_OPERATING_KIT.md` → "Post-session handling," item 8).

### Roll it up

Once `P0-001.md` is filed, add its classification to the aggregate counters
described in `PHASE_TRACKER.md` and `P0_EVIDENCE_SUMMARY.md` (both are
orchestrator/decision-owner-owned documents — update them through that
channel, not by editing them directly from this lane). Repeat this
quickstart for `P0-002` through at least `P0-005` before the exit gate in
`P0_OPERATING_KIT.md` → "P0 goal and exit gate" can be evaluated.
