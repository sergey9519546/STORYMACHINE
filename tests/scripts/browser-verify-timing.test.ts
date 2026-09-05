// scripts/lib/browser-verify.mjs — getTiming()'s load-scale policy, with
// every OS/filesystem/process reader injected so this is provable without a
// real Windows box or a real cgroup-quota container (see
// docs/audits/2026-09-04-evening-batch/AUDIT.md, "getTiming load scale":
// loadavg-per-physical-cpu was a silent 1.0x no-op on Windows, where
// os.loadavg() always returns [0,0,0], and in a CPU-quota-limited container,
// where os.cpus() reports the HOST's core count rather than the cgroup's
// allowance).

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  getTiming,
  resetTimingCacheForTests,
  readCgroupCpuQuota,
} from '../../scripts/lib/browser-verify.mjs';

// getTiming() logs on every call that computes — keep the test output clean.
const silence = () => { /* swallow */ };

function withSilencedConsole<T>(fn: () => T): T {
  const origLog = console.log;
  const origError = console.error;
  console.log = silence;
  console.error = silence;
  try {
    return fn();
  } finally {
    console.log = origLog;
    console.error = origError;
  }
}

beforeEach(() => {
  resetTimingCacheForTests();
});

const enoent = () => { throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }); };
/** No `/proc/self/cgroup` at all (non-Linux, or unreadable) — every test
 *  below that isn't specifically about path resolution uses this so the
 *  function falls straight through to the mount-root paths, unchanged from
 *  before this review's fix. */
const noSelfCgroup = (path: string) => {
  if (path === '/proc/self/cgroup') return enoent();
  throw new Error(`unexpected path ${path}`);
};

describe('getTiming — cgroup CPU quota denominator (mount-root paths, no /proc/self/cgroup)', () => {
  it('cgroup v2: "max 100000" (unlimited) falls back to physical CPU count', () => {
    const quota = readCgroupCpuQuota((p) => {
      if (p === '/proc/self/cgroup') return enoent();
      assert.equal(p, '/sys/fs/cgroup/cpu.max');
      return 'max 100000\n';
    });
    assert.equal(quota, null);
  });

  it('cgroup v2: "400000 100000" is a 4-cpu quota', () => {
    const quota = readCgroupCpuQuota((p) => {
      if (p === '/sys/fs/cgroup/cpu.max') return '400000 100000\n';
      return enoent();
    });
    assert.equal(quota, 4);
  });

  it('cgroup v1: cfs_quota_us -1 (unlimited) falls back to physical CPU count', () => {
    const quota = readCgroupCpuQuota((p) => {
      if (p === '/sys/fs/cgroup/cpu/cpu.cfs_quota_us') return '-1\n';
      if (p === '/sys/fs/cgroup/cpu/cpu.cfs_period_us') return '100000\n';
      return enoent();
    });
    assert.equal(quota, null);
  });

  it('cgroup v1: 350000/100000 rounds up to a 4-cpu quota', () => {
    const quota = readCgroupCpuQuota((p) => {
      if (p === '/sys/fs/cgroup/cpu/cpu.cfs_quota_us') return '350000\n';
      if (p === '/sys/fs/cgroup/cpu/cpu.cfs_period_us') return '100000\n';
      return enoent();
    });
    assert.equal(quota, 4);
  });

  it('neither cgroup file present returns null', () => {
    assert.equal(readCgroupCpuQuota(noSelfCgroup), null);
  });
});

describe('getTiming — cgroup CPU quota RESOLVES THE PROCESS\'S OWN PATH before the mount root (independent review 2026-09-04)', () => {
  it('cgroup v1, nested/non-namespaced (Docker\'s v1 default; this sandbox\'s own layout): the hierarchy ROOT is unlimited (-1) and ENOENTs entirely, only the process\'s own subtree carries the real quota', () => {
    // Mirrors this container's own /proc/self/cgroup shape
    // (docs/audits/2026-09-04-evening-batch/AUDIT.md's review: "4:memory:/process_api/…").
    const nestedPath = '/process_api/01a06dee-ff3d-7062-be27-cd5470d8e90d/claude-code-bash';
    const quota = readCgroupCpuQuota((p) => {
      if (p === '/proc/self/cgroup') {
        return [
          '4:memory:/process_api/01a06dee-ff3d-7062-be27-cd5470d8e90d/claude-code-bash',
          `1:cpu:${nestedPath}`,
          '',
        ].join('\n');
      }
      if (p === `/sys/fs/cgroup/cpu${nestedPath}/cpu.cfs_quota_us`) return '200000\n';
      if (p === `/sys/fs/cgroup/cpu${nestedPath}/cpu.cfs_period_us`) return '100000\n';
      // The mount ROOT — v2 absent, v1 root unlimited — ENOENTs, proving the
      // nested nested path (not a lucky root fallback) produced the answer.
      return enoent();
    });
    assert.equal(quota, 2, 'a 200000/100000 quota at the process\'s own nested v1 path is 2 whole CPUs');
  });

  it('cgroup v2, nested (e.g. under a systemd slice): resolves /sys/fs/cgroup<path>/cpu.max before the mount root', () => {
    const nestedPath = '/user.slice/user-1000.slice/session-3.scope';
    const quota = readCgroupCpuQuota((p) => {
      if (p === '/proc/self/cgroup') return `0::${nestedPath}\n`;
      if (p === `/sys/fs/cgroup${nestedPath}/cpu.max`) return '300000 100000\n';
      // The v2 mount ROOT ENOENTs — proving the nested path produced the answer.
      return enoent();
    });
    assert.equal(quota, 3, 'a 300000/100000 quota at the process\'s own nested v2 path is 3 whole CPUs');
  });

  it('a process AT the namespace root (process path "/") reads the same file the mount-root fallback would — real behavior on a namespaced container is unchanged', () => {
    const quota = readCgroupCpuQuota((p) => {
      if (p === '/proc/self/cgroup') return '1:cpu:/\n';
      if (p === '/sys/fs/cgroup/cpu/cpu.cfs_quota_us') return '400000\n';
      if (p === '/sys/fs/cgroup/cpu/cpu.cfs_period_us') return '100000\n';
      return enoent();
    });
    assert.equal(quota, 4);
  });

  it('hybrid host: v2 mounted at /sys/fs/cgroup/unified (alongside v1 controllers), not the plain root — the second v2 candidate root resolves it', () => {
    // Independent review 2026-09-04, second pass: a hybrid host (v1
    // controllers plus a separate v2 "unified" mount) does not expose
    // cpu.max at /sys/fs/cgroup at all.
    const quota = readCgroupCpuQuota((p) => {
      if (p === '/proc/self/cgroup') return '1:cpu:/\n'; // no v2 line — hybrid host, process at the v1 root
      if (p === '/sys/fs/cgroup/cpu.max') return enoent(); // the plain root has no v2 mount on this host
      if (p === '/sys/fs/cgroup/unified/cpu.max') return '500000 100000\n';
      return enoent();
    });
    assert.equal(quota, 5, 'a 500000/100000 quota at the hybrid host\'s unified v2 mount is 5 whole CPUs');
  });

  it('an unparseable /proc/self/cgroup (no matching v1/v2 line) falls back to the mount root exactly as if the file were absent', () => {
    const quota = readCgroupCpuQuota((p) => {
      if (p === '/proc/self/cgroup') return '4:memory:/only-memory-here\n';
      if (p === '/sys/fs/cgroup/cpu/cpu.cfs_quota_us') return '200000\n';
      if (p === '/sys/fs/cgroup/cpu/cpu.cfs_period_us') return '100000\n';
      return enoent();
    });
    assert.equal(quota, 2);
  });
});

describe('getTiming — the audit\'s two silent no-ops, now caught', () => {
  it('a 4-cpu container on a 64-core host at load 28 (7x over quota) no longer scales 1.0x', () => {
    // Before the fix: os.cpus().length (64) was the denominator, so
    // 28 / 64 = 0.44/cpu -> clamped to MIN_SCALE 1.0x, identical in the log
    // to an idle machine. The cgroup quota caps the denominator at 4.
    const t = withSilencedConsole(() => getTiming({
      platform: 'linux',
      loadavg: () => [28, 28, 28],
      cpuCount: () => 64,
      readCgroupFile: (p) => {
        if (p === '/sys/fs/cgroup/cpu.max') return '400000 100000\n';
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      },
      isContended: () => { throw new Error('must not be called — loadavg is nonzero'); },
    }));
    assert.equal(t.cpus, 4, 'denominator must be the cgroup quota, not the host core count');
    assert.equal(t.cgroupQuotaCpus, 4);
    assert.equal(t.perCpu, 7);
    assert.equal(t.scale, 4.0, 'load 28 on a real 4-cpu allowance is 7/cpu, clamped to the 4.0x ceiling');
    assert.equal(t.loadUnavailable, false);
    assert.equal(t.ms(5000), 20000);
  });

  it('a 4-cpu container on a 64-core host at the audit\'s idle-looking load (28/64) would have silently read 1.0x under the old denominator — sanity check the old math', () => {
    // Not a getTiming() assertion — documents the exact arithmetic the audit
    // measured, so the fix above is provably the same case.
    assert.equal(Math.min(4.0, Math.max(1.0, 28 / 64)), 1.0);
  });

  it('Windows: loadavg is always [0,0,0] — the policy goes inactive with fixed base timeouts, not a fabricated 1.0x', () => {
    const t = withSilencedConsole(() => getTiming({
      platform: 'win32',
      loadavg: () => [0, 0, 0],
      cpuCount: () => 8,
      readCgroupFile: () => { throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }); },
      isContended: () => { throw new Error('must not be called — win32 short-circuits before the contention sample'); },
    }));
    assert.equal(t.loadUnavailable, true);
    assert.equal(t.unavailableReason, 'windows-loadavg-always-zero');
    assert.equal(t.scale, 1.0);
    assert.equal(t.perCpu, null);
    assert.equal(t.ms(5000), 5000, 'base timeouts pass through unscaled, same numeric behavior as the old code');
  });

  it('loadavg [0,0,0] under real contention (a sandbox that cannot report load) is also flagged inactive', () => {
    const t = withSilencedConsole(() => getTiming({
      platform: 'linux',
      loadavg: () => [0, 0, 0],
      cpuCount: () => 4,
      readCgroupFile: () => { throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }); },
      isContended: () => true,
    }));
    assert.equal(t.loadUnavailable, true);
    assert.equal(t.unavailableReason, 'loadavg-zero-under-contention');
    assert.equal(t.scale, 1.0);
  });

  it('loadavg [0,0,0] on a genuinely idle machine (no contention sample) is real idle, not "unavailable"', () => {
    const t = withSilencedConsole(() => getTiming({
      platform: 'linux',
      loadavg: () => [0, 0, 0],
      cpuCount: () => 4,
      readCgroupFile: () => { throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }); },
      isContended: () => false,
    }));
    assert.equal(t.loadUnavailable, false);
    assert.equal(t.unavailableReason, null);
    assert.equal(t.perCpu, 0);
    assert.equal(t.scale, 1.0);
  });
});

describe('getTiming — unchanged behavior on a normal Linux box (no cgroup quota)', () => {
  const linuxNoQuota = () => { throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }); };

  it('load 0 (idle, cpus reporting fine) -> scale 1.0x', () => {
    const t = withSilencedConsole(() => getTiming({
      platform: 'linux', loadavg: () => [0.0, 0, 0], cpuCount: () => 4,
      readCgroupFile: linuxNoQuota, isContended: () => false,
    }));
    assert.equal(t.scale, 1.0);
    assert.equal(t.ms(5000), 5000);
  });

  it('load 0.5 on 4 cpus (idle-ish) -> scale 1.0x', () => {
    const t = withSilencedConsole(() => getTiming({
      platform: 'linux', loadavg: () => [0.5, 0, 0], cpuCount: () => 4, readCgroupFile: linuxNoQuota,
    }));
    assert.equal(t.scale, 1.0);
    assert.equal(t.ms(5000), 5000);
  });

  it('load 4 on 4 cpus (1.0/cpu, saturated) -> scale 1.0x', () => {
    const t = withSilencedConsole(() => getTiming({
      platform: 'linux', loadavg: () => [4, 0, 0], cpuCount: () => 4, readCgroupFile: linuxNoQuota,
    }));
    assert.equal(t.scale, 1.0);
  });

  it('load 7 on 4 cpus (the measured flaky case) -> scale 1.75x', () => {
    const t = withSilencedConsole(() => getTiming({
      platform: 'linux', loadavg: () => [7, 0, 0], cpuCount: () => 4, readCgroupFile: linuxNoQuota,
    }));
    assert.equal(t.scale, 1.75);
    assert.equal(t.ms(5000), 8750);
  });

  it('load 40 on 4 cpus (pathological) -> scale 4.0x (ceiling)', () => {
    const t = withSilencedConsole(() => getTiming({
      platform: 'linux', loadavg: () => [40, 0, 0], cpuCount: () => 4, readCgroupFile: linuxNoQuota,
    }));
    assert.equal(t.scale, 4.0);
    assert.equal(t.ms(5000), 20000);
  });
});

describe('getTiming — memoization and VERIFY_MAX_LOAD_PER_CPU', () => {
  it('memoizes: the second call ignores new injected readers and returns the first result', () => {
    const first = withSilencedConsole(() => getTiming({
      platform: 'linux', loadavg: () => [7, 0, 0], cpuCount: () => 4,
      readCgroupFile: () => { throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }); },
    }));
    const second = withSilencedConsole(() => getTiming({
      platform: 'linux', loadavg: () => [40, 0, 0], cpuCount: () => 4,
      readCgroupFile: () => { throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }); },
    }));
    assert.equal(first.scale, 1.75);
    assert.equal(second.scale, 1.75, 'memoized — must not recompute from the second call\'s readers');
  });

  it('maxLoadPerCpu still refuses (process.exit) when load is real and over threshold', () => {
    const origExit = process.exit;
    let exitCode: number | undefined;
    process.exit = (code?: number) => { exitCode = code; throw new Error('__exit__'); };
    try {
      withSilencedConsole(() => {
        try {
          getTiming({
            platform: 'linux', loadavg: () => [10, 0, 0], cpuCount: () => 4,
            readCgroupFile: () => { throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }); },
            maxLoadPerCpu: 1,
          });
        } catch (e) {
          if ((e as Error).message !== '__exit__') throw e;
        }
      });
    } finally {
      process.exit = origExit;
    }
    assert.equal(exitCode, 3);
  });

  it('the refusal check is skipped when the load policy is inactive (no fabricated per-CPU figure to compare)', () => {
    const origExit = process.exit;
    let exitCalled = false;
    // @ts-expect-error — stubbing process.exit for the test
    process.exit = () => { exitCalled = true; };
    try {
      const t = withSilencedConsole(() => getTiming({
        platform: 'win32', loadavg: () => [0, 0, 0], cpuCount: () => 4,
        readCgroupFile: () => { throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }); },
        maxLoadPerCpu: 0.0001,
      }));
      assert.equal(t.loadUnavailable, true);
    } finally {
      process.exit = origExit;
    }
    assert.equal(exitCalled, false);
  });
});
