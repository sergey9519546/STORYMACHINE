// Prompt injection defense utilities.
// Call sanitizeForPrompt() on every user-controlled string before interpolating
// it into an LLM system or user prompt.

// Strip: NUL–BS, VT, FF, CR, SO–US, DEL.
// Keep: TAB (\x09) and LF (\x0a) — both are valid in Fountain/prose.
const CONTROL_CHAR_RE = /[\x00-\x08\x0b\x0c\x0d\x0e-\x1f\x7f]/g;

/**
 * Strip control characters and truncate to maxLen before embedding a
 * user-controlled value inside an LLM prompt.
 *
 * This prevents the most common prompt-injection patterns (newline injection,
 * embedded instruction overrides, null-byte tricks).  It does NOT XML-encode
 * angle brackets because Fountain / prose text legitimately contains `<` / `>`.
 *
 * @param value  Raw user-supplied string (name, motive, dialogue, scene text …)
 * @param maxLen Hard cap — choose a value appropriate for the field type:
 *               name → 256, motive / mask → 2000, dialogue / scene → 8000
 */
export function sanitizeForPrompt(value: string, maxLen = 2000): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(CONTROL_CHAR_RE, ' ')   // replace control chars with a space (preserves word boundaries)
    .substring(0, maxLen)
    .trim();
}
