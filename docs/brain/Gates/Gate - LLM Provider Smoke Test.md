---
type: gate
updated: 2026-09-05
sources: [scripts/smoke-llm-providers.mjs, package.json]
status: active
---

# Gate — LLM Provider Smoke Test

**What it checks:** the maintainer command for "the day keys exist" — the
first thing that actually calls a real LLM provider end to end, through
the real `server.ts` (unmodified — the same file `npm run dev` runs) and
the real `.env`, rather than only ever exercising the AI-assisted paths
against in-test mocks. It boots the real server on an isolated port,
calls `GET /api/ai-config` to report `llmReady` and which source is live
— directly exercising CLAUDE.md's documented "checking only one is a
recurring trap" by never trusting a single key source — then, for each
source detected as configured in the real `.env` (`GEMINI_API_KEY`, or
`AI_PROVIDER=openai-compat` + `AI_BASE_URL`), boots a **fresh** isolated
server instance with `AI_PROVIDER` forced to that provider and fires one
real round trip through `POST /api/ai-config/test` — the same
connection-test endpoint the Settings UI already calls, with a fixed
5-word prompt ("Reply with the single word: OK"), `maxOutputTokens` capped
at 8, temperature 0: the cheapest-possible real call that still proves the
round trip works. `aiLimiter` (20 req/min) still applies; this script
fires at most one request per configured provider.

**Command:** `npm run verify:llm-providers` — wraps
`node scripts/smoke-llm-providers.mjs`, no arguments (reads the real
`.env` directly).

**Where it lives:** `scripts/smoke-llm-providers.mjs`, a standalone script,
not wired into CI or `npm test` — it requires a real upstream key and a
real network call, which neither CI nor the deterministic test suite are
meant to depend on. Keyless is a supported state, not a failure: with
nothing configured in `.env`, it prints "keyless — analysis-only mode,
nothing to smoke" and exits 0, consistent with the server's own
keyless-boot design (CLAUDE.md's gotcha; [[Glossary]] "keyless boot"). Its
own header notes it never reads, holds, or prints a key value — not even a
prefix or length — only presence booleans and the provider name.

**What it cannot catch:** anything about response *quality* — the fixed
"Reply with the single word: OK" prompt proves connectivity and
credential validity, not that a provider's actual outline/rewrite/voice
output is any good; it also proves nothing about a provider that is
configured but was not exercised because it does not match one of the two
detected sources (`GEMINI_API_KEY` env var, or the multi-provider
`openai-compat` config) this script knows how to force.

## Sources

- `scripts/smoke-llm-providers.mjs` (full header)
- `package.json` (`verify:llm-providers` script entry)
