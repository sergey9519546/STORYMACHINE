// The 4-tier proof contract (HYBRID_DECISION §6, decision 3).
// Tier 1 blocks ship. Tier 2 flags for review. Tier 3 ranks. Tier 4 monitors.
// Only the type surface is locked here — proof bodies live under proof/tier*.

export type ProofTier = 1 | 2 | 3 | 4;

export type ProofName =
  // Tier 1 — Hard Blocks (8: the original 7 + EarnedRevealProof)
  | 'TemporalProof' | 'CausalProof' | 'IntentionalProof' | 'MechanismProof'
  | 'EpistemicProof' | 'ContinuityProof' | 'ProvenanceProof' | 'EarnedRevealProof'
  // Tier 2 — Quality Gates
  | 'EmotionProof' | 'RelationshipProof' | 'ThemeProof' | 'ReaderStateProof'
  | 'SpatialProof' | 'DialogueProof' | 'SubtextProof' | 'VoiceProof'
  | 'NecessityProof' | 'ReincorporationProof' | 'SpecificityProof'
  | 'SurpriseProof' | 'PolarityProof'
  // Tier 3 — Ranking Signals
  | 'GenericnessProof' | 'OriginalityProof'
  // Tier 4 — Ethics & Disclosure
  | 'BiasAuditProof' | 'AttributionProof';

export interface ProofFinding {
  proof: ProofName;
  severity: 'block' | 'flag' | 'info';
  message: string;
  subjectId?: string;   // char_id / fact_id / op index the finding refers to
}

export interface ProofResult {
  proof: ProofName;
  tier: ProofTier;
  pass: boolean;
  reason: string;
  findings: ProofFinding[];
}

export interface RepairSuggestion {
  proof: ProofName;
  description: string;
  constraint?: string;   // a concrete corrective constraint to feed back into generation
}

// Exhaustive tier map — adding a ProofName without a tier fails compilation.
export const PROOF_TIERS: Record<ProofName, ProofTier> = {
  TemporalProof: 1, CausalProof: 1, IntentionalProof: 1, MechanismProof: 1,
  EpistemicProof: 1, ContinuityProof: 1, ProvenanceProof: 1, EarnedRevealProof: 1,
  EmotionProof: 2, RelationshipProof: 2, ThemeProof: 2, ReaderStateProof: 2,
  SpatialProof: 2, DialogueProof: 2, SubtextProof: 2, VoiceProof: 2,
  NecessityProof: 2, ReincorporationProof: 2, SpecificityProof: 2,
  SurpriseProof: 2, PolarityProof: 2,
  GenericnessProof: 3, OriginalityProof: 3,
  BiasAuditProof: 4, AttributionProof: 4,
};

// Lawful default (CLEVER_MOVES §20): "pass" is the zero value — a proof returns
// failure only when it actively found something wrong.
export function passResult(proof: ProofName, reason = 'ok'): ProofResult {
  return { proof, tier: PROOF_TIERS[proof], pass: true, reason, findings: [] };
}

export function failResult(proof: ProofName, reason: string, findings: ProofFinding[]): ProofResult {
  return { proof, tier: PROOF_TIERS[proof], pass: false, reason, findings };
}
