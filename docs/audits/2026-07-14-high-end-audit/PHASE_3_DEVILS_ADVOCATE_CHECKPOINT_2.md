# Devil's Advocate Report — Checkpoint 2

**Checkpoint:** post-synthesis, pre-draft

**Review date:** 2026-07-15

**Material reviewed:** Phase 1 scope and baseline; both protocol amendments;
Phase 2 repository, product/UX, security/privacy, quality/operations,
twelve-perspective, source-verification, bibliography, source-register, and
competitive artifacts; Phase 3 synthesis, truth registry, failure register,
and competing-futures model. `PHASE_3_GAP_REGISTRY.md` did not exist at the
time of this checkpoint and therefore could not be reviewed.

## Verdict: REVISE

The synthesis has a strong negative core: it correctly separates software
repeatability from screenplay-score validity, preserves zero P0 demand as a
controlling fact, bounds adjacent evidence, reports negative evidence, and
keeps all three futures conditional. That core survives adversarial review.

Progression to the final report should nevertheless pause for one Critical and
four Major corrections. The most serious defect is actionable: the direct
answer's phrase “transactional compatible import” can be implemented while
leaving the official recovery operation silently lossy. The second serious
problem is inferential: the audit can justify a safety-and-learning sequence,
but the weighted model does not independently establish that Future C is the
product writers will value. Final drafting must preserve that distinction.

## Critical issues — blocks progression

### 1. The immediate restore prescription can still authorize destructive loss

- **Type:** internal contradiction / content-integrity / implementation scope
- **Location:** `PHASE_3_SYNTHESIS.md`, Direct answer item 1 and Theme 5;
  claim C-005; truth-registry T-01–T-05; failure-register FM-03 × FM-11 and
  §7; `PHASE_2_QUALITY_OPERATIONS_FINDINGS.md` QO-01–QO-04 and prioritized
  correction register.
- **Problem:** “Transactional compatible import” addresses the schema-13 versus
  schema-6 rejection and delete-before-validate ordering, but it does not define
  what is being restored. The exported projection omits ScriptIDE state and
  numerous post-v7/user-relevant authorities. A staged atomic swap of that
  partial projection can therefore return success while discarding omitted
  state. The direct answer also omits the raw-copy reset backup, even though the
  quality register makes WAL-safe reset recovery Priority 0. This contradicts
  the failure register's stronger control: disable the recovery representation
  or use until an atomic **complete** restore is proven.
- **Impact:** an implementation can satisfy the synthesis's literal instruction
  and add passing current-export/current-import tests while the noncompensable
  content-integrity gate still fails. Because the user authorized execution,
  this ambiguity is not merely editorial; it can produce another
  successful-looking data-loss path.
- **Required correction:** replace the immediate prescription with a two-option
  gate:
  1. **Disable or explicitly rename/bound import and remove every “full
     recovery” claim** until completeness is decided; or
  2. establish one schema-version authority, deep-validate into isolation,
     define the exact portable aggregate, prove semantic equality for every
     included authority, atomically swap only after verification, preserve the
     original on every failure, and use the tested SQLite online-backup path
     for reset under active WAL.

  The final implementation register must not call the gate cleared until both
  malformed-import preservation and declared-aggregate round-trip tests pass.
  “Partial but honest export” is an acceptable bounded decision; “full recovery”
  is not.

## Major issues — must be corrected in revision

### 1. The numeric future ranking is a value model, not independent evidence for C

- **Type:** decision-model bias / correlated criteria / mixed time horizon
- **Location:** `PHASE_3_COMPETING_FUTURES.md` §§5–7 and §13;
  `PHASE_3_SYNTHESIS.md` C-002, C-007, Themes 2 and 7, direct answer item 3;
  truth-registry P-02/P-03.
- **Problem:** C's 83.0 lead is produced largely by several correlated
  expressions of the same declared epistemic preference—claim honesty, agency,
  calibrated trust, reversibility, and time to learning—plus weights not
  elicited from writers or an accountable decision-maker. The model also mixes
  temporal states: A receives a defensibility rating of 5 conditional on a
  future validated benchmark, while its other ratings remain current-state;
  S3 assumes a strong P1 prior but changes weights without consistently updating
  all ratings. Holding ratings constant isolates value disagreement only by
  ignoring factual state changes that the scenario itself stipulates.
- **Impact:** the caveat “decision aid only” is correct, but repeated “C is
  best/leading” language can convert a constructed prior into apparent research
  discovery. Remove the numbers and the robust conclusion is shared gate repair
  plus P0; C's superiority becomes a plausible, reversible branch rather than
  an evidence-established winner.
- **Required correction:** make the current recommendation **a sequence, not a
  product selection**: repair or disable critical trust boundaries; run the
  authorized P0 stimulus; then branch. Describe C as the default *next concept
  to test only if* writers reject scalar authority but show pull for located
  revision evidence. Retain the table as a transparent owner-prior exercise,
  not the basis of the executive verdict. Add a scenario-consistent rerating
  after hypothetical P1 success, and explicitly show a hold/stop/no-further-
  product-investment comparator.

### 2. The recommendation conflates sample-only P0 with own-draft fielding

- **Type:** scope / sequencing / ethics / security boundary
- **Location:** `PHASE_3_SYNTHESIS.md`, Rival explanation 8 and direct answer
  items 1–2; `PHASE_3_COMPETING_FUTURES.md` §§1, 11, and 12; truth-registry
  F-03/F-04, P-14, T-11/T-20/T-21; `ROADMAP.md:97-119`.
- **Problem:** the current P0 is a sample-report conversation and its tracker
  says never to collect the participant's draft. Import, Docker build context,
  and generative fan-out need not block that sample-only research. Saying “after
  critical gate repair” risks delaying the only evidence-producing activity,
  contrary to demand-before-rigor. Conversely, if “complete P0” is read to
  include running a participant's own draft, the listed four repairs are
  insufficient: exact-commit certification, informed data handling, mode-
  specific provider disclosure, deletion/rotation, bounded bearer-session
  exposure, and accessibility-inclusive operation remain unresolved.
- **Impact:** the same sentence is too strict for the registered P0 and too weak
  for an own-draft beta. It can either manufacture engineering delay or expose a
  confidential draft under an uncertified contract.
- **Required correction:** publish two explicit lanes:
  - **Sample-only P0:** may proceed once one exact-commit stimulus is certified,
    consent/notes rules are followed, no participant draft is collected, and
    the report's research/experimental status is stated. Critical repairs may
    proceed in parallel.
  - **Any own-draft analysis:** remains blocked until the declared recovery,
    privacy/data-flow, provider-consent, identity/deletion, content-manifest,
    and relevant accessibility controls pass.

  Reconcile F-03 through one owner, commit, timestamp, and certification record
  before stating either lane is ready.

### 3. The score-honesty gate and the “existing sample” instruction are unresolved

- **Type:** internal contradiction / research validity / participant framing
- **Location:** `PHASE_3_COMPETING_FUTURES.md` §4.1 and §11;
  `PHASE_3_SYNTHESIS.md` Theme 1, direct answer item 2; truth-registry S-05,
  S-08, S-17 and P-15; `PHASE_2_TWELVE_PERSPECTIVES.md` Material divergences.
- **Problem:** the analysis says the current Health/100, percentile, and
  PASS/CONSIDER/RECOMMEND presentation fails score honesty, while also telling
  the project to show the existing sample report. S-17 correctly leaves score
  visibility unresolved, but the direct answer silently chooses exposure.
  A participant can express desire to run a draft because a synthetic percentile
  or professional-seeming verdict appears validated. That is neither clean
  demand evidence nor ethically neutral stimulus framing.
- **Impact:** the P0 observation can be contaminated by the exact unsupported
  authority the audit identifies, and favorable reactions can later be cited as
  support for that authority.
- **Required correction:** before P0, predeclare what proposition the stimulus
  tests. At minimum, the facilitator must state that the sample is experimental,
  the percentile is synthetic rather than a population percentile, and the
  exercise does not validate screenplay quality. Record comprehension and
  objections separately from desire to try. If the score itself is a research
  variable, expose it only in a separately consented or later comparative
  condition; do not convert five reactions into score validation.

### 4. “Commodity” and moat conclusions outrun the public market evidence

- **Type:** market inference / source transfer / selection bias
- **Location:** `PHASE_2_COMPETITIVE_INDUSTRY.md`, Executive verdict and
  Cross-market findings 1 and 4; truth-registry P-08/P-11; synthesis Theme 6
  and C-008.
- **Problem:** the benchmark establishes that several visible offerings publish
  similar speed, report, score, pass, chat, and price mechanisms. It does not
  establish interchangeability, price elasticity, margins, conversion,
  retention, customer segments, distribution causality, or that those features
  create no willingness to pay. The set is decision-focused and first-party,
  not exhaustive. “Common visible feature” supports weak public differentiation;
  it does not by itself prove an economic commodity or that the proposed
  evidence/receipt stack will become a moat.
- **Impact:** an otherwise disciplined report can overstate its strongest
  commercial conclusion while explicitly admitting that the decisive private
  market variables are unknown.
- **Required correction:** replace categorical commodity/pricing-power language
  with: “feature-count, speed, and generic report breadth are visibly common and
  therefore weak **publicly observable differentiation** in the reviewed set.”
  Label the rights-clean longitudinal evidence stack as a defensibility
  hypothesis requiring rights, use, retention, and imitation-cost evidence.
  Preserve all price and operator statements as dated first-party observables.

## Minor issues

1. **Current hazard versus confirmed incident.** The missing `.dockerignore`
   proves context inclusion under a normal build; it does not prove that a
   remote daemon actually received a confidential draft. Raw provider logging
   proves an unsanitized path; it does not prove a credential was logged. The
   final report should say “confirmed exposure path/risk,” not “breach” or
   “disclosure incident.”
2. **Gate vocabulary drifts.** Accessibility is described as a public-launch
   gate in the failure register, but the formal noncompensable table groups only
   security/privacy, content integrity, score honesty, legal/data permission,
   and P0. Define whether accessibility is part of security/integrity, a sixth
   veto, or exposure-dependent readiness; use one classification throughout.
3. **“Human judgment remains necessary” needs use boundaries.** It is justified
   for P1 reference evidence, appeals, and consequential submission/
   credentialing decisions. The corpus does not prove that every low-stakes
   writer diagnostic requires human escalation or that multiple readers are
   commercially feasible.
4. **Gap-registry completeness is not yet reviewable.** The synthesis contains a
   useful knowledge-gap table, but the promised complete gap artifact was absent
   at this checkpoint. Do not title the final report's registry “complete” until
   that artifact exists, deduplicates the truth/failure registers, and records
   owners, gates, dependencies, evidence status, and dispositions.

## What the synthesis did well

- It did not promote 9,507 passing tests, determinism, or synthetic ordering
  into screenplay validity.
- It preserved the possibility that the engine is better than the available
  corpus can show and the possibility that competitors possess private evidence.
- It bounded S01 to a small, short-term, self-reported comparison against
  specific AI conditions and disclosed its late supplemental status.
- It explicitly retained negative evidence: favorable experience without
  artifact improvement, automatic-evaluation weakness, no automatic human–AI
  synergy, verification costs, and algorithm aversion.
- It separated legal-risk identification from a claim of violation.
- It preserved quick/deep lineage, reader disagreement, the P0/P1 order, and
  the option to stop the product thesis.

## Strongest counterargument

> With zero observed writer sessions and no direct evidence that writers value
> located receipts, the research does not identify a winning product. It
> identifies an unsafe current authority claim, a set of shared engineering
> prerequisites, and several cheap experiments. Future C wins only after the
> analysts encode their preference for humility, agency, and reversibility into
> correlated criteria and weights. A hostile reviewer would therefore call C a
> sensible design philosophy—not an evidence-backed selection—and would make
> “run the bounded P0, then branch or stop” the sole current strategic verdict.

This counterargument does **not** defeat the audit's negative findings or make
A preferable. It limits the strength and timing of the positive selection.

## Cherry-picking and source-transfer assessment

No fatal cherry-picking was found. The repeat-source effect inventory is an
unusually strong control, and the synthesis repeatedly states transfer limits.
The remaining asymmetry is structural: negative evidence against automatic
narrative judgment is comparatively strong but largely generated-story/
adjacent-domain evidence, while positive evidence for C is small, qualitative,
short-term, or cross-domain. Repository evidence directly defeats the current
authority claim but does not directly validate the reflective replacement.

The final report must therefore use external research to set design and
evaluation burdens, not to claim screenplay-product efficacy. Removing A02 and
S01 leaves the C recommendation supportable only as a reversible real-options
choice; it no longer has meaningful direct screenwriter support.

## What's missing

- Any completed, independently documented writer session, own-draft behavior,
  return behavior, payment behavior, or blind revision outcome.
- A rights-clean, grouped, preregistered, held-out multi-reader benchmark for a
  precisely defined score use.
- A complete recovery-aggregate decision and a clean-release restore equality
  witness under active WAL.
- One synchronized P0 exact-commit readiness authority.
- Deployment-specific data flow, provider terms, deletion drill, identity scope,
  and qualified legal review.
- Independent commercial evidence for conversion, retention, margins,
  substitution, feature value, or the proposed moat.
- Browser/assistive-technology evidence for the critical writer journey.
- A completed Phase 3 gap registry and a control/hold option in the decision
  model.

## Immediate-fix boundary after challenge

| Exposure | Defensible action now | Must remain gated |
|---|---|---|
| Any repository/image build | Add deny-by-default Docker context and verify effective exclusions | Do not claim an incident occurred without evidence |
| Any AI-enabled route | Correct limiter class, add bounded engine call/token/time/cancellation budgets, sanitize provider logs, enforce route classification | Do not infer that rate limiting alone bounds fan-out |
| Existing import/reset surface | Disable or honestly bound recovery immediately; then implement the complete/declared atomic aggregate and WAL-safe reset backup | Do not call schema compatibility alone “fixed” |
| Sample-only P0 | Reconcile exact-commit smoke, disclose experimental stimulus, obtain notes consent, collect no draft; proceed in parallel with critical fixes | No product/demand/score-validity claim from five purposive sessions |
| Own-draft/private beta | Require recovery, privacy/data lifecycle, provider consent, deletion/rotation, bounded identity, content-manifest, and accessible critical-path controls | No public/team expansion and no enforceability claims beyond deployment evidence |
| Score/formula/product redesign | Preserve existing evidence; conduct P0, then P1 if the observed job requires an automated judgment | No threshold/rule retuning, Future C UI build, P2 collapse, or outcome claims before their gates |

## Stress-test results

| Test | Result |
|---|---|
| Remove the strongest external source — does the core argument hold? | **Yes for gate failure; no for C preference.** Repository evidence alone establishes missing validity and integrity. C remains reversible, but its writer fit becomes almost entirely unobserved. |
| Remove the numeric decision model — does the recommendation hold? | **Partly.** Shared critical repair plus P0 holds. “C leads” becomes a conditional prototype choice rather than a research result. |
| Flip the research question — are A or B credible? | **Conditionally yes.** A is credible after genuine P0 pull and P1 validity; B after secure reader-quality and unit-economic evidence. The synthesis appropriately preserves both. |
| Add a stop/hold comparator — can it win today? | **Yes.** With zero demand, “critical repair plus sample-only P0, then stop if negative/ambiguous” dominates all product-build commitments today. |
| Apply the conclusion to shorts, excerpts, pilots, or partial drafts | **No current generalization.** Form/completeness blindness and scene scarcity make the current authority claim especially unsafe there. |
| Assume P0 participants reject scalar authority but also reject evidence cards | **C is falsified.** The correct action is reframe/stop, not add human or AI features automatically. |
| Assume a strong, rights-clean P1 result | **A becomes eligible, not proven commercially superior.** Ratings, trust, costs, monitoring, and writer interpretation must all be updated rather than changing weights alone. |
| “So what?” — is immediate significance justified? | **Yes after correction.** Broken recovery, build-context inclusion, model-call budgets, and false authority boundaries are actionable. Product selection remains an experiment. |

## Progression conditions

Checkpoint 2 becomes PASS when the synthesis/report logic does all of the
following:

1. makes recovery completeness or honest disablement part of the immediate
   content-integrity fix, including WAL-safe reset backup;
2. separates sample-only P0 from own-draft/private-beta prerequisites;
3. demotes C from an evidence-established winner to a conditional,
   owner-prior, low-regret concept test and makes hold/stop the current control;
4. resolves how the unvalidated scalar is framed in P0 without claiming that
   five reactions validate it; and
5. narrows commodity/moat language to the public evidence actually reviewed.

No rebuttal round occurred during this checkpoint, so the Concession Threshold
Protocol was not triggered. Cross-model review was not used.

## Post-revision disposition — PASS

**Re-review date:** 2026-07-15

The corrected synthesis, competing-futures model, complete gap registry, and
market benchmark satisfy all five progression conditions. Checkpoint 2 now
passes. This authorizes progression to report drafting and later independent
review; it does not authorize product expansion, score retuning, own-draft
fielding, or public launch.

| Progression condition | Disposition | Corrected evidence |
|---|---|---|
| Complete-or-disable recovery plus WAL-safe reset | **PASS** | `PHASE_3_SYNTHESIS.md:617-626` now requires either disabling/renaming/bounding partial import and removing “full recovery” claims, or one schema authority, isolated deep validation, a declared aggregate, semantic equality, atomic verified swap, and preservation on every failure. It separately requires the tested SQLite online-backup path under active WAL. `PHASE_3_GAP_REGISTRY.md` G-001–G-004 supplies owners, dependencies, immediate controls, durable corrections, and executable exit tests. |
| Sample-only P0 versus own-draft lane | **PASS** | `PHASE_3_SYNTHESIS.md:608-631` separates a no-draft, exactly certified sample lane from an own-draft/private-beta lane gated by recovery, data-flow/privacy, provider consent, identity/deletion/rotation, content-manifest, and accessibility controls. `PHASE_3_COMPETING_FUTURES.md` §§1 and 11 and gap-registry G-016–G-018 preserve the same boundary and permit critical repairs in parallel rather than delaying P0. |
| C demoted to owner-prior concept; hold/stop retained | **PASS** | `PHASE_3_SYNTHESIS.md:417-433,646-655` explicitly calls the numeric table a correlated, mixed-time, owner-prior exercise and makes repair/disable → bounded P0 → branch/stop the robust conclusion. `PHASE_3_COMPETING_FUTURES.md` §5.2 labels the total an owner-prior aid, §6 requires scenario-consistent rerating after P1, and §13 selects no product future. Stop/hold is now the current control. |
| Experimental/synthetic-score P0 framing | **PASS** | `PHASE_3_SYNTHESIS.md:608-615`, the competing-futures decision tree, and gap-registry G-018/G-019 require an experimental-stimulus disclosure, identify the percentile as synthetic rather than a population percentile, deny validated screenplay-quality meaning, separate comprehension/objections from desire to try, and isolate score exposure if treated as a research variable. |
| Market and moat language bounded to evidence | **PASS** | `PHASE_2_COMPETITIVE_INDUSTRY.md:18-21,404-413` now says the reviewed mechanisms are visibly common and weak *publicly observable differentiation* while expressly denying evidence of economic commoditization, pricing power, substitution, margins, or retention. `PHASE_3_SYNTHESIS.md:404-412,448` calls the evidence/receipt stack a defensibility hypothesis requiring rights, use, retention, imitation-cost, and commercial evidence. Gap-registry G-031 preserves vendor pages as dated observables only. |

### Concession-threshold decisions

- `[DA-DECISION: Score 5/5 | ACTION: Concede | REASON: Recovery now uses the exact complete-or-disable fork and separately includes WAL-active online-backup proof.]`
- `[DA-DECISION: Score 5/5 | ACTION: Concede | REASON: The registered sample-only research lane and any own-draft exposure now have distinct, explicit prerequisites.]`
- `[DA-DECISION: Score 5/5 | ACTION: Concede | REASON: C is no longer the current selection; the documents disclose the model's owner priors and retain hold/stop as the control.]`
- `[DA-DECISION: Score 5/5 | ACTION: Concede | REASON: P0 framing now prevents synthetic percentile and experimental output from silently masquerading as validated screenplay judgment.]`
- `[DA-DECISION: Score 5/5 | ACTION: Concede | REASON: The controlling market conclusion now distinguishes visible feature prevalence from economic commoditization and labels the proposed moat as hypothetical.]`

The consecutive concessions are warranted because each correction directly
addresses the original attack with explicit controlling language and aligned
implementation-ready exit gates. They do not concede the underlying risks;
they concede that the research artifacts now represent those risks accurately.

### Residual non-blocking wording cautions

- The competitive artifact still opens with the rhetorical sentence that
  STORYMACHINE lacks a defensible path as “another instant AI coverage report”
  and later says the market “rejects” full automation. Its immediately following
  qualifiers correctly narrow those statements. The final report should use the
  narrower controlling formulation—common visible mechanisms imply weak public
  differentiation in this reviewed set, while economic and causal effects are
  unknown—rather than repeating the rhetoric alone.
- The numeric future scores remain in the record. They are acceptable only when
  adjacent to the owner-prior, correlated-criteria, mixed-time, and no-selection
  disclosure now present. Executive summaries must not quote `83.0` in
  isolation.
- `PHASE_3_GAP_REGISTRY.md` now exists and closes the former completeness
  process gap. Its `FIX NOW` label remains constrained to safety, integrity,
  validation-readiness, and truth repair; it must not be read as permission to
  bypass P0/P1 for scoring or product redesign.

**Final Checkpoint 2 verdict: PASS.**
