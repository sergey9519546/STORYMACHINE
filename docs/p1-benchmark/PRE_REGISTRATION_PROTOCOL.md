# P1 Benchmark Pre-Registration Protocol

**Version:** 1.0  
**Date:** 2026-07-15  
**Status:** Template (Fill before corpus work begins)

---

## Purpose

This protocol documents the complete benchmark methodology BEFORE any corpus work, model tuning, or evaluation begins. Pre-registration prevents p-hacking, overfitting, and post-hoc rationalization.

**Key Principle:** Write down what you'll do, then do exactly that. No changes allowed after corpus work starts unless documented with strong justification.

---

## Section 1: Research Question

### Primary Question

**Does STORYMACHINE's doctor score discriminate between strong and weak real screenplay writing?**

### Success Criteria (P1 Gate)

**Primary metric:** AUC (Area Under ROC Curve) on held-out test set
- **Minimum threshold:** AUC >= 0.70
- **Confidence:** Bootstrap 95% CI lower bound > 0.65
- **Baseline comparison:** Significantly better than random (AUC = 0.50)

**Secondary metrics:**
- Accuracy at optimal threshold
- Calibration (Brier score < 0.20)
- Per-quality-tier discrimination

### Hypotheses

**H1 (Primary):** The doctor score can discriminate between strong (A-tier) and weak (C/D-tier) screenplays with AUC >= 0.70

**H2 (Scene-count):** Scene-count scarcity channel contributes most discrimination (as suggested by current AUC ~0.938 internal measurement)

**H3 (Anti-slop):** Newly integrated anti-slop patterns add measurable discrimination over baseline

**H4 (Rules channel):** Current weighted-rule channel (8,917 rules) contributes <0.10 AUC (as measured internally at ~0.076)

---

## Section 2: Data Collection

### Corpus Target

**Size:** 100-200 screenplays minimum
- **Training set:** 60% (60-120 scripts)
- **Validation set:** 20% (20-40 scripts)
- **Test set:** 20% (20-40 scripts)

### Inclusion Criteria

Scripts must meet ALL of the following:
1. **Legal:** CC-BY, CC0, or Public Domain (pre-1928)
2. **Complete:** Full-length screenplay (60+ pages)
3. **Format:** Fountain or standard screenplay format
4. **Language:** English only
5. **Readable:** Parseable by STORYMACHINE doctor

### Exclusion Criteria

Exclude scripts with ANY of:
1. Copyright restrictions preventing distribution
2. Incomplete (partial drafts, fragments)
3. Non-screenplay formats (novels, stage plays)
4. Non-English or machine-translated
5. Parsing errors (corrupted, malformed)

### Quality Distribution Target

**Aim for natural distribution:**
- A-tier (Strong): 20-30%
- B-tier (Good): 30-40%
- C-tier (Weak): 25-35%
- D-tier (Poor): 5-15%

**Rationale:** Mirrors real-world submission quality. Most scripts are "good enough" with fewer extremes.

### Sources

**Approved sources** (legal to distribute):
- IMSDB (check individual licensing)
- SimplyScripts (public submissions)
- Project Gutenberg (pre-1928 screenplays)
- Internet Archive (public domain films)
- CC-licensed screenplay repositories

**Document provenance:** Track source URL and license for each script.

---

## Section 3: Labeling Protocol

### Labeling Team

**Requirements:**
- **Minimum 3 raters:** Independent, experienced screenplay readers
- **Experience:** Professional reader, script coverage, or 10+ years writing
- **Blind labeling:** No communication between raters during labeling
- **No STORYMACHINE knowledge:** Raters must NOT know what features the tool measures

### Labeling Scale

**4-point scale:**
- **A (Strong):** Professional quality, ready for production consideration
- **B (Good):** Solid craft, needs minor revision
- **C (Weak):** Structural issues, needs major revision
- **D (Poor):** Fundamental problems, not ready

**Rubric for raters:**

| Tier | Structure | Character | Dialogue | Pacing | Overall |
|------|-----------|-----------|----------|--------|---------|
| A | Clear 3-act, strong turning points | Distinct voices, clear arcs | Natural, character-specific | Engaging throughout | Professional |
| B | Solid structure, minor gaps | Functional arcs, some blending | Mostly natural, occasional stiffness | Generally good, minor lulls | Solid |
| C | Structure problems, unclear beats | Weak arcs, similar voices | Often expository, on-the-nose | Uneven, drag or rush | Major issues |
| D | No clear structure | No arcs, interchangeable | Unnatural, info dumps | Constantly drags or rushes | Fundamental problems |

### Labeling Procedure

**Step-by-step:**
1. Randomize screenplay order (prevent order effects)
2. Rater reads full screenplay
3. Rater assigns A/B/C/D label
4. Rater provides 1-2 sentence justification
5. Repeat for all N screenplays
6. Collect all labels before any aggregation

### Inter-Rater Agreement

**Target:** Fleiss' kappa >= 0.60 (substantial agreement)

**If kappa < 0.60:**
- Review labeling instructions with raters
- Discuss borderline cases
- Relabel subset (20%) with revised guidelines
- Recompute kappa

### Conflict Resolution

**When raters disagree:**

**Minor disagreement (A/B or B/C or C/D):**
- Use majority vote
- Example: A, B, B → Label as B

**Major disagreement (A/D or A/C/D split):**
- Flag for consensus discussion
- Raters discuss (still blind to others' initial labels)
- Reach consensus or exclude from corpus

---

## Section 4: Data Split

### Stratification Strategy

**Primary stratification:** Quality tier (A/B/C/D)
- Within each tier, assign 60% to train, 20% to val, 20% to test

**Secondary stratification (if corpus allows):**
- Genre (drama, comedy, thriller, etc.)
- Length (short <90, medium 90-120, long >120 pages)

### Random Seed

**Fixed seed:** `CORPUS_SPLIT_SEED = 42`
- Enables reproducibility
- Anyone can regenerate exact splits
- Document in manifest

### Held-Out Test Set Protection

**Procedure:**
1. Generate train/val/test splits
2. Compute SHA-256 hash of test set manifest
3. **Publish hash publicly** (in this document, ADR-002, README)
4. Store test set in access-controlled location
5. **Never look at test labels** during development

**Test set hash:** `[TO BE FILLED AFTER SPLIT]`

**Access control:**
- Test set only accessible to [DESIGNATE 1-2 PEOPLE]
- Encrypted storage or restricted repo branch
- Audit log of any access

---

## Section 5: Model/System Under Evaluation

### STORYMACHINE Doctor (Frozen Version)

**Commit hash:** `[TO BE FILLED AT FREEZE]`

**Features/Channels:**
1. **Scene-count scarcity:** Scene count percentile (AUC ~0.938 internally)
2. **Weighted rules:** 8,917 rules across 14 passes (AUC ~0.076 internally)
3. **Anti-slop detection:** 220 patterns across 18 categories (UNVALIDATED)
4. **Calibration corpus:** 20-sample reference corpus for percentile ranking

**Scoring formula:** (document exact weights from doctor.ts)

**No changes allowed after freeze.** If bug found, document and decide: fix + re-freeze OR proceed with caveat.

---

## Section 6: Evaluation Metrics

### Primary Metric: AUC

**Definition:** Area under ROC curve (discrimination between quality tiers)

**Calculation:**
- Binary classification: A/B vs C/D
- Or: pairwise AUC across all quality levels
- Use scikit-learn `roc_auc_score` or equivalent

**Confidence interval:**
- Bootstrap resampling (10,000 iterations)
- 95% percentile CI
- Report [lower_bound, upper_bound]

### Secondary Metrics

**Accuracy:**
- Optimal threshold chosen on validation set
- Apply to test set
- Report precision, recall, F1

**Calibration:**
- Brier score: Mean squared error of probability predictions
- Target: <0.20
- Calibration plot: predicted prob vs observed freq

**Per-tier discrimination:**
- AUC for A vs B, A vs C, A vs D, B vs C, B vs D, C vs D
- Identify which quality gaps the score detects best

**Channel contributions:**
- Ablation: measure AUC with each channel disabled
- Quantify scene-count vs rules vs anti-slop contribution

---

## Section 7: Statistical Tests

### Significance Testing

**AUC vs Random:**
- H0: AUC = 0.50 (no discrimination)
- H1: AUC > 0.50
- Use permutation test or DeLong's test
- Significance level: α = 0.05

**Confidence interval check:**
- Bootstrap 95% CI must NOT include 0.50
- Lower bound must be > 0.65 for P1 gate

### Multiple Comparisons

**If testing multiple variants:**
- Use Bonferroni correction
- Or: pre-specify single primary analysis

**STORYMACHINE decision:** Single primary analysis (full doctor score), secondary ablations exploratory only.

---

## Section 8: Implementation Timeline

### Phase 1: Corpus Assembly (Week 1-2)
- [ ] Source 100-200 screenplays
- [ ] Verify licensing
- [ ] Standardize formats
- [ ] Anonymize

### Phase 2: Labeling (Week 3-4)
- [ ] Recruit 3+ raters
- [ ] Conduct blind labeling
- [ ] Calculate inter-rater agreement
- [ ] Resolve conflicts

### Phase 3: Split Generation (Week 4)
- [ ] Perform stratified split
- [ ] Generate manifest
- [ ] Compute test set hash
- [ ] Lock test set

### Phase 4: Development (Week 5-8)
- [ ] Run doctor on training set
- [ ] Tune on training, check on validation
- [ ] Iterate until satisfied
- [ ] **DO NOT TOUCH TEST SET**

### Phase 5: Code Freeze (Week 8)
- [ ] Document commit hash
- [ ] Finalize all code
- [ ] No more changes
- [ ] Prepare for final evaluation

### Phase 6: Test Evaluation (Week 9)
- [ ] Verify test set hash
- [ ] Run doctor on test set (ONCE)
- [ ] Compute all metrics
- [ ] Generate report

### Phase 7: Publication (Week 10)
- [ ] Write results document
- [ ] Publish methodology
- [ ] Share corpus (if legally possible)
- [ ] Make GO/NO-GO decision

---

## Section 9: Deviations & Amendments

### Allowed Deviations

**Only with documented justification:**
- Critical bug discovered (document severity)
- Corpus size falls short (document why, new target)
- Rater dropout (document replacement process)

### Amendment Log

| Date | Change | Justification | Approved By |
|------|--------|---------------|-------------|
| - | - | - | - |

**Rule:** Any deviation MUST be documented here with timestamp and rationale BEFORE making the change.

---

## Section 10: Failure Criteria

### P1 Gate Fails If:

**Primary failure:** AUC < 0.70 on test set
- Decision: Revisit feature channels, scoring model, or product direction

**Secondary failures:**
- Bootstrap CI lower bound < 0.65 (too uncertain)
- Calibration Brier score > 0.25 (poor calibration)
- Major overfitting (test AUC << validation AUC by >0.10)

### Post-Failure Actions

**If P1 fails:**
1. **Analyze failure modes:** Where does discrimination break down?
2. **Ablation studies:** Which channels work, which don't?
3. **Revisit ROADMAP:** Is the One Bet valid? Pivot needed?
4. **Consider alternatives:** Hybrid deterministic+LLM? Different features?

**Do NOT:**
- Tune on test set to "fix" the result
- Cherry-pick metrics that look better
- Claim success with post-hoc rationalizations

---

## Section 11: Success Criteria Recap

**P1 Gate PASSES if ALL of:**
- ✅ AUC >= 0.70 on held-out test set
- ✅ Bootstrap 95% CI lower bound > 0.65
- ✅ Brier score < 0.20
- ✅ Test AUC within 0.10 of validation AUC (no severe overfitting)
- ✅ This pre-registration followed exactly (or deviations documented)

**Result:** Proceed to P2 (UI surface collapse)

---

## Signatures & Commitment

**I commit to following this pre-registration protocol exactly as written.**

**Researcher:** [Name]  
**Date:** [YYYY-MM-DD]  
**Signature:** ___________________________

**Any deviations will be documented in Section 9 with full transparency.**

---

## Related Documents

- **SPLIT_STRATEGY.md:** Technical split implementation
- **ADR-002:** Design decisions rationale
- **ROADMAP.md P1:** High-level P1 requirements
- **Manifest (after split):** `corpus-manifest.json`

---

**Status:** Template ready. Fill in bracketed values before corpus work begins.
