# Executable Baseline and Assurance Coverage

**Run date:** 2026-07-14  
**Environment:** Windows PowerShell, Node 22-compatible project configuration,
branch `main`, audit-start HEAD recorded in the Phase 1 scope.

## Results

| Check | Result | Interpretation |
|---|---:|---|
| `npm run lint` | Pass | TypeScript no-emit check passes. |
| `npm run build` | Pass | Production build succeeds; `ScriptIDE` emits a >500 kB minified chunk warning. |
| `npm test` | 9,507 pass, 72 skip, 1 todo, 0 fail | Broad deterministic coverage is green; skipped/todo evidence is material. |
| `npm run test:metamorphic` | Process pass; 6/7 invariants pass | `empty_verbosity` is a known tolerated failure: health shifts about +6.5 against a <=0.5 expectation. |
| Focused ingress/validation/resource tests | 115 pass, 0 fail | Strong negative-path coverage for request bounds and validation. |
| `RUN_E2E=1` HTTP journey | 7 pass, 0 fail | Real server/API journey works keyless; it is opt-in, API-only, and polluted the default session data directory. |
| `npm audit --omit=dev --json` | 1 low, 0 moderate/high/critical | Low-severity transitive `esbuild` development-server advisory; fix available. |

## What the green suite does not prove

1. The 72 skipped cases are the local-only produced-script corpus and its
   degradation suites. Without `REAL_SCRIPT_CORPUS_DIR`, the real-writing
   floors and AUC assertions do not execute locally or in ordinary CI.
2. The committed calibration reference is 20 synthetic, controlled-richness
   samples. Passing its ordering tests proves conformance to that designed
   corpus, not validity on professional drafts.
3. `tests/core/discrimination.test.ts` has a live composite strong/weak gap of
   about 2.9 against a 5.0 target; the case remains a todo. Its stale reason
   text refers to an earlier tie.
4. Metamorphic command success is not seven-of-seven success because the
   harness intentionally tolerates the known verbosity invariant failure.
5. “E2E” means server process plus HTTP routes. No browser renders the product,
   no keyboard or screen-reader journey runs, and no UI persistence behavior is
   exercised.
6. No committed, independently blind-labelled, held-out real-writing benchmark
   establishes agreement with experienced readers, uncertainty, subgroup
   behavior, ranking quality, or revision outcome.

## CI/release coverage snapshot

- CI runs lint, the server `console.*` prohibition, the keyless full unit/route
  suite, metamorphic checks, and a production build.
- The opt-in HTTP journey is absent from CI.
- There is no browser/accessibility/visual gate and no test-coverage threshold.
- Release repeats the main gates and builds/pushes GHCR images, but actions are
  referenced by mutable major tags; the workflow emits no SBOM, signature, or
  provenance attestation.
- Manual release can publish the package version/latest tag from a commit that
  is not a matching immutable version tag unless an external process prevents
  it.

## Assurance conclusion

The repository has high execution coverage for deterministic mechanics and
input guards, but low outcome coverage for its core claim. Confidence should be
stated in two separate channels:

- **Software confidence:** high for many bounded deterministic paths, with
  explicit gaps in browser behavior, opt-in integration, release integrity,
  and a handful of async/state contracts.
- **Screenplay-evaluation confidence:** unestablished until P1 provides a
  legally distributable, independently labelled, preregistered, held-out
  real-writing benchmark with uncertainty reporting.

