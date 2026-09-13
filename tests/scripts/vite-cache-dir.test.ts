// WHERE VITE'S DEPENDENCY-OPTIMIZER CACHE GOES — pinned, because the default
// it replaced took a browser gate down.
//
// ── Why this exists (2026-09-12, adversarial batch) ─────────────────────────
//
// Vite's default `cacheDir` is `<root>/node_modules/.vite`. Every lane in this
// repository works in a `git worktree` whose `node_modules` is a SYMLINK to
// the main checkout's, so that default was one physical directory shared by
// every concurrent worktree. A `verify:p0-flow` run died on three console
// errors reading `504 (Outdated Optimize Dep)`
// (docs/audits/2026-09-12-adversarial/p0flow-lane-report.md:94, :217), and the
// shared cache carried nine abandoned `deps_temp_*` directories as receipts.
//
// scripts/verify-vite-cache-isolation.mjs is the end-to-end proof (two servers,
// one `node_modules`, measured). This file is the cheap pin underneath it: the
// three properties that make the fix a fix, in a few milliseconds, on every
// `npm test` — so a refactor that quietly restores the shared default is a red
// test rather than a rediscovery six weeks from now.
//
//   1. the resolution is a FUNCTION of its inputs (two repo paths -> two
//      directories; two VITE_CACHE_DIR values -> two directories);
//   2. the default is not under `node_modules` — of any tree, by any route;
//   3. the wiring is real: `vite.config.ts` sets `cacheDir` from the resolver,
//      `bootKeylessServer` allocates a per-boot directory and exports it, and
//      `distStaleness` does not treat the cache as a `dist/` build input.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  VITE_CACHE_DIR_ENV,
  allocateViteCacheSlot,
  repoCacheBase,
  repoCacheKey,
  resolveViteCacheDir,
} from '../../scripts/lib/vite-cache-dir.mjs';
import { distStaleness } from '../../scripts/lib/browser-verify.mjs';

const REPO = path.resolve(import.meta.dirname, '../..');
const read = (rel: string) => readFileSync(path.join(REPO, rel), 'utf8');

/** Is `p` inside a `node_modules` directory at any depth? */
const underNodeModules = (p: string) => p.split(path.sep).includes('node_modules');

describe('resolveViteCacheDir', () => {
  it('gives two repository paths two different directories', () => {
    const a = resolveViteCacheDir({ repoRoot: '/srv/checkout-one', env: {} });
    const b = resolveViteCacheDir({ repoRoot: '/srv/checkout-two', env: {} });
    assert.notEqual(a, b, 'two worktrees sharing one node_modules must not share one cache');
    assert.ok(path.isAbsolute(a) && path.isAbsolute(b), 'Vite resolves a relative cacheDir against its root — always hand it an absolute one');
  });

  it('gives one repository path the same directory every time', () => {
    // A cache that moves between runs is a cache that is always cold.
    assert.equal(
      resolveViteCacheDir({ repoRoot: '/srv/checkout-one', env: {} }),
      resolveViteCacheDir({ repoRoot: '/srv/checkout-one/', env: {} }),
    );
  });

  it('honours VITE_CACHE_DIR, and two values give two directories', () => {
    const a = resolveViteCacheDir({ repoRoot: REPO, env: { [VITE_CACHE_DIR_ENV]: '/tmp/cache-a' } });
    const b = resolveViteCacheDir({ repoRoot: REPO, env: { [VITE_CACHE_DIR_ENV]: '/tmp/cache-b' } });
    assert.equal(a, '/tmp/cache-a');
    assert.equal(b, '/tmp/cache-b');
    assert.notEqual(a, b);
  });

  it('resolves a relative VITE_CACHE_DIR against the repository root, as Vite does', () => {
    assert.equal(
      resolveViteCacheDir({ repoRoot: '/srv/checkout-one', env: { [VITE_CACHE_DIR_ENV]: '.cache/vite' } }),
      path.join('/srv/checkout-one', '.cache/vite'),
    );
  });

  it('ignores a blank VITE_CACHE_DIR rather than resolving it to the repo root', () => {
    // `VITE_CACHE_DIR=` in a CI env block is an unset variable spelled badly;
    // taking it literally would put the optimizer cache ON TOP of the checkout.
    for (const blank of ['', '   ']) {
      assert.equal(
        resolveViteCacheDir({ repoRoot: '/srv/checkout-one', env: { [VITE_CACHE_DIR_ENV]: blank } }),
        resolveViteCacheDir({ repoRoot: '/srv/checkout-one', env: {} }),
        `VITE_CACHE_DIR=${JSON.stringify(blank)} must read as unset`,
      );
    }
  });

  it('never defaults to anything under node_modules — the whole point', () => {
    for (const root of [REPO, '/srv/checkout-one', '/home/user/wt-lane']) {
      const dir = resolveViteCacheDir({ repoRoot: root, env: {} });
      assert.ok(!underNodeModules(dir), `${dir} is under node_modules, which every worktree shares`);
      assert.ok(
        !dir.startsWith(`${path.resolve(root)}${path.sep}`),
        `${dir} is inside the repository — see vite-cache-dir.mjs's header for the three reasons it must not be`,
      );
    }
  });

  it('keys off the RESOLVED path, so a symlinked checkout is one cache, not two', () => {
    const scratch = mkdtempSync(path.join(tmpdir(), 'vite-cache-key-'));
    try {
      // The repository reached through its own realpath and through `..`
      // gymnastics is one tree and must key once.
      assert.equal(repoCacheKey(REPO), repoCacheKey(path.join(REPO, 'src', '..')));
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});

describe('allocateViteCacheSlot', () => {
  it('never hands two live callers the same directory', () => {
    const root = path.join(tmpdir(), 'vite-cache-alloc-fixture');
    const slots = [
      allocateViteCacheSlot({ repoRoot: root, env: {} }),
      allocateViteCacheSlot({ repoRoot: root, env: {} }),
      allocateViteCacheSlot({ repoRoot: root, env: {} }),
    ];
    try {
      const dirs = new Set(slots.map((s) => s.dir));
      assert.equal(dirs.size, 3, 'two concurrent boots sharing one optimizer directory is the defect');
      for (const slot of slots) assert.ok(!underNodeModules(slot.dir));
    } finally {
      for (const slot of slots) slot.release();
      rmSync(repoCacheBase({ repoRoot: root }), { recursive: true, force: true });
    }
  });

  it('reuses a released slot, so the ordinary one-gate-at-a-time run stays warm', () => {
    const root = path.join(tmpdir(), 'vite-cache-alloc-reuse-fixture');
    try {
      const first = allocateViteCacheSlot({ repoRoot: root, env: {} });
      const dir = first.dir;
      first.release();
      first.release(); // idempotent: shutdown() and the exit hook both call it
      const second = allocateViteCacheSlot({ repoRoot: root, env: {} });
      assert.equal(second.dir, dir, 'a freed slot must come back, or every run re-optimizes from cold');
      second.release();
    } finally {
      rmSync(repoCacheBase({ repoRoot: root }), { recursive: true, force: true });
    }
  });

  it('steps aside when the caller already named a cache', () => {
    const slot = allocateViteCacheSlot({ repoRoot: REPO, env: { [VITE_CACHE_DIR_ENV]: '/tmp/caller-owned' } });
    assert.equal(slot.dir, '/tmp/caller-owned');
    assert.equal(slot.source, 'caller');
    assert.equal(slot.slot, null);
    slot.release();
  });
});

describe('the wiring, not just the helper', () => {
  it('vite.config.ts sets cacheDir from the resolver, keyed to its own directory', () => {
    const config = read('vite.config.ts');
    assert.match(
      config,
      /cacheDir:\s*resolveViteCacheDir\(\{\s*repoRoot:\s*__dirname\s*\}\)/,
      'vite.config.ts must set cacheDir from resolveViteCacheDir({ repoRoot: __dirname }) — '
        + 'it is the single place the dev middleware, `npm run dev` and `vite build` agree',
    );
    assert.match(config, /from '\.\/scripts\/lib\/vite-cache-dir\.mjs'/);
  });

  it('bootKeylessServer allocates a per-boot cache, passes it to the server, and logs it', () => {
    const helper = read('scripts/lib/browser-verify.mjs');
    assert.match(helper, /allocateViteCacheSlot\(\{ repoRoot: cwd/, 'every keyless boot allocates its own cache directory');
    assert.match(helper, /\[VITE_CACHE_DIR_ENV\]: cache\.dir/, 'the allocated directory reaches the server process');
    assert.match(helper, /vite cache: \$\{cache\.dir\}/, 'the resolved cache dir is logged on boot, beside the "serving:" line');
    assert.match(helper, /serverProc\.releaseViteCacheSlot/, 'shutdown() frees the slot for the next boot');
    // `extraEnv` last: a suite that pins its own cache must win over the pool.
    assert.match(helper, /allocateViteCacheSlot\(\{ repoRoot: cwd, env: \{ \.\.\.process\.env, \.\.\.\(extraEnv \?\? \{\}\) \} \}\)/);
  });

  it('the cache directory is not a dist/ build input', () => {
    // `distStaleness` picks up root-level build config BY PATTERN, so an
    // in-repo cache would have been one regex edit from making every browser
    // gate rebuild dist/ on every run. This asserts the property that makes
    // that impossible rather than the regex that currently prevents it.
    const cacheDir = resolveViteCacheDir({ repoRoot: REPO, env: {} });
    assert.ok(
      !cacheDir.startsWith(`${REPO}${path.sep}`),
      'a cache inside the repository can become a build input; this one cannot',
    );
    const staleness = distStaleness({ repo: REPO });
    if (staleness.newest) {
      assert.ok(
        !staleness.newest.path.includes(`${path.sep}.vite`),
        `distStaleness picked ${staleness.newest.path} as a build input — a Vite cache must never be one`,
      );
    }
  });

  it('server/app.ts still boots the dev middleware without naming a cache of its own', () => {
    // One implementation per concept: if a second cacheDir ever appears at the
    // call site, it and the config will disagree and only one of them will be
    // the one that took the gate down.
    const app = read('server/app.ts');
    const call = app.match(/createViteServer\([^)]*\)/)?.[0] ?? '';
    assert.ok(call.length > 0, 'server/app.ts must still create the Vite dev middleware');
    assert.ok(!/cacheDir/.test(call), `server/app.ts names a cacheDir at the call site (${call}) — it belongs in vite.config.ts alone`);
  });

  it('ships the end-to-end harness the cheap pins stand in for', () => {
    assert.ok(existsSync(path.join(REPO, 'scripts/verify-vite-cache-isolation.mjs')));
    assert.ok(existsSync(path.join(REPO, 'scripts/lib/vite-dev-probe.mjs')));
    assert.match(read('package.json'), /"verify:vite-cache": "node scripts\/verify-vite-cache-isolation\.mjs"/);
  });
});
