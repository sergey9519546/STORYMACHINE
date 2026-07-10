(2) the Tavern Letter fixture fully filled as OWNE JSON (fluents, schemas,
X
X,
L
L, golden e sequence). Say which to generate first.

---

# RESPONSE 11

DELIVERABLE 1
content/libraries/micro_mysteries_v1.yaml
Ultrathink notes (before the file):

Every mystery is a template, not a full world: x_star is a slot resolved at instance time.
event_classes map to L2 emissions; grounding still requires schemas in the game pack.
likelihood_hints are authoring guidance for
L
(
ε
∣
x
)
L(ε∣x), not learned models.
promises use stable template_ids from the Π library (second document in this deliverable).
fairness.min_true_clues_before_solve compiles to hard gates / deps on accuse.
Combinators are data, not code — instance generator composes them.
IDs are stable for CI and localization keys.
# OWNE Content Library v1.1
# micro_mysteries_v1.yaml
# Role: authoring templates → compile to (X, μ0, Π, q packs, clue budgets, L hints)
schema_version: "1.1.0"
namespace: owne.content.mysteries
engine_compat: "OWNE-v1.1"
nonclaims:
  - "Templates are not full simulations"
  - "L_hints guide likelihood tables; they are not calibrated human models"
  - "x_star is bound per instance, not universal truth"
meta:
  mystery_count: 48
  frames: &frames
    - whodunit
    - what_happened
    - where
    - when
    - why_motive
    - how_method
    - which_object
    - who_knows
    - compound
    - existential
  tones: [cozy, noir, thriller, horror, political, heist, scifi, fantasy, comic, melodrama]
  combinators:
    - id: stack
      meaning: "Payoff of A opens B"
    - id: nest
      meaning: "Outer solve requires inner solve"
    - id: parallel
      meaning: "Two X in same cast/time"
    - id: mirror
      meaning: "Two cases share method signature"
    - id: invert
      meaning: "Victim or client is culprit"
    - id: transfer
      meaning: "Legal blame moves (frame)"
    - id: cascade
      meaning: "Wrong solve causes crime_2"
    - id: soft_merge
      meaning: "Two hooks, one culprit"
    - id: hard_split
      meaning: "Herring is second independent crime"
defaults:
  fairness:
    min_true_clues_before_solve: 2
    max_active_red_herrings: 3
    require_reachability_check: true
  pacing:
    curve_id: mystery_stair
    tau_sur_mid: 0.55
    tau_sur_climax: 0.9
    tau_u_investigate: null  # filled from ln|C| at runtime
  meso_chain: &default_meso
    - Myst_Hook
    - Myst_Investigate
    - Myst_Midtwist
    - Myst_Deep
    - Myst_Accusation
    - Myst_Resolve
    - Myst_Aftermath
  discourse_classes_common: &disc_common
    - Hook_Discover
    - Interview
    - Search_Area
    - Examine_Item
    - Compare_Notes
    - Find_Contradiction
    - Reveal_Mid
    - Bargain_Info
    - Wrong_Accuse
    - Correct_Accuse
    - Confess
    - Aftermath_Social
    - Cold_Trail
    - Red_Herring_Payoff
# ---------------------------------------------------------------------------
# PROMISE TEMPLATES (Π library)
# ---------------------------------------------------------------------------
promise_templates:
  - template_id: PT_ChekhovGun
    setup_class: Show_Object
    payoff_pred: "UsedIn(climax_or_solve, object)"
    default_hard: false
    priority: 2.0
  - template_id: PT_ChekhovSkill
    setup_class: Train_Or_Mention_Skill
    payoff_pred: "SkillUsed(agent, skill, payoff_window)"
    default_hard: false
    priority: 1.5
  - template_id: PT_MinClueGate
    setup_class: Mystery_Opened
    payoff_pred: "TrueClueCount(M) >= N"
    default_hard: true
    priority: 5.0
    params: { N: 2 }
  - template_id: PT_LetterMustBeRead
    setup_class: Letter_Exists
    payoff_pred: "Knows(detective, LetterContent)"
    default_hard: true
    priority: 4.0
  - template_id: PT_ConfrontWithProof
    setup_class: Suspect_Identified
    payoff_pred: "Confront(suspect) AND ProofSetSatisfied"
    default_hard: true
    priority: 4.5
  - template_id: PT_DeadlineClock
    setup_class: Clock_Started
    payoff_pred: "Resolved(M) OR CrisisFired"
    default_hard: true
    priority: 5.0
  - template_id: PT_WitnessProtected
    setup_class: Witness_Marked
    payoff_pred: "WitnessAliveAt(testimony) OR AltProof"
    default_hard: true
    priority: 4.0
  - template_id: PT_WeaponAccounted
    setup_class: Weapon_Shown
    payoff_pred: "WeaponRoleExplained"
    default_hard: false
    priority: 2.5
  - template_id: PT_TimelineBoard
    setup_class: Case_Accepted
    payoff_pred: "TimelineConsistentAsserted"
    default_hard: false
    priority: 2.0
  - template_id: PT_ChainOfCustody
    setup_class: Object_Missing
    payoff_pred: "HolderChainClosed OR ThiefIdentified"
    default_hard: true
    priority: 3.5
  - template_id: PT_AlibiBroken
    setup_class: Alibi_Claimed
    payoff_pred: "AlibiRefuted(suspect) OR AlibiConfirmed"
    default_hard: false
    priority: 2.0
  - template_id: PT_MethodDemo
    setup_class: Impossible_Crime_Stated
    payoff_pred: "MethodDemonstrated(method_star)"
    default_hard: true
    priority: 4.0
  - template_id: PT_IdentityReveal
    setup_class: Identity_Questioned
    payoff_pred: "IdentityAsserted(x_star)"
    default_hard: true
    priority: 4.0
  - template_id: PT_RulesPublished
    setup_class: Rules_Hypothesis_Active
    payoff_pred: "RulesKnown(party) OR PartyWiped"
    default_hard: true
    priority: 5.0
  - template_id: PT_MacGuffinRecovered
    setup_class: Object_Stolen
    payoff_pred: "Holds(party, object) OR DestroyedWithReason"
    default_hard: true
    priority: 3.5
  - template_id: PT_MoleExposed
    setup_class: Leak_Detected
    payoff_pred: "MoleAccusedCorrectly OR MoleFledAuthored"
    default_hard: true
    priority: 4.5
  - template_id: PT_ProphecyInterpreted
    setup_class: Prophecy_Uttered
    payoff_pred: "InterpretationChosen AND WorldConsistent"
    default_hard: false
