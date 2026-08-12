# StoryMachine — The Build Plan
### v1.0 · August 7, 2026 · Synthesis of five workstream specifications + red-team corrections

**What this is:** the execution-ready build plan for StoryMachine, the consumer story engine — *"Play a story that remembers, then own the script of what you lived."* It was produced by five parallel specialist workstreams on the strongest available model tier, then reconciled and corrected against the red team's findings. Where workstreams disagreed (cost, KPIs, Phase 0's purpose), this document is the ruling.

**Document map** — the appendices are the full specs; this document is the spine:

| File | Contents | Words |
|---|---|---|
| `workstreams/01_engine_kernel.md` | 7-package headless engine: full Zod data model, 30-op causal effect union, commit transaction + 10 invariants, epistemic engine, ending readiness, 5-stage compiler, 15-rule deterministic doctor, test plan | ~7,800 |
| `workstreams/02_ai_pipeline.md` | 7-hop beat loop with schemas, Scene Packet v1 with token budgets, three verbatim production system prompts, slop stack, verified Aug-2026 pricing + cost worksheet, latency budgets, dataset capture schema, NCB-1 benchmark spec | ~6,600 |
| `workstreams/03_product_ux.md` | Screen-by-screen consumer UX, "The Threshold" C-tier pattern, Story Lens, finale/share flow, verified competitor pricing, monetization, T&S UX, 22-event analytics schema, alpha world **WHOEVER YOU ARE** + 2 backups | ~5,200 |
| `workstreams/04_infra_delivery.md` | Stack pins (all calls made), full Drizzle DDL sketch, AI gateway ops, moderation pipeline, CI/CD, 13 epics / ~49 tickets across Phases 2–3, effort map, budget, existing-repo audit appendix | ~5,500 |
| `workstreams/05_red_team.md` | 14 kill-risks with named kill criteria, verified competitive/regulatory analysis (~40 sources), acquirer diligence checklist, the three hardest questions, 16-claim assumption audit | ~6,200 |

---

## 1. What We Are Building (positioning, corrected)

A consumer interactive-drama product on a deterministic story engine. The player enters a bounded story (30–60 min at alpha), acts in free text, and the engine maintains ground-truth story state — facts, beliefs, secrets, lies, relationships, setups/payoffs, audience knowledge — that generation is *forced* to respect. Irreversible acts interrupt and ask. Stories end. The lived path compiles into an authored artifact.

**The corrected competitive claim** (the red team falsified the original; use only this version): it is *not* true that no product has structure or endings — Character.AI shipped Stories (Nov 2025), Hidden Door runs structured licensed worlds, Sekai ships interactive mini-apps at 200k/day. What remains true, and is the pitch: **no incumbent's core loop has enforced state, epistemics, or payoff guarantees — and their business models punish them for building it.** Session-minute businesses implement endings as a mode; StoryMachine's endings are the physics. The compile is a *quality* gap, not a capability monopoly — transcript-to-screenplay is fakeable at 80% on stage; state-faithful artifact quality is provable only in side-by-sides, so we prove it in side-by-sides.

**The four exit assets** (revised weights per red team): the engine + demo (primary), the traction curve (primary), the consent-clean state-conditioned choice dataset (**multiplier, not pillar** — no comparable transaction exists; its floor value is internal fine-tuning to cut COGS), and the published coherence benchmark (credibility asset with a citation-clock test, not an assumed moat).

## 2. Decision Record

Settled by the verdict + audits (unchanged): TypeScript monorepo; no Rust/WASM, no CRDT, no belief tensors, no speculative prefetch; Fountain/plain-text canonical with derived projections; discrete legible epistemics; A/B/C confirmation tiers; optimistic streaming; exemplar steering licensing-clean; receipts on every call; append-only history; drift stamping.

Newly settled by the workstreams (this document ratifies):

- **Stack:** pnpm + Turborepo, Node 22, React+Vite PWA (no Next.js) with Fastify server-rendered share pages + satori OG images; SSE (not WebSockets); Postgres + Drizzle + pgvector; Redis + BullMQ from day one; Clerk auth behind an adapter; Railway + Cloudflare + R2; Grafana Cloud + Sentry. (§04)
- **Model routing:** Haiku-class for intent parse / post-gate / summaries; Sonnet-class for beats; Opus-class reserved for ~5 C-tier/ending beats per story; GPT-class failover; mock provider for dev; open-weight fallback validated from Phase 2 (also the KR-11 escape hatch). Verified Aug-2026 pricing in §02. (§02)
- **Tier mechanics correction (KR-8/claim 13):** A-tier one-tap revert gets an **expiring revert window** — revert is only offered until N (default 3) downstream beats reference the fact; after that, revert routes through a visible reconciliation. C-tier commits are never silently revertible; fork is the escape hatch. This closes the retroactive-contradiction hole in the flagship truth mechanic. (§01 amended)
- **Latency:** input→first visible token ≤2.5s p50 / ≤4.5s p95; the post-gate hides inside the paced-reveal buffer; ONE bounded regenerate, hard violations only (leak/contradiction, never style), streamed, with a diegetic beat covering dead air. Kill line: p95 >5s or regen >15% sustained (DEAD-AIR CAP). (§02, §05)
- **Alpha posture:** 18+ only with real age assurance; US-only at alpha (EU AI Act Art. 50 duties are live as of Aug 2, 2026 — geo-fence rather than absorb); comply **as if** state companion-chatbot laws apply (disclosure cadence, crisis detection + referral, logs), holding the video-game exemption as defense, not plan; no romance/NSFW at alpha, accepting the demand cost. (§03, §05)
- **Dataset schema (CLEAN-CORPUS GATE, non-retrofittable):** dual-layer from day one. The export/resale layer contains **human choices, edits, confirmations, rejections, and state deltas only** — provider-generated text excluded or reduced to content hashes; receipts extended to record provider ToS version per call; unbundled opt-in consent with training-use, third-party-licensing, and successor/assignment language; deletion propagation to exports; 18+-only pool. No dataset conversation with any buyer until an outside-counsel memo clears the export layer. (§05 §3.3)
- **Alpha world:** **WHOEVER YOU ARE** — a rehearsal-dinner romantic thriller (player Rowan; fiancé Jules is in witness protection; the "brother" Daniel is a handler; one secret, one lie, one say-the-name irreversible, 3 endings + 1 hidden). Backups: DEAD AIR (radio noir), THE UNDERSTUDY (backstage). (§03)
- **Name:** working title StoryMachine; consumer candidates led by *Unwritten* — trademark search required before any external use. (§03)

## 3. Architecture at a Glance

Seven pure/impure-separated packages — `schemas`, `receipts`, `epistemic`, `doctor` (pure) and `state`, `proposals`, `compiler` (IO via adapters) — composed by `createStoryEngine()`. The beat loop: player input → intent parse (cheap model; advisory tier prediction) → **deterministic kernel normalization and authoritative tier routing** (the model never decides tiers; a total function over the 30-op effect union does) → C-tier stages "The Threshold" pre-generation → scene packet (≤6,300 tokens, per-speaker allowed/forbidden knowledge compartments, hidden objectives, 1–3 quarantined exemplars) → streamed beat → two-stage post-gate → display → history append. Commit order and ten named invariants (INV-1 dead-actor … INV-10 single staged interrupt) are fixed in §01. The compiler freezes and reconciles state, builds deterministic scene-memory units, renders Fountain via a state-constrained LLM pass that preserves player-kept lines verbatim, then must pass the 15-rule deterministic doctor before an artifact (with reconciliation stamp + continuity report) exists. Everything carries receipts.

## 4. The Alpha Product

The play surface is a mobile-web beat stream with Say/Do/Choose/Refuse/**Lie** quick-verbs. A/B state changes ride a subtle ticker (expiring revert). C-tier moments take over the screen — blur, hold-to-commit ring, the reserved signature line *"This can't be undone."* — a consent chokepoint that is simultaneously the safety pattern. The Story Lens (one swipe) shows the people constellation, wax-sealed secrets (teasing the unfound without spoiling), and open threads. The finale runs title card → run stats ("declined at the threshold: 1") → diegetic compile with reconciliation seal → watermarked, spoiler-shielded share page.

**Share-artifact correction (KR-7):** the screenplay artifact is the acquirer-facing proof; it is probably not the growth loop. The compiler therefore ships a **second, feed-native projection from the same state**: a 30–60s "trailer of your run" (title, three beats, your fatal choice, your ending's name) for vertical feeds. Both formats get A/B-tested against the SHARE FLOOR (below).

**Monetization** (verified comps: c.ai+ $9.99/mo, Talkie+ $9.99/mo, AI Dungeon credit tiers): free tier 2 runs/month; Plus $9.99/month; top-ups non-expiring; truth and drama never paywalled. **Included-runs formula, replacing all fixed promises:** `included_runs = floor(0.4 × price / measured_median_story_cost)`, computed at Phase-2 exit and re-computed monthly. At the $1.00 median target that's 4 runs; at the unoptimized ~$2.45–2.95 it's 1–2, which is not a product — which is why the MARGIN LINE gate exists before launch, not after.

## 5. Economics (reconciled)

Verified-pricing arithmetic (§02, cross-checked §04, §05): **$0.029–0.036 per typical beat; a completed 80–120-beat story lands at $1.60–$2.95 expected, $6.19 worst-case, ~$1.76 floor** at list prices with naive routing. Levers, in order: quiet-beat downshift to Haiku-class (→ ~$2.45), prompt-cache prefix discipline (→ ~$0.028/beat cached), shorter alpha format (80 beats), and — the structural fix — fine-tuning an open-weight dramatizer on the accumulating preference data (the Latitude/Wayfarer precedent proves the path). **The binding gate is the red team's MARGIN LINE: median completed story ≤ $1.00 after one routing-optimization pass, else pricing/model pivots before any growth spend.** The master plan's old phrase "a small fraction of subscription price" is retired as currently false; the honest statement is: the routing architecture exists to *make* it true, and the gate checks whether it did. Alpha budget: ~$900–3,000/mo model spend (expected ~$1,700 at 500 users) + $80–190 infra.

## 6. Delivery Plan

**Phase 0 — Experience spec + stranger test (1–2 weeks, ~$0).** Relabeled per the red team: the founder-plays-with-LLM session is *spec-writing and demo-scripting* — valuable, biased, not falsification. The falsification instrument is **5–10 strangers** playing a Wizard-of-Oz build of WHOEVER YOU ARE (human-in-the-loop runtime, scripted state), recruited from drama/fiction communities, measuring blind fun scores, completion, and unprompted replay requests. Output: experience spec (beat grammar, confirmation cadence, Lens content, compile format) + first FUN FLOOR reading.

**Phase 1 — Existing-repo forensics (2 days, timeboxed).** The §04 appendix checklist: doctor.ts → doctor package candidate; fountain pipeline → compiler; intent-parser → pipeline seed; critic prompts/taxonomies → always salvage; ScriptIDE frozen for the second act. Hard go/no-go per component; ties go to rewrite.

**Phase 2 — Headless engine slice (8–13 eng-weeks with agents).** Six epics, 23 tickets (P2-INF/KER/GW/PIPE/CMP/EVAL in §04). Highest-risk ticket: the scene-packet builder. **Exit gate:** the scripted 5-scene story runs end-to-end — zero contradictions, zero leaks, valid reconciled compile, byte-reproducible under mock providers, measured cost within budget — and the harness runs the **private null-arm test at alpha length** (NULL GATE input) before anything is published.

**Phase 3 — Consumer alpha (8–13.5 eng-weeks, overlappable).** Seven epics, ~26 tickets: streaming API → player → Threshold/Lens/finale → share pages + trailer projection → moderation pipeline (tier-0 regex + fast gate, async classifier, human review queue, 24h SLA) → waitlist-gated launch **capped at what one person can moderate** (hundreds). KPIs: activation ≥80%/≤90s; first-story completion ≥35%; artifact share ≥15%; D1/D7 30/15%; cost p50 per the MARGIN LINE.

**Phase 4 — Benchmark + flywheel (after alpha stabilizes).** NCB-1 published only under the conditions where the effect is real: long multi-session runs, 8+ entities, concurrent secrets, delayed payoffs — with the harness open-sourced, an academic co-author recruited, and conditions where the engine *loses* reported (that honesty is the credibility). Dataset compounds under the clean-corpus schema; creator tools open when moderation capacity allows.

**Critical path:** scaffold → kernel → gateway → packet builder → beat pipeline → compiler → harness gate → streaming API → player → share → launch. **Program total: 16–26.5 eng-weeks** for 1–2 people + coding agents, gates permitting.

## 7. Consolidated Gates & Kill Criteria

| Gate | Threshold | Consequence |
|---|---|---|
| **FUN FLOOR** (KR-1) | After 2 alpha iteration cycles: first-story completion <25% or D7 <10% | Stop consumer; engine survives as middleware/pro-tool |
| **NULL GATE** (KR-2) | At alpha length: <2× contradiction+leak advantage AND blind preference ≤55/45 | Don't build consumer claims on "coherence"; reposition to long-arc infrastructure within 30 days |
| **BANDWIDTH BREAKER** (KR-3) | Phase-2 exit not hit in 12 weeks, or T&S >30% of founder hours for a month | Halt growth; hire/contract ops or shrink alpha |
| **MARGIN LINE** (KR-4) | Median story >$1.00 after routing pass, or >$25/mo needed for 60% gross margin | Freeze features until routing/fine-tune closes it; else B2B pivot |
| **BRIGHT LINE** (KR-5) | Any confirmed minor incident or crisis-protocol failure; minor leakage ≥2% | Immediate public-access freeze; external review |
| **PARITY TRIGGER** (KR-6) | Incumbent ships state-tracked endings + artifact at blind parity | Collapse roadmap to dataset+benchmark; open acquisition talks |
| **SHARE FLOOR** (KR-7) | After 2 artifact formats: share <5% of completions or <0.05 activations/completion | Demote compile to finale feature; find the real growth loop |
| **WEIGHT TEST** (KR-8) | >15% quit within 2 beats of a C-interrupt, or median decision >20s with negative sentiment | Rework staging → diegetic choices → invisible confirm as last resort |
| **CLEAN-CORPUS GATE** (KR-12) | No outside-counsel memo clearing the export layer | No dataset conversations, period |
| **DEAD-AIR CAP** (KR-10) | p95 first-token >5s or regen >15% for a week | Cut gate scope / change models before growth spend |
| **REFUSAL CEILING** (KR-11) | Provider refusals/regressions >5% of beats, 2 weeks, no fix | Promote open-weight fallback to primary |
| **COMPLIANCE GATE** (KR-14) | Jurisdiction checklist unpassed | Geo-restrict rather than absorb |
| **CITATION CLOCK** (KR-13) | 2 quarters post-benchmark: no third-party runs/citations | Stop external investment; harness stays internal QA |
| **COMPARABLE TEST** (KR-9) | 3 serious lab/vendor talks, no term-sheet-shaped interest | Strike dataset as standalone exit asset from all materials |

## 8. The [NOW] List (execute this month — these are records that must accumulate)

Entity formation + founder-repo IP assignment to the entity · ToS/Privacy Policy with training use, third-party licensing, successor/assignment clauses · unbundled dataset-contribution consent UX · deletion-propagation schema · age-assurance mechanism + 18+ records · DMCA agent registration + creator terms + takedown workflow · artifact ownership/license terms · commissioned-exemplar contracts + provenance files per exemplar · written content policy + (empty but existing) incident log · crisis-detection protocol + trigger logging · companion-law classification memo for launch states · contractor IP assignments · receipts extended to record provider ToS versions. Rationale throughout §05: the acquirer's diligence test is *"show us the logs"* — every item here is a log that cannot be conjured in 2027.

## 9. Inputs Needed From You

1. **Connect the StoryMachine repo folder** (desktop app → Add folder) — unlocks Phase 1 forensics.
2. **API keys** (Anthropic; optionally OpenAI for failover) when Phase 2 starts — everything before that runs on the mock provider.
3. **Sign-offs:** the alpha world (WHOEVER YOU ARE vs. backups), the 18+/US-only/no-NSFW alpha posture, and the consumer name shortlist for trademark search.
4. **Counsel:** one session with a startup lawyer to execute the [NOW] list — the only part of this plan I can draft but not do.

*Strategy and engineering in this plan are ready to execute; the legal items are drafted directions, not legal advice.*
