// ── Copilot persona registry (P9) ────────────────────────────────────────────
// Loads built-in personas from JSON files in this directory and holds any
// user-uploaded personas in memory. Provides lookup + prompt-block construction
// for explicit Copilot/persona workflows.

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

/** Cap on stored user personas. `userPersonas` is process-global and the
 *  register route is anonymous (gameLimiter, 120/min), so without a ceiling a
 *  single caller could grow this map without bound. Well above any real
 *  usage — a writer curates a handful of copilot voices, not hundreds. */
const MAX_USER_PERSONAS = 64;

/** Why registration can fail, so the route can answer with the right status
 *  and a message that tells the caller what to change. */
export type PersonaRegisterError = 'invalid' | 'builtin_id' | 'capacity';

/**
 * Register a user-supplied persona. Returns the normalized persona, or an
 * error code.
 *
 * SECURITY (2026-08-03 audit). `userPersonas` is a single module-level map
 * shared by every request this process serves, and `getPersona` resolves
 * `userPersonas.get(id) ?? builtins.get(id)` — the user map wins. Registering
 * a persona under a BUILTIN id (`default`, `noir-specialist`, …) therefore
 * replaced what every other user of the deployment received, including the
 * `default` persona that callers get implicitly. Since a persona carries a
 * `systemPreamble` and `contextInjectors` that go straight into the model
 * prompt, that was an anonymous, persistent, cross-session prompt-injection
 * vector — `sanitizeForPrompt` strips control characters, it is not a content
 * filter. Builtin ids are now refused outright.
 *
 * Shadowing a builtin was never a needed capability: a custom voice can use
 * any other id. Deliberately NOT gated behind checkAdminAuth — registering a
 * personal copilot voice is an ordinary user action, unlike flipping the
 * process's AI provider, and admin-gating it would remove a real feature to
 * fix a bug that a collision check fixes precisely.
 */
export function registerUserPersona(raw: unknown): CopilotPersona | PersonaRegisterError {
  const persona = validatePersona(raw);
  if (!persona) return 'invalid';
  if (builtins.has(persona.id)) return 'builtin_id';
  if (!userPersonas.has(persona.id) && userPersonas.size >= MAX_USER_PERSONAS) return 'capacity';
  // Never let a user persona claim builtin status.
  const normalized: CopilotPersona = { ...persona, builtin: false };
  userPersonas.set(normalized.id, normalized);
  return normalized;
}

/** True when the value is a registration failure rather than a persona. */
export function isPersonaRegisterError(
  v: CopilotPersona | PersonaRegisterError,
): v is PersonaRegisterError {
  return typeof v === 'string';
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
