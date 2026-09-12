// The verification-only rate-limit headroom must be off everywhere but a gate.
//
// ── What this guards (2026-09-12, writer-loop review round 1, item 1) ───────
//
// `server/lib/session-store.ts`'s three limiters key on `req.ip`. That is the
// right identity for a WRITER and the wrong one for a BROWSER GATE:
// `scripts/verify-*.mjs` drives every phase, every browser context and its own
// `fetch` probes through one server process from 127.0.0.1, so the suite as a
// whole spends one client's minute across work that represents many simulated
// writers. Measured on `npm run verify:surfaces`: the feature-length phase's
// `POST /api/scriptide/doctor` came back 429 because earlier phases had spent the
// 120/60 s window, the report never rendered, and 24 assertions never ran while
// the suite printed "218/218 passed" — three consecutive runs, one idle.
//
// The fix multiplies the ceilings by `VERIFY_RATE_LIMIT_MULTIPLIER`. That is a
// loaded gun pointed at production if it is ever set there, so this file is the
// safety catch, and it checks three separate things:
//
//   1. UNSET IS THE PRODUCTION NUMBER. `rateLimitMax(n) === n` in this process,
//      which runs with the variable absent — the same state every deployment is
//      in. (This file must therefore never set it.)
//   2. A HOSTILE VALUE IS IGNORED, not trusted: non-numeric, zero, negative,
//      fractional-below-one and absurdly large all fall back to 1.
//   3. NO DEPLOYMENT PATH MENTIONS IT. The Dockerfile, docker-compose.yml,
//      package.json's scripts, every workflow under .github/, and all of
//      server/** and src/** are scanned; the ONLY place allowed to name the
//      variable is the gate's own server-boot helper (plus session-store, which
//      reads it, and this test).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { rateLimitMax } from '../../server/lib/session-store.ts';
import { keylessBrowserServerEnv } from '../../scripts/lib/keyless-browser-certification.mjs';

const REPO = path.resolve(import.meta.dirname, '../..');
const VAR = 'VERIFY_RATE_LIMIT_MULTIPLIER';

/** The production ceilings, as written beside each limiter. */
const PRODUCTION_MAX = { game: 120, ai: 20, heavyBody: 10 } as const;

describe('the verification rate-limit override is off by default', () => {
  it('this test process does not set the variable (or every assertion below is vacuous)', () => {
    assert.equal(process.env[VAR], undefined, `${VAR} must be unset for this file to mean anything`);
  });

  it('unset means the production ceiling, unchanged', () => {
    assert.equal(rateLimitMax(PRODUCTION_MAX.game), 120);
    assert.equal(rateLimitMax(PRODUCTION_MAX.ai), 20);
    assert.equal(rateLimitMax(PRODUCTION_MAX.heavyBody), 10);
  });

  it('the limiters really are constructed from it (a helper nothing calls proves nothing)', () => {
    const source = readFileSync(path.join(REPO, 'server/lib/session-store.ts'), 'utf8');
    assert.match(source, /max: rateLimitMax\(120\),/);
    assert.match(source, /max: rateLimitMax\(20\),/);
    assert.match(source, /max: rateLimitMax\(10\),/);
    // …and nothing reintroduces a bare literal ceiling beside them.
    assert.doesNotMatch(source, /\n\s*max: 120,/);
    assert.doesNotMatch(source, /\n\s*max: 20,/);
  });
});

describe('a hostile or malformed value is ignored, not trusted', () => {
  // The resolution happens once at module load, so each case runs a child
  // process with the variable set — the only honest way to test a module-scope
  // constant.
  const probe = (value: string | undefined): number => {
    const script =
      "import { rateLimitMax } from './server/lib/session-store.ts';"
      + ' process.stdout.write(String(rateLimitMax(120)));';
    const env = { ...process.env };
    if (value === undefined) delete env[VAR];
    else env[VAR] = value;
    return Number(
      execFileSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', script], {
        cwd: REPO,
        env,
        encoding: 'utf8',
      }),
    );
  };

  it('a legitimate value in range is honored', () => {
    assert.equal(probe('10'), 1200);
    assert.equal(probe('1'), 120);
    assert.equal(probe('50'), 6000);
  });

  it('anything else falls back to the production ceiling', () => {
    for (const bad of ['0', '-5', '0.5', '51', '1e9', 'yes', '', 'Infinity', 'NaN', '10; rm -rf /']) {
      assert.equal(probe(bad), 120, `${JSON.stringify(bad)} must not change the ceiling`);
    }
    assert.equal(probe(undefined), 120);
  });

  it('a fractional in-range value is floored, never rounded up', () => {
    assert.equal(probe('9.9'), 120 * 9);
  });
});

describe('no deployment path sets it', () => {
  /** Files a deployment actually executes or reads. */
  function deploymentFiles(): string[] {
    const out: string[] = [];
    for (const rel of ['Dockerfile', 'docker-compose.yml', 'package.json', 'server.ts', '.env.example']) {
      const full = path.join(REPO, rel);
      if (existsSync(full)) out.push(full);
    }
    const walk = (dir: string) => {
      if (!existsSync(dir)) return;
      for (const entry of readdirSync(dir)) {
        if (entry.startsWith('.') && dir !== path.join(REPO, '.github')) continue;
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(ts|tsx|mjs|js|yml|yaml|json|sh)$/.test(entry)) out.push(full);
      }
    };
    walk(path.join(REPO, '.github'));
    walk(path.join(REPO, 'server'));
    walk(path.join(REPO, 'src'));
    return out;
  }

  it('the scan reaches the files it claims to (an empty list would pass vacuously)', () => {
    const files = deploymentFiles();
    assert.ok(files.length > 100, `scanned only ${files.length} deployment files`);
    assert.ok(files.some((f) => f.endsWith('Dockerfile')));
    assert.ok(files.some((f) => f.includes('.github')));
  });

  it('only session-store reads it, and no deployment file names it', () => {
    const offenders: string[] = [];
    for (const file of deploymentFiles()) {
      const rel = path.relative(REPO, file);
      if (rel === 'server/lib/session-store.ts') continue; // the reader
      if (readFileSync(file, 'utf8').includes(VAR)) offenders.push(rel);
    }
    assert.deepEqual(
      offenders,
      [],
      `${VAR} is verification-only and must not appear in a deployment path:\n  ` + offenders.join('\n  '),
    );
  });

  it('every file that even NAMES it is on an explicit, reasoned allowlist', () => {
    // An allowlist rather than a pattern: "names it" is the property a reader
    // can check, and a new entry should cost a deliberate edit here with a
    // reason beside it. Each entry says what it does with the variable.
    const ALLOWED: Record<string, string> = {
      'server/lib/session-store.ts': 'reads it (the only reader)',
      'scripts/lib/keyless-browser-certification.mjs': 'sets it, for a gate\'s own isolated server',
      'scripts/verify-p2-p3-surfaces.mjs': 'names it in the budget meter\'s log line — a mention, not a set',
      'tests/core/rate-limit-verification-override.test.ts': 'this guard',
    };
    const naming = execFileSync(
      'git',
      // --untracked: a brand-new file that sets it must be caught before it is
      // ever committed, not after.
      ['grep', '-l', '--untracked', VAR, '--', 'scripts', 'tests', 'server', 'src', 'evals', 'benchmarks'],
      { cwd: REPO, encoding: 'utf8' },
    )
      .split('\n')
      .filter(Boolean);
    assert.deepEqual(
      naming.filter((f) => !(f in ALLOWED)),
      [],
      `${VAR} is verification-only; add an entry to ALLOWED with a reason if a new file needs it`,
    );
    // …and the one that sets it sets the value this lane measured for.
    const helper = readFileSync(path.join(REPO, 'scripts/lib/keyless-browser-certification.mjs'), 'utf8');
    assert.match(helper, /const VERIFICATION_RATE_LIMIT_MULTIPLIER = '10';/);
    assert.match(helper, new RegExp(`${VAR}: VERIFICATION_RATE_LIMIT_MULTIPLIER`));
    // Nothing else performs an assignment of it.
    for (const file of naming) {
      if (file === 'scripts/lib/keyless-browser-certification.mjs') continue;
      const body = readFileSync(path.join(REPO, file), 'utf8');
      assert.doesNotMatch(
        body,
        new RegExp(`${VAR}\\s*:\\s*[A-Za-z_$]`),
        `${file} assigns ${VAR}; only the gate's server-boot helper may`,
      );
    }
  });
});

// ── Round-2 follow-up item 1 (2026-09-12) ───────────────────────────────────
//
// `keylessBrowserServerEnv` used to put the multiplier into EVERY server it
// booted, including three callers that boot a keyless server specifically to
// measure how the PRODUCTION limiter behaves under load:
// `scripts/fuzz-routes.mjs` (its own 200-concurrent-doctor-requests case,
// which exists to prove gameLimiter 429s the overflow — measured 0 429s at
// 1200/min), `scripts/verify-production-build.mjs` (the one suite proving the
// real Dockerfile-shaped boot), and `scripts/load-test-doctor.mjs` (which
// documents itself as staying "comfortably under gameLimiter's 120/min
// ceiling"). All three must opt OUT of the multiplier via
// `{ productionRateLimit: true }`; every other (browser-gate) caller keeps it
// by default.
describe('the multiplier is scoped to browser gates, not every keyless caller', () => {
  it('default (browser gates) gets the multiplier', () => {
    const env = keylessBrowserServerEnv({}, 4000);
    assert.equal(env[VAR], '10');
  });

  it('productionRateLimit: true removes the key entirely, even if the parent env carried it', () => {
    const env = keylessBrowserServerEnv({ [VAR]: '10' }, 4000, { productionRateLimit: true });
    assert.equal(VAR in env, false, `${VAR} must be absent, not just falsy, so the production ceiling applies`);
  });

  it('the three load/attack/production-boot callers all opt out in source', () => {
    // verify-production-build.mjs imports the function under a local alias
    // (`keylessBrowserServerEnv as buildKeylessEnv`), so the call-site regex
    // has to accept either name.
    const callers: Array<{ file: string; callee: string; reason: string }> = [
      { file: 'scripts/fuzz-routes.mjs', callee: 'keylessBrowserServerEnv', reason: 'its own 200-concurrent-doctor-requests case measures gameLimiter 429s' },
      { file: 'scripts/verify-production-build.mjs', callee: 'buildKeylessEnv', reason: 'the one suite proving the real Dockerfile-shaped boot' },
      { file: 'scripts/load-test-doctor.mjs', callee: 'keylessBrowserServerEnv', reason: 'documents itself as staying under gameLimiter\'s 120/min ceiling' },
    ];
    for (const { file: rel, callee, reason } of callers) {
      const body = readFileSync(path.join(REPO, rel), 'utf8');
      assert.match(
        body,
        new RegExp(`${callee}\\([^)]*\\{\\s*productionRateLimit:\\s*true\\s*\\}`),
        `${rel} (${reason}) must call ${callee}(..., { productionRateLimit: true })`,
      );
    }
  });
});
