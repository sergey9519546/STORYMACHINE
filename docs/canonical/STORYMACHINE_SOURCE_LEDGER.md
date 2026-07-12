# STORYMACHINE_SOURCE_LEDGER

Traceability layer for the 2026-07-11 synthesis. Maps every canonical claim and
equation back to a source. This is a compression index — it does **not** replace
or erase the original files, which remain untouched in
`MAIN_StoryMachine_Engine_Logic/` and its `_superseded_2026-07-10/` archive.

Corpus scale (measured by inventory sweep + md5): **193 files**, **24
byte-identical duplicate groups**, one explicit archive folder
(`_superseded_2026-07-10/`, ~103 files). Version lineage of the master doc:
V2.1 → V3.x → V3.9 → Prime v5.x → V6.x → V7 → **INTAKE (2026-07-11)**.

## 1. Source ID scheme

| Prefix | Meaning |
|---|---|
| `INTAKE-*` | New research uploaded 2026-07-11 (primary inputs to this synthesis) |
| `CANON-*` | Live repo governance/architecture docs |
| `DERIV-*` | Synthesis docs produced during this intake |
| `RECOVER-*` | Ideas recovered from the legacy corpus by the Wave-1 audit |
| `LEGACY-*` | Superseded/archived material (kept for provenance, not current) |

## 2. Primary sources (INTAKE)

| ID | File | Type | Evidence quality | Math? | Disposition |
|---|---|---|---|---|---|
| INTAKE-01 | `_research_intake_2026-07-11/StoryMachine_Complete_Master_Research_Document.md` | encyclopedic research + data model | internal technical | yes | source of record (`.pdf` render is a redundant duplicate — kept `.md`) |
| INTAKE-02 | `_research_intake_2026-07-11/MAESTRO-S_v2_...Blueprint.md` | generation research blueprint | internal technical (rigorous) | **yes (§5 objectives)** | adopt method discipline; gate architecture |
| INTAKE-03 | `_research_intake_2026-07-11/StoryMachine_Studio_..._TRACE_White_Paper.md` | product pivot + algorithm spec | internal technical (strongest strategic signal) | **yes (§13–17)** | adopt product frame |
| INTAKE-04 | `_research_intake_2026-07-11/FactTrack_paper_(mislabeled_factcheck_ENGINE).pdf` | academic paper (Lyu, Yang, Kong, Klein) | **peer-reviewed** | yes (validity intervals) | adopt mechanism |
| INTAKE-05 | `_research_intake_2026-07-11/StoryMachine_1.1_Deliverables.zip` → Reference Engine 0.2.0 | runnable Python engine + schemas + 56 tests | internal technical (executable) | yes (proof kernel) | conformance oracle |

## 3. Live governance docs (CANON)

| ID | File | Role |
|---|---|---|
| CANON-NS | `NORTH_STAR.md` | constitution (deterministic canon, no LLM-judge, keyless-first) |
| CANON-RM | `ROADMAP.md` | durable master plan (now carries §7 intake) |
| CANON-UP | `ULTRAPLAN.md` | current spine |
| CANON-AR | `ARCHITECTURE.md` | system map (NVM subsystems) |
| CANON-CL | `CLAUDE.md` | conventions + Wave Program v2 |
| CANON-MRA | `docs/research-audit/MASTER_RESEARCH_AUDIT.md` | prior ~130-file audit + 3-tier queue |
| CANON-LD | `docs/research-audit/LEARNINGS_DISTILLED_2026-07-10.md` | prior research digest (Ernie-fabrication caution) |

## 4. Synthesis docs produced this intake (DERIV)

| ID | File | Purpose |
|---|---|---|
| DERIV-INT | `docs/research-audit/RESEARCH_INTEGRATION_2026-07-11.md` | adopt/defer/reject verdict map |
| DERIV-MATH | `docs/research-audit/RESEARCH_FORMULAS_ALGORITHMS_SCHEMAS_2026-07-11.md` | verbatim formulas/schemas |
| DERIV-PLAN | `docs/research-audit/PLAN_confidence_tier_determinism_2026-07-11.md` | first-upgrade build plan |
| DERIV-CANON | `docs/canonical/STORYMACHINE_*.md` (these 5 files) | canonical synthesis |

## 5. Recovered legacy ideas (RECOVER) — verified to exist in-file

Wave-1 Haiku audit surfaced 27 items; lead spot-checked the highest-value ones
against the actual files (anti-hallucination). Confirmed present verbatim:

| ID | Idea | Source file:line | Verified | Disposition |
|---|---|---|---|---|
| RECOVER-01 | Burrows's Delta voice metric (z-scored function-word distance) | `_CLEVER_MOVES.md:280-287` | ✅ reproduced (§RESEARCH_AND_MATH) | ADOPT (deterministic, ~0 cost) |
| RECOVER-02 | Allen Interval Algebra for temporal proof (13 relations, path-consistency) | `_CLEVER_MOVES.md:61` | ✅ reproduced | ADOPT (deterministic <10ms) |
| RECOVER-03 | Dialogue info-ratio gate `newInfoWordRatio < 0.4` (anti-exposition) | `_CLEVER_MOVES.md:143-144` | ✅ present | ADAPT (genre-tunable) |
| RECOVER-04 | Pixar 10 axioms w/ confidence scores (Effort Supremacy 95%, Want-Need Opposition 98%, …) | `pixar_cognitive_architecture_executive_summary.md:20-51` | ✅ present | ADAPT (excellence detectors) |
| RECOVER-05 | Reincorporation / Mirror-scene / Necessity engine | `_CLEVER_MOVES.md:19-34` | ✅ present (already partly in engine) | PARTIALLY IMPLEMENTED |
| RECOVER-06 | Commitment Ledger auto-triggering betrayal events | `_CLEVER_MOVES.md` | ✅ present | PROTOTYPE |
| RECOVER-07 | 100-Endings narrative-tension metric | `Narrative_Intelligence_Systems_Research_Paper_v2.md:85` | `Sui et al. arXiv:2604.09854` **VERIFIED REAL** (deep-fact-check 2026-07-11) | ADOPT (mechanism + citation) |

## 6. Contradiction & caution register

- **Strategy contradiction (resolved):** the shipped engine is a sprawling
  research platform (generation, converge, self-play, 12-critic room); INTAKE-03
  (TRACE) argues to *hide/defer* all of that behind an audit-first MVP. Resolution:
  one engine, two faces — audit is the front door, generation stays behind it
  (see TARGET_SYSTEM). Not a rebuild.
- **Two proof-kernel implementations:** TS `server/nvm` vs Python INTAKE-05.
  Resolution: TS is the single production engine; INTAKE-05 is a conformance
  oracle/spec. Do not run two.
- **Change-impact graph scope (adversarial-review correction):** `twin/scm.ts`
  builds the causal graph over *generation* StoryOps with *heuristically inferred*
  edges, not imported-script typed dependencies; `Impact(v)` is unimplemented. Any
  doc claiming change-impact "already exists" for the audit product is overstated —
  it is NEW work gated by EXECUTION_PLAN W3.
- **Single-source exposure:** audit-as-wedge, change-impact-headline,
  import-confirmation, author-locks, V(q), Priority(f) trace to INTAKE-03 alone;
  confidence tiers to INTAKE-05 alone — both internal, non-peer-reviewed. Only
  INTAKE-04 (FactTrack) is peer-reviewed, and narrow.
- **Fabricated-citation lineage:** the `【NN†L..】`-marked citations (Sui et al.,
  Shadow-Loom/Wilmot 2026, DiriGent, Sarkadi) originate in the "Ernie"/agent-report
  branch flagged by CANON-LD. Standing policy: **adopt mechanisms, never
  citations.** Every RECOVER-* mechanism must be re-grounded before it is cited.

## 7. Duplicate & supersession summary

- 24 byte-identical dup groups (mostly the repo's own tracked docs appearing in a
  worktree copy). One literal dup already deleted this intake:
  `_superseded_2026-07-10/StoryMachine_Prime_Complete_Master_Document (1).pdf`.
- INTAKE-01 `.md`/`.pdf` = same content, two formats → `.md` kept as source.
- The entire `_superseded_2026-07-10/` tree (LEGACY-*) is superseded by
  CANON-MRA + the INTAKE set; not treated as current.

## 8. Material intentionally excluded from the main synthesis (with reason)

| Excluded | Reason |
|---|---|
| `_superseded_2026-07-10/*` bulk (~103 files) | Superseded; already distilled by CANON-MRA. Only 27 items recovered (§5). |
| `.docx`/`.html`/`.zip`/`.tar.gz` binaries in archive | Format-only duplicates of `.md` content or dead build artifacts |
| Fabricated-citation claims | Excluded as evidence; underlying mechanisms retained per §6 |
| MAViS video-storytelling paper specifics | Out of product scope (screenplay audit), noted not adopted |

## 9. Unresolved questions (routed in EXECUTION_PLAN)

1. Do tier-weighted findings actually close the §5.2 composite gap on the real corpus? (measure)
2. At what script complexity does a graph representation beat compact JSON state? (MAESTRO insight #6 — unvalidated)
3. Are the recovered metrics (Burrows's Delta, dialogue info-ratio) separating on the 72-script corpus, not just in theory? (measure-before-threshold)
