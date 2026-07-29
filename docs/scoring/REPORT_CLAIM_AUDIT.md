# Report Claim Audit — Lever 1

> **Read-only audit.** This ledger traces every user-facing claim the Script
> Doctor coverage report makes to the exact code that produces it, and judges
> whether the report's wording is substantiated by the underlying computation.
> It changes **no** scoring formula, constants, rules, detectors, calibration,
> report math, or renderer strings. It is documentation only. Suggested
> rewordings are proposals for the owner (Lever 3), not edits made here.
>
> Scope: the two surfaces a writer actually sees — the exported HTML coverage
> report (`server/lib/coverage-html.ts`) and the in-app React panel
> (`src/components/scriptide/ScriptDoctorPanel.tsx`). The HTML export is the
> P0 stimulus artifact (`docs/user-validation/sample-coverage-report.html`).
>
> Authority: `ROADMAP.md`, `NORTH_STAR.md`, `AGENTS.md`,
> `docs/reference/STORYMACHINE_ACTIVE_WORK_PROMPT.md` (Lever 1),
> `docs/user-validation/P1_BASELINE_INVENTORY.md`. The constitution's load-
> bearing order is **correct before reproducible**: a broken ruler is perfectly
> reproducible; determinism is worthless if the verdict is wrong
> (`NORTH_STAR.md:68-73`).

---

## Top overstatements to fix

These are the claims where the report's wording implies more than the code
delivers. Ordered by how much the wording outruns the computation.

1. **Footer: "no generative AI read or scored this script" / "Same script, same
   verdict, every time"** — `server/lib/coverage-html.ts:323-324`. The first
   clause is true (the verdict path is diagnose-only, no LLM — `doctor.ts:72-79`,
   `export.ts:714-718`). The second clause ("same verdict, every time") is a
   **reproducibility** claim dressed as a **correctness** claim. Re-derivation
   via `/api/export/verify` proves the score is *reproducible*, not that it is
   *right* (`export.ts:707-741`). By the project's own measurement the rule
   channel has AUC ~0.076 and the score leans on scene-count scarcity (AUC
   ~0.938) (`doctor.ts:1652-1656`, `ROADMAP.md:47`). **Verdict: imprecise.**
   Reword to separate the two: "Deterministic analysis — no generative AI read
   or scored this script. The same script text always reproduces the same
   report."

2. **"Verification hash" / implied "verify this report" claim** —
   `server/lib/coverage-html.ts:316-317` (renders `report.contentHash.slice(0,
   12)`). The hash is `sha256(fountain.trim())` (`doctor.ts:67-69`) — a hash of
   the **input text only**, not of the score or any computation. The verify
   endpoint (`export.ts:741-841`) re-runs the doctor and checks four fields
   (health, verdict, totalIssues, healthPercentile) reproduce within tolerance.
   This proves **reproducibility against the same engine**, never correctness
   against an external standard. `ROADMAP.md` P3 markets this as a "verify this
   report" link (`ROADMAP.md:178-182`); the HTML export carries **no such link**
   — only a bare hash with no call to action and no endpoint reference.
   **Verdict: imprecise + the P3 promise is unfulfilled in the export.**
   Reword the footer to: "Reproducibility receipt — re-running the engine on
   the same script text reproduces this report." Flag for owner: the verify
   link itself does not exist in the rendered export.

3. **"Stronger than {N}% of the reference set" (health percentile)** —
   `ScriptDoctorPanel.tsx:2849, 2894`. The wording is honest about *what* the
   reference set is, but a writer has no in-product signal that the "reference
   set" is **20 hand-authored synthetic 10-scene samples**
   (`corpus.ts:5-14`, `CALIBRATION.md:9-16`), not produced screenplays. The
   panel gives no tooltip or qualifier; the descriptor function
   (`percentile.ts:78-91`) that *would* say "of the reference set" is computed
   for dimensions (`doctor.ts:1790`) but the panel renders only the bare
   ordinal for dimensions (`ScriptDoctorPanel.tsx:3052-3057`) and a custom
   inline string for health. **Verdict: imprecise** (true at face value, easy
   to misread as "of all scripts"). Flag for owner: surface "20-sample
   synthetic reference set" once near the percentile.

4. **Craft dimension scores presented as rounded authority** —
   `server/lib/coverage-html.ts:155-167` (renders `dim.score.toFixed(1)` and a
   `dim.summary`). Each dimension score is `computeDimensionScore` — a
   **density-only** formula with **no scarcity term** (`doctor.ts:582-591`),
   and a dimension can rest on as few as **one or two passes**
   (`DIMENSION_DEFS`, `doctor.ts:648-654`: e.g. `theme-originality` = `theme`
   + `originality`; `dialogue-voice` = `dialogue` + `voice`). The displayed
   score to one decimal implies a precision the underlying signal doesn't
   support, and the summary sentence (`buildDimensionSummary`,
   `doctor.ts:722-741`) never says "based on {N} passes" or "low confidence."
   Below `DIMENSION_LOW_CONFIDENCE_SCENES = 3` the score rounds to a whole
   number (`doctor.ts:588-590`) but there is **no marker surfaced to the
   writer** (`doctor.ts:525-534` documents the missing field as a known gap).
   **Verdict: imprecise.** Reword summaries to name the pass count, e.g.
   "based on the theme and originality passes alone."

5. **"What's Working" / strengths presented as earned praise** —
   `server/lib/coverage-html.ts:178-192`. Each strength is a **thresholded
   boolean guard** over a single signal channel (`buildStrengths`,
   `doctor.ts:1338-1415`). They are never-padded by design (each helper
   returns `null` below its threshold), so the *presence* of a bullet is
   genuine. But the *wording* states craft facts ("Tension genuinely builds…",
   "Every clue planted… gets paid off") as measured properties, when several
   rest on a **single lexicon channel** (e.g. `structure.escalating` is one
   back-half > front-half suspense-average comparison, `doctor.ts:1350-1357`;
   the clue-payoff guard rests on `openClues === 0 && anyClueSeeded`,
   `doctor.ts:1359-1365`). **Verdict: imprecise** — earned, but phrased as
   stronger authority than a single thresholded signal warrants.

---

## Claim-by-claim ledger

Legend: `substantiated` = wording matches computation · `overstated` = wording
claims more than the code delivers · `fabricated` = no underlying computation
supports the claim · `imprecise` = true at face value but easy to misread.

### 1. Health score number

| # | Claim (writer-visible) | Code source | Verdict | What it actually measures | Fix / flag |
|---|---|---|---|---|---|
| 1.1 | `68.9` / `…/100` (HTML: `health-number`, `health-outof`) | `coverage-html.ts:138-139`; value from `computeHealthScore` (`doctor.ts:434-441`) | **substantiated** (as a number) | `100 − craftPenalty`, clamped `[0,100]`, rounded to 0.1. `craftPenalty = densityPenalty + scarcityPenalty` (`doctor.ts:399-405`). density term = a tuned power curve over `weightedIssues / wordCount^0.7` (`doctor.ts:334-367`); scarcity = `140/sceneCount` (`doctor.ts:373-376`). | None — the number is exactly what the formula computes. The *meaning* of the number is audited below (1.2, 5.x). |
| 1.2 | The health number as a *craft-quality* measure | `aggregateReport` subtracts `structuralDeduction` + `arcIncoherenceDeduction` from `baseHealth` (`doctor.ts:1679`) | **imprecise** | Mostly a function of issue density ÷ script length, plus a `140/sceneCount` scarcity surcharge. By the project's own probe, the rule channel carries AUC ~0.076 and scene-count scarcity carries AUC ~0.938 (`doctor.ts:1652-1656`). Two structural deductions (SCC + global-arc, capped at 24; arc-incoherence, capped at 15, feature-scale only) are layered on top. | The number is honestly *computed*; the report never claims "this measures craft quality" in so many words, but the surrounding vocabulary (grade "Solid", verdict "CONSIDER", "craft score") implies it. Flag for owner: this is the core honesty gap Lever 2 is meant to close with real-writing evidence. No rewording alone fixes it. |
| 1.3 | "overall craft score {health}/100" (plain summary) | `buildPlainSummary`, `doctor.ts:1438` | **imprecise** | Same number as 1.1, labeled "craft score." | See 1.2. The phrase "craft score" is the strongest implicit correctness claim in the report. |

### 2. Grade and verdict

| # | Claim | Code source | Verdict | What it actually measures | Fix / flag |
|---|---|---|---|---|---|
| 2.1 | Grade label (HTML `health-grade`, e.g. "Solid"; panel `GRADE_META[report.grade].label`) | `gradeForHealth` (`doctor.ts:594-600`); bands at 90/75/55/35; rendered `coverage-html.ts:140`, `ScriptDoctorPanel.tsx:111-116` | **substantiated** | A pure bucketing of the health number into 5 named bands. | None — the label is an honest restatement of the band the number falls in. The band's *validity* inherits 1.2's caveat. |
| 2.2 | Verdict stamp (HTML `stamp`, e.g. "CONSIDER"; panel `VERDICT_META`) | `verdictFor` (`doctor.ts:607-611`): `RECOMMEND` needs `health≥85 && sceneCount≥8`; `PASS` if `health<60`; else `CONSIDER`. Plus the SCC-pervasive RECOMMEND→CONSIDER downgrade (`doctor.ts:1698-1700`). Rendered `coverage-html.ts:80-88`, `ScriptDoctorPanel.tsx:132-157` | **substantiated** (mechanically) | A 3-bucket thresholding of health with a scene-count floor and one structural override. | None mechanically. The "PASS (decline)" parenthetical (`coverage-html.ts:86`) is a genuinely good honesty guard against the most-misread word in the doc. |
| 2.3 | Verdict *explainer* prose (panel only): "rarest, strongest endorsement a reader gives" / "the bones are there" | `ScriptDoctorPanel.tsx:138-153` | **overstated** | The explainer describes what the verdict *means in industry coverage*, but the verdict itself is a deterministic threshold on a formula whose discrimination is unproven on real writing (`P1_BASELINE_INVENTORY.md:9-10, 56-65`). "Strongest endorsement a reader gives" implies human-reader parity the engine has not earned. | Soften to describe what the engine measured, not what a human reader would say: e.g. RECOMMEND → "The deterministic engine scored this draft in its top band — ready to move forward on its measurements." Flag for owner. |
| 2.4 | plainSummary verdict descriptor: "a strong draft ready to move forward" / "a promising draft that needs focused work" | `VERDICT_DESCRIPTORS`, `doctor.ts:1419-1423`; injected at `doctor.ts:1438` | **overstated** | Same threshold-derived verdict dressed in qualitative language ("strong", "promising") that implies a quality judgment the formula does not validate. | Reword to tie the descriptor to the score band, not to a craft judgment: e.g. CONSIDER → "a draft scoring in the middle band — focused work would move it up." |

### 3. Craft dimension scores

| # | Claim | Code source | Verdict | What it actually measures | Fix / flag |
|---|---|---|---|---|---|
| 3.1 | Five dimension labels: "Structure & Pacing", "Character", "Dialogue & Voice", "Plot Logic & Payoff", "Theme & Originality" | `DIMENSION_DEFS`, `doctor.ts:648-654`; rendered `coverage-html.ts:160` | **substantiated** (as labels) | A fixed editorial regrouping of the 14 passes into 5 buckets. The mapping is a deliberate table, not inferred. | None. |
| 3.2 | Each dimension's `score/100` (e.g. "67.7/100", "98.8/100") | `computeDimensionScore` (`doctor.ts:582-591`) via `buildDimensions` (`doctor.ts:781-805`); rendered `coverage-html.ts:164` | **imprecise** | `100 − dimensionDensityPenalty`, a **density-only** curve (no scarcity term) with its own tuned constants (`DENSITY_POWER_DIM=1.5`, `DENSITY_SCALE_DIM=100`, `doctor.ts:549-561`). Deliberately different from the overall formula. | The score is honest *as a density measure*; the `.toFixed(1)` precision overstates it. See top-5 #4. |
| 3.3 | Does a dimension rest on a single detector? | `DIMENSION_DEFS` pass arrays (`doctor.ts:648-654`) | **imprecise** (presentation) | Dimension pass counts: structure-pacing=3 (structure, pacing, rhythm); character=3 (character-arc, intention, relationship-arc); **dialogue-voice=2** (dialogue, voice); plot-logic=4 (causality, belief, payoff, conflict); **theme-originality=2** (theme, originality). So two dimensions rest on only 2 passes each — and a dimension's score is dominated by whichever of its passes fires most. | Per Lever 3 guidance (`ACTIVE_WORK_PROMPT.md:94-95`): name the pass basis in the summary. E.g. theme-originality → "based on the theme and originality passes alone." |
| 3.4 | Dimension summary sentence (e.g. "45 minor problem(s) here, mostly around revelation drought") | `buildDimensionSummary` (`doctor.ts:722-741`); `analyzeDimensionIssues` (`doctor.ts:683-716`) | **substantiated** | Templated from the dimension's actual issue counts, dominant severity, and single most-frequent rule (humanized). Every clause reads precomputed data. | None — this is the most honest part of the dimension surface. The "topRuleArea" is `humanizeRuleName(topRule)` (`doctor.ts:664-666`, `714`): a lowercased rule constant, not a curated phrase. |
| 3.5 | Low-confidence dimensions (few scenes) | `DIMENSION_LOW_CONFIDENCE_SCENES = 3` (`doctor.ts:535`, `588-590`) | **fabricated** *(as a user-visible signal)* | The rounding coarsens below 3 scenes, but **no marker reaches the writer** — the code comment explicitly flags the missing `DimensionScore.lowConfidence` field as a known gap (`doctor.ts:525-534`). | Flag for owner: the low-confidence guard exists in the math but is invisible to the writer. Lever 3 candidate. |

### 4. "What's Working" / strengths

| # | Claim | Code source | Verdict | What it actually measures | Fix / flag |
|---|---|---|---|---|---|
| 4.1 | Section header "What's Working" + checklist of praise bullets | `coverage-html.ts:178-192`; data from `buildStrengths` (`doctor.ts:1338-1415`) | **imprecise** (collectively) | Each bullet is a **thresholded boolean guard** that returns `null` below threshold (never-padded). The bullets are *earned* in the sense that the signal cleared a bar, but each rests on a single channel. | See top-5 #5. Reword to name the signal basis where a single channel is the only evidence. |
| 4.2 | "Nothing to fix in {dim} — clean across all {N} scene(s)." | `doctor.ts:1344-1348` (zero-issue dimension guard) | **substantiated** | Fires only when a dimension's `issueCount === 0` — a literal count from the pipeline. | None — this is a measured fact. |
| 4.3 | "Tension genuinely builds as the story goes…" | `doctor.ts:1350-1357`, guard on `structure.escalating` | **imprecise** | `structure.escalating` is a **single** comparison: back-half average suspenseDelta > front-half average. One number crossing a threshold becomes a sentence with "genuinely." | Soften: "Tension rises on average from the first half to the second (measured by suspense lexicon density)." |
| 4.4 | "Every clue planted in this draft gets paid off…" | `doctor.ts:1359-1365`, guard on `openClues === 0 && anyClueSeeded` | **substantiated** (narrowly) | Literally true *given the engine's clue-detection*: zero open clues and at least one seeded. The claim is only as good as the clue-seed/payoff detector — which the corpus evidence shows fires on *zero* of the 20 reference samples' payoff channel (`doctor.ts:860-864`, Wave 1183 comment). | Honest as stated; the limit is the detector's coverage, not the wording. Flag: the guard can be satisfied trivially if the detector under-fires. |
| 4.5 | "No fatal flaws surfaced across {N} scenes…" | `doctor.ts:1367-1372`, guard on `bySeverity.critical === 0 && sceneCount >= 5` | **substantiated** | A literal zero-critical count with a minimum-scene floor. | None. |
| 4.6 | "The clock isn't set once and forgotten…" (stakes continuity) — **REWORDED 2026-07-28** to "Deadline pressure (clock-raising language) appears in both halves…" | `buildStakesContinuityStrength`, `doctor.ts:894-910`; guard at `1379-1380` | **was rated substantiated, downgraded to imprecise, then reworded (Category A fix)** | Checks `clockRaised` appears in both halves (≥6 scenes). Corpus-verified: 2/5 strong, 0/15 others (`doctor.ts:888-893`). BUT the earlier "substantiated" verdict missed a falsification test: reversing the scene list still satisfies the gate (both halves still contain a clock-raising scene) while swapping the named early/late scene numbers, so the wording's implication of chronological escalation was not supported by the gate. The guard is real; the old wording overstated it. Reworded to describe the measured fact (presence in both halves) and frame scene numbers as detected positions, not narrative chronology. See `docs/user-validation/DIMENSION_HONESTY_AUDIT_2026-07-28.md`. |
| 4.7 | Relationship dynamism / emotional range / scene-purpose variety / suspense shaping / cold-open / climax placement / acceleration / dramatic-turn density strengths | `doctor.ts:943-1412` (eight more guards), aggregated `1382-1412` | **substantiated** (individually) — **climax-placement reworded 2026-07-28** | Each is a separate thresholded guard with its own corpus-evidence comment. None is padded. The climax-placement claim ("The climax is where it belongs") was reworded (Category A fix) to "The draft's single most intense scene lands in the final stretch…" after a falsification test (`scripts/probe-dimension-honesty.mjs`) showed the gate re-binds to whatever scene is most intense after a relocate, so the old wording's implication that the *author's* climax was confirmed-placed was unsupported. | Per-guard audit would lengthen this ledger without changing the pattern: each is one measured signal phrased as a craft strength. Same imprecise-as-authority caveat as 4.1 applies uniformly. |

### 5. Health percentile

| # | Claim | Code source | Verdict | What it actually measures | Fix / flag |
|---|---|---|---|---|---|
| 5.1 | "Stronger than {N}% of the reference set" (panel, health) | `ScriptDoctorPanel.tsx:2849, 2894`; value from `healthPercentile` | **imprecise** | `percentileRank` of the report's *unclamped* raw craft score against the sorted health array of the **20-sample synthetic reference corpus** (`reference.ts:264-282`, `percentile.ts:40-57`, `doctor.ts:1779-1785`). | See top-5 #3. The phrase "reference set" is technically honest but a writer cannot tell it means 20 synthetic 10-scene samples. |
| 5.2 | Is there a real reference population? | `REFERENCE_CORPUS` (`corpus.ts:88-90`), 20 hand-authored samples, 5 per band | **substantiated** (the population is real and runnable) but **the reference is synthetic-only** | 20 original Fountain samples, controlled-richness design, *not* produced screenplays (`corpus.ts:5-14`, `CALIBRATION.md:9-16`, `reference.ts:5-14`). | Not a wording bug — a scope fact. The doc layer is scrupulously honest (`percentile.ts:60-65`, `reference.ts:5-14`). The gap is that the *panel* drops the qualifier. |
| 5.3 | Dimension percentile badge (panel: "{ordinal} pct") | `ScriptDoctorPanel.tsx:3052-3057`; `dim.percentile` from `doctor.ts:1786-1791` | **imprecise** | Same 20-sample synthetic ranking, per dimension. The panel renders a bare ordinal + tooltip of `percentileDescriptor` — the descriptor that *would* say "of the reference set" (`percentile.ts:78-91`) is only in the tooltip, not the visible badge. | Surface "of the reference set" in the visible badge text, not just the tooltip. |
| 5.4 | Percentile rendered in the HTML export? | (absent) | **n/a — not rendered** | `coverage-html.ts` never reads `healthPercentile` or `percentile`. The exported coverage report carries **no percentile at all** — confirmed by grep (0 occurrences) and by the sample report (`sample-coverage-report.html`). | None required — but note the asymmetry: the percentile (the most easily-misread claim) appears only in the in-app panel, not the shareable export. |

### 6. contentHash / "verify this report"

| # | Claim | Code source | Verdict | What it actually measures | Fix / flag |
|---|---|---|---|---|---|
| 6.1 | "Verification hash: `33dcf2146211`" (HTML footer) | `coverage-html.ts:316-317`; value = `computeContentHash(fountain)` | **imprecise** | `sha256` of `fountain.trim()` — a hash of the **input text only** (`doctor.ts:67-69`). It attests "this report came from this text," not "this report's score is correct." | See top-5 #2. Reword to "Reproducibility receipt" and make explicit it hashes the input. |
| 6.2 | What re-derivation proves | `/api/export/verify`, `export.ts:741-841` | **imprecise** (as marketed) | Re-derivation re-runs `runScriptDoctor` and checks 4 fields reproduce within `VERIFY_FLOAT_TOLERANCE = 0.05` (`export.ts:728, 798-822`). This proves **reproducibility** (same engine + same text → same numbers), **not correctness** (the numbers are right). It is also a no-op for *validity*: a consistently-wrong engine verifies clean. | The constitution is explicit on this distinction (`NORTH_STAR.md:68-73`). The footer's "Same script, same verdict, every time" collapses the two. Flag for owner. |
| 6.3 | "verify this report" link (ROADMAP P3 promise) | `ROADMAP.md:178-182` | **fabricated** *(in the current export)* | The HTML export contains **no verify link, no endpoint reference, and no call to action** — only the bare 12-char hash. The endpoint exists (`export.ts:741`) but is not wired into the rendered report. `ROADMAP.md` lists "Add a 'verify this report' link" as P3 work (`ROADMAP.md:177`), i.e. not yet done. | Flag for owner: the P3 "verify this report" feature is a roadmap item, not a shipped surface. The current export cannot be verified by a third party without already knowing the endpoint. |
| 6.4 | contentHash as draft-over-draft comparability receipt | `types.ts:334-338` | **substantiated** | Two reports with equal contentHash came from identical text — true and useful for the draft-history delta feature. | None. |

### 7. "Based on X signals" / count-of-rules footer wording

| # | Claim | Code source | Verdict | What it actually measures | Fix / flag |
|---|---|---|---|---|---|
| 7.1 | Footer: "Deterministic analysis — no generative AI read or scored this script." | `coverage-html.ts:323` | **substantiated** | The verdict path runs `runDiagnoseOnly`, which short-circuits every pass's `rewritePass()` before any LLM call (`doctor.ts:72-79`). No `Math.random`/`Date.now` in passes (verified by the doc comment). | None — this clause is true and important. |
| 7.2 | Footer: "Same script, same verdict, every time." | `coverage-html.ts:324` | **imprecise** | True as a *reproducibility* statement (the engine is deterministic). Reads as a *correctness* statement. | See top-5 #1 and 6.2. |
| 7.3 | Any "based on N signals" / "N rules" wording in the report footer? | (grep of `coverage-html.ts` + sample report) | **n/a — not present** | The exported coverage report contains **no** "based on N signals" or "N rules" footer wording. The only count-related footer text is the scene/word/page meta-line in the header (`coverage-html.ts:113-115`). | None — the report does not make a rule-count claim. The rule-count inflation problem (`ROADMAP.md:45-49`, `NORTH_STAR.md:22-35`) lives in marketing/landing copy and older docs, **not** in this coverage report. |
| 7.4 | Panel sub-line: "Deterministic · reproducible · no LLM judge" | `ScriptDoctorPanel.tsx:2872` | **substantiated** | All three are accurate: diagnose-only (deterministic), memoized identical output (reproducible), no LLM in the score path (no LLM judge). | None — this is the most defensible one-line summary in the product. |
| 7.5 | "Zero issues found across all 14 passes." (panel, when totalIssues===0) | `ScriptDoctorPanel.tsx:2866-2868` | **substantiated** | Literal count from the 14-pass pipeline. | None. |

---

## Cross-cutting findings

**The renderer is more honest than the roadmap fears.** The exported coverage
report (`coverage-html.ts`) makes **no** rule-count claim, **no** "based on N
signals" claim, and renders **no percentile** at all. The rule-count inflation
liability (`ROADMAP.md:45-49`, `NORTH_STAR.md:22-35`) does not appear in this
surface. The honesty gaps that *do* appear are subtler: reproducibility-as-
correctness framing (footer, 6.2), percentile-without-qualifier (panel, 5.1),
and dimension scores presented at one-decimal precision without naming their
pass basis (3.2-3.3).

**Two surfaces, two honesty profiles.** The HTML export (the P0 stimulus) is
the stricter surface: no percentile, no verdict explainer prose, no
"rarest/strongest endorsement" language. The in-app React panel carries the
softer wording (verdict explainers 2.3, percentile 5.1, dimension badges 5.3).
Lever 3 rewording should target the panel first if P0 shows writers the panel,
and the export first if P0 shows writers the export — `ROADMAP.md:108` says the
P0 stimulus is the static HTML report.

**The verify promise is unfulfilled in the export.** `ROADMAP.md:177-182`
lists "Add a 'verify this report' link" as P3 work. The endpoint
(`/api/export/verify`, `export.ts:741`) is built and works, but the rendered
export carries only a bare hash with no link, no endpoint, and no instructions.
A third party opening a shared report cannot verify it without already knowing
the API. This is a product gap, not a wording gap.

**The deepest honesty gap is not fixable by rewording.** Claims 1.2, 2.3, 2.4,
and 4.x all inherit a single root problem: the score's discrimination on real
writing is unproven (`P1_BASELINE_INVENTORY.md:9-10, 56-65`; `NORTH_STAR.md:38-
52`). Softening the wording reduces the *implied* promise, but only Lever 2
(runnable discrimination evidence on real scripts) can tell the truth about
what the score actually does. This ledger records that limit; it does not
resolve it.

---

## Files cited (all paths absolute)

- `server/lib/coverage-html.ts` — the HTML export renderer (every emitted string)
- `server/nvm/analyze/doctor.ts` — health/dimension/grade/verdict/strengths/percentile/contentHash/aggregateReport
- `server/nvm/analyze/types.ts` — report field contracts (contentHash, healthPercentile, dimensions)
- `server/nvm/analyze/calibration/percentile.ts` — percentileRank, percentileDescriptor
- `server/nvm/analyze/calibration/reference.ts` — reference distribution build, MIN_CORPUS_SIZE
- `server/nvm/analyze/calibration/corpus.ts` — the 20-sample synthetic reference corpus
- `server/routes/export.ts` — `/api/export/verify` endpoint (what re-derivation checks)
- `src/components/scriptide/ScriptDoctorPanel.tsx` — in-app panel rendering (percentile, verdict explainers, grade labels)
- `docs/user-validation/sample-coverage-report.html` — the P0 stimulus artifact (rendered export)
- `docs/CALIBRATION.md` — calibration methodology (corroborating the code's own honesty)
