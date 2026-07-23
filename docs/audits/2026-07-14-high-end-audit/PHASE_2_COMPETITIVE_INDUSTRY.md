# Phase 2 — Competitive and Industry Benchmark

**Audit date:** 2026-07-14  
**Market:** screenplay feedback, development notes, coverage, predictive script
analysis, peer exchange, and adjacent general-purpose AI  
**Decision use:** product positioning, trust architecture, price boundary, and
defensibility; not a purchase recommendation or a legal opinion

## Executive verdict

STORYMACHINE does not have a defensible path as "another instant AI coverage
report." That category is already compressed between free peer exchange,
$19–$79 per-script AI reports, $20/month general-purpose LLMs, and much more
expensive named-human services. Price, speed, a long report, a scoring grid,
Pass/Consider/Recommend, follow-up chat, and even a "multi-pass" methodology are
available off the shelf.

More precisely, those mechanisms are **visibly common and therefore weak
publicly observable differentiation in the reviewed set**. Public pages do not
establish substitution, price elasticity, margins, retention, or private
operating strength, so this benchmark does not prove economic commoditization.

One defensibility hypothesis worth testing is a **trustworthy draft diagnostic
and revision system**:
deterministic observables with source locations; explicit uncertainty and
disagreement; version-to-version receipts; a strong confidential-draft contract;
and claims validated against consented real writing and multiple experienced
readers. Optional AI should be framed as an inspectable perspective, not an
automated arbiter. Optional human review should remain the escalation path for
high-stakes interpretation and submission decisions.

This conclusion is not based on accepting competitor marketing. The review found
no public, independently replicated, held-out real-screenplay benchmark for the
quality of the writer-facing feedback produced by any reviewed AI-coverage
vendor. ScriptBook publishes a quantitative proof-of-concept, but it remains a
vendor-published 50-film study without a disclosed dataset, confusion matrix,
pre-registration, calibration analysis, uncertainty, or independent replication.
Customer testimonials and small review-platform samples do not repair that gap.

## Evidence rules and method

### Evidence labels

- **FPO — first-party observable:** a current price, deliverable, workflow step,
  policy term, or UI mechanism visible on an operator-controlled page. This
  verifies what the operator publishes, not that the service performs as claimed.
- **FPC — first-party claim:** speed, quality, accuracy, security, user count,
  outcome, or comparative claim made by the operator but not independently
  established in this review.
- **IND — independent evidence:** evidence published outside the vendor's
  control. Its weight is stated; a customer review is not equivalent to a
  controlled benchmark.
- **INF — audit inference:** a bounded conclusion derived from disclosed facts.
- **UNK — unknown:** a material point not established on the reviewed public
  pages. Unknown is not treated as evidence of failure or misconduct.

### Retrieval and screening

The audit re-opened current first-party product, price, security, privacy, terms,
FAQ, sample, and distribution pages on 2026-07-14. Prices are snapshots and are
shown in the vendors' displayed currencies. A "verified" price below means that
the current first-party page displayed it; it does not mean that checkout was
completed. Proprietary model architecture is never inferred from output style.

Independent customer-review material was screened for platform provenance,
sample size, claimed-profile status, verification markers, recency, and obvious
selection effects. It is retained only as weak failure-mode discovery evidence,
not as efficacy evidence. Vendor-selected testimonials are treated as FPC.

For evidence grading, current vendor pages are Level VII / Grade C for what the
vendor currently publishes and Grade D for efficacy. Convenience customer-review
samples are Level VI / Grade D for efficacy, although a specific complaint may
be Grade C evidence for a failure mode worth testing. Controlled peer-reviewed
story-evaluation benchmarks are Level III / Grade A for their tested constructs,
with explicit limits when transferred from generated short stories to real
screenplays.

### Independent industry-evidence anchors

Four sources bound what can responsibly be inferred from the market pages:

- Interviews with 23 screenwriters found AI use across ideation, structure/plot,
  screenplay text, and dialogue, and described desired AI roles as actor,
  audience, expert, and executor. This supports plural, writer-controlled roles,
  not an assumption that one automated judge is the desired product
  ([Tang et al., CHI 2025](https://doi.org/10.1145/3706598.3714120); Level VI,
  Grade B; small self-selected qualitative sample).
- HANNA compared 72 automatic measures on 1,056 generated stories and found
  major weaknesses and no settled automatic story-evaluation solution
  ([Chhun et al., COLING 2022](https://aclanthology.org/2022.coling-1.509/);
  Level III, Grade A for the benchmark, not screenplay transfer).
- A controlled comparison of LLM story ratings found better system-level
  correlation than older metrics but prompt sensitivity and unsatisfactory
  explanations; system-level correlation is not instance-level diagnostic
  validity
  ([Chhun et al., TACL 2024](https://doi.org/10.1162/tacl_a_00689); Level III,
  Grade A within scope).
- OpenMEVA found weak human correlation and failures on discourse coherence,
  causal order, generalization, and robustness
  ([Guan et al., ACL 2021](https://doi.org/10.18653/v1/2021.acl-long.500);
  Level III, Grade A within scope).

These studies do not prove that a reviewed vendor is inaccurate. They show why
feature lists, metric counts, fluent explanations, and vendor-selected examples
cannot substitute for a real-screenplay validation program.

## Market structure and price ladder

| Segment | Current observable price | Service mode | Core economic promise | Structural limitation |
|---|---:|---|---|---|
| Peer exchange | Free/cashless tokens | Human peers, reciprocal labor | Notes without cash | Variable expertise, incentive and matching quality |
| General-purpose LLM | Free tiers; ChatGPT Plus and Claude Pro each publish $20/month | Self-prompted conversational AI | Near-zero marginal cost and unlimited reframing within plan limits | No screenplay-specific validity, accountability, or industry distribution |
| Low-price AI coverage | $19/report | Automated report by email | Submission-style breadth in minutes | Report/score is easy to copy; validation and redress are thin |
| Mid-price AI coverage | $49–$79/report | Automated multi-pass report plus chat/revision add-ons | Structured workflow and continuity | Method labels do not establish feedback validity |
| Subscription AI coverage | $75–$345/month; $209/three scripts pay-as-you-go | Automated report, follow-up, ancillary tools, distribution/contest funnel | Recurring revision plus opportunity network | Score and opportunity incentives can become entangled |
| Predictive analytics | €149–€799/script | Proprietary ML/NLP report with manual account/delivery steps | Commercial/audience prediction rather than notes alone | High-stakes claims require substantially stronger public validation |
| Named professional human | Feature coverage from $185; deeper tier from $449 | Selected genre specialist, written by a human | Context, taste, accountability, and tailored interpretation | Cost, turnaround, and inter-reader variance |

The general-purpose prices are current official examples, not a complete LLM
price survey: [ChatGPT Plus publishes $20/month](https://help.openai.com/en/articles/6950777-what)
and [Claude Pro publishes $20/month](https://support.anthropic.com/en/articles/8325610-how-much-does-claude-pro-cost).

## Master comparison

| Alternative | Price / turnaround | Human involvement | Confidentiality and data-use observables | Trust and redress mechanisms | Distribution / operating model | Evidence verdict |
|---|---|---|---|---|---|---|
| **P01 CoverflyX** | Free token exchange; reader has five days; at least 300 words each on strengths and weaknesses **(FPO)** | Entire note is written by a peer **(FPO)** | Coverfly stores project files while the account exists; account deletion initiates deletion within 60 days; disclosed subprocessors and reader devices may process scripts **(FPO)** | Writer rates reader; rating affects matching; late readers receive strikes and can be suspended **(FPO)** | Two-sided reputation marketplace; labor is the currency **(INF)** | Strong mechanism transparency; no independent note-quality, reliability, safety, or revision-outcome evidence **(UNK)** |
| **P02 Script Reader Pro** | Feature Classic from $185, Deluxe from $449; standard 14 days, 3/7-day rush **(FPO)** | Named/selected genre-focused working screenwriter; 4+ or 12+ pages; Deluxe includes three questions **(FPO)** | Privacy page lists screenplay drafts as collected data and offers deletion rights, but gives no script-retention period or subprocessor list **(FPO/UNK)** | Reader identity, bio, genre choice, explicit no-guarantee language, and follow-up at upper tier **(FPO)** | High-touch professional service; mentorship/rewrites extend lifetime value **(INF)** | Credible accountability mechanism; effectiveness and "400+ reviews" remain vendor claims without blinded outcome evidence **(FPC)** |
| **P03 Callaia** | From $65/script; under one minute **(FPO/FPC speed)** | Coverage is automated; top three contest finalists receive an industry-expert panel read **(FPO)** | Uses Cinelytic systems and OpenAI Enterprise API; script handled in memory and deleted after processing; OpenAI may retain up to 30 days; report storage is user-selectable **(FPO)** | Public terms name processor and retention; no-training claim; downloadable samples; contest terms disclaim utility/value/accuracy and do not revise feedback **(FPO)** | Writer product connects to Cinelytic analytics and the separate RightsTrade ecosystem; annual contest adds discovery **(FPO)** | Strong disclosure relative to peers; "objective," "industry leading," and security/quality superlatives lack an independent screenplay benchmark **(FPC)** |
| **P04 ScriptBook** | €149 / €399 / €799 per script; report in 24 hours; claimed compute about 10 minutes **(FPO/FPC compute)** | Team contacts buyer to set up account/collect screenplay; page says delivery window includes quality checking **(FPO)** | Privacy policy says no customer-script training; screenplay deletion within 90 days; reports retained through relationship and a reasonable later period; subprocessors listed by category/on request **(FPO)** | Patents, detailed output tiers, samples, privacy terms, and a vendor proof-of-concept **(FPO)** | B2C reports, enterprise/API/OEM, historical-database licensing, content marketplace **(FPO)** | Best-articulated proprietary/data moat, but 80%/87% claims are not independently replicated and the public study is not audit-ready **(FPC)** |
| **P05 ScriptCoverage.ai** | Standard $49 (Claude Sonnet), Premium $79 (Claude Opus); under one hour; $15 revision review; $5 extra chat **(FPO)** | Founder occasionally samples outputs/Q&A for QC; user can opt out; support-triggered review also disclosed **(FPO)** | Names Vercel, Supabase, Anthropic and data path; TLS/AES-256 claims; Anthropic default retention stated as seven days; account export/delete; scripts, outputs, and chat persist in account **(FPO/FPC controls)** | Seven named passes, page annotations, interactive challenge, export, deletion, responsible disclosure, narrow human-review disclosure **(FPO)** | Per-script + credits + add-ons + enterprise volume; revision continuity raises switching cost **(INF)** | Strongest public operational transparency in this direct set; no independent proof that seven passes, model tier, or founder methodology improves real revisions **(UNK)** |
| **P06 GetScriptCoverage** | $19; three-to-seven-minute PDF by email; no account **(FPO/FPC speed)** | Automated; explicitly says it does not replace a veteran reader for a major submission **(FPO)** | Homepage says script is not stored, shared, or used after report generation; linked privacy page was not retrievable in this review **(FPO/UNK)** | Sample PDF, bounded use-case language, low price, no account **(FPO)** | One-shot transaction and email delivery; no visible continuity/network moat **(INF)** | Honest role boundary is useful; "same criteria" and professional-equivalence implications lack public validation **(FPC)** |
| **Greenlight Coverage** | $75/mo for two scripts; $129/mo for five; $345/mo for 15; annual discounts; $209/three scripts; 15–60 minutes depending page/tier **(FPO)** | Automated coverage; professional judges read top 1% and select contest finalists/winner **(FPO)** | Landing page says no training/sharing/storage beyond session; generic website privacy notice permits broad analytics/marketing and does not specify screenplay processing or retention **(FPO; scope tension)** | Free first snapshot, first-month refund, samples, follow-up questions, repeated-draft scores **(FPO)** | Subscription ranks unlock producer opportunities and a $100k-equity/distribution contest; affiliate program; coverage becomes credential and funnel **(FPO)** | Strongest distribution/retention loop; efficacy, 36,000+ users, review percentage, "objective" credential, and outcome attribution are not independently established **(FPC)** |
| **Professional human coverage category** | Reviewed examples begin around $159–$185 and extend above $449; days/weeks **(FPO examples)** | Full read/interpretation by an analyst; identity varies by provider **(FPO)** | Policies vary; human access is intrinsic, retention/subprocessor specificity often weak **(FPO)** | Reader identity or qualification, genre matching, editorial dialogue, correction/refund processes **(FPO)** | Services, rosters, repeat clients, mentorship, and sometimes platform visibility **(INF)** | Human judgment is not automatically reliable; the category preserves situated interpretation and accountability but still needs multi-reader evidence **(INF)** |
| **The Black List platform** | Current price not asserted here because a first-party price page was not retrievable during the audit **(UNK)** | Human readers; official policy forbids AI/LLM use and says violators are terminated **(FPO)** | A hosted project is intentionally distributed subject to writer visibility choices; full current retention terms were not assessed here **(FPO/UNK)** | Minimum reader experience, <20% hiring claim, monitoring, support challenge for factual inaccuracies **(FPO/FPC selection rate)** | Hosting + paid evaluations + scores/top lists + visibility to a claimed 7,000+ industry professionals **(FPO/FPC network size)** | A distribution/credential network, not merely notes; reader agreement and writer outcomes remain material unknowns |
| **General-purpose LLM use** | Free tiers; representative premium plans $20/month; seconds/minutes **(FPO/FPC latency)** | None by default; user supplies the critical framing and verification **(INF)** | Consumer settings vary: ChatGPT may train unless opt-out; Temporary Chat is excluded from training and retained up to 30 days; Claude training is user-controlled and Incognito excluded; Gemini warns some data may be human-reviewed/used to improve services **(FPO)** | Conversational challenge and easy reprompting, but no screenplay-specific evidence chain, stable rubric, reader identity, or dispute owner **(FPO/INF)** | Massive horizontal distribution; no screenplay-industry access **(INF)** | The price floor and substitute for generic notes; not evidence that its screenplay judgments are valid |

## Competitor dossiers

### P01 — CoverflyX: reciprocal human labor and reputation

The [CoverflyX page](https://coverfly.com/x/) publishes a notably concrete
exchange contract: users earn tokens by reading; scripts compete for readers by
token bids; readers have five days; notes include at least 300 words on strengths
and 300 on weaknesses; writer ratings influence future matching; and lateness
produces strikes. These are observable trust mechanisms, not claims about an
opaque engine.

Its [data-use policy](https://coverfly.com/data-use-and-protection-policy/)
states that project files, scripts, evaluations, and scores are stored and
processed; lists major processor categories and services; notes that readers may
use third-party software/devices; retains account data while the account exists;
and initiates deletion within 60 days after account deletion. Its
[terms](https://coverfly.com/terms-of-service/) preserve writer ownership but
authorize transmission to requested/authorized readers and contain broad rights
to analyze data/content for research, feature testing, and new features.

**Competitive meaning:** free does not mean no cost; the writer pays with labor,
wait time, and exposure to reader variance. The durable mechanism is the
reputation/matching market, not the 600-word note format. STORYMACHINE can copy
the clarity of the service contract and reciprocal accountability, but cannot
claim to replace perspective diversity with one deterministic result.

### P02 — Script Reader Pro: named specialist as the premium product

The current [coverage page](https://www.scriptreaderpro.com/our-script-coverage-services/)
publishes feature Classic from $185 (4+ pages) and Deluxe from $449 (12+ pages,
synopsis, and three follow-up questions), standard 14-day delivery and 3/7-day
rush options. The writer chooses a genre specialist whose name and experience
are visible. The operator states every report is written by a produced/working
screenwriter and explicitly declines to guarantee representation, sale, contest
success, or a break-in.

The [privacy page](https://www.scriptreaderpro.com/privacy-policy/) identifies
screenplay drafts, project goals, and consultant communications as collected
data and offers access/correction/deletion rights. It does not publish a script
retention schedule, processor/subprocessor list, geography, or detailed human
access lifecycle. "Industry-standard security" is a claim, not a control
description.

The page's "400+ customer reviews" and testimonials are vendor-selected. They
support neither causal revision improvement nor reliability. The real premium
mechanisms are situated judgment, reader identity, genre choice, substantive
report depth, and follow-up. Those are exactly the parts the service deliberately
keeps human.

### P03 — Callaia: automated coverage inside a broader entertainment-data stack

Callaia publishes coverage [from $65 in under a minute](https://www.callaia.ai/),
including scores, craft notes, synopsis, characters, comps, casting, keywords,
rating, and release strategy. Its [terms](https://www.callaia.ai/terms) identify
Cinelytic as operator, OpenAI Enterprise API as processor, in-memory script
handling, immediate deletion from Cinelytic after processing, optional report
storage, a temporary processing license, and possible OpenAI retention up to 30
days. Its [privacy policy](https://www.callaia.ai/privacy) adds U.S. processing,
TLS 1.2+, encryption-at-rest, named data-controller/contact information, and
rights procedures. These are published assertions; this audit did not conduct a
security assessment of the service.

Callaia also shows where automation stops. Its
[2026 competition](https://callaia.ai/screenwriting-competition) uses the AI
grade for all entries, but the top three receive a panel read and the panel
selects the winner. The terms call the grade objective and final while separately
disclaim warranties of utility, value, or accuracy. That tension matters: a
product can use strong certainty language in marketing while its legal boundary
acknowledges epistemic limits.

Callaia's operator also connects to Cinelytic and RightsTrade, but the
[RightsTrade marketplace](https://rightstrade.com/) is a separate rights-sales
business. It is not evidence that buying a Callaia report distributes a writer's
screenplay. The stack is nevertheless strategically stronger than a standalone
report because it spans development, commercial intelligence, and rights sales.

### P04 — ScriptBook: proprietary prediction, data, patents, and manual delivery

ScriptBook's [current pricing](https://www.scriptbook.io/pricing) is €149 for a
3-page Basic report, €399 for Standard, and €799 for Premium, all pay-per-script
and delivered within 24 hours. The page says the model processes a screenplay in
about ten minutes while the remaining window covers quality checking. It also
says a team receives the order, contacts the buyer within 24 hours to create an
account and collect the screenplay, and offers API, OEM, historical-database
licensing, and content inquiries. Thus even the most prediction-centric vendor
retains manual account and delivery/quality steps.

The [privacy policy](https://www.scriptbook.io/privacy-policy) was updated June
11, 2026. It says submitted screenplays are not used to train its models and are
deleted within 90 days unless instructed otherwise; reports persist through the
relationship and for a reasonable period thereafter; service-provider categories
are disclosed and specific names are available on request.

The [proof-of-concept page](https://www.scriptbook.io/proof-of-concept) claims
80% greenlight accuracy versus a 36% industry baseline on 50 films released in
2019, using screenplay-only input, alongside an 87% financial-accuracy claim over
100,000+ scripts. This is materially more test-shaped than a testimonial, but it
is still first-party. The page does not disclose film identifiers, sampling,
profit labels, decision threshold, confusion matrix, prospective registration,
confidence intervals, leakage controls, calibration, or independent replication.
It labels a customer testimonial "Independent verification," which is not an
independent validation study. [Patent disclosures](https://www.scriptbook.io/patents)
can establish the existence/scope/status of intellectual property after patent-
office verification; a patent does not validate predictive accuracy.

**Competitive meaning:** this is the strongest reviewed example of defensibility
through data/IP/enterprise channels, but also the clearest warning against
publishing a high-stakes accuracy number without an audit-ready benchmark.

### P05 — ScriptCoverage.ai: transparency and revision continuity

The [pricing page](https://scriptcoverage.ai/pricing) publishes Standard at $49
using Claude Sonnet and Premium at $79 using Claude Opus, both with seven passes,
page annotations, evaluation scores, interactive Q&A, a revision roadmap, and PDF
download. It sells continued chat for $5, revision comparison for $15, credit
packs, and enterprise volume. The stated turnaround is under one hour.

Its [security page](https://scriptcoverage.ai/security) is the most operationally
specific direct-competitor disclosure reviewed. It names the browser → Vercel →
Supabase → Anthropic path, encryption claims, row-level security, account-scoped
storage, export/delete controls, default Anthropic retention, metadata logging,
and a responsible-disclosure channel. It also discloses that the founder
occasionally reads a small sample of stored coverage/Q&A for quality control,
with email opt-out. The [privacy policy](https://scriptcoverage.ai/privacy)
describes the same limited review, provider categories, account deletion,
possible backup persistence, no-training terms, and an express disclaimer that
AI outputs are informational and not guaranteed accurate or suitable.

This does not prove efficacy. It does show that privacy architecture, a frank
human-review exception, interactive challenge, export, deletion, and revision
comparison can be made part of the product—not hidden in a generic policy.

### P06 — GetScriptCoverage: the visible $19 price boundary

The [current product page](https://www.getscriptcoverage.com/) sells one $19
report, no account required, delivered as a PDF by email in a stated three to
seven minutes. It includes Pass/Consider/Recommend, eight scores, synopsis,
characters, structural/pacing/dialogue notes, market/comps, pitch material,
contest readiness, deadlines, and rewrite priorities. That breadth at $19 makes
clear that report length and category count alone are weak publicly observable
differentiation. It does not establish price elasticity or rule out premium
pricing for a different service contract.

The FAQ says scripts are not retained after report generation, shared, or used
for another purpose. The linked privacy page failed to return content in this
review, so processor identity, transient retention, backups, legal holds,
geography, and deletion verification remain unknown. Its best claim-discipline
choice is explicit: the tool is suitable for early structural/contest checks and
does not replace a veteran reader for a major submission.

### Greenlight Coverage: subscription, gamification, and distribution

The [pricing page](https://glcoverage.com/pricing/) publishes $75/month for two
screenplays, $129 for five, and $345 for 15, with annual discounts; three reports
cost $209 without a subscription. Plans bundle follow-up, proofreading, budget,
forecast, audience, polish, tokens, rank, competition, and producer access.
Unused uploads roll over. This is not simply coverage—it is a retention system.

The [landing page](https://glcoverage.com/landing-page/) claims 36,000+ writers,
15-minute turnaround, 91% five-star reviews, no training/sharing/storage beyond
the session, and several production outcomes. These are first-party claims. The
linked [privacy notice](https://glcoverage.com/privacy-policy/) is a generic
website notice that allows broad analytics, research, personalization,
advertising, affiliates, and business transfers but does not define screenplay
content, model/provider flow, screenplay retention, or the relationship between
session deletion and repeated-draft/competition features. The narrow script
promise and broad notice may apply to different data categories, but the scope is
not clear enough to verify that from public text.

Distribution is the material public differentiation mechanism. [Greenlight Opportunities](https://glcoverage.com/greenlight-opportunities/)
attaches the latest coverage report to submissions for producer/distributor/
sales-agent needs. [The Greenlight List](https://glcoverage.com/the-greenlight-list/)
offers $100,000 in equity financing and distribution; professional judges read
the top 1%, select finalists, and choose the winner. Rank is consecutive paid
subscription time. The landing page says each submitted script automatically
becomes eligible, whereas the contest page says the writer submits through an
opportunity posting. That first-party workflow discrepancy should be clarified
before treating entry as automatic.

This model binds automated score, subscription tenure, opportunity access, and a
human-judged prize. It is commercially powerful and creates possible incentive
conflicts: the score becomes both feedback and a gateway credential. STORYMACHINE
should not copy that coupling until its scoring validity and governance are much
stronger.

### Professional human coverage and the Black List

Human coverage is not a gold standard by default. Readers disagree, fatigue,
genre mismatch, incentives, and limited attention all matter. What premium
human services deliberately preserve is the part automation cannot establish by
self-assertion: a situated reader, identifiable experience, taste, an account of
why a moment did or did not work, and someone who can answer a challenge.

The Black List illustrates a second business model: feedback as a credential
inside a network. Its current official help pages say readers have at least a
year of relevant full-time industry-assistant experience, fewer than 20% of
minimum-qualified applicants are hired, work is monitored, and AI/LLM use is
forbidden ([reader qualifications](https://help.blcklst.com/kb/guide/en/writers-pROPvK6l0J/Steps/2736281),
[AI policy](https://help.blcklst.com/kb/guide/en/general-questions-JqbGiH4PRd/Steps/2853500)).
The platform says scores inform top lists/showcases and exposes projects to
7,000+ industry professionals
([project overview](https://help.blcklst.com/kb/guide/en/projects-iODiYQorLo/Steps/2849191)).
The exact current consumer price is omitted here because this audit could not
retrieve a first-party price page; third-party 2026 price articles were not used
to promote an unstable number to fact.

### General-purpose LLMs: the substitute in every buyer's browser

Writers can upload or paste a script into a general tool and request summaries,
scores, notes, rewrites, role-play, or repeated critique. ChatGPT Plus and Claude
Pro each publish $20/month in the U.S.; free tiers exist. A specialist product
therefore has to prove value beyond a prompt and report template.

Data handling is easy for a writer to misread because consumer, business, API,
temporary/incognito, feedback, connector, and safety rules differ:

- OpenAI says individual-product content may be used for training unless the
  user opts out; business/API data is excluded by default. Temporary Chat is not
  used for training and may be retained up to 30 days
  ([model-improvement policy](https://help.openai.com/en/articles/5722486-chatgpt-privacy-policies),
  [Temporary Chat](https://help.openai.com/en/articles/8914046-temporary-chat-faq)).
- Anthropic says consumer training is user-controlled; Incognito chats are not
  used for improvement; deleted chats leave backend storage within 30 days in
  ordinary conditions; opted-in training data can persist up to five years
  ([training control](https://privacy.claude.com/en/articles/12109829-how-do-i-change-my-model-improvement-privacy-settings),
  [retention](https://privacy.claude.com/en/articles/10023548-how-long-do-you-store-my-data)).
- Google's consumer Gemini privacy hub warns that some data is reviewed by
  humans and may improve services; activity/temporary behavior depends on
  settings and product surface
  ([Gemini Apps Privacy Hub](https://support.google.com/gemini/answer/13594961)).

These are not reasons to claim that specialist services are safer. They are
reasons to make the specialist trust boundary simpler, explicit, inspectable,
and narrower than the horizontal substitute.

## Customer-review evidence screen

No customer-review source reviewed here is strong enough to estimate accuracy,
revision improvement, or retention.

- Greenlight's G2 page had one review and a vendor-managed profile. Its
  [Trustpilot page](https://www.trustpilot.com/review/glcoverage.com) showed ten
  reviews and a claimed profile. The small, self-selecting sample included both
  generic praise and a concrete one-star allegation that a grounded ship was
  misread as a spaceship. The latter is useful as a candidate failure mode, not
  proof of population error rate.
- Vendor pages for Callaia, ScriptBook, Greenlight, and Script Reader Pro select
  and present their own testimonials. Credentials can sometimes be checked, but
  the selection process, denominator, incentives, failed cases, and script
  ground truth are absent.
- Reddit discussions provide uncensored experience narratives and counterclaims
  (including similarity to generic LLM output, reader disagreement, and support
  failures), but authorship, purchase, script version, prompts, and outcomes are
  usually unverifiable. They were used only to broaden failure-mode search.
- An informal 2025 comparison reported by *Variety* found professional readers
  judged AI coverage stronger at loglines/summaries and weaker or overly
  positive at nuanced critique. The public article did not provide a reusable
  benchmark dataset/protocol, so it is contextual evidence, not a performance
  estimate ([article](https://variety.com/2025/film/news/hollywood-script-readers-replaced-by-ai-test-1236552756/)).

The defensible research response is to recruit writers and experienced readers,
pre-register a real-script protocol, blind conditions, measure agreement and
revision utility, and publish uncertainty—not to aggregate star ratings.

## Cross-market findings

### 1. Speed and report breadth are visibly common

The market spans under a minute, three to seven minutes, under an hour, and 24
hours. At $19, a vendor already bundles verdict, eight scores, synopsis,
characters, structure, market, pitch, contests, deadlines, and rewrite priorities.
At $49–$79, another bundles seven passes, page annotations, chat, and revision
comparison. Adding another category, rule, pass, report page, or model call is
therefore weak publicly observable differentiation in this reviewed set. The
available evidence cannot determine STORYMACHINE's pricing power.

### 2. "Methodology" is positioning until it discriminates

Competitors invoke industry standards, thousands of parameters, seven passes,
named coaching frameworks, consistent calibration, and model tiers. These facts
may describe implementation. They do not establish construct validity, reader
agreement, calibration, or revision improvement. STORYMACHINE's own rule count
would face the same objection.

### 3. Reviewed high-stakes workflows retain human judgment

The market itself rejects full automation at the boundary that matters:

- CoverflyX and professional coverage are human end to end.
- The Black List explicitly prohibits AI readers.
- Callaia routes finalists to an expert jury.
- Greenlight routes the top 1% and winner selection to professional judges.
- ScriptCoverage.ai uses limited founder QC and support review.
- ScriptBook retains account setup and quality/delivery steps.
- GetScriptCoverage says a veteran human remains appropriate for major
  submissions.

This convergence supports testing an escalation architecture: machine
observables and low-stakes reflection first; independently designed human
judgments for P1 reference evidence, appeals, and consequential credentialing or
submission decisions. It does not prove that every low-stakes diagnostic needs
human escalation or that a multi-reader service is commercially feasible.

### 4. Distribution and continuity are stronger public differentiation mechanisms than analysis features

Coverfly has a peer/reputation market. The Black List has industry visibility and
programs. Greenlight has producer requests, ranks, a competition, and
distribution financing. Callaia sits in an entertainment intelligence/rights
ecosystem. ScriptBook offers data licensing/API/OEM. ScriptCoverage.ai retains
the script, Q&A, export, revision review, and enterprise volume. A standalone
analysis PDF has almost no switching cost.

### 5. Privacy specificity has become product surface

"Secure and private" is now table stakes. The strongest disclosure names the
data path, subprocessors, training posture, provider retention, content storage,
human-review exceptions, export/deletion, and backup limits. Several competitors
publish only a homepage promise or generic website policy. STORYMACHINE can
outperform on clarity before it outperforms on scale—but only if implementation,
deployment, and policy actually match.

### 6. Score and opportunity should not share an undisclosed incentive loop

When a score affects visibility, contest eligibility, producer access, or repeat
purchase, the scoring operator's commercial incentives become part of score
governance. A trustworthy system needs purpose separation, disclosed thresholds,
appeals, drift monitoring, and evidence that repeated tuning does not simply
reward conformity to the engine.

## Strategic implications for STORYMACHINE

### What to copy

Copy mechanisms, not claims:

1. **From CoverflyX:** an explicit feedback contract, time boundary, reputation,
   and consequence for non-performance.
2. **From named-human services:** visible perspective/credentials, genre/context
   fit, the right to challenge, and no promises of career outcomes.
3. **From Callaia and ScriptCoverage.ai:** a plain data-flow page naming every
   processor, retention window, human-review exception, training posture,
   deletion path, and report-storage choice.
4. **From GetScriptCoverage:** bounded language about appropriate early-stage use
   and explicit acknowledgment that high-stakes submission needs human judgment.
5. **From ScriptCoverage.ai:** follow-up that can challenge a note, exportable
   artifacts, and revision comparison.
6. **From ScriptBook:** public test-shaped evidence and enterprise interfaces—but
   publish enough data/method for independent audit and avoid accuracy slogans
   that outrun it.
7. **From Greenlight/Black List:** understand that distribution is a separate
   product and moat; do not imply access until an actual network exists.

### What to underprice—and what not to

- Keep the deterministic Doctor entry free or extremely low-cost while P0/P1
  evidence is incomplete. It is the acquisition and trust surface.
- Do **not** race below $19 on an undifferentiated report. That risks anchoring the product
  as disposable low-value output and leaves no margin for support, privacy
  operations, or evaluation.
- Do not assume rule count, pass count, report length, instant speed, or
  Pass/Consider/Recommend justify a premium. They are visibly common; actual
  willingness to pay remains unmeasured.
- A future paid tier can justifiably price continuity: private projects,
  longitudinal draft receipts, collaborative review, calibrated multi-reader
  comparison, exportable audit reports, and optional named-human escalation.
- Human review should be priced separately and transparently because its cost and
  epistemic role differ from compute.

### What to discredit with evidence

STORYMACHINE should not attack named competitors or claim that "AI coverage is
bad." It should make weak category conventions obsolete:

- Replace "objective" with disclosed observation, interpretation, confidence,
  and disagreement.
- Replace unqualified accuracy with a named target, sample, split, denominator,
  baseline, threshold, calibration, uncertainty, and replication package.
- Replace a single authoritative verdict with multiple-reader distributions and
  writer-intent context.
- Replace "industry standard" with the exact rubric, provenance, version, and
  evidence that it predicts the intended outcome.
- Replace testimonial proof with blinded real-script evaluation and revision
  evidence.
- Replace generic "secure" copy with a verifiable data lifecycle.
- Publish known failure cases and a challenge/correction process.

This is defensible discrediting: the product demonstrates a higher evidence
standard without alleging undisclosed facts about competitors.

### Defensibility stack

| Layer | Defensibility | Why it survives copying |
|---|---|---|
| Rule catalog / prompt / report template | Low | Observable outputs and common craft frameworks are easy to imitate |
| Deterministic receipts and version identity | Medium | Requires disciplined architecture, testability, and artifact contracts |
| Consented, licensed real-draft benchmark with ≥3 experienced blind readers | High | Expensive relationships, rights, adjudication, and longitudinal curation |
| Multi-reader uncertainty/calibration and published held-out performance | High | Competitors must reproduce both data and evaluation discipline |
| Longitudinal writer-intent + draft-diff + accepted/rejected-note outcomes | Very high | Product-specific learning loop compounds with real use |
| Confidentiality architecture and independently verified deletion/security | High | Operational capability and trust history cannot be cloned by copy |
| Named-human escalation network with specialty matching | High | Two-sided trust, quality control, and supply relationships |
| Credible industry distribution | Very high | Network access and successful relationships are not feature work |

The first four layers are compatible with the current demand-first roadmap. The
last two should not be promised before demand, governance, and operating capacity
exist.

## Required benchmark response

Before STORYMACHINE markets a score, percentile, verdict, or comparative quality
claim as authoritative, it should be able to answer all of the following with a
public artifact:

1. What exact construct and use decision does the number represent?
2. Which legally usable real drafts were sampled, with what genre, stage, and
   quality distribution?
3. Were labels blind, independent, and supplied by at least three experienced
   readers?
4. What is reader agreement and disagreement by dimension?
5. What split was pre-registered and held out?
6. What simple baselines were beaten, including scene/page/length scarcity?
7. What are confidence intervals, calibration, subgroup errors, and failure
   cases?
8. Does the tool distinguish shuffled, degraded, and structurally broken real
   drafts without merely measuring length or signal density?
9. Do writers find the cited observations correct and the next action useful?
10. Does revision improve blind human judgment, and which recommendations were
    accepted or rejected?
11. Can a third party rerun the evaluation from versioned artifacts?
12. Are privacy, permission, and provider-use terms compatible with benchmark
    publication and model/provider processing?

Absent those answers, the safest competitive contract is "diagnostic evidence
and perspectives," not "coverage verdict."

## Unknowns and refresh triggers

The following are deliberately unresolved rather than guessed:

- Actual paid conversion, churn, repeat use, refund rate, marginal inference
  cost, reader compensation, and unit economics for every private vendor.
- Proprietary model prompts, fine-tuning, retrieval, post-processing, and fraud/
  leakage controls except where publicly disclosed.
- Independent screenplay-feedback accuracy, calibration, and revision outcomes
  for every reviewed AI vendor.
- The provenance, licensing, split discipline, and customer/historical boundary
  of proprietary script corpora except explicit policy statements.
- End-to-end deletion and backup behavior where policies use "immediate,"
  "reasonable," "session," or "upon request" without an auditable SLA.
- The exact current Black List writer price because its first-party price surface
  was not retrievable during this run.
- Whether Greenlight's session-storage claim, generic privacy notice, competition
  submission, repeated-draft history, and auto-eligibility language describe one
  coherent current data lifecycle.
- Whether any vendor's named customers, user counts, or production outcomes were
  caused by the service rather than selection, prior quality, or other channels.

Refresh this benchmark before pricing, fundraising materials, public comparative
claims, a launch outside private beta, or any partnership with a coverage,
contest, representation, producer, or distribution network.

## Evidence limitations and AI disclosure

This is a structured public-information benchmark, not mystery shopping,
penetration testing, customer interviewing, financial diligence, or legal review.
Dynamic pages can change after retrieval. Security/privacy statements were read,
not technically certified. Omitted information is marked unknown. The competitor
set is decision-focused, not exhaustive.

AI-assisted research tools were used to search, retrieve, compare, and draft this
benchmark. Material claims were checked against the linked first-party or
independent source before inclusion. No proprietary screenplay, customer data,
or vendor account was used.
