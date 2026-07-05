<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# STORYMACHINE / OASIS

Dual-engine creative writing tool: a multi-agent narrative simulation (Story Machine) paired with a Fountain screenplay authoring environment (Script IDE).

## Run Locally

**Prerequisites:** Node.js 22.6+ (the test suite runs via `node --experimental-strip-types`, and CI pins Node 22)

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env` and fill in your key:
   `cp .env.example .env`
   Then set `GEMINI_API_KEY` to your Gemini API key — or skip this step
   entirely to run in analysis-only mode (all deterministic features work
   without a key; generation features stay off until one is configured).
3. Run the app:
   `npm run dev`

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Optional | Gemini AI API key — never commit this. Without it the server boots in **analysis-only mode**: Script Doctor, live diagnostics, coverage export, What-If Lab, Writers' Room, and interview receipts all work; generation (copilot, simulation dialogue, rewrites) stays disabled until a key is set. |
| `APP_URL` | Optional | Hosting URL (injected automatically by AI Studio) |

> **Security note:** `.env` is gitignored via `.env*` in `.gitignore`. Only `.env.example` is tracked. Never commit real keys.

## Key Endpoints

| Path | Description |
|---|---|
| `GET /health` | Liveness probe — returns uptime and session count |
| `POST /api/init` | Initialize simulation with agents and locations |
| `POST /api/run-room` | Run a 5-turn dialogue lock in a location |
| `GET /api/session/export` | Download full session snapshot as JSON |
| `POST /api/session/import` | Restore a previously exported snapshot |
| `GET /api/ledger/fountain` | Export action log as annotated Fountain screenplay |

## Running Tests

```
npm test
```
