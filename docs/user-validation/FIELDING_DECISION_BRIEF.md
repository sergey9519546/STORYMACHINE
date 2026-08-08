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
| Artifact size | `wc -c` | **212723 bytes** (byte-identical to committed; 212,708 after the 2026-08-03 1-based scene-label migration — see `P0_EVIDENCE_SUMMARY.md`) |

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

## Update — 2026-08-03: the caveat above is CLEARED, and the stimulus changed

Two things happened since this brief was written, both of which the decision
owner should know before deciding.

**1. The browser caveat is resolved.** The click-through is no longer a manual,
un-repeatable check: `scripts/smoke-p0-live-flow.mjs` now boots the server
keyless on an isolated port, drives StartScreen → "Try sample coverage" →
report, and exits non-zero on a wrong verdict/health or any genuine console
error. It PASSES on current `main`. Run it yourself before any live-flow
session — it is the pre-session checklist, automated. (Running it also
surfaced and fixed a real defect: the app shipped no favicon, so every browser
visit logged a 404.)

**2. The stimulus you would show writers has changed — for the better, and you
should know how.** Every writer-facing "Scene N" in the report used to
interpolate the engine's 0-based scene index raw, so *every* "here's the scene
to fix" pointer named the scene before the one it meant. The report contradicted
itself in print — it said "Scene 12 (INT. HOLLOWAY ESTATE - VAULT -
CONTINUOUS)" when that slug is the 13th scene. Of 19 slug-paired labels in the
shipped sample, 0 were correct. That is now fixed end to end (labels, the three
consumers that parse them back, the "What's Working" prose, the research
panels, room/proof/project exports), with a CI tripwire that fails the build if
a scene label ever again disagrees with the slug it names.

Verified facts on current `main` after the change:

| Check | Result |
|---|---|
| Health / verdict / scene count | 68.9 / CONSIDER / 14 — **unchanged** |
| contentHash | `33dcf214…` — **unchanged** (scoring untouched) |
| Artifact size | **212,708 bytes** (was 212,723 — label text only) |
| Determinism | consecutive generations differ only in the footer datestamp |
| Browser click-through | **PASS**, zero genuine console errors |
| Full suite / type check / honesty-audit | 10,013 tests 0 fail / clean / clean |

**Why this matters to the decision, not just to the changelog:** if you had
fielded before this fix, every participant who tried to follow a fix-pointer
into their own reading of the script would have landed on the wrong scene. That
is precisely the kind of defect that reads to a professional as "this tool does
not actually know my script" — and it would have contaminated the one signal P0
exists to measure. The stimulus is materially more trustworthy now than when
this brief was written.

**A limitation the decision owner should weigh, and it is not fixed:** the
sample script ("The Second Key") is thin — ~665 words across 14 scenes, about
**47.5 words per scene**, against a median of roughly **161–181 words per scene**
in the 761-script corpus. It reads as a competent skeleton, not a real draft.
That thinness is also load-bearing for some of the report's less flattering
numbers (159 minor issues over 14 scenes; Theme & Originality 98.8 on a 665-word
piece reads as false precision to an experienced reader — see
`docs/p1-benchmark/DETECTOR_DEFECTS_2026-08-03.md` D5). Fielding on a thin
stimulus is a legitimate choice — it isolates "does the *shape* of this output
create pull?" — but it is a choice, and it should be recorded as one in the
decision log rather than discovered mid-session when a writer says "this isn't
a real script."

## The state of the gate, honestly

Two different decisions live in this file, and conflating them is exactly
the trap that misled a fast reader — keep them separate.

| Decision | State | Dated | Where recorded |
|---|---|---|---|
| **Fielding authorization** (may recruiting/sessions begin?) | **GO** | 2026-08-04 | `PHASE_TRACKER.md` decision log; see "DECIDED — 2026-08-04: GO" below |
| **Outcome gate** (PASS / STOP / INCONCLUSIVE on the core question, per the pre-registered signal rule) | **Not yet evaluable — 0 of >=5 valid sessions documented** | — | `P0_EVIDENCE_SUMMARY.md` |

| Counter | Current | Required |
|---|---:|---|
| Valid, fully-documented sessions | **0** | **≥5** |
| Recruited / scheduled | 0 / 0 | progress only |

`P0_EVIDENCE_SUMMARY.md` records the constitutional guard correctly: *"Absence
of contrary evidence with zero sessions is not favorable evidence."* Zero
sessions at this point is expected, not a blocker — fielding was only just
authorized (above) and no session has been run yet. Nothing an agent does
changes the outcome-gate counter — only human recruitment + human sessions
do; the outcome gate cannot be evaluated before then, and no session has
been fabricated to make it appear otherwise.

## Now that GO is decided — exactly what happens next (and who does it)

This is the path the operating kit governs. I am listing it so the decision is
concrete, not so I can execute it — every step after the decision is human
work.

1. **You** record the GO + signal rule + decision-owner role in
   `PHASE_TRACKER.md`'s decision log. **Done** — recorded 2026-08-04; the
   log now carries two entries (the GO decision and the subsequent
   stimulus-swap decision). This step is complete; steps 2-7 below remain
   open (0 of >=5 sessions run as of this writing).
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

---

## DECIDED — 2026-08-04: GO

The decision this brief exists to enable has been made and recorded in
`PHASE_TRACKER.md`'s decision log, which is the authoritative entry (the
pre-registered signal rule lives there; this addendum is a pointer, not a
second copy).

Summary: **GO** — field P0, static-report sessions first, live-flow
permitted per the certifications above. Decision owner of record: Project
Maintainer (role). The recording was performed under the maintainer's
explicit 2026-08-04 blanket delegation of open decisions to the agent
session; what CANNOT be delegated remains exactly what §"What I will not
do" says — recruiting, running, and documenting sessions are human work,
and zero sessions have been fabricated. The gate's counters still read
0 of >= 5 valid sessions; GO changes what is *authorized*, not what is
*evidenced*.

---

## RESOLVED — 2026-08-04: the thinness limitation (§"A limitation the
decision owner should weigh") is fixed by a stimulus upgrade

The limitation recorded above — "the sample script ('The Second Key') is
thin — ~665 words across 14 scenes, about 47.5 words per scene, against a
median of roughly 161–181 words per scene in the 761-script corpus" — is now
**RESOLVED**, not merely re-weighed. Performed under the same 2026-08-04
blanket delegation as the GO decision above (owner-delegated, not a new
human decision — this is stimulus-quality remediation of an already-decided
GO, not a re-opening of the field/no-field question).

**What changed:** `src/lib/sample-script.ts`'s built-in sample was swapped
from "The Second Key" to `data/screenplays/dead-frequency.fountain`
("Dead Frequency"), one of the 20 tracked CC0 original screenplays in the
STORYMACHINE benchmark corpus (`data/screenplays/LICENSE-live-action.md`).
It now plays a dual role: P1 discrimination-corpus member AND P0 stimulus —
nothing was removed from the corpus. The retired stimulus's fountain text is
preserved verbatim at
`docs/user-validation/ARCHIVED_SAMPLE_THE_SECOND_KEY.md` per the standing
keep-as-reference rule.

**Candidate comparison (all 20 tracked `data/screenplays/*.fountain`
scripts, measured via `runScriptDoctor` on HEAD `0cf12c9` — the same HEAD
`isDoubleSpaced()` normalizer rekey that shifted six scripts' health):**

| File | Scenes | Words | Words/scene | Health | Verdict |
|---|---:|---:|---:|---:|---|
| `runoff.fountain` | 9 | 1449 | 161.0 | 74.5 | CONSIDER |
| **`dead-frequency.fountain`** | **12** | **1831** | **152.6** | **78.3** | **CONSIDER** |
| `counter-offer.fountain` | 10 | 1522 | 152.2 | 76.0 | CONSIDER |
| `off-season.fountain` | 9 | 756 | 84.0 | 71.6 | CONSIDER |
| `the-key-under-the-mat.fountain` | 11 | 903 | 82.1 | 72.9 | CONSIDER |
| `soft-launch.fountain` | 12 | 972 | 81.0 | 76.3 | CONSIDER |
| `the-defense-rests.fountain` | 12 | 963 | 80.3 | 76.1 | CONSIDER |
| ...11 more scripts... | 9–14 | 434–1011 | 43.4–77.8 | 27.3–77.4 | CONSIDER/PASS |
| `transfer-window.fountain` | 10 | 459 | 45.9 | 38.4 | PASS |
| `room-12.fountain` | 10 | 434 | 43.4 | 27.3 | PASS |

**Why `dead-frequency.fountain` won:** it is the closest-to-band
words/scene (152.6, against the 161–181 real-corpus median) among every
candidate that also clears the >=12-scene preference — the one candidate
closer in density (`runoff.fountain`, 161.0 words/scene) has only 9 scenes.
It is independently documented in the corpus's own manifest
(`LICENSE-live-action.md`) as "strong"-band craft-calibration material with
a genuinely mixed profile ("Clue paid off late; revelation past midpoint;
clock honored in both halves; escalating danger into climax; full
relationship arc"), and its measured report is mid-band CONSIDER — not
suspiciously perfect, not a wall of red.

**Old vs new stimulus facts:**

| | Old ("The Second Key") | New ("Dead Frequency") |
|---|---|---|
| Words / scenes | 665 / 14 | 1831 / 12 |
| Words per scene | **~47.5** | **~152.6** |
| Health | 68.9 | **78.3** |
| Verdict | CONSIDER | CONSIDER (unchanged) |
| contentHash | `33dcf21462118381ae1941b79240ffd441b0469f5f12dc997110c9bf9186004f` | `a1b44eff859da29988dbd81354056b2574655302d63180022e679a7c942cf3ca` |
| `sample-coverage-report.html` size | 212,708 bytes | **193,132 bytes at the 2026-08-04 swap** |

The score/content figures remain current; the generated HTML was most recently
regenerated on 2026-08-08 through `npm run generate-p0-sample` at **207,740
bytes** (contentHash unchanged). See the 2026-08-08 provenance repair in
`P0_EVIDENCE_SUMMARY.md` for the current artifact record.
**Zero P0 sessions had been run against the retired stimulus** (the gate
counter is still 0 of >=5), so this swap loses no session comparability.
