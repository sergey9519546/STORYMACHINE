# Agent handoff — post reliability merge

**Branch tip:** `main` (synced to `origin/main` after this cleanup commit)  
**Date:** 2026-07-15  
**Do not** force-push `main`. Prefer small commits. Leave generated artifacts untracked.

## What just landed

Security + ScriptIDE reliability wave is on `main`:

| Area | Where |
|---|---|
| SSRF / redirect-safe OpenAI-compat | `server/lib/validation.ts`, `server/lib/ai-providers/openai-compat.ts` |
| Atomic local draft envelope | `src/lib/scriptide-draft-store.ts` |
| Autosave transitions | `src/lib/scriptide-autosave.ts` |
| OCC save/load + 409 conflict | `server/engine/Stage.ts`, `server/routes/scriptide.ts` |
| Client restore / conflict UI | `src/components/ScriptIDE.tsx` |
| Upload batch race | `src/lib/uploaded-files.ts` |
| Metamorphic hard vs known-fail | `evals/scoring/runner/metamorphic-cases.ts` |

Known-failing score witness (intentional): `empty_verbosity` via `npm run test:metamorphic`.

## Open technical debt (next useful work)

### P0 — product validation (roadmap)
- `docs/user-validation/` has kits/templates; real P0 sessions are not complete.
- Product code freezes for P0 except critical security (see `ROADMAP.md`).

### P1 — ScriptIDE persistence hardening
1. React lifecycle tests: StrictMode remount, edit-during-in-flight trailing save, slow load + typing, conflict “Use server / Keep mine”. Pure restore policy is now in `decideScriptIDERestore` + tests.
2. Theme dual-write reduced: envelope write mirrors legacy `theme`; ScriptIDE no longer writes theme outside the envelope.
3. Upload rows now use stable IDs; Clear All invalidates pending multi-file reads.
4. No live cross-tab broadcast while both tabs stay open (OCC only on save).

### P1 — security residual
- DNS rebinding / resolve-and-pin still open (literal URL guard only).
- No required GitHub branch protection on `main` (repo settings).

### P2 — scoring
- Do **not** “fix” `empty_verbosity` by flipping it hard without full density recalibration.
- See `docs/scoring/VERBOSITY_BIAS_2026-07-11.md`.

## How to verify

```bash
npm run lint
npm test
npm run test:metamorphic
npm run build
```

Focused:

```bash
node --experimental-strip-types --test \
  tests/core/scriptide-draft-store.test.ts \
  tests/core/scriptide-autosave.test.ts \
  tests/routes/scriptide.test.ts \
  tests/core/openai-compat-redirect.test.ts \
  tests/routes/ingress-security.test.ts \
  tests/core/uploaded-files.test.ts \
  evals/scoring/runner/run-metamorphic-classify.test.ts \
  evals/scoring/runner/metamorphic-exit.test.ts
```

## Ignore rules

Gitignored (do not commit):

- `.zcode/`
- `.playwright-cli/`
- `output/playwright/**` except `output/playwright/whole_site_qa.py`
- `docs/user-validation/sessions/`

## Commit message quality

Avoid bare `commit` messages. Prefer scoped messages (`fix(ux): …`, `feat(reliability): …`).
