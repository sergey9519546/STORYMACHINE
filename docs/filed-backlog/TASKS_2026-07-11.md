# TASKS — StoryMachine (single source of truth, 2026-07-11)

## Re-calibration wave (arc → health) — RAN 2026-07-11: HOLD (docs/scoring/ARC_RECALIBRATION_WAVE_2026-07-11.md)
Ran on the AUTHORITATIVE env-gated 71-script corpus (not the reconstructed set).
Result: HOLD the wire — keep emotional-arc diagnostic-only. Zero regression.
- Authoritative baseline: suite green (73 pass/0 fail), all 71 exact-health match,
  shuffle-drop AUC-24 0.672 (floor 0.622 holds), act-swap AUC-24 0.480.
- Standalone arc signal DOES see act-swap (rampCorrelation AUC 0.823, arcHealth
  0.804) — real, not noise — but it is CONTINUOUS with heavy intact/swap overlap.
- No zero-intact-FP gate exists; best <=1-FP conjunction flags a produced feature.
  Continuous blend reaches only ~0.54-0.56 act-swap (right at the flapping bar)
  and only by saturating ~25% of intact scripts at health=100 + full re-lock.
- Decision: do NOT trade real ratchets (scale integrity, produced-floor) for a
  fragile sub-ratchet. Graduation gate documented in the scoring doc.
NEXT: build a smoothed tension-centroid + monotonic-rise climax-placement
extractor, re-measure for a zero-FP gate firing >=12/61 swap, THEN wire + re-lock.

## Session 2026-07-11 landed (all additive, deterministic, suite green 9,263/0-fail)
13 modules: emotional-arc(wired+real 12k VAD lexicon), anti-slop, theme-extract,
interiority, tssf-rubric, temporal(Allen), surfacing(finding-gate keystone),
epistemic-ledger, custody-ledger, inflection-tension, voice-delta,
dialogue-info-ratio, excellence-signals — each with tests. Plus Phase-A audit +
frozen baseline, Phase-B benchmark, W1 tiers, 45-film corpus, ultraplan, citation
corrections (deep-fact-check).

## USER-OWNED (I cannot do these from here)
- Commit package.json + package-lock.json together; then `git add --renormalize .`
  after the new .gitattributes; commit the 13 modules + docs.
- Unset NODE_ENV=production in the dev shell; keep the working checkout off OneDrive.
- Start human-preference labeling (evals/scoring/human/HUMAN_LABELING_TASK.md) —
  the only thing that unblocks calibration (Phase G).


Every open item across ROADMAP §1–8, EXECUTION_PLAN Phases A–I, and the
Pre-Flight ULTRAPLAN. Governing laws (all tasks): deterministic canon, no LLM
judge owns canon, measure-before-threshold on the real corpus, no regression to
6/6 discrimination · AUC floor 0.622 · produced-anchor 45/45 ≥80 · full suite
green. Status: ☐ todo · ◐ in-progress · ☑ done · ⛔ blocked.

## Foundation (Phase 0) — close-out
- ◐ F0.1 Commit `package.json` + regenerated `package-lock.json` together (dotenv→deps done; `npm ci` verified).
- ◐ F0.4 `.gitattributes` ADDED; deliberate `git add --renormalize` commit remains.
- ☐ F0.3 Unset `NODE_ENV=production` in dev shell; move working checkout off OneDrive (env fixes, yours).

## Session 2026-07-11B landed (additive, deterministic, full suite green 9,299/0-fail)
- ☑ Wired anti-slop + theme + interiority as DIAGNOSTIC ScriptDoctorReport fields
  (antiSlop/theme/interiority) — additive, no health/verdict/AUC coupling; 71
  exact-health + shuffle 0.672 + act-swap 0.480 all unchanged; tsc clean.
- ☑ Adversarial-acquittal pass (`server/nvm/proof/acquittal.ts`, 17 tests):
  searches strongest innocent explanation; UNKNOWN acquittable above threshold,
  CONTRADICTED never acquitted; `surfaceAfterAcquittal` composes with shouldSurface.
- ☑ Audience-disclosure ledger (`server/nvm/analyze/disclosure-ledger.ts`, 19 tests):
  chronology-vs-discourse fair-reveal — payoff-before-setup + unwithdrawable-twist
  rules → open-world SupportState.
- NOTE: all six files copied to repo byte-verified; git COMMIT remains user-owned.

## Phase 1 — wire the landed signals (additive, gated)
- ☑ EA emotional-arc module (real 12k VAD lexicon + Reagan fit) — LANDED diagnostic, act-swap AUC 0.647.
- ☑ FI modules LANDED (additive, unused): anti-slop.ts, theme-extract.ts, interiority.ts, tssf-rubric.ts, human-label-import.ts.
- ☑ Proper calibrated unit tests for anti-slop / theme-extract / tssf / human-label (full suite 9,146 tests, 0 fail).
- ☑ Wire anti-slop / theme-extract / interiority into the doctor report as DIAGNOSTIC fields (LANDED 2026-07-11B; additive, no health change, suite green).
- ☑ Wire 5 more fountain-based excellence detectors as DIAGNOSTIC report fields (mirrorScenes, silence, bonding, coldOpenPromise, patternEstablishment) — LANDED 2026-07-11B; corpus gate confirmed 71 exact-health + AUCs unchanged, suite green. (8 diagnostic signals now on every ScriptDoctorReport.)
- ⛔ Verbosity-bias fix INVESTIGATED 2026-07-11B → HOLD (docs/scoring/VERBOSITY_BIAS_2026-07-11.md). Bias confirmed +6.0. Both surgical levers PROVEN impossible: (1) filler doesn't fire anti-slop (and anti-slop isn't zero-FP: 3/72); (2) a words-per-scene cap must be ≤28 wps to flip the test, but calibration is 27–34 and corpus 51–1485, so any such cap breaks band-monotonicity + the produced-anchor. Correct fix = a from-scratch density re-calibration adding a length-independent absolute issue-count term; run as its own gated wave.
- ◐ Arc→health blend MEASURED (GO at w≈0.5: act-swap 0.51→0.66, shuffle 0.68>floor). WIRING gated on the engine env-corpus AUC harness + calibration/discrimination manifest re-lock (a dedicated re-calibration wave).
- ☐ Anti-slop generic-emotion detector → a real revision-pass rule (heuristic/`pattern_to_watch` tier); re-lock corpus manifest if it fires.

## Phase 2 — Pre-Flight finding-gate (core architecture)
- ☑ Open-world support states (ENTAILED/CONTRADICTED/UNKNOWN+ops) — in surfacing.ts.
- ◐ Surfacing-criterion GATE landed (`server/nvm/proof/surfacing.ts`, 12 tests): open-world states, 7 dependency classes, N/S/C/A/V decision, per-subtype thresholds, internal→external verdict. REMAINS: the ledgers/extraction that estimate N/S/C/A per finding.
- ☑ Necessary-vs-optional dependency classifier (7 classes; 6 hard releasable) — in surfacing.ts.
- ☑ Adversarial-acquittal pass (`acquittal.ts`, 17 tests) — LANDED 2026-07-11B.
- ☐ Internal(multi-state)→external(binary) verdict mapping.

## Phase 3 — the four ledgers (state model)
- ◐ Character-epistemic ledger LANDED (minimal deterministic: presence + communication-path `canKnow`→open-world SupportState; `server/nvm/analyze/epistemic-ledger.ts`, 6 tests). REMAINS: semantic fact-reference extraction (LLM-gated) + wire to a knowledge-path detector via the surfacing gate.
- ☑ Audience-disclosure ledger (`disclosure-ledger.ts`, 19 tests) — LANDED 2026-07-11B. REMAINS: wire onto a fair-reveal detector via the surfacing gate.
- ☐ Causal-dependency graph over IMPORTED scripts (= EXECUTION_PLAN W3, change-impact) — recall ≥80% on hand-labeled breaks.
- ◐ Allen-interval temporal proof LANDED (`server/nvm/analyze/temporal.ts`, 36 tests: 13 relations + path-consistency contradiction detection). REMAINS: wire onto the event ledger.
- ☑ 100-Endings inflection-rate tension signal (`inflection-tension.ts`, verified arXiv 2604.09854) — 2nd position-aware act-swap signal.
- ☑ Object-custody ledger (`custody-ledger.ts`, canUse→SupportState) — physical-world layer for surfacing object_custody.

## Phase 4 — calibration & selection kernel (needs humans)
- ⛔ Human labeling (Phase G blocker): blinded pairwise, TS-SF/NVAR rubric (diagnostic). Protocol: `evals/scoring/human/HUMAN_LABELING_TASK.md`.
- ☐ Calibrate τN/τC/τA per subtype; Platt/isotonic per output type.
- ☐ Scoring-kernel C: hard-gate/soft separation. D: multidimensional scorecard (arc + interiority + theme as dimensions). E: long-horizon. F: sparse judge ensemble + abstention. G: calibration. H: Pareto/portfolio + pairwise ranker.
- ☐ Change-impact user-validation (U1): demo shipped doctor/what-if to ~5 screenwriters (wedge validation).

## Phase 5 — product surface
- ☐ Evidence-grounded report (page-linked proof objects) + change-impact headline + repair *conditions* (never rewrites) + export.
- ☐ Trust contract surfaced: "No rewrites. No generic coverage. No flag without evidence. No training on your script."
- ☐ Abstention as a first-class finding outcome; import-confirmation loop + author locks (only if U1 supports).

## ✅ IMPORT COMPREHENSION — Phase 1 LANDED (2026-07-11B) — docs/scoring/IMPORT_COMPREHENSION_2026-07-11.md
MAJOR finding: the doctor was NOT comprehending imported scripts — every corpus script
parsed to 0 dialogue lines / 0 speaking characters (double-spacing made parseFountain type
every cue as action). The rich per-scene record layer (dialogue, speakers, relationships,
power) was dormant on imports. FIX (Phase 1, landed): `screenplay-normalizer.ts` (8 tests) —
reconstructs clean Fountain from messy/OCR/scraped input so the engine's existing deep parser
comes alive. Heading detection byte-compatible with parseFountain → scene segmentation NEVER
changes (0/12 drift, incl. WALL-E 292→292); comprehension 12/12 (Ratatouille 0→799 dialogue/
0→95 speakers, Toy Story 3 0→1084, Pulp Fiction 0→1119). Idempotent on clean input. Full suite
9,437/0-fail (module built + tested, not yet wired).
- ☑ Phase 2 LANDED 2026-07-11B: normalizeScreenplay wired into analyzeFountainText — the doctor
  now scores on COMPREHENDED dialogue/characters, not misparsed all-action. Real gate: shuffle-drop
  AUC 0.731→0.759 (comprehension helps structural discrimination), act-swap ~0.609, floor holds,
  ZERO anchor violations. Manifest re-locked (42/72 scripts shifted, 0 verdict changes, all ≥80).
  Discrimination 13/0 + calibration 21/0 needed NO re-lock (relative props survived). Full suite
  9,437/0-fail. NOTE: the composite min-gap todo's gap compressed 2.2→~0.0 under comprehension
  (ordering still passes as a hard assert) — worth a look when the composite/excellence wave runs.

## ✅ HEALTH RE-ARCHITECTURE — INCREMENT 1 LANDED (2026-07-11B) — docs/scoring/HEALTH_REARCH_INCREMENT1_LANDED_2026-07-11.md
Shipped the continuous arc-incoherence structural deduction (doctor.ts aggregateReport,
in the bounded structural-deduction path OUTSIDE the density scalar). Diagnostic finding:
the old shuffle-drop AUC was a scene-COUNT artifact (scarcity AUC 0.938; rule-channel
weightedIssues AUC 0.076) — the doctor could NOT detect scene reordering (act-swap 0.480).
NOW: **act-swap AUC 0.480→0.615 (graduated past 0.55), shuffle-drop 0.672→0.731, anchor
≥80 (0 violations), discrimination 13/0 + calibration 21/0 byte-identical (feature-scale
floor ≥15 scenes), full suite 9,428/0-fail.** Manifest re-locked (19/71 shifted, 1 verdict:
A Scanner Darkly RECOMMEND→CONSIDER, correct for its fragmented structure). This BREAKS the
saturation entanglement for the arc axis — arc graduated. Increment 2 (de-saturate the
density normalizer now that structural AUC is curve-independent → close verbosity + composite
gap) is the natural follow-on. Git commit user-owned.
- ☑ ARC→HEALTH GRADUATION (was HOLD) — now landed via the structural-deduction path, not a density blend.

## ⚑ ARCHITECTURAL ROOT CAUSE (proven on the real gate 2026-07-11B) — docs/scoring/SATURATION_ROOT_CAUSE_2026-07-11.md
The health scalar's sub-1.0-density logistic HARD-SATURATES at 10 pts for density
≳0.65, so all "bad-enough" scripts pile at exactly health 70.0. This one fact
blocks THREE heavy waves at once: arc→health graduation, the verbosity-bias fix,
and the composite min-gap. Proven not a re-tune: de-saturating to SCALE=18/STEEP=35
closes the composite gap (5.27), holds ordering + calibration monotonicity +
anchor — but drops the REAL shuffle-drop AUC-24 0.672→0.617, below the 0.622 floor.
Structural-discrimination and quality-leveling are entangled in one scalar. THE FIX
(its own project, full ratchet gate + manifest re-lock): move structural-degradation
detection fully into the RULE channel (feeds weightedIssues, AUC independent of the
leveling curve), THEN the normalizer can be de-saturated/padding-robust safely.

## ROADMAP §5 open items (from the wave program)
- ⛔ Composite min-gap guard INVESTIGATED 2026-07-11B → blocked by penalty saturation (docs/scoring/COMPOSITE_MINGAP_FINDING_2026-07-11.md). A clean zero-FP `ON_THE_NOSE_MOTIVE` defect signal was found+measured (composite bad 5 hits / good 0, 0/72 corpus FP) but composite-bad is saturated at health 70.0 (as are escalation-bad, setup-bad) so NO defect rule can widen the gap. Needs an EXCELLENCE lever raising composite-GOOD, or a non-saturating density-scale change (same root limitation as DENSITY_RECAL_FINDING). Ordering stays a hard assertion; min-gap stays todo.
- ☑ OWNE COMPLETE (deterministic modules + tests, 2026-07-11B): O1 typed-promises ledger (`typed-promises.ts`, 6), O2 Integrity Rate aggregator + Tavern-Letter golden fixture (`integrity-rate.ts`, 13), O3 assertion-containment (`assertion-containment.ts`, 13), O4 belief-movement surprise (`belief-movement.ts`, 8), O5 mystery-fairness gates (`mystery-fairness.ts`, 10).
- ☑ STORY GOD COMPLETE (all as deterministic diagnostic modules + tests, 2026-07-11B): SG1 well-made-surprise (`well-made-surprise.ts`, 6), SG2 genre-obligation (`genre-obligation.ts`, 12), SG3 cold-open promise tracker (`cold-open-promise.ts`, 9, shuffle-sensitive), SG4 pattern-establishment (`pattern-establishment.ts`, 9), SG5 causality enforcer (`causality-enforcer.ts`, 13).
- ☑ Tier-1 remnants COMPLETE: dialogue-info-ratio, Burrows Delta voice-delta, want-need + antagonist-defensibility excellence, mirror-scene structural-echo (`mirror-scene.ts`, 11 tests), silence/subtext (`silence-signal.ts`, 10 tests), bonding/affiliation "oxytocin" (`bonding-signal.ts`, 9 tests) — all LANDED 2026-07-11B, modules+tests, suite green.
- ☑ Deployment gate (S-wave) CODE ITEMS already shipped + tested (verified 2026-07-11B against `tests/routes/hardening.test.ts`): SEC-1 SSRF allowlist (`validation.ts ssrfUnsafeUrlReason` + `openai-compat.ts` belt-and-suspenders), OPS-1 crash handlers (`server.ts installCrashHandlers`: unhandledRejection logged+swallowed, uncaughtException→graceful shutdown exit 1), OPS-2 `/metrics` auth (bearer timing-safe else loopback-only else 404), prod-gated CSP (`app.ts`), container non-root (`Dockerfile USER node`), DoS payload caps (`express.json 1mb` + PDF cap + paginated getters). REMAIN (infra/ops-owned, not code): release pipeline + backup job.
- ◐ Corpus growth: ☑ The Lion King (1994) INGESTED 2026-07-11B — OCR'd from a 106-page scanned TIFF (tesseract), deterministically cleaned to fountain (46 scenes, 19k words), scores health 87.7 / RECOMMEND / arcHealth 1.98; manifest now 72 entries, corpus gate green (all AUC/anchor ratchets hold), full suite 9,429/0-fail. Corpus text stays local (gitignored); only derived manifest facts committed.
  - ⚠ Of the 55 provided PDFs, 3 are NOT ingestible as-is (subtitle/transcript dumps with no scene headings — Aladdin_Matched, Big-Hero-6-2014, Moana): they need a real screenplay source, not a subtitle rip, before they can join the calibration corpus. Everything else provided is already in.
- ☐ Corpus growth 72→150+ (further sourcing; 155-screenplay index).
- ☐ Frontend component tests; E2E Playwright journeys; auth implementation.

## Known todo tests / defects
- ☐ §5.2 composite-reviewer-scenario test is `todo` (gap 2.2 < 5.0) — the 1 todo in the suite.
- ☑ Verbosity bias CONFIRMED (+6) — Phase-B metamorphic (fix queued above).

## Immediate next 5 (execution order)
1. Foundation close: F0.1 commit + F0.4 `.gitattributes`.
2. Land proper FI-module tests (in progress) + wire the 4 diagnostic signals into the report.
3. Verbosity-bias fix behind the `empty_verbosity` gate.
4. Prototype the surfacing criterion on ONE detector (knowledge-path) vs the corpus (Phase-2 keystone).
5. Stand up a minimal character-epistemic ledger + re-measure knowledge/intention false-positive rate on produced films.
