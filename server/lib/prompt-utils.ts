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

/**
 * Sanitize a value destined for a strictly SINGLE-LINE field — a Fountain
 * title-page key (`Title:`, `Credit:`), a slug line, a header — as opposed to
 * a prose block.
 *
 * WHY THIS IS SEPARATE FROM sanitizeForPrompt(). That function deliberately
 * PRESERVES LF, because Fountain body text and prose legitimately contain line
 * breaks (see CONTROL_CHAR_RE's comment above). That makes it the wrong tool
 * for a one-line field: a caller-supplied newline survives it and forges
 * ADDITIONAL lines into the document. On a Fountain title page — a sequence of
 * single-line `Key: value` records terminated by a blank line — that lets a
 * `title` of "A\nCredit: forged" write a second, attacker-chosen title-page
 * key, and a `title` containing a blank line plus arbitrary text write
 * arbitrary screenplay BODY. Both then travel into the LLM prompt that
 * server/nvm/revision/rewrite.ts builds around the compiled draft, where the
 * forged text can impersonate that prompt's own `--- END DRAFT ---` fence.
 * (Found by tests/routes/nvm-revision.test.ts against the three
 * compileScreenplay() call sites in server/routes/nvm/revision.ts.)
 *
 * Collapses every whitespace RUN — line breaks and tabs included — to a single
 * space, so the result is guaranteed to be exactly one line, then applies the
 * same control-character strip and length cap sanitizeForPrompt() uses.
 * Returns '' for a value that is empty or whitespace-only after collapsing;
 * callers wanting a placeholder should supply their own.
 */
export function sanitizeSingleLine(value: string, maxLen = 256): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(CONTROL_CHAR_RE, ' ')   // NUL/CR/etc → space (TAB and LF survive this, by design)
    .replace(/\s+/g, ' ')            // …so collapse every whitespace run, LF included, to one space
    .substring(0, maxLen)
    .trim();
}
