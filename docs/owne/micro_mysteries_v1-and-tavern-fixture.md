# ---------------------------------------------------------------------------
micro_mysteries:
  - id: M01
    name: Closed_Circle_Whodunit
    frame: whodunit
    tones: [cozy, noir, thriller]
    X:
      type: categorical
      name: culprit
      domain_from: "cast.suspects"
    compound: null
    hook:
      event_classes: [Hook_Discover]
      summary: "Crime in closed cast/location"
    meso_chain: *default_meso
    discourse_classes: *disc_common
    clue_types_true: [alibi_break, physical_trace, opportunity_window, motive_doc]
    clue_types_herring: [jealousy_rumor, outsider_flight, planted_object]
    solve_classes: [Correct_Accuse, Confront_With_Proof]
    fail_classes: [Wrong_Accuse, Deadline_Expire, Key_Witness_Lost]
    promises:
      - { template: PT_MinClueGate, params: { N: 2 } }
      - { template: PT_ConfrontWithProof }
      - { template: PT_TimelineBoard }
      - { template: PT_WeaponAccounted, optional: true }
    likelihood_hints:
      physical_trace: { compatible: high, incompatible: near_zero }
      testimony: { scale_by_fluent: Trust }
    fairness: { min_true_clues_before_solve: 2 }
    tags: [classic, cast_limited]
  - id: M02
    name: Locked_Room
    frame: how_method
    tones: [cozy, thriller, gothic]
    X:
      type: categorical
      name: method
      domain_from: "domain.methods_locked_room"
    secondary_X:
      type: categorical
      name: culprit
      domain_from: "cast.suspects"
      optional: true
    hook:
      event_classes: [Hook_Discover]
      summary: "Impossible ingress/egress crime"
    meso_chain: *default_meso
    discourse_classes: [Search_Area, Examine_Item, Decode, Interview, Method_Demo, Correct_Accuse]
    clue_types_true: [mechanism, timing_device, key_duplicate, staged_suicide_tell]
    clue_types_herring: [supernatural_rumor, wrong_window]
    solve_classes: [Method_Demo, Correct_Accuse]
    promises:
      - { template: PT_MethodDemo }
      - { template: PT_MinClueGate, params: { N: 2 } }
    integrity_notes:
      - "True method must be realizable under I and room fluents"
    tags: [spatial, puzzle]
  - id: M03
    name: Missing_Person
    frame: compound
    tones: [thriller, noir, cozy]
    X:
      type: product
      factors:
        - { name: location_bin, domain_from: "map.bins" }
        - { name: status, domain: [alive_held, alive_fled, dead, voluntary_vanish] }
    hook: { summary: "Disappearance", event_classes: [Hook_Discover] }
    discourse_classes: [Interview, Search_Area, Tail_NPC, Examine_Item, Stakeout]
    clue_types_true: [last_seen, travel_trace, financial_prep, body_or_safehouse]
    clue_types_herring: [false_sighting, planted_farewell]
    solve_classes: [Locate_Person, Assert_Fate]
    promises:
      - { template: PT_MinClueGate, params: { N: 2 } }
      - { template: PT_DeadlineClock, optional: true }
    tags: [exploration, timeline]
  - id: M04
    name: Theft_MacGuffin
    frame: compound
    tones: [heist, cozy, thriller]
    X:
      type: product
      factors:
        - { name: thief, domain_from: "cast.suspects" }
        - { name: current_holder, domain_from: "cast.plus_unknown" }
    hook: { summary: "Object missing", event_classes: [Hook_Discover] }
    clue_types_true: [custody_break, fence_contact, residual_trace]
    clue_types_herring: [insurance_fraud_suspect_innocent, replica_confusion]
    solve_classes: [Recover_Object, Accuse_Thief]
    promises:
      - { template: PT_MacGuffinRecovered }
      - { template: PT_ChainOfCustody }
    tags: [object_centric]
  - id: M05
    name: Poison_Medical
    frame: compound
    tones: [cozy, noir, thriller]
    X:
      type: product
      factors:
        - { name: poisoner, domain_from: "cast.suspects" }
        - { name: substance, domain_from: "domain.substances" }
    clue_types_true: [intake_timeline, access_to_substance, dose_residue]
    clue_types_herring: [allergy_natural, food_spoiled]
    solve_classes: [Correct_Accuse, AssertMethod]
    promises:
      - { template: PT_MinClueGate, params: { N: 2 } }
      - { template: PT_TimelineBoard }
    tags: [timeline, medical]
  - id: M06
    name: Forgery_Fraud
    frame: compound
    tones: [noir, political, cozy]
    X:
      type: product
      factors:
        - { name: forger, domain_from: "cast.suspects" }
        - { name: doc_state, domain: [forged, altered, genuine_misread] }
    clue_types_true: [material_anachronism, stroke_analysis, timestamp_skew]
    clue_types_herring: [honest_scribe_error]
    solve_classes: [Present_Proof_Doc, Accuse_Forger]
    promises:
      - { template: PT_MinClueGate, params: { N: 2 } }
    tags: [document]
  - id: M07
    name: Blackmail
    frame: compound
    tones: [noir, thriller, political]
    X:
      type: product
      factors:
        - { name: blackmailer, domain_from: "cast.suspects" }
        - { name: secret_id, domain_from: "domain.secrets" }
    clue_types_true: [drop_site, payment_trail, secret_provenance]
    clue_types_herring: [third_party_leech, false_secret]
    solve_classes: [Confront_Blackmailer, Expose_Secret, Destroy_Leverage]
    promises:
      - { template: PT_DeadlineClock }
      - { template: PT_MinClueGate, params: { N: 2 } }
    tags: [social, leverage]
  - id: M08
    name: Spy_Mole
    frame: whodunit
    tones: [thriller, scifi, political, heist]
    X:
      type: categorical
      name: mole
      domain_from: "cast.ingroup"
    clue_types_true: [compartment_test, unique_knowledge_leak, dead_drop]
    clue_types_herring: [unlucky_coincidence, frame_job]
    solve_classes: [Correct_Accuse, Isolate_Mole]
    promises:
      - { template: PT_MoleExposed }
      - { template: PT_MinClueGate, params: { N: 2 } }
    tags: [info_compartment]
  - id: M09
    name: Cold_Case
    frame: whodunit
    tones: [noir, cozy, thriller]
    X:
      type: categorical
      name: original_culprit
      domain_from: "cast.past_and_present"
    clue_types_true: [archive_contradiction, new_forensics, deathbed_note]
    clue_types_herring: [past_detective_bias]
    solve_classes: [Correct_Accuse, Public_Revision]
    promises:
      - { template: PT_MinClueGate, params: { N: 3 } }
      - { template: PT_OnionLayer, optional: true }
    tags: [archive, long_span]
  - id: M10
    name: Serial_Pattern
    frame: compound
    tones: [thriller, horror, noir]
    X:
      type: product
      factors:
        - { name: perpetrator, domain_from: "cast.suspects" }
        - { name: next_target, domain_from: "cast.potential_victims" }
    clue_types_true: [signature_feature, geo_pattern, escalation_rule]
    clue_types_herring: [copycat, planted_signature]
    solve_classes: [Predict_Prevent, Correct_Accuse]
    promises:
      - { template: PT_DeadlineClock }
      - { template: PT_MinClueGate, params: { N: 2 } }
    tags: [pattern, race]
  - id: M11
    name: Party_Betrayal
    frame: whodunit
    tones: [fantasy, thriller, heist]
    X:
      type: categorical
      name: betrayer
      domain_from: "cast.party"
    clue_types_true: [who_knew_plan, timing_of_leak, benefit_trail]
    clue_types_herring: [coerced_lookalike, intercepted_mail]
    solve_classes: [Correct_Accuse, Exile, Forgive_Branch]
    promises:
      - { template: PT_MoleExposed }
    tags: [party, trust]
  - id: M12
    name: Secret_Romance
    frame: compound
    tones: [cozy, melodrama, noir]
    X:
      type: categorical
      name: pair_or_none
      domain_from: "domain.pairs_plus_none"
    clue_types_true: [opportunity, token, witness]
    clue_types_herring: [platonic_misread]
    solve_classes: [Assert_Pair, Confront]
    promises:
      - { template: PT_RomanceToken, optional: true }
    tags: [social, soft_stakes]
  - id: M13
    name: Inheritance_Web
    frame: compound
    tones: [cozy, noir, political]
    X:
      type: product
      factors:
        - { name: will_tamperer, domain_from: "cast.family" }
        - { name: killer_if_any, domain_from: "cast.family_plus_none" }
    clue_types_true: [codicil_ink, notary_gap, motive_share]
    solve_classes: [Present_Will_Proof, Correct_Accuse]
    promises:
      - { template: PT_MinClueGate, params: { N: 2 } }
    tags: [family, document]
  - id: M14
    name: False_Friend
    frame: existential
    tones: [noir, thriller, fantasy]
    X:
      type: categorical
      name: ally_is_foe
      domain: [true, false]
    # or identity if multiple
    clue_types_true: [incentive_inconsistency, sabotage_benefit]
    solve_classes: [Assert_False_Friend, Trust_Restored]
    promises:
      - { template: PT_MinClueGate, params: { N: 2 } }
    tags: [trust, relationship_arc]
  - id: M15
    name: Rumor_Mill
    frame: whodunit
    tones: [cozy, political, comic]
    X:
      type: categorical
      name: rumor_origin
      domain_from: "cast.town"
    clue_types_true: [first_speaker, gain_from_rumor, altered_wording_trail]
    solve_classes: [Expose_Origin, Public_Clear]
    tags: [social_graph]
  - id: M16
    name: Oath_Taboo_Broken
    frame: whodunit
    tones: [fantasy, horror, political]
    X:
      type: categorical
      name: violator
      domain_from: "cast.community"
    clue_types_true: [ritual_access, timing, residue]
    solve_classes: [Correct_Accuse, Ritual_Purge]
    promises:
      - { template: PT_MinClueGate, params: { N: 2 } }
    tags: [taboo, community]
  - id: M17
    name: What_Is_This_Place
    frame: what_happened
    tones: [fantasy, scifi, horror, adventure]
    X:
      type: categorical
      name: place_function
      domain: [temple, lab, prison, stage, bunker, nest, tomb, server_farm]
    clue_types_true: [artifact_grammar, residue, mural_logic]
    solve_classes: [Label_Place, Unlock_Interaction]
    promises:
      - { template: PT_MinClueGate, params: { N: 2 } }
    tags: [exploration]
  - id: M18
    name: Map_Incomplete
    frame: where
    tones: [adventure, scifi, horror]
    X:
      type: categorical
      name: exit_or_layout_hypothesis
      domain_from: "map.hypotheses"
    clue_types_true: [airflow, sound, survey_mark]
    integrity_notes:
      - "Non-Euclidean only if world pack allows"
    solve_classes: [Assert_Layout, Reach_Exit]
    tags: [spatial]
  - id: M19
    name: Artifact_Purpose
    frame: which_object
    tones: [fantasy, scifi, adventure]
    X:
      type: categorical
      name: use_case
      domain_from: "domain.artifact_uses"
    clue_types_true: [inscription, trial_result, historical_analogue]
    promises:
      - { template: PT_ChekhovGun }
    solve_classes: [Use_Artifact_Correctly]
    tags: [chekhov, puzzle]
  - id: M20
    name: Ecology_Anomaly
    frame: why_motive
    tones: [fantasy, scifi, thriller]
    X:
      type: categorical
      name: cause_class
      domain: [natural, industrial, magical, weapon, unknown_open]
    clue_types_true: [sample_chain, plume_map, incentive]
    solve_classes: [Assert_Cause, Mitigate]
    tags: [systemic]
  - id: M21
    name: Cover_Up
    frame: compound
    tones: [political, noir, scifi]
    X:
      type: product
      factors:
        - { name: hidden_event, domain_from: "domain.hidden_events" }
        - { name: cover_faction, domain_from: "cast.factions" }
    clue_types_true: [doc_vs_witness_gap, budget_spike, silenced_witness]
    clue_types_herring: [incompetent_bureaucracy]
    solve_classes: [Publish_Truth, Blackmail_Truce, Bury_Deeper]
    promises:
      - { template: PT_WitnessProtected, optional: true }
      - { template: PT_OnionLayer, optional: true }
    tags: [conspiracy]
  - id: M22
    name: Identity_Mystery
    frame: whodunit
    tones: [thriller, scifi, noir, fantasy]
    X:
      type: categorical
      name: true_identity
      domain_from: "domain.identities"
    clue_types_true: [bio_fragment, recognition_mark, archive_id]
    promises:
      - { template: PT_IdentityReveal }
    solve_classes: [Assert_Identity]
    tags: [character_arc]
  - id: M23
    name: Timeline_Loop_Index
    frame: when
    tones: [scifi]
    X:
      type: categorical
      name: loop_index
      domain_from: "domain.loop_indices"
    requires_world_pack: [time_loop]
    clue_types_true: [persistence_object, npc_memory_flags]
    solve_classes: [Assert_Loop, Break_Loop]
    tags: [experimental]
  - id: M24
    name: Simulation_Or_Show
    frame: existential
    tones: [scifi, horror, comic]
    X:
      type: categorical
      name: reality_level
      domain: [baseline, show, sim, dream_authored]
    requires_world_pack: [meta_layers]
    integrity_notes:
      - "Must be encoded in W; no vibe-only twist"
    solve_classes: [Assert_Layer]
    tags: [meta]
  - id: M25
    name: Prophecy_Logic
    frame: existential
    tones: [fantasy]
    X:
      type: categorical
      name: interpretation
      domain_from: "domain.prophecy_interpretations"
    clue_types_true: [constraint_satisfaction, partial_fulfillment]
    promises:
      - { template: PT_ProphecyInterpreted }
    solve_classes: [Choose_Interpretation]
    tags: [asp_friendly]
  - id: M26
    name: Security_Puzzle_Heist
    frame: how_method
    tones: [heist, scifi, thriller]
    X:
      type: categorical
      name: bypass_sequence_id
      domain_from: "domain.bypass_plans"
    clue_types_true: [recon, guard_pattern, tool_fit]
    fail_classes: [Alarm_Fired]
    solve_classes: [Execute_Bypass]
    promises:
      - { template: PT_MinClueGate, params: { N: 2 } }
    tags: [heist, procedural]
  - id: M27
    name: Who_Talked
    frame: whodunit
    tones: [heist, political, thriller]
    X:
      type: categorical
      name: informant
      domain_from: "cast.crew_or_town"
    clue_types_true: [compartment_test, payment, timing]
    promises:
      - { template: PT_MoleExposed }
    tags: [heist, social]
  - id: M28
    name: Inside_Vs_Outside_Job
    frame: compound
    tones: [heist, cozy, noir]
    X:
      type: product
      factors:
        - { name: category, domain: [inside, outside, collusion] }
        - { name: person, domain_from: "cast.suspects" }
    clue_types_true: [entry_physics, access_list]
    promises:
      - { template: PT_MethodDemo }
    tags: [heist]
  - id: M29
    name: Horror_Rules
    frame: what_happened
    tones: [horror]
    X:
      type: categorical
      name: rule_set_id
      domain_from: "domain.horror_rule_sets"
    clue_types_true: [victim_feature, failed_action, survival_outlier]
    promises:
      - { template: PT_RulesPublished }
      - { template: PT_DeadlineClock }
    solve_classes: [Publish_Rules, Exploit_Rules]
    tags: [horror, deadly_tests]
  - id: M30
    name: Monster_Drive
    frame: why_motive
    tones: [horror, fantasy]
    X:
      type: categorical
      name: drive
      domain: [hunger, territory, revenge, nest, control, mirror]
    clue_types_true: [victim_selection, leave_behind, timing]
    solve_classes: [Assert_Drive, Bargain_Or_Kill]
    tags: [horror]
  - id: M31
    name: Haunting_Anchor
    frame: where
    tones: [horror, gothic, fantasy]
    X:
      type: categorical
      name: anchor
      domain_from: "domain.anchors"
    clue_types_true: [escalation_map, object_link, history]
    solve_classes: [Destroy_Anchor, Free_Anchor]
    promises:
      - { template: PT_ChekhovGun }
    tags: [horror]
  - id: M32
    name: Infection_Index
    frame: compound
    tones: [horror, scifi, thriller]
    X:
      type: product
      factors:
        - { name: patient_zero, domain_from: "cast" }
        - { name: vector, domain_from: "domain.vectors" }
    clue_types_true: [contact_graph, incubation, environmental]
    solve_classes: [Quarantine, Cure_Path]
    promises:
      - { template: PT_DeadlineClock }
    tags: [graph, race]
  - id: M33
    name: Ship_Sabotage
    frame: compound
    tones: [scifi, thriller]
    X:
      type: product
      factors:
        - { name: saboteur, domain_from: "cast.crew" }
        - { name: system, domain_from: "ship.systems" }
    clue_types_true: [access_log, tool_mark, motive]
    solve_classes: [Correct_Accuse, Repair]
    promises:
      - { template: PT_DeadlineClock }
    tags: [scifi]
  - id: M34
    name: AI_Objective
    frame: why_motive
    tones: [scifi]
    X:
      type: categorical
      name: objective_hypothesis
      domain_from: "domain.ai_objectives"
    clue_types_true: [probe_outcome, revealed_preference]
    solve_classes: [Assert_Objective, Rebind_AI]
    tags: [scifi, experimental]
  - id: M35
    name: First_Contact_Intent
    frame: why_motive
    tones: [scifi]
    X:
      type: categorical
      name: intent
      domain: [hostile, curious, mirror, refuge, incomprehensible]
    clue_types_true: [signal_experiment, boundary_respect]
    solve_classes: [Assert_Intent, Policy_Choice]
    tags: [scifi]
  - id: M36
    name: Time_Crime
    frame: whodunit
    tones: [scifi]
    X:
      type: categorical
      name: who_changed_past
      domain_from: "cast.time_capable"
    requires_world_pack: [time_travel]
    clue_types_true: [anachronism, exclusive_knowledge]
    solve_classes: [Correct_Accuse, Restore_Timeline]
    tags: [experimental]
  - id: M37
    name: Assassination_Plot
    frame: compound
    tones: [political, thriller]
    X:
      type: product
      factors:
        - { name: organizer, domain_from: "cast.political" }
        - { name: trigger, domain_from: "cast.political" }
    clue_types_true: [funding, ideology, logistics]
    promises:
      - { template: PT_DeadlineClock }
      - { template: PT_WitnessProtected, optional: true }
    solve_classes: [Prevent, Expose]
    tags: [political]
  - id: M38
    name: False_Flag
    frame: whodunit
    tones: [political, thriller, noir]
    X:
      type: categorical
      name: true_faction
      domain_from: "cast.factions"
    clue_types_true: [plant_tell, logistics_impossibility, benefit]
    solve_classes: [Publish_Attribution]
    tags: [political]
  - id: M39
    name: Treaty_Sabotage
    frame: whodunit
    tones: [political]
    X:
      type: categorical
      name: saboteur_delegate
      domain_from: "cast.delegates"
    clue_types_true: [draft_diff, private_meeting, leak]
    solve_classes: [Expose_Delegate]
    tags: [political]
  - id: M40
    name: Supply_Traitor
    frame: whodunit
    tones: [war, political, fantasy]
    X:
      type: categorical
      name: quartermaster_leak
      domain_from: "cast.supply_chain"
    clue_types_true: [shrinkage_pattern, enemy_knowledge]
    solve_classes: [Correct_Accuse]
    tags: [war]
  - id: M41
    name: Bakeoff_Sabotage
    frame: whodunit
    tones: [cozy, comic]
    X:
      type: categorical
      name: saboteur
      domain_from: "cast.contestants"
    clue_types_true: [ingredient_swap, timing, rivalry]
    solve_classes: [Correct_Accuse, Public_Taste_Test]
    promises:
      - { template: PT_MinClueGate, params: { N: 2 } }
    pacing: { curve_id: slow_burn, tau_sur_climax: 0.6 }
    tags: [cozy, low_stakes]
  - id: M42
    name: Lost_Pet
    frame: where
    tones: [cozy, comic]
    X:
      type: categorical
      name: location_bin
      domain_from: "map.bins"
    clue_types_true: [sighting, trail, habit]
    solve_classes: [Find_Pet]
    tags: [cozy]
  - id: M43
    name: Anonymous_Gift
    frame: whodunit
    tones: [cozy, melodrama, comic]
    X:
      type: categorical
      name: giver
      domain_from: "cast.town"
    clue_types_true: [wrap_material, opportunity, motive_kind]
    solve_classes: [Assert_Giver]
    tags: [cozy]
  - id: M44
    name: Election_Dirty_Trick
    frame: whodunit
    tones: [cozy, political, comic]
    X:
      type: categorical
      name: trickster
      domain_from: "cast.club"
    clue_types_true: [print_shop, timing, benefit]
    solve_classes: [Expose_Trick]
    tags: [cozy, social]
  - id: M45
    name: Who_Ate_Leftovers
    frame: whodunit
    tones: [comic, cozy]
    X:
      type: categorical
      name: culprit
      domain_from: "cast.household"
    clue_types_true: [crumb, alibi_kitchen, guilt_behavior]
    solve_classes: [Correct_Accuse_Comic]
    pacing: { curve_id: joke_pulse }
    tags: [comic, micro_micro]
  - id: M46
    name: Unreliable_Tutorial
    frame: whodunit
    tones: [comic, meta, thriller]
    X:
      type: categorical
      name: who_lied_about_rules
      domain_from: "cast.tutorial_npcs"
    clue_types_true: [mechanic_fail, contradictory_help]
    solve_classes: [Assert_Liar]
    tags: [meta, ux]
  - id: M47
    name: Dream_Vs_Real
    frame: existential
    tones: [horror, fantasy, scifi]
    X:
      type: categorical
      name: segment_tag
      domain: [real, dream_authored, memory]
    requires_world_pack: [segment_tags]
    integrity_notes:
      - "Inventory discontinuities must be legal Apply effects"
    solve_classes: [Assert_Segment]
    tags: [meta]
  - id: M48
    name: Edited_Log
    frame: what_happened
    tones: [scifi, noir, thriller]
    X:
      type: categorical
      name: which_log_edited
      domain_from: "domain.logs"
    clue_types_true: [version_skew, hash_mismatch, exclusive_knowledge]
    solve_classes: [Assert_Edit, Restore_Log]
    tags: [scifi, document]
# ---------------------------------------------------------------------------
# INSTANCE GENERATOR HINTS
# ---------------------------------------------------------------------------
instantiation:
  required_bindings:
    - cast
    - map
    - x_star
    - setting_pack
  steps:
    - pick_mystery_id
    - bind_domains
    - choose_combinators
    - materialize_promises_from_templates
    - build_L_tables_from_likelihood_hints
    - assign_meso_to_qS_priors
    - set_tau_from_pacing
    - run_reachability_check
  combinator_examples:
    - { a: M04, b: M07, combinator: stack }
    - { a: M21, b: M01, combinator: nest }
    - { a: M01, b: M02, combinator: parallel }
# ---------------------------------------------------------------------------
# MACRO / STRUCTURE CROSSWALK (reference only)
# ---------------------------------------------------------------------------
structure_crosswalk:
  recommended_topologies_by_mystery:
    M01: [T12_casefile, T2_pearls]
    M08: [T2_pearls, T5_weave]
    M29: [T7_timed, T2_pearls]
    M41: [T12_casefile, T4_hub]
  recommended_macro_packs:
    default_mystery: three_act_mystery
    cozy: three_act_mystery
    heist: heist_pack
    horror: johakyu_or_timed
Companion snippet — content/libraries/promise_graph_schema.yaml
schema_version: "1.1.0"
promise_instance_fields:
  - id
  - template_id
  - mystery_id
  - hard
  - priority
  - t_create
  - t_deadline
  - deps  # list of promise ids
  - payoff_pred_grounded
  - status  # open|paid|failed|cancelled
validation:
  - dag_deps: true
  - hard_deadline_requires_force_set_or_crisis_schema: true
DELIVERABLE 2
Tavern Letter — Full OWNE Fixture
fixtures/tavern_letter/v1/world.json (+ related)
Ultrathink notes:

Single source of truth for golden tests: IR=1, Halluc=0, solve only after min clues.
X
X = (author, secret_type); true = Bob × gang_debt.
Herrings: Stranger (warrant), Alice jealousy — must not softlock true path.
Evidence updates
μ
μ via explicit
L
L tables (tiny discrete).
All committed events on golden path are in
E
(
W
)
E(W).
Deadlines: soft gang pressure; hard only if you enable hard_clock flag (default soft + crisis schema).
Realization license facts listed per step for faithfulness tests.
2.1 fixture_manifest.json
{
  "fixture_id": "tavern_letter_v1",
  "schema_version": "1.1.0",
  "engine_compat": "OWNE-v1.1",
  "mystery_template": "M01+M07_stack_light",
  "description": "Closed-circle letter mystery in a tavern; Bob wrote letter about gang debt; stranger herring; Alice jealousy herring.",
  "files": {
    "world": "world.json",
    "actions": "actions.json",
    "invariants": "invariants.json",
    "mystery": "mystery.json",
    "promises": "promises.json",
    "latent": "latent.json",
    "likelihood": "likelihood.json",
    "golden_path": "golden_path.json",
    "pacing": "pacing.json",
    "realize_budget": "realize_budget.json"
  },
  "ci_gates": ["H1", "H2", "H3", "H5", "H8", "H9", "H10", "IR", "Halluc", "PC_min_clues"]
}
2.2 world.json — initial
W
0
W
0


{
  "time": 0,
  "cell": "tavern_main",
  "entities": {
    "Alice": { "type": "Agent", "tags": ["cast", "suspect", "party_friend"] },
    "Bob": { "type": "Agent", "tags": ["cast", "suspect"] },
    "Barmaid": { "type": "Agent", "tags": ["cast", "witness"] },
    "Stranger": { "type": "Agent", "tags": ["cast", "suspect", "outsider"] },
    "Detective": { "type": "Agent", "tags": ["pc", "detective"] },
    "Letter": { "type": "Item", "tags": ["key_evidence", "readable"] },
    "LedgerFragment": { "type": "Item", "tags": ["key_evidence"] },
    "InkKit": { "type": "Item", "tags": ["prop"] },
    "Tavern": { "type": "Location", "id": "tavern_main" },
    "Alley": { "type": "Location", "id": "alley" },
    "Cellar": { "type": "Location", "id": "cellar" }
  },
  "fluents": [
    ["Exists", "Alice"], ["Exists", "Bob"], ["Exists", "Barmaid"],
    ["Exists", "Stranger"], ["Exists", "Detective"],
    ["Exists", "Letter"], ["Exists", "LedgerFragment"], ["Exists", "InkKit"],
    ["Alive", "Alice"], ["Alive", "Bob"], ["Alive", "Barmaid"],
    ["Alive", "Stranger"], ["Alive", "Detective"],
    ["At", "Alice", "tavern_main"],
    ["At", "Bob", "tavern_main"],
    ["At", "Barmaid", "tavern_main"],
    ["At", "Stranger", "tavern_main"],
    ["At", "Detective", "tavern_main"],
    ["At", "Letter", "tavern_main"],
    ["At", "LedgerFragment", "cellar"],
    ["At", "InkKit", "tavern_main"],
    ["Has", "Bob", "InkKit"],
    ["HiddenBy", "Letter", "Bob"],
    ["Readable", "Letter"],
    ["Sealed", "Letter"],
    ["Trust", "Detective", "Barmaid", 0.8],
    ["Trust", "Detective", "Alice", 0.7],
    ["Trust", "Detective", "Bob", 0.5],
    ["Trust", "Detective", "Stranger", 0.3],
    ["Rumor", "Alice_jealous_of_Bob", true],
    ["Warrant", "Stranger", "unrelated_smuggling", true],
    ["Debt", "Bob", "AshGang", 50],
    ["SecretTrue", "Bob_gang_debt", true],
    ["Knows", "Bob", "LetterContent"],
    ["Knows", "Bob", "Bob_gang_debt"],
    ["~Knows", "Detective", "LetterContent"],
    ["~Knows", "Detective", "Bob_gang_debt"],
    ["~Knows", "Alice", "LetterContent"],
    ["Knows", "Barmaid", "Bob_hid_letter"],
    ["UniqueOwner", "Letter"],
    ["UniqueOwner", "LedgerFragment"],
    ["UniqueOwner", "InkKit"],
    ["MysteryOpen", "TavernLetter", false],
    ["ClueCountTrue", "TavernLetter", 0],
    ["WrongAccuseCount", "TavernLetter", 0],
    ["Resolved", "TavernLetter", false]
  ],
  "notes": {
    "closed_world_negation": "Use ~Knows as explicit absence for clarity in fixture; engine may use CWA",
    "HiddenBy": "narrative fluent; Search/Confiscate clears"
  }
}
2.3 invariants.json
{
  "I_phys": [
    {
      "id": "I1_no_act_dead",
      "deny": "RequiresActor(e,a) AND NOT Alive(a)"
    },
    {
      "id": "I2_exists",
      "deny": "RequiresEntity(e,x) AND NOT Exists(x)"
    },
    {
      "id": "I3_colocated_phys",
      "deny": "PhysInteract(e,a,b) AND NOT Colocated(a,b)"
    },
    {
      "id": "I4_unique_owner",
      "deny": "Has(a,i) AND Has(b,i) AND a!=b AND UniqueOwner(i)"
    },
    {
      "id": "I5_no_teleport",
      "deny": "At(a,l2)' AND At(a,l1) AND l1!=l2 AND NOT Travel(e,a,l1,l2) AND NOT ForcedMove(a)"
    },
    {
      "id": "I6_alive_dead_mutex",
      "deny": "Alive(a) AND Dead(a)"
    }
  ],
  "derived": [
    "Colocated(a,b) <=> EXISTS l. At(a,l) AND At(b,l)"
  ],
  "non_invariants": [
    "Quest deadlines are NOT in I_phys",
    "Wrong accuse limits are meta/Admissible, not physics"
  ]
}
2.4 actions.json — schemas (subset sufficient for fixture)
{
  "schemas": [
    {
      "name": "DiscoverDisturbance",
      "params": ["pc", "loc"],
      "pre": ["Alive(pc)", "At(pc,loc)", "At(Letter,loc)", "HiddenBy(Letter,Bob)"],
      "add": [["MysteryOpen", "TavernLetter", true], ["HookFired", "TavernLetter", true]],
      "del": [],
      "constr": [],
      "obs": ["hook_letter_tension"],
      "classes": ["Hook_Discover"],
      "tags": ["RequiresActor=pc"]
    },
    {
      "name": "Talk",
      "params": ["pc", "npc", "topic"],
      "pre": ["Alive(pc)", "Alive(npc)", "At(pc,l)", "At(npc,l)"],
      "add": [["Talked", "pc", "npc", "topic"]],
      "del": [],
      "constr": ["Colocated(pc,npc)"],
      "obs": ["testimony"],
      "classes": ["Interview"],
      "phys_interact": true
    },
    {
      "name": "SearchArea",
      "params": ["pc", "loc"],
      "pre": ["Alive(pc)", "At(pc,loc)"],
      "add": [["Searched", "pc", "loc"]],
      "del": [],
      "obs": ["search"],
      "classes": ["Search_Area"]
    },
    {
      "name": "FindLetter",
      "params": ["pc", "loc"],
      "pre": [
        "Alive(pc)", "At(pc,loc)", "At(Letter,loc)",
        "HiddenBy(Letter,Bob)", "Searched(pc,loc)"
      ],
      "add": [["Has", "pc", "Letter"], ["At", "Letter", "pc_inv"]],
      "del": [["HiddenBy", "Letter", "Bob"], ["At", "Letter", "loc"]],
      "obs": ["found_letter"],
      "classes": ["Search_Area", "Examine_Item"],
      "requires_entity": ["Letter"]
    },
    {
      "name": "ReadLetter",
      "params": ["pc"],
      "pre": ["Alive(pc)", "Has(pc,Letter)", "Readable(Letter)"],
      "add": [
        ["Knows", "pc", "LetterContent"],
        ["Knows", "pc", "LetterMentionsDebt"],
        ["Unsealed", "Letter"]
      ],
      "del": [["Sealed", "Letter"]],
      "obs": ["letter_content"],
      "classes": ["Examine_Item"]
    },
    {
      "name": "ExamineInk",
      "params": ["pc", "bob"],
      "pre": ["Alive(pc)", "Alive(bob)", "Has(bob,InkKit)", "At(pc,l)", "At(bob,l)", "Knows(pc,LetterContent)"],
      "add": [["Knows", "pc", "BobInkMatchesLetter"], ["ClueTrue", "ink_match"]],
      "del": [],
      "obs": ["ink_match"],
      "classes": ["Examine_Item"],
      "phys_interact": true
    },
    {
      "name": "InterviewBarmaid",
      "params": ["pc", "barmaid"],
      "pre": ["Alive(pc)", "Alive(barmaid)", "At(pc,l)", "At(barmaid,l)", "MysteryOpen(TavernLetter)"],
      "add": [["Knows", "pc", "Bob_hid_letter"], ["ClueTrue", "barmaid_witness"]],
      "del": [],
      "obs": ["barmaid_witness"],
      "classes": ["Interview"],
      "phys_interact": true
    },
    {
      "name": "InterviewAlice",
      "params": ["pc", "alice"],
      "pre": ["Alive(pc)", "Alive(alice)", "At(pc,l)", "At(alice,l)"],
      "add": [["HeardRumor", "pc", "Alice_jealous_of_Bob"]],
      "del": [],
      "obs": ["jealousy_rumor"],
      "classes": ["Interview"],
      "phys_interact": true
    },
    {
      "name": "InterviewStranger",
      "params": ["pc", "stranger"],
      "pre": ["Alive(pc)", "Alive(stranger)", "At(pc,l)", "At(stranger,l)"],
      "add": [["Knows", "pc", "StrangerWarrant"], ["HerringActive", "stranger_warrant"]],
      "del": [],
      "obs": ["stranger_nervous"],
      "classes": ["Interview"],
      "phys_interact": true
    },
    {
      "name": "StrangerFlees",
      "params": ["stranger", "from", "to"],
      "pre": ["Alive(stranger)", "At(stranger,from)", "HerringActive(stranger_warrant)"],
      "add": [["At", "stranger", "to"], ["Fled", "stranger"]],
      "del": [["At", "stranger", "from"]],
      "obs": ["stranger_flees"],
      "classes": ["Tail_NPC", "Red_Herring_Payoff"],
      "travel": true
    },
    {
      "name": "Travel",
      "params": ["agent", "from", "to"],
      "pre": ["Alive(agent)", "At(agent,from)", "Connected(from,to)"],
      "add": [["At", "agent", "to"]],
      "del": [["At", "agent", "from"]],
      "classes": ["Travel_Risk"],
      "travel": true
    },
    {
      "name": "SearchCellar",
      "params": ["pc"],
      "pre": ["Alive(pc)", "At(pc,cellar)", "At(LedgerFragment,cellar)"],
      "add": [["Has", "pc", "LedgerFragment"], ["Knows", "pc", "LedgerShowsBobDebt"], ["ClueTrue", "ledger"]],
      "del": [["At", "LedgerFragment", "cellar"]],
      "obs": ["ledger"],
      "classes": ["Search_Area", "Examine_Item"]
    },
    {
      "name": "CompareNotes",
      "params": ["pc"],
      "pre": [
        "Knows(pc,LetterContent)",
        "Knows(pc,Bob_hid_letter)",
        "Knows(pc,BobInkMatchesLetter)"
      ],
      "add": [["Hypothesis", "pc", "Bob_author_likely"], ["ClueTrue", "tri_compare"]],
      "del": [],
      "obs": ["compare_notes"],
      "classes": ["Compare_Notes", "Find_Contradiction"]
    },
    {
      "name": "WrongAccuse",
      "params": ["pc", "suspect"],
      "pre": ["Alive(pc)", "Alive(suspect)", "MysteryOpen(TavernLetter)", "At(pc,l)", "At(suspect,l)"],
      "add": [["WrongAccuseCountInc", "TavernLetter"], ["SocialDamage", "pc", "suspect"]],
      "del": [],
      "obs": ["wrong_accuse"],
      "classes": ["Wrong_Accuse"],
      "phys_interact": true,
      "effects_meta": ["increment_wrong_accuse"]
    },
    {
      "name": "CorrectConfrontBob",
      "params": ["pc", "bob"],
      "pre": [
        "Alive(pc)", "Alive(bob)", "At(pc,l)", "At(bob,l)",
        "MysteryOpen(TavernLetter)",
        "Knows(pc,LetterContent)",
        "Knows(pc,Bob_hid_letter)",
        "Knows(pc,LedgerShowsBobDebt)",
        "ClueCountTrue(TavernLetter) >= 2"
      ],
      "add": [
        ["Resolved", "TavernLetter", true],
        ["Knows", "pc", "Bob_gang_debt"],
        ["Confessed", "bob", "wrote_letter"],
        ["SolvedBy", "pc", "TavernLetter"]
      ],
      "del": [],
      "obs": ["confess_bob"],
      "classes": ["Correct_Accuse", "Confess", "Confront_With_Proof"],
      "phys_interact": true
    },
    {
      "name": "ExplainStrangerHerring",
      "params": ["pc"],
      "pre": ["Knows(pc,StrangerWarrant)", "Fled(Stranger)"],
      "add": [["HerringResolved", "stranger_warrant"], ["Knows", "pc", "StrangerUnrelated"]],
      "del": [["HerringActive", "stranger_warrant"]],
      "obs": ["herring_resolved"],
      "classes": ["Red_Herring_Payoff"]
    },
    {
      "name": "Wait",
      "params": ["pc"],
      "pre": ["Alive(pc)"],
      "add": [["TimePassed", 1]],
      "del": [],
      "classes": ["Cold_Trail"]
    }
  ],
  "map_edges": [
    ["tavern_main", "alley"],
    ["alley", "tavern_main"],
    ["tavern_main", "cellar"],
    ["cellar", "tavern_main"]
  ],
  "notes": {
    "ClueCountTrue": "Engine maintenance: count distinct ClueTrue(*) facts; CompareNotes may or may not increment depending on design—golden path uses ink, barmaid, ledger as three true clues",
    "CorrectConfrontBob_pre": "Min 2 true clues enforced; golden path has 3"
  }
}
2.5 mystery.json —
X
X, truth, budgets
{
  "mystery_id": "TavernLetter",
  "templates": ["M01", "M07"],
  "combinator": "soft_merge",
  "frame": "compound",
  "question": "Who wrote the letter and what secret does it concern?",
  "X": {
    "type": "product",
    "factors": [
      {
        "name": "author",
        "domain": ["Alice", "Bob", "Barmaid", "Stranger"]
      },
      {
        "name": "secret_type",
        "domain": ["gang_debt", "affair", "smuggling", "none"]
      }
    ],
    "size": 16
  },
  "x_star": { "author": "Bob", "secret_type": "gang_debt" },
  "mu0": {
    "method": "softmax_bias",
    "logits": {
      "Alice|affair": 0.4,
      "Alice|gang_debt": 0.1,
      "Bob|affair": 0.2,
      "Bob|gang_debt": 0.3,
      "Barmaid|affair": 0.05,
      "Barmaid|gang_debt": 0.05,
      "Stranger|smuggling": 1.2,
      "Stranger|gang_debt": 0.4,
      "Stranger|affair": 0.1,
      "default": 0.0
    },
    "note": "Normalize exp(logit) over 16 cells; unspecified use default 0"
  },
  "fairness": {
    "min_true_clues_before_solve": 2,
    "max_wrong_accuses": 2,
    "reachability": "golden_path_exists"
  },
  "fail": {
    "wrong_accuse_limit": 3,
    "optional_hard_clock": false,
    "soft_clock_t": 20,
    "crisis_schema": "AshGangArrives"
  },
  "pov": {
    "audience_tracks": "Detective",
    "dramatic_irony_facts": []
  }
}
2.6 likelihood.json —
L
(
ε
∣
x
)
L(ε∣x) (compact)
Likelihoods are multipliers on atoms of
X
X (author, secret). Engine multiplies into
μ
μ then renorms.

{
  "evidence_channels": {
    "letter_content": {
      "description": "Letter mentions debt language, not romance",
      "weight_by_x": {
        "secret_type=gang_debt": 4.0,
        "secret_type=affair": 0.4,
        "secret_type=smuggling": 0.8,
        "secret_type=none": 0.2
      }
    },
    "barmaid_witness": {
      "description": "Bob hid letter",
      "weight_by_x": {
        "author=Bob": 5.0,
        "author=Alice": 0.6,
        "author=Barmaid": 0.3,
        "author=Stranger": 0.5
      },
      "scale_by_trust": "Barmaid"
    },
    "ink_match": {
      "description": "Bob ink matches letter",
      "weight_by_x": {
        "author=Bob": 6.0,
        "author=Alice": 0.5,
        "author=Barmaid": 0.5,
        "author=Stranger": 0.4
      }
    },
    "ledger": {
      "description": "Ledger shows Bob debt to AshGang",
      "weight_by_x": {
        "author=Bob": 3.0,
        "secret_type=gang_debt": 5.0,
        "secret_type=affair": 0.5,
        "author=Stranger": 0.7
      }
    },
    "jealousy_rumor": {
      "description": "Alice jealousy — herring",
      "weight_by_x": {
        "author=Alice": 2.0,
        "secret_type=affair": 2.5,
        "author=Bob": 0.9
      }
    },
    "stranger_nervous": {
      "description": "Stranger nervous",
      "weight_by_x": {
        "author=Stranger": 2.0,
        "secret_type=smuggling": 2.0
      }
    },
    "stranger_flees": {
      "weight_by_x": {
        "author=Stranger": 2.5,
        "secret_type=smuggling": 2.0
      }
    },
    "herring_resolved": {
      "description": "Warrant explains flight",
      "weight_by_x": {
        "author=Stranger": 0.25,
        "secret_type=smuggling": 0.5,
        "author=Bob": 1.2
      }
    },
    "confess_bob": {
      "weight_by_x": {
        "author=Bob": 100.0,
        "secret_type=gang_debt": 100.0
      }
    },
    "wrong_accuse": {
      "weight_by_x": {}
    }
  },
  "combine": "per_factor_multiply_then_outer_normalize",
  "trust_scale": "L_eff = L ** (0.5 + Trust)"
}
2.7 promises.json —
Π
0
Π
0

  graph
{
  "promises": [
    {
      "id": "pi_case_open",
      "template_id": "PT_MinClueGate",
      "mystery_id": "TavernLetter",
      "hard": true,
      "priority": 5.0,
      "t_create": 0,
      "t_deadline": null,
      "deps": [],
      "payoff_pred": "ClueCountTrue(TavernLetter) >= 2",
      "status": "open"
    },
    {
      "id": "pi_letter_read",
      "template_id": "PT_LetterMustBeRead",
      "mystery_id": "TavernLetter",
      "hard": true,
      "priority": 4.0,
      "t_create": 0,
      "t_deadline": null,
      "deps": ["pi_case_open"],
      "payoff_pred": "Knows(Detective, LetterContent)",
      "status": "open",
      "note": "deps soft for ordering; can open in parallel once case open—golden path opens case first"
    },
    {
      "id": "pi_confront_bob",
      "template_id": "PT_ConfrontWithProof",
      "mystery_id": "TavernLetter",
      "hard": true,
      "priority": 4.5,
      "t_create": 0,
      "t_deadline": 25,
      "deps": ["pi_letter_read", "pi_case_open"],
      "payoff_pred": "Resolved(TavernLetter) AND Confessed(Bob, wrote_letter)",
      "status": "open"
    },
    {
      "id": "pi_ledger_optional",
      "template_id": "PT_ChainOfCustody",
      "mystery_id": "TavernLetter",
      "hard": false,
      "priority": 2.5,
      "t_create": 0,
      "t_deadline": null,
      "deps": [],
      "payoff_pred": "Knows(Detective, LedgerShowsBobDebt)",
      "status": "open"
    },
    {
      "id": "pi_herring_stranger",
      "template_id": "PT_B_Plot_Callback",
      "mystery_id": "TavernLetter",
      "hard": false,
      "priority": 1.0,
      "t_create": 0,
      "t_deadline": null,
      "deps": [],
      "payoff_pred": "HerringResolved(stranger_warrant) OR Resolved(TavernLetter)",
      "status": "open"
    },
    {
      "id": "pi_soft_gang_clock",
      "template_id": "PT_DeadlineClock",
      "mystery_id": "TavernLetter",
      "hard": false,
      "priority": 3.0,
      "t_create": 0,
      "t_deadline": 20,
      "deps": [],
      "payoff_pred": "Resolved(TavernLetter) OR CrisisFired(AshGangArrives)",
      "status": "open"
    }
  ],
  "force_set_at_urgency": {
    "when": "t >= 18 AND NOT Resolved(TavernLetter)",
    "prefer_classes": ["Correct_Accuse", "Compare_Notes", "Search_Area"]
  }
}
2.8 latent.json —
q
q priors (sparse)
{
  "levels": {
    "macro": {
      "states": [
        "Setup",
        "Inciting",
        "Gather",
        "Midtwist",
        "Deep",
        "Climax",
        "Aftermath"
      ],
      "pi": { "Setup": 1.0 },
      "A_sparse": [
        ["Setup", "Inciting", 1.0],
        ["Inciting", "Gather", 1.0],
        ["Gather", "Gather", 0.55],
        ["Gather", "Midtwist", 0.25],
        ["Gather", "Deep", 0.2],
        ["Midtwist", "Deep", 0.7],
        ["Midtwist", "Gather", 0.3],
        ["Deep", "Deep", 0.4],
        ["Deep", "Climax", 0.6],
        ["Climax", "Aftermath", 1.0],
        ["Aftermath", "Aftermath", 1.0]
      ]
    },
    "meso": {
      "states": [
        "Myst_Hook",
        "Myst_Investigate",
        "Myst_Midtwist",
        "Myst_Deep",
        "Myst_Accusation",
        "Myst_Resolve",
        "Myst_Aftermath"
      ],
      "parent_conditioned": true,
      "A_note": "Sticky investigate under Gather; accusation under Climax"
    },
    "discourse": {
      "emissions_allowed_by_meso": {
        "Myst_Hook": ["Hook_Discover"],
        "Myst_Investigate": [
          "Interview", "Search_Area", "Examine_Item", "Compare_Notes", "Travel_Risk"
        ],
        "Myst_Midtwist": ["Red_Herring_Payoff", "Reveal_Mid", "Interview"],
        "Myst_Deep": ["Search_Area", "Examine_Item", "Find_Contradiction", "Compare_Notes"],
        "Myst_Accusation": ["Wrong_Accuse", "Correct_Accuse", "Confront_With_Proof"],
        "Myst_Resolve": ["Confess", "Aftermath_Social"],
        "Myst_Aftermath": ["Aftermath_Social", "Cold_Trail"]
      }
    }
  },
  "feasibility_aware": { "beta_g": 0.5 }
}
2.9 pacing.json
{
  "curve_id": "mystery_stair",
  "schedule_by_macro": {
    "Setup": { "tau_S": 0.8, "tau_Sur": 0.15, "tau_U_frac": 0.7 },
    "Inciting": { "tau_S": 1.2, "tau_Sur": 0.35, "tau_U_frac": 0.85 },
    "Gather": { "tau_S": 1.0, "tau_Sur": 0.25, "tau_U_frac": 0.75 },
    "Midtwist": { "tau_S": 1.5, "tau_Sur": 0.55, "tau_U_frac": 0.9 },
    "Deep": { "tau_S": 1.1, "tau_Sur": 0.4, "tau_U_frac": 0.7 },
    "Climax": { "tau_S": 0.9, "tau_Sur": 0.85, "tau_U_frac": 0.5 },
    "Aftermath": { "tau_S": 0.5, "tau_Sur": 0.1, "tau_U_frac": 0.3 }
  },
  "note": "tau_U_frac multiplies ln|C| at runtime; tau_S in nats",
  "T0": 0.9,
  "Tmin": 0.35,
  "Tmax": 2.5
}
2.10 realize_budget.json
{
  "B_tokens_default": 80,
  "dimensions": {
    "dialogue": 40,
    "ui_journal": 20,
    "sfx": 4
  },
  "hard_pins_when": {
    "after_ReadLetter": ["fact_letter_debt_language"],
    "after_CorrectConfrontBob": ["fact_bob_confessed", "fact_gang_debt_true"]
  }
}
2.11 golden_path.json — legal trace + licenses
{
  "name": "tavern_letter_true_solve",
  "start": "world.json W0",
  "steps": [
    {
      "t": 0,
      "e": {
        "name": "DiscoverDisturbance",
        "args": { "pc": "Detective", "loc": "tavern_main" }
      },
      "class": "Hook_Discover",
      "expect": {
        "legal": true,
        "fluents_add": [["MysteryOpen", "TavernLetter", true]],
        "promises_progress": []
      },
      "evidence": ["hook_letter_tension"],
      "Z_must_include": ["fact_hook_letter_noticed"]
    },
    {
      "t": 1,
      "e": {
        "name": "SearchArea",
        "args": { "pc": "Detective", "loc": "tavern_main" }
      },
      "class": "Search_Area",
      "expect": { "legal": true }
    },
    {
      "t": 2,
      "e": {
        "name": "FindLetter",
        "args": { "pc": "Detective", "loc": "tavern_main" }
      },
      "class": "Examine_Item",
      "expect": {
        "legal": true,
        "fluents_add": [["Has", "Detective", "Letter"]]
      },
      "Z_must_include": ["fact_has_letter"]
    },
    {
      "t": 3,
      "e": {
        "name": "ReadLetter",
        "args": { "pc": "Detective" }
      },
      "class": "Examine_Item",
      "expect": {
        "legal": true,
        "fluents_add": [["Knows", "Detective", "LetterContent"]],
        "promises_paid": ["pi_letter_read"]
      },
      "evidence": ["letter_content"],
      "mu_expect": "mass shifts to secret_type=gang_debt",
      "Z_must_include": ["fact_letter_debt_language"]
    },
    {
      "t": 4,
      "e": {
        "name": "InterviewBarmaid",
        "args": { "pc": "Detective", "barmaid": "Barmaid" }
      },
      "class": "Interview",
      "expect": {
        "legal": true,
        "fluents_add": [["Knows", "Detective", "Bob_hid_letter"], ["ClueTrue", "barmaid_witness"]]
      },
      "evidence": ["barmaid_witness"],
      "mu_expect": "author=Bob up",
      "Z_must_include": ["fact_bob_hid_letter"]
    },
    {
      "t": 5,
      "e": {
        "name": "InterviewAlice",
        "args": { "pc": "Detective", "alice": "Alice" }
      },
      "class": "Interview",
      "expect": { "legal": true },
      "evidence": ["jealousy_rumor"],
      "mu_expect": "temporary Alice|affair bump (herring)"
    },
    {
      "t": 6,
      "e": {
        "name": "InterviewStranger",
        "args": { "pc": "Detective", "stranger": "Stranger" }
      },
      "class": "Interview",
      "expect": { "legal": true },
      "evidence": ["stranger_nervous"]
    },
    {
      "t": 7,
      "e": {
        "name": "StrangerFlees",
        "args": { "stranger": "Stranger", "from": "tavern_main", "to": "alley" }
      },
      "class": "Red_Herring_Payoff",
      "expect": { "legal": true },
      "evidence": ["stranger_flees"],
      "macro_hint": "Midtwist"
    },
    {
      "t": 8,
      "e": {
        "name": "ExamineInk",
        "args": { "pc": "Detective", "bob": "Bob" }
      },
      "class": "Examine_Item",
      "expect": {
        "legal": true,
        "fluents_add": [["ClueTrue", "ink_match"]]
      },
      "evidence": ["ink_match"],
      "mu_expect": "author=Bob strong"
    },
    {
      "t": 9,
      "e": {
        "name": "Travel",
        "args": { "agent": "Detective", "from": "tavern_main", "to": "cellar" }
      },
      "class": "Travel_Risk",
      "expect": {
        "legal": true,
        "requires_map": true
      },
      "world_patch_required": {
        "fluents_add_if_missing": [
          ["Connected", "tavern_main", "cellar"],
          ["Connected", "cellar", "tavern_main"],
          ["Connected", "tavern_main", "alley"],
          ["Connected", "alley", "tavern_main"]
        ]
      }
    },
    {
      "t": 10,
      "e": {
        "name": "SearchCellar",
        "args": { "pc": "Detective" }
      },
      "class": "Search_Area",
      "expect": {
        "legal": true,
        "fluents_add": [["ClueTrue", "ledger"], ["Knows", "Detective", "LedgerShowsBobDebt"]],
        "promises_paid": ["pi_ledger_optional"]
      },
      "evidence": ["ledger"],
      "Z_must_include": ["fact_ledger_bob_debt"]
    },
    {
      "t": 11,
      "e": {
        "name": "Travel",
        "args": { "agent": "Detective", "from": "cellar", "to": "tavern_main" }
      },
      "class": "Travel_Risk",
      "expect": { "legal": true }
    },
    {
      "t": 12,
      "e": {
        "name": "CompareNotes",
        "args": { "pc": "Detective" }
      },
      "class": "Compare_Notes",
      "expect": {
        "legal": true,
        "fluents_add": [["Hypothesis", "Detective", "Bob_author_likely"]]
      },
      "evidence": ["compare_notes"]
    },
    {
      "t": 13,
      "e": {
        "name": "ExplainStrangerHerring",
        "args": { "pc": "Detective" }
      },
      "class": "Red_Herring_Payoff",
      "expect": {
        "legal": true,
        "promises_paid_optional": ["pi_herring_stranger"]
      },
      "evidence": ["herring_resolved"]
    },
    {
      "t": 14,
      "e": {
        "name": "CorrectConfrontBob",
        "args": { "pc": "Detective", "bob": "Bob" }
      },
      "class": "Correct_Accuse",
      "expect": {
        "legal": true,
        "fluents_add": [
          ["Resolved", "TavernLetter", true],
          ["Confessed", "Bob", "wrote_letter"]
        ],
        "promises_paid": ["pi_confront_bob", "pi_case_open", "pi_soft_gang_clock"]
      },
      "evidence": ["confess_bob"],
      "mu_expect": "near delta on Bob|gang_debt",
      "Z_must_include": ["fact_bob_confessed", "fact_gang_debt_true"]
    }
  ],
  "terminal_assert": {
    "Resolved(TavernLetter)": true,
    "x_hat": { "author": "Bob", "secret_type": "gang_debt" },
    "IR": 1.0,
    "Halluc": 0.0,
    "hard_promise_misses": 0
  },
  "negative_tests": [
    {
      "name": "accuse_before_clues",
      "pre_steps": ["t0_hook", "t2_find", "t3_read"],
      "e": {
        "name": "CorrectConfrontBob",
        "args": { "pc": "Detective", "bob": "Bob" }
      },
      "expect_legal": false,
      "reason": "ClueCountTrue < 2 AND missing ledger/barmaid preconditions in schema"
    },
    {
      "name": "read_without_letter",
      "pre_steps": ["t0_hook"],
      "e": { "name": "ReadLetter", "args": { "pc": "Detective" } },
      "expect_legal": false
    },
    {
      "name": "talk_to_fled_stranger_in_tavern",
      "pre_steps": ["through_t7_flee"],
      "e": {
        "name": "InterviewStranger",
        "args": { "pc": "Detective", "stranger": "Stranger" }
      },
      "expect_legal": false,
      "reason": "not Colocated"
    }
  ]
}
World patch: merge Connected fluents into world.json for Travel (listed in golden step 9). Add to
W
0
W
0

 :

["Connected", "tavern_main", "cellar"],
["Connected", "cellar", "tavern_main"],
["Connected", "tavern_main", "alley"],
["Connected", "alley", "tavern_main"]
2.12 tests/test_tavern_letter.md (CI checklist)
Test	Pass criteria
Golden path applies	every step is_legal; final
W
⊨
I
W⊨I
Min-clue gate	confront illegal before 2 ClueTrue
Faithfulness	each step Asserted ⊆ Z ∪ CG for must_include
μ direction	after ink+barmaid+ledger,
μ
(
B
o
b
,
g
a
n
g
_
d
e
b
t
)
μ(Bob,gang_debt) is unique argmax
Herring non-softlock	after flee, true solve still reachable
Promise DAG	no hard miss on golden path
Recovery bound	illegal spam depth ≤ M
Units	scores in nats; TV surprise ∈ [0,1]
2.13 Ultrathink validation summary (Fixture)
Risk	Mitigation in fixture
Softlock true path	Negative tests + Force prefer classes
Herring becomes only hypothesis	herring_resolved likelihood + ledger
Accuse too early	Pre on CorrectConfrontBob + PT_MinClueGate
Teleport	Travel + Connected only
Double Has letter	UniqueOwner + Del on Find
Deadline as physics	pi_soft_gang_clock hard=false
IB overclaim	knapsack pins only in realize_budget
EFM overclaim	μ tables operational, labeled inspired
Incomplete map	Connected fluents explicit
File tree to drop in repo
content/libraries/
  micro_mysteries_v1.yaml      # Deliverable 1
  promise_graph_schema.yaml
fixtures/tavern_letter/v1/
  fixture_manifest.json
  world.json
  invariants.json
  actions.json
  mystery.json
  likelihood.json
  promises.json
  latent.json
  pacing.json
  realize_budget.json
  golden_path.json
  tests/test_tavern_letter.md
What you have now
All M01–M48 as machine-readable templates + 22 Π templates + combinators + instantiation pipeline.
Tavern Letter as a complete OWNE v1.1 fixture: world,
I
I, actions,
X
/
μ
/
L
X/μ/L, promise graph, latent priors, pacing, golden legal path, negative tests, realization pins.
Next implementation step: parse golden_path.json in eval/ and assert H1–H3 on each step; compile one YAML mystery instance → runtime Σ_0. I can do a reference Python FixtureLoader + golden-path runner next if you want that as deliverable 3.
