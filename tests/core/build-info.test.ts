// server/lib/build-info.ts — engine-identity fallback (P3 2026-09-06).
//
// WHY THIS EXISTS: before this change, `commit` was 'dev' for any process
// that didn't have GIT_SHA baked in (i.e. every non-Docker run — `npm run
// dev`, `npm test`, this repo's own verify-report CLI), which made the
// exported reports' "Engine commit" claim and the /api/export/verify route's
// engineCommit comparison vacuous outside a container: comparing "dev" to
// "dev" proves nothing about which engine build produced a report. This
// file pins the two behaviors the fix promises: GIT_SHA still wins when set
// (a deliberately-pinned build is never second-guessed by a stale local
// .git), and a plain checkout with no GIT_SHA now resolves the real 40-hex
// HEAD commit instead of silently reporting 'dev'.
//
// `readCommitFromCheckout` is tested directly (a pure function of
// `repoRoot`) rather than only through the `commit` export, because `commit`
// is a top-level const computed once at module load — re-importing
// build-info.ts under a different environment inside one test process is
// not reliable (module caching), while the pure fallback function can be
// exercised against an arbitrary directory with no reload games at all.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readCommitFromCheckout, commit } from '../../server/lib/build-info.ts';

const REPO_ROOT = path.resolve(import.meta.dirname, '../..');

function realHeadSha(): string {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
}

describe('server/lib/build-info.ts — engine commit identity', () => {
  it('readCommitFromCheckout resolves the real 40-hex HEAD commit for a directory that IS a git checkout', () => {
    const sha = readCommitFromCheckout(REPO_ROOT);
    assert.match(sha, /^[0-9a-f]{40}$/, `expected a 40-hex commit, got ${JSON.stringify(sha)}`);
    assert.equal(sha, realHeadSha(), 'must be the actual HEAD of this checkout, not merely 40-hex-shaped');
  });

  it('readCommitFromCheckout falls back to "dev" for a directory with no .git entry at all', () => {
    const bareDir = mkdtempSync(path.join(tmpdir(), 'build-info-no-git-'));
    try {
      assert.equal(readCommitFromCheckout(bareDir), 'dev');
    } finally {
      rmSync(bareDir, { recursive: true, force: true });
    }
  });

  it('readCommitFromCheckout never throws for a nonexistent path', () => {
    assert.equal(readCommitFromCheckout(path.join(REPO_ROOT, 'this-directory-does-not-exist-x7z')), 'dev');
  });

  it('the exported `commit` — a report produced from THIS checkout, in THIS process, carries a real 40-hex commit, never "dev"', () => {
    // This is the module-load-time value: since no test in this suite (or
    // process) has GIT_SHA set, `commit` reflects the checkout fallback
    // exercised in isolation above. If this assertion fails, either the
    // checkout fallback regressed, or something upstream started exporting
    // GIT_SHA into the test environment (in which case this should still be
    // 40-hex, just from the other branch — the two assertions below tell
    // them apart).
    assert.match(commit, /^[0-9a-f]{40}$/, `ScriptDoctorReport.provenance.engineCommit must not be "dev" from a checkout — got ${JSON.stringify(commit)}`);
    if (!process.env.GIT_SHA) {
      assert.equal(commit, realHeadSha(), 'with no GIT_SHA set, the module-load value must be this checkout\'s own HEAD');
    }
  });

  it('GIT_SHA, when set, still wins over the checkout fallback (Docker/CI contract unchanged)', () => {
    // A fresh subprocess, not a re-import in this process: `commit` is a
    // top-level const, computed once at module load and cached by Node's
    // module registry, so re-importing build-info.ts here after mutating
    // process.env would just return the already-memoized value. A child
    // process is the only way to observe a second, differently-configured
    // module load.
    const fakeSha = 'b'.repeat(40);
    const out = execFileSync(
      process.execPath,
      ['--experimental-strip-types', '-e', "import('./server/lib/build-info.ts').then(m => console.log(m.commit))"],
      { cwd: REPO_ROOT, encoding: 'utf8', env: { ...process.env, GIT_SHA: fakeSha } },
    ).trim();
    assert.equal(out, fakeSha, 'a set GIT_SHA must be reported verbatim, never overridden by the checkout fallback');
  });

  it('an empty/whitespace-only GIT_SHA is treated as unset — the checkout fallback still applies', () => {
    const out = execFileSync(
      process.execPath,
      ['--experimental-strip-types', '-e', "import('./server/lib/build-info.ts').then(m => console.log(m.commit))"],
      { cwd: REPO_ROOT, encoding: 'utf8', env: { ...process.env, GIT_SHA: '   ' } },
    ).trim();
    assert.match(out, /^[0-9a-f]{40}$/, `expected the checkout fallback's 40-hex commit, got ${JSON.stringify(out)}`);
    assert.equal(out, realHeadSha());
  });

  // Round-2 review finding 5: a stalling `git` used to block module load
  // (measured: still hanging at 8s with no timeout). A PATH-shimmed `git`
  // that sleeps 30s and never answers reproduces that hang; with the
  // timeout in place, the module must finish loading — and fall back to
  // 'dev', since the shimmed git never produced a 40-hex SHA — well inside
  // 30s.
  it('a stalling `git` does not hang module load — it times out and falls back to "dev"', () => {
    const shimDir = mkdtempSync(path.join(tmpdir(), 'build-info-slow-git-'));
    try {
      const shimPath = path.join(shimDir, 'git');
      writeFileSync(shimPath, '#!/bin/sh\nsleep 30\necho deadbeefdeadbeefdeadbeefdeadbeefdeadbeef\n');
      chmodSync(shimPath, 0o755);

      const start = Date.now();
      const out = execFileSync(
        process.execPath,
        ['--experimental-strip-types', '-e', "import('./server/lib/build-info.ts').then(m => console.log(m.commit))"],
        {
          cwd: REPO_ROOT,
          encoding: 'utf8',
          env: { ...process.env, GIT_SHA: '', PATH: `${shimDir}:${process.env.PATH ?? ''}` },
          timeout: 15_000, // outer safety net for THIS test, not the mechanism under test
        },
      ).trim();
      const elapsedMs = Date.now() - start;

      assert.equal(out, 'dev', 'a git call that never returns a real SHA in time must fall back to "dev"');
      assert.ok(
        elapsedMs < 10_000,
        `module load took ${elapsedMs}ms — the internal git-rev-parse timeout (2000ms) did not cap the stall; `
        + 'the pre-fix behavior hung at 8s+ against a 30s sleeping git',
      );
    } finally {
      rmSync(shimDir, { recursive: true, force: true });
    }
  });
});
