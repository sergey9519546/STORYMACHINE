// route-capabilities — T-15 (2026-07-14 audit): the completeness walk for
// this codebase's single highest-leverage guard, "every route carries a
// limiter; every route that can reach an LLM carries aiLimiter
// specifically." That invariant is enforced only by convention and has
// ALREADY drifted three times now: /api/turn and /api/simulate-to-fountain
// sat on gameLimiter while reaching up to 4 and ~40 provider calls per
// request (fixed in 3a4a905); GET /api/ai-config had no limiter at all
// (also 3a4a905); and — found while building THIS test —
// POST /api/nvm/live/advance sat on gameLimiter while reaching up to ~20
// provider calls per request via advanceWorld() -> orchestrator.runTurn() ->
// agent.takeTurn() -> generateContent() (fixed alongside this file; see
// server/routes/nvm/live.ts's comment on that route).
//
// This file is deliberately NOT tests/routes/limiters.test.ts: that file
// proves 429 behavior (a burst against two sample routes, over real HTTP, at
// deliberately non-trivial wall-clock cost). This file proves COMPLETENESS —
// that the mapping from "every route Express actually serves" to "the right
// limiter tier" has no gaps — via a pure, static walk of the booted app's own
// router tree. No HTTP requests are made at all (no server is even listen()'d
// — see the app construction below), so this stays fast and fully
// deterministic: nothing here depends on timing, network ports, or request
// ordering.
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
// Side effect only: sets process.env.SESSION_DB_DIR = ':memory:' at module
// top level (see helpers.ts's own comment) — must happen before
// server/app.ts (and transitively server/lib/session-store.ts) is ever
// imported, including the dynamic import below, so this session's route walk
// never touches data/sessions/*.db on disk.
import './helpers.ts';

// ── Route enumeration ───────────────────────────────────────────────────────
// Walks Express 4's real router tree (app._router.stack) rather than
// maintaining a hand-written route list — the entire point of this test is
// catching routes ADDED later without anyone remembering to update a parallel
// list here.
//
// Path reconstruction: every router in this codebase is mounted with NO path
// prefix — server/app.ts does `app.use(configRouter)` (not
// `app.use('/some/prefix', configRouter)`) for all seven top-level routers,
// and server/routes/nvm/index.ts does the same `router.use(subRouter)` (no
// prefix) for all eight NVM sub-routers — so every route's full path already
// lives on `layer.route.path` with nothing to prepend. Rather than silently
// assuming that forever, `assertRootMount` below checks Express's own
// `layer.regexp.fast_slash` marker (path-to-regexp's internal flag for
// exactly "this layer was mounted at '/'") on every nested-router layer we
// descend into, so a future `app.use('/prefix', someRouter)` fails this test
// loudly — with a message saying which layer broke the assumption — instead
// of silently producing wrong paths that this test would then quietly
// misjudge.
//
// A `layer.route` object only exists for layers created by
// `router.<method>(path, ...)` / `router.route(path)` — i.e. an actual
// registered route with a method. Plain `router.use(...)`/`app.use(...)`
// middleware (express.json(), the request logger, the security-header
// setters, the final `/api` 404 catch-all, the global error handler) has no
// `.route` and isn't named 'router', so it's naturally excluded from the walk
// — those aren't routes, they're middleware, which is exactly the
// distinction this test needs.
interface WalkedRoute {
  method: string;
  path: string;
  handles: unknown[];
}

function assertRootMount(layer: { regexp?: { fast_slash?: boolean }; name?: string }, path: string): void {
  assert.ok(
    layer.regexp?.fast_slash,
    `Route walk assumption violated: a nested router layer near "${path}" is mounted with a ` +
    `non-root path prefix (layer.regexp.fast_slash is falsy). This test's path reconstruction ` +
    `assumes every router.use()/app.use() in this codebase mounts sub-routers at '/' with no ` +
    `prefix argument — that assumption no longer holds, so route paths below may be wrong. ` +
    `Fix the walk in tests/routes/route-capabilities.test.ts to prepend the real mount prefix.`,
  );
}

function walkRoutes(stack: unknown[], prefix = ''): WalkedRoute[] {
  const out: WalkedRoute[] = [];
  for (const raw of stack) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layer = raw as any;
    if (layer.route) {
      const path: string = prefix + layer.route.path;
      const methods: string[] = Object.keys(layer.route.methods).filter((m) => layer.route.methods[m]);
      for (const method of methods) {
        const handles: unknown[] = layer.route.stack.map((l: { handle: unknown }) => l.handle);
        out.push({ method: method.toUpperCase(), path, handles });
      }
    } else if (layer.name === 'router' && layer.handle?.stack) {
      assertRootMount(layer, prefix || '(root)');
      out.push(...walkRoutes(layer.handle.stack, prefix));
    }
  }
  return out;
}

function routeKey(r: { method: string; path: string }): string {
  return `${r.method} ${r.path}`;
}

// ── Limiter identity ─────────────────────────────────────────────────────────
// Identified by REFERENCE EQUALITY against session-store.ts's exports, not by
// function name — express-rate-limit's returned middleware can be
// minified/renamed and name-string matching would silently stop working.
// Each of gameLimiter/aiLimiter/heavyBodyLimiter is a module-level singleton
// (session-store.ts) shared by every route that imports it (same reasoning
// tests/routes/limiters.test.ts documents for why its burst counters need a
// clean process), so `handles.includes(gameLimiter)` is a sound identity
// check across the entire router tree.
function limiterTierOf(
  handles: unknown[],
  gameLimiter: unknown,
  aiLimiter: unknown,
  heavyBodyLimiter: unknown,
): 'game' | 'ai' | 'heavy' | 'none' {
  if (handles.includes(aiLimiter)) return 'ai';
  if (handles.includes(gameLimiter)) return 'game';
  if (handles.includes(heavyBodyLimiter)) return 'heavy';
  return 'none';
}

// ── Exemption list ──────────────────────────────────────────────────────────
// Routes deliberately carrying NO rate limiter. Adding an entry here must be
// a visible, reviewable act — every entry needs its own one-line
// justification, and the assertion below fails for ANY unlimited route not
// listed here (so a future route added with no limiter — the exact class of
// bug this test exists to catch — fails loudly instead of silently passing).
const exemptRoutes: ReadonlyArray<{ method: string; path: string; reason: string }> = [
  {
    method: 'GET', path: '/health',
    reason: 'Documented-intentional (server/routes/config.ts): liveness probe that must answer even when Gemini/keys/everything else is down; leaks only an uptime/session count, no rate-limitable cost.',
  },
  {
    method: 'GET', path: '/metrics',
    reason: 'Has its own auth gate (server/routes/config.ts): loopback-only by default, or a constant-time Bearer-token check when METRICS_TOKEN is set (404 on any miss) — an unauthenticated caller cannot reach it at all, so a request-volume limiter adds nothing a 404-on-mismatch gate does not already provide.',
  },
];

// ── LLM-reaching classification ─────────────────────────────────────────────
// Built by reading every route handler chain in server/routes/*.ts and
// server/routes/nvm/*.ts (not carried over from the audit's route table
// without re-verification) for reachability to generateContent /
// generateContentStream / geminiProvider.generate in server/engine/ai.ts —
// including indirect reachability through the revision pipeline
// (server/nvm/revision/rewrite.ts's rewritePass, used by all 14
// server/nvm/revision/passes/*.ts), the LLM candidate generator
// (server/nvm/generate/llm-generator.ts's makeLLMCandidateGenerator, which
// calls geminiProvider.generate directly — bypassing the generateContent()
// wrapper but hitting the same SDK call), and the Orchestrator's per-turn
// agent decision loop (server/engine/Agent.ts's takeTurn -> generateContent,
// reached via server/engine/Orchestrator.ts's runTurn, reached via
// server/nvm/live/loop.ts's reactToCommit/advanceWorld).
const llmRoutes: ReadonlySet<string> = new Set([
  // server/routes/config.ts
  'POST /api/ai-config/test',            // generateContent — connection-test probe call
  // server/routes/game.ts
  'POST /api/turn',                      // Agent.takeTurn -> up to 4 generateContent calls
  'POST /api/game/interview',            // one direct generateContent call
  'POST /api/run-room',                  // runRoomSimulation -> Agent.takeTurn fan-out
  'GET /api/run-room-stream',            // SSE variant of /api/run-room, same fan-out
  'POST /api/run-scene',                 // multi-agent scene fan-out, same call path
  'POST /api/simulate-to-fountain',      // up to ~10 turns x up to 4 calls = ~40 calls/request
  // server/routes/scriptide.ts
  'POST /api/scriptide/doctor/deep',     // runScriptDoctor(..., {deepRead:true}) — up to ~10 LLM calls
  'POST /api/scriptide/fix',             // fixAndVerify's one generation call
  'GET /api/scriptide/complete',         // generateContentStream (SSE inline-completion)
  'POST /api/scriptide/world-build',     // direct generateContent call
  'POST /api/scriptide/refine-dialogue', // direct generateContent call
  'POST /api/scriptide/analyze-tension', // direct generateContent call
  'POST /api/scriptide/clean-action',    // direct generateContent call
  'POST /api/scriptide/character-profile', // direct generateContent call
  'POST /api/analyze-script',            // direct generateContent call
  // server/routes/nvm/converge.ts — all three reach the LLM via
  // makeLLMCandidateGenerator() -> geminiProvider.generate()
  'POST /api/nvm/converge',
  'GET /api/nvm/converge-stream',
  'POST /api/nvm/converge-arc',
  // server/routes/nvm/live.ts — advanceWorld -> orchestrator.runTurn ->
  // agent.takeTurn -> generateContent, up to `beats` (clamped to 5) times.
  // Found MISCLASSIFIED (on gameLimiter) while building this test — fixed
  // alongside this file; see that route's own comment in live.ts.
  'POST /api/nvm/live/advance',
  // server/routes/nvm/revision.ts — both reach the LLM via the 14-pass
  // pipeline's rewritePass (server/nvm/revision/rewrite.ts)
  'POST /api/nvm/revise',
  'GET /api/nvm/revise-stream',
  // server/routes/nvm/selfplay.ts — runSelfPlay is handed
  // makeLLMCandidateGenerator() the same way converge.ts is
  'POST /api/nvm/selfplay',
]);

// ── Deterministic classification ────────────────────────────────────────────
// Every other enumerated route: no generateContent/generateContentStream/
// geminiProvider.generate anywhere on its call path, verified per-file
// against server/routes/*.ts and server/routes/nvm/*.ts's own imports (none
// of these files import server/engine/ai.ts, or — for the nvm/* modules
// below — their handlers' dynamic imports never resolve to a module that
// does). A handful carry an explicit route-level comment saying so
// (POST /api/scriptide/doctor, POST /api/scriptide/diagnose,
// POST /api/nvm/whatif/explore) — this list re-verifies the rest against
// source rather than trusting those comments alone.
const deterministicRoutes: ReadonlySet<string> = new Set([
  // server/routes/config.ts
  'GET /api/ai-config', 'POST /api/ai-config',
  'GET /api/pacing-target', 'POST /api/pacing-target',
  'GET /api/story-config',
  'POST /api/emotional-arc', 'POST /api/director-style', 'POST /api/story-genre',
  'POST /api/story-tone', 'POST /api/character-arc-mode', 'POST /api/story-theme',
  'GET /api/outline', 'POST /api/outline', 'DELETE /api/outline', 'POST /api/outline/apply-preset',
  'GET /api/session/export', 'POST /api/session/import',
  // server/routes/ai-providers.ts
  'GET /api/ai-providers', 'POST /api/ai-providers/switch',
  // server/routes/collab.ts
  'POST /api/collab/token',
  // server/routes/events.ts
  'POST /api/events', 'GET /api/events/summary',
  // server/routes/export.ts
  'POST /api/export/fdx', 'POST /api/export/docx', 'POST /api/export/print-html',
  'POST /api/export/coverage', 'POST /api/export/slate', 'POST /api/export/breakdown',
  'POST /api/export/pitchkit', 'POST /api/export/verify',
  // server/routes/game.ts
  'POST /api/init',
  'GET /api/scenes', 'GET /api/ledger', 'GET /api/state', 'POST /api/reset',
  'GET /api/ledger/fountain',
  'GET /api/simulation/illusion-state', 'GET /api/beat-traces',
  'GET /api/dramatic-pressure/:charId', 'GET /api/belief-edges',
  'GET /api/goal-mutations/:charId', 'GET /api/goal-mutations',
  'GET /api/dramatic-pressure-all', 'GET /api/persuasion/:charId',
  'POST /api/qbn/filter-choices', 'POST /api/ncp-storyform',
  // server/routes/scriptide.ts
  'POST /api/scriptide/save', 'GET /api/scriptide/load',
  'POST /api/scriptide/doctor',          // runDiagnoseOnly-gated, pure CPU (route's own comment)
  'POST /api/scriptide/doctor/pdf',      // pdfToFountain + runScriptDoctor with NO deepRead — heavyBodyLimiter, not aiLimiter
  'POST /api/scriptide/diagnose',        // runDiagnoseOnly-gated, pure CPU (route's own comment)
  'GET /api/scriptide/personas', 'POST /api/scriptide/personas',
  'POST /api/characters/export', 'POST /api/characters/import',
  // server/routes/nvm/analysis.ts
  'GET /api/nvm/tension', 'GET /api/nvm/metrics', 'GET /api/nvm/two-reader', 'GET /api/nvm/topology',
  'POST /api/nvm/quality', 'GET /api/nvm/momentum', 'GET /api/nvm/sidecar',
  'GET /api/nvm/quality/scene/:commitId',
  'POST /api/nvm/analyze/compare',       // vectorizeScript/clusterCorpus are feature extraction, not LLM calls
  'GET /api/nvm/analyze/corpus-stats',
  'GET /api/nvm/epistemic', 'GET /api/nvm/health', 'GET /api/nvm/character-arc',
  'GET /api/nvm/arc-timeline', 'GET /api/nvm/arc-completion', 'GET /api/nvm/regression',
  'GET /api/nvm/momentum-dashboard', 'GET /api/nvm/voice-dna', 'GET /api/nvm/conflicts',
  // server/routes/nvm/commits.ts
  'GET /api/nvm/commits', 'GET /api/nvm/commits/:commitId', 'GET /api/nvm/ghost-commits',
  'POST /api/nvm/ghost-commits/branch', 'GET /api/nvm/manifest', 'POST /api/nvm/inject-ops',
  'POST /api/nvm/converge/commit',
  // server/routes/nvm/debug.ts
  'GET /api/debug/explain/:eventId', 'GET /api/debug/explain-scene/:locationId',
  'GET /api/nvm/project/:target', 'GET /api/nvm/proof/:commitId', 'POST /api/nvm/repair',
  // server/routes/nvm/live.ts
  'POST /api/nvm/room/critique',         // pure functions of (ir, state), no I/O — route's own comment
  'POST /api/nvm/live/move', 'GET /api/nvm/live/feed',
  // server/routes/nvm/revision.ts
  'GET /api/nvm/screenplay/memory', 'POST /api/nvm/compile',
  // server/routes/nvm/selfplay.ts
  'GET /api/nvm/corpus', 'GET /api/nvm/genome/current',
  'POST /api/nvm/genome/diff', 'POST /api/nvm/genome/breed',
  // server/routes/nvm/twin-whatif.ts
  'POST /api/nvm/redteam', 'GET /api/nvm/twin/scm', 'POST /api/nvm/twin/do',
  'POST /api/nvm/whatif/explore',        // route's own comment: DETERMINISTIC, KEYLESS
  'POST /api/nvm/author/fixed-points', 'POST /api/nvm/author/backchain',
  'GET /api/nvm/branch/field',
]);

describe('route-capabilities — completeness walk (T-15)', () => {
  let routes: WalkedRoute[];
  let gameLimiter: unknown;
  let aiLimiter: unknown;
  let heavyBodyLimiter: unknown;

  before(async () => {
    const sessionStore = await import('../../server/lib/session-store.ts');
    gameLimiter = sessionStore.gameLimiter;
    aiLimiter = sessionStore.aiLimiter;
    heavyBodyLimiter = sessionStore.heavyBodyLimiter;

    // No server/app.listen() call anywhere in this file — createApp() alone
    // fully builds the router tree we need to walk, and never binding a port
    // is exactly why this test needs no `before`/`after` HTTP server
    // lifecycle the way every other tests/routes/*.test.ts file does.
    const { createApp } = await import('../../server/app.ts');
    const app = await createApp({ serveStatic: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    routes = walkRoutes((app as any)._router.stack);
  });

  it('walked at least the known route count (sanity floor against a broken walk)', () => {
    // Not an exact-count assertion (that would be the hand-written list this
    // test exists to avoid) — just a floor so a walker that silently returns
    // zero routes (e.g. a future Express major version renaming `_router`)
    // fails here with a clear signal instead of vacuously passing every
    // assertion below over an empty array.
    assert.ok(routes.length >= 100, `expected >=100 routes, walked ${routes.length} — route walk may be broken`);
  });

  it('every enumerated route carries gameLimiter, aiLimiter, or heavyBodyLimiter, unless explicitly exempted', () => {
    const exemptKeys = new Set(exemptRoutes.map(routeKey));
    const failures: string[] = [];
    for (const r of routes) {
      const key = routeKey(r);
      const tier = limiterTierOf(r.handles, gameLimiter, aiLimiter, heavyBodyLimiter);
      if (tier === 'none' && !exemptKeys.has(key)) {
        failures.push(key);
      }
    }
    assert.deepEqual(
      failures, [],
      `route(s) with NO rate limiter and no exemption entry: ${failures.join(', ')}. ` +
      `Add gameLimiter/aiLimiter/heavyBodyLimiter, or add a justified entry to exemptRoutes ` +
      `in this file if the route is deliberately unlimited.`,
    );
  });

  it('every route is classified in exactly one of {llmRoutes, deterministicRoutes, exemptRoutes} (totality)', () => {
    const exemptKeys = new Set(exemptRoutes.map(routeKey));
    const unclassified: string[] = [];
    const doubleClassified: string[] = [];
    for (const r of routes) {
      const key = routeKey(r);
      const memberships = [llmRoutes.has(key), deterministicRoutes.has(key), exemptKeys.has(key)]
        .filter(Boolean).length;
      if (memberships === 0) unclassified.push(key);
      if (memberships > 1) doubleClassified.push(key);
    }
    assert.deepEqual(
      unclassified, [],
      `route(s) enumerated by the live router but not classified anywhere: ${unclassified.join(', ')}. ` +
      `A new or renamed route must be added to exactly one of llmRoutes, deterministicRoutes, or ` +
      `exemptRoutes in tests/routes/route-capabilities.test.ts — read the handler chain for ` +
      `generateContent/generateContentStream/geminiProvider.generate reachability to decide which.`,
    );
    assert.deepEqual(
      doubleClassified, [],
      `route(s) classified in more than one bucket (llmRoutes/deterministicRoutes/exemptRoutes ` +
      `overlap): ${doubleClassified.join(', ')}. Each route belongs in exactly one.`,
    );
  });

  it('every route classified as LLM-reaching currently carries aiLimiter specifically', () => {
    const byKey = new Map(routes.map((r) => [routeKey(r), r]));
    const failures: string[] = [];
    for (const key of llmRoutes) {
      const r = byKey.get(key);
      if (!r) {
        failures.push(`${key} (classified as LLM-reaching but no longer exists in the live router — stale entry)`);
        continue;
      }
      const tier = limiterTierOf(r.handles, gameLimiter, aiLimiter, heavyBodyLimiter);
      if (tier !== 'ai') {
        failures.push(`${key} (classified as LLM-reaching, but carries '${tier}', not aiLimiter)`);
      }
    }
    assert.deepEqual(failures, [], failures.join('\n'));
  });

  it('every route classified as deterministic does NOT sit on aiLimiter', () => {
    // aiLimiter on a deterministic route is not a security bug (the stricter
    // budget) but IS a classification error — either this test's map is
    // stale, or the route is quietly generating text nobody accounted for.
    // Either way the map has drifted from reality, which is the exact
    // disease this test exists to catch, so this fails rather than merely
    // flagging.
    const byKey = new Map(routes.map((r) => [routeKey(r), r]));
    const failures: string[] = [];
    for (const key of deterministicRoutes) {
      const r = byKey.get(key);
      if (!r) {
        failures.push(`${key} (classified as deterministic but no longer exists in the live router — stale entry)`);
        continue;
      }
      const tier = limiterTierOf(r.handles, gameLimiter, aiLimiter, heavyBodyLimiter);
      if (tier === 'ai') {
        failures.push(`${key} (classified as deterministic, but carries aiLimiter — re-verify against source: either the classification or the route's limiter is wrong)`);
      }
    }
    assert.deepEqual(failures, [], failures.join('\n'));
  });

  it('every exempted route is real and genuinely carries no limiter (exemption list has not gone stale)', () => {
    const byKey = new Map(routes.map((r) => [routeKey(r), r]));
    const failures: string[] = [];
    for (const entry of exemptRoutes) {
      const key = routeKey(entry);
      const r = byKey.get(key);
      if (!r) {
        failures.push(`${key} (exempted but no longer exists in the live router — stale exemption)`);
        continue;
      }
      const tier = limiterTierOf(r.handles, gameLimiter, aiLimiter, heavyBodyLimiter);
      if (tier !== 'none') {
        failures.push(`${key} (exempted as unlimited, but now carries '${tier}' — remove the exemption entry, it now protects itself)`);
      }
    }
    assert.deepEqual(failures, [], failures.join('\n'));
  });
});
