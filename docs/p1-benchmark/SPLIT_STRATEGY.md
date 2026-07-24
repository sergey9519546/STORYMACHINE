# P1 Benchmark Architecture Design
## Train/Validation/Test Split Strategy

**Version:** 1.0  
**Date:** 2026-07-15  
**Status:** Design Proposal

---

## Overview

STORYMACHINE's P1 phase requires a real-screenplay benchmark to validate that the doctor's score discriminates between strong and weak writing. This document defines the split strategy, data handling, and validation methodology.

---

## Core Principles

1. **Pre-registration:** Methodology documented BEFORE any corpus work begins
2. **Held-out protection:** Test set never touched during development/tuning
3. **Blind labeling:** >=3 experienced readers label independently
4. **Stratified sampling:** Balanced across quality levels, genres, lengths
5. **Legal distribution:** Only CC/public domain screenplays
6. **Reproducibility:** Anyone can download corpus and reproduce results

---

## Dataset Split Strategy

### Three-Way Split

```
Total Corpus: N screenplays
├── Training Set: 60% (0.6N)
├── Validation Set: 20% (0.2N)  
└── Test Set: 20% (0.2N)
```

**Training Set (60%):**
- Used for tuning weights, adding features, exploring patterns
- Can be analyzed, measured, and iterated on freely
- Labels are public and used for development

**Validation Set (20%):**
- Used for selecting between model variants
- Prevents overfitting to training set
- Used during development for intermediate evaluation
- Labels visible but NOT used for direct tuning

**Test Set (20%):**
- **HELD-OUT:** Never touched until final evaluation
- Locked with cryptographic hash at corpus creation
- Used ONCE for final P1 gate evaluation
- Only way to prove the score generalizes

---

## Stratification Strategy

### Quality Strata (Primary)

Split each quality tier proportionally:

```
Strong Scripts (Label: A, Score 0.75-1.0)
├── Train: 60%
├── Val: 20%
└── Test: 20%

Good Scripts (Label: B, Score 0.50-0.75)
├── Train: 60%
├── Val: 20%
└── Test: 20%

Weak Scripts (Label: C, Score 0.25-0.50)
├── Train: 60%
├── Val: 20%
└── Test: 20%

Poor Scripts (Label: D, Score 0.0-0.25)
├── Train: 60%
├── Val: 20%
└── Test: 20%
```

**Rationale:** Ensures each split has similar quality distribution. Prevents train/test mismatch where all strong scripts are in training and all weak in test.

### Secondary Stratification (If Corpus Size Allows)

**Genre Balance:**
- Drama, Comedy, Thriller, Action, Sci-Fi, Horror
- Ensure each split has similar genre distribution

**Length Balance:**
- Short (<90 pages), Medium (90-120), Long (>120)
- Prevent length as confounding variable

**Era Balance (if applicable):**
- Classic (pre-2000), Modern (2000-2015), Recent (2015+)
- Control for style drift over time

---

## Minimum Corpus Size

**Target:** 100-200 screenplays minimum
- Train: 60-120 scripts
- Val: 20-40 scripts  
- Test: 20-40 scripts

**Quality distribution target:**
- 25% Strong (A-tier)
- 35% Good (B-tier)
- 30% Weak (C-tier)
- 10% Poor (D-tier)

**Why this distribution:** Mirrors real-world screenplay quality. Most scripts are "good enough" (B/C tier), fewer are excellent or terrible.

---

## Split Generation Procedure

### Step 1: Corpus Assembly
1. Collect N legally distributable screenplays
2. Validate licensing (CC-BY, CC0, Public Domain)
3. Standardize format (Fountain or plain text)
4. Anonymize (remove author names, dates from content)

### Step 2: Blind Labeling
1. Recruit >=3 experienced screenplay readers
2. Each reader independently labels all N scripts
3. Labels: A (strong), B (good), C (weak), D (poor)
4. Calculate inter-rater agreement (Fleiss' kappa)
5. Resolve conflicts: majority vote or consensus discussion

### Step 3: Stratification
1. Group scripts by consensus label (A/B/C/D)
2. Within each quality tier, shuffle randomly
3. Assign first 60% to Train, next 20% to Val, last 20% to Test

### Step 4: Held-Out Protection
1. Generate SHA-256 hash of test set manifest
2. Publish hash publicly (in repo, ADR, paper)
3. Store test set in encrypted/access-controlled location
4. Document who has access (minimize to 1-2 people)

### Step 5: Manifest Creation
```json
{
  "corpus_version": "1.0.0",
  "created_date": "2026-MM-DD",
  "total_scripts": 150,
  "splits": {
    "train": {
      "count": 90,
      "scripts": ["train-001.fountain", "train-002.fountain", ...]
    },
    "val": {
      "count": 30,
      "scripts": ["val-001.fountain", "val-002.fountain", ...]
    },
    "test": {
      "count": 30,
      "scripts": ["test-001.fountain", "test-002.fountain", ...],
      "hash": "sha256:abc123...",
      "locked": true
    }
  },
  "stratification": {
    "by_quality": {"A": 38, "B": 52, "C": 45, "D": 15},
    "by_genre": {"drama": 60, "comedy": 30, "thriller": 30, ...},
    "by_length": {"short": 30, "medium": 90, "long": 30}
  },
  "labeling": {
    "raters": 3,
    "method": "blind_independent",
    "inter_rater_agreement": 0.72,
    "conflict_resolution": "majority_vote"
  }
}
```

---

## Evaluation Protocol

### Training Phase (Iterative)
- Run doctor on training set
- Measure AUC, accuracy, calibration
- Tune weights, add/remove rules, adjust formulas
- Repeat until satisfied

### Validation Check (Periodic)
- Run doctor on validation set
- Measure AUC, check for overfitting
- If val AUC >> train AUC: overfitting detected
- If val AUC << train AUC: underfitting or mismatch

### Final Test Evaluation (ONE TIME ONLY)
1. **Freeze all code** - no more changes allowed
2. **Document exact commit hash** being evaluated
3. **Unlock test set** (hash verification)
4. **Run doctor on test set** (all scripts, deterministic)
5. **Compute metrics:**
   - AUC with bootstrap 95% CI
   - Accuracy at optimal threshold
   - Per-quality-tier discrimination
   - Calibration plots
6. **Publish results** with full methodology
7. **Lock test set permanently** - never reuse

---

## Success Criteria (P1 Gate)

**Minimum AUC:** 0.70 on held-out test set
- Bootstrap 95% CI lower bound > 0.65
- Significantly better than random (AUC 0.50)
- Demonstrates real discrimination

**Calibration Check:**
- Predicted probabilities match observed frequencies
- Brier score < 0.20

**No Overfitting:**
- Test AUC within 0.05 of validation AUC
- Similar performance across quality tiers

---

## Data Leakage Prevention

**Strict Rules:**
1. **Never look at test set labels** during development
2. **Never run experimental code** on test set
3. **Never tune hyperparameters** based on test performance
4. **Document all val set uses** (when, why, what changed)
5. **One-time test evaluation** only

**Acceptable Test Set Uses:**
- Verifying file loading works (without reading labels)
- Running pre-registered analysis (after freeze)
- Final evaluation (exactly once)

**Forbidden Test Set Uses:**
- "Let's see if this new rule helps" (use validation set)
- "Let's optimize threshold on test" (use validation set)
- "Test AUC dropped, let's revert" (that's overfitting)

---

## Random Seed Management

**Reproducibility Requirements:**
- Document random seed used for split
- Allow regeneration of exact same splits
- Enable independent verification

**Seed Policy:**
```python
CORPUS_SPLIT_SEED = 42  # Arbitrary but fixed
np.random.seed(CORPUS_SPLIT_SEED)
# Generate stratified splits
```

Document seed in manifest and ADR-002.

---

## Cross-Validation Alternative (Not Recommended)

**Why NOT cross-validation:**
- 5-fold CV means touching all data 5 times
- Increases risk of overfitting
- Harder to maintain held-out discipline
- More complex to explain and verify

**When CV might make sense:**
- Very small corpus (<50 scripts)
- Need to maximize training data
- Willing to sacrifice held-out guarantee

**STORYMACHINE Decision:** Use 60/20/20 split with strict held-out test set. Simpler, clearer, more trustworthy.

---

## Documentation Requirements

**Before Corpus Work:**
- ✅ This architecture document
- ✅ ADR-002 (benchmark design decisions)
- ✅ Pre-registration protocol

**During Corpus Work:**
- Labeling instructions for raters
- Inter-rater agreement results
- Conflict resolution log
- Manifest with hashes

**After Test Evaluation:**
- Full results report
- Commit hash of evaluated code
- Bootstrap confidence intervals
- Calibration plots
- Publish corpus (if legally possible)

---

## Future Extensions

**If P1 Succeeds:**
- Expand corpus to 500+ scripts
- Add more quality tiers (5-point scale)
- Create genre-specific benchmarks
- Add AI-generated scripts for comparison

**If P1 Fails (<0.70 AUC):**
- Analyze failure modes (where does it break?)
- Revisit feature channels (rule-based vs anti-slop vs scene-count)
- Consider hybrid approaches (deterministic + LLM ensemble)
- May require fundamental rethink of scoring model

---

## Related Documents

- **ROADMAP.md P1:** High-level P1 requirements
- **ADR-002:** Design decisions rationale
- **Pre-registration protocol:** Detailed step-by-step procedure
- **Labeling guide:** Instructions for screenplay raters
- **Manifest schema:** JSON schema for corpus metadata

---

## Appendix: Example Stratification Code

```python
import numpy as np
from typing import List, Dict

def stratified_split(
    scripts: List[str],
    labels: List[str],  # A, B, C, or D
    train_ratio: float = 0.6,
    val_ratio: float = 0.2,
    test_ratio: float = 0.2,
    random_seed: int = 42
) -> Dict[str, List[str]]:
    """
    Perform stratified split ensuring quality balance across sets.
    """
    assert abs(train_ratio + val_ratio + test_ratio - 1.0) < 1e-6
    
    np.random.seed(random_seed)
    
    # Group by label
    quality_groups = {}
    for script, label in zip(scripts, labels):
        if label not in quality_groups:
            quality_groups[label] = []
        quality_groups[label].append(script)
    
    train, val, test = [], [], []
    
    # Split each quality tier proportionally
    for label, group in quality_groups.items():
        group = np.array(group)
        np.random.shuffle(group)
        
        n = len(group)
        train_end = int(n * train_ratio)
        val_end = train_end + int(n * val_ratio)
        
        train.extend(group[:train_end])
        val.extend(group[train_end:val_end])
        test.extend(group[val_end:])
    
    return {
        "train": sorted(train),
        "val": sorted(val),
        "test": sorted(test)
    }
```

---

**Status:** Design ready for implementation. Awaiting corpus sourcing (P1-1, P1-2).
