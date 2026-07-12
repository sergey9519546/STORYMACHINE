# STORYMACHINE_EXECUTION_PLAN

Evidence-driven roadmap, rebuilt from dependencies (not from the current task
order). Priorities: **P0** blocks correctness/reliability/testing · **P1**
necessary for a credible professional core · **P2** strong differentiator ·
**P3** deferrable · **DEFER/REJECT** as stated. Every item is assignable and
testable. Ground truth for sequencing: what is *absent* in code (verified by
grep) vs what already exists.

## Strategic objective
Turn the existing analysis engine into a professional **audit + change-impact +
repair** product for screenwriters, without a rebuild, by adding a small set of
missing contracts and reframing the surface. Keep generation behind the door.

## Baseline (measured)
Mature TS engine (~20k LOC, 51 routes, 3,216 rules, 72-script corpus, AUC floor
0.622, 6/6 discrimination). What-if graph exists but **only over generation
StoryOps with inferred edges** (`twin/scm.ts`); `Impact(v)` and imported-script
dependency extraction are **absent** — change-impact for the audit product is NEW
work, not a surfacing. Confidence tiers, abstention, import-confirmation,
author-locks, Allen-temporal, Burrows's-Delta: **absent** (grep-verified). The
audit-as-wedge itself is **unvalidated by any user**.

## Priority decisions (KEEP/STRENGTHEN/MODIFY/NEW/DEFER/REJECT)
| Area | Decision | Note |
|---|---|---|
| Deterministic-canon + proof kernel | **KEEP** | ratified by all sources |
| Keyless-first, no LLM-judge | **KEEP** | ratified |
| Change-impact over imported scripts | **NEW (gated)** | graph exists only over generation ops w/ inferred edges; `Impact(v)` unimplemented — build + validate (W3) before headline |
| Finding contract (tier×determinism) | **NEW** | absent; P0 |
| Abstention output | **NEW** | absent; P1 |
| Import confirmation + author locks | **NEW** | absent; P1 |
| Allen-interval temporal proof | **NEW** | RECOVER-02; P1 |
| Burrows's Delta voice metric | **NEW** | RECOVER-01; P2 |
| Real-literary "great" calibration band | **NEW** | INTAKE-05; P1 |
| Always-on 12-critic room | **MODIFY** | → sparse, placebo-gated |
| Autonomous generation as front door | **REMOVE (from product surface)** | keep engine behind the door |
| Graph DB / MAP-Elites / RL at launch | **DEFER** | JSON state wins below complexity threshold |
| CVaR candidate selection | **NEW (behind door)** | P2, generation track only |

---

## F0 — Environment & packaging blockers (found + fixed 2026-07-11)

A first clean build had never been run; verifying it surfaced three blockers
upstream of everything below. Fixed and live-validated this session:

- **F0.1 [P0 · DONE] `dotenv` was a devDependency but imported at runtime** (`server.ts`). Any `--omit=dev` install (Docker/CI) omitted it → boot `ERR_MODULE_NOT_FOUND` / 500. Moved to `dependencies`; validated a production install (`--omit=dev`, NODE_ENV=production) now includes it and the server boots. `package-lock.json` regenerated (minimal reconcile — the only change is `dotenv` losing its `dev:true` flag, zero transitive drift) and **`npm ci` verified green** (343 pkgs, dotenv installed). Both files now in sync in the repo. **Remaining:** commit package.json + package-lock.json together.
- **F0.2 [P0 · DONE] Six routes 500'd in keyless mode** — `/api/scriptide/{world-build,refine-dialogue,analyze-tension,clean-action,character-profile}` and `/api/analyze-script` called the LLM with no guard → unhandled 500 without an API key, violating NORTH_STAR "honest degradation" (keyless is the front door). Added an `llmReady()` guard (ORs both key sources) returning `{usedLLM:false,note}` (200) or 503 for analyze-script; live-verified no more 500s. Also guarded an unhandled DELETE in `DirectorPanel`.
- **F0.3 [P0 · ENV] `NODE_ENV=production` set in the dev shell** → npm omits ALL devDependencies (TypeScript, Vite, tsx, dotenv) on install, silently half-installing the toolchain. Unset it for development (or `npm install --include=dev`). Machine/env fix, not code.
- **F0.4 [P1 · ENV] repo + `node_modules` live in OneDrive**, which reverts writes to tracked files and desyncs packages. Keep the working checkout outside synced storage (clean build verified off-OneDrive in `C:\sm_build`).

Verified green off-OneDrive after fixes: `tsc` 0 errors · `vite build` OK · `npm test` exit 0 · server boots + serves (/health, /api/ai-config, SPA) · the six formerly-500 routes degrade honestly.

## Foundation stabilization (before new capability)
- **F1 [P0]** `.gitattributes` EOL normalization (`* text=auto eol=lf`) + one renormalize commit. **Why:** repo is CRLF-dirty (every file shows `M` on whitespace); diffs are unreadable until fixed. **Deliverable:** clean `git status`. **Test:** `git diff --ignore-all-space` empty ⇒ real diff == shown diff. **Stop:** if renormalize touches >0 files' content (not just EOL), halt.
- **F2 [P0]** Green baseline: `npm ci && npm run lint && npm test && npm run build`. **Why:** can't measure regressions without it. **Accept:** 0 failures recorded as the pre-change baseline.

## Next 2 weeks (de-risk architecture; validate assumptions)
- **W1 [P0]** Land the **finding contract** (tier×determinism), inert-by-default. Spec: DERIV-PLAN. **Deliverable:** `confidence.ts` + optional `RevisionIssue` fields + fire/no-fire tests. **Accept:** legacy no-tier weight byte-exact (float-safe); heuristic-critical throws. **Test:** `node --experimental-strip-types tests/passes/confidence.test.ts` + full suite green. **Stop:** any calibration/discrimination regression.
- **W2 [P1]** **Tier-weight corpus sweep** (measure, don't ship). **Accept:** report of composite-gap + AUC under tier weighting. **Replan trigger:** if tiers don't move the §5.2 gap toward 5.0, keep contract, drop the weight change.
- **W3 [P0, GATING]** **Change-impact over IMPORTED scripts** — the precondition for the whole product headline, not a spike. Build typed-dependency extraction for an imported script (today's `twin` graph is over *generation* ops with inferred edges), implement `Impact(v)`, run delete/move-scene on 5 hand-labeled corpus scripts. **Accept:** recovers ≥80% of human-identified downstream breaks. **Replan trigger:** <80% recall ⇒ extraction too thin; fix extraction before any audit UX.
- **U1 [P0, GATING]** **User-validate the wedge.** Put the *already-shipped* doctor/diagnose/what-if in front of ~5 working screenwriters for a week. **Why:** the audit-first pivot rests on one internal white paper (INTAKE-03), zero user evidence. Pure measurement, no new code. **Accept:** ≥3/5 find the audit output worth returning to. **Replan trigger:** if not, reconsider the wedge before M3/B1.

## Next 30 days (smallest coherent upgraded system)
- **M1 [P1]** Ship tier-aware health **iff** W2 passes; re-lock corpus manifest. **Accept:** §5.2 composite min-gap ≥ 5.0, no AUC/discrimination regression.
- **M2 [P1]** **Abstention** as a finding outcome (triggers: unreliable parse, unresolved identity, missing evidence, author-intent-determined, genre-inappropriate). **Test:** fixtures that must abstain do.
- **M3 [P1]** **Import confirmation loop** + AuthorLock, question selection by $V(q)$, top-5 only. **Accept:** locks override inference on a scripted case; no full-bible requirement.
- **M4 [P1]** **Allen-interval temporal proof** (RECOVER-02). **Accept:** catches INTAKE-05 `overdue_hard_promise` + a transitive timeline contradiction fixture; <10ms on the 72-corpus.
- **M5 [P1]** **X(s) clamp** wherever consistency feeds a score. **Test:** clamped X orders broken<middle<great.

## Next 60–90 days (professional beta / external eval)
- **B1 [P2]** **Change-impact as headline UX** surface (page-linked, categories Broken/Weakened/Changed-meaning/Needs-review/Improved).
- **B2 [P2]** **Repair Portfolio**: 3 validated modes (minimal/bold/production-cheap), fail-closed validation order, $U_{\text{risk}}$ ranking. **Accept:** no candidate reintroduces a blocker; 3 distinct or explain-why-fewer.
- **B3 [P2]** **Burrows's Delta** structured voice detector (RECOVER-01). **Metric:** AUC vs labeled voice-pair set.
- **B4 [P2]** Real-literary **"great" calibration band** + must_fire/must_not_fire gate (INTAKE-05 D.5). **Accept:** no hard blocker fires on Ibsen/Chekhov/Wilde fixtures.
- **B5 [P1]** Deployment gate remnants: SSRF allowlist re-verify, `/metrics` auth, uncaught-rejection handler (CANON-RM §6).

## Later (validated-usage dependent)
- Sparse placebo-gated critic conversion (INTAKE-02 A3) — needs matched-budget harness.
- Generate→audit→select behind the door with CVaR selection + homogenization stop rule.
- Graph DB / QD archive **only** if a measured complexity threshold justifies it.
- **REJECT:** LLM-as-judge scoring; autonomous full-script generation as the wedge.

---

## Top 10 tasks in exact execution order
0. **W3 + U1** (gating, pure measurement) — run before committing code to the reframe; either can end the headline.
1. **F1** `.gitattributes` EOL normalize + renormalize commit.
2. **F2** Record green baseline (`lint`/`test`/`build`).
3. **W1** Land inert finding contract (tier×determinism) + fire/no-fire tests.
4. **W3** Change-impact `I(C)` spike on 5 hand-labeled corpus scripts.
5. **W2** Tier-weight corpus sweep; decide ship/hold on measured gap.
6. **M1** Ship tier-aware health iff W2 passes; re-lock manifest.
7. **M2** Abstention finding outcome + fixtures.
8. **M4** Allen-interval temporal proof + fixtures.
9. **M5** X(s) clamp wherever consistency feeds a score.
10. **M3** Import confirmation loop + AuthorLock ($V(q)$ top-5) — **only if U1 shows writers want it; else cut to silent extraction + abstention.**

*(Reordered after adversarial review: U1 + W3 gate everything and run first. Burrows's
Delta (B3), import-confirmation (M3), and the literary band (B4) are demoted to P2/P3
**pending corpus/user measurement** — none ships on a toy reproduction or an unvalidated
wedge. B1 change-impact UX stays at 60–90d, gated on W3.)*

## Decision gates / rerouting triggers
- If tier weighting doesn't close §5.2 (W2): keep the contract as a typed invariant, abandon the weight change — do **not** force it.
- If change-impact recall <80% on labeled breaks (W3): the dependency edges are too sparse → fix extraction before shipping B1.
- If import confirmation adds friction without improving audit accuracy: cut it to silent extraction + abstention.
- Reroute to a graph DB only if instrumentation shows JSON-state extraction eating >~30% of budget on real scripts (INTAKE-02 #6) — until then, JSON stays.

---

## Minimum High-End Plan

Strategic reduction under hard constraints (time, engineering, model cost). This
narrows the full plan above to the smallest system that can prove the central
thesis professionally. It does not add scope — it selects and orders a subset of
the IDs above and states what is explicitly out.

### Central thesis (the one bet)
> A screenwriter changes a scene and cannot see what it breaks. A trustworthy,
> deterministic audit that answers **"what breaks if I change this?"** — and
> abstains when it cannot tell — is worth paying for.

### The 20% of findings driving ~80% of the improvement
1. **Findings you can trust** — the tier × determinism contract + abstention + evidence-bounded confidence. Fixes the §5.2 false-positive flood (the thing that makes the current audit untrustworthy) at the lowest cost. *(W1, W2, M1, M2; INTAKE-05 D.3, CANON-NS.)*
2. **Change-impact over imported scripts** — the one capability nothing else on the market frames well, and the biggest unknown (today's graph is over generation ops). *(W3; INTAKE-03 §14.)*
3. **Correct scoring math** — X(s) clamp + confidence-cannot-exceed-evidence. Cheap; prevents a broken script from outscoring a flawed one. *(M5, W1; §RESEARCH_AND_MATH 2.1/2.6.)*
Everything else in the research is amplification of these three.

### Reduction to one user / problem / workflow
- **User:** a working screenwriter with a mystery or thriller feature draft.
- **Problem:** "I changed my script — what did I break?" (continuity, knowledge legality, setup/payoff downstream breaks are invisible until they fail).
- **Workflow (one loop):** import → deterministic audit (tiered, abstaining findings) → test a change → see what breaks (page-linked) → export.

### Minimum architecture required
`parse → evidence extraction (provenance + confidence) → versioned story ledger →
proof kernel (exists) → tiered findings + abstention → dependency graph built over
the imported script → change-impact I(C)/Impact(v) → page-linked report → export.`
No generation, no agents in the audit loop, no graph DB. The LLM appears **only**
as an extraction proposer and prose-explanation renderer; every gate, traversal,
diff, and score is deterministic. *(Replaces the always-on 12-critic room —
"Always-on 12-critic room → MODIFY" above — with deterministic code in the core
loop.)*

### Five essential upgrades (each maps to a roadmap ID + an evaluation)
- **E1 — Trustworthy findings:** tier × determinism contract, inert-by-default, then shipped iff it closes the gap. → **W1 → W2 → M1**. Eval: §5.2 composite min-gap ≥ 5.0, no AUC(0.622)/discrimination(6/6) regression.
- **E2 — Abstention:** the engine says "insufficient evidence to judge." → **M2**. Eval: must-abstain fixtures abstain.
- **E3 — Correct consistency math:** clamp X(s) to [0,1]; a finding's confidence cannot exceed its evidence. → **M5** (+ the clamp built into W1's contract). Eval: clamped X orders broken < middle < great.
- **E4 — Change-impact over imported scripts:** typed-dependency extraction + `Impact(v)` on a real script. → **W3**. Eval: ≥ 80% recall of hand-labeled downstream breaks.
- **E5 — The trust surface:** page-linked, evidence-bearing audit + change-impact report + export; zero LLM agents in the loop. → **B1-min** (reduced subset of B1). Eval: renders on a real imported script; Gate G3.

### Five explicit non-goals (deferred, not rejected — no hidden dependency on any)
- **N1** No autonomous generation or repair portfolio in the minimum. *(defers B2, all "behind the door" generation/CVaR/homogenization.)*
- **N2** No multi-agent writers' room in the audit loop. *(defers sparse-critic conversion; the loop is deterministic.)*
- **N3** No graph DB / MAP-Elites / RL. *(already DEFER above; JSON state stays.)*
- **N4** No Burrows's Delta, no Allen-interval temporal proof, no real-literary calibration band in the minimum. *(defers B3, M4, B4 — valuable, but not required to prove the thesis. Verified: E4 change-impact does not depend on Allen temporal.)*
- **N5** No import-confirmation interrogation UX. Start with silent extraction + abstention; add confirmation only if U1 shows writers want it. *(defers M3. Verified: E2/E4 depend on extraction output, not on the confirmation UX.)*

### Dependency-ordered 30-day plan (minimum subset only)
| Days | Task(s) | Depends on | Requirement |
|---|---|---|---|
| 1–2 | **F1** EOL normalize · **F2** green baseline | — | prerequisite for measurable change |
| 1–7 (parallel, no code) | **U1** user-test the wedge on the shipped doctor/what-if | — | validates the thesis (GATE) |
| 1–5 (parallel) | **W3-probe** — can extraction hit ≥80% recall on ≥1 labeled script? | F2 | de-risks E4 before full build (GATE) |
| 3–8 | **W1** finding contract (tier×determinism, inert) + fire/no-fire tests | F1, F2 | E1, E3 |
| 8–10 | **W2** tier-weight corpus sweep → ship/hold decision | W1 | E1 |
| 10–12 | **M1** ship tier-aware health iff W2 passes; re-lock manifest · **M5** X(s) clamp | W2 | E1, E3 |
| 8–12 (parallel) | **M2** abstention outcome + fixtures | W1 | E2 |
| 12–24 | **W3** change-impact: imported-script typed-dependency extraction + `Impact(v)` + 80%-recall test | F2, W3-probe | E4 |
| 24–30 | **B1-min** page-linked change-impact report + export; verify zero agents in loop | W3, M1 | E5 |

### Objective release gates
- **G1 — THESIS (end of week 1, before major build):** U1 ≥ 3/5 screenwriters find the audit worth returning to **AND** W3-probe shows ≥ 80% recall achievable on ≥ 1 labeled script. Fail either ⇒ **stop and replan; do not build E4/E5.**
- **G2 — TRUST (~day 12):** tier ship closes §5.2 composite min-gap to ≥ 5.0 with **no** regression in AUC (≥ 0.622) or discrimination (6/6); must-abstain fixtures abstain; clamped X orders broken < middle < great. Fail ⇒ keep the contract as a typed invariant, drop the weight change (per Decision Gates above).
- **G3 — PRODUCT (day 30):** change-impact runs on a real imported mystery/thriller script; ≥ 80% recall of hand-labeled downstream breaks; report is page-linked and evidence-bearing; **the audit + change-impact path invokes zero LLM agents** (LLM only proposes extraction + renders prose); `npm test` + `npm run lint` + `npm run build` all green.

*Traceability: every retained requirement E1–E5 maps to a task above and vice
versa; every non-goal N1–N5 corresponds to a DEFER/REJECT already in this file;
no deferred item (M3, M4, B2, B3, B4, generation, graph DB) is a dependency of any
retained task.*
