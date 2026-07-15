# Phase 3 — Competing Strategic Futures and Decision Model

**Decision date:** 2026-07-14  
**Decision scope:** select the lowest-regret product thesis to validate; this is
not authorization to bypass `ROADMAP.md` P0 or to launch.  
**Evidence freeze:** Phase 1 protocol plus Phase 2 repository, product,
security/privacy, quality/operations, bibliography, and source-verification
artifacts in this directory.

## 1. Decision in one paragraph

**[Inference]** STORYMACHINE should treat **Future C — the Reflective Draft
Clinic** as the leading product hypothesis, while treating **Future B — the
Reader Studio** as the strongest premium/human-context alternative and **Future
A — the Deterministic Coverage Authority** as a conditional option that is
ineligible unless P1 first validates its score on real writing. This is a
choice of what to learn next, not a demand conclusion. All three futures are
blocked today: P0 has no completed writer sessions; the shared implementation
has critical content-integrity and security/privacy defects; and public-draft
data permissions and promises are not yet demonstrated. The authorized next
move remains: repair only critical gate defects, complete P0 using the existing
sample report, and branch according to what writers actually say and do.

The recommendation is deliberately asymmetric:

- C is the **lowest-regret hypothesis** because it can use the existing
  deterministic observations and receipts without converting an unvalidated
  scalar into an authoritative judgment. It preserves writer agency and leaves
  both A and B open.
- B has the **highest context-sensitive feedback ceiling**, but only if
  STORYMACHINE can recruit, calibrate, protect, and economically support good
  readers. “Human in the loop” is not automatically better than the best human
  or machine member ([A26](https://doi.org/10.1038/s41562-024-02024-1),
  [A30](https://doi.org/10.1080/0960085X.2025.2475962)).
- A has the **best instant-scale ceiling**, but its defining promise is the
  very claim the repository cannot currently substantiate. Reproducibility
  cannot substitute for validity ([A18](https://doi.org/10.1037/0003-066X.50.9.741),
  [G01](https://www.aera.net/Publications/Books/Standards-for-Educational-Psychological-Testing-2014-Edition)).

## 2. Epistemic and decision conventions

Every material statement uses one of four statuses:

- **[Fact—repo]:** directly supported by inspected repository state, history,
  or an executed witness.
- **[Fact—external]:** bounded to what a verified external source actually
  establishes.
- **[Inference]:** the audit's reasoned interpretation of convergent facts.
- **[Hypothesis]:** a proposition that must be tested with writers, readers,
  operational data, or a held-out benchmark.

The external identifiers below resolve to the registered sources in
[`SOURCE_REGISTER.md`](./SOURCE_REGISTER.md). Product pages P01–P06 establish
only that an offering or claim is visible, never that it works. Academic
transfer from short stories, general decision tasks, or adjacent writing
contexts is labeled rather than silently generalized.

### What the model may and may not decide

**[Fact—repo]** P0 has zero completed writer sessions and its exit gate is not
met ([repository reconstruction §3.2](./PHASE_2_REPOSITORY_RECONSTRUCTION.md)).
The minimum five sessions in the roadmap can supply a directional signal; they
cannot prove a market, willingness to pay, retention, or general writer demand.

Therefore:

1. No future receives points for “validated demand.” There is none.
2. No weighted score can compensate for a failed gate.
3. Numeric totals are a sensitivity instrument over ordinal judgments, not
   probabilities, forecasts, or measured utilities.
4. A future can be the best hypothesis and still be unauthorized to build.
5. A negative or ambiguous P0 result triggers **stop, reframe, repeat P0**; it
   does not authorize a preferred redesign by assertion.

## 3. The three futures are different product contracts

The futures may share storage, parsers, editor components, deterministic
observations, and report infrastructure. They are nevertheless mutually
exclusive as the **primary promise, authority model, and operating model**. A
hybrid that advertises all three at once would recreate the current scope and
trust ambiguity.

### Future A — Deterministic Coverage Authority

**Primary promise:** “Receive an instant, reproducible professional-style
judgment of this draft.”

**Authority model:** the system is the evaluator. Health/100,
Pass/Consider/Recommend, ranking/percentile, dimension scores, and prioritized
fixes are the principal product outputs. Deterministic rules and formulas make
the judgment inspectable; optional generative text explains or acts on it but
does not set the verdict.

**Required operating model:** software-led self-service with a legally
distributable, blind-labeled, held-out real-writing benchmark; ongoing
distribution-shift, fairness, calibration, and claim monitoring; low marginal
delivery cost after large validation investment.

**Hard boundary:** if the product calls its scalar “experimental,” removes
quality verdicts, or makes the writer interpret competing observations, it has
moved toward C. If a human reader owns the judgment, it has moved toward B.

**Evidence case for A**

- **[Fact—repo]** The keyless analyzer, content hash, server-side recomputation,
  deterministic receipts, issue locations, and extensive bounded-path tests are
  real strengths ([PX strengths](./PHASE_2_PRODUCT_UX_FINDINGS.md),
  [`BASELINE_VERIFICATION.md`](./BASELINE_VERIFICATION.md)). This is meaningful
  asset fit.
- **[Fact—repo]** The current judge claim is not validly established. The
  reference set is 20 hand-authored controlled-richness samples rather than an
  industry benchmark; the live composite gap is about 2.9 versus a 5.0 target;
  the 72-script suite is skipped without a private corpus; and no held-out,
  independently labeled real-writing benchmark runs in ordinary CI
  ([PX-01](./PHASE_2_PRODUCT_UX_FINDINGS.md),
  [`BASELINE_VERIFICATION.md`](./BASELINE_VERIFICATION.md)).
- **[Fact—external]** Story-evaluation research repeatedly finds weak or
  unstable alignment between automatic measures and human criteria, including
  failures on discourse and causal perturbations ([A10](https://aclanthology.org/2022.coling-1.509/),
  [A11](https://doi.org/10.1162/tacl_a_00689),
  [A12](https://doi.org/10.18653/v1/2021.acl-long.500)). These are generated-story
  results, not direct proof that STORYMACHINE fails on screenplays, but they
  raise the prior burden of proof.
- **[Fact—external]** Both people and LLM evaluators can show material judgment
  biases ([A15](https://doi.org/10.18653/v1/2024.emnlp-main.474)); averaged
  ratings can also reverse inferred preferences under plausible assumptions
  ([A13](https://doi.org/10.18653/v1/2022.emnlp-main.406)). Human labels are
  necessary evidence, not an infallible oracle.
- **[Inference]** If P1 genuinely passes its preregistered held-out gates, the
  benchmark, monitoring discipline, and inspectability could become a strong
  moat. Until then, A's scale advantage is irrelevant because its defining
  claim fails the score-honesty gate.

**Who could rationally choose A:** a writer who explicitly wants a fast,
standardized, consequential judgment and accepts its defined domain, error bars,
and abstentions. Whether such writers want STORYMACHINE's version is a
**[Hypothesis]**.

### Future B — Reader Studio: Human Judgment, Machine Evidence

**Primary promise:** “Get accountable feedback from an identifiable, qualified
reader, supported by structured evidence.”

**Authority model:** a human reader owns the interpretation and recommendation.
The machine prepares structural observables, quotations/locations, consistency
checks, coverage scaffolding, and receipts; it neither impersonates the reader
nor silently sets the result. Disagreement is reportable evidence, not noise to
average away.

**Required operating model:** service or marketplace operations—reader sourcing,
credential and genre-fit verification, assignment, confidentiality, secure
draft access, rubric training, calibration, QA, appeals, conflict management,
turnaround SLAs, support, payment, and reader compensation.

**Hard boundary:** if a machine score determines the recommendation, this is A
with a human wrapper. If the writer remains the final interpreter and a reader
is optional escalation rather than the primary deliverable, this is C.

**Evidence case for B**

- **[Fact—external]** Expertise and domain match can materially affect the
  consistency of creative-product ratings, while nonexpert ratings can be less
  consistent ([A22](https://doi.org/10.1080/10400410802059929),
  [A23](https://doi.org/10.1002/j.2162-6057.2009.tb01316.x)). This supports a
  reader-selection and calibration burden; it does not prove expert consensus
  equals screenplay truth.
- **[Fact—external]** Reliable human evaluation requires explicit criteria,
  rater recruitment and quality control, suitable agreement statistics, and
  transparent reporting ([A14](https://doi.org/10.18653/v1/W19-8643),
  [A19](https://doi.org/10.20982/tqmp.08.1.p023),
  [A20](https://doi.org/10.1162/coli.07-034-R2),
  [A21](https://doi.org/10.1016/j.jcm.2016.02.012)). A single reader's polished
  opinion is not automatically a validated label.
- **[Fact—external]** A current human coverage vendor publicly lists feature
  coverage from $185, and a peer-exchange platform publicly offers a free
  reputation-mediated alternative ([P02](https://www.scriptreaderpro.com/our-script-coverage-services/),
  [P01](https://coverfly.com/x/)). These are market-format and price
  observations only; they do not establish STORYMACHINE demand or viable unit
  economics.
- **[Fact—external]** Meta-analytic evidence does not support the blanket claim
  that adding a human to AI produces synergy over the stronger component
  ([A26](https://doi.org/10.1038/s41562-024-02024-1)). Complementarity must be
  designed around different information or capability, then tested
  ([A30](https://doi.org/10.1080/0960085X.2025.2475962)).
- **[Inference]** B's strongest contribution is not “human polish.” It is
  contextual interpretation, accountable dialogue, and the ability to ask what
  the writer intended—capabilities the current deterministic score does not
  establish. Its weakest point is that every report carries variable labor,
  quality, delay, confidentiality, and support risk.

**Who could rationally choose B:** a writer who values accountable expert
context enough to accept higher price and slower turnaround. Whether that
premium covers reader and QA cost is a **[Hypothesis]**.

### Future C — Reflective Draft Clinic (“Draft MRI”)

**Primary promise:** “See what this draft is doing, where, and from several
bounded perspectives so you can decide the next revision.”

**Authority model:** the writer remains the decision-maker. The system presents
deterministic observables and provenance first—scene distribution, character
presence, changes in pressure/arc, repeated signals, issue locations,
counterfactuals, and revision comparisons. Interpretations are labeled,
contestable hypotheses. Optional LLM perspectives are explicitly generative,
separated from deterministic evidence, and never converted into a hidden
quality score. A human reader may be an escalation, not the default authority.

**Required operating model:** focused software product with a narrow
Doctor + Editor path, intent capture, evidence cards, uncertainty/abstention,
compare-revision workflows, and optional provider features under an accurate
privacy contract. Success is measured through writer decisions and revision
behavior, not through satisfaction with a persuasive verdict.

**Hard boundary:** putting Health/100, percentile, or
Pass/Consider/Recommend back at the top makes this A. Making a paid reader's
opinion the main product makes it B. Adding more expert panels or OASIS to the
default path violates C's focused contract.

**Evidence case for C**

- **[Fact—external]** Interviews with 23 screenwriters directly document varied
  practices, attitudes, and desired AI roles, but do not prove demand or
  outcomes ([A02](https://doi.org/10.1145/3706598.3714120)). A broader writing
  synthesis identifies support needs such as consistency, story arc, reader
  experience, and expressive intent—not only generation
  ([A04](https://doi.org/10.18653/v1/2022.in2writing-1.11)).
- **[Fact—external]** Writing-tool studies identify useful agency patterns, yet
  positive experience does not necessarily improve the artifact
  ([A05](https://doi.org/10.1145/3172944.3172983),
  [A06](https://doi.org/10.1145/3490099.3511105),
  [A07](https://doi.org/10.1145/3491102.3502030)). These mostly short-form
  contexts justify interaction hypotheses, not a screenplay benefit claim.
- **[Fact—external]** Trustworthy decision support should seek calibrated
  reliance rather than maximal trust ([A24](https://doi.org/10.1518/hfes.46.1.50_30392),
  [A25](https://doi.org/10.1145/3696449)). Cognitive forcing can reduce
  overreliance while reducing preference, and explanation value depends on
  verification cost and incentives ([A27](https://doi.org/10.1145/3449287),
  [A28](https://doi.org/10.1145/3579605)). C must therefore make evidence
  checkable without turning reflection into punitive friction.
- **[Fact—repo]** STORYMACHINE already has the strongest technical ingredients
  for C: keyless analysis, cited locations, content hashes, versioned receipts,
  server recomputation, before/after verification, and an editor. Its current
  authoritative score language and multi-product surface are the parts least
  justified by evidence ([PX-01, PX-03](./PHASE_2_PRODUCT_UX_FINDINGS.md)).
- **[Inference]** C converts determinism from “the machine is right” into “the
  observation is inspectable.” That is a more defensible contract under current
  evidence, while preserving the benchmark and human-service options.

**Who could rationally choose C:** a writer who wants private, immediate,
specific revision support but resists a machine claiming final taste or market
authority. Whether that is a sufficiently sharp and valuable job is a
**[Hypothesis]**.

## 4. Non-compensable gate analysis

### 4.1 Current-state eligibility

“Pass” means the evidence presently demonstrates the gate. “Fail” means a
confirmed defect defeats it. “Not demonstrated” means the required contract,
permission, or evidence does not yet exist; it is not a legal-violation claim.

| Gate | A — Coverage Authority | B — Reader Studio | C — Draft Clinic | Current evidence |
|---|---|---|---|---|
| Security and privacy baseline | **Fail** | **Fail** | **Fail** | Generative endpoints use the ordinary limiter; no `.dockerignore` protects ignored drafts/secrets from build context; raw provider-test errors are logged; bearer session IDs are not public-product identity; and no public draft-privacy contract exists ([ST-01, ST-02, ST-04–ST-06](./PHASE_2_SECURITY_PRIVACY_FINDINGS.md)). |
| Content and state integrity | **Fail** | **Fail** | **Fail** | Current export schema 13 is rejected by import's hard-coded schema 6; malformed accepted imports can destroy good state before failing; the “full” snapshot omits current state ([ST-03](./PHASE_2_SECURITY_PRIVACY_FINDINGS.md), [QO-01–QO-04](./PHASE_2_QUALITY_OPERATIONS_FINDINGS.md)). |
| Score-claim honesty / validity | **Fail** | **Not demonstrated** | **Not demonstrated in current UI** | A's current scalar/verdict/reference claims exceed evidence ([PX-01](./PHASE_2_PRODUCT_UX_FINDINGS.md)). B would need transparent reader qualifications, disagreement, rubric limits, and claim scope. C can pass by design only after authoritative score language is removed from its default contract; writer usefulness still requires validation. |
| Legal and data permission | **Not demonstrated** | **Not demonstrated** | **Not demonstrated** | A lacks the licensed, real-writing benchmark its claim requires. B adds disclosure to human readers, contractor access, confidentiality, and rights controls. C may send scenes to optional providers. Current terms, retention/deletion, subprocessor, training, and rights promises are absent ([ST-04](./PHASE_2_SECURITY_PRIVACY_FINDINGS.md)). |
| **ROADMAP P0 demand gate** | **Fail: 0 sessions** | **Fail: 0 sessions** | **Fail: 0 sessions** | No future may manufacture demand evidence. Current status is P0 active, P1–P4 blocked. |

**[Inference] No future is launch-eligible or generally build-authorized today.**
The four design gates are vetoes. P0 is an additional sequencing veto. A high
weighted score below cannot erase any red cell in this table.

### 4.2 Future-specific gate-clearing conditions

| Future | Score-honesty gate | Legal/data gate | Security/integrity gate | Earliest honest claim |
|---|---|---|---|---|
| A | P1 preregistration; licensed real drafts; ≥3 independent experienced readers; agreement and disagreement reporting; held-out performance and uncertainty at the roadmap floors; subgroup/error/abstention policy; continuing drift checks | Explicit benchmark licenses and upload/provider terms; evidence for every quantitative/superiority claim | Shared critical fixes plus benchmark isolation, access control, and audit trail | “On the declared benchmark and split, version X achieved Y with interval Z; this report is inside/outside that validated domain.” |
| B | Named responsibility, reader qualification and genre-fit rules, rubric and QA, transparent single-reader versus multi-reader status, dispute process, no claim that “human” equals objective truth | Writer consent to human access; reader confidentiality and data-processing terms; least-privilege draft access; deletion/audit path; compensation and contractor review | Shared critical fixes plus reader identity, authorization, revocation, access logs, and secure work queues | “This is Reader R's accountable interpretation under rubric V; machine evidence is supporting material; known disagreement is shown.” |
| C | Remove or quarantine authoritative scalar/verdict/percentile claims; separate observations from interpretations; label model-generated perspectives; visible uncertainty and abstention; validate usability and reliance | Accurate storage/deletion/provider disclosures; user control over optional model transfer; no hidden training/secondary-use promise | Shared critical fixes plus narrow default surface, safe persistence, accessible evidence navigation, and provider call budgets | “These versioned observations were computed from this draft; the interpretations are prompts for your decision, not a quality verdict.” |

Regulatory and professional evidence reinforces the need for bounded claims and
content handling: FTC guidance treats AI performance claims and confidential
uploads/secondary use as material risk areas
([G07](https://www.ftc.gov/business-guidance/blog/2023/02/keep-your-ai-claims-check),
[G08](https://www.ftc.gov/policy/advocacy-research/tech-at-ftc/2024/01/ai-companies-uphold-your-privacy-confidentiality-commitments)); WGA guidance
defines specific MBA protections but is not universal product law
([G12](https://www.wga.org/contracts/know-your-rights/artificial-intelligence));
and U.S. Copyright Office reports are policy/administrative authority, not an
automatic answer for each script or workflow
([G09](https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf),
[G10](https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-3-Generative-AI-Training-Report-Pre-Publication-Version.pdf)). This audit is
product-risk analysis, not legal advice.

## 5. Secondary decision model

### 5.1 Rating scale and base weights

Only the route's attractiveness **after acknowledging its gate burden** is
scored. Ratings are current evidence-informed judgments:

- `1` = contradicted by current evidence or requires a new capability/operation
  with no supporting proof;
- `2` = weak and highly conditional;
- `3` = plausible but materially unresolved;
- `4` = strong route fit with important unvalidated assumptions;
- `5` = strongest relative design potential—not proof of outcome.

Weighted contribution is `weight × rating / 5`. Weights sum to 100. “Demand”
is intentionally absent because every future has the same zero direct evidence.

| Criterion | Base weight | Why it matters |
|---|---:|---|
| Claim honesty and evidence fit | 15 | Whether the primary promise can be stated without implying evidence the product lacks |
| Feedback-fidelity ceiling / context sensitivity | 15 | Capacity to handle intent, taste, genre, ambiguity, and whole-draft context |
| Writer agency and revision actionability | 14 | Whether the output supports a concrete writer decision without usurping it |
| Time to trustworthy learning | 12 | Speed to falsifiable writer/reader/benchmark evidence, not speed to ship UI |
| Fit with current technical assets | 10 | Reuse of analyzer, receipts, editor, routes, and existing operational capability |
| Calibrated trust potential | 10 | Ability to support appropriate reliance, verification, correction, and abstention |
| Scale, marginal cost, and response speed | 9 | Economics and availability after the proposition is valid |
| Operating feasibility | 6 | Staffing, QA, support, monitoring, and incident burden |
| Reversibility and option value | 5 | Cost of changing course and value of assets created if the thesis fails |
| Defensibility ceiling | 4 | Potential for durable evidence, data rights, relationships, or workflow advantage |

### 5.2 Base-case ratings and totals

| Criterion | A rating | B rating | C rating | Evidence-bounded rationale |
|---|---:|---:|---:|---|
| Claim honesty and evidence fit | 1 | 4 | 5 | A's defining current claim is unvalidated. B can honestly identify a reader and limits but still needs reliability discipline. C can bound claims to inspectable observations. |
| Feedback-fidelity ceiling | 2 | 5 | 3 | A compresses plural judgment into a standard measure. B can ask about intent and use context. C presents multiple lenses but lacks accountable expert synthesis by default. |
| Writer agency/actionability | 2 | 4 | 5 | A's verdict anchors the decision. B can converse but can still dominate. C explicitly gives the decision back to the writer. |
| Time to trustworthy learning | 1 | 5 | 4 | A requires rights, labels, preregistration, held-out evaluation, and monitoring. B can run a bounded concierge pilot; C can concept-test evidence-first reports before code. |
| Current asset fit | 4 | 2 | 4 | A and C reuse the analyzer/editor/receipts. B lacks reader operations, identity, assignment, and service QA. |
| Calibrated trust potential | 2 | 4 | 4 | A risks false authority and later aversion after visible errors. B has accountability but reader variance. C makes contestability central, but transfer to writer behavior is unproven. |
| Scale/cost/speed | 5 | 1 | 4 | A is deterministic self-service; B has variable human cost and delay; C is mostly software with optional provider cost. |
| Operating feasibility | 4 | 1 | 4 | A and C need software/risk operations; B adds an unfamiliar labor and marketplace/service system. |
| Reversibility/option value | 2 | 3 | 5 | A's authority branding and benchmark specialization create lock-in. A small B pilot is reversible but service commitments accumulate. C preserves the paths to A and B. |
| Defensibility ceiling | 5* | 4 | 3 | *A earns 5 only if a licensed benchmark and repeated held-out validity become real; today that moat does not exist. B can build reader relationships/data. C's interaction contract is easier to imitate. |
| **Weighted total / 100** | **48.8** | **71.4** | **83.0** | **Decision aid only; gates still veto all three today.** |

**[Inference]** C leads the base case by 11.6 points over B because it combines
claim honesty, agency, existing-asset reuse, software economics, and
reversibility. B's 22.6-point lead over A reflects the current absence of score
validity and the speed with which a bounded human service can generate richer
qualitative learning. These margins are judgments, not confidence intervals.

### 5.3 Rating uncertainty

- One one-level rating change can alter a base total by at most 3 points. No
  single rating judgment reverses either base ranking.
- The C–B result is not immutable. Four coordinated adverse judgments on
  high-weight criteria can erase an 11.6-point margin, and a materially
  different priority model makes B win below.
- A's rating is especially option-like. If a successful P1 moved A to honesty
  `4`, fidelity `4`, agency `3`, learning `3`, trust `4`, and reversibility `3`,
  its base total would become **76.4**, ahead of current B but still behind C.
  That is a conditional update rule, not a prediction that P1 will pass.
- The correct response to disagreement is to expose the disputed rating and
  rerun the table, not to add decimal places.

## 6. Sensitivity analysis: three materially different worlds

The same ratings are held constant while priorities change. This isolates
value disagreement from factual disagreement.

| Scenario | Priority weights (nonzero) | A | B | C | Winner and interpretation |
|---|---|---:|---:|---:|---|
| **S1 — Base: evidence-first software company** | Honesty 15; fidelity 15; agency 14; learning 12; asset fit 10; trust 10; scale 9; operations 6; reversibility 5; defensibility 4 | 48.8 | 71.4 | **83.0** | **C.** Lowest-regret route under current uncertainty. |
| **S2 — Premium nuance and learning** | Fidelity 30; learning 20; trust 15; honesty 10; agency 10; asset fit 5; defensibility 5; scale 2; reversibility 2; operations 1 | 40.6 | **85.8** | 77.4 | **B.** If accountable context and rapid direct learning dominate economics, the reader service wins. |
| **S3 — Scale and moat after a strong P1 prior** | Scale 30; defensibility 20; asset fit 15; operations 15; agency 5; learning 5; fidelity 4; honesty 2; trust 2; reversibility 2 | **80.6** | 48.4 | 77.0 | **A, narrowly.** This is rational only for a decision-maker already willing to heavily weight a future validated benchmark. It does not make the missing benchmark exist. |
| **S4 — Catastrophic trust-error minimization** | Honesty 25; trust 20; reversibility 15; agency 15; learning 10; fidelity 5; asset fit 4; scale 2; operations 2; defensibility 2 | 37.8 | 76.0 | **89.6** | **C.** When false authority and lock-in have the highest downside, C dominates. |

**[Inference]** There is no universal winner. Each future wins a coherent value
system. The base recommendation for C is robust to small weight shifts but not
to a strategic decision that human nuance is paramount (S2) or that a validated
automated moat is both achievable and worth prioritizing above claim risk (S3).
That is the correct form of uncertainty: explicit rival strategies, not an
average that conceals them.

## 7. Algebraic break-even conditions

Let `wH, wF, wA, wL, wX, wT, wS, wO, wR, wD` be weights for honesty,
fidelity, agency, learning speed, current-asset fit, calibrated trust, scale,
operating feasibility, reversibility, and defensibility. Because every rating
uses the same 1–5 scale, division by five does not affect the winner.

### C versus B

C outranks B when:

`wH + wA + 2wX + 3wS + 3wO + 2wR > 2wF + wL + wD`

B therefore becomes the rational primary route when the combined premium on
human context (`2wF`), rapid concierge learning (`wL`), and reader-network
defensibility (`wD`) exceeds C's advantages in evidence honesty, agency, asset
reuse, software economics, operating simplicity, and reversibility. S2 crosses
that boundary.

### C versus A

C outranks A when:

`4wH + wF + 3wA + 3wL + 2wT + 3wR > wS + 2wD`

A has only two modeled advantages over C: one rating level in scale and two in
conditional defensibility. It wins only when those dominate the large current
evidence, agency, learning, trust, and reversibility deficits. S3 crosses the
boundary by assigning 50% of all weight to scale plus defensibility. A must
still pass every gate first.

### B versus A

B outranks A when:

`3wH + 3wF + 2wA + 4wL + 2wT + wR > 2wX + 4wS + 3wO + wD`

This exposes the business choice cleanly: contextual judgment and fast direct
learning versus software leverage and operating simplicity.

### Empirical break-even tests that weights cannot answer

1. **A becomes eligible only if** P0 supplies directional pull for a
   consequential coverage judgment and P1 passes the preregistered held-out
   floors with uncertainty and no leakage. If the benchmark does not pass, A is
   not “close”; its defining product contract remains disqualified.
2. **B is economically viable only if**
   `price received ≥ reader compensation + QA + support + payment/platform cost + security/compliance cost + required contribution margin`.
   P02's public $185 starting price is not evidence that STORYMACHINE can charge
   it or deliver at its cost.
3. **C beats B commercially only if** the writer's premium for accountable
   human context is smaller than the full variable service cost and delay, or
   C produces meaningfully better repeat/revision behavior. Neither side is
   measured.
4. **A beats C economically only if** the incremental value of an authoritative
   validated score over reflective diagnostics, across actual usage, exceeds
   benchmark acquisition/labeling, monitoring, claim substantiation, support,
   and expected false-authority loss. No term is currently known.
5. **Any future stops** if writers will not expose a real draft after seeing an
   honest sample and privacy contract. Feature interest without draft upload is
   not product demand.

## 8. Reversibility and real-option value

| Future | Reversible first experiment | Valuable assets even if thesis fails | Lock-in / stranded-cost risk | Option value judgment |
|---|---|---|---|---|
| A | No-code claim comprehension plus a small, rights-cleared labeling pilot; do not retune the score | Licensed corpus, reader rubric, disagreement data, evaluation harness, error taxonomy | Benchmark rights/labeling expense; metric gaming; authority branding; monitoring duty; pressure to rationalize sunk cost | **Medium at the benchmark level, low at the authority-contract level.** P1 evidence helps all futures, but shipping “the judge” is hard to unwind. |
| B | Manually deliver a small number of securely handled, clearly labeled reader sessions | Writer interviews, reader network, rubric, QA patterns, disagreement corpus, willingness-to-pay observations | Service promises, reader payroll, support queues, confidentiality incidents, marketplace adverse selection | **Medium.** A bounded concierge study is reversible; a scaled marketplace is not. |
| C | After P0 authorizes reframing, test static/sample evidence-first report variants and observed revision decisions before code | Claim language, information architecture, intent taxonomy, reliance evidence, report interaction data | Risk of polishing a reflection workflow writers do not value; possible commoditization | **High.** Reuses current assets, avoids irreversible authority, can escalate to B or promote only P1-validated measures toward A. |

**[Inference]** The benchmark itself and the automated-authority product are
separate investments. STORYMACHINE should preserve the option to build a good
benchmark without precommitting that its outcome must justify A.

## 9. Failure-mode register by future

### A — Deterministic Coverage Authority

| Failure mode | Why ordinary tests miss it | Leading indicator | Control / kill condition |
|---|---|---|---|
| Reproducibly wrong verdict | Determinism and regression tests remain green | Expert disagreement clusters; strong draft variants move irrationally; abstention rate near zero | Held-out real-writing benchmark, confidence intervals, perturbation tests, domain labels; kill authority claim if floors fail |
| Benchmark overfit or leakage | CI can faithfully reproduce contaminated performance | Unexplained held-out jump; fixture fingerprints in rules; performance collapse on fresh licensed batch | Pre-registration, implementer-blind holdout, hashes, access separation, periodic external batch |
| Taste/bias encoded as objectivity | Aggregate AUC can hide subgroup/genre errors | Genre/demographic residuals; reader disagreement suppressed | Stratified error report, disagreement preservation, appeal/abstention; narrow validated domain |
| Goodhart behavior | Score improves while draft quality/intent worsens | Writers make score-seeking edits they later revert; repeated mechanical fixes | Track accepted/reverted revisions and reader preference; never reward score climb as outcome until validated |
| Persuasive false certainty creates claim exposure | UI polish is not tested as a claim | Users repeat “industry score” or treat percentile as market probability | Plain-language scope, evidence link, uncertainty, FTC-aware substantiation review; remove unsupported comparative claims |
| Visible error triggers algorithm aversion | Accuracy aggregate hides trust collapse after one error ([A29](https://doi.org/10.1037/xge0000033)) | Nonreturn after challenged verdict; support disputes | Contestability, correction path, error disclosure; do not optimize stated trust |

### B — Reader Studio

| Failure mode | Why ordinary tests miss it | Leading indicator | Control / kill condition |
|---|---|---|---|
| “Human” becomes unmeasured quality theater | Report delivery passes regardless of usefulness | High variance, generic notes, weak genre fit, appeals | Blind calibration samples, rubric, reader audits, transparent single-reader status; remove reader after quality floor breach |
| Reader disagreement is hidden | Averaged score looks stable | Low agreement with narrow CIs omitted; contradictory revision advice | Report disagreement and ICC/appropriate statistic; do not fabricate consensus |
| Confidential draft leaks through labor workflow | Application security tests exclude contractor behavior | Downloads, copied excerpts, unmanaged devices, lingering access | Least privilege, watermarks/audit, access expiry, confidentiality terms, incident plan; stop fielding on uncontrolled access |
| Unit economics never work | Revenue can grow while contribution margin is negative | QA/support minutes rise, rework/refunds, missed SLA | Time/cost ledger per report and cohort; stop scaling until contribution margin and quality coexist |
| Marketplace adverse selection | Headcount metric looks healthy | Best readers churn; low-quality readers accept more work | Controlled roster before marketplace, calibrated assignment, compensation and workload protections |
| Machine scaffold anchors the reader | Human sign-off obscures automation dominance | Reader conclusions track machine score even on planted counterexamples | Blind some readers to scores, compare independent versus assisted judgments, preserve override reasons |

### C — Reflective Draft Clinic

| Failure mode | Why ordinary tests miss it | Leading indicator | Control / kill condition |
|---|---|---|---|
| Writers perceive it as evasive “not coverage” | Feature and usability tests can pass | “Just tell me if it works”; low draft-upload or repeat rate | Test promise and sample reports in P0; add optional human escalation, not a fake scalar; kill if core job remains unwanted |
| Cognitive burden replaces false authority | More evidence cards look like more value | Long time-to-decision, abandonment, no revision action | Progressive disclosure, top decision queue, intent-first framing, accessibility/browser testing |
| Generative perspectives regain hidden authority | Labels exist but prose sounds certain | Writers quote AI interpretation over evidence; low verification | Separate visual channels, source anchors, uncertainty, compare perspectives, no automatic verdict aggregation |
| “Inspectable” becomes a rule-count pitch | Deterministic catalog tests remain green | Marketing highlights counts; issue volume rises without action | Outcome/decision-centered copy; cap top findings; keep rule catalog frozen |
| Product sprawl returns | Every panel works independently | OASIS/Studio/Labs exposure in first-run path; bundle growth | One default Doctor + Editor path; explicit Labs boundary only when sequenced P2 is authorized |
| Reflection helps feelings, not drafts | Satisfaction surveys look positive | No accepted/revisited revisions; no return with next draft | Observe revision decisions and writer-defined goal progress; do not claim improvement without outcome evidence |

### Shared catastrophic modes

1. **Draft/state loss:** confirmed import and persistence defects destroy trust
   regardless of product thesis ([QO-01–QO-04, QO-12–QO-14](./PHASE_2_QUALITY_OPERATIONS_FINDINGS.md)).
2. **Confidentiality breach or misleading retention promise:** screenplay IP is
   commercially sensitive; current public contract is absent
   ([ST-02, ST-04–ST-06](./PHASE_2_SECURITY_PRIVACY_FINDINGS.md)).
3. **Inaccessible critical workflow:** existing modal/focus gaps and lack of a
   browser/axe gate can exclude writers while source tests remain green
   ([QO-05–QO-07](./PHASE_2_QUALITY_OPERATIONS_FINDINGS.md),
   [G06](https://www.w3.org/TR/WCAG22/)).
4. **Cost/resource abuse:** wrong limiter classes and request fan-out can create
   provider spend independent of product value ([ST-01](./PHASE_2_SECURITY_PRIVACY_FINDINGS.md),
   [G04](https://owasp.org/API-Security/editions/2023/en/0x11-t10/),
   [G05](https://genai.owasp.org/llm-top-10/)).
5. **Governance drift:** contradictory canonical documents and a disproven
   8,917-rule history can direct future agents toward retired work
   ([`PROTOCOL_AMENDMENT_01.md`](./PROTOCOL_AMENDMENT_01.md)).

## 10. Twenty-four-month pre-mortem

Assume STORYMACHINE has failed publicly by July 2028 despite shipping a polished
product. The most plausible causal chain is not one spectacular model error. It
is a sequence of evidence and governance substitutions.

| Failure in the pre-mortem | Earliest warning | Which future is most exposed | Prevention now |
|---|---|---|---|
| Five friendly P0 conversations were reported as market validation | Recruitment is founder-adjacent; objections paraphrased; no own-draft follow-through | All | Preserve verbatim evidence, recruitment source, behavior versus statement, disconfirming cases; call P0 directional only |
| The team selected C in this report and then treated selection as authorization | Roadmap language changes before P0 evidence | C | Keep this artifact noncanonical; require explicit gate/roadmap amendment after evidence |
| A synthetic or leaked benchmark produced a compelling “validated” score | Holdout access is broad; labels/rules change together; uncertainty omitted | A | Preregister, separate access, blind implementer, rights ledger, fresh external batch, report all failures |
| Human coverage became expensive inconsistency at scale | Rework/support grow faster than reports; reader agreement unknown | B | Concierge cost ledger, calibration, roster quality before marketplace, hard scale gate |
| The clinic became forty panels with a softer slogan | Default journey exposes OASIS/Studio jargon; no single revision decision metric | C | Enforce one primary journey and one writer decision per surface; Labs is a real boundary |
| A writer lost or exposed a commercially sensitive draft | Import/reset path remains destructive; build context includes data; provider behavior unclear | All | Repair integrity/security gates before fielding sensitive drafts; publish only enforceable privacy terms |
| “Trust” was optimized through persuasion rather than calibrated reliance | Stated trust rises while verification/override falls | A/C | Measure challenge, override, correction, and appropriate reliance; separate evidence from interpretation |
| Human or LLM feedback encoded narrow taste and discouraged distinctive work | Outlier/genre complaints are dismissed as edge cases | All, especially A | Preserve disagreement, writer intent, domain limits, appeals, subgroup/genre error analysis |
| Report opens were mistaken for revision outcomes | Dashboards stop at runs, exports, and clicks | All | Predeclare writer-decision, accepted/reverted change, repeat-draft, and harm measures; keep claims bounded |
| Legal/privacy promises outran vendor and deployment reality | Marketing says “private/no training” before enforceable contracts/configuration | All | Data-flow map, subprocessor controls, deletion tests, counsel review, claim owner and evidence expiry |
| Release/security operations lagged perceived product maturity | Mutable actions, no provenance, no restore drill, dev dependencies in runtime | All | Address quality/release findings before public scale; run restore and incident exercises |
| Competitor pressure caused unsupported parity claims | Roadmap adds instant market predictions because P03–P06 advertise them | A | Treat vendor pages as offering observations only; require claim-specific evidence |

**Pre-mortem conclusion [Inference]:** the dominant risk is institutional, not
algorithmic: mistaking a reproducible artifact, a positive interview, a human
signature, or a persuasive explanation for evidence of the actual claim. Each
future fails differently when the project collapses those distinctions.

## 11. Decision tree that respects P0

```text
NOW
 ├─ Repair only critical security/privacy and content-integrity gate defects
 └─ Complete P0 with the existing sample report; preserve verbatim evidence
      ├─ Clear pull for own-draft use, with demand for a consequential verdict
      │    └─ Proceed to P1 benchmark work
      │         ├─ P1 passes + all gates clear → A becomes eligible for comparison
      │         └─ P1 fails or domain is too narrow → do not ship A; test C/B reframes
      ├─ Pull for evidence/revision help, but distrust of scalar authority
      │    └─ Explicitly amend sequence; repeat P0 with no-code C report concepts
      ├─ Pull depends on accountable human interpretation
      │    └─ Repeat P0 with a tightly bounded, secure B concierge concept and cost ledger
      └─ Negative or ambiguous pull for using a real draft
           └─ STOP; reframe the job/persona and repeat P0—or end the product thesis
```

Important interpretation rules:

- **[Inference]** A writer saying “interesting” is not the same as running a
  draft; running one is not the same as paying; paying once is not retention.
- A strong objection to the score does not automatically validate C. It only
  supplies a reason to test C.
- A request for “a real reader” does not automatically validate B's unit
  economics or quality system. It only supplies a reason for a bounded service
  test.
- P1 should not be manipulated to rescue A. A failed benchmark is useful
  evidence and preserves option value for C/B.
- Critical security and integrity repairs are shared prerequisites, not feature
  investment and not evidence that any future is wanted.

## 12. Minimal falsifiable tests for each future

These are designs for later authorization, not instructions to bypass the
active roadmap.

### A test card

- **Hypothesis:** writers who show P0 pull will prefer and act on a bounded,
  validated deterministic judgment over evidence-only reflection.
- **Required evidence:** P1 rights-cleared corpus; ≥3 experienced independent
  readers; preregistered split/metrics; agreement and subgroup/error reporting;
  writer comprehension of domain and uncertainty.
- **Primary falsifier:** held-out gates fail, errors concentrate in material
  domains, or writers interpret bounded scores as universal/market truth despite
  disclosure.
- **No-go:** no public judge claim, percentile, or verdict based on the current
  synthetic reference.

### B test card

- **Hypothesis:** writers value accountable contextual interpretation enough to
  accept its price/latency, and structured machine evidence improves reader
  consistency or usefulness without anchoring them.
- **Required evidence:** secure small concierge cohort; explicit reader cost and
  time; blinded independent versus machine-assisted comparison; writer follow-up;
  complaint/rework tracking.
- **Primary falsifier:** machine assistance does not improve or harms note
  quality; inter-reader variance remains unexplained; full cost exceeds observed
  willingness; confidentiality controls cannot be operated.
- **No-go:** marketplace scale before a controlled roster demonstrates quality
  and positive contribution margin.

### C test card

- **Hypothesis:** writers prefer an evidence-first reflective workflow and can
  make a concrete revision decision without an authoritative scalar.
- **Required evidence:** no-code/sample-report comparison after P0 authorizes
  reframing; observed comprehension, challenge/verification, chosen revision,
  and willingness to use a real draft; accessibility-inclusive sessions.
- **Primary falsifier:** writers consistently need accountable human synthesis
  or a consequential verdict; evidence increases cognitive load without a
  revision decision; own-draft pull remains absent.
- **No-go:** implementing broad UI changes merely because C wins this analytic
  model.

## 13. Final strategic judgment

### Selection

**Select C as the leading hypothesis; preserve B as the premium branch; place A
behind an explicit P1 validity option.**

This selection does **not** mean:

- that reflective diagnostics have validated writer demand;
- that human readers are inherently reliable or economically viable;
- that a deterministic judge can never be valid;
- that P2 surface changes may start before the roadmap permits them; or
- that security, privacy, integrity, accessibility, identity, and legal/data
  controls can wait for product-market evidence.

### Why C is the lowest-regret choice

1. **[Fact—repo]** It uses the project's strongest proven substrate—keyless
   deterministic observations, receipts, source locations, recomputation, and
   the editor—while declining the least-supported scalar authority claim.
2. **[Fact—external]** Measurement validity attaches to a score's intended
   interpretation and use, not repeatability alone ([A18](https://doi.org/10.1037/0003-066X.50.9.741)).
   C narrows the interpretation to inspectable evidence.
3. **[Inference]** C has the highest reversibility: its assets support later
   human escalation and selective promotion of genuinely P1-validated measures.
4. **[Inference]** C keeps failure honest. If writers want a verdict or human
   authority instead, P0/reframed tests can falsify it without first building a
   service organization or laundering a synthetic score into product truth.

### What would change the decision

- Choose **A** if P0 produces clear demand for a consequential automated
  judgment, P1 clears every preregistered real-writing gate with uncertainty,
  writers understand its domain, all launch gates pass, and scale/defensibility
  are strategically weighted as in S3.
- Choose **B** if writer evidence shows accountable human context is
  non-negotiable, a secure concierge pilot demonstrates note quality and
  acceptable variability, and observed willingness covers the full reader/QA/
  support cost as in S2.
- Abandon or materially reframe **all three** if writers do not want to run a
  real draft, privacy friction prevents use, or the product cannot demonstrate
  a concrete revision decision without harm.

Until those conditions are observed, “C is best” means only this: among three
serious futures, it is the most evidence-honest, asset-compatible, and
reversible hypothesis to test after the current gates authorize another test.

