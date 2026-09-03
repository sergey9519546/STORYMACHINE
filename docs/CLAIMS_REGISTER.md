# Claims Register

Hand-maintained. Every user-facing empirical or guarantee claim the product
makes — anything that says the tool measures something, compares its output
to a human, promises determinism/reproducibility, promises privacy, or uses
an absolute word ("never", "always", "proven", "measured", "guaranteed") —
gets a row here, whether or not it currently holds up. **An unsupported claim
is listed as unsupported, not omitted.** This register exists because
`docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md` finding #8 found that
`scripts/honesty-audit.mjs` caught banned *words*, not empirical *claims*: it
had no way to know that "reads your screenplay like a studio coverage
reader" was a promise about human agreement the product has never measured.

This file is enforced by `scripts/honesty-audit.mjs`'s claims lane (see its
"Claims-register lane" section) and exercised by
`tests/core/honesty-audit-claims.test.ts`:

- Every row with status `unsupported` or `retired` must **not** appear
  verbatim (whitespace-normalized) anywhere in the tracked tree outside this
  file and `docs/audits/**` (dated audit records — the retrospective is
  allowed to quote the problem it found).
- Every row with status `supported` must carry an evidence pointer that
  **exists on disk** (a `path`, or `path:line` — only the path is checked).
- A curated list of empirical-claim phrases (below) is banned anywhere in
  `src/**`, `README.md`, `ARCHITECTURE.md`, `NORTH_STAR.md`, `ROADMAP.md`,
  `docs/PATH_TO_EXCELLENCE.md`, `index.html` **unless** the exact sentence
  containing the phrase is registered here with status `supported` at that
  same file. The general `docs/**` exemption in `honesty-audit.mjs` does
  **not** cover these six named orientation docs for this lane — they are
  scanned like `src/**`.

## Evidence types

- **measured-in-repo** — a runnable test in this repo asserts the claim
  (cite the test file, and the `it(...)` block if it helps).
- **measured-owner-local** — measured by a documented owner-run process
  outside CI (e.g. `npm run measure-real` against the local real-script
  corpus) with a receipt committed to the repo.
- **human-agreement** — would require independent human readers agreeing
  with the tool's output. **This repo has none of these today** — see
  `ARCHITECTURE.md:305`'s own "Not yet proven by default CI: human agreement
  with scores" and the P1 program in `ROADMAP.md` §3, which is what would
  eventually produce this evidence.
- **none** — no evidence exists; the claim is not testable as stated, or
  nobody has run the measurement yet.

## Register

| # | Claim (verbatim) | Where it appears | Evidence type | Evidence pointer | Status |
|---|---|---|---|---|---|
| 1 | Reads your screenplay like a studio coverage reader and hands back a verdict, a craft score, and your next fix. | src/components/StartScreen.tsx:317 (original wording, replaced 2026-09-03) | human-agreement | NONE | retired |
| 2 | The page, read the way a studio reader reads it. | src/components/startscreen/SlugLineIntro.tsx:10 (original wording, replaced 2026-09-03) | human-agreement | NONE | retired |
| 3 | Runs deterministic coverage on your screenplay and hands back a verdict, a craft score, and your next fix. | src/components/StartScreen.tsx:317 | measured-in-repo | tests/routes/keyless-smoke.test.ts; tests/core/script-doctor.test.ts | supported |
| 4 | The page, read the way the engine reads it. | src/components/startscreen/SlugLineIntro.tsx:10 | measured-in-repo | tests/core/script-doctor.test.ts | supported |
| 5 | Keyless by default — your script stays in this deployment unless you turn on AI features yourself. | src/components/StartScreen.tsx:411 | measured-in-repo | tests/routes/keyless-smoke.test.ts | supported |
| 6 | Nothing — by default. Script Doctor, coverage export, What-If Lab, Writers' Room, and interview receipts are all deterministic and run entirely on this server; none of them call out anywhere. | src/components/PrivacyPage.tsx:129 | measured-in-repo | tests/routes/keyless-smoke.test.ts | supported |
| 7 | Neither store is sent anywhere by itself; both live only on this device, in this browser. | src/components/PrivacyPage.tsx:89 | measured-in-repo | ARCHITECTURE.md:267 (§8 Security boundaries) | supported |
| 8 | Inside the editor, open Settings … Delete Everything … asks this server to permanently delete this session's saved data. | src/components/PrivacyPage.tsx:153 | measured-in-repo | tests/routes/session-delete.test.ts | supported |
| 9 | Deterministic · reproducible · no LLM judge | src/components/scriptide/ScriptDoctorPanel.tsx:3443 | measured-in-repo | tests/core/script-doctor.test.ts (lines 1133, 1528) | supported |
| 10 | Story Machine — deterministic analysis, independently verifiable | src/components/VerifyReport.tsx:351 | measured-in-repo | tests/routes/export-verify.test.ts:240; tests/core/coverage-html.test.ts:354 | supported |
| 11 | Deterministic ranking — same slate, same order, every time. | src/components/SlatePanel.tsx:582 | measured-in-repo | tests/routes/export-producer.test.ts:96 | supported |
| 12 | The deterministic engine placed this draft in its top verdict tier — a measurement, not a human-reader endorsement. | src/components/SlatePanel.tsx:122 | measured-in-repo | tests/routes/export-producer.test.ts:96 | supported |
| 13 | Twelve critics debate the current story state — deterministic, no AI key required. | src/components/RoomPanel.tsx:159 | measured-in-repo | tests/routes/nvm-whatif-room.test.ts:185 | supported |
| 14 | Interventions are computed on the story's causal model — deterministic, no AI key needed. | src/components/WhatIfPanel.tsx:840 | measured-in-repo | tests/routes/nvm-whatif-room.test.ts:97 | supported |
| 15 | Deterministic core — Always available | src/components/SettingsPanel.tsx:854 | measured-in-repo | tests/routes/keyless-smoke.test.ts | supported |
| 16 | Story axes are deterministic engine config — no AI key required. | src/components/SettingsPanel.tsx:499 | measured-in-repo | tests/routes/keyless-smoke.test.ts | supported |
| 17 | Protection is a prompt-level request to the rewriter, not a hard guarantee — this check compares … | src/components/RevisionPanel.tsx:781 | measured-in-repo | src/components/RevisionPanel.tsx:94 (the FNV-1a hash check this sentence describes) | supported |
| 18 | The deterministic surface (Script Doctor, coverage export, What-If Lab, Writers' Room, interview receipts) works keyless. | README.md:23 | measured-in-repo | tests/routes/keyless-smoke.test.ts | supported |
| 19 | A deterministic core inside a generative shell … Pure, keyless, reproducible. No LLM, no wall clock, no `Math.random()` on the diagnostic path. | ARCHITECTURE.md §1 (Product architecture) | measured-in-repo | tests/core/script-doctor.test.ts:1133,1528; tests/routes/keyless-smoke.test.ts | supported |
| 20 | Not yet proven by default CI: human agreement with scores, public multi-tenant security. | ARCHITECTURE.md:305 (§9 Testing topology) | human-agreement | ARCHITECTURE.md:305 (self-evidencing — the claim is the disclosure itself, that this evidence does not yet exist) | supported |
| 21 | AUC-24 >= 0.622 … last measured 0.731. | CLAUDE.md "Standing task" section; ROADMAP.md §3 | measured-owner-local | tests/core/real-script-corpus.test.ts (env-gated on `REAL_SCRIPT_CORPUS_DIR`, skipped in CI); `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` | supported |
| 22 | The rulebook's 3,217 pass-scoped constants are a maintained conceptual set, not a quality claim; the weighted-rule channel contributes AUC ~0.076 to discrimination while scene-count scarcity carries AUC ~0.938. | CLAUDE.md "Standing task" section; NORTH_STAR.md | measured-in-repo | server/nvm/analyze/doctor.ts:1892-1898 | supported |
| 23 | Live Notes squiggles — Always available (deterministic) | src/components/SettingsPanel.tsx:853 | measured-in-repo | tests/routes/keyless-smoke.test.ts:92 (`/api/scriptide/diagnose` on a keyless server); tests/core/generative-surface-labs-gate.test.ts | supported |
| 24 | Cost: free to self-host — no account, no subscription, no per-report fee. The deterministic analysis surface … needs no API key at all; a key only unlocks optional generation features. | README.md (top section) | measured-in-repo | tests/routes/keyless-smoke.test.ts (no-API-key operation); package.json (no billing/payment/account dependency anywhere in the tree) | supported |

### Notes on rows 1–2 (the fix)

Rows 1–2 are the claims finding #8 named directly: an implicit promise that
the tool's read agrees with what a professional human script reader would
say, with `ARCHITECTURE.md:305` on record that human-agreement evidence does
not exist. Both were rewritten 2026-09-03 (rows 3–4 are what ships now) to
describe what the product actually does — run a deterministic analysis and
hand back a verdict, a craft score, and a next fix — without the human
comparison. Tone and information content (verdict, craft score, next fix)
are preserved; only the unsupported comparison is gone.

### What this register deliberately does not do

It does not re-litigate `docs/p1-benchmark/DISCRIMINATION_BASELINE_2026-07-29.md`,
the AUC-24 ratchet, or the power-analysis gap — those are `ROADMAP.md` §3 /
P1 program concerns, tracked there and in
`docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md` findings #7 and #10.
Rows 21–22 are included here only because their headline numbers are
user-facing-adjacent (they appear in `CLAUDE.md`, which every session reads)
and because `n-rules-claim`/`stale-count-*` in `honesty-audit.mjs` already
polices the numbers; this register additionally polices the *comparative
claim* riding on them ("provably discriminate", "AUC ~0.938") so a future
edit can't quietly detach the number from its measured, sourced context.
