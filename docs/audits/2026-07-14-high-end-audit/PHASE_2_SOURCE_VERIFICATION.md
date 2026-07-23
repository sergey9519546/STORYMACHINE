# High-End Audit — Phase 2 Source Verification Report

- **Mode:** Deep Research `full`
- **Phase boundary:** Investigation / source-verification agent only
- **Verification date:** 2026-07-14 (America/Los_Angeles)
- **Inputs:** [`PHASE_1_SCOPE.md`](./PHASE_1_SCOPE.md),
  [`PHASE_2_BIBLIOGRAPHY.md`](./PHASE_2_BIBLIOGRAPHY.md), and
  [`SOURCE_REGISTER.md`](./SOURCE_REGISTER.md)
- **Downstream boundary:** This report verifies evidence. It does not synthesize
  a product recommendation or make a Phase 3–6 decision.

## Overall assessment

**Sources reviewed:** 48/48  
**Existence confirmed:** 48 | **Unverifiable:** 0 | **Fabricated:** 0 |
**Rejected:** 0  
**Sources carrying an explicit use caveat or incentive flag below:** 23/48. These are
verified sources, not rejected sources; the flags constrain what they may prove.

The corpus passes the reference-existence gate. It also passes the minimum
source-diversity and peer-review-share checks stated in Phase 1. The most
important source-quality correction is **A16**, which is better classified as a
Level V structured descriptive review, not a Level I systematic review under the
protocol's own criteria. Its overall Grade B and bounded substantive use remain
reasonable.

No DOI misdirection, impossible publication date, invented venue, duplicate
publication, retraction, or predatory-journal signal was found. The evidence is
nevertheless materially uneven: only A02 is directly population-aligned with
screenwriters' current practices, and even it is a small qualitative study. The
competitor corpus confirms page content, not efficacy, confidentiality in
operation, demand, retention, or outcomes.

## Verification audit trail

### Tier 0 — Semantic Scholar

The bibliography's earlier unauthenticated Semantic Scholar run degraded after
seven results. An independent retry used the Graph API batch endpoint. It
returned exact-DOI records for **30/31 DOI-bearing records submitted**: 28
academic papers and both NIST publications. Titles and years matched the
publication record after accounting for ordinary subtitle and online-first
variants. A18 returned `S2_NOT_FOUND`; that is not an existence failure because
Crossref, APA metadata, and OpenAlex independently resolve it. A10 has no
Crossref DOI; its title search was rate-limited (`HTTP 429`) and therefore
degraded to the official ACL Anthology record as required by the protocol.

| ID | Semantic Scholar paper ID | Result note |
|---|---|---|
| A01 | `fb97a1703fe9556c68deabfa29d7aed91489bb96` | Exact DOI/title/year |
| A02 | `326799a6c8b542f2cabd28fcc32f0ea7b45dcc29` | Exact DOI/title/year |
| A03 | `f9b16559282e5bea0bb072f9e260a4f0af697f4a` | S2 carries 2022 preprint year; Crossref proceedings year is 2023 |
| A04 | `f02c487572472dd20d064f0755b85b7e1aacf86f` | Exact DOI/title/year |
| A05 | `7c9f4bece05a3c44f9c6daf65fc33f16ed571e12` | S2 includes the paper's subtitle; same DOI/work |
| A06 | `fb5c11bbf63884f75d2da615fbf37a3bcfa2bd20` | Exact DOI/title/year |
| A07 | `2b5d234efd26e7377698cf16c901601a3d3c4e56` | Exact DOI/title/year |
| A08 | `a5c721f4e081b040d57676cf34c9c70b774656db` | Exact DOI/title/year |
| A09 | `1315fece67d85d41a3f94523b1bb4ba12468992b` | Exact DOI/title/year |
| A11 | `11dda1081d32b607ea89b7e1028052af5583b25d` | Exact DOI/title/year |
| A12 | `7ffc1b425026e916cd6db37c79df3e08e8f47ee6` | Exact DOI/title/year |
| A13 | `20eca4866bb257b8d701bc7c9b19864b7c05bc23` | Exact DOI/title/year |
| A14 | `d1aa325a5adefeba786d4c50a8ca9a8df9598f32` | Exact DOI/title/year |
| A15 | `a28071c63963cc59ba500cd00c140ac08eb5ccb0` | Exact DOI/title/year |
| A16 | `81292710fff321030c0dfc57824b63ff1c9d251b` | Exact DOI/title/year; published March 2026 |
| A17 | `923e08564400d1f19bdb54de9afa6f5360aa56fc` | Exact DOI/title/year |
| A19 | `e3ee8537cead698052a101cd6c5925d08820f6f2` | Exact DOI/title/year |
| A20 | `69d59eba999f754ea7c88b69c0b34c0208a54cfa` | Exact DOI/title/year |
| A21 | `33122fc2f544888a0f46dd221a783ad1ecc1ddad` | Exact DOI/title/year |
| A22 | `b29b7876812ca7346dfe19b1ee06e02e37dc0fab` | Exact DOI/title/year |
| A23 | `579fbfa1558e0f323e20608ebb36c9293ce9f6d5` | Exact DOI/title/year |
| A24 | `7dd86508438657ac7a704a5d952a2a4422808975` | Exact DOI/title/year |
| A25 | `0072959e028aadf81e55353d3be7bd4f95e447e4` | S2 online-first year is 2023; issue record is 2024 |
| A26 | `02aec976011a7d595d61db9639209968f4b93177` | Exact DOI/title/year |
| A27 | `65772de56676a6a437c8abaeccef34224f62ee13` | S2 uses the short title; same DOI/work |
| A28 | `e8c2f818ec941005f705a1de26597690420c534a` | S2 online-first year is 2022; issue record is 2023 |
| A29 | `8195bbdc561fa93e9811daf7b34808b80213f89e` | Exact DOI/title/year |
| A30 | `df29a654e19d4551a1e222f019c819b56f8ddd7c` | S2 online-first year is 2024; issue record is 2025 |
| G02 | `9b60187d3b0a0548d411d29b6fbfcc9be95c5e72` | Exact DOI/title/year |
| G03 | `d2f9c1c858c88e8375c310e5e73a287f8d836993` | Exact DOI/title/year |

### Tier 1 — DOI and publication-record verification

- **31/31 DOI-bearing included records resolved through Crossref.** Titles,
  authors, and publication years matched the intended work.
- A10 was verified from the [official ACL Anthology record](https://aclanthology.org/2022.coling-1.509/),
  which supplies title, authors, venue, pages, and full text but no Crossref DOI.
- OpenAlex independently marked all 29 DOI-bearing academic records as not
  retracted. A10's official ACL record showed no withdrawal or retraction notice.
- A05 and A27 have harmless short-title/full-subtitle differences across indexes.
  They are not `DOI_MISMATCH` cases because the DOI, authors, venue, and work all
  coincide.
- No year is in the future relative to the audit date. A16 was published in the
  March 2026 EACL Student Research Workshop.

### Tier 2 — web and primary-page verification

**30/48 sources (62.5%)** received an independent human-readable web check,
exceeding the 50% degraded-index requirement. The checked set was A02, A03,
A05, A06, A10–A17, G01–G12, and P01–P06. Priority went to direct
screenwriter evidence, negative metric evidence, official sources, and every
commercial source.

Important current-state confirmations:

- The [U.S. Copyright Office AI hub](https://www.copyright.gov/ai/index.html)
  still labels G10 **pre-publication** and says a final Part 3 remains future
  work. The bibliography's caveat is current.
- G07's direct FTC blog page remained inaccessible to the retrieval tool, but
  the exact title, author, date, and URL are corroborated in multiple official
  FTC speeches and testimony. It is plausible/official, not unverified.
- Product prices and offerings were visible on the first-party pages on the
  audit date: [CoverflyX](https://coverfly.com/x/),
  [Script Reader Pro](https://www.scriptreaderpro.com/our-script-coverage-services/),
  [Callaia](https://www.callaia.ai/), [ScriptBook](https://www.scriptbook.io/),
  [ScriptCoverage.ai](https://scriptcoverage.ai/), and
  [GetScriptCoverage](https://www.getscriptcoverage.com/). This verifies only
  what those pages say.

## Source quality matrix — academic evidence

`S2V` = `S2_VERIFIED`; `V` = DOI/publisher verified; `P` = plausible from an
authoritative primary record without a Crossref DOI. Venue/author `pass` means
the venue, author set, affiliation trail, and publication record were found and
no retraction/predatory signal appeared. It does not mean every author supplied
an ORCID or that undisclosed conflicts are impossible.

| ID | Exist. | Level | Venue / author | Method and currency | COI / incentive | Overall | Per-claim support verdict |
|---|---|---:|---|---|---|---|---|
| A01 | S2V | VI | Pass; PACMHCI/ACM | Sound qualitative interviews, n=29; current enough | None material found | B | **Supported, bounded:** social trust/affinity shape fanfiction feedback; not professional screenplay coverage or outcomes. |
| A02 | S2V | VI | Pass; CHI 2025 | Sound semi-structured interviews, n=23; very current | **Low–moderate:** one Microsoft Research affiliation; no Microsoft product is tested | B | **Supported, bounded:** directly supports reported screenwriter stages, attitudes, and desired AI roles; not demand, utility, or revision efficacy. |
| A03 | S2V | VI | Pass; CHI 2023 | Small formative study/interviews, n=15; current | **High:** authors built Dramatron; DeepMind employer and developer-evaluator incentives | B | **Supported with prominent caveat:** professional reflections on co-writing, coherence, bias, plagiarism, and control; not automated coverage validity. |
| A04 | S2V | V | Pass; ACL workshop | Theory-grounded descriptive review, not a new sample; 2022 | None material found | B | **Supported as taxonomy:** identifies broad writer-support needs; cannot estimate prevalence or screenwriter demand. |
| A05 | S2V | III | Pass; IUI/ACM | Two controlled case studies; small short-form tasks; older model generation | **Moderate:** authors built and evaluated both prototypes | B | **Supported, bounded:** positive experience can coexist with no necessary artifact improvement; not evidence about screenplay coverage. |
| A06 | S2V | III | Pass; IUI/ACM | Controlled/formative short-story study; 2022 | **High:** Google-affiliated authors built and evaluated Wordcraft | B | **Supported with caveat:** interaction and agency patterns are observed; no long-form revision or coverage outcome. |
| A07 | S2V | VI | Pass; CHI/ACM | Large descriptive interaction dataset: 63 writers, 1,445 sessions; 2022 | **Moderate:** authors built the interface/dataset | A for dataset; B for transfer | **Supported for dataset behavior:** suggestion use and contribution can be separated; transfer to scripts or coverage remains untested. |
| A08 | S2V | V | Pass; IEEE core journal | Structured survey; foundational but pre-transformer | None material found | B | **Supported, foundational:** narrative systems vary by construct and initiative; not current score-validity evidence. |
| A09 | S2V | V | Pass; IEEE Access, valid ISSN/core venue | Broad survey; 2022; review depth is ordinary rather than decisive | None material found | B | **Supported, bounded:** narrative understanding spans multiple representation/reasoning problems; not a screenplay benchmark. |
| A10 | P | III | Pass; official COLING/ACL record | Strong benchmark: 1,056 generated stories, 10 systems, six criteria, 72 metrics | **Moderate intellectual:** authors created HANNA and evaluated it | A | **Supported:** automatic story metrics lack consensus and show weaknesses on generated short stories; not proof about real scripts. |
| A11 | S2V | III | Pass; TACL/MIT Press | Controlled comparison on HANNA; 2024 | **Moderate intellectual:** same benchmark research line | A | **Supported:** better system-level LLM correlation coexists with weak explanations/prompt effects; instance-level screenplay validity is untested. |
| A12 | S2V | III | Pass; ACL | Multi-part benchmark with perturbations; 2021 | **Moderate intellectual:** authors created OpenMEVA | A | **Supported:** tested metrics miss discourse/causal failures and generalize poorly on story-generation data; script transfer is indirect. |
| A13 | S2V | III | Pass; EMNLP/ACL | Explicit utility-theoretic and empirical protocol; 2022 | None material found | A | **Supported:** common rating aggregation can reverse inferred preferences; does not prescribe a screenplay-specific label protocol by itself. |
| A14 | S2V | V | Pass; INLG/ACL | Literature review and method guidance; 2019 but method remains current | None material found | A for method | **Supported:** criteria, raters, instruments, quality control, and statistics must be explicit; not a domain threshold. |
| A15 | S2V | III | Pass; EMNLP/ACL | Thousands of judgments across four perturbation families; 2024 | Ordinary benchmark-author intellectual interest | A | **Supported:** both human and LLM judges exhibit tested biases; screenplay-specific bias coverage remains unknown. |
| A16 | S2V | **V** | Pass; EACL Student Research Workshop | 57 papers; targeted ACL/venue search, two title/abstract screeners, one synthesizer; no study-quality appraisal found | None material found | B | **Supported as a current descriptive survey. Downgraded from Level I:** PRISMA-style flow alone does not meet this protocol's Level I requirements for comprehensive search, quality appraisal, and registered systematic methods. |
| A17 | S2V | VII | Pass; AMPPS/Sage | Methodological critique; 2020 | None material found | A for method | **Supported:** undefined constructs and opaque measurement choices undermine inference; not empirical script validation. |
| A18 | V | VII | Pass; American Psychologist/APA | Foundational validity theory; age is appropriate to the claim | **Low institutional:** author was affiliated with ETS | A | **Supported, foundational:** validity concerns score interpretation/use and consequences, not repeatability alone. |
| A19 | S2V | VII | Pass; TQMP, valid ISSN/core venue | Clear tutorial/examples; 2012 but method remains usable | None material found | A for method | **Supported:** reliability statistic and reporting must match design; no universal screenplay cutoff follows. |
| A20 | S2V | V | Pass; Computational Linguistics/MIT Press | Extensive methodological survey; older but foundational | None material found | A | **Supported:** agreement coefficients and interpretations are not interchangeable; creative ratings may need additional modeling. |
| A21 | S2V | VII | Pass; Elsevier/PMC-indexed journal | Practical guideline covering 10 ICC forms; 2016 | No material commercial COI found | A for method | **Supported:** ICC model/type/definition/CI must match the claim; heuristic cutoffs are not screenplay standards. |
| A22 | S2V | III | Pass; Creativity Research Journal | Comparative creativity-rating study; older but directly methodological | **Low–moderate intellectual:** authors are CAT researchers/advocates | B | **Supported with transfer caveat:** nonexpert ratings were less consistent and differed from experts in the studied domain; not screenplay criterion validity. |
| A23 | S2V | III | Pass; Journal of Creative Behavior | Comparative domain/expertise study; foundational | **Low–moderate intellectual:** authors are CAT researchers/advocates | B | **Supported with transfer caveat:** domain expertise affects consistency; consensus can still encode shared convention/bias. |
| A24 | S2V | V | Pass; Human Factors/Sage | Integrative review; age is appropriate to foundational claim | None material found | A | **Supported, foundational:** design should target calibrated reliance rather than maximal trust; modern screenplay transfer needs testing. |
| A25 | S2V | I | Pass; ACM JRC | PRISMA-informed systematic review; 2024 issue | None material found | A | **Supported:** trust, reliance, and calibration constructs/measures are fragmented; no specific UI intervention is thereby validated. |
| A26 | S2V | I | Pass; Nature Human Behaviour | Systematic review/meta-analysis, 100+ experiments and 370 effects; 2024 | None material found | A | **Supported:** average augmentation does not imply average synergy over the stronger member; task heterogeneity limits screenplay transfer. |
| A27 | S2V | III | Pass; PACMHCI/ACM | Controlled experiment, n=199; 2021 | **Moderate:** authors designed and evaluated interventions | A | **Supported:** cognitive forcing can reduce overreliance while reducing preference; artificial decision-task transfer requires writer study. |
| A28 | S2V | II/III | Pass; PACMHCI/ACM | Five controlled studies, n=731; 2023 issue | **Moderate:** authors designed and evaluated the paradigm | A | **Supported:** verification depends on explanation/task cost and incentives; objectively checkable maze tasks differ from creative judgment. |
| A29 | S2V | II | Pass; JEP: General/APA | Controlled forecasting experiments; foundational | None material found | A | **Supported:** visible error can drive algorithm underuse; later work and subjective creative tasks limit universality. |
| A30 | S2V | III | Pass; European Journal of Information Systems | Formal framework plus two empirical studies; very recent | **Moderate:** IBM affiliations create an industry-AI incentive | B | **Supported with caveat:** capability/information asymmetry make complementarity testable; screenplay transfer is untested. |

## Source quality matrix — official and professional sources

For governing texts and standards, Level VII describes study design, not lack of
authority. Their grades concern fitness for the bounded legal, standards, or
professional-practice claim; they do not prove product compliance.

| ID | Exist. | Level | Authority / method | Currency | COI / incentive | Overall | Per-claim support verdict |
|---|---|---:|---|---|---|---|---|
| G01 | Primary verified | VII | Joint AERA/APA/NCME standard; open-access primary page | 2014 edition remains the cited governing standard | Institutional standards mandate; AERA also sells print copies | A | **Authoritative for testing practice:** supports validity/reliability/fairness requirements; cannot show STORYMACHINE satisfies them. |
| G02 | S2V + primary | VII | NIST AI 600-1; editorially reviewed government profile | 2024; current | Public-agency mandate | A | **Authoritative guidance:** supports lifecycle GAI governance/risk actions; voluntary, broad, and not certification. |
| G03 | S2V + primary | VII | NIST SP 800-218A; government SSDF profile | 2024; current | Public-agency mandate | A | **Authoritative guidance:** supports secure AI development/acquisition practices; not a product threat model or control test. |
| G04 | Primary verified | VII | OWASP expert/community API taxonomy; no contributed prevalence dataset | 2023 edition; current enough | Nonprofit/community process | B | **Supported as risk taxonomy:** not prevalence evidence, exhaustive control standard, or compliance proof. |
| G05 | Primary verified | VII | OWASP sponsored community LLM taxonomy | 2025; current | Sponsored project; states vendor neutrality | B | **Supported as risk taxonomy:** not quantified prevalence or proof that listed mitigations are present/effective. |
| G06 | Primary verified | VII | W3C Recommendation and testable success criteria | 12 Dec 2024; current | Consensus standards body | A | **Authoritative technical standard:** supports accessibility criteria; conformance alone does not establish complete usability. |
| G07 | Officially corroborated | VII | FTC business guidance; exact page blocked, metadata corroborated in official FTC testimony/speeches | 2023; still relevant to claims | Enforcement mandate | B | **Supported as regulator guidance:** performance/superiority claims require substantiation; nonbinding and not legal advice. |
| G08 | Primary verified | VII | FTC privacy/confidentiality policy and enforcement guidance | 2024; current | Enforcement mandate | A for risk identification | **Supported:** confidential uploads, secondary use, retention, and deletion promises are material risk areas; not a complete privacy-law map. |
| G09 | Primary PDF | VII | U.S. Copyright Office administrative report | January 2025; current | Public-agency policy mandate | A | **Authoritative for Office position:** human authorship and case-specific AI assistance; not a court holding or global rule. |
| G10 | Primary PDF | VII | U.S. Copyright Office policy analysis | **Still pre-publication** on 2026-07-14 | Public-agency policy mandate | B pending final | **Supported only with status qualifier:** current Office analysis of training/licensing/remedies; nonjudicial and not final. |
| G11 | Primary law | VII | Official EUR-Lex text, Regulation (EU) 2024/1689 | Current, staged application | Legislative mandate | A | **Authoritative for the regulation's text:** applicability is actor/feature/date specific and requires legal analysis. |
| G12 | Primary guild page | VII | WGA explanation of 2023 MBA AI protections | Page current and rechecked 2026-07-15 | **Advocacy/institutional:** represents writer members | A for bounded MBA claim | **Authoritative for the 2023 MBA summary only:** not the source for the 2026 training-license notification, universal copyright law, or rules for every writer/product. |

## Source quality matrix — product and industry sources

All six first-party pages were live and their listed offering was visible. They
are legitimate primary evidence for **what the vendor says or offers**. They are
not independent evidence that the service works or that privacy/security promises
are implemented.

| ID | Exist. | Level | Page verification | COI / incentive | Overall | Per-claim support verdict |
|---|---|---:|---|---|---|---|
| P01 | Primary page | VII | CoverflyX token exchange, note minimums, ratings, and strikes visible | **High commercial/platform incentive** | C | **Confirmed as offering only:** no independent note-quality, reliability, safety, or outcome evidence. |
| P02 | Primary page | VII | Human reader selection, feature pricing from $185, tiered pages/ratings/follow-up visible; page says updated July 2026 | **High commercial incentive; selected testimonials and vendor-defined credentials** | C | **Confirmed as offering only:** no blinded reliability or revision-outcome evidence. |
| P03 | Primary page | VII | Callaia's $65, under-a-minute, score/market outputs, no-training, and user-only-access claims visible | **High direct commercial incentive; selected endorsements** | C observable / D efficacy | **Observable claims confirmed; efficacy, objectivity, security, and privacy remain unverified.** |
| P04 | Primary page | VII | ScriptBook's 6,000+ parameters, 100,000+ scripts, and 87% claims visible | **High direct commercial incentive; promotional citations/endorsements** | C observable / D performance | **Quantitative claim existence confirmed; target, denominator, split, calibration, and independent replication remain unsupported.** |
| P05 | Primary page | VII | $49–$79, seven-pass workflow, online/PDF/Q&A, and no-training claim visible | **High direct commercial incentive; named-methodology owner evaluates own product** | C observable / D efficacy | **Offering confirmed; human-method equivalence, confidentiality in operation, and outcome validity remain unverified.** |
| P06 | Primary page | VII | $19, pass/consider/recommend, eight scores, and broad report outputs visible | **High direct commercial incentive** | C observable / D efficacy | **Offering confirmed; professional-equivalence, accuracy, current competition links, and privacy implementation remain unverified.** |

## Flagged sources and required handling

### A16 — evidence-level overclassification

- **Issue:** The register labels A16 Level I. The paper searches the ACL
  Anthology and five selected venues, screens titles/abstracts with two
  reviewers, and has one reviewer perform synthesis. Its full text did not show
  a study-quality appraisal, registered protocol, or genuinely comprehensive
  multi-database search.
- **Severity:** Medium.
- **Disposition:** Include, but classify as **Level V, Grade B**. Use for a
  recent field snapshot, not as highest-tier systematic-review evidence.

### A02, A03, A05–A07, and A30 — institutional or developer-evaluator incentives

- **Issue:** A02 includes a Microsoft Research affiliation; A03's authors built
  Dramatron and include DeepMind affiliations; A05–A07 evaluate systems or data
  the authors built, with A06 entirely Google-affiliated; A30 includes IBM
  affiliations.
- **Severity:** Low for A02; medium for A05/A07/A30; high for A03/A06 when used
  to claim system efficacy.
- **Disposition:** Include with explicit COI/incentive disclosure. Prefer
  reported behavior and bounded qualitative findings over promotional or causal
  interpretations.

### A10–A12 and A22–A23 — method-advocacy incentives

- **Issue:** A10–A12 evaluate benchmarks created by their authors; A22–A23 are
  authored by researchers associated with the consensual assessment technique.
- **Severity:** Low to medium.
- **Disposition:** Include. Cross-reference A10–A12 against one another and
  distinguish reliability from validity for A22–A23.

### A18 — institutional measurement interest

- **Issue:** Messick's ETS affiliation creates an institutional interest in
  measurement theory, though no specific commercial product claim is at issue.
- **Severity:** Low.
- **Disposition:** Include as foundational theory, not empirical screenplay
  evidence.

### G04–G05, G07, and G10 — authority/maturity limits

- **Issue:** OWASP lists are expert/community taxonomies rather than measured
  prevalence studies; G07's direct page could not be fetched; G10 remains a
  pre-publication administrative report.
- **Severity:** Low for G04/G05/G07; medium for G10.
- **Disposition:** Include with exact document-status labels. Do not convert a
  taxonomy into a prevalence claim, regulator guidance into a product-specific
  legal conclusion, or pre-publication analysis into final law.

### P01–P06 — first-party commercial evidence

- **Issue:** Every product source has a direct financial incentive. P03–P06
  make effectiveness, professional-equivalence, privacy, security, accuracy, or
  consistency claims without a public independent benchmark on the reviewed
  page.
- **Severity:** High for efficacy/privacy/security/performance claims; low for
  simple observable price/feature claims.
- **Disposition:** Include only as dated market observation. Grade efficacy
  claims D unless independently supported elsewhere.

## Predatory-publication assessment

**Alerts: none.** Crossref, Semantic Scholar, official publisher records, and
OpenAlex venue/ISSN metadata confirm the academic venues. The journal venues
were marked core and carried valid ISSNs where applicable. Conference records
were traceable to ACM, ACL, IEEE, or their official proceedings. No source was
retracted.

Two venue cautions do not amount to predatory flags:

- **A09 / IEEE Access** is a legitimate, indexed IEEE journal but broad and
  high-volume; the survey should receive ordinary review-depth scrutiny.
- **A16 / EACL Student Research Workshop** is a legitimate peer-reviewed ACL
  venue but has lower maturity and method depth than a full systematic review.

Scopus, Web of Science, and Cabell's subscription products were not directly
available. The assessment therefore uses Crossref, Semantic Scholar, OpenAlex
core/ISSN metadata, official publisher records, and visible publication history.
Absence of a predatory signal is not a guarantee against every editorial-quality
problem.

## Conflict-of-interest and incentive register

| Sources | Incentive type | Severity for bounded use | Handling |
|---|---|---|---|
| A02 | Industry research affiliation (Microsoft Research Asia) | Low–moderate | Disclose; no Microsoft product was evaluated. |
| A03 | Developer-evaluator plus DeepMind employer | High for efficacy; medium for qualitative reflections | Treat participant reports as formative, not independent validation. |
| A05–A07 | Authors built systems/dataset; A06 Google affiliation | Medium | Use controlled/descriptive observations; do not infer commercial efficacy. |
| A10–A12 | Benchmark creators evaluate own artifacts | Medium | Triangulate across independent benchmark families and retain dataset-transfer limits. |
| A18 | ETS institutional measurement interest | Low | Use as theory, not product evidence. |
| A22–A23 | Intellectual investment in CAT | Low–moderate | Use comparative findings; do not equate consensus with validity. |
| A27–A28 | Authors designed interventions/paradigms | Low–moderate | Retain task and replication limits. |
| A30 | IBM affiliations | Moderate | Disclose and require screenplay-specific evidence before transfer. |
| G01–G12 | Standards, enforcement, legislative, policy, or guild mandates | Low for their exact authoritative claim; higher if generalized | Cite exact scope and jurisdiction. G01 also sells print copies; G04/G05 have sponsors; G12 advocates for members. |
| P01–P06 | Direct financial/commercial incentive | High | Use only for observable dated claims unless independently validated. |

No evidence of undisclosed misconduct was found. "None material found" means
the accessible record exposed no relevant conflict; it is not proof that none
exists.

## Per-claim cross-verification verdicts

This section cross-references the principal factual claim families without
making a product recommendation.

| Claim family | Independent support | Verdict |
|---|---|---|
| Feedback utility is socially/contextually mediated, and screenwriters describe differentiated AI roles and workflow stages | A02 is direct; A01, A03, A04, and A06 are adjacent and convergent | **Supported but population evidence is thin.** Attitudes/practices do not prove usefulness, demand, or outcomes. |
| A tool can feel helpful without necessarily improving the writing artifact | A05 direct controlled evidence; A06/A07 separate interaction from artifact claims | **Supported for short-form studies.** Screenplay transfer remains untested. |
| Automatic story-quality metrics can correlate poorly with people and miss discourse/causal failures | A10 and A12 are distinct benchmarks; A11 supplies a mixed LLM-evaluator result; A13–A16 challenge evaluation design | **Strongly supported for generated stories.** It does not quantify STORYMACHINE's validity. |
| Human/LLM ratings are not automatically valid; aggregation, rater expertise, and coefficient choice matter | A13, A17–A23, and G01 converge from NLP, psychometrics, creativity, and standards | **Strong methodological support.** No source establishes a universal screenplay reliability threshold. |
| Human and LLM judges can show bias | A15 direct perturbation study; A13 and A17 provide independent mechanism/measurement cautions | **Supported for tested judgment tasks.** Screenplay-specific bias remains unmapped. |
| Interfaces should target appropriate reliance rather than maximal trust | A24/A25 reviews, A27–A29 experiments, and G02 risk guidance converge | **Supported cross-domain.** Specific writer-facing interventions need direct study. |
| Human–AI collaboration is not automatically synergistic | A26 meta-analysis and A30 framework/empirical work independently converge | **Supported in aggregate.** Creative screenplay feedback is not separately established. |
| API/LLM systems face authorization, resource, SSRF, disclosure, output, supply-chain, misinformation, and consumption risks | G02–G05 are independent official/community sources; G08 adds privacy/confidentiality risk | **Supported as risk identification.** These sources do not show prevalence or STORYMACHINE control effectiveness. |
| WCAG 2.2 supplies testable web-accessibility criteria | G06 official Recommendation | **Authoritatively supported.** Technical conformance is not complete lived usability. |
| Copyright/AI and guild obligations are specific to source, actor, jurisdiction, and date | G09/G10 (U.S. Office), G11 (EU law), G12 (MBA summary) | **Supported only with exact scope qualifiers.** Not global legal advice. |
| Competitor prices, features, workflows, and privacy/performance statements exist on current public pages | P01–P06 first-party pages | **Confirmed as dated page content only.** Efficacy, retention, accuracy, security, privacy implementation, and unit economics are unverified. |

All major factual claim families were cross-referenced where independent sources
exist; this exceeds the protocol's 30% minimum. Single primary authorities are
retained where cross-referencing would improperly substitute another
jurisdiction, contract, or standard.

## Verification limitations

- The source-verification pass did not have direct Scopus, Web of Science,
  Cabell's, or paywalled legal-research access.
- Full text was available for many, but not every, academic source. Metadata
  verification proves identity, not every nuanced interpretation.
- ORCID coverage is incomplete across older and conference records. Author names
  and affiliations were verified from publication/index metadata; a missing
  ORCID was not treated as an author failure.
- Predatory and COI assessment is constrained to public metadata and disclosures.
- Product claims are volatile and should be rechecked immediately before any
  externally published comparison.
- G10 must be replaced or relabeled when the final U.S. Copyright Office Part 3
  appears. EU AI Act application and WGA contract materials also require
  date-specific legal review.
- This evidence corpus contains no completed STORYMACHINE writer-validation
  sessions and no legally distributable, blind-labeled, held-out real-screenplay
  benchmark. Source quality cannot manufacture those missing observations.

## Phase 2 disposition

The 48-source corpus is admissible for Phase 3 synthesis with the corrections
and qualifiers in this report. Downstream work should use **A16 as Level V**, keep
product efficacy/privacy claims at D unless independently substantiated, disclose
the identified developer/industry incentives, preserve jurisdiction and
document-status qualifiers, and avoid treating adjacent creative-writing or
story-generation evidence as direct screenplay-feedback validation.

---

## Supplemental S01 verification (outside frozen 48-source corpus)

**Counting rule:** S01 is a post-freeze supplemental source added under
`PROTOCOL_AMENDMENT_02.md`. It is **not** a forty-ninth frozen-corpus source and
does not alter any Phase 2 denominator, count, quota, or disposition above.

### Identity, venue, and publication status

| Check | Independent result | Verdict |
|---|---|---|
| Title | *DuoDrama: Supporting Screenplay Refinement Through LLM-Assisted Human Reflection* | Exact match. |
| Authors | Yuying Tang, Xinyi Chen, Haotian Li, Xing Xie, Xiaojuan Ma, and Huamin Qu | Exact match across the paper, Crossref, Semantic Scholar, and OpenAlex. |
| Persistent identifiers | DOI `10.1145/3772318.3790568`; arXiv `2602.05854`; Semantic Scholar `f5a0cd34024b7f165194ff1b18dd24ec4fc484a0`; OpenAlex `W7154082476` | Resolved and mutually consistent. |
| Venue | *Proceedings of the 2026 CHI Conference on Human Factors in Computing Systems* (CHI '26), article 1078, pages 1–20 | Crossref and the HKUST publication record confirm the proceedings assignment; the ACM-formatted paper carries the DOI, ISBN, and CHI '26 dates. This is no longer merely an arXiv acceptance claim. |
| Acceptance / legitimacy | Published CHI '26 record; DOI registration and institutional repository record present | Legitimate peer-reviewed ACM venue; no predatory signal. |
| Retraction / integrity | OpenAlex marks the work as not retracted; no correction, withdrawal, or integrity notice found | No adverse publication-status signal found as of 2026-07-14. |

The paper is therefore **verified as an accepted/published CHI 2026 paper**, not
an unverified preprint. Venue prestige verifies neither the result nor its
transfer to STORYMACHINE.

### Sample, method, and outcome verification

| Element | What the full paper supports | Audit consequence |
|---|---|---|
| Formative sample | Nine participants recruited by snowball sampling and described by the authors as professional screenwriters; ages 25–39; all reported prior AI-tool use. They completed 30–40 minute one-to-one semi-structured interviews. | Useful for feature and workflow hypotheses. Small, non-probability, AI-experienced sample; credentials were not independently verified in the accessible record. |
| Evaluation sample | Fourteen participants described by the authors as professional screenwriters, ages 19–39, with 2–15 years of screenwriting experience; all reported prior AI-tool use. | The label “professional” should be attributed to the authors/recruitment criteria, not treated as an independently credentialed expert panel. |
| Procedure | Two consecutive online sessions totaling about 110–120 minutes. Session 1 used each participant's own scene. Session 2 compared four AI-feedback conditions on another scene, with condition order randomized. | This is a short-term, within-participant interface study, not longitudinal deployment or market validation. Prior exposure to DuoDrama in session 1 may affect session-2 judgments. |
| Comparators | DuoDrama `Eval-PE`, `Exp-PE`, `Eval-NoPE`, and `Rev-NoPE`. Every condition was AI generated. The paper's “professional screenplay reviewing” baseline was a prompted reviewer perspective, not coverage supplied by a human industry professional. | No human-coverage baseline, no unaided-writing control, and no basis for equivalence or superiority to professional human feedback. |
| Model stack | GPT-4.1 via Azure OpenAI for reasoning and GPT-4o for visuals. | Results are implementation- and model-dependent and may not transfer to other pipelines. |
| Measures | A 13-item 7-point scale and SUS in session 1; 18 Likert subdimensions in session 2 spanning alignment, feedback quality, perceived effectiveness, and reflection, plus interviews. | Outcomes are mainly participant perceptions and reflections. The study does not independently score revised screenplay artifacts. |
| Analysis | A priori G*Power calculation for a Wilcoxon matched-pairs test assumed a very large effect (`dz = 0.90`) and yielded a minimum of 13. Pairwise Wilcoxon signed-rank tests report medians, p-values, and effect size `r`. | The study is powered only for very large effects. The reported table entails many pairwise tests (18 subdimensions against three comparators); no multiple-comparison correction was identified in the paper, so isolated significance should be treated cautiously. |
| Ethics | The authors report the study was exempt from institutional review board review. | Disclosure is present; it does not change the evidence limits. |

The result is mixed rather than universal: DuoDrama received significantly
higher ratings on a number of short-term self-reported dimensions, while many
comparisons were not significant. The defensible outcome language is therefore
“participants rated DuoDrama more highly than specific AI comparator
conditions on some perceived feedback and reflection dimensions,” not
“DuoDrama improves screenplay quality.”

### Conflict of interest and incentive assessment

The authors designed, built, and evaluated DuoDrama. Two authors are affiliated
with Microsoft Research Asia; the paper says the work was partially supported
by Hong Kong Research Grants Council grants and formed part of an AFMR
collaboration supported by Microsoft Research. The LLM stack also used Azure
OpenAI. This is a disclosed **developer-evaluator and institutional incentive**,
not evidence of misconduct. Severity is **high for product-efficacy claims** and
**moderate for bounded qualitative/interface-design insights**. Independent
replication and artifact-level outcomes would be required before treating the
system's perceived advantages as efficacy.

### Evidence-level and grade determination

**Level VI is defensible and conservative for the way S01 is used.** The paper
contains a randomized-order within-subject comparative component, but the
supplemental audit claim concerns a small, short-term HCI user study whose
central evidence is descriptive/qualitative and self-reported. It does not test
the audit's product, demand, scoring validity, retention, or writing outcomes.

**Grade B is defensible only with a hard claim boundary:** S01 may support
screenwriter-reflection design hypotheses and the proposition that this sample
perceived advantages over particular AI-generated feedback variants. It must
not support claims that DuoDrama or STORYMACHINE:

- improves the objective quality of a screenplay or a completed revision;
- matches or outperforms professional human screenplay coverage;
- establishes writer demand, willingness to pay, retention, or durable use;
- validates an automated screenplay score or diagnosis; or
- generalizes across writers, cultures, genres, models, or long-term workflows.

Within that boundary, the amendment's **Level VI / Grade B** classification is
retained. Any broader efficacy claim would fall to **Grade D / inadmissible for
the claimed use** on this evidence alone.

### Corrections required in downstream synthesis

1. Replace unqualified wording such as “shows DuoDrama improves feedback
   quality/alignment and enhances effectiveness/depth/richness” with:
   **“In a 14-participant, short-term study, participants rated DuoDrama more
   highly than specific AI comparator conditions on some self-reported feedback
   and reflection dimensions.”**
2. Describe the comparator accurately as an **AI-generated simulation of a
   professional reviewer perspective**, not an “industry baseline” consisting
   of professional human coverage.
3. Attribute “professional screenwriters” to the paper's recruitment/reporting
   and retain the disclosed 2–15 year experience range; do not imply that the
   audit independently verified credentials.
4. State explicitly that no independently judged revision-quality outcome,
   human-reviewer comparator, multiple-comparison adjustment, or longitudinal
   result was established.

### Supplemental S01 disposition

S01 is authentic, published in a legitimate peer-reviewed venue, not retracted,
and methodologically relevant to reflection-oriented interface design. It is
admissible as **supplemental Level VI / Grade B evidence under the narrow
qualifiers above**. It does not repair the audit's missing direct writer-demand
evidence or real-screenplay score-validation evidence, and it does not change
the frozen 48-source verification result.

---

## Supplemental S02 verification (outside frozen 48-source corpus)

**Counting rule:** S02 is a post-freeze exact-source correction added under
`PROTOCOL_AMENDMENT_03.md`. It is not a forty-ninth frozen-corpus source and
does not alter the 30 academic / 12 official-professional / 6 product counts.

### Identity and exact-claim verification

- **ID:** S02.
- **Source:** Writers Guild of America. (2026). *2026 MBA Contract Changes FAQ*.
- **Official URL:**
  https://www.wga.org/contracts/contracts/mba/2026-mba-contract-changes-faq
- **Existence/status:** official WGA contract FAQ page; independently re-opened
  during the Phase 5 ethics review on 2026-07-15.
- **Exact effect:** the artificial-intelligence section supports the bounded
  agreement proposition that a company must notify the Guild when licensing a
  writer's material to train a commercial generative-AI system and that the
  Guild may request a meeting to discuss appropriate remuneration.

### Authority, incentives, and limits

| Dimension | Finding | Disposition |
|---|---|---|
| Authority | Primary union explanation of negotiated 2026 MBA changes | Level VII; Grade A for the exact agreement proposition |
| Incentive | WGA advocates for writer members and explains its negotiated agreement | Disclose institutional/advocacy role; not evidence of misconduct |
| Applicability | MBA-covered and fact-specific | Do not generalize to every writer, product, jurisdiction, copyright question, or STORYMACHINE deployment |
| Temporal | Verified 2026-07-15 | Refresh on agreement/page/product-use changes |
| Relationship to G12 | Separate page and effect | G12 remains the 2023 MBA AI-protections summary; never blend IDs or anchors |

### Supplemental S02 disposition

S02 is authentic official primary evidence for the exact 2026 MBA notification
and remuneration-discussion proposition under its negotiated-agreement scope.
It corrects a source-to-claim mismatch; it does not establish legal
applicability to STORYMACHINE, demand, efficacy, or score validity, and it does
not change the frozen 48-source verification result.
