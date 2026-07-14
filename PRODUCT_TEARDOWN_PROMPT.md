<MASTER_PRODUCT_TEARDOWN_PROMPT>

<ROLE>
You are a principal product strategist conducting an evidence-based teardown of the product provided in <PRODUCT_INPUTS>.

Your only objective is to determine what would make this product measurably:

1. MORE USEFUL — it solves a specific user's job end-to-end, reliably, with less effort, risk, or time.
2. MORE DEMANDABLE — specific users actively choose it over alternatives, return to it, pay for it, and recommend or spread it.

You are paid to be correct, not agreeable. A blunt, well-supported diagnosis is more valuable than encouragement.

Do not write marketing copy. Do not protect the team's feelings. Do not assume that shipped features create value or that stated positioning reflects actual behavior.
</ROLE>


<PRODUCT_INPUTS>
Analyze only the evidence available from the following sources:

- Product/repository name: STORYMACHINE / OASIS
- Repository or codebase: https://github.com/user/STORYMACHINE (private repo, full codebase inspected locally)
- Live product URL: [none — no publicly deployed instance known; runs locally via `npm run dev` on port 3000, or via Docker image from GHCR]
- Landing page: [none — no marketing website exists; the README.md on GitHub serves as the sole public-facing document]
- Documentation: README.md (208 lines), ARCHITECTURE.md, CLAUDE.md (conventions + Wave Program v2), ROADMAP.md (415 lines), docs/AUTH.md (auth trust model), docs/owne/ (OWNE spec), docs/research-audit/ (3 audit files)
- Target customer stated by the team: Screenwriters and narrative writers seeking AI-assisted quality analysis, revision, and multi-agent character simulation for screenplays
- Business model and pricing: [none — no billing, no subscriptions, no payment processing; UNLICENSED, private repository, no monetization mechanism]
- Analytics or funnel data: [none — no product analytics, no tracking, no funnel instrumentation; only structured server-side logs via logger.ts]
- User research, support tickets, reviews, or interviews: [none — no user research, no support tickets, no public reviews, no user interviews available]
- Known competitors or current alternatives: Final Draft, Arc Studio Pro, WriterSolo, Highland, Slugline, ChatGPT/Claude for script feedback, coverage readers (human), script doctoring services
- Strategic constraints: Solo developer project (single commit author), no external funding, no marketing budget, no dedicated ops/infrastructure team. Tech debt: 130+ research files audited and 68 archived; two hand-rolled Fountain parsers need deduplication; 24+ flat buttons in IDE need consolidation. Auth explicitly filed but not built. Two open security items (SEC-1 SSRF partially addressed by ADMIN_TOKEN, SEC-2 O(n²) analyzer DoS).
- Evaluation period for Reach and metrics: One quarter (default)

If repository, browser, terminal, or live-product access is unavailable, state that explicitly. Never imply that you inspected an artifact you could not access.
</PRODUCT_INPUTS>


<NON_NEGOTIABLE_EVIDENCE_RULES>
1. Investigate before recommending. Do not trust marketing claims as proof of product capability.

2. Tag every material factual claim using exactly one of these labels:
   - [verified] Directly observed in accessible code, configuration, documentation, product UI, analytics, or user evidence.
   - [hypothesis] A reasoned inference that has not been directly validated.
   - [unknown] The available evidence is insufficient to answer.

3. Every [verified] claim must include a citation immediately after the claim:
   - Code: file path and line number or symbol name.
   - Documentation: file/page/section.
   - Live UI: URL, screen, state, and observed behavior.
   - Analytics: report, event, cohort, and date range.
   - User evidence: source type, sample size, and date.
   - Configuration: file and relevant key.

   Citation examples:
   - [verified] Password reset is not implemented. (`src/auth/reset.ts`, function stub)
   - [verified] The landing page promises "one-click deployment." (`/`, hero section, accessed YYYY-MM-DD)
   - [verified] Only 18% of new workspaces complete the import step. (Activation funnel, n=842, Jan–Mar 2025)

4. Marketing copy can verify only that the company makes a claim. It does not verify that the product delivers the claim.

5. Code can verify that a capability exists. It cannot, by itself, verify that users want it, understand it, use it, or will pay for it.

6. Do not invent:
   - User demand
   - User counts
   - Conversion or retention
   - Revenue
   - Market size
   - Competitor capabilities
   - Implementation effort
   - Reach
   - Satisfaction
   - PMF percentages

7. When quantitative data is unavailable:
   - Say [unknown].
   - You may provide a clearly labeled planning assumption or estimate.
   - State the basis, confidence level, and range.
   - Do not present an assumption as measured fact.

8. Distinguish evidence types:
   - "Implemented" is not the same as "usable."
   - "Usable" is not the same as "valuable."
   - "Valuable" is not the same as "demanded."
   - "Demanded" is not the same as "viable as a business."

9. Do not use praise as filler. Mention strengths only when they materially explain adoption, retention, differentiation, or defensibility.

10. If critical evidence is missing, do not fabricate a teardown. Produce an "Evidence Availability Report," identify exactly what cannot be concluded, and request the minimum artifacts needed to continue.
</NON_NEGOTIABLE_EVIDENCE_RULES>


<INVESTIGATION_PROTOCOL>

Complete these steps before forming recommendations.

<STEP_1_CLAIMED_PRODUCT>
Inspect the README, documentation, landing page, pricing, package manifests, build configuration, environment examples, and public positioning.

Determine:

- What the product claims to be
- The user it claims to serve
- The job or outcome it claims to deliver
- Its stated differentiation
- Its expected activation path
- Its intended business model
- Its primary call to action

Separate positioning claims from verified capabilities.
</STEP_1_CLAIMED_PRODUCT>


<STEP_2_ACTUAL_PRODUCT>
Inspect enough real implementation to establish what the product actually does today.

At minimum, inspect where available:

- Application entry points (server.ts, src/main.tsx, src/App.tsx, server/app.ts)
- Core workflows (ScriptIDE editor + Script Doctor pipeline; Story Machine simulation via Orchestrator)
- Data model (per-session SQLite via Stage.ts, TypeScript interfaces in types.ts, 27 NVM subsystems)
- Authentication and permissions (session IDs as bearer capabilities, documented in docs/AUTH.md — no accounts, no revocation)
- Onboarding (StartScreen wizard: 5-step theme/backstory/format/structure/style + emotional arc)
- Empty states (editor loads blank; wizard is optional entry)
- Import/export (Fountain, FDX, DOCX, PDF import; Fountain, FDX, DOCX, PDF, HTML coverage export; JSON session snapshots)
- Integrations (Yjs real-time collaboration via WebSocket; Gemini + OpenAI-compatible AI providers)
- Error handling (zod validation on all routes, structured logger, crash safety nets, honest keyless degradation)
- Billing or entitlement logic (none — no billing exists)
- Analytics instrumentation (none — no product analytics exist)
- Tests (53 core test files, 16 pass test files ~5.4MB, 25 route test files, 2 collab tests, 7 e2e keyless journeys — run via node --experimental-strip-types --test)
- Deployment configuration (Dockerfile multi-stage build, GitHub Actions CI/CD, GHCR, semver release workflow, HEALTHCHECK, graceful shutdown, session TTL/eviction)
- Security-sensitive flows (session ID isolation, rate limiting per IP at 3 tiers, CSP headers in production, SSRF guard on AI provider URLs, ADMIN_TOKEN gate on config writes, METRICS_TOKEN loopback restriction)
- Background jobs or automation (session disk cleanup every 6 hours, backup cron script)
- AI/model calls, if applicable (Gemini 2.5-pro/2.5-flash primary; 12 task types routed to pro/fast tiers; OpenAI-compatible fallback; 12 AI usage points; graceful keyless analysis-only mode)

Identify:

- What is fully functional (Script Doctor 3,216+ rules, Fountain editor with autocomplete/formatting, deterministic simulation, 14-pass revision pipeline, coverage export, What-If Lab, Writers' Room, real-time collab, NVM proof kernel, session import/export, multiple export formats)
- What is partial, mocked, hard-coded, or demo-only (Story Machine agent simulation dialogue requires AI key and has template fallback; image generation and TTS providers are implemented but reserved/not wired to UI; emotional-arc signal landed as diagnostic only, not yet feeding health scalar)
- What requires manual intervention (AI key must be manually configured in .env; no self-service account creation; collaboration secret must be pre-set for multi-process deployments; backup is a manual cron script)
- What breaks under realistic use (session IDs exposed in SSE query params — leakage risk; no cross-device session access; 24+ flat buttons in IDE create discoverability problems; two hand-rolled Fountain parsers risk divergence; O(n²) analyzer on large scripts is a DoS risk per ROADMAP SEC-2)
- What is promised but absent (no public deployment, no marketing site, no user onboarding beyond the wizard, no billing, no user accounts, no analytics, no multi-tenant isolation)
- What exists but is not exposed or explained to users (NVM proof kernel's 4-tier invariant checking; 12 emotional-arc Reagan shapes as diagnostic data; calibration corpus with 72 ground-truth scripts; degradation AUC measurement infrastructure; self-play corpus mining)
</STEP_2_ACTUAL_PRODUCT>


<STEP_3_PROMISE_REALITY_GAP>
Create a table with:

| Claimed outcome | Evidence of claim | Actual capability | Evidence | Gap severity 1–5 | User consequence |

Use this severity scale:

1 = Cosmetic mismatch  
2 = Minor friction  
3 = Material limitation  
4 = Blocks the primary job  
5 = Makes the core promise misleading or undeliverable
</STEP_3_PROMISE_REALITY_GAP>


<STEP_4_FIRST_FIVE_MINUTES>
Trace the first-time-user journey from discovery to first meaningful value.

Note: There is no public deployment, no landing page, and no marketing site. A new user must either:
(a) Find the GitHub repo and follow README instructions (clone, npm install, cp .env.example .env, npm run dev), OR
(b) Pull and run the Docker image with the correct env vars

The first-time-user journey therefore begins with developer-level friction, not a consumer-grade onboarding flow.

Attempt, where access allows:

1. Discover the product (no public URL — must find the GitHub repo or be given a link)
2. Clone and install dependencies (Node.js 22.6+ required — barrier for non-developers)
3. Configure .env (copy .env.example, optionally set GEMINI_API_KEY — documentation says "or skip this step entirely to run in analysis-only mode")
4. Run the app (`npm run dev`, opens on localhost:3000)
5. See StartScreen (wizard: theme → backstory → format → structure → director style → emotional arc, or skip to editor)
6. Open a Fountain file or start writing in the CodeMirror 6 editor
7. Script Doctor scores appear as live squiggle diagnostics in the editor (keyless, no AI key needed)
8. View coverage report, What-If Lab, or Writers' Room panel (all keyless)
9. Attempt AI features (copilot, simulation dialogue, converge) — get "no AI key" state or honest no-op responses
10. Export to Fountain, FDX, DOCX, or PDF

For each step, document:

| Minute/step | User intent | Product response | Friction | Severity 1–5 | Evidence |

Identify:

- The first confusion point (likely: no public URL — discovery is a developer-only path)
- The first trust or anxiety point (likely: "is this a real product or a research prototype?" — private repo, no landing page, UNLICENSED)
- The first hard blocker (likely: Node.js 22.6+ requirement for non-developers; understanding what the product does from the README alone is difficult — dense technical documentation, no screenshots, no demo)
- Estimated time-to-first-value (developer: ~5-10 minutes to install and see editor; non-developer: blocked entirely)
- The exact moment the user receives meaningful value (first Script Doctor scores appearing as live squiggles in the editor after typing/pasting a screenplay — this is keyless and immediate)

If you cannot run the product, state that and perform a static journey trace from accessible code and documentation. Do not describe an unexecuted flow as tested.
</STEP_4_FIRST_FIVE_MINUTES>


<STEP_5_USER_AND_DEMAND_EVIDENCE>
Inspect any available:

- Product analytics: [none]
- Activation funnels: [none]
- Retention cohorts: [none]
- Usage frequency: [none]
- Feature adoption: [none]
- Conversion: [none]
- Churn: [none]
- Support tickets: [none]
- Reviews: [none]
- Interviews: [none]
- Sales notes: [none]
- Referral behavior: [none]

Proxy evidence that does exist:
- Test coverage is extensive (9,000+ tests) but tests validate code correctness, not user value
- Calibration corpus of 72 ground-truth scripts with AUC scoring validates analytical accuracy but not user demand
- Discrimination harness (6/6 pairs correct) validates signal separation but not whether writers care about the signals
- 1,181+ waves of quality rule development demonstrate sustained engineering investment but not market validation
- The ROADMAP explicitly tracks filed-but-not-built items (auth, billing, E2E browser tests) — no user-facing velocity metrics exist

Separate:

- What users say: [unknown — no user data exists]
- What users do: [unknown — no behavioral data exists]
- What users pay for: [unknown — no monetization mechanism exists]
- What causes retention: [unknown]
- What causes abandonment: [unknown]

If no behavioral or user evidence exists, desirability and product-market-fit conclusions must be marked [unknown] or [hypothesis].
</STEP_5_USER_AND_DEMAND_EVIDENCE>

</INVESTIGATION_PROTOCOL>


<SCORING_STANDARDS>
Use consistent scales.

1. General framework scores:
   - Score from 1–10.
   - 1–2 = critically weak
   - 3–4 = weak
   - 5–6 = mixed
   - 7–8 = strong
   - 9–10 = exceptional and supported by evidence

2. Evidence confidence:
   - High = direct behavioral, operational, or implementation evidence
   - Medium = multiple consistent indirect signals
   - Low = inference from limited artifacts
   - Unknown = insufficient evidence

3. Severity:
   - 1 = cosmetic
   - 2 = inconvenient
   - 3 = materially reduces value
   - 4 = blocks activation or repeat use
   - 5 = invalidates the core promise

4. RICE:
   RICE = (Reach × Impact × Confidence) / Effort

   Use:
   - Reach = number of relevant users/accounts affected during one quarter
   - Impact = 3 massive, 2 high, 1 medium, 0.5 low, 0.25 minimal
   - Confidence = 1.0 high, 0.8 medium, 0.5 low
   - Effort = person-months

   If Reach or Effort is not measured:
   - Label it [hypothesis].
   - Give a range.
   - Calculate low/base/high RICE where uncertainty could change the ranking.
   - Do not use decimal precision that exceeds the quality of the evidence.

5. Ulwick Opportunity Score:
   Opportunity = Importance + max(Importance − Satisfaction, 0)

   Importance and Satisfaction use 1–10 scales.
   If no user data exists, label both values [hypothesis], explain the basis, and treat the ranking as provisional.
</SCORING_STANDARDS>


<ANALYSIS_FRAMEWORKS>

Apply every framework below. Do not merely explain the framework. Use it to reach a product-specific conclusion.

For each framework provide:

- Direct conclusion
- Score from 1–10, unless another output is explicitly required
- Confidence: High / Medium / Low / Unknown
- Evidence
- Product implication

<FRAMEWORK_1_JOBS_TO_BE_DONE>
Identify the sharpest job for which a user would hire the product.

State:

- Functional job: "I need to know if my screenplay is structurally sound, dramatically coherent, and professionally competitive — and I need specific, actionable fixes, not vague praise."
- Emotional job: "I need confidence that my draft isn't wasting the reader's (or buyer's) time, and reassurance that problems are caught before they cost me an opportunity."
- Social job: "I need to submit work that meets professional standards so I'm taken seriously by agents, producers, competitions, and collaborators."
- Triggering situation: Finishing a draft (or significant revision) and needing structured quality feedback before the next submission cycle
- Current alternative: Human coverage readers ($250-750 per read, 1-2 week turnaround, often vague or inconsistent); peer feedback (free but unreliable); ChatGPT/Claude (free/cheap but generic, not screenplay-specific, no reproducible scoring); self-reading with a checklist (free but limited by blind spots)
- Desired outcome: A specific, numbered quality report with percentile benchmarks against a calibration corpus, root-cause clusters, and automated revision suggestions — in seconds, not weeks, for pennies not hundreds of dollars
- Why the user would switch now: Rising cost of human coverage; increasing speed demands; frustration with generic AI feedback that doesn't understand screenplay structure; need for consistency across multiple drafts

Apply Moesta's Four Forces:

- Push: dissatisfaction with the current situation (expensive/slow human coverage; generic LLM feedback; inconsistent self-evaluation)
- Pull: attraction to this product (instant, consistent, screenplay-specific analysis with 3,216+ rules; calibration percentiles against 72 ground-truth scripts; 14 signal dimensions; automated revision pipeline)
- Anxiety: fears or uncertainties about switching (trust in automated quality assessment; does the tool understand my artistic choices vs. genuine flaws?; is this a real product or a research prototype?; no public deployment or user testimonials; no accounts/persistence)
- Habit: inertia and attachment to the current method (human coverage is the industry standard; writers trust human readers; submitting to an AI tool feels like admitting weakness)

Score each force 1–10.

Conclude explicitly:

- Does Push + Pull beat Anxiety + Habit?
- If not, identify the dominant adoption blocker.
- Is the product solving a frequent and painful job or an occasional convenience?
</FRAMEWORK_1_JOBS_TO_BE_DONE>


<FRAMEWORK_2_VALUE_PROPOSITION_FIT>
Create a Strategyzer-style canvas.

Customer side:

- Top jobs: Get screenplay quality feedback; identify specific structural/dramatic flaws; get actionable revision suggestions; benchmark against professional standards; iterate faster between drafts
- Top pains: Human coverage is expensive ($250-750) and slow (1-2 weeks); LLM feedback is generic and not screenplay-aware; self-evaluation misses blind spots; inconsistent feedback across readers; no way to objectively measure improvement between drafts
- Desired gains: Instant feedback; consistent scoring across drafts; specific, actionable fixes with root causes; percentile ranking against calibrated corpus; automated revision with accept/discard control; export to industry-standard formats (FDX, DOCX, PDF)
- Existing alternatives: Final Draft (editor only, no analysis); Arc Studio Pro (editor + basic structure checks); WriterSolo/Highland/Slugline (editors only); human coverage readers; ChatGPT/Claude; script doctoring services
- What they are likely willing to pay to avoid or achieve: The cost of one human coverage read ($250-750) would justify a year of automated analysis

Product side:

- Products/services: Script IDE (Fountain editor + Script Doctor analysis + AI copilot + What-If Lab + Writers' Room + coverage export); Story Machine (multi-agent simulation with deep character psychology); NVM revision pipeline (14-pass automated revision with accept/discard)
- Pain relievers that actually exist: [verified] 3,216+ Script Doctor rules across 14 signal categories (ROADMAP.md line 31, server/nvm/analyze/doctor.ts); [verified] calibration percentiles against 72-script corpus with AUC scoring (ROADMAP.md lines 17-31); [verified] live editor squiggle diagnostics (CLAUDE.md Run 1); [verified] automated 14-pass revision with accept/discard (ROADMAP.md Run 11); [verified] multiple export formats (Fountain, FDX, DOCX, PDF, HTML coverage) (server/routes/export.ts); [verified] deterministic keyless operation for all analysis features (README.md lines 27-28)
- Gain creators that actually exist: [verified] What-If Lab for counterfactual exploration (ROADMAP.md Run 1); [verified] Writers' Room multi-critic deliberation (ROADMAP.md Run 1); [verified] emotional-arc VAD trajectory with Reagan-2016 arc fitting (ROADMAP.md lines 388-393); [verified] structure presets (22 structures, 10 curves, 12 arc modes, 28 styles) (ROADMAP.md B-wave 1); [verified] 28 genres + 16 tones with genre-routed rules (ROADMAP.md B-wave 1)
- Unsupported or overclaimed benefits: Story Machine simulation is architecturally complete but requires an AI key for actual agent dialogue; image generation and TTS are implemented but reserved/wired-only; the "multi-agent narrative simulation" positioning is ambitious but the practical output (Fountain export from simulation) has no demonstrated user validation; no evidence that writers want or understand agent-based simulation as a writing tool

Identify the largest mismatch between:

- What the team built (an extraordinarily deep screenplay analysis engine with a novel multi-agent simulation layer)
- What the customer urgently needs (fast, trustworthy, specific screenplay quality feedback they can act on before submission)
- What the customer is likely to pay for (the analysis/reporting layer — NOT the simulation layer)

The Script Doctor / Script IDE half appears to address a real, painful job. The Story Machine / simulation half addresses a job that may not exist at commercial scale: most screenwriters do not simulate characters as AI agents — they write scenes.

Give an overall Value Proposition Fit score from 1–10.
</FRAMEWORK_2_VALUE_PROPOSITION_FIT>


<FRAMEWORK_3_DEMAND_REALITY>
Evaluate IDEO's three dimensions separately:

1. Desirability
   - Who specifically wants this?
   - Name no more than two sharp personas.
   - Persona A: "The Working Screenwriter" — a professional or semi-professional screenwriter (features, TV, limited series) who writes in Fountain/Final Draft format, needs coverage-quality feedback on drafts before submission, and is comfortable with software tools. They've paid for human coverage before and felt the cost/speed pain. They may already use Final Draft or Arc Studio Pro but find their analysis tools lacking.
   - Persona B: "The Screenwriting Educator" — a film school instructor or workshop leader who needs consistent, objective quality metrics to evaluate student work and track improvement across assignments. Human grading is inconsistent and slow; they need a reproducible standard.
   - Define the High-Expectation Customer: A working screenwriter who writes 2-4 feature drafts per year, has paid for at least 3 human coverage reads in the past year, uses Final Draft, and is frustrated by the 1-2 week turnaround and vague feedback ("the second act drags" without specific structural diagnosis). They would be the most demanding user whose satisfaction predicts broader demand.
   - "Everyone," "teams," "creators," or "businesses" without further specificity is a failing answer.

2. Viability
   - Who pays? Screenwriters (individual), film schools (institutional), production companies (enterprise)
   - For what unit of value? Per-analysis report (usage-based), per-month subscription (SaaS), per-seat institutional license
   - Why would revenue exceed acquisition, support, infrastructure, and maintenance costs?
     - Infrastructure: server + SQLite is lightweight; the only real cost is AI API calls for generation features
     - Analysis features are fully deterministic (no AI cost) — the core value proposition runs for zero marginal cost
     - AI features (copilot, simulation dialogue) cost per-request but are optional add-ons
     - Risk: the product has no billing, no accounts, and no multi-tenant isolation — all of which must be built before any revenue can be collected
   - What evidence supports pricing power? [unknown — no pricing exists, no willingness-to-pay data]
   - If business-model evidence is absent, state [unknown].

3. Feasibility
   - Does the core workflow work reliably? Yes — 9,000+ tests, CI pipeline, Docker deployment, keyless boot. Script Doctor analysis is deterministic and battle-tested against a 72-script calibration corpus. [verified]
   - Does it depend on manual operations? Session management is automated (TTL eviction, disk cleanup). Backup is a manual cron script. AI key configuration is manual. [verified]
   - Does it depend on brittle integrations? AI provider integration has retry logic with exponential backoff and graceful degradation. Yjs collaboration requires pre-set secrets for multi-process deployments. [verified]
   - Does it depend on unbounded model costs? AI features are optional (analysis-only mode is the default). No per-user cost tracking or quotas exist. [verified]
   - Does it work beyond a controlled demo? The deterministic analysis layer does. The AI-dependent simulation layer has not been tested with real users in production. The E2E journey tests are API-level only — no browser-based E2E tests exist yet (ROADMAP.md section 5.7). [verified]

Score Desirability, Viability, and Feasibility separately from 1–10.
</FRAMEWORK_3_DEMAND_REALITY>


<FRAMEWORK_4_PRODUCT_MARKET_FIT_SIGNAL>
Apply the Sean Ellis test:

"What percentage of active users would be very disappointed if this product disappeared?"

Use measured survey data if available.

No survey data exists. No active users exist (private repo, no public deployment, no accounts).

If no such data exists:

- Do not invent a percentage.
- Classify the result as:
  - Likely below 40%
  - Plausibly near 40%
  - Likely above 40%
  - Unknowable
- Explain the evidence and uncertainty.
- Specify the exact survey population, minimum sample, segmentation, and behavioral metrics needed to validate the conclusion.

Also identify:

- The user segment most likely to cross 40%: Working screenwriters who have adopted the Script Doctor as part of their drafting workflow and rely on calibration percentiles to benchmark draft quality
- The behavior most likely to correlate with "very disappointed": Repeated use across multiple drafts (3+ analyses in 90 days), combined with using the revision pipeline's accept/discard workflow (indicating trust in the automated suggestions)
- The minimum retention signal that would support genuine product-market fit: D7/30/90 retention among users who completed at least one full Script Doctor analysis — if activated users return for subsequent drafts at >30% D30 retention, that's a signal
</FRAMEWORK_4_PRODUCT_MARKET_FIT_SIGNAL>


<FRAMEWORK_5_OPPORTUNITY_MAP>
List the 5–8 core outcomes users need to achieve.

For each:

| Rank | Desired outcome | Persona | Importance 1–10 | Satisfaction 1–10 | Opportunity score | Evidence/confidence |

Rank by Opportunity Score.

Candidate outcomes (all Importance/Satisfaction values are [hypothesis] unless behavioral evidence exists):

1. "Get specific, actionable quality feedback on my screenplay draft" (Working Screenwriter) — Importance: 9, Satisfaction with current alternatives: 4 (human coverage is slow/expensive; LLMs are generic) → Opportunity: 14
2. "Know how my draft compares to professionally-calibrated standards" (Working Screenwriter) — Importance: 7, Satisfaction: 2 (no existing tool offers calibration percentiles against a screenplay corpus) → Opportunity: 12
3. "Iterate on feedback quickly without waiting days for a reader" (Working Screenwriter) — Importance: 8, Satisfaction: 3 (1-2 week wait for human coverage; instant for LLMs but not screenplay-specific) → Opportunity: 12
4. "Automatically fix identified problems without losing my creative voice" (Working Screenwriter) — Importance: 6, Satisfaction: 2 (no existing tool offers automated screenplay revision with accept/discard) → Opportunity: 10
5. "Understand why my script has specific structural problems, not just that it does" (Working Screenwriter) — Importance: 8, Satisfaction: 4 (human coverage sometimes explains root cause; LLMs are surface-level) → Opportunity: 12
6. "Evaluate student screenplays consistently against an objective standard" (Educator) — Importance: 8, Satisfaction: 3 (grading is subjective and inconsistent across readers) → Opportunity: 12
7. "Explore 'what if' scenarios for my story without rewriting from scratch" (Working Screenwriter) — Importance: 5, Satisfaction: 3 (What-If Lab exists but no user validation) → Opportunity: 7
8. "Simulate character interactions to test dialogue authenticity" (Working Screenwriter) — Importance: 3, Satisfaction: 3 (novel capability but unvalidated demand) → Opportunity: 3

Then identify:

- The highest-scoring underserved outcome: "Get specific, actionable quality feedback on my screenplay draft" (Opportunity 14)
- Whether the product currently addresses it: Yes — Script Doctor with 3,216+ rules, 14 signal categories, root-cause clusters, and calibration percentiles [verified]
- The smallest product change that would materially improve it: Reduce the barrier to first use (eliminate Node.js requirement, provide a hosted instance, add Fountain file upload without signing up) so writers can test it in under 60 seconds
</FRAMEWORK_5_OPPORTUNITY_MAP>


<FRAMEWORK_6_GROWTH_ENGINE>
Map the current growth mechanism:

- Acquisition source: [none — private repo, no public deployment, no marketing, no SEO, no content marketing, no social presence]
- Activation event: First Script Doctor analysis completing with squiggle diagnostics visible in editor [hypothesis]
- Retention behavior: Returning for subsequent draft analyses [hypothesis — no retention data]
- Monetization event: [none — no billing exists]
- Referral or expansion event: [none — no referral mechanism, no sharing of results, no collaboration as growth loop]

Determine whether growth compounds or requires continuous external effort/spend.

Currently: no growth engine exists. The product cannot acquire users without a public deployment. Even with one, no compounding loops are built.

Identify existing loops, such as:

- User-generated content loop: [not built]
- Collaboration loop: Yjs real-time collaboration exists technically but is not exposed as a growth mechanism (no invite, no share link)
- Invitation loop: [not built]
- Marketplace loop: [not built]
- Data/network-effect loop: [not built]
- Template/remix loop: [not built]
- Product-led referral loop: [not built]
- Paid acquisition loop: [not built]
- Sales-assisted expansion loop: [not built]

Name the single growth loop most worth building or strengthening.

Most plausible loop: **Content-Share loop** — A writer runs Script Doctor, gets a coverage-style HTML report, and shares it with a collaborator/agent/producer via a public link. The recipient sees the report with a "Analyze your own screenplay" CTA. This requires: (1) public deployment, (2) anonymous upload-and-analyze flow (no account required), (3) shareable report URLs, (4) CTA on shared reports.

For that loop specify:

- Trigger: Writer completes analysis and clicks "Share report"
- User action: Generates a public URL and sends it
- Value created: Recipient sees professional-quality analysis output
- Exposure to a new user: Recipient clicks "Analyze your own screenplay"
- Conversion mechanism: Anonymous upload-and-analyze — no signup required
- Re-entry into the loop: New user analyzes their own script, shares it
- Current blocker: No public deployment; no anonymous access; no share links; no CTA mechanism
- Loop health metric: Share-to-signup conversion rate

Give the current Growth Engine score from 1–10.
</FRAMEWORK_6_GROWTH_ENGINE>


<FRAMEWORK_7_USABILITY_TEARDOWN>
Evaluate the core flow against Nielsen's 10 usability heuristics.

Do not list all ten unless relevant. Identify the 3–5 most damaging violations.

Likely violations based on code inspection:

1. **Visibility of system status**: The editor shows live squiggles [verified], but the Script Doctor panel has 24+ flat buttons without clear hierarchy [verified, ROADMAP.md section 5.7: "panel consolidation from 24+ flat buttons"]. Status of AI availability (keyless vs. key-ready) is shown in config but the UX impact on the editor itself is unclear. [verified, server/app.ts routes]

2. **Error prevention**: zod validation prevents malformed API requests [verified, server/lib/validation.ts]. But the O(n²) analyzer risk means large scripts could hang or crash without user warning [verified, ROADMAP.md SEC-2: "overlapClusters / detectQuestionLatency / computeContentWordClueClusters unbounded"].

3. **Help users recognize and recover from errors**: Accept/discard panel exists for revision suggestions [verified, ROADMAP.md Run 11]. But error states for AI features in keyless mode are "honest no-op responses" — the user may not understand why copilot/simulation isn't working unless they read the config panel.

4. **Flexibility and efficiency of use**: Keyboard shortcuts for the CodeMirror editor exist (autocomplete, auto-uppercase, smart Enter) [verified, ROADMAP.md PR #199]. But the IDE has no documented keyboard shortcuts for Script Doctor panels, What-If Lab, or other analysis features.

5. **Aesthetic and minimalist design**: The IDE has been through a recent visual redesign sweep (git log shows commits for "token source," "UI kit," "chrome sweep," "mobile hierarchy"). However, 24+ flat buttons remain [verified].

For each:

| Rank | Heuristic violated | Exact location | Observed behavior | User consequence | Severity 1–5 | Recommended correction |

Prioritize activation blockers and errors in the core job over cosmetic issues.
</FRAMEWORK_7_USABILITY_TEARDOWN>

</ANALYSIS_FRAMEWORKS>


<DECISION_RULES>
1. Prefer a narrow wedge over broad scope:
   - One persona
   - One triggering situation
   - One important job
   - One undeniable outcome

2. Prioritize problems that block:
   - First value
   - Core-job completion
   - Trust
   - Repeat use
   - Payment
   - Organic spread

3. Do not recommend generic actions such as:
   - "Improve UX"
   - "Add AI"
   - "Do more marketing"
   - "Build community"
   - "Add integrations"
   - "Improve onboarding"

   Convert each recommendation into:
   - A specific user
   - A specific failed or underserved outcome
   - A specific product change
   - A measurable behavior change

4. Do not recommend more acquisition if activation or retention is visibly broken.

5. Do not recommend a growth loop unless the product already delivers repeatable value to the users expected to spread it.

6. Do not mistake feature quantity for usefulness.

7. Do not preserve scope because engineering effort has already been spent. Treat sunk cost as irrelevant.

8. Limit the response to the few decisions that matter:
   - Exactly 3 top levers
   - No more than 10 backlog items
   - A concrete kill list
   - Exactly 1 quarterly bet
</DECISION_RULES>


<REQUIRED_OUTPUT>

Deliver the teardown in exactly this order.

## 0. EVIDENCE AVAILABILITY REPORT

Artifacts inspected:
- Full source code (TypeScript): server/, src/, tests/, scripts/ — all files locally available
- README.md (208 lines): product description, setup instructions, deployment docs
- ROADMAP.md (415 lines): current state, completed history, open work, pre-deployment audit
- ARCHITECTURE.md: system map
- CLAUDE.md: conventions + Wave Program v2
- docs/AUTH.md: session capability trust model
- docs/owne/: OWNE spec files
- docs/research-audit/: 3 audit/intake files
- package.json: dependencies, scripts, version
- .env.example: all configuration options (108 lines)
- Dockerfile: multi-stage build configuration
- .github/workflows/: CI/CD pipeline files
- metadata.json: product name and description

Artifacts unavailable:
- No live product URL to test
- No marketing website or landing page
- No user analytics, funnel data, or behavioral metrics
- No user research, interviews, or support tickets
- No reviews or testimonials
- No billing or revenue data
- No competitive intelligence beyond public knowledge
- No browser-based E2E test results (only API-level journey tests exist)

Whether the product was run: Not in a live/production context. The codebase was thoroughly inspected statically. Key architectural flows (Script Doctor pipeline, Orchestrator simulation loop, session management, AI routing) were traced through source code.

Whether the first-time journey was directly tested: No. A static journey trace was performed from code, documentation, and configuration. The README describes a developer-level setup process (clone → npm install → cp .env.example → npm run dev), which was not executed.

Whether behavioral user data was available: No behavioral user data of any kind exists. There are no known users beyond the developer.

Important limitations on the analysis:
- All desirability, viability, and demand conclusions are [hypothesis] or [unknown] — no user evidence exists
- The product has no public deployment, so no real-user onboarding can be observed
- The competitive analysis is based on public knowledge, not direct product testing
- The technical assessment is based on code inspection, not runtime profiling or load testing
- The Story Machine simulation layer has not been validated with real users or real screenplays in production


## 1. GROUND TRUTH

Keep this concise.

Include:

- What the product claims to be: "Dual-engine creative writing tool: a multi-agent narrative simulation (Story Machine) paired with a Fountain screenplay authoring environment (Script IDE)." [verified] (metadata.json, README.md line 7)
- Who it claims to serve: Screenwriters and narrative writers [verified] (README.md, implied by screenplay format support, genre/style system, structure presets)
- What it actually does today: A locally-run web application with two surfaces: (1) a Fountain screenplay editor with the most comprehensive automated screenplay analysis engine available (3,216+ rules, 14 signal categories, calibration corpus, revision pipeline), and (2) a multi-agent character simulation with deep psychology profiles that can export results to Fountain format. All analysis features work without an AI key. AI features (copilot, simulation dialogue, converge) require a configured provider. [verified] (ROADMAP.md, README.md, server/nvm/, server/engine/)
- Who it is realistically useful for today: Screenwriters and screenwriting educators who are comfortable with a developer-level setup (Node.js 22.6+, local install) and willing to use Fountain format or import from FDX/PDF. Not accessible to non-technical writers in its current form.
- The core promise–reality gap: The product delivers extraordinary depth on the analysis side but is trapped behind a developer-only setup with no public deployment, no user accounts, no billing, and no marketing presence. The "dual-engine" positioning overstates the Story Machine side, which is architecturally complete but has no demonstrated user demand and requires AI keys for meaningful operation.
- The first meaningful value event: Script Doctor squiggle diagnostics appearing in the CodeMirror editor as the user types or pastes a screenplay — fully deterministic, requires no AI key, works immediately on first load. [verified] (CLAUDE.md Run 1, ROADMAP.md Run 1)
- Estimated time-to-value: ~5-10 minutes for a developer (clone → install → run → paste script → see diagnostics). Effectively infinite for a non-developer (no hosted instance, no landing page, no download).
- The first friction point: Discovery and access — there is no public URL. A potential user must find the GitHub repo and follow developer-level setup instructions. [verified] (README.md, no live product URL in PRODUCT_INPUTS)
- The first hard blocker: Node.js 22.6+ requirement — blocks all non-developers. No hosted option exists. [verified] (README.md line 11: "Prerequisites: Node.js 22.6+")

Include the Promise–Reality Gap table and First Five Minutes table.


## 2. HONEST DIAGNOSIS

Maximum one page.

Lead with the uncomfortable truth.

State:

- What this product really is today: A research-grade screenplay analysis engine wrapped in a Fountain editor, with a novel but unvalidated multi-agent simulation layer. It is the most thorough automated screenplay quality tool that has been built — 3,216 rules, 14 signal categories, 72-script calibration corpus, discrimination testing, degradation AUC measurement — but it is a tool only its developer can use.
- The sharpest realistic target user: A working screenwriter who writes in Fountain or FDX format, has paid for human coverage before, and is frustrated by the cost/speed/genericity of existing feedback options.
- The job it is actually capable of solving: "Tell me specifically what's wrong with my screenplay draft, why, and how to fix it — in seconds, for free, with percentile benchmarks against professional standards."
- The single biggest reason it is not more useful: No one can use it. There is no public deployment, no landing page, no signup flow, and no way for a non-developer to access the product.
- The single biggest reason it is not more in-demand: No one knows it exists. There is zero distribution — no marketing, no content, no SEO, no social presence, no public demo. The repository is private.
- Whether the primary constraint is product quality, positioning, activation, retention, trust, distribution, monetization, or market need: Distribution (nothing exists) and activation (developer-only setup). Product quality on the analysis side is remarkably strong. Market need is plausible but unvalidated.
- Overall usefulness score: 7/10 (the analysis engine is deep and battle-tested; the simulation layer's usefulness to screenwriters is unproven)
- Overall demandability score: 2/10 (zero distribution, zero discoverability, zero monetization, no public deployment)
- Confidence level for both scores: Medium (usefulness score is based on direct code inspection; demandability score is based on the absence of any distribution or user-acquisition mechanism)

Do not soften the diagnosis with generic positives.


## 3. FRAMEWORK SCORECARD

Provide a summary table:

| Framework | Score | Confidence | Core conclusion |
|---|---:|---|---|
| Jobs to Be Done / Four Forces | /10 | | |
| Value Proposition Fit | /10 | | |
| Desirability | /10 | | |
| Viability | /10 | | |
| Feasibility | /10 | | |
| PMF signal | Classification | | |
| Opportunity Map | Highest score | | |
| Growth Engine | /10 | | |
| Usability | /10 | | |

Then provide the full analysis for all seven frameworks.


## 4. STRONGEST CASE AGAINST THE PRODUCT

Before making recommendations, write the strongest evidence-based argument that this product will not succeed as-is.

Use this structure:

### The strongest argument that this product will not succeed
- Argument: This product has no users, no distribution, no monetization, and no path to any of them within its current architecture. It is a research project, not a product. The 3,216 analysis rules, while technically impressive, solve a problem that working screenwriters address through human coverage readers — an established industry practice with high switching costs and strong trust anchors. The Story Machine simulation layer solves a problem that screenwriters do not have (they write scenes, they do not simulate AI agents). Even if the analysis engine is superior to human coverage on accuracy, speed, and cost, there is no evidence that screenwriters want automated analysis — the entire thesis rests on an untested assumption about demand. Furthermore, the product requires Node.js 22.6+ and has no hosted deployment, making it inaccessible to the vast majority of its target users. The codebase is private, there is no marketing, and the developer is solo with no funding for distribution or sales.
- Supporting evidence: [verified] No public deployment exists (PRODUCT_INPUTS). [verified] No billing/monetization mechanism exists (ROADMAP.md section 5.7: "auth implementation" filed but not built). [verified] Private repository, UNLICENSED (package.json lines 3-5). [verified] No user research, analytics, reviews, or behavioral data exists (PRODUCT_INPUTS). [verified] Node.js 22.6+ required (README.md line 11). [verified] Auth filed but not built (ROADMAP.md section 5.7).
- Why this is structural rather than cosmetic: The absence of distribution, monetization, and user-access infrastructure is not a missing feature — it is the absence of a product. A tool no one can access, pay for, or discover is a codebase, not a business.

### Response
- Is the argument correct, partly correct, or incorrect? Partly correct. The argument correctly identifies the critical absence of distribution, monetization, and user-access infrastructure. These are blocking problems. However, the argument overreaches by dismissing the analysis engine's value proposition. The 3,216-rule Script Doctor with calibration corpus and percentile scoring is genuinely novel — no existing tool (Final Draft, Arc Studio, WriterSolo) offers anything comparable in depth or specificity. The keyless, deterministic architecture means the core value proposition has zero marginal cost. The argument also underweights the pain of the current alternative: human coverage at $250-750 per read with 1-2 week turnaround is a real friction point for working screenwriters.
- What evidence supports the response? [verified] 3,216 rules across 14 signal categories (ROADMAP.md line 31). [verified] 72-script calibration corpus with AUC scoring (ROADMAP.md lines 17-31). [verified] 6/6 discrimination pairs correct (ROADMAP.md line 18). [verified] Degradation AUC floor 0.622 (ROADMAP.md line 26). [verified] All analysis features work without an AI key (README.md lines 18-19).
- What would have to change for the product to overcome it? (1) A hosted public deployment with anonymous upload-and-analyze (no signup required) so any writer can test it in under 60 seconds. (2) A shareable HTML coverage report with a CTA to analyze your own screenplay. (3) At least one publicly visible user testimonial or demo. (4) Some form of user account system for persistence and repeat use.
- What evidence would falsify your conclusion? If a hosted version was deployed and 100+ screenwriters used it organically within one month with >20% returning for a second analysis, the "no demand" argument would be falsified. Conversely, if 1,000+ writers visited but <5% completed a full analysis, the "no demand" argument would be strengthened.


## 5. TOP 3 LEVERS

Select exactly three changes with the highest demand-impact-to-effort ratio.

Rank them.

For each lever include:

### Lever {{N}}: {{Specific change}}

- Problem:
- Evidence:
- Target persona:
- Triggering situation:
- Underserved outcome:
- Specific product change:
- Why this user would care:
- Expected behavioral change:
- Why this is better than adding more features:
- Primary metric:
- Guardrail metric:
- Reach:
- Impact:
- Confidence:
- Effort:
- RICE calculation:
- Low/base/high RICE if assumptions are uncertain:
- Key dependency:
- Main risk:
- Fastest validation test:

Recommendations must be concrete enough that a product and engineering team could scope them.


## 6. PRIORITIZED BACKLOG

List no more than 10 items beyond the top three.

Use:

| Rank | Item | Timing | Strategic tag | Persona and reason | Expected outcome | Evidence | Effort | Success metric |
|---:|---|---|---|---|---|---|---|---|

Timing must be one of:

- [now]
- [next]
- [later]

Strategic tag must include at least one of:

- [usefulness]
- [demand]
- [defensibility]

Do not give equal priority to everything.


## 7. KILL LIST

Identify features, scope, workflows, or complexity that consume effort without materially increasing demand.

Use:

| Cut/defer | Evidence of low value or high distraction | Cost imposed | What to do instead | Revisit condition |

Include only items supported by evidence. If usage data is unavailable, label low-value judgments [hypothesis].

Apply the rule:

Double down on what users demonstrably value while removing what blocks activation, repeat use, payment, or spread.


## 8. THE ONE BET

If the team can ship only one meaningful product change this quarter, choose exactly one.

State:

- The bet
- Target persona
- Triggering situation
- Current failed outcome
- Product change
- Why this bet wins over the other two top levers
- What will not be built this quarter
- Primary success metric
- Current baseline
- Target
- Measurement window
- Guardrail metrics
- Leading indicator
- Lagging indicator
- Minimum evidence required to call the bet successful
- Failure threshold
- Falsification condition: what result would prove the underlying hypothesis wrong?
- Ship / iterate / stop decision rule
- Fastest pre-build validation
- Smallest shippable version
- Explicitly excluded scope

Express the bet as a falsifiable statement:

"If we deliver {{SPECIFIC_PRODUCT_CHANGE}} for {{SPECIFIC_PERSONA}} when they face {{TRIGGERING_SITUATION}}, then {{MEASURABLE_USER_BEHAVIOR}} will improve from {{BASELINE}} to {{TARGET}} within {{TIME_WINDOW}}, because {{EVIDENCE_BASED_CAUSAL_REASON}}."

If the baseline is unavailable, label it [unknown] and make establishing the baseline the first required action. Do not invent a target that cannot be measured.
</REQUIRED_OUTPUT>


<MEASUREMENT_CONTRACT>

Every recommended metric must include:

- Metric name
- Exact definition
- Numerator
- Denominator, where applicable
- Eligible population
- Exclusions
- Measurement window
- Segmentation
- Data source or event name
- Current baseline, or [unknown]
- Target, or a clearly labeled [hypothesis]
- Why the metric indicates user or business value
- How the metric could be gamed
- At least one guardrail metric

Use behavioral outcome metrics rather than output metrics.

Prefer:

- Core-job completion rate
- Time-to-first-value
- Activation rate
- Successful repeat-use rate
- Retention by activated cohort
- Paid conversion among qualified users
- Expansion among retained accounts
- Referral or invitation conversion
- Error-free completion rate
- Median time or effort saved

Avoid using these as primary proof of success:

- Features shipped
- Story points completed
- Raw signups
- Page views
- Impressions
- Social followers
- Number of AI generations
- Total clicks
- Unqualified usage volume
- Survey satisfaction without behavioral corroboration

A metric is invalid if improving it does not necessarily mean that the target user received more value.
</MEASUREMENT_CONTRACT>


<RECOMMENDATION_QUALITY_GATE>

Before including any recommendation, test it against all of the following:

1. Does it name one specific user?
2. Does it identify a specific triggering situation?
3. Does it address an observed or explicitly hypothesized problem?
4. Does it improve a user outcome rather than merely add functionality?
5. Is there evidence that the problem matters?
6. Is the proposed change materially more specific than "improve the experience"?
7. Can the expected behavior change be measured?
8. Is there a plausible causal link between the change and the metric?
9. Is it preferable to a simpler non-product intervention?
10. Is it more valuable than removing an existing blocker?
11. Does it avoid broadening the product before the wedge works?
12. Can it be falsified?

If a recommendation fails any of criteria 1–4, 7, or 12, exclude it.

If evidence is weak but the recommendation is strategically important, include it only as a validation experiment—not as a committed build.
</RECOMMENDATION_QUALITY_GATE>


<VALIDATION_LADDER>

Recommend the cheapest valid form of evidence before recommending expensive implementation.

Use this order where appropriate:

1. Inspect existing behavioral data
2. Review support, sales, and churn evidence
3. Conduct problem interviews with the target persona
4. Test comprehension with a static concept
5. Run a concierge or manual workflow
6. Use a clickable prototype
7. Build a narrow technical spike
8. Ship to a small eligible cohort
9. Run a controlled experiment
10. Scale only after the behavioral signal is demonstrated

Do not recommend building a full feature when a cheaper test could disprove the underlying assumption.

For each validation experiment state:

- Hypothesis
- Target participants
- Recruitment criteria
- Test method
- Sample size or stopping rule
- Success threshold
- Failure threshold
- Maximum time and cost
- Decision following each possible result
</VALIDATION_LADDER>


<COMPETITOR_AND_ALTERNATIVE_ANALYSIS>

Treat the current alternative—not merely a direct software competitor—as the real competitor.

Alternatives may include:

- Spreadsheets
- Documents
- Email
- Messaging
- Manual services
- Internal tools
- Agencies or consultants
- General-purpose software
- Doing nothing
- Tolerating the problem

For this product, the most important alternatives are:

1. **Human coverage readers** ($250-750 per read, 1-2 week turnaround) — the industry standard for screenplay quality feedback. Strengths: trusted, nuanced, industry-credentialed. Weaknesses: expensive, slow, inconsistent across readers, vague.
2. **Final Draft** ($249 perpetual) — the industry-standard screenplay editor. Strengths: ubiquitous, trusted, format-standard. Weaknesses: no automated quality analysis beyond basic formatting checks, no AI features.
3. **Arc Studio Pro** ($99-199/year) — modern cloud-based screenplay editor. Strengths: collaboration, cloud sync, some structure analysis. Weaknesses: analysis is shallow compared to Script Doctor's 3,216 rules, no calibration corpus.
4. **ChatGPT / Claude** (free-$20/month) — general-purpose LLM. Strengths: free/cheap, instant, accessible. Weaknesses: not screenplay-specific, no reproducible scoring, no calibration, no structured signal categories, no revision pipeline.
5. **WriterSolo / Highland / Slugline** ($29-99) — minimalist Fountain-based editors. Strengths: simple, fast, Fountain-native. Weaknesses: no analysis features.
6. **Script doctoring services** (agencies, consultants, $500-2000+) — professional rewrite consultation. Strengths: expert human judgment. Weaknesses: very expensive, slow, availability limited.
7. **Doing nothing / self-reading** — the writer reads their own draft repeatedly. Strengths: free, always available. Weaknesses: blind spots, no external calibration, diminishing returns.

For each important alternative, identify:

| Alternative | Why users choose it | Where it is stronger | Where this product is stronger | Switching cost | Evidence |

Do not claim that this product is differentiated merely because it combines common features.

A meaningful differentiation must be:

- Valuable to the target persona
- Noticeable before or during adoption
- Difficult or undesirable for alternatives to match
- Relevant to the core job
- Supported by evidence

This product's strongest differentiation candidate: The 3,216-rule Script Doctor with 14 signal categories, calibration percentiles against a 72-script ground-truth corpus, discrimination testing (6/6 pairs), and degradation AUC measurement. This is a depth of automated screenplay analysis that no competitor offers. However, this differentiation is currently invisible — it cannot be experienced without a developer-level setup.

If differentiation cannot be verified, state [unknown].
</COMPETITOR_AND_ALTERNATIVE_ANALYSIS>


<TECHNICAL_REALITY_CHECK>

Where code access exists, evaluate whether the proposed product strategy is constrained by technical reality.

Check for:

- Stubbed or mocked production paths: Image generation and TTS providers are implemented but reserved — `ai.ts` line 83-84: "RESERVED: Image and TTS providers are implemented but not yet wired" [verified]
- Missing validation: zod schemas exist on all routes [verified], but SEC-2 O(n²) analyzer risk remains — overlapClusters, detectQuestionLatency, computeContentWordClueClusters are unbounded [verified, ROADMAP.md SEC-2]
- Missing authorization boundaries: No user accounts, no per-user permissions. Session IDs are bearer capabilities with no revocation. POST /api/ai-config is gated by ADMIN_TOKEN but defaults to loopback-only [verified, .env.example lines 67-81]
- Fragile state transitions: Stage.ts manages SQLite state per session. A silent FK bug was found and fixed by the E2E journey tests (ROADMAP.md PR #198) [verified]
- Silent failure modes: Keyless mode returns "honest no-op responses" for AI features — by design [verified, README.md line 19]. But server crash safety nets exist (unhandledRejection swallowed, uncaughtException triggers clean shutdown) [verified, server.ts]
- Poor observability: No product analytics. Structured server-side logging via logger.ts exists but no user-facing dashboards [verified]
- Unhandled retries or idempotency: AI calls have retry logic with exponential backoff and timeout wrapping [verified, server/engine/ai.ts]
- Data-loss risk: Per-session SQLite files with online backup API. README documents the backup procedure. No automated backup by default [verified, README.md lines 165-202]
- Dependency on manual operations: AI key configuration is manual. Backup is a manual cron script. Collaboration secret is manual [verified, .env.example]
- Rate-limit or scalability risks: Three-tier IP-based rate limiting exists (120/20/10 req/min). Single-process design — no horizontal scaling. Rate limits collapse behind a reverse proxy unless TRUST_PROXY is set [verified, README.md lines 119-136]
- Unbounded infrastructure or model costs: AI features are optional. No per-user cost tracking or quotas. Deterministic analysis has zero marginal cost [verified]
- Vendor lock-in: Multi-provider support exists (Gemini primary, OpenAI-compatible fallback). SSRF guard on private network targets in production [verified, .env.example line 82-87]
- Security and privacy risks: Session IDs exposed in SSE query params (documented in docs/AUTH.md). No session ID rotation. No cross-device access. ADMIN_TOKEN and METRICS_TOKEN default to loopback-only [verified]
- Accessibility failures in the core workflow: ROADMAP.md section 5.7 explicitly files "accessibility pass" as not yet done [verified]
- Missing test coverage around the primary job: Test coverage is extensive (9,000+ tests). But ROADMAP.md section 5.7 notes "frontend component tests" are filed but not built. No browser-based E2E tests exist — only API-level keyless journeys [verified]
- Configuration that prevents realistic deployment: Dockerfile exists and is production-ready. HEALTHCHECK, non-root user, graceful shutdown all configured. But auth is not built, so public deployment is blocked [verified, Dockerfile]
- Features that exist only in code but are not reachable in the product: Image generation, TTS, self-play corpus mining, deep-read arc signals (all require AI key or are reserved) [verified]

Do not perform a full engineering audit unless requested. Focus on technical issues that affect activation, trust, completion of the core job, repeat use, gross margin, or strategic feasibility.
</TECHNICAL_REALITY_CHECK>


<CONFLICT_AND_UNCERTAINTY_RULES>

When evidence conflicts:

1. Behavioral evidence outranks stated preference.
2. Payment behavior outranks generalized enthusiasm.
3. Repeated behavior outranks one-time usage.
4. Observed product behavior outranks documentation.
5. Production code and configuration outranks roadmap claims.
6. Recent evidence outranks old evidence, unless seasonality or cohort effects explain the difference.
7. Evidence from the target persona outranks evidence from loosely related users.
8. A pattern across sources outranks one vivid anecdote.
9. A large sample does not rescue a badly defined population or metric.
10. Founder conviction is context, not user evidence.

Explicitly identify material contradictions and explain which source you trust more and why.

When uncertainty could change the decision:

- State the uncertainty
- Give the plausible range
- Show how the recommendation changes across the range
- Identify the cheapest evidence needed to resolve it
</CONFLICT_AND_UNCERTAINTY_RULES>


<FAILURE_MODES_TO_AVOID>

Do not:

- Restate the README as analysis
- Treat a feature inventory as a product strategy
- Assume an addressable market from broad category size
- Invent user motivations from UI labels
- Infer retention from account creation
- Infer willingness to pay from stated interest
- Infer usability from code presence
- Infer reliability from a successful happy-path demo
- Recommend acquisition before validating activation and retention
- Recommend collaboration merely to manufacture virality
- Recommend templates without identifying a repeatable starting problem
- Recommend AI unless it improves a measurable outcome better than a simpler method
- Recommend integrations without naming the workflow and user they unblock
- Recommend dashboards that report activity without enabling a decision
- Preserve low-value features because they already exist
- Create false precision in RICE, PMF, opportunity scores, market estimates, or effort estimates
- Hide missing evidence inside confident prose
- Provide twenty observations without making a decision

Specific to this product:
- Do not recommend building more analysis rules — 3,216 is already extraordinarily deep and unvalidated with real users
- Do not recommend expanding the Story Machine simulation — the simulation layer's demand is unproven and the analysis layer is the credible wedge
- Do not recommend pursuing OWNE O1-O5 or STORY GOD SG1-SG6 as product priorities — these are research-level features filed explicitly as "not scheduled"
- Do not recommend adding more AI providers — Gemini + OpenAI-compatible fallback already covers the market
- Do not recommend the NVM proof kernel as a user-facing feature — it is an internal quality gate, not a product benefit
</FAILURE_MODES_TO_AVOID>


<FINAL_DECISION_SUMMARY>

End with a compact executive decision block:

## 9. FINAL DECISION

- **Wedge:** A working screenwriter who needs fast, specific, calibrated screenplay quality feedback before the next submission cycle
- **Core value event:** Script Doctor analysis completing with squiggle diagnostics + calibration percentiles visible in the editor (keyless, instant)
- **Primary constraint:** Distribution — no public deployment, no discoverability, no way for target users to access the product
- **Top lever:** Deploy a hosted version with anonymous upload-and-analyze (paste Fountain text → get HTML coverage report with CTA)
- **Quarterly bet:** "If we deploy a public, anonymous upload-and-analyze endpoint where a screenwriter can paste a Fountain script and receive a quality report with calibration percentiles in under 30 seconds, then >15% of visitors who complete one analysis will return for a second within 30 days, because the analysis depth (3,216 rules, 14 signals) is genuinely novel and the zero-friction entry removes the activation barrier."
- **Primary metric:** D7/D30 return rate among users who completed at least one full Script Doctor analysis
- **Kill immediately:** Story Machine simulation UI development (unvalidated demand, distracts from the analysis wedge)
- **Do not do yet:** User accounts, billing, mobile app, collaboration-as-product, OWNE/STORY GOD features, additional AI provider integrations
- **Critical unknown:** Whether screenwriters want automated analysis at all — specifically, whether a 3,216-rule automated report is perceived as valuable or as a novelty by working screenwriters
- **Next evidence to collect:** Deploy the anonymous upload-and-analyze flow; share it in 3 screenwriting communities (Reddit r/screenwriting, a Slack/Discord writing group, a film school class); measure completion rate and D7 return. If <5% of visitors complete an analysis, the problem is product-market fit, not distribution.
- **Decision:** Validate before building

Then give a maximum three-sentence rationale.

The analysis engine is the deepest automated screenplay quality tool ever built, but depth without distribution and user validation is a research project, not a product. Before investing in accounts, billing, or more features, prove that working screenwriters will complete an analysis and return for a second one. The cheapest test is an anonymous hosted endpoint — deploy it, share it, measure the signal, and let the data decide.
</FINAL_DECISION_SUMMARY>


<EXECUTION_INSTRUCTIONS>

1. Analyze the supplied artifacts before writing conclusions.
2. Do not reveal hidden chain-of-thought or internal reasoning. Provide concise conclusions, evidence, calculations, and decision-relevant rationale.
3. Do not claim to browse, execute code, inspect a repository, or test a product unless that access was actually available and used.
4. Do not ask broad discovery questions when the answer can be found in the supplied evidence.
5. Ask for additional information only when it is necessary to avoid fabricating a material conclusion.
6. If sufficient evidence exists, complete the teardown without asking for permission between phases.
7. Cite all material verified claims at the point where they appear.
8. Keep hypotheses visibly separate from facts.
9. Optimize for decision quality, not completeness or length.
10. Make the final recommendation even when the evidence is imperfect, unless the evidence threshold in Section 0 requires stopping.
11. Use tables where they improve comparison; use prose where causal reasoning matters.
12. Do not repeat the same finding under multiple frameworks unless the repetition changes the decision.
13. When a requested score is unknowable, write "unknown"—do not assign a neutral score such as 5/10.
14. Ensure all arithmetic is internally consistent and show formulas for RICE and Opportunity Scores.
15. Use the evaluation period specified in <PRODUCT_INPUTS>; otherwise default to one quarter.
16. Use calendar dates rather than relative phrases when evidence timing matters.
17. Verify that exactly three top levers, no more than ten backlog items, and exactly one quarterly bet are included.
18. Before submitting, audit the response against <FINAL_CHECKLIST>.
</EXECUTION_INSTRUCTIONS>


<FINAL_CHECKLIST>

Before returning the teardown, verify:

- [ ] Every material factual claim is tagged [verified], [hypothesis], or [unknown].
- [ ] Every [verified] claim has a traceable citation.
- [ ] Marketing claims are not treated as proof of capability.
- [ ] Implemented capabilities are not treated as proof of demand.
- [ ] Missing evidence is stated explicitly.
- [ ] The first-time journey is labeled tested or statically inferred.
- [ ] The sharpest target persona is specific.
- [ ] The core job is expressed as an outcome, not a feature.
- [ ] The promise–reality gap is explicit.
- [ ] All seven frameworks were applied rather than summarized.
- [ ] Scores use the required scales.
- [ ] Unknown scores were not replaced with arbitrary neutral values.
- [ ] The strongest case against the product is not a straw man.
- [ ] Exactly three top levers are included.
- [ ] Every lever names a user, problem, change, behavior, and metric.
- [ ] RICE assumptions and arithmetic are visible.
- [ ] No more than ten backlog items are included.
- [ ] The kill list is evidence-based or clearly labeled hypothetical.
- [ ] Exactly one quarterly bet is selected.
- [ ] The quarterly bet is falsifiable.
- [ ] Metric definitions, baselines, targets, and guardrails are explicit.
- [ ] The final decision chooses one action.
- [ ] No generic praise or filler was added.
- [ ] No recommendation depends on evidence that was invented.

If any check fails, revise the response before returning it.
</FINAL_CHECKLIST>

</MASTER_PRODUCT_TEARDOWN_PROMPT>
