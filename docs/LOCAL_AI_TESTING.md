# Testing generation features without a paid API key

Story Machine's analysis surface (Doctor, diagnose, coverage, what-if, room,
interview receipts) is **deterministic and needs no key at all** — it is the
product's front door and boots in analysis-only mode.

The *generation* features (copilot completion, world-build, refine-dialogue,
clean-action, analyze-tension, and other `/api/scriptide/*` LLM routes) call an
LLM. You can exercise every one of them **without a paid API** in three ways.
All three route through the app's existing OpenAI-compatible provider seam —
no code changes on your side, just environment variables.

---

## Option 1 — Local model with Ollama (truly free, offline, keyless)

The recommended path. Nothing leaves your machine and there is **no key**.

```bash
# one-time
brew install ollama            # or: https://ollama.com/download
ollama serve                   # starts the server on http://localhost:11434
ollama pull llama3.2           # ~2 GB; llama3.2:1b is smaller/faster

# point Story Machine at it (.env)
AI_PROVIDER=openai-compat
AI_BASE_URL=http://localhost:11434/v1
AI_MODEL=llama3.2
AI_FAST_MODEL=llama3.2
# Only if you run the server with NODE_ENV=production — dev/test never needs it:
AI_ALLOW_PRIVATE_NETWORK_TARGETS=true
```

Restart `npm run dev` and the generation routes light up. `GET /api/ai-config`
now reports `llmReady: true` even though no key is stored.

Ollama ignores the `Authorization` header, so `AI_API_KEY` is left unset. The
server wires the provider on `AI_BASE_URL` alone and sends a placeholder token.

## Option 2 — Local model with LM Studio (keyless, has a GUI)

1. Install LM Studio, download any instruct model, click **Start Server**.
2. It exposes an OpenAI-compatible endpoint (default `http://localhost:1234/v1`).

```bash
AI_PROVIDER=openai-compat
AI_BASE_URL=http://localhost:1234/v1
AI_MODEL=<model id shown in the LM Studio server panel>
```

## Option 3 — Free web tier (OpenRouter / Groq — free key, not paid)

If you can't run a model locally, several hosts offer a **free** key and free
model tier:

```bash
# OpenRouter — grab a free key at https://openrouter.ai/keys
AI_PROVIDER=openai-compat
AI_BASE_URL=https://openrouter.ai/api/v1
AI_API_KEY=<free key>
AI_MODEL=meta-llama/llama-3.2-3b-instruct:free   # the ":free" tier is $0
```

Groq (https://console.groq.com) works the same way with
`AI_BASE_URL=https://api.groq.com/openai/v1` and a free key.

---

## Configure at runtime instead of via .env

You don't have to restart. `POST /api/ai-config` accepts the same fields (guard
it with `ADMIN_TOKEN` in production):

```bash
curl -X POST http://localhost:3000/api/ai-config \
  -H 'content-type: application/json' \
  -d '{"provider":"openai-compat","baseUrl":"http://localhost:11434/v1","model":"llama3.2"}'
```

Omit `apiKey` for a local server. Keys posted here are kept server-side and are
never serialized back to any client.

## How it works / where it's proven

- The provider seam is `server/lib/ai-providers/openai-compat.ts`; wiring lives
  in `server/lib/ai-config.ts` (`wireProviders`). A key is optional for
  openai-compat: the seam wires on `baseUrl` alone and substitutes a
  placeholder token that local servers ignore.
- SSRF protection is intact. A private/loopback `baseUrl` is allowed in
  dev/test (so local servers just work) and requires the explicit
  `AI_ALLOW_PRIVATE_NETWORK_TARGETS=true` opt-in only under
  `NODE_ENV=production`.
- End-to-end regression proof:
  `tests/core/openai-compat-keyless-local.test.ts` stands up a loopback
  OpenAI-compatible server, configures the provider with **no key**, and
  asserts a real `generateContent()` call returns the model's text.
```

node --experimental-strip-types --test tests/core/openai-compat-keyless-local.test.ts
```
