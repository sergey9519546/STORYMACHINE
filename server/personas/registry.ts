// ── Copilot persona registry (P9) ────────────────────────────────────────────
// Loads built-in personas from JSON files in this directory and holds any
// user-uploaded personas in memory. Provides lookup + prompt-block construction
// for the inline copilot completion endpoint.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validatePersona } from './types.ts';
import type { CopilotPersona } from './types.ts';
import { sanitizeForPrompt } from '../lib/prompt-utils.ts';
import { logger } from '../lib/logger.ts';

const PERSONA_DIR = path.dirname(fileURLToPath(import.meta.url));

// Built-in personas are loaded once at module init from the JSON files alongside
// this module. User personas are layered on top in a separate map so a custom
// persona can override a built-in by id without mutating the on-disk set.
const builtins = new Map<string, CopilotPersona>();
const userPersonas = new Map<string, CopilotPersona>();

function loadBuiltins(): void {
  let files: string[];
  try {
    files = fs.readdirSync(PERSONA_DIR);
  } catch {
    return;
  }
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(PERSONA_DIR, file), 'utf8'));
      const persona = validatePersona({ ...raw, builtin: true });
      if (persona) builtins.set(persona.id, persona);
      else logger.warn('persona_invalid_builtin', { file });
    } catch (err) {
      logger.warn('persona_load_failed', { file, error: (err as Error).message });
    }
  }
}
loadBuiltins();

/** Return every persona (built-ins, then user personas override by id). */
export function listPersonas(): CopilotPersona[] {
  const merged = new Map<string, CopilotPersona>(builtins);
  for (const [id, p] of userPersonas) merged.set(id, p);
  return [...merged.values()];
}

/** Resolve a persona by id, falling back to 'default' then the first built-in. */
export function getPersona(id: string | undefined): CopilotPersona | undefined {
  if (id) {
    const found = userPersonas.get(id) ?? builtins.get(id);
    if (found) return found;
  }
  return builtins.get('default') ?? builtins.values().next().value;
}

/**
 * Register a user-supplied persona. Returns the normalized persona on success
 * or null if validation failed. Built-in ids cannot be permanently overwritten
 * on disk, but a user persona with the same id will shadow it at lookup time.
 */
export function registerUserPersona(raw: unknown): CopilotPersona | null {
  const persona = validatePersona(raw);
  if (!persona) return null;
  // Never let a user persona claim builtin status.
  const normalized: CopilotPersona = { ...persona, builtin: false };
  userPersonas.set(normalized.id, normalized);
  return normalized;
}

/** Clear all user personas — primarily for tests. */
export function _resetUserPersonas(): void {
  userPersonas.clear();
}

/**
 * Build the prompt preamble block for a persona, fully sanitized for injection.
 * Returns the systemPreamble followed by any context-injector bullet lines.
 */
export function personaPromptBlock(persona: CopilotPersona): string {
  const lead = sanitizeForPrompt(persona.systemPreamble, 2000);
  const injectors = (persona.contextInjectors ?? [])
    .map(line => `- ${sanitizeForPrompt(line, 300)}`)
    .join('\n');
  return injectors ? `${lead}\n${injectors}` : lead;
}
