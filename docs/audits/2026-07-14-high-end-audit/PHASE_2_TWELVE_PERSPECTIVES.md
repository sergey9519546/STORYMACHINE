# Phase 2 — Twelve Independent Perspective Passes

**Audit date:** 2026-07-14  
**Protocol:** `PHASE_1_SCOPE.md`, independent-gap-pass stream  
**Repository snapshot:** HEAD `d30c2ec` plus the visible working tree  
**External-evidence cutoff:** 2026-07-14  
**Status:** Complete; raw passes A–L precede all cross-pass synthesis

## Method and epistemic discipline

The twelve passes below were conducted as separate reviews. Each pass began
from the frozen research question and evidence corpus, adopted only its named
stakeholder's objectives and failure definition, and produced its findings
before any convergence table was written. Repeated findings were not removed:
independent recurrence is evidence about importance, while differences in why
a finding matters are analytically useful. The raw passes were not rewritten to
force consensus after comparison.

Labels mean:

- **Fact** — directly established by repository execution, source, history, or
  a current primary external source.
- **Inference** — the best-supported interpretation of facts; the reasoning and
  uncertainty are stated.
- **Hypothesis** — a plausible product, user, market, or legal proposition that
  requires new evidence.

Severity is impact within that perspective, not a legal conclusion or final
implementation priority. External source identifiers refer to
`SOURCE_REGISTER.md`; product-source identifiers establish what a vendor says
or offers, never that the product works. Legal and regulatory observations are
risk flags for qualified review, not legal advice.

## Independent verification performed for these passes

These checks were run independently of the prior finding prose before relying
on the corresponding repository claims:

1. **Product-validation state:** direct `rg` over
   `docs/user-validation/P0_EVIDENCE_SUMMARY.md`, `PHASE_TRACKER.md`, and the
   visible 2026-07-15 session log confirmed 0 recruited / 0 scheduled / 0
   completed / 0 valid sessions and P0 `NOT MET`. The smoke-readiness documents
   disagree; the zero-session state does not.
2. **Doctor context contract:** direct inspection of
   `server/lib/validation.ts:602-619` confirmed the quick/deep body contains
   only `fountain` or `fdx`, plus optional `title`. Direct inspection of
   `server/routes/scriptide.ts:265-383` confirmed quick calls
   `runScriptDoctor(fountain)` and deep calls
   `runScriptDoctor(fountain, undefined, { deepRead: true })`. The analyzer's
   supported `StoryContext` includes theme, genre, director style, and
   characters (`server/nvm/analyze/doctor.ts:70-134`), but neither flagship
   route supplies it.
3. **Score/form confound:** direct inspection of
   `server/nvm/analyze/doctor.ts:337-425` and `:593-601` confirmed a
   `140 / sceneCount` scarcity penalty and the RECOMMEND rule. With zero issue
   penalty, fewer than ten scenes cannot reach health 85; the request carries
   no document type, intended length, draft completeness, or revision stage.
4. **Calibration and claim surface:** direct searches confirmed the 20
   hand-authored controlled samples in
   `server/nvm/analyze/calibration/corpus.ts`, the explicit non-industry caveat
   in `reference.ts`, and the writer-facing “Stronger than N% of the reference
   set” in `ScriptDoctorPanel.tsx:2448-2496`. The internal rule/scarcity AUC
   comments were re-read at `doctor.ts:1655-1669`.
5. **Rule-history provenance:** `docs/rulebook/README.md` reports 3,216 live
   pass-scoped rules. `git show --stat a68a425` confirmed Wave 1191 added six
   named detectors across two pass files and tests (863 insertions);
   `git show --stat b1546c8` confirmed the later strategy rewrite did not add
   the alleged 5,701-rule pass expansion.
6. **Product surface:** direct searches of `StartScreen.tsx`, `App.tsx`, and
   `ScriptIDE.tsx` confirmed public “Open simulation”/Simulate paths and direct
   routing into StoryMachine despite the declared future Labs posture.
7. **Import integrity:** direct inspection confirmed exports use SQLite
   `user_version`, the live migration chain reaches version 13, HTTP import
   hard-codes version 6, its schema admits arrays of `unknown`, and the route
   calls `destroySession` before `importSnapshot`.
8. **AI resource classification:** call-path and route inspection re-confirmed
   `/api/turn`, `/api/simulate-to-fountain`, and `/api/ai-config/test` can reach
   model generation while using `gameLimiter`; `/api/ai-config` has no limiter.
9. **Container boundary:** `Test-Path .dockerignore` returned false and direct
   Dockerfile inspection confirmed `COPY . .` after dependency copying. No
   ignored draft or secret contents were opened.
10. **Current primary external facts:** official pages were re-opened on
    2026-07-14. The WGA's 2026 MBA FAQ says companies must notify the Guild in
    writing when licensing writers' work to train a commercial GAI system; the
    EU AI Act text says the Regulation generally applies from 2026-08-02, with
    provision-specific exceptions; FTC guidance discusses confidential inputs,
    undisclosed secondary use, privacy commitments, and material omissions;
    WCAG 2.2 remains the current W3C Recommendation; NIST AI RMF Core calls for
    validity/reliability demonstrations in deployment-like conditions. The
    current Greenlight Coverage page showed a vendor-claimed 36,000+ writers,
    15-minute turnaround, and a $75/month two-screenplay plan. These are
    first-party observables, not independently validated outcomes.

    Re-opened primary pages: [WGA 2026 MBA FAQ](https://www.wga.org/contracts/contracts/mba/2026-mba-contract-changes-faq),
    [EU Regulation 2024/1689](https://eur-lex.europa.eu/eli/reg/2024/1689/oj),
    [FTC confidentiality guidance](https://www.ftc.gov/policy/advocacy-research/tech-at-ftc/2024/01/ai-companies-uphold-your-privacy-confidentiality-commitments),
    [WCAG 2.2](https://www.w3.org/TR/WCAG22/),
    [NIST AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/),
    and Greenlight's current [landing](https://glcoverage.com/landing-page/) and
    [pricing](https://glcoverage.com/pricing/) pages.

---

## Pass A — Screenplay-domain expert

**Independent question:** Would an experienced screenplay reader regard the
system's feedback as craft-relevant, context-aware, and appropriately
authoritative for an actual revision decision?

### A1 — The flagship judgment is blind to the writer's revision intent

- **Status:** **Fact**, with a **Critical** domain implication.
- The Doctor request accepts screenplay text/FDX and title, not the writer's
  current question, draft stage, intended audience, target length, format, or
  desired kind of note. It also fails to pass the engine's available genre,
  theme, director-style, and character context. Theme- and genre-dependent
  checks can therefore be disabled or context-free in the default report.
- A coverage note that ignores whether a writer is revising premise, structure,
  character, tone, market position, or a producer's specific note can be
  internally consistent yet irrelevant to the decision in front of the writer.
  Screenwriter research reports stage-specific practices and desired AI roles,
  while creativity-support research identifies expressive intent and reader
  experience as distinct unmet needs (A02, A04).
- **Inference:** The product currently behaves more like a generic manuscript
  classifier than a professional notes conversation. Adding more generic rules
  cannot repair missing task definition.

### A2 — Document form and completeness can dominate the craft verdict

- **Status:** **Fact** about the formula; **Inference** about domain harm;
  **Critical**.
- The scarcity term alone prevents a script with fewer than ten scenes from
  reaching the 85-point RECOMMEND floor, even if it triggers no issues. The
  request does not distinguish a feature, pilot, short, cold open, scene sample,
  or incomplete draft.
- **Inference:** The same local craft quality can receive a different global
  verdict because the submission is short or partial. That is
  construct-irrelevant variance, not evidence about dramatic quality. It also
  discourages the iterative “bring one troubled section” workflow that could be
  especially useful before a full coverage purchase.
- **Needed discrimination:** separate whole-draft readiness from local scene
  diagnostics and condition any global interpretation on declared form and
  completeness. This is a future validation requirement, not permission to
  retune the formula now.

### A3 — “The model senses; rules judge” understates causal influence

- **Status:** **Fact** about data flow; **Inference** about claim precision;
  **Major**.
- Deep read accepts model-produced suspense, curiosity, emotional shift,
  purpose, dramatic turn, and revelation values, then runs those values through
  deterministic rules. The output lineage is correctly distinguished, JSON is
  strictly validated, hostile scene text is framed as data, and failures fall
  back (`server/nvm/analyze/deep-read.ts`; corresponding tests exist).
- **Inference:** Deterministic downstream logic does not make the resulting
  judgment model-independent. The model participates in the measurement by
  selecting six judgment-bearing inputs. “LLM-assisted sensing followed by
  deterministic aggregation” is more exact than a rhetorical separation
  between sensing and judging.

### A4 — A single verdict hides legitimate professional disagreement

- **Status:** **Inference**, strongly supported; **Critical** until validated.
- Creative-product ratings depend on rater expertise and domain, and even
  experts may disagree (A19–A23). Human and LLM judges exhibit material biases
  (A15). The current interface promotes one health number, grade, percentile,
  and PASS/CONSIDER/RECOMMEND result without an empirical disagreement interval.
- **Inference:** For screenplay craft, disagreement is information: one reader
  may see deliberate ambiguity where another sees missing causality. A
  trustworthy system should distinguish observable agreement, conventional
  craft heuristics, and contestable interpretation instead of collapsing them.

### A5 — The strongest domain asset is issue-level evidence, not the verdict

- **Status:** **Fact** about capability; **Hypothesis** about value; **Major
  opportunity**.
- The system can point to scenes/spans, show root-cause clusters, preserve
  content hashes and build identity, and re-run deterministic checks before and
  after a proposed revision. Those affordances resemble the useful parts of a
  script consultant's note trail more than an opaque automated score.
- **Hypothesis:** Writers may value a “draft MRI” that surfaces patterns and
  lets them accept, reject, or reinterpret them even if they do not trust an
  automated greenlight verdict. P0 must test this directly.

### A6 — Title-page loss is not cosmetic in a professional workflow

- **Status:** **Fact**; **Major**.
- Title, author, and contact feed exports but are absent from both the local
  draft envelope and server `ScriptIDE_State`. A reload restores placeholders.
- In a submission-oriented product, authorship/contact metadata is part of the
  deliverable and chain of custody. Its loss weakens confidence that less
  visible content is safe, even if screenplay body text survives.

---

## Pass B — Systems architect

**Independent question:** Are boundaries, authorities, contracts, and failure
containment coherent enough for the claimed product?

### B1 — There is no single authoritative screenplay/session aggregate

- **Status:** **Fact**; **Critical**.
- User state is distributed among CodeMirror/Yjs, a local draft envelope,
  server `ScriptIDE_State`, simulation ledgers/commits, in-memory collaboration,
  React-only title-page state, and external exports. The “full session” JSON
  omits important tables and editor state; collaboration is not durable.
- **Inference:** This is not merely duplicate storage. It is an undefined
  aggregate boundary: no operation can snapshot, validate, version, restore,
  and prove all user-relevant authorities together. Integrity defects will
  recur until the system names canonical aggregates and synchronization rules.

### B2 — Import violates the replacement invariant in three ways

- **Status:** **Fact**; **Critical**.
- The current server rejects its own schema-13 export through a schema-6 cap;
  the request validates nested rows only as `unknown`; and live state is
  destroyed before the candidate snapshot is proven importable.
- **Architectural implication:** Restore must be modeled as untrusted staged
  replacement: fully validate, import/migrate into isolation, verify invariants,
  then atomically swap. “Delete then hope” is incompatible with a content
  integrity gate.

### B3 — The route graph lacks an enforceable capability taxonomy

- **Status:** **Fact**; **Major**.
- The repository has many routes and four materially different resource/trust
  classes: public health/readiness, deterministic CPU analysis, single/fan-out
  generative work, and administrative mutation. Limiter placement is manual;
  explicit generative paths use the ordinary limiter, and browser/server admin
  contracts do not compose.
- **Inference:** A declarative route manifest or construction wrapper should
  make authentication, limiter tier, body schema, session requirement, model
  call budget, and audit behavior mandatory properties. Tests can then fail on
  unclassified endpoints rather than rediscover drift by call-chain reading.

### B4 — The declared product boundary and runtime boundary disagree

- **Status:** **Fact**; **Major**.
- Canonical direction says Doctor + Editor by default and OASIS in Labs, while
  the public entrance, editor Ship path, router, server engine, and 28 simulation
  overlays expose both systems. Code splitting reduces bytes loaded, not domain
  coupling, state coupling, operating burden, or user ambiguity.
- **Inference:** A Labs flag alone would correct exposure but not architecture.
  The two products need an explicit module/service boundary, shared contracts,
  and a decision about whether simulation state is allowed to mutate editor
  authority.

### B5 — Reproducibility is layered, not binary

- **Status:** **Fact**; **Major**.
- Quick score/hash logic is deterministic under normalized input, mode,
  context, formula/rule version, and build. Serialized reports contain fresh
  timestamps. Deep read is model-dependent and cached in process memory. The
  verification route recomputes quick, not deep, lineage.
- **Inference:** The receipt model needs three explicit identities: input
  identity, analytic configuration/build identity, and sensor lineage. A claim
  of “same report” is too broad; a claim of “same deterministic verdict and
  evidence under the named configuration” is supportable.

### B6 — Per-process state creates a hidden deployment topology constraint

- **Status:** **Fact**; **Major**.
- Sessions are cached in one process, Yjs rooms are memory-only, SQLite files
  are local, deep-read cache is module-local, and turn queues are process-local.
- **Inference:** Horizontal replicas require sticky routing plus shared/durable
  state or a more explicit single-node deployment contract. Scaling the current
  container behind a generic load balancer can produce inconsistent sessions,
  collaboration, caches, and ordering without any code failure.

---

## Pass C — Product strategist

**Independent question:** Is the product thesis focused, evidence-sequenced,
commercially plausible, and reversible under uncertainty?

### C1 — The organization is optimizing a value proposition it has not observed

- **Status:** **Fact**; **Critical**.
- P0 has zero recruited or completed writer sessions. P1–P4 remain blocked.
  Meanwhile the repository contains two products, a 14-pass engine, thousands
  of rules, extensive expert panels, sophisticated receipts, and rapid commit
  churn.
- **Inference:** The largest strategy risk is not missing capability; it is
  continuing to convert unvalidated assumptions into maintenance obligations.
  Demand-before-rigor is economically rational, not merely process doctrine.

### C2 — The front door runs two incompatible positioning tests at once

- **Status:** **Fact**; **Critical for P0 interpretability**.
- The entrance asks users to understand private instant coverage and narrative
  simulation in one journey. It also markets rule quantity while strategy says
  rule count should not be the pitch.
- **Inference:** If a writer proceeds, the team cannot know whether the pull was
  coverage, novelty, simulation, free tooling, or general curiosity. A focused
  validation surface is necessary to learn which job exists.

### C3 — The defensible wedge is verifiable assistance, not automated authority

- **Status:** **Inference**; **Major opportunity**.
- Direct AI competitors already sell speed, breadth, scoring, and
  pass/consider/recommend language at low-to-mid prices (P03–P06). Human services
  sell expertise, genre match, follow-up, and accountability at a much higher
  price (P02). Peer exchange can be free (P01). STORYMACHINE cannot establish a
  moat by having another large rule count or another instant scalar.
- Inspectable locations, deterministic recomputation, before/after receipts,
  keyless operation, and optional model assistance form a rarer bundle.
- **Hypothesis:** “Evidence you can argue with before paying a reader” is a more
  credible wedge than “the machine decides if your script is ready.”

### C4 — The fastest route to proprietary evidence may be a service, not SaaS

- **Status:** **Hypothesis**; **Major**.
- A tightly scoped, compensated, human-assisted coverage service could collect
  writer intent, independent reader judgments, disagreement, accepted/rejected
  findings, and revision outcomes under explicit rights and consent. That can
  validate utility while producing a rights-clean benchmark design.
- **Counterweight:** Service operations are expensive, reader quality varies,
  and a service can accidentally validate the human operator rather than the
  software. It must be designed as evidence collection, not disguised scale.

### C5 — Trust failures are asymmetric business risks

- **Status:** **Inference**; **Critical**.
- A wrong automated verdict, lost draft metadata, failed restore, or unclear
  provider handling can damage a writer's project and the product's reputation.
  A missing convenience feature usually cannot. Algorithm-aversion research
  shows that observed errors can sharply reduce use even when an algorithm is
  otherwise useful (A29).
- **Strategic implication:** integrity, claim honesty, and privacy are launch
  gates; feature breadth is compensable.

### C6 — P0 should distinguish curiosity from committed behavior

- **Status:** **Hypothesis**; **Major measurement risk**.
- “Would you run your draft?” after an impressive sample may measure novelty or
  stated intent. Stronger demand evidence is a privacy-informed decision to use
  a real draft, inspect specific findings, take or reject an action, and return
  or pay under realistic friction.
- The current P0 gate is intentionally a first signal, not product-market fit;
  downstream reporting must preserve that modest interpretation.

---

## Pass D — End user / working writer

**Independent question:** What could cause a writer to misunderstand, distrust,
lose work in, or abandon the product during an actual draft session?

### D1 — The upload decision is not adequately informed in-product

- **Status:** **Fact**; **Critical**.
- The app accepts commercially sensitive, unpublished drafts and can send scene
  content to a configured provider in deep mode. It has an opt-in explanation,
  but no public product privacy/terms contract covering storage, seven-day
  cleanup behavior, backups, provider retention/training, deletion, access, or
  incident handling.
- **User consequence:** A writer cannot evaluate the most important pre-upload
  question: “Who can retain or use my script, for how long, and how do I remove
  it?” FTC guidance specifically recognizes confidential documents and
  undisclosed secondary use as material risks (G08).

### D2 — “Backup” is currently a trap

- **Status:** **Fact**; **Critical**.
- The current JSON export is rejected by the current importer and is incomplete;
  malformed accepted-version input can erase the current session first.
- **User consequence:** The product gives the appearance of recoverability at
  exactly the moment a writer is trying to protect work. A broken restore is
  more dangerous than no restore because it changes user behavior.

### D3 — Small state failures create a “haunted editor” experience

- **Status:** **Fact** about paths; **Major**.
- A delayed file drop can repopulate after Clear All; a successful authoritative
  draft save can be reported as failure if the legacy theme mirror fails; title
  page fields disappear on reload; same-origin tabs share one session despite
  “per tab” wording.
- **Inference:** These failures make user intent appear reversible by the
  software. Writers are likely to stop trusting autosave and maintain shadow
  copies, eliminating the convenience benefit.

### D4 — The interface asks for faith before it offers control

- **Status:** **Inference**; **Major**.
- Health/grade/verdict and percentile occupy high visual authority, while the
  evidentiary caveat that the reference set is synthetic is not equivalently
  prominent. The writer can inspect deeper evidence, but only after receiving a
  judgment.
- Trust/reliance literature argues for calibration to actual capability rather
  than maximal trust, and warns that explanations alone do not guarantee
  appropriate reliance (A24, A25, A27, A28).
- **Better user contract:** show what was observed, where, confidence/limits,
  and “does this matter for your goal?” before an overall disposition.

### D5 — Expert surface area increases abandonment cost

- **Status:** **Fact** about breadth; **Inference** about behavior; **Major**.
- The editor presents Write/Coverage/Ship, five tool slots, seven Studio tabs,
  simulation paths, and many simulation panels. A writer who came for one
  revision answer must learn the project's internal taxonomy.
- **Hypothesis:** Progressive disclosure around one decision loop—question,
  evidence, action, verify, export—will outperform feature discovery for the
  target user. Only observed sessions can confirm this.

### D6 — Keyboard users encounter unprotected critical overlays

- **Status:** **Fact**; **Major**.
- The StartScreen preview and Settings overlay lack a complete dialog contract:
  programmatic dialog identity, Escape, initial focus, containment, and focus
  restoration. No browser/accessibility suite exercises them. WCAG 2.2 includes
  keyboard focus and name/role/value criteria (G06).
- **User consequence:** A user can lose navigation position or become trapped
  behind/inside an overlay even while unit and HTTP tests remain green.

---

## Pass E — Data scientist / measurement specialist

**Independent question:** Do the data, labels, score construction, and tests
support the intended interpretations and decisions?

### E1 — The score has no complete validity argument

- **Status:** **Fact**; **Critical**.
- The calibration set is 20 controlled, hand-authored samples and explicitly
  not an industry benchmark. Six synthetic pairs test limited contrasts; one
  composite minimum-gap assertion is todo. The rights-restricted corpus is
  absent and its ordinary assertions skip. Internal comments report the
  weighted-rule channel at AUC about 0.076 and scene scarcity about 0.938.
- Validity concerns the evidence for a score's interpretation and use, not its
  repeatability (A17, A18, G01). The repository establishes substantial
  software repeatability but not “professional screenplay readiness.”

### E2 — Format/completeness is an unmodeled confound

- **Status:** **Fact**; **Critical**.
- Scene count directly contributes a large penalty; the request lacks form,
  target duration, completeness, or revision stage. Consequently a short,
  excerpt, teaser, or early partial can be ranked below a longer submission
  independent of the intended construct.
- **Inference:** Any reported discrimination can be inflated by length/format
  imbalance unless evaluation matches or models those variables. Held-out
  splits must group all versions/derivatives from one underlying script and
  stratify or explicitly model form, genre, length, career tier, and draft
  stage.

### E3 — The proposed criterion is itself plural and noisy

- **Status:** **Inference**, supported by measurement research; **Critical**.
- Experienced readers can disagree on taste, execution, commercial potential,
  and revision priority. Average ratings can reverse preferences under some
  human-evaluation designs (A13); agreement coefficients depend on design and
  target interpretation (A19–A21); expert/domain match matters (A22, A23).
- **Required design:** predefine constructs separately—observable defect,
  severity, revision priority, overall readiness, likely usefulness—and report
  rater distributions/uncertainty. Do not manufacture one “ground truth” label
  by averaging incompatible questions.

### E4 — Evaluation must test decisions, not only rank order

- **Status:** **Inference**; **Major**.
- AUC can show ordering but not calibration, threshold fitness, subgroup harm,
  or whether the recommended revision helps. Narrative-evaluation benchmarks
  show poor metric-human correlation and failures on discourse perturbations
  (A10–A12).
- A credible P1 needs held-out ranking plus threshold confusion matrices,
  uncertainty, abstention coverage, subgroup/format slices, adversarial
  transformations, and decision consequences. For issue-level feedback, test
  localization, precision/recall against reader-marked evidence, and accepted
  usefulness separately from the global score.

### E5 — Model-assisted deep reports need a different reliability study

- **Status:** **Fact** about lineage; **Inference** about evaluation; **Major**.
- Deep read replaces six scene fields with model outputs, with provider/model,
  prompt version, cache, fallback scenes, and stochastic service behavior.
- Quick and deep should not share a validity claim merely because they end in
  the same deterministic formula. Deep evaluation must vary model versions,
  reruns, prompt-injection-like script content, malformed/fallback patterns, and
  provider outages, then report how often the score/verdict changes.

### E6 — Revision-outcome data can be badly confounded

- **Status:** **Hypothesis**; **Major**.
- If writers revise after seeing a finding and the score improves, that does not
  prove the script improved: the writer may optimize to known rules, submit a
  longer draft, or trigger fewer detectors. If readers then see both versions
  or know the tool recommendation, expectancy effects enter.
- **Required study:** blinded paired evaluation of original/revision, randomized
  note exposure where ethical and feasible, preregistered outcomes, and a holdout
  never used for threshold or prompt iteration.

---

## Pass F — Adversarial red team

**Independent question:** How could a malicious, careless, or merely unlucky
actor make the system spend excessively, destroy state, disclose content, or
produce a confidently misleading success?

### F1 — The easiest destructive action looks like a normal restore

- **Status:** **Fact**; **Critical**.
- An accepted-version body with non-empty but malformed nested arrays passes
  shallow request validation, triggers destruction, then can fail on database
  constraints. No exploit sophistication is required; corruption or an old
  client is enough.
- **Abuse/failure result:** integrity loss with an ordinary 500 response and no
  rollback. This is a noncompensable gate failure.

### F2 — Request limiting does not bound provider spend

- **Status:** **Fact**; **Critical in AI-enabled deployments**.
- `/api/turn`, `/api/simulate-to-fountain`, and the provider test use the
  ordinary limiter despite model calls. Simulation can fan out across turns
  and agents, so a request-count budget is not a call/token/cost budget.
- **Adversarial result:** a caller can remain under the HTTP allowance while
  multiplying provider work. Enforce endpoint classification and engine-level
  call/token/time ceilings; a stricter edge limiter alone is insufficient.

### F3 — Docker context bypasses the repository's ignore assumptions

- **Status:** **Fact**; **Critical**.
- No `.dockerignore` exists and the builder executes `COPY . .`. Ignored
  `.env*`, runtime `data/`, local logs, `.git`, attachments, and host
  dependencies can cross into a local or remote build context/cache even if
  selective final-stage copies omit them.
- **Adversarial result:** ordinary image building can become unintended draft or
  credential exfiltration. Host `node_modules` can also overwrite Linux-built
  native dependencies and create platform-specific failure.

### F4 — Session capability leakage equals session takeover

- **Status:** **Fact**; **Major**.
- A session ID is authorization; SSE carries it in a query string; there is no
  owner, rotation/revocation, role, or audit identity, and missing identity can
  fall back to a shared default.
- **Adversarial result:** copied URLs, browser history, support traces, proxy
  logs, or a future referrer regression can disclose full read/write authority.
  This model can be bounded for private trials but cannot silently become a
  public/team authorization design.

### F5 — Deep-read prompt defenses are real but not a validity proof

- **Status:** **Fact** about mitigations; **Inference** about residual risk;
  **Major**.
- The module treats scene text as hostile data, uses temperature zero, accepts
  strict bounded JSON, rejects mismatched scene IDs/extra fields, sanitizes
  strings, and has a hostile-input regression test. This materially reduces
  conventional injection/output risks.
- It does not prove that a screenplay cannot semantically manipulate the
  model's permitted six ratings while still returning valid JSON. Because those
  fields affect deterministic findings, adversarial-evaluation evidence—not
  prompt wording alone—is needed before calling deep judgments robust (G05).

### F6 — Raw provider errors can cross into operational logs

- **Status:** **Fact**; **Major**.
- `/api/ai-config/test` sanitizes the HTTP response but logs the raw error.
  Provider errors may contain sensitive URLs, headers, identifiers, or request
  context; exploitability varies by provider.
- **Failure result:** a well-defended client boundary can still leak secrets or
  screenplay context into longer-lived operator logs.

---

## Pass G — Security and privacy lead

**Independent question:** Can confidential screenplay data be processed with a
defensible threat model, least privilege, transparent lifecycle, and safe
failure?

### G1 — Security controls are strong but the confidentiality contract is absent

- **Status:** **Fact**; **Critical public-launch gate**.
- Strong controls include server-side provider keys, boolean-only public config,
  keyless deterministic operation, zod and body/resource guards, SSRF redirect
  checks, CSP, non-root execution, structured logging, and restricted metrics/
  config mutation. These should be preserved.
- The product does not state an enforceable writer-facing contract for storage,
  provider transfer, training/retention, backups, deletion, encryption at rest,
  access, subprocessors, or incidents. FTC guidance emphasizes that both broken
  promises and material omissions about confidential data can matter (G08).
- **Inference:** This is a governance/control-evidence gap, not proof of a legal
  violation. Promises must follow deployed controls, not lead them.

### G2 — Privacy posture changes discontinuously between quick and deep modes

- **Status:** **Fact**; **Major**.
- Quick Doctor is keyless server-side computation. Deep Doctor sends batches of
  scene text to whichever provider the deployment selects. The UI explains
  that AI reads scenes but not provider-specific retention, training,
  jurisdiction, subprocessor, or deletion behavior.
- **Required contract:** name the processor path at consent time, state what is
  sent and why, bind it to provider/deployment policy, and preserve the chosen
  lineage in exports. “Uses your key” does not answer data-use questions.

### G3 — Content integrity belongs in the security boundary

- **Status:** **Fact**; **Critical**.
- Import deletion-before-validation, title-page loss, split authorities, and
  incomplete “full” export threaten availability and integrity of confidential
  work even without an attacker.
- **Inference:** Security review must treat a screenplay like a high-value
  document asset: confidentiality, integrity, availability, recoverability, and
  provenance are coequal. A privacy notice cannot compensate for unsafe restore.

### G4 — Bearer sessions are a deliberately limited trial architecture

- **Status:** **Fact**; **Major**.
- High-entropy possession-based session IDs can support no-signup testing if
  exposure is bounded. They do not supply identity, ownership, revocation,
  multi-user permissions, or accountability.
- **Disposition:** state this ceiling explicitly. Do not add teams, public
  sharing, or valuable persistent libraries until authorization is redesigned.

### G5 — Build and release controls do not preserve a complete supply-chain record

- **Status:** **Fact**; **Major**.
- Release uses mutable major-version action tags, publishes images without an
  SBOM/signature/provenance attestation, and does not boot-test the built
  container. The absent `.dockerignore` also exposes local data to the build
  boundary.
- **Inference:** The current pipeline is reasonable source regression assurance,
  not a verifiable software supply-chain story for confidential-document
  processing.

### G6 — Data minimization is not yet a product capability

- **Status:** **Inference**; **Major**.
- The server stores per-session SQLite files by default, loaded sessions can
  outlive disk cleanup timing, backups are optional, and there is no prominent
  self-service deletion/retention control. Multiple state stores make it hard to
  prove deletion completeness.
- A data inventory must distinguish script body, title/contact, analysis,
  history, model cache, collaboration state, logs, backups, and exports, with a
  tested erasure result for each.

---

## Pass H — Operator / SRE / support lead

**Independent question:** Can a small team deploy, monitor, restore, upgrade,
support, and control cost without hidden manual knowledge?

### H1 — Backup and restore are not an operable runbook

- **Status:** **Fact**; **Critical**.
- JSON export/import is incompatible and lossy; SQLite backup is more complete
  but is a separate operational mechanism; Yjs and title data remain outside a
  full durable snapshot. No one operation demonstrates restore into a clean
  current release.
- **Operator implication:** A backup is not an assurance until automated restore
  verification proves content, schema migration, editor state, and critical
  counts/hashes after recovery.

### H2 — The shipped artifact is not the artifact CI tests

- **Status:** **Fact**; **Major**.
- CI tests source and Vite output. Release then builds an Alpine image with
  native SQLite, copied development dependencies, `npx tsx` TypeScript startup,
  non-root permissions, a volume, and a health check, but does not boot/smoke
  that image before publication.
- **Operator implication:** Native-module, permission, startup, static asset,
  data-volume, and health failures can appear only after green release gates.

### H3 — Multi-instance operation is undefined

- **Status:** **Fact**; **Major**.
- Session cache, turn queue, collaboration rooms, and deep-read cache are
  process-local; SQLite is local filesystem state. There is no documented
  leader, shared store, or routing requirement.
- **Operator implication:** The safe supported topology should remain explicitly
  single-node until tested otherwise. Autoscaling is not a free reliability
  improvement here.

### H4 — Provider cost/latency has no end-to-end budget

- **Status:** **Fact**; **Major**.
- Some routes cap batches and timeouts locally, which is good, but several
  generative endpoints are on the wrong edge limiter and room/simulation work
  fans out. The route does not expose an operator-level maximum cost or provider
  call count per workflow.
- **Required operations control:** per-request and per-session call/token/time
  budgets, concurrency/backpressure, cancellation, metrics, and a degraded-mode
  contract. Rate per IP is only one layer.

### H5 — The visible Settings panel creates support tickets by design

- **Status:** **Fact**; **Major**.
- Remote/token-protected deployments correctly reject config writes without an
  admin token, while browser Test/Save sends no token and remains visible.
- **Operator implication:** Users see a control that cannot work in a secure
  deployment. Operator-only config should be deployment-managed or backed by a
  real admin session, with UI capability discovery.

### H6 — Test isolation is incomplete

- **Status:** **Fact**; **Major**.
- The opt-in HTTP journey can write its session DB into the normal ignored
  `data/` directory because it does not supply a temporary `SESSION_DB_DIR`.
- **Operator implication:** A test can pollute local validation/production-like
  state, contaminate backups, and confuse cleanup. Every integration run needs
  an explicit ephemeral namespace and teardown assertion.

---

## Pass I — Skeptical investor / executive

**Independent question:** Is there a credible evidence-to-value path, a
defensible asset, disciplined capital allocation, and bounded downside?

### I1 — The project has high technical supply and zero direct demand evidence

- **Status:** **Fact**; **Critical**.
- The repository census exceeds 370,000 mixed source/test/doc lines, includes a
  large dual product and extensive tests, and recorded extraordinary recent
  churn. P0 still has zero recruited or completed writer sessions.
- **Inference:** The central execution risk is building faster than the
  organization learns. More engineering can reduce runway while increasing the
  cost of changing a thesis that has not been observed.

### I2 — The core score is a reputational liability before it is an asset

- **Status:** **Fact** about evidence; **Inference** about enterprise value;
  **Critical**.
- The writer-facing score/verdict/percentile has synthetic calibration and weak
  internal rule-channel discrimination. Reproducibility makes the same claim
  repeatable; it does not make the claim correct.
- A false “ready/not ready” judgment can damage a user's opportunity and invite
  claim scrutiny. NIST calls for validity/reliability under deployment-like
  conditions (G02), and FTC guidance expects evidence behind AI performance
  claims (G07).

### I3 — Strategy provenance failure is a governance warning

- **Status:** **Fact**; **Major**.
- Canonical documents asserted a 5,701-rule Wave 1191 expansion and 8,917-rule
  catalog that git history and the generated rulebook contradict. The false
  narrative then informed strategy and maintenance claims.
- **Inference:** This indicates decision-memory controls are insufficient in a
  high-churn, agent-heavy development process. Executable facts, decision logs,
  named owners, and supersession controls are required before scale.

### I4 — Receipts and rights-clean evidence are the plausible defensible assets

- **Status:** **Hypothesis**; **Major opportunity**.
- Rule count is easy to imitate and does not currently discriminate. A
  consented corpus of writer intent, independent expert judgments, disagreement,
  accepted evidence, revision choices, and blinded outcomes is harder to build.
  A versioned receipt/provenance system could make that evidence auditable.
- **Constraint:** Dataset rights, compensation, privacy, representativeness, and
  leakage prevention are part of the asset; shortcuts destroy its value.

### I5 — The best near-term business option preserves reversibility

- **Status:** **Inference**; **Major**.
- A narrow reflective diagnostic can preserve the deterministic engine and
  receipts while withholding unsupported authority. It can be tested as a
  product, service, or pre-reader triage tool without committing to a regulated
  or high-liability automated-decision position.
- A broad dual platform and global “coverage judge” make the opposite choice:
  high fixed surface, ambiguous buyer, and expensive proof.

### I6 — Market numbers must remain vendor claims

- **Status:** **Fact**; **Major governance point**.
- Greenlight currently claims 36,000+ writers and 15-minute coverage and lists
  $75/month for two scripts; other vendors list roughly $19–$79 AI coverage and
  human services start around $185 (current first-party pages; P02–P06).
- **Inference:** These numbers show category activity and price anchors, not
  market size, retention, margins, or efficacy. They cannot substitute for
  STORYMACHINE's demand evidence or justify a valuation narrative.

---

## Pass J — Direct competitor / market challenger

**Independent question:** How would a capable competitor neutralize the pitch,
and where is STORYMACHINE meaningfully differentiated or exposed?

### J1 — “Instant AI coverage” is already commoditized positioning

- **Status:** **Fact**; **Critical positioning gap**.
- Vendors publicly offer fast AI reports, multiple scores, market/comps outputs,
  pass/consider/recommend, rewrites, and broad feature lists at low-to-mid price
  points (P03–P06). Another vendor now advertises a 15-minute workflow and a
  subscription plan. These are observable offers, not effectiveness evidence.
- **Competitor move:** match the checklist and undercut price. STORYMACHINE's
  rule count and raw speed do not defend the category.

### J2 — Privacy claims are competitive table stakes

- **Status:** **Fact** about market messaging; **Major**.
- Direct competitors prominently make private/no-training claims (P03, P05),
  whether or not their pages independently prove the controls. STORYMACHINE has
  strong local/server boundaries but no equivalent complete, enforceable public
  contract.
- **Competitor move:** exploit the uncertainty: “Why upload an unpublished
  script where retention and provider use are not stated?” Silence loses even
  against unverified marketing.

### J3 — Human alternatives own accountability and conversation

- **Status:** **Fact** about offerings; **Major**.
- Human coverage sells genre-selected readers, substantial reports, ratings,
  and follow-up (P02); peer exchange offers reciprocal notes and community
  mechanisms (P01). Those alternatives provide identity, dialogue, or social
  accountability that a generic scalar lacks.
- **Competitor move:** frame the automated verdict as taste without an
  accountable reader. STORYMACHINE must either demonstrate complementary value
  or add a real escalation relationship, not imitate a reader in copy alone.

### J4 — Inspectable receipts are the difficult-to-copy differentiator

- **Status:** **Fact** about capability; **Hypothesis** about market value;
  **Major opportunity**.
- Located evidence, content/build hashes, deterministic recomputation,
  before/after issue deltas, and keyless quick analysis are stronger trust
  mechanisms than an opaque PDF.
- **Competitor response:** dismiss them as engineering detail unless writers
  use them to make better revisions. P0/P1 must convert receipts into observed
  decision value.

### J5 — Product breadth is easy to weaponize against clarity

- **Status:** **Fact**; **Major**.
- A competitor can explain one promise—human notes, instant coverage, or peer
  exchange—while STORYMACHINE presents coverage, editor, simulation, production,
  research, and many expert panels.
- **Competitor move:** position STORYMACHINE as a complicated lab rather than a
  tool that solves tonight's revision. Surface collapse is a positioning
  necessity if the target remains the pre-reader writer.

### J6 — Evidence honesty can itself become positioning

- **Status:** **Hypothesis**; **Major opportunity**.
- Competitor quantitative/“professional equivalent” claims often lack public
  independent validation details (P03–P06). STORYMACHINE could publish
  limitations, benchmark protocol, uncertainty, failures, and verifiable
  receipts instead of joining the claim arms race.
- **Risk:** honesty differentiates only if the underlying workflow is useful;
  caveats alone are not a product.

---

## Pass K — Regulator / legal-risk reviewer

**Independent question:** Which claims, data practices, user groups, and
jurisdictions require legal classification or evidence before public use?

### K1 — Quantitative quality claims need a documented substantiation file

- **Status:** **Fact** about current claim/evidence mismatch; **Critical risk
  flag**, not a legal conclusion.
- The UI presents health/100, grade, verdict, and percentile against a synthetic
  reference; product copy has used rule count as authority. The project lacks a
  deployment-like expert benchmark for those interpretations.
- FTC guidance says AI performance and superiority claims require evidence and
  has pursued unsupported quantitative AI claims (G07). Before public marketing,
  counsel should review every quality, comparison, “industry,” objectivity,
  privacy, and reproducibility statement against retained substantiation.

### K2 — Confidential-input disclosures are materially incomplete

- **Status:** **Fact**; **Critical risk flag**.
- Screenplays can be persisted and, in deep mode, transferred to providers;
  product-facing terms do not specify use, retention, deletion, training,
  subprocessors, or jurisdiction. FTC primary guidance states that confidential
  inputs, promises, undisclosed secondary use, and material omissions can create
  enforcement risk (G08).
- **Needed review:** actual deployment data map, privacy notice, terms,
  provider contracts, consent flow, retention/deletion, backup/log behavior,
  incident plan, and applicable U.S. state/EU/UK obligations.

### K3 — EU AI Act timing is immediate, but classification is unresolved

- **Status:** **Fact** about law/date; **Unresolved legal applicability**;
  **Major**.
- Regulation (EU) 2024/1689 generally applies from 2026-08-02, with some
  provisions already applicable and others later. That date is imminent relative
  to this audit. The exact provider/deployer role, territorial scope, risk class,
  transparency duties, and feature treatment require fact-specific counsel; this
  audit does not classify STORYMACHINE as high-risk (G11; official EUR-Lex text).
- **Operational implication:** do not wait for a broad launch to inventory AI
  components, purposes, models, instructions, training/data sources, incidents,
  human oversight, and user disclosures.

### K4 — Writer-work training sensitivity has increased

- **Status:** **Fact** about professional-contract context; **Inference** about
  trust; **Major**.
- The WGA's current 2026 MBA FAQ says companies must notify the Guild in writing
  if they license writers' work to train a commercial GAI system, while
  preserving 2023 protections (G12 plus the 2026 official FAQ). This is an
  MBA-specific rule, not a universal product-law conclusion.
- **Inference:** Professional users will reasonably scrutinize any draft reuse,
  fine-tuning, evaluation, human review, or provider training. Explicit
  no-secondary-use controls and consent choices are a product requirement even
  where this MBA provision does not directly apply.

### K5 — Generated rewrites need an authorship/rights contract

- **Status:** **Inference**; **Major unresolved question**.
- Optional fixes can generate replacement text using a third-party model.
  Current U.S. Copyright Office guidance distinguishes human-authored selection,
  arrangement, and modification from purely AI-generated expression and is not
  a case-specific ruling (G09). Training/licensing law is still evolving (G10).
- Terms and UI should address user input rights, provider terms, output
  ownership disclaimers, human authorship/control, similarity concerns, and
  user responsibility without promising legal status the product cannot know.

### K6 — Accessibility requires concrete conformance work, not a generic claim

- **Status:** **Fact** about gaps; **Major risk flag**.
- Core overlays lack tested dialog/focus behavior and there is no browser/axe
  gate. WCAG 2.2 is a current W3C Recommendation with testable focus,
  input-modalities, and name/role/value criteria (G06).
- Applicable legal duties depend on market and jurisdiction, but a public claim
  of accessibility should be backed by scoped conformance testing and a known
  limitations/remediation process.

---

## Pass L — Innovation lead

**Independent question:** What higher-value system becomes possible if the team
stops treating the current interface and scalar score as fixed?

### L1 — Reframe the product as a reflective instrument, not an automated judge

- **Status:** **Hypothesis**; **Critical opportunity**.
- Preserve deterministic observables, citations, issue clusters, provenance,
  and before/after verification. Replace the default “quality oracle” with a
  writer-controlled loop: declare revision intent → inspect patterns → compare
  plausible interpretations → choose an action → verify mechanical/structural
  consequences → record the writer's decision.
- Screenwriter research describes desired AI roles including actor, audience,
  expert, and executor rather than one universal authority (A02). Human–AI
  research finds complementarity depends on different information/capabilities,
  not merely combining outputs (A26, A30).

### L2 — Make disagreement a first-class output

- **Status:** **Hypothesis**; **Major opportunity**.
- Instead of one percentile, present separable lenses: deterministic observable,
  conventional craft heuristic, model interpretation, human-reader view, and
  writer intent. Show where they converge, conflict, or abstain.
- This turns a measurement weakness into a useful reflective affordance and
  avoids forcing subjective craft into a fake consensus. It must be tested for
  cognitive overload and anchoring.

### L3 — Build an evidence flywheel around decisions, not detector count

- **Status:** **Hypothesis**; **Major opportunity**.
- With consent, collect which finding a writer viewed, understood, disputed,
  acted on, and found useful; then obtain blind expert comparisons on selected
  original/revised pairs. Preserve version, format, intent, reader background,
  and disagreement.
- The defensible artifact becomes rights-clean longitudinal decision evidence
  plus a reproducible receipt schema, not another permutation catalog.

### L4 — Separate local observability from remote interpretation

- **Status:** **Inference**; **Major opportunity**.
- Quick deterministic analysis can remain a private, low-cost local/server
  substrate. Provider-backed deep interpretation should be a clearly separate,
  consented lens with named provider/model, bounded fields, provenance,
  fallbacks, and no authority to silently mutate the draft.
- Future on-device or user-chosen-provider options could reduce confidentiality
  friction, but their feasibility, model quality, and support cost are
  unresolved.

### L5 — Use human escalation to solve the cold-start evidence problem

- **Status:** **Hypothesis**; **Major opportunity**.
- A writer could escalate a disputed/high-impact issue to an experienced reader
  who sees the exact evidence and writer question, not an undifferentiated full
  report. This creates accountability and labels on the cases automation finds
  hardest.
- The model is only attractive if unit economics, reviewer quality,
  compensation, rights, turnaround, and non-bias can be demonstrated.

### L6 — Treat OASIS as an experimental sensor laboratory

- **Status:** **Hypothesis**; **Moderate opportunity**.
- The simulation engine may produce useful counterfactual questions—how a
  character could act under altered knowledge, pressure, or goals—without
  remaining a second public product. Behind Labs, it can generate hypotheses a
  writer chooses to explore, while Doctor stays evidence-focused.
- This preserves technical option value without contaminating P0 positioning or
  granting simulated behavior evidentiary status it has not earned.

---

## Cross-pass convergence and divergence

This table was produced only after all raw passes above were complete.
“Convergence” records independent recurrence; it does not convert inference into
fact. Pass letters identify where the theme arose for materially different
reasons.

| Theme | Passes | Convergence | Meaning for later synthesis |
|---|---|---|---|
| Scalar/verdict authority exceeds validation | A, C, D, E, I, J, K, L | Very high | Treat score-claim honesty as noncompensable. Software determinism and 9,000+ passing tests cannot compensate for absent real-writing validity. |
| Writer intent and document form are missing from Doctor | A, D, E, L | High; strongest new cross-pass discovery | The flagship request is not merely under-validated; it omits variables needed to define the task. P1 must not benchmark one form-blind global instrument as if all submissions shared one use. |
| Content/state integrity is below a trust product's floor | A, B, D, F, G, H | Very high | Transactional import/restore and a named authoritative aggregate are prerequisites, not UX polish. |
| Confidential-draft contract is incomplete | C, D, F, G, J, K, L | Very high | Strong internal controls do not replace informed data-use, retention, deletion, and provider disclosures. Public launch remains gated. |
| Product thesis is diluted by OASIS/breadth | B, C, D, I, J, L | High | Narrow the validation surface. Architectural separation and market positioning are related but distinct work. |
| Route/cost classification is not enforceable | B, F, G, H | High | Replace manual limiter convention with mandatory route capability metadata and engine call budgets. |
| Receipts/located evidence are the strongest preserved asset | A, C, D, I, J, L | Very high positive convergence | The likely differentiated route is reflective, inspectable assistance. Whether writers value it is still a hypothesis for P0. |
| Human expertise/disagreement remains necessary | A, C, E, J, L | High | Build plural labels and optional escalation; do not replace disagreement with an averaged pseudo-truth. |
| Deployment topology/supply-chain limits are under-specified | B, F, G, H | High | Explicitly support single-node until multi-instance semantics are designed; test the shipped container and protect build context. |
| Canonical provenance failure is a governance risk | B, C, I | Medium but severe | Executable facts and decision logs must outrank narrative memory. Correct the rule history without using it as a reason to unfreeze rule growth. |
| Accessibility is an untested critical-path property | D, G, K | Medium | Add a shared modal contract and browser keyboard/accessibility gate; avoid unsupported conformance claims. |
| Service/human-assisted path could create evidence | C, I, L | Medium opportunity convergence | Credible but unproven. It may solve trust/data cold start, while adding operations, bias, rights, and unit-economic risk. |

### Material divergences retained

| Question | Position 1 | Position 2 | Resolution status |
|---|---|---|---|
| Should the global score remain visible during validation? | Domain/product/user passes favor withholding or demoting it because it anchors trust before validity. | Data/innovation could retain it as an explicitly experimental research variable to study calibration and disagreement. | **Unresolved.** Safest default is evidence-first with scalar exposure randomized or separately consented in research, not presented as established truth. |
| Is human-assisted coverage the destination or a bridge? | Product/investor/innovation see a potential service that creates trust and proprietary evidence. | Competitor/operator views warn it may validate the human, create high cost, and distract from software. | **Unresolved.** Test as a bounded evidence-acquisition option with unit economics and attribution designed in advance. |
| Is OASIS strategic option value or pure distraction? | Innovation sees a useful Labs counterfactual sensor. | Product/user/competitor passes see present exposure as thesis dilution and cognitive burden. | **Both can be true.** Preserve implementation option value, remove it from the default validation surface, and grant its outputs no unearned evidence status. |
| Is bearer-session architecture acceptable? | Security/architecture regard it as an explicit ceiling, insufficient for public/team use. | Product strategy can tolerate it for tightly controlled, no-signup P0 trials. | **Context-dependent.** Accept only with bounded exposure, accurate disclosure, deletion/rotation, and no silent scope expansion. |
| Does deep read “judge”? | Implementation language says the model senses and rules judge. | Domain/red-team/data passes note that model-produced values causally alter judgments. | **Precision correction needed.** It is model-assisted measurement with deterministic aggregation; lineage and residual semantic-manipulation risk must remain visible. |

## Strongest non-obvious discoveries

1. **Intent blindness is an implemented contract, not merely a UX omission.**
   The Doctor endpoint cannot receive the writer's revision question and does
   not pass the engine's existing `StoryContext`. This calls into question what
   a “correct” report means before any threshold is evaluated.
2. **The scene-scarcity formula implicitly encodes a document-type policy.** A
   no-issue submission with fewer than ten scenes cannot reach RECOMMEND, yet
   the system does not know whether it was given a feature, pilot, short,
   excerpt, teaser, or partial draft. Format/completeness can masquerade as
   quality.
3. **Deep read's deterministic tail does not make the judgment
   model-independent.** Six LLM-produced semantic fields enter the rule engine;
   the current lineage separation is a strength, while “sensing not judging” is
   too categorical.
4. **Restore is a false assurance, not only a bug.** The publicly described
   “full session” mechanism is incompatible, incomplete, and destructively
   ordered. It can cause a rational user to take more risk than if no backup
   feature existed.
5. **The codebase's likely moat is its receipt substrate.** Six different
   perspectives independently selected located evidence, hashes, lineage, and
   before/after verification as more defensible than rule quantity, speed, or a
   scalar verdict. This remains a product hypothesis, not validated demand.

## Perspective-pass limitations

- These are disciplined analytic standpoints, not interviews with twelve
  external people. Independence was achieved by separate objectives and delayed
  synthesis, not by independent human authorship.
- No new screenwriter sessions, expert ratings, provider calls, production
  deployment, legal opinion, accessibility assistive-technology session, or
  competitor purchase was performed.
- Repository line references reflect the 2026-07-14 snapshot and can drift under
  the project's high commit rate.
- Current vendor pages support only offers and claims. Current law/standards
  pages support dates/text and risk identification; applicability and compliance
  require qualified, fact-specific review.

## AI-assistance disclosure

AI-assisted repository inspection, research retrieval, comparison, and drafting
were used. The high-impact repository claims listed in the verification section
were rechecked directly, and unstable external facts were re-opened at official
or first-party sources on the audit date. No confidential screenplay content or
secret value was opened or reproduced.
