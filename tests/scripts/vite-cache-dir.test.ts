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
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  VITE_CACHE_DIR_ENV,
  allocateViteCacheSlot,
  repoCacheBase,
  repoCacheKey,
  resolveViteCacheDir,
} from '../../vite-cache-dir.mjs';
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
    // THE EARLIER VERSION OF THIS TEST COULD NOT FAIL. It compared
    // `repoCacheKey(REPO)` with `repoCacheKey(path.join(REPO, 'src', '..'))`,
    // and `path.join` normalizes `src/..` away before the call — so both
    // arguments were the byte-identical string and the assertion was
    // `f(x) === f(x)`, true for any deterministic f, including one with
    // `realpathSync` deleted (2026-09-13 review, finding 4). A real symlink is
    // the only input that distinguishes resolution from normalization.
    const scratch = mkdtempSync(path.join(tmpdir(), 'vite-cache-key-'));
    try {
      const real = path.join(scratch, 'real-checkout');
      const link = path.join(scratch, 'link-to-checkout');
      const other = path.join(scratch, 'other-checkout');
      mkdirSync(real);
      mkdirSync(other);
      symlinkSync(real, link);

      // The two paths really are different strings — otherwise this test is
      // the tautology it replaced.
      assert.notEqual(path.resolve(link), path.resolve(real));
      assert.notEqual(path.basename(link), path.basename(real));

      assert.equal(
        repoCacheKey(link),
        repoCacheKey(real),
        'one checkout reached through a symlink must key once — two caches for one tree is a cold cache on every second run',
      );
      assert.equal(
        resolveViteCacheDir({ repoRoot: link, env: {} }),
        resolveViteCacheDir({ repoRoot: real, env: {} }),
        'the same must hold end to end, not only in the key helper',
      );
      // …and two genuinely different trees still separate, which is the
      // property the whole change exists for.
      assert.notEqual(repoCacheKey(other), repoCacheKey(real));
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

// ── The lock state machine ─────────────────────────────────────────────────
//
// `claimLock` / `lockHolderAlive` are the whole safety mechanism: they decide
// whether two live dependency optimizers can end up in one directory. Nothing
// tested them in either direction until the 2026-09-13 review said so
// (finding 5) — `allocateViteCacheSlot` was exercised only by three
// simultaneous allocations in one process, which never reaches the EEXIST
// branch's reclaim path at all.
//
// Each case below is asserted twice: once against the real module, and once
// against a MUTANT of it with the single condition under test inverted. If the
// mutant passes too, the assertion is not measuring what it claims to.

/** The module's own source with one condition replaced, loaded as a module. */
async function loadMutant(anchorText: string, replacement: string) {
  const source = readFileSync(path.join(REPO, 'vite-cache-dir.mjs'), 'utf8');
  assert.ok(
    source.includes(anchorText),
    `mutation anchor is no longer in vite-cache-dir.mjs, so this test is measuring nothing: ${anchorText}`,
  );
  const dir = mkdtempSync(path.join(tmpdir(), 'vite-cache-mutant-'));
  const file = path.join(dir, 'mutant.mjs');
  writeFileSync(file, source.replace(anchorText, replacement));
  const mod = await import(pathToFileURL(file).href);
  return { mod, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

/** A cache base for `repoRoot` holding exactly one planted `slot-0.lock`. */
function plantLock(repoRoot: string, contents: string): string {
  const base = repoCacheBase({ repoRoot });
  rmSync(base, { recursive: true, force: true });
  mkdirSync(base, { recursive: true });
  writeFileSync(path.join(base, 'slot-0.lock'), contents);
  return base;
}

/** A pid that is certainly not running: a child that has already exited. */
function deadPid(): number {
  const done = spawnSync(process.execPath, ['-e', ''], { encoding: 'utf8' });
  assert.equal(done.status, 0);
  assert.ok(typeof done.pid === 'number' && done.pid > 0);
  return done.pid as number;
}

const liveLock = () => JSON.stringify({ pid: process.pid, at: new Date().toISOString() });

describe('the lock state machine', () => {
  it('respects a LIVE holder\'s lock, and does not once the liveness check is removed', async () => {
    const repoRoot = path.join(tmpdir(), `vite-cache-live-${process.pid}`);
    const base = plantLock(repoRoot, liveLock());
    const { mod, cleanup } = await loadMutant(
      'if (lockHolderAlive(lockPath)) return false;',
      'if (false) return false;',
    );
    try {
      const real = allocateViteCacheSlot({ repoRoot, env: {} });
      assert.equal(real.slot, 1, 'slot 0 is held by a living process, so the allocator must move on — sharing it is the defect');
      real.release();

      plantLock(repoRoot, liveLock());
      const mutant = mod.allocateViteCacheSlot({ repoRoot, env: {} });
      assert.equal(mutant.slot, 0, 'the mutant must steal the live lock; if it does not, the assertion above cannot fail');
      mutant.release();
    } finally {
      cleanup();
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('reclaims a DEAD holder\'s lock, and does not once liveness always answers yes', async () => {
    const repoRoot = path.join(tmpdir(), `vite-cache-dead-${process.pid}`);
    const gone = deadPid();
    const base = plantLock(repoRoot, JSON.stringify({ pid: gone, at: new Date().toISOString() }));
    const { mod, cleanup } = await loadMutant(
      "    return /** @type {NodeJS.ErrnoException} */ (err).code === 'EPERM';",
      '    return true;',
    );
    try {
      const real = allocateViteCacheSlot({ repoRoot, env: {} });
      assert.equal(real.slot, 0, 'a lock whose process is gone must be reclaimed, or a crashed gate strands a slot forever');
      real.release();

      plantLock(repoRoot, JSON.stringify({ pid: gone, at: new Date().toISOString() }));
      const mutant = mod.allocateViteCacheSlot({ repoRoot, env: {} });
      assert.equal(mutant.slot, 1, 'with every pid reading as alive the dead lock is never reclaimed — which is what the real one must not do');
      mutant.release();
    } finally {
      cleanup();
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('treats an UNPARSEABLE lock as held, and does not once the catch answers no', async () => {
    // The fail-safe direction: an extra slot costs a cold optimize, sharing a
    // directory costs a 504. A lock this process cannot read must never be
    // assumed free.
    const repoRoot = path.join(tmpdir(), `vite-cache-garbage-${process.pid}`);
    const base = plantLock(repoRoot, 'not json at all\n');
    const { mod, cleanup } = await loadMutant(
      'try { pid = JSON.parse(raw).pid; } catch { return true; }',
      'try { pid = JSON.parse(raw).pid; } catch { return false; }',
    );
    try {
      const real = allocateViteCacheSlot({ repoRoot, env: {} });
      assert.equal(real.slot, 1, 'an unreadable lock is ambiguous, and every ambiguous answer must be "held"');
      real.release();

      plantLock(repoRoot, 'not json at all\n');
      const mutant = mod.allocateViteCacheSlot({ repoRoot, env: {} });
      assert.equal(mutant.slot, 0, 'the mutant must take the garbage lock; if it does not, the assertion above cannot fail');
      mutant.release();
    } finally {
      cleanup();
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('records the pid it is claiming on behalf of — the reclaim path reads it', () => {
    const repoRoot = path.join(tmpdir(), `vite-cache-pidfile-${process.pid}`);
    const base = repoCacheBase({ repoRoot });
    rmSync(base, { recursive: true, force: true });
    try {
      const slot = allocateViteCacheSlot({ repoRoot, env: {} });
      const written = JSON.parse(readFileSync(path.join(base, `slot-${slot.slot}.lock`), 'utf8'));
      assert.equal(written.pid, process.pid);
      assert.match(written.at, /^\d{4}-\d{2}-\d{2}T/);
      slot.release();
      assert.equal(existsSync(path.join(base, `slot-${slot.slot}.lock`)), false, 'release() removes the lock file');
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
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
    assert.match(config, /from '\.\/vite-cache-dir\.mjs'/,
      'the module is imported from the repository ROOT — .dockerignore cannot narrowly admit one file out of scripts/, '
        + 'see that file and tests/core/docker-context.test.ts');
  });

  it('bootKeylessServer allocates a per-boot cache, passes it to the server, and logs it', () => {
    const helper = read('scripts/lib/browser-verify.mjs');
    assert.match(helper, /allocateViteCacheSlot\(\{/, 'every keyless boot allocates its own cache directory');
    assert.match(helper, /\[VITE_CACHE_DIR_ENV\]: cache\.dir/, 'the allocated directory reaches the server process');
    assert.match(helper, /vite cache: \$\{cache\.dir\}/, 'the resolved cache dir is logged on boot, beside the "serving:" line');
    assert.match(helper, /serverProc\.releaseViteCacheSlot/, 'shutdown() frees the slot for the next boot');
    // `extraEnv` merged into what the allocator sees, so a suite that pins its
    // own VITE_CACHE_DIR wins over the pool. Matched loosely on purpose: the
    // earlier version pinned the exact spelling including the local name
    // `cwd`, so a rename reddened it while a semantic regression that kept the
    // spelling passed (2026-09-13 review, §5).
    const allocCall = helper.match(/allocateViteCacheSlot\(\{[^}]*\{[^}]*\}[^)]*\)/)?.[0] ?? '';
    assert.match(allocCall, /process\.env/, 'the allocator must see the process environment');
    assert.match(allocCall, /extraEnv/, 'and extraEnv, so a caller-set VITE_CACHE_DIR is honoured rather than pooled over');
  });

  it('shutdown() waits for the server to actually exit before freeing the slot', () => {
    // `kill()` returns when the signal is queued, not when the child is gone.
    // Releasing in between hands the directory to the next boot while the
    // dying server may still be renaming deps_temp_<hash> onto deps/ — which
    // is reachable at the graceMs = 0 default four suites use (2026-09-13
    // review, finding 2).
    const helper = read('scripts/lib/browser-verify.mjs');
    const body = helper.slice(helper.indexOf('export async function shutdown'));
    const waitAt = body.indexOf('waitForChildExit(serverProc');
    const releaseAt = body.indexOf('releaseViteCacheSlot?.()');
    assert.ok(waitAt > 0, 'shutdown() must wait for the child to exit');
    assert.ok(releaseAt > waitAt, 'the release must come AFTER the wait, not before it');
    assert.match(helper, /const SERVER_EXIT_WAIT_MS = \d+;/, 'and the wait must be bounded, or a wedged child hangs teardown');
  });

  it('a killed gate releases its slot — including on SIGTERM, which is what CI sends', () => {
    // `process.on('exit')` does not run on a signal. The lane shipped a
    // comment claiming it did; measured, the lock file survived a SIGTERM
    // (2026-09-13 review, finding 3). This drives the real thing: a child
    // takes a slot, gets SIGTERM'd, and must leave no lock behind — in both
    // the ordinary case and the case where the gate has a SIGTERM handler of
    // its own, which the release must not hijack.
    for (const variant of ['no-handler', 'own-handler'] as const) {
      const repoRoot = path.join(tmpdir(), `vite-cache-sigterm-${variant}-${process.pid}`);
      const base = repoCacheBase({ repoRoot });
      rmSync(base, { recursive: true, force: true });
      const dir = mkdtempSync(path.join(tmpdir(), 'vite-cache-holder-'));
      try {
        const holder = path.join(dir, 'holder.mjs');
        writeFileSync(
          holder,
          `import { allocateViteCacheSlot } from ${JSON.stringify(pathToFileURL(path.join(REPO, 'vite-cache-dir.mjs')).href)};\n`
            + `const s = allocateViteCacheSlot({ repoRoot: ${JSON.stringify(repoRoot)}, env: {} });\n`
            + 'process.stdout.write(s.dir);\n'
            + (variant === 'own-handler'
              // A gate with its own graceful shutdown: ours must release and
              // then step aside rather than re-raising over it.
              ? "process.on('SIGTERM', () => process.exit(7));\n"
              : '')
            + 'setInterval(() => {}, 1000);\n',
        );
        const supervisor = path.join(dir, 'supervisor.mjs');
        writeFileSync(
          supervisor,
          "import { spawn } from 'node:child_process';\n"
            + `const child = spawn(process.execPath, [${JSON.stringify(holder)}], { stdio: ['ignore', 'pipe', 'inherit'] });\n`
            + 'await new Promise((r) => child.stdout.once("data", r));\n'
            + "child.kill('SIGTERM');\n"
            + 'const [code, signal] = await new Promise((r) => child.once("exit", (c, sg) => r([c, sg])));\n'
            + 'process.stdout.write(JSON.stringify({ code, signal }));\n',
        );
        const run = spawnSync(process.execPath, [supervisor], { encoding: 'utf8', timeout: 20000 });
        assert.equal(run.status, 0, `supervisor (${variant}) did not finish: ${run.stderr}`);
        const outcome = JSON.parse(run.stdout) as { code: number | null; signal: string | null };

        assert.deepEqual(
          existsSync(base) ? readdirSync(base).filter(e => e.endsWith('.lock')) : [],
          [],
          `a SIGTERM-killed holder (${variant}) must leave no lock file behind`,
        );
        if (variant === 'no-handler') {
          assert.equal(outcome.signal, 'SIGTERM',
            'with nobody else listening the signal is re-raised, so the process still dies the way the sender asked');
        } else {
          assert.equal(outcome.code, 7,
            "a gate's own SIGTERM handler still decides the exit — releasing a cache slot must not hijack someone else's shutdown");
        }
      } finally {
        rmSync(dir, { recursive: true, force: true });
        rmSync(base, { recursive: true, force: true });
      }
    }
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
