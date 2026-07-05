# STORYMACHINE — Project Memory

Orientation: `ARCHITECTURE.md` (system map) · `README.md` (setup, env vars) ·
`server/nvm/revision/WAVE_QUALITY_GUARANTEE.md` (binding quality spec for
revision-engine work).

## Quality bar

Build the strongest version of a change, not the quickest one that passes:
edge cases handled, inputs guarded, fire + no-fire tests for every new rule,
consistency with the surrounding file's patterns. For revision waves this bar
is binding and precisely specified — read the guarantee doc before authoring
one.

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
- `.claude/` and `data/` are gitignored: nothing placed there is shared via
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
- Wave rotation order ≠ revision pipeline execution order — two different
  14-pass orderings that are easy to conflate.

## Standing task — Wave Program v2

The matrix-filling era (waves 1–1181) is complete: the signals × modes ×
positions coverage matrix is saturated and further cells are permutation
farming. Waves continue at the same cadence and rigor — 3 new checks +
6 tests (fire + no-fire) per wave, guarantee-doc acceptance standard —
but rotate through four wave TYPES with genuine headroom:

1. **Signal channels** — extract a genuinely new per-scene signal in
   `server/nvm/analyze/fountain-analyzer.ts` (and, where applicable, the
   ops-derived records in `screenplay/memory.ts`), then ship the first
   3 checks consuming it.
2. **Excellence detectors** — rules that detect what a script does WELL
   (feeding the earned-strengths surface), with the same guard discipline
   as defect rules. Never-padded: an excellence rule that fires on
   mediocre input is a failing rule.
3. **Genre-conditioned variants** — give the highest-firing generic rules
   genre-aware thresholds via `server/lib/genre-router.ts`, so a slow-burn
   drama and a thriller stop being judged by one pacing yardstick.
4. **Root-cause templates** — new co-occurrence clusters in
   `server/nvm/analyze/cluster.ts` that convert recurring symptom groups
   into named, plain-language diagnoses.

Rotation: cycle 1 → 2 → 3 → 4 → repeat, one type per wave. Full procedure
and per-type acceptance criteria: `WAVE_QUALITY_GUARANTEE.md` § "Program v2".
Commit to the branch designated for the current session — never a branch
name hardcoded here.
