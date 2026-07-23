# STORYMACHINE — Project Memory

Orientation: `ROADMAP.md` (canonical demand-driven sequence and active phase) ·
`NORTH_STAR.md` (product constitution) · `ULTRAPLAN.md` (short execution brief) ·
`ARCHITECTURE.md` (system map) · `README.md` (setup, env vars). Research and
retired wave material is filed backlog, not active direction; see ROADMAP §8.

## Quality bar

Build the strongest version of a **validated** change, not the quickest one
that passes: start with the active ROADMAP phase and its user-facing exit
gate, then handle edge cases, guard inputs, and match surrounding patterns.
For any scoring change, tests must include both positive/negative fixtures
and runnable discrimination evidence on real writing; synthetic fire/no-fire
coverage alone is not enough. The retired wave guarantee remains a historical
quality reference, not an instruction to author another wave.

## Commands

`npm run dev|build|lint|test` are standard (`lint` = `tsc --noEmit`;
Node ≥ 22.6). The one non-obvious command:

```
node --experimental-strip-types tests/<area>/<file>.test.ts   # one file, fast
```

Run the file(s) you touched, then the full `npm test` (0 failures required)
before every push. CI runs lint + test + build on every branch, plus a
`console.` grep over `server/**` — a hit fails the build.

## Security constraints (must always hold)

- API keys live only in `.env` (gitignored) and are never serialized to
  clients — `getPublicConfig()` exposes boolean flags only. `/api/ai-config`
  additionally reports `llmReady`, which ORs the TWO independent key sources
  (env `GEMINI_API_KEY` and the multi-provider config) — checking only one is
  a recurring trap.
- All AI calls go through server-side Express routes — never from the
  frontend bundle.
- Every route takes `gameLimiter` — or the stricter `aiLimiter` when it can
  trigger LLM calls — and zod-validates its body (`server/lib/validation.ts`).
- No new `console.*` under `server/**` (CI-enforced); use
  `server/lib/logger.ts`.

## Gotchas

- The server deliberately boots WITHOUT an AI key into analysis-only mode —
  the deterministic surface (doctor, diagnose, coverage, what-if, room,
  interview receipts) is the product's front door. Do not reintroduce a
  fatal key check in `server.ts`.
- `apiKey` identifiers in `src/components/SettingsPanel.tsx` are input-field
  prop bindings, not embedded secrets — leave them alone.
- `.Codex/` and `data/` are gitignored: nothing placed there is shared via
  git unless `.gitignore` changes first.
- Calibration corpus (`server/nvm/analyze/calibration/corpus.ts`): band
  monotonicity is a property of the CONTROLLED-RICHNESS DESIGN — all 20
  samples share scene/word budgets and structural-signal presence, so craft
  is the only variable. Changing one band's richness without matching every
  other band reintroduces the measured confound and the calibration tests
  will (correctly) fail. See `reference.ts`'s header.
- Formula constants in `server/nvm/analyze/doctor.ts` stay function-local:
  module-level consts hit a temporal dead zone through the doctor↔reference
  circular import and the failure is silently swallowed by a fallback
  (documented at the site — it cost a real bug hunt).
- The revision pipeline's 14-pass execution order is still live. The old
  wave-rotation order is retired history — never use it to choose new work.
- OneDrive hazard: direct file-tool writes to the mounted repo can truncate
  files and introduce CRLF diff inflation. Edit in a clone, copy back with
  byte verification, commit via Windows-side git.
- The real-corpus harness (`tests/core/real-script-corpus.test.ts`) is
  env-gated (`REAL_SCRIPT_CORPUS_DIR`); its manifest must be re-locked
  whenever a rule change shifts a produced script's health/verdict/
  sceneCount.
- Structural findings at feature scale must go through the bounded
  deduction path in `doctor.ts` — never rely on issue-count density, which
  is provably blind to document-scale scene-order collapse at feature-scale
  issue volume.
- Parallel sessions ship concurrently: pull the integration branch and check
  `git log` before starting any implementation work. Do not assume `main` or
  any other branch name; use the current session's designated branch.

## Standing task — see ROADMAP.md (the wave program is RETIRED)

**The "3 checks + 6 tests per wave, forever" cadence is dead.** It was the
machine that manufactured the project's biggest liability: ~5,701 of ~8,917
rules are one bulk wave of field × mode × position permutations from 7
template functions (`passes/lib/checks.ts`), and by the doctor's own
measurement (`doctor.ts:1656-1669`) the entire weighted-rule channel
contributes AUC ~0.076 to discrimination while scene-count scarcity carries
AUC ~0.938. More rules stopped adding signal a long time ago; they add
maintenance cost (~47,500 pass-file lines, 1,326 `as any` casts) and
undercut the trust story. Do not author a new wave.

The current spine is **demand-first**, sequenced and gated in `ROADMAP.md`:

1. **P0 — Validate with real writers.** No new engine work ships without a
   validated user need. Blocks everything below.
2. **P1 — Make the score provably discriminate on REAL writing** (the One
   Bet). A legally distributable benchmark of real drafts running in CI,
   independently blind-labeled by >=3 experienced readers, with a
   pre-registered split, held-out evaluation, and uncertainty reporting.
   Rebuild around the smallest signal set that actually separates. Add no
   entries to the current 8,917 generated catalog; treat ~2,300 distinct rule
   concepts as the maintained conceptual set. Removal is a separate approved
   migration, never implied by "freeze."
3. **P2 — Collapse the surface to Doctor + Editor.** Everything else
   (OASIS, the ~38 research panels) behind a Labs flag.
4. **P3 — Ship a shareable, third-party-verifiable coverage report.**
5. **P4 — Retention & defensibility.** Last, not first.

**Two laws now outrank the old rigor discipline** (full text in NORTH_STAR
§1): *demand before rigor* — a validated user need gates engine work; and
*correct before reproducible* — determinism is worthless if the verdict is
wrong, so reproducibility is earned AFTER the score is shown valid on real
writing, never as a substitute for it. `measure-before-threshold on the
REAL corpus` still holds for any scoring change, and the shuffle-drop AUC
must not regress below its floor. Commit to the branch designated for the
current session — never a branch name hardcoded here.
