# P0 activation plan — begin the whole roadmap without violating phase gates

## Objective

Activate P0 as the only current product phase. Build a complete operating kit for the five writer-validation sessions you will conduct, plus a status-only phase tracker and a P1 current-state inventory. Do **not** modify product code, scoring, UI, tests, instrumentation, or P1–P4 implementation.

`ROADMAP.md` remains canonical. These artifacts operationalize it; they do not create another planning hierarchy.

## Files to create

Create a shallow directory: `docs/user-validation/`.

### 1. `docs/user-validation/P0_OPERATING_KIT.md`

One self-contained field manual containing:

- P0 purpose, exact core question, exit gate, and the distinction between demand validation and score validation.
- Scope prohibition: use the existing sample and report unchanged; no score tuning, detector changes, UI/report redesign, benchmark construction, labeling, instrumentation, or downstream work.
- Participant eligibility: real screenwriter, any career tier, real draft in hand; repository team members do not count toward the five external sessions.
- A neutral recruitment message you can send to writers you provide.
- Operational consent/privacy checklist:
  - notes permission;
  - separate recording permission;
  - anonymized quote permission;
  - withdrawal rights;
  - no screenplay text or PII committed;
  - local-only contact/recording handling and deletion date.
- Pre-session setup checklist: record commit SHA/environment/browser, smoke-check the existing `Try sample coverage` path, begin at StartScreen, use no participant draft.
- Fixed moderator script:
  1. welcome and consent;
  2. “Please look at this as you naturally would”;
  3. start at StartScreen;
  4. participant opens the built-in sample coverage;
  5. minimal think-aloud prompts only;
  6. no explanation of rules, NVM, intended meaning, or desired answer;
  7. free report exploration;
  8. exact core question: “Does this make you want to run your own draft—why or why not?”;
  9. follow-ups on actionability, disbelief, required evidence, intended next action, private-draft use, payment, and privacy;
  10. debrief and quote permission.
- Observation checklist using existing UI names: StartScreen/CTA, verdict and grade, summary, Root Causes, Craft Dimensions, What’s Working, Scene Heatmap, Top Priorities, Per-Pass Breakdown, export/share interest.
- Neutrality rules: do not rescue confusion, pitch, count politeness as pull, change the stimulus during the first tranche, or mix observation with interpretation.
- Signal classifications:
  - positive;
  - qualified positive;
  - negative;
  - ambiguous.
- Stop/decision rules and a completion checklist.

### 2. `docs/user-validation/P0_SESSION_TEMPLATE.md`

A copyable template for `sessions/P0-S01.md` through `P0-S05.md`, containing:

- Anonymous metadata, date, moderator, duration, commit SHA, environment, consent/recording status, and validity status.
- Participant context without PII: career tier, experience, completed draft types, current draft in hand, previous coverage experience, tools, technical comfort.
- Exposure controls and moderator deviations.
- Timestamped observation table separating:
  - observed action;
  - verbatim statement;
  - researcher interpretation;
  - trust/disbelief/confusion/action marker.
- Per-report-section reaction prompts.
- Exact core-question response.
- Follow-up answers.
- Separate “what they did” and “what they said” lists.
- Session classification, confidence, rationale, and uncertainty.
- Representative trust, disbelief, and pull/no-pull quotes with permissions.
- Privacy/redaction and completeness checks.

Do not create participant files containing names, contact details, screenplay titles, excerpts, or recording links. Those remain outside git.

### 3. `docs/user-validation/P0_EVIDENCE_SUMMARY.md`

The single P0 evidence artifact, initially marked `PLANNED` or `FIELDING`, containing:

- Study status, valid-session count, dates, and stimulus commit.
- Exact core question and gate.
- Anonymous participant-coverage table linking session files.
- Session-level signal table.
- Cross-session findings separated into behavior, stated value, trust requirements, evidence demands, privacy, actionability, own-draft intent, and payment.
- Representative favorable and contrary quotations.
- Contradictions, courtesy-bias risks, failures, interventions, and outliers.
- Explicit limitations: small purposive sample, recruitment bias, sample-to-own-script gap, moderation, novelty, no score-validity or retention inference.
- Exactly one eventual decision: `PASS`, `STOP`, or `INCONCLUSIVE`, with owner/date/rationale/evidence/dissent.
- Inputs permitted to P1 only after a PASS.
- Artifact index.

### 4. `docs/user-validation/PHASE_TRACKER.md`

Status-only operational tracker—not a second roadmap:

- P0 `ACTIVE`.
- P1 `BLOCKED BY P0`.
- P2 `BLOCKED BY P0 AND P1`.
- P3 `BLOCKED BY P0–P2`.
- P4 `BLOCKED BY P0–P3`.
- Entry condition, required evidence, evidence link, allowed work, and blocked work for each phase.
- P0 counters: recruited, scheduled, completed, valid, documented, consent, positive/qualified/negative/ambiguous.
- Allowed now: recruitment, scheduling, consent, existing sample sessions, documentation/synthesis, existing smoke checks, inventory-only P1 mapping, critical security fixes.
- Explicitly blocked: formula/rule/detector work, calibration, benchmark construction, human scoring labels, UI/report redesign, Labs gating, sharing features, instrumentation, retention, auth expansion, and engine refactoring.
- Decision log and last-reviewed metadata.

### 5. `docs/user-validation/P1_BASELINE_INVENTORY.md`

Prominent header: **Inventory only; P1 has not started and this authorizes no experiment or implementation.**

Inventory existing assets by source and status:

- Produced/reference corpus and rights/runnability limits.
- Synthetic calibration samples and discrimination pairs.
- Degradation twins and real-corpus manifest.
- Current metrics and caveats, cited rather than re-derived.
- Existing scoring contracts, runner, human-label rubric/importer, and known-failing witnesses.
- Existing human-label readiness versus missing actual labels/readers/agreement.
- Missing P1 prerequisites:
  - P0 PASS;
  - legally distributable real drafts;
  - explicit licenses;
  - pre-registered split/metrics/gates;
  - held-out isolation;
  - >=3 independent experienced readers;
  - artifact hashes/versioning;
  - agreement analysis;
  - runnable CI corpus;
  - leakage controls.
- Frozen prohibitions: no synthetic bad-script substitute, held-out tuning, forced consensus, restricted screenplay text in git, rule wave, or global fixture-moving curve tweak.
- Record baseline discrepancies by source/date without running new experiments.
- P1 entry checklist, all unchecked.

### 6. `docs/user-validation/sessions/.gitkeep`

Create the session directory without fabricating sessions. The template will explain how you copy it to `P0-S01.md` etc. after each real session.

## Existing files to update minimally

### `ROADMAP.md`

In P0 only, add one concise link to `docs/user-validation/P0_EVIDENCE_SUMMARY.md` and the phase tracker. Do not duplicate study content or change gates.

### `ULTRAPLAN.md`

Add links to the operating kit and tracker beneath the active P0 status. Keep its status as “no completed sessions documented” until real evidence exists.

Do not modify `NORTH_STAR.md` or `CLAUDE.md` unless verification finds a broken link or direct contradiction introduced by these links.

## Pre-session smoke verification

Using the existing application without code changes:

1. Run the current keyless app.
2. Start at StartScreen.
3. select `Try sample coverage`.
4. Confirm the existing sample enters Script Doctor.
5. Confirm a report renders.
6. Confirm expected report sections appear where populated.
7. Record the exact commit SHA used as the intended study stimulus.
8. If the flow fails, document the failure first. Do not broaden into redesign; only propose a separately approved narrow blocker fix.

Use existing tests/build commands only as verification. No test edits.

## Privacy and validity controls

- Commit only anonymous IDs and redacted observations.
- Keep names, emails, scheduling details, recordings, and screenplay content outside git.
- Do not request participants upload their own drafts during P0.
- Do not use P0 participants as P1 scoring labelers during these sessions.
- Do not change the sample/report during the initial five-session tranche.
- A session missing eligibility, the full sample observation, the exact core question, verbatim evidence, or consent/privacy review does not count toward the five.
- Five completed sessions do not automatically PASS P0; negative or ambiguous aggregate evidence means STOP/repeat.

## Verification after implementation

- Confirm all new tracked content is documentation-only under `docs/user-validation/`, plus minimal roadmap links.
- Search new files for accidental PII/draft content placeholders that encourage committing private data.
- Confirm phase tracker blocks P1–P4.
- Confirm baseline inventory contains no new measurements, proposed weights, or authorization language.
- Confirm `ROADMAP.md` remains canonical and no duplicate doctrine was created.
- Run `git diff --check` and Markdown/link-oriented inspection.
- Run the existing sample-flow smoke check keyless.
- Report any smoke failure honestly; do not silently repair or proceed downstream.

## After the kit is delivered

You provide the writers and conduct sessions using the kit. After each session, you can provide anonymized notes or add a redacted session record. I can then help normalize evidence, check completeness, and synthesize it without changing classifications to favor the product. P1 remains blocked until the signed P0 summary says PASS.