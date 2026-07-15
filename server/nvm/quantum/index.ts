// Quantum Narrative Field — Public API
//
// Exports all quantum field components for use in StoryMachine V5.0

// Core types
export type {
  QuantumStoryState,
  QuantumFieldConfig,
  QuantumFieldSnapshot,
  CollapseResult,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  EntanglementEdge,
  EntanglementGraph,
  QuantumOperation,
} from './types.ts';

// Default configurations
export {
  DEFAULT_QUANTUM_CONFIG,
  FAST_QUANTUM_CONFIG,
} from './types.ts';

// Main quantum field
export {
  QuantumNarrativeField,
  createQuantumField,
} from './story-field.ts';

// Entanglement tracking
export {
  EntanglementGraphBuilder,
  EntanglementAnalyzer,
  createEntanglementGraph,
  mergeEntanglementGraphs,
} from './entanglement.ts';
