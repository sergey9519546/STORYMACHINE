# STORYMACHINE Rulebook Expansion TODO

Status: **not implemented**

The attempted bulk Wave 1191 expansion was audited and removed. It generated generic cross-pass permutations without pass-specific evidence, symmetric tests, or corpus calibration. That approach violated `server/nvm/revision/WAVE_QUALITY_GUARANTEE.md` and reduced score reliability.

Current valid baseline: **3,216 distinct rules across 14 revision passes**.

## Goal

Expand narrative possibility coverage, especially relationship arcs, structure, and causality, without making diagnosis repetitive or creating false-positive floods.

Rule count is a secondary result. The primary acceptance criteria are:

- New narrative situations are genuinely distinguishable from existing rules.
- Every rule uses evidence available to its owning pass.
- Every rule has a fire test and a near-miss no-fire test.
- Calibration, discrimination, length-invariance, and saturation tests remain green.
- Findings become more varied for real scripts without arbitrary or random behavior.

## Phase 1: Measure Current Repetition

- [ ] Run the 72-script corpus and collect rule frequency by pass, script, act zone, and severity.
- [ ] Identify the top repeated findings that make reports feel scenario-limited.
- [ ] Identify narrative states that exist in records but have no corresponding diagnosis.
- [ ] Measure per-pass rule diversity: unique rules fired per script and overlap between scripts.
- [ ] Establish a baseline for repeated-finding concentration before adding rules.

## Phase 2: Relationship Arc Expansion

- [ ] Inventory every existing relationship-arc rule and map it by signal, analytical mode, structural position, valence, and pair scope.
- [ ] Add new signals only where current records support them reliably: pair identity, shift magnitude, direction, dimension, co-occurring cause, and downstream consequence.
- [ ] Cover distinct arc families such as alliance formation, trust erosion, rupture, repair, betrayal, rivalry, dependency, power exchange, and reconciliation.
- [ ] Add per-pair sequence checks rather than generic whole-story permutations.
- [ ] Distinguish earned reversal from oscillation and unmotivated whiplash.
- [ ] Add fire and near-miss no-fire tests for every new rule.
- [ ] Measure corpus fire rates before accepting thresholds.
- [ ] Accept only rules that improve report diversity without increasing good-script false positives.

## Phase 3: Structure Expansion

- [ ] Map existing structure rules by beat, act zone, sequence mode, and supported structure preset.
- [ ] Add position-aware checks that cannot be expressed by current aggregate signals.
- [ ] Prioritize setup-to-turn distance, act-boundary coherence, midpoint function, climax preparation, aftermath, subplot convergence, and final-image resolution.
- [ ] Route structure-preset variants explicitly rather than treating every screenplay as one universal template.
- [ ] Avoid threshold-only duplicates of existing front-loaded, back-loaded, drought, and zone-cluster rules.
- [ ] Add symmetric tests and corpus measurements for each accepted rule.

## Phase 4: Causality Expansion

- [ ] Map the complete lifecycle of cause, action, consequence, clue, belief, relationship shift, clock, revelation, and payoff.
- [ ] Add missing sequence checks for unsupported actions, consequences without causes, causes without fallout, and resolution without effort.
- [ ] Add character-specific causal ownership where the data supports it.
- [ ] Distinguish coincidence that creates trouble from coincidence that resolves trouble.
- [ ] Add backward-cause and downstream-consequence tests with explicit scene windows.
- [ ] Add symmetric tests and measure false positives on produced scripts.

## Phase 5: New Signal Channels

Follow Program v2 Type 1 rules. Do not create hundreds of permutations over existing boolean fields.

- [ ] Want-versus-need divergence.
- [ ] Dramatic-irony gap: audience knowledge versus character knowledge.
- [ ] Relationship power-balance movement within scenes.
- [ ] Setup/payoff distance and semantic linkage.
- [ ] Scene-value change and consequence persistence.
- [ ] Position-aware emotional arc deviations.
- [ ] Character agency and decision ownership.

Each signal requires:

- [ ] Deterministic extraction or an honestly labeled model-assisted path.
- [ ] Analyzer-level fire/no-fire tests.
- [ ] Record parity where both text-derived and ops-derived paths can supply it.
- [ ] Three initial pass checks with distinctness rationale.
- [ ] Corpus calibration before health-score integration.

## Phase 6: Controlled Rule Waves

For every wave:

- [ ] Add exactly three related rules.
- [ ] Document why each rule is distinct from existing siblings.
- [ ] Add six tests: fire and near-miss no-fire for each rule.
- [ ] Run the owning pass test file.
- [ ] Run calibration and discrimination tests.
- [ ] Run full `npm test`, `npm run lint`, and `npm run build`.
- [ ] Run `npm run rulebook` only after all tests are green.
- [ ] Record corpus firing rates and score movement.

## Phase 7: Variety Without Randomness

The engine must remain deterministic. Variety should come from richer state coverage, not random rule selection.

- [ ] Rank findings by evidence, severity, novelty, and root-cause coverage.
- [ ] Collapse redundant symptoms under root-cause templates.
- [ ] Limit repeated findings from the same family in one report.
- [ ] Preserve the strongest evidence-bearing finding when several rules describe the same defect.
- [ ] Track recently surfaced rule families in the UI only if doing so does not hide critical findings.
- [ ] Measure whether reports surface more distinct, useful diagnoses across the corpus.

## Phase 8: Calibration Gates

- [ ] No reference-corpus sample saturates at displayed health 0.
- [ ] Matched-quality scripts stay within the length-invariance tolerance at 2x and 3x length.
- [ ] All hard discrimination pairs preserve ordering.
- [ ] The composite reviewer scenario clears the required five-point gap.
- [ ] Good-script false-positive counts do not increase materially.
- [ ] New rules do not dominate health merely because of their quantity.

## Completion Criteria

The expansion is complete only when:

- [ ] Relationship arc, structure, and causality each gain validated new capabilities, not count-only permutations.
- [ ] Every new rule has symmetric tests.
- [ ] The full suite is green.
- [ ] Rulebook documentation matches live extraction.
- [ ] Corpus reports demonstrate greater diagnostic variety.
- [ ] No calibration or discrimination regression remains.
