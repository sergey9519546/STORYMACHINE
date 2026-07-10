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
// set in the environment. There is no reliable way to read the git SHA at
// runtime once the source tree has been left behind by a Docker COPY (no
// .git directory ships in the image — see Dockerfile), so this MUST come in
// as a build/deploy-time value, not be computed here. Falls back to "dev"
// when unset, which is expected and safe for local development and the
// keyless-boot CI test run — never a fatal condition.
// Read via fs + JSON.parse (not a JSON import) so this compiles cleanly
// under this project's tsconfig (no `resolveJsonModule`) and under
// --experimental-strip-types, which does not execute type-checking anyway.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

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
  : 'dev';
