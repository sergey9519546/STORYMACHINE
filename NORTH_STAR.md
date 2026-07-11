# STORYMACHINE — North Star

*This file did not previously exist as a committed artifact — ROADMAP.md and
ULTRAPLAN.md both reference it as "the constitution" but no NORTH_STAR.md was
ever landed. This is a first cut, assembled from the claims those two files
already make about it (rejection of LLM-judge scoring, the separation-margin
metric, sources, non-goals) plus the measured numbers current as of this
wave. Treat SS0 and the two doctrine laws as the new material; the rest
reconstructs what the surrounding docs already assumed existed.*

## 0. What StoryMachine claims to be (measured, not aspirational)

A deterministic core (audit / verdicts / percentiles / counterfactuals /
critics / receipts — fully keyless) inside a generative shell (candidates /
rewrites / voices — opt-in, labeled, degradable). The product's structural
claim is not "an AI that judges scripts" — it is "3,216 hand-specified,
corpus-measured rules a script either satisfies or doesn't," with the score
formula and every rule inspectable, not a black-box LLM opinion.

Measured proof points, current:
- **Discrimination**: 6 of 6 paired good/bad scenarios order correctly
  (good scores higher); 5 pairs are hard CI assertions with real margins
  (+1.4 to +6.2); the 6th (composite-reviewer-scenario) orders correctly
  (+2.2) but hasn't yet cleared the 5.0-point minimum-gap floor — diagnosed
  as ~19 style-minor false positives flooding the good half.
- **Ground truth**: 72 produced scripts (70 animated features + Pulp
  Fiction + Jaws, the first two live-action entries), all scoring
  RECOMMEND, manifest-locked with content-hash verification, run through an
  env-gated harness so the corpus text itself never enters the git history.
- **Degradation AUC** (the separation-margin metric made executable):
  shuffle-drop AUC-24 measured 0.672 against a hard ratchet floor of 0.622;
  AUC-71 (full corpus) measured ~0.652. A second degradation recipe
  (act-swap) sits at ~0.48, still near a coin flip — see the lexicon-vs-
  position law below for why.
- **Rulebook**: 3,216 rules extracted and browsable, staleness-tested
  against the live pass code so the count can't silently drift from docs.

## 1. Non-negotiables (the constitution proper)

- **No LLM-as-judge.** Every verdict a user sees is a deterministic rule or
  formula, inspectable and reproducible via `contentHash`. LLMs may SENSE
  (deep-read scene annotation) but never SCORE — rules verdict on whatever
  signal they produce, generative or lexical, identically.
- **Keyless-first.** The deterministic surface (doctor, diagnose, coverage,
  what-if, room, interview receipts) is the product's front door, not a
  degraded fallback. The server must never refuse to boot without an AI key.
- **Honest degradation.** Every LLM-gated feature degrades to a labeled,
  functional fallback when keyless — never a silent quality drop, never a
  500.
- **Determinism receipts.** `contentHash`-keyed reproducibility is a
  load-bearing product claim: the same script text always produces the same
  report, and the verify endpoint lets anyone check that externally.
- **Measure before threshold, on the real corpus, always.** Every detector
  that skipped this died (fired on zero corpus samples) or misfired
  (inverted on well-crafted writing). Fixture-only evidence is necessary but
  never sufficient — see the two hard-won laws below.

## 2. Two hard-won laws (added this wave — earn their place here)

- **Lexicon signals carry content, not position.** Act-swap degradation AUC
  sits at ~0.48 — worse than shuffle-drop's 0.672 — because word-and-phrase
  based signals (the vast majority of today's 3,216 rules) detect WHAT is
  said, and reordering large blocks preserves what's said while destroying
  when it's said. A script with its acts swapped still contains all the same
  clue words, emotional beats, and character text — just in the wrong
  sequence — and lexicon-derived signals are structurally blind to that.
  Global-arc-position claims (setup-before-payoff, escalation-before-climax)
  require a semantic channel that reads FOR position, not just content — the
  deep-read arc signal work (ULTRAPLAN SS1) exists to close exactly this gap.
- **Density normalization absorbs rule families at feature scale.**
  A newly-added rule that fires N more times on a bad script than a good one
  does not automatically move the displayed health score at feature length —
  the opportunity-normalized formula's density term treats issue count
  relative to script length, and at typical feature scarcity terms a
  15-23-instance gap can collapse to a <0.05 health delta (measured,
  D2-wave). Document-scale findings (global arc, structural collapse) need
  the bounded structural-deduction pathway — a dedicated, capped formula
  contribution outside the density-normalized instance count — not more
  detectors hoping to out-fire the normalization.

## 3. Sources

`ARCHITECTURE.md` (system map), `CLAUDE.md` (conventions + Wave Program v2),
`server/nvm/revision/WAVE_QUALITY_GUARANTEE.md` (binding wave quality spec),
`ROADMAP.md` (resume protocol + open work), `ULTRAPLAN.md` (current spine +
priority queue), `docs/research-audit/MASTER_RESEARCH_AUDIT.md` (research
incorporation map), `tests/core/discrimination.test.ts` and
`tests/core/real-script-corpus.test.ts` (the numbers this file cites — always
re-verify against these before quoting them further).

## 4. Non-goals

- Not a generic "AI writing assistant" — no unlabeled auto-rewrite, no
  silent quality substitution, no LLM opinion presented as a verdict.
- Not a multi-user SaaS product yet — session ids are unguessable
  capabilities today, not an authentication layer (`docs/AUTH.md` documents
  the gap; nothing enforces it — deployment blocker for public multi-user
  use only, not for the deterministic core's correctness).
- Not chasing corpus size for its own sake — 72 produced scripts with a
  manifest-locked, hash-verified harness beats an unverified pile of
  scraped text; corpus growth is real work (OCR, live-action sourcing) but
  never trades away verification.
- Not adopting AI-generated "research" mechanisms on the strength of their
  citations — `v35_integration_plan.md`'s fabrication audit stands: adopt
  mechanisms, never citations, from anything in the research archive.
