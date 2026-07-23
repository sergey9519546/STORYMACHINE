# High-End Audit — Phase 2 Source Register

- **Snapshot:** 2026-07-14
- **Purpose:** Citation-level source control for the high-end audit
- **Companion:** [`PHASE_2_BIBLIOGRAPHY.md`](./PHASE_2_BIBLIOGRAPHY.md)
- **Scope boundary:** Phase 2 source registration only; no project verdict or
  code recommendation is made here

## Register conventions

- **A** identifiers are formally peer-reviewed academic records.
- **G** identifiers are primary standards, regulator, legislative, or
  professional/guild gray literature.
- **P** identifiers are first-party product/service evidence. They may support
  what a vendor publicly offers or claims, never that the offer works.
- **Level** uses the seven-level hierarchy in the deep-research protocol:
  I = systematic review/meta-analysis; II = randomized experiment; III =
  controlled/non-randomized or benchmark study; IV = cohort/case-control;
  V = systematic/descriptive synthesis; VI = individual qualitative/descriptive
  study; VII = expert/committee/standards/first-party material.
- **Grade** is discipline-relative fitness for the bounded claim: A = primary
  evidence, B = supporting evidence, C = explicit caveats, D = critique/market
  observation only. A low design level can still be Grade A when it is the primary
  governing law or standard for the claim.
- **COI/incentive** records obvious institutional, developer-evaluator, employer,
  advocacy, and commercial incentives. "None detected" is not proof that none
  exists.
- **Verification:** `Crossref` means exact DOI metadata resolved on 2026-07-14;
  `S2 match` additionally records a Semantic Scholar paper ID; `S2 degraded`
  means HTTP 429 and is not an unmatched signal; `primary page` means the record
  was checked at the issuing organization/vendor.

## Corpus summary

| Class | N | Share | Intended evidentiary use |
|---|---:|---:|---|
| Peer-reviewed academic | 30 | 62.5% | Empirical, benchmark, methodological, and review evidence |
| Official/professional primary gray literature | 12 | 25.0% | Governing/authoritative requirements and risk guidance |
| First-party product/service evidence | 6 | 12.5% | Current alternatives, claimed workflow, pricing, and incentive mapping |
| **Total** | **48** | **100%** | — |

## Academic evidence register

| ID | Source metadata | Method / context | Level; grade | COI / incentive | Bounded support | Material limitations | Verification |
|---|---|---|---|---|---|---|---|
| A01 | Cheng, R., & Frens, J. (2022). Feedback exchange and online affinity: A case study of online fanfiction writers. *PACMHCI, 6*(CSCW2), 1–29. [DOI](https://doi.org/10.1145/3555127) | Interviews, 29 fanfiction writers; online affinity spaces | VI; B | None detected | Trust, affinity, identity, and relationships shape critique seeking and reception | Fanfiction and community critique are not professional screenplay coverage; qualitative self-selection | Crossref; S2 degraded |
| A02 | Tang, Y., Li, H., Lan, M., Ma, X., & Qu, H. (2025). Understanding screenwriters' practices, attitudes, and future expectations in human-AI co-creation. *CHI 2025*, 1–18. [DOI](https://doi.org/10.1145/3706598.3714120) | Semi-structured interviews, 23 screenwriters | VI; B | Authors study current AI practice; none commercial detected | Direct population evidence for workflow stages, attitudes, and desired AI roles | Reported attitudes/use do not prove utility, demand, trust, or revision outcome | Crossref; S2 degraded |
| A03 | Mirowski, P., Mathewson, K. W., Pittman, J., & Evans, R. (2023). Co-writing screenplays and theatre scripts with language models. *CHI 2023*, 1–34. [DOI](https://doi.org/10.1145/3544548.3581225) | Formative user study/interviews, 15 theatre/film professionals; Dramatron | VI; B | Authors built Dramatron; DeepMind affiliations | Professional reflections on co-writing, human control, coherence, plagiarism, and bias | Small formative sample; co-writing is not coverage; developer-evaluator bias | Crossref; S2 degraded |
| A04 | Kreminski, M., & Martens, C. (2022). Unmet creativity support needs in computationally supported creative writing. *In2Writing 2022*, 74–82. [DOI](https://doi.org/10.18653/v1/2022.in2writing-1.11) | Theory-grounded descriptive review | V; B | None detected | Needs include consistency, story arc, reader experience, and expressive intent—not only idea generation | Workshop synthesis; no new screenwriter sample; predates newest systems | Crossref; S2 degraded |
| A05 | Clark, E., Ross, A. S., Tan, C., Ji, Y., & Smith, N. A. (2018). Creative writing with a machine in the loop. *IUI 2018*, 329–340. [DOI](https://doi.org/10.1145/3172944.3172983) | Two controlled case studies; slogans and short stories | III; B | Authors built prototypes | Positive experience can coexist with no necessary improvement in writing artifact | Small tasks, crowd assessment, older models, no screenplay outcome | Crossref; S2 degraded |
| A06 | Yuan, A., Coenen, A., Reif, E., & Ippolito, D. (2022). Wordcraft: Story writing with large language models. *IUI 2022*, 841–852. [DOI](https://doi.org/10.1145/3490099.3511105) | User study with and without an LLM story-writing interface | III; B | Tool built/evaluated by Google-affiliated authors | Interaction patterns supporting writer agency, custom requests, and idea unblocking | Short stories, formative sample, no long-form revision or coverage validation | Crossref; S2 degraded |
| A07 | Lee, M., Liang, P., & Yang, Q. (2022). CoAuthor. *CHI 2022*, 1–19. [DOI](https://doi.org/10.1145/3491102.3502030) | Dataset: 63 writers, 1,445 creative/argumentative writing sessions, four GPT-3 variants | VI; A for dataset; B for transfer | Authors built interface/dataset | Fine-grained evidence on suggestion use and definitions of collaboration | Timed short-form tasks; GPT-3; no screenplay coverage or revision outcome | Crossref; S2 degraded |
| A08 | Kybartas, B., & Bidarra, R. (2017). A survey on story generation techniques for authoring computational narratives. *IEEE TCIAIG, 9*(3), 239–253. [DOI](https://doi.org/10.1109/TCIAIG.2016.2546063) | Structured survey of plot/space and mixed initiative | V; B | None detected | Computational narrative systems automate different constructs to different degrees | Pre-transformer; games/interactive narratives; not evaluation validity | Crossref; S2 degraded |
| A09 | Ranade, P., Dey, S., Joshi, A., & Finin, T. (2022). Computational understanding of narratives: A survey. *IEEE Access, 10*, 101575–101594. [DOI](https://doi.org/10.1109/ACCESS.2022.3205314) | Broad computational survey | V; B | None detected | Narrative understanding spans events, entities, relationships, discourse, and open high-level reasoning problems | Broad and not screenplay-specific; venue and review depth warrant ordinary caution | Crossref; S2 degraded |
| A10 | Chhun, C., Colombo, P., Suchanek, F. M., & Clavel, C. (2022). Of human criteria and automatic metrics: A benchmark of the evaluation of story generation. *COLING 2022*, 5794–5836. [ACL](https://aclanthology.org/2022.coling-1.509/) | HANNA: 1,056 stories, 10 systems, six human criteria, 72 metrics | III; A | Authors created benchmark; no commercial COI detected | Direct evidence that automatic story evaluation lacks consensus and many metrics poorly align with human criteria | Generated short stories, not real screenplays or revision decisions | ACL primary record; no Crossref DOI; S2 not queried |
| A11 | Chhun, C., Suchanek, F. M., & Clavel, C. (2024). Do language models enjoy their own stories? *TACL, 12*, 1122–1142. [DOI](https://doi.org/10.1162/tacl_a_00689) | LLM ratings compared with human annotations and automatic measures | III; A | Same research line/benchmark authors | LLM evaluators improve some system-level correlations but retain weak explanations and prompt effects | System-level correlation does not establish instance-level screenplay validity | Crossref; S2 `11dda1081d32b607ea89b7e1028052af5583b25d` |
| A12 | Guan, J., Zhang, Z., Feng, Z., Liu, Z., Ding, W., Mao, X., Fan, C., & Huang, M. (2021). OpenMEVA. *ACL-IJCNLP 2021*, 6394–6407. [DOI](https://doi.org/10.18653/v1/2021.acl-long.500) | Benchmark: correlation, generalization, discourse coherence, perturbation robustness | III; A | Authors created benchmark | Existing metrics correlate poorly with people and miss discourse/causal failures | Research-generated stories differ from full real scripts | Crossref; S2 degraded |
| A13 | Ethayarajh, K., & Jurafsky, D. (2022). The authenticity gap in human evaluation. *EMNLP 2022*, 6056–6070. [DOI](https://doi.org/10.18653/v1/2022.emnlp-main.406) | Utility-theoretic analysis plus empirical evaluation protocol | III; A | None detected | Averaged Likert ratings can violate preference assumptions and reverse inferred orderings | Demonstrated on generated text/model comparisons, not professional screenplay labels | Crossref; S2 `20eca4866bb257b8d701bc7c9b19864b7c05bc23` |
| A14 | van der Lee, C., Gatt, A., van Miltenburg, E., Wubben, S., & Krahmer, E. (2019). Best practices for human evaluation of automatically generated text. *INLG 2019*, 355–368. [DOI](https://doi.org/10.18653/v1/W19-8643) | Literature review and methods guidance | V; A for method | None detected | Explicit criteria, rater selection, quality control, instruments, and statistics are required for interpretable human evaluation | General NLG guidance; not a screenplay threshold or validation result | Crossref; S2 degraded |
| A15 | Chen, G. H., Chen, S., Liu, Z., Jiang, F., & Wang, B. (2024). Humans or LLMs as the judge? *EMNLP 2024*, 8301–8327. [DOI](https://doi.org/10.18653/v1/2024.emnlp-main.474) | Thousands of human/LLM judgments under four bias perturbation families | III; A | Benchmark authors; none commercial detected | Human and LLM judges both show material, sometimes exploitable bias | General judgment tasks; does not enumerate screenplay-specific taste/bias | Crossref; S2 degraded |
| A16 | Ma, Y., Susilo, R., Haslum, P., & Suominen, H. (2026). Text-to-text automatic story generation: A survey. *EACL SRW 2026*, 514–527. [DOI](https://doi.org/10.18653/v1/2026.eacl-srw.39) | Structured descriptive survey, 57 recent papers | V; B | None detected | Current challenges include coherence, character consistency, diversity, controllability, datasets, and evaluation | Targeted ACL/venue search without study-quality appraisal or a registered comprehensive method; student workshop; recent; generation rather than feedback | Crossref and ACL primary record; independently verified; S2 `81292710fff321030c0dfc57824b63ff1c9d251b` |
| A17 | Flake, J. K., & Fried, E. I. (2020). Measurement schmeasurement. *AMPPS, 3*(4), 456–465. [DOI](https://doi.org/10.1177/2515245920952393) | Methodological review/critique | VII; A for method | None detected | Undefined constructs, undisclosed measure flexibility, and missing validity evidence undermine conclusions | Not an empirical screenplay instrument study | Crossref; S2 degraded |
| A18 | Messick, S. (1995). Validity of psychological assessment. *American Psychologist, 50*(9), 741–749. [DOI](https://doi.org/10.1037/0003-066X.50.9.741) | Foundational validity theory | VII; A | ETS affiliation; institutional measurement interest | Validity attaches to evidence for score interpretation/use and consequences, not merely repeatability | Foundational/old; not domain implementation or direct empirical evidence | Crossref; S2 degraded |
| A19 | Hallgren, K. A. (2012). Computing inter-rater reliability for observational data. *TQMP, 8*(1), 23–34. [DOI](https://doi.org/10.20982/tqmp.08.1.p023) | Tutorial with kappa/ICC examples | VII; A for method | None detected | Reliability statistic must match design; unreliable labels affect downstream power | Observational examples; no universal screenplay reliability threshold | Crossref; S2 degraded |
| A20 | Artstein, R., & Poesio, M. (2008). Inter-coder agreement for computational linguistics. *Computational Linguistics, 34*(4), 555–596. [DOI](https://doi.org/10.1162/coli.07-034-R2) | Survey of coefficient assumptions and annotation practice | V; A | None detected | Kappa, alpha, weighted agreement, and their interpretations are not interchangeable | Older annotation focus; creative ratings are more open-ended | Crossref; S2 `69d59eba999f754ea7c88b69c0b34c0208a54cfa` |
| A21 | Koo, T. K., & Li, M. Y. (2016). A guideline of selecting and reporting intraclass correlation coefficients. *Journal of Chiropractic Medicine, 15*(2), 155–163. [DOI](https://doi.org/10.1016/j.jcm.2016.02.012) | Method guideline on 10 ICC forms | VII; A for method | Biomechanics lab affiliation; no material commercial COI detected | ICC model/type/definition and confidence interval must match individual/average and agreement/consistency claim | Medical context; heuristic cutoffs are not screenplay-specific | Crossref; S2 `33122fc2f544888a0f46dd221a783ad1ecc1ddad` |
| A22 | Kaufman, J. C., Baer, J., Cole, J. C., & Sexton, J. D. (2008). A comparison of expert and nonexpert raters using the consensual assessment technique. *Creativity Research Journal, 20*(2), 171–178. [DOI](https://doi.org/10.1080/10400410802059929) | Comparative creativity-rating study | III; B | Authors advocate/study CAT; none commercial detected | Nonexpert ratings were less consistent and did not match experts in the studied domain | Domain/sample transfer; agreement is not full validity | Crossref; S2 degraded |
| A23 | Kaufman, J. C., Baer, J., & Cole, J. C. (2009). Expertise, domains, and the consensual assessment technique. *Journal of Creative Behavior, 43*(4), 223–233. [DOI](https://doi.org/10.1002/j.2162-6057.2009.tb01316.x) | Comparative rating across expertise/domain | III; B | Authors advocate/study CAT; none commercial detected | Expert/domain match materially affects consistency of creative-product ratings | Experts can share convention/bias; not screenplay-specific criterion validity | Crossref; S2 degraded |
| A24 | Lee, J. D., & See, K. A. (2004). Trust in automation. *Human Factors, 46*(1), 50–80. [DOI](https://doi.org/10.1518/hfes.46.1.50_30392) | Integrative review | V; A foundational | None detected | Aim for appropriate reliance calibrated to actual capability, not maximal trust | Predates generative AI; broad automation evidence | Crossref; S2 degraded |
| A25 | Mehrotra, S., Degachi, C., Vereschak, O., Jonker, C. M., & Tielman, M. L. (2024). Fostering appropriate trust in human-AI interaction. *ACM JRC, 1*(4), 1–45. [DOI](https://doi.org/10.1145/3696449) | PRISMA-informed systematic review | I; A | None detected | Trust, reliance, and calibration constructs/measures are fragmented; belief, intention, and action should not be conflated | Heterogeneous tasks and immature intervention evidence | Crossref; S2 `0072959e028aadf81e55353d3be7bd4f95e447e4` |
| A26 | Vaccaro, M., Almaatouq, A., & Malone, T. (2024). When combinations of humans and AI are useful. *Nature Human Behaviour, 8*(12), 2293–2303. [DOI](https://doi.org/10.1038/s41562-024-02024-1) | Systematic review/meta-analysis, 100+ experiments, 370 effects | I; A | None detected | Human–AI teams augment humans on average but do not show average synergy over the stronger member; effects depend on task | Cross-domain heterogeneity; few explicit complementary-subtask designs | Crossref; S2 degraded |
| A27 | Buçinca, Z., Malaya, M. B., & Gajos, K. Z. (2021). To trust or to think. *PACMHCI, 5*(CSCW1), 1–21. [DOI](https://doi.org/10.1145/3449287) | Controlled experiment, N=199 | III; A | Authors designed interventions | Cognitive forcing reduces overreliance but lowers user ratings and interacts with need for cognition | Artificial decision task; not creative feedback; transfer requires writer study | Crossref; S2 degraded |
| A28 | Vasconcelos, H., Jörke, M., Grunde-McLaughlin, M., Gerstenberg, T., Bernstein, M. S., & Krishna, R. (2023). Explanations can reduce overreliance. *PACMHCI, 7*(CSCW1), 1–38. [DOI](https://doi.org/10.1145/3579605) | Five controlled studies, N=731 | II/III; A | Authors designed paradigm; none commercial detected | Verification behavior depends on task/explanation cost and incentives; explanations alone are not magic | Maze/simulated-AI tasks with objectively checkable answers | Crossref; S2 `e8c2f818ec941005f705a1de26597690420c534a` |
| A29 | Dietvorst, B. J., Simmons, J. P., & Massey, C. (2015). Algorithm aversion. *JEP: General, 144*(1), 114–126. [DOI](https://doi.org/10.1037/xge0000033) | Controlled forecasting experiments | II; A | None detected | People can underuse an algorithm after seeing it err even when it remains more accurate | Forecasting, not creative judgment; later work qualifies universality | Crossref; S2 degraded |
| A30 | Hemmer, P., Schemmer, M., Kühl, N., Vössing, M., & Satzger, G. (2025). Complementarity in human-AI collaboration. *European Journal of Information Systems, 34*(6), 979–1002. [DOI](https://doi.org/10.1080/0960085X.2025.2475962) | Formal framework plus two empirical studies | III; B | IBM affiliations among authors; industry-AI incentive disclosed in metadata | Information/capability asymmetry make complementarity testable rather than assumed | Decision tasks; recent; transfer to screenplay feedback untested | Crossref; S2 `df29a654e19d4551a1e222f019c819b56f8ddd7c` |

## Official and professional primary-source register

| ID | Source metadata | Authority / context | Level; grade | COI / incentive | Bounded support | Material limitations | Verification |
|---|---|---|---|---|---|---|---|
| G01 | AERA, APA, & NCME. (2014). *Standards for educational and psychological testing*. [AERA](https://www.aera.net/Publications/Books/Standards-for-Educational-Psychological-Testing-2014-Edition) | Joint professional standard | VII; A | Standards bodies; AERA sells publication | Authoritative requirements for validity, reliability, fairness, scoring, reporting, and use | Not screenplay evidence; standards application requires a specific validity argument | AERA primary page |
| G02 | Autio, C., et al. (2024). *AI RMF: Generative AI profile* (NIST AI 600-1). [DOI](https://doi.org/10.6028/NIST.AI.600-1) | U.S. government cross-sector profile | VII; A | Public-agency mandate | Lifecycle governance and GAI risk identification/measurement/management | Voluntary and broad; not certification or product audit | NIST primary page + DOI |
| G03 | Booth, H., et al. (2024). *Secure software development practices for generative AI* (NIST SP 800-218A). [DOI](https://doi.org/10.6028/NIST.SP.800-218A) | U.S. government SSDF community profile | VII; A | Public-agency mandate | Secure development/acquisition practices for AI systems and models | High-level profile; product-specific threat modeling remains necessary | NIST primary page + Crossref |
| G04 | OWASP Foundation. (2023). *API Security Top 10—2023*. [OWASP](https://owasp.org/API-Security/editions/2023/en/0x11-t10/) | Community practitioner awareness standard | VII; B | Nonprofit; expert/community process; edition had no contributed dataset | API authorization, auth, resource, SSRF, configuration, inventory, and third-party-consumption risks | Not exhaustive, prevalence-measured, or a compliance framework | OWASP primary page |
| G05 | OWASP Foundation. (2025). *Top 10 for LLM applications*. [OWASP](https://genai.owasp.org/llm-top-10/) | Community practitioner threat taxonomy | VII; B | Sponsored community project; states vendor neutrality | Prompt injection, disclosure, output handling, agency, supply chain, misinformation, and consumption risks | Awareness taxonomy; not quantified prevalence or proof of controls | OWASP primary page |
| G06 | W3C. (2024). *WCAG 2.2*. [W3C](https://www.w3.org/TR/WCAG22/) | W3C Recommendation; accessibility standard | VII; A | Consensus standards body | Testable web-accessibility criteria including focus, dragging, targets, help, entry, and authentication | Technical conformance does not equal complete usability or lived accessibility | W3C primary recommendation |
| G07 | Atleson, M. (2023, February 27). *Keep your AI claims in check*. [FTC](https://www.ftc.gov/business-guidance/blog/2023/02/keep-your-ai-claims-check) | U.S. regulator business guidance | VII; B | Enforcement mandate | AI performance/superiority claims require evidence; vendor reliance does not erase responsibility | Nonbinding guidance; not legal advice; direct page returned 403 during retrieval | Official FTC URL/title corroborated by FTC official statement |
| G08 | FTC. (2024, January). *AI companies: Uphold your privacy and confidentiality commitments*. [FTC](https://www.ftc.gov/policy/advocacy-research/tech-at-ftc/2024/01/ai-companies-uphold-your-privacy-confidentiality-commitments) | U.S. regulator policy/enforcement guidance | VII; A for risk identification | Enforcement mandate | Confidential uploads, secondary use, retention, deletion, and provider commitments are material risks | Not a complete U.S. privacy-law map or product compliance finding | FTC primary page |
| G09 | U.S. Copyright Office. (2025). *Copyright and AI, Part 2: Copyrightability*. [USCO](https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf) | U.S. administrative report | VII; A | Public-agency policy mandate | Current Office position on human authorship, AI assistance, prompts, arrangement, and modification | Not a court ruling, global rule, or automatic answer for a given work | USCO primary PDF/page |
| G10 | U.S. Copyright Office. (2025). *Copyright and AI, Part 3: Generative AI training* (Pre-publication). [USCO](https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-3-Generative-AI-Training-Report-Pre-Publication-Version.pdf) | U.S. administrative policy analysis | VII; B pending final | Public-agency policy mandate | Current Office analysis of training, fair use, licensing, and remedies | Pre-publication and nonjudicial; final document should be rechecked | USCO primary PDF/page |
| G11 | European Parliament & Council. (2024). Regulation (EU) 2024/1689. [EUR-Lex](https://eur-lex.europa.eu/eli/reg/2024/1689/oj) | Primary EU legislation | VII; A | Legislative mandate | Scope, AI literacy, transparency, GPAI duties, and preservation of data-protection obligations | Duties are actor/feature/date-specific; legal analysis needed for applicability | EUR-Lex official text |
| G12 | Writers Guild of America. (2023). *Artificial intelligence* [2023 MBA protections summary]. [WGA](https://www.wga.org/contracts/know-your-rights/artificial-intelligence) | Primary union contract/practice guidance | VII; A for bounded MBA claim | Advocates for writer membership | AI is not a writer under the MBA; AI output is not literary/source material; company disclosure and writer-use rules | MBA-covered work only; not the 2026 training-license notification source and not universal copyright or product law | WGA primary page; rechecked 2026-07-15 |

## Product and industry register

| ID | Source metadata | Observable offering / claim | Level; grade | COI / incentive | Bounded support | Material limitations | Verification |
|---|---|---|---|---|---|---|---|
| P01 | Coverfly. (n.d.). *coverflyX: Free peer-to-peer script notes*. [Page](https://coverfly.com/x/) | Free token exchange; minimum strengths/weaknesses notes; reader ratings and strikes | VII; C | Direct commercial/platform incentive | Current peer-feedback alternative and mechanism | No independent note quality, reliability, safety, or writer-outcome data | First-party page, retrieved 2026-07-14 |
| P02 | Script Reader Pro. (n.d.). *Script coverage services by professional screenwriters*. [Page](https://www.scriptreaderpro.com/our-script-coverage-services/) | Human, selectable genre readers; feature coverage from $185; tiered reports, ratings, follow-up | VII; C | Direct commercial incentive; selected testimonials | Current high-touch professional alternative, deliverables, and price snapshot | No blinded reliability or revision-outcome evidence; vendor-defined credentials | First-party page, retrieved 2026-07-14 |
| P03 | Callaia. (n.d.). *Industry leading script coverage+*. [Page](https://www.callaia.ai/) | AI report under a minute from $65; craft/market scores, comps/cast; no-training/private claims | VII; C observable / D efficacy | Direct commercial incentive; selected endorsements | Current direct AI-coverage feature, speed, price, and privacy positioning | "Objective," "leading," security, and utility claims lack public independent benchmark on page | First-party page, retrieved 2026-07-14 |
| P04 | ScriptBook. (n.d.). *AI screenplay analysis and box office prediction*. [Page](https://www.scriptbook.io/) | Proprietary analysis; 6,000+ parameters; audience/market outputs; claims 87% accuracy | VII; D performance / C observable | Direct commercial incentive; promotional press and endorsements | Current automated commercial-analytics alternative and explicit quantitative claim | Target, denominator, split, calibration, uncertainty, and independent replication not established on page | First-party page, retrieved 2026-07-14 |
| P05 | ScriptCoverage.ai. (n.d.). *Script coverage in minutes*. [Page](https://scriptcoverage.ai/) | $49–$79; seven-pass AI workflow; online/PDF report; no-training claim | VII; C observable / D efficacy | Direct commercial incentive; named-coach methodology | Current direct AI-coverage workflow and positioning | Human-equivalence, methodology fidelity, confidentiality, and outcome validity not independently demonstrated | First-party page, retrieved 2026-07-14 |
| P06 | GetScriptCoverage. (n.d.). *Script Coverage AI—Instant screenplay feedback*. [Page](https://www.getscriptcoverage.com/) | $19; pass/consider/recommend, eight scores, synopsis, market/contest and rewrite outputs | VII; C observable / D efficacy | Direct commercial incentive | Current low-price, rapid, broad-output competitor snapshot | "Professional"/same-criteria equivalence and feedback accuracy lack public validation protocol | First-party page, retrieved 2026-07-14 |

## Supplemental post-freeze source register

Supplemental sources are transparently registered after the Phase 2 corpus
freeze. They do not alter the 48-source counts above.

| ID | Source metadata | Authority / context | Level; grade | COI / incentive | Bounded support | Material limitations | Verification |
|---|---|---|---|---|---|---|---|
| S01 | Tang, Y., et al. (2026). *DuoDrama: Supporting screenplay refinement through LLM-assisted human reflection*. CHI 2026. [DOI](https://doi.org/10.1145/3772318.3790568) | Small developer-evaluator HCI study; author-described professional screenwriters | VI; B | Microsoft Research/Azure and developer-evaluator incentives | Short-term reflection/interface plausibility under the tested AI comparator conditions | No human-coverage baseline, blind artifact outcome, demand, retention, score validity, or longitudinal proof | `PROTOCOL_AMENDMENT_02.md`; supplemental verification; retrieved 2026-07-14 |
| S02 | Writers Guild of America. (2026). *2026 MBA Contract Changes FAQ*. [WGA](https://www.wga.org/contracts/contracts/mba/2026-mba-contract-changes-faq) | Primary union explanation of 2026 MBA contract changes | VII; A for exact MBA proposition | Advocates for writer membership; explains negotiated agreement | Company notification when licensing writer material to train a commercial generative-AI system; Guild may request discussion of appropriate remuneration | MBA-covered context only; not universal product/copyright law or a STORYMACHINE applicability determination | WGA primary page; independently rechecked during Phase 5 on 2026-07-15; `PROTOCOL_AMENDMENT_03.md` |

## Cross-index and integrity log

### Crossref

- Exact DOI checks executed: 33.
- Intended included records resolved: 31 academic/technical DOI records (29
  academic records plus two NIST records).
- A10 was verified directly in ACL Anthology because its record exposes no DOI.
- Rejected identifier: `10.1145/3411764.3445659`; Crossref resolved it to
  *Trade-offs for Substituting a Human with an Agent in a Pair Programming
  Context*, not Buçinca et al.
- Corrected identifier: A27 = `10.1145/3449287`.

### Semantic Scholar

The unauthenticated API produced seven matches and then intermittent/major HTTP
429 responses. Per the deep-research protocol, rate-limited checks are **degraded**
and the `semantic_scholar_unmatched` signal is omitted rather than set false.

| Source | Semantic Scholar paper ID |
|---|---|
| A11 | `11dda1081d32b607ea89b7e1028052af5583b25d` |
| A13 | `20eca4866bb257b8d701bc7c9b19864b7c05bc23` |
| A20 | `69d59eba999f754ea7c88b69c0b34c0208a54cfa` |
| A21 | `33122fc2f544888a0f46dd221a783ad1ecc1ddad` |
| A25 | `0072959e028aadf81e55353d3be7bd4f95e447e4` |
| A28 | `e8c2f818ec941005f705a1de26597690420c534a` |
| A30 | `df29a654e19d4551a1e222f019c819b56f8ddd7c` |

No final source duplicates another by DOI or normalized title. Preprint/published
versions were collapsed to the publication of record. No citation is treated as
verified against its complete original PDF merely because Crossref, Semantic
Scholar, or a landing page matched it; those checks verify identity and metadata,
not every substantive claim.

## Distribution and update controls

- **Peer-reviewed share:** 30/48 (62.5%), above the full-mode 60% minimum.
- **Older than five years:** 13/48 (27.1%), below the 30% ceiling; these are
  retained as foundational measurement/trust/narrative methods or the 2014
  testing standard.
- **Recent known-year concentration:** 29/42 (69.0%) from 2021–2026; no 70%
  distributional-skew advisory fires. Product pages with unstable/no publication
  dates are excluded from the denominator.
- **Jurisdictional official subset:** U.S.-specific 8/12 (66.7%); no 70%
  advisory fires. EU law and global W3C/OWASP sources prevent a single-jurisdiction
  monopoly, but this is not globally complete legal coverage.
- **Method and venue:** no single method or venue family reaches 70%. The
  academic corpus remains concentrated in HCI/NLP/computing by substantive need,
  while psychometrics/human factors supply distinct measurement and reliance
  evidence.
- **Update triggers:** recheck official/vendor pages before final publication;
  replace G10 with the final Part 3 report when issued; revisit EU AI Act
  application dates; rerun product pricing/privacy claims; and retry degraded
  Semantic Scholar lookups if cross-index triangulation is required downstream.

## AI-assistance disclosure

AI-assisted research tools were used for discovery, metadata comparison,
screening support, and drafting this register. Every admitted citation was checked
against a DOI resolver, authoritative index, publisher record, issuing-body page,
or first-party product page. Metadata identity checks do not substitute for
human reading or source-verification-agent assessment of every full-text claim.
