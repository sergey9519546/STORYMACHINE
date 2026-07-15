# High-End Audit — Phase 1 Research Scope

**Mode:** Deep Research `full`
**Protocol date:** 2026-07-14
**Status:** Checkpoint 1 passed; user confirmation required before investigation

## Research Question Brief

### Primary research question

Which evidence-backed product-and-system design offers STORYMACHINE the most
credible route to delivering trustworthy and useful screenplay feedback to real
screenwriters under its current validation, technical, legal, and operating
constraints?

Commercial viability is a design-selection criterion, not a promised outcome.
Demand, willingness to pay, retention, and unit economics require external
validation that this audit does not possess.

### FINER assessment

| Criterion | Score | Justification |
|---|---:|---|
| Feasible | 4/5 | Repository evidence, executable checks, external research, and comparative design analysis support a bounded judgment. Missing writer validation and private competitor data limit certainty. |
| Interesting | 5/5 | The question tests the central product thesis and permits preservation, redesign, or rejection. |
| Novel | 5/5 | It combines implementation truth, measurement validity, screenplay workflow, trust, operating constraints, and comparative redesign for this system. |
| Ethical | 5/5 | It can rely on repository and public evidence while explicitly addressing privacy, copyrighted drafts, misleading claims, and unsafe automation. |
| Relevant | 5/5 | The answer determines what STORYMACHINE should validate, preserve, repair, defer, redesign, or reject. |
| **Average** | **4.8/5** | **Pass; no criterion is below 2.** |

### Subquestions

1. Where does STORYMACHINE's implemented capability-and-evidence model
   materially diverge from its claims, required invariants, and intended writer
   outcome?
2. Which technical, measurement, human, legal, market, and operational failure
   modes most threaten trustworthy screenplay feedback while remaining
   invisible to ordinary tests?
3. Which candidate product-and-system future best satisfies the predeclared
   selection criteria under the project's current evidence gates and
   constraints?

### Scope boundaries

**In scope**

- All first-party repository code, tests, history, active and retired documents,
  prompts, schemas, fixtures, generators, and delivery assets, with a file-level
  coverage disposition.
- Implemented product thesis, architecture, workflows, scoring evidence, UX,
  security, privacy, data integrity, operations, and delivery model.
- Real screenwriters' feedback and revision needs, professional coverage
  practice, trust requirements, and adoption barriers as supported by public
  evidence.
- Direct alternatives, relevant academic evidence, standards, regulator
  guidance, operator evidence, and precisely transferable adjacent methods.
- At least three coherent futures: validation-first Doctor + Editor;
  service-assisted/human-in-the-loop coverage; and a materially different thesis
  if the evidence rejects the current one.
- Design-selection criteria covering correctness, writer utility, trust,
  evidence quality, feasibility, legal exposure, operating cost, time to proof,
  reversibility, and defensibility.

**Out of scope**

- Claiming that writer demand, willingness to pay, retention, or scoring
  validity has been proven without the required external evidence.
- Treating product reviews, marketing copy, synthetic scripts, skipped tests, or
  internal documents as ground truth.
- Reverse engineering proprietary competitor internals beyond clearly labeled
  inference.
- Definitive legal advice or exhaustive jurisdiction-by-jurisdiction analysis.
- Production launch, longitudinal market validation, fundraising valuation, or
  new writer-study completion in this research phase.
- Shipping new features, changing score formulas or thresholds, or growing the
  generated rule catalog during research.

### Operational definitions

- **Trustworthy:** claims are traceable to evidence; known uncertainty and
  abstention are visible; content is not silently lost or overwritten; prior
  results can be explained and reproduced within their declared version; and
  failure is honest rather than confidently wrong.
- **Useful:** feedback is relevant to a writer's current revision decision,
  understandable, actionable, and proportionate to evidence. Actual usefulness
  to writers remains unresolved until P0 supplies direct evidence.
- **Commercially credible:** the route has a plausible valuable workflow,
  distribution path, cost structure, support burden, and defensibility. This is
  not equivalent to validated demand or proven unit economics.
- **Most credible route:** the option that passes every non-compensable gate and
  remains strongest across plausible secondary-criterion weights and explicit
  uncertainty.

## Methodology Blueprint

### Research paradigm

**Pragmatist, critical mixed-method inquiry.** The question is applied and
requires technical facts, quantitative measurements, qualitative document and
workflow interpretation, and explicit challenge to invested assumptions. No
single evidence form can answer it.

### Method

Use a convergent multi-stream design. Each stream is completed independently
before synthesis:

1. **Repository forensic reconstruction:** file census, architecture and trust
   boundary mapping, claim-to-code traceability, git-history analysis, static
   inspection, and executable validation.
2. **Evidence review:** reproducible search and source verification across
   academic research, professional practice, standards, regulator guidance,
   postmortems, and public operator evidence.
3. **Comparative cases:** consistently compare direct products, services, and
   credible manual alternatives using predeclared dimensions rather than a
   feature checklist.
4. **Independent gap passes:** domain, architecture, product, user, measurement,
   red-team, security/privacy, operations, executive, competitor, legal, and
   innovation perspectives.
5. **Failure analysis:** pre-mortem, silent-failure search, abuse paths, and
   second-order consequence mapping.
6. **Competing redesigns:** specify and compare at least three coherent futures,
   including an option that rejects the current thesis.

### Data strategy and sampling

**Repository corpus**

- Census every tracked and untracked first-party file visible to the session.
- Read all meaningful first-party text and source. Classify third-party,
  binary, generated, archived, and mechanically repetitive material explicitly.
- Audit generated catalogs through generators, invariants, consumers,
  representative samples, and measured outputs.
- Record unavailable, secret, environment-gated, or corrupted evidence as a
  coverage limitation.

**External corpus**

- At least 15 verified academic or technical sources for full mode, expanded
  until thematic saturation rather than stopped at the minimum.
- Search at least three distinct discovery systems or source classes and retain
  the exact queries, dates, filters, inclusion/exclusion decisions, and
  deduplication record.
- Prefer primary research, official standards, regulator guidance, public
  datasets, first-party technical documentation, and authoritative professional
  sources.
- Use independent user/operator evidence to test commercial product claims.
- Search explicitly for negative results, contradictory evidence, failed
  approaches, and reasons professionals retain human judgment.
- Use United States/English-language screenwriting practice as the primary
  product context. Add EU/UK privacy, AI, and consumer-protection requirements
  where they materially affect a web product serving those users; do not imply
  global legal completeness.

### Analytical framework

1. Build a claim and truth registry with epistemic status, evidence, confidence,
   dependencies, failure impact, and disposition.
2. Use a requirements-to-implementation-to-test traceability matrix for
   technical and operational claims.
3. Grade sources by field-appropriate evidence quality and disclose conflicts of
   interest, currency, and verification status.
4. Use Toulmin analysis to expose missing warrants and qualifiers; use inference
   to the best explanation to compare rival interpretations.
5. Integrate evidence in a convergence/divergence matrix. Do not average
   incompatible evidence into a single pseudo-scientific score.
6. Apply non-compensable gates first: security/privacy baseline, content and
   state integrity, score-claim honesty, legal/data permission, and minimum
   evidence feasibility. Failure of any gate disqualifies a candidate design.
7. Compare surviving futures on secondary criteria using ordinal judgments and
   weight ranges. Run sensitivity analysis; a winner that changes under small
   weight shifts is reported as unresolved, not selected with false precision.
8. Maintain a supersession matrix and dependency-aware change log.

### Validity and reliability

| Criterion | Control |
|---|---|
| Coverage completeness | File-level ledger with reviewed, sampled, generated, external, blocked, and not-applicable dispositions |
| Construct validity | Predeclared definitions of trustworthy, useful, commercially credible, and most credible route |
| Internal validity | Executable witnesses, focused reproductions, traceability, and rival-explanation analysis |
| External validity | Bound conclusions to public evidence and the stated screenwriting/jurisdiction context |
| Source reliability | Verification, evidence-tier grading, conflict disclosure, and citation-level support |
| Researcher bias | Independent perspective passes, mandatory Devil's Advocate checkpoints, negative-evidence searches, and explicit epistemic labels |
| Decision robustness | Non-compensable gates plus sensitivity analysis across secondary weights |
| Reproducibility | Search log, inclusion rules, source register, calculation artifacts, commands, and versioned repository references |

### Limitations by design

- No new P0 writer sessions means usefulness, trust, willingness to run a draft,
  and willingness to pay cannot be validated here.
- No legally distributable, blind-labeled held-out real-writing benchmark means
  score validity cannot be established here.
- Competitor architecture, economics, and internal data are mostly private;
  conclusions remain labeled inference unless publicly verified.
- Some runtime tests require secrets, corpora, browsers, deployment settings, or
  external services that may be unavailable.
- Product, model, law, and market evidence can change; all time-sensitive claims
  require retrieval dates.
- A single primary synthesis agent can still introduce judgment bias despite
  independent review; disagreements are preserved rather than forced into
  consensus.

### Ethics and integrity

- This phase collects no human-subject data; institutional review is not
  applicable. Any future writer study must independently address consent,
  privacy, compensation, retention, and applicable review requirements.
- Do not reproduce copyrighted scripts or proprietary competitor material
  beyond legally supportable short excerpts and analysis.
- Do not expose secrets, personal session data, or unpublished writer drafts in
  artifacts or agent prompts.
- Disclose AI-assisted research, verify every citation, and reject any reference
  that cannot be confirmed.
- Legal findings are risk analysis, not legal advice.

### Reporting and preregistration

- Report external research with APA-style references and direct source links.
- Maintain a PRISMA-S-inspired search and screening log without falsely labeling
  this heterogeneous applied audit a PRISMA systematic review.
- This Phase 1 document is the frozen internal protocol. Later changes to the RQ,
  scope, constructs, gates, source criteria, or comparison method require a
  dated amendment explaining why and what evidence preceded the change.
- External OSF/PROSPERO registration is not required because this is an applied
  repository/product audit rather than a confirmatory clinical or systematic
  review.

## Devil's Advocate — Checkpoint 1

### Verdict: PASS after method revision

No Critical issue blocks investigation. The following Major issues were found
and incorporated into the methodology.

### Major issues resolved in the protocol

1. **The audit cannot validate writer demand or utility.** Repository and public
   evidence can select a credible next route but cannot establish that real
   writers trust, use, or pay for it. The RQ and operational definitions now
   bound the conclusion, and missing P0/P1 evidence remains unresolved.
2. **A weighted design score could manufacture false precision.** Correctness,
   security, integrity, legal permission, and evidence feasibility are now
   non-compensable gates. Secondary criteria use ranges and sensitivity analysis
   rather than one authoritative weight vector.
3. **“Entire repository plus industry” risks breadth without depth.** The file
   ledger, explicit material classifications, separate evidence streams, minimum
   source standard, saturation rule, and coverage limitations make completeness
   auditable.

### Minor issues retained for monitoring

- Public competitor evidence overrepresents marketing and dissatisfied users;
  source incentives and selection effects must be recorded.
- Legal coverage is necessarily bounded; primary product context and added
  jurisdictions are now explicit.
- “Trustworthy” and “useful” are multidimensional; the definitions must not be
  converted into an unvalidated composite metric.

### Strongest counterargument

No amount of code inspection or literature synthesis can determine which
product real writers will value. The audit may only identify the strongest
evidence-backed hypothesis and the minimum tests needed to validate it. If the
final report presents its selected route as proven demand, the research has
failed regardless of its technical depth.

### Stress tests

| Test | Result |
|---|---|
| Remove the strongest external source | The design can still stand only if repository evidence and multiple independent source classes converge. |
| Flip the preferred conclusion | The current Doctor + Editor remains eligible; no redesign is presumed to win. |
| Apply the conclusion outside the stated context | Not supported without new workflow, legal, and market evidence. |
| Ask “so what?” | The answer controls what to validate, preserve, repair, defer, redesign, or reject next. |
| Assume P0 signal is negative | The method can select the service-assisted or materially different thesis rather than rationalizing the current product. |

### Progression condition

Phase 2 may begin only after the user confirms this RQ and revised methodology.
