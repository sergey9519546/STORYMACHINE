import express from 'express';
import { gameLimiter } from '../lib/session-store.ts';
import { logger } from '../lib/logger.ts';
import { checkAdminAuth } from '../lib/admin-auth.ts';

const router = express.Router();

// ── Provider availability detection ───────────────────────────────────────────
// Checks which AI providers have their required API keys configured.

interface ProviderInfo {
  id: string;
  available: boolean;
}

function checkProviderAvailability(): ProviderInfo[] {
  const providers: ProviderInfo[] = [];

  // OpenRouter free models
  providers.push({
    id: 'openrouter-free',
    available: !!process.env.OPENROUTER_API_KEY,
  });

  // Gemini (default provider)
  providers.push({
    id: 'gemini',
    available: !!process.env.GEMINI_API_KEY,
  });

  // OpenAI (requires explicit configuration)
  providers.push({
    id: 'openai',
    available: !!(process.env.AI_PROVIDER === 'openai-compat' && process.env.AI_API_KEY && process.env.AI_BASE_URL),
  });

  // Anthropic Claude (future support)
  providers.push({
    id: 'anthropic',
    available: !!process.env.ANTHROPIC_API_KEY,
  });

  return providers;
}

// Determine current active provider based on environment configuration
function getCurrentProvider(): string {
  // Check AI_PROVIDER setting first
  const configuredProvider = process.env.AI_PROVIDER;
  
  if (configuredProvider === 'openai-compat') {
    // Check if it's OpenRouter specifically
    const baseUrl = process.env.AI_BASE_URL || '';
    if (baseUrl.includes('openrouter.ai')) {
      return 'openrouter-free';
    }
    return 'openai';
  }

  // Default to gemini if GEMINI_API_KEY is set
  if (process.env.GEMINI_API_KEY) {
    return 'gemini';
  }

  // Fallback to OpenRouter if that's configured
  if (process.env.OPENROUTER_API_KEY) {
    return 'openrouter-free';
  }

  // Default fallback
  return 'gemini';
}

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/ai-providers
 * 
 * Returns the list of available AI providers and which one is currently active.
 * Response shape:
 * {
 *   providers: [{ id: string, available: boolean }, ...],
 *   current: string
 * }
 */
router.get('/api/ai-providers', gameLimiter, (_req, res) => {
  try {
    const providers = checkProviderAvailability();
    const current = getCurrentProvider();

    res.json({
      providers,
      current,
    });
  } catch (error) {
    logger.error('ai_providers_list_failed', { message: (error as Error).message });
    res.status(500).json({ error: 'Failed to list providers' });
  }
});

/**
 * POST /api/ai-providers/switch
 *
 * Switches the active AI provider. Note: This is a runtime configuration change
 * that affects the current process only. For persistent configuration, users should
 * set environment variables (AI_PROVIDER, AI_BASE_URL, etc.) in their .env file.
 *
 * Body: { provider: string }
 * Response: { success: boolean, provider: string }
 *
 * Admin-gated (server/lib/admin-auth.ts's checkAdminAuth) — this route
 * mutates process.env.AI_PROVIDER/AI_BASE_URL/AI_API_KEY, which is
 * PROCESS-GLOBAL state shared by every session on this server, not just the
 * caller's own. That's the exact same class of mutation
 * POST /api/ai-config (server/routes/config.ts) already gates behind
 * checkAdminAuth — an anonymous remote caller must not be able to flip every
 * concurrent user's AI traffic to a different provider (or blank out the
 * server's own AI_API_KEY) with no authorization check at all, which is what
 * this route did before this gate was added.
 */
router.post('/api/ai-providers/switch', gameLimiter, (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { provider } = req.body as { provider?: unknown };

    if (typeof provider !== 'string') {
      res.status(400).json({ error: 'Missing or invalid provider field' });
      return;
    }

    const providers = checkProviderAvailability();
    const targetProvider = providers.find(p => p.id === provider);

    if (!targetProvider) {
      res.status(400).json({ error: `Unknown provider: ${provider}` });
      return;
    }

    if (!targetProvider.available) {
      res.status(400).json({ 
        error: `Provider ${provider} is not available. Required API key not configured.`,
        hint: getSetupHint(provider),
      });
      return;
    }

    // Apply the provider switch
    // Note: This modifies process.env which affects the current runtime only.
    // For persistent changes, users must update their .env file.
    switch (provider) {
      case 'openrouter-free':
        process.env.AI_PROVIDER = 'openai-compat';
        process.env.AI_BASE_URL = 'https://openrouter.ai/api/v1';
        process.env.AI_API_KEY = process.env.OPENROUTER_API_KEY;
        process.env.AI_MODEL = process.env.AI_MODEL || 'google/gemma-2-9b-it:free';
        process.env.AI_FAST_MODEL = process.env.AI_FAST_MODEL || 'meta-llama/llama-3.2-3b-instruct:free';
        break;

      case 'gemini':
        process.env.AI_PROVIDER = 'gemini';
        // Clear openai-compat settings
        delete process.env.AI_BASE_URL;
        delete process.env.AI_API_KEY;
        break;

      case 'openai':
        // Requires explicit user configuration via Settings panel
        // This case shouldn't be reached without proper AI_BASE_URL already set
        process.env.AI_PROVIDER = 'openai-compat';
        break;

      case 'anthropic':
        // Future: implement Anthropic provider
        res.status(501).json({ error: 'Anthropic provider not yet implemented' });
        return;

      default:
        res.status(400).json({ error: `Unsupported provider: ${provider}` });
        return;
    }

    logger.info('ai_provider_switched', { provider, userId: 'system' });

    res.json({ 
      success: true, 
      provider,
      message: `Switched to ${provider}. Restart server to persist this change.`,
    });
  } catch (error) {
    logger.error('ai_provider_switch_failed', { message: (error as Error).message });
    res.status(500).json({ error: 'Failed to switch provider' });
  }
});

// ── Helper functions ──────────────────────────────────────────────────────────

function getSetupHint(provider: string): string {
  switch (provider) {
    case 'openrouter-free':
      return 'Set OPENROUTER_API_KEY in your .env file. Get a free key at https://openrouter.ai/keys';
    case 'gemini':
      return 'Set GEMINI_API_KEY in your .env file';
    case 'openai':
      return 'Configure AI_PROVIDER=openai-compat, AI_BASE_URL, and AI_API_KEY in your .env or Settings panel';
    case 'anthropic':
      return 'Set ANTHROPIC_API_KEY in your .env file';
    default:
      return 'Check documentation for provider setup instructions';
  }
}

export default router;
