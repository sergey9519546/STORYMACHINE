# Truth Registry — Derived from Clean Response Blocks

This registry separates: (a) standard technical facts that survive external/disciplinary sanity checks, (b) source-specific OWNE design data that is true because it appears in the extracted responses, and (c) claims explicitly rejected as false, unsupported, or misapplied. It does not add reconstructed story lists or invented architecture.

## 1. Response Corpus Used

| ID | Title | Line range | Registry use |
|---|---|---:|---|
| R1 | Technical Review: StoryMachine Engine Architecture | 67–128 | Initial technical critique and rejection list |
| R2 | StoryMachine Engine Architecture (Revised) | 142–1021 | Corrected StoryMachine control loop |
| R3 | StoryMachine Engine — Maximum-Functionality Architecture | 1039–5382 | Formula-heavy maximum-functionality spec |
| R4 | Open-World Narrative Engine (OWNE) | 5404–10456 | OWNE mathematical/algorithmic architecture |
| R5 | OWNE: Open-World Narrative Engine | 10469–15453 | OWNE mathematical/algorithmic architecture |
| R6 | OWNE Specification — Audit Report & Corrected Core | 15470–18289 | Audit corrections and formula fixes |
| R7 | Premortem → Best Formulas / OWNE Mathematical Core | 18302–23795 | Premortem-selected formulas and failure modes |
| R8 | Full Audit: Hallucinations, Overclaims, and Missed Surface Area | 23808–24689 | Hallucination/overclaim audit and miss list |
| R9 | OWNE v1.1 Specification | 24702–29721 | Post-audit OWNE v1.1 normative spec |
| R10 | OWNE Narrative Content Atlas | 29734–31064 | Narrative content atlas and story possibility axes |
| R11 | Deliverables: micro_mysteries_v1.yaml + Tavern Letter fixture | 31093–33029 | Machine-readable micro-mystery library + Tavern fixture |

## 2. Verified Technical Core

| Claim / Mechanism | Status | Correct scope from responses | Primary response blocks |
|---|---|---|---|
| Hidden Markov Models with A, B, π; forward and Viterbi algorithms | Keep as true technical machinery | Use for latent plot/beat proposal and inference; not a truth source | R1, R2, R3, R8 |
| CSP / ASP / STRIPS-style preconditions and effects | Keep as true technical machinery | Use for hard legality, state constraints, and rejection/unsat explanations | R1, R2, R3, R4, R8, R9 |
| Event Calculus / fluent-style reasoning | Keep when time/event reasoning is needed | Use for events, fluents, inertia, delayed effects, and temporal facts; simpler fluent maps are acceptable for MVP | R1, R2, R3, R4, R8 |
| Shannon entropy | Keep | Use for uncertainty over a defined discrete distribution, not as a vague quality metric | R1, R2, R3, R8 |
| Surprisal / self-information | Keep | Use `-ln P(e|Σ)` or `-log₂ P(e|Σ)` to measure unexpected legal events | R2, R3, R7, R8, R9 |
| Jensen-Shannon divergence | Keep only for distribution-vs-distribution comparisons | Do not use it against a single realized point outcome as the primary twist metric | R1, R3, R8 |
| Information Bottleneck | Keep carefully | Use as motivation for salience/content selection; in implementation use a pinned knapsack surrogate unless exact IB is explicitly implemented | R1, R2, R3, R8, R9 |
| Softmax temperature | Keep | Use to sample among already legal/admissible candidates only | R2, R3, R7, R8, R9 |
| Promise ledger | Keep as engine design data | Track setup/payoff obligations, deadlines, hard/soft promises, and payoff pressure | R2, R3, R7, R9, R11 |
| Epistemic belief state / mystery belief distribution | Keep as engine design data | Use X, x*, μ, likelihood hints/tables, and clue reachability for fair mystery logic | R4, R5, R7, R9, R11 |
| Knapsack salience | Keep as implementation surrogate | Select licensed facts under budget with hard pins before realization | R3, R7, R8, R9, R11 |
| Assertion containment | Keep as anti-hallucination rule | Rendered output must assert only licensed selected facts or common ground | R7, R8, R9, R11 |

## 3. Clean Formula Spine

| Role | Formula / Expression | Truth status | Notes | Source blocks |
|---|---|---|---|---|
| Legal event set | `E(W) = { e : Enabled(e,W) ∧ Apply(W,e) ⊨ I }` | Keep | Hard legality filter over current world state and invariants | R3, R4, R7, R9 |
| Candidate support | `C = Ground(TopK(P(o|H)), W) ∩ E(W)` | Keep | Score only grounded legal candidates | R7, R8, R9 |
| HMM transition | `A_ij = P(q_{t+1}=j | q_t=i)` | Keep | Latent beat transition | R2, R3 |
| HMM emission | `B_j(k) = P(o_t=k | q_t=j)` | Keep | Event-class emission from latent beat state | R2, R3 |
| HMM initial distribution | `π_i = P(q_1=i)` | Keep | Initial latent state distribution | R2, R3 |
| Entropy | `H(P) = -Σ_i p_i log(p_i)` | Keep | Use one log base consistently: nats for natural log, bits for log₂ | R2, R3, R8, R9 |
| Surprisal | `S(e) = -ln P(e|Σ)` | Keep | Unexpectedness of realized legal event; log₂ variant is valid if using bits | R3, R7, R8, R9 |
| Mystery belief surprise | `Surprise(e) = 1/2 || μ_e - μ ||_1` | Keep as operational design formula | Total-variation belief movement over hypothesis distribution | R7, R9, R11 |
| Utility | `u(e) = wᵀ z̃(e) - w_pace L_pace(e)` | Keep as scoring pattern | Weights/features are design/calibration parameters | R7, R9 |
| Softmax choice | `P_T(e) = exp(u(e)/T) / Σ_{e′∈C} exp(u(e′)/T)` | Keep | Only over candidate set C; illegal events excluded before sampling | R3, R7, R9 |
| Admissibility | `Admissible(e) = e ∈ E(W) ∧ ¬hard_miss(e)` | Keep | Adds hard promise/deadline filtering to event legality | R7, R9 |
| Salience knapsack | `Z = argmax rᵀz` subject to `cost(z) ≤ B` and `hard_pins ⊆ z` | Keep as surrogate | Implementation-friendly content selection under budget | R3, R7, R9 |
| Rendering honesty | `Asserted(output) ⊆ Z ∪ CommonGround` | Keep | Core anti-hallucination rule for generated text/scenes | R7, R8, R9, R11 |
| Integrity rate | `IR = (1/T) Σ_t 1[e_t ∈ E(W_{t-1}) ∧ W_t ⊨ I]` | Keep as metric | Must be 1.0 for offline/golden traces | R9, R11 |

## 4. Explicit Rejections / False or Misapplied Claims

| Claim | Status | Why rejected in responses | Replacement / safer use | Source blocks |
|---|---|---|---|---|
| BK / BKR inequality as runtime narrative coherence filter | Reject | It is a probability theorem/bound on disjoint occurrence in product spaces, not a generative or runtime story-control mechanism | Use causal/dependency graphs, planner constraints, or explicit subplot dependency modeling | R1, R2, R8, R9 |
| CFTP as story sampler / narrative arc generator | Reject | CFTP samples exact stationary states under strong Markov-chain assumptions; sequential story arcs require trajectory generation and the target distribution is not specified | Use beam search, SMC, MCTS, or constrained HMM sampling | R1, R2, R8, R9 |
| Shannon–Hartley as reader-brain bandwidth | Reject | Requires physical bandwidth and signal-to-noise assumptions not defined for narrative comprehension | Use entropy/surprisal, empirical UX metrics, or content budget heuristics | R1, R2, R8, R9 |
| JSD(P || point outcome) as twist metric | Reject | JSD/KL are distribution-comparison tools; a point/Dirac comparison is not the right primary twist metric | Use surprisal or belief-distribution movement | R1, R3, R8, R9 |
| Future/fabricated citations from original report | Reject | Original report included impossible/future-dated or placeholder citations such as [15]–[17] and alleged 2026 references | Remove; cite real standard references only | R1, R8 |
| Exact IB solver claim for v1.1 | Reject/limit | Post-audit spec states IB is motivation; implementation is knapsack with pins | Call it IB-motivated salience, not exact IB | R8, R9, R11 |
| Fine et al. HHMM / EFM paper identity as hard source claim | Reject/limit | Post-audit spec explicitly says not claimed | Use honest names: level-conditioned latent stack; EFM-inspired belief jump | R9 |
| Production-grade open-world product completeness | Reject/limit | Audit says core loop is not the full game stack and many product systems are missing | Scope v1.1 as narrative decision + faithful realization core | R8, R9 |

## 5. Source-Specific OWNE Design Data

The following is not universal technical truth; it is source design data extracted from the responses. It is true that these items are present in the response corpus and should be preserved if rebuilding the OWNE spec.

### 5.1 OWNE v1.1 design laws

- Illegal actions never enter the choice distribution.
- Use natural log in `exp(·)` scoring; bits only for telemetry.
- Use honest names: level-conditioned latent stack; EFM-inspired belief jump; IB-motivated knapsack.
- Quest deadlines are search/commit rules, not world physics invariants.
- Every formula must have I/O: generative, filter, or score.
- Recovery depth is bounded and unsat cores surface to tools.
- Faithfulness requires asserted text atoms to be a subset of licensed facts plus common ground.

### 5.2 OWNE v1.1 in-scope modules

- L1 Integrity: schema actions, invariants, incremental legal set
- L2 Proposer: level-conditioned latents, feasibility-aware TopK, ground∩legal
- L3 Pacing: surprisal, belief-jump, temperature control, calibrated utility
- Ledger: promises with dependency edges and hard/soft split
- Commit: atomic apply and admissibility
- L4 Salience: hard-pinned knapsack and rhetorical order pass
- Realizer: templates and/or masked LM
- Tooling hooks: unsat core dump, score breakdown, CI metrics

### 5.3 M01–M48 names from `micro_mysteries_v1.yaml`

| ID | Exact source name | Source line |
|---|---|---:|
| M01 | `Closed_Circle_Whodunit` | 31307 |
| M02 | `Locked_Room` | 31335 |
| M03 | `Missing_Person` | 31362 |
| M04 | `Theft_MacGuffin` | 31380 |
| M05 | `Poison_Medical` | 31397 |
| M06 | `Forgery_Fraud` | 31413 |
| M07 | `Blackmail` | 31428 |
| M08 | `Spy_Mole` | 31444 |
| M09 | `Cold_Case` | 31459 |
| M10 | `Serial_Pattern` | 31474 |
| M11 | `Party_Betrayal` | 31490 |
| M12 | `Secret_Romance` | 31504 |
| M13 | `Inheritance_Web` | 31518 |
| M14 | `False_Friend` | 31532 |
| M15 | `Rumor_Mill` | 31546 |
| M16 | `Oath_Taboo_Broken` | 31557 |
| M17 | `What_Is_This_Place` | 31570 |
| M18 | `Map_Incomplete` | 31583 |
| M19 | `Artifact_Purpose` | 31596 |
| M20 | `Ecology_Anomaly` | 31609 |
| M21 | `Cover_Up` | 31620 |
| M22 | `Identity_Mystery` | 31636 |
| M23 | `Timeline_Loop_Index` | 31649 |
| M24 | `Simulation_Or_Show` | 31661 |
| M25 | `Prophecy_Logic` | 31674 |
| M26 | `Security_Puzzle_Heist` | 31687 |
| M27 | `Who_Talked` | 31701 |
| M28 | `Inside_Vs_Outside_Job` | 31713 |
| M29 | `Horror_Rules` | 31726 |
| M30 | `Monster_Drive` | 31740 |
| M31 | `Haunting_Anchor` | 31751 |
| M32 | `Infection_Index` | 31764 |
| M33 | `Ship_Sabotage` | 31778 |
| M34 | `AI_Objective` | 31792 |
| M35 | `First_Contact_Intent` | 31803 |
| M36 | `Time_Crime` | 31814 |
| M37 | `Assassination_Plot` | 31826 |
| M38 | `False_Flag` | 31841 |
| M39 | `Treaty_Sabotage` | 31852 |
| M40 | `Supply_Traitor` | 31863 |
| M41 | `Bakeoff_Sabotage` | 31874 |
| M42 | `Lost_Pet` | 31888 |
| M43 | `Anonymous_Gift` | 31899 |
| M44 | `Election_Dirty_Trick` | 31910 |
| M45 | `Who_Ate_Leftovers` | 31921 |
| M46 | `Unreliable_Tutorial` | 31933 |
| M47 | `Dream_Vs_Real` | 31944 |
| M48 | `Edited_Log` | 31957 |

### 5.4 Tavern Letter fixture source facts

- Fixture name: Tavern Letter.
- Frame: whodunit + secret content.
- Cast: Alice, Bob, Barmaid, Stranger.
- Hypothesis space includes who wrote the letter × secret type.
- True solution: Bob wrote it; secret is debt to gang.
- True clues: ink stains Bob; barmaid saw Bob hide letter; ledger fragment.
- Red herrings: Stranger flees because of unrelated warrant; Alice jealousy rumor.
- Promises: letter must be read; gang deadline is soft; confront Bob.
- Golden path target: after ink + barmaid + ledger, μ(Bob, gang_debt) is unique argmax.
- Negative tests include early accusation gate, teleport prevention, double possession prevention, and herring non-softlock.

## 6. Minimum Clean Output Standard Going Forward

- Keep extracted response text separate from new synthesis.
- Never reconstruct M01–M48 names or story taxonomies unless explicitly marked as added design work.
- Use “verified technical fact” only for standard formulas/mechanisms or externally checked claims.
- Use “source design data” for OWNE-specific templates, names, fixture content, file trees, and implementation scopes.
- Use “rejected/unsupported” for BK runtime filtering, CFTP story sampling, Shannon–Hartley reader bandwidth, JSD-to-point twist metrics, fabricated citations, exact IB overclaims, and production-completeness overclaims.
- All future spec updates should compare against this registry before merging.