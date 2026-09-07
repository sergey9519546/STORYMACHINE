// Build/release identity for a running instance — consumed by GET /health
// (server/routes/config.ts) so ops can tell what's deployed and, if needed,
// roll back to a known-good image (see README.md "Releases").
//
// version: prefers the build-time VERSION env (Dockerfile's ARG VERSION ->
// ENV VERSION, set by release.yml from the git tag) so a tagged release
// image reports exactly the version it was tagged with even if
// package.json drifts between release and build. Falls back to
// package.json's version — the source of truth for untagged/dev builds
// (`npm run dev`, a plain `docker build` with no --build-arg) — and only
// falls back further to "unknown" if that can't be read either.
//
// commit: sourced from a build-time value baked in by the Dockerfile
// (ARG GIT_SHA -> ENV GIT_SHA) or, for non-Docker runs, whatever GIT_SHA is
// set in the environment (ci.yml/release.yml's "Run tests"/"Build" steps set
// it explicitly, the same ENV-var contract the Dockerfile uses, so a report
// produced during CI carries a real commit too). There is no reliable way to
// read the git SHA at runtime once the source tree has been left behind by a
// Docker COPY (no .git directory ships in the image — see Dockerfile), so a
// container MUST get this as a build/deploy-time value, not computed here.
//
// P3 fix (2026-09-06): outside a container, "no GIT_SHA env" does not mean
// "no way to know the commit" — a plain checkout (a dev running `npm run
// dev`, a CI runner that forgot to set the env, or this repo's own
// `scripts/verify-report.mjs` verifying a report against local HEAD) has a
// `.git` right there. GIT_SHA still wins when set (never overridden — a
// deliberately-pinned build must not be second-guessed by a stale local
// clone); only when it's unset do we ask git directly, once, at module load,
// and only when a `.git` entry exists (a file in a worktree, a directory in
// a normal clone — existsSync() is true for both, which is why this checks
// existence rather than isDirectory()). `git rev-parse HEAD` is cheap
// (single subprocess, no network) and this only ever runs once per process
// (a top-level const, not a per-report call), so "one report" and "ten
// thousand reports in this process's lifetime" pay the exact same cost.
// Never throws AND never hangs: a missing/broken git binary, a corrupt
// repo, or a non-40-hex answer all fall through to "dev" exactly like the
// old no-GIT_SHA case did — and a `git` that never returns (a broken FS
// mount, a corrupt index, a shell alias gone wrong) is capped at a 2s
// timeout rather than blocking module load — and therefore every process
// that imports doctor.ts, including this one — indefinitely. Round-2 review
// finding 5 (2026-09-06): reproduced with a PATH-shimmed `git` that sleeps
// 30s — module load was still blocked at 8s with no timeout set. A boot
// path that explicitly promises "never throws" was silently allowed to
// hang, which is a stronger failure than throwing (nothing times it out
// upstream). `killSignal: 'SIGKILL'` because a hung `git` process is not
// expected to honor SIGTERM's default grace period any better than it
// honored finishing in 2s.
// Read via fs + JSON.parse (not a JSON import) so this compiles cleanly
// under this project's tsconfig (no `resolveJsonModule`) and under
// --experimental-strip-types, which does not execute type-checking anyway.
import { readFileSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const FULL_SHA_RE = /^[0-9a-f]{40}$/i;

/** `git rev-parse HEAD` in the checkout this module physically lives in
 *  (not `process.cwd()` — a caller running from a different working
 *  directory, e.g. the verify-report CLI invoked from elsewhere, must still
 *  resolve THIS repo's commit). Returns 'dev' for anything short of a clean
 *  40-hex answer: no `.git` entry (a stripped Docker image), no `git`
 *  binary, a shallow/detached oddity that still failed to resolve HEAD, or
 *  (defensively) a truncated/short SHA some `git` configuration might emit.
 *  Exported (same rationale as computeContentHash in doctor.ts): a pure
 *  function of `repoRoot`, spot-checkable in isolation against an arbitrary
 *  directory without needing to fake `import.meta.url` or spawn a second
 *  process — see tests/core/build-info.test.ts. */
export function readCommitFromCheckout(repoRoot: string): string {
  try {
    if (!existsSync(path.join(repoRoot, '.git'))) return 'dev';
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
      timeout: 2000,
      killSignal: 'SIGKILL',
    }).trim();
    return FULL_SHA_RE.test(sha) ? sha : 'dev';
  } catch {
    return 'dev';
  }
}

function readPackageVersion(): string {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const pkgPath = path.join(here, '..', '..', 'package.json');
    const raw = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: unknown };
    return typeof raw.version === 'string' && raw.version.length > 0 ? raw.version : 'unknown';
  } catch {
    // Missing/unreadable package.json must never crash boot — version
    // reporting is diagnostic, not load-bearing (same posture as the
    // GIT_SHA fallback below).
    return 'unknown';
  }
}

export const version: string = process.env.VERSION && process.env.VERSION.trim().length > 0
  ? process.env.VERSION.trim()
  : readPackageVersion();

export const commit: string = process.env.GIT_SHA && process.env.GIT_SHA.trim().length > 0
  ? process.env.GIT_SHA.trim()
  : readCommitFromCheckout(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..'));
