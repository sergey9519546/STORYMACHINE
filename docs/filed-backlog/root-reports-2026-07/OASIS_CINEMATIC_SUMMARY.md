# OASIS Cinematic Adaptation — Quick Reference

## What This Does

**Adapts CAMEL-AI OASIS for film production** — keeps the OASIS engine, changes the vocabulary from "social media" to "screenplay."

---

## Core Concept

```
CAMEL-AI OASIS          →    Cinematic OASIS
─────────────────────────────────────────────
Twitter/Reddit          →    Film worlds (noir, horror, etc.)
Posts/Comments          →    Dialogue lines
Like/Follow/Mute        →    React/Ally/Betray
Social media users      →    Screenplay characters
Trending algorithm      →    Dramatic momentum
1M agents               →    Crowd scenes (armies, cities)
```

---

## What I Built

### `scripts/oasis_cinematic_adapter.py` (600+ lines)

**Three main components:**

### 1. **Cinematic Action Types** (replaces social media actions)
- Dialogue: SPEAK, INTERRUPT, WHISPER, SHOUT
- Physical: ENTER, FIGHT, EMBRACE, RETREAT
- Emotional: REACT, OBSERVE, CONTEMPLATE
- Social: FORM_ALLIANCE, BETRAY, CONFESS, LIE
- Meta: REFERENCE_FILM, ANALYZE_SCENE (for cinephiles)

### 2. **Cinematic Environments** (replaces Twitter/Reddit)
- 11 film genres: CRIME_THRILLER, HORROR, SCI_FI, etc.
- Special: FILM_SCREENING (cinephiles watching)

### 3. **Character Classes**
- `ScreenplayCharacter` — Film characters (not social media users)
- `CinephileAgent` — Film critics/scholars as observers

---

## Quick Test

```bash
# Install OASIS
pip install camel-oasis

# Set API key
export OPENAI_API_KEY=your_key

# Run example (noir interrogation scene)
python scripts/oasis_cinematic_adapter.py
```

**Output:** Film noir dialogue between detective & femme fatale, with cinephile commentary

---

## Status

✅ **Complete adaptation layer built**  
✅ **No StoryMachine code changes needed**  
✅ **OASIS core engine intact**  
✅ **Cinephile observers included**  
✅ **Ready to test**

**Files:**
- `scripts/oasis_cinematic_adapter.py` — Main adapter (600+ lines)
- `docs/integration/OASIS_CINEMATIC_QUICK_START.md` — This guide

Test it and let me know what to adjust for your film projects!
