# High-End Audit — Phase 2 Annotated Bibliography

- **Mode:** Deep Research `full`
- **Phase:** Investigation / bibliography agent only
- **Search date:** 2026-07-14 (America/Los_Angeles)
- **Protocol:** [`PHASE_1_SCOPE.md`](./PHASE_1_SCOPE.md)
- **Status:** Search, screening, bibliography, and independent source verification complete; see `PHASE_2_SOURCE_VERIFICATION.md`

## Boundary and evidentiary posture

This document is a reproducible source corpus, not a synthesis of what
STORYMACHINE should become. It records what each source can and cannot support.
It does not treat product copy as proof, does not infer private competitor
internals, and does not claim that public research validates demand or scoring
accuracy for this product.

The final corpus contains **48 sources**: **30 formally peer-reviewed sources
(62.5%)**, 12 primary standards/regulatory/professional sources, and six
first-party product or service sources. The academic and gray-literature streams
remain separated below. Thirteen of 48 sources (27.1%) are older than five years;
they are retained because they are foundational measurement, trust, evaluation,
or computational-narrative sources rather than evidence of current market state.

## Search strategy

### Systems and source classes

1. **General web discovery through the Codex web search interface.** Searches
   targeted peer-reviewed publisher records, ACL Anthology, ACM material,
   PubMed, official government/standards domains, professional guild material,
   and first-party product pages. The interface does not expose stable database
   hit totals, so the screening count begins with records manually moved into
   the candidate ledger rather than pretending to report all possible hits.
2. **Crossref REST API metadata verification.** Exact DOI lookups used
   `GET https://api.crossref.org/works/{url-encoded-doi}` for 33 identifiers.
   Thirty-one intended records resolved; the COLING 2022 record had no Crossref
   DOI; one initially suspected DOI resolved to a different work and was rejected
   and replaced with the correct DOI (`10.1145/3449287`).
3. **Semantic Scholar Graph API deduplication.** Exact DOI lookups used
   `GET https://api.semanticscholar.org/graph/v1/paper/DOI:{doi}` for 28 academic
   records. Seven resolved before unauthenticated rate limiting; 21 returned HTTP
   429 and are recorded as **degraded**, not as unmatched. DOI/title deduplication
   remained available and found no duplicate among final records.
4. **Primary source systems/classes.** ACL Anthology and publisher landing pages
   supplied research metadata; NIST, FTC, U.S. Copyright Office, EUR-Lex, W3C,
   OWASP, AERA, and WGA supplied primary guidance or governing text; vendor pages
   supplied only their own current claims, workflow, and price snapshots.

### Exact discovery queries

The following strings were run on 2026-07-14, in this order. Domain restrictions
shown here were part of the query string.

```text
screenwriting feedback writers needs peer reviewed study screenplay coverage creative writing feedback
computational narratology automated story evaluation validity peer reviewed screenplay feedback
human AI collaborative creative writing user study screenplay scripts large language models
inter-rater reliability measurement validity subjective ratings creativity evaluation peer reviewed
site:dl.acm.org creative writing machine loop Clark 2018 Wordcraft CoAuthor
site:aclanthology.org story evaluation human evaluation narrative generation review
site:doi.org interrater reliability Hallgren Koo Li McHugh measurement validity Messick
site:dl.acm.org human AI decision support trust overreliance algorithm aversion systematic review
Lee See 2004 Trust in automation human factors DOI
algorithm aversion appreciation human AI decision support overreliance peer reviewed DOI
human AI decision making systematic review trust reliance calibration 2023 peer reviewed
Buçinca To trust or to think cognitive forcing functions AI-assisted decision making DOI
site:nist.gov AI Risk Management Framework Generative AI Profile official privacy secure software development framework
site:owasp.org API Security Top 10 2023 LLM applications prompt injection official
site:w3.org WCAG 2.2 Recommendation accessibility official
site:ftc.gov AI claims disclosure consumer protection generative AI official guidance
site:ftc.gov "Keep your AI claims in check"
site:copyright.gov AI report copyrightability generative AI training report official 2025
site:eur-lex.europa.eu Regulation EU 2024 1689 transparency AI generated content official
site:wga.org MBA 2023 artificial intelligence disclosure literary material official
site:ico.org.uk generative AI data protection guidance privacy developers official
site:cppa.ca.gov CCPA privacy notice deletion sensitive personal information official regulations
site:ftc.gov business guidance generative AI data privacy uploaded files confidential data
site:edpb.europa.eu AI models personal data opinion 2024 official
official screenplay coverage service The Black List evaluations pricing reader criteria
official WeScreenplay script coverage service pricing turnaround reader notes
official CoverflyX peer script feedback exchange how it works
official AI screenplay coverage analysis product script reader AI competitor
site:blcklst.com writers evaluations screenplay official
site:wescreenplay.com script coverage official coverage services
site:coverfly.com/x peer feedback CoverflyX official
site:scriptreaderpro.com script coverage official services
"Understanding Screenwriters' Practices, Attitudes" publication DOI
screenwriters feedback revision practices qualitative study peer reviewed HCI
"Co-Writing Screenplays and Theatre Scripts" DOI CHI 2023
"unmet creativity support needs" writers DOI
Hallgren 2012 Computing Inter-Rater Reliability DOI
Koo Li 2016 intraclass correlation coefficients guideline DOI
Artstein Poesio 2008 inter-coder agreement computational linguistics DOI
Flake Fried 2020 measurement schmeasurement DOI
Standards for Educational and Psychological Testing 2014 validity reliability official AERA APA NCME
Messick 1995 validity psychological assessment DOI American Psychologist
creative product assessment reliability expert judges consensual assessment technique DOI review
AI as judge bias evaluation LLM human preferences peer reviewed 2024 DOI
"Co-Writing Screenplays and Theatre Scripts with Language Models" "10.1145"
"Wordcraft: Story Writing with Large Language Models" 10.1145
"CoAuthor: Designing a Human-AI Collaborative Writing Dataset" DOI
"Creative Writing with a Machine in the Loop" DOI
Kybartas Bidarra Survey on story generation techniques DOI ACM Computing Surveys
computational narratology narrative understanding challenges survey DOI
human evaluation natural language generation best practices 2019 DOI van der Lee
survey evaluation methods text generation Celikyilmaz DOI
systematic review human AI collaboration decision making complementarity overreliance DOI 2023
Schemmer human AI complementarity systematic review DOI
algorithm aversion Dietvorst Simmons Massey 2015 DOI algorithm appreciation Logg 2019 DOI
explanations increase overreliance AI assisted decision making peer reviewed DOI
"When combinations of humans and AI are useful" DOI
site:nature.com "When combinations of humans and AI are useful"
"A Systematic Review on Fostering Appropriate Trust" DOI ACM
"To Trust or to Think" 10.1145 DOI
site:dl.acm.org/doi "To Trust or to Think" Buçinca
"To Trust or to Think" "10.1145/3411764"
Bucinca Malaya Gajos CHI 2021 DOI
"Feedback Exchange and Online Affinity" DOI CSCW
"Feedback Exchange and Online Affinity: A Case Study of Online Fanfiction Writers" publication
creative writing workshop feedback revision peer reviewed writer needs feedback DOI
```

### Search parameters

- **Date range:** No hard lower bound. Current empirical and technical evidence
  was preferred; older sources were retained only when foundational or still the
  governing methodological reference.
- **Language:** English. This follows the Phase 1 U.S./English-language product
  context and is not evidence of global representativeness.
- **Document types:** Peer-reviewed journal articles and conference papers;
  systematic reviews/meta-analysis; primary standards, regulation, regulator and
  guild guidance; and first-party competitor/service pages.
- **Inclusion:** Directly informs writer feedback needs, screenplay or creative
  writing practice, narrative computation/evaluation, subjective-score validity,
  rater reliability, human–AI reliance, security/privacy/accessibility/disclosure/
  copyright constraints, or the current alternative-service landscape.
- **Exclusion:** Unverifiable citations; SEO roundups and press releases when a
  primary source existed; Reddit/anecdote as outcome evidence; unrelated writing
  pedagogy; duplicate preprint/published versions; inaccessible pages whose
  material claims could not be independently confirmed; and product claims
  presented as proof of effectiveness.

### Screening flow (PRISMA-S-inspired, not a claimed systematic review)

```text
Records moved from returned result pages into candidate ledger: 86
Duplicates removed by DOI, normalized title, or preprint/version match: 18
Unique records screened by title/abstract/landing page: 68
Excluded at pass 1 as tangential, secondary, or too weak: 11
Primary/full-text or authoritative landing pages assessed: 57
Excluded at pass 2: 8
Final sources included: 48
  Peer-reviewed academic: 30
  Official/professional primary gray literature: 12
  First-party product/industry evidence: 6
```

The eight pass-2 exclusions were: three 2026 preprints without peer review that
added no unique mature evidence; Wikipedia's script-coverage entry; a current
Black List page that could not be retrieved or independently verified; a current
WeScreenplay page that could not be retrieved; one competitor-authored comparison
page duplicating first-party feature claims; and a cluster of Reddit anecdotes
that was screened as negative-evidence leads but excluded from the evidentiary
corpus. Search-result snippets were never treated as substitutes for a verified
source.

### Distributional-skew check

No required `DISTRIBUTIONAL_SKEW_ADVISORY` threshold was triggered:

- **Time:** 29/42 sources with known publication years (69.0%) are from
  2021–2026, immediately below the 70% threshold. Six product pages have no stable
  publication year and were excluded from this denominator.
- **Geography:** jurisdiction or study-site metadata was too incomplete for a
  responsible research-wide percentage. In the 12 official/professional sources,
  U.S.-specific sources are 8/12 (66.7%); EU and global standards supply the rest.
- **Method:** no single known method class reaches 70%; the corpus intentionally
  combines qualitative interviews, controlled experiments, computational
  benchmarks, reviews/meta-analysis, methodological guidance, governing texts,
  and market observations.
- **Venue tier:** peer-reviewed evidence is 30/48 (62.5%) and gray literature is
  18/48 (37.5%). The gray stream is necessary for law, standards, professional
  practice, and current product claims and is never promoted to outcome evidence.

Substantive cautions remain despite no mechanical advisory: all sources are
English-language; current screenwriter-specific empirical research is sparse;
and the public competitor record overrepresents vendor incentives and omits
private performance, retention, support, and unit-economics data.

## Annotated bibliography — peer-reviewed academic evidence

### Writer needs, feedback exchange, and human–AI creative writing

#### A01 — Feedback exchange and affinity

Cheng, R., & Frens, J. (2022). Feedback exchange and online affinity: A case
study of online fanfiction writers. *Proceedings of the ACM on Human-Computer
Interaction, 6*(CSCW2), 1–29. https://doi.org/10.1145/3555127

- **Method/key finding:** Interview study with 29 fanfiction writers; identifies
  distinct feedback practices and the importance of trust, affinity, identity,
  and relationship-building in critique exchange.
- **Relevance/contribution:** Direct evidence that feedback utility is social and
  contextual, not only a property of comment content or score accuracy.
- **Limits/incentive:** Fanfiction affinity spaces are not professional
  screenwriting or paid coverage; qualitative sample limits generalization. No
  commercial conflict detected.
- **Quality:** Level VI qualitative; Grade B.

#### A02 — Screenwriters' AI practices and expectations

Tang, Y., Li, H., Lan, M., Ma, X., & Qu, H. (2025). Understanding
screenwriters' practices, attitudes, and future expectations in human-AI
co-creation. In *Proceedings of the 2025 CHI Conference on Human Factors in
Computing Systems* (pp. 1–18). https://doi.org/10.1145/3706598.3714120

- **Method/key finding:** Semi-structured interviews with 23 screenwriters map AI
  use across goals/ideas, structure/plot, screenplay text, and dialogue, and frame
  desired AI roles as actor, audience, expert, and executor.
- **Relevance/contribution:** The most directly population-aligned empirical
  source in the corpus for current screenwriter workflows and expectations.
- **Limits/incentive:** Small self-selected qualitative sample; attitudes and
  reported practices do not establish usefulness, demand, or outcome improvement.
  No commercial conflict detected.
- **Quality:** Level VI qualitative; Grade B.

#### A03 — Dramatron evaluated by industry professionals

Mirowski, P., Mathewson, K. W., Pittman, J., & Evans, R. (2023). Co-writing
screenplays and theatre scripts with language models: Evaluation by industry
professionals. In *Proceedings of the 2023 CHI Conference on Human Factors in
Computing Systems* (pp. 1–34). https://doi.org/10.1145/3544548.3581225

- **Method/key finding:** Fifteen theatre and film professionals used Dramatron
  and participated in open-ended interviews; the paper reports possible
  co-creative value alongside coherence, bias, plagiarism, and authorship issues.
- **Relevance/contribution:** Direct screenplay/theatre professional evidence and
  explicit human-in-the-loop and participatory-design framing.
- **Limits/incentive:** Small formative study of a system built by the authors;
  several authors were affiliated with DeepMind, creating developer-evaluator
  and employer incentives. It evaluates co-writing, not automated coverage.
- **Quality:** Level VI mixed qualitative/design study; Grade B.

#### A04 — Unmet computational writing support needs

Kreminski, M., & Martens, C. (2022). Unmet creativity support needs in
computationally supported creative writing. In *Proceedings of the First
Workshop on Intelligent and Interactive Writing Assistants* (pp. 74–82).
https://doi.org/10.18653/v1/2022.in2writing-1.11

- **Method/key finding:** Theory-grounded review identifies needs beyond
  "getting unstuck": consistency, plot structure, reader experience, and
  refinement of expressive intent.
- **Relevance/contribution:** Supplies a writer-centered taxonomy against which
  a feedback tool's scope can be examined.
- **Limits/incentive:** Workshop synthesis, not a new population study; it covers
  creative writing broadly and predates the latest models. No commercial conflict
  detected.
- **Quality:** Level V descriptive/theoretical review; Grade B.

#### A05 — Machine suggestions do not necessarily improve artifacts

Clark, E., Ross, A. S., Tan, C., Ji, Y., & Smith, N. A. (2018). Creative writing
with a machine in the loop. In *23rd International Conference on Intelligent
User Interfaces* (pp. 329–340). https://doi.org/10.1145/3172944.3172983

- **Method/key finding:** Two controlled case studies compared writing with
  prototype suggestions against writing alone. Participants found the process fun
  and potentially helpful, but machine suggestions did not necessarily produce
  better writing.
- **Relevance/contribution:** Important negative result separating subjective
  experience from artifact quality.
- **Limits/incentive:** Small slogan/short-story studies, older generation
  technology, and crowd judgments; not screenplay coverage. Authors evaluated
  their prototypes.
- **Quality:** Level III controlled studies; Grade B.

#### A06 — Wordcraft

Yuan, A., Coenen, A., Reif, E., & Ippolito, D. (2022). Wordcraft: Story writing
with large language models. In *27th International Conference on Intelligent
User Interfaces* (pp. 841–852). https://doi.org/10.1145/3490099.3511105

- **Method/key finding:** User study compares short-story writing with and
  without an LLM interface and reports value for conversational requests and
  idea-unblocking, alongside limits of controllability and model output.
- **Relevance/contribution:** Concrete interaction patterns for writer agency and
  selective use of AI suggestions.
- **Limits/incentive:** Short stories rather than feature scripts; formative
  sample and authors built the tool. Google-affiliated research creates a product
  ecosystem incentive but is disclosed.
- **Quality:** Level III controlled/formative HCI study; Grade B.

#### A07 — CoAuthor

Lee, M., Liang, P., & Yang, Q. (2022). CoAuthor: Designing a human-AI
collaborative writing dataset for exploring language model capabilities. In
*CHI Conference on Human Factors in Computing Systems* (pp. 1–19).
https://doi.org/10.1145/3491102.3502030

- **Method/key finding:** Dataset of 1,445 creative and argumentative writing
  sessions from 63 writers interacting with four GPT-3 configurations; exposes
  how capability claims depend on the definition of collaboration.
- **Relevance/contribution:** Rich interaction data and a model for separating
  suggestion use, language contribution, and writer behavior.
- **Limits/incentive:** Timed short-form tasks and GPT-3; no screenplay coverage
  outcome. Authors designed the dataset/interface; no direct commercial conflict
  detected.
- **Quality:** Level VI dataset/descriptive interaction study; Grade A for its
  dataset claim, B for transfer to screenwriting.

### Computational narratology and automated evaluation validity

#### A08 — Computational narrative authoring survey

Kybartas, B., & Bidarra, R. (2017). A survey on story generation techniques for
authoring computational narratives. *IEEE Transactions on Computational
Intelligence and AI in Games, 9*(3), 239–253.
https://doi.org/10.1109/TCIAIG.2016.2546063

- **Method/key finding:** Structured survey organizes mixed-initiative narrative
  systems by automation of plot and space and identifies open research directions.
- **Relevance/contribution:** Establishes that computational narrative authoring
  is not one solved construct and that human/machine initiative varies by task.
- **Limits/incentive:** Pre-transformer survey and focused partly on interactive
  narratives/games; not an evaluation-validity study. No conflict detected.
- **Quality:** Level V review; Grade B (foundational).

#### A09 — Computational narrative understanding survey

Ranade, P., Dey, S., Joshi, A., & Finin, T. (2022). Computational understanding
of narratives: A survey. *IEEE Access, 10*, 101575–101594.
https://doi.org/10.1109/ACCESS.2022.3205314

- **Method/key finding:** Survey maps narrative understanding problems and open
  challenges spanning event, relationship, and discourse representations.
- **Relevance/contribution:** Demonstrates the breadth and high-level reasoning
  demands hidden behind a generic claim to "understand" a script.
- **Limits/incentive:** Broad survey rather than screenplay-specific benchmark;
  IEEE Access venue warrants ordinary peer-review caution. No conflict detected.
- **Quality:** Level V review; Grade B.

#### A10 — HANNA and metric correlation

Chhun, C., Colombo, P., Suchanek, F. M., & Clavel, C. (2022). Of human criteria
and automatic metrics: A benchmark of the evaluation of story generation. In
*Proceedings of the 29th International Conference on Computational Linguistics*
(pp. 5794–5836). https://aclanthology.org/2022.coling-1.509/

- **Method/key finding:** Introduces six human criteria and HANNA, with 1,056
  stories from 10 systems, then compares 72 automatic metrics; reports major
  weaknesses and lack of consensus in story evaluation.
- **Relevance/contribution:** Direct benchmark evidence against assuming that an
  automatically computed story-quality score tracks human judgment.
- **Limits/incentive:** Generated short stories and research systems, not real
  screenplays or revision outcomes. Authors created the benchmark; no commercial
  conflict detected.
- **Quality:** Level III controlled computational benchmark; Grade A.

#### A11 — LLMs as automatic story evaluators

Chhun, C., Suchanek, F. M., & Clavel, C. (2024). Do language models enjoy their
own stories? Prompting large language models for automatic story evaluation.
*Transactions of the Association for Computational Linguistics, 12*, 1122–1142.
https://doi.org/10.1162/tacl_a_00689

- **Method/key finding:** Compares LLM ratings with human annotations and other
  automatic measures; LLMs improve system-level correlation over earlier metrics
  but still provide unsatisfactory explanations and remain prompt-sensitive.
- **Relevance/contribution:** Directly tests the proposition that an LLM can
  replace human story evaluators and supplies a bounded, mixed result.
- **Limits/incentive:** System-level correlation is not instance-level validity;
  short generated stories differ from real drafts. Same research line as HANNA;
  no commercial conflict detected.
- **Quality:** Level III controlled benchmark; Grade A.

#### A12 — OpenMEVA negative benchmark

Guan, J., Zhang, Z., Feng, Z., Liu, Z., Ding, W., Mao, X., Fan, C., & Huang, M.
(2021). OpenMEVA: A benchmark for evaluating open-ended story generation
metrics. In *Proceedings of the 59th Annual Meeting of the Association for
Computational Linguistics* (pp. 6394–6407).
https://doi.org/10.18653/v1/2021.acl-long.500

- **Method/key finding:** Tests metric correlation, generalization, coherence
  discrimination, and robustness; existing metrics correlate poorly with human
  judgments and miss discourse-level incoherence, causal order, and robustness.
- **Relevance/contribution:** Strong negative evidence for validating a metric on
  realistic perturbations and human judgments rather than synthetic fire/no-fire
  tests alone.
- **Limits/incentive:** Story-generation outputs, not screenplay feedback or
  professional-reader outcomes. Benchmark authorship creates ordinary method
  advocacy, not a detected commercial conflict.
- **Quality:** Level III controlled benchmark; Grade A.

#### A13 — Authenticity gap in human evaluation

Ethayarajh, K., & Jurafsky, D. (2022). The authenticity gap in human evaluation.
In *Proceedings of the 2022 Conference on Empirical Methods in Natural Language
Processing* (pp. 6056–6070).
https://doi.org/10.18653/v1/2022.emnlp-main.406

- **Method/key finding:** Shows that common averaged Likert ratings embed strong
  assumptions and can reverse underlying preferences; proposes system-level
  probabilistic assessment for open-ended generation.
- **Relevance/contribution:** A direct warning that rating-scale design can
  invalidate apparently well-powered story comparisons.
- **Limits/incentive:** Method is demonstrated on generated text/model ordering,
  not professional screenplay labels or actionable feedback. No conflict detected.
- **Quality:** Level III methodological/computational study; Grade A.

#### A14 — Human evaluation best practices

van der Lee, C., Gatt, A., van Miltenburg, E., Wubben, S., & Krahmer, E. (2019).
Best practices for the human evaluation of automatically generated text. In
*Proceedings of the 12th International Conference on Natural Language
Generation* (pp. 355–368). https://doi.org/10.18653/v1/W19-8643

- **Method/key finding:** Literature-grounded review documents high variation in
  human NLG evaluation and recommends explicit criteria, rater recruitment,
  instruments, quality controls, and statistical reporting.
- **Relevance/contribution:** Reproducible design guidance for any future
  writer/reader benchmark.
- **Limits/incentive:** General NLG, not screenplay-specific; best-practice review
  rather than intervention evidence. No conflict detected.
- **Quality:** Level V review/guideline; Grade A for methodological use.

#### A15 — Human and LLM judge bias

Chen, G. H., Chen, S., Liu, Z., Jiang, F., & Wang, B. (2024). Humans or LLMs as
the judge? A study on judgement bias. In *Proceedings of the 2024 Conference on
Empirical Methods in Natural Language Processing* (pp. 8301–8327).
https://doi.org/10.18653/v1/2024.emnlp-main.474

- **Method/key finding:** Thousands of evaluations test misinformation,
  gender, authority, and beauty perturbations; both human and leading LLM judges
  show exploitable biases.
- **Relevance/contribution:** Negative evidence against treating a single LLM
  judge, or unaudited human ratings, as an impartial truth source.
- **Limits/incentive:** General evaluation tasks rather than screenplay craft;
  perturbation framework cannot enumerate every creative-domain bias. No
  commercial conflict detected.
- **Quality:** Level III controlled benchmark; Grade A.

#### A16 — Recent story-generation survey

Ma, Y., Susilo, R., Haslum, P., & Suominen, H. (2026). Text-to-text automatic
story generation: A survey. In *Proceedings of the 19th Conference of the
European Chapter of the Association for Computational Linguistics (Volume 4:
Student Research Workshop)* (pp. 514–527).
https://doi.org/10.18653/v1/2026.eacl-srw.39

- **Method/key finding:** Systematic review of 57 recent papers reports continuing
  challenges in coherence, character consistency, diversity, controllability,
  datasets, and evaluation.
- **Relevance/contribution:** Current field snapshot and explicit negative-results
  inventory.
- **Limits/incentive:** Student workshop review; focuses generation, not feedback;
  2026 publication is too recent for mature citation/replication history. No
  conflict detected.
- **Quality:** Level V structured descriptive survey; Grade B. Its targeted
  search and screening flow are useful, but the paper does not report the
  comprehensive search, study-quality appraisal, or registered method required
  for this audit's Level I classification.

### Measurement, validity, and inter-rater reliability

#### A17 — Questionable measurement practices

Flake, J. K., & Fried, E. I. (2020). Measurement schmeasurement: Questionable
measurement practices and how to avoid them. *Advances in Methods and Practices
in Psychological Science, 3*(4), 456–465.
https://doi.org/10.1177/2515245920952393

- **Method/key finding:** Defines questionable measurement practices and argues
  that absent construct definitions, validity evidence, and transparent measure
  decisions threaten every downstream inference.
- **Relevance/contribution:** Direct standard for separating a reproducible score
  from a validated construct.
- **Limits/incentive:** Methodological critique, not an empirical validation of a
  screenplay instrument. No conflict detected.
- **Quality:** Level VII methodological expert analysis; Grade A for its claim.

#### A18 — Unified validity argument

Messick, S. (1995). Validity of psychological assessment: Validation of
inferences from persons' responses and performances as scientific inquiry into
score meaning. *American Psychologist, 50*(9), 741–749.
https://doi.org/10.1037/0003-066X.50.9.741

- **Method/key finding:** Treats validity as evidence for score interpretation
  and use, including consequences, rather than a fixed property of a test.
- **Relevance/contribution:** Foundational basis for requiring evidence for the
  exact screenplay-score interpretation and decision being claimed.
- **Limits/incentive:** Foundational conceptual work from 1995; not a domain study
  or current implementation recipe. Author was affiliated with ETS; institutional
  measurement interest is transparent.
- **Quality:** Level VII foundational theory; Grade A for construct-validity use.

#### A19 — Inter-rater reliability tutorial

Hallgren, K. A. (2012). Computing inter-rater reliability for observational data:
An overview and tutorial. *Tutorials in Quantitative Methods for Psychology,
8*(1), 23–34. https://doi.org/10.20982/tqmp.08.1.p023

- **Method/key finding:** Explains design choice, kappa/ICC selection,
  interpretation, reporting, and the effect of unreliable ratings on statistical
  power.
- **Relevance/contribution:** Practical guardrail for reader-label protocols and
  repeatability claims.
- **Limits/incentive:** Tutorial examples are observational research, not ordinal
  screenplay panels; threshold conventions require contextual justification. No
  conflict detected.
- **Quality:** Level VII methodological tutorial; Grade A for method selection.

#### A20 — Agreement in computational annotation

Artstein, R., & Poesio, M. (2008). Inter-coder agreement for computational
linguistics. *Computational Linguistics, 34*(4), 555–596.
https://doi.org/10.1162/coli.07-034-R2

- **Method/key finding:** Surveys agreement coefficients, their assumptions, and
  annotation-task use; warns that coefficient choice and interpretation are not
  interchangeable.
- **Relevance/contribution:** Bridges rater reliability directly to language and
  discourse annotation.
- **Limits/incentive:** Older survey; screenplay quality ratings may be more
  subjective and multidimensional than annotation labels. No conflict detected.
- **Quality:** Level V systematic methodological survey; Grade A.

#### A21 — Selecting and reporting ICC

Koo, T. K., & Li, M. Y. (2016). A guideline of selecting and reporting
intraclass correlation coefficients for reliability research. *Journal of
Chiropractic Medicine, 15*(2), 155–163.
https://doi.org/10.1016/j.jcm.2016.02.012

- **Method/key finding:** Distinguishes 10 ICC forms and requires reporting the
  model, type, definition, and confidence interval matched to the design.
- **Relevance/contribution:** Prevents a generic "ICC" claim that hides whether
  individual or average readers, consistency or absolute agreement, are intended.
- **Limits/incentive:** Medical-method tutorial and commonly repeated heuristic
  cutoffs; not evidence for screenplay-specific acceptable reliability. No
  conflict detected.
- **Quality:** Level VII methodological guideline; Grade A for ICC reporting.

#### A22 — Expert versus nonexpert creativity ratings

Kaufman, J. C., Baer, J., Cole, J. C., & Sexton, J. D. (2008). A comparison of
expert and nonexpert raters using the consensual assessment technique.
*Creativity Research Journal, 20*(2), 171–178.
https://doi.org/10.1080/10400410802059929

- **Method/key finding:** Nonexpert creativity judgments were less internally
  consistent and did not match expert judgments in the studied creative domain.
- **Relevance/contribution:** Evidence that reader expertise is not an
  interchangeable sampling detail for creative-product labels.
- **Limits/incentive:** Domain/task and sample may not transfer to screenplays;
  expert consensus is reliability evidence, not complete criterion validity. No
  conflict detected.
- **Quality:** Level III comparative study; Grade B.

#### A23 — Expertise and domain in consensual assessment

Kaufman, J. C., Baer, J., & Cole, J. C. (2009). Expertise, domains, and the
consensual assessment technique. *The Journal of Creative Behavior, 43*(4),
223–233. https://doi.org/10.1002/j.2162-6057.2009.tb01316.x

- **Method/key finding:** Tests how expert and novice consistency changes across
  creative domains and reports more reliable expert ratings.
- **Relevance/contribution:** Supports domain-matched experienced readers and
  makes expertise part of the measurement design.
- **Limits/incentive:** Creativity-task evidence is indirect; agreement can still
  encode shared convention or bias. No conflict detected.
- **Quality:** Level III comparative study; Grade B.

### Human–AI trust, reliance, and decision support

#### A24 — Appropriate reliance

Lee, J. D., & See, K. A. (2004). Trust in automation: Designing for appropriate
reliance. *Human Factors, 46*(1), 50–80.
https://doi.org/10.1518/hfes.46.1.50_30392

- **Method/key finding:** Integrative review relates trust to reliance and argues
  that design should calibrate reliance to actual capability rather than maximize
  trust.
- **Relevance/contribution:** Foundational trust model for feedback interfaces
  that can be confidently wrong.
- **Limits/incentive:** Predates modern generative AI and is an integrative review,
  not a screenplay-specific experiment. No conflict detected.
- **Quality:** Level V integrative review; Grade A (foundational).

#### A25 — Systematic review of appropriate trust

Mehrotra, S., Degachi, C., Vereschak, O., Jonker, C. M., & Tielman, M. L.
(2024). A systematic review on fostering appropriate trust in human-AI
interaction: Trends, opportunities and challenges. *ACM Journal on Responsible
Computing, 1*(4), Article 26. https://doi.org/10.1145/3696449

- **Method/key finding:** PRISMA-informed review finds fragmented definitions and
  measures across calibrated trust, appropriate reliance, and warranted trust;
  maps beliefs, intentions, and actions.
- **Relevance/contribution:** Prevents substituting a satisfaction or stated-trust
  score for observed appropriate use.
- **Limits/incentive:** Heterogeneous tasks and immature field; a review of
  interventions is not proof that any one UI generalizes. No conflict detected.
- **Quality:** Level I systematic review; Grade A.

#### A26 — Human–AI collaboration meta-analysis

Vaccaro, M., Almaatouq, A., & Malone, T. (2024). When combinations of humans and
AI are useful: A systematic review and meta-analysis. *Nature Human Behaviour,
8*(12), 2293–2303. https://doi.org/10.1038/s41562-024-02024-1

- **Method/key finding:** Meta-analysis of more than 100 experiments and 370
  effect sizes finds augmentation over humans alone on average but no average
  synergy over the better of human or AI; effects vary by task, with creation
  tasks more favorable than decision tasks.
- **Relevance/contribution:** High-value negative/conditional evidence against
  assuming "human in the loop" automatically improves the best available result.
- **Limits/incentive:** Broad cross-domain aggregation; few studies preassign
  complementary subtasks and creative tasks vary substantially. No commercial
  conflict detected.
- **Quality:** Level I systematic review/meta-analysis; Grade A.

#### A27 — Cognitive forcing and overreliance

Buçinca, Z., Malaya, M. B., & Gajos, K. Z. (2021). To trust or to think:
Cognitive forcing functions can reduce overreliance on AI in AI-assisted
decision-making. *Proceedings of the ACM on Human-Computer Interaction,
5*(CSCW1), Article 188. https://doi.org/10.1145/3449287

- **Method/key finding:** Controlled experiment (N = 199) finds cognitive-forcing
  designs reduce acceptance of wrong AI advice, but users rate the most effective
  designs less favorably and effects vary by need for cognition.
- **Relevance/contribution:** Separates safety/effectiveness from immediate
  preference and shows the cost of requiring reflective engagement.
- **Limits/incentive:** Artificial decision task, not creative revision; subgroup
  effect and preference tradeoff need replication in writers. Authors designed
  the interventions; no commercial conflict detected.
- **Quality:** Level III controlled experiment; Grade A.

#### A28 — When explanations reduce overreliance

Vasconcelos, H., Jörke, M., Grunde-McLaughlin, M., Gerstenberg, T., Bernstein,
M. S., & Krishna, R. (2023). Explanations can reduce overreliance on AI systems
during decision-making. *Proceedings of the ACM on Human-Computer Interaction,
7*(CSCW1), 1–38. https://doi.org/10.1145/3579605

- **Method/key finding:** Five studies (N = 731) model explanation engagement as
  cost-benefit behavior; task difficulty, explanation difficulty, and incentives
  alter overreliance.
- **Relevance/contribution:** Shows why explanation availability alone is not a
  reliable trust intervention and why verification cost matters.
- **Limits/incentive:** Maze tasks and simulated AI limit transfer to long-form
  writing; evidence concerns decisions with verifiable answers. No commercial
  conflict detected.
- **Quality:** Level II/III controlled experiments; Grade A.

#### A29 — Algorithm aversion

Dietvorst, B. J., Simmons, J. P., & Massey, C. (2015). Algorithm aversion:
People erroneously avoid algorithms after seeing them err. *Journal of
Experimental Psychology: General, 144*(1), 114–126.
https://doi.org/10.1037/xge0000033

- **Method/key finding:** Experiments show people may reject algorithms after
  observing error even when the algorithm still outperforms them.
- **Relevance/contribution:** Complements overreliance evidence: trust failure can
  produce both overuse and underuse, especially after visible mistakes.
- **Limits/incentive:** Forecasting tasks, not subjective creative judgments;
  later literature complicates a single universal "aversion" effect. No conflict
  detected.
- **Quality:** Level II experimental evidence; Grade A.

#### A30 — Complementarity conditions

Hemmer, P., Schemmer, M., Kühl, N., Vössing, M., & Satzger, G. (2025).
Complementarity in human-AI collaboration: Concept, sources, and evidence.
*European Journal of Information Systems, 34*(6), 979–1002.
https://doi.org/10.1080/0960085X.2025.2475962

- **Method/key finding:** Formalizes complementarity and tests information and
  capability asymmetry as sources in two empirical studies.
- **Relevance/contribution:** Supplies a testable alternative to vague claims that
  humans and AI have "different strengths."
- **Limits/incentive:** Decision-making tasks and recent publication; IBM
  affiliations among authors create an industry-AI incentive that is visible in
  metadata but not evidence of misconduct.
- **Quality:** Level III theoretical/empirical studies; Grade B.

## Annotated bibliography — official and professional primary sources

#### G01 — Testing standards

American Educational Research Association, American Psychological Association,
& National Council on Measurement in Education. (2014). *Standards for
educational and psychological testing*. American Educational Research
Association. https://www.aera.net/Publications/Books/Standards-for-Educational-Psychological-Testing-2014-Edition

- **Authority/use:** Joint professional standard for validity, reliability,
  fairness, scoring, reporting, and test use; authoritative for measurement
  design, not evidence that STORYMACHINE satisfies it.
- **Limits/incentive/quality:** Committee standard and sold publication, not a
  screenplay study. Level VII; Grade A for governing measurement practice.

#### G02 — NIST generative-AI risk profile

Autio, C., Schwartz, R., Dunietz, J., Jain, S., Stanley, M., Tabassi, E., Hall,
P., & Roberts, K. (2024). *Artificial intelligence risk management framework:
Generative artificial intelligence profile* (NIST AI 600-1). National Institute
of Standards and Technology. https://doi.org/10.6028/NIST.AI.600-1

- **Authority/use:** Cross-sector profile for identifying, measuring, and
  managing generative-AI risks across lifecycle and governance functions.
- **Limits/incentive/quality:** Voluntary U.S. guidance, deliberately broad and
  not a compliance certificate. Public-agency mandate; Level VII, Grade A.

#### G03 — NIST secure development for generative AI

Booth, H., Souppaya, M., Vassilev, A., Ogata, M., Stanley, M., & Scarfone, K.
(2024). *Secure software development practices for generative AI and dual-use
foundation models: An SSDF community profile* (NIST SP 800-218A). National
Institute of Standards and Technology. https://doi.org/10.6028/NIST.SP.800-218A

- **Authority/use:** Extends SSDF practices across the AI software lifecycle and
  supports secure development/acquisition review.
- **Limits/incentive/quality:** High-level community profile, not a product threat
  model or audit result. Public-agency mandate; Level VII, Grade A.

#### G04 — OWASP API Security Top 10

OWASP Foundation. (2023). *OWASP API Security Top 10—2023*.
https://owasp.org/API-Security/editions/2023/en/0x11-t10/

- **Authority/use:** Practitioner consensus on broken authorization,
  authentication, resource consumption, SSRF, misconfiguration, inventory, and
  unsafe third-party API consumption.
- **Limits/incentive/quality:** Awareness list, not exhaustive control standard;
  OWASP reports no contributed dataset for this edition and relies on expert and
  community review. Nonprofit/vendor-neutral posture; Level VII, Grade B.

#### G05 — OWASP Top 10 for LLM applications

OWASP Foundation. (2025). *OWASP Top 10 for LLM applications*.
https://genai.owasp.org/llm-top-10/

- **Authority/use:** Current practitioner taxonomy for prompt injection,
  sensitive information disclosure, improper output handling, excessive agency,
  supply chain, vector/embedding, misinformation, and unbounded consumption.
- **Limits/incentive/quality:** Community threat-awareness document, not measured
  prevalence or proof of mitigation. Project has sponsors but states vendor
  neutrality; Level VII, Grade B.

#### G06 — WCAG 2.2

World Wide Web Consortium. (2024). *Web Content Accessibility Guidelines (WCAG)
2.2*. https://www.w3.org/TR/WCAG22/

- **Authority/use:** Testable accessibility success criteria including focus,
  dragging alternatives, target size, consistent help, redundant entry, and
  accessible authentication.
- **Limits/incentive/quality:** Technical conformance standard cannot establish
  usability for writers with disabilities by itself. Consensus standards body;
  Level VII, Grade A.

#### G07 — FTC AI marketing claims

Atleson, M. (2023, February 27). *Keep your AI claims in check*. Federal Trade
Commission. https://www.ftc.gov/business-guidance/blog/2023/02/keep-your-ai-claims-check

- **Authority/use:** Primary U.S. enforcement guidance that AI performance and
  superiority claims require adequate evidence and cannot shift responsibility
  to a vendor.
- **Limits/incentive/quality:** Nonbinding business guidance and not legal advice;
  page returned HTTP 403 to the research fetch but title/URL were corroborated by
  an FTC official statement. Regulator mandate; Level VII, Grade B.

#### G08 — FTC privacy and confidentiality commitments

Federal Trade Commission. (2024, January). *AI companies: Uphold your privacy
and confidentiality commitments*.
https://www.ftc.gov/policy/advocacy-research/tech-at-ftc/2024/01/ai-companies-uphold-your-privacy-confidentiality-commitments

- **Authority/use:** Highlights sensitive/confidential content submitted to AI
  services, undisclosed secondary use, retention, and potential algorithm/model
  deletion remedies for unlawfully obtained data.
- **Limits/incentive/quality:** Enforcement-policy guidance, not a complete U.S.
  privacy-law map. Regulator mandate; Level VII, Grade A for risk identification.

#### G09 — U.S. Copyright Office: copyrightability

U.S. Copyright Office. (2025). *Copyright and artificial intelligence, Part 2:
Copyrightability*. https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf

- **Authority/use:** States the Office's current position that AI assistance does
  not bar protection, but purely AI-generated material and prompts alone do not
  supply sufficient human authorship; conclusions are case-specific.
- **Limits/incentive/quality:** U.S. administrative interpretation, not a court
  holding or global rule. Public-agency mandate; Level VII, Grade A.

#### G10 — U.S. Copyright Office: training

U.S. Copyright Office. (2025). *Copyright and artificial intelligence, Part 3:
Generative AI training* (Pre-publication version).
https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-3-Generative-AI-Training-Report-Pre-Publication-Version.pdf

- **Authority/use:** Primary policy analysis of copyrighted works in model
  training, fair use, licensing, and remedies.
- **Limits/incentive/quality:** Explicitly pre-publication at retrieval; the Office
  says no substantive change is expected, but it is not the final version and is
  not a judicial ruling. Level VII, Grade B pending final publication.

#### G11 — EU Artificial Intelligence Act

European Parliament & Council of the European Union. (2024). Regulation (EU)
2024/1689 laying down harmonised rules on artificial intelligence. *Official
Journal of the European Union*. https://eur-lex.europa.eu/eli/reg/2024/1689/oj

- **Authority/use:** Primary law governing scope, AI literacy, transparency and
  general-purpose-model obligations, with staged application and explicit
  preservation of data-protection law.
- **Limits/incentive/quality:** Applicability depends on actor, feature, market,
  and date; not a global AI-disclosure rule or legal opinion. Legislative source;
  Level VII, Grade A.

#### G12 — WGA AI protections

Writers Guild of America. (2026). *Artificial intelligence* [Summary of 2023
Minimum Basic Agreement protections].
https://www.wga.org/contracts/know-your-rights/artificial-intelligence

- **Authority/use:** Primary union explanation that generative AI is not a writer
  under the MBA, AI output is not literary/source material, and companies must
  disclose AI-generated material supplied to writers.
- **Limits/incentive/quality:** Applies to MBA-covered work, not every user or
  product; WGA advocates for its writer membership. Level VII, Grade A for the
  contract-practice claim.

## Annotated bibliography — product and industry gray literature

These records establish current public alternatives and their claimed workflows.
They do **not** establish accuracy, demand, retention, confidentiality, or outcome
improvement. Prices and features are snapshots retrieved 2026-07-14.

#### P01 — CoverflyX peer exchange

Coverfly. (n.d.). *coverflyX: Free peer-to-peer script notes*.
https://coverfly.com/x/

- **Claim/workflow:** Token-based reciprocal exchange; readers provide minimum
  strengths/weaknesses notes, receive ratings, and face timeliness penalties.
- **Comparative value:** A free, relationship/reputation-mediated human
  alternative rather than automated scoring.
- **Limits/incentive/quality:** First-party product description; no independent
  quality, reliability, safety, or outcome data. Commercial platform incentive;
  Level VII, Grade C.

#### P02 — Script Reader Pro human coverage

Script Reader Pro. (n.d.). *Script coverage services by professional
screenwriters*. https://www.scriptreaderpro.com/our-script-coverage-services/

- **Claim/workflow:** Human, genre-selected coverage from working screenwriters;
  current page advertises feature coverage from $185, tiered note depth, ratings,
  and optional follow-up.
- **Comparative value:** Shows a high-touch professional alternative with choice
  of reader and explicit report deliverables.
- **Limits/incentive/quality:** Vendor claims and testimonials; no blinded
  reliability or revision-outcome evidence. Direct commercial incentive; Level
  VII, Grade C.

#### P03 — Callaia

Callaia. (n.d.). *Industry leading script coverage+*.
https://www.callaia.ai/

- **Claim/workflow:** AI coverage in under a minute from $65/script, with scores,
  synopsis, characters, comps, cast, and market suggestions; claims scripts are
  not used for training and only the user can access them.
- **Comparative value:** Direct AI screenplay-coverage alternative with security
  and speed positioning.
- **Limits/incentive/quality:** All efficacy, objectivity, comprehensiveness, and
  privacy statements are vendor claims; testimonials are selected by the vendor.
  Direct commercial incentive; Level VII, Grade D for effectiveness, C for
  observable feature/pricing claims.

#### P04 — ScriptBook

ScriptBook. (n.d.). *AI screenplay analysis and box office prediction*.
https://www.scriptbook.io/

- **Claim/workflow:** Proprietary/patented script analysis, 6,000+ parameters,
  market and box-office predictions, audience and character analysis, and a
  claimed 87% financial/greenlight accuracy.
- **Comparative value:** Direct automated-analytics alternative emphasizing
  commercial prediction rather than writer-centered revision alone.
- **Limits/incentive/quality:** Accuracy denominator, target, split, calibration,
  and independent replication are not established on the page; promotional press
  and endorsements do not validate the figure. Direct commercial incentive;
  Level VII, Grade D for performance claims.

#### P05 — ScriptCoverage.ai

ScriptCoverage.ai. (n.d.). *Script coverage in minutes*.
https://scriptcoverage.ai/

- **Claim/workflow:** $49–$79 AI analysis using a seven-pass methodology, intake
  focus, online/PDF reports, and a claim that scripts are never used for training.
- **Comparative value:** Direct AI coverage competitor positioning itself as a
  codified human coach methodology.
- **Limits/incentive/quality:** First-party description; neither equivalence to
  the named coach nor feedback validity is independently demonstrated. Direct
  commercial incentive; Level VII, Grade C for workflow and D for effectiveness.

#### P06 — GetScriptCoverage

GetScriptCoverage. (n.d.). *Script Coverage AI—Instant screenplay feedback*.
https://www.getscriptcoverage.com/

- **Claim/workflow:** Current page advertises a $19 report with pass/consider/
  recommend verdict, eight-category scores, synopsis, characters, market and
  contest suggestions, and rewrite priorities.
- **Comparative value:** Low-price, rapid, broad-output AI coverage alternative.
- **Limits/incentive/quality:** "Same criteria" and professional-equivalence
  statements are marketing claims with no public validation protocol. Direct
  commercial incentive; Level VII, Grade C for observable offering and D for
  effectiveness claims.

## Negative-evidence and human-review coverage map

This map ensures the corpus does not select only supportive evidence. It is not a
project verdict.

- **AI help can feel useful without improving the artifact:** A05.
- **Current story metrics correlate weakly, miss discourse failures, or depend on
  evaluation design:** A10–A16.
- **LLM judges can improve over older metrics while retaining poor explanations,
  prompt sensitivity, and bias:** A11 and A15.
- **Human ratings are not automatically valid; scale design and aggregation can
  reverse preferences:** A13 and A17–A23.
- **Expert judgment is still fallible but expertise and domain match affect
  reliability:** A22–A23.
- **Human–AI teams do not automatically beat the stronger member:** A26 and A30.
- **Trust interventions impose cognitive/preference costs and explanations do not
  guarantee verification:** A24–A29.
- **Professional and peer alternatives preserve human interpretation but publish
  little independent reliability or outcome evidence:** P01–P02.
- **AI coverage vendors publish broad feature, security, and performance claims
  without public held-out screenplay benchmarks in the reviewed pages:** P03–P06.

## Verification and deduplication notes

- DOI metadata for academic records was checked against Crossref except A10,
  whose ACL Anthology record did not expose a DOI; its title, authors, venue,
  pages, and URL were verified directly in ACL Anthology.
- The suspected DOI `10.1145/3411764.3445659` was rejected because Crossref
  resolved it to an unrelated pair-programming paper. The correct Buçinca et al.
  DOI is `10.1145/3449287`.
- Semantic Scholar resolved seven DOI records before returning HTTP 429. Per the
  protocol, the 21 remaining lookups are marked degraded, not "unmatched." No
  source is accepted solely because an index returned a match.
- Preprint and version duplicates were collapsed to the published version,
  including Tang et al., Mirowski et al., Lee et al., Buçinca et al., Vaccaro et
  al., and Cheng and Frens.
- Product and law pages are time-sensitive. The source register records the
  retrieval date and distinguishes current page content from claims of efficacy.

## Search limitations

- This is a rigorous applied audit search, not a registered systematic review.
  It does not claim exhaustive coverage of every writing, narratology, HCI,
  psychometrics, security, or legal database.
- The web-search interface did not provide exportable total hit counts. The flow
  therefore reports the auditable candidate ledger, not fabricated database totals.
- Scopus, Web of Science, ProQuest, and paywalled legal research services were not
  directly queried. Crossref, Semantic Scholar, publisher pages, and official
  primary sources provided independent systems/classes, but Semantic Scholar was
  rate-limited.
- Full text was not always available. Source-level conclusions are bounded to
  accessible abstracts, papers, or authoritative landing pages; inaccessible
  vendor pages were excluded.
- The direct empirical screenwriter evidence base is small and mostly qualitative.
  Fiction, fanfiction, NLG, and decision-support findings are adjacent evidence,
  not automatic transfer.
- Product pages reveal incentives and offerings, not private model architecture,
  accuracy, retention, user outcomes, support burden, or unit economics.
- Law and guidance change. This corpus is a 2026-07-14 snapshot and is legal-risk
  research, not legal advice.
- AI-assisted research tools were used for discovery, metadata comparison, and
  drafting. Every included citation was checked against a DOI resolver,
  authoritative index, publisher record, or first-party primary page; uncertain
  citations were excluded rather than labeled acceptable.
