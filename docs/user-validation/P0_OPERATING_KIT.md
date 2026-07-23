# P0 User Validation Operating Kit

## Authority and scope

This kit operationalizes P0 only. `ROADMAP.md` §3, "P0 — Validate with real writers," is the canonical plan; `ULTRAPLAN.md` §1 is its short execution brief. If this kit conflicts with either, `ROADMAP.md` wins. This document does not create product doctrine, revise an exit gate, or authorize P1.

P0 asks whether a real screenwriter, after seeing the existing sample coverage report, wants to run their own draft. It does not test whether the score is correct, establish score validity, collect screenplay material, or label writing as strong or weak. Never describe a P0 response, participant, session, or artifact as a P1 label, P1 benchmark label, ground truth, calibration label, or discrimination evidence.

## P0 goal and exit gate

- Recruit at least 5 real screenwriters, from any career tier, who have real drafts in hand.
- Show the existing sample flow and coverage report without pitching or teaching the intended answer.
- Document exact language, observed behavior, trust, disbelief, objections, and desired next actions.
- Produce a clear signal on the exact core question across at least 5 documented sessions.

A completed interview is not automatically a usable documented session. It must satisfy the completeness check in the session template.

Exit decisions remain those in the canonical plan:

- Positive or qualified signal: P0 may clear; objections and trust requirements become inputs to later work.
- Negative or ambiguous signal: STOP, reframe, and repeat P0. Do not proceed by adding features, rules, or score claims.

## Roles and separation

One person may perform multiple roles, but identify each role in the anonymous record.

- **Recruiter:** screens for eligibility, sends consent/privacy information, and assigns the anonymous participant ID.
- **Moderator:** runs the session neutrally and asks the exact core question.
- **Observer/notetaker:** timestamps behavior and quotes without turning interpretations into observations.
- **Evidence reviewer:** checks privacy, completeness, and classification after the session. When possible, this should not be the moderator.
- **Decision owner:** aggregates completed sessions against the P0 exit gate; does not relabel P0 evidence as P1 evidence.

## Recruitment

### Eligibility

Recruit people who:

- identify as screenwriters;
- have at least one real draft in hand now, without providing or showing it;
- can view the existing sample flow and coverage report;
- can give informed, voluntary consent.

Any career tier is acceptable. Seek variation in experience, recent writing activity, prior use of coverage/readers, genre or format, and comfort with software so the sample is not composed only of close peers or highly technical users. These are contextual dimensions, not quotas unless the canonical plan is amended.

Exclude anyone who:

- cannot consent or is below the applicable age of consent;
- is being pressured by an employer, teacher, investor, or personal relationship;
- helped design the current report closely enough that they cannot encounter it as a user;
- must disclose confidential screenplay material to participate;
- expects P0 to evaluate their screenplay or provide professional coverage.

### Neutral invitation

Use language like:

> We are conducting a short research session with screenwriters about an existing sample screenplay coverage flow. We want your candid reaction, including criticism. You will view only our sample; please do not send, upload, name, quote, display, or describe your own screenplay. This is research, not an evaluation of you or your writing. Participation is voluntary, and you may skip any question or stop at any time.

Do not recruit with claims such as "objective," "accurate," "trusted," "industry-grade," "private," or "proven." Do not mention the intended answer, rule count, engine internals, NVM, or P1 metrics. Compensation, if offered, must be stated before consent and must not depend on favorable feedback or completion after withdrawal.

### Contact handling

Keep scheduling contacts outside the repository in an access-controlled system. The recruiter assigns an ID such as `P0-001`; research records use only that ID. Never place names, email addresses, phone numbers, handles, calendar links containing identities, employer/school details that identify a person, or other direct identifiers in Git, issues, pull requests, commit messages, filenames, screenshots, or session records.

## Consent and privacy

Obtain affirmative consent before showing the sample. Read or send the following in plain language and record yes/no for each item in the anonymous session template:

1. The purpose is to learn their reaction to the existing sample flow and coverage report.
2. Participation is voluntary; they may skip a question or stop at any time without penalty.
3. The session is not an assessment of them or their writing.
4. Researchers will take anonymous written notes, including verbatim quotes, with identifying details removed.
5. They must not share their screenplay title, text, logline, character names, unique plot details, files, screen, or other confidential creative material.
6. Notes permission is required. Audio/video/screen recording requires a **separate, optional affirmative consent**; declining recording does not prevent participation.
7. Any permitted recording stays local and access-controlled, is never committed or linked from Git, and has a stated deletion date. Automated transcription and AI meeting summaries remain off.
8. Anonymous notes may be committed to the repository and reviewed by project contributors.
9. Withdrawal procedure and deadline: before the anonymous record is aggregated, the participant can contact the recruiter outside Git using the scheduling channel and cite their participant ID; the recruiter will remove the record.

If required participation/notes consent is "no" or unclear, do not start. If recording consent is "no," proceed without recording. Consent to participate is never consent to collect screenplay material or identifying information.

### Repository privacy rule

Do not commit or paste into any repository surface:

- personally identifiable information (PII) or combinations that reasonably re-identify someone;
- names, contacts, social handles, or scheduling details;
- audio, video, screen recordings, automated transcripts, or recording links;
- screenplay titles, screenplay text, excerpts, loglines, character names, unique plot details, filenames, screenshots, or drafts;
- raw exports or metadata that contain any of the above.

Paraphrase identifying context at a broad level, redact identifiers inside quotes with neutral brackets such as `[prior service]`, and omit a quote if redaction would change its meaning. Store no crosswalk from participant IDs to identities in the repository.

## Pre-session checklist

Before every session:

- Confirm eligibility without requesting the participant's screenplay or its title.
- Assign an anonymous participant ID and create a fresh copy of `P0_SESSION_TEMPLATE.md` outside Git for live notes if necessary.
- Confirm the sample and the existing flow load correctly.
- Use the current product section names exactly when noting exposure: **Verdict**, **plain-language summary**, **Root Causes**, **Craft Dimensions**, **What’s Working**, **Scene Heatmap**, **Top Priorities**, and **Per-Pass Breakdown**. Do not rename sections for the participant.
- Disable automated transcription, meeting summaries, AI note-taking, and unapproved cloud capture. Record only after separate affirmative consent; keep any permitted recording local, access-controlled, and outside Git.
- Close unrelated windows, notifications, participant lists, and account details before screenshots or screen sharing. Do not commit screenshots.
- Prepare a visible clock for elapsed timestamps.
- Decide which optional sections will be exposed. Record exposure; do not silently vary it.
- Rehearse the neutral opening, task prompt, exact core question, follow-ups, and stop rules.
- Confirm the participant knows not to open, upload, paste, name, summarize, or screen-share their draft.

## Session protocol

### 1. Opening

Read substantially verbatim:

> Thank you for helping. We are testing the report, not you. I did not create a correct path for you to discover, and candid criticism is useful. Please think aloud when you can. I may stay quiet so I do not influence you. You may skip anything or stop at any time. Please do not share any title, text, file, image, logline, character name, or specific plot detail from your own work.

Confirm consent and start the elapsed-time clock.

### 2. Exposure controls

Show the existing sample flow and coverage report only. Record:

- device/session mode;
- sample identifier or version that contains no screenplay title or text;
- starting point;
- sections available and actually viewed;
- whether the moderator scrolled, navigated, explained, or answered a question;
- any interruption or technical failure.

Do not explain the engine, rule count, NVM, intended answer, score validity, P1 plans, or why a section should matter before the participant reacts. Do not claim privacy or accuracy beyond what the displayed product itself establishes. If asked a factual navigation question, answer minimally and record the intervention. If asked whether the score is accurate or proven, say that this session is about their reaction to the existing sample and that score validity is not being established here.

### 3. Observe before interviewing

Use the timestamp table in the template. Keep three evidence types separate:

- **Observation:** directly visible or audible behavior, without inferred motive.
- **Quote:** the participant's exact words, redacted only for privacy.
- **Interpretation:** the researcher's tentative meaning, explicitly marked and tied to evidence.

Good observation: "02:14 — paused on Craft Dimensions for 18 seconds, then scrolled back to Verdict."

Not an observation: "02:14 — distrusted the score." Record distrust only as a quote, explicit answer, or interpretation.

Do not rescue silence, praise desired reactions, debate objections, complete the participant's sentence, or teach report vocabulary. Ask neutral probes such as "What are you looking for?" or "What, if anything, are you thinking there?" only when needed, and record each probe.

### 4. Per-report-section reactions

After free exploration, ask about each section actually exposed, using its exact name:

- "What, if anything, did you take from **Verdict**?"
- "What, if anything, did you take from the **plain-language summary**?"
- "What, if anything, did you take from **Root Causes**?"
- "What, if anything, did you take from **Craft Dimensions**?"
- "What, if anything, did you take from **What’s Working**?"
- "What, if anything, did you take from **Scene Heatmap**?"
- "What, if anything, did you take from **Top Priorities**?"
- "What, if anything, did you take from **Per-Pass Breakdown**?"

For every exposed section, capture understood meaning, useful/actionable reaction, trust or evidence need, disbelief/confusion, and likely next action. Mark unexposed sections "Not exposed," never "No reaction."

### 5. Ask the exact core question

Ask exactly, without prefacing or softening:

> does this make you want to run your own draft — why or why not?

Record the answer verbatim before probing. Do not substitute "would you use it?", "did you like it?", or a willingness-to-pay question.

Then ask the canonical follow-ups neutrally:

1. "What part, if any, felt useful enough to act on?"
2. "What did you distrust or need evidence for?"
3. "What would you do next with this report?"
4. "Would you run a private draft now? Would you pay? Why?"

Permitted clarification probes include "What makes you say that?", "What would need to change?", and "Can you tell me more without describing your screenplay?" Do not convert hypothetical intent into observed behavior.

### 6. Close

Ask whether anything important was missed, remind the participant not to send their draft, explain withdrawal using the anonymous ID, and thank them. Do not promise features, timelines, score accuracy, or P0 clearance.

## Moderator guardrails

The moderator must:

- use neutral tone and accept positive, negative, and mixed reactions equally;
- avoid introducing product vocabulary before the participant encounters it;
- distinguish spontaneous behavior from behavior following a prompt;
- record interventions and deviations;
- redirect any attempt to disclose screenplay content immediately;
- avoid asking demographic details unless needed to interpret the session and safe to store broadly;
- never diagnose the participant, judge their writing, or provide coverage.

Potentially leading: "Would the Scene Heatmap help you fix pacing?"

Neutral: "What, if anything, would you do with Scene Heatmap?"

## Evidence classification

Classify each completed session only after notes are cleaned and privacy-reviewed. Classification summarizes the participant's answer; it is not a P1 label.

- **Positive:** clearly wants to run their own draft now, with no stated prerequisite that changes the core proposition.
- **Qualified:** wants to run it if a specific trust, privacy, usability, evidence, or price condition is met.
- **Negative:** clearly does not want to run their own draft, or sees no useful job for the report.
- **Ambiguous:** answer is contradictory, too hypothetical, too influenced by moderation, incomplete, or otherwise cannot support a direction.
- **Invalid/excluded:** eligibility, consent, privacy, exposure, technical, or protocol failure makes the session unusable. State the reason; do not replace or reinterpret the evidence silently.

Also code evidence tags where supported: `trust`, `disbelief`, `objection`, `useful`, `actionable`, `confusion`, `privacy`, `price`, `next-action`, and `moderator-influence`. Every tag must point to an observation or quote. Count qualified separately from positive in the evidence artifact so conditions are visible.

## Did versus said

Maintain two independent fields:

- **Did:** directly observed actions during the sample session, including navigation, pauses, returns, abandonment, requests, and whether they attempted a next step. Do not report an action that was unavailable as a failure to act.
- **Said:** claims, intentions, preferences, and predictions, including willingness to run or pay.

Never rewrite "I would upload tonight" as "uploaded," or a long pause as distrust. Contradictions are evidence: preserve both and explain the mismatch as interpretation, not fact.

## Stop and escalation rules

Stop the session immediately if:

- the participant withdraws or appears unable to continue voluntarily;
- required consent is absent or revoked;
- PII, contacts, a screenplay title, screenplay text, an excerpt, a draft, or uniquely identifying creative material is shown or shared;
- recording or transcription is active and cannot be disabled;
- the moderator is asked to evaluate the participant's screenplay;
- distress, coercion, harassment, or a safety concern arises;
- a technical failure prevents meaningful exposure to the report.

On stop: end exposure, do not copy the sensitive content, delete accidental local capture where permitted, record only a generic stop reason under the anonymous ID, and exclude the session if evidence integrity is compromised. Escalate privacy or safety incidents outside Git to the designated project owner. Never describe the sensitive content in an issue or commit.

Stop the P0 program and return to the decision owner if:

- fewer than 5 complete, valid sessions are available;
- the aggregate signal is negative or ambiguous;
- protocol drift or moderator influence prevents a clear answer;
- privacy controls cannot be maintained;
- anyone proposes using P0 reactions as P1 benchmark, calibration, quality, or discrimination labels.

In these cases, follow `ROADMAP.md`: STOP, reframe, and repeat P0. Do not proceed to P1 or compensate with product/engine work.

## Post-session handling and quality review

Immediately after each session:

1. Replace accidental identifiers with broad, non-identifying context or remove the affected content.
2. Verify no PII, contacts, recordings, screenplay titles/text, or unique creative details remain.
3. Preserve exact quotes where safe; do not polish grammar or merge separate statements.
4. Separate observation, quote, and interpretation; add timestamps and evidence references.
5. Complete each exposed section's reaction and mark unexposed sections accurately.
6. Complete the exact core question, all follow-ups, did-vs-said comparison, classification, rationale, and completeness checklist.
7. Have the evidence reviewer check classification against cited evidence and note disagreements rather than forcing consensus.
8. Commit only the anonymous, reviewed record or aggregate artifact authorized by the project owner. Keep contact lists and raw notes outside Git and delete them according to the stated retention practice.

## Aggregate decision discipline

The aggregate artifact should report counts for Positive, Qualified, Negative, Ambiguous, and Invalid/excluded; recurring objections and trust requirements; contrary cases; and the evidence behind any conclusion. Do not average sentiment, hide conditions, convert willingness to pay into willingness to run, or treat five sessions as statistical proof.

The decision owner applies the exit gate in `ROADMAP.md` and `ULTRAPLAN.md`; this kit does not define a new numerical threshold for "clear signal." When complete, link the evidence artifact from the P0 section of `ROADMAP.md` as directed by `ULTRAPLAN.md`; do not create a competing doctrine hierarchy.
