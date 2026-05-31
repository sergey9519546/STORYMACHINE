// ── Prompt registry (M3 foundation) ──────────────────────────────────────────
// A self-contained, versionable prompt template system. Prompts live as `.txt`
// files in server/prompts/ with `{{variable}}` placeholders. getPrompt() loads,
// caches, and interpolates them.
//
// This is the bundled-file fallback layer described in the ULTRAPLAN: it works
// with zero external services. A future Langfuse integration can layer on top by
// having getPrompt() consult a remote registry first and fall back to these
// files when the network is unavailable — the call sites do not change.
//
// Design notes:
//  - Templates are cached after first read (prompts are immutable at runtime).
//  - Interpolation is intentionally simple and safe: {{name}} is replaced by the
//    string value of vars.name; unknown placeholders collapse to empty string.
//    Values are NOT executed — this is plain text substitution, not eval.
//  - Variable *values* should already be sanitized by the caller (C1) when they
//    originate from user input; the registry does not sanitize for you.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.ts';

const PROMPT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'prompts');

const cache = new Map<string, string>();

/** Read a raw template from disk (cached). Returns '' if the file is missing. */
function loadTemplate(name: string): string {
  const cached = cache.get(name);
  if (cached !== undefined) return cached;
  // Guard against path traversal: only a bare prompt name is allowed.
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(name)) {
    logger.warn('prompt_invalid_name', { name });
    cache.set(name, '');
    return '';
  }
  let text = '';
  try {
    text = fs.readFileSync(path.join(PROMPT_DIR, `${name}.txt`), 'utf8');
  } catch {
    logger.warn('prompt_missing', { name });
  }
  cache.set(name, text);
  return text;
}

/** Interpolate `{{var}}` placeholders against vars. Pure — exported for tests. */
export function renderTemplate(template: string, vars: Record<string, string | number | undefined> = {}): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const v = vars[key];
    return v === undefined || v === null ? '' : String(v);
  });
}

/**
 * Resolve a named prompt with its variables interpolated.
 * Returns the rendered string, or '' (logged) if the prompt file is absent.
 */
export function getPrompt(name: string, vars: Record<string, string | number | undefined> = {}): string {
  return renderTemplate(loadTemplate(name), vars);
}

/** True if a prompt template file exists and is non-empty. */
export function hasPrompt(name: string): boolean {
  return loadTemplate(name).length > 0;
}

/** Clear the template cache — primarily for tests that write fixture prompts. */
export function _clearPromptCache(): void {
  cache.clear();
}
