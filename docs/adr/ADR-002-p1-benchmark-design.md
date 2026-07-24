# ADR-002: P1 Benchmark Design Decisions

**Date:** 2026-07-15

**Status:** Accepted

**Supersedes:** N/A

---

## Context

STORYMACHINE's P1 phase requires proving that the doctor score can discriminate between strong and weak real screenplay writing. This is "the One Bet" - the core validation that determines whether the product's value proposition is real.

**Problem:** Current evidence is insufficient:
- Internal calibration corpus (20 samples, synthetic quality ladder) proves concept but not generalization
- Rule-channel AUC measured at ~0.076 (doctor's own diagnostics)
- Scene-count scarcity channel measured at ~0.938 (but on controlled corpus)
- No validation on real, diverse screenplays from the wild
- No blind labeling by independent readers
- No held-out test set

**Requirements** (from ROADMAP.md P1):
- Legally distributable corpus (CC/PD only)
- Blind labels from >=3 experienced readers
- Pre-registered methodology (no p-hacking)
- Held-out test set (never touched until final evaluation)
- AUC >= 0.70 on test set (with 95% CI > 0.65)
- Reproducible by third parties

**Constraints:**
- Must align with STORYMACHINE's "correct before reproducible" principle
- Must be legally distributable (open-source project)
- Must complete within reasonable timeline (weeks, not months)
- Must support multiple quality tiers (not just binary good/bad)

---

## Decision

We will implement a **stratified 60/20/20 split** with **strict held-out test set protection** and **pre-registration** of all methodology before corpus work begins.

**Key choices:**
1. **Split strategy:** 60% train, 20% validation, 20% test (stratified by quality)
2. **Quality scale:** 4-point A/B/C/D (not continuous, not binary)
3. **Labeling:** >=3 blind independent raters with Fleiss' kappa >= 0.60
4. **Test protection:** SHA-256 hash published, access-controlled storage, one-time evaluation
5. **Pre-registration:** Complete protocol documented before any corpus work
6. **Minimum corpus:** 100-200 screenplays (target 150+)
7. **Success threshold:** AUC >= 0.70 (bootstrap 95% CI lower bound > 0.65)

---

## Alternatives Considered

### Option A: K-Fold Cross-Validation (Rejected)

**Description:** 5-fold or 10-fold cross-validation instead of fixed held-out test set.

**Pros:**
- Maximizes use of limited data
- Multiple evaluation rounds
- Standard ML practice

**Cons:**
- Touching all data multiple times increases overfitting risk
- Harder to maintain "never look at test" discipline
- More complex to explain and verify
- No true held-out guarantee

**Why not chosen:** STORYMACHINE values trust and verifiability. A single held-out test set that's never touched until final evaluation is clearer and more trustworthy than cross-validation where every script is eventually used for validation.

### Option B: Binary Quality Labels (Good/Bad) (Rejected)

**Description:** Simple binary classification instead of 4-tier A/B/C/D.

**Pros:**
- Simpler labeling (less rater disagreement)
- Clearer success criterion
- Standard classification task

**Cons:**
- Loses nuance (B-tier scripts forced into binary bucket)
- Can't measure where discrimination works/fails
- Doesn't match real-world writer question ("Is this A-tier or C-tier?")

**Why not chosen:** Real feedback has gradations. Writers want to know if their script is "almost there" (B-tier) vs "needs major work" (C-tier). Binary labels throw away information.

### Option C: Continuous Quality Scores (1-100) (Rejected)

**Description:** Rate scripts on continuous scale rather than discrete tiers.

**Pros:**
- Maximum information
- Can compute correlation, not just classification
- More sensitive discrimination measure

**Cons:**
- Raters struggle with 100-point scale (what's difference between 73 and 75?)
- Lower inter-rater agreement expected
- Harder to reach consensus
- Doesn't match how coverage works (letter grades)

**Why not chosen:** Induces false precision. Raters can reliably distinguish "strong vs good vs weak" but not "78 vs 82". We want high agreement, not arbitrary precision.

### Option D: Larger Corpus First (300-500 scripts) (Rejected for V1)

**Description:** Wait to collect 300-500 scripts before starting.

**Pros:**
- More statistical power
- Smaller splits still have adequate N
- Better genre/length coverage

**Cons:**
- Delays P1 validation by weeks/months
- Legally distributable scripts are scarce
- Labeling cost scales linearly
- Violates "demand before rigor" (get signal fast, expand if validated)

**Why not chosen:** STORYMACHINE principle is "correct before reproducible" and "demand before rigor." Get validation signal with minimum viable corpus (150), expand later if P1 passes.

### Option E: Use IMSDB/SimplyScripts (Copyright Risk) (Rejected)

**Description:** Use 1,000+ professional scripts from IMSDB without explicit licensing.

**Pros:**
- High-quality professional scripts
- Large corpus available immediately
- Modern screenplays (better match for users)

**Cons:**
- Copyright violation (scripts are not CC/PD)
- Can't legally distribute corpus
- Third parties can't reproduce
- Academic fair use argument weak (commercial product)
- Reputation risk

**Why not chosen:** Legal risk unacceptable for open-source project. Can't build trust story on copyright violations.

---

## Rationale

### Why 60/20/20 split?

**60% training:** Enough data to tune without starving validation/test
**20% validation:** Large enough to detect overfitting, small enough to preserve test set
**20% test:** Adequate for statistical power (30+ scripts minimum)

This is a standard ML split that balances data efficiency with held-out discipline.

### Why 4-point scale (A/B/C/D)?

**Matches real coverage practice:** Professional coverage uses letter grades
**Raters can agree:** Clear distinctions (professional, solid, weak, poor)
**Preserves nuance:** Can analyze where discrimination works (A vs B? A vs D?)
**Avoids false precision:** Unlike 100-point scale

### Why stratified split?

**Prevents distribution mismatch:** Training set might get all A-tier, test set all D-tier
**Ensures representativeness:** Each split mirrors overall quality distribution
**Required for fairness:** Can't claim discrimination if test set is biased

### Why >=3 raters?

**Inter-rater agreement:** Need multiple opinions to establish consensus
**Resolves conflicts:** Majority vote works with odd numbers
**Standard research practice:** Psychology, education research use 3+ raters

**Why not 2?** Can't resolve ties.
**Why not 5+?** Diminishing returns, labeling cost grows.

### Why Fleiss' kappa >= 0.60?

**0.60 = "substantial agreement"** in Landis & Koch scale
- <0.00: Poor
- 0.00-0.20: Slight
- 0.21-0.40: Fair
- 0.41-0.60: Moderate
- 0.61-0.80: Substantial
- 0.81-1.00: Almost perfect

**0.60 is minimum for research credibility.** Lower than this means raters are guessing.

### Why SHA-256 hash test set?

**Prevents data leakage:** Can't "accidentally" look at test labels
**Enables verification:** Third parties can verify we didn't change test set post-hoc
**Standard cryptographic practice:** Git uses SHA-256, widely understood

### Why pre-registration?

**Prevents p-hacking:** Can't tune methodology after seeing results
**Builds trust:** Shows we committed to plan before data
**Scientific standard:** Medical trials, psychology research require it
**Aligns with STORYMACHINE values:** Honest about what we don't know

### Why AUC >= 0.70?

**0.70 = acceptable discrimination** in ML/medical diagnostics
- 0.50: Random (coin flip)
- 0.60: Poor
- 0.70: Acceptable
- 0.80: Good
- 0.90: Excellent
- 1.00: Perfect

**Lower bound (0.65) ensures confidence:** Bootstrap CI must clear 0.65 to prove we're not lucky.

---

## Consequences

### Positive Consequences

1. **Trust story:** Pre-registration + held-out test builds credibility
2. **Reproducible:** Anyone can download corpus (if legal) and verify results
3. **Clear success criterion:** AUC >= 0.70 is unambiguous
4. **Prevents overfitting:** Held-out test never touched until final eval
5. **Standard methodology:** Uses established ML/research practices
6. **Scalable:** Can expand corpus later using same methodology

### Negative Consequences / Tradeoffs

1. **Small corpus:** 150 scripts is minimum viable, not ideal
   - **Mitigation:** Start small, expand if P1 passes
   
2. **Legal constraints:** Limited to CC/PD sources (mostly pre-1928)
   - **Mitigation:** Accept older material, focus on craft fundamentals
   
3. **Labeling cost:** 3 raters × 150 scripts = 450 screenplay reads
   - **Mitigation:** Can parallelize, takes 2-4 weeks total
   
4. **Risk of failure:** If AUC < 0.70, P1 fails and roadmap stalls
   - **Mitigation:** This is the whole point - validate or pivot
   
5. **One-shot evaluation:** Can't iterate on test set
   - **Mitigation:** This is correct - test set is for validation, not tuning

### Neutral Consequences

1. **Validation set separate from test:** Adds complexity but necessary
2. **4-tier labels:** More complex than binary but less than continuous
3. **Pre-registration:** Adds upfront work but saves post-hoc headaches

---

## Implementation Timeline

**Phase 1: Corpus Assembly (Week 1-2)**
- Source 150-200 CC/PD screenplays
- Verify licensing
- Standardize formats

**Phase 2: Labeling (Week 3-4)**
- Recruit 3+ raters
- Blind independent labeling
- Calculate inter-rater agreement
- Resolve conflicts

**Phase 3: Split & Lock (Week 4)**
- Perform stratified split
- Generate manifest
- Compute SHA-256 hash
- Lock test set

**Phase 4: Development (Week 5-8)**
- Tune on training set
- Check on validation set
- Iterate until satisfied
- Never touch test set

**Phase 5: Code Freeze (Week 8)**
- Document commit hash
- No more changes

**Phase 6: Test Evaluation (Week 9)**
- Unlock test set (verify hash)
- Run doctor once
- Compute metrics
- Make GO/NO-GO decision

---

## Validation Criteria

### P1 Gate PASSES if ALL of:
- ✅ AUC >= 0.70 on held-out test set
- ✅ Bootstrap 95% CI lower bound > 0.65
- ✅ Brier score < 0.20 (calibration)
- ✅ Test AUC within 0.10 of validation AUC (no severe overfitting)
- ✅ Pre-registration protocol followed (or deviations documented)

### P1 Gate FAILS if ANY of:
- ❌ AUC < 0.70
- ❌ CI lower bound <= 0.65 (too uncertain)
- ❌ Brier score >= 0.25 (poor calibration)
- ❌ Major overfitting (test << validation by >0.10)

**If P1 fails:** Revisit feature channels, scoring model, or product direction. Do NOT tune on test set to "fix" results.

---

## Success Probability Estimate

**Conservative:** 40-60% chance of passing P1 gate

**Reasoning:**
- Scene-count channel shows AUC ~0.938 on calibration corpus
- But: calibration corpus is controlled (20 samples, synthetic quality ladder)
- Real corpus will be noisier (genre variety, length variety, older material)
- Rule-channel contributes little (~0.076 AUC internally)
- Anti-slop channel unvalidated

**Optimistic scenario (60%):** Scene-count scarcity generalizes well, AUC ~0.75-0.85
**Pessimistic scenario (40%):** Real scripts confound scene-count signal, AUC ~0.60-0.65

**Either way, we learn:** That's the point of P1.

---

## References

- **ROADMAP.md P1:** High-level P1 requirements and exit gate
- **PRE_REGISTRATION_PROTOCOL.md:** Detailed step-by-step procedure
- **SPLIT_STRATEGY.md:** Technical split implementation
- **SCREENPLAY_SOURCES_RESEARCH.md:** Legal screenplay sources analysis
- **corpus-manifest-schema.json:** Manifest data structure
- **Landis & Koch (1977):** Kappa interpretation scale
- **DeLong et al. (1988):** Comparing AUC values

---

## Notes

**2026-07-15:** Design complete, awaiting corpus sourcing (P1-1, P1-2 research complete). Pre-registration protocol ready to fill out before corpus work begins.

**Future considerations:**
- If P1 passes: Expand corpus to 300-500 scripts for tighter CI
- If P1 fails: Analyze which channels work, consider hybrid LLM+deterministic
- Consider genre-specific benchmarks (drama vs comedy may have different signals)
- Consider contemporary corpus (commission CC0 scripts from writers)
