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
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
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

  it('re-installs a signal handler that already fired once, for a process that legitimately keeps allocating', async () => {
    // The gap this closes (2026-09-13 review round 2, observation (c)):
    // installExitHooks() used to run at most once for the whole process. A
    // holder with its own non-exiting SIGTERM handler survives the first
    // SIGTERM (this module's handler releases slot 0's lock and removes
    // itself); if it legitimately allocates a SECOND slot afterward, a second
    // SIGTERM found no handler left here, and that slot's lock survived it —
    // measured directly before this test existed. Per-signal re-install
    // (installedSignalHandlers) closes it: the handler is re-attached on the
    // very next allocateViteCacheSlot() call, so the second slot is covered
    // by the second SIGTERM too.
    const repoRoot = path.join(tmpdir(), `vite-cache-refires-${process.pid}`);
    const base = repoCacheBase({ repoRoot });
    rmSync(base, { recursive: true, force: true });
    const dir = mkdtempSync(path.join(tmpdir(), 'vite-cache-refires-'));
    let child: ReturnType<typeof spawn> | undefined;
    try {
      const holder = path.join(dir, 'holder.mjs');
      writeFileSync(
        holder,
        `import { allocateViteCacheSlot } from ${JSON.stringify(pathToFileURL(path.join(REPO, 'vite-cache-dir.mjs')).href)};\n`
          + `const repoRoot = ${JSON.stringify(repoRoot)};\n`
          + 'const first = allocateViteCacheSlot({ repoRoot, env: {} });\n'
          + "process.stdout.write(JSON.stringify({ event: 'first', slot: first.slot }) + '\\n');\n"
          // A legitimate non-exiting SIGTERM handler — this is the case a
          // dying gate does NOT model, and the one this test exists for.
          + "process.on('SIGTERM', () => {});\n"
          + "process.stdin.on('data', (chunk) => {\n"
          + "  if (chunk.toString().trim() !== 'allocate-second') return;\n"
          + '  const second = allocateViteCacheSlot({ repoRoot, env: {} });\n'
          + "  process.stdout.write(JSON.stringify({ event: 'second', slot: second.slot }) + '\\n');\n"
          + '});\n'
          + 'setInterval(() => {}, 1000);\n',
      );

      child = spawn(process.execPath, [holder], { stdio: ['pipe', 'pipe', 'inherit'] });
      let buf = '';
      const events: Array<{ event: string; slot: number }> = [];
      child.stdout!.on('data', (d) => {
        buf += d.toString();
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.trim()) events.push(JSON.parse(line));
        }
      });
      const waitFor = async (predicate: () => boolean, timeoutMs = 10000) => {
        const start = Date.now();
        while (!predicate()) {
          if (Date.now() - start > timeoutMs) throw new Error('timed out waiting for condition');
          await sleep(20);
        }
      };

      await waitFor(() => events.some(e => e.event === 'first'));
      const firstSlot = events.find(e => e.event === 'first')!.slot;
      const firstLock = path.join(base, `slot-${firstSlot}.lock`);
      assert.ok(existsSync(firstLock), 'the first slot must be locked while the holder is alive');

      child.kill('SIGTERM'); // signal #1 — caught, released, self-removed; the holder's own handler keeps it alive
      await waitFor(() => !existsSync(firstLock));

      child.stdin!.write('allocate-second\n'); // a legitimate allocation AFTER the first signal
      await waitFor(() => events.some(e => e.event === 'second'));
      const secondSlot = events.find(e => e.event === 'second')!.slot;
      const secondLock = path.join(base, `slot-${secondSlot}.lock`);
      assert.ok(existsSync(secondLock), 'the second allocation must be locked');
      // The pool always scans from slot 0, so releasing the first slot before
      // allocating again reclaims slot 0 itself — same slot number, a fresh
      // lock. That is fine: what this test pins is the SIGNAL coverage, not
      // which slot index gets reused.

      child.kill('SIGTERM'); // signal #2 — must be covered too, now that the handler re-installs
      await waitFor(() => !existsSync(secondLock));
      assert.ok(!existsSync(secondLock), 'FIXED: a second SIGTERM after a legitimate second allocation must release that slot too');
    } finally {
      if (child && child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      rmSync(dir, { recursive: true, force: true });
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('two allocations attach exactly one SIGTERM listener — and a mutant that skips the has(signal) guard attaches two (review round 1, finding 4)', async () => {
    // vite-cache-dir.mjs's own comment promises "no duplicate listeners, no
    // MaxListeners warning" from tracking `installedSignalHandlers` per
    // signal rather than by one process-wide flag. Measured but unpinned
    // until now. Two directions, same shape as "the lock state machine"
    // above: the real module, then a MUTANT with exactly the guard at the
    // `has(signal)` check removed, which must produce the OPPOSITE count.
    const before = process.listenerCount('SIGTERM');
    const a = allocateViteCacheSlot({ repoRoot: path.join(tmpdir(), `vite-cache-listeners-real-1-${process.pid}`), env: {} });
    const b = allocateViteCacheSlot({ repoRoot: path.join(tmpdir(), `vite-cache-listeners-real-2-${process.pid}`), env: {} });
    try {
      // Whatever the count was before (an earlier test in this file may
      // already have installed the real module's own handler — it is
      // process-wide and, correctly, never removed except by actually
      // firing), TWO MORE allocations must not add a SECOND listener.
      assert.equal(
        process.listenerCount('SIGTERM'),
        Math.max(before, 1),
        'a second (and third) allocation must not attach a second SIGTERM listener',
      );
    } finally {
      a.release();
      b.release();
    }

    const { mod, cleanup } = await loadMutant(
      'if (installedSignalHandlers.has(signal)) continue; // still attached from an earlier allocation',
      'if (false) continue; // still attached from an earlier allocation',
    );
    const exitHookSignals = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const;
    const listenersBefore = new Map<typeof exitHookSignals[number], readonly NodeJS.SignalsListener[]>(
      exitHookSignals.map(signal => [signal, process.listeners(signal).slice() as NodeJS.SignalsListener[]]),
    );
    try {
      const beforeMutant = process.listenerCount('SIGTERM');
      const c = mod.allocateViteCacheSlot({ repoRoot: path.join(tmpdir(), `vite-cache-listeners-mutant-1-${process.pid}`), env: {} });
      const d = mod.allocateViteCacheSlot({ repoRoot: path.join(tmpdir(), `vite-cache-listeners-mutant-2-${process.pid}`), env: {} });
      try {
        assert.equal(
          process.listenerCount('SIGTERM'),
          beforeMutant + 2,
          'with the has(signal) guard removed, two allocations must attach TWO SIGTERM listeners — if this cannot fail, it is not measuring the guard',
        );
      } finally {
        c.release();
        d.release();
      }
    } finally {
      // Remove exactly the listeners the mutant added (by identity, against
      // the snapshot taken before it ran), for every signal the loop covers —
      // not only SIGTERM — so this test leaves the process exactly as it
      // found it rather than leaking duplicate handlers into the rest of the
      // suite.
      for (const signal of exitHookSignals) {
        const before = listenersBefore.get(signal) ?? [];
        for (const listener of process.listeners(signal) as NodeJS.SignalsListener[]) {
          if (!before.includes(listener)) process.off(signal, listener);
        }
      }
      cleanup();
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

describe('shutdown()\'s graceMs=0 callers — the comment above releaseViteCacheSlot() names them', () => {
  // The comment beside `try { serverProc?.releaseViteCacheSlot?.(); }` in
  // browser-verify.mjs names, by hand, every `shutdown()` caller that relies
  // on the `graceMs = 0` default rather than its own sleep to cover the
  // "release after the signal, not after the death" window. On 2026-09-13 it
  // named FOUR and the tree actually had THREE:
  // `verify-production-build.mjs`'s dev-instance teardown tore itself down
  // inline (`devProc.kill('SIGTERM')` / sleep / `SIGKILL`) and never called
  // `shutdown()` at all — review round 2, observation (a)
  // (docs/audits/2026-09-12-adversarial/vitecache-review.md). Fixed by
  // routing that teardown through `shutdown()`, which makes the comment's
  // "four" literally true; this pins it so a fifth caller, or a dropped one,
  // reds this test instead of rotting the comment again.

  /** Every `.mjs` file under `scripts/`, recursively — where a `shutdown()`
   *  call could live. Matches the "walk scripts/" shape `tests/core/
   *  docker-context.test.ts`'s `buildTimeImports` uses for the same reason:
   *  a hand-maintained file list is exactly what rotted last time. */
  function mjsFilesUnder(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...mjsFilesUnder(full));
      else if (entry.name.endsWith('.mjs')) out.push(full);
    }
    return out;
  }

  /** Every `shutdown({ … })` call SITE under `scripts/`, excluding the file
   *  that DEFINES `shutdown()` (see below) — one entry per call, not per
   *  file, so a file with more than one call site (there are two, below) is
   *  counted honestly instead of folded into one. */
  function allShutdownCallSites(): Array<{ file: string; call: string }> {
    const hits: Array<{ file: string; call: string }> = [];
    for (const file of mjsFilesUnder(path.join(REPO, 'scripts'))) {
      // scripts/lib/browser-verify.mjs DEFINES shutdown() — it is not a
      // caller, but its own doc comments quote example calls (e.g. "`shutdown
      // ({ serverProc })` frees the slot…"), and a plain source scan cannot
      // tell prose from code. Excluding the one file that both defines the
      // function and is the only place such a quoting comment could plausibly
      // live is cheaper and just as sound as a comment-aware parser here.
      if (path.relative(REPO, file).split(path.sep).join('/') === 'scripts/lib/browser-verify.mjs') continue;
      const source = readFileSync(file, 'utf8');
      const calls = source.match(/shutdown\(\{[^}]*\}\)/g) ?? [];
      for (const call of calls) hits.push({ file: path.relative(REPO, file).split(path.sep).join('/'), call });
    }
    return hits;
  }

  /** Repo-relative, posix-spelled paths of every `scripts/**\/*.mjs` FILE
   *  containing at least one `shutdown({ … })` call with no `graceMs` in the
   *  object literal — a FILE count, not a call-site count:
   *  `verify-production-build.mjs` has two `shutdown()` call sites (one for
   *  its dev instance, one for production) but only the dev one is
   *  `graceMs=0`, and the file still counts once here, which is what "five
   *  callers" in the comment beside `releaseViteCacheSlot()` means. Assumes
   *  every call site is a single-line, unnested object literal — pinned as a
   *  COUNT below (review round 1, finding 3: "verified by hand" rotted into
   *  a wrong hand count), not asserted here by hand again — which is what
   *  makes a `[^}]*` scan safe rather than a full parse. */
  function zeroGraceShutdownCallers(): string[] {
    const byFile = new Map<string, string[]>();
    for (const { file, call } of allShutdownCallSites()) {
      if (!byFile.has(file)) byFile.set(file, []);
      byFile.get(file)!.push(call);
    }
    const hits: string[] = [];
    for (const [file, calls] of byFile) {
      if (calls.some(call => !/graceMs/.test(call))) hits.push(file);
    }
    return hits.sort();
  }

  it('is exactly the five files the comment names — a count that can fail', () => {
    const callers = zeroGraceShutdownCallers();
    assert.equal(callers.length, 5, `expected 5 graceMs=0 shutdown() callers under scripts/, found ${callers.length}: ${JSON.stringify(callers)}`);
    assert.deepEqual(
      callers,
      [
        'scripts/verify-e4-local-safety-net.mjs',
        'scripts/verify-e5-command-palette.mjs',
        'scripts/verify-necessity-surface.mjs',
        'scripts/verify-production-build.mjs',
        'scripts/verify-ui-polish-affordances.mjs',
      ],
      'a new graceMs=0 caller (or a removed one) must also update the comment beside releaseViteCacheSlot() in scripts/lib/browser-verify.mjs',
    );
  });

  it('pins the call-SITE count too, not just the graceMs=0 file count (review round 1, finding 3)', () => {
    // A comment above zeroGraceShutdownCallers() used to say "verified by
    // hand across all eight call sites" — there are actually eleven call
    // sites, in eight files (smoke-p0-live-flow.mjs alone has three;
    // verify-production-build.mjs has two). The property the scan relies on
    // (every call site is a single-line, unnested object literal) held for
    // all eleven; only the hand count of call sites was wrong. Derived here
    // instead of typed into a comment, so it cannot rot the same way again.
    // 2026-09-13: twelve sites in nine files, after
    // scripts/verify-necessity-surface.mjs joined them
    // (lane/necessity-certificate) — the counts below moved with it, and the
    // comment beside releaseViteCacheSlot() moved from "four" to "five" in
    // the same commit, which is the coupling these two assertions exist to
    // force.
    const sites = allShutdownCallSites();
    const files = new Set(sites.map(s => s.file));
    assert.equal(sites.length, 12, `expected 12 shutdown() call sites under scripts/ (excluding browser-verify.mjs), found ${sites.length}: ${JSON.stringify(sites.map(s => s.call))}`);
    assert.equal(files.size, 9, `expected those call sites to live in 9 files, found ${files.size}: ${JSON.stringify([...files].sort())}`);
    for (const { file, call } of sites) {
      // The property the `[^}]*` scan actually depends on: no embedded
      // newline in the call (a single-line, unnested object literal).
      assert.ok(!call.includes('\n'), `${file}: ${JSON.stringify(call)} must be a single-line call for the [^}]* scan to be safe`);
    }
  });

  it('verify-production-build.mjs\'s dev-instance teardown really does call shutdown() now, not an inline kill', () => {
    const source = read('scripts/verify-production-build.mjs');
    assert.ok(
      /if \(devProc\) await shutdown\(\{ serverProc: devProc \}\);/.test(source),
      'the dev-instance teardown must route through shutdown() so it releases its Vite cache slot correctly instead of leaking it until process exit',
    );
    assert.ok(
      !/devProc\.kill\('SIGTERM'\)/.test(source),
      'the old inline SIGTERM/sleep/SIGKILL teardown must be gone, not left beside the new one',
    );
  });

  it('the comment names all four callers by their npm script name', () => {
    const comment = read('scripts/lib/browser-verify.mjs');
    for (const name of ['verify:ui-polish', 'verify:local-safety-net', 'verify:command-palette', 'verify:production']) {
      assert.ok(comment.includes(name), `the graceMs=0 comment must still name ${name}`);
    }
    assert.ok(/verify:production.{0,40}dev instance/s.test(comment), 'the comment must still call out the verify:production dev instance specifically, not the whole suite');
  });
});
