# P1 Screenplay Sources Research Report

**Research Date:** 2026-07-15  
**Status:** Complete

---

## Executive Summary

**Key Finding:** Very few professional-quality screenplays are available under Creative Commons or public domain licenses. Most online repositories exist in legal gray areas.

**Recommendation:** Build P1 benchmark using legally safe sources (150-200 scripts) rather than risk copyright violations.

---

## Major Screenplay Repositories (Status Assessment)

### ⚠️ PROBLEMATIC (Not Recommended)

#### 1. SimplyScripts (https://www.simplyscripts.com)
- **Content:** 1,373 movie scripts, 964 unproduced, 199 Oscar contenders
- **Quality:** Mix of professional and amateur
- **Legal Status:** No Creative Commons licensing, unclear terms
- **Risk:** HIGH - Not safe for redistribution

#### 2. IMSDB (https://imsdb.com)
- **Content:** 1,000+ professional Hollywood scripts
- **Quality:** Professional produced screenplays
- **Legal Status:** Copyrighted by authors/studios, no CC licensing
- **Risk:** HIGH - Copyright-protected

#### 3. DailyScript / Script Slug
- **Status:** Similar to IMSDB - copyright protected
- **Risk:** HIGH

---

## ✅ LEGALLY SAFE SOURCES (Recommended)

### 1. Project Gutenberg (https://www.gutenberg.org)
- **Content:** 77,687+ eBooks including theatrical plays
- **Licensing:** PUBLIC DOMAIN (pre-1928 or expired copyright)
- **Quality:** Professional theatrical works
- **Estimated Count:** 100-500 theatrical plays
- **Risk:** NONE
- **Limitation:** Older material, theatrical format (not modern screenplay format)

### 2. Internet Archive (https://archive.org)
- **Content:** Various collections with CC/PD filtering available
- **Licensing:** MIXED - Filter by CC0, CC-BY, CC-BY-SA, Public Domain
- **Quality:** Highly variable
- **Estimated Count:** 50-200 with clear licensing
- **Risk:** LOW (if properly filtered)
- **Process:** Use advanced search with license filters

### 3. GitHub Screenplay Repositories
- **Content:** User-uploaded original scripts
- **Licensing:** Variable - verify each repository
- **Estimated Count:** 10-50 properly licensed
- **Risk:** LOW to MEDIUM (requires verification)

### 4. Kaggle & Hugging Face Datasets
- **Status:** Some screenplay datasets exist
- **Warning:** Often scraped from copyrighted sources
- **Risk:** MEDIUM to HIGH (verify source)

---

## Recommended Strategy for P1 Corpus

### ✅ Option 1: Purely Legal Corpus (RECOMMENDED)

**Sources:**
- Project Gutenberg public domain plays (100-500)
- Internet Archive CC-licensed content (50-200)
- Original CC-licensed amateur scripts (if available)

**Total:** 150-700 scripts  
**Legal Risk:** NONE  
**Tradeoff:** Older material, limited modern screenplays

### Option 2: Hybrid Approach

**Core (distributable):**
- Public domain + CC-licensed (150-200 scripts)

**Extended (reference only):**
- Instructions for users to download from IMSDB/SimplyScripts
- Document sources but don't redistribute copyrighted material

**Legal Risk:** LOW (for what we distribute)

### ⚠️ Option 3: Research Fair Use (Not Recommended)
- Argue fair use for research/benchmarking
- Use excerpts, not full scripts
- Don't redistribute corpus
- **Risk:** MEDIUM
- **Not suitable for commercial/open-source distribution**

---

## Attribution Requirements by License

### CC0 (No Attribution Required)
- Can use freely
- No restrictions

### CC-BY (Attribution Required)
- Must credit original author
- Include link to original
- Note any changes

### Public Domain
- No legal requirement
- Attribution recommended for academic integrity

---

## Quality Assessment

### Professional Quality:
- ❌ IMSDB, SimplyScripts (legally problematic)
- ✅ Project Gutenberg plays (professional but older)

### Genre Coverage:
- **Safe sources:** Limited modern genres, mostly classical drama
- **Risky sources:** All genres available but copyright protected

### Era Coverage:
- **Public domain:** Pre-1928 only
- **CC sources:** Mostly contemporary but amateur

---

## Action Items for P1 Corpus Building

1. **Immediate:**
   - [ ] Manually review Internet Archive with CC filter
   - [ ] Download sample from Project Gutenberg (verify suitability)
   - [ ] Search GitHub for explicitly licensed screenplay datasets

2. **Consider:**
   - [ ] Contact SimplyScripts for research-use licensing clarification
   - [ ] Explore fair use argument with legal counsel (if applicable)
   - [ ] Commission original CC0 scripts from writer communities

3. **Decision Required:**
   - Which strategy: Purely legal OR Hybrid?
   - Accept older theatrical plays OR seek modern screenplays?
   - Corpus size target: 150 minimum OR 500+ with legal risks?

---

## Conclusion

**Reality Check:** Professional modern screenplays under CC/PD are rare.

**Recommended Path:**
- Start with **150-200 legally safe scripts** (Project Gutenberg + Internet Archive)
- Accept that these are older/theatrical works
- Build validation methodology on this safe corpus
- Consider expanding through community CC-licensed contributions later

**Legal safety > corpus size** for open-source projects.

---

## Related Documents

- **PRE_REGISTRATION_PROTOCOL.md:** Corpus requirements and methodology
- **SPLIT_STRATEGY.md:** How to split collected corpus
- **ADR-002:** Benchmark design decisions (to be created)

---

**Next Step:** P1-2 (Research public domain screenplays in detail)
