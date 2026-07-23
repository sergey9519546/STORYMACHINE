// ── Shared admin-token / loopback gate ────────────────────────────────────
// Extracted from server/routes/config.ts so every route that mutates
// process-global AI-provider configuration (POST /api/ai-config,
// POST /api/ai-config/test, POST /api/ai-providers/switch) shares the exact
// same authorization check instead of each route file re-implementing (and
// potentially drifting from) its own copy.
//
// Default posture: loopback-only until an operator opts into remote config
// by setting ADMIN_TOKEN, at which point the token is required from EVERY
// caller, loopback included (a set token means "only holders of this token",
// not "holders of this token, OR loopback").
import type express from 'express';
import crypto from 'crypto';

// Exported: server/routes/config.ts's GET /metrics reuses both helpers for
// its own (separate) METRICS_TOKEN gate, which needs the identical
// loopback/timing-safe-compare semantics but against a different token.
export function isLoopbackAddress(addr: string | undefined): boolean {
  if (!addr) return false;
  const a = addr.replace(/^::ffff:/, '');
  return a === '127.0.0.1' || a === '::1' || a.startsWith('127.');
}

export function timingSafeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) {
    // Compare against itself so a length mismatch doesn't short-circuit
    // instantly — reduces (does not eliminate) a length-based timing signal,
    // same pattern as collab-auth.ts's verifyCollabToken.
    crypto.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

// Write-gate for any route that mutates process-global AI provider config
// (baseUrl, apiKey, provider selection, ...). GET routes that only ever
// return booleans (never key material) stay open — see getPublicConfig()'s
// own contract — and must NOT call this.
//
// Uses req.ip rather than req.socket.remoteAddress: a config WRITE is a
// sensitive operation, and req.socket always reports the immediate peer —
// behind a reverse proxy (this repo already supports TRUST_PROXY) that peer
// is the proxy itself, not the real client, which would misidentify a
// remote attacker as loopback. req.ip resolves the real client through
// X-Forwarded-For once trust proxy is configured, and falls back to the
// same raw peer address when it isn't.
export function checkAdminAuth(req: express.Request, res: express.Response): boolean {
  const adminToken = process.env.ADMIN_TOKEN;
  if (adminToken) {
    const auth = req.headers.authorization ?? '';
    const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!provided || !timingSafeStringEqual(provided, adminToken)) {
      res.status(401).json({ error: 'Unauthorized' });
      return false;
    }
  } else if (!isLoopbackAddress(req.ip)) {
    res.status(401).json({ error: 'Unauthorized: set ADMIN_TOKEN to configure AI providers remotely' });
    return false;
  }
  return true;
}
