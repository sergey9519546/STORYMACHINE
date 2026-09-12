# Adversarial review — 2026-09-12

The owner asked for a principal-level adversarial review of the current
features and logic, run as an orchestrator over Sonnet and Opus subagents,
with the objective of finding the best achievable version of THIS product
and moving it there. Three read-only investigators took main at c087a6ca
apart from three angles; their findings became build lanes, each held to
`docs/LANE_STANDARD.md` §6's independent review and §7's durability rule
(every lane pushes `lane/<name>` after every commit; every review is written
into this directory before its verdict).

## The investigations (read-only, committed first)

| file | lens | model | headline |
|---|---|---|---|
| `writer-loop.md` | the writer's loop driven in a browser, feature-length and short, phone and desktop | Opus | 18 ranked findings: a production note in a comment raised health ~10 and flipped a verdict; a forged letter verdict passed the verifier; RE-RUN COVERAGE ran nothing; the "next fix" jump invented a location; the front door's first numbers were stale literals |
| `engine-logic.md` | the engine and its claims, re-derived on an independent scorer | Opus | 14 findings: the density channel's zero-gradient dead zone; reversing every scene of the feature fixture raised health; a Fountain-legal dialogue reflow moved health 11 points; the gates reporter satisfied by a gutted suite; the calibration corpus's uncontrolled word budget |
| `server-data-tests.md` | server routes, data paths, test soundness over everything merged since 2026-09-06 | Sonnet | one HIGH (the verifier checked none of the tier's numbers), one LOW (README/ARCHITECTURE silent on the tier); five mutations against five new tests all killed |

## The lanes

| lane | findings | rounds | landed |
|---|---|---|---|
| `verify-covers-tier` — one claim set behind both exporters and both verifiers; nine more verified fields; page refs through the PDF paginator; the forgery limit stated truthfully with the counterexample committed | C BUG-1, DOC-1; A 2 | REVISE 8 → REVISE (copy) → MERGE | 9cd1805c (main) |
| `instrument-integrity` — gates liveness under an in-memory mutation; one scene segmenter; CLIMAX_RELOCATE to position one with floors re-locked from a rerun; climax-term claims corrected; claims-register anchors on every pointer in both columns | B 6, 7, 11, 12 | REVISE 4 → MERGE | ad9c7802 (main) |
| `writer-loop-client` — RE-RUN issues a real run; jump spans belong to their finding; the front-door card from a real doctor run with a drift test; Labs gate; compact-card hint; one health number; clamped dimension badges; the surfaces gate no longer starves on the rate limiter | A 3, 5, 6, 9, 10, 15, 4/14 | REVISE 7 → MERGE → round-3 confirmation MERGE (the ui-polish readiness race fixed once at the cause; verify:p0-flow shown to be a pre-existing ~1-in-4 race on main) | e440a0a8 (main; rows 94–100 renumbered 100–106 at merge) |
| `rulebook-and-guard-bound` — rulebook regeneration idempotent with four restored clusters and a zero-diff guard; the voice-eligible bound derived from measured cost (675,000; worst admitted shape ~12–14 s) | B 14, 10 | REVISE (bound under-derived) → REVISE (assertion form) → MERGE | 0507b008 (main) |
| `exports-truth` — one priorities list in the letter; Graph Health labelled diagnostic; cross-references resolve; export round-trip loss measured and disclosed; export-side badges through the shared function; voice abstention explained | A 8, 11, 16, 18, 4/14, 17 | REVISE 2 (the FDX round-trip disclosure false both ways; the letter no longer one-to-two pages) → MERGE → round-3 MERGE (the letter gate on the shipped shape, bounded at four pages) | 54e97efd (main; rows 107–115) |
| `writer-followups` — the gate multiplier scoped to browser gates; the `.env` clause; a count assertion for abort sites | writer review R2 follow-ups | REVISE (the fuzzer lost 18 probes) → REVISE (the 503 misattributed) → MERGE | e9b4cff8 (main) |
| `p0-flow-race` — the smoke gate's earliest-instant race was a gate race, not a product defect: the run is held in flight and the lazy chunk held at mount, so both windows are pinned rather than trusted; a deny-by-default scanner for hand-rolled holds | merge-battery finding (p0-flow red 1 of 3 on main; the writer round-3 reviewer measured 3 of 8) | REVISE 3 (the detector was 4 of 6, not deterministic) → MERGE | 9816ffe0 (main) |
| `scoring/adversarial-2026-09-12` — parse and format invariance (fourteen transforms), the gradient re-measured, permutation-ensemble invariants, the calibration confound disclosed, report truth at the seam, the voice-pair cap, forced-element markers and cue-extension spelling folded, `npm run probe-corpus-shape` as the owner's first instruction | B 1–5, 8, 9, 13, 10; A 1, 7, 12, 13 | REVISE (the pipeline seam took the whole normaliser while three places said half) → READY-FOR-OWNER → READY-FOR-OWNER → READY-FOR-OWNER | 4cf5b2f3 (`scoring/*`, owner-gated, never merged here) |
| `scoring/forced-cue` — Fountain's `@` cue honoured at the parser seam and in every renderer (32/32 → 0/32); a ninth shape-guard bypass class the parser change itself opened, closed | scoring review round 2, non-blocking 1 | READY-FOR-OWNER → round-2 items built | 089bec91 (stacked on 4cf5b2f3; owner-gated) |

What the reviews caught that the lanes' own gates had passed is summarised in
[[Audit - 2026-09-12 Adversarial Review]] (`docs/brain/Audits/`); each
`*-review.md` is the full record, with every reproduction's command and number.

What only the owner can do, unchanged: `measure-real` in the order
`docs/brain/Owner/Owner - R5 Measurement and Merge.md` gives (the
feature-length branch now carries a known bound defect recorded on its brain
note), the AUC-24 lock before 2026-10-01 on the new recipe, the Actions account
block, the licence, the visibility toggle, deleting merged `lane/*` branches
the sandbox proxy cannot delete.
