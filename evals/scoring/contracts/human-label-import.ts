// Human Preference Label JSONL Importer — Phase G Calibration Input
//
// Parses and validates blinded human preference labels (JSONL format) for
// TS-SF calibration. Deterministic, pure parsing with no file I/O side effects.
// Returns typed labels or parse errors with rubric coverage summary.

/** Blinded human preference label (Phase G input; not produced by code). */
export interface HumanPreferenceLabel {
  evaluatorId: string;
  pairId: string;
  candidateA: string;
  candidateB: string;
  preference: 'A' | 'B' | 'tie';
  confidence: number; // 0..1
  rubricBreakdown: Record<string, number>;
  evaluatorRole: 'professional_writer' | 'story_reader' | 'owner';
  notes?: string;
}

export interface ParseResult {
  labels: HumanPreferenceLabel[];
  errors: Array<{
    line: number;
    raw: string;
    reason: string;
  }>;
  summary: {
    totalLines: number;
    parsed: number;
    failed: number;
    rubricDimensions: string[];
    evaluatorRoles: string[];
    preferenceDistribution: Record<'A' | 'B' | 'tie', number>;
  };
}

/**
 * Validate a single label object shape and type constraints.
 * Returns an error message or null if valid.
 */
function validateLabel(obj: unknown): string | null {
  if (typeof obj !== 'object' || obj === null) {
    return 'Expected object, got ' + typeof obj;
  }

  const label = obj as Record<string, unknown>;

  // Required string fields
  const requiredStrings = ['evaluatorId', 'pairId', 'candidateA', 'candidateB'] as const;
  for (const field of requiredStrings) {
    if (typeof label[field] !== 'string') {
      return `${field}: expected string, got ${typeof label[field]}`;
    }
    if ((label[field] as string).length === 0) {
      return `${field}: cannot be empty`;
    }
  }

  // Preference enum
  const preference = label.preference;
  if (typeof preference !== 'string' || !['A', 'B', 'tie'].includes(preference)) {
    return `preference: expected 'A' | 'B' | 'tie', got ${JSON.stringify(preference)}`;
  }

  // Confidence 0..1
  const confidence = label.confidence;
  if (typeof confidence !== 'number') {
    return `confidence: expected number, got ${typeof confidence}`;
  }
  if (confidence < 0 || confidence > 1) {
    return `confidence: expected 0..1, got ${confidence}`;
  }

  // Rubric breakdown: object with numeric values
  const rubricBreakdown = label.rubricBreakdown;
  if (typeof rubricBreakdown !== 'object' || rubricBreakdown === null || Array.isArray(rubricBreakdown)) {
    return `rubricBreakdown: expected object, got ${typeof rubricBreakdown}`;
  }
  for (const [k, v] of Object.entries(rubricBreakdown)) {
    if (typeof v !== 'number') {
      return `rubricBreakdown.${k}: expected number, got ${typeof v}`;
    }
  }

  // Evaluator role enum
  const evaluatorRole = label.evaluatorRole;
  const validRoles = ['professional_writer', 'story_reader', 'owner'];
  if (typeof evaluatorRole !== 'string' || !validRoles.includes(evaluatorRole)) {
    return `evaluatorRole: expected ${validRoles.join(' | ')}, got ${JSON.stringify(evaluatorRole)}`;
  }

  // Optional notes field
  if (label.notes !== undefined && typeof label.notes !== 'string') {
    return `notes: expected string or undefined, got ${typeof label.notes}`;
  }

  return null;
}

/**
 * Parse JSONL text containing HumanPreferenceLabel entries.
 * Pure function: no file I/O side effects.
 *
 * Each line must be a valid JSON object conforming to HumanPreferenceLabel.
 * Returns parsed labels and detailed error info, plus a coverage summary.
 */
export function parseLabels(jsonlText: string): ParseResult {
  const lines = jsonlText.split('\n').filter((line) => line.trim().length > 0);
  const labels: HumanPreferenceLabel[] = [];
  const errors: ParseResult['errors'] = [];
  const rubricDimensions = new Set<string>();
  const evaluatorRoles = new Set<string>();
  const preferenceDistribution: Record<'A' | 'B' | 'tie', number> = { A: 0, B: 0, tie: 0 };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let obj: unknown;

    // Parse JSON
    try {
      obj = JSON.parse(line);
    } catch (e) {
      errors.push({
        line: i + 1,
        raw: line.substring(0, 80) + (line.length > 80 ? '...' : ''),
        reason: `JSON parse error: ${e instanceof Error ? e.message : String(e)}`,
      });
      continue;
    }

    // Validate shape
    const validationError = validateLabel(obj);
    if (validationError) {
      errors.push({
        line: i + 1,
        raw: line.substring(0, 80) + (line.length > 80 ? '...' : ''),
        reason: `Validation failed: ${validationError}`,
      });
      continue;
    }

    // Type-narrow and collect
    const label = obj as HumanPreferenceLabel;
    labels.push(label);

    // Accumulate rubric dimensions
    for (const dim of Object.keys(label.rubricBreakdown)) {
      rubricDimensions.add(dim);
    }

    // Accumulate evaluator roles
    evaluatorRoles.add(label.evaluatorRole);

    // Count preferences
    preferenceDistribution[label.preference]++;
  }

  return {
    labels,
    errors,
    summary: {
      totalLines: lines.length,
      parsed: labels.length,
      failed: errors.length,
      rubricDimensions: Array.from(rubricDimensions).sort(),
      evaluatorRoles: Array.from(evaluatorRoles).sort(),
      preferenceDistribution,
    },
  };
}
