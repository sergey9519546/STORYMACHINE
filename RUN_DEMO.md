# RUN_DEMO — keyless deterministic demo (Windows)

This runs the full Story Machine demo **without any API key**. Everything the
demo shows — coverage, diagnosis, the editor — is deterministic and local. No
AI provider is contacted at any point (CI proves this on every commit:
`tests/routes/keyless-smoke.test.ts`).

## Prerequisites (one-time)

1. Install **Node.js 22.6 or newer** (https://nodejs.org — the LTS installer
   is fine; confirm with `node --version` in a fresh terminal).
2. Get the code onto the machine (either):
   - `git clone https://github.com/sergey9519546/STORYMACHINE.git`, or
   - download the ZIP from GitHub and extract it.
   Use a plain local folder like `C:\demo\STORYMACHINE` — **avoid running
   inside a OneDrive-synced folder** (file-sync interferes with builds).

## Run it

Open **PowerShell** in the project folder and run:

```powershell
npm install
npm run dev
```

Wait for the line showing the local URL (default `http://localhost:3000`),
then open it in a browser.

**Do not set any environment variables. Do not create a `.env` file.**
The keyless state is the demo. The server boots into analysis-only mode by
design; the AI-dependent surfaces stay dark and say so honestly.

## The demo path (what to click)

1. On the start screen, choose **Try sample coverage** (or the sample CTA on
   an empty editor).
2. The built-in sample screenplay loads and a **full 14-pass coverage
   report** is produced — deterministically, with no key. This is the frozen
   moderator corpus (`demo/corpus/sample-script.fountain`; its SHA-256 is
   pinned in `demo/corpus/MANIFEST.json` and CI fails if the live sample
   drifts from it).
3. Open the editor and type — screenplay formatting, pagination, and (if
   toggled on in the toolbar) deterministic live notes all work locally.
4. Optional honesty checks to show a skeptical audience:
   - The sample never overwrites an existing draft (guarded; try it with
     text in the editor — it refuses with a notice).
   - AI features are **off by default**: no inline copilot, no background
     analysis, zero network calls to any provider (the smoke test asserts
     zero at the provider seam *and* zero non-loopback requests).
   - An interrupted analysis shows "incomplete" — never a fake score.

## Verifying the zero-AI claim yourself

```powershell
npm test
```

runs the whole suite, including the keyless smoke test and the honesty
string audit. Both must pass on the exact commit being demoed (tagged
`g0-demo`).

## Troubleshooting

- **`node` not recognized** → reopen the terminal after installing Node, or
  reboot so PATH updates.
- **Port 3000 busy** → `set PORT=3001` (PowerShell: `$env:PORT=3001`), rerun
  `npm run dev`, open `http://localhost:3001`.
- **Build/install errors inside OneDrive** → move the folder to a plain
  local path (e.g. `C:\demo\`) and rerun `npm install`.
