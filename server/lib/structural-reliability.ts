// Structural-signal reliability note — shared by ScriptDoctorReport.
// provenance.structuralReliabilityNote (server/nvm/analyze/types.ts,
// populated in doctor.ts's aggregation) and the exported coverage HTML's
// footer caveat (server/lib/coverage-html.ts's buildFooterSection). Both
// need to say EXACTLY the same thing about the SAME scene-count threshold —
// a reader who compares the live report against a printed export must never
// see the engine disagreeing with itself. Extracted to its own leaf module
// (no import from analyze/** or revision/**, same TDZ-avoidance rationale as
// server/lib/rulebook-count.ts) so doctor.ts's aggregation can populate the
// field and coverage-html.ts can become a CONSUMER of that field instead of
// recomputing its own independent copy — tests/core/coverage-html.test.ts
// asserts the two stay in sync.
//
// Category B honesty caveat (2026-07-28): the health formula's density
// normalization absorbs rule-family signal at feature scale — measured in
// scripts/probe-dimension-honesty.mjs, a midpoint-scene drop moves the
// Structure & Pacing dimension by ~10 points at 20 scenes but only ~2 at 80.
// Structural verdicts (act shape, climax placement, escalation) are most
// reliable under ~40 scenes; above that, focus on the dialogue and per-scene
// findings. NORTH_STAR section 2 law #2 documents the property; this note
// surfaces it to the writer/producer.
export const STRUCTURAL_ABSORPTION_THRESHOLD = 40;

/** Undefined (never an empty string) at or below the threshold, so a caller
 *  can use PRESENCE itself as the "does this report need the caveat" test —
 *  matching types.ts's provenance doc comment: "the note present iff
 *  sceneCount > 40". Text is byte-identical to the caveat coverage-html.ts
 *  rendered inline before this extraction. */
export function computeStructuralReliabilityNote(sceneCount: number): string | undefined {
  if (!(sceneCount > STRUCTURAL_ABSORPTION_THRESHOLD)) return undefined;
  return `This draft has ${sceneCount} scenes. The engine's structural signals (act shape, climax `
    + `placement, escalation) are most reliable under ~${STRUCTURAL_ABSORPTION_THRESHOLD} scenes; at `
    + `feature length they're partially absorbed by length-normalization, so weight the dialogue and `
    + `per-scene findings more heavily than the structural verdicts.`;
}
