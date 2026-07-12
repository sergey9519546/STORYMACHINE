# Annotation guide (codebook)

Four levels. Store DERIVED labels only — never verbatim screenplay text.

1. **Script** — genre[], format, tone[], dramatic question, protagonist want/need/wound/lie, primary mechanisms, genre promises, ending contract, act map, major reveals, object arcs, relationship arcs.
2. **Scene** — sceneFunction, activeMechanism, participants, focal character, before/after state, objectives, obstacles, concealment pressures, opening/closing power holder, setup/payoff ids, revealMode, visual carrier, object changes, audienceKnowledgeDelta.
3. **Beat** — actor, action(abstracted), objective, tactic, target, pressure source, responseMode, causal parent, stateDelta[].
4. **Dialogue atom** — speaker, mode, surfaceFunction, hiddenIntent(abstracted), tactic, subtextMeaning(abstracted), knowledgeSource, knowledgeLegal, relationshipPressure, activeMechanism, stateDeltas, voiceFeatures.

Rules: a scene labeled "good" must change >=1 tracked state. A repair must pay a
cost. A reveal must have prior setup. Never store exact lines; abstract intent
and subtext into labels. Double-annotate a sample; adjudicate disagreements.

Splitting for hidden eval: split by SCRIPT / WRITER / STUDIO / STORY-WORLD —
never random scenes from one screenplay across train and eval (that measures
memorization).
