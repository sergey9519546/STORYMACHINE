// ── Copilot persona plugin contract (P9) ─────────────────────────────────────
// A CopilotPersona customizes the inline ghost-text copilot's voice and behavior.
// Built-in personas ship as JSON in this directory; users may upload their own.
//
// The persona's `systemPreamble` is injected into the completion prompt ahead of
// the FIM body, steering the model toward a particular showrunner voice, genre
// specialty, or co-writer style. `temperature` and `maxOutputTokens` let a persona
// trade determinism for surprise. `contextInjectors` are named, declarative hints
// (not arbitrary code — for safety) that the registry expands into prompt lines.

export interface CopilotPersona {
  /** Stable kebab-case identifier, unique across the registry. */
  id: string;
  /** Human-readable name shown in the persona picker. */
  name: string;
  /** One-line description of what this persona is good at. */
  description: string;
  /**
   * The voice/role instruction injected at the top of the completion prompt.
   * Replaces the generic "You are an expert screenplay writer" lead-in.
   */
  systemPreamble: string;
  /** Optional per-persona sampling temperature (0–2). Falls back to the route default. */
  temperature?: number;
  /** Optional per-persona output cap in tokens. Falls back to the route default. */
  maxOutputTokens?: number;
  /**
   * Declarative context hints. Each becomes a bullet line appended to the
   * persona block, e.g. "- Favor short, punchy action lines under 3 lines."
   */
  contextInjectors?: string[];
  /** True for personas that ship with the app (non-deletable). */
  builtin?: boolean;
}

/** Field-length caps used when validating an untrusted (user-uploaded) persona. */
export const PERSONA_LIMITS = {
  id: 64,
  name: 80,
  description: 240,
  systemPreamble: 2000,
  injector: 300,
  maxInjectors: 12,
} as const;

/**
 * Validate and normalize an untrusted persona object. Returns a clean
 * CopilotPersona or null if the input is structurally invalid. Pure — no I/O.
 * Strings are length-clamped here; prompt-time sanitization happens separately
 * at the interpolation site (C1).
 */
export function validatePersona(raw: unknown): CopilotPersona | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const id = typeof r.id === 'string' ? r.id.trim().slice(0, PERSONA_LIMITS.id) : '';
  // id must be kebab/alnum so it is safe as a registry key and URL param
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(id)) return null;

  const name = typeof r.name === 'string' ? r.name.trim().slice(0, PERSONA_LIMITS.name) : '';
  if (!name) return null;

  const systemPreamble = typeof r.systemPreamble === 'string'
    ? r.systemPreamble.trim().slice(0, PERSONA_LIMITS.systemPreamble)
    : '';
  if (!systemPreamble) return null;

  const description = typeof r.description === 'string'
    ? r.description.trim().slice(0, PERSONA_LIMITS.description)
    : '';

  const temperature = typeof r.temperature === 'number' && isFinite(r.temperature)
    ? Math.max(0, Math.min(2, r.temperature))
    : undefined;

  const maxOutputTokens = typeof r.maxOutputTokens === 'number' && isFinite(r.maxOutputTokens)
    ? Math.max(16, Math.min(1024, Math.round(r.maxOutputTokens)))
    : undefined;

  const contextInjectors = Array.isArray(r.contextInjectors)
    ? r.contextInjectors
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .slice(0, PERSONA_LIMITS.maxInjectors)
        .map(x => x.trim().slice(0, PERSONA_LIMITS.injector))
    : undefined;

  return {
    id,
    name,
    description,
    systemPreamble,
    ...(temperature !== undefined ? { temperature } : {}),
    ...(maxOutputTokens !== undefined ? { maxOutputTokens } : {}),
    ...(contextInjectors && contextInjectors.length > 0 ? { contextInjectors } : {}),
    builtin: r.builtin === true,
  };
}
